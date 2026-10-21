import mongoose from "mongoose";

// Registro de TODO lo que se hace desde el panel de moderación (Fase 8): quién, cuándo, desde qué IP, sobre qué y por qué.
// Solo se agrega: el panel no puede editarlo ni borrarlo. Se conserva 3 años.
const accionSchema = new mongoose.Schema(
  {
    accion: { type: String, required: true, index: true }, // ingreso | ingreso_fallido | ocultar | mostrar | advertir | suspender | levantar | descartar | limpiar_perfil | apelacion_aceptada | apelacion_rechazada
    objetivo: { tipo: { type: String, default: "" }, id: { type: String, default: "" }, usuarioId: { type: String, default: "" } },
    detalle: { type: String, default: "" },
    denunciaIds: { type: [String], default: [] },
    medidaId: { type: String, default: "" },
    ip: { type: String, default: "" },
    borrarEn: { type: Date, required: true },
  },
  { timestamps: true }
);
accionSchema.index({ createdAt: -1 });
accionSchema.index({ "objetivo.usuarioId": 1, createdAt: -1 });
accionSchema.index({ borrarEn: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AccionModeracion", accionSchema);
