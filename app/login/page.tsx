"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)

  async function entrar() {
    setErro(""); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setLoading(false)
    if (error) {
      setErro(error.message === "Invalid login credentials"
        ? "Email ou senha incorretos."
        : error.message)
      return
    }
    router.push("/")  // vai para a Visao Geral
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && email && senha && !loading) entrar()
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg, #0f1115)", padding: "20px",
    }}>
      <div style={{
        width: "100%", maxWidth: "380px", background: "var(--surface, #fff)",
        border: "1px solid var(--border, #e5e7eb)", borderRadius: "14px",
        padding: "32px 28px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text, #111)", letterSpacing: "-0.5px" }}>
            Focca Jeans
          </div>
          <div style={{ fontSize: "13px", color: "var(--muted, #888)", marginTop: "4px" }}>
            Inteligencia de Estoque
          </div>
        </div>

        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted, #888)", display: "block", marginBottom: "6px" }}>
          Email
        </label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey}
          placeholder="seu@email.com" autoFocus
          style={inp}
        />

        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted, #888)", display: "block", margin: "14px 0 6px" }}>
          Senha
        </label>
        <input
          type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={onKey}
          placeholder="••••••••"
          style={inp}
        />

        {erro && (
          <div style={{ color: "#dc2626", fontSize: "13px", marginTop: "12px", textAlign: "center" }}>
            {erro}
          </div>
        )}

        <button
          onClick={entrar} disabled={loading || !email || !senha}
          style={{
            width: "100%", marginTop: "20px", padding: "11px", borderRadius: "9px",
            border: "none", background: (loading || !email || !senha) ? "#9ca3af" : "var(--primary, #2563eb)",
            color: "#fff", fontSize: "14px", fontWeight: 600,
            cursor: (loading || !email || !senha) ? "default" : "pointer",
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: "9px",
  border: "1px solid var(--border, #e5e7eb)", fontSize: "14px",
  background: "var(--surface2, #f9fafb)", color: "var(--text, #111)", outline: "none",
}
