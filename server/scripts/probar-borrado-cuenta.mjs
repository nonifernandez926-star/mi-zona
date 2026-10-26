// Prueba el borrado de datos externos al eliminar una cuenta (fotos en Cloudinary y chats en Mi Asistente), sin base de datos ni internet.
// Se corre con:  npm run probar:borrado-cuenta
import { register } from "node:module";
import assert from "node:assert/strict";
const filas = { business: [], oficio: [], alquiler: [], publicacion: [], pendiente: [] };
globalThis.__modelo = (nombre) => ({
  find() { const c = { select: () => c, lean: async () => filas[nombre], sort: () => c, limit: () => c, then: (ok) => ok(filas[nombre]) }; return c; },
  async create(d) { filas[nombre].push({ ...d, save: async () => {} }); return d; },
  async deleteOne() {},
});
register(new URL("./arnes-modelos-falsos.mjs", import.meta.url));
process.env.INTEGRACION_KEY = "k"; process.env.CLOUDINARY_API_KEY = "kk"; process.env.CLOUDINARY_API_SECRET = "ss";
const { publicIdDe } = await import("../utils/cloudinary.js");
const { fotosDeLaCuenta, borrarDatosExternos } = await import("../utils/borradoDatos.js");
let n = 0; const prueba = async (t, f) => { try { filas.pendiente.length = 0; await f(); n++; console.log("✔", t); } catch (e) { console.error("✘", t, "\n ", e.message); process.exit(1); } };
const C = "https://res.cloudinary.com/hiyaxxdk/image/upload";

await prueba("publicIdDe: saca el id con y sin versión y transformaciones; rechaza fotos de otra nube", () => {
  assert.equal(publicIdDe(`${C}/v1700000000/mi-zona/abc123.jpg`), "mi-zona/abc123");
  assert.equal(publicIdDe(`${C}/c_fill,w_200/v17/foto.webp`), "foto");
  assert.equal(publicIdDe(`${C}/carpeta/foto.png`), "carpeta/foto");
  assert.equal(publicIdDe("https://res.cloudinary.com/otra/image/upload/v1/x.jpg"), null);
  assert.equal(publicIdDe("https://ejemplo.com/x.jpg"), null);
  assert.equal(publicIdDe(`${C}/v1/../secreto.jpg`), null);
});

await prueba("fotosDeLaCuenta: junta fotos de perfil, negocios, oficios, alquileres y Comunidad, sin repetidas ni ajenas", async () => {
  Object.assign(filas, {
    business: [{ logo: `${C}/v1/a.jpg`, portada: `${C}/v1/b.jpg`, photos: [`${C}/v1/c.jpg`, "https://otro.com/z.jpg"], historias: [{ url: `${C}/v1/h.jpg` }] }],
    oficio: [{ logo: `${C}/v1/a.jpg`, fotos: [`${C}/v1/o.jpg`] }], alquiler: [{ fotos: [`${C}/v1/al.jpg`], articulos: [{ foto: `${C}/v1/art.jpg` }] }], publicacion: [{ fotos: [`${C}/v1/p.jpg`] }],
  });
  const r = await fotosDeLaCuenta("u1", { foto: `${C}/v1/perfil.jpg` });
  assert.deepEqual(r.map(publicIdDe).sort(), ["a", "al", "art", "b", "c", "h", "o", "p", "perfil"]);
});

await prueba("todo sale bien: se pide borrar el cliente y las fotos, y no queda pendiente", async () => {
  const llamadas = [];
  globalThis.fetch = async (url, o) => { llamadas.push({ url: String(url), o }); return { ok: true, status: 200 }; };
  const r = await borrarDatosExternos({ sesionClienteId: "sesion-" + "a".repeat(32), urls: [`${C}/v1/x.jpg`, `${C}/v1/y.jpg`] });
  assert.equal(r.pendiente, false); assert.equal(filas.pendiente.length, 0);
  const asist = llamadas.find((l) => l.url.includes("/integracion/borrar-cliente")); assert.ok(asist);
  assert.equal(asist.o.headers["x-integracion-key"], "k"); assert.equal(JSON.parse(asist.o.body).sesionClienteId, "sesion-" + "a".repeat(32));
  const cloud = llamadas.find((l) => l.url.includes("api.cloudinary.com")); assert.ok(cloud);
  assert.equal(cloud.o.method, "DELETE"); assert.ok(cloud.url.includes("public_ids[]=x") && cloud.url.includes("public_ids[]=y"));
  assert.ok(cloud.o.headers.Authorization.startsWith("Basic "));
});

await prueba("si Mi Asistente no responde: la cuenta no se traba, queda un pendiente solo con el id anónimo (las fotos ya se borraron)", async () => {
  globalThis.fetch = async (url) => (String(url).includes("borrar-cliente") ? (() => { throw new Error("dormido"); })() : { ok: true, status: 200 });
  const r = await borrarDatosExternos({ sesionClienteId: "sesion-" + "b".repeat(32), urls: [`${C}/v1/x.jpg`] });
  assert.equal(r.pendiente, true); assert.equal(r.fotosOk, true);
  assert.equal(filas.pendiente.length, 1); assert.equal(filas.pendiente[0].sesionClienteId, "sesion-" + "b".repeat(32)); assert.deepEqual(filas.pendiente[0].urls, []);
});

await prueba("si Cloudinary falla o no está configurado: las fotos quedan pendientes", async () => {
  globalThis.fetch = async (url) => ({ ok: !String(url).includes("cloudinary"), status: 500 });
  const r = await borrarDatosExternos({ sesionClienteId: "", urls: [`${C}/v1/x.jpg`] });
  assert.equal(r.pendiente, true); assert.deepEqual(filas.pendiente[0].urls, [`${C}/v1/x.jpg`]);
});

await prueba("sin nada que borrar no se llama a nadie", async () => {
  let llamadas = 0; globalThis.fetch = async () => { llamadas++; return { ok: true }; };
  const r = await borrarDatosExternos({ sesionClienteId: "", urls: ["https://otro.com/z.jpg"] });
  assert.equal(r.pendiente, false); assert.equal(llamadas, 0);
});
console.log(`\n${n} pruebas del borrado de cuenta: todo bien.`);
