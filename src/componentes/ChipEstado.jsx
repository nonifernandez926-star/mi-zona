// Chip de estado reutilizable para fichas, artículos y publicaciones.
// Todos los pares de color superan contraste 4,5:1. El estado siempre se dice con texto, no solo con color.
const ESTADOS = {
  activa: { texto: "Activa", fg: "#1E6B44", bg: "#E4F3EA", punto: "#2C9A5F" },
  disponible: { texto: "Disponible", fg: "#1E6B44", bg: "#E4F3EA", punto: "#2C9A5F" },
  disponibleHoy: { texto: "Disponible hoy", fg: "#1E6B44", bg: "#E4F3EA", punto: "#2C9A5F" },
  ocupado: { texto: "Ocupado", fg: "#8A5B12", bg: "#FFF3D6", punto: "#E08A12" },
  pendiente: { texto: "Sin activar", fg: "#8A5B12", bg: "#FFF3D6", punto: "#E08A12" },
  pausada: { texto: "Pausada", fg: "#4A5372", bg: "#EEF1F8", punto: "#8D95B0" },
  sinConfirmar: { texto: "Sin confirmar", fg: "#4A5372", bg: "#EEF1F8", punto: "#8D95B0" },
  yaNoLoTengo: { texto: "Ya no lo tengo", fg: "#4A5372", bg: "#EEF1F8", punto: "#8D95B0" },
  vencida: { texto: "Vencida", fg: "#9A3B34", bg: "#FDF1EF", punto: "#C1443A" },
  cancelado: { texto: "Cancelado", fg: "#9A3B34", bg: "#FDF1EF", punto: "#C1443A" },
  reprogramado: { texto: "Reprogramado", fg: "#8A5B12", bg: "#FFF3D6", punto: "#E08A12" },
  resuelta: { texto: "Resuelta", fg: "#1B3FB8", bg: "#EDF1FF", punto: "#2350F5" },
  noVerificado: { texto: "No verificado", fg: "#8A5B12", bg: "#FFF3D6", punto: "#E08A12" },
};

export const ESTADOS_FICHA = Object.keys(ESTADOS);

export default function ChipEstado({ estado, texto, compacto = false }) {
  const e = ESTADOS[estado];
  if (!e) return null;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        borderRadius: 999, padding: compacto ? "2px 8px" : "4px 11px",
        fontSize: compacto ? "0.75rem" : "0.8125rem", fontWeight: 700, lineHeight: 1.35,
        color: e.fg, background: e.bg,
      }}
    >
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: e.punto, flexShrink: 0 }} />
      {texto || e.texto}
    </span>
  );
}
