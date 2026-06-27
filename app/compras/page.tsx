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

const STATUS_OPTS = [
  { key: "ZERADO",   label: "Zerado",   cor: "var(--danger)"  },
  { key: "CRITICO",  label: "Crítico",  cor: "var(--danger)"  },
  { key: "BAIXO",    label: "Baixo",    cor: "var(--warning)" },
  { key: "MEDIO",    label: "Médio",    cor: "var(--orange)"  },
  { key: "SAUDAVEL", label: "Saudável", cor: "var(--success)" },
]

function saldoReal(v: any) { return Math.max(0, Number(v) || 0) }

function calcStatus(total: number) {
  if (total === 0) return { label: "ZERADO",   cor: "var(--danger)",  bg: "var(--danger-light)"  }
  if (total <= 2)  return { label: "CRITICO",  cor: "var(--danger)",  bg: "var(--danger-light)"  }
  if (total <= 5)  return { label: "BAIXO",    cor: "var(--warning)", bg: "var(--warning-light)" }
  if (total <= 15) return { label: "MEDIO",    cor: "var(--orange)",  bg: "var(--orange-light)"  }
  return               { label: "SAUDAVEL", cor: "var(--success)", bg: "var(--success-light)" }
}

function corCelula(v: number) {
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

const thCell = {
  padding: "8px 12px", fontSize: "10px", fontWeight: 600 as const,
  color: "var(--muted)" as const, textTransform: "uppercase" as const,
  letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const,
  background: "var(--surface2)" as const, textAlign: "center" as const,
  borderBottom: "2px solid var(--border)" as const,
}

const lbl = { fontSize: "10px", color: "var(--muted)", fontWeight: 600 as const, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: "8px", display: "block" as const }
const inp = { padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "12px", marginBottom: "8px", background: "var(--surface2)", color: "var(--text)", outline: "none", width: "200px", display: "block" as const }

export default function ComprasPage() {
  const [lojasSel,    setLojasSel]    = useState<number[]>([])
  const [sexosSel,    setSexosSel]    = useState<string[]>([])
  const [modelosSel,  setModelosSel]  = useState<string[]>([])
  const [marcasSel,   setMarcasSel]   = useState<string[]>([])
  const [anosSel,     setAnosSel]     = useState<string[]>([])
  const [estacoesSel, setEstacoesSel] = useState<string[]>([])
  const [colecoesSel, setColecoesSel] = useState<string[]>([])
  const [statusFiltro,setStatusFiltro]= useState<string[]>([])

  const [buscaModelo,  setBuscaModelo]  = useState("")
  const [buscaMarca,   setBuscaMarca]   = useState("")
  const [buscaColecao, setBuscaColecao] = useState("")

  const [opModelos, setOpModelos] = useState<string[]>([])
  const [opMarcas,  setOpMarcas]  = useState<string[]>([])
  const [opPorAno,  setOpPorAno]  = useState<Record<string,string[]>>({})
  const [opAnos,    setOpAnos]    = useState<string[]>([])

  const [dados,      setDados]      = useState<any[]>([])
  const [loading,    setLoading]    = useState(false)
  const [buscaFeita, setBuscaFeita] = useState(false)
  const [marcaSel,   setMarcaSel]   = useState("")
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
    setAnosSel([]); setEstacoesSel([]); setColecoesSel([]); setStatusFiltro([])
    setBuscaModelo(""); setBuscaMarca(""); setBuscaColecao("")
  }

  const totalFiltros = lojasSel.length + sexosSel.length + modelosSel.length +
    marcasSel.length + anosSel.length + estacoesSel.length + colecoesSel.length

  const colecoesAlvo = useMemo(() => {
    if (colecoesSel.length > 0) return colecoesSel
    if (!anosSel.length) return []
    const cols = anosSel.flatMap(a => opPorAno[a] || [])
    if (!estacoesSel.length) return cols
    return cols.filter(c => estacoesSel.some(e => c.toUpperCase().includes(e.toUpperCase())))
  }, [colecoesSel, anosSel, estacoesSel, opPorAno])

  const lojasFiltradas = lojasSel.length > 0 ? LOJAS.filter(l => lojasSel.includes(l.id)) : LOJAS

  async function buscar() {
    setLoading(true)
    setBuscaFeita(true)
    setDados([])
    setMarcaSel("")
    setStatusFiltro([])

    const p = new URLSearchParams({ limite: "2000" })
    if (marcasSel.length === 1)  p.set("marca",  marcasSel[0])
    if (modelosSel.length === 1) p.set("modelo", modelosSel[0])
    if (sexosSel.length === 1)   p.set("sexo",   sexosSel[0])
    if (anosSel.length === 1 && !colecoesSel.length && !estacoesSel.length)
      p.set("ano", anosSel[0])

    try {
      const res = await fetch(`${API_URL}/matriz?${p}`)
      let rows = await res.json()
      if (sexosSel.length > 1)   rows = rows.filter((r: any) => sexosSel.some(s => r.sexo?.includes(s)))
      if (modelosSel.length > 1) rows = rows.filter((r: any) => modelosSel.some(m => r.modelo?.includes(m)))
      if (marcasSel.length > 1)  rows = rows.filter((r: any) => marcasSel.includes(r.marca))
      if (colecoesAlvo.length)   rows = rows.filter((r: any) => colecoesAlvo.includes(r.colecao))
      setDados(rows)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const dadosRich = useMemo(() => dados.map(row => {
    const total = lojasFiltradas.reduce((s, l) => s + saldoReal(row[l.key]), 0)
    return { ...row, totalReal: total, status: calcStatus(total) }
  }), [dados, lojasFiltradas])

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
      if (!map[row.marca][key]) map[row.marca][key] = { produto: row.produto, cor: row.cor, modelo: row.modelo, colecao: row.colecao, sexo: row.sexo, preco: row.preco_venda || 0, itens: [] }
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
      marca, produtos: Object.values(prods),
      totalSKUs: Object.values(prods).reduce((s: number, p: any) => s + p.itens.length, 0),
      criticos:  Object.values(prods).reduce((s: number, p: any) => s + p.itens.filter((i: any) => ["ZERADO","CRITICO"].includes(i.status.label)).length, 0),
    })).sort((a, b) => b.criticos - a.criticos || a.marca.localeCompare(b.marca))
  }, [dadosFiltrados])

  const marcaAtiva = marcaSel && porMarca.find(m => m.marca === marcaSel)
    ? marcaSel : porMarca[0]?.marca || ""
  const dadosMarca = porMarca.find(m => m.marca === marcaAtiva)

  function exportarMarca() {
    const p = new URLSearchParams({ apenas_zerados: "false" })
    if (marcaAtiva) p.set("marca", marcaAtiva)
    window.open(`${API_URL}/export/faltantes?${p}`)
  }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Decisão de Compra</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
            {dados.length > 0 ? `${dados.length} SKUs · ${porMarca.length} marcas` : "Selecione filtros e clique em Buscar"}
          </p>
        </div>
        {marcaAtiva && (
          <button onClick={exportarMarca} style={{ padding: "8px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
            ⬇ CSV {marcaAtiva}
          </button>
        )}
      </div>

      {/* Painel de filtros */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "16px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: filtrosAbertos ? "1px solid var(--border)" : "none", background: "var(--surface2)" }}>
          <button onClick={() => setFiltrosAbertos(!filtrosAbertos)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
            {filtrosAbertos ? "▲" : "▼"} Filtros {totalFiltros > 0 ? `· ${totalFiltros} ativos` : ""}
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            {totalFiltros > 0 && (
              <button onClick={limparFiltros} style={{ padding: "6px 12px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>
                ✕ Limpar
              </button>
            )}
            <button onClick={buscar} disabled={loading} style={{ padding: "8px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: loading ? "default" : "pointer", fontSize: "13px", fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Buscando..." : "🔍 Buscar"}
            </button>
          </div>
        </div>

        {filtrosAbertos && (
          <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
            <div>
              <label style={lbl}>Loja {lojasSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {lojasSel.length} sel.</span>}</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {LOJAS.map(l => <Chip key={l.id} label={l.nome} ativo={lojasSel.includes(l.id)} onClick={() => toggle(lojasSel, l.id, setLojasSel)} />)}
              </div>
            </div>
            <div>
              <label style={lbl}>Sexo {sexosSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {sexosSel.length} sel.</span>}</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {SEXOS.map(s => <Chip key={s} label={s} ativo={sexosSel.includes(s)} onClick={() => toggle(sexosSel, s, setSexosSel)} />)}
              </div>
            </div>
            <div>
              <label style={lbl}>Modelo {modelosSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {modelosSel.length} sel.</span>}</label>
              <input placeholder={`Buscar entre ${opModelos.length} modelos...`} value={buscaModelo} onChange={e => setBuscaModelo(e.target.value)} style={inp} />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {modelosVis.map(m => <Chip key={m} label={m} small ativo={modelosSel.includes(m)} onClick={() => toggle(modelosSel, m, setModelosSel)} />)}
              </div>
            </div>
            <div>
              <label style={lbl}>Marca {marcasSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {marcasSel.length} sel.</span>}</label>
              <input placeholder={`Buscar entre ${opMarcas.length} marcas...`} value={buscaMarca} onChange={e => setBuscaMarca(e.target.value)} style={inp} />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {marcasVis.map(m => <Chip key={m} label={m} small ativo={marcasSel.includes(m)} onClick={() => toggle(marcasSel, m, setMarcasSel)} />)}
              </div>
            </div>
            <div>
              <label style={lbl}>Ano {anosSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {anosSel.length} sel.</span>}</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {opAnos.map(a => <Chip key={a} label={a} small ativo={anosSel.includes(a)} onClick={() => { toggle(anosSel, a, setAnosSel); setEstacoesSel([]); setColecoesSel([]) }} />)}
              </div>
            </div>
            {anosSel.length > 0 && (
              <div>
                <label style={lbl}>Estação {estacoesSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {estacoesSel.length} sel.</span>}</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {estacoesDisp.map(e => <Chip key={e} label={e} small ativo={estacoesSel.includes(e)} onClick={() => { toggle(estacoesSel, e, setEstacoesSel); setColecoesSel([]) }} />)}
                </div>
              </div>
            )}
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

      {/* Filtro status */}
      {dadosRich.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Status:</span>
          {STATUS_OPTS.map(opt => {
            const count = contagemStatus[opt.key] || 0
            if (count === 0) return null
            const ativo = statusFiltro.includes(opt.key)
            return (
              <button key={opt.key} onClick={() => toggle(statusFiltro, opt.key, setStatusFiltro)} style={{
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
            <button onClick={() => setStatusFiltro([])} style={{ padding: "5px 10px", background: "none", border: "1px solid var(--border)", borderRadius: "20px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>✕ Todos</button>
          )}
        </div>
      )}

      {!buscaFeita ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🛍️</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>Selecione filtros e clique em Buscar</div>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>Filtre por marca, modelo, ano, coleção ou loja</div>
        </div>
      ) : loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>Buscando...
        </div>
      ) : porMarca.length === 0 ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>Nenhum produto encontrado.</div>
      ) : (
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          {/* Sidebar */}
          <div style={{ width: "180px", flexShrink: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", fontSize: "10px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
              {porMarca.length} marcas
            </div>
            <div style={{ maxHeight: "calc(100vh - 420px)", overflowY: "auto" }}>
              {porMarca.map(({ marca, totalSKUs, criticos }) => (
                <div key={marca} onClick={() => setMarcaSel(marca)} style={{
                  padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                  background: marcaAtiva === marca ? "var(--primary-light)" : "transparent",
                  borderLeft: `3px solid ${marcaAtiva === marca ? "var(--primary)" : "transparent"}`,
                  transition: "all 0.1s",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: marcaAtiva === marca ? 700 : 500, color: marcaAtiva === marca ? "var(--primary)" : "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{marca}</div>
                  <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px", display: "flex", gap: "6px" }}>
                    <span>{totalSKUs} SKUs</span>
                    {criticos > 0 && <span style={{ color: "var(--danger)", fontWeight: 600 }}>⚠ {criticos}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Produtos */}
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
                  <button onClick={exportarMarca} style={{ padding: "6px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>⬇ CSV</button>
                </div>

                {dadosMarca.produtos.map((prod: any, pi: number) => {
                  const margem = prod.preco > 0 && prod.itens[0]?.preco_custo > 0
                    ? ((prod.preco - prod.itens[0].preco_custo) / prod.preco * 100) : 0
                  return (
                    <div key={pi} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--text)" }}>{prod.produto}</span>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>{prod.cor}</span>
                          <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "20px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>{prod.colecao}</span>
                          <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "20px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>{prod.sexo}</span>
                        </div>
                        <div style={{ display: "flex", gap: "16px" }}>
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
