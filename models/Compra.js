import mongoose from "mongoose";

// Cada compra hecha con Google Play Billing. El token de Google es único: una misma compra nunca se acredita dos veces.
// Se guarda para siempre (es el comprobante de lo que se acreditó); no tiene datos de pago de nadie (Google no los entrega).
const compraSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true }, // SHA-256 del token de compra (así no queda guardado el token en sí)
    productoId: { type: String, required: true },
    orderId: { type: String, default: "" },
    usuarioId: { type: String, required: true, index: true },
    tipo: { type: String, enum: ["negocio", "oficio", "alquiler"], required: true },
    fichaId: { type: String, required: true },
    plan: { type: String, required: true },
    meses: { type: Number, required: true },
    venciaAntes: { type: String, default: null },
    venceDespues: { type: String, default: null },
    estado: { type: String, enum: ["acreditada", "reembolsada"], default: "acreditada" },
  },
  { timestamps: true }
);

export default mongoose.model("Compra", compraSchema);
