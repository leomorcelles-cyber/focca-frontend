"use client"
import { useState, useRef, useEffect } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

type Msg = { role: "user" | "assistant"; content: string; consultas?: any[] }

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
        body: JSON.stringify({ mensagens: novas.map(m => ({ role: m.role, content: m.content })) }),
      })
      const json = await res.json()
      if (json.erro) {
        setMsgs([...novas, { role: "assistant", content: `⚠️ ${json.erro}` }])
      } else {
        setMsgs([...novas, { role: "assistant", content: json.resposta || "(sem resposta)", consultas: json.consultas }])
      }
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
              {m.consultas && m.consultas.length > 0 && (
                <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--muted)" }}>
                  🔎 {m.consultas.length} consulta{m.consultas.length > 1 ? "s" : ""} ao banco
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
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
