import { useEffect, useId, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { TONOS } from "../tonos.js";

// Diálogo de advertencia: explica qué hace la acción, para qué sirve y qué sucederá, antes de pedir Aceptar.
// Uso: {abierto && <DialogoAdvertencia titulo="..." queHace="..." paraQue="..." queSucedera="..." onAceptar={...} onCancelar={...} />}
// Con "peligro" el botón principal va en rojo (eliminar, suspender). Con "cargando" se bloquean los botones mientras se guarda.
export default function DialogoAdvertencia({
  titulo, queHace, paraQue, queSucedera, children,
  textoAceptar = "Aceptar", textoCancelar = "Cancelar",
  peligro = false, cargando = false, onAceptar, onCancelar,
}) {
  const idTitulo = useId();
  const botonCancelar = useRef(null);
  const cb = useRef({ onCancelar, cargando });
  cb.current = { onCancelar, cargando };

  useEffect(() => {
    // El foco empieza en "Cancelar": un toque sin querer no confirma nada.
    botonCancelar.current?.focus();
    const alTeclear = (ev) => { if (ev.key === "Escape" && !cb.current.cargando) cb.current.onCancelar?.(); };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  const bloques = [["Qué hace", queHace], ["Para qué sirve", paraQue], ["Qué sucederá", queSucedera]].filter(([, t]) => t);
  const tono = peligro ? TONOS.rojo : TONOS.naranja;
  const boton = { minHeight: 48, flex: "1 1 140px", borderRadius: 14, padding: "0 18px", fontSize: "1rem", fontWeight: 700, lineHeight: 1.2 };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "#0B1437cc" }}
      onClick={cargando ? undefined : onCancelar}
    >
      <div
        role="alertdialog" aria-modal="true" aria-labelledby={idTitulo}
        className="bg-white w-full max-w-sm"
        style={{ borderRadius: 24, padding: 22, maxHeight: "calc(100dvh - 32px)", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ width: 48, height: 48, borderRadius: 16, background: tono.bg, boxShadow: `inset 0 0 0 1px ${tono.aro}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <AlertTriangle size={24} color={tono.fg} aria-hidden="true" />
        </span>
        <h3 id={idTitulo} style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.01em", color: "#0B1437", marginTop: 14, lineHeight: 1.2 }}>{titulo}</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
          {bloques.map(([etiqueta, texto]) => (
            <div key={etiqueta}>
              <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0B1437" }}>{etiqueta}</p>
              <p style={{ fontSize: "0.9375rem", color: "#4A5372", lineHeight: 1.5, marginTop: 2 }}>{texto}</p>
            </div>
          ))}
          {children}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
          <button ref={botonCancelar} type="button" disabled={cargando} onClick={onCancelar}
            style={{ ...boton, border: "1px solid #CFD6E8", background: "#fff", color: "#0B1437" }}>
            {textoCancelar}
          </button>
          <button type="button" disabled={cargando} onClick={onAceptar}
            style={{ ...boton, border: 0, color: "#fff", backgroundColor: peligro ? "#C1443A" : "#2350F5" }}>
            {cargando ? "Un momento…" : textoAceptar}
          </button>
        </div>
      </div>
    </div>
  );
}
