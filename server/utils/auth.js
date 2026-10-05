import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import Usuario from "../models/Usuario.js";
import { permitir } from "./limitador.js";

// ID de cliente de Google de la web de Mi Zona (es público: también va dentro de la web). El servidor siempre lo acepta,
// y además acepta los que se carguen en GOOGLE_CLIENT_ID (separados por coma), así un error al cargar la variable no rompe el acceso con Google.
const ID_GOOGLE_WEB = "553562775987-ovo25d12tq3fhntvj34342nk3jlg7vtc.apps.googleusercontent.com";
function idsGooglePermitidos() {
  const deEntorno = String(process.env.GOOGLE_CLIENT_ID || "").split(",").map((x) => x.trim().replace(/^["']+|["']+$/g, "")).filter(Boolean);
  return [...new Set([...deEntorno, ID_GOOGLE_WEB])];
}
const googleClient = new OAuth2Client();

function secreto() {
  if (!process.env.JWT_SECRET) {
    const e = new Error("Falta JWT_SECRET en las variables de entorno del servidor.");
    e.status = 503;
    throw e;
  }
  return process.env.JWT_SECRET;
}

export function firmarTokenUsuario(usuario) {
  return jwt.sign({ uid: String(usuario._id), v: usuario.tokenVersion || 0 }, secreto(), { expiresIn: "90d", algorithm: "HS256" });
}

function leerToken(req) {
  const h = req.headers["authorization"];
  if (!h || !h.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(h.slice(7), secreto(), { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

export async function verificarIdTokenGoogle(idToken) {
  const ticket = await googleClient.verifyIdToken({ idToken, audience: idsGooglePermitidos() });
  const p = ticket.getPayload();
  if (!p?.email || p.email_verified === false) throw new Error("Cuenta de Google sin email verificado");
  return { googleId: p.sub, email: p.email.toLowerCase(), nombreGoogle: p.name || "" };
}

// Verifica un access token de Google (el que entrega la ventana "elegir cuenta"): comprueba que lo emitió NUESTRO ID de cliente
// y trae el correo y el nombre de la cuenta elegida.
export async function verificarAccessTokenGoogle(accessToken) {
  const t = String(accessToken || "");
  if (t.length < 20 || t.length > 4096) throw new Error("Token de Google inválido");
  const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(t)}`);
  if (!info.ok) throw new Error("Token de Google vencido o inválido");
  const datos = await info.json();
  const permitidos = idsGooglePermitidos();
  if (!permitidos.includes(datos.aud) && !permitidos.includes(datos.azp)) {
    throw new Error(`Wrong recipient: Google emitió el acceso para el ID ${String(datos.aud || "?").slice(0, 14)}… y el servidor espera ${permitidos.map((x) => x.slice(0, 14)).join(" / ")}…`);
  }
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${t}` } });
  if (!res.ok) throw new Error("No se pudo leer la cuenta de Google");
  const p = await res.json();
  if (!p?.sub || !p?.email || p.email_verified === false) throw new Error("Cuenta de Google sin email verificado");
  return { googleId: p.sub, email: String(p.email).toLowerCase(), nombreGoogle: p.name || "" };
}

// Middleware: identifica quién hace el pedido (si manda un token válido). No bloquea a nadie por sí solo.
// req.actor = { tipo: "usuario", usuario } | null
export async function identificar(req, res, next) {
  try {
    const t = leerToken(req);
    req.actor = null;
    if (t?.uid) {
      const usuario = await Usuario.findById(t.uid);
      // si la versión del token no coincide, la persona cerró sesión en todos los dispositivos o cambió su contraseña
      if (usuario && (t.v || 0) === (usuario.tokenVersion || 0)) { req.actor = { tipo: "usuario", usuario }; req.tokenExp = t.exp; }
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function requiereUsuario(req, res, next) {
  if (req.actor?.tipo !== "usuario") return res.status(401).json({ error: "Tenés que iniciar sesión con Google." });
  next();
}

export function compararSeguro(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Id con el que Mi Asistente reconoce a esta cuenta. Lo maneja el SERVIDOR: nunca se toma del pedido, así nadie puede
// hacerse pasar por otra persona mandando su id. Si la cuenta todavía no tiene uno, se crea uno aleatorio.
export async function sesionClienteDe(usuario) {
  if (usuario.sesionClienteId) return usuario.sesionClienteId;
  usuario.sesionClienteId = "sesion-" + crypto.randomBytes(16).toString("hex");
  await usuario.save();
  return usuario.sesionClienteId;
}

// Límite de pedidos por persona (si hay sesión) o por IP. Devuelve un middleware.
export function limitar(nombre, max, ventanaMs) {
  return (req, res, next) => {
    const quien = req.actor?.usuario ? `u${req.actor.usuario._id}` : `ip${req.ip || "?"}`;
    if (!permitir(`${nombre}|${quien}`, max, ventanaMs)) return res.status(429).json({ error: "Hiciste muchos pedidos seguidos. Probá de nuevo en un rato." });
    next();
  };
}
