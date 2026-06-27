"use client"
import { useEffect, useState, useMemo } from "react"
import { api } from "@/lib/api"
import FiltroColecao from "@/components/FiltroColecao"

const API_URL = "http://127.0.0.1:8000"

const LOJAS_CHIPS = [
  { id: 0, nome: "Todas" },
  { id: 1, nome: "P. Nereu" },
  { id: 3, nome: "Vidal" },
  { id: 4, nome: "Imbuiá" },
  { id: 5, nome: "Lontras" },
  { id: 6, nome: "Chapadão" },
  { id: 7, nome: "Hype" },
]

const LOJAS_MAP: Record<number, string> = {
  1: "P.Nereu", 3: "Vidal", 4: "Imbuiá", 5: "Lontras", 6: "Chapadão", 7: "Hype"
}

const SEXOS = ["FEMININO", "MASCULINO", "FEM INF", "MASC INF", "UNISSEX", "CURVES"]

export default function ComprasPage() {
  const [itens, setItens] = useState<any[]>([])
  const [giros, setGiros] = useState<any[]>([])
  const [filtros, setFiltros] = useState<any>({})
  const [loja, setLoja] = useState(0)
  const [sexos, setSexos] = useState<string[]>([])
  const [modelo, setModelo] = useState("")
  const [marca, setMarca] = useState("")
  const [colecao, setColecao] = useState("")
  const [ordenar, setOrdenar] = useState<"giro"|"saldo"|"margem">("giro")
  const [loading, setLoading] = useState(true)
  const [marcaAberta, setMarcaAberta] = useState<string|null>(null)
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(true)

  useEffect(() => {
    api.filtros().then(setFiltros)
    api.giro({ limite: "2000" }).then(setGiros)
  }, [])

  useEffect(() => {
    setLoading(true)
    const p: Record<string,string> = { limite: "2000" }
    if (loja)   p.loja   = String(loja)
    if (modelo) p.modelo = modelo
    if (marca)  p.marca  = marca
    if (colecao) p.colecao = colecao
    if (sexos.length === 1) p.sexo = sexos[0]
    api.necessidade(p).then(d => {
      let f = d
      if (sexos.length > 1) f = f.filter((r:any) => sexos.some(s => r.sexo?.includes(s)))
      setItens(f)
      setLoading(false)
    })
  }, [loja, sexos, modelo, marca, colecao])

  const giroMap = useMemo(() => {
    const m: Record<string,any> = {}
    giros.forEach(g => { m[`${g.cod_produto}`] = g })
    return m
  }, [giros])

  const itensRich = useMemo(() => itens.map(item => {
    const g = giroMap[`${item.cod_produto}`]
    const margem = item.preco_venda > 0 && item.preco_custo > 0
      ? ((item.preco_venda - item.preco_custo) / item.preco_venda * 100) : 0
    return { ...item, giro_30d: g?.qtd_30d || 0, giro_diario: g?.giro_diario_30d || 0, margem }
  }), [itens, giroMap])

  const porMarca = useMemo(() => {
    const grupos: Record<string, typeof itensRich> = {}
    itensRich.forEach(item => {
      if (!grupos[item.marca]) grupos[item.marca] = []
      grupos[item.marca].push(item)
    })
    return Object.entries(grupos).sort((a,b) => {
      const ga = a[1].reduce((s,i) => s + i.giro_30d, 0)
      const gb = b[1].reduce((s,i) => s + i.giro_30d, 0)
      return gb - ga
    })
  }, [itensRich])

  function ordenarItens(items: typeof itensRich) {
    return [...items].sort((a,b) => {
      if (ordenar === "giro")   return b.giro_30d - a.giro_30d
      if (ordenar === "saldo")  return a.saldo_atual - b.saldo_atual
      return b.margem - a.margem
    })
  }

  function exportarMarca(m: string) {
    const p = new URLSearchParams({ apenas_zerados: "false", marca: m })
    if (loja)    p.set("loja", String(loja))
    if (colecao) p.set("colecao", colecao)
    window.open(`${API_URL}/export/faltantes?${p}`)
  }

  function exportarTudo() {
    const p = new URLSearchParams({ apenas_zerados: "false" })
    if (loja)   p.set("loja",   String(loja))
    if (marca)  p.set("marca",  marca)
    if (modelo) p.set("modelo", modelo)
    if (colecao) p.set("colecao", colecao)
    window.open(`${API_URL}/export/faltantes?${p}`)
  }

  function toggleSexo(s: string) {
    setSexos(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function limpar() { setLoja(0); setSexos([]); setModelo(""); setMarca(""); setColecao("") }

  const temFiltro = loja > 0 || sexos.length > 0 || modelo || marca || colecao
  const totalGiro = itensRich.reduce((s,i) => s + i.giro_30d, 0)

  const sCor: Record<string,string> = { "ZERADO": "var(--danger)", "CRITICO": "var(--warning)", "ABAIXO MINIMO": "var(--orange)" }
  const sBg:  Record<string,string> = { "ZERADO": "var(--danger-light)", "CRITICO": "var(--warning-light)", "ABAIXO MINIMO": "var(--orange-light)" }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px, 2vw, 24px)", fontWeight: 700, color: "var(--text)" }}>Decisão de Compra</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>SKUs críticos agrupados por marca · giro · saldo · margem</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {temFiltro && (
            <button onClick={limpar} style={{ padding: "8px 14px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "13px" }}>
              ✕ Limpar
            </button>
          )}
          <button onClick={exportarTudo} style={{ padding: "8px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
            ⬇ Exportar tudo
          </button>
          <button onClick={() => setFiltrosVisiveis(!filtrosVisiveis)} style={{ padding: "8px 14px", background: filtrosVisiveis ? "var(--surface2)" : "var(--primary-light)", border: "1px solid var(--border)", borderRadius: "8px", color: filtrosVisiveis ? "var(--muted)" : "var(--primary)", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
            {filtrosVisiveis ? "▲ Ocultar filtros" : "▼ Filtros"}
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        {[
          { l: "SKUs críticos",  v: itensRich.length.toLocaleString("pt-BR"), c: "var(--danger)" },
          { l: "Marcas",         v: porMarca.length,                           c: "var(--primary)" },
          { l: "Vendidos 30d",   v: totalGiro.toLocaleString("pt-BR"),         c: "var(--success)" },
          { l: "Lojas afetadas", v: new Set(itens.map(i => i.empresa)).size,   c: "var(--warning)" },
        ].map((k,i) => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
            <div style={{ fontSize: "clamp(18px,2vw,26px)", fontWeight: 700, color: k.c, marginTop: "4px", lineHeight: 1 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* ── FILTROS ── */}
      {filtrosVisiveis && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>

          {/* Loja */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Loja</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {LOJAS_CHIPS.map(l => (
                <button key={l.id} onClick={() => setLoja(l.id)} style={{
                  padding: "5px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", fontWeight: 500, border: "1px solid", transition: "all 0.1s",
                  background: loja === l.id ? "var(--primary)" : "var(--surface2)",
                  color: loja === l.id ? "#fff" : "var(--muted)",
                  borderColor: loja === l.id ? "var(--primary)" : "var(--border)",
                }}>{l.nome}</button>
              ))}
            </div>
          </div>

          {/* Sexo */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
              Sexo {sexos.length > 0 && <span style={{ color: "var(--primary)" }}>· {sexos.length} selecionados</span>}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {SEXOS.map(s => (
                <button key={s} onClick={() => toggleSexo(s)} style={{
                  padding: "5px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", fontWeight: 500, border: "1px solid", transition: "all 0.1s",
                  background: sexos.includes(s) ? "var(--primary)" : "var(--surface2)",
                  color: sexos.includes(s) ? "#fff" : sexos.length > 0 ? "var(--muted)" : "var(--text)",
                  borderColor: sexos.includes(s) ? "var(--primary)" : "var(--border)",
                  opacity: sexos.length > 0 && !sexos.includes(s) ? 0.45 : 1,
                }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Dropdowns + Ordenação */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "14px" }}>
            {[
              { label: "Modelo", value: modelo, set: setModelo, opts: filtros.modelos || [] },
              { label: "Marca",  value: marca,  set: setMarca,  opts: filtros.marcas  || [] },
            ].map(({ label, value, set, opts }) => (
              <div key={label}>
                <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>{label}</div>
                <select value={value} onChange={e => set(e.target.value)} style={{ width: "100%" }}>
                  <option value="">Todos</option>
                  {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Ordenar por</div>
              <select value={ordenar} onChange={e => setOrdenar(e.target.value as any)} style={{ width: "100%" }}>
                <option value="giro">Maior giro</option>
                <option value="saldo">Menor saldo</option>
                <option value="margem">Maior margem</option>
              </select>
            </div>
          </div>

          {/* Coleção */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
            <FiltroColecao value={colecao} onChange={setColecao} />
          </div>
        </div>
      )}

      {/* ── MARCAS ── */}
      {loading ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          Carregando dados de compra...
        </div>
      ) : porMarca.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          Nenhum SKU crítico encontrado com esses filtros.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {porMarca.map(([marcaNome, arr]) => {
            const aberta = marcaAberta === marcaNome
            const ordenados = ordenarItens(arr)
            const giroTotal = arr.reduce((s,i) => s + i.giro_30d, 0)
            const margMedia = arr.filter(i => i.margem > 0).length > 0
              ? arr.reduce((s,i) => s + i.margem, 0) / arr.filter(i => i.margem > 0).length : 0
            const lojas = [...new Set(arr.map(i => i.empresa))]

            return (
              <div key={marcaNome} style={{ background: "var(--surface)", border: `1px solid ${aberta ? "var(--primary)" : "var(--border)"}`, borderRadius: "10px", overflow: "hidden", transition: "border-color 0.15s" }}>

                {/* Cabeçalho da marca */}
                <div onClick={() => setMarcaAberta(aberta ? null : marcaNome)} style={{
                  padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: "8px", flexWrap: "wrap",
                  background: aberta ? "var(--primary-light)" : "transparent",
                  borderBottom: aberta ? "1px solid var(--border)" : "none",
                }}>
                  {/* Info da marca */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: aberta ? "var(--primary)" : "var(--text)", whiteSpace: "nowrap" }}>
                      {marcaNome}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--muted)", background: "var(--surface2)", padding: "2px 8px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                      {arr.length} SKUs
                    </span>
                    {giroTotal > 0 && (
                      <span style={{ fontSize: "12px", color: "var(--success)", fontWeight: 600, whiteSpace: "nowrap" }}>
                        ↑ {giroTotal} vendidos/30d
                      </span>
                    )}
                    {margMedia > 0 && (
                      <span style={{ fontSize: "12px", color: "var(--warning)", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {margMedia.toFixed(0)}% margem
                      </span>
                    )}
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {lojas.map(emp => (
                        <span key={emp} style={{ fontSize: "10px", color: "var(--muted)", background: "var(--surface2)", padding: "1px 6px", borderRadius: "4px", whiteSpace: "nowrap" }}>
                          {LOJAS_MAP[emp] || emp}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); exportarMarca(marcaNome) }} style={{
                      padding: "5px 12px", background: "var(--primary)", color: "#fff", border: "none",
                      borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap",
                    }}>⬇ CSV</button>
                    <span style={{ color: "var(--muted)", fontSize: "14px", userSelect: "none" }}>{aberta ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Tabela de itens */}
                {aberta && (
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "600px" }}>
                      <thead>
                        <tr style={{ background: "var(--surface2)" }}>
                          {["Produto", "Cor", "Tam", "Coleção", "Loja", "Saldo", "Giro 30d", "/dia", "Preço", "Margem", "Status"].map(h => (
                            <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ordenados.map((row, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--surface2)33" }}>
                            <td style={{ padding: "8px 10px", fontWeight: 600, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.produto}</td>
                            <td style={{ padding: "8px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>{row.cor}</td>
                            <td style={{ padding: "8px 10px", fontWeight: 700, whiteSpace: "nowrap" }}>{row.tamanho}</td>
                            <td style={{ padding: "8px 10px", color: "var(--muted)", fontSize: "11px", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.colecao}</td>
                            <td style={{ padding: "8px 10px", fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap" }}>{row.nome_loja?.replace("FOCCA JEANS - ", "")}</td>
                            <td style={{ padding: "8px 10px", textAlign: "center" }}>
                              <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: sBg[row.status] || "var(--surface2)", color: sCor[row.status] || "var(--muted)", whiteSpace: "nowrap" }}>
                                {row.saldo_atual}
                              </span>
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: row.giro_30d > 0 ? 700 : 400, color: row.giro_30d > 0 ? "var(--success)" : "var(--muted)" }}>
                              {row.giro_30d > 0 ? row.giro_30d : "—"}
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "center", color: row.giro_diario > 0 ? "var(--success)" : "var(--muted)", fontSize: "11px", whiteSpace: "nowrap" }}>
                              {row.giro_diario > 0 ? `${row.giro_diario.toFixed(2)}` : "—"}
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>R$ {Number(row.preco_venda || 0).toFixed(2)}</td>
                            <td style={{ padding: "8px 10px", textAlign: "center" }}>
                              {row.margem > 0 ? (
                                <span style={{
                                  padding: "2px 6px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap",
                                  color: row.margem >= 60 ? "var(--success)" : row.margem >= 45 ? "var(--warning)" : "var(--danger)",
                                  background: row.margem >= 60 ? "var(--success-light)" : row.margem >= 45 ? "var(--warning-light)" : "var(--danger-light)",
                                }}>{row.margem.toFixed(0)}%</span>
                              ) : <span style={{ color: "var(--muted)" }}>—</span>}
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 600, background: sBg[row.status] || "var(--surface2)", color: sCor[row.status] || "var(--muted)", whiteSpace: "nowrap" }}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: "var(--surface2)", borderTop: "2px solid var(--border)" }}>
                          <td colSpan={5} style={{ padding: "8px 10px", fontSize: "11px", fontWeight: 600, color: "var(--muted)" }}>
                            {arr.length} SKUs · {lojas.map(e => LOJAS_MAP[e]).join(", ")}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "var(--danger)", fontSize: "12px" }}>
                            {arr.reduce((s,i) => s + i.saldo_atual, 0)}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "var(--success)", fontSize: "12px" }}>
                            {giroTotal > 0 ? giroTotal : "—"}
                          </td>
                          <td colSpan={4} style={{ padding: "8px 10px", textAlign: "right" }}>
                            <button onClick={() => exportarMarca(marcaNome)} style={{ padding: "4px 12px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>
                              ⬇ Exportar {marcaNome}
                            </button>
                          </td>
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
    </div>
  )
}
