"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { isAuthenticated, getMe, createGoal, getGoals, getGoal, selectAgent, executeTask, rateAgent, getJarvisAudio, topUpFunds, getTransactions } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [activeGoal, setActiveGoal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [inputMode, setInputMode] = useState("text"); // text | voice | document
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const [transactions, setTransactions] = useState([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [ratingScores, setRatingScores] = useState({});
  const [ratingComments, setRatingComments] = useState({});

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    loadUser();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadUser = async () => {
    try {
      const data = await getMe();
      setUser(data);
      if (data.role === "agent_creator") { router.push("/creator"); return; }
      await loadGoals();
      // Jarvis welcome
      // We don't auto-play the voice here to respect browser autoplay policies (user hasn't interacted yet)
      jarvisSpeak(`Welcome${data.full_name ? `, ${data.full_name}` : ""}! 🧠 I'm Jarvis, your AI orchestrator. Tell me what you want to achieve — type it, speak it, or upload a document. I'll break it down and find the best agents for you.`, true);
    } catch { router.push("/login"); }
  };

  const loadGoals = async () => {
    const data = await getGoals();
    setGoals(Array.isArray(data) ? data : []);
  };

  const notify = (msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 4000);
  };

  const addMsg = (from, text) => setMessages(prev => [...prev, { from, text }]);

  const playVoice = async (text) => {
    try {
      const audioUrl = await getJarvisAudio(text);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (err) {
      console.error("Jarvis voice failed to play:", err);
    }
  };

  const jarvisSpeak = async (text, mute = false) => {
    // Add to chat immediately
    setMessages(prev => {
      // Avoid adding duplicate welcome messages if React runs effect twice in dev
      if (prev.length === 0 || prev[prev.length - 1].text !== text) {
        return [...prev, { from: "jarvis", text }];
      }
      return prev;
    });

    if (!mute) {
      playVoice(text);
    }
  };

  // ── TEXT INPUT ──
  const handleSendText = async (e) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text || sending) return;
    setChatInput("");
    addMsg("user", text);
    await submitGoal(text);
  };

  // ── VOICE INPUT ──
  const handleVoiceToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    // Use Web Speech API for transcription
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setIsRecording(true);
      jarvisSpeak("🎙️ Listening... Speak your goal now.");
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsRecording(false);
        addMsg("user", `🎤 "${transcript}"`);
        submitGoal(transcript);
      };
      recognition.onerror = () => {
        setIsRecording(false);
        jarvisSpeak("⚠️ Could not capture audio. Please try again or type your goal.");
      };
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } else {
      jarvisSpeak("⚠️ Voice input is not supported in this browser. Please type your goal instead.");
    }
  };

  // ── DOCUMENT UPLOAD ──
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    // Read file content
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result;
      const preview = content.length > 200 ? content.slice(0, 200) + "..." : content;
      addMsg("user", `📄 Uploaded: ${file.name}\n\n${preview}`);
      jarvisSpeak(`I've received your document. Let me analyze it and create a goal from its contents.`);
      // Use file content as goal
      const goalText = `[Document: ${file.name}] ${content.slice(0, 500)}`;
      submitGoal(goalText);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── SUBMIT GOAL (common handler) ──
  const submitGoal = async (text) => {
    setSending(true);
    jarvisSpeak("Analyzing your goal...");
    const { ok, data } = await createGoal(text);
    setSending(false);

    if (ok) {
      await loadGoals();
      const fullGoal = await getGoal(data.id);
      setActiveGoal(fullGoal);
      const taskCount = fullGoal.tasks?.length || 0;
      const taskList = fullGoal.tasks?.map((t, i) => `  ${i + 1}. **${t.task_type}** (${t.domain})`).join("\n") || "";
      jarvisSpeak(`I've broken your goal into ${taskCount} tasks:\n${taskList}\n\nI've found recommended agents for each task. Select them below to proceed.`);
    } else {
      jarvisSpeak(`Something went wrong: ${data?.detail || "Could not process your goal. Please try again."}`);
    }
  };

  // ── AGENT SELECTION ──
  const handleSelectAgent = async (taskId, agentId) => {
    const { ok } = await selectAgent(taskId, agentId);
    if (ok) {
      notify("Agent hired! Payment held in escrow.");
      const refreshed = await getGoal(activeGoal.id);
      setActiveGoal(refreshed);
      jarvisSpeak("Agent hired and payment escrowed. You can now execute the task.");
    } else {
      notify("Failed to assign agent.", "error");
    }
  };

  const handleExecute = async (assignmentId) => {
    jarvisSpeak("Executing task...");
    const { ok } = await executeTask(assignmentId);
    if (ok) {
      notify("Task executed! Payment released.");
      const refreshed = await getGoal(activeGoal.id);
      setActiveGoal(refreshed);
      await loadGoals();
      jarvisSpeak("Task completed successfully! Payment has been released to the agent.");
    } else {
      notify("Execution failed.", "error");
      jarvisSpeak("Task execution failed. Payment has been refunded.");
    }
  };

  const handleSelectGoal = async (goalId) => {
    setLoading(true);
    const fullGoal = await getGoal(goalId);
    setActiveGoal(fullGoal);
    setLoading(false);
  };

  const handleTopUp = async () => {
    const { ok, data } = await topUpFunds(50);
    if (ok) {
      notify(data.message);
      loadUser();
    } else {
      notify("Failed to add funds.", "error");
    }
  };

  const handleRate = async (assignmentId) => {
    const score = ratingScores[assignmentId];
    const comment = ratingComments[assignmentId];
    if (!score) return;
    const { ok } = await rateAgent(assignmentId, score, comment || "");
    if (ok) {
      notify("Thank you for your rating!");
      // Optionally refresh the goal to hide the rating box
    } else {
      notify("Failed to submit rating.", "error");
    }
  };

  const loadTransactions = async () => {
    const txns = await getTransactions();
    setTransactions(txns);
    setShowTransactions(true);
  };

  const inputModes = [
    { key: "text", icon: "💬", label: "Text" },
    { key: "voice", icon: "🎤", label: "Voice" },
    { key: "document", icon: "📄", label: "Upload" },
  ];

  return (
    <><Navbar />
      {notif && <div className={`toast toast-${notif.type}`}>{notif.msg}</div>}
      <main style={{ display: "grid", gridTemplateColumns: "280px 1fr", height: "calc(100vh - 65px)", overflow: "hidden" }}>

        {/* ── Left: Sidebar ── */}
        <div style={{ borderRight: "1px solid var(--border-subtle)", padding: "20px", display: "flex", flexDirection: "column" }}>
          
          {/* Wallet Widget */}
          <div className="glass-card-static" style={{ padding: "16px", marginBottom: "20px" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: 4 }}>Credit Balance</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-emerald)", marginBottom: 8 }}>
              ${user?.profile?.credit_balance || "0.00"} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>USDC</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-emerald" onClick={handleTopUp} style={{ flex: 1, fontSize: "0.75rem", padding: "6px 0" }}>+ Add Funds</button>
              <button className="btn-secondary" onClick={loadTransactions} style={{ flex: 1, fontSize: "0.75rem", padding: "6px 0" }}>History</button>
            </div>
          </div>

          <h3 className="section-label" style={{ marginBottom: 14 }}>Your Goals</h3>
          <div style={{ overflowY: "auto", flex: 1 }}>
          {goals.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Tell Jarvis what you need!</p>
          ) : goals.map(g => (
            <div key={g.id} onClick={() => handleSelectGoal(g.id)} className="glass-card-static"
              style={{ padding: "14px", marginBottom: 8, cursor: "pointer",
                borderColor: activeGoal?.id === g.id ? "var(--accent-blue)" : "var(--border-subtle)" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>
                {g.raw_input?.length > 55 ? g.raw_input.slice(0, 55) + "..." : g.raw_input}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className={`status-${g.status?.replace("_", "-")}`} style={{ fontSize: "0.72rem", fontWeight: 600 }}>● {g.status}</span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{g.tasks?.length || 0} tasks</span>
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* ── Right: Jarvis chat + task panel ── */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

          {/* Chat messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
                marginBottom: 14,
              }}>
                <div style={{
                  maxWidth: "75%", padding: "14px 18px", borderRadius: "var(--radius-lg)",
                  background: msg.from === "user"
                    ? "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))"
                    : "var(--bg-glass)",
                  border: msg.from === "jarvis" ? "1px solid var(--border-subtle)" : "none",
                  color: "var(--text-primary)", fontSize: "0.88rem", lineHeight: 1.6,
                  whiteSpace: "pre-line",
                  position: "relative",
                }}>
                  {msg.from === "jarvis" && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        🧠 Jarvis
                      </div>
                      <button 
                        onClick={() => playVoice(msg.text)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", opacity: 0.6, transition: "opacity 0.2s" }}
                        onMouseEnter={(e) => e.target.style.opacity = 1}
                        onMouseLeave={(e) => e.target.style.opacity = 0.6}
                        title="Play voice"
                      >
                        🔊
                      </button>
                    </div>
                  )}
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />

            {/* Active goal tasks */}
            {activeGoal?.tasks?.map(task => (
              <div key={task.id} className="glass-card-static" style={{ padding: 20, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{task.task_type}</h4>
                    <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "var(--radius-full)",
                      background: "rgba(59,130,246,0.1)", color: "var(--accent-blue)", fontWeight: 600,
                      textTransform: "uppercase" }}>{task.domain}</span>
                  </div>
                  <span className={`status-${task.status?.replace("_","-")}`}
                    style={{ fontSize: "0.75rem", fontWeight: 600 }}>● {task.status}</span>
                </div>

                {/* Hired agents */}
                {task.assignments?.map(a => (
                  <div key={a.id} style={{ padding: 12, background: "var(--bg-secondary)", borderRadius: "var(--radius)", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{a.agent?.name}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600 }} className={`status-${a.status}`}>● {a.status}</span>
                    </div>
                    {a.status === "assigned" && (
                      <button className="btn-emerald" onClick={() => handleExecute(a.id)}
                        style={{ marginTop: 8, fontSize: "0.8rem", padding: "7px 18px" }}>▶ Execute</button>
                    )}
                    {a.output_result && (
                      <div style={{ marginTop: 10, padding: 12, background: "var(--bg-primary)", borderRadius: "var(--radius)", fontSize: "0.8rem" }}>
                        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent-emerald)", textTransform: "uppercase", marginBottom: 6 }}>✓ Result</div>
                        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                          {typeof a.output_result.output === "string" ? a.output_result.output : JSON.stringify(a.output_result.output, null, 2)}
                        </pre>
                        
                        {/* Rating UI */}
                        {a.status === "completed" && (
                          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: 6 }}>Rate {a.agent?.name}</div>
                            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                              {[1, 2, 3, 4, 5].map(star => (
                                <span key={star} style={{ cursor: "pointer", fontSize: "1.2rem", color: ratingScores[a.id] >= star ? "#eab308" : "var(--border-subtle)" }}
                                  onClick={() => setRatingScores(prev => ({ ...prev, [a.id]: star }))}>★</span>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <input className="input-field" placeholder="Optional feedback..." value={ratingComments[a.id] || ""} onChange={e => setRatingComments(prev => ({ ...prev, [a.id]: e.target.value }))} style={{ padding: "4px 8px", fontSize: "0.75rem", flex: 1 }} />
                              <button className="btn-primary" onClick={() => handleRate(a.id)} style={{ padding: "4px 12px", fontSize: "0.75rem" }}>Submit</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Recommended agents */}
                {(task.status === "agent_selection" || task.status === "pending") && task.recommended_agents?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>🧠 Recommended Agents</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                      {task.recommended_agents.map(agent => (
                        <div key={agent.id} style={{ padding: 14, background: "var(--bg-secondary)", borderRadius: "var(--radius)",
                          border: agent.rank === 1 ? "1px solid var(--border-hover)" : "1px solid var(--border-subtle)" }}>
                          {agent.rank === 1 && <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--accent-emerald)", textTransform: "uppercase", marginBottom: 4 }}>★ Best Match</div>}
                          <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>{agent.name}</div>
                          {agent.recommendation_reason && <p style={{ fontSize: "0.7rem", color: "var(--accent-blue)", marginBottom: 6, fontStyle: "italic" }}>🧠 {agent.recommendation_reason}</p>}
                          <div style={{ display: "flex", gap: 10, fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 8 }}>
                            <span>${agent.base_price_per_task}</span><span>⭐ {agent.rating}</span><span>{agent.trust_score}🛡</span>
                          </div>
                          <button className="btn-emerald" onClick={() => handleSelectAgent(task.id, agent.id)}
                            style={{ width: "100%", fontSize: "0.78rem", padding: "7px 14px" }}>Hire Agent</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Input bar ── */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "16px 24px", background: "var(--bg-glass)", backdropFilter: "blur(16px)" }}>
            {/* Mode switcher */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {inputModes.map(m => (
                <button key={m.key} type="button" onClick={() => setInputMode(m.key)}
                  style={{
                    padding: "5px 14px", borderRadius: "var(--radius-full)", fontSize: "0.78rem", fontWeight: 600,
                    border: "1px solid", cursor: "pointer", transition: "all 0.2s",
                    background: inputMode === m.key ? "rgba(59,130,246,0.15)" : "transparent",
                    borderColor: inputMode === m.key ? "var(--accent-blue)" : "var(--border-subtle)",
                    color: inputMode === m.key ? "var(--accent-blue)" : "var(--text-muted)",
                  }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {/* Text input */}
            {inputMode === "text" && (
              <form onSubmit={handleSendText} style={{ display: "flex", gap: 10 }}>
                <input className="input-field" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  placeholder="Tell Jarvis what you want to achieve..."
                  disabled={sending} style={{ flex: 1 }} />
                <button className="btn-primary" type="submit" disabled={sending || !chatInput.trim()}
                  style={{ whiteSpace: "nowrap" }}>
                  <span>{sending ? "..." : "Send"}</span>
                </button>
              </form>
            )}

            {/* Voice input */}
            {inputMode === "voice" && (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button onClick={handleVoiceToggle}
                  style={{
                    width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer",
                    fontSize: "1.4rem", transition: "all 0.3s",
                    background: isRecording
                      ? "linear-gradient(135deg, var(--accent-red), #dc2626)"
                      : "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
                    boxShadow: isRecording ? "0 0 20px rgba(239,68,68,0.4)" : "0 0 20px rgba(59,130,246,0.3)",
                    animation: isRecording ? "pulse-glow 1s ease-in-out infinite" : "none",
                  }}>
                  {isRecording ? "⏹" : "🎤"}
                </button>
                <div>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: isRecording ? "var(--accent-red)" : "var(--text-primary)" }}>
                    {isRecording ? "Listening..." : "Press to speak"}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {isRecording ? "Speak your goal clearly, then I'll process it" : "Describe your goal using your voice"}
                  </p>
                </div>
              </div>
            )}

            {/* Document upload */}
            {inputMode === "document" && (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect}
                  accept=".txt,.pdf,.csv,.json,.md,.doc,.docx" style={{ display: "none" }} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px" }}>
                  📄 Choose File
                </button>
                <div>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>Upload a document</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>TXT, PDF, CSV, JSON, Markdown — Jarvis will extract your goal</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transactions Modal */}
        {showTransactions && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
            <div className="glass-card-static animate-fade-in-up" style={{ padding: 24, width: "100%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto", position: "relative" }}>
              <button onClick={() => setShowTransactions(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "var(--text-muted)" }}>✕</button>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 16 }}>Transaction History</h2>
              {transactions.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No transactions yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {transactions.map(t => (
                    <div key={t.id} style={{ padding: 16, background: "var(--bg-secondary)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 4 }}>{t.assignment?.task?.task_type || "Task"}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Agent: {t.assignment?.agent?.name}</div>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 4 }}>{new Date(t.created_at).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: t.status === "refunded" ? "var(--text-muted)" : "var(--accent-red)" }}>
                          -${t.amount} {t.currency}
                        </div>
                        <div className={`status-${t.status}`} style={{ fontSize: "0.7rem", fontWeight: 600, marginTop: 4, display: "inline-block" }}>{t.status.toUpperCase()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
