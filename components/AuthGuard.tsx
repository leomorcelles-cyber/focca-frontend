"use client"
// Envolve o conteudo protegido. Se nao houver sessao, redireciona para /login.
// Fase 1: apenas verifica se esta logado (sem checar role ainda).
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [estado, setEstado] = useState<"carregando" | "ok" | "deslogado">("carregando")

  useEffect(() => {
    // a pagina de login nao e protegida
    if (pathname === "/login") { setEstado("ok"); return }

    let vivo = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!vivo) return
      if (session) { setEstado("ok") }
      else { setEstado("deslogado"); router.replace("/login") }
    })

    // reage a login/logout em tempo real
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (!vivo) return
      if (session) setEstado("ok")
      else { setEstado("deslogado"); router.replace("/login") }
    })

    return () => { vivo = false; sub.subscription.unsubscribe() }
  }, [pathname, router])

  if (pathname === "/login") return <>{children}</>

  if (estado === "carregando") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted, #888)" }}>
        Carregando...
      </div>
    )
  }
  if (estado === "deslogado") return null
  return <>{children}</>
}
