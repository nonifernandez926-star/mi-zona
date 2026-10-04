import express from "express";
import Usuario from "../models/Usuario.js";
import Business from "../models/Business.js";
import {
  verificarIdTokenGoogle, firmarTokenUsuario,
  identificar, requiereUsuario,
} from "../utils/auth.js";

const router = express.Router();

const usuarioPublico = (u) => ({ id: String(u._id), email: u.email, nombre: u.nombre });

// Une a la cuenta los negocios que tengan su email como dueño (negocios cargados antes de que existiera el login).
async function vincularNegociosPorEmail(usuario) {
  await Business.updateMany(
    { ownerEmail: usuario.email, $or: [{ ownerId: { $exists: false } }, { ownerId: "" }, { ownerId: null }] },
    { $set: { ownerId: String(usuario._id) } }
  );
}

// POST /api/auth/google   { idToken }
// Verifica el token que entrega Google en el navegador, crea la cuenta si es la primera vez y devuelve la sesión.
// Si todavía no tiene nombre, la web se lo pide (requiereNombre) y lo guarda con PUT /api/auth/perfil.
//   modo "registro": crea la cuenta (si ya existía, simplemente inicia sesión y avisa con yaExistia)
//   modo "login":    solo entra si la cuenta ya está registrada; si no, responde cuenta_inexistente
router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const modo = req.body?.modo === "login" ? "login" : "registro";
    if (!idToken) return res.status(400).json({ error: "Falta el token de Google" });

    const { googleId, email, nombreGoogle } = await verificarIdTokenGoogle(idToken);

    let usuario = await Usuario.findOne({ googleId });
    const yaExistia = !!usuario;
    if (!usuario && modo === "login") {
      return res.status(404).json({ error: "cuenta_inexistente", mensaje: "Todavía no te registraste con esta cuenta de Google. Tocá \"Registrarme\" para crear tu cuenta." });
    }
    if (!usuario) usuario = await Usuario.create({ googleId, email, nombre: "" });
    else if (usuario.email !== email) { usuario.email = email; await usuario.save(); }

    await vincularNegociosPorEmail(usuario);

    res.json({
      token: firmarTokenUsuario(String(usuario._id)),
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

// GET /api/auth/estado → qué está configurado en el servidor (solo sí/no, nunca los valores). Sirve para diagnosticar errores de inicio de sesión.
router.get("/estado", (req, res) => {
  res.json({
    googleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
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
