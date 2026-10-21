import { useCallback, useEffect, useState } from "react";
import { Share2, Users, Wrench, Plus, Pencil, Trash2, Power, Check, Store, Eye, Package, ChevronDown, CalendarPlus } from "lucide-react";
import { oficiosApi, alquileresApi, compartidoApi, suscripcionApi } from "./api.js";
import { compartirTexto, textoInvitacion, avisoDeCompartir } from "./compartir.js";
import { ETIQUETA_CATEGORIA, MAX_FICHAS } from "./alquileres.js";
import { Pagina, Chip, botonPrincipal, botonSecundario } from "./oficios.jsx";
import { GestorArticulos, iconoCategoria } from "./alquileres.jsx";
import ChipEstado from "./componentes/ChipEstado.jsx";
import DialogoAdvertencia from "./componentes/DialogoAdvertencia.jsx";
import ComoFunciona from "./componentes/ComoFunciona.jsx";
import { EstadoCarga, EstadoVacio, EstadoError, EstadoExito } from "./componentes/Estados.jsx";
import PasoCompartir from "./componentes/PasoCompartir.jsx";
import { MisPublicaciones } from "./comunidad.jsx";
import { infoSuscripcion } from "./cuenta.jsx";
import { TarjetaInvitaciones, PanelDueno } from "./suscripcion.jsx";

// "Mis fichas": todo lo que la persona ofrece en Mi Zona (negocios, ficha de oficios y fichas de alquiler) y su gestión.
// Las pantallas de crear/editar/ver las abre App.jsx (para que el botón "atrás" de Android funcione).

const rubrosTexto = (o, max = 3) => {
  const nombres = [...(o.rubros || []).map((r) => r.label), ...(o.otros || [])];
  return nombres.length > max ? `${nombres.slice(0, max).join(", ")} +${nombres.length - max}` : nombres.join(", ");
};

// Estado de un negocio propio, con las mismas reglas que Mi cuenta (pendiente de pago, activa, por vencer, vencida)
function infoNegocio(n) {
  const i = infoSuscripcion(n);
  if (!i) return { estado: "activa" };
  if (i.estado === "pendiente") return { estado: "pendiente" };
  if (i.estado === "vencida") return { estado: "vencida" };
  return i.estado === "por_vencer" ? { estado: "activa", texto: `Vence en ${i.dias} ${i.dias === 1 ? "día" : "días"}` } : { estado: "activa" };
}

const fmtVence = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "");
// Línea de plan de una ficha: hasta cuándo está activa, y el botón para activarla o agregarle tiempo (mes gratis, Google Play o días de invitación)
function BotonPlan({ estado, vence, onClick }) {
  const pendiente = estado === "pendiente";
  return (
    <div className="w-full">
      <p className="text-sm mb-1.5" style={{ color: "#4A5372", lineHeight: 1.4 }}>
        {pendiente ? "Todavía no se muestra: activala con tu mes gratis o un plan." : estado === "vencida" ? `Venció el ${fmtVence(vence)}. No se borró nada: al renovar vuelve a mostrarse.` : vence ? `Activa hasta el ${fmtVence(vence)}.` : ""}
      </p>
      <button type="button" onClick={onClick} style={{ ...(pendiente || estado === "vencida" ? botonPrincipal : botonSecundario), width: "100%", minHeight: 48 }}><CalendarPlus size={17} aria-hidden="true" /> {pendiente ? "Activar mi ficha" : estado === "vencida" ? "Renovar" : "Agregar tiempo"}</button>
    </div>
  );
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

export function MisFichasScreen({ usuario, negocios, onVolver, onVerNegocio, onEditarNegocio, onEliminarNegocio, onVerOficio, onEditarOficio, onCrearOficio, onAgregarNegocio, onActivar, onVerAlquiler, onEditarAlquiler, onCrearAlquiler, comunidad, refrescar }) {
  const [oficio, setOficio] = useState(undefined); // undefined = cargando · null = no tiene
  const [alquileres, setAlquileres] = useState(undefined); // undefined = cargando · [] = no tiene
  const [error, setError] = useState(false);
  const [abierta, setAbierta] = useState(null); // id de la ficha de alquiler con los artículos desplegados
  const [dialogo, setDialogo] = useState(null); // { tipo, dato }
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [marcados, setMarcados] = useState([]); // fichas que se acaban de marcar como "ya compartió" (para ocultar el recordatorio al instante)
  const [avisoCompartir, setAvisoCompartir] = useState("");
  const [invitaciones, setInvitaciones] = useState(null); // código de invitación, días ganados y días disponibles
  useEffect(() => { suscripcionApi.estado().then((e) => setInvitaciones(e.invitaciones)).catch(() => {}); }, []);
  const codigoInvitacion = invitaciones?.codigo || "";
  const cargar = useCallback(() => {
    setError(false);
    oficiosApi.mio().then(setOficio).catch(() => { setError(true); setOficio(null); });
    alquileresApi.mios().then(setAlquileres).catch(() => { setError(true); setAlquileres([]); });
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const correr = async (accion, mensajeOk) => {
    setTrabajando(true); setAviso(null);
    try { await accion(); if (mensajeOk) setAviso({ ok: mensajeOk }); } catch (e) { setAviso({ error: e.message || "No se pudo completar. Probá de nuevo." }); }
    setTrabajando(false); setDialogo(null);
  };
  const disponibilidad = (valor) => correr(async () => setOficio(await oficiosApi.disponibilidad(oficio.id, valor)));
  const reemplazarAlquiler = (a) => setAlquileres((l) => (l || []).map((x) => (x.id === a.id ? a : x)));

  const textos = dialogo && ({
    pausar: { titulo: "¿Pausar tu ficha de oficios?", queHace: "Oculta tu ficha.", paraQue: "Sirve si no podés tomar trabajos por un tiempo.", queSucedera: "No aparece en búsquedas ni listados y nadie puede abrirla. No se borra nada: podés activarla de nuevo cuando quieras.", textoAceptar: "Sí, pausar" },
    activar: { titulo: "¿Activar tu ficha otra vez?", queHace: "Vuelve a publicar tu ficha.", paraQue: "Sirve para que te encuentren de nuevo.", queSucedera: "Va a ser pública otra vez y otras personas podrán contactarte.", textoAceptar: "Sí, activar" },
    eliminarOficio: { titulo: "¿Eliminar tu ficha de oficios?", queHace: "Borra tu ficha para siempre, con sus fotos y datos.", paraQue: "Sirve si ya no querés ofrecer tus servicios en Mi Zona.", queSucedera: "Desaparece de las búsquedas y de los favoritos. No se puede deshacer. Si solo querés frenarla un tiempo, mejor pausala.", textoAceptar: "Sí, eliminar", peligro: true },
    eliminarNegocio: { titulo: `¿Eliminar ${dialogo.dato?.nombre}?`, queHace: "Borra tu negocio para siempre, con sus reseñas, promociones y estadísticas.", paraQue: "Sirve si ya no querés tener este negocio en Mi Zona.", queSucedera: "Desaparece de las búsquedas, del mapa y de los favoritos. No se puede deshacer y la suscripción que ya pagaste no se reembolsa. Si no querés perderlo, no lo elimines.", textoAceptar: "Sí, eliminar", peligro: true },
    pausarAlquiler: { titulo: `¿Pausar «${dialogo.dato?.nombre}»?`, queHace: "Oculta esta ficha de alquiler.", paraQue: "Sirve si por un tiempo no alquilás.", queSucedera: "No aparece en búsquedas ni listados y nadie puede abrirla. No se borra nada ni se pierden tus artículos: podés activarla de nuevo cuando quieras.", textoAceptar: "Sí, pausar" },
    activarAlquiler: { titulo: `¿Activar «${dialogo.dato?.nombre}» otra vez?`, queHace: "Vuelve a publicar esta ficha.", paraQue: "Sirve para que te encuentren de nuevo.", queSucedera: "Va a ser pública otra vez y otras personas podrán consultarte. Revisá que el estado de tus artículos esté al día.", textoAceptar: "Sí, activar" },
    eliminarAlquiler: { titulo: `¿Eliminar «${dialogo.dato?.nombre}»?`, queHace: "Borra esta ficha para siempre, con todos sus artículos, fotos y datos.", paraQue: "Sirve si ya no querés ofrecer estos alquileres en Mi Zona.", queSucedera: "Desaparece de las búsquedas y de los favoritos. No se puede deshacer. Si solo querés frenarla un tiempo, mejor pausala.", textoAceptar: "Sí, eliminar", peligro: true },
  })[dialogo.tipo];

  const confirmar = () => {
    const t = dialogo.tipo, d = dialogo.dato;
    if (t === "pausar" || t === "activar") return correr(async () => setOficio(await oficiosApi.estado(oficio.id, t === "pausar" ? "paused" : "active")), t === "pausar" ? "Tu ficha quedó pausada." : "Tu ficha está activa otra vez.");
    if (t === "eliminarOficio") return correr(async () => { await oficiosApi.eliminar(oficio.id); setOficio(null); }, "Tu ficha de oficios se eliminó.");
    if (t === "pausarAlquiler" || t === "activarAlquiler") return correr(async () => reemplazarAlquiler(await alquileresApi.estado(d.id, t === "pausarAlquiler" ? "paused" : "active")), t === "pausarAlquiler" ? "Tu ficha quedó pausada." : "Tu ficha está activa otra vez.");
    if (t === "eliminarAlquiler") return correr(async () => { await alquileresApi.eliminar(d.id); setAlquileres((l) => l.filter((x) => x.id !== d.id)); }, "Tu ficha de alquiler se eliminó.");
    return correr(async () => { await onEliminarNegocio(d.id); }, "Tu negocio se eliminó.");
  };

  const cargando = oficio === undefined || alquileres === undefined;
  // Recordatorio del paso de compartir: fichas activas cuyo dueño todavía no completó el menú de compartir
  const pendientes = cargando ? [] : [
    ...(negocios || []).filter((n) => !n.compartioEn && !n.pendientePago).map((n) => ({ tipo: "negocio", id: n.id })),
    ...(oficio && oficio.estado === "activa" && !oficio.compartioEn ? [{ tipo: "oficio", id: oficio.id }] : []),
    ...(alquileres || []).filter((a) => a.estado === "activa" && !a.compartioEn).map((a) => ({ tipo: "alquiler", id: a.id })),
  ].filter((p) => !marcados.includes(`${p.tipo}:${p.id}`));
  const compartirMiZona = async () => {
    setAvisoCompartir("");
    const r = await compartirTexto({ titulo: "Mi Zona", texto: textoInvitacion("", codigoInvitacion) });
    if (r !== "compartido") { setAvisoCompartir(avisoDeCompartir(r) || ""); return; }
    setMarcados((m) => [...m, ...pendientes.map((p) => `${p.tipo}:${p.id}`)]);
    await Promise.allSettled(pendientes.map((p) => compartidoApi.marcar(p.tipo, p.id))); // si alguna falla, el recordatorio vuelve la próxima vez
  };
  const total = (negocios?.length || 0) + (oficio ? 1 : 0) + (alquileres?.length || 0);

  return (
    <Pagina titulo="Mis fichas" onVolver={onVolver}>
      <ComoFunciona pasos={["Acá ves todo lo que ofrecés en Mi Zona: tu negocio, tu ficha de oficios y tus fichas de alquiler.", "Tocá una ficha para verla, editarla, pausarla o eliminarla.", "En los alquileres, cambiá el estado de cada artículo con un toque: Disponible, Ocupado o Ya no lo tengo.", "Pausar oculta la ficha sin borrar nada. Eliminar la borra para siempre.", "Cada ficha empieza con un mes gratis. Después podés comprar 1, 3 o 6 meses con Google Play: se suman al tiempo que te queda."]} />
      {aviso?.ok && <p role="status" className="text-sm mt-3 p-3 flex items-center gap-2" style={{ borderRadius: 12, background: "#EBF7F0", color: "#1E6B44", fontWeight: 600 }}><Check size={16} aria-hidden="true" /> {aviso.ok}</p>}
      {aviso?.error && <p role="alert" className="text-sm mt-3 p-3" style={{ borderRadius: 12, background: "#FDF1EF", color: "#9A3B34" }}>{aviso.error}</p>}
      {pendientes.length > 0 && (
        <section aria-label="Compartir Mi Zona" className="mt-3" style={{ background: "#EDF1FF", border: "1px solid #C9D6FA", borderRadius: 18, padding: 14 }}>
          <p className="flex items-center gap-2 font-bold" style={{ color: "#0B1437", fontSize: "1rem" }}><Users size={18} aria-hidden="true" /> Todavía no compartiste Mi Zona</p>
          <p className="text-sm mt-1" style={{ color: "#2B3768", lineHeight: 1.45 }}>Para que tus clientes puedan encontrarte, necesitan descargar la app. Compártela con ellos.</p>
          <button type="button" onClick={compartirMiZona} className="w-full mt-3" style={{ ...botonPrincipal, minHeight: 50 }}><Share2 size={18} aria-hidden="true" /> Compartir Mi Zona</button>
          {avisoCompartir && <p role="status" className="text-sm mt-2" style={{ color: "#6B4510", lineHeight: 1.45 }}>{avisoCompartir}</p>}
        </section>
      )}
      <TarjetaInvitaciones invitaciones={invitaciones} onCambio={() => suscripcionApi.estado().then((e) => setInvitaciones(e.invitaciones)).catch(() => {})} />
      <div className="mt-4" />

      {cargando && <EstadoCarga texto="Cargando tus fichas..." filas={2} />}
      {error && <EstadoError onReintentar={cargar} />}

      {negocios?.map((n) => {
        const i = infoNegocio(n);
        return (
          <FilaFicha key={n.id} icono={Store} tono="#DCEFE4" titulo={n.name || n.nombre} sub="Negocio" chip={<ChipEstado estado={i.estado} texto={i.texto} compacto />}>
            <BotonPlan estado={i.estado} vence={n.pendientePago ? null : n.expiresAt} onClick={() => onActivar({ tipo: "negocio", id: n.id, nombre: n.name || n.nombre, vencimiento: n.pendientePago ? null : n.expiresAt })} />
            {!n.pendientePago && <PanelDueno tipo="negocio" id={n.id} />}
            <button type="button" onClick={() => onVerNegocio(n.id)} style={botonSecundario}><Eye size={16} aria-hidden="true" /> Ver</button>
            <button type="button" onClick={() => onEditarNegocio(n.id)} style={botonSecundario}><Pencil size={16} aria-hidden="true" /> Editar</button>
            <button type="button" onClick={() => setDialogo({ tipo: "eliminarNegocio", dato: { id: n.id, nombre: n.name || n.nombre } })} style={{ ...botonSecundario, color: "#9A3B34" }}><Trash2 size={16} aria-hidden="true" /> Eliminar</button>
          </FilaFicha>
        );
      })}

      {oficio && (
        <FilaFicha icono={Wrench} tono="#FFE8C2" titulo={oficio.nombre} sub={`Oficios · ${rubrosTexto(oficio)}`} chip={<ChipEstado estado={oficio.estado} compacto />}>
          <div className="w-full">
            <p className="text-sm font-bold mb-1.5" style={{ color: "#0B1437" }}>¿Estás disponible?</p>
            <div className="flex gap-2" role="group" aria-label="Disponibilidad">
              <Chip activo={oficio.disponibilidad === "disponibleHoy"} onClick={() => !trabajando && disponibilidad(true)}>Disponible hoy</Chip>
              <Chip activo={oficio.disponibilidad === "ocupado"} onClick={() => !trabajando && disponibilidad(false)}>Ocupado</Chip>
            </div>
            <p className="text-sm mt-1.5" style={{ color: "#4A5372", lineHeight: 1.4 }}>«Disponible hoy» se apaga solo a medianoche, para no prometer lo que ya no es cierto.</p>
          </div>
          <BotonPlan estado={oficio.estado} vence={oficio.vencimiento} onClick={() => onActivar({ tipo: "oficio", id: oficio.id, nombre: oficio.nombre, vencimiento: oficio.vencimiento })} />
          {oficio.estado !== "pendiente" && <PanelDueno tipo="oficio" id={oficio.id} />}
          {oficio.estado === "activa" && <button type="button" onClick={() => onVerOficio(oficio.id)} style={botonSecundario}><Eye size={16} aria-hidden="true" /> Ver</button>}
          <button type="button" onClick={() => onEditarOficio(oficio)} style={botonSecundario}><Pencil size={16} aria-hidden="true" /> Editar</button>
          {oficio.estado === "pendiente" ? null : oficio.estado === "pausada"
            ? <button type="button" onClick={() => setDialogo({ tipo: "activar" })} style={botonSecundario}><Power size={16} aria-hidden="true" /> Activar</button>
            : <button type="button" onClick={() => setDialogo({ tipo: "pausar" })} style={botonSecundario}><Power size={16} aria-hidden="true" /> Pausar</button>}
          <button type="button" onClick={() => setDialogo({ tipo: "eliminarOficio" })} style={{ ...botonSecundario, color: "#9A3B34" }}><Trash2 size={16} aria-hidden="true" /> Eliminar</button>
        </FilaFicha>
      )}
      {oficio?.estado === "pausada" && <p className="text-sm px-1 mb-3" style={{ color: "#4A5372" }}>Tu ficha de oficios está pausada: nadie puede verla hasta que la actives.</p>}

      {alquileres?.map((a) => {
        const I = iconoCategoria(a.categoria);
        const desplegada = abierta === a.id;
        return (
          <FilaFicha key={a.id} icono={I} tono="#E3E8FD" titulo={a.nombre} sub={`Alquileres · ${ETIQUETA_CATEGORIA[a.categoria]} · ${a.cantidadArticulos} ${a.cantidadArticulos === 1 ? "artículo" : "artículos"}`} chip={<ChipEstado estado={a.estado} compacto />}>
            <button type="button" onClick={() => setAbierta(desplegada ? null : a.id)} aria-expanded={desplegada} style={{ ...botonSecundario, background: desplegada ? "#EDF1FF" : "#fff", borderColor: desplegada ? "#2350F5" : "#CFD6E8" }}>
              <Package size={16} aria-hidden="true" /> Artículos <ChevronDown size={14} aria-hidden="true" style={{ transform: desplegada ? "rotate(180deg)" : "none" }} />
            </button>
            <BotonPlan estado={a.estado} vence={a.vencimiento} onClick={() => onActivar({ tipo: "alquiler", id: a.id, nombre: a.nombre, vencimiento: a.vencimiento })} />
            {a.estado !== "pendiente" && <PanelDueno tipo="alquiler" id={a.id} />}
            {a.estado === "activa" && <button type="button" onClick={() => onVerAlquiler(a.id)} style={botonSecundario}><Eye size={16} aria-hidden="true" /> Ver</button>}
            <button type="button" onClick={() => onEditarAlquiler(a)} style={botonSecundario}><Pencil size={16} aria-hidden="true" /> Editar</button>
            {a.estado === "pendiente" ? null : a.estado === "pausada"
              ? <button type="button" onClick={() => setDialogo({ tipo: "activarAlquiler", dato: a })} style={botonSecundario}><Power size={16} aria-hidden="true" /> Activar</button>
              : <button type="button" onClick={() => setDialogo({ tipo: "pausarAlquiler", dato: a })} style={botonSecundario}><Power size={16} aria-hidden="true" /> Pausar</button>}
            <button type="button" onClick={() => setDialogo({ tipo: "eliminarAlquiler", dato: a })} style={{ ...botonSecundario, color: "#9A3B34" }}><Trash2 size={16} aria-hidden="true" /> Eliminar</button>
            {desplegada && <div className="w-full mt-1"><GestorArticulos alquiler={a} onCambio={reemplazarAlquiler} /></div>}
            {a.estado === "pausada" && <p className="w-full text-sm" style={{ color: "#4A5372" }}>Esta ficha está pausada: nadie puede verla hasta que la actives.</p>}
          </FilaFicha>
        );
      })}

      {!cargando && !error && total === 0 && <EstadoVacio icono={Store} titulo="Todavía no tenés fichas" mensaje="Podés sumar tu negocio, ofrecer tus servicios de oficio o poner en alquiler lo que tengas." />}
      {!cargando && !error && (
        <div className="flex flex-col gap-2 mt-2">
          {!oficio && <button type="button" onClick={onCrearOficio} style={{ ...botonPrincipal, width: "100%" }}><Plus size={18} aria-hidden="true" /> Ofrecer mis servicios (oficios)</button>}
          {alquileres.length < MAX_FICHAS
            ? <button type="button" onClick={onCrearAlquiler} style={{ ...botonSecundario, minHeight: 50 }}><Plus size={18} aria-hidden="true" /> Ofrecer en alquiler</button>
            : <p className="text-sm px-1" style={{ color: "#4A5372" }}>Llegaste al máximo de {MAX_FICHAS} fichas de alquiler. Eliminá una para crear otra.</p>}
          <button type="button" onClick={onAgregarNegocio} style={{ ...botonSecundario, minHeight: 50 }}><Plus size={18} aria-hidden="true" /> Agregar un negocio</button>
        </div>
      )}
      {comunidad && !cargando && !error && <MisPublicaciones onVer={comunidad.onVer} onEditar={comunidad.onEditar} onPublicar={comunidad.onPublicar} />}
      {textos && <DialogoAdvertencia {...textos} cargando={trabajando} onAceptar={confirmar} onCancelar={() => !trabajando && setDialogo(null)} />}
    </Pagina>
  );
}

// Paso final al activar un negocio (Fase 6): confirma que ya está publicado y propone compartir Mi Zona (igual que oficios y alquileres)
export function PasoNegocioActivado({ negocio, onListo }) {
  const nombre = negocio.name || negocio.nombre || "Tu negocio";
  return (
    <Pagina titulo="Tu negocio está publicado" onVolver={onListo}>
      <EstadoExito titulo="¡Listo! Tu negocio ya es público" mensaje={`${nombre} ya aparece en Mi Zona. Podés editarlo desde Mis fichas.`} />
      <PasoCompartir tipo="negocio" ficha={{ id: negocio.id, nombre }} onSalir={onListo} />
    </Pagina>
  );
}
