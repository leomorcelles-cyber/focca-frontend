"use client"
import { useState, useMemo, useEffect, useRef, memo } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import FiltroGlobal, { LOJAS } from "@/components/FiltroGlobal"
import { useFiltros, resolverColecoes } from "@/components/FiltroContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const ORDEM_TAM = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3",
  "34","36","38","40","42","44","46","48","50","P/M","G/GG","U","UNICA"]
const STATUS_OPTS = [
  { key: "ZERADO",   label: "Zerado",   cor: "var(--danger)"  },
  { key: "CRITICO",  label: "Crítico",  cor: "var(--danger)"  },
  { key: "BAIXO",    label: "Baixo",    cor: "var(--warning)" },
  { key: "MEDIO",    label: "Médio",    cor: "var(--orange)"  },
  { key: "SAUDAVEL", label: "Saudável", cor: "var(--success)" },
]

function saldoReal(v: any) { return Math.max(0, Number(v) || 0) }
function calcStatus(t: number) {
  if (t === 0) return { label: "ZERADO",   cor: "var(--danger)",  bg: "var(--danger-light)"  }
  if (t <= 2)  return { label: "CRITICO",  cor: "var(--danger)",  bg: "var(--danger-light)"  }
  if (t <= 5)  return { label: "BAIXO",    cor: "var(--warning)", bg: "var(--warning-light)" }
  if (t <= 15) return { label: "MEDIO",    cor: "var(--orange)",  bg: "var(--orange-light)"  }
  return             { label: "SAUDAVEL", cor: "var(--success)", bg: "var(--success-light)" }
}
function corCelula(v: number) {
  if (v === 0) return { bg: "var(--danger-light)",  color: "var(--danger)",  fw: 700 }
  if (v <= 2)  return { bg: "var(--warning-light)", color: "var(--warning)", fw: 600 }
  if (v <= 5)  return { bg: "var(--primary-light)", color: "var(--primary)", fw: 500 }
  return { bg: "transparent", color: "var(--text)", fw: 400 }
}
function useDebounce<T>(value: T, delay = 250): T {
  const [v, setV] = useState<T>(value)
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t) }, [value, delay])
  return v
}

const thCell = { padding: "8px 12px", fontSize: "10px", fontWeight: 600 as const, color: "var(--muted)" as const, textTransform: "uppercase" as const, letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const, background: "var(--surface2)" as const, textAlign: "center" as const, borderBottom: "2px solid var(--border)" as const }

const LinhaProduto = memo(({ prod, onClick, mostrarMarca }: { prod: any, onClick: () => void, mostrarMarca?: boolean }) => {
  const st = prod.status
  return (
    <div onClick={onClick} style={{ background: "var(--surface)", border: `1px solid ${["ZERADO","CRITICO"].includes(st.label) ? "var(--danger)" : "var(--border)"}`, borderRadius: "10px", padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "260px" }}>{prod.produto}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "1px" }}>{prod.cor} · {prod.modelo}</div>
        </div>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {mostrarMarca && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "var(--primary-light)", color: "var(--primary)", fontWeight: 600, whiteSpace: "nowrap" }}>{prod.marca}</span>}
          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "var(--surface2)", color: "var(--muted)", whiteSpace: "nowrap" }}>{prod.sexo}</span>
          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "var(--surface2)", color: "var(--muted)", whiteSpace: "nowrap" }}>{prod.colecao}</span>
          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "var(--surface2)", color: "var(--muted)", whiteSpace: "nowrap" }}>{prod.itens.length} tam.</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
        {prod.preco > 0 && <div style={{ textAlign: "right" }}><div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Preço</div><div style={{ fontSize: "13px", fontWeight: 700 }}>R$ {prod.preco.toFixed(0)}</div></div>}
        <div style={{ textAlign: "right" }}><div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Rede</div><div style={{ fontSize: "16px", fontWeight: 700, color: prod.totalRede === 0 ? "var(--danger)" : prod.totalRede <= 5 ? "var(--warning)" : "var(--primary)" }}>{prod.totalRede}</div></div>
        <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "4px", background: st.bg, color: st.cor, whiteSpace: "nowrap" }}>{st.label}</span>
        <span style={{ color: "var(--muted)", fontSize: "13px" }}>›</span>
      </div>
    </div>
  )
})
LinhaProduto.displayName = "LinhaProduto"

function ModalDetalhe({ prod, lojasFiltradas, onClose }: { prod: any, lojasFiltradas: typeof LOJAS, onClose: () => void }) {
  if (!prod) return null
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: "14px", maxWidth: "800px", width: "100%", maxHeight: "85vh", overflow: "auto", border: "1px solid var(--border)" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "sticky", top: 0, background: "var(--surface)", zIndex: 1 }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{prod.produto}</div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "3px" }}>{prod.cor} · {prod.modelo} · {prod.marca} · {prod.colecao}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "var(--muted)", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "18px", flexWrap: "wrap" }}>
            {prod.preco > 0 && <div style={{ background: "var(--surface2)", borderRadius: "8px", padding: "10px 14px" }}><div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Preço venda</div><div style={{ fontSize: "16px", fontWeight: 700 }}>R$ {prod.preco.toFixed(2)}</div></div>}
            <div style={{ background: "var(--surface2)", borderRadius: "8px", padding: "10px 14px" }}><div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Total rede</div><div style={{ fontSize: "16px", fontWeight: 700, color: "var(--primary)" }}>{prod.totalRede}</div></div>
            <div style={{ background: "var(--surface2)", borderRadius: "8px", padding: "10px 14px" }}><div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Tamanhos</div><div style={{ fontSize: "16px", fontWeight: 700 }}>{prod.itens.length}</div></div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead><tr>
                <th style={{ ...thCell, textAlign: "left", paddingLeft: "12px", minWidth: "55px" }}>TAM</th>
                {lojasFiltradas.map(l => <th key={l.id} style={{ ...thCell, minWidth: "70px" }}>{l.nome}</th>)}
                <th style={{ ...thCell, borderLeft: "2px solid var(--border)", minWidth: "60px" }}>TOTAL</th>
              </tr></thead>
              <tbody>
                {prod.itens.map((item: any, ii: number) => {
                  const totalLinha = lojasFiltradas.reduce((s, l) => s + saldoReal(item[l.key]), 0)
                  return (
                    <tr key={ii} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: "13px" }}>{item.tamanho}</td>
                      {lojasFiltradas.map(l => { const v = saldoReal(item[l.key]); const c = corCelula(v); return (
                        <td key={l.id} style={{ padding: "5px 8px", textAlign: "center" }}>
                          <span style={{ display: "inline-block", minWidth: "34px", padding: "4px 8px", borderRadius: "6px", background: c.bg, color: c.color, fontWeight: c.fw }}>{v}</span>
                        </td>
                      )})}
                      <td style={{ padding: "6px 12px", textAlign: "center", fontWeight: 700, color: "var(--primary)", borderLeft: "2px solid var(--border)" }}>{totalLinha}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot><tr style={{ borderTop: "2px solid var(--border)" }}>
                <td style={{ padding: "8px 12px", fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>TOTAL</td>
                {lojasFiltradas.map(l => { const t = prod.itens.reduce((s: number, item: any) => s + saldoReal(item[l.key]), 0); return (
                  <td key={l.id} style={{ padding: "8px", textAlign: "center", fontWeight: 700, color: t === 0 ? "var(--danger)" : "var(--text)" }}>{t}</td>
                )})}
                <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "var(--primary)", borderLeft: "2px solid var(--border)" }}>{prod.totalRede}</td>
              </tr></tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ComprasPage() {
  const { filtros, versaoBusca } = useFiltros()
  const [statusFiltro, setStatusFiltro] = useState<string[]>([])
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [buscaFeita, setBuscaFeita] = useState(false)
  const [marcaSel, setMarcaSel] = useState<string>("GERAL")
  const [opPorAno, setOpPorAno] = useState<Record<string,string[]>>({})
  const [detalhe, setDetalhe] = useState<any>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const statusFiltroD = useDebounce(statusFiltro, 150)

  useEffect(() => {
    fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()).then(c => setOpPorAno(c.por_ano || {})).catch(() => {})
  }, [])

  // Busca automaticamente ao entrar na pagina se houver filtros, e a cada nova busca global
  useEffect(() => {
    const temFiltro = filtros.lojas.length || filtros.sexos.length || filtros.modelos.length ||
      filtros.marcas.length || filtros.anos.length || filtros.colecoes.length || filtros.saldoMax !== null
    if (temFiltro) buscar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoBusca])

  const lojasFiltradas = useMemo(() =>
    filtros.lojas.length > 0 ? LOJAS.filter(l => filtros.lojas.includes(l.id)) : LOJAS
  , [filtros.lojas])

  async function buscar() {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setDados([]); setLoading(true); setBuscaFeita(true); setMarcaSel("GERAL"); setStatusFiltro([])

    const colecoesAlvo = resolverColecoes(filtros, opPorAno)
    const p = new URLSearchParams({ limite: "3000" })
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
    } catch(e: any) { if (e?.name !== "AbortError") console.error(e) }
    finally { setLoading(false) }
  }

  const produtos = useMemo(() => {
    const map: Record<string, any> = {}
    dados.forEach(row => {
      const key = `${row.cod_produto}||${row.cor}`
      if (!map[key]) map[key] = { produto: row.produto, cor: row.cor, modelo: row.modelo, colecao: row.colecao, sexo: row.sexo, marca: row.marca, preco: row.preco_venda || 0, itens: [] }
      map[key].itens.push(row)
    })
    return Object.values(map).map((prod: any) => {
      prod.itens.sort((a: any, b: any) => {
        const ia = ORDEM_TAM.indexOf(a.tamanho), ib = ORDEM_TAM.indexOf(b.tamanho)
        if (ia === -1 && ib === -1) return a.tamanho.localeCompare(b.tamanho)
        if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib
      })
      prod.itens.forEach((it: any) => { it.totalReal = lojasFiltradas.reduce((s, l) => s + saldoReal(it[l.key]), 0) })
      prod.totalRede = prod.itens.reduce((s: number, it: any) => s + it.totalReal, 0)
      prod.status = calcStatus(prod.totalRede)
      return prod
    })
  }, [dados, lojasFiltradas])

  const produtosStatus = useMemo(() => {
    if (statusFiltroD.length === 0) return produtos
    return produtos.filter((p: any) => statusFiltroD.includes(p.status.label))
  }, [produtos, statusFiltroD])

  const contagemStatus = useMemo(() => {
    const c: Record<string, number> = {}
    produtos.forEach((p: any) => { c[p.status.label] = (c[p.status.label] || 0) + 1 })
    return c
  }, [produtos])

  const marcasResumo = useMemo(() => {
    const map: Record<string, { skus: number, criticos: number }> = {}
    produtosStatus.forEach((p: any) => {
      if (!map[p.marca]) map[p.marca] = { skus: 0, criticos: 0 }
      map[p.marca].skus += p.itens.length
      if (["ZERADO","CRITICO"].includes(p.status.label)) map[p.marca].criticos++
    })
    return Object.entries(map).map(([marca, v]) => ({ marca, ...v }))
      .sort((a, b) => b.criticos - a.criticos || a.marca.localeCompare(b.marca))
  }, [produtosStatus])

  const produtosVisiveis = useMemo(() =>
    marcaSel === "GERAL" ? produtosStatus : produtosStatus.filter((p: any) => p.marca === marcaSel)
  , [produtosStatus, marcaSel])

  // VIRTUALIZAÇÃO — só renderiza os produtos visíveis na viewport
  const virtualizer = useVirtualizer({
    count: produtosVisiveis.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,   // altura aproximada de cada linha + gap
    overscan: 8,              // renderiza 8 extras acima/abaixo para scroll suave
  })

  function exportar() {
    const p = new URLSearchParams()
    if (marcaSel !== "GERAL") p.set("marca", marcaSel)
    else if (filtros.marcas.length === 1) p.set("marca", filtros.marcas[0])
    if (filtros.modelos.length === 1) p.set("modelo", filtros.modelos[0])
    if (filtros.sexos.length === 1)   p.set("sexo",   filtros.sexos[0])
    if (filtros.colecoes.length === 1) p.set("colecao", filtros.colecoes[0])
    if (filtros.lojas.length === 1)   p.set("loja",   String(filtros.lojas[0]))
    window.open(`${API_URL}/export/matriz?${p}`)
  }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Decisão de Compra</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>{dados.length > 0 ? `${produtosStatus.length} produtos · ${dados.length} SKUs` : "Selecione filtros e clique em Buscar"}</p>
        </div>
        {buscaFeita && <button onClick={exportar} style={{ padding: "8px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>⬇ Exportar CSV</button>}
      </div>

      <FiltroGlobal onBuscar={buscar} loading={loading} mostrarSaldo />

      {produtos.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 16px", marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Status:</span>
          {STATUS_OPTS.map(opt => {
            const count = contagemStatus[opt.key] || 0
            if (count === 0) return null
            const ativo = statusFiltro.includes(opt.key)
            return <button key={opt.key} onClick={() => setStatusFiltro(prev => prev.includes(opt.key) ? prev.filter(x => x !== opt.key) : [...prev, opt.key])} style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", fontWeight: ativo ? 700 : 400, border: "1px solid", background: ativo ? opt.cor : "var(--surface2)", color: ativo ? "#fff" : opt.cor, borderColor: opt.cor, whiteSpace: "nowrap" }}>{opt.label} ({count})</button>
          })}
          {statusFiltro.length > 0 && <button onClick={() => setStatusFiltro([])} style={{ padding: "4px 10px", background: "none", border: "1px solid var(--border)", borderRadius: "20px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>✕ Todos</button>}
        </div>
      )}

      {!buscaFeita ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🛍️</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>Selecione filtros e clique em Buscar</div>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>Filtre por marca, modelo, ano, coleção, loja ou quantidade</div>
        </div>
      ) : loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>Buscando...
        </div>
      ) : produtos.length === 0 ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>Nenhum produto encontrado.</div>
      ) : (
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          {/* Sidebar marcas */}
          <div style={{ width: "180px", flexShrink: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", fontSize: "10px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>{marcasResumo.length} marcas</div>
            <div style={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto" }}>
              <div onClick={() => setMarcaSel("GERAL")} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", background: marcaSel === "GERAL" ? "var(--primary-light)" : "transparent", borderLeft: `3px solid ${marcaSel === "GERAL" ? "var(--primary)" : "transparent"}` }}>
                <div style={{ fontSize: "12px", fontWeight: marcaSel === "GERAL" ? 700 : 600, color: marcaSel === "GERAL" ? "var(--primary)" : "var(--text)" }}>Todas as marcas</div>
                <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>{produtosStatus.length} produtos</div>
              </div>
              {marcasResumo.map(({ marca, skus, criticos }) => (
                <div key={marca} onClick={() => setMarcaSel(marca)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", background: marcaSel === marca ? "var(--primary-light)" : "transparent", borderLeft: `3px solid ${marcaSel === marca ? "var(--primary)" : "transparent"}` }}>
                  <div style={{ fontSize: "12px", fontWeight: marcaSel === marca ? 700 : 500, color: marcaSel === marca ? "var(--primary)" : "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{marca}</div>
                  <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px", display: "flex", gap: "6px" }}>
                    <span>{skus} SKUs</span>
                    {criticos > 0 && <span style={{ color: "var(--danger)", fontWeight: 600 }}>⚠ {criticos}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lista virtualizada */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--primary)", borderRadius: "12px", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--primary)" }}>{marcaSel === "GERAL" ? "Todas as marcas" : marcaSel}</div>
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>{produtosVisiveis.length} produtos · clique para ver detalhe por tamanho e loja</div>
              </div>
            </div>

            {/* Container com scroll virtualizado */}
            <div ref={scrollRef} style={{ height: "calc(100vh - 340px)", overflowY: "auto", paddingRight: "4px" }}>
              <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
                {virtualizer.getVirtualItems().map(virtualRow => {
                  const prod = produtosVisiveis[virtualRow.index]
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)`, paddingBottom: "6px" }}
                    >
                      <LinhaProduto prod={prod} mostrarMarca={marcaSel === "GERAL"} onClick={() => setDetalhe(prod)} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {detalhe && <ModalDetalhe prod={detalhe} lojasFiltradas={lojasFiltradas} onClose={() => setDetalhe(null)} />}
    </div>
  )
}
