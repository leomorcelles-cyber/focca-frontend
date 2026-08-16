"use client"
import { useState, useMemo, useRef, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import MiniFoto from "@/components/MiniFoto"
import Cor from "@/components/Cor"
import FiltroGlobal, { LOJAS } from "@/components/FiltroGlobal"
import { useFiltros, resolverColecoes } from "@/components/FiltroContext"
import BotoesExport from "@/components/BotoesExport"
import { useSort, seta } from "@/lib/useSort"
import { useSelecao, chaveTransf } from "@/components/SelecaoContext"
import FraseRecorte from "@/components/FraseRecorte"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const n0 = (v: any) => Math.round(Number(v) || 0)
const n2 = (v: any) => (Number(v) || 0).toFixed(2)
const brl = (v: any) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
const limpaNome = (s: string) => s?.replace("FOCCA JEANS - ", "").replace("FOCCA ", "") || ""

// Giro legivel: rapido em "/dia", lento como intervalo medio ("1 a cada 17d").
const cadencia = (giroDia: any) => {
  const g = Number(giroDia) || 0
  if (g <= 0) return "sem giro"
  if (g >= 1) return `${g.toFixed(1)}/dia`
  return `1 a cada ${Math.round(1 / g)}d`
}

// Ordenacao das colunas: urgencia por gravidade, origem/destino por loja (CD primeiro).
const URG_RANK: Record<string, number> = { RUPTURA: 1, CRITICO: 2, ALTO: 3, MEDIO: 4 }
const ACC_TRANSF = {
  urgencia: (r: any) => URG_RANK[r.urgencia] ?? 9,
  origem:   (r: any) => (r.de_eh_cd ? "\u0000CD" : r.de_loja || ""),
  destino:  (r: any) => r.para_loja || "",
  mover:    (r: any) => Number(r.quantidade) || 0,
}
const COLS_TRANSF: { key: string; label: string; align: "left" | "center" }[] = [
  { key: "produto",  label: "Produto",  align: "left" },
  { key: "cor",      label: "Cor",      align: "left" },
  { key: "tamanho",  label: "Tam",      align: "center" },
  { key: "urgencia", label: "Urgência", align: "center" },
  { key: "origem",   label: "Origem",   align: "left" },
  { key: "mover",    label: "Mover",    align: "center" },
  { key: "destino",  label: "Destino",  align: "left" },
]

const URGENCIAS = ["RUPTURA", "CRITICO", "ALTO", "MEDIO"] as const
const CORES_URG: Record<string, string> = {
  RUPTURA: "var(--danger)",
  CRITICO: "var(--danger)",
  ALTO: "var(--warning)",
  MEDIO: "var(--muted)",
}

// Classificacao de giro: quanto o produto REALMENTE vende na loja de destino
const CLASSES = [
  { key: "ALTO",  label: "Alto",  dica: "vende a cada 45 dias ou menos" },
  { key: "MEDIO", label: "Médio", dica: "a cada 46 a 90 dias" },
  { key: "BAIXO", label: "Baixo", dica: "a cada 91 a 180 dias" },
  { key: "LENTO", label: "Lento", dica: "mais de 180 dias entre vendas" },
] as const

const ORDENS = [
  { key: "perda",      label: "Maior perda evitada" },
  { key: "urgencia",   label: "Mais urgente" },
  { key: "giro",       label: "Maior giro" },
  { key: "quantidade", label: "Maior quantidade" },
] as const

export default function TransferenciasPage() {
  const { filtros, versaoBusca } = useFiltros()
  const { transferencias, toggleTransf, temTransf, limparTransf, itens: itensSelecionados } = useSelecao()
  const [dados, setDados] = useState<any[]>([])
  const [resumo, setResumo] = useState<any>({})
  const [urgencia, setUrgencia] = useState<string[]>([])
  const [classes, setClasses] = useState<string[]>([])
  const [ordenar, setOrdenar] = useState<string>("perda")
  const [loading, setLoading] = useState(false)
  const [buscaFeita, setBuscaFeita] = useState(false)
  const [opPorAno, setOpPorAno] = useState<Record<string, string[]>>({})
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API_URL}/filtros/colecoes-por-ano`).then(r => r.json()).then(c => setOpPorAno(c.por_ano || {})).catch(() => {})
  }, [])

  useEffect(() => {
    buscar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // itensSelecionados.length: o carrinho agora recorta esta tela tambem
  }, [versaoBusca, urgencia, classes, ordenar, itensSelecionados.length])

  async function buscar() {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true); setBuscaFeita(true)

    const p = new URLSearchParams({ limite: "1000" })
    if (filtros.lojas.length)    p.set("loja_destino", filtros.lojas.join(","))
    if (filtros.marcas.length)   p.set("marca",        filtros.marcas.join(","))
    if (filtros.modelos.length)  p.set("modelo",       filtros.modelos.join(","))
    if (filtros.cores.length)    p.set("cor",          filtros.cores.join(","))
    if (filtros.sexos.length)    p.set("sexo",         filtros.sexos.join(","))

    // CARRINHO manda sobre Produto/IDs — a MESMA regra da Visao Geral, do Compras
    // e do Relatorio. Esta era a ultima tela que ignorava a selecao: sugeria
    // transferencia da rede inteira mesmo com produtos marcados.
    const codsCarrinho = [...new Set(itensSelecionados
      .map(it => String(it.cod_produto))
      .filter(v => v && v !== "undefined" && v !== "null"))]
    if (codsCarrinho.length) {
      p.set("cod_produto", codsCarrinho.join(","))
    } else {
      if (filtros.produtos.length) p.set("produto",     filtros.produtos.join(","))
      if (filtros.ids.trim())      p.set("cod_produto", filtros.ids.split(/[\s,;]+/).filter(Boolean).join(","))
    }
    // Colecao: explicita, ou resolvida a partir de Ano+Estacao
    const colecoesAlvo = resolverColecoes(filtros, opPorAno)
    if (colecoesAlvo.length) p.set("colecao", colecoesAlvo.join(","))
    if (urgencia.length)         p.set("urgencia",     urgencia.join(","))
    if (classes.length)          p.set("classe_giro",  classes.join(","))
    p.set("ordenar", ordenar)

    try {
      const res = await fetch(`${API_URL}/transferencias/sugestoes?${p}`, { signal: ctrl.signal })
      const json = await res.json()
      setDados(json.sugestoes || [])
      setResumo(json.resumo || {})
    } catch (e: any) { if (e?.name !== "AbortError") console.error(e) }
    finally { if (abortRef.current === ctrl) setLoading(false) }
  }

  const totalPecas = dados.reduce((a, r) => a + Number(r.quantidade || 0), 0)
  const doCD = dados.filter(r => r.de_eh_cd).reduce((a, r) => a + Number(r.quantidade || 0), 0)
  const perdaEvitada = dados.reduce((a, r) => a + Number(r.perda_semanal_evitada || 0), 0)

  // Ordenacao por clique no cabecalho (client-side, sobre as linhas ja carregadas).
  const { sorted, sortKey, sortDir, toggle } = useSort(dados, null, "desc", ACC_TRANSF)

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 58,
    overscan: 12,
  })

  // Cabecalho do export: descreve o recorte aplicado
  const descricaoFiltros = useMemo(() => {
    const partes: string[] = []
    if (filtros.lojas.length)    partes.push(`Lojas destino: ${filtros.lojas.length} selec.`)
    if (filtros.marcas.length)   partes.push(`Marca: ${filtros.marcas.join(", ")}`)
    if (filtros.colecoes.length) partes.push(`Colecao: ${filtros.colecoes.join(", ")}`)
    if (filtros.modelos.length)  partes.push(`Modelo: ${filtros.modelos.join(", ")}`)
    if (filtros.cores.length)    partes.push(`Cor: ${filtros.cores.join(", ")}`)
    if (urgencia.length)         partes.push(`Urgencia: ${urgencia.join(", ")}`)
    if (classes.length)          partes.push(`Giro: ${classes.join(", ")}`)
    partes.push(`Ordenado por: ${ORDENS.find(o => o.key === ordenar)?.label || ordenar}`)
    return partes.join(" | ")
  }, [filtros, urgencia, classes, ordenar])

  async function exportarDados(formato: "csv" | "xlsx") {
    if (!dados.length) { alert("Nada para exportar ainda."); return }
    const secoes: any[] = []

    secoes.push({
      titulo: "Resumo",
      colunas: ["Metrica", "Valor"],
      linhas: [
        ["Sugestoes de transferencia", dados.length],
        ["Pecas a mover", n0(totalPecas)],
        ["Vindas do CD", n0(doCD)],
        ["Entre lojas", n0(totalPecas - doCD)],
        ["Perda semanal evitada", brl(perdaEvitada)],
      ],
    })

    // A lista vira uma ORDEM DE SEPARACAO: quem executa entende o porque.
    secoes.push({
      titulo: "Transferencias Sugeridas",
      colunas: ["Cod", "Produto", "Cor", "Tam", "Marca", "De", "Para",
                "Qtd", "Urgencia", "Giro destino (dia)", "Classe", "Dias restantes", "Motivo"],
      linhas: dados.map((r: any) => [
        r.cod_produto,
        r.produto,
        r.cor,
        r.tamanho,
        r.marca,
        r.de_eh_cd ? "CD" : limpaNome(r.de_loja),
        limpaNome(r.para_loja),
        n0(r.quantidade),
        r.urgencia,
        n2(r.para_giro),
        r.classe_giro,
        n0(r.para_dias_restantes),
        r.motivo,
      ]),
    })

    const body = { titulo: "Transferencias Sugeridas", formato, filtros: descricaoFiltros, secoes }
    try {
      const res = await fetch(`${API_URL}/export/inteligente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { alert("Falha ao gerar o arquivo."); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Transferencias_${new Date().toISOString().slice(0, 10)}.${formato}`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert("Erro de rede ao exportar.") }
  }

  const th = (align: string) => ({
    padding: "9px 12px", textAlign: align as any, color: "var(--muted)" as const,
    fontWeight: 600 as const, fontSize: "10px" as const, textTransform: "uppercase" as const,
    letterSpacing: "0.5px" as const, whiteSpace: "nowrap" as const,
  })

  // primeira faixa = checkbox de selecao
  // Faixa de 46px para a miniatura, entre o checkbox e o nome: quem separa a peca
  // reconhece pela foto antes de ler o nome, e o codigo embaixo do nome resolve os
  // casos em que duas cores tem a mesma foto (o Microvix so tem 1 foto por produto).
  const cols = "38px 46px 190px 105px 45px 90px 1fr 70px 1fr"

  // Transferencias VISIVEIS (ja ordenadas/filtradas) e o estado do "marcar todas".
  const transfDe = (r: any) => ({
    cod_produto: r.cod_produto, de_loja: r.de_loja, para_loja: r.para_loja,
    produto: r.produto, cor: r.cor, tamanho: r.tamanho,
    quantidade: Number(r.quantidade) || 0, urgencia: r.urgencia,
  })
  const todasMarcadas = sorted.length > 0 && sorted.every((r: any) => temTransf(chaveTransf(r)))
  function alternarTodas() {
    if (todasMarcadas) sorted.forEach((r: any) => { if (temTransf(chaveTransf(r))) toggleTransf(transfDe(r)) })
    else sorted.forEach((r: any) => { if (!temTransf(chaveTransf(r))) toggleTransf(transfDe(r)) })
  }

  return (
    <div id="area-export" style={{ maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>
            Transferências Sugeridas
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
            Só sugere destino que <strong>vende</strong> o produto (giro dos últimos 90 dias) e está prestes a romper.
            Tira do CD primeiro, depois de quem tem estoque parado.
          </p>
        </div>
        <BotoesExport areaId="area-export" titulo="Transferências Sugeridas" onExportarDados={exportarDados} />
      </div>

      {/* estoque + giro: vendedor nao recorta nada aqui (ver FiltroGlobal) */}
      <div data-no-export><FiltroGlobal onBuscar={buscar} loading={loading} vendedorAplica={false} /></div>
      <FraseRecorte />

      {/* Filtro de urgencia */}
      <div data-no-export style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
          Urgência:
        </span>
        {URGENCIAS.map(u => {
          const ativo = urgencia.includes(u)
          return (
            <button key={u}
              onClick={() => setUrgencia(ativo ? urgencia.filter(x => x !== u) : [...urgencia, u])}
              style={{
                padding: "5px 12px", borderRadius: "20px", fontSize: "11px", cursor: "pointer",
                fontWeight: ativo ? 700 : 500, border: "1px solid",
                background: ativo ? CORES_URG[u] : "var(--surface2)",
                color: ativo ? "#fff" : "var(--text)",
                borderColor: ativo ? CORES_URG[u] : "var(--border)",
              }}>{u}</button>
          )
        })}
        {urgencia.length > 0 && (
          <button onClick={() => setUrgencia([])} style={{
            padding: "5px 10px", borderRadius: "20px", fontSize: "11px", cursor: "pointer",
            border: "none", background: "transparent", color: "var(--muted)",
          }}>limpar</button>
        )}
      </div>

      {/* Classe de giro + ordenacao */}
      <div data-no-export style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
          Giro no destino:
        </span>
        {CLASSES.map(c => {
          const ativo = classes.includes(c.key)
          return (
            <button key={c.key} title={c.dica}
              onClick={() => setClasses(ativo ? classes.filter(x => x !== c.key) : [...classes, c.key])}
              style={{
                padding: "5px 12px", borderRadius: "20px", fontSize: "11px", cursor: "pointer",
                fontWeight: ativo ? 700 : 500, border: "1px solid",
                background: ativo ? "var(--primary)" : "var(--surface2)",
                color: ativo ? "#fff" : "var(--text)",
                borderColor: ativo ? "var(--primary)" : "var(--border)",
              }}>{c.label}</button>
          )
        })}
        {classes.length > 0 && (
          <button onClick={() => setClasses([])} style={{
            padding: "5px 10px", borderRadius: "20px", fontSize: "11px", cursor: "pointer",
            border: "none", background: "transparent", color: "var(--muted)",
          }}>limpar</button>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
            Ordenar por:
          </span>
          <select value={ordenar} onChange={e => setOrdenar(e.target.value)} style={{
            padding: "5px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
            background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)",
          }}>
            {ORDENS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {dados.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: "10px", marginBottom: "16px" }}>
          {[
            { l: "Sugestões", v: dados.length, c: "var(--primary)" },
            { l: "Peças a mover", v: n0(totalPecas).toLocaleString("pt-BR"), c: "var(--success)" },
            { l: "Vindas do CD", v: n0(doCD).toLocaleString("pt-BR"), c: "var(--success)" },
            { l: "Perda semanal evitada", v: brl(perdaEvitada), c: "var(--warning)" },
          ].map((k, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px", minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.l}</div>
              <div style={{ fontSize: "clamp(16px,1.8vw,22px)", fontWeight: 700, color: k.c || "var(--text)", marginTop: "4px", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.v}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          Calculando sugestões...
        </div>
      ) : dados.length === 0 ? (
        <div style={{ padding: "50px 20px", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>
            Nenhuma transferência necessária
          </div>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>
            Nenhuma loja está prestes a romper em produto que ela vende — ou não há estoque disponível para remanejar.
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "915px" }}>
              <div style={{ display: "grid", gridTemplateColumns: cols, background: "var(--surface2)", borderBottom: "2px solid var(--border)" }}>
                <div style={{ ...th("center"), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <input type="checkbox" checked={todasMarcadas} onChange={alternarTodas}
                    title="Marcar todas as transferências desta lista"
                    style={{ cursor: "pointer", width: "15px", height: "15px", accentColor: "var(--primary)" }} />
                </div>
                <div style={th("center")}>Foto</div>
                {COLS_TRANSF.map(c => (
                  <div key={c.key} onClick={() => toggle(c.key)} title="Clique para ordenar"
                    style={{ ...th(c.align), cursor: "pointer", userSelect: "none",
                             color: sortKey === c.key ? "var(--text)" : "var(--muted)" }}>
                    {c.label}{seta(sortKey === c.key, sortDir)}
                  </div>
                ))}
              </div>

              <div ref={scrollRef} style={{ height: "calc(100vh - 420px)", overflowY: "auto" }}>
                <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative", width: "100%" }}>
                  {virtualizer.getVirtualItems().map(vr => {
                    const row = sorted[vr.index]
                    return (
                      <div key={vr.key} data-index={vr.index} ref={virtualizer.measureElement}
                        title={row.motivo}
                        style={{
                          position: "absolute", top: 0, left: 0, width: "100%",
                          transform: `translateY(${vr.start}px)`, display: "grid",
                          gridTemplateColumns: cols, borderBottom: "1px solid var(--border)",
                          background: vr.index % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--surface2) 45%, transparent)",
                          fontSize: "12px", alignItems: "center",
                        }}>
                        <div style={{ padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <input type="checkbox" checked={temTransf(chaveTransf(row))}
                            onChange={() => toggleTransf(transfDe(row))}
                            title="Levar esta transferência para o relatório"
                            style={{ cursor: "pointer", width: "15px", height: "15px", accentColor: "var(--primary)" }} />
                        </div>
                        <div style={{ padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <MiniFoto url={row.imagem} tam={36} alt={row.produto} />
                        </div>
                        <div title={row.produto} style={{ padding: "8px 12px", overflow: "hidden" }}>
                          <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.produto}</div>
                          {/* O codigo e' o desempate: e' por ele que a peca e' achada no
                              Microvix, e e' o mesmo que sai na coluna "Cod" do arquivo.
                              Legivel a distancia: quem separa le' isto de pe, no deposito. */}
                          <div style={{ fontSize: "13px", color: "var(--text)", fontWeight: 700, fontFamily: "ui-monospace, monospace", letterSpacing: "0.3px", marginTop: "2px" }}>
                            {row.cod_produto}
                          </div>
                        </div>
                        {/* Bolinha + nome, o mesmo componente da Visao Geral, do Relatorio
                            e do carrinho — Transferencias era a unica tela sem ele. A cor
                            precisa se mostrar sozinha porque o Microvix guarda UMA foto por
                            produto e a repete em todas as cores. */}
                        <div style={{ padding: "8px 12px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <Cor nome={row.cor} tam={13} />
                        </div>
                        <div style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>{row.tamanho}</div>

                        <div style={{ padding: "8px 12px", textAlign: "center" }}>
                          <span style={{
                            padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
                            background: CORES_URG[row.urgencia] || "var(--muted)", color: "#fff",
                          }}>{row.urgencia}</span>
                        </div>

                        {/* Origem: mostra se e' CD e se o estoque esta parado la */}
                        <div style={{ padding: "8px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ color: "var(--success)", fontWeight: 600 }}>
                            {row.de_eh_cd ? "CD" : limpaNome(row.de_loja)}
                          </span>
                          <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "5px" }}>
                            ({n0(row.de_saldo)}{Number(row.de_giro) === 0 && !row.de_eh_cd ? " · parado" : ""})
                          </span>
                        </div>

                        <div style={{ padding: "8px 12px", textAlign: "center" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700,
                            background: "var(--primary-light)", color: "var(--primary)",
                          }}>{n0(row.quantidade)}</span>
                        </div>

                        {/* Destino: a prova de que vende — giro e dias restantes */}
                        <div style={{ padding: "8px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ color: "var(--danger)", fontWeight: 600 }}>{limpaNome(row.para_loja)}</span>
                          <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "5px" }}>
                            ({n0(row.para_saldo)} · vende {cadencia(row.para_giro)} · {n0(row.para_dias_restantes)}d · giro {row.classe_giro?.toLowerCase()})
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", color: "var(--muted)", fontSize: "12px" }}>
            {dados.length} sugestões · {n0(totalPecas).toLocaleString("pt-BR")} peças ·
            {" "}{n0(doCD).toLocaleString("pt-BR")} do CD · passe o mouse na linha para ver o motivo
          </div>
        </div>
      )}
    </div>
  )
}
