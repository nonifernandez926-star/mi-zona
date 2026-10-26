// Elegir la ubicación del negocio en el mapa. Se ve igual que el mapa principal de Mi Zona (satélite con nombres de calles,
// mismo encabezado y mismos controles). El pin arranca en la ubicación ACTUAL de la persona; se mueve arrastrándolo o tocando el
// mapa, y al confirmar la dirección se escribe sola en el formulario.
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, Layers, LocateFixed, Minus, Plus, Search } from "lucide-react";
import { BotonAtras } from "./cuenta.jsx";
import { CAPAS_MAPA } from "./capasMapa.js";

const CLAVE_CAPA = "miZonaCapaSelector";

const TUCUMAN = [-26.8241, -65.2226];
const NOMINATIM = "https://nominatim.openstreetmap.org";

// Pin azul (mismo estilo que el logo de Mi Zona). La punta queda sobre el punto elegido.
const iconoPin = () => L.divIcon({
  className: "",
  iconSize: [40, 52],
  iconAnchor: [20, 50],
  html: `<svg width="40" height="52" viewBox="0 0 40 52" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))"><path d="M20 1C10 1 2 9 2 19c0 13 18 31 18 31s18-18 18-31C38 9 30 1 20 1z" fill="#1F4FE0" stroke="#fff" stroke-width="2.5"/><circle cx="20" cy="19" r="7" fill="#fff"/></svg>`,
});

// Arma "Calle 123" a partir de la respuesta de Nominatim; si no hay calle, usa las primeras partes del nombre.
function direccionDe(r) {
  const a = r?.address || {};
  const calle = a.road || a.pedestrian || a.footway || a.path || a.residential || "";
  if (calle) return [calle, a.house_number].filter(Boolean).join(" ");
  const partes = String(r?.display_name || "").split(",").map((p) => p.trim()).filter(Boolean);
  return partes.slice(0, 2).join(", ");
}

async function direccionEn(lat, lng) {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=json&zoom=18&addressdetails=1&accept-language=es&lat=${lat}&lon=${lng}`);
    if (!res.ok) return "";
    return direccionDe(await res.json());
  } catch { return ""; }
}

async function buscar(texto, zona) {
  for (const q of [`${texto}, ${zona}, Tucumán, Argentina`, `${texto}, Tucumán, Argentina`]) {
    try {
      const res = await fetch(`${NOMINATIM}/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(q)}`);
      if (!res.ok) continue;
      const d = await res.json();
      if (d?.[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
    } catch { /* se prueba el siguiente formato */ }
  }
  return null;
}

// Pide la ubicación actual. Devuelve { lat, lng } o null si no hay permiso, no hay señal o tarda demasiado.
function ubicacionActual() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

const CtrlBtn = ({ onClick, children, label }) => (
  <button type="button" onClick={onClick} aria-label={label} className="flex items-center justify-center" style={{ width: 44, height: 44, background: "#fff", boxShadow: "0 3px 12px rgba(11,20,55,0.22)" }}>
    {children}
  </button>
);

export function SelectorUbicacion({ direccion = "", zona = "", lat = null, lng = null, onConfirmar, onCancelar }) {
  const divRef = useRef(null);
  const mapaRef = useRef(null);
  const pinRef = useRef(null);
  const capasRef = useRef([]);
  const secRef = useRef(0);
  const [punto, setPunto] = useState(lat && lng ? { lat, lng } : null);
  const [texto, setTexto] = useState(direccion);
  const [cargando, setCargando] = useState(false);
  const [ubicando, setUbicando] = useState(!(lat && lng)); // esperando la ubicación actual
  const [miPos, setMiPos] = useState(null);                 // ubicación actual, si se pudo ver
  const [busqueda, setBusqueda] = useState(direccion);
  const [aviso, setAviso] = useState("");
  const [capa, setCapa] = useState(() => { try { const c = localStorage.getItem(CLAVE_CAPA); return CAPAS_MAPA[c] ? c : "satelite"; } catch { return "satelite"; } });
  const [capasAbierto, setCapasAbierto] = useState(false);

  // Escribe la dirección del punto (con la última consulta ganando, por si se mueve el pin varias veces seguidas)
  const describir = async (p) => {
    const n = ++secRef.current;
    setCargando(true);
    const d = await direccionEn(p.lat, p.lng);
    if (n !== secRef.current) return;
    setCargando(false);
    setTexto(d);
  };
  const mover = (p, { centrar = false, zoom } = {}) => {
    setPunto(p); setAviso("");
    pinRef.current?.setLatLng([p.lat, p.lng]);
    if (centrar) mapaRef.current?.setView([p.lat, p.lng], zoom || Math.max(mapaRef.current.getZoom(), 17));
    describir(p);
  };

  // Crea el mapa una sola vez y ubica el pin: 1) coordenadas ya guardadas, 2) ubicación actual, 3) dirección escrita, 4) Tucumán
  useEffect(() => {
    const mapa = L.map(divRef.current, { zoomControl: false, attributionControl: false, zoomSnap: 0.5, wheelPxPerZoomLevel: 90, maxZoom: 19 });
    mapaRef.current = mapa;
    const pin = L.marker(TUCUMAN, { draggable: true, icon: iconoPin(), autoPan: true }).addTo(mapa);
    pinRef.current = pin;
    pin.on("dragend", () => { const ll = pin.getLatLng(); const p = { lat: ll.lat, lng: ll.lng }; setPunto(p); setAviso(""); describir(p); });
    mapa.on("click", (e) => { const p = { lat: e.latlng.lat, lng: e.latlng.lng }; pin.setLatLng(e.latlng); setPunto(p); setAviso(""); describir(p); });

    let vivo = true;
    mapa.setView(lat && lng ? [lat, lng] : TUCUMAN, lat && lng ? 17 : 13);
    pin.setLatLng(lat && lng ? [lat, lng] : TUCUMAN);
    (async () => {
      if (lat && lng) { if (!direccion) describir({ lat, lng }); return; }
      const gps = await ubicacionActual();
      if (!vivo) return;
      setUbicando(false);
      if (gps) { setMiPos(gps); mover(gps, { centrar: true, zoom: 18 }); return; }
      const g = direccion.trim() ? await buscar(direccion, zona) : null;
      if (!vivo) return;
      if (g) { mover(g, { centrar: true, zoom: 17 }); return; }
      setAviso("No pudimos ver tu ubicación. Buscá la dirección o movés el pin a mano.");
    })();
    const t1 = setTimeout(() => mapa.invalidateSize(), 120);
    const t2 = setTimeout(() => mapa.invalidateSize(), 500);
    return () => { vivo = false; clearTimeout(t1); clearTimeout(t2); mapa.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dibuja la capa elegida (satélite por defecto, igual que el mapa principal)
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    capasRef.current.forEach((l) => mapa.removeLayer(l));
    capasRef.current = CAPAS_MAPA[capa].capas.map((c, i) => { const l = L.tileLayer(c.url, c.opciones).addTo(mapa); if (i > 0) l.bringToFront(); return l; });
    try { localStorage.setItem(CLAVE_CAPA, capa); } catch { /* sin almacenamiento */ }
  }, [capa]);

  const alBuscar = async (e) => {
    e.preventDefault();
    if (!busqueda.trim()) return;
    setCargando(true); setAviso("");
    const g = await buscar(busqueda.trim(), zona);
    setCargando(false);
    if (!g) { setAviso("No encontramos ese lugar. Probá con calle y número, o movés el pin a mano."); return; }
    mover(g, { centrar: true, zoom: 17 });
  };

  const irAMiUbicacion = async () => {
    setUbicando(true); setAviso("");
    const gps = await ubicacionActual();
    setUbicando(false);
    if (!gps) { setAviso("No pudimos ver tu ubicación. Revisá el permiso del navegador o movés el pin a mano."); return; }
    setMiPos(gps);
    mover(gps, { centrar: true, zoom: 18 });
  };

  const confirmar = () => {
    if (!punto) return;
    onConfirmar({ direccion: texto.trim(), lat: punto.lat, lng: punto.lng });
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 95, background: "#F3F5FA" }} role="dialog" aria-label="Elegir ubicación en el mapa">
      <style>{`.leaflet-container { font-family: var(--fuente-texto); }`}</style>

      {/* encabezado: igual que el del mapa principal */}
      <div style={{ backgroundColor: "var(--azul-oscuro)" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <BotonAtras onClick={onCancelar} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)" }}>Elegí la ubicación del negocio</p>
            <p className="text-[11px]" style={{ color: "var(--azul-palido)" }}>{ubicando ? "Buscando tu ubicación actual..." : "Arrastrá el pin o tocá el mapa"}</p>
          </div>
        </div>
      </div>

      {/* buscador (en el lugar de los filtros del mapa principal) */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #E3E7F1" }}>
        <form onSubmit={alBuscar} className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3" style={{ height: 40, borderRadius: 12, border: "1px solid #E3E7F1", background: "#F3F5FA" }}>
            <Search size={16} color="#5B6482" className="shrink-0" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar calle y número" className="flex-1 min-w-0 bg-transparent text-sm outline-none" aria-label="Buscar dirección" />
          </div>
          <button type="submit" className="text-xs font-semibold px-4 shrink-0" style={{ height: 40, borderRadius: 12, background: "var(--azul-oscuro)", color: "#fff" }}>Buscar</button>
        </form>
      </div>

      {/* mapa */}
      <div className="relative flex-1" style={{ minHeight: 0 }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, isolation: "isolate" }}>
          <div ref={divRef} style={{ width: "100%", height: "100%" }} />
        </div>

        <div className="absolute pointer-events-none" style={{ left: 8, top: 6, zIndex: 12, maxWidth: "70%", fontSize: 9, lineHeight: 1.2, color: capa === "satelite" ? "#fff" : "#475569", textShadow: capa === "satelite" ? "0 1px 2px rgba(0,0,0,.7)" : "none" }}>
          {CAPAS_MAPA[capa].atribucion}
        </div>

        {/* controles: zoom, tipo de mapa y mi ubicación (los mismos del mapa principal) */}
        <div className="absolute flex flex-col gap-2" style={{ right: 12, top: 12, zIndex: 20 }}>
          <div className="flex flex-col overflow-hidden" style={{ borderRadius: 12, boxShadow: "0 3px 12px rgba(11,20,55,0.22)" }}>
            <CtrlBtn onClick={() => mapaRef.current?.zoomIn()} label="Acercar"><Plus size={18} color="#0B1437" /></CtrlBtn>
            <div style={{ height: 1, background: "#E3E7F1" }} />
            <CtrlBtn onClick={() => mapaRef.current?.zoomOut()} label="Alejar"><Minus size={18} color="#0B1437" /></CtrlBtn>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setCapasAbierto((v) => !v)} aria-label="Cambiar tipo de mapa" className="flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 12, background: capasAbierto ? "var(--azul)" : "#fff", boxShadow: "0 3px 12px rgba(11,20,55,0.22)" }}>
              <Layers size={18} color={capasAbierto ? "#fff" : "#0B1437"} />
            </button>
            {capasAbierto && (
              <div className="absolute flex gap-2 p-2" style={{ right: 48, top: 0, borderRadius: 16, background: "#fff", boxShadow: "0 10px 28px rgba(11,20,55,0.28)" }}>
                {Object.entries(CAPAS_MAPA).map(([id, c]) => (
                  <button type="button" key={id} onClick={() => { setCapa(id); setCapasAbierto(false); }} className="flex flex-col items-center gap-1">
                    <span style={{ width: 58, height: 58, borderRadius: 12, background: c.muestra, border: `3px solid ${capa === id ? "var(--azul)" : "transparent"}`, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }} />
                    <span className="text-[11px] font-semibold" style={{ color: capa === id ? "var(--azul)" : "#2B3768" }}>{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={irAMiUbicacion} aria-label="Ir a mi ubicación" className="flex items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: 12, background: miPos ? "var(--azul)" : "#fff", boxShadow: "0 3px 12px rgba(11,20,55,0.22)" }}>
            <LocateFixed size={18} color={miPos ? "#fff" : "#0B1437"} className={ubicando ? "animate-pulse" : ""} />
          </button>
        </div>
      </div>

      {/* ubicación elegida y confirmar */}
      <div className="p-4" style={{ background: "#fff", borderTop: "1px solid #E3E7F1", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <p className="text-xs font-medium mb-1" style={{ color: "#5B6482" }}>Ubicación elegida</p>
        <p className="text-sm font-semibold mb-3" style={{ color: "#0B1437", minHeight: 20 }}>
          {ubicando && !punto ? "Buscando tu ubicación actual..." : cargando ? "Buscando la dirección..." : texto || (punto ? "Sin nombre de calle: se guardará el punto del mapa" : "Todavía no elegiste un punto")}
        </p>
        {aviso && <p className="text-xs mb-2" style={{ color: "#C1443A" }}>{aviso}</p>}
        <button type="button" onClick={confirmar} disabled={!punto || cargando} className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
          style={{ borderRadius: 12, background: punto && !cargando ? "var(--azul, #1F4FE0)" : "#B8C2E0", color: "#fff" }}>
          <Check size={18} /> Confirmar ubicación
        </button>
      </div>
    </div>
  );
}
