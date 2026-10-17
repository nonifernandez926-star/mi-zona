import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Megaphone, ShieldAlert, PawPrint, HeartHandshake, Gift, Dumbbell, CalendarDays, MapPin, MessageCircle, Plus, Pencil, Trash2, Check, X, ChevronDown, Share2, Users, Clock, Info, RotateCcw, ExternalLink, History } from "lucide-react";
import { comunidadApi } from "./api.js";
import { localidadesDeProvincia, textoLocalidad } from "./localidades.js";
import {
  TIPOS, TIPO, AVISO_SUBTIPOS, GRAVEDADES, AVISO_HORAS, SEGURIDAD_SUBTIPOS, SEGURIDAD_DIAS, PERDIDO_MODOS, PERDIDO_OBJETOS, ESPECIES, TAMANOS, DIAS_15,
  AYUDA_MODOS, AYUDA_CATEGORIAS, AYUDA_DIAS, REGALO_CATEGORIAS, DEPORTE_ACTIVIDADES, EVENTO_CATEGORIAS, VISTAS, etiqueta, hace, venceEn, fechaLinda, paraInputFecha,
} from "./comunidad.js";
import { Pagina, Hoja, Chip, Campo, Bloque, Fotos, HojaWhatsapp, botonPrincipal, botonSecundario, caja } from "./oficios.jsx";
import TarjetaFicha from "./componentes/TarjetaFicha.jsx";
import DetalleFicha, { SeccionDetalle, FilaDato } from "./componentes/DetalleFicha.jsx";
import ChipEstado from "./componentes/ChipEstado.jsx";
import DialogoAdvertencia from "./componentes/DialogoAdvertencia.jsx";
import ComoFunciona from "./componentes/ComoFunciona.jsx";
import { EstadoCarga, EstadoVacio, EstadoError } from "./componentes/Estados.jsx";
import { compartirFicha, avisoDeCompartir } from "./compartir.js";
import { uploadImage, comprimirFoto } from "./subirFoto.js";

// Comunidad (Fase 7): fichas breves de los vecinos. Publicar es GRATIS. Cada publicación la ven las personas del mismo departamento
// (con filtro por localidad). Todas vencen. La sección se muestra solo si el servidor la tiene habilitada (hasta completar la Fase 8).

const ICONO = { aviso: Megaphone, seguridad: ShieldAlert, perdido: PawPrint, ayuda: HeartHandshake, regalo: Gift, deporte: Dumbbell, evento: CalendarDays };
const TONO = { aviso: "naranja", seguridad: "rojo", perdido: "agua", ayuda: "verde", regalo: "violeta", deporte: "azul", evento: "rojo" };
const CACHE_KEY = "miZonaComunidadCache";
const leerCache = (k) => { try { return (JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"))[k] || null; } catch { return null; } };
const guardarCache = (k, v) => { try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); const ks = Object.keys(c); if (ks.length >= 8 && !c[k]) delete c[ks[0]]; c[k] = v; localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* sin almacenamiento */ } };
const avisoAmarillo = { borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 };

// El estado que se muestra en la ficha: cancelado/reprogramado (eventos), «No verificado» (seguridad), vencida o resuelta. Activa normal no muestra nada.
export function estadoVisible(p) {
  if (p.estado === "vencida") return "vencida";
  if (p.estado === "resuelta") return "resuelta";
  if (p.estadoEvento === "cancelado") return "cancelado";
  if (p.estadoEvento === "reprogramado") return "reprogramado";
  if (p.noVerificado) return "noVerificado";
  return undefined;
}
// Lo más útil de un vistazo, según el tipo
export function datoClave(p) {
  const d = p.datos || {};
  if (p.tipo === "aviso") return `${etiqueta(d.subtipo)}${d.gravedad && d.gravedad !== "informativo" ? ` · ${d.gravedad === "urgente" ? "Urgente" : "Importante"}` : ""}`;
  if (p.tipo === "seguridad") return etiqueta(d.subtipo);
  if (p.tipo === "perdido") return `${d.modo === "encontrado" ? "Encontrado" : "Perdido"}: ${etiqueta(d.objeto)}${d.especie ? ` (${etiqueta(d.especie).toLowerCase()})` : ""}`;
  if (p.tipo === "ayuda") return `${d.modo === "ofrezco" ? "Ofrezco" : "Necesito"} · ${etiqueta(d.categoria)}`;
  if (p.tipo === "regalo") return etiqueta(d.categoria);
  if (p.tipo === "deporte") return `${etiqueta(d.actividad)} · ${fechaLinda(p.inicio)}`;
  if (p.tipo === "evento") return `${etiqueta(d.categoria)} · ${fechaLinda(p.inicio)}`;
  return "";
}
const lugarCorto = (p) => [p.datos?.lugar || p.zona, p.localidad?.localidad].filter(Boolean).join(", ");
const textoDeCompartir = (p) => ({ tipo: "comunidad", nombre: p.titulo, zona: lugarCorto(p), detalle: p.desc, imagen: p.fotos?.[0] });

function TarjetaPublicacion({ p, onAbrir }) {
  const [aviso, setAviso] = useState("");
  const I = ICONO[p.tipo] || Megaphone;
  return (
    <>
      <TarjetaFicha titulo={p.titulo} zona={`${lugarCorto(p)} · ${hace(p.creadaEn)}`} datoClave={datoClave(p)} estado={estadoVisible(p)} imagen={p.fotos?.[0]} icono={I} tono={TONO[p.tipo]}
        onAbrir={() => onAbrir(p.id)} onCompartir={async () => setAviso(avisoDeCompartir(await compartirFicha(textoDeCompartir(p))) || "")} />
      {aviso && <p role="status" className="text-sm p-3" style={avisoAmarillo}>{aviso}</p>}
    </>
  );
}

// ---------- listado ----------

export function ComunidadScreen({ usuario, onVolver, onAbrir, onPublicar, onMisFichas, refrescarKey = 0 }) {
  const [tipo, setTipo] = useState("");
  const [localidad, setLocalidad] = useState(null); // { id, nombre } o null = todo el departamento
  const [actividad, setActividad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [vista, setVista] = useState("");
  const [historial, setHistorial] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [departamento, setDepartamento] = useState("");
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error | bloqueado
  const [bloqueo, setBloqueo] = useState(null); // { codigo, mensaje }
  const [sinConexion, setSinConexion] = useState(false);
  const [masCargando, setMasCargando] = useState(false);
  const [hoja, setHoja] = useState(null); // "localidad" | "actividad" | "categoria"
  const pedido = useRef(0);

  useEffect(() => { setActividad(""); setCategoria(""); setVista(""); setHistorial(false); }, [tipo]);
  const cronologico = tipo === "evento" || tipo === "deporte";

  const filtros = useCallback((pagina) => {
    const f = { pagina };
    if (tipo) f.tipo = tipo;
    if (localidad) f.localidadId = localidad.id;
    if (actividad) f.actividad = actividad;
    if (categoria) f.categoria = categoria;
    if (vista) f.vista = vista;
    if (historial && tipo === "evento") f.historial = 1;
    return f;
  }, [tipo, localidad, actividad, categoria, vista, historial]);
  const clave = JSON.stringify(filtros(1));

  const cargar = useCallback(() => {
    const mio = ++pedido.current;
    setEstado("cargando"); setSinConexion(false); setBloqueo(null);
    comunidadApi.listar(filtros(1))
      .then((r) => { if (mio !== pedido.current) return; setItems(r.publicaciones); setTotal(r.total); setHayMas(r.hayMas); setDepartamento(r.departamento || ""); setEstado("ok"); guardarCache(clave, r); })
      .catch((e) => {
        if (mio !== pedido.current) return;
        const codigo = e.datos?.codigo;
        if (["sin_localidad", "cuenta_incompleta", "no_habilitada"].includes(codigo) || e.status === 401) { setBloqueo({ codigo: codigo || "sesion", mensaje: e.message }); setEstado("bloqueado"); return; }
        const guardado = leerCache(clave);
        if (guardado) { setItems(guardado.publicaciones); setTotal(guardado.total); setHayMas(false); setDepartamento(guardado.departamento || ""); setSinConexion(true); setEstado("ok"); } else setEstado("error");
      });
  }, [filtros, clave]);
  useEffect(() => { cargar(); }, [cargar, refrescarKey]);

  const verMas = async () => {
    setMasCargando(true);
    try {
      const pag = Math.floor(items.length / 20) + 1;
      const r = await comunidadApi.listar(filtros(pag));
      setItems((l) => [...l, ...r.publicaciones.filter((n) => !l.some((x) => x.id === n.id))]); setHayMas(r.hayMas);
    } catch { /* se puede reintentar tocando de nuevo */ }
    setMasCargando(false);
  };

  const hayFiltros = !!(localidad || actividad || categoria || vista || historial);
  const limpiar = () => { setLocalidad(null); setActividad(""); setCategoria(""); setVista(""); setHistorial(false); };
  const tipoInfo = TIPO[tipo];

  return (
    <Pagina titulo="Comunidad" onVolver={onVolver}>
      <ComoFunciona pasos={["Acá los vecinos de tu departamento publican avisos, cosas perdidas, regalos, ayuda, deportes y eventos.", "Publicar es gratis. Cada publicación vence sola: los avisos duran pocas horas.", "Tocá una publicación para ver el detalle. Mantenela apretada para compartirla."]} />

      <div className="flex gap-2 mt-3 overflow-x-auto" role="group" aria-label="Tipo de publicación" style={{ paddingBottom: 2 }}>
        <span style={{ flexShrink: 0 }}><Chip activo={tipo === ""} onClick={() => setTipo("")}>Todo</Chip></span>
        {TIPOS.map((t) => <span key={t.id} style={{ flexShrink: 0 }}><Chip activo={tipo === t.id} onClick={() => setTipo(t.id)}>{t.label}</Chip></span>)}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <Chip onClick={() => setHoja("localidad")} activo={!!localidad}><MapPin size={15} aria-hidden="true" /> {localidad ? localidad.nombre : departamento ? `Todo ${departamento}` : "Mi departamento"} <ChevronDown size={14} aria-hidden="true" /></Chip>
        {tipo === "deporte" && <Chip onClick={() => setHoja("actividad")} activo={!!actividad}>{actividad ? etiqueta(actividad) : "Actividad"} <ChevronDown size={14} aria-hidden="true" /></Chip>}
        {tipo === "evento" && <Chip onClick={() => setHoja("categoria")} activo={!!categoria}>{categoria ? etiqueta(categoria) : "Categoría"} <ChevronDown size={14} aria-hidden="true" /></Chip>}
        {tipo === "evento" && <Chip onClick={() => setHistorial((v) => !v)} activo={historial}><History size={15} aria-hidden="true" /> Ya pasaron</Chip>}
      </div>
      {cronologico && !historial && (
        <div className="flex gap-2 mt-3 overflow-x-auto" role="group" aria-label="Cuándo" style={{ paddingBottom: 2 }}>
          {VISTAS.map(([id, texto]) => <span key={id} style={{ flexShrink: 0 }}><Chip activo={vista === id} onClick={() => setVista(id)}>{texto}</Chip></span>)}
        </div>
      )}
      {estado === "ok" && departamento && <p className="text-xs mt-2" style={{ color: "#6B7390", lineHeight: 1.4 }}>Lo que publican los vecinos de {departamento}.</p>}
      {sinConexion && <p role="status" className="text-sm mt-3 p-3" style={avisoAmarillo}>Sin conexión: te mostramos lo último que cargaste. Puede estar desactualizado.</p>}

      <div className="mt-4" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {estado === "cargando" && <EstadoCarga texto="Buscando publicaciones..." filas={4} />}
        {estado === "error" && <EstadoError onReintentar={cargar} />}
        {estado === "bloqueado" && (
          <EstadoVacio icono={Users} titulo={bloqueo?.codigo === "sin_localidad" ? "Elegí tu localidad" : bloqueo?.codigo === "no_habilitada" ? "Comunidad todavía no está disponible" : "Necesitás una cuenta de Mi Zona"}
            mensaje={bloqueo?.codigo === "no_habilitada" ? "Muy pronto vas a poder usarla." : bloqueo?.mensaje || "Para ver y publicar en Comunidad iniciá sesión."} accion={{ texto: "Volver", onClick: onVolver }} />
        )}
        {estado === "ok" && items.length === 0 && (
          hayFiltros
            ? <EstadoVacio icono={Megaphone} titulo="No hay publicaciones con esos filtros" mensaje="Probá con otra localidad, otro día o quitá los filtros." accion={{ texto: "Quitar los filtros", onClick: limpiar }} />
            : <EstadoVacio icono={ICONO[tipo] || Megaphone} titulo={tipoInfo ? `Todavía no hay ${tipoInfo.label.toLowerCase()} en tu zona` : "Todavía no hay publicaciones en tu zona"} mensaje="Sé el primero en publicar: es gratis y lo ven tus vecinos." accion={{ texto: "Publicar en Comunidad", onClick: () => onPublicar(tipo || null) }} />
        )}
        {estado === "ok" && items.length > 0 && (
          <>
            <p className="text-sm" style={{ color: "#4A5372" }} role="status">{total} {total === 1 ? "publicación" : "publicaciones"}{historial ? " que ya pasaron" : ""}</p>
            {items.map((p) => <TarjetaPublicacion key={p.id} p={p} onAbrir={onAbrir} />)}
            {hayMas && <button type="button" onClick={verMas} disabled={masCargando} style={{ ...botonSecundario, minHeight: 50 }}>{masCargando ? "Cargando..." : "Ver más"}</button>}
          </>
        )}
      </div>

      {estado === "ok" && items.length > 0 && <button type="button" onClick={() => onPublicar(tipo || null)} className="w-full mt-5" style={{ ...botonSecundario, minHeight: 52 }}><Plus size={18} aria-hidden="true" /> Publicar en Comunidad</button>}
      <button type="button" onClick={onMisFichas} className="w-full mt-3" style={{ ...botonSecundario, minHeight: 48, border: 0, background: "transparent", textDecoration: "underline", color: "#4A5372" }}>Mis publicaciones</button>

      {hoja === "localidad" && <HojaLocalidadDepartamento usuario={usuario} actual={localidad} onElegir={(l) => { setLocalidad(l); setHoja(null); }} onCerrar={() => setHoja(null)} />}
      {hoja === "actividad" && <HojaOpciones titulo="Actividad" opciones={DEPORTE_ACTIVIDADES} valor={actividad} todas="Todas" onElegir={(v) => { setActividad(v); setHoja(null); }} onCerrar={() => setHoja(null)} />}
      {hoja === "categoria" && <HojaOpciones titulo="Categoría" opciones={EVENTO_CATEGORIAS} valor={categoria} todas="Todas" onElegir={(v) => { setCategoria(v); setHoja(null); }} onCerrar={() => setHoja(null)} />}
    </Pagina>
  );
}

function HojaOpciones({ titulo, opciones, valor, todas, onElegir, onCerrar }) {
  const estilo = (activo) => ({ ...botonSecundario, justifyContent: "flex-start", minHeight: 50, borderColor: activo ? "#2350F5" : "#CFD6E8", background: activo ? "#EDF1FF" : "#fff" });
  return (
    <Hoja titulo={titulo} onCerrar={onCerrar}>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => onElegir("")} style={estilo(!valor)}>{!valor && <Check size={16} aria-hidden="true" />}{todas}</button>
        {opciones.map(([id, texto]) => <button key={id} type="button" onClick={() => onElegir(id)} style={estilo(valor === id)}>{valor === id && <Check size={16} aria-hidden="true" />}{texto}</button>)}
      </div>
    </Hoja>
  );
}

// Localidades del propio departamento (la lista oficial se pide al abrir; el departamento sale del perfil)
function useLocalidadesDelDepartamento(usuario) {
  const [lista, setLista] = useState(null); // null = cargando
  const [fallo, setFallo] = useState(false);
  const provinciaId = usuario?.localidad?.provinciaId, departamentoId = usuario?.localidad?.departamentoId;
  useEffect(() => {
    let vivo = true;
    if (!provinciaId) { setLista([]); return undefined; }
    localidadesDeProvincia(provinciaId)
      .then((l) => vivo && setLista(l.filter((x) => x.departamentoId === departamentoId)))
      .catch(() => vivo && setFallo(true));
    return () => { vivo = false; };
  }, [provinciaId, departamentoId]);
  return { lista, fallo };
}

function HojaLocalidadDepartamento({ usuario, actual, onElegir, onCerrar }) {
  const { lista, fallo } = useLocalidadesDelDepartamento(usuario);
  const estilo = (activo) => ({ ...botonSecundario, justifyContent: "flex-start", minHeight: 50, borderColor: activo ? "#2350F5" : "#CFD6E8", background: activo ? "#EDF1FF" : "#fff" });
  return (
    <Hoja titulo="Localidad" onCerrar={onCerrar}>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => onElegir(null)} style={estilo(!actual)}>{!actual && <Check size={16} aria-hidden="true" />}Todo mi departamento{usuario?.localidad?.departamento ? ` (${usuario.localidad.departamento})` : ""}</button>
        {lista === null && !fallo && <p className="text-sm" style={{ color: "#4A5372" }}>Cargando localidades...</p>}
        {fallo && <p role="alert" className="text-sm" style={{ color: "#9A3B34" }}>No pudimos cargar la lista de localidades. Revisá tu conexión.</p>}
        {(lista || []).map((l) => <button key={l.id} type="button" onClick={() => onElegir({ id: l.id, nombre: l.nombre })} style={estilo(actual?.id === l.id)}>{actual?.id === l.id && <Check size={16} aria-hidden="true" />}{l.nombre}</button>)}
      </div>
    </Hoja>
  );
}

// ---------- detalle ----------

export function DetalleComunidad({ id, onVolver, onEditar, onCambio }) {
  const [p, setP] = useState(null);
  const [esMia, setEsMia] = useState(false);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | noExiste | error
  const [wa, setWa] = useState(false);
  const [aviso, setAviso] = useState("");
  const [dialogo, setDialogo] = useState(null); // "eliminar"
  const [trabajando, setTrabajando] = useState(false);
  const cargar = useCallback(() => {
    setEstado("cargando");
    comunidadApi.ver(id).then((r) => { setP(r.publicacion); setEsMia(r.esMia); setEstado("ok"); }).catch((e) => setEstado(e.status === 404 ? "noExiste" : "error"));
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  if (estado !== "ok") {
    return (
      <Pagina titulo="Comunidad" onVolver={onVolver}>
        {estado === "cargando" && <EstadoCarga texto="Cargando publicación..." />}
        {estado === "noExiste" && <EstadoVacio icono={Megaphone} titulo="Esta publicación ya no está disponible" mensaje="Puede que la hayan eliminado o que no sea de tu departamento." accion={{ texto: "Volver", onClick: onVolver }} />}
        {estado === "error" && <EstadoError onReintentar={cargar} />}
      </Pagina>
    );
  }
  const d = p.datos || {};
  const I = ICONO[p.tipo] || Megaphone;
  const activa = p.estado === "activa";
  const correr = async (accion) => { setTrabajando(true); setAviso(""); try { setP(await accion()); onCambio?.(); } catch (e) { setAviso(e.message || "No se pudo completar. Probá de nuevo."); } setTrabajando(false); };
  const textoResolver = p.tipo === "regalo" ? "Ya lo regalé" : p.tipo === "perdido" ? "Ya apareció / resuelto" : p.tipo === "aviso" ? "Ya terminó" : "Marcar como resuelta";

  return (
    <DetalleFicha titulo={p.titulo} subtitulo={`${TIPO[p.tipo]?.singular} · ${hace(p.creadaEn)}`} icono={I} tono={TONO[p.tipo]} imagen={p.fotos?.[0]} estado={estadoVisible(p)} contexto="Comunidad" onVolver={onVolver}
      acciones={[{ icono: Share2, etiqueta: "Compartir", onClick: async () => setAviso(avisoDeCompartir(await compartirFicha(textoDeCompartir(p))) || "") }]}
      pie={!esMia && activa && p.conContacto ? <button type="button" onClick={() => setWa(true)} style={{ ...botonPrincipal, flex: 1 }}><MessageCircle size={20} aria-hidden="true" /> Contactar por WhatsApp</button> : undefined}>
      {aviso && <p role="status" className="text-sm p-3" style={avisoAmarillo}>{aviso}</p>}
      {p.noVerificado && (
        <p className="text-sm p-3 flex gap-2" style={{ ...avisoAmarillo, border: "1px solid #F2D79A" }}><ShieldAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} /><span><b>No verificado.</b> Lo cuenta un vecino y Mi Zona no lo comprobó. Si fue un delito, denunciálo a la policía.</span></p>
      )}
      {!activa && <p role="status" className="text-sm p-3" style={{ borderRadius: 12, background: "#EEF1F8", color: "#2B3768" }}>{p.estado === "resuelta" ? "Esta publicación está resuelta." : "Esta publicación ya venció."}</p>}
      {p.estadoEvento === "cancelado" && <p role="status" className="text-sm p-3" style={{ borderRadius: 12, background: "#FDF1EF", color: "#9A3B34", fontWeight: 600 }}>Este evento fue cancelado.</p>}
      {p.estadoEvento === "reprogramado" && <p role="status" className="text-sm p-3" style={avisoAmarillo}>Este evento fue reprogramado: fijate la fecha nueva.</p>}

      <SeccionDetalle titulo="Detalles" icono={Info}>
        <FilaDato icono={MapPin} etiqueta="Dónde" valor={[d.lugar || p.zona, textoLocalidad(p.localidad)].filter(Boolean).join(" · ")} />
        {p.tipo === "aviso" && <><FilaDato icono={Megaphone} etiqueta="Aviso" valor={etiqueta(d.subtipo)} /><FilaDato icono={Info} etiqueta="Importancia" valor={GRAVEDADES.find((g) => g[0] === d.gravedad)?.[1] || "Informativo"} /></>}
        {p.tipo === "seguridad" && <FilaDato icono={ShieldAlert} etiqueta="Qué pasó" valor={etiqueta(d.subtipo)} />}
        {p.tipo === "perdido" && <><FilaDato icono={PawPrint} etiqueta={d.modo === "encontrado" ? "Encontrado" : "Perdido"} valor={etiqueta(d.objeto)} />{d.objeto === "mascota" && <><FilaDato icono={PawPrint} etiqueta="Animal" valor={`${etiqueta(d.especie)} · ${etiqueta(d.tamano).toLowerCase()}`} />{d.color && <FilaDato icono={Info} etiqueta="Color" valor={d.color} />}{d.senas && <FilaDato icono={Info} etiqueta="Señas particulares" valor={d.senas} />}</>}</>}
        {p.tipo === "ayuda" && <FilaDato icono={HeartHandshake} etiqueta={d.modo === "ofrezco" ? "Ofrece ayuda" : "Necesita ayuda"} valor={etiqueta(d.categoria)} />}
        {p.tipo === "regalo" && <FilaDato icono={Gift} etiqueta="Qué regala" valor={etiqueta(d.categoria)} />}
        {p.tipo === "deporte" && <><FilaDato icono={Dumbbell} etiqueta="Actividad" valor={etiqueta(d.actividad)} /><FilaDato icono={CalendarDays} etiqueta="Cuándo" valor={fechaLinda(p.inicio)} /></>}
        {p.tipo === "evento" && <><FilaDato icono={CalendarDays} etiqueta="Empieza" valor={fechaLinda(p.inicio)} /><FilaDato icono={CalendarDays} etiqueta="Termina" valor={fechaLinda(p.vence)} /><FilaDato icono={Info} etiqueta="Categoría" valor={etiqueta(d.categoria)} />{d.organizador && <FilaDato icono={Users} etiqueta="Organiza" valor={d.organizador} />}<FilaDato icono={Info} etiqueta="Entrada" valor={d.gratis ? "Gratis" : d.precio} /></>}
        {activa && <FilaDato icono={Clock} etiqueta="Vencimiento" valor={venceEn(p.vence)} />}
      </SeccionDetalle>
      <SeccionDetalle titulo="Descripción" icono={Info}><p style={{ whiteSpace: "pre-line", lineHeight: 1.55 }}>{p.desc}</p></SeccionDetalle>
      {p.fotos?.length > 0 && <SeccionDetalle titulo={p.fotos.length === 1 ? "Foto" : "Fotos"} icono={Info}><Fotos fotos={p.fotos} alt="Foto de la publicación" /></SeccionDetalle>}
      {d.enlace && (
        <a href={d.enlace} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 text-sm font-bold" style={{ borderRadius: 14, background: "#fff", border: "1px solid #E3E7F1", color: "#1B3FB8", minHeight: 48 }}><ExternalLink size={16} aria-hidden="true" /> Más información (se abre en el navegador)</a>
      )}
      {/* ENGANCHE Fase 8: acá va el botón «Denunciar» (y ofrecer bloquear a quien publicó). */}

      {esMia && (
        <div className="mt-2 p-3" style={{ borderRadius: 16, background: "#EDF1FF", border: "1px solid #C9D6FA" }}>
          <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Tu publicación</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onEditar(p)} style={botonSecundario}><Pencil size={16} aria-hidden="true" /> Editar</button>
            {p.estado === "resuelta"
              ? <button type="button" disabled={trabajando} onClick={() => correr(() => comunidadApi.resuelta(p.id, false))} style={botonSecundario}><RotateCcw size={16} aria-hidden="true" /> Volver a activarla</button>
              : activa && <button type="button" disabled={trabajando} onClick={() => correr(() => comunidadApi.resuelta(p.id, true))} style={botonSecundario}><Check size={16} aria-hidden="true" /> {textoResolver}</button>}
            <button type="button" onClick={() => setDialogo("eliminar")} style={{ ...botonSecundario, color: "#9A3B34" }}><Trash2 size={16} aria-hidden="true" /> Eliminar</button>
          </div>
          {p.tipo === "evento" && (
            <div className="mt-3">
              <p className="text-sm font-bold mb-1.5" style={{ color: "#0B1437" }}>Estado del evento</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Estado del evento">
                {[["normal", "Va como estaba"], ["reprogramado", "Reprogramado"], ["cancelado", "Cancelado"]].map(([id2, texto]) => <Chip key={id2} activo={(p.estadoEvento || "normal") === id2} onClick={() => !trabajando && correr(() => comunidadApi.estadoEvento(p.id, id2))}>{texto}</Chip>)}
              </div>
              <p className="text-sm mt-1.5" style={{ color: "#4A5372", lineHeight: 1.4 }}>Si cambiás la fecha al editar, se marca solo como «reprogramado».</p>
            </div>
          )}
        </div>
      )}
      {wa && <HojaWhatsapp id={p.id} nombre="quien publicó" rubro="" contactar={comunidadApi.contacto} mensajeInicial={`Hola, vi tu publicación «${p.titulo}» en Mi Zona.`} onCerrar={() => setWa(false)} />}
      {dialogo === "eliminar" && (
        <DialogoAdvertencia titulo="¿Eliminar tu publicación?" queHace="Borra esta publicación para siempre, con sus fotos y datos." paraQue="Sirve si ya no hace falta o la publicaste por error." queSucedera="Deja de verse para todos los vecinos y no se puede recuperar. Si solo está resuelta, mejor marcala como resuelta."
          textoAceptar="Sí, eliminar" peligro cargando={trabajando}
          onAceptar={async () => { setTrabajando(true); try { await comunidadApi.eliminar(p.id); onCambio?.(); onVolver(); } catch (e) { setAviso(e.message || "No se pudo eliminar."); setDialogo(null); } setTrabajando(false); }} onCancelar={() => setDialogo(null)} />
      )}
    </DetalleFicha>
  );
}

// ---------- formulario ----------

function Opciones({ valor, onChange, opciones, etiquetaGrupo }) {
  return <div className="flex flex-wrap gap-2" role="group" aria-label={etiquetaGrupo}>{opciones.map(([id, texto]) => <Chip key={id} activo={valor === id} onClick={() => onChange(id)}>{texto}</Chip>)}</div>;
}
function Lista({ id, valor, onChange, opciones, vacio = "Elegí una opción" }) {
  return (
    <select id={id} value={valor || ""} onChange={(e) => onChange(e.target.value)} style={caja}>
      <option value="">{vacio}</option>
      {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
}

const INICIAL = {
  titulo: "", desc: "", zona: "", fotos: [], whatsapp: "", mostrarWhatsapp: false,
  subtipo: "", gravedad: "informativo", horas: 6, dias: 7, modo: "", objeto: "", especie: "", tamano: "", color: "", senas: "", categoria: "", actividad: "",
  inicio: "", fin: "", lugar: "", organizador: "", gratis: true, precio: "", enlace: "",
};
// Cuánto dura lo que se va a publicar (para la advertencia)
function textoDuracion(tipo, f) {
  if (tipo === "aviso") return `${f.horas >= 24 ? `${f.horas / 24} ${f.horas === 24 ? "día" : "días"}` : `${f.horas} horas`}`;
  if (tipo === "seguridad") return `${f.dias} ${f.dias === 1 ? "día" : "días"}`;
  if (tipo === "deporte") return "hasta unas horas después de la actividad";
  if (tipo === "evento") return "hasta que termine el evento";
  return `${f.dias} días`;
}

export function FormularioComunidad({ inicial, tipoInicial, tituloInicial = "", usuario, onGuardado, onCancelar }) {
  const editando = !!inicial;
  const [tipo, setTipo] = useState(inicial?.tipo || tipoInicial || null);
  const [f, setF] = useState(() => {
    if (!inicial) return { ...INICIAL, titulo: tituloInicial.slice(0, 80), modo: tipoInicial === "ayuda" && tituloInicial ? "necesito" : "", dias: tipoInicial === "ayuda" ? 7 : 15 };
    const d = inicial.datos || {};
    return { ...INICIAL, ...d, titulo: inicial.titulo, desc: inicial.desc, zona: inicial.zona || "", fotos: inicial.fotos || [], whatsapp: inicial.whatsapp || "", mostrarWhatsapp: !!inicial.mostrarWhatsapp, inicio: paraInputFecha(inicial.inicio), fin: inicial.tipo === "evento" ? paraInputFecha(inicial.vence) : "", gratis: d.gratis !== false };
  });
  const [loc, setLoc] = useState(() => inicial?.localidadCompleta || usuario?.localidad || null);
  const [hojaLoc, setHojaLoc] = useState(false);
  const [renovar, setRenovar] = useState(false);
  const [estado, setEstado] = useState("listo"); // listo | guardando | { error }
  const [dialogo, setDialogo] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const archivo = useRef(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const cfg = tipo ? TIPO[tipo] : null;
  const { lista: localidades } = useLocalidadesDelDepartamento(usuario);

  const subirFotos = async (archivos) => {
    const lista = [...archivos];
    const sobra = cfg.fotos - f.fotos.length;
    if (!lista.length || sobra <= 0) return;
    setSubiendo(true); setEstado("listo");
    try {
      const urls = [];
      for (const a of lista.slice(0, sobra)) urls.push(await uploadImage(await comprimirFoto(a)));
      setF((p) => ({ ...p, fotos: [...p.fotos, ...urls] }));
    } catch { setEstado({ error: "No pudimos subir la foto. Probá de nuevo en un rato." }); }
    setSubiendo(false);
  };

  const datos = () => ({ ...f, tipo, localidad: loc, whatsapp: cfg.contacto && (f.mostrarWhatsapp || f.whatsapp) ? f.whatsapp : "", renovar: editando && renovar });
  const guardar = async () => {
    setEstado("guardando"); setDialogo(false);
    try {
      const p = editando ? await comunidadApi.editar(inicial.id, datos()) : await comunidadApi.crear(datos());
      onGuardado(p, !editando);
    } catch (e) { setEstado({ error: e.message || "No se pudo guardar. Probá de nuevo." }); window.scrollTo(0, 0); }
  };
  const alTocarPublicar = () => {
    if (!f.titulo.trim() || f.titulo.trim().length < 4) return setEstado({ error: "Escribí un título de al menos 4 letras." });
    if (f.desc.trim().length < 10) return setEstado({ error: "Contá los detalles en al menos 10 letras." });
    if (!loc) return setEstado({ error: "Elegí tu localidad en tu perfil." });
    setEstado("listo");
    if (editando) guardar(); else setDialogo(true);
  };

  // 1) elegir qué publicar
  if (!tipo) {
    return (
      <Pagina titulo="Publicar en Comunidad" onVolver={onCancelar}>
        <p className="text-sm mb-3" style={{ color: "#4A5372", lineHeight: 1.5 }}>¿Qué querés publicar? Es gratis y lo ven los vecinos de tu departamento.</p>
        <div className="flex flex-col gap-3">
          {TIPOS.map((t) => {
            const I = ICONO[t.id];
            return (
              <button key={t.id} type="button" onClick={() => setTipo(t.id)} className="flex items-center gap-3 text-left bg-white" style={{ border: "1px solid #E3E7F1", borderRadius: 18, padding: 12, minHeight: 68 }}>
                <span style={{ width: 44, height: 44, borderRadius: 14, background: "#EDF1FF", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><I size={22} color="#2350F5" aria-hidden="true" /></span>
                <span className="flex-1 min-w-0"><span className="block font-bold" style={{ color: "#0B1437" }}>{t.singular}</span><span className="block text-sm" style={{ color: "#4A5372" }}>{t.ayuda}</span></span>
              </button>
            );
          })}
        </div>
      </Pagina>
    );
  }

  const errorTxt = estado?.error;
  const textosPublicar = {
    titulo: "¿Publicar en Comunidad?",
    queHace: `Publica «${f.titulo.trim() || "tu publicación"}» en Comunidad.`,
    paraQue: "Sirve para que tus vecinos lo vean y puedan ayudarte, ir o contactarte.",
    queSucedera: `Lo van a ver las personas del departamento ${loc?.departamento || "de tu zona"}, durante ${textoDuracion(tipo, f)}; después vence solo. ${cfg.fotos && f.fotos.length ? "Tus fotos serán públicas para ellos. " : ""}${cfg.contacto && f.mostrarWhatsapp ? "Quien toque el botón de WhatsApp verá tu número. " : ""}No se muestra tu correo. Publicar es gratis y podés editarla o eliminarla cuando quieras.`,
  };
  return (
    <Pagina titulo={editando ? "Editar publicación" : TIPO[tipo].singular} onVolver={onCancelar}
      pie={<button type="button" onClick={alTocarPublicar} disabled={estado === "guardando" || subiendo} style={{ ...botonPrincipal, flex: 1, opacity: estado === "guardando" ? 0.6 : 1 }}>{estado === "guardando" ? "Guardando..." : editando ? "Guardar cambios" : "Publicar"}</button>}>
      {errorTxt && <p role="alert" className="text-sm p-3 mb-3" style={{ borderRadius: 12, background: "#FDF1EF", color: "#9A3B34", lineHeight: 1.45 }}>{errorTxt}</p>}
      {tipo === "seguridad" && (
        <p className="text-sm p-3 mb-3 flex gap-2" style={{ ...avisoAmarillo, border: "1px solid #F2D79A" }}><ShieldAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} /><span>Se muestra como <b>«No verificado»</b>. No nombres ni acuses a nadie, no escribas teléfonos y no subas fotos de personas. <b>Si fue un delito, denunciálo a la policía.</b></span></p>
      )}
      {tipo === "aviso" && <p className="text-sm p-3 mb-3" style={{ ...avisoAmarillo, border: "1px solid #F2D79A" }}>Usá palabras neutras, por ejemplo «Operativo de tránsito o control en la zona». Los avisos duran pocas horas.</p>}

      <Bloque titulo="¿Qué publicás?">
        {tipo === "aviso" && (<>
          <Campo id="c-sub" etiqueta="Tipo de aviso"><Lista id="c-sub" valor={f.subtipo} onChange={(v) => set("subtipo", v)} opciones={AVISO_SUBTIPOS} /></Campo>
          <Campo id="c-grav" etiqueta="Importancia" ayuda="Usá «urgente» solo si hace falta."><Opciones valor={f.gravedad} onChange={(v) => set("gravedad", v)} opciones={GRAVEDADES} etiquetaGrupo="Importancia" /></Campo>
        </>)}
        {tipo === "seguridad" && <Campo id="c-sub" etiqueta="Qué pasó"><Lista id="c-sub" valor={f.subtipo} onChange={(v) => set("subtipo", v)} opciones={SEGURIDAD_SUBTIPOS} /></Campo>}
        {tipo === "perdido" && (<>
          <Campo id="c-modo" etiqueta="¿Lo perdiste o lo encontraste?"><Opciones valor={f.modo} onChange={(v) => set("modo", v)} opciones={PERDIDO_MODOS} etiquetaGrupo="Perdido o encontrado" /></Campo>
          <Campo id="c-obj" etiqueta="¿Qué es?"><Opciones valor={f.objeto} onChange={(v) => set("objeto", v)} opciones={PERDIDO_OBJETOS} etiquetaGrupo="Qué es" /></Campo>
          {f.objeto === "mascota" && (<>
            <Campo id="c-esp" etiqueta="Animal"><Opciones valor={f.especie} onChange={(v) => set("especie", v)} opciones={ESPECIES} etiquetaGrupo="Animal" /></Campo>
            <Campo id="c-tam" etiqueta="Tamaño"><Opciones valor={f.tamano} onChange={(v) => set("tamano", v)} opciones={TAMANOS} etiquetaGrupo="Tamaño" /></Campo>
            <Campo id="c-col" etiqueta="Color (opcional)"><input id="c-col" value={f.color} maxLength={40} onChange={(e) => set("color", e.target.value)} style={caja} /></Campo>
            <Campo id="c-sen" etiqueta="Señas particulares (opcional)" ayuda="Collar, manchas, cicatrices..."><input id="c-sen" value={f.senas} maxLength={120} onChange={(e) => set("senas", e.target.value)} style={caja} /></Campo>
          </>)}
        </>)}
        {tipo === "ayuda" && (<>
          <Campo id="c-modo" etiqueta="¿Necesitás u ofrecés ayuda?"><Opciones valor={f.modo} onChange={(v) => set("modo", v)} opciones={AYUDA_MODOS} etiquetaGrupo="Necesito u ofrezco" /></Campo>
          <Campo id="c-cat" etiqueta="Tipo de ayuda"><Lista id="c-cat" valor={f.categoria} onChange={(v) => set("categoria", v)} opciones={AYUDA_CATEGORIAS} /></Campo>
        </>)}
        {tipo === "regalo" && <Campo id="c-cat" etiqueta="¿Qué regalás?"><Lista id="c-cat" valor={f.categoria} onChange={(v) => set("categoria", v)} opciones={REGALO_CATEGORIAS} /></Campo>}
        {tipo === "deporte" && (<>
          <Campo id="c-act" etiqueta="Actividad"><Lista id="c-act" valor={f.actividad} onChange={(v) => set("actividad", v)} opciones={DEPORTE_ACTIVIDADES} /></Campo>
          <Campo id="c-ini" etiqueta="Día y hora"><input id="c-ini" type="datetime-local" value={f.inicio} onChange={(e) => set("inicio", e.target.value)} style={caja} /></Campo>
          <Campo id="c-lug" etiqueta="Lugar general" ayuda="Por ejemplo «Plaza principal». No hace falta la dirección exacta."><input id="c-lug" value={f.lugar} maxLength={80} onChange={(e) => set("lugar", e.target.value)} style={caja} /></Campo>
        </>)}
        {tipo === "evento" && (<>
          <Campo id="c-cat" etiqueta="Categoría"><Lista id="c-cat" valor={f.categoria} onChange={(v) => set("categoria", v)} opciones={EVENTO_CATEGORIAS} /></Campo>
          <Campo id="c-ini" etiqueta="Empieza"><input id="c-ini" type="datetime-local" value={f.inicio} onChange={(e) => set("inicio", e.target.value)} style={caja} /></Campo>
          <Campo id="c-fin" etiqueta="Termina"><input id="c-fin" type="datetime-local" value={f.fin} min={f.inicio || undefined} onChange={(e) => set("fin", e.target.value)} style={caja} /></Campo>
          <Campo id="c-lug" etiqueta="Lugar general" ayuda="Por ejemplo «Club Atlético». No hace falta la dirección exacta."><input id="c-lug" value={f.lugar} maxLength={80} onChange={(e) => set("lugar", e.target.value)} style={caja} /></Campo>
          <Campo id="c-org" etiqueta="Quién organiza (opcional)"><input id="c-org" value={f.organizador} maxLength={60} onChange={(e) => set("organizador", e.target.value)} style={caja} /></Campo>
          <Campo id="c-gra" etiqueta="Entrada"><Opciones valor={f.gratis ? "gratis" : "pago"} onChange={(v) => set("gratis", v === "gratis")} opciones={[["gratis", "Gratis"], ["pago", "Con costo"]]} etiquetaGrupo="Entrada" /></Campo>
          {!f.gratis && <Campo id="c-pre" etiqueta="Precio"><input id="c-pre" value={f.precio} maxLength={40} onChange={(e) => set("precio", e.target.value)} placeholder="$3000" style={caja} /></Campo>}
          <Campo id="c-enl" etiqueta="Enlace con más información (opcional)" ayuda="Tiene que empezar con https://"><input id="c-enl" type="url" value={f.enlace} maxLength={300} onChange={(e) => set("enlace", e.target.value)} style={caja} /></Campo>
        </>)}
        <Campo id="c-tit" etiqueta="Título" contador={`${f.titulo.length}/80`}><input id="c-tit" value={f.titulo} maxLength={80} onChange={(e) => set("titulo", e.target.value)} style={caja} /></Campo>
        <Campo id="c-desc" etiqueta="Detalles" contador={`${f.desc.length}/500`}><textarea id="c-desc" value={f.desc} maxLength={500} rows={5} onChange={(e) => set("desc", e.target.value)} style={{ ...caja, resize: "none", lineHeight: 1.5 }} /></Campo>
      </Bloque>

      <Bloque titulo="¿Dónde?">
        <p className="text-sm" style={{ color: "#4A5372", lineHeight: 1.45 }}>Se muestra a los vecinos de <b>{loc?.departamento || "tu departamento"}</b>. Localidad: <b>{loc?.localidad || "—"}</b>.</p>
        {(localidades || []).length > 1 && <button type="button" onClick={() => setHojaLoc(true)} className="mt-2" style={botonSecundario}><MapPin size={16} aria-hidden="true" /> Cambiar de localidad</button>}
        {tipo !== "deporte" && tipo !== "evento" && <Campo id="c-zona" etiqueta="Zona o barrio (opcional)" ayuda="No escribas tu dirección exacta."><input id="c-zona" value={f.zona} maxLength={80} onChange={(e) => set("zona", e.target.value)} style={caja} /></Campo>}
      </Bloque>

      {cfg.fotos > 0 && (
        <Bloque titulo={cfg.fotos === 1 ? "Foto o afiche (opcional)" : `Fotos (opcional, hasta ${cfg.fotos})`}>
          <div className="flex flex-wrap gap-3">
            {f.fotos.map((u) => (
              <div key={u} style={{ position: "relative" }}>
                <img src={u} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 14 }} />
                <button type="button" aria-label="Quitar foto" onClick={() => set("fotos", f.fotos.filter((x) => x !== u))} style={{ position: "absolute", top: -6, right: -6, width: 30, height: 30, borderRadius: 15, background: "#C1443A", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={15} color="#fff" /></button>
              </div>
            ))}
          </div>
          {f.fotos.length < cfg.fotos && <button type="button" onClick={() => archivo.current?.click()} disabled={subiendo} className="mt-3" style={botonSecundario}><Plus size={16} aria-hidden="true" /> {subiendo ? "Subiendo..." : "Agregar foto"}</button>}
          <input ref={archivo} type="file" accept="image/*" multiple hidden onChange={(e) => { subirFotos(e.target.files); e.target.value = ""; }} />
          <p className="text-sm mt-2" style={{ color: "#4A5372", lineHeight: 1.45 }}>Evitá fotos donde se vean personas o datos privados (patentes, documentos, direcciones).</p>
        </Bloque>
      )}

      {cfg.contacto && (
        <Bloque titulo="Contacto por WhatsApp (opcional)">
          <Campo id="c-wa" etiqueta="Tu número" ayuda="Con código de país y de área, por ejemplo 5493815551234. Nunca aparece en la lista: solo lo ve quien toque el botón."><input id="c-wa" inputMode="numeric" value={f.whatsapp} maxLength={20} onChange={(e) => set("whatsapp", e.target.value)} style={caja} /></Campo>
          <Chip activo={f.mostrarWhatsapp} onClick={() => set("mostrarWhatsapp", !f.mostrarWhatsapp)}>Mostrar el botón «Contactar por WhatsApp»</Chip>
        </Bloque>
      )}

      {!editando && tipo !== "deporte" && tipo !== "evento" && (
        <Bloque titulo="¿Cuánto dura?">
          {tipo === "aviso" && <Opciones valor={f.horas} onChange={(v) => set("horas", v)} opciones={AVISO_HORAS} etiquetaGrupo="Duración" />}
          {tipo === "seguridad" && <Opciones valor={f.dias} onChange={(v) => set("dias", v)} opciones={SEGURIDAD_DIAS} etiquetaGrupo="Duración" />}
          {tipo === "perdido" && <Opciones valor={f.dias} onChange={(v) => set("dias", v)} opciones={DIAS_15} etiquetaGrupo="Duración" />}
          {tipo === "ayuda" && <Opciones valor={f.dias} onChange={(v) => set("dias", v)} opciones={AYUDA_DIAS} etiquetaGrupo="Duración" />}
          {tipo === "regalo" && <Opciones valor={f.dias} onChange={(v) => set("dias", v)} opciones={DIAS_15} etiquetaGrupo="Duración" />}
          <p className="text-sm mt-2" style={{ color: "#4A5372" }}>Después vence sola y deja de verse.</p>
        </Bloque>
      )}
      {editando && tipo !== "deporte" && tipo !== "evento" && (
        <Bloque titulo="Vencimiento">
          <p className="text-sm" style={{ color: "#4A5372", lineHeight: 1.45 }}>{venceEn(inicial.vence)}.</p>
          <Chip activo={renovar} onClick={() => setRenovar((v) => !v)}><Clock size={15} aria-hidden="true" /> Renovar desde hoy</Chip>
          {renovar && (
            <div className="mt-3">
              {tipo === "aviso" && <Opciones valor={f.horas} onChange={(v) => set("horas", v)} opciones={AVISO_HORAS} etiquetaGrupo="Nueva duración" />}
              {tipo === "seguridad" && <Opciones valor={f.dias} onChange={(v) => set("dias", v)} opciones={SEGURIDAD_DIAS} etiquetaGrupo="Nueva duración" />}
              {["perdido", "regalo"].includes(tipo) && <Opciones valor={f.dias} onChange={(v) => set("dias", v)} opciones={DIAS_15} etiquetaGrupo="Nueva duración" />}
              {tipo === "ayuda" && <Opciones valor={f.dias} onChange={(v) => set("dias", v)} opciones={AYUDA_DIAS} etiquetaGrupo="Nueva duración" />}
            </div>
          )}
        </Bloque>
      )}

      {dialogo && <DialogoAdvertencia {...textosPublicar} textoAceptar="Sí, publicar" cargando={estado === "guardando"} onAceptar={guardar} onCancelar={() => setDialogo(false)} />}
      {hojaLoc && (
        <Hoja titulo="Localidad" onCerrar={() => setHojaLoc(false)}>
          <div className="flex flex-col gap-2">
            {(localidades || []).map((l) => (
              <button key={l.id} type="button" onClick={() => { setLoc({ provinciaId: usuario.localidad.provinciaId, provincia: usuario.localidad.provincia, departamentoId: l.departamentoId, departamento: l.departamento, localidadId: l.id, localidad: l.nombre }); setHojaLoc(false); }}
                style={{ ...botonSecundario, justifyContent: "flex-start", minHeight: 50, borderColor: loc?.localidadId === l.id ? "#2350F5" : "#CFD6E8", background: loc?.localidadId === l.id ? "#EDF1FF" : "#fff" }}>{loc?.localidadId === l.id && <Check size={16} aria-hidden="true" />}{l.nombre}</button>
            ))}
          </div>
        </Hoja>
      )}
    </Pagina>
  );
}

// Paso final al publicar: confirma y recuerda que vence y que se puede gestionar desde «Mis fichas»
export function PasoPublicado({ publicacion, onVer, onListo }) {
  return (
    <Pagina titulo="Publicado" onVolver={onListo}>
      <EstadoVacio icono={Check} tono="verde" titulo="¡Listo! Ya está publicado" mensaje={`«${publicacion.titulo}» ya lo ven tus vecinos de ${publicacion.localidad?.departamento || "tu departamento"}. ${venceEn(publicacion.vence)}. Podés editarlo, resolverlo o eliminarlo desde Mis fichas.`} accion={{ texto: "Volver a Comunidad", onClick: onListo }} />
      <button type="button" onClick={onVer} className="w-full mt-3" style={botonSecundario}>Ver cómo lo ven los demás</button>
    </Pagina>
  );
}

// ---------- «Mis publicaciones» (dentro de Mis fichas) ----------

export function MisPublicaciones({ onVer, onEditar, onPublicar }) {
  const [lista, setLista] = useState(undefined); // undefined = cargando
  const [error, setError] = useState(false);
  const [dialogo, setDialogo] = useState(null); // publicación a eliminar
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState("");
  const cargar = useCallback(() => { setError(false); comunidadApi.mias().then(setLista).catch(() => { setError(true); setLista([]); }); }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const resolver = async (p, valor) => { setTrabajando(true); setAviso(""); try { const n = await comunidadApi.resuelta(p.id, valor); setLista((l) => l.map((x) => (x.id === n.id ? n : x))); } catch (e) { setAviso(e.message || "No se pudo guardar."); } setTrabajando(false); };
  const eliminar = async () => { setTrabajando(true); try { await comunidadApi.eliminar(dialogo.id); setLista((l) => l.filter((x) => x.id !== dialogo.id)); setAviso(""); } catch (e) { setAviso(e.message || "No se pudo eliminar."); } setTrabajando(false); setDialogo(null); };
  return (
    <section aria-label="Mis publicaciones de Comunidad" className="mt-6">
      <h2 className="flex items-center gap-2 mb-2" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.0625rem", color: "#0B1437" }}><Megaphone size={18} aria-hidden="true" /> Mis publicaciones de Comunidad</h2>
      {lista === undefined && <EstadoCarga texto="Cargando..." filas={1} />}
      {error && <EstadoError onReintentar={cargar} />}
      {aviso && <p role="alert" className="text-sm p-3 mb-2" style={{ borderRadius: 12, background: "#FDF1EF", color: "#9A3B34" }}>{aviso}</p>}
      {lista?.length === 0 && !error && <p className="text-sm" style={{ color: "#4A5372", lineHeight: 1.45 }}>Todavía no publicaste nada. Es gratis y lo ven tus vecinos.</p>}
      {lista?.map((p) => {
        const I = ICONO[p.tipo] || Megaphone;
        return (
          <div key={p.id} className="bg-white mb-3" style={{ border: "1px solid #E3E7F1", borderRadius: 20, padding: 14 }}>
            <div className="flex items-center gap-3">
              <span style={{ width: 44, height: 44, borderRadius: 14, background: "#EDF1FF", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><I size={22} color="#2350F5" aria-hidden="true" /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold" style={{ color: "#0B1437", overflowWrap: "anywhere" }}>{p.titulo}</span>
                <span className="block text-sm" style={{ color: "#4A5372" }}>{TIPO[p.tipo]?.singular} · {p.estado === "activa" ? venceEn(p.vence) : ""}</span>
                <span className="inline-block mt-1"><ChipEstado estado={estadoVisible(p) || "activa"} compacto /></span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" onClick={() => onVer(p.id)} style={botonSecundario}>Ver</button>
              <button type="button" onClick={() => onEditar(p)} style={botonSecundario}><Pencil size={16} aria-hidden="true" /> Editar</button>
              {p.estado === "resuelta"
                ? <button type="button" disabled={trabajando} onClick={() => resolver(p, false)} style={botonSecundario}><RotateCcw size={16} aria-hidden="true" /> Activar</button>
                : p.estado === "activa" && <button type="button" disabled={trabajando} onClick={() => resolver(p, true)} style={botonSecundario}><Check size={16} aria-hidden="true" /> Resuelta</button>}
              <button type="button" onClick={() => setDialogo(p)} style={{ ...botonSecundario, color: "#9A3B34" }}><Trash2 size={16} aria-hidden="true" /> Eliminar</button>
            </div>
          </div>
        );
      })}
      <button type="button" onClick={() => onPublicar(null)} className="w-full" style={{ ...botonSecundario, minHeight: 50 }}><Plus size={18} aria-hidden="true" /> Publicar en Comunidad</button>
      {dialogo && (
        <DialogoAdvertencia titulo={`¿Eliminar «${dialogo.titulo}»?`} queHace="Borra esta publicación para siempre." paraQue="Sirve si ya no hace falta o la publicaste por error." queSucedera="Deja de verse para todos los vecinos y no se puede recuperar." textoAceptar="Sí, eliminar" peligro cargando={trabajando} onAceptar={eliminar} onCancelar={() => setDialogo(null)} />
      )}
    </section>
  );
}
