import mongoose from "mongoose";

// Un elemento de la agenda personal del dueño: un evento (reunión, visita de un proveedor, entrega...) o una tarea
// (algo que tiene que hacer él). Es del DUEÑO (su cuenta de Google), no de un cliente.
const agendaItemSchema = new mongoose.Schema(
  {
    usuarioId: { type: String, required: true, index: true },

    tipo: { type: String, enum: ["evento", "tarea"], default: "evento" },
    titulo: { type: String, required: true, trim: true, maxlength: 140 },

    fecha: { type: String }, // 'YYYY-MM-DD'. En una tarea es opcional ("sin fecha")
    hora: { type: String }, // 'HH:MM'. Opcional (todo el día)
    duracionMinutos: { type: Number, default: 30, min: 5, max: 1440 },

    persona: { type: String, default: "", maxlength: 80 }, // con quién: cliente, proveedor, empleado
    notas: { type: String, default: "", maxlength: 600 },
    categoria: { type: String, default: "general", maxlength: 40 }, // depende del rubro (reserva, proveedor, entrega...)

    // Minutos antes del evento para avisarle (null = sin aviso). Ej: 15, 60, 1440 (1 día), 4320 (3 días)
    recordatorioMinutos: { type: Number, default: null },
    avisoAppMostrado: { type: Boolean, default: false }, // ya se le mostró dentro de la app
    avisoPushEnviado: { type: Boolean, default: false }, // ya se le mandó la notificación al celular

    completada: { type: Boolean, default: false },
    completadaEn: { type: Date },

    origen: { type: String, enum: ["manual", "foto", "mensaje"], default: "manual" },
  },
  { timestamps: true }
);

agendaItemSchema.index({ usuarioId: 1, fecha: 1 });

export default mongoose.model("AgendaItem", agendaItemSchema);
