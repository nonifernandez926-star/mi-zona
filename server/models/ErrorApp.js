import mongoose from "mongoose";

// Errores que la web de Mi Zona detectó en celulares reales (ver utils/errores.js). Solo datos técnicos, sin cuenta ni datos personales.
// El mismo error se agrupa en una fila con un contador. Se borran solos a los 30 días de verse por última vez.
const errorAppSchema = new mongoose.Schema(
  {
    huella: { type: String, required: true, unique: true },
    mensaje: { type: String, default: "" },
    pila: { type: String, default: "" },
    pantalla: { type: String, default: "" },
    version: { type: String, default: "" },
    plataforma: { type: String, default: "" },
    veces: { type: Number, default: 1 },
    primeraVez: { type: Date, default: Date.now },
    ultimaVez: { type: Date, default: Date.now },
  },
  { versionKey: false }
);
errorAppSchema.index({ ultimaVez: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

export default mongoose.model("ErrorApp", errorAppSchema);
