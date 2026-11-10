// Tarjeta de negocio de las listas.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { Eye, Heart, MapPin, Navigation, Sparkles, Star, Tag, Trophy } from "lucide-react";
import { ESTILO_PULSACION, usePulsacionLarga } from "../compartir.js";
import { activeDiscounts, avgRating, esNegocioNuevo } from "./negocios.js";
import { OpenBadge, Photo } from "./piezas.jsx";
import { catInfo, fmtDistance, fmtNum, mapsLink, shareBusiness } from "./utilidades.js";

/* ---------- ficha pública del negocio ---------- */

export function BusinessCard({ biz, onOpen, onOpenPhoto, distanceKm, rank, isFavorite, onToggleFavorite, onTrack }) {
  const pulsacion = usePulsacionLarga(() => shareBusiness(biz));
  const c = catInfo(biz.cat);
  const rating = avgRating(biz.reviews);
  const discounts = activeDiscounts(biz);
  const rankColor = rank === 1 ? "#D98A0B" : rank === 2 ? "#667892" : rank === 3 ? "#B0643A" : "#0B1437";
  return (
    <div
      role="button" tabIndex={0}
      onClick={() => onOpen(biz.id)}
      onKeyDown={(e) => (e.key === "Enter" ? onOpen(biz.id) : null)} {...pulsacion}
      className="bg-white flex flex-col overflow-hidden text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl"
      style={{ borderRadius: 22, border: "1px solid #E3E7F1", boxShadow: "0 1px 2px rgba(11,20,55,.04)", ...ESTILO_PULSACION }}
    >
      <div className="relative">
        <Photo cat={biz.cat} src={biz.portada || biz.logo || null} height={176} radius="0px" iconSize={42} clickable={false} />
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: 84, background: "linear-gradient(to top, rgba(8,18,38,0.62), rgba(8,18,38,0))" }} />

        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1" style={{ background: "#ffffffee", color: "#0B1437", borderRadius: 20, boxShadow: "0 2px 8px rgba(0,0,0,.15)", backdropFilter: "blur(6px)" }}>
            <span className="rounded-full" style={{ width: 7, height: 7, background: c?.color }} /> {c?.label}
          </span>
          {discounts.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1" style={{ background: "linear-gradient(135deg,#E5484D,#F2766B)", color: "#fff", borderRadius: 20, boxShadow: "0 3px 10px rgba(229,72,77,.4)" }}>
              <Tag size={11} /> {discounts[0].percent ? `${discounts[0].percent} OFF` : "Promo"}
            </span>
          )}
        </div>

        {rank && (
          <span className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1" style={{ background: rankColor, color: "#fff", borderRadius: 20, boxShadow: "0 3px 10px rgba(0,0,0,0.3)" }}>
            <Trophy size={11} /> Top {rank}
          </span>
        )}

        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(biz.id); }}
            aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
            className="absolute bottom-3 right-3 flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.25)", transition: "transform 0.15s ease", transform: isFavorite ? "scale(1.1)" : "scale(1)" }}
          >
            <Heart size={17} color={isFavorite ? "#E5484D" : "#64748B"} fill={isFavorite ? "#E5484D" : "none"} />
          </button>
        )}
      </div>

      <div className="px-4 pt-3.5 pb-3.5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.015em", color: "#0B1437", lineHeight: 1.25 }}>{biz.name}</h3>
          {biz.featured && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 shrink-0" style={{ background: "#FFF3D6", color: "#8A5B12", borderRadius: 8 }}>
              <Star size={10} fill="#C98A14" color="#C98A14" /> Destacado
            </span>
          )}
        </div>
        <p className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[13px] mt-1.5" style={{ color: "#5B6482" }}>
          {rating ? (
            <>
              <Star size={14} fill="#F5B83D" color="#F5B83D" />
              <b style={{ color: "#0B1437" }}>{String(rating).replace(".", ",")}</b>
              <span>({biz.reviews.length} {biz.reviews.length === 1 ? "reseña" : "reseñas"})</span>
            </>
          ) : <span>Sin reseñas todavía</span>}
          {typeof distanceKm === "number" && <><span aria-hidden="true">·</span><span className="flex items-center gap-1 font-semibold" style={{ color: "#0B1437" }}><Navigation size={12} /> A {fmtDistance(distanceKm)} de vos</span></>}
        </p>
        <p className="text-sm mt-2 mb-3 flex-1" style={{ color: "#5B6482", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{biz.desc}</p>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <OpenBadge weekHours={biz.weekHours} />
          {esNegocioNuevo(biz) && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1" style={{ borderRadius: 20, background: "#E4F3EA", color: "#1E6B44" }}>
              <Sparkles size={11} /> Nuevo
            </span>
          )}
          {c?.label && <span className="text-[11px] font-semibold px-2.5 py-1" style={{ borderRadius: 20, background: "#F1F4FA", color: "#5B6482" }}>{c.label}</span>}
        </div>

        <div className="flex items-center justify-between gap-3 pt-3" style={{ borderTop: "1px solid #EEF0F6" }}>
          <a
            href={mapsLink(biz.loc, biz.zone)} target="_blank" rel="noreferrer"
            onClick={(e) => { e.stopPropagation(); onTrack && onTrack(biz.id, "ubicacion"); }}
            className="flex items-center gap-1.5 text-xs min-w-0 hover:underline" style={{ color: "#5B6482" }}
          >
            <MapPin size={13} color="var(--azul)" className="shrink-0" /> <span className="truncate">{biz.loc}</span>
          </a>
          <span className="flex items-center gap-1 text-[11px] shrink-0" style={{ color: "#64748B" }}>
            <Eye size={12} /> {fmtNum(biz.views)}
          </span>
        </div>
      </div>
    </div>
  );
}
