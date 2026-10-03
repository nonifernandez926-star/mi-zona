import mongoose from "mongoose";

// Persona que inició sesión con Google en Mi Zona (dueños de negocio y clientes).
const usuarioSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, index: true },
    nombre: { type: String, default: "" }, // lo elige la persona al registrarse; se puede editar en "Mi cuenta"
  },
  { timestamps: true }
);

export default mongoose.model("Usuario", usuarioSchema);
