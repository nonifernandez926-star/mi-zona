// Mis pedidos: los pedidos que hizo la persona en los asistentes de los negocios, con el estado que le pone cada dueño
// desde Mi Asistente (pendiente → confirmado → en preparación → listo → entregado). Se actualiza sola y avisa cuando está listo.
import { useEffect, useMemo, useState } from "react";
import { Package, RefreshCw, Check, Truck, Store, CreditCard, AlertTriangle, ChevronRight } from "lucide-react";
import { BotonAtras } from "./cuenta.jsx";
import { TONOS } from "./tonos.js";

const PASOS = [
  { id: "pendiente", nombre: "Enviado" },
  { id: "confirmado", nombre: "Confirmado" },
  { id: "en_preparacion", nombre: "En preparación" },
  { id: "listo", nombre: "Listo" },
  { id: "entregado", nombre: "Entregado" },
];
const ESTADO = {
  pendiente: { texto: "Esperando confirmación", tono: "naranja" },
  confirmado: { texto: "Confirmado", tono: "azul" },
  en_preparacion: { texto: "En preparación", tono: "violeta" },
  listo: { texto: "Listo", tono: "verde" },
  entregado: { texto: "Entregado", tono: null },
};
const PAGO = {
  esperando_comprobante: { texto: "Falta enviar el comprobante de la transferencia", tono: "naranja", Icon: AlertTriangle },
  comprobante_recibido: { texto: "Comprobante recibido: el negocio lo está revisando", tono: "azul", Icon: CreditCard },
  verificado: { texto: "Pago confirmado por el negocio", tono: "verde", Icon: Check },
  rechazado: { texto: "El negocio no pudo confirmar el pago: hablá con él por el chat", tono: "rojo", Icon: AlertTriangle },
};

const pesos = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const TITULO = { fontFamily: "var(--fuente-titulo)", color: "#0B1437" };

function fecha(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return `Hoy · ${hora}`;
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return `Ayer · ${hora}`;
  return `${d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "")} · ${hora}`;
}

function Pastilla({ estado }) {
  const e = ESTADO[estado] || ESTADO.pendiente;
  const t = e.tono ? TONOS[e.tono] : null;
  return (
    <span className="text-[11px] font-bold px-2.5 py-1 shrink-0" style={{ borderRadius: 999, background: t ? t.bg : "#EEF0F6", color: t ? t.fg : "#5B6482", boxShadow: t ? `inset 0 0 0 1px ${t.aro}` : "none" }}>
      {e.texto}
    </span>
  );
}

// Línea de progreso: pasos hechos en el color de acento, el actual con un halo, los que faltan en gris
function Progreso({ estado }) {
  const actual = Math.max(0, PASOS.findIndex((p) => p.id === estado));
  return (
    <ol className="flex items-start" style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label={`Estado del pedido: ${ESTADO[estado]?.texto || estado}`}>
      {PASOS.map((p, i) => {
        const hecho = i < actual, ahora = i === actual;
        return (
          <li key={p.id} className="flex-1 flex flex-col items-center relative" aria-current={ahora ? "step" : undefined}>
            {i > 0 && <span className="absolute" style={{ top: 11, right: "50%", width: "100%", height: 3, borderRadius: 2, background: i <= actual ? "var(--azul)" : "#E3E7F1" }} />}
            <span className="relative flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: "50%", zIndex: 1, background: hecho || ahora ? "var(--azul)" : "#fff", border: hecho || ahora ? "none" : "2px solid #D5DBEA", boxShadow: ahora ? "0 0 0 5px rgba(var(--azul-rgb), .18)" : "none" }}>
              {hecho && <Check size={14} color="#fff" strokeWidth={3.4} />}
              {ahora && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
            </span>
            <span className="text-[10px] text-center mt-1.5 px-0.5" style={{ color: ahora ? "#0B1437" : hecho ? "#2B3768" : "#8D95B0", fontWeight: ahora ? 800 : 600, lineHeight: 1.2 }}>{p.nombre}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Tarjeta({ p, onAbrirNegocio, onReclamar }) {
  const retiro = p.tipoEntrega === "retiro";
  const pago = PAGO[p.estadoPago];
  const entregado = p.estado === "entregado";
  return (
    <article className="mb-3 overflow-hidden" style={{ borderRadius: 20, background: "#fff", border: "1px solid #E3E7F1", boxShadow: "0 1px 2px rgba(11,20,55,.04)", opacity: entregado ? 0.94 : 1 }}>
      <div className="flex items-center gap-3 p-4 pb-3">
        <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 14, background: TONOS.azul.bg, boxShadow: `inset 0 0 0 1px ${TONOS.azul.aro}` }}>
          <Store size={20} color="var(--azul)" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="truncate" style={{ ...TITULO, fontWeight: 800, fontSize: 15.5, letterSpacing: "-0.01em" }}>{p.negocio?.nombre || "Negocio"}</p>
          <p className="text-xs" style={{ color: "#5B6482" }}>Pedido del {fecha(p.creado)}</p>
        </div>
        <Pastilla estado={p.estado} />
      </div>

      {p.estado === "listo" && (
        <div className="mx-4 mb-3 flex items-center gap-2.5 px-3.5 py-3" style={{ borderRadius: 14, background: TONOS.verde.bg, boxShadow: `inset 0 0 0 1px ${TONOS.verde.aro}` }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 10, background: "#1E8A55" }}><Check size={17} color="#fff" strokeWidth={3} /></span>
          <p className="text-[13px]" style={{ color: "#145C39", lineHeight: 1.35 }}>
            <b>¡Tu pedido está listo!</b> {retiro ? "Ya podés pasar a retirarlo." : "Ya está listo para el envío."}
          </p>
        </div>
      )}

      <div className="px-3 pb-4 pt-1"><Progreso estado={p.estado} /></div>

      <div className="px-4 py-3" style={{ borderTop: "1px solid #EEF0F6" }}>
        {(p.items || []).map((i, k) => (
          <div key={k} className="flex items-baseline justify-between gap-3 text-sm py-0.5">
            <span style={{ color: "#2B3768" }}><b style={{ color: "#0B1437" }}>{i.cantidad}×</b> {i.producto}</span>
            {i.precioUnitario ? <span className="shrink-0" style={{ color: "#5B6482" }}>{pesos(i.precioUnitario * i.cantidad)}</span> : null}
          </div>
        ))}
        {p.total ? (
          <div className="flex items-baseline justify-between mt-2 pt-2" style={{ borderTop: "1px dashed #E3E7F1" }}>
            <span className="text-xs font-bold" style={{ color: "#5B6482", letterSpacing: ".06em" }}>TOTAL</span>
            <span style={{ ...TITULO, fontWeight: 800, fontSize: 17 }}>{pesos(p.total)}</span>
          </div>
        ) : null}
      </div>

      <div className="px-4 pb-4 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5" style={{ borderRadius: 10, background: "#F3F5FA", color: "#2B3768" }}>
            {retiro ? <Store size={13} /> : <Truck size={13} />}{retiro ? "Retiro en el local" : `Delivery${p.direccionEntrega ? ` · ${p.direccionEntrega}` : ""}`}
          </span>
          {p.formaPago && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5" style={{ borderRadius: 10, background: "#F3F5FA", color: "#2B3768", textTransform: "capitalize" }}>
              <CreditCard size={13} />{p.formaPago}
            </span>
          )}
        </div>
        {pago && (() => { const t = TONOS[pago.tono]; return (
          <p className="flex items-start gap-2 text-xs font-medium px-3 py-2.5" style={{ borderRadius: 12, background: t.bg, color: t.fg, boxShadow: `inset 0 0 0 1px ${t.aro}`, lineHeight: 1.35 }}>
            <pago.Icon size={14} className="shrink-0" style={{ marginTop: 1 }} />{pago.texto}
          </p>
        ); })()}
        {p.observaciones ? <p className="text-xs" style={{ color: "#5B6482" }}>Nota: {p.observaciones}</p> : null}
        {p.estado !== "pendiente" && p.negocio?.codigoPublico && onReclamar ? (
          <button onClick={() => onReclamar(p)} className="flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5" style={{ borderRadius: 12, background: "#fff", color: "#2B3768", border: "1px solid #E3E7F1" }}>
            <AlertTriangle size={15} /> ¿Hubo un problema? Hacer un reclamo
          </button>
        ) : null}
        {p.negocio?.codigoPublico && (
          <button onClick={() => onAbrirNegocio?.(p.negocio.codigoPublico)} className="flex items-center justify-center gap-1 text-sm font-semibold py-2.5 mt-1" style={{ borderRadius: 12, background: "var(--azul-suave)", color: "var(--azul)" }}>
            Ver negocio <ChevronRight size={16} />
          </button>
        )}
      </div>
    </article>
  );
}

export function PedidosScreen({ pedidos, cargando, error, onRecargar, onBack, onAbrirNegocio, onReclamar, onVerReclamos }) {
  const [filtro, setFiltro] = useState(null); // null = automático: "En curso" si hay, si no "Todos"
  const enCurso = useMemo(() => pedidos.filter((p) => p.estado !== "entregado"), [pedidos]);
  const entregados = useMemo(() => pedidos.filter((p) => p.estado === "entregado"), [pedidos]);
  const efectivo = filtro ?? (enCurso.length ? "curso" : "todos");
  const lista = efectivo === "curso" ? enCurso : efectivo === "entregados" ? entregados : pedidos;
  const listos = pedidos.filter((p) => p.estado === "listo").length;

  // se actualiza sola mientras la pantalla está abierta
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") onRecargar?.(); }, 30000);
    return () => clearInterval(t);
  }, [onRecargar]);

  const FILTROS = [["curso", "En curso", enCurso.length], ["entregados", "Entregados", entregados.length], ["todos", "Todos", pedidos.length]];
  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh" }}>
      <div data-conservar-color className="sticky top-0 z-30" style={{ backgroundColor: "#0B1437" }}>
        <div className="max-w-3xl mx-auto px-4 pb-3 flex items-center gap-3" style={{ paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
          <BotonAtras onClick={onBack} />
          <div className="flex-1 min-w-0 leading-tight">
            <p style={{ color: "#fff", fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>Mis pedidos</p>
            <p className="text-xs" style={{ color: "#BBD1FB" }}>
              {listos > 0 ? `${listos} ${listos === 1 ? "pedido listo" : "pedidos listos"}` : enCurso.length ? `${enCurso.length} en curso` : "Todo al día"}
            </p>
          </div>
          <button onClick={onRecargar} aria-label="Actualizar pedidos" className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)" }}>
            <RefreshCw size={16} color="#fff" className={cargando ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4" style={{ paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex gap-2 overflow-x-auto pt-3 pb-3" style={{ scrollbarWidth: "none" }}>
          {FILTROS.map(([id, nombre, n]) => {
            const activo = efectivo === id;
            return (
              <button key={id} onClick={() => setFiltro(id)} className="flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 shrink-0" aria-pressed={activo}
                style={{ borderRadius: 999, background: activo ? "#0B1437" : "#fff", color: activo ? "#fff" : "#5B6482", border: `1px solid ${activo ? "#0B1437" : "#E3E7F1"}` }}>
                {nombre}<span style={{ opacity: 0.7, fontWeight: 700 }}>{n}</span>
              </button>
            );
          })}
        </div>

        {onVerReclamos ? (
          <button onClick={onVerReclamos} className="flex items-center justify-between w-full text-sm font-semibold px-4 py-3 mb-3" style={{ borderRadius: 14, background: "#fff", border: "1px solid #E3E7F1", color: "#2B3768" }}>
            <span>Mis reclamos y devoluciones</span><ChevronRight size={16} />
          </button>
        ) : null}

        {error && pedidos.length === 0 ? (
          <div className="text-center px-5 py-8" style={{ borderRadius: 20, background: "#fff", border: "1px solid #E3E7F1" }}>
            <span className="flex items-center justify-center mx-auto mb-3" style={{ width: 52, height: 52, borderRadius: 17, background: TONOS.rojo.bg, boxShadow: `inset 0 0 0 1px ${TONOS.rojo.aro}` }}><AlertTriangle size={24} color={TONOS.rojo.fg} /></span>
            <p className="font-bold mb-1" style={TITULO}>No pudimos traer tus pedidos</p>
            <p className="text-sm mb-4" style={{ color: "#5B6482", lineHeight: 1.45 }}>Revisá tu conexión y probá de nuevo.</p>
            <button onClick={onRecargar} className="text-sm font-semibold px-5 py-2.5" style={{ borderRadius: 12, background: "var(--azul)", color: "#fff" }}>Reintentar</button>
          </div>
        ) : cargando && pedidos.length === 0 ? (
          <div aria-busy="true">{[0, 1].map((k) => <div key={k} className="mb-3 animate-pulse" style={{ height: 230, borderRadius: 20, background: "#fff", border: "1px solid #E3E7F1" }} />)}</div>
        ) : lista.length === 0 ? (
          <div className="text-center px-6" style={{ paddingTop: 48 }}>
            <span className="flex items-center justify-center mx-auto" style={{ width: 92, height: 92, borderRadius: "50%", background: "radial-gradient(circle, rgba(var(--azul-rgb), .16), rgba(var(--azul-rgb), 0) 70%)" }}>
              <span className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 22, background: "#fff", boxShadow: "0 1px 2px rgba(11,20,55,.06), 0 10px 22px -8px rgba(var(--azul-rgb), .4)" }}><Package size={29} color="var(--azul)" /></span>
            </span>
            <p className="mt-5 mb-1.5" style={{ ...TITULO, fontWeight: 800, fontSize: 18 }}>{pedidos.length ? "No hay pedidos acá" : "Todavía no hiciste pedidos"}</p>
            <p className="text-sm mx-auto" style={{ color: "#5B6482", lineHeight: 1.5, maxWidth: 320 }}>
              {pedidos.length ? "Probá con otro filtro para ver el resto." : "Cuando pidas algo desde el chat de un negocio, lo seguís paso a paso desde acá y te avisamos cuando esté listo."}
            </p>
          </div>
        ) : (
          lista.map((p) => <Tarjeta key={p.id} p={p} onAbrirNegocio={onAbrirNegocio} onReclamar={onReclamar} />)
        )}
      </div>
    </div>
  );
}
