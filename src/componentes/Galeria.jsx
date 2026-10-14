// Galería de pruebas de los componentes. SOLO existe con "npm run dev": abre  http://localhost:5173/?galeria
// No se incluye en la versión publicada (ver main.jsx). Los textos son de muestra.
import { useEffect, useState } from "react";
import { Wrench, Clock, MapPin, Share2, Heart, Home, MessageCircle } from "lucide-react";
import ChipEstado, { ESTADOS_FICHA } from "./ChipEstado.jsx";
import TarjetaFicha from "./TarjetaFicha.jsx";
import DialogoAdvertencia from "./DialogoAdvertencia.jsx";
import DetalleFicha, { SeccionDetalle, FilaDato } from "./DetalleFicha.jsx";
import { EstadoCarga, EstadoVacio, EstadoError, EstadoExito } from "./Estados.jsx";
import ComoFunciona from "./ComoFunciona.jsx";

const Bloque = ({ titulo, children }) => (
  <section style={{ marginTop: 22 }}>
    <h2 style={{ fontWeight: 800, fontSize: "1.0625rem", color: "#0B1437", marginBottom: 10 }}>{titulo}</h2>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
  </section>
);
const Boton = ({ children, ...p }) => (
  <button type="button" {...p} style={{ minHeight: 48, borderRadius: 14, border: "1px solid #CFD6E8", background: "#fff", color: "#0B1437", fontWeight: 700, fontSize: "1rem", padding: "0 18px" }}>{children}</button>
);

export default function Galeria() {
  const [dialogo, setDialogo] = useState(null); // "normal" | "peligro" | null
  const [detalle, setDetalle] = useState(false);
  const [letraGrande, setLetraGrande] = useState(false);
  useEffect(() => {
    document.documentElement.style.fontSize = letraGrande ? "125%" : "";
    return () => { document.documentElement.style.fontSize = ""; };
  }, [letraGrande]);

  if (detalle) {
    return (
      <DetalleFicha
        titulo="Electricista y plomero" subtitulo="Famaillá, Tucumán" icono={Wrench} tono="naranja" estado="disponibleHoy" contexto="Oficio" onVolver={() => setDetalle(false)}
        acciones={[{ icono: Share2, etiqueta: "Compartir", onClick: () => {} }, { icono: Heart, etiqueta: "Guardar en favoritos", onClick: () => {} }]}
        pie={<button type="button" style={{ flex: 1, minHeight: 50, borderRadius: 14, border: 0, color: "#fff", backgroundColor: "#2350F5", fontWeight: 700, fontSize: "1rem" }}>Contactar por WhatsApp</button>}
      >
        <SeccionDetalle titulo="Información" icono={Wrench}>Instalaciones, reparaciones y urgencias. Trabajo a domicilio.</SeccionDetalle>
        <SeccionDetalle titulo="Datos">
          <FilaDato icono={MapPin} etiqueta="Zona de trabajo" valor="Famaillá y alrededores" />
          <FilaDato icono={Clock} etiqueta="Horarios" valor="Lunes a sábado, de 8 a 18" />
          <FilaDato etiqueta="Precio orientativo" valor="" />
        </SeccionDetalle>
      </DetalleFicha>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4" style={{ background: "#F3F5FA", minHeight: "100vh", paddingTop: 20, paddingBottom: 48 }}>
      <h1 style={{ fontWeight: 800, fontSize: "1.5rem", color: "#0B1437" }}>Galería de componentes</h1>
      <p style={{ fontSize: "0.9375rem", color: "#4A5372", marginTop: 4 }}>Solo en desarrollo. Textos de muestra.</p>
      <div style={{ marginTop: 12 }}><Boton onClick={() => setLetraGrande((v) => !v)}>{letraGrande ? "Letra normal" : "Probar letra grande"}</Boton></div>

      <Bloque titulo="Chips de estado">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{ESTADOS_FICHA.map((e) => <ChipEstado key={e} estado={e} />)}</div>
      </Bloque>

      <Bloque titulo="Tarjetas de ficha">
        <TarjetaFicha titulo="Electricista y plomero" zona="Famaillá, Tucumán" datoClave="Desde $15.000" estado="disponibleHoy" icono={Wrench} tono="naranja" onAbrir={() => setDetalle(true)} />
        <TarjetaFicha titulo="Alquiler de sillas, mesas y peloteros para cumpleaños y eventos" zona="San Miguel de Tucumán, Tucumán" estado="pausada" icono={Home} tono="violeta" onAbrir={() => setDetalle(true)} />
        <TarjetaFicha titulo="Ficha con foto que no carga" zona="Monteros, Tucumán" estado="vencida" imagen="https://invalido.invalid/foto.jpg" onAbrir={() => setDetalle(true)} />
      </Bloque>

      <Bloque titulo="Cómo funciona">
        <ComoFunciona pasos={["Completás el formulario corto.", "Revisás cómo se verá tu ficha.", "La activás y los vecinos pueden encontrarte."]} />
      </Bloque>

      <Bloque titulo="Advertencias">
        <Boton onClick={() => setDialogo("normal")}>Abrir advertencia</Boton>
        <Boton onClick={() => setDialogo("peligro")}>Abrir advertencia de peligro</Boton>
      </Bloque>

      <Bloque titulo="Estados">
        <EstadoCarga filas={2} texto="Cargando fichas…" />
        <EstadoCarga texto="Guardando cambios…" />
        <EstadoVacio icono={MessageCircle} tono="agua" titulo="Todavía no hay fichas en tu zona" mensaje="Sé el primero en agregar una." accion={{ texto: "Agregar mi ficha", onClick: () => {} }} />
        <EstadoError onReintentar={() => {}} />
        <EstadoExito titulo="Ficha activada" mensaje="Ya es visible para otros vecinos." accion={{ texto: "Ver mi ficha", onClick: () => {} }} />
      </Bloque>

      {dialogo && (
        <DialogoAdvertencia
          titulo={dialogo === "peligro" ? "¿Eliminar esta ficha?" : "Vas a activar tu ficha"}
          queHace={dialogo === "peligro" ? "Borra la ficha y sus datos." : "Publica tu ficha en Mi Zona."}
          paraQue={dialogo === "peligro" ? "Sirve si ya no ofreces este servicio." : "Sirve para que otros vecinos te encuentren y te contacten."}
          queSucedera={dialogo === "peligro" ? "Desaparece de las búsquedas y de los favoritos. No se puede deshacer." : "Será pública y cualquiera podrá contactarte."}
          textoAceptar={dialogo === "peligro" ? "Eliminar ficha" : "Aceptar"}
          peligro={dialogo === "peligro"} onAceptar={() => setDialogo(null)} onCancelar={() => setDialogo(null)}
        />
      )}
    </div>
  );
}
