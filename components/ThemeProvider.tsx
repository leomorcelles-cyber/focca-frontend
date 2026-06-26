"use client"
import { createContext, useContext, useEffect, useState } from "react"
import { themes, ThemeName } from "@/lib/themes"

type ThemeContextType = {
  theme: ThemeName
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>("light")

  useEffect(() => {
    const saved = localStorage.getItem("focca_theme") as ThemeName
    if (saved && themes[saved]) setTheme(saved)
  }, [])

  useEffect(() => {
    const vars = themes[theme]
    Object.entries(vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v)
    })
    localStorage.setItem("focca_theme", theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => prev === "light" ? "dark" : "light")
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
