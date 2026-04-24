"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 65px)",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        {/* Hero */}
        <div
          className="animate-fade-in-up"
          style={{ maxWidth: "700px", marginBottom: "48px" }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "6px 16px",
              borderRadius: "var(--radius-full)",
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              color: "var(--accent-blue)",
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: "24px",
            }}
          >
            🧠 AI-Orchestrated Goal Execution
          </div>
          <h1
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: "20px",
            }}
          >
            Tell Us Your Goal.{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-blue), var(--accent-emerald))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              We Orchestrate The Rest.
            </span>
          </h1>
          <p
            style={{
              fontSize: "1.15rem",
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              maxWidth: "560px",
              margin: "0 auto 36px",
            }}
          >
            Our AI orchestrator breaks your goal into tasks, finds the best
            specialized agents, and coordinates execution — you only pay on
            success.
          </p>
          <div
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link href="/register">
              <button className="btn-primary">
                <span>Submit a Goal →</span>
              </button>
            </Link>
            <Link href="/register">
              <button className="btn-secondary">Build Agents</button>
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div
          style={{
            maxWidth: "800px",
            width: "100%",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "20px",
            }}
          >
            How it works
          </h2>
        </div>

        {/* Flow Steps */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            maxWidth: "900px",
            width: "100%",
            marginBottom: "48px",
          }}
        >
          {[
            {
              step: "01",
              icon: "🎯",
              title: "Define Your Goal",
              desc: 'Tell us what you want to achieve in plain language.',
            },
            {
              step: "02",
              icon: "🧠",
              title: "Orchestrator Analyzes",
              desc: "Our Manager breaks it into tasks and finds matching agents.",
            },
            {
              step: "03",
              icon: "🤖",
              title: "Review & Select",
              desc: "Choose from orchestrator-recommended agents per task.",
            },
            {
              step: "04",
              icon: "💳",
              title: "Pay on Success",
              desc: "Funds held in escrow. Released only on completion.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className={`glass-card animate-fade-in-up`}
              style={{
                padding: "24px 20px",
                textAlign: "left",
                opacity: 0,
                animationDelay: `${(i + 1) * 0.1}s`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    color: "var(--accent-blue)",
                    letterSpacing: "0.05em",
                  }}
                >
                  STEP {f.step}
                </span>
              </div>
              <div style={{ fontSize: "1.8rem", marginBottom: "10px" }}>
                {f.icon}
              </div>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: "0.83rem",
                  lineHeight: 1.5,
                  color: "var(--text-secondary)",
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Two-sided CTA */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            maxWidth: "650px",
            width: "100%",
          }}
        >
          <Link href="/register" style={{ textDecoration: "none" }}>
            <div
              className="glass-card animate-fade-in-up"
              style={{
                padding: "28px 24px",
                textAlign: "center",
                cursor: "pointer",
                opacity: 0,
                animationDelay: "0.5s",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🎯</div>
              <h3
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                I Have Goals
              </h3>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                }}
              >
                Submit goals and let the orchestrator handle execution.
              </p>
            </div>
          </Link>
          <Link href="/register" style={{ textDecoration: "none" }}>
            <div
              className="glass-card animate-fade-in-up"
              style={{
                padding: "28px 24px",
                textAlign: "center",
                cursor: "pointer",
                opacity: 0,
                animationDelay: "0.6s",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🤖</div>
              <h3
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                I Build Agents
              </h3>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                }}
              >
                Create agents, set pricing, and earn per completed task.
              </p>
            </div>
          </Link>
        </div>
      </main>
    </>
  );
}
