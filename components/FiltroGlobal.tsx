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
    // Ativo vs disponivel precisa ser obvio a distancia: antes so o preenchimento
    // mudava e chip de OPCAO parecia selecionado (aconteceu com Estacao/Colecao).
    // Agora o ativo ganha peso, sombra e um respiro extra a esquerda pelo marcador.
    <button onClick={onClick} style={{
      padding: small ? "4px 11px" : "6px 13px", borderRadius: "999px",
      fontSize: small ? "11px" : "12px", cursor: "pointer",
      fontWeight: ativo ? 600 : 500, border: "1px solid",
      background: ativo ? "var(--primary)" : "transparent",
      color: ativo ? "#fff" : "var(--muted)",
      borderColor: ativo ? "var(--primary)" : "var(--border)",
      boxShadow: ativo ? "0 1px 3px rgba(0,0,0,0.16)" : "none",
      transition: "background .12s, color .12s, border-color .12s, box-shadow .12s",
      whiteSpace: "nowrap" as const, lineHeight: 1.35,
    }}
      onMouseEnter={e => { if (!ativo) { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--text)" } }}
      onMouseLeave={e => { if (!ativo) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)" } }}
    >{label}</button>
  )
}

// Rotulo com mais respiro e menos ruido: os 11 campos competiam entre si com o
// mesmo peso visual. Aqui ele recua para segundo plano e os chips ganham a cena.
const lbl = { fontSize: "10px", color: "var(--muted)", fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.7px", marginBottom: "10px", display: "block" as const, opacity: 0.75 }
const inp = { padding: "7px 11px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "12px", marginBottom: "8px", background: "var(--surface2)", color: "var(--text)", outline: "none", width: "100%", display: "block" as const }

type Props = { onBuscar: () => void, loading?: boolean, mostrarSaldo?: boolean }

export default function FiltroGlobal({ onBuscar, loading, mostrarSaldo }: Props) {
  const { filtros, setFiltros, dispararBusca } = useFiltros()

  const [opModelos, setOpModelos] = useState<string[]>([])
  const [opMarcas,  setOpMarcas]  = useState<string[]>([])
  const [opCores,   setOpCores]   = useState<string[]>([])
  const [opPorAno,  setOpPorAno]  = useState<Record<string,string[]>>({})
  const [opAnos,    setOpAnos]    = useState<string[]>([])
  // Cascata: opcoes compativeis com os filtros ativos (null = sem restricao)
  const [opSexos,      setOpSexos]      = useState<string[]>(SEXOS as unknown as string[])
  const [cascAnos,     setCascAnos]     = useState<string[] | null>(null)
  const [cascColecoes, setCascColecoes] = useState<string[] | null>(null)

  const [buscaModelo,  setBuscaModelo]  = useState("")
  const [buscaMarca,   setBuscaMarca]   = useState("")
  const [buscaCor,     setBuscaCor]     = useState("")
  const [buscaColecao, setBuscaColecao] = useState("")
  const [buscaProduto, setBuscaProduto] = useState("")
  const [resProdutos,  setResProdutos]  = useState<string[]>([])  // resultados da busca server-side
  const [aberto, setAberto] = useState(false)  // drawer: abre pelo botao
  const prodTimer = useRef<any>(null)

  // Colecoes-por-ano: carga unica
  useEffect(() => {
    fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()).then(c => { setOpPorAno(c.por_ano || {}); setOpAnos(c.anos || []) }).catch(() => {})
  }, [])

  // Opcoes EM CASCATA: rebusca /filtros com os filtros ativos (debounce 250ms).
  // Cada selecao restringe as opcoes das DEMAIS dimensoes (sexo, anos e colecoes
  // inclusos) — evita combinacoes que retornariam vazio.
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
      if (filtros.produtos.length) q.set("produto", filtros.produtos.join(","))
      if (filtros.lojas.length)    q.set("loja",    filtros.lojas.join(","))
      if (filtros.ids.trim())      q.set("cod_produto", filtros.ids.split(/[\s,;]+/).filter(Boolean).join(","))
      fetch(`${API_URL}/filtros?${q}`).then(r => r.json()).then(f => {
        setOpModelos(f.modelos || []); setOpMarcas(f.marcas || []); setOpCores(f.cores || [])
        setOpSexos(f.sexos?.length ? f.sexos : (SEXOS as unknown as string[]))
        setCascAnos(Array.isArray(f.anos) ? f.anos.map(String) : null)
        setCascColecoes(Array.isArray(f.colecoes) ? f.colecoes : null)
      }).catch(() => {})
    }, 250)
    return () => { if (cascataTimer.current) clearTimeout(cascataTimer.current) }
  }, [filtros.marcas, filtros.modelos, filtros.sexos, filtros.cores, filtros.colecoes, filtros.anos, filtros.produtos, filtros.lojas, filtros.ids])

  // Busca de produtos server-side (debounce 300ms), EM CASCATA com os filtros ativos
  useEffect(() => {
    if (prodTimer.current) clearTimeout(prodTimer.current)
    if (!buscaProduto || buscaProduto.trim().length < 2) { setResProdutos([]); return }
    prodTimer.current = setTimeout(() => {
      const q = new URLSearchParams({ q: buscaProduto.trim(), limite: "30" })
      if (filtros.marcas.length)   q.set("marca",   filtros.marcas.join(","))
      if (filtros.modelos.length)  q.set("modelo",  filtros.modelos.join(","))
      if (filtros.sexos.length)    q.set("sexo",    filtros.sexos.join(","))
      if (filtros.cores.length)    q.set("cor",     filtros.cores.join(","))
      if (filtros.colecoes.length) q.set("colecao", filtros.colecoes.join(","))
      if (filtros.anos.length)     q.set("ano",     filtros.anos.join(","))
      if (filtros.lojas.length)    q.set("loja",    filtros.lojas.join(","))
      fetch(`${API_URL}/produtos/buscar?${q}`)
        .then(r => r.json()).then(r => setResProdutos(Array.isArray(r) ? r : [])).catch(() => setResProdutos([]))
    }, 300)
    return () => { if (prodTimer.current) clearTimeout(prodTimer.current) }
  }, [buscaProduto, filtros.marcas, filtros.modelos, filtros.sexos, filtros.cores, filtros.colecoes, filtros.anos, filtros.lojas])

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

  // Sexos visiveis: cascata do servidor + selecionados sempre visiveis
  const sexosVis = useMemo(() => {
    const extras = filtros.sexos.filter(s => !opSexos.includes(s))
    return [...extras, ...opSexos]
  }, [opSexos, filtros.sexos])

  // Anos visiveis: intersecao com a cascata (quando ativa) + selecionados
  const anosVis = useMemo(() => {
    const base = cascAnos ? opAnos.filter(a => cascAnos.includes(a)) : opAnos
    const extras = filtros.anos.filter(a => !base.includes(a))
    return [...extras, ...base]
  }, [opAnos, cascAnos, filtros.anos])

  // Colecoes-base dos anos escolhidos, restritas pela cascata (marca/sexo/etc.)
  const colsBase = useMemo(() => {
    if (!filtros.anos.length) return []
    let cols = filtros.anos.flatMap(a => opPorAno[a] || [])
    if (cascColecoes) cols = cols.filter(c => cascColecoes.includes(c) || filtros.colecoes.includes(c))
    return cols
  }, [filtros.anos, opPorAno, cascColecoes, filtros.colecoes])

  const estacoesDisp = useMemo(() => {
    return [...new Set(colsBase.map(c => {
      const u = c.toUpperCase()
      if (u.includes("ALTO VERAO") || u.includes("ALTO VERÃO")) return "ALTO VERAO"
      if (u.includes("INVERNO")) return "INVERNO"
      if (u.includes("VERAO") || u.includes("VERÃO")) return "VERAO"
      return "OUTROS"
    }))]
  }, [colsBase])

  const colecoesDisp = useMemo(() => {
    const filt = filtros.estacoes.length > 0 ? colsBase.filter(c => filtros.estacoes.some(e => c.toUpperCase().includes(e.toUpperCase()))) : colsBase
    const unicas = [...new Set(filt)]
    if (buscaColecao) return unicas.filter(c => c.toLowerCase().includes(buscaColecao.toLowerCase()))
    const sel = unicas.filter(c => filtros.colecoes.includes(c))
    return [...sel, ...unicas.filter(c => !filtros.colecoes.includes(c)).slice(0, Math.max(0, 12 - sel.length))]
  }, [colsBase, filtros.estacoes, filtros.colecoes, buscaColecao])

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

  // BARRA DE FILTROS ATIVOS — antes o cabecalho dizia so "13 ativos" e era preciso
  // abrir o painel e varrer 11 campos para saber QUAIS. Cada chip remove o proprio
  // valor, entao dá para desfazer sem caçar o campo de origem.
  const ativos = useMemo(() => {
    const out: { rotulo: string, valor: string, remover: () => void }[] = []
    filtros.lojas.forEach(id => out.push({
      rotulo: "Loja", valor: LOJAS.find(l => l.id === id)?.nome || String(id),
      remover: () => up({ lojas: filtros.lojas.filter(x => x !== id) }),
    }))
    filtros.marcas.forEach(v => out.push({ rotulo: "Marca", valor: v, remover: () => up({ marcas: filtros.marcas.filter(x => x !== v) }) }))
    filtros.anos.forEach(v => out.push({ rotulo: "Ano", valor: v, remover: () => up({ anos: filtros.anos.filter(x => x !== v), estacoes: [], colecoes: [] }) }))
    filtros.estacoes.forEach(v => out.push({ rotulo: "Estação", valor: v, remover: () => up({ estacoes: filtros.estacoes.filter(x => x !== v) }) }))
    filtros.colecoes.forEach(v => out.push({ rotulo: "Coleção", valor: v, remover: () => up({ colecoes: filtros.colecoes.filter(x => x !== v) }) }))
    filtros.modelos.forEach(v => out.push({ rotulo: "Modelo", valor: v, remover: () => up({ modelos: filtros.modelos.filter(x => x !== v) }) }))
    filtros.sexos.forEach(v => out.push({ rotulo: "Sexo", valor: v, remover: () => up({ sexos: filtros.sexos.filter(x => x !== v) }) }))
    filtros.cores.forEach(v => out.push({ rotulo: "Cor", valor: v, remover: () => up({ cores: filtros.cores.filter(x => x !== v) }) }))
    filtros.produtos.forEach(v => out.push({ rotulo: "Produto", valor: v, remover: () => up({ produtos: filtros.produtos.filter(x => x !== v) }) }))
    if (filtros.ids.trim()) out.push({ rotulo: "IDs", valor: filtros.ids.trim(), remover: () => { setIdsLocal(""); up({ ids: "" }) } })
    if (filtros.saldoMax !== null) out.push({
      rotulo: "Saldo", valor: filtros.saldoMax === 0 ? "zerados" : `≤ ${filtros.saldoMax}`,
      remover: () => up({ saldoMax: null }),
    })
    return out
  }, [filtros])

  // ATALHOS — a pessoa pensa "o que preciso repor?", nao "saldo_max <= 2 na colecao
  // 2026". Cada botao monta o recorte inteiro e ja dispara a busca, para quem nao
  // conhece os 11 campos conseguir chegar a uma resposta util sem entender nenhum.
  const anoAtual = String(new Date().getFullYear())
  const atalhos = useMemo(() => {
    const l: { rotulo: string, dica: string, aplica: () => void }[] = []
    if (mostrarSaldo) {
      l.push({
        rotulo: "Precisa repor", dica: "Itens com 2 peças ou menos na rede",
        aplica: () => up({ ...filtroVazio, saldoMax: 2 }),
      })
      l.push({
        rotulo: "Sem estoque", dica: "Itens zerados na rede — as rupturas",
        aplica: () => up({ ...filtroVazio, saldoMax: 0 }),
      })
    }
    if (opAnos.includes(anoAtual)) l.push({
      rotulo: "Coleção atual", dica: `Só as coleções de ${anoAtual}`,
      aplica: () => up({ ...filtroVazio, anos: [anoAtual] }),
    })
    l.push({
      rotulo: "Só as lojas", dica: "Exclui o CD — só o que está na ponta de venda",
      aplica: () => up({ ...filtrosRef.current, lojas: LOJAS.filter(x => x.id !== 2).map(x => x.id) }),
    })
    return l
  }, [mostrarSaldo, opAnos, anoAtual])

  function limpar() {
    if (idsTimer.current) { clearTimeout(idsTimer.current); idsTimer.current = null }
    setIdsLocal("")
    setFiltros({ ...filtroVazio })
    setBuscaModelo(""); setBuscaMarca(""); setBuscaCor(""); setBuscaColecao(""); setBuscaProduto(""); setResProdutos([])
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "16px", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: aberto ? "1px solid var(--border)" : "none", background: "var(--surface2)" }}>
        {/* gatilho do drawer: precisa parecer acao, nao titulo de secao */}
        <button onClick={() => setAberto(true)} style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "8px 16px", borderRadius: "8px", cursor: "pointer",
          border: `1px solid ${totalFiltros > 0 ? "var(--primary)" : "var(--border)"}`,
          background: "var(--surface)", color: totalFiltros > 0 ? "var(--primary)" : "var(--text)",
          fontSize: "13px", fontWeight: 700,
        }}>
          <span aria-hidden>⚙</span> Filtros
          {totalFiltros > 0 && (
            <span style={{
              background: "var(--primary)", color: "#fff", borderRadius: "999px",
              fontSize: "11px", fontWeight: 700, padding: "1px 8px", lineHeight: 1.6,
            }}>{totalFiltros}</span>
          )}
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          {totalFiltros > 0 && <button onClick={limpar} style={{ padding: "6px 12px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>✕ Limpar</button>}
          <button onClick={handleBuscar} disabled={loading} style={{ padding: "8px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: loading ? "default" : "pointer", fontSize: "13px", fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Buscando..." : "🔍 Buscar"}
          </button>
          <FiltrosSalvos />
        </div>
      </div>

      {atalhos.length > 0 && (
        <div style={{ padding: "10px 16px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.7px", opacity: 0.75 }}>Atalhos</span>
          {atalhos.map((a, i) => (
            <button key={i} onClick={() => { a.aplica(); dispararBusca() }} title={a.dica}
              style={{
                padding: "6px 14px", borderRadius: "999px", cursor: "pointer",
                fontSize: "12px", fontWeight: 600, color: "var(--text)",
                background: "var(--surface2)", border: "1px dashed var(--border)",
                transition: "border-color .12s, color .12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)" }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text)" }}
            >{a.rotulo}</button>
          ))}
        </div>
      )}

      {ativos.length > 0 && (
        <div style={{
          padding: "10px 16px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center",
          borderBottom: aberto ? "1px solid var(--border)" : "none",
        }}>
          {ativos.map((f, i) => (
            <span key={i} title={`${f.rotulo}: ${f.valor}`} style={{
              display: "inline-flex", alignItems: "center", gap: "6px", maxWidth: "260px",
              fontSize: "11px", padding: "4px 6px 4px 10px", borderRadius: "20px",
              background: "var(--primary-light, #eef2ff)", color: "var(--primary)",
              border: "1px solid var(--primary)",
            }}>
              <span style={{ opacity: 0.7 }}>{f.rotulo}</span>
              <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.valor}</strong>
              <button onClick={f.remover} aria-label={`Remover ${f.rotulo} ${f.valor}`} title="Remover"
                style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "13px", lineHeight: 1, padding: "0 2px", opacity: 0.65 }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* DRAWER lateral. Antes a grade dos 11 campos era inline e comia ~300px do topo,
          empurrando a tabela — o que o usuario veio ver — para fora da dobra. Aqui ela
          desliza ao lado: os dados seguem visiveis atras, e os campos ganham altura
          inteira da tela. Esconder o painel so e seguro porque a barra de filtros
          ativos (acima) continua na pagina mostrando o recorte. */}
      {aberto && (
        <>
          <div onClick={() => setAberto(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 998,
          }} />
          <div role="dialog" aria-label="Filtros globais" style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(460px, 92vw)",
            background: "var(--surface)", borderLeft: "1px solid var(--border)",
            boxShadow: "-8px 0 32px rgba(0,0,0,0.18)", zIndex: 999,
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "var(--surface2)", flexShrink: 0,
            }}>
              <strong style={{ fontSize: "14px", color: "var(--text)" }}>Filtros globais</strong>
              <button onClick={() => setAberto(false)} aria-label="Fechar filtros" style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "20px", lineHeight: 1, color: "var(--muted)", padding: "0 4px",
              }}>×</button>
            </div>

            <div style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "1fr", gap: "22px", overflowY: "auto", flex: 1 }}>
          {/* 1. LOJA */}
          <div>
            <label style={lbl}>Loja {filtros.lojas.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.lojas.length}</span>}</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {LOJAS.map(l => <Chip key={l.id} label={l.nome} ativo={filtros.lojas.includes(l.id)} onClick={() => up({ lojas: toggle(filtros.lojas, l.id) })} />)}
            </div>
          </div>

          {/* 2. ANO DA COLECAO — nao e' o ano da venda.
              Era so' "Ano" ao lado de um calendario, e a pessoa lia como se um
              contradissesse o outro. Sao eixos independentes: o calendario diz
              QUANDO a venda aconteceu, este diz DE QUE COLECAO e' o produto. */}
          <div>
            <label style={lbl}>Ano da coleção {filtros.anos.length > 0 && <span style={{ color: "var(--primary)" }}>· {filtros.anos.length}</span>}</label>
            <div style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "6px", marginTop: "-2px" }}>
              atributo do produto — não filtra a data da venda
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {anosVis.map(a => <Chip key={a} label={a} small ativo={filtros.anos.includes(a)} onClick={() => up({ anos: toggle(filtros.anos, a), estacoes: [], colecoes: [] })} />)}
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
              {sexosVis.map(s => <Chip key={s} label={s} ativo={filtros.sexos.includes(s)} onClick={() => up({ sexos: toggle(filtros.sexos, s) })} />)}
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

            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", flexShrink: 0, background: "var(--surface2)" }}>
              <button onClick={limpar} style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Limpar tudo</button>
              <button onClick={() => { handleBuscar(); setAberto(false) }} disabled={loading} style={{ flex: 1, padding: "10px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: loading ? "default" : "pointer", fontSize: "13px", fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Buscando..." : "Aplicar filtros"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
