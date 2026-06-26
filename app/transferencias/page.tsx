"use client"
import { useEffect, useState, useMemo } from "react"
import { api } from "@/lib/api"
import { useFiltro } from "@/lib/FiltroContext"
import FiltroGlobal from "@/components/FiltroGlobal"

export default function TransferenciasPage() {
  const { filtros } = useFiltro()
  const [dados, setDados] = useState<any[]>([])
  const [opcoesFiltro, setOpcoesFiltro] = useState<any>({})
  const [opcoesProntas, setOpcoesProntas] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.filtros(),
      fetch("http://127.0.0.1:8000/filtros/colecoes-por-ano").then(r => r.json()),
    ]).then(([f, c]) => {
      setOpcoesFiltro({ ...f, porAno: c.por_ano, anos: c.anos })
      setOpcoesProntas(true)
    })
  }, [])

  const colecoesAlvo = useMemo(() => {
    if (filtros.colecoes.length > 0) return filtros.colecoes
    if (!opcoesFiltro.porAno || filtros.anos.length === 0) return []
    const doAno = filtros.anos.flatMap((a: string) => opcoesFiltro.porAno[a] || [])
    if (filtros.estacoes.length === 0) return doAno
    return doAno.filter((c: string) =>
      filtros.estacoes.some((e: string) => c.toUpperCase().includes(e.toUpperCase()))
    )
  }, [filtros.colecoes, filtros.anos, filtros.estacoes, opcoesFiltro.porAno])

  useEffect(() => {
    if (!opcoesProntas) return
    setLoading(true)
    const p: Record<string, string> = { limite: "500" }
    if (filtros.modelos.length === 1) p.modelo = filtros.modelos[0]
    if (filtros.marcas.length === 1)  p.marca  = filtros.marcas[0]

    api.transferencias(p).then(d => {
      let f = d
      if (filtros.modelos.length > 1) f = f.filter((r: any) => filtros.modelos.some(m => r.modelo?.includes(m)))
      if (filtros.marcas.length > 1)  f = f.filter((r: any) => filtros.marcas.includes(r.marca))
      if (filtros.lojas.length > 0)   f = f.filter((r: any) =>
        filtros.lojas.includes(r.empresa_origem) || filtros.lojas.includes(r.empresa_destino)
      )
      if (colecoesAlvo.length > 0)    f = f.filter((r: any) => colecoesAlvo.includes(r.colecao))
      setDados(f)
      setLoading(false)
    })
  }, [filtros, colecoesAlvo, opcoesProntas])

  const totalItens = dados.reduce((acc, r) => acc + (r.qtd_sugerida_transferir || 0), 0)

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Transferências Sugeridas</h1>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>Lojas com excesso → lojas críticas do mesmo SKU</p>
      </div>

      <FiltroGlobal opcoes={opcoesFiltro} />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: "10px", marginBottom: "16px" }}>
        {[
          { l: "Sugestões",       v: dados.length,                               c: "var(--primary)" },
          { l: "Peças a mover",   v: Number(totalItens).toLocaleString("pt-BR"), c: "var(--success)" },
          { l: "Produtos únicos", v: new Set(dados.map(d => d.cod_produto)).size },
          { l: "Marcas",          v: new Set(dados.map(d => d.marca)).size },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
            <div style={{ fontSize: "clamp(18px,2vw,26px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Tabela compacta */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Carregando...</div>
        ) : dados.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Nenhuma sugestão com esses filtros.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "var(--surface2)", borderBottom: "2px solid var(--border)" }}>
                <th style={th("left",  "180px")}>PRODUTO</th>
                <th style={th("left",  "90px")}>COR</th>
                <th style={th("center","50px")}>TAM</th>
                <th style={th("left",  "110px")}>MARCA</th>
                <th style={th("left",  "100px")}>ORIGEM</th>
                <th style={th("center","55px")}>QTD</th>
                <th style={th("left",  "100px")}>DESTINO</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--surface2)18" }}>
                  <td title={row.produto} style={{ ...td, fontWeight: 600, maxWidth: "180px" }}>{row.produto}</td>
                  <td style={{ ...td, color: "var(--muted)" }}>{row.cor}</td>
                  <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{row.tamanho}</td>
                  <td style={{ ...td, maxWidth: "110px" }}>{row.marca}</td>
                  <td style={{ ...td }}>
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>
                      {row.loja_origem?.replace("FOCCA JEANS - ", "")}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "4px" }}>({row.saldo_origem})</span>
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: "var(--primary-light)", color: "var(--primary)" }}>
                      {row.qtd_sugerida_transferir}
                    </span>
                  </td>
                  <td style={{ ...td }}>
                    <span style={{ color: "var(--danger)", fontWeight: 600 }}>
                      {row.loja_destino?.replace("FOCCA JEANS - ", "")}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "4px" }}>({row.saldo_destino})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", color: "var(--muted)", fontSize: "12px" }}>
          {dados.length} sugestões · {Number(totalItens).toLocaleString("pt-BR")} peças a redistribuir
        </div>
      </div>
    </div>
  )
}

function th(align: "left"|"center"|"right", minWidth?: string) {
  return {
    padding: "9px 12px",
    textAlign: align as any,
    color: "var(--muted)" as const,
    fontWeight: 600 as const,
    fontSize: "10px" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px" as const,
    whiteSpace: "nowrap" as const,
    minWidth,
  }
}

const td = {
  padding: "8px 12px",
  overflow: "hidden" as const,
  textOverflow: "ellipsis" as const,
  whiteSpace: "nowrap" as const,
}
