import mongoose from "mongoose";

// Datos de una cuenta eliminada que todavía hay que borrar en OTRO servicio (chats en Mi Asistente, fotos en Cloudinary).
// Se crea solo cuando el borrado inmediato falló (servicio dormido, sin conexión, claves sin configurar) y se reintenta cada pocas horas.
// NO guarda nada de la persona: solo el id anónimo de cliente (sin vínculo con la cuenta, que ya no existe) y los enlaces de las fotos.
const schema = new mongoose.Schema({
  sesionClienteId: { type: String, default: "" }, // chats y datos en Mi Asistente
  urls: { type: [String], default: [] }, // fotos en Cloudinary
  intentos: { type: Number, default: 0 },
  ultimoError: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("BorradoPendiente", schema);
