// Contenido del Centro de ayuda. Cada artículo describe algo que la app hace de verdad.
// cuerpo: lista de bloques. Un texto suelto es un párrafo; { pasos: [...] } es una lista numerada; { nota: "..." } es un aviso.

export const CATEGORIAS = [
  { id: "empezar", titulo: "Primeros pasos", desc: "Buscar negocios, mapa y favoritos", icono: "Compass", color: "#2F6FED", motivo: "otro" },
  { id: "cuenta", titulo: "Mi cuenta y acceso", desc: "Registrarte, usuario, nombre y contraseña", icono: "User", color: "#0B2A54", motivo: "cuenta" },
  { id: "negocio", titulo: "Mi negocio", desc: "Registrar, editar y administrar", icono: "Store", color: "#1E8A55", motivo: "negocio" },
  { id: "pagos", titulo: "Pagos y suscripción", desc: "Planes, pagos y vencimientos", icono: "CreditCard", color: "#C77A0A", motivo: "pagos" },
  { id: "asistente", titulo: "Chats y Mi Asistente", desc: "Hablar con un negocio", icono: "MessageCircle", color: "#7A4F9E", motivo: "asistente" },
  { id: "resenas", titulo: "Reseñas", desc: "Opinar y responder", icono: "Star", color: "#E08A1E", motivo: "resenas" },
  { id: "privacidad", titulo: "Privacidad y datos", desc: "Tus datos y notificaciones", icono: "Lock", color: "#4B5563", motivo: "cuenta" },
  { id: "problemas", titulo: "Algo no funciona", desc: "Soluciones a problemas comunes", icono: "Wrench", color: "#C1443A", motivo: "error" },
];

export const POPULARES = ["no-puedo-entrar", "registrar-negocio", "pague-no-aparece", "que-pasa-si-vence", "chat-no-aparece", "eliminar-cuenta"];

export const ARTICULOS = [
  /* ---------- Primeros pasos ---------- */
  {
    id: "que-es", cat: "empezar", titulo: "Qué es Mi Zona y cómo se usa",
    claves: "inicio explorar negocios zona localidad",
    cuerpo: [
      "Mi Zona reúne los negocios de tu localidad en un solo lugar. Podés ver qué hay cerca, mirar sus fotos, horarios y reseñas, y contactarlos por WhatsApp o por el chat de su asistente.",
      { pasos: ["Elegí tu zona en la parte de arriba del Inicio.", "Buscá por nombre o tocá una categoría.", "Abrí la ficha de un negocio para ver sus datos, cómo llegar y cómo contactarlo."] },
      "No necesitás cuenta para mirar negocios. La cuenta hace falta para chatear con un asistente, dejar reseñas o registrar tu propio negocio.",
    ],
    relacionados: ["buscar-filtros", "mapa", "favoritos"],
  },
  {
    id: "buscar-filtros", cat: "empezar", titulo: "Buscar y filtrar negocios",
    claves: "buscador categorias abiertos ahora cercanos recien agregados con asistente",
    cuerpo: [
      "En el Inicio podés escribir lo que buscás o elegir una categoría. Además hay filtros para quedarte solo con lo que te sirve, por ejemplo los negocios abiertos ahora, los recién agregados o los que tienen asistente.",
      "Si querés ordenarlos por cercanía, el navegador te va a pedir permiso para usar tu ubicación. Si no lo das, la búsqueda funciona igual, pero sin ordenar por distancia.",
    ],
    relacionados: ["ubicacion-no-funciona", "mapa"],
  },
  {
    id: "mapa", cat: "empezar", titulo: "Usar el mapa y cambiar la vista",
    claves: "mapa satelite relieve capas direccion como llegar",
    cuerpo: [
      "Desde el Inicio tocá “Ver en el mapa” para ver los negocios de Mi Zona en su dirección. Al tocar uno aparece su dirección completa y podés abrir su ficha.",
      "El botón de capas cambia entre Mapa (calles), Relieve y Satélite. Solo se marcan los negocios registrados en Mi Zona.",
      { nota: "Si un negocio no aparece en el mapa, puede ser que su dirección todavía no se haya podido ubicar. El dueño puede corregirla en Herramientas → Editar mis datos." },
    ],
    relacionados: ["direccion-mapa"],
  },
  {
    id: "favoritos", cat: "empezar", titulo: "Guardar negocios en favoritos",
    claves: "corazon guardar lista",
    cuerpo: [
      "Tocá el corazón en la ficha de un negocio para guardarlo. Lo encontrás después en Herramientas y desde Ajustes → Mi cuenta → Mis favoritos.",
      "Los favoritos se guardan en el dispositivo que estás usando. Si cambiás de celular o borrás los datos del navegador, no se transfieren.",
    ],
    relacionados: ["que-datos-guardamos"],
  },
  {
    id: "ranking", cat: "empezar", titulo: "Cómo funciona el ranking",
    claves: "puntaje podio comparar mejores",
    cuerpo: [
      "El ranking muestra un podio con los tres primeros negocios y la lista completa, con filtro por categoría. Cada negocio tiene un puntaje y barras para comparar con los demás.",
      "Dentro de la pantalla del ranking hay una explicación de cómo se calcula el puntaje.",
    ],
    relacionados: ["que-es"],
  },

  /* ---------- Cuenta ---------- */
  {
    id: "crear-cuenta", cat: "cuenta", titulo: "Crear una cuenta",
    claves: "registrarme registro google correo",
    cuerpo: [
      "Para usar Mi Zona necesitás una cuenta. Se crea en dos pasos: primero elegís tu cuenta de Google y después inventás tu usuario y tu contraseña.",
      { pasos: ["En la primera pantalla tocá “Empezar” y después “Registrarme”.", "Elegí la cuenta de Google con la que querés registrarte.", "Escribí tu usuario: de 5 a 20 caracteres, empieza con una letra (después podés usar números, punto o guion bajo). Si alguien ya lo usa, te avisamos para que elijas otro.", "Creá tu contraseña: 8 caracteres o más, sin espacios. Puede ser solo números, solo letras o una mezcla.", "Tocá “Crear mi cuenta”. Desde ese momento entrás directo a la app cada vez que la abrís."] },
      { nota: "Si ya usabas Mi Asistente o tenías un negocio cargado antes, registrate con la misma cuenta de Google para que se reconozca." },
    ],
    relacionados: ["no-puedo-entrar", "cambiar-nombre"],
  },
  {
    id: "no-puedo-entrar", cat: "cuenta", titulo: "No puedo iniciar sesión",
    claves: "error google contrasena olvide no entra acceso ventana",
    cuerpo: [
      "Probá primero con lo más común:",
      { pasos: ["Tocá “Acceder con Google” y elegí tu cuenta, o escribí el usuario y la contraseña que creaste al registrarte.", "También podés escribir tu correo: Google te pide la contraseña de ese correo en su propia página.", "Si usás usuario y contraseña, revisá las mayúsculas. Tras varios intentos fallidos hay que esperar un rato antes de volver a probar.", "Si usás Google y la ventana de cuentas no abre o da error, actualizá la página y desactivá bloqueadores de ventanas emergentes para este sitio.", "Probá desde otro navegador o desde el modo incógnito."] },
      "Si nada funciona, escribinos desde Soporte y contanos qué mensaje te aparece. Si no podés entrar, podés enviar la consulta igual: solo necesitamos tu correo para responderte.",
    ],
    relacionados: ["crear-cuenta", "cambiar-clave"],
    contactar: "cuenta",
  },
  {
    id: "cambiar-nombre", cat: "cuenta", titulo: "Cambiar mi usuario o mi nombre",
    claves: "perfil editar",
    cuerpo: [{ pasos: ["Andá a Ajustes → Mi cuenta.", "Escribí tu usuario nuevo en el campo Usuario.", "Tocá “Guardar usuario”."] }, "Tu correo no se puede cambiar desde la app."],
    relacionados: ["cambiar-usuario", "cambiar-clave"],
  },
  {
    id: "cambiar-usuario", cat: "cuenta", titulo: "Cambiar mi usuario",
    claves: "usuario nombre de usuario ocupado editar",
    cuerpo: [
      { pasos: ["Andá a Ajustes → Mi cuenta.", "Escribí tu usuario nuevo en el campo Usuario. Mientras escribís te avisamos si es válido y si está libre.", "Tocá “Guardar usuario”."] },
      "Tiene que tener entre 5 y 20 caracteres y empezar con una letra. Podés usar letras, números, punto y guion bajo. Si ya lo usa otra persona, vas a ver el aviso “Ese usuario ya está ocupado”.",
    ],
    relacionados: ["cambiar-clave", "no-puedo-entrar"],
  },
  {
    id: "cambiar-clave", cat: "cuenta", titulo: "Cambiar la contraseña y cerrar sesión en otros dispositivos",
    claves: "seguridad contrasena dispositivos sesion otro celular robaron",
    cuerpo: [
      "Entrá a Ajustes → Seguridad.",
      { pasos: ["Contraseña: escribí la actual y la nueva (8 caracteres o más, sin espacios; puede ser solo números, solo letras o ambos).", "Dispositivos: ves todos los dispositivos con tu sesión abierta y podés cerrar la sesión de cualquiera.", "Si no reconocés alguno, cerralo y cambiá tu contraseña."] },
      "Al cambiar la contraseña se cierran las sesiones de los demás dispositivos.",
    ],
    relacionados: ["alertas-inicio", "no-puedo-entrar"],
  },
  {
    id: "alertas-inicio", cat: "cuenta", titulo: "Alertas de inicio de sesión",
    claves: "notificacion nuevo dispositivo seguridad aviso",
    cuerpo: [
      "Si están activadas, te avisamos por notificación cuando alguien entra a tu cuenta desde un dispositivo nuevo. Se activan y desactivan en Ajustes → Seguridad → Alertas de inicio de sesión.",
      "Para que el aviso te llegue, también tenés que tener activadas las notificaciones en el dispositivo que usás todos los días.",
    ],
    relacionados: ["notificaciones", "cambiar-clave"],
  },
  {
    id: "eliminar-cuenta", cat: "cuenta", titulo: "Eliminar mi cuenta",
    claves: "borrar cuenta baja darme de baja",
    cuerpo: [
      { pasos: ["Andá a Ajustes → Mi cuenta y tocá “Eliminar mi cuenta”.", "Escribí ELIMINAR y confirmá que sos vos: con tu contraseña o volviendo a elegir tu cuenta de Google.", "Si tenés un negocio, tenés que confirmar que también se elimina."] },
      "Se borran tu cuenta, tu agenda, tus notificaciones, tus consultas a Soporte y las reseñas que escribiste. No se puede deshacer, y la suscripción pagada de un negocio no se reembolsa.",
      "Tus chats con los asistentes están en Mi Asistente y no se borran desde acá. Si querés una copia de tus datos antes, descargala desde Ajustes → Privacidad.",
    ],
    relacionados: ["descargar-datos"],
  },

  /* ---------- Negocio ---------- */
  {
    id: "registrar-negocio", cat: "negocio", titulo: "Registrar mi negocio",
    claves: "agregar negocio alta publicar mas",
    cuerpo: [
      { pasos: ["Iniciá sesión y tocá el botón “+” de la barra de abajo.", "Completá el formulario con los datos, la dirección, el horario y las fotos.", "Tocá “Aceptar” y elegí el plan: 1, 3 o 6 meses.", "Pagá con Mercado Pago. El negocio se publica solo cuando se confirma el pago."] },
      "Si no pagás, el negocio queda guardado pero oculto, y podés terminar el pago cuando quieras. Si ya pagaste Mi Asistente con la misma cuenta de Google, no pagás Mi Zona y se te muestra hasta cuándo queda activo.",
    ],
    relacionados: ["planes", "pague-no-aparece", "fotos-negocio"],
  },
  {
    id: "fotos-negocio", cat: "negocio", titulo: "Qué fotos puedo subir",
    claves: "logo portada fondo productos imagen",
    cuerpo: [
      "El formulario tiene tres lugares para fotos:",
      { pasos: ["Logo: una sola imagen.", "Foto de fondo del perfil: una sola, la elegís vos.", "Fotos de productos: todas las que quieras."] },
      "Si no elegís foto de fondo, el perfil muestra el ícono de tu rubro. Para cambiarla más adelante: Herramientas → Editar mis datos.",
    ],
    relacionados: ["editar-negocio"],
  },
  {
    id: "editar-negocio", cat: "negocio", titulo: "Editar los datos de mi negocio",
    claves: "cambiar telefono horario direccion modificar",
    cuerpo: [
      "Entrá a Herramientas y tocá “Editar mis datos”. Ahí cambiás el nombre, la descripción, el teléfono, las redes, el horario, la dirección y las fotos.",
      "Desde el mismo panel manejás las promociones, las reseñas, las historias, la búsqueda de personal y tu código QR.",
    ],
    relacionados: ["direccion-mapa", "responder-resena"],
  },
  {
    id: "direccion-mapa", cat: "negocio", titulo: "Mi negocio no aparece en el mapa",
    claves: "ubicacion direccion no se encuentra pin",
    cuerpo: [
      "El mapa necesita ubicar la dirección. Si el formulario te avisa que no pudo, escribí calle y número completos, y la localidad.",
      "Los negocios cargados sin coordenadas se ubican solos más tarde. Si pasó un buen rato y sigue sin aparecer, revisá que la dirección esté bien escrita en Herramientas → Editar mis datos.",
    ],
    relacionados: ["editar-negocio", "mapa"],
    contactar: "negocio",
  },
  {
    id: "agenda", cat: "negocio", titulo: "Usar la agenda del negocio",
    claves: "turnos eventos tareas recordatorios foto papel ia organizar",
    cuerpo: [
      "La agenda está en Herramientas → Mi agenda y es para quienes tienen un negocio en su cuenta. Tiene vistas Hoy, Semana y Tareas, y cada evento puede tener hora, duración, persona, notas y recordatorio.",
      "También podés importar eventos desde la foto de una agenda de papel o desde un mensaje: la IA propone y vos revisás y confirmás antes de guardar. Las funciones con IA necesitan la suscripción del negocio activa. La foto no se guarda: se analiza y se descarta.",
      "Si no querés que la IA use tu agenda, apagá “IA en mi agenda” en Ajustes → Privacidad.",
    ],
    relacionados: ["que-datos-guardamos"],
  },

  /* ---------- Pagos ---------- */
  {
    id: "planes", cat: "pagos", titulo: "Planes de suscripción",
    claves: "precio costo cuanto 1 mes 3 meses 6 meses descuento",
    cuerpo: [
      "Un negocio se muestra en Mi Zona mientras su suscripción esté activa. Hay tres planes: 1, 3 o 6 meses. Los planes más largos tienen descuento por mes.",
      "Antes de pagar siempre ves el precio exacto de cada plan y cuánto ahorrás. Los precios pueden cambiar con el tiempo.",
    ],
    relacionados: ["renovar", "pague-no-aparece"],
  },
  {
    id: "renovar", cat: "pagos", titulo: "Renovar o agregar meses",
    claves: "extender suscripcion vence",
    cuerpo: [
      { pasos: ["Andá a Herramientas → Mi suscripción.", "Elegí cuántos meses querés agregar.", "Pagá con Mercado Pago."] },
      "Los meses nuevos se suman a la fecha de vencimiento que ya tenías: no perdés los días que te quedaban.",
    ],
    relacionados: ["que-pasa-si-vence", "planes"],
  },
  {
    id: "que-pasa-si-vence", cat: "pagos", titulo: "Qué pasa si vence mi suscripción",
    claves: "vencimiento aviso deja de mostrarse oculto expira",
    cuerpo: [
      "Cuando vence, tu negocio deja de mostrarse a los clientes. No se borra: al renovar vuelve a aparecer.",
      "Te avisamos con un cartel dentro de la app y con una notificación 7, 3 y 1 día antes, y el día que vence. Para recibir las notificaciones, activalas en Ajustes → Notificaciones.",
      "El chat con el asistente de tu negocio depende de que Mi Asistente esté activo. Si vence, los chats no se pierden: reaparecen al renovar.",
    ],
    relacionados: ["renovar", "notificaciones"],
  },
  {
    id: "pague-no-aparece", cat: "pagos", titulo: "Pagué y mi negocio no aparece",
    claves: "pago mercado pago no se publico pendiente acreditado",
    cuerpo: [
      "El negocio se publica solo cuando Mercado Pago confirma el pago. A veces la confirmación tarda unos minutos.",
      { pasos: ["Esperá unos minutos y actualizá la página.", "Entrá a Ajustes → Mi cuenta → Mis negocios y mirá el estado: si dice “Esperando el pago”, todavía no recibimos la confirmación.", "Revisá en Mercado Pago que el pago figure como aprobado."] },
      "Si el pago está aprobado y pasó más de una hora, escribinos desde Soporte con el motivo “Pagos y suscripción” e indicá la fecha y el medio de pago. No hace falta que envíes datos de tu tarjeta.",
    ],
    relacionados: ["planes", "registrar-negocio"],
    contactar: "pagos",
  },

  /* ---------- Chats y Mi Asistente ---------- */
  {
    id: "chatear", cat: "asistente", titulo: "Chatear con el asistente de un negocio",
    claves: "chat consultar mensaje conversacion",
    cuerpo: [
      { pasos: ["Abrí la ficha del negocio.", "Tocá el botón de chat. Si no iniciaste sesión, te lo pedimos.", "Escribí tu consulta: el asistente responde por el negocio."] },
      "Tus chats quedan ligados a tu cuenta, así que los ves también desde otro dispositivo.",
    ],
    relacionados: ["chat-no-aparece", "mis-chats-puntos"],
  },
  {
    id: "chat-no-aparece", cat: "asistente", titulo: "Un negocio no tiene botón de chat",
    claves: "chat no aparece asistente puntos",
    cuerpo: [
      "El chat solo se muestra cuando el negocio tiene Mi Asistente activo. Si el negocio no lo contrató, o se le venció, el botón no aparece y podés contactarlo por WhatsApp o por teléfono desde su ficha.",
      "Si sos el dueño y querés tener el chat, activá Mi Asistente con la misma cuenta de Google con la que usás Mi Zona.",
    ],
    relacionados: ["chatear", "mis-chats-puntos"],
  },
  {
    id: "mis-chats-puntos", cat: "asistente", titulo: "Mis chats y mis puntos",
    claves: "historial conversaciones puntos canje",
    cuerpo: [
      "Tus conversaciones están en la pestaña Chats. Los puntos y canjes de cada negocio se ven en Herramientas.",
      "Aunque un negocio deje de tener Mi Asistente, los chats no se borran: si lo renueva, reaparecen y el asistente retoma lo que ya hablaron.",
    ],
    relacionados: ["busqueda-asistente"],
  },
  {
    id: "busqueda-asistente", cat: "asistente", titulo: "Búsqueda con asistente y mi ubicación",
    claves: "buscar recomendar ubicacion ultimos chats privacidad",
    cuerpo: [
      "La búsqueda con asistente usa tu ubicación para ordenar por cercanía, y la portada de inicio para mostrar el clima de donde estás, junto con un resumen corto de tus últimos chats para recomendarte mejor. La ubicación no se guarda.",
      "Podés apagar las dos cosas en Ajustes → Privacidad. Si las apagás, la búsqueda sigue funcionando, pero con menos datos.",
    ],
    relacionados: ["que-datos-guardamos", "ubicacion-no-funciona"],
  },

  /* ---------- Reseñas ---------- */
  {
    id: "dejar-resena", cat: "resenas", titulo: "Dejar una reseña",
    claves: "opinar calificar estrellas comentario",
    cuerpo: [
      { pasos: ["Abrí la ficha del negocio y andá a la parte de reseñas.", "Elegí de 1 a 5 estrellas y escribí tu opinión.", "Si no iniciaste sesión, te pedimos que lo hagas."] },
      "Tu reseña se muestra con el nombre que escribas al enviarla. Podés ver todas tus reseñas en Ajustes → Mi cuenta → Mis reseñas.",
    ],
    relacionados: ["borrar-resenas"],
  },
  {
    id: "borrar-resenas", cat: "resenas", titulo: "Borrar mis reseñas",
    claves: "eliminar opinion",
    cuerpo: [
      "Podés borrar todas tus reseñas juntas en Ajustes → Privacidad → Borrar mis reseñas. Dejan de verse en los negocios y no se puede deshacer.",
      "Las reseñas escritas antes de que existiera esta función no están ligadas a tu cuenta y no se pueden borrar desde ahí. Escribinos desde Soporte si necesitás sacar una.",
    ],
    relacionados: ["dejar-resena"],
    contactar: "resenas",
  },
  {
    id: "responder-resena", cat: "resenas", titulo: "Responder reseñas de mi negocio",
    claves: "dueño contestar respuesta",
    cuerpo: [
      "Entrá a Herramientas y abrí las reseñas de tu negocio. Desde ahí podés responder a cada una. Tu respuesta se muestra debajo de la reseña, a la vista de todos.",
    ],
    relacionados: ["editar-negocio"],
  },

  /* ---------- Privacidad ---------- */
  {
    id: "que-datos-guardamos", cat: "privacidad", titulo: "Qué datos guarda Mi Zona",
    claves: "informacion datos personales guardan",
    cuerpo: [
      "Con sesión, guardamos tu correo, tu nombre, tus reseñas, tu agenda si tenés un negocio, y los dispositivos que activaron notificaciones. Los favoritos, los chats guardados y los negocios vistos quedan en tu dispositivo.",
      "Podés ver todo esto, con las cantidades, en Ajustes → Privacidad → Lo que guardamos de vos.",
    ],
    relacionados: ["descargar-datos", "busqueda-asistente"],
  },
  {
    id: "descargar-datos", cat: "privacidad", titulo: "Descargar una copia de mis datos",
    claves: "exportar json bajar",
    cuerpo: [
      { pasos: ["Andá a Ajustes → Privacidad.", "En “Tus datos” tocá “Descargar”."] },
      "Se descarga un archivo con tu cuenta, tus negocios, tu agenda, tus reseñas y tus consultas a Soporte. Se puede pedir un número limitado de veces por hora.",
    ],
    relacionados: ["eliminar-cuenta"],
  },
  {
    id: "notificaciones", cat: "privacidad", titulo: "Activar o desactivar las notificaciones",
    claves: "avisos push celular permiso",
    cuerpo: [
      "Andá a Ajustes → Notificaciones y activalas en este dispositivo. El navegador te va a pedir permiso.",
      "Para dejar de recibirlas en todos tus dispositivos a la vez: Ajustes → Privacidad → Desactivar notificaciones.",
    ],
    relacionados: ["no-llegan-notificaciones"],
  },

  /* ---------- Problemas ---------- */
  {
    id: "no-cargan-negocios", cat: "problemas", titulo: "No cargan los negocios",
    claves: "error servidor lento pantalla vacia conexion",
    cuerpo: [
      { pasos: ["Revisá tu conexión a internet.", "Esperá unos segundos y actualizá: si hace rato que nadie usa la app, la primera carga puede tardar un poco más.", "Cerrá la app o la pestaña y volvé a abrirla."] },
      "Si sigue sin cargar después de unos minutos, escribinos desde Soporte con el motivo “Algo no funciona”.",
    ],
    relacionados: ["ubicacion-no-funciona"],
    contactar: "error",
  },
  {
    id: "no-llegan-notificaciones", cat: "problemas", titulo: "No me llegan las notificaciones",
    claves: "avisos push no suenan permiso bloqueado",
    cuerpo: [
      { pasos: ["Entrá a Ajustes → Notificaciones y verificá que estén activadas en este dispositivo.", "Revisá en la configuración del navegador que el sitio de Mi Zona tenga permiso para enviar notificaciones.", "Fijate que el celular no esté en modo ahorro de batería o “No molestar”, que a veces las bloquea.", "Si las desactivaste por error, volvelas a activar."] },
    ],
    relacionados: ["notificaciones", "alertas-inicio"],
    contactar: "error",
  },
  {
    id: "ubicacion-no-funciona", cat: "problemas", titulo: "La ubicación no funciona",
    claves: "gps cerca permiso ordenar cercanos",
    cuerpo: [
      "Para ordenar por cercanía, el navegador necesita permiso de ubicación. Si lo bloqueaste, habilitalo en la configuración del navegador para el sitio de Mi Zona y volvé a intentar.",
      "También revisá que la opción “Usar mi ubicación” esté activada en Ajustes → Privacidad y que el celular tenga la ubicación encendida.",
    ],
    relacionados: ["busqueda-asistente", "buscar-filtros"],
  },
  {
    id: "modo-oscuro", cat: "problemas", titulo: "Cambiar a modo oscuro",
    claves: "tema apariencia noche",
    cuerpo: ["Andá a Ajustes → Apariencia y elegí Claro, Oscuro o Automático. Automático sigue el modo de tu celular."],
    relacionados: [],
  },
];

export const articuloPorId = (id) => ARTICULOS.find((a) => a.id === id) || null;
export const categoriaPorId = (id) => CATEGORIAS.find((c) => c.id === id) || null;

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const textoDe = (a) => a.cuerpo.map((b) => (typeof b === "string" ? b : b.pasos ? b.pasos.join(" ") : b.nota || "")).join(" ");

// Busca artículos: cada palabra de la búsqueda suma puntos si aparece en el título, en las palabras clave o en el texto
export function buscarArticulos(consulta) {
  const palabras = norm(consulta).split(/\s+/).filter((p) => p.length > 2);
  if (!palabras.length) return [];
  return ARTICULOS.map((a) => {
    const t = norm(a.titulo), c = norm(a.claves), x = norm(textoDe(a));
    let puntos = 0;
    for (const p of palabras) {
      if (t.includes(p)) puntos += 5;
      if (c.includes(p)) puntos += 3;
      if (x.includes(p)) puntos += 1;
    }
    return { a, puntos };
  }).filter((r) => r.puntos > 0).sort((r1, r2) => r2.puntos - r1.puntos).map((r) => r.a);
}

// Artículos que conviene mostrar antes de escribir a Soporte sobre un tema
export function sugeridosPara(motivo) {
  const ids = {
    cuenta: ["no-puedo-entrar", "cambiar-clave", "eliminar-cuenta"],
    negocio: ["registrar-negocio", "editar-negocio", "direccion-mapa"],
    pagos: ["pague-no-aparece", "que-pasa-si-vence", "renovar"],
    asistente: ["chat-no-aparece", "chatear", "mis-chats-puntos"],
    resenas: ["dejar-resena", "borrar-resenas", "responder-resena"],
    error: ["no-cargan-negocios", "no-llegan-notificaciones", "ubicacion-no-funciona"],
    sugerencia: [],
    otro: ["que-es", "buscar-filtros"],
  }[motivo] || [];
  return ids.map(articuloPorId).filter(Boolean);
}
