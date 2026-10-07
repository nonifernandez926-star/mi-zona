import express from "express";
import Consulta from "../models/Consulta.js";
import { identificar, limitar } from "../utils/auth.js";
import { enviarPushAUsuario } from "../utils/push.js";
import Business from "../models/Business.js";
import Usuario from "../models/Usuario.js";
import { huellaAutor } from "../utils/negocios.js";

const router = express.Router();
router.use(identificar);

const MOTIVOS = ["cuenta", "negocio", "pagos", "asistente", "resenas", "error", "sugerencia", "otro"];
const NOMBRE_MOTIVO = {
  cuenta: "Mi cuenta y acceso", negocio: "Mi negocio", pagos: "Pagos y suscripción", asistente: "Mi Asistente y chats",
  resenas: "Reseñas", error: "Algo no funciona", sugerencia: "Sugerencia", otro: "Otro tema",
};
const limpiar = (v, max) => String(v ?? "").replace(/\s+\n/g, "\n").trim().slice(0, max);
const emailValido = (v) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(v);
const codigo = (c) => `MZ-${String(c._id).slice(-6).toUpperCase()}`;
const publica = (c) => ({
  id: String(c._id), codigo: codigo(c), motivo: c.motivo, asunto: c.asunto, mensaje: c.mensaje, estado: c.estado,
  respuesta: c.respuesta || "", respondidaEn: c.respondidaEn, creadaEn: c.createdAt,
});

// Avisa al equipo si hay un enlace configurado (Slack, Discord, Make, Zapier...). Si falla no afecta a la persona.
async function avisarAlEquipo(c) {
  const url = process.env.SOPORTE_AVISO_URL;
  if (!url) return;
  const texto = `Nueva consulta ${codigo(c)} · ${NOMBRE_MOTIVO[c.motivo]}\n${c.asunto}\n${c.email}`;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: texto, content: texto }) });
  } catch (e) { console.error("No se pudo avisar al equipo de soporte:", e.message); }
}

// POST /api/soporte  { motivo, asunto, mensaje, email?, tecnico? } → crea la consulta (con o sin sesión)
router.post("/", limitar("soporte", 5, 3600 * 1000), async (req, res) => {
  try {
    const u = req.actor?.usuario;
    const motivo = MOTIVOS.includes(req.body?.motivo) ? req.body.motivo : "otro";
    const asunto = limpiar(req.body?.asunto, 120);
    const mensaje = limpiar(req.body?.mensaje, 2000);
    const email = u ? u.email : limpiar(req.body?.email, 254).toLowerCase();
    if (asunto.length < 3) return res.status(400).json({ error: "Escribí un asunto corto." });
    if (mensaje.length < 15) return res.status(400).json({ error: "Contanos un poco más: el mensaje es muy corto." });
    if (!emailValido(email)) return res.status(400).json({ error: "Revisá el correo: no parece válido." });
    // máximo 10 consultas abiertas por persona: evita llenar la bandeja
    const abiertas = await Consulta.countDocuments(u ? { usuarioId: String(u._id), estado: { $ne: "cerrada" } } : { email, estado: { $ne: "cerrada" } });
    if (abiertas >= 10) return res.status(429).json({ error: "Tenés muchas consultas abiertas. Esperá la respuesta del equipo antes de enviar otra." });
    const c = await Consulta.create({
      usuarioId: u ? String(u._id) : "", email, nombre: u?.nombre || "", motivo, asunto, mensaje, tecnico: limpiar(req.body?.tecnico, 300),
    });
    avisarAlEquipo(c);
    res.status(201).json({ consulta: publica(c) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No pudimos enviar tu consulta. Probá de nuevo en un momento." });
  }
});

// GET /api/soporte/mias → consultas de esta cuenta (solo con sesión)
router.get("/mias", async (req, res) => {
  try {
    if (!req.actor?.usuario) return res.status(401).json({ error: "Tenés que iniciar sesión para ver tus consultas." });
    const lista = await Consulta.find({ usuarioId: String(req.actor.usuario._id) }).sort({ createdAt: -1 }).limit(50);
    res.json({ consultas: lista.map(publica) });
  } catch (e) {
    res.status(500).json({ error: "No pudimos cargar tus consultas." });
  }
});

// POST /api/soporte/:id/cerrar → la persona da por resuelta su consulta
router.post("/:id/cerrar", async (req, res) => {
  try {
    if (!req.actor?.usuario) return res.status(401).json({ error: "Tenés que iniciar sesión." });
    const c = await Consulta.findOneAndUpdate({ _id: req.params.id, usuarioId: String(req.actor.usuario._id) }, { $set: { estado: "cerrada" } }, { new: true });
    if (!c) return res.status(404).json({ error: "No encontramos esa consulta." });
    res.json({ consulta: publica(c) });
  } catch (e) {
    res.status(400).json({ error: "No se pudo cerrar la consulta." });
  }
});

/* ---------- Equipo de Mi Zona (con SOPORTE_ADMIN_KEY) ---------- */
const claveOk = (req) => {
  const k = process.env.SOPORTE_ADMIN_KEY;
  return !!k && req.get("x-soporte-key") === k;
};

// GET /api/soporte/admin?estado=abierta|respondida|cerrada
router.get("/admin", async (req, res) => {
  if (!claveOk(req)) return res.status(401).json({ error: "Clave incorrecta." });
  const filtro = ["abierta", "respondida", "cerrada"].includes(req.query.estado) ? { estado: req.query.estado } : {};
  const lista = await Consulta.find(filtro).sort({ createdAt: -1 }).limit(100);
  res.json({ consultas: lista.map((c) => ({ ...publica(c), email: c.email, nombre: c.nombre, conCuenta: !!c.usuarioId, tecnico: c.tecnico, resena: datosResena(c) })) });
});

/* ---------- Moderación de reseñas reportadas ---------- */
// La app manda en "tecnico" un JSON { negocioId, resenaId } cuando la consulta es el reporte de una reseña.
function datosResena(c) {
  if (c.motivo !== "resenas") return null;
  try {
    const d = JSON.parse(c.tecnico || "");
    return d && d.negocioId && d.resenaId !== undefined ? { negocioId: String(d.negocioId), resenaId: d.resenaId } : null;
  } catch { return null; }
}
// Las reseñas guardan solo una "huella" del autor (no su id). Para avisarle se busca la cuenta cuya huella coincide.
async function buscarAutor(huella) {
  if (!huella) return null;
  for await (const u of Usuario.find({}, "_id email nombre").lean().cursor()) if (huellaAutor(String(u._id)) === huella) return u;
  return null;
}
// Crea una consulta a nombre del autor con el mensaje del equipo: la ve en Soporte y le llega una notificación.
async function avisarAutor(autor, negocio, resena, mensaje) {
  const c = await Consulta.create({
    usuarioId: String(autor._id), email: autor.email, nombre: autor.nombre || "", motivo: "resenas",
    asunto: `Sobre tu reseña en ${negocio.name || "un negocio"}`.slice(0, 120),
    mensaje: `El equipo de Mi Zona revisó tu reseña: "${String(resena.text || "").slice(0, 200)}"`,
    respuesta: mensaje, estado: "respondida", respondidaEn: new Date(),
  });
  enviarPushAUsuario(String(autor._id), { titulo: "El equipo te escribió sobre tu reseña", cuerpo: mensaje.slice(0, 120) }).catch(() => {});
  return c;
}
async function moderarResena(req, res, borrar) {
  if (!claveOk(req)) return res.status(401).json({ error: "Clave incorrecta." });
  try {
    const mensaje = limpiar(req.body?.mensaje, 1500);
    const reporte = await Consulta.findById(req.params.id);
    const d = reporte && datosResena(reporte);
    if (!d) return res.status(400).json({ error: "Esta consulta no es el reporte de una reseña." });
    const negocio = await Business.findOne({ id: d.negocioId });
    const resena = negocio && (negocio.reviews || []).find((r) => r.id === d.resenaId);
    if (!resena) return res.status(404).json({ error: "Esa reseña ya no existe (quizá ya se eliminó)." });
    if (!borrar && mensaje.length < 2) return res.status(400).json({ error: "Escribí el mensaje para el autor en el cuadro de respuesta." });
    let aviso = borrar ? "Reseña eliminada." : "";
    if (borrar) await Business.updateOne({ id: d.negocioId }, { $pull: { reviews: { id: d.resenaId } } });
    if (mensaje.length >= 2) {
      const autor = await buscarAutor(resena.autorUid);
      if (autor) { await avisarAutor(autor, negocio, resena, mensaje); aviso += " Le avisamos al autor."; }
      else aviso += " No encontramos la cuenta del autor (la reseña es anterior o su cuenta ya no existe), así que no se le pudo avisar.";
    }
    reporte.estado = "respondida"; reporte.respondidaEn = new Date();
    reporte.respuesta = borrar ? "Revisamos tu reporte y eliminamos la reseña. Gracias por avisarnos." : "Revisamos tu reporte. Gracias por avisarnos.";
    await reporte.save();
    if (reporte.usuarioId) enviarPushAUsuario(reporte.usuarioId, { titulo: "Revisamos tu reporte", cuerpo: reporte.respuesta }).catch(() => {});
    res.json({ ok: true, aviso: aviso.trim() });
  } catch (e) {
    console.error("Error moderando reseña:", e.message);
    res.status(500).json({ error: "No se pudo completar la acción." });
  }
}
router.post("/admin/:id/resena-eliminar", (req, res) => moderarResena(req, res, true));
router.post("/admin/:id/resena-avisar", (req, res) => moderarResena(req, res, false));

// POST /api/soporte/admin/:id/responder  { respuesta }  → guarda la respuesta y avisa por notificación si la persona tiene cuenta
router.post("/admin/:id/responder", async (req, res) => {
  if (!claveOk(req)) return res.status(401).json({ error: "Clave incorrecta." });
  const respuesta = limpiar(req.body?.respuesta, 3000);
  if (respuesta.length < 2) return res.status(400).json({ error: "Escribí la respuesta." });
  const c = await Consulta.findByIdAndUpdate(req.params.id, { $set: { respuesta, estado: "respondida", respondidaEn: new Date() } }, { new: true });
  if (!c) return res.status(404).json({ error: "No existe esa consulta." });
  if (c.usuarioId) enviarPushAUsuario(c.usuarioId, { titulo: "Respondimos tu consulta", cuerpo: `${codigo(c)} · ${c.asunto}`.slice(0, 120) }).catch(() => {});
  res.json({ consulta: publica(c) });
});

// GET /api/soporte/panel → página simple para que el equipo lea y responda (pide la clave; no guarda nada en el servidor)
router.get("/panel", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'");
  res.send(PANEL);
});

const PANEL = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Soporte · Mi Zona</title><style>
body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#F3F6FB;color:#0B1220}main{max-width:760px;margin:0 auto;padding:20px}
h1{font-size:20px;margin:0 0 16px}.bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
input,textarea,select,button{font:inherit;padding:9px 11px;border:1px solid #CBD5E1;border-radius:8px;background:#fff}
button{background:#0B2A54;color:#fff;border-color:#0B2A54;cursor:pointer}.card{background:#fff;border:1px solid #E1E8F2;border-radius:12px;padding:14px;margin-bottom:12px}
.meta{font-size:13px;color:#4B5563}.est{font-size:12px;font-weight:600;padding:2px 8px;border-radius:99px;background:#E8F0FE;color:#2F6FED}
.msg{white-space:pre-wrap;margin:8px 0}.resp{background:#E4F3EA;border-radius:8px;padding:10px;margin-top:8px;white-space:pre-wrap}textarea{width:100%;box-sizing:border-box;margin-top:8px}
</style></head><body><main><h1>Consultas de Mi Zona</h1>
<div class="bar"><input id="k" type="password" placeholder="Clave del equipo"><select id="e"><option value="abierta">Abiertas</option><option value="respondida">Respondidas</option><option value="cerrada">Cerradas</option><option value="">Todas</option></select><button onclick="cargar()">Ver</button></div>
<p id="m" class="meta"></p><div id="l"></div></main><script>
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const H=()=>({'x-soporte-key':$('k').value,'Content-Type':'application/json'});
async function cargar(){$('m').textContent='Cargando...';const r=await fetch('/api/soporte/admin?estado='+$('e').value,{headers:H()});const d=await r.json();
if(!r.ok){$('m').textContent=d.error||'Error';$('l').innerHTML='';return}
$('m').textContent=d.consultas.length+' consulta(s)';
$('l').innerHTML=d.consultas.map(c=>'<div class="card"><div><b>'+esc(c.codigo)+'</b> · '+esc(c.asunto)+' <span class="est">'+esc(c.estado)+'</span></div><div class="meta">'+esc(c.email)+(c.conCuenta?' · con cuenta (ve la respuesta en la app)':' · SIN cuenta: respondele por correo a esa dirección')+' · '+esc(c.motivo)+' · '+new Date(c.creadaEn).toLocaleString('es-AR')+'</div><div class="msg">'+esc(c.mensaje)+'</div>'+(c.tecnico?'<div class="meta">'+esc(c.tecnico)+'</div>':'')+(c.respuesta?'<div class="resp">'+esc(c.respuesta)+'</div>':'')+'<textarea id="r'+c.id+'" rows="3" placeholder="Tu respuesta"></textarea><button style="margin-top:8px" onclick="resp(\\''+c.id+'\\')">Responder</button>'+(c.resena?' <button style="margin-top:8px;background:#C93030;border-color:#C93030" onclick="elim(\\''+c.id+'\\',1)">Eliminar reseña y avisar al autor</button> <button style="margin-top:8px;background:#fff;color:#0B1437" onclick="elim(\\''+c.id+'\\',0)">Solo avisar al autor</button><div class="meta">Lo que escribas arriba se le envía al autor de la reseña.</div>':'')+'</div>').join('')}
async function elim(id,borrar){const m=$('r'+id).value;if(borrar&&!confirm('¿Eliminar esta reseña? No se puede deshacer.'))return;const r=await fetch('/api/soporte/admin/'+id+'/resena-'+(borrar?'eliminar':'avisar'),{method:'POST',headers:H(),body:JSON.stringify({mensaje:m})});const d=await r.json();if(!r.ok)return alert(d.error||'Error');alert(d.aviso||'Listo');cargar()}
async function resp(id){const t=$('r'+id).value;const r=await fetch('/api/soporte/admin/'+id+'/responder',{method:'POST',headers:H(),body:JSON.stringify({respuesta:t})});const d=await r.json();if(!r.ok)return alert(d.error||'Error');cargar()}
</script></body></html>`;

export default router;
