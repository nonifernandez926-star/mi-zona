import express from "express";
import mongoose from "mongoose";
import Usuario from "../models/Usuario.js";
import Business from "../models/Business.js";
import Sesion from "../models/Sesion.js";
import ActividadSeguridad from "../models/ActividadSeguridad.js";
import {
  verificarIdTokenGoogle, verificarAccessTokenGoogle, firmarTokenUsuario,
  identificar, requiereUsuario, sesionClienteDe, limitar,
} from "../utils/auth.js";
import { iniciarSesion, crearSesion, registrarActividad, avisarSeguridad } from "../utils/sesiones.js";
import { hashearContrasena, verificarContrasena } from "../utils/contrasenas.js";
import { permitir, olvidar } from "../utils/limitador.js";
import { validarUsuario, validarContrasena, normalizarUsuario } from "../utils/credenciales.js";

const router = express.Router();

const tieneClave = (u) => !!(u.passwordHash || u.claveZona);
// Con el correo solo vale la contraseña de correo (cuentas viejas creadas con correo); con el usuario, la de Mi Zona. Las cuentas de Google entran con Google o con usuario.
const hashParaEntrar = (u, conCorreo) => (conCorreo ? u.passwordHash : u.claveZona || u.passwordHash);
// Versión anterior: al elegir usuario en una cuenta de Google se guardaba la contraseña en el mismo campo que usa el correo (y Mi Asistente), pisándola.
// Se separa sola la próxima vez que la cuenta entra.
async function separarClaves(u) {
  if (u && u.proveedor === "google" && u.usuario && u.passwordHash && !u.claveZona) {
    u.claveZona = u.passwordHash;
    u.passwordHash = "";
    await u.save();
  }
}
const usuarioPublico = (u) => ({ id: String(u._id), email: u.email, usuario: u.usuario || "", nombre: u.nombre, conClave: !!(u.passwordHash || u.claveZona) });

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
    if (!permitir(`google|${req.ip || "sin-ip"}`, 40, 15 * 60 * 1000)) return res.status(429).json({ error: "Hiciste muchos intentos. Probá de nuevo en un rato." });
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
        // IMPORTANTE: cualquiera pudo haber creado esa cuenta con el correo de otra persona (el correo no se verificaba).
        // Ahora que Google confirma que el correo es de quien entra, se borra la contraseña vieja y se cierran las sesiones
        // anteriores: así quien la creó antes no conserva acceso.
        porCorreo.googleId = googleId;
        porCorreo.proveedor = "google";
        porCorreo.passwordHash = "";
        porCorreo.tokenVersion = (porCorreo.tokenVersion || 0) + 1;
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
      token: await iniciarSesion(req, usuario, { cuentaNueva: !yaExistia }),
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
    // "clave": cuenta creada con correo y contraseña (se pide acá). "google": cuenta de Google (se entra con Google, con su contraseña de correo en la página de Google).
    res.json({ paso: usuario.proveedor === "email" && usuario.passwordHash ? "clave" : "google" });
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
    const usuarioNombre = normalizarUsuario(req.body?.usuario);
    if (!RE_CORREO.test(email) || email.length > 120) return res.status(400).json({ error: "Escribí un correo válido." });
    const errUsuario = validarUsuario(usuarioNombre);
    if (errUsuario) return res.status(400).json({ error: errUsuario, codigo: "usuario_invalido" });
    const errClave = validarContrasena(password, usuarioNombre);
    if (errClave) return res.status(400).json({ error: errClave, codigo: "clave_invalida" });
    if (nombre.length < 2 || nombre.length > 60) return res.status(400).json({ error: "Escribí tu nombre (entre 2 y 60 letras)." });
    if (await Usuario.findOne({ usuario: usuarioNombre })) return res.status(409).json({ error: "Ese usuario ya está ocupado. Elegí otro.", codigo: "usuario_existente" });

    if (await Usuario.findOne({ email })) {
      return res.status(409).json({ error: "Ese correo ya está registrado. Tocá \"Iniciar sesión\".", codigo: "correo_existente" });
    }
    const usuario = await Usuario.create({
      googleId: `email:${email}`, email, usuario: usuarioNombre, nombre, proveedor: "email", passwordHash: await hashearContrasena(password),
    });
    res.status(201).json({ token: await iniciarSesion(req, usuario, { cuentaNueva: true }), usuario: usuarioPublico(usuario), requiereNombre: false, yaExistia: false });
  } catch (e) {
    if (e.code === 11000) {
      const porUsuario = /usuario/.test(String(e.message));
      return res.status(409).json(porUsuario ? { error: "Ese usuario ya está ocupado. Elegí otro.", codigo: "usuario_existente" } : { error: "Ese correo ya está registrado. Tocá \"Iniciar sesión\".", codigo: "correo_existente" });
    }
    console.error("Error en registro con correo:", e.message);
    res.status(e.status === 503 ? 503 : 500).json({ error: e.status === 503 ? e.message : "No se pudo crear la cuenta. Probá de nuevo." });
  }
});

// POST /api/auth/login   { email, password }  → entra con correo y contraseña
router.post("/login", async (req, res) => {
  try {
    // Se puede entrar con el correo o con el usuario (la web manda "identificador"; "email" sigue funcionando).
    const ident = String(req.body?.identificador ?? req.body?.email ?? "").trim().toLowerCase();
    const esCorreo = ident.includes("@");
    const email = esCorreo ? normalizarCorreo(ident) : "";
    const password = String(req.body?.password || "");
    const clave = `login|${ip(req)}|${ident}`;
    // 8 intentos cada 15 minutos por persona y correo: frena a quien prueba contraseñas
    if (!permitir(clave, 8, 15 * 60 * 1000) || !permitir(`login|${ip(req)}`, 40, 15 * 60 * 1000)) {
      return res.status(429).json({ error: "Demasiados intentos. Esperá unos minutos y probá de nuevo." });
    }
    if ((esCorreo ? !RE_CORREO.test(email) : ident.length < 3) || !password) return res.status(400).json({ error: "Escribí tu usuario o correo y tu contraseña." });

    const usuario = await Usuario.findOne(esCorreo ? { email } : { usuario: normalizarUsuario(ident) });
    if (usuario) await separarClaves(usuario);
    if (usuario && (esCorreo ? !usuario.passwordHash : !tieneClave(usuario))) {
      return res.status(400).json({ error: "Esa cuenta entra con Google. Tocá “Acceder con Google”.", codigo: "cuenta_google" });
    }
    // aunque el correo no exista hacemos el mismo trabajo, así no se nota la diferencia
    const ok = await verificarContrasena(password, usuario ? hashParaEntrar(usuario, esCorreo) : "00:00");
    if (!usuario || !ok) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });

    olvidar(clave);
    res.json({ token: await iniciarSesion(req, usuario), usuario: usuarioPublico(usuario), requiereNombre: !usuario.nombre, yaExistia: true });
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
    // Solo se adopta el id del dispositivo si tiene el formato esperado y NO pertenece ya a otra cuenta.
    if (!u.sesionClienteId && /^[\w-]{16,80}$/.test(propuesto) && !(await Usuario.exists({ sesionClienteId: propuesto, _id: { $ne: u._id } }))) {
      u.sesionClienteId = propuesto;
      await u.save();
    }
    res.json({ sesionClienteId: await sesionClienteDe(u) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo vincular tu historial." });
  }
});

// PUT /api/auth/completar   { usuario, password, nombre? }
// Último paso del registro: quien entró con Google elige su usuario y su contraseña (también sirve para cuentas viejas que todavía no los tenían).
// Después puede entrar con usuario y contraseña, o con Google, y cambiar ambos desde Ajustes.
router.put("/completar", identificar, requiereUsuario, async (req, res) => {
  try {
    const u = req.actor.usuario;
    if (!permitir(`completar|${ip(req)}|${u._id}`, 15, 15 * 60 * 1000)) return res.status(429).json({ error: "Demasiados intentos. Esperá unos minutos y probá de nuevo." });
    await separarClaves(u);
    if (u.usuario && tieneClave(u)) return res.status(400).json({ error: "Tu cuenta ya tiene usuario y contraseña. Podés cambiarlos desde Ajustes." });
    const nuevo = normalizarUsuario(req.body?.usuario);
    const password = String(req.body?.password || "");
    const errUsuario = validarUsuario(nuevo);
    if (errUsuario) return res.status(400).json({ error: errUsuario, codigo: "usuario_invalido" });
    // Las cuentas que ya tienen contraseña (registradas con correo) solo eligen usuario: no se les toca la contraseña.
    const pedirClave = !tieneClave(u);
    const errClave = pedirClave ? validarContrasena(password, nuevo) : "";
    if (errClave) return res.status(400).json({ error: errClave, codigo: "clave_invalida" });
    if (await Usuario.findOne({ usuario: nuevo, _id: { $ne: u._id } })) return res.status(409).json({ error: "Ese usuario ya está ocupado. Elegí otro.", codigo: "usuario_existente" });
    if (req.body?.nombre !== undefined) {
      const nombre = String(req.body.nombre || "").replace(/\s+/g, " ").trim();
      if (nombre.length < 2 || nombre.length > 60) return res.status(400).json({ error: "Escribí tu nombre (entre 2 y 60 letras)." });
      u.nombre = nombre;
    }
    u.usuario = nuevo;
    if (!u.nombre) u.nombre = nuevo; // ya no se pide el nombre: alcanza con el usuario
    if (pedirClave) u.claveZona = await hashearContrasena(password);
    await u.save();
    await registrarActividad(u._id, "usuario_creado", req);
    res.json({ usuario: usuarioPublico(u) });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "Ese usuario ya está ocupado. Elegí otro.", codigo: "usuario_existente" });
    console.error("Error al completar la cuenta:", e.message);
    res.status(500).json({ error: "No se pudo guardar. Probá de nuevo." });
  }
});

// GET /api/auth/usuario-disponible?u=nombre  → { valido, disponible, error }  (público, con límite de consultas)
router.get("/usuario-disponible", async (req, res) => {
  try {
    if (!permitir(`disp|${ip(req)}`, 60, 10 * 60 * 1000)) return res.status(429).json({ error: "Muchas consultas seguidas. Esperá un momento." });
    const u = normalizarUsuario(req.query.u);
    const error = validarUsuario(u);
    if (error) return res.json({ valido: false, disponible: false, error });
    const ocupado = await Usuario.exists({ usuario: u });
    res.json({ valido: true, disponible: !ocupado, error: ocupado ? "Ese usuario ya está ocupado." : "" });
  } catch (e) {
    res.status(500).json({ error: "No se pudo revisar el usuario." });
  }
});

router.get("/me", identificar, requiereUsuario, async (req, res) => {
  await separarClaves(req.actor.usuario);
  res.json({ usuario: usuarioPublico(req.actor.usuario) });
});

// Borra todas las sesiones de la cuenta menos la de este dispositivo (si este todavía no tenía una, se la crea). Devuelve su sid.
async function dejarSoloEstaSesion(req, usuario) {
  const sid = req.sid || (await crearSesion(req, usuario));
  await Sesion.deleteMany({ usuarioId: String(usuario._id), sid: { $ne: sid } });
  return sid;
}

// PUT /api/auth/clave   { actual, nueva }  → cambiar la contraseña (solo cuentas con correo y contraseña).
// Cierra la sesión en los demás dispositivos y devuelve un token nuevo para este.
router.put("/clave", identificar, requiereUsuario, async (req, res) => {
  try {
    const u = req.actor.usuario;
    if (!permitir(`clave|${ip(req)}|${u._id}`, 8, 15 * 60 * 1000)) return res.status(429).json({ error: "Demasiados intentos. Esperá unos minutos y probá de nuevo." });
    await separarClaves(u);
    const campo = u.passwordHash ? "passwordHash" : "claveZona"; // cada cuenta cambia la contraseña que realmente usa
    if (!u[campo]) return res.status(400).json({ error: "Tu cuenta entra con Google: todavía no tiene una contraseña de Mi Zona." });
    const actual = String(req.body?.actual || "");
    const nueva = String(req.body?.nueva || "");
    if (!(await verificarContrasena(actual, u[campo]))) return res.status(401).json({ error: "La contraseña actual no es correcta." });
    const errNueva = validarContrasena(nueva, u.usuario);
    if (errNueva) return res.status(400).json({ error: errNueva, codigo: "clave_invalida" });
    if (nueva === actual) return res.status(400).json({ error: "La contraseña nueva tiene que ser distinta a la actual." });
    u[campo] = await hashearContrasena(nueva);
    u.tokenVersion = (u.tokenVersion || 0) + 1;
    await u.save();
    const sid = await dejarSoloEstaSesion(req, u);
    await registrarActividad(u._id, "contrasena_cambiada", req);
    avisarSeguridad(u, "Cambiaste tu contraseña", "Cerramos tu sesión en los demás dispositivos. Si no fuiste vos, avisanos desde Seguridad.");
    res.json({ token: firmarTokenUsuario(u, sid), ok: true });
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
    const sid = await dejarSoloEstaSesion(req, u);
    await registrarActividad(u._id, "sesiones_cerradas", req);
    res.json({ token: firmarTokenUsuario(u, sid), ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cerrar las otras sesiones. Probá de nuevo." });
  }
});

// GET /api/auth/sesiones → dispositivos con sesión abierta. Si este dispositivo tenía una sesión de antes de esta versión, se la registra y se devuelve un token nuevo.
router.get("/sesiones", identificar, requiereUsuario, limitar("sesiones", 60, 10 * 60 * 1000), async (req, res) => {
  try {
    const u = req.actor.usuario;
    let sid = req.sid;
    let token = null;
    if (!sid) { sid = await crearSesion(req, u); token = firmarTokenUsuario(u, sid); }
    const lista = await Sesion.find({ usuarioId: String(u._id) }).sort({ ultimoUso: -1 }).limit(50);
    res.json({
      token,
      sesiones: lista.map((x) => ({ id: String(x._id), dispositivo: x.dispositivo, tipo: x.tipo, creadaEn: x.creadaEn, ultimoUso: x.ultimoUso, actual: x.sid === sid })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar tus dispositivos." });
  }
});

// DELETE /api/auth/sesiones/:id → cierra la sesión de un dispositivo
router.delete("/sesiones/:id", identificar, requiereUsuario, limitar("sesiones", 60, 10 * 60 * 1000), async (req, res) => {
  try {
    const u = req.actor.usuario;
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Dispositivo inválido." });
    const borrada = await Sesion.findOneAndDelete({ _id: req.params.id, usuarioId: String(u._id) });
    if (!borrada) return res.status(404).json({ error: "Ese dispositivo ya no tiene la sesión abierta." });
    await registrarActividad(u._id, "sesion_cerrada", req);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cerrar la sesión de ese dispositivo." });
  }
});

// POST /api/auth/salir → "Cerrar sesión" en este dispositivo: borra su sesión para que deje de figurar como abierta
router.post("/salir", identificar, async (req, res) => {
  try {
    if (req.sid) await Sesion.deleteOne({ sid: req.sid });
  } catch (e) { console.error(e); }
  res.json({ ok: true });
});

// GET /api/auth/actividad → historial de seguridad (últimos 90 días)
router.get("/actividad", identificar, requiereUsuario, limitar("actividad", 60, 10 * 60 * 1000), async (req, res) => {
  try {
    const lista = await ActividadSeguridad.find({ usuarioId: String(req.actor.usuario._id) }).sort({ fecha: -1 }).limit(40);
    res.json({ eventos: lista.map((x) => ({ tipo: x.tipo, dispositivo: x.dispositivo, fecha: x.fecha })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar la actividad." });
  }
});

// GET / PUT /api/auth/alertas → avisos por notificación cuando entran a la cuenta desde un dispositivo nuevo
router.get("/alertas", identificar, requiereUsuario, (req, res) => {
  res.json({ alertasInicio: req.actor.usuario.seguridad?.alertasInicio !== false });
});
router.put("/alertas", identificar, requiereUsuario, limitar("alertas", 30, 10 * 60 * 1000), async (req, res) => {
  try {
    if (typeof req.body?.alertasInicio !== "boolean") return res.status(400).json({ error: "Pedido inválido." });
    const u = req.actor.usuario;
    u.set("seguridad.alertasInicio", req.body.alertasInicio);
    await u.save();
    res.json({ alertasInicio: req.body.alertasInicio });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar el cambio." });
  }
});

// PUT /api/auth/perfil   { nombre }  — el nombre se pide al registrarse y se puede editar en "Mi cuenta"
router.put("/perfil", identificar, requiereUsuario, async (req, res) => {
  try {
    const u = req.actor.usuario;
    const quiereUsuario = req.body?.usuario !== undefined;
    if (req.body?.nombre !== undefined || !quiereUsuario) {
      const nombre = String(req.body?.nombre || "").replace(/\s+/g, " ").trim();
      if (nombre.length < 2) return res.status(400).json({ error: "Escribí tu nombre (al menos 2 letras)." });
      if (nombre.length > 60) return res.status(400).json({ error: "El nombre es demasiado largo (máximo 60 letras)." });
      u.nombre = nombre;
    }
    if (quiereUsuario) {
      const nuevo = normalizarUsuario(req.body.usuario);
      const err = validarUsuario(nuevo);
      if (err) return res.status(400).json({ error: err, codigo: "usuario_invalido" });
      if (nuevo !== u.usuario && (await Usuario.findOne({ usuario: nuevo, _id: { $ne: u._id } }))) return res.status(409).json({ error: "Ese usuario ya está ocupado. Elegí otro.", codigo: "usuario_existente" });
      if (nuevo !== u.usuario) await registrarActividad(u._id, "usuario_cambiado", req);
      u.usuario = nuevo;
    }
    await u.save();
    res.json({ usuario: usuarioPublico(u) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar el nombre." });
  }
});

export default router;
