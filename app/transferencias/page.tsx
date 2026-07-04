"use client"
import { useState, useMemo, useRef, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import FiltroGlobal, { LOJAS } from "@/components/FiltroGlobal"
import { useFiltros } from "@/components/FiltroContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

function saldoFmt(v: any) { return Math.round(Number(v) || 0) }
const limpaNome = (s: string) => s?.replace("FOCCA JEANS - ", "").replace("FOCCA ", "") || ""

export default function TransferenciasPage() {
  const { filtros, versaoBusca } = useFiltros()
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

    const p = new URLSearchParams({ limite: "1500" })
    if (filtros.marcas.length === 1)  p.set("marca",  filtros.marcas[0])
    if (filtros.modelos.length === 1) p.set("modelo", filtros.modelos[0])
    if (filtros.sexos.length === 1)   p.set("sexo",   filtros.sexos[0])

    try {
      const res = await fetch(`${API_URL}/transferencias?${p}`, { signal: abortRef.current.signal })
      let rows: any[] = await res.json()
      if (filtros.marcas.length > 1)  rows = rows.filter(r => filtros.marcas.includes(r.marca))
      if (filtros.modelos.length > 1) rows = rows.filter(r => filtros.modelos.some(m => r.modelo?.includes(m)))
      if (filtros.lojas.length > 0) {
        const nomes = LOJAS.filter(l => filtros.lojas.includes(l.id)).map(l => ((l as any).matchNome || l.nome).toUpperCase().replace("P.NEREU","NEREU"))
        rows = rows.filter(r =>
          nomes.some(n => r.loja_origem?.toUpperCase().includes(n)) ||
          nomes.some(n => r.loja_destino?.toUpperCase().includes(n))
        )
      }
      setDados(rows)
    } catch(e: any) { if (e?.name !== "AbortError") console.error(e) }
    finally { setLoading(false) }
  }

  const totalPecas = dados.reduce((acc, r) => acc + Number(r.qtd_sugerida_transferir || 0), 0)

  const virtualizer = useVirtualizer({
    count: dados.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 42,
    overscan: 12,
  })

  const th = (align: string, w?: string) => ({ padding: "9px 12px", textAlign: align as any, color: "var(--muted)" as const, fontWeight: 600 as const, fontSize: "10px" as const, textTransform: "uppercase" as const, letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const, minWidth: w })

  // Grid de colunas fixo para alinhar header com linhas virtualizadas
  const cols = "180px 90px 50px 120px 1fr 70px 1fr"

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Transferências Sugeridas</h1>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>Lojas com excesso para lojas com baixo saldo do mesmo SKU</p>
      </div>

      <FiltroGlobal onBuscar={buscar} loading={loading} />

      {dados.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: "10px", marginBottom: "16px" }}>
          {[
            { l: "Sugestões",     v: dados.length, c: "var(--primary)" },
            { l: "Peças a mover", v: Number(totalPecas).toLocaleString("pt-BR"), c: "var(--success)" },
            { l: "Prod. únicos",  v: new Set(dados.map(d => d.cod_produto)).size },
            { l: "Marcas",        v: new Set(dados.map(d => d.marca)).size },
          ].map((k, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
              <div style={{ fontSize: "clamp(18px,2vw,26px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1 }}>{k.v}</div>
            </div>
          ))}
        </div>
      )}

      {!buscaFeita ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>⇄</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>Selecione filtros e clique em Buscar</div>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>As sugestões mostram de onde tirar e para onde levar</div>
        </div>
      ) : loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>Buscando...
        </div>
      ) : dados.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>Nenhuma sugestão de transferência encontrada.</div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "760px" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: cols, background: "var(--surface2)", borderBottom: "2px solid var(--border)" }}>
                <div style={th("left")}>PRODUTO</div>
                <div style={th("left")}>COR</div>
                <div style={th("center")}>TAM</div>
                <div style={th("left")}>MARCA</div>
                <div style={th("left")}>ORIGEM ↑</div>
                <div style={th("center")}>MOVER</div>
                <div style={th("left")}>DESTINO ↓</div>
              </div>

              {/* Linhas virtualizadas */}
              <div ref={scrollRef} style={{ height: "calc(100vh - 380px)", overflowY: "auto" }}>
                <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative", width: "100%" }}>
                  {virtualizer.getVirtualItems().map(vr => {
                    const row = dados[vr.index]
                    return (
                      <div key={vr.key} data-index={vr.index} ref={virtualizer.measureElement}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vr.start}px)`, display: "grid", gridTemplateColumns: cols, borderBottom: "1px solid var(--border)", background: vr.index % 2 === 0 ? "transparent" : "var(--surface2)18", fontSize: "12px", alignItems: "center" }}>
                        <div title={row.produto} style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.produto}</div>
                        <div style={{ padding: "8px 12px", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.cor}</div>
                        <div style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>{row.tamanho}</div>
                        <div title={row.marca} style={{ padding: "8px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.marca}</div>
                        <div style={{ padding: "8px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ color: "var(--success)", fontWeight: 600 }}>{limpaNome(row.loja_origem)}</span>
                          <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "4px" }}>({saldoFmt(row.saldo_origem)})</span>
                        </div>
                        <div style={{ padding: "8px 12px", textAlign: "center" }}>
                          <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: "var(--primary-light)", color: "var(--primary)" }}>{saldoFmt(row.qtd_sugerida_transferir)}</span>
                        </div>
                        <div style={{ padding: "8px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ color: "var(--danger)", fontWeight: 600 }}>{limpaNome(row.loja_destino)}</span>
                          <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "4px" }}>({saldoFmt(row.saldo_destino)})</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", color: "var(--muted)", fontSize: "12px" }}>
            {dados.length} sugestões · {Number(totalPecas).toLocaleString("pt-BR")} peças a redistribuir
          </div>
        </div>
      )}
    </div>
  )
}
