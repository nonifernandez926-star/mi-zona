// Íconos y colores de las subpantallas de Alquileres y Oficios (las mismas tarjetas con cuadrado de color que usa Negocios).
// Los colores salen de la paleta de Negocios (App.jsx) para que las tres secciones se vean como una sola app.
// Solo se usan íconos de lucide-react que el proyecto ya usa en otros lados.
import {
  Home, Building2, Bed, Users, Flame, Store, Car, MapPin, Package, PartyPopper, Sparkles, Music2, UtensilsCrossed, Palmtree, Crown, Gift,
  Zap, Hammer, HardHat, Tractor, Droplets, Power, Wrench, Truck, Laptop, Dumbbell, Baby, Paintbrush, Grid3x3, Layers, Image, KeyRound, Settings,
  Thermometer, Camera, MonitorSmartphone, Scissors, Dog, PawPrint, Bath, Medal, LifeBuoy, Droplet, GraduationCap, ShieldCheck,
} from "lucide-react";

// Categorías de Alquileres (la fila de arriba y el encabezado de cada hoja)
export const ICONO_CAT = { viviendas: Home, eventos: PartyPopper, herramientas: Hammer, otros: Package };
export const COLOR_CAT = { viviendas: "#2350F5", eventos: "#7A4FD6", herramientas: "#E08A12", otros: "#13897F" };

// Tipos de alquiler: id → [ícono, color]
export const ICONO_TIPO_ALQ = {
  // viviendas y espacios
  casa: [Home, "#2350F5"], departamento: [Building2, "#3B5266"], habitacion: [Bed, "#7A4F9E"], salon: [Users, "#A6437A"],
  quincho: [Flame, "#C1443A"], local: [Store, "#B8703F"], cochera: [Car, "#4A5568"], terreno: [MapPin, "#5A7A3C"], otro_espacio: [Package, "#13897F"],
  // cumpleaños y eventos
  sillas_mesas: [Users, "#2C6E8A"], peloteros: [PartyPopper, "#A6437A"], decoracion: [Sparkles, "#B8703F"], sonido: [Music2, "#7A4F9E"],
  vajilla: [UtensilsCrossed, "#C1443A"], carpas: [Palmtree, "#3C8558"], disfraces: [Crown, "#E08A12"], otro_evento: [Gift, "#13897F"],
  // herramientas y equipos
  herr_electricas: [Zap, "#E08A12"], herr_manuales: [Hammer, "#4A5568"], construccion: [HardHat, "#B8703F"], jardin: [Tractor, "#5A7A3C"],
  limpieza: [Droplets, "#2C8AA6"], generadores: [Power, "#C1443A"], otro_equipo: [Wrench, "#13897F"],
  // otros alquileres
  vehiculos: [Truck, "#2C6E8A"], tecnologia: [Laptop, "#3B7A9E"], deportes: [Dumbbell, "#C1443A"], bebes: [Baby, "#7A9EB8"], otro: [Package, "#13897F"],
};

// Rubros de Oficios: id → [ícono, color]. Son todos los de src/rubros.js (los diez primeros son los de la fila de arriba).
export const ICONO_RUBRO_OFICIO = {
  // construcción y reparaciones
  albanil: [HardHat, "#B8703F"], plomero: [Droplets, "#2C8AA6"], electricista: [Zap, "#E08A12"], gasista: [Flame, "#C1443A"], pintor: [Paintbrush, "#7A4F9E"],
  carpintero: [Hammer, "#8A7A2E"], herrero: [Wrench, "#4A5568"], soldador: [Flame, "#B23A2E"], techista: [Home, "#3B5266"], ceramista: [Grid3x3, "#2C6E8A"],
  yesero: [Layers, "#5B5F6B"], vidriero: [Image, "#2C8AA6"], cerrajero: [KeyRound, "#8A7A2E"], reparaciones: [Settings, "#4A5568"],
  // técnicos e instalaciones
  tecnico_electrodomesticos: [Power, "#2C6E8A"], tecnico_pc: [Laptop, "#3B7A9E"], instalador_aire: [Thermometer, "#2C8AA6"],
  instalador_camaras: [Camera, "#4A5568"], instalador_redes: [MonitorSmartphone, "#2350F5"],
  // hogar y limpieza
  limpieza: [Sparkles, "#13897F"], jardinero: [Palmtree, "#3C8558"], fletes: [Truck, "#4A5568"], tapicero: [Bed, "#7A4F9E"], modista: [Scissors, "#A6437A"], fumigador: [ShieldCheck, "#5A7A3C"],
  // mascotas
  cuidador_mascotas: [Dog, "#B0793A"], paseador_perros: [PawPrint, "#B8763A"], peluqueria_canina: [Bath, "#2C8AA6"], adiestrador: [Medal, "#8A7A2E"],
  // vehículos
  mecanico: [Car, "#4A5568"], gomeria: [LifeBuoy, "#3B5266"], chapista: [Car, "#A6437A"], lavadero: [Droplet, "#2C6E8A"],
  // otros servicios
  fotografo: [Camera, "#7A4F9E"], profesor_particular: [GraduationCap, "#8A7A2E"],
};
