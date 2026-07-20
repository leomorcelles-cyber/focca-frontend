"use client"
import { useState, useEffect, useMemo } from "react"
import FiltroGlobal from "@/components/FiltroGlobal"
import { useFiltros, resolverColecoes } from "@/components/FiltroContext"
import { useSelecao } from "@/components/SelecaoContext"
import TabelaOrdenavel from "@/components/TabelaOrdenavel"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
const MAX_LINHAS = 500  // exibicao; o Excel leva a lista completa
const DIAS = 90

const fmtMoeda = (v: any) => v == null || v === "" ? "—" : `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtInt   = (v: any) => v == null || v === "" ? "—" : Number(v).toLocaleString("pt-BR")
const fmtPct   = (v: any) => v == null || v === "" ? "—" : `${Number(v).toFixed(1)}%`
const URG_COR: Record<string, string> = { RUPTURA: "var(--danger)", CRITICO: "var(--danger)", ALTO: "var(--warning)", MEDIO: "var(--muted)" }

function alignFor(t: string) {
  return t === "moeda" || t === "int" || t === "pct" ? "right" : t === "urgencia" ? "center" : "left"
}

// Converte a secao (colunas: string[], tipos: string[], linhas: any[][]) do backend
// no formato do TabelaOrdenavel, aplicando a MESMA formatacao do Excel.
function secaoParaTabela(sec: any) {
  const tipos: string[] = sec.tipos || []
  const colunas = sec.colunas.map((label: string, i: number) => {
    const t = tipos[i] || "txt"
    const key = `c${i}`
    const col: any = { key, label, align: alignFor(t) as any }
    if (t === "moeda") { col.sortBy = (r: any) => Number(r[key]) || 0; col.render = (r: any) => fmtMoeda(r[key]); col.tdStyle = { color: "var(--primary)", fontWeight: 600 } }
    else if (t === "pct") { col.sortBy = (r: any) => Number(r[key]) || 0; col.render = (r: any) => fmtPct(r[key]) }
    else if (t === "int") { col.sortBy = (r: any) => Number(r[key]) || 0; col.render = (r: any) => fmtInt(r[key]) }
    else if (t === "urgencia") { col.render = (r: any) => <span style={{ fontWeight: 700, color: URG_COR[String(r[key]).toUpperCase()] || "var(--text)" }}>{r[key]}</span> }
    else if (i === 1) { col.tdStyle = { fontWeight: 600, maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } ; col.render = (r: any) => <span title={r[key]}>{r[key]}</span> }
    return col
  })
  const linhas = sec.linhas.slice(0, MAX_LINHAS).map((row: any[]) => {
    const o: any = {}
    row.forEach((v, i) => { o[`c${i}`] = v })
    return o
  })
  return { colunas, linhas, total: sec.linhas.length }
}

export default function RelatorioPage() {
  const { filtros, versaoBusca } = useFiltros()
  const { itens } = useSelecao()
  const [opPorAno, setOpPorAno] = useState<Record<string, string[]>>({})
  const [rep, setRep] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()).then(c => setOpPorAno(c.por_ano || {})).catch(() => {})
  }, [])

  // Monta os parametros a partir dos filtros globais + produtos do carrinho.
  function montarParams() {
    const colecoesAlvo = resolverColecoes(filtros, opPorAno)
    const p = new URLSearchParams({ dias: String(DIAS) })
    if (filtros.lojas.length)    p.set("loja",    filtros.lojas.join(","))
    if (filtros.marcas.length)   p.set("marca",   filtros.marcas.join(","))
    if (filtros.modelos.length)  p.set("modelo",  filtros.modelos.join(","))
    if (filtros.sexos.length)    p.set("sexo",    filtros.sexos.join(","))
    if (filtros.cores.length)    p.set("cor",     filtros.cores.join(","))
    if (filtros.colecoes.length) p.set("colecao", filtros.colecoes.join(","))
    else if (filtros.anos.length && filtros.estacoes.length && colecoesAlvo.length) p.set("colecao", colecoesAlvo.join(","))
    else if (filtros.anos.length) p.set("ano", filtros.anos.join(","))
    if (filtros.saldoMax !== null) p.set("saldo_max", String(filtros.saldoMax))
    // Carrinho: prioriza os produtos selecionados; senao usa o filtro global.
    const produtosCarrinho = [...new Set(itens.map(it => it.produto))]
    const produtos = produtosCarrinho.length ? produtosCarrinho : filtros.produtos
    if (produtos.length) p.set("produto", produtos.join(","))
    if (filtros.ids.trim()) p.set("cod_produto", filtros.ids.split(/[\s,;]+/).filter(Boolean).join(","))
    return p
  }

  async function gerar() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/relatorio/compras?${montarParams()}`)
      setRep(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { gerar() /* eslint-disable-next-line */ }, [versaoBusca, itens.length])

  function exportExcel() { window.open(`${API_URL}/export/compras?${montarParams()}`) }
  function exportPDF() { window.print() }

  const secoes = rep?.secoes || []
  const resumo = secoes.find((s: any) => s.titulo === "Resumo Executivo")
  const estoque = secoes.find((s: any) => s.titulo === "Estoque por Loja")
  const transf = secoes.find((s: any) => s.titulo === "Transferências por Giro")

  const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", marginBottom: "16px" }

  function TabelaSecao({ sec }: { sec: any }) {
    const t = useMemo(() => secaoParaTabela(sec), [sec])
    return (
      <>
        <TabelaOrdenavel colunas={t.colunas} linhas={t.linhas} />
        {t.total > MAX_LINHAS && (
          <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--muted)" }}>
            Mostrando {MAX_LINHAS} de {t.total.toLocaleString("pt-BR")} linhas — baixe o Excel para a lista completa.
          </div>
        )}
      </>
    )
  }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <style>{`@media print { aside, .no-print { display: none !important; } main { padding: 0 !important; } }`}</style>

      <div className="no-print" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Relatório de Compras</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
            Estoque por loja, vendas/giro dos últimos {DIAS} dias e sugestões de transferência — a mesma visão do Excel.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={exportExcel} style={{ padding: "8px 14px", background: "var(--success)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>⬇ Excel</button>
          <button onClick={exportPDF} style={{ padding: "8px 14px", background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>⬇ PDF</button>
        </div>
      </div>

      <div className="no-print"><FiltroGlobal onBuscar={gerar} loading={loading} mostrarSaldo /></div>

      {rep?.subtitulo && (
        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "12px" }}>{rep.subtitulo}</div>
      )}

      {loading ? (
        <div style={{ ...card, padding: "40px", textAlign: "center", color: "var(--muted)" }}>Gerando relatório...</div>
      ) : !rep ? null : (
        <>
          {/* RESUMO EXECUTIVO — lista de indicadores */}
          {resumo && (
            <div style={card}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Resumo Executivo</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: "10px" }}>
                {resumo.linhas.map((row: any[], i: number) => {
                  const [ind, qtd, valor] = row
                  const valorTxt = valor != null ? fmtMoeda(valor) : fmtInt(qtd)
                  return (
                    <div key={i} style={{ background: "var(--surface2)", borderRadius: "8px", padding: "10px 12px" }}>
                      <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{ind}</div>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: valor != null ? "var(--primary)" : "var(--text)" }}>{valorTxt}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ESTOQUE POR LOJA + vendas/giro/cobertura + sugestao */}
          {estoque && (
            <div style={card}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Estoque por Loja · Vendas/Giro · Sugestão de Transferência</h2>
              {estoque.linhas.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: "13px" }}>Nenhum produto no recorte atual.</div>
              ) : <TabelaSecao sec={estoque} />}
            </div>
          )}

          {/* TRANSFERENCIAS POR GIRO */}
          {transf && (
            <div style={card}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Transferências por Giro</h2>
              {transf.linhas.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: "13px" }}>Nenhuma transferência sugerida para este recorte.</div>
              ) : <TabelaSecao sec={transf} />}
            </div>
          )}
        </>
      )}
    </div>
  )
}
