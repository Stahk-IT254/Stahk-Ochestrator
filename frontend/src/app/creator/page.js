"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { isAuthenticated, getMe, submitAgent, getMyAgents, toggleAgentStatus, withdrawFunds } from "@/lib/api";

const AGENT_TYPES = [
  "research","summarization","translation","data_analysis",
  "code_generation","image_processing","document_drafting","web_search","custom"
];
const INPUT_FMTS = ["text","pdf","image","audio","json","csv"];
const OUTPUT_FMTS = ["text","json","pdf","markdown","image"];

export default function CreatorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [agents, setAgents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);

  // Step 1: Identity
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [country, setCountry] = useState("");
  const [agentType, setAgentType] = useState("custom");
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  // Step 2: Technical
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [authMethod, setAuthMethod] = useState("api_key");
  const [authSecret, setAuthSecret] = useState("");
  const [inputFmts, setInputFmts] = useState(["text"]);
  const [outputFmts, setOutputFmts] = useState(["text"]);
  const [avgTime, setAvgTime] = useState(30);
  const [maxConcurrent, setMaxConcurrent] = useState(5);
  // Step 3: Payment
  const [wallet, setWallet] = useState("");
  const [payoutFreq, setPayoutFreq] = useState("per_task");
  const [minPayout, setMinPayout] = useState("5.00");
  // Step 4: Pricing
  const [basePrice, setBasePrice] = useState("");
  const [pagePrice, setPagePrice] = useState("0");
  const [minutePrice, setMinutePrice] = useState("0");
  const [surgePricing, setSurgePricing] = useState(false);
  const [domain, setDomain] = useState("general");
  const [depth, setDepth] = useState(2);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await getMe();
      setUser(u);
      if (u.role !== "agent_creator") { router.push("/dashboard"); return; }
      const a = await getMyAgents();
      setAgents(Array.isArray(a) ? a : []);
    } catch { router.push("/login"); }
  };

  const notify = (msg, type="success") => {
    setNotif({msg,type});
    setTimeout(() => setNotif(null), 4000);
  };

  const toggleFmt = (list, setList, val) => {
    setList(prev => prev.includes(val) ? prev.filter(v=>v!==val) : [...prev, val]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { ok, data } = await submitAgent({
      name, owner_full_name: ownerName, owner_email: ownerEmail, country,
      agent_type: agentType, short_description: shortDesc, long_description: longDesc,
      api_endpoint: apiEndpoint, auth_method: authMethod, auth_secret: authSecret,
      supported_input_formats: inputFmts, supported_output_formats: outputFmts,
      avg_completion_time: avgTime, max_concurrent_tasks: maxConcurrent,
      wallet_address: wallet, payout_frequency: payoutFreq,
      min_payout_threshold: parseFloat(minPayout),
      base_price_per_task: parseFloat(basePrice), per_page_price: parseFloat(pagePrice||0),
      per_minute_price: parseFloat(minutePrice||0), surge_pricing_enabled: surgePricing,
      domain, retrieval_depth: depth,
    });
    setLoading(false);
    if (ok) {
      notify(data.message || "Agent submitted for vetting!");
      setShowForm(false); setFormStep(1);
      await loadData();
    } else {
      notify(data?.error || JSON.stringify(data) || "Submission failed.", "error");
    }
  };

  const handleToggleStatus = async (agentId, action) => {
    const { ok, data } = await toggleAgentStatus(agentId, action);
    if (ok) {
      notify(`Agent ${action === 'pause' ? 'paused' : 'activated'} successfully.`);
      await loadData();
    } else {
      notify(data?.error || "Failed to update agent status.", "error");
    }
  };

  const handleWithdraw = async () => {
    if (!user?.credit_balance || user.credit_balance <= 0) {
      notify("No funds available to withdraw.", "error");
      return;
    }
    const { ok, data } = await withdrawFunds();
    if (ok) {
      notify(data.message);
      await loadData();
    } else {
      notify(data?.error || "Withdrawal failed.", "error");
    }
  };

  const stepLabels = ["Identity","Technical","Payment","Pricing"];

  const renderFormStep = () => {
    const label = (t) => <label className="form-label">{t}</label>;
    const row = (children) => (
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px"}}>{children}</div>
    );

    if (formStep === 1) return (
      <div className="animate-fade-in-up">
        <div style={{marginBottom:16}}>{label("Agent Display Name")}
          <input className="input-field" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. BuildSmart Pro" required /></div>
        {row(<><div>{label("Owner Full Name")}<input className="input-field" value={ownerName} onChange={e=>setOwnerName(e.target.value)} placeholder="Your full name" /></div>
          <div>{label("Owner Email")}<input className="input-field" type="email" value={ownerEmail} onChange={e=>setOwnerEmail(e.target.value)} placeholder="you@company.com" /></div></>)}
        {row(<><div>{label("Country")}<input className="input-field" value={country} onChange={e=>setCountry(e.target.value)} placeholder="e.g. Kenya" /></div>
          <div>{label("Agent Type")}<select className="input-field" value={agentType} onChange={e=>setAgentType(e.target.value)} style={{cursor:"pointer"}}>
            {AGENT_TYPES.map(t=><option key={t} value={t}>{t.replace("_"," ")}</option>)}</select></div></>)}
        <div style={{marginBottom:16}}>{label("Short Description (max 300 chars)")}
          <input className="input-field" value={shortDesc} onChange={e=>setShortDesc(e.target.value)} placeholder="What does this agent do?" maxLength={300} /></div>
        <div style={{marginBottom:16}}>{label("Long Description (max 1000 chars)")}
          <textarea className="input-field" value={longDesc} onChange={e=>setLongDesc(e.target.value)} placeholder="Capabilities, limitations, ideal task types..." rows={3} maxLength={1000} style={{resize:"vertical"}} /></div>
      </div>
    );
    if (formStep === 2) return (
      <div className="animate-fade-in-up">
        <div style={{marginBottom:16}}>{label("API Endpoint URL")}<input className="input-field" type="url" value={apiEndpoint} onChange={e=>setApiEndpoint(e.target.value)} placeholder="https://api.youragent.com/execute" /></div>
        {row(<><div>{label("Auth Method")}<select className="input-field" value={authMethod} onChange={e=>setAuthMethod(e.target.value)} style={{cursor:"pointer"}}>
          <option value="api_key">API Key</option><option value="bearer_token">Bearer Token</option></select></div>
          <div>{label("Auth Secret")}<input className="input-field" type="password" value={authSecret} onChange={e=>setAuthSecret(e.target.value)} placeholder="Your secret key" /></div></>)}
        <div style={{marginBottom:16}}>{label("Supported Input Formats")}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{INPUT_FMTS.map(f=>(
            <button type="button" key={f} onClick={()=>toggleFmt(inputFmts,setInputFmts,f)}
              style={{padding:"6px 14px",borderRadius:"var(--radius-full)",fontSize:"0.8rem",fontWeight:600,border:"1px solid",cursor:"pointer",
                background:inputFmts.includes(f)?"rgba(59,130,246,0.15)":"transparent",
                borderColor:inputFmts.includes(f)?"var(--accent-blue)":"var(--border-subtle)",
                color:inputFmts.includes(f)?"var(--accent-blue)":"var(--text-muted)"}}>{f}</button>))}</div></div>
        <div style={{marginBottom:16}}>{label("Supported Output Formats")}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{OUTPUT_FMTS.map(f=>(
            <button type="button" key={f} onClick={()=>toggleFmt(outputFmts,setOutputFmts,f)}
              style={{padding:"6px 14px",borderRadius:"var(--radius-full)",fontSize:"0.8rem",fontWeight:600,border:"1px solid",cursor:"pointer",
                background:outputFmts.includes(f)?"rgba(16,185,129,0.15)":"transparent",
                borderColor:outputFmts.includes(f)?"var(--accent-emerald)":"var(--border-subtle)",
                color:outputFmts.includes(f)?"var(--accent-emerald)":"var(--text-muted)"}}>{f}</button>))}</div></div>
        {row(<><div>{label("Avg Completion Time (seconds)")}<input className="input-field" type="number" min={1} value={avgTime} onChange={e=>setAvgTime(parseInt(e.target.value)||30)} /></div>
          <div>{label("Max Concurrent Tasks")}<input className="input-field" type="number" min={1} value={maxConcurrent} onChange={e=>setMaxConcurrent(parseInt(e.target.value)||5)} /></div></>)}
      </div>
    );
    if (formStep === 3) return (
      <div className="animate-fade-in-up">
        <div style={{marginBottom:16}}>{label("Arc Wallet Address (USDC)")}<input className="input-field" value={wallet} onChange={e=>setWallet(e.target.value)} placeholder="Your wallet address for payouts" /></div>
        {row(<><div>{label("Payout Frequency")}<select className="input-field" value={payoutFreq} onChange={e=>setPayoutFreq(e.target.value)} style={{cursor:"pointer"}}>
          <option value="per_task">Per Task</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></div>
          <div>{label("Min Payout Threshold ($)")}<input className="input-field" type="number" min={1} step="0.01" value={minPayout} onChange={e=>setMinPayout(e.target.value)} /></div></>)}
      </div>
    );
    if (formStep === 4) return (
      <div className="animate-fade-in-up">
        {row(<><div>{label("Base Price per Task (Credits)")}<input className="input-field" type="number" min={0.01} step="0.01" value={basePrice} onChange={e=>setBasePrice(e.target.value)} placeholder="e.g. 1.00" required /></div>
          <div>{label("Per-Page Price")}<input className="input-field" type="number" min={0} step="0.01" value={pagePrice} onChange={e=>setPagePrice(e.target.value)} /></div></>)}
        {row(<><div>{label("Per-Minute Price")}<input className="input-field" type="number" min={0} step="0.01" value={minutePrice} onChange={e=>setMinutePrice(e.target.value)} /></div>
          <div>{label("Domain")}<input className="input-field" value={domain} onChange={e=>setDomain(e.target.value)} placeholder="e.g. construction, finance" /></div></>)}
        {row(<><div>{label("Intelligence Depth (RAG docs)")}<input className="input-field" type="number" min={1} max={20} value={depth} onChange={e=>setDepth(parseInt(e.target.value)||2)} /></div>
          <div style={{display:"flex",alignItems:"end",paddingBottom:4}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:"0.85rem",color:"var(--text-secondary)"}}>
              <input type="checkbox" checked={surgePricing} onChange={e=>setSurgePricing(e.target.checked)} style={{width:18,height:18,accentColor:"var(--accent-purple)"}} />
              Enable surge pricing</label></div></>)}
      </div>
    );
  };

  const liveCount = agents.filter(a=>a.status==="active").length;
  const pendingCount = agents.filter(a=>a.status==="pending").length;

  return (
    <><Navbar />
      {notif && <div className={`toast toast-${notif.type}`}>{notif.msg}</div>}
      <main style={{padding:"32px",maxWidth:"960px",margin:"0 auto"}}>
        {/* Header */}
        <div className="animate-fade-in-up" style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:32}}>
          <div>
            <div style={{display:"inline-block",padding:"4px 14px",borderRadius:"var(--radius-full)",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",color:"var(--accent-purple)",fontSize:"0.75rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:14}}>🤖 Agent Creator Workshop</div>
            <h1 style={{fontSize:"1.8rem",fontWeight:800,marginBottom:6}}>{user?`${user.username}'s Workshop`:"Workshop"}</h1>
            <p style={{color:"var(--text-secondary)",fontSize:"0.95rem"}}>Build, register, and manage your AI agents.</p>
          </div>
          {/* Wallet Widget */}
          <div className="glass-card-static" style={{padding:"16px 24px",display:"flex",alignItems:"center",gap:24}}>
            <div>
              <div style={{fontSize:"0.75rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:700,marginBottom:4}}>Available Earnings</div>
              <div style={{fontSize:"1.6rem",fontWeight:800,color:"var(--accent-emerald)"}}>${user?.credit_balance || "0.00"} <span style={{fontSize:"0.9rem",color:"var(--text-muted)",fontWeight:600}}>USDC</span></div>
            </div>
            <button className="btn-emerald" onClick={handleWithdraw} style={{padding:"8px 16px",fontSize:"0.85rem"}} disabled={!user?.credit_balance || user.credit_balance <= 0}>Withdraw</button>
          </div>
        </div>

        {/* Stats */}
        <div className="animate-fade-in-up delay-100" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:28,opacity:0}}>
          {[{l:"Total",v:agents.length,c:"var(--text-primary)"},{l:"Live",v:liveCount,c:"var(--accent-emerald)"},{l:"Pending",v:pendingCount,c:"var(--accent-amber)"}].map(s=>(
            <div key={s.l} className="glass-card-static" style={{padding:20,textAlign:"center"}}>
              <div style={{fontSize:"1.6rem",fontWeight:800,color:s.c}}>{s.v}</div>
              <div style={{fontSize:"0.72rem",color:"var(--text-muted)",marginTop:4,textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:600}}>{s.l}</div>
            </div>))}
        </div>

        {/* Toggle Form */}
        <div className="animate-fade-in-up delay-200" style={{marginBottom:24,opacity:0}}>
          <button className="btn-purple" onClick={()=>{setShowForm(!showForm);setFormStep(1);}}>{showForm?"✕ Cancel":"+ Register New Agent"}</button>
        </div>

        {/* 4-Step Form */}
        {showForm && (
          <div className="glass-card-static animate-fade-in-up" style={{padding:32,marginBottom:28}}>
            {/* Step indicator */}
            <div style={{display:"flex",gap:4,marginBottom:8}}>
              {stepLabels.map((l,i)=>(
                <div key={i} style={{flex:1,textAlign:"center"}}>
                  <div style={{height:3,borderRadius:"var(--radius-full)",background:i+1<=formStep?"var(--accent-purple)":"var(--border-subtle)",transition:"background 0.3s",marginBottom:6}} />
                  <span style={{fontSize:"0.65rem",fontWeight:700,color:i+1<=formStep?"var(--accent-purple)":"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{l}</span>
                </div>))}
            </div>
            <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:20,marginTop:16}}>Step {formStep}: {stepLabels[formStep-1]}</h2>

            <form onSubmit={handleSubmit}>
              {renderFormStep()}
              <div style={{display:"flex",gap:12,marginTop:20}}>
                {formStep>1 && <button type="button" className="btn-secondary" onClick={()=>setFormStep(s=>s-1)} style={{flex:1}}>← Back</button>}
                {formStep<4 ? (
                  <button type="button" className="btn-purple" onClick={()=>setFormStep(s=>s+1)} style={{flex:2}}>Continue →</button>
                ) : (
                  <button type="submit" className="btn-purple" disabled={loading} style={{flex:2}}>{loading?"Submitting...":"Submit for Vetting"}</button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Agent List */}
        <div className="animate-fade-in-up delay-300" style={{opacity:0}}>
          <h3 className="section-label" style={{marginBottom:16}}>Your Agents ({agents.length})</h3>
          {agents.length===0?(
            <div className="glass-card-static" style={{padding:56,textAlign:"center",color:"var(--text-muted)"}}>
              <div style={{fontSize:"2.5rem",marginBottom:14}}>🤖</div>
              <p style={{fontWeight:600,marginBottom:4}}>No agents yet</p>
              <p style={{fontSize:"0.85rem"}}>Register your first agent to start earning.</p>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
              {agents.map(a=>(
                <div key={a.id} className="glass-card-static" style={{padding:24}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:10}}>
                    <div>
                      <h3 style={{fontSize:"1.05rem",fontWeight:700,marginBottom:2}}>{a.name}</h3>
                      <span style={{fontSize:"0.75rem",color:"var(--text-muted)",textTransform:"capitalize"}}>{(a.agent_type||"").replace("_"," ")}</span>
                    </div>
                    <span className={a.status==="active"?"status-badge-live":"status-badge-pending"}>{a.status?.toUpperCase()}</span>
                  </div>
                  {a.short_description&&<p style={{fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.5,marginBottom:14}}>{a.short_description}</p>}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                    {[{v:`$${a.base_price_per_task}`,l:"price",c:"var(--accent-emerald)"},{v:`${a.trust_score||0}`,l:"trust",c:"var(--accent-amber)"},{v:a.jobs_completed,l:"jobs",c:"var(--accent-blue)"}].map(s=>(
                      <div key={s.l} style={{padding:8,background:"var(--bg-secondary)",borderRadius:"var(--radius)",textAlign:"center"}}>
                        <div style={{fontSize:"0.95rem",fontWeight:800,color:s.c}}>{s.v}</div>
                        <div style={{fontSize:"0.6rem",color:"var(--text-muted)"}}>{s.l}</div>
                      </div>))}
                  </div>
                  {/* Management Actions */}
                  {(a.status === 'active' || a.status === 'suspended') && (
                    <div style={{borderTop:"1px solid var(--border-subtle)",paddingTop:14,display:"flex",gap:10}}>
                      {a.status === 'active' ? (
                        <button onClick={() => handleToggleStatus(a.id, 'pause')} className="btn-secondary" style={{width:"100%",fontSize:"0.8rem",padding:"6px 12px",color:"var(--accent-amber)",borderColor:"rgba(245,158,11,0.3)"}}>⏸ Pause Agent</button>
                      ) : (
                        <button onClick={() => handleToggleStatus(a.id, 'activate')} className="btn-emerald" style={{width:"100%",fontSize:"0.8rem",padding:"6px 12px"}}>▶ Activate Agent</button>
                      )}
                    </div>
                  )}
                </div>))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
