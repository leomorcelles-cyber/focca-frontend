"use client"
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { supabase } from "@/lib/supabase"

// Tipo do estado de filtros — compartilhado por todas as paginas
export type FiltroState = {
  lojas: number[]
  sexos: string[]
  modelos: string[]
  produtos: string[]
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

export type FiltroSalvo = {
  id: string
  nome: string
  filtros: FiltroState
  criado_em: string
}

const LS_KEY = "focca_filtro_atual"  // chave da persistencia F5

function lerFiltroSalvoLocal(): FiltroState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw)
    return { ...filtroVazio, ...obj }
  } catch {
    return null
  }
}

type FiltroContextType = {
  filtros: FiltroState
  setFiltros: (f: FiltroState) => void
  versaoBusca: number
  dispararBusca: () => void
  filtrosSalvos: FiltroSalvo[]
  carregandoSalvos: boolean
  salvarFiltro: (nome: string) => Promise<{ ok: boolean; erro?: string }>
  aplicarFiltroSalvo: (id: string) => void
  deletarFiltroSalvo: (id: string) => Promise<void>
  recarregarSalvos: () => Promise<void>
}

const FiltroContext = createContext<FiltroContextType | null>(null)

export function FiltroProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltrosState] = useState<FiltroState>({ ...filtroVazio })
  const [versaoBusca, setVersaoBusca] = useState(0)
  const [filtrosSalvos, setFiltrosSalvos] = useState<FiltroSalvo[]>([])
  const [carregandoSalvos, setCarregandoSalvos] = useState(false)

  // --- PERSISTENCIA F5: restaura o filtro do localStorage ao montar ---
  useEffect(() => {
    const salvo = lerFiltroSalvoLocal()
    if (salvo) setFiltrosState(salvo)
  }, [])

  // setFiltros que tambem persiste no localStorage
  const setFiltros = useCallback((f: FiltroState) => {
    setFiltrosState(f)
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(LS_KEY, JSON.stringify(f)) } catch {}
    }
  }, [])

  function dispararBusca() { setVersaoBusca(v => v + 1) }

  const recarregarSalvos = useCallback(async () => {
    setCarregandoSalvos(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setFiltrosSalvos([]); return }
      const { data, error } = await supabase
        .from("filtros_salvos")
        .select("id, nome, filtros, criado_em")
        .order("criado_em", { ascending: false })
      if (error) { console.error("Erro ao carregar filtros salvos:", error.message); return }
      setFiltrosSalvos((data || []) as FiltroSalvo[])
    } catch (e) {
      console.error("Erro ao carregar filtros salvos:", e)
    } finally {
      setCarregandoSalvos(false)
    }
  }, [])

  useEffect(() => {
    recarregarSalvos()
    const { data: sub } = supabase.auth.onAuthStateChange(() => { recarregarSalvos() })
    return () => { sub.subscription.unsubscribe() }
  }, [recarregarSalvos])

  async function salvarFiltro(nome: string): Promise<{ ok: boolean; erro?: string }> {
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) return { ok: false, erro: "Dê um nome ao filtro." }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { ok: false, erro: "Você precisa estar logado." }
      const { error } = await supabase
        .from("filtros_salvos")
        .insert({ user_id: user.id, nome: nomeLimpo, filtros })
      if (error) {
        if (error.code === "23505") return { ok: false, erro: "Já existe um filtro com esse nome." }
        return { ok: false, erro: error.message }
      }
      await recarregarSalvos()
      return { ok: true }
    } catch (e: any) {
      return { ok: false, erro: e?.message || "Erro ao salvar." }
    }
  }

  function aplicarFiltroSalvo(id: string) {
    const salvo = filtrosSalvos.find(f => f.id === id)
    if (salvo) {
      setFiltros({ ...filtroVazio, ...salvo.filtros })
      setVersaoBusca(v => v + 1)
    }
  }

  async function deletarFiltroSalvo(id: string) {
    try {
      const { error } = await supabase.from("filtros_salvos").delete().eq("id", id)
      if (error) { console.error("Erro ao deletar filtro:", error.message); return }
      setFiltrosSalvos(prev => prev.filter(f => f.id !== id))
    } catch (e) {
      console.error("Erro ao deletar filtro:", e)
    }
  }

  return (
    <FiltroContext.Provider value={{
      filtros, setFiltros, versaoBusca, dispararBusca,
      filtrosSalvos, carregandoSalvos, salvarFiltro, aplicarFiltroSalvo,
      deletarFiltroSalvo, recarregarSalvos,
    }}>
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
