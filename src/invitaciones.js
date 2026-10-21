import { useEffect, useState } from "react";
import { suscripcionApi } from "./api.js";

// Código de invitación de la persona (para sumarlo al mensaje de compartir). Si no se puede cargar, se comparte sin código.
export function useCodigoInvitacion(activo = true) {
  const [codigo, setCodigo] = useState("");
  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;
    suscripcionApi.estado().then((e) => { if (vivo) setCodigo(e?.invitaciones?.codigo || ""); }).catch(() => {});
    return () => { vivo = false; };
  }, [activo]);
  return codigo;
}
