import type { Metadata } from "next"
import "./globals.css"
import ThemeProvider from "@/components/ThemeProvider"
import { FiltroProvider } from "@/components/FiltroContext"
import { SelecaoProvider } from "@/components/SelecaoContext"
import AppShell from "@/components/AppShell"

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
            <SelecaoProvider>
              <AppShell>{children}</AppShell>
            </SelecaoProvider>
          </FiltroProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
