"use client"
import { useState, useMemo } from "react"

type Props = {
  label: string
  opcoes: string[]
  selecionados: string[]
  onChange: (selecionados: string[]) => void
  maxVisible?: number
}

export default function ChipSelect({ label, opcoes, selecionados, onChange, maxVisible = 8 }: Props) {
  const [busca, setBusca] = useState("")
  const [expandido, setExpandido] = useState(false)
  const temFiltro = selecionados.length > 0

  const opcoesFiltradas = useMemo(() =>
    busca ? opcoes.filter(o => o.toLowerCase().includes(busca.toLowerCase())) : opcoes
  , [opcoes, busca])

  const visiveis = expandido ? opcoesFiltradas : opcoesFiltradas.slice(0, maxVisible)

  function toggle(op: string) {
    if (selecionados.includes(op)) {
      onChange(selecionados.filter(s => s !== op))
    } else {
      onChange([...selecionados, op])
    }
  }

  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>
          {label}
        </span>
        {temFiltro && (
          <>
            <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 500 }}>
              {selecionados.length} selecionado{selecionados.length > 1 ? "s" : ""}
            </span>
            <button onClick={() => onChange([])} style={{ fontSize: "11px", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              ✕ limpar
            </button>
          </>
        )}
        {opcoes.length > maxVisible && (
          <input
            placeholder={`Buscar ${label.toLowerCase()}...`}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{
              padding: "3px 8px", borderRadius: "6px", fontSize: "12px",
              border: "1px solid var(--border)", background: "var(--surface2)",
              color: "var(--text)", outline: "none", width: "160px",
            }}
          />
        )}
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {visiveis.map(op => {
          const sel = selecionados.includes(op)
          const dimmed = temFiltro && !sel
          return (
            <button key={op} onClick={() => toggle(op)} style={{
              padding: "4px 10px", borderRadius: "20px", fontSize: "12px",
              cursor: "pointer", fontWeight: sel ? 600 : 400,
              border: "1px solid",
              background: sel ? "var(--primary)" : "var(--surface2)",
              color: sel ? "#fff" : dimmed ? "var(--muted)" : "var(--text)",
              borderColor: sel ? "var(--primary)" : "var(--border)",
              transition: "all 0.1s",
              opacity: dimmed ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}>
              {op}
            </button>
          )
        })}

        {opcoesFiltradas.length > maxVisible && (
          <button onClick={() => setExpandido(!expandido)} style={{
            padding: "4px 10px", borderRadius: "20px", fontSize: "12px",
            cursor: "pointer", border: "1px dashed var(--border)",
            background: "none", color: "var(--muted)", whiteSpace: "nowrap",
          }}>
            {expandido ? "▲ menos" : `+${opcoesFiltradas.length - maxVisible} mais`}
          </button>
        )}

        {opcoesFiltradas.length === 0 && busca && (
          <span style={{ fontSize: "12px", color: "var(--muted)", padding: "4px 0" }}>
            Nenhum resultado para "{busca}"
          </span>
        )}
      </div>
    </div>
  )
}