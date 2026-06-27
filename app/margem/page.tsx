"use client"
import { useState } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

function corMargem(m: number) {
  if (m >= 60) return { cor: "var(--success)", bg: "var(--success-light)" }
  if (m >= 45) return { cor: "var(--warning)", bg: "var(--warning-light)" }
  return { cor: "var(--danger)", bg: "var(--danger-light)" }
}

const lbl = { fontSize: "10px", color: "var(--muted)", fontWeight: 600 as const, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: "8px", display: "block" as const }
const inp = { padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "12px", marginBottom: "8px", background: "var(--surface2)", color: "var(--text)", outline: "none", width: "200px", display: "block" as const }

export default function MargemPage() {
  const [marcaBusca, setMarcaBusca]   = useState("")
  const [modeloBusca, setModeloBusca] = useState("")
  const [ordem, setOrdem]             = useState("lucro")
  const [dados, setDados]             = useState<any[]>([])
  const [loading, setLoading]         = useState(false)
  const [buscaFeita, setBuscaFeita]   = useState(false)
  const [filtrosAbertos, setFiltrosAbertos] = useState(true)

  async function buscar() {
    setDados([])
    setLoading(true)
    setBuscaFeita(true)
    const p = new URLSearchParams({ limite: "500", ordem })
    if (marcaBusca.trim())  p.set("marca",  marcaBusca.trim())
    if (modeloBusca.trim()) p.set("modelo", modeloBusca.trim())
    try {
      const res = await fetch(`${API_URL}/margem?${p}`)
      setDados(await res.json())
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fmtR = (n: number) => `R$ ${n?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}`
  const totalLucro  = dados.reduce((acc, r) => acc + (r.lucro_potencial || 0), 0)
  const totalVenda  = dados.reduce((acc, r) => acc + (r.valor_venda_potencial || 0), 0)
  const margemMedia = dados.filter(r => r.margem_bruta_pct).length > 0
    ? dados.reduce((acc, r) => acc + (r.margem_bruta_pct || 0), 0) / dados.filter(r => r.margem_bruta_pct).length : 0

  const th = { padding: "9px 12px", color: "var(--muted)" as const, fontWeight: 600 as const, fontSize: "10px" as const, textTransform: "uppercase" as const, letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const, textAlign: "left" as const }
  const td = { padding: "9px 12px", overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Margem e Rentabilidade</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>Ranking por margem bruta, markup e lucro potencial</p>
        </div>
        <select value={ordem} onChange={e => setOrdem(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "13px" }}>
          <option value="lucro">Por lucro potencial</option>
          <option value="margem">Por margem %</option>
          <option value="markup">Por markup</option>
        </select>
      </div>

      {/* Filtros */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "16px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: filtrosAbertos ? "1px solid var(--border)" : "none", background: "var(--surface2)" }}>
          <button onClick={() => setFiltrosAbertos(!filtrosAbertos)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
            {filtrosAbertos ? "▲" : "▼"} Filtros
          </button>
          <button onClick={buscar} disabled={loading} style={{ padding: "8px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: loading ? "default" : "pointer", fontSize: "13px", fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Buscando..." : "🔍 Buscar"}
          </button>
        </div>
        {filtrosAbertos && (
          <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            <div>
              <label style={lbl}>Marca</label>
              <input placeholder="Ex: ZIANN..." value={marcaBusca} onChange={e => setMarcaBusca(e.target.value)} onKeyDown={e => e.key === "Enter" && buscar()} style={inp} />
            </div>
            <div>
              <label style={lbl}>Modelo</label>
              <input placeholder="Ex: CALCA..." value={modeloBusca} onChange={e => setModeloBusca(e.target.value)} onKeyDown={e => e.key === "Enter" && buscar()} style={inp} />
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      {dados.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: "10px", marginBottom: "16px" }}>
          {[
            { l: "Lucro potencial", v: fmtR(totalLucro),            c: "var(--success)" },
            { l: "Valor a vender",  v: fmtR(totalVenda),            c: "var(--primary)" },
            { l: "Margem media",    v: `${margemMedia.toFixed(1)}%`, c: "var(--warning)" },
            { l: "SKUs",            v: dados.length.toLocaleString("pt-BR") },
          ].map((k, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
              <div style={{ fontSize: "clamp(16px,2vw,22px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1.2 }}>{k.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      {!buscaFeita ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>%</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>Clique em Buscar para ver a margem</div>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>Filtre por marca ou modelo para resultados especificos</div>
        </div>
      ) : loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>Buscando...
        </div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "2px solid var(--border)" }}>
                  {["Produto","Cor","Tam","Marca","Colecao","Saldo","Preco","Custo","Margem","Markup","Lucro"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.map((row, i) => {
                  const mc = corMargem(row.margem_bruta_pct || 0)
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--surface2)18" }}>
                      <td title={row.nome} style={{ ...td, fontWeight: 600, maxWidth: "160px" }}>{row.nome || row.descricao_basica}</td>
                      <td style={{ ...td, color: "var(--muted)" }}>{row.cor}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{row.tamanho}</td>
                      <td style={td}>{row.marca}</td>
                      <td title={row.colecao} style={{ ...td, color: "var(--muted)", fontSize: "11px", maxWidth: "120px" }}>{row.colecao}</td>
                      <td style={{ ...td, textAlign: "center", fontWeight: 600 }}>{row.saldo_atual}</td>
                      <td style={{ ...td, textAlign: "right" }}>{fmtR(row.preco_venda)}</td>
                      <td style={{ ...td, textAlign: "right", color: "var(--muted)" }}>{fmtR(row.preco_custo)}</td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: mc.cor, background: mc.bg }}>
                          {row.margem_bruta_pct?.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: "center", color: "var(--muted)" }}>{row.markup?.toFixed(2)}x</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "var(--success)" }}>{fmtR(row.lucro_potencial)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", color: "var(--muted)", fontSize: "12px" }}>{dados.length} produtos</div>
        </div>
      )}
    </div>
  )
}
