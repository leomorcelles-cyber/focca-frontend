"use client"
// Menu de exportacao compacto: um unico botao "Exportar" que abre um dropdown
// com PDF (print client-side), Excel e CSV (dados via callback da pagina).
import { useState, useRef, useEffect } from "react"
import { exportarPDF } from "@/lib/exportPdf"

type Props = {
  areaId: string
  titulo: string
  onExportarDados?: (formato: "csv" | "xlsx") => void | Promise<void>
}

export default function BotoesExport({ areaId, titulo, onExportarDados }: Props) {
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // fecha ao clicar fora
  useEffect(() => {
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", fora)
    return () => document.removeEventListener("mousedown", fora)
  }, [])

  async function acao(fn: () => void | Promise<void>, tag: string) {
    setOcupado(tag)
    try { await fn() } finally { setOcupado(null); setAberto(false) }
  }

  const item = {
    display: "flex", alignItems: "center", gap: "8px", width: "100%",
    padding: "9px 14px", background: "none", border: "none", cursor: "pointer",
    fontSize: "13px", color: "var(--text)", textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
  }

  return (
    <div ref={ref} className="no-print" style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setAberto(a => !a)}
        style={{
          padding: "8px 14px", background: "var(--surface)", color: "var(--text)",
          border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer",
          fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px",
        }}
      >
        ⬇ Exportar ▾
      </button>

      {aberto && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 100,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "10px", boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
          overflow: "hidden", minWidth: "170px",
        }}>
          <button style={item} disabled={ocupado !== null}
            onClick={() => acao(() => exportarPDF(areaId, titulo), "pdf")}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
            {ocupado === "pdf" ? "⏳ Gerando PDF..." : "📄 PDF (visual da tela)"}
          </button>

          {onExportarDados && (
            <>
              <button style={item} disabled={ocupado !== null}
                onClick={() => acao(() => onExportarDados("xlsx"), "xlsx")}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                {ocupado === "xlsx" ? "⏳ Gerando Excel..." : "📊 Excel (dados)"}
              </button>
              <button style={item} disabled={ocupado !== null}
                onClick={() => acao(() => onExportarDados("csv"), "csv")}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                {ocupado === "csv" ? "⏳ Gerando CSV..." : "📁 CSV (dados)"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
