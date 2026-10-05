// Cuenta de Google, nombre, suscripción del negocio y notificaciones push de Mi Zona.
import { useEffect, useRef, useState } from "react";
import { X, Check, LogOut, User, Bell, BellOff, ChevronLeft, ChevronRight, Mail, Clock, Sparkles, Trash2, AlertTriangle, Loader2, ShieldCheck, KeyRound, MonitorSmartphone, Smartphone, Monitor, Tablet, History, BellRing, Store, Star, Heart, CalendarDays } from "lucide-react";
import {
  cargarGoogle, pedirCuentaGoogle, cambiarClave, cerrarOtrasSesiones, loginConGoogle, revisarCorreo, registrarConCorreo, entrarConCorreo, guardarNombre, traerPlanes,
  estadoPush, activarPush, desactivarPush, privacidadApi, seguridadApi, setToken,
} from "./api.js";

const TITULO = { fontFamily: "var(--fuente-titulo)", fontWeight: 600, color: "#0B1220" };
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

/* ---------- botones de volver ---------- */

// Botón cuadrado con flecha, para las barras de arriba.
//   tono "claro": sobre fondo azul oscuro · "oscuro": sobre fondo blanco · "foto": encima de una foto
export function BotonAtras({ onClick, tono = "claro", size = 40, label = "Volver" }) {
  const estilos = {
    claro: { background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.28)", color: "#fff" },
    oscuro: { background: "#fff", border: "1px solid #DCE5F2", color: "#0B2A54", boxShadow: "0 1px 2px rgba(11,42,84,0.08)" },
    foto: { background: "rgba(255,255,255,0.95)", border: "1px solid rgba(255,255,255,0.9)", color: "#0B2A54", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" },
  }[tono];
  return (
    <button
      onClick={onClick} aria-label={label}
      className="flex items-center justify-center shrink-0 active:scale-95 transition-transform"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.34), ...estilos }}
    >
      <ChevronLeft size={Math.round(size * 0.56)} strokeWidth={2.4} style={{ marginLeft: -1 }} />
    </button>
  );
}

// Botón de las subpantallas de Ajustes: círculo con flecha + nombre de la pantalla anterior
export function BotonVolver({ texto, onClick }) {
  const destino = String(texto || "").replace(/^Volver a /i, "") || "Volver";
  return (
    <button
      onClick={onClick} aria-label={texto}
      className="inline-flex items-center gap-2 mb-4 active:scale-95 transition-transform"
      style={{ padding: "5px 16px 5px 5px", borderRadius: 999, background: "#fff", border: "1px solid #DCE5F2", boxShadow: "0 1px 2px rgba(11,42,84,0.08), 0 4px 12px rgba(11,42,84,0.06)", color: "#0B2A54" }}
    >
      <span className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: "50%", background: "#0B2A54", color: "#fff" }}>
        <ChevronLeft size={18} strokeWidth={2.6} style={{ marginLeft: -1 }} />
      </span>
      <span style={{ fontFamily: "var(--fuente-titulo)", fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em" }}>{destino}</span>
    </button>
  );
}

/* ---------- Google: elegir cuenta ---------- */

const LogoG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

// Formulario con correo y contraseña, en pasos: primero el correo y recién después aparece la contraseña
// (o, si ese correo no tiene cuenta, el nombre y la contraseña para crearla).
function FormularioCorreo({ onLogged }) {
  const [paso, setPaso] = useState("correo"); // "correo" | "clave" | "crear"
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [ver, setVer] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const campo = { borderRadius: 12, borderColor: "#E2E8F0", background: "#fff" };
  const boton = (activo) => ({ borderRadius: 14, background: "#2F6FED", color: "#fff", opacity: activo ? 1 : 0.55, boxShadow: "0 8px 18px rgba(47,111,237,.3)" });

  const continuar = async () => {
    if (enviando || !correo.trim()) return;
    setEnviando(true); setError(null);
    try {
      const r = await revisarCorreo(correo);
      if (r.paso === "google") setError("Ese correo se registró con Google. Tocá \"Acceder con Google\".");
      else { setPaso(r.paso); setClave(""); }
    } catch (e) {
      setError(e.status === undefined ? "No se pudo conectar con el servidor. Si estaba dormido, esperá un minuto y probá de nuevo." : (e.message || "No se pudo continuar. Probá de nuevo."));
    }
    setEnviando(false);
  };
  const enviar = async () => {
    if (enviando) return;
    setEnviando(true); setError(null);
    try {
      onLogged(paso === "crear" ? await registrarConCorreo(nombre, correo, clave) : await entrarConCorreo(correo, clave));
    } catch (e) { setError(e.message || "No se pudo completar. Probá de nuevo."); setEnviando(false); }
  };
  const volver = () => { setPaso("correo"); setClave(""); setError(null); };

  if (paso === "correo") {
    const listo = !!correo.trim();
    return (
      <div className="flex flex-col gap-2.5">
        <input
          value={correo} onChange={(e) => { setCorreo(e.target.value); setError(null); }} type="email" inputMode="email" autoComplete="email"
          onKeyDown={(e) => e.key === "Enter" && listo && continuar()}
          placeholder="Correo electrónico" className="w-full border px-3.5 py-3 text-sm" style={campo}
        />
        {error && <p className="text-xs" style={{ color: "#C1443A", lineHeight: 1.4 }}>{error}</p>}
        <button onClick={continuar} disabled={!listo || enviando} className="w-full text-sm font-semibold py-3.5" style={boton(listo && !enviando)}>
          {enviando ? "Un momento..." : "Continuar"}
        </button>
      </div>
    );
  }

  const esCrear = paso === "crear";
  const listo = clave && (!esCrear || nombre.trim().length >= 2);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5" style={{ borderRadius: 12, background: "#F3F6FB" }}>
        <span className="flex items-center gap-2 min-w-0 text-sm" style={{ color: "#0B1220" }}><Mail size={14} color="#4B5563" /><span className="truncate">{correo.trim()}</span></span>
        <button type="button" onClick={volver} className="text-xs font-semibold shrink-0" style={{ color: "#2F6FED" }}>Cambiar</button>
      </div>
      {esCrear && (
        <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} autoComplete="name" placeholder="Tu nombre" className="w-full border px-3.5 py-3 text-sm" style={campo} />
      )}
      <div className="relative">
        <input
          autoFocus={!esCrear}
          value={clave} onChange={(e) => { setClave(e.target.value); setError(null); }} type={ver ? "text" : "password"} maxLength={100}
          autoComplete={esCrear ? "new-password" : "current-password"}
          onKeyDown={(e) => e.key === "Enter" && listo && enviar()}
          placeholder={esCrear ? "Contraseña (mínimo 8 caracteres)" : "Contraseña"} className="w-full border px-3.5 py-3 text-sm" style={{ ...campo, paddingRight: 64 }}
        />
        <button type="button" onClick={() => setVer((v) => !v)} className="absolute text-xs font-semibold" style={{ right: 14, top: "50%", transform: "translateY(-50%)", color: "#2F6FED" }}>
          {ver ? "Ocultar" : "Ver"}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: "#C1443A", lineHeight: 1.4 }}>{error}</p>}
      <button onClick={enviar} disabled={!listo || enviando} className="w-full text-sm font-semibold py-3.5" style={boton(listo && !enviando)}>
        {enviando ? "Un momento..." : esCrear ? "Crear cuenta" : "Iniciar sesión"}
      </button>
    </div>
  );
}

// Pantalla de acceso: "Acceder con Google" es para iniciar sesión. Tocar "Registrarme" abre directo la lista de cuentas de Google.
function PanelAcceso({ onLogged }) {
  const [error, setError] = useState(null);
  const [entrando, setEntrando] = useState(false);
  useEffect(() => { cargarGoogle().catch(() => {}); }, []); // así la ventana de Google abre al instante al tocar

  const conGoogle = async (modo) => {
    if (entrando) return;
    setError(null);
    let token;
    try { token = await pedirCuentaGoogle(); }
    catch (e) { if (!e.cancelado) setError(e.message); return; }
    setEntrando(true);
    try { onLogged({ ...(await loginConGoogle(token, modo)), desdeRegistro: modo === "registro" }); }
    catch (e) { setError(e.datos?.error === "cuenta_inexistente" ? e.datos.mensaje : (e.message || "No se pudo entrar con Google.")); setEntrando(false); }
  };

  return (
    <>
      <button
        onClick={() => conGoogle("login")} disabled={entrando}
        className="w-full flex items-center justify-center gap-2.5 text-sm font-semibold py-3.5"
        style={{ borderRadius: 14, background: "#fff", border: "1px solid #DADCE0", color: "#1F2937", opacity: entrando ? 0.6 : 1 }}
      >
        <LogoG /> {entrando ? "Entrando..." : "Acceder con Google"}
      </button>
      {error && <p className="text-xs text-center mt-2" style={{ color: "#C1443A", lineHeight: 1.4 }}>{error}</p>}
      <div className="flex items-center gap-3 my-4">
        <span className="flex-1" style={{ height: 1, background: "#E2E8F0" }} />
        <span className="text-xs" style={{ color: "#64748B" }}>o con tu correo</span>
        <span className="flex-1" style={{ height: 1, background: "#E2E8F0" }} />
      </div>
      <FormularioCorreo onLogged={onLogged} />
      <p className="text-center mt-4" style={{ fontSize: 12, color: "#4B5563" }}>
        ¿No tenés cuenta?{" "}
        <button onClick={() => conGoogle("registro")} disabled={entrando} className="font-semibold" style={{ color: "#2F6FED" }}>Registrarme</button>
      </p>
    </>
  );
}

/* ---------- iniciar sesión (ventana) ---------- */

export function LoginModal({ onClose, onLogged }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: "#0B1220cc" }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-6 overflow-y-auto" style={{ borderRadius: 20, maxHeight: "92vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ ...TITULO, fontSize: 20 }}>Iniciar sesión</h2>
          <button onClick={onClose} aria-label="Cerrar"><X size={18} color="#4B5563" /></button>
        </div>
        <PanelAcceso onLogged={onLogged} />
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
        <p className="text-sm mb-4" style={{ color: "#374151" }}>¿Cómo te llamás? Después lo podés cambiar en Ajustes → Mi cuenta.</p>
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

const fmtFechaLarga = (iso) => (iso ? new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "—");

// Estado de un negocio de la cuenta, en palabras simples
function estadoNegocio(n) {
  if (n.estado === "pendiente") return { texto: "Esperando el pago", color: AMBAR };
  const dias = diasHasta(n.venceEl ? String(n.venceEl).slice(0, 10) : null);
  if (dias === null) return { texto: "Activo", color: VERDE };
  if (dias < 0) return { texto: "Vencido", color: "#C1443A" };
  if (dias <= 7) return { texto: `Vence en ${dias} ${dias === 1 ? "día" : "días"}`, color: AMBAR };
  return { texto: `Activo hasta el ${fmtFecha(String(n.venceEl).slice(0, 10))}`, color: VERDE };
}

function FilaDato({ Icon, titulo, valor, ultimo }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: ultimo ? "none" : "1px solid #EEF2F7" }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 11, background: "#E8F0FE" }}><Icon size={16} color="#2F6FED" /></span>
      <span className="flex-1 min-w-0 text-sm" style={{ color: "#374151" }}>{titulo}</span>
      <span className="text-sm font-semibold text-right" style={{ color: "#0B1220" }}>{valor}</span>
    </div>
  );
}

export function MiCuentaScreen({ usuario, local, onBack, onLogged, onUsuarioActualizado, onCerrarSesion, onCuentaEliminada }) {
  const [nombre, setNombre] = useState(usuario?.nombre || "");
  const [estado, setEstado] = useState(null); // null | "guardando" | "ok" | { error }
  const [resumen, setResumen] = useState(null); // lo que Mi Zona tiene de esta cuenta (cantidades, negocios, fecha de alta)
  useEffect(() => { setNombre(usuario?.nombre || ""); }, [usuario?.nombre]);
  useEffect(() => {
    if (!usuario) { setResumen(null); return; }
    privacidadApi.resumen().then(setResumen).catch(() => {});
  }, [usuario?.id]);

  const guardar = async () => {
    setEstado("guardando");
    try {
      onUsuarioActualizado(await guardarNombre(nombre));
      setEstado("ok");
      setTimeout(() => setEstado(null), 2500);
    } catch (e) { setEstado({ error: e.message }); }
  };
  const cambio = usuario && nombre.trim() !== (usuario.nombre || "");
  const negocios = resumen?.negocios || [];
  const inicial = (usuario?.nombre || usuario?.email || "?").trim().charAt(0).toUpperCase();
  const conCorreo = resumen ? resumen.cuenta.proveedor === "email" : !!usuario?.conClave;

  return (
    <div>
      <BotonVolver texto="Volver a Ajustes" onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }} className="mb-4">Mi cuenta</h2>

      {!usuario ? (
        <div className="p-5" style={{ borderRadius: 18, border: "1px solid #E6ECF5", background: "#fff", boxShadow: "0 6px 20px rgba(11,42,84,0.07)" }}>
          <PanelAcceso onLogged={onLogged} />
        </div>
      ) : (
        <>
          {/* Quién sos en Mi Zona */}
          <div className="flex items-center gap-3.5 p-4 mb-1" style={TARJETA_SEG}>
            <span className="flex items-center justify-center shrink-0 text-xl font-bold" style={{ width: 54, height: 54, borderRadius: "50%", background: "#0B2A54", color: "#fff", fontFamily: "var(--fuente-titulo)" }}>{inicial}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-base font-bold truncate" style={{ color: "#0B1220", fontFamily: "var(--fuente-titulo)" }}>{usuario.nombre || "Sin nombre"}</span>
              <span className="block text-xs truncate mt-0.5" style={{ color: "#4B5563" }}>{usuario.email}</span>
              <span className="inline-block text-[11px] font-semibold px-2 py-0.5 mt-1.5" style={{ borderRadius: 8, background: "#E8F0FE", color: "#2F6FED" }}>{conCorreo ? "Entrás con correo y contraseña" : "Entrás con Google"}</span>
            </span>
          </div>

          <Etiqueta>Tus datos</Etiqueta>
          <div className="p-4" style={TARJETA_SEG}>
            <label className="text-xs font-medium block mb-1" style={{ color: "#374151" }}>Nombre</label>
            <input
              value={nombre} maxLength={60} onChange={(e) => { setNombre(e.target.value); setEstado(null); }}
              onKeyDown={(e) => e.key === "Enter" && cambio && nombre.trim().length >= 2 && guardar()}
              className="w-full border px-3 py-2.5 text-sm mb-3" style={{ borderRadius: 8, borderColor: "#E2E8F0" }}
            />
            <label className="text-xs font-medium block mb-1" style={{ color: "#374151" }}>Correo de tu cuenta</label>
            <div className="flex items-center gap-2 text-sm px-3 py-2.5 mb-3" style={{ borderRadius: 8, background: "#F3F6FB", color: "#0B1220" }}>
              <Mail size={14} color="#4B5563" /> <span className="truncate">{usuario.email}</span>
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

          <Etiqueta>Tu actividad en Mi Zona</Etiqueta>
          <div className="overflow-hidden" style={TARJETA_SEG}>
            <FilaDato Icon={CalendarDays} titulo="Miembro desde" valor={resumen ? fmtFechaLarga(resumen.cuenta.creadaEn) : "…"} />
            <FilaDato Icon={Star} titulo="Reseñas que escribiste" valor={resumen ? resumen.resenas : "…"} />
            <FilaDato Icon={Heart} titulo="Favoritos en este dispositivo" valor={local?.favoritos ?? 0} />
            <FilaDato Icon={Store} titulo="Negocios en tu cuenta" valor={resumen ? negocios.length : "…"} ultimo />
          </div>

          {negocios.length > 0 && (
            <>
              <Etiqueta>Tus negocios</Etiqueta>
              <div className="overflow-hidden" style={TARJETA_SEG}>
                {negocios.map((n, i) => {
                  const e = estadoNegocio(n);
                  return (
                    <div key={n.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i === negocios.length - 1 ? "none" : "1px solid #EEF2F7" }}>
                      <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 11, background: "#E8F0FE" }}><Store size={16} color="#2F6FED" /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate" style={{ color: "#0B1220" }}>{n.nombre}</span>
                        <span className="block text-xs mt-0.5" style={{ color: e.color }}>{e.texto}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <button
            onClick={onCerrarSesion}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 mt-6"
            style={{ borderRadius: 10, border: "1px solid #C1443A", color: "#9A3B34", background: "#fff" }}
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
          <EliminarCuenta usuario={usuario} onEliminada={onCuentaEliminada} />
        </>
      )}
    </div>
  );
}

/* ---------- Mi cuenta → Eliminar cuenta ---------- */

function EliminarCuenta({ usuario, onEliminada }) {
  const [abierto, setAbierto] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [texto, setTexto] = useState("");
  const [clave, setClave] = useState("");
  const [conNegocios, setConNegocios] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);
  const esClave = !!usuario.conClave;
  const negocios = resumen?.negocios || [];

  const abrir = async () => {
    setAbierto(true); setError(null);
    if (!esClave) cargarGoogle().catch(() => {});
    try { setResumen(await privacidadApi.resumen()); } catch (e) { setError(e.message); }
  };
  const listo = !!resumen && texto.trim().toUpperCase() === "ELIMINAR" && (!esClave || clave) && (!negocios.length || conNegocios);

  const eliminar = async () => {
    setError(null); setTrabajando(true);
    try {
      const cuerpo = { confirmacion: "ELIMINAR", eliminarNegocios: conNegocios };
      if (esClave) cuerpo.password = clave;
      else cuerpo.accessToken = await pedirCuentaGoogle(); // se vuelve a pedir Google para confirmar que sos vos
      await privacidadApi.eliminarCuenta(cuerpo);
      setToken(null);
      onEliminada();
    } catch (e) {
      if (!e.cancelado) setError(e.message || "No se pudo eliminar la cuenta.");
      setTrabajando(false);
    }
  };

  if (!abierto) {
    return (
      <button onClick={abrir} className="w-full text-sm font-medium py-3 mt-4" style={{ color: "#9A3B34" }}>
        Eliminar mi cuenta
      </button>
    );
  }
  return (
    <div className="mt-5 p-4" style={{ borderRadius: 16, border: "1px solid #F0D3D0", background: "#fff" }}>
      <p className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "#9A3B34" }}><AlertTriangle size={16} /> Eliminar mi cuenta</p>
      <p className="text-sm mb-2" style={{ color: "#374151", lineHeight: 1.5 }}>Se borran tu cuenta, tu agenda, tus notificaciones y las reseñas que escribiste. No se puede deshacer.</p>
      {negocios.length > 0 && (
        <>
          <p className="text-sm mb-3" style={{ color: "#374151", lineHeight: 1.5 }}>
            También se elimina <b>{negocios.length === 1 ? "tu negocio" : `tus ${negocios.length} negocios`}</b> ({negocios.map((n) => n.nombre).join(", ")}). La suscripción pagada no se reembolsa.
          </p>
          <label className="flex items-start gap-2 text-sm mb-3" style={{ color: "#0B1220", lineHeight: 1.4 }}>
            <input type="checkbox" checked={conNegocios} onChange={(e) => setConNegocios(e.target.checked)} className="mt-1" />
            Entiendo que mi negocio se elimina con la cuenta.
          </label>
        </>
      )}
      <p className="text-[13px] mb-3" style={{ color: "#4B5563", lineHeight: 1.5 }}>Tus chats y puntos con los asistentes están en Mi Asistente y no se borran desde acá.</p>
      {esClave && (
        <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Tu contraseña" autoComplete="current-password" maxLength={100}
          className="w-full border px-3.5 py-2.5 text-sm mb-2.5" style={{ borderRadius: 10, borderColor: "#E2E8F0" }} />
      )}
      <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribí ELIMINAR para confirmar" autoCapitalize="characters"
        className="w-full border px-3.5 py-2.5 text-sm mb-2.5" style={{ borderRadius: 10, borderColor: "#E2E8F0" }} />
      {!esClave && <p className="text-[13px] mb-2.5" style={{ color: "#4B5563" }}>Google te va a pedir elegir tu cuenta otra vez para confirmar que sos vos.</p>}
      {error && <p className="text-sm mb-2.5" style={{ color: "#C1443A" }}>{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => { setAbierto(false); setTexto(""); setClave(""); setError(null); setConNegocios(false); }} disabled={trabajando} className="flex-1 text-sm font-medium py-2.5" style={{ borderRadius: 10, border: "1px solid #E2E8F0" }}>Cancelar</button>
        <button onClick={eliminar} disabled={!listo || trabajando} className="flex-1 text-sm font-semibold py-2.5 flex items-center justify-center gap-1.5" style={{ borderRadius: 10, background: "#C1443A", color: "#fff", opacity: !listo || trabajando ? 0.5 : 1 }}>
          {trabajando && <Loader2 size={14} className="animate-spin" />} Eliminar
        </button>
      </div>
    </div>
  );
}

/* ---------- Ajustes → Seguridad ----------
   Menú corto como el de Google, Instagram o Mercado Pago: cada fila abre su propia pantalla.
   Contraseña · Alertas de inicio de sesión · Dispositivos con sesión · Actividad reciente (el estado general va arriba, sin pantalla aparte) */

const TARJETA_SEG = { borderRadius: 18, border: "1px solid #E1E8F2", background: "#fff", boxShadow: "0 1px 2px rgba(11,42,84,0.05), 0 8px 24px rgba(11,42,84,0.06)" };
const VERDE = "#1E8A55", AMBAR = "#C77A0A";

function hace(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 2) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} ${d === 1 ? "día" : "días"}`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}
const fechaHora = (iso) => new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Etiqueta({ children }) {
  return <h3 className="px-1 mb-2 mt-6" style={{ fontFamily: "var(--fuente-titulo)", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#4B5563" }}>{children}</h3>;
}

// Fila del menú: ícono de color, título, dato corto a la derecha y flecha (abre una pantalla)
function FilaMenu({ Icon, color, titulo, desc, valor, tonoValor, onClick, ultimo }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-slate-50" style={{ borderBottom: ultimo ? "none" : "1px solid #EEF2F7" }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: color }}><Icon size={20} color="#fff" /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold" style={{ color: "#0B1220", fontFamily: "var(--fuente-titulo)" }}>{titulo}</span>
        {desc && <span className="block text-xs mt-0.5" style={{ color: "#4B5563", lineHeight: 1.4 }}>{desc}</span>}
      </span>
      {valor && <span className="text-sm font-semibold shrink-0" style={{ color: tonoValor || "#4B5563" }}>{valor}</span>}
      <ChevronRight size={18} color="#94A3B8" className="shrink-0" />
    </button>
  );
}

function Interruptor({ activo, onChange, disabled }) {
  return (
    <button role="switch" aria-checked={activo} disabled={disabled} onClick={() => onChange(!activo)} className="shrink-0 relative transition-colors" style={{ width: 52, height: 32, borderRadius: 16, background: activo ? VERDE : "#CBD5E1", opacity: disabled ? 0.6 : 1 }}>
      <span className="absolute transition-all" style={{ top: 3, left: activo ? 23 : 3, width: 26, height: 26, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

// Encabezado de cada subpantalla: volver a Seguridad + título
function CabeceraSeg({ titulo, sub, onBack }) {
  return (
    <>
      <BotonVolver texto="Volver a Seguridad" onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{titulo}</h2>
      {sub && <p className="text-sm mt-1.5 mb-5" style={{ color: "#4B5563", lineHeight: 1.5 }}>{sub}</p>}
      {!sub && <div className="mb-5" />}
    </>
  );
}

/* ----- Contraseña ----- */
function SegContrasena({ usuario, onBack, onCambio }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [estado, setEstado] = useState(null); // null | "guardando" | "ok" | { error }
  const campo = { borderRadius: 12, borderColor: "#CBD5E1", background: "#fff", color: "#0B1220" };

  if (!usuario.conClave) {
    return (
      <div>
        <CabeceraSeg titulo="Contraseña" sub="Entrás con Google: tu contraseña y la verificación en dos pasos se manejan desde tu cuenta de Google." onBack={onBack} />
        <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3.5" style={{ borderRadius: 14, background: "#0B2A54", color: "#fff" }}>
          Administrar en Google <ChevronRight size={16} />
        </a>
      </div>
    );
  }
  const valida = actual && nueva.length >= 8 && nueva === repetir;
  const guardar = async () => {
    setEstado("guardando");
    try {
      await cambiarClave(actual, nueva);
      setActual(""); setNueva(""); setRepetir("");
      setEstado("ok");
      onCambio?.();
    } catch (e) { setEstado({ error: e.message }); }
  };
  const cambia = (set) => (e) => { set(e.target.value); setEstado(null); };
  return (
    <div>
      <CabeceraSeg titulo="Contraseña" sub="Al cambiarla cerramos tu sesión en todos los demás dispositivos." onBack={onBack} />
      <div className="p-4" style={TARJETA_SEG}>
        <div className="flex flex-col gap-3">
          <input value={actual} onChange={cambia(setActual)} type={ver ? "text" : "password"} autoComplete="current-password" placeholder="Contraseña actual" maxLength={100} className="w-full border px-3.5 py-3 text-sm" style={campo} />
          <input value={nueva} onChange={cambia(setNueva)} type={ver ? "text" : "password"} autoComplete="new-password" placeholder="Contraseña nueva (mínimo 8 caracteres)" maxLength={100} className="w-full border px-3.5 py-3 text-sm" style={campo} />
          <input value={repetir} onChange={cambia(setRepetir)} type={ver ? "text" : "password"} autoComplete="new-password" placeholder="Repetí la contraseña nueva" maxLength={100} className="w-full border px-3.5 py-3 text-sm" style={campo} />
          <label className="flex items-center gap-2 text-sm" style={{ color: "#374151" }}>
            <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar contraseñas
          </label>
          {repetir && nueva !== repetir && <p className="text-sm" style={{ color: "#C1443A" }}>Las contraseñas nuevas no coinciden.</p>}
          {estado?.error && <p className="text-sm" style={{ color: "#C1443A" }}>{estado.error}</p>}
          {estado === "ok" && <p className="text-sm flex items-center gap-1.5" style={{ color: "#1E6B44" }}><Check size={15} /> Listo: cambiaste tu contraseña y cerramos las otras sesiones.</p>}
          <button onClick={guardar} disabled={!valida || estado === "guardando"} className="w-full text-sm font-bold py-3.5" style={{ borderRadius: 14, background: "#0B2A54", color: "#fff", opacity: !valida || estado === "guardando" ? 0.45 : 1 }}>
            {estado === "guardando" ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----- Dispositivos con sesión ----- */
function IconoDispositivo({ tipo, size = 22 }) {
  const I = tipo === "celular" ? Smartphone : tipo === "tablet" ? Tablet : Monitor;
  return <I size={size} />;
}

function SegDispositivos({ sesiones, error, recargar, onBack }) {
  const [confirmar, setConfirmar] = useState(null); // id de sesión | "todas" | null
  const [trabajando, setTrabajando] = useState(false);
  const [fallo, setFallo] = useState(null);
  const actual = (sesiones || []).find((s) => s.actual);
  const otras = (sesiones || []).filter((s) => !s.actual);

  const cerrarUna = async (id) => {
    setTrabajando(true); setFallo(null);
    try { await seguridadApi.cerrarSesion(id); setConfirmar(null); await recargar(); }
    catch (e) { setFallo(e.message); }
    finally { setTrabajando(false); }
  };
  const cerrarTodas = async () => {
    setTrabajando(true); setFallo(null);
    try { await cerrarOtrasSesiones(); setConfirmar(null); await recargar(); }
    catch (e) { setFallo(e.message); }
    finally { setTrabajando(false); }
  };

  return (
    <div>
      <CabeceraSeg titulo="Dispositivos" sub="Los celulares y computadoras donde tenés la sesión abierta." onBack={onBack} />
      {sesiones === null && !error && <p className="text-sm flex items-center gap-2" style={{ color: "#4B5563" }}><Loader2 size={16} className="animate-spin" /> Cargando...</p>}
      {error && (
        <div className="p-4 text-sm flex items-center justify-between gap-3" style={{ borderRadius: 14, background: "#F7E7E5", color: "#9A3B34" }}>
          <span>No pudimos cargar tus dispositivos.</span>
          <button onClick={recargar} className="font-bold shrink-0">Reintentar</button>
        </div>
      )}
      {fallo && <p className="text-sm mb-3" style={{ color: "#C1443A" }}>{fallo}</p>}

      {actual && (
        <>
          <Etiqueta>Este dispositivo</Etiqueta>
          <div className="flex items-center gap-3.5 px-4 py-3.5" style={TARJETA_SEG}>
            <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 14, background: "#E4F3EA", color: VERDE }}><IconoDispositivo tipo={actual.tipo} /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-semibold" style={{ color: "#0B1220", fontFamily: "var(--fuente-titulo)" }}>{actual.dispositivo}</span>
              <span className="block text-xs mt-0.5" style={{ color: VERDE, fontWeight: 600 }}>Activo ahora</span>
            </span>
          </div>
        </>
      )}

      {sesiones !== null && (
        <>
          <Etiqueta>Otros dispositivos</Etiqueta>
          {otras.length === 0 ? (
            <div className="px-4 py-5 text-sm text-center" style={{ ...TARJETA_SEG, color: "#4B5563" }}>No hay otros dispositivos con la sesión abierta.</div>
          ) : (
            <>
              <div className="overflow-hidden" style={TARJETA_SEG}>
                {otras.map((s, i) => (
                  <div key={s.id} className="px-4 py-3.5" style={{ borderBottom: i === otras.length - 1 ? "none" : "1px solid #EEF2F7" }}>
                    <div className="flex items-center gap-3.5">
                      <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 14, background: "#EEF3FB", color: "#0B2A54" }}><IconoDispositivo tipo={s.tipo} /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] font-semibold truncate" style={{ color: "#0B1220", fontFamily: "var(--fuente-titulo)" }}>{s.dispositivo}</span>
                        <span className="block text-xs mt-0.5" style={{ color: "#4B5563" }}>Último uso {hace(s.ultimoUso)}</span>
                      </span>
                      {confirmar !== s.id && (
                        <button onClick={() => setConfirmar(s.id)} className="text-sm font-bold shrink-0 px-3 py-2" style={{ borderRadius: 10, color: "#C1443A", background: "#FBEDEC" }}>Cerrar sesión</button>
                      )}
                    </div>
                    {confirmar === s.id && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setConfirmar(null)} className="flex-1 text-sm font-semibold py-2.5" style={{ borderRadius: 10, border: "1px solid #CBD5E1", color: "#0B1220" }}>Cancelar</button>
                        <button onClick={() => cerrarUna(s.id)} disabled={trabajando} className="flex-1 text-sm font-bold py-2.5" style={{ borderRadius: 10, background: "#C1443A", color: "#fff", opacity: trabajando ? 0.6 : 1 }}>{trabajando ? "Cerrando..." : "Sí, cerrar"}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                {confirmar === "todas" ? (
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmar(null)} className="flex-1 text-sm font-semibold py-3.5" style={{ borderRadius: 14, border: "1px solid #CBD5E1", color: "#0B1220" }}>Cancelar</button>
                    <button onClick={cerrarTodas} disabled={trabajando} className="flex-1 text-sm font-bold py-3.5" style={{ borderRadius: 14, background: "#C1443A", color: "#fff", opacity: trabajando ? 0.6 : 1 }}>{trabajando ? "Cerrando..." : "Sí, cerrar todas"}</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmar("todas")} className="w-full text-sm font-bold py-3.5" style={{ borderRadius: 14, border: "1.5px solid #C1443A", color: "#9A3B34" }}>Cerrar sesión en todos los demás</button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ----- Actividad reciente ----- */
const ACTIVIDAD = {
  cuenta_creada: { Icon: User, color: "#2F6FED", texto: "Creaste tu cuenta" },
  inicio_sesion: { Icon: LogOut, color: "#0B2A54", texto: "Iniciaste sesión" },
  contrasena_cambiada: { Icon: KeyRound, color: "#C77A0A", texto: "Cambiaste tu contraseña" },
  sesiones_cerradas: { Icon: ShieldCheck, color: "#1E8A55", texto: "Cerraste la sesión en los demás dispositivos" },
  sesion_cerrada: { Icon: ShieldCheck, color: "#1E8A55", texto: "Cerraste la sesión de un dispositivo" },
};

function SegActividad({ onBack, irDispositivos }) {
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState(false);
  const cargar = () => { setError(false); seguridadApi.actividad().then(setEventos).catch(() => setError(true)); };
  useEffect(cargar, []);
  return (
    <div>
      <CabeceraSeg titulo="Actividad reciente" sub="Inicios de sesión y cambios de seguridad de los últimos 90 días." onBack={onBack} />
      {eventos === null && !error && <p className="text-sm flex items-center gap-2" style={{ color: "#4B5563" }}><Loader2 size={16} className="animate-spin" /> Cargando...</p>}
      {error && (
        <div className="p-4 text-sm flex items-center justify-between gap-3" style={{ borderRadius: 14, background: "#F7E7E5", color: "#9A3B34" }}>
          <span>No pudimos cargar la actividad.</span>
          <button onClick={cargar} className="font-bold shrink-0">Reintentar</button>
        </div>
      )}
      {eventos && eventos.length === 0 && <div className="px-4 py-6 text-sm text-center" style={{ ...TARJETA_SEG, color: "#4B5563" }}>Todavía no hay actividad registrada.</div>}
      {eventos && eventos.length > 0 && (
        <div className="overflow-hidden" style={TARJETA_SEG}>
          {eventos.map((e, i) => {
            const m = ACTIVIDAD[e.tipo] || { Icon: History, color: "#64748B", texto: "Actividad de la cuenta" };
            return (
              <div key={`${e.fecha}-${i}`} className="flex items-center gap-3.5 px-4 py-3.5" style={{ borderBottom: i === eventos.length - 1 ? "none" : "1px solid #EEF2F7" }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: m.color }}><m.Icon size={18} color="#fff" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: "#0B1220" }}>{m.texto}</span>
                  <span className="block text-xs mt-0.5" style={{ color: "#4B5563" }}>{[e.dispositivo, fechaHora(e.fecha)].filter(Boolean).join(" · ")}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      {eventos && eventos.length > 0 && (
        <button onClick={irDispositivos} className="w-full text-sm font-bold py-3.5 mt-4" style={{ borderRadius: 14, border: "1.5px solid #0B2A54", color: "#0B2A54" }}>¿No reconocés algo? Revisar dispositivos</button>
      )}
    </div>
  );
}

/* ----- Alertas de inicio de sesión ----- */
function SegAlertas({ alertas, setAlertas, push, recargarPush, onBack }) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const cambiar = async (v) => {
    setGuardando(true); setError(null);
    try { setAlertas(await seguridadApi.guardarAlertas(v)); }
    catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  };
  const activar = async () => {
    setError(null);
    try { await activarPush(); } catch (e) { setError(e.message); }
    recargarPush();
  };
  return (
    <div>
      <CabeceraSeg titulo="Alertas de inicio de sesión" sub="Te avisamos por notificación cuando alguien entra a tu cuenta desde un dispositivo nuevo o cambia tu contraseña." onBack={onBack} />
      <div style={TARJETA_SEG}>
        <div className="flex items-center gap-3.5 px-4 py-4">
          <span className="flex-1 text-[15px] font-semibold" style={{ color: "#0B1220", fontFamily: "var(--fuente-titulo)" }}>Avisarme de accesos nuevos</span>
          <Interruptor activo={alertas !== false} onChange={cambiar} disabled={guardando || alertas === null} />
        </div>
      </div>
      {error && <p className="text-sm mt-3 px-1" style={{ color: "#C1443A" }}>{error}</p>}

      <Etiqueta>Notificaciones en este dispositivo</Etiqueta>
      <div className="flex items-center gap-3.5 px-4 py-3.5" style={TARJETA_SEG}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: push === "activo" ? VERDE : "#94A3B8" }}><BellRing size={20} color="#fff" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold" style={{ color: "#0B1220", fontFamily: "var(--fuente-titulo)" }}>{push === "activo" ? "Activadas" : push === "bloqueado" ? "Bloqueadas" : push === "no-soportado" ? "No disponibles" : "Desactivadas"}</span>
          {push !== "activo" && <span className="block text-xs mt-0.5" style={{ color: "#4B5563", lineHeight: 1.4 }}>{push === "bloqueado" ? "Habilitalas desde la configuración del navegador." : push === "no-soportado" ? "Este navegador no las permite." : "Sin ellas no te llegan las alertas."}</span>}
        </span>
        {(push === "inactivo") && <button onClick={activar} className="text-sm font-bold shrink-0 px-3.5 py-2" style={{ borderRadius: 10, background: "#0B2A54", color: "#fff" }}>Activar</button>}
      </div>
    </div>
  );
}

/* ----- Estado de la cuenta -----
   Antes había una pantalla "Revisión de seguridad" que repetía las mismas filas de abajo (Dispositivos, Alertas) y mandaba a ellas.
   Ahora el estado se ve arriba en un solo cartel y cada fila de abajo marca en ámbar lo que hay que mirar. */
function estadoSeguridad({ sesiones, alertas, push }) {
  const otras = (sesiones || []).filter((s) => !s.actual).length;
  const alertasApagadas = alertas === false;
  const sinAvisos = alertas !== false && alertas !== null && push && push !== "activo" && push !== "no-soportado";
  const pendientes = (otras > 0 ? 1 : 0) + (alertasApagadas ? 1 : 0) + (sinAvisos ? 1 : 0);
  return { otras, alertasApagadas, sinAvisos, pendientes, cargando: sesiones === null && alertas === null };
}

/* ----- Pantalla principal de Seguridad ----- */
export function SeguridadScreen({ usuario, onBack, onLogin }) {
  const [vista, setVista] = useState(null); // null | "clave" | "dispositivos" | "actividad" | "alertas"
  const [sesiones, setSesiones] = useState(null);
  const [errorSesiones, setErrorSesiones] = useState(false);
  const [alertas, setAlertas] = useState(null);
  const [push, setPush] = useState(null);

  const cargarSesiones = async () => {
    setErrorSesiones(false);
    try { setSesiones(await seguridadApi.sesiones()); } catch { setErrorSesiones(true); }
  };
  const cargarPush = () => estadoPush().then(setPush).catch(() => setPush("inactivo"));
  useEffect(() => {
    if (!usuario) return;
    cargarSesiones();
    seguridadApi.alertas().then(setAlertas).catch(() => {});
    cargarPush();
  }, [usuario?.id]);

  if (!usuario) {
    return (
      <div>
        <BotonVolver texto="Volver a Ajustes" onClick={onBack} />
        <h2 style={{ ...TITULO, fontSize: 24, fontWeight: 800 }} className="mb-2">Seguridad</h2>
        <p className="text-sm mb-4" style={{ color: "#374151", lineHeight: 1.5 }}>Iniciá sesión para ver y cambiar la seguridad de tu cuenta.</p>
        <button onClick={onLogin} className="w-full text-sm font-bold py-3.5" style={{ borderRadius: 14, background: "#0B2A54", color: "#fff" }}>Iniciar sesión</button>
      </div>
    );
  }

  const atras = () => setVista(null);
  if (vista === "clave") return <SegContrasena usuario={usuario} onBack={atras} onCambio={cargarSesiones} />;
  if (vista === "dispositivos") return <SegDispositivos sesiones={sesiones} error={errorSesiones} recargar={cargarSesiones} onBack={atras} />;
  if (vista === "actividad") return <SegActividad onBack={atras} irDispositivos={() => setVista("dispositivos")} />;
  if (vista === "alertas") return <SegAlertas alertas={alertas} setAlertas={setAlertas} push={push} recargarPush={cargarPush} onBack={atras} />;

  const est = estadoSeguridad({ sesiones, alertas, push });
  const nDisp = sesiones ? sesiones.length : null;

  return (
    <div>
      <BotonVolver texto="Volver a Ajustes" onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>Seguridad</h2>
      <p className="text-sm mt-1.5 mb-4 truncate" style={{ color: "#4B5563" }}>{usuario.email}</p>

      {!est.cargando && (
        <div className="flex items-center gap-3.5 p-4 mb-1" data-conservar-color style={{ borderRadius: 18, background: est.pendientes ? "#FFF4E0" : "#E4F3EA", border: `1px solid ${est.pendientes ? "#F3D9A4" : "#BFE3CE"}` }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 14, background: est.pendientes ? AMBAR : VERDE }}>{est.pendientes ? <AlertTriangle size={22} color="#fff" /> : <ShieldCheck size={23} color="#fff" />}</span>
          <span>
            <span className="block text-[16px] font-bold" style={{ color: "#0B1220", fontFamily: "var(--fuente-titulo)" }}>{est.pendientes ? `${est.pendientes} ${est.pendientes === 1 ? "cosa para revisar" : "cosas para revisar"}` : "Tu cuenta está al día"}</span>
            <span className="block text-xs mt-0.5" style={{ color: "#374151" }}>{est.pendientes ? "Mirá lo que está marcado en ámbar acá abajo." : "No hay nada para revisar."}</span>
          </span>
        </div>
      )}

      <Etiqueta>Iniciar sesión</Etiqueta>
      <div className="overflow-hidden" style={TARJETA_SEG}>
        <FilaMenu Icon={KeyRound} color="#2F6FED" titulo="Contraseña" valor={usuario.conClave ? null : "Google"} onClick={() => setVista("clave")} />
        <FilaMenu Icon={Bell} color="#E08A1E" titulo="Alertas de inicio de sesión" desc={est.sinAvisos ? "Las notificaciones de este dispositivo están apagadas." : undefined} valor={alertas === null ? null : alertas === false ? "Desactivadas" : est.sinAvisos ? "Sin avisos" : "Activadas"} tonoValor={est.alertasApagadas || est.sinAvisos ? AMBAR : undefined} onClick={() => setVista("alertas")} ultimo />
      </div>

      <Etiqueta>Tu actividad</Etiqueta>
      <div className="overflow-hidden" style={TARJETA_SEG}>
        <FilaMenu Icon={MonitorSmartphone} color="#0B2A54" titulo="Dispositivos" desc={est.otras > 0 ? `${est.otras} ${est.otras === 1 ? "dispositivo más" : "dispositivos más"} con tu sesión abierta: revisá que sean tuyos.` : undefined} valor={nDisp === null ? null : String(nDisp)} tonoValor={est.otras > 0 ? AMBAR : undefined} onClick={() => setVista("dispositivos")} />
        <FilaMenu Icon={History} color="#7A4F9E" titulo="Actividad reciente" onClick={() => setVista("actividad")} ultimo />
      </div>
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
      <BotonVolver texto="Volver a Ajustes" onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 18 }} className="mb-2">Notificaciones</h2>
      <p className="text-sm mb-5" style={{ color: "#374151", lineHeight: 1.6 }}>
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
              <p className="text-xs" style={{ color: "#4B5563" }}>Se configuran por dispositivo.</p>
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
          <button onClick={onClose} aria-label="Cerrar"><X size={18} color="#4B5563" /></button>
        </div>
        {nombreNegocio && <p className="text-xs mb-3 truncate" style={{ color: "#4B5563" }}>{nombreNegocio}</p>}

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
              <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: "#374151" }}>
                <Clock size={12} /> Hoy vence el {fmtFecha(vencimientoActual)}. Los meses nuevos se suman a esa fecha: no perdés nada.
              </p>
            )}
            {!vencimientoActual && (
              <p className="text-xs mb-3" style={{ color: "#374151" }}>Elegí por cuánto tiempo querés publicar tu negocio. Podés agregar más meses cuando quieras.</p>
            )}
            <div className="flex flex-col gap-2 mb-3">
              {!planes && !error && <p className="text-xs py-4 text-center" style={{ color: "#4B5563" }}>Cargando planes...</p>}
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
                      <span className="block text-[11px]" style={{ color: "#4B5563" }}>
                        {fmtPesos(p.precioPorMes)} por mes{p.ahorro > 0 ? ` · ahorrás ${fmtPesos(p.ahorro)}` : ""}
                      </span>
                    </span>
                    <span className="text-sm font-bold" style={{ color: "#0B2A54", fontFamily: "var(--fuente-titulo)" }}>{fmtPesos(p.precio)}</span>
                  </button>
                );
              })}
            </div>
            {nuevoVencimiento && (
              <p className="text-xs mb-3" style={{ color: "#374151" }}>Tu negocio quedaría activo hasta el <b>{fmtFecha(nuevoVencimiento)}</b>.</p>
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
      <p className="text-xs mb-2.5" style={{ color: "#374151" }}>{texto}</p>
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
