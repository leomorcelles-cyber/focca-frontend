"use client"
// Helper de exportacao PDF via "print" client-side com CORTE INTELIGENTE.
// Em vez de fatiar a imagem em faixas fixas (que corta cards/linhas no meio),
// mede os elementos-bloco marcados com [data-bloco] e quebra a pagina apenas
// nos limites entre blocos que ainda cabem. Fallback: se nao houver blocos
// marcados, usa fatiamento simples.
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

export async function exportarPDF(elementId: string, titulo: string) {
  const el = document.getElementById(elementId)
  if (!el) {
    console.error(`exportarPDF: elemento #${elementId} nao encontrado`)
    return
  }

  // esconde elementos marcados (filtro global, menu de export, etc.)
  const escondidos = Array.from(el.querySelectorAll<HTMLElement>("[data-no-export], .no-print"))
  const displayAntigo = escondidos.map(e => e.style.display)
  escondidos.forEach(e => { e.style.display = "none" })

  // mede os limites verticais dos blocos ANTES de rasterizar (em px do DOM)
  const elTop = el.getBoundingClientRect().top
  // usa [data-bloco] se houver; senao, cai para os filhos diretos + netos + linhas
  // de tabela como pontos de corte (mais granularidade = menos cortes no meio)
  let blocos = Array.from(el.querySelectorAll<HTMLElement>("[data-bloco]"))
  if (blocos.length === 0) {
    blocos = []
    ;(Array.from(el.children) as HTMLElement[]).forEach(f => {
      blocos.push(f)
      Array.from(f.children).forEach(neto => blocos.push(neto as HTMLElement))
      f.querySelectorAll("tr").forEach(tr => blocos.push(tr as HTMLElement))
    })
  }
  // cada limite = posicao Y (relativa ao topo de el) onde um bloco TERMINA
  const limitesDOM: number[] = blocos.map(b => {
    const r = b.getBoundingClientRect()
    return r.bottom - elTop
  }).sort((a, b) => a - b)

  let canvas: HTMLCanvasElement
  const scale = 2
  try {
    canvas = await html2canvas(el, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    })
  } finally {
    escondidos.forEach((e, i) => { e.style.display = displayAntigo[i] })
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 8
  const usableW = pageW - margin * 2

  // cabecalho
  const dataStr = new Date().toLocaleDateString("pt-BR")
  function cabecalho() {
    pdf.setFontSize(12); pdf.setTextColor(0); pdf.text(titulo, margin, margin + 2)
    pdf.setFontSize(8); pdf.setTextColor(120)
    pdf.text(dataStr, pageW - margin, margin + 2, { align: "right" })
    pdf.setTextColor(0)
  }
  const topo = margin + 6
  const alturaConteudoMM = pageH - topo - margin

  // converte mm de altura util -> px do canvas
  const pxPorMM = canvas.width / usableW
  const pageContentPx = alturaConteudoMM * pxPorMM

  // limites em px do canvas (DOM px * scale)
  const limitesPx = limitesDOM.map(y => y * scale).filter(y => y > 0 && y < canvas.height)

  // funcao: dado um inicio (px), acha o melhor ponto de corte <= inicio+pageContentPx
  function proximoCorte(inicio: number): number {
    const maxFim = inicio + pageContentPx
    // maior limite de bloco que caiba dentro da pagina
    let corte = -1
    for (const lim of limitesPx) {
      if (lim > inicio && lim <= maxFim) corte = lim
    }
    // se nenhum bloco cabe (bloco maior que a pagina) ou sem blocos, corta no maximo
    if (corte === -1) corte = Math.min(maxFim, canvas.height)
    return corte
  }

  let y = 0
  let primeira = true
  while (y < canvas.height) {
    const fim = proximoCorte(y)
    const faixaAltura = Math.max(1, fim - y)

    const c2 = document.createElement("canvas")
    c2.width = canvas.width
    c2.height = faixaAltura
    const ctx = c2.getContext("2d")!
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, c2.width, c2.height)
    ctx.drawImage(canvas, 0, y, canvas.width, faixaAltura, 0, 0, canvas.width, faixaAltura)

    const faixaH = (faixaAltura * usableW) / canvas.width
    if (!primeira) pdf.addPage()
    cabecalho()
    pdf.addImage(c2.toDataURL("image/png"), "PNG", margin, topo, usableW, faixaH)

    y = fim
    primeira = false
    if (faixaAltura <= 1) break // seguranca contra loop
  }

  pdf.save(`${titulo.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
