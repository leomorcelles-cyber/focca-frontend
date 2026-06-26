"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "@/components/ThemeProvider"
import { useState } from "react"

const nav = [
  { href: "/",               label: "Visão Geral",       icon: "◈" },
  { href: "/estoque",        label: "Estoque por Loja",  icon: "⊞" },
  { href: "/compras",        label: "Compras",           icon: "↓" },
  { href: "/transferencias", label: "Transferências",    icon: "⇄" },
  { href: "/analise",        label: "Análise de Vendas", icon: "↗" },
  { href: "/margem",         label: "Margem",            icon: "%" },
]

export default function Sidebar() {
  const path = usePathname()
  const { theme, setTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside style={{
      width: collapsed ? "60px" : "220px",
      minHeight: "100vh",
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      transition: "width 0.2s",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      height: "100vh",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "20px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
      }}>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--primary)", letterSpacing: "-0.3px" }}>
              FOCCA
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>Sistema de Estoque</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted)", fontSize: "16px", padding: "4px",
            flexShrink: 0,
          }}
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
        {nav.map(item => {
          const active = path === item.href
          return (
            <Link key={item.href} href={item.href}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 10px",
                borderRadius: "8px",
                background: active ? "var(--primary-light)" : "transparent",
                color: active ? "var(--primary)" : "var(--muted)",
                fontWeight: active ? 500 : 400,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.1s",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.background = "var(--surface2)"
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.background = "transparent"
              }}
              >
                <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>{theme === "light" ? "🌙" : "☀️"}</span>
          {!collapsed && <span>{theme === "light" ? "Modo escuro" : "Modo claro"}</span>}
        </button>
      </div>
    </aside>
  )
}