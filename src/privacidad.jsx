import { useState, useEffect } from "react";
import {
  ShieldCheck, User, Building2, Users, CalendarCheck, Sparkles, Globe, KeyRound, SlidersHorizontal,
  Download, Trash2, Check, ChevronDown, Eye, Lock, MapPin, MessageCircle, BarChart3, Clock, Bell, Star, AlertTriangle, Loader2,
} from "lucide-react";
import { BotonVolver } from "./cuenta.jsx";
import {
  getPrivacidad, setPrivacidadLocal, privacidadApi, setToken, cargarGoogle, pedirCuentaGoogle,
} from "./api.js";

const TITULO = { fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: "#0B1220" };
const TARJETA = { borderRadius: 20, border: "1px solid #E6ECF5", background: "#fff", boxShadow: "0 6px 20px rgba(11,42,84,0.07)" };
const SEPARADOR = { borderBottom: "1px solid #EEF2F7" };

const fmtFecha = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? "—" : d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
};

/* ---------- piezas ---------- */

function Seccion({ Icon, titulo, desc, children }) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2.5 mb-1 px-1">
        <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 10, background: "#E8F0FE" }}>
          <Icon size={16} color="#2F6FED" />
        </span>
        <h3 style={{ ...TITULO, fontSize: 15 }}>{titulo}</h3>
      </div>
      {desc && <p className="text-xs mb-2.5 px-1" style={{ color: "#6B7280", lineHeight: 1.5 }}>{desc}</p>}
      <div className="overflow-hidden" style={TARJETA}>{children}</div>
    </section>
  );
}

function Dato({ etiqueta, valor, ultimo }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3" style={ultimo ? null : SEPARADOR}>
      <span className="text-sm" style={{ color: "#4B5563" }}>{etiqueta}</span>
      <span className="text-sm font-semibold text-right break-all" style={{ color: "#0B1220" }}>{valor}</span>
    </div>
  );
}

function Interruptor({ activo, onChange, disabled, etiqueta }) {
  return (
    <button
      role="switch" aria-checked={activo} aria-label={etiqueta} disabled={disabled} onClick={() => onChange(!activo)}
      className="shrink-0 relative transition-colors"
      style={{ width: 46, height: 28, borderRadius: 20, background: activo ? "#2F6FED" : "#CBD5E1", opacity: disabled ? 0.5 : 1 }}
    >
      <span className="absolute transition-all" style={{ top: 3, left: activo ? 21 : 3, width: 22, height: 22, borderRadius: 11, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
    </button>
  );
}

function Control({ Icon, titulo, desc, activo, onChange, disabled, nota, ultimo }) {
  return (
    <div className="px-4 py-3.5" style={ultimo ? null : SEPARADOR}>
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center shrink-0 mt-0.5" style={{ width: 36, height: 36, borderRadius: 12, background: "#E8F0FE" }}>
          <Icon size={16} color="#2F6FED" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold" style={{ color: "#0B1220" }}>{titulo}</span>
          <span className="block text-xs mt-0.5" style={{ color: "#6B7280", lineHeight: 1.5 }}>{desc}</span>
          {nota && <span className="block text-[11px] mt-1" style={{ color: "#8A5B12" }}>{nota}</span>}
        </span>
        <Interruptor activo={activo} onChange={onChange} disabled={disabled} etiqueta={titulo} />
      </div>
    </div>
  );
}

function Acordeon({ titulo, resumen, children, ultimo }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div style={ultimo ? null : SEPARADOR}>
      <button onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold" style={{ color: "#0B1220" }}>{titulo}</span>
          {resumen && <span className="block text-xs mt-0.5" style={{ color: "#6B7280" }}>{resumen}</span>}
        </span>
        <ChevronDown size={16} color="#94A3B8" style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {abierto && <div className="px-4 pb-3.5 text-xs" style={{ color: "#4B5563", lineHeight: 1.6 }}>{children}</div>}
    </div>
  );
}

// Botón de acción con confirmación en el mismo lugar y resultado visible. Hace una llamada real.
function Accion({ Icon, titulo, desc, textoBoton, textoConfirmar, ejecutar, danger, deshabilitada, ultimo, mensajeOk }) {
  const [estado, setEstado] = useState(null); // null | "confirmar" | "trabajando" | { ok } | { error }
  const color = danger ? "#9A3B34" : "#2F6FED";
  const correr = async () => {
    setEstado("trabajando");
    try {
      const r = await ejecutar();
      setEstado({ ok: typeof mensajeOk === "function" ? mensajeOk(r) : mensajeOk || "Listo." });
      setTimeout(() => setEstado((e) => (e && e.ok ? null : e)), 5000);
    } catch (e) { setEstado({ error: e.message || "No se pudo completar. Probá de nuevo." }); }
  };
  return (
    <div className="px-4 py-3.5" style={ultimo ? null : SEPARADOR}>
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center shrink-0 mt-0.5" style={{ width: 36, height: 36, borderRadius: 12, background: danger ? "#F7E7E5" : "#E8F0FE" }}>
          <Icon size={16} color={color} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold" style={{ color: danger ? "#9A3B34" : "#0B1220" }}>{titulo}</span>
          <span className="block text-xs mt-0.5" style={{ color: "#6B7280", lineHeight: 1.5 }}>{desc}</span>
        </span>
      </div>
      <div className="mt-2.5 pl-12">
        {estado?.error && <p className="text-xs mb-2" style={{ color: "#C1443A" }}>{estado.error}</p>}
        {estado?.ok && <p className="text-xs mb-2 flex items-center gap-1" style={{ color: "#1E6B44" }}><Check size={13} /> {estado.ok}</p>}
        {estado === "confirmar" ? (
          <div>
            <p className="text-xs mb-2" style={{ color: "#9A3B34", lineHeight: 1.5 }}>{textoConfirmar}</p>
            <div className="flex gap-2">
              <button onClick={() => setEstado(null)} className="flex-1 text-xs font-medium py-2.5" style={{ borderRadius: 10, border: "1px solid #E2E8F0" }}>Cancelar</button>
              <button onClick={correr} className="flex-1 text-xs font-semibold py-2.5" style={{ borderRadius: 10, background: "#C1443A", color: "#fff" }}>Sí, continuar</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => (textoConfirmar ? setEstado("confirmar") : correr())}
            disabled={deshabilitada || estado === "trabajando"}
            className="text-xs font-semibold px-4 py-2.5 flex items-center gap-1.5"
            style={{ borderRadius: 10, border: `1px solid ${color}`, color, opacity: deshabilitada || estado === "trabajando" ? 0.5 : 1 }}
          >
            {estado === "trabajando" && <Loader2 size={13} className="animate-spin" />}
            {estado === "trabajando" ? "Un momento..." : textoBoton}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- eliminar cuenta ---------- */

function EliminarCuenta({ resumen, onEliminada }) {
  const [paso, setPaso] = useState(0); // 0 cerrado | 1 formulario
  const [texto, setTexto] = useState("");
  const [clave, setClave] = useState("");
  const [conNegocios, setConNegocios] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);
  const esClave = !!resumen.cuenta.conClave;
  const tieneNegocios = resumen.negocios.length > 0;
  useEffect(() => { if (paso === 1 && !esClave) cargarGoogle().catch(() => {}); }, [paso, esClave]);

  const listo = texto.trim().toUpperCase() === "ELIMINAR" && (!esClave || clave) && (!tieneNegocios || conNegocios);

  const eliminar = async () => {
    setError(null); setTrabajando(true);
    try {
      const cuerpo = { confirmacion: "ELIMINAR", eliminarNegocios: conNegocios };
      if (esClave) cuerpo.password = clave;
      else cuerpo.accessToken = await pedirCuentaGoogle(); // se vuelve a pedir Google: confirma que sos vos
      await privacidadApi.eliminarCuenta(cuerpo);
      setToken(null);
      onEliminada();
    } catch (e) {
      if (!e.cancelado) setError(e.message || "No se pudo eliminar la cuenta.");
      setTrabajando(false);
    }
  };

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center shrink-0 mt-0.5" style={{ width: 36, height: 36, borderRadius: 12, background: "#F7E7E5" }}>
          <Trash2 size={16} color="#9A3B34" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold" style={{ color: "#9A3B34" }}>Eliminar mi cuenta</span>
          <span className="block text-xs mt-0.5" style={{ color: "#6B7280", lineHeight: 1.5 }}>Borra tu cuenta y los datos que guardamos en el servidor. No se puede deshacer.</span>
        </span>
      </div>

      {paso === 0 ? (
        <div className="mt-2.5 pl-12">
          <button onClick={() => setPaso(1)} className="text-xs font-semibold px-4 py-2.5" style={{ borderRadius: 10, border: "1px solid #C1443A", color: "#9A3B34" }}>Continuar</button>
        </div>
      ) : (
        <div className="mt-3 p-3.5" style={{ borderRadius: 14, background: "#FBF3F2", border: "1px solid #F0D3D0" }}>
          <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "#9A3B34" }}><AlertTriangle size={14} /> Qué se va a borrar</p>
          <ul className="text-xs mb-3 pl-4" style={{ color: "#7A3029", lineHeight: 1.6, listStyle: "disc" }}>
            <li>Tu cuenta (correo, nombre y acceso) y tus sesiones abiertas.</li>
            <li>Toda tu agenda ({resumen.agenda.eventos + resumen.agenda.tareas} elementos) y tus notificaciones.</li>
            <li>Las reseñas que escribiste desde esta versión ({resumen.resenas}).</li>
            {tieneNegocios && <li><b>Tus {resumen.negocios.length === 1 ? "negocio" : `${resumen.negocios.length} negocios`}</b> ({resumen.negocios.map((n) => n.nombre).join(", ")}) con su perfil, fotos, promociones y estadísticas. La suscripción pagada no se reembolsa.</li>}
          </ul>
          <p className="text-[11px] mb-3" style={{ color: "#7A3029", lineHeight: 1.5 }}>
            Tus chats, pedidos y puntos con los asistentes de los negocios están en Mi Asistente y se manejan allá: no se borran desde acá.
          </p>

          {tieneNegocios && (
            <label className="flex items-start gap-2 text-xs mb-3" style={{ color: "#4B5563", lineHeight: 1.5 }}>
              <input type="checkbox" checked={conNegocios} onChange={(e) => setConNegocios(e.target.checked)} className="mt-0.5" />
              Entiendo que mi negocio se elimina junto con la cuenta.
            </label>
          )}
          {esClave && (
            <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Tu contraseña" autoComplete="current-password" maxLength={100}
              className="w-full border px-3.5 py-2.5 text-sm mb-2.5" style={{ borderRadius: 10, borderColor: "#E2E8F0", background: "#fff" }} />
          )}
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder='Escribí ELIMINAR para confirmar' autoCapitalize="characters"
            className="w-full border px-3.5 py-2.5 text-sm mb-2.5" style={{ borderRadius: 10, borderColor: "#E2E8F0", background: "#fff" }} />
          {!esClave && <p className="text-[11px] mb-2.5" style={{ color: "#6B7280" }}>Al tocar el botón, Google te va a pedir que elijas tu cuenta otra vez para confirmar que sos vos.</p>}
          {error && <p className="text-xs mb-2.5" style={{ color: "#C1443A" }}>{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setPaso(0); setTexto(""); setClave(""); setError(null); }} disabled={trabajando} className="flex-1 text-xs font-medium py-2.5" style={{ borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff" }}>Cancelar</button>
            <button onClick={eliminar} disabled={!listo || trabajando} className="flex-1 text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5" style={{ borderRadius: 10, background: "#C1443A", color: "#fff", opacity: !listo || trabajando ? 0.5 : 1 }}>
              {trabajando && <Loader2 size={13} className="animate-spin" />} Eliminar mi cuenta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- pantalla ---------- */

export function PrivacidadScreen({ usuario, onBack, onLogin, onIrSeguridad, local, onBorrarVistos, onBorrarBusquedas, onBorrarDatosLocales, onCuentaEliminada }) {
  const [prefs, setPrefs] = useState(() => getPrivacidad());
  const [resumen, setResumen] = useState(null); // datos del servidor (solo con sesión)
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorPref, setErrorPref] = useState(null);
  const [guardando, setGuardando] = useState(null);
  const [confirmarLocal, setConfirmarLocal] = useState(false);
  const esDueno = !!resumen && resumen.negocios.length > 0;

  const cargar = async () => {
    if (!usuario) { setResumen(null); return; }
    try {
      setErrorCarga(null);
      const r = await privacidadApi.resumen();
      setResumen(r);
      setPrefs(setPrivacidadLocal(r.preferencias)); // lo guardado en la cuenta manda
    } catch (e) { setErrorCarga(e.message); }
  };
  useEffect(() => { cargar(); }, [usuario?.id]);

  const SERVIDOR = ["ubicacionBusqueda", "chatsBusqueda", "iaAgenda"];
  const cambiar = async (clave, valor) => {
    setErrorPref(null);
    const anterior = prefs;
    setPrefs(setPrivacidadLocal({ [clave]: valor }));
    if (clave === "guardarVistos" && !valor) onBorrarVistos();
    if (usuario && SERVIDOR.includes(clave)) {
      setGuardando(clave);
      try { await privacidadApi.guardarPreferencias({ [clave]: valor }); }
      catch (e) { setPrefs(setPrivacidadLocal(anterior)); setErrorPref(e.message || "No se pudo guardar el cambio."); }
      finally { setGuardando(null); }
    }
  };

  const nSesion = resumen?.sesion?.venceEn;
  const sinSesion = !usuario;

  return (
    <div>
      <BotonVolver texto="Volver a Ajustes" onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 20 }} className="mb-1">Privacidad</h2>
      <p className="text-xs mb-4" style={{ color: "#6B7280" }}>Qué datos usa Mi Zona, para qué, y qué podés controlar vos</p>

      {/* resumen */}
      <div className="p-4 mb-6" style={{ borderRadius: 20, background: "linear-gradient(135deg,#0B2A54,#1F4E99)", color: "#fff" }} data-conservar-color>
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 14, background: "#ffffff1f" }}><ShieldCheck size={22} color="#fff" /></span>
          <div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 15 }}>Tus datos, bajo tu control</p>
            <p className="text-xs" style={{ color: "#DCE7FB", lineHeight: 1.5 }}>Podés ver lo que guardamos, descargarlo, limitarlo o borrarlo.</p>
          </div>
        </div>
        <ul className="text-xs flex flex-col gap-1.5" style={{ color: "#DCE7FB", lineHeight: 1.5 }}>
          <li className="flex gap-2"><Check size={14} className="shrink-0 mt-0.5" /> Tu contraseña se guarda cifrada: ni nosotros podemos verla.</li>
          <li className="flex gap-2"><Check size={14} className="shrink-0 mt-0.5" /> Tu ubicación se usa en el momento y no se guarda.</li>
          <li className="flex gap-2"><Check size={14} className="shrink-0 mt-0.5" /> Las fotos de agenda se analizan y se descartan: no se guardan.</li>
        </ul>
      </div>

      {errorCarga && (
        <div className="p-3.5 mb-5 text-xs flex items-center justify-between gap-3" style={{ borderRadius: 14, background: "#F7E7E5", color: "#9A3B34" }}>
          <span>No pudimos cargar los datos de tu cuenta. {errorCarga}</span>
          <button onClick={cargar} className="font-semibold shrink-0">Reintentar</button>
        </div>
      )}

      {/* 1. cuenta */}
      <Seccion Icon={User} titulo="Datos personales y de la cuenta" desc="Lo que sabemos de vos cuando tenés una cuenta.">
        {sinSesion ? (
          <div className="px-4 py-3.5">
            <p className="text-sm mb-3" style={{ color: "#4B5563", lineHeight: 1.5 }}>No iniciaste sesión: Mi Zona no tiene ningún dato tuyo en el servidor. Tus favoritos y preferencias están solo en este dispositivo.</p>
            <button onClick={onLogin} className="w-full text-sm font-semibold py-2.5" style={{ borderRadius: 10, background: "#2F6FED", color: "#fff" }}>Iniciar sesión</button>
          </div>
        ) : !resumen ? (
          <p className="px-4 py-4 text-xs" style={{ color: "#6B7280" }}>Cargando...</p>
        ) : (
          <>
            <Dato etiqueta="Nombre" valor={resumen.cuenta.nombre || "—"} />
            <Dato etiqueta="Correo" valor={resumen.cuenta.email} />
            <Dato etiqueta="Acceso con" valor={resumen.cuenta.proveedor === "google" ? "Google" : "Correo y contraseña"} />
            <Dato etiqueta="Cuenta creada" valor={fmtFecha(resumen.cuenta.creadaEn)} ultimo />
          </>
        )}
      </Seccion>

      {/* resumen de lo guardado */}
      <Seccion Icon={Eye} titulo="Lo que guardamos" desc="Un resumen de tus datos, en el servidor y en este dispositivo.">
        {resumen && (
          <>
            <Dato etiqueta="Negocios en tu cuenta" valor={resumen.negocios.length} />
            <Dato etiqueta="Eventos y tareas de agenda" valor={resumen.agenda.eventos + resumen.agenda.tareas} />
            <Dato etiqueta="Reseñas que escribiste" valor={resumen.resenas} />
            <Dato etiqueta="Dispositivos con notificaciones" valor={resumen.dispositivosPush} />
          </>
        )}
        <Dato etiqueta="Negocios favoritos (este dispositivo)" valor={local.favoritos} />
        <Dato etiqueta="Conversaciones guardadas (este dispositivo)" valor={local.chats} />
        <Dato etiqueta="Negocios vistos recientemente" valor={local.vistos} />
        <Dato etiqueta="Búsquedas guardadas" valor={local.busquedas} ultimo />
      </Seccion>

      {/* 2. controles */}
      <Seccion Icon={SlidersHorizontal} titulo="Controles sobre el uso de tus datos" desc="Cada interruptor cambia algo real en cómo funciona Mi Zona.">
        <Control
          Icon={MapPin} titulo="Usar mi ubicación en la búsqueda"
          desc="El asistente de búsqueda ordena los negocios por cercanía. La ubicación se usa solo en esa consulta y no se guarda."
          activo={prefs.ubicacionBusqueda} onChange={(v) => cambiar("ubicacionBusqueda", v)} disabled={guardando === "ubicacionBusqueda"}
        />
        <Control
          Icon={MessageCircle} titulo="Usar mis últimos chats para recomendarme"
          desc="Se envía a la IA un resumen corto de tus últimos chats con negocios para recomendarte mejor. No se guarda."
          activo={prefs.chatsBusqueda} onChange={(v) => cambiar("chatsBusqueda", v)} disabled={guardando === "chatsBusqueda"}
        />
        {esDueno && (
          <Control
            Icon={Sparkles} titulo="Permitir IA en mi agenda"
            desc="Si lo apagás, “Organizar mi día”, “Preguntarle a mi agenda” y la importación por foto o mensaje dejan de funcionar y no se envía nada de tu agenda a la IA."
            activo={prefs.iaAgenda} onChange={(v) => cambiar("iaAgenda", v)} disabled={guardando === "iaAgenda"}
          />
        )}
        <Control
          Icon={BarChart3} titulo="Estadísticas anónimas para los negocios"
          desc="Cuando mirás un negocio, tocás su ubicación, lo guardás o lo contactás, se suma un número anónimo a sus estadísticas. Apagado, no se envía nada."
          activo={prefs.estadisticasAnonimas} onChange={(v) => cambiar("estadisticasAnonimas", v)}
        />
        <Control
          Icon={Clock} titulo="Recordar los negocios que vi"
          desc="Alimenta el filtro “Vistos” del inicio. Se guarda solo en este dispositivo. Al apagarlo se borra la lista."
          activo={prefs.guardarVistos} onChange={(v) => cambiar("guardarVistos", v)} ultimo
        />
        {errorPref && <p className="px-4 pb-3 text-xs" style={{ color: "#C1443A" }}>{errorPref}</p>}
        {sinSesion && <p className="px-4 pb-3.5 text-[11px]" style={{ color: "#6B7280", lineHeight: 1.5 }}>Estas preferencias se guardan en este dispositivo. Si iniciás sesión, también se guardan en tu cuenta.</p>}
      </Seccion>

      {/* 3. negocio */}
      <Seccion Icon={Building2} titulo="Información del negocio" desc="Qué ve el público y qué queda privado.">
        <Acordeon titulo="Lo que es público" resumen="Visible para cualquier persona que abra Mi Zona">
          Nombre, descripción, rubro, zona, dirección, teléfono y redes sociales, logo y fotos, horarios, promociones, historias activas (24 horas), reseñas con el nombre que cada persona elige y las respuestas del dueño. Si cargás un negocio, estos datos se muestran en el directorio y en el mapa mientras la suscripción esté vigente.
        </Acordeon>
        <Acordeon titulo="Lo que es privado" resumen="Solo lo ve el dueño, o nadie" ultimo>
          Tu correo y tu contraseña (cifrada), tu agenda, el historial de pagos, las estadísticas de visitas y contactos (solo se consultan desde el panel del dueño en Mi Asistente) y el dueño del negocio. Nada de esto sale en las pantallas ni en las respuestas públicas del servidor.
        </Acordeon>
      </Seccion>

      {/* 4. clientes */}
      <Seccion Icon={Users} titulo="Datos de clientes" desc="Cómo se tratan los datos de las personas que usan Mi Zona y escriben a los negocios.">
        <Acordeon titulo="Qué recibe el dueño de un negocio" resumen="Números anónimos, no listas de personas">
          El dueño ve totales de visitas, ubicaciones consultadas, guardados y contactos. Se cuentan por un identificador anónimo del dispositivo: no incluyen nombre, correo ni teléfono del cliente. Estos números se conservan hasta 400 días.
        </Acordeon>
        <Acordeon titulo="Chats, pedidos y puntos" resumen="Se manejan en Mi Asistente" ultimo>
          Cuando un cliente conversa con el asistente de un negocio, la conversación, los pedidos, turnos y puntos quedan ligados a su cuenta en Mi Asistente. Mi Zona solo muestra esa información al propio cliente y requiere sesión para verla.
        </Acordeon>
      </Seccion>

      {/* 5. agenda e IA */}
      <Seccion Icon={CalendarCheck} titulo="Agenda y asistente con IA" desc="Para dueños con un negocio en su cuenta.">
        <Acordeon titulo="Qué se envía a la IA" resumen="Solo cuando usás una función con IA">
          Al usar “Organizar mi día” o “Preguntarle a mi agenda” se envían a la IA los eventos y tareas necesarios para responder. Al importar desde un mensaje se envía ese texto, y desde una foto, la imagen. La foto se analiza en memoria y se descarta. Siempre revisás las propuestas antes de guardarlas. Las funciones con IA tienen un tope de uso por hora.
        </Acordeon>
        <Acordeon titulo="Búsqueda con asistente" resumen="Qué recibe la IA al buscar negocios" ultimo={!esDueno}>
          Tu consulta, la lista de negocios activos y, si lo dejás activado arriba, tu ubicación aproximada para ordenar por distancia y un resumen corto de tus últimos chats. Podés apagar cada uno cuando quieras.
        </Acordeon>
        {esDueno && (
          <Accion
            Icon={Trash2} danger titulo="Borrar toda mi agenda" desc={`Elimina los ${resumen.agenda.eventos + resumen.agenda.tareas} eventos y tareas guardados en el servidor.`}
            textoBoton="Borrar agenda" textoConfirmar="Se borran todos tus eventos y tareas. No se puede deshacer."
            ejecutar={async () => { const r = await privacidadApi.borrarAgenda(); await cargar(); return r; }}
            mensajeOk={(r) => `Listo: se borraron ${r.borrados} elementos.`}
            deshabilitada={resumen.agenda.eventos + resumen.agenda.tareas === 0} ultimo
          />
        )}
      </Seccion>

      {/* 6. servicios externos */}
      <Seccion Icon={Globe} titulo="Datos compartidos con servicios externos" desc="Mi Zona funciona con estos servicios. Esto es lo que recibe cada uno.">
        <Acordeon titulo="Google" resumen="Inicio de sesión y tipografías">
          Si entrás con Google, Google confirma tu identidad y nos entrega tu correo y nombre. No recibimos tu contraseña de Google. Las tipografías de la app también se cargan desde Google Fonts.
        </Acordeon>
        <Acordeon titulo="Mi Asistente" resumen="Chats, pedidos y puntos">
          Tus mensajes a los asistentes de los negocios, y tu identificador de cliente, se envían a Mi Asistente para responderte y registrar pedidos, turnos y puntos. Con una cuenta de Google también se consulta si tu negocio tiene suscripción vigente allá.
        </Acordeon>
        <Acordeon titulo="Inteligencia artificial (Anthropic)" resumen="Búsqueda con asistente y agenda">
          Procesa tus consultas de búsqueda y las funciones de IA de la agenda, según lo que activaste en los controles de arriba.
        </Acordeon>
        <Acordeon titulo="Mercado Pago" resumen="Pagos de suscripciones de negocios">
          Los dueños pagan en Mercado Pago, que procesa el pago. Mi Zona solo recibe la confirmación del pago, no los datos de tu tarjeta.
        </Acordeon>
        <Acordeon titulo="Cloudinary" resumen="Fotos de negocios e historias">
          Las fotos que sube un dueño (logo, portada, productos, historias) se alojan en Cloudinary y son visibles públicamente.
        </Acordeon>
        <Acordeon titulo="Mapas y direcciones" resumen="CARTO, Esri y OpenStreetMap" ultimo>
          Al abrir el mapa, tu navegador pide imágenes de mapa a CARTO o Esri, que ven la zona que estás mirando. Las direcciones de los negocios se convierten en coordenadas con OpenStreetMap. Tu ubicación no se envía a estos servicios.
        </Acordeon>
      </Seccion>

      {/* 7. seguridad */}
      <Seccion Icon={KeyRound} titulo="Seguridad y sesiones" desc="Cómo se protege tu cuenta y dónde está abierta.">
        {sinSesion ? (
          <p className="px-4 py-3.5 text-xs" style={{ color: "#6B7280" }}>Iniciá sesión para ver la seguridad de tu cuenta.</p>
        ) : (
          <>
            <Dato etiqueta="Método de acceso" valor={resumen ? (resumen.cuenta.proveedor === "google" ? "Google" : "Correo y contraseña") : "—"} />
            <Dato etiqueta="Esta sesión vence" valor={fmtFecha(nSesion)} />
            <div className="px-4 py-3.5" style={SEPARADOR}>
              <p className="text-xs mb-2.5" style={{ color: "#6B7280", lineHeight: 1.5 }}>Cambiá tu contraseña (si entrás con correo) o cerrá la sesión en todos tus otros dispositivos.</p>
              <button onClick={onIrSeguridad} className="text-xs font-semibold px-4 py-2.5 flex items-center gap-1.5" style={{ borderRadius: 10, border: "1px solid #2F6FED", color: "#2F6FED" }}>
                <Lock size={13} /> Abrir Seguridad
              </button>
            </div>
            <Accion
              Icon={Bell} titulo="Desactivar notificaciones en todos mis dispositivos"
              desc={`Hay ${resumen?.dispositivosPush ?? 0} dispositivo(s) recibiendo avisos de tu cuenta. Esto los desvincula a todos.`}
              textoBoton="Desactivar en todos" ejecutar={async () => { const r = await privacidadApi.borrarNotificaciones(); await cargar(); return r; }}
              mensajeOk="Listo: no vas a recibir más notificaciones en ningún dispositivo." deshabilitada={!resumen || resumen.dispositivosPush === 0} ultimo
            />
          </>
        )}
      </Seccion>

      {/* 8. tus datos */}
      <Seccion Icon={Download} titulo="Tus datos" desc="Descargá una copia o borrá lo que quieras.">
        {usuario && (
          <Accion
            Icon={Download} titulo="Descargar una copia de mis datos"
            desc="Un archivo con tu cuenta, tus negocios, tu agenda y tus reseñas, en formato JSON."
            textoBoton="Descargar mis datos" ejecutar={() => privacidadApi.exportar()} mensajeOk="Listo: se descargó el archivo."
          />
        )}
        {usuario && (
          <Accion
            Icon={Star} danger titulo="Borrar mis reseñas"
            desc={`Elimina las ${resumen?.resenas ?? 0} reseñas que escribiste con tu cuenta (desde que se guarda la autoría). Dejan de verse en los negocios.`}
            textoBoton="Borrar mis reseñas" textoConfirmar="Tus reseñas se eliminan de los perfiles de los negocios. No se puede deshacer."
            ejecutar={async () => { const r = await privacidadApi.borrarResenas(); await cargar(); return r; }}
            mensajeOk="Listo: se borraron tus reseñas." deshabilitada={!resumen || resumen.resenas === 0}
          />
        )}
        <Accion
          Icon={Clock} danger titulo="Borrar historial de búsquedas" desc={`Hay ${local.busquedas} búsqueda(s) guardada(s) en este dispositivo.`}
          textoBoton="Borrar historial" ejecutar={async () => onBorrarBusquedas()} mensajeOk="Listo: se borró el historial de búsquedas." deshabilitada={local.busquedas === 0}
        />
        <div className="px-4 py-3.5">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center shrink-0 mt-0.5" style={{ width: 36, height: 36, borderRadius: 12, background: "#F7E7E5" }}><Trash2 size={16} color="#9A3B34" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold" style={{ color: "#9A3B34" }}>Borrar los datos de este dispositivo</span>
              <span className="block text-xs mt-0.5" style={{ color: "#6B7280", lineHeight: 1.5 }}>Favoritos, conversaciones, notificaciones y preferencias guardadas acá. También cierra tu sesión en este dispositivo y borra el identificador que liga tus puntos a él.</span>
            </span>
          </div>
          <div className="mt-2.5 pl-12">
            {confirmarLocal ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmarLocal(false)} className="flex-1 text-xs font-medium py-2.5" style={{ borderRadius: 10, border: "1px solid #E2E8F0" }}>Cancelar</button>
                <button onClick={() => { onBorrarDatosLocales(); setConfirmarLocal(false); setPrefs(getPrivacidad()); }} className="flex-1 text-xs font-semibold py-2.5" style={{ borderRadius: 10, background: "#C1443A", color: "#fff" }}>Sí, borrar todo</button>
              </div>
            ) : (
              <button onClick={() => setConfirmarLocal(true)} className="text-xs font-semibold px-4 py-2.5" style={{ borderRadius: 10, border: "1px solid #C1443A", color: "#9A3B34" }}>Borrar datos del dispositivo</button>
            )}
          </div>
        </div>
      </Seccion>

      {/* 9. eliminar cuenta */}
      {usuario && resumen && (
        <Seccion Icon={AlertTriangle} titulo="Eliminar cuenta" desc="Si ya no querés usar Mi Zona, podés borrar tu cuenta y tus datos.">
          <EliminarCuenta resumen={resumen} onEliminada={onCuentaEliminada} />
        </Seccion>
      )}

      <p className="text-[11px] px-1 pb-2" style={{ color: "#94A3B8", lineHeight: 1.5 }}>
        Si tenés una duda sobre tus datos, escribinos desde Ajustes → Soporte.
      </p>
    </div>
  );
}
