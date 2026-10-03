import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import Usuario from "../models/Usuario.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function secreto() {
  if (!process.env.JWT_SECRET) {
    const e = new Error("Falta JWT_SECRET en las variables de entorno del servidor.");
    e.status = 503;
    throw e;
  }
  return process.env.JWT_SECRET;
}

export function firmarTokenUsuario(usuarioId) {
  return jwt.sign({ uid: usuarioId }, secreto(), { expiresIn: "90d" });
}

function leerToken(req) {
  const h = req.headers["authorization"];
  if (!h || !h.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(h.slice(7), secreto());
  } catch {
    return null;
  }
}

export async function verificarIdTokenGoogle(idToken) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    const e = new Error("Falta GOOGLE_CLIENT_ID en las variables de entorno del servidor.");
    e.status = 503;
    throw e;
  }
  const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
  const p = ticket.getPayload();
  if (!p?.email || p.email_verified === false) throw new Error("Cuenta de Google sin email verificado");
  return { googleId: p.sub, email: p.email.toLowerCase(), nombreGoogle: p.name || "" };
}

// Middleware: identifica quién hace el pedido (si manda un token válido). No bloquea a nadie por sí solo.
// req.actor = { tipo: "usuario", usuario } | null
export async function identificar(req, res, next) {
  try {
    const t = leerToken(req);
    req.actor = null;
    if (t?.uid) {
      const usuario = await Usuario.findById(t.uid);
      if (usuario) req.actor = { tipo: "usuario", usuario };
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
