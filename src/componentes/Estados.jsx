import { Inbox, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { TONOS } from "../tonos.js";

// Estados de pantalla: carga, vacío, error y éxito. Mismo acabado en toda la app.
const SOLO_LECTORES = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };

function BotonPrincipal({ texto, onClick, icono: Icono }) {
  return (
    <button type="button" onClick={onClick}
      style={{ marginTop: 18, minHeight: 48, borderRadius: 14, padding: "0 22px", border: 0, color: "#fff", backgroundColor: "#2350F5", fontSize: "1rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
      {Icono && <Icono size={18} aria-hidden="true" />}{texto}
    </button>
  );
}

function Baldosa({ icono: Icono, tono }) {
  const t = TONOS[tono];
  return (
    <span style={{ width: 64, height: 64, borderRadius: 20, background: t.bg, boxShadow: `inset 0 0 0 1px ${t.aro}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <Icono size={30} color={t.fg} aria-hidden="true" />
    </span>
  );
}

function Caja({ children, estilo, rol }) {
  return (
    <div role={rol} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "36px 22px", margin: "8px 0", borderRadius: 22, ...estilo }}>
      {children}
    </div>
  );
}

const TITULO = { fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.125rem", letterSpacing: "-0.01em", lineHeight: 1.25, marginTop: 14 };
const MENSAJE = { fontSize: "0.9375rem", color: "#4A5372", lineHeight: 1.5, marginTop: 6, maxWidth: 320 };

// filas > 0: esqueleto de lista (mientras llegan fichas). filas = 0: indicador circular con texto.
export function EstadoCarga({ texto = "Cargando…", filas = 0 }) {
  if (filas > 0) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={SOLO_LECTORES}>{texto}</span>
        {Array.from({ length: filas }, (_, i) => <div key={i} className="zona-esqueleto" style={{ height: 92, borderRadius: 20 }} />)}
      </div>
    );
  }
  return (
    <Caja rol="status">
      <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: "50%", border: "3px solid #E3E7F1", borderTopColor: "#2350F5", animation: "zona-giro .8s linear infinite" }} />
      <p style={{ ...MENSAJE, marginTop: 14, fontWeight: 600 }}>{texto}</p>
    </Caja>
  );
}

export function EstadoVacio({ icono = Inbox, tono = "azul", titulo, mensaje, accion }) {
  return (
    <Caja estilo={{ background: "linear-gradient(180deg,#FAFBFE,#F3F6FB)", border: "1.5px dashed #CFD6E8" }}>
      <Baldosa icono={icono} tono={tono} />
      <p style={{ ...TITULO, color: "#0B1437" }}>{titulo}</p>
      {mensaje && <p style={MENSAJE}>{mensaje}</p>}
      {accion && <BotonPrincipal texto={accion.texto} onClick={accion.onClick} />}
    </Caja>
  );
}

export function EstadoError({ titulo = "No pudimos cargar esto", mensaje = "Revisá tu conexión e intentá de nuevo.", onReintentar }) {
  return (
    <Caja rol="alert" estilo={{ background: "#FDF1EF", border: "1px solid #F3CFCB" }}>
      <Baldosa icono={AlertTriangle} tono="rojo" />
      <p style={{ ...TITULO, color: "#9A3B34" }}>{titulo}</p>
      <p style={MENSAJE}>{mensaje}</p>
      {onReintentar && <BotonPrincipal texto="Reintentar" onClick={onReintentar} icono={RefreshCw} />}
    </Caja>
  );
}

export function EstadoExito({ titulo, mensaje, accion }) {
  return (
    <Caja rol="status" estilo={{ background: "#F1FAF5", border: "1px solid #CDEBDA" }}>
      <Baldosa icono={CheckCircle2} tono="verde" />
      <p style={{ ...TITULO, color: "#1E6B44" }}>{titulo}</p>
      {mensaje && <p style={MENSAJE}>{mensaje}</p>}
      {accion && <BotonPrincipal texto={accion.texto} onClick={accion.onClick} />}
    </Caja>
  );
}
