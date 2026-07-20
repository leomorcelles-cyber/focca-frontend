"use client"
import React, { CSSProperties } from "react"
import { useSort, seta } from "@/lib/useSort"

// Tabela <table> com cabecalho clicavel (ordenacao estilo Looker Studio).
// Usada nas listas simples (Analise produtos/lojas, Visao Geral, Relatorio).
// Para grades virtualizadas (Transferencias, Margem) usa-se o hook useSort direto.

export type ColunaOrd = {
  key: string                          // campo do objeto usado como id da coluna
  label: string                        // texto do cabecalho
  align?: "left" | "right" | "center"
  render?: (row: any, i: number) => React.ReactNode   // conteudo custom da celula
  sortBy?: (row: any) => any           // valor usado na ordenacao (default: row[key])
  tdStyle?: CSSProperties
}

type Props = {
  colunas: ColunaOrd[]
  linhas: any[]
  initialKey?: string | null
  initialDir?: "asc" | "desc"
  zebra?: boolean
  thStyle?: CSSProperties
  tdStyle?: CSSProperties
}

const TH: CSSProperties = {
  padding: "9px 12px", textAlign: "left", color: "var(--muted)", fontWeight: 600,
  fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px",
  whiteSpace: "nowrap", userSelect: "none", cursor: "pointer",
}
const TD: CSSProperties = { padding: "9px 12px", whiteSpace: "nowrap" }

function TabelaOrdenavel({
  colunas, linhas, initialKey = null, initialDir = "desc", zebra = true, thStyle, tdStyle,
}: Props) {
  const accessors = React.useMemo(() => {
    const a: Record<string, (r: any) => any> = {}
    colunas.forEach(c => { if (c.sortBy) a[c.key] = c.sortBy })
    return a
  }, [colunas])

  const { sorted, sortKey, sortDir, toggle } = useSort(linhas, initialKey, initialDir, accessors)

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "var(--surface2)", borderBottom: "2px solid var(--border)" }}>
            {colunas.map(c => (
              <th key={c.key}
                onClick={() => toggle(c.key)}
                title="Clique para ordenar"
                style={{ ...TH, textAlign: c.align || "left", ...thStyle,
                         color: sortKey === c.key ? "var(--text)" : "var(--muted)" }}>
                {c.label}{seta(sortKey === c.key, sortDir)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} style={{
              borderBottom: "1px solid var(--border)",
              background: zebra && i % 2 ? "color-mix(in srgb, var(--surface2) 45%, transparent)" : "transparent",
            }}>
              {colunas.map(c => (
                <td key={c.key} style={{ ...TD, textAlign: c.align || "left", ...tdStyle, ...c.tdStyle }}>
                  {c.render ? c.render(row, i) : (row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// memo: evita re-renderizar a tabela inteira quando a pagina re-renderiza por
// causa de filtros — so re-renderiza se linhas/colunas mudarem de fato.
export default React.memo(TabelaOrdenavel)
