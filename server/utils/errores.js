// Registro de errores de la web (Fase 11). Una TWA corre la web dentro de Chrome, así que Crashlytics y las herramientas nativas NO ven los errores de la
// pantalla: los manda la propia app a este servidor. Solo se guarda lo técnico (mensaje, pila, pantalla, versión y tipo de celular), nunca datos de la persona.
// No depende de Express ni de MongoDB, así se puede probar suelto.
import crypto from "crypto";

const MAX = { mensaje: 300, pila: 900, pantalla: 80, version: 20, plataforma: 120 };
const corto = (v, max) => String(v ?? "").slice(0, max);

// Saca lo que pudiera identificar a alguien: correos, números largos (teléfonos, documentos), enlaces con parámetros y tokens
export function limpiarTexto(t, max) {
  return corto(t, max * 2)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[correo]")
    .replace(/\b(?:\d[\s().-]?){7,}\b/g, "[número]")
    .replace(/(\S)([?#])\S+/g, "$1$2[…]")
    .replace(/\b(?:eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}|[A-Za-z0-9_-]{32,})\b/g, "[clave]")
    .slice(0, max);
}

// La pantalla se guarda como una ruta sin parámetros ni ids (así no se cuela un dato de nadie)
const pantallaSegura = (p) => limpiarTexto(String(p ?? "").split(/[?#]/)[0].replace(/\/[0-9a-f]{8,}/gi, "/:id").replace(/\/\d{3,}/g, "/:id"), MAX.pantalla);

export function sanearError(body) {
  const b = body && typeof body === "object" ? body : {};
  const mensaje = limpiarTexto(b.mensaje, MAX.mensaje).trim();
  if (mensaje.length < 2) return null;
  const pila = limpiarTexto(b.pila, MAX.pila);
  const pantalla = pantallaSegura(b.pantalla);
  const version = limpiarTexto(b.version, MAX.version).replace(/[^\w.+-]/g, "");
  const plataforma = limpiarTexto(b.plataforma, MAX.plataforma);
  // La huella agrupa el mismo error en una sola fila (con un contador) en vez de guardar miles iguales
  const huella = crypto.createHash("sha256").update([mensaje, pila.split("\n").slice(0, 3).join("|"), pantalla, version].join("\u0001")).digest("hex").slice(0, 32);
  return { huella, mensaje, pila, pantalla, version, plataforma };
}
