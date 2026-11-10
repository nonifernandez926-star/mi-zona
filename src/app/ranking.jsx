// Ranking de negocios.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useMemo, useState } from "react";
import { ChevronDown, Crown, Eye, Heart, MapPin, Medal, Star, Trophy } from "lucide-react";
import { BotonAtras } from "../cuenta.jsx";
import { avgRating, rankedBusinesses, rankingScore } from "./negocios.js";
import { Photo } from "./piezas.jsx";
import { catInfo, fmtNum, tinte } from "./utilidades.js";

export function RankingScreen({ businesses, zone, onOpenBusiness, onBack }) {
  const [catFiltro, setCatFiltro] = useState(null);
  const enZona = useMemo(() => rankedBusinesses(businesses.filter((b) => b.zone === zone)), [businesses, zone]);
  const categoriasPresentes = useMemo(() => {
    const ids = [...new Set(enZona.map((b) => b.cat))];
    return ids.map((id) => catInfo(id)).filter(Boolean);
  }, [enZona]);
  const ranking = useMemo(() => (catFiltro ? enZona.filter((b) => b.cat === catFiltro) : enZona).slice(0, 20), [enZona, catFiltro]);
  const [oro, plata, bronce] = ranking;
  const resto = ranking.slice(3);
  const topScore = Math.max(1, ...ranking.map((b) => rankingScore(b)));
  const totalResenas = enZona.reduce((s, b) => s + (b.reviews?.length || 0), 0);
  const [verComo, setVerComo] = useState(false);

  const PODIO = {
    1: { alto: 118, color: "#F5B83D", aro: "linear-gradient(135deg,#FFE08A,#F5A623)", avatar: 78 },
    2: { alto: 84, color: "#C9D3E3", aro: "linear-gradient(135deg,#F1F5FA,#A9B6CB)", avatar: 64 },
    3: { alto: 66, color: "#E0975F", aro: "linear-gradient(135deg,#F6C9A2,#C97B4A)", avatar: 64 },
  };

  const Puesto = ({ biz, puesto }) => {
    if (!biz) return <div style={{ flex: 1 }} />;
    const st = PODIO[puesto];
    const rating = avgRating(biz.reviews);
    const c = catInfo(biz.cat);
    return (
      <button onClick={() => onOpenBusiness(biz.id)} className="flex flex-col items-center" style={{ flex: 1, minWidth: 0 }}>
        {puesto === 1 && <Crown size={24} color={st.color} fill={st.color} style={{ marginBottom: 4, filter: "drop-shadow(0 2px 6px rgba(245,184,61,.6))" }} />}
        <div className="relative" style={{ marginBottom: 8 }}>
          <div style={{ width: st.avatar + 8, height: st.avatar + 8, borderRadius: "50%", padding: 4, background: st.aro, boxShadow: `0 8px 22px ${st.color}66` }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#fff" }}>
              <Photo cat={biz.cat} src={biz.logo || biz.photos?.[0]} height={st.avatar} radius="50%" iconSize={st.avatar / 3} clickable={false} />
            </div>
          </div>
          <span className="absolute flex items-center justify-center text-[11px] font-bold" style={{ bottom: -4, right: -2, width: 24, height: 24, borderRadius: "50%", background: st.aro, color: "#0B1437", border: "2px solid #0B1437" }}>
            {puesto}
          </span>
        </div>
        <p className="text-xs font-semibold text-center leading-tight px-1" style={{ color: "#fff", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: "100%" }}>{biz.name}</p>
        <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--azul-palido)", maxWidth: "100%" }}>{c?.label}</p>
        <div className="flex items-center gap-2 mt-1.5 mb-2">
          {rating && (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: "#fff" }}>
              <Star size={10} fill="#F5B83D" color="#F5B83D" /> {rating}
            </span>
          )}
          <span className="text-[10px] font-bold px-1.5 py-0.5" style={{ borderRadius: 8, background: "#ffffff22", color: st.color }}>{Math.round(rankingScore(biz))} pts</span>
        </div>
        <div className="w-full flex items-start justify-center" style={{ height: st.alto, borderRadius: "16px 16px 0 0", background: `linear-gradient(180deg, ${st.color}55, ${st.color}08)`, border: `1px solid ${st.color}66`, borderBottom: "none", paddingTop: 10 }}>
          <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: puesto === 1 ? 40 : 32, lineHeight: 1, color: st.color, opacity: 0.9 }}>{puesto}</span>
        </div>
      </button>
    );
  };

  return (
    <div>
      {/* portada oscura con título y podio */}
      <div data-conservar-color className="relative overflow-hidden" style={{ background: "radial-gradient(420px 220px at 105% -20%, rgba(var(--azul-brillo-rgb),.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(var(--azul-claro-rgb),.22), transparent 60%), var(--azul-oscuro)", padding: "16px 16px 0" }}>
        <div style={{ position: "absolute", top: -60, right: -50, width: 190, height: 190, borderRadius: "50%", background: "#ffffff0d" }} />
        <div style={{ position: "absolute", top: 70, left: -70, width: 150, height: 150, borderRadius: "50%", background: "rgba(var(--azul-claro-rgb),0.1)" }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BotonAtras onClick={onBack} size={36} />
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 20, color: "#fff", lineHeight: 1.15 }}>Ranking de la zona</p>
              <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--azul-palido)" }}><MapPin size={11} /> {zone}</p>
            </div>
            <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 14, background: "linear-gradient(135deg,#FFE08A,#F5A623)", boxShadow: "0 6px 16px rgba(245,166,35,.45)" }}>
              <Trophy size={20} color="#7A4B00" />
            </span>
          </div>

          {enZona.length > 0 && (
            <div className="flex gap-2 mb-5">
              {[
                { Icon: Trophy, valor: enZona.length, etiqueta: enZona.length === 1 ? "negocio" : "negocios" },
                { Icon: Star, valor: totalResenas, etiqueta: totalResenas === 1 ? "reseña" : "reseñas" },
                { Icon: Eye, valor: fmtNum(enZona.reduce((s, b) => s + (b.views || 0), 0)), etiqueta: "visitas" },
              ].map(({ Icon, valor, etiqueta }) => (
                <div key={etiqueta} className="flex-1 flex items-center gap-2 px-3 py-2" style={{ borderRadius: 14, background: "#ffffff14", border: "1px solid #ffffff1f" }}>
                  <Icon size={14} color="var(--azul-claro)" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-none" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)" }}>{valor}</span>
                    <span className="block text-[10px] mt-0.5" style={{ color: "var(--azul-palido)" }}>{etiqueta}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {ranking.length > 0 && (
            <div className="flex items-end justify-center gap-2" style={{ paddingTop: 6 }}>
              <Puesto biz={plata} puesto={2} />
              <Puesto biz={oro} puesto={1} />
              <Puesto biz={bronce} puesto={3} />
            </div>
          )}
        </div>
      </div>

      {/* cuerpo claro */}
      <div style={{ background: "#F4F7FB", borderRadius: "24px 24px 0 0", marginTop: ranking.length ? -2 : 0, position: "relative", padding: "18px 16px 24px" }}>
        <div className="max-w-3xl mx-auto">
          {categoriasPresentes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-3 [&>*]:shrink-0" style={{ marginBottom: 6 }}>
              <button
                onClick={() => setCatFiltro(null)}
                className="text-xs font-semibold px-3 py-1.5"
                style={{ borderRadius: 20, background: catFiltro === null ? "#0B1437" : "#fff", color: catFiltro === null ? "#fff" : "#2B3768", border: "1px solid " + (catFiltro === null ? "#0B1437" : "#E3E7F1") }}
              >
                Todas
              </button>
              {categoriasPresentes.map((c) => {
                const Icon = c.icon;
                const act = catFiltro === c.id;
                return (
                  <button
                    key={c.id} onClick={() => setCatFiltro(act ? null : c.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
                    style={{ borderRadius: 20, background: act ? c.color : "#fff", color: act ? "#fff" : "#2B3768", border: "1px solid " + (act ? c.color : "#E3E7F1") }}
                  >
                    <Icon size={13} color={act ? "#fff" : c.color} /> {c.label}
                  </button>
                );
              })}
            </div>
          )}

          {ranking.length === 0 ? (
            <div className="text-center py-14 px-6">
              <span className="inline-flex items-center justify-center mb-4" style={{ width: 72, height: 72, borderRadius: 24, background: "var(--azul-suave)" }}>
                <Trophy size={32} color="var(--azul)" />
              </span>
              <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 17, color: "#0B1437" }}>Todavía no hay ranking</p>
              <p className="text-sm mt-1" style={{ color: "#5B6482" }}>
                {catFiltro ? "No hay negocios de esta categoría en tu zona." : "Cuando los negocios de tu zona reciban visitas, reseñas y favoritos, van a aparecer acá."}
              </p>
            </div>
          ) : (
            <>
              {resto.length > 0 && (
                <p className="text-xs font-semibold mb-2.5 mt-1" style={{ color: "#5B6482", letterSpacing: 0.6 }}>DEL PUESTO 4 AL {ranking.length}</p>
              )}
              <div className="flex flex-col gap-2.5">
                {resto.map((biz, i) => {
                  const puesto = i + 4;
                  const rating = avgRating(biz.reviews);
                  const c = catInfo(biz.cat);
                  const pts = Math.round(rankingScore(biz));
                  const pct = Math.max(6, Math.round((rankingScore(biz) / topScore) * 100));
                  const destacado = puesto <= 10;
                  return (
                    <button
                      key={biz.id} onClick={() => onOpenBusiness(biz.id)}
                      className="w-full flex items-center gap-3 p-3 text-left bg-white transition-shadow hover:shadow-lg"
                      style={{ borderRadius: 18, border: "1px solid #E3E7F1", boxShadow: "0 4px 16px rgba(11,20,55,0.06)" }}
                    >
                      <span className="flex items-center justify-center shrink-0 text-sm font-bold" style={{ width: 32, height: 32, borderRadius: 11, background: destacado ? "#0B1437" : "#EEF3FB", color: destacado ? "#fff" : "#6B7A90", fontFamily: "var(--fuente-titulo)" }}>
                        {puesto}
                      </span>
                      <div className="shrink-0 overflow-hidden" style={{ width: 48, height: 48, borderRadius: 14 }}>
                        <Photo cat={biz.cat} src={biz.logo || biz.photos?.[0]} height={48} radius="14px" iconSize={20} clickable={false} />
                      </div>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{biz.name}</span>
                        <span className="flex items-center gap-2 text-[11px] mt-0.5" style={{ color: "#5B6482" }}>
                          <span className="font-medium truncate" style={{ color: c?.color }}>{c?.label}</span>
                          {rating && <span className="flex items-center gap-0.5 shrink-0"><Star size={10} fill="#F5A623" color="#F5A623" /> {rating}</span>}
                          <span className="flex items-center gap-0.5 shrink-0"><Eye size={10} /> {fmtNum(biz.views || 0)}</span>
                          {(biz.vecesFavorito || 0) > 0 && <span className="flex items-center gap-0.5 shrink-0"><Heart size={10} color="#C1443A" fill="#C1443A" /> {biz.vecesFavorito}</span>}
                        </span>
                        <span className="block mt-1.5" style={{ height: 5, borderRadius: 5, background: "#EEF0F6", overflow: "hidden" }}>
                          <span className="block" style={{ width: `${pct}%`, height: "100%", borderRadius: 5, background: `linear-gradient(90deg, ${c?.color || "var(--azul)"}, color-mix(in srgb, ${c?.color || "var(--azul)"} 66%, transparent))` }} />
                        </span>
                      </span>
                      <span className="text-right shrink-0" style={{ minWidth: 38 }}>
                        <span className="block text-base font-bold leading-none" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{pts}</span>
                        <span className="block text-[10px] mt-0.5" style={{ color: "#64748B" }}>pts</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setVerComo((v) => !v)}
                className="w-full flex items-center justify-between mt-5 px-4 py-3 bg-white"
                style={{ borderRadius: 16, border: "1px solid #E3E7F1" }}
              >
                <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#0B1437" }}><Medal size={16} color="var(--azul)" /> ¿Cómo se calcula el ranking?</span>
                <ChevronDown size={16} color="#5B6482" style={{ transform: verComo ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
              {verComo && (
                <div className="mt-2 p-4 bg-white" style={{ borderRadius: 16, border: "1px solid #E3E7F1" }}>
                  {[
                    { Icon: Eye, color: "var(--azul)", titulo: "Visitas", texto: "Cada vez que alguien entra al perfil del negocio." },
                    { Icon: Star, color: "#F5A623", titulo: "Reseñas y valoración", texto: "Más reseñas y mejores estrellas suman más puntos." },
                    { Icon: Heart, color: "#C1443A", titulo: "Favoritos", texto: "Cada persona que guarda el negocio suma el doble que una visita." },
                  ].map(({ Icon, color, titulo, texto }) => (
                    <div key={titulo} className="flex items-start gap-3 mb-3 last:mb-0">
                      <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 10, background: tinte(color, 10) }}><Icon size={15} color={color} /></span>
                      <span>
                        <span className="block text-sm font-semibold" style={{ color: "#0B1437" }}>{titulo}</span>
                        <span className="block text-xs" style={{ color: "#5B6482" }}>{texto}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
