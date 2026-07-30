import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Business from "./models/Business.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error conectando a MongoDB:", err.message));

// Ruta de salud, para probar que el servidor está vivo
app.get("/", (req, res) => {
  res.send("Mi Zona API funcionando");
});

// Traer todos los negocios
app.get("/api/businesses", async (req, res) => {
  try {
    const list = await Business.find({});
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crear un negocio nuevo
app.post("/api/businesses", async (req, res) => {
  try {
    const created = await Business.create(req.body);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Actualizar (o crear si no existe) un negocio por su id propio
app.put("/api/businesses/:id", async (req, res) => {
  try {
    const updated = await Business.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Eliminar un negocio
app.delete("/api/businesses/:id", async (req, res) => {
  try {
    await Business.deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));
