// Fondo de la portada de inicio: cielo, sol o luna, nubes, lluvia, tormenta y montañas según la hora y el clima real de la zona.
// Clima: servicio gratuito Open-Meteo (sin clave). Si no hay internet, se usa solo la hora. Cambia despacio, con transiciones.
import { useEffect, useMemo, useRef, useState } from "react";
import { Thermometer, Droplets } from "lucide-react";
import { getPrivacidad } from "./api.js";

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

const MONTES = { lejos: "M0.0 95.6 L3.1 97.5 L6.2 100.2 L9.4 101.3 L12.5 103.7 L15.6 103.3 L18.8 104.5 L21.9 105.6 L25.0 105.6 L28.1 105.2 L31.2 105.9 L34.4 107.0 L37.5 107.8 L40.6 108.6 L43.8 109.6 L46.9 108.2 L50.0 108.0 L53.1 109.3 L56.2 109.8 L59.4 108.3 L62.5 108.1 L65.6 108.6 L68.8 108.6 L71.9 107.0 L75.0 106.7 L78.1 107.5 L81.2 108.6 L84.4 108.3 L87.5 109.0 L90.6 110.0 L93.8 111.8 L96.9 114.8 L100.0 116.0 L103.1 115.2 L106.2 113.2 L109.4 112.5 L112.5 112.4 L115.6 113.5 L118.8 113.2 L121.9 113.8 L125.0 115.4 L128.1 115.1 L131.2 115.1 L134.4 117.1 L137.5 117.9 L140.6 119.1 L143.8 119.8 L146.9 119.1 L150.0 119.9 L153.1 120.5 L156.2 119.2 L159.4 118.7 L162.5 119.2 L165.6 120.7 L168.8 123.1 L171.9 124.3 L175.0 124.5 L178.1 125.3 L181.2 126.8 L184.4 128.0 L187.5 129.9 L190.6 132.4 L193.8 136.4 L196.9 137.2 L200.0 139.6 L203.1 139.9 L206.2 139.9 L209.4 138.4 L212.5 137.8 L215.6 137.6 L218.8 137.0 L221.9 138.0 L225.0 139.6 L228.1 137.2 L231.2 135.0 L234.4 134.5 L237.5 132.4 L240.6 132.9 L243.8 133.4 L246.9 132.6 L250.0 131.5 L253.1 131.9 L256.2 130.9 L259.4 130.1 L262.5 130.4 L265.6 130.4 L268.8 131.7 L271.9 131.5 L275.0 129.7 L278.1 129.2 L281.2 127.5 L284.4 126.2 L287.5 125.9 L290.6 123.9 L293.8 122.9 L296.9 123.4 L300.0 122.9 L303.1 123.4 L306.2 122.4 L309.4 121.1 L312.5 120.9 L315.6 120.5 L318.8 118.5 L321.9 117.1 L325.0 114.3 L328.1 114.5 L331.2 114.3 L334.4 115.0 L337.5 116.0 L340.6 114.9 L343.8 115.3 L346.9 115.5 L350.0 117.4 L353.1 118.3 L356.2 117.4 L359.4 117.5 L362.5 118.5 L365.6 119.5 L368.8 119.7 L371.9 118.3 L375.0 117.7 L378.1 117.2 L381.2 115.6 L384.4 113.8 L387.5 111.6 L390.6 109.0 L393.8 107.2 L396.9 105.8 L400.0 105.5 L400 220 L0 220Z", medio: "M0.0 150.7 L3.1 148.5 L6.2 147.6 L9.4 146.9 L12.5 145.4 L15.6 144.5 L18.8 145.0 L21.9 143.5 L25.0 141.7 L28.1 141.7 L31.2 141.8 L34.4 142.7 L37.5 144.5 L40.6 144.4 L43.8 143.8 L46.9 143.4 L50.0 142.9 L53.1 143.0 L56.2 142.8 L59.4 142.6 L62.5 141.2 L65.6 139.7 L68.8 138.9 L71.9 135.8 L75.0 134.2 L78.1 134.0 L81.2 134.4 L84.4 134.0 L87.5 133.2 L90.6 132.3 L93.8 132.4 L96.9 130.9 L100.0 130.4 L103.1 130.6 L106.2 129.5 L109.4 128.4 L112.5 126.9 L115.6 126.0 L118.8 125.3 L121.9 123.9 L125.0 121.3 L128.1 119.9 L131.2 119.1 L134.4 118.7 L137.5 117.8 L140.6 116.5 L143.8 116.1 L146.9 114.6 L150.0 113.4 L153.1 112.8 L156.2 111.3 L159.4 109.8 L162.5 107.0 L165.6 107.5 L168.8 106.9 L171.9 105.6 L175.0 104.7 L178.1 104.1 L181.2 103.3 L184.4 102.6 L187.5 102.4 L190.6 103.0 L193.8 104.7 L196.9 105.0 L200.0 105.3 L203.1 106.2 L206.2 106.0 L209.4 105.8 L212.5 104.6 L215.6 106.1 L218.8 107.1 L221.9 108.8 L225.0 109.1 L228.1 110.9 L231.2 113.3 L234.4 114.6 L237.5 116.8 L240.6 117.3 L243.8 118.0 L246.9 118.6 L250.0 119.9 L253.1 119.5 L256.2 120.0 L259.4 119.7 L262.5 119.6 L265.6 119.3 L268.8 118.7 L271.9 117.9 L275.0 117.1 L278.1 116.9 L281.2 117.2 L284.4 119.0 L287.5 119.7 L290.6 120.0 L293.8 118.9 L296.9 118.0 L300.0 117.2 L303.1 115.8 L306.2 115.7 L309.4 112.9 L312.5 111.4 L315.6 112.4 L318.8 112.3 L321.9 110.9 L325.0 110.9 L328.1 110.8 L331.2 110.0 L334.4 109.0 L337.5 107.8 L340.6 106.2 L343.8 105.1 L346.9 104.6 L350.0 103.1 L353.1 102.1 L356.2 102.5 L359.4 101.0 L362.5 100.6 L365.6 100.1 L368.8 99.7 L371.9 98.2 L375.0 98.2 L378.1 99.3 L381.2 99.5 L384.4 99.8 L387.5 101.0 L390.6 101.0 L393.8 102.1 L396.9 101.0 L400.0 101.2 L400 220 L0 220Z", cerca: "M0.0 177.2 L3.1 177.5 L6.2 178.5 L9.4 178.5 L12.5 178.5 L15.6 179.5 L18.8 180.0 L21.9 180.2 L25.0 179.6 L28.1 180.8 L31.2 181.6 L34.4 183.2 L37.5 183.7 L40.6 184.7 L43.8 185.7 L46.9 186.8 L50.0 187.0 L53.1 185.7 L56.2 185.4 L59.4 184.9 L62.5 185.1 L65.6 184.3 L68.8 183.5 L71.9 182.1 L75.0 181.0 L78.1 181.8 L81.2 182.0 L84.4 181.9 L87.5 181.5 L90.6 182.0 L93.8 182.5 L96.9 183.0 L100.0 182.8 L103.1 183.5 L106.2 184.0 L109.4 183.9 L112.5 184.2 L115.6 183.5 L118.8 183.1 L121.9 183.5 L125.0 183.1 L128.1 184.5 L131.2 185.0 L134.4 184.8 L137.5 185.2 L140.6 185.8 L143.8 185.6 L146.9 185.3 L150.0 183.9 L153.1 183.9 L156.2 183.9 L159.4 183.0 L162.5 181.9 L165.6 182.0 L168.8 182.7 L171.9 183.1 L175.0 183.3 L178.1 183.6 L181.2 183.9 L184.4 183.6 L187.5 183.1 L190.6 181.5 L193.8 180.9 L196.9 180.7 L200.0 179.4 L203.1 179.6 L206.2 179.7 L209.4 178.9 L212.5 178.2 L215.6 178.2 L218.8 177.5 L221.9 176.5 L225.0 175.3 L228.1 174.8 L231.2 174.4 L234.4 174.5 L237.5 174.2 L240.6 173.8 L243.8 174.3 L246.9 175.3 L250.0 176.2 L253.1 176.2 L256.2 176.3 L259.4 177.0 L262.5 176.6 L265.6 177.3 L268.8 177.1 L271.9 177.0 L275.0 177.4 L278.1 178.4 L281.2 179.4 L284.4 179.4 L287.5 180.3 L290.6 180.7 L293.8 181.2 L296.9 182.0 L300.0 182.2 L303.1 181.9 L306.2 180.7 L309.4 180.9 L312.5 181.2 L315.6 180.3 L318.8 179.8 L321.9 178.0 L325.0 177.0 L328.1 176.2 L331.2 175.1 L334.4 175.6 L337.5 175.1 L340.6 174.8 L343.8 175.3 L346.9 175.0 L350.0 174.2 L353.1 173.1 L356.2 173.1 L359.4 173.0 L362.5 173.5 L365.6 172.7 L368.8 172.5 L371.9 172.5 L375.0 172.2 L378.1 172.0 L381.2 172.3 L384.4 171.5 L387.5 171.1 L390.6 169.8 L393.8 168.3 L396.9 167.2 L400.0 167.0 L400 220 L0 220Z", frente: "M0.0 204.9 L3.1 205.1 L6.2 205.2 L9.4 205.2 L12.5 204.8 L15.6 204.2 L18.8 203.9 L21.9 203.5 L25.0 203.1 L28.1 202.9 L31.2 202.6 L34.4 202.0 L37.5 201.5 L40.6 201.2 L43.8 200.8 L46.9 200.6 L50.0 201.0 L53.1 200.8 L56.2 200.3 L59.4 200.2 L62.5 199.7 L65.6 199.1 L68.8 198.8 L71.9 198.1 L75.0 197.4 L78.1 197.3 L81.2 197.0 L84.4 197.3 L87.5 197.7 L90.6 197.1 L93.8 196.8 L96.9 196.5 L100.0 196.6 L103.1 196.8 L106.2 196.9 L109.4 196.5 L112.5 196.7 L115.6 196.7 L118.8 196.3 L121.9 195.8 L125.0 195.0 L128.1 195.4 L131.2 195.5 L134.4 195.5 L137.5 195.0 L140.6 195.1 L143.8 195.0 L146.9 195.4 L150.0 195.9 L153.1 195.9 L156.2 195.8 L159.4 195.8 L162.5 195.8 L165.6 196.4 L168.8 196.5 L171.9 196.7 L175.0 196.5 L178.1 196.6 L181.2 196.9 L184.4 197.3 L187.5 197.3 L190.6 197.2 L193.8 196.9 L196.9 196.7 L200.0 196.1 L203.1 195.7 L206.2 194.9 L209.4 194.6 L212.5 194.4 L215.6 194.2 L218.8 193.6 L221.9 194.0 L225.0 193.8 L228.1 193.6 L231.2 193.1 L234.4 193.3 L237.5 193.2 L240.6 192.4 L243.8 191.3 L246.9 190.8 L250.0 190.4 L253.1 190.6 L256.2 190.4 L259.4 190.2 L262.5 190.4 L265.6 189.9 L268.8 189.5 L271.9 189.1 L275.0 188.7 L278.1 188.0 L281.2 187.8 L284.4 187.3 L287.5 186.9 L290.6 186.7 L293.8 186.4 L296.9 186.6 L300.0 186.7 L303.1 186.3 L306.2 186.3 L309.4 186.8 L312.5 186.7 L315.6 186.9 L318.8 186.9 L321.9 187.3 L325.0 187.8 L328.1 188.0 L331.2 188.0 L334.4 187.7 L337.5 187.4 L340.6 187.3 L343.8 187.2 L346.9 186.5 L350.0 186.0 L353.1 186.5 L356.2 186.4 L359.4 186.2 L362.5 185.9 L365.6 186.0 L368.8 185.9 L371.9 186.5 L375.0 186.8 L378.1 186.6 L381.2 185.8 L384.4 185.6 L387.5 185.9 L390.6 186.4 L393.8 186.8 L396.9 186.9 L400.0 186.7 L400 220 L0 220Z", nieve: "" };
const ESTRELLAS = [[107, 41, 0.5, 4.6], [259, 5, 0.7, 1.5], [358, 54, 0.9, 2.5], [210, 81, 0.5, 3.8], [321, 11, 0.9, 4.0], [378, 39, 0.5, 2.3], [383, 82, 0.9, 3.7], [31, 90, 0.7, 1.7], [162, 32, 0.9, 1.7], [262, 55, 0.7, 4.0], [297, 6, 0.5, 3.5], [253, 41, 0.9, 2.3], [355, 72, 0.5, 3.5], [288, 33, 0.5, 2.6], [193, 93, 0.5, 0.3], [46, 78, 0.7, 0.9], [380, 26, 0.9, 0.7], [250, 45, 0.5, 5.2], [146, 18, 0.7, 2.7], [266, 45, 0.7, 3.8], [272, 37, 0.9, 3.2], [394, 91, 0.9, 0.8], [194, 50, 0.7, 4.7], [250, 37, 0.7, 3.7], [289, 68, 0.5, 3.8], [300, 21, 0.5, 3.0], [261, 22, 0.9, 0.2], [32, 29, 0.7, 0.2], [23, 24, 0.7, 0.4], [41, 66, 0.9, 1.4], [388, 48, 0.7, 1.3], [141, 72, 0.5, 4.8], [181, 79, 0.5, 2.7], [297, 40, 0.5, 2.2], [261, 94, 0.7, 1.7], [302, 79, 0.5, 2.6], [151, 13, 0.7, 0.5], [40, 55, 0.7, 4.9], [187, 79, 0.5, 0.5], [91, 64, 0.5, 4.2], [199, 74, 0.7, 1.7], [63, 37, 0.9, 2.0], [359, 33, 0.7, 3.4], [363, 90, 0.7, 2.6], [319, 32, 0.7, 1.3], [383, 70, 0.9, 1.5]];
const RAYO = "M312 8 L300 52 L311 52 L296 104 L318 58 L306 58 L322 8 Z";

// fase de la luna (0 nueva · 0,5 llena)
const faseLuna = (d = new Date()) => ((((d.getTime() / 86400000) - 10962.76) % 29.530588) + 29.530588) % 29.530588 / 29.530588;
function trazoLuna(cx, cy, r, p) {
  const phi = 2 * Math.PI * p, cos = Math.cos(phi), rx = Math.max(0.01, Math.abs(cos) * r), creciente = cos > 0;
  const d = `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} A${rx} ${r} 0 0 ${creciente ? 0 : 1} ${cx} ${cy - r} Z`;
  return { d, espejo: p > 0.5 };
}

// Acerca un valor a su objetivo sin saltos: el clima real se actualiza cada tanto, pero lo que se ve cambia de a poquito.
const acercar = (v, objetivo, paso) => (Math.abs(objetivo - v) <= paso ? objetivo : v + Math.sign(objetivo - v) * paso);
const TICK = 10; // segundos entre cada actualización de lo que se ve (todo se mueve con transiciones suaves entre una y otra)

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

  const t = ahora.getHours() * 60 + ahora.getMinutes() + ahora.getSeconds() / 60;
  const sale = datos?.sale ?? 6 * 60 + 30, pone = datos?.pone ?? 19 * 60;
  // clima que se ve (suavizado)
  const gate = lim((e.cob - 0.35) / 0.35); // la lluvia empieza cuando las nubes ya se formaron
  const w = { ...wReal, cobertura: e.cob, tormenta: e.tor > 0.55, nieve: e.nie > 0.05, niebla: e.nieb > 0.05, gotas: Math.round(95 * e.ll * gate) };
  const noche = nocturnidad(t, sale, pone), dia = 1 - noche;

  // colores del cielo, apagados según la cobertura y oscurecidos con tormenta
  const base = cielo(t, sale, pone);
  const gris = [mezcla("#161d33", "#7c8a9e", dia), mezcla("#1c2440", "#a0acbd", dia), mezcla("#222c4c", "#c0c9d5", dia)];
  const f = lim(e.cob * (0.88 + e.tor * 0.17));
  let col = base.map((c, i) => mezcla(c, gris[i], f * 0.85));
  const oscuro = Math.max(e.tor * 0.42, e.fue * 0.25 * lim(e.cob));
  if (oscuro > 0) col = col.map((c) => mezcla(c, "#1a2030", oscuro));
  const calor = datos ? lim((datos.temp - 28) / 10) : 0, frio = datos ? lim((12 - datos.temp) / 12) : 0;
  col = col.map((c, i) => mezcla(mezcla(c, "#ffcf8a", calor * 0.16 * dia * (0.35 + i * 0.35)), "#cfe0ff", frio * 0.14 * dia * (0.35 + i * 0.35)));

  // Sol: sale por la izquierda, sube hasta lo más alto al mediodía solar y baja hasta esconderse tras las montañas.
  // Luna: lo mismo durante la noche. Las posiciones siguen la hora sin saltos (continuas, también bajo el horizonte).
  const pSol = lim((t - sale) / (pone - sale), -0.2, 1.2);
  const sx = 140 + 230 * pSol, sy = 172 - 122 * Math.sin(Math.PI * pSol);
  const calido = 1 - Math.sin(Math.PI * lim(pSol, 0, 1));
  const largoNoche = 1440 - (pone - sale), tn = t >= pone ? t - pone : t + 1440 - pone;
  const pLuna = lim(tn / largoNoche, -0.2, 1.2);
  const mx = 140 + 230 * pLuna, my = 172 - 112 * Math.sin(Math.PI * pLuna);
  const luna = trazoLuna(0, 0, 13, faseLuna(ahora));
  const velo = 1 - lim(w.cobertura * 1.05);
  const rayas = useMemo(() => Array.from({ length: 95 }, (_, i) => ({ x: (i * 37.7) % 420 - 10, y: -(i * 53.3) % 220, l: 7 + (i % 5) * 2.2, d: 0.55 + (i % 7) * 0.09, r: -((i * 0.37) % 1.2) })), []);
  const copos = useMemo(() => Array.from({ length: 46 }, (_, i) => ({ x: (i * 41.3) % 400, r: 0.8 + (i % 3) * 0.5, d: 4 + (i % 6), de: -((i * 0.71) % 6) })), []);

  // nubes: color y densidad (más cobertura = más nubes)
  const claro = mezcla(mezcla("#ffffff", "#ffb48a", calido * 0.35 * dia), "#9aa6bd", noche * 0.78 + w.cobertura * 0.25);
  const sombra = mezcla(mezcla("#7d8aa3", "#3a4256", w.cobertura * 0.7 + noche * 0.4), "#12182b", w.tormenta ? 0.55 : 0);
  const umbral = 0.64 - w.cobertura * 0.34; // más cobertura, más nubes (umbral del ruido)
  const rgb = (h) => hex(h).map((v) => (v / 255).toFixed(3)).join(" ");
  const matriz = (h, a) => { const [r, g, b] = rgb(h).split(" "); return `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  ${a} 0 0 0 ${(-umbral * a).toFixed(2)}`; };

  const tr = `${TICK + 2}s linear`;
  const ver = (n) => ({ transition: `stop-color ${tr}` });
  const montes = { lejos: mezcla(col[2], mezcla("#17265a", "#3d5fae", dia), 0.62), medio: mezcla(col[2], mezcla("#101c48", "#2a4a96", dia), 0.8), cerca: mezcla(col[2], mezcla("#0b1538", "#1f3a82", dia), 0.9), frente: mezcla("#070d26", "#12275e", dia * 0.8) };

  return (
    <>
      <div aria-hidden="true" className="absolute pointer-events-none" style={{ inset: 0, overflow: "hidden", WebkitMaskImage: "linear-gradient(to right, transparent 4%, #000 50%)", maskImage: "linear-gradient(to right, transparent 4%, #000 50%)" }}>
        {/* cielo, estrellas, sol y luna */}
        <svg className="absolute" viewBox="0 0 400 220" preserveAspectRatio="xMaxYMax slice" style={{ right: 0, bottom: 0, width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="fzCielo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: col[0], ...ver() }} /><stop offset=".55" style={{ stopColor: col[1], ...ver() }} /><stop offset="1" style={{ stopColor: col[2], ...ver() }} />
            </linearGradient>
            <radialGradient id="fzSol"><stop offset="0" stopColor="#fffdf2" /><stop offset=".22" stopColor={mezcla("#fff3b0", "#ffb25a", calido)} /><stop offset=".55" stopColor={mezcla("#ffd978", "#ff8a3d", calido)} stopOpacity=".38" /><stop offset="1" stopColor="#ffb25a" stopOpacity="0" /></radialGradient>
            <radialGradient id="fzHaloLuna"><stop offset="0" stopColor="#cfdcff" stopOpacity=".5" /><stop offset=".4" stopColor="#8fa8ee" stopOpacity=".2" /><stop offset="1" stopColor="#8fa8ee" stopOpacity="0" /></radialGradient>
            <radialGradient id="fzLuna" cx=".38" cy=".35"><stop offset="0" stopColor="#fffdf3" /><stop offset=".7" stopColor="#e6e0cc" /><stop offset="1" stopColor="#bdb7a1" /></radialGradient>
            <clipPath id="fzLit"><path d={luna.d} /></clipPath>
          </defs>
          <rect width="400" height="220" fill="url(#fzCielo)" />
          <g style={{ opacity: noche * velo, transition: `opacity ${tr}` }}>
            {ESTRELLAS.map(([x, y, r, d], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" className="fz-estrella" style={{ animationDelay: `${d}s` }} />)}
          </g>
          <g style={{ opacity: lim(velo * 1.15 + 0.12) * (1 - 0.7 * e.tor), transform: `translate(${sx}px, ${sy}px)`, transition: `transform ${tr}, opacity ${tr}` }}>
            <circle r={70 + calido * 40} fill="url(#fzSol)" /><circle r="14" fill="#fffdf2" />
          </g>
          {noche > 0.02 && (
            <g style={{ opacity: lim(noche * 2) * lim(velo * 1.1 + 0.05), transform: `translate(${mx}px, ${my}px)`, transition: `transform ${tr}, opacity ${tr}` }}>
              <circle r="60" fill="url(#fzHaloLuna)" />
              <circle r="13" fill="#232c4b" />
              <g clipPath="url(#fzLit)" transform={luna.espejo ? "scale(-1 1)" : undefined}>
                <circle r="13" fill="url(#fzLuna)" />
                <circle cx="-4" cy="-3" r="3.2" fill="#a9a38d" opacity=".5" /><circle cx="4" cy="3" r="2.4" fill="#a9a38d" opacity=".45" /><circle cx="2" cy="-6" r="1.8" fill="#a9a38d" opacity=".4" /><circle cx="-5" cy="5" r="1.6" fill="#a9a38d" opacity=".4" />
              </g>
            </g>
          )}
        </svg>

        {/* nubes: dos capas con relieve que se desplazan muy despacio */}
        <svg className="absolute fz-nubes" viewBox="0 0 560 220" preserveAspectRatio="none" style={{ left: 0, top: 0, width: "140%", height: "62%", opacity: 1, transition: "opacity 20s linear" }}>
          <defs>
            <filter id="fzNubA" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".006 .017" numOctaves="4" seed="7" /><feColorMatrix values={matriz(sombra, 5.5)} /></filter>
            <filter id="fzNubB" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".006 .017" numOctaves="4" seed="7" /><feColorMatrix values={matriz(claro, 5.5)} /></filter>
          </defs>
          <rect width="560" height="220" filter="url(#fzNubA)" opacity={0.55 + w.cobertura * 0.4} />
          <rect width="560" height="220" y="-5" filter="url(#fzNubB)" opacity={0.5 + w.cobertura * 0.45} />
        </svg>

        {/* montañas, bruma, lluvia, nieve, niebla y rayos */}
        <svg className="absolute" viewBox="0 0 400 220" preserveAspectRatio="xMaxYMax slice" style={{ right: 0, bottom: 0, width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="fzBruma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={col[2]} stopOpacity="0" /><stop offset="1" stopColor={col[2]} stopOpacity=".5" /></linearGradient>
            <filter id="fzBrillo" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <path d={MONTES.lejos} style={{ fill: montes.lejos, transition: `fill ${tr}` }} />
          <path d={MONTES.nieve} fill={mezcla("#cfe0ff", "#ffffff", dia)} opacity={(0.2 + dia * 0.45) * (1 - w.cobertura * 0.35)} />
          <rect x="0" y="86" width="400" height="70" fill="url(#fzBruma)" />
          <path d={MONTES.medio} style={{ fill: montes.medio, transition: `fill ${tr}` }} />
          <rect x="0" y="124" width="400" height="60" fill="url(#fzBruma)" opacity=".7" />
          <path d={MONTES.cerca} style={{ fill: montes.cerca, transition: `fill ${tr}` }} />
          <path d={MONTES.frente} style={{ fill: montes.frente, transition: `fill ${tr}` }} />
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
