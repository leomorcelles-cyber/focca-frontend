"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useFiltro } from "@/lib/FiltroContext"
import FiltroGlobal from "@/components/FiltroGlobal"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const LOJAS_NOME: Record<number, string> = { 1: "P.Nereu", 3: "Vidal", 4: "Imbuiá", 5: "Lontras", 6: "Chapadão", 7: "Hype" }

export default function AnalisePage() {
  const { filtros } = useFiltro()
  const [receita, setReceita] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [modelos, setModelos] = useState<string[]>([])
  const [marcas, setMarcas] = useState<string[]>([])
  const [porAno, setPorAno] = useState<Record<string, string[]>>({})
  const [anos, setAnos] = useState<string[]>([])
  const [dias, setDias] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.filtros(),
      fetch("http://127.0.0.1:8000/filtros/colecoes-por-ano").then(r => r.json()),
    ]).then(([f, c]) => {
      setModelos(f.modelos || [])
      setMarcas(f.marcas || [])
      setPorAno(c.por_ano || {})
      setAnos(c.anos || [])
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const loja = filtros.lojas.length === 1 ? filtros.lojas[0] : 0
    const p: Record<string, string> = { limite: String(dias) }
    if (loja) p.loja = String(loja)
    Promise.all([
      api.receitaDiaria(p),
      api.vendedores(loja ? { loja: String(loja) } : {}),
    ]).then(([r, v]) => { setReceita(r); setVendedores(v); setLoading(false) })
  }, [filtros.lojas, dias])

  const receitaAgrupada = Object.values(
    receita.reduce((acc: any, r: any) => {
      const d = r.data_venda
      if (!acc[d]) acc[d] = { data: d, receita: 0, pecas: 0, vendas: 0 }
      acc[d].receita += r.receita_bruta
      acc[d].pecas   += r.pecas_vendidas
      acc[d].vendas  += r.num_vendas
      return acc
    }, {})
  ).sort((a: any, b: any) => a.data.localeCompare(b.data))

  const porLoja = Object.values(
    receita.reduce((acc: any, r: any) => {
      const k = r.loja
      if (!acc[k]) acc[k] = { loja: k.replace("FOCCA JEANS - ", ""), receita: 0 }
      acc[k].receita += r.receita_bruta
      return acc
    }, {})
  ).sort((a: any, b: any) => (b as any).receita - (a as any).receita)

  const totalReceita = receita.reduce((acc, r) => acc + r.receita_bruta, 0)
  const totalPecas   = receita.reduce((acc, r) => acc + r.pecas_vendidas, 0)
  const totalVendas  = receita.reduce((acc, r) => acc + r.num_vendas, 0)
  const ticketMedio  = totalVendas > 0 ? totalReceita / totalVendas : 0
  const margemMedia  = receita.filter(r => r.margem_media_pct).length > 0
    ? receita.reduce((acc, r) => acc + (r.margem_media_pct || 0), 0) / receita.filter(r => r.margem_media_pct).length : 0

  const fmtR = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Análise de Vendas</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
            {filtros.lojas.length === 1 ? `Loja: ${LOJAS_NOME[filtros.lojas[0]]}` : "Todas as lojas"}
          </p>
        </div>
        <div>
          <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Período</div>
          <select value={dias} onChange={e => setDias(Number(e.target.value))} style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "13px" }}>
            <option value={7}>7 dias</option>
            <option value={15}>15 dias</option>
            <option value={30}>30 dias</option>
          </select>
        </div>
      </div>

      <FiltroGlobal opcoes={{ modelos, marcas, porAno, anos }} mostrarSaldo={false} />

      {filtros.lojas.length > 1 && (
        <div style={{ padding: "10px 14px", background: "var(--warning-light)", border: "1px solid var(--warning)", borderRadius: "8px", marginBottom: "16px", fontSize: "12px", color: "var(--warning)" }}>
          ⚠️ Selecione apenas uma loja para ver dados específicos, ou deixe todas para ver o consolidado.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: "10px", marginBottom: "20px" }}>
        {[
          { l: "Receita Bruta",  v: fmtR(totalReceita), c: "var(--primary)" },
          { l: "Peças Vendidas", v: totalPecas.toLocaleString("pt-BR"), c: "var(--success)" },
          { l: "Ticket Médio",   v: fmtR(ticketMedio), c: "var(--warning)" },
          { l: "Margem Média",   v: `${margemMedia.toFixed(1)}%`, c: "var(--success)" },
          { l: "Nº Vendas",      v: totalVendas.toLocaleString("pt-BR") },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
            <div style={{ fontSize: "clamp(16px,2vw,22px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1.2 }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px", color: "var(--text)" }}>Receita diária — {dias} dias</h2>
        {loading ? (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Carregando...</div>
        ) : (
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
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: "16px" }}>
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
                        {v.loja?.replace("FOCCA JEANS - ", "")} · #{v.cod_vendedor}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 700, whiteSpace: "nowrap" }}>{fmtR(v.receita_total)}</span>
                    </div>
                    <div style={{ background: "var(--surface2)", borderRadius: "4px", height: "4px" }}>
                      <div style={{ background: "var(--primary)", borderRadius: "4px", height: "4px", width: `${(v.receita_total / max) * 100}%` }} />
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>{v.num_vendas} vendas · {v.margem_media_pct}% margem</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
