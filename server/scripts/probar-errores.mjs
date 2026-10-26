// Pruebas del registro de errores de la web (Fase 11). No necesitan internet ni base de datos:  npm run probar:errores
import assert from "node:assert/strict";
import { sanearError, limpiarTexto } from "../utils/errores.js";

let ok = 0;
const prueba = (nombre, fn) => { try { fn(); ok++; console.log("✔", nombre); } catch (e) { console.error("✘", nombre, "\n   ", e.message); process.exitCode = 1; } };

prueba("saca correos, teléfonos, claves y parámetros de enlaces", () => {
  const t = limpiarTexto("Falló para juan@correo.com tel 381 555-1234 en https://mizona.app/n/abc?token=SECRETO&x=1 con eyJhbGciOiJIUzI1NiJ9.eyJ1aWQiOiIxMjMifQ.firmafirma y AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", 400);
  for (const malo of ["juan@correo.com", "381 555", "SECRETO", "eyJhbGci", "AAAAAAAAAAAAAAAA"]) assert.ok(!t.includes(malo), `quedó «${malo}» en: ${t}`);
  assert.ok(t.includes("Falló"));
});

prueba("no estropea mensajes normales (ni signos de pregunta sueltos)", () => {
  assert.equal(limpiarTexto("Cannot read properties of undefined (reading 'map')", 300), "Cannot read properties of undefined (reading 'map')");
  assert.equal(limpiarTexto("¿Falló esto ? sí", 300), "¿Falló esto ? sí");
});

prueba("la pantalla se guarda sin parámetros ni ids", () => {
  const e = sanearError({ mensaje: "Boom", pantalla: "/oficios/5f9a8b7c6d5e4f3a2b1c0d9e?x=1#y" });
  assert.equal(e.pantalla, "/oficios/:id");
  assert.equal(sanearError({ mensaje: "Boom", pantalla: "/n/123456" }).pantalla, "/n/:id");
});

prueba("limita el largo de cada campo y descarta lo que no sirve", () => {
  const e = sanearError({ mensaje: "x".repeat(5000), pila: "y ".repeat(5000), pantalla: "/".padEnd(500, "a"), version: "1.2.0<script>", plataforma: "z".repeat(900) });
  assert.ok(e.mensaje.length <= 300 && e.pila.length <= 900 && e.pantalla.length <= 80 && e.plataforma.length <= 120);
  assert.equal(e.version, "1.2.0script");
  for (const malo of [null, undefined, "texto", 5, [], {}, { mensaje: "" }, { mensaje: "a" }]) assert.equal(sanearError(malo), null);
});

prueba("el mismo error repetido da la misma huella; uno distinto, otra", () => {
  const a = sanearError({ mensaje: "Boom", pila: "at f (a.js:1:1)\nat g", pantalla: "/", version: "1.2.0" });
  const b = sanearError({ mensaje: "Boom", pila: "at f (a.js:1:1)\nat g", pantalla: "/", version: "1.2.0", plataforma: "otro celular" });
  const c = sanearError({ mensaje: "Boom", pila: "at f (a.js:1:1)\nat g", pantalla: "/ajustes", version: "1.2.0" });
  assert.equal(a.huella, b.huella); assert.notEqual(a.huella, c.huella); assert.equal(a.huella.length, 32);
});

console.log(process.exitCode ? "\nHAY PRUEBAS QUE FALLARON" : `\nTodas las pruebas de errores pasaron (${ok}).`);
