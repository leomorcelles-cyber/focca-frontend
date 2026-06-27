"use client"
import { useState, useMemo, useCallback, useEffect } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const LOJAS = [
  { id: 1, nome: "P.Nereu",  key: "pres_nereu" },
  { id: 3, nome: "Vidal",    key: "vidal_ramos" },
  { id: 4, nome: "Imbuiá",   key: "imbuia" },
  { id: 5, nome: "Lontras",  key: "lontras" },
  { id: 6, nome: "Chapadão", key: "chapadao" },
  { id: 7, nome: "Hype",     key: "focca_hype" },
]

const SEXOS = ["FEMININO","MASCULINO","FEM INF","MASC INF","UNISSEX","FEMININO CURVES"]
const ORDEM_TAM = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3",
  "34","36","38","40","42","44","46","48","50","P/M","G/GG","U","UNICA"]

function saldoReal(v: any) { return Math.max(0, Number(v) || 0) }

function corSaldo(v: number) {
  if (v === 0) return { bg: "var(--danger-light)",  color: "var(--danger)",  fw: 700 }
  if (v <= 2)  return { bg: "var(--warning-light)", color: "var(--warning)", fw: 600 }
  if (v <= 5)  return { bg: "var(--primary-light)", color: "var(--primary)", fw: 500 }
  return { bg: "transparent", color: "var(--text)", fw: 400 }
}

function Chip({ label, ativo, onClick, small }: { label: string, ativo: boolean, onClick: () => void, small?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? "3px 10px" : "5px 12px",
      borderRadius: "20px", fontSize: small ? "11px" : "12px",
      cursor: "pointer", fontWeight: ativo ? 600 : 400,
      border: "1px solid",
      background: ativo ? "var(--primary)" : "var(--surface2)",
      color: ativo ? "#fff" : "var(--text)",
      borderColor: ativo ? "var(--primary)" : "var(--border)",
      transition: "all 0.1s", whiteSpace: "nowrap" as const,
    }}>{label}</button>
  )
}

const lbl = {
  fontSize: "10px", color: "var(--muted)", fontWeight: 600 as const,
  textTransform: "uppercase" as const, letterSpacing: "0.5px",
  marginBottom: "8px", display: "block" as const,
}

const inp = {
  padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--border)",
  fontSize: "12px", marginBottom: "8px", background: "var(--surface2)",
  color: "var(--text)", outline: "none", width: "200px", display: "block" as const,
}

export default function EstoquePage() {
  // Filtros — estado local, não dispara busca automaticamente
  const [lojasSel,   setLojasSel]   = useState<number[]>([])
  const [sexosSel,   setSexosSel]   = useState<string[]>([])
  const [modelosSel, setModelosSel] = useState<string[]>([])
  const [marcasSel,  setMarcasSel]  = useState<string[]>([])
  const [anosSel,    setAnosSel]    = useState<string[]>([])
  const [estacoesSel,setEstacoesSel]= useState<string[]>([])
  const [colecoesSel,setColecoesSel]= useState<string[]>([])

  const [buscaModelo,  setBuscaModelo]  = useState("")
  const [buscaMarca,   setBuscaMarca]   = useState("")
  const [buscaColecao, setBuscaColecao] = useState("")

  // Opções carregadas uma vez
  const [opModelos,  setOpModelos]  = useState<string[]>([])
  const [opMarcas,   setOpMarcas]   = useState<string[]>([])
  const [opPorAno,   setOpPorAno]   = useState<Record<string,string[]>>({})
  const [opAnos,     setOpAnos]     = useState<string[]>([])

  // Resultados
  const [dados,      setDados]      = useState<any[]>([])
  const [loading,    setLoading]    = useState(false)
  const [buscaFeita, setBuscaFeita] = useState(false)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [filtrosAbertos, setFiltrosAbertos] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/filtros`).then(r => r.json()),
      fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()),
    ]).then(([f, c]) => {
      setOpModelos(f.modelos || [])
      setOpMarcas(f.marcas || [])
      setOpPorAno(c.por_ano || {})
      setOpAnos(c.anos || [])
    })
  }, [])

  // Coleções disponíveis pelos anos+estações selecionados
  const estacoesDisp = useMemo(() => {
    if (!anosSel.length) return []
    const cols = anosSel.flatMap(a => opPorAno[a] || [])
    return [...new Set(cols.map(c => {
      const u = c.toUpperCase()
      if (u.includes("ALTO VERAO") || u.includes("ALTO VERÃO")) return "ALTO VERAO"
      if (u.includes("INVERNO")) return "INVERNO"
      if (u.includes("VERAO") || u.includes("VERÃO")) return "VERAO"
      return "OUTROS"
    }))]
  }, [anosSel, opPorAno])

  const colecoesDisp = useMemo(() => {
    if (!anosSel.length) return []
    const cols = anosSel.flatMap(a => opPorAno[a] || [])
    const filt = estacoesSel.length > 0
      ? cols.filter(c => estacoesSel.some(e => c.toUpperCase().includes(e.toUpperCase())))
      : cols
    const unicas = [...new Set(filt)]
    if (buscaColecao) return unicas.filter(c => c.toLowerCase().includes(buscaColecao.toLowerCase()))
    return unicas.slice(0, 20)
  }, [anosSel, estacoesSel, opPorAno, buscaColecao])

  const modelosVis = useMemo(() => {
    if (buscaModelo) return opModelos.filter(m => m.toLowerCase().includes(buscaModelo.toLowerCase()))
    const sel = opModelos.filter(m => modelosSel.includes(m))
    const resto = opModelos.filter(m => !modelosSel.includes(m)).slice(0, 10 - sel.length)
    return [...sel, ...resto]
  }, [opModelos, buscaModelo, modelosSel])

  const marcasVis = useMemo(() => {
    if (buscaMarca) return opMarcas.filter(m => m.toLowerCase().includes(buscaMarca.toLowerCase()))
    const sel = opMarcas.filter(m => marcasSel.includes(m))
    const resto = opMarcas.filter(m => !marcasSel.includes(m)).slice(0, 10 - sel.length)
    return [...sel, ...resto]
  }, [opMarcas, buscaMarca, marcasSel])

  function toggle<T>(set: T[], val: T, setter: (v: T[]) => void) {
    setter(set.includes(val) ? set.filter(x => x !== val) : [...set, val])
  }

  function limparFiltros() {
    setLojasSel([]); setSexosSel([]); setModelosSel([]); setMarcasSel([])
    setAnosSel([]); setEstacoesSel([]); setColecoesSel([])
    setBuscaModelo(""); setBuscaMarca(""); setBuscaColecao("")
  }

  const totalFiltros = lojasSel.length + sexosSel.length + modelosSel.length +
    marcasSel.length + anosSel.length + estacoesSel.length + colecoesSel.length

  // Coleções alvo para a query
  const colecoesAlvo = useMemo(() => {
    if (colecoesSel.length > 0) return colecoesSel
    if (!anosSel.length) return []
    const cols = anosSel.flatMap(a => opPorAno[a] || [])
    if (!estacoesSel.length) return cols
    return cols.filter(c => estacoesSel.some(e => c.toUpperCase().includes(e.toUpperCase())))
  }, [colecoesSel, anosSel, estacoesSel, opPorAno])

  async function buscar() {
    setLoading(true)
    setBuscaFeita(true)
    setDados([])
    setExpandidos(new Set())

    const p = new URLSearchParams({ limite: "1000" })
    if (marcasSel.length === 1)  p.set("marca",  marcasSel[0])
    if (modelosSel.length === 1) p.set("modelo", modelosSel[0])
    if (sexosSel.length === 1)   p.set("sexo",   sexosSel[0])
    if (anosSel.length === 1 && !colecoesSel.length && !estacoesSel.length)
      p.set("ano", anosSel[0])

    try {
      const res = await fetch(`${API_URL}/matriz?${p}`)
      let rows = await res.json()

      // Filtros no frontend
      if (sexosSel.length > 1)   rows = rows.filter((r: any) => sexosSel.some(s => r.sexo?.includes(s)))
      if (modelosSel.length > 1) rows = rows.filter((r: any) => modelosSel.some(m => r.modelo?.includes(m)))
      if (marcasSel.length > 1)  rows = rows.filter((r: any) => marcasSel.includes(r.marca))
      if (colecoesAlvo.length)   rows = rows.filter((r: any) => colecoesAlvo.includes(r.colecao))

      setDados(rows)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const lojasFiltradas = lojasSel.length > 0 ? LOJAS.filter(l => lojasSel.includes(l.id)) : LOJAS

  const grupos = useMemo(() => {
    const map: Record<string, any> = {}
    dados.forEach(row => {
      const key = `${row.cod_produto}-${row.cor}`
      if (!map[key]) map[key] = { produto: row.produto, cor: row.cor, modelo: row.modelo, marca: row.marca, colecao: row.colecao, sexo: row.sexo, itens: [] }
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

  const thS = { padding: "5px 8px", color: "var(--muted)" as const, fontWeight: 600 as const, fontSize: "10px" as const, textTransform: "uppercase" as const, letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Estoque por Loja</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
            {dados.length > 0 ? `${grupos.length} produtos · ${dados.length} SKUs` : "Selecione filtros e clique em Buscar"}
          </p>
        </div>
        {grupos.length > 0 && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setExpandidos(new Set(grupos.map(([k]) => k)))} style={{ padding: "6px 12px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>Expandir todos</button>
            <button onClick={() => setExpandidos(new Set())} style={{ padding: "6px 12px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>Recolher todos</button>
          </div>
        )}
      </div>

      {/* Painel de filtros */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "16px", overflow: "hidden" }}>
        {/* Header do painel */}
        <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: filtrosAbertos ? "1px solid var(--border)" : "none", background: "var(--surface2)" }}>
          <button onClick={() => setFiltrosAbertos(!filtrosAbertos)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
            {filtrosAbertos ? "▲" : "▼"} Filtros {totalFiltros > 0 ? `· ${totalFiltros} ativos` : ""}
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            {totalFiltros > 0 && (
              <button onClick={limparFiltros} style={{ padding: "6px 12px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>
                ✕ Limpar ({totalFiltros})
              </button>
            )}
            <button onClick={buscar} disabled={loading} style={{
              padding: "8px 20px", background: "var(--primary)", color: "#fff",
              border: "none", borderRadius: "8px", cursor: loading ? "default" : "pointer",
              fontSize: "13px", fontWeight: 700, opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Buscando..." : "🔍 Buscar"}
            </button>
          </div>
        </div>

        {/* Filtros */}
        {filtrosAbertos && (
          <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>

            {/* Loja */}
            <div>
              <label style={lbl}>Loja {lojasSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {lojasSel.length} sel.</span>}</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {LOJAS.map(l => <Chip key={l.id} label={l.nome} ativo={lojasSel.includes(l.id)} onClick={() => toggle(lojasSel, l.id, setLojasSel)} />)}
              </div>
            </div>

            {/* Sexo */}
            <div>
              <label style={lbl}>Sexo {sexosSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {sexosSel.length} sel.</span>}</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {SEXOS.map(s => <Chip key={s} label={s} ativo={sexosSel.includes(s)} onClick={() => toggle(sexosSel, s, setSexosSel)} />)}
              </div>
            </div>

            {/* Modelo */}
            <div>
              <label style={lbl}>Modelo {modelosSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {modelosSel.length} sel.</span>}</label>
              <input placeholder={`Buscar entre ${opModelos.length} modelos...`} value={buscaModelo} onChange={e => setBuscaModelo(e.target.value)} style={inp} />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {modelosVis.map(m => <Chip key={m} label={m} small ativo={modelosSel.includes(m)} onClick={() => toggle(modelosSel, m, setModelosSel)} />)}
              </div>
            </div>

            {/* Marca */}
            <div>
              <label style={lbl}>Marca {marcasSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {marcasSel.length} sel.</span>}</label>
              <input placeholder={`Buscar entre ${opMarcas.length} marcas...`} value={buscaMarca} onChange={e => setBuscaMarca(e.target.value)} style={inp} />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {marcasVis.map(m => <Chip key={m} label={m} small ativo={marcasSel.includes(m)} onClick={() => toggle(marcasSel, m, setMarcasSel)} />)}
              </div>
            </div>

            {/* Ano */}
            <div>
              <label style={lbl}>Ano {anosSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {anosSel.length} sel.</span>}</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {opAnos.map(a => <Chip key={a} label={a} small ativo={anosSel.includes(a)} onClick={() => { toggle(anosSel, a, setAnosSel); setEstacoesSel([]); setColecoesSel([]) }} />)}
              </div>
            </div>

            {/* Estação */}
            {anosSel.length > 0 && (
              <div>
                <label style={lbl}>Estação {estacoesSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {estacoesSel.length} sel.</span>}</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {estacoesDisp.map(e => <Chip key={e} label={e} small ativo={estacoesSel.includes(e)} onClick={() => { toggle(estacoesSel, e, setEstacoesSel); setColecoesSel([]) }} />)}
                </div>
              </div>
            )}

            {/* Coleção */}
            {anosSel.length > 0 && (
              <div>
                <label style={lbl}>Coleção {colecoesSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {colecoesSel.length} sel.</span>}</label>
                <input placeholder="Buscar coleção..." value={buscaColecao} onChange={e => setBuscaColecao(e.target.value)} style={inp} />
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {colecoesDisp.map(c => <Chip key={c} label={c} small ativo={colecoesSel.includes(c)} onClick={() => toggle(colecoesSel, c, setColecoesSel)} />)}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* KPIs */}
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

      {/* Resultados */}
      {!buscaFeita ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📦</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>Selecione os filtros e clique em Buscar</div>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>Você pode buscar por marca, modelo, ano, coleção ou loja</div>
        </div>
      ) : loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>Buscando...
        </div>
      ) : grupos.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          Nenhum produto encontrado com esses filtros.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {grupos.map(([key, grupo]: [string, any]) => {
            const aberto = expandidos.has(key)
            const temCritico = grupo.itens.some((item: any) => lojasFiltradas.some(l => saldoReal(item[l.key]) <= 2))
            const totalGrupo = grupo.itens.reduce((s: number, item: any) => s + lojasFiltradas.reduce((ls, l) => ls + saldoReal(item[l.key]), 0), 0)
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
                      <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Rede</div>
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
