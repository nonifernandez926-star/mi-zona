import { useEffect, useId, useMemo, useState } from "react";
import { Search, Check, X } from "lucide-react";
import { provincias as cargarProvincias, localidadesDeProvincia, normalizarBusqueda } from "./localidades.js";

// Elegir localidad con el catálogo oficial: primero la provincia y después la localidad (con buscador, porque hay provincias con cientos).
// El departamento no se pregunta: lo trae Georef con cada localidad y se guarda solo.
// valor / onChange usan { provinciaId, provincia, departamentoId, departamento, localidadId, localidad }; onChange(null) mientras falta algo.
const ETIQUETA = { display: "block", margin: "0 0 6px", fontSize: ".78rem", fontWeight: 700, color: "#2b3768" };
const CAJA = { width: "100%", boxSizing: "border-box", minHeight: 48, border: "1px solid #e3e7f1", borderRadius: 12, padding: "12px 14px", font: "inherit", fontSize: ".95rem", background: "#fff", color: "#0B1437" };
const MAX_VISIBLES = 80; // la lista muestra las primeras coincidencias; para ver otras, se escribe en el buscador

export default function SelectorLocalidad({ valor, onChange }) {
  const id = useId();
  const [provs, setProvs] = useState(null); // null = cargando
  const [locs, setLocs] = useState(null);
  const [provId, setProvId] = useState(valor?.provinciaId || "");
  const [elegida, setElegida] = useState(valor?.localidadId ? valor : null); // lo ya elegido (se muestra resumido, con "Cambiar")
  const [busqueda, setBusqueda] = useState("");
  const [fallo, setFallo] = useState(false);
  const [intento, setIntento] = useState(0);
  const cambiando = !elegida;

  useEffect(() => {
    let vivo = true;
    setFallo(false);
    cargarProvincias().then((l) => vivo && setProvs(l)).catch(() => vivo && setFallo(true));
    return () => { vivo = false; };
  }, [intento]);

  // La lista de localidades solo se pide cuando hace falta elegir (no mientras se muestra la que ya estaba guardada)
  useEffect(() => {
    if (!provId || !cambiando) { setLocs(null); return undefined; }
    let vivo = true;
    setLocs(null);
    localidadesDeProvincia(provId).then((l) => vivo && setLocs(l)).catch(() => vivo && setFallo(true));
    return () => { vivo = false; };
  }, [provId, cambiando, intento]);

  const nombreProv = (pid) => provs?.find((p) => p.id === pid)?.nombre || "";

  const alProvincia = (e) => {
    setProvId(e.target.value); setElegida(null); setBusqueda("");
    onChange(null);
  };
  const elegir = (l) => {
    const v = { provinciaId: provId, provincia: nombreProv(provId), departamentoId: l.departamentoId, departamento: l.departamento, localidadId: l.id, localidad: l.nombre };
    setElegida(v); setBusqueda("");
    onChange(v);
  };
  const cambiar = () => { setElegida(null); setBusqueda(""); onChange(null); };

  // nombres repetidos dentro de la provincia (hay varias "San Antonio"): se aclara el departamento solo en esos casos
  const repetidos = useMemo(() => {
    const cuenta = new Map();
    (locs || []).forEach((l) => cuenta.set(l.nombre, (cuenta.get(l.nombre) || 0) + 1));
    return new Set([...cuenta].filter(([, n]) => n > 1).map(([nombre]) => nombre));
  }, [locs]);
  const coincidencias = useMemo(() => {
    if (!locs) return [];
    const q = normalizarBusqueda(busqueda);
    if (!q) return locs;
    // primero las que empiezan con lo escrito, después las que lo contienen
    const empiezan = [], contienen = [];
    for (const l of locs) {
      const n = normalizarBusqueda(l.nombre);
      if (n.startsWith(q)) empiezan.push(l); else if (n.includes(q)) contienen.push(l);
    }
    return [...empiezan, ...contienen];
  }, [locs, busqueda]);
  const visibles = coincidencias.slice(0, MAX_VISIBLES);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label htmlFor={`${id}p`} style={ETIQUETA}>Provincia</label>
        <select id={`${id}p`} value={provId} onChange={alProvincia} style={CAJA}>
          <option value="">{provs ? "Elegí tu provincia" : "Cargando..."}</option>
          {provs?.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
      </div>

      <div>
        <span style={ETIQUETA} id={`${id}l`}>Localidad</span>
        {elegida ? (
          <div style={{ ...CAJA, display: "flex", alignItems: "center", gap: 10, background: "#F1FAF5", borderColor: "#CDEBDA" }}>
            <Check size={18} color="#1E6B44" aria-hidden="true" />
            <span style={{ flex: 1, minWidth: 0, fontWeight: 700 }}>{elegida.localidad}</span>
            <button type="button" onClick={cambiar} style={{ minHeight: 40, padding: "0 12px", border: 0, background: "transparent", font: "inherit", fontWeight: 800, color: "var(--azul)", textDecoration: "underline" }}>Cambiar</button>
          </div>
        ) : !provId ? (
          <div style={{ ...CAJA, color: "#667085", background: "#F3F5FA" }}>Primero elegí tu provincia</div>
        ) : (
          <>
            <div style={{ ...CAJA, display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
              <Search size={18} color="#4A5372" aria-hidden="true" />
              <input
                type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} disabled={!locs}
                placeholder={locs ? "Escribí el nombre de tu localidad" : "Cargando localidades..."}
                aria-labelledby={`${id}l`} aria-controls={`${id}lista`} autoComplete="off"
                style={{ flex: 1, minWidth: 0, minHeight: 46, border: 0, outline: "none", font: "inherit", fontSize: ".95rem", background: "transparent", color: "#0B1437" }}
              />
              {busqueda && <button type="button" onClick={() => setBusqueda("")} aria-label="Borrar búsqueda" style={{ width: 40, height: 40, border: 0, background: "transparent" }}><X size={16} color="#4A5372" /></button>}
            </div>
            {locs && (
              <>
                <p role="status" aria-live="polite" style={{ margin: "6px 2px 4px", fontSize: ".78rem", color: "#4A5372" }}>
                  {coincidencias.length === 0 ? "No encontramos esa localidad." : busqueda ? `${coincidencias.length} ${coincidencias.length === 1 ? "resultado" : "resultados"}` : `${locs.length} localidades: escribí para buscar`}
                  {coincidencias.length > MAX_VISIBLES && ` (mostramos las primeras ${MAX_VISIBLES})`}
                </p>
                <ul id={`${id}lista`} role="listbox" aria-label="Localidades" style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 260, overflowY: "auto", border: "1px solid #e3e7f1", borderRadius: 12, background: "#fff" }}>
                  {visibles.map((l) => (
                    <li key={l.id} role="option" aria-selected="false">
                      <button type="button" onClick={() => elegir(l)} style={{ display: "block", width: "100%", textAlign: "left", minHeight: 48, padding: "8px 14px", border: 0, borderBottom: "1px solid #EEF0F6", background: "transparent", font: "inherit", fontSize: ".95rem", color: "#0B1437" }}>
                        <span style={{ fontWeight: 600 }}>{l.nombre}</span>
                        {(repetidos.has(l.nombre) || l.esDepartamento) && (
                          <span style={{ display: "block", fontSize: ".78rem", color: "#4A5372" }}>{l.esDepartamento ? "Departamento" : `Departamento ${l.departamento}`}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                <p style={{ margin: "6px 2px 0", fontSize: ".78rem", color: "#4A5372", lineHeight: 1.4 }}>¿No ves tu localidad? Elegí la más cercana a donde vivís.</p>
              </>
            )}
          </>
        )}
      </div>

      {fallo && (
        <p role="alert" style={{ margin: 0, fontSize: ".82rem", color: "#9A3B34", lineHeight: 1.4 }}>
          No pudimos cargar la lista. Revisá tu conexión.{" "}
          <button type="button" onClick={() => setIntento((n) => n + 1)} style={{ background: "none", border: 0, padding: 0, font: "inherit", fontWeight: 800, color: "var(--azul)", textDecoration: "underline" }}>Reintentar</button>
        </p>
      )}
      <p style={{ margin: 0, fontSize: ".72rem", color: "#667085" }}>Lista oficial de localidades: Georef (datos.gob.ar).</p>
    </div>
  );
}
