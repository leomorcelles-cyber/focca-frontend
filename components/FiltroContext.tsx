"use client"
import { createContext, useContext, useState, ReactNode } from "react"

// Tipo do estado de filtros — compartilhado por todas as páginas
export type FiltroState = {
  lojas: number[]
  sexos: string[]
  modelos: string[]
  produtos: string[]   // NOVO: produtos (descricao_basica), multi-selecao
  marcas: string[]
  anos: string[]
  estacoes: string[]
  colecoes: string[]
  cores: string[]
  ids: string
  saldoMax: number | null
}

export const filtroVazio: FiltroState = {
  lojas: [], sexos: [], modelos: [], produtos: [], marcas: [],
  anos: [], estacoes: [], colecoes: [], cores: [], ids: "", saldoMax: null,
}

type FiltroContextType = {
  filtros: FiltroState
  setFiltros: (f: FiltroState) => void
  versaoBusca: number
  dispararBusca: () => void
}

const FiltroContext = createContext<FiltroContextType | null>(null)

export function FiltroProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltros] = useState<FiltroState>({ ...filtroVazio })
  const [versaoBusca, setVersaoBusca] = useState(0)

  function dispararBusca() { setVersaoBusca(v => v + 1) }

  return (
    <FiltroContext.Provider value={{ filtros, setFiltros, versaoBusca, dispararBusca }}>
      {children}
    </FiltroContext.Provider>
  )
}

export function useFiltros() {
  const ctx = useContext(FiltroContext)
  if (!ctx) throw new Error("useFiltros precisa estar dentro de FiltroProvider")
  return ctx
}

export function resolverColecoes(filtros: FiltroState, opPorAno: Record<string,string[]>): string[] {
  if (filtros.colecoes.length > 0) return filtros.colecoes
  if (!filtros.anos.length) return []
  const cols = filtros.anos.flatMap(a => opPorAno[a] || [])
  if (!filtros.estacoes.length) return cols
  return cols.filter(c => filtros.estacoes.some(e => c.toUpperCase().includes(e.toUpperCase())))
}
