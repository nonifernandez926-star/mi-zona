import mongoose from "mongoose";

// Una invitación = una persona nueva que se registró con el código de otra. Solo se acredita (se regalan los días) si cumple los controles.
const invitacionSchema = new mongoose.Schema(
  {
    invitadorId: { type: String, required: true, index: true },
    invitadoId: { type: String, required: true, unique: true }, // una cuenta solo puede ser invitada una vez
    estado: { type: String, enum: ["pendiente", "acreditada", "rechazada"], default: "pendiente", index: true },
    motivo: { type: String, default: "" }, // por qué se rechazó (solo lo ve el equipo)
    ipHash: { type: String, default: "" }, // huella de la red desde la que se registró la persona invitada (no la IP)
    acreditarEn: { type: Date, required: true },
    diasInvitador: { type: Number, default: 0 },
    diasInvitado: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Invitacion", invitacionSchema);
