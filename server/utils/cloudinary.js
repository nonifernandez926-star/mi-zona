// Borrado de fotos en Cloudinary (al eliminar una cuenta). Las fotos se suben directo desde la web con un preset sin firma, así que
// borrarlas necesita las claves del servidor: CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET (ver .env.example). Sin ellas, no borra y avisa.
const CLOUD = (process.env.CLOUDINARY_CLOUD_NAME || "hiyaxxdk").replace(/[^a-zA-Z0-9_-]/g, "");

export const cloudinaryConfigurado = () => !!(process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// https://res.cloudinary.com/<nube>/image/upload/[transformaciones/][v123/]carpeta/nombre.jpg  →  "carpeta/nombre". Solo acepta fotos de NUESTRA nube.
export function publicIdDe(url) {
  const m = String(url || "").match(new RegExp(`^https://res\\.cloudinary\\.com/${CLOUD}/image/upload/(.+)$`));
  if (!m) return null;
  let partes = m[1].split("?")[0].split("/");
  const v = partes.findIndex((p) => /^v\d+$/.test(p));
  if (v >= 0) partes = partes.slice(v + 1);
  const ultimo = partes.length - 1;
  if (ultimo < 0) return null;
  partes[ultimo] = partes[ultimo].replace(/\.[A-Za-z0-9]{2,5}$/, "");
  try { const id = partes.map(decodeURIComponent).join("/"); return id && !id.includes("..") ? id : null; } catch { return null; }
}

// Borra las fotos. Devuelve true si no queda nada por borrar (también cuando no había fotos nuestras), false si hay que reintentar.
export async function borrarFotos(urls) {
  const ids = [...new Set((urls || []).map(publicIdDe).filter(Boolean))];
  if (!ids.length) return true;
  if (!cloudinaryConfigurado()) { console.error("Cloudinary: faltan CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET; no se borraron", ids.length, "fotos"); return false; }
  const auth = "Basic " + Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString("base64");
  for (let i = 0; i < ids.length; i += 50) {
    const lote = ids.slice(i, i + 50);
    const consulta = lote.map((id) => `public_ids[]=${encodeURIComponent(id)}`).join("&") + "&invalidate=true";
    try {
      const control = new AbortController();
      const timer = setTimeout(() => control.abort(), 20000);
      const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/resources/image/upload?${consulta}`, { method: "DELETE", headers: { Authorization: auth }, signal: control.signal }).finally(() => clearTimeout(timer));
      if (!r.ok) { console.error("Cloudinary respondió", r.status, "al borrar fotos"); return false; }
    } catch (e) { console.error("Cloudinary: falló el borrado:", e?.message); return false; }
  }
  return true;
}
