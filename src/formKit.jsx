import { useRef, useState } from "react";
import { Check, X, Plus, Clock, Image as ImageIcon, ChevronDown, Camera, Copy } from "lucide-react";
import { uploadImage, comprimirFoto, comprimirImagen } from "./subirFoto.js";
import { DIAS_LARGO, DIAS_CORTO, ORDEN_SEMANA, semanaVacia, hora, resumenHorarios } from "./horarios.js";

// Piezas compartidas de los formularios de fichas (oficios, alquileres). Mismo lenguaje visual en todos.
const AZUL = "#2350F5", TINTA = "#0B1437", SUAVE = "#4A5372", LINEA = "#E3E7F1";

export function Seccion({ icono: Icono, titulo, subtitulo, opcional, children, derecha }) {
  return (
    <section style={{ background: "#fff", border: `1px solid ${LINEA}`, borderRadius: 20, padding: 16, marginBottom: 12, boxShadow: "0 1px 2px rgba(11,20,55,.04)" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        {Icono && <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 12, background: "#EDF1FF", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icono size={20} color={AZUL} /></span>}
        <span style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.0625rem", color: TINTA, lineHeight: 1.2 }}>{titulo}{opcional && <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "#6B7494", marginLeft: 8 }}>Opcional</span>}</h2>
          {subtitulo && <p style={{ fontSize: "0.875rem", color: SUAVE, lineHeight: 1.4, marginTop: 2 }}>{subtitulo}</p>}
        </span>
        {derecha}
      </header>
      {children}
    </section>
  );
}

export function Interruptor({ activo, onChange, titulo, desc }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "0.9375rem", fontWeight: 700, color: TINTA }}>{titulo}</span>
        {desc && <span style={{ display: "block", fontSize: "0.875rem", color: SUAVE, lineHeight: 1.4 }}>{desc}</span>}
      </span>
      <button type="button" role="switch" aria-checked={activo} aria-label={titulo} onClick={onChange}
        style={{ width: 60, height: 48, background: "transparent", border: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
        <span aria-hidden="true" style={{ width: 54, height: 32, borderRadius: 16, background: activo ? AZUL : "#CBD3E1", position: "relative", display: "block" }}>
          <span style={{ position: "absolute", top: 3, left: activo ? 25 : 3, width: 26, height: 26, borderRadius: 13, background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
        </span>
      </button>
    </div>
  );
}

// Avance de la ficha: barra + lista de lo que falta o suma. pasos = [{ ok, texto, requerido }]
export function Avance({ pasos, titulo = "Tu ficha" }) {
  const hechos = pasos.filter((p) => p.ok).length, pct = Math.round((hechos / pasos.length) * 100);
  const [abierto, setAbierto] = useState(false);
  const pendientes = pasos.filter((p) => !p.ok);
  return (
    <div style={{ background: "linear-gradient(135deg,#0B1437,#1B2F7A)", borderRadius: 20, padding: 16, marginBottom: 12, color: "#fff" }} data-conservar-color>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 800, fontSize: "1.0625rem" }}>Completaste el {pct}%</span>
        <button type="button" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} style={{ color: "#C9D6FF", fontSize: "0.875rem", fontWeight: 700, minHeight: 44, minWidth: 44, whiteSpace: "nowrap", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>{abierto ? "Ocultar" : "Ver pasos"}<ChevronDown size={16} style={{ transform: abierto ? "rotate(180deg)" : "none" }} aria-hidden="true" /></button>
      </div>
      <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.18)", marginTop: 10, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#4ADE80" : "#7EA2FF", borderRadius: 4, transition: "width .3s" }} />
      </div>
      <p style={{ fontSize: "0.875rem", color: "#C9D6FF", marginTop: 8, lineHeight: 1.4 }}>{pendientes.length === 0 ? "Está todo listo: una ficha completa se encuentra más rápido." : `Falta: ${pendientes.slice(0, 2).map((p) => p.texto).join(" · ")}${pendientes.length > 2 ? ` y ${pendientes.length - 2} más` : ""}`}</p>
      {abierto && (
        <ul style={{ marginTop: 10, display: "grid", gap: 6 }}>
          {pasos.map((p) => (
            <li key={p.texto} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", color: p.ok ? "#fff" : "#AFC0F0" }}>
              <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 10, background: p.ok ? "#22A559" : "rgba(255,255,255,.14)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{p.ok && <Check size={13} color="#fff" />}</span>{p.texto}{p.requerido && !p.ok ? " (necesario)" : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Entrada de texto con ícono adelante (redes, WhatsApp, precio...)
export function EntradaIcono({ id, icono: Icono, prefijo, ...props }) {
  return (
    <div style={{ position: "relative" }}>
      {Icono && <span aria-hidden="true" style={{ position: "absolute", left: 14, top: 0, bottom: 0, display: "inline-flex", alignItems: "center", pointerEvents: "none" }}><Icono size={18} color="#6B7494" /></span>}
      <input id={id} {...props} style={{ width: "100%", boxSizing: "border-box", minHeight: 48, border: "1px solid #CFD6E8", borderRadius: 12, padding: `11px 14px 11px ${Icono ? 42 : 14}px`, font: "inherit", fontSize: "1rem", background: "#fff", color: TINTA }} />
    </div>
  );
}

// Subida de logo (cuadrado) y fotos (grilla). Toda la lógica de subir vive acá; el formulario solo recibe las URLs.
export function useSubidas({ max, onError }) {
  const [subiendo, setSubiendo] = useState(null);
  const subir = async (archivos, destino, { fotos, setFotos, setLogo }) => {
    const lista = [...archivos]; if (!lista.length) return;
    if (lista.some((a) => !/^image\//.test(a.type) || a.size > 15 * 1024 * 1024)) { onError("Elegí imágenes de hasta 15 MB cada una."); return; }
    setSubiendo(destino); onError(null);
    try {
      if (destino === "logo") setLogo(await uploadImage(await comprimirImagen(lista[0])));
      else { const urls = []; for (const a of lista.slice(0, max - fotos.length)) urls.push(await uploadImage(await comprimirFoto(a))); setFotos([...fotos, ...urls]); }
    } catch { onError("No pudimos subir la foto. Probá de nuevo en un rato."); }
    setSubiendo(null);
  };
  return { subiendo, subir };
}

export function SelectorLogo({ valor, onArchivo, onQuitar, subiendo, etiqueta = "Logo o foto de perfil" }) {
  const ref = useRef(null);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <button type="button" onClick={() => ref.current?.click()} aria-label={valor ? "Cambiar logo" : "Subir logo"} style={{ width: 76, height: 76, borderRadius: 22, border: valor ? `1px solid ${LINEA}` : "2px dashed #AEB9D6", background: "#F3F5FA", display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, padding: 0 }}>
        {valor ? <img src={valor} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Camera size={26} color="#6B7494" aria-hidden="true" />}
      </button>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: TINTA }}>{etiqueta}</p>
        <p style={{ fontSize: "0.8125rem", color: SUAVE, margin: "2px 0 6px" }}>{subiendo ? "Subiendo…" : "Se ve al lado de tu nombre."}</p>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={() => ref.current?.click()} disabled={!!subiendo} style={{ color: AZUL, fontWeight: 700, fontSize: "0.9375rem", minHeight: 44 }}>{valor ? "Cambiar" : "Subir imagen"}</button>
          {valor && !subiendo && <button type="button" onClick={onQuitar} style={{ color: "#9A3B34", fontWeight: 700, fontSize: "0.9375rem", minHeight: 44 }}>Quitar</button>}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { onArchivo(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

export function GaleriaFotos({ fotos, max, onArchivos, onQuitar, subiendo, ayuda }) {
  const ref = useRef(null);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
        {fotos.map((u, i) => (
          <div key={u} style={{ position: "relative", aspectRatio: "1 / 1" }}>
            <img src={u} alt={`Foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} />
            {i === 0 && <span style={{ position: "absolute", left: 6, bottom: 6, background: "rgba(11,20,55,.78)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 8, padding: "2px 7px" }}>Portada</span>}
            <button type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => onQuitar(u)} style={{ position: "absolute", top: 0, right: 0, width: 44, height: 44, background: "transparent", border: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 14, background: "rgba(11,20,55,.78)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={15} color="#fff" /></span></button>
          </div>
        ))}
        {fotos.length < max && (
          <button type="button" onClick={() => ref.current?.click()} disabled={!!subiendo} style={{ aspectRatio: "1 / 1", borderRadius: 14, border: "2px dashed #AEB9D6", background: "#F8F9FD", display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "#4A5372", fontSize: "0.8125rem", fontWeight: 700 }}>
            {subiendo ? "Subiendo…" : (<><Plus size={22} aria-hidden="true" />Agregar</>)}
          </button>
        )}
      </div>
      <p style={{ fontSize: "0.8125rem", color: SUAVE, marginTop: 8, lineHeight: 1.4 }}>{fotos.length} de {max}. {ayuda}</p>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => { onArchivos(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

// ---------- Horarios de la semana ----------
const OPEN = Array.from({ length: 24 }, (_, i) => i), CLOSE = Array.from({ length: 24 }, (_, i) => i + 1);
const selectHora = { minHeight: 44, border: "1px solid #CFD6E8", borderRadius: 10, background: "#fff", color: TINTA, fontSize: "0.9375rem", fontWeight: 600, padding: "0 6px", minWidth: 0, flex: 1 };
const PRESETS = [
  ["Lun a Vie · 9 a 18", () => semana([1, 2, 3, 4, 5], [9, 18])],
  ["Lun a Sáb · 8 a 20", () => semana([1, 2, 3, 4, 5, 6], [8, 20])],
  ["Todos los días", () => semana([0, 1, 2, 3, 4, 5, 6], [9, 20])],
  ["Fines de semana", () => semana([6, 0], [9, 20])],
];
function semana(dias, rango) { const w = semanaVacia(); dias.forEach((d) => { w[d] = [...rango]; }); return w; }

export function EditorHorarios({ value, onChange }) {
  const w = Array.isArray(value) && value.length === 7 ? value : semanaVacia();
  const cambiar = (dia, e) => onChange(w.map((x, i) => (i === dia ? e : x)));
  const primero = ORDEN_SEMANA.find((d) => w[d][0] !== null);
  const resumen = resumenHorarios(w);
  return (
    <div>
      <div role="group" aria-label="Atajos de horarios" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 8, scrollbarWidth: "none" }}>
        {PRESETS.map(([t, fn]) => <button key={t} type="button" onClick={() => onChange(fn())} style={{ flexShrink: 0, whiteSpace: "nowrap", minHeight: 44, padding: "0 14px", borderRadius: 999, border: "1px solid #CFD6E8", background: "#fff", color: TINTA, fontWeight: 600, fontSize: "0.875rem" }}>{t}</button>)}
        <button type="button" onClick={() => onChange(semanaVacia())} style={{ flexShrink: 0, whiteSpace: "nowrap", minHeight: 44, padding: "0 14px", borderRadius: 999, border: 0, background: "transparent", color: "#9A3B34", fontWeight: 700, fontSize: "0.875rem" }}>Limpiar</button>
      </div>
      <ul style={{ display: "grid", gap: 6 }}>
        {ORDEN_SEMANA.map((dia) => {
          const e = w[dia], cerrado = e[0] === null;
          return (
            <li key={dia} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 52, padding: "4px 10px", borderRadius: 14, background: cerrado ? "#F5F6FA" : "#F0F4FF", border: `1px solid ${cerrado ? "#E8EBF3" : "#D5E0FF"}` }}>
              <span style={{ width: 38, fontWeight: 800, fontSize: "0.9375rem", color: cerrado ? "#7A829D" : TINTA, flexShrink: 0 }} title={DIAS_LARGO[dia]}>{DIAS_CORTO[dia]}</span>
              <button type="button" role="switch" aria-checked={!cerrado} aria-label={`${DIAS_LARGO[dia]}: ${cerrado ? "cerrado" : "abierto"}`} onClick={() => cambiar(dia, cerrado ? (primero !== undefined ? [...w[primero]] : [9, 18]) : [null])}
                style={{ width: 46, height: 44, background: "transparent", flexShrink: 0, border: 0, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <span aria-hidden="true" style={{ width: 46, height: 28, borderRadius: 14, background: cerrado ? "#CBD3E1" : AZUL, position: "relative", display: "block" }}>
                  <span style={{ position: "absolute", top: 3, left: cerrado ? 3 : 21, width: 22, height: 22, borderRadius: 11, background: "#fff", transition: "left .2s" }} />
                </span>
              </button>
              {cerrado ? <span style={{ flex: 1, fontSize: "0.9375rem", color: "#7A829D" }}>No atiendo</span> : (
                <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <select aria-label={`${DIAS_LARGO[dia]}: abre`} value={e[0]} onChange={(x) => { const a = Number(x.target.value); cambiar(dia, [a, a === e[1] ? Math.min(24, a + 1) : e[1]]); }} style={selectHora}>{OPEN.map((h) => <option key={h} value={h}>{hora(h)}</option>)}</select>
                  <span aria-hidden="true" style={{ color: "#6B7494" }}>a</span>
                  <select aria-label={`${DIAS_LARGO[dia]}: cierra`} value={e[1]} onChange={(x) => cambiar(dia, [e[0], Number(x.target.value)])} style={selectHora}>{CLOSE.filter((h) => h !== e[0]).map((h) => <option key={h} value={h}>{hora(h)}</option>)}</select>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: "0.875rem", color: SUAVE, lineHeight: 1.4 }}>
        <Clock size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span>{resumen ? <>Así se verá: <b style={{ color: TINTA }}>{resumen}</b></> : "Sin horarios cargados: tu ficha dirá «Consultar horarios»."}</span>
      </div>
      {primero !== undefined && (
        <button type="button" onClick={() => onChange(w.map((x) => (x[0] === null ? x : [...w[primero]])))} style={{ marginTop: 6, color: AZUL, fontWeight: 700, fontSize: "0.875rem", minHeight: 44, display: "inline-flex", alignItems: "center", gap: 6 }}><Copy size={15} aria-hidden="true" /> Repetir el horario de {DIAS_LARGO[primero].toLowerCase()} en los días abiertos</button>
      )}
    </div>
  );
}

// Horarios en modo lectura (detalle de la ficha): resalta el día de hoy
export function TablaHorarios({ weekHours }) {
  const hoy = new Date().getDay();
  return (
    <ul style={{ display: "grid", gap: 2 }}>
      {ORDEN_SEMANA.map((d) => { const e = weekHours[d], cerrado = !e || e[0] === null; return (
        <li key={d} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 10px", borderRadius: 10, background: d === hoy ? "#EDF1FF" : "transparent", fontWeight: d === hoy ? 800 : 500, color: cerrado ? "#7A829D" : TINTA, fontSize: "0.9375rem" }}>
          <span>{DIAS_LARGO[d]}{d === hoy ? " (hoy)" : ""}</span><span>{cerrado ? "Cerrado" : `${hora(e[0])} – ${hora(e[1])}`}</span>
        </li>); })}
    </ul>
  );
}
