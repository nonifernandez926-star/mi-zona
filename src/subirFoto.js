// Subida de fotos a Cloudinary (las fotos de negocios y la foto de perfil usan el mismo servicio) y compresión previa.
const CLOUDINARY_CLOUD_NAME = "hiyaxxdk";
const CLOUDINARY_UPLOAD_PRESET = "mi-zona-fotos";

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Error al subir la imagen a Cloudinary");
  const data = await res.json();
  return data.secure_url;
}

// Recorta al centro y achica una foto (cuadrada, de hasta `lado` px) antes de subirla: la foto de perfil no necesita más.
// Si el navegador no puede procesarla, devuelve el archivo tal cual.
export async function comprimirImagen(archivo, lado = 512, calidad = 0.85) {
  try {
    const bmp = await createImageBitmap(archivo);
    const corte = Math.min(bmp.width, bmp.height);
    const salida = Math.min(lado, corte);
    const lienzo = document.createElement("canvas");
    lienzo.width = salida; lienzo.height = salida;
    lienzo.getContext("2d").drawImage(bmp, (bmp.width - corte) / 2, (bmp.height - corte) / 2, corte, corte, 0, 0, salida, salida);
    const blob = await new Promise((ok) => lienzo.toBlob(ok, "image/jpeg", calidad));
    return blob || archivo;
  } catch {
    return archivo;
  }
}

// Achica una foto de trabajo SIN recortarla (mantiene la forma): el lado más largo queda en `maxLado` px. Así carga rápido en celulares modestos.
export async function comprimirFoto(archivo, maxLado = 1280, calidad = 0.82) {
  try {
    const bmp = await createImageBitmap(archivo);
    const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(bmp.width * escala); lienzo.height = Math.round(bmp.height * escala);
    lienzo.getContext("2d").drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise((ok) => lienzo.toBlob(ok, "image/jpeg", calidad));
    return blob || archivo;
  } catch {
    return archivo;
  }
}
