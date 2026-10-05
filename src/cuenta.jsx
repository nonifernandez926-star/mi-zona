// Cuenta de Google, nombre, suscripción del negocio y notificaciones push de Mi Zona.
import { useEffect, useRef, useState } from "react";
import { X, Check, LogOut, User, Bell, BellOff, ChevronLeft, ChevronRight, Mail, Clock, Sparkles, Trash2, AlertTriangle, Loader2, ShieldCheck, KeyRound, MonitorSmartphone, CreditCard, Store, Star, Lock, LifeBuoy, Timer, BadgeCheck, MessageCircle } from "lucide-react";
import {
  cargarGoogle, pedirCuentaGoogle, cambiarClave, cerrarOtrasSesiones, loginConGoogle, revisarCorreo, registrarConCorreo, entrarConCorreo, guardarNombre, traerPlanes,
  estadoPush, activarPush, desactivarPush, privacidadApi, setToken,
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

export function MiCuentaScreen({ usuario, onBack, onLogged, onUsuarioActualizado, onCerrarSesion, onCuentaEliminada }) {
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
      <BotonVolver texto="Volver a Ajustes" onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 18 }} className="mb-4">Mi cuenta</h2>

      {!usuario ? (
        <div className="p-5" style={{ borderRadius: 18, border: "1px solid #E6ECF5", background: "#fff", boxShadow: "0 6px 20px rgba(11,42,84,0.07)" }}>
          <PanelAcceso onLogged={onLogged} />
        </div>
      ) : (
        <>
          <div className="p-4 mb-4" style={{ borderRadius: 12, border: "1px solid #E2E8F0", background: "#fff" }}>
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
          <button
            onClick={onCerrarSesion}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3"
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

/* ---------- Ajustes → Seguridad ---------- */

const TARJETA_SEG = { borderRadius: 18, border: "1px solid #E1E8F2", background: "#fff", boxShadow: "0 1px 2px rgba(11,42,84,0.05), 0 8px 24px rgba(11,42,84,0.06)" };

function SegSeccion({ titulo, desc, children }) {
  return (
    <section className="mb-6">
      <h3 style={{ ...TITULO, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: "#4B5563", fontWeight: 700 }} className="px-1 mb-2">{titulo}</h3>
      {desc && <p className="text-sm px-1 mb-2.5" style={{ color: "#4B5563", lineHeight: 1.5 }}>{desc}</p>}
      {children}
    </section>
  );
}

function SegFila({ Icon, titulo, desc, valor, tono, ultimo, onClick }) {
  const colores = { ok: ["#E4F3EA", "#1E6B44"], aviso: ["#FDF1DC", "#8A5A0B"], neutro: ["#EEF3FB", "#0B2A54"] }[tono || "neutro"];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left" style={{ borderBottom: ultimo ? "none" : "1px solid #EEF2F7" }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: "#EEF3FB", color: "#0B2A54" }}><Icon size={19} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold" style={{ color: "#0B1220" }}>{titulo}</span>
        {desc && <span className="block text-xs mt-0.5" style={{ color: "#4B5563", lineHeight: 1.45 }}>{desc}</span>}
      </span>
      {valor && <span className="shrink-0 text-xs font-bold px-2.5 py-1" style={{ borderRadius: 999, background: colores[0], color: colores[1] }}>{valor}</span>}
      {onClick && !valor && <ChevronRight size={18} color="#64748B" className="shrink-0" />}
    </Tag>
  );
}

export function SeguridadScreen({ usuario, onBack, onLogin, onIrPrivacidad, onIrSoporte }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [estadoClave, setEstadoClave] = useState(null); // null | "guardando" | "ok" | { error }
  const [estadoSesiones, setEstadoSesiones] = useState(null); // null | "confirmar" | "cerrando" | "ok" | { error }
  const [resumen, setResumen] = useState(null); // datos reales de la cuenta (servidor)
  const campo = { borderRadius: 12, borderColor: "#CBD5E1", background: "#fff", color: "#0B1220" };

  useEffect(() => {
    if (!usuario) { setResumen(null); return; }
    let vivo = true;
    privacidadApi.resumen().then((r) => { if (vivo) setResumen(r); }).catch(() => {});
    return () => { vivo = false; };
  }, [usuario?.id]);

  const Volver = () => <BotonVolver texto="Volver a Ajustes" onClick={onBack} />;

  if (!usuario) {
    return (
      <div>
        <Volver />
        <h2 style={{ ...TITULO, fontSize: 22, fontWeight: 800 }} className="mb-2">Seguridad</h2>
        <p className="text-sm mb-4" style={{ color: "#374151", lineHeight: 1.5 }}>Iniciá sesión para ver y cambiar la seguridad de tu cuenta.</p>
        <button onClick={onLogin} className="w-full text-sm font-semibold py-3" style={{ borderRadius: 12, background: "#2F6FED", color: "#fff" }}>Iniciar sesión</button>
      </div>
    );
  }

  const conClave = usuario.conClave;
  const claveValida = actual && nueva.length >= 8 && nueva === repetir;
  const guardarClave = async () => {
    setEstadoClave("guardando");
    try {
      await cambiarClave(actual, nueva);
      setActual(""); setNueva(""); setRepetir("");
      setEstadoClave("ok");
      setTimeout(() => setEstadoClave(null), 3500);
    } catch (e) { setEstadoClave({ error: e.message }); }
  };
  const cerrarOtras = async () => {
    setEstadoSesiones("cerrando");
    try { await cerrarOtrasSesiones(); setEstadoSesiones("ok"); setTimeout(() => setEstadoSesiones(null), 3500); }
    catch (e) { setEstadoSesiones({ error: e.message }); }
  };

  const creada = resumen?.cuenta?.creadaEn ? fmtFecha(String(resumen.cuenta.creadaEn).slice(0, 10)) : null;
  const venceSesion = resumen?.sesion?.venceEn ? fmtFecha(String(resumen.sesion.venceEn).slice(0, 10)) : null;
  const negocios = resumen?.negocios || [];
  const dispositivos = resumen?.dispositivosPush ?? null;

  return (
    <div>
      <Volver />

      {/* portada */}
      <div className="relative overflow-hidden p-5 mb-6" data-conservar-color style={{ borderRadius: 22, background: "linear-gradient(135deg, #0B2A54 0%, #1B4A8C 100%)", color: "#fff", boxShadow: "0 10px 28px rgba(11,42,84,0.28)" }}>
        <div className="absolute" style={{ right: -28, top: -28, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div className="relative flex items-center gap-3.5">
          <span className="flex items-center justify-center shrink-0" style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)" }}><ShieldCheck size={27} color="#fff" /></span>
          <div className="min-w-0">
            <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: 22, lineHeight: 1.15, letterSpacing: "-0.02em" }}>Seguridad</h2>
            <p className="text-sm mt-1 truncate" style={{ color: "#CFE0FB" }}>{usuario.email}</p>
          </div>
        </div>
      </div>

      <SegSeccion titulo="Estado de tu cuenta">
        <div className="overflow-hidden" style={TARJETA_SEG}>
          <SegFila Icon={conClave ? Mail : BadgeCheck} titulo="Cómo entrás" desc={conClave ? "Con tu correo y una contraseña." : "Con tu cuenta de Google."} valor={conClave ? "Correo" : "Google"} />
          <SegFila Icon={Mail} titulo="Correo" desc={conClave ? "Tu correo no fue verificado por Google: por eso no se usa para reconocer pagos de Mi Asistente." : "Lo confirmó Google cuando entraste."} valor={conClave ? "Sin verificar" : "Verificado"} tono={conClave ? "aviso" : "ok"} />
          <SegFila Icon={KeyRound} titulo="Contraseña" desc={conClave ? "Se guarda cifrada: nadie, ni nosotros, puede verla." : "La contraseña y la verificación en dos pasos las maneja Google."} valor={conClave ? "Cifrada" : "En Google"} tono="ok" />
          <SegFila Icon={Timer} titulo="Sesión en este dispositivo" desc={venceSesion ? `Se cierra sola el ${venceSesion}. Cada vez que entrás de nuevo se renueva por 90 días.` : "Se cierra sola a los 90 días."} valor="90 días" />
          {creada && <SegFila Icon={Clock} titulo="Cuenta creada" desc={creada} />}
          <SegFila Icon={Store} titulo="Negocios a tu nombre" desc={negocios.length ? "Solo vos podés editarlos desde tu cuenta." : "Todavía no cargaste ninguno."} valor={String(negocios.length)} />
          <SegFila Icon={MonitorSmartphone} titulo="Dispositivos con avisos" desc="Celulares con las notificaciones de Mi Zona activadas." valor={dispositivos === null ? "—" : String(dispositivos)} ultimo />
        </div>
      </SegSeccion>

      {conClave ? (
        <SegSeccion titulo="Cambiar contraseña" desc="Al cambiarla cerramos tu sesión en todos los demás dispositivos.">
          <div className="p-4" style={TARJETA_SEG}>
            <div className="flex flex-col gap-2.5">
              <input value={actual} onChange={(e) => { setActual(e.target.value); setEstadoClave(null); }} type={ver ? "text" : "password"} autoComplete="current-password" placeholder="Contraseña actual" maxLength={100} className="w-full border px-3.5 py-3 text-sm" style={campo} />
              <input value={nueva} onChange={(e) => { setNueva(e.target.value); setEstadoClave(null); }} type={ver ? "text" : "password"} autoComplete="new-password" placeholder="Contraseña nueva (mínimo 8 caracteres)" maxLength={100} className="w-full border px-3.5 py-3 text-sm" style={campo} />
              <input value={repetir} onChange={(e) => { setRepetir(e.target.value); setEstadoClave(null); }} type={ver ? "text" : "password"} autoComplete="new-password" placeholder="Repetí la contraseña nueva" maxLength={100} className="w-full border px-3.5 py-3 text-sm" style={campo} />
              <label className="flex items-center gap-2 text-sm" style={{ color: "#374151" }}>
                <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar contraseñas
              </label>
              {repetir && nueva !== repetir && <p className="text-sm" style={{ color: "#C1443A" }}>Las contraseñas nuevas no coinciden.</p>}
              {estadoClave?.error && <p className="text-sm" style={{ color: "#C1443A" }}>{estadoClave.error}</p>}
              {estadoClave === "ok" && <p className="text-sm flex items-center gap-1.5" style={{ color: "#1E6B44" }}><Check size={15} /> Listo: cambiaste tu contraseña y cerramos tu sesión en los demás dispositivos.</p>}
              <button onClick={guardarClave} disabled={!claveValida || estadoClave === "guardando"} className="w-full text-sm font-bold py-3" style={{ borderRadius: 12, background: "#0B2A54", color: "#fff", opacity: !claveValida || estadoClave === "guardando" ? 0.45 : 1 }}>
                {estadoClave === "guardando" ? "Guardando..." : "Cambiar contraseña"}
              </button>
            </div>
          </div>
        </SegSeccion>
      ) : (
        <SegSeccion titulo="Contraseña y verificación en dos pasos">
          <div className="p-4" style={TARJETA_SEG}>
            <p className="text-sm" style={{ color: "#374151", lineHeight: 1.5 }}>Como entrás con Google, la contraseña, la verificación en dos pasos y las alertas de acceso se manejan desde tu cuenta de Google.</p>
            <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-bold mt-3" style={{ color: "#2F6FED" }}>
              Abrir la seguridad de mi cuenta de Google <ChevronRight size={16} />
            </a>
          </div>
        </SegSeccion>
      )}

      <SegSeccion titulo="Sesiones abiertas">
        <div className="p-4" style={TARJETA_SEG}>
          <p className="text-sm mb-3" style={{ color: "#374151", lineHeight: 1.5 }}>Si entraste desde un celular o computadora que no es tuya, cerrá la sesión en todos los demás dispositivos. Este sigue abierto.</p>
          {estadoSesiones?.error && <p className="text-sm mb-2" style={{ color: "#C1443A" }}>{estadoSesiones.error}</p>}
          {estadoSesiones === "ok" && <p className="text-sm mb-2 flex items-center gap-1.5" style={{ color: "#1E6B44" }}><Check size={15} /> Cerramos tu sesión en los demás dispositivos.</p>}
          {estadoSesiones === "confirmar" ? (
            <div className="flex gap-2">
              <button onClick={() => setEstadoSesiones(null)} className="flex-1 text-sm font-semibold py-3" style={{ borderRadius: 12, border: "1px solid #CBD5E1", color: "#0B1220" }}>Cancelar</button>
              <button onClick={cerrarOtras} className="flex-1 text-sm font-bold py-3" style={{ borderRadius: 12, background: "#C1443A", color: "#fff" }}>Sí, cerrar</button>
            </div>
          ) : (
            <button onClick={() => setEstadoSesiones("confirmar")} disabled={estadoSesiones === "cerrando"} className="w-full text-sm font-bold py-3" style={{ borderRadius: 12, border: "1.5px solid #C1443A", color: "#9A3B34", opacity: estadoSesiones === "cerrando" ? 0.5 : 1 }}>
              {estadoSesiones === "cerrando" ? "Cerrando..." : "Cerrar sesión en los demás dispositivos"}
            </button>
          )}
        </div>
      </SegSeccion>

      <SegSeccion titulo="Cómo cuidamos Mi Zona">
        <div className="overflow-hidden" style={TARJETA_SEG}>
          <SegFila Icon={Lock} titulo="Contraseñas cifradas" desc="Nunca guardamos tu contraseña, solo una huella que no se puede revertir." />
          <SegFila Icon={ShieldCheck} titulo="Frenamos los intentos repetidos" desc="Si alguien prueba contraseñas una y otra vez, el servidor lo bloquea un rato." />
          <SegFila Icon={KeyRound} titulo="Sesiones firmadas que vencen" desc="Si cambiás la contraseña o cerrás las otras sesiones, las anteriores dejan de servir." />
          <SegFila Icon={MessageCircle} titulo="Tus puntos, canjes y chats" desc="Solo se ven con tu sesión iniciada: no alcanza con conocer un id." />
          <SegFila Icon={Store} titulo="Tu negocio es solo tuyo" desc="Solo su dueño lo edita. Pagos, vencimiento y estado los maneja el servidor." />
          <SegFila Icon={Star} titulo="Reseñas protegidas" desc="Nadie puede editar ni borrar reseñas ajenas ni responder por el dueño." />
          <SegFila Icon={CreditCard} titulo="Pagos con Mercado Pago" desc="Cobra Mercado Pago: en Mi Zona nunca vemos los datos de tu tarjeta." ultimo />
        </div>
      </SegSeccion>

      <SegSeccion titulo="Consejos para cuidar tu cuenta">
        <div className="p-4" style={TARJETA_SEG}>
          <ul className="text-sm flex flex-col gap-2.5" style={{ color: "#374151", lineHeight: 1.5 }}>
            <li className="flex gap-2.5"><Check size={17} color="#1E6B44" className="shrink-0 mt-0.5" /><span>Usá una contraseña que no uses en ningún otro sitio.</span></li>
            <li className="flex gap-2.5"><Check size={17} color="#1E6B44" className="shrink-0 mt-0.5" /><span>En un celular o computadora compartida, cerrá sesión al terminar.</span></li>
            <li className="flex gap-2.5"><Check size={17} color="#1E6B44" className="shrink-0 mt-0.5" /><span>Pagá siempre dentro de Mercado Pago, desde Mi suscripción. Nadie del equipo te pide claves ni pagos por mensaje.</span></li>
            <li className="flex gap-2.5"><Check size={17} color="#1E6B44" className="shrink-0 mt-0.5" /><span>Si ves algo raro en tu cuenta, cerrá las otras sesiones y cambiá la contraseña.</span></li>
          </ul>
        </div>
      </SegSeccion>

      <SegSeccion titulo="Más">
        <div className="overflow-hidden" style={TARJETA_SEG}>
          {onIrPrivacidad && <SegFila Icon={Lock} titulo="Privacidad y mis datos" desc="Controles de uso, descarga de tus datos y eliminación de la cuenta." onClick={onIrPrivacidad} />}
          {onIrSoporte && <SegFila Icon={LifeBuoy} titulo="Avisar un problema de seguridad" desc="Escribile al equipo de Mi Zona." onClick={onIrSoporte} ultimo />}
        </div>
      </SegSeccion>
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
