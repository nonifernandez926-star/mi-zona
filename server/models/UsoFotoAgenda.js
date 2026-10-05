import mongoose from "mongoose";

// Cuántas fotos de agenda procesó la IA para una persona en un día (hora argentina). Límite: 2 por día.
const usoFotoSchema = new mongoose.Schema({
  usuarioId: { type: String, required: true },
  fecha: { type: String, required: true }, // 'YYYY-MM-DD'
  cantidad: { type: Number, default: 0 },
  creadoEn: { type: Date, default: Date.now, expires: 3 * 24 * 3600 }, // se borra solo a los 3 días
});
usoFotoSchema.index({ usuarioId: 1, fecha: 1 }, { unique: true });

export default mongoose.model("UsoFotoAgenda", usoFotoSchema);
