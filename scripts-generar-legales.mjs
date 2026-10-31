// Genera las páginas públicas /privacidad.html, /terminos.html y /eliminar-cuenta.html desde src/legal.js (una sola fuente de verdad).
// Uso: npm run legales   (también corre solo en "npm run build"; volver a correrlo cada vez que cambie legal.js)
// Variables opcionales (se leen del entorno al correr el script):
//   VITE_SOPORTE_EMAIL  correo de contacto que se muestra en las tres páginas (Google Play lo exige en la política de privacidad)
//   LEGAL_TITULAR       nombre de la persona o empresa responsable (ej.: "Juan Pérez" o "Mi Zona S.R.L.")
import { writeFileSync } from "node:fs";
import { TERMINOS, PRIVACIDAD_TEXTO, LEGAL_ACTUALIZADO } from "./src/legal.js";
const CONTACTO = String(process.env.VITE_SOPORTE_EMAIL || "").trim();
const TITULAR = String(process.env.LEGAL_TITULAR || "").trim();
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pagina = (titulo, secciones) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#0B1437" />
<title>${esc(titulo)} · Mi Zona</title>
<style>
  :root { --tinta:#0b1437; --azul:#2350f5; --gris:#5b6482; --linea:#e3e7f1; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,'Segoe UI',system-ui,Roboto,sans-serif; background:#f4f6fb; color:var(--tinta); line-height:1.65; -webkit-font-smoothing:antialiased; }
  header { background:#0a1235 radial-gradient(420px 220px at 105% -20%, rgba(54,104,255,.55), transparent 60%); color:#fff; padding:28px 20px 30px; border-bottom:1px solid rgba(255,255,255,.06); }
  header div, main { max-width:760px; margin:0 auto; }
  header a { color:#bbd1fb; font-weight:700; font-size:.85rem; text-decoration:none; }
  h1 { margin:10px 0 4px; font-size:1.75rem; font-weight:800; letter-spacing:-.03em; line-height:1.15; }
  header p { margin:0; color:#bbd1fb; font-size:.88rem; }
  main { padding:20px 16px 56px; }
  section { background:#fff; border:1px solid var(--linea); border-radius:18px; padding:20px; margin-bottom:12px; box-shadow:0 1px 2px rgba(11,20,55,.04); }
  h2 { margin:0 0 10px; font-size:1.05rem; font-weight:800; letter-spacing:-.02em; }
  p { margin:0 0 10px; color:#2b3768; font-size:.95rem; } p:last-child { margin-bottom:0; }
  ul { margin:0 0 10px; padding-left:20px; color:#2b3768; font-size:.95rem; } li { margin-bottom:6px; }
  a.c { color:var(--azul); font-weight:700; }
  footer { text-align:center; color:var(--gris); font-size:.8rem; padding-bottom:36px; }
</style></head>
<body>
<header><div><a href="/">← Volver a Mi Zona</a><h1>${esc(titulo)}</h1><p>Última actualización: ${esc(LEGAL_ACTUALIZADO)}</p></div></header>
<main>
${secciones.map((s) => `<section><h2>${esc(s.t)}</h2>${(s.p || []).map((x) => `<p>${esc(x)}</p>`).join("")}${s.l ? `<ul>${s.l.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${(s.p2 || []).map((x) => `<p>${esc(x)}</p>`).join("")}</section>`).join("\n")}
</main>
<footer>Mi Zona${TITULAR ? ` · ${esc(TITULAR)}` : ""}${CONTACTO ? ` · <a class="c" href="mailto:${esc(CONTACTO)}">${esc(CONTACTO)}</a>` : ""}</footer>
</body></html>
`;
// Página pública para pedir la eliminación de la cuenta y de los datos (Google Play pide un enlace web en la ficha de la app)
const ELIMINAR = [
  { t: "Aplicación: Mi Zona", p: [
    "Esta página explica cómo pedir que se elimine tu cuenta de Mi Zona y los datos asociados, desde la aplicación o sin entrar a ella.",
  ] },
  { t: "Opción 1: desde la aplicación", p: [
    "Abrí Mi Zona y andá a Ajustes → Privacidad → Eliminar cuenta. Escribí ELIMINAR y confirmá con tu contraseña (o con tu cuenta de Google). Si tenés negocios publicados, la aplicación te pide confirmar si también querés eliminarlos. Antes de eliminar podés descargar una copia de tus datos desde Ajustes → Privacidad.",
  ] },
  { t: "Opción 2: si no podés entrar a la aplicación", p: [
    CONTACTO
      ? `Escribinos a ${CONTACTO} desde el correo con el que te registraste, con el asunto «Eliminar mi cuenta de Mi Zona» e indicando tu nombre de usuario. Eliminamos tu cuenta y tus datos y te avisamos por el mismo correo.`
      : "Escribinos desde la sección Soporte de la aplicación (o desde el correo de contacto que figura al pie de esta página), con el asunto «Eliminar mi cuenta de Mi Zona» e indicando el correo con el que te registraste.",
    "Completamos el pedido en un plazo máximo de 30 días.",
  ] },
  { t: "Qué datos se borran", p: [], l: [
    "Tu cuenta y tu perfil (correo, nombre, usuario, foto y descripción) y tus sesiones.",
    "Tu agenda, tus notificaciones y tu actividad de seguridad.",
    "Tus consultas a Soporte, las reseñas que escribiste y tus bloqueos.",
    "Tu ficha de oficios, tus fichas de alquiler, tus publicaciones de Comunidad y tus invitaciones.",
    "Los negocios que tengas publicados, con sus estadísticas, si elegís eliminarlos.",
    "Los avisos y medidas del equipo sobre tu cuenta.",
  ] },
  { t: "Qué datos se conservan y por cuánto tiempo", p: [
    "Algunos datos se conservan por motivos legales, de seguridad o de contabilidad, siempre sin tu identidad:",
  ], l: [
    "Comprobantes de tus compras en Google Play (producto, fecha y vencimiento, sin datos de pago): se conservan sin tu identidad, para reclamos, reembolsos y contabilidad.",
    "Denuncias que hiciste: se conservan sin tu identidad hasta que se borran solas, un año después de resolverse.",
    "Registro interno de acciones del equipo de moderación: 3 años.",
    "Fotos que subiste: quedan sin ningún enlace desde Mi Zona; el archivo puede tardar en borrarse del servicio de alojamiento de imágenes (si querés que lo borremos ya, escribinos).",
    "Chats con los asistentes de los negocios: se guardan en Mi Asistente, un servicio aparte; para pedir que se borren, escribinos.",
    "Las suscripciones ya pagadas no se reembolsan al eliminar la cuenta (ver Términos y condiciones).",
  ] },
];

writeFileSync("public/privacidad.html", pagina("Política de privacidad", PRIVACIDAD_TEXTO));
writeFileSync("public/terminos.html", pagina("Términos y condiciones", TERMINOS));
writeFileSync("public/eliminar-cuenta.html", pagina("Eliminar mi cuenta y mis datos", ELIMINAR));
console.log("Listo: public/privacidad.html, public/terminos.html y public/eliminar-cuenta.html");
if (!CONTACTO) console.warn("ATENCIÓN: falta VITE_SOPORTE_EMAIL. Google Play exige un correo de contacto en la política de privacidad: corré de nuevo con la variable cargada.");
