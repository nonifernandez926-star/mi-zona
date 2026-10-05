import express from "express";
import Usuario from "../models/Usuario.js";
import Business from "../models/Business.js";
import {
  verificarIdTokenGoogle, verificarAccessTokenGoogle, firmarTokenUsuario,
  identificar, requiereUsuario,
} from "../utils/auth.js";
import { hashearContrasena, verificarContrasena } from "../utils/contrasenas.js";
import { permitir, olvidar } from "../utils/limitador.js";

const router = express.Router();

const usuarioPublico = (u) => ({ id: String(u._id), email: u.email, nombre: u.nombre, conClave: !!u.passwordHash });

// Une a la cuenta los negocios que tengan su email como dueño (negocios cargados antes de que existiera el login).
async function vincularNegociosPorEmail(usuario) {
  await Business.updateMany(
    { ownerEmail: usuario.email, $or: [{ ownerId: { $exists: false } }, { ownerId: "" }, { ownerId: null }] },
    { $set: { ownerId: String(usuario._id) } }
  );
}

// POST /api/auth/google   { accessToken | idToken, modo }
// Verifica el token que entrega Google en el navegador, crea la cuenta si es la primera vez y devuelve la sesión.
// Si todavía no tiene nombre, la web se lo pide (requiereNombre) y lo guarda con PUT /api/auth/perfil.
//   modo "registro": crea la cuenta (si ya existía, simplemente inicia sesión y avisa con yaExistia)
//   modo "login":    solo entra si la cuenta ya está registrada; si no, responde cuenta_inexistente
router.post("/google", async (req, res) => {
  try {
    const { idToken, accessToken } = req.body || {};
    const modo = req.body?.modo === "login" ? "login" : "registro";
    if (!idToken && !accessToken) return res.status(400).json({ error: "Falta el token de Google" });

    // la web usa el access token de la ventana "elegir cuenta"; el idToken sigue aceptándose por compatibilidad
    const { googleId, email, nombreGoogle } = accessToken
      ? await verificarAccessTokenGoogle(accessToken)
      : await verificarIdTokenGoogle(idToken);

    let usuario = await Usuario.findOne({ googleId });
    let yaExistia = !!usuario;
    if (!usuario) {
      // Si ya se había registrado con correo y contraseña con este mismo correo, ahora Google lo verifica: pasa a ser la misma cuenta
      const porCorreo = await Usuario.findOne({ email, proveedor: "email" });
      if (porCorreo) {
        porCorreo.googleId = googleId;
        porCorreo.proveedor = "google";
        await porCorreo.save();
        usuario = porCorreo;
        yaExistia = true;
      }
    }
    if (!usuario && modo === "login") {
      return res.status(404).json({ error: "cuenta_inexistente", mensaje: "Todavía no te registraste con esta cuenta de Google. Tocá \"Registrarme\" para crear tu cuenta." });
    }
    if (!usuario) usuario = await Usuario.create({ googleId, email, nombre: "" });
    else if (usuario.email !== email) { usuario.email = email; await usuario.save(); }

    await vincularNegociosPorEmail(usuario);

    res.json({
      token: firmarTokenUsuario(usuario),
      usuario: usuarioPublico(usuario),
      nombreGoogle, // solo como sugerencia para el campo de nombre
      requiereNombre: !usuario.nombre,
      yaExistia,
    });
  } catch (e) {
    console.error("Error en login con Google:", e.message);
    if (e.status === 503) return res.status(503).json({ error: e.message });
    // el detalle técnico (por ejemplo "Wrong recipient": el ID de cliente de Google no coincide) ayuda a encontrar el problema
    res.status(401).json({ error: "No se pudo verificar la cuenta de Google", detalle: String(e.message || "").slice(0, 160) });
  }
});

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normalizarCorreo = (v) => String(v || "").trim().toLowerCase();
const ip = (req) => req.ip || "sin-ip";

// POST /api/auth/correo   { email }  → paso 1 del ingreso con correo: dice qué hacer después (pedir contraseña, crear cuenta o usar Google)
router.post("/correo", async (req, res) => {
  try {
    if (!permitir(`correo|${ip(req)}`, 30, 15 * 60 * 1000)) return res.status(429).json({ error: "Hiciste muchos intentos. Probá de nuevo en un rato." });
    const email = normalizarCorreo(req.body?.email);
    if (!RE_CORREO.test(email) || email.length > 120) return res.status(400).json({ error: "Escribí un correo válido." });
    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.json({ paso: "crear" });
    res.json({ paso: usuario.passwordHash ? "clave" : "google" });
  } catch (e) {
    console.error("Error al revisar el correo:", e.message);
    res.status(500).json({ error: "No se pudo continuar. Probá de nuevo." });
  }
});

// POST /api/auth/registro   { nombre, email, password }  → crea una cuenta con correo y contraseña
router.post("/registro", async (req, res) => {
  try {
    if (!permitir(`registro|${ip(req)}`, 10, 3600 * 1000)) return res.status(429).json({ error: "Hiciste muchos intentos. Probá de nuevo en un rato." });
    const email = normalizarCorreo(req.body?.email);
    const password = String(req.body?.password || "");
    const nombre = String(req.body?.nombre || "").replace(/\s+/g, " ").trim();
    if (!RE_CORREO.test(email) || email.length > 120) return res.status(400).json({ error: "Escribí un correo válido." });
    if (password.length < 8) return res.status(400).json({ error: "La contraseña tiene que tener al menos 8 caracteres." });
    if (password.length > 100) return res.status(400).json({ error: "La contraseña es demasiado larga (máximo 100)." });
    if (nombre.length < 2 || nombre.length > 60) return res.status(400).json({ error: "Escribí tu nombre (entre 2 y 60 letras)." });

    if (await Usuario.findOne({ email })) {
      return res.status(409).json({ error: "Ese correo ya está registrado. Tocá \"Iniciar sesión\".", codigo: "correo_existente" });
    }
    const usuario = await Usuario.create({
      googleId: `email:${email}`, email, nombre, proveedor: "email", passwordHash: await hashearContrasena(password),
    });
    res.status(201).json({ token: firmarTokenUsuario(usuario), usuario: usuarioPublico(usuario), requiereNombre: false, yaExistia: false });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "Ese correo ya está registrado. Tocá \"Iniciar sesión\".", codigo: "correo_existente" });
    console.error("Error en registro con correo:", e.message);
    res.status(e.status === 503 ? 503 : 500).json({ error: e.status === 503 ? e.message : "No se pudo crear la cuenta. Probá de nuevo." });
  }
});

// POST /api/auth/login   { email, password }  → entra con correo y contraseña
router.post("/login", async (req, res) => {
  try {
    const email = normalizarCorreo(req.body?.email);
    const password = String(req.body?.password || "");
    const clave = `login|${ip(req)}|${email}`;
    // 8 intentos cada 15 minutos por persona y correo: frena a quien prueba contraseñas
    if (!permitir(clave, 8, 15 * 60 * 1000) || !permitir(`login|${ip(req)}`, 40, 15 * 60 * 1000)) {
      return res.status(429).json({ error: "Demasiados intentos. Esperá unos minutos y probá de nuevo." });
    }
    if (!RE_CORREO.test(email) || !password) return res.status(400).json({ error: "Escribí tu correo y tu contraseña." });

    const usuario = await Usuario.findOne({ email });
    if (usuario && !usuario.passwordHash) {
      return res.status(400).json({ error: "Ese correo se registró con Google. Entrá con el botón de Google.", codigo: "cuenta_google" });
    }
    // aunque el correo no exista hacemos el mismo trabajo, así no se nota la diferencia
    const ok = await verificarContrasena(password, usuario ? usuario.passwordHash : "00:00");
    if (!usuario || !ok) return res.status(401).json({ error: "Correo o contraseña incorrectos." });

    olvidar(clave);
    res.json({ token: firmarTokenUsuario(usuario), usuario: usuarioPublico(usuario), requiereNombre: !usuario.nombre, yaExistia: true });
  } catch (e) {
    console.error("Error en login con correo:", e.message);
    res.status(e.status === 503 ? 503 : 500).json({ error: e.status === 503 ? e.message : "No se pudo iniciar sesión. Probá de nuevo." });
  }
});

// GET /api/auth/estado → qué está configurado en el servidor (solo sí/no, nunca los valores). Sirve para diagnosticar errores de inicio de sesión.
router.get("/estado", (req, res) => {
  res.json({
    googleClientId: Boolean(process.env.GOOGLE_CLIENT_ID), // aunque falte, el servidor acepta el ID de la web de Mi Zona
    jwtSecret: Boolean(process.env.JWT_SECRET),
    mongodb: Boolean(process.env.MONGODB_URI),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    mercadoPago: Boolean(process.env.MP_ACCESS_TOKEN),
    push: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    integracionAsistente: Boolean(process.env.INTEGRACION_KEY),
  });
});

// POST /api/auth/sesion-cliente   { sesionClienteId }
// Liga el id de cliente de este dispositivo a la cuenta. Si la cuenta ya tenía uno (de otro dispositivo), devuelve ese:
// la web lo adopta, y así el historial y la memoria del asistente la siguen.
router.post("/sesion-cliente", identificar, requiereUsuario, async (req, res) => {
  try {
    const u = req.actor.usuario;
    const propuesto = String(req.body?.sesionClienteId || "");
    if (!u.sesionClienteId && /^[\w-]{10,80}$/.test(propuesto)) {
      u.sesionClienteId = propuesto;
      await u.save();
    }
    res.json({ sesionClienteId: u.sesionClienteId || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo vincular tu historial." });
  }
});

router.get("/me", identificar, requiereUsuario, (req, res) => {
  res.json({ usuario: usuarioPublico(req.actor.usuario) });
});

// PUT /api/auth/clave   { actual, nueva }  → cambiar la contraseña (solo cuentas con correo y contraseña).
// Cierra la sesión en los demás dispositivos y devuelve un token nuevo para este.
router.put("/clave", identificar, requiereUsuario, async (req, res) => {
  try {
    const u = req.actor.usuario;
    if (!permitir(`clave|${ip(req)}|${u._id}`, 8, 15 * 60 * 1000)) return res.status(429).json({ error: "Demasiados intentos. Esperá unos minutos y probá de nuevo." });
    if (!u.passwordHash) return res.status(400).json({ error: "Tu cuenta entra con Google: la contraseña se maneja desde tu cuenta de Google." });
    const actual = String(req.body?.actual || "");
    const nueva = String(req.body?.nueva || "");
    if (!(await verificarContrasena(actual, u.passwordHash))) return res.status(401).json({ error: "La contraseña actual no es correcta." });
    if (nueva.length < 8) return res.status(400).json({ error: "La contraseña nueva tiene que tener al menos 8 caracteres." });
    if (nueva.length > 100) return res.status(400).json({ error: "La contraseña nueva es demasiado larga (máximo 100)." });
    if (nueva === actual) return res.status(400).json({ error: "La contraseña nueva tiene que ser distinta a la actual." });
    u.passwordHash = await hashearContrasena(nueva);
    u.tokenVersion = (u.tokenVersion || 0) + 1;
    await u.save();
    res.json({ token: firmarTokenUsuario(u), ok: true });
  } catch (e) {
    console.error("Error al cambiar la contraseña:", e.message);
    res.status(500).json({ error: "No se pudo cambiar la contraseña. Probá de nuevo." });
  }
});

// POST /api/auth/cerrar-otras-sesiones → cierra la sesión en todos los demás dispositivos (este sigue abierto)
router.post("/cerrar-otras-sesiones", identificar, requiereUsuario, async (req, res) => {
  try {
    const u = req.actor.usuario;
    u.tokenVersion = (u.tokenVersion || 0) + 1;
    await u.save();
    res.json({ token: firmarTokenUsuario(u), ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cerrar las otras sesiones. Probá de nuevo." });
  }
});

// PUT /api/auth/perfil   { nombre }  — el nombre se pide al registrarse y se puede editar en "Mi cuenta"
router.put("/perfil", identificar, requiereUsuario, async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || "").replace(/\s+/g, " ").trim();
    if (nombre.length < 2) return res.status(400).json({ error: "Escribí tu nombre (al menos 2 letras)." });
    if (nombre.length > 60) return res.status(400).json({ error: "El nombre es demasiado largo (máximo 60 letras)." });
    const u = req.actor.usuario;
    u.nombre = nombre;
    await u.save();
    res.json({ usuario: usuarioPublico(u) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar el nombre." });
  }
});

export default router;
