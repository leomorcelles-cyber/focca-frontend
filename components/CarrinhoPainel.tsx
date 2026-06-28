"use client"
import { useState } from "react"
import { useSelecao, chaveItem } from "@/components/SelecaoContext"
import { useRouter } from "next/navigation"

const LOJAS_NOMES: Record<string, string> = {
  "1": "P.Nereu", "3": "Vidal", "4": "Imbuiá", "5": "Lontras", "6": "Chapadão", "7": "Hype",
}

export default function CarrinhoPainel() {
  const { itens, remover, limpar, total } = useSelecao()
  const [aberto, setAberto] = useState(false)
  const router = useRouter()

  if (total === 0) return null

  return (
    <>
      {/* Botao flutuante com contador */}
      <button onClick={() => setAberto(!aberto)} style={{
        position: "fixed", bottom: "24px", right: "24px", zIndex: 900,
        background: "var(--primary)", color: "#fff", border: "none", borderRadius: "30px",
        padding: "12px 20px", cursor: "pointer", fontSize: "14px", fontWeight: 700,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: "8px",
      }}>
        🛒 {total} {total === 1 ? "item" : "itens"} selecionado{total === 1 ? "" : "s"}
      </button>

      {/* Painel lateral */}
      {aberto && (
        <>
          <div onClick={() => setAberto(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 950 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(420px, 92vw)", zIndex: 960,
            background: "var(--surface)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface2)" }}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>Seleção para análise</div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>{total} {total === 1 ? "item" : "itens"}</div>
              </div>
              <button onClick={() => setAberto(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              {itens.map(it => {
                const k = chaveItem(it)
                const lojas = it.lojas || {}
                return (
                  <div key={k} style={{ background: "var(--surface2)", borderRadius: "8px", padding: "10px 12px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.produto}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>{it.cor} · Tam {it.tamanho} {it.marca ? `· ${it.marca}` : ""}</div>
                      </div>
                      <button onClick={() => remover(k)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "14px", flexShrink: 0 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                      {Object.entries(lojas).filter(([, v]) => v > 0).map(([lj, v]) => (
                        <span key={lj} style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                          {LOJAS_NOMES[lj] || lj}: <b>{v}</b>
                        </span>
                      ))}
                      {Object.values(lojas).every(v => v === 0) && <span style={{ fontSize: "10px", color: "var(--danger)" }}>Zerado em todas as lojas</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px" }}>
              <button onClick={limpar} style={{ padding: "10px 14px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "13px" }}>Limpar</button>
              <button onClick={() => { setAberto(false); router.push("/relatorio") }} style={{ flex: 1, padding: "10px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
                Ver relatório →
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
