// Qué puede hacer una cuenta suspendida: mirar y leer sí; publicar, editar o contactar no. Sin internet ni base de datos:  npm run probar:todo
import assert from "node:assert/strict";
import { rutaPermitidaSuspendido as permitida } from "../utils/moderacion.js";

let ok = 0;
const prueba = (nombre, fn) => { try { fn(); ok++; console.log("✔", nombre); } catch (e) { console.error("✘", nombre, "\n   ", e.message); process.exitCode = 1; } };

prueba("puede mirar (GET) cualquier cosa", () => { for (const r of ["/api/buscar?q=a", "/api/oficios", "/api/negocios"]) assert.equal(permitida("GET", r), true); });
prueba("los POST que solo leen están permitidos (buscar con IA y resolver favoritos)", () => {
  assert.equal(permitida("POST", "/api/buscar/ia"), true);
  assert.equal(permitida("POST", "/api/favoritos/resolver"), true);
});
prueba("puede ver el motivo, apelar, escribir a Soporte, descargar datos y eliminar la cuenta", () => {
  assert.equal(permitida("POST", "/api/soporte"), true);
  assert.equal(permitida("DELETE", "/api/privacidad/cuenta"), true);
  assert.equal(permitida("POST", "/api/auth/logout"), true);
});
prueba("no puede publicar, editar ni contactar", () => {
  for (const [m, r] of [["POST", "/api/oficios"], ["POST", "/api/alquileres"], ["POST", "/api/comunidad"], ["DELETE", "/api/oficios/1"], ["PUT", "/api/negocios/1"], ["POST", "/api/favoritos"], ["POST", "/api/buscar/ia/otra"], ["POST", "/api/favoritos/resolver/x"]]) assert.equal(permitida(m, r), false, `${m} ${r}`);
});

console.log(process.exitCode ? "\nHAY PRUEBAS QUE FALLARON" : `\nTodas las pruebas de suspensión pasaron (${ok}).`);
