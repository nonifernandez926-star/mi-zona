// Página del panel de moderación (Fase 8). Se sirve desde /api/moderacion/panel. Todo texto que viene del servidor se inserta con textContent (nunca como HTML).
// No usa comillas invertidas ni ${} dentro del script: este archivo es una sola plantilla.
const SCRIPT = String.raw`
const $=(s,r)=>(r||document).querySelector(s);
let TOKEN=sessionStorage.getItem('mzmod')||'';
let TAB='abierta';
const h=(tag,attrs,...hijos)=>{const e=document.createElement(tag);for(const k in(attrs||{})){if(k==='class')e.className=attrs[k];else if(k.startsWith('on'))e.addEventListener(k.slice(2),attrs[k]);else e.setAttribute(k,attrs[k])}for(const c of hijos.flat()){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(String(c)))}return e};
const fecha=f=>f?new Date(f).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'}):'';
async function api(ruta,metodo,cuerpo){
  const r=await fetch('/api/moderacion/admin'+ruta,{method:metodo||'GET',headers:{'Content-Type':'application/json',...(TOKEN?{Authorization:'Bearer '+TOKEN}:{})},body:cuerpo?JSON.stringify(cuerpo):undefined});
  const d=await r.json().catch(()=>({}));
  if(r.status===401&&d.codigo==='admin_sesion'){TOKEN='';sessionStorage.removeItem('mzmod');pintar();throw new Error(d.error)}
  if(!r.ok)throw new Error(d.error||'Error');
  return d;
}
function aviso(t,mal){const a=$('#aviso');a.textContent=t||'';a.className=mal?'mal':'bien';if(t)setTimeout(()=>{if(a.textContent===t)a.textContent=''},6000)}
function login(){
  const clave=h('input',{type:'password',placeholder:'Clave del equipo',autocomplete:'off'});
  const cod=h('input',{type:'text',inputmode:'numeric',maxlength:'7',placeholder:'Código de 6 cifras',autocomplete:'one-time-code'});
  const ir=async()=>{try{const d=await api('/login','POST',{clave:clave.value,codigo:cod.value});TOKEN=d.token;sessionStorage.setItem('mzmod',TOKEN);pintar()}catch(e){aviso(e.message,1)}};
  cod.addEventListener('keydown',e=>{if(e.key==='Enter')ir()});
  return h('div',{class:'card'},h('h2',null,'Ingresar'),h('p',{class:'meta'},'Clave del equipo y el código actual de tu app autenticadora. La sesión dura 30 minutos.'),clave,cod,h('button',{onclick:ir},'Ingresar'));
}
function etiqueta(g){return g.vivo.existe?(g.vivo.oculto?'Oculto por el equipo':'Visible'):'Ya no existe'}
function tarjetaDenuncia(g){
  const motivo=h('textarea',{rows:'3',placeholder:'Motivo (lo va a leer la persona, con respeto y sin acusaciones): mínimo 10 letras'});
  const dias=h('select',null,...[['1','1 día'],['3','3 días'],['7','7 días'],['15','15 días'],['30','30 días'],['90','90 días'],['perm','Permanente']].map(([v,t])=>h('option',{value:v},t)));
  const act=(ruta,cuerpo,conf)=>async()=>{if(conf&&!confirm(conf))return;try{const d=await api('/denuncias/'+g.denunciaId+ruta,'POST',cuerpo());aviso('Listo. Cerradas: '+d.cerradas+'. '+(d.aviso||''));cargar()}catch(e){aviso(e.message,1)}};
  const mot=()=>({motivo:motivo.value});
  const botones=[];
  if(g.estado==='abierta'){
    if(g.objetoTipo==='perfil')botones.push(h('button',{class:'peligro',onclick:act('/limpiar-perfil',mot,'¿Quitar la foto y la descripción de este perfil?')},'Quitar foto y descripción'));
    else botones.push(h('button',{class:'peligro',onclick:act('/ocultar',mot,'¿Ocultar este contenido? Su dueño será avisado.')},'Ocultar contenido'));
    botones.push(h('button',{onclick:act('/advertir',mot,'¿Enviar una advertencia a su dueño?')},'Advertir al dueño'));
    botones.push(dias,h('button',{class:'peligro',onclick:act('/suspender',()=>({motivo:motivo.value,permanente:dias.value==='perm',dias:Number(dias.value)||0}),'¿Suspender la cuenta de su dueño?')},'Suspender cuenta'));
    botones.push(h('button',{class:'claro',onclick:act('/descartar',()=>({nota:motivo.value}),'¿Descartar la denuncia? No se toma ninguna medida.')},'Descartar denuncia'));
  }
  return h('div',{class:'card'},
    h('div',null,h('b',null,g.tipo),' · ',h('b',null,g.snapshot&&g.snapshot.titulo||'(sin título)'),' ',h('span',{class:'est'},etiqueta(g)),' ',h('span',{class:'est '+(g.cantidad>1?'rojo':'')},g.cantidad+' denuncia'+(g.cantidad>1?'s':''))),
    h('div',{class:'meta'},'Dueño: ',g.dueno?('@'+(g.dueno.usuario||'sin usuario')+' · '+g.dueno.nombre+(g.duenoSuspendido?' · SUSPENDIDO':'')):'sin cuenta (negocio viejo)',' · id: ',g.objetoId),
    g.snapshot&&g.snapshot.resumen?h('div',{class:'msg'},g.snapshot.resumen):null,
    g.snapshot&&g.snapshot.zona?h('div',{class:'meta'},'Zona: '+g.snapshot.zona):null,
    ...(g.snapshot&&g.snapshot.fotos||[]).slice(0,3).map(u=>/^https:\/\//.test(u)?h('a',{href:u,target:'_blank',rel:'noopener noreferrer',class:'meta'},'Ver foto '):null),
    h('ul',null,...g.denuncias.map(d=>h('li',null,h('b',null,d.motivo),' · ',fecha(d.fecha),' · ',d.codigo,d.detalle?(' — '+d.detalle):''))),
    g.estado!=='abierta'&&g.resolucion?h('div',{class:'resp'},'Resuelta: '+g.resolucion.accion+' · '+fecha(g.resolucion.en)+(g.resolucion.nota?(' — '+g.resolucion.nota):'')):null,
    g.estado==='abierta'?[motivo,h('div',{class:'fila'},...botones)]:null);
}
function tarjetaApelacion(a){
  const resp=h('textarea',{rows:'3',placeholder:'Respuesta que va a leer la persona'});
  const dec=d=>async()=>{if(!confirm(d==='aceptar'?'¿Aceptar la apelación? Se deshace la medida.':'¿Rechazar la apelación?'))return;try{await api('/apelaciones/'+a.id,'POST',{decision:d,respuesta:resp.value});aviso('Listo.');cargar()}catch(e){aviso(e.message,1)}};
  return h('div',{class:'card'},h('div',null,h('b',null,'@'+(a.usuario&&a.usuario.usuario||'?')),' · ',a.tipo,' ',h('span',{class:'est'},a.estadoMedida)),
    h('div',{class:'meta'},'Medida: '+a.motivo+(a.objeto?(' · '+a.objeto.tipo+': '+a.objeto.titulo):'')+' · apelada '+fecha(a.creadaEn)),
    h('div',{class:'msg'},a.texto),
    a.respuesta?h('div',{class:'resp'},a.respuesta):null,
    TAB==='pendiente'?[resp,h('div',{class:'fila'},h('button',{onclick:dec('aceptar')},'Aceptar y deshacer la medida'),h('button',{class:'peligro',onclick:dec('rechazar')},'Rechazar'))]:null);
}
function cuentas(){
  const q=h('input',{type:'text',placeholder:'Usuario (mínimo 3 letras)'});
  const sal=h('div');
  const buscar=async()=>{try{const d=await api('/usuarios?q='+encodeURIComponent(q.value));sal.replaceChildren(...d.usuarios.map(u=>{
    const motivo=h('textarea',{rows:'2',placeholder:'Motivo (mínimo 10 letras)'});
    const dias=h('select',null,...[['1','1 día'],['3','3 días'],['7','7 días'],['15','15 días'],['30','30 días'],['90','90 días'],['perm','Permanente']].map(([v,t])=>h('option',{value:v},t)));
    const post=(r,c,conf)=>async()=>{if(conf&&!confirm(conf))return;try{await api('/usuarios/'+u.id+r,'POST',c());aviso('Listo.');buscar()}catch(e){aviso(e.message,1)}};
    return h('div',{class:'card'},h('div',null,h('b',null,'@'+u.usuario),' · ',u.nombre,' ',u.suspension?h('span',{class:'est rojo'},u.suspension.permanente?'SUSPENDIDO (permanente)':'SUSPENDIDO hasta '+fecha(u.suspension.hasta)):h('span',{class:'est'},'Activo')),
      h('div',{class:'meta'},'Denuncias recibidas: '+u.denunciasRecibidas+' · cuenta creada '+fecha(u.desde)),
      h('ul',null,...u.medidas.map(m=>h('li',null,m.tipo+' · '+m.estado+' · '+fecha(m.desde)+' — '+m.motivo))),
      motivo,h('div',{class:'fila'},h('button',{onclick:post('/advertir',()=>({motivo:motivo.value}),'¿Enviar advertencia?')},'Advertir'),dias,
        h('button',{class:'peligro',onclick:post('/suspender',()=>({motivo:motivo.value,permanente:dias.value==='perm',dias:Number(dias.value)||0}),'¿Suspender esta cuenta?')},'Suspender'),
        u.suspension?h('button',{class:'claro',onclick:post('/levantar',()=>({nota:motivo.value}),'¿Levantar la suspensión?')},'Levantar suspensión'):null));
  }));if(!d.usuarios.length)sal.textContent='Sin resultados.'}catch(e){aviso(e.message,1)}};
  return h('div',null,h('div',{class:'fila'},q,h('button',{onclick:buscar},'Buscar')),sal);
}
async function cargar(){
  const l=$('#lista');l.replaceChildren(h('p',{class:'meta'},'Cargando…'));
  try{
    if(TAB==='cuentas'){l.replaceChildren(cuentas());return}
    if(TAB==='registro'){const d=await api('/registro');l.replaceChildren(...d.acciones.map(a=>h('div',{class:'card chico'},h('b',null,a.accion),' · ',fecha(a.fecha),' · IP ',a.ip||'?',h('div',{class:'meta'},(a.objetivo&&a.objetivo.tipo?(a.objetivo.tipo+' '+a.objetivo.id+' · '):'')+(a.detalle||''))),),d.acciones.length?null:h('p',{class:'meta'},'Sin movimientos.'));return}
    if(TAB==='pendiente'||TAB==='aceptada'||TAB==='rechazada'){const d=await api('/apelaciones?estado='+TAB);l.replaceChildren(...d.apelaciones.map(tarjetaApelacion),d.apelaciones.length?null:h('p',{class:'meta'},'No hay apelaciones.'));return}
    const d=await api('/denuncias?estado='+TAB);l.replaceChildren(...d.grupos.map(tarjetaDenuncia),d.grupos.length?null:h('p',{class:'meta'},'No hay denuncias en esta lista.'));
  }catch(e){l.replaceChildren(h('p',{class:'mal'},e.message))}
}
function pintar(){
  const r=$('#raiz');
  if(!TOKEN){r.replaceChildren(login());return}
  const tabs=[['abierta','Denuncias abiertas'],['pendiente','Apelaciones'],['resuelta','Resueltas'],['descartada','Descartadas'],['cuentas','Cuentas'],['registro','Registro']];
  r.replaceChildren(h('div',{class:'fila'},...tabs.map(([id,t])=>h('button',{class:id===TAB?'':'claro',onclick:()=>{TAB=id;pintar()}},t)),h('button',{class:'claro',onclick:()=>{TOKEN='';sessionStorage.removeItem('mzmod');pintar()}},'Salir')),h('div',{id:'lista'}));
  cargar();
}
pintar();
`;

export const PANEL_MODERACION = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Moderación · Mi Zona</title><style>
body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#F3F6FB;color:#0B1220}main{max-width:820px;margin:0 auto;padding:18px}
h1{font-size:20px;margin:0 0 14px}h2{font-size:17px;margin:0 0 6px}.fila{display:flex;gap:8px;margin:10px 0;flex-wrap:wrap;align-items:center}
input,textarea,select,button{font:inherit;padding:9px 11px;border:1px solid #CBD5E1;border-radius:8px;background:#fff;max-width:100%}
textarea,input[type=password],input[type=text]{width:100%;box-sizing:border-box;margin:6px 0}
button{background:#0B2A54;color:#fff;border-color:#0B2A54;cursor:pointer}button.peligro{background:#C93030;border-color:#C93030}button.claro{background:#fff;color:#0B1437}
.card{background:#fff;border:1px solid #E1E8F2;border-radius:12px;padding:14px;margin:10px 0}.chico{padding:8px 12px}
.meta{font-size:13px;color:#4B5563;overflow-wrap:anywhere}.est{font-size:12px;font-weight:600;padding:2px 8px;border-radius:99px;background:#E8F0FE;color:#2F6FED}.est.rojo{background:#FDE8E8;color:#C93030}
.msg{white-space:pre-wrap;margin:8px 0}.resp{background:#E4F3EA;border-radius:8px;padding:10px;margin-top:8px;white-space:pre-wrap}
#aviso{position:sticky;top:0;padding:8px 12px;border-radius:8px;margin-bottom:8px}#aviso:empty{display:none}.bien{background:#E4F3EA}.mal{background:#FDE8E8;color:#9A1F1F}ul{padding-left:18px;margin:8px 0}
</style></head><body><main><h1>Moderación de Mi Zona</h1><div id="aviso" role="status"></div><div id="raiz"></div></main><script>${SCRIPT}</script></body></html>`;
