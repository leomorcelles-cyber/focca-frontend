"use client"
// Export PDF via impressao nativa do navegador.
// O CSS @media print (em globals.css) cuida de esconder .no-print e evitar
// cortar blocos (.bloco-print { page-break-inside: avoid }).
// Vantagem: o navegador pagina respeitando o conteudo, texto vetorial, nunca
// corta um card/linha no meio.

/**
 * Abre a impressao do navegador (usuario escolhe "Salvar como PDF").
 * @param _elementId  mantido por compatibilidade de assinatura (nao usado)
 * @param titulo      define o titulo do documento (vira nome sugerido do arquivo)
 */
export async function exportarPDF(_elementId: string, titulo: string) {
  const tituloAntigo = document.title
  // o nome sugerido do PDF costuma ser o document.title
  document.title = `${titulo} - ${new Date().toLocaleDateString("pt-BR")}`
  window.print()
  // restaura apos um tempo (o print e sincrono, mas garantimos)
  setTimeout(() => { document.title = tituloAntigo }, 1000)
}
