import { useEffect, useRef, useState } from "react";
import { User, UserX, Lock, Store, Check, Loader2, Wrench } from "lucide-react";
import { perfilesApi } from "./api.js";
import { uploadImage, comprimirImagen } from "./subirFoto.js";
import { textoLocalidad } from "./localidades.js";
import SelectorLocalidad from "./selectorLocalidad.jsx";
import DetalleFicha, { SeccionDetalle } from "./componentes/DetalleFicha.jsx";
import TarjetaFicha from "./componentes/TarjetaFicha.jsx";
import { EstadoCarga, EstadoVacio, EstadoError } from "./componentes/Estados.jsx";
import { iconoCategoria } from "./alquileres.jsx";

// Perfil público de una persona: nombre, foto, localidad, descripción y, solo si el dueño lo eligió, "Dueño de".
export function PerfilPublicoScreen({ usuario, onBack, onAbrirNegocio, onAbrirOficio, onAbrirAlquiler }) {
  const [perfil, setPerfil] = useState(null);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | noExiste | error
  const cargar = () => {
    setEstado("cargando");
    perfilesApi.ver(usuario).then((p) => { setPerfil(p); setEstado("ok"); }).catch((e) => setEstado(e.status === 404 ? "noExiste" : "error"));
  };
  useEffect(() => { cargar(); }, [usuario]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = estado === "ok" && !perfil.privado;
  const lugar = visible ? textoLocalidad(perfil.localidad) : "";
  return (
    <DetalleFicha
      titulo={visible ? perfil.nombre : `@${usuario}`}
      subtitulo={visible ? `@${perfil.usuario}${lugar ? ` · ${lugar}` : ""}` : undefined}
      imagen={visible ? perfil.foto : undefined} icono={User} contexto="Perfil" onVolver={onBack}
    >
      {estado === "cargando" && <EstadoCarga texto="Cargando perfil..." />}
      {estado === "noExiste" && <EstadoVacio icono={UserX} titulo="No encontramos este perfil" mensaje="Puede que la persona haya cambiado su usuario o ya no esté en Mi Zona." />}
      {estado === "error" && <EstadoError onReintentar={cargar} />}
      {estado === "ok" && perfil.privado && <EstadoVacio icono={Lock} tono="violeta" titulo="Este perfil es privado" mensaje="Su dueño eligió no mostrar sus datos." />}
      {visible && (
        <>
          {perfil.descripcion && <SeccionDetalle titulo="Sobre mí">{perfil.descripcion}</SeccionDetalle>}
          {perfil.duenoDe.length > 0 && (
            <SeccionDetalle titulo="Dueño de" icono={Store}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {perfil.duenoDe.map((n) => (
                  <TarjetaFicha key={`${n.tipo || "negocio"}${n.id}`} titulo={n.nombre} zona={n.zona} datoClave={n.tipo === "oficio" ? "Oficios y servicios" : n.tipo === "alquiler" ? "Alquileres" : undefined} icono={n.tipo === "oficio" ? Wrench : n.tipo === "alquiler" ? iconoCategoria(n.categoria) : undefined} tono={n.tipo === "oficio" ? "naranja" : n.tipo === "alquiler" ? "violeta" : undefined} imagen={n.logo} onAbrir={() => (n.tipo === "oficio" ? onAbrirOficio && onAbrirOficio(n.id) : n.tipo === "alquiler" ? onAbrirAlquiler && onAbrirAlquiler(n.id) : onAbrirNegocio && onAbrirNegocio(n.id))} />
                ))}
              </div>
            </SeccionDetalle>
          )}
          {!perfil.descripcion && perfil.duenoDe.length === 0 && <p style={{ fontSize: ".9375rem", color: "#4A5372" }}>Todavía no agregó más información.</p>}
        </>
      )}
    </DetalleFicha>
  );
}

// Editor del perfil propio (Mi cuenta): foto opcional, nombre, descripción opcional y localidad. Se guarda todo junto.
export function EditorPerfil({ usuario, onGuardado, onVerPerfil }) {
  const [nombre, setNombre] = useState(usuario.nombre || "");
  const [descripcion, setDescripcion] = useState(usuario.descripcion || "");
  const [foto, setFoto] = useState(usuario.foto || "");
  const [loc, setLoc] = useState(usuario.localidad || null);
  const [subiendo, setSubiendo] = useState(false);
  const [estado, setEstado] = useState(null); // null | "guardando" | "ok" | { error }
  const archivo = useRef(null);

  const cambios = {};
  if (nombre.trim() !== (usuario.nombre || "")) cambios.nombre = nombre.trim();
  if (descripcion.trim() !== (usuario.descripcion || "")) cambios.descripcion = descripcion.trim();
  if (foto !== (usuario.foto || "")) cambios.foto = foto;
  if (loc && loc.localidadId !== (usuario.localidad?.localidadId || "")) cambios.localidad = loc;
  const puede = Object.keys(cambios).length > 0 && nombre.trim().length >= 2 && !!loc && !subiendo && estado !== "guardando";
  const inicial = (usuario.usuario || nombre || "?").trim().charAt(0).toUpperCase();

  const elegirFoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\//.test(f.type) || f.size > 15 * 1024 * 1024) { setEstado({ error: "Elegí una imagen de hasta 15 MB." }); return; }
    setSubiendo(true); setEstado(null);
    try { setFoto(await uploadImage(await comprimirImagen(f))); }
    catch { setEstado({ error: "No pudimos subir la foto. Probá de nuevo en un rato." }); }
    setSubiendo(false);
  };
  const guardar = async () => {
    setEstado("guardando");
    try {
      const p = await perfilesApi.guardarMio(cambios);
      onGuardado({ ...usuario, nombre: p.nombre, descripcion: p.descripcion, foto: p.foto, localidad: p.localidad });
      setEstado("ok");
      setTimeout(() => setEstado(null), 2500);
    } catch (e) { setEstado({ error: e.message }); }
  };
  const caja = { borderRadius: 12, borderColor: "#E3E7F1" };
  const boton = { minHeight: 44, borderRadius: 12, padding: "0 16px", fontSize: ".875rem", fontWeight: 700 };

  return (
    <div className="mb-1">
      <p className="text-xs mb-3" style={{ color: "#4A5372", lineHeight: 1.5 }}>Así te ven otras personas. Tu correo y tu teléfono nunca se muestran.</p>
      <div className="flex items-center gap-3 mb-4">
        {foto ? (
          <img src={foto} alt="Tu foto de perfil" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <span className="flex items-center justify-center shrink-0 text-2xl font-bold" style={{ width: 72, height: 72, borderRadius: "50%", background: "#0B1437", color: "#fff", fontFamily: "var(--fuente-titulo)" }}>{inicial}</span>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => archivo.current?.click()} disabled={subiendo} style={{ ...boton, border: "1px solid #CFD6E8", background: "#fff", color: "#0B1437" }}>
            {subiendo ? "Subiendo..." : foto ? "Cambiar foto" : "Subir foto (opcional)"}
          </button>
          {foto && !subiendo && <button type="button" onClick={() => setFoto("")} style={{ ...boton, border: 0, background: "transparent", color: "#9A3B34" }}>Quitar</button>}
        </div>
        <input ref={archivo} type="file" accept="image/*" hidden onChange={elegirFoto} />
      </div>

      <label htmlFor="perfil-nombre" className="text-xs font-medium block mb-1" style={{ color: "#2B3768" }}>Tu nombre</label>
      <input id="perfil-nombre" value={nombre} maxLength={60} onChange={(e) => { setNombre(e.target.value); setEstado(null); }} autoComplete="name" className="w-full border px-3 py-2.5 text-sm mb-3" style={caja} />

      <label htmlFor="perfil-desc" className="text-xs font-medium block mb-1" style={{ color: "#2B3768" }}>Sobre vos (opcional)</label>
      <textarea id="perfil-desc" value={descripcion} maxLength={200} rows={3} onChange={(e) => { setDescripcion(e.target.value); setEstado(null); }} placeholder="Contá en pocas palabras quién sos" className="w-full border px-3 py-2.5 text-sm" style={{ ...caja, resize: "none" }} />
      <p className="text-xs mt-1 mb-3 text-right" style={{ color: "#4A5372" }}>{descripcion.length}/200</p>

      <p className="text-xs font-medium mb-2" style={{ color: "#2B3768" }}>Tu localidad</p>
      <SelectorLocalidad valor={usuario.localidad} onChange={(l) => { setLoc(l); setEstado(null); }} />

      {estado?.error && <p role="alert" className="text-xs mt-3" style={{ color: "#C93030" }}>{estado.error}</p>}
      <button type="button" onClick={guardar} disabled={!puede} className="w-full text-sm font-semibold py-2.5 mt-4 flex items-center justify-center gap-1.5"
        style={{ backgroundColor: "var(--azul)", color: "#fff", borderRadius: 12, minHeight: 46, opacity: puede ? 1 : 0.45 }}>
        {estado === "guardando" && <Loader2 size={14} className="animate-spin" />}{estado === "guardando" ? "Guardando..." : "Guardar perfil"}
      </button>
      {estado === "ok" && <p className="text-xs mt-2 flex items-center gap-1.5 font-medium" style={{ color: "#1E6B44" }}><Check size={14} /> Listo: perfil actualizado.</p>}
      {onVerPerfil && usuario.usuario && (
        <button type="button" onClick={() => onVerPerfil(usuario.usuario)} className="w-full text-sm font-semibold py-2.5 mt-2" style={{ minHeight: 44, color: "var(--azul)" }}>Ver cómo se ve mi perfil</button>
      )}
    </div>
  );
}
