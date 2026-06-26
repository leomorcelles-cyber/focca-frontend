"use client"
import { useState, useMemo } from "react"
import { useFiltro } from "@/lib/FiltroContext"

const LOJAS_OPTS = [
  { id: 1, nome: "P. Nereu" },
  { id: 3, nome: "Vidal" },
  { id: 4, nome: "Imbuiá" },
  { id: 5, nome: "Lontras" },
  { id: 6, nome: "Chapadão" },
  { id: 7, nome: "Hype" },
]

const SEXOS_OPTS = ["FEMININO", "MASCULINO", "FEM INF", "MASC INF", "UNISSEX", "FEMININO CURVES"]

const SALDO_OPCOES = [
  { val: 0,   label: "Zerado",      desc: "Saldo = 0" },
  { val: 2,   label: "Crítico",     desc: "Saldo ≤ 2" },
  { val: 5,   label: "Baixo",       desc: "Saldo ≤ 5" },
  { val: 10,  label: "Médio",       desc: "Saldo ≤ 10" },
  { val: 999, label: "Todos",       desc: "Sem filtro" },
]

type Props = {
  opcoes: {
    modelos?: string[]
    marcas?: string[]
    porAno?: Record<string, string[]>
    anos?: string[]
  }
  mostrarLojas?: boolean
  mostrarSaldo?: boolean
}

function Chip({ label, ativo, onClick, small }: {
  label: string, ativo: boolean, onClick: () => void, small?: boolean
}) {
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

export default function FiltroGlobal({ opcoes, mostrarLojas = true, mostrarSaldo = true }: Props) {
  const {
    filtros, updateFiltro, limpar, temFiltro, totalAtivos,
    filtrosSalvos, salvarFiltro, aplicarFiltroSalvo, deletarFiltroSalvo,
  } = useFiltro()

  const [aberto, setAberto] = useState(false)
  const [nomeFiltro, setNomeFiltro] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [buscaModelo, setBuscaModelo] = useState("")
  const [buscaMarca, setBuscaMarca] = useState("")
  const [buscaColecao, setBuscaColecao] = useState("")

  const todosModelos = opcoes.modelos || []
  const todasMarcas  = opcoes.marcas  || []
  const todosAnos    = opcoes.anos    || []
  const porAno       = opcoes.porAno  || {}

  const modelosVisiveis = useMemo(() => {
    if (buscaModelo.trim()) return todosModelos.filter(m => m.toLowerCase().includes(buscaModelo.toLowerCase()))
    const sel = todosModelos.filter(m => filtros.modelos.includes(m))
    const resto = todosModelos.filter(m => !filtros.modelos.includes(m)).slice(0, Math.max(0, 10 - sel.length))
    return [...sel, ...resto]
  }, [todosModelos, buscaModelo, filtros.modelos])

  const marcasVisiveis = useMemo(() => {
    if (buscaMarca.trim()) return todasMarcas.filter(m => m.toLowerCase().includes(buscaMarca.toLowerCase()))
    const sel = todasMarcas.filter(m => filtros.marcas.includes(m))
    const resto = todasMarcas.filter(m => !filtros.marcas.includes(m)).slice(0, Math.max(0, 10 - sel.length))
    return [...sel, ...resto]
  }, [todasMarcas, buscaMarca, filtros.marcas])

  const estacoesDisponiveis = useMemo(() => {
    if (!filtros.anos.length) return []
    const doAno = filtros.anos.flatMap(a => porAno[a] || [])
    return [...new Set(doAno.map(c => {
      const u = c.toUpperCase()
      if (u.includes("ALTO VERAO") || u.includes("ALTO VERÃO")) return "ALTO VERAO"
      if (u.includes("INVERNO")) return "INVERNO"
      if (u.includes("VERAO") || u.includes("VERÃO")) return "VERAO"
      return "OUTROS"
    }))]
  }, [filtros.anos, porAno])

  const colecoesDisponiveis = useMemo(() => {
    if (!filtros.anos.length) return []
    const doAno = filtros.anos.flatMap(a => porAno[a] || [])
    const filtradas = filtros.estacoes.length > 0
      ? doAno.filter(c => filtros.estacoes.some(e => c.toUpperCase().includes(e.toUpperCase())))
      : doAno
    const unicas = [...new Set(filtradas)]
    if (buscaColecao.trim()) return unicas.filter(c => c.toLowerCase().includes(buscaColecao.toLowerCase()))
    const sel = unicas.filter(c => filtros.colecoes.includes(c))
    const resto = unicas.filter(c => !filtros.colecoes.includes(c)).slice(0, Math.max(0, 10 - sel.length))
    return [...sel, ...resto]
  }, [filtros.anos, filtros.estacoes, filtros.colecoes, porAno, buscaColecao])

  function toggle(key: "lojas"|"sexos"|"modelos"|"marcas"|"anos"|"estacoes"|"colecoes", val: any) {
    const atual = filtros[key] as any[]
    updateFiltro(key, atual.includes(val) ? atual.filter(x => x !== val) : [...atual, val])
  }

  function toggleAno(ano: string) {
    const novos = filtros.anos.includes(ano)
      ? filtros.anos.filter(x => x !== ano)
      : [...filtros.anos, ano]
    updateFiltro("anos", novos)
    if (novos.length === 0) { updateFiltro("estacoes", []); updateFiltro("colecoes", []) }
  }

  function handleSalvar() {
    if (!nomeFiltro.trim()) return
    salvarFiltro(nomeFiltro.trim())
    setNomeFiltro(""); setSalvando(false)
  }

  const saldoAtual = filtros.saldoMax ?? 999
  const saldoLabel = SALDO_OPCOES.find(o => o.val === saldoAtual)?.label || "Todos"

  const inp = {
    padding: "5px 10px", borderRadius: "6px",
    border: "1px solid var(--border)", fontSize: "12px",
    marginBottom: "8px", background: "var(--surface2)",
    color: "var(--text)", outline: "none", width: "200px",
    display: "block" as const,
  }

  const lbl = {
    fontSize: "10px", color: "var(--muted)", fontWeight: 600 as const,
    textTransform: "uppercase" as const, letterSpacing: "0.5px",
    marginBottom: "8px", display: "flex" as const,
    alignItems: "center" as const, gap: "6px",
  }

  return (
    <div style={{ marginBottom: "16px" }}>

      {/* Barra superior */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
        {filtrosSalvos.map(fs => (
          <div key={fs.id} style={{ display: "flex" }}>
            <button onClick={() => aplicarFiltroSalvo(fs.id)} style={{
              padding: "4px 10px", borderRadius: "20px 0 0 20px", fontSize: "12px",
              cursor: "pointer", fontWeight: 500, border: "1px solid var(--primary)",
              borderRight: "none", background: "var(--primary-light)", color: "var(--primary)", whiteSpace: "nowrap",
            }}>⭐ {fs.nome}</button>
            <button onClick={() => deletarFiltroSalvo(fs.id)} style={{
              padding: "4px 7px", borderRadius: "0 20px 20px 0", cursor: "pointer",
              border: "1px solid var(--primary)", background: "var(--primary-light)",
              color: "var(--primary)", fontSize: "11px",
            }}>✕</button>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {temFiltro && !salvando && (
          <button onClick={() => setSalvando(true)} style={{
            padding: "5px 12px", background: "none", border: "1px dashed var(--border)",
            borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap",
          }}>+ Salvar filtro</button>
        )}

        {salvando && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <input autoFocus placeholder="Nome do filtro..." value={nomeFiltro}
              onChange={e => setNomeFiltro(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSalvar(); if (e.key === "Escape") setSalvando(false) }}
              style={{ ...inp, marginBottom: 0, width: "160px", display: "inline-block" }}
            />
            <button onClick={handleSalvar} style={{ padding: "5px 10px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Salvar</button>
            <button onClick={() => setSalvando(false)} style={{ padding: "5px 8px", background: "none", border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", color: "var(--muted)" }}>✕</button>
          </div>
        )}

        {temFiltro && (
          <button onClick={limpar} style={{
            padding: "5px 12px", background: "none", border: "1px solid var(--border)",
            borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap",
          }}>✕ Limpar ({totalAtivos})</button>
        )}

        <button onClick={() => setAberto(!aberto)} style={{
          padding: "5px 14px",
          background: aberto ? "var(--primary)" : temFiltro ? "var(--primary-light)" : "var(--surface2)",
          color: aberto ? "#fff" : temFiltro ? "var(--primary)" : "var(--muted)",
          border: `1px solid ${aberto || temFiltro ? "var(--primary)" : "var(--border)"}`,
          borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap",
        }}>
          {aberto ? "▲" : "▼"} Filtros{totalAtivos > 0 ? ` · ${totalAtivos} ativos` : ""}
        </button>
      </div>

      {/* Painel */}
      {aberto && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "20px",
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "20px",
        }}>

          {/* Lojas */}
          {mostrarLojas && (
            <div>
              <div style={lbl}>
                LOJA
                {filtros.lojas.length > 0 && <>
                  <span style={{ color: "var(--primary)" }}>· {filtros.lojas.length} sel.</span>
                  <button onClick={() => updateFiltro("lojas", [])} style={{ fontSize: "11px", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>limpar</button>
                </>}
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {LOJAS_OPTS.map(l => <Chip key={l.id} label={l.nome} ativo={filtros.lojas.includes(l.id)} onClick={() => toggle("lojas", l.id)} />)}
              </div>
            </div>
          )}

          {/* Sexo */}
          <div>
            <div style={lbl}>
              SEXO
              {filtros.sexos.length > 0 && <>
                <span style={{ color: "var(--primary)" }}>· {filtros.sexos.length} sel.</span>
                <button onClick={() => updateFiltro("sexos", [])} style={{ fontSize: "11px", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>limpar</button>
              </>}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {SEXOS_OPTS.map(s => <Chip key={s} label={s} ativo={filtros.sexos.includes(s)} onClick={() => toggle("sexos", s)} />)}
            </div>
          </div>

          {/* Modelo */}
          <div>
            <div style={lbl}>
              MODELO
              {filtros.modelos.length > 0 && <>
                <span style={{ color: "var(--primary)" }}>· {filtros.modelos.length} sel.</span>
                <button onClick={() => { updateFiltro("modelos", []); setBuscaModelo("") }} style={{ fontSize: "11px", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>limpar</button>
              </>}
            </div>
            <input placeholder={`Buscar entre ${todosModelos.length} modelos...`}
              value={buscaModelo} onChange={e => setBuscaModelo(e.target.value)} style={inp} />
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {modelosVisiveis.map(m => <Chip key={m} label={m} small ativo={filtros.modelos.includes(m)} onClick={() => toggle("modelos", m)} />)}
              {!buscaModelo && todosModelos.length > 10 && (
                <span style={{ fontSize: "11px", color: "var(--muted)", alignSelf: "center" }}>
                  +{todosModelos.length - modelosVisiveis.length} — busque para ver mais
                </span>
              )}
            </div>
          </div>

          {/* Marca */}
          <div>
            <div style={lbl}>
              MARCA
              {filtros.marcas.length > 0 && <>
                <span style={{ color: "var(--primary)" }}>· {filtros.marcas.length} sel.</span>
                <button onClick={() => { updateFiltro("marcas", []); setBuscaMarca("") }} style={{ fontSize: "11px", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>limpar</button>
              </>}
            </div>
            <input placeholder={`Buscar entre ${todasMarcas.length} marcas...`}
              value={buscaMarca} onChange={e => setBuscaMarca(e.target.value)} style={inp} />
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {marcasVisiveis.map(m => <Chip key={m} label={m} small ativo={filtros.marcas.includes(m)} onClick={() => toggle("marcas", m)} />)}
              {!buscaMarca && todasMarcas.length > 10 && (
                <span style={{ fontSize: "11px", color: "var(--muted)", alignSelf: "center" }}>
                  +{todasMarcas.length - marcasVisiveis.length} — busque para ver mais
                </span>
              )}
            </div>
          </div>

          {/* Saldo máximo */}
          {mostrarSaldo && (
            <div>
              <div style={lbl}>
                SALDO EM ESTOQUE
                {saldoAtual < 999 && (
                  <button onClick={() => updateFiltro("saldoMax", 999)} style={{ fontSize: "11px", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>limpar</button>
                )}
              </div>
              {/* Chips de saldo */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                {SALDO_OPCOES.map(o => (
                  <button key={o.val} onClick={() => updateFiltro("saldoMax", o.val)} style={{
                    padding: "4px 12px", borderRadius: "20px", fontSize: "12px",
                    cursor: "pointer", fontWeight: saldoAtual === o.val ? 600 : 400,
                    border: "1px solid",
                    background: saldoAtual === o.val
                      ? o.val === 0 ? "var(--danger)"
                      : o.val <= 2 ? "var(--warning)"
                      : o.val <= 5 ? "var(--primary)"
                      : "var(--success)"
                      : "var(--surface2)",
                    color: saldoAtual === o.val ? "#fff" : "var(--text)",
                    borderColor: saldoAtual === o.val
                      ? o.val === 0 ? "var(--danger)"
                      : o.val <= 2 ? "var(--warning)"
                      : o.val <= 5 ? "var(--primary)"
                      : "var(--success)"
                      : "var(--border)",
                    whiteSpace: "nowrap" as const,
                    transition: "all 0.1s",
                  }}>
                    {o.label}
                    <span style={{ fontSize: "10px", opacity: 0.8, marginLeft: "4px" }}>({o.desc})</span>
                  </button>
                ))}
              </div>
              {/* Slider */}
              <div>
                <input type="range" min={0} max={20} step={1}
                  value={saldoAtual === 999 ? 20 : saldoAtual}
                  onChange={e => {
                    const v = Number(e.target.value)
                    updateFiltro("saldoMax", v === 20 ? 999 : v)
                  }}
                  style={{ width: "100%", accentColor: "var(--primary)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                  <span>0 (zerado)</span>
                  <span style={{ fontWeight: 600, color: "var(--primary)" }}>
                    {saldoAtual === 999 ? "Todos" : `≤ ${saldoAtual} peças`}
                  </span>
                  <span>Todos</span>
                </div>
              </div>
            </div>
          )}

          {/* Ano */}
          <div>
            <div style={lbl}>
              ANO
              {filtros.anos.length > 0 && <>
                <span style={{ color: "var(--primary)" }}>· {filtros.anos.length} sel.</span>
                <button onClick={() => { updateFiltro("anos", []); updateFiltro("estacoes", []); updateFiltro("colecoes", []) }} style={{ fontSize: "11px", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>limpar</button>
              </>}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {todosAnos.length === 0
                ? <span style={{ fontSize: "12px", color: "var(--muted)" }}>Carregando...</span>
                : todosAnos.map(a => <Chip key={a} label={a} small ativo={filtros.anos.includes(a)} onClick={() => toggleAno(a)} />)
              }
            </div>
          </div>

          {/* Estação */}
          {filtros.anos.length > 0 && (
            <div>
              <div style={lbl}>
                ESTAÇÃO
                {filtros.estacoes.length > 0 && <>
                  <span style={{ color: "var(--primary)" }}>· {filtros.estacoes.length} sel.</span>
                  <button onClick={() => { updateFiltro("estacoes", []); updateFiltro("colecoes", []) }} style={{ fontSize: "11px", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>limpar</button>
                </>}
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {estacoesDisponiveis.map(e => (
                  <Chip key={e} label={e} small ativo={filtros.estacoes.includes(e)} onClick={() => {
                    toggle("estacoes", e)
                    updateFiltro("colecoes", [])
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Coleção */}
          {filtros.anos.length > 0 && (
            <div>
              <div style={lbl}>
                COLEÇÃO
                {filtros.colecoes.length > 0 && <>
                  <span style={{ color: "var(--primary)" }}>· {filtros.colecoes.length} sel.</span>
                  <button onClick={() => { updateFiltro("colecoes", []); setBuscaColecao("") }} style={{ fontSize: "11px", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>limpar</button>
                </>}
              </div>
              <input placeholder="Buscar coleção..." value={buscaColecao}
                onChange={e => setBuscaColecao(e.target.value)} style={inp} />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {colecoesDisponiveis.map(c => <Chip key={c} label={c} small ativo={filtros.colecoes.includes(c)} onClick={() => toggle("colecoes", c)} />)}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
