// Elegir la ubicación del negocio en el mapa: se mueve el pin (arrastrándolo o tocando el mapa) y al confirmar
// la dirección se escribe sola en el formulario. Usa el mismo mapa que el resto de Mi Zona (Leaflet + relieve de Esri).
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeft, Check, LocateFixed, Search } from "lucide-react";

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

export function SelectorUbicacion({ direccion = "", zona = "", lat = null, lng = null, onConfirmar, onCancelar }) {
  const divRef = useRef(null);
  const mapaRef = useRef(null);
  const pinRef = useRef(null);
  const secRef = useRef(0);
  const [punto, setPunto] = useState(lat && lng ? { lat, lng } : null);
  const [texto, setTexto] = useState(direccion);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState(direccion);
  const [aviso, setAviso] = useState("");

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

  useEffect(() => {
    const mapa = L.map(divRef.current, { zoomControl: false, attributionControl: false, zoomSnap: 0.5, maxZoom: 19 });
    mapaRef.current = mapa;
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, maxNativeZoom: 17 }).addTo(mapa); // Relieve, igual que el mapa de Mi Zona
    L.control.attribution({ prefix: false, position: "bottomleft" }).addAttribution("Tiles © Esri — Esri, USGS, NOAA, HERE, Garmin, OpenStreetMap contributors").addTo(mapa);
    L.control.zoom({ position: "topright" }).addTo(mapa);
    const pin = L.marker(TUCUMAN, { draggable: true, icon: iconoPin(), autoPan: true }).addTo(mapa);
    pinRef.current = pin;
    pin.on("dragend", () => { const ll = pin.getLatLng(); const p = { lat: ll.lat, lng: ll.lng }; setPunto(p); setAviso(""); describir(p); });
    mapa.on("click", (e) => { const p = { lat: e.latlng.lat, lng: e.latlng.lng }; pin.setLatLng(e.latlng); setPunto(p); setAviso(""); describir(p); });

    let vivo = true;
    (async () => {
      if (lat && lng) { mapa.setView([lat, lng], 17); pin.setLatLng([lat, lng]); if (!direccion) describir({ lat, lng }); return; }
      mapa.setView(TUCUMAN, 13); pin.setLatLng(TUCUMAN);
      const g = direccion.trim() ? await buscar(direccion, zona) : null;
      if (!vivo) return;
      if (g) { mapa.setView([g.lat, g.lng], 17); pin.setLatLng([g.lat, g.lng]); setPunto(g); }
    })();
    setTimeout(() => mapa.invalidateSize(), 50);
    return () => { vivo = false; mapa.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alBuscar = async (e) => {
    e.preventDefault();
    if (!busqueda.trim()) return;
    setCargando(true); setAviso("");
    const g = await buscar(busqueda.trim(), zona);
    setCargando(false);
    if (!g) { setAviso("No encontramos ese lugar. Probá con calle y número, o movés el pin a mano."); return; }
    mover(g, { centrar: true, zoom: 17 });
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) { setAviso("Tu dispositivo no permite ubicarte."); return; }
    setCargando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCargando(false); mover({ lat: pos.coords.latitude, lng: pos.coords.longitude }, { centrar: true, zoom: 18 }); },
      () => { setCargando(false); setAviso("No pudimos ver tu ubicación. Revisá el permiso del navegador o movés el pin a mano."); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const confirmar = () => {
    if (!punto) return;
    onConfirmar({ direccion: texto.trim(), lat: punto.lat, lng: punto.lng });
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 95, background: "#F3F5FA" }} role="dialog" aria-label="Elegir ubicación en el mapa">
      <div className="flex items-center gap-2 p-3" style={{ background: "#fff", borderBottom: "1px solid #E3E7F1" }}>
        <button type="button" onClick={onCancelar} aria-label="Volver" className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid #E3E7F1", background: "#fff" }}>
          <ArrowLeft size={20} color="#0B1437" />
        </button>
        <form onSubmit={alBuscar} className="flex-1 flex items-center gap-2 px-3" style={{ height: 40, borderRadius: 12, border: "1px solid #E3E7F1", background: "#F3F5FA" }}>
          <Search size={16} color="#5B6482" className="shrink-0" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar calle y número" className="flex-1 min-w-0 bg-transparent text-sm outline-none" aria-label="Buscar una dirección" />
        </form>
      </div>

      <div className="relative flex-1" style={{ minHeight: 0 }}>
        <div ref={divRef} style={{ position: "absolute", inset: 0 }} />
        <button type="button" onClick={usarMiUbicacion} aria-label="Usar mi ubicación" className="absolute flex items-center justify-center"
          style={{ zIndex: 500, right: 10, bottom: 14, width: 44, height: 44, borderRadius: 14, background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,.25)" }}>
          <LocateFixed size={20} color="#0B1437" />
        </button>
        <p className="absolute text-xs font-medium px-3 py-1.5" style={{ zIndex: 500, left: 10, top: 10, borderRadius: 999, background: "rgba(11,20,55,.82)", color: "#fff" }}>
          Arrastrá el pin o tocá el mapa
        </p>
      </div>

      <div className="p-4" style={{ background: "#fff", borderTop: "1px solid #E3E7F1", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <p className="text-xs font-medium mb-1" style={{ color: "#5B6482" }}>Ubicación elegida</p>
        <p className="text-sm font-semibold mb-3" style={{ color: "#0B1437", minHeight: 20 }}>
          {cargando ? "Buscando la dirección..." : texto || (punto ? "Sin nombre de calle: se guardará el punto del mapa" : "Todavía no elegiste un punto")}
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
