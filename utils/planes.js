// Planes de Mi Zona. Se paga SOLO para tener un negocio, un oficio o un alquiler publicados; todo lo demás es gratis.
// Los tres tipos tienen los mismos planes: 1, 3 y 6 meses (3 meses con 10% menos y 6 meses con 20% menos).
// El COBRO lo hace Google Play Billing (los precios reales se cargan en Play Console); los precios de acá son los de referencia
// que muestra la app antes de abrir Google Play, y salen del .env (con estos valores por defecto).
const num = (v, def) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : def);

export const TIPOS = ["negocio", "oficio", "alquiler"];
export const ROTULO_TIPO = { negocio: "negocio", oficio: "ficha de oficios", alquiler: "ficha de alquiler" };

const BASE = {
  negocio: num(process.env.PRECIO_NEGOCIO_1_MES ?? process.env.PRECIO_1_MES, 3000),
  oficio: num(process.env.PRECIO_OFICIO_1_MES, 1000),
  alquiler: num(process.env.PRECIO_ALQUILER_1_MES, 2000),
};
const DESCUENTO = { "1_mes": 0, "3_meses": 10, "6_meses": 20 }; // porcentaje
const MESES = { "1_mes": 1, "3_meses": 3, "6_meses": 6 };
const ETIQUETA = { "1_mes": "1 mes", "3_meses": "3 meses", "6_meses": "6 meses" };
const SUFIJO = { "1_mes": "1m", "3_meses": "3m", "6_meses": "6m" };

export const PLAN_IDS = Object.keys(MESES);

// Id del producto en Google Play Console (productos "de un solo pago", consumibles). Hay 9: 3 tipos x 3 plazos.
export const productoId = (tipo, plan) => `mizona_${tipo}_${SUFIJO[plan]}`;

export const PLANES = {};
for (const tipo of TIPOS) {
  PLANES[tipo] = {};
  for (const plan of PLAN_IDS) {
    const meses = MESES[plan];
    const sinDescuento = BASE[tipo] * meses;
    const precio = Math.round(sinDescuento * (100 - DESCUENTO[plan]) / 100);
    PLANES[tipo][plan] = {
      plan, meses, label: ETIQUETA[plan], productoId: productoId(tipo, plan),
      precio, precioPorMes: Math.round(precio / meses), precioSinDescuento: sinDescuento,
      ahorro: sinDescuento - precio, descuentoPorcentaje: DESCUENTO[plan],
    };
  }
}

// De un id de producto de Play a { tipo, plan, meses } (o null si no es uno nuestro)
const POR_PRODUCTO = new Map();
for (const tipo of TIPOS) for (const plan of PLAN_IDS) POR_PRODUCTO.set(productoId(tipo, plan), { tipo, plan, meses: MESES[plan] });
export const productoConocido = (id) => POR_PRODUCTO.get(String(id)) || null;

// Mes gratis: uno por cuenta y por tipo de ficha. Días por invitación: +5 para quien invita y +5 para quien se registra con su código; tope de 60 días ganados por invitar.
export const MES_GRATIS_MESES = 1;
export const DIAS_POR_INVITACION = num(process.env.INVITACION_DIAS, 5);
export const DIAS_INVITADO = num(process.env.INVITACION_DIAS_INVITADO, 5);
export const TOPE_DIAS_INVITANDO = num(process.env.INVITACION_TOPE_DIAS, 60);
export const HORAS_PARA_ACREDITAR = 72; // la invitación se acredita cuando la cuenta nueva lleva 3 días sin ser denunciada ni suspendida
