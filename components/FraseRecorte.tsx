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
import { useEffect, useState } from "react"
import { useFiltros } from "@/components/FiltroContext"
import { useSelecao } from "@/components/SelecaoContext"
import { LOJAS } from "@/components/FiltroGlobal"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

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

type Props = {
  compacta?: boolean
  // Quando a tela ja buscou e nao veio nada, passe os numeros: a frase diz QUAL
  // eixo esvaziou. Um zero mudo faz a pessoa desconfiar do dado; o dado quase
  // sempre esta certo e o recorte e' que nao existe.
  vazio?: { pecas: number, skusRecorte?: number | null, buscaFeita: boolean }
}

export default function FraseRecorte({ compacta = false, vazio }: Props) {
  const { filtros, periodo } = useFiltros()
  const { itens, transferencias } = useSelecao()

  // COLECOES SEM ANO NO NOME ("GERAL", "FOREVER", "HOUSE OF YORE"): o ANO e'
  // deduzido do NOME da colecao, entao essas ficam de fora sempre que o filtro de
  // ano esta ativo. E coerente, mas explica somas que nao fecham com o total — e
  // ninguem tinha como saber, porque elas simplesmente sumiam.
  const [semAno, setSemAno] = useState<string[]>([])
  useEffect(() => {
    if (!filtros.anos.length) { setSemAno([]); return }
    let vivo = true
    Promise.all([
      fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()),
      fetch(`${API_URL}/filtros`).then(r => r.json()),
    ]).then(([pa, f]) => {
      if (!vivo) return
      const comAno = new Set(Object.values(pa.por_ano || {}).flat() as string[])
      setSemAno(((f.colecoes || []) as string[]).filter(c => c && !comAno.has(c)))
    }).catch(() => {})
    return () => { vivo = false }
  }, [filtros.anos.join(",")])

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

      {/* Coleções que o filtro de ano deixa de fora, por não terem ano no nome. */}
      {semAno.length > 0 && (
        <div style={{ fontSize: "11px", marginTop: "6px", color: "var(--warning, #856404)" }}>
          ⓘ {semAno.length} coleç{semAno.length === 1 ? "ão fica" : "ões ficam"} de fora por não ter
          {semAno.length === 1 ? "" : "em"} ano no nome
          {" "}({semAno.slice(0, 4).join(", ")}{semAno.length > 4 ? ` e mais ${semAno.length - 4}` : ""}).
          {" "}Por isso a soma pode não fechar com o total sem filtro de ano.
        </div>
      )}

      {/* DIAGNOSTICO DO VAZIO — qual eixo esvaziou. */}
      {vazio?.buscaFeita && vazio.pecas === 0 && (() => {
        const universoVazio = vazio.skusRecorte === 0
        const janelaCurta = periodo.tipo === "dias" && periodo.dias <= 30
        let causa: string
        if (nSel > 0 && universoVazio)
          causa = `os ${nSel.toLocaleString("pt-BR")} SKUs marcados não passam pelos filtros de produto acima — o cruzamento não sobrou nenhum. Não quer dizer que não venderam.`
        else if (universoVazio)
          causa = "nenhum produto casa com esses filtros combinados. Afrouxe um deles."
        else if (nSel > 0)
          causa = `os ${nSel.toLocaleString("pt-BR")} SKUs marcados existem, mas não venderam ${quando}. Pode ser estoque parado.`
        else if (janelaCurta)
          causa = `esses produtos existem, mas não venderam ${quando}. Tente uma janela maior no calendário.`
        else
          causa = `esses produtos existem, mas não tiveram venda ${quando}.`
        return (
          <div style={{
            marginTop: "8px", padding: "8px 10px", borderRadius: "6px",
            background: "var(--warning-light, #fff3cd)", color: "var(--warning, #856404)",
            fontSize: "12px",
          }}>
            <strong>Nada neste recorte</strong> — {causa}
          </div>
        )
      })()}
    </div>
  )
}
