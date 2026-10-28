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
      "Tus chats con los asistentes están en Mi Asistente: al eliminar tu cuenta se los pedimos borrar y tus fotos también se borran. Si querés una copia de tus datos antes, descargala desde Ajustes → Privacidad.",
    ],
    relacionados: ["descargar-datos"],
  },

  /* ---------- Negocio ---------- */
  {
    id: "registrar-negocio", cat: "negocio", titulo: "Registrar mi negocio",
    claves: "agregar negocio alta publicar mas",
    cuerpo: [
      { pasos: ["Iniciá sesión y tocá el botón “+” de la barra de abajo.", "Completá el formulario con los datos, la dirección, el horario y las fotos.", "Tocá “Aceptar”: tu primer mes es gratis, sin tarjeta.", "Cuando termine, elegí un plan de 1, 3 o 6 meses y pagá con Google Play."] },
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
    id: "oficios-ofrecer", cat: "negocio", titulo: "Ofrecer mis servicios (oficios)",
    claves: "oficio oficios servicios electricista plomero ficha rubros whatsapp disponible ocupado mis fichas",
    cuerpo: [
      "Si hacés un trabajo (electricista, plomero, jardinero, fletes...), podés tener una ficha de oficios en Mi Zona. Es una sola ficha por persona y podés elegir varios rubros: aparecés en la búsqueda de cada uno.",
      { pasos: ["Tocá el botón + y elegí «Ofrecer mis servicios» (o entrá desde la pestaña Oficios del Inicio).", "Elegí tus rubros, contá qué hacés y elegí tu localidad. El resto es opcional: dirección, WhatsApp, redes, fotos, horarios y precio orientativo.", "Tocá «Activar mi ficha». Antes te avisamos que va a ser pública."] },
      "Desde la pestaña Negocio, abriendo tu ficha, podés marcar «Disponible hoy» u «Ocupado» con un toque, editar tu ficha, pausarla (deja de verse sin borrar nada) o eliminarla.",
      { nota: "«Disponible hoy» se apaga solo a medianoche. Mi Zona no verifica ni certifica a quienes publican sus servicios." },
    ],
    relacionados: ["oficios-buscar", "privacidad-fichas"],
  },
  {
    id: "oficios-buscar", cat: "empezar", titulo: "Buscar un oficio o servicio",
    claves: "buscar oficio servicio electricista plomero whatsapp contactar rubro zona",
    cuerpo: [
      "En el Inicio elegí la pestaña «Oficios». Ves a los profesionales de la zona que tenés elegida arriba (con los recomendados primero); filtrá por rubro o escribí lo que necesitás. Si no hay nadie, tocá «Ver toda la provincia».",
      { pasos: ["Abrí la ficha para ver qué hace, dónde trabaja, horarios y precio orientativo.", "Si tiene botón de WhatsApp, tocalo: se abre el chat con un mensaje que podés cambiar antes de enviarlo.", "Pedí presupuesto y referencias antes de contratar."] },
      { nota: "Mi Zona no envía mensajes por vos: solo abre WhatsApp con el texto para que lo revises." },
    ],
    relacionados: ["oficios-ofrecer"],
  },
  {
    id: "alquileres-ofrecer", cat: "negocio", titulo: "Ofrecer algo en alquiler",
    claves: "alquiler alquileres alquilar casa departamento salon sillas mesas pelotero herramientas articulos disponible ocupado ya no lo tengo mis fichas",
    cuerpo: [
      "Si alquilás viviendas, salones, sillas, mesas, peloteros, herramientas u otras cosas, armá una ficha de alquiler con tus artículos. Podés tener hasta 5 fichas (por ejemplo, una de eventos y otra de herramientas).",
      { pasos: ["Tocá el botón + y elegí «Ofrecer en alquiler» (o entrá desde la pestaña Alquileres del Inicio).", "Elegí la categoría y qué alquilás, contá cómo trabajás y elegí tu localidad. Dirección, WhatsApp, redes, fotos y condiciones son opcionales.", "Cargá al menos un artículo: nombre, precio (por hora, día, semana, mes o «Consultar precio») y, si querés, una foto.", "Tocá «Activar mi ficha». Antes te avisamos que va a ser pública."] },
      "Desde Negocio → tu ficha de alquiler → Artículos cambiás el estado de cada uno con un toque: Disponible, Ocupado o Ya no lo tengo (este último lo oculta al público). También podés agregar, editar o quitar artículos sin tocar el resto de la ficha, y pausar o eliminar la ficha entera.",
      { nota: "Si pasan más de 30 días sin confirmar un artículo, se muestra como «Sin confirmar» para no prometer lo que quizá ya no está. Con «Todo sigue igual» lo renovás de un toque. Mi Zona no maneja pagos ni reservas de alquileres." },
    ],
    relacionados: ["alquileres-buscar", "privacidad-fichas"],
  },
  {
    id: "alquileres-buscar", cat: "empezar", titulo: "Buscar un alquiler",
    claves: "buscar alquiler alquileres casa departamento habitacion salon quincho sillas mesas pelotero herramientas estafa",
    cuerpo: [
      "En el Inicio elegí la pestaña «Alquileres». Se muestra la zona que tenés elegida arriba. Elegí una categoría (viviendas y espacios, cumpleaños y eventos, herramientas y equipos u otros), afiná por tipo y ajustá la zona. En viviendas también podés filtrar por dormitorios y amoblado.",
      { pasos: ["Abrí la ficha para ver sus artículos, precios, condiciones y qué está disponible.", "Fijate cuánto hace que se actualizó: lo «Sin confirmar» conviene preguntarlo antes.", "Si tiene botón de WhatsApp, tocalo: se abre el chat con un mensaje que podés cambiar antes de enviarlo."] },
      { nota: "No pagues por adelantado sin ver el lugar o a la persona. Mi Zona no maneja pagos ni reservas: el acuerdo es entre ustedes." },
    ],
    relacionados: ["alquileres-ofrecer"],
  },
  {
    id: "buscador-unico", cat: "empezar", titulo: "Buscar en todo Mi Zona",
    claves: "buscar buscador negocios oficios alquileres sugerencias recientes filtros ampliar zona ia inteligencia artificial frase lenguaje natural",
    cuerpo: [
      "Con un solo buscador encontrás negocios, oficios y alquileres. Los resultados aparecen separados por tipo.",
      { pasos: ["En Inicio, sin resultados en una pestaña, tocá «Buscar en todo Mi Zona», o usá el botón de la lupa para el asistente.", "Elegí qué ver (Todo, Negocios, Oficios o Alquileres) y, si querés, una categoría y la zona.", "Si no hay resultados, tocá «Ampliar la búsqueda» para sumar localidades cercanas."] },
      "Si escribís una frase («necesito alguien que me corte el pasto») o la búsqueda común no encuentra nada, la ayuda con IA puede interpretar lo que pedís y buscar por vos. Antes de usarla por primera vez te contamos qué se envía y podés decir que no.",
      { nota: "Las búsquedas recientes quedan solo en tu celular. Podés borrarlas con «Borrar»." },
      { nota: "A la IA solo viaja el texto que escribiste en el buscador, sin tu nombre ni datos de tu cuenta. No publica nada ni envía mensajes, y lo que ves son siempre fichas reales de Mi Zona. Si preferís no usarla, tocá «Dejar de usar la ayuda con IA»: el buscador común sigue igual." },
    ],
    relacionados: ["favoritos-fichas"],
  },
  {
    id: "favoritos-fichas", cat: "empezar", titulo: "Guardar favoritos y compartir",
    claves: "favoritos corazon guardar compartir mantener apretado pulsacion larga zona fecha",
    cuerpo: [
      "Tocá el corazón en un negocio, un oficio o un alquiler para guardarlo. En Favoritos podés filtrar por tipo, zona y fecha.",
      { pasos: ["Para compartir una ficha, mantenela apretada un momento o tocá el ícono de compartir dentro de la ficha.", "Se envía un texto breve con el enlace para descargar Mi Zona (no un enlace a la ficha).", "Si una ficha guardada se pausa o vence, deja de verse en Favoritos y vuelve sola si se reactiva."] },
    ],
    relacionados: ["buscador-unico"],
  },
  {
    id: "comunidad", cat: "empezar", titulo: "Comunidad: publicar y ver lo de tu zona",
    claves: "comunidad avisos seguridad perdido encontrado ayuda regalo deporte evento feria sorteo rifa publicar gratis vence departamento",
    cuerpo: [
      "En Comunidad los vecinos publican avisos de la zona, cosas perdidas o encontradas, ayuda, regalos, deportes, eventos y sorteos. Publicar es gratis.",
      { pasos: ["Tocá «+» y elegí «Publicar en Comunidad», o entrá a Comunidad desde Inicio.", "Elegí el tipo, completá el formulario corto y leé el aviso antes de publicar.", "Tu publicación la ven las personas de tu departamento y vence sola: los avisos duran pocas horas."] },
      { nota: "Los avisos de seguridad se muestran como «No verificado». Si fue un delito, denunciálo a la policía. No subas fotos de personas ni nombres." },
      "Podés editar, marcar como resuelta o eliminar lo que publicaste desde Comunidad → Mis publicaciones.",
    ],
    relacionados: ["buscador-unico"],
  },
  {
    id: "sorteos-rifas", cat: "empezar", titulo: "Sorteos y rifas: cómo publicar uno y cómo participar",
    claves: "sorteo rifa números premios quiniela lotería beneficio organizar participar pagar whatsapp resultado cancelar",
    cuerpo: [
      "Un sorteo o una rifa es una publicación más de Comunidad. Mi Zona solo muestra la ficha: no vende números, no cobra, no reserva y no organiza el sorteo.",
      { pasos: ["Tocá «+» y elegí «Publicar en Comunidad», y después «Sorteo o rifa».", "Completá quién organiza, el motivo, los premios, la fecha (la hora es opcional) y cómo se define el ganador.", "Dejá tu WhatsApp: las personas interesadas te escriben por ahí y arreglan todo con vos por privado."] },
      "Si querés participar, abrí la ficha y tocá «Escribirle por WhatsApp». Lo que acuerden con el organizador, incluido el pago, pasa fuera de Mi Zona.",
      { nota: "Mi Zona no organiza ni cobra sorteos: solo muestra lo que publica cada persona. Pagá únicamente a quien conocés y no pagues por adelantado si algo no te cierra." },
      "No se aceptan premios en dinero y la ficha no puede llevar precios ni datos de cuentas. Si ves algo raro, tocá «Denunciar o bloquear».",
      "Cuando llega el día, quien organiza puede escribir los números ganadores en la ficha. También puede editar, cancelar o eliminar su sorteo. La ficha se oculta sola unos días después de la fecha.",
    ],
    relacionados: ["comunidad"],
  },
  {
    id: "denunciar", cat: "privacidad", titulo: "Denunciar o bloquear a alguien",
    claves: "denunciar denuncia bloquear bloqueo reportar estafa spam acoso ofensivo molesta",
    cuerpo: [
      "Si ves algo que incumple las reglas de convivencia, podés denunciarlo. La otra persona no se entera de que fuiste vos.",
      { pasos: ["Abrí la ficha, la publicación o el perfil y tocá el ícono de la bandera («Denunciar o bloquear»).", "Elegí el motivo y, si querés, agregá un detalle.", "Leé el aviso y tocá «Enviar denuncia». Después podés bloquear a la persona si no querés volver a ver lo que publica."] },
      "Al bloquear a alguien, ninguno de los dos ve lo que publica el otro ni puede contactarlo. Podés desbloquearla cuando quieras en Ajustes → Usuarios bloqueados.",
      { nota: "El equipo revisa cada denuncia y te avisa cuando la revisó. Si fue un delito, denunciálo también a la policía." },
    ],
    relacionados: ["avisos-equipo"],
  },
  {
    id: "avisos-equipo", cat: "privacidad", titulo: "Me ocultaron algo o suspendieron mi cuenta: qué hago",
    claves: "suspendida suspensión advertencia oculto oculta apelar apelación aviso equipo moderación motivo reglas",
    cuerpo: [
      "Si el equipo de Mi Zona toma una medida sobre tu cuenta o tus publicaciones, te avisamos con el motivo. Podés leerlo siempre en Ajustes → Avisos del equipo.",
      { pasos: ["Entrá a Ajustes → Avisos del equipo y leé el motivo.", "Si creés que fue un error, tocá «Apelar esta decisión» y contanos por qué (se puede una sola vez, dentro de los 30 días).", "Una persona del equipo lo revisa y te responde ahí mismo. Si aceptan, se deshace la medida."] },
      "Con la cuenta suspendida no podés publicar, editar, contactar ni escribir reseñas, y lo que publicaste no se muestra. Sí podés entrar, leer el motivo, apelar, descargar tus datos y eliminar tu cuenta.",
      "Las reglas están en Ajustes → Reglas de convivencia.",
    ],
    relacionados: ["denunciar"],
  },
  {
    id: "privacidad-fichas", cat: "privacidad", titulo: "Mostrar u ocultar el WhatsApp y las búsquedas de una ficha",
    claves: "privacidad whatsapp ocultar buscar búsquedas ficha dueño negocio oficio interruptor",
    cuerpo: [
      "En Ajustes → Privacidad cada ficha (tu negocio, tu ficha de oficios o tus fichas de alquiler) tiene sus propios interruptores. Cambiar uno vale solo para esa ficha.",
      { pasos: ["«Mostrar WhatsApp»: si lo apagás, la ficha oculta tu WhatsApp al público (no se ve el número ni el botón).", "«Aparecer en búsquedas»: si lo apagás, la ficha no sale en búsquedas ni listados. Vos la seguís viendo en Mis fichas.", "«Dueño de» y «Dueño: @usuario»: elegís si tu perfil muestra la ficha y si la ficha muestra tu usuario."] },
      "Antes de cada cambio te avisamos qué va a pasar, y podés aceptar o cancelar.",
    ],
    relacionados: ["oficios-ofrecer"],
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
      { pasos: ["Andá a la pestaña Negocio, abrí tu ficha y tocá “Agregar tiempo” en la ficha.", "Elegí 1, 3 o 6 meses (o usá tus días de invitación).", "Pagá con Google Play."] },
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
    claves: "pago google play no se publico pendiente acreditado",
    cuerpo: [
      "La ficha se activa cuando nuestro servidor confirma la compra con Google Play. Suele tardar segundos, pero puede demorar si se cortó la conexión.",
      { pasos: ["Volvé a abrir la pestaña Negocio, abrí esa ficha y tocá “Agregar tiempo” en esa ficha.", "Si Google ya te cobró, vas a ver “Encontramos una compra sin activar”: tocá “Activar con mi compra”. No pagás de nuevo.", "Revisá en Google Play → Pagos y suscripciones que la compra figure como completada."] },
      "Si el pago está aprobado y pasó más de una hora, escribinos desde Soporte con el motivo “Pagos y suscripción” e indicá la fecha de la compra. No hace falta que envíes datos de tu tarjeta.",
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
    otro: ["que-es", "buscar-filtros", "oficios-buscar", "alquileres-buscar"],
  }[motivo] || [];
  return ids.map(articuloPorId).filter(Boolean);
}
