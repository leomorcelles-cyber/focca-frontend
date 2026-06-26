type KpiCardProps = {
  label: string
  valor: string | number
  cor?: string
  bg?: string
  sub?: string
}

export default function KpiCard({ label, valor, cor, bg, sub }: KpiCardProps) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "20px 14px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      minWidth: 0,
    }}>
      <div style={{
        fontSize: "11px",
        color: "var(--muted)",
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.4px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: "16px",
        fontWeight: 600,
        color: cor || "var(--text)",
        lineHeight: 1.3,
      }}>
        {valor}
      </div>
      {sub && (
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>{sub}</div>
      )}
    </div>
  )
}