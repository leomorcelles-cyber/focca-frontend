"use client"
import { useState, useMemo } from "react"

// Ordenacao client-side reaproveitavel para tabelas dinamicas.
// Clique no cabecalho: 1o clique ordena desc, 2o inverte para asc.
// Numeros comparam como numero; texto compara com locale pt-BR; vazios por ultimo.

export type SortDir = "asc" | "desc"
export type Accessors = Record<string, (row: any) => any>

export function useSort<T = any>(
  rows: T[],
  initialKey: string | null = null,
  initialDir: SortDir = "desc",
  accessors?: Accessors,
) {
  const [sortKey, setSortKey] = useState<string | null>(initialKey)
  const [sortDir, setSortDir] = useState<SortDir>(initialDir)

  function toggle(key: string) {
    if (key === sortKey) setSortDir(d => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("desc") }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const get = (accessors && accessors[sortKey]) || ((r: any) => r[sortKey])
    const arr = [...rows]
    arr.sort((a, b) => {
      const va = get(a), vb = get(b)
      const vazioA = va === null || va === undefined || va === ""
      const vazioB = vb === null || vb === undefined || vb === ""
      if (vazioA && vazioB) return 0
      if (vazioA) return 1            // vazios sempre no fim
      if (vazioB) return -1
      const na = typeof va === "number" ? va : Number(va)
      const nb = typeof vb === "number" ? vb : Number(vb)
      let cmp: number
      if (!isNaN(na) && !isNaN(nb) && String(va).trim() !== "" && String(vb).trim() !== "")
        cmp = na - nb
      else
        cmp = String(va).localeCompare(String(vb), "pt-BR")
      return sortDir === "asc" ? cmp : -cmp
    })
    return arr
  }, [rows, sortKey, sortDir, accessors])

  return { sorted, sortKey, sortDir, toggle }
}

// Seta indicadora para o cabecalho: mostra so na coluna ativa.
export function seta(ativa: boolean, dir: SortDir) {
  return ativa ? (dir === "asc" ? " ↑" : " ↓") : ""
}
