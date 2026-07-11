"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import FiltroGlobal, { LOJAS } from "@/components/FiltroGlobal"
import { useFiltros, resolverColecoes} from "@/components/FiltroContext"
import { useSelecao } from "@/components/SelecaoContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const LOJAS_NOMES: Record<string, string> = {
  "1": "P.Nereu", "3": "Vidal", "4": "Imbuiá", "5": "Lontras", "6": "Chapadão", "7": "Hype",
}

const SECOES = [
  { key: "estoque",     label: "Resumo de Estoque" },
  { key: "vendas",      label: "KPIs de Vendas" },
  { key: "topprodutos", label: "Top Produtos" },
  { key: "topmarcas",   label: "Top Marcas" },
  { key: "tamanhos",    label: "Curva de Tamanhos" },
  { key: "lojas",  label: "Vendas por Loja" },
]

export default function RelatorioPage() {
  const { filtros, versaoBusca } = useFiltros()
  const [dias, setDias] = useState(30)
  const { itens } = useSelecao()
  const [secoesSel, setSecoesSel] = useState<string[]>(["estoque", "vendas", "topprodutos", "tamanhos"])
  const [opPorAno, setOpPorAno] = useState<Record<string,string[]>>({})
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const [itensAtualizados, setItensAtualizados] = useState<any[]>([])
  const [atualizandoCarrinho, setAtualizandoCarrinho] = useState(false)

  // Busca o saldo/preco ATUAL de cada item do carrinho (ultima sincronizacao, max 15min)
  useEffect(() => {
    if (itens.length === 0) { setItensAtualizados([]); return }
    let cancelado = false
    setAtualizandoCarrinho(true)
    // Agrupa por produto+cor para minimizar chamadas (uma grade traz todos os tamanhos)
    const chavesPC = [...new Set(itens.map(it => `${it.produto}|||${it.cor}`))]
    Promise.all(chavesPC.map(pc => {
      const [produto, cor] = pc.split("|||")
      const q = new URLSearchParams({ produto })
      if (cor) q.set("cor", cor)
      return fetch(`${API_URL}/produto/grade?${q}`).then(r => r.json()).catch(() => [])
    })).then(grades => {
      if (cancelado) return
      // Mapa: cod_produto -> {lojas, preco}
      const mapa: Record<string, any> = {}
      grades.flat().forEach((linha: any) => {
        if (!linha || linha.cod_produto == null) return
        const lojas: Record<string, number> = {}
        LOJAS.forEach(l => { lojas[String(l.id)] = Number(linha.lojas?.[String(l.id)]) || 0 })
        mapa[String(linha.cod_produto)] = {
          lojas,
          totalRede: Object.values(lojas).reduce((s: number, v: number) => s + v, 0),
          preco_venda: linha.preco_venda ?? null,
        }
      })
      // Atualiza cada item do carrinho com os dados frescos (mantem o snapshot se nao achar)
      const atualizados = itens.map(it => {
        const fresco = mapa[String(it.cod_produto)]
        return fresco ? { ...it, lojas: fresco.lojas, totalRede: fresco.totalRede, preco_venda: fresco.preco_venda } : it
      })

      // Busca VENDAS por match EXATO de atributos (backend resolve pelos cod_produto)
      fetch(`${API_URL}/carrinho/vendas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itens: atualizados.map(it => ({ cod_produto: it.cod_produto, produto: it.produto, cor: it.cor, colecao: it.colecao, tamanho: it.tamanho })),
          dias: 365,
        }),
      }).then(r => r.json()).then(vend => {
        if (cancelado) return
        const vItens = vend?.itens || []
        // Mescla vendas por posicao (mesma ordem enviada)
        const comVendas = atualizados.map((it, idx) => {
          const v = vItens[idx] || {}
          return { ...it, vd_pecas: v.pecas ?? 0, vd_receita: v.receita ?? 0, vd_vendas: v.vendas ?? 0, vd_pecas_tam: v.pecas_tamanho ?? 0, vd_receita_tam: v.receita_tamanho ?? 0 }
        })
        setItensAtualizados(comVendas)
        setAtualizandoCarrinho(false)
      }).catch(() => {
        if (cancelado) return
        setItensAtualizados(atualizados)  // sem vendas, ao menos mostra saldo
        setAtualizandoCarrinho(false)
      })
    })
    return () => { cancelado = true }
  }, [itens])

  useEffect(() => {
    fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()).then(c => setOpPorAno(c.por_ano || {})).catch(() => {})
  }, [])

  // Agrupa SKUs duplicados (mesmo produto+cor+tamanho, cods/precos diferentes do Microvix)
  // numa linha so: soma saldo das lojas, junta faixa de preco, vendido aparece uma vez.
  function agruparItens(lista: any[]) {
    const mapa = new Map<string, any>()
    for (const it of lista) {
      const chave = `${it.produto}||${it.cor}||${it.tamanho}`
      if (!mapa.has(chave)) {
        // clona somando lojas a partir do zero
        const lojas: Record<string, number> = {}
        LOJAS.forEach(l => { lojas[String(l.id)] = Number(it.lojas?.[String(l.id)]) || 0 })
        mapa.set(chave, {
          ...it,
          lojas,
          totalRede: Object.values(lojas).reduce((s: number, v: number) => s + v, 0),
          precos: it.preco_venda ? [Number(it.preco_venda)] : [],
          _ncods: 1,
        })
      } else {
        const ex = mapa.get(chave)
        LOJAS.forEach(l => { ex.lojas[String(l.id)] += Number(it.lojas?.[String(l.id)]) || 0 })
        ex.totalRede = Object.values(ex.lojas).reduce((s: number, v: any) => s + Number(v), 0)
        if (it.preco_venda) ex.precos.push(Number(it.preco_venda))
        ex._ncods += 1
        // vendido por atributos e o mesmo para os duplicados — mantem (nao soma)
      }
    }
    return Array.from(mapa.values())
  }

  function montarParams() {
    // Com carrinho, expande o periodo para 365 dias (captura historico dos produtos marcados)
    const diasEfetivo = itens.length > 0 ? Math.max(dias, 365) : dias
    const p = new URLSearchParams({ dias: String(diasEfetivo), secoes: secoesSel.join(",") })
    if (filtros.lojas.length)    p.set("loja",    filtros.lojas.join(","))
    if (filtros.marcas.length)   p.set("marca",   filtros.marcas.join(","))
    if (filtros.modelos.length)  p.set("modelo",  filtros.modelos.join(","))
    if (filtros.sexos.length)    p.set("sexo",    filtros.sexos.join(","))
    if (filtros.anos.length)     p.set("ano",     filtros.anos.join(","))
    if (filtros.colecoes.length) {
      p.set("colecao", filtros.colecoes.join(","))
    } else if (filtros.anos.length && filtros.estacoes.length) {
      const cols = resolverColecoes(filtros, opPorAno)
      if (cols.length) p.set("colecao", cols.join(","))
    }

    // PRODUTO: combina o filtro global de produto + os produtos do carrinho.
    // Se houver itens no carrinho, as secoes de cima passam a focar nesses produtos.
    const produtosGlobais = filtros.produtos || []
    const produtosCarrinho = [...new Set(itens.map(it => it.produto))]
    const produtosTodos = [...new Set([...produtosGlobais, ...produtosCarrinho])]
    if (produtosTodos.length) p.set("produto", produtosTodos.join(","))

    return p
  }

  async function gerar() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/relatorio/consolidado?${montarParams()}`)
      setDados(await res.json())
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { gerar() /* eslint-disable-next-line */ }, [versaoBusca, dias, secoesSel.join(","), itens.length])

  function toggleSecao(k: string) {
    setSecoesSel(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])
  }

  const fmtR = (n: number) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  const fmtN = (n: number) => Number(n || 0).toLocaleString("pt-BR")

  // ----- EXPORT CSV -----
  function exportCSV() {
    let csv = "RELATORIO FOCCA JEANS\n\n"
    const s = dados?.secoes || {}
    if (s.estoque) {
      csv += "RESUMO DE ESTOQUE\n"
      csv += "SKUs;Pecas;Criticos;Saudaveis;Marcas;Colecoes\n"
      const e = s.estoque
      csv += `${e.skus};${e.pecas};${e.criticos};${e.saudaveis};${e.marcas};${e.colecoes}\n\n`
    }
    if (s.vendas) {
      csv += "KPIs DE VENDAS\n"
      csv += "Num Vendas;Pecas;Receita;Ticket Medio;Margem\n"
      const v = s.vendas
      csv += `${v.num_vendas};${v.pecas_vendidas};${v.receita};${v.ticket_medio};${v.margem_media}\n\n`
    }
    if (s.topprodutos?.length) {
      csv += "TOP PRODUTOS\nProduto;Cor;Modelo;Marca;Colecao;Qtd;Receita\n"
      s.topprodutos.forEach((p: any) => { csv += `${p.produto};${p.cor};${p.modelo};${p.marca};${p.colecao};${p.qtd};${p.receita}\n` })
      csv += "\n"
    }
    if (s.tamanhos?.length) {
      csv += "CURVA DE TAMANHOS\nTamanho;Qtd;Receita\n"
      s.tamanhos.forEach((t: any) => { csv += `${t.tamanho};${t.qtd};${t.receita}\n` })
      csv += "\n"
    }
    const itensExp = agruparItens(itensAtualizados.length ? itensAtualizados : itens)
    if (itensExp.length) {
      csv += "ITENS SELECIONADOS (CARRINHO)\nProduto;Cor;Tamanho;Marca;Preco;" + LOJAS.map(l => l.nome).join(";") + ";Total Rede;Vendido tam;Vendido produto;Receita produto\n"
      itensExp.forEach(it => {
        const saldos = LOJAS.map(l => it.lojas?.[String(l.id)] ?? 0).join(";")
        const preco = it.precos?.length ? (Math.min(...it.precos) === Math.max(...it.precos) ? Math.min(...it.precos) : `${Math.min(...it.precos)}~${Math.max(...it.precos)}`) : ""
        csv += `${it.produto};${it.cor};${it.tamanho};${it.marca || ""};${preco};${saldos};${it.totalRede ?? 0};${it.vd_pecas_tam ?? 0};${it.vd_pecas ?? 0};${it.vd_receita ?? 0}\n`
      })
    }
    baixar(csv, "relatorio_focca.csv", "text/csv")
  }

  // ----- EXPORT EXCEL (xls via HTML table) -----
  function exportExcel() {
    let html = '<html><head><meta charset="utf-8"></head><body>'
    html += "<h2>Relatorio Focca Jeans</h2>"
    const s = dados?.secoes || {}
    if (s.vendas) {
      html += "<h3>KPIs de Vendas</h3><table border=1><tr><th>Receita</th><th>Pecas</th><th>Vendas</th><th>Ticket</th><th>Margem</th></tr>"
      html += `<tr><td>${s.vendas.receita}</td><td>${s.vendas.pecas_vendidas}</td><td>${s.vendas.num_vendas}</td><td>${s.vendas.ticket_medio}</td><td>${s.vendas.margem_media}%</td></tr></table>`
    }
    if (s.topprodutos?.length) {
      html += "<h3>Top Produtos</h3><table border=1><tr><th>Produto</th><th>Cor</th><th>Marca</th><th>Qtd</th><th>Receita</th></tr>"
      s.topprodutos.forEach((p: any) => { html += `<tr><td>${p.produto}</td><td>${p.cor}</td><td>${p.marca}</td><td>${p.qtd}</td><td>${p.receita}</td></tr>` })
      html += "</table>"
    }
    const itensExpX = agruparItens(itensAtualizados.length ? itensAtualizados : itens)
    if (itensExpX.length) {
      html += "<h3>Itens Selecionados</h3><table border=1><tr><th>Produto</th><th>Cor</th><th>Tam</th><th>Marca</th><th>Preco</th>"
      LOJAS.forEach(l => html += `<th>${l.nome}</th>`)
      html += "<th>Total</th><th>Vendido tam</th><th>Vendido produto</th><th>Receita produto</th></tr>"
      itensExpX.forEach(it => {
        const preco = it.precos?.length ? (Math.min(...it.precos) === Math.max(...it.precos) ? Math.min(...it.precos) : `${Math.min(...it.precos)}~${Math.max(...it.precos)}`) : ""
        html += `<tr><td>${it.produto}</td><td>${it.cor}</td><td>${it.tamanho}</td><td>${it.marca || ""}</td><td>${preco}</td>`
        LOJAS.forEach(l => html += `<td>${it.lojas?.[String(l.id)] ?? 0}</td>`)
        html += `<td>${it.totalRede ?? 0}</td><td>${it.vd_pecas_tam ?? 0}</td><td>${it.vd_pecas ?? 0}</td><td>${it.vd_receita ?? 0}</td></tr>`
      })
      html += "</table>"
    }
    html += "</body></html>"
    baixar(html, "relatorio_focca.xls", "application/vnd.ms-excel")
  }

  function exportPDF() { window.print() }

  function baixar(conteudo: string, nome: string, tipo: string) {
    const blob = new Blob(["\ufeff" + conteudo], { type: `${tipo};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = nome; a.click()
    URL.revokeObjectURL(url)
  }

  const s = dados?.secoes || {}
  const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", marginBottom: "16px" }
  const th = { padding: "8px 12px", textAlign: "left" as const, fontSize: "10px", color: "var(--muted)" as const, fontWeight: 600 as const, textTransform: "uppercase" as const, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" as const }
  const td = { padding: "8px 12px", fontSize: "12px", borderBottom: "1px solid var(--border)" }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <style>{`@media print { aside, .no-print { display: none !important; } main { padding: 0 !important; } }`}</style>

      <div className="no-print" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Relatório</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>Overview consolidado conforme os filtros e a seleção</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <select value={dias} onChange={e => setDias(Number(e.target.value))} style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "13px", background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}>
            <option value={7}>7 dias</option><option value={15}>15 dias</option><option value={30}>30 dias</option><option value={60}>60 dias</option><option value={90}>90 dias</option>
          </select>
          <button onClick={exportPDF} style={{ padding: "8px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>⬇ PDF</button>
          <button onClick={exportExcel} style={{ padding: "8px 14px", background: "var(--success)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>⬇ Excel</button>
          <button onClick={exportCSV} style={{ padding: "8px 14px", background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>⬇ CSV</button>
        </div>
      </div>

      <div className="no-print"><FiltroGlobal onBuscar={gerar} loading={loading} mostrarSaldo /></div>

      {/* Seletor de secoes */}
      <div className="no-print" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Seções:</span>
        {SECOES.map(sec => (
          <label key={sec.key} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text)", cursor: "pointer" }}>
            <input type="checkbox" checked={secoesSel.includes(sec.key)} onChange={() => toggleSecao(sec.key)} style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
            {sec.label}
          </label>
        ))}
      </div>

      {/* RELATORIO */}
      <div ref={reportRef}>
        <div style={{ ...card, borderColor: "var(--primary)" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--primary)" }}>Relatório Focca Jeans</div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
            Período: últimos {dias} dias · Gerado em {new Date().toLocaleString("pt-BR")}
            {filtros.marcas.length > 0 && ` · Marcas: ${filtros.marcas.join(", ")}`}
            {filtros.produtos.length > 0 && ` · ${filtros.produtos.length} produtos no filtro`}
          </div>
          {itens.length > 0 && (
            <div className="no-print" style={{ marginTop: "10px", padding: "8px 12px", background: "var(--primary-light)", borderRadius: "8px", fontSize: "12px", color: "var(--primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              🛒 As seções abaixo estão focadas nos {[...new Set(itens.map(it => it.produto))].length} produtos da sua seleção (carrinho). Esvazie o carrinho para ver o panorama completo.
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Gerando relatório...</div>
        ) : (
          <>
            {secoesSel.includes("estoque") && s.estoque && !s.estoque.erro && (
              <div style={card}>
                <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Resumo de Estoque</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px,1fr))", gap: "10px" }}>
                  {[
                    { l: "SKUs", v: fmtN(s.estoque.skus) },
                    { l: "Peças", v: fmtN(s.estoque.pecas) },
                    { l: "Críticos", v: fmtN(s.estoque.criticos) },
                    { l: "Saudáveis", v: fmtN(s.estoque.saudaveis) },
                    { l: "Marcas", v: fmtN(s.estoque.marcas) },
                    { l: "Coleções", v: fmtN(s.estoque.colecoes) },
                  ].map((k, i) => (
                    <div key={i} style={{ background: "var(--surface2)", borderRadius: "8px", padding: "10px 12px" }}>
                      <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>{k.l}</div>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>{k.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {secoesSel.includes("vendas") && s.vendas && !s.vendas.erro && (
              <div style={card}>
                <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>KPIs de Vendas ({itens.length > 0 ? "365" : dias} dias{itens.length > 0 ? " · período expandido p/ os produtos da seleção" : ""})</h2>
                {itens.length > 0 && Number(s.vendas.num_vendas || 0) === 0 && (
                  <div style={{ padding: "10px 12px", background: "var(--warning-light, #fff3cd)", borderRadius: "8px", fontSize: "12px", color: "var(--warning, #856404)", marginBottom: "12px" }}>
                    ⚠️ Os produtos selecionados não tiveram vendas registradas no período. Isso pode indicar itens parados em estoque (sem giro).
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: "10px" }}>
                  {[
                    { l: "Receita", v: fmtR(s.vendas.receita), c: "var(--primary)" },
                    { l: "Peças", v: fmtN(s.vendas.pecas_vendidas), c: "var(--success)" },
                    { l: "Nº Vendas", v: fmtN(s.vendas.num_vendas) },
                    { l: "Ticket Médio", v: fmtR(s.vendas.ticket_medio), c: "var(--warning)" },
                    { l: "Margem", v: `${s.vendas.margem_media}%`, c: "var(--success)" },
                  ].map((k, i) => (
                    <div key={i} style={{ background: "var(--surface2)", borderRadius: "8px", padding: "10px 12px" }}>
                      <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>{k.l}</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: k.c || "var(--text)" }}>{k.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {secoesSel.includes("topprodutos") && s.topprodutos?.length > 0 && (
              <div style={card}>
                <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Top Produtos</h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["Produto","Cor","Marca","Coleção","Qtd","Receita"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {s.topprodutos.map((p: any, i: number) => (
                        <tr key={i}>
                          <td style={{ ...td, fontWeight: 600 }}>{p.produto}</td>
                          <td style={{ ...td, color: "var(--muted)" }}>{p.cor}</td>
                          <td style={td}>{p.marca}</td>
                          <td style={{ ...td, color: "var(--muted)", fontSize: "11px" }}>{p.colecao}</td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtN(p.qtd)}</td>
                          <td style={{ ...td, textAlign: "right", color: "var(--primary)", fontWeight: 600 }}>{fmtR(p.receita)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {secoesSel.includes("topmarcas") && s.topmarcas?.length > 0 && (
              <div style={card}>
                <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Top Marcas</h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["Marca","Qtd","Receita","Vendas"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {s.topmarcas.map((m: any, i: number) => (
                        <tr key={i}>
                          <td style={{ ...td, fontWeight: 600 }}>{m.marca}</td>
                          <td style={{ ...td, textAlign: "right" }}>{fmtN(m.qtd)}</td>
                          <td style={{ ...td, textAlign: "right", color: "var(--primary)", fontWeight: 600 }}>{fmtR(m.receita)}</td>
                          <td style={{ ...td, textAlign: "center", color: "var(--muted)" }}>{m.vendas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {secoesSel.includes("tamanhos") && s.tamanhos?.length > 0 && (
              <div style={card}>
                <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Curva de Tamanhos Vendidos</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))", gap: "8px" }}>
                  {s.tamanhos.slice(0, 24).map((t: any, i: number) => (
                    <div key={i} style={{ background: "var(--surface2)", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
                      <div style={{ fontSize: "15px", fontWeight: 700 }}>{t.tamanho || "—"}</div>
                      <div style={{ fontSize: "13px", color: "var(--primary)", fontWeight: 600 }}>{fmtN(t.qtd)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {secoesSel.includes("lojas") && s.lojas?.length > 0 && (
              <div style={card}>
                <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Vendas por Loja</h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["Loja","Vendas","Peças","Receita","Margem"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {s.lojas.map((v: any, i: number) => (
                        <tr key={i}>
                          <td style={{ ...td, fontWeight: 600 }}>{v.nome_loja?.replace("FOCCA JEANS - ", "").replace("FOCCA ", "")}</td>
                          <td style={{ ...td, textAlign: "center" }}>{v.num_vendas}</td>
                          <td style={{ ...td, textAlign: "center" }}>{Number(v.pecas || 0)}</td>
                          <td style={{ ...td, textAlign: "right", color: "var(--primary)", fontWeight: 600 }}>{fmtR(v.receita)}</td>
                          <td style={{ ...td, textAlign: "right", color: Number(v.margem_media) >= 0 ? "var(--success, #16a34a)" : "var(--danger)" }}>{Number(v.margem_media || 0).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ITENS SELECIONADOS (CARRINHO) — sempre que houver */}
            {itens.length > 0 && (
              <div style={{ ...card, borderColor: "var(--primary)" }}>
                <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>Itens Selecionados para Análise</h2>
                <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "12px" }}>{itens.length} itens · saldo por loja + vendas (365d, match exato por atributos) {atualizandoCarrinho ? "· atualizando..." : "· dados da última sincronização"}</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>
                      <th style={th}>Produto</th><th style={th}>Cor</th><th style={th}>Tam</th><th style={th}>Marca</th><th style={{ ...th, textAlign: "right" }}>Preço</th>
                      {LOJAS.map(l => <th key={l.id} style={{ ...th, textAlign: "center" }}>{l.nome}</th>)}
                      <th style={{ ...th, textAlign: "center" }}>Total</th>
                      <th style={{ ...th, textAlign: "center", borderLeft: "2px solid var(--border)" }}>Vendido (tam)</th>
                      <th style={{ ...th, textAlign: "right" }}>Receita (tam)</th>
                    </tr></thead>
                    <tbody>
                      {agruparItens(itensAtualizados.length ? itensAtualizados : itens).map((it, i) => {
                        const precoMin = it.precos?.length ? Math.min(...it.precos) : null
                        const precoMax = it.precos?.length ? Math.max(...it.precos) : null
                        const precoTxt = (precoMin == null || precoMax == null) ? "—"
                          : (precoMin === precoMax ? `R$ ${precoMin.toFixed(2)}` : `R$ ${precoMin.toFixed(2)}~${precoMax.toFixed(2)}`)
                        return (
                        <tr key={i}>
                          <td style={{ ...td, fontWeight: 600 }}>{it.produto}</td>
                          <td style={{ ...td, color: "var(--muted)" }}>{it.cor}</td>
                          <td style={{ ...td, fontWeight: 700, textAlign: "center" }}>{it.tamanho}</td>
                          <td style={td}>{it.marca}</td>
                          <td style={{ ...td, textAlign: "right", color: "var(--text)" }}>{precoTxt}{it._ncods > 1 ? <span style={{ fontSize: "10px", color: "var(--muted)" }}> ({it._ncods} cods)</span> : null}</td>
                          {LOJAS.map(l => {
                            const v = it.lojas?.[String(l.id)] ?? 0
                            return <td key={l.id} style={{ ...td, textAlign: "center", color: v === 0 ? "var(--danger)" : "var(--text)", fontWeight: v === 0 ? 400 : 600 }}>{v}</td>
                          })}
                          <td style={{ ...td, textAlign: "center", fontWeight: 700, color: "var(--primary)" }}>{it.totalRede ?? 0}</td>
                          <td style={{ ...td, textAlign: "center", borderLeft: "2px solid var(--border)" }}>
                            <div style={{ fontWeight: 700, fontSize: "14px", color: Number(it.vd_pecas_tam) > 0 ? "var(--success, #16a34a)" : "var(--muted)" }}>{it.vd_pecas_tam ?? 0}</div>
                            <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 400 }}>tam {it.tamanho} · {it.vd_pecas ?? 0} no produto</div>
                          </td>
                          <td style={{ ...td, textAlign: "right", color: "var(--text)" }}>{Number(it.vd_receita_tam) > 0 ? `R$ ${Number(it.vd_receita_tam).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Resumo por produto: total vendido (uma vez, nao repetido por tamanho) */}
                <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {Object.values(
                    (itensAtualizados.length ? itensAtualizados : itens).reduce((acc: any, it: any) => {
                      const k = `${it.produto}||${it.cor}`
                      if (!acc[k]) acc[k] = { produto: it.produto, cor: it.cor, pecas: it.vd_pecas ?? 0, receita: it.vd_receita ?? 0 }
                      return acc
                    }, {})
                  ).map((r: any, i: number) => (
                    <div key={i} style={{ padding: "8px 12px", background: "var(--card-bg, #f9fafb)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}>
                      <span style={{ fontWeight: 600 }}>{r.produto}</span> <span style={{ color: "var(--muted)" }}>({r.cor})</span>
                      <span style={{ marginLeft: "8px" }}>· total: <strong style={{ color: "var(--success, #16a34a)" }}>{r.pecas}</strong> peças · <strong>R$ {Number(r.receita).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> em 365d</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
