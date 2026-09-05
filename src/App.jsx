import { useState, useMemo, useEffect } from "react";
import {
  Search, MapPin, Instagram, Clock, Eye, Plus, X, Lock, ArrowLeft,
  ChevronDown, MessageCircle, Grid3x3, Star, Pencil, Trash2, Power,
  RefreshCw, ImageIcon, LogOut, UtensilsCrossed, Wrench, Shirt, Sparkles,
  Home, Laptop, GraduationCap, Dog, Car, Tractor, PartyPopper, Building2,
  Palmtree, Dumbbell, Pill, Truck, Check, Hammer, ShoppingCart, Beef, Apple,
  Croissant, Droplet, Printer, KeyRound, Scissors, Package, Gift, HardHat,
  Baby, Church, Tag, Navigation, User, LocateFixed, Briefcase,
} from "lucide-react";

const ADMIN_PASSWORD = "padre";

// URL del backend (servidor Express + MongoDB). En desarrollo local usa localhost;
// en producción se configura con la variable de entorno VITE_API_URL (ver LEEME.md).
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Número de WhatsApp del dueño de Mi Zona (recibe los pedidos de "Agregar mi local")
// TODO: reemplazar por el número real, formato: código de país + área + número, sin espacios ni signos.
// Ejemplo Argentina/Tucumán: "5493865551234"
const OWNER_WHATSAPP = "5493816265332"; // +54 381 6265332

const CATEGORIES = [
  { id: "comida", label: "Gastronomía", icon: UtensilsCrossed, color: "#C1443A", quick: true },
  { id: "salud", label: "Salud", icon: Pill, color: "#2C6E8A", quick: true },
  { id: "servicios", label: "Servicios", icon: Wrench, color: "#0B2A54", quick: true },
  { id: "hogar", label: "Hogar", icon: Home, color: "#3C8558", quick: true },
  { id: "moda", label: "Moda y retail", icon: Shirt, color: "#7A4F9E", quick: true },
  { id: "automotor", label: "Automotor", icon: Car, color: "#4A5568", quick: false },
  { id: "belleza", label: "Belleza y estética", icon: Sparkles, color: "#B8703F", quick: false },
  { id: "mascotas", label: "Mascotas y veterinaria", icon: Dog, color: "#B0793A", quick: false },
  { id: "tecnologia", label: "Tecnología", icon: Laptop, color: "#2C6E8A", quick: false },
  { id: "educacion", label: "Educación", icon: GraduationCap, color: "#8A7A2E", quick: false },
  { id: "agro", label: "Agro e insumos rurales", icon: Tractor, color: "#5A7A3C", quick: false },
  { id: "eventos", label: "Eventos y fiestas", icon: PartyPopper, color: "#A6437A", quick: false },
  { id: "inmobiliaria", label: "Inmobiliaria", icon: Building2, color: "#3B5266", quick: false },
  { id: "turismo", label: "Turismo y alojamiento", icon: Palmtree, color: "#2F6FED", quick: false },
  { id: "deportes", label: "Deportes y recreación", icon: Dumbbell, color: "#C1443A", quick: false },
  { id: "talleres", label: "Talleres y reparaciones", icon: Hammer, color: "#4A5568", quick: false },
  { id: "almacenes", label: "Almacenes y supermercados", icon: ShoppingCart, color: "#3C8558", quick: false },
  { id: "carnicerias", label: "Carnicerías y pollerías", icon: Beef, color: "#B23A2E", quick: false },
  { id: "verduleria", label: "Frutas y verduras", icon: Apple, color: "#5A8A3C", quick: false },
  { id: "farmacia", label: "Farmacias y perfumerías", icon: Pill, color: "#3B7A9E", quick: false },
  { id: "panaderia", label: "Panaderías y repostería", icon: Croissant, color: "#B8763A", quick: false },
  { id: "limpieza", label: "Limpieza y lavandería", icon: Droplet, color: "#2C8AA6", quick: false },
  { id: "imprenta", label: "Imprenta y gráfica", icon: Printer, color: "#5B5F6B", quick: false },
  { id: "cerrajeria", label: "Cerrajería", icon: KeyRound, color: "#8A7A2E", quick: false },
  { id: "barberias", label: "Barberías", icon: Scissors, color: "#0B2A54", quick: false },
  { id: "mayoristas", label: "Mayoristas y distribuidores", icon: Package, color: "#4A5568", quick: false },
  { id: "florerias", label: "Florerías y regalos", icon: Gift, color: "#A6437A", quick: false },
  { id: "ferreterias", label: "Ferreterías y materiales", icon: HardHat, color: "#B8703F", quick: false },
  { id: "bebes", label: "Bebés y niños", icon: Baby, color: "#7A9EB8", quick: false },
  { id: "religion", label: "Religión y artículos religiosos", icon: Church, color: "#6E5A8A", quick: false },
];
const QUICK_CATEGORIES = CATEGORIES.filter((c) => c.quick);

const ZONES = [
  "Burruyacú", "Capital (San Miguel de Tucumán)", "Chicligasta (Concepción)",
  "Cruz Alta (Banda del Río Salí)", "Famaillá", "Graneros", "Juan Bautista Alberdi",
  "La Cocha", "Leales", "Lules", "Monteros", "Río Chico (Aguilares)", "Simoca",
  "Tafí del Valle", "Tafí Viejo", "Trancas", "Yerba Buena",
];

const PAYMENT_METHODS = ["Efectivo", "Tarjeta de débito", "Tarjeta de crédito", "Transferencia", "Mercado Pago"];
const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const WHATSAPP_MESSAGE = "Hola. Te encontré en Mi Zona y quisiera consultar por sus servicios. ¿Podrían brindarme más información?";
const ADD_BUSINESS_MESSAGE = "Hola, encontré Mi Zona y quiero agregar mi local al directorio. Me gustaría recibir información para registrar mi negocio.";

/* ---------- utilidades ---------- */

function catInfo(id) {
  return CATEGORIES.find((c) => c.id === id);
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(iso + "T00:00:00");
  const now = new Date(todayISO() + "T00:00:00");
  return Math.round((target - now) / 86400000);
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR");
}
function fmtNum(n) {
  return (n || 0).toLocaleString("es-AR");
}
function isOpenNow(weekHours) {
  const now = new Date();
  const today = weekHours?.[now.getDay()];
  if (!today || today[0] === null || today[0] === undefined) return false;
  const [open, close] = today;
  const h = now.getHours();
  if (close === 0) return h >= open || h < 2;
  if (close > open) return h >= open && h < close;
  return h >= open || h < close;
}
function fmtHours(range) {
  if (!range || range[0] === null || range[0] === undefined) return "Cerrado";
  const [o, c] = range;
  return `${o}:00–${c === 0 ? "00" : c}:00`;
}
function avgRating(reviews) {
  if (!reviews || reviews.length === 0) return null;
  return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
}
function waLink(phone) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
}
function addBusinessWaLink() {
  return `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(ADD_BUSINESS_MESSAGE)}`;
}
function mapsLink(loc, zone) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc + ", " + zone)}`;
}

/* ---------- ubicación: geocodificar direcciones y calcular distancia ---------- */

async function geocodeAddress(loc, zone) {
  try {
    const query = encodeURIComponent(`${loc}, ${zone}, Tucumán, Argentina`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

/* ---------- descuentos ---------- */

function isDiscountActive(d) {
  if (!d.active) return false;
  const today = todayISO();
  return d.startDate <= today && today <= d.endDate;
}
function activeDiscounts(biz) {
  return (biz.discounts || []).filter(isDiscountActive);
}

function emptyBusiness() {
  return {
    id: uid(), kind: "business",
    name: "", desc: "", cat: "comida", zone: ZONES[0],
    services: [], specialties: [], paymentMethods: [], delivery: false, acceptsWhatsapp: true,
    phone: "", ig: "", logo: "", photos: [], loc: "",
    lat: null, lng: null,
    weekHours: DAYS.map(() => [9, 20]),
    featured: false, status: "active",
    createdAt: todayISO(), expiresAt: addDays(todayISO(), 30), lastRenewal: todayISO(),
    views: 0, reviews: [], discounts: [],
    ownerCode: uid().slice(0, 8).toUpperCase(),
  };
}

function emptyJob() {
  return {
    id: uid(), kind: "job",
    name: "", desc: "", phone: "", zone: ZONES[0],
    status: "active",
    createdAt: todayISO(), expiresAt: addDays(todayISO(), 30), lastRenewal: todayISO(),
    views: 0,
    ownerCode: uid().slice(0, 8).toUpperCase(),
  };
}

/* ---------- almacenamiento persistente (backend Express + MongoDB) ---------- */

function normalizeBusiness(b) {
  return {
    kind: "business",
    lat: null, lng: null, discounts: [],
    ownerCode: uid().slice(0, 8).toUpperCase(),
    ...b,
  };
}

async function loadBusinesses() {
  const res = await fetch(`${API_URL}/businesses`);
  if (!res.ok) throw new Error("No se pudieron cargar los negocios");
  const list = await res.json();
  return list.map(normalizeBusiness);
}

async function createBusinessOnServer(biz) {
  const res = await fetch(`${API_URL}/businesses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(biz),
  });
  if (!res.ok) throw new Error("No se pudo crear el negocio");
  return res.json();
}

async function updateBusinessOnServer(id, biz) {
  const res = await fetch(`${API_URL}/businesses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(biz),
  });
  if (!res.ok) throw new Error("No se pudo guardar el negocio");
  return res.json();
}

async function deleteBusinessOnServer(id) {
  const res = await fetch(`${API_URL}/businesses/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("No se pudo eliminar el negocio");
}

const CLOUDINARY_CLOUD_NAME = "hiyaxxdk";
const CLOUDINARY_UPLOAD_PRESET = "mi-zona-fotos";

async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Error al subir la imagen a Cloudinary");
  const data = await res.json();
  return data.secure_url;
}

/* ---------- piezas visuales chicas ---------- */

function Photo({ cat, src, height = 128, radius = "10px 10px 0 0", iconSize = 34, onOpen, clickable = true }) {
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
      style={{ height, background: failed ? "#F7E7E5" : `linear-gradient(135deg, ${c?.color}22, ${c?.color}08)`, borderRadius: radius }}
    >
      {failed ? (
        <>
          <ImageIcon size={Math.min(iconSize, 22)} color="#9A3B34" strokeWidth={1.5} />
          <span className="text-[10px] leading-tight" style={{ color: "#9A3B34" }}>El link de esta foto no funciona</span>
        </>
      ) : (
        <Icon size={iconSize} color={c?.color} strokeWidth={1.5} />
      )}
    </div>
  );
}

function OpenBadge({ weekHours }) {
  const open = isOpenNow(weekHours);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1"
      style={{ borderRadius: 20, color: open ? "#1E6B44" : "#9A3B34", background: open ? "#E4F3EA" : "#F7E7E5" }}
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

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star size={22} color={n <= value ? "#2F6FED" : "#D1D5DB"} fill={n <= value ? "#2F6FED" : "none"} />
        </button>
      ))}
    </div>
  );
}

function TagInput({ values, onChange, placeholder }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setText("");
  };
  return (
    <div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {values.map((v) => (
            <span key={v} className="text-xs px-2 py-1 flex items-center gap-1" style={{ background: "#EEF2F7", borderRadius: 20 }}>
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="border px-2 py-1.5 text-xs flex-1" style={{ borderRadius: 6, borderColor: "#E2E8F0" }}
        />
        <button type="button" onClick={add} className="text-xs px-3 py-1.5 font-medium" style={{ background: "#0B2A54", color: "#fff", borderRadius: 6 }}>
          Agregar
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel = "Confirmar", danger, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "#0B1220cc" }} onClick={onCancel}>
      <div className="bg-white w-full max-w-sm p-5" style={{ borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 17 }}>{title}</h3>
        <p className="text-sm mt-2 mb-5" style={{ color: "#4B5563" }}>{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="text-sm px-3 py-1.5" style={{ borderRadius: 8, border: "1px solid #E2E8F0" }}>Cancelar</button>
          <button
            onClick={onConfirm}
            className="text-sm font-medium px-3 py-1.5"
            style={{ borderRadius: 8, backgroundColor: danger ? "#C1443A" : "#0B2A54", color: "#fff" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Lightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: "#0A0C12ee" }} onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white"><X size={26} /></button>
      <img src={src} alt="" className="max-w-full max-h-full object-contain" style={{ borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function AllPhotosModal({ photos, cat, onOpenPhoto, onClose }) {
  return (
    <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center" style={{ background: "#0B1220cc" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto p-5" style={{ borderRadius: "16px 16px 0 0" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 18 }}>{photos.length} fotos</h2>
          <button onClick={onClose}><X size={20} /></button>
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

function CategoryModal({ activeCat, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" style={{ background: "#0B1220cc" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg max-h-[80vh] overflow-y-auto p-5" style={{ borderRadius: "16px 16px 0 0" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 18 }}>Todos los rubros</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onSelect(null)}
            className="flex flex-col items-center gap-1.5 py-3 px-2 text-center"
            style={{ borderRadius: 12, backgroundColor: activeCat === null ? "#0B2A54" : "#F5F4EF" }}
          >
            <Grid3x3 size={22} color={activeCat === null ? "#fff" : "#0B1220"} />
            <span className="text-xs font-medium" style={{ color: activeCat === null ? "#fff" : "#0B1220" }}>Todos</span>
          </button>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = activeCat === c.id;
            return (
              <button
                key={c.id} onClick={() => onSelect(c.id)}
                className="flex flex-col items-center gap-1.5 py-3 px-2 text-center"
                style={{ borderRadius: 12, backgroundColor: active ? c.color : "#F5F4EF" }}
              >
                <Icon size={22} color={active ? "#fff" : c.color} />
                <span className="text-xs font-medium leading-tight" style={{ color: active ? "#fff" : "#0B1220" }}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PasswordGate({ onSuccess, onClose }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const submit = () => {
    if (pw === ADMIN_PASSWORD) onSuccess();
    else { setError(true); setPw(""); }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "#0B1220cc" }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-6" style={{ borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Lock size={18} color="#0B2A54" />
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 18 }}>Acceso administrador</h2>
        </div>
        <input
          type="password" autoFocus value={pw}
          onChange={(e) => { setPw(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Contraseña"
          className="w-full border px-3 py-2 text-sm mb-2" style={{ borderRadius: 8, borderColor: error ? "#C1443A" : "#E2E8F0" }}
        />
        {error && <p className="text-xs mb-3" style={{ color: "#C1443A" }}>Contraseña incorrecta.</p>}
        <button onClick={submit} className="w-full py-2.5 text-sm font-semibold" style={{ backgroundColor: "#0B2A54", color: "#fff", borderRadius: 8 }}>
          Ingresar
        </button>
      </div>
    </div>
  );
}

/* ---------- semana de horarios (editor) ---------- */

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
                  className="w-14 border px-1 py-0.5" style={{ borderRadius: 4, borderColor: "#E2E8F0" }}
                />
                <span>a</span>
                <input
                  type="number" value={entry[1]}
                  onChange={(e) => onChange(value.map((d, idx) => (idx === i ? [entry[0], Number(e.target.value)] : d)))}
                  className="w-14 border px-1 py-0.5" style={{ borderRadius: 4, borderColor: "#E2E8F0" }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- ficha pública del negocio ---------- */

function BusinessCard({ biz, onOpen, onOpenPhoto, distanceKm }) {
  const c = catInfo(biz.cat);
  const rating = avgRating(biz.reviews);
  const discounts = activeDiscounts(biz);
  return (
    <div
      role="button" tabIndex={0}
      onClick={() => onOpen(biz.id)}
      onKeyDown={(e) => (e.key === "Enter" ? onOpen(biz.id) : null)}
      className="bg-white flex flex-col overflow-hidden transition-shadow hover:shadow-md text-left cursor-pointer"
      style={{ borderRadius: 10, border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(20,26,40,0.04)" }}
    >
      <div className="relative">
        <Photo cat={biz.cat} src={biz.logo || biz.photos?.[0]} clickable={false} />
        {discounts.length > 0 && (
          <span
            className="absolute top-2 left-2 flex items-center gap-1 text-[11px] font-semibold px-2 py-1"
            style={{ background: "#0B2A54", color: "#2F6FED", borderRadius: 20 }}
          >
            <Tag size={11} /> {discounts[0].percent ? `${discounts[0].percent} OFF` : "Tiene descuentos"}
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] uppercase tracking-wide font-medium" style={{ color: c?.color, fontFamily: "'IBM Plex Mono', monospace" }}>
            {c?.label}
          </span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "#6B7280" }}>
            <Eye size={12} /> {fmtNum(biz.views)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 17, color: "#0B1220" }}>{biz.name}</h3>
          {biz.featured && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5" style={{ background: "#FBEBD1", color: "#8A5B12", borderRadius: 6 }}>
              <Star size={10} fill="#8A5B12" /> Destacado
            </span>
          )}
        </div>
        {rating && (
          <span className="flex items-center gap-1 text-xs mt-0.5" style={{ color: "#4B5563" }}>
            <Star size={12} fill="#2F6FED" color="#2F6FED" /> {rating} ({biz.reviews.length})
          </span>
        )}
        <p className="text-sm mt-1 mb-2 flex-1" style={{ color: "#4B5563" }}>{biz.desc}</p>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <OpenBadge weekHours={biz.weekHours} />
          {typeof distanceKm === "number" && (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#0B2A54" }}>
              <Navigation size={12} /> A {fmtDistance(distanceKm)} de vos
            </span>
          )}
        </div>
        <a
          href={mapsLink(biz.loc, biz.zone)} target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs w-fit hover:underline" style={{ color: "#6B7280" }}
        >
          <MapPin size={12} /> {biz.loc} · {biz.zone}
        </a>
      </div>
    </div>
  );
}

function BusinessDetail({ biz, onBack, onOpenPhoto, onAddReview }) {
  const c = catInfo(biz.cat);
  const todayIdx = new Date().getDay();
  const gallery = biz.photos?.length > 0 ? biz.photos : [null, null, null, null];
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewName, setReviewName] = useState("");
  const rating = avgRating(biz.reviews);

  const submitReview = () => {
    if (!reviewText.trim()) return;
    onAddReview(biz.id, { id: uid(), rating: reviewRating, text: reviewText.trim(), name: reviewName.trim() || "Anónimo", date: todayISO() });
    setReviewText(""); setReviewName(""); setReviewRating(5);
  };

  return (
    <div style={{ backgroundColor: "#F3F6FB", minHeight: "100vh" }}>
      <div className="sticky top-0 z-30" style={{ backgroundColor: "#0B2A54" }}>
        <div className="max-w-3xl mx-auto px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#fff" }}>
            <ArrowLeft size={16} /> Volver a la búsqueda
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div className="col-span-2 row-span-2">
            <Photo cat={biz.cat} src={gallery[0]} height={280} radius="12px" iconSize={48} onOpen={onOpenPhoto} />
          </div>
          {gallery.slice(1, 5).map((src, i) => (
            <Photo key={i} cat={biz.cat} src={src} height={136} radius="12px" iconSize={20} onOpen={onOpenPhoto} />
          ))}
        </div>
        {biz.photos?.length === 0 && (
          <p className="flex items-center gap-1.5 text-xs mb-6" style={{ color: "#6B7280" }}>
            <ImageIcon size={13} /> Este negocio todavía no cargó fotos
          </p>
        )}
        {biz.photos?.length > 5 && (
          <button onClick={() => setShowAllPhotos(true)} className="flex items-center gap-1.5 text-xs font-medium mb-6" style={{ color: "#0B2A54" }}>
            <Grid3x3 size={13} /> Ver las {biz.photos.length} fotos
          </button>
        )}
        {showAllPhotos && <AllPhotosModal photos={biz.photos} cat={biz.cat} onOpenPhoto={onOpenPhoto} onClose={() => setShowAllPhotos(false)} />}

        <div className="flex items-start justify-between gap-3 mb-2 mt-4">
          <div>
            <span className="text-xs uppercase tracking-wide font-medium" style={{ color: c?.color, fontFamily: "'IBM Plex Mono', monospace" }}>
              {c?.label} · {biz.zone}
            </span>
            <div className="flex items-center gap-2">
              <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 26, color: "#0B1220" }}>{biz.name}</h1>
              {biz.featured && (
                <span className="flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5" style={{ background: "#FBEBD1", color: "#8A5B12", borderRadius: 6 }}>
                  <Star size={11} fill="#8A5B12" /> Destacado
                </span>
              )}
            </div>
            {rating ? (
              <span className="flex items-center gap-1 text-sm mt-1" style={{ color: "#4B5563" }}>
                <Star size={14} fill="#2F6FED" color="#2F6FED" /> {rating}/5 ({biz.reviews.length} reseñas)
              </span>
            ) : (
              <span className="text-sm mt-1 block" style={{ color: "#6B7280" }}>Todavía sin reseñas</span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs shrink-0 mt-1" style={{ color: "#6B7280" }}>
            <Eye size={13} /> {fmtNum(biz.views)} vistas
          </span>
        </div>

        <div className="mb-4"><OpenBadge weekHours={biz.weekHours} /></div>
        <p className="text-sm mb-4" style={{ color: "#1F2937" }}>{biz.desc}</p>

        {(biz.services?.length > 0 || biz.specialties?.length > 0) && (
          <div className="mb-4 flex flex-col gap-2">
            {biz.services?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {biz.services.map((s) => (
                  <span key={s} className="text-xs px-2 py-1" style={{ background: "#E8F0FE", color: "#0B2A54", borderRadius: 20 }}>{s}</span>
                ))}
              </div>
            )}
            {biz.specialties?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {biz.specialties.map((s) => (
                  <span key={s} className="text-xs px-2 py-1" style={{ background: "#F5F1E6", color: "#8A5B12", borderRadius: 20 }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-5 text-xs" style={{ color: "#4B5563" }}>
          {biz.paymentMethods?.length > 0 && <span>Pagos: {biz.paymentMethods.join(", ")}</span>}
          {biz.delivery && <span className="flex items-center gap-1"><Truck size={13} /> Hace envíos</span>}
        </div>

        <div className="flex gap-2 mb-6">
          <a
            href={waLink(biz.phone)} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 text-sm font-semibold flex-1 py-3"
            style={{ backgroundColor: "#25A24C", color: "#fff", borderRadius: 10 }}
          >
            <MessageCircle size={17} /> Escribir por WhatsApp
          </a>
          {biz.ig && (
            <a href={`https://instagram.com/${biz.ig}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3"
              style={{ border: "1px solid #E2E8F0", color: "#0B1220", borderRadius: 10 }}
            >
              <Instagram size={17} /> @{biz.ig}
            </a>
          )}
        </div>

        <a href={mapsLink(biz.loc, biz.zone)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm mb-6 w-fit hover:underline" style={{ color: "#0B2A54" }}>
          <MapPin size={15} /> {biz.loc} <span style={{ color: "#6B7280" }}>· ver en el mapa</span>
        </a>

        {activeDiscounts(biz).length > 0 && (
          <div className="mb-6">
            <h2 className="flex items-center gap-2 mb-3" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 16, color: "#0B1220" }}>
              <Tag size={16} /> Descuentos vigentes
            </h2>
            <div className="flex flex-col gap-2">
              {activeDiscounts(biz).map((d) => (
                <div key={d.id} className="p-4" style={{ borderRadius: 10, border: "1px solid #2F6FED", background: "#FBEBD1" }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 15, color: "#0B1220" }}>{d.title}</h3>
                    {d.percent && <span className="text-xs font-bold px-2 py-0.5" style={{ background: "#0B2A54", color: "#2F6FED", borderRadius: 20 }}>{d.percent} OFF</span>}
                  </div>
                  {d.item && <p className="text-xs mb-1" style={{ color: "#8A5B12" }}>Incluye: {d.item}</p>}
                  {d.desc && <p className="text-sm" style={{ color: "#1F2937" }}>{d.desc}</p>}
                  <p className="text-[11px] mt-1" style={{ color: "#6B7280" }}>Válido hasta el {fmtDate(d.endDate)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="flex items-center gap-2 mb-3" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 16, color: "#0B1220" }}>
            <Clock size={16} /> Horarios de atención
          </h2>
          <div className="bg-white overflow-hidden" style={{ borderRadius: 10, border: "1px solid #E2E8F0" }}>
            {DAYS.map((day, i) => (
              <div key={day} className="flex items-center justify-between px-4 py-2.5 text-sm"
                style={{ borderTop: i === 0 ? "none" : "1px solid #EEF2F7", backgroundColor: i === todayIdx ? "#E8F0FE" : "transparent", fontWeight: i === todayIdx ? 600 : 400, color: "#0B1220" }}
              >
                <span>{day}{i === todayIdx ? " · hoy" : ""}</span>
                <span style={{ color: biz.weekHours[i]?.[0] === null ? "#9A3B34" : "#1F2937" }}>{fmtHours(biz.weekHours[i])}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reseñas */}
        <div className="mb-6">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 16, color: "#0B1220" }} className="mb-3">
            Reseñas y opiniones
          </h2>

          <div className="bg-white p-4 mb-4" style={{ borderRadius: 10, border: "1px solid #E2E8F0" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "#4B5563" }}>Dejá tu opinión</p>
            <StarPicker value={reviewRating} onChange={setReviewRating} />
            <input
              value={reviewName} onChange={(e) => setReviewName(e.target.value)} placeholder="Tu nombre (opcional)"
              className="w-full border px-3 py-2 text-sm mt-3 mb-2" style={{ borderRadius: 8, borderColor: "#E2E8F0" }}
            />
            <textarea
              value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Contá tu experiencia..."
              rows={3} className="w-full border px-3 py-2 text-sm mb-2" style={{ borderRadius: 8, borderColor: "#E2E8F0" }}
            />
            <button onClick={submitReview} className="text-sm font-semibold px-4 py-2" style={{ backgroundColor: "#0B2A54", color: "#fff", borderRadius: 8 }}>
              Publicar reseña
            </button>
          </div>

          {biz.reviews?.length > 0 ? (
            <div className="flex flex-col gap-3">
              {[...biz.reviews].reverse().map((r) => (
                <div key={r.id} className="bg-white p-4" style={{ borderRadius: 10, border: "1px solid #E2E8F0" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{r.name}</span>
                    <span className="text-xs" style={{ color: "#6B7280" }}>{fmtDate(r.date)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={13} fill={n <= r.rating ? "#2F6FED" : "none"} color={n <= r.rating ? "#2F6FED" : "#D1D5DB"} />
                    ))}
                  </div>
                  <p className="text-sm" style={{ color: "#1F2937" }}>{r.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "#6B7280" }}>Sé el primero en dejar una reseña.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- header público ---------- */

function PublicHeader({ zone, setZone, query, setQuery, activeCat, setActiveCat, onOpenAllCats, onOpenAdmin, onOpenOwner, showAccount, setShowAccount }) {
  return (
    <>
      {/* barra superior estilo app */}
      <div className="sticky top-0 z-40" style={{ backgroundColor: "#0B2A54" }}>
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff" }}>Mi</span>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 20, color: "#7FA8F5" }}>Zona</span>
            </div>
            <button
              onClick={() => setShowAccount(true)}
              className="flex items-center justify-center shrink-0"
              style={{ width: 34, height: 34, borderRadius: "50%", background: "#ffffff20" }}
            >
              <User size={16} color="#fff" />
            </button>
          </div>

          <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: 17, color: "#fff" }}>¡Descubrí tu zona!</p>
          <p className="text-xs mt-1 mb-3" style={{ color: "#C9D6F3", maxWidth: 420 }}>
            Encontrá negocios, productos y servicios cerca tuyo.
          </p>

          <div className="flex items-center gap-2 bg-white px-3.5 py-2.5" style={{ borderRadius: 10 }}>
            <Search size={16} color="#6B7280" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscá un negocio, producto o servicio..."
              className="w-full outline-none text-sm" style={{ color: "#0B1220" }}
            />
            {query && <button onClick={() => setQuery("")}><X size={14} color="#6B7280" /></button>}
          </div>

          <div className="relative inline-block mt-2.5">
            <select
              value={zone} onChange={(e) => setZone(e.target.value)}
              className="appearance-none pl-5 pr-6 py-0.5 text-xs font-medium"
              style={{ color: "#DCE7FB", background: "transparent" }}
            >
              {ZONES.map((z) => <option key={z} value={z} style={{ color: "#0B1220" }}>{z}</option>)}
            </select>
            <MapPin size={13} className="absolute left-0 top-1/2 -translate-y-1/2" color="#7FA8F5" />
            <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" color="#DCE7FB" />
          </div>
        </div>
      </div>

      {showAccount && (
        <AccountSheet
          onOpenOwner={() => { setShowAccount(false); onOpenOwner(); }}
          onOpenAdmin={() => { setShowAccount(false); onOpenAdmin(); }}
          onClose={() => setShowAccount(false)}
        />
      )}

      {/* categorías, en íconos circulares */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #E2E8F0" }}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: 14, color: "#0B1220" }}>Categorías</span>
            <button onClick={onOpenAllCats} className="text-xs font-medium" style={{ color: "#2F6FED" }}>Ver todas</button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1">
            <button onClick={() => setActiveCat(null)} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 60 }}>
              <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: "50%", background: activeCat === null ? "#2F6FED" : "#E8F0FE" }}>
                <Grid3x3 size={18} color={activeCat === null ? "#fff" : "#2F6FED"} />
              </span>
              <span className="text-[11px] text-center" style={{ color: "#4B5563" }}>Todos</span>
            </button>
            {QUICK_CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = activeCat === c.id;
              return (
                <button key={c.id} onClick={() => setActiveCat(active ? null : c.id)} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 60 }}>
                  <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: "50%", background: active ? c.color : `${c.color}1A` }}>
                    <Icon size={18} color={active ? "#fff" : c.color} />
                  </span>
                  <span className="text-[11px] text-center leading-tight" style={{ color: "#4B5563" }}>{c.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function AccountSheet({ onOpenOwner, onOpenAdmin, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" style={{ background: "#0B122066" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm p-5" style={{ borderRadius: "16px 16px 0 0" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: 16, color: "#0B1220" }}>Perfil</span>
          <button onClick={onClose}><X size={18} color="#6B7280" /></button>
        </div>
        <button onClick={onOpenOwner} className="w-full flex items-center gap-2.5 text-sm font-medium px-3 py-3 mb-2" style={{ borderRadius: 10, border: "1px solid #E2E8F0", color: "#0B1220" }}>
          <User size={16} color="#2F6FED" /> Mi negocio
        </button>
        <button onClick={onOpenAdmin} className="w-full flex items-center gap-2.5 text-sm font-medium px-3 py-3" style={{ borderRadius: 10, border: "1px solid #E2E8F0", color: "#0B1220" }}>
          <Lock size={16} color="#2F6FED" /> Administrador
        </button>
      </div>
    </div>
  );
}

function BottomNav({ active, onInicio, onExplorar, onAdd, onEmpleos, onPerfil }) {
  const Item = ({ id, label, Icon, onClick }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1" style={{ minWidth: 56 }}>
      <Icon size={20} color={active === id ? "#2F6FED" : "#94A3B8"} />
      <span className="text-[10px]" style={{ color: active === id ? "#2F6FED" : "#94A3B8", fontWeight: active === id ? 500 : 400 }}>{label}</span>
    </button>
  );
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40" style={{ background: "#fff", borderTop: "1px solid #E2E8F0" }}>
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-around" style={{ paddingTop: 8, paddingBottom: 8 }}>
        <Item id="inicio" label="Inicio" Icon={Home} onClick={onInicio} />
        <Item id="explorar" label="Explorar" Icon={Grid3x3} onClick={onExplorar} />
        <button onClick={onAdd} className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: "50%", background: "#2F6FED", marginTop: -18 }}>
          <Plus size={20} color="#fff" />
        </button>
        <Item id="empleos" label="Empleos" Icon={Briefcase} onClick={onEmpleos} />
        <Item id="perfil" label="Perfil" Icon={User} onClick={onPerfil} />
      </div>
    </div>
  );
}

/* ---------- "Agregar mi local" ---------- */

function AddBusinessModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "#0B1220cc" }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-6 text-center" style={{ borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute" style={{ marginLeft: "auto", display: "block", marginTop: -16, marginRight: -16 }}><X size={18} /></button>
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 19, color: "#0B1220" }} className="mb-3">
          ¿Querés sumar tu negocio a Mi Zona?
        </h2>
        <p className="text-sm mb-5" style={{ color: "#4B5563" }}>
          Hacé que más personas conozcan tu negocio, encuentren tus productos o servicios y puedan contactarte fácilmente.
        </p>
        <a
          href={addBusinessWaLink()} target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 text-sm font-semibold py-3"
          style={{ backgroundColor: "#25A24C", color: "#fff", borderRadius: 10 }}
        >
          <MessageCircle size={17} /> Contactarme por WhatsApp
        </a>
      </div>
    </div>
  );
}

/* ---------- panel de administración ---------- */

function BusinessForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setBool = (k) => (e) => setForm({ ...form, [k]: e.target.checked });

  const togglePayment = (method) => {
    setForm((f) => ({
      ...f,
      paymentMethods: f.paymentMethods.includes(method) ? f.paymentMethods.filter((m) => m !== method) : [...f.paymentMethods, method],
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, logo: url }));
    } catch (err) {
      console.error(err);
      setUploadError("No se pudo subir el logo. Revisá la configuración de Cloudinary.");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handlePhotosUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingPhotos(true);
    setUploadError(null);
    try {
      const urls = await Promise.all(files.map((f) => uploadImage(f)));
      setForm((f) => ({ ...f, photos: [...(f.photos || []), ...urls] }));
    } catch (err) {
      console.error(err);
      setUploadError("No se pudieron subir una o más fotos. Revisá la configuración de Cloudinary.");
    } finally {
      setUploadingPhotos(false);
      e.target.value = "";
    }
  };

  const removePhoto = (url) => setForm((f) => ({ ...f, photos: f.photos.filter((p) => p !== url) }));

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    let coords = { lat: form.lat ?? null, lng: form.lng ?? null };
    // Si cambió la dirección o todavía no tiene coordenadas, geocodificamos automáticamente
    if (form.loc?.trim() && (!coords.lat || form.loc !== initial.loc || form.zone !== initial.zone)) {
      const geo = await geocodeAddress(form.loc, form.zone);
      if (geo) coords = geo;
    }
    setSaving(false);
    onSave({ ...form, lat: coords.lat, lng: coords.lng });
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-start sm:items-center justify-center p-4 overflow-y-auto" style={{ background: "#0B1220cc" }}>
      <div className="bg-white w-full max-w-lg p-6 my-6" style={{ borderRadius: 12 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 20 }}>
            {initial.name ? "Editar negocio" : "Nuevo negocio"}
          </h2>
          <button onClick={onCancel}><X size={20} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <input placeholder="Nombre del negocio" value={form.name} onChange={set("name")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />

          <select value={form.cat} onChange={set("cat")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={form.zone} onChange={set("zone")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }}>
            {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>

          <textarea placeholder="Descripción" value={form.desc} onChange={set("desc")} rows={2} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />

          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#4B5563" }}>Servicios disponibles</p>
            <TagInput values={form.services} onChange={(v) => setForm({ ...form, services: v })} placeholder="Ej: reparación de celulares" />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#4B5563" }}>Especialidades</p>
            <TagInput values={form.specialties} onChange={(v) => setForm({ ...form, specialties: v })} placeholder="Ej: pastelería sin gluten" />
          </div>

          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#4B5563" }}>Métodos de pago</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => {
                const active = form.paymentMethods.includes(m);
                return (
                  <button key={m} type="button" onClick={() => togglePayment(m)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5"
                    style={{ borderRadius: 8, border: "1px solid " + (active ? "#0B2A54" : "#E2E8F0"), backgroundColor: active ? "#0B2A54" : "#fff", color: active ? "#fff" : "#0B1220" }}
                  >
                    {active && <Check size={12} />} {m}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.delivery} onChange={setBool("delivery")} /> Hace envíos</label>

          <input placeholder="Teléfono WhatsApp (código país, sin +)" value={form.phone} onChange={set("phone")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
          <input placeholder="Usuario de Instagram (sin @, opcional)" value={form.ig} onChange={set("ig")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#4B5563" }}>Logo (opcional)</p>
            <div className="flex items-center gap-3">
              {form.logo && <img src={form.logo} alt="" className="w-12 h-12 object-cover" style={{ borderRadius: 8 }} />}
              <label className="text-xs font-medium px-3 py-2 cursor-pointer" style={{ borderRadius: 8, border: "1px solid #E2E8F0" }}>
                {uploadingLogo ? "Subiendo..." : form.logo ? "Cambiar" : "Elegir foto"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
              </label>
              {form.logo && !uploadingLogo && (
                <button type="button" onClick={() => setForm({ ...form, logo: "" })} className="text-xs" style={{ color: "#C1443A" }}>Quitar</button>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#4B5563" }}>Fotos de productos</p>
            {form.photos?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.photos.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="w-16 h-16 object-cover" style={{ borderRadius: 8 }} />
                    <button type="button" onClick={() => removePhoto(url)} className="absolute -top-1.5 -right-1.5 bg-white" style={{ borderRadius: "50%", border: "1px solid #E2E8F0" }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="text-xs font-medium px-3 py-2 cursor-pointer inline-block" style={{ borderRadius: 8, border: "1px solid #E2E8F0" }}>
              {uploadingPhotos ? "Subiendo..." : "Agregar fotos"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosUpload} disabled={uploadingPhotos} />
            </label>
            {uploadError && <p className="text-xs mt-1" style={{ color: "#C1443A" }}>{uploadError}</p>}
          </div>
          <input placeholder="Dirección" value={form.loc} onChange={set("loc")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />

          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: "#4B5563" }}>Horarios de la semana</p>
            <WeekHoursEditor value={form.weekHours} onChange={(v) => setForm({ ...form, weekHours: v })} />
          </div>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={setBool("featured")} /> Marcar como destacado</label>

          <div className="p-3" style={{ borderRadius: 8, background: "#E8F0FE" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "#0B2A54" }}>Código de dueño (para el panel "Mi negocio")</p>
            <p className="text-sm font-mono font-semibold" style={{ color: "#0B1220" }}>{form.ownerCode}</p>
            <p className="text-[11px] mt-1" style={{ color: "#4B5563" }}>Compartíselo al dueño para que administre sus propios descuentos, sin poder tocar otros negocios.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#4B5563" }}>Vence</p>
              <input type="date" value={form.expiresAt} onChange={set("expiresAt")} className="border px-3 py-2 text-sm w-full" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#4B5563" }}>Estado</p>
              <select value={form.status} onChange={set("status")} className="border px-3 py-2 text-sm w-full" style={{ borderRadius: 8, borderColor: "#E2E8F0" }}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium" style={{ borderRadius: 8, border: "1px solid #E2E8F0" }}>Cancelar</button>
            <button onClick={submit} disabled={saving} className="flex-1 py-2.5 text-sm font-semibold" style={{ backgroundColor: "#0B2A54", color: "#fff", borderRadius: 8, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Ubicando dirección..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- empleos ---------- */

function JobForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-start sm:items-center justify-center p-4 overflow-y-auto" style={{ background: "#0B1220cc" }}>
      <div className="bg-white w-full max-w-lg p-6 my-6" style={{ borderRadius: 12 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 20 }}>
            {initial.name ? "Editar trabajo" : "Nuevo trabajo"}
          </h2>
          <button onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <input placeholder="Nombre del trabajo (ej: Se busca albañil)" value={form.name} onChange={set("name")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
          <textarea placeholder="Descripción: de qué se trata, requisitos, horario, etc." value={form.desc} onChange={set("desc")} rows={4} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
          <input placeholder="Número de contacto (WhatsApp, con código país sin +)" value={form.phone} onChange={set("phone")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
          <select value={form.zone} onChange={set("zone")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }}>
            {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#4B5563" }}>Vence</p>
              <input type="date" value={form.expiresAt} onChange={set("expiresAt")} className="border px-3 py-2 text-sm w-full" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#4B5563" }}>Estado</p>
              <select value={form.status} onChange={set("status")} className="border px-3 py-2 text-sm w-full" style={{ borderRadius: 8, borderColor: "#E2E8F0" }}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium" style={{ borderRadius: 8, border: "1px solid #E2E8F0" }}>Cancelar</button>
            <button onClick={submit} className="flex-1 py-2.5 text-sm font-semibold" style={{ backgroundColor: "#0B2A54", color: "#fff", borderRadius: 8 }}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobCard({ job }) {
  return (
    <div className="bg-white p-4 flex flex-col" style={{ borderRadius: 10, border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(20,26,40,0.04)" }}>
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-medium mb-1" style={{ color: "#2F6FED", fontFamily: "'IBM Plex Mono', monospace" }}>
        <Briefcase size={12} /> Empleo · {job.zone}
      </span>
      <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 17, color: "#0B1220" }}>{job.name}</h3>
      <p className="text-sm mt-1 mb-3 flex-1" style={{ color: "#4B5563", whiteSpace: "pre-wrap" }}>{job.desc}</p>
      <a
        href={waLink(job.phone)} target="_blank" rel="noreferrer"
        className="flex items-center justify-center gap-2 text-sm font-semibold py-2.5"
        style={{ backgroundColor: "#25A24C", color: "#fff", borderRadius: 10 }}
      >
        <MessageCircle size={16} /> Contactar por WhatsApp
      </a>
    </div>
  );
}

function ReviewsModal({ business, onDeleteReview, onClose }) {
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4" style={{ background: "#0B1220cc" }} onClick={onClose}>
      <div className="bg-white w-full max-w-md max-h-[80vh] overflow-y-auto p-5" style={{ borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 18 }}>Reseñas · {business.name}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {business.reviews.length === 0 ? (
          <p className="text-sm" style={{ color: "#6B7280" }}>Todavía no tiene reseñas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {business.reviews.map((r) => (
              <div key={r.id} className="p-3 flex items-start justify-between gap-2" style={{ borderRadius: 8, border: "1px solid #E2E8F0" }}>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} fill={n <= r.rating ? "#2F6FED" : "none"} color={n <= r.rating ? "#2F6FED" : "#D1D5DB"} />)}
                    <span className="text-xs font-medium ml-1">{r.name}</span>
                  </div>
                  <p className="text-xs" style={{ color: "#1F2937" }}>{r.text}</p>
                  <p className="text-[11px] mt-1" style={{ color: "#6B7280" }}>{fmtDate(r.date)}</p>
                </div>
                <button onClick={() => onDeleteReview(business.id, r.id)} style={{ color: "#C1443A" }}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ businesses, onAddNew, onAddNewJob, onEdit, onToggleStatus, onRenew, onDelete, onOpenReviews, onLogout }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return businesses.filter((b) => {
      const matchQ = q ? b.name.toLowerCase().includes(q) : true;
      const du = daysUntil(b.expiresAt);
      let matchFilter = true;
      if (filter === "activos") matchFilter = b.status === "active";
      else if (filter === "inactivos") matchFilter = b.status === "inactive";
      else if (filter === "por_vencer") matchFilter = du !== null && du >= 0 && du <= 7;
      else if (filter === "vencidos") matchFilter = du !== null && du < 0;
      else if (filter === "negocios") matchFilter = b.kind !== "job";
      else if (filter === "empleos") matchFilter = b.kind === "job";
      return matchQ && matchFilter;
    });
  }, [businesses, search, filter]);

  const FILTERS = [
    { id: "todos", label: "Todos" },
    { id: "negocios", label: "Negocios" },
    { id: "empleos", label: "Empleos" },
    { id: "activos", label: "Activos" },
    { id: "inactivos", label: "Inactivos" },
    { id: "por_vencer", label: "Por vencer" },
    { id: "vencidos", label: "Vencidos" },
  ];

  return (
    <div style={{ backgroundColor: "#F3F6FB", minHeight: "100vh" }}>
      <header className="sticky top-0 z-30" style={{ backgroundColor: "#0B2A54" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff" }}>Panel de administración</h1>
          <div className="flex gap-2 relative">
            <button onClick={() => setShowAddMenu((v) => !v)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2" style={{ borderRadius: 8, backgroundColor: "#2F6FED", color: "#0B1220" }}>
              <Plus size={14} /> Nuevo
            </button>
            {showAddMenu && (
              <div className="absolute top-full mt-1 right-0 bg-white shadow-lg flex flex-col z-40" style={{ borderRadius: 8, border: "1px solid #E2E8F0", minWidth: 180 }}>
                <button onClick={() => { setShowAddMenu(false); onAddNew(); }} className="flex items-center gap-2 text-sm px-3 py-2.5 text-left hover:bg-gray-50" style={{ color: "#0B1220" }}>
                  <Building2 size={14} /> Agregar negocio
                </button>
                <button onClick={() => { setShowAddMenu(false); onAddNewJob(); }} className="flex items-center gap-2 text-sm px-3 py-2.5 text-left hover:bg-gray-50" style={{ color: "#0B1220", borderTop: "1px solid #EEF2F7" }}>
                  <Briefcase size={14} /> Agregar trabajo
                </button>
              </div>
            )}
            <button onClick={onLogout} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2" style={{ borderRadius: 8, border: "1px solid #ffffff30", color: "#fff" }}>
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 bg-white px-3 py-2 mb-3" style={{ borderRadius: 8, border: "1px solid #E2E8F0" }}>
          <Search size={16} color="#6B7280" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre..." className="w-full outline-none text-sm" />
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="px-3 py-1.5 text-xs font-medium whitespace-nowrap"
              style={{ borderRadius: 20, backgroundColor: filter === f.id ? "#0B2A54" : "#fff", color: filter === f.id ? "#fff" : "#0B1220", border: "1px solid " + (filter === f.id ? "#0B2A54" : "#E2E8F0") }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: "#6B7280" }}>No hay resultados que coincidan.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((b) => {
              const isJob = b.kind === "job";
              const du = daysUntil(b.expiresAt);
              const expiringSoon = du !== null && du >= 0 && du <= 7;
              const expired = du !== null && du < 0;
              return (
                <div key={b.id} className="bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between" style={{ borderRadius: 10, border: "1px solid #E2E8F0" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {isJob && <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5" style={{ background: "#E4F3EA", color: "#1E6B44", borderRadius: 6 }}><Briefcase size={10} /> Empleo</span>}
                      <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 15 }}>{b.name}</h3>
                      <StatusBadge status={b.status} />
                      {!isJob && b.featured && <span className="text-[10px] font-semibold px-1.5 py-0.5" style={{ background: "#FBEBD1", color: "#8A5B12", borderRadius: 6 }}>Destacado</span>}
                    </div>
                    <p className="text-xs" style={{ color: "#6B7280" }}>
                      {isJob ? "Empleo" : catInfo(b.cat)?.label} · {b.zone}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#4B5563" }}>
                      Alta: {fmtDate(b.createdAt)} · Renovación: {fmtDate(b.lastRenewal)} ·{" "}
                      <span style={{ color: expired ? "#C1443A" : expiringSoon ? "#B8703F" : "#4B5563", fontWeight: expired || expiringSoon ? 600 : 400 }}>
                        Vence: {fmtDate(b.expiresAt)}{expired ? " (vencido)" : expiringSoon ? " (por vencer)" : ""}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <button onClick={() => onEdit(b)} className="flex items-center gap-1 text-xs px-2.5 py-1.5" style={{ borderRadius: 6, border: "1px solid #E2E8F0" }}><Pencil size={12} /> Editar</button>
                    <button onClick={() => onToggleStatus(b.id)} className="flex items-center gap-1 text-xs px-2.5 py-1.5" style={{ borderRadius: 6, border: "1px solid #E2E8F0" }}><Power size={12} /> {b.status === "active" ? "Desactivar" : "Reactivar"}</button>
                    <button onClick={() => onRenew(b.id)} className="flex items-center gap-1 text-xs px-2.5 py-1.5" style={{ borderRadius: 6, border: "1px solid #E2E8F0" }}><RefreshCw size={12} /> Renovar</button>
                    {!isJob && <button onClick={() => onOpenReviews(b)} className="flex items-center gap-1 text-xs px-2.5 py-1.5" style={{ borderRadius: 6, border: "1px solid #E2E8F0" }}><Star size={12} /> Reseñas ({b.reviews.length})</button>}
                    <button onClick={() => setConfirmDelete(b)} className="flex items-center gap-1 text-xs px-2.5 py-1.5" style={{ borderRadius: 6, border: "1px solid #F3D9D5", color: "#C1443A" }}><Trash2 size={12} /> Eliminar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar negocio"
          message={`¿Eliminar definitivamente "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar" danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}
        />
      )}
    </div>
  );
}

/* ---------- panel del dueño (acceso por código, solo su negocio) ---------- */

function OwnerGate({ businesses, onSuccess, onClose }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    const match = businesses.find((b) => b.ownerCode?.toUpperCase() === code.trim().toUpperCase());
    if (match) onSuccess(match.id);
    else { setError(true); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "#0B1220cc" }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-6" style={{ borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <User size={18} color="#0B2A54" />
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 18 }}>Mi negocio</h2>
        </div>
        <p className="text-xs mb-3" style={{ color: "#4B5563" }}>
          Ingresá el código de dueño que te dieron al registrar tu negocio en Mi Zona.
        </p>
        <input
          autoFocus value={code}
          onChange={(e) => { setCode(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Código de dueño"
          className="w-full border px-3 py-2 text-sm mb-2 font-mono" style={{ borderRadius: 8, borderColor: error ? "#C1443A" : "#E2E8F0" }}
        />
        {error && <p className="text-xs mb-3" style={{ color: "#C1443A" }}>No encontramos ningún negocio con ese código.</p>}
        <button onClick={submit} className="w-full py-2.5 text-sm font-semibold" style={{ backgroundColor: "#0B2A54", color: "#fff", borderRadius: 8 }}>
          Ingresar
        </button>
      </div>
    </div>
  );
}

function DiscountForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = () => {
    if (!form.title.trim() || !form.startDate || !form.endDate) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "#0B1220cc" }} onClick={onCancel}>
      <div className="bg-white w-full max-w-sm p-6" style={{ borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 18 }} className="mb-4">
          {initial.title ? "Editar descuento" : "Nuevo descuento"}
        </h2>
        <div className="flex flex-col gap-3">
          <input placeholder="Título (ej: 20% OFF en desayunos)" value={form.title} onChange={set("title")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
          <input placeholder="Producto o servicio incluido" value={form.item} onChange={set("item")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
          <input placeholder="Porcentaje o beneficio (ej: 20% o 2x1)" value={form.percent} onChange={set("percent")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
          <textarea placeholder="Descripción" value={form.desc} onChange={set("desc")} rows={2} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#4B5563" }}>Desde</p>
              <input type="date" value={form.startDate} onChange={set("startDate")} className="border px-3 py-2 text-sm w-full" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#4B5563" }}>Hasta</p>
              <input type="date" value={form.endDate} onChange={set("endDate")} className="border px-3 py-2 text-sm w-full" style={{ borderRadius: 8, borderColor: "#E2E8F0" }} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium" style={{ borderRadius: 8, border: "1px solid #E2E8F0" }}>Cancelar</button>
            <button onClick={submit} className="flex-1 py-2.5 text-sm font-semibold" style={{ backgroundColor: "#0B2A54", color: "#fff", borderRadius: 8 }}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OwnerPanel({ business, onSaveDiscount, onToggleDiscount, onDeleteDiscount, onLogout }) {
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nuevo, {..} = editar

  const emptyDiscount = () => ({ id: uid(), title: "", item: "", percent: "", desc: "", startDate: todayISO(), endDate: addDays(todayISO(), 30), active: true });

  return (
    <div style={{ backgroundColor: "#F3F6FB", minHeight: "100vh", fontFamily: "'Work Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');`}</style>
      <header className="sticky top-0 z-30" style={{ backgroundColor: "#0B2A54" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18, color: "#fff" }}>Mi negocio</h1>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2" style={{ borderRadius: 8, border: "1px solid #ffffff30", color: "#fff" }}>
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 22, color: "#0B1220" }} className="mb-1">{business.name}</h2>
        <p className="text-sm mb-6" style={{ color: "#6B7280" }}>{catInfo(business.cat)?.label} · {business.zone}</p>

        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 16 }}>Mis descuentos</h3>
          <button onClick={() => setEditing(emptyDiscount())} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5" style={{ borderRadius: 8, backgroundColor: "#0B2A54", color: "#fff" }}>
            <Plus size={13} /> Crear descuento
          </button>
        </div>

        {(business.discounts || []).length === 0 ? (
          <p className="text-sm" style={{ color: "#6B7280" }}>Todavía no creaste ningún descuento.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {business.discounts.map((d) => {
              const active = isDiscountActive(d);
              return (
                <div key={d.id} className="p-4 flex items-start justify-between gap-3" style={{ borderRadius: 10, border: "1px solid #E2E8F0" }}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 15 }}>{d.title}</h4>
                      <span className="text-[10px] font-medium px-1.5 py-0.5" style={{ borderRadius: 10, background: active ? "#E4F3EA" : "#EEEDE7", color: active ? "#1E6B44" : "#7A7D87" }}>
                        {d.active ? (active ? "Vigente" : "Fuera de fecha") : "Desactivado"}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "#4B5563" }}>{fmtDate(d.startDate)} → {fmtDate(d.endDate)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => setEditing(d)} className="p-1.5" style={{ borderRadius: 6, border: "1px solid #E2E8F0" }}><Pencil size={13} /></button>
                    <button onClick={() => onToggleDiscount(d.id)} className="p-1.5" style={{ borderRadius: 6, border: "1px solid #E2E8F0" }}><Power size={13} /></button>
                    <button onClick={() => onDeleteDiscount(d.id)} className="p-1.5" style={{ borderRadius: 6, border: "1px solid #F3D9D5", color: "#C1443A" }}><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {editing && (
        <DiscountForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(d) => { onSaveDiscount(d); setEditing(null); }}
        />
      )}
    </div>
  );
}



export default function MiZona() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  // navegación pública
  const [zone, setZone] = useState(ZONES[0]);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState(null);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sortBy, setSortBy] = useState("destacados");
  const [viewMode, setViewMode] = useState("negocios"); // "negocios" | "empleos"
  const [selectedId, setSelectedId] = useState(null);
  const [showAllCats, setShowAllCats] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // administración
  const [showPasswordGate, setShowPasswordGate] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminView, setAdminView] = useState(false); // true = viendo el panel
  const [editingBiz, setEditingBiz] = useState(null); // objeto en edición/creación
  const [reviewsBiz, setReviewsBiz] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // panel del dueño
  const [showOwnerGate, setShowOwnerGate] = useState(false);
  const [ownerBizId, setOwnerBizId] = useState(null);

  // agregar mi local
  const [showAddBusiness, setShowAddBusiness] = useState(false);

  // pestaña activa de la barra inferior (Inicio | Explorar | Empleos | Perfil)
  const [activeTab, setActiveTab] = useState("inicio");
  const [showAccountSheet, setShowAccountSheet] = useState(false);

  // "más cercanos"
  const [userLoc, setUserLoc] = useState(null); // { lat, lng } — solo en memoria, nunca se guarda
  const [locStatus, setLocStatus] = useState("idle"); // idle | loading | denied | error | ok

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocStatus("error"); return; }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("ok");
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  useEffect(() => {
    (async () => {
      try {
        const list = await loadBusinesses();
        setBusinesses(list);
      } catch (e) {
        console.error(e);
        setErrorMsg("No se pudieron cargar los negocios. Revisá que el servidor esté encendido y VITE_API_URL apunte a él.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Actualiza UN negocio en el estado local y lo guarda en el servidor
  const persistOne = (id, updaterOrObj) => {
    setBusinesses((prev) => {
      const next = prev.map((b) => (b.id === id ? (typeof updaterOrObj === "function" ? updaterOrObj(b) : updaterOrObj) : b));
      const updated = next.find((b) => b.id === id);
      if (updated) {
        updateBusinessOnServer(id, updated).catch((e) => {
          console.error(e);
          setErrorMsg("No se pudo guardar el cambio. Revisá que el servidor y MongoDB estén andando.");
        });
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = businesses.filter((b) => {
      if (b.kind === "job") return false;
      if (b.status !== "active") return false;
      const matchCat = activeCat ? b.cat === activeCat : true;
      const matchZone = b.zone === zone;
      const haystack = [b.name, b.desc, ...(b.services || []), ...(b.specialties || [])].join(" ").toLowerCase();
      const matchQ = q ? haystack.includes(q) : true;
      const matchOpen = onlyOpen ? isOpenNow(b.weekHours) : true;
      const matchDiscount = sortBy === "descuentos" ? activeDiscounts(b).length > 0 : true;
      return matchCat && matchZone && matchQ && matchOpen && matchDiscount;
    });
    list = [...list];
    if (sortBy === "vistas") {
      list.sort((a, b) => b.views - a.views);
    } else if (sortBy === "cercanos" && userLoc) {
      const withCoords = list.filter((b) => b.lat && b.lng);
      const withoutCoords = list.filter((b) => !(b.lat && b.lng));
      withCoords.sort((a, b) => haversineKm(userLoc.lat, userLoc.lng, a.lat, a.lng) - haversineKm(userLoc.lat, userLoc.lng, b.lat, b.lng));
      list = [...withCoords, ...withoutCoords];
    } else {
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return list;
  }, [businesses, query, activeCat, zone, onlyOpen, sortBy, userLoc]);

  const jobsFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return businesses.filter((b) => {
      if (b.kind !== "job" || b.status !== "active" || b.zone !== zone) return false;
      const haystack = (b.name + " " + b.desc).toLowerCase();
      return q ? haystack.includes(q) : true;
    });
  }, [businesses, query, zone]);

  const selected = businesses.find((b) => b.id === selectedId);
  const ownerBiz = businesses.find((b) => b.id === ownerBizId);

  const openDetail = (id) => {
    persistOne(id, (b) => ({ ...b, views: b.views + 1 }));
    setSelectedId(id);
    window.scrollTo(0, 0);
  };

  const addReview = (id, review) => {
    persistOne(id, (b) => ({ ...b, reviews: [...b.reviews, review] }));
  };

  // acciones de admin
  const saveBusiness = (biz) => {
    const exists = businesses.some((b) => b.id === biz.id);
    if (exists) {
      persistOne(biz.id, biz);
    } else {
      setBusinesses((prev) => [biz, ...prev]);
      createBusinessOnServer(biz).catch((e) => {
        console.error(e);
        setErrorMsg("No se pudo crear el negocio. Revisá que el servidor y MongoDB estén andando.");
      });
    }
    setEditingBiz(null);
  };
  const toggleStatus = (id) => {
    persistOne(id, (b) => ({ ...b, status: b.status === "active" ? "inactive" : "active" }));
  };
  const renewSubscription = (id) => {
    persistOne(id, (b) => ({ ...b, status: "active", lastRenewal: todayISO(), expiresAt: addDays(todayISO(), 30) }));
  };
  const deleteBusiness = (id) => {
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
    deleteBusinessOnServer(id).catch((e) => {
      console.error(e);
      setErrorMsg("No se pudo eliminar el negocio del servidor.");
    });
  };
  const deleteReview = (bizId, reviewId) => {
    persistOne(bizId, (b) => ({ ...b, reviews: b.reviews.filter((r) => r.id !== reviewId) }));
    setReviewsBiz((prev) => (prev ? { ...prev, reviews: prev.reviews.filter((r) => r.id !== reviewId) } : prev));
  };

  // acciones del dueño (solo afectan su propio negocio, nunca otros)
  const saveOwnerDiscount = (discount) => {
    persistOne(ownerBizId, (b) => {
      const exists = (b.discounts || []).some((d) => d.id === discount.id);
      const discounts = exists ? b.discounts.map((d) => (d.id === discount.id ? discount : d)) : [...(b.discounts || []), discount];
      return { ...b, discounts };
    });
  };
  const toggleOwnerDiscount = (discountId) => {
    persistOne(ownerBizId, (b) => ({ ...b, discounts: b.discounts.map((d) => (d.id === discountId ? { ...d, active: !d.active } : d)) }));
  };
  const deleteOwnerDiscount = (discountId) => {
    persistOne(ownerBizId, (b) => ({ ...b, discounts: b.discounts.filter((d) => d.id !== discountId) }));
  };

  if (loading) {
    return <div style={{ backgroundColor: "#F3F6FB", minHeight: "100vh" }} className="flex items-center justify-center text-sm" ><span style={{color:"#6B7280"}}>Cargando...</span></div>;
  }

  const globalStyle = (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');`}</style>
  );

  /* ---- vista panel del dueño ---- */
  if (ownerBiz) {
    return (
      <OwnerPanel
        business={ownerBiz}
        onSaveDiscount={saveOwnerDiscount}
        onToggleDiscount={toggleOwnerDiscount}
        onDeleteDiscount={deleteOwnerDiscount}
        onLogout={() => setOwnerBizId(null)}
      />
    );
  }

  /* ---- vista administración ---- */
  if (adminView && adminAuthed) {
    return (
      <div style={{ fontFamily: "'Work Sans', sans-serif" }}>
        {globalStyle}
        {errorMsg && (
          <div className="px-4 py-2 text-center text-sm font-medium" style={{ background: "#F7E7E5", color: "#9A3B34" }}>
            {errorMsg} <button onClick={() => setErrorMsg(null)} className="underline ml-2">cerrar</button>
          </div>
        )}
        <AdminDashboard
          businesses={businesses}
          onAddNew={() => setEditingBiz(emptyBusiness())}
          onAddNewJob={() => setEditingBiz(emptyJob())}
          onEdit={(b) => setEditingBiz(b)}
          onToggleStatus={toggleStatus}
          onRenew={renewSubscription}
          onDelete={deleteBusiness}
          onOpenReviews={(b) => setReviewsBiz(b)}
          onLogout={() => { setAdminView(false); setAdminAuthed(false); }}
        />
        {editingBiz && editingBiz.kind === "job" && (
          <JobForm initial={editingBiz} onSave={saveBusiness} onCancel={() => setEditingBiz(null)} />
        )}
        {editingBiz && editingBiz.kind !== "job" && (
          <BusinessForm initial={editingBiz} onSave={saveBusiness} onCancel={() => setEditingBiz(null)} />
        )}
        {reviewsBiz && <ReviewsModal business={reviewsBiz} onDeleteReview={deleteReview} onClose={() => setReviewsBiz(null)} />}
      </div>
    );
  }

  /* ---- vista ficha de negocio ---- */
  if (selected) {
    return (
      <div style={{ fontFamily: "'Work Sans', sans-serif" }}>
        {globalStyle}
        <BusinessDetail biz={selected} onBack={() => setSelectedId(null)} onOpenPhoto={setLightboxSrc} onAddReview={addReview} />
        {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      </div>
    );
  }

  /* ---- vista pública: listado ---- */
  return (
    <div style={{ backgroundColor: "#F3F6FB", minHeight: "100vh", fontFamily: "'Work Sans', sans-serif" }}>
      {globalStyle}

      {errorMsg && (
        <div className="px-4 py-2 text-center text-sm font-medium" style={{ background: "#F7E7E5", color: "#9A3B34" }}>
          {errorMsg} <button onClick={() => setErrorMsg(null)} className="underline ml-2">cerrar</button>
        </div>
      )}

      <PublicHeader
        zone={zone} setZone={setZone} query={query} setQuery={setQuery}
        activeCat={activeCat} setActiveCat={setActiveCat}
        onOpenAllCats={() => setShowAllCats(true)}
        onOpenAdmin={() => (adminAuthed ? setAdminView(true) : setShowPasswordGate(true))}
        onOpenOwner={() => setShowOwnerGate(true)}
        showAccount={showAccountSheet} setShowAccount={setShowAccountSheet}
      />

      {showAllCats && <CategoryModal activeCat={activeCat} onSelect={(id) => { setActiveCat(id); setShowAllCats(false); }} onClose={() => setShowAllCats(false)} />}
      {showPasswordGate && (
        <PasswordGate
          onSuccess={() => { setAdminAuthed(true); setShowPasswordGate(false); setAdminView(true); }}
          onClose={() => setShowPasswordGate(false)}
        />
      )}
      {showOwnerGate && (
        <OwnerGate
          businesses={businesses}
          onSuccess={(id) => { setOwnerBizId(id); setShowOwnerGate(false); }}
          onClose={() => setShowOwnerGate(false)}
        />
      )}
      {showAddBusiness && <AddBusinessModal onClose={() => setShowAddBusiness(false)} />}

      <main className="max-w-6xl mx-auto px-4 py-6" style={{ paddingBottom: 90 }}>
        {activeTab === "explorar" && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: 16, color: "#0B1220" }}>Explorar</p>
              <p className="text-xs" style={{ color: "#6B7280" }}>Descubrí negocios y servicios cerca tuyo</p>
            </div>
            <button
              onClick={() => setShowAllCats(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2"
              style={{ borderRadius: 8, border: "1px solid #E2E8F0", color: "#0B1220" }}
            >
              <Grid3x3 size={13} /> Rubros
            </button>
          </div>
        )}

        {viewMode === "empleos" ? (
          <>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#6B7280" }} className="mb-4">
              {jobsFiltered.length} {jobsFiltered.length === 1 ? "empleo en" : "empleos en"} {zone}
            </p>
            {jobsFiltered.length === 0 ? (
              <div className="text-center py-16" style={{ color: "#6B7280" }}>
                <p className="mb-1" style={{ fontFamily: "'Poppins', sans-serif", fontSize: 19, color: "#0B1220" }}>
                  No hay empleos publicados en {zone}
                </p>
                <p className="text-sm">Probá cambiando de zona, o volvé más adelante.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {jobsFiltered.map((job) => <JobCard key={job.id} job={job} />)}
              </div>
            )}
          </>
        ) : (
        <>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#6B7280" }}>
            {filtered.length} {filtered.length === 1 ? "negocio en" : "negocios en"} {zone}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5"
              style={{ borderRadius: 20, backgroundColor: onlyOpen ? "#E4F3EA" : "#fff", color: onlyOpen ? "#1E6B44" : "#4B5563", border: "1px solid " + (onlyOpen ? "#2C9A5F" : "#E2E8F0") }}
            >
              <span className="rounded-full" style={{ width: 6, height: 6, backgroundColor: onlyOpen ? "#2C9A5F" : "#B9BCC5" }} />
              Solo abiertos ahora
            </button>
            <div className="relative">
              <select
                value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none text-xs font-medium pl-3 pr-7 py-1.5"
                style={{ borderRadius: 20, border: "1px solid #E2E8F0", color: "#0B1220", backgroundColor: "#fff" }}
              >
                <option value="destacados">⭐ Destacados</option>
                <option value="vistas">👁️ Más visitados</option>
                <option value="descuentos">🏷️ Descuentos</option>
                <option value="cercanos">📍 Más cercanos</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" color="#6B7280" />
            </div>
          </div>
        </div>

        {sortBy === "cercanos" && locStatus === "idle" && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3" style={{ background: "#E8F0FE", borderRadius: 10 }}>
            <p className="text-sm" style={{ color: "#0B2A54" }}>Activá tu ubicación para ver qué negocios tenés más cerca.</p>
            <button
              onClick={requestLocation}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 shrink-0"
              style={{ borderRadius: 8, backgroundColor: "#0B2A54", color: "#fff" }}
            >
              <LocateFixed size={14} /> Activar ubicación
            </button>
          </div>
        )}
        {sortBy === "cercanos" && locStatus === "loading" && (
          <p className="text-xs mb-4" style={{ color: "#4B5563" }}>Ubicándote para ordenar por cercanía...</p>
        )}
        {sortBy === "cercanos" && locStatus === "denied" && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 flex-wrap" style={{ background: "#F7E7E5", borderRadius: 10 }}>
            <p className="text-sm" style={{ color: "#9A3B34" }}>
              Rechazaste el permiso de ubicación. Para usar "Más cercanos" habilitalo desde el ícono de candado/ubicación en la barra del navegador, y tocá reintentar.
            </p>
            <button onClick={requestLocation} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 shrink-0" style={{ borderRadius: 8, backgroundColor: "#9A3B34", color: "#fff" }}>
              <LocateFixed size={14} /> Reintentar
            </button>
          </div>
        )}
        {sortBy === "cercanos" && locStatus === "error" && (
          <p className="text-xs mb-4 px-3 py-2" style={{ background: "#F7E7E5", color: "#9A3B34", borderRadius: 8 }}>
            Tu navegador no permite obtener la ubicación. Te mostramos el orden habitual.
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: "#6B7280" }}>
            <p className="mb-1" style={{ fontFamily: "'Poppins', sans-serif", fontSize: 19, color: "#0B1220" }}>
              {businesses.length === 0 ? "Todavía no hay negocios cargados" : `No hay resultados en ${zone}`}
            </p>
            <p className="text-sm">
              {businesses.length === 0 ? "Ingresá al modo Administrador para agregar el primero." : "Probá con otra categoría, otra búsqueda, o cambiá de zona."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((biz) => (
              <BusinessCard
                key={biz.id} biz={biz} onOpen={openDetail} onOpenPhoto={setLightboxSrc}
                distanceKm={sortBy === "cercanos" && userLoc && biz.lat && biz.lng ? haversineKm(userLoc.lat, userLoc.lng, biz.lat, biz.lng) : undefined}
              />
            ))}
          </div>
        )}
        </>
        )}
      </main>

      <BottomNav
        active={activeTab}
        onInicio={() => { setActiveTab("inicio"); setViewMode("negocios"); setActiveCat(null); setSortBy("destacados"); window.scrollTo(0, 0); }}
        onExplorar={() => { setActiveTab("explorar"); setViewMode("negocios"); window.scrollTo(0, 0); }}
        onAdd={() => setShowAddBusiness(true)}
        onEmpleos={() => { setActiveTab("empleos"); setViewMode("empleos"); window.scrollTo(0, 0); }}
        onPerfil={() => { setActiveTab("perfil"); setShowAccountSheet(true); }}
      />

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
