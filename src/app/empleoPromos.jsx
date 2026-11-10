// Ventanas de historias, empleo y promociones del negocio.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useEffect, useState } from "react";
import { Briefcase, MessageCircle, Pencil, Plus, Power, Share2, Tag, Trash2, X } from "lucide-react";
import { DURACIONES_BUSQUEDA, TIPOS_PUESTO } from "./constantes.js";
import { contactoEmpleoLink, isDiscountActive } from "./negocios.js";
import { addDays, fmtDate, todayISO, uid } from "./utilidades.js";

// Modal que ve el CLIENTE al tocar el aviso de "busca personal" en el perfil del negocio
// Visor de historias a pantalla completa: tocar la mitad derecha avanza, la izquierda retrocede
export function HistoriaViewerModal({ business, historias, onClose }) {
  const [i, setI] = useState(0);
  const DURACION = 5000; // ms por historia, como cualquier red social

  useEffect(() => {
    if (i >= historias.length) { onClose(); return; }
    const t = setTimeout(() => setI((v) => v + 1), DURACION);
    return () => clearTimeout(t);
  }, [i, historias.length, onClose]);

  if (i >= historias.length) return null;
  const actual = historias[i];

  const tocar = (e) => {
    const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
    const mitad = window.innerWidth / 2;
    if (x < mitad) setI((v) => Math.max(0, v - 1));
    else setI((v) => (v + 1 >= historias.length ? historias.length : v + 1));
  };

  return (
    <div className="fixed inset-0 z-[90]" style={{ background: "#000" }}>
      <div className="absolute top-0 left-0 right-0 flex gap-1 px-2 pt-3 z-10">
        {historias.map((h, idx) => (
          <div key={h.id} className="flex-1 overflow-hidden" style={{ height: 3, borderRadius: 2, background: "#ffffff40" }}>
            <div style={{ height: "100%", width: idx < i ? "100%" : idx === i ? "100%" : "0%", background: "#fff", transition: idx === i ? `width ${DURACION}ms linear` : "none" }} />
          </div>
        ))}
      </div>

      <div className="absolute flex items-center gap-2 z-10" style={{ top: 20, left: 12, right: 12 }}>
        <div className="flex items-center justify-center shrink-0 text-xs font-bold" style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--azul)", color: "#fff" }}>
          {business.name?.[0]?.toUpperCase()}
        </div>
        <span className="text-sm font-semibold" style={{ color: "#fff" }}>{business.name}</span>
        <button onClick={onClose} aria-label="Cerrar" className="ml-auto" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={22} color="#fff" aria-hidden="true" /></button>
      </div>

      <div className="w-full h-full flex items-center justify-center" onClick={tocar}>
        <img src={actual.url} alt="" className="max-w-full max-h-full object-contain" />
      </div>
    </div>
  );
}

export function EmpleoDetalleModal({ business, onClose }) {
  const e = business.busquedaEmpleo;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "#0B143766" }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-6" style={{ borderRadius: 16 }} onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 16, color: "#0B1437" }}>
            <Briefcase size={17} color="var(--azul)" /> Buscan personal
          </span>
          <button onClick={onClose} aria-label="Cerrar" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={18} color="#5B6482" aria-hidden="true" /></button>
        </div>
        <p className="text-xs font-semibold mb-1" style={{ color: "var(--azul)" }}>{e.puesto}</p>
        <p className="text-sm mb-5" style={{ color: "#1F2937", lineHeight: 1.6 }}>{e.descripcion}</p>
        <a
          href={contactoEmpleoLink(business)} target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 text-sm font-semibold py-3 w-full"
          style={{ backgroundColor: "var(--azul)", color: "#fff", borderRadius: 10 }}
        >
          {e.contactoTipo === "whatsapp" ? <MessageCircle size={16} /> : <Share2 size={16} />}
          Contactar por esta búsqueda
        </a>
      </div>
    </div>
  );
}

// Modal que usa el DUEÑO para crear, editar o eliminar su búsqueda de personal
export function EmpleoFormModal({ business, onSave, onDelete }) {
  const existente = business.busquedaEmpleo;
  const [puesto, setPuesto] = useState(existente?.puesto || TIPOS_PUESTO[0]);
  const [otro, setOtro] = useState(existente?.puesto && !TIPOS_PUESTO.includes(existente.puesto) ? existente.puesto : "");
  const [descripcion, setDescripcion] = useState(existente?.descripcion || "");
  const [dias, setDias] = useState(30);
  const [contactoTipo, setContactoTipo] = useState(existente?.contactoTipo || "whatsapp");
  const [contactoValor, setContactoValor] = useState(existente?.contactoValor || "");

  const guardar = () => {
    const puestoFinal = puesto === "Otro" ? (otro.trim() || "Otro") : puesto;
    if (!puestoFinal.trim() || !descripcion.trim() || !contactoValor.trim()) return;
    const ahora = new Date();
    const fin = new Date(ahora); fin.setDate(fin.getDate() + dias);
    onSave({
      puesto: puestoFinal.trim(), descripcion: descripcion.trim(),
      contactoTipo, contactoValor: contactoValor.trim(),
      fechaInicio: ahora.toISOString(), fechaFin: fin.toISOString(),
    });
  };

  return (
    <div>
      <div className="bg-white p-5" style={{ borderRadius: 18, border: "1px solid #E3E7F1" }}>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Tipo de puesto</p>
            <select value={puesto} onChange={(e) => setPuesto(e.target.value)} className="w-full border px-3 py-2.5 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}>
              {TIPOS_PUESTO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {puesto === "Otro" && (
            <input aria-label="¿Qué puesto buscás?" value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="¿Qué puesto buscás?" className="w-full border px-3 py-2.5 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          )}
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Descripción del trabajo</p>
            <textarea aria-label="Contá qué va a hacer la persona, horarios, requisitos..."
              value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3}
              placeholder="Contá qué va a hacer la persona, horarios, requisitos..."
              className="w-full border px-3 py-2.5 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}
            />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>¿Cuánto tiempo va a estar publicada?</p>
            <div className="flex gap-2 flex-wrap">
              {DURACIONES_BUSQUEDA.map((d) => (
                <button
                  key={d.dias} onClick={() => setDias(d.dias)}
                  className="text-xs font-medium px-3 py-1.5"
                  style={{ borderRadius: 20, border: "1px solid " + (dias === d.dias ? "var(--azul)" : "#E3E7F1"), background: dias === d.dias ? "var(--azul-suave)" : "#fff", color: dias === d.dias ? "var(--azul)" : "#2B3768" }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>¿Cómo te van a contactar?</p>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setContactoTipo("whatsapp")}
                className="flex-1 text-xs font-medium py-2"
                style={{ borderRadius: 8, border: "1px solid " + (contactoTipo === "whatsapp" ? "var(--azul)" : "#E3E7F1"), background: contactoTipo === "whatsapp" ? "var(--azul-suave)" : "#fff", color: contactoTipo === "whatsapp" ? "var(--azul)" : "#2B3768" }}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setContactoTipo("red_social")}
                className="flex-1 text-xs font-medium py-2"
                style={{ borderRadius: 8, border: "1px solid " + (contactoTipo === "red_social" ? "var(--azul)" : "#E3E7F1"), background: contactoTipo === "red_social" ? "var(--azul-suave)" : "#fff", color: contactoTipo === "red_social" ? "var(--azul)" : "#2B3768" }}
              >
                Red social / link
              </button>
            </div>
            <input
              value={contactoValor} onChange={(e) => setContactoValor(e.target.value)}
              placeholder={contactoTipo === "whatsapp" ? "Número con código de país, sin +" : "Link de Instagram, Facebook, etc."}
              className="w-full border px-3 py-2.5 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}
            />
          </div>

          <button onClick={guardar} className="text-sm font-semibold py-3 mt-1" style={{ backgroundColor: "var(--azul)", color: "#fff", borderRadius: 10 }}>
            {existente ? "Guardar cambios" : "Publicar búsqueda"}
          </button>
          {existente && (
            <button onClick={onDelete} className="text-sm font-semibold py-2.5" style={{ color: "#9A3B34" }}>
              Eliminar búsqueda
            </button>
          )}
        </div>
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "#0B1437cc" }} onClick={onCancel}>
      <div className="bg-white w-full max-w-sm p-6" style={{ borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 18 }} className="mb-4">
          {initial.title ? "Editar descuento" : "Nuevo descuento"}
        </h2>
        <div className="flex flex-col gap-3">
          <input aria-label="Título (ej: 20% OFF en desayunos)" placeholder="Título (ej: 20% OFF en desayunos)" value={form.title} onChange={set("title")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          <input aria-label="Producto o servicio incluido" placeholder="Producto o servicio incluido" value={form.item} onChange={set("item")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          <input aria-label="Porcentaje o beneficio (ej: 20% o 2x1)" placeholder="Porcentaje o beneficio (ej: 20% o 2x1)" value={form.percent} onChange={set("percent")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          <textarea aria-label="Descripción" placeholder="Descripción" value={form.desc} onChange={set("desc")} rows={2} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Desde</p>
              <input type="date" value={form.startDate} onChange={set("startDate")} className="border px-3 py-2 text-sm w-full" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Hasta</p>
              <input type="date" value={form.endDate} onChange={set("endDate")} className="border px-3 py-2 text-sm w-full" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium" style={{ borderRadius: 8, border: "1px solid #E3E7F1" }}>Cancelar</button>
            <button onClick={submit} className="flex-1 py-2.5 text-sm font-semibold" style={{ backgroundColor: "#0B1437", color: "#fff", borderRadius: 8 }}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PromosSheet({ business, onSave, onToggle, onDelete }) {
  const [editing, setEditing] = useState(null); // null = cerrado, objeto = nuevo o editando
  const emptyDiscount = () => ({ id: uid(), title: "", item: "", percent: "", desc: "", startDate: todayISO(), endDate: addDays(todayISO(), 30), active: true });
  const lista = business.discounts || [];

  return (
    <div>
      <div>
          <button onClick={() => setEditing(emptyDiscount())} className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold py-3 mb-3" style={{ borderRadius: 14, background: "linear-gradient(135deg,var(--azul),var(--azul-medio))", color: "#fff", boxShadow: "0 8px 18px rgba(var(--azul-rgb),.3)" }}>
            <Plus size={16} /> Crear promoción
          </button>
          {lista.length === 0 ? (
            <div className="text-center py-8">
              <span className="inline-flex items-center justify-center mb-2" style={{ width: 52, height: 52, borderRadius: 18, background: "#FBEBD1" }}><Tag size={22} color="#B8703F" /></span>
              <p className="text-sm font-semibold" style={{ color: "#0B1437" }}>Todavía no creaste promociones</p>
              <p className="text-xs mt-0.5" style={{ color: "#5B6482" }}>Un descuento atrae más clientes a tu negocio.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {lista.map((d) => {
                const vigente = isDiscountActive(d);
                return (
                  <div key={d.id} className="p-3.5" style={{ borderRadius: 16, border: "1px solid #E3E7F1", background: vigente ? "#FFFBF2" : "#fff" }}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 14, color: "#0B1437" }}>{d.title}</h4>
                      {d.percent && <span className="text-[11px] font-bold px-2 py-0.5 shrink-0" style={{ borderRadius: 10, background: "#0B1437", color: "#fff" }}>{d.percent} OFF</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 mr-2" style={{ borderRadius: 8, background: vigente ? "#E4F3EA" : "#EEEDE7", color: vigente ? "#1E6B44" : "#7A7D87" }}>
                          {d.active ? (vigente ? "Vigente" : "Fuera de fecha") : "Pausada"}
                        </span>
                        <span className="text-[11px]" style={{ color: "#5B6482" }}>{fmtDate(d.startDate)} → {fmtDate(d.endDate)}</span>
                      </span>
                      <span className="flex gap-1.5 shrink-0">
                        <button onClick={() => setEditing(d)} aria-label="Editar" className="p-1.5" style={{ borderRadius: 8, border: "1px solid #E3E7F1" }}><Pencil size={13} /></button>
                        <button onClick={() => onToggle(d.id)} aria-label="Pausar o activar" className="p-1.5" style={{ borderRadius: 8, border: "1px solid #E3E7F1" }}><Power size={13} /></button>
                        <button onClick={() => { if (window.confirm("¿Eliminar esta promoción?")) onDelete(d.id); }} aria-label="Eliminar" className="p-1.5" style={{ borderRadius: 8, border: "1px solid #F3D9D5", color: "#C1443A" }}><Trash2 size={13} /></button>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      {editing && (
        <DiscountForm initial={editing} onCancel={() => setEditing(null)} onSave={(d) => { onSave(d); setEditing(null); }} />
      )}
    </div>
  );
}
