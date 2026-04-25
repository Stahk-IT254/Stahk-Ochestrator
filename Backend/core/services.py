"""
Core business logic services.

- ManagerService: The single orchestration layer.
  Decomposes goals → tags domains → finds agents → recommends to user.
  Users NEVER see agents directly — only what the Manager recommends.

- AgentExecutionService: Runs an agent against the RAG layer and produces output.
- PaymentService: Handles escrow release and refund logic.
"""

from django.utils import timezone
import requests
import json
from .models import Goal, Task, TaskRecommendation, Agent, TaskAssignment, Transaction, Notification


# ──────────────────────────────────────────────
# ORCHESTRATOR KNOWLEDGE
# ──────────────────────────────────────────────

# Maps goal keywords → task breakdown with domain tags
GOAL_TASK_MAP = {
    'build': [
        {'task_type': 'Construction Planning', 'domain': 'construction',
         'description': 'Develop architectural plan, materials list, and construction phases.'},
        {'task_type': 'Financial Estimation', 'domain': 'finance',
         'description': 'Estimate total project cost including materials, labor, and contingency.'},
        {'task_type': 'Scheduling', 'domain': 'scheduling',
         'description': 'Create a timeline with milestones for the construction project.'},
        {'task_type': 'Risk Analysis', 'domain': 'risk_analysis',
         'description': 'Identify potential risks, delays, and mitigation strategies.'},
    ],
    'house': [
        {'task_type': 'Construction Planning', 'domain': 'construction',
         'description': 'Develop architectural plan, materials list, and construction phases.'},
        {'task_type': 'Financial Estimation', 'domain': 'finance',
         'description': 'Estimate total project cost including materials, labor, and contingency.'},
        {'task_type': 'Scheduling', 'domain': 'scheduling',
         'description': 'Create a timeline with milestones for the construction project.'},
        {'task_type': 'Risk Analysis', 'domain': 'risk_analysis',
         'description': 'Identify potential risks, delays, and mitigation strategies.'},
    ],
    'save': [
        {'task_type': 'Budget Planning', 'domain': 'finance',
         'description': 'Analyze income and expenses to create a savings plan.'},
        {'task_type': 'Financial Advisory', 'domain': 'finance',
         'description': 'Recommend savings instruments and strategies.'},
        {'task_type': 'Progress Tracking', 'domain': 'scheduling',
         'description': 'Set up milestones and tracking for savings goals.'},
    ],
    'lose': [
        {'task_type': 'Fitness Planning', 'domain': 'fitness',
         'description': 'Design a workout routine tailored to the weight loss goal.'},
        {'task_type': 'Nutrition Planning', 'domain': 'fitness',
         'description': 'Create a meal plan supporting the fitness objectives.'},
        {'task_type': 'Progress Tracking', 'domain': 'scheduling',
         'description': 'Define metrics and checkpoints for tracking progress.'},
    ],
    'business': [
        {'task_type': 'Business Planning', 'domain': 'finance',
         'description': 'Develop a business plan with market analysis.'},
        {'task_type': 'Financial Projection', 'domain': 'finance',
         'description': 'Create revenue forecasts and funding requirements.'},
        {'task_type': 'Operations Planning', 'domain': 'scheduling',
         'description': 'Define operational workflows and resource needs.'},
        {'task_type': 'Growth Strategy', 'domain': 'finance',
         'description': 'Identify growth channels, partnerships, and scaling plans.'},
    ],
}

DEFAULT_TASKS = [
    {'task_type': 'Research & Analysis', 'domain': 'general',
     'description': 'Gather relevant information and analyze the goal requirements.'},
    {'task_type': 'Planning', 'domain': 'general',
     'description': 'Create a structured plan to achieve the stated goal.'},
    {'task_type': 'Execution Strategy', 'domain': 'general',
     'description': 'Define actionable steps and resources needed.'},
]


class ManagerService:
    """
    The Manager — the SINGLE orchestration layer.

    Responsibilities:
    1. Interpret the user's goal
    2. Decompose it into domain-tagged tasks
    3. Find and rank agents per task (domain match + rating + success_rate)
    4. Create TaskRecommendations so the user only sees curated agents
    5. Users NEVER interact with agents directly — only through the Manager

    The Manager is the intermediary between demand (users) and supply (agents).
    """

    @staticmethod
    def decompose_goal(goal: Goal) -> list[Task]:
        """
        Full orchestration pipeline:
        Goal → Tasks → Agent Discovery → Recommendations → Ready for user selection.
        """
        goal.status = 'decomposing'
        goal.save()

        raw = goal.raw_input.lower()
        tasks_to_create = None

        # Step 1: Match goal text to predefined task templates
        for keyword, task_templates in GOAL_TASK_MAP.items():
            if keyword in raw:
                tasks_to_create = task_templates
                break

        if not tasks_to_create:
            tasks_to_create = DEFAULT_TASKS

        # Step 2: Create domain-tagged Task objects
        created_tasks = []
        for task_data in tasks_to_create:
            task = Task.objects.create(
                goal=goal,
                task_type=task_data['task_type'],
                domain=task_data['domain'],
                description=task_data['description'],
                status='agent_selection',
            )
            created_tasks.append(task)

        # Step 3: For each task, find and recommend agents
        for task in created_tasks:
            ManagerService._recommend_agents_for_task(task)

        goal.status = 'in_progress'
        goal.save()

        return created_tasks

    @staticmethod
    def _recommend_agents_for_task(task: Task):
        """
        The orchestrator's agent discovery logic.
        Finds active agents matching the task's domain,
        ranks them by rating + success_rate, and creates recommendations.
        """
        # Find agents matching this task's domain
        matching_agents = Agent.objects.filter(
            status='active',
            domain__iexact=task.domain,
        ).order_by('-trust_score', '-rating', '-success_rate')

        if not matching_agents.exists():
            # Fallback: recommend all active agents if no domain match
            matching_agents = Agent.objects.filter(
                status='active',
            ).order_by('-trust_score', '-rating', '-success_rate')[:5]

        # Create ranked recommendations
        for rank, agent in enumerate(matching_agents, start=1):
            reason = ManagerService._generate_recommendation_reason(agent, task)
            TaskRecommendation.objects.create(
                task=task,
                agent=agent,
                rank=rank,
                reason=reason,
            )

    @staticmethod
    def _generate_recommendation_reason(agent: Agent, task: Task) -> str:
        """Generate a human-readable reason for why the orchestrator recommends this agent."""
        reasons = []

        if agent.domain == task.domain:
            reasons.append(f"Specializes in {agent.domain}")

        if agent.rating >= 4.5:
            reasons.append(f"Top-rated ({agent.rating}★)")
        elif agent.rating >= 4.0:
            reasons.append(f"Well-rated ({agent.rating}★)")

        if agent.success_rate >= 95:
            reasons.append(f"Elite success rate ({agent.success_rate}%)")
        elif agent.success_rate >= 90:
            reasons.append(f"High success rate ({agent.success_rate}%)")

        if agent.retrieval_depth >= 5:
            reasons.append("Deep RAG analysis capability")
        else:
            reasons.append("Fast synthesis")

        return ' · '.join([r for r in reasons if r])


class AgentExecutionService:
    """
    Runs an agent's execution logic:
    1. Query RAG (ChromaDB) based on agent tier / retrieval_depth
    2. Apply behavior rules
    3. Generate structured output
    4. Mark assignment complete and trigger payment
    """

    @staticmethod
    def execute(assignment: TaskAssignment) -> dict:
        """Execute a task assignment and return the result."""
        assignment.status = 'executing'
        assignment.save()

        agent = assignment.agent
        task = assignment.task

        try:
            # Step 1: Query RAG using the task's domain
            rag_results = AgentExecutionService._query_rag(
                query=f"{task.task_type}: {task.description}",
                domain=task.domain,
                n_results=agent.retrieval_depth,
            )

            # Step 2: Send task payload + RAG context to the Agent's actual API
            payload = {
                "task_id": str(task.id),
                "assignment_id": str(assignment.id),
                "task_type": task.task_type,
                "domain": task.domain,
                "description": task.description,
                "rag_context": rag_results,
                "retrieval_depth": agent.retrieval_depth,
                "requested_format": agent.supported_output_formats[0] if agent.supported_output_formats else "json"
            }

            output = None

            # Fallback for dummy/demo/internal endpoints to prevent self-request deadlock
            is_local = (
                not agent.api_endpoint
                or "example.com" in agent.api_endpoint
                or "127.0.0.1" in agent.api_endpoint
                or "localhost" in agent.api_endpoint
                or "internal-agents" in agent.api_endpoint
            )

            if is_local:
                output = AgentExecutionService._apply_rules(agent, task, rag_results)
            else:
                import requests
                headers = {"Content-Type": "application/json"}
                if agent.auth_method == 'api_key':
                    headers['x-api-key'] = agent.auth_secret
                elif agent.auth_method == 'bearer_token':
                    headers['Authorization'] = f"Bearer {agent.auth_secret}"
                
                response = requests.post(
                    agent.api_endpoint,
                    json=payload,
                    headers=headers,
                    timeout=agent.avg_completion_time or 60
                )
                
                if response.status_code == 200:
                    output = response.json()
                else:
                    raise Exception(f"Agent API failed with status {response.status_code}: {response.text}")

            # Step 3: Save result
            assignment.output_result = {"output": output}
            assignment.status = 'completed'
            assignment.completed_at = timezone.now()
            assignment.save()

            # Step 4: Update task status if all assignments are complete
            all_assignments = TaskAssignment.objects.filter(task=task)
            if all(a.status == 'completed' for a in all_assignments):
                task.status = 'completed'
                task.save()

            # Step 5: Check if all tasks in goal are complete
            goal = task.goal
            all_tasks = Task.objects.filter(goal=goal)
            if all(t.status == 'completed' for t in all_tasks):
                goal.status = 'completed'
                goal.save()

            # Step 6: Release payment
            PaymentService.release_payment(assignment)

            # Step 7: Update agent stats
            agent.jobs_completed += 1
            completed = TaskAssignment.objects.filter(agent=agent, status='completed').count()
            total = TaskAssignment.objects.filter(agent=agent).exclude(status='assigned').count()
            agent.success_rate = round((completed / max(total, 1)) * 100, 1)
            agent.save()

            # Step 8: Notify User
            Notification.objects.create(
                user=task.goal.user,
                title="Task Completed",
                message=f"Agent {agent.name} successfully executed task: '{task.task_type}'. Output is ready for review."
            )

            return output

        except Exception as e:
            assignment.status = 'failed'
            assignment.save()
            task.status = 'failed'
            task.save()

            # Refund on failure
            PaymentService.refund_payment(assignment)

            # Notify User of failure
            Notification.objects.create(
                user=task.goal.user,
                title="Task Failed",
                message=f"Agent {agent.name} failed to execute task: '{task.task_type}'. Escrowed funds have been refunded."
            )

            return {'error': str(e)}

    @staticmethod
    def _query_rag(query: str, domain: str, n_results: int) -> list[str]:
        """
        Query the ChromaDB knowledge layer by domain.
        Falls back to simulated knowledge if ChromaDB is unavailable.
        """
        try:
            import chromadb
            import os
            
            # The chroma_db directory should be located next to this file or higher up
            # Usually we run from Backend/ so we look for chroma_db in Backend
            db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")
            if os.path.exists(db_path):
                client = chromadb.PersistentClient(path=db_path)
                collection = client.get_collection(name="stahk_knowledge")
                
                # Query the specific domain or general if no exact match
                results = collection.query(
                    query_texts=[query],
                    n_results=n_results,
                    where={"domain": domain} if domain and domain != "general" else None
                )
                
                if results['documents'] and results['documents'][0]:
                    # Extract snippet lines as discrete facts just like the mock data
                    doc = results['documents'][0][0]
                    facts = [line.strip("- *1234567890. ") for line in doc.split("\n") if line.strip() and len(line) > 10]
                    return facts[:n_results]
        except Exception as e:
            print(f"ChromaDB Query Failed: {e}. Falling back to simulated knowledge.")

        # Fallback simulated knowledge
        simulated_knowledge = {
            'construction': [
                "A standard 3-bedroom house in Kenya requires approximately 1,200 sq ft of floor space.",
                "Foundation costs range from KES 150,000 to KES 300,000 depending on soil type.",
                "Roofing materials: Iron sheets (KES 800-1,200 per sheet), tiles (KES 1,500-3,000 per piece).",
                "Labour costs average KES 800-1,500 per day for skilled workers in Nairobi.",
                "Building permits in Nairobi cost between KES 30,000 and KES 100,000.",
                "Cement costs approximately KES 750-900 per 50kg bag, with ~200 bags needed for a 3-bedroom house.",
                "Plumbing installation ranges from KES 80,000 to KES 150,000.",
                "Electrical wiring costs between KES 60,000 and KES 120,000.",
                "A typical 3-bedroom construction takes 4-8 months to complete.",
                "Sand and ballast delivery costs KES 15,000-25,000 per lorry load.",
            ],
            'finance': [
                "Average monthly savings rate in Kenya is 15-20% of income for middle-income earners.",
                "M-Pesa money market funds offer 8-12% annual returns.",
                "Fixed deposit rates range from 7-10% per annum in Kenyan banks.",
                "SACCO savings accounts offer competitive rates of 10-14% on deposits.",
                "Treasury bills offer risk-free returns of 9-13% per annum.",
                "Construction financing: banks offer up to 80% LTV with 12-15% interest rates.",
                "Mortgage rates in Kenya range from 12% to 16% per annum.",
                "Material cost inflation averages 5-8% annually in Kenya's construction sector.",
                "Budget contingency of 10-15% is recommended for all construction projects.",
                "Labour costs constitute approximately 25-35% of total construction budget.",
            ],
            'scheduling': [
                "Foundation work typically takes 2-4 weeks for a 3-bedroom house.",
                "Wall construction requires 4-6 weeks depending on design complexity.",
                "Roofing installation: 1-2 weeks for standard iron sheet roofing.",
                "Plumbing and electrical rough-in should happen before plastering.",
                "Finishing works (plastering, painting, tiling) take 3-5 weeks.",
                "Inspection checkpoints should be set after foundation, walls, and roofing.",
                "Rainy season delays should be factored into the construction timeline.",
                "Material procurement should begin 2-3 weeks before construction starts.",
                "Project milestones: Foundation → Walls → Roof → Finishing → Handover.",
                "Buffer of 2-3 weeks should be added for unexpected delays.",
            ],
            'risk_analysis': [
                "Common risk: Material price fluctuation can increase costs by 10-20%.",
                "Weather delays account for an average 15% schedule overrun in Nairobi.",
                "Subcontractor reliability is a top risk factor in residential construction.",
                "Building code violations can result in demolition orders and financial loss.",
                "Title deed verification is critical before any construction begins.",
                "Environmental impact assessments may be required in certain zones.",
                "Security of materials on-site requires proper fencing and watchmen.",
                "Quality control failures in foundation work can compromise entire structure.",
                "Permit delays can hold up construction by 2-6 weeks.",
                "Cash flow disruptions are the leading cause of abandoned construction projects.",
            ],
            'fitness': [
                "A caloric deficit of 500 calories per day leads to ~0.5kg weight loss per week.",
                "Recommended protein intake for weight loss: 1.6-2.2g per kg of body weight.",
                "Combination of resistance training and cardio is most effective for fat loss.",
                "Sleep quality directly affects weight loss — aim for 7-9 hours per night.",
                "Hydration: drinking 2-3 liters of water daily supports metabolism.",
            ],
        }

        # Use domain-specific knowledge
        results = simulated_knowledge.get(domain, [])

        if not results:
            # Fallback: search across all domains
            query_lower = query.lower()
            for d, docs in simulated_knowledge.items():
                if d in query_lower:
                    results.extend(docs)

        if not results:
            results = simulated_knowledge.get('construction', [])

        return results[:n_results]

    @staticmethod
    def _apply_rules(agent, task, rag_results: list) -> dict:
        """
        Apply tier-based behavior differentiation.
        Uses task domain + description to generate contextually relevant output.
        """
        domain = (task.domain or 'general').lower()
        task_desc = task.description or task.task_type
        task_type = task.task_type

        # Domain-specific context prefixes ensure output is relevant to the actual task
        domain_context = {
            'construction': f"construction project: {task_desc}",
            'finance': f"financial analysis: {task_desc}",
            'scheduling': f"scheduling plan: {task_desc}",
            'risk_analysis': f"risk assessment: {task_desc}",
            'fitness': f"fitness program: {task_desc}",
            'healthcare': f"health plan: {task_desc}",
            'software': f"software task: {task_desc}",
        }.get(domain, f"{task_type}: {task_desc}")

        base_output = {
            'task_type': task_type,
            'domain': domain,
            'agent_name': agent.name,
            'context': domain_context,
            'retrieval_depth': agent.retrieval_depth,
            'knowledge_sources': len(rag_results),
        }

        # Filter RAG results to only include domain-relevant facts
        relevant_facts = [
            f for f in rag_results
            if any(kw in f.lower() for kw in domain.split('_') + task_type.lower().split())
        ] or rag_results  # fallback to all results if none match

        if agent.retrieval_depth <= 2:
            base_output['format'] = 'summary'
            base_output['output'] = (
                f"**Summary for {domain_context}:**\n\n"
                f"Based on {len(relevant_facts)} domain sources, here is what you need to know:\n\n"
                + " ".join(relevant_facts)
            )

        elif 2 < agent.retrieval_depth <= 5:
            base_output['format'] = 'structured'
            
            recs_text = "\n".join([f"- **Step {i+1}:** {doc.split('.')[0]}." for i, doc in enumerate(relevant_facts)])
            findings_text = "\n".join([f"- {fact}" for fact in relevant_facts])
            
            base_output['output'] = (
                f"### Structured Analysis: {domain_context}\n\n"
                f"**Key Findings:**\n{findings_text}\n\n"
                f"**Recommended Action Plan:**\n{recs_text}"
            )

        else:  # retrieval_depth > 5 — Premium tier
            # Build domain-specific risk factors
            domain_risks = {
                'construction': ['Budget overrun', 'Timeline delays', 'Material price fluctuation', 'Subcontractor reliability'],
                'finance': ['Market volatility', 'Liquidity risk', 'Regulatory changes', 'Currency fluctuation'],
                'scheduling': ['Resource conflicts', 'Scope creep', 'Dependency delays', 'Stakeholder availability'],
                'risk_analysis': ['Unidentified tail risks', 'Model assumptions', 'Data gaps', 'Cascading failures'],
            }.get(domain, ['Scope uncertainty', 'Resource constraints', 'External dependencies', 'Quality gaps'])

            domain_mitigations = {
                'construction': ['Include 15% contingency budget', 'Build 2–3 week buffer', 'Lock in supplier prices', 'Vet subcontractors with references'],
                'finance': ['Diversify portfolio', 'Maintain 6-month emergency fund', 'Review regulatory exposure quarterly', 'Hedge FX exposure'],
                'scheduling': ['Use resource levelling', 'Define change control process', 'Map critical path dependencies', 'Block calendar time early'],
                'risk_analysis': ['Scenario stress testing', 'Peer-review assumptions', 'Collect additional data points', 'Build circuit-breaker triggers'],
            }.get(domain, ['Define clear scope', 'Allocate buffer resources', 'Establish escalation path', 'Set quality checkpoints'])

            recs_text = "\n".join([f"1. **{doc.split('.')[0]}:** Ensure this is prioritized." for doc in relevant_facts])
            findings_text = "\n".join([f"- {fact}" for fact in relevant_facts])
            risks_text = "\n".join([f"- ⚠️ **{r}**: {m}" for r, m in zip(domain_risks, domain_mitigations)])
            
            confidence = round(0.75 + (len(relevant_facts) / max(len(rag_results), 1)) * 0.2, 2)
            
            base_output['format'] = 'detailed'
            base_output['output'] = (
                f"## Comprehensive {domain.title()} Analysis\n"
                f"**Task:** {task_desc}\n"
                f"**Confidence Score:** {int(confidence * 100)}%\n\n"
                f"### 1. Key Findings from Knowledge Base\n{findings_text}\n\n"
                f"### 2. Strategic Recommendations\n{recs_text}\n\n"
                f"### 3. Risk Assessment & Mitigation\n{risks_text}\n\n"
                f"*Report generated by {agent.name} using {len(relevant_facts)} domain references.*"
            )

        return base_output


class PaymentService:
    """
    Escrow-based payment logic.
    Payments released on task completion, refunded on failure.
    """

    @staticmethod
    def hold_in_escrow(user, assignment, amount):
        """Hold funds in escrow, deducting a 10% platform matching fee upfront."""
        from decimal import Decimal
        from .models import PlatformWallet

        profile = user.profile
        if profile.credit_balance < amount:
            raise ValueError("Insufficient USDC credit balance.")

        # Calculate platform fee (10% of task amount)
        platform_fee = round(Decimal(str(amount)) * Decimal('0.10'), 5)
        net_amount = Decimal(str(amount)) - platform_fee

        # Deduct full amount from user
        profile.credit_balance -= Decimal(str(amount))
        profile.save()

        # Credit platform wallet with matching fee
        PlatformWallet.get().credit_fee(platform_fee)

        # Create transaction for the net amount (what agent will receive)
        return Transaction.objects.create(
            user=user,
            assignment=assignment,
            amount=net_amount,
            currency='USDC',
            status='escrow',
        )

    @staticmethod
    def release_payment(assignment: TaskAssignment):
        """Release escrowed funds to the agent's creator."""
        try:
            txn = Transaction.objects.get(assignment=assignment)
            if txn.status == 'escrow':
                txn.status = 'released'
                txn.save()
                
                # Credit the agent creator's balance
                try:
                    creator_profile = assignment.agent.creator.profile
                    creator_profile.credit_balance += txn.amount
                    creator_profile.save()
                except Exception:
                    pass
        except Transaction.DoesNotExist:
            pass

    @staticmethod
    def refund_payment(assignment: TaskAssignment):
        """Refund escrowed funds to the user."""
        try:
            txn = Transaction.objects.get(assignment=assignment)
            if txn.status == 'escrow':
                txn.status = 'refunded'
                txn.save()
                
                # Refund the user's balance
                profile = assignment.task.goal.user.profile
                profile.credit_balance += txn.amount
                profile.save()
        except Transaction.DoesNotExist:
            pass


class VettingService:
    """
    Automated vetting process for newly submitted agents (Section 3.7).
    Sends a sample task payload to the agent's API endpoint to verify response and time.
    """

    @staticmethod
    def vet_agent(agent: Agent):
        if agent.status != 'pending':
            return False

        payload = {
            "task_id": "vetting_test_123",
            "task_type": "vetting_test",
            "domain": agent.domain,
            "input_data": "This is a sample orchestration task to verify your integration.",
            "requested_formats": agent.supported_output_formats or ["json"]
        }
        
        try:
            # Auto-approve local, internal, or dummy endpoints
            is_local = (
                not agent.api_endpoint
                or "example.com" in agent.api_endpoint
                or "127.0.0.1" in agent.api_endpoint
                or "localhost" in agent.api_endpoint
                or "internal-agents" in agent.api_endpoint
            )
            if is_local:
                agent.vetting_test_passed = True
                agent.vetting_test_result = {"status": "success", "message": "Internal endpoint — auto-approved"}
                agent.status = 'active'
            else:
                headers = {"Content-Type": "application/json"}
                if agent.auth_method == 'api_key':
                    headers['x-api-key'] = agent.auth_secret
                elif agent.auth_method == 'bearer_token':
                    headers['Authorization'] = f"Bearer {agent.auth_secret}"
                    
                response = requests.post(
                    agent.api_endpoint, 
                    json=payload, 
                    headers=headers, 
                    timeout=agent.avg_completion_time or 30
                )
                
                if response.status_code == 200:
                    agent.vetting_test_passed = True
                    agent.vetting_test_result = {"status_code": 200, "response": response.json()}
                    agent.status = 'active'
                else:
                    agent.vetting_test_passed = False
                    agent.vetting_test_result = {"status_code": response.status_code, "text": response.text}
                    agent.rejection_reason = "API endpoint returned non-200 status during test."
                    agent.status = 'suspended'
                    
        except Exception as e:
            agent.vetting_test_passed = False
            agent.vetting_test_result = {"error": str(e)}
            agent.rejection_reason = "Failed to connect to API endpoint or timed out."
            agent.status = 'suspended'
            
        agent.save()
        return agent.vetting_test_passed

    @staticmethod
    def run_all_vetting():
        """
        Run automated vetting for ALL pending agents.
        Calls vet_agent() on each one and returns the number processed.
        Used by the Admin 'Run Automated Vetting' button.
        """
        pending_agents = Agent.objects.filter(status='pending')
        processed = 0
        for agent in pending_agents:
            try:
                VettingService.vet_agent(agent)
                processed += 1
            except Exception as e:
                # Log but don't abort the loop
                print(f"[VettingService] Error vetting agent {agent.name}: {e}")
        return processed
