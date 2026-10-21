// Compras con Google Play Billing desde la app de Play Store (una Trusted Web Activity).
// Se usan dos APIs del navegador: la Digital Goods API (para ver precios reales y consumir la compra) y la Payment Request API (para pagar).
// Fuera de la app de Play Store (la web común) NO hay forma de pagar: Google exige que todo cobro de bienes digitales pase por Play Billing.
const BILLING = "https://play.google.com/billing";

export async function servicioPlay() {
  try {
    if (typeof window === "undefined" || !("getDigitalGoodsService" in window)) return null;
    return await window.getDigitalGoodsService(BILLING);
  } catch { return null; }
}

export async function playDisponible() { return !!(await servicioPlay()); }

// Precios reales que cobra Google Play en el país de la persona. Devuelve { [productoId]: { texto } } (vacío si no se pudo)
export async function preciosDePlay(ids) {
  const s = await servicioPlay();
  if (!s) return {};
  try {
    const detalles = await s.getDetails(ids);
    const salida = {};
    for (const d of detalles || []) {
      const v = Number(d.price?.value);
      const texto = Number.isFinite(v) ? new Intl.NumberFormat("es-AR", { style: "currency", currency: d.price.currency || "ARS", maximumFractionDigits: 0 }).format(v) : "";
      if (texto) salida[d.itemId] = { texto };
    }
    return salida;
  } catch { return {}; }
}

// Abre la pantalla de pago de Google Play. Devuelve { token, terminar(ok) } o lanza un Error con un mensaje claro.
// Después de que el SERVIDOR confirme la compra con Google, hay que llamar a terminar(true) (consume la compra y cierra el pago).
export async function pagarConPlay(productoId) {
  const s = await servicioPlay();
  if (!s) throw new Error("Para comprar un plan abrí Mi Zona desde la app de Google Play.");
  const pedido = new PaymentRequest(
    [{ supportedMethods: BILLING, data: { sku: productoId } }],
    { total: { label: "Total", amount: { currency: "ARS", value: "0" } } },
  );
  let respuesta;
  try { respuesta = await pedido.show(); }
  catch (e) {
    if (e?.name === "AbortError" || e?.name === "NotAllowedError") { const c = new Error("Cancelaste la compra. No se cobró nada."); c.cancelada = true; throw c; }
    throw new Error("No se pudo abrir Google Play. Probá de nuevo en un momento.");
  }
  const token = respuesta.details?.purchaseToken || respuesta.details?.token;
  if (!token) { try { await respuesta.complete("fail"); } catch { /* nada */ } throw new Error("Google Play no devolvió el comprobante. No se cobró nada."); }
  return {
    token,
    terminar: async (ok) => {
      try { if (ok) await s.consume(token); } catch { /* si no se pudo consumir, la próxima compra del mismo plan lo va a avisar */ }
      try { await respuesta.complete(ok ? "success" : "fail"); } catch { /* nada */ }
    },
  };
}
