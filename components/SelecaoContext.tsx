"use client"
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"

// Um item do carrinho = um SKU (produto + cor + tamanho)
export type ItemSelecionado = {
  cod_produto: string | number
  produto: string
  cor: string
  tamanho: string
  modelo?: string
  marca?: string
  colecao?: string
  // saldo por loja no momento da selecao (snapshot p/ exibir rapido)
  lojas?: Record<string, number>
  totalRede?: number
}

// Chave unica do item
export function chaveItem(it: { cod_produto: string | number, cor: string, tamanho: string }) {
  return `${it.cod_produto}||${it.cor}||${it.tamanho}`
}

type SelecaoContextType = {
  itens: ItemSelecionado[]
  adicionar: (it: ItemSelecionado) => void
  adicionarVarios: (its: ItemSelecionado[]) => void
  remover: (chave: string) => void
  toggle: (it: ItemSelecionado) => void
  temItem: (chave: string) => boolean
  limpar: () => void
  total: number
  // O painel do carrinho vive no AppShell, mas quem abre pode ser a Sidebar (que
  // esta' em todas as telas) — por isso o estado de aberto/fechado mora aqui.
  painelAberto: boolean
  setPainelAberto: (v: boolean) => void
}

const SelecaoContext = createContext<SelecaoContextType | null>(null)

export function SelecaoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemSelecionado[]>([])
  const [painelAberto, setPainelAberto] = useState(false)

  const adicionar = useCallback((it: ItemSelecionado) => {
    setItens(prev => {
      const k = chaveItem(it)
      if (prev.some(p => chaveItem(p) === k)) return prev
      return [...prev, it]
    })
  }, [])

  // Adiciona MUITOS de uma vez (dedup por chave), num unico setState — para o
  // "Selecionar todos" da pagina de compras nao travar com milhares de SKUs.
  const adicionarVarios = useCallback((its: ItemSelecionado[]) => {
    setItens(prev => {
      const existentes = new Set(prev.map(p => chaveItem(p)))
      const novos: ItemSelecionado[] = []
      for (const it of its) {
        const k = chaveItem(it)
        if (existentes.has(k)) continue
        existentes.add(k); novos.push(it)
      }
      return novos.length ? [...prev, ...novos] : prev
    })
  }, [])

  const remover = useCallback((chave: string) => {
    setItens(prev => prev.filter(p => chaveItem(p) !== chave))
  }, [])

  const toggle = useCallback((it: ItemSelecionado) => {
    setItens(prev => {
      const k = chaveItem(it)
      if (prev.some(p => chaveItem(p) === k)) return prev.filter(p => chaveItem(p) !== k)
      return [...prev, it]
    })
  }, [])

  const temItem = useCallback((chave: string) => itens.some(p => chaveItem(p) === chave), [itens])
  const limpar = useCallback(() => setItens([]), [])

  // Esvaziou (pelo botao Limpar ou removendo um a um): o painel desmonta, mas o
  // estado ficaria "aberto" e ele reapareceria sozinho no proximo item marcado.
  useEffect(() => { if (itens.length === 0) setPainelAberto(false) }, [itens.length])

  return (
    <SelecaoContext.Provider value={{ itens, adicionar, adicionarVarios, remover, toggle, temItem, limpar, total: itens.length, painelAberto, setPainelAberto }}>
      {children}
    </SelecaoContext.Provider>
  )
}

export function useSelecao() {
  const ctx = useContext(SelecaoContext)
  if (!ctx) throw new Error("useSelecao precisa estar dentro de SelecaoProvider")
  return ctx
}
