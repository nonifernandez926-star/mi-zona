// Cuenta de Google, nombre, suscripción del negocio y notificaciones push de Mi Zona.
import { useEffect, useRef, useState } from "react";
import { X, Check, LogOut, User, Bell, BellOff, ArrowLeft, Mail, Clock, Sparkles } from "lucide-react";
import {
  dibujarBotonGoogle, loginConGoogle, guardarNombre, traerPlanes,
  estadoPush, activarPush, desactivarPush,
} from "./api.js";

const TITULO = { fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: "#0B1220" };
const fmtPesos = (n) => `$${(n || 0).toLocaleString("es-AR")}`;
const hoyISO = () => new Date().toISOString().slice(0, 10);

function sumarMeses(iso, meses) {
  const d = new Date(`${iso}T00:00:00Z`);
  const dia = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + meses);
  if (d.getUTCDate() !== dia) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
function fmtFecha(iso) {
  return iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "—";
}
export function diasHasta(iso) {
  if (!iso) return null;
  return Math.round((new Date(`${iso}T00:00:00Z`) - new Date(`${hoyISO()}T00:00:00Z`)) / 86400000);
}

// Estado de la suscripción de un negocio propio, para mostrarlo en pantalla y armar los avisos.
// estado: "pendiente" (falta pagar) | "activa" | "por_vencer" (7 días o menos) | "vencida"
export function infoSuscripcion(negocio) {
  if (!negocio) return null;
  if (negocio.pendientePago) return { estado: "pendiente", dias: null };
  const dias = diasHasta(negocio.expiresAt);
  if (dias === null) return null;
  if (dias < 0) return { estado: "vencida", dias };
  return { estado: dias <= 7 ? "por_vencer" : "activa", dias };
}

/* ---------- botón de Google ---------- */

// modo: "registro" (primera vez) | "login" (ya tiene cuenta). Cambia el texto del botón de Google y lo que hace el servidor.
function BotonGoogle({ onLogged, modo = "registro", onSinCuenta }) {
  const ref = useRef(null);
  const alLoguear = useRef(onLogged);
  const alSinCuenta = useRef(onSinCuenta);
  alLoguear.current = onLogged;
  alSinCuenta.current = onSinCuenta;
  const [error, setError] = useState(null);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setError(null);
    dibujarBotonGoogle(ref.current, async (idToken) => {
      setEntrando(true); setError(null);
      try { alLoguear.current(await loginConGoogle(idToken, modo)); }
      catch (e) {
        if (!vivo) return;
        if (e.datos?.error === "cuenta_inexistente") { setError(e.datos.mensaje); alSinCuenta.current && alSinCuenta.current(); }
        else setError(e.message || "No se pudo iniciar sesión con Google.");
      }
      finally { if (vivo) setEntrando(false); }
    }, { texto: modo === "login" ? "signin_with" : "signup_with" }).catch((e) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, [modo]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={ref} style={{ minHeight: 44 }} />
      {entrando && <p className="text-xs" style={{ color: "#4B5563" }}>Entrando...</p>}
      {error && <p className="text-xs text-center" style={{ color: "#C1443A", lineHeight: 1.4 }}>{error}</p>}
    </div>
  );
}

// Dos opciones bien separadas: "Registrarme" (primera vez) e "Iniciar sesión" (ya tiene cuenta)
function SelectorAcceso({ modo, onCambiar }) {
  return (
    <div className="flex p-1 mb-4" style={{ borderRadius: 14, background: "#EEF2F8" }}>
      {[{ id: "registro", label: "Registrarme" }, { id: "login", label: "Iniciar sesión" }].map((o) => (
        <button
          key={o.id} onClick={() => onCambiar(o.id)}
          className="flex-1 py-2 text-sm font-semibold transition-all"
          style={{ borderRadius: 11, background: modo === o.id ? "#fff" : "transparent", color: modo === o.id ? "#0B2A54" : "#6B7280", boxShadow: modo === o.id ? "0 2px 8px rgba(11,42,84,.12)" : "none" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PanelAcceso({ modo, onCambiar, onLogged }) {
  return (
    <>
      <SelectorAcceso modo={modo} onCambiar={onCambiar} />
      <p className="text-xs mb-4 text-center" style={{ color: "#4B5563", lineHeight: 1.5 }}>
        {modo === "registro"
          ? "¿Primera vez en Mi Zona? Creá tu cuenta con Google en un toque."
          : "¿Ya te registraste? Entrá con la misma cuenta de Google que usaste."}
      </p>
      <BotonGoogle modo={modo} onLogged={onLogged} onSinCuenta={() => onCambiar("registro")} />
      <p className="text-[11px] text-center mt-4" style={{ color: "#94A3B8", lineHeight: 1.5 }}>
        {modo === "registro"
          ? "Si ya pagaste Mi Asistente, registrate con la misma cuenta de Google: no vas a pagar Mi Zona."
          : "¿No tenés cuenta todavía? Tocá \"Registrarme\"."}
      </p>
    </>
  );
}

/* ---------- iniciar sesión ---------- */

export function LoginModal({ motivo, modoInicial = "registro", onClose, onLogged }) {
  const [modo, setModo] = useState(modoInicial);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: "#0B1220cc" }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-6" style={{ borderRadius: 20 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 style={{ ...TITULO, fontSize: 18 }}>{modo === "registro" ? "Crear mi cuenta" : "Iniciar sesión"}</h2>
          <button onClick={onClose} aria-label="Cerrar"><X size={18} color="#6B7280" /></button>
        </div>
        {motivo && <p className="text-sm mb-4" style={{ color: "#4B5563", lineHeight: 1.5 }}>{motivo}</p>}
        <PanelAcceso modo={modo} onCambiar={setModo} onLogged={onLogged} />
      </div>
    </div>
  );
}

/* ---------- pedir el nombre al registrarse ---------- */

export function NombreModal({ sugerido, onGuardado }) {
  const [nombre, setNombre] = useState(sugerido || "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const guardar = async () => {
    setGuardando(true); setError(null);
    try { onGuardado(await guardarNombre(nombre)); }
    catch (e) { setError(e.message); setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ background: "#0B1220cc" }}>
      <div className="bg-white w-full max-w-sm p-6" style={{ borderRadius: 16 }}>
        <h2 style={{ ...TITULO, fontSize: 18 }} className="mb-1">¡Bienvenido a Mi Zona!</h2>
        <p className="text-sm mb-4" style={{ color: "#4B5563" }}>¿Cómo te llamás? Después lo podés cambiar en Ajustes → Mi cuenta.</p>
        <input
          autoFocus value={nombre} maxLength={60}
          onChange={(e) => { setNombre(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && nombre.trim().length >= 2 && !guardando && guardar()}
          placeholder="Tu nombre"
          className="w-full border px-3 py-2.5 text-sm mb-2" style={{ borderRadius: 8, borderColor: error ? "#C1443A" : "#E2E8F0" }}
        />
        {error && <p className="text-xs mb-2" style={{ color: "#C1443A" }}>{error}</p>}
        <button
          onClick={guardar} disabled={nombre.trim().length < 2 || guardando}
          className="w-full text-sm font-semibold py-3 mt-1"
          style={{ backgroundColor: "#2F6FED", color: "#fff", borderRadius: 10, opacity: nombre.trim().length < 2 || guardando ? 0.5 : 1 }}
        >
          {guardando ? "Guardando..." : "Continuar"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Ajustes → Mi cuenta ---------- */

export function MiCuentaScreen({ usuario, onBack, onLogged, onUsuarioActualizado, onCerrarSesion }) {
  const [modoAcceso, setModoAcceso] = useState("registro");
  const [nombre, setNombre] = useState(usuario?.nombre || "");
  const [estado, setEstado] = useState(null); // null | "guardando" | "ok" | { error }
  useEffect(() => { setNombre(usuario?.nombre || ""); }, [usuario?.nombre]);

  const guardar = async () => {
    setEstado("guardando");
    try {
      onUsuarioActualizado(await guardarNombre(nombre));
      setEstado("ok");
      setTimeout(() => setEstado(null), 2500);
    } catch (e) { setEstado({ error: e.message }); }
  };
  const cambio = usuario && nombre.trim() !== (usuario.nombre || "");

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: "#2F6FED" }}>
        <ArrowLeft size={15} /> Volver a Ajustes
      </button>
      <h2 style={{ ...TITULO, fontSize: 18 }} className="mb-4">Mi cuenta</h2>

      {!usuario ? (
        <div className="p-5" style={{ borderRadius: 18, border: "1px solid #E6ECF5", background: "#fff", boxShadow: "0 6px 20px rgba(11,42,84,0.07)" }}>
          <PanelAcceso modo={modoAcceso} onCambiar={setModoAcceso} onLogged={onLogged} />
        </div>
      ) : (
        <>
          <div className="p-4 mb-4" style={{ borderRadius: 12, border: "1px solid #E2E8F0", background: "#fff" }}>
            <label className="text-xs font-medium block mb-1" style={{ color: "#4B5563" }}>Nombre</label>
            <input
              value={nombre} maxLength={60} onChange={(e) => { setNombre(e.target.value); setEstado(null); }}
              onKeyDown={(e) => e.key === "Enter" && cambio && nombre.trim().length >= 2 && guardar()}
              className="w-full border px-3 py-2.5 text-sm mb-3" style={{ borderRadius: 8, borderColor: "#E2E8F0" }}
            />
            <label className="text-xs font-medium block mb-1" style={{ color: "#4B5563" }}>Cuenta de Google</label>
            <div className="flex items-center gap-2 text-sm px-3 py-2.5 mb-3" style={{ borderRadius: 8, background: "#F3F6FB", color: "#0B1220" }}>
              <Mail size={14} color="#6B7280" /> <span className="truncate">{usuario.email}</span>
            </div>
            {estado?.error && <p className="text-xs mb-2" style={{ color: "#C1443A" }}>{estado.error}</p>}
            <button
              onClick={guardar} disabled={!cambio || nombre.trim().length < 2 || estado === "guardando"}
              className="w-full text-sm font-semibold py-2.5 flex items-center justify-center gap-1.5"
              style={{ backgroundColor: "#2F6FED", color: "#fff", borderRadius: 10, opacity: !cambio || nombre.trim().length < 2 ? 0.45 : 1 }}
            >
              {estado === "ok" ? <><Check size={15} /> Guardado</> : estado === "guardando" ? "Guardando..." : "Guardar nombre"}
            </button>
          </div>
          <button
            onClick={onCerrarSesion}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3"
            style={{ borderRadius: 10, border: "1px solid #C1443A", color: "#9A3B34", background: "#fff" }}
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </>
      )}
    </div>
  );
}

/* ---------- Ajustes → Notificaciones (push) ---------- */

export function NotificacionesPushScreen({ usuario, onBack, onLogin }) {
  const [estado, setEstado] = useState("cargando"); // cargando | no-soportado | bloqueado | activo | inactivo
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { estadoPush().then(setEstado); }, []);

  const alternar = async () => {
    setTrabajando(true); setError(null);
    try {
      if (estado === "activo") await desactivarPush(); else await activarPush();
      setEstado(await estadoPush());
    } catch (e) { setError(e.message); setEstado(await estadoPush()); }
    finally { setTrabajando(false); }
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: "#2F6FED" }}>
        <ArrowLeft size={15} /> Volver a Ajustes
      </button>
      <h2 style={{ ...TITULO, fontSize: 18 }} className="mb-2">Notificaciones</h2>
      <p className="text-sm mb-5" style={{ color: "#4B5563", lineHeight: 1.6 }}>
        Recibí avisos en tu celular aunque Mi Zona esté cerrada, por ejemplo cuántos días le quedan a la suscripción de tu negocio.
      </p>

      {!usuario ? (
        <button onClick={onLogin} className="w-full text-sm font-semibold py-3" style={{ backgroundColor: "#2F6FED", color: "#fff", borderRadius: 10 }}>
          Iniciar sesión para activarlas
        </button>
      ) : estado === "no-soportado" ? (
        <p className="text-sm p-4" style={{ background: "#F5F1E6", color: "#8A5B12", borderRadius: 10 }}>
          Este navegador no permite notificaciones. En iPhone, abrí Mi Zona en Safari → Compartir → "Agregar a pantalla de inicio" y activalas desde ahí.
        </p>
      ) : estado === "bloqueado" ? (
        <p className="text-sm p-4" style={{ background: "#F7E7E5", color: "#9A3B34", borderRadius: 10 }}>
          Bloqueaste las notificaciones de este sitio. Habilitalas desde el candado de la barra del navegador (o los ajustes del sistema) y volvé a intentar.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 p-4 mb-3 bg-white" style={{ borderRadius: 12, border: "1px solid #E2E8F0" }}>
            <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: "50%", background: estado === "activo" ? "#E4F3EA" : "#E8F0FE" }}>
              {estado === "activo" ? <Bell size={17} color="#1E6B44" /> : <BellOff size={17} color="#2F6FED" />}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "#0B1220" }}>{estado === "activo" ? "Activadas en este dispositivo" : "Desactivadas"}</p>
              <p className="text-xs" style={{ color: "#6B7280" }}>Se configuran por dispositivo.</p>
            </div>
          </div>
          <button
            onClick={alternar} disabled={trabajando || estado === "cargando"}
            className="w-full text-sm font-semibold py-3"
            style={estado === "activo"
              ? { borderRadius: 10, border: "1px solid #E2E8F0", color: "#0B1220", background: "#fff" }
              : { borderRadius: 10, backgroundColor: "#2F6FED", color: "#fff", opacity: trabajando ? 0.6 : 1 }}
          >
            {trabajando ? "Un momento..." : estado === "activo" ? "Desactivar notificaciones" : "Activar notificaciones"}
          </button>
          {error && <p className="text-xs mt-3" style={{ color: "#C1443A" }}>{error}</p>}
        </>
      )}
    </div>
  );
}

/* ---------- elegir plan y pagar (compacto) ---------- */

// `gratis`: la cuenta ya pagó Mi Asistente y es un negocio nuevo → se publica sin cobrar.
// `vencimientoActual`: si es una renovación, los meses nuevos se suman a esa fecha.
export function PlanesModal({ nombreNegocio, gratis, hastaGratis, vencimientoActual, onClose, onConfirmar }) {
  const [planes, setPlanes] = useState(null);
  const [plan, setPlan] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (gratis) return;
    traerPlanes().then(setPlanes).catch(() => setError("No se pudieron cargar los planes. Revisá tu conexión."));
  }, [gratis]);

  const confirmar = async () => {
    setEnviando(true); setError(null);
    try { await onConfirmar(gratis ? null : plan); }
    catch (e) { setError(e.message); setEnviando(false); }
  };

  const elegido = planes && plan ? planes[plan] : null;
  const base = vencimientoActual && vencimientoActual > hoyISO() ? vencimientoActual : hoyISO();
  const nuevoVencimiento = elegido ? sumarMeses(base, elegido.meses) : null;

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center" style={{ background: "#0B1220aa" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm p-5" style={{ borderRadius: "18px 18px 0 0" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 style={{ ...TITULO, fontSize: 17 }}>{gratis ? "Publicar mi negocio" : vencimientoActual ? "Agregar meses" : "Suscripción de tu negocio"}</h2>
          <button onClick={onClose} aria-label="Cerrar"><X size={18} color="#6B7280" /></button>
        </div>
        {nombreNegocio && <p className="text-xs mb-3 truncate" style={{ color: "#6B7280" }}>{nombreNegocio}</p>}

        {gratis ? (
          <div className="p-3.5 mb-4" style={{ borderRadius: 10, background: "#E4F3EA", color: "#1E6B44" }}>
            <p className="text-sm font-semibold flex items-center gap-1.5 mb-1"><Sparkles size={14} /> Ya pagaste Mi Asistente</p>
            <p className="text-xs" style={{ lineHeight: 1.5 }}>
              Con esta cuenta de Google no pagás Mi Zona: tu negocio se publica sin costo{hastaGratis ? ` hasta el ${fmtFecha(hastaGratis)}` : ""} y se renueva junto con tu suscripción de Mi Asistente.
            </p>
          </div>
        ) : (
          <>
            {vencimientoActual && (
              <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: "#4B5563" }}>
                <Clock size={12} /> Hoy vence el {fmtFecha(vencimientoActual)}. Los meses nuevos se suman a esa fecha: no perdés nada.
              </p>
            )}
            {!vencimientoActual && (
              <p className="text-xs mb-3" style={{ color: "#4B5563" }}>Elegí por cuánto tiempo querés publicar tu negocio. Podés agregar más meses cuando quieras.</p>
            )}
            <div className="flex flex-col gap-2 mb-3">
              {!planes && !error && <p className="text-xs py-4 text-center" style={{ color: "#6B7280" }}>Cargando planes...</p>}
              {planes && Object.entries(planes).map(([clave, p]) => {
                const activo = plan === clave;
                return (
                  <button
                    key={clave} onClick={() => setPlan(clave)}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-left"
                    style={{ borderRadius: 10, border: `1.5px solid ${activo ? "#2F6FED" : "#E2E8F0"}`, background: activo ? "#F1F6FF" : "#fff" }}
                  >
                    <span className="flex items-center justify-center shrink-0" style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${activo ? "#2F6FED" : "#CBD5E1"}` }}>
                      {activo && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2F6FED" }} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: "#0B1220" }}>{p.label}</span>
                        {p.descuentoPorcentaje > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5" style={{ borderRadius: 6, background: "#E4F3EA", color: "#1E6B44" }}>{p.descuentoPorcentaje}% OFF</span>
                        )}
                      </span>
                      <span className="block text-[11px]" style={{ color: "#6B7280" }}>
                        {fmtPesos(p.precioPorMes)} por mes{p.ahorro > 0 ? ` · ahorrás ${fmtPesos(p.ahorro)}` : ""}
                      </span>
                    </span>
                    <span className="text-sm font-bold" style={{ color: "#0B2A54", fontFamily: "'Poppins', sans-serif" }}>{fmtPesos(p.precio)}</span>
                  </button>
                );
              })}
            </div>
            {nuevoVencimiento && (
              <p className="text-xs mb-3" style={{ color: "#4B5563" }}>Tu negocio quedaría activo hasta el <b>{fmtFecha(nuevoVencimiento)}</b>.</p>
            )}
          </>
        )}

        {error && <p className="text-xs mb-3" style={{ color: "#C1443A" }}>{error}</p>}
        <button
          onClick={confirmar} disabled={enviando || (!gratis && !plan)}
          className="w-full text-sm font-semibold py-3"
          style={{ backgroundColor: gratis ? "#2C9A5F" : "#2F6FED", color: "#fff", borderRadius: 10, opacity: enviando || (!gratis && !plan) ? 0.5 : 1 }}
        >
          {enviando ? (gratis ? "Publicando..." : "Abriendo Mercado Pago...") : gratis ? "Publicar mi negocio" : elegido ? `Pagar ${fmtPesos(elegido.precio)} con Mercado Pago` : "Elegí un plan"}
        </button>
      </div>
    </div>
  );
}

/* ---------- tarjeta de suscripción (Herramientas) ---------- */

export function TarjetaSuscripcion({ negocio, onAgregar }) {
  const info = infoSuscripcion(negocio);
  if (!info) return null;
  const paleta = {
    pendiente: { bg: "#FBEBD1", fg: "#8A5B12", etiqueta: "Falta pagar" },
    activa: { bg: "#E4F3EA", fg: "#1E6B44", etiqueta: "Activa" },
    por_vencer: { bg: "#FBEBD1", fg: "#8A5B12", etiqueta: "Por vencer" },
    vencida: { bg: "#F7E7E5", fg: "#9A3B34", etiqueta: "Vencida" },
  }[info.estado];
  const fraccion = info.dias === null ? 0 : Math.max(0, Math.min(1, info.dias / 30));
  const texto = info.estado === "pendiente" ? "Tu negocio todavía no se muestra en Mi Zona."
    : info.estado === "vencida" ? `Venció el ${fmtFecha(negocio.expiresAt)}. Tu negocio ya no se muestra.`
    : `${info.dias === 1 ? "Queda 1 día" : `Quedan ${info.dias} días`} · vence el ${fmtFecha(negocio.expiresAt)}`;
  const origenAsistente = negocio.suscripcion?.origen === "asistente";

  return (
    <div className="p-4 mb-3 bg-white" style={{ borderRadius: 14, border: "1px solid #E2E8F0", boxShadow: "0 3px 14px rgba(11,42,84,0.07)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold" style={{ color: "#0B1220" }}>Mi suscripción</span>
        <span className="text-[10px] font-bold px-2 py-0.5" style={{ borderRadius: 20, background: paleta.bg, color: paleta.fg }}>{paleta.etiqueta}</span>
      </div>
      <p className="text-xs mb-2.5" style={{ color: "#4B5563" }}>{texto}</p>
      {info.estado !== "pendiente" && (
        <div className="mb-3" style={{ height: 6, borderRadius: 6, background: "#EEF2F7", overflow: "hidden" }}>
          <div style={{ width: `${fraccion * 100}%`, height: "100%", background: paleta.fg, borderRadius: 6 }} />
        </div>
      )}
      {origenAsistente && info.estado !== "pendiente" && (
        <p className="text-[11px] mb-2.5 flex items-center gap-1" style={{ color: "#7A4F9E" }}><Sparkles size={11} /> Incluida con tu suscripción de Mi Asistente</p>
      )}
      <button onClick={onAgregar} className="w-full text-sm font-semibold py-2.5" style={{ backgroundColor: "#2F6FED", color: "#fff", borderRadius: 10 }}>
        {info.estado === "pendiente" ? "Elegir plan y pagar" : info.estado === "vencida" ? "Renovar suscripción" : "Agregar meses"}
      </button>
    </div>
  );
}
