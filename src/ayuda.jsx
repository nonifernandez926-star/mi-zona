// Ajustes → Acerca de Mi Zona, Centro de ayuda y Soporte.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, ChevronRight, Check, Loader2, Mail, Send, Info, MessageCircle, Sparkles, MapPin, Star, Bell, LifeBuoy, HelpCircle, BookOpen, X, Compass,
} from "lucide-react";
import { BotonVolver, VERDE, AMBAR } from "./cuenta.jsx";
import { soporteApi, SOPORTE_EMAIL, SOPORTE_WHATSAPP, APP_VERSION } from "./api.js";
import { CATEGORIAS, ARTICULOS, articuloPorId, categoriaPorId, buscarArticulos } from "./ayudaContenido.js";
import { TERMINOS, PRIVACIDAD_TEXTO, LICENCIAS, LEGAL_ACTUALIZADO } from "./legal.js";

const TITULO = { fontFamily: "var(--fuente-titulo)", fontWeight: 600, color: "#0B1437" };
const TARJ = { borderRadius: 20, border: "1px solid #E3E7F1", background: "#fff", boxShadow: "0 1px 2px rgba(11,20,55,.04)" };

function Cabecera({ titulo, sub, volver, onBack }) {
  return (
    <>
      <BotonVolver texto={volver} onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{titulo}</h2>
      {sub ? <p className="text-sm mt-1.5 mb-5" style={{ color: "#5B6482", lineHeight: 1.5 }}>{sub}</p> : <div className="mb-5" />}
    </>
  );
}

const fmtFecha = (iso) => (iso ? new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) : "");
const fmtFechaHora = (iso) => (iso ? new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

/* =========================================================
   CENTRO DE AYUDA
   ========================================================= */

function CuerpoArticulo({ cuerpo }) {
  return (
    <div className="space-y-3">
      {cuerpo.map((b, i) => {
        if (typeof b === "string") return <p key={i} className="text-[15px]" style={{ color: "#1F2937", lineHeight: 1.65 }}>{b}</p>;
        if (b.pasos) return (
          <ol key={i} className="space-y-2.5">
            {b.pasos.map((p, j) => (
              <li key={j} className="flex gap-3 items-start">
                <span className="flex items-center justify-center shrink-0 text-xs font-bold" style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(180deg,var(--azul-g1),var(--azul-g2))", color: "#fff", marginTop: 0, boxShadow: "0 4px 10px -3px rgba(var(--azul-rgb),.6)" }}>{j + 1}</span>
                <span className="text-[15px]" style={{ color: "#1F2937", lineHeight: 1.6 }}>{p}</span>
              </li>
            ))}
          </ol>
        );
        if (b.nota) return (
          <div key={i} className="flex gap-2.5 p-3.5" style={{ borderRadius: 14, background: "#F3F7FF", border: "1px solid #D6E3FB", borderLeft: "4px solid var(--azul)" }}>
            <Info size={17} color="var(--azul)" className="shrink-0" style={{ marginTop: 2 }} />
            <p className="text-sm" style={{ color: "#2B3768", lineHeight: 1.55 }}>{b.nota}</p>
          </div>
        );
        return null;
      })}
    </div>
  );
}


const hace = (iso) => {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  if (m < 1440) return `hace ${Math.round(m / 60)} h`;
  const d = Math.round(m / 1440);
  return d === 1 ? "ayer" : d < 30 ? `hace ${d} días` : fmtFecha(iso);
};

// Caja de ícono con el color del tema, como en Mi Asistente
function IconoCaja({ Icon, color = "#2350F5", size = 18, caja = 38 }) {
  const aCss = color.startsWith("var(") ? `color-mix(in srgb, ${color} 12%, white)` : `${color}1a`;
  const aro = color.startsWith("var(") ? `color-mix(in srgb, ${color} 22%, white)` : `${color}33`;
  return <span className="flex items-center justify-center shrink-0" style={{ width: caja, height: caja, borderRadius: Math.round(caja * 0.32), background: aCss, boxShadow: `inset 0 0 0 1px ${aro}` }}><Icon size={size} color={color} /></span>;
}

// Acordeón (igual que los de Mi Asistente): se abre y se cierra en el mismo lugar
function Acordeon({ icono, color, titulo, sub, abierto, children, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => { if (abierto && ref.current) setTimeout(() => ref.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 80); }, [abierto]);
  return (
    <details ref={ref} open={!!abierto} className="zn-acordeon mb-2.5 overflow-hidden" style={{ ...TARJ, borderRadius: 16, animation: `zona-aparecer .35s ease ${delay}ms both` }}>
      <summary className="flex items-center gap-3 p-3.5 cursor-pointer" style={{ listStyle: "none" }}>
        {icono && <IconoCaja Icon={icono} color={color} />}
        <span className="flex-1 min-w-0 flex flex-col">
          <strong className="text-[15px]" style={{ color: "#0B1437", lineHeight: 1.3 }}>{titulo}</strong>
          {sub && <small className="text-xs mt-0.5" style={{ color: "#8D95B0", fontWeight: 600 }}>{sub}</small>}
        </span>
        <ChevronRight size={16} color="#8D95B0" className="shrink-0 zn-chevron" />
      </summary>
      <div className="px-4 pb-4" style={{ animation: "zona-aparecer .3s ease both" }}>{children}</div>
    </details>
  );
}

/* =========================================================
   CENTRO DE AYUDA  (mismo formato que el de Mi Asistente: buscador, temas y artículos que se abren)
   ========================================================= */

function ArticuloAyuda({ art, abierto, delay, onContactar }) {
  const cat = categoriaPorId(art.cat);
  const [voto, setVoto] = useState(null);
  return (
    <Acordeon icono={BookOpen} color={cat?.color} titulo={art.titulo} sub={cat?.titulo} abierto={abierto} delay={delay}>
      <CuerpoArticulo cuerpo={art.cuerpo} />
      <div className="flex items-center gap-2 mt-4 pt-3 text-sm" style={{ borderTop: "1px solid #EEF0F6", color: "#5B6482" }}>
        {voto === null && (<>
          <span>¿Te sirvió?</span>
          <button onClick={() => setVoto("si")} className="px-3.5 py-1.5 text-[13px] font-bold" style={{ border: "1px solid #E3E7F1", borderRadius: 9, background: "#fff", color: "#0B1437" }}>Sí</button>
          <button onClick={() => setVoto("no")} className="px-3.5 py-1.5 text-[13px] font-bold" style={{ border: "1px solid #E3E7F1", borderRadius: 9, background: "#fff", color: "#0B1437" }}>No</button>
        </>)}
        {voto === "si" && <span className="flex items-center gap-1.5 font-bold" style={{ color: "#1E6B44" }}><Check size={15} /> ¡Gracias!</span>}
        {voto === "no" && (<>
          <span>Lamentamos eso.</span>
          <button onClick={() => onContactar(art.contactar || cat?.motivo || "otro")} className="px-3.5 py-1.5 text-[13px] font-bold" style={{ border: "1px solid #E3E7F1", borderRadius: 9, background: "#fff", color: "var(--azul)" }}>Escribir a soporte</button>
        </>)}
      </div>
    </Acordeon>
  );
}

export function AyudaScreen({ articuloInicial, onBack, onContactar }) {
  const [q, setQ] = useState("");
  const [tema, setTema] = useState("todos");
  const resultados = useMemo(() => {
    const base = q.trim() ? buscarArticulos(q) : ARTICULOS;
    return tema === "todos" ? base : base.filter((a) => a.cat === tema);
  }, [q, tema]);
  const inicial = articuloInicial && articuloPorId(articuloInicial) ? articuloInicial : null;
  const chips = [{ id: "todos", titulo: "Todos" }, ...CATEGORIAS];
  return (
    <div>
      <Cabecera titulo="Centro de ayuda" sub="Respuestas a las dudas más comunes sobre Mi Zona." volver="Volver a Ajustes" onBack={onBack} />

      <div className="flex items-center gap-2.5 px-3.5 mb-3" style={{ background: "#fff", border: "1px solid #E3E7F1", borderRadius: 16 }}>
        <Search size={18} color="#5B6482" className="shrink-0" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscá: negocios, pagos, avisos..." maxLength={80} aria-label="Buscar en el Centro de ayuda" autoComplete="off"
          className="flex-1 min-w-0 py-3.5 text-[15px] bg-transparent outline-none" style={{ color: "#0B1437" }} />
        {q && <button onClick={() => setQ("")} aria-label="Borrar búsqueda" className="p-1.5"><X size={16} color="#5B6482" /></button>}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
        {chips.map((c) => {
          const activo = tema === c.id;
          return <button key={c.id} onClick={() => setTema(c.id)} className="shrink-0 text-[13px] font-bold px-3.5 py-2" style={{ borderRadius: 999, border: `1px solid ${activo ? "var(--azul-oscuro)" : "#E3E7F1"}`, background: activo ? "var(--azul-oscuro)" : "#fff", color: activo ? "#fff" : "#5B6482" }}>{c.titulo}</button>;
        })}
      </div>

      <div>
        {resultados.length ? resultados.map((a, i) => <ArticuloAyuda key={a.id} art={a} abierto={a.id === inicial} delay={Math.min(i, 8) * 30} onContactar={onContactar} />) : (
          <div className="text-center px-5 py-8">
            <span className="inline-flex items-center justify-center mb-3" style={{ width: 62, height: 62, borderRadius: 20, background: "linear-gradient(145deg,#F1F3F8,#E5E9F1)", boxShadow: "inset 0 0 0 1px #D9DEEA" }}><Search size={26} color="#5B6482" /></span>
            <strong className="block" style={{ color: "#0B1437" }}>Sin resultados</strong>
            <p className="text-sm mt-1" style={{ color: "#5B6482" }}>Probá con otra palabra o escribinos y te ayudamos.</p>
          </div>
        )}
      </div>

      <div className="mt-2 p-4 flex items-center gap-3" style={{ background: "var(--azul-suave)", borderRadius: 18 }}>
        <IconoCaja Icon={MessageCircle} color="#7A4FD0" size={22} caja={44} />
        <span className="flex-1 min-w-0">
          <strong className="block text-sm" style={{ color: "#0B1437" }}>¿No encontraste lo que buscabas?</strong>
          <span className="block text-[13px] mt-0.5" style={{ color: "#5B6482" }}>Escribinos y te respondemos desde acá.</span>
        </span>
        <button onClick={() => onContactar(null)} className="shrink-0 text-sm font-bold px-4 py-2.5" style={{ borderRadius: 12, background: "linear-gradient(180deg,var(--azul-g1),var(--azul-g2))", color: "#fff" }}>Escribir</button>
      </div>
    </div>
  );
}

/* =========================================================
   SOPORTE  (una sola pantalla, como en Mi Asistente: ayuda, nueva consulta, contacto y mis consultas)
   ========================================================= */

const MOTIVOS = [
  { id: "cuenta", titulo: "Mi cuenta y acceso" },
  { id: "negocio", titulo: "Mi negocio" },
  { id: "pagos", titulo: "Pagos y suscripción" },
  { id: "asistente", titulo: "Chats y Mi Asistente" },
  { id: "resenas", titulo: "Reseñas" },
  { id: "error", titulo: "Algo no funciona" },
  { id: "sugerencia", titulo: "Sugerencia" },
  { id: "otro", titulo: "Otra cosa" },
];

const ESTADO = {
  abierta: { texto: "En revisión", fondo: "#FDECC4", color: "#8A5600" },
  respondida: { texto: "Respondida", fondo: "#D3F0E1", color: "#14663B" },
  cerrada: { texto: "Resuelta", fondo: "#EEF0F6", color: "#5B6482" },
};
function Pastilla({ estado }) {
  const e = ESTADO[estado] || ESTADO.abierta;
  return <span className="text-[10.5px] font-extrabold px-2.5 py-1 shrink-0" style={{ borderRadius: 7, background: e.fondo, color: e.color, letterSpacing: ".05em", textTransform: "uppercase" }}>{e.texto}</span>;
}

// Datos que ayudan a reproducir un problema. Se envían junto con la consulta.
function datosTecnicos() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Otro navegador";
  const so = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Otro sistema";
  return `Mi Zona ${APP_VERSION} · ${nav} en ${so}`;
}

const CAMPO = { width: "100%", borderRadius: 12, border: "1px solid #E3E7F1", background: "#fff", color: "#0B1437", padding: "12px 14px", fontSize: 16 };
const ETIQUETA = { display: "block", fontSize: 13, fontWeight: 700, color: "#2B3768", margin: "14px 0 6px" };
const TITULO_GRUPO = { margin: "0 4px 9px", fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#8D95B0" };

export function SoporteScreen({ usuario, temaInicial, directo, textoVolver, onBack, onLogin, onIrAyuda }) {
  const [motivo, setMotivo] = useState(temaInicial || "otro");
  const [mensaje, setMensaje] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [okMsg, setOkMsg] = useState(null);
  const [lista, setLista] = useState(null);
  const [errorLista, setErrorLista] = useState(false);
  const formRef = useRef(null);
  const tecnico = useMemo(datosTecnicos, []);

  const cargarLista = () => {
    if (!usuario) { setLista([]); return; }
    setErrorLista(false);
    soporteApi.mias().then(setLista).catch(() => setErrorLista(true));
  };
  useEffect(cargarLista, [usuario?.id]);
  useEffect(() => { window.scrollTo(0, 0); if (directo) setTimeout(() => formRef.current?.querySelector("textarea")?.focus(), 150); }, []);

  const correoOk = usuario || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const puedeEnviar = mensaje.trim().length >= 15 && correoOk && !enviando;

  const enviar = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;
    setEnviando(true); setError(null); setOkMsg(null);
    const texto = mensaje.trim();
    const asunto = texto.replace(/\s+/g, " ").slice(0, 60);
    try {
      const c = await soporteApi.enviar({ motivo, asunto, mensaje: texto, email: usuario ? undefined : email.trim(), tecnico });
      setMensaje(""); setOkMsg(usuario ? `Consulta enviada (${c.codigo}). Te respondemos por acá.` : `Consulta enviada (${c.codigo}). Te respondemos por correo.`); cargarLista();
    } catch (err) { setError(err.message || "No pudimos enviar tu consulta. Probá de nuevo."); }
    finally { setEnviando(false); }
  };

  const wa = SOPORTE_WHATSAPP ? `https://wa.me/${SOPORTE_WHATSAPP}?text=${encodeURIComponent("Hola, tengo una consulta sobre Mi Zona.")}` : null;
  const mail = SOPORTE_EMAIL ? `mailto:${SOPORTE_EMAIL}?subject=${encodeURIComponent("Consulta sobre Mi Zona")}` : null;
  const hayRespuesta = (lista || []).some((c) => c.estado === "respondida");

  return (
    <div>
      <Cabecera titulo="Soporte" sub="Contanos qué necesitás y te respondemos desde acá." volver={textoVolver || "Volver a Ajustes"} onBack={onBack} />

      <button onClick={onIrAyuda} className="w-full flex items-center gap-3 p-3.5 mb-4 text-left" style={TARJ}>
        <IconoCaja Icon={HelpCircle} color="#0E8FB5" />
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold" style={{ color: "#0B1437" }}>Mirá primero el Centro de ayuda</span>
          <span className="block text-xs mt-0.5" style={{ color: "#5B6482" }}>Quizás la respuesta ya está ahí</span>
        </span>
        <ChevronRight size={18} color="#B9C0D6" className="shrink-0" />
      </button>

      <form ref={formRef} onSubmit={enviar} noValidate className="p-4 mb-4" style={TARJ}>
        <h4 style={{ margin: "0 0 4px", fontWeight: 800, color: "#0B1437" }}>Nueva consulta</h4>
        <label htmlFor="so-tema" style={ETIQUETA}>¿Sobre qué es?</label>
        <select id="so-tema" value={motivo} onChange={(e) => setMotivo(e.target.value)} style={CAMPO}>
          {MOTIVOS.map((m) => <option key={m.id} value={m.id}>{m.titulo}</option>)}
        </select>

        {!usuario && (<>
          <label htmlFor="so-mail" style={ETIQUETA}>Tu correo</label>
          <input id="so-mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} placeholder="nombre@ejemplo.com" style={CAMPO} />
          <p className="text-xs mt-1.5" style={{ color: "#5B6482", lineHeight: 1.45 }}>Te respondemos a este correo. Si tenés cuenta, <button type="button" onClick={() => onLogin()} className="font-semibold underline" style={{ color: "var(--azul)" }}>iniciá sesión</button> y ves la respuesta acá.</p>
        </>)}

        <label htmlFor="so-msg" style={ETIQUETA}>Contanos qué pasa</label>
        <textarea id="so-msg" rows={5} maxLength={2000} value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Cuanto más detalle, más rápido podemos ayudarte." style={{ ...CAMPO, resize: "vertical", minHeight: 110 }} />
        <p className="text-xs mt-1 text-right" style={{ color: mensaje.trim().length > 0 && mensaje.trim().length < 15 ? AMBAR : "#8D95B0" }}>{mensaje.length}/2000</p>

        {error && <p className="text-sm mt-2" role="alert" style={{ color: "#C1443A" }}>{error}</p>}
        {okMsg && <p className="text-sm mt-2 flex items-center gap-1.5 font-semibold" style={{ color: "#1E6B44" }}><Check size={15} /> {okMsg}</p>}
        <button type="submit" disabled={!puedeEnviar} className="w-full text-sm font-bold py-3.5 mt-3 flex items-center justify-center gap-2" style={{ borderRadius: 14, background: "linear-gradient(180deg,var(--azul-g1),var(--azul-g2))", color: "#fff", opacity: puedeEnviar ? 1 : 0.45 }}>
          {enviando ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : <><Send size={16} /> Enviar consulta</>}
        </button>
      </form>

      {(wa || mail) && (
        <div className="flex flex-col gap-2 mb-5">
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3" style={{ borderRadius: 14, background: "var(--azul-suave)", color: "var(--azul)" }}><MessageCircle size={18} /> Escribir por WhatsApp</a>}
          {mail && <a href={mail} className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3" style={{ borderRadius: 14, background: "var(--azul-suave)", color: "var(--azul)" }}><Mail size={18} /> Enviar un correo</a>}
        </div>
      )}

      <div>
        <h4 className="flex items-center gap-2" style={TITULO_GRUPO}>Mis consultas{hayRespuesta && <span className="text-[10px] font-extrabold px-2 py-0.5" style={{ borderRadius: 7, background: "#FDECC4", color: "#8A5600", letterSpacing: ".05em" }}>RESPUESTA NUEVA</span>}</h4>
        {!usuario && (
          <div className="p-5 text-center" style={TARJ}>
            <p className="text-sm mb-3" style={{ color: "#2B3768", lineHeight: 1.5 }}>Iniciá sesión para ver tus consultas y las respuestas del equipo.</p>
            <button onClick={() => onLogin()} className="w-full text-sm font-bold py-3" style={{ borderRadius: 14, background: "linear-gradient(180deg,var(--azul-g1),var(--azul-g2))", color: "#fff" }}>Iniciar sesión</button>
          </div>
        )}
        {usuario && lista === null && !errorLista && <p className="text-sm flex items-center gap-2" style={{ color: "#5B6482" }}><Loader2 size={16} className="animate-spin" /> Cargando...</p>}
        {usuario && errorLista && (
          <div className="p-4 text-sm flex items-center justify-between gap-3" style={{ borderRadius: 14, background: "#FDF1EF", border: "1px solid #F3CFCB", color: "#9A3B34" }}>
            <span>No pudimos cargar tus consultas.</span><button onClick={cargarLista} className="font-bold shrink-0">Reintentar</button>
          </div>
        )}
        {usuario && lista && lista.length === 0 && (
          <div className="text-center px-5 py-7">
            <span className="inline-flex items-center justify-center mb-3" style={{ width: 62, height: 62, borderRadius: 20, background: "linear-gradient(145deg,#F3EDFD,#E6DBFA)", boxShadow: "inset 0 0 0 1px #DCCDF5" }}><MessageCircle size={26} color="#7A4FD0" /></span>
            <strong className="block" style={{ color: "#0B1437" }}>Todavía no escribiste</strong>
            <p className="text-sm mt-1" style={{ color: "#5B6482" }}>Tus consultas y nuestras respuestas aparecen acá.</p>
          </div>
        )}
        {usuario && lista && lista.map((c) => (
          <div key={c.id} className="p-3.5 mb-2.5" style={{ ...TARJ, borderRadius: 16, ...(c.estado === "respondida" ? { borderColor: "var(--azul)", boxShadow: "0 0 0 3px rgba(var(--azul-rgb),.12)" } : null) }}>
            <div className="flex items-center justify-between mb-2"><Pastilla estado={c.estado} /><small className="text-xs" style={{ color: "#8D95B0" }}>{hace(c.creadaEn)}</small></div>
            <p className="text-sm" style={{ color: "#0B1437", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{c.mensaje}</p>
            {c.respuesta ? (
              <div className="mt-3 p-3" style={{ background: "var(--azul-suave)", borderRadius: 12 }}>
                <strong className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "var(--azul)" }}><Sparkles size={14} /> Respuesta del equipo</strong>
                <p className="text-sm" style={{ color: "#0B1437", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.respuesta}</p>
              </div>
            ) : c.estado !== "cerrada" && <small className="block mt-2 text-xs" style={{ color: "#8D95B0" }}>Te avisamos acá y en tus notificaciones cuando respondamos.</small>}
          </div>
        ))}
      </div>

      <p className="text-xs mt-6 px-1" style={{ color: "#5B6482", lineHeight: 1.55 }}>Para problemas de pago, no nos envíes los datos de tu tarjeta ni tu contraseña: nunca los pedimos.</p>
    </div>
  );
}

/* =========================================================
   ACERCA DE MI ZONA  (mismo formato que el de Mi Asistente)
   ========================================================= */

function SeccionesLegal({ secciones }) {
  return (
    <div>
      {secciones.map((s) => (
        <div key={s.t}>
          <h5 className="mt-3.5 mb-1 text-[13.5px] font-bold" style={{ color: "#0B1437" }}>{s.t}</h5>
          {s.p && s.p.map((x, i) => <p key={i} className="text-sm mb-2" style={{ color: "#3A4466", lineHeight: 1.55 }}>{x}</p>)}
          {s.l && <ul className="space-y-1.5 mb-2">{s.l.map((x, i) => <li key={i} className="flex gap-2.5 text-sm" style={{ color: "#3A4466", lineHeight: 1.55 }}><span className="shrink-0" style={{ width: 5, height: 5, borderRadius: "50%", background: "#94A3B8", marginTop: 8 }} /><span>{x}</span></li>)}</ul>}
          {s.p2 && s.p2.map((x, i) => <p key={i} className="text-sm mb-2" style={{ color: "#3A4466", lineHeight: 1.55 }}>{x}</p>)}
        </div>
      ))}
    </div>
  );
}

function FilaInfo({ Icon, color, titulo, desc }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid #EEF0F6" }}>
      <IconoCaja Icon={Icon} color={color} />
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold" style={{ color: "#0B1437", lineHeight: 1.3 }}>{titulo}</span>
        <span className="block text-xs mt-0.5" style={{ color: "#5B6482", lineHeight: 1.4 }}>{desc}</span>
      </span>
    </div>
  );
}

export function AcercaScreen({ onBack, onIrSoporte }) {
  return (
    <div>
      <BotonVolver texto="Volver a Ajustes" onClick={onBack} />
      <div className="flex flex-col items-center text-center pt-2 pb-6 px-2">
        <span className="inline-flex items-center justify-center mb-3" style={{ width: 72, height: 72, borderRadius: 24, background: "linear-gradient(145deg,var(--azul-g1),var(--azul-g2))", boxShadow: "0 12px 28px rgba(var(--azul-rgb),.4)" }}><MapPin size={32} color="#fff" /></span>
        <h2 style={{ ...TITULO, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Mi Zona</h2>
        <span className="text-sm mt-0.5" style={{ color: "#5B6482" }}>Versión {APP_VERSION}</span>
        <p className="text-sm mt-3" style={{ color: "#2B3768", lineHeight: 1.6, maxWidth: 360 }}>Los negocios de tu localidad en un solo lugar: encontralos, mirá sus reseñas y contactalos o chateá con su asistente.</p>
      </div>

      <h4 style={TITULO_GRUPO}>Cómo funciona</h4>
      <div className="overflow-hidden mb-5" style={TARJ}>
        <FilaInfo Icon={Compass} color="#2350F5" titulo="Descubrí lo que hay en tu zona" desc="Elegí tu localidad y buscá por nombre, rubro o en el mapa." />
        <FilaInfo Icon={Star} color="#C98A00" titulo="Reseñas de gente de tu zona" desc="Mirá opiniones, horarios y cómo llegar antes de ir." />
        <FilaInfo Icon={MessageCircle} color="#7A4FD0" titulo="Chateá con el negocio" desc="Consultá por WhatsApp o con el asistente de cada negocio." />
        <FilaInfo Icon={Bell} color="#E0731E" titulo="Te avisamos lo importante" desc="Pedidos, turnos, puntos y novedades, en la app y en el celular." />
      </div>

      <h4 style={TITULO_GRUPO}>Legal</h4>
      <Acordeon titulo="Términos de uso" sub={`Actualizado: ${LEGAL_ACTUALIZADO}`}><SeccionesLegal secciones={TERMINOS} /></Acordeon>
      <Acordeon titulo="Política de privacidad" sub={`Actualizado: ${LEGAL_ACTUALIZADO}`}><SeccionesLegal secciones={PRIVACIDAD_TEXTO} /></Acordeon>
      <Acordeon titulo="Licencias" sub="Proyectos de código abierto que usa Mi Zona">
        {LICENCIAS.map((l, i) => (
          <div key={l.nombre} className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: i === LICENCIAS.length - 1 ? "none" : "1px solid #EEF0F6" }}>
            <span className="text-sm font-semibold" style={{ color: "#0B1437" }}>{l.nombre}</span>
            <span className="text-xs text-right shrink-0" style={{ color: "#5B6482" }}>{l.licencia}</span>
          </div>
        ))}
      </Acordeon>

      <p className="text-xs text-center mt-6 mb-2" style={{ color: "#5B6482" }}>Hecho con cariño para la gente y los negocios de tu zona.</p>
    </div>
  );
}
