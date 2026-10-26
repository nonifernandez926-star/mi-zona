import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Clock, MapPin, ChevronDown, Store, Wrench, Home, Check, Trash2, Sparkles } from "lucide-react";
import { buscarApi } from "./api.js";
import { textoLocalidad } from "./localidades.js";
import { RUBROS, ETIQUETA_RUBRO } from "./rubros.js";
import { CATEGORIAS, ETIQUETA_CATEGORIA, ETIQUETA_TIPO } from "./alquileres.js";
import { Pagina, Hoja, Chip, HojaZona, leerZona, guardarZona, SIGUIENTE, botonSecundario } from "./oficios.jsx";
import { iconoCategoria, TONO_CATEGORIA } from "./alquileres.jsx";
import TarjetaFicha from "./componentes/TarjetaFicha.jsx";
import DialogoAdvertencia from "./componentes/DialogoAdvertencia.jsx";
import ReportarRespuestaIA from "./componentes/ReportarRespuestaIA.jsx";
import { EstadoCarga, EstadoVacio, EstadoError } from "./componentes/Estados.jsx";
import { compartirFicha, avisoDeCompartir } from "./compartir.js";
import { alternarFavFicha, useFavFichas } from "./favoritos.js";

// Buscador único de Mi Zona (Fase 6): una sola búsqueda, resultados CLASIFICADOS por tipo (negocios, oficios y alquileres), con filtros
// manuales (tipo, categoría y zona), sugerencias al escribir, búsquedas recientes y "ampliar la búsqueda" cuando no hay resultados.
// Primero filtros y coincidencias directas. La IA (Fase 10) solo entra cuando la búsqueda común no alcanza: una frase en lenguaje natural
// («necesito alguien que me corte el pasto») o una búsqueda sin resultados, y solo si la persona lo aceptó. La IA únicamente interpreta el texto y
// devuelve filtros; los resultados son siempre fichas reales de Mi Zona (los negocios se buscan en la lista que la app ya cargó).

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
const CLAVE_IA = "miZonaBuscadorIA"; // "si" cuando la persona aceptó el aviso para usar la ayuda de IA
const MENSAJE_IA = {
  limite_persona: "Llegaste al límite de búsquedas con IA por hoy. El buscador común sigue funcionando.",
  limite_global: "La ayuda con IA no está disponible por ahora. Te mostramos la búsqueda común.",
  no_configurada: "La ayuda con IA no está disponible por ahora. Te mostramos la búsqueda común.",
  error: "La ayuda con IA no está disponible ahora. Te mostramos la búsqueda común.",
  red: "No pudimos usar la ayuda con IA. Te mostramos la búsqueda común.",
};
// Misma regla que el servidor: 4 palabras o más, una pregunta, o un pedido («necesito…», «busco…», «quién…»)
const pareceNatural = (q) => { const t = norm(q); return t.split(" ").filter(Boolean).length >= 4 || /\?|^(necesito|busco|quiero|quien|quienes|donde|alguien|hay |me hace|me puede|puedo)/.test(t); };
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
  // Ayuda con IA (Fase 10)
  const [iaAceptada, setIaAceptada] = useState(() => leerJSON(CLAVE_IA, "") === "si");
  const [avisoIA, setAvisoIA] = useState(false); // diálogo de advertencia antes de usar la IA por primera vez
  const [ia, setIa] = useState({ estado: "ninguna", datos: null, motivo: "", seguimiento: false }); // ninguna | pendiente | cargando | ok | fallo
  const [respuestaIA, setRespuestaIA] = useState("");
  const [listoPara, setListoPara] = useState(""); // para qué búsqueda ya están al día los resultados comunes (así la IA no decide con resultados viejos)
  const pedidoIA = useRef(0);

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
    const clave = JSON.stringify(filtrosServidor);
    if (tipo === "negocios") { setEstado("ok"); setSinConexion(false); setListoPara(clave); return; } // los negocios ya están cargados: no hace falta pedir nada
    const mio = ++pedido.current;
    setEstado("cargando"); setSinConexion(false);
    buscarApi.buscar(filtrosServidor)
      .then((r) => { if (mio !== pedido.current) return; setDatos(r); setEstado("ok"); setListoPara(clave); guardarCache(clave, r); })
      .catch(() => {
        if (mio !== pedido.current) return;
        const guardado = leerJSON(CLAVE_CACHE, {})[clave];
        if (guardado) { setDatos(guardado); setSinConexion(true); setEstado("ok"); setListoPara(clave); } else setEstado("error");
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
  const hayResultados = negociosCoinciden.length + oficios.length + alquileres.length > 0;

  // ---- Ayuda con IA (Fase 10) ----
  // Solo entra cuando la búsqueda común no alcanzó (frase en lenguaje natural o sin resultados) y la persona aceptó el aviso. Con una categoría
  // elegida a mano no se usa. La IA interpreta el texto y devuelve filtros: los resultados salen del servidor de Mi Zona. Si falla, no pasa nada: la búsqueda común sigue.
  const zonaIds = useMemo(() => { const { localidadId, departamentoId, provinciaId } = filtrosServidor; return { localidadId, departamentoId, provinciaId }; }, [filtrosServidor]);
  const zonaClave = JSON.stringify(zonaIds);
  const zonaNegocios = negocios[0]?.zone || "";
  const candidataIA = estado === "ok" && listoPara === JSON.stringify(filtrosServidor) && !categoria && palabrasQ.length > 0 && norm(qFinal).replace(/ /g, "").length >= 3 && (pareceNatural(qFinal) || !hayResultados);

  const ejecutarIA = (texto, seguimiento = false) => {
    const mio = ++pedidoIA.current;
    setIa({ estado: "cargando", datos: null, motivo: "", seguimiento });
    buscarApi.buscarIA({ q: texto, tipo, ...zonaIds, zonaNegocios })
      .then((r) => { if (mio !== pedidoIA.current) return; setIa(r?.ia ? { estado: "ok", datos: r, motivo: "", seguimiento } : { estado: "fallo", datos: null, motivo: r?.motivo || "error", seguimiento }); })
      .catch(() => { if (mio !== pedidoIA.current) return; setIa({ estado: "fallo", datos: null, motivo: "red", seguimiento }); });
  };
  const ejecutarRef = useRef(ejecutarIA); ejecutarRef.current = ejecutarIA;
  useEffect(() => {
    pedidoIA.current++; // se descarta cualquier respuesta pendiente de la búsqueda anterior
    setRespuestaIA("");
    if (!candidataIA) { setIa({ estado: "ninguna", datos: null, motivo: "", seguimiento: false }); return; }
    if (!iaAceptada) { setIa({ estado: "pendiente", datos: null, motivo: "", seguimiento: false }); return; }
    ejecutarRef.current(qFinal);
  }, [candidataIA, iaAceptada, qFinal, tipo, zonaClave]);

  const iaDatos = ia.estado === "ok" ? ia.datos : null;
  const iaNegocios = iaDatos ? iaDatos.negociosIds.map((id) => negocios.find((b) => b.id === id)).filter(Boolean) : [];
  const iaOficios = iaDatos?.oficios || [], iaAlquileres = iaDatos?.alquileres || [];
  const hayIA = iaNegocios.length + iaOficios.length + iaAlquileres.length > 0;
  const iaPregunta = iaDatos?.pregunta || "";
  // lo que ya salió en el bloque de IA no se repite en los resultados comunes
  const sinRepetir = (lista, ya) => { const ids = new Set(ya.map((x) => x.id)); return lista.filter((x) => !ids.has(x.id)); };
  const negociosC = sinRepetir(negociosCoinciden, iaNegocios), oficiosC = sinRepetir(oficios, iaOficios), alquileresC = sinRepetir(alquileres, iaAlquileres);
  const totalOficiosC = Math.max(oficiosC.length, datos.totalOficios - (oficios.length - oficiosC.length));
  const totalAlquileresC = Math.max(alquileresC.length, datos.totalAlquileres - (alquileres.length - alquileresC.length));
  const hayComun = negociosC.length + oficiosC.length + alquileresC.length > 0;
  const totalC = negociosC.length + (oficiosC.length ? totalOficiosC : 0) + (alquileresC.length ? totalAlquileresC : 0);

  const aceptarIA = () => { try { localStorage.setItem(CLAVE_IA, JSON.stringify("si")); } catch { /* sin almacenamiento */ } setAvisoIA(false); setIaAceptada(true); };
  const dejarIA = () => { try { localStorage.removeItem(CLAVE_IA); } catch { /* nada */ } setIaAceptada(false); };
  const enviarRespuestaIA = () => { const r = respuestaIA.trim(); if (r.length >= 2) ejecutarIA(`${qFinal}. ${r}`, true); };

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
  const Seccion = ({ id, titulo, icono: I, totalReal, lista, render, vermas, plano = false }) => {
    if (!lista.length) return null;
    const limite = tipo === "todo" && !plano ? 3 : lista.length;
    return (
      <section aria-label={titulo} className="mt-5">
        <h2 className="flex items-center gap-2 mb-2" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.0625rem", color: "#0B1437" }}>
          <I size={18} aria-hidden="true" /> {titulo} <span style={{ fontWeight: 600, color: "#4A5372", fontSize: "0.9375rem" }}>({totalReal})</span>
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{lista.slice(0, limite).map(render)}</div>
        {tipo === "todo" && !plano && totalReal > limite && <button type="button" onClick={() => setTipo(id)} className="w-full mt-2" style={{ ...botonSecundario, minHeight: 48 }}>{vermas}</button>}
        {(tipo !== "todo" || plano) && totalReal > lista.length && <p className="text-sm mt-2" style={{ color: "#4A5372", lineHeight: 1.45 }}>Mostramos {lista.length} de {totalReal}. Afiná la búsqueda con la zona o la categoría para ver otros.</p>}
      </section>
    );
  };

  const estiloAviso = { borderRadius: 12, background: "#FFF3D6", color: "#6B4510", lineHeight: 1.45 };
  const bloqueIA = (() => {
    if (estado !== "ok") return null;
    if (ia.estado === "pendiente") return (
      <section aria-label="Ayuda con IA" className="mt-4 p-4" style={{ borderRadius: 16, background: "#F5F8FF", border: "1px solid #D5DEFA" }}>
        <p className="flex items-center gap-2" style={{ fontWeight: 800, color: "#0B1437" }}><Sparkles size={18} color="#2350F5" aria-hidden="true" /> ¿Querés que la IA te ayude a buscar?</p>
        <p className="text-sm mt-1" style={{ color: "#4A5372", lineHeight: 1.5 }}>Entiende frases como «necesito alguien que me corte el pasto» o «¿quién alquila sillas para cumpleaños?». Antes te contamos qué se envía.</p>
        <button type="button" onClick={() => setAvisoIA(true)} className="w-full mt-3" style={{ ...botonSecundario, minHeight: 48 }}>Buscar con IA</button>
      </section>
    );
    if (ia.estado === "cargando") return <div className="mt-4"><EstadoCarga texto="Entendiendo tu búsqueda..." filas={2} /></div>;
    if (ia.estado === "fallo") return MENSAJE_IA[ia.motivo] ? <p role="status" className="text-sm mt-3 p-3" style={estiloAviso}>{MENSAJE_IA[ia.motivo]}</p> : null;
    if (ia.estado !== "ok") return null;
    const e = iaDatos.entendido || {};
    const entendio = (e.etiquetas || []).join(", ");
    if (!hayIA && !iaPregunta) return entendio ? <p role="status" className="text-sm mt-3 p-3" style={estiloAviso}>La IA entendió «{entendio}», pero todavía no hay fichas así en la zona elegida.</p> : null;
    return (
      <section aria-label="Resultados con ayuda de IA" className="mt-4 p-3" style={{ borderRadius: 18, background: "#F5F8FF", border: "1px solid #D5DEFA" }}>
        <h2 className="flex items-center gap-2" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: "1.0625rem", color: "#0B1437" }}><Sparkles size={18} color="#2350F5" aria-hidden="true" /> Con ayuda de IA</h2>
        {entendio && <p className="text-sm mt-1" style={{ color: "#4A5372", lineHeight: 1.45 }}>Entendimos: <strong style={{ color: "#0B1437" }}>{entendio}</strong>{e.localidad ? <> · <strong style={{ color: "#0B1437" }}>{e.localidad}</strong></> : null}</p>}
        {e.localidadSinResultados && <p role="status" className="text-sm mt-2 p-3" style={estiloAviso}>No encontramos fichas en {e.localidadSinResultados}. Te mostramos las de la zona que elegiste.</p>}
        {iaPregunta && (ia.seguimiento
          ? <p className="text-sm mt-3" style={{ color: "#4A5372", lineHeight: 1.45 }}>No pudimos entender tu búsqueda. Probá escribirla con otras palabras.</p>
          : (
            <div className="mt-3">
              <p style={{ fontWeight: 700, color: "#0B1437", lineHeight: 1.4 }}>{iaPregunta}</p>
              <div className="flex gap-2 mt-2">
                <input value={respuestaIA} onChange={(ev) => setRespuestaIA(ev.target.value)} maxLength={80} aria-label="Tu respuesta" placeholder="Tu respuesta"
                  onKeyDown={(ev) => { if (ev.key === "Enter") enviarRespuestaIA(); }} className="w-full outline-none bg-white px-3" style={{ border: "1px solid #CFD6E8", borderRadius: 12, minHeight: 48, fontSize: "1rem", color: "#0B1437" }} />
                <button type="button" onClick={enviarRespuestaIA} disabled={respuestaIA.trim().length < 2} style={{ ...botonSecundario, minHeight: 48, opacity: respuestaIA.trim().length < 2 ? 0.5 : 1 }}>Responder</button>
              </div>
            </div>
          ))}
        <Seccion id="negocios" titulo="Negocios" icono={Store} totalReal={iaNegocios.length} lista={iaNegocios} render={tarjetaNegocio} plano />
        <Seccion id="oficios" titulo="Oficios y servicios" icono={Wrench} totalReal={iaDatos.totalOficios} lista={iaOficios} render={tarjetaOficio} plano />
        <Seccion id="alquileres" titulo="Alquileres" icono={Home} totalReal={iaDatos.totalAlquileres} lista={iaAlquileres} render={tarjetaAlquiler} plano />
        <p className="text-xs mt-3" style={{ color: "#6B7390", lineHeight: 1.5 }}>La IA solo interpretó lo que escribiste: lo que ves son fichas reales de Mi Zona.{" "}
          <button type="button" onClick={dejarIA} className="underline font-semibold" style={{ color: "#4A5372", minHeight: 44 }}>Dejar de usar la ayuda con IA</button></p>
        <ReportarRespuestaIA texto={`La IA entendió: ${entendio || "(nada)"}${e.localidad ? ` · ${e.localidad}` : ""}${iaPregunta ? ` · Pregunta: ${iaPregunta}` : ""}`} pregunta={qFinal} contexto="Búsqueda con ayuda de IA" />
      </section>
    );
  })();

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
          {bloqueIA}
          {estado === "ok" && !hayResultados && !hayIA && ia.estado !== "cargando" && !iaPregunta && (
            <div className="mt-4">
              {tipo !== "negocios" && siguiente
                ? <EstadoVacio icono={Search} titulo="No encontramos resultados" mensaje={`No hay nada para «${qFinal}» en ${textoZona.toLowerCase()}. Probá ampliando la zona de búsqueda.`} accion={{ texto: "Ampliar la búsqueda", onClick: () => cambiarZona({ ...zona, alcance: siguiente }) }} />
                : <EstadoVacio icono={Search} titulo="No encontramos resultados" mensaje="Probá con otra palabra, más corta o más general. Por ejemplo, «plomero» en vez de «arreglo de cañerías»." />}
              {onPublicarNecesidad && <button type="button" onClick={() => onPublicarNecesidad(qFinal)} className="w-full mt-3" style={{ ...botonSecundario, minHeight: 52 }}>Publicar lo que necesitás en Comunidad (gratis)</button>}
            </div>
          )}
          {estado === "ok" && hayComun && (
            <>
              <p className="text-sm mt-4" style={{ color: "#4A5372" }} role="status">{totalC} {totalC === 1 ? "resultado" : "resultados"} para «{qFinal}» · mantené apretada una ficha para compartirla</p>
              <Seccion id="negocios" titulo="Negocios" icono={Store} totalReal={negociosC.length} lista={negociosC} render={tarjetaNegocio} vermas={`Ver los ${negociosC.length} negocios`} />
              <Seccion id="oficios" titulo="Oficios y servicios" icono={Wrench} totalReal={totalOficiosC} lista={oficiosC} render={tarjetaOficio} vermas={`Ver los ${totalOficiosC} oficios`} />
              <Seccion id="alquileres" titulo="Alquileres" icono={Home} totalReal={totalAlquileresC} lista={alquileresC} render={tarjetaAlquiler} vermas={`Ver los ${totalAlquileresC} alquileres`} />
            </>
          )}
        </>
      )}

      {avisoIA && (
        <DialogoAdvertencia titulo="Buscar con ayuda de IA" textoAceptar="Usar IA" textoCancelar="Ahora no" onAceptar={aceptarIA} onCancelar={() => setAvisoIA(false)}
          queHace="Envía lo que escribiste en el buscador a un servicio de inteligencia artificial, que lo interpreta para armar los filtros: tipo de ficha, rubro y zona."
          paraQue="Para que encuentres lo que necesitás aunque lo escribas con tus palabras, por ejemplo «necesito alguien que me corte el pasto»."
          queSucedera="Solo se envía el texto de la búsqueda, sin tu nombre ni datos de tu cuenta (sacamos correos, teléfonos y enlaces). La IA no publica nada ni envía mensajes, y los resultados salen siempre de Mi Zona. Podés dejar de usarla cuando quieras: el buscador común sigue funcionando igual." />
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
