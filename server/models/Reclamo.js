import mongoose from "mongoose";

// Reclamo, devolución o cambio que una persona le hace a un negocio desde "Mis pedidos".
// El negocio lo recibe y lo responde en Mi Asistente; acá se guarda una copia para que la persona vea cómo va y lea la respuesta.
const reclamoSchema = new mongoose.Schema(
  {
    usuarioId: { type: String, required: true, index: true },
    // Id del reclamo que Mi Asistente usa para no duplicarlo y para consultar su estado
    refExterna: { type: String, required: true, unique: true },
    codigoPublico: { type: String, required: true }, // código del asistente del negocio
    negocio: { type: String, default: "" }, // nombre, solo para mostrar
    tipo: { type: String, enum: ["reclamo", "devolucion", "cambio"], required: true },
    motivo: { type: String, enum: ["mal_estado", "no_llego", "incorrecto", "calidad", "demora", "atencion", "otro"], default: "otro" },
    producto: { type: String, default: "" },
    pedidoRef: { type: String, default: "" },
    monto: { type: Number, default: null },
    esComida: { type: Boolean, default: false },
    descripcion: { type: String, required: true },
    fotos: { type: [String], default: [] },
    // nuevo = enviado, en_revision = el dueño lo abrió, aceptado / rechazado = ya respondió
    estado: { type: String, enum: ["nuevo", "en_revision", "aceptado", "rechazado"], default: "nuevo" },
    // false = Mi Asistente no respondió al enviarlo: se reintenta solo cada vez que la persona abre "Mis reclamos"
    enviado: { type: Boolean, default: false },
    intentos: { type: Number, default: 0 },
    respuesta: {
      mensaje: { type: String, default: "" },
      solucion: { type: String, default: "" },
      fecha: { type: Date, default: null },
    },
    avisado: { type: Boolean, default: false }, // ya se le mandó la notificación de la respuesta (una sola vez)
  },
  { timestamps: true }
);

export default mongoose.model("Reclamo", reclamoSchema);
