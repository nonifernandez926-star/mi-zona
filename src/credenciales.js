// Reglas de usuario y contraseña. Son las mismas que valida el servidor (server/utils/credenciales.js): cambiar una = cambiar la otra.
const RESERVADOS = new Set(["admin", "administrador", "soporte", "mizona", "mi_zona", "mi.zona", "moderador", "equipo", "ayuda", "root", "sistema", "negocio", "oficial"]);

export const normalizarUsuario = (v) => String(v ?? "").trim().toLowerCase();

// "" si es válido; si no, el mensaje para la persona.
export function validarUsuario(valor) {
  const u = normalizarUsuario(valor);
  if (u.length < 5) return "Tiene que tener al menos 5 caracteres.";
  if (u.length > 20) return "Puede tener hasta 20 caracteres.";
  if (!/^[a-z]/.test(u)) return "Tiene que empezar con una letra.";
  if (!/^[a-z0-9._]+$/.test(u)) return "Usá solo letras, números, punto o guion bajo (sin espacios ni tildes).";
  if (!/[0-9]/.test(u)) return "Tiene que incluir al menos un número.";
  if (/[._]{2}/.test(u) || /[._]$/.test(u)) return "No uses dos signos seguidos ni termines con punto o guion bajo.";
  if (RESERVADOS.has(u)) return "Ese usuario no está disponible. Elegí otro.";
  return "";
}

// Lista de requisitos para mostrar en vivo mientras escribe la contraseña.
export const requisitosContrasena = (p) => [
  { ok: String(p).length >= 8, texto: "8 caracteres o más" },
  { ok: /[A-Z]/.test(p), texto: "Una letra mayúscula" },
  { ok: /[a-z]/.test(p), texto: "Una letra minúscula" },
  { ok: /[0-9]/.test(p), texto: "Un número" },
];

export function validarContrasena(valor, usuario = "") {
  const p = String(valor ?? "");
  if (p.length < 8) return "Tiene que tener al menos 8 caracteres.";
  if (p.length > 100) return "Es demasiado larga (máximo 100).";
  if (/\s/.test(p)) return "No puede tener espacios.";
  if (!/[a-z]/.test(p)) return "Tiene que incluir una letra minúscula.";
  if (!/[A-Z]/.test(p)) return "Tiene que incluir una letra mayúscula.";
  if (!/[0-9]/.test(p)) return "Tiene que incluir un número.";
  const u = normalizarUsuario(usuario);
  if (u && p.toLowerCase().includes(u)) return "No puede contener tu usuario.";
  return "";
}
