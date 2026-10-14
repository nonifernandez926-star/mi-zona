import { Info, ChevronRight } from "lucide-react";
import { TONOS } from "../tonos.js";

// Cartel plegable "¿Cómo funciona?" para cada sección. Texto simple: pasos cortos (pasos=[...]) o contenido propio (children).
export default function ComoFunciona({ titulo = "¿Cómo funciona?", pasos = [], children }) {
  const t = TONOS.azul;
  return (
    <details className="zn-acordeon" style={{ background: "#fff", border: "1px solid #E3E7F1", borderRadius: 18, overflow: "hidden" }}>
      <summary style={{ listStyle: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", minHeight: 56 }}>
        <span style={{ width: 34, height: 34, borderRadius: 12, flexShrink: 0, background: t.bg, boxShadow: `inset 0 0 0 1px ${t.aro}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Info size={18} color={t.fg} aria-hidden="true" />
        </span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "1rem", color: "#0B1437" }}>{titulo}</span>
        <ChevronRight size={18} color="#4A5372" className="zn-chevron" aria-hidden="true" />
      </summary>
      <div style={{ padding: "0 16px 16px", fontSize: "0.9375rem", color: "#4A5372", lineHeight: 1.55 }}>
        {pasos.length > 0 && (
          <ol style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 6 }}>
            {pasos.map((p, i) => <li key={i} style={{ listStyle: "decimal" }}>{p}</li>)}
          </ol>
        )}
        {children}
      </div>
    </details>
  );
}
