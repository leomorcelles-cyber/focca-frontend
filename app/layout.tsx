import type { Metadata } from "next"
import "./globals.css"
import Sidebar from "@/components/Sidebar"
import ThemeProvider from "@/components/ThemeProvider"
import { FiltroProvider } from "@/components/FiltroContext"

export const metadata: Metadata = {
  title: "Focca Jeans - Sistema de Estoque",
  description: "Inteligencia de estoque para a rede Focca Jeans",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider>
          <FiltroProvider>
            <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
              <Sidebar />
              <main style={{ flex: 1, padding: "32px 28px", minWidth: 0, overflowX: "hidden" }}>
                {children}
              </main>
            </div>
          </FiltroProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
