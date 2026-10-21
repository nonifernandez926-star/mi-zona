import { useCallback, useEffect, useRef, useState } from "react";
import { Share2, Heart, MapPin, MessageCircle, Search, Plus, X, Pencil, Trash2, Check, Clock, Instagram, Facebook, Music2, User, ChevronDown, ChevronRight, ImageIcon, Info, ShieldAlert, Home, PartyPopper, Hammer, Package, Bed, Bath, Users, PawPrint, Tag, RefreshCw } from "lucide-react";
import { alquileresApi } from "./api.js";
import { textoLocalidad } from "./localidades.js";
import { CATEGORIAS, ETIQUETA_CATEGORIA, ETIQUETA_TIPO, UNIDADES, MAX_ARTICULOS, MAX_FOTOS, VIGENCIA_DIAS, textoPrecio, resumenVivienda } from "./alquileres.js";
import SelectorLocalidad from "./selectorLocalidad.jsx";
import TarjetaFicha from "./componentes/TarjetaFicha.jsx";
import DetalleFicha, { SeccionDetalle, FilaDato } from "./componentes/DetalleFicha.jsx";
import { HojaDenunciar, accionDenunciar } from "./denuncias.jsx";
import PasoCompartir from "./componentes/PasoCompartir.jsx";
import { compartirFicha, avisoDeCompartir } from "./compartir.js";
import { alternarFavFicha, useEsFavFicha, useFavFichas } from "./favoritos.js";
import ChipEstado from "./componentes/ChipEstado.jsx";
import DialogoAdvertencia from "./componentes/DialogoAdvertencia.jsx";
import ComoFunciona from "./componentes/ComoFunciona.jsx";
import { EstadoCarga, EstadoVacio, EstadoError, EstadoExito } from "./componentes/Estados.jsx";
import { uploadImage, comprimirFoto, comprimirImagen } from "./subirFoto.js";
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
  const dias = diasPasados(a.actualizadoEn);
  const actualizado = diasDesde(a.actualizadoEn);
  const vieja = dias !== null && dias > VIGENCIA_DIAS;
  const v = a.vivienda;
  return (
    <DetalleFicha titulo={a.nombre} subtitulo={`${ETIQUETA_CATEGORIA[a.categoria]} · ${nombresTipos(a, 3)}`} imagen={a.logo || a.fotos?.[0]} icono={I} tono={TONO_CATEGORIA[a.categoria]}
      estado={a.disponibilidad || undefined} contexto="Alquiler" onVolver={onVolver}
      acciones={[
        { icono: Share2, etiqueta: "Compartir", onClick: async () => setAviso(avisoDeCompartir(await compartirFicha({ tipo: "alquiler", nombre: a.nombre, zona: textoLocalidad(a.localidad), detalle: a.desc, imagen: a.logo || a.fotos?.[0] })) || "") },
        { icono: Heart, etiqueta: esFav ? "Quitar de favoritos" : "Guardar en favoritos", activo: esFav, onClick: () => alternarFavFicha("alquiler", id) },
        ...(esMia ? [] : [accionDenunciar(() => setDen(true))]),
      ]}
      pie={a.conWhatsapp ? <button type="button" onClick={() => setWa(true)} style={{ ...botonPrincipal, flex: 1 }}><MessageCircle size={20} aria-hidden="true" /> Consultar por WhatsApp</button> : undefined}>
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

      <SeccionDetalle titulo="Qué alquila" icono={Tag}>
        <div className="flex flex-wrap gap-2">{a.tipos.map((t) => <span key={t.id} style={{ borderRadius: 999, padding: "4px 12px", background: "#EEF1F8", color: "#0B1437", fontSize: "0.9375rem", fontWeight: 600 }}>{t.label}</span>)}</div>
        <p className="mt-3" style={{ whiteSpace: "pre-line" }}>{a.desc}</p>
      </SeccionDetalle>

      {v && (v.dormitorios != null || v.banos != null || v.capacidad != null || v.amoblado != null || v.mascotas != null) && (
        <SeccionDetalle titulo="La vivienda o el espacio" icono={Home}>
          <FilaDato icono={Bed} etiqueta="Dormitorios" valor={v.dormitorios == null ? "" : v.dormitorios === 0 ? "Monoambiente" : String(v.dormitorios)} />
          <FilaDato icono={Bath} etiqueta="Baños" valor={v.banos == null ? "" : String(v.banos)} />
          <FilaDato icono={Users} etiqueta="Capacidad" valor={v.capacidad == null ? "" : `${v.capacidad} personas`} />
          <FilaDato icono={Home} etiqueta="Amoblado" valor={SI_NO(v.amoblado)} />
          <FilaDato icono={PawPrint} etiqueta="Acepta mascotas" valor={SI_NO(v.mascotas)} />
        </SeccionDetalle>
      )}

      <SeccionDetalle titulo={`Artículos (${a.articulos.length})`} icono={Package}>
        {a.articulos.length === 0 ? <p>Todavía no hay artículos publicados.</p> : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {a.articulos.map((x) => (
              <li key={x.id} className="flex items-center gap-3" style={{ borderTop: "1px solid #EEF1F8", paddingTop: 10 }}>
                {x.foto ? <img src={x.foto} alt="" loading="lazy" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: 56, height: 56, borderRadius: 12, background: "#EEF1F8", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Package size={22} color="#8D95B0" aria-hidden="true" /></span>}
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontWeight: 700, color: "#0B1437", overflowWrap: "anywhere" }}>{x.nombre}</span>
                  <span className="block text-sm" style={{ color: "#4A5372" }}>{textoPrecio(x)}</span>
                </span>
                <ChipEstado estado={x.estado} compacto />
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm mt-3" style={{ color: "#4A5372", lineHeight: 1.45 }}>«Sin confirmar» significa que hace más de {VIGENCIA_DIAS} días que el dueño no confirma si lo tiene libre: consultale antes de contar con eso. Los precios son una referencia.</p>
      </SeccionDetalle>

      <SeccionDetalle titulo="Datos">
        <FilaDato icono={MapPin} etiqueta="Dónde está" valor={[textoLocalidad(a.localidad), a.zona].filter(Boolean).join(" · ")} />
        <FilaDato icono={MapPin} etiqueta="Dirección" valor={a.direccion} />
        <FilaDato icono={Info} etiqueta="Condiciones, depósito o requisitos" valor={a.condiciones} />
      </SeccionDetalle>
      {a.fotos.length > 0 && <SeccionDetalle titulo="Fotos" icono={ImageIcon}><Fotos fotos={a.fotos} alt="Foto de lo que se alquila" /></SeccionDetalle>}
      {(a.ig || a.facebook || a.tiktok) && (
        <SeccionDetalle titulo="Redes">
          <div className="flex flex-wrap gap-2">
            {a.ig && <a href={urlRed(a.ig, "https://instagram.com/")} target="_blank" rel="noopener noreferrer" style={botonSecundario}><Instagram size={17} aria-hidden="true" /> Instagram</a>}
            {a.facebook && <a href={urlRed(a.facebook, "https://facebook.com/")} target="_blank" rel="noopener noreferrer" style={botonSecundario}><Facebook size={17} aria-hidden="true" /> Facebook</a>}
            {a.tiktok && <a href={urlRed(a.tiktok, "https://www.tiktok.com/@")} target="_blank" rel="noopener noreferrer" style={botonSecundario}><Music2 size={17} aria-hidden="true" /> TikTok</a>}
          </div>
        </SeccionDetalle>
      )}
      {a.dueno && (
        <button type="button" onClick={() => onAbrirPerfil && onAbrirPerfil(a.dueno)} className="w-full text-left flex items-center gap-3 bg-white" style={{ border: "1px solid #E3E7F1", borderRadius: 20, padding: 14, minHeight: 56 }}>
          <User size={20} color="#4A5372" aria-hidden="true" /><span className="flex-1" style={{ fontWeight: 600, color: "#0B1437" }}>Dueño: @{a.dueno}</span><ChevronRight size={18} color="#8D95B0" aria-hidden="true" />
        </button>
      )}
      <p className="text-sm px-1" style={{ color: vieja ? "#8A5B12" : "#4A5372", lineHeight: 1.5, fontWeight: vieja ? 600 : 400 }}>
        <Clock size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} aria-hidden="true" />
        {actualizado ? `Ficha actualizada ${actualizado}.` : ""}{vieja ? " Hace tiempo que no se actualiza: confirmá la disponibilidad antes de ir." : ""}
      </p>
      {wa && <HojaWhatsapp id={a.id} nombre={a.nombre} rubro="" contactar={alquileresApi.contacto} mensajeInicial={`Hola, te encontré en Mi Zona. Quería consultar por tu alquiler «${a.nombre}»: ¿está disponible?`} onCerrar={() => setWa(false)} />}
      {den && <HojaDenunciar tipo="alquiler" id={a.id} nombre={a.nombre} onCerrar={() => setDen(false)} onBloqueado={onVolver} />}
    </DetalleFicha>
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

const INICIAL = { nombre: "", categoria: "", tipos: [], desc: "", zona: "", direccion: "", whatsapp: "", mostrarWhatsapp: false, ig: "", facebook: "", tiktok: "", logo: "", fotos: [], condiciones: "", vivienda: { dormitorios: "", banos: "", capacidad: "", amoblado: null, mascotas: null } };
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
    ? { ...INICIAL, ...inicial, tipos: inicial.tipos.map((t) => t.id), vivienda: { dormitorios: aTexto(inicial.vivienda?.dormitorios), banos: aTexto(inicial.vivienda?.banos), capacidad: aTexto(inicial.vivienda?.capacidad), amoblado: inicial.vivienda?.amoblado ?? null, mascotas: inicial.vivienda?.mascotas ?? null } }
    : { ...INICIAL, nombre: "" }));
  const [loc, setLoc] = useState(inicial?.localidadCompleta || usuario?.localidad || null);
  const [articulos, setArticulos] = useState([]); // solo al crear; después se gestionan desde "Mis fichas"
  const [hojaArt, setHojaArt] = useState(null); // { indice } (-1 = nuevo)
  const [dialogo, setDialogo] = useState(null); // "whatsapp" | "direccion" | "activar"
  const [estado, setEstado] = useState(null);
  const [subiendo, setSubiendo] = useState(null);
  const archivoLogo = useRef(null), archivoFotos = useRef(null);
  const direccionAceptada = useRef(!!inicial?.direccion);
  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setEstado(null); };
  const setViv = (k, v) => { setF((p) => ({ ...p, vivienda: { ...p.vivienda, [k]: v } })); setEstado(null); };
  const cat = CATEGORIAS.find((c) => c.id === f.categoria);
  const elegirCategoria = (id) => setF((p) => (p.categoria === id ? p : { ...p, categoria: id, tipos: [] })); // al cambiar de categoría los tipos ya no valen
  const alternarTipo = (id) => setF((p) => { const t = p.tipos.includes(id); if (!t && p.tipos.length >= 6) return p; return { ...p, tipos: t ? p.tipos.filter((x) => x !== id) : [...p.tipos, id] }; });

  const faltan = [];
  if (f.nombre.trim().length < 2) faltan.push("el nombre de la ficha");
  if (!f.categoria) faltan.push("la categoría");
  else if (f.tipos.length === 0) faltan.push("al menos un tipo");
  if (f.desc.trim().length < 10) faltan.push("una descripción (mínimo 10 letras)");
  if (!loc) faltan.push("tu localidad");
  if (f.mostrarWhatsapp && f.whatsapp.replace(/\D/g, "").length < 8) faltan.push("tu número de WhatsApp");
  if (!editando && articulos.length === 0) faltan.push("al menos un artículo");
  const listo = faltan.length === 0 && !subiendo && estado !== "guardando";

  const subir = async (archivos, destino) => {
    const lista = [...archivos]; if (!lista.length) return;
    if (lista.some((a) => !/^image\//.test(a.type) || a.size > 15 * 1024 * 1024)) { setEstado({ error: "Elegí imágenes de hasta 15 MB cada una." }); return; }
    setSubiendo(destino); setEstado(null);
    try {
      if (destino === "logo") set("logo", await uploadImage(await comprimirImagen(lista[0])));
      else { const sobra = MAX_FOTOS - f.fotos.length; const urls = []; for (const a of lista.slice(0, sobra)) urls.push(await uploadImage(await comprimirFoto(a))); setF((p) => ({ ...p, fotos: [...p.fotos, ...urls] })); }
    } catch { setEstado({ error: "No pudimos subir la foto. Probá de nuevo en un rato." }); }
    setSubiendo(null);
  };

  const guardar = async () => {
    setEstado("guardando"); setDialogo(null);
    const esViv = f.categoria === "viviendas";
    const datos = {
      ...f, localidad: loc, whatsapp: f.mostrarWhatsapp || f.whatsapp ? f.whatsapp : "",
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
      {!editando && <ComoFunciona pasos={["Elegí qué alquilás y contá cómo trabajás.", "Cargá tus artículos (nombre, precio y foto si querés).", "Activá tu ficha: desde ese momento los vecinos la pueden encontrar.", "Después cambiás el estado de cada artículo con un toque desde Mis fichas."]} />}
      <div className="mt-3" />

      <Bloque titulo="Tu ficha">
        <Campo id="al-nombre" etiqueta="Nombre de la ficha" ayuda="Por ejemplo: «Alquiler de sillas Lucía» o «Cabañas del Valle». No es tu usuario ni tu perfil.">
          <input id="al-nombre" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={60} style={caja} />
        </Campo>
        <p className="text-sm font-bold mb-1.5" style={{ color: "#0B1437" }}>Categoría</p>
        <div className="flex flex-wrap gap-2 mb-3">{CATEGORIAS.map((c) => { const I = iconoCategoria(c.id); return <Chip key={c.id} activo={f.categoria === c.id} onClick={() => elegirCategoria(c.id)}><I size={15} aria-hidden="true" /> {c.label}</Chip>; })}</div>
        {cat && (
          <>
            <p className="text-sm font-bold mb-1.5" style={{ color: "#0B1437" }}>Qué alquilás ({f.tipos.length} de 6)</p>
            <div className="flex flex-wrap gap-2 mb-3">{cat.tipos.map((t) => <Chip key={t.id} activo={f.tipos.includes(t.id)} onClick={() => alternarTipo(t.id)}>{t.label}</Chip>)}</div>
          </>
        )}
        <Campo id="al-desc" etiqueta="Descripción breve" contador={`${f.desc.length}/400`}>
          <textarea id="al-desc" value={f.desc} onChange={(e) => set("desc", e.target.value)} rows={4} maxLength={400} placeholder="Contá en pocas palabras qué alquilás y cómo trabajás" style={{ ...caja, resize: "none", lineHeight: 1.5 }} />
        </Campo>
        <Campo id="al-cond" etiqueta="Condiciones, depósito o requisitos (opcional)" contador={`${f.condiciones.length}/400`} ayuda="Por ejemplo: depósito reembolsable, mínimo de horas, documentación, cómo se retira.">
          <textarea id="al-cond" value={f.condiciones} onChange={(e) => set("condiciones", e.target.value)} rows={3} maxLength={400} style={{ ...caja, resize: "none", lineHeight: 1.5 }} />
        </Campo>
      </Bloque>

      {/* Solo en viviendas y espacios: en los demás alquileres estos datos no existen */}
      {f.categoria === "viviendas" && (
        <Bloque titulo="La vivienda o el espacio (opcional)">
          <div className="grid grid-cols-3 gap-2">
            <Campo id="al-dorm" etiqueta="Dormitorios"><input id="al-dorm" value={f.vivienda.dormitorios} onChange={(e) => setViv("dormitorios", e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="0 = mono" style={caja} /></Campo>
            <Campo id="al-banos" etiqueta="Baños"><input id="al-banos" value={f.vivienda.banos} onChange={(e) => setViv("banos", e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" style={caja} /></Campo>
            <Campo id="al-cap" etiqueta="Personas"><input id="al-cap" value={f.vivienda.capacidad} onChange={(e) => setViv("capacidad", e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="Salones" style={caja} /></Campo>
          </div>
          <Tri etiqueta="¿Amoblado?" valor={f.vivienda.amoblado} onChange={(v) => setViv("amoblado", v)} />
          <Tri etiqueta="¿Acepta mascotas?" valor={f.vivienda.mascotas} onChange={(v) => setViv("mascotas", v)} />
        </Bloque>
      )}

      {!editando ? (
        <Bloque titulo={`Artículos (${articulos.length} de ${MAX_ARTICULOS})`}>
          <p className="text-sm mb-3" style={{ color: "#4A5372", lineHeight: 1.45 }}>Cargá lo que alquilás: cada artículo con su nombre, su precio y, si querés, una foto. {f.categoria === "viviendas" ? "Si es una sola vivienda, cargala como un artículo." : ""} Después podés cambiar su estado con un toque.</p>
          <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {articulos.map((x, i) => (
              <li key={i} className="flex items-center gap-3" style={{ border: "1px solid #E3E7F1", borderRadius: 14, padding: 10 }}>
                {x.foto ? <img src={x.foto} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} /> : <span style={{ width: 44, height: 44, borderRadius: 10, background: "#EEF1F8", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Package size={18} color="#8D95B0" aria-hidden="true" /></span>}
                <span className="flex-1 min-w-0"><span className="block" style={{ fontWeight: 700, color: "#0B1437", overflowWrap: "anywhere" }}>{x.nombre}</span><span className="block text-sm" style={{ color: "#4A5372" }}>{textoPrecio(x)}</span></span>
                <button type="button" aria-label={`Editar ${x.nombre}`} onClick={() => setHojaArt({ indice: i })} style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Pencil size={17} color="#4A5372" /></button>
                <button type="button" aria-label={`Quitar ${x.nombre}`} onClick={() => setArticulos((l) => l.filter((_, j) => j !== i))} style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={17} color="#9A3B34" /></button>
              </li>
            ))}
          </ul>
          {articulos.length < MAX_ARTICULOS && <button type="button" onClick={() => setHojaArt({ indice: -1 })} className="w-full mt-3" style={{ ...botonSecundario, minHeight: 50 }}><Plus size={17} aria-hidden="true" /> Agregar artículo</button>}
        </Bloque>
      ) : (
        <p className="text-sm px-1 mb-3" style={{ color: "#4A5372", lineHeight: 1.5 }}>Los artículos y su estado se cambian desde <b>Mis fichas</b>, sin tener que editar todo el formulario.</p>
      )}

      <Bloque titulo="Dónde está">
        <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Localidad</p>
        <SelectorLocalidad valor={loc} onChange={(l) => { setLoc(l); setEstado(null); }} />
        <div className="mt-4" />
        <Campo id="al-zona" etiqueta="Zona o barrio (opcional)" ayuda="Por ejemplo: «Barrio Centro». Mejor indicar solo la zona."><input id="al-zona" value={f.zona} onChange={(e) => set("zona", e.target.value)} maxLength={80} style={caja} /></Campo>
        <Campo id="al-dir" etiqueta="Dirección (opcional)" ayuda="Si la completás, será pública. Te recomendamos indicar solo la zona.">
          <input id="al-dir" value={f.direccion} onChange={(e) => set("direccion", e.target.value)} maxLength={120} autoComplete="off" onBlur={() => { if (f.direccion.trim() && !direccionAceptada.current) setDialogo("direccion"); }} style={caja} />
        </Campo>
      </Bloque>

      <Bloque titulo="Cómo te consultan">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex-1"><span className="block text-sm font-bold" style={{ color: "#0B1437" }}>Mostrar botón de WhatsApp</span><span className="block text-sm" style={{ color: "#4A5372", lineHeight: 1.45 }}>Si lo activás, quien toque el botón verá tu número.</span></span>
          <button type="button" role="switch" aria-checked={f.mostrarWhatsapp} aria-label="Mostrar botón de WhatsApp" onClick={() => (f.mostrarWhatsapp ? set("mostrarWhatsapp", false) : setDialogo("whatsapp"))}
            style={{ width: 54, height: 32, borderRadius: 16, background: f.mostrarWhatsapp ? "#2350F5" : "#CBD3E1", position: "relative", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 3, left: f.mostrarWhatsapp ? 25 : 3, width: 26, height: 26, borderRadius: 13, background: "#fff", transition: "left .2s" }} />
          </button>
        </div>
        {f.mostrarWhatsapp && <Campo id="al-wa" etiqueta="Tu número de WhatsApp" ayuda="Con código de área, sin 0 ni 15. Ej: 381 555 1234."><input id="al-wa" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} style={caja} /></Campo>}
        <Campo id="al-ig" etiqueta="Instagram (opcional)"><input id="al-ig" value={f.ig} onChange={(e) => set("ig", e.target.value)} maxLength={300} placeholder="usuario o enlace" style={caja} /></Campo>
        <Campo id="al-fb" etiqueta="Facebook (opcional)"><input id="al-fb" value={f.facebook} onChange={(e) => set("facebook", e.target.value)} maxLength={300} placeholder="usuario o enlace" style={caja} /></Campo>
        <Campo id="al-tt" etiqueta="TikTok (opcional)"><input id="al-tt" value={f.tiktok} onChange={(e) => set("tiktok", e.target.value)} maxLength={300} placeholder="usuario o enlace" style={caja} /></Campo>
      </Bloque>

      <Bloque titulo="Logo y fotos (opcional)">
        <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Logo</p>
        <div className="flex items-center gap-3 mb-4">
          {f.logo ? <img src={f.logo} alt="Tu logo" style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover" }} /> : <span style={{ width: 64, height: 64, borderRadius: 16, background: "#EEF1F8", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={26} color="#8D95B0" aria-hidden="true" /></span>}
          <button type="button" onClick={() => archivoLogo.current?.click()} disabled={!!subiendo} style={botonSecundario}>{subiendo === "logo" ? "Subiendo..." : f.logo ? "Cambiar" : "Subir logo"}</button>
          {f.logo && !subiendo && <button type="button" onClick={() => set("logo", "")} style={{ ...botonSecundario, border: 0, background: "transparent", color: "#9A3B34" }}>Quitar</button>}
          <input ref={archivoLogo} type="file" accept="image/*" hidden onChange={(e) => { subir(e.target.files, "logo"); e.target.value = ""; }} />
        </div>
        <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Fotos de la ficha ({f.fotos.length} de {MAX_FOTOS})</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {f.fotos.map((u) => (
            <div key={u} style={{ position: "relative", aspectRatio: "1 / 1" }}>
              <img src={u} alt="Foto de la ficha" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
              <button type="button" aria-label="Quitar foto" onClick={() => setF((p) => ({ ...p, fotos: p.fotos.filter((x) => x !== u) }))} style={{ position: "absolute", top: -6, right: -6, width: 30, height: 30, borderRadius: 15, background: "#C1443A", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={15} color="#fff" /></button>
            </div>
          ))}
        </div>
        {f.fotos.length < MAX_FOTOS && <button type="button" onClick={() => archivoFotos.current?.click()} disabled={!!subiendo} className="mt-3" style={botonSecundario}><Plus size={16} aria-hidden="true" /> {subiendo === "fotos" ? "Subiendo..." : "Agregar fotos"}</button>}
        <input ref={archivoFotos} type="file" accept="image/*" multiple hidden onChange={(e) => { subir(e.target.files, "fotos"); e.target.value = ""; }} />
        <p className="text-sm mt-2" style={{ color: "#4A5372", lineHeight: 1.45 }}>Subí solo fotos de lo que alquilás. Evitá fotos donde se vean personas o datos privados.</p>
      </Bloque>

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
