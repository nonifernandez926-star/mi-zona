import mongoose from "mongoose";

// Un navegador/celular de un usuario que aceptó recibir notificaciones push.
// La genera el navegador (Service Worker + Push API); acá solo se guarda para poder avisarle después,
// aunque tenga la app cerrada (por ejemplo, "tu suscripción vence en 3 días").
const pushSuscripcionSchema = new mongoose.Schema(
  {
    usuarioId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    subscription: { type: mongoose.Schema.Types.Mixed, required: true },
    nombre: { type: String, default: "" }, // "Chrome en Android": para que la persona reconozca el dispositivo
    tipo: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("PushSuscripcion", pushSuscripcionSchema);
