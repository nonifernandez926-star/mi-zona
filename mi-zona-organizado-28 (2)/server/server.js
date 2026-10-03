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
import { programarRevisionDeVencimientos } from "./utils/vencimientos.js";

dotenv.config();

const app = express();
app.use(cors());
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

if (!process.env.JWT_SECRET) console.warn("⚠️  Falta JWT_SECRET: el inicio de sesión con Google no va a funcionar hasta configurarlo.");
if (!process.env.GOOGLE_CLIENT_ID) console.warn("⚠️  Falta GOOGLE_CLIENT_ID: el inicio de sesión con Google no va a funcionar hasta configurarlo.");

// Errores inesperados: siempre una respuesta JSON (nunca una página de error suelta)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Error del servidor" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));
programarRevisionDeVencimientos();
