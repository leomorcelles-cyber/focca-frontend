"use client"
import { useEffect, useMemo, useState } from "react"
import KpiCard from "@/components/ui/KpiCard"
import FiltroGlobal from "@/components/FiltroGlobal"
import { useFiltros, resolverColecoes } from "@/components/FiltroContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const brl = (v: any) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
const brl2 = (v: any) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const limpaNome = (s: string) => s?.replace("FOCCA JEANS - ", "").replace("FOCCA ", "") || ""
const mesLabel = (p: string) => {
  const [a, m] = (p || "").split("-")
  const nomes = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                 "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  return `${nomes[Number(m)] || p} ${a}`
}

// A cor sai da COMPARACAO com o esperado ate hoje, nao do % puro. No dia 10 de 31,
// 33% da meta e ritmo certo — pintar de vermelho seria mentira. `esperado` e a
// fracao do periodo ja decorrida.
function tom(pct: number | null, esperado: number) {
  if (pct === null) return { cor: "var(--muted)", rotulo: "sem meta" }
  if (pct >= 100) return { cor: "#16a34a", rotulo: "batida" }
  if (pct >= esperado - 5) return { cor: "#16a34a", rotulo: "no ritmo" }
  if (pct >= esperado - 15) return { cor: "#d97706", rotulo: "atenção" }
  return { cor: "#dc2626", rotulo: "abaixo" }
}

function Barra({ pct, esperado, cor }: { pct: number | null; esperado: number; cor: string }) {
  const largura = Math.min(Math.max(Number(pct) || 0, 0), 100)
  return (
    <div style={{ position: "relative", height: "8px", background: "var(--border)", borderRadius: "4px", overflow: "hidden", minWidth: "90px" }}>
      <div style={{ width: `${largura}%`, height: "100%", background: cor, borderRadius: "4px", transition: "width .3s" }} />
      {/* marca de onde a loja DEVERIA estar hoje — a referencia que da sentido a barra */}
      {esperado > 0 && esperado < 100 && (
        <div title={`esperado hoje: ${esperado.toFixed(0)}%`}
             style={{ position: "absolute", left: `${esperado}%`, top: 0, width: "2px", height: "100%", background: "var(--text)", opacity: 0.55 }} />
      )}
    </div>
  )
}

export default function MetasPage() {
  const { filtros, versaoBusca } = useFiltros()
  const [periodos, setPeriodos] = useState<any[]>([])
  const [periodo, setPeriodo] = useState<string>("")
  const [lojas, setLojas] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [lojaSel, setLojaSel] = useState<number | null>(null)
  const [recorte, setRecorte] = useState(false)
  const [opPorAno, setOpPorAno] = useState<Record<string, string[]>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string>("")

  useEffect(() => {
    fetch(`${API_URL}/metas/periodos`)
      .then(r => r.json())
      .then(p => {
        setPeriodos(p || [])
        if (p?.length && !periodo) setPeriodo(p[0].periodo)
      })
      .catch(() => setErro("não consegui carregar os períodos"))
    fetch(`${API_URL}/filtros/colecoes-por-ano`)
      .then(r => r.json()).then(c => setOpPorAno(c.por_ano || {})).catch(() => {})
  }, [])

  // O filtro de LOJA recorta meta e realizado (a meta do ERP e por loja). Os chips
  // de produto so tem como recortar o realizado — o backend devolve recorte_produto
  // e apaga o %, para nao comparar um pedaco das vendas com a meta cheia.
  const params = useMemo(() => {
    const p = new URLSearchParams({ periodo })
    if (filtros.lojas.length)    p.set("loja",     filtros.lojas.join(","))
    if (filtros.marcas.length)   p.set("marca",    filtros.marcas.join(","))
    if (filtros.modelos.length)  p.set("modelo",   filtros.modelos.join(","))
    if (filtros.sexos.length)    p.set("sexo",     filtros.sexos.join(","))
    if (filtros.vendedores.length) p.set("vendedor", filtros.vendedores.join(","))
    if (filtros.cores.length)    p.set("cor",      filtros.cores.join(","))
    if (filtros.produtos.length) p.set("produto",  filtros.produtos.join(","))
    if (filtros.ids.trim())      p.set("cod_produto", filtros.ids.split(/[\s,;]+/).filter(Boolean).join(","))
    const cols = resolverColecoes(filtros, opPorAno)
    if (cols.length) p.set("colecao", cols.join(","))
    return p.toString()
  }, [periodo, filtros, opPorAno])

  useEffect(() => {
    if (!periodo) return
    setCarregando(true)
    setErro("")
    Promise.all([
      fetch(`${API_URL}/metas/lojas?${params}`).then(r => r.json()),
      fetch(`${API_URL}/metas/vendedores?${params}`).then(r => r.json()),
    ])
      .then(([l, v]) => {
        setLojas(l?.lojas || [])
        setVendedores(v?.vendedores || [])
        setRecorte(Boolean(l?.recorte_produto))
      })
      .catch(() => setErro("não consegui carregar as metas"))
      .finally(() => setCarregando(false))
  }, [periodo, params, versaoBusca])

  // Quanto do periodo ja passou. Serve de regua para todas as barras e cores.
  const esperado = useMemo(() => {
    const r = lojas.find(l => l.dias_totais > 0)
    if (!r) return 0
    return Math.min(100, (Number(r.dias_corridos) / Number(r.dias_totais)) * 100)
  }, [lojas])

  // Os totais so somam lojas COMPARAVEIS (tem meta, sao medidas por vendas_validas).
  // Incluir o CD inflaria a meta da rede com um alvo que ninguem mede.
  const totais = useMemo(() => {
    const comMeta = lojas.filter(l => Number(l.meta) > 0 && l.mede_vendas !== false)
    const meta = comMeta.reduce((s, l) => s + Number(l.meta || 0), 0)
    const feito = comMeta.reduce((s, l) => s + Number(l.realizado || 0), 0)
    const proj = comMeta.reduce((s, l) => s + Number(l.projecao || 0), 0)
    return {
      meta, feito, proj, lojas: comMeta.length,
      pct: meta > 0 && !recorte ? (feito / meta) * 100 : null,
    }
  }, [lojas, recorte])

  const vendFiltrados = useMemo(
    () => (lojaSel === null ? vendedores : vendedores.filter(v => v.empresa === lojaSel)),
    [vendedores, lojaSel],
  )
  const semMeta = vendFiltrados.filter(v => Number(v.meta) === 0 && Number(v.realizado) !== 0)

  const th: React.CSSProperties = {
    textAlign: "left", padding: "9px 10px", fontSize: "11px", fontWeight: 600,
    color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px",
    borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
  }
  const td: React.CSSProperties = { padding: "9px 10px", fontSize: "13px", borderBottom: "1px solid var(--border)" }

  return (
    <div style={{ padding: "24px 28px", maxWidth: "1400px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text)", margin: 0 }}>Metas</h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
            Meta do Microvix contra o realizado líquido — por loja e por vendedor.
          </p>
        </div>
        <select value={periodo} onChange={e => setPeriodo(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: "13px", minWidth: "180px" }}>
          {periodos.map(p => (
            <option key={p.periodo} value={p.periodo}>{mesLabel(p.periodo)}</option>
          ))}
        </select>
      </div>

      {/* A tela ja refaz a busca quando `filtros` muda; o botao so precisa cutucar
          o versaoBusca para o caso de reaplicar o mesmo recorte. */}
      <FiltroGlobal onBuscar={() => {}} loading={carregando} mostrarSaldo={false} />

      {recorte && (
        <div style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #d97706", background: "var(--surface)", color: "var(--text)", fontSize: "12px", margin: "12px 0 16px", lineHeight: 1.5 }}>
          <b>Recorte de produto ativo.</b> A meta do Microvix é um valor único por loja e por
          vendedor — não existe meta por marca, coleção ou modelo. Então o realizado abaixo está
          recortado, mas o <b>% e a projeção ficam ocultos</b>: comparar uma fatia das vendas com a
          meta inteira daria um número que parece leitura de desempenho e não é. Use só o filtro de
          loja para acompanhar meta.
        </div>
      )}

      {erro && (
        <div style={{ padding: "12px 14px", borderRadius: "8px", background: "var(--primary-light)", color: "var(--text)", fontSize: "13px", marginBottom: "16px" }}>
          {erro}
        </div>
      )}

      {carregando ? (
        <div style={{ color: "var(--muted)", fontSize: "13px", padding: "40px 0" }}>carregando…</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px", marginBottom: "8px" }}>
            <KpiCard label="Meta da rede" valor={brl(totais.meta)} sub={`${totais.lojas} loja${totais.lojas === 1 ? "" : "s"} com meta`} />
            <KpiCard label="Realizado" valor={brl(totais.feito)}
              cor={tom(totais.pct, esperado).cor}
              sub={totais.pct !== null ? `${totais.pct.toFixed(1)}% da meta` : undefined} />
            <KpiCard label="Projeção do mês" valor={recorte ? "—" : brl(totais.proj)}
              cor={recorte ? "var(--muted)" : (totais.proj >= totais.meta ? "#16a34a" : "#d97706")}
              sub={recorte ? "oculta com recorte de produto"
                : (totais.meta > 0 ? `${((totais.proj / totais.meta) * 100).toFixed(0)}% da meta no ritmo atual` : undefined)} />
            <KpiCard label="Período decorrido" valor={`${esperado.toFixed(0)}%`}
              sub={lojas[0] ? `dia ${lojas[0].dias_corridos} de ${lojas[0].dias_totais}` : undefined} />
          </div>
          <p style={{ fontSize: "11px", color: "var(--muted)", margin: "0 0 22px" }}>
            O traço vertical nas barras marca onde deveria estar hoje ({esperado.toFixed(0)}% do período).
            Realizado é líquido de devoluções, a mesma régua das outras telas.
          </p>

          {/* ---------------- LOJAS ---------------- */}
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", margin: "0 0 10px" }}>Por loja</h2>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflowX: "auto", marginBottom: "28px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "880px" }}>
              <thead>
                <tr>
                  <th style={th}>Loja</th>
                  <th style={th}>Meta</th>
                  <th style={th}>Realizado</th>
                  <th style={{ ...th, minWidth: "150px" }}>Progresso</th>
                  <th style={th}>Falta</th>
                  <th style={th}>Ritmo/dia p/ bater</th>
                  <th style={th}>Projeção</th>
                </tr>
              </thead>
              <tbody>
                {lojas.map(l => {
                  const t = tom(l.pct, esperado)
                  const semMetaLoja = !Number(l.meta)
                  // Sem comparacao possivel: sem meta, recorte de produto ligado, ou
                  // loja que o sistema nao mede (CD). Nao inventa 0%.
                  const semComp = l.pct === null || l.pct === undefined
                  return (
                    <tr key={l.empresa}
                      onClick={() => setLojaSel(lojaSel === l.empresa ? null : l.empresa)}
                      style={{ cursor: "pointer", background: lojaSel === l.empresa ? "var(--primary-light)" : "transparent" }}>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {limpaNome(l.loja) || `Loja ${l.empresa}`}
                        {l.meta_fechada === false && (
                          <span title="No Microvix, a soma das metas dos vendedores não fecha o valor da loja"
                            style={{ marginLeft: "6px", fontSize: "10px", color: "#d97706", border: "1px solid #d97706", borderRadius: "4px", padding: "1px 4px" }}>
                            rateio incompleto
                          </span>
                        )}
                      </td>
                      <td style={td}>{semMetaLoja ? <span style={{ color: "var(--muted)" }}>sem meta</span> : brl(l.meta)}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{brl(l.realizado)}</td>
                      <td style={td}>
                        {semComp ? (
                          <span style={{ color: "var(--muted)", fontSize: "12px" }}>
                            {l.mede_vendas === false ? "não medido aqui" : "—"}
                          </span>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Barra pct={l.pct} esperado={esperado} cor={t.cor} />
                            <span style={{ fontSize: "12px", fontWeight: 600, color: t.cor, minWidth: "44px" }}>{Number(l.pct).toFixed(0)}%</span>
                          </div>
                        )}
                      </td>
                      <td style={td}>{semComp ? "—" : brl(l.falta)}</td>
                      <td style={td}>
                        {l.ritmo_necessario ? brl(l.ritmo_necessario)
                          : <span style={{ color: "var(--muted)" }}>{semComp ? "—" : "meta batida"}</span>}
                      </td>
                      <td style={{ ...td, color: semComp ? "var(--muted)" : (Number(l.projecao) >= Number(l.meta) ? "#16a34a" : "#dc2626") }}>
                        {l.projecao === null || l.projecao === undefined ? "—" : brl(l.projecao)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ---------------- VENDEDORES ---------------- */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 10px", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", margin: 0 }}>Por vendedor</h2>
            {lojaSel !== null && (
              <button onClick={() => setLojaSel(null)}
                style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "999px", border: "1px solid var(--primary)", background: "var(--primary-light)", color: "var(--primary)", cursor: "pointer" }}>
                {limpaNome(lojas.find(l => l.empresa === lojaSel)?.loja) || `Loja ${lojaSel}`} ✕
              </button>
            )}
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              {lojaSel === null ? "clique numa loja acima para filtrar" : `${vendFiltrados.length} vendedores`}
            </span>
          </div>

          {semMeta.length > 0 && (
            <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "10px" }}>
              {semMeta.length} {semMeta.length === 1 ? "vendedor vendeu" : "vendedores venderam"} sem meta lançada no Microvix
              {" "}({brl(semMeta.reduce((s, v) => s + Number(v.realizado || 0), 0))}).
            </div>
          )}

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr>
                  <th style={th}>Vendedor</th>
                  <th style={th}>Loja</th>
                  <th style={th}>Meta</th>
                  <th style={th}>Realizado</th>
                  <th style={{ ...th, minWidth: "150px" }}>Progresso</th>
                  <th style={th}>Falta</th>
                  <th style={th}>Ritmo/dia</th>
                  <th style={th}>Vendas</th>
                  <th style={th}>Ticket médio</th>
                </tr>
              </thead>
              <tbody>
                {vendFiltrados.map(v => {
                  const t = tom(v.pct, esperado)
                  const sm = !Number(v.meta)
                  const semComp = v.pct === null || v.pct === undefined
                  return (
                    <tr key={`${v.empresa}-${v.cod_vendedor}`}>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {v.vendedor || `Vendedor ${v.cod_vendedor}`}
                        {v.ativo === "N" && (
                          <span style={{ marginLeft: "6px", fontSize: "10px", color: "var(--muted)" }}>inativo</span>
                        )}
                      </td>
                      <td style={{ ...td, color: "var(--muted)" }}>{limpaNome(v.loja) || `Loja ${v.empresa}`}</td>
                      <td style={td}>{sm ? <span style={{ color: "var(--muted)" }}>sem meta</span> : brl(v.meta)}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{brl2(v.realizado)}</td>
                      <td style={td}>
                        {semComp ? <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span> : (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Barra pct={v.pct} esperado={esperado} cor={t.cor} />
                            <span style={{ fontSize: "12px", fontWeight: 600, color: t.cor, minWidth: "44px" }}>{Number(v.pct).toFixed(0)}%</span>
                          </div>
                        )}
                      </td>
                      <td style={td}>{semComp ? "—" : brl(v.falta)}</td>
                      <td style={td}>{v.ritmo_necessario ? brl(v.ritmo_necessario) : <span style={{ color: "var(--muted)" }}>{semComp ? "—" : "batida"}</span>}</td>
                      <td style={td}>{v.num_vendas}</td>
                      <td style={td}>{v.ticket_medio ? brl2(v.ticket_medio) : "—"}</td>
                    </tr>
                  )
                })}
                {vendFiltrados.length === 0 && (
                  <tr><td colSpan={9} style={{ ...td, color: "var(--muted)", textAlign: "center", padding: "24px" }}>
                    nenhum vendedor com meta ou venda neste período
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
