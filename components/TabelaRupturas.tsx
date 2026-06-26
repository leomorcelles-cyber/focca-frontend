"use client"

const STATUS_COR: Record<string, string> = {
  RUPTURA: "var(--red)",
  CRITICO: "var(--orange)",
  ALTO: "var(--yellow)",
  MEDIO: "#60a5fa",
  OK: "var(--green)",
  "SEM GIRO": "var(--muted)",
}

export default function TabelaRupturas({ dados }: { dados: any[] }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 500 }}>Monitoramento de SKUs</h2>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Produto", "Cor", "Tam", "Modelo", "Marca", "Coleção", "Saldo", "Preço", "Custo", "Margem", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "var(--muted)", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((row, i) => {
              const margem = row.preco_venda && row.preco_custo
                ? ((row.preco_venda - row.preco_custo) / row.preco_venda * 100).toFixed(1)
                : "-"
              return (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#ffffff08")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 12px", maxWidth: "200px" }}>
                    <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.descricao_basica || row.nome}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>{row.sexo}</div>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{row.cor}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{row.tamanho}</td>
                  <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{row.modelo}</td>
                  <td style={{ padding: "10px 12px" }}>{row.marca}</td>
                  <td style={{ padding: "10px 12px", color: "var(--muted)", fontSize: "12px" }}>{row.colecao}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 500, textAlign: "right" }}>{row.saldo_atual}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>R$ {Number(row.preco_venda || 0).toFixed(2)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>R$ {Number(row.preco_custo || 0).toFixed(2)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--green)" }}>{margem}%</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 500, color: STATUS_COR[row.status] || "var(--muted)", border: `1px solid ${STATUS_COR[row.status] || "var(--muted)"}` }}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}