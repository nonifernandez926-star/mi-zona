// Planes de suscripción de un negocio en Mi Zona. Los precios salen del .env (con estos valores por defecto).
const num = (v, def) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : def);

export const PLANES = {
  "1_mes": { meses: 1, label: "1 mes", precio: num(process.env.PRECIO_1_MES, 3000) },
  "3_meses": { meses: 3, label: "3 meses", precio: num(process.env.PRECIO_3_MESES, 8100) },
  "6_meses": { meses: 6, label: "6 meses", precio: num(process.env.PRECIO_6_MESES, 14400) },
};

const base = PLANES["1_mes"].precio;
Object.values(PLANES).forEach((p) => {
  const sinDescuento = base * p.meses;
  p.precioPorMes = Math.round(p.precio / p.meses);
  p.precioSinDescuento = sinDescuento;
  p.ahorro = Math.max(0, sinDescuento - p.precio);
  p.descuentoPorcentaje = sinDescuento > 0 ? Math.round((p.ahorro / sinDescuento) * 100) : 0;
});
