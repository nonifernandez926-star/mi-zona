import { useCallback, useEffect, useRef, useState } from "react";
import { Share2, Heart, ArrowLeft, Wrench, MapPin, MessageCircle, Search, Plus, X, Pencil, Trash2, Power, Check, Clock, Instagram, Facebook, Music2, Store, User, ChevronDown, ChevronRight, Eye, Briefcase, ImageIcon, Info, ShieldCheck, Tag } from "lucide-react";
import { oficiosApi } from "./api.js";
import { textoLocalidad } from "./localidades.js";
import { RUBROS, GRUPOS_RUBROS } from "./rubros.js";
import SelectorLocalidad from "./selectorLocalidad.jsx";
import TarjetaFicha from "./componentes/TarjetaFicha.jsx";
import DetalleFicha, { SeccionDetalle, FilaDato } from "./componentes/DetalleFicha.jsx";
import { HojaDenunciar, accionDenunciar } from "./denuncias.jsx";
import ChipEstado from "./componentes/ChipEstado.jsx";
import PasoCompartir from "./componentes/PasoCompartir.jsx";
import { compartirFicha, avisoDeCompartir } from "./compartir.js";
import { alternarFavFicha, useEsFavFicha, useFavFichas } from "./favoritos.js";
import DialogoAdvertencia from "./componentes/DialogoAdvertencia.jsx";
import ComoFunciona from "./componentes/ComoFunciona.jsx";
import { EstadoCarga, EstadoVacio, EstadoError, EstadoExito } from "./componentes/Estados.jsx";
import { TablaHorarios, Seccion, Interruptor, Avance, EntradaIcono, SelectorLogo, GaleriaFotos, EditorHorarios, useSubidas } from "./formKit.jsx";
import { semanaVacia, hayHorarios, semanaDesdeDias, diasDeHorarios, resumenHorarios } from "./horarios.js";

// Oficios y servicios (Fase 4). Una ficha por persona, con varios rubros. Pantallas: listado, ficha, formulario, "Mis fichas" y paso final.
// La navegación entre ellas la maneja App.jsx (para que el botón "atrás" de Android funcione); acá solo están las pantallas.

const DIAS = [["lun", "Lun"], ["mar", "Mar"], ["mie", "Mié"], ["jue", "Jue"], ["vie", "Vie"], ["sab", "Sáb"], ["dom", "Dom"]];
const ETIQUETAS = [["urgencias", "Urgencias"], ["finesDeSemana", "Fines de semana"], ["presupuestoSinCargo", "Presupuesto sin cargo"], ["aDomicilio", "Trabajo a domicilio"]];
const ETIQUETA_TXT = Object.fromEntries(ETIQUETAS);
const ETIQUETA_RUBRO = Object.fromEntries(RUBROS.map((r) => [r.id, r.label]));
const MAX_RUBROS = 6, MAX_OTROS = 3, MAX_FOTOS = 8;
export const FONDO = "#F3F5FA";

export const botonPrincipal = { minHeight: 50, borderRadius: 16, border: 0, color: "#fff", background: "linear-gradient(135deg,#2b5bff,#1638c9)", boxShadow: "0 12px 24px rgba(36,84,255,.26)", fontWeight: 700, fontSize: "1rem", padding: "0 20px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 };
export const botonSecundario = { minHeight: 46, borderRadius: 16, border: "1px solid #e0e5f2", background: "#fff", color: "#0B1437", fontWeight: 700, fontSize: "0.9375rem", padding: "0 16px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 };
export const caja = { width: "100%", boxSizing: "border-box", minHeight: 48, border: "1px solid #CFD6E8", borderRadius: 12, padding: "11px 14px", font: "inherit", fontSize: "1rem", background: "#fff", color: "#0B1437" };

const rubrosTexto = (o, primero = "", max = 2) => {
  const nombres = [...(o.rubros || []).map((r) => r.label), ...(o.otros || [])];
  if (primero) nombres.sort((a, b) => (b === primero) - (a === primero));
  return nombres.length > max ? `${nombres.slice(0, max).join(", ")} +${nombres.length - max}` : nombres.join(", ");
};
export const diasDesde = (iso) => { if (!iso) return null; const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); return d < 1 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`; };

// ---------- piezas comunes ----------

function Cabecera({ titulo, onVolver, derecha }) {
  return (
    <div data-conservar-color className="sticky top-0 z-30" style={{ backgroundColor: "var(--azul-oscuro)" }}>
      <div className="max-w-3xl mx-auto px-4 pb-3 flex items-center gap-3" style={{ paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        <button type="button" onClick={onVolver} aria-label="Volver" style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,.1)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ArrowLeft size={20} color="#fff" aria-hidden="true" /></button>
        <p className="flex-1 min-w-0" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.0625rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titulo}</p>
        {derecha}
      </div>
    </div>
  );
}

export function Pagina({ titulo, onVolver, derecha, children, pie }) {
  return (
    <div style={{ backgroundColor: FONDO, minHeight: "100vh" }}>
      <Cabecera titulo={titulo} onVolver={onVolver} derecha={derecha} />
      <div className="max-w-3xl mx-auto px-4" style={{ paddingTop: 16, paddingBottom: pie ? "calc(104px + env(safe-area-inset-bottom, 0px))" : "calc(32px + env(safe-area-inset-bottom, 0px))" }}>{children}</div>
      {pie && (
        <div className="fixed bottom-0 left-0 right-0 z-30" style={{ background: "#fff", borderTop: "1px solid #E3E7F1", padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="max-w-3xl mx-auto" style={{ display: "flex", gap: 10 }}>{pie}</div>
        </div>
      )}
    </div>
  );
}

// Hoja que sube desde abajo (rubros, zona, mensaje de WhatsApp)
export function Hoja({ titulo, onCerrar, children }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center" style={{ background: "#0B143799" }} onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label={titulo} className="bg-white w-full sm:max-w-md" style={{ borderRadius: "22px 22px 0 0", maxHeight: "88dvh", overflowY: "auto", padding: "18px 18px calc(18px + env(safe-area-inset-bottom, 0px))" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.125rem", color: "#0B1437" }}>{titulo}</h3>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={20} color="#4A5372" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Chip({ activo, children, onClick, quitar }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo === undefined ? undefined : activo}
      style={{ minHeight: 44, borderRadius: 999, padding: "0 14px", fontSize: "0.9375rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${activo ? "#2350F5" : "#CFD6E8"}`, background: activo ? "#EDF1FF" : "#fff", color: activo ? "#1B3FB8" : "#0B1437" }}>
      {activo && <Check size={15} aria-hidden="true" />}{children}{quitar && <X size={14} aria-hidden="true" />}
    </button>
  );
}

// ---------- listado ----------

const ZONA_KEY = "miZonaZonaOficios";
const CACHE_KEY = "miZonaOficiosCache";
export const leerZona = () => { try { return JSON.parse(localStorage.getItem(ZONA_KEY) || "null"); } catch { return null; } };
export const guardarZona = (z) => { try { localStorage.setItem(ZONA_KEY, JSON.stringify(z)); } catch { /* sin almacenamiento */ } };
const leerCache = (clave) => { try { return (JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"))[clave] || null; } catch { return null; } };
const guardarCache = (clave, valor) => { try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); const claves = Object.keys(c); if (claves.length >= 6 && !c[clave]) delete c[claves[0]]; c[clave] = valor; localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* sin almacenamiento */ } };

export const ALCANCES = [["localidad", "Mi localidad"], ["departamento", "Mi departamento"], ["provincia", "Mi provincia"], ["todo", "Todo el país"]];
export const SIGUIENTE = { localidad: "departamento", departamento: "provincia", provincia: "todo" };

export function OficiosScreen({ usuario, onVolver, onAbrir, onOfrecer, onMisFichas }) {
  const favs = useFavFichas();
  const [avisoCompartir, setAvisoCompartir] = useState("");
  const [zona, setZona] = useState(() => leerZona() || (usuario?.localidad ? { alcance: "departamento", loc: usuario.localidad } : { alcance: "todo", loc: null }));
  const [rubro, setRubro] = useState("");
  const [q, setQ] = useState("");
  const [qFinal, setQFinal] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error
  const [sinConexion, setSinConexion] = useState(false);
  const [masCargando, setMasCargando] = useState(false);
  const [hoja, setHoja] = useState(null); // "rubros" | "zona"
  const pedido = useRef(0);

  // si la persona inicia sesión después y todavía no eligió zona, se usa la de su perfil
  useEffect(() => { if (usuario?.localidad && !leerZona() && zona.alcance === "todo" && !zona.loc) setZona({ alcance: "departamento", loc: usuario.localidad }); }, [usuario?.localidad?.localidadId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => setQFinal(q.trim()), 350); return () => clearTimeout(t); }, [q]);

  const filtros = useCallback((pagina) => {
    const f = { pagina };
    if (rubro) f.rubro = rubro;
    if (qFinal.length >= 2) f.q = qFinal;
    const l = zona.loc;
    if (l && zona.alcance === "localidad") f.localidadId = l.localidadId;
    if (l && zona.alcance === "departamento") f.departamentoId = l.departamentoId;
    if (l && zona.alcance === "provincia") f.provinciaId = l.provinciaId;
    return f;
  }, [rubro, qFinal, zona]);
  const claveCache = JSON.stringify(filtros(1));

  const cargar = useCallback(() => {
    const mio = ++pedido.current;
    setEstado("cargando"); setSinConexion(false);
    oficiosApi.listar(filtros(1))
      .then((r) => { if (mio !== pedido.current) return; setItems(r.oficios); setTotal(r.total); setHayMas(r.hayMas); setEstado("ok"); guardarCache(claveCache, { items: r.oficios, total: r.total, hayMas: r.hayMas }); })
      .catch(() => {
        if (mio !== pedido.current) return;
        const c = leerCache(claveCache); // con mala señal se muestra lo último que se había cargado
        if (c) { setItems(c.items); setTotal(c.total); setHayMas(false); setSinConexion(true); setEstado("ok"); } else setEstado("error");
      });
  }, [filtros, claveCache]);
  useEffect(() => { cargar(); }, [cargar]);

  const verMas = async () => {
    setMasCargando(true);
    try {
      const pagina = Math.floor(items.length / 20) + 1;
      const r = await oficiosApi.listar(filtros(pagina));
      setItems((prev) => [...prev, ...r.oficios.filter((o) => !prev.some((p) => p.id === o.id))]); setHayMas(r.hayMas); setTotal(r.total);
    } catch { setSinConexion(true); }
    setMasCargando(false);
  };

  const cambiarZona = (z) => { setZona(z); guardarZona(z); };
  const nombreRubro = rubro ? ETIQUETA_RUBRO[rubro] : "Todos los rubros";
  const textoZona = zona.alcance === "todo" || !zona.loc ? "Todo el país"
    : zona.alcance === "localidad" ? zona.loc.localidad : zona.alcance === "departamento" ? `Departamento ${zona.loc.departamento}` : zona.loc.provincia;
  const filtrando = !!rubro || qFinal.length >= 2;
  const siguiente = SIGUIENTE[zona.alcance];

  return (
    <Pagina titulo="Oficios y servicios" onVolver={onVolver}
      derecha={<button type="button" onClick={onMisFichas} className="text-sm font-semibold" style={{ color: "#fff", minHeight: 44, padding: "0 10px" }}>Mis fichas</button>}>
      <ComoFunciona pasos={[
        "Elegí el rubro que necesitás (electricista, plomero, jardinero...) y tu zona.",
        "Abrí una ficha para ver qué hace, dónde trabaja, sus horarios y su precio orientativo.",
        "Si la ficha tiene WhatsApp, te escribís con un mensaje que podés cambiar antes de enviarlo. Mi Zona no manda nada por vos.",
        "¿Hacés un oficio? Tocá «Ofrecer mis servicios» y armá tu ficha.",
      ]} />

      <div className="flex items-center gap-2 bg-white px-3 mt-3" style={{ border: "1px solid #CFD6E8", borderRadius: 14, minHeight: 52 }}>
        <Search size={18} color="#2350F5" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscá, por ejemplo: aire acondicionado" aria-label="Buscar oficios" maxLength={60}
          style={{ flex: 1, minWidth: 0, minHeight: 48, border: 0, outline: "none", font: "inherit", fontSize: "1rem", background: "transparent", color: "#0B1437" }} />
        {q && <button type="button" onClick={() => setQ("")} aria-label="Borrar búsqueda" style={{ width: 44, height: 44 }}><X size={16} color="#4A5372" /></button>}
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <Chip onClick={() => setHoja("rubros")} activo={!!rubro}><Wrench size={15} aria-hidden="true" /> {nombreRubro} <ChevronDown size={14} aria-hidden="true" /></Chip>
        <Chip onClick={() => setHoja("zona")} activo={zona.alcance !== "todo"}><MapPin size={15} aria-hidden="true" /> {textoZona} <ChevronDown size={14} aria-hidden="true" /></Chip>
      </div>

      {sinConexion && <p role="status" className="text-sm mt-3 p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 }}>Sin conexión: te mostramos lo último que cargaste. Puede estar desactualizado.</p>}

      <div className="mt-4" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {estado === "cargando" && <EstadoCarga texto="Buscando oficios..." filas={4} />}
        {estado === "error" && <EstadoError onReintentar={cargar} />}
        {estado === "ok" && items.length === 0 && (
          siguiente && filtrando ? (
            <EstadoVacio icono={Search} titulo="No encontramos oficios con esa búsqueda" mensaje="Probá con otro rubro o ampliá la zona de búsqueda." accion={{ texto: "Ampliar la búsqueda", onClick: () => cambiarZona({ ...zona, alcance: siguiente }) }} />
          ) : siguiente ? (
            <EstadoVacio icono={Wrench} titulo="Todavía no hay oficios en tu zona" mensaje="Probá ampliando la zona de búsqueda." accion={{ texto: "Ampliar la búsqueda", onClick: () => cambiarZona({ ...zona, alcance: siguiente }) }} />
          ) : (
            <EstadoVacio icono={Wrench} titulo="Todavía no hay nadie en esta búsqueda" mensaje="¿Hacés este trabajo? Sé el primero en ofrecer tus servicios." accion={{ texto: "Ofrecer mis servicios", onClick: onOfrecer }} />
          )
        )}
        {estado === "ok" && items.length > 0 && (
          <>
            <p className="text-sm" style={{ color: "#4A5372" }} role="status">{total} {total === 1 ? "ficha" : "fichas"} · mantené apretada una para compartirla</p>
            {avisoCompartir && <p role="status" className="text-sm p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 }}>{avisoCompartir}</p>}
            {items.map((o) => (
              <TarjetaFicha key={o.id} titulo={o.nombre} zona={textoLocalidad(o.localidad)} datoClave={rubrosTexto(o, rubro ? ETIQUETA_RUBRO[rubro] : "")}
                estado={o.disponibilidad || undefined} imagen={o.logo || o.fotos?.[0]} icono={Wrench} tono="naranja" onAbrir={() => onAbrir(o.id, rubro ? ETIQUETA_RUBRO[rubro] : "")}
                esFavorito={favs.some((x) => x.tipo === "oficio" && x.id === o.id)} onFavorito={() => alternarFavFicha("oficio", o.id)}
                onCompartir={async () => setAvisoCompartir(avisoDeCompartir(await compartirFicha({ tipo: "oficio", nombre: o.nombre, zona: textoLocalidad(o.localidad), detalle: o.desc, imagen: o.logo || o.fotos?.[0] })) || "")} />
            ))}
            {hayMas && <button type="button" onClick={verMas} disabled={masCargando} style={{ ...botonSecundario, minHeight: 50 }}>{masCargando ? "Cargando..." : "Ver más"}</button>}
          </>
        )}
      </div>

      {estado === "ok" && items.length > 0 && (
        <button type="button" onClick={onOfrecer} className="w-full mt-5" style={{ ...botonSecundario, minHeight: 52 }}><Plus size={18} aria-hidden="true" /> Ofrecer mis servicios</button>
      )}

      {hoja === "rubros" && (
        <Hoja titulo="Elegí un rubro" onCerrar={() => setHoja(null)}>
          <button type="button" onClick={() => { setRubro(""); setHoja(null); }} style={{ ...botonSecundario, width: "100%", justifyContent: "flex-start", marginBottom: 10, borderColor: !rubro ? "#2350F5" : "#CFD6E8" }}>Todos los rubros</button>
          {Object.entries(GRUPOS_RUBROS).map(([g, nombre]) => (
            <div key={g} className="mb-3">
              <p className="text-sm font-bold mb-1.5" style={{ color: "#4A5372" }}>{nombre}</p>
              <div className="flex flex-wrap gap-2">{RUBROS.filter((r) => r.grupo === g).map((r) => <Chip key={r.id} activo={rubro === r.id} onClick={() => { setRubro(r.id); setHoja(null); }}>{r.label}</Chip>)}</div>
            </div>
          ))}
          <p className="text-sm" style={{ color: "#4A5372", lineHeight: 1.45 }}>¿No está tu rubro? Buscalo escribiendo arriba: muchas personas cargan rubros propios.</p>
        </Hoja>
      )}
      {hoja === "zona" && <HojaZona zona={zona} usuario={usuario} onCambiar={(z) => { cambiarZona(z); setHoja(null); }} onCerrar={() => setHoja(null)} />}
    </Pagina>
  );
}

export function HojaZona({ zona, usuario, onCambiar, onCerrar }) {
  const [otra, setOtra] = useState(false);
  const loc = zona.loc || usuario?.localidad || null;
  return (
    <Hoja titulo="¿Dónde buscás?" onCerrar={onCerrar}>
      {loc && <p className="text-sm mb-3" style={{ color: "#4A5372" }}>Zona elegida: <b style={{ color: "#0B1437" }}>{textoLocalidad(loc)}</b></p>}
      <div className="flex flex-col gap-2">
        {ALCANCES.filter(([id]) => id === "todo" || loc).map(([id, texto]) => (
          <button key={id} type="button" onClick={() => onCambiar({ alcance: id, loc: id === "todo" ? zona.loc : loc })}
            style={{ ...botonSecundario, justifyContent: "flex-start", minHeight: 50, borderColor: zona.alcance === id ? "#2350F5" : "#CFD6E8", background: zona.alcance === id ? "#EDF1FF" : "#fff" }}>
            {zona.alcance === id && <Check size={16} aria-hidden="true" />}{texto}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setOtra((v) => !v)} className="w-full mt-3" style={{ ...botonSecundario, minHeight: 50 }}>{otra ? "Cerrar" : "Elegir otra localidad"}</button>
      {otra && <div className="mt-3"><SelectorLocalidad valor={null} onChange={(l) => { if (l) onCambiar({ alcance: "departamento", loc: l }); }} /></div>}
    </Hoja>
  );
}

// ---------- ficha pública ----------

export function Fotos({ fotos, alt = "Foto de un trabajo" }) {
  const [abierta, setAbierta] = useState(null);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {fotos.map((f) => (
          <button key={f} type="button" onClick={() => setAbierta(f)} aria-label="Ver foto" style={{ padding: 0, border: 0, borderRadius: 12, overflow: "hidden", aspectRatio: "1 / 1", background: "#EEF1F8" }}>
            <img src={f} alt={alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </button>
        ))}
      </div>
      {abierta && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3" style={{ background: "#000000e6" }} onClick={() => setAbierta(null)}>
          <button type="button" aria-label="Cerrar" onClick={() => setAbierta(null)} style={{ position: "absolute", top: "calc(12px + env(safe-area-inset-top, 0px))", right: 12, width: 48, height: 48 }}><X size={26} color="#fff" /></button>
          <img src={abierta} alt={alt} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      )}
    </>
  );
}

export const urlRed = (v, base) => (/^https:\/\//i.test(v) ? v : `${base}${v}`);

export function DetalleOficio({ id, rubroConsulta = "", onVolver, onAbrirPerfil }) {
  const [o, setO] = useState(null);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | noExiste | error
  const [wa, setWa] = useState(false);
  const [aviso, setAviso] = useState("");
  const [den, setDen] = useState(false); // hoja de denuncia (Fase 8)
  const esFav = useEsFavFicha("oficio", id);
  const cargar = useCallback(() => {
    setEstado("cargando");
    oficiosApi.ver(id).then((x) => { setO(x); setEstado("ok"); }).catch((e) => setEstado(e.status === 404 ? "noExiste" : "error"));
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  if (estado !== "ok") {
    return (
      <Pagina titulo="Oficio" onVolver={onVolver}>
        {estado === "cargando" && <EstadoCarga texto="Cargando ficha..." />}
        {estado === "noExiste" && <EstadoVacio icono={Wrench} titulo="Esta ficha ya no está disponible" mensaje="Puede que la persona la haya pausado o eliminado." accion={{ texto: "Volver", onClick: onVolver }} />}
        {estado === "error" && <EstadoError onReintentar={cargar} />}
      </Pagina>
    );
  }
  const lugar = textoLocalidad(o.localidad);
  const principal = rubroConsulta || o.rubros[0]?.label || o.otros[0] || "tus servicios";
  const actualizado = diasDesde(o.actualizadoEn);
  return (
    <DetalleFicha titulo={o.nombre} subtitulo={rubrosTexto(o, rubroConsulta, 3)} imagen={o.logo || o.fotos?.[0]} icono={Wrench} tono="naranja"
      estado={o.disponibilidad || undefined} contexto="Oficio" onVolver={onVolver}
      acciones={[
        { icono: Share2, etiqueta: "Compartir", onClick: async () => setAviso(avisoDeCompartir(await compartirFicha({ tipo: "oficio", nombre: o.nombre, zona: textoLocalidad(o.localidad), detalle: o.desc, imagen: o.logo || o.fotos?.[0] })) || "") },
        { icono: Heart, etiqueta: esFav ? "Quitar de favoritos" : "Guardar en favoritos", activo: esFav, onClick: () => alternarFavFicha("oficio", id) },
        accionDenunciar(() => setDen(true)),
      ]}
      pie={o.conWhatsapp ? <button type="button" onClick={() => setWa(true)} style={{ ...botonPrincipal, flex: 1 }}><MessageCircle size={20} aria-hidden="true" /> Contactar por WhatsApp</button> : undefined}>
      {aviso && <p role="status" className="text-sm p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 }}>{aviso}</p>}
      <SeccionDetalle titulo="Rubros" icono={Wrench}>
        <div className="flex flex-wrap gap-2">{[...o.rubros.map((r) => r.label), ...o.otros].map((n) => <span key={n} style={{ borderRadius: 999, padding: "4px 12px", background: "#EEF1F8", color: "#0B1437", fontSize: "0.9375rem", fontWeight: 600 }}>{n}</span>)}</div>
        {o.etiquetas.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{o.etiquetas.map((e) => <span key={e} style={{ borderRadius: 999, padding: "4px 12px", background: "#E4F3EA", color: "#1E6B44", fontSize: "0.875rem", fontWeight: 700 }}>{ETIQUETA_TXT[e] ? ETIQUETAS.find(([k]) => k === e)[1] : e}</span>)}</div>}
      </SeccionDetalle>
      <SeccionDetalle titulo="Sobre mi trabajo" icono={Info}><p style={{ whiteSpace: "pre-line" }}>{o.desc}</p></SeccionDetalle>
      <SeccionDetalle titulo="Datos">
        <FilaDato icono={MapPin} etiqueta="Dónde trabaja" valor={[lugar, o.zona].filter(Boolean).join(" · ")} />
        <FilaDato icono={MapPin} etiqueta="Dirección" valor={o.direccion} />
        {!hayHorarios(o.weekHours) && <FilaDato icono={Clock} etiqueta="Días y horarios" valor={[o.dias.length ? o.dias.map((d) => DIAS.find(([k]) => k === d)?.[1]).join(", ") : "", o.horario].filter(Boolean).join(" · ")} />}
        <FilaDato icono={Briefcase} etiqueta="Precio orientativo" valor={o.precio} />
        {o.precio && <p className="text-sm" style={{ color: "#4A5372" }}>Es una referencia: el precio final se acuerda con la persona.</p>}
      </SeccionDetalle>
      {hayHorarios(o.weekHours) && <SeccionDetalle titulo="Horarios de atención" icono={Clock}><TablaHorarios weekHours={o.weekHours} /></SeccionDetalle>}
      {o.fotos.length > 0 && <SeccionDetalle titulo="Fotos de trabajos" icono={ImageIcon}><Fotos fotos={o.fotos} /></SeccionDetalle>}
      {(o.ig || o.facebook || o.tiktok) && (
        <SeccionDetalle titulo="Redes">
          <div className="flex flex-wrap gap-2">
            {o.ig && <a href={urlRed(o.ig, "https://instagram.com/")} target="_blank" rel="noopener noreferrer" style={botonSecundario}><Instagram size={17} aria-hidden="true" /> Instagram</a>}
            {o.facebook && <a href={urlRed(o.facebook, "https://facebook.com/")} target="_blank" rel="noopener noreferrer" style={botonSecundario}><Facebook size={17} aria-hidden="true" /> Facebook</a>}
            {o.tiktok && <a href={urlRed(o.tiktok, "https://www.tiktok.com/@")} target="_blank" rel="noopener noreferrer" style={botonSecundario}><Music2 size={17} aria-hidden="true" /> TikTok</a>}
          </div>
        </SeccionDetalle>
      )}
      {o.dueno && (
        <button type="button" onClick={() => onAbrirPerfil && onAbrirPerfil(o.dueno)} className="w-full text-left flex items-center gap-3 bg-white" style={{ border: "1px solid #E3E7F1", borderRadius: 20, padding: 14, minHeight: 56 }}>
          <User size={20} color="#4A5372" aria-hidden="true" /><span className="flex-1" style={{ fontWeight: 600, color: "#0B1437" }}>Dueño: @{o.dueno}</span><ChevronRight size={18} color="#8D95B0" aria-hidden="true" />
        </button>
      )}
      <p className="text-sm px-1" style={{ color: "#4A5372", lineHeight: 1.5 }}>
        <ShieldCheck size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} aria-hidden="true" />
        Mi Zona no verifica ni certifica a quienes publican sus servicios. Pedí presupuesto y referencias antes de contratar y no pagues por adelantado sin ver el trabajo.{actualizado ? ` Ficha actualizada ${actualizado}.` : ""}
      </p>
      {wa && <HojaWhatsapp id={o.id} nombre={o.nombre} rubro={principal} onCerrar={() => setWa(false)} />}
      {den && <HojaDenunciar tipo="oficio" id={o.id} nombre={o.nombre} onCerrar={() => setDen(false)} onBloqueado={onVolver} />}
    </DetalleFicha>
  );
}

// Mensaje inicial editable. Al tocar "Abrir WhatsApp" el servidor arma el enlace oficial (con el número) y se abre el chat: Mi Zona no envía nada.
export function HojaWhatsapp({ id, nombre, rubro, onCerrar, contactar = oficiosApi.contacto, mensajeInicial }) {
  const [texto, setTexto] = useState(mensajeInicial || `Hola, te encontré en Mi Zona. Quería consultar por tus servicios de ${rubro.toLowerCase()}.`);
  const [estado, setEstado] = useState(null); // null | "abriendo" | { error }
  const abrir = async () => {
    setEstado("abriendo");
    try { const url = await contactar(id, texto.trim()); window.location.assign(url); setEstado(null); onCerrar(); }
    catch (e) { setEstado({ error: e.message || "No pudimos abrir WhatsApp. Probá de nuevo." }); }
  };
  return (
    <Hoja titulo={`Escribirle a ${nombre}`} onCerrar={onCerrar}>
      <label htmlFor="wa-msg" className="text-sm font-semibold block mb-1.5" style={{ color: "#0B1437" }}>Tu mensaje (podés cambiarlo)</label>
      <textarea id="wa-msg" value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} maxLength={500} style={{ ...caja, resize: "none", lineHeight: 1.5 }} />
      <p className="text-sm mt-2" style={{ color: "#4A5372", lineHeight: 1.5 }}>Se abre WhatsApp con este mensaje y el número de la persona. Mi Zona no envía nada por vos: lo revisás y decidís si lo mandás.</p>
      {estado?.error && <p role="alert" className="text-sm mt-2" style={{ color: "#9A3B34" }}>{estado.error}</p>}
      <div className="flex gap-2 mt-4">
        <button type="button" onClick={onCerrar} style={{ ...botonSecundario, flex: "1 1 120px" }}>Cancelar</button>
        <button type="button" onClick={abrir} disabled={estado === "abriendo"} style={{ ...botonPrincipal, flex: "2 1 160px", opacity: estado === "abriendo" ? 0.6 : 1 }}>{estado === "abriendo" ? "Abriendo..." : "Abrir WhatsApp"}</button>
      </div>
    </Hoja>
  );
}

// ---------- formulario ----------

const INICIAL = { nombre: "", rubros: [], otros: [], desc: "", zona: "", direccion: "", whatsapp: "", mostrarWhatsapp: false, ig: "", facebook: "", tiktok: "", logo: "", fotos: [], dias: [], horario: "", weekHours: [], precio: "", etiquetas: [] };

export function Campo({ id, etiqueta, ayuda, children, contador }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label htmlFor={id} className="text-sm font-bold" style={{ color: "#0B1437" }}>{etiqueta}</label>
        {contador && <span className="text-xs" style={{ color: "#4A5372" }}>{contador}</span>}
      </div>
      {children}
      {ayuda && <p className="text-sm mt-1.5" style={{ color: "#4A5372", lineHeight: 1.45 }}>{ayuda}</p>}
    </div>
  );
}
export const Bloque = ({ titulo, children }) => (
  <section className="bg-white mb-3" style={{ border: "1px solid #E3E7F1", borderRadius: 20, padding: 16 }}>
    <h2 style={{ fontWeight: 800, fontSize: "1.0625rem", color: "#0B1437", marginBottom: 12 }}>{titulo}</h2>{children}
  </section>
);

export function FormularioOficio({ inicial, usuario, onGuardado, onCancelar }) {
  const editando = !!inicial;
  const [f, setF] = useState(() => {
    if (!inicial) return { ...INICIAL, nombre: usuario?.nombre || "", weekHours: semanaVacia() };
    const wh = hayHorarios(inicial.weekHours) ? inicial.weekHours : semanaDesdeDias(inicial.dias);
    return { ...INICIAL, ...inicial, rubros: inicial.rubros.map((r) => r.id), weekHours: wh };
  });
  const [loc, setLoc] = useState(inicial?.localidadCompleta || usuario?.localidad || null);
  const [otro, setOtro] = useState("");
  const [busca, setBusca] = useState("");
  const [grupoAbierto, setGrupoAbierto] = useState(null);
  const [dialogo, setDialogo] = useState(null); // "whatsapp" | "direccion" | "activar"
  const [estado, setEstado] = useState(null); // null | "guardando" | { error }
  const direccionAceptada = useRef(!!inicial?.direccion);
  const { subiendo, subir } = useSubidas({ max: MAX_FOTOS, onError: (m) => setEstado(m ? { error: m } : null) });
  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setEstado(null); };
  const alternar = (k, v, max) => setF((p) => { const t = p[k].includes(v); if (!t && max && p[k].length >= max) return p; return { ...p, [k]: t ? p[k].filter((x) => x !== v) : [...p[k], v] }; });

  const conHorarios = hayHorarios(f.weekHours);
  const pasos = [
    { ok: f.nombre.trim().length >= 2, texto: "Tu nombre", requerido: true },
    { ok: f.rubros.length + f.otros.length > 0, texto: "Al menos un rubro", requerido: true },
    { ok: f.desc.trim().length >= 10, texto: "Descripción de tu trabajo", requerido: true },
    { ok: !!loc, texto: "Tu localidad", requerido: true },
    { ok: !f.mostrarWhatsapp || f.whatsapp.replace(/\D/g, "").length >= 8, texto: "Número de WhatsApp", requerido: true },
    { ok: conHorarios, texto: "Horarios de atención" },
    { ok: !!f.logo, texto: "Logo o foto de perfil" },
    { ok: f.fotos.length > 0, texto: "Fotos de tus trabajos" },
  ];
  const faltan = pasos.filter((p) => p.requerido && !p.ok).map((p) => p.texto.toLowerCase());
  const listo = faltan.length === 0 && !subiendo && estado !== "guardando";

  const agregarOtro = () => {
    const t = otro.trim().replace(/\s+/g, " ");
    if (t.length < 2 || f.otros.length >= MAX_OTROS || f.otros.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    setF((p) => ({ ...p, otros: [...p.otros, t.slice(0, 40)] })); setOtro("");
  };
  const ayudaSubir = { fotos: f.fotos, setFotos: (v) => setF((p) => ({ ...p, fotos: v })), setLogo: (v) => set("logo", v) };

  const guardar = async () => {
    setEstado("guardando"); setDialogo(null);
    const wh = conHorarios ? f.weekHours : [];
    // "dias" y "horario" se mantienen en sincronía con los horarios nuevos (así las fichas viejas y las pantallas anteriores siguen mostrando algo correcto)
    const datos = { ...f, localidad: loc, whatsapp: f.mostrarWhatsapp || f.whatsapp ? f.whatsapp : "", weekHours: wh, dias: conHorarios ? diasDeHorarios(wh) : [], horario: conHorarios ? resumenHorarios(wh).slice(0, 60) : "" };
    try {
      const o = editando ? await oficiosApi.editar(inicial.id, datos) : await oficiosApi.crear(datos);
      onGuardado(o, !editando);
    } catch (e) { setEstado({ error: e.message || "No se pudo guardar. Probá de nuevo." }); }
  };
  const alTocarGuardar = () => (editando ? guardar() : setDialogo("activar"));

  const textosActivar = {
    titulo: "¿Activar tu ficha de oficios?",
    queHace: "Publica tu ficha en Mi Zona con los datos que cargaste.",
    paraQue: "Sirve para que vecinos que buscan tus rubros te encuentren y te contacten.",
    queSucedera: `Tu ficha va a ser pública: cualquier persona podrá verla y contactarte${f.mostrarWhatsapp ? " por WhatsApp (quien toque el botón verá tu número)" : ""}.${f.direccion.trim() ? " Tu dirección también será pública." : ""} La podés editar, pausar o eliminar cuando quieras desde Mis fichas.`,
  };
  const q = busca.trim().toLowerCase();
  const rubrosVisibles = (g) => RUBROS.filter((r) => r.grupo === g && (!q || r.label.toLowerCase().includes(q)));
  const elegidos = [...f.rubros.map((id) => ETIQUETA_RUBRO[id] || id), ...f.otros];

  return (
    <Pagina titulo={editando ? "Editar mi ficha" : "Ofrecer mis servicios"} onVolver={onCancelar}
      pie={
        <div style={{ flex: 1 }}>
          {estado?.error && <p role="alert" className="text-sm mb-2" style={{ color: "#9A3B34" }}>{estado.error}</p>}
          {!listo && faltan.length > 0 && <p className="text-sm mb-2" style={{ color: "#4A5372" }}>Falta: {faltan.join(", ")}.</p>}
          <button type="button" onClick={alTocarGuardar} disabled={!listo} style={{ ...botonPrincipal, width: "100%", opacity: listo ? 1 : 0.5 }}>
            {estado === "guardando" ? "Guardando..." : editando ? "Guardar cambios" : "Activar mi ficha"}
          </button>
        </div>
      }>
      <Avance pasos={pasos} titulo="Tu ficha" />
      {!editando && <ComoFunciona pasos={["Contá qué hacés y en qué rubros (podés elegir varios).", "Elegí tu localidad, tus horarios y cómo te contactan.", "Activá tu ficha: desde ese momento los vecinos la pueden encontrar.", "Podés editarla, pausarla o eliminarla cuando quieras desde Mis fichas."]} />}
      <div className="mt-3" />

      <Seccion icono={User} titulo="Presentación" subtitulo="Lo primero que ve quien busca un servicio.">
        <SelectorLogo valor={f.logo} subiendo={subiendo === "logo"} onArchivo={(a) => subir(a, "logo", ayudaSubir)} onQuitar={() => set("logo", "")} />
        <div className="mt-4" />
        <Campo id="of-nombre" etiqueta="Nombre con el que aparecés" ayuda="Es el nombre de tu ficha. No es tu usuario ni tu perfil.">
          <input id="of-nombre" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={60} autoComplete="name" style={caja} />
        </Campo>
        <Campo id="of-desc" etiqueta="Descripción breve" contador={`${f.desc.length}/300`}>
          <textarea id="of-desc" value={f.desc} onChange={(e) => set("desc", e.target.value)} rows={4} maxLength={300} placeholder="Contá en pocas palabras qué hacés, cuánta experiencia tenés y cómo trabajás" style={{ ...caja, resize: "none", lineHeight: 1.5 }} />
        </Campo>
      </Seccion>

      <Seccion icono={Wrench} titulo="Rubros" subtitulo={`Elegí todos los que hacés. Aparecés en la búsqueda de cada uno. (${elegidos.length} de ${MAX_RUBROS + MAX_OTROS})`}>
        {elegidos.length > 0 && <div className="flex flex-wrap gap-2 mb-3" aria-label="Rubros elegidos">{f.rubros.map((id) => <Chip key={id} activo quitar onClick={() => alternar("rubros", id)}>{ETIQUETA_RUBRO[id] || id}</Chip>)}{f.otros.map((x) => <Chip key={x} activo quitar onClick={() => setF((p) => ({ ...p, otros: p.otros.filter((y) => y !== x) }))}>{x}</Chip>)}</div>}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={18} color="#6B7494" aria-hidden="true" style={{ position: "absolute", left: 14, top: 15 }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar un rubro (ej: plomero)" aria-label="Buscar un rubro" style={{ ...caja, paddingLeft: 42 }} />
        </div>
        {Object.entries(GRUPOS_RUBROS).map(([g, nombre]) => {
          const lista = rubrosVisibles(g); if (!lista.length) return null;
          const abierto = !!q || grupoAbierto === g;
          const cuantos = RUBROS.filter((r) => r.grupo === g && f.rubros.includes(r.id)).length;
          return (
            <div key={g} style={{ borderTop: "1px solid #EEF1F8" }}>
              <button type="button" onClick={() => setGrupoAbierto(abierto && !q ? null : g)} aria-expanded={abierto} style={{ width: "100%", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, textAlign: "left" }}>
                <span style={{ fontWeight: 700, color: "#0B1437", fontSize: "0.9375rem" }}>{nombre}{cuantos > 0 && <span style={{ marginLeft: 8, background: "#2350F5", color: "#fff", borderRadius: 999, fontSize: 12, padding: "1px 8px" }}>{cuantos}</span>}</span>
                <ChevronDown size={18} color="#4A5372" aria-hidden="true" style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
              {abierto && <div className="flex flex-wrap gap-2 pb-3">{lista.map((r) => <Chip key={r.id} activo={f.rubros.includes(r.id)} onClick={() => alternar("rubros", r.id, MAX_RUBROS)}>{r.label}</Chip>)}</div>}
            </div>
          );
        })}
        <div style={{ borderTop: "1px solid #EEF1F8", paddingTop: 12 }}>
          <Campo id="of-otro" etiqueta="¿No está en la lista?" ayuda={`Escribilo y sumalo como rubro propio (hasta ${MAX_OTROS}).`}>
            <div className="flex gap-2">
              <input id="of-otro" value={otro} onChange={(e) => setOtro(e.target.value)} maxLength={40} placeholder="Ej: afilador de cuchillos" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarOtro(); } }} style={caja} />
              <button type="button" onClick={agregarOtro} disabled={otro.trim().length < 2 || f.otros.length >= MAX_OTROS} style={{ ...botonSecundario, opacity: otro.trim().length < 2 || f.otros.length >= MAX_OTROS ? 0.5 : 1 }}>Sumar</button>
            </div>
          </Campo>
        </div>
      </Seccion>

      <Seccion icono={MapPin} titulo="Dónde trabajás" subtitulo="Los vecinos de tu zona te encuentran desde Inicio.">
        <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Tu localidad</p>
        <SelectorLocalidad valor={loc} onChange={(l) => { setLoc(l); setEstado(null); }} />
        <div className="mt-4" />
        <Campo id="of-zona" etiqueta="Zona de trabajo" ayuda="Por ejemplo: «Famaillá y alrededores». Mejor indicar solo la zona.">
          <input id="of-zona" value={f.zona} onChange={(e) => set("zona", e.target.value)} maxLength={80} style={caja} />
        </Campo>
        <Campo id="of-dir" etiqueta="Dirección" ayuda="Si la completás, será pública. Te recomendamos indicar solo la zona.">
          <input id="of-dir" value={f.direccion} onChange={(e) => set("direccion", e.target.value)} maxLength={120} autoComplete="off"
            onBlur={() => { if (f.direccion.trim() && !direccionAceptada.current) setDialogo("direccion"); }} style={caja} />
        </Campo>
      </Seccion>

      <Seccion icono={Clock} titulo="Horarios de atención" subtitulo="Elegí los días y las horas en que atendés." opcional>
        <EditorHorarios value={f.weekHours} onChange={(v) => set("weekHours", v)} />
        <div style={{ borderTop: "1px solid #EEF1F8", marginTop: 14, paddingTop: 12 }}>
          <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Etiquetas</p>
          <div className="flex flex-wrap gap-2">{ETIQUETAS.map(([k, t]) => <Chip key={k} activo={f.etiquetas.includes(k)} onClick={() => alternar("etiquetas", k)}>{t}</Chip>)}</div>
        </div>
      </Seccion>

      <Seccion icono={Tag} titulo="Precio" subtitulo="Una referencia ayuda a que te escriban con confianza." opcional>
        <Campo id="of-precio" etiqueta="Precio orientativo" ayuda="Es solo una referencia. No inventes precios que no vas a cumplir.">
          <EntradaIcono id="of-precio" icono={Tag} value={f.precio} onChange={(e) => set("precio", e.target.value)} maxLength={80} placeholder="Ej: Desde $15.000 la visita" />
        </Campo>
      </Seccion>

      <Seccion icono={MessageCircle} titulo="Cómo te contactan" subtitulo="WhatsApp y redes para que te encuentren.">
        <Interruptor activo={f.mostrarWhatsapp} onChange={() => (f.mostrarWhatsapp ? set("mostrarWhatsapp", false) : setDialogo("whatsapp"))} titulo="Mostrar botón de WhatsApp" desc="Si lo activás, quien toque el botón verá tu número." />
        {f.mostrarWhatsapp && (
          <div className="mt-3"><Campo id="of-wa" etiqueta="Tu número de WhatsApp" ayuda="Con código de área, sin 0 ni 15. Ej: 381 555 1234.">
            <EntradaIcono id="of-wa" icono={MessageCircle} value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} />
          </Campo></div>
        )}
        <div style={{ borderTop: "1px solid #EEF1F8", marginTop: 12, paddingTop: 14 }}>
          <Campo id="of-ig" etiqueta="Instagram"><EntradaIcono id="of-ig" icono={Instagram} value={f.ig} onChange={(e) => set("ig", e.target.value)} maxLength={300} placeholder="usuario o enlace" /></Campo>
          <Campo id="of-fb" etiqueta="Facebook"><EntradaIcono id="of-fb" icono={Facebook} value={f.facebook} onChange={(e) => set("facebook", e.target.value)} maxLength={300} placeholder="usuario o enlace" /></Campo>
          <Campo id="of-tt" etiqueta="TikTok"><EntradaIcono id="of-tt" icono={Music2} value={f.tiktok} onChange={(e) => set("tiktok", e.target.value)} maxLength={300} placeholder="usuario o enlace" /></Campo>
        </div>
      </Seccion>

      <Seccion icono={ImageIcon} titulo="Fotos de tus trabajos" subtitulo="Las fichas con fotos reciben más consultas." opcional>
        <GaleriaFotos fotos={f.fotos} max={MAX_FOTOS} subiendo={subiendo === "fotos"} onArchivos={(a) => subir(a, "fotos", ayudaSubir)} onQuitar={(u) => setF((p) => ({ ...p, fotos: p.fotos.filter((x) => x !== u) }))} ayuda="La primera es la portada. Subí solo fotos de tus trabajos; evitá personas o datos privados." />
      </Seccion>

      {dialogo === "whatsapp" && (
        <DialogoAdvertencia titulo="¿Mostrar tu WhatsApp?" queHace="Agrega a tu ficha un botón «Contactar por WhatsApp»." paraQue="Sirve para que los vecinos te escriban directo."
          queSucedera="Quien toque el botón verá tu número y podrá escribirte. Ese número no se puede esconder de quien toca el botón. Podés apagarlo cuando quieras." textoAceptar="Sí, mostrarlo"
          onAceptar={() => { set("mostrarWhatsapp", true); setDialogo(null); }} onCancelar={() => setDialogo(null)} />
      )}
      {dialogo === "direccion" && (
        <DialogoAdvertencia titulo="Tu dirección será pública" queHace="Muestra la dirección que escribiste en tu ficha." paraQue="Sirve si atendés en un local o taller."
          queSucedera="Cualquier persona podrá verla. Si trabajás a domicilio, te recomendamos dejarla vacía e indicar solo la zona." textoAceptar="Dejarla pública" textoCancelar="Quitarla"
          onAceptar={() => { direccionAceptada.current = true; setDialogo(null); }} onCancelar={() => { set("direccion", ""); setDialogo(null); }} />
      )}
      {dialogo === "activar" && <DialogoAdvertencia {...textosActivar} textoAceptar="Sí, activar" cargando={estado === "guardando"} onAceptar={guardar} onCancelar={() => setDialogo(null)} />}
    </Pagina>
  );
}

// ---------- paso final al activar ----------

// Fase 6: el paso de "compartir Mi Zona" (PasoCompartir) va dentro de esta pantalla.
// ENGANCHE Fase 9: acá se muestra cuándo termina el mes gratis. Por ahora solo confirma que la ficha está activa.
export function PasoOficioActivado({ oficio, onVerFicha, onListo }) {
  return (
    <Pagina titulo="Tu ficha está activa" onVolver={onListo}>
      <EstadoExito titulo="¡Listo! Tu ficha ya es pública" mensaje={`${oficio.nombre} ya aparece en las búsquedas de ${rubrosTexto(oficio, "", 3)}. Podés editarla, pausarla o eliminarla cuando quieras desde Mis fichas.`} />
      <PasoCompartir tipo="oficio" ficha={{ id: oficio.id, nombre: oficio.nombre }} onSalir={onListo} />
      <button type="button" onClick={onVerFicha} className="w-full mt-3" style={botonSecundario}>Ver cómo la ven los demás</button>
    </Pagina>
  );
}
