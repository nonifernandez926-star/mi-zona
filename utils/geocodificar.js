import Business from "../models/Business.js";

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Busca coordenadas (OpenStreetMap / Nominatim) para los negocios que tienen dirección pero todavía no están en el mapa.
// Nominatim pide máximo 1 consulta por segundo y un User-Agent que identifique la app, por eso va de a uno y con pausa.
export async function geocodificarPendientes(maximo = 15) {
  const pendientes = await Business.find({
    loc: { $exists: true, $nin: ["", null] },
    $or: [{ lat: { $exists: false } }, { lat: null }, { lng: null }],
    geoIntentos: { $not: { $gte: 3 } },
  }).limit(maximo);

  let ubicados = 0;
  for (const b of pendientes) {
    const consultas = [`${b.loc}, ${b.zone || ""}, Tucumán, Argentina`, `${b.loc}, Tucumán, Argentina`];
    let punto = null;
    for (const q of consultas) {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(q)}`, {
          headers: { "User-Agent": "MiZona/1.0 (directorio de negocios locales)", "Accept-Language": "es" },
        });
        if (r.ok) {
          const data = await r.json();
          if (data?.[0]) { punto = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }; break; }
        }
      } catch { /* probamos con el otro formato */ }
      await espera(1200);
    }
    if (punto) {
      await Business.updateOne({ _id: b._id }, { $set: punto });
      ubicados++;
    } else {
      await Business.updateOne({ _id: b._id }, { $inc: { geoIntentos: 1 } }); // después de 3 intentos dejamos de insistir
    }
    await espera(1200);
  }
  return { revisados: pendientes.length, ubicados };
}
