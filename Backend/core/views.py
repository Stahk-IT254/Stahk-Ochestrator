from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.utils import timezone

from .models import Goal, Task, Agent, TaskAssignment, Transaction, AgentRating
from .serializers import (
    RegisterSerializer, UserSerializer, ProfileUpdateSerializer,
    GoalSerializer, GoalCreateSerializer,
    TaskSerializer, AgentSerializer, AgentDetailSerializer,
    AgentCreateSerializer, TaskAssignmentSerializer,
    TransactionSerializer, AgentRatingSerializer,
)
from .services import ManagerService


# ──────────────────────────────────────────────
# AUTH VIEWS (Module 2 — User Onboarding)
# ──────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user (demand or supply side) and return JWT tokens."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'tokens': {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Return the current authenticated user with full profile."""
    # Ensure superusers have the admin role
    if request.user.is_superuser and request.user.profile.role != 'admin':
        request.user.profile.role = 'admin'
        request.user.profile.save()
    return Response(UserSerializer(request.user).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update user profile settings (Section 4.4)."""
    serializer = ProfileUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    profile = request.user.profile
    for field, value in serializer.validated_data.items():
        setattr(profile, field, value)
    profile.save()

    return Response(UserSerializer(request.user).data)


# ──────────────────────────────────────────────
# AGENT CREATOR VIEWS (Module 1 — Supply Side)
# ──────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_agent(request):
    """
    Agent creator submits a new agent — 4-step registration (Section 3.3–3.6).
    Agent starts as 'pending' until vetting process completes.
    """
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'agent_creator':
        return Response(
            {'error': 'Only agent creators can submit agents.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = AgentCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    agent = serializer.save(
        creator=request.user,
        status='pending',
    )
    return Response({
        'message': 'Agent submitted for vetting. You will receive a response within 48 hours.',
        'agent': AgentDetailSerializer(agent).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_agents(request):
    """List agents created by the current user (creator's own view with full details)."""
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'agent_creator':
        return Response(
            {'error': 'Only agent creators can view their agents.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    agents = Agent.objects.filter(creator=request.user).order_by('-created_at')
    return Response(AgentDetailSerializer(agents, many=True).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_agent_status(request, agent_id):
    """Toggle agent status between active and suspended."""
    try:
        agent = Agent.objects.get(id=agent_id, creator=request.user)
    except Agent.DoesNotExist:
        return Response({'error': 'Agent not found.'}, status=status.HTTP_404_NOT_FOUND)

    action = request.data.get('action')
    if action == 'pause' and agent.status == 'active':
        agent.status = 'suspended'
        agent.save()
    elif action == 'activate' and agent.status == 'suspended' and agent.vetting_test_passed:
        agent.status = 'active'
        agent.save()
    else:
        return Response({'error': 'Invalid status transition.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response(AgentDetailSerializer(agent).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def withdraw_funds(request):
    """Mock withdrawal of all available USDC credits."""
    profile = request.user.profile
    if profile.credit_balance <= 0:
        return Response({'error': 'No funds available to withdraw.'}, status=status.HTTP_400_BAD_REQUEST)
    
    amount_withdrawn = profile.credit_balance
    profile.credit_balance = 0
    profile.save()

    return Response({'message': f'Successfully withdrew ${amount_withdrawn} USDC to your wallet.', 'new_balance': 0})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def topup_funds(request):
    from decimal import Decimal
    amount = Decimal(str(request.data.get('amount', 50.0)))
    profile = request.user.profile
    profile.credit_balance += amount
    profile.save()
    return Response({'message': f'Successfully added ${amount} USDC to your wallet.', 'new_balance': profile.credit_balance})


# ──────────────────────────────────────────────
# GOAL VIEWS
# ──────────────────────────────────────────────

class GoalListCreateView(generics.ListCreateAPIView):
    """
    GET  — list user's goals
    POST — create a new goal and trigger the Manager to decompose it into tasks
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return GoalCreateSerializer
        return GoalSerializer

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        goal = serializer.save(user=self.request.user)
        # Manager decomposes the goal into tasks
        ManagerService.decompose_goal(goal)


class GoalDetailView(generics.RetrieveDestroyAPIView):
    """GET/DELETE — retrieve or delete a single goal."""
    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user)


# ──────────────────────────────────────────────
# TASK VIEWS
# ──────────────────────────────────────────────

class TaskDetailView(generics.RetrieveAPIView):
    """GET — retrieve a single task with recommended agents."""
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(goal__user=self.request.user)


# ──────────────────────────────────────────────
# AGENT MARKETPLACE (Supply-side competitive view)
# ──────────────────────────────────────────────

class AgentListView(generics.ListAPIView):
    """GET — list all active agents (public profile view, Section 3.8)."""
    serializer_class = AgentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Agent.objects.filter(status='active')
        domain = self.request.query_params.get('domain')
        agent_type = self.request.query_params.get('type')
        if domain:
            qs = qs.filter(domain__iexact=domain)
        if agent_type:
            qs = qs.filter(agent_type__iexact=agent_type)
        return qs.order_by('-trust_score', '-rating', '-success_rate')


# ──────────────────────────────────────────────
# AGENT SELECTION & EXECUTION
# ──────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def select_agent(request):
    """
    User selects an agent for a task.
    Body: { "task_id": "...", "agent_id": "..." }
    Creates a TaskAssignment and an escrow Transaction.
    """
    task_id = request.data.get('task_id')
    agent_id = request.data.get('agent_id')

    try:
        task = Task.objects.get(id=task_id, goal__user=request.user)
        agent = Agent.objects.get(id=agent_id, status='active')
    except (Task.DoesNotExist, Agent.DoesNotExist):
        return Response({'error': 'Invalid task or agent.'}, status=status.HTTP_404_NOT_FOUND)

    # Prevent duplicate assignment
    if TaskAssignment.objects.filter(task=task, agent=agent).exists():
        return Response({'error': 'Agent already assigned to this task.'}, status=status.HTTP_400_BAD_REQUEST)

    # Create assignment
    assignment = TaskAssignment.objects.create(task=task, agent=agent)
    task.status = 'in_progress'
    task.save()

    # Create escrow transaction
    from .services import PaymentService
    try:
        transaction = PaymentService.hold_in_escrow(request.user, assignment, agent.base_price_per_task)
    except ValueError as e:
        assignment.delete() # rollback
        return Response({'error': str(e)}, status=status.HTTP_402_PAYMENT_REQUIRED)

    return Response({
        'assignment': TaskAssignmentSerializer(assignment).data,
        'transaction': TransactionSerializer(transaction).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def execute_task(request, assignment_id):
    """
    Trigger agent execution for a given assignment.
    The agent queries RAG and produces structured output.
    """
    try:
        assignment = TaskAssignment.objects.get(
            id=assignment_id,
            task__goal__user=request.user,
        )
    except TaskAssignment.DoesNotExist:
        return Response({'error': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

    if assignment.status != 'assigned':
        return Response({'error': f'Assignment is already {assignment.status}.'}, status=status.HTTP_400_BAD_REQUEST)

    # Run the agent execution service
    from .services import AgentExecutionService
    result = AgentExecutionService.execute(assignment)

    return Response({
        'assignment': TaskAssignmentSerializer(assignment).data,
        'result': result,
    })


# ──────────────────────────────────────────────
# PAYMENT VIEWS
# ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_transactions(request):
    """GET — list the current user's transactions."""
    txns = Transaction.objects.filter(user=request.user).order_by('-created_at')
    return Response(TransactionSerializer(txns, many=True).data)


# ──────────────────────────────────────────────
# RATING VIEWS
# ──────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rate_agent(request):
    """
    User rates an agent after task completion.
    Body: { "assignment_id": "...", "score": 5, "comment": "..." }
    """
    assignment_id = request.data.get('assignment_id')
    score = request.data.get('score')
    comment = request.data.get('comment', '')

    if not score or int(score) < 1 or int(score) > 5:
        return Response({'error': 'Score must be between 1 and 5.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        assignment = TaskAssignment.objects.get(
            id=assignment_id,
            task__goal__user=request.user,
            status='completed',
        )
    except TaskAssignment.DoesNotExist:
        return Response({'error': 'Completed assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

    if AgentRating.objects.filter(user=request.user, assignment=assignment).exists():
        return Response({'error': 'You already rated this assignment.'}, status=status.HTTP_400_BAD_REQUEST)

    rating = AgentRating.objects.create(
        user=request.user,
        agent=assignment.agent,
        assignment=assignment,
        score=int(score),
        comment=comment,
    )

    # Update agent's aggregate rating
    agent = assignment.agent
    all_ratings = AgentRating.objects.filter(agent=agent)
    agent.rating = round(sum(r.score for r in all_ratings) / all_ratings.count(), 1)
    agent.save()

    return Response(AgentRatingSerializer(rating).data, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────
# VOICE INTEGRATION (ElevenLabs TTS)
# ──────────────────────────────────────────────

import os
import requests
from django.http import HttpResponse

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def jarvis_tts(request):
    """
    Takes text input and returns an audio stream using ElevenLabs TTS.
    Proxying the request through the backend keeps the API key hidden.
    """
    text = request.data.get('text')
    if not text:
        return Response({'error': 'No text provided.'}, status=status.HTTP_400_BAD_REQUEST)

    api_key = os.environ.get('ELEVENLABS_API_KEY')
    if not api_key:
        return Response({'error': 'ElevenLabs API key not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # A good default voice ID for Jarvis (e.g., 'Brian' or 'Adam' or you can customize)
    # Using 'Adam' (pNInz6obpgDQGcFmaJgB) as default, but can be changed
    voice_id = "pNInz6obpgDQGcFmaJgB" 
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }

    data = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }

    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        
        # Return the audio binary directly to the frontend
        return HttpResponse(response.content, content_type="audio/mpeg")
    except requests.exceptions.RequestException as e:
        return Response({'error': f'TTS generation failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ──────────────────────────────────────────────
# NOTIFICATIONS
# ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    from .models import Notification
    notifs = Notification.objects.filter(user=request.user)
    data = []
    for n in notifs:
        data.append({
            'id': str(n.id),
            'title': n.title,
            'message': n.message,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat()
        })
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notif_id):
    from .models import Notification
    try:
        n = Notification.objects.get(id=notif_id, user=request.user)
        n.is_read = True
        n.save()
        return Response({'status': 'ok'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

# ──────────────────────────────────────────────
# RATINGS & FEEDBACK (RAG Fine-Tuning Loop)
# ──────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rate_agent(request):
    """
    User submits a star rating and optional comment for a completed assignment.
    - Saves the AgentRating to the database.
    - Updates the agent's overall average rating.
    - Injects the user feedback text into ChromaDB so it enriches future RAG queries.
    """
    assignment_id = request.data.get('assignment_id')
    score = request.data.get('score')
    comment = request.data.get('comment', '').strip()

    if not assignment_id or not score:
        return Response({'error': 'assignment_id and score are required.'}, status=400)

    try:
        score = int(score)
        if not (1 <= score <= 5):
            raise ValueError
    except (ValueError, TypeError):
        return Response({'error': 'Score must be an integer between 1 and 5.'}, status=400)

    try:
        assignment = TaskAssignment.objects.select_related('agent', 'task').get(
            id=assignment_id, task__goal__user=request.user
        )
    except TaskAssignment.DoesNotExist:
        return Response({'error': 'Assignment not found.'}, status=404)

    if assignment.status == 'failed':
        return Response({'error': 'Cannot rate a failed assignment.'}, status=400)

    if assignment.status not in ('completed', 'assigned'):
        return Response({'error': f'Assignment status is "{assignment.status}" — cannot rate yet.'}, status=400)

    # Prevent duplicate ratings
    if AgentRating.objects.filter(user=request.user, assignment=assignment).exists():
        return Response({'error': 'You have already rated this assignment.'}, status=400)

    # 1. Save rating to DB
    AgentRating.objects.create(
        user=request.user,
        agent=assignment.agent,
        assignment=assignment,
        score=score,
        comment=comment,
    )

    # 2. Recalculate and update agent's average rating
    agent = assignment.agent
    all_ratings = AgentRating.objects.filter(agent=agent)
    avg = sum(r.score for r in all_ratings) / len(all_ratings)
    agent.rating = round(avg, 2)
    agent.save(update_fields=['rating'])

    # 3. Inject feedback into ChromaDB for RAG fine-tuning
    if comment:
        try:
            import chromadb, os, uuid as _uuid
            db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")
            client = chromadb.PersistentClient(path=db_path)
            collection = client.get_or_create_collection(name="stahk_knowledge")

            domain = assignment.task.domain or "general"
            feedback_text = (
                f"User Feedback for agent '{agent.name}' on domain '{domain}' "
                f"(Score: {score}/5): {comment}"
            )
            doc_id = f"feedback_{assignment_id}_{_uuid.uuid4().hex[:8]}"
            collection.upsert(
                documents=[feedback_text],
                metadatas=[{
                    "domain": domain,
                    "source": "user_feedback",
                    "agent": agent.name,
                    "score": str(score),
                }],
                ids=[doc_id]
            )
        except Exception as rag_err:
            # RAG injection is best-effort — don't fail the whole request
            print(f"[RAG Feedback Injection Warning]: {rag_err}")

    return Response({
        'message': f'Thank you! Your {score}-star rating has been saved and will help improve future results.',
        'new_agent_rating': agent.rating,
    })


# ──────────────────────────────────────────────
# ADMIN SYSTEM (Section 3.9)
# ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    if request.user.profile.role != 'admin':
        return Response({'error': 'Unauthorized'}, status=403)
    
    from .models import Goal, Task, Agent, Transaction, PlatformWallet
    from django.db.models import Sum

    wallet = PlatformWallet.get()
    data = {
        'total_users': User.objects.count(),
        'total_goals': Goal.objects.count(),
        'total_tasks': Task.objects.count(),
        'total_agents': Agent.objects.count(),
        'pending_agents': Agent.objects.filter(status='pending').count(),
        'total_escrow_volume': Transaction.objects.filter(status='escrow').aggregate(Sum('amount'))['amount__sum'] or 0,
        'total_released_volume': Transaction.objects.filter(status='released').aggregate(Sum('amount'))['amount__sum'] or 0,
        'platform_wallet_balance': float(wallet.balance),
        'platform_total_fees': float(wallet.total_fees_collected),
        'platform_total_transactions': wallet.total_transactions,
    }
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_agents(request):
    if request.user.profile.role != 'admin':
        return Response({'error': 'Unauthorized'}, status=403)
    agents = Agent.objects.all().order_by('-created_at')
    return Response(AgentDetailSerializer(agents, many=True).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_update_agent(request, agent_id):
    if request.user.profile.role != 'admin':
        return Response({'error': 'Unauthorized'}, status=403)
    
    try:
        agent = Agent.objects.get(id=agent_id)
        action = request.data.get('action')
        
        if action == 'approve':
            agent.status = 'active'
            agent.vetting_test_passed = True
        elif action == 'reject':
            agent.status = 'suspended'
            agent.rejection_reason = request.data.get('reason', 'Rejected by admin')
        elif action == 'suspend':
            agent.status = 'suspended'
        elif action == 'activate':
            agent.status = 'active'
            
        agent.save()
        return Response(AgentDetailSerializer(agent).data)
    except Agent.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_run_vetting(request):
    if request.user.profile.role != 'admin':
        return Response({'error': 'Unauthorized'}, status=403)
    
    from .services import VettingService
    processed = VettingService.run_all_vetting()
    return Response({'message': f'Automated vetting completed. Processed {processed} pending agents.'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_vet_single_agent(request, agent_id):
    if request.user.profile.role != 'admin':
        return Response({'error': 'Unauthorized'}, status=403)
    
    from .services import VettingService
    try:
        agent = Agent.objects.get(id=agent_id)
        if agent.status != 'pending':
            return Response({'error': 'Agent is not pending vetting.'}, status=400)
            
        passed = VettingService.vet_agent(agent)
        message = 'Agent passed automated vetting and is now active.' if passed else 'Agent failed vetting and was suspended.'
        return Response({'message': message, 'passed': passed, 'agent': AgentDetailSerializer(agent).data})
    except Agent.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_transactions(request):
    if request.user.profile.role != 'admin':
        return Response({'error': 'Unauthorized'}, status=403)
    txns = Transaction.objects.all().order_by('-created_at')
    return Response(TransactionSerializer(txns, many=True).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_upload_knowledge(request):
    """
    Endpoint for Admin to upload .md files to ChromaDB Knowledge Base.
    """
    if request.user.profile.role != 'admin':
        return Response({'error': 'Unauthorized'}, status=403)
        
    file = request.FILES.get('file')
    domain = request.data.get('domain', 'general').lower()
    
    if not file:
        return Response({'error': 'No file uploaded'}, status=400)
    
    file_name = file.name.lower()
    if not (file_name.endswith('.md') or file_name.endswith('.pdf') or file_name.endswith('.docx')):
        return Response({'error': 'Only .md, .pdf, and .docx files are supported.'}, status=400)
        
    try:
        content = ""
        if file_name.endswith('.md'):
            content = file.read().decode('utf-8')
        elif file_name.endswith('.pdf'):
            import PyPDF2
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    content += text + "\n"
        elif file_name.endswith('.docx'):
            import docx
            doc = docx.Document(file)
            content = "\n".join([para.text for para in doc.paragraphs])
        
        import chromadb
        import os
        import uuid
        
        # Initialize Persistent Client
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")
        client = chromadb.PersistentClient(path=db_path)
        collection = client.get_or_create_collection(name="stahk_knowledge")
        
        # Upsert document into ChromaDB
        doc_id = f"doc_{domain}_{uuid.uuid4().hex[:8]}"
        collection.upsert(
            documents=[content],
            metadatas=[{"domain": domain, "source": file.name}],
            ids=[doc_id]
        )
        
        return Response({'message': f'Successfully added {file.name} to the {domain} knowledge base!'})
    except Exception as e:
        return Response({'error': f'Failed to process document: {str(e)}'}, status=500)

# ──────────────────────────────────────────────
# INTERNAL DUMMY AGENTS (For Hackathon/Testing)
# ──────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def internal_agent_execute(request):
    """
    Simulates an external developer's Agent API endpoint.
    Receives orchestration payload, analyzes the intelligence depth (retrieval_depth / tier),
    and formats a response based on the provided RAG context.
    """
    data = request.data
    task_type = data.get('task_type', 'Unknown Task')
    domain = data.get('domain', 'general')
    context = data.get('rag_context', [])
    depth = data.get('retrieval_depth', 2)
    
    # Simulate processing time based on depth
    import time
    time.sleep(min(depth * 0.5, 3)) # Max 3 seconds

    if depth <= 2:
        # Basic Tier (Summary)
        output = {
            "status": "success",
            "format": "summary",
            "result": f"Basic summary for {task_type}. Analyzed {len(context)} facts.",
            "data": " ".join(context[:2]) if context else "No context available."
        }
    elif 2 < depth <= 5:
        # Standard Tier (Structured)
        output = {
            "status": "success",
            "format": "structured",
            "result": f"Standard analysis for {task_type}.",
            "details": context[:5],
            "action_items": [f"Implement: {fact.split('.')[0]}" for fact in context[:5]]
        }
    else:
        # Premium Tier (Detailed + Risks)
        output = {
            "status": "success",
            "format": "detailed",
            "result": f"Premium deep-dive for {task_type}.",
            "comprehensive_analysis": context,
            "risk_factors": [
                "Market volatility could affect pricing.",
                "Regulatory changes in the domain may require compliance updates.",
                "Supply chain delays for necessary materials."
            ],
            "strategic_recommendation": "Proceed with caution, ensuring all action items are documented."
        }
        
    return Response(output)

