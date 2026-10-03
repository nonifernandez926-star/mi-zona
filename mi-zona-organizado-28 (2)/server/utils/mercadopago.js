import crypto from "crypto";

// Import diferido: si todavía no hay MP_ACCESS_TOKEN, ni siquiera hace falta cargar el SDK.
export async function cargarMercadoPago() {
  const mod = await import("mercadopago");
  const mp = mod.default || mod;
  const client = new mp.MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  return { client, Preference: mp.Preference, Payment: mp.Payment };
}

// Verifica que el webhook venga realmente de Mercado Pago (firma HMAC-SHA256 con la "clave secreta" del webhook).
export function webhookEsValido({ xSignature, xRequestId, dataId, secret }) {
  if (!secret) return true; // sin clave configurada no se puede validar (se avisa en consola)
  if (!xSignature || !dataId) return false;
  const partes = {};
  xSignature.split(",").forEach((p) => {
    const [k, v] = p.split("=").map((s) => s && s.trim());
    if (k && v) partes[k] = v;
  });
  const { ts, v1 } = partes;
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${xRequestId || ""};ts:${ts};`;
  const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  if (v1.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(v1));
}
