"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { getAgents } from "@/lib/api";

export default function MarketplacePage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");

  useEffect(() => {
    loadAgents();
  }, [domainFilter, tierFilter]);

  const loadAgents = async () => {
    setLoading(true);
    const data = await getAgents(domainFilter || undefined, tierFilter || undefined);
    setAgents(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const domains = [...new Set(agents.map((a) => a.domain))];

  return (
    <>
      <Navbar />
      <main style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
        <div className="animate-fade-in-up" style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "4px" }}>
            🏪 Agent Marketplace
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Browse specialized AI agents — ranked by performance.
          </p>
        </div>

        {/* Filters */}
        <div
          className="animate-fade-in-up delay-100"
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "24px",
            flexWrap: "wrap",
            opacity: 0,
          }}
        >
          <select
            className="input-field"
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            style={{ width: "auto", minWidth: "160px", cursor: "pointer" }}
          >
            <option value="">All Domains</option>
            <option value="construction">Construction</option>
            <option value="finance">Finance</option>
            <option value="scheduling">Scheduling</option>
            <option value="risk_analysis">Risk Analysis</option>
          </select>
          <select
            className="input-field"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            style={{ width: "auto", minWidth: "160px", cursor: "pointer" }}
          >
            <option value="">All Tiers</option>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        {/* Agent Grid */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
            <div className="spinner" />
          </div>
        ) : agents.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px",
              color: "var(--text-muted)",
            }}
          >
            <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>No agents found</p>
            <p style={{ fontSize: "0.85rem", marginTop: "4px" }}>
              Try adjusting your filters.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {agents.map((agent, i) => (
              <div
                key={agent.id}
                className={`glass-card animate-fade-in-up`}
                style={{
                  padding: "24px",
                  opacity: 0,
                  animationDelay: `${i * 0.06}s`,
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>
                      {agent.name}
                    </h3>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        textTransform: "capitalize",
                      }}
                    >
                      {agent.domain.replace("_", " ")}
                    </span>
                  </div>
                  <span className={`badge badge-${agent.tier}`}>{agent.tier}</span>
                </div>

                {/* Description */}
                {agent.description && (
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      marginBottom: "16px",
                    }}
                  >
                    {agent.description}
                  </p>
                )}

                {/* Stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      padding: "10px",
                      background: "var(--bg-secondary)",
                      borderRadius: "var(--radius)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 800,
                        color: "var(--accent-emerald)",
                      }}
                    >
                      KES {agent.price}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      per task
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px",
                      background: "var(--bg-secondary)",
                      borderRadius: "var(--radius)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 800,
                        color: "var(--accent-amber)",
                      }}
                    >
                      ⭐ {agent.rating}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      rating
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px",
                      background: "var(--bg-secondary)",
                      borderRadius: "var(--radius)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 800,
                        color: "var(--accent-blue)",
                      }}
                    >
                      {agent.success_rate}%
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      success
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${agent.success_rate}%` }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "10px",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>{agent.jobs_completed} jobs done</span>
                  <span>Depth: {agent.retrieval_depth} docs</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
