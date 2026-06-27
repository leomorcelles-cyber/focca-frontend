"use client"
import { useState, useMemo, useRef } from "react"
import FiltroGlobal, { LOJAS, FiltroState, filtroVazio } from "@/components/FiltroGlobal"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export default function TransferenciasPage() {
  const [filtros, setFiltros] = useState<FiltroState>({ ...filtroVazio })
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [buscaFeita, setBuscaFeita] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function buscar() {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setDados([]); setLoading(true); setBuscaFeita(true)

    const p = new URLSearchParams({ limite: "1000" })
    if (filtros.marcas.length === 1)  p.set("marca",  filtros.marcas[0])
    if (filtros.modelos.length === 1) p.set("modelo", filtros.modelos[0])
    if (filtros.sexos.length === 1)   p.set("sexo",   filtros.sexos[0])

    try {
      const res = await fetch(`${API_URL}/transferencias?${p}`, { signal: abortRef.current.signal })
      let rows: any[] = await res.json()
      if (filtros.marcas.length > 1)  rows = rows.filter(r => filtros.marcas.includes(r.marca))
      if (filtros.modelos.length > 1) rows = rows.filter(r => filtros.modelos.some(m => r.modelo?.includes(m)))
      // Filtro de loja: origem OU destino entre as selecionadas
      if (filtros.lojas.length > 0) {
        const nomes = LOJAS.filter(l => filtros.lojas.includes(l.id)).map(l => l.nome.toUpperCase())
        rows = rows.filter(r =>
          nomes.some(n => r.loja_origem?.toUpperCase().includes(n.replace("P.NEREU","NEREU"))) ||
          nomes.some(n => r.loja_destino?.toUpperCase().includes(n.replace("P.NEREU","NEREU")))
        )
      }
      setDados(rows)
    } catch(e: any) { if (e?.name !== "AbortError") console.error(e) }
    finally { setLoading(false) }
  }

  const totalPecas = dados.reduce((acc, r) => acc + Number(r.qtd_sugerida_transferir || 0), 0)

  const th = (align: string, w?: string) => ({ padding: "9px 12px", textAlign: align as any, color: "var(--muted)" as const, fontWeight: 600 as const, fontSize: "10px" as const, textTransform: "uppercase" as const, letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const, minWidth: w })
  const td = { padding: "8px 12px", overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const }
  const limpaNome = (s: string) => s?.replace("FOCCA JEANS - ", "").replace("FOCCA ", "") || ""

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Transferências Sugeridas</h1>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>Lojas com excesso para lojas com baixo saldo do mesmo SKU</p>
      </div>

      <FiltroGlobal filtros={filtros} setFiltros={setFiltros} onBuscar={buscar} loading={loading} />

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
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "2px solid var(--border)" }}>
                  <th style={th("left", "180px")}>PRODUTO</th>
                  <th style={th("left", "90px")}>COR</th>
                  <th style={th("center", "50px")}>TAM</th>
                  <th style={th("left", "120px")}>MARCA</th>
                  <th style={th("left", "120px")}>ORIGEM ↑</th>
                  <th style={th("center", "70px")}>MOVER</th>
                  <th style={th("left", "120px")}>DESTINO ↓</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--surface2)18" }}>
                    <td title={row.produto} style={{ ...td, fontWeight: 600, maxWidth: "180px" }}>{row.produto}</td>
                    <td style={{ ...td, color: "var(--muted)" }}>{row.cor}</td>
                    <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{row.tamanho}</td>
                    <td title={row.marca} style={{ ...td, maxWidth: "120px" }}>{row.marca}</td>
                    <td style={td}>
                      <span style={{ color: "var(--success)", fontWeight: 600 }}>{limpaNome(row.loja_origem)}</span>
                      <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "4px" }}>({saldoFmt(row.saldo_origem)})</span>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: "var(--primary-light)", color: "var(--primary)" }}>
                        {Math.round(Number(row.qtd_sugerida_transferir))}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ color: "var(--danger)", fontWeight: 600 }}>{limpaNome(row.loja_destino)}</span>
                      <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "4px" }}>({saldoFmt(row.saldo_destino)})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", color: "var(--muted)", fontSize: "12px" }}>
            {dados.length} sugestões · {Number(totalPecas).toLocaleString("pt-BR")} peças a redistribuir
          </div>
        </div>
      )}
    </div>
  )
}

function saldoFmt(v: any) { return Math.round(Number(v) || 0) }
