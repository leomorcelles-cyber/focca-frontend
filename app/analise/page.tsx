import { redirect } from "next/navigation"

// A Analise de Vendas virou a Visao Geral (home). Redirect preserva
// favoritos/links antigos apontando para /analise.
export default function AnaliseRedirect() {
  redirect("/")
}
