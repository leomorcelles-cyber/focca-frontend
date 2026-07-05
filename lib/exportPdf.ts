"use client"
// Helper de exportacao PDF via "print" da tela (client-side).
// Fotografa um elemento e gera PDF paginado. Antes de fotografar, esconde
// temporariamente qualquer elemento com o atributo [data-no-export]
// (ex: o filtro global), para o print sair so com o conteudo.
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

export async function exportarPDF(elementId: string, titulo: string) {
  const el = document.getElementById(elementId)
  if (!el) {
    console.error(`exportarPDF: elemento #${elementId} nao encontrado`)
    return
  }

  // esconde elementos marcados com data-no-export (dentro da area)
  const escondidos: HTMLElement[] = Array.from(
    el.querySelectorAll<HTMLElement>("[data-no-export]")
  )
  const displayAntigo = escondidos.map(e => e.style.display)
  escondidos.forEach(e => { e.style.display = "none" })

  let canvas: HTMLCanvasElement
  try {
    canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    })
  } finally {
    // restaura os elementos escondidos, aconteca o que acontecer
    escondidos.forEach((e, i) => { e.style.display = displayAntigo[i] })
  }

  const imgData = canvas.toDataURL("image/png")
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 8
  const usableW = pageW - margin * 2
  const imgH = (canvas.height * usableW) / canvas.width

  const dataStr = new Date().toLocaleDateString("pt-BR")
  pdf.setFontSize(12); pdf.text(titulo, margin, margin + 2)
  pdf.setFontSize(8); pdf.setTextColor(120)
  pdf.text(dataStr, pageW - margin, margin + 2, { align: "right" })
  pdf.setTextColor(0)
  const topo = margin + 6

  if (imgH <= pageH - topo - margin) {
    pdf.addImage(imgData, "PNG", margin, topo, usableW, imgH)
  } else {
    const pageContentH = pageH - topo - margin
    const faixaPx = (pageContentH * canvas.width) / usableW
    let y = 0, primeira = true
    while (y < canvas.height) {
      const faixaAltura = Math.min(faixaPx, canvas.height - y)
      const c2 = document.createElement("canvas")
      c2.width = canvas.width
      c2.height = faixaAltura
      const ctx = c2.getContext("2d")!
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, c2.width, c2.height)
      ctx.drawImage(canvas, 0, y, canvas.width, faixaAltura, 0, 0, canvas.width, faixaAltura)
      const faixaH = (faixaAltura * usableW) / canvas.width
      if (!primeira) pdf.addPage()
      pdf.addImage(c2.toDataURL("image/png"), "PNG", margin, primeira ? topo : margin, usableW, faixaH)
      y += faixaAltura
      primeira = false
    }
  }

  pdf.save(`${titulo.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
