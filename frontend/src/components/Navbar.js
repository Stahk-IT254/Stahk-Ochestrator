"use client";

import Link from "next/link";
import { isAuthenticated, clearTokens, getMe, getNotifications, markNotificationRead } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState(null);
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        setAuthed(true);
        try {
          const user = await getMe();
          setRole(user.role);
          
          // Poll notifications every 10 seconds
          const fetchNotifs = async () => {
            const data = await getNotifications();
            setNotifications(data);
          };
          fetchNotifs();
          const interval = setInterval(fetchNotifs, 10000);
          return () => clearInterval(interval);
        } catch {
          // ignore
        }
      }
    };
    checkAuth();

    // Click outside to close notifs
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReadNotification = async (id) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleLogout = () => {
    clearTokens();
    setAuthed(false);
    setRole(null);
    router.push("/login");
  };

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 32px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-glass)",
        backdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <Link
        href="/"
        style={{
          fontSize: "1.25rem",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          textDecoration: "none",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            background:
              "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ⬡ STAHK
        </span>
        <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>
          Orchestrator
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {authed ? (
          <>
            {role === "agent_creator" ? (
              <>
                <Link
                  href="/creator"
                  style={{
                    color: "var(--accent-purple)",
                    textDecoration: "none",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  🤖 Workshop
                </Link>
                <Link
                  href="/marketplace"
                  style={{
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                  }}
                >
                  Marketplace
                </Link>
              </>
            ) : role === "admin" ? (
              <Link
                href="/admin"
                style={{
                  color: "var(--accent-red)",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                🛡️ Admin Center
              </Link>
            ) : (
              <Link
                href="/dashboard"
                style={{
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                }}
              >
                Dashboard
              </Link>
            )}

            {/* Notification Bell */}
            <div ref={notifRef} style={{ position: "relative", marginLeft: "8px", marginRight: "8px" }}>
              <button 
                onClick={() => setShowNotifs(!showNotifs)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", position: "relative" }}
              >
                🔔
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span style={{ position: "absolute", top: -2, right: -4, background: "var(--accent-red)", color: "white", fontSize: "0.5rem", fontWeight: "bold", padding: "2px 5px", borderRadius: "10px" }}>
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>
              
              {showNotifs && (
                <div className="glass-card-static" style={{ position: "absolute", top: "100%", right: 0, width: 300, marginTop: 12, padding: 0, overflow: "hidden", zIndex: 100 }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 700, fontSize: "0.85rem" }}>Notifications</div>
                  <div style={{ maxHeight: 300, overflowY: "auto" }}>
                    {notifications.filter(n => !n.is_read).length === 0 ? (
                      <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>No new notifications</div>
                    ) : (
                      notifications.filter(n => !n.is_read).map(n => (
                        <div key={n.id} onClick={() => handleReadNotification(n.id)} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer", background: "rgba(59,130,246,0.05)" }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>{n.title}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="btn-secondary"
              style={{ padding: "8px 20px", fontSize: "0.85rem" }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              Login
            </Link>
            <Link href="/register">
              <button
                className="btn-primary"
                style={{ padding: "8px 20px", fontSize: "0.85rem" }}
              >
                <span>Get Started</span>
              </button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
