"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export type FiltroState = {
  lojas: number[]
  sexos: string[]
  modelos: string[]
  marcas: string[]
  colecoes: string[]
  anos: string[]
  estacoes: string[]
  saldoMax: number  // 0 = zerado, 2 = crítico, 5 = baixo, 999 = todos
}

export type FiltroSalvo = {
  id: string
  nome: string
  filtros: FiltroState
  criadoEm: string
}

const FILTRO_VAZIO: FiltroState = {
  lojas: [], sexos: [], modelos: [], marcas: [],
  colecoes: [], anos: [], estacoes: [], saldoMax: 999
}

type FiltroContextType = {
  filtros: FiltroState
  setFiltros: (f: FiltroState) => void
  updateFiltro: (key: keyof FiltroState, value: any) => void
  limpar: () => void
  temFiltro: boolean
  totalAtivos: number
  filtrosSalvos: FiltroSalvo[]
  salvarFiltro: (nome: string) => void
  aplicarFiltroSalvo: (id: string) => void
  deletarFiltroSalvo: (id: string) => void
}

const FiltroContext = createContext<FiltroContextType | null>(null)

export function FiltroProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltrosState] = useState<FiltroState>(FILTRO_VAZIO)
  const [filtrosSalvos, setFiltrosSalvos] = useState<FiltroSalvo[]>([])

  useEffect(() => {
    try {
      const salvo = localStorage.getItem("focca_filtros_salvos")
      if (salvo) setFiltrosSalvos(JSON.parse(salvo))
    } catch {}
  }, [])

  function setFiltros(f: FiltroState) { setFiltrosState(f) }
  function updateFiltro(key: keyof FiltroState, value: any) {
    setFiltrosState(prev => ({ ...prev, [key]: value }))
  }
  function limpar() { setFiltrosState(FILTRO_VAZIO) }

  function salvarFiltro(nome: string) {
    const novo: FiltroSalvo = {
      id: Date.now().toString(), nome,
      filtros: { ...filtros },
      criadoEm: new Date().toLocaleDateString("pt-BR"),
    }
    const novos = [...filtrosSalvos, novo]
    setFiltrosSalvos(novos)
    localStorage.setItem("focca_filtros_salvos", JSON.stringify(novos))
  }

  function aplicarFiltroSalvo(id: string) {
    const salvo = filtrosSalvos.find(f => f.id === id)
    if (salvo) setFiltrosState({ ...FILTRO_VAZIO, ...salvo.filtros })
  }

  function deletarFiltroSalvo(id: string) {
    const novos = filtrosSalvos.filter(f => f.id !== id)
    setFiltrosSalvos(novos)
    localStorage.setItem("focca_filtros_salvos", JSON.stringify(novos))
  }

  const totalAtivos =
    filtros.lojas.length + filtros.sexos.length +
    filtros.modelos.length + filtros.marcas.length +
    filtros.anos.length + filtros.estacoes.length +
    filtros.colecoes.length +
    (filtros.saldoMax < 999 ? 1 : 0)

  const temFiltro = totalAtivos > 0

  return (
    <FiltroContext.Provider value={{
      filtros, setFiltros, updateFiltro, limpar, temFiltro, totalAtivos,
      filtrosSalvos, salvarFiltro, aplicarFiltroSalvo, deletarFiltroSalvo,
    }}>
      {children}
    </FiltroContext.Provider>
  )
}

export function useFiltro() {
  const ctx = useContext(FiltroContext)
  if (!ctx) throw new Error("useFiltro precisa estar dentro de FiltroProvider")
  return ctx
}
