import mongoose from "mongoose";

// Una sesión abierta de una cuenta en un dispositivo (celular, computadora...). El token que recibe el dispositivo lleva su "sid":
// si la sesión se borra de acá, ese dispositivo deja de tener acceso. Se borra sola a los 90 días (lo que dura el token).
const sesionSchema = new mongoose.Schema({
  usuarioId: { type: String, required: true, index: true },
  sid: { type: String, required: true, unique: true },
  dispositivo: { type: String, default: "Dispositivo" }, // por ejemplo "Chrome en Android"
  tipo: { type: String, enum: ["celular", "tablet", "computadora"], default: "computadora" },
  creadaEn: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 },
  ultimoUso: { type: Date, default: Date.now },
});

export default mongoose.model("Sesion", sesionSchema);
