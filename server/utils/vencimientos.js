import Business from "../models/Business.js";
import { diasHasta } from "./fechas.js";
import { enviarPushAUsuario } from "./push.js";
import { refrescarAsistentes } from "./asistente.js";
import { geocodificarPendientes } from "./geocodificar.js";

// Avisos de suscripción: 7, 3 y 1 día antes de vencer, y cuando venció. Cada aviso se manda UNA sola vez
// (queda anotado en el negocio) y se vuelve a habilitar solo cuando el dueño renueva y cambia la fecha.
const MENSAJES = {
  7: (n, d) => ({ titulo: "Tu suscripción vence pronto", cuerpo: `A "${n}" le quedan ${d} días en Mi Zona. Renová cuando quieras: los meses nuevos se suman.` }),
  3: (n, d) => ({ titulo: "Tu suscripción vence en pocos días", cuerpo: `A "${n}" le quedan ${d} días en Mi Zona. Agregá meses para no perder visibilidad.` }),
  1: (n) => ({ titulo: "Tu suscripción vence mañana", cuerpo: `"${n}" deja de mostrarse en Mi Zona mañana. Renová ahora.` }),
  0: (n) => ({ titulo: "Tu suscripción venció", cuerpo: `"${n}" ya no se muestra en Mi Zona. Renová para volver a aparecer.` }),
};

function umbralPara(dias) {
  if (dias <= 0) return 0;
  if (dias <= 1) return 1;
  if (dias <= 3) return 3;
  if (dias <= 7) return 7;
  return null;
}

export async function revisarVencimientos() {
  const resumen = { revisados: 0, desactivados: 0, avisos: 0 };
  resumen.asistentes = await refrescarAsistentes();
  resumen.mapa = await geocodificarPendientes();
  const negocios = await Business.find({
    ownerId: { $exists: true, $ne: "" },
    expiresAt: { $exists: true, $nin: [null, ""] },
    pendientePago: { $ne: true },
    kind: { $ne: "job" },
  });

  for (const b of negocios) {
    resumen.revisados++;
    const dias = diasHasta(b.expiresAt);
    if (dias === null) continue;
    const cambios = {};

    if (dias < 0 && b.status === "active") {
      cambios.status = "inactive"; // vencido: deja de mostrarse al público
      resumen.desactivados++;
    }

    const umbral = umbralPara(dias);
    const yaAvisado = b.suscripcion?.ultimoAvisoUmbral === umbral && b.suscripcion?.ultimoAvisoVencimiento === b.expiresAt;
    if (umbral !== null && !yaAvisado) {
      const msg = MENSAJES[umbral](b.name, Math.max(dias, 0));
      await enviarPushAUsuario(b.ownerId, { ...msg, url: "/?tab=herramientas" });
      cambios["suscripcion.ultimoAvisoUmbral"] = umbral;
      cambios["suscripcion.ultimoAvisoVencimiento"] = b.expiresAt;
      resumen.avisos++;
    }

    if (Object.keys(cambios).length) await Business.updateOne({ _id: b._id }, { $set: cambios });
  }
  return resumen;
}

// Corre solo mientras el servidor esté despierto. En el plan gratis de Render el servidor se duerme, así que
// además se puede llamar desde afuera (ver POST /api/suscripcion/revisar-vencimientos y el LEEME).
export function programarRevisionDeVencimientos() {
  const correr = () => revisarVencimientos().catch((e) => console.error("Error revisando vencimientos:", e.message));
  setTimeout(correr, 60 * 1000);
  setInterval(correr, 6 * 60 * 60 * 1000);
}
