"use client"
import { useState, useRef, useEffect } from "react"
import { useFiltros } from "@/components/FiltroContext"

export default function FiltrosSalvos() {
  const { filtrosSalvos, carregandoSalvos, salvarFiltro, aplicarFiltroSalvo, deletarFiltroSalvo } = useFiltros()
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState("")
  const [msg, setMsg] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Calcula a posicao do menu a partir do botao (position fixed p/ escapar do overflow:hidden)
  function abrir() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
    setAberto(a => !a)
    setMsg(null)
  }

  // Fecha ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node
      if (menuRef.current && !menuRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
        setAberto(false)
      }
    }
    if (aberto) document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [aberto])

  async function handleSalvar() {
    setSalvando(true); setMsg(null)
    const r = await salvarFiltro(nome)
    setSalvando(false)
    if (r.ok) { setNome(""); setMsg({ tipo: "ok", texto: "Filtro salvo!" }) }
    else setMsg({ tipo: "erro", texto: r.erro || "Erro ao salvar." })
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={abrir}
        data-no-export
        style={{
          padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--border)",
          background: "var(--surface)", color: "var(--text)", fontSize: "13px",
          fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: "var(--primary)" }}>★</span> Salvos
        {filtrosSalvos.length > 0 && (
          <span style={{
            background: "var(--primary)", color: "#fff", borderRadius: "10px",
            padding: "1px 7px", fontSize: "11px", fontWeight: 700,
          }}>{filtrosSalvos.length}</span>
        )}
      </button>

      {aberto && (
        <div
          ref={menuRef}
          style={{
            position: "fixed", top: pos.top, right: pos.right, width: "300px",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "12px", boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
            padding: "14px", zIndex: 9999,
          }}
        >
          {/* Salvar o filtro atual */}
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
            Salvar filtro atual
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              value={nome}
              onChange={e => { setNome(e.target.value); setMsg(null) }}
              onKeyDown={e => { if (e.key === "Enter") handleSalvar() }}
              placeholder="Nome do filtro"
              autoFocus
              style={{
                flex: 1, padding: "8px 10px", borderRadius: "8px",
                border: "1px solid var(--border)", fontSize: "13px",
                background: "var(--surface2)", color: "var(--text)", outline: "none",
              }}
            />
            <button
              onClick={handleSalvar}
              disabled={salvando || !nome.trim()}
              style={{
                padding: "8px 12px", borderRadius: "8px", border: "none",
                background: (salvando || !nome.trim()) ? "var(--muted)" : "var(--primary)",
                color: "#fff", fontSize: "13px", fontWeight: 700,
                cursor: (salvando || !nome.trim()) ? "default" : "pointer",
              }}
            >
              {salvando ? "..." : "Salvar"}
            </button>
          </div>
          {msg && (
            <div style={{
              fontSize: "12px", marginTop: "6px",
              color: msg.tipo === "erro" ? "var(--danger)" : "var(--success)",
            }}>{msg.texto}</div>
          )}

          <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />

          {/* Lista dos salvos */}
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
            Meus filtros
          </div>
          {carregandoSalvos ? (
            <div style={{ fontSize: "13px", color: "var(--muted)", padding: "8px 0" }}>Carregando...</div>
          ) : filtrosSalvos.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--muted)", padding: "8px 0" }}>
              Nenhum filtro salvo ainda.
            </div>
          ) : (
            <div style={{ maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
              {filtrosSalvos.map(f => (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 10px", borderRadius: "8px", background: "var(--surface2)",
                }}>
                  <button
                    onClick={() => { aplicarFiltroSalvo(f.id); setAberto(false) }}
                    style={{
                      flex: 1, textAlign: "left", background: "none", border: "none",
                      cursor: "pointer", fontSize: "13px", color: "var(--text)", fontWeight: 600,
                    }}
                    title="Aplicar este filtro"
                  >
                    {f.nome}
                  </button>
                  <button
                    onClick={() => deletarFiltroSalvo(f.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--muted)", fontSize: "18px", lineHeight: 1, padding: "2px 6px",
                    }}
                    title="Apagar"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
