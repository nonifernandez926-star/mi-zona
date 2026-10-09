// Pantalla Ajustes → Apariencia (mismas opciones que Mi Asistente, más control de la portada de inicio).
import { Sun, Moon, Smartphone, Check, Sparkles, Zap, RotateCcw } from "lucide-react";
import { ACENTOS, useApariencia, guardarApariencia, restablecerApariencia } from "./apariencia.js";
import { tonoDe } from "./tonos.js";
import { BotonVolver, Etiqueta, TARJETA_SEG } from "./cuenta.jsx";

const TITULO = { fontFamily: "var(--fuente-titulo)", color: "#0B1437" };

function Fila({ Icon, titulo, desc, activa, onClick, derecha }) {
  const t = tonoDe(Icon);
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left bg-white hover:bg-slate-50" style={{ borderBottom: "1px solid #EEF0F6" }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 13, background: t.bg, boxShadow: `inset 0 0 0 1px ${t.aro}` }}><Icon size={19} color={t.fg} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold" style={{ color: "#0B1437" }}>{titulo}</span>
        <span className="block text-xs mt-0.5" style={{ color: "#5B6482", lineHeight: 1.4 }}>{desc}</span>
      </span>
      {derecha || (
        <span className="flex items-center justify-center shrink-0" style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${activa ? "var(--azul)" : "#CFD6E8"}`, background: activa ? "var(--azul)" : "transparent" }}>
          {activa && <Check size={13} color="#fff" strokeWidth={3.4} />}
        </span>
      )}
    </button>
  );
}

function Interruptor({ activo, onChange, etiqueta }) {
  return (
    <span role="switch" aria-checked={activo} aria-label={etiqueta} tabIndex={0} onKeyDown={(e) => (e.key === " " || e.key === "Enter") && onChange(!activo)}
      className="shrink-0 relative" style={{ width: 50, height: 30, borderRadius: 15, background: activo ? "var(--azul)" : "#CBD3E1", transition: "background .2s", display: "inline-block" }}>
      <span className="absolute" style={{ top: 3, left: activo ? 23 : 3, width: 24, height: 24, borderRadius: 12, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.25), 0 3px 8px -1px rgba(0,0,0,.2)", transition: "left .24s cubic-bezier(0.22,1,0.36,1)" }} />
    </span>
  );
}

export function AparienciaScreen({ onBack }) {
  const cfg = useApariencia();
  const TEMAS = [
    { id: "claro", titulo: "Claro", desc: "Fondo blanco, ideal de día.", Icon: Sun },
    { id: "oscuro", titulo: "Oscuro", desc: "Descansa la vista de noche.", Icon: Moon },
    { id: "auto", titulo: "Automático", desc: "Sigue el modo de tu celular.", Icon: Smartphone },
  ];
  return (
    <div>
      <BotonVolver texto="Volver a Ajustes" onClick={onBack} />
      <h2 style={{ ...TITULO, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }} className="mb-1">Apariencia</h2>
      <p className="text-sm mb-4" style={{ color: "#5B6482" }}>Elegí cómo querés ver Mi Zona. Se guarda en este celular.</p>

      {/* vista previa en vivo */}
      <div className="overflow-hidden mb-1" style={{ ...TARJETA_SEG }}>
        <div className="flex items-center gap-2 px-4 py-2.5" data-conservar-color style={{ background: "#0B1437" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--azul)" }} />
          <b className="text-xs" style={{ color: "#fff" }}>Así se va a ver</b>
        </div>
        <div className="flex items-center gap-3 p-4">
          <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 14, background: "var(--azul-suave)" }}><Sparkles size={19} color="var(--azul)" /></span>
          <span className="min-w-0"><strong className="block text-sm" style={{ color: "#0B1437" }}>Tu zona, a tu manera</strong><span className="block text-xs" style={{ color: "#5B6482" }}>Así se ven los botones, los avisos y los íconos.</span></span>
        </div>
        <div className="flex items-center gap-2 px-4 pb-4">
          <span className="text-xs font-bold px-4 py-2.5" style={{ borderRadius: 12, color: "#fff", backgroundImage: "linear-gradient(180deg, var(--azul-g1), var(--azul-g2))", boxShadow: "0 6px 14px rgba(var(--azul-rgb), .25)" }}>Probar</span>
          <span className="text-xs font-bold px-3 py-2" style={{ borderRadius: 999, color: "var(--azul)", background: "var(--azul-suave)" }}>Gastronomía</span>
        </div>
      </div>

      <Etiqueta>Tema</Etiqueta>
      <div className="overflow-hidden" style={TARJETA_SEG}>{TEMAS.map((o) => <Fila key={o.id} {...o} activa={cfg.tema === o.id} onClick={() => guardarApariencia({ tema: o.id })} />)}</div>

      <Etiqueta>Color de acento</Etiqueta>
      <div className="p-4" style={TARJETA_SEG}>
        <div className="grid grid-cols-5 gap-x-2 gap-y-3">
          {Object.entries(ACENTOS).map(([id, a]) => (
            <button key={id} onClick={() => guardarApariencia({ acento: id })} aria-label={a.nombre} aria-pressed={cfg.acento === id} className="flex flex-col items-center gap-1.5">
              <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(180deg, ${a.g1}, ${a.g2})`, boxShadow: cfg.acento === id ? `0 0 0 3px #fff, 0 0 0 5px ${a.main}` : "inset 0 1px 0 rgba(255,255,255,.3)", transition: "box-shadow .2s" }}>
                {cfg.acento === id && <Check size={20} color="#fff" strokeWidth={3} />}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: cfg.acento === id ? "#0B1437" : "#5B6482" }}>{a.nombre}</span>
            </button>
          ))}
        </div>
        <p className="text-xs mt-3.5" style={{ color: "#5B6482", lineHeight: 1.45 }}>Cambia el color de los botones, los íconos y textos destacados y los fondos suaves. Las cabeceras oscuras no cambian.</p>
      </div>

      <Etiqueta>Tamaño del texto</Etiqueta>
      <div className="p-3" style={TARJETA_SEG}>
        <div className="flex gap-1.5 p-1" style={{ borderRadius: 14, background: "#F3F5FA" }}>
          {[["normal", "Normal"], ["grande", "Grande"], ["extra", "Muy grande"]].map(([id, n]) => (
            <button key={id} onClick={() => guardarApariencia({ texto: id })} className="flex-1 text-sm font-semibold py-2.5"
              style={{ borderRadius: 11, background: cfg.texto === id ? "#fff" : "transparent", color: cfg.texto === id ? "var(--azul)" : "#5B6482", boxShadow: cfg.texto === id ? "0 1px 2px rgba(11,20,55,.1), 0 4px 10px -2px rgba(11,20,55,.1)" : "none" }}>{n}</button>
          ))}
        </div>
      </div>

      <Etiqueta>Movimiento</Etiqueta>
      <div className="overflow-hidden" style={TARJETA_SEG}>
        <Fila Icon={Zap} titulo="Reducir animaciones" desc="Menos movimiento en pantallas, transiciones y la portada." onClick={() => guardarApariencia({ movimiento: cfg.movimiento === "reducido" ? "normal" : "reducido" })}
          derecha={<Interruptor activo={cfg.movimiento === "reducido"} onChange={(v) => guardarApariencia({ movimiento: v ? "reducido" : "normal" })} etiqueta="Reducir animaciones" />} />
      </div>

      <button onClick={restablecerApariencia} className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 mt-5" style={{ borderRadius: 14, background: "#EDF1FF", color: "var(--azul)" }}>
        <RotateCcw size={16} /> Restablecer apariencia
      </button>
    </div>
  );
}
