import mongoose from "mongoose";

// Ficha de alquiler: funciona como el perfil de un pequeño negocio de alquiler, con artículos adentro.
// A diferencia de oficios, una persona puede tener varias (hasta 5): cada una es un perfil aparte.
const articuloSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    nombre: { type: String, default: "" },
    foto: { type: String, default: "" }, // opcional
    precioValor: { type: Number, default: null }, // pesos enteros; null con unidad "consultar"
    precioUnidad: { type: String, enum: ["hora", "dia", "semana", "mes", "consultar"], default: "consultar" },
    // "disponible" | "ocupado" | "retirado" (Ya no lo tengo: el dueño lo ve, el público no)
    estado: { type: String, enum: ["disponible", "ocupado", "retirado"], default: "disponible" },
    estadoEl: { type: Date, default: Date.now }, // cuándo se confirmó por última vez (para no afirmar disponibilidad vieja)
  },
  { _id: false }
);

const alquilerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true, index: true },
    nombre: { type: String, default: "" },
    categoria: { type: String, enum: ["viviendas", "eventos", "herramientas", "otros"], required: true },
    tipos: { type: [String], default: [] }, // ids de la lista de utils/alquileres.js (según la categoría)
    desc: { type: String, default: "" },
    localidad: {
      provinciaId: { type: String, default: "" }, provincia: { type: String, default: "" },
      departamentoId: { type: String, default: "" }, departamento: { type: String, default: "" },
      localidadId: { type: String, default: "" }, localidad: { type: String, default: "" },
    },
    zona: { type: String, default: "" },
    direccion: { type: String, default: "" }, // opcional; es pública si la completa
    whatsapp: { type: String, default: "" }, // solo dígitos; NUNCA sale en listados
    mostrarWhatsapp: { type: Boolean, default: false },
    ig: { type: String, default: "" }, facebook: { type: String, default: "" }, tiktok: { type: String, default: "" },
    logo: { type: String, default: "" },
    fotos: { type: [String], default: [] },
    condiciones: { type: String, default: "" }, // condiciones, depósito o requisitos (opcional)
    // Solo para la categoría "viviendas" (el servidor ignora estos datos en las demás)
    vivienda: {
      dormitorios: { type: Number, default: null },
      banos: { type: Number, default: null },
      amoblado: { type: Boolean, default: null },
      mascotas: { type: Boolean, default: null },
      capacidad: { type: Number, default: null }, // personas (salones, quinchos)
    },
    articulos: { type: [articuloSchema], default: [] },
    status: { type: String, enum: ["active", "paused"], default: "active" },
    expiresAt: { type: String, default: null }, // vacío mientras no se cobre (Fase 9)
    // Fase 9: la ficha se muestra solo si tiene tiempo vigente (mes gratis, compra de Google Play o días de invitación).
    // pendientePago: cargada pero todavía sin mes gratis ni compra → no se muestra al público. Al vencer se OCULTA (no se borra) y vuelve al renovar.
    pendientePago: { type: Boolean, default: false },
    suscripcion: { type: mongoose.Schema.Types.Mixed, default: {} }, // { origen: gratis|play|invitacion, plan, ultimoAvisoUmbral, ultimoAvisoVencimiento }
    duenoEnPerfil: { type: Boolean, default: false },
    duenoEnFicha: { type: Boolean, default: false },
    apareceEnBusquedas: { type: Boolean, default: true },
    // Fase 8: si el equipo de Mi Zona la ocultó por una denuncia, no sale en listados, búsquedas ni se abre desde afuera. El dueño la sigue viendo y puede apelar.
    ocultaPorEquipo: { type: Boolean, default: false },
    ocultaMotivo: { type: String, default: "" },
    ocultaDesde: { type: Date, default: null },
    ocultaMedidaId: { type: String, default: "" },
    textoBusqueda: { type: String, default: "" },
    compartioEn: { type: Date, default: null }, // Fase 6: cuándo completó el menú de compartir (no prueba que el mensaje llegó)
    actualizadoEn: { type: Date, default: Date.now }, // la última vez que el dueño tocó la ficha o un artículo ("Actualizado hace X días")
  },
  { timestamps: true }
);

alquilerSchema.index({ status: 1, apareceEnBusquedas: 1, categoria: 1, "localidad.provinciaId": 1, "localidad.departamentoId": 1, "localidad.localidadId": 1 });
alquilerSchema.index({ tipos: 1 });

export default mongoose.model("Alquiler", alquilerSchema);
