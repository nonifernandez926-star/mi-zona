// Fase 9: activar una ficha (negocio, oficio o alquiler) con mes gratis, comprar un plan con Google Play o usar los días de invitación.
// Se paga SOLO por tener un negocio, un oficio o un alquiler publicados. El cobro lo hace únicamente Google Play Billing y el servidor
// verifica cada compra con Google antes de sumar tiempo. El mes gratis no pide tarjeta y no se cobra nada solo.
import { useCallback, useEffect, useState } from "react";
import { X, Check, Gift, Sparkles, Loader2, ShieldCheck, AlertTriangle, Copy, Share2, Users, CalendarCheck, BellRing, PauseCircle, Info } from "lucide-react";
import { traerPlanes, suscripcionApi } from "./api.js";
import { playDisponible, preciosDePlay, pagarConPlay, servicioPlay } from "./playBilling.js";
import { compartirTexto, textoInvitacion, avisoDeCompartir } from "./compartir.js";
import DialogoAdvertencia from "./componentes/DialogoAdvertencia.jsx";

const TITULO = { fontFamily: "var(--fuente-titulo)", fontWeight: 700, color: "#0B1437" };
const hoyISO = () => new Date().toISOString().slice(0, 10);
const sumarMeses = (iso, meses) => {
  const d = new Date(`${iso}T00:00:00Z`); const dia = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + meses); if (d.getUTCDate() !== dia) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
};
const sumarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtFecha = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "—");
const fmtCorta = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" }) : "—");
const fmtPesos = (n) => `$${(Number(n) || 0).toLocaleString("es-AR")}`;
const ROTULO = { negocio: "tu negocio", oficio: "tu ficha de oficios", alquiler: "tu ficha de alquiler" };
const TITULO_TIPO = { negocio: "Negocio", oficio: "Ficha de oficios", alquiler: "Ficha de alquiler" };

// Precios de referencia por mes (los mismos que server/utils/planes.js). Se usan si el servidor no responde o manda datos incompletos.
const BASE_MES = { negocio: 3000, oficio: 1000, alquiler: 2000 };
const PLANES_FIJOS = [["1_mes", 1, "1 mes", 0, "1m"], ["3_meses", 3, "3 meses", 10, "3m"], ["6_meses", 6, "6 meses", 20, "6m"]];
function planesDeRespaldo(tipo) {
  const base = BASE_MES[tipo] || BASE_MES.negocio;
  return Object.fromEntries(PLANES_FIJOS.map(([plan, meses, label, desc, suf]) => {
    const precio = Math.round(base * meses * (100 - desc) / 100);
    return [plan, { plan, meses, label, descuentoPorcentaje: desc, precio, precioPorMes: Math.round(precio / meses), productoId: `mizona_${tipo}_${suf}`, referencia: true }];
  }));
}
// Nunca devuelve menos de tres planes con nombre y precio válidos: lo que el servidor manda mal se reemplaza por el respaldo.
function normalizarPlanes(tipo, crudo) {
  const resp = planesDeRespaldo(tipo);
  const origen = crudo && typeof crudo === "object" ? crudo : {};
  return Object.fromEntries(PLANES_FIJOS.map(([plan, meses, label, , suf]) => {
    const p = origen[plan], r = resp[plan];
    const precio = Number(p?.precio);
    if (!p || !Number.isFinite(precio) || precio <= 0) return [plan, r];
    const desc = Number.isFinite(Number(p.descuentoPorcentaje)) ? Number(p.descuentoPorcentaje) : r.descuentoPorcentaje;
    return [plan, { plan, meses, label, descuentoPorcentaje: desc, precio, precioPorMes: Math.round(precio / meses), productoId: typeof p.productoId === "string" && p.productoId ? p.productoId : r.productoId, referencia: false }];
  }));
}

// tipo: "negocio" | "oficio" | "alquiler" · fichaId: id de la ficha ya guardada (si es un negocio nuevo, se guarda antes de abrir esto)
// vencimientoActual: fecha de vencimiento actual (si ya tenía tiempo, lo nuevo se suma a esa fecha)
// cubierto: negocio nuevo que ya queda cubierto por Mi Asistente (se publica sin cobrar)
export function ActivarFichaModal({ tipo, nombre, fichaId, vencimientoActual, cubierto, hastaCubierto, onCubierto, onClose, onActivada }) {
  const [planes, setPlanes] = useState(() => normalizarPlanes(tipo, null));
  const [planesDeReferencia, setPlanesDeReferencia] = useState(true);
  const [estado, setEstado] = useState(null); // null = todavía no se sabe (o no se pudo consultar)
  const [cargando, setCargando] = useState(true);
  const [precios, setPrecios] = useState({});
  const [enPlay, setEnPlay] = useState(null); // null = comprobando · true/false
  const [recuperable, setRecuperable] = useState(null); // compra de Google que quedó sin activar
  const [plan, setPlan] = useState("6_meses");
  const [dialogo, setDialogo] = useState(null); // "gratis" | "compra" | "dias" | "cubierto"
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null); // información amable (no es un error)
  const [gratisUsado, setGratisUsado] = useState(false); // el servidor dijo que ya se usó

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    // Cada pedido va por su cuenta: si uno falla, el resto de la pantalla sigue funcionando.
    const [p, e, disponible] = await Promise.all([
      traerPlanes().catch(() => null),
      suscripcionApi.estado().catch(() => null),
      playDisponible().catch(() => false),
    ]);
    const crudo = p?.planes?.[tipo];
    const norm = normalizarPlanes(tipo, crudo);
    setPlanes(norm); setPlanesDeReferencia(Object.values(norm).some((x) => x.referencia));
    setEstado(e && typeof e === "object" ? e : null);
    setEnPlay(!!disponible);
    if (disponible) {
      const ids = Object.values(norm).map((x) => x.productoId);
      try { setPrecios(await preciosDePlay(ids)); } catch { /* quedan los precios de referencia */ }
      // ¿Quedó una compra hecha en Google Play que todavía no se activó? (se cortó la conexión justo después de pagar)
      try {
        const s = await servicioPlay();
        const poseidas = (await s?.listPurchases?.()) || [];
        const nuestra = poseidas.find((x) => ids.includes(x.itemId));
        if (nuestra) setRecuperable({ productId: nuestra.itemId, token: nuestra.purchaseToken });
      } catch { /* sin recuperación: no pasa nada */ }
    }
    setCargando(false);
  }, [tipo]);
  useEffect(() => { if (!cubierto) cargar(); }, [cargar, cubierto]);

  const correr = async (accion) => {
    setTrabajando(true); setError(null); setAviso(null);
    try { await accion(); }
    catch (e) {
      if (e?.datos?.codigo === "mes_gratis_usado" || e?.status === 409 && /mes gratis/i.test(e?.message || "")) { setGratisUsado(true); setAviso("Ya usaste tu mes gratis de este tipo de ficha. Elegí un plan para publicarla."); }
      else if (e?.cancelada) setAviso(e.message);
      else setError(e?.message || "No se pudo completar. Probá de nuevo en un momento.");
    }
    setTrabajando(false); setDialogo(null);
  };

  const base = vencimientoActual && vencimientoActual > hoyISO() ? vencimientoActual : hoyISO();
  const gratisDisponible = !gratisUsado && (estado ? !!estado.mesGratisDisponible?.[tipo] : true); // sin respuesta del servidor se ofrece y el servidor decide
  const diasDisp = estado?.invitaciones?.diasDisponibles || 0;
  const elegido = planes[plan];
  const precioMostrado = (p) => precios[p.productoId]?.texto || fmtPesos(p.precio);
  const venceGratis = sumarMeses(base, 1);
  const puedePagar = enPlay === true;

  const empezarGratis = () => correr(async () => { const r = await suscripcionApi.mesGratis(tipo, fichaId); onActivada({ origen: "gratis", vence: r.vence }); });
  const usarDias = () => correr(async () => { const r = await suscripcionApi.usarDias(tipo, fichaId); onActivada({ origen: "invitacion", vence: r.vence, dias: r.dias }); });
  const acreditar = async (productId, token, terminar) => {
    try {
      const r = await suscripcionApi.comprar(tipo, fichaId, productId, token);
      if (r.pendiente) { await terminar?.(false); setError(r.error); return; }
      await terminar?.(true);
      onActivada({ origen: "play", vence: r.vence });
    } catch (e) { await terminar?.(false); throw e; }
  };
  const comprar = () => correr(async () => {
    const pago = await pagarConPlay(elegido.productoId);
    await acreditar(elegido.productoId, pago.token, pago.terminar);
  });
  const recuperar = () => correr(async () => { await acreditar(recuperable.productId, recuperable.token, async (ok) => { if (ok) { try { await (await servicioPlay()).consume(recuperable.token); } catch { /* nada */ } } }); });

  const cuerpoDialogo = {
    gratis: { titulo: "¿Empezar tu mes gratis?", queHace: `Publica ${ROTULO[tipo]} durante 1 mes, sin pedirte tarjeta.`, paraQue: "Sirve para que tus vecinos la encuentren y te contacten, y para que pruebes Mi Zona.", queSucedera: `Va a ser pública hasta el ${fmtFecha(venceGratis)}. Después se oculta (no se borra nada) y no se cobra nada solo: si querés seguir, elegís un plan. Es un solo mes gratis por tipo de ficha.`, textoAceptar: "Sí, empezar", onAceptar: empezarGratis },
    dias: { titulo: `¿Usar tus ${diasDisp} días gratis?`, queHace: `Suma ${diasDisp} días a ${ROTULO[tipo]}.`, paraQue: "Son los días que ganaste por invitar o por registrarte con un código.", queSucedera: `${ROTULO[tipo][0].toUpperCase()}${ROTULO[tipo].slice(1)} queda visible hasta el ${fmtFecha(sumarDias(base, diasDisp))}. Los días se usan todos juntos en esta ficha.`, textoAceptar: "Sí, usar mis días", onAceptar: usarDias },
    compra: elegido && { titulo: `¿Comprar ${elegido.label}?`, queHace: `Te lleva a Google Play para pagar ${precioMostrado(elegido)}.`, paraQue: `Sirve para mantener ${ROTULO[tipo]} publicada ${elegido.meses === 1 ? "1 mes más" : `${elegido.meses} meses más`}.`, queSucedera: `Pagás una sola vez con el método de pago de tu cuenta de Google. NO se renueva solo: cuando termine el plazo se oculta (no se borra) y te avisamos antes. Activa hasta el ${fmtFecha(sumarMeses(base, elegido.meses))}.`, textoAceptar: "Sí, ir a pagar", onAceptar: comprar },
    cubierto: { titulo: "¿Publicar tu negocio?", queHace: "Publica tu negocio sin cobrarte.", paraQue: "Ya pagaste Mi Asistente con esta cuenta de Google.", queSucedera: `Tu negocio va a ser público${hastaCubierto ? ` hasta el ${fmtFecha(hastaCubierto)}` : ""} y se renueva junto con tu suscripción de Mi Asistente.`, textoAceptar: "Sí, publicar", onAceptar: () => correr(async () => { await onCubierto(); }) },
  }[dialogo];

  const tarjeta = (bg, borde, fg) => ({ borderRadius: 18, background: bg, border: `1px solid ${borde}`, color: fg, padding: 16 });
  const boton = (fondo, extra = {}) => ({ width: "100%", minHeight: 52, borderRadius: 16, fontSize: "1rem", fontWeight: 700, color: "#fff", background: fondo, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: trabajando ? 0.6 : 1, ...extra });
  const VERDE = "linear-gradient(180deg,#38B06E,#2C9A5F)", AZUL = "linear-gradient(180deg,var(--azul-g1),var(--azul-g2))";
  const hayPagoPrincipal = !gratisDisponible;
  const textoPagar = elegido ? `Pagar con Google Play · ${precioMostrado(elegido)}` : "Pagar con Google Play";

  const BotonPagar = ({ principal }) => (
    <>
      <button type="button" disabled={trabajando || !elegido || !puedePagar} onClick={() => setDialogo("compra")}
        style={principal ? boton(AZUL, { opacity: trabajando || !puedePagar ? 0.5 : 1 }) : boton("#fff", { color: puedePagar ? "var(--azul)" : "#5B6482", border: `2px solid ${puedePagar ? "var(--azul)" : "#CFD6E8"}`, opacity: trabajando ? 0.6 : 1, background: puedePagar ? "#F1F6FF" : "#F3F5FA" })}>
        {trabajando && dialogo === null && puedePagar ? <><Loader2 size={17} className="animate-spin" aria-hidden="true" /> Procesando...</> : textoPagar}
      </button>
      {enPlay === false && <p className="flex items-start gap-1.5 mt-2" style={{ fontSize: 13.5, color: "#4A5372", lineHeight: 1.4 }}><Info size={15} className="shrink-0" style={{ marginTop: 1 }} aria-hidden="true" /> Disponible en la app de Mi Zona de Google Play. Desde el navegador podés elegir el plan, pero el pago se hace en la app.</p>}
    </>
  );

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center" style={{ background: "#0B1437b8", backdropFilter: "blur(3px)" }} onClick={trabajando ? undefined : onClose}>
      <div className="bg-white w-full sm:max-w-lg flex flex-col" style={{ borderRadius: "28px 28px 0 0", maxHeight: "94dvh", overflow: "hidden" }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Activar tu ficha">
        <div className="relative px-5 pt-4 pb-4 text-white" style={{ background: "linear-gradient(135deg,#0B1437 0%,#1B3A8C 100%)" }}>
          <button type="button" onClick={onClose} disabled={trabajando} aria-label="Cerrar" className="absolute top-3 right-3 flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,.14)" }}><X size={20} color="#fff" /></button>
          <p className="text-[12px] font-semibold uppercase" style={{ letterSpacing: ".12em", opacity: .8 }}>{TITULO_TIPO[tipo]}</p>
          <h2 style={{ ...TITULO, fontSize: 22, color: "#fff", marginTop: 2, paddingRight: 52, lineHeight: 1.15 }}>{vencimientoActual && vencimientoActual >= hoyISO() ? "Agregar tiempo" : "Publicá tu ficha"}</h2>
          {nombre && <p className="text-sm mt-1.5" style={{ opacity: .9, overflowWrap: "anywhere", paddingRight: 52 }}>{nombre}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3" style={{ WebkitOverflowScrolling: "touch" }}>
          {cubierto ? (
            <div style={tarjeta("#E4F3EA", "#C6E6D3", "#1E6B44")}>
              <p className="text-[16px] font-bold flex items-center gap-2 mb-1.5"><Sparkles size={18} aria-hidden="true" /> Ya pagaste Mi Asistente</p>
              <p className="text-[15px]" style={{ lineHeight: 1.55 }}>Con esta cuenta de Google no pagás Mi Zona: tu negocio se publica sin costo{hastaCubierto ? ` hasta el ${fmtFecha(hastaCubierto)}` : ""}.</p>
            </div>
          ) : (
            <>
              {vencimientoActual && <p className="text-[15px] mb-3" style={{ color: "#2B3768", lineHeight: 1.5 }}>{vencimientoActual >= hoyISO() ? <>Hoy vence el <b>{fmtFecha(vencimientoActual)}</b>. Lo que sumes se agrega a esa fecha: no perdés nada.</> : <>Venció el <b>{fmtFecha(vencimientoActual)}</b>. No se borró nada: al renovar vuelve a mostrarse.</>}</p>}

              {/* Mes gratis: el camino principal */}
              {gratisDisponible ? (
                <section aria-label="Mes gratis" className="mb-4" style={{ borderRadius: 20, padding: 16, background: "linear-gradient(160deg,#EAF8F0 0%,#D9F1E4 100%)", border: "1px solid #BFE3CF", color: "#14532F" }}>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase px-2.5 py-1" style={{ borderRadius: 999, background: "#1E8A52", color: "#fff", letterSpacing: ".06em" }}><Gift size={13} aria-hidden="true" /> Primer mes gratis</span>
                  <h3 style={{ ...TITULO, fontSize: 21, marginTop: 10, color: "#0F3D24", lineHeight: 1.15 }}>Probá 1 mes gratis</h3>
                  <p className="text-[15px] mt-1.5" style={{ lineHeight: 1.5 }}>Sin tarjeta, sin compromiso. <b>No se cobra nada solo</b>: si no hacés nada, tu ficha se pausa y listo.</p>
                  <ol className="mt-3" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[[CalendarCheck, "Hoy", `Tu ficha queda publicada (hasta el ${fmtCorta(venceGratis)}).`], [BellRing, `Día 23 · ${fmtCorta(sumarDias(base, 23))}`, "Te avisamos que está por terminar."], [PauseCircle, `Día 30 · ${fmtCorta(venceGratis)}`, "Si no renovás, se pausa. No se borra nada."]].map(([I, t, d]) => (
                      <li key={t} className="flex items-start gap-3">
                        <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 10, background: "#fff", boxShadow: "inset 0 0 0 1px #BFE3CF" }}><I size={16} color="#1E8A52" aria-hidden="true" /></span>
                        <span className="min-w-0"><span className="block text-[14px] font-bold" style={{ color: "#0F3D24" }}>{t}</span><span className="block text-[14px]" style={{ lineHeight: 1.4 }}>{d}</span></span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : (
                <section aria-label="Mes gratis" className="mb-4 flex items-start gap-3" style={{ borderRadius: 18, padding: 14, background: "#F3F5FA", border: "1px dashed #CFD6E8", color: "#4A5372" }}>
                  <Gift size={20} aria-hidden="true" className="shrink-0" style={{ marginTop: 2 }} />
                  <div><p className="text-[15px] font-bold" style={{ color: "#2B3768" }}>Ya usaste tu mes gratis de este tipo de ficha</p><p className="text-[14px] mt-0.5" style={{ lineHeight: 1.45 }}>Elegí un plan para seguir publicada. Tu ficha no se borra: vuelve a mostrarse apenas la renovás.</p></div>
                </section>
              )}

              {diasDisp > 0 && (
                <div className="mb-4" style={tarjeta("#EDF1FF", "#C9D6FA", "#1B3FB8")}>
                  <p className="text-[16px] font-bold flex items-center gap-2 mb-1"><Users size={18} aria-hidden="true" /> Tenés {diasDisp} días de invitación</p>
                  <p className="text-[15px] mb-3" style={{ lineHeight: 1.5 }}>Los ganaste por invitar a otras personas. Podés sumarlos a esta ficha.</p>
                  <button type="button" disabled={trabajando} onClick={() => setDialogo("dias")} style={boton(AZUL)}>Usar mis {diasDisp} días</button>
                </div>
              )}

              {recuperable && (
                <div className="mb-4" style={tarjeta("#FFF3D6", "#F2DDA6", "#6B4510")}>
                  <p className="text-[15px] font-bold mb-1">Encontramos una compra sin activar</p>
                  <p className="text-[15px] mb-3" style={{ lineHeight: 1.5 }}>Pagaste en Google Play pero tu ficha no se activó (por ejemplo, se cortó la conexión). No pagás de nuevo.</p>
                  <button type="button" disabled={trabajando} onClick={recuperar} style={boton("linear-gradient(180deg,#E39A12,#C9830A)")}>Activar con mi compra</button>
                </div>
              )}

              {/* Planes */}
              <h3 style={{ ...TITULO, fontSize: 17 }}>{gratisDisponible ? "Seguí publicada después" : "Elegí tu plan"}</h3>
              <p className="text-[14px] mt-0.5 mb-3" style={{ color: "#4A5372", lineHeight: 1.4 }}>Pago único, sin renovación automática. Cuanto más largo el plan, menos pagás por mes.</p>
              <div role="radiogroup" aria-label="Planes" className="flex flex-col gap-2.5 mb-2">
                {Object.entries(planes).map(([clave, p]) => {
                  const activo = plan === clave;
                  const masElegido = clave === "6_meses";
                  return (
                    <button key={clave} type="button" role="radio" aria-checked={activo} onClick={() => setPlan(clave)} className="flex items-center gap-3 px-3.5 py-3 text-left" style={{ minHeight: 72, borderRadius: 18, border: `2px solid ${activo ? "var(--azul)" : "#E3E7F1"}`, background: activo ? "#F1F6FF" : "#fff", boxShadow: activo ? "0 4px 14px rgba(35,80,245,.14)" : "none" }}>
                      <span className="flex items-center justify-center shrink-0" style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${activo ? "var(--azul)" : "#B9C2D8"}`, background: activo ? "var(--azul)" : "#fff" }}>{activo && <Check size={15} color="#fff" strokeWidth={3} aria-hidden="true" />}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="text-[17px]" style={TITULO}>{p.label}</span>
                          {p.descuentoPorcentaje > 0 && <span className="text-[12px] font-bold px-2 py-0.5" style={{ borderRadius: 999, background: masElegido ? "#1E6B44" : "#E4F3EA", color: masElegido ? "#fff" : "#1E6B44", whiteSpace: "nowrap" }}>Ahorrás {p.descuentoPorcentaje}%{masElegido ? " · Más elegido" : ""}</span>}
                        </span>
                        <span className="block text-[13px] mt-0.5" style={{ color: "#4A5372" }}>{fmtPesos(p.precioPorMes)} por mes · pago único</span>
                      </span>
                      <span className="text-right shrink-0"><span className="block text-[18px]" style={TITULO}>{precioMostrado(p)}</span><span className="block text-[12px]" style={{ color: "#4A5372" }}>en total</span></span>
                    </button>
                  );
                })}
              </div>
              {planesDeReferencia && enPlay !== true && <p className="text-[12.5px] mb-2" style={{ color: "#5B6482" }}>Precios de referencia: el precio final lo muestra Google Play al pagar.</p>}
              <p className="text-[13px] mb-3 flex items-start gap-1.5" style={{ color: "#4A5372", lineHeight: 1.4 }}><ShieldCheck size={14} className="shrink-0 mt-0.5" aria-hidden="true" /> El pago lo hace Google Play. Mi Zona nunca ve tu tarjeta.</p>
              {gratisDisponible && <BotonPagar principal={false} />}
              {cargando && <p className="text-[13px] mt-3 flex items-center gap-2" style={{ color: "#4A5372" }} role="status"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Actualizando tu información...</p>}
            </>
          )}
          {aviso && <p role="status" className="text-[14.5px] my-3 p-3 flex items-start gap-2" style={{ borderRadius: 12, background: "#EDF1FF", color: "#1B3FB8", lineHeight: 1.45 }}><Info size={16} className="shrink-0 mt-0.5" aria-hidden="true" /> {aviso}</p>}
          {error && (
            <div role="alert" className="my-3 p-3" style={{ borderRadius: 12, background: "#FDF1EF", color: "#9A3B34" }}>
              <p className="text-[14.5px] flex items-start gap-2" style={{ lineHeight: 1.45 }}><AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" /> {error}</p>
              <button type="button" onClick={() => { setError(null); cargar(); }} className="text-[14.5px] font-bold underline mt-1" style={{ minHeight: 44, color: "#9A3B34" }}>Reintentar</button>
            </div>
          )}
        </div>

        <div className="px-4 pt-3" style={{ borderTop: "1px solid #E8ECF5", paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))", background: "#fff" }}>
          {cubierto ? (
            <button type="button" disabled={trabajando} onClick={() => setDialogo("cubierto")} style={boton(VERDE)}>Publicar mi negocio</button>
          ) : gratisDisponible ? (
            <>
              <button type="button" disabled={trabajando} onClick={() => setDialogo("gratis")} style={boton(VERDE)}>{trabajando ? <><Loader2 size={17} className="animate-spin" aria-hidden="true" /> Activando...</> : "Empezar mi mes gratis"}</button>
              <p className="text-[12.5px] text-center mt-1.5" style={{ color: "#4A5372" }}>Sin tarjeta · no se cobra nada solo</p>
            </>
          ) : (
            <>
              {elegido && <p className="text-[14px] mb-2" style={{ color: "#2B3768" }}>Activo hasta el <b>{fmtFecha(sumarMeses(base, elegido.meses))}</b></p>}
              {hayPagoPrincipal && <BotonPagar principal />}
            </>
          )}
        </div>
      </div>
      {cuerpoDialogo && <DialogoAdvertencia {...cuerpoDialogo} cargando={trabajando} onCancelar={() => !trabajando && setDialogo(null)} />}
    </div>
  );
}

// Tarjeta "Invitá y ganá días": muestra el código de la persona, cuántos días lleva ganados y cómo funciona. Va en Mis fichas.
export function TarjetaInvitaciones({ invitaciones, onCambio }) {
  const [aviso, setAviso] = useState("");
  if (!invitaciones?.codigo) return null;
  const { codigo, acreditadas, pendientes, diasDisponibles, diasGanadosInvitando, topeDias, diasPorInvitacion, diasInvitado } = invitaciones;
  const copiar = async () => {
    try { await navigator.clipboard.writeText(codigo); setAviso("Código copiado."); } catch { setAviso("No se pudo copiar: anotalo a mano."); }
  };
  const compartir = async () => {
    const r = await compartirTexto({ titulo: "Mi Zona", texto: textoInvitacion("", codigo) });
    if (r !== "compartido") setAviso(avisoDeCompartir(r) || "");
    onCambio?.();
  };
  const lleno = diasGanadosInvitando >= topeDias;
  return (
    <section aria-label="Invitá y ganá días" className="mt-3" style={{ background: "#fff", border: "1px solid #C9D6FA", borderRadius: 18, padding: 16 }}>
      <p className="flex items-center gap-2 font-bold" style={{ color: "#0B1437", fontSize: "1.0625rem" }}><Gift size={19} aria-hidden="true" /> Invitá y ganá días gratis</p>
      <p className="text-[15px] mt-1" style={{ color: "#2B3768", lineHeight: 1.5 }}>Cada persona que se registre con tu código te suma {diasPorInvitacion} días y también le suma {diasInvitado} a ella. Los días se acreditan unos días después, cuando su cuenta está completa.</p>
      <div className="flex items-center justify-between gap-3 mt-3 p-3" style={{ borderRadius: 14, background: "#F3F5FA" }}>
        <div><p className="text-[12px] font-bold uppercase" style={{ color: "#4A5372", letterSpacing: ".08em" }}>Tu código</p><p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.5rem", letterSpacing: ".12em", color: "#0B1437" }}>{codigo}</p></div>
        <button type="button" onClick={copiar} aria-label="Copiar código" className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 14, background: "#fff", border: "1px solid #CFD6E8" }}><Copy size={20} aria-hidden="true" /></button>
      </div>
      <button type="button" onClick={compartir} className="w-full mt-3 flex items-center justify-center gap-2" style={{ minHeight: 50, borderRadius: 14, background: "var(--azul)", color: "#fff", fontWeight: 700, fontSize: "1rem" }}><Share2 size={18} aria-hidden="true" /> Invitar con mi código</button>
      <p className="text-[14px] mt-3" style={{ color: "#4A5372", lineHeight: 1.45 }}>
        Invitaciones acreditadas: <b>{acreditadas}</b>{pendientes ? ` · en revisión: ${pendientes}` : ""}. Ganaste {diasGanadosInvitando} de {topeDias} días posibles.{lleno ? " Llegaste al tope." : ""} {diasDisponibles > 0 ? <b>Tenés {diasDisponibles} días para usar: abrí una ficha y tocá «Agregar tiempo».</b> : ""}
      </p>
      {aviso && <p role="status" className="text-[14px] mt-2" style={{ color: "#6B4510" }}>{aviso}</p>}
    </section>
  );
}

// Panel del dueño de una ficha: solo cantidades de los últimos 30 días (nunca quién vio o contactó)
export function PanelDueno({ tipo, id }) {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(false);
  const alternar = async () => {
    const nuevo = !abierto; setAbierto(nuevo);
    if (nuevo) { setError(false); try { setDatos(await suscripcionApi.panel(tipo, id)); } catch { setError(true); } }
  };
  const Dato = ({ valor, texto }) => (
    <div className="flex-1" style={{ minWidth: 120, background: "#F3F5FA", borderRadius: 14, padding: 12 }}>
      <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.5rem", color: "#0B1437" }}>{valor}</p>
      <p className="text-[14px]" style={{ color: "#4A5372", lineHeight: 1.3 }}>{texto}</p>
    </div>
  );
  return (
    <div className="w-full">
      <button type="button" onClick={alternar} aria-expanded={abierto} className="w-full" style={{ minHeight: 48, borderRadius: 14, border: "1px solid #CFD6E8", background: "#fff", fontWeight: 700, fontSize: "1rem", color: "#0B1437" }}>{abierto ? "Ocultar estadísticas" : "Ver estadísticas (30 días)"}</button>
      {abierto && (
        <div className="mt-2">
          {!datos && !error && <p className="text-[15px] flex items-center gap-2" style={{ color: "#4A5372" }}><Loader2 size={16} className="animate-spin" /> Cargando...</p>}
          {error && <p role="alert" className="text-[15px]" style={{ color: "#9A3B34" }}>No se pudieron cargar. Probá de nuevo.</p>}
          {datos && (
            <>
              <div className="flex flex-wrap gap-2">
                <Dato valor={datos.visitas} texto="veces que vieron tu ficha" />
                <Dato valor={datos.contactos} texto="veces que tocaron contactar" />
                {datos.guardados !== null && <Dato valor={datos.guardados} texto="veces que la guardaron" />}
                <Dato valor={datos.diasParaVencer === null ? "—" : Math.max(0, datos.diasParaVencer)} texto="días para vencer" />
                <Dato valor={datos.invitaciones} texto={`personas se registraron con tu código (${datos.diasGanadosInvitando} días ganados)`} />
              </div>
              <p className="text-[13px] mt-2" style={{ color: "#4A5372", lineHeight: 1.4 }}>Son solo cantidades: Mi Zona nunca muestra quién vio o contactó tu ficha.{datos.guardados === null ? " Los favoritos de esta ficha se guardan en el celular de cada persona, por eso no se cuentan." : ""}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
