"use client"
import { useState, useEffect } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

type Props = {
  aberto: boolean
  onFechar: () => void
  codProduto?: number
  modelo?: string
  titulo?: string
}

// Modal: destrincha o estoque da rede por loja.
// Serve para decidir TRANSFERIR em vez de COMPRAR: se o CD ou outra loja
// tem saldo parado, nao ha razao para comprar.
export default function ModalEstoque({ aberto, onFechar, codProduto, modelo, titulo }: Props) {
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!aberto || (!codProduto && !modelo)) return
    setLoading(true); setDados(null)
    const q = codProduto ? `cod_produto=${codProduto}` : `modelo=${encodeURIComponent(modelo || "")}`
    fetch(`${API_URL}/estoque/detalhe?${q}`)
      .then(r => r.json())
      .then(d => setDados(d))
      .catch(() => setDados({ erro: "falha ao carregar" }))
      .finally(() => setLoading(false))
  }, [aberto, codProduto, modelo])

  if (!aberto) return null

  const porLoja: any[] = dados?.por_loja || []
  const lojas = porLoja.filter(l => Number(l.empresa) !== 2)
  const cd = porLoja.find(l => Number(l.empresa) === 2)
  const maxSaldo = Math.max(...lojas.map(l => Number(l.saldo) || 0), 1)
  const nomeLimpo = (n: string) => String(n || "").replace("FOCCA JEANS - ", "").replace("FOCCA ", "")

  return (
    <div
      onClick={onFechar}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10000, padding: "16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "14px", padding: "20px", width: "100%", maxWidth: "440px",
          maxHeight: "80vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Cabecalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Estoque por loja
          </div>
          <button onClick={onFechar} style={{
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--muted)", fontSize: "20px", lineHeight: 1, padding: 0,
          }}>×</button>
        </div>

        <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "16px" }}>
          {titulo || dados?.info?.produto || modelo || "—"}
          {dados?.info?.cor && (
            <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: "13px" }}>
              {" · "}{dados.info.cor}{dados.info.tamanho ? ` · ${dados.info.tamanho}` : ""}
            </span>
          )}
        </div>

        {loading && (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
            Carregando...
          </div>
        )}

        {!loading && dados && !dados.erro && (
          <>
            {/* Totais */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <div style={{ flex: 1, background: "var(--surface2)", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Rede</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--primary)" }}>
                  {Number(dados.total_rede || 0).toLocaleString("pt-BR")}
                </div>
              </div>
              <div style={{ flex: 1, background: "var(--surface2)", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>No CD</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: Number(dados.total_cd) > 0 ? "var(--success)" : "var(--muted)" }}>
                  {Number(dados.total_cd || 0).toLocaleString("pt-BR")}
                </div>
              </div>
            </div>

            {/* Dica de transferencia */}
            {Number(dados.total_cd) > 0 && (
              <div style={{
                background: "var(--surface2)", borderLeft: "3px solid var(--success)",
                borderRadius: "6px", padding: "8px 10px", marginBottom: "14px",
                fontSize: "12px", color: "var(--text)",
              }}>
                Há {Number(dados.total_cd).toLocaleString("pt-BR")} peça(s) no CD — dá para transferir em vez de comprar.
              </div>
            )}

            {/* Barras por loja */}
            {lojas.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                Sem saldo nas lojas.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {lojas
                  .slice()
                  .sort((a, b) => Number(b.saldo) - Number(a.saldo))
                  .map((l, i) => {
                    const saldo = Number(l.saldo) || 0
                    const pct = Math.max((saldo / maxSaldo) * 100, 2)
                    return (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                          <span style={{ color: "var(--text)", fontWeight: 600 }}>{nomeLimpo(l.loja)}</span>
                          <span style={{ color: saldo > 0 ? "var(--text)" : "var(--danger)", fontWeight: 700 }}>
                            {saldo.toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <div style={{ background: "var(--surface2)", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                          <div style={{
                            width: `${pct}%`, height: "100%",
                            background: saldo > 0 ? "var(--primary)" : "var(--danger)",
                            borderRadius: "4px",
                          }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </>
        )}

        {!loading && dados?.erro && (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--danger)", fontSize: "13px" }}>
            Não foi possível carregar o estoque.
          </div>
        )}
      </div>
    </div>
  )
}
