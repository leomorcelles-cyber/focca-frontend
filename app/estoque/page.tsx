"use client"
import { useEffect, useState, useMemo, useCallback, useRef } from "react"
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

function corSaldo(v: number) {
  if (v === 0) return { bg: "var(--danger-light)",  color: "var(--danger)",  fw: 700 }
  if (v <= 2)  return { bg: "var(--warning-light)", color: "var(--warning)", fw: 600 }
  if (v <= 5)  return { bg: "var(--primary-light)", color: "var(--primary)", fw: 500 }
  return { bg: "transparent", color: "var(--text)", fw: 400 }
}

const thS = {
  padding: "5px 8px", color: "var(--muted)" as const, fontWeight: 600 as const,
  fontSize: "10px" as const, textTransform: "uppercase" as const,
  letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const,
}

export default function EstoquePage() {
  const { filtros } = useFiltro()
  const [dados, setDados] = useState<any[]>([])
  const [modelos, setModelos] = useState<string[]>([])
  const [marcas, setMarcas] = useState<string[]>([])
  const [porAno, setPorAno] = useState<Record<string, string[]>>({})
  const [anos, setAnos] = useState<string[]>([])
  const [opcoesProntas, setOpcoesProntas] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [ultimaSync, setUltimaSync] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // WebSocket
  useEffect(() => {
    const wsUrl = API_URL.replace("http", "ws").replace("https", "wss")
    const ws = new WebSocket(`${wsUrl}/ws`)
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.tipo === "sync_completo") { setUltimaSync(msg.ultima_sync); carregarTudo() }
      if (msg.tipo === "status") setUltimaSync(msg.ultima_sync)
    }
    return () => ws.close()
  }, [])

  useEffect(() => {
    Promise.all([
      api.filtros(),
      fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()),
    ]).then(([f, c]) => {
      setModelos(f.modelos || [])
      setMarcas(f.marcas || [])
      setPorAno(c.por_ano || {})
      setAnos(c.anos || [])
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

  async function carregarTudo() {
    if (!opcoesProntas) return
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setProgresso(0)
    setDados([])
    setExpandidos(new Set())

    const p: Record<string, string> = { limite: "500", offset: "0" }
    if (filtros.modelos.length === 1) p.modelo = filtros.modelos[0]
    if (filtros.marcas.length === 1)  p.marca  = filtros.marcas[0]
    if (filtros.sexos.length === 1)   p.sexo   = filtros.sexos[0]

    try {
      const primeiro = await api.matriz(p)
      setDados(aplicarFiltros(primeiro))
      setProgresso(50)

      if (primeiro.length === 500) {
        const segundo = await api.matriz({ ...p, offset: "500" })
        setDados(prev => [...prev, ...aplicarFiltros(segundo)])
        setProgresso(80)

        if (segundo.length === 500) {
          const terceiro = await api.matriz({ ...p, offset: "1000" })
          setDados(prev => [...prev, ...aplicarFiltros(terceiro)])
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
    carregarTudo()
  }, [filtros, colecoesAlvo, opcoesProntas])

  const grupos = useMemo(() => {
    const map: Record<string, any> = {}
    dados.forEach(row => {
      const key = `${row.cod_produto}-${row.cor}`
      if (!map[key]) map[key] = {
        produto: row.produto, cor: row.cor, modelo: row.modelo,
        marca: row.marca, colecao: row.colecao, sexo: row.sexo, itens: []
      }
      map[key].itens.push(row)
    })
    Object.values(map).forEach((g: any) => {
      g.itens.sort((a: any, b: any) => {
        const ia = ORDEM_TAM.indexOf(a.tamanho), ib = ORDEM_TAM.indexOf(b.tamanho)
        if (ia === -1 && ib === -1) return a.tamanho.localeCompare(b.tamanho)
        if (ia === -1) return 1; if (ib === -1) return -1
        return ia - ib
      })
    })
    return Object.entries(map)
  }, [dados])

  const toggleExpandido = useCallback((key: string) => {
    setExpandidos(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }, [])

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Estoque por Loja</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
            {grupos.length > 0 ? `${grupos.length} produtos · ${dados.length} SKUs` : "Todos os produtos"}
            {ultimaSync && <span style={{ marginLeft: "8px" }}>· atualizado {new Date(ultimaSync).toLocaleTimeString("pt-BR")}</span>}
          </p>
        </div>
        {grupos.length > 0 && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setExpandidos(new Set(grupos.map(([k]) => k)))}
              style={{ padding: "6px 12px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>
              Expandir todos
            </button>
            <button onClick={() => setExpandidos(new Set())}
              style={{ padding: "6px 12px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>
              Recolher todos
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ height: "3px", background: "var(--surface2)", borderRadius: "2px", marginBottom: "12px", overflow: "hidden" }}>
          <div style={{ height: "100%", background: "var(--primary)", borderRadius: "2px", width: `${progresso}%`, transition: "width 0.4s ease" }} />
        </div>
      )}

      <FiltroGlobal opcoes={{ modelos, marcas, porAno, anos }} />

      {dados.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: "10px", marginBottom: "16px" }}>
          {[
            { l: "Produtos",    v: grupos.length, c: "var(--primary)" },
            { l: "SKUs",        v: dados.length,  c: "var(--text)" },
            { l: "Em atenção",  v: dados.filter(r => lojasFiltradas.some(l => saldoReal(r[l.key]) <= 2)).length, c: "var(--warning)" },
            { l: "Total peças", v: dados.reduce((s, r) => s + lojasFiltradas.reduce((ls, l) => ls + saldoReal(r[l.key]), 0), 0).toLocaleString("pt-BR") },
          ].map((k, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px" }}>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
              <div style={{ fontSize: "clamp(16px,2vw,22px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1.2 }}>{k.v}</div>
            </div>
          ))}
        </div>
      )}

      {loading && dados.length === 0 ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>Carregando estoque...
        </div>
      ) : grupos.length === 0 && !loading ? (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          Nenhum produto encontrado com esses filtros.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {grupos.map(([key, grupo]: [string, any]) => {
            const aberto = expandidos.has(key)
            const temCritico = grupo.itens.some((item: any) => lojasFiltradas.some(l => saldoReal(item[l.key]) <= 2))
            const totalGrupo = grupo.itens.reduce((s: number, item: any) =>
              s + lojasFiltradas.reduce((ls, l) => ls + saldoReal(item[l.key]), 0), 0)
            return (
              <div key={key} style={{ background: "var(--surface)", border: `1px solid ${temCritico ? "var(--warning)" : "var(--border)"}`, borderRadius: "10px", overflow: "hidden" }}>
                <div onClick={() => toggleExpandido(key)} style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", background: aberto ? "var(--surface2)" : "transparent", borderBottom: aberto ? "1px solid var(--border)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" }}>{grupo.produto}</div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "1px" }}>{grupo.cor} · {grupo.modelo} · {grupo.marca}</div>
                    </div>
                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "var(--surface2)", color: "var(--muted)", whiteSpace: "nowrap" }}>{grupo.sexo}</span>
                      <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "var(--surface2)", color: "var(--muted)", whiteSpace: "nowrap" }}>{grupo.colecao}</span>
                      <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "var(--surface2)", color: "var(--muted)", whiteSpace: "nowrap" }}>{grupo.itens.length} tam.</span>
                      {temCritico && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "var(--warning-light)", color: "var(--warning)", fontWeight: 600, whiteSpace: "nowrap" }}>⚠ atenção</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Rede</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: totalGrupo === 0 ? "var(--danger)" : totalGrupo <= 5 ? "var(--warning)" : "var(--primary)" }}>{totalGrupo}</div>
                    </div>
                    <span style={{ color: "var(--muted)", fontSize: "14px" }}>{aberto ? "▲" : "▼"}</span>
                  </div>
                </div>
                {aberto && (
                  <div style={{ padding: "10px 16px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table style={{ borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr>
                          <th style={{ ...thS, textAlign: "left", paddingLeft: 0, minWidth: "50px" }}>TAM</th>
                          {lojasFiltradas.map(l => <th key={l.id} style={{ ...thS, textAlign: "center", minWidth: "72px" }}>{l.nome}</th>)}
                          <th style={{ ...thS, textAlign: "center", minWidth: "55px", borderLeft: "1px solid var(--border)" }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.itens.map((item: any, i: number) => {
                          const totalLinha = lojasFiltradas.reduce((s, l) => s + saldoReal(item[l.key]), 0)
                          return (
                            <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                              <td style={{ padding: "6px 8px 6px 0", fontWeight: 700, fontSize: "13px" }}>{item.tamanho}</td>
                              {lojasFiltradas.map(l => {
                                const v = saldoReal(item[l.key]); const c = corSaldo(v)
                                return (
                                  <td key={l.id} style={{ padding: "4px 6px", textAlign: "center" }}>
                                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "6px", background: c.bg, color: c.color, fontWeight: c.fw, fontSize: "12px", minWidth: "32px" }}>{v}</span>
                                  </td>
                                )
                              })}
                              <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "var(--primary)", borderLeft: "1px solid var(--border)" }}>{totalLinha}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: "2px solid var(--border)" }}>
                          <td style={{ padding: "6px 8px 6px 0", fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>TOTAL</td>
                          {lojasFiltradas.map(l => {
                            const total = grupo.itens.reduce((s: number, item: any) => s + saldoReal(item[l.key]), 0)
                            return <td key={l.id} style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, fontSize: "13px", color: total === 0 ? "var(--danger)" : "var(--text)" }}>{total}</td>
                          })}
                          <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "var(--primary)", borderLeft: "1px solid var(--border)" }}>{totalGrupo}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {dados.length > 0 && (
        <div style={{ marginTop: "12px", display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "11px", color: "var(--muted)" }}>
          <span style={{ color: "var(--danger)" }}>■ zerado</span>
          <span style={{ color: "var(--warning)" }}>■ crítico (1-2)</span>
          <span style={{ color: "var(--primary)" }}>■ baixo (3-5)</span>
          <span>■ ok (6+)</span>
        </div>
      )}
    </div>
  )
}
