"use client"
// Decide a "casca" visual conforme a rota:
// - /login: mostra so o conteudo (sem sidebar/carrinho), tela cheia
// - demais: app completo (sidebar + main + carrinho), protegido por AuthGuard
import { usePathname } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import CarrinhoPainel from "@/components/CarrinhoPainel"
import AuthGuard from "@/components/AuthGuard"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ehLogin = pathname === "/login"

  if (ehLogin) {
    // login ocupa a tela toda, sem menu
    return <AuthGuard>{children}</AuthGuard>
  }

  return (
    <AuthGuard>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
        <Sidebar />
        <main style={{ flex: 1, padding: "32px 28px", minWidth: 0, overflowX: "hidden" }}>
          {children}
        </main>
      </div>
      <CarrinhoPainel />
    </AuthGuard>
  )
}
