"use client"
import { useState, useMemo, useEffect } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export const LOJAS = [
  { id: 1, nome: "P.Nereu",  key: "pres_nereu" },
  { id: 3, nome: "Vidal",    key: "vidal_ramos" },
  { id: 4, nome: "Imbuiá",   key: "imbuia" },
  { id: 5, nome: "Lontras",  key: "lontras" },
  { id: 6, nome: "Chapadão", key: "chapadao" },
  { id: 7, nome: "Hype",     key: "focca_hype" },
]

export const SEXOS = ["FEMININO","MASCULINO","FEM INF","MASC INF","UNISSEX","FEMININO CURVES"]

// Tipo do estado de filtros — compartilhado por todas as páginas
export type FiltroState = {
  lojas: number[]
  sexos: string[]
  modelos: string[]
  marcas: string[]
  anos: string[]
  estacoes: string[]
  colecoes: string[]
  saldoMax: number | null
}

export const filtroVazio: FiltroState = {
  lojas: [], sexos: [], modelos: [], marcas: [],
  anos: [], estacoes: [], colecoes: [], saldoMax: null,
}

function Chip({ label, ativo, onClick, small }: { label: string, ativo: boolean, onClick: () => void, small?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? "3px 10px" : "5px 12px", borderRadius: "20px",
      fontSize: small ? "11px" : "12px", cursor: "pointer",
      fontWeight: ativo ? 600 : 400, border: "1px solid",
      background: ativo ? "var(--primary)" : "var(--surface2)",
      color: ativo ? "#fff" : "var(--text)",
      borderColor: ativo ? "var(--primary)" : "var(--border)",
      transition: "all 0.1s", whiteSpace: "nowrap" as const,
    }}>{label}</button>
  )
}

const lbl = { fontSize: "10px", color: "var(--muted)", fontWeight: 600 as const, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: "8px", display: "block" as const }
const inp = { padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "12px", marginBottom: "8px", background: "var(--surface2)", color: "var(--text)", outline: "none", width: "100%", display: "block" as const }

type Props = {
  filtros: FiltroState
  setFiltros: (f: FiltroState) => void
  onBuscar: () => void
  loading?: boolean
  mostrarSaldo?: boolean  // mostra slider de quantidade máxima
}

export default function FiltroGlobal({ filtros, setFiltros, onBuscar, loading, mostrarSaldo }: Props) {
  const [opModelos, setOpModelos] = useState<string[]>([])
  const [opMarcas,  setOpMarcas]  = useState<string[]>([])
  const [opPorAno,  setOpPorAno]  = useState<Record<string,string[]>>({})
  const [opAnos,    setOpAnos]    = useState<string[]>([])

  const [buscaModelo,  setBuscaModelo]  = useState("")
  const [buscaMarca,   setBuscaMarca]   = useState("")
  const [buscaColecao, setBuscaColecao] = useState("")
  const [aberto, setAberto] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/filtros`).then(r => r.json()).then(f => {
      setOpModelos(f.modelos || []); setOpMarcas(f.marcas || [])
    }).catch(() => {})
    fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()).then(c => {
      setOpPorAno(c.por_ano || {}); setOpAnos(c.anos || [])
    }).catch(() => {})
  }, [])

  function up(patch: Partial<FiltroState>) { setFiltros({ ...filtros, ...patch }) }
  function toggle<T>(arr: T[], val: T): T[] { return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }

  const estacoesDisp = useMemo(() => {
    if (!filtros.anos.length) return []
    const cols = filtros.anos.flatMap(a => opPorAno[a] || [])
    return [...new Set(cols.map(c => {
      const u = c.toUpperCase()
      if (u.includes("ALTO VERAO") || u.includes("ALTO VERÃO")) return "ALTO VERAO"
      if (u.includes("INVERNO")) return "INVERNO"
      if (u.includes("VERAO") || u.includes("VERÃO")) return "VERAO"
      return "OUTROS"
    }))]
  }, [filtros.anos, opPorAno])

  const colecoesDisp = useMemo(() => {
    if (!filtros.anos.length) return []
    const cols = filtros.anos.flatMap(a => opPorAno[a] || [])
    const filt = filtros.estacoes.length > 0
      ? cols.filter(c => filtros.estacoes.some(e => c.toUpperCase().includes(e.toUpperCase())))
      : cols
    const unicas = [...new Set(filt)]
    if (buscaColecao) return unicas.filter(c => c.toLowerCase().includes(buscaColecao.toLowerCase()))
    const sel = unicas.filter(c => filtros.colecoes.includes(c))
    return [...sel, ...unicas.filter(c => !filtros.colecoes.includes(c)).slice(0, Math.max(0, 12 - sel.length))]
  }, [filtros.anos, filtros.estacoes, filtros.colecoes, opPorAno, buscaColecao])

  // Chips lazy — só renderiza quando busca ou tem selecionado
  const modelosVis = useMemo(() => {
    if (!buscaModelo && filtros.modelos.length === 0) return []
    if (buscaModelo) return opModelos.filter(m => m.toLowerCase().includes(buscaModelo.toLowerCase())).slice(0, 20)
    return opModelos.filter(m => filtros.modelos.includes(m))
  }, [opModelos, buscaModelo, filtros.modelos])

  const marcasVis = useMemo(() => {
    if (!buscaMarca && filtros.marcas.length === 0) return []
    if (buscaMarca) return opMarcas.filter(m => m.toLowerCase().includes(buscaMarca.toLowerCase())).slice(0, 20)
    return opMarcas.filter(m => filtros.marcas.includes(m))
  }, [opMarcas, buscaMarca, filtros.marcas])

  const totalFiltros = filtros.lojas.length + filtros.sexos.length + filtros.modelos.length +
    filtros.marcas.length + filtros.anos.length + filtros.estacoes.length + filtros.colecoes.length +
    (filtros.saldoMax !== null ? 1 : 0)

  function limpar() {
    setFiltros({ ...filtroVazio })
    setBuscaModelo(""); setBuscaMarca(""); setBuscaColecao("")
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "16px", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: aberto ? "1px solid var(--border)" : "none", background: "var(--surface2)" }}>
        <button onClick={() => setAberto(!aberto)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
          {aberto ? "▲" : "▼"} Filtros {totalFiltros > 0 ? `· ${totalFiltros} ativos` : ""}
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          {totalFiltros > 0 && <button onClick={limpar} style={{ padding: "6px 12px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>✕ Limpar</button>}
          <button onClick={onBuscar} disabled={loading} style={{ padding: "8px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: loading ? "default" : "pointer", fontSize: "13px", fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Buscando..." : "🔍 Buscar"}
          </button>
        </div>
      </div>

      {aberto && (
        <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
          {/* Loja */}
          <div>
            <label style={lbl}>Loja {filtros.lojas.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.lojas.length}</span>}</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {LOJAS.map(l => <Chip key={l.id} label={l.nome} ativo={filtros.lojas.includes(l.id)} onClick={() => up({ lojas: toggle(filtros.lojas, l.id) })} />)}
            </div>
          </div>

          {/* Sexo */}
          <div>
            <label style={lbl}>Sexo {filtros.sexos.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.sexos.length}</span>}</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {SEXOS.map(s => <Chip key={s} label={s} ativo={filtros.sexos.includes(s)} onClick={() => up({ sexos: toggle(filtros.sexos, s) })} />)}
            </div>
          </div>

          {/* Modelo — multi, chips lazy */}
          <div>
            <label style={lbl}>Modelo {filtros.modelos.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.modelos.length}</span>}</label>
            <input placeholder={`Buscar entre ${opModelos.length} modelos...`} value={buscaModelo} onChange={e => setBuscaModelo(e.target.value)} style={inp} />
            {(buscaModelo || filtros.modelos.length > 0) && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {modelosVis.map(m => <Chip key={m} label={m} small ativo={filtros.modelos.includes(m)} onClick={() => up({ modelos: toggle(filtros.modelos, m) })} />)}
              </div>
            )}
          </div>

          {/* Marca — multi, chips lazy */}
          <div>
            <label style={lbl}>Marca {filtros.marcas.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.marcas.length}</span>}</label>
            <input placeholder={`Buscar entre ${opMarcas.length} marcas...`} value={buscaMarca} onChange={e => setBuscaMarca(e.target.value)} style={inp} />
            {(buscaMarca || filtros.marcas.length > 0) && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {marcasVis.map(m => <Chip key={m} label={m} small ativo={filtros.marcas.includes(m)} onClick={() => up({ marcas: toggle(filtros.marcas, m) })} />)}
              </div>
            )}
          </div>

          {/* Ano — multi */}
          <div>
            <label style={lbl}>Ano {filtros.anos.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.anos.length}</span>}</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {opAnos.map(a => <Chip key={a} label={a} small ativo={filtros.anos.includes(a)}
                onClick={() => up({ anos: toggle(filtros.anos, a), estacoes: [], colecoes: [] })} />)}
            </div>
          </div>

          {/* Estação — multi (só com ano) */}
          {filtros.anos.length > 0 && (
            <div>
              <label style={lbl}>Estação {filtros.estacoes.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.estacoes.length}</span>}</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {estacoesDisp.map(e => <Chip key={e} label={e} small ativo={filtros.estacoes.includes(e)}
                  onClick={() => up({ estacoes: toggle(filtros.estacoes, e), colecoes: [] })} />)}
              </div>
            </div>
          )}

          {/* Coleção — multi (só com ano) */}
          {filtros.anos.length > 0 && (
            <div>
              <label style={lbl}>Coleção {filtros.colecoes.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.colecoes.length}</span>}</label>
              <input placeholder="Buscar coleção..." value={buscaColecao} onChange={e => setBuscaColecao(e.target.value)} style={inp} />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {colecoesDisp.map(c => <Chip key={c} label={c} small ativo={filtros.colecoes.includes(c)}
                  onClick={() => up({ colecoes: toggle(filtros.colecoes, c) })} />)}
              </div>
            </div>
          )}

          {/* Saldo máximo — slider de quantidade */}
          {mostrarSaldo && (
            <div>
              <label style={lbl}>Saldo máximo na rede {filtros.saldoMax !== null && <span style={{ color: "var(--primary)" }}>· ≤ {filtros.saldoMax}</span>}</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                {[0, 2, 5, 10, 20].map(v => (
                  <Chip key={v} label={v === 0 ? "Zerados" : `≤ ${v}`} small ativo={filtros.saldoMax === v} onClick={() => up({ saldoMax: filtros.saldoMax === v ? null : v })} />
                ))}
                {filtros.saldoMax !== null && <Chip label="✕" small ativo={false} onClick={() => up({ saldoMax: null })} />}
              </div>
              <input type="range" min={0} max={50} value={filtros.saldoMax ?? 50}
                onChange={e => up({ saldoMax: Number(e.target.value) })}
                style={{ width: "100%", accentColor: "var(--primary)" }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper: resolve coleções alvo a partir de ano/estação/coleção
export function resolverColecoes(filtros: FiltroState, opPorAno: Record<string,string[]>): string[] {
  if (filtros.colecoes.length > 0) return filtros.colecoes
  if (!filtros.anos.length) return []
  const cols = filtros.anos.flatMap(a => opPorAno[a] || [])
  if (!filtros.estacoes.length) return cols
  return cols.filter(c => filtros.estacoes.some(e => c.toUpperCase().includes(e.toUpperCase())))
}
