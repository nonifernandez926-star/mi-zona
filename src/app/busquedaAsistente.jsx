// Pantalla de búsqueda con el asistente de IA.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useState } from "react";
import { Building2, ChevronDown, Home, Search, Send, Star, Wrench } from "lucide-react";
import { getPrivacidad } from "../api.js";
import ReportarRespuestaIA from "../componentes/ReportarRespuestaIA.jsx";
import { BotonAtras } from "../cuenta.jsx";
import { leerZona } from "../oficios.jsx";
import { buscarConAsistente } from "./servidor.js";
import { catInfo, fmtDistance, uid } from "./utilidades.js";

/* ---------- chat con el asistente del negocio ---------- */

export function BusquedaAsistenteScreen({ onBack, businesses, onOpenBusiness, onOpenOficio, onOpenAlquiler, userLoc, onUbicacion }) {
  // La búsqueda usa la ubicación de la persona (el navegador le pide permiso). Los chats con negocios los lee el servidor desde la cuenta, no esta pantalla.
  const obtenerUbicacion = () => new Promise((resolve) => {
    if (userLoc) return resolve(userLoc);
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }; onUbicacion && onUbicacion(loc); resolve(loc); },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  });
  const [messages, setMessages] = useState([
    { id: uid(), rol: "asistente", texto: "¡Hola! Contame qué estás buscando y te ayudo a encontrarlo en Mi Zona.", negocios: [] },
  ]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const enviar = async () => {
    const contenido = text.trim();
    if (!contenido || sending) return;
    const historialActual = messages;
    const msgCliente = { id: uid(), rol: "cliente", texto: contenido, negocios: [] };
    setMessages((prev) => [...prev, msgCliente]);
    setText("");
    setSending(true);
    try {
      const priv = getPrivacidad(); // lo que la persona eligió en Privacidad
      const ubicacion = priv.ubicacionBusqueda ? await obtenerUbicacion() : null;
      // Los chats con negocios NO se mandan desde acá: el servidor los lee de tu cuenta (y solo si lo permitís en Privacidad)
      const z = leerZona(), l = z?.loc, zona = {};
      if (l && z.alcance === "localidad") zona.localidadId = l.localidadId;
      if (l && z.alcance === "departamento") zona.departamentoId = l.departamentoId;
      if (l && z.alcance === "provincia") zona.provinciaId = l.provinciaId;
      const data = await buscarConAsistente(contenido, historialActual, { ubicacion, zona });
      const msgAsistente = { id: uid(), rol: "asistente", texto: data.respuesta, negocios: data.negocios || [], resultados: data.resultados || [] };
      setMessages((prev) => [...prev, msgAsistente]);
    } catch {
      setMessages((prev) => [...prev, { id: uid(), rol: "asistente", texto: "No pude buscar en este momento. Probá de nuevo en un rato.", negocios: [] }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80]" style={{ backgroundColor: "#F3F5FA", display: "flex", flexDirection: "column" }}>
      <div style={{ backgroundColor: "var(--azul-oscuro)" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BotonAtras onClick={onBack} />
          <div className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, var(--azul), var(--azul-claro))" }}>
            <Search size={16} color="#fff" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)" }}>Asistente de búsqueda</p>
            <p className="text-[11px]" style={{ color: "var(--azul-palido)" }}>Te ayudo a encontrar lo que necesitás</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 flex flex-col gap-3 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col" style={{ alignItems: m.rol === "cliente" ? "flex-end" : "flex-start" }}>
            <div
              className="px-3.5 py-2.5 text-sm"
              style={{
                maxWidth: "85%", borderRadius: 14,
                backgroundColor: m.rol === "cliente" ? "var(--azul)" : "#fff",
                color: m.rol === "cliente" ? "#fff" : "#0B1437",
                border: m.rol === "cliente" ? "none" : "1px solid #E3E7F1",
                borderBottomRightRadius: m.rol === "cliente" ? 4 : 14,
                borderBottomLeftRadius: m.rol === "cliente" ? 14 : 4,
              }}
            >
              {m.texto}
            </div>
            {m.rol !== "cliente" && m.id !== messages[0]?.id && <ReportarRespuestaIA texto={m.texto} pregunta={messages[messages.findIndex((x) => x.id === m.id) - 1]?.texto || ""} contexto="Búsqueda con asistente" />}
            {(m.resultados?.length > 0 || m.negocios?.length > 0) && (
              <div className="flex flex-col gap-2 mt-2" style={{ maxWidth: "85%", width: "100%" }}>
                {(m.resultados?.length ? m.resultados : m.negocios.map((id) => ({ tipo: "negocio", id }))).map((r) => {
                  let titulo = "", detalle = "", icono = Building2, color = "var(--azul)", abrir = null;
                  if (r.tipo === "negocio") {
                    const biz = businesses.find((b) => b.id === r.id);
                    if (!biz) return null;
                    const c = catInfo(biz.cat);
                    titulo = biz.name; icono = c?.icon || Building2; color = c?.color || "var(--azul)"; abrir = () => onOpenBusiness(r.id);
                    detalle = [c?.label, biz.zone, typeof r.km === "number" ? `a ${fmtDistance(r.km)}` : ""].filter(Boolean).join(" · ");
                  } else if (r.tipo === "oficio" && r.ficha) {
                    titulo = r.ficha.nombre; icono = Wrench; color = "#E8741A"; abrir = () => onOpenOficio(r.id);
                    detalle = ["Oficio", (r.ficha.rubros || []).slice(0, 2).map((x) => x.label).join(", "), r.ficha.localidad].filter(Boolean).join(" · ");
                  } else if (r.tipo === "alquiler" && r.ficha) {
                    titulo = r.ficha.nombre; icono = Home; color = "#7B4FD6"; abrir = () => onOpenAlquiler(r.id);
                    detalle = ["Alquiler", (r.ficha.tipos || []).slice(0, 2).map((x) => x.label).join(", "), r.ficha.localidad].filter(Boolean).join(" · ");
                  } else return null;
                  const Icono = icono;
                  return (
                    <button
                      key={`${r.tipo}-${r.id}`}
                      onClick={abrir}
                      className="flex items-center gap-3 p-3 text-left bg-white"
                      style={{ borderRadius: 12, border: "1px solid #E3E7F1", boxShadow: "0 3px 10px rgba(11,20,55,0.07)" }}
                    >
                      <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 10, background: color }}>
                        <Icono size={18} color="#fff" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{titulo}</span>
                        <span className="block text-xs truncate" style={{ color: "#5B6482" }}>{detalle}</span>
                        {r.tipo === "negocio" && r.cantidad > 0 && (
                          <span className="flex items-center gap-1 text-xs mt-0.5" style={{ color: "#5B6482" }}>
                            <Star size={12} color="#F5A623" fill="#F5A623" aria-hidden="true" /> {String(r.promedio).replace(".", ",")} ({r.cantidad} {r.cantidad === 1 ? "reseña" : "reseñas"})
                          </span>
                        )}
                        {r.tipo !== "negocio" && typeof r.ficha?.disponibilidad === "string" && r.ficha.disponibilidad && (
                          <span className="block text-xs mt-0.5" style={{ color: "#5B6482" }}>{r.ficha.disponibilidad}</span>
                        )}
                      </span>
                      <ChevronDown size={14} color="var(--azul)" style={{ transform: "rotate(-90deg)" }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex" style={{ justifyContent: "flex-start" }}>
            <div className="px-3.5 py-2.5 text-sm" style={{ borderRadius: 14, borderBottomLeftRadius: 4, backgroundColor: "#fff", border: "1px solid #E3E7F1", color: "#5B6482" }}>
              Buscando...
            </div>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: "#fff", borderTop: "1px solid #E3E7F1" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <input aria-label="Ej: quiero comer una hamburguesa..."
            value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
            placeholder="Ej: quiero comer una hamburguesa..."
            className="flex-1 px-4 py-2.5 text-sm outline-none"
            style={{ borderRadius: 24, border: "1px solid #E3E7F1", backgroundColor: "#F3F5FA", color: "#0B1437" }}
          />
          <button
            onClick={enviar} disabled={sending || !text.trim()}
            className="flex items-center justify-center shrink-0"
            style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--azul)", opacity: sending || !text.trim() ? 0.5 : 1 }}
          >
            <Send size={16} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}
