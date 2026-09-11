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

// Sumar o restar 1 al contador de "veces guardado en favoritos" (atómico, para el ranking)
router.patch("/:id/favorito", async (req, res) => {
  try {
    const delta = req.body?.delta === -1 ? -1 : 1;
    const updated = await Business.findOneAndUpdate(
      { id: req.params.id },
      { $inc: { vecesFavorito: delta } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Negocio no encontrado" });
    res.json({ vecesFavorito: Math.max(0, updated.vecesFavorito || 0) });
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
