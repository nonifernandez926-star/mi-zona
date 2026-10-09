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
<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  :root { --tinta:#0b1437; --azul:#2350f5; --gris:#5b6482; --linea:#e3e7f1; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:'Manrope',-apple-system,'Segoe UI',system-ui,Roboto,sans-serif; background:#eef1f8; color:var(--tinta); line-height:1.65; -webkit-font-smoothing:antialiased; }
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
  { t: "Cómo eliminar tu cuenta y tus datos", p: [
    "Podés eliminar tu cuenta cuando quieras desde la aplicación: Ajustes → Privacidad → Eliminar cuenta. Vas a tener que escribir ELIMINAR y confirmar con tu contraseña (o con tu cuenta de Google).",
  ], l: [
    "Se borran tu cuenta, tu agenda, tus notificaciones, tus sesiones, tu actividad de seguridad, tus consultas a Soporte y las reseñas que escribiste.",
    "Si tenés negocios publicados, la aplicación te pide confirmar si también querés eliminarlos. En ese caso se borran sus datos y sus estadísticas.",
    "Antes de eliminar podés descargar una copia de tus datos desde Ajustes → Privacidad.",
    "Las suscripciones ya pagadas no se reembolsan al eliminar la cuenta (ver Términos y condiciones).",
  ] },
  { t: "Si no podés entrar a la aplicación", p: [
    CONTACTO
      ? `Escribinos a ${CONTACTO} desde el correo con el que te registraste, indicando tu nombre de usuario, y eliminamos tu cuenta y tus datos.`
      : "Escribinos desde la sección Soporte de la aplicación, indicando el correo con el que te registraste, y eliminamos tu cuenta y tus datos.",
    "Respondemos y completamos el pedido en un plazo máximo de 30 días.",
  ] },
];

writeFileSync("public/privacidad.html", pagina("Política de privacidad", PRIVACIDAD_TEXTO));
writeFileSync("public/terminos.html", pagina("Términos y condiciones", TERMINOS));
writeFileSync("public/eliminar-cuenta.html", pagina("Eliminar mi cuenta y mis datos", ELIMINAR));
console.log("Listo: public/privacidad.html, public/terminos.html y public/eliminar-cuenta.html");
if (!CONTACTO) console.warn("ATENCIÓN: falta VITE_SOPORTE_EMAIL. Google Play exige un correo de contacto en la política de privacidad: corré de nuevo con la variable cargada.");
