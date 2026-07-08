"use client"
// Cliente Supabase (browser). Usa as chaves publicas do .env.local.
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,       // mantem logado apos F5
    autoRefreshToken: true,     // renova o token automaticamente
    storageKey: "focca-auth",   // chave propria (nao colide com outros apps)
  },
})

// Helper: pega o perfil (role) do usuario logado
export async function getPerfil() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("profiles")
    .select("id, email, nome, role")
    .eq("id", user.id)
    .single()
  return data
}
