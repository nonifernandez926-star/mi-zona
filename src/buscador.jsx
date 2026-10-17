import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Clock, MapPin, ChevronDown, Store, Wrench, Home, Check, Trash2 } from "lucide-react";
import { buscarApi } from "./api.js";
import { textoLocalidad } from "./localidades.js";
import { RUBROS, ETIQUETA_RUBRO } from "./rubros.js";
import { CATEGORIAS, ETIQUETA_CATEGORIA, ETIQUETA_TIPO } from "./alquileres.js";
import { Pagina, Hoja, Chip, HojaZona, leerZona, guardarZona, SIGUIENTE, botonSecundario } from "./oficios.jsx";
import { iconoCategoria, TONO_CATEGORIA } from "./alquileres.jsx";
import TarjetaFicha from "./componentes/TarjetaFicha.jsx";
import { EstadoCarga, EstadoVacio, EstadoError } from "./componentes/Estados.jsx";
import { compartirFicha, avisoDeCompartir } from "./compartir.js";
import { alternarFavFicha, useFavFichas } from "./favoritos.js";

// Buscador único de Mi Zona (Fase 6): una sola búsqueda, resultados CLASIFICADOS por tipo (negocios, oficios y alquileres), con filtros
// manuales (tipo, categoría y zona), sugerencias al escribir, búsquedas recientes y "ampliar la búsqueda" cuando no hay resultados.
// Primero filtros y coincidencias directas: no usa IA (eso es la Fase 10). Los negocios se buscan en la lista que la app ya cargó.

const CLAVE_HISTORIAL = "miZonaHistorialBusqueda"; // la misma que usa la barra de Inicio, así comparten recientes
const CLAVE_CACHE = "miZonaBuscadorCache";
const leerJSON = (clave, d) => { try { return JSON.parse(localStorage.getItem(clave) || "") ?? d; } catch { return d; } };
const guardarHistorial = (q) => {
  const t = q.trim(); if (t.length < 2) return;
  try { localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify([t, ...leerJSON(CLAVE_HISTORIAL, []).filter((s) => String(s).toLowerCase() !== t.toLowerCase())].slice(0, 8))); } catch { /* sin almacenamiento */ }
};
const guardarCache = (clave, valor) => { try { const c = leerJSON(CLAVE_CACHE, {}); const claves = Object.keys(c); if (claves.length >= 6 && !c[clave]) delete c[claves[0]]; c[clave] = valor; localStorage.setItem(CLAVE_CACHE, JSON.stringify(c)); } catch { /* sin almacenamiento */ } };

const norm = (t) => String(t || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
// mismas reglas que el servidor: palabras de 2+ letras (hasta 5) y "sillas" encuentra "silla"
const palabras = (q) => norm(q).slice(0, 60).split(" ").filter((w) => w.length >= 2).slice(0, 5).map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w));

const POPULARES = ["Electricista", "Plomero", "Alquiler de sillas", "Casa en alquiler", "Panadería", "Farmacia"];
const TIPOS = [["todo", "Todo"], ["negocios", "Negocios"], ["oficios", "Oficios"], ["alquileres", "Alquileres"]];

const rubrosTexto = (o) => { const n = [...(o.rubros || []).map((r) => r.label), ...(o.otros || [])]; return n.length > 2 ? `${n.slice(0, 2).join(", ")} +${n.length - 2}` : n.join(", "); };
const tiposTexto = (a) => { const n = (a.tipos || []).map((t) => t.label); return n.length > 2 ? `${n.slice(0, 2).join(", ")} +${n.length - 2}` : n.join(", "); };

export default function BuscadorScreen({ usuario, inicial = "", negocios = [], categoriasNegocio = [], onVolver, onAbrirNegocio, onAbrirOficio, onAbrirAlquiler, onPublicarNecesidad }) {
  const [q, setQ] = useState(inicial);
  const [qFinal, setQFinal] = useState(inicial.trim());
  const [tipo, setTipo] = useState("todo");
  const [categoria, setCategoria] = useState(""); // depende del tipo: categoría de negocio, rubro de oficio o categoría de alquiler
  const [zona, setZona] = useState(() => leerZona() || (usuario?.localidad ? { alcance: "departamento", loc: usuario.localidad } : { alcance: "todo", loc: null }));
  const [hoja, setHoja] = useState(null); // "zona" | "categoria"
  const [estado, setEstado] = useState("inicial"); // inicial | cargando | ok | error
  const [datos, setDatos] = useState({ oficios: [], alquileres: [], totalOficios: 0, totalAlquileres: 0 });
  const [sinConexion, setSinConexion] = useState(false);
  const [avisoCompartir, setAvisoCompartir] = useState("");
  const [recientes, setRecientes] = useState(() => leerJSON(CLAVE_HISTORIAL, []));
  const pedido = useRef(0);
  const favs = useFavFichas();

  useEffect(() => { const t = setTimeout(() => setQFinal(q.trim()), 400); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setCategoria(""); }, [tipo]); // cada tipo tiene sus propias categorías

  const filtrosServidor = useMemo(() => {
    const f = { q: qFinal, tipo: tipo === "negocios" ? "todo" : tipo };
    if (tipo === "oficios" && categoria) f.rubro = categoria;
    if (tipo === "alquileres" && categoria) f.categoria = categoria;
    const l = zona.loc;
    if (l && zona.alcance === "localidad") f.localidadId = l.localidadId;
    if (l && zona.alcance === "departamento") f.departamentoId = l.departamentoId;
    if (l && zona.alcance === "provincia") f.provinciaId = l.provinciaId;
    return f;
  }, [qFinal, tipo, categoria, zona]);

  const palabrasQ = useMemo(() => palabras(qFinal), [qFinal]);
  const buscar = useCallback(() => {
    if (!palabrasQ.length) { setEstado("inicial"); return; }
    if (tipo === "negocios") { setEstado("ok"); setSinConexion(false); return; } // los negocios ya están cargados: no hace falta pedir nada
    const mio = ++pedido.current;
    const clave = JSON.stringify(filtrosServidor);
    setEstado("cargando"); setSinConexion(false);
    buscarApi.buscar(filtrosServidor)
      .then((r) => { if (mio !== pedido.current) return; setDatos(r); setEstado("ok"); guardarCache(clave, r); })
      .catch(() => {
        if (mio !== pedido.current) return;
        const guardado = leerJSON(CLAVE_CACHE, {})[clave];
        if (guardado) { setDatos(guardado); setSinConexion(true); setEstado("ok"); } else setEstado("error");
      });
  }, [filtrosServidor, palabrasQ, tipo]);
  useEffect(() => { buscar(); }, [buscar]);

  const negociosCoinciden = useMemo(() => {
    if (!palabrasQ.length || tipo === "oficios" || tipo === "alquileres") return [];
    return negocios.filter((b) => {
      if (tipo === "negocios" && categoria && b.cat !== categoria) return false;
      const etiquetaCat = categoriasNegocio.find((c) => c.id === b.cat)?.label || "";
      const texto = norm([b.name, b.desc, etiquetaCat, ...(b.services || []), ...(b.specialties || [])].join(" "));
      return palabrasQ.every((w) => texto.includes(w));
    });
  }, [negocios, palabrasQ, tipo, categoria, categoriasNegocio]);

  const oficios = tipo === "negocios" || tipo === "alquileres" ? [] : datos.oficios;
  const alquileres = tipo === "negocios" || tipo === "oficios" ? [] : datos.alquileres;
  const total = negociosCoinciden.length + (oficios.length ? datos.totalOficios : 0) + (alquileres.length ? datos.totalAlquileres : 0);
  const hayResultados = negociosCoinciden.length + oficios.length + alquileres.length > 0;

  const cambiarZona = (z) => { setZona(z); guardarZona(z); };
  const lanzar = (texto) => { setQ(texto); setQFinal(texto.trim()); };
  const abrir = (fn) => (...a) => { guardarHistorial(q); setRecientes(leerJSON(CLAVE_HISTORIAL, [])); fn(...a); };

  // Sugerencias al escribir: rubros, categorías y tipos que empiezan o contienen lo escrito, más las búsquedas recientes que coinciden
  const sugerencias = useMemo(() => {
    const t = norm(q);
    if (t.length < 1) return [];
    const fuentes = [
      ...recientes,
      ...RUBROS.map((r) => r.label),
      ...Object.values(ETIQUETA_TIPO), ...CATEGORIAS.map((c) => c.label),
      ...categoriasNegocio.map((c) => c.label),
    ];
    const vistos = new Set();
    return fuentes.filter((s) => { const n = norm(s); if (!n.includes(t) || n === t || vistos.has(n)) return false; vistos.add(n); return true; })
      .sort((a, b) => (norm(a).startsWith(t) ? 0 : 1) - (norm(b).startsWith(t) ? 0 : 1)).slice(0, 6);
  }, [q, recientes, categoriasNegocio]);

  const opcionesCategoria = tipo === "negocios" ? categoriasNegocio.map((c) => [c.id, c.label])
    : tipo === "oficios" ? RUBROS.map((r) => [r.id, r.label])
    : tipo === "alquileres" ? CATEGORIAS.map((c) => [c.id, c.label]) : [];
  const etiquetaCategoria = categoria ? (tipo === "negocios" ? categoriasNegocio.find((c) => c.id === categoria)?.label : tipo === "oficios" ? ETIQUETA_RUBRO[categoria] : ETIQUETA_CATEGORIA[categoria]) : "";
  const textoZona = zona.alcance === "todo" || !zona.loc ? "Todo el país" : zona.alcance === "localidad" ? zona.loc.localidad : zona.alcance === "departamento" ? `Departamento ${zona.loc.departamento}` : zona.loc.provincia;
  const siguiente = SIGUIENTE[zona.alcance];

  const tarjetaOficio = (o) => (
    <TarjetaFicha key={`o${o.id}`} titulo={o.nombre} zona={textoLocalidad(o.localidad)} datoClave={rubrosTexto(o)} estado={o.disponibilidad || undefined}
      imagen={o.logo || o.fotos?.[0]} icono={Wrench} tono="naranja" onAbrir={abrir(() => onAbrirOficio(o.id, ""))}
      esFavorito={favs.some((x) => x.tipo === "oficio" && x.id === o.id)} onFavorito={() => alternarFavFicha("oficio", o.id)}
      onCompartir={async () => setAvisoCompartir(avisoDeCompartir(await compartirFicha({ tipo: "oficio", nombre: o.nombre, zona: textoLocalidad(o.localidad), detalle: o.desc, imagen: o.logo || o.fotos?.[0] })) || "")} />
  );
  const tarjetaAlquiler = (a) => (
    <TarjetaFicha key={`a${a.id}`} titulo={a.nombre} zona={textoLocalidad(a.localidad)} datoClave={tiposTexto(a)} estado={a.disponibilidad || undefined}
      imagen={a.logo || a.fotos?.[0]} icono={iconoCategoria(a.categoria)} tono={TONO_CATEGORIA[a.categoria]} onAbrir={abrir(() => onAbrirAlquiler(a.id))}
      esFavorito={favs.some((x) => x.tipo === "alquiler" && x.id === a.id)} onFavorito={() => alternarFavFicha("alquiler", a.id)}
      onCompartir={async () => setAvisoCompartir(avisoDeCompartir(await compartirFicha({ tipo: "alquiler", nombre: a.nombre, zona: textoLocalidad(a.localidad), detalle: a.desc, imagen: a.logo || a.fotos?.[0] })) || "")} />
  );
  const tarjetaNegocio = (b) => (
    <TarjetaFicha key={`n${b.id}`} titulo={b.name} zona={b.zone} datoClave={categoriasNegocio.find((c) => c.id === b.cat)?.label} imagen={b.logo || b.photos?.[0]}
      icono={Store} tono="azul" onAbrir={abrir(() => onAbrirNegocio(b.id))} />
  );

  // En "Todo" cada tipo muestra pocos y un botón para ver solo ese tipo; en un tipo suelto se ve todo lo que trajo el servidor
  const Seccion = ({ id, titulo, icono: I, totalReal, lista, render, vermas }) => {
    if (!lista.length) return null;
    const limite = tipo === "todo" ? 3 : lista.length;
    return (
      <section aria-label={titulo} className="mt-5">
        <h2 className="flex items-center gap-2 mb-2" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.0625rem", color: "#0B1437" }}>
          <I size={18} aria-hidden="true" /> {titulo} <span style={{ fontWeight: 600, color: "#4A5372", fontSize: "0.9375rem" }}>({totalReal})</span>
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{lista.slice(0, limite).map(render)}</div>
        {tipo === "todo" && totalReal > limite && <button type="button" onClick={() => setTipo(id)} className="w-full mt-2" style={{ ...botonSecundario, minHeight: 48 }}>{vermas}</button>}
        {tipo !== "todo" && totalReal > lista.length && <p className="text-sm mt-2" style={{ color: "#4A5372", lineHeight: 1.45 }}>Mostramos {lista.length} de {totalReal}. Afiná la búsqueda con la zona o la categoría para ver otros.</p>}
      </section>
    );
  };

  const escribiendo = palabrasQ.length === 0;
  return (
    <Pagina titulo="Buscar en Mi Zona" onVolver={onVolver}>
      <div className="flex items-center gap-2.5 bg-white px-4" style={{ border: "1px solid #CFD6E8", borderRadius: 16, minHeight: 54 }}>
        <Search size={18} color="#2350F5" aria-hidden="true" />
        <input type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" aria-label="Qué buscás"
          onKeyDown={(e) => { if (e.key === "Enter") { setQFinal(q.trim()); guardarHistorial(q); setRecientes(leerJSON(CLAVE_HISTORIAL, [])); e.target.blur(); } }}
          placeholder="Negocio, oficio o alquiler..." className="w-full outline-none bg-transparent" style={{ fontSize: "1rem", color: "#0B1437", minHeight: 50 }} />
        {q && <button type="button" onClick={() => lanzar("")} aria-label="Borrar búsqueda" style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={18} color="#4A5372" /></button>}
      </div>

      {sugerencias.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto" role="list" aria-label="Sugerencias" style={{ paddingBottom: 2 }}>
          {sugerencias.map((s) => <span role="listitem" key={s} style={{ flexShrink: 0 }}><Chip onClick={() => { lanzar(s); guardarHistorial(s); setRecientes(leerJSON(CLAVE_HISTORIAL, [])); }}>{s}</Chip></span>)}
        </div>
      )}

      {escribiendo ? (
        <div className="mt-5">
          {recientes.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.0625rem", color: "#0B1437" }}>Búsquedas recientes</h2>
                <button type="button" onClick={() => { try { localStorage.removeItem(CLAVE_HISTORIAL); } catch { /* nada */ } setRecientes([]); }} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "#4A5372", minHeight: 44 }}><Trash2 size={15} aria-hidden="true" /> Borrar</button>
              </div>
              <div className="flex flex-wrap gap-2 mb-5">{recientes.map((r) => <Chip key={r} onClick={() => lanzar(r)}><Clock size={14} aria-hidden="true" /> {r}</Chip>)}</div>
            </>
          )}
          <h2 className="mb-2" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.0625rem", color: "#0B1437" }}>Probá buscar</h2>
          <div className="flex flex-wrap gap-2">{POPULARES.map((p) => <Chip key={p} onClick={() => lanzar(p)}>{p}</Chip>)}</div>
          <p className="text-sm mt-5" style={{ color: "#4A5372", lineHeight: 1.5 }}>Escribí lo que necesitás, por ejemplo «electricista», «sillas para cumpleaños» o «panadería». Te mostramos negocios, oficios y alquileres por separado.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mt-4 overflow-x-auto" role="group" aria-label="Qué mostrar" style={{ paddingBottom: 2 }}>
            {TIPOS.map(([id, texto]) => <span key={id} style={{ flexShrink: 0 }}><Chip activo={tipo === id} onClick={() => setTipo(id)}>{texto}</Chip></span>)}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {tipo !== "negocios" && <Chip onClick={() => setHoja("zona")} activo={zona.alcance !== "todo"}><MapPin size={15} aria-hidden="true" /> {textoZona} <ChevronDown size={14} aria-hidden="true" /></Chip>}
            {tipo !== "todo" && <Chip onClick={() => setHoja("categoria")} activo={!!categoria}>{etiquetaCategoria || "Categoría"} <ChevronDown size={14} aria-hidden="true" /></Chip>}
          </div>
          {(tipo === "todo" || tipo === "negocios") && <p className="text-xs mt-2" style={{ color: "#6B7390", lineHeight: 1.4 }}>Los negocios son los de la zona que elegiste en Inicio.</p>}

          {sinConexion && <p role="status" className="text-sm mt-3 p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 }}>Sin conexión: te mostramos lo último que buscaste. Puede estar desactualizado.</p>}
          {avisoCompartir && <p role="status" className="text-sm mt-3 p-3" style={{ borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 }}>{avisoCompartir}</p>}

          {estado === "cargando" && <div className="mt-4"><EstadoCarga texto="Buscando..." filas={3} /></div>}
          {estado === "error" && <div className="mt-4"><EstadoError onReintentar={buscar} /></div>}
          {estado === "ok" && !hayResultados && (
            <div className="mt-4">
              {tipo !== "negocios" && siguiente
                ? <EstadoVacio icono={Search} titulo="No encontramos resultados" mensaje={`No hay nada para «${qFinal}» en ${textoZona.toLowerCase()}. Probá ampliando la zona de búsqueda.`} accion={{ texto: "Ampliar la búsqueda", onClick: () => cambiarZona({ ...zona, alcance: siguiente }) }} />
                : <EstadoVacio icono={Search} titulo="No encontramos resultados" mensaje="Probá con otra palabra, más corta o más general. Por ejemplo, «plomero» en vez de «arreglo de cañerías»." />}
              {onPublicarNecesidad && <button type="button" onClick={() => onPublicarNecesidad(qFinal)} className="w-full mt-3" style={{ ...botonSecundario, minHeight: 52 }}>Publicar lo que necesitás en Comunidad (gratis)</button>}
            </div>
          )}
          {estado === "ok" && hayResultados && (
            <>
              <p className="text-sm mt-4" style={{ color: "#4A5372" }} role="status">{total} {total === 1 ? "resultado" : "resultados"} para «{qFinal}» · mantené apretada una ficha para compartirla</p>
              <Seccion id="negocios" titulo="Negocios" icono={Store} totalReal={negociosCoinciden.length} lista={negociosCoinciden} render={tarjetaNegocio} vermas={`Ver los ${negociosCoinciden.length} negocios`} />
              <Seccion id="oficios" titulo="Oficios y servicios" icono={Wrench} totalReal={datos.totalOficios} lista={oficios} render={tarjetaOficio} vermas={`Ver los ${datos.totalOficios} oficios`} />
              <Seccion id="alquileres" titulo="Alquileres" icono={Home} totalReal={datos.totalAlquileres} lista={alquileres} render={tarjetaAlquiler} vermas={`Ver los ${datos.totalAlquileres} alquileres`} />
            </>
          )}
        </>
      )}

      {hoja === "zona" && <HojaZona zona={zona} usuario={usuario} onCambiar={(z) => { cambiarZona(z); setHoja(null); }} onCerrar={() => setHoja(null)} />}
      {hoja === "categoria" && (
        <Hoja titulo="Categoría" onCerrar={() => setHoja(null)}>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => { setCategoria(""); setHoja(null); }} style={{ ...botonSecundario, justifyContent: "flex-start", minHeight: 50, borderColor: !categoria ? "#2350F5" : "#CFD6E8", background: !categoria ? "#EDF1FF" : "#fff" }}>{!categoria && <Check size={16} aria-hidden="true" />}Todas</button>
            {opcionesCategoria.map(([id, texto]) => (
              <button key={id} type="button" onClick={() => { setCategoria(id); setHoja(null); }} style={{ ...botonSecundario, justifyContent: "flex-start", minHeight: 50, borderColor: categoria === id ? "#2350F5" : "#CFD6E8", background: categoria === id ? "#EDF1FF" : "#fff" }}>{categoria === id && <Check size={16} aria-hidden="true" />}{texto}</button>
            ))}
          </div>
        </Hoja>
      )}
    </Pagina>
  );
}
