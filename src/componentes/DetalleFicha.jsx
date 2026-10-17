import { useState } from "react";
import { ArrowLeft, Store } from "lucide-react";
import { TONOS } from "../tonos.js";
import ChipEstado from "./ChipEstado.jsx";

// Subpantalla de detalle de una ficha. Cabecera marino con "Volver", tarjeta de presentación y secciones (children).
// acciones: botones de ícono arriba a la derecha, p. ej. [{ icono: Share2, etiqueta: "Compartir", onClick }]; con activo (true/false) el ícono se rellena (p. ej. el corazón de favoritos). Solo se dibujan los que pasas.
// pie: contenido fijo abajo (botones de contacto). contexto: texto corto de la cabecera ("Oficio", "Alquiler").
// Al abrirla desde la app, conéctala con useAtrasDeCapas para que el botón "atrás" de Android la cierre.
export default function DetalleFicha({ titulo, subtitulo, imagen, icono: Icono = Store, tono = "azul", estado, estadoTexto, contexto, acciones = [], pie, onVolver, children }) {
  const [falla, setFalla] = useState(false);
  const t = TONOS[tono] || TONOS.azul;
  const botonCabecera = { width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,.1)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh" }}>
      <div data-conservar-color className="sticky top-0 z-30" style={{ backgroundColor: "var(--azul-oscuro)" }}>
        <div className="max-w-3xl mx-auto px-4 pb-3 flex items-center gap-3" style={{ paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
          <button type="button" onClick={onVolver} aria-label="Volver" style={botonCabecera}><ArrowLeft size={20} color="#fff" aria-hidden="true" /></button>
          <p className="flex-1 min-w-0" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.0625rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contexto}</p>
          {acciones.map(({ icono: I, etiqueta, onClick, activo }) => (
            <button key={etiqueta} type="button" onClick={onClick} aria-label={etiqueta} aria-pressed={activo === undefined ? undefined : !!activo} style={botonCabecera}><I size={20} color={activo ? "#FF8A8F" : "#fff"} fill={activo ? "#FF8A8F" : "none"} aria-hidden="true" /></button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4" style={{ paddingTop: 16, paddingBottom: pie ? "calc(104px + env(safe-area-inset-bottom, 0px))" : "calc(32px + env(safe-area-inset-bottom, 0px))" }}>
        <div style={{ background: "#fff", border: "1px solid #E3E7F1", borderRadius: 22, padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
          {imagen && !falla ? (
            <img src={imagen} alt="" onError={() => setFalla(true)} style={{ width: 76, height: 76, borderRadius: 18, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <span style={{ width: 76, height: 76, borderRadius: 18, flexShrink: 0, background: t.bg, boxShadow: `inset 0 0 0 1px ${t.aro}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Icono size={32} color={t.fg} aria-hidden="true" />
            </span>
          )}
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <h1 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.375rem", letterSpacing: "-0.02em", color: "#0B1437", lineHeight: 1.15 }}>{titulo}</h1>
            {subtitulo && <p style={{ fontSize: "0.9375rem", color: "#4A5372", lineHeight: 1.4 }}>{subtitulo}</p>}
            {estado && <ChipEstado estado={estado} texto={estadoTexto} />}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>{children}</div>
      </div>

      {pie && (
        <div className="fixed bottom-0 left-0 right-0 z-30" style={{ background: "#fff", borderTop: "1px solid #E3E7F1", padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="max-w-3xl mx-auto" style={{ display: "flex", gap: 10 }}>{pie}</div>
        </div>
      )}
    </div>
  );
}

// Bloque con título para agrupar información dentro del detalle.
export function SeccionDetalle({ titulo, icono: Icono, children }) {
  return (
    <section style={{ background: "#fff", border: "1px solid #E3E7F1", borderRadius: 20, padding: 16 }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: "1.0625rem", color: "#0B1437" }}>
        {Icono && <Icono size={18} color="#4A5372" aria-hidden="true" />}{titulo}
      </h2>
      <div style={{ marginTop: 10, fontSize: "0.9375rem", color: "#4A5372", lineHeight: 1.55 }}>{children}</div>
    </section>
  );
}

// Una línea "etiqueta + valor" (zona, horario, precio...). No se dibuja si no hay valor.
export function FilaDato({ icono: Icono, etiqueta, valor }) {
  if (!valor) return null;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
      {Icono && <Icono size={18} color="#4A5372" aria-hidden="true" style={{ marginTop: 2 }} />}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: "0.8125rem", color: "#4A5372" }}>{etiqueta}</p>
        <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0B1437", overflowWrap: "anywhere" }}>{valor}</p>
      </div>
    </div>
  );
}
