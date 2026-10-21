// Genera la clave de la verificación en dos pasos del panel de moderación. Se corre UNA sola vez, en tu computadora:
//   cd server && node scripts/generar-totp.mjs
// Después: 1) cargá la clave en la app autenticadora ("Ingresar clave de configuración") y 2) pegala en Render como MODERACION_TOTP_SECRET.
import { generarSecretoTotp, urlOtpauth } from "../utils/totp.js";

const secreto = generarSecretoTotp();
console.log("\nClave para la app autenticadora (MODERACION_TOTP_SECRET):\n\n  " + secreto + "\n");
console.log("Dirección otpauth (si tu app permite pegar un enlace):\n\n  " + urlOtpauth(secreto) + "\n");
console.log("No la compartas ni la guardes en el código. Si la perdés, generá una nueva y reemplazala en Render.\n");
