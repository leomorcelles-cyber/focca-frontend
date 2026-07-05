"use client"
// Botoes de exportacao flutuantes (canto inferior direito).
// PDF: print client-side da area de conteudo (so o conteudo, sem filtro global).
// CSV/Excel: delegados a um callback que a pagina fornece (dados prontos -> backend).
import { useState } from "react"
import { exportarPDF } from "@/lib/exportPdf"

type Props = {
  /** id do elemento a fotografar no PDF */
  areaId: string
  /** titulo base do arquivo */
  titulo: string
  /** callback opcional para CSV/Excel (recebe o formato). Se ausente, botao nao aparece. */
  onExportarDados?: (formato: "csv" | "xlsx") => void | Promise<void>
}

export default function BotoesExport({ areaId, titulo, onExportarDados }: Props) {
  const [ocupado, setOcupado] = useState<string | null>(null)

  async function pdf() {
    setOcupado("pdf")
    try { await exportarPDF(areaId, titulo) }
    finally { setOcupado(null) }
  }

  async function dados(fmt: "csv" | "xlsx") {
    if (!onExportarDados) return
    setOcupado(fmt)
    try { await onExportarDados(fmt) }
    finally { setOcupado(null) }
  }

  const btn = {
    padding: "8px 14px", borderRadius: "10px", border: "1px solid var(--border)",
    background: "var(--surface)", color: "var(--text)", cursor: "pointer",
    fontSize: "12px", fontWeight: 600 as const, boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    whiteSpace: "nowrap" as const,
  }

  return (
    <div style={{
      position: "fixed", bottom: "20px", right: "20px", zIndex: 50,
      display: "flex", gap: "8px", flexDirection: "column", alignItems: "flex-end",
    }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={pdf} disabled={ocupado !== null} style={btn}
          title="Exportar visao atual como PDF">
          {ocupado === "pdf" ? "Gerando..." : "PDF"}
        </button>
        {onExportarDados && (
          <>
            <button onClick={() => dados("xlsx")} disabled={ocupado !== null} style={btn}
              title="Exportar dados em Excel">
              {ocupado === "xlsx" ? "..." : "Excel"}
            </button>
            <button onClick={() => dados("csv")} disabled={ocupado !== null} style={btn}
              title="Exportar dados em CSV">
              {ocupado === "csv" ? "..." : "CSV"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
