import webpush from "web-push";
import PushSuscripcion from "../models/PushSuscripcion.js";
import Usuario from "../models/Usuario.js";

// Todo el "protocolo" del push (firmar con la clave VAPID, cifrar el mensaje) lo resuelve la librería web-push.
// Las claves se generan UNA sola vez con:  npx web-push generate-vapid-keys
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

export function pushConfigurado() {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}
export const clavePublicaVapid = VAPID_PUBLIC_KEY;

if (pushConfigurado()) {
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:soporte@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Manda un push a todos los dispositivos de un usuario. Borra los que ya no existen (navegador desinstalado, etc.).
// Devuelve la cantidad de dispositivos a los que llegó.
// "categoria" (agenda | suscripcion | soporte): si la persona apagó ese tipo de aviso en Ajustes → Notificaciones, no se envía.
export async function enviarPushAUsuario(usuarioId, datos, categoria) {
  if (!pushConfigurado()) return 0;
  if (categoria) {
    const u = await Usuario.findById(usuarioId).select("notificaciones").lean().catch(() => null);
    if (u?.notificaciones?.[categoria] === false) return 0;
  }
  const subs = await PushSuscripcion.find({ usuarioId: String(usuarioId) });
  let enviados = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(s.subscription, JSON.stringify(datos));
      enviados++;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) await PushSuscripcion.deleteOne({ _id: s._id });
      else console.error("Error enviando push:", error.statusCode, error.body);
    }
  }
  return enviados;
}
