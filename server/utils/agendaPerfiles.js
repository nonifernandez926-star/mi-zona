// La agenda se adapta al rubro del negocio: cambian los tipos de evento que se ofrecen al cargar algo y las tareas sugeridas.
// Los rubros de Mi Zona se agrupan en perfiles parecidos.
const TIPOS_BASE = [
  { id: "reunion", label: "Reunión" },
  { id: "proveedor", label: "Proveedor" },
  { id: "entrega", label: "Entrega o retiro" },
  { id: "pago", label: "Pago o vencimiento" },
  { id: "personal", label: "Personal / empleados" },
  { id: "evento", label: "Evento especial" },
];

const PERFILES = {
  gastronomia: {
    nombre: "Gastronomía",
    tipos: [
      { id: "reserva", label: "Reserva" }, { id: "encargo", label: "Pedido especial" }, { id: "proveedor", label: "Proveedor" },
      { id: "compras", label: "Compras" }, { id: "evento", label: "Evento" }, { id: "personal", label: "Personal" },
      { id: "mantenimiento", label: "Mantenimiento de equipos" },
    ],
    tareas: ["Revisar el stock", "Hacer las compras de la semana", "Pagar a un proveedor", "Revisar las ventas", "Armar el horario del personal", "Revisar el mantenimiento de equipos"],
  },
  salud: {
    nombre: "Salud",
    tipos: [
      { id: "consulta", label: "Consulta / turno" }, { id: "reunion", label: "Reunión" }, { id: "proveedor", label: "Proveedor" },
      { id: "capacitacion", label: "Capacitación" }, { id: "mantenimiento", label: "Mantenimiento de equipos" }, { id: "personal", label: "Personal" },
    ],
    tareas: ["Revisar insumos", "Facturar a obras sociales", "Llamar a un paciente", "Renovar habilitaciones", "Pedir material a proveedores"],
  },
  mascotas: {
    nombre: "Mascotas y veterinaria",
    tipos: [
      { id: "consulta", label: "Consulta / turno" }, { id: "vacunacion", label: "Vacunación" }, { id: "proveedor", label: "Proveedor" },
      { id: "compras", label: "Compra de productos" }, { id: "personal", label: "Personal" },
    ],
    tareas: ["Revisar el stock de alimento y medicamentos", "Recordarle una vacuna a un cliente", "Pagar a un proveedor", "Revisar las ventas"],
  },
  hogar: {
    nombre: "Servicios del hogar",
    tipos: [
      { id: "visita", label: "Visita a domicilio" }, { id: "presupuesto", label: "Presupuesto" }, { id: "materiales", label: "Compra de materiales" },
      { id: "proveedor", label: "Proveedor" }, { id: "entrega", label: "Entrega de trabajo" }, { id: "cobro", label: "Cobro" },
    ],
    tareas: ["Enviar un presupuesto", "Comprar materiales o repuestos", "Cobrar un trabajo terminado", "Llamar a un cliente", "Coordinar visitas de la semana"],
  },
  automotor: {
    nombre: "Automotor y talleres",
    tipos: [
      { id: "turno", label: "Turno / ingreso" }, { id: "entrega", label: "Entrega" }, { id: "repuestos", label: "Repuestos" },
      { id: "proveedor", label: "Proveedor" }, { id: "presupuesto", label: "Presupuesto" }, { id: "mantenimiento", label: "Mantenimiento pendiente" },
    ],
    tareas: ["Pedir repuestos", "Enviar un presupuesto", "Llamar a un cliente por su trabajo", "Revisar herramientas", "Pagar a un proveedor"],
  },
  belleza: {
    nombre: "Belleza",
    tipos: [
      { id: "turno", label: "Turno / cliente" }, { id: "tratamiento", label: "Tratamiento" }, { id: "proveedor", label: "Proveedor" },
      { id: "compras", label: "Compra de productos" }, { id: "personal", label: "Horarios del personal" },
    ],
    tareas: ["Reponer productos", "Recordarle el turno a un cliente", "Esterilizar y ordenar el material", "Pagar a un proveedor", "Armar los horarios del personal"],
  },
  comercio: {
    nombre: "Comercio",
    tipos: [
      { id: "mercaderia", label: "Recepción de mercadería" }, { id: "pedido_proveedor", label: "Pedido a proveedor" }, { id: "entrega", label: "Entrega" },
      { id: "pago", label: "Pago" }, { id: "promocion", label: "Promoción / evento" }, { id: "inventario", label: "Inventario" }, { id: "reunion", label: "Reunión" },
    ],
    tareas: ["Hacer el inventario", "Pedir mercadería a proveedores", "Pagar una factura", "Preparar una promoción", "Revisar las ventas"],
  },
  educacion: {
    nombre: "Educación",
    tipos: [
      { id: "clase", label: "Clase" }, { id: "reunion", label: "Reunión con alumnos / familias" }, { id: "examen", label: "Examen / evaluación" },
      { id: "evento", label: "Evento institucional" }, { id: "capacitacion", label: "Capacitación" },
    ],
    tareas: ["Preparar una clase", "Corregir trabajos", "Avisar a las familias", "Armar el cronograma", "Cobrar cuotas pendientes"],
  },
  eventos: {
    nombre: "Eventos y fiestas",
    tipos: [
      { id: "evento", label: "Evento / fiesta" }, { id: "visita", label: "Visita / degustación" }, { id: "proveedor", label: "Proveedor" },
      { id: "armado", label: "Armado / entrega" }, { id: "sena", label: "Pago de seña" },
    ],
    tareas: ["Confirmar proveedores del evento", "Cobrar una seña", "Armar el cronograma del evento", "Revisar el material", "Enviar un presupuesto"],
  },
  turismo: {
    nombre: "Turismo y alojamiento",
    tipos: [
      { id: "reserva", label: "Reserva" }, { id: "checkin", label: "Check-in / check-out" }, { id: "proveedor", label: "Proveedor" },
      { id: "mantenimiento", label: "Mantenimiento" }, { id: "limpieza", label: "Limpieza" },
    ],
    tareas: ["Confirmar las reservas de la semana", "Coordinar la limpieza", "Revisar el mantenimiento", "Responder consultas pendientes"],
  },
  agro: {
    nombre: "Agro e insumos rurales",
    tipos: [
      { id: "visita", label: "Visita a campo / cliente" }, { id: "entrega", label: "Entrega de insumos" }, { id: "proveedor", label: "Proveedor" },
      { id: "pago", label: "Pago / cobro" }, { id: "mercaderia", label: "Recepción de mercadería" },
    ],
    tareas: ["Pedir insumos a proveedores", "Cobrar a un cliente", "Coordinar entregas", "Revisar el stock"],
  },
  inmobiliaria: {
    nombre: "Inmobiliaria",
    tipos: [
      { id: "visita", label: "Visita a propiedad" }, { id: "tasacion", label: "Tasación" }, { id: "firma", label: "Firma / escritura" },
      { id: "reunion", label: "Reunión con cliente" }, { id: "vencimiento", label: "Vencimiento de contrato" },
    ],
    tareas: ["Publicar una propiedad", "Llamar a un interesado", "Preparar un contrato", "Renovar un alquiler"],
  },
  deportes: {
    nombre: "Deportes y recreación",
    tipos: [
      { id: "clase", label: "Clase / entrenamiento" }, { id: "reserva", label: "Reserva de cancha o espacio" }, { id: "evento", label: "Torneo / evento" },
      { id: "proveedor", label: "Proveedor" }, { id: "mantenimiento", label: "Mantenimiento" },
    ],
    tareas: ["Armar la grilla de clases", "Cobrar cuotas pendientes", "Revisar el mantenimiento", "Pedir equipamiento"],
  },
  servicios: {
    nombre: "Servicios profesionales",
    tipos: [
      { id: "cliente", label: "Reunión con cliente" }, { id: "presupuesto", label: "Presupuesto" }, { id: "vencimiento", label: "Vencimiento / trámite" },
      { id: "visita", label: "Visita / trabajo en terreno" }, { id: "reunion", label: "Reunión" },
    ],
    tareas: ["Preparar un presupuesto", "Presentar un trámite", "Responder consultas pendientes", "Facturar", "Revisar vencimientos de clientes"],
  },
};

// categoría de Mi Zona (cat) -> perfil
const GRUPO_POR_CAT = {
  comida: "gastronomia", panaderia: "gastronomia", carnicerias: "gastronomia", verduleria: "gastronomia",
  salud: "salud", farmacia: "salud",
  mascotas: "mascotas",
  hogar: "hogar", limpieza: "hogar", cerrajeria: "hogar",
  automotor: "automotor", talleres: "automotor",
  belleza: "belleza", barberias: "belleza",
  moda: "comercio", tecnologia: "comercio", almacenes: "comercio", mayoristas: "comercio", florerias: "comercio",
  ferreterias: "comercio", bebes: "comercio", religion: "comercio", imprenta: "comercio",
  educacion: "educacion",
  eventos: "eventos",
  turismo: "turismo",
  agro: "agro",
  inmobiliaria: "inmobiliaria",
  deportes: "deportes",
  servicios: "servicios",
};

export function perfilAgenda(cat) {
  const p = PERFILES[GRUPO_POR_CAT[cat]];
  if (p) return { rubro: p.nombre, tipos: p.tipos, tareas: p.tareas };
  return { rubro: "General", tipos: TIPOS_BASE, tareas: ["Llamar a un proveedor", "Revisar las ventas", "Pagar una factura", "Preparar un presupuesto"] };
}
