import mongoose from "mongoose";

// Ficha de oficios y servicios. Una por persona (índice único en ownerId), con varios rubros. Es un perfil aparte del perfil de usuario:
// tiene su propio nombre público, y mostrar "Dueño: @usuario" (y "Dueño de" en el perfil) es una elección del dueño.
const oficioSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true, unique: true },
    nombre: { type: String, default: "" },
    rubros: { type: [String], default: [] }, // ids de la lista de utils/rubros.js
    otros: { type: [String], default: [] }, // rubros propios ("Otro")
    desc: { type: String, default: "" },
    // Localidad del catálogo oficial (Georef). El departamento viene de Georef (se guarda para filtrar por departamento)
    localidad: {
      provinciaId: { type: String, default: "" }, provincia: { type: String, default: "" },
      departamentoId: { type: String, default: "" }, departamento: { type: String, default: "" },
      localidadId: { type: String, default: "" }, localidad: { type: String, default: "" },
    },
    zona: { type: String, default: "" },
    direccion: { type: String, default: "" }, // opcional; es pública si la completa
    whatsapp: { type: String, default: "" }, // solo dígitos; NUNCA sale en listados: se entrega recién al tocar "Contactar por WhatsApp"
    mostrarWhatsapp: { type: Boolean, default: false }, // sin esto no hay botón de WhatsApp
    ig: { type: String, default: "" }, facebook: { type: String, default: "" }, tiktok: { type: String, default: "" },
    logo: { type: String, default: "" },
    fotos: { type: [String], default: [] },
    dias: { type: [String], default: [] },
    horario: { type: String, default: "" },
    precio: { type: String, default: "" },
    etiquetas: { type: [String], default: [] },
    // Estado: "active" | "paused". "Vencida" se calcula con expiresAt (vacío mientras no se cobre: se conecta en la Fase 9)
    status: { type: String, enum: ["active", "paused"], default: "active" },
    expiresAt: { type: String, default: null },
    // Fase 9: la ficha se muestra solo si tiene tiempo vigente (mes gratis, compra de Google Play o días de invitación).
    // pendientePago: cargada pero todavía sin mes gratis ni compra → no se muestra al público. Al vencer se OCULTA (no se borra) y vuelve al renovar.
    pendientePago: { type: Boolean, default: false },
    suscripcion: { type: mongoose.Schema.Types.Mixed, default: {} }, // { origen: gratis|play|invitacion, plan, ultimoAvisoUmbral, ultimoAvisoVencimiento }
    // Disponible hoy / Ocupado, con un toque. "Disponible hoy" solo vale el día en que se marcó (disponibleEl, YYYY-MM-DD hora Argentina)
    disponible: { type: Boolean, default: null },
    disponibleEl: { type: String, default: null },
    // Privacidad (misma idea que en negocios; las decide el dueño en Ajustes → Privacidad)
    duenoEnPerfil: { type: Boolean, default: false },
    duenoEnFicha: { type: Boolean, default: false },
    apareceEnBusquedas: { type: Boolean, default: true },
    // Fase 8: si el equipo de Mi Zona la ocultó por una denuncia, no sale en listados, búsquedas ni se abre desde afuera. El dueño la sigue viendo y puede apelar.
    ocultaPorEquipo: { type: Boolean, default: false },
    ocultaMotivo: { type: String, default: "" },
    ocultaDesde: { type: Date, default: null },
    ocultaMedidaId: { type: String, default: "" },
    textoBusqueda: { type: String, default: "" }, // rubros + descripción + zona, sin tildes
    // Fase 6: cuándo el dueño completó el menú de compartir tras activar la ficha. NO prueba que el mensaje llegó: solo que lo abrió y lo completó.
    compartioEn: { type: Date, default: null },
  },
  { timestamps: true }
);

oficioSchema.index({ status: 1, apareceEnBusquedas: 1, "localidad.provinciaId": 1, "localidad.departamentoId": 1, "localidad.localidadId": 1 });
oficioSchema.index({ rubros: 1 });

export default mongoose.model("Oficio", oficioSchema);
