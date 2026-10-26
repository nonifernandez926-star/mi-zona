import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const paquete = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (mode === "production") {
    // Sin esta variable la app publicada llamaría a localhost y no cargaría nada: es mejor frenar el armado que publicar algo roto.
    if (!env.VITE_API_URL) throw new Error("Falta VITE_API_URL (la dirección del servidor, terminada en /api). Cargala en Netlify → Site configuration → Environment variables y volvé a publicar.");
    if (!env.VITE_SOPORTE_EMAIL) console.warn("ATENCIÓN: falta VITE_SOPORTE_EMAIL. Google Play exige un correo de contacto en la política de privacidad.");
  }
  return {
    plugins: [react()],
    // La versión de package.json viaja con cada aviso de error, para saber en qué versión pasó
    define: { __APP_VERSION__: JSON.stringify(paquete.version) },
  };
});
