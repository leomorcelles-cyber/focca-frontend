"use client"
import FiltroColecao from "@/components/FiltroColecao"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"

const LOJAS = [
  { id: 1, nome: "P. Nereu",  key: "pres_nereu" },
  { id: 2, nome: "Jaraguá",   key: "jaragua_sul" },
  { id: 3, nome: "Vidal",     key: "vidal_ramos" },
  { id: 4, nome: "Imbuiá",    key: "imbuia" },
  { id: 5, nome: "Lontras",   key: "lontras" },
  { id: 6, nome: "Chapadão",  key: "chapadao" },
  { id: 7, nome: "Hype",      key: "focca_hype" },
]

export default function EstoquePage() {
  const [dados, setDados] = useState<any[]>([])
  const [filtros, setFiltros] = useState<any>({})
  const [lojasSel, setLojasSel] = useState<number[]>([1,2,3,4,5,6,7])
  const [f, setF] = useState({ modelo: "", marca: "", sexo: "", zerados: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.filtros().then(setFiltros)
  }, [])

  useEffect(() => {
    setLoading(true)
    const p: Record<string, string> = { limite: "500" }
    if (f.modelo) p.modelo = f.modelo
    if (f.marca)  p.marca  = f.marca
    if (f.sexo)   p.sexo   = f.sexo
    if (f.zerados) p.zerados = "true"
    api.matriz(p).then(d => { setDados(d); setLoading(false) })
  }, [f])

  const lojasFiltradas = LOJAS.filter(l => lojasSel.includes(l.id))

  function toggleLoja(id: number) {
    setLojasSel(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function corCelula(val: number) {
    if (val === 0) return { background: "var(--danger-light)", color: "var(--danger)", fontWeight: 600 }
    if (val <= 2)  return { background: "var(--warning-light)", color: "var(--warning)", fontWeight: 500 }
    return {}
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--text)" }}>Estoque por Loja</h1>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
          Matriz de estoque — selecione as lojas para comparar
        </p>
      </div>

      {/* Seletor de lojas */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "16px", marginBottom: "16px",
      }}>
        <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" }}>
          Lojas visíveis
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {LOJAS.map(l => (
            <button key={l.id} onClick={() => toggleLoja(l.id)} style={{
              padding: "6px 14px", borderRadius: "20px", fontSize: "12px", cursor: "pointer",
              fontWeight: 500, border: "1px solid",
              background: lojasSel.includes(l.id) ? "var(--primary)" : "var(--surface2)",
              color: lojasSel.includes(l.id) ? "#fff" : "var(--muted)",
              borderColor: lojasSel.includes(l.id) ? "var(--primary)" : "var(--border)",
              transition: "all 0.15s",
            }}>
              {l.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          { key: "sexo",   label: "Sexo",   opts: filtros.sexos   || [] },
          { key: "modelo", label: "Modelo", opts: filtros.modelos || [] },
          { key: "marca",  label: "Marca",  opts: filtros.marcas  || [] },
        ].map(({ key, label, opts }) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "140px" }}>
            <label style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>
              {label}
            </label>
            <select value={(f as any)[key]} onChange={e => setF(prev => ({ ...prev, [key]: e.target.value }))}>
              <option value="">Todos</option>
              {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", justifyContent: "flex-end" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text)", cursor: "pointer" }}>
            <input type="checkbox" checked={f.zerados} onChange={e => setF(prev => ({ ...prev, zerados: e.target.checked }))} />
            Só com lojas zeradas
          </label>
        </div>
        <button onClick={() => setF({ modelo: "", marca: "", sexo: "", zerados: false })} style={{
          padding: "7px 14px", background: "none", border: "1px solid var(--border)",
          borderRadius: "8px", color: "var(--muted)", cursor: "pointer", fontSize: "12px", alignSelf: "flex-end",
        }}>
          Limpar
        </button>
      </div>

      {/* Tabela */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Carregando...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  {["Produto", "Cor", "Tam", "Modelo", "Marca", ...lojasFiltradas.map(l => l.nome), "Total"].map(h => (
                    <th key={h} style={{
                      padding: "10px 12px", textAlign: h === "Total" || lojasFiltradas.find(l => l.nome === h) ? "center" : "left",
                      color: "var(--muted)", fontWeight: 500, fontSize: "11px",
                      textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 500, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.produto}
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{row.cor}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{row.tamanho}</td>
                    <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{row.modelo}</td>
                    <td style={{ padding: "10px 12px" }}>{row.marca}</td>
                    {lojasFiltradas.map(l => {
                      const val = row[l.key] ?? 0
                      return (
                        <td key={l.id} style={{ padding: "8px 12px", textAlign: "center", ...corCelula(val) }}>
                          {val}
                        </td>
                      )
                    })}
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "var(--primary)" }}>
                      {row.total_rede}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", color: "var(--muted)", fontSize: "12px" }}>
          {dados.length} SKUs — <span style={{ color: "var(--danger)" }}>■</span> zerado &nbsp;
          <span style={{ color: "var(--warning)" }}>■</span> crítico (≤2)
        </div>
      </div>
    </div>
  )
}