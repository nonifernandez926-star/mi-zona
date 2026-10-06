// Colores de las baldosas de iconos: una sola fuente para toda la app.
export const TONOS = {
  azul: { bg: "linear-gradient(180deg,#EEF4FF,#DCE8FD)", fg: "#2350F5", aro: "#D3E1FA" },
  violeta: { bg: "linear-gradient(180deg,#F5EFFE,#E8DDFB)", fg: "#7A4FD6", aro: "#E0D2F8" },
  verde: { bg: "linear-gradient(180deg,#E9F8F0,#D4F0E1)", fg: "#1E8A55", aro: "#C3E8D3" },
  naranja: { bg: "linear-gradient(180deg,#FFF5E3,#FFE8C2)", fg: "#E08A12", aro: "#FADFAE" },
  rojo: { bg: "linear-gradient(180deg,#FEEFED,#FADBD7)", fg: "#D9423A", aro: "#F5C6C1" },
  agua: { bg: "linear-gradient(180deg,#E4F7F6,#CCEEEC)", fg: "#13897F", aro: "#BDE6E3" },
};
const POR_ICONO = {
  MapPin: "verde", MessageCircle: "agua", Eye: "azul", BarChart3: "violeta", Sparkles: "naranja", Smartphone: "azul", History: "agua",
  CalendarCheck: "rojo", CalendarDays: "rojo", Star: "naranja", Bell: "violeta", BellOff: "violeta", Download: "verde", UserX: "rojo",
  ShieldCheck: "verde", KeyRound: "naranja", Heart: "rojo", Mail: "azul", Clock: "naranja", MonitorSmartphone: "azul", Store: "verde",
  Send: "violeta", BookOpen: "azul", Share2: "agua", Info: "azul", Inbox: "violeta", FileText: "azul", Code: "violeta", Lock: "violeta",
  Trash2: "rojo", LogOut: "rojo",
};
// Devuelve el tono de un icono de lucide (por su nombre); "rojo" fuerza el tono de peligro.
export function tonoDe(Icon, danger = false) {
  if (danger) return TONOS.rojo;
  return TONOS[POR_ICONO[Icon?.displayName]] || TONOS.azul;
}
