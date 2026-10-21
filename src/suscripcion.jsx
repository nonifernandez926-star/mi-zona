// Fase 9: activar una ficha (negocio, oficio o alquiler) con mes gratis, comprar un plan con Google Play o usar los días de invitación.
// Se paga SOLO por tener un negocio, un oficio o un alquiler publicados. El cobro lo hace únicamente Google Play Billing y el servidor
// verifica cada compra con Google antes de sumar tiempo.
import { useCallback, useEffect, useState } from "react";
import { X, Check, Gift, Sparkles, Loader2, ShieldCheck, AlertTriangle, Copy, Share2, Users } from "lucide-react";
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
const fmtPesos = (n) => `$${(n || 0).toLocaleString("es-AR")}`;
const ROTULO = { negocio: "tu negocio", oficio: "tu ficha de oficios", alquiler: "tu ficha de alquiler" };
const TITULO_TIPO = { negocio: "Negocio", oficio: "Ficha de oficios", alquiler: "Ficha de alquiler" };

// tipo: "negocio" | "oficio" | "alquiler" · fichaId: id de la ficha ya guardada (si es un negocio nuevo, se guarda antes de abrir esto)
// vencimientoActual: fecha de vencimiento actual (si ya tenía tiempo, lo nuevo se suma a esa fecha)
// cubierto: negocio nuevo que ya queda cubierto por Mi Asistente (se publica sin cobrar)
export function ActivarFichaModal({ tipo, nombre, fichaId, vencimientoActual, cubierto, hastaCubierto, onCubierto, onClose, onActivada }) {
  const [planes, setPlanes] = useState(null);
  const [estado, setEstado] = useState(null);
  const [precios, setPrecios] = useState({});
  const [enPlay, setEnPlay] = useState(null); // null = comprobando · true/false
  const [recuperable, setRecuperable] = useState(null); // compra de Google que quedó sin activar
  const [plan, setPlan] = useState(null);
  const [dialogo, setDialogo] = useState(null); // "gratis" | "compra" | "dias" | "cubierto"
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [p, e] = await Promise.all([traerPlanes(), suscripcionApi.estado()]);
      setPlanes(p.planes?.[tipo] || {}); setEstado(e);
      const disponible = await playDisponible();
      setEnPlay(disponible);
      if (disponible) {
        const ids = Object.values(p.planes?.[tipo] || {}).map((x) => x.productoId);
        setPrecios(await preciosDePlay(ids));
        // ¿Quedó una compra hecha en Google Play que todavía no se activó? (se cortó la conexión justo después de pagar)
        try {
          const s = await servicioPlay();
          const poseidas = (await s?.listPurchases?.()) || [];
          const nuestra = poseidas.find((x) => ids.includes(x.itemId));
          if (nuestra) setRecuperable({ productId: nuestra.itemId, token: nuestra.purchaseToken });
        } catch { /* sin recuperación: no pasa nada */ }
      }
    } catch (err) { setError("No se pudo cargar. Revisá tu conexión e intentá de nuevo."); }
  }, [tipo]);
  useEffect(() => { if (!cubierto) cargar(); }, [cargar, cubierto]);

  const correr = async (accion) => {
    setTrabajando(true); setError(null);
    try { await accion(); } catch (e) { if (!e?.cancelada) setError(e.message || "No se pudo completar. Probá de nuevo."); else setError(e.message); }
    setTrabajando(false); setDialogo(null);
  };

  const base = vencimientoActual && vencimientoActual > hoyISO() ? vencimientoActual : hoyISO();
  const gratisDisponible = !!estado?.mesGratisDisponible?.[tipo];
  const diasDisp = estado?.invitaciones?.diasDisponibles || 0;
  const elegido = planes && plan ? planes[plan] : null;
  const precioMostrado = (p) => precios[p.productoId]?.texto || fmtPesos(p.precio);
  const venceGratis = sumarMeses(base, 1);

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

  const tarjeta = (bg, borde, fg) => ({ borderRadius: 16, background: bg, border: `1px solid ${borde}`, color: fg, padding: 16 });
  const boton = (fondo, extra = {}) => ({ width: "100%", minHeight: 52, borderRadius: 16, fontSize: "1rem", fontWeight: 700, color: "#fff", background: fondo, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: trabajando ? 0.6 : 1, ...extra });

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center" style={{ background: "#0B1437b8", backdropFilter: "blur(3px)" }} onClick={trabajando ? undefined : onClose}>
      <div className="bg-white w-full sm:max-w-lg flex flex-col" style={{ borderRadius: "28px 28px 0 0", maxHeight: "94dvh", overflow: "hidden" }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Activar tu ficha">
        <div className="relative px-6 pt-5 pb-5 text-white" style={{ background: "linear-gradient(135deg,#0B1437 0%,#1B3A8C 100%)" }}>
          <button onClick={onClose} disabled={trabajando} aria-label="Cerrar" className="absolute top-4 right-4 flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.14)" }}><X size={20} color="#fff" /></button>
          <p className="text-[12px] font-semibold uppercase" style={{ letterSpacing: ".12em", opacity: .8 }}>{TITULO_TIPO[tipo]}</p>
          <h2 style={{ ...TITULO, fontSize: 24, color: "#fff", marginTop: 4, paddingRight: 44 }}>{vencimientoActual && vencimientoActual >= hoyISO() ? "Agregar tiempo" : "Activar tu ficha"}</h2>
          {nombre && <p className="text-sm mt-2" style={{ opacity: .9, overflowWrap: "anywhere" }}>{nombre}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-3" style={{ WebkitOverflowScrolling: "touch" }}>
          {cubierto ? (
            <div style={tarjeta("#E4F3EA", "#C6E6D3", "#1E6B44")}>
              <p className="text-[16px] font-bold flex items-center gap-2 mb-1.5"><Sparkles size={18} aria-hidden="true" /> Ya pagaste Mi Asistente</p>
              <p className="text-[15px]" style={{ lineHeight: 1.55 }}>Con esta cuenta de Google no pagás Mi Zona: tu negocio se publica sin costo{hastaCubierto ? ` hasta el ${fmtFecha(hastaCubierto)}` : ""}.</p>
            </div>
          ) : !planes && !error ? (
            <p className="text-[15px] py-8 text-center flex items-center justify-center gap-2" style={{ color: "#4A5372" }}><Loader2 size={18} className="animate-spin" /> Cargando...</p>
          ) : planes && (
            <>
              {vencimientoActual && <p className="text-[15px] mb-4" style={{ color: "#2B3768", lineHeight: 1.5 }}>{vencimientoActual >= hoyISO() ? <>Hoy vence el <b>{fmtFecha(vencimientoActual)}</b>. Lo que sumes se agrega a esa fecha: no perdés nada.</> : <>Venció el <b>{fmtFecha(vencimientoActual)}</b>. No se borró nada: al renovar vuelve a mostrarse.</>}</p>}

              {gratisDisponible && (
                <div className="mb-4" style={tarjeta("#E4F3EA", "#C6E6D3", "#1E6B44")}>
                  <p className="text-[16px] font-bold flex items-center gap-2 mb-1"><Gift size={18} aria-hidden="true" /> Tu primer mes es gratis</p>
                  <p className="text-[15px] mb-3" style={{ lineHeight: 1.5 }}>Sin tarjeta y sin compromiso. Un solo mes gratis por tipo de ficha.</p>
                  <button type="button" disabled={trabajando} onClick={() => setDialogo("gratis")} style={boton("linear-gradient(180deg,#38B06E,#2C9A5F)")}>Empezar mi mes gratis</button>
                </div>
              )}

              {diasDisp > 0 && (
                <div className="mb-4" style={tarjeta("#EDF1FF", "#C9D6FA", "#1B3FB8")}>
                  <p className="text-[16px] font-bold flex items-center gap-2 mb-1"><Users size={18} aria-hidden="true" /> Tenés {diasDisp} días de invitación</p>
                  <p className="text-[15px] mb-3" style={{ lineHeight: 1.5 }}>Los ganaste por invitar a otras personas. Podés sumarlos a esta ficha.</p>
                  <button type="button" disabled={trabajando} onClick={() => setDialogo("dias")} style={boton("linear-gradient(180deg,var(--azul-g1),var(--azul-g2))")}>Usar mis {diasDisp} días</button>
                </div>
              )}

              {recuperable && (
                <div className="mb-4" style={tarjeta("#FFF3D6", "#F2DDA6", "#6B4510")}>
                  <p className="text-[15px] font-bold mb-1">Encontramos una compra sin activar</p>
                  <p className="text-[15px] mb-3" style={{ lineHeight: 1.5 }}>Pagaste en Google Play pero tu ficha no se activó (por ejemplo, se cortó la conexión). No pagás de nuevo.</p>
                  <button type="button" disabled={trabajando} onClick={recuperar} style={boton("linear-gradient(180deg,#E39A12,#C9830A)")}>Activar con mi compra</button>
                </div>
              )}

              <p className="text-[13px] font-bold uppercase mb-2" style={{ letterSpacing: ".08em", color: "#4A5372" }}>Planes</p>
              <div className="flex flex-col gap-3 mb-3">
                {Object.entries(planes).map(([clave, p]) => {
                  const activo = plan === clave;
                  return (
                    <button key={clave} type="button" onClick={() => setPlan(clave)} aria-pressed={activo} className="flex items-center gap-4 px-4 py-4 text-left" style={{ minHeight: 64, borderRadius: 18, border: `2px solid ${activo ? "var(--azul)" : "#E3E7F1"}`, background: activo ? "#F1F6FF" : "#fff" }}>
                      <span className="flex items-center justify-center shrink-0" style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${activo ? "var(--azul)" : "#CBD5E1"}`, background: activo ? "var(--azul)" : "#fff" }}>{activo && <Check size={15} color="#fff" strokeWidth={3} />}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="text-[17px]" style={TITULO}>{p.label}</span>
                          {p.descuentoPorcentaje > 0 && <span className="text-[12px] font-bold px-2 py-0.5" style={{ borderRadius: 999, background: "#E4F3EA", color: "#1E6B44" }}>{p.descuentoPorcentaje}% menos</span>}
                        </span>
                        <span className="block text-[13px] mt-0.5" style={{ color: "#4A5372" }}>Pago único · no se renueva solo</span>
                      </span>
                      <span className="text-[18px]" style={TITULO}>{precioMostrado(p)}</span>
                    </button>
                  );
                })}
              </div>
              {enPlay === false && <p className="text-[14px] mb-3 p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 }}>Para comprar un plan abrí Mi Zona desde la app de Google Play. Acá en el navegador no se puede pagar.</p>}
              <p className="text-[13px] mb-2 flex items-start gap-1.5" style={{ color: "#4A5372", lineHeight: 1.4 }}><ShieldCheck size={14} className="shrink-0 mt-0.5" aria-hidden="true" /> El pago lo hace Google Play. Mi Zona nunca ve tu tarjeta.</p>
            </>
          )}
          {error && <p role="alert" className="text-[15px] my-3 flex items-start gap-1.5" style={{ color: "#9A3B34" }}><AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}</p>}
          {error && !planes && !cubierto && <button type="button" onClick={cargar} className="text-[15px] font-semibold underline" style={{ color: "var(--azul)" }}>Reintentar</button>}
        </div>

        <div className="px-5 pt-3" style={{ borderTop: "1px solid #E8ECF5", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))", background: "#fff" }}>
          {cubierto ? (
            <button type="button" disabled={trabajando} onClick={() => setDialogo("cubierto")} style={boton("linear-gradient(180deg,#38B06E,#2C9A5F)")}>Publicar mi negocio</button>
          ) : (
            <>
              {elegido && <p className="text-[14px] mb-2" style={{ color: "#2B3768" }}>Activo hasta el <b>{fmtFecha(sumarMeses(base, elegido.meses))}</b></p>}
              <button type="button" disabled={trabajando || !elegido || enPlay !== true} onClick={() => setDialogo("compra")} style={boton("linear-gradient(180deg,var(--azul-g1),var(--azul-g2))", { opacity: trabajando || !elegido || enPlay !== true ? 0.5 : 1 })}>
                {trabajando ? <><Loader2 size={17} className="animate-spin" /> Procesando...</> : elegido ? <>Comprar {elegido.label} · {precioMostrado(elegido)}</> : "Elegí un plan"}
              </button>
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
