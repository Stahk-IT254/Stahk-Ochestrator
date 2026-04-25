"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { isAuthenticated, getMe, getAdminStats, getAdminAgents, adminUpdateAgentStatus, getAdminTransactions, adminRunVetting, adminVetSingleAgent, adminUploadKnowledge } from "@/lib/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("overview"); // overview, agents, transactions, knowledge
  const [notif, setNotif] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Knowledge Base State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDomain, setUploadDomain] = useState("general");
  const [uploading, setUploading] = useState(false);

  const notify = (msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    const [statsData, agentsData, txnsData] = await Promise.all([
      getAdminStats(),
      getAdminAgents(),
      getAdminTransactions()
    ]);
    setStats(statsData);
    setAgents(agentsData);
    setTransactions(txnsData);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    getMe().then(u => {
      if (u.role !== 'admin') {
        router.push("/dashboard"); // Redirect non-admins
      } else {
        setUser(u);
        loadData();
      }
    });
  }, [router]);

  const handleAgentAction = async (agentId, action) => {
    const { ok, data } = await adminUpdateAgentStatus(agentId, action);
    if (ok) {
      notify(`Agent ${action}d successfully`);
      loadData();
    } else {
      notify(`Failed to ${action} agent: ${data.error || 'Unknown error'}`, "error");
    }
  };

  const handleRunVetting = async () => {
    setLoading(true);
    const { ok, data } = await adminRunVetting();
    if (ok) {
      notify(data.message);
      await loadData();
    } else {
      notify(`Vetting failed: ${data?.error || 'Unknown'}`, "error");
    }
    setLoading(false);
  };

  const handleVetSingleAgent = async (agentId) => {
    setLoading(true);
    const { ok, data } = await adminVetSingleAgent(agentId);
    if (ok) {
      notify(data.message, data.passed ? "success" : "error");
      await loadData();
    } else {
      notify(`Vetting test failed: ${data?.error || 'Unknown'}`, "error");
    }
    setLoading(false);
  };

  const handleUploadKnowledge = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      notify("Please select a file to upload", "error");
      return;
    }
    setUploading(true);
    const { ok, data } = await adminUploadKnowledge(uploadFile, uploadDomain);
    if (ok) {
      notify(data.message, "success");
      setUploadFile(null);
      e.target.reset();
    } else {
      notify(`Upload failed: ${data?.error || 'Unknown'}`, "error");
    }
    setUploading(false);
  };

  if (!user) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "var(--text-secondary)" }}>
      <div className="spinner" style={{ width: 24, height: 24, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <span style={{ marginLeft: 12, fontWeight: 600 }}>Loading Admin Dashboard...</span>
    </div>
  );

  return (
    <>
      <Navbar />
      {notif && <div className={`toast toast-${notif.type}`}>{notif.msg}</div>}
      
      <main style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto", position: "relative" }}>
        
        {/* Subtle loading indicator for background data refreshes */}
        {loading && (
          <div style={{ position: "absolute", top: 32, right: 32, display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
            <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            Updating...
          </div>
        )}
        {/* Header */}
        <div className="animate-fade-in-up" style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "var(--radius-full)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--accent-red)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>🛡️ Platform Regulator</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 6 }}>Admin Command Center</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Oversee marketplace health, agent vetting, and financial escrow.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>
          {["overview", "agents", "transactions", "escrow flow", "knowledge"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, textTransform: "capitalize",
                padding: "8px 16px", borderRadius: "var(--radius)",
                color: activeTab === tab ? "white" : "var(--text-muted)",
                backgroundColor: activeTab === tab ? "var(--bg-secondary)" : "transparent"
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in-up">
          
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
              {[
                { l: "Total Users", v: stats.total_users, c: "var(--text-primary)" },
                { l: "Platform Goals", v: stats.total_goals, c: "var(--accent-blue)" },
                { l: "Tasks Executed", v: stats.total_tasks, c: "var(--accent-purple)" },
                { l: "Total Agents", v: stats.total_agents, c: "var(--accent-amber)" },
                { l: "Pending Agents", v: stats.pending_agents, c: "var(--accent-red)" },
                { l: "Volume in Escrow", v: `$${stats.total_escrow_volume}`, c: "var(--text-muted)" },
                { l: "Total Paid Out", v: `$${stats.total_released_volume}`, c: "var(--accent-emerald)" },
              ].map(s => (
                <div key={s.l} className="glass-card-static" style={{ padding: 24, textAlign: "center" }}>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.c, marginBottom: 8 }}>{s.v}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{s.l}</div>
                </div>
              ))}
            </div>
          )}

          {/* AGENTS TAB */}
          {activeTab === "agents" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 className="section-label" style={{ marginBottom: 0 }}>Marketplace Agents ({agents.length})</h3>
                <button onClick={handleRunVetting} className="btn-emerald" style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>⚡</span> Run Automated Vetting
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                {agents.map(a => (
                  <div key={a.id} className="glass-card-static" style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                        <h4 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{a.name}</h4>
                        <span className={`status-badge-${a.status === 'active' ? 'live' : a.status === 'pending' ? 'pending' : 'failed'}`}>{a.status.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 8 }}>
                        By {a.creator?.username} • {a.agent_type.replace("_", " ")} • ${a.base_price_per_task} / task
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Trust Score: {a.trust_score || 0} | Jobs: {a.jobs_completed} | API: {a.api_endpoint || 'None'}
                      </div>
                    </div>
                    
                    {/* Admin Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {a.status === 'pending' && (
                        <>
                          <button onClick={() => handleVetSingleAgent(a.id)} className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.75rem", background: "var(--accent-blue)" }}>⚡ Test API</button>
                          <button onClick={() => handleAgentAction(a.id, 'approve')} className="btn-emerald" style={{ padding: "6px 12px", fontSize: "0.75rem" }}>Approve</button>
                          <button onClick={() => handleAgentAction(a.id, 'reject')} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.75rem", color: "var(--accent-red)", borderColor: "rgba(239,68,68,0.3)" }}>Reject</button>
                        </>
                      )}
                      {a.status === 'active' && (
                        <button onClick={() => handleAgentAction(a.id, 'suspend')} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.75rem", color: "var(--accent-amber)", borderColor: "rgba(245,158,11,0.3)" }}>Suspend</button>
                      )}
                      {a.status === 'suspended' && (
                        <button onClick={() => handleAgentAction(a.id, 'activate')} className="btn-emerald" style={{ padding: "6px 12px", fontSize: "0.75rem" }}>Reactivate</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === "transactions" && (
            <div>
              <h3 className="section-label" style={{ marginBottom: 16 }}>Financial Ledger ({transactions.length})</h3>
              <div className="glass-card-static" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "16px 20px", fontWeight: 600 }}>Date</th>
                      <th style={{ padding: "16px 20px", fontWeight: 600 }}>User</th>
                      <th style={{ padding: "16px 20px", fontWeight: 600 }}>Task</th>
                      <th style={{ padding: "16px 20px", fontWeight: 600 }}>Amount</th>
                      <th style={{ padding: "16px 20px", fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "16px 20px" }}>{new Date(t.created_at).toLocaleString()}</td>
                        <td style={{ padding: "16px 20px", fontWeight: 600 }}>{t.user?.username}</td>
                        <td style={{ padding: "16px 20px" }}>{t.assignment?.task?.task_type || "N/A"}</td>
                        <td style={{ padding: "16px 20px", fontWeight: 700, color: "var(--text-primary)" }}>${t.amount} {t.currency}</td>
                        <td style={{ padding: "16px 20px" }}><span className={`status-${t.status}`}>{t.status.toUpperCase()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No transactions on the ledger yet.</div>}
              </div>
            </div>
          )}

          {/* ESCROW FLOW TAB */}
          {activeTab === "escrow flow" && (
            <div>
              <h3 className="section-label" style={{ marginBottom: 8 }}>Live Escrow Money Flow</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 28 }}>
                Visual representation of how the Stahk Orchestrator acts as a trusted escrow intermediary between demand-side users and agent creators.
              </p>

              {/* Orchestrator Wallet Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
                {[
                  { label: "Total Received", value: `$${(parseFloat(stats?.total_escrow_volume || 0) + parseFloat(stats?.total_released_volume || 0) + parseFloat(stats?.platform_total_fees || 0)).toFixed(5)}`, color: "var(--accent-blue)", icon: "⬇️" },
                  { label: "In Escrow (Holding)", value: `$${parseFloat(stats?.total_escrow_volume || 0).toFixed(5)}`, color: "var(--accent-amber)", icon: "🔒" },
                  { label: "Paid Out to Agents", value: `$${parseFloat(stats?.total_released_volume || 0).toFixed(5)}`, color: "var(--accent-emerald)", icon: "⬆️" },
                  { label: "Platform Wallet (Fees)", value: `$${parseFloat(stats?.platform_wallet_balance || 0).toFixed(5)}`, color: "var(--accent-purple)", icon: "🏦" },
                ].map(s => (
                  <div key={s.label} className="glass-card-static" style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: "2rem" }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: s.color }}>{s.value} <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>USDC</span></div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Animated Flow Diagram */}
              <div className="glass-card-static" style={{ padding: 32, marginBottom: 32, overflow: "hidden", position: "relative" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 24 }}>Escrow Architecture</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  
                  {/* Users Side */}
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", margin: "0 auto 10px" }}>👤</div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Demand Users</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>Pay for tasks</div>
                    <div style={{ marginTop: 8, padding: "4px 12px", borderRadius: "var(--radius-full)", background: "rgba(59,130,246,0.15)", color: "var(--accent-blue)", fontSize: "0.72rem", fontWeight: 700, display: "inline-block" }}>
                      {stats?.total_users || 0} Users
                    </div>
                  </div>

                  {/* Arrow in */}
                  <div style={{ flex: 1, textAlign: "center", position: "relative" }}>
                    <div style={{ height: 2, background: "linear-gradient(90deg, var(--accent-blue), var(--accent-amber))", position: "relative", margin: "0 8px" }}>
                      <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: "0.7rem", color: "var(--accent-blue)", fontWeight: 700, whiteSpace: "nowrap" }}>USDC Escrow Lock 🔒</div>
                      <div style={{ position: "absolute", top: -8, right: -6, width: 0, height: 0, borderLeft: "10px solid var(--accent-amber)", borderTop: "6px solid transparent", borderBottom: "6px solid transparent" }}></div>
                    </div>
                  </div>

                  {/* Orchestrator */}
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-amber), #f97316)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", margin: "0 auto 10px", boxShadow: "0 0 24px rgba(245,158,11,0.3)" }}>🏦</div>
                    <div style={{ fontWeight: 800, fontSize: "1rem" }}>Stahk Orchestrator</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>Escrow Wallet</div>
                    <div style={{ marginTop: 8, padding: "4px 12px", borderRadius: "var(--radius-full)", background: "rgba(245,158,11,0.15)", color: "var(--accent-amber)", fontSize: "0.72rem", fontWeight: 700, display: "inline-block" }}>
                      🔒 ${stats?.total_escrow_volume || "0.00"} Holding
                    </div>
                  </div>

                  {/* Arrow out */}
                  <div style={{ flex: 1, textAlign: "center", position: "relative" }}>
                    <div style={{ height: 2, background: "linear-gradient(90deg, var(--accent-amber), var(--accent-emerald))", position: "relative", margin: "0 8px" }}>
                      <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: "0.7rem", color: "var(--accent-emerald)", fontWeight: 700, whiteSpace: "nowrap" }}>Task Complete → Release 💸</div>
                      <div style={{ position: "absolute", top: -8, right: -6, width: 0, height: 0, borderLeft: "10px solid var(--accent-emerald)", borderTop: "6px solid transparent", borderBottom: "6px solid transparent" }}></div>
                    </div>
                  </div>

                  {/* Agents side */}
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-emerald), #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", margin: "0 auto 10px" }}>🤖</div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Agent Creators</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>Earn on completion</div>
                    <div style={{ marginTop: 8, padding: "4px 12px", borderRadius: "var(--radius-full)", background: "rgba(16,185,129,0.15)", color: "var(--accent-emerald)", fontSize: "0.72rem", fontWeight: 700, display: "inline-block" }}>
                      💸 ${stats?.total_released_volume || "0.00"} Paid
                    </div>
                  </div>
                </div>
              </div>

              {/* Per-Transaction Flow Log */}
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Transaction Flow Log</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {transactions.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>No transactions yet. Have a user hire an agent to see the flow!</div>}
                {transactions.map(t => (
                  <div key={t.id} className="glass-card-static" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", minWidth: 130 }}>{new Date(t.created_at).toLocaleString()}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: "var(--accent-blue)" }}>👤 {t.user?.username}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>→</span>
                      <span style={{ fontWeight: 700, color: "var(--accent-amber)" }}>🏦 Orchestrator</span>
                      {t.status === "released" && <><span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>→</span><span style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>🤖 {t.assignment?.agent?.name || "Agent"}</span></>}
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>for "{t.assignment?.task?.task_type || "task"}"</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: t.status === "released" ? "var(--accent-emerald)" : t.status === "refunded" ? "var(--text-muted)" : "var(--accent-amber)", minWidth: 100, textAlign: "right" }}>
                      ${t.amount} USDC
                    </div>
                    <div style={{ minWidth: 80 }}>
                      <span style={{ padding: "3px 10px", borderRadius: "var(--radius-full)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase",
                        background: t.status === "released" ? "rgba(16,185,129,0.15)" : t.status === "refunded" ? "rgba(107,114,128,0.15)" : "rgba(245,158,11,0.15)",
                        color: t.status === "released" ? "var(--accent-emerald)" : t.status === "refunded" ? "var(--text-muted)" : "var(--accent-amber)"
                      }}>{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KNOWLEDGE BASE TAB */}
          {activeTab === "knowledge" && (
            <div>
              <h3 className="section-label" style={{ marginBottom: 16 }}>Knowledge Base (ChromaDB Vector Store)</h3>
              <div className="glass-card-static" style={{ padding: 32, maxWidth: 600 }}>
                <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: "0.9rem" }}>
                  Upload Markdown (.md) documents to train the orchestrator's RAG system. Agents will automatically query this knowledge based on the task domain.
                </p>
                <form onSubmit={handleUploadKnowledge} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 700 }}>Industry Domain</label>
                    <select
                      value={uploadDomain}
                      onChange={(e) => setUploadDomain(e.target.value)}
                      className="input-base"
                      style={{ backgroundColor: "var(--bg-glass)", color: "var(--text-primary)" }}
                      required
                    >
                      <option value="general" style={{ background: "#111", color: "#fff" }}>General</option>
                      <option value="construction" style={{ background: "#111", color: "#fff" }}>Construction & Real Estate</option>
                      <option value="finance" style={{ background: "#111", color: "#fff" }}>Finance & Auditing</option>
                      <option value="healthcare" style={{ background: "#111", color: "#fff" }}>Healthcare & Compliance</option>
                      <option value="software" style={{ background: "#111", color: "#fff" }}>Software Engineering</option>
                      <option value="fitness" style={{ background: "#111", color: "#fff" }}>Fitness & Wellness</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 700 }}>Knowledge Document (.md, .pdf, .docx)</label>
                    <input
                      type="file"
                      accept=".md,.pdf,.docx"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      className="input-base"
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={uploading}>
                    {uploading ? "Ingesting Vector Data..." : "Upload to Knowledge Base"}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
