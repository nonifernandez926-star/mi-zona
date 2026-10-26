// ÚNICO lugar por donde la IA del buscador puede leer chats: los mensajes que ESTA cuenta le escribió a asistentes de negocios (Mi Asistente).
//
// - El id de cliente sale de la CUENTA que hace el pedido (req.actor.usuario), nunca del navegador: nadie puede pedir los chats de otra persona.
// - Sin cuenta no hay chats (no hay forma segura de saber de quién son).
// - Si la persona apagó "usar mis chats" en Privacidad, no se lee nada.
// - Los chats con amigos (futuro) NO se leen acá ni en ningún archivo de la IA. Ver utils/contextoIA.js.
import Business from "../models/Business.js";
import { resumirChats } from "./contextoIA.js";
import { ETIQUETA_CATEGORIA_NEGOCIO } from "./busquedaIA.js";

const MI_ASISTENTE_URL = process.env.MI_ASISTENTE_API_URL || "https://empleado-virtual-ia.onrender.com/api";

export async function chatsPropiosConNegocios(usuario) {
  try {
    if (!usuario || usuario.privacidad?.chatsBusqueda === false) return [];
    if (!usuario.sesionClienteId || !process.env.INTEGRACION_KEY) return [];
    const control = new AbortController();
    const timer = setTimeout(() => control.abort(), 8000); // si Mi Asistente está dormido, la búsqueda sigue sin chats
    let datos;
    try {
      const r = await fetch(`${MI_ASISTENTE_URL}/integracion/conversaciones-cliente`, {
        method: "POST",
        signal: control.signal,
        headers: { "Content-Type": "application/json", "x-integracion-key": process.env.INTEGRACION_KEY },
        body: JSON.stringify({ sesionClienteId: usuario.sesionClienteId }),
      });
      if (!r.ok) return [];
      datos = await r.json();
    } finally { clearTimeout(timer); }
    const conversaciones = Array.isArray(datos?.conversaciones) ? datos.conversaciones : [];
    const codigos = [...new Set(conversaciones.map((c) => c?.codigoPublico).filter((c) => typeof c === "string" && c))].slice(0, 40);
    if (!codigos.length) return [];
    const negocios = await Business.find({ asistenteCodigoPublico: { $in: codigos } }).select("name cat asistenteCodigoPublico").lean();
    const porCodigo = {};
    for (const b of negocios) porCodigo[b.asistenteCodigoPublico] = { name: b.name, categoria: ETIQUETA_CATEGORIA_NEGOCIO[b.cat] || b.cat };
    return resumirChats(conversaciones, porCodigo);
  } catch {
    return []; // cualquier falla: se busca sin chats
  }
}
