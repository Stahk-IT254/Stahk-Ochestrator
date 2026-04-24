"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, getMe } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { ok, data } = await login(username, password);

    if (ok) {
      try {
        const user = await getMe();
        if (user.role === "admin") {
          router.push("/admin");
        } else if (user.role === "agent_creator") {
          router.push("/creator");
        } else {
          router.push("/dashboard");
        }
      } catch {
        router.push("/dashboard");
      }
    } else {
      setError(data?.detail || "Invalid credentials. Please try again.");
    }
    setLoading(false);
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
          style={{ padding: "44px", width: "100%", maxWidth: "420px" }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
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
              Welcome Back
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
              }}
            >
              Sign in to your Stahk account
            </p>
          </div>

          {error && <div className="error-alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Username</label>
              <input
                id="login-username"
                className="input-field"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                required
                autoComplete="username"
              />
            </div>

            <div style={{ marginBottom: "28px" }}>
              <label className="form-label">Password</label>
              <input
                id="login-password"
                className="input-field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              id="login-submit"
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: "100%", position: "relative" }}
            >
              <span>{loading ? "Signing in..." : "Sign In"}</span>
            </button>
          </form>

          <div className="divider" />

          <p
            style={{
              textAlign: "center",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
            }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              style={{
                color: "var(--accent-blue)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
