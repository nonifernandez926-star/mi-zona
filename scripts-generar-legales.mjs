// Genera las páginas públicas /privacidad.html y /terminos.html desde src/legal.js (una sola fuente de verdad).
// Uso: node scripts-generar-legales.mjs   (volver a correrlo cada vez que cambie legal.js)
import { writeFileSync } from "node:fs";
import { TERMINOS, PRIVACIDAD_TEXTO, LEGAL_ACTUALIZADO } from "./src/legal.js";
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
  footer { text-align:center; color:var(--gris); font-size:.8rem; padding-bottom:36px; }
</style></head>
<body>
<header><div><a href="/">← Volver a Mi Zona</a><h1>${esc(titulo)}</h1><p>Última actualización: ${esc(LEGAL_ACTUALIZADO)}</p></div></header>
<main>
${secciones.map((s) => `<section><h2>${esc(s.t)}</h2>${s.p.map((x) => `<p>${esc(x)}</p>`).join("")}</section>`).join("\n")}
</main>
<footer>Mi Zona</footer>
</body></html>
`;
writeFileSync("public/privacidad.html", pagina("Política de privacidad", PRIVACIDAD_TEXTO));
writeFileSync("public/terminos.html", pagina("Términos y condiciones", TERMINOS));
console.log("Listo: public/privacidad.html y public/terminos.html");
