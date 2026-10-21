// Reglas de usuario y contraseña (se repiten idénticas en la web: src/credenciales.js). Cambiar una = cambiar la otra.
const RESERVADOS = new Set(["admin", "administrador", "soporte", "mizona", "mi_zona", "mi.zona", "moderador", "equipo", "ayuda", "root", "sistema", "negocio", "oficial"]);

export const normalizarUsuario = (v) => String(v ?? "").trim().toLowerCase();

// Devuelve "" si el usuario es válido; si no, el mensaje que se le muestra a la persona.
export function validarUsuario(valor) {
  const u = normalizarUsuario(valor);
  if (u.length < 5) return "El usuario tiene que tener al menos 5 caracteres.";
  if (u.length > 20) return "El usuario puede tener hasta 20 caracteres.";
  if (!/^[a-z]/.test(u)) return "El usuario tiene que empezar con una letra.";
  if (!/^[a-z0-9._]+$/.test(u)) return "Usá solo letras, números, punto o guion bajo (sin espacios ni tildes).";
  if (/[._]{2}/.test(u) || /[._]$/.test(u)) return "No uses dos signos seguidos ni termines con punto o guion bajo.";
  if (RESERVADOS.has(u)) return "Ese usuario no está disponible. Elegí otro.";
  return "";
}

// Devuelve "" si la contraseña cumple; si no, el mensaje.
export function validarContrasena(valor, usuario = "") {
  const p = String(valor ?? "");
  if (p.length < 8) return "La contraseña tiene que tener al menos 8 caracteres.";
  if (p.length > 100) return "La contraseña es demasiado larga (máximo 100).";
  if (/\s/.test(p)) return "La contraseña no puede tener espacios.";
  const u = normalizarUsuario(usuario);
  if (u && p.toLowerCase().includes(u)) return "La contraseña no puede contener tu usuario.";
  return "";
}
