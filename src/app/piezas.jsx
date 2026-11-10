// Piezas visuales chicas que se reutilizan en varias pantallas: foto, etiquetas, estrellas, zona, ventanas de confirmación, horarios.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useEffect, useState } from "react";
import { Bell, Home, ImageIcon, MapPin, Search, Star, X } from "lucide-react";
import { BotonVolver } from "../cuenta.jsx";
import { HojaCategorias } from "../hojaCategorias.jsx";
import { DAYS, ITEMS_TODOS } from "./constantes.js";
import { catInfo, fetchLocalidades, fetchProvincias, isOpenNow } from "./utilidades.js";

// (La subida de fotos a Cloudinary está en subirFoto.js)

/* ---------- piezas visuales chicas ---------- */

export function Photo({ cat, src, height = 128, radius = "10px 10px 0 0", iconSize = 34, onOpen, clickable = true }) {
  const c = catInfo(cat);
  const Icon = c?.icon || Home;
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    const img = <img src={src} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />;
    if (!clickable) {
      return (
        <div className="relative overflow-hidden shrink-0 w-full" style={{ height, borderRadius: radius }}>
          {img}
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpen && onOpen(src); }}
        className="relative overflow-hidden shrink-0 w-full"
        style={{ height, borderRadius: radius }}
      >
        {img}
      </button>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center relative overflow-hidden shrink-0 gap-1 px-2 text-center"
      style={{ height, background: failed ? "#FDF1EF" : `radial-gradient(120% 90% at 85% 0%, ${c?.color}2e, transparent 60%), linear-gradient(160deg, ${c?.color}1f, ${c?.color}0a 70%, #ffffff00)`, borderRadius: radius }}
    >
      {failed ? (
        <>
          <ImageIcon size={Math.min(iconSize, 22)} color="#9A3B34" strokeWidth={1.5} />
          <span className="text-[10px] leading-tight" style={{ color: "#9A3B34" }}>El link de esta foto no funciona</span>
        </>
      ) : (
        iconSize >= 40
          ? <span className="flex items-center justify-center" style={{ width: iconSize * 1.9, height: iconSize * 1.9, borderRadius: "30%", background: "#ffffffb8", boxShadow: `0 10px 28px ${c?.color}33, inset 0 0 0 1px ${c?.color}22` }}><Icon size={iconSize} color={c?.color} strokeWidth={1.4} /></span>
          : <Icon size={iconSize} color={c?.color} strokeWidth={1.5} />
      )}
    </div>
  );
}

export function OpenBadge({ weekHours }) {
  const open = isOpenNow(weekHours);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1"
      style={{ borderRadius: 20, color: open ? "#1E6B44" : "#9A3B34", background: open ? "#E4F3EA" : "#FDF1EF" }}
    >
      <span className="rounded-full" style={{ width: 6, height: 6, backgroundColor: open ? "#2C9A5F" : "#C1443A" }} />
      {open ? "Abierto ahora" : "Cerrado"}
    </span>
  );
}

function StatusBadge({ status }) {
  const active = status === "active";
  return (
    <span
      className="text-xs font-medium px-2 py-0.5"
      style={{ borderRadius: 12, color: active ? "#1E6B44" : "#7A7D87", background: active ? "#E4F3EA" : "#EEEDE7" }}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

export function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`} aria-pressed={n <= value} style={{ padding: 6, margin: -6 }}>
          <Star size={26} color={n <= value ? "var(--azul)" : "#D1D5DB"} fill={n <= value ? "var(--azul)" : "none"} />
        </button>
      ))}
    </div>
  );
}

/* ---------- selector de Provincia + Localidad (toda Argentina, vía API oficial) ---------- */

export function ZonePicker({ value, onChange, dark = false, compact = false, id }) {
  const [provincias, setProvincias] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [provinciaId, setProvinciaId] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [loadingLoc, setLoadingLoc] = useState(false);

  useEffect(() => {
    fetchProvincias().then(setProvincias);
  }, []);

  // si `value` ya trae "Localidad, Provincia" (o venimos de la lista de respaldo), tratamos de ubicar la provincia
  useEffect(() => {
    if (!value || provincias.length === 0 || provinciaId) return;
    const partes = value.split(",").map((s) => s.trim());
    const nombreProv = partes[1] || partes[0];
    const match = provincias.find((p) => p.nombre.toLowerCase() === nombreProv.toLowerCase());
    if (match) { setProvinciaId(match.id); setLocalidad(partes[0]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, provincias]);

  useEffect(() => {
    if (!provinciaId) { setLocalidades([]); return; }
    setLoadingLoc(true);
    fetchLocalidades(provinciaId).then((list) => { setLocalidades(list); setLoadingLoc(false); });
  }, [provinciaId]);

  const inputCls = "appearance-none px-3";
  const style = dark
    ? { borderRadius: 12, backgroundColor: "#ffffff15", color: "#fff", border: "1px solid #ffffff30", minHeight: 48, fontSize: "1rem" }
    : { borderRadius: 12, backgroundColor: "#fff", color: "#0B1437", border: "1px solid #CFD6E8", minHeight: 48, fontSize: "1rem" };

  return (
    <div className={compact ? "flex gap-2" : "flex flex-col gap-2 sm:flex-row"}>
      <select
        id={id} aria-label="Provincia"
        value={provinciaId}
        onChange={(e) => { setProvinciaId(e.target.value); setLocalidad(""); }}
        className={inputCls} style={{ ...style, flex: 1 }}
      >
        <option value="" style={{ color: "#0B1437" }}>Provincia...</option>
        {provincias.map((p) => <option key={p.id} value={p.id} style={{ color: "#0B1437" }}>{p.nombre}</option>)}
      </select>
      <select
        aria-label="Localidad"
        value={localidad}
        disabled={!provinciaId || loadingLoc}
        onChange={(e) => {
          const loc = e.target.value;
          setLocalidad(loc);
          const prov = provincias.find((p) => p.id === provinciaId);
          if (loc && prov) onChange(`${loc}, ${prov.nombre}`);
        }}
        className={inputCls} style={{ ...style, flex: 1, opacity: !provinciaId || loadingLoc ? 0.6 : 1 }}
      >
        <option value="" style={{ color: "#0B1437" }}>{loadingLoc ? "Cargando..." : "Localidad..."}</option>
        {localidades.map((l) => <option key={l} value={l} style={{ color: "#0B1437" }}>{l}</option>)}
      </select>
    </div>
  );
}

export function TagInput({ values, onChange, placeholder, id }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setText("");
  };
  return (
    <div>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2 mb-2" aria-label="Agregados">
          {values.map((v) => (
            <li key={v} className="flex items-center" style={{ background: "#EDF1FF", color: "#1B3FB8", borderRadius: 999, minHeight: 44, paddingLeft: 14, fontSize: "0.9375rem", fontWeight: 600 }}>
              <span style={{ wordBreak: "break-word" }}>{v}</span>
              <button type="button" aria-label={`Quitar ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={16} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id} value={text} onChange={(e) => setText(e.target.value)} maxLength={80}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 0, minHeight: 48, border: "1px solid #CFD6E8", borderRadius: 12, padding: "11px 14px", font: "inherit", fontSize: "1rem", background: "#fff", color: "#0B1437" }}
        />
        <button type="button" onClick={add} disabled={!text.trim()} style={{ minHeight: 48, padding: "0 16px", borderRadius: 14, border: "1px solid #CFD6E8", background: "#fff", color: "#0B1437", fontWeight: 700, fontSize: "0.9375rem", opacity: text.trim() ? 1 : 0.5 }}>
          Agregar
        </button>
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, confirmLabel = "Confirmar", danger, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "#0B1437cc" }} onClick={onCancel}>
      <div className="bg-white w-full max-w-sm p-6" style={{ borderRadius: 24 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em", color: "#0B1437" }}>{title}</h3>
        <p className="text-sm mt-2 mb-6" style={{ color: "#5B6482", lineHeight: 1.55 }}>{message}</p>
        <div className="flex gap-2.5 justify-end">
          <button onClick={onCancel} className="text-sm font-semibold px-4 py-2.5" style={{ borderRadius: 12, border: "1px solid #E3E7F1", background: "#fff", color: "#0B1437" }}>Cancelar</button>
          <button
            onClick={onConfirm}
            className="text-sm font-semibold px-4 py-2.5"
            style={{ borderRadius: 12, backgroundColor: danger ? "#C1443A" : "#0B1437", color: "#fff" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Lightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: "#0A0C12ee" }} onClick={onClose}>
      <button onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 text-white" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={26} aria-hidden="true" /></button>
      <img src={src} alt="" className="max-w-full max-h-full object-contain" style={{ borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

export function AllPhotosModal({ photos, cat, onOpenPhoto, onClose }) {
  return (
    <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center" style={{ background: "#0B1437cc" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto p-5" style={{ borderRadius: "16px 16px 0 0" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 18 }}>{photos.length} fotos</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={20} aria-hidden="true" /></button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((src, i) => (
            <Photo key={i} cat={cat} src={src} height={120} radius="10px" iconSize={20} onOpen={onOpenPhoto} />
          ))}
        </div>
      </div>
    </div>
  );
}

// «Ver todas»: la misma subpantalla que «Otros», pero con todos los rubros (también la usa el filtro «Rubro» del mapa)
export function CategoryModal({ activeCat, onSelect, onClose }) {
  return (
    <HojaCategorias titulo="Todos los rubros" ayuda="Elegí un rubro para ver esos negocios." valor={activeCat}
      todo={{ texto: "Todo en Negocios", activo: !activeCat, onClick: () => onSelect(null) }}
      grupos={[{ items: ITEMS_TODOS }]} onElegir={(it) => onSelect(it.id)} onCerrar={onClose} />
  );
}

function WeekHoursEditor({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      {DAYS.map((day, i) => {
        const entry = value[i];
        const closed = !entry || entry[0] === null;
        return (
          <div key={day} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0" style={{ color: "#1F2937" }}>{day.slice(0, 3)}</span>
            <label className="flex items-center gap-1">
              <input
                type="checkbox" checked={closed}
                onChange={(e) => onChange(value.map((d, idx) => (idx === i ? (e.target.checked ? [null] : [9, 20]) : d)))}
              />
              Cerrado
            </label>
            {!closed && (
              <>
                <input
                  type="number" value={entry[0]}
                  onChange={(e) => onChange(value.map((d, idx) => (idx === i ? [Number(e.target.value), entry[1]] : d)))}
                  className="w-14 border px-1 py-0.5" style={{ borderRadius: 4, borderColor: "#E3E7F1" }}
                />
                <span>a</span>
                <input
                  type="number" value={entry[1]}
                  onChange={(e) => onChange(value.map((d, idx) => (idx === i ? [entry[0], Number(e.target.value)] : d)))}
                  className="w-14 border px-1 py-0.5" style={{ borderRadius: 4, borderColor: "#E3E7F1" }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- pantallas con botón de retroceder ---------- */

// Subpantalla dentro de una pestaña (Herramientas, Ajustes...): "← Volver a ..." y su título
export function SubPantalla({ titulo, desc, onBack, volverA = "Herramientas", children }) {
  return (
    <div>
      <BotonVolver texto={`Volver a ${volverA}`} onClick={onBack} />
      <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 20, color: "#0B1437" }}>{titulo}</h2>
      {desc && <p className="text-xs mt-0.5" style={{ color: "#5B6482" }}>{desc}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

// Barra de arriba de Chats, Herramientas y Ajustes: solo el título (son pestañas, como Inicio, no llevan flecha)

/* Icono de Apariencia: mitad sol, mitad luna */
export function IconoSolLuna({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <clipPath id="zmIzq"><rect x="0" y="0" width="12" height="24" /></clipPath>
        <clipPath id="zmDer"><rect x="12" y="0" width="12" height="24" /></clipPath>
        <linearGradient id="zmSol" x1="0" y1="3" x2="0" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#FBBF24" /><stop offset="1" stopColor="#F59E0B" /></linearGradient>
        <linearGradient id="zmLuna" x1="0" y1="3" x2="0" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#6366F1" /><stop offset="1" stopColor="#4338CA" /></linearGradient>
      </defs>
      <circle cx="12" cy="12" r="6.6" fill="url(#zmSol)" clipPath="url(#zmIzq)" />
      <circle cx="12" cy="12" r="6.6" fill="url(#zmLuna)" clipPath="url(#zmDer)" />
      <g stroke="#F59E0B" strokeWidth="1.9" strokeLinecap="round" clipPath="url(#zmIzq)">
        <path d="M12 1.6v1.8" /><path d="M12 20.6v1.8" /><path d="M4.6 4.6l1.3 1.3" /><path d="M4.6 19.4l1.3-1.3" /><path d="M1.6 12h1.8" />
      </g>
      <path d="M15.2 9.2a3.4 3.4 0 1 0 3.2 4.6 3 3 0 0 1-3.2-4.6Z" fill="#fff" opacity=".95" />
      <circle cx="19.2" cy="8.4" r=".9" fill="var(--azul-palido)" /><circle cx="17.4" cy="17.6" r=".7" fill="var(--azul-palido)" />
      <path d="M12 5.4v13.2" stroke="#fff" strokeWidth="1.1" opacity=".9" />
    </svg>
  );
}

export function BarraTitulo({ titulo, sub, notifSinLeer = 0, onOpenNotificaciones, buscador }) {
  return (
    <div data-conservar-color className="sticky top-0 z-40" style={{ background: "radial-gradient(420px 220px at 105% -20%, rgba(var(--azul-brillo-rgb),.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(var(--azul-claro-rgb),.22), transparent 60%), var(--azul-oscuro)", borderRadius: "0 0 26px 26px", boxShadow: "0 10px 28px rgba(var(--azul-rgb),.24)" }}>
      <div className="max-w-6xl mx-auto px-4 pt-3 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 11, background: "linear-gradient(135deg,var(--azul),var(--azul-claro))", boxShadow: "0 4px 12px rgba(var(--azul-rgb),.5)" }}>
              <MapPin size={17} color="#fff" />
            </span>
            <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 19, color: "#fff", letterSpacing: -0.3 }}>
              Mi<span style={{ color: "var(--azul-claro)" }}>Zona</span>
            </span>
          </div>
          {onOpenNotificaciones && (
            <button onClick={onOpenNotificaciones} aria-label="Notificaciones" className="relative flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: "#ffffff1a" }}>
              <Bell size={17} color="#fff" />
              {notifSinLeer > 0 && (
                <span className="absolute flex items-center justify-center text-[9px] font-bold" style={{ top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, background: "#E5484D", color: "#fff", padding: "0 4px", border: "2px solid #0B1437" }}>
                  {notifSinLeer > 9 ? "9+" : notifSinLeer}
                </span>
              )}
            </button>
          )}
        </div>
        <h1 className="mt-4" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: 28, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{titulo}</h1>
        {sub && <p className="text-sm mt-1" style={{ color: "var(--azul-palido)" }}>{sub}</p>}
        {buscador && (
          <div className="flex items-center gap-2.5 px-4 mt-4" style={{ borderRadius: 16, background: "#ffffff1f", border: "1px solid #ffffff33" }}>
            <Search size={17} color="var(--azul-palido)" className="shrink-0" />
            <input
              value={buscador.valor} onChange={(e) => buscador.onChange(e.target.value)} maxLength={60}
              placeholder={buscador.placeholder} aria-label={buscador.placeholder}
              className="w-full outline-none text-sm bg-transparent py-3" style={{ color: "#fff" }}
            />
            {buscador.valor && <button onClick={() => buscador.onChange("")} aria-label="Borrar búsqueda" className="shrink-0"><X size={16} color="var(--azul-palido)" /></button>}
          </div>
        )}
      </div>
    </div>
  );
}
