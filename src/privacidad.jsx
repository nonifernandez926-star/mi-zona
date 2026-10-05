import { useState, useEffect } from "react";
import {
  MapPin, MessageCircle, Sparkles, BarChart3, Download, Trash2, Star, CalendarCheck, Smartphone, Lock, ChevronDown, Check, Loader2, User, UserX,
} from "lucide-react";
import { BotonVolver } from "./cuenta.jsx";
import { getPrivacidad, setPrivacidadLocal, privacidadApi } from "./api.js";

// Mismo lenguaje visual que Ajustes: tarjetas blancas con borde suave, filas con ícono azul y texto legible.
const TITULO = { fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: "#0B1220" };
const TARJETA = { borderRadius: 20, border: "1px solid #E6ECF5", boxShadow: "0 6px 20px rgba(11,42,84,0.07)" };
const LINEA = { borderBottom: "1px solid #EEF2F7" };

function Grupo({ titulo, desc, children }) {
  return (
    <section className="mb-5">
      <h3 className="px-1 mb-1" style={{ ...TITULO, fontSize: 15 }}>{titulo}</h3>
      {desc && <p className="px-1 mb-2 text-sm" style={{ color: "#4B5563", lineHeight: 1.5 }}>{desc}</p>}
      <div className="overflow-hidden bg-white mt-2" style={TARJETA}>{children}</div>
    </section>
  );
}

function Icono({ Icon, danger }) {
  return (
    <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 13, background: danger ? "#F7E7E5" : "#E8F0FE" }}>
      <Icon size={17} color={danger ? "#9A3B34" : "#2F6FED"} />
    </span>
  );
}

function Interruptor({ activo, onChange, disabled, etiqueta }) {
  return (
    <button
      role="switch" aria-checked={activo} aria-label={etiqueta} disabled={disabled} onClick={() => onChange(!activo)}
      className="shrink-0 relative transition-colors"
      style={{ width: 48, height: 28, borderRadius: 14, background: activo ? "#2F6FED" : "#CBD5E1", opacity: disabled ? 0.55 : 1 }}
    >
      <span className="absolute transition-all" style={{ top: 3, left: activo ? 23 : 3, width: 22, height: 22, borderRadius: 11, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
    </button>
  );
}

function Control({ Icon, titulo, desc, activo, onChange, disabled, ultimo }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" style={ultimo ? null : LINEA}>
      <Icono Icon={Icon} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium" style={{ color: "#0B1220" }}>{titulo}</span>
        <span className="block text-[13px] mt-0.5" style={{ color: "#4B5563", lineHeight: 1.45 }}>{desc}</span>
      </span>
      <Interruptor activo={activo} onChange={onChange} disabled={disabled} etiqueta={titulo} />
    </div>
  );
}

function Dato({ etiqueta, valor, ultimo }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3" style={ultimo ? null : LINEA}>
      <span className="text-sm" style={{ color: "#4B5563" }}>{etiqueta}</span>
      <span className="text-sm font-semibold text-right break-all" style={{ color: "#0B1220" }}>{valor}</span>
    </div>
  );
}

function Servicio({ nombre, desc, ultimo }) {
  return (
    <div className="px-4 py-3" style={ultimo ? null : LINEA}>
      <span className="block text-sm font-medium" style={{ color: "#0B1220" }}>{nombre}</span>
      <span className="block text-[13px] mt-0.5" style={{ color: "#4B5563", lineHeight: 1.45 }}>{desc}</span>
    </div>
  );
}

// Fila que lleva a otra pantalla (igual que las de Ajustes)
function FilaIr({ Icon, titulo, desc, onClick, ultimo }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left bg-white" style={ultimo ? null : LINEA}>
      <Icono Icon={Icon} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium" style={{ color: "#0B1220" }}>{titulo}</span>
        <span className="block text-[13px] mt-0.5" style={{ color: "#4B5563" }}>{desc}</span>
      </span>
      <ChevronDown size={16} color="#B9BCC5" style={{ transform: "rotate(-90deg)" }} />
    </button>
  );
}

// Fila con una acción real. Las que borran piden confirmación en el mismo lugar.
function FilaAccion({ Icon, titulo, desc, boton, confirmar, ejecutar, danger, deshabilitada, mensajeOk, ultimo }) {
  const [estado, setEstado] = useState(null); // null | "confirmar" | "trabajando" | { ok } | { error }
  const correr = async () => {
    setEstado("trabajando");
    try {
      const r = await ejecutar();
      setEstado({ ok: typeof mensajeOk === "function" ? mensajeOk(r) : mensajeOk || "Listo." });
      setTimeout(() => setEstado((e) => (e && e.ok ? null : e)), 5000);
    } catch (e) { setEstado({ error: e.message || "No se pudo completar. Probá de nuevo." }); }
  };
  const color = danger ? "#9A3B34" : "#2F6FED";
  return (
    <div className="px-4 py-3.5" style={ultimo ? null : LINEA}>
      <div className="flex items-center gap-3">
        <Icono Icon={Icon} danger={danger} />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium" style={{ color: danger ? "#9A3B34" : "#0B1220" }}>{titulo}</span>
          <span className="block text-[13px] mt-0.5" style={{ color: "#4B5563", lineHeight: 1.45 }}>{desc}</span>
        </span>
        {estado !== "confirmar" && (
          <button
            onClick={() => (confirmar ? setEstado("confirmar") : correr())} disabled={deshabilitada || estado === "trabajando"}
            className="shrink-0 text-sm font-semibold px-3.5 py-2 flex items-center gap-1.5"
            style={{ borderRadius: 10, border: `1px solid ${danger ? "#E3B4B0" : "#C9D9F8"}`, color, background: "#fff", opacity: deshabilitada || estado === "trabajando" ? 0.45 : 1 }}
          >
            {estado === "trabajando" && <Loader2 size={14} className="animate-spin" />}{boton}
          </button>
        )}
      </div>
      {estado === "confirmar" && (
        <div className="mt-3 p-3.5" style={{ borderRadius: 12, background: "#FBF3F2" }}>
          <p className="text-sm mb-3" style={{ color: "#7A3029", lineHeight: 1.5 }}>{confirmar}</p>
          <div className="flex gap-2">
            <button onClick={() => setEstado(null)} className="flex-1 text-sm font-medium py-2.5 bg-white" style={{ borderRadius: 10, border: "1px solid #E2E8F0", color: "#0B1220" }}>Cancelar</button>
            <button onClick={correr} className="flex-1 text-sm font-semibold py-2.5" style={{ borderRadius: 10, background: "#C1443A", color: "#fff" }}>Sí, borrar</button>
          </div>
        </div>
      )}
      {estado?.error && <p className="text-sm mt-2" style={{ color: "#C1443A" }}>{estado.error}</p>}
      {estado?.ok && <p className="text-sm mt-2 flex items-center gap-1.5" style={{ color: "#1E6B44" }}><Check size={15} /> {estado.ok}</p>}
    </div>
  );
}

export function PrivacidadScreen({ usuario, onBack, onLogin, onIrSeguridad, onIrCuenta, local, onBorrarVistos, onBorrarDatosLocales }) {
  const [prefs, setPrefs] = useState(() => getPrivacidad());
  const [resumen, setResumen] = useState(null); // datos del servidor (solo con sesión)
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorPref, setErrorPref] = useState(null);
  const [guardando, setGuardando] = useState(null);
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
    if (usuario && SERVIDOR.includes(clave)) {
      setGuardando(clave);
      try { await privacidadApi.guardarPreferencias({ [clave]: valor }); }
      catch (e) { setPrefs(setPrivacidadLocal(anterior)); setErrorPref(e.message || "No se pudo guardar el cambio."); }
      finally { setGuardando(null); }
    }
  };

  const nAgenda = resumen ? resumen.agenda.eventos + resumen.agenda.tareas : 0;

  return (
    <div>
      <BotonVolver texto="Volver a Ajustes" onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 18 }} className="mb-1">Privacidad</h2>
      <p className="text-sm mb-5" style={{ color: "#4B5563", lineHeight: 1.5 }}>
        Tu correo, tu agenda y tus pagos son privados. Los datos de un negocio (nombre, dirección, teléfono, fotos y reseñas) son públicos.
      </p>

      {errorCarga && (
        <div className="p-3.5 mb-5 text-sm flex items-center justify-between gap-3" style={{ borderRadius: 14, background: "#F7E7E5", color: "#9A3B34" }}>
          <span>No pudimos cargar los datos de tu cuenta.</span>
          <button onClick={cargar} className="font-semibold shrink-0">Reintentar</button>
        </div>
      )}

      <Grupo titulo="Cómo se usan tus datos">
        <Control
          Icon={MapPin} titulo="Usar mi ubicación" desc="Para ordenar los negocios por cercanía en la búsqueda con asistente. No se guarda."
          activo={prefs.ubicacionBusqueda} onChange={(v) => cambiar("ubicacionBusqueda", v)} disabled={guardando === "ubicacionBusqueda"}
        />
        <Control
          Icon={MessageCircle} titulo="Usar mis últimos chats" desc="Un resumen corto, solo para recomendarte mejor en la búsqueda."
          activo={prefs.chatsBusqueda} onChange={(v) => cambiar("chatsBusqueda", v)} disabled={guardando === "chatsBusqueda"}
        />
        {esDueno && (
          <Control
            Icon={Sparkles} titulo="IA en mi agenda" desc="Si lo apagás, la agenda no envía nada a la IA y sus funciones inteligentes se desactivan."
            activo={prefs.iaAgenda} onChange={(v) => cambiar("iaAgenda", v)} disabled={guardando === "iaAgenda"}
          />
        )}
        <Control
          Icon={BarChart3} titulo="Estadísticas anónimas" desc="Suma una visita, guardado o contacto anónimo a las estadísticas del negocio que mirás."
          activo={prefs.estadisticasAnonimas} onChange={(v) => cambiar("estadisticasAnonimas", v)} ultimo
        />
      </Grupo>
      {errorPref && <p className="text-sm -mt-3 mb-5 px-1" style={{ color: "#C1443A" }}>{errorPref}</p>}

      <Grupo titulo="Lo que guardamos de vos">
        {usuario ? (
          <>
            <Dato etiqueta="Cuenta" valor={usuario.email} />
            {resumen && esDueno && <Dato etiqueta="Negocios" valor={resumen.negocios.length} />}
            {resumen && esDueno && <Dato etiqueta="Eventos y tareas de agenda" valor={nAgenda} />}
            {resumen && <Dato etiqueta="Reseñas que escribiste" valor={resumen.resenas} />}
          </>
        ) : (
          <div className="px-4 py-3.5" style={LINEA}>
            <p className="text-sm mb-3" style={{ color: "#4B5563", lineHeight: 1.5 }}>No iniciaste sesión: no tenemos ningún dato tuyo en el servidor.</p>
            <button onClick={onLogin} className="w-full text-sm font-semibold py-2.5" style={{ borderRadius: 10, background: "#2F6FED", color: "#fff" }}>Iniciar sesión</button>
          </div>
        )}
        <Dato etiqueta="Favoritos en este dispositivo" valor={local.favoritos} />
        <Dato etiqueta="Chats en este dispositivo" valor={local.chats} ultimo />
      </Grupo>

      <Grupo titulo="Quién recibe datos" desc="Mi Zona funciona con estos servicios.">
        <Servicio nombre="Google" desc="Confirma quién sos al entrar. Solo nos da tu correo y nombre." />
        <Servicio nombre="Mi Asistente" desc="Recibe tus mensajes, pedidos y puntos para atenderte." />
        <Servicio nombre="Inteligencia artificial" desc="Procesa tu búsqueda y, si lo permitís, tu agenda." />
        <Servicio nombre="Mercado Pago" desc="Cobra las suscripciones de los negocios. Nunca vemos tu tarjeta." />
        <Servicio nombre="Cloudinary" desc="Aloja las fotos que sube un negocio, visibles para todos." ultimo />
      </Grupo>

      <Grupo titulo="Seguridad">
        <FilaIr Icon={Lock} titulo="Contraseña y sesiones" desc="Cambiá tu contraseña o cerrá tus otras sesiones." onClick={onIrSeguridad} ultimo />
      </Grupo>

      <Grupo titulo="Tus datos">
        {usuario && (
          <FilaAccion
            Icon={Download} titulo="Descargar mis datos" desc="Una copia de tu cuenta, negocios, agenda y reseñas."
            boton="Descargar" ejecutar={() => privacidadApi.exportar()} mensajeOk="Listo: se descargó el archivo."
          />
        )}
        {esDueno && (
          <FilaAccion
            Icon={CalendarCheck} danger titulo="Borrar mi agenda" desc={`${nAgenda} ${nAgenda === 1 ? "elemento guardado" : "elementos guardados"}.`}
            boton="Borrar" confirmar="Se borran todos tus eventos y tareas. No se puede deshacer."
            ejecutar={async () => { const r = await privacidadApi.borrarAgenda(); await cargar(); return r; }}
            mensajeOk="Listo: tu agenda quedó vacía." deshabilitada={nAgenda === 0}
          />
        )}
        {usuario && (
          <FilaAccion
            Icon={Star} danger titulo="Borrar mis reseñas" desc={`${resumen?.resenas ?? 0} ${resumen?.resenas === 1 ? "reseña escrita" : "reseñas escritas"} con tu cuenta.`}
            boton="Borrar" confirmar="Tus reseñas dejan de verse en los negocios. No se puede deshacer."
            ejecutar={async () => { const r = await privacidadApi.borrarResenas(); await cargar(); return r; }}
            mensajeOk="Listo: se borraron tus reseñas." deshabilitada={!resumen || resumen.resenas === 0}
          />
        )}
        <FilaAccion
          Icon={Smartphone} danger titulo="Borrar datos de este dispositivo" desc="Favoritos, chats y preferencias guardados acá. También cierra tu sesión."
          boton="Borrar" confirmar="Se borran tus favoritos, chats y preferencias de este dispositivo y se cierra tu sesión. No se puede deshacer."
          ejecutar={async () => { onBorrarDatosLocales(); setPrefs(getPrivacidad()); }} mensajeOk="Listo."
          ultimo={!usuario}
        />
        {usuario && <FilaIr Icon={UserX} titulo="Eliminar mi cuenta" desc="Se hace desde Mi cuenta." onClick={onIrCuenta} ultimo />}
      </Grupo>
    </div>
  );
}
