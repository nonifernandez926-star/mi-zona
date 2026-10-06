import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import businessesRoutes from "./routes/businesses.js";
import asistenteRoutes from "./routes/asistente.js";
import eventosRoutes from "./routes/eventos.js";
import authRoutes from "./routes/auth.js";
import suscripcionRoutes from "./routes/suscripcion.js";
import pushRoutes from "./routes/push.js";
import agendaRoutes from "./routes/agenda.js";
import privacidadRoutes from "./routes/privacidad.js";
import soporteRoutes from "./routes/soporte.js";
import { programarRevisionDeVencimientos } from "./utils/vencimientos.js";
import { programarRecordatoriosDeAgenda } from "./utils/recordatorios.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1); // detrás de Render: así req.ip es la IP real de cada persona (límite de intentos)
// Solo la web de Mi Zona (FRONTEND_URL) y el entorno de desarrollo pueden llamar a la API desde un navegador.
// Si FRONTEND_URL no está configurada, queda abierto como antes (para no romper nada).
const origenesPermitidos = [process.env.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean).map((o) => o.replace(/\/+$/, ""));
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || !process.env.FRONTEND_URL || origenesPermitidos.includes(origin)),
}));
// Encabezados de seguridad básicos para todas las respuestas
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "5mb" }));

connectDB();

// Ruta de salud, para probar que el servidor está vivo
app.get("/", (req, res) => {
  res.send("Mi Zona API funcionando");
});

app.use("/api/businesses", businessesRoutes);
app.use("/api/asistente", asistenteRoutes);
app.use("/api/eventos", eventosRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/suscripcion", suscripcionRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/agenda", agendaRoutes);
app.use("/api/privacidad", privacidadRoutes);
app.use("/api/soporte", soporteRoutes);

if (!process.env.JWT_SECRET) console.warn("⚠️  Falta JWT_SECRET: el inicio de sesión con Google no va a funcionar hasta configurarlo.");
if (!process.env.GOOGLE_CLIENT_ID) console.warn("⚠️  Falta GOOGLE_CLIENT_ID: el inicio de sesión con Google no va a funcionar hasta configurarlo.");

// Errores inesperados: siempre una respuesta JSON (nunca una página de error suelta)
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  // los errores 5xx no muestran detalles internos
  res.status(status).json({ error: status < 500 ? err.message || "Pedido inválido" : "Error del servidor" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));
programarRevisionDeVencimientos();
programarRecordatoriosDeAgenda();
