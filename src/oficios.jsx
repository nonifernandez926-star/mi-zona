import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Wrench, MapPin, MessageCircle, Search, Plus, X, Pencil, Trash2, Power, Check, Clock, Instagram, Facebook, Music2, Store, User, ChevronDown, ChevronRight, Eye, Briefcase, ImageIcon, Info, ShieldCheck } from "lucide-react";
import { oficiosApi } from "./api.js";
import { textoLocalidad } from "./localidades.js";
import { RUBROS, GRUPOS_RUBROS } from "./rubros.js";
import SelectorLocalidad from "./selectorLocalidad.jsx";
import TarjetaFicha from "./componentes/TarjetaFicha.jsx";
import DetalleFicha, { SeccionDetalle, FilaDato } from "./componentes/DetalleFicha.jsx";
import ChipEstado from "./componentes/ChipEstado.jsx";
import DialogoAdvertencia from "./componentes/DialogoAdvertencia.jsx";
import ComoFunciona from "./componentes/ComoFunciona.jsx";
import { EstadoCarga, EstadoVacio, EstadoError, EstadoExito } from "./componentes/Estados.jsx";
import { uploadImage, comprimirFoto, comprimirImagen } from "./subirFoto.js";
import { infoSuscripcion } from "./cuenta.jsx";

// Oficios y servicios (Fase 4). Una ficha por persona, con varios rubros. Pantallas: listado, ficha, formulario, "Mis fichas" y paso final.
// La navegación entre ellas la maneja App.jsx (para que el botón "atrás" de Android funcione); acá solo están las pantallas.

const DIAS = [["lun", "Lun"], ["mar", "Mar"], ["mie", "Mié"], ["jue", "Jue"], ["vie", "Vie"], ["sab", "Sáb"], ["dom", "Dom"]];
const ETIQUETAS = [["urgencias", "Urgencias"], ["finesDeSemana", "Fines de semana"], ["presupuestoSinCargo", "Presupuesto sin cargo"], ["aDomicilio", "Trabajo a domicilio"]];
const ETIQUETA_TXT = Object.fromEntries(ETIQUETAS);
const ETIQUETA_RUBRO = Object.fromEntries(RUBROS.map((r) => [r.id, r.label]));
const MAX_RUBROS = 6, MAX_OTROS = 3, MAX_FOTOS = 8;
const FONDO = "#F3F5FA";

const botonPrincipal = { minHeight: 50, borderRadius: 14, border: 0, color: "#fff", backgroundColor: "#2350F5", fontWeight: 700, fontSize: "1rem", padding: "0 20px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 };
const botonSecundario = { minHeight: 46, borderRadius: 14, border: "1px solid #CFD6E8", background: "#fff", color: "#0B1437", fontWeight: 700, fontSize: "0.9375rem", padding: "0 16px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 };
const caja = { width: "100%", boxSizing: "border-box", minHeight: 48, border: "1px solid #CFD6E8", borderRadius: 12, padding: "11px 14px", font: "inherit", fontSize: "1rem", background: "#fff", color: "#0B1437" };

const rubrosTexto = (o, primero = "", max = 2) => {
  const nombres = [...(o.rubros || []).map((r) => r.label), ...(o.otros || [])];
  if (primero) nombres.sort((a, b) => (b === primero) - (a === primero));
  return nombres.length > max ? `${nombres.slice(0, max).join(", ")} +${nombres.length - max}` : nombres.join(", ");
};
const diasDesde = (iso) => { if (!iso) return null; const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); return d < 1 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`; };

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

function Pagina({ titulo, onVolver, derecha, children, pie }) {
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
function Hoja({ titulo, onCerrar, children }) {
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

function Chip({ activo, children, onClick, quitar }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo === undefined ? undefined : activo}
      style={{ minHeight: 40, borderRadius: 999, padding: "0 14px", fontSize: "0.9375rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${activo ? "#2350F5" : "#CFD6E8"}`, background: activo ? "#EDF1FF" : "#fff", color: activo ? "#1B3FB8" : "#0B1437" }}>
      {activo && <Check size={15} aria-hidden="true" />}{children}{quitar && <X size={14} aria-hidden="true" />}
    </button>
  );
}

// ---------- listado ----------

const ZONA_KEY = "miZonaZonaOficios";
const CACHE_KEY = "miZonaOficiosCache";
const leerZona = () => { try { return JSON.parse(localStorage.getItem(ZONA_KEY) || "null"); } catch { return null; } };
const guardarZona = (z) => { try { localStorage.setItem(ZONA_KEY, JSON.stringify(z)); } catch { /* sin almacenamiento */ } };
const leerCache = (clave) => { try { return (JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"))[clave] || null; } catch { return null; } };
const guardarCache = (clave, valor) => { try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); const claves = Object.keys(c); if (claves.length >= 6 && !c[clave]) delete c[claves[0]]; c[clave] = valor; localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* sin almacenamiento */ } };

const ALCANCES = [["localidad", "Mi localidad"], ["departamento", "Mi departamento"], ["provincia", "Mi provincia"], ["todo", "Todo el país"]];
const SIGUIENTE = { localidad: "departamento", departamento: "provincia", provincia: "todo" };

export function OficiosScreen({ usuario, onVolver, onAbrir, onOfrecer, onMisFichas }) {
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
            <p className="text-sm" style={{ color: "#4A5372" }} role="status">{total} {total === 1 ? "ficha" : "fichas"}</p>
            {items.map((o) => (
              <TarjetaFicha key={o.id} titulo={o.nombre} zona={textoLocalidad(o.localidad)} datoClave={rubrosTexto(o, rubro ? ETIQUETA_RUBRO[rubro] : "")}
                estado={o.disponibilidad || undefined} imagen={o.logo || o.fotos?.[0]} icono={Wrench} tono="naranja" onAbrir={() => onAbrir(o.id, rubro ? ETIQUETA_RUBRO[rubro] : "")} />
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

function HojaZona({ zona, usuario, onCambiar, onCerrar }) {
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

function Fotos({ fotos }) {
  const [abierta, setAbierta] = useState(null);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {fotos.map((f) => (
          <button key={f} type="button" onClick={() => setAbierta(f)} aria-label="Ver foto de trabajo" style={{ padding: 0, border: 0, borderRadius: 12, overflow: "hidden", aspectRatio: "1 / 1", background: "#EEF1F8" }}>
            <img src={f} alt="Foto de un trabajo" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </button>
        ))}
      </div>
      {abierta && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3" style={{ background: "#000000e6" }} onClick={() => setAbierta(null)}>
          <button type="button" aria-label="Cerrar" onClick={() => setAbierta(null)} style={{ position: "absolute", top: "calc(12px + env(safe-area-inset-top, 0px))", right: 12, width: 48, height: 48 }}><X size={26} color="#fff" /></button>
          <img src={abierta} alt="Foto de un trabajo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      )}
    </>
  );
}

const urlRed = (v, base) => (/^https:\/\//i.test(v) ? v : `${base}${v}`);

export function DetalleOficio({ id, rubroConsulta = "", onVolver, onAbrirPerfil }) {
  const [o, setO] = useState(null);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | noExiste | error
  const [wa, setWa] = useState(false);
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
      pie={o.conWhatsapp ? <button type="button" onClick={() => setWa(true)} style={{ ...botonPrincipal, flex: 1 }}><MessageCircle size={20} aria-hidden="true" /> Contactar por WhatsApp</button> : undefined}>
      <SeccionDetalle titulo="Rubros" icono={Wrench}>
        <div className="flex flex-wrap gap-2">{[...o.rubros.map((r) => r.label), ...o.otros].map((n) => <span key={n} style={{ borderRadius: 999, padding: "4px 12px", background: "#EEF1F8", color: "#0B1437", fontSize: "0.9375rem", fontWeight: 600 }}>{n}</span>)}</div>
        {o.etiquetas.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{o.etiquetas.map((e) => <span key={e} style={{ borderRadius: 999, padding: "4px 12px", background: "#E4F3EA", color: "#1E6B44", fontSize: "0.875rem", fontWeight: 700 }}>{ETIQUETA_TXT[e] ? ETIQUETAS.find(([k]) => k === e)[1] : e}</span>)}</div>}
      </SeccionDetalle>
      <SeccionDetalle titulo="Sobre mi trabajo" icono={Info}><p style={{ whiteSpace: "pre-line" }}>{o.desc}</p></SeccionDetalle>
      <SeccionDetalle titulo="Datos">
        <FilaDato icono={MapPin} etiqueta="Dónde trabaja" valor={[lugar, o.zona].filter(Boolean).join(" · ")} />
        <FilaDato icono={MapPin} etiqueta="Dirección" valor={o.direccion} />
        <FilaDato icono={Clock} etiqueta="Días y horarios" valor={[o.dias.length ? o.dias.map((d) => DIAS.find(([k]) => k === d)?.[1]).join(", ") : "", o.horario].filter(Boolean).join(" · ")} />
        <FilaDato icono={Briefcase} etiqueta="Precio orientativo" valor={o.precio} />
        {o.precio && <p className="text-sm" style={{ color: "#4A5372" }}>Es una referencia: el precio final se acuerda con la persona.</p>}
      </SeccionDetalle>
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
    </DetalleFicha>
  );
}

// Mensaje inicial editable. Al tocar "Abrir WhatsApp" el servidor arma el enlace oficial (con el número) y se abre el chat: Mi Zona no envía nada.
function HojaWhatsapp({ id, nombre, rubro, onCerrar }) {
  const [texto, setTexto] = useState(`Hola, te encontré en Mi Zona. Quería consultar por tus servicios de ${rubro.toLowerCase()}.`);
  const [estado, setEstado] = useState(null); // null | "abriendo" | { error }
  const abrir = async () => {
    setEstado("abriendo");
    try { const url = await oficiosApi.contacto(id, texto.trim()); window.location.assign(url); setEstado(null); onCerrar(); }
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

const INICIAL = { nombre: "", rubros: [], otros: [], desc: "", zona: "", direccion: "", whatsapp: "", mostrarWhatsapp: false, ig: "", facebook: "", tiktok: "", logo: "", fotos: [], dias: [], horario: "", precio: "", etiquetas: [] };

function Campo({ id, etiqueta, ayuda, children, contador }) {
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
const Bloque = ({ titulo, children }) => (
  <section className="bg-white mb-3" style={{ border: "1px solid #E3E7F1", borderRadius: 20, padding: 16 }}>
    <h2 style={{ fontWeight: 800, fontSize: "1.0625rem", color: "#0B1437", marginBottom: 12 }}>{titulo}</h2>{children}
  </section>
);

export function FormularioOficio({ inicial, usuario, onGuardado, onCancelar }) {
  const editando = !!inicial;
  const [f, setF] = useState(() => (inicial ? { ...INICIAL, ...inicial, rubros: inicial.rubros.map((r) => r.id) } : { ...INICIAL, nombre: usuario?.nombre || "" }));
  const [loc, setLoc] = useState(inicial?.localidadCompleta || usuario?.localidad || null);
  const [otro, setOtro] = useState("");
  const [dialogo, setDialogo] = useState(null); // "whatsapp" | "direccion" | "activar"
  const [estado, setEstado] = useState(null); // null | "guardando" | { error }
  const [subiendo, setSubiendo] = useState(null); // "logo" | "fotos"
  const archivoLogo = useRef(null), archivoFotos = useRef(null);
  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setEstado(null); };
  const alternar = (k, v, max) => setF((p) => { const t = p[k].includes(v); if (!t && max && p[k].length >= max) return p; return { ...p, [k]: t ? p[k].filter((x) => x !== v) : [...p[k], v] }; });
  const direccionAceptada = useRef(!!inicial?.direccion);

  const faltan = [];
  if (f.nombre.trim().length < 2) faltan.push("tu nombre");
  if (f.rubros.length + f.otros.length === 0) faltan.push("al menos un rubro");
  if (f.desc.trim().length < 10) faltan.push("una descripción (mínimo 10 letras)");
  if (!loc) faltan.push("tu localidad");
  if (f.mostrarWhatsapp && f.whatsapp.replace(/\D/g, "").length < 8) faltan.push("tu número de WhatsApp");
  const listo = faltan.length === 0 && !subiendo && estado !== "guardando";

  const agregarOtro = () => {
    const t = otro.trim().replace(/\s+/g, " ");
    if (t.length < 2 || f.otros.length >= MAX_OTROS || f.otros.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    setF((p) => ({ ...p, otros: [...p.otros, t.slice(0, 40)] })); setOtro("");
  };
  const subir = async (archivos, destino) => {
    const lista = [...archivos]; if (!lista.length) return;
    if (lista.some((a) => !/^image\//.test(a.type) || a.size > 15 * 1024 * 1024)) { setEstado({ error: "Elegí imágenes de hasta 15 MB cada una." }); return; }
    setSubiendo(destino); setEstado(null);
    try {
      if (destino === "logo") set("logo", await uploadImage(await comprimirImagen(lista[0])));
      else {
        const sobra = MAX_FOTOS - f.fotos.length; const urls = [];
        for (const a of lista.slice(0, sobra)) urls.push(await uploadImage(await comprimirFoto(a)));
        setF((p) => ({ ...p, fotos: [...p.fotos, ...urls] }));
      }
    } catch { setEstado({ error: "No pudimos subir la foto. Probá de nuevo en un rato." }); }
    setSubiendo(null);
  };

  const guardar = async () => {
    setEstado("guardando"); setDialogo(null);
    const datos = { ...f, localidad: loc, whatsapp: f.mostrarWhatsapp || f.whatsapp ? f.whatsapp : "" };
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
      {!editando && <ComoFunciona pasos={["Contá qué hacés y en qué rubros (podés elegir varios).", "Elegí tu localidad y, si querés, cómo te contactan.", "Activá tu ficha: desde ese momento los vecinos la pueden encontrar.", "Podés editarla, pausarla o eliminarla cuando quieras desde Mis fichas."]} />}
      <div className="mt-3" />

      <Bloque titulo="Quién sos">
        <Campo id="of-nombre" etiqueta="Nombre con el que aparecés" ayuda="Es el nombre de tu ficha. No es tu usuario ni tu perfil.">
          <input id="of-nombre" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={60} autoComplete="name" style={caja} />
        </Campo>
      </Bloque>

      <Bloque titulo="Rubros">
        <p className="text-sm mb-3" style={{ color: "#4A5372", lineHeight: 1.45 }}>Elegí todos los que hacés. Aparecés en la búsqueda de cada uno, con una sola ficha. ({f.rubros.length + f.otros.length} de {MAX_RUBROS + MAX_OTROS})</p>
        {Object.entries(GRUPOS_RUBROS).map(([g, nombre]) => (
          <div key={g} className="mb-3">
            <p className="text-sm font-bold mb-1.5" style={{ color: "#4A5372" }}>{nombre}</p>
            <div className="flex flex-wrap gap-2">{RUBROS.filter((r) => r.grupo === g).map((r) => <Chip key={r.id} activo={f.rubros.includes(r.id)} onClick={() => alternar("rubros", r.id, MAX_RUBROS)}>{r.label}</Chip>)}</div>
          </div>
        ))}
        <Campo id="of-otro" etiqueta="Otro rubro" ayuda={`Si no está en la lista, escribilo (hasta ${MAX_OTROS}).`}>
          <div className="flex gap-2">
            <input id="of-otro" value={otro} onChange={(e) => setOtro(e.target.value)} maxLength={40} placeholder="Ej: afilador de cuchillos" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarOtro(); } }} style={caja} />
            <button type="button" onClick={agregarOtro} disabled={otro.trim().length < 2 || f.otros.length >= MAX_OTROS} style={{ ...botonSecundario, opacity: otro.trim().length < 2 || f.otros.length >= MAX_OTROS ? 0.5 : 1 }}>Agregar</button>
          </div>
          {f.otros.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{f.otros.map((x) => <Chip key={x} quitar onClick={() => setF((p) => ({ ...p, otros: p.otros.filter((y) => y !== x) }))}>{x}</Chip>)}</div>}
        </Campo>
      </Bloque>

      <Bloque titulo="Sobre tu trabajo">
        <Campo id="of-desc" etiqueta="Descripción breve" contador={`${f.desc.length}/300`}>
          <textarea id="of-desc" value={f.desc} onChange={(e) => set("desc", e.target.value)} rows={4} maxLength={300} placeholder="Contá en pocas palabras qué hacés y cómo trabajás" style={{ ...caja, resize: "none", lineHeight: 1.5 }} />
        </Campo>
        <Campo id="of-precio" etiqueta="Precio orientativo (opcional)" ayuda="Es solo una referencia. No inventes precios que no vas a cumplir.">
          <input id="of-precio" value={f.precio} onChange={(e) => set("precio", e.target.value)} maxLength={80} placeholder="Ej: Desde $15.000 la visita" style={caja} />
        </Campo>
        <p className="text-sm font-bold mb-1.5" style={{ color: "#0B1437" }}>Etiquetas (opcional)</p>
        <div className="flex flex-wrap gap-2">{ETIQUETAS.map(([k, t]) => <Chip key={k} activo={f.etiquetas.includes(k)} onClick={() => alternar("etiquetas", k)}>{t}</Chip>)}</div>
      </Bloque>

      <Bloque titulo="Dónde trabajás">
        <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Tu localidad</p>
        <SelectorLocalidad valor={loc} onChange={(l) => { setLoc(l); setEstado(null); }} />
        <div className="mt-4" />
        <Campo id="of-zona" etiqueta="Zona de trabajo (opcional)" ayuda="Por ejemplo: «Famaillá y alrededores». Mejor indicar solo la zona.">
          <input id="of-zona" value={f.zona} onChange={(e) => set("zona", e.target.value)} maxLength={80} style={caja} />
        </Campo>
        <Campo id="of-dir" etiqueta="Dirección (opcional)" ayuda="Si la completás, será pública. Te recomendamos indicar solo la zona.">
          <input id="of-dir" value={f.direccion} onChange={(e) => set("direccion", e.target.value)} maxLength={120} autoComplete="off"
            onBlur={() => { if (f.direccion.trim() && !direccionAceptada.current) setDialogo("direccion"); }} style={caja} />
        </Campo>
      </Bloque>

      <Bloque titulo="Cómo te contactan">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex-1">
            <span className="block text-sm font-bold" style={{ color: "#0B1437" }}>Mostrar botón de WhatsApp</span>
            <span className="block text-sm" style={{ color: "#4A5372", lineHeight: 1.45 }}>Si lo activás, quien toque el botón verá tu número.</span>
          </span>
          <button type="button" role="switch" aria-checked={f.mostrarWhatsapp} aria-label="Mostrar botón de WhatsApp"
            onClick={() => (f.mostrarWhatsapp ? set("mostrarWhatsapp", false) : setDialogo("whatsapp"))}
            style={{ width: 54, height: 32, borderRadius: 16, background: f.mostrarWhatsapp ? "#2350F5" : "#CBD3E1", position: "relative", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 3, left: f.mostrarWhatsapp ? 25 : 3, width: 26, height: 26, borderRadius: 13, background: "#fff", transition: "left .2s" }} />
          </button>
        </div>
        {f.mostrarWhatsapp && (
          <Campo id="of-wa" etiqueta="Tu número de WhatsApp" ayuda="Con código de área, sin 0 ni 15. Ej: 381 555 1234.">
            <input id="of-wa" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} style={caja} />
          </Campo>
        )}
        <Campo id="of-ig" etiqueta="Instagram (opcional)"><input id="of-ig" value={f.ig} onChange={(e) => set("ig", e.target.value)} maxLength={300} placeholder="usuario o enlace" style={caja} /></Campo>
        <Campo id="of-fb" etiqueta="Facebook (opcional)"><input id="of-fb" value={f.facebook} onChange={(e) => set("facebook", e.target.value)} maxLength={300} placeholder="usuario o enlace" style={caja} /></Campo>
        <Campo id="of-tt" etiqueta="TikTok (opcional)"><input id="of-tt" value={f.tiktok} onChange={(e) => set("tiktok", e.target.value)} maxLength={300} placeholder="usuario o enlace" style={caja} /></Campo>
      </Bloque>

      <Bloque titulo="Cuándo trabajás (opcional)">
        <div className="flex flex-wrap gap-2 mb-3">{DIAS.map(([k, t]) => <Chip key={k} activo={f.dias.includes(k)} onClick={() => alternar("dias", k)}>{t}</Chip>)}</div>
        <Campo id="of-hor" etiqueta="Horarios"><input id="of-hor" value={f.horario} onChange={(e) => set("horario", e.target.value)} maxLength={60} placeholder="Ej: de 8 a 18 hs" style={caja} /></Campo>
      </Bloque>

      <Bloque titulo="Logo y fotos de trabajos (opcional)">
        <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Logo</p>
        <div className="flex items-center gap-3 mb-4">
          {f.logo ? <img src={f.logo} alt="Tu logo" style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover" }} /> : <span style={{ width: 64, height: 64, borderRadius: 16, background: "#EEF1F8", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={26} color="#8D95B0" aria-hidden="true" /></span>}
          <button type="button" onClick={() => archivoLogo.current?.click()} disabled={!!subiendo} style={botonSecundario}>{subiendo === "logo" ? "Subiendo..." : f.logo ? "Cambiar" : "Subir logo"}</button>
          {f.logo && !subiendo && <button type="button" onClick={() => set("logo", "")} style={{ ...botonSecundario, border: 0, background: "transparent", color: "#9A3B34" }}>Quitar</button>}
          <input ref={archivoLogo} type="file" accept="image/*" hidden onChange={(e) => { subir(e.target.files, "logo"); e.target.value = ""; }} />
        </div>
        <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Fotos de trabajos ({f.fotos.length} de {MAX_FOTOS})</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {f.fotos.map((u) => (
            <div key={u} style={{ position: "relative", aspectRatio: "1 / 1" }}>
              <img src={u} alt="Foto de un trabajo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
              <button type="button" aria-label="Quitar foto" onClick={() => setF((p) => ({ ...p, fotos: p.fotos.filter((x) => x !== u) }))} style={{ position: "absolute", top: -6, right: -6, width: 30, height: 30, borderRadius: 15, background: "#C1443A", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={15} color="#fff" /></button>
            </div>
          ))}
        </div>
        {f.fotos.length < MAX_FOTOS && <button type="button" onClick={() => archivoFotos.current?.click()} disabled={!!subiendo} className="mt-3" style={botonSecundario}><Plus size={16} aria-hidden="true" /> {subiendo === "fotos" ? "Subiendo..." : "Agregar fotos"}</button>}
        <input ref={archivoFotos} type="file" accept="image/*" multiple hidden onChange={(e) => { subir(e.target.files, "fotos"); e.target.value = ""; }} />
        <p className="text-sm mt-2" style={{ color: "#4A5372", lineHeight: 1.45 }}>Subí solo fotos de tus trabajos. Evitá fotos donde se vean personas o datos privados.</p>
      </Bloque>

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

// ENGANCHE Fase 6: acá va el paso de "compartir Mi Zona" (botón que abre el menú de compartir con el enlace de descarga).
// ENGANCHE Fase 9: acá se muestra cuándo termina el mes gratis. Por ahora solo confirma que la ficha está activa.
export function PasoOficioActivado({ oficio, onVerFicha, onListo }) {
  return (
    <Pagina titulo="Tu ficha está activa" onVolver={onListo}>
      <EstadoExito titulo="¡Listo! Tu ficha ya es pública" mensaje={`${oficio.nombre} ya aparece en las búsquedas de ${rubrosTexto(oficio, "", 3)}. Podés editarla, pausarla o eliminarla cuando quieras desde Mis fichas.`} accion={{ texto: "Ir a Mis fichas", onClick: onListo }} />
      <button type="button" onClick={onVerFicha} className="w-full mt-3" style={botonSecundario}>Ver cómo la ven los demás</button>
    </Pagina>
  );
}

// ---------- Mis fichas ----------

// Estado de un negocio propio, con las mismas reglas que Mi cuenta (pendiente de pago, activa, por vencer, vencida)
function infoNegocio(n) {
  const i = infoSuscripcion(n);
  if (!i) return { estado: "activa" };
  if (i.estado === "pendiente") return { estado: "pausada", texto: "Esperando el pago" };
  if (i.estado === "vencida") return { estado: "vencida" };
  return i.estado === "por_vencer" ? { estado: "activa", texto: `Vence en ${i.dias} ${i.dias === 1 ? "día" : "días"}` } : { estado: "activa" };
}

function FilaFicha({ icono: Icono, tono, titulo, sub, chip, children }) {
  return (
    <div className="bg-white mb-3" style={{ border: "1px solid #E3E7F1", borderRadius: 20, padding: 14 }}>
      <div className="flex items-center gap-3">
        <span style={{ width: 52, height: 52, borderRadius: 16, background: tono, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icono size={24} color="#0B1437" aria-hidden="true" /></span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.0625rem", color: "#0B1437", overflowWrap: "anywhere" }}>{titulo}</span>
          {sub && <span className="block text-sm" style={{ color: "#4A5372" }}>{sub}</span>}
          <span className="inline-block mt-1">{chip}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">{children}</div>
    </div>
  );
}

export function MisFichasScreen({ usuario, negocios, onVolver, onVerNegocio, onEditarNegocio, onEliminarNegocio, onVerOficio, onEditarOficio, onCrearOficio, onAgregarNegocio, onAlquileres, refrescar }) {
  const [oficio, setOficio] = useState(undefined); // undefined = cargando · null = no tiene
  const [error, setError] = useState(false);
  const [dialogo, setDialogo] = useState(null); // { tipo: "pausar"|"activar"|"eliminarOficio"|"eliminarNegocio", dato }
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const cargar = useCallback(() => { setError(false); oficiosApi.mio().then(setOficio).catch(() => { setError(true); setOficio(null); }); }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const correr = async (accion, mensajeOk) => {
    setTrabajando(true); setAviso(null);
    try { await accion(); if (mensajeOk) setAviso({ ok: mensajeOk }); } catch (e) { setAviso({ error: e.message || "No se pudo completar. Probá de nuevo." }); }
    setTrabajando(false); setDialogo(null);
  };
  const disponibilidad = (valor) => correr(async () => setOficio(await oficiosApi.disponibilidad(oficio.id, valor)));
  const textos = dialogo && ({
    pausar: { titulo: "¿Pausar tu ficha de oficios?", queHace: "Oculta tu ficha.", paraQue: "Sirve si no podés tomar trabajos por un tiempo.", queSucedera: "No aparece en búsquedas ni listados y nadie puede abrirla. No se borra nada: podés activarla de nuevo cuando quieras.", textoAceptar: "Sí, pausar" },
    activar: { titulo: "¿Activar tu ficha otra vez?", queHace: "Vuelve a publicar tu ficha.", paraQue: "Sirve para que te encuentren de nuevo.", queSucedera: "Va a ser pública otra vez y otras personas podrán contactarte.", textoAceptar: "Sí, activar" },
    eliminarOficio: { titulo: "¿Eliminar tu ficha de oficios?", queHace: "Borra tu ficha para siempre, con sus fotos y datos.", paraQue: "Sirve si ya no querés ofrecer tus servicios en Mi Zona.", queSucedera: "Desaparece de las búsquedas y de los favoritos. No se puede deshacer. Si solo querés frenarla un tiempo, mejor pausala.", textoAceptar: "Sí, eliminar", peligro: true },
    eliminarNegocio: { titulo: `¿Eliminar ${dialogo.dato?.nombre}?`, queHace: "Borra tu negocio para siempre, con sus reseñas, promociones y estadísticas.", paraQue: "Sirve si ya no querés tener este negocio en Mi Zona.", queSucedera: "Desaparece de las búsquedas, del mapa y de los favoritos. No se puede deshacer y la suscripción que ya pagaste no se reembolsa. Si no querés perderlo, no lo elimines.", textoAceptar: "Sí, eliminar", peligro: true },
  })[dialogo.tipo];
  const confirmar = () => {
    if (dialogo.tipo === "pausar" || dialogo.tipo === "activar") return correr(async () => setOficio(await oficiosApi.estado(oficio.id, dialogo.tipo === "pausar" ? "paused" : "active")), dialogo.tipo === "pausar" ? "Tu ficha quedó pausada." : "Tu ficha está activa otra vez.");
    if (dialogo.tipo === "eliminarOficio") return correr(async () => { await oficiosApi.eliminar(oficio.id); setOficio(null); }, "Tu ficha de oficios se eliminó.");
    return correr(async () => { await onEliminarNegocio(dialogo.dato.id); }, "Tu negocio se eliminó.");
  };
  const total = (negocios?.length || 0) + (oficio ? 1 : 0);

  return (
    <Pagina titulo="Mis fichas" onVolver={onVolver}>
      <ComoFunciona pasos={["Acá ves todo lo que ofrecés en Mi Zona: tu negocio y tu ficha de oficios.", "Tocá una ficha para verla, editarla, pausarla o eliminarla.", "Pausar oculta la ficha sin borrar nada. Eliminar la borra para siempre."]} />
      {aviso?.ok && <p role="status" className="text-sm mt-3 p-3 flex items-center gap-2" style={{ borderRadius: 12, background: "#EBF7F0", color: "#1E6B44", fontWeight: 600 }}><Check size={16} aria-hidden="true" /> {aviso.ok}</p>}
      {aviso?.error && <p role="alert" className="text-sm mt-3 p-3" style={{ borderRadius: 12, background: "#FDF1EF", color: "#9A3B34" }}>{aviso.error}</p>}
      <div className="mt-4" />

      {oficio === undefined && <EstadoCarga texto="Cargando tus fichas..." filas={2} />}
      {error && <EstadoError onReintentar={cargar} />}

      {negocios?.map((n) => {
        const i = infoNegocio(n);
        return (
          <FilaFicha key={n.id} icono={Store} tono="#DCEFE4" titulo={n.name || n.nombre} sub="Negocio" chip={<ChipEstado estado={i.estado} texto={i.texto} compacto />}>
            <button type="button" onClick={() => onVerNegocio(n.id)} style={botonSecundario}><Eye size={16} aria-hidden="true" /> Ver</button>
            <button type="button" onClick={() => onEditarNegocio(n.id)} style={botonSecundario}><Pencil size={16} aria-hidden="true" /> Editar</button>
            <button type="button" onClick={() => setDialogo({ tipo: "eliminarNegocio", dato: { id: n.id, nombre: n.name || n.nombre } })} style={{ ...botonSecundario, color: "#9A3B34" }}><Trash2 size={16} aria-hidden="true" /> Eliminar</button>
          </FilaFicha>
        );
      })}

      {oficio && (
        <FilaFicha icono={Wrench} tono="#FFE8C2" titulo={oficio.nombre} sub={`Oficios · ${rubrosTexto(oficio, "", 3)}`} chip={<ChipEstado estado={oficio.estado} compacto />}>
          <div className="w-full">
            <p className="text-sm font-bold mb-1.5" style={{ color: "#0B1437" }}>¿Estás disponible?</p>
            <div className="flex gap-2" role="group" aria-label="Disponibilidad">
              <Chip activo={oficio.disponibilidad === "disponibleHoy"} onClick={() => !trabajando && disponibilidad(true)}>Disponible hoy</Chip>
              <Chip activo={oficio.disponibilidad === "ocupado"} onClick={() => !trabajando && disponibilidad(false)}>Ocupado</Chip>
            </div>
            <p className="text-sm mt-1.5" style={{ color: "#4A5372", lineHeight: 1.4 }}>«Disponible hoy» se apaga solo a medianoche, para no prometer lo que ya no es cierto.</p>
          </div>
          {oficio.estado === "activa" && <button type="button" onClick={() => onVerOficio(oficio.id)} style={botonSecundario}><Eye size={16} aria-hidden="true" /> Ver</button>}
          <button type="button" onClick={() => onEditarOficio(oficio)} style={botonSecundario}><Pencil size={16} aria-hidden="true" /> Editar</button>
          {oficio.estado === "pausada"
            ? <button type="button" onClick={() => setDialogo({ tipo: "activar" })} style={botonSecundario}><Power size={16} aria-hidden="true" /> Activar</button>
            : <button type="button" onClick={() => setDialogo({ tipo: "pausar" })} style={botonSecundario}><Power size={16} aria-hidden="true" /> Pausar</button>}
          <button type="button" onClick={() => setDialogo({ tipo: "eliminarOficio" })} style={{ ...botonSecundario, color: "#9A3B34" }}><Trash2 size={16} aria-hidden="true" /> Eliminar</button>
        </FilaFicha>
      )}
      {oficio?.estado === "pausada" && <p className="text-sm px-1 mb-3" style={{ color: "#4A5372" }}>Tu ficha está pausada: nadie puede verla hasta que la actives.</p>}

      {oficio !== undefined && !error && total === 0 && <EstadoVacio icono={Store} titulo="Todavía no tenés fichas" mensaje="Podés sumar tu negocio o ofrecer tus servicios de oficio." />}
      {oficio !== undefined && !error && (
        <div className="flex flex-col gap-2 mt-2">
          {!oficio && <button type="button" onClick={onCrearOficio} style={{ ...botonPrincipal, width: "100%" }}><Plus size={18} aria-hidden="true" /> Ofrecer mis servicios (oficios)</button>}
          <button type="button" onClick={onAgregarNegocio} style={{ ...botonSecundario, minHeight: 50 }}><Plus size={18} aria-hidden="true" /> Agregar un negocio</button>
          {onAlquileres && <button type="button" onClick={onAlquileres} style={{ ...botonSecundario, minHeight: 50 }}><Plus size={18} aria-hidden="true" /> Administrar mis alquileres</button>}
        </div>
      )}
      {textos && <DialogoAdvertencia {...textos} cargando={trabajando} onAceptar={confirmar} onCancelar={() => !trabajando && setDialogo(null)} />}
    </Pagina>
  );
}
