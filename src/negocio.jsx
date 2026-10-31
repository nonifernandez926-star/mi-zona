import { useCallback, useEffect, useState } from "react";
import { Plus, Store, Wrench, Eye, Pencil, Trash2, Power, Share2, Check, ChevronRight, CalendarCheck, Users } from "lucide-react";
import { oficiosApi, alquileresApi, compartidoApi, suscripcionApi } from "./api.js";
import { compartirTexto, compartirFicha, textoInvitacion, avisoDeCompartir } from "./compartir.js";
import { textoLocalidad } from "./localidades.js";
import { ETIQUETA_CATEGORIA, MAX_FICHAS } from "./alquileres.js";
import { Chip, botonPrincipal, botonSecundario } from "./oficios.jsx";
import { GestorArticulos, iconoCategoria } from "./alquileres.jsx";
import ChipEstado from "./componentes/ChipEstado.jsx";
import DialogoAdvertencia from "./componentes/DialogoAdvertencia.jsx";
import { EstadoCarga, EstadoError } from "./componentes/Estados.jsx";
import { BotonVolver } from "./cuenta.jsx";
import { TarjetaInvitaciones, PanelDueno } from "./suscripcion.jsx";
import { BotonPlan, infoNegocio } from "./misFichas.jsx";

// Pestaña «Negocio»: todo lo que la persona ofrece en Mi Zona (negocios, ficha de oficios y fichas de alquiler) en un solo lugar.
// Aparece en la barra de abajo solo cuando la cuenta tiene al menos una de esas fichas.
// Lista de perfiles → se toca uno → su panel (ver, editar, plan, pausar, eliminar y sus herramientas).
// Las pantallas de ver/editar/crear las abre App.jsx (para que el botón «atrás» de Android funcione).

const rubrosTexto = (o, max = 2) => {
  const nombres = [...(o.rubros || []).map((r) => r.label), ...(o.otros || [])];
  return nombres.length > max ? `${nombres.slice(0, max).join(", ")} +${nombres.length - max}` : nombres.join(", ");
};
const tinte = (c, pct) => `${c}${Math.round(pct * 2.55).toString(16).padStart(2, "0")}`;
const COLORES = { negocio: "#1E8A55", oficio: "#E08A12", alquiler: "#2350F5" };
const TITULO = { fontFamily: "var(--fuente-titulo)" };

// Fila de la lista de perfiles (como un contacto de WhatsApp: avatar, nombre, detalle, estado)
function FilaPerfil({ logo, icono: Icono, color, titulo, sub, chip, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left bg-white hover:bg-slate-50" style={{ borderBottom: "1px solid #EEF0F6", minHeight: 76 }}>
      <span className="flex items-center justify-center shrink-0 overflow-hidden" style={{ width: 54, height: 54, borderRadius: 18, background: color, boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)" }}>
        {logo ? <img src={logo} alt="" loading="lazy" className="w-full h-full object-cover" /> : <Icono size={25} color="#fff" aria-hidden="true" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block truncate" style={{ ...TITULO, fontWeight: 700, fontSize: 16, color: "#0B1437" }}>{titulo}</span>
        <span className="block text-[13px] truncate mt-0.5" style={{ color: "#5B6482" }}>{sub}</span>
        <span className="inline-block mt-1">{chip}</span>
      </span>
      <ChevronRight size={18} color="#B9C0D6" aria-hidden="true" />
    </button>
  );
}

// Baldosa de acción del panel (2 por fila). Todas miden lo mismo: el alto lo fija la fila (gridAutoRows: 1fr) y la descripción se corta en 2 renglones.
function Accion({ icono: Icono, color, titulo, desc, onClick, peligro, disabled, punto }) {
  const c = peligro ? "#C1443A" : color;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="relative text-left bg-white transition-all active:scale-[.98] flex flex-col"
      style={{ borderRadius: 20, border: "1px solid #edf0f8", boxShadow: "0 3px 12px rgba(15,22,55,.055)", padding: 16, minHeight: 132, opacity: disabled ? 0.55 : 1 }}>
      <span className="flex items-center justify-center mb-3" style={{ width: 44, height: 44, borderRadius: 14, background: tinte(c, 12) }}><Icono size={21} color={c} aria-hidden="true" /></span>
      {punto && <span aria-label="Pendiente" className="absolute" style={{ top: 14, right: 14, width: 10, height: 10, borderRadius: "50%", background: "#E5484D", border: "2px solid #fff", boxSizing: "content-box" }} />}
      <span className="block text-[15px] font-bold leading-tight" style={{ ...TITULO, color: peligro ? "#9A3B34" : "#0B1437" }}>{titulo}</span>
      {desc && <span className="block text-xs mt-1.5 leading-snug" style={{ color: "#5B6482", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{desc}</span>}
    </button>
  );
}

function Seccion({ titulo, sub, children }) {
  return (
    <section className="mb-7">
      <div className="mb-3 px-0.5"><p style={{ ...TITULO, fontWeight: 800, fontSize: 17, color: "#0B1437", letterSpacing: "-0.01em" }}>{titulo}</p>{sub && <p className="text-xs mt-0.5" style={{ color: "#5B6482" }}>{sub}</p>}</div>
      {children}
    </section>
  );
}

// Tarjeta oscura de identidad del panel de un perfil (la misma que ya tenía el panel del negocio)
export function TarjetaIdentidad({ logo, icono: Icono, color, titulo, sub, chip, onVer, textoVer = "Ver cómo lo ven mis clientes" }) {
  return (
    <div data-conservar-color className="relative overflow-hidden p-4 mb-3" style={{ borderRadius: 22, background: "radial-gradient(420px 220px at 105% -20%, rgba(var(--azul-brillo-rgb),.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(var(--azul-claro-rgb),.22), transparent 60%), var(--azul-oscuro)", boxShadow: "0 14px 30px rgba(11,20,55,.28)" }}>
      <div style={{ position: "absolute", top: -50, right: -40, width: 150, height: 150, borderRadius: "50%", background: "#ffffff12" }} />
      <div className="relative flex items-center gap-3.5">
        <div className="shrink-0 overflow-hidden flex items-center justify-center" style={{ width: 62, height: 62, borderRadius: 20, background: color, border: "3px solid #ffffff55" }}>
          {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : <Icono size={28} color="#fff" aria-hidden="true" />}
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ ...TITULO, fontWeight: 700, fontSize: 18, color: "#fff", overflowWrap: "anywhere" }}>{titulo}</p>
          <p className="text-xs" style={{ color: "var(--azul-palido)" }}>{sub}</p>
          {chip && <span className="inline-block mt-1.5">{chip}</span>}
        </div>
      </div>
      {onVer && <button type="button" onClick={onVer} className="relative w-full flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 mt-4" style={{ borderRadius: 14, background: "#ffffff1f", color: "#fff", border: "1px solid #ffffff33", minHeight: 44 }}><Eye size={15} aria-hidden="true" /> {textoVer}</button>}
    </div>
  );
}

export default function NegocioScreen({
  negocios, sel, setSel, catInfo, onResumen, onAgregar, onAgenda, renderNegocio,
  onVerNegocio, onEditarNegocio, onEliminarNegocio, onVerOficio, onEditarOficio, onVerAlquiler, onEditarAlquiler, onActivar,
}) {
  const [oficio, setOficio] = useState(undefined); // undefined = cargando · null = no tiene
  const [alquileres, setAlquileres] = useState(undefined); // undefined = cargando · [] = no tiene
  const [error, setError] = useState(false);
  const [dialogo, setDialogo] = useState(null); // { tipo, dato }
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [avisoCompartir, setAvisoCompartir] = useState("");
  const [marcados, setMarcados] = useState([]);
  const [invitaciones, setInvitaciones] = useState(null);
  const cargarInvitaciones = useCallback(() => { suscripcionApi.estado().then((e) => setInvitaciones(e.invitaciones)).catch(() => {}); }, []);
  useEffect(() => { cargarInvitaciones(); }, [cargarInvitaciones]);
  const cargar = useCallback(() => {
    setError(false);
    oficiosApi.mio().then(setOficio).catch(() => { setError(true); setOficio(null); });
    alquileresApi.mios().then(setAlquileres).catch(() => { setError(true); setAlquileres([]); });
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const cargando = oficio === undefined || alquileres === undefined;
  // App.jsx necesita saber si la cuenta tiene fichas para mostrar (u ocultar) la pestaña
  useEffect(() => { if (!cargando) onResumen?.({ oficio: !!oficio, alquileres: alquileres.length }); }, [cargando, oficio, alquileres?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const correr = async (accion, mensajeOk) => {
    setTrabajando(true); setAviso(null);
    try { await accion(); if (mensajeOk) setAviso({ ok: mensajeOk }); } catch (e) { setAviso({ error: e.message || "No se pudo completar. Probá de nuevo." }); }
    setTrabajando(false); setDialogo(null);
  };
  const reemplazarAlquiler = (a) => setAlquileres((l) => (l || []).map((x) => (x.id === a.id ? { ...x, ...a } : x)));
  const textos = dialogo && ({
    pausarOficio: { titulo: "¿Pausar tu ficha de oficios?", queHace: "Oculta tu ficha.", paraQue: "Sirve si no podés tomar trabajos por un tiempo.", queSucedera: "No aparece en búsquedas ni listados y nadie puede abrirla. No se borra nada: podés activarla de nuevo cuando quieras.", textoAceptar: "Sí, pausar" },
    activarOficio: { titulo: "¿Activar tu ficha otra vez?", queHace: "Vuelve a publicar tu ficha.", paraQue: "Sirve para que te encuentren de nuevo.", queSucedera: "Va a ser pública otra vez y otras personas podrán contactarte.", textoAceptar: "Sí, activar" },
    eliminarOficio: { titulo: "¿Eliminar tu ficha de oficios?", queHace: "Borra tu ficha para siempre, con sus fotos y datos.", paraQue: "Sirve si ya no querés ofrecer tus servicios en Mi Zona.", queSucedera: "Desaparece de las búsquedas y de los favoritos. No se puede deshacer. Si solo querés frenarla un tiempo, mejor pausala.", textoAceptar: "Sí, eliminar", peligro: true },
    pausarAlquiler: { titulo: `¿Pausar «${dialogo.dato?.nombre}»?`, queHace: "Oculta esta ficha de alquiler.", paraQue: "Sirve si por un tiempo no alquilás.", queSucedera: "No aparece en búsquedas ni listados y nadie puede abrirla. No se borra nada ni se pierden tus artículos: podés activarla de nuevo cuando quieras.", textoAceptar: "Sí, pausar" },
    activarAlquiler: { titulo: `¿Activar «${dialogo.dato?.nombre}» otra vez?`, queHace: "Vuelve a publicar esta ficha.", paraQue: "Sirve para que te encuentren de nuevo.", queSucedera: "Va a ser pública otra vez y otras personas podrán consultarte. Revisá que el estado de tus artículos esté al día.", textoAceptar: "Sí, activar" },
    eliminarAlquiler: { titulo: `¿Eliminar «${dialogo.dato?.nombre}»?`, queHace: "Borra esta ficha para siempre, con todos sus artículos, fotos y datos.", paraQue: "Sirve si ya no querés ofrecer estos alquileres en Mi Zona.", queSucedera: "Desaparece de las búsquedas y de los favoritos. No se puede deshacer. Si solo querés frenarla un tiempo, mejor pausala.", textoAceptar: "Sí, eliminar", peligro: true },
    eliminarNegocio: { titulo: `¿Eliminar ${dialogo.dato?.nombre}?`, queHace: "Borra tu negocio para siempre, con sus reseñas, promociones y estadísticas.", paraQue: "Sirve si ya no querés tener este negocio en Mi Zona.", queSucedera: "Desaparece de las búsquedas, del mapa y de los favoritos. No se puede deshacer y la suscripción que ya pagaste no se reembolsa. Si no querés perderlo, no lo elimines.", textoAceptar: "Sí, eliminar", peligro: true },
  })[dialogo.tipo];
  const confirmar = () => {
    const t = dialogo.tipo, d = dialogo.dato;
    if (t === "pausarOficio" || t === "activarOficio") return correr(async () => setOficio(await oficiosApi.estado(oficio.id, t === "pausarOficio" ? "paused" : "active")), t === "pausarOficio" ? "Tu ficha quedó pausada." : "Tu ficha está activa otra vez.");
    if (t === "eliminarOficio") return correr(async () => { await oficiosApi.eliminar(oficio.id); setOficio(null); setSel(null); }, "Tu ficha de oficios se eliminó.");
    if (t === "pausarAlquiler" || t === "activarAlquiler") return correr(async () => reemplazarAlquiler(await alquileresApi.estado(d.id, t === "pausarAlquiler" ? "paused" : "active")), t === "pausarAlquiler" ? "Tu ficha quedó pausada." : "Tu ficha está activa otra vez.");
    if (t === "eliminarAlquiler") return correr(async () => { await alquileresApi.eliminar(d.id); setAlquileres((l) => l.filter((x) => x.id !== d.id)); setSel(null); }, "Tu ficha de alquiler se eliminó.");
    return correr(async () => { await onEliminarNegocio(d.id); setSel(null); }, "Tu negocio se eliminó.");
  };
  const disponibilidad = (valor) => correr(async () => setOficio(await oficiosApi.disponibilidad(oficio.id, valor)));
  const compartir = async (ficha) => { setAviso(null); const r = await compartirFicha(ficha); const t = avisoDeCompartir(r); if (t) setAviso({ error: t }); };

  // Recordatorio del paso de compartir: fichas activas cuyo dueño todavía no completó el menú de compartir
  const pendientes = cargando ? [] : [
    ...(negocios || []).filter((n) => !n.compartioEn && !n.pendientePago).map((n) => ({ tipo: "negocio", id: n.id })),
    ...(oficio && oficio.estado === "activa" && !oficio.compartioEn ? [{ tipo: "oficio", id: oficio.id }] : []),
    ...(alquileres || []).filter((a) => a.estado === "activa" && !a.compartioEn).map((a) => ({ tipo: "alquiler", id: a.id })),
  ].filter((p) => !marcados.includes(`${p.tipo}:${p.id}`));
  const compartirMiZona = async () => {
    setAvisoCompartir("");
    const r = await compartirTexto({ titulo: "Mi Zona", texto: textoInvitacion("", invitaciones?.codigo || "") });
    if (r !== "compartido") { setAvisoCompartir(avisoDeCompartir(r) || ""); return; }
    setMarcados((m) => [...m, ...pendientes.map((p) => `${p.tipo}:${p.id}`)]);
    await Promise.allSettled(pendientes.map((p) => compartidoApi.marcar(p.tipo, p.id)));
  };

  const mensajes = (
    <>
      {aviso?.ok && <p role="status" className="text-sm mb-3 p-3 flex items-center gap-2" style={{ borderRadius: 12, background: "#EBF7F0", color: "#1E6B44", fontWeight: 600 }}><Check size={16} aria-hidden="true" /> {aviso.ok}</p>}
      {aviso?.error && <p role="alert" className="text-sm mb-3 p-3" style={{ borderRadius: 12, background: "#FDF1EF", color: "#9A3B34" }}>{aviso.error}</p>}
    </>
  );
  const dialogoAdv = textos && <DialogoAdvertencia {...textos} cargando={trabajando} onAceptar={confirmar} onCancelar={() => !trabajando && setDialogo(null)} />;

  /* ================= panel de un perfil ================= */
  if (sel) {
    const volver = () => setSel(null);
    if (sel.tipo === "negocio") {
      const n = (negocios || []).find((x) => x.id === sel.id);
      if (!n) return <div><BotonVolver texto="Volver a Negocio" onClick={volver} /><EstadoCarga texto="Cargando..." filas={1} /></div>;
      return (
        <div>
          {mensajes}
          {renderNegocio(n, { volver, eliminar: () => setDialogo({ tipo: "eliminarNegocio", dato: { id: n.id, nombre: n.name || n.nombre } }) })}
          {dialogoAdv}
        </div>
      );
    }
    if (cargando) return <div><BotonVolver texto="Volver a Negocio" onClick={volver} /><EstadoCarga texto="Cargando..." filas={2} /></div>;

    if (sel.tipo === "oficio" && oficio) {
      return (
        <div>
          <BotonVolver texto="Volver a Negocio" onClick={volver} />
          {mensajes}
          <TarjetaIdentidad icono={Wrench} color={COLORES.oficio} titulo={oficio.nombre} sub={`Oficios · ${rubrosTexto(oficio)}`} chip={<ChipEstado estado={oficio.estado} compacto />} onVer={oficio.estado === "activa" ? () => onVerOficio(oficio.id) : undefined} />
          <div className="bg-white p-4 mb-3" style={{ borderRadius: 18, border: "1px solid #E3E7F1" }}>
            <p className="text-sm font-bold mb-1.5" style={{ color: "#0B1437" }}>¿Estás disponible?</p>
            <div className="flex gap-2" role="group" aria-label="Disponibilidad">
              <Chip activo={oficio.disponibilidad === "disponibleHoy"} onClick={() => !trabajando && disponibilidad(true)}>Disponible hoy</Chip>
              <Chip activo={oficio.disponibilidad === "ocupado"} onClick={() => !trabajando && disponibilidad(false)}>Ocupado</Chip>
            </div>
            <p className="text-sm mt-1.5" style={{ color: "#4A5372", lineHeight: 1.4 }}>«Disponible hoy» se apaga solo a medianoche, para no prometer lo que ya no es cierto.</p>
          </div>
          <div className="bg-white p-4 mb-3" style={{ borderRadius: 18, border: "1px solid #E3E7F1" }}>
            <BotonPlan estado={oficio.estado} vence={oficio.vencimiento} onClick={() => onActivar({ tipo: "oficio", id: oficio.id, nombre: oficio.nombre, vencimiento: oficio.vencimiento })} />
            {oficio.estado !== "pendiente" && <div className="mt-3"><PanelDueno tipo="oficio" id={oficio.id} /></div>}
          </div>
          <Seccion titulo="Gestionar mi ficha">
            <div className="grid grid-cols-2 gap-3" style={{ gridAutoRows: "1fr" }}>
              <Accion icono={Pencil} color="#1E8A55" titulo="Editar mis datos" desc="Rubros, fotos, zona, contacto." onClick={() => onEditarOficio(oficio)} />
              <Accion icono={Share2} color="#7A4F9E" titulo="Compartir" desc="Mandala por redes o WhatsApp." onClick={() => compartir({ tipo: "oficio", nombre: oficio.nombre, zona: oficio.localidad ? textoLocalidad(oficio.localidad) : "", detalle: oficio.desc })} />
              {oficio.estado !== "pendiente" && <Accion icono={Power} color="#E08A12" titulo={oficio.estado === "pausada" ? "Activar" : "Pausar"} desc={oficio.estado === "pausada" ? "Volvé a mostrarla." : "Ocultala por un tiempo."} onClick={() => setDialogo({ tipo: oficio.estado === "pausada" ? "activarOficio" : "pausarOficio" })} />}
              <Accion icono={Trash2} peligro titulo="Eliminar ficha" desc="Se borra para siempre." onClick={() => setDialogo({ tipo: "eliminarOficio" })} />
            </div>
          </Seccion>
          {dialogoAdv}
        </div>
      );
    }
    if (sel.tipo === "alquiler") {
      const a = (alquileres || []).find((x) => x.id === sel.id);
      if (a) {
        const I = iconoCategoria(a.categoria);
        return (
          <div>
            <BotonVolver texto="Volver a Negocio" onClick={volver} />
            {mensajes}
            <TarjetaIdentidad logo={a.logo} icono={I} color={COLORES.alquiler} titulo={a.nombre} sub={`Alquileres · ${ETIQUETA_CATEGORIA[a.categoria]} · ${a.cantidadArticulos} ${a.cantidadArticulos === 1 ? "artículo" : "artículos"}`} chip={<ChipEstado estado={a.estado} compacto />} onVer={a.estado === "activa" ? () => onVerAlquiler(a.id) : undefined} />
            <div className="bg-white p-4 mb-3" style={{ borderRadius: 18, border: "1px solid #E3E7F1" }}>
              <BotonPlan estado={a.estado} vence={a.vencimiento} onClick={() => onActivar({ tipo: "alquiler", id: a.id, nombre: a.nombre, vencimiento: a.vencimiento })} />
              {a.estado !== "pendiente" && <div className="mt-3"><PanelDueno tipo="alquiler" id={a.id} /></div>}
            </div>
            <Seccion titulo="Artículos" sub="Cambiá el estado de cada uno con un toque: Disponible, Ocupado o Ya no lo tengo.">
              <div className="bg-white p-3" style={{ borderRadius: 18, border: "1px solid #E3E7F1" }}><GestorArticulos alquiler={a} onCambio={reemplazarAlquiler} /></div>
            </Seccion>
            <Seccion titulo="Gestionar mi ficha">
              <div className="grid grid-cols-2 gap-3" style={{ gridAutoRows: "1fr" }}>
                <Accion icono={Pencil} color="#1E8A55" titulo="Editar mis datos" desc="Nombre, fotos, zona, horarios, contacto." onClick={() => onEditarAlquiler(a)} />
                <Accion icono={Share2} color="#7A4F9E" titulo="Compartir" desc="Mandala por redes o WhatsApp." onClick={() => compartir({ tipo: "alquiler", nombre: a.nombre, zona: a.localidad ? textoLocalidad(a.localidad) : "", detalle: a.desc, imagen: a.logo })} />
                {a.estado !== "pendiente" && <Accion icono={Power} color="#E08A12" titulo={a.estado === "pausada" ? "Activar" : "Pausar"} desc={a.estado === "pausada" ? "Volvé a mostrarla." : "Ocultala por un tiempo."} onClick={() => setDialogo({ tipo: a.estado === "pausada" ? "activarAlquiler" : "pausarAlquiler", dato: a })} />}
                <Accion icono={Trash2} peligro titulo="Eliminar ficha" desc="Se borra para siempre." onClick={() => setDialogo({ tipo: "eliminarAlquiler", dato: a })} />
              </div>
            </Seccion>
            {dialogoAdv}
          </div>
        );
      }
    }
    return <div><BotonVolver texto="Volver a Negocio" onClick={volver} /><EstadoCarga texto="Cargando..." filas={1} /></div>;
  }

  /* ================= lista de perfiles ================= */
  const total = (negocios?.length || 0) + (oficio ? 1 : 0) + (alquileres?.length || 0);
  return (
    <div>
      {mensajes}
      {error && <div className="mb-3"><EstadoError onReintentar={cargar} /></div>}
      <Seccion titulo={`Mis perfiles${total ? ` (${total})` : ""}`} sub="Tocá uno para verlo, editarlo y gestionarlo.">
        {cargando ? <EstadoCarga texto="Cargando tus perfiles..." filas={2} /> : (
          <div className="overflow-hidden" style={{ borderRadius: 22, border: "1px solid #E3E7F1", boxShadow: "0 1px 2px rgba(11,20,55,.04)" }}>
            {negocios?.map((n) => {
              const c = catInfo(n.cat); const i = infoNegocio(n);
              return <FilaPerfil key={`n${n.id}`} logo={n.logo} icono={c?.icon || Store} color={c?.color || COLORES.negocio} titulo={n.name || n.nombre} sub={`Negocio · ${c?.label || ""}${n.zone ? ` · ${n.zone}` : ""}`} chip={<ChipEstado estado={i.estado} texto={i.texto} compacto />} onClick={() => setSel({ tipo: "negocio", id: n.id })} />;
            })}
            {oficio && <FilaPerfil icono={Wrench} color={COLORES.oficio} titulo={oficio.nombre} sub={`Oficios · ${rubrosTexto(oficio)}`} chip={<ChipEstado estado={oficio.estado} compacto />} onClick={() => setSel({ tipo: "oficio", id: oficio.id })} />}
            {alquileres?.map((a) => <FilaPerfil key={`a${a.id}`} logo={a.logo} icono={iconoCategoria(a.categoria)} color={COLORES.alquiler} titulo={a.nombre} sub={`Alquileres · ${ETIQUETA_CATEGORIA[a.categoria]} · ${a.cantidadArticulos} ${a.cantidadArticulos === 1 ? "artículo" : "artículos"}`} chip={<ChipEstado estado={a.estado} compacto />} onClick={() => setSel({ tipo: "alquiler", id: a.id })} />)}
            {total === 0 && !error && <p className="px-4 py-6 text-sm text-center bg-white" style={{ color: "#5B6482", lineHeight: 1.5 }}>Todavía no tenés perfiles. Sumá tu negocio, ofrecé tus servicios o poné algo en alquiler.</p>}
            <button type="button" onClick={onAgregar} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left bg-white hover:bg-slate-50" style={{ minHeight: 68 }}>
              <span className="flex items-center justify-center shrink-0" style={{ width: 54, height: 54, borderRadius: 18, background: "var(--azul-suave)", border: "1.5px dashed var(--azul)" }}><Plus size={24} color="var(--azul)" aria-hidden="true" /></span>
              <span className="flex-1 min-w-0">
                <span className="block" style={{ ...TITULO, fontWeight: 700, fontSize: 15, color: "var(--azul)" }}>Agregar un perfil</span>
                <span className="block text-[13px] mt-0.5" style={{ color: "#5B6482" }}>Negocio, servicios de oficio o alquiler{alquileres && alquileres.length >= MAX_FICHAS ? " (máximo de alquileres alcanzado)" : ""}</span>
              </span>
            </button>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Herramientas">
        <div className="grid grid-cols-2 gap-3" style={{ gridAutoRows: "1fr" }}>
          {onAgenda && <Accion icono={CalendarCheck} color="#E5484D" titulo="Mi agenda" desc="Eventos, tareas y recordatorios del día." onClick={onAgenda} />}
          <Accion icono={Share2} color="#13897F" titulo="Compartir Mi Zona" desc={pendientes.length > 0 ? "Todavía no la compartiste: invitá a tus clientes." : "Invitá a tus clientes a descargar la app."} onClick={compartirMiZona} punto={pendientes.length > 0} />
        </div>
        {avisoCompartir && <p role="status" className="text-sm mt-2" style={{ color: "#6B4510", lineHeight: 1.45 }}>{avisoCompartir}</p>}
      </Seccion>

      <TarjetaInvitaciones invitaciones={invitaciones} onCambio={cargarInvitaciones} />
      {dialogoAdv}
    </div>
  );
}
