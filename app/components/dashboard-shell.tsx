"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const navigation = [
  { name: "Overview", href: "/", icon: "▦" },
  { name: "Health Assessment", href: "/assessment", icon: "＋" },
  { name: "3D Body Explorer", href: "/explorer", icon: "◎" },
  { name: "Health Trends", href: "/trends", icon: "⌁" },
  { name: "Health Guidance", href: "/guidance", icon: "✧" },
  { name: "Mission Tasks", href: "/tasks", icon: "☷" },
  { name: "Settings", href: "/settings", icon: "⚙" },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [missionTime, setMissionTime] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [themeStorageWarning, setThemeStorageWarning] = useState("");

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem("astro-code-blue-theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
    } catch {
      setThemeStorageWarning("Theme preference could not be loaded from this browser.");
    }

    const updateTime = () => {
      setMissionTime(
        new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date()),
      );
    };

    updateTime();
    const intervalId = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    setThemeStorageWarning("");
    try {
      window.localStorage.setItem("astro-code-blue-theme", nextTheme);
    } catch {
      setThemeStorageWarning("Theme changed, but the preference could not be saved in this browser.");
    }
  }

  return (
    <div className="dashboard" data-theme={theme}>
      <aside className="sidebar">
        <div className="brand">
          <div>
            <h2>ASTRO CODE</h2>
            <p>BLUE</p>
          </div>
        </div>

        <nav className="navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-link${pathname === item.href ? " active" : ""}`}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <p>MISSION CONTROL v1.0</p>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <Link className="topbar-brand" href="/" aria-label="ASTRO CODE BLUE home">
            <span>ASTRO CODE</span> <strong>BLUE</strong>
          </Link>
          <div className="topbar-meta">
            <div className="topbar-time">
              <span>MISSION DATE / TIME</span>
              <strong>{missionTime || "LOCAL TIME"}</strong>
            </div>
            <div className="topbar-astronaut-id">
              <span>ASTRONAUT ID</span>
              <strong>ACB-014</strong>
            </div>
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              aria-pressed={theme === "light"}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <span aria-hidden="true">{theme === "dark" ? "☼" : "☾"}</span>
              <span className="theme-toggle-label">{theme === "dark" ? "LIGHT" : "DARK"}</span>
            </button>
          </div>
          {themeStorageWarning && (
            <span className="visually-hidden" role="status">{themeStorageWarning}</span>
          )}
        </header>
        {children}
      </section>
    </div>
  );
}
