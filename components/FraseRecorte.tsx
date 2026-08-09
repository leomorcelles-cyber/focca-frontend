"use client"
// A MESMA frase de recorte em todas as telas.
//
// O sistema tem TRES eixos de filtragem que sao independentes, e a barra de
// filtros os mostrava todos com o mesmo peso, como se fossem alternativas:
//
//   PERIODO   quando a venda aconteceu        (calendario)
//   UNIVERSO  quais produtos entram           (marca, modelo, colecao/ano, cor, sexo, saldo)
//   SELECAO   estes SKUs exatos               (carrinho)
//
// Dai a confusao de "escolhi a data no calendario mas filtrei o ano ali": ANO e o
// ano da COLECAO — atributo do produto, igual a marca — e nao briga com o
// calendario. A frase declara isso lendo em voz alta, e o mesmo texto nas quatro
// telas acaba com o "por que aqui da outro numero".
import { useFiltros, resolverColecoes } from "@/components/FiltroContext"
import { useSelecao } from "@/components/SelecaoContext"
import { LOJAS } from "@/components/FiltroGlobal"

const NOME_LOJA: Record<string, string> = {
  "1": "P.Nereu", "2": "CD", "3": "Vidal", "4": "Imbuiá",
  "5": "Lontras", "6": "Chapadão", "7": "Hype",
}

function lista(vs: (string | number)[], mapa?: Record<string, string>) {
  const n = vs.map(v => (mapa ? mapa[String(v)] || String(v) : String(v)))
  if (n.length === 1) return n[0]
  if (n.length === 2) return `${n[0]} e ${n[1]}`
  if (n.length <= 4) return n.slice(0, -1).join(", ") + " e " + n[n.length - 1]
  return `${n.length} selecionados`
}

export default function FraseRecorte({ compacta = false }: { compacta?: boolean }) {
  const { filtros, periodo } = useFiltros()
  const { itens, transferencias } = useSelecao()

  const quando = periodo.tipo === "custom" && periodo.inicio && periodo.fim
    ? `${periodo.inicio.split("-").reverse().join("/")} a ${periodo.fim.split("-").reverse().join("/")}`
    : `os últimos ${periodo.dias} dias`

  // UNIVERSO: os atributos do produto. Ordem de como se pensa, nao alfabetica.
  const univ: string[] = []
  if (filtros.marcas.length)   univ.push(`da marca ${lista(filtros.marcas)}`)
  if (filtros.modelos.length)  univ.push(`do modelo ${lista(filtros.modelos)}`)
  if (filtros.produtos.length) univ.push(`chamados ${lista(filtros.produtos)}`)
  // "coleção" e nao "ano": e o ano da COLECAO, nao o da venda — a origem da confusao
  if (filtros.colecoes.length)      univ.push(`da coleção ${lista(filtros.colecoes)}`)
  else if (filtros.anos.length)     univ.push(`de coleções de ${lista(filtros.anos)}`)
  if (filtros.estacoes.length) univ.push(`de ${lista(filtros.estacoes)}`)
  if (filtros.sexos.length)    univ.push(`do sexo ${lista(filtros.sexos)}`)
  if (filtros.cores.length)    univ.push(`na cor ${lista(filtros.cores)}`)
  if (filtros.ids.trim())      univ.push(`de IDs ${filtros.ids.trim()}`)

  const todasLojas = filtros.lojas.length === LOJAS.length
  const onde = filtros.lojas.length && !todasLojas
    ? `em ${lista(filtros.lojas, NOME_LOJA)}` : ""

  // saldo_max e' filtro de ESTOQUE, nao de venda — por isso sai numa oracao propria
  const saldo = filtros.saldoMax !== null
    ? (filtros.saldoMax === 0 ? "apenas os zerados na rede" : `com no máximo ${filtros.saldoMax} em estoque na rede`)
    : ""

  const nSel = new Set(itens.map(i => String(i.cod_produto))).size

  const cor = {
    per: "var(--primary)", uni: "var(--text)", sel: "var(--success)",
  }
  const forte = (t: string, c: string) => <strong style={{ color: c }}>{t}</strong>

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderLeft: `3px solid ${nSel ? "var(--success)" : "var(--primary)"}`,
      borderRadius: "8px", padding: compacta ? "8px 12px" : "10px 14px",
      marginBottom: "12px", fontSize: compacta ? "12px" : "13px",
      color: "var(--muted)", lineHeight: 1.6,
    }}>
      Vendas de {forte(quando, cor.per)}
      {univ.length > 0 || onde || saldo ? ", de produtos " : ""}
      {univ.length > 0 && forte(univ.join(", "), cor.uni)}
      {onde && <> {forte(onde, cor.uni)}</>}
      {saldo && <>{univ.length || onde ? ", " : ""}{forte(saldo, cor.uni)}</>}
      {univ.length === 0 && !onde && !saldo && <> — <em>sem filtro de produto, a rede inteira</em></>}
      {nSel > 0 && <> — focado em {forte(`${nSel.toLocaleString("pt-BR")} SKUs marcados`, cor.sel)}</>}
      {transferencias.length > 0 && <> e {forte(`${transferencias.length} transferências`, cor.sel)}</>}
      {"."}
      {nSel > 0 && (
        <div style={{ fontSize: "11px", marginTop: "4px", opacity: 0.85 }}>
          A seleção substitui o filtro de produto; os demais continuam valendo.
        </div>
      )}
    </div>
  )
}
