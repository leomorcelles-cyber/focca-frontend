"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

export default function GraficoMarcas({ marcas }: { marcas: any[] }) {
  const dados = marcas.map(m => ({
    marca: m.marca.length > 14 ? m.marca.slice(0, 14) + "…" : m.marca,
    valor: Number(m.valor_estoque_total),
    margem: Number(m.margem_media_pct),
  }))

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "20px",
    }}>
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>
          Valor em Estoque por Marca — Top 10
        </h2>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dados} margin={{ top: 0, right: 0, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="marca"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            angle={-35}
            textAnchor="end"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "13px",
              color: "var(--text)",
            }}
            formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "Valor em estoque"]}
          />
          <Bar dataKey="valor" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}