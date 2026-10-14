import mongoose from "mongoose";

const articuloSchema = new mongoose.Schema({
  id: { type: String, required: true }, nombre: { type: String, required: true, maxlength: 80 },
  foto: { type: String, default: "" }, precio: { type: String, default: "", maxlength: 80 },
  estado: { type: String, enum: ["disponible", "ocupado", "no_disponible"], default: "disponible" },
}, { _id: false });
const alquilerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, ownerId: { type: String, required: true, unique: true },
  nombre: { type: String, required: true, maxlength: 60 }, categoria: { type: String, required: true }, descripcion: { type: String, default: "", maxlength: 300 },
  localidad: { provinciaId: String, provincia: String, departamentoId: String, departamento: String, localidadId: String, localidad: String },
  vivienda: { tipo: { type: String, default: "" }, dormitorios: { type: Number, default: null }, banos: { type: Number, default: null }, ambientes: { type: Number, default: null } },
  zona: { type: String, default: "", maxlength: 80 }, direccion: { type: String, default: "", maxlength: 120 }, whatsapp: { type: String, default: "" }, mostrarWhatsapp: { type: Boolean, default: false },
  ig: { type: String, default: "" }, facebook: { type: String, default: "" }, logo: { type: String, default: "" }, condiciones: { type: String, default: "", maxlength: 500 },
  articulos: { type: [articuloSchema], default: [] }, status: { type: String, enum: ["active", "paused"], default: "active" }, apareceEnBusquedas: { type: Boolean, default: true }, textoBusqueda: { type: String, default: "" },
}, { timestamps: true });
alquilerSchema.index({ status: 1, apareceEnBusquedas: 1, categoria: 1, "localidad.provinciaId": 1, "localidad.departamentoId": 1, "localidad.localidadId": 1 });
export default mongoose.model("Alquiler", alquilerSchema);
