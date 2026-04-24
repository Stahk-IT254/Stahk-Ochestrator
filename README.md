# ⬡ STAHK Orchestrator

Stahk Orchestrator is a governed AI marketplace where users hire specialized agents per task, with execution powered by a shared knowledge system and payments enforced through escrow-based automation.

---

## 🚀 Project Status: MVP Completed

This repository contains the full stack implementation of the Stahk Orchestrator, built during the LabLab AI Hackathon. 

### ✅ What Has Been Implemented

1. **User & Authentication System**
   - JWT-based authentication.
   - Differentiated roles: `user` (Demand), `agent_creator` (Supply), and `admin` (Platform Regulator).
   - In-app notification system (polling bell icon) for task status updates.

2. **Supply-Side: Creator Workshop**
   - Creators can register and deploy new specialized AI agents.
   - Define agent domains, pricing, API endpoints, and authentication methods.
   - View agent success rates, track completed jobs, and manage active/paused status.
   - Track earnings and request withdrawals.

3. **Demand-Side: User Dashboard**
   - **Goal Decomposition:** Users interact with "Jarvis" (the Demand UI) to input complex real-world goals (e.g., "Build a 3-bedroom house"). The orchestrator automatically decomposes the goal into specific actionable tasks.
   - **Marketplace Selection:** The system recommends specific agents for each task. Users can select and hire agents à la carte.
   - **Wallet System:** Users can top up credits. Payments are held in secure escrow per task.
   - **Ratings:** Users can leave 5-star feedback on completed tasks, which dynamically updates the agent's marketplace trust score.

4. **Agent Execution Engine**
   - The Orchestrator safely manages all task assignments. Agents *never* interact with the user directly.
   - **External API Routing:** The engine makes real HTTP requests to external developer agent URLs, passing contextual payloads.
   - **Escrow Enforcement:** If an agent successfully returns the required output, funds are released to the creator. If the agent times out or fails, funds are automatically refunded to the user.

5. **RAG Knowledge Layer (ChromaDB)**
   - Fully integrated local Vector Database.
   - The Orchestrator queries ChromaDB for domain-specific facts before sending the payload to the external agent.
   - **Admin UI:** Admins can seamlessly upload `.md`, `.pdf`, and `.docx` files directly from the dashboard to train the orchestrator's RAG system. 

6. **Admin Command Center**
   - **Automated Vetting:** An integrated QA bot that tests pending agents by pinging their endpoints with dummy payloads. Admins can trigger this via a "⚡ Test API" button.
   - **Manual Governance:** Admins can override, approve, suspend, or reject agents.
   - **Financial Ledger:** A transparent table tracking every single escrow, release, and refund transaction across the platform.

---

### ⏳ What Is Remaining (Post-Hackathon / V2)

1. **Real Payment Integrations**
   - Transition from the simulated wallet system to real-world crypto rails (e.g., integrating Arc + Circle for actual USDC escrow smart contracts).

2. **Advanced RAG Chunking**
   - Improve the ChromaDB ingestion logic. Currently, full files are embedded as single documents. V2 should implement semantic chunking (e.g., LangChain `RecursiveCharacterTextSplitter`) for higher fidelity retrieval.

3. **External Delivery Channels**
   - Implement the `preferred_delivery` logic to push task results directly to users via WhatsApp or Email, rather than just the in-app dashboard.

4. **Production Deployment**
   - Configure PostgreSQL for the Django backend instead of SQLite.
   - Deploy backend to Render/AWS and frontend to Vercel.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), React, Vanilla CSS.
- **Backend:** Django, Django REST Framework, SQLite (Local).
- **AI/Knowledge:** ChromaDB, PyPDF2, python-docx.
- **Voice (Optional):** ElevenLabs TTS Integration (Jarvis).
