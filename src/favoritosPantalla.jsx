import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, Store, Wrench, MapPin, ChevronDown, Check, CalendarDays } from "lucide-react";
import { favoritosApi } from "./api.js";
import { textoLocalidad } from "./localidades.js";
import { Pagina, Hoja, Chip, botonSecundario } from "./oficios.jsx";
import { iconoCategoria, TONO_CATEGORIA } from "./alquileres.jsx";
import TarjetaFicha from "./componentes/TarjetaFicha.jsx";
import { EstadoCarga, EstadoVacio } from "./componentes/Estados.jsx";
import { compartirFicha, avisoDeCompartir } from "./compartir.js";
import { alternarFavFicha, quitarFavFichas, useFavFichas, fechaFavNegocio } from "./favoritos.js";

// Favoritos de la Fase 6: negocios, oficios y alquileres juntos, con filtros por tipo, zona y fecha.
// Una ficha que se pausa, vence, se oculta o se elimina deja de aparecer acá; si se reactiva o renueva, vuelve sola (el servidor decide qué sigue visible).
// Los negocios guardados siguen en la lista de la app; los oficios y alquileres se guardan en este dispositivo y se consultan al servidor.

const CLAVE_CACHE = "miZonaFavoritosCache";
const leerCache = () => { try { return JSON.parse(localStorage.getItem(CLAVE_CACHE) || "null"); } catch { return null; } };
const guardarCache = (v) => { try { localStorage.setItem(CLAVE_CACHE, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

const DIA = 86400000;
const FECHAS = [["todas", "Cualquier fecha", 0], ["semana", "Esta semana", 7 * DIA], ["mes", "Este mes", 30 * DIA]];
const TIPOS = [["todos", "Todo"], ["negocio", "Negocios"], ["oficio", "Oficios"], ["alquiler", "Alquileres"]];

const rubrosTexto = (o) => { const n = [...(o.rubros || []).map((r) => r.label), ...(o.otros || [])]; return n.length > 2 ? `${n.slice(0, 2).join(", ")} +${n.length - 2}` : n.join(", "); };
const tiposTexto = (a) => { const n = (a.tipos || []).map((t) => t.label); return n.length > 2 ? `${n.slice(0, 2).join(", ")} +${n.length - 2}` : n.join(", "); };

export default function FavoritosPantalla({ businesses, favorites, categoriasNegocio = [], onToggleFavorite, onCompartirNegocio, onAbrirNegocio, onAbrirOficio, onAbrirAlquiler, onVolver }) {
  const locales = useFavFichas(); // oficios y alquileres guardados en este dispositivo
  const [servidor, setServidor] = useState(() => leerCache() || { oficios: [], alquileres: [] }); // lo último que dijo el servidor
  const [estado, setEstado] = useState(locales.length ? "cargando" : "ok"); // cargando | ok
  const [sinConexion, setSinConexion] = useState(false);
  const [tipo, setTipo] = useState("todos");
  const [zona, setZona] = useState("");
  const [fecha, setFecha] = useState("todas");
  const [hoja, setHoja] = useState(null); // "zona" | "fecha"
  const [aviso, setAviso] = useState("");

  // Se pregunta al servidor al abrir (y si se guarda algo nuevo desde otra pantalla): qué sigue visible y qué ya no existe
  const claveLocales = locales.map((x) => `${x.tipo}:${x.id}`).sort().join(",");
  const cargar = useCallback(() => {
    if (!locales.length) { setEstado("ok"); setSinConexion(false); return; }
    setEstado("cargando");
    favoritosApi.resolver(locales.map(({ tipo: t, id }) => ({ tipo: t, id })))
      .then((r) => {
        setServidor({ oficios: r.oficios || [], alquileres: r.alquileres || [] }); setSinConexion(false); setEstado("ok");
        guardarCache({ oficios: r.oficios || [], alquileres: r.alquileres || [] });
        if (r.eliminados?.length) quitarFavFichas(r.eliminados); // las eliminadas para siempre se sacan de la lista del dispositivo
      })
      .catch(() => { setSinConexion(true); setEstado("ok"); }); // sin señal: se muestra lo último que se cargó
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveLocales]);
  useEffect(() => { cargar(); }, [cargar]);

  // Todo en una sola lista con la misma forma
  const items = useMemo(() => {
    const fechaDe = (t, id) => locales.find((x) => x.tipo === t && x.id === id)?.en || 0;
    const negocios = businesses
      .filter((b) => favorites.includes(b.id) && b.kind !== "job" && b.status === "active" && b.apareceEnBusquedas !== false)
      .map((b) => ({ key: `n${b.id}`, tipo: "negocio", id: b.id, titulo: b.name, zona: b.zone || "", datoClave: categoriasNegocio.find((c) => c.id === b.cat)?.label || "", imagen: b.logo || b.photos?.[0], icono: Store, tono: "azul", en: fechaFavNegocio(b.id), bruto: b }));
    const oficios = servidor.oficios.filter((o) => locales.some((x) => x.tipo === "oficio" && x.id === o.id))
      .map((o) => ({ key: `o${o.id}`, tipo: "oficio", id: o.id, titulo: o.nombre, zona: o.localidad?.localidad || "", datoClave: rubrosTexto(o), estado: o.disponibilidad || undefined, imagen: o.logo || o.fotos?.[0], icono: Wrench, tono: "naranja", en: fechaDe("oficio", o.id), bruto: o }));
    const alquileres = servidor.alquileres.filter((a) => locales.some((x) => x.tipo === "alquiler" && x.id === a.id))
      .map((a) => ({ key: `a${a.id}`, tipo: "alquiler", id: a.id, titulo: a.nombre, zona: a.localidad?.localidad || "", datoClave: tiposTexto(a), estado: a.disponibilidad || undefined, imagen: a.logo || a.fotos?.[0], icono: iconoCategoria(a.categoria), tono: TONO_CATEGORIA[a.categoria], en: fechaDe("alquiler", a.id), bruto: a }));
    return [...negocios, ...oficios, ...alquileres].sort((x, y) => y.en - x.en);
  }, [businesses, favorites, servidor, locales, categoriasNegocio]);

  const zonas = useMemo(() => [...new Set(items.map((i) => i.zona).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [items]);
  const cuenta = (t) => (t === "todos" ? items.length : items.filter((i) => i.tipo === t).length);
  const visibles = useMemo(() => {
    const limite = FECHAS.find((f) => f[0] === fecha)?.[2] || 0;
    return items.filter((i) => (tipo === "todos" || i.tipo === tipo) && (!zona || i.zona === zona) && (!limite || (i.en && Date.now() - i.en <= limite)));
  }, [items, tipo, zona, fecha]);
  const hayFiltros = tipo !== "todos" || !!zona || fecha !== "todas";
  const limpiar = () => { setTipo("todos"); setZona(""); setFecha("todas"); };
  const textoFecha = FECHAS.find((f) => f[0] === fecha)?.[1];

  const quitar = (i) => (i.tipo === "negocio" ? onToggleFavorite(i.id) : alternarFavFicha(i.tipo, i.id));
  const abrir = (i) => (i.tipo === "negocio" ? onAbrirNegocio(i.id) : i.tipo === "oficio" ? onAbrirOficio(i.id) : onAbrirAlquiler(i.id));
  const compartir = async (i) => {
    if (i.tipo === "negocio") { onCompartirNegocio?.(i.bruto); return; }
    const f = i.bruto;
    setAviso(avisoDeCompartir(await compartirFicha({ tipo: i.tipo, nombre: i.titulo, zona: textoLocalidad(f.localidad), detalle: f.desc, imagen: i.imagen })) || "");
  };

  return (
    <Pagina titulo="Favoritos" onVolver={onVolver}>
      {items.length > 0 && (
        <>
          <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Tipo de favorito" style={{ paddingBottom: 2 }}>
            {TIPOS.map(([id, texto]) => <span key={id} style={{ flexShrink: 0 }}><Chip activo={tipo === id} onClick={() => setTipo(id)}>{texto} ({cuenta(id)})</Chip></span>)}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {zonas.length > 1 && <Chip onClick={() => setHoja("zona")} activo={!!zona}><MapPin size={15} aria-hidden="true" /> {zona || "Zona"} <ChevronDown size={14} aria-hidden="true" /></Chip>}
            <Chip onClick={() => setHoja("fecha")} activo={fecha !== "todas"}><CalendarDays size={15} aria-hidden="true" /> {textoFecha} <ChevronDown size={14} aria-hidden="true" /></Chip>
          </div>
        </>
      )}

      {sinConexion && <p role="status" className="text-sm mt-3 p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 }}>Sin conexión: te mostramos lo último que cargaste. Puede estar desactualizado.</p>}
      {aviso && <p role="status" className="text-sm mt-3 p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 }}>{aviso}</p>}

      <div className="mt-4" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {estado === "cargando" && items.length === 0 && <EstadoCarga texto="Cargando tus favoritos..." filas={3} />}
        {estado === "ok" && items.length === 0 && (
          locales.length > 0 && !sinConexion
            ? <EstadoVacio icono={Heart} tono="rojo" titulo="Tus fichas guardadas no están disponibles ahora" mensaje="Puede que estén pausadas o vencidas. Si sus dueños las reactivan o renuevan, vuelven a aparecer acá solas." />
            : <EstadoVacio icono={Heart} tono="rojo" titulo="Todavía no guardaste nada" mensaje="Tocá el corazón en un negocio, un oficio o un alquiler para guardarlo acá." />
        )}
        {items.length > 0 && visibles.length === 0 && (
          <EstadoVacio icono={Heart} tono="rojo" titulo="No hay favoritos con esos filtros" mensaje="Probá con otro tipo, otra zona u otra fecha." accion={hayFiltros ? { texto: "Quitar los filtros", onClick: limpiar } : undefined} />
        )}
        {visibles.length > 0 && (
          <>
            <p className="text-sm" style={{ color: "#4A5372" }} role="status">{visibles.length} {visibles.length === 1 ? "favorito" : "favoritos"} · mantené apretado uno para compartirlo</p>
            {visibles.map((i) => (
              <TarjetaFicha key={i.key} titulo={i.titulo} zona={i.zona} datoClave={i.datoClave} estado={i.estado} imagen={i.imagen} icono={i.icono} tono={i.tono}
                onAbrir={() => abrir(i)} esFavorito onFavorito={() => quitar(i)} onCompartir={() => compartir(i)} />
            ))}
            <p className="text-xs mt-1" style={{ color: "#6B7390", lineHeight: 1.45 }}>Las fichas pausadas, vencidas o eliminadas no se muestran. Si se renuevan, vuelven a aparecer solas.</p>
          </>
        )}
      </div>

      {hoja === "zona" && (
        <Hoja titulo="Zona" onCerrar={() => setHoja(null)}>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => { setZona(""); setHoja(null); }} style={{ ...botonSecundario, justifyContent: "flex-start", minHeight: 50, borderColor: !zona ? "#2350F5" : "#CFD6E8", background: !zona ? "#EDF1FF" : "#fff" }}>{!zona && <Check size={16} aria-hidden="true" />}Todas las zonas</button>
            {zonas.map((z) => <button key={z} type="button" onClick={() => { setZona(z); setHoja(null); }} style={{ ...botonSecundario, justifyContent: "flex-start", minHeight: 50, borderColor: zona === z ? "#2350F5" : "#CFD6E8", background: zona === z ? "#EDF1FF" : "#fff" }}>{zona === z && <Check size={16} aria-hidden="true" />}{z}</button>)}
          </div>
        </Hoja>
      )}
      {hoja === "fecha" && (
        <Hoja titulo="¿Cuándo los guardaste?" onCerrar={() => setHoja(null)}>
          <div className="flex flex-col gap-2">
            {FECHAS.map(([id, texto]) => <button key={id} type="button" onClick={() => { setFecha(id); setHoja(null); }} style={{ ...botonSecundario, justifyContent: "flex-start", minHeight: 50, borderColor: fecha === id ? "#2350F5" : "#CFD6E8", background: fecha === id ? "#EDF1FF" : "#fff" }}>{fecha === id && <Check size={16} aria-hidden="true" />}{texto}</button>)}
          </div>
          <p className="text-xs mt-3" style={{ color: "#6B7390", lineHeight: 1.45 }}>Los negocios que guardaste antes de esta versión no tienen fecha: solo aparecen en «Cualquier fecha».</p>
        </Hoja>
      )}
    </Pagina>
  );
}
