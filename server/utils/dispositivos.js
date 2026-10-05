// Convierte el "user-agent" del navegador en un nombre que la persona entienda: "Chrome en Android".
export function describirDispositivo(ua) {
  const s = String(ua || "").slice(0, 400);
  let so = "dispositivo desconocido";
  if (/iPad/i.test(s)) so = "iPad";
  else if (/iPhone|iPod/i.test(s)) so = "iPhone";
  else if (/Android/i.test(s)) so = "Android";
  else if (/Windows/i.test(s)) so = "Windows";
  else if (/Macintosh|Mac OS X/i.test(s)) so = "Mac";
  else if (/CrOS/i.test(s)) so = "Chromebook";
  else if (/Linux/i.test(s)) so = "Linux";

  let nav = "Navegador";
  if (/Edg\//i.test(s)) nav = "Edge";
  else if (/OPR\/|Opera/i.test(s)) nav = "Opera";
  else if (/SamsungBrowser/i.test(s)) nav = "Samsung Internet";
  else if (/Firefox|FxiOS/i.test(s)) nav = "Firefox";
  else if (/Chrome|CriOS/i.test(s)) nav = "Chrome";
  else if (/Safari/i.test(s)) nav = "Safari";

  let tipo = "computadora";
  if (/iPad|Tablet/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))) tipo = "tablet";
  else if (/Mobile|iPhone|iPod|Android/i.test(s)) tipo = "celular";

  return { nombre: `${nav} en ${so}`, tipo };
}
