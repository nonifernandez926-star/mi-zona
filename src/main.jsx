import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Si algo falla al dibujar una pantalla, en vez de quedar en blanco se muestra este aviso con un botón para reintentar.
class AvisoDeError extends React.Component {
  constructor(props) { super(props); this.state = { fallo: false }; }
  static getDerivedStateFromError() { return { fallo: true }; }
  componentDidCatch(error) { console.error("Error de pantalla:", error); }
  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <div role="alert" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 28, textAlign: "center", background: "#0B1437", color: "#fff", fontFamily: "Manrope, system-ui, sans-serif" }}>
        <div style={{ fontSize: 44 }} aria-hidden="true">📍</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Algo salió mal</h1>
        <p style={{ margin: 0, maxWidth: 320, lineHeight: 1.5, color: "#BBD1FB" }}>No pudimos mostrar esta pantalla. Tus datos están a salvo. Probá de nuevo.</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 6, padding: "14px 26px", borderRadius: 14, border: 0, background: "#2350F5", color: "#fff", fontWeight: 800, fontSize: 16 }}>
          Reintentar
        </button>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AvisoDeError>
      <App />
    </AvisoDeError>
  </React.StrictMode>
);

// Service worker: permite abrir la app sin conexión (pantalla de aviso) y recibir notificaciones. Solo en la versión publicada.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
}
