// Fondo de la portada de inicio: cielo, sol o luna, nubes, lluvia, tormenta y montañas según la hora y el clima real de la zona.
// Clima: servicio gratuito Open-Meteo (sin clave). Si no hay internet, se usa solo la hora. Cambia despacio, con transiciones.
import { useEffect, useMemo, useRef, useState } from "react";
import { Thermometer, Droplets } from "lucide-react";
import { getPrivacidad } from "./api.js";
import { pintarCielo, pintarMontes, nubesCanvas } from "./cielo.js";

const COORDS = {
  "San Miguel de Tucumán": [-26.8083, -65.2176], "Yerba Buena": [-26.8167, -65.3167], "Tafí Viejo": [-26.7333, -65.2603],
  "Concepción": [-27.3436, -65.5911], "Banda del Río Salí": [-26.8353, -65.1658], "Aguilares": [-27.4308, -65.6128],
};
const coordsDe = (zona) => COORDS[String(zona || "").split(",")[0].trim()] || COORDS["San Miguel de Tucumán"];
const CLAVE_CACHE = "miZonaClima";

/* ---------- clima ---------- */
// Ubicación de la persona (solo para pedir el clima; nunca se guarda). Sin permiso o con "Usar mi ubicación" apagado en Privacidad, se usa la zona elegida.
function ubicacionPersona() {
  return new Promise((resolve) => {
    if (!navigator.geolocation || getPrivacidad().ubicacionBusqueda === false) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition((p) => resolve([p.coords.latitude, p.coords.longitude]), () => resolve(null), { maximumAge: 30 * 60 * 1000, timeout: 8000, enableHighAccuracy: false });
  });
}
export function useClima(zona) {
  const [datos, setDatos] = useState(() => { try { const c = JSON.parse(localStorage.getItem(CLAVE_CACHE) || "null"); return c ? c.d : null; } catch { return null; } });
  useEffect(() => {
    let vivo = true, ultima = 0;
    const cargar = async () => {
      ultima = Date.now();
      try {
        const [lat, lng] = (await ubicacionPersona()) || coordsDe(zona);
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&current=temperature_2m,relative_humidity_2m,weather_code,cloud_cover,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1`);
        if (!r.ok) return;
        const j = await r.json();
        const hm = (iso) => { const [h, m] = String(iso).slice(11, 16).split(":").map(Number); return h * 60 + m; };
        const d = { temp: Math.round(j.current.temperature_2m), hum: Math.round(j.current.relative_humidity_2m), code: j.current.weather_code, nubes: j.current.cloud_cover, sale: hm(j.daily.sunrise[0]), pone: hm(j.daily.sunset[0]) };
        if (!vivo) return;
        setDatos(d);
        try { localStorage.setItem(CLAVE_CACHE, JSON.stringify({ d, t: Date.now() })); } catch { /* sin almacenamiento */ } // solo el clima, nunca las coordenadas
      } catch { /* sin internet: queda lo último que se vio, o solo la hora */ }
    };
    cargar();
    const t = setInterval(cargar, 10 * 60 * 1000);
    // al volver a la app se actualiza enseguida (si pasaron más de 5 minutos)
    const alVolver = () => { if (document.visibilityState === "visible" && Date.now() - ultima > 5 * 60 * 1000) cargar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { vivo = false; clearInterval(t); document.removeEventListener("visibilitychange", alVolver); };
  }, [zona]);
  return datos;
}

/* ---------- color ---------- */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mezcla = (a, b, k) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
const lim = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const PAL = {
  noche: ["#040a22", "#0a1646", "#14285f"], alba: ["#2a3578", "#7a5a9c", "#f08a5c"], salida: ["#3a63b8", "#9fb8e6", "#ffc58a"], manana: ["#2f78d6", "#6fb0f0", "#cfe6fb"],
  dia: ["#1e6fd6", "#5fa8f0", "#bfe0fb"], tarde: ["#2a6fd0", "#68a6ea", "#f5dcb8"], ocaso: ["#2d3f8c", "#d0687a", "#ffa05a"], crepusculo: ["#121f55", "#4a3f7e", "#c0566a"],
};
function cielo(t, sale, pone) {
  const medio = (sale + pone) / 2;
  const ks = [[sale - 70, PAL.noche], [sale - 20, PAL.alba], [sale + 30, PAL.salida], [sale + 110, PAL.manana], [medio, PAL.dia], [pone - 110, PAL.tarde], [pone - 25, PAL.ocaso], [pone + 30, PAL.crepusculo], [pone + 80, PAL.noche]];
  if (t <= ks[0][0] || t >= ks[ks.length - 1][0]) return PAL.noche;
  for (let i = 0; i < ks.length - 1; i++) {
    if (t >= ks[i][0] && t <= ks[i + 1][0]) { const k = (t - ks[i][0]) / (ks[i + 1][0] - ks[i][0]); return ks[i][1].map((c, j) => mezcla(c, ks[i + 1][1][j], k)); }
  }
  return PAL.noche;
}
const nocturnidad = (t, sale, pone) => (t < sale - 50 || t > pone + 70 ? 1 : t < sale + 10 ? lim((sale + 10 - t) / 60) : t > pone + 10 ? lim((t - pone - 10) / 60) : 0);

/* ---------- tiempo (códigos WMO de Open-Meteo) ---------- */
function tiempo(code, nubes) {
  const c = code ?? 0;
  const tormenta = c >= 95, nieve = (c >= 71 && c <= 77) || c === 85 || c === 86, niebla = c === 45 || c === 48;
  const llovizna = c >= 51 && c <= 57, lluvia = (c >= 61 && c <= 67) || (c >= 80 && c <= 82) || tormenta;
  const fuerte = tormenta || c === 65 || c === 67 || c === 82;
  let cobertura = c === 0 ? 0.1 : c === 1 ? 0.28 : c === 2 ? 0.55 : c === 3 ? 0.86 : niebla ? 0.7 : llovizna ? 0.8 : lluvia ? 0.92 : nieve ? 0.9 : 0.3;
  if (typeof nubes === "number") cobertura = lim(cobertura * 0.6 + (nubes / 100) * 0.4 + (c <= 3 ? 0 : 0.1));
  return { tormenta, nieve, niebla, llovizna, lluvia, fuerte, cobertura, gotas: tormenta || fuerte ? 95 : lluvia ? 60 : llovizna ? 28 : 0 };
}
const etiquetaTiempo = (w, noche) => (w.tormenta ? "Tormenta" : w.nieve ? "Nieve" : w.lluvia ? "Lluvia" : w.llovizna ? "Llovizna" : w.niebla ? "Niebla" : w.cobertura > 0.75 ? "Nublado" : w.cobertura > 0.4 ? "Parcialmente nublado" : noche ? "Despejado" : "Soleado");

const RAYO = "M312 8 L300 52 L311 52 L296 104 L318 58 L306 58 L322 8 Z";

// fase de la luna (0 nueva · 0,5 llena)
const faseLuna = (d = new Date()) => ((((d.getTime() / 86400000) - 10962.76) % 29.530588) + 29.530588) % 29.530588 / 29.530588;

// Acerca un valor a su objetivo sin saltos: el clima real se actualiza cada tanto, pero lo que se ve cambia de a poquito.
const acercar = (v, objetivo, paso) => (Math.abs(objetivo - v) <= paso ? objetivo : v + Math.sign(objetivo - v) * paso);
const TICK = 10; // segundos entre cada actualización de lo que se ve

export function FondoClima({ zona }) {
  const datos = useClima(zona);
  const [ahora, setAhora] = useState(() => new Date());
  const wReal = tiempo(datos?.code, datos?.nubes);
  const objetivo = { cob: wReal.cobertura, ll: wReal.gotas / 95, tor: wReal.tormenta ? 1 : 0, fue: wReal.fuerte ? 1 : 0, nie: wReal.nieve ? 1 : 0, nieb: wReal.niebla ? 1 : 0 };
  // lo que se muestra: arranca igual al clima real y después lo sigue despacio (nubes ~6 min, lluvia ~4 min, tormenta ~3 min)
  const [e, setE] = useState(objetivo);
  const objRef = useRef(objetivo); objRef.current = objetivo;
  useEffect(() => {
    const t = setInterval(() => {
      setAhora(new Date());
      const o = objRef.current;
      setE((p) => ({ cob: acercar(p.cob, o.cob, TICK / 360), ll: acercar(p.ll, o.ll, TICK / 240), tor: acercar(p.tor, o.tor, TICK / 180), fue: acercar(p.fue, o.fue, TICK / 240), nie: acercar(p.nie, o.nie, TICK / 240), nieb: acercar(p.nieb, o.nieb, TICK / 240) }));
    }, TICK * 1000);
    return () => clearInterval(t);
  }, []);

  // tamaño real de la portada (el cielo se dibuja a ese tamaño)
  const caja = useRef(null), cvCielo = useRef(null), cvNubes = useRef(null), cvMontes = useRef(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = caja.current; if (!el) return undefined;
    const medir = () => setTam({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) });
    medir();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(medir); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const t = ahora.getHours() * 60 + ahora.getMinutes() + ahora.getSeconds() / 60;
  const sale = datos?.sale ?? 6 * 60 + 30, pone = datos?.pone ?? 19 * 60;
  const gate = lim((e.cob - 0.35) / 0.35); // la lluvia empieza cuando las nubes ya se formaron
  const w = { ...wReal, cobertura: e.cob, tormenta: e.tor > 0.55, nieve: e.nie > 0.05, niebla: e.nieb > 0.05, gotas: Math.round(95 * e.ll * gate) };
  const noche = nocturnidad(t, sale, pone), dia = 1 - noche;

  // colores del cielo, apagados según la cobertura y oscurecidos con tormenta
  const base = cielo(t, sale, pone);
  const gris = [mezcla("#161d33", "#7c8a9e", dia), mezcla("#1c2440", "#a0acbd", dia), mezcla("#222c4c", "#c0c9d5", dia)];
  const f = lim(e.cob * (0.88 + e.tor * 0.17));
  let col = base.map((c, i) => mezcla(c, gris[i], f * 0.8));
  const oscuro = Math.max(e.tor * 0.42, e.fue * 0.25 * lim(e.cob));
  if (oscuro > 0) col = col.map((c) => mezcla(c, "#1a2030", oscuro));
  const calor = datos ? lim((datos.temp - 28) / 10) : 0, frio = datos ? lim((12 - datos.temp) / 12) : 0;
  col = col.map((c, i) => mezcla(mezcla(c, "#ffcf8a", calor * 0.16 * dia * (0.35 + i * 0.35)), "#cfe0ff", frio * 0.14 * dia * (0.35 + i * 0.35)));

  const rayas = useMemo(() => Array.from({ length: 95 }, (_, i) => ({ x: (i * 37.7) % 420 - 10, y: -(i * 53.3) % 220, l: 7 + (i % 5) * 2.2, d: 0.55 + (i % 7) * 0.09, r: -((i * 0.37) % 1.2) })), []);
  const copos = useMemo(() => Array.from({ length: 46 }, (_, i) => ({ x: (i * 41.3) % 400, r: 0.8 + (i % 3) * 0.5, d: 4 + (i % 6), de: -((i * 0.71) % 6) })), []);

  // colores de nubes y montañas
  const calido = 1 - Math.sin(Math.PI * lim((t - sale) / (pone - sale)));
  const claro = mezcla(mezcla("#ffffff", "#ffb48a", calido * 0.35 * dia), "#9aa6bd", noche * 0.78 + w.cobertura * 0.25);
  const sombra = mezcla(mezcla("#7d8aa3", "#3a4256", w.cobertura * 0.7 + noche * 0.4), "#12182b", w.tormenta ? 0.55 : 0);
  const montes = { lejos: mezcla(col[2], mezcla("#17265a", "#3d5fae", dia), 0.62), medio: mezcla(col[2], mezcla("#101c48", "#2a4a96", dia), 0.8), cerca: mezcla(col[2], mezcla("#0b1538", "#1f3a82", dia), 0.9), frente: mezcla("#070d26", "#12275e", dia * 0.8) };

  // dibujo (se repite cada vez que cambia la hora, el clima o el tamaño)
  useEffect(() => {
    const { w: W, h: H } = tam;
    if (!W || !H || !cvCielo.current || !cvMontes.current || !cvNubes.current) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ajustar = (cv) => { const pw = Math.round(W * dpr), ph = Math.round(H * dpr); if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; } const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); return c; };
    const horizonte = 0.82 * H;
    // Sol: sale por la izquierda, sube y baja hasta esconderse tras las montañas. Luna: igual durante la noche.
    const pSol = lim((t - sale) / (pone - sale), -0.14, 1.14);
    const elevSol = Math.sin(Math.PI * pSol);
    const sol = { x: W * (0.14 + 0.78 * pSol), y: horizonte - (horizonte - 0.14 * H) * elevSol, elev: elevSol, vis: elevSol > -0.3 ? 1 : 0 };
    const largoNoche = 1440 - (pone - sale), tn = t >= pone ? t - pone : t + 1440 - pone;
    const pLuna = lim(tn / largoNoche, -0.14, 1.14);
    const elevLuna = Math.sin(Math.PI * pLuna);
    const luna = { x: W * (0.1 + 0.8 * pLuna), y: horizonte - (horizonte - 0.17 * H) * elevLuna, elev: elevLuna, vis: elevLuna > -0.3 ? 1 : 0, fase: faseLuna(ahora) };
    const P = { W, H, col, noche, dia, cob: e.cob, tor: e.tor, sol, luna, horizonte, montes, bajo: lim(1 - elevSol * 2.4) * dia, radioSol: lim(W * 0.058, 20, 30), radioLuna: lim(W * 0.07, 26, 36) };
    pintarCielo(ajustar(cvCielo.current), W, H, P);
    pintarMontes(ajustar(cvMontes.current), W, H, P);
    // nubes: se generan en baja resolución (se ven suaves) y se desplazan despacio con CSS
    const esc = 3, cw = Math.ceil((W * 1.4) / esc), ch = Math.ceil((H * 0.62) / esc), cn = cvNubes.current;
    if (cn.width !== cw || cn.height !== ch) { cn.width = cw; cn.height = ch; }
    const luz = dia > 0.5 ? sol : luna;
    const vx = luz.x - W * 0.5, vy = luz.y - H * 0.3, vl = Math.hypot(vx, vy) || 1;
    nubesCanvas(cn, { claro, sombra, cob: e.cob, luz: { dx: vx / vl, dy: vy / vl }, sol: { x: sol.x, y: sol.y }, bajo: P.bajo, noche, escala: esc, ancho: W });
  });

  return (
    <>
      <div ref={caja} aria-hidden="true" className="absolute pointer-events-none" style={{ inset: 0, overflow: "hidden" }}>
        <canvas ref={cvCielo} className="absolute" style={{ left: 0, top: 0, width: "100%", height: "100%" }} />
        <canvas ref={cvNubes} className="absolute fz-nubes" style={{ left: 0, top: 0, width: "140%", height: "62%" }} />
        <canvas ref={cvMontes} className="absolute" style={{ left: 0, top: 0, width: "100%", height: "100%" }} />

        {/* lluvia, nieve, niebla y rayos */}
        <svg className="absolute" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" style={{ left: 0, top: 0, width: "100%", height: "100%" }}>
          <defs>
            <filter id="fzBrillo" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {w.niebla && <rect width="400" height="220" fill="#dfe6ef" opacity={(0.28 + dia * 0.12) * e.nieb} />}
          {w.gotas > 0 && (
            <g stroke="#d6e6ff" strokeWidth=".8" strokeLinecap="round" opacity={(0.28 + dia * 0.12) * lim(e.ll * 2.5) * gate}>
              {rayas.slice(0, w.gotas).map((g, i) => <line key={i} className="fz-gota" x1={g.x} y1={g.y} x2={g.x - 2} y2={g.y + g.l} style={{ animationDuration: `${g.d}s`, animationDelay: `${g.r}s` }} />)}
            </g>
          )}
          {w.nieve && <g fill="#fff" opacity={0.8 * e.nie}>{copos.map((c, i) => <circle key={i} className="fz-copo" cx={c.x} cy="0" r={c.r} style={{ animationDuration: `${c.d}s`, animationDelay: `${c.de}s` }} />)}</g>}
          {w.tormenta && (
            <>
              <rect width="400" height="220" fill="#dbe8ff" className="fz-relampago" />
              <path d={RAYO} fill="#fff" stroke="#bcd3ff" strokeWidth="1.2" filter="url(#fzBrillo)" className="fz-rayo" />
            </>
          )}
        </svg>
        {/* sombra suave a la izquierda para que el texto se lea siempre */}
        <div className="absolute" style={{ inset: 0, background: "linear-gradient(100deg, rgba(5,12,40,.42) 0%, rgba(5,12,40,.16) 42%, transparent 68%)" }} />
      </div>

      {datos && (
        <div className="absolute flex items-center gap-2.5 text-[11px] font-semibold" aria-label={`${etiquetaTiempo(w, noche > 0.5)}, ${datos.temp} grados, humedad ${datos.hum} por ciento`}
          style={{ right: 14, top: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(5,12,40,.38)", border: "1px solid rgba(255,255,255,.14)", color: "#E6EEFF", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 2 }}>
          <span className="flex items-center gap-1"><Thermometer size={12} color="var(--azul-palido)" />{datos.temp}°</span>
          <span className="flex items-center gap-1"><Droplets size={12} color="var(--azul-palido)" />{datos.hum}%</span>
        </div>
      )}
    </>
  );
}
