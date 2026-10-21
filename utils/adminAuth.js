// Acceso al panel de moderación (Fase 8): clave del equipo (la misma SOPORTE_ADMIN_KEY del soporte) + código de la app autenticadora (TOTP).
// No hay ninguna función de administración dentro de la app de Mi Zona ni enlazada desde ella: el panel vive en el servidor.
//  · Los intentos fallidos se frenan por IP y en total (vale aunque cambien de IP), y se registran.
//  · Un código de 6 cifras sirve una sola vez (no se puede reutilizar uno ya visto).
//  · Tras ingresar se entrega un permiso que dura 30 minutos y que solo vale para el panel. Cambiar la clave o la clave del TOTP lo invalida.
import jwt from "jsonwebtoken";
import crypto from "crypto";
import AccionModeracion from "../models/AccionModeracion.js";
import { permitir, olvidar } from "./limitador.js";
import { verificarTotp } from "./totp.js";

const AUDIENCIA = "mizona-moderacion";
const VIDA_PERMISO = "30m";
const TRES_ANIOS = 3 * 365 * 86400000;

// La moderación está lista cuando están la clave del equipo, la clave del TOTP y el secreto de firma
export const moderacionLista = () => Boolean(process.env.SOPORTE_ADMIN_KEY && process.env.MODERACION_TOTP_SECRET && process.env.JWT_SECRET);

// Compara sin revelar (por el tiempo de respuesta) cuántas letras coinciden ni el largo
const igual = (a, b) => crypto.timingSafeEqual(crypto.createHash("sha256").update(String(a)).digest(), crypto.createHash("sha256").update(String(b)).digest());

// Secreto propio del panel, derivado: cambiar la clave del equipo o la del TOTP deja sin efecto los permisos ya entregados
const secretoPermiso = () => crypto.createHmac("sha256", process.env.JWT_SECRET).update(`moderacion|${process.env.SOPORTE_ADMIN_KEY}|${process.env.MODERACION_TOTP_SECRET}`).digest("hex");

export async function registrarAccion(req, { accion, objetivo = {}, detalle = "", denunciaIds = [], medidaId = "" }) {
  try {
    await AccionModeracion.create({
      accion, objetivo: { tipo: objetivo.tipo || "", id: String(objetivo.id || ""), usuarioId: String(objetivo.usuarioId || "") },
      detalle: String(detalle || "").slice(0, 600), denunciaIds: denunciaIds.map(String), medidaId: String(medidaId || ""),
      ip: String(req?.ip || "").slice(0, 60), borrarEn: new Date(Date.now() + TRES_ANIOS),
    });
    return true;
  } catch (e) {
    console.error("No se pudo escribir el registro de moderación:", e.message);
    return false;
  }
}

// POST /api/moderacion/admin/login   { clave, codigo }
export async function ingresarAlPanel(req, res) {
  try {
    if (!moderacionLista()) {
      return res.status(503).json({ error: "El panel de moderación todavía no está configurado en el servidor: faltan SOPORTE_ADMIN_KEY, MODERACION_TOTP_SECRET o JWT_SECRET. Mirá el LEEME." });
    }
    const ipClave = `mod-login|ip${req.ip || "?"}`;
    // 5 intentos cada 15 minutos por IP y 30 por hora en total: frena también a quien cambia de IP para probar códigos
    if (!(await permitir(ipClave, 5, 15 * 60 * 1000)) || !(await permitir("mod-login|global", 30, 3600 * 1000))) {
      await registrarAccion(req, { accion: "ingreso_fallido", detalle: "Bloqueado por demasiados intentos" });
      return res.status(429).json({ error: "Demasiados intentos. Esperá un rato antes de probar de nuevo." });
    }
    const clave = String(req.body?.clave ?? ""), codigo = String(req.body?.codigo ?? "");
    const claveOk = clave.length > 0 && clave.length < 500 && igual(clave, process.env.SOPORTE_ADMIN_KEY);
    const paso = verificarTotp(process.env.MODERACION_TOTP_SECRET, codigo); // se evalúan las dos cosas siempre, sin cortar antes
    const falla = async (detalle) => {
      await registrarAccion(req, { accion: "ingreso_fallido", detalle });
      return res.status(401).json({ error: "Los datos no son correctos." }); // no se dice cuál de los dos falló
    };
    if (!claveOk || paso === null) return falla(!claveOk ? "Clave incorrecta" : "Código incorrecto");
    // un código sirve una sola vez: si ese paso ya se usó, se rechaza
    if (!(await permitir(`mod-totp|${paso}`, 1, 150 * 1000))) return falla("Código ya usado");
    const token = jwt.sign({ adm: 1 }, secretoPermiso(), { expiresIn: VIDA_PERMISO, algorithm: "HS256", audience: AUDIENCIA });
    await olvidar(ipClave);
    await registrarAccion(req, { accion: "ingreso" });
    res.json({ token, minutos: 30 });
  } catch (e) {
    console.error("Error al ingresar al panel de moderación:", e);
    res.status(500).json({ error: "No se pudo ingresar. Probá de nuevo." });
  }
}

// Middleware: deja pasar solo con un permiso vigente del panel
export async function adminOk(req, res, next) {
  try {
    if (!moderacionLista()) return res.status(503).json({ error: "El panel de moderación no está configurado." });
    if (!(await permitir(`mod-api|ip${req.ip || "?"}`, 900, 10 * 60 * 1000, { soloMemoria: true }))) return res.status(429).json({ error: "Demasiados pedidos seguidos." });
    const h = req.headers["authorization"] || "";
    if (!h.startsWith("Bearer ")) return res.status(401).json({ error: "Ingresá de nuevo.", codigo: "admin_sesion" });
    try {
      jwt.verify(h.slice(7), secretoPermiso(), { algorithms: ["HS256"], audience: AUDIENCIA });
    } catch {
      return res.status(401).json({ error: "Tu sesión del panel venció. Ingresá de nuevo.", codigo: "admin_sesion" });
    }
    next();
  } catch (e) {
    next(e);
  }
}
