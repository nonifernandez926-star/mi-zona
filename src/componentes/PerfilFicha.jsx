import { useState } from "react";
import { BotonAtras } from "../cuenta.jsx";

// Perfil de una ficha con la MISMA estructura que el perfil de un negocio:
// portada con botones flotantes → tarjeta de identidad (logo, nombre, estado, números, contacto) → pestañas → botón principal.
// Lo usan los alquileres; los oficios pueden usarlo igual.
//
// portada: url o null (sin foto se dibuja un fondo de color con el ícono)
// stats: [{ icono, color, valor, etiqueta }] (hasta 3, de a tres en fila)
// acciones: [{ icono, label, color, href | onClick }] contacto directo (fila de arriba)
// redes: [{ icono, label, color, href }] (de a dos; si queda uno solo ocupa todo el ancho)
// flotantes: [{ icono, etiqueta, onClick, activo }] botones redondos arriba a la derecha (compartir, denunciar, favorito)
// tabs: [{ id, label, contenido }] · cta: botón grande al final · avisos: bloques entre la tarjeta y las pestañas

const tinte = (c, pct) => (String(c).startsWith("var(") ? `color-mix(in srgb, ${c} ${pct}%, transparent)` : `${c}${Math.round(pct * 2.55).toString(16).padStart(2, "0")}`);
const botonFlotante = { width: 44, height: 44, borderRadius: 14, background: "#ffffffee", boxShadow: "0 4px 14px rgba(0,0,0,.25)" };

function BotonAccion({ icono: Icono, label, color, href, onClick, ancho }) {
  const estilo = { borderRadius: 14, background: tinte(color, 8), gridColumn: ancho ? "span 2" : undefined, minHeight: 48 };
  const contenido = (<><Icono size={17} color={color} aria-hidden="true" /><span className="text-xs font-semibold" style={{ color: "#0B1437" }}>{label}</span></>);
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3" style={estilo}>{contenido}</a>
    : <button type="button" onClick={onClick} className="flex items-center justify-center gap-2 py-3" style={estilo}>{contenido}</button>;
}

export default function PerfilFicha({ portada, logo, icono: Icono, color = "#2350F5", nombre, linea, estado, dueno, onAbrirDueno, stats = [], acciones = [], redes = [], flotantes = [], avisos, tabs = [], cta, onVolver, chipEstado }) {
  const [tab, setTab] = useState(tabs[0]?.id);
  const [falla, setFalla] = useState(false);
  const activa = tabs.find((t) => t.id === tab) || tabs[0];
  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh" }}>
      <div className="max-w-3xl mx-auto">
        {/* portada con botones flotantes */}
        <div style={{ position: "relative", height: 270, overflow: "hidden", background: `linear-gradient(135deg, ${tinte(color, 90)}, ${tinte(color, 55)})` }}>
          {portada && !falla
            ? <img src={portada} alt="" onError={() => setFalla(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true"><Icono size={64} color="#ffffffcc" /></span>}
          <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 110, background: "linear-gradient(to bottom, rgba(8,18,38,0.55), rgba(8,18,38,0))" }} />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4" style={{ zIndex: 5, paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
            <BotonAtras onClick={onVolver} tono="foto" size={44} />
            <div className="flex items-center gap-2.5">
              {flotantes.map(({ icono: I, etiqueta, onClick, activo }) => (
                <button key={etiqueta} type="button" onClick={onClick} aria-label={etiqueta} aria-pressed={activo === undefined ? undefined : !!activo} className="flex items-center justify-center" style={botonFlotante}>
                  <I size={17} color={activo ? "#E5484D" : "#0B1437"} fill={activo ? "#E5484D" : "none"} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4">
          {/* tarjeta de identidad */}
          <div className="bg-white relative p-4 mb-4" style={{ borderRadius: 24, marginTop: -30, boxShadow: "0 12px 32px rgba(11,20,55,0.12)", border: "1px solid #E3E7F1" }}>
            <div className="flex items-start gap-3.5">
              <span className="flex items-center justify-center shrink-0 overflow-hidden" style={{ width: 66, height: 66, borderRadius: 22, background: color, marginTop: -36, border: "4px solid #fff", boxShadow: "0 8px 18px rgba(11,20,55,.25)" }}>
                {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : <Icono size={28} color="#fff" aria-hidden="true" />}
              </span>
              <div className="flex-1 min-w-0">
                <h1 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 21, color: "#0B1437", lineHeight: 1.2, overflowWrap: "anywhere" }}>{nombre}</h1>
                <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "#5B6482" }}>
                  <span className="rounded-full inline-block shrink-0" style={{ width: 7, height: 7, background: color }} /> <span>{linea}</span>
                </p>
                {chipEstado && <div className="mt-1.5">{chipEstado}</div>}
                {estado && !chipEstado && <div className="mt-1.5">{estado}</div>}
                {dueno && onAbrirDueno && (
                  <button type="button" onClick={() => onAbrirDueno(dueno)} className="mt-1.5 text-xs font-semibold flex items-center" style={{ color: "var(--azul)", minHeight: 32 }}>Dueño: @{dueno}</button>
                )}
              </div>
            </div>

            {stats.length > 0 && (
              <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
                {stats.map(({ icono: I, color: c, valor, etiqueta }) => (
                  <div key={etiqueta} className="text-center py-2" style={{ borderRadius: 14, background: "#F6F9FD" }}>
                    <span className="flex items-center justify-center gap-1" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 16, color: "#0B1437" }}>
                      <I size={13} color={c} aria-hidden="true" /> {valor}
                    </span>
                    <span className="block text-[10px] mt-0.5" style={{ color: "#5B6482" }}>{etiqueta}</span>
                  </div>
                ))}
              </div>
            )}

            {(acciones.length > 0 || redes.length > 0) && (
              <div className="mt-3 flex flex-col gap-2">
                {acciones.length > 0 && (
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${acciones.length}, minmax(0, 1fr))` }}>
                    {acciones.map((a) => <BotonAccion key={a.label} {...a} />)}
                  </div>
                )}
                {redes.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {redes.map((a, n) => <BotonAccion key={a.label} {...a} ancho={redes.length % 2 === 1 && n === redes.length - 1} />)}
                  </div>
                )}
              </div>
            )}
          </div>

          {avisos && <div className="flex flex-col gap-3 mb-4">{avisos}</div>}

          {/* pestañas */}
          {tabs.length > 0 && (
            <>
              <div className="flex items-center gap-1 p-1 mb-5" role="tablist" style={{ borderRadius: 16, background: "#E8EEF7" }}>
                {tabs.map((t) => (
                  <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className="flex-1 py-2 text-sm font-semibold transition-all" style={{ borderRadius: 12, minHeight: 40, background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "#0B1437" : "#5B6482", boxShadow: tab === t.id ? "0 1px 2px rgba(11,20,55,.10), 0 4px 10px -2px rgba(11,20,55,.14)" : "none" }}>{t.label}</button>
                ))}
              </div>
              <div className="pb-6" role="tabpanel">{activa?.contenido}</div>
            </>
          )}

          {cta && <div className="flex flex-col gap-2" style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))" }}>{cta}</div>}
        </div>
      </div>
    </div>
  );
}

// Tarjeta blanca para agrupar información dentro de una pestaña (mismo aspecto que las tarjetas del perfil de negocio)
export function TarjetaInfo({ titulo, icono: I, children }) {
  return (
    <section className="bg-white mb-4" style={{ borderRadius: 18, border: "1px solid #E3E7F1", boxShadow: "0 4px 14px rgba(11,20,55,0.05)", padding: 16 }}>
      {titulo && (
        <h2 className="flex items-center gap-2 mb-2.5" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 16, color: "#0B1437" }}>
          {I && <I size={16} aria-hidden="true" />} {titulo}
        </h2>
      )}
      <div style={{ fontSize: "0.9375rem", color: "#1F2937", lineHeight: 1.55 }}>{children}</div>
    </section>
  );
}
