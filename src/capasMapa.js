// Capas del mapa de Mi Zona, compartidas por el mapa principal y por el selector de ubicación del negocio.
// Capas del mapa, todas gratuitas y sin clave. Solo se dibujan los negocios registrados en Mi Zona (marcadores propios).
//  · Mapa: calles claras al estilo Google Maps  · Relieve: sombreado de cerros, vegetación, ríos  · Satélite: fotos aéreas + nombres de calles
export const CAPAS_MAPA = {
  mapa: {
    label: "Mapa", muestra: "linear-gradient(135deg,#EAF1E4 0%,#F6F1E6 45%,#CFE3F5 100%)",
    atribucion: "© OpenStreetMap",
    capas: [{ url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", opciones: { maxZoom: 19 } }],
  },
  relieve: {
    label: "Relieve", muestra: "linear-gradient(135deg,#BFD8A2 0%,#E4D9B0 45%,#9CBFA0 100%)",
    atribucion: "Tiles © Esri — Esri, USGS, NOAA, HERE, Garmin, OpenStreetMap contributors",
    capas: [{ url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", opciones: { maxZoom: 19, maxNativeZoom: 17 } }],
  },
  satelite: {
    label: "Satélite", muestra: "linear-gradient(135deg,#27402B 0%,#5D5A3A 45%,#2F4A5E 100%)",
    atribucion: "Imágenes © Esri, Maxar, Earthstar Geographics · Nombres © Esri",
    capas: [
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", opciones: { maxZoom: 19, maxNativeZoom: 18 } },
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", opciones: { maxZoom: 19, maxNativeZoom: 17, opacity: 0.9 } },
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", opciones: { maxZoom: 19, maxNativeZoom: 17 } },
    ],
  },
};
