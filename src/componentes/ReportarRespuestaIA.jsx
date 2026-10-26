import { useState } from "react";
import { Flag } from "lucide-react";
import DialogoAdvertencia from "./DialogoAdvertencia.jsx";
import { soporteApi, getToken } from "../api.js";

// «Reportar» una respuesta de la IA sin salir de la app (Google Play lo exige a las apps con IA generativa).
// Va como una consulta a Soporte con el motivo «Respuesta de la IA»: el equipo la ve en su panel y la persona la sigue en Soporte → Mis consultas.
// Solo se envía lo que la persona ve en el diálogo: la respuesta de la IA, lo que ella escribió y, si quiere, una nota.
// Uso: <ReportarRespuestaIA texto={respuesta} pregunta={lo que escribió} contexto="Dónde apareció" />
export default function ReportarRespuestaIA({ texto, pregunta = "", contexto = "Respuesta de la IA en Mi Zona" }) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(""); // texto de resultado: enviado o error

  const abrir = () => {
    if (!getToken()) { setAviso("Para reportar una respuesta necesitás entrar a tu cuenta."); return; }
    setAviso(""); setNota(""); setAbierto(true);
  };
  const enviar = async () => {
    setCargando(true);
    try {
      const mensaje = [contexto, pregunta && `Lo que se escribió: ${pregunta}`, `Respuesta de la IA: ${texto}`, nota.trim() && `Qué estuvo mal: ${nota.trim()}`].filter(Boolean).join("\n\n").slice(0, 1900);
      await soporteApi.enviar({ motivo: "ia", asunto: "Respuesta de la IA reportada", mensaje, tecnico: "reporte-ia" });
      setAviso("Gracias. El equipo va a revisar esta respuesta.");
    } catch (e) {
      setAviso(e?.status === 429 ? "Ya enviaste varios reportes seguidos. Probá de nuevo en un rato." : "No pudimos enviar el reporte. Probá de nuevo en un momento.");
    } finally { setCargando(false); setAbierto(false); }
  };

  return (
    <>
      <button type="button" onClick={abrir} aria-label="Reportar esta respuesta de la IA" className="inline-flex items-center gap-1 mt-1"
        style={{ minHeight: 44, padding: "0 6px", fontSize: "0.8125rem", fontWeight: 600, color: "#4A5372" }}>
        <Flag size={13} aria-hidden="true" /> Reportar respuesta
      </button>
      {aviso && <p role="status" className="text-xs" style={{ color: "#4A5372", lineHeight: 1.4, maxWidth: 280 }}>{aviso}</p>}
      {abierto && (
        <DialogoAdvertencia titulo="Reportar esta respuesta" textoAceptar="Enviar reporte" cargando={cargando} onAceptar={enviar} onCancelar={() => setAbierto(false)}
          queHace="Le envía al equipo de Mi Zona esta respuesta de la IA y lo que escribiste, para que la revise."
          paraQue="Para corregir respuestas ofensivas, engañosas o equivocadas y mejorar los filtros de la IA."
          queSucedera="El equipo la revisa y puede seguir el tema en Soporte → Mis consultas. Solo se envía lo que ves acá, junto con tu cuenta.">
          <label style={{ display: "block" }}>
            <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0B1437" }}>¿Qué estuvo mal? (opcional)</span>
            <textarea value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} rows={3}
              style={{ width: "100%", marginTop: 6, border: "1px solid #CFD6E8", borderRadius: 12, padding: 10, fontSize: "1rem", color: "#0B1437" }} />
          </label>
        </DialogoAdvertencia>
      )}
    </>
  );
}
