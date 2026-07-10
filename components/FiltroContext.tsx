"use client"
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { supabase } from "@/lib/supabase"

// Tipo do estado de filtros — compartilhado por todas as paginas
export type FiltroState = {
  lojas: number[]
  sexos: string[]
  modelos: string[]
  produtos: string[]   // produtos (descricao_basica), multi-selecao
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

// Filtro salvo (vem do Supabase)
export type FiltroSalvo = {
  id: string
  nome: string
  filtros: FiltroState
  criado_em: string
}

type FiltroContextType = {
  filtros: FiltroState
  setFiltros: (f: FiltroState) => void
  versaoBusca: number
  dispararBusca: () => void
  // --- filtros salvos (Supabase, por usuario) ---
  filtrosSalvos: FiltroSalvo[]
  carregandoSalvos: boolean
  salvarFiltro: (nome: string) => Promise<{ ok: boolean; erro?: string }>
  aplicarFiltroSalvo: (id: string) => void
  deletarFiltroSalvo: (id: string) => Promise<void>
  recarregarSalvos: () => Promise<void>
}

const FiltroContext = createContext<FiltroContextType | null>(null)

export function FiltroProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltros] = useState<FiltroState>({ ...filtroVazio })
  const [versaoBusca, setVersaoBusca] = useState(0)
  const [filtrosSalvos, setFiltrosSalvos] = useState<FiltroSalvo[]>([])
  const [carregandoSalvos, setCarregandoSalvos] = useState(false)

  function dispararBusca() { setVersaoBusca(v => v + 1) }

  // Busca os filtros salvos do usuario logado
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

  // Carrega ao montar e sempre que o login muda
  useEffect(() => {
    recarregarSalvos()
    const { data: sub } = supabase.auth.onAuthStateChange(() => { recarregarSalvos() })
    return () => { sub.subscription.unsubscribe() }
  }, [recarregarSalvos])

  // Salva o filtro atual com um nome
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

  // Aplica um filtro salvo (restaura o estado e dispara a busca)
  function aplicarFiltroSalvo(id: string) {
    const salvo = filtrosSalvos.find(f => f.id === id)
    if (salvo) {
      setFiltros({ ...filtroVazio, ...salvo.filtros })
      setVersaoBusca(v => v + 1)
    }
  }

  // Apaga um filtro salvo
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
