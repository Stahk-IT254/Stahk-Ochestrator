"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function RegisterPage() {
  const [step, setStep] = useState(1); // Step 1: Role, Step 2: Identity, Step 3: Details
  const [role, setRole] = useState("user");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const totalSteps = 3;

  const nextStep = () => {
    setError("");
    if (step === 2) {
      if (!username.trim() || !email.trim()) {
        setError("Username and email are required.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { ok, data } = await register(username, email, password, role, {
      full_name: fullName,
      phone_number: phone,
      country,
    });
    setLoading(false);

    if (ok) {
      if (data.user?.role === "agent_creator") {
        router.push("/creator");
      } else {
        router.push("/dashboard");
      }
    } else {
      const errMsg =
        data?.username?.[0] ||
        data?.email?.[0] ||
        data?.password?.[0] ||
        data?.detail ||
        "Registration failed. Please try again.";
      setError(errMsg);
    }
  };

  return (
    <>
      <Navbar />
      <main
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 65px)",
          padding: "40px 24px",
        }}
      >
        <div
          className="glass-card-static animate-fade-in-up"
          style={{ padding: "44px", width: "100%", maxWidth: "520px" }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "var(--radius-lg)",
                background:
                  "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "1.5rem",
              }}
            >
              ⬡
            </div>
            <h1
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                marginBottom: "6px",
              }}
            >
              Join Stahk Orchestrator
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
              }}
            >
              {step === 1 && "Choose how you want to participate"}
              {step === 2 && "Create your account"}
              {step === 3 && "Tell us a bit more about you"}
            </p>
          </div>

          {/* Progress */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              marginBottom: "28px",
            }}
          >
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: "3px",
                  borderRadius: "var(--radius-full)",
                  background:
                    s <= step
                      ? role === "agent_creator"
                        ? "var(--accent-purple)"
                        : "var(--accent-blue)"
                      : "var(--border-subtle)",
                  transition: "background 0.3s ease",
                }}
              />
            ))}
          </div>

          {error && <div className="error-alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* STEP 1: Role Selection */}
            {step === 1 && (
              <div className="animate-fade-in-up">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginBottom: "28px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setRole("user")}
                    className={`role-card ${
                      role === "user" ? "active-user" : role === "agent_creator" ? "dimmed" : ""
                    }`}
                  >
                    <div className="role-check">✓</div>
                    <div
                      style={{ fontSize: "2.2rem", marginBottom: "12px" }}
                    >
                      🎯
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color:
                          role === "user"
                            ? "var(--accent-blue)"
                            : "var(--text-primary)",
                        marginBottom: "6px",
                      }}
                    >
                      I Have Goals
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      Submit goals. Jarvis finds the best agents and
                      orchestrates execution.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("agent_creator")}
                    className={`role-card ${
                      role === "agent_creator" ? "active-creator" : role === "user" ? "dimmed" : ""
                    }`}
                  >
                    <div className="role-check">✓</div>
                    <div
                      style={{ fontSize: "2.2rem", marginBottom: "12px" }}
                    >
                      🤖
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color:
                          role === "agent_creator"
                            ? "var(--accent-purple)"
                            : "var(--text-primary)",
                        marginBottom: "6px",
                      }}
                    >
                      I Build Agents
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      Create AI agents, set pricing, and earn per completed
                      task.
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={nextStep}
                  style={{
                    width: "100%",
                    background:
                      role === "agent_creator"
                        ? "linear-gradient(135deg, var(--accent-purple), #7c3aed)"
                        : undefined,
                  }}
                >
                  <span>Continue →</span>
                </button>
              </div>
            )}

            {/* STEP 2: Account Credentials */}
            {step === 2 && (
              <div className="animate-fade-in-up">
                <div style={{ marginBottom: "16px" }}>
                  <label className="form-label">Username</label>
                  <input
                    id="register-username"
                    className="input-field"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                    autoComplete="username"
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label className="form-label">Email</label>
                  <input
                    id="register-email"
                    className="input-field"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginBottom: "28px",
                  }}
                >
                  <div>
                    <label className="form-label">Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        id="register-password"
                        className="input-field"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        required
                        autoComplete="new-password"
                        style={{ paddingRight: "44px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute", right: "12px", top: "50%",
                          transform: "translateY(-50%)", background: "none",
                          border: "none", cursor: "pointer", fontSize: "1rem",
                          color: "var(--text-muted)", padding: "4px",
                          transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) => e.target.style.color = "var(--text-primary)"}
                        onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}
                        tabIndex={-1}
                      >
                        {showPassword ? "🙈" : "👁"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Confirm</label>
                    <div style={{ position: "relative" }}>
                      <input
                        id="register-confirm"
                        className="input-field"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat"
                        required
                        autoComplete="new-password"
                        style={{ paddingRight: "44px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        style={{
                          position: "absolute", right: "12px", top: "50%",
                          transform: "translateY(-50%)", background: "none",
                          border: "none", cursor: "pointer", fontSize: "1rem",
                          color: "var(--text-muted)", padding: "4px",
                          transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) => e.target.style.color = "var(--text-primary)"}
                        onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}
                        tabIndex={-1}
                      >
                        {showConfirm ? "🙈" : "👁"}
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={prevStep}
                    style={{ flex: 1 }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={nextStep}
                    style={{
                      flex: 2,
                      background:
                        role === "agent_creator"
                          ? "linear-gradient(135deg, var(--accent-purple), #7c3aed)"
                          : undefined,
                    }}
                  >
                    <span>Continue →</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Personal Details */}
            {step === 3 && (
              <div className="animate-fade-in-up">
                <div style={{ marginBottom: "16px" }}>
                  <label className="form-label">Full Name</label>
                  <input
                    id="register-fullname"
                    className="input-field"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <label className="form-label">
                      Phone{" "}
                      <span
                        style={{
                          fontWeight: 400,
                          textTransform: "none",
                          color: "var(--text-muted)",
                          fontSize: "0.7rem",
                        }}
                      >
                        (WhatsApp delivery)
                      </span>
                    </label>
                    <input
                      id="register-phone"
                      className="input-field"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+254 7XX XXX XXX"
                      autoComplete="tel"
                    />
                  </div>
                  <div>
                    <label className="form-label">Country</label>
                    <input
                      id="register-country"
                      className="input-field"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. Kenya"
                      autoComplete="country-name"
                    />
                  </div>
                </div>

                {/* Context info */}
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: "var(--radius)",
                    background:
                      role === "agent_creator"
                        ? "rgba(139, 92, 246, 0.06)"
                        : "rgba(59, 130, 246, 0.06)",
                    border: `1px solid ${
                      role === "agent_creator"
                        ? "rgba(139, 92, 246, 0.15)"
                        : "rgba(59, 130, 246, 0.15)"
                    }`,
                    marginBottom: "24px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color:
                        role === "agent_creator"
                          ? "var(--accent-purple)"
                          : "var(--accent-blue)",
                      lineHeight: 1.5,
                    }}
                  >
                    {role === "agent_creator"
                      ? "🤖 After registration, you'll access the Workshop to submit your agents. Agents go through a vetting process before going live."
                      : "🧠 After registration, you'll meet Jarvis — your AI orchestrator. Tell Jarvis your goal and it handles everything."}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={prevStep}
                    style={{ flex: 1 }}
                  >
                    ← Back
                  </button>
                  <button
                    id="register-submit"
                    className="btn-primary"
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 2,
                      background:
                        role === "agent_creator"
                          ? "linear-gradient(135deg, var(--accent-purple), #7c3aed)"
                          : undefined,
                    }}
                  >
                    <span>
                      {loading
                        ? "Creating account..."
                        : role === "agent_creator"
                        ? "Join as Creator"
                        : "Create Account"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="divider" />

          <p
            style={{
              textAlign: "center",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              style={{
                color: "var(--accent-blue)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
