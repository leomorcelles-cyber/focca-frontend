"use client"
import { useState, useMemo, useCallback } from "react"
import { useFiltro } from "@/lib/FiltroContext"

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

const SEXOS = ["FEMININO","MASCULINO","FEM INF","MASC INF","UNISSEX","FEMININO CURVES"]

function saldoReal(v: any) { return Math.max(0, Number(v) || 0) }

function corSaldo(v: number) {
  if (v === 0) return { bg: "var(--danger-light)",  color: "var(--danger)",  fw: 700 }
  if (v <= 2)  return { bg: "var(--warning-light)", color: "var(--warning)", fw: 600 }
  if (v <= 5)  return { bg: "var(--primary-light)", color: "var(--primary)", fw: 500 }
  return { bg: "transparent", color: "var(--text)", fw: 400 }
}

function Chip({ label, ativo, onClick }: { label: string, ativo: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 10px", borderRadius: "20px", fontSize: "12px", cursor: "pointer",
      fontWeight: ativo ? 600 : 400, border: "1px solid",
      background: ativo ? "var(--primary)" : "var(--surface2)",
      color: ativo ? "#fff" : "var(--text)",
      borderColor: ativo ? "var(--primary)" : "var(--border)",
      whiteSpace: "nowrap" as const, transition: "all 0.1s",
    }}>{label}</button>
  )
}

export default function EstoquePage() {
  // Filtros locais — não conectados ao FiltroContext para evitar re-renders globais
  const [marcaBusca, setMarcaBusca] = useState("")
  const [modeloBusca, setModeloBusca] = useState("")
  const [sexosSel, setSexosSel] = useState<string[]>([])
  const [lojasSel, setLojasSel] = useState<number[]>([])
  const [anoBusca, setAnoBusca] = useState("")

  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [buscaFeita, setBuscaFeita] = useState(false)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  async function buscar() {
    setLoading(true)
    setBuscaFeita(true)
    setDados([])
    setExpandidos(new Set())

    const p = new URLSearchParams({ limite: "1000" })
    if (marcaBusca.trim())  p.set("marca",  marcaBusca.trim())
    if (modeloBusca.trim()) p.set("modelo", modeloBusca.trim())
    if (sexosSel.length === 1) p.set("sexo", sexosSel[0])
    if (anoBusca.trim()) p.set("ano", anoBusca.trim())

    try {
      const res = await fetch(`${API_URL}/matriz?${p}`)
      let rows = await res.json()

      // Filtros adicionais no frontend
      if (sexosSel.length > 1) rows = rows.filter((r: any) => sexosSel.some(s => r.sexo?.includes(s)))
      if (lojasSel.length > 0) rows = rows.filter((r: any) =>
        lojasSel.some(l => saldoReal(r[LOJAS.find(lo => lo.id === l)?.key || ""]) > 0)
      )

      setDados(rows)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function limpar() {
    setMarcaBusca(""); setModeloBusca(""); setSexosSel([])
    setLojasSel([]); setAnoBusca(""); setDados([]); setBuscaFeita(false)
  }

  const lojasFiltradas = lojasSel.length > 0 ? LOJAS.filter(l => lojasSel.includes(l.id)) : LOJAS

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

  const inp = {
    padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)",
    fontSize: "13px", background: "var(--surface2)", color: "var(--text)",
    outline: "none", width: "100%",
  }

  const thS = {
    padding: "5px 8px", color: "var(--muted)" as const, fontWeight: 600 as const,
    fontSize: "10px" as const, textTransform: "uppercase" as const,
    letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const,
  }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Estoque por Loja</h1>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>Busque por marca, modelo, ano ou sexo</p>
      </div>

      {/* Painel de busca */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Marca</label>
            <input placeholder="Ex: ZIANN, SALLO..." value={marcaBusca} onChange={e => setMarcaBusca(e.target.value)}
              onKeyDown={e => e.key === "Enter" && buscar()} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Modelo</label>
            <input placeholder="Ex: CALCA, CAMISETA..." value={modeloBusca} onChange={e => setModeloBusca(e.target.value)}
              onKeyDown={e => e.key === "Enter" && buscar()} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Ano</label>
            <input placeholder="Ex: 2026" value={anoBusca} onChange={e => setAnoBusca(e.target.value)}
              onKeyDown={e => e.key === "Enter" && buscar()} style={inp} />
          </div>
        </div>

        {/* Sexo */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Sexo</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {SEXOS.map(s => (
              <Chip key={s} label={s} ativo={sexosSel.includes(s)}
                onClick={() => setSexosSel(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} />
            ))}
          </div>
        </div>

        {/* Lojas */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Loja</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {LOJAS.map(l => (
              <Chip key={l.id} label={l.nome} ativo={lojasSel.includes(l.id)}
                onClick={() => setLojasSel(prev => prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev, l.id])} />
            ))}
          </div>
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={buscar} disabled={loading} style={{
            padding: "10px 28px", background: "var(--primary)", color: "#fff",
            border: "none", borderRadius: "8px", cursor: loading ? "default" : "pointer",
            fontSize: "14px", fontWeight: 700, opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Buscando..." : "🔍 Buscar"}
          </button>
          {buscaFeita && (
            <button onClick={limpar} style={{
              padding: "10px 20px", background: "none", color: "var(--muted)",
              border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer", fontSize: "13px",
            }}>
              Limpar
            </button>
          )}
          {grupos.length > 0 && (
            <>
              <button onClick={() => setExpandidos(new Set(grupos.map(([k]) => k)))}
                style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>
                Expandir todos
              </button>
              <button onClick={() => setExpandidos(new Set())}
                style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>
                Recolher todos
              </button>
            </>
          )}
        </div>
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
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>Pronto para buscar</div>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>Preencha os filtros acima e clique em Buscar</div>
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
            const totalGrupo = grupo.itens.reduce((s: number, item: any) =>
              s + lojasFiltradas.reduce((ls, l) => ls + saldoReal(item[l.key]), 0), 0)
            return (
              <div key={key} style={{ background: "var(--surface)", border: `1px solid ${temCritico ? "var(--warning)" : "var(--border)"}`, borderRadius: "10px", overflow: "hidden" }}>
                <div onClick={() => toggleExpandido(key)} style={{
                  padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: "12px",
                  background: aberto ? "var(--surface2)" : "transparent",
                  borderBottom: aberto ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" }}>
                        {grupo.produto}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "1px" }}>
                        {grupo.cor} · {grupo.modelo} · {grupo.marca}
                      </div>
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
