import AgendaItem from "../models/AgendaItem.js";
import { enviarPushAUsuario, pushConfigurado } from "./push.js";
import { momentoDeEvento } from "./fechas.js";

// Un recordatorio está "debido" cuando ya llegó la hora del aviso (momento del evento - minutos de anticipación),
// pero el evento no pasó hace más de 6 horas (no avisamos de cosas viejas).
export function recordatorioDebido(item, ahora = Date.now()) {
  if (!item.fecha || item.recordatorioMinutos === null || item.recordatorioMinutos === undefined) return false;
  const momento = momentoDeEvento(item.fecha, item.hora);
  if (Number.isNaN(momento)) return false;
  return momento - item.recordatorioMinutos * 60000 <= ahora && momento + 6 * 3600000 >= ahora;
}

function textoAviso(item) {
  const cuando = item.hora ? ` a las ${item.hora}` : "";
  return {
    titulo: item.tipo === "tarea" ? "Tarea pendiente" : "Tenés un evento próximo",
    cuerpo: `${item.titulo}${cuando}${item.persona ? ` · ${item.persona}` : ""}`,
    url: "/?ir=agenda",
  };
}

// Manda por push (al celular, aunque la app esté cerrada) los recordatorios que ya llegaron a su hora.
export async function enviarRecordatoriosPush() {
  if (!pushConfigurado()) return { enviados: 0 };
  const candidatos = await AgendaItem.find({
    completada: false, avisoPushEnviado: false, recordatorioMinutos: { $ne: null }, fecha: { $exists: true, $ne: "" },
  }).limit(500);
  const debidos = candidatos.filter((i) => recordatorioDebido(i));
  let enviados = 0;
  for (const item of debidos) {
    const llegaron = await enviarPushAUsuario(item.usuarioId, textoAviso(item), "agenda");
    await AgendaItem.updateOne({ _id: item._id }, { $set: { avisoPushEnviado: true } }); // aunque no tenga push activo, no insistimos
    if (llegaron > 0) enviados++;
  }
  return { revisados: candidatos.length, enviados };
}

// Mientras el servidor esté despierto lo revisa cada minuto. En Render gratis se duerme: para que SIEMPRE avise,
// un cron externo puede llamar a POST /api/agenda/enviar-recordatorios cada pocos minutos (ver LEEME).
export function programarRecordatoriosDeAgenda() {
  setInterval(() => {
    enviarRecordatoriosPush().catch((e) => console.error("Error enviando recordatorios de agenda:", e.message));
  }, 60 * 1000);
}
