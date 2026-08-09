"use client"
import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react"
import { useRouter } from "next/navigation"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import FiltroGlobal, { LOJAS } from "@/components/FiltroGlobal"
import { useFiltros, resolverColecoes, periodoParaParams} from "@/components/FiltroContext"
import { useSelecao, chaveItem, ItemSelecionado } from "@/components/SelecaoContext"

import SeletorPeriodo from "@/components/SeletorPeriodo"
import AbaComGrafico from "@/components/AbaComGrafico"
import ModalEstoque from "@/components/ModalEstoque"
import MiniFoto from "@/components/MiniFoto"
import TabelaOrdenavel from "@/components/TabelaOrdenavel"
import FraseRecorte from "@/components/FraseRecorte"
import Cor from "@/components/Cor"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const ORDEM_TAM = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3",
  "34","36","38","40","42","44","46","48","50","P/M","G/GG","U","UNICA"]

type Aba = "produtos" | "tamanhos" | "colecoes" | "marcas" | "modelos" | "lojas"

// Grafico de receita memoizado: o recharts e caro de re-renderizar, e antes
// re-renderizava a cada clique em QUALQUER filtro global (o Context re-renderiza
// a pagina inteira). Agora so re-renderiza quando os dados/granularidade mudam.
const GraficoReceita = memo(function GraficoReceita({ dados, granularidade }: { dados: any[], granularidade: "dia" | "mes" | "ano" }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={dados} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="data" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => granularidade === "ano" ? v : granularidade === "mes" ? v.slice(2) : v.slice(5)} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={45} />
        <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--text)" }}
          formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]} />
        <Line type="monotone" dataKey="receita" stroke="var(--primary)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
})

// Modelos vem logo depois de Produtos: sao as duas abas de onde se seleciona.
const ABAS: { key: Aba, label: string }[] = [
  { key: "produtos",   label: "Produtos" },
  { key: "modelos",    label: "Modelos" },
  { key: "tamanhos",   label: "Tamanhos" },
  { key: "colecoes",   label: "Coleções" },
  { key: "marcas",     label: "Marcas" },
  { key: "lojas",      label: "Lojas" },
]

// Teto de linhas pedidas ao backend. Antes eram 50 fixos e o resto do recorte
// ficava invisivel — sem aviso de que havia mais.
const LIMITE_LINHAS = 25000

export default function VisaoGeralPage() {
  const { filtros, setFiltros, versaoBusca, periodo, dispararBusca } = useFiltros()
  const { itens, toggle, adicionarVarios, remover } = useSelecao()
  const router = useRouter()
  const [aba, setAba] = useState<Aba>("produtos")
  const [granularidade, setGranularidade] = useState<"dia"|"mes"|"ano">("dia")
  const [modalEstoque, setModalEstoque] = useState<{aberto:boolean, cod?:number, modelo?:string, colecao?:string, marca?:string, titulo?:string}>({aberto:false})
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
    if (filtros.produtos.length) p.set("produto", filtros.produtos.join(","))
    if (filtros.cores.length)    p.set("cor",     filtros.cores.join(","))
    if (filtros.ids.trim())      p.set("cod_produto", filtros.ids.split(/[\s,;]+/).filter(Boolean).join(","))

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
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const sig = ctrl.signal
    setLoading(true); setBuscaFeita(true)
    const p = montarParams()
    try {
      // A aba Produtos pede o recorte INTEIRO (so ela e' por SKU e estoura os 50
      // antigos). As outras agregam e ja vinham completas.
      const pl = new URLSearchParams(p)
      if (aba === "produtos") pl.set("limite", String(LIMITE_LINHAS))
      const [k, r, l] = await Promise.all([
        fetch(`${API_URL}/vendas/kpis?${p}`, { signal: sig }).then(r => r.json()),
        fetch(`${API_URL}/vendas/receita?${p}`, { signal: sig }).then(r => r.json()),
        fetch(`${API_URL}/vendas/${aba}?${pl}`, { signal: sig }).then(r => r.json()),
      ])
      setKpis(k || {}); setReceita(Array.isArray(r) ? r : []); setLista(Array.isArray(l) ? l : [])
    } catch(e: any) { if (e?.name !== "AbortError") console.error(e) }
    finally {
      // so desliga o loading se ESTA busca ainda for a atual — uma busca abortada
      // por outra mais nova nao pode apagar o "Buscando..." da que esta em voo
      if (abortRef.current === ctrl) setLoading(false)
    }
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

  // useCallback: referencias estaveis para os componentes memoizados (AbaComGrafico,
  // TabelaOrdenavel) nao re-renderizarem a toa quando a pagina re-renderiza.
  const fmtR = useCallback((n: number) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, [])
  const fmtRc = useCallback((n: number) => {
    n = Number(n || 0)
    if (n >= 1_000_000) return `R$ ${(n/1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `R$ ${(n/1_000).toFixed(0)}k`
    return `R$ ${n.toFixed(0)}`
  }, [])

  const onClicarModelo = useCallback((row: any, c: any) => {
    if (c.key === "estoque_rede") setModalEstoque({ aberto: true, modelo: row.modelo, titulo: row.modelo })
  }, [])

  // Filtros globais repassados ao modal de estoque. Sem isso ele consultava a rede
  // inteira: com o Hype desmarcado, o Hype aparecia no modal do mesmo jeito.
  // Nao inclui produto/cod_produto — quem clica ja define a dimensao.
  const queryEstoqueModal = useMemo(() => {
    const p = new URLSearchParams()
    if (filtros.lojas.length)    p.set("loja",    filtros.lojas.join(","))
    if (filtros.marcas.length)   p.set("marca",   filtros.marcas.join(","))
    if (filtros.modelos.length)  p.set("modelo",  filtros.modelos.join(","))
    if (filtros.sexos.length)    p.set("sexo",    filtros.sexos.join(","))
    if (filtros.cores.length)    p.set("cor",     filtros.cores.join(","))
    if (filtros.colecoes.length) p.set("colecao", filtros.colecoes.join(","))
    else if (filtros.anos.length && filtros.estacoes.length) {
      const cols = resolverColecoes(filtros, opPorAno)
      if (cols.length) p.set("colecao", cols.join(","))
    } else if (filtros.anos.length) p.set("ano", filtros.anos.join(","))
    if (filtros.saldoMax !== null) p.set("saldo_max", String(filtros.saldoMax))
    return p.toString()
  }, [filtros, opPorAno])

  // Colunas estaveis (useMemo) — sem isso, cada render cria arrays novos e o memo
  // dos componentes de tabela/grafico nunca "pega".
  // Estoque clicavel tambem em Colecoes e Marcas. Tamanhos e Lojas ficam de fora:
  // a matriz nao tem saldo por tamanho, e a aba de Lojas ja e' o proprio recorte.
  const onClicarColecao = useCallback((row: any, c: any) => {
    if (c.key === "estoque_rede") setModalEstoque({ aberto: true, colecao: row.colecao, titulo: row.colecao })
  }, [])
  const onClicarMarca = useCallback((row: any, c: any) => {
    if (c.key === "estoque_rede") setModalEstoque({ aberto: true, marca: row.marca, titulo: row.marca })
  }, [])

  const colsColecoes = useMemo(() => [
    { key: "colecao", label: "Coleção", bold: true },
    { key: "produtos", label: "Produtos", tipo: "num" as const, align: "center" as const },
    { key: "qtd_vendida", label: "Qtd Vendida", tipo: "num" as const, align: "right" as const, bold: true },
    { key: "receita", label: "Receita", tipo: "moeda" as const, align: "right" as const, cor: "var(--primary)" },
    { key: "num_vendas", label: "Nº Vendas", tipo: "num" as const, align: "center" as const, cor: "var(--muted)" },
    { key: "estoque_rede", label: "Estoque", tipo: "num" as const, align: "right" as const, bold: true, clicavel: true },
  ], [])

  const colsMarcas = useMemo(() => [
    { key: "marca", label: "Marca", bold: true },
    { key: "qtd_vendida", label: "Qtd Vendida", tipo: "num" as const, align: "right" as const, bold: true },
    { key: "receita", label: "Receita", tipo: "moeda" as const, align: "right" as const, cor: "var(--primary)" },
    { key: "num_vendas", label: "Nº Vendas", tipo: "num" as const, align: "center" as const, cor: "var(--muted)" },
    { key: "estoque_rede", label: "Estoque", tipo: "num" as const, align: "right" as const, bold: true, clicavel: true },
  ], [])

  // ---- SELECAO POR MODELO --------------------------------------------------
  // Duas portas na mesma linha: o checkbox leva o modelo INTEIRO para o carrinho,
  // o nome abre os SKUs dele na aba Produtos para escolher a dedo.
  //
  // Os SKUs saem de /produtos/skus (CATALOGO) e nao das vendas: marcar um modelo
  // para repor tem de alcancar o tamanho que zerou, e o zerado nao vendeu — nem
  // aparece no cache de estoque (o Microvix apaga a linha de inventario).
  // Os filtros globais vao junto, senao "CAMISETA" traria 5 mil SKUs de coleções
  // antigas em vez do recorte que esta' na tela.
  const [carregandoModelo, setCarregandoModelo] = useState<string | null>(null)
  const [modelosMarcados, setModelosMarcados] = useState<Record<string, string[]>>({})

  async function alternarModelo(modelo: string) {
    const jaMarcado = modelosMarcados[modelo]
    if (jaMarcado) {
      jaMarcado.forEach(k => remover(k))
      setModelosMarcados(prev => { const n = { ...prev }; delete n[modelo]; return n })
      return
    }
    setCarregandoModelo(modelo)
    try {
      const q = new URLSearchParams({ modelo })
      if (filtros.marcas.length)  q.set("marca", filtros.marcas.join(","))
      if (filtros.sexos.length)   q.set("sexo",  filtros.sexos.join(","))
      if (filtros.cores.length)   q.set("cor",   filtros.cores.join(","))
      if (filtros.lojas.length)   q.set("loja",  filtros.lojas.join(","))
      if (filtros.colecoes.length) q.set("colecao", filtros.colecoes.join(","))
      else if (filtros.anos.length) q.set("ano", filtros.anos.join(","))

      const skus: any[] = await fetch(`${API_URL}/produtos/skus?${q}`).then(r => r.json())
      if (!Array.isArray(skus) || skus.length === 0) {
        alert(`Nenhum SKU de "${modelo}" no recorte atual.`); return
      }
      const zerados = skus.filter(s => Number(s.total_rede || 0) === 0).length
      if (skus.length > 200 && !confirm(
        `"${modelo}" tem ${skus.length.toLocaleString("pt-BR")} SKUs no recorte atual ` +
        `(${zerados.toLocaleString("pt-BR")} sem estoque).\n\n` +
        `Marcar todos? Para um recorte menor, feche isto e filtre por ano ou coleção antes.`
      )) return

      const itensNovos: ItemSelecionado[] = skus.map(s => ({
        cod_produto: s.cod_produto, produto: s.produto, cor: s.cor ?? "", tamanho: s.tamanho ?? "",
        modelo: s.modelo, marca: s.marca, colecao: s.colecao, totalRede: Number(s.total_rede) || 0,
        imagem: s.imagem ?? null,
      }))
      adicionarVarios(itensNovos)
      setModelosMarcados(prev => ({ ...prev, [modelo]: itensNovos.map(it => chaveItem(it)) }))
    } catch (e) {
      console.error(e); alert("Não consegui carregar os SKUs deste modelo.")
    } finally { setCarregandoModelo(null) }
  }

  // Nome clicavel: joga o modelo no filtro global e leva para a aba Produtos.
  function abrirModelo(modelo: string) {
    setFiltros({ ...filtros, modelos: [modelo] })
    setAba("produtos")
    dispararBusca()
  }

  const colsModelos = useMemo(() => [
    { key: "sel", label: "✓", align: "center" as const, render: (r: any) => (
      carregandoModelo === r.modelo
        ? <span style={{ fontSize: "11px", color: "var(--muted)" }}>...</span>
        : <input type="checkbox" checked={!!modelosMarcados[r.modelo]}
            onChange={() => alternarModelo(r.modelo)}
            title="Marcar todos os SKUs deste modelo (respeita os filtros ativos)"
            style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary)" }} />
    ) },
    { key: "modelo", label: "Modelo", bold: true, render: (r: any) => (
      <span onClick={() => abrirModelo(r.modelo)} title="Ver os produtos deste modelo"
        style={{ cursor: "pointer", fontWeight: 600, textDecoration: "underline",
                 textDecorationStyle: "dotted" as const, textUnderlineOffset: "3px" }}>
        {r.modelo}
      </span>
    ) },
    { key: "qtd_vendida", label: "Qtd Vendida", tipo: "num" as const, align: "right" as const, bold: true },
    { key: "receita", label: "Receita", tipo: "moeda" as const, align: "right" as const, cor: "var(--primary)" },
    { key: "estoque_rede", label: "Estoque", tipo: "num" as const, align: "right" as const, bold: true, clicavel: true },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [carregandoModelo, modelosMarcados, filtros])

  // ---- SELECAO (carrinho) na aba Produtos --------------------------------
  // Cada linha da aba Produtos JA e' um SKU (cod_produto + cor + tamanho), mesma
  // granularidade do carrinho — entao a linha vira um ItemSelecionado direto.
  // Sem cod_produto nao da' para selecionar: o Relatorio recorta por cod_produto
  // (ver focca-relatorio-estratificacao) e um item sem cod encheria o carrinho sem
  // recortar nada, deixando a tela em "foco" e os numeros em panorama.
  const itemDeLinha = useCallback((r: any): ItemSelecionado | null => {
    if (r?.cod_produto == null || r.cod_produto === "") return null
    return {
      cod_produto: r.cod_produto,
      produto: r.produto, cor: r.cor ?? "", tamanho: r.tamanho ?? "",
      modelo: r.modelo, marca: r.marca, colecao: r.colecao,
      // snapshot: `estoque_rede` daqui ja exclui o CD, igual ao resto das telas.
      // Nao ha' saldo POR LOJA nesta consulta — o Relatorio busca o fresco em /produto/grade.
      totalRede: Number(r.estoque_rede) || 0,
      imagem: r.imagem ?? null,
    }
  }, [])

  // Set de chaves em vez de `temItem`: uma consulta O(1) por linha, e uma unica
  // dependencia para os memos das colunas.
  const chavesSel = useMemo(() => new Set(itens.map(it => chaveItem(it))), [itens])

  // Linhas selecionaveis da lista atual (so a aba Produtos tem granularidade de SKU)
  const selecionaveis = useMemo(
    () => (aba === "produtos" ? lista.map(itemDeLinha).filter(Boolean) as ItemSelecionado[] : []),
    [aba, lista, itemDeLinha]
  )
  const nSelNaLista = useMemo(
    () => selecionaveis.reduce((n, it) => n + (chavesSel.has(chaveItem(it)) ? 1 : 0), 0),
    [selecionaveis, chavesSel]
  )
  const todosDaListaMarcados = selecionaveis.length > 0 && nSelNaLista === selecionaveis.length

  function alternarListaInteira() {
    if (todosDaListaMarcados) selecionaveis.forEach(it => remover(chaveItem(it)))
    else adicionarVarios(selecionaveis)
  }

  const colsProdutos = useMemo(() => [
    // Sem `sortBy` de proposito: ordenar por "marcado" faria a linha pular para o
    // topo no instante do clique, e marcar varias seguidas vira caça ao rato.
    // Quem quer ver o que marcou abre o painel do carrinho.
    { key: "sel", label: "✓", align: "center" as const, render: (r: any) => {
      const it = itemDeLinha(r)
      if (!it) return <span title="Sem código de produto — não dá para analisar este item isolado" style={{ color: "var(--muted)" }}>—</span>
      return (
        <input type="checkbox" checked={chavesSel.has(chaveItem(it))} onChange={() => toggle(it)}
          title="Marcar para analisar no Relatório"
          style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary)" }} />
      )
    } },
    { key: "produto", label: "Produto", tdStyle: { fontWeight: 600, maxWidth: "260px" }, render: (r: any) => (
      <span title={r.produto} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <MiniFoto url={r.imagem} alt={r.produto} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.produto}</span>
      </span>
    ) },
    // amostra de cor: a foto do ERP e' a mesma para todas as cores do produto
    { key: "cor", label: "Cor", tdStyle: { color: "var(--muted)" }, render: (r: any) => <Cor nome={r.cor} /> },
    { key: "tamanho", label: "Tam", align: "center" as const, tdStyle: { fontWeight: 700 } },
    { key: "modelo", label: "Modelo" },
    { key: "marca", label: "Marca" },
    { key: "colecao", label: "Coleção", tdStyle: { color: "var(--muted)", maxWidth: "140px", overflow: "hidden" as const, textOverflow: "ellipsis" as const }, render: (r: any) => <span title={r.colecao}>{r.colecao}</span> },
    { key: "qtd_vendida", label: "Qtd", align: "right" as const, sortBy: (r: any) => Number(r.qtd_vendida) || 0, tdStyle: { fontWeight: 700 }, render: (r: any) => Number(r.qtd_vendida).toLocaleString("pt-BR") },
    { key: "receita", label: "Receita", align: "right" as const, sortBy: (r: any) => Number(r.receita) || 0, tdStyle: { color: "var(--primary)", fontWeight: 600 }, render: (r: any) => fmtR(r.receita) },
    { key: "margem_media", label: "Margem", align: "center" as const, sortBy: (r: any) => Number(r.margem_media) || 0, render: (r: any) => `${r.margem_media ?? "-"}%` },
    { key: "estoque_rede", label: "Estoque", align: "right" as const, sortBy: (r: any) => Number(r.estoque_rede) || 0, render: (r: any) => (
      <span onClick={() => setModalEstoque({ aberto: true, cod: Number(r.cod_produto), titulo: r.produto })} title="Ver estoque por loja"
        style={{ cursor: "pointer", fontWeight: 700, textDecoration: "underline", textDecorationStyle: "dotted" as const, textUnderlineOffset: "3px", color: Number(r.estoque_rede) === 0 ? "var(--danger)" : "var(--text)" }}>
        {Number(r.estoque_rede ?? 0).toLocaleString("pt-BR")}
      </span>
    ) },
  ], [fmtR, chavesSel, toggle, itemDeLinha])

  const colsLojas = useMemo(() => [
    { key: "nome_loja", label: "Loja", tdStyle: { fontWeight: 600 }, render: (r: any) => r.nome_loja?.replace("FOCCA JEANS - ", "").replace("FOCCA ", "") },
    { key: "num_vendas", label: "Nº Vendas", align: "center" as const },
    { key: "pecas_vendidas", label: "Peças", align: "center" as const, sortBy: (r: any) => Number(r.pecas_vendidas) || 0, render: (r: any) => Number(r.pecas_vendidas || 0).toLocaleString("pt-BR") },
    { key: "receita_total", label: "Receita", align: "right" as const, sortBy: (r: any) => Number(r.receita_total) || 0, tdStyle: { color: "var(--primary)", fontWeight: 600 }, render: (r: any) => fmtR(r.receita_total) },
    { key: "margem_media", label: "Margem", align: "right" as const, sortBy: (r: any) => Number(r.margem_media) || 0, tdStyle: { fontWeight: 600 }, render: (r: any) => <span style={{ color: Number(r.margem_media) >= 0 ? "var(--success)" : "var(--danger)" }}>{Number(r.margem_media || 0).toFixed(1)}%</span> },
  ], [fmtR])

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Visão Geral</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
            Dinâmica de vendas por produto, tamanho, coleção, marca e loja — respeitando os filtros globais
          </p>
        </div>
        <SeletorPeriodo />
      </div>

      <FiltroGlobal onBuscar={buscar} loading={loading} />
      <FraseRecorte vazio={{ pecas: Number(kpis.pecas_vendidas || 0), buscaFeita: buscaFeita && !loading }} />

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
          <GraficoReceita dados={receitaDia} granularidade={granularidade} />
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

      {/* BARRA DE SELECAO — so na aba Produtos, a unica com granularidade de SKU.
          E o elo que faltava: descobrir aqui e aprofundar no Relatorio sem ter de
          reencontrar o produto no Compras (nomes quase identicos sao indistinguiveis
          por texto). Nao ha' export proprio aqui de proposito: o caminho de export
          e' um so', o do Relatorio. */}
      {aba === "produtos" && !loading && lista.length > 0 && (
        <div style={{
          background: itens.length ? "var(--primary-light)" : "var(--surface)",
          border: `1px solid ${itens.length ? "var(--primary)" : "var(--border)"}`,
          borderRadius: "10px", padding: "10px 14px", marginBottom: "12px",
          display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text)", cursor: "pointer" }}>
            <input type="checkbox" checked={todosDaListaMarcados} onChange={alternarListaInteira}
              style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary)" }} />
            {todosDaListaMarcados ? "Desmarcar" : "Marcar"} os {selecionaveis.length} SKUs desta lista
          </label>

          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            {nSelNaLista} marcado{nSelNaLista === 1 ? "" : "s"} aqui
            {itens.length > nSelNaLista && ` · ${itens.length} no carrinho ao todo`}
          </span>

          <div style={{ flex: 1 }} />

          {itens.length > 0 && (
            <button onClick={() => router.push("/compras")} style={{
              padding: "8px 12px", background: "none", border: "1px solid var(--border)",
              borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px",
            }}>Ver no Compras</button>
          )}

          {/* Os filtros globais ja' viajam pelo FiltroContext (persistido em
              localStorage), entao o Relatorio abre com o mesmo recorte — o botao
              so' precisa navegar. */}
          <button onClick={() => router.push("/relatorio")} style={{
            padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700,
            border: itens.length ? "none" : "1px solid var(--border)",
            background: itens.length ? "var(--primary)" : "var(--surface2)",
            color: itens.length ? "#fff" : "var(--text)",
          }}>
            {itens.length ? `Ver relatório destes (${itens.length}) →` : "Ver relatório deste recorte →"}
          </button>
        </div>
      )}

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
            colunas={colsColecoes}
            onClicar={onClicarColecao}
          />
        ) : aba === "marcas" ? (
          <AbaComGrafico
            lista={lista}
            campoLabel="marca"
            campoValor="receita"
            fmtR={fmtR}
            tituloGrafico="Top marcas por receita"
            colunas={colsMarcas}
            onClicar={onClicarMarca}
          />
        ) : aba === "modelos" ? (
          <AbaComGrafico
            lista={lista}
            campoLabel="modelo"
            campoValor="receita"
            fmtR={fmtR}
            tituloGrafico="Top modelos por receita"
            onClicar={onClicarModelo}
            colunas={colsModelos}
          />
        ) : aba === "produtos" ? (
          // altura liga a virtualizacao: com o recorte inteiro sao ~20 mil linhas,
          // e uma <table> comum com isso trava o navegador.
          <TabelaOrdenavel linhas={lista} initialKey="qtd_vendida" colunas={colsProdutos}
            altura={Math.min(680, Math.max(240, lista.length * 41 + 42))} />
        ) : (
          <TabelaOrdenavel linhas={lista} initialKey="receita_total" colunas={colsLojas} />
        )}
      </div>

      <ModalEstoque
        aberto={modalEstoque.aberto}
        onFechar={() => setModalEstoque({ aberto: false })}
        codProduto={modalEstoque.cod}
        modelo={modalEstoque.modelo}
        titulo={modalEstoque.titulo}
        extraQuery={(() => {
          // URLSearchParams para a dimensao clicada SOBRESCREVER o filtro global —
          // concatenar string duplicaria `colecao=` e o backend leria o valor errado
          const q = new URLSearchParams(queryEstoqueModal)
          if (modalEstoque.colecao) q.set("colecao", modalEstoque.colecao)
          if (modalEstoque.marca) q.set("marca", modalEstoque.marca)
          return q.toString()
        })()}
      />
    </div>
  )
}

// Aba de tamanhos com grafico de barras (curva de grade)
const AbaTamanhos = memo(function AbaTamanhos({ lista, fmtR }: { lista: any[], fmtR: (n: number) => string }) {
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
})
