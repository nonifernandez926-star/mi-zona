// Lista de negocios favoritos.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { Heart, Star } from "lucide-react";
import { BotonAtras } from "../cuenta.jsx";
import { avgRating } from "./negocios.js";
import { OpenBadge, Photo } from "./piezas.jsx";
import { catInfo } from "./utilidades.js";

function FavoritosScreen({ businesses, favorites, onToggleFavorite, onOpenBusiness, onBack }) {
  const guardados = businesses.filter((b) => favorites.includes(b.id) && b.kind !== "job");

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <BotonAtras onClick={onBack} tono="oscuro" size={36} />
        <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 500, fontSize: 16, color: "#0B1437" }}>Favoritos</p>
      </div>
      <p className="text-xs mb-5" style={{ color: "#5B6482" }}>Tus negocios guardados</p>

      {guardados.length === 0 ? (
        <div className="text-center py-14">
          <span className="flex items-center justify-center mx-auto mb-3" style={{ width: 52, height: 52, borderRadius: "50%", background: "#FDF1EF" }}>
            <Heart size={22} color="#C1443A" />
          </span>
          <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>Todavía no guardaste ningún negocio</p>
          <p className="text-xs" style={{ color: "#5B6482" }}>Tocá el corazón en cualquier negocio para guardarlo acá.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {guardados.map((biz) => {
            const c = catInfo(biz.cat);
            const rating = avgRating(biz.reviews);
            return (
              <button
                key={biz.id}
                onClick={() => onOpenBusiness(biz.id)}
                className="w-full flex items-center gap-3 p-3 text-left bg-white"
                style={{ borderRadius: 14, border: "1px solid #E3E7F1", boxShadow: "0 3px 14px rgba(11,20,55,0.07)" }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
                  <Photo cat={biz.cat} src={biz.logo || biz.photos?.[0]} height={52} radius="12px" iconSize={22} clickable={false} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{biz.name}</p>
                  <p className="text-xs truncate mb-1" style={{ color: "#5B6482" }}>{c?.label} · {biz.zone}</p>
                  <div className="flex items-center gap-2">
                    {rating && (
                      <span className="flex items-center gap-0.5 text-xs" style={{ color: "#2B3768" }}>
                        <Star size={11} fill="#F5A623" color="#F5A623" /> {rating}
                      </span>
                    )}
                    <OpenBadge weekHours={biz.weekHours} compact />
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(biz.id); }}
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 36, height: 36, borderRadius: "50%", background: "#FDF1EF" }}
                >
                  <Heart size={16} color="#C1443A" fill="#C1443A" />
                </button>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
