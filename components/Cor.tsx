"use client"
// Amostra de cor + nome, para a cor ser lida SEM depender da foto.
//
// Motivo: o Microvix registra UMA foto por produto e a vincula a todas as cores —
// 8.847 das 10.650 URLs servem mais de um cod, e a mais reaproveitada aparece em
// 80. Auditado no caso real: "CAISETA BASICA MASC" LAGUNA MIST e VERDE CLARO
// apontam para o MESMO id_imagem. A camiseta verde aparece azul.
//
// Nao da' para consertar a foto (ela nao existe no ERP), entao a cor passa a se
// mostrar por conta propria. A bolinha sai do NOME — e' aproximacao honesta, nao
// leitura do pixel, por isso o nome continua do lado e manda.

// Nucleos de cor no vocabulario do cadastro. Ordem importa: os compostos antes
// dos simples, senao "VERDE AGUA" casaria em "VERDE".
const NUCLEOS: [RegExp, string][] = [
  [/OFF\s*WHITE|CRU\b|NATURAL/, "#f2efe6"],
  [/BRANC/, "#ffffff"],
  [/PRET|BLACK|ONYX/, "#1a1a1a"],
  [/CHUMB|GRAFIT/, "#4a4f55"],
  [/CINZ|MESCLA|GREY|GRAY/, "#9aa0a6"],
  [/MARINH|NAVY/, "#1b2a4a"],
  [/JEANS|DENIM|INDIGO/, "#3b5a80"],
  [/LAGUNA|TURQUES|TIFFANY|AQUA/, "#3fa8a0"],
  [/AZUL|BLUE|CELEST/, "#2f6fb5"],
  [/MILITAR|OLIVA|MUSGO/, "#5a6b3c"],
  [/VERDE|GREEN|MENTA/, "#3f9b52"],
  [/VINH|BORDO|MARSAL|BURGUND/, "#6e1f2e"],
  [/VERMELH|RED|CEREJ|RUB/, "#cc2b2b"],
  [/CORAL|SALMAO|SALMON/, "#f4796b"],
  [/ROSA|PINK|BLUSH/, "#e87aa4"],
  [/LILAS|LAVANDA|LILAC/, "#b39ddb"],
  [/ROX|VIOLET|PURP|UVA/, "#7b4ea3"],
  [/LARANJ|ORANGE|TANGERIN/, "#ef7d2e"],
  [/AMAREL|YELLOW|MOSTARD|OURO|GOLD/, "#e8b93a"],
  [/PAPRICA|PIMENT/, "#b8412e"],
  [/CARAMEL|CAMEL|WHISK|TERRACOT|TELHA|FERRUGEM|CANELA|MOCCA|MOCA\b/, "#a8632c"],
  [/MARRO|CHOCOLAT|CAFE|BROWN|TABACO/, "#6b4423"],
  [/PISTACHE/, "#a8c686"],
  [/MANTEIG|CREME|CHAMPAGNE|MARFIM|PEROLA/, "#f0e6cc"],
  [/BEGE|AREIA|NUDE|KHAKI|CAQUI|SAND/, "#cbb897"],
  [/VERY\s*PERI|PERIWINK/, "#6667ab"],
  [/PRATA|SILVER|METAL|BRILHO/, "#c0c4c8"],
  // "OFF" sozinho e' abreviacao de OFF WHITE no cadastro (1.596 pecas).
  // Vem por ULTIMO para nao roubar de "OFF WHITE", que ja casou la em cima.
  [/^OFF$/, "#f2efe6"],
]

// Nomes que NAO sao cor: nao ganham bolinha, porque uma bolinha ali mentiria.
// "UNICA" e' o maior volume do cadastro (7.098 pecas) e significa "sem variacao
// de cor"; "MIX DE CORES" e' estampa.
const NAO_E_COR = /^(UNICA|UNICO|MIX DE CORES|VARIAS|SORTIDO|ESTAMPAD[OA])$/

// CLARO/ESCURO ajustam o tom — sao o que mais distingue variantes do mesmo nucleo
// ("VERDE" x "VERDE CLARO"), e sem isso as duas sairiam identicas na tela.
function ajustar(hex: string, fator: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v =>
    Math.max(0, Math.min(255, Math.round(fator > 0 ? v + (255 - v) * fator : v * (1 + fator))))
  )
  return `#${c.map(v => v.toString(16).padStart(2, "0")).join("")}`
}

export function corDoNome(nome?: string | null): string | null {
  const n = (nome || "").toUpperCase().trim()
  if (!n || NAO_E_COR.test(n)) return null
  for (const [re, hex] of NUCLEOS) {
    if (re.test(n)) {
      if (/\bCLARO?\b|\bLIGHT\b|\bBEBE\b/.test(n)) return ajustar(hex, 0.35)
      if (/\bESCURO?\b|\bDARK\b/.test(n)) return ajustar(hex, -0.3)
      return hex
    }
  }
  return null   // nome que nao reconheco: melhor nada do que uma bolinha mentindo
}

export default function Cor({ nome, tam = 11, semNome = false }: {
  nome?: string | null, tam?: number, semNome?: boolean
}) {
  const hex = corDoNome(nome)
  if (!nome) return <span style={{ color: "var(--muted)" }}>—</span>
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", minWidth: 0 }}
      title={hex ? `${nome} (amostra aproximada pelo nome)` : nome}>
      {hex && (
        <span style={{
          width: `${tam}px`, height: `${tam}px`, borderRadius: "50%",
          background: hex, flexShrink: 0,
          border: "1px solid color-mix(in srgb, var(--text) 25%, transparent)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
        }} />
      )}
      {!semNome && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nome}</span>}
    </span>
  )
}
