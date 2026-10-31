import { useEffect, useMemo, useRef, useState } from "react";
import { Store, Home, Wrench, MapPin, Heart, Search, Star, Clock, Sparkles, ChevronRight, ChevronDown, Package, PartyPopper, Hammer, Grid3x3, X, Zap, Droplets, Flame, HardHat, Paintbrush, Car, Truck, KeyRound, Check } from "lucide-react";
import { alquileresApi, oficiosApi, getPrivacidad } from "./api.js";
import { CATEGORIAS, ETIQUETA_TIPO, textoPrecio, resumenVivienda } from "./alquileres.js";
import { RUBROS } from "./rubros.js";
import { Hoja, Chip, botonSecundario, diasDesde } from "./oficios.jsx";
import { alternarFavFicha, useEsFavFicha } from "./favoritos.js";
import { abiertoAhora, resumenHorarios } from "./horarios.js";
import { EstadoError } from "./componentes/Estados.jsx";

// Inicio unificado: un solo selector (Negocios · Alquileres · Oficios) y, debajo, el listado de lo que se eligió, siempre en la zona
// que la persona tiene elegida en Inicio. Los tres se ven igual: tarjeta de categorías, fila de filtros y listado.
// Los negocios los sigue dibujando App.jsx; acá están los otros dos y las piezas que comparten los tres.

const TINTA = "#0B1437", SUAVE = "#5B6482", LINEA = "#E3E7F1";
export const MODOS = [
  { id: "negocios", label: "Negocios", icono: Store },
  { id: "alquileres", label: "Alquileres", icono: Home },
  { id: "oficios", label: "Oficios", icono: Wrench },
];
export const PLACEHOLDER = { negocios: "Buscá un negocio, producto o servicio...", alquileres: "Buscá un alquiler: casa, sillas...", oficios: "Buscá un oficio: plomero..." };
const MODO_KEY = "miZonaModoInicio";
export const leerModo = () => { try { const m = localStorage.getItem(MODO_KEY); return MODOS.some((x) => x.id === m) ? m : "negocios"; } catch { return "negocios"; } };
export const guardarModo = (m) => { try { localStorage.setItem(MODO_KEY, m); } catch { /* sin almacenamiento */ } };

// "San Miguel de Tucumán, Tucumán" → { localidad, provincia }
export function partesZona(zone) {
  const t = String(zone || ""), i = t.lastIndexOf(",");
  return i < 0 ? { localidad: t.trim(), provincia: "" } : { localidad: t.slice(0, i).trim(), provincia: t.slice(i + 1).trim() };
}

// ---------- selector (compacto) ----------
export function SelectorModo({ modo, onCambiar }) {
  return (
    <div role="tablist" aria-label="Qué querés ver" className="bg-white" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 3, padding: 4, borderRadius: 16, border: `1px solid ${LINEA}`, boxShadow: "0 8px 22px rgba(11,20,55,0.10)" }}>
      {MODOS.map((m) => {
        const Icono = m.icono, act = modo === m.id;
        return (
          <button key={m.id} type="button" role="tab" aria-selected={act} onClick={() => onCambiar(m.id)}
            style={{ minHeight: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 4px", background: act ? "linear-gradient(135deg,var(--azul),var(--azul-medio))" : "transparent", color: act ? "#fff" : "#2B3768", boxShadow: act ? "0 6px 14px rgba(var(--azul-rgb),0.30)" : "none", transition: "all .2s", minWidth: 0 }}>
            <Icono size={16} aria-hidden="true" />
            <span style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap" }}>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- barra de filtros: la misma para Negocios, Alquileres y Oficios ----------
// El selector de orden (ej. «Destacados») abre una lista chica justo debajo, con una opción por renglón. Al elegir una, se cierra.
// Al lado, las píldoras de filtro (se deslizan hacia los costados sin tapar la lista).
// orden: { opciones: [{ id, titulo, Icon, color, fondo }], valor, onChange }
// pildoras: [{ id, texto, activo, onClick, icono, verde, peligro, cerrar }]
export function BarraFiltros({ orden, pildoras }) {
  const [abierto, setAbierto] = useState(false);
  const op = orden.opciones.find((o) => o.id === orden.valor) || orden.opciones[0];
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="relative shrink-0">
        <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} aria-haspopup="listbox" aria-label={`Ordenar por: ${op.titulo}`}
          className="flex items-center gap-2 font-semibold pl-2 pr-3 py-1.5"
          style={{ fontSize: 13, borderRadius: 20, border: `1px solid ${abierto ? "var(--azul)" : "#D5DCF0"}`, color: TINTA, backgroundColor: "#fff", boxShadow: "0 1px 2px rgba(11,20,55,.06)" }}>
          <span className="flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: 8, background: op.fondo }}><op.Icon size={14} color={op.color} strokeWidth={2.3} /></span>
          {op.titulo}
          <ChevronDown size={14} color={SUAVE} style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </button>
        {abierto && (
          <>
            {/* toque fuera de la lista: la cierra */}
            <div onClick={() => setAbierto(false)} aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 30 }} />
            <div role="listbox" aria-label="Ordenar por" style={{ position: "absolute", left: 0, top: "calc(100% + 6px)", zIndex: 31, minWidth: 220, background: "#fff", borderRadius: 16, border: `1px solid ${LINEA}`, boxShadow: "0 14px 34px rgba(15,22,55,.18)", padding: 6, animation: "zona-subir .18s var(--zona-ease) backwards" }}>
              {orden.opciones.map((o) => {
                const act = o.id === orden.valor;
                return (
                  <button key={o.id} type="button" role="option" aria-selected={act} onClick={() => { orden.onChange(o.id); setAbierto(false); }}
                    className="w-full flex items-center gap-2.5 text-left"
                    style={{ minHeight: 46, padding: "6px 10px", borderRadius: 12, fontSize: 14, fontWeight: act ? 700 : 500, background: act ? "var(--azul-suave)" : "transparent", color: act ? "var(--azul)" : "#2B3768" }}>
                    <span className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: 9, background: o.fondo }}><o.Icon size={15} color={o.color} strokeWidth={2.3} aria-hidden="true" /></span>
                    <span className="flex-1">{o.titulo}</span>
                    {act && <Check size={16} strokeWidth={3} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 min-w-0 flex-1 [&>*]:shrink-0" style={{ scrollbarWidth: "none" }}>
        {pildoras.map((c) => (
          <button key={c.id} type="button" onClick={c.onClick} aria-pressed={!!c.activo}
            className="flex items-center gap-1.5 font-medium px-3.5 py-2"
            style={{
              fontSize: 13, borderRadius: 20,
              backgroundColor: c.activo ? (c.verde ? "#E4F3EA" : c.peligro ? "#FDF1EF" : "var(--azul-suave)") : "#fff",
              color: c.activo ? (c.verde ? "#1E6B44" : c.peligro ? "#9A3B34" : "var(--azul)") : "#2B3768",
              border: "1px solid " + (c.activo ? (c.verde ? "#2C9A5F" : c.peligro ? "#C1443A" : "var(--azul)") : LINEA),
            }}>
            {c.icono}{c.texto}{c.cerrar && <X size={14} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// Subpantalla (hoja) con todos los tipos de una categoría de alquileres. Reemplaza a las píldoras que antes aparecían debajo de los filtros.
function HojaTiposAlquiler({ categoria, tipo, onElegir, onCerrar }) {
  const cat = CATEGORIAS.find((c) => c.id === categoria);
  if (!cat) return null;
  const Fila = ({ activo, children, onClick }) => (
    <button type="button" onClick={onClick} aria-pressed={activo} className="w-full flex items-center justify-between gap-3 text-left"
      style={{ minHeight: 54, padding: "8px 16px", borderRadius: 16, fontSize: 15, fontWeight: activo ? 700 : 500, border: `1.5px solid ${activo ? "var(--azul)" : LINEA}`, background: activo ? "var(--azul-suave)" : "#fff", color: activo ? "var(--azul)" : TINTA }}>
      <span>{children}</span>{activo && <Check size={18} strokeWidth={3} aria-hidden="true" />}
    </button>
  );
  return (
    <Hoja titulo={cat.label} onCerrar={onCerrar}>
      <p className="text-sm mb-3" style={{ color: SUAVE }}>Elegí qué tipo buscás.</p>
      <div className="flex flex-col gap-2 mb-2">
        <Fila activo={!tipo} onClick={() => onElegir("")}>Todo en «{cat.corto || cat.label}»</Fila>
        {cat.tipos.map((t) => <Fila key={t.id} activo={tipo === t.id} onClick={() => onElegir(t.id)}>{t.label}</Fila>)}
      </div>
    </Hoja>
  );
}

// ---------- vistos y nuevos (en este dispositivo) ----------
const VISTOS_KEY = "miZonaVistosFichas";
export const leerVistos = (tipo) => { try { const v = JSON.parse(localStorage.getItem(VISTOS_KEY) || "{}"); return Array.isArray(v[tipo]) ? v[tipo] : []; } catch { return []; } };
const marcarVisto = (tipo, id) => {
  if (!getPrivacidad().guardarVistos) return; // lo apagó en Privacidad
  try { const v = JSON.parse(localStorage.getItem(VISTOS_KEY) || "{}"); v[tipo] = [id, ...(Array.isArray(v[tipo]) ? v[tipo] : []).filter((x) => x !== id)].slice(0, 12); localStorage.setItem(VISTOS_KEY, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
};
export const borrarVistosFichas = () => { try { localStorage.removeItem(VISTOS_KEY); } catch { /* nada */ } };
const NUEVO_DIAS = 30; // igual que en los negocios
const esNueva = (x) => { const t = new Date(x.creadaEn).getTime(); return !isNaN(t) && Date.now() - t <= NUEVO_DIAS * 24 * 60 * 60 * 1000; };

// ---------- piezas comunes ----------
const Encabezado = ({ n, singular, plural, zona }) => (
  <div className="flex items-center justify-between gap-3 mb-2.5">
    <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: TINTA }}>{n} {n === 1 ? singular : plural} <span style={{ fontWeight: 500, color: SUAVE }}>en {zona}</span></p>
  </div>
);
// Sin botones: igual que cuando no hay negocios. Para publicar está el «+» de abajo.
const Vacio = ({ titulo, texto }) => (
  <div className="text-center py-16" style={{ color: SUAVE }}>
    <p className="mb-1" style={{ fontFamily: "var(--fuente-titulo)", fontSize: 19, color: TINTA }}>{titulo}</p>
    <p className="text-sm">{texto}</p>
  </div>
);

const Esqueleto = () => (
  <div role="status" aria-busy="true" aria-label="Cargando" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {[0, 1].map((i) => <div key={i} style={{ height: 300, borderRadius: 22, background: "linear-gradient(90deg,#EEF1F8,#F7F8FC,#EEF1F8)", backgroundSize: "200% 100%", animation: "zona-brillo 1.4s linear infinite" }} />)}
  </div>
);

// Pide el listado a la API con la zona de Inicio. Devuelve { items, total, estado, hayMas, cargarMas, reintentar }.
function useListado(pedir, claveFiltros) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [estado, setEstado] = useState("cargando");
  const [masCargando, setMasCargando] = useState(false);
  const [tick, setTick] = useState(0);
  const pagina = useRef(1), pedido = useRef(0);
  useEffect(() => {
    const mio = ++pedido.current; pagina.current = 1; setEstado("cargando");
    pedir(1).then((r) => { if (mio !== pedido.current) return; setItems(r.items); setTotal(r.total); setHayMas(r.hayMas); setEstado("ok"); })
      .catch(() => { if (mio === pedido.current) setEstado("error"); });
  }, [claveFiltros, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const cargarMas = () => {
    if (masCargando) return; setMasCargando(true);
    const mio = pedido.current, sig = pagina.current + 1;
    pedir(sig).then((r) => { if (mio !== pedido.current) return; pagina.current = sig; setItems((l) => [...l, ...r.items.filter((x) => !l.some((y) => y.id === x.id))]); setHayMas(r.hayMas); }).catch(() => {}).finally(() => setMasCargando(false));
  };
  return { items, total, hayMas, estado, masCargando, cargarMas, reintentar: () => setTick((t) => t + 1) };
}
const VerMas = ({ hayMas, cargando, onClick }) => hayMas ? <button type="button" onClick={onClick} disabled={cargando} className="w-full mt-4" style={botonSecundario}>{cargando ? "Cargando..." : "Ver más"}</button> : null;

function Corazon({ tipo, id }) {
  const fav = useEsFavFicha(tipo, id);
  return (
    <button type="button" aria-label={fav ? "Quitar de favoritos" : "Guardar en favoritos"} aria-pressed={fav} onClick={(e) => { e.stopPropagation(); alternarFavFicha(tipo, id); }}
      style={{ position: "absolute", bottom: 12, right: 12, width: 36, height: 36, borderRadius: "50%", background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.25)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <Heart size={17} color={fav ? "#E5484D" : "#64748B"} fill={fav ? "#E5484D" : "none"} />
    </button>
  );
}
const Insignia = ({ children, fondo = "#F1F4FA", color = SUAVE, icono: Icono }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: fondo, color, whiteSpace: "nowrap" }}>{Icono && <Icono size={11} aria-hidden="true" />}{children}</span>
);

// ---------- tarjetas ----------
const ICONO_CAT = { viviendas: Home, eventos: PartyPopper, herramientas: Hammer, otros: Package };
const COLOR_CAT = { viviendas: "#2350F5", eventos: "#7A4FD6", herramientas: "#E08A12", otros: "#13897F" };
function TarjetaAlquiler({ a, onAbrir }) {
  const [falla, setFalla] = useState(false);
  const cat = CATEGORIAS.find((c) => c.id === a.categoria), Icono = ICONO_CAT[a.categoria] || Package, color = COLOR_CAT[a.categoria] || "#2350F5";
  const foto = !falla && (a.fotos?.[0] || a.logo);
  const abierto = abiertoAhora(a.weekHours);
  const datos = a.categoria === "viviendas" ? resumenVivienda(a.vivienda) : "";
  const tipos = (a.tipos || []).map((t) => t.label).slice(0, 2).join(" · ");
  return (
    <div role="button" tabIndex={0} onClick={() => onAbrir(a.id)} onKeyDown={(e) => e.key === "Enter" && onAbrir(a.id)}
      className="bg-white flex flex-col overflow-hidden text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl min-w-0"
      style={{ borderRadius: 22, border: `1px solid ${LINEA}`, boxShadow: "0 1px 2px rgba(11,20,55,.04)" }}>
      <div className="relative" style={{ height: 176, background: `linear-gradient(135deg, ${color}22, ${color}44)` }}>
        {foto ? <img src={foto} alt="" loading="lazy" onError={() => setFalla(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="flex items-center justify-center" style={{ height: "100%" }}><Icono size={42} color={color} aria-hidden="true" /></span>}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: 84, background: "linear-gradient(to top, rgba(8,18,38,0.62), rgba(8,18,38,0))" }} />
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1" style={{ background: "#ffffffee", color: TINTA, borderRadius: 20, boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
            <span className="rounded-full" style={{ width: 7, height: 7, background: color }} /> {cat?.corto || cat?.label}
          </span>
          {a.desde && <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1" style={{ background: "#0B1437d9", color: "#fff", borderRadius: 20 }}>Desde {textoPrecio({ precioValor: a.desde.valor, precioUnidad: a.desde.unidad })}</span>}
        </div>
        <Corazon tipo="alquiler" id={a.id} />
      </div>
      <div className="px-4 pt-3.5 pb-3.5 flex-1 flex flex-col">
        <h3 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.015em", color: TINTA, lineHeight: 1.25 }}>{a.nombre}</h3>
        <p className="text-[13px] mt-1.5" style={{ color: SUAVE }}>{datos || tipos}{a.cantidadArticulos > 0 && <span> · {a.cantidadArticulos} {a.cantidadArticulos === 1 ? "artículo" : "artículos"}</span>}</p>
        <p className="text-sm mt-2 mb-3 flex-1" style={{ color: SUAVE, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.desc}</p>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {a.disponibilidad === "disponible" && <Insignia fondo="#E4F3EA" color="#1E6B44">● Disponible</Insignia>}
          {a.disponibilidad === "ocupado" && <Insignia fondo="#FFF3D6" color="#8A5B12">● Ocupado</Insignia>}
          {abierto === true && <Insignia fondo="#E4F3EA" color="#1E6B44" icono={Clock}>Abierto ahora</Insignia>}
          {abierto === false && <Insignia icono={Clock}>Cerrado ahora</Insignia>}
          {a.actualizadoEn && diasDesde(a.actualizadoEn) && <Insignia>Actualizado {diasDesde(a.actualizadoEn)}</Insignia>}
        </div>
        <div className="flex items-center justify-between gap-3 pt-3" style={{ borderTop: "1px solid #EEF0F6" }}>
          <span className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: SUAVE }}><MapPin size={13} color="var(--azul)" className="shrink-0" /><span className="truncate">{a.zona || a.localidad?.localidad}</span></span>
          {a.conWhatsapp && <span className="text-[11px] font-semibold shrink-0" style={{ color: "#1E6B44" }}>WhatsApp</span>}
        </div>
      </div>
    </div>
  );
}


// ---------- tarjeta de categorías (la misma de Negocios, para Alquileres y Oficios) ----------
const POPULARES = ["electricista", "plomero", "gasista", "albanil", "pintor", "mecanico", "limpieza", "fletes", "carpintero", "cerrajero"];
const ICONO_RUBRO = { electricista: Zap, plomero: Droplets, gasista: Flame, albanil: HardHat, pintor: Paintbrush, mecanico: Car, limpieza: Sparkles, fletes: Truck, carpintero: Hammer, cerrajero: KeyRound };
const PALETA_RUBRO = ["#E08A12", "#2350F5", "#C1443A", "#7A4FD6", "#13897F", "#2C9A5F"];
const nombreRubro = (id) => RUBROS.find((r) => r.id === id)?.label || id;

export function CategoriasInicio({ modo, cat, onCambiar, tipo = "", onTipo }) {
  const [hoja, setHoja] = useState(false);
  const [hojaTipos, setHojaTipos] = useState(null); // id de la categoría de alquileres cuya subpantalla está abierta
  const esAlq = modo === "alquileres";
  const items = esAlq
    ? CATEGORIAS.map((c) => ({ id: c.id, label: c.corto || c.label, Icono: ICONO_CAT[c.id] || Package, color: COLOR_CAT[c.id] || "#2350F5" }))
    : [...(cat && !POPULARES.includes(cat) ? [cat] : []), ...POPULARES].map((id, i) => ({ id, label: nombreRubro(id).split(" ")[0], Icono: ICONO_RUBRO[id] || Wrench, color: PALETA_RUBRO[i % PALETA_RUBRO.length] }));
  return (
    <div className="mt-3">
      <div className="bg-white px-4 pt-3.5 pb-3" style={{ borderRadius: 22, border: "1px solid #E3E7F1", boxShadow: "0 12px 32px rgba(11,20,55,0.12)" }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: TINTA }}>Categorías</span>
          {!esAlq && <button type="button" onClick={() => setHoja(true)} className="text-xs font-semibold px-2.5 py-1" style={{ color: "var(--azul)", background: "var(--azul-suave)", borderRadius: 20 }}>Ver todas</button>}
        </div>
        <div className="flex gap-3.5 overflow-x-auto pb-1">
          <button type="button" onClick={() => onCambiar("")} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
            <span className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 18, background: !cat ? "linear-gradient(135deg,var(--azul),var(--azul-medio))" : "#EEF3FB", boxShadow: !cat ? "0 8px 18px rgba(var(--azul-rgb),0.33)" : "none", transition: "all .2s" }}>
              <Grid3x3 size={21} color={!cat ? "#fff" : "var(--azul)"} />
            </span>
            <span className="text-[11px] text-center font-medium" style={{ color: !cat ? TINTA : "#2B3768" }}>Todos</span>
          </button>
          {items.map((c) => {
            const act = cat === c.id, Icono = c.Icono;
            return (
              <button key={c.id} type="button" onClick={() => { if (esAlq) { onCambiar(c.id); setHojaTipos(c.id); } else onCambiar(act ? "" : c.id); }} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
                <span className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 18, background: act ? `linear-gradient(135deg, ${c.color}, ${c.color}cc)` : `${c.color}17`, boxShadow: act ? `0 8px 18px ${c.color}55` : "none", transition: "all .2s" }}>
                  <Icono size={21} color={act ? "#fff" : c.color} />
                </span>
                <span className="text-[11px] text-center leading-tight font-medium" style={{ color: act ? TINTA : "#2B3768" }}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {hoja && <HojaRubros rubro={cat} onCerrar={() => setHoja(false)} onElegir={(id) => { onCambiar(id); setHoja(false); }} />}
      {hojaTipos && <HojaTiposAlquiler categoria={hojaTipos} tipo={tipo} onCerrar={() => setHojaTipos(null)} onElegir={(t) => { onTipo?.(t); setHojaTipos(null); }} />}
    </div>
  );
}

// ---------- ALQUILERES: listado ----------
const ORDEN_ALQ = [
  { id: "destacados", titulo: "Destacados", Icon: Star, color: "#E08A1E", fondo: "#FFF4E0" },
  { id: "recientes", titulo: "Más recientes", Icon: Clock, color: "#2A58FF", fondo: "#E8EEFF" },
];
function ListaAlquileres({ zone, q, cat, tipo, onTipo, onAbrir }) {
  const [orden, setOrden] = useState("destacados");
  const [soloAbiertos, setSoloAbiertos] = useState(false);
  const [soloVistos, setSoloVistos] = useState(false);
  const [soloNuevos, setSoloNuevos] = useState(false);
  const [soloDisp, setSoloDisp] = useState(false);
  const [vistos, setVistos] = useState(() => leerVistos("alquiler"));
  const z = partesZona(zone);
  const params = useMemo(() => ({ ...z, q: q.length >= 2 ? q : "", categoria: cat, tipo }), [zone, q, cat, tipo]); // eslint-disable-line react-hooks/exhaustive-deps
  const L = useListado((pagina) => alquileresApi.listar({ ...params, pagina }).then((r) => ({ items: r.alquileres, total: r.total, hayMas: r.hayMas })), JSON.stringify(params));
  let lista = L.items;
  if (soloAbiertos) lista = lista.filter((a) => abiertoAhora(a.weekHours) === true);
  if (soloDisp) lista = lista.filter((a) => a.disponibilidad === "disponible");
  if (soloNuevos) lista = lista.filter(esNueva);
  if (soloVistos) lista = lista.filter((a) => vistos.includes(a.id));
  if (orden === "recientes") lista = [...lista].sort((a, b) => new Date(b.creadaEn || 0) - new Date(a.creadaEn || 0));
  const abrir = (id) => { marcarVisto("alquiler", id); setVistos(leerVistos("alquiler")); onAbrir(id); };
  const conFiltros = soloAbiertos || soloDisp || soloNuevos || soloVistos || cat || tipo || q;
  return (
    <>
      <Encabezado n={lista.length} singular="alquiler" plural="alquileres" zona={z.localidad} />
      <BarraFiltros orden={{ opciones: ORDEN_ALQ, valor: orden, onChange: setOrden }} pildoras={[
        { id: "abiertos", texto: "Abiertos", activo: soloAbiertos, onClick: () => setSoloAbiertos((v) => !v), verde: true, icono: <span className="rounded-full" style={{ width: 8, height: 8, backgroundColor: soloAbiertos ? "#2C9A5F" : "#B9BCC5" }} /> },
        { id: "vistos", texto: "Vistos", activo: soloVistos, onClick: () => setSoloVistos((v) => !v), icono: <Clock size={14} /> },
        { id: "nuevos", texto: "Nuevos", activo: soloNuevos, onClick: () => setSoloNuevos((v) => !v), verde: true, icono: <Sparkles size={14} /> },
        { id: "disp", texto: "Disponibles", activo: soloDisp, onClick: () => setSoloDisp((v) => !v), verde: true, icono: <Check size={14} /> },
        ...(tipo ? [{ id: "tipo", texto: ETIQUETA_TIPO[tipo] || "Tipo", activo: true, cerrar: true, onClick: () => onTipo?.("") }] : []),
      ]} />
      {L.estado === "cargando" ? <Esqueleto /> : L.estado === "error" ? <EstadoError titulo="No pudimos cargar los alquileres" mensaje="Revisá tu conexión e intentá de nuevo." onReintentar={L.reintentar} /> : lista.length === 0 ? (
        <Vacio titulo={`No hay alquileres en ${z.localidad}`} texto={conFiltros ? "Probá con otra categoría, otro filtro, o cambiá de zona." : "Todavía nadie publicó alquileres acá. Podés ser el primero con el botón +."} />
      ) : (<>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{lista.map((a) => <TarjetaAlquiler key={a.id} a={a} onAbrir={abrir} />)}</div>
        <VerMas hayMas={L.hayMas} cargando={L.masCargando} onClick={L.cargarMas} />
      </>)}
    </>
  );
}

// ---------- OFICIOS ----------
const iniciales = (n) => String(n || "?").split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();

function AvatarPersona({ o, lado = 60 }) {
  const [falla, setFalla] = useState(false);
  return o.logo && !falla
    ? <img src={o.logo} alt="" loading="lazy" onError={() => setFalla(true)} style={{ width: lado, height: lado, borderRadius: lado / 3, objectFit: "cover", flexShrink: 0 }} />
    : <span aria-hidden="true" style={{ width: lado, height: lado, borderRadius: lado / 3, flexShrink: 0, background: "linear-gradient(135deg,#DCE8FD,#C9D8FB)", color: "#1B3FB8", fontWeight: 800, fontSize: lado / 2.8, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{iniciales(o.nombre)}</span>;
}
const rubrosDe = (o, max = 3) => { const n = [...(o.rubros || []).map((r) => r.label), ...(o.otros || [])]; return n.length > max ? `${n.slice(0, max).join(" · ")} +${n.length - max}` : n.join(" · "); };

function TarjetaPersona({ o, onAbrir }) {
  const abierto = abiertoAhora(o.weekHours);
  const horario = (resumenHorarios(o.weekHours) || o.horario || "").split(" · ")[0];
  return (
    <div role="button" tabIndex={0} onClick={() => onAbrir(o.id)} onKeyDown={(e) => e.key === "Enter" && onAbrir(o.id)} className="bg-white cursor-pointer min-w-0" style={{ position: "relative", borderRadius: 22, border: `1px solid ${LINEA}`, padding: 14, boxShadow: "0 1px 2px rgba(11,20,55,.04)" }}>
      <div className="flex items-start gap-3">
        <AvatarPersona o={o} />
        <div className="flex-1 min-w-0" style={{ paddingRight: 36 }}>
          <h3 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 16.5, color: TINTA, lineHeight: 1.2, overflowWrap: "anywhere" }}>{o.nombre}</h3>
          <p className="text-[13px] mt-0.5" style={{ color: "#2350F5", fontWeight: 600 }}>{rubrosDe(o)}</p>
          <p className="flex items-center gap-1 text-xs mt-1" style={{ color: SUAVE }}><MapPin size={12} aria-hidden="true" className="shrink-0" /><span className="truncate">{o.zona || o.localidad?.localidad}</span></p>
        </div>
        <FavMini id={o.id} />
      </div>
      <p className="text-sm mt-2.5" style={{ color: SUAVE, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{o.desc}</p>
      <div className="flex items-center gap-2 flex-wrap mt-3">
        {o.recomendado && <Insignia fondo="#FFF3D6" color="#8A5B12" icono={Star}>Recomendado</Insignia>}
        {o.disponibilidad === "disponibleHoy" && <Insignia fondo="#E4F3EA" color="#1E6B44">● Disponible hoy</Insignia>}
        {o.disponibilidad === "ocupado" && <Insignia fondo="#FFF3D6" color="#8A5B12">● Ocupado</Insignia>}
        {abierto === true && <Insignia fondo="#E4F3EA" color="#1E6B44" icono={Clock}>Atiende ahora</Insignia>}
        {(o.etiquetas || []).includes("urgencias") && <Insignia fondo="#FDF1EF" color="#9A3B34">Urgencias</Insignia>}
      </div>
      <div className="flex items-center justify-between gap-3 pt-3 mt-3" style={{ borderTop: "1px solid #EEF0F6" }}>
        <span className="text-xs min-w-0 truncate" style={{ color: SUAVE }}>{o.precio || horario || "Consultar precio"}</span>
        <span className="flex items-center gap-1 text-xs font-bold shrink-0" style={{ color: "var(--azul)" }}>Ver perfil <ChevronRight size={14} aria-hidden="true" /></span>
      </div>
    </div>
  );
}
function FavMini({ id }) {
  const fav = useEsFavFicha("oficio", id);
  return <button type="button" aria-label={fav ? "Quitar de favoritos" : "Guardar en favoritos"} aria-pressed={fav} onClick={(e) => { e.stopPropagation(); alternarFavFicha("oficio", id); }} style={{ position: "absolute", top: 8, right: 8, width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Heart size={20} color={fav ? "#E5484D" : "#64748B"} fill={fav ? "#E5484D" : "none"} /></button>;
}
function HojaRubros({ rubro, onElegir, onCerrar }) {
  const [b, setB] = useState("");
  const lista = RUBROS.filter((r) => !b.trim() || r.label.toLowerCase().includes(b.trim().toLowerCase()));
  return (
    <Hoja titulo="Elegí un oficio" onCerrar={onCerrar}>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={18} color="#6B7494" aria-hidden="true" style={{ position: "absolute", left: 14, top: 15 }} />
        <input value={b} onChange={(e) => setB(e.target.value)} placeholder="Buscar (ej: plomero)" aria-label="Buscar un oficio" style={{ width: "100%", boxSizing: "border-box", minHeight: 48, border: "1px solid #CFD6E8", borderRadius: 12, padding: "11px 14px 11px 42px", font: "inherit", fontSize: "1rem" }} />
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Chip activo={!rubro} onClick={() => onElegir("")}>Todos</Chip>
        {lista.map((r) => <Chip key={r.id} activo={rubro === r.id} onClick={() => onElegir(r.id)}>{r.label}</Chip>)}
      </div>
    </Hoja>
  );
}

const ORDEN_OFI = [
  { id: "recomendados", titulo: "Destacados", Icon: Star, color: "#E08A1E", fondo: "#FFF4E0" },
  { id: "recientes", titulo: "Más recientes", Icon: Clock, color: "#2A58FF", fondo: "#E8EEFF" },
];
function ListaOficios({ zone, q, cat: rubro, onAbrir }) {
  const [orden, setOrden] = useState("recomendados");
  const [soloAbiertos, setSoloAbiertos] = useState(false);
  const [soloVistos, setSoloVistos] = useState(false);
  const [soloNuevos, setSoloNuevos] = useState(false);
  const [soloHoy, setSoloHoy] = useState(false);
  const [vistos, setVistos] = useState(() => leerVistos("oficio"));
  const z = partesZona(zone);
  const params = useMemo(() => ({ ...z, q: q.length >= 2 ? q : "", rubro, orden }), [zone, q, rubro, orden]); // eslint-disable-line react-hooks/exhaustive-deps
  const L = useListado((pagina) => oficiosApi.listar({ ...params, pagina }).then((r) => ({ items: r.oficios, total: r.total, hayMas: r.hayMas })), JSON.stringify(params));
  let lista = L.items;
  if (soloAbiertos) lista = lista.filter((o) => abiertoAhora(o.weekHours) === true);
  if (soloHoy) lista = lista.filter((o) => o.disponibilidad === "disponibleHoy");
  if (soloNuevos) lista = lista.filter(esNueva);
  if (soloVistos) lista = lista.filter((o) => vistos.includes(o.id));
  const abrir = (id) => { marcarVisto("oficio", id); setVistos(leerVistos("oficio")); onAbrir(id); };
  const nombre = rubro ? nombreRubro(rubro) : "";
  const conFiltros = soloAbiertos || soloHoy || soloNuevos || soloVistos || rubro || q;
  return (
    <>
      <Encabezado n={lista.length} singular={nombre ? nombre.toLowerCase() : "profesional"} plural={nombre ? `${nombre.toLowerCase()}s` : "profesionales"} zona={z.localidad} />
      <BarraFiltros orden={{ opciones: ORDEN_OFI, valor: orden, onChange: setOrden }} pildoras={[
        { id: "abiertos", texto: "Abiertos", activo: soloAbiertos, onClick: () => setSoloAbiertos((v) => !v), verde: true, icono: <span className="rounded-full" style={{ width: 8, height: 8, backgroundColor: soloAbiertos ? "#2C9A5F" : "#B9BCC5" }} /> },
        { id: "vistos", texto: "Vistos", activo: soloVistos, onClick: () => setSoloVistos((v) => !v), icono: <Clock size={14} /> },
        { id: "nuevos", texto: "Nuevos", activo: soloNuevos, onClick: () => setSoloNuevos((v) => !v), verde: true, icono: <Sparkles size={14} /> },
        { id: "hoy", texto: "Disponibles hoy", activo: soloHoy, onClick: () => setSoloHoy((v) => !v), verde: true, icono: <Zap size={14} /> },
      ]} />
      {L.estado === "cargando" ? <Esqueleto /> : L.estado === "error" ? <EstadoError titulo="No pudimos cargar los oficios" mensaje="Revisá tu conexión e intentá de nuevo." onReintentar={L.reintentar} /> : lista.length === 0 ? (
        <Vacio titulo={`No hay ${nombre ? nombre.toLowerCase() + "s" : "profesionales"} en ${z.localidad}`} texto={conFiltros ? "Probá con otro oficio, otro filtro, o cambiá de zona." : "Todavía nadie publicó su perfil acá. Si hacés este trabajo, publicá el tuyo con el botón +."} />
      ) : (<>
        <div className="grid gap-3 sm:grid-cols-2">{lista.map((o) => <TarjetaPersona key={o.id} o={o} onAbrir={abrir} />)}</div>
        <VerMas hayMas={L.hayMas} cargando={L.masCargando} onClick={L.cargarMas} />
      </>)}
    </>
  );
}

// ---------- entrada ----------
export default function ListaInicio({ modo, zone, query, cat, tipo = "", onTipo, onAbrirAlquiler, onAbrirOficio }) {
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => setQ(query.trim()), 350); return () => clearTimeout(t); }, [query]);
  if (modo === "alquileres") return <ListaAlquileres zone={zone} q={q} cat={cat} tipo={tipo} onTipo={onTipo} onAbrir={onAbrirAlquiler} />;
  if (modo === "oficios") return <ListaOficios zone={zone} q={q} cat={cat} onAbrir={onAbrirOficio} />;
  return null;
}
