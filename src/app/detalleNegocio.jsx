// Ficha completa de un negocio (reseñas, promociones, puntos, contacto).
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useEffect, useRef, useState } from "react";
import { Briefcase, ChevronDown, Clock, Coins, Eye, EyeOff, Facebook, Flag, Heart, ImageIcon, Instagram, MapPin, MessageCircle, Music2, Navigation, Phone, Share2, Sparkles, Star, Tag, Trophy, Truck } from "lucide-react";
import { soporteApi } from "../api.js";
import { BotonAtras } from "../cuenta.jsx";
import { HojaDenunciar } from "../denuncias.jsx";
import { getAutorResenasId, setReviewsLastSeen } from "./almacen.js";
import { DAYS } from "./constantes.js";
import { EmpleoDetalleModal, HistoriaViewerModal } from "./empleoPromos.jsx";
import { activeDiscounts, avgRating, busquedaEmpleoActiva, historiasActivas } from "./negocios.js";
import { AllPhotosModal, OpenBadge, Photo, StarPicker } from "./piezas.jsx";
import { fetchPuntosNegocio } from "./servidor.js";
import { catInfo, fmtDate, fmtHours, fmtNum, fmtPesos, mapsLink, numeroWhatsapp, shareBusiness, soloDigitos, tinte, todayISO, uid } from "./utilidades.js";

export function BusinessDetail({ biz, onBack, onOpenPhoto, onAddReview, onReplyReview, miUsuario, esDueño, onOpenChat, isFavorite, onToggleFavorite, rank, onTrack, onOpenPuntos, onOpenPerfil }) {
  const c = catInfo(biz.cat);
  const todayIdx = new Date().getDay();
  const [denunciando, setDenunciando] = useState(false); // hoja de denuncia (Fase 8)
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showEmpleoDetalle, setShowEmpleoDetalle] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [tab, setTab] = useState("info"); // info | opiniones | fotos
  const [replyingId, setReplyingId] = useState(null);
  const [reportandoId, setReportandoId] = useState(null);
  const [avisoReporte, setAvisoReporte] = useState("");
  const [ocultas, setOcultas] = useState(() => { try { return JSON.parse(localStorage.getItem("zona_resenas_ocultas") || "[]"); } catch { return []; } });
  const MOTIVOS_REPORTE = ["Insultos u ofensas", "Spam o publicidad", "Falsa o engañosa", "Datos personales", "Otro motivo"];
  const ocultarResena = (id) => {
    const nuevas = [...ocultas, id];
    setOcultas(nuevas);
    try { localStorage.setItem("zona_resenas_ocultas", JSON.stringify(nuevas)); } catch { /* sin almacenamiento: queda oculta en esta sesión */ }
  };
  // Envía el reporte al equipo por Soporte y deja de mostrar la reseña en este dispositivo.
  const reportarResena = async (r, motivo) => {
    setReportandoId(null);
    ocultarResena(r.id);
    setAvisoReporte("Gracias. Ocultamos la reseña en este dispositivo y avisamos al equipo.");
    try {
      await soporteApi.enviar({ motivo: "resenas", tecnico: JSON.stringify({ negocioId: biz.id, resenaId: r.id }), asunto: `Reporte de reseña en ${biz.name}`, mensaje: `Motivo: ${motivo}\nNegocio: ${biz.name} (${biz.id})\nReseña: ${r.id} de ${r.name}\nTexto: ${String(r.text || "").slice(0, 300)}` });
    } catch {
      setAvisoReporte("Ocultamos la reseña en este dispositivo. No pudimos avisar al equipo: escribinos desde Ajustes → Soporte.");
    }
    setTimeout(() => setAvisoReporte(""), 6000);
  };
  const [replyText, setReplyText] = useState("");
  const rating = avgRating(biz.reviews);

  // programa de puntos del negocio (solo si tiene Mi Asistente conectado y el dueño lo activó)
  const [puntos, setPuntos] = useState(null);
  useEffect(() => {
    setPuntos(null);
    if (!biz.asistenteCodigoPublico || !biz.asistenteActivo) return;
    let cancelado = false;
    fetchPuntosNegocio(biz.asistenteCodigoPublico)
      .then((d) => { if (!cancelado && d.activo) setPuntos(d); })
      .catch(() => {}); // si Mi Asistente no responde, simplemente no se muestra la tarjeta
    return () => { cancelado = true; };
  }, [biz.id, biz.asistenteCodigoPublico, biz.asistenteActivo]);
  const tieneAsistente = !!biz.asistenteCodigoPublico && !!biz.asistenteActivo;

  const historias = historiasActivas(biz);
  const tieneHistorias = historias.length > 0;
  const [showHistoriaViewer, setShowHistoriaViewer] = useState(false);
  const pressTimer = useRef(null);
  const longPressed = useRef(false);
  const handlePressStart = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (biz.logo) onOpenPhoto(biz.logo);
    }, 450);
  };
  const handlePressEnd = () => {
    clearTimeout(pressTimer.current);
    if (!longPressed.current) {
      if (tieneHistorias) setShowHistoriaViewer(true);
      else if (biz.logo) onOpenPhoto(biz.logo);
    }
  };
  const cancelPress = () => clearTimeout(pressTimer.current);

  useEffect(() => {
    if (esDueño && tab === "opiniones") setReviewsLastSeen(biz.id, new Date().toISOString());
  }, [esDueño, tab, biz.id]);

  const submitReview = () => {
    if (!reviewText.trim() || !reviewRating) return;
    const ok = onAddReview(biz.id, { id: uid(), rating: reviewRating, text: reviewText.trim(), date: todayISO(), autorId: getAutorResenasId() });
    if (ok === false) return; // todavía no se registró: no perdemos lo que escribió
    setReviewText(""); setReviewRating(0);
  };

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      className="flex-1 py-2 text-sm font-semibold transition-all"
      style={{ borderRadius: 12, background: tab === id ? "#fff" : "transparent", color: tab === id ? "#0B1437" : "#5B6482", boxShadow: tab === id ? "0 1px 2px rgba(11,20,55,.10), 0 4px 10px -2px rgba(11,20,55,.14)" : "none" }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100dvh" }}>
      {denunciando && <HojaDenunciar tipo="negocio" id={biz.id} nombre={biz.name} onCerrar={() => setDenunciando(false)} onBloqueado={onBack} />}
      <div className="max-w-3xl mx-auto">
        {/* foto principal con botones flotantes */}
        <div style={{ position: "relative" }}>
          <Photo cat={biz.cat} src={biz.portada || null} height={270} radius="0" iconSize={52} onOpen={onOpenPhoto} />
          <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 110, background: "linear-gradient(to bottom, rgba(8,18,38,0.55), rgba(8,18,38,0))" }} />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3" style={{ zIndex: 5 }}>
            <BotonAtras onClick={onBack} tono="foto" />
            <div className="flex items-center gap-2.5">
              <button onClick={() => shareBusiness(biz)} aria-label="Compartir" className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 14, background: "#ffffffee", boxShadow: "0 4px 14px rgba(0,0,0,.25)" }}>
                <Share2 size={17} color="#0B1437" />
              </button>
              {!esDueño && (
                <button onClick={() => setDenunciando(true)} aria-label="Denunciar o bloquear" className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 14, background: "#ffffffee", boxShadow: "0 4px 14px rgba(0,0,0,.25)" }}>
                  <Flag size={17} color="#0B1437" />
                </button>
              )}
              <button onClick={() => onToggleFavorite(biz.id)} aria-label="Favorito" className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 14, background: "#ffffffee", boxShadow: "0 4px 14px rgba(0,0,0,.25)" }}>
                <Heart size={18} color={isFavorite ? "#E5484D" : "#0B1437"} fill={isFavorite ? "#E5484D" : "none"} />
              </button>
            </div>
          </div>
                    {rank && (
            <div
              className="absolute flex items-center gap-1 text-xs font-bold px-2.5 py-1.5"
              style={{
                bottom: 40, right: 16, borderRadius: 20, color: "#fff", boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
                background: rank === 1 ? "#D98A0B" : rank === 2 ? "#667892" : rank === 3 ? "#B0643A" : "#0B1437",
              }}
            >
              <Trophy size={13} /> Top #{rank} en tu zona
            </div>
          )}
        </div>

        <div className="px-4">
          {/* tarjeta de identidad del negocio */}
          <div className="bg-white relative p-4 mb-4" style={{ borderRadius: 24, marginTop: -30, boxShadow: "0 12px 32px rgba(11,20,55,0.12)", border: "1px solid #E3E7F1" }}>
            <div className="flex items-start gap-3.5">
              <button
                onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={cancelPress}
                onTouchStart={handlePressStart} onTouchEnd={handlePressEnd} onTouchCancel={cancelPress}
                className="flex items-center justify-center shrink-0 text-xl font-bold overflow-hidden"
                style={{
                  width: 66, height: 66, borderRadius: 22, background: c?.color || "var(--azul)", color: "#fff",
                  fontFamily: "var(--fuente-titulo)", marginTop: -36, border: "4px solid #fff",
                  boxShadow: tieneHistorias ? "0 0 0 3px var(--azul), 0 8px 18px rgba(11,20,55,.25)" : "0 8px 18px rgba(11,20,55,.25)",
                }}
              >
                {biz.logo ? <img src={biz.logo} alt="" className="w-full h-full object-cover" /> : biz.name?.[0]?.toUpperCase()}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 21, color: "#0B1437", lineHeight: 1.2 }}>{biz.name}</h1>
                  {biz.featured && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-1" style={{ background: "#FFF3D6", color: "#8A5B12", borderRadius: 8 }}>
                      <Star size={10} fill="#C98A14" color="#C98A14" /> Destacado
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "#5B6482" }}>
                  <span className="rounded-full inline-block" style={{ width: 7, height: 7, background: c?.color }} /> {c?.label} · {biz.zone}
                </p>
                <div className="mt-1.5"><OpenBadge weekHours={biz.weekHours} /></div>
                {biz.dueno && onOpenPerfil && (
                  <button type="button" onClick={() => onOpenPerfil(biz.dueno)} className="mt-1.5 text-xs font-semibold flex items-center" style={{ color: "var(--azul)", minHeight: 32 }}>Dueño: @{biz.dueno}</button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { Icon: Star, color: "#F5A623", valor: rating || "—", etiqueta: biz.reviews?.length ? `${biz.reviews.length} reseñas` : "Sin reseñas" },
                { Icon: Eye, color: "var(--azul)", valor: fmtNum(biz.views), etiqueta: "visitas" },
                { Icon: Heart, color: "#E5484D", valor: fmtNum(biz.vecesFavorito || 0), etiqueta: "guardados" },
              ].map(({ Icon, color, valor, etiqueta }) => (
                <div key={etiqueta} className="text-center py-2" style={{ borderRadius: 14, background: "#F6F9FD" }}>
                  <span className="flex items-center justify-center gap-1" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 16, color: "#0B1437" }}>
                    <Icon size={13} color={color} fill={Icon === Star || Icon === Heart ? color : "none"} /> {valor}
                  </span>
                  <span className="block text-[10px] mt-0.5" style={{ color: "#5B6482" }}>{etiqueta}</span>
                </div>
              ))}
            </div>

            {/* acciones rápidas: arriba WhatsApp + Cómo llegar; abajo las redes sociales, siempre en equilibrio */}
            {(() => {
              const handle = (v) => String(v || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?[^/]+\//, "").replace(/\/+$/, "");
              const esUrl = (v) => /^https?:\/\//i.test(String(v || "").trim());
              // arriba: contacto directo + ubicación. Si el negocio no usa WhatsApp pero tiene teléfono, el botón de contacto es "Llamar".
              const contacto = biz.phone && biz.acceptsWhatsapp
                ? { Icon: MessageCircle, label: "WhatsApp", color: "#25A06A", href: `https://wa.me/${numeroWhatsapp(biz.phone)}`, track: "contacto" }
                : biz.phone ? { Icon: Phone, label: "Llamar", color: "#2C9A5F", href: `tel:${soloDigitos(biz.phone)}`, track: "contacto" } : null;
              const principales = [contacto, { Icon: Navigation, label: "Cómo llegar", color: "var(--azul)", href: mapsLink(biz.loc, biz.zone), track: "ubicacion" }].filter(Boolean);
              const redes = [
                biz.ig && handle(biz.ig) && { Icon: Instagram, label: "Instagram", color: "#C13584", href: `https://instagram.com/${handle(biz.ig)}`, track: "contacto" },
                biz.tiktok && handle(biz.tiktok) && { Icon: Music2, label: "TikTok", color: "#111827", href: `https://www.tiktok.com/@${handle(biz.tiktok)}`, track: "contacto" },
                biz.facebook && handle(biz.facebook) && { Icon: Facebook, label: "Facebook", color: "#1877F2", href: esUrl(biz.facebook) ? biz.facebook.trim() : `https://facebook.com/${handle(biz.facebook)}`, track: "contacto" },
              ].filter(Boolean);
              const Boton = ({ Icon, label, color, href, track, ancho }) => (
                <a
                  href={href} target="_blank" rel="noreferrer"
                  onClick={() => onTrack && onTrack(biz.id, track)}
                  className="flex items-center justify-center gap-2 py-3"
                  style={{ borderRadius: 14, background: tinte(color, 8), gridColumn: ancho ? "span 2" : undefined }}
                >
                  <Icon size={17} color={color} />
                  <span className="text-xs font-semibold" style={{ color: "#0B1437" }}>{label}</span>
                </a>
              );
              return (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${principales.length}, minmax(0, 1fr))` }}>
                    {principales.map((a) => <Boton key={a.label} {...a} />)}
                  </div>
                  {biz.whatsappOculto && <p className="text-xs" style={{ color: "#4A5372", lineHeight: 1.45 }}>Este negocio eligió no mostrar su WhatsApp. Podés escribirle por sus redes o chatear con su asistente, si lo tiene.</p>}
                  {redes.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {/* de a dos; si queda uno solo, ocupa todo el ancho para que no se vea desparejo */}
                      {redes.map((a, n) => <Boton key={a.label} {...a} ancho={redes.length % 2 === 1 && n === redes.length - 1} />)}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {busquedaEmpleoActiva(biz) && (
            <button
              onClick={() => setShowEmpleoDetalle(true)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 mb-4 text-left"
              style={{ borderRadius: 10, background: "var(--azul-suave)", border: "1px solid #BFD6FB" }}
            >
              <Briefcase size={16} color="var(--azul)" className="shrink-0" />
              <span className="flex-1 text-xs" style={{ color: "#0B1437" }}>
                <b>Buscan personal:</b> {biz.busquedaEmpleo.puesto}
              </span>
              <ChevronDown size={13} color="var(--azul)" style={{ transform: "rotate(-90deg)" }} />
            </button>
          )}
          {showEmpleoDetalle && <EmpleoDetalleModal business={biz} onClose={() => setShowEmpleoDetalle(false)} />}
          {showHistoriaViewer && <HistoriaViewerModal business={biz} historias={historias} onClose={() => setShowHistoriaViewer(false)} />}

          {/* pestañas */}
          <div className="flex items-center gap-1 p-1 mb-5" style={{ borderRadius: 16, background: "#E8EEF7" }}>
            <TabButton id="info" label="Información" />
            <TabButton id="opiniones" label={`Opiniones${biz.reviews?.length ? ` (${biz.reviews.length})` : ""}`} />
            <TabButton id="fotos" label="Fotos" />
          </div>

          {tab === "info" && (
            <div className="pb-6">
              <p className="text-sm mb-4" style={{ color: "#1F2937" }}>{biz.desc}</p>

              {(biz.services?.length > 0 || biz.specialties?.length > 0) && (
                <div className="mb-4 flex flex-col gap-2">
                  {biz.services?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {biz.services.map((s) => (
                        <span key={s} className="text-xs px-2 py-1" style={{ background: "var(--azul-suave)", color: "#0B1437", borderRadius: 20 }}>{s}</span>
                      ))}
                    </div>
                  )}
                  {biz.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {biz.specialties.map((s) => (
                        <span key={s} className="text-xs px-2 py-1" style={{ background: "#F5F1E6", color: "#8A5B12", borderRadius: 20 }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mb-5 text-xs" style={{ color: "#2B3768" }}>
                {biz.paymentMethods?.length > 0 && <span>Pagos: {biz.paymentMethods.join(", ")}</span>}
                {biz.delivery && <span className="flex items-center gap-1"><Truck size={13} /> Hace envíos</span>}
              </div>

              {biz.ig && (
                <div className="flex gap-2 mb-5">
                  <a href={`https://instagram.com/${biz.ig}`} target="_blank" rel="noreferrer"
                    onClick={() => onTrack && onTrack(biz.id, "contacto")}
                    className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3"
                    style={{ border: "1px solid #E3E7F1", color: "#0B1437", borderRadius: 10 }}
                  >
                    <Instagram size={17} /> @{biz.ig}
                  </a>
                </div>
              )}

              <a href={mapsLink(biz.loc, biz.zone)} target="_blank" rel="noreferrer" onClick={() => onTrack && onTrack(biz.id, "ubicacion")} className="flex items-center gap-1.5 text-sm mb-6 w-fit hover:underline" style={{ color: "#0B1437" }}>
                <MapPin size={15} /> {biz.loc} <span style={{ color: "#5B6482" }}>· ver en el mapa</span>
              </a>

              {puntos && (
                <div className="mb-6 p-4" style={{ borderRadius: 18, background: "linear-gradient(135deg,#FFF6E0,#FDEBC4)", border: "1px solid #F5D9A0" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Coins size={17} color="#B7791F" />
                    <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: "#0B1437" }}>Puntos y recompensas</h2>
                  </div>
                  <p className="text-xs" style={{ color: "#5B4A1E" }}>
                    Ganás <b>1 punto</b> por cada <b>{fmtPesos(puntos.pesosPorPunto)}</b> que gastás en {biz.name}.
                    {puntos.saldo > 0 && <> Tenés <b>{fmtNum(puntos.saldo)} {puntos.saldo === 1 ? "punto" : "puntos"}</b>.</>}
                  </p>
                  {puntos.proxima && (
                    <p className="text-xs mt-1" style={{ color: "#5B4A1E" }}>
                      Te {puntos.proxima.faltan === 1 ? "falta" : "faltan"} {fmtNum(puntos.proxima.faltan)} para "{puntos.proxima.nombre}".
                    </p>
                  )}
                  <button
                    onClick={() => onOpenPuntos && onOpenPuntos(biz.asistenteCodigoPublico)}
                    className="w-full text-sm font-semibold py-2.5 mt-3"
                    style={{ borderRadius: 10, backgroundColor: "#0B1437", color: "#fff" }}
                  >
                    Ver recompensas
                  </button>
                </div>
              )}

              {activeDiscounts(biz).length > 0 && (
                <div className="mb-6">
                  <h2 className="flex items-center gap-2 mb-3" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 16, color: "#0B1437" }}>
                    <Tag size={16} /> Descuentos vigentes
                  </h2>
                  <div className="flex flex-col gap-2">
                    {activeDiscounts(biz).map((d) => (
                      <div key={d.id} className="p-4" style={{ borderRadius: 18, border: "1px solid #F2C98E", background: "linear-gradient(135deg,#FFF3DC,#FBE3BC)" }}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: "#0B1437" }}>{d.title}</h3>
                          {d.percent && <span className="text-xs font-bold px-2 py-0.5" style={{ background: "#0B1437", color: "var(--azul)", borderRadius: 20 }}>{d.percent} OFF</span>}
                        </div>
                        {d.item && <p className="text-xs mb-1" style={{ color: "#8A5B12" }}>Incluye: {d.item}</p>}
                        {d.desc && <p className="text-sm" style={{ color: "#1F2937" }}>{d.desc}</p>}
                        <p className="text-[11px] mt-1" style={{ color: "#5B6482" }}>Válido hasta el {fmtDate(d.endDate)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-2">
                <h2 className="flex items-center gap-2 mb-3" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 16, color: "#0B1437" }}>
                  <Clock size={16} /> Horarios de atención
                </h2>
                <div className="bg-white overflow-hidden" style={{ borderRadius: 18, border: "1px solid #E3E7F1", boxShadow: "0 4px 14px rgba(11,20,55,0.05)" }}>
                  {DAYS.map((day, i) => (
                    <div key={day} className="flex items-center justify-between px-4 py-2.5 text-sm"
                      style={{ borderTop: i === 0 ? "none" : "1px solid #EEF0F6", backgroundColor: i === todayIdx ? "var(--azul-suave)" : "transparent", fontWeight: i === todayIdx ? 600 : 400, color: "#0B1437" }}
                    >
                      <span>{day}{i === todayIdx ? " · hoy" : ""}</span>
                      <span style={{ color: biz.weekHours[i]?.[0] === null ? "#9A3B34" : "#1F2937" }}>{fmtHours(biz.weekHours[i])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "opiniones" && (
            <div className="pb-6">
              <div className="bg-white p-4 mb-4" style={{ borderRadius: 18, border: "1px solid #E3E7F1", boxShadow: "0 4px 14px rgba(11,20,55,0.05)" }}>
                <p className="text-sm font-semibold mb-2" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>Dejá tu opinión</p>
                <StarPicker value={reviewRating} onChange={setReviewRating} />
                {!reviewRating && <p className="text-xs mt-1.5" style={{ color: "#5B6482" }}>Tocá una estrella para calificar.</p>}
                <textarea aria-label="Contá tu experiencia..."
                  value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Contá tu experiencia..."
                  rows={3} className="w-full border px-3 py-2 text-sm mt-3 mb-2" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}
                />
                {miUsuario && <p className="text-xs mb-3" style={{ color: "#5B6482" }}>Tu reseña se publica como <b style={{ color: "#0B1437" }}>@{miUsuario}</b>.</p>}
                <button onClick={submitReview} disabled={!reviewRating || !reviewText.trim()} className="text-sm font-semibold px-5 py-2.5" style={{ backgroundColor: "#0B1437", color: "#fff", borderRadius: 12 }}>
                  Publicar reseña
                </button>
              </div>

              {avisoReporte && <p role="status" className="text-sm font-medium mb-3 px-3.5 py-2.5" style={{ borderRadius: 12, background: "var(--azul-suave)", color: "#2B3768", border: "1px solid #D6E3FB" }}>{avisoReporte}</p>}
              {biz.reviews?.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {[...biz.reviews].reverse().filter((r) => !ocultas.includes(r.id)).map((r) => (
                    <div key={r.id} className="bg-white p-4" style={{ borderRadius: 18, border: "1px solid #E3E7F1" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{r.conUsuario ? `@${r.name}` : r.name}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs" style={{ color: "#5B6482" }}>{fmtDate(r.date)}</span>
                          <button onClick={() => setReportandoId(reportandoId === r.id ? null : r.id)} aria-label="Reportar reseña" className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, background: reportandoId === r.id ? "var(--azul-suave)" : "transparent" }}>
                            <Flag size={14} color="#8D95B0" />
                          </button>
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 mb-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={13} fill={n <= r.rating ? "var(--azul)" : "none"} color={n <= r.rating ? "var(--azul)" : "#D1D5DB"} />
                        ))}
                      </div>
                      <p className="text-sm mb-2" style={{ color: "#1F2937" }}>{r.text}</p>
                      {reportandoId === r.id && (
                        <div className="mb-2 p-3" style={{ borderRadius: 14, background: "#F3F5FA", border: "1px solid #E3E7F1", animation: "zona-aparecer .25s cubic-bezier(0.22,1,0.36,1) both" }}>
                          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#0B1437" }}><EyeOff size={13} /> ¿Por qué querés reportarla? También la vas a dejar de ver.</p>
                          <div className="flex flex-wrap gap-1.5">
                            {MOTIVOS_REPORTE.map((m) => (
                              <button key={m} onClick={() => reportarResena(r, m)} className="text-xs font-semibold px-3 py-1.5" style={{ borderRadius: 999, background: "#fff", border: "1px solid #E3E7F1", color: "#0B1437" }}>{m}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      {r.respuesta ? (
                        <div className="mt-2 p-3" style={{ borderRadius: 8, background: "#F3F5FA", borderLeft: "3px solid var(--azul)" }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            {r.respuesta.esDueño && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5" style={{ background: "var(--azul-suave)", color: "var(--azul)", borderRadius: 6 }}>Respuesta del dueño</span>
                            )}
                            <span className="text-[11px]" style={{ color: "#64748B" }}>{fmtDate(r.respuesta.fecha)}</span>
                          </div>
                          <p className="text-sm" style={{ color: "#1F2937" }}>{r.respuesta.texto}</p>
                        </div>
                      ) : replyingId === r.id ? (
                        <div className="mt-2">
                          <textarea aria-label="Escribí una respuesta..."
                            value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2}
                            placeholder="Escribí una respuesta..."
                            className="w-full border px-3 py-2 text-sm mb-2" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { if (replyText.trim()) { onReplyReview(biz.id, r.id, replyText.trim(), esDueño); setReplyingId(null); setReplyText(""); } }}
                              className="text-xs font-semibold px-3 py-1.5" style={{ backgroundColor: "var(--azul)", color: "#fff", borderRadius: 6 }}
                            >
                              Responder
                            </button>
                            <button onClick={() => { setReplyingId(null); setReplyText(""); }} className="text-xs font-medium px-3 py-1.5" style={{ color: "#5B6482" }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setReplyingId(r.id); setReplyText(""); }} className="text-xs font-semibold" style={{ color: "var(--azul)" }}>
                          Responder
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "#5B6482" }}>Sé el primero en dejar una reseña.</p>
              )}
            </div>
          )}

          {tab === "fotos" && (
            <div className="pb-6">
              {biz.photos?.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {biz.photos.map((src, i) => (
                    <Photo key={i} cat={biz.cat} src={src} height={140} radius="10px" iconSize={22} onOpen={onOpenPhoto} />
                  ))}
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-sm" style={{ color: "#5B6482" }}>
                  <ImageIcon size={15} /> Este negocio todavía no cargó fotos
                </p>
              )}
              {showAllPhotos && <AllPhotosModal photos={biz.photos} cat={biz.cat} onOpenPhoto={onOpenPhoto} onClose={() => setShowAllPhotos(false)} />}
            </div>
          )}

          {/* acciones principales: chat con el asistente y cómo llegar */}
          <div className="flex flex-col gap-2" style={{ paddingBottom: 100 }}>
            {tieneAsistente && (
              <button
                onClick={() => onOpenChat(biz)}
                className="flex items-center justify-center gap-2 text-sm font-semibold py-3.5 w-full"
                style={{ background: "linear-gradient(135deg,var(--azul),var(--azul-medio))", color: "#fff", borderRadius: 14, boxShadow: "0 8px 20px rgba(var(--azul-rgb),.35)" }}
              >
                <Sparkles size={16} /> Hablar con el asistente
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
