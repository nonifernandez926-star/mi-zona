import mongoose from "mongoose";

// Contador del límite de intentos (frena a quien prueba contraseñas o repite pedidos sin parar).
// Vive en MongoDB, así no se borra cuando el servidor se reinicia ni se pierde si hay más de una instancia.
// MongoDB elimina solo cada registro cuando vence ("expira"), por eso la colección no crece.
const limiteSchema = new mongoose.Schema({
  clave: { type: String, required: true, unique: true }, // ej.: "login|ip|correo"
  n: { type: Number, default: 0 },                        // intentos dentro de la ventana
  expira: { type: Date, required: true },                 // cuándo termina la ventana
});
limiteSchema.index({ expira: 1 }, { expireAfterSeconds: 0 }); // vencimiento automático

export default mongoose.model("LimiteIntentos", limiteSchema);
