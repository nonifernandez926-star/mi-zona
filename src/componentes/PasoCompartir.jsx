import { useState } from "react";
import { Share2, Check, Users } from "lucide-react";
import { compartirTexto, textoInvitacion, avisoDeCompartir } from "../compartir.js";
import { compartidoApi } from "../api.js";
import { useCodigoInvitacion } from "../invitaciones.js";

// Paso "Compartí Mi Zona" que aparece al terminar de activar un negocio, oficio o alquiler (Fase 6).
// Es parte del proceso: el botón grande es lo principal y "Ahora no" es chico. No bloquea nada: la ficha ya está activa.
// Lo único que la app puede saber es que el menú de compartir se abrió y se completó; NO puede saber si el mensaje llegó a alguien.
// Si la persona elige "Ahora no", en Mis fichas le queda un recordatorio hasta que comparta.
// tipo: "negocio" | "oficio" | "alquiler" · ficha: { id, nombre, imagen? } · onSalir: sigue el flujo (p. ej. ir a Mis fichas) · textoSalir: texto del botón de salida
export default function PasoCompartir({ tipo, ficha, onSalir, textoSalir = "Ir a Negocio" }) {
  const [estado, setEstado] = useState("inicial"); // inicial | compartido
  const [aviso, setAviso] = useState("");
  const [abriendo, setAbriendo] = useState(false);
  const codigo = useCodigoInvitacion();

  const compartir = async () => {
    setAbriendo(true); setAviso("");
    const r = await compartirTexto({ titulo: "Mi Zona", texto: textoInvitacion(ficha.nombre, codigo) });
    setAbriendo(false);
    if (r === "compartido") {
      setEstado("compartido");
      compartidoApi.marcar(tipo, ficha.id).catch(() => { /* si falla, queda el recordatorio en Mis fichas */ });
    } else {
      setAviso(avisoDeCompartir(r) || "");
    }
  };

  const hecho = estado === "compartido";
  return (
    <section aria-labelledby="titulo-compartir" className="mt-4" style={{ background: "#fff", border: "1px solid #C9D6FA", borderRadius: 22, padding: 18 }}>
      <div className="flex items-center gap-3">
        <span style={{ width: 48, height: 48, borderRadius: 16, background: hecho ? "#E4F3EA" : "#EDF1FF", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {hecho ? <Check size={24} color="#1E6B44" aria-hidden="true" /> : <Users size={24} color="#2350F5" aria-hidden="true" />}
        </span>
        <h2 id="titulo-compartir" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.1875rem", lineHeight: 1.2, color: "#0B1437" }}>
          {hecho ? "¡Listo! Ya compartiste Mi Zona" : "Último paso: que te encuentren"}
        </h2>
      </div>
      <p className="mt-3" style={{ fontSize: "1rem", lineHeight: 1.5, color: "#2B3768" }}>
        {hecho
          ? "Cuantas más personas la descarguen, más gente va a poder encontrarte. Podés volver a compartirla cuando quieras."
          : "Para que tus clientes puedan encontrarte, necesitan descargar Mi Zona. Compártela con ellos."}
      </p>

      <button type="button" onClick={compartir} disabled={abriendo} className="w-full mt-4"
        style={{ minHeight: 54, borderRadius: 16, border: hecho ? "1px solid #CFD6E8" : 0, background: hecho ? "#fff" : "#2350F5", color: hecho ? "#0B1437" : "#fff", fontWeight: 800, fontSize: "1.0625rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: abriendo ? 0.7 : 1 }}>
        <Share2 size={20} aria-hidden="true" /> {abriendo ? "Abriendo..." : hecho ? "Compartir de nuevo" : "Compartir Mi Zona"}
      </button>
      {aviso && <p role="status" className="mt-3 text-sm" style={{ color: "#6B4510", background: "#FFF3D6", borderRadius: 12, padding: 12, lineHeight: 1.45 }}>{aviso}</p>}

      {hecho ? (
        <button type="button" onClick={onSalir} className="w-full mt-3" style={{ minHeight: 52, borderRadius: 16, border: 0, background: "#2350F5", color: "#fff", fontWeight: 800, fontSize: "1rem" }}>{textoSalir}</button>
      ) : (
        <button type="button" onClick={onSalir} className="w-full mt-2" style={{ minHeight: 48, border: 0, background: "transparent", color: "#4A5372", fontWeight: 600, fontSize: "0.9375rem", textDecoration: "underline" }}>Ahora no</button>
      )}
      {!hecho && <p className="mt-1 text-center text-xs" style={{ color: "#6B7390", lineHeight: 1.4 }}>Si ahora no, te lo vamos a recordar en Negocio.</p>}
    </section>
  );
}
