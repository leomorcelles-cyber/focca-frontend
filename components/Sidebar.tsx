"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "@/components/ThemeProvider"
import { useSelecao } from "@/components/SelecaoContext"
import { useState } from "react"

const nav = [
  { href: "/",               label: "Visao Geral",      icon: "◈" },
  { href: "/compras",        label: "Compras",          icon: "↓" },
  { href: "/transferencias", label: "Transferencias",   icon: "⇄" },
  { href: "/relatorio",      label: "Relatorio",        icon: "▤" },
  { href: "/chat",           label: "Chat IA",          icon: "✦" },
]

export default function Sidebar() {
  const path = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { total, setPainelAberto, limpar } = useSelecao()
  const [collapsed, setCollapsed] = useState(false)
  const emFoco = total > 0

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
      {/* CONTADOR DA SELECAO — em todas as telas.
          O carrinho decide o modo do Relatorio (vazio = panorama, cheio = foco nos
          SKUs exatos). Antes esse estado so' aparecia como um botao flutuante que
          sumia quando vazio: um item esquecido recortava o relatorio em silencio.
          Aqui ele diz sempre em qual modo se esta'. */}
      <div style={{ padding: "10px 8px", borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => emFoco && setPainelAberto(true)}
          title={emFoco ? `Foco: ${total} SKU${total === 1 ? "" : "s"} selecionado${total === 1 ? "" : "s"} — clique para ver` : "Panorama: nada selecionado, as telas mostram o recorte inteiro"}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "10px",
            padding: collapsed ? "10px" : "10px 12px", borderRadius: "8px",
            background: emFoco ? "var(--primary-light)" : "transparent",
            border: `1px solid ${emFoco ? "var(--primary)" : "var(--border)"}`,
            cursor: emFoco ? "pointer" : "default", textAlign: "left",
            justifyContent: collapsed ? "center" : "flex-start",
          }}>
          <span style={{ fontSize: "15px", flexShrink: 0, position: "relative", opacity: emFoco ? 1 : 0.5 }}>
            🛒
            {collapsed && emFoco && (
              <span style={{ position: "absolute", top: "-6px", right: "-9px", background: "var(--primary)", color: "#fff", fontSize: "9px", fontWeight: 700, borderRadius: "10px", padding: "1px 4px", lineHeight: 1.4 }}>{total}</span>
            )}
          </span>
          {!collapsed && (
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: "block", fontSize: "12px", fontWeight: 600, color: emFoco ? "var(--primary)" : "var(--muted)" }}>
                {emFoco ? `Foco · ${total} SKU${total === 1 ? "" : "s"}` : "Panorama"}
              </span>
              <span style={{ display: "block", fontSize: "10px", color: "var(--muted)", lineHeight: 1.3, whiteSpace: "normal" }}>
                {emFoco ? "o Relatório recorta nestes itens" : "nada selecionado — recorte inteiro"}
              </span>
            </span>
          )}
        </button>
        {!collapsed && emFoco && (
          <button onClick={limpar} style={{ width: "100%", marginTop: "4px", padding: "5px", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "11px", textDecoration: "underline", textUnderlineOffset: "2px" }}>
            Esvaziar seleção
          </button>
        )}
      </div>

      <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
        <button onClick={() => toggleTheme()} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: collapsed ? "10px" : "10px 12px", borderRadius: "8px", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "13px", justifyContent: collapsed ? "center" : "flex-start" }}>
          <span style={{ fontSize: "16px" }}>{theme === "light" ? "🌙" : "☀️"}</span>
          {!collapsed && <span>{theme === "light" ? "Modo escuro" : "Modo claro"}</span>}
        </button>
      </div>
    </aside>
  )
}
