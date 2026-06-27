"use client"
import { useState, useMemo } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const LOJAS = [
  { id: 1, nome: "P.Nereu" },
  { id: 3, nome: "Vidal" },
  { id: 4, nome: "Imbuiá" },
  { id: 5, nome: "Lontras" },
  { id: 6, nome: "Chapadão" },
  { id: 7, nome: "Hype" },
]

function Chip({ label, ativo, onClick, small }: { label: string, ativo: boolean, onClick: () => void, small?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? "3px 10px" : "5px 12px", borderRadius: "20px",
      fontSize: small ? "11px" : "12px", cursor: "pointer",
      fontWeight: ativo ? 600 : 400, border: "1px solid",
      background: ativo ? "var(--primary)" : "var(--surface2)",
      color: ativo ? "#fff" : "var(--text)",
      borderColor: ativo ? "var(--primary)" : "var(--border)",
      transition: "all 0.1s", whiteSpace: "nowrap" as const,
    }}>{label}</button>
  )
}

const lbl = { fontSize: "10px", color: "var(--muted)", fontWeight: 600 as const, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: "8px", display: "block" as const }
const inp = { padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "12px", marginBottom: "8px", background: "var(--surface2)", color: "var(--text)", outline: "none", width: "200px", display: "block" as const }

export default function TransferenciasPage() {
  const [marcaBusca, setMarcaBusca]   = useState("")
  const [modeloBusca, setModeloBusca] = useState("")
  const [lojasSel, setLojasSel]       = useState<number[]>([])
  const [dados, setDados]             = useState<any[]>([])
  const [loading, setLoading]         = useState(false)
  const [buscaFeita, setBuscaFeita]   = useState(false)
  const [filtrosAbertos, setFiltrosAbertos] = useState(true)

  async function buscar() {
    setDados([])
    setLoading(true)
    setBuscaFeita(true)
    const p = new URLSearchParams({ limite: "500" })
    if (marcaBusca.trim())  p.set("marca",  marcaBusca.trim())
    if (modeloBusca.trim()) p.set("modelo", modeloBusca.trim())
    try {
      const res = await fetch(`${API_URL}/transferencias?${p}`)
      let rows = await res.json()
      if (lojasSel.length > 0)
        rows = rows.filter((r: any) =>
          lojasSel.includes(r.empresa_origem) || lojasSel.includes(r.empresa_destino)
        )
      setDados(rows)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  function limpar() {
    setMarcaBusca(""); setModeloBusca(""); setLojasSel([])
    setDados([]); setBuscaFeita(false)
  }

  const totalItens = dados.reduce((acc, r) => acc + (r.qtd_sugerida_transferir || 0), 0)

  const th = (align: string, minWidth?: string) => ({
    padding: "9px 12px", textAlign: align as any,
    color: "var(--muted)" as const, fontWeight: 600 as const,
    fontSize: "10px" as const, textTransform: "uppercase" as const,
    letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const, minWidth,
  })

  const td = { padding: "8px 12px", overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const }

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Transferencias Sugeridas</h1>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>Lojas com excesso para lojas criticas do mesmo SKU</p>
      </div>

      {/* Filtros */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "16px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: filtrosAbertos ? "1px solid var(--border)" : "none", background: "var(--surface2)" }}>
          <button onClick={() => setFiltrosAbertos(!filtrosAbertos)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
            {filtrosAbertos ? "▲" : "▼"} Filtros
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            {buscaFeita && <button onClick={limpar} style={{ padding: "6px 12px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>✕ Limpar</button>}
            <button onClick={buscar} disabled={loading} style={{ padding: "8px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: loading ? "default" : "pointer", fontSize: "13px", fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Buscando..." : "🔍 Buscar"}
            </button>
          </div>
        </div>
        {filtrosAbertos && (
          <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            <div>
              <label style={lbl}>Marca</label>
              <input placeholder="Ex: ZIANN..." value={marcaBusca} onChange={e => setMarcaBusca(e.target.value)} onKeyDown={e => e.key === "Enter" && buscar()} style={inp} />
            </div>
            <div>
              <label style={lbl}>Modelo</label>
              <input placeholder="Ex: CALCA..." value={modeloBusca} onChange={e => setModeloBusca(e.target.value)} onKeyDown={e => e.key === "Enter" && buscar()} style={inp} />
            </div>
            <div>
              <label style={lbl}>Loja {lojasSel.length > 0 && <span style={{ color: "var(--primary)" }}>· {lojasSel.length} sel.</span>}</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {LOJAS.map(l => <Chip key={l.id} label={l.nome} ativo={lojasSel.includes(l.id)} onClick={() => setLojasSel(prev => prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev, l.id])} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      {dados.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: "10px", marginBottom: "16px" }}>
          {[
            { l: "Sugestoes",     v: dados.length,                               c: "var(--primary)" },
            { l: "Pecas a mover", v: Number(totalItens).toLocaleString("pt-BR"), c: "var(--success)" },
            { l: "Prod. unicos",  v: new Set(dados.map(d => d.cod_produto)).size },
            { l: "Marcas",        v: new Set(dados.map(d => d.marca)).size },
          ].map((k, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
              <div style={{ fontSize: "clamp(18px,2vw,26px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1 }}>{k.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      {!buscaFeita ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>⇄</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>Clique em Buscar para ver as sugestoes</div>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>Filtre por marca ou loja para resultados especificos</div>
        </div>
      ) : loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>Buscando...
        </div>
      ) : dados.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>Nenhuma sugestao encontrada.</div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "2px solid var(--border)" }}>
                  <th style={th("left", "180px")}>PRODUTO</th>
                  <th style={th("left", "90px")}>COR</th>
                  <th style={th("center", "50px")}>TAM</th>
                  <th style={th("left", "110px")}>MARCA</th>
                  <th style={th("left", "110px")}>ORIGEM</th>
                  <th style={th("center", "60px")}>QTD</th>
                  <th style={th("left", "110px")}>DESTINO</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--surface2)18" }}>
                    <td title={row.produto} style={{ ...td, fontWeight: 600, maxWidth: "180px" }}>{row.produto}</td>
                    <td style={{ ...td, color: "var(--muted)" }}>{row.cor}</td>
                    <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{row.tamanho}</td>
                    <td style={{ ...td, maxWidth: "110px" }}>{row.marca}</td>
                    <td style={td}>
                      <span style={{ color: "var(--success)", fontWeight: 600 }}>{row.loja_origem?.replace("FOCCA JEANS - ", "")}</span>
                      <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "4px" }}>({row.saldo_origem})</span>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: "var(--primary-light)", color: "var(--primary)" }}>
                        {row.qtd_sugerida_transferir}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ color: "var(--danger)", fontWeight: 600 }}>{row.loja_destino?.replace("FOCCA JEANS - ", "")}</span>
                      <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "4px" }}>({row.saldo_destino})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", color: "var(--muted)", fontSize: "12px" }}>
            {dados.length} sugestoes · {Number(totalItens).toLocaleString("pt-BR")} pecas a redistribuir
          </div>
        </div>
      )}
    </div>
  )
}
