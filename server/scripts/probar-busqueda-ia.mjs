// Pruebas de la búsqueda con IA (Fase 10) que NO necesitan internet, base de datos ni clave de Anthropic:
// la llamada a la IA se reemplaza por una respuesta falsa. Se corre con:  npm run probar:busqueda-ia
import assert from "node:assert/strict";
import {
  sanearConsulta, pareceLenguajeNatural, validarInterpretacion, extraerJSON, interpretarBusqueda, vaciarCache,
  regexSinTildes, puntuar, etiquetasDe, palabrasClave, INSTRUCCIONES,
} from "../utils/busquedaIA.js";
import { RUBROS } from "../utils/rubros.js";

let ok = 0;
const prueba = async (nombre, fn) => { try { await fn(); ok++; console.log("✔", nombre); } catch (e) { console.error("✘", nombre, "\n   ", e.message); process.exitCode = 1; } };

await prueba("el texto enviado a la IA no lleva correos, teléfonos ni enlaces", () => {
  const t = sanearConsulta("necesito un plomero, escribime a juan@correo.com o al 381 555-1234 o en https://x.com/y <script>");
  assert.ok(!t.includes("@") && !/\d{3}/.test(t) && !t.includes("http") && !t.includes("<"), t);
  assert.ok(t.includes("plomero"));
  assert.ok(sanearConsulta("a".repeat(500)).length <= 200);
});

await prueba("reconoce frases en lenguaje natural y no palabras sueltas", () => {
  assert.equal(pareceLenguajeNatural("electricista"), false);
  assert.equal(pareceLenguajeNatural("alquiler de sillas"), false);
  assert.equal(pareceLenguajeNatural("necesito alguien que me corte el pasto"), true);
  assert.equal(pareceLenguajeNatural("¿quién alquila sillas para cumpleaños?"), true);
  assert.equal(pareceLenguajeNatural("busco plomero"), true);
});

await prueba("la validación descarta ids inventados y limita las listas", () => {
  const v = validarInterpretacion({
    tipo: "hackeo", rubros: ["jardinero", "inventado", "plomero", "electricista", "albanil"], tiposAlquiler: ["sillas_mesas", "x"],
    categoriasAlquiler: ["eventos", "nada"], categoriasNegocio: ["panaderia", "../../etc"], palabras: ["Pasto", "necesito", "ab", "césped!!", "x".repeat(40)],
    localidad: "Famaillá<script>", pregunta: "",
  });
  assert.equal(v.tipo, "todo");
  assert.deepEqual(v.rubros, ["jardinero", "plomero", "electricista"]);
  assert.deepEqual(v.tiposAlquiler, ["sillas_mesas"]);
  assert.deepEqual(v.categoriasAlquiler, ["eventos"]);
  assert.deepEqual(v.categoriasNegocio, ["panaderia"]);
  assert.deepEqual(v.palabras, ["pasto", "cesped"]);
  assert.equal(v.localidad, "famaillascript");
  assert.ok(!v.localidadTexto.includes("<"));
  assert.equal(v.hayFiltros, true);
});

await prueba("una respuesta rara de la IA (texto, null, lista) no rompe nada", () => {
  for (const x of [null, undefined, "hola", 5, [], { rubros: "plomero", palabras: 7 }]) {
    const v = validarInterpretacion(x);
    assert.equal(v.hayFiltros, false); assert.deepEqual(v.rubros, []); assert.equal(v.tipo, "todo");
  }
});

await prueba("la pregunta solo se conserva si no hay filtros, y se limpia", () => {
  const sola = validarInterpretacion({ pregunta: "¿Qué necesitás en tu casa? https://malo.com <b>x</b>" });
  assert.ok(sola.pregunta && !sola.pregunta.includes("http") && !sola.pregunta.includes("<"));
  const conFiltros = validarInterpretacion({ rubros: ["plomero"], pregunta: "¿Dónde?" });
  assert.equal(conFiltros.pregunta, "");
  assert.equal(validarInterpretacion({ pregunta: "12345" }).pregunta, "");
});

await prueba("extrae el JSON aunque venga con comillas de código o texto alrededor", () => {
  assert.deepEqual(extraerJSON('```json\n{"tipo":"oficios"}\n```'), { tipo: "oficios" });
  assert.deepEqual(extraerJSON('Claro: {"a":1} listo'), { a: 1 });
  assert.equal(extraerJSON("sin json"), null);
  assert.equal(extraerJSON("{roto"), null);
});

await prueba("las etiquetas salen de las listas y no del texto de la IA", () => {
  const e = etiquetasDe(validarInterpretacion({ rubros: ["jardinero"], tiposAlquiler: ["sillas_mesas"], categoriasNegocio: ["panaderia"] }));
  assert.deepEqual(e, ["Jardinero", "Sillas y mesas", "Panaderías y repostería"]);
});

await prueba("las instrucciones incluyen todos los rubros y la defensa contra órdenes escondidas", () => {
  for (const r of RUBROS) assert.ok(INSTRUCCIONES.includes(`${r.id}:`), r.id);
  assert.ok(INSTRUCCIONES.includes("ignorá lo anterior") && INSTRUCCIONES.includes("NO inventás"));
});

await prueba("la expresión sin tildes encuentra «panadería» y «cañería»", () => {
  assert.ok(new RegExp(regexSinTildes("panaderia"), "i").test("La Panadería de Juan"));
  assert.ok(new RegExp(regexSinTildes("caneria"), "i").test("Arreglo de cañerías"));
  assert.ok(!new RegExp(regexSinTildes("pasto"), "i").test("plomero"));
  assert.ok(new RegExp(regexSinTildes("a.b"), "i").test("a.b") && !new RegExp(regexSinTildes("a.b"), "i").test("axb"));
});

await prueba("puntaje: primero lo exacto, después más palabras; palabras en singular", () => {
  assert.deepEqual(palabrasClave({ palabras: ["sillas", "mesa"] }), ["silla", "mesa"]);
  const exacto = puntuar({ texto: "Jardinero", coincideExacto: true }, ["pasto"]);
  const soloPalabra = puntuar({ texto: "arreglo de pasto y jardin", coincideExacto: false }, ["pasto", "jardin"]);
  assert.ok(exacto > 0 && soloPalabra === 2);
  assert.ok(puntuar({ texto: "x", coincideExacto: true }, []) > puntuar({ texto: "x" }, []));
});

// ---- llamada a la IA (falsa) ----
const fetchOriginal = globalThis.fetch;
const rta = (obj, status = 200) => ({ ok: status === 200, status, json: async () => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj) }] }) });
const permitirTodo = async () => true;
process.env.ANTHROPIC_API_KEY = "clave-de-prueba";

await prueba("sin clave de Anthropic no llama a nadie y avisa el motivo", async () => {
  const guardada = process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_API_KEY; vaciarCache();
  globalThis.fetch = async () => { throw new Error("no debería llamar"); };
  assert.deepEqual(await interpretarBusqueda("necesito un plomero", { permitir: permitirTodo }), { ok: false, motivo: "no_configurada" });
  process.env.ANTHROPIC_API_KEY = guardada;
});

await prueba("interpreta, envía SOLO el texto saneado, y la segunda vez sale de la caché", async () => {
  vaciarCache(); let llamadas = 0, cuerpo = null;
  globalThis.fetch = async (url, op) => { llamadas++; cuerpo = JSON.parse(op.body); return rta('{"tipo":"oficios","rubros":["jardinero"],"palabras":["pasto"],"localidad":"Famaillá"}'); };
  const r1 = await interpretarBusqueda("Necesito alguien que me corte el pasto, soy Juan 3815551234 juan@mail.com", { quien: "u1", permitir: permitirTodo });
  assert.equal(r1.ok, true); assert.equal(r1.cache, false);
  assert.deepEqual(r1.interpretacion.rubros, ["jardinero"]);
  const enviado = JSON.stringify(cuerpo);
  assert.ok(!enviado.includes("juan@mail.com") && !enviado.includes("3815551234"), "no debe viajar ningún dato personal");
  assert.equal(cuerpo.messages.length, 1); assert.equal(cuerpo.messages[0].role, "user");
  assert.ok(cuerpo.system[0].text.includes("jardinero"));
  const r2 = await interpretarBusqueda("necesito ALGUIEN que me corte el pasto, soy juan", { quien: "u2", permitir: permitirTodo });
  assert.equal(r2.cache, true); assert.equal(llamadas, 1);
});

await prueba("dos pedidos iguales a la vez comparten una sola llamada", async () => {
  vaciarCache(); let llamadas = 0;
  globalThis.fetch = async () => { llamadas++; await new Promise((r) => setTimeout(r, 20)); return rta({ rubros: ["plomero"] }); };
  const [a, b] = await Promise.all([interpretarBusqueda("plomero urgente", { permitir: permitirTodo }), interpretarBusqueda("plomero urgente", { permitir: permitirTodo })]);
  assert.equal(a.ok && b.ok, true); assert.equal(llamadas, 1);
});

await prueba("si la IA falla (error, mala respuesta o se cae) devuelve ok:false y no guarda nada en caché", async () => {
  for (const f of [async () => rta({}, 500), async () => rta("no es json"), async () => { throw new Error("sin red"); }]) {
    vaciarCache(); globalThis.fetch = f;
    assert.deepEqual(await interpretarBusqueda("quiero una pileta", { permitir: permitirTodo }), { ok: false, motivo: "error" });
  }
  let llamadas = 0; globalThis.fetch = async () => { llamadas++; return rta({ rubros: ["plomero"] }); };
  assert.equal((await interpretarBusqueda("quiero una pileta", { permitir: permitirTodo })).ok, true); assert.equal(llamadas, 1);
});

await prueba("los topes por persona y globales frenan ANTES de llamar a la IA, y la caché no los gasta", async () => {
  vaciarCache(); let llamadas = 0; globalThis.fetch = async () => { llamadas++; return rta({ rubros: ["plomero"] }); };
  const negarClave = (prefijo) => async (k) => !k.startsWith(prefijo);
  assert.deepEqual(await interpretarBusqueda("busco plomero", { quien: "u1", permitir: negarClave("buscar-ia-global") }), { ok: false, motivo: "limite_global" });
  assert.deepEqual(await interpretarBusqueda("busco plomero", { quien: "u1", permitir: negarClave("buscar-ia-hora") }), { ok: false, motivo: "limite_persona" });
  assert.deepEqual(await interpretarBusqueda("busco plomero", { quien: "u1", permitir: negarClave("buscar-ia-dia") }), { ok: false, motivo: "limite_persona" });
  assert.equal(llamadas, 0);
  await interpretarBusqueda("busco plomero", { quien: "u1", permitir: permitirTodo });
  const r = await interpretarBusqueda("busco plomero", { quien: "u1", permitir: async () => false }); // caché: no consulta el tope
  assert.equal(r.ok, true); assert.equal(r.cache, true);
});

await prueba("un texto demasiado corto no gasta ninguna llamada", async () => {
  vaciarCache(); globalThis.fetch = async () => { throw new Error("no debería llamar"); };
  assert.deepEqual(await interpretarBusqueda("a", { permitir: permitirTodo }), { ok: false, motivo: "texto_corto" });
  assert.deepEqual(await interpretarBusqueda("juan@mail.com", { permitir: permitirTodo }), { ok: false, motivo: "texto_corto" });
});

globalThis.fetch = fetchOriginal;
console.log(process.exitCode ? "\nHAY PRUEBAS QUE FALLARON" : `\nTodas las pruebas pasaron (${ok}).`);
