🚀 STAHK ORCHESTRATOR — BUILD SPEC (ANTIGRAVITY READY)
1. 🧠 SYSTEM PURPOSE

Stahk Orchestrator is a goal execution marketplace where:

Users submit real-world goals
A Manager system decomposes goals into tasks
Users select AI agents per task (based on price + rating)
Agents execute tasks using a shared knowledge base (RAG)
Payments are released per completed task via escrow
Admin controls marketplace quality
2. 🏗️ HIGH-LEVEL ARCHITECTURE
Frontend (Next.js)
    ↓
Backend API (Django)
    ↓
────────────────────────────
Core System (Supabase/Postgres)
- Users
- Goals
- Tasks
- Agents
- Ratings
- Transactions
- Selections
────────────────────────────
    ↓
Agent Orchestration Layer (Python services)
    ↓
RAG Knowledge Layer
ChromaDB
3. 🧩 CORE MODULES
3.1 USER SYSTEM
Entities:
User
Auth session
Role (user / admin / agent creator)
3.2 GOAL SYSTEM

User submits:

"I want to build a 3-bedroom house"

Stored as:

goal_id
user_id
raw_input
status
3.3 TASK DECOMPOSITION (MANAGER)

Manager converts goal → tasks:

Example:

Construction planning
Financial estimation
Scheduling
Risk analysis

Each task becomes:

task_id
goal_id
task_type
status
3.4 AGENT MARKETPLACE

Each task has multiple agents:

Agent Entity:
name
domain (construction, finance, etc.)
price
rating
success_rate
tier
Agent selection:

User selects:

one or more agents per task

Stored:

task_agent_assignment
3.5 EXECUTION ENGINE

Each agent executes independently:

Flow:

Task → Agent → RAG → Output → Task Completion
3.6 KNOWLEDGE LAYER (RAG)
Tool:

ChromaDB

Purpose:

Provides shared knowledge to all agents.

Stores:
construction guides
pricing data
scheduling templates
financial rules
domain knowledge
Retrieval logic:
docs = chroma.query(query, n_results=N)
Agent variation comes from:
number of documents retrieved
formatting rules
depth of reasoning
template complexity
3.7 PAYMENT SYSTEM (ESCROW)
Currency:

USDC

via:
Arc + Circle

Flow:
User pays Manager
Funds held in escrow
Agent completes task
Payment released
Failure → refund
Logic:
if task.status == "completed":
    release_payment(agent)
else:
    refund_user()
3.8 RATING SYSTEM

Metrics:

user rating
success rate
jobs completed

Used to:

rank agents
adjust pricing visibility
influence selection
3.9 ADMIN SYSTEM

Platform control layer.

Features:
Agents:
approve
reject
suspend
upgrade tier
Tasks:
monitor execution
retry failures
override status
Payments:
track escrow
monitor transactions
audit logs
Knowledge Base:
upload documents
edit datasets
remove outdated data
4. 🧠 AGENT DESIGN (CRITICAL)

Agents are NOT LLM-dependent.

They are:

Rule-based executors using RAG retrieval + structured templates

Agent structure:
Agent = {
    "tier": "basic | standard | premium",
    "retrieval_depth": int,
    "output_template": str,
    "rules": dict
}
Behavior differences:
Tier	Retrieval	Output
Basic	2 docs	summary
Standard	5 docs	structured
Premium	10 docs	detailed + risks
5. 🧭 KEY FLOWS
5.1 FULL USER FLOW
User Goal
→ Manager decomposes tasks
→ Agents listed per task
→ User selects agents
→ Payment to escrow
→ Agents execute (parallel)
→ Results stored
→ Payment released
→ User rates agents
5.2 PARTIAL TASK SELECTION

User may choose:

only financial agent
only construction agent

System adjusts pricing dynamically.

5.3 AGENT EXECUTION FLOW
Task assigned
→ Agent queries RAG
→ Applies behavior rules
→ Generates output
→ Returns result
→ Marks task complete
6. 📊 DATABASE (SUPABASE)
Core Tables:
users
goals
tasks
agents
agent_ratings
task_assignments
transactions
admin_actions
7. ⚙️ BACKEND (DJANGO)
Responsibilities:
orchestration logic
agent selection
task management
payment triggers
RAG integration calls
admin APIs
8. 🎨 FRONTEND (NEXT.JS)
User UI:
goal input
task breakdown view
agent marketplace per task
payment screen
execution dashboard
results + rating
Admin UI:
agent management
system monitoring
RAG control
transactions view
9. 🔥 CORE PRINCIPLES (NON-NEGOTIABLES)
Manager controls all orchestration
agents never directly interact with users
RAG only provides knowledge, not reasoning
payments are per task, not per session
agents compete on price + performance
system must support partial selection of agents
10. 🚀 MVP SCOPE (HACKATHON FOCUS)

Focus on:

MUST BUILD:
Construction goal flow
Agent marketplace
RAG retrieval
escrow payment simulation
admin view (basic)
SIMULATE:
multiple agent types
payment distribution logic
ratings system
11. 🧭 FINAL SYSTEM SUMMARY

Stahk Orchestrator is a governed AI marketplace where users hire specialized agents per task, with execution powered by a shared knowledge system and payments enforced through escrow-based automation.