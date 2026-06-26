"use client"
import { useEffect, useState } from "react"

type Props = {
  value: string
  onChange: (colecao: string) => void
}

export default function FiltroColecao({ value, onChange }: Props) {
  const [dados, setDados] = useState<{ anos: string[], por_ano: Record<string, string[]> }>({ anos: [], por_ano: {} })
  const [ano, setAno] = useState("")
  const [estacao, setEstacao] = useState("")

  useEffect(() => {
    fetch("http://127.0.0.1:8000/filtros/colecoes-por-ano")
      .then(r => r.json())
      .then(setDados)
  }, [])

  const colecoesDoAno = ano ? (dados.por_ano[ano] || []) : []

  const colecoesFiltradas = estacao
    ? colecoesDoAno.filter(c => c.toUpperCase().includes(estacao.toUpperCase()))
    : colecoesDoAno

  const estacoesDoAno = ano ? [...new Set(
    colecoesDoAno.map(c => {
      const u = c.toUpperCase()
      if (u.includes("ALTO VERAO") || u.includes("ALTO VERÃO")) return "ALTO VERAO"
      if (u.includes("INVERNO")) return "INVERNO"
      if (u.includes("VERAO") || u.includes("VERÃO")) return "VERAO"
      return "OUTROS"
    })
  )] : []

  function handleAno(v: string) {
    setAno(v)
    setEstacao("")
    onChange("")
  }

  const label = {
    fontSize: "11px",
    color: "var(--muted)",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.4px",
    marginBottom: "4px",
    display: "block",
  }

  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", minWidth: "90px" }}>
        <label style={label}>Ano</label>
        <select value={ano} onChange={e => handleAno(e.target.value)}>
          <option value="">Todos</option>
          {dados.anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {ano && (
        <div style={{ display: "flex", flexDirection: "column", minWidth: "120px" }}>
          <label style={label}>Estação</label>
          <select value={estacao} onChange={e => { setEstacao(e.target.value); onChange("") }}>
            <option value="">Todas</option>
            {estacoesDoAno.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      )}

      {ano && (
        <div style={{ display: "flex", flexDirection: "column", minWidth: "200px" }}>
          <label style={label}>Coleção</label>
          <select value={value} onChange={e => onChange(e.target.value)}>
            <option value="">Todas do período</option>
            {colecoesFiltradas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}