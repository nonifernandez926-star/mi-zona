// Quién NO se ve (Fase 8): las cuentas suspendidas por el equipo y, para quien está con sesión, las personas que bloqueó o que lo bloquearon.
// Se usa en cada listado, ficha, búsqueda y contacto públicos. El servidor lo decide: no depende de lo que muestre la web.
import Usuario from "../models/Usuario.js";
import Bloqueo from "../models/Bloqueo.js";
import { filtroSuspendidos } from "./moderacion.js";
export { ocultaInfo } from "./moderacion.js";

// Las cuentas suspendidas son pocas y casi no cambian: se recuerdan 30 segundos para no consultar en cada pedido.
const CACHE_MS = 30 * 1000;
let cache = { t: 0, ids: [] };

export async function idsSuspendidos() {
  if (Date.now() - cache.t < CACHE_MS) return cache.ids;
  const filas = await Usuario.find(filtroSuspendidos(new Date())).select("_id").lean();
  cache = { t: Date.now(), ids: filas.map((f) => String(f._id)) };
  return cache.ids;
}
export const olvidarSuspendidos = () => { cache.t = 0; }; // se llama al suspender o levantar, para que el cambio se note enseguida

// Ids (texto) de las cuentas cuyo contenido no tiene que ver esta persona: suspendidas + bloqueos en cualquiera de los dos sentidos
export async function ownersExcluidos(req) {
  const base = await idsSuspendidos();
  const u = req?.actor?.usuario;
  if (!u) return base;
  const yo = String(u._id);
  const rel = await Bloqueo.find({ $or: [{ bloqueadorId: yo }, { bloqueadoId: yo }] }).select("bloqueadorId bloqueadoId").lean();
  if (!rel.length) return base;
  const todos = new Set(base);
  for (const r of rel) todos.add(r.bloqueadorId === yo ? r.bloqueadoId : r.bloqueadorId);
  return [...todos];
}

// ¿El dueño de esta ficha está oculto para quien hace el pedido?
export async function ownerExcluido(req, ownerId) {
  if (!ownerId) return false;
  const lista = await ownersExcluidos(req);
  return lista.includes(String(ownerId));
}

