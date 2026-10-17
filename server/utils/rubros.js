// Rubros de oficios y servicios. La lista se puede ampliar sin tocar nada más: agregá una línea { id, label, grupo }.
// "id" es fijo (no lo cambies una vez usado: las fichas guardan el id); "label" es lo que se ve.
// Si cambiás esta lista, copiá lo mismo en src/rubros.js (la web usa su propia copia para no depender de la red al abrir el formulario).
// Además de esta lista, cada ficha puede sumar rubros propios con "Otro" (texto libre, revisado por el servidor).
export const GRUPOS_RUBROS = {
  construccion: "Construcción y reparaciones",
  tecnicos: "Técnicos e instalaciones",
  hogar: "Hogar y limpieza",
  mascotas: "Mascotas",
  vehiculos: "Vehículos",
  otros: "Otros servicios",
};

export const RUBROS = [
  { id: "albanil", label: "Albañil", grupo: "construccion" },
  { id: "plomero", label: "Plomero", grupo: "construccion" },
  { id: "electricista", label: "Electricista", grupo: "construccion" },
  { id: "gasista", label: "Gasista", grupo: "construccion" },
  { id: "pintor", label: "Pintor", grupo: "construccion" },
  { id: "carpintero", label: "Carpintero", grupo: "construccion" },
  { id: "herrero", label: "Herrero", grupo: "construccion" },
  { id: "soldador", label: "Soldador", grupo: "construccion" },
  { id: "techista", label: "Techista", grupo: "construccion" },
  { id: "ceramista", label: "Colocador de cerámicos", grupo: "construccion" },
  { id: "yesero", label: "Yesero / durlock", grupo: "construccion" },
  { id: "vidriero", label: "Vidriero", grupo: "construccion" },
  { id: "cerrajero", label: "Cerrajero", grupo: "construccion" },
  { id: "reparaciones", label: "Reparaciones generales", grupo: "construccion" },
  { id: "tecnico_electrodomesticos", label: "Técnico en electrodomésticos", grupo: "tecnicos" },
  { id: "tecnico_pc", label: "Técnico en computadoras y celulares", grupo: "tecnicos" },
  { id: "instalador_aire", label: "Instalador de aire acondicionado", grupo: "tecnicos" },
  { id: "instalador_camaras", label: "Instalador de cámaras y alarmas", grupo: "tecnicos" },
  { id: "instalador_redes", label: "Instalador de redes e internet", grupo: "tecnicos" },
  { id: "limpieza", label: "Limpieza", grupo: "hogar" },
  { id: "jardinero", label: "Jardinero", grupo: "hogar" },
  { id: "fletes", label: "Fletes y mudanzas", grupo: "hogar" },
  { id: "tapicero", label: "Tapicero", grupo: "hogar" },
  { id: "modista", label: "Costurera / modista", grupo: "hogar" },
  { id: "fumigador", label: "Fumigador", grupo: "hogar" },
  { id: "cuidador_mascotas", label: "Cuidador de mascotas", grupo: "mascotas" },
  { id: "paseador_perros", label: "Paseador de perros", grupo: "mascotas" },
  { id: "peluqueria_canina", label: "Peluquería canina", grupo: "mascotas" },
  { id: "adiestrador", label: "Adiestrador", grupo: "mascotas" },
  { id: "mecanico", label: "Mecánico", grupo: "vehiculos" },
  { id: "gomeria", label: "Gomero", grupo: "vehiculos" },
  { id: "chapista", label: "Chapista y pintor de autos", grupo: "vehiculos" },
  { id: "lavadero", label: "Lavado de autos", grupo: "vehiculos" },
  { id: "fotografo", label: "Fotógrafo", grupo: "otros" },
  { id: "profesor_particular", label: "Profesor particular", grupo: "otros" },
];

export const RUBRO_IDS = new Set(RUBROS.map((r) => r.id));
export const ETIQUETA_RUBRO = Object.fromEntries(RUBROS.map((r) => [r.id, r.label]));
