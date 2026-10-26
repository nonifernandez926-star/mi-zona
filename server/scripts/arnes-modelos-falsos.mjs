// Ayuda de probar-ruta-busqueda-ia.mjs: reemplaza Express, MongoDB y el login por piezas falsas para correr la ruta SIN base de datos.
const stubs = {
  "express": `export default { Router: () => { const r = { use() {}, get(p, ...h) { (globalThis.__rutas ||= {})["GET " + p] = h; }, post(p, ...h) { (globalThis.__rutas ||= {})["POST " + p] = h; } }; return r; } };`,
  "models/Oficio.js": `export default globalThis.__modelo("oficio");`,
  "models/Alquiler.js": `export default globalThis.__modelo("alquiler");`,
  "models/Business.js": `export default globalThis.__modelo("business");`,
  "models/Usuario.js": `export default globalThis.__modelo("usuario");`,
  "models/Publicacion.js": `export default globalThis.__modelo("publicacion");`,
  "models/BorradoPendiente.js": `export default globalThis.__modelo("pendiente");`,
  "utils/auth.js": `export const identificar = () => {}; export const limitar = () => () => {}; export const requiereUsuario = () => {}; export const sesionClienteDe = async () => "sesion-falsa";`,
  "utils/exclusiones.js": `export const ownersExcluidos = async () => ["dueno-bloqueado"]; export const ownerExcluido = async () => false;`,
  "utils/limitador.js": `export const permitir = async () => true;`,
};
export async function resolve(spec, ctx, next) {
  for (const k of Object.keys(stubs)) if (spec === k || spec.endsWith("/" + k)) return { url: "stub:" + k, shortCircuit: true };
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (url.startsWith("stub:")) return { format: "module", source: stubs[url.slice(5)], shortCircuit: true };
  return next(url, ctx);
}
