// Verificación en dos pasos (TOTP, RFC 6238) para el panel de moderación, sin dependencias externas.
// Compatible con Google Authenticator, Microsoft Authenticator, Aegis, 1Password, etc.
// La clave secreta (MODERACION_TOTP_SECRET) vive solo en el servidor y en la app autenticadora de quien administra.
import crypto from "crypto";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decodificar(texto) {
  const limpio = String(texto || "").toUpperCase().replace(/[\s=-]/g, "");
  if (!limpio || /[^A-Z2-7]/.test(limpio)) return null;
  let bits = "";
  for (const c of limpio) bits += ALFABETO.indexOf(c).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function base32Codificar(buffer) {
  let bits = "";
  for (const b of buffer) bits += b.toString(2).padStart(8, "0");
  let salida = "";
  for (let i = 0; i < bits.length; i += 5) salida += ALFABETO[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return salida;
}

// Clave nueva (160 bits) lista para cargar en la app autenticadora
export const generarSecretoTotp = () => base32Codificar(crypto.randomBytes(20));

// Código de 6 cifras para un "paso" de 30 segundos
export function codigoTotp(secretoBase32, paso, digitos = 6) {
  const clave = base32Decodificar(secretoBase32);
  if (!clave || clave.length < 10) return null;
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(paso));
  const h = crypto.createHmac("sha1", clave).update(contador).digest();
  const o = h[h.length - 1] & 0x0f;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** digitos).padStart(digitos, "0");
}

export const pasoActual = (ahoraMs = Date.now()) => Math.floor(ahoraMs / 30000);

// Devuelve el paso que coincide (para que el servidor pueda rechazar un código ya usado) o null. Acepta ±1 paso por diferencias de reloj.
export function verificarTotp(secretoBase32, codigo, ahoraMs = Date.now()) {
  const c = String(codigo || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const actual = pasoActual(ahoraMs);
  let encontrado = null;
  for (const delta of [0, -1, 1]) {
    const esperado = codigoTotp(secretoBase32, actual + delta);
    if (esperado && esperado.length === c.length && crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(c))) encontrado = encontrado ?? actual + delta;
  }
  return encontrado;
}

export const urlOtpauth = (secreto, cuenta = "Moderación", emisor = "Mi Zona") =>
  `otpauth://totp/${encodeURIComponent(`${emisor}:${cuenta}`)}?secret=${secreto}&issuer=${encodeURIComponent(emisor)}&algorithm=SHA1&digits=6&period=30`;
