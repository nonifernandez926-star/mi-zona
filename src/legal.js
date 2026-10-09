// Textos legales de Mi Zona. Si cambia algo de lo que la app hace con los datos, hay que actualizar también estas fechas y textos.
export const LEGAL_ACTUALIZADO = "9 de octubre de 2026";

export const TERMINOS = [
  { t: "1. Qué es Mi Zona", p: [
    "Mi Zona es una aplicación que reúne los negocios de una localidad y permite a las personas encontrarlos, ver su información, dejar reseñas y contactarlos. También permite a los dueños publicar y administrar su negocio.",
    "Al usar Mi Zona aceptás estos términos. Si no estás de acuerdo, no uses la aplicación.",
  ] },
  { t: "2. Tu cuenta", p: [
    "Para usar Mi Zona necesitás una cuenta, que se crea eligiendo tu cuenta de Google y, después, un nombre de usuario y una contraseña.",
    "Sos responsable de mantener tu contraseña y tus dispositivos seguros. Si notás un acceso que no reconocés, cerrá las demás sesiones y cambiá tu contraseña desde Ajustes → Seguridad. Tenés que darnos datos verdaderos y no podés usar la cuenta de otra persona.",
    "Podés eliminar tu cuenta cuando quieras desde Ajustes → Mi cuenta.",
  ] },
  { t: "3. Negocios y contenido publicado", p: [
    "Quien registra un negocio es responsable de que los datos, las fotos y las promociones que publica sean verdaderos, actuales y que tenga derecho a usarlos. Los datos de un negocio (nombre, descripción, dirección, teléfono, redes, fotos y reseñas) son públicos.",
    "Mi Zona no es parte de la relación entre clientes y negocios. No garantizamos la calidad, el precio ni la disponibilidad de lo que ofrece cada negocio, ni respondemos por los acuerdos que hagan entre ellos.",
    "Podemos ocultar o eliminar contenido o negocios que incumplan estos términos o la ley, o que sean denunciados con motivo razonable.",
  ] },
  { t: "4. Reseñas", p: [
    "Las reseñas deben reflejar una experiencia real. No se permiten reseñas falsas, ofensivas, discriminatorias ni que publiquen datos personales de terceros. Las reseñas se muestran con el nombre que escribas al enviarlas, y podés borrarlas desde Ajustes → Privacidad.",
  ] },
  { t: "5. Suscripciones y pagos", p: [
    "Un negocio se muestra mientras su suscripción esté activa. Hay planes de 1, 3 y 6 meses, y el precio de cada uno se muestra antes de pagar. Los pagos se procesan a través de Mercado Pago: Mi Zona no recibe ni guarda los datos de tu tarjeta.",
    "Al renovar, los meses nuevos se suman al vencimiento actual. Cuando la suscripción vence, el negocio deja de mostrarse hasta que se renueve; no se borra.",
    "Si eliminás tu cuenta, no se reembolsa el período ya pagado de una suscripción. Si tenés un problema con un pago, escribinos desde Soporte.",
  ] },
  { t: "6. Uso aceptable", p: [
    "No podés usar Mi Zona para actividades ilegales, para engañar a otras personas, para enviar mensajes masivos no solicitados, para intentar acceder a cuentas o datos ajenos, ni para dañar o sobrecargar el servicio.",
  ] },
  { t: "7. Disponibilidad y responsabilidad", p: [
    "Hacemos lo posible para que Mi Zona funcione siempre, pero puede haber interrupciones por mantenimiento o causas ajenas a nosotros. La información de la aplicación se ofrece tal como está y puede contener errores.",
    "En la medida que la ley lo permita, Mi Zona no responde por daños indirectos derivados del uso de la aplicación o de la relación con un negocio. Esto no limita los derechos que la ley de defensa del consumidor te reconoce.",
  ] },
  { t: "8. Cambios en estos términos", p: [
    "Podemos actualizar estos términos. Si el cambio es importante, te avisamos dentro de la aplicación. La fecha de la última actualización figura al principio de este texto. Si seguís usando Mi Zona después de un cambio, entendemos que lo aceptás.",
  ] },
  { t: "9. Ley aplicable y contacto", p: [
    "Estos términos se rigen por las leyes de la República Argentina. Para cualquier duda o reclamo escribinos desde Ajustes → Soporte.",
  ] },
];

export const PRIVACIDAD_TEXTO = [
  { t: "1. Qué datos guardamos de vos", p: [
    "Si no iniciás sesión, no guardamos datos tuyos en nuestro servidor. Con sesión guardamos:",
  ], l: [
    "Tu correo, tu nombre, tu nombre de usuario y tu contraseña (esta última siempre cifrada: nunca se guarda en texto).",
    "Los dispositivos con sesión abierta y un registro de actividad de seguridad (inicios de sesión y cambios), por un máximo de 90 días.",
    "Las reseñas que escribís y las consultas que le mandás a Soporte.",
    "Si tenés un negocio: los datos que cargás de él (públicos) y tu agenda (privada).",
    "Los dispositivos en los que activaste las notificaciones, para poder enviarlas.",
    "Las fotos que subís para tu negocio (visibles para todos) y las acciones sobre un negocio (ver, guardar, contactar) para armar sus estadísticas.",
    "Tus preferencias de privacidad (ubicación, chats, IA en la agenda).",
  ] },
  { t: "1 bis. Ubicación", p: [
    "Si lo permitís, usamos la ubicación de tu dispositivo (solo mientras usás la aplicación) para ordenar los negocios por cercanía y mostrarte el clima. Cuando buscás con el asistente, la ubicación se envía a nuestro servidor solo para calcular distancias en ese momento: no la guardamos ni la usamos en segundo plano. Podés negarte o retirar el permiso desde los ajustes de tu celular y desde Ajustes → Privacidad.",
  ] },
  { t: "2. Lo que queda en tu dispositivo", p: [
    "Tus favoritos, los chats guardados, los negocios vistos, las búsquedas recientes y tus preferencias (como el modo oscuro) se guardan en tu dispositivo, no en nuestro servidor. Podés borrarlos desde Ajustes → Privacidad.",
  ] },
  { t: "3. Para qué los usamos", p: [
    "Para que puedas entrar a tu cuenta y mantenerla segura, mostrar tu negocio y tus reseñas, procesar suscripciones, enviarte avisos que pediste (vencimientos, recordatorios de agenda, alertas de acceso), responder tus consultas y mejorar el funcionamiento de la aplicación. No vendemos tus datos.",
  ] },
  { t: "4. Con quién los compartimos", p: [
    "Mi Zona funciona con servicios de terceros, y cada uno recibe solo lo que necesita:",
  ], l: [
    "Google: confirma quién sos al entrar. Nos da tu correo y tu nombre.",
    "Mi Asistente: recibe tus mensajes, pedidos y puntos para atenderte cuando chateás con un negocio.",
    "Inteligencia artificial: procesa tu búsqueda con asistente y, si lo permitís, tu agenda. Podés apagarlo en Ajustes → Privacidad. Las fotos de agenda se analizan y se descartan.",
    "Mercado Pago: cobra las suscripciones. Nunca vemos los datos de tu tarjeta.",
    "Cloudinary: aloja las fotos que sube un negocio, que son visibles para todos.",
    "Proveedores de mapas (CARTO, Esri y OpenStreetMap): reciben la dirección IP de tu dispositivo para mostrarte el mapa.",
    "Open-Meteo: si permitís el uso de tu ubicación, recibe una ubicación aproximada para mostrarte el clima de tu zona.",
    "OpenStreetMap (Nominatim) y datos.gob.ar (Georef): reciben la dirección o localidad que escribís para ubicarla en el mapa.",
    "Google Fonts: recibe la dirección IP de tu dispositivo para entregarte la tipografía de la aplicación.",
    "Servicios de alojamiento (servidor, base de datos y sitio web): guardan la información de la aplicación en nuestro nombre y no la usan para otros fines.",
  ], p2: [
    "También podemos compartir información si una autoridad competente lo exige conforme a la ley.",
  ] },
  { t: "5. Cuánto tiempo los conservamos", p: [
    "Guardamos tus datos mientras tengas tu cuenta. Cuando la eliminás, se borran tu cuenta, tu agenda, tus notificaciones, tus sesiones, tu actividad de seguridad, tus consultas a Soporte y tus reseñas. Si tenías negocios y elegiste eliminarlos, también se borran. Los chats con asistentes están en Mi Asistente y no se borran desde Mi Zona.",
  ] },
  { t: "6. Tus derechos", p: [
    "Podés acceder a tus datos, corregirlos y pedir que se eliminen. La mayoría de estas acciones las hacés vos mismo: ver lo que guardamos y descargar una copia en Ajustes → Privacidad, cambiar tu nombre en Ajustes → Mi cuenta y eliminar tu cuenta desde ahí. Si necesitás algo más, escribinos desde Soporte.",
    "En la Argentina, la Agencia de Acceso a la Información Pública es el órgano de control de la Ley 25.326 de protección de datos personales y atiende las denuncias y reclamos de quienes consideren afectados sus derechos.",
  ] },
  { t: "7. Seguridad", p: [
    "Protegemos tus datos con contraseñas cifradas, límite de intentos de acceso, sesiones por dispositivo que podés cerrar cuando quieras y avisos cuando alguien entra a tu cuenta. Ningún sistema es infalible: si encontrás un problema de seguridad, avisanos por Soporte.",
  ] },
  { t: "8. Cambios y contacto", p: [
    "Si cambiamos la forma en que usamos tus datos, actualizamos esta política y te avisamos en la aplicación. Para consultas sobre privacidad, escribinos desde Ajustes → Soporte.",
  ] },
];

export const LICENCIAS = [
  { nombre: "React", licencia: "MIT" },
  { nombre: "Leaflet", licencia: "BSD 2-Clause" },
  { nombre: "Lucide", licencia: "ISC" },
  { nombre: "Tailwind CSS", licencia: "MIT" },
  { nombre: "Datos de mapas © OpenStreetMap contributors", licencia: "ODbL" },
  { nombre: "Teselas de mapa CARTO y Esri", licencia: "Uso según sus términos" },
];
