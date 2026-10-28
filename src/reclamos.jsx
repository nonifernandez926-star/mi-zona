// Reclamos, devoluciones y cambios: la persona los hace desde "Mis pedidos", el negocio los responde en Mi Asistente
// y la respuesta aparece acá (y llega un aviso al celular). Se actualiza sola mientras la pantalla está abierta.
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, ChevronRight, Clock, MessageSquare, RefreshCw, Send, X } from "lucide-react";
import { BotonAtras } from "./cuenta.jsx";
import { TONOS } from "./tonos.js";
import { traerMisReclamos, enviarReclamo } from "./api.js";
import { uploadImage, comprimirFoto } from "./subirFoto.js";

const TITULO = { fontFamily: "var(--fuente-titulo)", color: "#0B1437" };

const TIPOS = [
  { id: "reclamo", nombre: "Reclamo", ayuda: "Algo salió mal con mi pedido" },
  { id: "devolucion", nombre: "Devolución", ayuda: "Quiero que me devuelvan el dinero" },
  { id: "cambio", nombre: "Cambio", ayuda: "Quiero cambiar el producto" },
];
const TIPO_TEXTO = { reclamo: "Reclamo", devolucion: "Devolución", cambio: "Cambio" };
const MOTIVOS = [
  ["mal_estado", "Llegó en mal estado"], ["no_llego", "No llegó"], ["incorrecto", "Era otro producto"],
  ["calidad", "Mala calidad"], ["demora", "Demoró mucho"], ["atencion", "Mala atención"], ["otro", "Otro motivo"],
];
const MOTIVO_TEXTO = Object.fromEntries(MOTIVOS);
const SOLUCION_TEXTO = {
  reembolso: "Te devuelven el dinero", cambio: "Te cambian el producto", reposicion: "Te reponen el producto",
  compensacion: "Te dan una compensación", ninguna: "",
};
const MAX_FOTOS = 4;

const pesos = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function fecha(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "");
}

// Cómo se muestra el estado de cada reclamo
function estadoDe(r) {
  if (r.fallo) return { texto: "No se pudo enviar", tono: "rojo" };
  if (!r.enviado) return { texto: "Pendiente de envío", tono: "naranja" };
  if (r.estado === "aceptado") return { texto: "Aceptado", tono: "verde" };
  if (r.estado === "rechazado") return { texto: "Rechazado", tono: "rojo" };
  if (r.estado === "en_revision") return { texto: "En revisión", tono: "violeta" };
  return { texto: "Enviado", tono: "azul" };
}

function Pastilla({ r }) {
  const e = estadoDe(r);
  const t = TONOS[e.tono];
  return (
    <span className="text-[11px] font-bold px-2.5 py-1 shrink-0" style={{ borderRadius: 999, background: t.bg, color: t.fg, boxShadow: `inset 0 0 0 1px ${t.aro}` }}>
      {e.texto}
    </span>
  );
}

function Encabezado({ titulo, subtitulo, onBack, onRecargar, cargando }) {
  return (
    <div data-conservar-color className="sticky top-0 z-30" style={{ backgroundColor: "#0B1437" }}>
      <div className="max-w-3xl mx-auto px-4 pb-3 flex items-center gap-3" style={{ paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        <BotonAtras onClick={onBack} />
        <div className="flex-1 min-w-0 leading-tight">
          <p style={{ color: "#fff", fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>{titulo}</p>
          {subtitulo ? <p className="text-xs truncate" style={{ color: "#BBD1FB" }}>{subtitulo}</p> : null}
        </div>
        {onRecargar ? (
          <button onClick={onRecargar} aria-label="Actualizar reclamos" className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)" }}>
            <RefreshCw size={16} color="#fff" className={cargando ? "animate-spin" : ""} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Tarjeta({ r, onAbrirNegocio }) {
  const sol = r.respuesta ? SOLUCION_TEXTO[r.respuesta.solucion] : "";
  const tonoRespuesta = r.estado === "aceptado" ? TONOS.verde : TONOS.azul;
  return (
    <article className="mb-3 overflow-hidden" style={{ borderRadius: 20, background: "#fff", border: "1px solid #E3E7F1", boxShadow: "0 1px 2px rgba(11,20,55,.04)" }}>
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className="flex-1 min-w-0">
          <p className="truncate" style={{ ...TITULO, fontWeight: 800, fontSize: 15.5, letterSpacing: "-0.01em" }}>{r.negocio || "Negocio"}</p>
          <p className="text-xs" style={{ color: "#5B6482" }}>{TIPO_TEXTO[r.tipo]} · {MOTIVO_TEXTO[r.motivo] || "Otro motivo"} · {fecha(r.creado)}</p>
        </div>
        <Pastilla r={r} />
      </div>
      <div className="px-4 pb-3">
        {r.producto ? <p className="text-sm font-semibold mb-1" style={{ color: "#2B3768" }}>{r.producto}{r.monto ? ` · ${pesos(r.monto)}` : ""}</p> : null}
        <p className="text-sm" style={{ color: "#2B3768", lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{r.descripcion}</p>
        {r.fotos?.length ? (
          <div className="flex gap-2 mt-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {r.fotos.map((u) => <img key={u} src={u} alt="Foto del reclamo" loading="lazy" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12, flexShrink: 0 }} />)}
          </div>
        ) : null}
      </div>
      {r.respuesta ? (
        <div className="mx-4 mb-3 px-3.5 py-3" style={{ borderRadius: 14, background: tonoRespuesta.bg, boxShadow: `inset 0 0 0 1px ${tonoRespuesta.aro}` }}>
          <p className="text-[11px] font-bold mb-1" style={{ color: tonoRespuesta.fg, letterSpacing: ".06em" }}>RESPUESTA DEL NEGOCIO</p>
          <p className="text-sm" style={{ color: "#0B1437", lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{r.respuesta.mensaje}</p>
          {sol ? <p className="text-xs font-bold mt-2" style={{ color: tonoRespuesta.fg }}>{sol}</p> : null}
        </div>
      ) : r.enviado ? (
        <p className="flex items-center gap-1.5 text-xs px-4 pb-3" style={{ color: "#5B6482" }}><Clock size={13} /> Esperando la respuesta del negocio. Te avisamos cuando conteste.</p>
      ) : (
        <p className="flex items-start gap-1.5 text-xs px-4 pb-3" style={{ color: r.fallo ? TONOS.rojo.fg : "#5B6482", lineHeight: 1.4 }}>
          <AlertTriangle size={13} className="shrink-0" style={{ marginTop: 1 }} />
          {r.fallo ? "No logramos enviarlo al negocio. Probá hacer el reclamo de nuevo desde Mis pedidos o hablá con el negocio por el chat." : "El negocio todavía no lo recibió. Lo reenviamos solos cuando abras esta pantalla."}
        </p>
      )}
      {r.codigoPublico && onAbrirNegocio ? (
        <div className="px-4 pb-4">
          <button onClick={() => onAbrirNegocio(r.codigoPublico)} className="w-full flex items-center justify-center gap-1 text-sm font-semibold py-2.5" style={{ borderRadius: 12, background: "var(--azul-suave)", color: "var(--azul)" }}>
            Ver negocio <ChevronRight size={16} />
          </button>
        </div>
      ) : null}
    </article>
  );
}

function Formulario({ pedido, onCancelar, onEnviado }) {
  const [tipo, setTipo] = useState("reclamo");
  const [motivo, setMotivo] = useState("otro");
  const [producto, setProducto] = useState((pedido.items && pedido.items[0] && pedido.items[0].producto) || "");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const inputFoto = useRef(null);
  const largo = descripcion.trim().length;
  const listo = largo >= 10 && !subiendo && !enviando;

  async function agregarFotos(e) {
    const archivos = Array.from(e.target.files || []).slice(0, MAX_FOTOS - fotos.length);
    e.target.value = "";
    if (!archivos.length) return;
    setError(""); setSubiendo(true);
    try {
      const urls = [];
      for (const a of archivos) urls.push(await uploadImage(await comprimirFoto(a)));
      setFotos((f) => [...f, ...urls].slice(0, MAX_FOTOS));
    } catch {
      setError("No pudimos subir la foto. Revisá tu conexión y probá de nuevo.");
    } finally { setSubiendo(false); }
  }

  async function enviar() {
    if (!listo) return;
    setError(""); setEnviando(true);
    try {
      const r = await enviarReclamo({
        codigoPublico: pedido.negocio?.codigoPublico, negocio: pedido.negocio?.nombre || "",
        tipo, motivo, producto: producto.trim(), pedidoRef: pedido.id, monto: pedido.total || undefined,
        descripcion: descripcion.trim(), fotos,
      });
      onEnviado(r.enviado === false ? (r.mensaje || "Guardamos tu reclamo. Lo reenviamos solos en un rato.") : "Listo: el negocio recibió tu reclamo. Te avisamos cuando responda.");
    } catch (e) {
      setError(e.message || "No se pudo enviar el reclamo. Probá de nuevo.");
    } finally { setEnviando(false); }
  }

  const chip = (activo) => ({ borderRadius: 999, background: activo ? "#0B1437" : "#fff", color: activo ? "#fff" : "#5B6482", border: `1px solid ${activo ? "#0B1437" : "#E3E7F1"}` });
  return (
    <div className="max-w-3xl mx-auto px-4" style={{ paddingTop: 16, paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))" }}>
      <div className="p-4 mb-4" style={{ borderRadius: 20, background: "#fff", border: "1px solid #E3E7F1" }}>
        <p style={{ ...TITULO, fontWeight: 800, fontSize: 16 }}>{pedido.negocio?.nombre || "Negocio"}</p>
        <p className="text-xs mt-0.5" style={{ color: "#5B6482" }}>
          Pedido del {fecha(pedido.creado)}{pedido.total ? ` · ${pesos(pedido.total)}` : ""}
        </p>
      </div>

      <p className="text-xs font-bold mb-2" style={{ color: "#5B6482", letterSpacing: ".06em" }}>¿QUÉ NECESITÁS?</p>
      <div className="flex flex-col gap-2 mb-1">
        {TIPOS.map((t) => (
          <button key={t.id} onClick={() => setTipo(t.id)} aria-pressed={tipo === t.id} className="text-left px-4 py-3"
            style={{ borderRadius: 16, background: "#fff", border: `2px solid ${tipo === t.id ? "var(--azul)" : "#E3E7F1"}` }}>
            <span className="block font-bold text-sm" style={{ color: "#0B1437" }}>{t.nombre}</span>
            <span className="block text-xs" style={{ color: "#5B6482" }}>{t.ayuda}</span>
          </button>
        ))}
      </div>
      {tipo === "cambio" ? <p className="text-xs mb-1 mt-1" style={{ color: "#5B6482", lineHeight: 1.4 }}>Si el pedido es comida o bebida, el negocio solo puede devolverte el dinero.</p> : null}

      <p className="text-xs font-bold mb-2 mt-5" style={{ color: "#5B6482", letterSpacing: ".06em" }}>MOTIVO</p>
      <div className="flex flex-wrap gap-2">
        {MOTIVOS.map(([id, nombre]) => (
          <button key={id} onClick={() => setMotivo(id)} aria-pressed={motivo === id} className="text-[13px] font-semibold px-3.5 py-2" style={chip(motivo === id)}>{nombre}</button>
        ))}
      </div>

      <label className="block text-xs font-bold mb-2 mt-5" htmlFor="rec-producto" style={{ color: "#5B6482", letterSpacing: ".06em" }}>PRODUCTO (OPCIONAL)</label>
      <input id="rec-producto" value={producto} onChange={(e) => setProducto(e.target.value.slice(0, 120))} placeholder="Ej: Pizza muzzarella"
        className="w-full px-4 py-3 text-sm" style={{ borderRadius: 14, background: "#fff", border: "1px solid #E3E7F1", color: "#0B1437" }} />

      <label className="block text-xs font-bold mb-2 mt-5" htmlFor="rec-desc" style={{ color: "#5B6482", letterSpacing: ".06em" }}>CONTANOS QUÉ PASÓ</label>
      <textarea id="rec-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value.slice(0, 1500))} rows={5} placeholder="Escribí con detalle para que el negocio pueda ayudarte."
        className="w-full px-4 py-3 text-sm" style={{ borderRadius: 14, background: "#fff", border: "1px solid #E3E7F1", color: "#0B1437", resize: "vertical" }} />
      <p className="text-xs mt-1" style={{ color: largo > 0 && largo < 10 ? TONOS.rojo.fg : "#8D95B0" }}>{largo < 10 ? "Mínimo 10 letras" : `${largo}/1500`}</p>

      <p className="text-xs font-bold mb-2 mt-5" style={{ color: "#5B6482", letterSpacing: ".06em" }}>FOTOS (OPCIONAL, HASTA {MAX_FOTOS})</p>
      <div className="flex flex-wrap gap-2">
        {fotos.map((u) => (
          <div key={u} className="relative" style={{ width: 72, height: 72 }}>
            <img src={u} alt="Foto adjunta" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 14 }} />
            <button onClick={() => setFotos((f) => f.filter((x) => x !== u))} aria-label="Quitar foto" className="absolute flex items-center justify-center"
              style={{ top: -6, right: -6, width: 24, height: 24, borderRadius: "50%", background: "#0B1437", border: "2px solid #fff" }}>
              <X size={12} color="#fff" />
            </button>
          </div>
        ))}
        {fotos.length < MAX_FOTOS ? (
          <button onClick={() => inputFoto.current?.click()} disabled={subiendo} className="flex flex-col items-center justify-center text-[10px] font-semibold"
            style={{ width: 72, height: 72, borderRadius: 14, background: "#fff", border: "2px dashed #D5DBEA", color: "#5B6482" }}>
            {subiendo ? <RefreshCw size={18} className="animate-spin" /> : <Camera size={20} />}
            <span className="mt-1">{subiendo ? "Subiendo" : "Agregar"}</span>
          </button>
        ) : null}
      </div>
      <input ref={inputFoto} type="file" accept="image/*" multiple onChange={agregarFotos} style={{ display: "none" }} />

      {error ? (
        <p role="alert" className="flex items-start gap-2 text-sm font-medium px-3.5 py-3 mt-5" style={{ borderRadius: 14, background: TONOS.rojo.bg, color: TONOS.rojo.fg, boxShadow: `inset 0 0 0 1px ${TONOS.rojo.aro}`, lineHeight: 1.4 }}>
          <AlertTriangle size={16} className="shrink-0" style={{ marginTop: 1 }} />{error}
        </p>
      ) : null}

      <p className="text-xs mt-5" style={{ color: "#8D95B0", lineHeight: 1.4 }}>El negocio verá tu nombre de usuario, tu mensaje y las fotos. No ve tu correo ni tu teléfono.</p>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancelar} className="px-5 py-3 text-sm font-semibold" style={{ borderRadius: 14, background: "#fff", color: "#5B6482", border: "1px solid #E3E7F1" }}>Cancelar</button>
        <button onClick={enviar} disabled={!listo} className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold"
          style={{ borderRadius: 14, background: listo ? "var(--azul)" : "#C9D1E6", color: "#fff" }}>
          {enviando ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}{enviando ? "Enviando…" : "Enviar reclamo"}
        </button>
      </div>
    </div>
  );
}

export function ReclamosScreen({ pedidoInicial, onBack, onAbrirNegocio }) {
  const [pedido, setPedido] = useState(pedidoInicial || null); // si hay pedido, se muestra el formulario
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [aviso, setAviso] = useState("");

  const recargar = useCallback(async () => {
    setCargando(true);
    try { setLista(await traerMisReclamos()); setError(false); }
    catch { setError(true); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { recargar(); }, [recargar]);
  useEffect(() => {
    if (pedido) return undefined;
    const t = setInterval(() => { if (document.visibilityState === "visible") recargar(); }, 30000);
    return () => clearInterval(t);
  }, [pedido, recargar]);

  if (pedido) {
    return (
      <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh" }}>
        <Encabezado titulo="Hacer un reclamo" subtitulo={pedido.negocio?.nombre} onBack={pedidoInicial ? onBack : () => setPedido(null)} />
        <Formulario
          pedido={pedido}
          onCancelar={pedidoInicial ? onBack : () => setPedido(null)}
          onEnviado={(msg) => { setAviso(msg); setPedido(null); recargar(); }}
        />
      </div>
    );
  }

  const abiertos = lista.filter((r) => r.enviado && (r.estado === "nuevo" || r.estado === "en_revision")).length;
  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh" }}>
      <Encabezado titulo="Mis reclamos" subtitulo={abiertos ? `${abiertos} esperando respuesta` : "Reclamos, devoluciones y cambios"} onBack={onBack} onRecargar={recargar} cargando={cargando} />
      <div className="max-w-3xl mx-auto px-4 pt-4" style={{ paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))" }}>
        {aviso ? (
          <p role="status" className="flex items-start gap-2 text-sm font-medium px-3.5 py-3 mb-3" style={{ borderRadius: 14, background: TONOS.verde.bg, color: "#145C39", boxShadow: `inset 0 0 0 1px ${TONOS.verde.aro}`, lineHeight: 1.4 }}>
            <Check size={16} className="shrink-0" style={{ marginTop: 1 }} />{aviso}
          </p>
        ) : null}

        {error && lista.length === 0 ? (
          <div className="text-center px-5 py-8" style={{ borderRadius: 20, background: "#fff", border: "1px solid #E3E7F1" }}>
            <p className="font-bold mb-1" style={TITULO}>No pudimos traer tus reclamos</p>
            <p className="text-sm mb-4" style={{ color: "#5B6482", lineHeight: 1.45 }}>Revisá tu conexión y probá de nuevo.</p>
            <button onClick={recargar} className="text-sm font-semibold px-5 py-2.5" style={{ borderRadius: 12, background: "var(--azul)", color: "#fff" }}>Reintentar</button>
          </div>
        ) : cargando && lista.length === 0 ? (
          <div aria-busy="true">{[0, 1].map((k) => <div key={k} className="mb-3 animate-pulse" style={{ height: 150, borderRadius: 20, background: "#fff", border: "1px solid #E3E7F1" }} />)}</div>
        ) : lista.length === 0 ? (
          <div className="text-center px-6" style={{ paddingTop: 40 }}>
            <span className="flex items-center justify-center mx-auto" style={{ width: 64, height: 64, borderRadius: 22, background: "#fff", boxShadow: "0 1px 2px rgba(11,20,55,.06), 0 10px 22px -8px rgba(var(--azul-rgb), .4)" }}>
              <MessageSquare size={29} color="var(--azul)" />
            </span>
            <p className="mt-5 mb-1.5" style={{ ...TITULO, fontWeight: 800, fontSize: 18 }}>Todavía no hiciste reclamos</p>
            <p className="text-sm mx-auto" style={{ color: "#5B6482", lineHeight: 1.5, maxWidth: 320 }}>
              Si algo salió mal con un pedido, abrilo en «Mis pedidos» y tocá «Hacer un reclamo». Acá vas a ver la respuesta del negocio.
            </p>
          </div>
        ) : (
          lista.map((r) => <Tarjeta key={r.id} r={r} onAbrirNegocio={onAbrirNegocio} />)
        )}
      </div>
    </div>
  );
}
