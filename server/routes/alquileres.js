import express from "express";
import crypto from "crypto";
import Alquiler from "../models/Alquiler.js";
import { identificar, requiereUsuario, limitar } from "../utils/auth.js";
import { declaracionPendiente } from "../utils/perfil.js";
import { sanearLocalidad, sanearFoto } from "../utils/perfil.js";

const router = express.Router();
router.use(identificar);
const CATEGORIAS = ["viviendas", "espacios", "eventos", "herramientas", "equipos", "otros"];
const limpiar = (v, max = 300) => String(v ?? "").replace(/[\u0000-\u001F\u007F<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const norm = (v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const publico = (a) => ({ id:a.id, nombre:a.nombre, categoria:a.categoria, descripcion:a.descripcion, localidad:a.localidad, zona:a.zona, direccion:a.direccion, vivienda:a.vivienda, ig:a.ig, facebook:a.facebook, logo:a.logo, condiciones:a.condiciones, articulos:a.articulos, status:a.status, updatedAt:a.updatedAt, tieneWhatsapp:!!(a.whatsapp && a.mostrarWhatsapp) });
const dueno = (a) => ({ ...publico(a), whatsapp:a.whatsapp, mostrarWhatsapp:a.mostrarWhatsapp, apareceEnBusquedas:a.apareceEnBusquedas });
function sanear(b) {
  const nombre=limpiar(b?.nombre,60), categoria=String(b?.categoria||"");
  if(nombre.length<2) return {error:"Escribí un nombre de al menos 2 caracteres."};
  if(!CATEGORIAS.includes(categoria)) return {error:"Elegí una categoría válida."};
  const localidad=sanearLocalidad(b?.localidad); if(!localidad) return {error:"Elegí provincia y localidad de la lista."};
  const descripcion=limpiar(b?.descripcion,300), zona=limpiar(b?.zona,80), direccion=limpiar(b?.direccion,120), condiciones=limpiar(b?.condiciones,500);
  const viv=b?.vivienda||{}; const vivienda=categoria==="viviendas"?{tipo:limpiar(viv.tipo,40),dormitorios:viv.dormitorios!==""&&viv.dormitorios!=null&&Number.isInteger(Number(viv.dormitorios))&&Number(viv.dormitorios)>=0&&Number(viv.dormitorios)<=30?Number(viv.dormitorios):null,banos:viv.banos!==""&&viv.banos!=null&&Number.isInteger(Number(viv.banos))&&Number(viv.banos)>=0&&Number(viv.banos)<=20?Number(viv.banos):null,ambientes:viv.ambientes!==""&&viv.ambientes!=null&&Number.isInteger(Number(viv.ambientes))&&Number(viv.ambientes)>=0&&Number(viv.ambientes)<=30?Number(viv.ambientes):null}:{tipo:"",dormitorios:null,banos:null,ambientes:null};
  let whatsapp=String(b?.whatsapp||"").replace(/\D/g,"");
  if(whatsapp && whatsapp.length===10) whatsapp="549"+whatsapp;
  if(whatsapp && (whatsapp.length<10||whatsapp.length>15)) return {error:"Revisá el número de WhatsApp e incluí código de país y área."};
  const mostrarWhatsapp=b?.mostrarWhatsapp===true; if(mostrarWhatsapp&&!whatsapp) return {error:"Cargá un WhatsApp antes de habilitar el contacto."};
  const articulos=Array.isArray(b?.articulos)?b.articulos.slice(0,30).map(x=>({id:String(x.id||crypto.randomBytes(6).toString("hex")),nombre:limpiar(x.nombre,80),foto:x.foto?sanearFoto(x.foto)||"":"",precio:limpiar(x.precio,80),estado:["disponible","ocupado","no_disponible"].includes(x.estado)?x.estado:"disponible"})):[];
  if(articulos.some(x=>x.nombre.length<2)) return {error:"Cada artículo necesita un nombre de al menos 2 caracteres."};
  if(!articulos.length) return {error:"Agregá al menos un artículo o espacio que ofrecés en alquiler."};
  const logo=b?.logo?sanearFoto(b.logo)||"":"";
  return {datos:{nombre,categoria,descripcion,localidad,zona,direccion,condiciones,vivienda,whatsapp,mostrarWhatsapp,ig:limpiar(b?.ig,100),facebook:limpiar(b?.facebook,200),logo,articulos}};
}
const visible = {status:"active", apareceEnBusquedas:{$ne:false}};
const mio = async(req,res)=>{const a=await Alquiler.findOne({id:String(req.params.id||"")}); if(!a||a.ownerId!==String(req.actor.usuario._id)){res.status(404).json({error:"No encontramos esa ficha."});return null;}return a;};
router.get("/mio", requiereUsuario, async(req,res)=>{try{const a=await Alquiler.findOne({ownerId:String(req.actor.usuario._id)}).lean();res.json({alquiler:a?dueno(a):null});}catch(e){console.error(e);res.status(500).json({error:"No se pudo cargar tu ficha de alquileres."});}});
router.get("/", limitar("alquileres-lista",240,600000), async(req,res)=>{try{
 const f={...visible}; if(req.query.categoria){if(!CATEGORIAS.includes(String(req.query.categoria)))return res.status(400).json({error:"Categoría inválida."});f.categoria=String(req.query.categoria);}
 if(req.query.dormitorios){const d=Number(req.query.dormitorios);if(!Number.isInteger(d)||d<0||d>30)return res.status(400).json({error:"Filtro de dormitorios inválido."});f["vivienda.dormitorios"]={$gte:d};}
 for(const [key,path,re] of [["provinciaId","localidad.provinciaId",/^\d{2}$/],["departamentoId","localidad.departamentoId",/^\d{5}$/],["localidadId","localidad.localidadId",/^\d{5,12}$/]]) if(req.query[key]){if(!re.test(String(req.query[key])))return res.status(400).json({error:"Filtro de localidad inválido."});f[path]=String(req.query[key]);}
 const q=norm(limpiar(req.query.q,60)); if(q.length>=2) f.textoBusqueda={$regex:q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")};
 const pagina=Math.min(50,Math.max(1,parseInt(req.query.pagina,10)||1)), POR_PAGINA=20;const [total,filas]=await Promise.all([Alquiler.countDocuments(f),Alquiler.find(f).sort({updatedAt:-1,_id:1}).skip((pagina-1)*POR_PAGINA).limit(POR_PAGINA).lean()]);res.json({alquileres:filas.map(publico),total,pagina,hayMas:pagina*POR_PAGINA<total});
 }catch(e){console.error(e);res.status(500).json({error:"No se pudieron cargar los alquileres."});}});
router.get("/:id", limitar("alquiler-ficha",240,600000), async(req,res)=>{try{const a=await Alquiler.findOne({id:String(req.params.id),...visible}).lean();if(!a)return res.status(404).json({error:"Este alquiler ya no está disponible."});res.json({alquiler:publico(a)});}catch(e){res.status(500).json({error:"No se pudo cargar el alquiler."});}});
router.post("/:id/contacto", limitar("alquiler-contacto",40,3600000), async(req,res)=>{try{const a=await Alquiler.findOne({id:String(req.params.id),...visible}).lean();if(!a?.whatsapp||!a.mostrarWhatsapp)return res.status(404).json({error:"Esta ficha no tiene WhatsApp disponible."});const msg=limpiar(req.body?.mensaje,250);res.json({url:`https://wa.me/${a.whatsapp}?text=${encodeURIComponent(msg)}`});}catch(e){res.status(500).json({error:"No se pudo abrir el contacto."});}});
router.post("/", requiereUsuario, limitar("alquiler-crear",10,3600000), async(req,res)=>{try{const u=req.actor.usuario;if(declaracionPendiente(u))return res.status(403).json({error:"Primero completá tu cuenta (18 años o más, términos y localidad)."});const ownerId=String(u._id);if(await Alquiler.exists({ownerId}))return res.status(409).json({error:"Ya tenés una ficha de alquileres. Podés editarla desde Mis alquileres."});const {datos,error}=sanear(req.body);if(error)return res.status(400).json({error});const a=await Alquiler.create({...datos,id:crypto.randomBytes(8).toString("hex"),ownerId,status:"active",textoBusqueda:norm([datos.nombre,datos.categoria,datos.descripcion,datos.zona,datos.localidad.localidad].join(" "))});res.status(201).json({alquiler:dueno(a.toObject())});}catch(e){if(e?.code===11000)return res.status(409).json({error:"Ya tenés una ficha de alquileres."});console.error(e);res.status(500).json({error:"No se pudo guardar la ficha."});}});
router.put("/:id", requiereUsuario, limitar("alquiler-editar",60,3600000), async(req,res)=>{try{const a=await mio(req,res);if(!a)return;const {datos,error}=sanear({...a.toObject(),...req.body});if(error)return res.status(400).json({error});a.set({...datos,textoBusqueda:norm([datos.nombre,datos.categoria,datos.descripcion,datos.zona,datos.localidad.localidad].join(" "))});await a.save();res.json({alquiler:dueno(a.toObject())});}catch(e){console.error(e);res.status(500).json({error:"No se pudo guardar la ficha."});}});
router.put("/:id/estado", requiereUsuario, async(req,res)=>{try{const a=await mio(req,res);if(!a)return;if(!["active","paused"].includes(req.body?.status))return res.status(400).json({error:"Estado inválido."});a.status=req.body.status;await a.save();res.json({alquiler:dueno(a.toObject())});}catch(e){res.status(500).json({error:"No se pudo cambiar el estado."});}});
router.put("/:id/articulos/:articuloId/estado", requiereUsuario, async(req,res)=>{try{const a=await mio(req,res);if(!a)return;const item=a.articulos.find(x=>x.id===String(req.params.articuloId));if(!item)return res.status(404).json({error:"No encontramos ese artículo."});if(!["disponible","ocupado","no_disponible"].includes(req.body?.estado))return res.status(400).json({error:"Estado inválido."});item.estado=req.body.estado;await a.save();res.json({alquiler:dueno(a.toObject())});}catch(e){res.status(500).json({error:"No se pudo actualizar el artículo."});}});
router.delete("/:id", requiereUsuario, limitar("alquiler-borrar",30,3600000), async(req,res)=>{try{const a=await mio(req,res);if(!a)return;await Alquiler.deleteOne({_id:a._id});res.json({ok:true});}catch(e){res.status(500).json({error:"No se pudo eliminar la ficha."});}});
export default router;
