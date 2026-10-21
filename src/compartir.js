import { useRef } from "react";
import { ENLACE_DESCARGA_MIZONA } from "./api.js";

// Compartir en Mi Zona (Fase 6). Reglas:
//  · Nunca se comparte un enlace directo a una ficha: va un texto breve (y la imagen, si el celular lo permite) y AL FINAL el enlace de descarga de la app.
//  · Se usa el menú de compartir de Android (navigator.share). Si el celular no lo tiene, se copia el texto.
//  · La app solo puede saber que el menú se completó, NUNCA que el mensaje llegó a alguien.

const corto = (t, max) => { const s = String(t || "").replace(/\s+/g, " ").trim(); return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s; };

// Si por algún motivo no hay un enlace válido, no se agrega la línea (nunca sale «null» ni un enlace roto)
export const pieDescarga = () => (/^https?:\/\//i.test(ENLACE_DESCARGA_MIZONA || "") ? `Descargá Mi Zona: ${ENLACE_DESCARGA_MIZONA}` : "");

// ficha: { tipo: "negocio"|"oficio"|"alquiler", nombre, zona, detalle }  →  texto breve + enlace de descarga al final
export function textoCompartirFicha({ tipo, nombre, zona, detalle }) {
  const que = { negocio: "un negocio", oficio: "un servicio", alquiler: "un alquiler", comunidad: "una publicación" }[tipo] || "algo";
  const lineas = [`Mirá ${que} de nuestra zona en Mi Zona: ${nombre}.`];
  if (zona) lineas.push(`📍 ${zona}`);
  if (detalle) lineas.push(corto(detalle, 140));
  return `${lineas.join("\n")}${pieDescarga() ? `\n\n${pieDescarga()}` : ""}`;
}

// Mensaje del paso que aparece al activar un negocio, oficio o alquiler
export function textoInvitacion(nombre, codigo) {
  const cod = codigo ? ` Cuando te registres, escribí mi código de invitación ${codigo}: los dos ganamos días gratis.` : "";
  return `Ya estoy en Mi Zona${nombre ? ` con “${corto(nombre, 50)}”` : ""}. Ahí encontrás negocios, oficios y alquileres de nuestra zona. Descargá la app para encontrarme y contactarme.${cod}${pieDescarga() ? `\n\n${pieDescarga()}` : ""}`;
}

// Intenta bajar la imagen (máx. 5 s y 4 MB) para compartirla junto al texto. Si no se puede, se comparte solo el texto.
async function archivoDeImagen(url) {
  if (!url || !/^https?:/i.test(url)) return null;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch(url, { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const blob = await r.blob();
    if (!blob.type.startsWith("image/") || blob.size > 4 * 1024 * 1024) return null;
    return new File([blob], `mi-zona.${blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg"}`, { type: blob.type });
  } catch { return null; }
}

// Abre el menú de compartir. Devuelve: "compartido" (se completó el menú) · "cancelado" · "copiado" (sin menú: se copió el texto) · "error"
export async function compartirTexto({ titulo = "Mi Zona", texto, imagen }) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      const archivo = imagen ? await archivoDeImagen(imagen) : null;
      if (archivo && navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ title: titulo, text: texto, files: [archivo] });
      } else {
        await navigator.share({ title: titulo, text: texto });
      }
      return "compartido";
    } catch (e) {
      return e?.name === "AbortError" ? "cancelado" : "error";
    }
  }
  try { await navigator.clipboard.writeText(texto); return "copiado"; } catch { return "error"; }
}

export const compartirFicha = (ficha) => compartirTexto({ titulo: ficha.nombre, texto: textoCompartirFicha(ficha), imagen: ficha.imagen });

// Mensaje corto para avisar el resultado (o null si no hace falta avisar nada)
export const avisoDeCompartir = (r) => (r === "copiado" ? "Copiamos el texto para que lo pegues donde quieras." : r === "error" ? "No pudimos abrir el menú de compartir. Probá de nuevo." : null);

// Pulsación larga (≈0,6 s) sobre una ficha: abre el menú de compartir. Un toque corto sigue abriendo la ficha, y si el dedo se mueve (scroll) se cancela.
// Uso: <div {...usePulsacionLarga(() => compartirFicha(...))}>
export function usePulsacionLarga(alLarga, ms = 600) {
  const timer = useRef(null);
  const disparo = useRef(false);
  const inicio = useRef(null);
  const parar = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  if (!alLarga) return {};
  return {
    onPointerDown: (e) => {
      disparo.current = false; inicio.current = { x: e.clientX, y: e.clientY }; parar();
      timer.current = setTimeout(() => { timer.current = null; disparo.current = true; try { navigator.vibrate?.(15); } catch { /* sin vibración */ } alLarga(); }, ms);
    },
    onPointerMove: (e) => { if (timer.current && inicio.current && Math.hypot(e.clientX - inicio.current.x, e.clientY - inicio.current.y) > 10) parar(); },
    onPointerUp: parar, onPointerCancel: parar, onPointerLeave: parar,
    onContextMenu: (e) => e.preventDefault(), // el menú de "copiar/seleccionar" del navegador no tiene que tapar el de compartir
    onClickCapture: (e) => { if (disparo.current) { disparo.current = false; e.stopPropagation(); e.preventDefault(); } }, // el toque que termina la pulsación larga no abre la ficha
  };
}
export const ESTILO_PULSACION = { WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" };
