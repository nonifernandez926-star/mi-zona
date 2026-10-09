// Cuenta de Google, nombre, suscripción del negocio y notificaciones push de Mi Zona.
import { useEffect, useRef, useState } from "react";
import { X, Check, LogOut, User, Bell, BellOff, ChevronLeft, ChevronRight, Mail, Clock, Sparkles, Trash2, AlertTriangle, Loader2, ShieldCheck, KeyRound, MonitorSmartphone, Smartphone, Monitor, Tablet, History, BellRing, Store, Star, Heart, CalendarDays } from "lucide-react";
import { tonoDe } from "./tonos";
import { validarUsuario, validarContrasena, requisitosContrasena, normalizarUsuario } from "./credenciales.js";
import {
  cargarGoogle, pedirCuentaGoogle, cambiarClave, guardarUsuario, usuarioDisponible, cerrarOtrasSesiones, loginConGoogle, revisarCorreo, registrarConCorreo, entrarConCorreo, guardarNombre, traerPlanes,
  estadoPush, activarPush, desactivarPush, privacidadApi, seguridadApi, setToken,
} from "./api.js";

const TITULO = { fontFamily: "var(--fuente-titulo)", fontWeight: 600, color: "#0B1437" };
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
// Flecha de volver: la misma de Mi Asistente (línea y punta, trazo 2)
const FlechaAtras = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
  </svg>
);
export function BotonAtras({ onClick, tono = "claro", size = 36, label = "Volver" }) {
  const estilos = {
    claro: { background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff" },
    oscuro: { background: "#F3F5FA", border: "none", color: "#0B1437" },
    foto: { background: "rgba(255,255,255,0.95)", border: "none", color: "#0B1437", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" },
  }[tono];
  return (
    <button
      onClick={onClick} aria-label={label}
      className="flex items-center justify-center shrink-0 active:scale-95 transition-transform"
      style={{ width: size, height: size, borderRadius: 12, ...estilos }}
    >
      <FlechaAtras size={Math.round(size * 0.55)} />
    </button>
  );
}

// Botón de las subpantallas de Ajustes (como en Mi Asistente): cuadrado con flecha + nombre de la pantalla
export function BotonVolver({ texto, onClick }) {
  const destino = String(texto || "").replace(/^Volver a /i, "") || "Volver";
  return (
    <button
      onClick={onClick} aria-label={texto}
      className="inline-flex items-center gap-3 mb-4 active:scale-95 transition-transform"
      style={{ color: "#0B1437" }}
    >
      <span className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 12, background: "#F3F5FA", color: "#0B1437" }}>
        <FlechaAtras size={20} />
      </span>
      <span style={{ fontFamily: "var(--fuente-titulo)", fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>{destino}</span>
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
  const campo = { borderRadius: 12, borderColor: "#E3E7F1", background: "#fff" };
  const boton = (activo) => ({ borderRadius: 14, background: "linear-gradient(180deg,#2A58FF,#1F47E0)", color: "#fff", opacity: activo ? 1 : 0.55, boxShadow: "0 1px 0 rgba(255,255,255,.18) inset, 0 10px 20px -8px rgba(35,80,245,.7)" });

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
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5" style={{ borderRadius: 12, background: "#F3F5FA" }}>
        <span className="flex items-center gap-2 min-w-0 text-sm" style={{ color: "#0B1437" }}><Mail size={14} color="#5B6482" /><span className="truncate">{correo.trim()}</span></span>
        <button type="button" onClick={volver} className="text-xs font-semibold shrink-0" style={{ color: "#2350F5" }}>Cambiar</button>
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
        <button type="button" onClick={() => setVer((v) => !v)} className="absolute text-xs font-semibold" style={{ right: 14, top: "50%", transform: "translateY(-50%)", color: "#2350F5" }}>
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
        style={{ borderRadius: 14, background: "#fff", border: "1px solid #DADCE0", color: "#1F2937", opacity: entrando ? 0.6 : 1, boxShadow: "0 1px 2px rgba(11,20,55,.08)" }}
      >
        <LogoG /> {entrando ? "Entrando..." : "Acceder con Google"}
      </button>
      {error && <p className="text-xs text-center mt-2" style={{ color: "#C1443A", lineHeight: 1.4 }}>{error}</p>}
      <div className="flex items-center gap-3 my-4">
        <span className="flex-1" style={{ height: 1, background: "#E3E7F1" }} />
        <span className="text-xs" style={{ color: "#64748B" }}>o con tu correo</span>
        <span className="flex-1" style={{ height: 1, background: "#E3E7F1" }} />
      </div>
      <FormularioCorreo onLogged={onLogged} />
      <p className="text-center mt-4" style={{ fontSize: 12, color: "#5B6482" }}>
        ¿No tenés cuenta?{" "}
        <button onClick={() => conGoogle("registro")} disabled={entrando} className="font-semibold" style={{ color: "#2350F5" }}>Registrarme</button>
      </p>
    </>
  );
}

/* ---------- iniciar sesión (ventana) ---------- */

export function LoginModal({ onClose, onLogged }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: "#0B1437cc" }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-6 overflow-y-auto" style={{ borderRadius: 24, maxHeight: "92vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 style={{ ...TITULO, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>Iniciar sesión</h2>
            <p className="text-sm mt-1" style={{ color: "#5B6482", lineHeight: 1.45 }}>Entrá para guardar favoritos, dejar reseñas y manejar tu negocio.</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 12, background: "#F1F4FA" }}><X size={17} color="#5B6482" /></button>
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
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ background: "#0B1437cc" }}>
      <div className="bg-white w-full max-w-sm p-6" style={{ borderRadius: 24 }}>
        <h2 style={{ ...TITULO, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }} className="mb-1.5">¡Bienvenido a Mi Zona!</h2>
        <p className="text-sm mb-4" style={{ color: "#2B3768" }}>¿Cómo te llamás? Después lo podés cambiar en Ajustes → Mi cuenta.</p>
        <input
          autoFocus value={nombre} maxLength={60}
          onChange={(e) => { setNombre(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && nombre.trim().length >= 2 && !guardando && guardar()}
          placeholder="Tu nombre"
          className="w-full border px-3 py-2.5 text-sm mb-2" style={{ borderRadius: 12, borderColor: error ? "#C1443A" : "#E3E7F1" }}
        />
        {error && <p className="text-xs mb-2" style={{ color: "#C1443A" }}>{error}</p>}
        <button
          onClick={guardar} disabled={nombre.trim().length < 2 || guardando}
          className="w-full text-sm font-semibold py-3 mt-1"
          style={{ background: "linear-gradient(180deg,#2A58FF,#1F47E0)", color: "#fff", borderRadius: 12, boxShadow: "0 10px 20px -8px rgba(35,80,245,.7)", opacity: nombre.trim().length < 2 || guardando ? 0.5 : 1 }}
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

const fmtFechaCorta = (iso) => (iso ? new Date(iso).toLocaleDateString("es-AR", { month: "short", year: "numeric" }) : "—");

// Encabezado de las subpantallas de Mi cuenta
function CabeceraCuenta({ titulo, sub, onBack }) {
  return (
    <>
      <BotonVolver texto="Volver a Mi cuenta" onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{titulo}</h2>
      {sub ? <p className="text-sm mt-1.5 mb-5" style={{ color: "#5B6482", lineHeight: 1.5 }}>{sub}</p> : <div className="mb-5" />}
    </>
  );
}

function Vacio({ Icon, texto }) {
  return (
    <div className="px-4 py-8 text-center" style={TARJETA_SEG}>
      <span className="flex items-center justify-center mx-auto mb-3" style={{ width: 52, height: 52, borderRadius: 17, background: "#F1F4FA", boxShadow: "inset 0 0 0 1px #E3E7F1" }}><Icon size={24} color="#8D95B0" /></span>
      <p className="text-sm" style={{ color: "#5B6482", lineHeight: 1.5 }}>{texto}</p>
    </div>
  );
}

function CuentaDesde({ usuario, resumen, conCorreo, onBack }) {
  const desde = resumen?.cuenta?.creadaEn;
  const dias = desde ? Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 86400000)) : null;
  const tiempo = dias === null ? "…" : dias < 1 ? "Desde hoy" : dias < 60 ? `${dias} ${dias === 1 ? "día" : "días"}` : `${Math.floor(dias / 30)} meses`;
  const vence = resumen?.sesion?.venceEn;
  return (
    <div>
      <CabeceraCuenta titulo="Miembro desde" sub="Cuándo y cómo empezaste en Mi Zona." onBack={onBack} />
      <div className="overflow-hidden" style={TARJETA_SEG}>
        <FilaDato Icon={CalendarDays} titulo="Te registraste el" valor={desde ? fmtFechaLarga(desde) : "…"} />
        <FilaDato Icon={Clock} titulo="Tiempo en Mi Zona" valor={tiempo} />
        <FilaDato Icon={KeyRound} titulo="Entrás con" valor={conCorreo ? "Correo y contraseña" : "Google"} />
        <FilaDato Icon={Mail} titulo="Correo" valor={<span className="break-all">{usuario.email}</span>} />
        <FilaDato Icon={Smartphone} titulo="Sesión de este dispositivo hasta" valor={vence ? fmtFechaLarga(vence) : "—"} ultimo />
      </div>
    </div>
  );
}

function CuentaResenas({ onBack }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(false);
  const cargar = () => { setError(false); privacidadApi.misResenas().then(setLista).catch(() => setError(true)); };
  useEffect(cargar, []);
  return (
    <div>
      <CabeceraCuenta titulo="Mis reseñas" sub="Las opiniones que dejaste en los negocios con tu cuenta. Se muestran con el nombre que pusiste al escribirlas." onBack={onBack} />
      {lista === null && !error && <p className="text-sm flex items-center gap-2" style={{ color: "#5B6482" }}><Loader2 size={16} className="animate-spin" /> Cargando...</p>}
      {error && (
        <div className="p-4 text-sm flex items-center justify-between gap-3" style={{ borderRadius: 14, background: "#FDF1EF", color: "#9A3B34" }}>
          <span>No pudimos cargar tus reseñas.</span>
          <button onClick={cargar} className="font-bold shrink-0">Reintentar</button>
        </div>
      )}
      {lista && lista.length === 0 && <Vacio Icon={Star} texto="Todavía no escribiste reseñas. Podés dejar una desde la ficha de cualquier negocio." />}
      {lista && lista.length > 0 && (
        <div className="overflow-hidden" style={TARJETA_SEG}>
          {lista.map((r, i) => (
            <div key={`${r.negocioId}-${i}`} className="px-4 py-3.5" style={{ borderBottom: i === lista.length - 1 ? "none" : "1px solid #EEF0F6" }}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{r.negocio}</span>
                <span className="text-xs shrink-0" style={{ color: "#5B6482" }}>{r.fecha ? fmtFecha(String(r.fecha).slice(0, 10)) : ""}</span>
              </div>
              <div className="flex gap-0.5 my-1" aria-label={`${r.valoracion} de 5`}>
                {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} color="#E08A1E" fill={n <= r.valoracion ? "#E08A1E" : "none"} />)}
              </div>
              <p className="text-sm" style={{ color: "#2B3768", lineHeight: 1.5 }}>{r.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CuentaFavoritos({ negocios, onAbrir, onBack }) {
  let ids = [];
  try { ids = JSON.parse(localStorage.getItem("miZonaFavoritos") || "[]"); } catch { ids = []; }
  const lista = (negocios || []).filter((b) => ids.includes(b.id));
  return (
    <div>
      <CabeceraCuenta titulo="Mis favoritos" sub="Los negocios que guardaste en este dispositivo." onBack={onBack} />
      {lista.length === 0 && <Vacio Icon={Heart} texto="Todavía no guardaste favoritos. Tocá el corazón en la ficha de un negocio para guardarlo." />}
      {lista.length > 0 && (
        <div className="overflow-hidden" style={TARJETA_SEG}>
          {lista.map((b, i) => (
            <button key={b.id} onClick={() => onAbrir && onAbrir(b.id)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50" style={{ borderBottom: i === lista.length - 1 ? "none" : "1px solid #EEF0F6" }}>
              <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: "#FBE9E7" }}><Heart size={17} color="#C1443A" fill="#C1443A" /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{b.name}</span>
                {(b.cat || b.zone) && <span className="block text-xs mt-0.5 truncate" style={{ color: "#5B6482" }}>{[b.cat, b.zone].filter(Boolean).join(" · ")}</span>}
              </span>
              <ChevronRight size={18} color="#B9C0D6" className="shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CuentaNegocios({ negocios, onBack }) {
  return (
    <div>
      <CabeceraCuenta titulo="Mis negocios" sub="Los negocios registrados con tu cuenta y cómo está su suscripción. Los administrás desde Herramientas." onBack={onBack} />
      {negocios.length === 0 && <Vacio Icon={Store} texto="No tenés negocios en tu cuenta. Tocá “+” en el inicio para registrar el tuyo." />}
      {negocios.length > 0 && (
        <div className="overflow-hidden" style={TARJETA_SEG}>
          {negocios.map((n, i) => {
            const e = estadoNegocio(n);
            return (
              <div key={n.id} className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: i === negocios.length - 1 ? "none" : "1px solid #EEF0F6" }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: tonoDe(Store).bg, boxShadow: `inset 0 0 0 1px ${tonoDe(Store).aro}` }}><Store size={18} color={tonoDe(Store).fg} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{n.nombre}</span>
                  <span className="block text-xs mt-0.5" style={{ color: e.color }}>{e.texto}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilaDato({ Icon, titulo, valor, ultimo }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: ultimo ? "none" : "1px solid #EEF0F6" }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: tonoDe(Icon).bg, boxShadow: `inset 0 0 0 1px ${tonoDe(Icon).aro}` }}><Icon size={17} color={tonoDe(Icon).fg} /></span>
      <span className="flex-1 min-w-0 text-sm" style={{ color: "#2B3768" }}>{titulo}</span>
      <span className="text-sm font-semibold text-right" style={{ color: "#0B1437" }}>{valor}</span>
    </div>
  );
}


// Cambiar el nombre de usuario: se revisa en vivo si es válido y si está libre.
function EditorUsuario({ usuario, onGuardado }) {
  const actual = usuario?.usuario || "";
  const [valor, setValor] = useState(actual);
  const [disp, setDisp] = useState({ estado: "idle", msg: "" });
  const [estado, setEstado] = useState(null); // null | "guardando" | "ok" | { error }
  useEffect(() => { setValor(usuario?.usuario || ""); }, [usuario?.usuario]);
  const u = normalizarUsuario(valor);
  const cambio = u !== actual;
  useEffect(() => {
    if (!cambio) { setDisp({ estado: "idle", msg: "" }); return undefined; }
    const err = validarUsuario(u);
    if (err) { setDisp({ estado: "invalido", msg: err }); return undefined; }
    setDisp({ estado: "revisando", msg: "Revisando si está libre..." });
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const r = await usuarioDisponible(u);
        if (vivo) setDisp(r.disponible ? { estado: "libre", msg: "¡Está disponible!" } : { estado: "ocupado", msg: "Ese usuario ya está ocupado. Usá otro." });
      } catch { if (vivo) setDisp({ estado: "error", msg: "No pudimos revisarlo; lo comprobamos al guardar." }); }
    }, 450);
    return () => { vivo = false; clearTimeout(t); };
  }, [u, cambio]);
  const puede = cambio && (disp.estado === "libre" || disp.estado === "error") && estado !== "guardando";
  const guardar = async () => {
    setEstado("guardando");
    try {
      onGuardado(await guardarUsuario(u));
      setEstado("ok");
      setTimeout(() => setEstado(null), 2500);
    } catch (e) {
      if (/ocupado/i.test(e.message)) { setDisp({ estado: "ocupado", msg: e.message }); setEstado(null); } else setEstado({ error: e.message });
    }
  };
  const color = disp.estado === "libre" ? "#1E8A55" : disp.estado === "ocupado" || disp.estado === "invalido" ? "#C93030" : "#5B6482";
  return (
    <div className="mb-3">
      <label className="text-xs font-medium block mb-1" style={{ color: "#2B3768" }}>Usuario</label>
      <input value={valor} maxLength={20} autoCapitalize="none" spellCheck={false}
        onChange={(e) => { setValor(e.target.value.replace(/\s/g, "")); setEstado(null); }}
        placeholder="Elegí tu usuario" className="w-full border px-3 py-2.5 text-sm" style={{ borderRadius: 12, borderColor: disp.estado === "ocupado" || disp.estado === "invalido" ? "#C93030" : "#E3E7F1" }} />
      <p className="text-xs mt-1.5 font-medium" style={{ color }}>{disp.msg || "De 5 a 20 caracteres. Empieza con una letra; podés usar números, punto o guion bajo."}</p>
      {estado?.error && <p className="text-xs mt-1" style={{ color: "#C93030" }}>{estado.error}</p>}
      {cambio && (
        <button onClick={guardar} disabled={!puede} className="w-full text-sm font-semibold py-2.5 mt-2 flex items-center justify-center gap-1.5"
          style={{ backgroundColor: "#2350F5", color: "#fff", borderRadius: 12, opacity: puede ? 1 : 0.45 }}>
          {estado === "guardando" ? "Guardando..." : "Guardar usuario"}
        </button>
      )}
      {estado === "ok" && <p className="text-xs mt-2 flex items-center gap-1.5 font-medium" style={{ color: "#1E6B44" }}><Check size={14} /> Listo: tu usuario ahora es @{actual}.</p>}
    </div>
  );
}

export function MiCuentaScreen({ usuario, local, negocios: todosNegocios, onAbrirNegocio, onAbrirFavoritos, onBack, onLogged, onUsuarioActualizado, onCerrarSesion, onCuentaEliminada }) {
  const [estado, setEstado] = useState(null); // null | "guardando" | "ok" | { error }
  const [resumen, setResumen] = useState(null); // lo que Mi Zona tiene de esta cuenta (cantidades, negocios, fecha de alta)
  const [vista, setVista] = useState(null); // null | "desde" | "resenas" | "favoritos" | "negocios"
  useEffect(() => {
    if (!usuario) { setResumen(null); return; }
    privacidadApi.resumen().then(setResumen).catch(() => {});
  }, [usuario?.id]);

  const negocios = resumen?.negocios || [];
  const inicial = (usuario?.usuario || usuario?.nombre || usuario?.email || "?").trim().charAt(0).toUpperCase();
  const conCorreo = resumen ? resumen.cuenta.proveedor === "email" : !!usuario?.conClave;

  if (usuario && vista) {
    const atras = () => setVista(null);
    if (vista === "desde") return <CuentaDesde usuario={usuario} resumen={resumen} conCorreo={conCorreo} onBack={atras} />;
    if (vista === "resenas") return <CuentaResenas onBack={atras} />;
    if (vista === "favoritos") return <CuentaFavoritos negocios={todosNegocios} onAbrir={onAbrirNegocio} onBack={atras} />;
    if (vista === "negocios") return <CuentaNegocios negocios={negocios} onBack={atras} />;
  }

  return (
    <div>
      <BotonVolver texto="Volver a Ajustes" onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }} className="mb-4">Mi cuenta</h2>

      {!usuario ? (
        <div className="p-5" style={{ borderRadius: 18, border: "1px solid #E6ECF5", background: "#fff", boxShadow: "0 6px 20px rgba(11,20,55,0.07)" }}>
          <PanelAcceso onLogged={onLogged} />
        </div>
      ) : (
        <>
          {/* Quién sos en Mi Zona */}
          <div className="flex items-center gap-3.5 p-4 mb-1" style={TARJETA_SEG}>
            <span className="flex items-center justify-center shrink-0 text-xl font-bold" style={{ width: 54, height: 54, borderRadius: "50%", background: "#0B1437", color: "#fff", fontFamily: "var(--fuente-titulo)" }}>{inicial}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-base font-bold truncate" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{usuario.usuario ? `@${usuario.usuario}` : "Sin usuario"}</span>
              <span className="block text-xs truncate mt-0.5" style={{ color: "#5B6482" }}>{usuario.email}</span>
              <span className="inline-block text-[11px] font-semibold px-2 py-0.5 mt-1.5" style={{ borderRadius: 8, background: "#EDF1FF", color: "#2350F5" }}>{conCorreo ? "Entrás con correo y contraseña" : "Entrás con Google"}</span>
            </span>
          </div>

          <Etiqueta>Tus datos</Etiqueta>
          <div className="p-4" style={TARJETA_SEG}>
            <EditorUsuario usuario={usuario} onGuardado={onUsuarioActualizado} />
            <label className="text-xs font-medium block mb-1" style={{ color: "#2B3768" }}>Correo de tu cuenta</label>
            <div className="flex items-center gap-2 text-sm px-3 py-2.5 mb-3" style={{ borderRadius: 8, background: "#F3F5FA", color: "#0B1437" }}>
              <Mail size={14} color="#5B6482" /> <span className="truncate">{usuario.email}</span>
            </div>
          </div>

          <Etiqueta>Tu actividad en Mi Zona</Etiqueta>
          <div className="overflow-hidden" style={TARJETA_SEG}>
            <FilaMenu Icon={CalendarDays} color="#2350F5" titulo="Miembro desde" valor={resumen ? fmtFechaCorta(resumen.cuenta.creadaEn) : null} onClick={() => setVista("desde")} />
            <FilaMenu Icon={Star} color="#E08A1E" titulo="Mis reseñas" valor={resumen ? String(resumen.resenas) : null} onClick={() => setVista("resenas")} />
            <FilaMenu Icon={Heart} color="#C1443A" titulo="Mis favoritos" valor={String(local?.favoritos ?? 0)} onClick={() => (onAbrirFavoritos ? onAbrirFavoritos() : setVista("favoritos"))} />
            <FilaMenu Icon={Store} color="#0B1437" titulo="Mis negocios" valor={resumen ? String(negocios.length) : null} onClick={() => setVista("negocios")} ultimo />
          </div>

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
      <p className="text-sm mb-2" style={{ color: "#2B3768", lineHeight: 1.5 }}>Se borran tu cuenta, tu agenda, tus notificaciones y las reseñas que escribiste. No se puede deshacer.</p>
      {negocios.length > 0 && (
        <>
          <p className="text-sm mb-3" style={{ color: "#2B3768", lineHeight: 1.5 }}>
            También se elimina <b>{negocios.length === 1 ? "tu negocio" : `tus ${negocios.length} negocios`}</b> ({negocios.map((n) => n.nombre).join(", ")}). La suscripción pagada no se reembolsa.
          </p>
          <label className="flex items-start gap-2 text-sm mb-3" style={{ color: "#0B1437", lineHeight: 1.4 }}>
            <input type="checkbox" checked={conNegocios} onChange={(e) => setConNegocios(e.target.checked)} className="mt-1" />
            Entiendo que mi negocio se elimina con la cuenta.
          </label>
        </>
      )}
      <p className="text-[13px] mb-3" style={{ color: "#5B6482", lineHeight: 1.5 }}>Tus chats y puntos con los asistentes están en Mi Asistente y no se borran desde acá.</p>
      {esClave && (
        <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Tu contraseña" autoComplete="current-password" maxLength={100}
          className="w-full border px-3.5 py-2.5 text-sm mb-2.5" style={{ borderRadius: 10, borderColor: "#E3E7F1" }} />
      )}
      <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribí ELIMINAR para confirmar" autoCapitalize="characters"
        className="w-full border px-3.5 py-2.5 text-sm mb-2.5" style={{ borderRadius: 10, borderColor: "#E3E7F1" }} />
      {!esClave && <p className="text-[13px] mb-2.5" style={{ color: "#5B6482" }}>Google te va a pedir elegir tu cuenta otra vez para confirmar que sos vos.</p>}
      {error && <p className="text-sm mb-2.5" style={{ color: "#C1443A" }}>{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => { setAbierto(false); setTexto(""); setClave(""); setError(null); setConNegocios(false); }} disabled={trabajando} className="flex-1 text-sm font-medium py-2.5" style={{ borderRadius: 10, border: "1px solid #E3E7F1" }}>Cancelar</button>
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

export const TARJETA_SEG = { borderRadius: 20, border: "1px solid #E3E7F1", background: "#fff", boxShadow: "0 1px 2px rgba(11,20,55,.04)" };
export const VERDE = "#1E8A55";
export const AMBAR = "#C77A0A";

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

export function Etiqueta({ children }) {
  return <h3 className="px-1 mb-2 mt-6" style={{ fontFamily: "var(--fuente-titulo)", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5B6482" }}>{children}</h3>;
}

// Fila del menú: ícono de color, título, dato corto a la derecha y flecha (abre una pantalla)
export function FilaMenu({ Icon, color, titulo, desc, valor, tonoValor, onClick, ultimo }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-slate-50 active:bg-slate-100" style={{ borderBottom: ultimo ? "none" : "1px solid #EEF0F6" }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 13, background: color, boxShadow: `inset 0 1px 0 rgba(255,255,255,.25), 0 6px 12px -6px ${color}` }}><Icon size={20} color="#fff" /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{titulo}</span>
        {desc && <span className="block text-xs mt-0.5" style={{ color: "#5B6482", lineHeight: 1.4 }}>{desc}</span>}
      </span>
      {valor && <span className="text-sm font-semibold shrink-0" style={{ color: tonoValor || "#5B6482" }}>{valor}</span>}
      <ChevronRight size={18} color="#B9C0D6" className="shrink-0" />
    </button>
  );
}

function Interruptor({ activo, onChange, disabled }) {
  return (
    <button role="switch" aria-checked={activo} disabled={disabled} onClick={() => onChange(!activo)} className="shrink-0 relative transition-colors" style={{ width: 52, height: 32, borderRadius: 16, background: activo ? VERDE : "#CBD5E1", opacity: disabled ? 0.6 : 1 }}>
      <span className="absolute" style={{ top: 3, left: activo ? 23 : 3, width: 26, height: 26, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.25), 0 3px 8px -1px rgba(0,0,0,.2)", transition: "left .24s cubic-bezier(0.22,1,0.36,1)" }} />
    </button>
  );
}

// Encabezado de cada subpantalla: volver a Seguridad + título
function CabeceraSeg({ titulo, sub, onBack }) {
  return (
    <>
      <BotonVolver texto="Volver a Seguridad" onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{titulo}</h2>
      {sub && <p className="text-sm mt-1.5 mb-5" style={{ color: "#5B6482", lineHeight: 1.5 }}>{sub}</p>}
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
  const campo = { borderRadius: 12, borderColor: "#CBD5E1", background: "#fff", color: "#0B1437" };

  if (!usuario.conClave) {
    return (
      <div>
        <CabeceraSeg titulo="Contraseña" sub="Entrás con Google: tu contraseña y la verificación en dos pasos se manejan desde tu cuenta de Google." onBack={onBack} />
        <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3.5" style={{ borderRadius: 14, background: "#0B1437", color: "#fff" }}>
          Administrar en Google <ChevronRight size={16} />
        </a>
      </div>
    );
  }
  const reglasClave = requisitosContrasena(nueva);
  const errNueva = nueva ? validarContrasena(nueva, usuario.usuario) : "";
  const valida = actual && nueva && !errNueva && nueva === repetir;
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
          <input value={nueva} onChange={cambia(setNueva)} type={ver ? "text" : "password"} autoComplete="new-password" placeholder="Contraseña nueva" maxLength={100} className="w-full border px-3.5 py-3 text-sm" style={campo} />
          <input value={repetir} onChange={cambia(setRepetir)} type={ver ? "text" : "password"} autoComplete="new-password" placeholder="Repetí la contraseña nueva" maxLength={100} className="w-full border px-3.5 py-3 text-sm" style={campo} />
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {reglasClave.map((r) => (
              <li key={r.texto} className="flex items-center gap-1.5 text-xs" style={{ color: r.ok ? "#1E8A55" : "#8D95B0", fontWeight: r.ok ? 600 : 400 }}>
                <span className="flex items-center justify-center" style={{ width: 16, height: 16, borderRadius: "50%", background: r.ok ? "#1E8A55" : "#EEF0F6", color: "#fff" }}>{r.ok && <Check size={11} strokeWidth={3.4} />}</span>{r.texto}
              </li>
            ))}
          </ul>
          {nueva && errNueva && /usuario|espacios/.test(errNueva) && <p className="text-sm" style={{ color: "#C93030" }}>{errNueva}</p>}
          <label className="flex items-center gap-2 text-sm" style={{ color: "#2B3768" }}>
            <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar contraseñas
          </label>
          {repetir && nueva !== repetir && <p className="text-sm" style={{ color: "#C1443A" }}>Las contraseñas nuevas no coinciden.</p>}
          {estado?.error && <p className="text-sm" style={{ color: "#C1443A" }}>{estado.error}</p>}
          {estado === "ok" && <p className="text-sm flex items-center gap-1.5" style={{ color: "#1E6B44" }}><Check size={15} /> Listo: cambiaste tu contraseña y cerramos las otras sesiones.</p>}
          <button onClick={guardar} disabled={!valida || estado === "guardando"} className="w-full text-sm font-bold py-3.5" style={{ borderRadius: 14, background: "#0B1437", color: "#fff", opacity: !valida || estado === "guardando" ? 0.45 : 1 }}>
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
      {sesiones === null && !error && <p className="text-sm flex items-center gap-2" style={{ color: "#5B6482" }}><Loader2 size={16} className="animate-spin" /> Cargando...</p>}
      {error && (
        <div className="p-4 text-sm flex items-center justify-between gap-3" style={{ borderRadius: 14, background: "#FDF1EF", color: "#9A3B34" }}>
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
              <span className="block text-[15px] font-semibold" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{actual.dispositivo}</span>
              <span className="block text-xs mt-0.5" style={{ color: VERDE, fontWeight: 600 }}>Activo ahora</span>
            </span>
          </div>
        </>
      )}

      {sesiones !== null && (
        <>
          <Etiqueta>Otros dispositivos</Etiqueta>
          {otras.length === 0 ? (
            <div className="px-4 py-5 text-sm text-center" style={{ ...TARJETA_SEG, color: "#5B6482" }}>No hay otros dispositivos con la sesión abierta.</div>
          ) : (
            <>
              <div className="overflow-hidden" style={TARJETA_SEG}>
                {otras.map((s, i) => (
                  <div key={s.id} className="px-4 py-3.5" style={{ borderBottom: i === otras.length - 1 ? "none" : "1px solid #EEF0F6" }}>
                    <div className="flex items-center gap-3.5">
                      <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 14, background: "#EEF3FB", color: "#0B1437" }}><IconoDispositivo tipo={s.tipo} /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] font-semibold truncate" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{s.dispositivo}</span>
                        <span className="block text-xs mt-0.5" style={{ color: "#5B6482" }}>Último uso {hace(s.ultimoUso)}</span>
                      </span>
                      {confirmar !== s.id && (
                        <button onClick={() => setConfirmar(s.id)} className="text-sm font-bold shrink-0 px-3 py-2" style={{ borderRadius: 10, color: "#C1443A", background: "#FBEDEC" }}>Cerrar sesión</button>
                      )}
                    </div>
                    {confirmar === s.id && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setConfirmar(null)} className="flex-1 text-sm font-semibold py-2.5" style={{ borderRadius: 10, border: "1px solid #CBD5E1", color: "#0B1437" }}>Cancelar</button>
                        <button onClick={() => cerrarUna(s.id)} disabled={trabajando} className="flex-1 text-sm font-bold py-2.5" style={{ borderRadius: 10, background: "#C1443A", color: "#fff", opacity: trabajando ? 0.6 : 1 }}>{trabajando ? "Cerrando..." : "Sí, cerrar"}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                {confirmar === "todas" ? (
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmar(null)} className="flex-1 text-sm font-semibold py-3.5" style={{ borderRadius: 14, border: "1px solid #CBD5E1", color: "#0B1437" }}>Cancelar</button>
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
  cuenta_creada: { Icon: User, color: "#2350F5", texto: "Creaste tu cuenta" },
  inicio_sesion: { Icon: LogOut, color: "#0B1437", texto: "Iniciaste sesión" },
  contrasena_cambiada: { Icon: KeyRound, color: "#C77A0A", texto: "Cambiaste tu contraseña" },
  usuario_creado: { Icon: User, color: "#2350F5", texto: "Creaste tu usuario y contraseña" },
  usuario_cambiado: { Icon: User, color: "#2350F5", texto: "Cambiaste tu usuario" },
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
      {eventos === null && !error && <p className="text-sm flex items-center gap-2" style={{ color: "#5B6482" }}><Loader2 size={16} className="animate-spin" /> Cargando...</p>}
      {error && (
        <div className="p-4 text-sm flex items-center justify-between gap-3" style={{ borderRadius: 14, background: "#FDF1EF", color: "#9A3B34" }}>
          <span>No pudimos cargar la actividad.</span>
          <button onClick={cargar} className="font-bold shrink-0">Reintentar</button>
        </div>
      )}
      {eventos && eventos.length === 0 && <div className="px-4 py-6 text-sm text-center" style={{ ...TARJETA_SEG, color: "#5B6482" }}>Todavía no hay actividad registrada.</div>}
      {eventos && eventos.length > 0 && (
        <div className="overflow-hidden" style={TARJETA_SEG}>
          {eventos.map((e, i) => {
            const m = ACTIVIDAD[e.tipo] || { Icon: History, color: "#64748B", texto: "Actividad de la cuenta" };
            return (
              <div key={`${e.fecha}-${i}`} className="flex items-center gap-3.5 px-4 py-3.5" style={{ borderBottom: i === eventos.length - 1 ? "none" : "1px solid #EEF0F6" }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: m.color }}><m.Icon size={18} color="#fff" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: "#0B1437" }}>{m.texto}</span>
                  <span className="block text-xs mt-0.5" style={{ color: "#5B6482" }}>{[e.dispositivo, fechaHora(e.fecha)].filter(Boolean).join(" · ")}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      {eventos && eventos.length > 0 && (
        <button onClick={irDispositivos} className="w-full text-sm font-bold py-3.5 mt-4" style={{ borderRadius: 14, border: "1.5px solid #0B1437", color: "#0B1437" }}>¿No reconocés algo? Revisar dispositivos</button>
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
          <span className="flex-1 text-[15px] font-semibold" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>Avisarme de accesos nuevos</span>
          <Interruptor activo={alertas !== false} onChange={cambiar} disabled={guardando || alertas === null} />
        </div>
      </div>
      {error && <p className="text-sm mt-3 px-1" style={{ color: "#C1443A" }}>{error}</p>}

      <Etiqueta>Notificaciones en este dispositivo</Etiqueta>
      <div className="flex items-center gap-3.5 px-4 py-3.5" style={TARJETA_SEG}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: push === "activo" ? VERDE : "#94A3B8" }}><BellRing size={20} color="#fff" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{push === "activo" ? "Activadas" : push === "bloqueado" ? "Bloqueadas" : push === "no-soportado" ? "No disponibles" : "Desactivadas"}</span>
          {push !== "activo" && <span className="block text-xs mt-0.5" style={{ color: "#5B6482", lineHeight: 1.4 }}>{push === "bloqueado" ? "Habilitalas desde la configuración del navegador." : push === "no-soportado" ? "Este navegador no las permite." : "Sin ellas no te llegan las alertas."}</span>}
        </span>
        {(push === "inactivo") && <button onClick={activar} className="text-sm font-bold shrink-0 px-3.5 py-2" style={{ borderRadius: 10, background: "#0B1437", color: "#fff" }}>Activar</button>}
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
        <p className="text-sm mb-4" style={{ color: "#2B3768", lineHeight: 1.5 }}>Iniciá sesión para ver y cambiar la seguridad de tu cuenta.</p>
        <button onClick={onLogin} className="w-full text-sm font-bold py-3.5" style={{ borderRadius: 14, background: "#0B1437", color: "#fff" }}>Iniciar sesión</button>
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
      <p className="text-sm mt-1.5 mb-4 truncate" style={{ color: "#5B6482" }}>{usuario.email}</p>

      {!est.cargando && (
        <div className="flex items-center gap-3.5 p-4 mb-1" data-conservar-color style={{ borderRadius: 18, background: est.pendientes ? "#FFF4E0" : "#E4F3EA", border: `1px solid ${est.pendientes ? "#F3D9A4" : "#BFE3CE"}` }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 14, background: est.pendientes ? AMBAR : VERDE }}>{est.pendientes ? <AlertTriangle size={22} color="#fff" /> : <ShieldCheck size={23} color="#fff" />}</span>
          <span>
            <span className="block text-[16px] font-bold" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{est.pendientes ? `${est.pendientes} ${est.pendientes === 1 ? "cosa para revisar" : "cosas para revisar"}` : "Tu cuenta está al día"}</span>
            <span className="block text-xs mt-0.5" style={{ color: "#2B3768" }}>{est.pendientes ? "Mirá lo que está marcado en ámbar acá abajo." : "No hay nada para revisar."}</span>
          </span>
        </div>
      )}

      <Etiqueta>Iniciar sesión</Etiqueta>
      <div className="overflow-hidden" style={TARJETA_SEG}>
        <FilaMenu Icon={KeyRound} color="#2350F5" titulo="Contraseña" valor={usuario.conClave ? null : "Google"} onClick={() => setVista("clave")} />
        <FilaMenu Icon={Bell} color="#E08A1E" titulo="Alertas de inicio de sesión" desc={est.sinAvisos ? "Las notificaciones de este dispositivo están apagadas." : undefined} valor={alertas === null ? null : alertas === false ? "Desactivadas" : est.sinAvisos ? "Sin avisos" : "Activadas"} tonoValor={est.alertasApagadas || est.sinAvisos ? AMBAR : undefined} onClick={() => setVista("alertas")} ultimo />
      </div>

      <Etiqueta>Tu actividad</Etiqueta>
      <div className="overflow-hidden" style={TARJETA_SEG}>
        <FilaMenu Icon={MonitorSmartphone} color="#0B1437" titulo="Dispositivos" desc={est.otras > 0 ? `${est.otras} ${est.otras === 1 ? "dispositivo más" : "dispositivos más"} con tu sesión abierta: revisá que sean tuyos.` : undefined} valor={nDisp === null ? null : String(nDisp)} tonoValor={est.otras > 0 ? AMBAR : undefined} onClick={() => setVista("dispositivos")} />
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
      <p className="text-sm mb-5" style={{ color: "#2B3768", lineHeight: 1.6 }}>
        Recibí avisos en tu celular aunque Mi Zona esté cerrada, por ejemplo cuántos días le quedan a la suscripción de tu negocio.
      </p>

      {!usuario ? (
        <button onClick={onLogin} className="w-full text-sm font-semibold py-3" style={{ backgroundColor: "#2350F5", color: "#fff", borderRadius: 10 }}>
          Iniciar sesión para activarlas
        </button>
      ) : estado === "no-soportado" ? (
        <p className="text-sm p-4" style={{ background: "#F5F1E6", color: "#8A5B12", borderRadius: 10 }}>
          Este navegador no permite notificaciones. En iPhone, abrí Mi Zona en Safari → Compartir → "Agregar a pantalla de inicio" y activalas desde ahí.
        </p>
      ) : estado === "bloqueado" ? (
        <p className="text-sm p-4" style={{ background: "#FDF1EF", color: "#9A3B34", borderRadius: 10 }}>
          Bloqueaste las notificaciones de este sitio. Habilitalas desde el candado de la barra del navegador (o los ajustes del sistema) y volvé a intentar.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 p-4 mb-3 bg-white" style={{ borderRadius: 12, border: "1px solid #E3E7F1" }}>
            <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: "50%", background: estado === "activo" ? "#E4F3EA" : "#EDF1FF" }}>
              {estado === "activo" ? <Bell size={17} color="#1E6B44" /> : <BellOff size={17} color="#2350F5" />}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "#0B1437" }}>{estado === "activo" ? "Activadas en este dispositivo" : "Desactivadas"}</p>
              <p className="text-xs" style={{ color: "#5B6482" }}>Se configuran por dispositivo.</p>
            </div>
          </div>
          <button
            onClick={alternar} disabled={trabajando || estado === "cargando"}
            className="w-full text-sm font-semibold py-3"
            style={estado === "activo"
              ? { borderRadius: 10, border: "1px solid #E3E7F1", color: "#0B1437", background: "#fff" }
              : { borderRadius: 10, backgroundColor: "#2350F5", color: "#fff", opacity: trabajando ? 0.6 : 1 }}
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
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center" style={{ background: "#0B1437aa" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm p-5" style={{ borderRadius: "26px 26px 0 0", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }} onClick={(e) => e.stopPropagation()}>
        <span className="sm:hidden block mx-auto mb-3" style={{ width: 40, height: 4, borderRadius: 2, background: "#D3DAEA" }} />
        <div className="flex items-center justify-between mb-1">
          <h2 style={{ ...TITULO, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>{gratis ? "Publicar mi negocio" : vencimientoActual ? "Agregar meses" : "Suscripción de tu negocio"}</h2>
          <button onClick={onClose} aria-label="Cerrar"><X size={18} color="#5B6482" /></button>
        </div>
        {nombreNegocio && <p className="text-xs mb-3 truncate" style={{ color: "#5B6482" }}>{nombreNegocio}</p>}

        {gratis ? (
          <div className="p-3.5 mb-4" style={{ borderRadius: 14, background: "#E4F3EA", border: "1px solid #C6E6D3", color: "#1E6B44" }}>
            <p className="text-sm font-semibold flex items-center gap-1.5 mb-1"><Sparkles size={14} /> Ya pagaste Mi Asistente</p>
            <p className="text-xs" style={{ lineHeight: 1.5 }}>
              Con esta cuenta de Google no pagás Mi Zona: tu negocio se publica sin costo{hastaGratis ? ` hasta el ${fmtFecha(hastaGratis)}` : ""} y se renueva junto con tu suscripción de Mi Asistente.
            </p>
          </div>
        ) : (
          <>
            {vencimientoActual && (
              <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: "#2B3768" }}>
                <Clock size={12} /> Hoy vence el {fmtFecha(vencimientoActual)}. Los meses nuevos se suman a esa fecha: no perdés nada.
              </p>
            )}
            {!vencimientoActual && (
              <p className="text-xs mb-3" style={{ color: "#2B3768" }}>Elegí por cuánto tiempo querés publicar tu negocio. Podés agregar más meses cuando quieras.</p>
            )}
            <div className="flex flex-col gap-2 mb-3">
              {!planes && !error && <p className="text-xs py-4 text-center" style={{ color: "#5B6482" }}>Cargando planes...</p>}
              {planes && Object.entries(planes).map(([clave, p]) => {
                const activo = plan === clave;
                return (
                  <button
                    key={clave} onClick={() => setPlan(clave)}
                    className="flex items-center gap-3 px-3.5 py-3 text-left"
                    style={{ borderRadius: 14, border: `1.5px solid ${activo ? "#2350F5" : "#E3E7F1"}`, background: activo ? "#F1F6FF" : "#fff", boxShadow: activo ? "0 0 0 3px rgba(35,80,245,.14)" : "none" }}
                  >
                    <span className="flex items-center justify-center shrink-0" style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${activo ? "#2350F5" : "#CBD5E1"}` }}>
                      {activo && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2350F5" }} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: "#0B1437" }}>{p.label}</span>
                        {p.descuentoPorcentaje > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5" style={{ borderRadius: 999, background: "#E4F3EA", color: "#1E6B44" }}>{p.descuentoPorcentaje}% OFF</span>
                        )}
                      </span>
                      <span className="block text-[11px]" style={{ color: "#5B6482" }}>
                        {fmtPesos(p.precioPorMes)} por mes{p.ahorro > 0 ? ` · ahorrás ${fmtPesos(p.ahorro)}` : ""}
                      </span>
                    </span>
                    <span className="text-sm font-bold" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{fmtPesos(p.precio)}</span>
                  </button>
                );
              })}
            </div>
            {nuevoVencimiento && (
              <p className="text-xs mb-3" style={{ color: "#2B3768" }}>Tu negocio quedaría activo hasta el <b>{fmtFecha(nuevoVencimiento)}</b>.</p>
            )}
          </>
        )}

        {error && <p className="text-xs mb-3" style={{ color: "#C1443A" }}>{error}</p>}
        <button
          onClick={confirmar} disabled={enviando || (!gratis && !plan)}
          className="w-full text-sm font-semibold py-3"
          style={{ background: gratis ? "linear-gradient(180deg,#38B06E,#2C9A5F)" : "linear-gradient(180deg,#2A58FF,#1F47E0)", color: "#fff", borderRadius: 14, boxShadow: gratis ? "0 10px 20px -8px rgba(44,154,95,.7)" : "0 10px 20px -8px rgba(35,80,245,.7)", opacity: enviando || (!gratis && !plan) ? 0.5 : 1 }}
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
    vencida: { bg: "#FDF1EF", fg: "#9A3B34", etiqueta: "Vencida" },
  }[info.estado];
  const fraccion = info.dias === null ? 0 : Math.max(0, Math.min(1, info.dias / 30));
  const texto = info.estado === "pendiente" ? "Tu negocio todavía no se muestra en Mi Zona."
    : info.estado === "vencida" ? `Venció el ${fmtFecha(negocio.expiresAt)}. Tu negocio ya no se muestra.`
    : `${info.dias === 1 ? "Queda 1 día" : `Quedan ${info.dias} días`} · vence el ${fmtFecha(negocio.expiresAt)}`;
  const origenAsistente = negocio.suscripcion?.origen === "asistente";

  return (
    <div className="p-4 mb-3 bg-white" style={{ borderRadius: 20, border: "1px solid #E3E7F1", boxShadow: "0 1px 2px rgba(11,20,55,.04)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold" style={{ color: "#0B1437" }}>Mi suscripción</span>
        <span className="text-[10px] font-bold px-2.5 py-0.5" style={{ borderRadius: 999, letterSpacing: ".02em", background: paleta.bg, color: paleta.fg }}>{paleta.etiqueta}</span>
      </div>
      <p className="text-xs mb-2.5" style={{ color: "#2B3768" }}>{texto}</p>
      {info.estado !== "pendiente" && (
        <div className="mb-3" style={{ height: 8, borderRadius: 8, background: "#EEF0F6", overflow: "hidden" }}>
          <div style={{ width: `${fraccion * 100}%`, height: "100%", background: paleta.fg, borderRadius: 8, transition: "width .6s cubic-bezier(0.22,1,0.36,1)" }} />
        </div>
      )}
      {origenAsistente && info.estado !== "pendiente" && (
        <p className="text-[11px] mb-2.5 flex items-center gap-1" style={{ color: "#7A4F9E" }}><Sparkles size={11} /> Incluida con tu suscripción de Mi Asistente</p>
      )}
      <button onClick={onAgregar} className="w-full text-sm font-semibold py-2.5" style={{ background: "linear-gradient(180deg,#2A58FF,#1F47E0)", color: "#fff", borderRadius: 12, boxShadow: "0 10px 20px -8px rgba(35,80,245,.7)" }}>
        {info.estado === "pendiente" ? "Elegir plan y pagar" : info.estado === "vencida" ? "Renovar suscripción" : "Agregar meses"}
      </button>
    </div>
  );
}
