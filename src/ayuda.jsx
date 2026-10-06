// Ajustes → Acerca de Mi Zona, Centro de ayuda y Soporte.
import { useEffect, useMemo, useState } from "react";
import {
  Search, ChevronRight, Check, Loader2, Mail, Send, Info, FileText, ShieldCheck, Code, Share2, Inbox, LifeBuoy, MessageCircle,
  Compass, User, Store, CreditCard, Star, Lock, Wrench, ThumbsUp, ThumbsDown, BookOpen, Clock, X,
} from "lucide-react";
import { tonoDe } from "./tonos";
import { BotonVolver, FilaMenu, Etiqueta, TARJETA_SEG, VERDE, AMBAR } from "./cuenta.jsx";
import { soporteApi, SOPORTE_EMAIL, SOPORTE_WHATSAPP, APP_VERSION } from "./api.js";
import { CATEGORIAS, ARTICULOS, POPULARES, articuloPorId, categoriaPorId, buscarArticulos, sugeridosPara } from "./ayudaContenido.js";
import { TERMINOS, PRIVACIDAD_TEXTO, LICENCIAS, LEGAL_ACTUALIZADO } from "./legal.js";

const TITULO = { fontFamily: "var(--fuente-titulo)", fontWeight: 600, color: "#0B1437" };
const TARJ = { borderRadius: 20, border: "1px solid #E3E7F1", background: "#fff", boxShadow: "0 1px 2px rgba(11,20,55,.04)" };
const ICONOS = { Compass, User, Store, CreditCard, MessageCircle, Star, Lock, Wrench };

function Cabecera({ titulo, sub, volver, onBack }) {
  return (
    <>
      <BotonVolver texto={volver} onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{titulo}</h2>
      {sub ? <p className="text-sm mt-1.5 mb-5" style={{ color: "#5B6482", lineHeight: 1.5 }}>{sub}</p> : <div className="mb-5" />}
    </>
  );
}

// Fila simple de lista (artículo, consulta...) con flecha
function FilaLista({ titulo, desc, derecha, onClick, ultimo, Icon, color, colorIcono }) {
  const t = tonoDe(Icon);
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 active:bg-slate-100" style={{ borderBottom: ultimo ? "none" : "1px solid #EEF0F6" }}>
      {Icon && <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: color || t.bg, boxShadow: `inset 0 0 0 1px ${t.aro}` }}><Icon size={18} color={colorIcono || t.fg} /></span>}
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold" style={{ color: "#0B1437", lineHeight: 1.3 }}>{titulo}</span>
        {desc && <span className="block text-xs mt-0.5" style={{ color: "#5B6482", lineHeight: 1.4 }}>{desc}</span>}
      </span>
      {derecha}
      <ChevronRight size={18} color="#B9C0D6" className="shrink-0" />
    </button>
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
                <span className="flex items-center justify-center shrink-0 text-xs font-bold" style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(180deg,#2A58FF,#1F47E0)", color: "#fff", marginTop: 0, boxShadow: "0 4px 10px -3px rgba(35,80,245,.6)" }}>{j + 1}</span>
                <span className="text-[15px]" style={{ color: "#1F2937", lineHeight: 1.6 }}>{p}</span>
              </li>
            ))}
          </ol>
        );
        if (b.nota) return (
          <div key={i} className="flex gap-2.5 p-3.5" style={{ borderRadius: 14, background: "#F3F7FF", border: "1px solid #D6E3FB", borderLeft: "4px solid #2350F5" }}>
            <Info size={17} color="#2350F5" className="shrink-0" style={{ marginTop: 2 }} />
            <p className="text-sm" style={{ color: "#2B3768", lineHeight: 1.55 }}>{b.nota}</p>
          </div>
        );
        return null;
      })}
    </div>
  );
}

function VistaArticulo({ art, onAbrir, onContactar }) {
  const cat = categoriaPorId(art.cat);
  const [voto, setVoto] = useState(null); // null | "si" | "no"
  useEffect(() => { setVoto(null); window.scrollTo(0, 0); }, [art.id]);
  const rel = (art.relacionados || []).map(articuloPorId).filter(Boolean);
  const motivo = art.contactar || cat?.motivo || "otro";
  return (
    <div>
      <span className="inline-block text-[11px] font-semibold px-2 py-0.5 mb-2" style={{ borderRadius: 999, background: "#EDF1FF", color: "#2350F5", letterSpacing: ".02em" }}>{cat?.titulo}</span>
      <h2 style={{ ...TITULO, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }} className="mb-4">{art.titulo}</h2>
      <CuerpoArticulo cuerpo={art.cuerpo} />

      <div className="mt-6 p-4" style={TARJ}>
        {voto === null && (
          <>
            <p className="text-sm font-semibold mb-3" style={{ color: "#0B1437" }}>¿Te sirvió este artículo?</p>
            <div className="flex gap-2">
              <button onClick={() => setVoto("si")} className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5" style={{ borderRadius: 12, border: "1px solid #D3DDEE", background: "#F8FAFE", color: "#0B1437" }}><ThumbsUp size={16} /> Sí</button>
              <button onClick={() => setVoto("no")} className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5" style={{ borderRadius: 12, border: "1px solid #D3DDEE", background: "#F8FAFE", color: "#0B1437" }}><ThumbsDown size={16} /> No</button>
            </div>
          </>
        )}
        {voto === "si" && <p className="text-sm flex items-center gap-2 font-medium" style={{ color: "#1E6B44", animation: "zona-aparecer .28s cubic-bezier(0.22,1,0.36,1) both" }}><Check size={16} /> Gracias por avisarnos.</p>}
        {voto === "no" && (
          <>
            <p className="text-sm mb-3" style={{ color: "#2B3768", lineHeight: 1.5 }}>Lamentamos que no te haya servido. Contanos qué pasa y te ayudamos directamente.</p>
            <button onClick={() => onContactar(motivo)} className="w-full text-sm font-bold py-3 flex items-center justify-center gap-2" style={{ borderRadius: 12, background: "#0B1437", color: "#fff" }}><Send size={16} /> Escribir a Soporte</button>
          </>
        )}
      </div>

      {rel.length > 0 && (
        <>
          <Etiqueta>Te puede interesar</Etiqueta>
          <div className="overflow-hidden" style={TARJ}>
            {rel.map((r, i) => <FilaLista key={r.id} titulo={r.titulo} onClick={() => onAbrir(r.id)} ultimo={i === rel.length - 1} />)}
          </div>
        </>
      )}
    </div>
  );
}

export function AyudaScreen({ articuloInicial, onBack, onContactar }) {
  const [pila, setPila] = useState(() => (articuloInicial && articuloPorId(articuloInicial) ? [{ v: "art", id: articuloInicial }] : [{ v: "home" }]));
  const [q, setQ] = useState("");
  const actual = pila[pila.length - 1];
  const ir = (e) => { setPila((p) => [...p, e]); window.scrollTo(0, 0); };
  const atras = () => (pila.length > 1 ? setPila((p) => p.slice(0, -1)) : onBack());
  const resultados = useMemo(() => buscarArticulos(q), [q]);

  const volverTexto = pila.length > 1 ? "Volver al Centro de ayuda" : "Volver a Ajustes";

  if (actual.v === "art") {
    const art = articuloPorId(actual.id);
    return (
      <div>
        <BotonVolver texto={volverTexto} onClick={atras} />
        {art && <VistaArticulo art={art} onAbrir={(id) => ir({ v: "art", id })} onContactar={onContactar} />}
      </div>
    );
  }

  if (actual.v === "cat") {
    const cat = categoriaPorId(actual.id);
    const lista = ARTICULOS.filter((a) => a.cat === cat.id);
    return (
      <div>
        <Cabecera titulo={cat.titulo} sub={cat.desc} volver={volverTexto} onBack={atras} />
        <div className="overflow-hidden" style={TARJ}>
          {lista.map((a, i) => <FilaLista key={a.id} titulo={a.titulo} onClick={() => ir({ v: "art", id: a.id })} ultimo={i === lista.length - 1} />)}
        </div>
      </div>
    );
  }

  const buscando = q.trim().length > 0;
  return (
    <div>
      <Cabecera titulo="Centro de ayuda" sub="Respuestas a las dudas más comunes sobre Mi Zona." volver={volverTexto} onBack={atras} />

      <div className="relative mb-1">
        <Search size={18} color="#64748B" className="absolute" style={{ left: 14, top: 14 }} />
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscá una respuesta" maxLength={80} aria-label="Buscar en el Centro de ayuda"
          className="w-full text-sm py-3" style={{ paddingLeft: 42, paddingRight: 40, borderRadius: 14, border: "1px solid #DCE5F2", background: "#fff", outline: "none" }}
        />
        {buscando && <button onClick={() => setQ("")} aria-label="Borrar búsqueda" className="absolute" style={{ right: 12, top: 12 }}><X size={18} color="#64748B" /></button>}
      </div>

      {buscando ? (
        <>
          <Etiqueta>{resultados.length ? `${resultados.length} ${resultados.length === 1 ? "resultado" : "resultados"}` : "Sin resultados"}</Etiqueta>
          {resultados.length > 0 ? (
            <div className="overflow-hidden" style={TARJ}>
              {resultados.slice(0, 12).map((a, i, arr) => <FilaLista key={a.id} titulo={a.titulo} desc={categoriaPorId(a.cat)?.titulo} onClick={() => ir({ v: "art", id: a.id })} ultimo={i === arr.length - 1} />)}
            </div>
          ) : (
            <div className="px-4 py-6 text-center" style={TARJ}>
              <p className="text-sm mb-1" style={{ color: "#0B1437", fontWeight: 600 }}>No encontramos nada para “{q.trim()}”</p>
              <p className="text-sm" style={{ color: "#5B6482", lineHeight: 1.5 }}>Probá con otras palabras o escribinos y lo vemos juntos.</p>
            </div>
          )}
        </>
      ) : (
        <>
          <Etiqueta>Preguntas frecuentes</Etiqueta>
          <div className="overflow-hidden" style={TARJ}>
            {POPULARES.map(articuloPorId).filter(Boolean).map((a, i, arr) => <FilaLista key={a.id} titulo={a.titulo} onClick={() => ir({ v: "art", id: a.id })} ultimo={i === arr.length - 1} />)}
          </div>

          <Etiqueta>Explorar por tema</Etiqueta>
          <div className="overflow-hidden" style={TARJ}>
            {CATEGORIAS.map((c, i) => (
              <FilaMenu key={c.id} Icon={ICONOS[c.icono] || BookOpen} color={c.color} titulo={c.titulo} desc={c.desc} onClick={() => ir({ v: "cat", id: c.id })} ultimo={i === CATEGORIAS.length - 1} />
            ))}
          </div>
        </>
      )}

      <div className="mt-6 p-4 flex items-center gap-3.5" style={TARJ}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(180deg,#EEF4FF,#E0EBFD)", boxShadow: "inset 0 0 0 1px #D3E1FA" }}><LifeBuoy size={20} color="#2350F5" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold" style={{ color: "#0B1437" }}>¿No encontraste lo que buscabas?</span>
          <span className="block text-xs mt-0.5" style={{ color: "#5B6482" }}>Escribinos y te respondemos.</span>
        </span>
        <button onClick={() => onContactar(null)} className="shrink-0 text-sm font-bold px-4 py-2.5" style={{ borderRadius: 12, background: "#0B1437", color: "#fff" }}>Contactar</button>
      </div>
    </div>
  );
}

/* =========================================================
   SOPORTE
   ========================================================= */

const MOTIVOS = [
  { id: "cuenta", titulo: "Mi cuenta y acceso", desc: "No puedo entrar, mi nombre, mi contraseña" },
  { id: "negocio", titulo: "Mi negocio", desc: "Registrarlo, editarlo, fotos o mapa" },
  { id: "pagos", titulo: "Pagos y suscripción", desc: "Un pago, un vencimiento o un plan" },
  { id: "asistente", titulo: "Chats y Mi Asistente", desc: "Chats, puntos o el asistente de un negocio" },
  { id: "resenas", titulo: "Reseñas", desc: "Una reseña que escribí o que recibí" },
  { id: "error", titulo: "Algo no funciona", desc: "Un error o algo que se ve mal" },
  { id: "sugerencia", titulo: "Sugerencia", desc: "Una idea para mejorar Mi Zona" },
  { id: "otro", titulo: "Otro tema", desc: "Cualquier otra consulta" },
];
const NOMBRE_MOTIVO = Object.fromEntries(MOTIVOS.map((m) => [m.id, m.titulo]));

const ESTADO = {
  abierta: { texto: "En revisión", fondo: "#FFF1D6", color: AMBAR },
  respondida: { texto: "Respondida", fondo: "#E4F3EA", color: VERDE },
  cerrada: { texto: "Resuelta", fondo: "#EEF0F6", color: "#5B6482" },
};
function Chip({ estado }) {
  const e = ESTADO[estado] || ESTADO.abierta;
  return <span className="text-[11px] font-bold px-2.5 py-0.5 shrink-0" style={{ borderRadius: 999, background: e.fondo, color: e.color }}>{e.texto}</span>;
}

// Datos que ayudan a reproducir un problema. Se muestran antes de enviar.
function datosTecnicos() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Otro navegador";
  const so = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Otro sistema";
  return `Mi Zona ${APP_VERSION} · ${nav} en ${so}`;
}

export function SoporteScreen({ usuario, temaInicial, directo, textoVolver, onBack, onLogin, onIrAyuda }) {
  const [vista, setVista] = useState(directo ? "nueva" : "inicio"); // inicio | nueva | enviada | mias | detalle
  const [artAbierto, setArtAbierto] = useState(null); // artículo del Centro de ayuda abierto sin salir de la consulta
  const [motivo, setMotivo] = useState(temaInicial || null);
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [enviada, setEnviada] = useState(null);
  const [lista, setLista] = useState(null);
  const [errorLista, setErrorLista] = useState(false);
  const [detalleId, setDetalleId] = useState(null);

  const cargarLista = () => {
    if (!usuario) { setLista([]); return; }
    setErrorLista(false);
    soporteApi.mias().then(setLista).catch(() => setErrorLista(true));
  };
  useEffect(cargarLista, [usuario?.id]);
  useEffect(() => { window.scrollTo(0, 0); }, [vista]);

  const volverInicio = () => setVista("inicio");
  const tecnico = useMemo(datosTecnicos, []);
  const sugeridos = motivo ? sugeridosPara(motivo) : [];
  const correoOk = usuario || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const puedeEnviar = motivo && asunto.trim().length >= 3 && mensaje.trim().length >= 15 && correoOk && !enviando;

  const enviar = async () => {
    setEnviando(true); setError(null);
    try {
      const c = await soporteApi.enviar({ motivo, asunto: asunto.trim(), mensaje: mensaje.trim(), email: usuario ? undefined : email.trim(), tecnico });
      setEnviada(c); setAsunto(""); setMensaje(""); setVista("enviada"); cargarLista();
    } catch (e) { setError(e.message || "No pudimos enviar tu consulta. Probá de nuevo."); }
    finally { setEnviando(false); }
  };

  /* ----- Artículo sugerido (se abre acá para no perder lo escrito) ----- */
  if (artAbierto && articuloPorId(artAbierto)) {
    return (
      <div>
        <BotonVolver texto="Volver a la consulta" onClick={() => setArtAbierto(null)} />
        <VistaArticulo art={articuloPorId(artAbierto)} onAbrir={setArtAbierto} onContactar={(m) => { setMotivo(m || motivo); setArtAbierto(null); }} />
      </div>
    );
  }

  /* ----- Nueva consulta ----- */
  if (vista === "nueva") {
    return (
      <div>
        <Cabecera titulo="Nueva consulta" sub={motivo ? null : "Elegí el tema para ayudarte más rápido."} volver="Volver a Soporte" onBack={volverInicio} />

        <Etiqueta>Tema</Etiqueta>
        <div className="overflow-hidden" style={TARJ}>
          {MOTIVOS.map((m, i) => {
            const activo = motivo === m.id;
            return (
              <button key={m.id} onClick={() => setMotivo(m.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left" style={{ borderBottom: i === MOTIVOS.length - 1 ? "none" : "1px solid #EEF0F6", background: activo ? "#F3F7FF" : "#fff", boxShadow: activo ? "inset 3px 0 0 #2350F5" : "none" }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${activo ? "#2350F5" : "#C3CCDC"}`, transition: "border-color .2s" }}>{activo && <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#2350F5" }} />}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: "#0B1437" }}>{m.titulo}</span>
                  <span className="block text-xs mt-0.5" style={{ color: "#5B6482" }}>{m.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        {motivo && sugeridos.length > 0 && (
          <>
            <Etiqueta>Antes de escribir, mirá esto</Etiqueta>
            <div className="overflow-hidden" style={TARJ}>
              {sugeridos.map((a, i) => <FilaLista key={a.id} Icon={BookOpen} titulo={a.titulo} onClick={() => setArtAbierto(a.id)} ultimo={i === sugeridos.length - 1} />)}
            </div>
          </>
        )}

        {motivo && (
          <>
            <Etiqueta>Tu consulta</Etiqueta>
            <div className="p-4" style={TARJ}>
              {!usuario && (
                <>
                  <label className="text-[13px] font-semibold block mb-1.5" style={{ color: "#2B3768" }}>Tu correo</label>
                  <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} placeholder="nombre@ejemplo.com"
                    className="w-full border px-3 py-2.5 text-sm mb-1" style={{ borderRadius: 12, borderColor: "#E3E7F1" }} />
                  <p className="text-xs mb-3" style={{ color: "#5B6482", lineHeight: 1.45 }}>Te respondemos a este correo. Si tenés cuenta, <button onClick={() => onLogin()} className="font-semibold underline" style={{ color: "#2350F5" }}>iniciá sesión</button> y ves la respuesta acá.</p>
                </>
              )}
              {usuario && <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: "#5B6482" }}><Mail size={13} /> Respondemos en tu cuenta: <b className="truncate" style={{ color: "#0B1437" }}>{usuario.email}</b></p>}

              <label className="text-[13px] font-semibold block mb-1.5" style={{ color: "#2B3768" }}>Asunto</label>
              <input value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={120} placeholder="Resumen en pocas palabras"
                className="w-full border px-3 py-2.5 text-sm mb-3" style={{ borderRadius: 12, borderColor: "#E3E7F1" }} />

              <label className="text-[13px] font-semibold block mb-1.5" style={{ color: "#2B3768" }}>Mensaje</label>
              <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} maxLength={2000} rows={6}
                placeholder={motivo === "error" ? "¿Qué estabas haciendo? ¿Qué esperabas que pasara y qué pasó?" : motivo === "pagos" ? "Contanos la fecha del pago y qué ves en la app. No envíes datos de tu tarjeta." : "Contanos con el mayor detalle posible."}
                className="w-full border px-3 py-2.5 text-sm" style={{ borderRadius: 12, borderColor: "#E3E7F1", resize: "vertical" }} />
              <p className="text-xs mt-1 text-right" style={{ color: mensaje.trim().length > 0 && mensaje.trim().length < 15 ? AMBAR : "#6B7280" }}>{mensaje.length}/2000</p>

              <p className="text-xs mt-2 mb-4 flex gap-1.5" style={{ color: "#5B6482", lineHeight: 1.45 }}><Info size={13} className="shrink-0" style={{ marginTop: 2 }} /> Se adjunta: {tecnico}. Sirve para encontrar el problema; no incluye tus datos personales.</p>

              {error && <p className="text-sm mb-3" style={{ color: "#C1443A" }}>{error}</p>}
              <button onClick={enviar} disabled={!puedeEnviar} className="w-full text-sm font-bold py-3.5 flex items-center justify-center gap-2" style={{ borderRadius: 14, background: "#0B1437", color: "#fff", opacity: puedeEnviar ? 1 : 0.45 }}>
                {enviando ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : <><Send size={16} /> Enviar consulta</>}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ----- Confirmación ----- */
  if (vista === "enviada" && enviada) {
    return (
      <div>
        <BotonVolver texto="Volver a Soporte" onClick={volverInicio} />
        <div className="p-6 text-center" style={TARJ}>
          <span className="flex items-center justify-center mx-auto mb-4" style={{ width: 60, height: 60, borderRadius: "50%", background: VERDE, boxShadow: "0 0 0 8px #E4F3EA, 0 12px 24px -8px rgba(30,138,85,.55)", animation: "zona-rebote .5s cubic-bezier(0.22,1,0.36,1) both" }}><Check size={30} color="#fff" strokeWidth={3} /></span>
          <h2 style={{ ...TITULO, fontSize: 20, fontWeight: 800 }} className="mb-1.5">Recibimos tu consulta</h2>
          <p className="text-sm mb-4" style={{ color: "#5B6482" }}>Número de consulta <b style={{ color: "#0B1437" }}>{enviada.codigo}</b></p>
          <p className="text-sm" style={{ color: "#2B3768", lineHeight: 1.6 }}>
            {usuario
              ? "Vas a ver la respuesta en Mis consultas. Si tenés las notificaciones activadas, te avisamos cuando respondamos."
              : "Te vamos a responder por correo a la dirección que nos dejaste. Revisá también la carpeta de spam."}
          </p>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={volverInicio} className="flex-1 text-sm font-bold py-3" style={{ borderRadius: 14, border: "1.5px solid #0B1437", color: "#0B1437" }}>Listo</button>
          {usuario && <button onClick={() => { setDetalleId(enviada.id); setVista("detalle"); }} className="flex-1 text-sm font-bold py-3" style={{ borderRadius: 14, background: "#0B1437", color: "#fff" }}>Ver mi consulta</button>}
        </div>
      </div>
    );
  }

  /* ----- Mis consultas ----- */
  if (vista === "mias") {
    return (
      <div>
        <Cabecera titulo="Mis consultas" sub="Lo que le escribiste al equipo y sus respuestas." volver="Volver a Soporte" onBack={volverInicio} />
        {!usuario && (
          <div className="p-5 text-center" style={TARJ}>
            <p className="text-sm mb-3" style={{ color: "#2B3768", lineHeight: 1.5 }}>Iniciá sesión para ver tus consultas y las respuestas del equipo.</p>
            <button onClick={() => onLogin()} className="w-full text-sm font-bold py-3" style={{ borderRadius: 14, background: "#0B1437", color: "#fff" }}>Iniciar sesión</button>
          </div>
        )}
        {usuario && lista === null && !errorLista && <p className="text-sm flex items-center gap-2" style={{ color: "#5B6482" }}><Loader2 size={16} className="animate-spin" /> Cargando...</p>}
        {usuario && errorLista && (
          <div className="p-4 text-sm flex items-center justify-between gap-3" style={{ borderRadius: 14, background: "#FDF1EF", border: "1px solid #F3CFCB", color: "#9A3B34" }}>
            <span>No pudimos cargar tus consultas.</span><button onClick={cargarLista} className="font-bold shrink-0">Reintentar</button>
          </div>
        )}
        {usuario && lista && lista.length === 0 && (
          <div className="px-4 py-8 text-center" style={TARJ}>
            <span className="flex items-center justify-center mx-auto mb-3" style={{ width: 56, height: 56, borderRadius: 18, background: "#F1F4FA", boxShadow: "inset 0 0 0 1px #E3E7F1" }}><Inbox size={26} color="#8D95B0" /></span>
            <p className="text-sm mb-0.5" style={{ color: "#0B1437", fontWeight: 600 }}>Sin consultas todavía</p>
            <p className="text-sm" style={{ color: "#5B6482", lineHeight: 1.5 }}>Cuando escribas al equipo, vas a verlas acá.</p>
          </div>
        )}
        {usuario && lista && lista.length > 0 && (
          <div className="overflow-hidden" style={TARJ}>
            {lista.map((c, i) => (
              <FilaLista key={c.id} titulo={c.asunto} desc={`${c.codigo} · ${fmtFecha(c.creadaEn)}`} derecha={<Chip estado={c.estado} />} onClick={() => { setDetalleId(c.id); setVista("detalle"); }} ultimo={i === lista.length - 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ----- Detalle de una consulta ----- */
  if (vista === "detalle") {
    const c = (lista || []).find((x) => x.id === detalleId) || (enviada && enviada.id === detalleId ? enviada : null);
    if (!c) return <div><BotonVolver texto="Volver a Soporte" onClick={volverInicio} /><p className="text-sm" style={{ color: "#5B6482" }}>No encontramos esa consulta.</p></div>;
    const cerrar = async () => { try { await soporteApi.cerrar(c.id); cargarLista(); } catch { /* se puede reintentar */ } };
    return (
      <div>
        <BotonVolver texto="Volver a Mis consultas" onClick={() => setVista("mias")} />
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 style={{ ...TITULO, fontSize: 20, fontWeight: 800, lineHeight: 1.25 }}>{c.asunto}</h2>
          <Chip estado={c.estado} />
        </div>
        <p className="text-xs mb-5" style={{ color: "#5B6482" }}>{c.codigo} · {NOMBRE_MOTIVO[c.motivo]} · {fmtFechaHora(c.creadaEn)}</p>

        <div className="p-4 mb-3" style={{ borderRadius: "18px 18px 18px 6px", background: "#F3F5FA", border: "1px solid #E3E7F1" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "#5B6482" }}>Tu mensaje</p>
          <p className="text-sm" style={{ color: "#1F2937", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.mensaje}</p>
        </div>
        {c.respuesta ? (
          <div className="p-4 mb-4" style={{ borderRadius: "18px 18px 6px 18px", background: "#EDF1FF", border: "1px solid #CFE0FB" }}>
            <p className="text-xs font-bold mb-1" style={{ color: "#2350F5" }}>Respuesta del equipo de Mi Zona · {fmtFechaHora(c.respondidaEn)}</p>
            <p className="text-sm" style={{ color: "#0B1437", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.respuesta}</p>
          </div>
        ) : (
          c.estado !== "cerrada" && <p className="text-sm mb-4 flex items-center gap-2" style={{ color: "#5B6482" }}><Clock size={15} /> Todavía no respondimos. Te avisamos cuando lo hagamos.</p>
        )}
        {c.estado !== "cerrada" && (
          <button onClick={cerrar} className="w-full text-sm font-bold py-3 mb-2" style={{ borderRadius: 14, border: "1.5px solid #0B1437", color: "#0B1437" }}>Marcar como resuelta</button>
        )}
        {c.estado === "respondida" && (
          <button onClick={() => { setMotivo(c.motivo); setAsunto(`Re: ${c.asunto}`.slice(0, 120)); setVista("nueva"); }} className="w-full text-sm font-semibold py-3" style={{ color: "#2350F5" }}>Sigo con el problema: escribir de nuevo</button>
        )}
      </div>
    );
  }

  /* ----- Inicio de Soporte ----- */
  const abiertas = (lista || []).filter((c) => c.estado !== "cerrada").length;
  const conRespuesta = (lista || []).filter((c) => c.estado === "respondida").length;
  const wa = SOPORTE_WHATSAPP ? `https://wa.me/${SOPORTE_WHATSAPP}?text=${encodeURIComponent("Hola, tengo una consulta sobre Mi Zona.")}` : null;
  const mail = SOPORTE_EMAIL ? `mailto:${SOPORTE_EMAIL}?subject=${encodeURIComponent("Consulta sobre Mi Zona")}` : null;
  return (
    <div>
      <Cabecera titulo="Soporte" sub="Contanos qué necesitás y te respondemos desde acá." volver={textoVolver || "Volver a Ajustes"} onBack={onBack} />

      <div className="overflow-hidden" style={TARJ}>
        <FilaMenu Icon={Send} color="#0B1437" titulo="Enviar una consulta" desc="Escribile al equipo de Mi Zona" onClick={() => { setMotivo(null); setVista("nueva"); }} />
        <FilaMenu Icon={Inbox} color="#2350F5" titulo="Mis consultas" desc={usuario ? (conRespuesta ? `${conRespuesta} ${conRespuesta === 1 ? "con respuesta nueva" : "con respuesta"}` : abiertas ? `${abiertas} en revisión` : "Tus mensajes y respuestas") : "Iniciá sesión para verlas"} valor={usuario && lista && lista.length ? String(lista.length) : null} tonoValor="#5B6482" onClick={() => setVista("mias")} />
        <FilaMenu Icon={BookOpen} color="#1E8A55" titulo="Centro de ayuda" desc="Respuestas a las dudas más comunes" onClick={onIrAyuda} ultimo />
      </div>

      {(wa || mail) && (
        <>
          <Etiqueta>Otras formas de contacto</Etiqueta>
          <div className="overflow-hidden" style={TARJ}>
            {wa && <FilaMenu Icon={MessageCircle} color="#1E8A55" titulo="WhatsApp" desc="Escribinos por mensaje" onClick={() => window.open(wa, "_blank", "noopener,noreferrer")} ultimo={!mail} />}
            {mail && <FilaMenu Icon={Mail} color="#C77A0A" titulo="Correo" desc={SOPORTE_EMAIL} onClick={() => { window.location.href = mail; }} ultimo />}
          </div>
        </>
      )}

      <p className="text-xs mt-6 px-1" style={{ color: "#5B6482", lineHeight: 1.55 }}>Para problemas de pago, no nos envíes los datos de tu tarjeta ni tu contraseña: nunca los pedimos.</p>
    </div>
  );
}

/* =========================================================
   ACERCA DE MI ZONA
   ========================================================= */

function TextoLegal({ titulo, secciones, volver, onBack }) {
  return (
    <div>
      <Cabecera titulo={titulo} sub={`Última actualización: ${LEGAL_ACTUALIZADO}`} volver={volver} onBack={onBack} />
      <div className="p-5 space-y-5" style={{ ...TARJ, maxWidth: 720 }}>
        {secciones.map((s, k) => (
          <section key={s.t} style={k ? { borderTop: "1px solid #EEF0F6", paddingTop: 20 } : null}>
            <h3 style={{ ...TITULO, fontSize: 15, fontWeight: 700 }} className="mb-1.5">{s.t}</h3>
            {s.p.map((x, i) => <p key={i} className="text-sm mb-2" style={{ color: "#2B3768", lineHeight: 1.65 }}>{x}</p>)}
            {s.l && (
              <ul className="space-y-1.5 mb-2">
                {s.l.map((x, i) => (
                  <li key={i} className="flex gap-2.5 text-sm" style={{ color: "#2B3768", lineHeight: 1.6 }}><span className="shrink-0" style={{ width: 5, height: 5, borderRadius: "50%", background: "#94A3B8", marginTop: 9 }} /><span>{x}</span></li>
                ))}
              </ul>
            )}
            {s.p2 && s.p2.map((x, i) => <p key={i} className="text-sm mb-2" style={{ color: "#2B3768", lineHeight: 1.65 }}>{x}</p>)}
          </section>
        ))}
      </div>
    </div>
  );
}

function PasosBloque({ titulo, pasos }) {
  return (
    <div className="p-4 mb-3" style={TARJ}>
      <h3 style={{ ...TITULO, fontSize: 15, fontWeight: 700 }} className="mb-3">{titulo}</h3>
      <ol className="space-y-2.5">
        {pasos.map((p, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="flex items-center justify-center shrink-0 text-xs font-bold" style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(180deg,#2A58FF,#1F47E0)", color: "#fff", marginTop: 0, boxShadow: "0 4px 10px -3px rgba(35,80,245,.6)" }}>{i + 1}</span>
            <span className="text-sm" style={{ color: "#1F2937", lineHeight: 1.6 }}>{p}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AcercaScreen({ onBack, onIrSoporte }) {
  const [vista, setVista] = useState(null); // null | "como" | "terminos" | "privacidad" | "licencias"
  const [aviso, setAviso] = useState(null);
  const atras = () => setVista(null);

  const compartir = async () => {
    const url = window.location.origin;
    if (navigator.share) { try { await navigator.share({ title: "Mi Zona", text: "Encontrá los negocios de tu zona en Mi Zona", url }); } catch { /* cerró el menú de compartir */ } return; }
    try { await navigator.clipboard.writeText(url); setAviso("Enlace copiado"); setTimeout(() => setAviso(null), 2500); } catch { setAviso("No se pudo copiar el enlace"); }
  };

  if (vista === "terminos") return <TextoLegal titulo="Términos y condiciones" secciones={TERMINOS} volver="Volver a Acerca de Mi Zona" onBack={atras} />;
  if (vista === "privacidad") return <TextoLegal titulo="Política de privacidad" secciones={PRIVACIDAD_TEXTO} volver="Volver a Acerca de Mi Zona" onBack={atras} />;
  if (vista === "como") {
    return (
      <div>
        <Cabecera titulo="Cómo funciona" sub="Mi Zona conecta a los clientes con los negocios de su localidad." volver="Volver a Acerca de Mi Zona" onBack={atras} />
        <PasosBloque titulo="Si buscás un negocio" pasos={["Elegí tu zona y buscá por nombre o categoría.", "Abrí la ficha para ver fotos, horarios, reseñas y cómo llegar.", "Contactalo por WhatsApp, llamá, o chateá con su asistente si lo tiene."]} />
        <PasosBloque titulo="Si tenés un negocio" pasos={["Creá tu cuenta y tocá “+” para cargar tu negocio.", "Elegí un plan de 1, 3 o 6 meses y pagá con Mercado Pago.", "Tu negocio se publica al confirmarse el pago y lo administrás desde Herramientas."]} />
      </div>
    );
  }
  if (vista === "licencias") {
    return (
      <div>
        <Cabecera titulo="Licencias" sub="Mi Zona usa estos proyectos de código abierto y datos abiertos." volver="Volver a Acerca de Mi Zona" onBack={atras} />
        <div className="overflow-hidden" style={TARJ}>
          {LICENCIAS.map((l, i) => (
            <div key={l.nombre} className="flex items-center justify-between gap-3 px-4 py-3.5" style={{ borderBottom: i === LICENCIAS.length - 1 ? "none" : "1px solid #EEF0F6" }}>
              <span className="text-sm font-semibold" style={{ color: "#0B1437" }}>{l.nombre}</span>
              <span className="text-xs text-right shrink-0" style={{ color: "#5B6482" }}>{l.licencia}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <BotonVolver texto="Volver a Ajustes" onClick={onBack} />
      <div className="flex flex-col items-center text-center pt-2 pb-6">
        <img src="/icono-192.png" alt="" width={76} height={76} style={{ borderRadius: 22, boxShadow: "0 0 0 1px rgba(11,20,55,.08), 0 14px 28px -10px rgba(11,20,55,.45)" }} />
        <h2 style={{ ...TITULO, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }} className="mt-4">Mi Zona</h2>
        <p className="text-sm mt-1" style={{ color: "#5B6482" }}>Versión {APP_VERSION}</p>
        <p className="text-sm mt-3 px-4" style={{ color: "#2B3768", lineHeight: 1.6 }}>Los negocios de tu localidad, en un solo lugar.</p>
      </div>

      <div className="overflow-hidden" style={TARJ}>
        <FilaMenu Icon={Info} color="#2350F5" titulo="Cómo funciona" onClick={() => setVista("como")} />
        <FilaMenu Icon={FileText} color="#0B1437" titulo="Términos y condiciones" onClick={() => setVista("terminos")} />
        <FilaMenu Icon={ShieldCheck} color="#1E8A55" titulo="Política de privacidad" onClick={() => setVista("privacidad")} />
        <FilaMenu Icon={Code} color="#5B6482" titulo="Licencias" onClick={() => setVista("licencias")} ultimo />
      </div>

      <div className="overflow-hidden mt-4" style={TARJ}>
        <FilaMenu Icon={Share2} color="#7A4F9E" titulo="Compartir Mi Zona" desc={aviso || "Enviá el enlace a tus contactos"} onClick={compartir} />
        <FilaMenu Icon={Send} color="#C77A0A" titulo="Escribirnos" desc="Consultas, ideas o problemas" onClick={onIrSoporte} ultimo />
      </div>

      <p className="text-xs text-center mt-8 mb-2" style={{ color: "#5B6482" }}>© {new Date().getFullYear()} Mi Zona</p>
    </div>
  );
}
