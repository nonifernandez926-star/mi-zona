// Fase 8 · Denunciar, bloquear, avisos del equipo y apelaciones. Todo lo decide el servidor: acá solo se pide y se muestra.
import { useEffect, useState } from "react";
import { Flag, UserX, ShieldAlert, Scale, Check, BookOpen } from "lucide-react";
import { Pagina, Hoja, Campo, botonPrincipal, botonSecundario, caja } from "./oficios.jsx";
import DialogoAdvertencia from "./componentes/DialogoAdvertencia.jsx";
import { EstadoCarga, EstadoVacio, EstadoError } from "./componentes/Estados.jsx";
import { denunciasApi, moderacionApi } from "./api.js";
import { MOTIVOS_DENUNCIA, REGLAS_CONVIVENCIA, NOMBRE_TIPO } from "./denuncias.js";

const fechaCorta = (f) => (f ? new Date(f).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "");

// Ícono de «Denunciar o bloquear» para las cabeceras de detalle: acciones={[..., accionDenunciar(() => setDen(true))]}
export const accionDenunciar = (onClick) => ({ icono: Flag, etiqueta: "Denunciar o bloquear", onClick });

export function ReglasConvivencia() {
  return (
    <div className="flex flex-col gap-3">
      {REGLAS_CONVIVENCIA.map(([titulo, texto]) => (
        <div key={titulo}>
          <p style={{ fontWeight: 700, color: "#0B1437", fontSize: "0.9375rem" }}>{titulo}</p>
          <p style={{ color: "#4A5372", fontSize: "0.9375rem", lineHeight: 1.5 }}>{texto}</p>
        </div>
      ))}
    </div>
  );
}

export function ReglasScreen({ onBack }) {
  return <Pagina titulo="Reglas de convivencia" onVolver={onBack}><div className="bg-white" style={{ border: "1px solid #E3E7F1", borderRadius: 20, padding: 16 }}><ReglasConvivencia /></div></Pagina>;
}

// Hoja para denunciar lo que se está mirando. tipo: publicacion | negocio | oficio | alquiler | perfil. id: id público (en un perfil, el usuario).
// Pasos: elegir el motivo → advertencia (qué hace, para qué sirve, qué sucederá) → enviada, con la opción de bloquear (también con advertencia).
export function HojaDenunciar({ tipo, id, nombre, onCerrar, onBloqueado }) {
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [paso, setPaso] = useState("motivo"); // motivo | enviada | bloqueado
  const [dialogo, setDialogo] = useState(null); // "denunciar" | "bloquear"
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [res, setRes] = useState(null);
  const [reglas, setReglas] = useState(false);
  const faltaDetalle = motivo === "otro" && detalle.trim().length < 10;

  const enviar = async () => {
    setCargando(true); setError(null);
    try { setRes(await denunciasApi.denunciar(tipo, id, motivo, detalle.trim())); setPaso("enviada"); }
    catch (e) { setError(e.message); }
    setCargando(false); setDialogo(null);
  };
  const bloquear = async () => {
    setCargando(true); setError(null);
    try { await denunciasApi.bloquear(tipo, id); setPaso("bloqueado"); }
    catch (e) { setError(e.message); }
    setCargando(false); setDialogo(null);
  };

  return (
    <Hoja titulo={paso === "motivo" ? "Denunciar o bloquear" : paso === "enviada" ? "Denuncia enviada" : "Persona bloqueada"} onCerrar={paso === "bloqueado" ? () => { onBloqueado?.(); onCerrar(); } : onCerrar}>
      {paso === "motivo" && (
        <>
          <p className="text-sm mb-3" style={{ color: "#4A5372", lineHeight: 1.5 }}>¿Qué pasa con {nombre ? <b style={{ color: "#0B1437" }}>{nombre}</b> : NOMBRE_TIPO[tipo]}? Elegí el motivo. El equipo de Mi Zona lo revisa y la otra persona <b>no se entera de que fuiste vos</b>.</p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Motivo de la denuncia">
            {MOTIVOS_DENUNCIA.map(([idM, texto, ayuda]) => (
              <button key={idM} type="button" role="radio" aria-checked={motivo === idM} onClick={() => { setMotivo(idM); setError(null); }}
                style={{ ...botonSecundario, justifyContent: "flex-start", textAlign: "left", height: "auto", padding: "10px 14px", flexDirection: "column", alignItems: "flex-start", gap: 2, borderColor: motivo === idM ? "#2350F5" : "#CFD6E8", background: motivo === idM ? "#EDF1FF" : "#fff" }}>
                <span className="flex items-center gap-2">{motivo === idM && <Check size={16} aria-hidden="true" />}{texto}</span>
                <span style={{ fontWeight: 400, fontSize: "0.8125rem", color: "#4A5372" }}>{ayuda}</span>
              </button>
            ))}
          </div>
          {motivo && (
            <div className="mt-3">
              <Campo id="den-detalle" etiqueta={motivo === "otro" ? "Contanos qué pasa" : "Algo más que quieras agregar (opcional)"} contador={`${detalle.length}/500`}>
                <textarea id="den-detalle" value={detalle} onChange={(e) => setDetalle(e.target.value)} rows={3} maxLength={500} style={{ ...caja, resize: "none", lineHeight: 1.5 }} />
              </Campo>
            </div>
          )}
          {error && <p role="alert" className="text-sm mt-2" style={{ color: "#9A3B34" }}>{error}</p>}
          <button type="button" onClick={() => setReglas((v) => !v)} className="text-sm mt-3 flex items-center gap-1.5" style={{ color: "#2350F5", fontWeight: 700, minHeight: 40 }}><BookOpen size={16} aria-hidden="true" />{reglas ? "Ocultar las reglas" : "Ver las reglas de convivencia"}</button>
          {reglas && <div className="mt-2 mb-2"><ReglasConvivencia /></div>}
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={onCerrar} style={{ ...botonSecundario, flex: "1 1 120px" }}>Cancelar</button>
            <button type="button" disabled={!motivo || faltaDetalle} onClick={() => setDialogo("denunciar")} style={{ ...botonPrincipal, flex: "2 1 160px", opacity: !motivo || faltaDetalle ? 0.5 : 1 }}>Continuar</button>
          </div>
        </>
      )}

      {paso === "enviada" && (
        <>
          <div className="flex items-start gap-3 p-3 mb-3" style={{ background: "#E9F8F0", borderRadius: 14 }}>
            <Check size={20} color="#1E8A55" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <p className="text-sm" style={{ color: "#0B1437", lineHeight: 1.5 }}>Gracias por avisarnos. Revisamos tu denuncia <b>{res?.codigo}</b> y, si hace falta, tomamos medidas. Te avisamos cuando la revisemos.</p>
          </div>
          {res?.puedeBloquear && !res?.yaBloqueado && (
            <>
              <p className="text-sm mb-2" style={{ color: "#4A5372", lineHeight: 1.5 }}>Si no querés volver a ver lo que publica esta persona, podés bloquearla ahora.</p>
              {error && <p role="alert" className="text-sm mb-2" style={{ color: "#9A3B34" }}>{error}</p>}
              <button type="button" onClick={() => setDialogo("bloquear")} style={{ ...botonSecundario, width: "100%", borderColor: "#E5B4AF", color: "#9A3B34" }}><UserX size={18} aria-hidden="true" /> Bloquear a esta persona</button>
            </>
          )}
          <button type="button" onClick={onCerrar} style={{ ...botonPrincipal, width: "100%", marginTop: 12 }}>Listo</button>
        </>
      )}

      {paso === "bloqueado" && (
        <>
          <p className="text-sm mb-3" style={{ color: "#4A5372", lineHeight: 1.5 }}>Listo. Ya no vas a ver lo que publica esta persona y ella tampoco ve lo tuyo. Podés desbloquearla cuando quieras desde Ajustes → Usuarios bloqueados.</p>
          <button type="button" onClick={() => { onBloqueado?.(); onCerrar(); }} style={{ ...botonPrincipal, width: "100%" }}>Listo</button>
        </>
      )}

      {dialogo === "denunciar" && (
        <DialogoAdvertencia titulo="¿Enviar la denuncia?" queHace="Manda tu denuncia al equipo de Mi Zona con el motivo que elegiste."
          paraQue="Para que revisen si lo que viste incumple las reglas de convivencia."
          queSucedera="El equipo la revisa. La otra persona no sabe quién denunció. Mientras tanto no se oculta nada: eso lo decide el equipo."
          textoAceptar="Enviar denuncia" cargando={cargando} onAceptar={enviar} onCancelar={() => setDialogo(null)} />
      )}
      {dialogo === "bloquear" && (
        <DialogoAdvertencia titulo="¿Bloquear a esta persona?" queHace="Oculta todo lo que publica esta persona, y lo tuyo para ella."
          paraQue="Para no cruzarte más con ella en Mi Zona."
          queSucedera="Dejás de ver sus negocios, fichas, publicaciones y perfil, y no podrán contactarse. Podés deshacerlo cuando quieras en Ajustes → Usuarios bloqueados."
          textoAceptar="Bloquear" peligro cargando={cargando} onAceptar={bloquear} onCancelar={() => setDialogo(null)} />
      )}
    </Hoja>
  );
}

// Ajustes → Usuarios bloqueados
export function BloqueadosScreen({ onBack }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(null);
  const [quitar, setQuitar] = useState(null);
  const [cargando, setCargando] = useState(false);
  const cargar = () => { setError(null); denunciasApi.bloqueados().then(setLista).catch((e) => setError(e.message)); };
  useEffect(cargar, []);
  const desbloquear = async () => {
    setCargando(true);
    try { await denunciasApi.desbloquear(quitar.id); setLista((l) => l.filter((x) => x.id !== quitar.id)); setQuitar(null); }
    catch (e) { setError(e.message); setQuitar(null); }
    setCargando(false);
  };
  return (
    <Pagina titulo="Usuarios bloqueados" onVolver={onBack}>
      <p className="text-sm mb-3 px-1" style={{ color: "#4A5372", lineHeight: 1.5 }}>Las personas que bloqueás no ven lo que publicás y vos no ves lo que publican. No se enteran de que las bloqueaste.</p>
      {lista === null && !error && <EstadoCarga texto="Cargando…" filas={3} />}
      {error && <EstadoError mensaje={error} onReintentar={cargar} />}
      {lista && !lista.length && <EstadoVacio icono={UserX} titulo="No bloqueaste a nadie" mensaje="Si alguien te molesta, tocá «Denunciar o bloquear» en su ficha, publicación o perfil." />}
      {lista && lista.length > 0 && (
        <div className="bg-white overflow-hidden" style={{ border: "1px solid #E3E7F1", borderRadius: 20 }}>
          {lista.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid #EEF0F6" }}>
              <div className="flex-1 min-w-0"><p style={{ fontWeight: 700, color: "#0B1437" }}>{b.nombre}</p>{b.usuario && <p className="text-sm" style={{ color: "#4A5372" }}>@{b.usuario} · desde {fechaCorta(b.desde)}</p>}</div>
              <button type="button" onClick={() => setQuitar(b)} style={{ ...botonSecundario, minHeight: 44 }}>Desbloquear</button>
            </div>
          ))}
        </div>
      )}
      {quitar && <DialogoAdvertencia titulo={`¿Desbloquear a ${quitar.nombre}?`} queHace="Vuelve a mostrar lo que publica esa persona."
        paraQue="Si ya se resolvió el problema o fue un error." queSucedera="Podrán verse y contactarse otra vez. Podés volver a bloquearla cuando quieras."
        textoAceptar="Desbloquear" cargando={cargando} onAceptar={desbloquear} onCancelar={() => setQuitar(null)} />}
    </Pagina>
  );
}

const ICONO_MEDIDA = { advertencia: ShieldAlert, contenido_oculto: ShieldAlert, suspension: ShieldAlert };
const ESTADO_APELACION = { pendiente: "Apelación enviada: la estamos revisando", aceptada: "Apelación aceptada", rechazada: "Apelación rechazada" };

function duracion(m) {
  if (m.tipo !== "suspension") return "";
  return m.permanente ? "Suspensión permanente" : `Suspensión hasta el ${fechaCorta(m.hasta)}`;
}

// Hoja para apelar una medida. Una sola vez por medida, dentro de los 30 días.
function HojaApelar({ medida, onCerrar, onEnviada }) {
  const [texto, setTexto] = useState("");
  const [dialogo, setDialogo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const enviar = async () => {
    setCargando(true); setError(null);
    try { onEnviada(await moderacionApi.apelar(medida.id, texto.trim())); }
    catch (e) { setError(e.message); setDialogo(false); }
    setCargando(false);
  };
  return (
    <Hoja titulo="Apelar esta decisión" onCerrar={onCerrar}>
      <p className="text-sm mb-3" style={{ color: "#4A5372", lineHeight: 1.5 }}>Si creés que fue un error, contanos por qué. Una persona del equipo lo lee y te responde acá.</p>
      <Campo id="apelacion" etiqueta="Tu explicación" contador={`${texto.length}/1000`}>
        <textarea id="apelacion" value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} maxLength={1000} style={{ ...caja, resize: "none", lineHeight: 1.5 }} />
      </Campo>
      {error && <p role="alert" className="text-sm" style={{ color: "#9A3B34" }}>{error}</p>}
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={onCerrar} style={{ ...botonSecundario, flex: "1 1 120px" }}>Cancelar</button>
        <button type="button" disabled={texto.trim().length < 20} onClick={() => setDialogo(true)} style={{ ...botonPrincipal, flex: "2 1 160px", opacity: texto.trim().length < 20 ? 0.5 : 1 }}>Continuar</button>
      </div>
      {texto.trim().length < 20 && <p className="text-xs mt-2" style={{ color: "#4A5372" }}>Escribí al menos 20 letras.</p>}
      {dialogo && <DialogoAdvertencia titulo="¿Enviar la apelación?" queHace="Manda tu explicación al equipo de Mi Zona."
        paraQue="Para que revisen la decisión de nuevo." queSucedera="Solo se puede apelar una vez por cada decisión. Te avisamos cuando respondan; si aceptan, se deshace la medida."
        textoAceptar="Enviar apelación" cargando={cargando} onAceptar={enviar} onCancelar={() => setDialogo(false)} />}
    </Hoja>
  );
}

// Ajustes → Avisos del equipo: advertencias, contenidos ocultos y suspensiones, con el motivo y cómo apelar
export function AvisosEquipoScreen({ onBack, onVerReglas }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [apelando, setApelando] = useState(null);
  const cargar = () => {
    setError(null);
    moderacionApi.medidas().then((d) => { setDatos(d); d.medidas.filter((m) => !m.vista && m.estado === "activa").forEach((m) => moderacionApi.visto(m.id).catch(() => {})); }).catch((e) => setError(e.message));
  };
  useEffect(cargar, []);
  return (
    <Pagina titulo="Avisos del equipo" onVolver={onBack}>
      {!datos && !error && <EstadoCarga texto="Cargando…" filas={3} />}
      {error && <EstadoError mensaje={error} onReintentar={cargar} />}
      {datos && !datos.medidas.length && <EstadoVacio icono={Check} tono="verde" titulo="Todo en orden" mensaje="El equipo de Mi Zona no te envió ningún aviso. Gracias por cuidar la convivencia." />}
      {datos && datos.medidas.length > 0 && (
        <div className="flex flex-col gap-3">
          {datos.medidas.map((m) => {
            const Icono = ICONO_MEDIDA[m.tipo] || ShieldAlert;
            return (
              <section key={m.id} className="bg-white" style={{ border: `1px solid ${m.estado === "activa" ? "#F2D79A" : "#E3E7F1"}`, borderRadius: 20, padding: 16, opacity: m.estado === "activa" ? 1 : 0.8 }}>
                <h2 className="flex items-center gap-2" style={{ fontWeight: 800, fontSize: "1.0625rem", color: "#0B1437" }}><Icono size={18} aria-hidden="true" />{m.titulo}</h2>
                <p className="text-xs mt-1" style={{ color: "#4A5372" }}>{fechaCorta(m.desde)}{m.estado === "levantada" ? " · Ya no está vigente" : ""}{duracion(m) ? ` · ${duracion(m)}` : ""}</p>
                {m.objeto && <p className="text-sm mt-2" style={{ color: "#0B1437" }}>Contenido: <b>{m.objeto.titulo || m.objeto.tipo}</b></p>}
                <p className="text-sm mt-2" style={{ color: "#4A5372", lineHeight: 1.5 }}><b style={{ color: "#0B1437" }}>Motivo:</b> {m.motivo}</p>
                {m.apelacion && (
                  <div className="mt-3 p-3" style={{ background: "#F3F6FB", borderRadius: 12 }}>
                    <p className="text-sm" style={{ fontWeight: 700, color: "#0B1437" }}>{ESTADO_APELACION[m.apelacion.estado]}</p>
                    {m.apelacion.respuesta && <p className="text-sm mt-1" style={{ color: "#4A5372", lineHeight: 1.5 }}>Respuesta del equipo: {m.apelacion.respuesta}</p>}
                  </div>
                )}
                {m.puedeApelar && <button type="button" onClick={() => setApelando(m)} style={{ ...botonSecundario, marginTop: 12 }}><Scale size={17} aria-hidden="true" /> Apelar esta decisión</button>}
                {!m.puedeApelar && !m.apelacion && m.estado === "activa" && <p className="text-xs mt-3" style={{ color: "#4A5372" }}>Ya pasó el plazo de 30 días para apelar.</p>}
              </section>
            );
          })}
        </div>
      )}
      {onVerReglas && <button type="button" onClick={onVerReglas} style={{ ...botonSecundario, width: "100%", marginTop: 16 }}><BookOpen size={17} aria-hidden="true" /> Reglas de convivencia</button>}
      {apelando && <HojaApelar medida={apelando} onCerrar={() => setApelando(null)} onEnviada={(m) => { setDatos((d) => ({ ...d, medidas: d.medidas.map((x) => (x.id === m.id ? m : x)) })); setApelando(null); }} />}
    </Pagina>
  );
}

// Cuenta suspendida: ocupa la pantalla. Se puede leer el motivo, apelar, descargar datos / eliminar la cuenta (en Privacidad) y salir.
export function PantallaSuspension({ suspension, onVerAvisos, onPrivacidad, onCerrarSesion }) {
  return (
    <div role="alertdialog" aria-modal="true" aria-label="Cuenta suspendida" className="fixed inset-0 z-[90] overflow-y-auto" style={{ background: "#0B1437" }}>
      <div className="max-w-md mx-auto px-5" style={{ paddingTop: "calc(48px + env(safe-area-inset-top, 0px))", paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="bg-white" style={{ borderRadius: 24, padding: 22 }}>
          <span style={{ width: 52, height: 52, borderRadius: 16, background: "#FEEFED", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ShieldAlert size={26} color="#D9423A" aria-hidden="true" /></span>
          <h1 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.375rem", color: "#0B1437", marginTop: 14, lineHeight: 1.2 }}>Tu cuenta está suspendida</h1>
          <p className="text-sm mt-1" style={{ color: "#4A5372" }}>{suspension?.permanente ? "La suspensión es permanente." : suspension?.hasta ? `Hasta el ${fechaCorta(suspension.hasta)}.` : ""}</p>
          {suspension?.motivo && <p className="mt-3" style={{ color: "#0B1437", lineHeight: 1.5 }}><b>Motivo:</b> {suspension.motivo}</p>}
          <p className="text-sm mt-3" style={{ color: "#4A5372", lineHeight: 1.5 }}>Mientras dure, no podés publicar, editar, contactar ni escribir reseñas, y lo que publicaste no se muestra. Si creés que fue un error, podés apelar. También podés descargar tus datos o eliminar tu cuenta.</p>
          <div className="flex flex-col gap-2 mt-5">
            <button type="button" onClick={onVerAvisos} style={botonPrincipal}><Scale size={18} aria-hidden="true" /> Ver el aviso y apelar</button>
            <button type="button" onClick={onPrivacidad} style={botonSecundario}>Descargar mis datos o eliminar la cuenta</button>
            <button type="button" onClick={onCerrarSesion} style={botonSecundario}>Cerrar sesión</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Al abrir la app (o al llegar con ?ir=avisos): si hay un aviso del equipo sin leer, se muestra con el motivo. «Entendido» lo marca como visto.
export function AvisoDelEquipo({ usuario, onVerAvisos }) {
  const [medida, setMedida] = useState(null);
  useEffect(() => {
    if (!usuario) { setMedida(null); return; }
    let vivo = true;
    moderacionApi.medidas().then((d) => { if (vivo) setMedida(d.medidas.find((m) => !m.vista && m.estado === "activa" && m.tipo !== "suspension") || null); }).catch(() => {});
    return () => { vivo = false; };
  }, [usuario?.id]);
  if (!medida) return null;
  const cerrar = () => { moderacionApi.visto(medida.id).catch(() => {}); setMedida(null); };
  return (
    <DialogoAdvertencia titulo={medida.titulo} queHace={medida.objeto ? `Ocultamos «${medida.objeto.titulo || medida.objeto.tipo}».` : "El equipo de Mi Zona te envió una advertencia."}
      paraQue={`Motivo: ${medida.motivo}`} queSucedera={medida.puedeApelar ? "Si creés que fue un error, podés apelar dentro de los 30 días desde Ajustes → Avisos del equipo." : "Podés leerlo de nuevo en Ajustes → Avisos del equipo."}
      textoAceptar={medida.puedeApelar ? "Ver y apelar" : "Entendido"} textoCancelar="Entendido"
      onAceptar={() => { cerrar(); if (medida.puedeApelar) onVerAvisos?.(); }} onCancelar={cerrar} />
  );
}
