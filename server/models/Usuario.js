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
    sesionClienteId: { type: String, default: "" },
    // Sube cada vez que la persona cambia la contraseña o cierra sesión en los demás dispositivos: los tokens viejos dejan de servir.
    tokenVersion: { type: Number, default: 0 },
    // Alertas de seguridad (Seguridad → Alertas de inicio de sesión): avisos por notificación cuando entran a la cuenta desde un dispositivo nuevo
    seguridad: {
      alertasInicio: { type: Boolean, default: true },
    },
    // Controles de privacidad que el SERVIDOR respeta (la búsqueda con asistente y las funciones de IA de la agenda los consultan)
    privacidad: {
      ubicacionBusqueda: { type: Boolean, default: true }, // usar mi ubicación para ordenar negocios por cercanía
      chatsBusqueda: { type: Boolean, default: true }, // usar un resumen de mis últimos chats para recomendarme
      iaAgenda: { type: Boolean, default: true }, // permitir que la IA lea mi agenda para organizar, interpretar y responder
    },
  },
  { timestamps: true }
);

// Un id de cliente no puede estar en dos cuentas (evita que alguien "adopte" el historial de otra persona)
usuarioSchema.index({ usuario: 1 }, { unique: true, partialFilterExpression: { usuario: { $type: "string", $gt: "" } } });
usuarioSchema.index({ sesionClienteId: 1 }, { unique: true, partialFilterExpression: { sesionClienteId: { $type: "string", $gt: "" } } });

export default mongoose.model("Usuario", usuarioSchema);
