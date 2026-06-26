"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function FiltrosSidebar({
  filtros,
  params,
}: {
  filtros: Record<string, string[]>
  params: Record<string, string>
}) {
  const router = useRouter()
  const [filtro, setFiltro] = useState(params)

  function aplicar(key: string, value: string) {
    const novo = { ...filtro, [key]: value }
    if (!value) delete novo[key]
    setFiltro(novo)
    const qs = new URLSearchParams(novo).toString()
    router.push(qs ? `/?${qs}` : "/")
  }

  const selectStyle = {
    width: "100%",
    padding: "8px 10px",
    background: "#0f1117",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text)",
    fontSize: "13px",
    cursor: "pointer",
  }

  return (
    <aside style={{
      width: "220px",
      minHeight: "100vh",
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      padding: "24px 16px",
      flexShrink: 0,
    }}>
      <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "20px", color: "var(--muted)" }}>
        FILTROS
      </div>

      {[
        { key: "sexo", label: "Sexo", opts: filtros.sexos },
        { key: "modelo", label: "Modelo", opts: filtros.modelos },
        { key: "marca", label: "Marca", opts: filtros.marcas },
        { key: "colecao", label: "Coleção", opts: filtros.colecoes },
        { key: "categoria", label: "Categoria", opts: filtros.categorias },
        { key: "status", label: "Status", opts: filtros.status },
      ].map(({ key, label, opts }) => (
        <div key={key} style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {label}
          </div>
          <select
            style={selectStyle}
            value={filtro[key] || ""}
            onChange={e => aplicar(key, e.target.value)}
          >
            <option value="">Todos</option>
            {opts?.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      ))}

      <button
        onClick={() => { setFiltro({}); router.push("/") }}
        style={{
          width: "100%",
          padding: "8px",
          marginTop: "8px",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          color: "var(--muted)",
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        Limpar filtros
      </button>
    </aside>
  )
}