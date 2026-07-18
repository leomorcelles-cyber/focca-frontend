"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import FiltroGlobal, { LOJAS } from "@/components/FiltroGlobal"
import { useFiltros, resolverColecoes, periodoParaParams} from "@/components/FiltroContext"

import SeletorPeriodo from "@/components/SeletorPeriodo"
import AbaComGrafico from "@/components/AbaComGrafico"
import ModalEstoque from "@/components/ModalEstoque"
import TabelaOrdenavel from "@/components/TabelaOrdenavel"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const ORDEM_TAM = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3",
  "34","36","38","40","42","44","46","48","50","P/M","G/GG","U","UNICA"]

type Aba = "produtos" | "tamanhos" | "colecoes" | "marcas" | "modelos" | "lojas"

const ABAS: { key: Aba, label: string }[] = [
  { key: "produtos",   label: "Produtos" },
  { key: "tamanhos",   label: "Tamanhos" },
  { key: "colecoes",   label: "Coleções" },
  { key: "marcas",     label: "Marcas" },
  { key: "modelos",    label: "Modelos" },
  { key: "lojas",      label: "Lojas" },
]

export default function AnalisePage() {
  const { filtros, versaoBusca, periodo } = useFiltros()
  const [aba, setAba] = useState<Aba>("produtos")
  const [granularidade, setGranularidade] = useState<"dia"|"mes"|"ano">("dia")
  const [modalEstoque, setModalEstoque] = useState<{aberto:boolean, cod?:number, modelo?:string, titulo?:string}>({aberto:false})
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
    const p = new URLSearchParams(periodoParaParams(periodo))
    if (filtros.lojas.length)   p.set("loja",    filtros.lojas.join(","))
    if (filtros.marcas.length)  p.set("marca",   filtros.marcas.join(","))
    if (filtros.modelos.length) p.set("modelo",  filtros.modelos.join(","))
    if (filtros.sexos.length)   p.set("sexo",    filtros.sexos.join(","))
    if (filtros.anos.length)    p.set("ano",     filtros.anos.join(","))

    // Colecao: usa selecao explicita, ou resolve a partir de ano/estacao.
    if (filtros.colecoes.length) {
      p.set("colecao", filtros.colecoes.join(","))
    } else if (filtros.anos.length && filtros.estacoes.length) {
      const cols = resolverColecoes(filtros, opPorAno)
      if (cols.length) p.set("colecao", cols.join(","))
    }
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
  useEffect(() => { buscar() /* eslint-disable-next-line */ }, [versaoBusca, periodo, aba])

  const receitaDia = useMemo(() => {
    // chave de agrupamento conforme granularidade: dia(YYYY-MM-DD), mes(YYYY-MM), ano(YYYY)
    const chaveDe = (d: string) => {
      if (!d) return d
      if (granularidade === "ano") return d.slice(0, 4)
      if (granularidade === "mes") return d.slice(0, 7)
      return d
    }
    const map: Record<string, any> = {}
    receita.forEach(r => {
      const k = chaveDe(r.data_venda)
      if (!map[k]) map[k] = { data: k, receita: 0, pecas: 0 }
      map[k].receita += Number(r.receita_bruta || 0)
      map[k].pecas += Number(r.pecas_vendidas || 0)
    })
    return Object.values(map).sort((a: any, b: any) => a.data.localeCompare(b.data))
  }, [receita, granularidade])

  const fmtR = (n: number) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  const fmtRc = (n: number) => {
    n = Number(n || 0)
    if (n >= 1_000_000) return `R$ ${(n/1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `R$ ${(n/1_000).toFixed(0)}k`
    return `R$ ${n.toFixed(0)}`
  }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Análise de Vendas</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
            Dinâmica por produto, tamanho, coleção, marca e loja — respeitando os filtros globais
          </p>
        </div>
        <SeletorPeriodo />
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

      {/* Grafico de receita diaria */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Receita — {periodo.tipo === "custom" && periodo.inicio ? periodo.inicio.split("-").reverse().join("/") + " a " + periodo.fim.split("-").reverse().join("/") : "últimos " + periodo.dias + " dias"}</h2>
          <div style={{ display: "flex", gap: "4px" }}>
            {(["dia","mes","ano"] as const).map(g => (
              <button key={g} onClick={() => setGranularidade(g)} style={{
                padding: "5px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
                fontWeight: granularidade === g ? 700 : 500, border: "1px solid",
                background: granularidade === g ? "var(--primary)" : "var(--surface2)",
                color: granularidade === g ? "#fff" : "var(--text)",
                borderColor: granularidade === g ? "var(--primary)" : "var(--border)",
              }}>{g === "dia" ? "Dia" : g === "mes" ? "Mês" : "Ano"}</button>
            ))}
          </div>
        </div>
        {receitaDia.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
            {loading ? "Carregando..." : "Sem vendas no período/recorte selecionado"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={receitaDia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="data" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => granularidade === "ano" ? v : granularidade === "mes" ? v.slice(2) : v.slice(5)} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={45} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--text)" }}
                formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]} />
              <Line type="monotone" dataKey="receita" stroke="var(--primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Abas de dimensao */}
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

      {/* Conteudo da aba */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Carregando...</div>
        ) : lista.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Sem dados para este recorte.</div>
        ) : aba === "tamanhos" ? (
          <AbaTamanhos lista={lista} fmtR={fmtR} />
        ) : aba === "colecoes" ? (
          <AbaComGrafico
            lista={lista}
            campoLabel="colecao"
            campoValor="receita"
            fmtR={fmtR}
            tituloGrafico="Top coleções por receita"
            colunas={[
              { key: "colecao", label: "Coleção", bold: true },
              { key: "produtos", label: "Produtos", tipo: "num", align: "center" },
              { key: "qtd_vendida", label: "Qtd Vendida", tipo: "num", align: "right", bold: true },
              { key: "receita", label: "Receita", tipo: "moeda", align: "right", cor: "var(--primary)" },
              { key: "num_vendas", label: "Nº Vendas", tipo: "num", align: "center", cor: "var(--muted)" },
            ]}
          />
        ) : aba === "marcas" ? (
          <AbaComGrafico
            lista={lista}
            campoLabel="marca"
            campoValor="receita"
            fmtR={fmtR}
            tituloGrafico="Top marcas por receita"
            colunas={[
              { key: "marca", label: "Marca", bold: true },
              { key: "qtd_vendida", label: "Qtd Vendida", tipo: "num", align: "right", bold: true },
              { key: "receita", label: "Receita", tipo: "moeda", align: "right", cor: "var(--primary)" },
              { key: "num_vendas", label: "Nº Vendas", tipo: "num", align: "center", cor: "var(--muted)" },
            ]}
          />
        ) : aba === "modelos" ? (
          <AbaComGrafico
            lista={lista}
            campoLabel="modelo"
            campoValor="receita"
            fmtR={fmtR}
            tituloGrafico="Top modelos por receita"
            onClicar={(row: any, c: any) => {
              if (c.key === "estoque_rede") setModalEstoque({ aberto: true, modelo: row.modelo, titulo: row.modelo })
            }}
            colunas={[
              { key: "modelo", label: "Modelo", bold: true },
              { key: "qtd_vendida", label: "Qtd Vendida", tipo: "num", align: "right", bold: true },
              { key: "receita", label: "Receita", tipo: "moeda", align: "right", cor: "var(--primary)" },
              { key: "estoque_rede", label: "Estoque", tipo: "num", align: "right", bold: true, clicavel: true },
            ]}
          />
        ) : aba === "produtos" ? (
          <TabelaOrdenavel
            linhas={lista}
            initialKey="qtd_vendida"
            colunas={[
              { key: "produto", label: "Produto", tdStyle: { fontWeight: 600, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }, render: (r: any) => <span title={r.produto}>{r.produto}</span> },
              { key: "cor", label: "Cor", tdStyle: { color: "var(--muted)" } },
              { key: "modelo", label: "Modelo" },
              { key: "marca", label: "Marca" },
              { key: "colecao", label: "Coleção", tdStyle: { color: "var(--muted)", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }, render: (r: any) => <span title={r.colecao}>{r.colecao}</span> },
              { key: "qtd_vendida", label: "Qtd", align: "right", sortBy: (r: any) => Number(r.qtd_vendida) || 0, tdStyle: { fontWeight: 700 }, render: (r: any) => Number(r.qtd_vendida).toLocaleString("pt-BR") },
              { key: "receita", label: "Receita", align: "right", sortBy: (r: any) => Number(r.receita) || 0, tdStyle: { color: "var(--primary)", fontWeight: 600 }, render: (r: any) => fmtR(r.receita) },
              { key: "margem_media", label: "Margem", align: "center", sortBy: (r: any) => Number(r.margem_media) || 0, render: (r: any) => `${r.margem_media ?? "-"}%` },
              { key: "estoque_rede", label: "Estoque", align: "right", sortBy: (r: any) => Number(r.estoque_rede) || 0, render: (r: any) => (
                <span onClick={() => setModalEstoque({ aberto: true, cod: Number(r.cod_produto), titulo: r.produto })} title="Ver estoque por loja"
                  style={{ cursor: "pointer", fontWeight: 700, textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "3px", color: Number(r.estoque_rede) === 0 ? "var(--danger)" : "var(--text)" }}>
                  {Number(r.estoque_rede ?? 0).toLocaleString("pt-BR")}
                </span>
              ) },
            ]}
          />
        ) : (
          <TabelaOrdenavel
            linhas={lista}
            initialKey="receita_total"
            colunas={[
              { key: "nome_loja", label: "Loja", tdStyle: { fontWeight: 600 }, render: (r: any) => r.nome_loja?.replace("FOCCA JEANS - ", "").replace("FOCCA ", "") },
              { key: "num_vendas", label: "Nº Vendas", align: "center" },
              { key: "pecas_vendidas", label: "Peças", align: "center", sortBy: (r: any) => Number(r.pecas_vendidas) || 0, render: (r: any) => Number(r.pecas_vendidas || 0).toLocaleString("pt-BR") },
              { key: "receita_total", label: "Receita", align: "right", sortBy: (r: any) => Number(r.receita_total) || 0, tdStyle: { color: "var(--primary)", fontWeight: 600 }, render: (r: any) => fmtR(r.receita_total) },
              { key: "margem_media", label: "Margem", align: "right", sortBy: (r: any) => Number(r.margem_media) || 0, tdStyle: { fontWeight: 600 }, render: (r: any) => <span style={{ color: Number(r.margem_media) >= 0 ? "var(--success)" : "var(--danger)" }}>{Number(r.margem_media || 0).toFixed(1)}%</span> },
            ]}
          />
        )}
      </div>

      <ModalEstoque
        aberto={modalEstoque.aberto}
        onFechar={() => setModalEstoque({ aberto: false })}
        codProduto={modalEstoque.cod}
        modelo={modalEstoque.modelo}
        titulo={modalEstoque.titulo}
      />
    </div>
  )
}

// Aba de tamanhos com grafico de barras (curva de grade)
function AbaTamanhos({ lista, fmtR }: { lista: any[], fmtR: (n: number) => string }) {
  const ORDEM_TAM = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3","34","36","38","40","42","44","46","48","50","P/M","G/GG","U","UNICA"]
  const ordenada = [...lista].sort((a, b) => Number(b.qtd_vendida || 0) - Number(a.qtd_vendida || 0))
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
