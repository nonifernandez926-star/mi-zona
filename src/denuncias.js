// Fase 8 · motivos de denuncia y reglas de convivencia. Los motivos son una copia de server/utils/moderacion.js: si se agrega uno, se agrega en los dos.
export const MOTIVOS_DENUNCIA = [
  ["spam", "Spam o publicidad engañosa", "Publica lo mismo una y otra vez o promete algo que no es."],
  ["estafa", "Estafa o fraude", "Pide plata por adelantado o engaña para quedarse con algo."],
  ["suplantacion", "Se hace pasar por otra persona", "Usa el nombre, la foto o el negocio de alguien más."],
  ["acoso", "Acoso o amenazas", "Insulta, persigue o amenaza a alguien."],
  ["ofensivo", "Contenido ofensivo o sexual", "Fotos o textos violentos, discriminatorios o sexuales."],
  ["falso", "Información falsa", "Datos que no son ciertos o que pueden perjudicar a otros."],
  ["otro", "Otro motivo", "Contanos qué pasa con tus palabras."],
];

export const REGLAS_CONVIVENCIA = [
  ["Respeto ante todo", "Tratá bien a los demás. No se permiten insultos, acoso, amenazas ni discriminación."],
  ["Nada de estafas ni engaños", "No pidas plata por adelantado sin que la otra persona vea el lugar o el trabajo, y no te hagas pasar por otra persona o negocio."],
  ["Contenido apto", "No publiques contenido sexual, violento ni fotos de personas sin su permiso. En Seguridad no nombres ni acuses a nadie."],
  ["Información verdadera", "Publicá solo lo que es cierto y está al día. No inventes precios, certificaciones ni disponibilidad."],
  ["Sin spam", "No repitas la misma publicación ni publiques cosas que no tienen que ver con tu zona."],
  ["Cuidá tus datos y los de otros", "No compartas teléfonos, documentos ni domicilios de otras personas."],
  ["Qué pasa si no se cumple", "El equipo puede ocultar un contenido, enviar una advertencia o suspender una cuenta, siempre explicándote el motivo. Podés apelar dentro de los 30 días."],
];

export const NOMBRE_TIPO = { publicacion: "esta publicación", negocio: "este negocio", oficio: "esta ficha de oficios", alquiler: "esta ficha de alquiler", perfil: "este perfil" };
