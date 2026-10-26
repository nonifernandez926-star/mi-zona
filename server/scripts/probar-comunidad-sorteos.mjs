// Pruebas del sorteo como publicación de Comunidad. No necesitan internet ni base de datos:  npm run probar:sorteos
// Un sorteo es SOLO una ficha informativa: sin precio, sin cobro, sin premios en dinero, sin reservas ni pagos dentro de la app.
import assert from "node:assert/strict";
import { sanearPublicacion, publicacionPublica, publicacionDelAutor, limpiarTextoSorteo, parecePrecioOPago, pareceDinero, TIPOS, SORTEO_DIAS_VISIBLE, textoBusqueda } from "../utils/comunidad.js";

let ok = 0;
const prueba = (nombre, fn) => { try { fn(); ok++; console.log("✔", nombre); } catch (e) { console.error("✘", nombre, "\n   ", e.message); process.exitCode = 1; } };

const AHORA = new Date("2026-10-25T15:00:00Z"); // 12:00 en Argentina
const LOC = { provinciaId: "90", provincia: "Tucumán", departamentoId: "90084", departamento: "Capital", localidadId: "90084010", localidad: "San Miguel de Tucumán" };
const base = () => ({
  titulo: "Rifa a beneficio de la escuela", desc: "Rifa para juntar útiles para los chicos de la escuela del barrio.", localidad: LOC,
  organizador: "Cooperadora de la escuela", motivo: "beneficio", motivoDetalle: "Escuela del barrio", definicion: "quiniela", definicionDetalle: "Quiniela nocturna de Tucumán",
  premios: ["Una bicicleta rodado 26", "Una canasta de almacén"], numeros: 100, fecha: "2026-11-08", hora: "", lugar: "Club del barrio", fotos: [],
  whatsapp: "5493815551234", mostrarWhatsapp: true,
});
const sanear = (cambios = {}) => sanearPublicacion({ ...base(), ...cambios }, "sorteo", AHORA);

prueba("el sorteo es un tipo de Comunidad con WhatsApp y una sola foto", () => {
  assert.equal(TIPOS.sorteo.contacto, true);
  assert.equal(TIPOS.sorteo.fotos, 1);
});

prueba("una ficha completa se acepta y queda con fecha, premios y vencimiento unos días después", () => {
  const r = sanear();
  assert.ok(!r.error, r.error);
  assert.deepEqual(r.extra.premios, ["Una bicicleta rodado 26", "Una canasta de almacén"]);
  assert.equal(r.extra.numeros, 100);
  assert.equal(r.extra.conHora, false);
  assert.equal(r.extra.definicion, "quiniela");
  assert.equal(r.inicio.toISOString(), "2026-11-08T15:00:00.000Z");
  // vence el fin del día del sorteo (hora Argentina) + 3 días
  assert.equal(r.vence.toISOString(), new Date(Date.parse("2026-11-09T02:59:00.000Z") + SORTEO_DIAS_VISIBLE * 86400000).toISOString());
});

prueba("la hora es opcional y, si se carga, se respeta", () => {
  const r = sanear({ hora: "21:30" });
  assert.ok(!r.error, r.error);
  assert.equal(r.extra.conHora, true);
  assert.equal(r.inicio.toISOString(), "2026-11-09T00:30:00.000Z");
  assert.ok(sanear({ hora: "25:00" }).error);
});

prueba("la cantidad de números es opcional y solo informativa", () => {
  assert.ok(!sanear({ numeros: "" }).error);
  assert.equal(sanear({ numeros: undefined }).extra.numeros, null);
  assert.ok(sanear({ numeros: 1 }).error);
  assert.ok(sanear({ numeros: 2.5 }).error);
  assert.ok(sanear({ numeros: 99999 }).error);
});

prueba("no se aceptan premios en dinero", () => {
  for (const malo of ["$50000 en efectivo", "Un premio de 100 mil", "100 mil pesos", "500 dólares", "USD 200", "Plata en efectivo", "Dinero"]) {
    const r = sanear({ premios: [malo] });
    assert.ok(r.error && /dinero/i.test(r.error), `se aceptó «${malo}»: ${JSON.stringify(r)}`);
  }
  assert.ok(!sanear({ premios: ["Un juego de cubiertos de plata"] }).error, "no debería frenar un objeto de plata");
  assert.ok(!sanear({ premios: ["Entradas al cine para 4 personas"] }).error);
});

prueba("no hay precio ni forma de pago en la ficha", () => {
  const malos = [
    { desc: "Cada número sale lo mismo, pagás por transferencia a mi alias." },
    { desc: "Rifa solidaria, el valor del número es accesible para todos." },
    { titulo: "Rifa de $2000 el número" },
    { desc: "Se paga por MercadoPago o en efectivo cuando nos veamos." },
    { desc: "Rifa para ayudar a la escuela. Mi CBU está en las fotos de abajo." },
    { desc: "Rifa para ayudar a la escuela, escribime al 3815551234 para participar." },
    { desc: "Rifa para ayudar a la escuela, pasame tu cuenta 0000003100012345678901." },
  ];
  for (const m of malos) assert.ok(sanear(m).error, `se aceptó ${JSON.stringify(m)}`);
});

prueba("sin WhatsApp (o con el botón apagado) no se puede publicar", () => {
  assert.ok(sanear({ whatsapp: "" }).error);
  assert.ok(sanear({ mostrarWhatsapp: false }).error);
  assert.ok(sanear({ whatsapp: "12" }).error);
});

prueba("campos obligatorios y límites", () => {
  assert.ok(sanear({ organizador: "" }).error);
  assert.ok(sanear({ motivo: "otra cosa" }).error);
  assert.ok(sanear({ definicion: "dados" }).error);
  assert.ok(sanear({ premios: [] }).error);
  assert.ok(sanear({ premios: "bici" }).error);
  assert.ok(sanear({ premios: ["a", "b", "c", "d", "e", "f", "g"].map((x) => `Premio ${x}`) }).error);
  assert.ok(sanear({ fecha: "" }).error);
  assert.ok(sanear({ fecha: "08/11/2026" }).error);
  assert.ok(sanear({ fotos: ["https://x.com/a.jpg", "https://x.com/b.jpg"] }).error);
  assert.ok(sanear({ localidad: null }).error);
});

prueba("la fecha no puede estar en el pasado ni muy lejos; hoy sin hora sí vale", () => {
  assert.ok(sanear({ fecha: "2026-10-24" }).error);
  assert.ok(!sanear({ fecha: "2026-10-25" }).error);
  assert.ok(sanear({ fecha: "2026-10-25", hora: "08:00" }).error);
  assert.ok(sanear({ fecha: "2027-06-01" }).error);
});

prueba("los premios repetidos se juntan y se limpian los caracteres raros", () => {
  const r = sanear({ premios: ["  Una   bici ", "Una bici", "<b>Un televisor</b>"] });
  assert.deepEqual(r.extra.premios, ["Una bici", "b Un televisor /b"]);
});

prueba("lo público no trae el número de WhatsApp ni datos del autor; el botón aparece solo si el autor lo activó", () => {
  const r = sanear();
  const fila = { id: "abc", tipo: "sorteo", ownerId: "u1", titulo: r.datos.titulo, desc: r.datos.desc, localidad: r.datos.localidad, zona: "", fotos: [], datos: r.extra, whatsapp: r.datos.whatsapp, mostrarWhatsapp: true, expiresAt: r.vence, inicioAt: r.inicio, createdAt: AHORA };
  const pub = publicacionPublica(fila, AHORA);
  assert.equal(pub.conContacto, true);
  assert.equal(pub.estadoEvento, "normal");
  const texto = JSON.stringify(pub);
  assert.ok(!texto.includes("5493815551234") && !texto.includes("u1"), "se coló el número o el dueño");
  assert.equal(publicacionDelAutor(fila, AHORA).whatsapp, "5493815551234");
});

prueba("un sorteo cancelado se ve como cancelado y vence igual", () => {
  const fila = { id: "abc", tipo: "sorteo", titulo: "x", desc: "y", datos: {}, estadoEvento: "cancelado", whatsapp: "5493815551234", mostrarWhatsapp: true, expiresAt: new Date(AHORA.getTime() + 86400000) };
  const pub = publicacionPublica(fila, AHORA);
  assert.equal(pub.estadoEvento, "cancelado");
  assert.equal(pub.estado, "activa");
});

prueba("el resultado es solo texto del organizador: sin enlaces ni precios; vacío lo borra", () => {
  assert.deepEqual(limpiarTextoSorteo("Salió el 047 en la Quiniela nocturna. ¡Felicitaciones a la ganadora!"), { valor: "Salió el 047 en la Quiniela nocturna. ¡Felicitaciones a la ganadora!" });
  assert.deepEqual(limpiarTextoSorteo("   "), { valor: "" });
  assert.ok(limpiarTextoSorteo("ver en https://sitio.com/resultado").error);
  assert.ok(limpiarTextoSorteo("abc").error);
  assert.ok(limpiarTextoSorteo("x".repeat(301)).error);
  assert.ok(limpiarTextoSorteo("El ganador paga $500 de envío").error);
});

prueba("se puede buscar por premio y organizador", () => {
  const r = sanear();
  const t = textoBusqueda(r.datos, r.extra);
  assert.ok(t.includes("bicicleta") && t.includes("cooperadora"));
});

prueba("detectores: precios y dinero", () => {
  assert.equal(parecePrecioOPago("Escribime por privado"), false);
  assert.equal(parecePrecioOPago("Sale $1000"), true);
  assert.equal(pareceDinero("Una moto 0km"), false);
  assert.equal(pareceDinero("Un viaje con todos los gastos pagos"), false);
  assert.equal(pareceDinero("50 lucas"), true);
});

prueba("los otros tipos de Comunidad siguen funcionando igual", () => {
  const r = sanearPublicacion({ titulo: "Corte de luz", desc: "Mañana cortan la luz por obras.", localidad: LOC, subtipo: "corte_luz", gravedad: "informativo", horas: 6 }, "aviso", AHORA);
  assert.ok(!r.error, r.error);
  assert.ok(sanearPublicacion({ titulo: "Sorteo $5000", desc: "Algo cualquiera para probar", localidad: LOC }, "sorteo", AHORA).error);
});

console.log(`\n${ok} pruebas pasaron${process.exitCode ? " (hay fallos)" : ""}.`);
