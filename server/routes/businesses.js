import express from "express";
import Business from "../models/Business.js";

const router = express.Router();

// Traer todos los negocios
router.get("/", async (req, res) => {
  try {
    const list = await Business.find({});
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crear un negocio nuevo
router.post("/", async (req, res) => {
  try {
    const created = await Business.create(req.body);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Actualizar (o crear si no existe) un negocio por su id propio
router.put("/:id", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
  try {
    await Business.deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
