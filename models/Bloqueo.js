import mongoose from "mongoose";

// Una persona bloquea a otra (Fase 8). Mientras dure, ninguna de las dos ve lo que publica la otra ni puede contactarla.
// Se guarda cómo se llamaba la persona bloqueada (nombre público) solo para mostrarle su lista de bloqueados a quien bloqueó.
const bloqueoSchema = new mongoose.Schema(
  {
    bloqueadorId: { type: String, required: true, index: true },
    bloqueadoId: { type: String, required: true, index: true },
    nombre: { type: String, default: "" },
    usuario: { type: String, default: "" },
  },
  { timestamps: true }
);
bloqueoSchema.index({ bloqueadorId: 1, bloqueadoId: 1 }, { unique: true });

export default mongoose.model("Bloqueo", bloqueoSchema);
