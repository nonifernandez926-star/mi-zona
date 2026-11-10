// Cabecera del Inicio, menú lateral y barra inferior.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useState } from "react";
import { Bell, Building2, ChevronDown, Clock, Home, LogOut, MapPin, Menu, MessageCircle, Plus, Search, Send, Settings, Share2, Store, Users, Wrench, X } from "lucide-react";
import { FondoClima } from "../clima.jsx";
import { avisoDeCompartir, compartirTexto, textoInvitacion } from "../compartir.js";
import { HojaCategorias, TarjetaCategorias } from "../hojaCategorias.jsx";
import { CategoriasInicio, PLACEHOLDER, SelectorModo } from "../inicio.jsx";
import { addSearchHistory, getSearchHistory } from "./almacen.js";
import { CAT_OTROS, ITEMS_OTROS, ITEMS_RAPIDOS, QUICK_CATEGORIES } from "./constantes.js";
import { ZonePicker } from "./piezas.jsx";

/* ---------- header público ---------- */

export function PublicHeader({ zone, setZone, query, setQuery, activeCat, setActiveCat, onOpenAllCats, modo, onCambiarModo, catFicha, onCatFicha, tipoFicha, onTipoFicha, onOpenComunidad, onOpenOwner, onHerramientas, onAjustes, onAyuda, onSoporte, esDueno, usuario, onCerrarSesion, notifSinLeer = 0, campanaSacude = 0, onOpenNotificaciones }) {
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [pendingZone, setPendingZone] = useState(zone);
  const [hojaOtros, setHojaOtros] = useState(false); // subpantalla con el resto de los rubros de Negocios
  const [showDrawer, setShowDrawer] = useState(false);
  const [historial, setHistorial] = useState(() => getSearchHistory());
  return (
    <>
      {/* barra superior fija: menú, logo y notificaciones */}
      <div data-conservar-color className="sticky top-0 z-40" style={{ backgroundColor: "var(--azul-oscuro)", boxShadow: "0 2px 14px rgba(11,20,55,0.25)" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDrawer(true)} aria-label="Menú"
              className="flex items-center justify-center shrink-0"
              style={{ width: 38, height: 38, borderRadius: 12, background: "#ffffff1a" }}
            >
              <Menu size={18} color="#fff" />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: 10, background: "linear-gradient(135deg,var(--azul),var(--azul-claro))", boxShadow: "0 4px 12px rgba(var(--azul-rgb),.5)" }}>
                <MapPin size={16} color="#fff" />
              </span>
              <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 19, color: "#fff", letterSpacing: -0.3 }}>
                Mi<span style={{ color: "var(--azul-claro)" }}>Zona</span>
              </span>
            </div>
          </div>
          <button
            onClick={onOpenNotificaciones} aria-label="Notificaciones"
            className="relative flex items-center justify-center shrink-0"
            style={{ width: 38, height: 38, borderRadius: 12, background: "#ffffff1a" }}
          >
            <Bell key={campanaSacude} size={17} color="#fff" style={campanaSacude ? { animation: "zn-sacude .7s ease" } : undefined} />
            {notifSinLeer > 0 && (
              <span
                className="absolute flex items-center justify-center text-[9px] font-bold"
                style={{ top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, background: "#E5484D", color: "#fff", padding: "0 4px", border: "2px solid #0B1437" }}
              >
                {notifSinLeer > 9 ? "9+" : notifSinLeer}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* portada: saludo, buscador y zona */}
      <div data-conservar-color className="relative overflow-hidden" style={{ background: "radial-gradient(420px 220px at 105% -20%, rgba(var(--azul-brillo-rgb),.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(var(--azul-claro-rgb),.22), transparent 60%), var(--azul-oscuro)", borderRadius: "0 0 26px 26px" }}>
        <div style={{ position: "absolute", top: -70, right: -60, width: 220, height: 220, borderRadius: "50%", background: "#ffffff0d" }} />
        <div style={{ position: "absolute", bottom: -30, left: -60, width: 160, height: 160, borderRadius: "50%", background: "rgba(var(--azul-claro-rgb),0.1)" }} />
        <FondoClima zona={zone} />
        <div className="relative max-w-6xl mx-auto px-4 pt-3 pb-12">
          <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 24, color: "#fff", lineHeight: 1.2, letterSpacing: -0.4, textShadow: "0 1px 14px rgba(5,12,40,.55)" }}>
            Descubrí lo mejor<br />de tu zona
          </p>
          <p className="text-sm mt-1.5 mb-4" style={{ color: "#E6EEFF", maxWidth: 380, textShadow: "0 1px 12px rgba(5,12,40,.7), 0 0 2px rgba(5,12,40,.35)" }}>
            Negocios, productos y servicios cerca tuyo, con reseñas reales.
          </p>

          <div className="flex items-center gap-2.5 bg-white px-4" style={{ borderRadius: 16, minHeight: 54, boxShadow: "0 10px 28px rgba(5,20,45,0.35)" }}>
            <Search size={18} color="var(--azul)" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) { addSearchHistory(query); setHistorial(getSearchHistory()); e.target.blur(); } }}
              onBlur={() => { if (query.trim()) { addSearchHistory(query); setHistorial(getSearchHistory()); } }}
              placeholder={PLACEHOLDER[modo] || PLACEHOLDER.negocios}
              className="w-full outline-none text-sm bg-transparent buscador-portada" style={{ color: "#0B1437", WebkitTextFillColor: "#0B1437" }}
            />
            {query && <button onClick={() => setQuery("")} aria-label="Borrar búsqueda"><X size={15} color="#5B6482" /></button>}
          </div>

          {!query && historial.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto">
              {historial.map((h) => (
                <button
                  key={h} onClick={() => setQuery(h)}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 shrink-0"
                  style={{ borderRadius: 20, background: "#ffffff1a", color: "#DCE7FB" }}
                >
                  <Clock size={10} /> {h}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowZoneModal(true)}
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold px-3 py-1.5"
            style={{ color: "#fff", borderRadius: 20, background: "#ffffff1a", border: "1px solid #ffffff26" }}
          >
            <MapPin size={13} color="var(--azul-claro)" /> {zone} <ChevronDown size={12} />
          </button>
        </div>
      </div>

      {showDrawer && (
        <DrawerMenu
          onClose={() => setShowDrawer(false)}
          onHerramientas={() => { setShowDrawer(false); onHerramientas(); }}
          onAjustes={() => { setShowDrawer(false); onAjustes(); }}
          onAyuda={() => { setShowDrawer(false); onAyuda(); }}
          onSoporte={() => { setShowDrawer(false); onSoporte(); }}
          onOpenOwner={() => { setShowDrawer(false); onOpenOwner(); }}
          esDueno={esDueno}
          conSesion={!!usuario}
          onCerrarSesion={() => { setShowDrawer(false); onCerrarSesion?.(); }}
        />
      )}

      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "#0B143766" }} onClick={() => setShowZoneModal(false)}>
          <div className="bg-white w-full max-w-sm p-5" style={{ borderRadius: 14, boxShadow: "0 12px 40px #00000033" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 500, fontSize: 16, color: "#0B1437" }}>¿Dónde estás?</span>
              <button onClick={() => setShowZoneModal(false)} aria-label="Cerrar" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={18} color="#5B6482" aria-hidden="true" /></button>
            </div>
            <ZonePicker value={pendingZone} onChange={setPendingZone} />
            <button
              onClick={() => { if (pendingZone) { setZone(pendingZone); setShowZoneModal(false); } }}
              disabled={!pendingZone}
              className="w-full text-sm font-semibold py-3 mt-4"
              style={{ backgroundColor: "var(--azul)", color: "#fff", borderRadius: 10, opacity: pendingZone ? 1 : 0.5 }}
            >
              Confirmar ubicación
            </button>
          </div>
        </div>
      )}

      {/* categorías: tarjeta flotante que se superpone a la portada */}
      <div className="max-w-6xl mx-auto px-4" style={{ marginTop: -26, position: "relative", zIndex: 5 }}>
        <SelectorModo modo={modo} onCambiar={onCambiarModo} />
        {modo !== "negocios" && <CategoriasInicio modo={modo} cat={catFicha} onCambiar={onCatFicha} tipo={tipoFicha} onTipo={onTipoFicha} />}
        {modo === "negocios" && (
          <div className="mt-3">
            <TarjetaCategorias items={ITEMS_RAPIDOS} valor={activeCat} onTodos={() => setActiveCat(null)} onElegir={(c) => setActiveCat(activeCat === c.id ? null : c.id)} onVerTodas={onOpenAllCats}
              otros={{ activo: !!activeCat && !QUICK_CATEGORIES.some((q) => q.id === activeCat), onClick: () => setHojaOtros(true) }} />
          </div>
        )}
        {/* «Otros»: abre una subpantalla con todos los demás rubros (no se despliegan debajo de los filtros) */}
        {hojaOtros && (
          <HojaCategorias titulo="Otros rubros" ayuda="Elegí un rubro para ver esos negocios." valor={activeCat}
            todo={{ texto: "Todo en «Otros»", activo: activeCat === CAT_OTROS, onClick: () => { setActiveCat(CAT_OTROS); setHojaOtros(false); } }}
            grupos={[{ items: ITEMS_OTROS }]} onElegir={(it) => { setActiveCat(it.id); setHojaOtros(false); }} onCerrar={() => setHojaOtros(false)} />
        )}
        {onOpenComunidad && (
          <button onClick={onOpenComunidad} className="flex items-center gap-2.5 text-left bg-white w-full mt-3" style={{ borderRadius: 18, border: "1px solid #E3E7F1", padding: "11px 12px", minHeight: 64, boxShadow: "0 4px 14px rgba(11,20,55,0.06)" }}>
            <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 13, background: "#DDF3EA" }}><Users size={20} color="#1E6B44" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold leading-tight" style={{ color: "#0B1437" }}>Comunidad</span>
              <span className="block text-[11px] leading-tight mt-0.5" style={{ color: "#5B6482" }}>Avisos, perdidos, regalos y eventos de tu zona</span>
            </span>
          </button>
        )}
      </div>
    </>
  );
}

function DrawerMenu({ onClose, onHerramientas, onAjustes, onAyuda, onSoporte, onOpenOwner, esDueno, conSesion, onCerrarSesion }) {
  const Item = ({ Icon, label, onClick, danger }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-5 py-3 text-left" style={{ color: danger ? "#9A3B34" : "#0B1437" }}>
      <Icon size={18} color={danger ? "#9A3B34" : "#0B1437"} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "#0B143766" }} />
      <div
        className="absolute top-0 left-0 bottom-0 bg-white flex flex-col"
        style={{ width: "min(78vw, 300px)", boxShadow: "6px 0 30px #00000033" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-conservar-color className="p-5 pt-7" style={{ background: "radial-gradient(420px 220px at 105% -20%, rgba(var(--azul-brillo-rgb),.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(var(--azul-claro-rgb),.22), transparent 60%), var(--azul-oscuro)" }}>
          <div
            className="flex items-center justify-center mb-3"
            style={{ width: 54, height: 54, borderRadius: 18, background: "linear-gradient(135deg, var(--azul), var(--azul-claro))", boxShadow: "0 8px 20px rgba(var(--azul-rgb),.45)" }}
          >
            <MapPin size={26} color="#fff" />
          </div>
          <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 18, color: "#fff" }}>Mi<span style={{ color: "var(--azul-palido)" }}>Zona</span></p>
          <p className="text-xs mt-0.5" style={{ color: "var(--azul-palido)" }}>Explorá los negocios de tu zona</p>
        </div>
        <div className="py-2 flex-1 overflow-y-auto">
          <Item Icon={Wrench} label="Herramientas" onClick={onHerramientas} />
          <Item Icon={Settings} label="Ajustes" onClick={onAjustes} />
          <Item Icon={Building2} label={esDueno ? "Mi negocio" : "Ofrecer algo en Mi Zona"} onClick={onOpenOwner} />
          <div style={{ borderTop: "1px solid #EEF0F6", margin: "8px 0" }} />
          <Item Icon={Share2} label="Invitar amigos" onClick={async () => {
            const aviso = avisoDeCompartir(await compartirTexto({ titulo: "Mi Zona", texto: textoInvitacion("") }));
            if (aviso) alert(aviso);
            onClose();
          }} />
          <Item Icon={MessageCircle} label="Centro de ayuda" onClick={onAyuda} />
          <Item Icon={Send} label="Soporte" onClick={onSoporte} />
          {/* solo con la sesión iniciada; pide la misma confirmación que Ajustes */}
          {conSesion && <Item Icon={LogOut} label="Cerrar sesión" onClick={onCerrarSesion} danger />}
        </div>
        <button onClick={onClose} className="flex items-center gap-1.5 justify-center text-xs font-medium py-4" style={{ color: "#5B6482", borderTop: "1px solid #EEF0F6" }}>
          <X size={13} /> Cerrar menú
        </button>
      </div>
    </div>
  );
}

export function BottomNav({ active, onInicio, onChats, onAdd, onNegocio, onHerramientas, onAjustes, chatsSinLeer, mostrarNegocio }) {
  // Barra flotante como la de Mi Asistente: cuatro pestañas (dos a cada lado) y el «+» al medio, siempre centrado.
  // Comunidad vive dentro de Chats: estando en Comunidad, la pestaña Chats queda marcada. La tercera pestaña es «Negocio» cuando la cuenta
  // tiene un negocio, oficio o alquiler; si no, «Herramientas».
  const Item = ({ id, label, Icon, onClick, badge }) => {
    const on = active === id || (id === "chats" && active === "comunidad");
    return (
      <button onClick={onClick} aria-current={on ? "page" : undefined} className="flex flex-col items-center gap-0.5 py-1 relative min-w-0" style={{ flex: 1, minHeight: 54 }}>
        <span className="relative flex items-center justify-center" style={{ width: 48, height: 30, borderRadius: 15, background: on ? "linear-gradient(135deg,#e3eaff,#d3dfff)" : "transparent", transition: "background .2s ease" }}>
          <Icon size={20} color={on ? "var(--azul)" : "#667085"} strokeWidth={on ? 2.3 : 1.9} />
          {badge > 0 && (
            <span
              className="absolute flex items-center justify-center text-[9px] font-bold"
              style={{ top: -4, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: "#E5484D", color: "#fff", padding: "0 4px", border: "2px solid #fff" }}
            >
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </span>
        <span className="whitespace-nowrap" style={{ fontSize: 10.5, letterSpacing: "-0.1px", color: on ? "var(--azul)" : "#667085", fontWeight: on ? 800 : 600 }}>{label}</span>
      </button>
    );
  };
  return (
    <>
    {/* Franja de abajo: la barra flota 10px sobre el borde y por ahí se asomaba el fondo claro de la pantalla (una línea blanca contra la barra
        de Android). Esta tira del mismo azul que la barra de Android la rellena y queda detrás de la barra blanca (no cambia cómo se ve). */}
    <div aria-hidden="true" data-conservar-color className="fixed left-0 right-0 bottom-0 pointer-events-none" style={{ zIndex: 39, height: "calc(11px + env(safe-area-inset-bottom, 0px))", background: "#0B1437" }} />
    <div className="fixed bottom-0 left-0 right-0 z-40" style={{ left: 10, right: 10, bottom: "calc(10px + env(safe-area-inset-bottom, 0px))", background: "#fff", borderRadius: 24, border: "1px solid #edf0f8", boxShadow: "0 14px 38px rgba(15,22,55,0.18)" }}>
      {/* botón «+» elevado, centrado sobre la barra: agregar negocio, oficio o alquiler. Va dentro de la barra (position absolute) para no moverse nunca. */}
      <button
        onClick={onAdd} aria-label="Agregar negocio, oficio o alquiler"
        className="absolute flex items-center justify-center"
        style={{
          left: "50%", transform: "translateX(-50%)", top: -24, width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg,#2b5bff,#1638c9)", boxShadow: "0 12px 24px -6px rgba(36,84,255,0.6)", border: "4px solid #fff", zIndex: 41,
        }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.6} />
      </button>
      <nav aria-label="Secciones" className="mx-auto flex items-center" style={{ padding: "6px 6px" }}>
        <Item id="inicio" label="Inicio" Icon={Home} onClick={onInicio} />
        <Item id="chats" label="Chats" Icon={MessageCircle} onClick={onChats} badge={chatsSinLeer} />
        <div style={{ width: 64, flexShrink: 0 }} />
        {mostrarNegocio
          ? <Item id="negocio" label="Negocio" Icon={Store} onClick={onNegocio} />
          : <Item id="herramientas" label="Herramientas" Icon={Wrench} onClick={onHerramientas} />}
        <Item id="ajustes" label="Ajustes" Icon={Settings} onClick={onAjustes} />
      </nav>
    </div>
    </>
  );
}
