import mongoose from "mongoose";

// Historial de seguridad de una cuenta (inicios de sesión, cambios de contraseña, cierres de sesión). Se conserva 90 días.
const actividadSchema = new mongoose.Schema({
  usuarioId: { type: String, required: true, index: true },
  tipo: { type: String, required: true }, // cuenta_creada | inicio_sesion | contrasena_cambiada | sesiones_cerradas | sesion_cerrada
  dispositivo: { type: String, default: "" },
  fecha: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 },
});

export default mongoose.model("ActividadSeguridad", actividadSchema);
