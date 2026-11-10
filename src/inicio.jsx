import { useEffect, useMemo, useRef, useState } from "react";
import { Store, Home, Wrench, MapPin, Heart, Star, Clock, Sparkles, ChevronRight, ChevronDown, Package, X, Zap, Check } from "lucide-react";
import { alquileresApi, oficiosApi, getPrivacidad } from "./api.js";
import { CATEGORIAS, ETIQUETA_TIPO, textoPrecio, resumenVivienda } from "./alquileres.js";
import { RUBROS, GRUPOS_RUBROS } from "./rubros.js";
import { botonSecundario, diasDesde } from "./oficios.jsx";
import { TarjetaCategorias, HojaCategorias } from "./hojaCategorias.jsx";
import { ICONO_CAT, COLOR_CAT, ICONO_TIPO_ALQ, ICONO_RUBRO_OFICIO } from "./iconosFichas.js";
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

// alto: el de la tarjeta que se está cargando (las de Alquileres tienen foto y son más altas que las de Oficios)
const Esqueleto = ({ alto = 300, clases = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" }) => (
  <div role="status" aria-busy="true" aria-label="Cargando" className={clases}>
    {[0, 1].map((i) => <div key={i} style={{ height: alto, borderRadius: 22, background: "linear-gradient(90deg,#EEF1F8,#F7F8FC,#EEF1F8)", backgroundSize: "200% 100%", animation: "zona-brillo 1.4s linear infinite" }} />)}
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
// Alquileres: los 5 tipos más pedidos + «Otros». Oficios: los 5 rubros más pedidos + «Otros». «Ver todas» abre la lista completa, agrupada.
// Las tres secciones muestran lo mismo: «Todos» + 5 opciones + «Otros» (todo el resto). Así «Otros» queda en el mismo lugar en las tres.
const POPULARES = ["electricista", "plomero", "gasista", "albanil", "pintor"];
const POP_ALQ = [["casa", "Casa"], ["departamento", "Depto"], ["salon", "Salón"], ["sillas_mesas", "Sillas y mesas"], ["herr_electricas", "Equipos"]];
const POP_ALQ_IDS = POP_ALQ.map(([id]) => id);
const nombreRubro = (id) => RUBROS.find((r) => r.id === id)?.label || id;
const itemRubro = (r) => { const [Icono, color] = ICONO_RUBRO_OFICIO[r.id] || [Wrench, "#2350F5"]; return { id: r.id, label: r.label, Icono, color }; };
const itemTipoAlq = (t) => { const [Icono, color] = ICONO_TIPO_ALQ[t.id] || [Package, "#13897F"]; return { id: t.id, label: t.label, corto: t.corto, Icono, color }; };
const catDeTipo = (id) => CATEGORIAS.find((c) => c.tipos.some((t) => t.id === id))?.id || "";

export function CategoriasInicio({ modo, cat, onCambiar, tipo = "", onTipo }) {
  const [hoja, setHoja] = useState(null); // "todas" | "otros"
  const esAlq = modo === "alquileres";
  const cerrar = () => setHoja(null);

  let items, otros;
  if (esAlq) {
    items = POP_ALQ.map(([id, label]) => ({ ...itemTipoAlq({ id, label }), label }));
    otros = { activo: !!tipo && !POP_ALQ_IDS.includes(tipo), onClick: () => setHoja("otros") };
  } else {
    items = POPULARES.map((id) => ({ ...itemRubro({ id }), label: nombreRubro(id).split(" ")[0] }));
    otros = { activo: !!cat && !POPULARES.includes(cat), onClick: () => setHoja("otros") };
  }
  const elegirTipoAlq = (it, g) => { onCambiar(g?.id || catDeTipo(it.id)); onTipo?.(it.id); cerrar(); };
  const gruposAlq = (sinPopulares) => CATEGORIAS.map((c) => ({ id: c.id, titulo: c.label, items: c.tipos.filter((t) => !sinPopulares || !POP_ALQ_IDS.includes(t.id)).map(itemTipoAlq) })).filter((g) => g.items.length > 0);
  const gruposOf = (sinPopulares) => Object.entries(GRUPOS_RUBROS).map(([id, titulo]) => ({ id, titulo, items: RUBROS.filter((r) => r.grupo === id && (!sinPopulares || !POPULARES.includes(r.id))).map(itemRubro) })).filter((g) => g.items.length > 0);

  // Subpantallas (las mismas piezas para Alquileres y Oficios, igual que Negocios)
  let sheet = null;
  if (hoja) {
    const otrosHoja = hoja === "otros";
    sheet = esAlq ? (
      <HojaCategorias titulo={otrosHoja ? "Otros alquileres" : "Todos los alquileres"} ayuda="Elegí qué tipo de alquiler buscás." valor={tipo} buscar="Buscar (ej: carpa)"
        todo={{ texto: "Todo en Alquileres", activo: !cat && !tipo, onClick: () => { onCambiar(""); onTipo?.(""); cerrar(); } }}
        grupos={gruposAlq(otrosHoja)} onElegir={elegirTipoAlq} onCerrar={cerrar} />
    ) : (
      <HojaCategorias titulo={otrosHoja ? "Otros oficios" : "Todos los oficios"} ayuda="Elegí un oficio para ver esos profesionales." valor={cat} buscar={otrosHoja ? "Buscar (ej: fotógrafo)" : "Buscar (ej: plomero)"}
        todo={{ texto: "Todo en Oficios", activo: !cat, onClick: () => { onCambiar(""); cerrar(); } }}
        grupos={gruposOf(otrosHoja)} onElegir={(it) => { onCambiar(it.id); cerrar(); }} onCerrar={cerrar} />
    );
  }

  return (
    <div className="mt-3">
      <TarjetaCategorias items={items} valor={esAlq ? tipo : cat} otros={otros}
        onTodos={() => { onCambiar(""); if (esAlq) onTipo?.(""); }}
        onElegir={(c) => {
          if (esAlq) { if (tipo === c.id) { onCambiar(""); onTipo?.(""); } else { onCambiar(catDeTipo(c.id)); onTipo?.(c.id); } }
          else onCambiar(cat === c.id ? "" : c.id);
        }}
        onVerTodas={() => setHoja("todas")} />
      {sheet}
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
      {L.estado === "cargando" ? <Esqueleto alto={190} clases="grid gap-3 sm:grid-cols-2" /> : L.estado === "error" ? <EstadoError titulo="No pudimos cargar los oficios" mensaje="Revisá tu conexión e intentá de nuevo." onReintentar={L.reintentar} /> : lista.length === 0 ? (
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
