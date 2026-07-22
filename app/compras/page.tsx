"use client"
import { useState, useMemo, useEffect, useRef, memo } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import FiltroGlobal, { LOJAS } from "@/components/FiltroGlobal"
import { useFiltros, resolverColecoes } from "@/components/FiltroContext"
import { useSelecao, chaveItem } from "@/components/SelecaoContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const ORDEM_TAM = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3",
  "34","36","38","40","42","44","46","48","50","P/M","G/GG","U","UNICA"]

// Dois modos de priorizacao. SALDO = comportamento antigo (so quantidade em rede).
// COBERTURA = decisao de compra de verdade: cruza saldo com giro (dias_cobertura).
const STATUS_SALDO = [
  { key: "ZERADO",   label: "Zerado",   cor: "var(--danger)"  },
  { key: "CRITICO",  label: "Crítico",  cor: "var(--danger)"  },
  { key: "BAIXO",    label: "Baixo",    cor: "var(--warning)" },
  { key: "MEDIO",    label: "Médio",    cor: "var(--orange)"  },
  { key: "SAUDAVEL", label: "Saudável", cor: "var(--success)" },
]
const STATUS_COBERTURA = [
  { key: "RUPTURA",  label: "Ruptura iminente", cor: "var(--danger)"  },
  { key: "REPOR",    label: "Repor",            cor: "var(--warning)" },
  { key: "SAUDAVEL", label: "Saudável",         cor: "var(--success)" },
  { key: "EXCESSO",  label: "Excesso parado",   cor: "var(--orange)"  },
  { key: "SEM_GIRO", label: "Sem giro",         cor: "var(--muted)"   },
]
// prioridade de ordenacao no modo cobertura (menor = mais urgente)
const PRIORIDADE_COB: Record<string, number> = { RUPTURA: 0, REPOR: 1, SAUDAVEL: 2, EXCESSO: 3, SEM_GIRO: 4 }

function saldoReal(v: any) { return Math.max(0, Number(v) || 0) }
function calcStatus(t: number) {
  if (t === 0) return { label: "ZERADO",   cor: "var(--danger)",  bg: "var(--danger-light)"  }
  if (t <= 2)  return { label: "CRITICO",  cor: "var(--danger)",  bg: "var(--danger-light)"  }
  if (t <= 5)  return { label: "BAIXO",    cor: "var(--warning)", bg: "var(--warning-light)" }
  if (t <= 15) return { label: "MEDIO",    cor: "var(--orange)",  bg: "var(--orange-light)"  }
  return             { label: "SAUDAVEL", cor: "var(--success)", bg: "var(--success-light)" }
}
// Status por cobertura. giro = pecas/dia na rede; dias = saldoRede / giro (cobertura).
// Bandas TODAS relativas ao alvo (nada fixo) porque no varejo de jeans o giro e naturalmente
// lento — um produto com muitos dias de cobertura costuma ser normal, nao excesso.
//   RUPTURA  : cobertura < 30% do alvo  (vai faltar bem antes de repor)
//   REPOR    : cobertura < alvo         (abaixo do desejado)
//   SAUDAVEL : cobertura ate 4x o alvo  (folga confortavel p/ item que sai devagar)
//   EXCESSO  : acima de 4x o alvo       (capital realmente parado)
function calcStatusCobertura(giro: number, dias: number | null, saldoRede: number, diasAlvo: number) {
  if (!giro || giro <= 0 || dias === null) {
    // nao gira: neutro (cadastro/novo/descontinuado) — nao entra na fila de reposicao
    return { label: "SEM_GIRO", cor: "var(--muted)", bg: "var(--surface2)" }
  }
  if (dias < diasAlvo * 0.3) return { label: "RUPTURA",  cor: "var(--danger)",  bg: "var(--danger-light)"  }
  if (dias < diasAlvo)       return { label: "REPOR",    cor: "var(--warning)", bg: "var(--warning-light)" }
  if (dias <= diasAlvo * 4)  return { label: "SAUDAVEL", cor: "var(--success)", bg: "var(--success-light)" }
  return                            { label: "EXCESSO",  cor: "var(--orange)",  bg: "var(--orange-light)"  }
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

function fmtGiro(g: number) {
  if (!g || g <= 0) return "—"
  return g >= 1 ? `${g.toFixed(1)}/dia` : `1 a cada ${Math.round(1 / g)}d`
}
const LinhaProduto = memo(({ prod, onClick, mostrarMarca }: { prod: any, onClick: () => void, mostrarMarca?: boolean }) => {
  const st = prod.status
  const temGiro = prod.giroRede > 0
  return (
    <div onClick={onClick} style={{ background: "var(--surface)", border: `1px solid ${["ZERADO","CRITICO","RUPTURA"].includes(st.label) ? "var(--danger)" : "var(--border)"}`, borderRadius: "10px", padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "260px" }}>{prod.produto}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "1px" }}>{prod.cor} · {prod.modelo}</div>
        </div>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {mostrarMarca && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "var(--primary-light)", color: "var(--primary)", fontWeight: 600, whiteSpace: "nowrap" }}>{prod.marca}</span>}
          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "var(--surface2)", color: "var(--muted)", whiteSpace: "nowrap" }}>{prod.sexo}</span>
          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "var(--surface2)", color: "var(--muted)", whiteSpace: "nowrap" }}>{prod.colecao}</span>
          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "var(--surface2)", color: "var(--muted)", whiteSpace: "nowrap" }}>{prod.tamanhosDistintos} tam.</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
        {prod.precoMax > 0 && <div style={{ textAlign: "right" }}><div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Preço</div><div style={{ fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>{prod.temPrecoDivergente ? <>R$ {prod.precoMin.toFixed(0)}~{prod.precoMax.toFixed(0)} <span title="Preços divergentes na rede" style={{ fontSize: "11px" }}>⚠️</span></> : <>R$ {prod.precoMax.toFixed(0)}</>}</div></div>}
        <div style={{ textAlign: "right" }}><div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Rede</div><div style={{ fontSize: "16px", fontWeight: 700, color: prod.totalRede === 0 ? "var(--danger)" : prod.totalRede <= 5 ? "var(--warning)" : "var(--primary)" }}>{prod.totalRede}</div></div>
        {temGiro && (
          <div style={{ textAlign: "right", minWidth: "70px" }}>
            <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Cobertura</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: st.cor }}>{prod.diasCobertura != null ? `${Math.round(prod.diasCobertura)}d` : "—"}</div>
            <div style={{ fontSize: "10px", color: "var(--muted)" }}>{fmtGiro(prod.giroRede)}</div>
          </div>
        )}
        {prod.qtdSugerida > 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Comprar</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--primary)" }}>+{prod.qtdSugerida}</div>
          </div>
        )}
        <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "4px", background: st.bg, color: st.cor, whiteSpace: "nowrap" }}>{st.label}</span>
        <span style={{ color: "var(--muted)", fontSize: "13px" }}>›</span>
      </div>
    </div>
  )
})
LinhaProduto.displayName = "LinhaProduto"

function ModalDetalhe({ prod, lojasFiltradas, onClose }: { prod: any, lojasFiltradas: typeof LOJAS, onClose: () => void }) {
  const { toggle, temItem } = useSelecao()
  const [grade, setGrade] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [outrasCores, setOutrasCores] = useState<string[]>([])
  const [verCores, setVerCores] = useState(false)
  const [corAtiva, setCorAtiva] = useState<string>(prod?.cor || "")

  useEffect(() => {
    if (!prod) return
    setCarregando(true)
    const p = new URLSearchParams({ produto: prod.produto })
    if (corAtiva) p.set("cor", corAtiva)
    fetch(`${API_URL}/produto/grade?${p}`)
      .then(r => r.json())
      .then(g => setGrade(Array.isArray(g) ? g : []))
      .catch(() => setGrade([]))
      .finally(() => setCarregando(false))
  }, [prod, corAtiva])

  function carregarOutrasCores() {
    if (verCores) { setVerCores(false); return }
    setVerCores(true)
    fetch(`${API_URL}/produto/grade?produto=${encodeURIComponent(prod.produto)}`)
      .then(r => r.json())
      .then(g => {
        const cores = [...new Set((Array.isArray(g) ? g : []).map((x: any) => x.cor as string))]
        setOutrasCores(cores as string[])
      })
      .catch(() => setOutrasCores([]))
  }

  if (!prod) return null

  const gradeOrd = [...grade].sort((a, b) => {
    const ia = ORDEM_TAM.indexOf(a.tamanho), ib = ORDEM_TAM.indexOf(b.tamanho)
    if (ia === -1 && ib === -1) return String(a.tamanho).localeCompare(String(b.tamanho))
    if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib
  })

  const contagemTam: Record<string, number> = {}
  gradeOrd.forEach(l => { contagemTam[l.tamanho] = (contagemTam[l.tamanho] || 0) + 1 })

  function itemDe(linha: any) {
    const lojas: Record<string, number> = {}
    LOJAS.forEach(l => { lojas[String(l.id)] = saldoReal(linha.lojas?.[String(l.id)]) })
    const totalRede = Object.values(lojas).reduce((s, v) => s + v, 0)
    return { cod_produto: linha.cod_produto, produto: linha.produto, cor: linha.cor, tamanho: linha.tamanho, modelo: linha.modelo, marca: linha.marca, colecao: linha.colecao, lojas, totalRede }
  }

  const todosMarcados = gradeOrd.length > 0 && gradeOrd.every(l => temItem(chaveItem({ cod_produto: l.cod_produto, cor: l.cor, tamanho: l.tamanho })))
  function toggleTodos() {
    gradeOrd.forEach(l => {
      const it = itemDe(l)
      const marcado = temItem(chaveItem(it))
      if (todosMarcados && marcado) toggle(it)
      else if (!todosMarcados && !marcado) toggle(it)
    })
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: "14px", maxWidth: "900px", width: "100%", maxHeight: "86vh", overflow: "auto", border: "1px solid var(--border)" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "sticky", top: 0, background: "var(--surface)", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{prod.produto}</div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "3px" }}>{corAtiva} &middot; {prod.modelo} &middot; {prod.marca} &middot; {prod.colecao}</div>
            <div style={{ fontSize: "11px", color: "var(--primary)", marginTop: "4px" }}>Marque os tamanhos para adicionar a selecao de analise</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "var(--muted)", lineHeight: 1 }}>&times;</button>
        </div>

        <div style={{ padding: "18px 22px" }}>
          <div style={{ marginBottom: "14px" }}>
            <button onClick={carregarOutrasCores} style={{ padding: "7px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: verCores ? "var(--primary-light)" : "var(--surface2)", color: verCores ? "var(--primary)" : "var(--text)", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
              {verCores ? "Ocultar cores" : "Ver outras cores"}
            </button>
            {verCores && outrasCores.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                {outrasCores.map(c => (
                  <button key={c} onClick={() => setCorAtiva(c)} style={{
                    padding: "5px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer",
                    fontWeight: corAtiva === c ? 700 : 400, border: "1px solid",
                    background: corAtiva === c ? "var(--primary)" : "var(--surface2)",
                    color: corAtiva === c ? "#fff" : "var(--text)",
                    borderColor: corAtiva === c ? "var(--primary)" : "var(--border)",
                  }}>{c}</button>
                ))}
              </div>
            )}
          </div>

          {carregando ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>Carregando grade completa...</div>
          ) : gradeOrd.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>Grade nao encontrada.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead><tr>
                  <th style={{ ...thCell, textAlign: "center", width: "44px" }}>
                    <input type="checkbox" checked={todosMarcados} onChange={toggleTodos} style={{ cursor: "pointer", width: "17px", height: "17px", accentColor: "var(--primary)" }} title="Selecionar todos" />
                  </th>
                  <th style={{ ...thCell, textAlign: "left", paddingLeft: "12px", minWidth: "60px" }}>TAM</th>
                  <th style={{ ...thCell, minWidth: "80px" }}>PRECO</th>
                  {lojasFiltradas.map(l => <th key={l.id} style={{ ...thCell, minWidth: "62px" }}>{l.nome}</th>)}
                  <th style={{ ...thCell, borderLeft: "2px solid var(--border)", minWidth: "55px" }}>TOTAL</th>
                </tr></thead>
                <tbody>
                  {gradeOrd.map((linha, ii) => {
                    const it = itemDe(linha)
                    const marcado = temItem(chaveItem(it))
                    const totalLinha = it.totalRede || 0
                    const duplicado = contagemTam[linha.tamanho] > 1
                    const preco = Number(linha.preco_venda) || 0
                    return (
                      <tr key={ii} style={{ borderTop: "1px solid var(--border)", background: marcado ? "var(--primary-light)" : "transparent", cursor: "pointer" }} onClick={() => toggle(it)}>
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          <input type="checkbox" checked={marcado} onChange={() => toggle(it)} onClick={e => e.stopPropagation()} style={{ cursor: "pointer", width: "17px", height: "17px", accentColor: "var(--primary)" }} />
                        </td>
                        <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: "13px" }}>
                          {linha.tamanho}
                          {duplicado && <span title="Este tamanho tem cadastros com precos diferentes" style={{ marginLeft: "5px", fontSize: "11px" }}>&#9888;</span>}
                        </td>
                        <td style={{ padding: "8px 12px", color: preco > 0 ? "var(--text)" : "var(--muted)", fontWeight: 600 }}>
                          {preco > 0 ? `R$ ${preco.toFixed(2)}` : "-"}
                        </td>
                        {lojasFiltradas.map(l => { const v = saldoReal(linha.lojas?.[String(l.id)]); const c = corCelula(v); return (
                          <td key={l.id} style={{ padding: "5px 8px", textAlign: "center" }}>
                            <span style={{ display: "inline-block", minWidth: "30px", padding: "4px 8px", borderRadius: "6px", background: c.bg, color: c.color, fontWeight: c.fw }}>{v}</span>
                          </td>
                        )})}
                        <td style={{ padding: "6px 12px", textAlign: "center", fontWeight: 700, color: totalLinha === 0 ? "var(--danger)" : "var(--primary)", borderLeft: "2px solid var(--border)" }}>{totalLinha}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {Object.values(contagemTam).some(c => c > 1) && (
                <div style={{ marginTop: "12px", fontSize: "11px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>&#9888;</span> Tamanhos marcados tem cadastros com precos diferentes na rede (possivel remarcacao ou duplicata no Microvix).
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ComprasPage() {
  const { filtros, versaoBusca } = useFiltros()
  const { adicionarVarios, limpar, itens: itensSelecionados } = useSelecao()
  const [statusFiltro, setStatusFiltro] = useState<string[]>([])
  const [modo, setModo] = useState<"saldo" | "cobertura">("cobertura")
  const [diasAlvo, setDiasAlvo] = useState<number>(90)
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
    const p = new URLSearchParams({ limite: "15000" })
    if (filtros.marcas.length)  p.set("marca",  filtros.marcas.join(","))
    if (filtros.produtos.length) p.set("produto", filtros.produtos.join(","))
    if (filtros.cores.length)    p.set("cor",     filtros.cores.join(","))
    if (filtros.ids.trim())      p.set("cod_produto", filtros.ids.split(/[\s,;]+/).filter(Boolean).join(","))
    if (filtros.modelos.length) p.set("modelo", filtros.modelos.join(","))
    if (filtros.sexos.length)   p.set("sexo",   filtros.sexos.join(","))
    if (filtros.colecoes.length) p.set("colecao", filtros.colecoes.join(","))
    else if (filtros.anos.length && filtros.estacoes.length && colecoesAlvo.length) p.set("colecao", colecoesAlvo.join(","))
    else if (filtros.anos.length) p.set("ano", filtros.anos.join(","))
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
      // AGRUPA POR PRODUTO+COR (descricao, nao cod_produto) — junta SKUs duplicados
      const key = `${row.produto}||${row.cor}`
      if (!map[key]) map[key] = { produto: row.produto, cor: row.cor, modelo: row.modelo, colecao: row.colecao, sexo: row.sexo, marca: row.marca, itens: [] }
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
      // GIRO da rede: soma o giro_rede (pecas/dia) de cada SKU vindo do backend.
      // saldoRedeFull usa total_rede (rede inteira, nao filtrado por loja) p/ cobertura coerente com o giro.
      prod.giroRede = prod.itens.reduce((s: number, it: any) => s + (Number(it.giro_rede) || 0), 0)
      prod.saldoRedeFull = prod.itens.reduce((s: number, it: any) => s + saldoReal(it.total_rede), 0)
      prod.diasCobertura = prod.giroRede > 0 ? prod.saldoRedeFull / prod.giroRede : null
      // FAIXA DE PRECO (min ~ max) entre os SKUs com preco valido
      const precos = prod.itens.map((it: any) => Number(it.preco_venda) || 0).filter((p: number) => p > 0)
      prod.precoMin = precos.length ? Math.min(...precos) : 0
      prod.precoMax = precos.length ? Math.max(...precos) : 0
      prod.temPrecoDivergente = prod.precoMin !== prod.precoMax
      // quantos tamanhos distintos (nao SKUs)
      prod.tamanhosDistintos = new Set(prod.itens.map((it: any) => it.tamanho)).size
      // Status conforme o modo escolhido. Cobertura = decisao de compra; saldo = comportamento antigo.
      prod.status = modo === "cobertura"
        ? calcStatusCobertura(prod.giroRede, prod.diasCobertura, prod.saldoRedeFull, diasAlvo)
        : calcStatus(prod.totalRede)
      // Qtd sugerida de compra p/ atingir o alvo de cobertura (so p/ quem gira e esta abaixo do alvo).
      prod.qtdSugerida = prod.giroRede > 0
        ? Math.max(0, Math.ceil(prod.giroRede * diasAlvo - prod.saldoRedeFull))
        : 0
      return prod
    })
  }, [dados, lojasFiltradas, modo, diasAlvo])

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
      if (["ZERADO","CRITICO","RUPTURA"].includes(p.status.label)) map[p.marca].criticos++
    })
    return Object.entries(map).map(([marca, v]) => ({ marca, ...v }))
      .sort((a, b) => b.criticos - a.criticos || a.marca.localeCompare(b.marca))
  }, [produtosStatus])

  const produtosVisiveis = useMemo(() => {
    const base = marcaSel === "GERAL" ? produtosStatus : produtosStatus.filter((p: any) => p.marca === marcaSel)
    if (modo !== "cobertura") return base
    // No modo cobertura, ordena por urgencia: ruptura -> repor -> saudavel -> excesso -> sem giro,
    // e dentro do grupo pela menor cobertura (mais perto de faltar primeiro).
    return [...base].sort((a: any, b: any) => {
      const pa = PRIORIDADE_COB[a.status.label] ?? 5, pb = PRIORIDADE_COB[b.status.label] ?? 5
      if (pa !== pb) return pa - pb
      const da = a.diasCobertura ?? Infinity, db = b.diasCobertura ?? Infinity
      return da - db
    })
  }, [produtosStatus, marcaSel, modo])

  // VIRTUALIZAÇÃO — só renderiza os produtos visíveis na viewport
  const virtualizer = useVirtualizer({
    count: produtosVisiveis.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,   // altura aproximada de cada linha + gap
    overscan: 8,              // renderiza 8 extras acima/abaixo para scroll suave
  })

  // ---- SELEÇÃO EM MASSA (para análise/relatório) ----
  // Constrói um item de seleção (SKU) a partir de uma linha da matriz, com o
  // MESMO formato do modal (lojas por id + totalRede) que o Relatório consome.
  function itemSelecaoDe(it: any) {
    const lojas: Record<string, number> = {}
    LOJAS.forEach(l => { lojas[String(l.id)] = saldoReal(it[l.key]) })
    return { cod_produto: it.cod_produto, produto: it.produto, cor: it.cor, tamanho: it.tamanho,
             modelo: it.modelo, marca: it.marca, colecao: it.colecao, lojas, totalRede: it.totalReal ?? 0 }
  }
  // Total de SKUs (todos os tamanhos) dos produtos atualmente na lista
  const skusVisiveis = useMemo(
    () => produtosVisiveis.reduce((s: number, p: any) => s + (p.itens?.length || 0), 0),
    [produtosVisiveis]
  )
  function selecionarTudo() {
    const novos: any[] = []
    produtosVisiveis.forEach((prod: any) => (prod.itens || []).forEach((it: any) => novos.push(itemSelecaoDe(it))))
    adicionarVarios(novos)   // um único setState, dedup — pega TODOS os tamanhos
  }

  function exportar() {
    const p = new URLSearchParams()
    if (marcaSel !== "GERAL") p.set("marca", marcaSel)
    else if (filtros.marcas.length === 1) p.set("marca", filtros.marcas[0])
    if (filtros.modelos.length) p.set("modelo", filtros.modelos.join(","))
    if (filtros.sexos.length)   p.set("sexo",   filtros.sexos.join(","))
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
        {buscaFeita && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={selecionarTudo} disabled={skusVisiveis === 0} title="Adiciona todos os produtos filtrados (todos os tamanhos) à seleção de análise" style={{ padding: "8px 14px", background: skusVisiveis === 0 ? "var(--surface2)" : "var(--success)", color: skusVisiveis === 0 ? "var(--muted)" : "#fff", border: "none", borderRadius: "8px", cursor: skusVisiveis === 0 ? "default" : "pointer", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" }}>✓ Selecionar todos ({skusVisiveis} SKUs)</button>
            {itensSelecionados.length > 0 && (
              <button onClick={limpar} title="Esvazia a seleção de análise" style={{ padding: "8px 14px", background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" }}>✕ Limpar seleção ({itensSelecionados.length})</button>
            )}
            <button onClick={exportar} style={{ padding: "8px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" }}>⬇ Exportar CSV</button>
          </div>
        )}
      </div>

      <FiltroGlobal onBuscar={buscar} loading={loading} mostrarSaldo />

      {produtos.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 16px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Linha 1: modo de priorizacao + alvo de cobertura */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Priorizar por:</span>
            <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)" }}>
              {([["cobertura","Cobertura + giro"],["saldo","Saldo em rede"]] as const).map(([k, lbl]) => (
                <button key={k} onClick={() => { setModo(k); setStatusFiltro([]) }} style={{ padding: "5px 12px", fontSize: "12px", fontWeight: modo === k ? 700 : 500, cursor: "pointer", border: "none", background: modo === k ? "var(--primary)" : "var(--surface2)", color: modo === k ? "#fff" : "var(--text)", whiteSpace: "nowrap" }}>{lbl}</button>
              ))}
            </div>
            {modo === "cobertura" && (
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", whiteSpace: "nowrap" }}>Alvo de cobertura:</span>
                {[60, 90, 120, 180].map(d => (
                  <button key={d} onClick={() => setDiasAlvo(d)} style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", fontWeight: diasAlvo === d ? 700 : 400, border: "1px solid", background: diasAlvo === d ? "var(--primary-light)" : "var(--surface2)", color: diasAlvo === d ? "var(--primary)" : "var(--text)", borderColor: diasAlvo === d ? "var(--primary)" : "var(--border)" }}>{d}d</button>
                ))}
              </div>
            )}
          </div>
          {/* Linha 2: chips de status (dinamicos por modo) */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Status:</span>
            {(modo === "cobertura" ? STATUS_COBERTURA : STATUS_SALDO).map(opt => {
              const count = contagemStatus[opt.key] || 0
              if (count === 0) return null
              const ativo = statusFiltro.includes(opt.key)
              return <button key={opt.key} onClick={() => setStatusFiltro(prev => prev.includes(opt.key) ? prev.filter(x => x !== opt.key) : [...prev, opt.key])} style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", fontWeight: ativo ? 700 : 400, border: "1px solid", background: ativo ? opt.cor : "var(--surface2)", color: ativo ? "#fff" : opt.cor, borderColor: opt.cor, whiteSpace: "nowrap" }}>{opt.label} ({count})</button>
            })}
            {statusFiltro.length > 0 && <button onClick={() => setStatusFiltro([])} style={{ padding: "4px 10px", background: "none", border: "1px solid var(--border)", borderRadius: "20px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>✕ Todos</button>}
          </div>
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
              {modo === "cobertura" && (() => {
                const repor = produtosVisiveis.filter((p: any) => p.qtdSugerida > 0)
                const pecas = repor.reduce((s: number, p: any) => s + p.qtdSugerida, 0)
                if (pecas === 0) return null
                return (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sugestão de compra (alvo {diasAlvo}d)</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>{repor.length} produtos · <span style={{ color: "var(--primary)" }}>+{pecas.toLocaleString("pt-BR")} peças</span></div>
                  </div>
                )
              })()}
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
