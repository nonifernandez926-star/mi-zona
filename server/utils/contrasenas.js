import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);

// Las contraseñas NUNCA se guardan: solo un "hash" (huella irreversible) con una sal aleatoria propia de cada cuenta.
// Formato guardado: "<sal en hex>:<hash en hex>".
export async function hashearContrasena(contrasena) {
  const sal = crypto.randomBytes(16).toString("hex");
  const hash = (await scrypt(contrasena, sal, 64)).toString("hex");
  return `${sal}:${hash}`;
}

export async function verificarContrasena(contrasena, guardada) {
  const [sal, hashGuardado] = String(guardada || "").split(":");
  if (!sal || !hashGuardado) return false;
  const hash = await scrypt(contrasena, sal, 64);
  const esperado = Buffer.from(hashGuardado, "hex");
  return esperado.length === hash.length && crypto.timingSafeEqual(esperado, hash);
}
