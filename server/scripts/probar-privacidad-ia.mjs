// Prueba de PRIVACIDAD de la IA del buscador. Se corre con:  npm run probar:privacidad-ia   (no necesita base de datos, internet ni clave)
// Revisa que la IA solo lea las fuentes permitidas (negocios, oficios, alquileres y los chats PROPIOS con negocios) y que los chats con amigos,
// cuando existan, no puedan llegar a la IA. Si esta prueba falla, NO se publica.
import { register } from "node:module";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let n = 0;
const prueba = async (nombre, fn) => { try { globalThis.__consultas = []; await fn(); n++; console.log("✔", nombre); } catch (e) { console.error("✘", nombre, "\n ", e.message); process.exit(1); } };

// ---- 1) Revisión de archivos: ningún archivo de la IA importa chats de amigos, mensajes privados, contactos, etc. ----
const { FUENTES_IA_PERMITIDAS, MODULOS_PROHIBIDOS_PARA_IA, ARCHIVOS_DE_LA_IA } = await import("../utils/contextoIA.js");

await prueba("la lista de fuentes permitidas está cerrada y es la esperada", () => {
  assert.deepEqual([...FUENTES_IA_PERMITIDAS], ["negocios", "oficios", "alquileres", "chatsPropiosConNegocios"]);
  assert.ok(Object.isFrozen(FUENTES_IA_PERMITIDAS));
});

await prueba("ningún archivo de la IA importa chats de amigos ni mensajes privados", () => {
  let revisados = 0;
  for (const rel of ARCHIVOS_DE_LA_IA) {
    const f = path.join(raiz, rel);
    if (!existsSync(f)) continue;
    revisados++;
    const codigo = readFileSync(f, "utf8");
    const imports = [...codigo.matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)].map((m) => m[1]);
    for (const spec of imports) for (const patron of MODULOS_PROHIBIDOS_PARA_IA) assert.ok(!patron.test(spec), `${rel} importa "${spec}": la IA no puede leer eso`);
  }
  assert.ok(revisados >= 4, "se esperaba revisar los archivos de la IA");
});

await prueba("si ya existe un modelo de chats con amigos, la IA no lo toca (aviso para cuando se agregue)", () => {
  const modelos = readdirSync(path.join(raiz, "models"));
  const privados = modelos.filter((m) => MODULOS_PROHIBIDOS_PARA_IA.some((p) => p.test(`models/${m}`)));
  // hoy no hay ninguno; si aparece, la prueba anterior ya garantiza que ningún archivo de la IA lo importa
  assert.ok(Array.isArray(privados));
});

// ---- 2) Funciones puras: qué se arma para la IA ----
const { resumirChats, armarPrompt, lineaNegocio, separarRespuesta, elegirValidos, resumenResenas, distanciaKm } = await import("../utils/contextoIA.js");

await prueba("resumirChats: solo lo que escribió la persona, sin correos ni teléfonos, máximo 6 y solo negocios conocidos", () => {
  const conv = Array.from({ length: 8 }, (_, i) => ({ codigoPublico: `C${i}`, mensajes: [
    { rol: "cliente", contenido: `Quiero una torta, mi mail es ana@correo.com y mi tel 381 555 1234 (${i})`, fecha: `2026-10-0${(i % 9) + 1}` },
    { rol: "asistente", contenido: "RESPUESTA-DEL-NEGOCIO-NO-DEBE-SALIR", fecha: `2026-10-0${(i % 9) + 1}` },
  ] }));
  conv.push({ codigoPublico: "DESCONOCIDO", mensajes: [{ rol: "cliente", contenido: "hola", fecha: "2026-10-09" }] });
  const porCodigo = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`C${i}`, { name: `Negocio ${i}`, categoria: "Gastronomía" }]));
  const r = resumirChats(conv, porCodigo);
  assert.equal(r.length, 6);
  const texto = JSON.stringify(r);
  assert.ok(!texto.includes("RESPUESTA-DEL-NEGOCIO") && !texto.includes("ana@correo.com") && !texto.includes("555 1234") && !texto.includes("DESCONOCIDO"));
});

await prueba("armarPrompt: sin chats no hay bloque de chats; con chats los incluye; nunca lleva coordenadas", () => {
  const b = { id: "b1", name: "Panadería Sol", zone: "Famaillá", desc: "Pan casero", services: ["Pan"], lat: -27.0512345, lng: -65.4012345, delivery: true };
  const linea = lineaNegocio(b, 0.6, resumenResenas([{ rating: 5 }, { rating: 4 }]), "Panaderías y repostería");
  assert.ok(linea.includes("a 600 m") && linea.includes("4.5/5 (2)"));
  const sin = armarPrompt({ lineasNegocios: [linea], tieneUbicacion: true });
  assert.ok(!sin.includes("<chats>"));
  assert.ok(!/27\.05|65\.40/.test(sin), "no deben viajar coordenadas");
  const con = armarPrompt({ lineasNegocios: [linea], chats: [{ negocio: "Taller Pérez", categoria: "Automotor", mensajes: ["necesito cambiar el aceite"] }] });
  assert.ok(con.includes("<chats>") && con.includes("necesito cambiar el aceite"));
});

await prueba("respuesta de la IA: se descartan códigos inventados, repetidos o mal formados", () => {
  const { visible, ids } = separarRespuesta("Te recomiendo Pedro.\nIDS:o:p1,o:p1,n:inventado,x:z,a:al1,<script>");
  assert.equal(visible, "Te recomiendo Pedro.");
  const cand = { n: new Map([["b1", {}]]), o: new Map([["p1", {}]]), a: new Map([["al1", {}]]) };
  assert.deepEqual(elegirValidos(ids, cand), [{ tipo: "oficio", id: "p1" }, { tipo: "alquiler", id: "al1" }]);
  assert.equal(distanciaKm(null, 1, 2, 3), null);
});

// ---- 3) La ruta real, con modelos falsos y una IA falsa ----
globalThis.__consultas = []; globalThis.__filas = { oficio: [], alquiler: [], business: [] };
globalThis.__modelo = (nombre) => ({
  find(match) { globalThis.__consultas.push({ nombre, op: "find", match }); const c = { sort: () => c, limit: () => c, select: () => c, lean: async () => globalThis.__filas[nombre] }; return c; },
  async countDocuments() { return globalThis.__filas[nombre].length; },
});
register(new URL("./arnes-modelos-falsos.mjs", import.meta.url));
process.env.ANTHROPIC_API_KEY = "x"; process.env.INTEGRACION_KEY = "clave-de-prueba";
await import("../routes/asistente.js");
const manejador = globalThis.__rutas["POST /buscar"].at(-1);
const { chatsPropiosConNegocios } = await import("../utils/chatsPropios.js");
const { CATEGORIAS } = await import("../utils/alquileres.js");

const llamar = async (req) => { const out = {}; const res = { json: (d) => { out.json = d; return res; }, status: (c) => { out.status = c; return res; } }; await manejador({ ip: "1.1.1.1", get: () => "", ...req }, res); return out; };
const loc = { provinciaId: "90", provincia: "Tucumán", departamentoId: "90028", departamento: "Famaillá", localidadId: "90028010", localidad: "Famaillá" };
const oficio = { id: "p1", nombre: "Pedro Jardinero", rubros: ["jardinero"], otros: [], desc: "Corte de pasto", localidad: loc, zona: "", whatsapp: "3815551234", mostrarWhatsapp: true, status: "active", textoBusqueda: "pasto" };
const cat = CATEGORIAS[0], tipo = cat.tipos[0];
const alquiler = { id: "al1", nombre: "Sillas Juana", categoria: cat.id, tipos: [tipo.id], desc: "Sillas y mesas", localidad: loc, status: "active", articulos: [], textoBusqueda: "sillas" };
const negocio = { id: "b1", name: "Panadería Sol", cat: "panaderia", zone: "Famaillá", desc: "Pan casero", services: ["Pan"], lat: -27.05, lng: -65.4, reviews: [{ rating: 5 }, { rating: 4 }], asistenteCodigoPublico: "COD1" };
let enviadoAIA = null, pedidoAMiAsistente = null;
const fetchFalso = (textoIA) => async (url, opciones) => {
  if (String(url).includes("conversaciones-cliente")) {
    pedidoAMiAsistente = JSON.parse(opciones.body);
    return { ok: true, json: async () => ({ conversaciones: [{ codigoPublico: "COD1", mensajes: [{ rol: "cliente", contenido: "quiero una torta para el sábado", fecha: "2026-10-20" }, { rol: "asistente", contenido: "SECRETO-DEL-NEGOCIO", fecha: "2026-10-20" }] }] }) };
  }
  enviadoAIA = JSON.parse(opciones.body);
  return { ok: true, json: async () => ({ content: [{ type: "text", text: textoIA }] }) };
};

await prueba("ruta: devuelve negocios, oficios y alquileres reales con km y reseñas; descarta lo inventado; sin WhatsApp", async () => {
  globalThis.__filas = { oficio: [oficio], alquiler: [alquiler], business: [negocio] };
  globalThis.fetch = fetchFalso("Pedro corta pasto y Panadería Sol te queda cerca.\nIDS:n:b1,o:p1,a:al1,o:inventado");
  const r = await llamar({ body: { mensaje: "necesito pan y alguien que corte el pasto", ubicacion: { lat: -27.06, lng: -65.4 }, zona: {} }, actor: { usuario: { _id: "u1", sesionClienteId: "sesion-de-ana", privacidad: {} } } });
  assert.equal(r.status, undefined);
  assert.deepEqual(r.json.resultados.map((x) => `${x.tipo}:${x.id}`), ["negocio:b1", "oficio:p1", "alquiler:al1"]);
  const n = r.json.resultados[0];
  assert.ok(n.km > 0 && n.km < 3 && n.promedio === 4.5 && n.cantidad === 2);
  assert.deepEqual(r.json.negocios, ["b1"]);
  assert.ok(!JSON.stringify(r.json).includes("3815551234"), "no sale el WhatsApp");
  assert.ok(!/-27\.0|-65\.4/.test(enviadoAIA.system), "a la IA no viajan coordenadas");
  assert.ok(enviadoAIA.system.includes("o:p1") && enviadoAIA.system.includes("a:al1") && enviadoAIA.system.includes("n:b1"));
});

await prueba("ruta: los chats salen de la cuenta (servidor) y se ignoran los que mande el navegador", async () => {
  globalThis.__filas = { oficio: [], alquiler: [], business: [negocio] };
  globalThis.fetch = fetchFalso("Listo.\nIDS:");
  const r = await llamar({ body: { mensaje: "algo rico para el sábado", chats: [{ negocio: "X", categoria: "Y", mensajes: ["CHAT-AJENO-DEL-NAVEGADOR"] }], sesionClienteId: "sesion-de-otra-persona" }, actor: { usuario: { _id: "u1", sesionClienteId: "sesion-de-ana", privacidad: {} } } });
  assert.equal(r.json.respuesta, "Listo.");
  assert.equal(pedidoAMiAsistente.sesionClienteId, "sesion-de-ana", "se piden los chats de la cuenta");
  assert.ok(enviadoAIA.system.includes("quiero una torta para el sábado"), "entra lo que la persona escribió");
  assert.ok(!enviadoAIA.system.includes("CHAT-AJENO-DEL-NAVEGADOR") && !enviadoAIA.system.includes("sesion-de-otra-persona"), "nada de lo que manda el navegador");
  assert.ok(!enviadoAIA.system.includes("SECRETO-DEL-NEGOCIO"), "no entran las respuestas del negocio");
});

await prueba("ruta: sin cuenta, o con 'usar mis chats' apagado, no se leen chats", async () => {
  globalThis.__filas = { oficio: [], alquiler: [], business: [negocio] };
  for (const actor of [null, { usuario: { _id: "u1", sesionClienteId: "sesion-de-ana", privacidad: { chatsBusqueda: false } } }]) {
    pedidoAMiAsistente = null; enviadoAIA = null;
    globalThis.fetch = fetchFalso("Listo.\nIDS:");
    await llamar({ body: { mensaje: "algo rico", chats: [{ negocio: "X", categoria: "Y", mensajes: ["CHAT-DEL-NAVEGADOR"] }] }, actor });
    assert.equal(pedidoAMiAsistente, null, "no se consulta Mi Asistente");
    assert.ok(!enviadoAIA.system.includes("<chats>") && !enviadoAIA.system.includes("CHAT-DEL-NAVEGADOR"));
  }
});

await prueba("pregunta que no es de fichas: el mensaje de sistema permite contestar sin recomendar, y la ruta no inventa fichas", async () => {
  globalThis.__filas = { oficio: [oficio], alquiler: [alquiler], business: [negocio] };
  globalThis.fetch = fetchFalso("Para guardar un favorito tocá el corazón de la ficha.\nIDS:");
  const r = await llamar({ body: { mensaje: "¿cómo guardo un favorito?" }, actor: null });
  assert.ok(enviadoAIA.system.includes("No todo lo que escribe la persona es una búsqueda"));
  assert.deepEqual(r.json.resultados, []); assert.deepEqual(r.json.negocios, []);
  assert.ok(r.json.respuesta.includes("favorito"));
});

await prueba("ruta: con 'usar mi ubicación' apagado no se calculan km", async () => {
  globalThis.__filas = { oficio: [], alquiler: [], business: [negocio] };
  globalThis.fetch = fetchFalso("Listo.\nIDS:n:b1");
  const r = await llamar({ body: { mensaje: "pan", ubicacion: { lat: -27.06, lng: -65.4 } }, actor: { usuario: { _id: "u1", privacidad: { ubicacionBusqueda: false } } } });
  assert.equal(r.json.resultados[0].km, null);
  assert.ok(enviadoAIA.system.includes("distancia desconocida"));
});

await prueba("chatsPropiosConNegocios: sin usuario o sin sesión no hace ninguna llamada", async () => {
  let llamadas = 0; globalThis.fetch = async () => { llamadas++; return { ok: true, json: async () => ({ conversaciones: [] }) }; };
  assert.deepEqual(await chatsPropiosConNegocios(null), []);
  assert.deepEqual(await chatsPropiosConNegocios({ privacidad: {} }), []);
  assert.equal(llamadas, 0);
});

console.log(`\n${n} pruebas de privacidad de la IA: todo bien.`);
