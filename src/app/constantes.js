// Listas fijas de Mi Zona: categorías, preguntas por rubro, zonas, formas de pago, días y otras constantes.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { Apple, Baby, Beef, Building2, Car, Church, Croissant, Dog, Droplet, Dumbbell, Eye, Gift, GraduationCap, Hammer, HardHat, Home, KeyRound, Laptop, Navigation, Package, Palmtree, PartyPopper, Pill, Printer, Scissors, Shirt, ShoppingCart, Sparkles, Star, Tag, Tractor, UtensilsCrossed, Wrench } from "lucide-react";

export const CATEGORIES = [
  { id: "comida", label: "Gastronomía", icon: UtensilsCrossed, color: "#C1443A", quick: true },
  { id: "salud", label: "Salud", icon: Pill, color: "#2C6E8A", quick: true },
  { id: "servicios", label: "Servicios", icon: Wrench, color: "#0B1437", quick: true },
  { id: "hogar", label: "Hogar", icon: Home, color: "#3C8558", quick: true },
  { id: "moda", label: "Moda y retail", icon: Shirt, color: "#7A4F9E", quick: true },
  { id: "automotor", label: "Automotor", icon: Car, color: "#4A5568", quick: false },
  { id: "belleza", label: "Belleza y estética", icon: Sparkles, color: "#B8703F", quick: false },
  { id: "mascotas", label: "Mascotas y veterinaria", icon: Dog, color: "#B0793A", quick: false },
  { id: "tecnologia", label: "Tecnología", icon: Laptop, color: "#2C6E8A", quick: false },
  { id: "educacion", label: "Educación", icon: GraduationCap, color: "#8A7A2E", quick: false },
  { id: "agro", label: "Agro e insumos rurales", icon: Tractor, color: "#5A7A3C", quick: false },
  { id: "eventos", label: "Eventos y fiestas", icon: PartyPopper, color: "#A6437A", quick: false },
  { id: "inmobiliaria", label: "Inmobiliaria", icon: Building2, color: "#3B5266", quick: false },
  { id: "turismo", label: "Turismo y alojamiento", icon: Palmtree, color: "var(--azul)", quick: false },
  { id: "deportes", label: "Deportes y recreación", icon: Dumbbell, color: "#C1443A", quick: false },
  { id: "talleres", label: "Talleres y reparaciones", icon: Hammer, color: "#4A5568", quick: false },
  { id: "almacenes", label: "Almacenes y supermercados", icon: ShoppingCart, color: "#3C8558", quick: false },
  { id: "carnicerias", label: "Carnicerías y pollerías", icon: Beef, color: "#B23A2E", quick: false },
  { id: "verduleria", label: "Frutas y verduras", icon: Apple, color: "#5A8A3C", quick: false },
  { id: "farmacia", label: "Farmacias y perfumerías", icon: Pill, color: "#3B7A9E", quick: false },
  { id: "panaderia", label: "Panaderías y repostería", icon: Croissant, color: "#B8763A", quick: false },
  { id: "limpieza", label: "Limpieza y lavandería", icon: Droplet, color: "#2C8AA6", quick: false },
  { id: "imprenta", label: "Imprenta y gráfica", icon: Printer, color: "#5B5F6B", quick: false },
  { id: "cerrajeria", label: "Cerrajería", icon: KeyRound, color: "#8A7A2E", quick: false },
  { id: "barberias", label: "Barberías", icon: Scissors, color: "#0B1437", quick: false },
  { id: "mayoristas", label: "Mayoristas y distribuidores", icon: Package, color: "#4A5568", quick: false },
  { id: "florerias", label: "Florerías y regalos", icon: Gift, color: "#A6437A", quick: false },
  { id: "ferreterias", label: "Ferreterías y materiales", icon: HardHat, color: "#B8703F", quick: false },
  { id: "bebes", label: "Bebés y niños", icon: Baby, color: "#7A9EB8", quick: false },
  { id: "religion", label: "Religión y artículos religiosos", icon: Church, color: "#6E5A8A", quick: false },
];

export const QUICK_CATEGORIES = CATEGORIES.filter((c) => c.quick);

// «Todo en Otros» (Negocios): todos los rubros que no están en la fila de arriba. Es un valor especial de activeCat.
export const CAT_OTROS = "__otros";

export const INFO_OTROS = { id: CAT_OTROS, label: "Otros", icon: Package, color: "#13897F" };

// Lo que reciben las tarjetas y las subpantallas compartidas (src/hojaCategorias.jsx)
export const ITEMS_RAPIDOS = QUICK_CATEGORIES.map((c) => ({ id: c.id, label: c.label.split(" ")[0], Icono: c.icon, color: c.color }));

export const ITEMS_OTROS = CATEGORIES.filter((c) => !c.quick).map((c) => ({ id: c.id, label: c.label, Icono: c.icon, color: c.color }));

export const ITEMS_TODOS = CATEGORIES.map((c) => ({ id: c.id, label: c.label, Icono: c.icon, color: c.color }));

// Preguntas específicas según el rubro elegido, para el formulario de alta de negocio.
// Los rubros más comunes tienen preguntas propias; el resto usa un set genérico.
export const CATEGORY_QUESTIONS = {
  comida: [
    { key: "opcionesVeg", label: "¿Tenés opciones vegetarianas o veganas?", type: "bool" },
    { key: "aptoCeliaco", label: "¿Tenés opciones aptas para celíacos?", type: "bool" },
    { key: "reservas", label: "¿Se puede reservar mesa?", type: "bool" },
    { key: "tiempoEntrega", label: "Tiempo estimado de entrega/espera", type: "text", placeholder: "Ej: 30-40 minutos" },
  ],
  salud: [
    { key: "obraSocial", label: "¿Atendés obras sociales o prepagas?", type: "text", placeholder: "Ej: OSDE, Swiss Medical, PAMI..." },
    { key: "turnoOnline", label: "¿Se puede sacar turno online o por teléfono?", type: "bool" },
    { key: "urgencias", label: "¿Atendés urgencias?", type: "bool" },
    { key: "matricula", label: "N° de matrícula profesional (opcional)", type: "text", placeholder: "Ej: MP 12345" },
  ],
  servicios: [
    { key: "presupuestoSinCargo", label: "¿El presupuesto es sin cargo?", type: "bool" },
    { key: "vaDomicilio", label: "¿Vas al domicilio del cliente?", type: "bool" },
    { key: "garantia", label: "¿Ofrecés garantía sobre el trabajo?", type: "text", placeholder: "Ej: 30 días" },
    { key: "zonaCobertura", label: "Zona de cobertura", type: "text", placeholder: "Ej: toda la provincia, solo capital..." },
  ],
  hogar: [
    { key: "envioInstalacion", label: "¿El envío incluye instalación/armado?", type: "bool" },
    { key: "financiacion", label: "¿Ofrecés financiación o cuotas?", type: "bool" },
    { key: "marcas", label: "Marcas o rubros principales", type: "text", placeholder: "Ej: electrodomésticos, muebles, decoración" },
  ],
  moda: [
    { key: "talles", label: "Rango de talles disponibles", type: "text", placeholder: "Ej: S al XXL" },
    { key: "probador", label: "¿Tenés probador en el local?", type: "bool" },
    { key: "cambios", label: "Política de cambios y devoluciones", type: "text", placeholder: "Ej: cambios dentro de 10 días con ticket" },
  ],
};

export const DEFAULT_QUESTIONS = [
  { key: "atencionPersonalizada", label: "¿Ofrecés atención personalizada o a medida?", type: "bool" },
  { key: "zonaCobertura", label: "Zona de cobertura o alcance", type: "text", placeholder: "Ej: toda la provincia, solo capital..." },
];

// Lista de respaldo (por si la API de Georef no responde). Las provincias y localidades
// reales de todo el país se obtienen en vivo desde la API oficial del Gobierno argentino.
export const ZONES = [
  "San Miguel de Tucumán, Tucumán", "Yerba Buena, Tucumán", "Tafí Viejo, Tucumán",
  "Concepción, Tucumán", "Banda del Río Salí, Tucumán", "Aguilares, Tucumán",
];

export const GEOREF_API = "https://apis.datos.gob.ar/georef/api";

// TODO: reemplazar por la URL real donde está publicado Mi Asistente
export const MI_ASISTENTE_URL = "https://nonifernandez926-star.github.io/empleado-virtual-ia/registro.html";

// Panel de administración de Mi Asistente (misma web que el registro, pero admin.html)
export const MI_ASISTENTE_ADMIN_URL = MI_ASISTENTE_URL.replace("registro.html", "admin.html");

export const PAYMENT_METHODS = ["Efectivo", "Tarjeta de débito", "Tarjeta de crédito", "Transferencia", "Mercado Pago"];

export const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/* ---------- negocios nuevos ---------- */

export const NUEVO_DIAS = 30; // un negocio es "nuevo en Mi Zona" durante sus primeros 30 días

// Opciones de orden del inicio (se eligen en una hoja con íconos, no con el menú nativo del celular)
export const ORDEN_OPCIONES = [
  { id: "destacados", Icon: Star, titulo: "Destacados", desc: "Los negocios mejor valorados y promocionados", color: "#E08A1E", fondo: "#FFF4E0" },
  { id: "vistas", Icon: Eye, titulo: "Más visitados", desc: "Los que más personas están mirando", color: "#2A58FF", fondo: "#E8EEFF" },
  { id: "descuentos", Icon: Tag, titulo: "Descuentos", desc: "Solo negocios con promociones vigentes", color: "#2C9A5F", fondo: "#E4F3EA" },
  { id: "cercanos", Icon: Navigation, titulo: "Más cercanos", desc: "Ordenados por la distancia desde tu ubicación", color: "#C1443A", fondo: "#FDF1EF" },
];

/* ---------- empleos ---------- */


export const TIPOS_PUESTO = ["Cocina", "Chef", "Atención al cliente / Mozo", "Delivery / Repartidor", "Administrativo", "Ventas", "Otro"];

export const DURACIONES_BUSQUEDA = [
  { dias: 7, label: "7 días" },
  { dias: 15, label: "15 días" },
  { dias: 30, label: "30 días" },
  { dias: 60, label: "60 días" },
];
