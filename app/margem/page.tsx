"use client"
import { useEffect, useState, useMemo } from "react"
import { api } from "@/lib/api"
import { useFiltro } from "@/lib/FiltroContext"
import FiltroGlobal from "@/components/FiltroGlobal"

export default function MargemPage() {
  const { filtros } = useFiltro()
  const [dados, setDados] = useState<any[]>([])
  const [modelos, setModelos] = useState<string[]>([])
  const [marcas, setMarcas] = useState<string[]>([])
  const [porAno, setPorAno] = useState<Record<string, string[]>>({})
  const [anos, setAnos] = useState<string[]>([])
  const [opcoesProntas, setOpcoesProntas] = useState(false)
  const [ordem, setOrdem] = useState("lucro")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.filtros(),
      fetch("http://127.0.0.1:8000/filtros/colecoes-por-ano").then(r => r.json()),
    ]).then(([f, c]) => {
      setModelos(f.modelos || [])
      setMarcas(f.marcas || [])
      setPorAno(c.por_ano || {})
      setAnos(c.anos || [])
      setOpcoesProntas(true)
    })
  }, [])

  const temFiltro = useMemo(() =>
    filtros.lojas.length > 0 || filtros.sexos.length > 0 ||
    filtros.modelos.length > 0 || filtros.marcas.length > 0 ||
    filtros.anos.length > 0 || filtros.colecoes.length > 0 || filtros.estacoes.length > 0
  , [filtros])

  const colecoesAlvo = useMemo(() => {
    if (filtros.colecoes.length > 0) return filtros.colecoes
    if (!porAno || filtros.anos.length === 0) return []
    const doAno = filtros.anos.flatMap((a: string) => porAno[a] || [])
    if (filtros.estacoes.length === 0) return doAno
    return doAno.filter((c: string) =>
      filtros.estacoes.some((e: string) => c.toUpperCase().includes(e.toUpperCase()))
    )
  }, [filtros.colecoes, filtros.anos, filtros.estacoes, porAno])

  useEffect(() => {
    if (!opcoesProntas) return
    setLoading(true)
    const p: Record<string, string> = { limite: "300", ordem }
    if (filtros.modelos.length === 1) p.modelo = filtros.modelos[0]
    if (filtros.marcas.length === 1)  p.marca  = filtros.marcas[0]
    if (filtros.sexos.length === 1)   p.sexo   = filtros.sexos[0]
    api.margem(p).then(d => {
      let f = d
      if (filtros.sexos.length > 1)   f = f.filter((r: any) => filtros.sexos.some(s => r.sexo?.includes(s)))
      if (filtros.modelos.length > 1) f = f.filter((r: any) => filtros.modelos.some(m => r.modelo?.includes(m)))
      if (filtros.marcas.length > 1)  f = f.filter((r: any) => filtros.marcas.includes(r.marca))
      if (colecoesAlvo.length > 0)    f = f.filter((r: any) => colecoesAlvo.includes(r.colecao))
      if ((filtros.saldoMax ?? 999) < 999) f = f.filter((r: any) => Math.max(0, r.saldo_atual ?? 0) <= filtros.saldoMax)
      setDados(f)
      setLoading(false)
    })
  }, [filtros, colecoesAlvo, opcoesProntas, ordem])

  const totalLucro  = dados.reduce((acc, r) => acc + (r.lucro_potencial || 0), 0)
  const totalVenda  = dados.reduce((acc, r) => acc + (r.valor_venda_potencial || 0), 0)
  const margemMedia = dados.filter(r => r.margem_bruta_pct).length > 0
    ? dados.reduce((acc, r) => acc + (r.margem_bruta_pct || 0), 0) / dados.filter(r => r.margem_bruta_pct).length : 0

  const fmtR = (n: number) => `R$ ${n?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}`

  function corMargem(m: number) {
    if (m >= 60) return { cor: "var(--success)", bg: "var(--success-light)" }
    if (m >= 45) return { cor: "var(--warning)", bg: "var(--warning-light)" }
    return { cor: "var(--danger)", bg: "var(--danger-light)" }
  }

  const th = { padding: "9px 12px", color: "var(--muted)" as const, fontWeight: 600 as const, fontSize: "10px" as const, textTransform: "uppercase" as const, letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const }
  const td = { padding: "9px 12px", overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Margem e Rentabilidade</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>Ranking por margem bruta, markup e lucro potencial</p>
        </div>
        <select value={ordem} onChange={e => setOrdem(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "13px" }}>
          <option value="lucro">Por lucro potencial</option>
          <option value="margem">Por margem %</option>
          <option value="markup">Por markup</option>
        </select>
      </div>

      <FiltroGlobal opcoes={{ modelos, marcas, porAno, anos }} />

      {dados.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: "10px", marginBottom: "16px" }}>
          {[
            { l: "Lucro potencial", v: fmtR(totalLucro),             c: "var(--success)" },
            { l: "Valor a vender",  v: fmtR(totalVenda),             c: "var(--primary)" },
            { l: "Margem média",    v: `${margemMedia.toFixed(1)}%`, c: "var(--warning)" },
            { l: "SKUs",            v: dados.length.toLocaleString("pt-BR") },
          ].map((k, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
              <div style={{ fontSize: "clamp(16px,2vw,22px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1.2 }}>{k.v}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Carregando...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "2px solid var(--border)" }}>
                  {["Produto","Cor","Tam","Marca","Coleção","Sexo","Saldo","Preço","Custo","Margem","Markup","Lucro"].map(h => (
                    <th key={h} style={{ ...th, textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.map((row, i) => {
                  const mc = corMargem(row.margem_bruta_pct || 0)
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--surface2)18" }}>
                      <td title={row.nome} style={{ ...td, fontWeight: 600, maxWidth: "160px" }}>{row.nome || row.descricao_basica}</td>
                      <td style={{ ...td, color: "var(--muted)" }}>{row.cor}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{row.tamanho}</td>
                      <td style={td}>{row.marca}</td>
                      <td title={row.colecao} style={{ ...td, color: "var(--muted)", fontSize: "11px", maxWidth: "120px" }}>{row.colecao}</td>
                      <td style={{ ...td, color: "var(--muted)" }}>{row.sexo}</td>
                      <td style={{ ...td, textAlign: "center", fontWeight: 600 }}>{row.saldo_atual}</td>
                      <td style={{ ...td, textAlign: "right" }}>{fmtR(row.preco_venda)}</td>
                      <td style={{ ...td, textAlign: "right", color: "var(--muted)" }}>{fmtR(row.preco_custo)}</td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: mc.cor, background: mc.bg }}>
                          {row.margem_bruta_pct?.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: "center", color: "var(--muted)" }}>{row.markup?.toFixed(2)}x</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "var(--success)" }}>{fmtR(row.lucro_potencial)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", color: "var(--muted)", fontSize: "12px" }}>{dados.length} produtos</div>
      </div>
    </div>
  )
}
