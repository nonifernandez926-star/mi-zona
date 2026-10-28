import { useCallback, useEffect, useRef, useState } from "react";
import { Share2, Heart, MapPin, MessageCircle, Navigation, Search, Plus, X, Pencil, Trash2, Check, Clock, Instagram, Facebook, Music2, User, ChevronDown, ChevronRight, ImageIcon, Info, ShieldAlert, Home, PartyPopper, Hammer, Package, Bed, Bath, Users, PawPrint, Tag, RefreshCw } from "lucide-react";
import { alquileresApi } from "./api.js";
import { textoLocalidad } from "./localidades.js";
import { CATEGORIAS, ETIQUETA_CATEGORIA, ETIQUETA_TIPO, UNIDADES, MAX_ARTICULOS, MAX_FOTOS, VIGENCIA_DIAS, textoPrecio, resumenVivienda } from "./alquileres.js";
import SelectorLocalidad from "./selectorLocalidad.jsx";
import TarjetaFicha from "./componentes/TarjetaFicha.jsx";
import { FilaDato } from "./componentes/DetalleFicha.jsx";
import PerfilFicha, { TarjetaInfo } from "./componentes/PerfilFicha.jsx";
import { HojaDenunciar, accionDenunciar } from "./denuncias.jsx";
import PasoCompartir from "./componentes/PasoCompartir.jsx";
import { compartirFicha, avisoDeCompartir } from "./compartir.js";
import { alternarFavFicha, useEsFavFicha, useFavFichas } from "./favoritos.js";
import ChipEstado from "./componentes/ChipEstado.jsx";
import DialogoAdvertencia from "./componentes/DialogoAdvertencia.jsx";
import ComoFunciona from "./componentes/ComoFunciona.jsx";
import { EstadoCarga, EstadoVacio, EstadoError, EstadoExito } from "./componentes/Estados.jsx";
import { uploadImage, comprimirFoto, comprimirImagen } from "./subirFoto.js";
import { TablaHorarios, Seccion, Interruptor, Avance, EntradaIcono, SelectorLogo, GaleriaFotos, EditorHorarios, useSubidas } from "./formKit.jsx";
import { semanaVacia, hayHorarios } from "./horarios.js";
import { Pagina, Hoja, Chip, Campo, Bloque, Fotos, HojaZona, HojaWhatsapp, botonPrincipal, botonSecundario, caja, diasDesde, leerZona, guardarZona, SIGUIENTE, urlRed } from "./oficios.jsx";

// Alquileres (Fase 5). Cada ficha es como el perfil de un pequeño negocio de alquiler, con artículos adentro.
// La navegación entre pantallas la maneja App.jsx (para que el botón "atrás" de Android funcione); acá solo están las pantallas.

const ICONO_CATEGORIA = { viviendas: Home, eventos: PartyPopper, herramientas: Hammer, otros: Package };
export const TONO_CATEGORIA = { viviendas: "azul", eventos: "violeta", herramientas: "naranja", otros: "agua" };
export const iconoCategoria = (c) => ICONO_CATEGORIA[c] || Package;
const CACHE_KEY = "miZonaAlquileresCache";
const leerCache = (k) => { try { return (JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"))[k] || null; } catch { return null; } };
const guardarCache = (k, v) => { try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); const ks = Object.keys(c); if (ks.length >= 6 && !c[k]) delete c[ks[0]]; c[k] = v; localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* sin almacenamiento */ } };
const nombresTipos = (a, max = 2) => { const n = (a.tipos || []).map((t) => t.label); return n.length > max ? `${n.slice(0, max).join(", ")} +${n.length - max}` : n.join(", "); };
const diasPasados = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);

// ---------- listado ----------

export function AlquileresScreen({ usuario, onVolver, onAbrir, onOfrecer, onMisFichas }) {
  const favs = useFavFichas();
  const [avisoCompartir, setAvisoCompartir] = useState("");
  const [zona, setZona] = useState(() => leerZona() || (usuario?.localidad ? { alcance: "departamento", loc: usuario.localidad } : { alcance: "todo", loc: null }));
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState("");
  const [dorm, setDorm] = useState(""); // "" | "0" | "1" | "2" | "3"
  const [amoblado, setAmoblado] = useState(false);
  const [q, setQ] = useState("");
  const [qFinal, setQFinal] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [estado, setEstado] = useState("cargando");
  const [sinConexion, setSinConexion] = useState(false);
  const [masCargando, setMasCargando] = useState(false);
  const [hoja, setHoja] = useState(null); // "zona"
  const pedido = useRef(0);

  useEffect(() => { if (usuario?.localidad && !leerZona() && zona.alcance === "todo" && !zona.loc) setZona({ alcance: "departamento", loc: usuario.localidad }); }, [usuario?.localidad?.localidadId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => setQFinal(q.trim()), 350); return () => clearTimeout(t); }, [q]);

  const filtros = useCallback((pagina) => {
    const f = { pagina };
    if (categoria) f.categoria = categoria;
    if (categoria && tipo) f.tipo = tipo;
    if (categoria === "viviendas") { if (dorm !== "") f.dormitorios = dorm; if (amoblado) f.amoblado = "true"; } // dormitorios y amoblado solo existen en viviendas
    if (qFinal.length >= 2) f.q = qFinal;
    const l = zona.loc;
    if (l && zona.alcance === "localidad") f.localidadId = l.localidadId;
    if (l && zona.alcance === "departamento") f.departamentoId = l.departamentoId;
    if (l && zona.alcance === "provincia") f.provinciaId = l.provinciaId;
    return f;
  }, [categoria, tipo, dorm, amoblado, qFinal, zona]);
  const claveCache = JSON.stringify(filtros(1));

  const cargar = useCallback(() => {
    const mio = ++pedido.current;
    setEstado("cargando"); setSinConexion(false);
    alquileresApi.listar(filtros(1))
      .then((r) => { if (mio !== pedido.current) return; setItems(r.alquileres); setTotal(r.total); setHayMas(r.hayMas); setEstado("ok"); guardarCache(claveCache, { items: r.alquileres, total: r.total }); })
      .catch(() => {
        if (mio !== pedido.current) return;
        const c = leerCache(claveCache);
        if (c) { setItems(c.items); setTotal(c.total); setHayMas(false); setSinConexion(true); setEstado("ok"); } else setEstado("error");
      });
  }, [filtros, claveCache]);
  useEffect(() => { cargar(); }, [cargar]);

  const verMas = async () => {
    setMasCargando(true);
    try {
      const r = await alquileresApi.listar(filtros(Math.floor(items.length / 20) + 1));
      setItems((prev) => [...prev, ...r.alquileres.filter((o) => !prev.some((p) => p.id === o.id))]); setHayMas(r.hayMas); setTotal(r.total);
    } catch { setSinConexion(true); }
    setMasCargando(false);
  };

  const cambiarZona = (z) => { setZona(z); guardarZona(z); };
  const elegirCategoria = (c) => { setCategoria(c); setTipo(""); setDorm(""); setAmoblado(false); };
  const textoZona = zona.alcance === "todo" || !zona.loc ? "Todo el país" : zona.alcance === "localidad" ? zona.loc.localidad : zona.alcance === "departamento" ? `Departamento ${zona.loc.departamento}` : zona.loc.provincia;
  const cat = CATEGORIAS.find((c) => c.id === categoria);
  const filtrando = !!categoria || qFinal.length >= 2;
  const siguiente = SIGUIENTE[zona.alcance];

  return (
    <Pagina titulo="Alquileres" onVolver={onVolver}
      derecha={<button type="button" onClick={onMisFichas} className="text-sm font-semibold" style={{ color: "#fff", minHeight: 44, padding: "0 10px" }}>Mis fichas</button>}>
      <ComoFunciona pasos={[
        "Elegí qué buscás: viviendas y espacios, cumpleaños y eventos, herramientas y equipos u otros.",
        "Abrí una ficha para ver sus artículos, precios, condiciones y qué está disponible.",
        "Si tiene WhatsApp, te escribís con un mensaje que podés cambiar. Mi Zona no manda nada por vos y no maneja pagos ni reservas.",
        "¿Alquilás algo? Tocá «Ofrecer en alquiler» y armá tu ficha con tus artículos.",
      ]} />

      <div className="flex items-center gap-2 bg-white px-3 mt-3" style={{ border: "1px solid #CFD6E8", borderRadius: 14, minHeight: 52 }}>
        <Search size={18} color="#2350F5" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscá, por ejemplo: sillas o quincho" aria-label="Buscar alquileres" maxLength={60}
          style={{ flex: 1, minWidth: 0, minHeight: 48, border: 0, outline: "none", font: "inherit", fontSize: "1rem", background: "transparent", color: "#0B1437" }} />
        {q && <button type="button" onClick={() => setQ("")} aria-label="Borrar búsqueda" style={{ width: 44, height: 44 }}><X size={16} color="#4A5372" /></button>}
      </div>

      <div className="flex gap-2 mt-3 overflow-x-auto pb-1" role="group" aria-label="Categoría">
        <Chip activo={!categoria} onClick={() => elegirCategoria("")}>Todos</Chip>
        {CATEGORIAS.map((c) => { const I = iconoCategoria(c.id); return <Chip key={c.id} activo={categoria === c.id} onClick={() => elegirCategoria(categoria === c.id ? "" : c.id)}><I size={15} aria-hidden="true" /> {c.corto}</Chip>; })}
      </div>

      {/* Filtros que se adaptan a la categoría: dormitorios y amoblado solo aparecen en viviendas */}
      {cat && (
        <div className="mt-3 bg-white" style={{ border: "1px solid #E3E7F1", borderRadius: 16, padding: 12 }}>
          <p className="text-sm font-bold mb-2" style={{ color: "#4A5372" }}>{cat.label}</p>
          <div className="flex flex-wrap gap-2">
            <Chip activo={!tipo} onClick={() => setTipo("")}>Todos</Chip>
            {cat.tipos.map((t) => <Chip key={t.id} activo={tipo === t.id} onClick={() => setTipo(tipo === t.id ? "" : t.id)}>{t.label}</Chip>)}
          </div>
          {categoria === "viviendas" && (
            <>
              <p className="text-sm font-bold mt-3 mb-2" style={{ color: "#4A5372" }}>Dormitorios (como mínimo)</p>
              <div className="flex flex-wrap gap-2">
                {[["", "Cualquiera"], ["0", "Monoambiente"], ["1", "1"], ["2", "2"], ["3", "3 o más"]].map(([v, t]) => <Chip key={v} activo={dorm === v} onClick={() => setDorm(v)}>{t}</Chip>)}
                <Chip activo={amoblado} onClick={() => setAmoblado((x) => !x)}>Amoblado</Chip>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        <Chip onClick={() => setHoja("zona")} activo={zona.alcance !== "todo"}><MapPin size={15} aria-hidden="true" /> {textoZona} <ChevronDown size={14} aria-hidden="true" /></Chip>
      </div>

      {sinConexion && <p role="status" className="text-sm mt-3 p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 }}>Sin conexión: te mostramos lo último que cargaste. Puede estar desactualizado.</p>}

      <div className="mt-4" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {estado === "cargando" && <EstadoCarga texto="Buscando alquileres..." filas={4} />}
        {estado === "error" && <EstadoError onReintentar={cargar} />}
        {estado === "ok" && items.length === 0 && (
          siguiente && filtrando ? <EstadoVacio icono={Search} titulo="No encontramos alquileres con esa búsqueda" mensaje="Probá con otra categoría o ampliá la zona de búsqueda." accion={{ texto: "Ampliar la búsqueda", onClick: () => cambiarZona({ ...zona, alcance: siguiente }) }} />
          : siguiente ? <EstadoVacio icono={Home} titulo="Todavía no hay alquileres en tu zona" mensaje="Probá ampliando la zona de búsqueda." accion={{ texto: "Ampliar la búsqueda", onClick: () => cambiarZona({ ...zona, alcance: siguiente }) }} />
          : <EstadoVacio icono={Home} titulo="Todavía no hay nadie en esta búsqueda" mensaje="¿Alquilás algo? Sé el primero en publicarlo." accion={{ texto: "Ofrecer en alquiler", onClick: onOfrecer }} />
        )}
        {estado === "ok" && items.length > 0 && (
          <>
            <p className="text-sm" style={{ color: "#4A5372" }} role="status">{total} {total === 1 ? "ficha" : "fichas"} · mantené apretada una para compartirla</p>
            {avisoCompartir && <p role="status" className="text-sm p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 }}>{avisoCompartir}</p>}
            {items.map((a) => (
              <TarjetaFicha key={a.id} titulo={a.nombre} zona={textoLocalidad(a.localidad)}
                datoClave={a.categoria === "viviendas" ? (resumenVivienda(a.vivienda) || nombresTipos(a)) : nombresTipos(a)}
                estado={a.disponibilidad || undefined} imagen={a.logo || a.fotos?.[0]} icono={iconoCategoria(a.categoria)} tono={TONO_CATEGORIA[a.categoria]} onAbrir={() => onAbrir(a.id)}
                esFavorito={favs.some((x) => x.tipo === "alquiler" && x.id === a.id)} onFavorito={() => alternarFavFicha("alquiler", a.id)}
                onCompartir={async () => setAvisoCompartir(avisoDeCompartir(await compartirFicha({ tipo: "alquiler", nombre: a.nombre, zona: textoLocalidad(a.localidad), detalle: a.desc, imagen: a.logo || a.fotos?.[0] })) || "")} />
            ))}
            {hayMas && <button type="button" onClick={verMas} disabled={masCargando} style={{ ...botonSecundario, minHeight: 50 }}>{masCargando ? "Cargando..." : "Ver más"}</button>}
          </>
        )}
      </div>

      {estado === "ok" && items.length > 0 && <button type="button" onClick={onOfrecer} className="w-full mt-5" style={{ ...botonSecundario, minHeight: 52 }}><Plus size={18} aria-hidden="true" /> Ofrecer en alquiler</button>}
      {hoja === "zona" && <HojaZona zona={zona} usuario={usuario} onCambiar={(z) => { cambiarZona(z); setHoja(null); }} onCerrar={() => setHoja(null)} />}
    </Pagina>
  );
}

// ---------- ficha pública ----------

const SI_NO = (v) => (v === true ? "Sí" : v === false ? "No" : "");
const COLOR_CATEGORIA = { viviendas: "#2350F5", eventos: "#7A4FD6", herramientas: "#E08A12", otros: "#13897F" };
const enlaceMapa = (a) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([a.direccion, a.zona, textoLocalidad(a.localidad)].filter(Boolean).join(", "))}`;

// Perfil de una ficha de alquiler: misma estructura que el perfil de un negocio (portada, tarjeta de identidad, números, contacto, pestañas).
export function DetalleAlquiler({ id, usuario, onVolver, onAbrirPerfil, onGestionar }) {
  const [a, setA] = useState(null);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | noExiste | error
  const [wa, setWa] = useState(false);
  const [esMia, setEsMia] = useState(false);
  const [aviso, setAviso] = useState("");
  const [den, setDen] = useState(false); // hoja de denuncia (Fase 8)
  const esFav = useEsFavFicha("alquiler", id);
  const cargar = useCallback(() => {
    setEstado("cargando");
    alquileresApi.ver(id).then((x) => { setA(x); setEstado("ok"); }).catch((e) => setEstado(e.status === 404 ? "noExiste" : "error"));
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);
  // Si quien mira es el dueño, se le ofrece gestionar los artículos sin editar todo el formulario
  useEffect(() => { if (usuario) alquileresApi.mios().then((l) => setEsMia(l.some((x) => x.id === id))).catch(() => {}); }, [id, usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (estado !== "ok") {
    return (
      <Pagina titulo="Alquiler" onVolver={onVolver}>
        {estado === "cargando" && <EstadoCarga texto="Cargando ficha..." />}
        {estado === "noExiste" && <EstadoVacio icono={Home} titulo="Esta ficha ya no está disponible" mensaje="Puede que la persona la haya pausado o eliminado." accion={{ texto: "Volver", onClick: onVolver }} />}
        {estado === "error" && <EstadoError onReintentar={cargar} />}
      </Pagina>
    );
  }
  const I = iconoCategoria(a.categoria);
  const color = COLOR_CATEGORIA[a.categoria] || "#2350F5";
  const dias = diasPasados(a.actualizadoEn);
  const actualizado = diasDesde(a.actualizadoEn);
  const vieja = dias !== null && dias > VIGENCIA_DIAS;
  const v = a.vivienda;
  const disponibles = a.articulos.filter((x) => x.estado === "disponible").length;
  const tieneVivienda = v && (v.dormitorios != null || v.banos != null || v.capacidad != null || v.amoblado != null || v.mascotas != null);
  const compartir = async () => setAviso(avisoDeCompartir(await compartirFicha({ tipo: "alquiler", nombre: a.nombre, zona: textoLocalidad(a.localidad), detalle: a.desc, imagen: a.logo || a.fotos?.[0] })) || "");
  const botonWhatsapp = a.conWhatsapp ? { icono: MessageCircle, label: "WhatsApp", color: "#25A06A", onClick: () => setWa(true) } : null;
  const comoLlegar = (a.direccion || a.localidad) ? { icono: Navigation, label: "Cómo llegar", color: "#2350F5", href: enlaceMapa(a) } : null;
  const redes = [
    a.ig && { icono: Instagram, label: "Instagram", color: "#C13584", href: urlRed(a.ig, "https://instagram.com/") },
    a.tiktok && { icono: Music2, label: "TikTok", color: "#111827", href: urlRed(a.tiktok, "https://www.tiktok.com/@") },
    a.facebook && { icono: Facebook, label: "Facebook", color: "#1877F2", href: urlRed(a.facebook, "https://facebook.com/") },
  ].filter(Boolean);

  const tabInfo = (
    <>
      <TarjetaInfo titulo="Qué alquila" icono={Tag}>
        <div className="flex flex-wrap gap-1.5 mb-3">{a.tipos.map((t) => <span key={t.id} className="text-xs px-2.5 py-1" style={{ background: "var(--azul-suave)", color: "#0B1437", borderRadius: 20 }}>{t.label}</span>)}</div>
        <p style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{a.desc}</p>
      </TarjetaInfo>
      {tieneVivienda && (
        <TarjetaInfo titulo="La vivienda o el espacio" icono={Home}>
          <FilaDato icono={Bed} etiqueta="Dormitorios" valor={v.dormitorios == null ? "" : v.dormitorios === 0 ? "Monoambiente" : String(v.dormitorios)} />
          <FilaDato icono={Bath} etiqueta="Baños" valor={v.banos == null ? "" : String(v.banos)} />
          <FilaDato icono={Users} etiqueta="Capacidad" valor={v.capacidad == null ? "" : `${v.capacidad} personas`} />
          <FilaDato icono={Home} etiqueta="Amoblado" valor={SI_NO(v.amoblado)} />
          <FilaDato icono={PawPrint} etiqueta="Acepta mascotas" valor={SI_NO(v.mascotas)} />
        </TarjetaInfo>
      )}
      {a.condiciones && <TarjetaInfo titulo="Condiciones, depósito o requisitos" icono={Info}><p style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{a.condiciones}</p></TarjetaInfo>}
      <a href={enlaceMapa(a)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm mb-5 w-fit hover:underline" style={{ color: "#0B1437", minHeight: 44 }}>
        <MapPin size={15} aria-hidden="true" /> {a.direccion || [a.zona, textoLocalidad(a.localidad)].filter(Boolean).join(" · ")} <span style={{ color: "#5B6482" }}>· ver en el mapa</span>
      </a>
      {hayHorarios(a.weekHours) && <TarjetaInfo titulo="Horarios de atención" icono={Clock}><TablaHorarios weekHours={a.weekHours} /></TarjetaInfo>}
      <p className="text-sm px-1" style={{ color: vieja ? "#8A5B12" : "#4A5372", lineHeight: 1.5, fontWeight: vieja ? 600 : 400 }}>
        <Clock size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} aria-hidden="true" />
        {actualizado ? `Ficha actualizada ${actualizado}.` : ""}{vieja ? " Hace tiempo que no se actualiza: confirmá la disponibilidad antes de ir." : ""}
      </p>
    </>
  );
  const tabArticulos = (
    <>
      {a.articulos.length === 0 ? <p className="text-sm" style={{ color: "#5B6482" }}>Todavía no hay artículos publicados.</p> : (
        <div className="flex flex-col gap-3">
          {a.articulos.map((x) => (
            <div key={x.id} className="bg-white flex items-center gap-3 p-3" style={{ borderRadius: 18, border: "1px solid #E3E7F1", boxShadow: "0 4px 14px rgba(11,20,55,0.05)" }}>
              {x.foto ? <img src={x.foto} alt="" loading="lazy" style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: 64, height: 64, borderRadius: 14, background: "#EEF1F8", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Package size={24} color="#8D95B0" aria-hidden="true" /></span>}
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: "#0B1437", overflowWrap: "anywhere" }}>{x.nombre}</span>
                <span className="block text-sm mt-0.5" style={{ color: "#4A5372" }}>{textoPrecio(x)}</span>
              </span>
              <ChipEstado estado={x.estado} compacto />
            </div>
          ))}
        </div>
      )}
      <p className="text-xs mt-4 px-1" style={{ color: "#5B6482", lineHeight: 1.45 }}>«Sin confirmar» significa que hace más de {VIGENCIA_DIAS} días que el dueño no confirma si lo tiene libre: consultale antes de contar con eso. Los precios son una referencia.</p>
    </>
  );
  const tabFotos = a.fotos.length > 0
    ? <Fotos fotos={a.fotos} alt="Foto de lo que se alquila" />
    : <p className="flex items-center gap-1.5 text-sm" style={{ color: "#5B6482" }}><ImageIcon size={15} aria-hidden="true" /> Esta ficha todavía no cargó fotos</p>;

  return (
    <>
      <PerfilFicha
        portada={a.fotos?.[0]} logo={a.logo} icono={I} color={color} nombre={a.nombre}
        linea={`${ETIQUETA_CATEGORIA[a.categoria]} · ${[a.zona, textoLocalidad(a.localidad)].filter(Boolean)[0] || nombresTipos(a, 2)}`}
        chipEstado={a.disponibilidad ? <ChipEstado estado={a.disponibilidad} compacto /> : undefined}
        dueno={a.dueno} onAbrirDueno={onAbrirPerfil} onVolver={onVolver}
        flotantes={[
          { icono: Share2, etiqueta: "Compartir", onClick: compartir },
          ...(esMia ? [] : [accionDenunciar(() => setDen(true))]),
          { icono: Heart, etiqueta: esFav ? "Quitar de favoritos" : "Guardar en favoritos", activo: esFav, onClick: () => alternarFavFicha("alquiler", id) },
        ]}
        stats={[
          { icono: Package, color: "#2350F5", valor: a.articulos.length, etiqueta: a.articulos.length === 1 ? "artículo" : "artículos" },
          { icono: Check, color: "#2C9A5F", valor: disponibles, etiqueta: disponibles === 1 ? "disponible" : "disponibles" },
          { icono: Clock, color: "#E08A12", valor: dias === null ? "—" : dias < 1 ? "Hoy" : `${dias} d`, etiqueta: "actualizada" },
        ]}
        acciones={[botonWhatsapp, comoLlegar].filter(Boolean)}
        redes={redes}
        avisos={(
          <>
            {aviso && <p role="status" className="text-sm p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 }}>{aviso}</p>}
            {esMia && (
              <div className="flex items-center gap-3 p-3" style={{ borderRadius: 16, background: "#EDF1FF", border: "1px solid #C9D6FA" }}>
                <Info size={18} color="#1B3FB8" aria-hidden="true" />
                <p className="flex-1 text-sm" style={{ color: "#1B3FB8", lineHeight: 1.4 }}>Es tu ficha. Podés cambiar el estado de tus artículos sin editar todo el formulario.</p>
                {onGestionar && <button type="button" onClick={onGestionar} style={{ ...botonSecundario, minHeight: 44 }}>Gestionar</button>}
              </div>
            )}
            {/* Aviso antiestafa: siempre visible; en viviendas, destacado */}
            <div className="flex items-start gap-3 p-3.5" style={{ borderRadius: 16, background: "#FFF3D6", border: "1px solid #F0D79B" }} role="note">
              <ShieldAlert size={20} color="#8A5B12" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <p className="text-sm" style={{ color: "#6B4510", lineHeight: 1.5 }}><b>No pagues por adelantado sin ver el lugar o a la persona.</b> {a.categoria === "viviendas" ? "Visitá la vivienda antes de entregar dinero y pedí un comprobante." : "Retirá o recibí lo que alquilás en persona y pedí un comprobante."} Mi Zona no maneja pagos ni reservas: el acuerdo es entre ustedes.</p>
            </div>
          </>
        )}
        tabs={[
          { id: "info", label: "Información", contenido: tabInfo },
          { id: "articulos", label: `Artículos${a.articulos.length ? ` (${a.articulos.length})` : ""}`, contenido: tabArticulos },
          { id: "fotos", label: "Fotos", contenido: tabFotos },
        ]}
        cta={a.conWhatsapp ? (
          <button type="button" onClick={() => setWa(true)} className="flex items-center justify-center gap-2 text-sm font-semibold py-3.5 w-full" style={{ background: "linear-gradient(135deg,var(--azul),var(--azul-medio))", color: "#fff", borderRadius: 14, boxShadow: "0 8px 20px rgba(var(--azul-rgb),.35)", minHeight: 50 }}>
            <MessageCircle size={17} aria-hidden="true" /> Consultar por WhatsApp
          </button>
        ) : undefined}
      />
      {wa && <HojaWhatsapp id={a.id} nombre={a.nombre} rubro="" contactar={alquileresApi.contacto} mensajeInicial={`Hola, te encontré en Mi Zona. Quería consultar por tu alquiler «${a.nombre}»: ¿está disponible?`} onCerrar={() => setWa(false)} />}
      {den && <HojaDenunciar tipo="alquiler" id={a.id} nombre={a.nombre} onCerrar={() => setDen(false)} onBloqueado={onVolver} />}
    </>
  );
}

// ---------- artículos ----------

// Hoja para agregar o editar un artículo. onGuardar(datos) puede ser async y lanzar un error (se muestra acá).
export function HojaArticulo({ inicial, onGuardar, onCerrar }) {
  const [f, setF] = useState(() => ({ nombre: inicial?.nombre || "", precioUnidad: inicial?.precioUnidad || "dia", precioValor: inicial?.precioValor != null ? String(inicial.precioValor) : "", foto: inicial?.foto || "" }));
  const [estado, setEstado] = useState(null); // null | "guardando" | "subiendo" | { error }
  const archivo = useRef(null);
  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setEstado(null); };
  const consultar = f.precioUnidad === "consultar";
  const precioOk = consultar || (/^\d{1,8}$/.test(f.precioValor.trim()) && Number(f.precioValor) >= 1);
  const listo = f.nombre.trim().length >= 2 && precioOk && estado !== "guardando" && estado !== "subiendo";

  const subir = async (lista) => {
    const a = lista[0]; if (!a) return;
    if (!/^image\//.test(a.type) || a.size > 15 * 1024 * 1024) { setEstado({ error: "Elegí una imagen de hasta 15 MB." }); return; }
    setEstado("subiendo");
    try { set("foto", await uploadImage(await comprimirFoto(a))); } catch { setEstado({ error: "No pudimos subir la foto. Probá de nuevo en un rato." }); }
  };
  const guardar = async () => {
    setEstado("guardando");
    try { await onGuardar({ nombre: f.nombre.trim(), foto: f.foto, precioUnidad: f.precioUnidad, precioValor: consultar ? null : Number(f.precioValor) }); }
    catch (e) { setEstado({ error: e.message || "No se pudo guardar. Probá de nuevo." }); }
  };
  return (
    <Hoja titulo={inicial ? "Editar artículo" : "Agregar artículo"} onCerrar={() => estado !== "guardando" && onCerrar()}>
      <Campo id="art-nombre" etiqueta="Qué es" ayuda="Por ejemplo: «Mesa rectangular», «Pelotero chico» o «Departamento 2 ambientes».">
        <input id="art-nombre" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={60} style={caja} autoFocus />
      </Campo>
      <p className="text-sm font-bold mb-1.5" style={{ color: "#0B1437" }}>Precio</p>
      <div className="flex flex-wrap gap-2 mb-3">{UNIDADES.map(([k, t]) => <Chip key={k} activo={f.precioUnidad === k} onClick={() => set("precioUnidad", k)}>{t}</Chip>)}</div>
      {!consultar && (
        <Campo id="art-precio" etiqueta="Monto en pesos" ayuda="Solo números, sin puntos ni símbolos. Es una referencia: el precio final lo acuerdan ustedes.">
          <input id="art-precio" value={f.precioValor} onChange={(e) => set("precioValor", e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder="Ej: 15000" style={caja} />
        </Campo>
      )}
      <p className="text-sm font-bold mb-1.5" style={{ color: "#0B1437" }}>Foto (opcional)</p>
      <div className="flex items-center gap-3 mb-2">
        {f.foto ? <img src={f.foto} alt="Foto del artículo" style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover" }} /> : <span style={{ width: 64, height: 64, borderRadius: 14, background: "#EEF1F8", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={26} color="#8D95B0" aria-hidden="true" /></span>}
        <button type="button" onClick={() => archivo.current?.click()} disabled={estado === "subiendo"} style={botonSecundario}>{estado === "subiendo" ? "Subiendo..." : f.foto ? "Cambiar" : "Subir foto"}</button>
        {f.foto && estado !== "subiendo" && <button type="button" onClick={() => set("foto", "")} style={{ ...botonSecundario, border: 0, background: "transparent", color: "#9A3B34" }}>Quitar</button>}
        <input ref={archivo} type="file" accept="image/*" hidden onChange={(e) => { subir([...e.target.files]); e.target.value = ""; }} />
      </div>
      {estado?.error && <p role="alert" className="text-sm mt-2" style={{ color: "#9A3B34" }}>{estado.error}</p>}
      <div className="flex gap-2 mt-4">
        <button type="button" onClick={onCerrar} disabled={estado === "guardando"} style={{ ...botonSecundario, flex: "1 1 120px" }}>Cancelar</button>
        <button type="button" onClick={guardar} disabled={!listo} style={{ ...botonPrincipal, flex: "2 1 160px", opacity: listo ? 1 : 0.5 }}>{estado === "guardando" ? "Guardando..." : "Guardar"}</button>
      </div>
    </Hoja>
  );
}

const ESTADOS_TOQUE = [["disponible", "Disponible"], ["ocupado", "Ocupado"], ["retirado", "Ya no lo tengo"]];

// Lista de artículos de MI ficha, con el estado de un toque. onCambio(fichaActualizada) devuelve la ficha completa tras cada cambio.
export function GestorArticulos({ alquiler, onCambio }) {
  const [hoja, setHoja] = useState(null); // { inicial } | null
  const [dialogo, setDialogo] = useState(null); // { articulo }
  const [trabajando, setTrabajando] = useState(null); // id del artículo en curso, o "ficha"
  const [error, setError] = useState(null);
  const correr = async (clave, accion) => { setTrabajando(clave); setError(null); try { onCambio(await accion()); } catch (e) { setError(e.message || "No se pudo guardar. Probá de nuevo."); } setTrabajando(null); };
  const hayViejos = alquiler.articulos.some((x) => x.estadoGuardado === "disponible" && x.estado === "sinConfirmar");
  return (
    <div className="w-full">
      {error && <p role="alert" className="text-sm mb-2" style={{ color: "#9A3B34" }}>{error}</p>}
      {hayViejos && (
        <div className="flex items-center gap-3 p-3 mb-3" style={{ borderRadius: 14, background: "#FFF3D6", border: "1px solid #F0D79B" }}>
          <p className="flex-1 text-sm" style={{ color: "#6B4510", lineHeight: 1.4 }}>Hace más de {VIGENCIA_DIAS} días que no confirmás tus artículos: figuran como «Sin confirmar».</p>
          <button type="button" disabled={trabajando === "ficha"} onClick={() => correr("ficha", () => alquileresApi.confirmar(alquiler.id))} style={{ ...botonSecundario, minHeight: 44 }}><RefreshCw size={15} aria-hidden="true" /> Todo sigue igual</button>
        </div>
      )}
      {alquiler.articulos.length === 0 && <p className="text-sm mb-2" style={{ color: "#4A5372" }}>Todavía no cargaste artículos.</p>}
      <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {alquiler.articulos.map((x) => (
          <li key={x.id} style={{ border: "1px solid #E3E7F1", borderRadius: 16, padding: 12, background: x.estadoGuardado === "retirado" ? "#F7F8FB" : "#fff", opacity: trabajando === x.id ? 0.6 : 1 }}>
            <div className="flex items-center gap-3">
              {x.foto ? <img src={x.foto} alt="" loading="lazy" style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: 48, height: 48, borderRadius: 12, background: "#EEF1F8", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Package size={20} color="#8D95B0" aria-hidden="true" /></span>}
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontWeight: 700, color: "#0B1437", overflowWrap: "anywhere" }}>{x.nombre}</span>
                <span className="block text-sm" style={{ color: "#4A5372" }}>{textoPrecio(x)}</span>
              </span>
              <button type="button" aria-label={`Editar ${x.nombre}`} onClick={() => setHoja({ inicial: x })} style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Pencil size={17} color="#4A5372" /></button>
              <button type="button" aria-label={`Quitar ${x.nombre}`} onClick={() => setDialogo({ articulo: x })} style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={17} color="#9A3B34" /></button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2.5" role="group" aria-label={`Estado de ${x.nombre}`}>
              {ESTADOS_TOQUE.map(([k, t]) => <Chip key={k} activo={x.estadoGuardado === k} onClick={() => trabajando === null && x.estadoGuardado !== k && correr(x.id, () => alquileresApi.estadoArticulo(alquiler.id, x.id, k))}>{t}</Chip>)}
            </div>
            {x.estadoGuardado === "retirado" && <p className="text-xs mt-1.5" style={{ color: "#4A5372" }}>No se muestra al público. Podés volver a marcarlo como disponible.</p>}
          </li>
        ))}
      </ul>
      {alquiler.articulos.length < MAX_ARTICULOS && <button type="button" onClick={() => setHoja({ inicial: null })} className="w-full mt-3" style={{ ...botonSecundario, minHeight: 50 }}><Plus size={17} aria-hidden="true" /> Agregar artículo</button>}
      {hoja && <HojaArticulo inicial={hoja.inicial} onCerrar={() => setHoja(null)} onGuardar={async (datos) => { const f = hoja.inicial ? await alquileresApi.editarArticulo(alquiler.id, hoja.inicial.id, datos) : await alquileresApi.agregarArticulo(alquiler.id, datos); onCambio(f); setHoja(null); }} />}
      {dialogo && (
        <DialogoAdvertencia titulo={`¿Quitar «${dialogo.articulo.nombre}»?`} queHace="Borra este artículo de tu ficha para siempre." paraQue="Sirve si ya no lo alquilás."
          queSucedera="Deja de aparecer en tu ficha y no se puede deshacer. Si solo no lo tenés por un tiempo, mejor marcalo como «Ocupado» o «Ya no lo tengo»." textoAceptar="Sí, quitar" peligro cargando={trabajando === dialogo.articulo.id}
          onAceptar={async () => { const x = dialogo.articulo; await correr(x.id, () => alquileresApi.quitarArticulo(alquiler.id, x.id)); setDialogo(null); }} onCancelar={() => !trabajando && setDialogo(null)} />
      )}
    </div>
  );
}

// ---------- formulario ----------

const INICIAL = { nombre: "", categoria: "", tipos: [], desc: "", zona: "", direccion: "", whatsapp: "", mostrarWhatsapp: false, ig: "", facebook: "", tiktok: "", logo: "", fotos: [], weekHours: [], condiciones: "", vivienda: { dormitorios: "", banos: "", capacidad: "", amoblado: null, mascotas: null } };
const aTexto = (n) => (n === null || n === undefined ? "" : String(n));
const aNumero = (t) => (String(t).trim() === "" ? null : Number(t));
const Tri = ({ valor, onChange, etiqueta }) => (
  <div className="mb-3">
    <p className="text-sm font-bold mb-1.5" style={{ color: "#0B1437" }}>{etiqueta}</p>
    <div className="flex gap-2">{[[true, "Sí"], [false, "No"], [null, "No aclaro"]].map(([v, t]) => <Chip key={String(v)} activo={valor === v} onClick={() => onChange(v)}>{t}</Chip>)}</div>
  </div>
);

export function FormularioAlquiler({ inicial, usuario, onGuardado, onCancelar }) {
  const editando = !!inicial;
  const [f, setF] = useState(() => (inicial
    ? { ...INICIAL, ...inicial, tipos: inicial.tipos.map((t) => t.id), weekHours: hayHorarios(inicial.weekHours) ? inicial.weekHours : semanaVacia(), vivienda: { dormitorios: aTexto(inicial.vivienda?.dormitorios), banos: aTexto(inicial.vivienda?.banos), capacidad: aTexto(inicial.vivienda?.capacidad), amoblado: inicial.vivienda?.amoblado ?? null, mascotas: inicial.vivienda?.mascotas ?? null } }
    : { ...INICIAL, nombre: "", weekHours: semanaVacia() }));
  const [loc, setLoc] = useState(inicial?.localidadCompleta || usuario?.localidad || null);
  const [articulos, setArticulos] = useState([]); // solo al crear; después se gestionan desde "Mis fichas"
  const [hojaArt, setHojaArt] = useState(null); // { indice } (-1 = nuevo)
  const [dialogo, setDialogo] = useState(null); // "whatsapp" | "direccion" | "activar"
  const [estado, setEstado] = useState(null);
  const direccionAceptada = useRef(!!inicial?.direccion);
  const { subiendo, subir } = useSubidas({ max: MAX_FOTOS, onError: (m) => setEstado(m ? { error: m } : null) });
  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setEstado(null); };
  const setViv = (k, v) => { setF((p) => ({ ...p, vivienda: { ...p.vivienda, [k]: v } })); setEstado(null); };
  const cat = CATEGORIAS.find((c) => c.id === f.categoria);
  const elegirCategoria = (id) => setF((p) => (p.categoria === id ? p : { ...p, categoria: id, tipos: [] })); // al cambiar de categoría los tipos ya no valen
  const alternarTipo = (id) => setF((p) => { const t = p.tipos.includes(id); if (!t && p.tipos.length >= 6) return p; return { ...p, tipos: t ? p.tipos.filter((x) => x !== id) : [...p.tipos, id] }; });
  const conHorarios = hayHorarios(f.weekHours);
  const ayudaSubir = { fotos: f.fotos, setFotos: (v) => setF((p) => ({ ...p, fotos: v })), setLogo: (v) => set("logo", v) };

  const pasos = [
    { ok: f.nombre.trim().length >= 2, texto: "Nombre de la ficha", requerido: true },
    { ok: !!f.categoria && f.tipos.length > 0, texto: "Categoría y qué alquilás", requerido: true },
    { ok: f.desc.trim().length >= 10, texto: "Descripción", requerido: true },
    { ok: !!loc, texto: "Tu localidad", requerido: true },
    { ok: !f.mostrarWhatsapp || f.whatsapp.replace(/\D/g, "").length >= 8, texto: "Número de WhatsApp", requerido: true },
    ...(!editando ? [{ ok: articulos.length > 0, texto: "Al menos un artículo", requerido: true }] : []),
    { ok: conHorarios, texto: "Horarios de atención" },
    { ok: !!f.logo, texto: "Logo" },
    { ok: f.fotos.length > 0, texto: "Fotos" },
  ];
  const faltan = pasos.filter((p) => p.requerido && !p.ok).map((p) => p.texto.toLowerCase());
  const listo = faltan.length === 0 && !subiendo && estado !== "guardando";

  const guardar = async () => {
    setEstado("guardando"); setDialogo(null);
    const esViv = f.categoria === "viviendas";
    const datos = {
      ...f, localidad: loc, whatsapp: f.mostrarWhatsapp || f.whatsapp ? f.whatsapp : "", weekHours: conHorarios ? f.weekHours : [],
      vivienda: esViv ? { dormitorios: aNumero(f.vivienda.dormitorios), banos: aNumero(f.vivienda.banos), capacidad: aNumero(f.vivienda.capacidad), amoblado: f.vivienda.amoblado, mascotas: f.vivienda.mascotas } : undefined,
    };
    try {
      const a = editando ? await alquileresApi.editar(inicial.id, datos) : await alquileresApi.crear({ ...datos, articulos });
      onGuardado(a, !editando);
    } catch (e) { setEstado({ error: e.message || "No se pudo guardar. Probá de nuevo." }); }
  };
  const alTocarGuardar = () => (editando ? guardar() : setDialogo("activar"));
  const textosActivar = {
    titulo: "¿Activar tu ficha de alquiler?",
    queHace: "Publica tu ficha y sus artículos en Mi Zona con los datos que cargaste.",
    paraQue: "Sirve para que vecinos que buscan lo que alquilás te encuentren y te consulten.",
    queSucedera: `Tu ficha va a ser pública: cualquier persona podrá verla${f.mostrarWhatsapp ? " y consultarte por WhatsApp (quien toque el botón verá tu número)" : ""}.${f.direccion.trim() ? " Tu dirección también será pública." : ""} Mi Zona no maneja pagos ni reservas, y le avisa a quien mira que no pague por adelantado sin ver el lugar o a la persona. La podés editar, pausar o eliminar cuando quieras desde Mis fichas.`,
  };

  return (
    <Pagina titulo={editando ? "Editar mi ficha" : "Ofrecer en alquiler"} onVolver={onCancelar}
      pie={
        <div style={{ flex: 1 }}>
          {estado?.error && <p role="alert" className="text-sm mb-2" style={{ color: "#9A3B34" }}>{estado.error}</p>}
          {!listo && faltan.length > 0 && <p className="text-sm mb-2" style={{ color: "#4A5372" }}>Falta: {faltan.join(", ")}.</p>}
          <button type="button" onClick={alTocarGuardar} disabled={!listo} style={{ ...botonPrincipal, width: "100%", opacity: listo ? 1 : 0.5 }}>{estado === "guardando" ? "Guardando..." : editando ? "Guardar cambios" : "Activar mi ficha"}</button>
        </div>
      }>
      <Avance pasos={pasos} titulo="Tu ficha" />
      {!editando && <ComoFunciona pasos={["Elegí qué alquilás y contá cómo trabajás.", "Cargá tus artículos (nombre, precio y foto si querés).", "Activá tu ficha: desde ese momento los vecinos la pueden encontrar.", "Después cambiás el estado de cada artículo con un toque desde Mis fichas."]} />}
      <div className="mt-3" />

      <Seccion icono={User} titulo="Presentación" subtitulo="El nombre y el logo de tu ficha.">
        <SelectorLogo valor={f.logo} subiendo={subiendo === "logo"} onArchivo={(a) => subir(a, "logo", ayudaSubir)} onQuitar={() => set("logo", "")} />
        <div className="mt-4" />
        <Campo id="al-nombre" etiqueta="Nombre de la ficha" ayuda="Por ejemplo: «Alquiler de sillas Lucía» o «Cabañas del Valle». No es tu usuario ni tu perfil.">
          <input id="al-nombre" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={60} style={caja} />
        </Campo>
      </Seccion>

      <Seccion icono={Package} titulo="Qué alquilás" subtitulo="Elegí la categoría y hasta 6 tipos.">
        <div role="radiogroup" aria-label="Categoría" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8, marginBottom: 14 }}>
          {CATEGORIAS.map((c) => { const I = iconoCategoria(c.id); const act = f.categoria === c.id; return (
            <button key={c.id} type="button" role="radio" aria-checked={act} onClick={() => elegirCategoria(c.id)} style={{ minHeight: 76, borderRadius: 16, border: `2px solid ${act ? "#2350F5" : "#E3E7F1"}`, background: act ? "#EDF1FF" : "#fff", padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: act ? "#1B3FB8" : "#0B1437" }}>
              <I size={24} aria-hidden="true" /><span style={{ fontWeight: 700, fontSize: "0.875rem", lineHeight: 1.2, textAlign: "center" }}>{c.label}</span>
            </button>); })}
        </div>
        {cat && (
          <>
            <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Tipos ({f.tipos.length} de 6)</p>
            <div className="flex flex-wrap gap-2 mb-4">{cat.tipos.map((t) => <Chip key={t.id} activo={f.tipos.includes(t.id)} onClick={() => alternarTipo(t.id)}>{t.label}</Chip>)}</div>
          </>
        )}
        <Campo id="al-desc" etiqueta="Descripción breve" contador={`${f.desc.length}/400`}>
          <textarea id="al-desc" value={f.desc} onChange={(e) => set("desc", e.target.value)} rows={4} maxLength={400} placeholder="Contá en pocas palabras qué alquilás y cómo trabajás" style={{ ...caja, resize: "none", lineHeight: 1.5 }} />
        </Campo>
        <Campo id="al-cond" etiqueta="Condiciones, depósito o requisitos (opcional)" contador={`${f.condiciones.length}/400`} ayuda="Por ejemplo: depósito reembolsable, mínimo de horas, documentación, cómo se retira.">
          <textarea id="al-cond" value={f.condiciones} onChange={(e) => set("condiciones", e.target.value)} rows={3} maxLength={400} style={{ ...caja, resize: "none", lineHeight: 1.5 }} />
        </Campo>
      </Seccion>

      {/* Solo en viviendas y espacios: en los demás alquileres estos datos no existen */}
      {f.categoria === "viviendas" && (
        <Seccion icono={Bed} titulo="La vivienda o el espacio" subtitulo="Datos que se ven en la tarjeta." opcional>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
            <Campo id="al-dorm" etiqueta="Dormitorios"><input id="al-dorm" value={f.vivienda.dormitorios} onChange={(e) => setViv("dormitorios", e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="0 = mono" style={caja} /></Campo>
            <Campo id="al-banos" etiqueta="Baños"><input id="al-banos" value={f.vivienda.banos} onChange={(e) => setViv("banos", e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" style={caja} /></Campo>
            <Campo id="al-cap" etiqueta="Personas"><input id="al-cap" value={f.vivienda.capacidad} onChange={(e) => setViv("capacidad", e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="Salones" style={caja} /></Campo>
          </div>
          <Tri etiqueta="¿Amoblado?" valor={f.vivienda.amoblado} onChange={(v) => setViv("amoblado", v)} />
          <Tri etiqueta="¿Acepta mascotas?" valor={f.vivienda.mascotas} onChange={(v) => setViv("mascotas", v)} />
        </Seccion>
      )}

      {!editando ? (
        <Seccion icono={Tag} titulo="Artículos" subtitulo={`Lo que alquilás, con precio y foto. ${articulos.length} de ${MAX_ARTICULOS}.`}>
          {f.categoria === "viviendas" && <p className="text-sm mb-3" style={{ color: "#4A5372", lineHeight: 1.45 }}>Si es una sola vivienda, cargala como un artículo.</p>}
          <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {articulos.map((x, i) => (
              <li key={i} className="flex items-center gap-3" style={{ border: "1px solid #E3E7F1", borderRadius: 14, padding: 10 }}>
                {x.foto ? <img src={x.foto} alt="" loading="lazy" decoding="async" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} /> : <span style={{ width: 44, height: 44, borderRadius: 10, background: "#EEF1F8", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Package size={18} color="#8D95B0" aria-hidden="true" /></span>}
                <span className="flex-1 min-w-0"><span className="block" style={{ fontWeight: 700, color: "#0B1437", overflowWrap: "anywhere" }}>{x.nombre}</span><span className="block text-sm" style={{ color: "#4A5372" }}>{textoPrecio(x)}</span></span>
                <button type="button" aria-label={`Editar ${x.nombre}`} onClick={() => setHojaArt({ indice: i })} style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Pencil size={17} color="#4A5372" /></button>
                <button type="button" aria-label={`Quitar ${x.nombre}`} onClick={() => setArticulos((l) => l.filter((_, j) => j !== i))} style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={17} color="#9A3B34" /></button>
              </li>
            ))}
          </ul>
          {articulos.length < MAX_ARTICULOS && <button type="button" onClick={() => setHojaArt({ indice: -1 })} className="w-full mt-3" style={{ ...botonSecundario, minHeight: 50, borderStyle: "dashed" }}><Plus size={17} aria-hidden="true" /> Agregar artículo</button>}
        </Seccion>
      ) : (
        <p className="text-sm px-1 mb-3" style={{ color: "#4A5372", lineHeight: 1.5 }}>Los artículos y su estado se cambian desde <b>Negocio</b>, sin tener que editar todo el formulario.</p>
      )}

      <Seccion icono={MapPin} titulo="Dónde está" subtitulo="Te encuentran los vecinos de tu zona desde Inicio.">
        <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Localidad</p>
        <SelectorLocalidad valor={loc} onChange={(l) => { setLoc(l); setEstado(null); }} />
        <div className="mt-4" />
        <Campo id="al-zona" etiqueta="Zona o barrio" ayuda="Por ejemplo: «Barrio Centro». Mejor indicar solo la zona."><input id="al-zona" value={f.zona} onChange={(e) => set("zona", e.target.value)} maxLength={80} style={caja} /></Campo>
        <Campo id="al-dir" etiqueta="Dirección" ayuda="Si la completás, será pública. Te recomendamos indicar solo la zona.">
          <input id="al-dir" value={f.direccion} onChange={(e) => set("direccion", e.target.value)} maxLength={120} autoComplete="off" onBlur={() => { if (f.direccion.trim() && !direccionAceptada.current) setDialogo("direccion"); }} style={caja} />
        </Campo>
      </Seccion>

      <Seccion icono={Clock} titulo="Horarios de atención" subtitulo="Cuándo pueden ver, consultar o retirar." opcional>
        <EditorHorarios value={f.weekHours} onChange={(v) => set("weekHours", v)} />
      </Seccion>

      <Seccion icono={MessageCircle} titulo="Cómo te consultan" subtitulo="WhatsApp y redes.">
        <Interruptor activo={f.mostrarWhatsapp} onChange={() => (f.mostrarWhatsapp ? set("mostrarWhatsapp", false) : setDialogo("whatsapp"))} titulo="Mostrar botón de WhatsApp" desc="Si lo activás, quien toque el botón verá tu número." />
        {f.mostrarWhatsapp && <div className="mt-3"><Campo id="al-wa" etiqueta="Tu número de WhatsApp" ayuda="Con código de área, sin 0 ni 15. Ej: 381 555 1234."><EntradaIcono id="al-wa" icono={MessageCircle} value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} /></Campo></div>}
        <div style={{ borderTop: "1px solid #EEF1F8", marginTop: 12, paddingTop: 14 }}>
          <Campo id="al-ig" etiqueta="Instagram"><EntradaIcono id="al-ig" icono={Instagram} value={f.ig} onChange={(e) => set("ig", e.target.value)} maxLength={300} placeholder="usuario o enlace" /></Campo>
          <Campo id="al-fb" etiqueta="Facebook"><EntradaIcono id="al-fb" icono={Facebook} value={f.facebook} onChange={(e) => set("facebook", e.target.value)} maxLength={300} placeholder="usuario o enlace" /></Campo>
          <Campo id="al-tt" etiqueta="TikTok"><EntradaIcono id="al-tt" icono={Music2} value={f.tiktok} onChange={(e) => set("tiktok", e.target.value)} maxLength={300} placeholder="usuario o enlace" /></Campo>
        </div>
      </Seccion>

      <Seccion icono={ImageIcon} titulo="Fotos" subtitulo="Mostrá lo que alquilás: las fichas con fotos reciben más consultas." opcional>
        <GaleriaFotos fotos={f.fotos} max={MAX_FOTOS} subiendo={subiendo === "fotos"} onArchivos={(a) => subir(a, "fotos", ayudaSubir)} onQuitar={(u) => setF((p) => ({ ...p, fotos: p.fotos.filter((x) => x !== u) }))} ayuda="La primera es la portada. Subí solo fotos de lo que alquilás; evitá personas o datos privados." />
      </Seccion>

      {hojaArt && (
        <HojaArticulo inicial={hojaArt.indice >= 0 ? articulos[hojaArt.indice] : null} onCerrar={() => setHojaArt(null)}
          onGuardar={async (datos) => { setArticulos((l) => (hojaArt.indice >= 0 ? l.map((x, i) => (i === hojaArt.indice ? datos : x)) : [...l, datos])); setHojaArt(null); setEstado(null); }} />
      )}
      {dialogo === "whatsapp" && (
        <DialogoAdvertencia titulo="¿Mostrar tu WhatsApp?" queHace="Agrega a tu ficha un botón «Consultar por WhatsApp»." paraQue="Sirve para que los vecinos te escriban directo."
          queSucedera="Quien toque el botón verá tu número y podrá escribirte. Ese número no se puede esconder de quien toca el botón. Podés apagarlo cuando quieras." textoAceptar="Sí, mostrarlo"
          onAceptar={() => { set("mostrarWhatsapp", true); setDialogo(null); }} onCancelar={() => setDialogo(null)} />
      )}
      {dialogo === "direccion" && (
        <DialogoAdvertencia titulo="Tu dirección será pública" queHace="Muestra la dirección que escribiste en tu ficha." paraQue="Sirve si atendés en un local o si querés que vean dónde queda."
          queSucedera="Cualquier persona podrá verla. Si alquilás desde tu casa, te recomendamos dejarla vacía e indicar solo la zona." textoAceptar="Dejarla pública" textoCancelar="Quitarla"
          onAceptar={() => { direccionAceptada.current = true; setDialogo(null); }} onCancelar={() => { set("direccion", ""); setDialogo(null); }} />
      )}
      {dialogo === "activar" && <DialogoAdvertencia {...textosActivar} textoAceptar="Sí, activar" cargando={estado === "guardando"} onAceptar={guardar} onCancelar={() => setDialogo(null)} />}
    </Pagina>
  );
}

// ---------- paso final al activar ----------

// Fase 6: el paso de "compartir Mi Zona" (PasoCompartir) va dentro de esta pantalla.
// ENGANCHE Fase 9: acá se muestra cuándo termina el mes gratis. Por ahora solo confirma que la ficha está activa.
export function PasoAlquilerActivado({ alquiler, onVerFicha, onListo }) {
  return (
    <Pagina titulo="Tu ficha está activa" onVolver={onListo}>
      <EstadoExito titulo="¡Listo! Tu ficha ya es pública" mensaje={`${alquiler.nombre} ya aparece en Alquileres con ${alquiler.cantidadArticulos} ${alquiler.cantidadArticulos === 1 ? "artículo" : "artículos"}. Cuando alquilés algo, marcalo como «Ocupado» con un toque desde Mis fichas, para no prometer lo que ya no tenés.`} />
      <PasoCompartir tipo="alquiler" ficha={{ id: alquiler.id, nombre: alquiler.nombre }} onSalir={onListo} />
      <button type="button" onClick={onVerFicha} className="w-full mt-3" style={botonSecundario}>Ver cómo la ven los demás</button>
    </Pagina>
  );
}
