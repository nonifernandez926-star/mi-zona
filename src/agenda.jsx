// Agenda personal del dueño: un "centro de organización" que se adapta al rubro del negocio.
// Vista Hoy, semana y tareas · recordatorios · importar desde una foto de agenda de papel o desde un mensaje (siempre con
// confirmación antes de guardar) · "Organizar mi día" y preguntarle a la agenda. Los pedidos NO se gestionan acá.
import { useEffect, useRef, useState } from "react";
import {
  Plus, X, Check, Clock, User, Bell, Camera, MessageSquare, Sparkles, Send,
  AlertTriangle, CalendarDays, ListChecks, Lock,
} from "lucide-react";
import { BotonAtras } from "./cuenta.jsx";
import { agendaApi, estadoPush, activarPush, pushSoportado, PLAY_STORE_URL } from "./api.js";

const TITULO = { fontFamily: "var(--fuente-titulo)", fontWeight: 600, color: "#0B1220" };
const CARD = { borderRadius: 18, border: "1px solid #E4E9F2", boxShadow: "0 1px 2px rgba(11,18,32,.04), 0 8px 20px -10px rgba(11,42,84,.14)", background: "#fff" };

const RECORDATORIOS = [
  { valor: "", texto: "Sin aviso" },
  { valor: "0", texto: "A la hora" },
  { valor: "15", texto: "15 minutos antes" },
  { valor: "60", texto: "1 hora antes" },
  { valor: "1440", texto: "1 día antes" },
  { valor: "4320", texto: "3 días antes" },
];
const DURACIONES = [15, 30, 45, 60, 90, 120, 180, 240];

/* ---------- fechas (hora local del dispositivo) ---------- */
const pad = (n) => String(n).padStart(2, "0");
const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hoyISO = () => isoDe(new Date());
const sumarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return isoDe(d); };
const capitalizar = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const fechaLinda = (iso) => (iso ? capitalizar(new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })) : "Sin fecha");
const minutosDe = (hora) => { const [h, m] = hora.split(":").map(Number); return h * 60 + m; };

function etiquetaFecha(iso) {
  const hoy = hoyISO();
  if (!iso) return { texto: "Sin fecha", color: "#475467", bg: "#F1F4F9" };
  if (iso < hoy) return { texto: "Vencida", color: "#B42318", bg: "#FDE7E4" };
  if (iso === hoy) return { texto: "Hoy", color: "#1D4ED8", bg: "#DBEAFE" };
  if (iso === sumarDias(hoy, 1)) return { texto: "Mañana", color: "#475467", bg: "#F1F4F9" };
  return { texto: new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" }).replace(".", ""), color: "#475467", bg: "#F1F4F9" };
}

/* ---------- recordatorios dentro de la app ---------- */

// Mientras la web esté abierta y la persona sea dueña, consulta cada minuto si llegó la hora de algún aviso.
export function useRecordatoriosAgenda(activo, alRecibir) {
  const cb = useRef(alRecibir);
  cb.current = alRecibir;
  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;
    const revisar = async () => {
      try {
        const r = await agendaApi.recordatorios();
        if (vivo && r.recordatorios?.length) cb.current(r.recordatorios);
      } catch { /* sin conexión o sin sesión: se reintenta en un minuto */ }
    };
    revisar();
    const t = setInterval(revisar, 60 * 1000);
    return () => { vivo = false; clearInterval(t); };
  }, [activo]);
}

export function RecordatoriosToast({ lista, onCerrar, onAbrir }) {
  if (!lista.length) return null;
  return (
    <div className="fixed left-0 right-0 flex flex-col items-center gap-2 px-3 pointer-events-none" style={{ top: 10, zIndex: 120 }}>
      {lista.slice(0, 3).map((r) => (
        <div key={r.id} className="pointer-events-auto w-full max-w-sm flex items-center gap-3 px-3.5 py-3" style={{ borderRadius: 16, background: "#0B2A54", color: "#fff", boxShadow: "0 12px 30px rgba(5,20,45,0.4)", animation: "zona-subir .35s cubic-bezier(0.22,1,0.36,1) both" }} data-conservar-color>
          <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 12, background: "#ffffff1f" }}><Bell size={17} color="#FFD27A" /></span>
          <button className="flex-1 min-w-0 text-left" onClick={() => onAbrir(r)}>
            <span className="block text-[11px] font-semibold" style={{ color: "#9BBBF7" }}>{r.tipo === "tarea" ? "Tarea pendiente" : "Evento próximo"}</span>
            <span className="block text-sm font-semibold truncate">{r.titulo}{r.hora ? ` · ${r.hora}` : ""}</span>
          </button>
          <button onClick={() => onCerrar(r.id)} aria-label="Cerrar"><X size={16} color="#B8C9EA" /></button>
        </div>
      ))}
    </div>
  );
}

/* ---------- foto: se achica en el celular antes de subirla ---------- */
function reducirImagen(archivo, maxLado = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.86).split(",")[1]); // solo el contenido base64
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo abrir esa imagen.")); };
    img.src = url;
  });
}

/* ---------- piezas de interfaz ---------- */

function Sheet({ titulo, onClose, children, ancho = 480 }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center" style={{ background: "#0B122099" }} onClick={onClose}>
      <div className="bg-white w-full flex flex-col" style={{ maxWidth: ancho, maxHeight: "92vh", borderRadius: "26px 26px 0 0" }} onClick={(e) => e.stopPropagation()}>
        <span className="sm:hidden block mx-auto mt-2.5 shrink-0" style={{ width: 40, height: 4, borderRadius: 2, background: "#D3DAEA" }} />
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 style={{ ...TITULO, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>{titulo}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 12, background: "#F1F5F9" }}><X size={16} color="#475569" /></button>
        </div>
        <div className="px-5 overflow-y-auto" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>{children}</div>
      </div>
    </div>
  );
}

const Etiqueta = ({ children }) => <label className="block text-[13px] font-semibold mt-3.5 mb-1.5" style={{ color: "#344054" }}>{children}</label>;
const inputCls = "w-full border px-3 py-2.5 text-sm";
const inputStyle = { borderRadius: 12, borderColor: "#DDE3EE", background: "#fff" };

function Check2({ marcado, onClick, label = "Marcar" }) {
  return (
    <button
      onClick={onClick} aria-label={label}
      className="flex items-center justify-center shrink-0"
      style={{ width: 26, height: 26, borderRadius: 9, border: `2px solid ${marcado ? "#16A34A" : "#C9D0E6"}`, background: marcado ? "#16A34A" : "#fff", marginTop: 1, boxShadow: marcado ? "0 4px 10px -3px rgba(22,163,74,.6)" : "none" }}
    >
      {marcado && <Check size={14} color="#fff" strokeWidth={3} />}
    </button>
  );
}

function Chip({ children, color = "#2F6FED", bg = "#E8F0FE" }) {
  return <span className="text-[11px] font-semibold px-2.5 py-0.5" style={{ borderRadius: 999, background: bg, color, letterSpacing: ".01em" }}>{children}</span>;
}

/* ---------- formulario de evento / tarea (crear o editar) ---------- */
// `inicial` puede ser un elemento guardado (con _id), una propuesta de la IA o valores sueltos para uno nuevo.
// Con `alDevolver` no guarda: devuelve los datos editados (se usa al revisar propuestas de la IA).
function FormularioItem({ inicial, perfil, onClose, onGuardado, alDevolver }) {
  const x = { tipo: "evento", duracionMinutos: 30, categoria: "general", persona: "", notas: "", recordatorioMinutos: null, ...inicial };
  const esNuevo = !x._id;
  const [tipo, setTipo] = useState(x.tipo === "tarea" ? "tarea" : "evento");
  const [titulo, setTitulo] = useState(x.titulo || "");
  const [fecha, setFecha] = useState(x.fecha || "");
  const [hora, setHora] = useState(x.hora || "");
  const [dur, setDur] = useState(x.duracionMinutos || 30);
  const [cat, setCat] = useState(x.categoria || "general");
  const [persona, setPersona] = useState(x.persona || "");
  const [notas, setNotas] = useState(x.notas || "");
  const [rec, setRec] = useState(x.recordatorioMinutos === null || x.recordatorioMinutos === undefined ? "" : String(x.recordatorioMinutos));
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const duraciones = [...new Set([...DURACIONES, dur])].sort((a, b) => a - b);
  const categorias = [{ id: "general", label: "General" }, ...(perfil?.tipos || [])];

  const guardar = async () => {
    const datos = {
      tipo, titulo: titulo.trim(), fecha, hora, duracionMinutos: Number(dur) || 30, categoria: cat, persona: persona.trim(), notas: notas.trim(),
      recordatorioMinutos: rec === "" ? null : Number(rec),
    };
    if (!datos.titulo) return setError("Escribí un título.");
    if (tipo === "evento" && !datos.fecha) return setError("Un evento necesita una fecha.");
    if (datos.recordatorioMinutos !== null && !datos.fecha) return setError("Para un recordatorio elegí una fecha.");
    if (alDevolver) { onClose(); alDevolver(datos); return; }
    setGuardando(true); setError(null);
    try {
      if (esNuevo) await agendaApi.crear(datos); else await agendaApi.editar(x._id, datos);
      onGuardado();
    } catch (e) { setError(e.message); setGuardando(false); }
  };
  const eliminar = async () => {
    if (!window.confirm("¿Eliminar este elemento de tu agenda?")) return;
    try { await agendaApi.eliminar(x._id); onGuardado(); } catch (e) { setError(e.message); }
  };

  return (
    <Sheet titulo={esNuevo ? "Nuevo" : "Editar"} onClose={onClose}>
      <div className="flex p-1 mt-1" style={{ borderRadius: 14, background: "#EEF2F8" }}>
        {[{ id: "evento", t: "Evento" }, { id: "tarea", t: "Tarea" }].map((o) => (
          <button key={o.id} onClick={() => setTipo(o.id)} className="flex-1 py-2 text-sm font-semibold"
            style={{ borderRadius: 11, background: tipo === o.id ? "#fff" : "transparent", color: tipo === o.id ? "#0B2A54" : "#475467", boxShadow: tipo === o.id ? "0 1px 2px rgba(11,18,32,.10), 0 4px 10px -2px rgba(11,42,84,.14)" : "none" }}>
            {o.t}
          </button>
        ))}
      </div>
      <Etiqueta>Título</Etiqueta>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={140} placeholder="Ej: Reunión con proveedor" className={inputCls} style={inputStyle} autoFocus />
      <div className="grid grid-cols-2 gap-2.5">
        <div><Etiqueta>Fecha{tipo === "tarea" ? " (opcional)" : ""}</Etiqueta><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} style={inputStyle} /></div>
        <div><Etiqueta>Hora (opcional)</Etiqueta><input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={inputCls} style={inputStyle} /></div>
      </div>
      {tipo === "evento" && (
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <Etiqueta>Duración</Etiqueta>
            <select value={dur} onChange={(e) => setDur(Number(e.target.value))} className={inputCls} style={inputStyle}>
              {duraciones.map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`}</option>)}
            </select>
          </div>
          <div>
            <Etiqueta>Tipo</Etiqueta>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls} style={inputStyle}>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
      )}
      <Etiqueta>Persona relacionada (opcional)</Etiqueta>
      <input value={persona} onChange={(e) => setPersona(e.target.value)} maxLength={80} placeholder="Cliente, proveedor, empleado..." className={inputCls} style={inputStyle} />
      <Etiqueta>Notas (opcional)</Etiqueta>
      <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} maxLength={600} placeholder="Tema, qué llevar, qué revisar..." className={inputCls} style={inputStyle} />
      <Etiqueta>Recordatorio</Etiqueta>
      <select value={rec} onChange={(e) => setRec(e.target.value)} className={inputCls} style={inputStyle}>
        {RECORDATORIOS.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
      </select>
      {error && <p className="text-xs mt-3" style={{ color: "#C1443A" }}>{error}</p>}
      <div className="flex gap-2.5 mt-5">
        {!esNuevo && !alDevolver && (
          <button onClick={eliminar} className="px-4 py-3 text-sm font-semibold" style={{ borderRadius: 14, background: "#FDE7E4", color: "#B42318" }}>Eliminar</button>
        )}
        <button onClick={guardar} disabled={guardando} className="flex-1 py-3 text-sm font-semibold" style={{ borderRadius: 14, background: "linear-gradient(135deg,#2F6FED,#5B91F7)", color: "#fff", opacity: guardando ? 0.6 : 1, boxShadow: "0 8px 18px rgba(47,111,237,.3)" }}>
          {guardando ? "Guardando..." : alDevolver ? "Listo" : "Guardar"}
        </button>
      </div>
    </Sheet>
  );
}

/* ---------- revisar lo que encontró la IA antes de guardar ---------- */
function PropuestasModal({ resultado, origen, perfil, onClose, onGuardado }) {
  const [items, setItems] = useState(() => (resultado.items || []).map((i) => ({ ...i, _marcado: i.confianza !== "baja" })));
  const [editando, setEditando] = useState(null); // índice
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const marcados = items.filter((i) => i._marcado).length;

  if (!items.length) {
    return (
      <Sheet titulo="No encontré nada" onClose={onClose}>
        <p className="text-sm" style={{ color: "#344054", lineHeight: 1.5 }}>{resultado.aclaraciones || "No pude encontrar eventos ni tareas. Probá con otra foto más nítida o escribilo de otra forma."}</p>
        <button onClick={onClose} className="w-full py-3 mt-5 text-sm font-semibold" style={{ borderRadius: 14, background: "#2F6FED", color: "#fff" }}>Cerrar</button>
      </Sheet>
    );
  }

  const guardar = async () => {
    setGuardando(true); setError(null);
    try {
      const aGuardar = items.filter((i) => i._marcado).map(({ _marcado, confianza, textoOriginal, ...resto }) => resto);
      const r = await agendaApi.guardarPropuestas(aGuardar, origen);
      if (r.omitidos) window.alert(`Se guardaron ${r.guardados}. ${r.omitidos} no se pudieron guardar por faltarles la fecha.`);
      onGuardado();
    } catch (e) { setError(e.message); setGuardando(false); }
  };

  return (
    <>
      <Sheet titulo={`Encontré ${items.length} ${items.length === 1 ? "elemento" : "elementos"}`} onClose={onClose} ancho={520}>
        <p className="text-xs mb-3" style={{ color: "#344054", lineHeight: 1.5 }}>Revisalos antes de guardar: una letra mal leída puede cambiar una fecha o un horario. Tocá "Editar" para corregir.</p>
        {resultado.aclaraciones && (
          <div className="flex items-start gap-2 p-3 mb-3 text-xs" style={{ borderRadius: 14, background: "#FFF6E0", color: "#8A5B12" }}><AlertTriangle size={14} className="shrink-0 mt-0.5" /> {resultado.aclaraciones}</div>
        )}
        <div className="flex flex-col gap-2.5">
          {items.map((i, n) => (
            <div key={n} className="flex items-start gap-3 p-3" style={{ borderRadius: 16, border: `1.5px ${i._marcado ? "solid" : "dashed"} ${i.confianza === "baja" ? "#F5C76B" : "#DCE4F8"}`, background: i.confianza === "baja" ? "#FFFCF3" : "#fff", opacity: i._marcado ? 1 : 0.55 }}>
              <Check2 marcado={i._marcado} onClick={() => setItems((l) => l.map((x, k) => (k === n ? { ...x, _marcado: !x._marcado } : x)))} label="Incluir" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug">{i.titulo} <Chip bg={i.tipo === "tarea" ? "#FFEDD5" : "#E8F0FE"} color={i.tipo === "tarea" ? "#C2410C" : "#2F6FED"}>{i.tipo === "tarea" ? "Tarea" : "Evento"}</Chip></p>
                <p className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs mt-1.5" style={{ color: "#475467" }}>
                  <span className="flex items-center gap-1"><Clock size={12} /> {i.fecha ? fechaLinda(i.fecha) : "Sin fecha"}{i.hora ? ` · ${i.hora}` : ""}</span>
                  {i.persona && <span className="flex items-center gap-1"><User size={12} /> {i.persona}</span>}
                </p>
                {i.notas && <p className="text-xs mt-1" style={{ color: "#475467" }}>{i.notas}</p>}
                {i.confianza === "baja" && <p className="text-xs font-semibold mt-1.5" style={{ color: "#B45309" }}>No estoy seguro de esta lectura: revisala.</p>}
                {i.textoOriginal && <p className="text-[11px] mt-1 italic" style={{ color: "#64748B" }}>Leí: “{i.textoOriginal}”</p>}
                <button onClick={() => setEditando(n)} className="text-xs font-semibold mt-1.5" style={{ color: "#2F6FED" }}>Editar</button>
              </div>
            </div>
          ))}
        </div>
        {error && <p className="text-xs mt-3" style={{ color: "#C1443A" }}>{error}</p>}
        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="px-4 py-3 text-sm font-semibold" style={{ borderRadius: 14, background: "#FDE7E4", color: "#B42318" }}>Descartar</button>
          <button onClick={guardar} disabled={!marcados || guardando} className="flex-1 py-3 text-sm font-semibold" style={{ borderRadius: 14, background: "linear-gradient(135deg,#2F6FED,#5B91F7)", color: "#fff", opacity: !marcados || guardando ? 0.5 : 1, boxShadow: "0 8px 18px rgba(47,111,237,.3)" }}>
            {guardando ? "Guardando..." : `Agregar a la agenda (${marcados})`}
          </button>
        </div>
      </Sheet>
      {editando !== null && (
        <FormularioItem
          inicial={items[editando]} perfil={perfil} onClose={() => setEditando(null)} onGuardado={() => {}}
          alDevolver={(datos) => { setItems((l) => l.map((x, k) => (k === editando ? { ...x, ...datos, confianza: "alta", _marcado: true } : x))); setEditando(null); }}
        />
      )}
    </>
  );
}

/* ---------- antes de subir una foto: límite diario y, si no tiene Mi Asistente, enlace para descargarlo ---------- */
function FotoPrevia({ perfil, onElegir, onClose }) {
  const restantes = perfil?.fotosRestantesHoy ?? 0;
  const porDia = perfil?.fotosPorDia ?? 2;
  const sinCupo = restantes <= 0;
  return (
    <Sheet titulo="Importar desde foto" onClose={onClose}>
      <p className="text-sm" style={{ color: "#344054", lineHeight: 1.5 }}>
        Sacale una foto a tu agenda de papel y la IA arma los eventos y tareas. Podés importar hasta {porDia} fotos por día.
      </p>
      <p className="text-sm font-semibold mt-3" style={{ color: sinCupo ? "#B42318" : "#0B2A54" }}>
        {sinCupo ? `Ya usaste tus ${porDia} fotos de hoy. Mañana podés importar más.` : `Te ${restantes === 1 ? "queda 1 foto" : `quedan ${restantes} fotos`} hoy.`}
      </p>
      {!perfil?.tieneAsistente && (
        <div className="mt-4 p-3.5" style={{ borderRadius: 16, background: "#F3ECFC", border: "1px solid #D8C4F0" }}>
          <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#5B3A7A" }}><Sparkles size={15} /> ¿Todavía no tenés Mi Asistente?</p>
          <p className="text-xs mt-1" style={{ color: "#5B3A7A", lineHeight: 1.5 }}>Descargalo desde Play Store y sumá un asistente con IA que atiende a los clientes de tu negocio.</p>
          <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-sm font-semibold py-2.5 mt-3" style={{ borderRadius: 12, background: "#7A4F9E", color: "#fff" }}>
            Descargar Mi Asistente en Play Store
          </a>
        </div>
      )}
      <button onClick={onElegir} disabled={sinCupo} className="w-full py-3 mt-4 text-sm font-semibold flex items-center justify-center gap-2" style={{ borderRadius: 14, background: "linear-gradient(135deg,#2F6FED,#5B91F7)", color: "#fff", opacity: sinCupo ? 0.45 : 1, boxShadow: "0 8px 18px rgba(47,111,237,.3)" }}>
        <Camera size={16} /> Elegir foto
      </button>
    </Sheet>
  );
}

/* ---------- agregar desde un mensaje ---------- */
function MensajeModal({ onClose, onResultado }) {
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const enviar = async () => {
    if (texto.trim().length < 3) return setError("Escribí qué querés agendar.");
    setCargando(true); setError(null);
    try { onResultado(await agendaApi.interpretar(texto.trim())); }
    catch (e) { setError(e.message); setCargando(false); }
  };
  return (
    <Sheet titulo="Agregar desde un mensaje" onClose={onClose}>
      <p className="text-xs mb-3" style={{ color: "#344054", lineHeight: 1.5 }}>Escribí como hablás y la IA arma el evento o la tarea. Siempre vas a poder revisarlo antes de guardar.</p>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} maxLength={2500} autoFocus className={inputCls} style={inputStyle}
        placeholder="Ej: El jueves a las 16 tengo que reunirme con Martín para hablar del nuevo pedido." />
      {error && <p className="text-xs mt-2" style={{ color: "#C1443A" }}>{error}</p>}
      <button onClick={enviar} disabled={cargando} className="w-full py-3 mt-4 text-sm font-semibold" style={{ borderRadius: 14, background: "linear-gradient(135deg,#7A4F9E,#5B3FD1)", color: "#fff", opacity: cargando ? 0.6 : 1 }}>
        {cargando ? "Interpretando..." : "Interpretar"}
      </button>
    </Sheet>
  );
}

/* ---------- tarjetas ---------- */
function TarjetaEvento({ e, proximo, pasado, onClick }) {
  return (
    <button onClick={onClick} className="zona-tarjeta w-full flex gap-3 p-3 text-left" style={{ ...CARD, borderLeft: `4px solid ${proximo ? "#7A4F9E" : "#2F6FED"}`, opacity: pasado ? 0.55 : 1, background: proximo ? "linear-gradient(135deg,#FAF7FF,#fff)" : "#fff" }}>
      <span className="shrink-0 text-center" style={{ width: 50 }}>
        <span className="block text-sm font-bold leading-tight" style={{ color: "#0B2A54", fontFamily: "var(--fuente-titulo)" }}>{e.hora || "Todo el día"}</span>
        {e.hora && e.duracionMinutos ? <span className="block text-[10px]" style={{ color: "#64748B" }}>{e.duracionMinutos} min</span> : null}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold leading-snug">
          {e.titulo}
          {proximo && <span className="ml-2 text-[9px] font-bold uppercase px-2 py-0.5 align-middle" style={{ borderRadius: 20, background: "#7A4F9E", color: "#fff" }}>Próximo</span>}
        </span>
        <span className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {e.persona && <span className="flex items-center gap-1 text-xs" style={{ color: "#475467" }}><User size={12} /> {e.persona}</span>}
          {e.recordatorioMinutos !== null && e.recordatorioMinutos !== undefined && <span className="flex items-center gap-1 text-xs" style={{ color: "#475467" }}><Bell size={12} /> Aviso</span>}
        </span>
        {e.notas && <span className="block text-xs mt-1" style={{ color: "#475467" }}>{e.notas}</span>}
      </span>
    </button>
  );
}

function TarjetaTarea({ t, onToggle, onClick }) {
  const et = t.completada ? { texto: "Hecha", color: "#15803D", bg: "#DCFCE7" } : etiquetaFecha(t.fecha);
  return (
    <div className="zona-tarjeta flex items-start gap-3 p-3" style={CARD}>
      <Check2 marcado={t.completada} onClick={() => onToggle(t)} label="Marcar como hecha" />
      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <span className="block text-sm font-semibold leading-snug" style={{ textDecoration: t.completada ? "line-through" : "none", color: t.completada ? "#64748B" : "#0B1220" }}>{t.titulo}</span>
        <span className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
          <Chip color={et.color} bg={et.bg}>{t.fecha || t.completada ? et.texto : "Sin fecha"}{t.hora && !t.completada ? ` · ${t.hora}` : ""}</Chip>
          {t.persona && <span className="flex items-center gap-1 text-xs" style={{ color: "#475467" }}><User size={12} /> {t.persona}</span>}
        </span>
        {t.notas && <span className="block text-xs mt-1" style={{ color: "#475467" }}>{t.notas}</span>}
      </button>
    </div>
  );
}

const Vacio = ({ Icon = CalendarDays, titulo, texto }) => (
  <div className="flex flex-col items-center text-center gap-1 py-8 px-4" style={{ borderRadius: 20, border: "1.5px dashed #C9D2E6", background: "linear-gradient(180deg,#FAFBFE,#F3F6FB)" }}>
    <span className="flex items-center justify-center mb-2" style={{ width: 52, height: 52, borderRadius: 17, background: "#fff", boxShadow: "0 1px 2px rgba(11,18,32,.06), inset 0 0 0 1px #E1E8F2" }}><Icon size={24} color="#8A94A8" /></span>
    <p className="text-sm font-semibold" style={{ color: "#0B1220" }}>{titulo}</p>
    {texto && <p className="text-xs" style={{ color: "#475467" }}>{texto}</p>}
  </div>
);

const SeccionTitulo = ({ children, contador }) => (
  <p className="flex items-center gap-2 mt-6 mb-2.5 px-0.5" style={{ ...TITULO, fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#667085" }}>
    {children}
    {contador ? <span className="text-[11px] font-bold px-2 py-0.5" style={{ borderRadius: 20, background: "#2F6FED", color: "#fff" }}>{contador}</span> : null}
  </p>
);

/* =========================================================
   PANTALLA PRINCIPAL DE LA AGENDA
   ========================================================= */
export function AgendaScreen({ negocioNombre, onBack }) {
  const [perfil, setPerfil] = useState(null);
  const [vista, setVista] = useState("hoy");
  const [datos, setDatos] = useState(null); // lo de la vista actual
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [formulario, setFormulario] = useState(null); // item o valores iniciales
  const [mensajeAbierto, setMensajeAbierto] = useState(false);
  const [foto, setFoto] = useState(null); // null | "cargando" | { error }
  const [fotoPrevia, setFotoPrevia] = useState(false); // hoja que se muestra antes de elegir la foto
  const [propuestas, setPropuestas] = useState(null); // { resultado, origen }
  const [ia, setIa] = useState(null); // null | { cargando } | { titulo, texto } | { error }
  const [pregunta, setPregunta] = useState("");
  const [pushEstado, setPushEstado] = useState(null);
  const inputFotoRef = useRef(null);

  const hora = new Date().getHours();
  const saludo = hora < 6 ? "Buenas noches" : hora < 13 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const aiOk = perfil?.aiDisponible;

  useEffect(() => { agendaApi.perfil().then(setPerfil).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (pushSoportado()) estadoPush().then(setPushEstado); }, []);

  const cargar = async (v = vista) => {
    setCargando(true); setError(null);
    try {
      setDatos(v === "hoy" ? await agendaApi.hoy() : v === "semana" ? await agendaApi.semana() : await agendaApi.tareas());
    } catch (e) { setError(e.message); }
    setCargando(false);
  };
  useEffect(() => { cargar(vista); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [vista]);

  const refrescar = () => { setFormulario(null); setPropuestas(null); setMensajeAbierto(false); setFoto(null); cargar(vista); };

  const alternarTarea = async (t) => {
    try { await agendaApi.completar(t._id, !t.completada); cargar(vista); } catch (e) { window.alert(e.message); }
  };

  const importarFoto = async (ev) => {
    const archivo = ev.target.files?.[0];
    ev.target.value = "";
    if (!archivo) return;
    setFoto("cargando");
    try {
      const base64 = await reducirImagen(archivo);
      const resultado = await agendaApi.interpretarFoto(base64, "image/jpeg");
      if (typeof resultado.fotosRestantesHoy === "number") setPerfil((pf) => (pf ? { ...pf, fotosRestantesHoy: resultado.fotosRestantesHoy } : pf));
      setFoto(null);
      setPropuestas({ resultado, origen: "foto" });
    } catch (e) {
      if (e.datos && typeof e.datos.fotosRestantesHoy === "number") setPerfil((pf) => (pf ? { ...pf, fotosRestantesHoy: e.datos.fotosRestantesHoy } : pf));
      else agendaApi.perfil().then(setPerfil).catch(() => {}); // si la IA falló, la foto no cuenta: traemos el cupo real
      setFoto({ error: e.message });
    }
  };

  const organizar = async () => {
    setIa({ cargando: true });
    try { const r = await agendaApi.organizarDia(hoyISO()); setIa({ titulo: "Tu día, organizado", texto: r.resumen }); }
    catch (e) { setIa({ error: e.message }); }
  };
  const preguntar = async () => {
    const q = pregunta.trim();
    if (q.length < 3) return;
    setIa({ cargando: true });
    try { const r = await agendaApi.preguntar(q); setIa({ titulo: q, texto: r.respuesta }); }
    catch (e) { setIa({ error: e.message }); }
  };
  const activarAvisos = async () => {
    try { await activarPush(); } catch (e) { window.alert(e.message); }
    setPushEstado(await estadoPush());
  };

  const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
  const hoy = vista === "hoy" && datos ? datos : null;
  const proximo = hoy ? hoy.eventos.find((e) => e.hora && minutosDe(e.hora) >= ahoraMin) : null;

  const acciones = [
    { Icon: CalendarDays, t: "Evento", color: "#2F6FED", bg: "#E8F0FE", f: () => setFormulario({ tipo: "evento", fecha: hoyISO() }) },
    { Icon: ListChecks, t: "Tarea", color: "#16A34A", bg: "#DCFCE7", f: () => setFormulario({ tipo: "tarea" }) },
    { Icon: Camera, t: "Desde foto", color: "#EA580C", bg: "#FFEDD5", f: () => (aiOk ? setFotoPrevia(true) : window.alert("Esta función con IA se habilita cuando tu negocio tiene la suscripción activa.")) },
    { Icon: MessageSquare, t: "Desde mensaje", color: "#7A4F9E", bg: "#EDE3F8", f: () => (aiOk ? setMensajeAbierto(true) : window.alert("Esta función con IA se habilita cuando tu negocio tiene la suscripción activa.")) },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F3F6FB", fontFamily: "var(--fuente-texto)" }}>
      {/* portada */}
      <div data-conservar-color className="relative overflow-hidden" style={{ background: "linear-gradient(165deg,#0B2A54 0%,#14407F 60%,#1F55B3 120%)", padding: "16px 16px 26px" }}>
        <div style={{ position: "absolute", top: -60, right: -50, width: 190, height: 190, borderRadius: "50%", background: "#ffffff0d" }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BotonAtras onClick={onBack} size={38} />
            <p className="flex-1" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 18, color: "#fff" }}>Mi agenda</p>
          </div>
          <p className="text-xs" style={{ color: "#B8C9EA" }}>{saludo}{negocioNombre ? `, ${negocioNombre}` : ""}</p>
          <div className="flex items-end justify-between gap-3 mt-1">
            <div className="min-w-0">
              <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 23, color: "#fff", lineHeight: 1.15 }}>{fechaLinda(hoyISO())}</p>
              <p className="text-sm mt-1" style={{ color: "#DCE7FB" }}>
                {hoy ? (hoy.eventos.length || hoy.tareas.length ? `${hoy.eventos.length} ${hoy.eventos.length === 1 ? "evento" : "eventos"} y ${hoy.tareas.length} ${hoy.tareas.length === 1 ? "tarea pendiente" : "tareas pendientes"}` : "Tu día está libre") : "Cargando tu día..."}
              </p>
            </div>
            <span className="flex flex-col items-center justify-center shrink-0" style={{ width: 62, height: 62, borderRadius: 20, background: "#ffffff1f", border: "1px solid #ffffff33" }}>
              <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 24, color: "#fff", lineHeight: 1 }}>{hoy ? hoy.eventos.length : "·"}</span>
              <span className="text-[9px] uppercase mt-0.5" style={{ color: "#B8C9EA", letterSpacing: 0.6 }}>hoy</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4" style={{ marginTop: -14, paddingBottom: 40 }}>
        {pushEstado === "inactivo" && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-3 mb-3" style={{ borderRadius: 16, background: "#E8F0FE", border: "1px solid #CFE0FB" }}>
            <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#1D3FB5", lineHeight: 1.4 }}><Bell size={15} className="shrink-0" /> Activá las notificaciones para que te avisemos de tus eventos, incluso con la app cerrada.</span>
            <button onClick={activarAvisos} className="text-xs font-semibold px-3 py-1.5 shrink-0" style={{ borderRadius: 20, background: "#2F6FED", color: "#fff" }}>Activar</button>
          </div>
        )}

        {/* acciones rápidas */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {acciones.map(({ Icon, t, color, bg, f }) => (
            <button key={t} onClick={f} className="zona-tarjeta flex flex-col items-center gap-1.5 py-3.5" style={CARD}>
              <span className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 13, background: bg, boxShadow: "inset 0 0 0 1px rgba(11,42,84,.06)" }}><Icon size={19} color={color} /></span>
              <span className="text-[11px] font-semibold" style={{ color: "#0B2A54" }}>{t}</span>
            </button>
          ))}
        </div>
        <input ref={inputFotoRef} type="file" accept="image/*" className="hidden" onChange={importarFoto} />

        {/* IA: organizar el día y preguntar */}
        <div className="p-3 mb-4" style={{ borderRadius: 20, background: "linear-gradient(135deg,#F5F3FF,#EEF2FF)", border: "1px solid #E0E0FF" }}>
          <button
            onClick={aiOk ? organizar : () => window.alert("Esta función con IA se habilita cuando tu negocio tiene la suscripción activa.")}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3"
            style={{ borderRadius: 14, background: "linear-gradient(135deg,#7A4F9E,#5B3FD1)", color: "#fff", boxShadow: "0 10px 22px rgba(91,63,209,.3)", opacity: aiOk ? 1 : 0.7 }}
          >
            {aiOk ? <Sparkles size={16} /> : <Lock size={15} />} Organizar mi día
          </button>
          <div className="flex items-center gap-2 mt-2.5 bg-white pl-3.5 pr-1 py-1" style={{ borderRadius: 14, border: "1.5px solid #E4E6F5" }}>
            <input
              value={pregunta} onChange={(e) => setPregunta(e.target.value)} maxLength={300}
              onKeyDown={(e) => e.key === "Enter" && (aiOk ? preguntar() : null)}
              placeholder="¿Qué tengo pendiente esta semana?" className="flex-1 min-w-0 outline-none text-sm py-2 bg-transparent" disabled={!aiOk}
            />
            <button onClick={preguntar} disabled={!aiOk} aria-label="Preguntar" className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: "#7A4F9E", opacity: aiOk ? 1 : 0.4 }}><Send size={15} color="#fff" /></button>
          </div>
          {!aiOk && perfil && <p className="text-[11px] mt-2" style={{ color: "#7A6FA8" }}>Las funciones con IA se habilitan cuando tu negocio tiene la suscripción activa.</p>}
          {ia && (
            <div className="mt-2.5 p-3.5 bg-white" style={{ borderRadius: 14, border: "1px solid #E4E6F5" }}>
              {ia.cargando ? <p className="text-sm" style={{ color: "#475467" }}>Pensando...</p> : ia.error ? <p className="text-sm" style={{ color: "#C1443A" }}>{ia.error}</p> : (
                <>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-semibold" style={{ color: "#5B3FD1" }}>{ia.titulo}</p>
                    <button onClick={() => setIa(null)} aria-label="Cerrar"><X size={15} color="#64748B" /></button>
                  </div>
                  <p className="text-sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, color: "#1E293B" }}>{ia.texto}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* pestañas */}
        <div className="flex p-1 mb-4" style={{ borderRadius: 16, background: "#E3E9F5" }}>
          {[{ id: "hoy", t: "Hoy" }, { id: "semana", t: "Semana" }, { id: "tareas", t: "Tareas" }].map((o) => (
            <button key={o.id} onClick={() => setVista(o.id)} className="flex-1 py-2 text-sm font-semibold"
              style={{ borderRadius: 12, background: vista === o.id ? "#fff" : "transparent", color: vista === o.id ? "#2F6FED" : "#475467", boxShadow: vista === o.id ? "0 1px 2px rgba(11,18,32,.10), 0 4px 10px -2px rgba(11,42,84,.14)" : "none" }}>
              {o.t}
            </button>
          ))}
        </div>

        {error && <p className="text-sm p-3 mb-3" style={{ borderRadius: 14, background: "#FDE7E4", color: "#B42318" }}>{error}</p>}
        {cargando && !datos && <p className="text-sm text-center py-10 flex flex-col items-center gap-3 font-medium" style={{ color: "#667085" }}><span style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #DDE3EE", borderTopColor: "#2F6FED", animation: "zona-giro .8s linear infinite" }} />Cargando...</p>}

        {/* HOY */}
        {vista === "hoy" && hoy && (
          <>
            {hoy.avisos.map((a) => (
              <div key={a} className="flex items-start gap-2 p-3 mb-2 text-xs" style={{ borderRadius: 14, background: "#FFF6E0", border: "1px solid #F5D9A0", color: "#8A5B12", lineHeight: 1.4 }}><AlertTriangle size={14} className="shrink-0 mt-0.5" /> {a}</div>
            ))}
            <SeccionTitulo>Tu agenda de hoy</SeccionTitulo>
            {hoy.eventos.length ? (
              <div className="flex flex-col gap-2.5">
                {hoy.eventos.map((e) => (
                  <TarjetaEvento key={e._id} e={e} proximo={proximo && proximo._id === e._id} pasado={e.hora && minutosDe(e.hora) + (e.duracionMinutos || 30) < ahoraMin} onClick={() => setFormulario(e)} />
                ))}
              </div>
            ) : <Vacio titulo="No tenés eventos hoy" texto="Agregá uno o importalo desde una foto de tu agenda." />}

            <SeccionTitulo contador={hoy.tareas.length}>Tareas pendientes</SeccionTitulo>
            {hoy.tareas.length ? (
              <div className="flex flex-col gap-2.5">
                {hoy.tareas.slice(0, 8).map((t) => <TarjetaTarea key={t._id} t={t} onToggle={alternarTarea} onClick={() => setFormulario(t)} />)}
                {hoy.tareas.length > 8 && <button onClick={() => setVista("tareas")} className="text-sm font-semibold py-2.5" style={{ borderRadius: 14, background: "#E8F0FE", color: "#2F6FED" }}>Ver todas las tareas</button>}
              </div>
            ) : <Vacio Icon={ListChecks} titulo="No tenés tareas pendientes" texto="¡Todo al día! 🎉" />}
          </>
        )}

        {/* SEMANA */}
        {vista === "semana" && datos?.dias && datos.dias.map((d) => (
          <div key={d.fecha} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="flex items-center gap-2 text-sm font-semibold">{fechaLinda(d.fecha)} {d.fecha === hoyISO() && <Chip color="#1D4ED8" bg="#DBEAFE">Hoy</Chip>}</p>
              <button onClick={() => setFormulario({ tipo: "evento", fecha: d.fecha })} aria-label="Agregar evento este día" className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: 10, background: "#E8F0FE" }}><Plus size={15} color="#2F6FED" /></button>
            </div>
            {d.eventos.length ? (
              <div className="flex flex-col gap-2.5">{d.eventos.map((e) => <TarjetaEvento key={e._id} e={e} onClick={() => setFormulario(e)} />)}</div>
            ) : <p className="text-xs text-center py-3" style={{ borderRadius: 14, border: "1px dashed #DCE1F0", color: "#64748B", background: "#F8FAFD" }}>Sin eventos</p>}
          </div>
        ))}

        {/* TAREAS */}
        {vista === "tareas" && datos?.pendientes && (
          <>
            <SeccionTitulo contador={datos.pendientes.length}>Pendientes</SeccionTitulo>
            {datos.pendientes.length ? (
              <div className="flex flex-col gap-2.5">{datos.pendientes.map((t) => <TarjetaTarea key={t._id} t={t} onToggle={alternarTarea} onClick={() => setFormulario(t)} />)}</div>
            ) : <Vacio Icon={ListChecks} titulo="No tenés tareas pendientes" />}

            {(() => {
              const sugeridas = (perfil?.tareas || []).filter((t) => !datos.pendientes.some((p) => p.titulo.toLowerCase() === t.toLowerCase()));
              return sugeridas.length ? (
                <>
                  <SeccionTitulo>Sugeridas para tu rubro{perfil?.rubro ? ` (${perfil.rubro})` : ""}</SeccionTitulo>
                  <div className="flex flex-wrap gap-2">
                    {sugeridas.map((t) => (
                      <button key={t} onClick={() => setFormulario({ tipo: "tarea", titulo: t })} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 text-left" style={{ borderRadius: 20, border: "1.5px dashed #B8C6F5", background: "#fff", color: "#2F6FED" }}>
                        <Plus size={13} /> {t}
                      </button>
                    ))}
                  </div>
                </>
              ) : null;
            })()}

            {datos.hechas?.length > 0 && (
              <>
                <SeccionTitulo>Hechas esta semana</SeccionTitulo>
                <div className="flex flex-col gap-2.5">{datos.hechas.map((t) => <TarjetaTarea key={t._id} t={t} onToggle={alternarTarea} onClick={() => setFormulario(t)} />)}</div>
              </>
            )}
          </>
        )}
      </div>

      {fotoPrevia && <FotoPrevia perfil={perfil} onClose={() => setFotoPrevia(false)} onElegir={() => { setFotoPrevia(false); inputFotoRef.current?.click(); }} />}
      {formulario && <FormularioItem inicial={formulario} perfil={perfil} onClose={() => setFormulario(null)} onGuardado={refrescar} />}
      {mensajeAbierto && <MensajeModal onClose={() => setMensajeAbierto(false)} onResultado={(resultado) => { setMensajeAbierto(false); setPropuestas({ resultado, origen: "mensaje" }); }} />}
      {foto && (
        <Sheet titulo="Leyendo tu agenda" onClose={() => foto !== "cargando" && setFoto(null)}>
          {foto === "cargando" ? (
            <div className="flex flex-col items-center text-center gap-2 py-6">
              <span style={{ width: 36, height: 36, borderRadius: "50%", border: "4px solid #E3E8FA", borderTopColor: "#2F6FED", animation: "agGirar 0.8s linear infinite" }} />
              <style>{"@keyframes agGirar { to { transform: rotate(360deg); } }"}</style>
              <p className="text-sm font-semibold">Analizando la foto...</p>
              <p className="text-xs" style={{ color: "#475467" }}>Puede tardar unos segundos. Después vas a poder revisar todo antes de guardar.</p>
            </div>
          ) : (
            <>
              <p className="text-sm p-3" style={{ borderRadius: 14, background: "#FDE7E4", color: "#B42318" }}>{foto.error}</p>
              <button onClick={() => setFoto(null)} className="w-full py-3 mt-4 text-sm font-semibold" style={{ borderRadius: 14, background: "#2F6FED", color: "#fff" }}>Cerrar</button>
            </>
          )}
        </Sheet>
      )}
      {propuestas && <PropuestasModal resultado={propuestas.resultado} origen={propuestas.origen} perfil={perfil} onClose={() => setPropuestas(null)} onGuardado={refrescar} />}
    </div>
  );
}
