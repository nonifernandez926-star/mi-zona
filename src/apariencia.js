// Apariencia de Mi Zona: tema, color de acento, tamaño del texto, movimiento y portada de inicio.
// Se guarda en este dispositivo y se aplica al instante (también al abrir la app, antes de dibujar la pantalla).
import { useEffect, useState } from "react";

const CLAVE = "miZonaApariencia";
const TEMA_ANTERIOR = "miZonaTema"; // la versión anterior solo guardaba el tema

export const ACENTOS = {
  azul: { nombre: "Azul", main: "#2350f5", g1: "#2a58ff", g2: "#1f47e0", suave: "#edf1ff", rgb: "35, 80, 245" },
  violeta: { nombre: "Violeta", main: "#7a4fd0", g1: "#9168e6", g2: "#5b36b0", suave: "#f1eafd", rgb: "122, 79, 208" },
  indigo: { nombre: "Índigo", main: "#4f46e5", g1: "#6366f1", g2: "#3730a3", suave: "#eceafd", rgb: "79, 70, 229" },
  turquesa: { nombre: "Turquesa", main: "#0f9fae", g1: "#1fb7c7", g2: "#0b7c88", suave: "#e1f6f8", rgb: "15, 159, 174" },
  verde: { nombre: "Verde", main: "#1f9d5c", g1: "#2fb872", g2: "#157a46", suave: "#e4f5ec", rgb: "31, 157, 92" },
  dorado: { nombre: "Dorado", main: "#c98a0a", g1: "#e0a122", g2: "#9a6a05", suave: "#fdf3dc", rgb: "201, 138, 10" },
  naranja: { nombre: "Naranja", main: "#e0731e", g1: "#f08a3a", g2: "#b85a12", suave: "#fff1e3", rgb: "224, 115, 30" },
  rojo: { nombre: "Rojo", main: "#d63a3a", g1: "#e85252", g2: "#a82a2a", suave: "#fdeaea", rgb: "214, 58, 58" },
  rosa: { nombre: "Rosa", main: "#d6336c", g1: "#e64d85", g2: "#a82554", suave: "#fde8ef", rgb: "214, 51, 108" },
  grafito: { nombre: "Grafito", main: "#374151", g1: "#4b5563", g2: "#1f2937", suave: "#eef0f4", rgb: "55, 65, 81" },
};
// Derivados del color elegido: tonos oscuros para las cabeceras y claros para brillos y degradados.
const aRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const aHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mezclar = (c, o, t) => c.map((v, i) => v + (o[i] - v) * t); // t=0 → c, t=1 → o
// Mismos valores que tenía el azul original para que no cambie su aspecto
const FIJOS_AZUL = { oscuro: "#0B1437", brillo: "54, 104, 255", claro: "#7FA8F5", claroRgb: "23, 198, 255", claroVivo: "#17c6ff", medio: "#5B91F7", palido: "#BBD1FB" };
export function derivados(a, id) {
  if (id === "azul" || !a) return FIJOS_AZUL;
  const m = aRgb(a.main), g1 = aRgb(a.g1), n = [11, 16, 40];
  const claro = mezclar(g1, [255, 255, 255], 0.35);
  return {
    oscuro: aHex(mezclar(m, [8, 10, 18], 0.84)), // casi negro con el matiz del color
    brillo: g1.join(", "),
    claro: aHex(claro),
    claroRgb: claro.map(Math.round).join(", "),
    claroVivo: aHex(mezclar(g1, [255, 255, 255], 0.5)),
    medio: aHex(mezclar(m, [255, 255, 255], 0.22)),
    palido: aHex(mezclar(m, [255, 255, 255], 0.72)),
  };
}
export const TEXTOS = { normal: 100, grande: 108, extra: 116 };
export const DEFECTO = { tema: "auto", acento: "azul", texto: "normal", movimiento: "normal" };

export function leerApariencia() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) || "null");
    if (guardado) return { ...DEFECTO, ...guardado };
    const temaViejo = localStorage.getItem(TEMA_ANTERIOR);
    return { ...DEFECTO, ...(temaViejo ? { tema: temaViejo } : {}) };
  } catch { return { ...DEFECTO }; }
}

export function aplicarApariencia(cfg) {
  const raiz = document.documentElement;
  const oscuro = cfg.tema === "oscuro" || (cfg.tema === "auto" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  raiz.classList.toggle("tema-oscuro", oscuro);
  const a = ACENTOS[cfg.acento] || ACENTOS.azul;
  raiz.style.setProperty("--azul", a.main);
  raiz.style.setProperty("--azul-g1", a.g1);
  raiz.style.setProperty("--azul-g2", a.g2);
  raiz.style.setProperty("--azul-suave", a.suave);
  raiz.style.setProperty("--azul-rgb", a.rgb);
  const d = derivados(a, ACENTOS[cfg.acento] ? cfg.acento : "azul");
  raiz.style.setProperty("--azul-oscuro", d.oscuro);
  raiz.style.setProperty("--azul-brillo-rgb", d.brillo);
  raiz.style.setProperty("--azul-claro", d.claro);
  raiz.style.setProperty("--azul-claro-rgb", d.claroRgb);
  raiz.style.setProperty("--azul-claro-vivo", d.claroVivo);
  raiz.style.setProperty("--azul-medio", d.medio);
  raiz.style.setProperty("--azul-palido", d.palido);
  raiz.style.fontSize = `${TEXTOS[cfg.texto] || 100}%`;
  raiz.classList.toggle("sin-movimiento", cfg.movimiento === "reducido");
}

export function guardarApariencia(parcial) {
  const cfg = { ...leerApariencia(), ...parcial };
  try { localStorage.setItem(CLAVE, JSON.stringify(cfg)); } catch { /* sin almacenamiento: queda en esta sesión */ }
  aplicarApariencia(cfg);
  window.dispatchEvent(new CustomEvent("zona-apariencia", { detail: cfg }));
  return cfg;
}
export const restablecerApariencia = () => guardarApariencia({ ...DEFECTO });

// Para que los componentes se actualicen cuando cambia la apariencia
export function useApariencia() {
  const [cfg, setCfg] = useState(leerApariencia);
  useEffect(() => {
    const alCambiar = (e) => setCfg(e.detail || leerApariencia());
    window.addEventListener("zona-apariencia", alCambiar);
    return () => window.removeEventListener("zona-apariencia", alCambiar);
  }, []);
  return cfg;
}

aplicarApariencia(leerApariencia()); // al cargar, antes de pintar
