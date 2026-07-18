"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts"
import { useSort, seta } from "@/lib/useSort"

// Componente reutilizavel: grafico de barras (top N por receita) + tabela ordenada.
// Usado nas abas marcas, modelos, colecoes da Analise de Vendas.

type Coluna = {
  key: string          // campo no objeto (ex: "marca", "qtd_vendida")
  label: string        // cabecalho
  tipo?: "texto" | "num" | "moeda"
  align?: "left" | "right" | "center"
  bold?: boolean
  cor?: string
  clicavel?: boolean   // celula vira botao (ex: estoque -> abre o detalhe por loja)
}

type Props = {
  lista: any[]
  campoLabel: string        // campo do nome (ex: "marca", "modelo", "colecao")
  campoValor: string        // campo pro grafico (ex: "receita")
  colunas: Coluna[]         // colunas da tabela
  fmtR: (n: number) => string
  tituloGrafico?: string
  corBarra?: string
  onClicar?: (row: any, coluna: Coluna) => void
}

const BRL = (n: number) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const NUM = (n: number) => Number(n || 0).toLocaleString("pt-BR")

export default function AbaComGrafico({ lista, campoLabel, campoValor, colunas, fmtR, tituloGrafico, corBarra = "var(--primary)", onClicar }: Props) {
  // ordena decrescente pelo campo do grafico (maior no topo) -- so pro grafico
  const ordenada = [...lista].sort((a, b) => Number(b[campoValor] || 0) - Number(a[campoValor] || 0))
  // tabela: ordenacao por clique no cabecalho (default: campo do grafico, desc)
  const { sorted, sortKey, sortDir, toggle } = useSort(lista, campoValor, "desc")
  // top 12 pro grafico (senao fica ilegivel); a tabela mostra tudo
  const topGrafico = ordenada.slice(0, 12).map(r => ({
    nome: String(r[campoLabel] || "—"),
    valor: Number(r[campoValor] || 0),
  }))

  const th = { padding: "9px 12px", textAlign: "left" as const, color: "var(--muted)", fontWeight: 600 as const, fontSize: "10px", textTransform: "uppercase" as const, letterSpacing: "0.5px", whiteSpace: "nowrap" as const, borderBottom: "1px solid var(--border)" }
  const td = { padding: "9px 12px", overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const }

  const fmtCel = (row: any, c: Coluna) => {
    const v = row[c.key]
    if (c.tipo === "moeda") return fmtR(Number(v || 0))
    if (c.tipo === "num") return NUM(Number(v || 0))
    return v ?? "—"
  }

  return (
    <div style={{ padding: "20px" }}>
      {/* Grafico de barras horizontais (top 12) */}
      <div style={{ marginBottom: "20px" }}>
        {tituloGrafico && (
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {tituloGrafico}
          </div>
        )}
        <ResponsiveContainer width="100%" height={Math.max(200, topGrafico.length * 32)}>
          <BarChart data={topGrafico} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
            <YAxis type="category" dataKey="nome" tick={{ fill: "var(--text)", fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--text)" }}
              formatter={(v: any) => [BRL(v), "Receita"]} cursor={{ fill: "var(--surface2)" }} />
            <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
              {topGrafico.map((_, i) => (
                <Cell key={i} fill={corBarra} fillOpacity={1 - (i * 0.045)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela ordenada (tudo) */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "var(--surface2)" }}>
              {colunas.map(c => (
                <th key={c.key} onClick={() => toggle(c.key)} title="Clique para ordenar"
                  style={{ ...th, textAlign: c.align || "left", cursor: "pointer", userSelect: "none",
                           color: sortKey === c.key ? "var(--text)" : "var(--muted)" }}>
                  {c.label}{seta(sortKey === c.key, sortDir)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                {colunas.map(c => (
                  <td key={c.key} style={{
                    ...td, textAlign: c.align || "left",
                    fontWeight: c.bold ? 700 : 400,
                    color: c.cor || "var(--text)",
                  }}>
                    {c.clicavel && onClicar ? (
                      <span
                        onClick={() => onClicar(row, c)}
                        title="Ver estoque por loja"
                        style={{
                          cursor: "pointer", textDecoration: "underline",
                          textDecorationStyle: "dotted", textUnderlineOffset: "3px",
                        }}
                      >{fmtCel(row, c)}</span>
                    ) : fmtCel(row, c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
