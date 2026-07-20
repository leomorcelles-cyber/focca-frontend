"use client"
import { useState, useMemo, useEffect, useRef } from "react"
import { useFiltros, FiltroState, filtroVazio } from "@/components/FiltroContext"
import FiltrosSalvos from "@/components/FiltrosSalvos"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export const LOJAS = [
  { id: 1, nome: "P.Nereu",  key: "pres_nereu" },
  { id: 2, nome: "CD",       key: "jaragua_sul", matchNome: "CENTRO DE DISTRIBUI" },
  { id: 3, nome: "Vidal",    key: "vidal_ramos" },
  { id: 4, nome: "Imbuiá",   key: "imbuia" },
  { id: 5, nome: "Lontras",  key: "lontras" },
  { id: 6, nome: "Chapadão", key: "chapadao" },
  { id: 7, nome: "Hype",     key: "focca_hype" },
]
export const SEXOS = ["FEMININO","MASCULINO","FEM INF","MASC INF","UNISSEX","FEMININO CURVES"]

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

type Props = { onBuscar: () => void, loading?: boolean, mostrarSaldo?: boolean }

export default function FiltroGlobal({ onBuscar, loading, mostrarSaldo }: Props) {
  const { filtros, setFiltros, dispararBusca } = useFiltros()

  const [opModelos, setOpModelos] = useState<string[]>([])
  const [opMarcas,  setOpMarcas]  = useState<string[]>([])
  const [opCores,   setOpCores]   = useState<string[]>([])
  const [opPorAno,  setOpPorAno]  = useState<Record<string,string[]>>({})
  const [opAnos,    setOpAnos]    = useState<string[]>([])

  const [buscaModelo,  setBuscaModelo]  = useState("")
  const [buscaMarca,   setBuscaMarca]   = useState("")
  const [buscaCor,     setBuscaCor]     = useState("")
  const [buscaColecao, setBuscaColecao] = useState("")
  const [buscaProduto, setBuscaProduto] = useState("")
  const [resProdutos,  setResProdutos]  = useState<string[]>([])  // resultados da busca server-side
  const [aberto, setAberto] = useState(true)
  const prodTimer = useRef<any>(null)

  // Colecoes-por-ano: carga unica
  useEffect(() => {
    fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()).then(c => { setOpPorAno(c.por_ano || {}); setOpAnos(c.anos || []) }).catch(() => {})
  }, [])

  // Opcoes EM CASCATA: rebusca /filtros com os filtros ativos (debounce 250ms)
  const cascataTimer = useRef<any>(null)
  useEffect(() => {
    if (cascataTimer.current) clearTimeout(cascataTimer.current)
    cascataTimer.current = setTimeout(() => {
      const q = new URLSearchParams()
      if (filtros.marcas.length)   q.set("marca",   filtros.marcas.join(","))
      if (filtros.modelos.length)  q.set("modelo",  filtros.modelos.join(","))
      if (filtros.sexos.length)    q.set("sexo",    filtros.sexos.join(","))
      if (filtros.cores.length)    q.set("cor",     filtros.cores.join(","))
      if (filtros.colecoes.length) q.set("colecao", filtros.colecoes.join(","))
      if (filtros.anos.length)     q.set("ano",     filtros.anos.join(","))
      fetch(`${API_URL}/filtros?${q}`).then(r => r.json()).then(f => {
        setOpModelos(f.modelos || []); setOpMarcas(f.marcas || []); setOpCores(f.cores || [])
      }).catch(() => {})
    }, 250)
    return () => { if (cascataTimer.current) clearTimeout(cascataTimer.current) }
  }, [filtros.marcas, filtros.modelos, filtros.sexos, filtros.cores, filtros.colecoes, filtros.anos])

  // Busca de produtos server-side (debounce 300ms)
  useEffect(() => {
    if (prodTimer.current) clearTimeout(prodTimer.current)
    if (!buscaProduto || buscaProduto.trim().length < 2) { setResProdutos([]); return }
    prodTimer.current = setTimeout(() => {
      fetch(`${API_URL}/produtos/buscar?q=${encodeURIComponent(buscaProduto.trim())}&limite=30`)
        .then(r => r.json()).then(r => setResProdutos(Array.isArray(r) ? r : [])).catch(() => setResProdutos([]))
    }, 300)
    return () => { if (prodTimer.current) clearTimeout(prodTimer.current) }
  }, [buscaProduto])

  // Ref com o estado mais recente: evita que atualizacoes atrasadas (debounce)
  // sobrescrevam mudancas feitas em outros filtros nesse meio-tempo.
  const filtrosRef = useRef(filtros)
  filtrosRef.current = filtros

  function up(patch: Partial<FiltroState>) { setFiltros({ ...filtrosRef.current, ...patch }) }
  function toggle<T>(arr: T[], val: T): T[] { return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }

  // ID com debounce: digitar nao toca o contexto global a cada tecla (era isso
  // que re-renderizava a pagina inteira e congelava a Analise de Vendas).
  const [idsLocal, setIdsLocal] = useState(filtros.ids)
  const idsTimer = useRef<any>(null)
  useEffect(() => { setIdsLocal(filtros.ids) }, [filtros.ids])  // sincroniza em limpar/filtro salvo
  function onIdsChange(v: string) {
    setIdsLocal(v)
    if (idsTimer.current) clearTimeout(idsTimer.current)
    idsTimer.current = setTimeout(() => { idsTimer.current = null; up({ ids: v }) }, 300)
  }

  // Buscar: UM unico disparo por clique. Antes chamava dispararBusca() + onBuscar(),
  // o que gerava duas buscas concorrentes — a segunda abortava a primeira e o
  // "finally" da abortada desligava o loading no meio, deixando o botao intermitente.
  function handleBuscar() {
    if (idsTimer.current) {
      // ha ID digitado ainda nao aplicado: aplica agora e busca via versaoBusca,
      // que roda DEPOIS do commit e enxerga o estado fresco.
      clearTimeout(idsTimer.current); idsTimer.current = null
      setFiltros({ ...filtrosRef.current, ids: idsLocal })
      dispararBusca()
      return
    }
    onBuscar()
  }

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
    const filt = filtros.estacoes.length > 0 ? cols.filter(c => filtros.estacoes.some(e => c.toUpperCase().includes(e.toUpperCase()))) : cols
    const unicas = [...new Set(filt)]
    if (buscaColecao) return unicas.filter(c => c.toLowerCase().includes(buscaColecao.toLowerCase()))
    const sel = unicas.filter(c => filtros.colecoes.includes(c))
    return [...sel, ...unicas.filter(c => !filtros.colecoes.includes(c)).slice(0, Math.max(0, 12 - sel.length))]
  }, [filtros.anos, filtros.estacoes, filtros.colecoes, opPorAno, buscaColecao])

  const modelosVis = useMemo(() => {
    if (!buscaModelo && filtros.modelos.length === 0) return []
    if (buscaModelo) {
      const achados = opModelos.filter(m => m.toLowerCase().includes(buscaModelo.toLowerCase())).slice(0, 20)
      const selForaBusca = filtros.modelos.filter(m => !achados.includes(m))
      return [...selForaBusca, ...achados]
    }
    return filtros.modelos
  }, [opModelos, buscaModelo, filtros.modelos])

  const marcasVis = useMemo(() => {
    if (!buscaMarca && filtros.marcas.length === 0) return []
    if (buscaMarca) {
      const achados = opMarcas.filter(m => m.toLowerCase().includes(buscaMarca.toLowerCase())).slice(0, 20)
      const selForaBusca = filtros.marcas.filter(m => !achados.includes(m))
      return [...selForaBusca, ...achados]
    }
    return filtros.marcas
  }, [opMarcas, buscaMarca, filtros.marcas])

  const coresVis = useMemo(() => {
    if (!buscaCor && filtros.cores.length === 0) return []
    if (buscaCor) {
      const achados = opCores.filter(c => c.toLowerCase().includes(buscaCor.toLowerCase())).slice(0, 20)
      const selForaBusca = filtros.cores.filter(c => !achados.includes(c))
      return [...selForaBusca, ...achados]
    }
    return filtros.cores
  }, [opCores, buscaCor, filtros.cores])

  // Produtos visiveis: os selecionados + resultados da busca server-side
  const produtosVis = useMemo(() => {
    const sel = filtros.produtos
    if (buscaProduto && resProdutos.length) {
      const novos = resProdutos.filter(p => !sel.includes(p))
      return [...sel, ...novos]
    }
    return sel
  }, [filtros.produtos, resProdutos, buscaProduto])

  const totalFiltros = filtros.lojas.length + filtros.sexos.length + filtros.modelos.length +
    filtros.produtos.length + filtros.marcas.length + filtros.anos.length + filtros.estacoes.length +
    filtros.colecoes.length + filtros.cores.length + (filtros.ids ? 1 : 0) + (filtros.saldoMax !== null ? 1 : 0)

  function limpar() {
    if (idsTimer.current) { clearTimeout(idsTimer.current); idsTimer.current = null }
    setIdsLocal("")
    setFiltros({ ...filtroVazio })
    setBuscaModelo(""); setBuscaMarca(""); setBuscaCor(""); setBuscaColecao(""); setBuscaProduto(""); setResProdutos([])
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "16px", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: aberto ? "1px solid var(--border)" : "none", background: "var(--surface2)" }}>
        <button onClick={() => setAberto(!aberto)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
          {aberto ? "▲" : "▼"} Filtros globais {totalFiltros > 0 ? `· ${totalFiltros} ativos` : ""}
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          {totalFiltros > 0 && <button onClick={limpar} style={{ padding: "6px 12px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>✕ Limpar</button>}
          <button onClick={handleBuscar} disabled={loading} style={{ padding: "8px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: loading ? "default" : "pointer", fontSize: "13px", fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Buscando..." : "🔍 Buscar"}
          </button>
          <FiltrosSalvos />
        </div>
      </div>

      {aberto && (
        <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
          {/* 1. LOJA */}
          <div>
            <label style={lbl}>Loja {filtros.lojas.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.lojas.length}</span>}</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {LOJAS.map(l => <Chip key={l.id} label={l.nome} ativo={filtros.lojas.includes(l.id)} onClick={() => up({ lojas: toggle(filtros.lojas, l.id) })} />)}
            </div>
          </div>

          {/* 2. ANO */}
          <div>
            <label style={lbl}>Ano {filtros.anos.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.anos.length}</span>}</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {opAnos.map(a => <Chip key={a} label={a} small ativo={filtros.anos.includes(a)} onClick={() => up({ anos: toggle(filtros.anos, a), estacoes: [], colecoes: [] })} />)}
            </div>
          </div>

          {/* 3. SALDO MAXIMO (min–max) */}
          {mostrarSaldo && (
            <div>
              <label style={lbl}>Saldo máximo na rede {filtros.saldoMax !== null && <span style={{ color: "var(--primary)" }}>· ≤ {filtros.saldoMax}</span>}</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                {[0, 2, 5, 10, 20].map(v => <Chip key={v} label={v === 0 ? "Zerados" : `≤ ${v}`} small ativo={filtros.saldoMax === v} onClick={() => up({ saldoMax: filtros.saldoMax === v ? null : v })} />)}
                {filtros.saldoMax !== null && <Chip label="✕" small ativo={false} onClick={() => up({ saldoMax: null })} />}
              </div>
              <input type="range" min={0} max={50} value={filtros.saldoMax ?? 50} onChange={e => up({ saldoMax: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--primary)" }} />
            </div>
          )}

          {/* 4. MARCA */}
          <div>
            <label style={lbl}>Marca {filtros.marcas.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.marcas.length}</span>}</label>
            <input placeholder={`Buscar entre ${opMarcas.length} marcas...`} value={buscaMarca} onChange={e => setBuscaMarca(e.target.value)} style={inp} />
            {(buscaMarca || filtros.marcas.length > 0) && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {marcasVis.map(m => <Chip key={m} label={m} small ativo={filtros.marcas.includes(m)} onClick={() => up({ marcas: toggle(filtros.marcas, m) })} />)}
              </div>
            )}
          </div>

          {/* 5. SEXO */}
          <div>
            <label style={lbl}>Sexo {filtros.sexos.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.sexos.length}</span>}</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {SEXOS.map(s => <Chip key={s} label={s} ativo={filtros.sexos.includes(s)} onClick={() => up({ sexos: toggle(filtros.sexos, s) })} />)}
            </div>
          </div>

          {/* 6. COLECOES */}
          <div>
            <label style={lbl}>Coleção {filtros.colecoes.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.colecoes.length}</span>}</label>
            {filtros.anos.length === 0 ? (
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>Selecione um ano para listar as coleções</span>
            ) : (<>
              <input placeholder="Buscar coleção..." value={buscaColecao} onChange={e => setBuscaColecao(e.target.value)} style={inp} />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {colecoesDisp.map(c => <Chip key={c} label={c} small ativo={filtros.colecoes.includes(c)} onClick={() => up({ colecoes: toggle(filtros.colecoes, c) })} />)}
              </div>
            </>)}
          </div>

          {/* 7. ESTACAO */}
          <div>
            <label style={lbl}>Estação {filtros.estacoes.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.estacoes.length}</span>}</label>
            {filtros.anos.length === 0 ? (
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>Selecione um ano para listar as estações</span>
            ) : (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {estacoesDisp.map(e => <Chip key={e} label={e} small ativo={filtros.estacoes.includes(e)} onClick={() => up({ estacoes: toggle(filtros.estacoes, e), colecoes: [] })} />)}
              </div>
            )}
          </div>

          {/* 8. MODELO */}
          <div>
            <label style={lbl}>Modelo {filtros.modelos.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.modelos.length}</span>}</label>
            <input placeholder={`Buscar entre ${opModelos.length} modelos...`} value={buscaModelo} onChange={e => setBuscaModelo(e.target.value)} style={inp} />
            {(buscaModelo || filtros.modelos.length > 0) && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {modelosVis.map(m => <Chip key={m} label={m} small ativo={filtros.modelos.includes(m)} onClick={() => up({ modelos: toggle(filtros.modelos, m) })} />)}
              </div>
            )}
          </div>

          {/* 9. ID */}
          <div>
            <label style={lbl}>Busca por ID {filtros.ids && <span style={{ color: "var(--primary)" }}>· ativo</span>}</label>
            <input placeholder="IDs exatos, separados por virgula ou espaco" value={idsLocal} onChange={e => onIdsChange(e.target.value)} style={inp} />
          </div>

          {/* Extras (fora da sequencia pedida, preservados): PRODUTO e COR */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lbl}>Produto {filtros.produtos.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.produtos.length} selecionados</span>}</label>
            <input placeholder="Digite para buscar entre 7.801 produtos (ex: JAQUETA, CALCA SKINNY...)" value={buscaProduto} onChange={e => setBuscaProduto(e.target.value)} style={inp} />
            {produtosVis.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", maxHeight: "140px", overflowY: "auto" }}>
                {produtosVis.map(p => <Chip key={p} label={p} small ativo={filtros.produtos.includes(p)} onClick={() => up({ produtos: toggle(filtros.produtos, p) })} />)}
              </div>
            )}
            {buscaProduto.length >= 2 && resProdutos.length === 0 && <span style={{ fontSize: "11px", color: "var(--muted)" }}>Nenhum produto encontrado</span>}
          </div>

          <div>
            <label style={lbl}>Cor {filtros.cores.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.cores.length}</span>}</label>
            <input placeholder={`Buscar entre ${opCores.length} cores...`} value={buscaCor} onChange={e => setBuscaCor(e.target.value)} style={inp} />
            {(buscaCor || filtros.cores.length > 0) && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {coresVis.map(c => <Chip key={c} label={c} small ativo={filtros.cores.includes(c)} onClick={() => up({ cores: toggle(filtros.cores, c) })} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
