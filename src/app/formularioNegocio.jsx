// Formulario para crear y editar un negocio.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useRef, useState } from "react";
import { Camera, Clock, Coins, Facebook, ImageIcon, Instagram, MapPin, MessageCircle, Music2, Phone, Store, Tag } from "lucide-react";
import DialogoAdvertencia from "../componentes/DialogoAdvertencia.jsx";
import { Avance, EditorHorarios, EntradaIcono, GaleriaFotos, Interruptor, Seccion, SelectorLogo, useSubidas } from "../formKit.jsx";
import { Campo, Chip as ChipForm, Pagina, botonPrincipal, botonSecundario, caja } from "../oficios.jsx";
import { comprimirFoto, uploadImage } from "../subirFoto.js";
import { CATEGORIES, CATEGORY_QUESTIONS, DEFAULT_QUESTIONS, PAYMENT_METHODS } from "./constantes.js";
import { TagInput, ZonePicker } from "./piezas.jsx";
import { geocodeAddress } from "./utilidades.js";

/* ---------- formulario de negocio (admin y alta pública) ---------- */

export function BusinessForm({ initial, onSave, onCancel, abrirMapa, publicMode = false }) {
  const [form, setForm] = useState(() => ({
    ...initial,
    services: initial.services || [], specialties: initial.specialties || [], paymentMethods: initial.paymentMethods || [],
    photos: initial.photos || [], extra: initial.extra || {},
  }));
  const ubicElegida = useRef(null); // dirección elegida en el mapa: sus coordenadas ya son exactas, no hace falta buscarlas de nuevo
  const [subiendoPortada, setSubiendoPortada] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null); // { campo, msg }
  const [sinMapa, setSinMapa] = useState(null); // coordenadas pendientes si la dirección no se pudo ubicar
  const refPortada = useRef(null);
  const esNuevo = publicMode && !initial.name;

  const fallo = (campo, msg) => {
    setError({ campo, msg });
    requestAnimationFrame(() => {
      const el = document.getElementById(campo);
      el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      el?.focus?.({ preventScroll: true });
    });
  };
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); if (error?.campo) setError(null); };
  const onTexto = (k) => (e) => set(k, e.target.value);
  const setExtra = (k, v) => setForm((f) => ({ ...f, extra: { ...f.extra, [k]: v } }));
  const togglePayment = (m) => setForm((f) => ({ ...f, paymentMethods: f.paymentMethods.includes(m) ? f.paymentMethods.filter((x) => x !== m) : [...f.paymentMethods, m] }));

  const { subiendo, subir } = useSubidas({ max: 12, onError: (m) => (m ? fallo("nb-fotos", m) : setError(null)) });
  const ayudaSubir = { fotos: form.photos, setFotos: (p) => set("photos", p), setLogo: (u) => set("logo", u) };

  // Foto de fondo del perfil: una sola, la elige el dueño (no se toma de las fotos de productos)
  const subirPortada = async (archivos) => {
    const a = archivos?.[0]; if (!a) return;
    if (!/^image\//.test(a.type) || a.size > 15 * 1024 * 1024) { fallo("nb-portada", "Elegí una imagen de hasta 15 MB."); return; }
    setSubiendoPortada(true); setError(null);
    try { set("portada", await uploadImage(await comprimirFoto(a))); }
    catch { fallo("nb-portada", "No pudimos subir la foto. Probá de nuevo en un rato."); }
    setSubiendoPortada(false);
  };

  const terminar = (coords) => onSave({ ...form, lat: coords.lat, lng: coords.lng, status: esNuevo ? "inactive" : form.status });

  const submit = async () => {
    if (!form.name.trim()) return fallo("nb-nombre", "Escribí el nombre del negocio.");
    if (!form.phone.trim()) return fallo("nb-tel", "Escribí el número de contacto.");
    if (!form.logo) return fallo("nb-logo", "Subí el logo de tu negocio: es obligatorio.");
    if (!form.portada) return fallo("nb-portada", "Elegí la foto de fondo de tu perfil: es obligatoria.");
    setError(null);
    setSaving(true);
    let coords = { lat: form.lat ?? null, lng: form.lng ?? null };
    // Si cambió la dirección o todavía no tiene coordenadas, geocodificamos automáticamente
    const elegidaEnMapa = ubicElegida.current && ubicElegida.current.loc === form.loc && coords.lat != null;
    if (form.loc?.trim() && !elegidaEnMapa && (!coords.lat || form.loc !== initial.loc || form.zone !== initial.zone)) {
      const geo = await geocodeAddress(form.loc, form.zone);
      if (geo) coords = geo;
    }
    setSaving(false);
    // Si la dirección no se pudo ubicar, el negocio no va a aparecer en el mapa: se le avisa antes de seguir
    if (form.loc?.trim() && !coords.lat) { setSinMapa(coords); return; }
    terminar(coords);
  };

  const preguntas = CATEGORY_QUESTIONS[form.cat] || DEFAULT_QUESTIONS;
  const rubro = CATEGORIES.find((c) => c.id === form.cat)?.label;
  const hayHorarios = form.weekHours?.some((d) => d && d[0] !== null && d[0] !== undefined);
  const pasos = [
    { ok: !!form.name.trim(), texto: "Nombre del negocio", requerido: true },
    { ok: !!form.phone.trim(), texto: "Número de contacto", requerido: true },
    { ok: !!form.logo, texto: "Logo", requerido: true },
    { ok: !!form.portada, texto: "Foto de fondo", requerido: true },
    { ok: form.desc.trim().length >= 20, texto: "Descripción" },
    { ok: !!form.loc?.trim(), texto: "Dirección" },
    { ok: !!hayHorarios, texto: "Horarios" },
    { ok: form.photos.length > 0, texto: "Fotos de productos" },
  ];
  const malo = (campo) => (error?.campo === campo ? { borderColor: "#C1443A", boxShadow: "0 0 0 2px #F6D5D2" } : null);

  return (
    <div className="fixed inset-0 z-[75] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
      <Pagina titulo={initial.name ? "Editar mi negocio" : "Registrar mi negocio"} onVolver={onCancel}
        pie={
          <div style={{ flex: 1, minWidth: 0 }}>
            {error && <p role="alert" className="text-sm font-bold" style={{ color: "#8E2B22", background: "#FDECEA", borderRadius: 12, padding: "8px 12px", marginBottom: 8, lineHeight: 1.35 }}>{error.msg}</p>}
            <button type="button" onClick={submit} disabled={saving} style={{ ...botonPrincipal, width: "100%", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Ubicando dirección…" : esNuevo ? "Continuar" : "Guardar cambios"}
            </button>
          </div>
        }>
        <Avance pasos={pasos} titulo="Tu negocio" />
        {esNuevo && <p className="text-sm mb-3" style={{ color: "#4A5372", lineHeight: 1.45 }}>Completá lo que está marcado como necesario. En el paso siguiente elegís tu mes gratis o un plan.</p>}

        <Seccion icono={Store} titulo="Presentación" subtitulo="Lo primero que ve quien te busca.">
          <div id="nb-logo" tabIndex={-1} style={{ outline: "none", ...(error?.campo === "nb-logo" ? { borderRadius: 24, boxShadow: "0 0 0 2px #C1443A", padding: 6 } : null) }}>
            <SelectorLogo valor={form.logo} subiendo={subiendo === "logo"} etiqueta="Logo (necesario)" onArchivo={(a) => subir(a, "logo", ayudaSubir)} onQuitar={() => set("logo", "")} />
          </div>
          <div className="mt-4" />
          <Campo id="nb-nombre" etiqueta="Nombre del negocio" contador={`${form.name.length}/80`}>
            <input id="nb-nombre" value={form.name} onChange={onTexto("name")} maxLength={80} autoComplete="organization" aria-invalid={error?.campo === "nb-nombre"} style={{ ...caja, ...malo("nb-nombre") }} />
          </Campo>
          <Campo id="nb-rubro" etiqueta="Rubro">
            <select id="nb-rubro" value={form.cat} onChange={onTexto("cat")} style={caja}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Campo>
          <Campo id="nb-desc" etiqueta="Descripción" contador={`${form.desc.length}/1200`} ayuda="Contá qué ofrecés y qué te hace distinto.">
            <textarea id="nb-desc" value={form.desc} onChange={onTexto("desc")} rows={4} maxLength={1200} style={{ ...caja, resize: "none", lineHeight: 1.5 }} />
          </Campo>
        </Seccion>

        <Seccion icono={Tag} titulo="Qué ofrecés" subtitulo="Ayuda a que te encuentren por lo que hacés." opcional>
          <Campo id="nb-serv" etiqueta="Servicios o productos"><TagInput id="nb-serv" values={form.services} onChange={(v) => set("services", v)} placeholder="Ej: reparación de celulares" /></Campo>
          <Campo id="nb-esp" etiqueta="Especialidades"><TagInput id="nb-esp" values={form.specialties} onChange={(v) => set("specialties", v)} placeholder="Ej: pastelería sin gluten" /></Campo>
          {preguntas.length > 0 && (
            <div style={{ borderTop: "1px solid #EEF1F8", paddingTop: 14 }}>
              <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Sobre tu rubro{rubro ? ` (${rubro})` : ""}</p>
              {preguntas.map((q, i) => q.type === "bool" ? (
                <Interruptor key={q.key} activo={!!form.extra?.[q.key]} onChange={() => setExtra(q.key, !form.extra?.[q.key])} titulo={q.label} />
              ) : (
                <Campo key={q.key} id={`nb-q${i}`} etiqueta={q.label}>
                  <input id={`nb-q${i}`} value={form.extra?.[q.key] || ""} onChange={(e) => setExtra(q.key, e.target.value)} placeholder={q.placeholder} style={caja} />
                </Campo>
              ))}
            </div>
          )}
        </Seccion>

        <Seccion icono={Coins} titulo="Cobros y envíos" subtitulo="Cómo te pagan y si llevás a domicilio." opcional>
          <p id="nb-pagos" className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Medios de pago</p>
          <div role="group" aria-labelledby="nb-pagos" className="flex flex-wrap gap-2 mb-3">
            {PAYMENT_METHODS.map((m) => <ChipForm key={m} activo={form.paymentMethods.includes(m)} onClick={() => togglePayment(m)}>{m}</ChipForm>)}
          </div>
          <div style={{ borderTop: "1px solid #EEF1F8", paddingTop: 10 }}>
            <Interruptor activo={!!form.delivery} onChange={() => set("delivery", !form.delivery)} titulo="Hago envíos" desc="Se muestra en tu ficha." />
          </div>
        </Seccion>

        <Seccion icono={MapPin} titulo="Dónde estás" subtitulo="Para que los vecinos te encuentren en el mapa.">
          <Campo id="nb-prov" etiqueta="Localidad"><ZonePicker id="nb-prov" value={form.zone} onChange={(z) => set("zone", z)} /></Campo>
          {form.zone && <p className="text-sm mb-4" style={{ color: "#4A5372", marginTop: -8 }}>Elegida: <b style={{ color: "#0B1437" }}>{form.zone}</b></p>}
          <Campo id="nb-dir" etiqueta="Dirección" ayuda="Calle y número. Es pública: si atendés a domicilio, dejala vacía.">
            <input id="nb-dir" value={form.loc} onChange={onTexto("loc")} maxLength={150} autoComplete="street-address" style={caja} />
          </Campo>
          {abrirMapa && (
            <button type="button" style={{ ...botonSecundario, width: "100%", color: "#1B3FB8", borderColor: "#2350F5" }}
              onClick={() => abrirMapa({
                direccion: form.loc || "", zona: form.zone,
                // si cambió el texto, el pin arranca en la dirección escrita (no en las coordenadas viejas)
                ...((form.loc === initial.loc || ubicElegida.current?.loc === form.loc) && form.lat != null ? { lat: form.lat, lng: form.lng } : { lat: null, lng: null }),
                alConfirmar: (r) => {
                  const loc = r.direccion || "Ubicación marcada en el mapa";
                  ubicElegida.current = { loc };
                  setForm((f) => ({ ...f, loc, lat: r.lat, lng: r.lng }));
                },
              })}>
              <MapPin size={18} aria-hidden="true" /> {form.lat != null ? "Cambiar ubicación en el mapa" : "Marcar en el mapa"}
            </button>
          )}
        </Seccion>

        <Seccion icono={Clock} titulo="Horarios" subtitulo="Elegí los días y las horas en que atendés.">
          <EditorHorarios value={form.weekHours} onChange={(v) => set("weekHours", v)} />
        </Seccion>

        <Seccion icono={MessageCircle} titulo="Cómo te contactan" subtitulo="Tu número es necesario. Las redes son opcionales.">
          <Campo id="nb-tel" etiqueta="WhatsApp o teléfono (necesario)" ayuda="Con código de país, sin el +. Ej: 5493815551234.">
            <EntradaIcono id="nb-tel" icono={Phone} value={form.phone} onChange={onTexto("phone")} inputMode="tel" autoComplete="tel" maxLength={30} aria-invalid={error?.campo === "nb-tel"} />
          </Campo>
          <Campo id="nb-ig" etiqueta="Instagram"><EntradaIcono id="nb-ig" icono={Instagram} value={form.ig || ""} onChange={onTexto("ig")} maxLength={120} placeholder="usuario, sin @" autoCapitalize="none" /></Campo>
          <Campo id="nb-tt" etiqueta="TikTok"><EntradaIcono id="nb-tt" icono={Music2} value={form.tiktok || ""} onChange={onTexto("tiktok")} maxLength={120} placeholder="usuario, sin @" autoCapitalize="none" /></Campo>
          <Campo id="nb-fb" etiqueta="Facebook"><EntradaIcono id="nb-fb" icono={Facebook} value={form.facebook || ""} onChange={onTexto("facebook")} maxLength={300} placeholder="usuario o enlace de tu página" autoCapitalize="none" /></Campo>
        </Seccion>

        <Seccion icono={ImageIcon} titulo="Fotos" subtitulo="Una foto de fondo es necesaria. Las de productos suman consultas.">
          <div id="nb-portada" tabIndex={-1} style={{ outline: "none" }}>
            <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Foto de fondo de tu perfil (necesaria)</p>
            <button type="button" onClick={() => refPortada.current?.click()} disabled={subiendoPortada} aria-label={form.portada ? "Cambiar foto de fondo" : "Subir foto de fondo"}
              style={{ width: "100%", height: 132, borderRadius: 16, overflow: "hidden", padding: 0, background: "#F3F5FA", border: form.portada ? "1px solid #E3E7F1" : `2px dashed ${error?.campo === "nb-portada" ? "#C1443A" : "#AEB9D6"}`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4, color: "#4A5372", fontWeight: 700, fontSize: "0.9375rem" }}>
              {form.portada ? <img src={form.portada} alt="Foto de fondo elegida" width={640} height={264} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : subiendoPortada ? "Subiendo…" : <><Camera size={26} aria-hidden="true" />Elegir foto de fondo</>}
            </button>
            <input ref={refPortada} type="file" accept="image/*" hidden onChange={(e) => { subirPortada(e.target.files); e.target.value = ""; }} />
            {form.portada && !subiendoPortada && (
              <div className="flex gap-4" style={{ marginTop: 4 }}>
                <button type="button" onClick={() => refPortada.current?.click()} style={{ color: "#2350F5", fontWeight: 700, fontSize: "0.9375rem", minHeight: 44 }}>Cambiar</button>
              </div>
            )}
          </div>
          <div id="nb-fotos" tabIndex={-1} style={{ outline: "none", borderTop: "1px solid #EEF1F8", marginTop: 14, paddingTop: 14 }}>
            <p className="text-sm font-bold mb-2" style={{ color: "#0B1437" }}>Fotos de productos <span style={{ fontWeight: 600, color: "#6B7494" }}>Opcional</span></p>
            <GaleriaFotos fotos={form.photos} max={Math.max(12, form.photos.length)} subiendo={subiendo === "fotos"} onArchivos={(a) => subir(a, "fotos", ayudaSubir)} onQuitar={(u) => set("photos", form.photos.filter((p) => p !== u))} ayuda="Fotos de lo que vendés o hacés." />
          </div>
        </Seccion>
      </Pagina>

      {sinMapa && (
        <DialogoAdvertencia titulo="No encontramos esa dirección" queHace="No pudimos ubicar la dirección en el mapa."
          queSucedera="Si seguís, tu negocio se verá en la lista pero no en el mapa. Para que aparezca, volvé y escribí calle y número, o marcala en el mapa."
          textoAceptar="Seguir igual" textoCancelar="Volver y corregir"
          onAceptar={() => { const c = sinMapa; setSinMapa(null); terminar(c); }} onCancelar={() => { setSinMapa(null); fallo("nb-dir", "Revisá la dirección: calle y número."); }} />
      )}
    </div>
  );
}
