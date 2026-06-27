"use client"
import { useEffect, useState } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export default function Home() {
  const [kpis,   setKpis]   = useState<any>({})
  const [marcas, setMarcas] = useState<any[]>([])
  const [lojas,  setLojas]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/kpis`).then(r => r.json()),
      fetch(`${API_URL}/marcas`).then(r => r.json()),
      fetch(`${API_URL}/kpis/lojas`).then(r => r.json()),
    ]).then(([k, m, l]) => { setKpis(k); setMarcas(m); setLojas(l); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const fmt  = (n: number) => n?.toLocaleString("pt-BR") ?? "0"
  const fmtR = (n: number) => `R$ ${n?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) ?? "0,00"}`

  if (loading) return (
    <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)" }}>
      <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>Carregando...
    </div>
  )

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Visao Geral</h1>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>Consolidado de todas as lojas</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: "10px", marginBottom: "24px" }}>
        {[
          { l: "Valor em Estoque", v: fmtR(kpis.valor_total_estoque), c: "var(--primary)" },
          { l: "Pecas",            v: fmt(kpis.pecas_em_estoque),      c: "var(--success)" },
          { l: "Margem Media",     v: `${kpis.margem_media_pct}%`,     c: "var(--warning)" },
          { l: "Em Atencao",       v: fmt(kpis.total_criticos),         c: "var(--orange)" },
          { l: "SKUs OK",          v: fmt(kpis.total_ok),               c: "var(--success)" },
          { l: "Marcas",           v: kpis.total_marcas },
          { l: "Colecoes",         v: kpis.total_colecoes },
          { l: "Modelos",          v: kpis.total_modelos },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
            <div style={{ fontSize: "clamp(16px,2vw,22px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1.2 }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>Top Marcas por Valor em Estoque</h2>
        </div>
        <div style={{ padding: "16px" }}>
          {marcas.slice(0, 10).map((m: any, i: number) => {
            const max = marcas[0]?.valor_estoque_total || 1
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                <div style={{ fontSize: "12px", color: "var(--muted)", width: "20px", textAlign: "right", flexShrink: 0 }}>#{i+1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.marca}</span>
                    <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 700, whiteSpace: "nowrap", marginLeft: "8px" }}>
                      R$ {Number(m.valor_estoque_total).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div style={{ background: "var(--surface2)", borderRadius: "4px", height: "6px" }}>
                    <div style={{ background: "var(--primary)", borderRadius: "4px", height: "6px", width: `${(m.valor_estoque_total / max) * 100}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>Resumo por Loja</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                {["Loja","SKUs","Pecas","Valor Estoque","Margem"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--muted)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lojas.map((l: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text)" }}>{l.nome_loja}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>{l.cidade}</div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>{fmt(l.total_skus)}</td>
                  <td style={{ padding: "12px 14px" }}>{fmt(l.total_pecas)}</td>
                  <td style={{ padding: "12px 14px", color: "var(--primary)", fontWeight: 600 }}>{fmtR(l.valor_estoque)}</td>
                  <td style={{ padding: "12px 14px", color: l.margem_media_pct > 0 ? "var(--success)" : "var(--danger)", fontWeight: 500 }}>{l.margem_media_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
