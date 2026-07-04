"use client"
import { useEffect, useState, useMemo, useRef } from "react"
import FiltroGlobal, { LOJAS } from "@/components/FiltroGlobal"
import { useFiltros, resolverColecoes } from "@/components/FiltroContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

function saldoReal(v: any) { return Math.max(0, Number(v) || 0) }

export default function Home() {
  const { filtros, versaoBusca } = useFiltros()
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [buscaFeita, setBuscaFeita] = useState(false)
  const [opPorAno, setOpPorAno] = useState<Record<string,string[]>>({})

  // Panorama global sem filtro (estado inicial)
  const [kpisGlobal, setKpisGlobal] = useState<any>({})
  const [marcasGlobal, setMarcasGlobal] = useState<any[]>([])
  const [kpisFiltrado, setKpisFiltrado] = useState<any>(null)
  const [lojasGlobal, setLojasGlobal] = useState<any[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()).then(c => setOpPorAno(c.por_ano || {})).catch(() => {})
    // Carrega panorama global de inicio
    Promise.all([
      fetch(`${API_URL}/kpis`).then(r => r.json()),
      fetch(`${API_URL}/marcas`).then(r => r.json()),
      fetch(`${API_URL}/kpis/lojas`).then(r => r.json()),
    ]).then(([k, m, l]) => {
      setKpisGlobal(k); setMarcasGlobal(Array.isArray(m) ? m.map((x) => ({ ...x, valor_estoque_total: x.valor_venda_total ?? x.valor_estoque_total })) : []); setLojasGlobal(Array.isArray(l) ? l : [])
    }).catch(() => {})
  }, [])

  async function buscar() {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setDados([]); setLoading(true); setBuscaFeita(true)

    const colecoesAlvo = resolverColecoes(filtros, opPorAno)
    const p = new URLSearchParams({ limite: "5000" })
    if (filtros.marcas.length === 1)  p.set("marca",  filtros.marcas[0])
    if (filtros.modelos.length === 1) p.set("modelo", filtros.modelos[0])
    if (filtros.sexos.length === 1)   p.set("sexo",   filtros.sexos[0])
    if (filtros.anos.length === 1 && !filtros.colecoes.length && !filtros.estacoes.length) p.set("ano", filtros.anos[0])
    if (filtros.saldoMax !== null)    p.set("saldo_max", String(filtros.saldoMax))

    try {
      const res = await fetch(`${API_URL}/matriz?${p}`, { signal: abortRef.current.signal })
      let rows: any[] = await res.json()
      if (filtros.sexos.length > 1)   rows = rows.filter(r => filtros.sexos.some(s => r.sexo?.includes(s)))
      if (filtros.modelos.length > 1) rows = rows.filter(r => filtros.modelos.some(m => r.modelo?.includes(m)))
      if (filtros.marcas.length > 1)  rows = rows.filter(r => filtros.marcas.includes(r.marca))
      if (filtros.anos.length > 1)    rows = rows.filter(r => filtros.anos.includes(r.ano_colecao))
      if (colecoesAlvo.length)        rows = rows.filter(r => colecoesAlvo.includes(r.colecao))
      setDados(rows)
      // KPIs agregados A VENDA (sem truncar) para card/marcas/lojas filtrados
      const pf = new URLSearchParams()
      if (filtros.marcas.length)   pf.set("marca",   filtros.marcas.join(","))
      if (filtros.modelos.length)  pf.set("modelo",  filtros.modelos.join(","))
      if (filtros.sexos.length)    pf.set("sexo",    filtros.sexos.join(","))
      if (filtros.lojas.length)    pf.set("loja",    filtros.lojas.join(","))
      if (filtros.colecoes.length) {
        pf.set("colecao", filtros.colecoes.join(","))
      } else if (filtros.anos.length) {
        const cols = resolverColecoes(filtros, opPorAno)
        if (cols.length) pf.set("colecao", cols.join(","))
        else filtros.anos.forEach(a => pf.append("ano", a))
      }
      if (filtros.saldoMax !== null) pf.set("saldo_max", String(filtros.saldoMax))
      try {
        const rf = await fetch(`${API_URL}/kpis/filtrado?${pf}`, { signal: abortRef.current.signal })
        setKpisFiltrado(await rf.json())
      } catch { setKpisFiltrado(null) }
    } catch(e: any) { if (e?.name !== "AbortError") console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const temFiltro = filtros.lojas.length || filtros.sexos.length || filtros.modelos.length ||
      filtros.marcas.length || filtros.anos.length || filtros.colecoes.length || filtros.saldoMax !== null
    if (temFiltro) buscar()
    else setKpisFiltrado(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoBusca])

  const lojasFiltradas = useMemo(() =>
    filtros.lojas.length > 0 ? LOJAS.filter(l => filtros.lojas.includes(l.id)) : LOJAS
  , [filtros.lojas])

  // Calcula KPIs a partir dos dados filtrados
  const kpisCalc = useMemo(() => {
    if (!buscaFeita || dados.length === 0) return null
    let pecas = 0, valor = 0, criticos = 0, ok = 0
    const marcas = new Set<string>(), colecoes = new Set<string>(), modelos = new Set<string>()
    let somaMargem = 0, countMargem = 0

    dados.forEach(r => {
      const totalLinha = lojasFiltradas.reduce((s, l) => s + saldoReal(r[l.key]), 0)
      pecas += totalLinha
      valor += totalLinha * (Number(r.preco_venda) || 0)
      if (totalLinha <= 2) criticos++
      if (totalLinha > 5) ok++
      if (r.marca) marcas.add(r.marca)
      if (r.colecao) colecoes.add(r.colecao)
      if (r.modelo) modelos.add(r.modelo)
      if (r.preco_venda > 0 && r.preco_custo > 0) {
        somaMargem += (r.preco_venda - r.preco_custo) / r.preco_venda * 100
        countMargem++
      }
    })
    return {
      valor_total_estoque: valor, pecas_em_estoque: pecas,
      total_criticos: criticos, total_ok: ok,
      total_marcas: marcas.size, total_colecoes: colecoes.size, total_modelos: modelos.size,
      margem_media_pct: countMargem > 0 ? (somaMargem / countMargem).toFixed(1) : 0,
    }
  }, [dados, lojasFiltradas, buscaFeita])

  // Top marcas a partir dos dados filtrados
  const marcasCalc = useMemo(() => {
    if (!buscaFeita || dados.length === 0) return null
    const map: Record<string, number> = {}
    dados.forEach(r => {
      const totalLinha = lojasFiltradas.reduce((s, l) => s + saldoReal(r[l.key]), 0)
      map[r.marca] = (map[r.marca] || 0) + totalLinha * (Number(r.preco_venda) || 0)
    })
    return Object.entries(map).map(([marca, valor_estoque_total]) => ({ marca, valor_estoque_total }))
      .sort((a, b) => b.valor_estoque_total - a.valor_estoque_total)
  }, [dados, lojasFiltradas, buscaFeita])

  // Resumo por loja a partir dos dados filtrados
  const lojasCalc = useMemo(() => {
    if (!buscaFeita || dados.length === 0) return null
    return lojasFiltradas.map(loja => {
      let skus = 0, pecas = 0, valor = 0, somaMargem = 0, countMargem = 0
      dados.forEach(r => {
        const v = saldoReal(r[loja.key])
        if (v > 0) { skus++; pecas += v; valor += v * (Number(r.preco_venda) || 0) }
        if (v > 0 && r.preco_venda > 0 && r.preco_custo > 0) {
          somaMargem += (r.preco_venda - r.preco_custo) / r.preco_venda * 100
          countMargem++
        }
      })
      return { nome_loja: loja.nome, total_skus: skus, total_pecas: pecas, valor_estoque: valor,
        margem_media_pct: countMargem > 0 ? (somaMargem / countMargem).toFixed(1) : "0" }
    }).sort((a, b) => b.valor_estoque - a.valor_estoque)
  }, [dados, lojasFiltradas, buscaFeita])

  // Usa agregado do backend se ha filtro, senao global
  // Quando ha filtro, usa os agregados do backend (corretos, a venda, sem truncar)
  const kpis   = kpisFiltrado?.kpis   || kpisCalc   || kpisGlobal
  const marcas = (kpisFiltrado?.marcas) || marcasCalc || marcasGlobal
  const lojasBackend = kpisFiltrado?.lojas
    ? LOJAS.filter(l => filtros.lojas.length === 0 || filtros.lojas.includes(l.id)).map(l => {
        const keyPc = `${l.key}_pc`, keyV = `${l.key}_v`
        return {
          nome_loja: l.nome,
          total_pecas: Number(kpisFiltrado.lojas[keyPc]) || 0,
          valor_estoque: Number(kpisFiltrado.lojas[keyV]) || 0,
          valor_venda_potencial: Number(kpisFiltrado.lojas[keyV]) || 0,
          total_skus: null,
          margem_media_pct: kpis?.margem_media_pct ?? "0",
        }
      }).filter(x => x.total_pecas > 0 || x.valor_estoque > 0)
      .sort((a, b) => b.valor_estoque - a.valor_estoque)
    : null
  const lojas  = lojasBackend || lojasCalc  || lojasGlobal

  const fmt = (n: number) => n != null ? Number(n).toLocaleString("pt-BR") : "0"
  const fmtRc = (n: number) => {
    if (n == null) return "R$ 0"
    if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
    if (n >= 1_000) return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`
    return `R$ ${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
  }
  const fmtR = (n: number) => `R$ ${n?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) ?? "0,00"}`

  const temFiltroAtivo = buscaFeita && dados.length > 0

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Visão Geral</h1>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
          {temFiltroAtivo ? "Panorama do recorte filtrado" : "Consolidado de todas as lojas"}
        </p>
      </div>

      <FiltroGlobal onBuscar={buscar} loading={loading} mostrarSaldo />

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>Carregando...
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: "10px", marginBottom: "24px" }}>
            {[
              { l: "Valor em Estoque", v: fmtRc(kpis.valor_total_estoque), full: fmtR(kpis.valor_total_estoque), c: "var(--primary)" },
              { l: "Peças",            v: fmt(kpis.pecas_em_estoque),       c: "var(--success)" },
              { l: "Margem Média",     v: `${kpis.margem_media_pct ?? 0}%`, c: "var(--warning)" },
              { l: "Em Atenção",       v: fmt(kpis.total_criticos),          c: "var(--orange)" },
              { l: "SKUs OK",          v: fmt(kpis.total_ok),                c: "var(--success)" },
              { l: "Marcas",           v: kpis.total_marcas ?? 0 },
              { l: "Coleções",         v: kpis.total_colecoes ?? 0 },
              { l: "Modelos",          v: kpis.total_modelos ?? 0 },
            ].map((k: any, i) => (
              <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px", minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
                <div title={k.full || undefined} style={{ fontSize: "clamp(15px, 1.6vw, 21px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.v}</div>
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
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", gap: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.marca}</span>
                        <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 700, whiteSpace: "nowrap" }}>{fmtRc(m.valor_estoque_total)}</span>
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
                    {["Loja","SKUs","Peças","Valor Estoque","Margem"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--muted)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lojas.map((l: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{l.nome_loja}</div>
                        {l.cidade && !String(l.nome_loja).includes("CENTRO DE DISTRIBUI") && <div style={{ fontSize: "11px", color: "var(--muted)" }}>{l.cidade}</div>}
                      </td>
                      <td style={{ padding: "12px 14px" }}>{fmt(l.total_skus)}</td>
                      <td style={{ padding: "12px 14px" }}>{fmt(l.total_pecas)}</td>
                      <td style={{ padding: "12px 14px", color: "var(--primary)", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtR(l.valor_venda_potencial ?? l.valor_estoque)}</td>
                      <td style={{ padding: "12px 14px", color: Number(l.margem_media_pct) > 0 ? "var(--success)" : "var(--danger)", fontWeight: 500 }}>{l.margem_media_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
