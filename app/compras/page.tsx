"use client"
import { useEffect, useState, useMemo, useRef } from "react"
import { api } from "@/lib/api"
import { useFiltro } from "@/lib/FiltroContext"
import FiltroGlobal from "@/components/FiltroGlobal"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const LOJAS = [
  { id: 1, nome: "P.Nereu",  key: "pres_nereu" },
  { id: 3, nome: "Vidal",    key: "vidal_ramos" },
  { id: 4, nome: "Imbuiá",   key: "imbuia" },
  { id: 5, nome: "Lontras",  key: "lontras" },
  { id: 6, nome: "Chapadão", key: "chapadao" },
  { id: 7, nome: "Hype",     key: "focca_hype" },
]

const ORDEM_TAM = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3",
  "34","36","38","40","42","44","46","48","50","P/M","G/GG","U","UNICA"]

function saldoReal(v: any) { return Math.max(0, Number(v) || 0) }

function calcStatus(total: number) {
  if (total === 0) return { label: "ZERADO",   cor: "var(--danger)",  bg: "var(--danger-light)"  }
  if (total <= 2)  return { label: "CRÍTICO",  cor: "var(--danger)",  bg: "var(--danger-light)"  }
  if (total <= 5)  return { label: "BAIXO",    cor: "var(--warning)", bg: "var(--warning-light)" }
  if (total <= 15) return { label: "MÉDIO",    cor: "var(--orange)",  bg: "var(--orange-light)"  }
  return               { label: "SAUDÁVEL", cor: "var(--success)", bg: "var(--success-light)" }
}

function corCelula(v: number) {
  if (v === 0) return { bg: "var(--danger-light)",  color: "var(--danger)",  fw: 700 }
  if (v <= 2)  return { bg: "var(--warning-light)", color: "var(--warning)", fw: 600 }
  if (v <= 5)  return { bg: "var(--primary-light)", color: "var(--primary)", fw: 500 }
  return { bg: "transparent", color: "var(--text)", fw: 400 }
}

const STATUS_OPTS = [
  { key: "ZERADO",   label: "Zerado",   cor: "var(--danger)"  },
  { key: "CRÍTICO",  label: "Crítico",  cor: "var(--danger)"  },
  { key: "BAIXO",    label: "Baixo",    cor: "var(--warning)" },
  { key: "MÉDIO",    label: "Médio",    cor: "var(--orange)"  },
  { key: "SAUDÁVEL", label: "Saudável", cor: "var(--success)" },
]

const thCell = {
  padding: "8px 12px", fontSize: "10px", fontWeight: 600 as const,
  color: "var(--muted)" as const, textTransform: "uppercase" as const,
  letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const,
  background: "var(--surface2)" as const, textAlign: "center" as const,
  borderBottom: "2px solid var(--border)" as const,
}

export default function ComprasPage() {
  const { filtros } = useFiltro()
  const [dados, setDados] = useState<any[]>([])
  const [giros, setGiros] = useState<any[]>([])
  const [modelos, setModelos] = useState<string[]>([])
  const [marcas, setMarcas] = useState<string[]>([])
  const [porAno, setPorAno] = useState<Record<string, string[]>>({})
  const [anos, setAnos] = useState<string[]>([])
  const [opcoesProntas, setOpcoesProntas] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progresso, setProgresso] = useState(0) // 0-100
  const [marcaSelecionada, setMarcaSelecionada] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<string[]>([])
  const [ultimaSync, setUltimaSync] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    const wsUrl = API_URL.replace("http", "ws").replace("https", "wss")
    const ws = new WebSocket(`${wsUrl}/ws`)
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.tipo === "sync_completo") {
        setUltimaSync(msg.ultima_sync)
        // Recarrega dados automaticamente
        carregarTudo()
      }
      if (msg.tipo === "status") {
        setUltimaSync(msg.ultima_sync)
      }
    }
    return () => ws.close()
  }, [])

  useEffect(() => {
    Promise.all([
      api.filtros(),
      fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()),
      api.giro({ limite: "1000" }),
    ]).then(([f, c, g]) => {
      setModelos(f.modelos || [])
      setMarcas(f.marcas || [])
      setPorAno(c.por_ano || {})
      setAnos(c.anos || [])
      setGiros(g)
      setOpcoesProntas(true)
    })
  }, [])

  const colecoesAlvo = useMemo(() => {
    if (filtros.colecoes.length > 0) return filtros.colecoes
    if (!porAno || filtros.anos.length === 0) return []
    const doAno = filtros.anos.flatMap((a: string) => porAno[a] || [])
    if (filtros.estacoes.length === 0) return doAno
    return doAno.filter((c: string) =>
      filtros.estacoes.some((e: string) => c.toUpperCase().includes(e.toUpperCase()))
    )
  }, [filtros.colecoes, filtros.anos, filtros.estacoes, porAno])

  const lojasFiltradas = useMemo(() =>
    filtros.lojas.length > 0 ? LOJAS.filter(l => filtros.lojas.includes(l.id)) : LOJAS
  , [filtros.lojas])

  function aplicarFiltros(rows: any[]) {
    let f = rows
    if (filtros.sexos.length > 1)   f = f.filter(r => filtros.sexos.some(s => r.sexo?.includes(s)))
    if (filtros.modelos.length > 1) f = f.filter(r => filtros.modelos.some(m => r.modelo?.includes(m)))
    if (filtros.marcas.length > 1)  f = f.filter(r => filtros.marcas.includes(r.marca))
    if (colecoesAlvo.length > 0)    f = f.filter(r => colecoesAlvo.includes(r.colecao))
    if ((filtros.saldoMax ?? 999) < 999)
      f = f.filter(r => lojasFiltradas.some(l => saldoReal(r[l.key]) <= filtros.saldoMax))
    return f
  }

  // Carrega TUDO em lotes paralelos sem mostrar "carregar mais"
  async function carregarTudo() {
    if (!opcoesProntas) return
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setProgresso(0)
    setDados([])

    const p: Record<string, string> = { limite: "500", offset: "0" }
    if (filtros.modelos.length === 1) p.modelo = filtros.modelos[0]
    if (filtros.marcas.length === 1)  p.marca  = filtros.marcas[0]
    if (filtros.sexos.length === 1)   p.sexo   = filtros.sexos[0]

    try {
      // Primeiro lote — mostra imediatamente
      const primeiro = await api.matriz(p)
      const filtrado = aplicarFiltros(primeiro)
      setDados(filtrado)
      setProgresso(50)

      // Se tem mais, carrega o resto em background
      if (primeiro.length === 500) {
        const segundo = await api.matriz({ ...p, offset: "500" })
        const filtrado2 = aplicarFiltros(segundo)
        setDados(prev => [...prev, ...filtrado2])
        setProgresso(80)

        if (segundo.length === 500) {
          const terceiro = await api.matriz({ ...p, offset: "1000" })
          const filtrado3 = aplicarFiltros(terceiro)
          setDados(prev => [...prev, ...filtrado3])
          setProgresso(100)
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e)
    } finally {
      setLoading(false)
      setProgresso(100)
    }
  }

  useEffect(() => {
    if (!opcoesProntas) return
    setMarcaSelecionada("")
    carregarTudo()
  }, [filtros, colecoesAlvo, opcoesProntas])

  const giroMap = useMemo(() => {
    const m: Record<string, any> = {}
    giros.forEach(g => { m[String(g.cod_produto)] = g })
    return m
  }, [giros])

  const dadosRich = useMemo(() => dados.map(row => {
    const total = lojasFiltradas.reduce((s, l) => s + saldoReal(row[l.key]), 0)
    const status = calcStatus(total)
    const g = giroMap[String(row.cod_produto)]
    return { ...row, totalReal: total, status, giro_30d: g?.qtd_30d || 0 }
  }), [dados, lojasFiltradas, giroMap])

  const dadosFiltrados = useMemo(() => {
    if (statusFiltro.length === 0) return dadosRich
    return dadosRich.filter(r => statusFiltro.includes(r.status.label))
  }, [dadosRich, statusFiltro])

  const contagemStatus = useMemo(() => {
    const c: Record<string, number> = {}
    dadosRich.forEach(r => { c[r.status.label] = (c[r.status.label] || 0) + 1 })
    return c
  }, [dadosRich])

  const porMarca = useMemo(() => {
    const map: Record<string, Record<string, any>> = {}
    dadosFiltrados.forEach(row => {
      if (!map[row.marca]) map[row.marca] = {}
      const key = `${row.cod_produto}||${row.cor}`
      if (!map[row.marca][key]) {
        map[row.marca][key] = {
          produto: row.produto, cor: row.cor, modelo: row.modelo,
          colecao: row.colecao, sexo: row.sexo,
          preco: row.preco_venda || 0, giro_30d: row.giro_30d, itens: []
        }
      }
      map[row.marca][key].itens.push(row)
    })
    Object.values(map).forEach(prods => {
      Object.values(prods).forEach((prod: any) => {
        prod.itens.sort((a: any, b: any) => {
          const ia = ORDEM_TAM.indexOf(a.tamanho), ib = ORDEM_TAM.indexOf(b.tamanho)
          if (ia === -1 && ib === -1) return a.tamanho.localeCompare(b.tamanho)
          if (ia === -1) return 1; if (ib === -1) return -1
          return ia - ib
        })
      })
    })
    return Object.entries(map).map(([marca, prods]) => ({
      marca,
      produtos: Object.values(prods),
      totalSKUs: Object.values(prods).reduce((s: number, p: any) => s + p.itens.length, 0),
      criticos:  Object.values(prods).reduce((s: number, p: any) =>
        s + p.itens.filter((i: any) => ["ZERADO","CRÍTICO"].includes(i.status.label)).length, 0),
    })).sort((a, b) => b.criticos - a.criticos || a.marca.localeCompare(b.marca))
  }, [dadosFiltrados])

  const marcaAtiva = marcaSelecionada && porMarca.find(m => m.marca === marcaSelecionada)
    ? marcaSelecionada : porMarca[0]?.marca || ""
  const dadosMarca = porMarca.find(m => m.marca === marcaAtiva)

  function urlExport(marcaParam?: string) {
    const p = new URLSearchParams()
    if (marcaParam) p.set("marca", marcaParam)
    else if (filtros.marcas.length === 1) p.set("marca", filtros.marcas[0])
    if (filtros.modelos.length === 1) p.set("modelo", filtros.modelos[0])
    if (filtros.sexos.length === 1)   p.set("sexo",   filtros.sexos[0])
    if (filtros.lojas.length === 1)   p.set("loja",   String(filtros.lojas[0]))
    if (filtros.colecoes.length === 1) p.set("colecao", filtros.colecoes[0])
    return `${API_URL}/export/faltantes?${p}`
  }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Decisão de Compra</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
            {dados.length > 0 ? `${dados.length} SKUs · ${porMarca.length} marcas` : "Todos os produtos por marca"}
            {ultimaSync && <span style={{ marginLeft: "8px" }}>· atualizado {new Date(ultimaSync).toLocaleTimeString("pt-BR")}</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => fetch(`${API_URL}/sync/manual`, { method: "POST" })} style={{ padding: "8px 14px", background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>
            ↻ Sincronizar
          </button>
          {marcaAtiva && (
            <button onClick={() => window.open(urlExport(marcaAtiva))} style={{ padding: "8px 14px", background: "var(--success)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
              ⬇ CSV {marcaAtiva}
            </button>
          )}
          <button onClick={() => window.open(urlExport())} style={{ padding: "8px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
            ⬇ CSV Geral
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      {loading && (
        <div style={{ height: "3px", background: "var(--surface2)", borderRadius: "2px", marginBottom: "12px", overflow: "hidden" }}>
          <div style={{ height: "100%", background: "var(--primary)", borderRadius: "2px", width: `${progresso}%`, transition: "width 0.4s ease" }} />
        </div>
      )}

      <FiltroGlobal opcoes={{ modelos, marcas, porAno, anos }} />

      {/* Filtro status */}
      {dadosRich.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Status:</span>
          {STATUS_OPTS.map(opt => {
            const count = contagemStatus[opt.key] || 0
            if (count === 0) return null
            const ativo = statusFiltro.includes(opt.key)
            return (
              <button key={opt.key} onClick={() => setStatusFiltro(prev => prev.includes(opt.key) ? prev.filter(x => x !== opt.key) : [...prev, opt.key])} style={{
                padding: "5px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer",
                fontWeight: ativo ? 700 : 400, border: "1px solid",
                background: ativo ? opt.cor : "var(--surface2)",
                color: ativo ? "#fff" : opt.cor,
                borderColor: opt.cor, transition: "all 0.1s", whiteSpace: "nowrap",
              }}>
                {opt.label} ({count})
              </button>
            )
          })}
          {statusFiltro.length > 0 && (
            <button onClick={() => setStatusFiltro([])} style={{ padding: "5px 10px", background: "none", border: "1px solid var(--border)", borderRadius: "20px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>
              ✕ Todos
            </button>
          )}
        </div>
      )}

      {loading && dados.length === 0 ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>Carregando estoque...
        </div>
      ) : porMarca.length === 0 && !loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          Nenhum produto com esses filtros.
        </div>
      ) : (
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

          {/* Sidebar */}
          <div style={{ width: "180px", flexShrink: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", fontSize: "10px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
              {porMarca.length} marcas
            </div>
            <div style={{ maxHeight: "calc(100vh - 380px)", overflowY: "auto" }}>
              {porMarca.map(({ marca, totalSKUs, criticos }) => (
                <div key={marca} onClick={() => setMarcaSelecionada(marca)} style={{
                  padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                  background: marcaAtiva === marca ? "var(--primary-light)" : "transparent",
                  borderLeft: `3px solid ${marcaAtiva === marca ? "var(--primary)" : "transparent"}`,
                  transition: "all 0.1s",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: marcaAtiva === marca ? 700 : 500, color: marcaAtiva === marca ? "var(--primary)" : "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {marca}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px", display: "flex", gap: "6px" }}>
                    <span>{totalSKUs} SKUs</span>
                    {criticos > 0 && <span style={{ color: "var(--danger)", fontWeight: 600 }}>⚠ {criticos}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conteúdo */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            {dadosMarca && (
              <>
                <div style={{ background: "var(--surface)", border: "1px solid var(--primary)", borderRadius: "12px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--primary)" }}>{marcaAtiva}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                      {dadosMarca.produtos.length} produtos · {dadosMarca.totalSKUs} SKUs
                      {dadosMarca.criticos > 0 && <span style={{ color: "var(--danger)", fontWeight: 600, marginLeft: "8px" }}>⚠ {dadosMarca.criticos} críticos</span>}
                    </div>
                  </div>
                  <button onClick={() => window.open(urlExport(marcaAtiva))} style={{ padding: "6px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                    ⬇ CSV
                  </button>
                </div>

                {dadosMarca.produtos.map((prod: any, pi: number) => {
                  const g = giroMap[String(prod.itens[0]?.cod_produto)]
                  const giro30d = g?.qtd_30d || 0
                  const margem = prod.preco > 0 && prod.itens[0]?.preco_custo > 0
                    ? ((prod.preco - prod.itens[0].preco_custo) / prod.preco * 100) : 0

                  return (
                    <div key={pi} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--text)" }}>{prod.produto}</span>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>{prod.cor}</span>
                          <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "20px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>{prod.modelo}</span>
                          <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "20px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>{prod.colecao}</span>
                          <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "20px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>{prod.sexo}</span>
                        </div>
                        <div style={{ display: "flex", gap: "16px" }}>
                          {giro30d > 0 && <div style={{ textAlign: "right" }}><div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>30d</div><div style={{ fontSize: "14px", fontWeight: 700, color: "var(--success)" }}>↑{giro30d}</div></div>}
                          {margem > 0 && <div style={{ textAlign: "right" }}><div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Margem</div><div style={{ fontSize: "14px", fontWeight: 700, color: margem >= 60 ? "var(--success)" : "var(--warning)" }}>{margem.toFixed(0)}%</div></div>}
                          <div style={{ textAlign: "right" }}><div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Preço</div><div style={{ fontSize: "14px", fontWeight: 700 }}>R$ {prod.preco.toFixed(2)}</div></div>
                        </div>
                      </div>

                      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                          <thead>
                            <tr>
                              <th style={{ ...thCell, textAlign: "left", paddingLeft: "16px", minWidth: "60px" }}>TAM</th>
                              {lojasFiltradas.map(l => <th key={l.id} style={{ ...thCell, minWidth: "75px" }}>{l.nome}</th>)}
                              <th style={{ ...thCell, borderLeft: "2px solid var(--border)", minWidth: "65px" }}>TOTAL</th>
                              <th style={{ ...thCell, minWidth: "75px" }}>GIRO/30d</th>
                              <th style={{ ...thCell, minWidth: "80px" }}>STATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {prod.itens.map((item: any, ii: number) => (
                              <tr key={ii} style={{ borderTop: "1px solid var(--border)", background: ii % 2 === 0 ? "transparent" : "var(--surface2)11" }}>
                                <td style={{ padding: "8px 12px 8px 16px", fontWeight: 700, fontSize: "13px" }}>{item.tamanho}</td>
                                {lojasFiltradas.map(l => {
                                  const val = saldoReal(item[l.key]); const c = corCelula(val)
                                  return (
                                    <td key={l.id} style={{ padding: "5px 8px", textAlign: "center" }}>
                                      <span style={{ display: "inline-block", minWidth: "36px", padding: "4px 10px", borderRadius: "6px", background: c.bg, color: c.color, fontWeight: c.fw, fontSize: "13px" }}>{val}</span>
                                    </td>
                                  )
                                })}
                                <td style={{ padding: "6px 12px", textAlign: "center", fontWeight: 700, color: "var(--primary)", borderLeft: "2px solid var(--border)", fontSize: "13px" }}>{item.totalReal}</td>
                                <td style={{ padding: "6px 12px", textAlign: "center", color: item.giro_30d > 0 ? "var(--success)" : "var(--muted)", fontWeight: item.giro_30d > 0 ? 600 : 400 }}>{item.giro_30d > 0 ? item.giro_30d : "—"}</td>
                                <td style={{ padding: "6px 12px", textAlign: "center" }}>
                                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: item.status.bg, color: item.status.cor }}>{item.status.label}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
