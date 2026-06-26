const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export async function fetchAPI(endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${API_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.append(k, v)
    })
  }
  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  kpis:           ()  => fetchAPI("/kpis"),
  kpisLojas:      ()  => fetchAPI("/kpis/lojas"),
  lojas:          ()  => fetchAPI("/lojas"),
  filtros:        ()  => fetchAPI("/filtros"),
  rupturas:       (p?: Record<string, string>) => fetchAPI("/rupturas", p),
  rupturasReal:   (p?: Record<string, string>) => fetchAPI("/rupturas/real", p),
  marcas:         ()  => fetchAPI("/marcas"),
  colecoes:       (p?: Record<string, string>) => fetchAPI("/colecoes", p),
  grade:          (p?: Record<string, string>) => fetchAPI("/grade", p),
  forecast:       (p?: Record<string, string>) => fetchAPI("/forecast", p),
  abc:            (p?: Record<string, string>) => fetchAPI("/abc", p),
  abcGiro:        (p?: Record<string, string>) => fetchAPI("/abc/giro", p),
  margem:         (p?: Record<string, string>) => fetchAPI("/margem", p),
  resumo:         ()  => fetchAPI("/resumo"),
  matriz:         (p?: Record<string, string>) => fetchAPI("/matriz", p),
  necessidade:    (p?: Record<string, string>) => fetchAPI("/compras/necessidade", p),
  transferencias: (p?: Record<string, string>) => fetchAPI("/transferencias", p),
  estoqueLoja:    (empresa: number, p?: Record<string, string>) => fetchAPI(`/estoque/loja/${empresa}`, p),
  receitaDiaria:  (p?: Record<string, string>) => fetchAPI("/receita/diaria", p),
  receitaConsol:  (p?: Record<string, string>) => fetchAPI("/receita/consolidada", p),
  giro:           (p?: Record<string, string>) => fetchAPI("/giro", p),
  vendedores:     (p?: Record<string, string>) => fetchAPI("/vendedores", p),
}