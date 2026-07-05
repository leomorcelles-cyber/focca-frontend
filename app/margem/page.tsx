"use client"
import { useState, useRef, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import FiltroGlobal from "@/components/FiltroGlobal"
import { useFiltros } from "@/components/FiltroContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

function corMargem(m: number) {
  if (m >= 60) return { cor: "var(--success)", bg: "var(--success-light)" }
  if (m >= 45) return { cor: "var(--warning)", bg: "var(--warning-light)" }
  return { cor: "var(--danger)", bg: "var(--danger-light)" }
}

export default function MargemPage() {
  const { filtros, versaoBusca } = useFiltros()
  const [ordem, setOrdem] = useState("lucro")
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [buscaFeita, setBuscaFeita] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const temFiltro = filtros.lojas.length || filtros.sexos.length || filtros.modelos.length ||
      filtros.marcas.length || filtros.anos.length || filtros.colecoes.length
    if (temFiltro) buscar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoBusca])

  async function buscar() {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setDados([]); setLoading(true); setBuscaFeita(true)

    const p = new URLSearchParams({ limite: "15000", ordem })
    if (filtros.marcas.length)  p.set("marca",  filtros.marcas.join(","))
    if (filtros.produtos.length) p.set("produto", filtros.produtos.join(","))
    if (filtros.cores.length)    p.set("cor",     filtros.cores.join(","))
    if (filtros.ids.trim())      p.set("cod_produto", filtros.ids.split(/[\s,;]+/).filter(Boolean).join(","))
    if (filtros.modelos.length) p.set("modelo", filtros.modelos.join(","))
    if (filtros.sexos.length)   p.set("sexo",   filtros.sexos.join(","))

    try {
      const res = await fetch(`${API_URL}/margem?${p}`, { signal: abortRef.current.signal })
      let rows: any[] = await res.json()
      if (filtros.marcas.length > 1)  rows = rows.filter(r => filtros.marcas.includes(r.marca))
      if (filtros.modelos.length > 1) rows = rows.filter(r => filtros.modelos.some(m => r.modelo?.includes(m)))
      if (filtros.sexos.length > 1)   rows = rows.filter(r => filtros.sexos.some(s => r.sexo?.includes(s)))
      setDados(rows)
    } catch(e: any) { if (e?.name !== "AbortError") console.error(e) }
    finally { setLoading(false) }
  }

  const fmtR = (n: number) => `R$ ${n?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0,00"}`
  const totalLucro = dados.reduce((a, r) => a + (r.lucro_potencial || 0), 0)
  const totalVenda = dados.reduce((a, r) => a + (r.valor_venda_potencial || 0), 0)
  const margemMedia = dados.filter(r => r.margem_bruta_pct).length > 0
    ? dados.reduce((a, r) => a + (r.margem_bruta_pct || 0), 0) / dados.filter(r => r.margem_bruta_pct).length : 0

  const virtualizer = useVirtualizer({
    count: dados.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 12,
  })

  const th = { padding: "9px 12px", color: "var(--muted)" as const, fontWeight: 600 as const, fontSize: "10px" as const, textTransform: "uppercase" as const, letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const, textAlign: "left" as const }
  const cols = "200px 90px 50px 120px 60px 90px 90px 80px 70px 1fr"

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Margem e Rentabilidade</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>Ranking por margem, markup e lucro potencial em estoque</p>
        </div>
        <select value={ordem} onChange={e => setOrdem(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "13px", background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}>
          <option value="lucro">Por lucro potencial</option>
          <option value="margem">Por margem %</option>
          <option value="markup">Por markup</option>
        </select>
      </div>

      <FiltroGlobal onBuscar={buscar} loading={loading} />

      {dados.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: "10px", marginBottom: "16px" }}>
          {[
            { l: "Lucro potencial", v: fmtR(totalLucro),            c: "var(--success)" },
            { l: "Valor a vender",  v: fmtR(totalVenda),            c: "var(--primary)" },
            { l: "Margem média",    v: `${margemMedia.toFixed(1)}%`, c: "var(--warning)" },
            { l: "Produtos",        v: dados.length.toLocaleString("pt-BR") },
          ].map((k, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px", minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
              <div style={{ fontSize: "clamp(14px,1.6vw,19px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.v}</div>
            </div>
          ))}
        </div>
      )}

      {!buscaFeita ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📊</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>Selecione filtros e clique em Buscar</div>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>Veja quais produtos têm maior margem e lucro potencial</div>
        </div>
      ) : loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>Buscando...
        </div>
      ) : dados.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>Nenhum produto encontrado.</div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "1000px" }}>
              <div style={{ display: "grid", gridTemplateColumns: cols, background: "var(--surface2)", borderBottom: "2px solid var(--border)" }}>
                {["Produto","Cor","Tam","Marca","Saldo","Preço","Custo","Margem","Markup","Lucro pot."].map(h => <div key={h} style={th}>{h}</div>)}
              </div>
              <div ref={scrollRef} style={{ height: "calc(100vh - 400px)", overflowY: "auto" }}>
                <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative", width: "100%" }}>
                  {virtualizer.getVirtualItems().map(vr => {
                    const row = dados[vr.index]
                    const mc = corMargem(row.margem_bruta_pct || 0)
                    return (
                      <div key={vr.key} data-index={vr.index} ref={virtualizer.measureElement}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vr.start}px)`, display: "grid", gridTemplateColumns: cols, borderBottom: "1px solid var(--border)", background: vr.index % 2 === 0 ? "transparent" : "var(--surface2)18", fontSize: "12px", alignItems: "center" }}>
                        <div title={row.nome} style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.nome}</div>
                        <div style={{ padding: "8px 12px", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.cor}</div>
                        <div style={{ padding: "8px 12px", fontWeight: 700 }}>{row.tamanho}</div>
                        <div title={row.marca} style={{ padding: "8px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.marca}</div>
                        <div style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>{Math.round(row.saldo_atual)}</div>
                        <div style={{ padding: "8px 12px", textAlign: "right" }}>{fmtR(row.preco_venda)}</div>
                        <div style={{ padding: "8px 12px", textAlign: "right", color: "var(--muted)" }}>{fmtR(row.preco_custo)}</div>
                        <div style={{ padding: "8px 12px", textAlign: "center" }}>
                          <span style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: mc.cor, background: mc.bg }}>{row.margem_bruta_pct?.toFixed(1)}%</span>
                        </div>
                        <div style={{ padding: "8px 12px", textAlign: "center", color: "var(--muted)" }}>{row.markup?.toFixed(2)}x</div>
                        <div style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--success)" }}>{fmtR(row.lucro_potencial)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", color: "var(--muted)", fontSize: "12px" }}>{dados.length} produtos</div>
        </div>
      )}
    </div>
  )
}
