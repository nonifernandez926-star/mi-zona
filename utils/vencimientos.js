import Business from "../models/Business.js";
import Oficio from "../models/Oficio.js";
import Alquiler from "../models/Alquiler.js";
import { diasHasta } from "./fechas.js";
import { enviarPushAUsuario } from "./push.js";
import { refrescarAsistentes } from "./asistente.js";
import { geocodificarPendientes } from "./geocodificar.js";
import { acreditarInvitaciones } from "./invitaciones.js";
import { nombreDeFicha } from "./fichas.js";

// Avisos de vencimiento: 7, 2 y 1 día antes de vencer, y cuando venció. Cada aviso se manda UNA sola vez
// (queda anotado en la ficha) y se vuelve a habilitar solo cuando se renueva y cambia la fecha.
// Al vencer, la ficha se OCULTA (no se borra) y vuelve a mostrarse sola al renovar.
const MENSAJES = {
  7: (n, d) => ({ titulo: "Tu plan vence pronto", cuerpo: `A "${n}" le quedan ${d} días en Mi Zona. Renová cuando quieras: los meses nuevos se suman.` }),
  2: (n, d) => ({ titulo: "Tu plan vence en pocos días", cuerpo: `A "${n}" le quedan ${d} días en Mi Zona. Renová para no perder visibilidad.` }),
  1: (n) => ({ titulo: "Tu plan vence mañana", cuerpo: `"${n}" deja de mostrarse en Mi Zona mañana. Renová ahora.` }),
  0: (n) => ({ titulo: "Tu plan venció", cuerpo: `"${n}" ya no se muestra en Mi Zona, pero no se borró. Renová para volver a aparecer.` }),
};

function umbralPara(dias) {
  if (dias <= 0) return 0;
  if (dias <= 1) return 1;
  if (dias <= 2) return 2;
  if (dias <= 7) return 7;
  return null;
}

const FUENTES = [
  { tipo: "negocio", Modelo: Business, filtro: { kind: { $ne: "job" } } },
  { tipo: "oficio", Modelo: Oficio, filtro: {} },
  { tipo: "alquiler", Modelo: Alquiler, filtro: {} },
];

export async function revisarVencimientos() {
  const resumen = { revisados: 0, desactivados: 0, avisos: 0 };
  resumen.asistentes = await refrescarAsistentes();
  resumen.mapa = await geocodificarPendientes();
  resumen.invitaciones = await acreditarInvitaciones();

  for (const { tipo, Modelo, filtro } of FUENTES) {
    const fichas = await Modelo.find({
      ownerId: { $exists: true, $ne: "" },
      expiresAt: { $exists: true, $nin: [null, ""] },
      pendientePago: { $ne: true },
      ...filtro,
    });
    for (const f of fichas) {
      resumen.revisados++;
      const dias = diasHasta(f.expiresAt);
      if (dias === null) continue;
      const cambios = {};

      // Solo los negocios tienen un "estado" guardado; en oficios y alquileres el vencimiento se calcula con la fecha (ver estadoOficio)
      if (tipo === "negocio" && dias < 0 && f.status === "active") {
        cambios.status = "inactive"; // vencido: deja de mostrarse al público
        resumen.desactivados++;
      }

      const umbral = umbralPara(dias);
      const yaAvisado = f.suscripcion?.ultimoAvisoUmbral === umbral && f.suscripcion?.ultimoAvisoVencimiento === f.expiresAt;
      if (umbral !== null && !yaAvisado) {
        const msg = MENSAJES[umbral](nombreDeFicha(tipo, f), Math.max(dias, 0));
        await enviarPushAUsuario(f.ownerId, { ...msg, url: "/?tab=herramientas" }, "suscripcion");
        cambios["suscripcion.ultimoAvisoUmbral"] = umbral;
        cambios["suscripcion.ultimoAvisoVencimiento"] = f.expiresAt;
        resumen.avisos++;
      }

      if (Object.keys(cambios).length) await Modelo.updateOne({ _id: f._id }, { $set: cambios });
    }
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
