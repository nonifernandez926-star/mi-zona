// Chat con un negocio y lista de chats.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useEffect, useMemo, useState } from "react";
import { Check, CheckCheck, ChevronDown, MessageCircle, Plus, Search, Send, UserPlus, Users } from "lucide-react";
import { API_URL, userHeaders } from "../api.js";
import ReportarRespuestaIA from "../componentes/ReportarRespuestaIA.jsx";
import { BotonAtras } from "../cuenta.jsx";
import { Hoja } from "../oficios.jsx";
import { getAllConversationIds, getConversation, getLastSeen, saveConversation, sesionClienteId, setLastSeen } from "./almacen.js";
import { catInfo, fmtChatLista, isOpenNow, normalizar, uid } from "./utilidades.js";

export function ChatScreen({ biz, onBack }) {
  const c = catInfo(biz.cat);
  const tieneAsistenteReal = !!biz.asistenteCodigoPublico;
  const [messages, setMessages] = useState(() => getConversation(biz.id));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Si el negocio NO tiene un asistente real conectado, mostramos un saludo genérico local.
    // Si SÍ lo tiene, dejamos que el propio asistente de Mi Asistente arranque la charla
    // cuando el cliente escriba, en vez de simular un saludo que no es suyo.
    if (messages.length === 0 && !tieneAsistenteReal) {
      const saludo = {
        id: uid(), rol: "asistente",
        texto: `¡Hola! Soy el asistente de ${biz.name}. ¿En qué puedo ayudarte?`,
        hora: new Date().toISOString(),
      };
      setMessages([saludo]);
      saveConversation(biz.id, [saludo]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { saveConversation(biz.id, messages); setLastSeen(biz.id, new Date().toISOString()); }, [biz.id, messages]);

  const enviar = async () => {
    const contenido = text.trim();
    if (!contenido || sending) return;
    const msgCliente = { id: uid(), rol: "cliente", texto: contenido, hora: new Date().toISOString() };
    const historial = [...messages, msgCliente];
    setMessages(historial);
    setText("");

    if (!tieneAsistenteReal) {
      // Este negocio todavía no conectó Mi Asistente: no hay a quién preguntarle de verdad.
      setSending(true);
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: uid(), rol: "asistente",
          texto: "Gracias por tu mensaje. Este negocio todavía no activó su asistente virtual — igual, tu consulta va a quedar guardada acá.",
          hora: new Date().toISOString(),
        }]);
        setSending(false);
      }, 400);
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/asistente/chat/${biz.asistenteCodigoPublico}`, {
        method: "POST",
        headers: userHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ mensaje: contenido, sesionClienteId: sesionClienteId() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const texto = res.status === 401
          ? "Tu sesión venció. Iniciá sesión con Google de nuevo para seguir chateando."
          : data.error === "suscripcion_vencida"
          ? "Este asistente está pausado temporalmente por el negocio."
          : data.error === "limite_prueba_alcanzado"
          ? "Este negocio alcanzó el límite de mensajes de su prueba gratuita de Mi Asistente."
          : (data.mensaje || "No pude conectarme con el asistente en este momento.");
        setMessages((prev) => [...prev, { id: uid(), rol: "asistente", texto, hora: new Date().toISOString() }]);
        return;
      }
      setMessages((prev) => [...prev, {
        id: uid(), rol: "asistente", texto: data.respuesta, hora: new Date().toISOString(),
        imagenes: data.imagenes?.length ? data.imagenes : undefined,
        pedidoCreado: data.pedidoCreado || undefined,
        turnoCreado: data.turnoCreado || undefined,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: uid(), rol: "asistente",
        texto: "No pude conectarme con el asistente de este negocio en este momento. Probá de nuevo en un rato.",
        hora: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };


  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div className="sticky top-0 z-30" style={{ backgroundColor: "var(--azul-oscuro)" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BotonAtras onClick={onBack} />
          <div className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: "50%", background: c?.color || "var(--azul)", color: "#fff", fontWeight: 700, fontSize: 14 }}>
            {biz.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)" }}>{biz.name}</p>
            <p className="text-[11px] flex items-center gap-1" style={{ color: "var(--azul-palido)" }}>
              {tieneAsistenteReal ? "Asistente virtual" : c?.label}
              <span className="inline-flex items-center gap-1 ml-1">
                <span className="rounded-full" style={{ width: 5, height: 5, background: isOpenNow(biz.weekHours) ? "#2C9A5F" : "#C1443A" }} />
                {isOpenNow(biz.weekHours) ? "Abierto" : "Cerrado"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 flex flex-col gap-2.5 overflow-y-auto" style={{ paddingBottom: 90 }}>
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col" style={{ alignItems: m.rol === "cliente" ? "flex-end" : "flex-start" }}>
            <div
              className="px-3.5 py-2.5 text-sm"
              style={{
                maxWidth: "78%", borderRadius: 14,
                backgroundColor: m.rol === "cliente" ? "var(--azul)" : "#fff",
                color: m.rol === "cliente" ? "#fff" : "#0B1437",
                border: m.rol === "cliente" ? "none" : "1px solid #E3E7F1",
                borderBottomRightRadius: m.rol === "cliente" ? 4 : 14,
                borderBottomLeftRadius: m.rol === "cliente" ? 14 : 4,
              }}
            >
              {m.texto}
            </div>
            {m.rol !== "cliente" && m.id !== messages[0]?.id && <ReportarRespuestaIA texto={m.texto} pregunta={messages[messages.findIndex((x) => x.id === m.id) - 1]?.texto || ""} contexto={`Chat con el asistente de un negocio (${biz.name})`} />}
            {m.imagenes && (
              <div className="flex gap-2 mt-1.5 overflow-x-auto" style={{ maxWidth: "78%" }}>
                {m.imagenes.map((url, i) => (
                  <img key={i} src={url} alt="" className="object-cover shrink-0" style={{ width: 100, height: 100, borderRadius: 10, border: "1px solid #E3E7F1" }} />
                ))}
              </div>
            )}
            {(m.pedidoCreado || m.turnoCreado) && (
              <div className="flex items-center gap-2 mt-1.5 px-3 py-2" style={{ maxWidth: "78%", borderRadius: 10, background: "#E4F3EA", border: "1px solid #2C9A5F55" }}>
                <Check size={14} color="#1E6B44" />
                <span className="text-xs font-medium" style={{ color: "#1E6B44" }}>
                  {m.pedidoCreado ? "Pedido registrado" : "Turno reservado"}
                </span>
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex" style={{ justifyContent: "flex-start" }}>
            <div className="px-3.5 py-2.5 text-sm" style={{ borderRadius: 14, borderBottomLeftRadius: 4, backgroundColor: "#fff", border: "1px solid #E3E7F1", color: "#5B6482" }}>
              Escribiendo...
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0" style={{ backgroundColor: "#fff", borderTop: "1px solid #E3E7F1" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <input aria-label="Escribí tu mensaje..."
            value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
            placeholder="Escribí tu mensaje..."
            className="flex-1 px-4 py-2.5 text-sm outline-none"
            style={{ borderRadius: 24, border: "1px solid #E3E7F1", backgroundColor: "#F3F5FA", color: "#0B1437" }}
          />
          <button
            onClick={enviar} disabled={sending || !text.trim()}
            className="flex items-center justify-center shrink-0"
            style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--azul)", opacity: sending || !text.trim() ? 0.5 : 1 }}
          >
            <Send size={16} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

function IlustracionChats() {
  return (
    <svg width="168" height="132" viewBox="0 0 168 132" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="zcA" x1="20" y1="14" x2="96" y2="84" gradientUnits="userSpaceOnUse"><stop stopColor="var(--azul-claro)" /><stop offset="1" stopColor="var(--azul)" /></linearGradient>
        <linearGradient id="zcB" x1="70" y1="48" x2="140" y2="116" gradientUnits="userSpaceOnUse"><stop stopColor="#F4F8FF" /><stop offset="1" stopColor="#CFE0FB" /></linearGradient>
      </defs>
      <ellipse cx="84" cy="116" rx="62" ry="10" fill="var(--azul)" opacity=".10" />
      <path d="M78 50a20 20 0 0 1 20-20h28a20 20 0 0 1 20 20v22a20 20 0 0 1-20 20h-6l-12 14v-14h-10a20 20 0 0 1-20-20Z" fill="url(#zcB)" />
      <path d="M22 36a22 22 0 0 1 22-22h40a22 22 0 0 1 22 22v28a22 22 0 0 1-22 22H62L44 106V86h0a22 22 0 0 1-22-22Z" fill="url(#zcA)" />
      <circle cx="46" cy="50" r="5" fill="#fff" /><circle cx="64" cy="50" r="5" fill="#fff" /><circle cx="82" cy="50" r="5" fill="#fff" />
      <path d="M126 14l6-9M136 24l10-5M138 36l11 0" stroke="var(--azul-claro)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChatsScreen({ businesses, onOpenChat, onIrInicio, onAbrirComunidad, comunidadHabilitada = true, query = "" }) {
  const [hojaMas, setHojaMas] = useState(false);
  const [avisoComunidad, setAvisoComunidad] = useState(false);
  const comunidadProximamente = comunidadHabilitada === false; // apagada en el servidor: la tarjeta se ve igual, con «Próximamente»
  const [avisoPronto, setAvisoPronto] = useState("");
  const conversaciones = useMemo(() => {
    return getAllConversationIds()
      .map((id) => {
        const biz = businesses.find((b) => b.id === id);
        if (!biz || !(biz.asistenteCodigoPublico && biz.asistenteActivo)) return null; // sin Mi Asistente pago no hay chat
        const mensajes = getConversation(id);
        if (mensajes.length === 0) return null;
        const ultimo = mensajes[mensajes.length - 1];
        const visto = getLastSeen(id);
        const sinLeer = mensajes.filter((m) => m.rol === "asistente" && (!visto || new Date(m.hora) > new Date(visto))).length;
        const noLeido = ultimo.rol === "asistente" && (!visto || new Date(ultimo.hora) > new Date(visto));
        return { biz, ultimo, noLeido, sinLeer: Math.max(sinLeer, noLeido ? 1 : 0) };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.ultimo.hora) - new Date(a.ultimo.hora));
  }, [businesses]);

  const q = normalizar(query.trim());
  const visibles = q ? conversaciones.filter(({ biz, ultimo }) => normalizar(biz.name).includes(q) || normalizar(ultimo.texto).includes(q)) : conversaciones;

  return (
    <div>
      {/* Comunidad: fichas de la zona (mascotas y objetos perdidos, avisos, regalos, eventos...). Solo se publican fichas, no se escribe. */}
      {!query.trim() && (
        <div className="mb-4">
          <button type="button" onClick={() => { if (comunidadProximamente) setAvisoComunidad((v) => !v); else onAbrirComunidad?.(); }} aria-disabled={comunidadProximamente || undefined}
            className="w-full flex items-center gap-3.5 p-3.5 text-left bg-white" style={{ borderRadius: 20, border: "1px solid #edf0f8", boxShadow: "0 3px 12px rgba(15,22,55,.055)", minHeight: 78 }}>
            <span className="flex items-center justify-center shrink-0" style={{ width: 50, height: 50, borderRadius: 16, background: "linear-gradient(135deg,#1E8A55,#2C9A5F)", boxShadow: "0 8px 16px -6px rgba(30,138,85,.55)", opacity: comunidadProximamente ? 0.85 : 1 }}><Users size={23} color="#fff" aria-hidden="true" /></span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2"><span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: 16, color: "#0B1437" }}>Comunidad</span>{comunidadProximamente && <span className="text-[10px] font-semibold px-1.5 py-0.5" style={{ background: "#F5F1E6", color: "#8A5B12", borderRadius: 6 }}>Próximamente</span>}</span>
              <span className="block text-[13px] mt-0.5" style={{ color: "#5B6482", lineHeight: 1.35 }}>Fichas de tu zona: mascotas y objetos perdidos, avisos, regalos y eventos.</span>
            </span>
            {!comunidadProximamente && <ChevronDown size={16} color="#B9C0D6" className="shrink-0" style={{ transform: "rotate(-90deg)" }} />}
          </button>
          {comunidadProximamente && avisoComunidad && <p role="status" className="text-sm mt-2 p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510" }}>Comunidad llega muy pronto: vas a poder publicar y ver fichas de tu zona.</p>}
        </div>
      )}
      {conversaciones.length === 0 ? (
        <div className="text-center flex flex-col items-center" style={{ paddingTop: 36 }}>
          <IlustracionChats />
          <p className="mt-4 mb-1.5" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.01em", color: "#0B1437" }}>Todavía no tenés conversaciones</p>
          <p className="text-sm px-6" style={{ color: "#5B6482", lineHeight: 1.55, maxWidth: 340 }}>Abrí el chat con el asistente de un negocio y la conversación va a aparecer acá.</p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="text-center py-14">
          <span className="flex items-center justify-center mx-auto mb-3" style={{ width: 56, height: 56, borderRadius: 18, background: "#F1F4FA", boxShadow: "inset 0 0 0 1px #E3E7F1" }}><Search size={24} color="#8D95B0" /></span>
          <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>No encontramos chats para “{query.trim()}”</p>
          <p className="text-xs px-8" style={{ color: "#5B6482" }}>Probá con el nombre del negocio o con otra palabra del mensaje.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {visibles.map(({ biz, ultimo, noLeido, sinLeer }, i) => {
            const c = catInfo(biz.cat);
            const CatIcon = c?.icon;
            const abierto = isOpenNow(biz.weekHours);
            return (
              <button
                key={biz.id}
                onClick={() => onOpenChat(biz)}
                className="w-full flex items-center gap-3.5 px-3 py-3.5 text-left"
                style={{ borderRadius: noLeido ? 18 : 0, background: noLeido ? "#EEF4FF" : "transparent", borderBottom: !noLeido && i < visibles.length - 1 && !(visibles[i + 1] && visibles[i + 1].noLeido) ? "1px solid #EEF0F6" : "1px solid transparent" }}
              >
                <div className="relative shrink-0">
                  {biz.logo ? (
                    <img src={biz.logo} alt="" loading="lazy" decoding="async" className="object-cover" style={{ width: 56, height: 56, borderRadius: "50%", boxShadow: "0 0 0 1px rgba(11,20,55,.08)" }} />
                  ) : (
                    <div className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: "50%", background: c?.color || "var(--azul)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)" }}>
                      {CatIcon ? <CatIcon size={24} color="#fff" /> : <span className="text-lg font-bold">{biz.name?.[0]?.toUpperCase()}</span>}
                    </div>
                  )}
                  {abierto && <span aria-label="Abierto ahora" className="absolute" style={{ right: 0, bottom: 1, width: 14, height: 14, borderRadius: "50%", background: "#22C55E", border: "2.5px solid #fff" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate" style={{ fontFamily: "var(--fuente-titulo)", fontSize: 16, color: "#0B1437", fontWeight: noLeido ? 800 : 700 }}>{biz.name}</span>
                    <span className="text-xs shrink-0" style={{ color: noLeido ? "var(--azul)" : "#5B6482", fontWeight: noLeido ? 600 : 400 }}>{fmtChatLista(ultimo.hora)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[13px]" style={{ color: noLeido ? "#1D2939" : "#5B6482", fontWeight: noLeido ? 500 : 400, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {ultimo.rol === "cliente" ? "Vos: " : ""}{ultimo.texto}
                    </span>
                    {noLeido ? (
                      <span className="shrink-0 flex items-center justify-center text-xs font-bold" style={{ minWidth: 24, height: 24, borderRadius: 12, background: "var(--azul)", color: "#fff", padding: "0 7px", boxShadow: "0 4px 10px -3px rgba(var(--azul-rgb),.7)" }}>{sinLeer}</span>
                    ) : ultimo.rol === "asistente" ? (
                      <CheckCheck size={16} color="var(--azul)" className="shrink-0" />
                    ) : null}
                  </div>
                </div>
                <ChevronDown size={16} color="#B9C0D6" className="shrink-0" style={{ transform: "rotate(-90deg)" }} />
              </button>
            );
          })}
        </div>
      )}

      {/* botón «+» (como el de WhatsApp): hoy abre «Chatear con un negocio»; amigos y grupos llegan más adelante */}
      <button type="button" onClick={() => { setAvisoPronto(""); setHojaMas(true); }} aria-label="Nuevo chat" className="fixed z-40 flex items-center justify-center active:scale-95 transition-transform"
        style={{ right: 16, bottom: "calc(98px + env(safe-area-inset-bottom, 0px))", width: 58, height: 58, borderRadius: 20, background: "linear-gradient(135deg,var(--azul),var(--azul-medio))", boxShadow: "0 10px 24px rgba(var(--azul-rgb),.45)" }}>
        <Plus size={26} color="#fff" strokeWidth={2.6} aria-hidden="true" />
      </button>
      {hojaMas && (
        <Hoja titulo="Nuevo" onCerrar={() => setHojaMas(false)}>
          <div className="flex flex-col gap-2">
            {[
              { Icon: MessageCircle, bg: "#E4F7F6", fg: "#13897F", t: "Chatear con un negocio", d: "Elegí un negocio y hablá con su asistente.", ir: true },
              { Icon: UserPlus, bg: "#EEF4FF", fg: "#2350F5", t: "Agregar un amigo", d: "Para chatear con personas que conocés.", pronto: true },
              { Icon: Users, bg: "#F5EFFE", fg: "#7A4FD6", t: "Crear un grupo", d: "Para hablar con varias personas a la vez.", pronto: true },
            ].map(({ Icon, bg, fg, t, d, ir, pronto }) => (
              <button key={t} type="button" aria-disabled={pronto || undefined}
                onClick={() => { if (ir) { setHojaMas(false); onIrInicio?.(); } else setAvisoPronto(`«${t}» llega muy pronto.`); }}
                className="w-full flex items-center gap-3.5 text-left p-3" style={{ borderRadius: 16, border: "1px solid #E6ECF5", background: "#fff", minHeight: 68, opacity: pronto ? 0.8 : 1 }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 46, height: 46, borderRadius: 15, background: bg }}><Icon size={21} color={fg} aria-hidden="true" /></span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2"><span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 15, color: "#0B1437" }}>{t}</span>{pronto && <span className="text-[10px] font-semibold px-1.5 py-0.5" style={{ background: "#F5F1E6", color: "#8A5B12", borderRadius: 6 }}>Próximamente</span>}</span>
                  <span className="block text-[13px] mt-0.5" style={{ color: "#5B6482", lineHeight: 1.35 }}>{d}</span>
                </span>
              </button>
            ))}
          </div>
          {avisoPronto && <p role="status" className="text-sm mt-3 p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510" }}>{avisoPronto}</p>}
        </Hoja>
      )}
    </div>
  );
}
