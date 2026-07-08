"use client"
// Cliente Supabase (browser), resiliente a SSR/build.
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Aviso util no console se faltar config (nao quebra o build)
if (typeof window !== "undefined" && (!url || !anon)) {
  console.error("Supabase: variaveis NEXT_PUBLIC_SUPABASE_URL / ANON_KEY ausentes.")
}

// Usa placeholders validos se faltar, para o createClient nao explodir no build.
// Em runtime real (com env correta) usa os valores certos.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anon || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "focca-auth",
    },
  }
)

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
