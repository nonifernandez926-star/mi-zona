import mongoose from "mongoose";

// Persona que inició sesión con Google en Mi Zona (dueños de negocio y clientes).
const usuarioSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, index: true },
    // Nombre de usuario público y único (minúsculas). Las cuentas viejas de Google lo eligen la próxima vez que entran.
    usuario: { type: String, default: "", lowercase: true, trim: true },
    nombre: { type: String, default: "" }, // lo elige la persona al registrarse; se puede editar en "Mi cuenta"
    // Id con el que Mi Asistente reconoce a esta persona (chats, memoria, puntos). Ligarlo a la cuenta hace que
    // sus conversaciones la sigan a cualquier dispositivo y reaparezcan cuando un negocio renueva Mi Asistente.
    // "google": el correo lo verificó Google. "email": se registró con correo y contraseña (el correo NO está verificado,
    // por eso estas cuentas no se usan para reconocer negocios ni pagos de Mi Asistente).
    proveedor: { type: String, enum: ["google", "email"], default: "google" },
    passwordHash: { type: String, default: "" },
    // true cuando la persona demostró que el correo es suyo (con Google o con un código enviado a ese correo)
    correoVerificado: { type: Boolean, default: false },
    // Contraseña de Mi Zona para entrar con usuario (cuentas que se registraron con Google). Es independiente de passwordHash
    // (la contraseña de correo, que también usa Mi Asistente): así las dos nunca se mezclan ni se pisan.
    claveZona: { type: String, default: "" },
    sesionClienteId: { type: String, default: "" },
    // Declaración al registrarse. NO se guarda edad ni fecha de nacimiento: solo que declaró tener 18 años o más y cuándo aceptó los términos.
    mayor18: { type: Boolean, default: false },
    mayor18Fecha: { type: Date, default: null },
    terminosAceptadosEn: { type: Date, default: null },
    terminosVersion: { type: String, default: "" },
    // Perfil público sencillo (nombre, foto opcional, localidad y descripción opcional). El correo y el teléfono nunca se muestran.
    descripcion: { type: String, default: "" },
    foto: { type: String, default: "" }, // foto subida a Cloudinary (opcional)
    // Localidad del catálogo oficial (Georef): sirve para filtrar y para mostrar Comunidad por departamento
    localidad: {
      provinciaId: { type: String, default: "" }, provincia: { type: String, default: "" },
      departamentoId: { type: String, default: "" }, departamento: { type: String, default: "" },
      localidadId: { type: String, default: "" }, localidad: { type: String, default: "" },
    },
    // Fase 8: suspensión decidida por el equipo de Mi Zona desde el panel de moderación. Mientras esté vigente la persona puede entrar,
    // leer el motivo, apelar, descargar sus datos y eliminar su cuenta, pero no publicar, editar, contactar ni escribir reseñas, y no se ve lo que publicó.
    suspension: {
      activa: { type: Boolean, default: false },
      permanente: { type: Boolean, default: false },
      desde: { type: Date, default: null },
      hasta: { type: Date, default: null }, // suspensión temporal: hasta cuándo
      motivo: { type: String, default: "" },
      medidaId: { type: String, default: "" },
    },
    // Fase 9 — invitaciones y mes gratis
    codigoInvitacion: { type: String, default: "" }, // código corto que la persona comparte (se escribe, no es un enlace)
    invitadoPor: { type: String, default: "" }, // id de quien la invitó (una sola vez)
    ipRegistroHash: { type: String, default: "" }, // huella (no la IP) del registro: sirve para detectar cuentas repetidas
    mesGratisUsado: { negocio: { type: String, default: "" }, oficio: { type: String, default: "" }, alquiler: { type: String, default: "" } }, // fecha en que se usó cada mes gratis (uno por tipo)
    diasDisponibles: { type: Number, default: 0 }, // días regalados por invitaciones que todavía no se aplicaron a ninguna ficha
    diasGanadosInvitando: { type: Number, default: 0 }, // total ganado por invitar (para el tope)
    // Sube cada vez que la persona cambia la contraseña o cierra sesión en los demás dispositivos: los tokens viejos dejan de servir.
    tokenVersion: { type: Number, default: 0 },
    // Alertas de seguridad (Seguridad → Alertas de inicio de sesión): avisos por notificación cuando entran a la cuenta desde un dispositivo nuevo
    seguridad: {
      alertasInicio: { type: Boolean, default: true },
    },
    // Qué avisos recibe en el celular (Ajustes → Notificaciones). La campana de la app siempre muestra todo; esto solo controla el push.
    // "seguridad" usa seguridad.alertasInicio.
    notificaciones: {
      agenda: { type: Boolean, default: true }, // recordatorios de la agenda
      suscripcion: { type: Boolean, default: true }, // vencimiento de la suscripción de un negocio
      soporte: { type: Boolean, default: true }, // respuestas del equipo (consultas, reseñas y reportes)
      pedidos: { type: Boolean, default: true }, // cambios de estado de los pedidos que hizo (en preparación, listo, entregado)
    },
    // Controles de privacidad que el SERVIDOR respeta (la búsqueda con asistente y las funciones de IA de la agenda los consultan)
    privacidad: {
      ubicacionBusqueda: { type: Boolean, default: true }, // usar mi ubicación para ordenar negocios por cercanía
      chatsBusqueda: { type: Boolean, default: true }, // usar un resumen de mis últimos chats para recomendarme
      iaAgenda: { type: Boolean, default: true }, // permitir que la IA lea mi agenda para organizar, interpretar y responder
      perfilVisible: { type: Boolean, default: true }, // que otras personas puedan ver mi perfil (si se apaga, solo se ve que es privado)
    },
  },
  { timestamps: true }
);

// Un id de cliente no puede estar en dos cuentas (evita que alguien "adopte" el historial de otra persona)
usuarioSchema.index({ usuario: 1 }, { unique: true, partialFilterExpression: { usuario: { $type: "string", $gt: "" } } });
usuarioSchema.index({ "suspension.activa": 1 }, { partialFilterExpression: { "suspension.activa": true } });
usuarioSchema.index({ codigoInvitacion: 1 }, { unique: true, partialFilterExpression: { codigoInvitacion: { $type: "string", $gt: "" } } });
usuarioSchema.index({ sesionClienteId: 1 }, { unique: true, partialFilterExpression: { sesionClienteId: { $type: "string", $gt: "" } } });

export default mongoose.model("Usuario", usuarioSchema);
