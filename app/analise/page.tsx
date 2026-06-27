"use client"
import { useEffect, useState } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const LOJAS = [
  { id: 1, nome: "P.Nereu" },
  { id: 3, nome: "Vidal" },
  { id: 4, nome: "Imbuiá" },
  { id: 5, nome: "Lontras" },
  { id: 6, nome: "Chapadão" },
  { id: 7, nome: "Hype" },
]

function Chip({ label, ativo, onClick }: { label: string, ativo: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer",
      fontWeight: ativo ? 600 : 400, border: "1px solid",
      background: ativo ? "var(--primary)" : "var(--surface2)",
      color: ativo ? "#fff" : "var(--text)",
      borderColor: ativo ? "var(--primary)" : "var(--border)",
      transition: "all 0.1s", whiteSpace: "nowrap" as const,
    }}>{label}</button>
  )
}

export default function AnalisePage() {
  const [lojaSel, setLojaSel] = useState<number | null>(null)
  const [dias, setDias]       = useState(30)
  const [receita, setReceita] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { buscar() }, [lojaSel, dias])

  async function buscar() {
    setLoading(true)
    const p = new URLSearchParams({ limite: String(dias) })
    if (lojaSel) p.set("loja", String(lojaSel))
    try {
      const [r, v] = await Promise.all([
        fetch(`${API_URL}/receita/diaria?${p}`).then(r => r.json()),
        fetch(`${API_URL}/vendedores${lojaSel ? `?loja=${lojaSel}` : ""}`).then(r => r.json()),
      ])
      setReceita(r); setVendedores(v)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const receitaAgrupada = Object.values(
    receita.reduce((acc: any, r: any) => {
      const d = r.data_venda
      if (!acc[d]) acc[d] = { data: d, receita: 0, pecas: 0 }
      acc[d].receita += r.receita_bruta
      acc[d].pecas   += r.pecas_vendidas
      return acc
    }, {})
  ).sort((a: any, b: any) => a.data.localeCompare(b.data))

  const porLoja = Object.values(
    receita.reduce((acc: any, r: any) => {
      const k = r.empresa || r.loja
      if (!acc[k]) acc[k] = { loja: r.nome_loja?.replace("FOCCA JEANS - ", "") || k, receita: 0 }
      acc[k].receita += r.receita_bruta
      return acc
    }, {})
  ).sort((a: any, b: any) => (b as any).receita - (a as any).receita)

  const totalReceita = receita.reduce((acc, r) => acc + r.receita_bruta, 0)
  const totalPecas   = receita.reduce((acc, r) => acc + r.pecas_vendidas, 0)
  const totalVendas  = receita.reduce((acc, r) => acc + (r.num_vendas || 0), 0)
  const ticketMedio  = totalVendas > 0 ? totalReceita / totalVendas : 0

  const fmtR = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Analise de Vendas</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
            {lojaSel ? LOJAS.find(l => l.id === lojaSel)?.nome : "Todas as lojas"}
          </p>
        </div>
        <select value={dias} onChange={e => setDias(Number(e.target.value))} style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "13px" }}>
          <option value={7}>7 dias</option>
          <option value={15}>15 dias</option>
          <option value={30}>30 dias</option>
        </select>
      </div>

      {/* Filtro loja */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Loja:</span>
        <Chip label="Todas" ativo={lojaSel === null} onClick={() => setLojaSel(null)} />
        {LOJAS.map(l => <Chip key={l.id} label={l.nome} ativo={lojaSel === l.id} onClick={() => setLojaSel(lojaSel === l.id ? null : l.id)} />)}
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: "10px", marginBottom: "20px" }}>
        {[
          { l: "Receita Bruta",  v: fmtR(totalReceita), c: "var(--primary)" },
          { l: "Pecas Vendidas", v: totalPecas.toLocaleString("pt-BR"), c: "var(--success)" },
          { l: "Ticket Medio",   v: fmtR(ticketMedio), c: "var(--warning)" },
          { l: "Num. Vendas",    v: totalVendas.toLocaleString("pt-BR") },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
            <div style={{ fontSize: "clamp(16px,2vw,22px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1.2 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Carregando...</div>
      ) : (
        <>
          {/* Gráfico receita diária */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px", color: "var(--text)" }}>Receita diaria — {dias} dias</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={receitaAgrupada} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="data" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={50} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--text)" }}
                  formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]} />
                <Line type="monotone" dataKey="receita" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: "16px" }}>
            {/* Por loja */}
            {!lojaSel && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
                <h2 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px", color: "var(--text)" }}>Receita por loja</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={porLoja} margin={{ top: 0, right: 0, left: 0, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="loja" tick={{ fill: "var(--muted)", fontSize: 11 }} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={45} />
                    <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--text)" }}
                      formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, "Receita"]} />
                    <Bar dataKey="receita" fill="var(--primary)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Vendedores */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px", color: "var(--text)" }}>Ranking vendedores</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {vendedores.slice(0, 8).map((v: any, i: number) => {
                  const max = vendedores[0]?.receita_total || 1
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ fontSize: "11px", color: "var(--muted)", width: "18px", textAlign: "right", flexShrink: 0 }}>#{i+1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px", flexWrap: "wrap", gap: "4px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {v.nome_loja?.replace("FOCCA JEANS - ", "") || v.loja} · #{v.cod_vendedor}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 700, whiteSpace: "nowrap" }}>{fmtR(v.receita_total)}</span>
                        </div>
                        <div style={{ background: "var(--surface2)", borderRadius: "4px", height: "4px" }}>
                          <div style={{ background: "var(--primary)", borderRadius: "4px", height: "4px", width: `${(v.receita_total / max) * 100}%` }} />
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>{v.num_vendas} vendas</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
