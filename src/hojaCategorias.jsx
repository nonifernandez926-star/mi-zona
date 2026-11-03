import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Grid3x3, Package, Search } from "lucide-react";
import { Hoja } from "./oficios.jsx";

// Piezas que comparten Negocios, Alquileres y Oficios, para que las tres secciones se vean igual:
//  - TarjetaCategorias: la tarjeta blanca «Categorías» con «Ver todas», la fila de íconos y el botón «Otros» al final.
//  - HojaCategorias: la subpantalla («Otros rubros», «Otros alquileres», «Todos los oficios»...) con una grilla de 3 columnas.
//    Cada opción es una tarjeta con un cuadrado de color con su ícono y el nombre abajo; la elegida lleva borde azul y fondo celeste suave.
//    La primera opción siempre es «Todo en ...».

const TINTA = "#0B1437", SUAVE = "#5B6482", LINEA = "#E3E7F1";
export const COLOR_OTROS = "#13897F";

// Fondo suave del cuadrado del ícono. Si el color es una variable del tema (ej. var(--azul)) no se le puede sumar transparencia.
export const tinte = (color) => (String(color).startsWith("var(") ? "var(--azul-suave)" : `${color}17`);
const normalizar = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// ---------- tarjeta «Categorías» ----------
// items: [{ id, label, Icono, color }] · valor: id elegido (o vacío = todos) · otros: { activo, onClick }
function BotonCategoria({ activo, onClick, color, Icono, texto, sinCierre }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={!!activo} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
      <span className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 18, background: activo ? (color ? `linear-gradient(135deg, ${color}, ${color}cc)` : "linear-gradient(135deg,var(--azul),var(--azul-medio))") : (color ? tinte(color) : "#EEF3FB"), boxShadow: activo ? (color ? `0 8px 18px ${color}55` : "0 8px 18px rgba(var(--azul-rgb),0.33)") : "none", transition: "all .2s" }}>
        <Icono size={21} color={activo ? "#fff" : (color || "var(--azul)")} aria-hidden="true" />
      </span>
      <span className={`text-[11px] text-center font-medium${sinCierre ? "" : " leading-tight"}`} style={{ color: activo ? TINTA : "#2B3768" }}>{texto}</span>
    </button>
  );
}

export function TarjetaCategorias({ items, valor, onTodos, onElegir, onVerTodas, otros }) {
  return (
    <div className="bg-white px-4 pt-3.5 pb-3" style={{ borderRadius: 22, border: `1px solid ${LINEA}`, boxShadow: "0 12px 32px rgba(11,20,55,0.12)" }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: TINTA }}>Categorías</span>
        <button type="button" onClick={onVerTodas} className="text-xs font-semibold px-2.5 py-1" style={{ color: "var(--azul)", background: "var(--azul-suave)", borderRadius: 20 }}>Ver todas</button>
      </div>
      <div className="flex gap-3.5 overflow-x-auto pb-1">
        <BotonCategoria activo={!valor} onClick={onTodos} Icono={Grid3x3} texto="Todos" sinCierre />
        {items.map((c) => <BotonCategoria key={c.id} activo={valor === c.id} onClick={() => onElegir(c)} color={c.color} Icono={c.Icono} texto={c.label} />)}
        {otros && <BotonCategoria activo={otros.activo} onClick={otros.onClick} color={COLOR_OTROS} Icono={Package} texto="Otros" />}
      </div>
    </div>
  );
}

// ---------- subpantalla ----------
// grupos: [{ id?, titulo?, items: [{ id, label, corto?, Icono, color }] }] (un solo grupo sin título = grilla simple)
// todo: { texto, activo, onClick } · valor: id elegido · onElegir(item, grupo) · buscar: texto de ayuda del buscador (si hay que poder buscar)
export function HojaCategorias({ titulo, ayuda, todo, grupos, valor, onElegir, onCerrar, buscar }) {
  const [b, setB] = useState("");
  const q = normalizar(b.trim());
  const visibles = useMemo(
    () => grupos.map((g) => ({ ...g, items: q ? g.items.filter((i) => normalizar(i.label).includes(q)) : g.items })).filter((g) => g.items.length > 0),
    [grupos, q],
  );
  // La hoja se dibuja directamente en <body>: así queda por encima de la barra de abajo y de los botones flotantes, estés donde estés.
  return createPortal(
    <Hoja titulo={titulo} onCerrar={onCerrar}>
      {ayuda && <p className="text-sm mb-3" style={{ color: SUAVE }}>{ayuda}</p>}
      {buscar && (
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={18} color="#6B7494" aria-hidden="true" style={{ position: "absolute", left: 14, top: 15 }} />
          <input value={b} onChange={(e) => setB(e.target.value)} placeholder={buscar} aria-label={buscar} style={{ width: "100%", boxSizing: "border-box", minHeight: 48, border: "1px solid #CFD6E8", borderRadius: 12, padding: "11px 14px 11px 42px", font: "inherit", fontSize: "1rem" }} />
        </div>
      )}
      {todo && !q && (
        <button type="button" onClick={todo.onClick} aria-pressed={!!todo.activo} className="w-full flex items-center gap-3 text-left mb-3"
          style={{ minHeight: 56, padding: "8px 14px", borderRadius: 18, border: `1.5px solid ${todo.activo ? "var(--azul)" : LINEA}`, background: todo.activo ? "var(--azul-suave)" : "#fff" }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 12, background: todo.activo ? "#fff" : "#EEF3FB" }}><Grid3x3 size={18} color="var(--azul)" aria-hidden="true" /></span>
          <span className="flex-1" style={{ fontSize: 15, fontWeight: todo.activo ? 700 : 600, color: todo.activo ? "var(--azul)" : TINTA }}>{todo.texto}</span>
          {todo.activo && <Check size={18} strokeWidth={3} color="var(--azul)" aria-hidden="true" />}
        </button>
      )}
      {visibles.map((g, i) => (
        <div key={g.id || i} className="mb-3">
          {g.titulo && <p className="mb-2 mt-1" style={{ fontSize: 13, fontWeight: 700, color: "#2B3768" }}>{g.titulo}</p>}
          <div className="grid grid-cols-3 gap-2.5">
            {g.items.map((it) => {
              const Icono = it.Icono, act = valor === it.id;
              return (
                <button key={it.id} type="button" onClick={() => onElegir(it, g)} aria-pressed={act} aria-label={it.label} className="flex flex-col items-center justify-start gap-1.5 text-center min-w-0"
                  style={{ minHeight: 96, padding: "12px 6px", borderRadius: 18, border: `1.5px solid ${act ? "var(--azul)" : LINEA}`, background: act ? "var(--azul-suave)" : "#fff" }}>
                  <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 13, background: tinte(it.color) }}><Icono size={19} color={it.color} aria-hidden="true" /></span>
                  <span className="text-[11px] leading-tight font-medium" style={{ color: act ? "var(--azul)" : "#2B3768", overflowWrap: "anywhere" }}>{it.corto || it.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {q && visibles.length === 0 && <p className="text-sm text-center py-6" style={{ color: SUAVE }}>No encontramos nada con «{b.trim()}».</p>}
    </Hoja>,
    document.body,
  );
}
