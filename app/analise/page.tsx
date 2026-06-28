"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import FiltroGlobal, { LOJAS } from "@/components/FiltroGlobal"
import { useFiltros, resolverColecoes } from "@/components/FiltroContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const ORDEM_TAM = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3",
  "34","36","38","40","42","44","46","48","50","P/M","G/GG","U","UNICA"]

type Aba = "produtos" | "tamanhos" | "colecoes" | "marcas" | "vendedores"

const ABAS: { key: Aba, label: string }[] = [
  { key: "produtos",   label: "Produtos" },
  { key: "tamanhos",   label: "Tamanhos" },
  { key: "colecoes",   label: "Coleções" },
  { key: "marcas",     label: "Marcas" },
  { key: "vendedores", label: "Vendedores" },
]

export default function AnalisePage() {
  const { filtros, versaoBusca } = useFiltros()
  const [dias, setDias] = useState(30)
  const [aba, setAba] = useState<Aba>("produtos")
  const [opPorAno, setOpPorAno] = useState<Record<string,string[]>>({})

  const [kpis, setKpis] = useState<any>({})
  const [receita, setReceita] = useState<any[]>([])
  const [lista, setLista] = useState<any[]>([])  // dados da aba ativa
  const [loading, setLoading] = useState(false)
  const [buscaFeita, setBuscaFeita] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()).then(c => setOpPorAno(c.por_ano || {})).catch(() => {})
  }, [])

  // Monta os query params a partir dos filtros globais (multi-selecao via virgula)
  function montarParams() {
    const p = new URLSearchParams({ dias: String(dias) })
    if (filtros.lojas.length)   p.set("loja",    filtros.lojas.join(","))
    if (filtros.marcas.length)  p.set("marca",   filtros.marcas.join(","))
    if (filtros.modelos.length) p.set("modelo",  filtros.modelos.join(","))
    if (filtros.sexos.length)   p.set("sexo",    filtros.sexos.join(","))
    if (filtros.anos.length)    p.set("ano",     filtros.anos.join(","))

    // Colecao: usa selecao explicita, ou resolve a partir de ano/estacao.
    // Se o usuario escolheu colecoes especificas, envia elas.
    // Se escolheu so ano+estacao, envia as colecoes resultantes (sem limite).
    if (filtros.colecoes.length) {
      p.set("colecao", filtros.colecoes.join(","))
    } else if (filtros.anos.length && filtros.estacoes.length) {
      const cols = resolverColecoes(filtros, opPorAno)
      if (cols.length) p.set("colecao", cols.join(","))
    }
    // Se so o ano foi escolhido (sem estacao/colecao), o filtro de ano ja recorta.
    return p
  }

  async function buscar() {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    const sig = abortRef.current.signal
    setLoading(true); setBuscaFeita(true)
    const p = montarParams()
    try {
      const [k, r, l] = await Promise.all([
        fetch(`${API_URL}/vendas/kpis?${p}`, { signal: sig }).then(r => r.json()),
        fetch(`${API_URL}/vendas/receita?${p}`, { signal: sig }).then(r => r.json()),
        fetch(`${API_URL}/vendas/${aba}?${p}`, { signal: sig }).then(r => r.json()),
      ])
      setKpis(k || {}); setReceita(Array.isArray(r) ? r : []); setLista(Array.isArray(l) ? l : [])
    } catch(e: any) { if (e?.name !== "AbortError") console.error(e) }
    finally { setLoading(false) }
  }

  // Busca ao entrar com filtros, ao mudar dias, ou ao trocar de aba
  useEffect(() => { buscar() /* eslint-disable-next-line */ }, [versaoBusca, dias, aba])

  // Recarrega so a lista da aba quando troca de aba (mais leve)
  const receitaDia = useMemo(() => {
    const map: Record<string, any> = {}
    receita.forEach(r => {
      const d = r.data_venda
      if (!map[d]) map[d] = { data: d, receita: 0, pecas: 0 }
      map[d].receita += Number(r.receita_bruta || 0)
      map[d].pecas += Number(r.pecas_vendidas || 0)
    })
    return Object.values(map).sort((a: any, b: any) => a.data.localeCompare(b.data))
  }, [receita])

  const fmtR = (n: number) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  const fmtRc = (n: number) => {
    n = Number(n || 0)
    if (n >= 1_000_000) return `R$ ${(n/1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `R$ ${(n/1_000).toFixed(0)}k`
    return `R$ ${n.toFixed(0)}`
  }

  const th = { padding: "9px 12px", textAlign: "left" as const, color: "var(--muted)" as const, fontWeight: 600 as const, fontSize: "10px" as const, textTransform: "uppercase" as const, letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const }
  const td = { padding: "9px 12px", overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Análise de Vendas</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
            Dinâmica por produto, tamanho, coleção, marca e vendedor — respeitando os filtros globais
          </p>
        </div>
        <select value={dias} onChange={e => setDias(Number(e.target.value))} style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "13px", background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}>
          <option value={7}>Últimos 7 dias</option>
          <option value={15}>Últimos 15 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={60}>Últimos 60 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </div>

      <FiltroGlobal onBuscar={buscar} loading={loading} />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: "10px", marginBottom: "20px" }}>
        {[
          { l: "Receita",        v: fmtRc(kpis.receita_bruta),     c: "var(--primary)" },
          { l: "Peças Vendidas", v: Number(kpis.pecas_vendidas || 0).toLocaleString("pt-BR"), c: "var(--success)" },
          { l: "Ticket Médio",   v: fmtR(kpis.ticket_medio),       c: "var(--warning)" },
          { l: "Nº Vendas",      v: Number(kpis.num_vendas || 0).toLocaleString("pt-BR") },
          { l: "Margem Média",   v: `${kpis.margem_media ?? 0}%`,  c: "var(--success)" },
          { l: "Produtos",       v: Number(kpis.produtos_distintos || 0).toLocaleString("pt-BR") },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px", minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
            <div style={{ fontSize: "clamp(15px,1.8vw,21px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Gráfico de receita diária */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px", color: "var(--text)" }}>Receita diária — {dias} dias</h2>
        {receitaDia.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
            {loading ? "Carregando..." : "Sem vendas no período/recorte selecionado"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={receitaDia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="data" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={45} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--text)" }}
                formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]} />
              <Line type="monotone" dataKey="receita" stroke="var(--primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Abas de dimensão */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
        {ABAS.map(a => (
          <button key={a.key} onClick={() => setAba(a.key)} style={{
            padding: "8px 16px", borderRadius: "8px", fontSize: "13px", cursor: "pointer",
            fontWeight: aba === a.key ? 700 : 500, border: "1px solid",
            background: aba === a.key ? "var(--primary)" : "var(--surface2)",
            color: aba === a.key ? "#fff" : "var(--text)",
            borderColor: aba === a.key ? "var(--primary)" : "var(--border)",
          }}>{a.label}</button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Carregando...</div>
        ) : lista.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Sem dados para este recorte.</div>
        ) : aba === "tamanhos" ? (
          <AbaTamanhos lista={lista} fmtR={fmtR} />
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead><tr style={{ background: "var(--surface2)", borderBottom: "2px solid var(--border)" }}>
                {aba === "produtos" && ["Produto","Cor","Modelo","Marca","Coleção","Qtd","Receita","Margem"].map(h => <th key={h} style={th}>{h}</th>)}
                {aba === "colecoes" && ["Coleção","Produtos","Qtd Vendida","Receita","Nº Vendas"].map(h => <th key={h} style={th}>{h}</th>)}
                {aba === "marcas" && ["Marca","Qtd Vendida","Receita","Nº Vendas"].map(h => <th key={h} style={th}>{h}</th>)}
                {aba === "vendedores" && ["Loja","Vendedor","Nº Vendas","Peças","Receita","Ticket Médio"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {lista.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--surface2)18" }}>
                    {aba === "produtos" && <>
                      <td title={row.produto} style={{ ...td, fontWeight: 600, maxWidth: "220px" }}>{row.produto}</td>
                      <td style={{ ...td, color: "var(--muted)" }}>{row.cor}</td>
                      <td style={td}>{row.modelo}</td>
                      <td style={td}>{row.marca}</td>
                      <td title={row.colecao} style={{ ...td, color: "var(--muted)", maxWidth: "140px" }}>{row.colecao}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{Number(row.qtd_vendida).toLocaleString("pt-BR")}</td>
                      <td style={{ ...td, textAlign: "right", color: "var(--primary)", fontWeight: 600 }}>{fmtR(row.receita)}</td>
                      <td style={{ ...td, textAlign: "center" }}>{row.margem_media ?? "-"}%</td>
                    </>}
                    {aba === "colecoes" && <>
                      <td title={row.colecao} style={{ ...td, fontWeight: 600, maxWidth: "280px" }}>{row.colecao}</td>
                      <td style={{ ...td, textAlign: "center" }}>{row.produtos}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{Number(row.qtd_vendida).toLocaleString("pt-BR")}</td>
                      <td style={{ ...td, textAlign: "right", color: "var(--primary)", fontWeight: 600 }}>{fmtR(row.receita)}</td>
                      <td style={{ ...td, textAlign: "center", color: "var(--muted)" }}>{row.num_vendas}</td>
                    </>}
                    {aba === "marcas" && <>
                      <td style={{ ...td, fontWeight: 600 }}>{row.marca}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{Number(row.qtd_vendida).toLocaleString("pt-BR")}</td>
                      <td style={{ ...td, textAlign: "right", color: "var(--primary)", fontWeight: 600 }}>{fmtR(row.receita)}</td>
                      <td style={{ ...td, textAlign: "center", color: "var(--muted)" }}>{row.num_vendas}</td>
                    </>}
                    {aba === "vendedores" && <>
                      <td style={td}>{row.nome_loja?.replace("FOCCA JEANS - ", "").replace("FOCCA ", "")}</td>
                      <td style={{ ...td, fontWeight: 600 }}>#{row.cod_vendedor}</td>
                      <td style={{ ...td, textAlign: "center" }}>{row.num_vendas}</td>
                      <td style={{ ...td, textAlign: "center" }}>{Number(row.pecas_vendidas).toLocaleString("pt-BR")}</td>
                      <td style={{ ...td, textAlign: "right", color: "var(--primary)", fontWeight: 600 }}>{fmtR(row.receita_total)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{fmtR(row.ticket_medio)}</td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Aba de tamanhos com gráfico de barras (curva de grade)
function AbaTamanhos({ lista, fmtR }: { lista: any[], fmtR: (n: number) => string }) {
  const ORDEM_TAM = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3","34","36","38","40","42","44","46","48","50","P/M","G/GG","U","UNICA"]
  const ordenada = [...lista].sort((a, b) => {
    const ia = ORDEM_TAM.indexOf(a.tamanho), ib = ORDEM_TAM.indexOf(b.tamanho)
    if (ia === -1 && ib === -1) return String(a.tamanho).localeCompare(String(b.tamanho))
    if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib
  })
  const maxQtd = Math.max(...ordenada.map(t => Number(t.qtd_vendida) || 0), 1)

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={ordenada} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="tamanho" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--text)" }}
              formatter={(v: any) => [Number(v).toLocaleString("pt-BR"), "Qtd vendida"]} />
            <Bar dataKey="qtd_vendida" fill="var(--primary)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "8px" }}>
        {ordenada.map((t, i) => (
          <div key={i} style={{ background: "var(--surface2)", borderRadius: "8px", padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{t.tamanho}</div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--primary)" }}>{Number(t.qtd_vendida).toLocaleString("pt-BR")}</div>
            <div style={{ fontSize: "10px", color: "var(--muted)" }}>{fmtR(t.receita)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
