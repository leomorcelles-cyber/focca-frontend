"use client"
import { useState, useRef, useEffect, useMemo } from "react"
import { useFiltros, periodoParaParams } from "@/components/FiltroContext"
import { useSelecao } from "@/components/SelecaoContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

type Uso = {
  entrada: number; saida: number; cache_leitura: number; cache_escrita: number
  usd: number; brl: number; modelo: string; promo: boolean
}
type Msg = { role: "user" | "assistant"; content: string; consultas?: any[]; uso?: Uso }

const SUGESTOES = [
  "Top 10 produtos que mais venderam nos últimos 30 dias",
  "Quais lojas estão com mais rupturas de produtos que giram?",
  "Margem média por marca, da maior para a menor",
  "Quanto de estoque parado (sem giro) temos no CD?",
]

// Renderizacao leve de markdown: tabelas (| a | b |) viram <table>, **negrito**, quebras de linha.
function renderMarkdown(texto: string) {
  const linhas = texto.split("\n")
  const blocos: React.ReactNode[] = []
  let i = 0
  let k = 0
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={j}>{p.slice(2, -2)}</strong>
        : <span key={j}>{p}</span>
    )

  while (i < linhas.length) {
    const l = linhas[i]
    const ehTabela = l.trim().startsWith("|") && l.includes("|")
    if (ehTabela) {
      const tabela: string[] = []
      while (i < linhas.length && linhas[i].trim().startsWith("|")) { tabela.push(linhas[i]); i++ }
      const parse = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim())
      const semSep = tabela.filter(r => !/^\s*\|?[\s:|-]+\|?\s*$/.test(r))
      if (semSep.length >= 1) {
        const head = parse(semSep[0])
        const body = semSep.slice(1).map(parse)
        blocos.push(
          <div key={k++} style={{ overflowX: "auto", margin: "10px 0" }}>
            <table style={{ borderCollapse: "collapse", fontSize: "13px", width: "100%" }}>
              <thead>
                <tr style={{ background: "var(--surface2)" }}>
                  {head.map((h, ci) => (
                    <th key={ci} style={{ padding: "7px 10px", textAlign: "left", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap", color: "var(--muted)", fontWeight: 600 }}>{inline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((r, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}>
                    {r.map((c, ci) => (
                      <td key={ci} style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{inline(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        continue
      }
    }
    // paragrafo normal (acumula ate proxima tabela)
    const par: string[] = []
    while (i < linhas.length && !(linhas[i].trim().startsWith("|"))) { par.push(linhas[i]); i++ }
    const txt = par.join("\n").trim()
    if (txt) blocos.push(<div key={k++} style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{inline(txt)}</div>)
  }
  return blocos
}

export default function ChatPage() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  // Recorte trazido do Relatorio pelo botao "Analisar com IA". Vem por
  // sessionStorage porque o payload tem as secoes inteiras — nao cabe em URL.
  const [contextoSalvo, setContextoSalvo] = useState<any>(null)
  const [descartado, setDescartado] = useState(false)
  const { filtros, periodo } = useFiltros()
  const { itens } = useSelecao()

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("focca_contexto_ia")
      if (raw) setContextoSalvo(JSON.parse(raw))
    } catch {}
  }, [])

  // Quem entra no chat pela sidebar nao passa pelo botao do Relatorio e chegava aqui
  // sem recorte nenhum — a IA respondia sobre a rede inteira enquanto os filtros
  // globais (que valem em TODAS as telas e sobrevivem ao reload) diziam outra coisa.
  // Este e' o mesmo recorte, montado do FiltroContext e do carrinho. Sem os numeros
  // ja calculados do Relatorio, porque aqui eles nao existem.
  const contextoVivo = useMemo(() => {
    const cods = [...new Set(itens.map(it => String(it.cod_produto))
      .filter(v => v && v !== "undefined" && v !== "null"))]
    const f: Record<string, any> = {}
    if (filtros.lojas.length)    f["lojas"]    = filtros.lojas.join(", ")
    if (filtros.marcas.length)   f["marcas"]   = filtros.marcas.join(", ")
    if (filtros.modelos.length)  f["modelos"]  = filtros.modelos.join(", ")
    if (filtros.sexos.length)    f["sexo"]     = filtros.sexos.join(", ")
    if (filtros.anos.length)     f["ano da coleção"] = filtros.anos.join(", ")
    if (filtros.colecoes.length) f["coleções"] = filtros.colecoes.join(", ")
    if (filtros.cores.length)    f["cores"]    = filtros.cores.join(", ")
    if (!cods.length) {
      if (filtros.produtos.length) f["produtos"] = filtros.produtos.join(", ")
      if (filtros.ids.trim())      f["IDs"] = filtros.ids
    }
    // Nada filtrado e carrinho vazio: e' panorama mesmo, nao ha recorte a mandar.
    if (!Object.keys(f).length && !cods.length) return null

    const TETO_CODS = 600
    const recorte: Record<string, any> = {
      ...periodoParaParams(periodo),
      marcas: filtros.marcas, modelos: filtros.modelos, sexos: filtros.sexos,
      anos: filtros.anos, colecoes: filtros.colecoes, cores: filtros.cores,
      lojas: filtros.lojas,
    }
    if (cods.length) {
      recorte.cods = cods.slice(0, TETO_CODS).map(Number)
      if (cods.length > TETO_CODS) recorte.cods_truncados = true
    } else {
      if (filtros.produtos.length) recorte.produtos = filtros.produtos
      if (filtros.ids.trim()) recorte.cods = filtros.ids.split(/[\s,;]+/).filter(Boolean).map(Number)
    }
    const rotulo = periodo.tipo === "custom" && periodo.inicio && periodo.fim
      ? `${periodo.inicio.split("-").reverse().join("/")} a ${periodo.fim.split("-").reverse().join("/")}`
      : `últimos ${periodo.dias} dias`
    return {
      periodo: rotulo, filtros: f, recorte, origem: "filtros",
      selecao: { total: cods.length, produtos: [...new Set(itens.map(it => it.produto))] },
    }
  }, [filtros, periodo, itens])

  // O do Relatorio ganha: traz os numeros ja calculados, que o vivo nao tem.
  const contexto = descartado ? null : (contextoSalvo ?? contextoVivo)
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs, loading])

  async function enviar(pergunta?: string) {
    const texto = (pergunta ?? input).trim()
    if (!texto || loading) return
    const novas: Msg[] = [...msgs, { role: "user", content: texto }]
    setMsgs(novas)
    setInput("")
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagens: novas.map(m => ({ role: m.role, content: m.content })),
          // vai em TODA mensagem: o backend nao guarda estado entre chamadas,
          // entao sem isso a IA esqueceria o recorte na segunda pergunta
          ...(contexto ? { contexto } : {}),
        }),
      })
      // Resposta em JSON, não em stream. Dois casos caem aqui:
      //  - erro de configuração (sem ANTHROPIC_API_KEY), que o backend responde antes
      //    de abrir o stream;
      //  - backend ainda na versão anterior. Backend e frontend têm deploys
      //    separados, então existe uma janela em que um subiu e o outro não — sem
      //    este caminho, o chat ficaria quebrado nessa janela.
      if (!res.body || !(res.headers.get("content-type") || "").includes("event-stream")) {
        const json = await res.json().catch(() => ({ erro: "Resposta inesperada da IA." }))
        setMsgs([...novas, json.erro
          ? { role: "assistant", content: `⚠️ ${json.erro}` }
          : { role: "assistant", content: json.resposta || "(sem resposta)", consultas: json.consultas }])
        return
      }

      // A resposta chega em pedaços (SSE). Cada delta é anexado à mesma mensagem,
      // então o texto aparece sendo escrito em vez de surgir pronto no fim.
      let resposta = ""
      let consultas: any[] = []
      let uso: Uso | undefined
      const pintar = () => setMsgs([...novas, { role: "assistant", content: resposta, consultas, uso }])
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        // Um evento pode chegar partido entre chunks: só processa os completos e
        // guarda o resto no buffer.
        const partes = buf.split("\n\n")
        buf = partes.pop() ?? ""
        for (const p of partes) {
          const linha = p.split("\n").find(l => l.startsWith("data: "))
          if (!linha) continue
          let ev: any
          try { ev = JSON.parse(linha.slice(6)) } catch { continue }
          if (ev.tipo === "texto") { resposta += ev.delta; pintar() }
          else if (ev.tipo === "consulta") { consultas = [...consultas, ev]; pintar() }
          else if (ev.tipo === "fim") { uso = ev.uso; pintar() }
          else if (ev.tipo === "erro") {
            uso = ev.uso ?? uso
            consultas = ev.consultas || consultas
            resposta += `${resposta ? "\n\n" : ""}⚠️ ${ev.erro}`
            pintar()
          }
        }
      }
      if (!resposta) setMsgs([...novas, { role: "assistant", content: "(sem resposta)", consultas }])
    } catch {
      setMsgs([...novas, { role: "assistant", content: "⚠️ Erro de rede ao falar com a IA." }])
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", height: "calc(100vh - 90px)" }}>
      <div style={{ marginBottom: "12px" }}>
        <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "var(--text)" }}>Chat IA</h1>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>
          Pergunte sobre estoque, vendas, giro e margem. A IA consulta o banco (somente leitura) e monta o relatório aqui.
        </p>
      </div>

      {/* Recorte carregado do Relatorio. Fica visivel porque muda a resposta:
          sem isso a pessoa nao saberia por que a IA fala de um recorte especifico. */}
      {contexto && (
        <div style={{ marginBottom: "12px", padding: "10px 14px", background: "var(--primary-light)", border: "1px solid var(--primary)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", color: "var(--primary)", flex: 1, minWidth: "240px" }}>
            ✦ <strong>{contexto.origem === "filtros" ? "Recorte dos filtros ativos" : "Analisando o relatório"}</strong> — {contexto.periodo}
            {contexto?.selecao?.total ? ` · seleção de ${contexto.selecao.total} SKUs` : " · panorama"}
            {contexto?.transferencias?.length ? ` · ${contexto.transferencias.length} transferências marcadas` : ""}
            {Object.keys(contexto?.filtros || {}).length
              ? ` · filtros: ${Object.entries(contexto.filtros).map(([k, v]) => `${k} ${v}`).join("; ")}`
              : " · sem filtros"}
          </span>
          <button onClick={() => { setContextoSalvo(null); setDescartado(true); try { sessionStorage.removeItem("focca_contexto_ia") } catch {} }}
            style={{ padding: "5px 10px", background: "var(--surface)", border: "1px solid var(--primary)", borderRadius: "6px", color: "var(--primary)", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>
            Descartar recorte
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
        {msgs.length === 0 && !loading && (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: "20px 0" }}>
            <div style={{ fontSize: "34px", marginBottom: "10px" }}>✦</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "14px" }}>Comece com uma pergunta</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: "8px", maxWidth: "620px", margin: "0 auto" }}>
              {SUGESTOES.map((s, i) => (
                <button key={i} onClick={() => enviar(s)} style={{
                  padding: "10px 12px", borderRadius: "10px", fontSize: "12px", cursor: "pointer", textAlign: "left",
                  background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)",
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} style={{ marginBottom: "16px", display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: m.role === "user" ? "80%" : "100%",
              background: m.role === "user" ? "var(--primary)" : "transparent",
              color: m.role === "user" ? "#fff" : "var(--text)",
              padding: m.role === "user" ? "9px 14px" : "0",
              borderRadius: "12px", fontSize: "13px",
            }}>
              {m.role === "user" ? <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div> : renderMarkdown(m.content)}
              {(m.consultas?.length || m.uso) && (
                <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--muted)", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {m.consultas && m.consultas.length > 0 && (
                    <span>🔎 {m.consultas.length} consulta{m.consultas.length > 1 ? "s" : ""} ao banco</span>
                  )}
                  {/* Custo REAL desta análise (usage devolvido pela API), não estimativa.
                      Fica visível para que uma pergunta cara não passe despercebida. */}
                  {m.uso && (
                    <span
                      title={`${m.uso.modelo} · entrada ${m.uso.entrada.toLocaleString("pt-BR")} tokens `
                        + `(${m.uso.cache_leitura.toLocaleString("pt-BR")} lidos do cache) · `
                        + `saída ${m.uso.saida.toLocaleString("pt-BR")} · US$ ${m.uso.usd.toFixed(5)}`
                        + (m.uso.promo ? " · preço promocional vigente" : "")}
                      style={{ cursor: "help" }}>
                      💰 R$ {m.uso.brl.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Só até o primeiro pedaço chegar — dali em diante o próprio texto sendo
            escrito já é o sinal de que está viva, e o aviso viraria ruído. */}
        {loading && !(msgs[msgs.length - 1]?.role === "assistant" && msgs[msgs.length - 1]?.content) && (
          <div style={{ color: "var(--muted)", fontSize: "13px", padding: "4px 0" }}>Consultando o banco e analisando…</div>
        )}
        <div ref={fimRef} />
      </div>

      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar() } }}
          placeholder="Pergunte algo sobre o estoque, vendas, giro…  (Enter envia, Shift+Enter quebra linha)"
          rows={2}
          style={{
            flex: 1, resize: "none", padding: "10px 12px", borderRadius: "10px", fontSize: "13px",
            background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)", fontFamily: "inherit",
          }}
        />
        <button onClick={() => enviar()} disabled={loading || !input.trim()} style={{
          padding: "0 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 600, cursor: loading ? "default" : "pointer",
          background: loading || !input.trim() ? "var(--surface2)" : "var(--primary)",
          color: loading || !input.trim() ? "var(--muted)" : "#fff", border: "none",
        }}>Enviar</button>
      </div>
    </div>
  )
}
