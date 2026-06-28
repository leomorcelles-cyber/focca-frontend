"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "@/components/ThemeProvider"
import { useState } from "react"

const nav = [
  { href: "/",               label: "Visao Geral",      icon: "◈" },
  { href: "/compras",        label: "Compras",          icon: "↓" },
  { href: "/transferencias", label: "Transferencias",   icon: "⇄" },
  { href: "/analise",        label: "Analise de Vendas",icon: "↗" },
  { href: "/margem",         label: "Margem",           icon: "%" },
  { href: "/relatorio",      label: "Relatorio",        icon: "▤" },
]

export default function Sidebar() {
  const path = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside style={{ width: collapsed ? "60px" : "220px", minHeight: "100vh", background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", transition: "width 0.2s", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
      <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--primary)", letterSpacing: "-0.3px" }}>FOCCA</div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>Sistema de Estoque</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "16px", padding: "4px", flexShrink: 0 }}>
          {collapsed ? ">" : "<"}
        </button>
      </div>
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
        {nav.map(item => {
          const ativo = path === item.href
          return (
            <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: collapsed ? "10px" : "10px 12px", borderRadius: "8px", textDecoration: "none", background: ativo ? "var(--primary-light)" : "transparent", color: ativo ? "var(--primary)" : "var(--muted)", fontWeight: ativo ? 600 : 400, fontSize: "13px", transition: "all 0.1s", justifyContent: collapsed ? "center" : "flex-start" }}>
              <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
      <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
        <button onClick={() => toggleTheme()} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: collapsed ? "10px" : "10px 12px", borderRadius: "8px", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "13px", justifyContent: collapsed ? "center" : "flex-start" }}>
          <span style={{ fontSize: "16px" }}>{theme === "light" ? "🌙" : "☀️"}</span>
          {!collapsed && <span>{theme === "light" ? "Modo escuro" : "Modo claro"}</span>}
        </button>
      </div>
    </aside>
  )
}
