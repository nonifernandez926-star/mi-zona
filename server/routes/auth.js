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
router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ error: "Falta el token de Google" });

    const { googleId, email, nombreGoogle } = await verificarIdTokenGoogle(idToken);

    let usuario = await Usuario.findOne({ googleId });
    if (!usuario) usuario = await Usuario.create({ googleId, email, nombre: "" });
    else if (usuario.email !== email) { usuario.email = email; await usuario.save(); }

    await vincularNegociosPorEmail(usuario);

    res.json({
      token: firmarTokenUsuario(String(usuario._id)),
      usuario: usuarioPublico(usuario),
      nombreGoogle, // solo como sugerencia para el campo de nombre
      requiereNombre: !usuario.nombre,
    });
  } catch (e) {
    console.error("Error en login con Google:", e.message);
    if (e.status === 503) return res.status(503).json({ error: e.message });
    res.status(401).json({ error: "No se pudo verificar la cuenta de Google" });
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
