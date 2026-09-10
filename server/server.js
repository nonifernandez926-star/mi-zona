import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import businessesRoutes from "./routes/businesses.js";
import asistenteRoutes from "./routes/asistente.js";

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));
