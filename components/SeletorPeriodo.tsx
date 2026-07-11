"use client"
import { useState, useRef, useEffect } from "react"
import { useFiltros, Periodo } from "@/components/FiltroContext"

// atalhos rapidos -> valor de "dias"
const ATALHOS: { label: string; dias: number }[] = [
  { label: "Hoje", dias: 1 },
  { label: "7 dias", dias: 7 },
  { label: "30 dias", dias: 30 },
  { label: "90 dias", dias: 90 },
]

function inicioDoMes(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
function hojeStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function SeletorPeriodo() {
  const { periodo, setPeriodo, dispararBusca } = useFiltros()
  const [aberto, setAberto] = useState(false)
  const [ini, setIni] = useState(periodo.inicio || "")
  const [fim, setFim] = useState(periodo.fim || "")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    if (aberto) document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [aberto])

  function aplicarAtalho(dias: number) {
    setPeriodo({ tipo: "dias", dias, inicio: "", fim: "" })
    dispararBusca()
    setAberto(false)
  }

  function aplicarMes() {
    setPeriodo({ tipo: "custom", dias: 30, inicio: inicioDoMes(), fim: hojeStr() })
    dispararBusca()
    setAberto(false)
  }

  function aplicarCustom() {
    if (!ini || !fim) return
    setPeriodo({ tipo: "custom", dias: 30, inicio: ini, fim: fim })
    dispararBusca()
    setAberto(false)
  }

  // rotulo do botao
  const rotulo = periodo.tipo === "custom" && periodo.inicio && periodo.fim
    ? `${periodo.inicio.split("-").reverse().join("/")} — ${periodo.fim.split("-").reverse().join("/")}`
    : (ATALHOS.find(a => a.dias === periodo.dias)?.label || `${periodo.dias} dias`)

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }} data-no-export>
      <button
        onClick={() => setAberto(a => !a)}
        style={{
          padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--border)",
          background: "var(--surface)", color: "var(--text)", fontSize: "13px",
          fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          whiteSpace: "nowrap",
        }}
      >
        📅 {rotulo}
      </button>

      {aberto && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, width: "280px",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "12px", boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
          padding: "14px", zIndex: 9999,
        }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
            Atalhos
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
            {ATALHOS.map(a => {
              const ativo = periodo.tipo === "dias" && periodo.dias === a.dias
              return (
                <button key={a.dias} onClick={() => aplicarAtalho(a.dias)} style={{
                  padding: "6px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer",
                  border: "1px solid", fontWeight: ativo ? 700 : 500,
                  background: ativo ? "var(--primary)" : "var(--surface2)",
                  color: ativo ? "#fff" : "var(--text)",
                  borderColor: ativo ? "var(--primary)" : "var(--border)",
                }}>{a.label}</button>
              )
            })}
            <button onClick={aplicarMes} style={{
              padding: "6px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer",
              border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)",
            }}>Este mês</button>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />

          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
            Intervalo personalizado
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "11px", color: "var(--muted)" }}>
              De:
              <input type="date" value={ini} max={fim || hojeStr()} onChange={e => setIni(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "6px",
                  border: "1px solid var(--border)", background: "var(--surface2)",
                  color: "var(--text)", fontSize: "13px", marginTop: "3px" }} />
            </label>
            <label style={{ fontSize: "11px", color: "var(--muted)" }}>
              Até:
              <input type="date" value={fim} min={ini} max={hojeStr()} onChange={e => setFim(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "6px",
                  border: "1px solid var(--border)", background: "var(--surface2)",
                  color: "var(--text)", fontSize: "13px", marginTop: "3px" }} />
            </label>
            <button onClick={aplicarCustom} disabled={!ini || !fim} style={{
              padding: "8px", borderRadius: "8px", border: "none",
              background: (!ini || !fim) ? "var(--muted)" : "var(--primary)",
              color: "#fff", fontSize: "13px", fontWeight: 700,
              cursor: (!ini || !fim) ? "default" : "pointer", marginTop: "4px",
            }}>Aplicar intervalo</button>
          </div>
        </div>
      )}
    </div>
  )
}
