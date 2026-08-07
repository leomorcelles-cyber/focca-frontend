"use client"

/**
 * Miniatura do produto ao lado do nome, nas tabelas.
 *
 * A URL vem do blob da Linx (produtos_imagens, sincronizada do LinxProdutosImagensURL),
 * entao o navegador busca a foto DIRETO de la — nada passa pela nossa API. O custo e do
 * cliente, e por isso as tres regras abaixo:
 *
 *   loading="lazy"  -> so busca o que entra na tela (essencial na matriz de Compras,
 *                      que tem milhares de SKUs)
 *   width/height    -> reserva o espaco antes de carregar, senao a tabela pula
 *   onError         -> some sozinha se o blob nao responder
 *
 * ~72% dos SKUs em estoque tem foto. Sem foto, ocupa o mesmo espaco vazio para as
 * linhas continuarem alinhadas — placeholder quebrado seria pior que nada.
 */
export default function MiniFoto({ url, tam = 28, alt = "" }: { url?: string | null, tam?: number, alt?: string }) {
  const base = {
    width: `${tam}px`, height: `${tam}px`, flexShrink: 0,
    borderRadius: "6px", border: "1px solid var(--border)",
    background: "var(--surface2)",
  } as const

  if (!url) return <span aria-hidden style={{ ...base, display: "inline-block" }} />

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={tam}
      height={tam}
      onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden" }}
      style={{ ...base, objectFit: "cover", display: "inline-block", verticalAlign: "middle" }}
    />
  )
}
