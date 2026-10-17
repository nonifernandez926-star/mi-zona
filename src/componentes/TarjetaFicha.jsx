import { useState } from "react";
import { MapPin, ChevronRight, Store, Heart } from "lucide-react";
import { TONOS } from "../tonos.js";
import ChipEstado from "./ChipEstado.jsx";
import { usePulsacionLarga, ESTILO_PULSACION } from "../compartir.js";

// Tarjeta breve de una ficha (negocio, oficio, alquiler...). Al tocarla se abre el detalle (onAbrir).
// imagen: foto o logo opcional; sin imagen (o si falla) se muestra una baldosa con el icono.
// onCompartir: si se pasa, mantener apretada la tarjeta abre el menú de compartir. onFavorito + esFavorito: corazón para guardar.
// estado: clave de ChipEstado (activa, pausada, vencida, disponibleHoy, ocupado...). datoClave: lo más útil de un vistazo.
export default function TarjetaFicha({ titulo, zona, datoClave, estado, estadoTexto, imagen, icono: Icono = Store, tono = "azul", onAbrir, onCompartir, onFavorito, esFavorito = false }) {
  const [falla, setFalla] = useState(false);
  const t = TONOS[tono] || TONOS.azul;
  const lado = 68;
  const pulsacion = usePulsacionLarga(onCompartir);
  return (
    <div style={{ position: "relative" }}>
    <button
      type="button" onClick={onAbrir} {...pulsacion}
      className="w-full text-left flex items-center gap-3"
      style={{ background: "#fff", border: "1px solid #E3E7F1", borderRadius: 20, padding: 12, paddingRight: onFavorito ? 60 : 12, minHeight: 92, boxShadow: "0 1px 2px rgba(11,20,55,.04)", ...(onCompartir ? ESTILO_PULSACION : {}) }}
    >
      {imagen && !falla ? (
        <img src={imagen} alt="" loading="lazy" onError={() => setFalla(true)}
          style={{ width: lado, height: lado, borderRadius: 16, objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <span style={{ width: lado, height: lado, borderRadius: 16, flexShrink: 0, background: t.bg, boxShadow: `inset 0 0 0 1px ${t.aro}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icono size={28} color={t.fg} aria-hidden="true" />
        </span>
      )}

      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.0625rem", letterSpacing: "-0.015em", color: "#0B1437", lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{titulo}</span>
        {zona && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.875rem", color: "#4A5372", minWidth: 0 }}>
            <MapPin size={14} color="#4A5372" aria-hidden="true" />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{zona}</span>
          </span>
        )}
        {(datoClave || estado) && (
          <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px 10px", marginTop: 2 }}>
            {datoClave && <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0B1437" }}>{datoClave}</span>}
            {estado && <ChipEstado estado={estado} texto={estadoTexto} compacto />}
          </span>
        )}
      </span>
      {!onFavorito && <ChevronRight size={20} color="#8D95B0" aria-hidden="true" style={{ flexShrink: 0 }} />}
    </button>
    {onFavorito && (
      <button type="button" onClick={onFavorito} aria-label={esFavorito ? "Quitar de favoritos" : "Guardar en favoritos"} aria-pressed={esFavorito}
        style={{ position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)", width: 48, height: 48, borderRadius: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", background: esFavorito ? "#FDF1EF" : "transparent" }}>
        <Heart size={22} color={esFavorito ? "#E5484D" : "#64748B"} fill={esFavorito ? "#E5484D" : "none"} aria-hidden="true" />
      </button>
    )}
    </div>
  );
}
