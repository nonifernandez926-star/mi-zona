import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Código QR generado DENTRO de la app (antes se pedía a un sitio externo, lo que le mandaba a un tercero el código de canje o el enlace).
// Si por algún motivo no se puede dibujar, muestra un cuadro vacío para que la pantalla no se rompa.
export function QrLocal({ texto, tam = 200, alt = "Código QR", className = "", style = {} }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let vivo = true;
    QRCode.toDataURL(String(texto || ""), { width: tam * 2, margin: 1, errorCorrectionLevel: "M" })
      .then((u) => { if (vivo) setSrc(u); })
      .catch(() => { if (vivo) setSrc(""); });
    return () => { vivo = false; };
  }, [texto, tam]);
  if (!src) return <div className={className} style={{ width: tam, height: tam, ...style }} role="img" aria-label={alt} />;
  return <img src={src} alt={alt} width={tam} height={tam} className={className} style={style} />;
}
