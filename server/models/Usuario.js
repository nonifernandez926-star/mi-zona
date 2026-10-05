import mongoose from "mongoose";

// Persona que inició sesión con Google en Mi Zona (dueños de negocio y clientes).
const usuarioSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, index: true },
    nombre: { type: String, default: "" }, // lo elige la persona al registrarse; se puede editar en "Mi cuenta"
    // Id con el que Mi Asistente reconoce a esta persona (chats, memoria, puntos). Ligarlo a la cuenta hace que
    // sus conversaciones la sigan a cualquier dispositivo y reaparezcan cuando un negocio renueva Mi Asistente.
    // "google": el correo lo verificó Google. "email": se registró con correo y contraseña (el correo NO está verificado,
    // por eso estas cuentas no se usan para reconocer negocios ni pagos de Mi Asistente).
    proveedor: { type: String, enum: ["google", "email"], default: "google" },
    passwordHash: { type: String, default: "" },
    sesionClienteId: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Usuario", usuarioSchema);
