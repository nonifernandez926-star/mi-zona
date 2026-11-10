// Pantalla de notificaciones.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, CheckCheck, Trash2, X } from "lucide-react";
import { activarPush, estadoPush } from "../api.js";
import { BotonAtras } from "../cuenta.jsx";
import { TONOS as TONOS_ICONOS } from "../tonos.js";
import { NOTIF_BANNER_KEY, NOTIF_CAT, NOTIF_FILTROS, NOTIF_TIPOS, NOTIF_TONO } from "./notificaciones.js";
import { fmtNotifTime } from "./utilidades.js";

/* ---------- centro de notificaciones ---------- */

// Fila de notificación: se elimina deslizándola hacia la derecha (como en las apps móviles modernas)
function SwipeableNotification({ n, leida, onOpen, onDelete }) {
  const [dx, setDx] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const inicio = useRef(null);
  const seMovio = useRef(false);
  const t = NOTIF_TIPOS[n.tipo] || NOTIF_TIPOS.pedido;
  const Icon = t.Icon;
  const UMBRAL = 90; // px que hay que deslizar para eliminar

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    inicio.current = { x: e.clientX, y: e.clientY, eje: null };
    seMovio.current = false;
  };
  const onPointerMove = (e) => {
    const s = inicio.current;
    if (!s) return;
    const ddx = e.clientX - s.x;
    const ddy = e.clientY - s.y;
    if (s.eje === null && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) {
      s.eje = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
      if (s.eje === "h") {
        setArrastrando(true);
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no crítico */ }
      }
    }
    if (s.eje === "h") {
      seMovio.current = true;
      setDx(Math.max(0, ddx)); // solo hacia la derecha
    }
  };
  const terminar = () => {
    const s = inicio.current;
    inicio.current = null;
    if (!s) return;
    setArrastrando(false);
    if (s.eje === "h" && dx > UMBRAL) {
      setSaliendo(true);
      setDx(window.innerWidth);
      setTimeout(onDelete, 400); // espera a que termine la animación de salida
    } else {
      setDx(0);
    }
    setTimeout(() => { seMovio.current = false; }, 50);
  };

  const tono = TONOS_ICONOS[NOTIF_TONO[n.tipo]] || TONOS_ICONOS.azul;
  return (
    <div
      className="relative overflow-hidden"
      style={{ maxHeight: saliendo ? 0 : 160, opacity: saliendo ? 0 : 1, marginBottom: saliendo ? 0 : 6, borderRadius: 14, transition: "max-height 0.25s ease 0.12s, opacity 0.2s ease 0.1s, margin 0.25s ease 0.12s" }}
    >
      {/* fondo que se descubre al deslizar */}
      <div className="absolute inset-0 flex items-center gap-2 px-5" style={{ background: "#D64545", borderRadius: 14, opacity: dx > 4 ? 1 : 0 }}>
        <Trash2 size={16} color="#fff" />
        <span className="text-[11px] font-bold" style={{ color: "#fff" }}>Eliminar</span>
      </div>
      <div
        role="button" tabIndex={0}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={terminar} onPointerCancel={terminar}
        onClick={() => { if (!seMovio.current) onOpen(); }}
        onKeyDown={(e) => (e.key === "Enter" ? onOpen() : null)}
        className="relative flex items-center gap-2.5 px-3 py-2.5 cursor-pointer"
        style={{
          background: leida ? "#fff" : "color-mix(in srgb, var(--azul) 5%, white)", border: `1px solid ${leida ? "#E3E7F1" : "color-mix(in srgb, var(--azul) 22%, white)"}`, borderRadius: 14,
          transform: `translateX(${dx}px)`, transition: arrastrando ? "none" : "transform 0.25s ease", touchAction: "pan-y", userSelect: "none",
        }}
      >
        <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 11, background: tono.bg, boxShadow: `inset 0 0 0 1px ${tono.aro}` }}>
          <Icon size={16} color={tono.fg} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px]" style={{ color: "#0B1437", fontWeight: 700, lineHeight: 1.25 }}>{n.titulo}</p>
          <p className="text-xs mt-px" style={{ color: "#5B6482", lineHeight: 1.3, wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.descripcion}</p>
          <p className="text-[10.5px] mt-0.5 font-semibold" style={{ color: "#6B7390" }}>{fmtNotifTime(n.fecha, n.soloFecha)}</p>
        </div>
        {!leida && <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: "var(--azul)", boxShadow: "0 0 0 3px rgba(var(--azul-rgb), .15)" }} />}
      </div>
    </div>
  );
}

export function NotificacionesScreen({ notificaciones, leidas, onOpen, onDelete, onMarkAllRead, onBack, usuario }) {
  const [filtro, setFiltro] = useState("todas");
  // invitación a activar los avisos del celular (igual que en Mi Asistente)
  const [estadoAvisos, setEstadoAvisos] = useState("cargando");
  const [bannerOculto, setBannerOculto] = useState(() => { try { return localStorage.getItem(NOTIF_BANNER_KEY) === "1"; } catch { return false; } });
  const [activando, setActivando] = useState(false);
  const [errorAvisos, setErrorAvisos] = useState(null);
  useEffect(() => { if (usuario) estadoPush().then(setEstadoAvisos).catch(() => setEstadoAvisos("inactivo")); }, [usuario?.id]);
  const activarAvisos = async () => {
    setActivando(true); setErrorAvisos(null);
    try { await activarPush(); } catch (e) { setErrorAvisos(e.message); }
    setEstadoAvisos(await estadoPush().catch(() => "inactivo")); setActivando(false);
  };
  const ocultarBanner = () => { setBannerOculto(true); try { localStorage.setItem(NOTIF_BANNER_KEY, "1"); } catch { /* sin almacenamiento */ } };
  const mostrarBanner = !!usuario && estadoAvisos === "inactivo" && !bannerOculto;
  const sinLeer = notificaciones.filter((n) => !leidas.has(n.id)).length;
  const lista = filtro === "todas" ? notificaciones : filtro === "sinleer" ? notificaciones.filter((n) => !leidas.has(n.id)) : notificaciones.filter((n) => NOTIF_CAT[n.tipo] === filtro);
  const hoy = new Date().toDateString();
  const ayer = new Date(Date.now() - 86400000).toDateString();
  const grupos = [
    { label: "Hoy", items: lista.filter((n) => new Date(n.fecha).toDateString() === hoy) },
    { label: "Ayer", items: lista.filter((n) => new Date(n.fecha).toDateString() === ayer) },
    { label: "Anteriores", items: lista.filter((n) => ![hoy, ayer].includes(new Date(n.fecha).toDateString())) },
  ].filter((g) => g.items.length > 0);
  const vacio = filtro === "sinleer" ? ["Todo leído", "No tenés avisos sin leer."]
    : notificaciones.length ? ["Nada por acá", "No hay avisos en esta categoría."]
    : ["Todavía no hay avisos", "Cuando haya novedades de tus pedidos, turnos, puntos, canjes o de los negocios que seguís, las ves acá."];

  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100dvh" }}>
      <div data-conservar-color className="sticky top-0 z-30" style={{ backgroundColor: "var(--azul-oscuro)" }}>
        <div className="max-w-3xl mx-auto px-4 pb-2.5 flex items-center gap-3" style={{ paddingTop: "calc(8px + env(safe-area-inset-top, 0px))" }}>
          <BotonAtras onClick={onBack} />
          <div className="flex-1 min-w-0 leading-tight">
            <p style={{ color: "#fff", fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>Notificaciones</p>
            <p className="text-xs" style={{ color: "var(--azul-palido)" }}>{sinLeer > 0 ? `${sinLeer} sin leer` : "Estás al día"}</p>
          </div>
          {sinLeer > 0 && (
            <button onClick={onMarkAllRead} className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 shrink-0" style={{ borderRadius: 10, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.16)", color: "#fff" }}>
              <CheckCheck size={13} /> Marcar todas
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4" style={{ paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex gap-1.5 overflow-x-auto pt-2.5 pb-1" style={{ scrollbarWidth: "none" }}>
          {NOTIF_FILTROS.map(([id, nombre]) => {
            const activo = filtro === id;
            return (
              <button key={id} onClick={() => setFiltro(id)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 shrink-0"
                style={{ borderRadius: 999, background: activo ? "var(--azul-oscuro)" : "#fff", color: activo ? "#fff" : "#5B6482", border: `1px solid ${activo ? "var(--azul-oscuro)" : "#E3E7F1"}` }}>
                {nombre}
                {id === "sinleer" && sinLeer > 0 && <b className="flex items-center justify-center text-[10px]" style={{ background: "var(--azul)", color: "#fff", minWidth: 16, height: 16, borderRadius: 8, padding: "0 4px" }}>{sinLeer}</b>}
              </button>
            );
          })}
        </div>

        {mostrarBanner && (
          <div className="relative flex items-center gap-3 p-3.5 mt-3" style={{ borderRadius: 18, background: "radial-gradient(260px 160px at 105% -20%, rgba(var(--azul-brillo-rgb),.55), transparent 60%), var(--azul-oscuro)", color: "#fff" }} data-conservar-color>
            <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 13, background: "rgba(255,255,255,.14)" }}><Bell size={20} color="#fff" /></span>
            <span className="flex-1 min-w-0 leading-tight">
              <strong className="block text-sm">Recibí los avisos en tu celular</strong>
              <span className="block text-xs mt-0.5" style={{ color: "var(--azul-palido)" }}>Pedidos, turnos, puntos y novedades, aunque tengas la app cerrada.</span>
              {errorAvisos && <span className="block text-xs mt-1" style={{ color: "#FFB4AE" }}>{errorAvisos}</span>}
            </span>
            <button onClick={activarAvisos} disabled={activando} className="shrink-0 text-xs font-bold px-3.5 py-2" style={{ borderRadius: 10, background: "#fff", color: "#0B1437", opacity: activando ? .6 : 1 }}>{activando ? "Activando..." : "Activar"}</button>
            <button onClick={ocultarBanner} aria-label="Ocultar aviso" className="absolute flex items-center justify-center" style={{ top: -17, right: -15, width: 44, height: 44, background: "transparent", color: "#5B6482" }}><span aria-hidden="true" className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 8px rgba(11,20,55,.25)" }}><X size={14} /></span></button>
          </div>
        )}

        {lista.length === 0 ? (
          <div className="text-center px-6" style={{ paddingTop: 56 }}>
            <span className="flex items-center justify-center mx-auto" style={{ width: 84, height: 84, borderRadius: "50%", background: "radial-gradient(circle, rgba(var(--azul-rgb), .16), rgba(var(--azul-rgb), 0) 70%)" }}>
              <span className="flex items-center justify-center" style={{ width: 62, height: 62, borderRadius: 21, background: "#fff", boxShadow: "0 1px 2px rgba(11,20,55,.06), 0 10px 22px -8px rgba(var(--azul-rgb), .4)" }}><BellOff size={28} color="var(--azul)" /></span>
            </span>
            <p className="mt-5 mb-1.5" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: 17, color: "#0B1437" }}>{vacio[0]}</p>
            <p className="text-sm mx-auto" style={{ color: "#5B6482", lineHeight: 1.5, maxWidth: 320 }}>{vacio[1]}</p>
          </div>
        ) : (
          <>
            {grupos.map((g) => (
              <div key={g.label}>
                <p className="text-[10px] font-extrabold px-1 pt-3 pb-1.5" style={{ color: "#6B7390", letterSpacing: "0.1em" }}>{g.label.toUpperCase()}</p>
                {g.items.map((n) => (
                  <SwipeableNotification key={n.id} n={n} leida={leidas.has(n.id)} onOpen={() => onOpen(n)} onDelete={() => onDelete(n.id)} />
                ))}
              </div>
            ))}
            <p className="text-center text-xs mt-5" style={{ color: "#6B7390" }}>Deslizá un aviso hacia la derecha para borrarlo.</p>
          </>
        )}
      </div>
    </div>
  );
}
