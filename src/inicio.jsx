import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Store, Home, Wrench, MapPin, Heart, SlidersHorizontal, Check, X, Search, Plus, Star, Clock, Sparkles, Bed, Users, ChevronRight, Globe, Package, PartyPopper, Hammer, Trophy, Phone } from "lucide-react";
import { alquileresApi, oficiosApi } from "./api.js";
import { CATEGORIAS, ETIQUETA_TIPO, textoPrecio, resumenVivienda } from "./alquileres.js";
import { RUBROS } from "./rubros.js";
import { Hoja, Chip, botonPrincipal, botonSecundario, diasDesde } from "./oficios.jsx";
import { alternarFavFicha, useEsFavFicha } from "./favoritos.js";
import { abiertoAhora, resumenHorarios } from "./horarios.js";
import { EstadoError } from "./componentes/Estados.jsx";

// Inicio unificado: un solo selector (Negocios · Alquileres · Oficios) y, debajo, el listado de lo que se eligió, siempre en la zona
// que la persona tiene elegida en Inicio. Los negocios los sigue dibujando App.jsx; acá están los otros tres.

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

// ---------- selector ----------
export function SelectorModo({ modo, onCambiar }) {
  return (
    <div role="tablist" aria-label="Qué querés ver" className="bg-white" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4, padding: 6, borderRadius: 20, border: `1px solid ${LINEA}`, boxShadow: "0 12px 32px rgba(11,20,55,0.12)" }}>
      {MODOS.map((m) => {
        const Icono = m.icono, act = modo === m.id;
        return (
          <button key={m.id} type="button" role="tab" aria-selected={act} onClick={() => onCambiar(m.id)}
            style={{ minHeight: 62, borderRadius: 15, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "6px 2px", background: act ? "linear-gradient(135deg,var(--azul),var(--azul-medio))" : "transparent", color: act ? "#fff" : "#2B3768", boxShadow: act ? "0 8px 18px rgba(var(--azul-rgb),0.33)" : "none", transition: "all .2s", minWidth: 0 }}>
            <Icono size={21} aria-hidden="true" />
            <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap" }}>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- piezas comunes ----------
const filaDeslizable = { display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", WebkitOverflowScrolling: "touch", WebkitMaskImage: "linear-gradient(to right, #000 90%, transparent)", maskImage: "linear-gradient(to right, #000 90%, transparent)", paddingRight: 24 };
// Cada píldora NO se achica ni parte el texto: así nunca se cortan las letras ni se montan unas sobre otras
function Pildora({ activo, onClick, children, icono: Icono, cuenta }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      style={{ flex: "0 0 auto", whiteSpace: "nowrap", minHeight: 40, display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, border: `1px solid ${activo ? "var(--azul)" : LINEA}`, background: activo ? "var(--azul-suave)" : "#fff", color: activo ? "var(--azul)" : "#2B3768" }}>
      {Icono && <Icono size={15} aria-hidden="true" />}{children}{cuenta > 0 && <span style={{ background: "var(--azul)", color: "#fff", borderRadius: 999, fontSize: 11, padding: "1px 7px" }}>{cuenta}</span>}
    </button>
  );
}
const Encabezado = ({ n, singular, plural, zona, extra }) => (
  <div className="flex items-center justify-between gap-3 mb-2.5">
    <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: TINTA }}>{n} {n === 1 ? singular : plural} <span style={{ fontWeight: 500, color: SUAVE }}>en {zona}</span></p>
    {extra}
  </div>
);
function Vacio({ titulo, texto, ampliado, onAmpliar, onBuscarTodo, onOfrecer, textoOfrecer }) {
  return (
    <div className="text-center" style={{ padding: "36px 18px", background: "#fff", borderRadius: 22, border: `1px solid ${LINEA}` }}>
      <p style={{ fontFamily: "var(--fuente-titulo)", fontSize: 18, color: TINTA, fontWeight: 700 }}>{titulo}</p>
      <p className="text-sm mt-1.5" style={{ color: SUAVE, lineHeight: 1.5 }}>{texto}</p>
      <div className="flex flex-col gap-2 mt-4 items-center">
        {!ampliado && onAmpliar && <button type="button" onClick={onAmpliar} style={{ ...botonSecundario, width: "100%", maxWidth: 300 }}><Globe size={16} aria-hidden="true" /> Ver toda la provincia</button>}
        {onBuscarTodo && <button type="button" onClick={onBuscarTodo} style={{ ...botonSecundario, width: "100%", maxWidth: 300 }}><Search size={16} aria-hidden="true" /> Buscar en todo Mi Zona</button>}
        {onOfrecer && <button type="button" onClick={onOfrecer} style={{ ...botonPrincipal, width: "100%", maxWidth: 300 }}><Plus size={17} aria-hidden="true" /> {textoOfrecer}</button>}
      </div>
    </div>
  );
}
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

// ---------- ALQUILERES ----------
const ICONO_CAT = { viviendas: Home, eventos: PartyPopper, herramientas: Hammer, otros: Package };
const COLOR_CAT = { viviendas: "#2350F5", eventos: "#7A4FD6", herramientas: "#E08A12", otros: "#13897F" };
const DORMS = [["", "Cualquiera"], ["1", "1 o más"], ["2", "2 o más"], ["3", "3 o más"]];

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

function HojaFiltrosAlquiler({ f, onAplicar, onCerrar }) {
  const [t, setT] = useState(f);
  const cat = CATEGORIAS.find((c) => c.id === t.categoria);
  return (
    <Hoja titulo="Filtros de alquileres" onCerrar={onCerrar}>
      <p className="text-sm font-bold mb-2" style={{ color: TINTA }}>Categoría</p>
      <div className="flex flex-wrap gap-2 mb-4">
        <Chip activo={!t.categoria} onClick={() => setT({ ...t, categoria: "", tipo: "", dormitorios: "", amoblado: false })}>Todas</Chip>
        {CATEGORIAS.map((c) => <Chip key={c.id} activo={t.categoria === c.id} onClick={() => setT({ ...t, categoria: c.id, tipo: "" })}>{c.label}</Chip>)}
      </div>
      {cat && (<>
        <p className="text-sm font-bold mb-2" style={{ color: TINTA }}>Qué buscás</p>
        <div className="flex flex-wrap gap-2 mb-4"><Chip activo={!t.tipo} onClick={() => setT({ ...t, tipo: "" })}>Cualquiera</Chip>{cat.tipos.map((x) => <Chip key={x.id} activo={t.tipo === x.id} onClick={() => setT({ ...t, tipo: x.id })}>{x.label}</Chip>)}</div>
      </>)}
      {t.categoria === "viviendas" && (<>
        <p className="text-sm font-bold mb-2" style={{ color: TINTA }}>Dormitorios</p>
        <div className="flex flex-wrap gap-2 mb-4">{DORMS.map(([v, l]) => <Chip key={v} activo={t.dormitorios === v} onClick={() => setT({ ...t, dormitorios: v })}>{l}</Chip>)}</div>
        <p className="text-sm font-bold mb-2" style={{ color: TINTA }}>Amoblado</p>
        <div className="flex gap-2 mb-4"><Chip activo={!t.amoblado} onClick={() => setT({ ...t, amoblado: false })}>Indistinto</Chip><Chip activo={t.amoblado} onClick={() => setT({ ...t, amoblado: true })}>Solo amoblados</Chip></div>
      </>)}
      <p className="text-sm font-bold mb-2" style={{ color: TINTA }}>Disponibilidad</p>
      <div className="flex gap-2 mb-5"><Chip activo={!t.soloDisponibles} onClick={() => setT({ ...t, soloDisponibles: false })}>Todos</Chip><Chip activo={t.soloDisponibles} onClick={() => setT({ ...t, soloDisponibles: true })}>Solo disponibles</Chip></div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onAplicar({ categoria: "", tipo: "", dormitorios: "", amoblado: false, soloDisponibles: false })} style={{ ...botonSecundario, flex: 1 }}>Limpiar</button>
        <button type="button" onClick={() => onAplicar(t)} style={{ ...botonPrincipal, flex: 2 }}>Ver resultados</button>
      </div>
    </Hoja>
  );
}

const F0_ALQ = { categoria: "", tipo: "", dormitorios: "", amoblado: false, soloDisponibles: false };
function ListaAlquileres({ zone, q, onAbrir, onOfrecer, onBuscarTodo }) {
  const [f, setF] = useState(F0_ALQ);
  const [ampliado, setAmpliado] = useState(false);
  const [hoja, setHoja] = useState(false);
  const z = partesZona(zone);
  const params = useMemo(() => ({ ...(ampliado ? { provincia: z.provincia } : z), q: q.length >= 2 ? q : "", categoria: f.categoria, tipo: f.tipo, dormitorios: f.categoria === "viviendas" ? f.dormitorios : "", amoblado: f.categoria === "viviendas" && f.amoblado ? "true" : "" }), [zone, ampliado, q, f]); // eslint-disable-line react-hooks/exhaustive-deps
  const L = useListado((pagina) => alquileresApi.listar({ ...params, pagina }).then((r) => ({ items: r.alquileres, total: r.total, hayMas: r.hayMas })), JSON.stringify(params));
  useEffect(() => setAmpliado(false), [zone]);
  const lista = f.soloDisponibles ? L.items.filter((a) => a.disponibilidad === "disponible") : L.items;
  const nFiltros = (f.tipo ? 1 : 0) + (f.dormitorios ? 1 : 0) + (f.amoblado ? 1 : 0) + (f.soloDisponibles ? 1 : 0);
  return (
    <>
      <div className="mb-3" style={filaDeslizable}>
        <Pildora icono={SlidersHorizontal} cuenta={nFiltros} onClick={() => setHoja(true)}>Filtros</Pildora>
        <Pildora activo={!f.categoria} onClick={() => setF({ ...f, categoria: "", tipo: "" })}>Todos</Pildora>
        {CATEGORIAS.map((c) => <Pildora key={c.id} icono={ICONO_CAT[c.id]} activo={f.categoria === c.id} onClick={() => setF({ ...F0_ALQ, categoria: f.categoria === c.id ? "" : c.id })}>{c.corto || c.label}</Pildora>)}
      </div>
      <Encabezado n={L.total} singular="alquiler" plural="alquileres" zona={ampliado ? z.provincia : z.localidad} extra={<button type="button" onClick={onOfrecer} className="text-xs font-semibold px-3 py-2 shrink-0" style={{ color: "var(--azul)", background: "var(--azul-suave)", borderRadius: 20, minHeight: 36 }}>+ Ofrecer</button>} />
      {L.estado === "cargando" ? <Esqueleto /> : L.estado === "error" ? <EstadoError titulo="No pudimos cargar los alquileres" mensaje="Revisá tu conexión e intentá de nuevo." onReintentar={L.reintentar} /> : lista.length === 0 ? (
        <Vacio titulo={`No hay alquileres en ${ampliado ? z.provincia : z.localidad}`} texto={nFiltros || f.categoria || q ? "Probá con otros filtros o buscá en una zona más amplia." : "Todavía nadie publicó alquileres acá. ¡Podés ser el primero!"} ampliado={ampliado} onAmpliar={() => setAmpliado(true)} onBuscarTodo={onBuscarTodo} onOfrecer={onOfrecer} textoOfrecer="Ofrecer en alquiler" />
      ) : (<>
        {ampliado && <p className="text-xs mb-2" style={{ color: SUAVE }}>Mostrando toda la provincia de {z.provincia}. <button type="button" onClick={() => setAmpliado(false)} style={{ color: "var(--azul)", fontWeight: 700 }}>Volver a mi zona</button></p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{lista.map((a) => <TarjetaAlquiler key={a.id} a={a} onAbrir={onAbrir} />)}</div>
        <VerMas hayMas={L.hayMas} cargando={L.masCargando} onClick={L.cargarMas} />
      </>)}
      {hoja && <HojaFiltrosAlquiler f={f} onCerrar={() => setHoja(false)} onAplicar={(n) => { setF(n); setHoja(false); }} />}
    </>
  );
}

// ---------- OFICIOS ----------
const POPULARES = ["electricista", "plomero", "gasista", "albanil", "pintor", "mecanico", "limpieza", "fletes", "carpintero", "cerrajero"];
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
function TarjetaRecomendado({ o, onAbrir }) {
  return (
    <button type="button" onClick={() => onAbrir(o.id)} className="text-left bg-white" style={{ flex: "0 0 232px", borderRadius: 20, border: `1px solid ${LINEA}`, padding: 14, boxShadow: "0 4px 14px rgba(11,20,55,0.06)", scrollSnapAlign: "start" }}>
      <div className="flex items-center gap-3">
        <AvatarPersona o={o} lado={48} />
        <span className="min-w-0 flex-1"><span className="block truncate" style={{ fontWeight: 700, color: TINTA, fontSize: 15 }}>{o.nombre}</span><span className="block truncate text-xs" style={{ color: "#2350F5", fontWeight: 600 }}>{rubrosDe(o, 1)}</span></span>
      </div>
      <p className="text-xs mt-2.5" style={{ color: SUAVE, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{o.desc}</p>
      <p className="flex items-center gap-1 text-[11px] mt-2" style={{ color: "#8A5B12", fontWeight: 700 }}><Star size={11} fill="#C98A14" color="#C98A14" aria-hidden="true" /> Recomendado · {o.localidad?.localidad}</p>
    </button>
  );
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

function ListaOficios({ zone, q, onAbrir, onOfrecer, onBuscarTodo }) {
  const [rubro, setRubro] = useState("");
  const [orden, setOrden] = useState("recomendados");
  const [soloHoy, setSoloHoy] = useState(false);
  const [ampliado, setAmpliado] = useState(false);
  const [hoja, setHoja] = useState(false);
  const z = partesZona(zone);
  const params = useMemo(() => ({ ...(ampliado ? { provincia: z.provincia } : z), q: q.length >= 2 ? q : "", rubro, orden }), [zone, ampliado, q, rubro, orden]); // eslint-disable-line react-hooks/exhaustive-deps
  const L = useListado((pagina) => oficiosApi.listar({ ...params, pagina }).then((r) => ({ items: r.oficios, total: r.total, hayMas: r.hayMas })), JSON.stringify(params));
  useEffect(() => setAmpliado(false), [zone]);
  const lista = soloHoy ? L.items.filter((o) => o.disponibilidad === "disponibleHoy") : L.items;
  const destacados = orden === "recomendados" && !q && !soloHoy ? lista.filter((o) => o.recomendado).slice(0, 8) : [];
  const resto = destacados.length ? lista.filter((o) => !destacados.includes(o)) : lista;
  const nombreRubro = RUBROS.find((r) => r.id === rubro)?.label;
  return (
    <>
      <div className="mb-3" style={filaDeslizable}>
        <Pildora icono={SlidersHorizontal} cuenta={rubro && !POPULARES.includes(rubro) ? 1 : 0} onClick={() => setHoja(true)}>Todos los oficios</Pildora>
        <Pildora activo={!rubro} onClick={() => setRubro("")}>Todos</Pildora>
        {rubro && !POPULARES.includes(rubro) && <Pildora activo onClick={() => setRubro("")}>{nombreRubro} ✕</Pildora>}
        {POPULARES.map((id) => <Pildora key={id} activo={rubro === id} onClick={() => setRubro(rubro === id ? "" : id)}>{RUBROS.find((r) => r.id === id)?.label}</Pildora>)}
      </div>
      <div className="mb-3" style={filaDeslizable}>
        <Pildora icono={Sparkles} activo={soloHoy} onClick={() => setSoloHoy(!soloHoy)}>Disponibles hoy</Pildora>
        <Pildora icono={Star} activo={orden === "recomendados"} onClick={() => setOrden("recomendados")}>Recomendados</Pildora>
        <Pildora icono={Clock} activo={orden === "recientes"} onClick={() => setOrden("recientes")}>Más recientes</Pildora>
      </div>
      <Encabezado n={L.total} singular={nombreRubro ? nombreRubro.toLowerCase() : "profesional"} plural={nombreRubro ? `${nombreRubro.toLowerCase()}s` : "profesionales"} zona={ampliado ? z.provincia : z.localidad} extra={<button type="button" onClick={onOfrecer} className="text-xs font-semibold px-3 py-2 shrink-0" style={{ color: "var(--azul)", background: "var(--azul-suave)", borderRadius: 20, minHeight: 36 }}>+ Ofrecer</button>} />
      {L.estado === "cargando" ? <Esqueleto /> : L.estado === "error" ? <EstadoError titulo="No pudimos cargar los oficios" mensaje="Revisá tu conexión e intentá de nuevo." onReintentar={L.reintentar} /> : lista.length === 0 ? (
        <Vacio titulo={`No hay ${nombreRubro ? nombreRubro.toLowerCase() + "s" : "profesionales"} en ${ampliado ? z.provincia : z.localidad}`} texto="Probá con otro oficio o ampliá la búsqueda. Si vos hacés este trabajo, publicá tu perfil." ampliado={ampliado} onAmpliar={() => setAmpliado(true)} onBuscarTodo={onBuscarTodo} onOfrecer={onOfrecer} textoOfrecer="Ofrecer mis servicios" />
      ) : (<>
        {ampliado && <p className="text-xs mb-2" style={{ color: SUAVE }}>Mostrando toda la provincia de {z.provincia}. <button type="button" onClick={() => setAmpliado(false)} style={{ color: "var(--azul)", fontWeight: 700 }}>Volver a mi zona</button></p>}
        {destacados.length > 0 && (<>
          <p className="flex items-center gap-1.5 mb-2" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 15, color: TINTA }}><Star size={15} fill="#C98A14" color="#C98A14" aria-hidden="true" /> Recomendados en tu zona</p>
          <div className="mb-4" style={{ ...filaDeslizable, scrollSnapType: "x mandatory", alignItems: "stretch" }}>{destacados.map((o) => <TarjetaRecomendado key={o.id} o={o} onAbrir={onAbrir} />)}</div>
          {resto.length > 0 && <p className="mb-2" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 15, color: TINTA }}>Todos los profesionales</p>}
        </>)}
        <div className="grid gap-3 sm:grid-cols-2">{resto.map((o) => <TarjetaPersona key={o.id} o={o} onAbrir={onAbrir} />)}</div>
        <VerMas hayMas={L.hayMas} cargando={L.masCargando} onClick={L.cargarMas} />
      </>)}
      {hoja && <HojaRubros rubro={rubro} onCerrar={() => setHoja(false)} onElegir={(id) => { setRubro(id); setHoja(false); }} />}
    </>
  );
}

// ---------- entrada ----------
export default function ListaInicio({ modo, zone, query, onAbrirAlquiler, onAbrirOficio, onOfrecerAlquiler, onOfrecerOficio, onBuscarTodo }) {
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => setQ(query.trim()), 350); return () => clearTimeout(t); }, [query]);
  const buscarTodo = onBuscarTodo ? () => onBuscarTodo(query.trim()) : undefined;
  if (modo === "alquileres") return <ListaAlquileres zone={zone} q={q} onAbrir={onAbrirAlquiler} onOfrecer={onOfrecerAlquiler} onBuscarTodo={buscarTodo} />;
  if (modo === "oficios") return <ListaOficios zone={zone} q={q} onAbrir={onAbrirOficio} onOfrecer={onOfrecerOficio} onBuscarTodo={buscarTodo} />;
  return null;
}
