// Mapa de negocios cercanos.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { ChevronDown, Grid3x3, Heart, Layers, List, LocateFixed, Map as MapIcon, MapPin, Minus, Navigation, Plus, Sparkles, Star, Tag, Truck, X } from "lucide-react";
import { CAPAS_MAPA } from "../capasMapa.js";
import { BotonAtras } from "../cuenta.jsx";
import { activeDiscounts, avgRating, enListados, esNegocioNuevo, filtrarParaMapa } from "./negocios.js";
import { CategoryModal, OpenBadge, Photo } from "./piezas.jsx";
import { catInfo, escapeHtml, fmtDistance, geocodeAddress, haversineKm, tinte } from "./utilidades.js";

/* ---------- mapa profesional de Mi Zona (solo negocios registrados) ---------- */

// Marcador con el LOGO del negocio (o su inicial sobre el color del rubro si todavía no cargó logo)
function crearIconoNegocio(b, seleccionado, mostrarNombre = true) {
  const c = catInfo(b.cat);
  const color = c?.color || "var(--azul)";
  const size = seleccionado ? 54 : 42;
  const inicial = escapeHtml((b.name || "?").trim().charAt(0).toUpperCase());
  const logo = b.logo || b.photos?.[0];
  const img = logo
    ? `<img src="${escapeHtml(logo)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;background:#fff" onerror="this.style.display='none'" />`
    : "";
  const nombre = escapeHtml((b.name || "").length > 22 ? `${b.name.slice(0, 21)}…` : b.name || "");
  const etiqueta = mostrarNombre || seleccionado
    ? `<div style="position:absolute;left:50%;top:${size + 12}px;transform:translateX(-50%);white-space:nowrap;max-width:170px;overflow:hidden;text-overflow:ellipsis;
        background:#fff;color:#0B1437;font:600 11px 'Work Sans',sans-serif;padding:3px 8px;border-radius:10px;
        box-shadow:0 2px 8px rgba(11,20,55,.28);border:1px solid #E3E7F1">${nombre}</div>`
    : "";
  const html = `
    <div style="position:relative;width:${size}px;height:${size + 10}px">
      <div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;
        box-shadow:0 4px 12px rgba(11,20,55,.4)${seleccionado ? `,0 0 0 4px ${tinte(color, 33)}` : ""};overflow:hidden;
        display:flex;align-items:center;justify-content:center;color:#fff;font:700 ${Math.round(size * 0.4)}px Poppins,sans-serif">
        ${inicial}${img}
      </div>
      <div style="position:absolute;left:50%;top:${size - 3}px;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;
        border-right:7px solid transparent;border-top:11px solid #fff;filter:drop-shadow(0 2px 2px rgba(11,20,55,.25))"></div>
      ${etiqueta}
    </div>`;
  return L.divIcon({ className: "", html, iconSize: [size, size + 10], iconAnchor: [size / 2, size + 10] });
}

export function MapaScreen({ businesses, zone, favorites, onToggleFavorite, onOpenBusiness, onBack, userLoc, locStatus, onRequestLocation, initialFilters, onTrack }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const [vista, setVista] = useState("mapa"); // mapa | lista
  const [filtros, setFiltros] = useState({
    cat: null, abiertos: false, delivery: false, promos: false, asistente: false, nuevos: false, favoritos: false,
    ...(initialFilters || {}),
  });
  const [showCats, setShowCats] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [quiereUbicarme, setQuiereUbicarme] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [zoom, setZoom] = useState(12);
  const [capa, setCapa] = useState(() => { try { const c = localStorage.getItem("miZonaCapaMapa2"); return CAPAS_MAPA[c] ? c : "relieve"; } catch { return "relieve"; } });
  const [capasAbierto, setCapasAbierto] = useState(false);
  const capasRef = useRef([]);
  const verNombres = zoom >= 14; // con el mapa muy alejado solo se ven los círculos, para que no se amontonen los nombres

  const setFiltro = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));
  const hayFiltros = Object.values(filtros).some(Boolean);
  const limpiarFiltros = () => setFiltros({ cat: null, abiertos: false, delivery: false, promos: false, asistente: false, nuevos: false, favoritos: false });

  // Negocios sin coordenadas (cargados antes del mapa): los ubicamos en segundo plano, de a uno (límite del servicio gratuito
  // de direcciones) y guardamos el resultado en este dispositivo para no repetir la consulta.
  const [coordsExtra, setCoordsExtra] = useState({});
  useEffect(() => {
    let cancelado = false;
    const pendientes = businesses
      .filter((b) => b.kind !== "job" && b.status === "active" && enListados(b) && b.zone === zone && b.loc && !(b.lat && b.lng) && !coordsExtra[b.id])
      .slice(0, 25);
    if (!pendientes.length) return;
    (async () => {
      for (const b of pendientes) {
        if (cancelado) return;
        const clave = `miZonaGeo_${b.id}_${b.loc}`;
        let punto = null;
        try { punto = JSON.parse(localStorage.getItem(clave) || "null"); } catch { punto = null; }
        if (!punto) {
          punto = await geocodeAddress(b.loc, b.zone);
          if (punto) { try { localStorage.setItem(clave, JSON.stringify(punto)); } catch { /* sin almacenamiento */ } }
          await new Promise((r) => setTimeout(r, 1100));
        }
        if (punto && !cancelado) setCoordsExtra((prev) => ({ ...prev, [b.id]: punto }));
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses, zone]);

  // Dibuja la capa elegida (y saca la anterior). Se vuelve a ejecutar cada vez que la persona cambia de capa.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    capasRef.current.forEach((l) => map.removeLayer(l));
    capasRef.current = CAPAS_MAPA[capa].capas.map((c, i) => {
      const l = L.tileLayer(c.url, c.opciones).addTo(map);
      if (i > 0) l.bringToFront();
      return l;
    });
    try { localStorage.setItem("miZonaCapaMapa2", capa); } catch { /* sin almacenamiento */ }
    return undefined;
  }, [capa]);

  const lista = useMemo(() => {
    const base = filtrarParaMapa(businesses, zone, filtros, favorites).map((b) => (b.lat && b.lng ? b : (coordsExtra[b.id] ? { ...b, ...coordsExtra[b.id] } : b)));
    if (userLoc) {
      const d = (b) => (b.lat && b.lng ? haversineKm(userLoc.lat, userLoc.lng, b.lat, b.lng) : Infinity);
      return [...base].sort((a, b) => d(a) - d(b));
    }
    return [...base].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }, [businesses, zone, filtros, favorites, userLoc, coordsExtra]);
  const conUbicacion = useMemo(() => lista.filter((b) => b.lat && b.lng), [lista]);
  const sinUbicacion = lista.length - conUbicacion.length;
  const selected = lista.find((b) => b.id === selectedId) || null;
  const distanciaDe = (b) => (userLoc && b.lat && b.lng ? haversineKm(userLoc.lat, userLoc.lng, b.lat, b.lng) : null);

  // crear el mapa una sola vez
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, { zoomControl: false, attributionControl: false, zoomSnap: 0.5, wheelPxPerZoomLevel: 90, maxZoom: 19 }).setView([-26.8241, -65.2226], 12); // Tucumán por defecto
    map.on("zoomend", () => setZoom(map.getZoom()));
    L.control.attribution({ prefix: false, position: "bottomleft" }).addAttribution("&copy; OpenStreetMap y Esri").addTo(map);
    map.on("click", () => setSelectedId(null));
    mapRef.current = map;
    // Leaflet calcula mal su tamaño si el contenedor todavía no terminó de acomodarse: sin esto el mapa puede verse en blanco
    const recalcular = () => { if (mapRef.current) map.invalidateSize(); };
    const t1 = setTimeout(recalcular, 120);
    const t2 = setTimeout(recalcular, 500);
    let ro = null;
    if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(recalcular); ro.observe(mapDivRef.current); }
    return () => { clearTimeout(t1); clearTimeout(t2); ro && ro.disconnect(); map.remove(); mapRef.current = null; markersRef.current = {}; userMarkerRef.current = null; };
  }, []);

  // marcadores: se agregan/quitan/actualizan según los filtros y la selección
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const vivos = new Set(conUbicacion.map((b) => b.id));
    Object.keys(markersRef.current).forEach((id) => {
      if (!vivos.has(id)) { markersRef.current[id].remove(); delete markersRef.current[id]; }
    });
    conUbicacion.forEach((b) => {
      const sel = b.id === selectedId;
      let m = markersRef.current[b.id];
      if (!m) {
        m = L.marker([b.lat, b.lng], { icon: crearIconoNegocio(b, sel, verNombres), riseOnHover: true }).addTo(map);
        m.on("click", (e) => { L.DomEvent.stopPropagation(e); setSelectedId(b.id); });
        m._sel = sel; m._nom = verNombres; m._logo = b.logo; m._name = b.name;
        markersRef.current[b.id] = m;
      } else if (m._sel !== sel || m._nom !== verNombres || m._logo !== b.logo || m._name !== b.name) {
        m.setIcon(crearIconoNegocio(b, sel, verNombres));
        m._sel = sel; m._nom = verNombres; m._logo = b.logo; m._name = b.name;
      }
      m.setZIndexOffset(sel ? 1000 : 0);
    });
  }, [conUbicacion, selectedId, verNombres]);

  // encuadrar el mapa cuando cambia el conjunto de negocios visibles (filtros)
  const idsKey = conUbicacion.map((b) => b.id).join(",");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || conUbicacion.length === 0) return;
    if (conUbicacion.length === 1) map.setView([conUbicacion[0].lat, conUbicacion[0].lng], 15);
    else map.fitBounds(L.latLngBounds(conUbicacion.map((b) => [b.lat, b.lng])), { padding: [60, 60], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // al elegir un negocio, lo centramos un poco más arriba para que la tarjeta flotante no lo tape
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected || !selected.lat) return;
    const z = Math.max(map.getZoom(), 15);
    const p = map.project([selected.lat, selected.lng], z);
    p.y += 110;
    map.flyTo(map.unproject(p, z), z, { duration: 0.5 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // si el negocio elegido ya no está entre los resultados, cerramos su tarjeta
  useEffect(() => { if (selectedId && !selected) setSelectedId(null); }, [selectedId, selected]);

  // al volver a la vista de mapa, Leaflet necesita recalcular su tamaño
  useEffect(() => {
    if (vista === "mapa" && mapRef.current) setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 50);
  }, [vista]);

  // punto azul de "estás acá" + centrar cuando el usuario lo pidió
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLoc) return;
    const icono = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:22px;height:22px"><span style="position:absolute;inset:0;border-radius:50%;background:rgba(var(--azul-rgb),0.33);animation:mzPulse 1.8s ease-out infinite"></span><span style="position:absolute;inset:4px;border-radius:50%;background:var(--azul);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></span></div>`,
      iconSize: [22, 22], iconAnchor: [11, 11],
    });
    if (userMarkerRef.current) userMarkerRef.current.setLatLng([userLoc.lat, userLoc.lng]);
    else userMarkerRef.current = L.marker([userLoc.lat, userLoc.lng], { icon: icono, interactive: false, zIndexOffset: -100 }).addTo(map);
    if (quiereUbicarme) {
      map.flyTo([userLoc.lat, userLoc.lng], 15, { duration: 0.6 });
      setQuiereUbicarme(false);
    }
  }, [userLoc, quiereUbicarme]);

  useEffect(() => {
    if (quiereUbicarme && (locStatus === "denied" || locStatus === "error")) {
      setQuiereUbicarme(false);
      setAviso(locStatus === "denied"
        ? "No pudimos acceder a tu ubicación. Habilitá el permiso desde el candado de la barra del navegador y probá de nuevo."
        : "Tu navegador no permite obtener la ubicación.");
      setTimeout(() => setAviso(null), 5000);
    }
  }, [locStatus, quiereUbicarme]);

  const irAMiUbicacion = () => {
    if (userLoc && mapRef.current) {
      mapRef.current.flyTo([userLoc.lat, userLoc.lng], 15, { duration: 0.6 });
    } else {
      setQuiereUbicarme(true);
      onRequestLocation();
    }
  };

  const Chip = ({ label, Icon, active, onClick, activeBg = "var(--azul-suave)", activeColor = "var(--azul)", activeBorder = "var(--azul)" }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 shrink-0 whitespace-nowrap"
      style={{ borderRadius: 20, backgroundColor: active ? activeBg : "#fff", color: active ? activeColor : "#2B3768", border: "1px solid " + (active ? activeBorder : "#E3E7F1") }}
    >
      {Icon && <Icon size={13} />} {label}
    </button>
  );

  const catActual = filtros.cat ? catInfo(filtros.cat) : null;
  const CtrlBtn = ({ onClick, children, label }) => (
    <button
      onClick={onClick} aria-label={label}
      className="flex items-center justify-center"
      style={{ width: 40, height: 40, background: "#fff", boxShadow: "0 3px 12px rgba(11,20,55,0.22)" }}
    >
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[80]" style={{ backgroundColor: "#F3F5FA", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes mzPulse { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(2.2); opacity: 0; } }
        .leaflet-container { font-family: var(--fuente-texto); }`}</style>

      {/* encabezado */}
      <div style={{ backgroundColor: "var(--azul-oscuro)" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <BotonAtras onClick={onBack} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)" }}>Mapa de {zone}</p>
            <p className="text-[11px]" style={{ color: "var(--azul-palido)" }}>
              {conUbicacion.length} {conUbicacion.length === 1 ? "negocio" : "negocios"} en el mapa
              {sinUbicacion > 0 ? ` · ${sinUbicacion} sin ubicación exacta` : ""}
            </p>
          </div>
          <div className="flex items-center p-0.5 shrink-0" style={{ borderRadius: 10, background: "#ffffff1f" }}>
            {[{ id: "mapa", label: "Mapa", Icon: MapIcon }, { id: "lista", label: "Lista", Icon: List }].map(({ id, label, Icon }) => (
              <button
                key={id} onClick={() => setVista(id)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
                style={{ borderRadius: 8, background: vista === id ? "#fff" : "transparent", color: vista === id ? "#0B1437" : "#DCE7FB" }}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* filtros */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #E3E7F1" }}>
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setShowCats(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 shrink-0 whitespace-nowrap"
            style={{ borderRadius: 20, backgroundColor: catActual ? catActual.color : "#fff", color: catActual ? "#fff" : "#2B3768", border: "1px solid " + (catActual ? catActual.color : "#E3E7F1") }}
          >
            {catActual ? <catActual.icon size={13} /> : <Grid3x3 size={13} />} {catActual ? catActual.label : "Rubro"}
            {catActual ? <X size={12} onClick={(e) => { e.stopPropagation(); setFiltro("cat", null); }} /> : <ChevronDown size={12} />}
          </button>
          <Chip label="Abiertos ahora" active={filtros.abiertos} onClick={() => setFiltro("abiertos", !filtros.abiertos)} activeBg="#E4F3EA" activeColor="#1E6B44" activeBorder="#2C9A5F" />
          <Chip label="Delivery" Icon={Truck} active={filtros.delivery} onClick={() => setFiltro("delivery", !filtros.delivery)} />
          <Chip label="Promociones" Icon={Tag} active={filtros.promos} onClick={() => setFiltro("promos", !filtros.promos)} />
          <Chip label="Con asistente" Icon={Sparkles} active={filtros.asistente} onClick={() => setFiltro("asistente", !filtros.asistente)} activeBg="#F3ECFC" activeColor="#7A4F9E" activeBorder="#7A4F9E" />
          <Chip label="Nuevos" Icon={Sparkles} active={filtros.nuevos} onClick={() => setFiltro("nuevos", !filtros.nuevos)} />
          <Chip label="Favoritos" Icon={Heart} active={filtros.favoritos} onClick={() => setFiltro("favoritos", !filtros.favoritos)} activeBg="#FDF1EF" activeColor="#9A3B34" activeBorder="#C1443A" />
        </div>
      </div>

      {/* contenido */}
      <div className="relative flex-1 min-h-0">
        <div style={{ position: "absolute", inset: 0, zIndex: 0, isolation: "isolate", visibility: vista === "mapa" ? "visible" : "hidden" }}>
          <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {vista === "mapa" && (
          <div className="absolute pointer-events-none" style={{ left: 8, top: 6, zIndex: 12, maxWidth: "70%", fontSize: 9, lineHeight: 1.2, color: capa === "satelite" ? "#fff" : "#475569", textShadow: capa === "satelite" ? "0 1px 2px rgba(0,0,0,.8)" : "0 0 3px #fff", opacity: 0.85 }}>
            {CAPAS_MAPA[capa].atribucion}
          </div>
        )}

        {vista === "mapa" && lista.length > 0 && conUbicacion.length === 0 && (
          <div className="absolute inset-x-4 flex justify-center" style={{ top: 80, zIndex: 15 }}>
            <div className="bg-white px-4 py-3 text-center" style={{ borderRadius: 16, boxShadow: "0 8px 24px rgba(11,20,55,0.18)", maxWidth: 320 }}>
              <p className="text-sm font-semibold" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>
                Ubicando los negocios...
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#5B6482" }}>
                Estamos buscando sus direcciones en el mapa, puede tardar unos segundos.
              </p>
            </div>
          </div>
        )}

        {vista === "mapa" && (
          <>
            {/* controles: zoom y mi ubicación */}
            <div className="absolute flex flex-col gap-2" style={{ right: 12, top: 12, zIndex: 20 }}>
              <div className="flex flex-col overflow-hidden" style={{ borderRadius: 12, boxShadow: "0 3px 12px rgba(11,20,55,0.22)" }}>
                <CtrlBtn onClick={() => mapRef.current?.zoomIn()} label="Acercar"><Plus size={18} color="#0B1437" /></CtrlBtn>
                <div style={{ height: 1, background: "#E3E7F1" }} />
                <CtrlBtn onClick={() => mapRef.current?.zoomOut()} label="Alejar"><Minus size={18} color="#0B1437" /></CtrlBtn>
              </div>
              <div className="relative">
                <button
                  onClick={() => setCapasAbierto((v) => !v)} aria-label="Cambiar tipo de mapa"
                  className="flex items-center justify-center"
                  style={{ width: 40, height: 40, borderRadius: 12, background: capasAbierto ? "var(--azul)" : "#fff", boxShadow: "0 3px 12px rgba(11,20,55,0.22)" }}
                >
                  <Layers size={18} color={capasAbierto ? "#fff" : "#0B1437"} />
                </button>
                {capasAbierto && (
                  <div className="absolute flex gap-2 p-2" style={{ right: 48, top: 0, borderRadius: 16, background: "#fff", boxShadow: "0 10px 28px rgba(11,20,55,0.28)" }}>
                    {Object.entries(CAPAS_MAPA).map(([id, c]) => (
                      <button key={id} onClick={() => { setCapa(id); setCapasAbierto(false); }} className="flex flex-col items-center gap-1">
                        <span style={{ width: 58, height: 58, borderRadius: 12, background: c.muestra, border: `3px solid ${capa === id ? "var(--azul)" : "transparent"}`, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }} />
                        <span className="text-[11px] font-semibold" style={{ color: capa === id ? "var(--azul)" : "#2B3768" }}>{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={irAMiUbicacion} aria-label="Mi ubicación"
                className="flex items-center justify-center"
                style={{ width: 40, height: 40, borderRadius: 12, background: userLoc ? "var(--azul)" : "#fff", boxShadow: "0 3px 12px rgba(11,20,55,0.22)" }}
              >
                <LocateFixed size={18} color={userLoc ? "#fff" : "#0B1437"} className={locStatus === "loading" ? "animate-pulse" : ""} />
              </button>
            </div>

            {aviso && (
              <div className="absolute left-3 right-3 px-4 py-2.5 text-xs" style={{ top: 12, zIndex: 25, maxWidth: 420, margin: "0 auto", borderRadius: 10, background: "#FDF1EF", color: "#9A3B34", boxShadow: "0 3px 12px rgba(0,0,0,0.15)", paddingRight: 60 }}>
                {aviso}
              </div>
            )}

            {lista.length === 0 && (
              <div className="absolute left-4 right-4 text-center p-5" style={{ top: "30%", zIndex: 15, maxWidth: 340, margin: "0 auto", borderRadius: 14, background: "#fff", boxShadow: "0 8px 24px rgba(11,20,55,0.2)" }}>
                <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>No hay negocios con estos filtros</p>
                <p className="text-xs mb-3" style={{ color: "#5B6482" }}>Probá quitando alguno para ver más resultados en {zone}.</p>
                {hayFiltros && (
                  <button onClick={limpiarFiltros} className="text-xs font-semibold px-4 py-2" style={{ borderRadius: 8, backgroundColor: "#0B1437", color: "#fff" }}>Quitar filtros</button>
                )}
              </div>
            )}

            {/* tarjeta flotante del negocio elegido */}
            {selected && (() => {
              const c = catInfo(selected.cat);
              const rating = avgRating(selected.reviews);
              const km = distanciaDe(selected);
              const promos = activeDiscounts(selected);
              const esFav = favorites.includes(selected.id);
              const etiquetas = [
                selected.delivery && { t: "Delivery", Icon: Truck, bg: "var(--azul-suave)", color: "#0B1437" },
                (selected.asistenteCodigoPublico && selected.asistenteActivo) && { t: "Asistente disponible", Icon: Sparkles, bg: "#F3ECFC", color: "#7A4F9E" },
                promos.length > 0 && { t: promos[0].percent ? `${promos[0].percent} OFF` : "Promoción", Icon: Tag, bg: "#FBEBD1", color: "#8A5B12" },
                esNegocioNuevo(selected) && { t: "Nuevo", Icon: Sparkles, bg: "#E4F3EA", color: "#1E6B44" },
              ].filter(Boolean);
              return (
                <div className="absolute left-3 right-3" style={{ bottom: 14, zIndex: 20, maxWidth: 440, margin: "0 auto" }}>
                  <div className="bg-white p-4 relative" style={{ borderRadius: 16, border: "1px solid #E3E7F1", boxShadow: "0 10px 30px rgba(11,20,55,0.28)" }}>
                    <button onClick={() => setSelectedId(null)} className="absolute" style={{ top: 10, right: 10 }} aria-label="Cerrar"><X size={16} color="#64748B" /></button>
                    <div className="flex items-start gap-3 pr-5">
                      <div className="shrink-0 overflow-hidden" style={{ width: 58, height: 58, borderRadius: 14, border: "1px solid #E3E7F1" }}>
                        <Photo cat={selected.cat} src={selected.logo || selected.photos?.[0]} height={58} radius="14px" iconSize={22} clickable={false} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="truncate" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 16, color: "#0B1437" }}>{selected.name}</h3>
                        <p className="text-xs truncate" style={{ color: "#5B6482" }}>
                          <span style={{ color: c?.color, fontWeight: 500 }}>{c?.label}</span>
                          {km !== null ? ` · A ${fmtDistance(km)} de vos` : ""}
                        </p>
                        {selected.loc && (
                          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "#2B3768" }}>
                            <MapPin size={11} className="shrink-0" /> <span className="truncate">{selected.loc}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {rating ? (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "#2B3768" }}>
                              <Star size={12} fill="#F5A623" color="#F5A623" /> {rating} ({selected.reviews.length})
                            </span>
                          ) : (
                            <span className="text-[11px]" style={{ color: "#64748B" }}>Sin reseñas</span>
                          )}
                          <OpenBadge weekHours={selected.weekHours} />
                        </div>
                      </div>
                    </div>
                    {etiquetas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {etiquetas.map(({ t, Icon, bg, color }) => (
                          <span key={t} className="flex items-center gap-1 text-[11px] font-medium px-2 py-1" style={{ borderRadius: 20, background: bg, color }}>
                            <Icon size={11} /> {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3.5">
                      <button
                        onClick={() => onOpenBusiness(selected.id)}
                        className="flex-1 text-sm font-semibold py-2.5"
                        style={{ backgroundColor: "var(--azul)", color: "#fff", borderRadius: 10 }}
                      >
                        Ver perfil
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer"
                        onClick={() => onTrack && onTrack(selected.id, "ubicacion")}
                        className="flex items-center justify-center gap-1.5 text-sm font-semibold px-3.5 py-2.5"
                        style={{ backgroundColor: "var(--azul-suave)", color: "#0B1437", borderRadius: 10 }}
                      >
                        <Navigation size={15} /> Cómo llegar
                      </a>
                      <button
                        onClick={() => onToggleFavorite(selected.id)} aria-label="Guardar"
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 40, height: 40, borderRadius: 10, background: esFav ? "#FDF1EF" : "#F3F5FA" }}
                      >
                        <Heart size={17} color={esFav ? "#C1443A" : "#64748B"} fill={esFav ? "#C1443A" : "none"} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* vista de lista */}
        {vista === "lista" && (
          <div className="absolute inset-0 overflow-y-auto" style={{ backgroundColor: "#F3F5FA", zIndex: 10 }}>
            <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-3" style={{ paddingBottom: 40 }}>
              {lista.length === 0 ? (
                <div className="text-center py-14">
                  <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>No hay negocios con estos filtros</p>
                  <p className="text-xs mb-3" style={{ color: "#5B6482" }}>Probá quitando alguno para ver más resultados en {zone}.</p>
                  {hayFiltros && <button onClick={limpiarFiltros} className="text-xs font-semibold px-4 py-2" style={{ borderRadius: 8, backgroundColor: "#0B1437", color: "#fff" }}>Quitar filtros</button>}
                </div>
              ) : lista.map((biz) => {
                const c = catInfo(biz.cat);
                const rating = avgRating(biz.reviews);
                const km = distanciaDe(biz);
                return (
                  <div
                    key={biz.id} role="button" tabIndex={0}
                    onClick={() => onOpenBusiness(biz.id)}
                    onKeyDown={(e) => (e.key === "Enter" ? onOpenBusiness(biz.id) : null)}
                    className="w-full flex items-center gap-3 p-3 text-left bg-white cursor-pointer"
                    style={{ borderRadius: 14, border: "1px solid #E3E7F1", boxShadow: "0 3px 14px rgba(11,20,55,0.07)" }}
                  >
                    <div className="shrink-0 overflow-hidden" style={{ width: 54, height: 54, borderRadius: 12 }}>
                      <Photo cat={biz.cat} src={biz.logo || biz.photos?.[0]} height={54} radius="12px" iconSize={22} clickable={false} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{biz.name}</p>
                        {esNegocioNuevo(biz) && <span className="text-[10px] font-semibold px-1.5 py-0.5 shrink-0" style={{ borderRadius: 6, background: "#E4F3EA", color: "#1E6B44" }}>Nuevo</span>}
                      </div>
                      <p className="text-xs truncate" style={{ color: "#5B6482" }}>
                        <span style={{ color: c?.color, fontWeight: 500 }}>{c?.label}</span>{km !== null ? ` · A ${fmtDistance(km)}` : ""}
                      </p>
                      {biz.loc && <p className="text-[11px] truncate mb-1" style={{ color: "#64748B" }}>{biz.loc}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        {rating && <span className="flex items-center gap-0.5 text-xs" style={{ color: "#2B3768" }}><Star size={11} fill="#F5A623" color="#F5A623" /> {rating}</span>}
                        <OpenBadge weekHours={biz.weekHours} />
                        {biz.delivery && <Truck size={13} color="#0B1437" />}
                        {biz.asistenteCodigoPublico && biz.asistenteActivo && <Sparkles size={13} color="#7A4F9E" />}
                        {activeDiscounts(biz).length > 0 && <Tag size={13} color="#B8703F" />}
                      </div>
                    </div>
                    {biz.lat && biz.lng && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setVista("mapa"); setSelectedId(biz.id); }}
                        className="flex items-center justify-center shrink-0" aria-label="Ver en el mapa"
                        style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--azul-suave)" }}
                      >
                        <MapPin size={16} color="var(--azul)" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showCats && <CategoryModal activeCat={filtros.cat} onSelect={(id) => { setFiltro("cat", id); setShowCats(false); }} onClose={() => setShowCats(false)} />}
    </div>
  );
}
