# Seguridad de los datos (Play Console → Contenido de la app → Seguridad de los datos)

Armado a partir de lo que el código hace hoy. **Verificalo vos**: Google compara tus respuestas con la app y con tu política de privacidad.

## Preguntas generales
- ¿Recopila o comparte datos del usuario? **Sí**
- ¿Los datos se cifran en tránsito? **Sí** (todo va por HTTPS)
- ¿Los usuarios pueden pedir que se eliminen? **Sí** → Eliminar cuenta en la app (Ajustes → Privacidad) y enlace web: `https://TU-DOMINIO/eliminar-cuenta.html`
- Política de privacidad: `https://TU-DOMINIO/privacidad.html`

## Datos que se recopilan
| Tipo | Dato | Para qué | ¿Se comparte con terceros? | ¿Opcional? |
|---|---|---|---|---|
| Información personal | Nombre, correo, ID de usuario | Funciones de la app, cuenta | Google (inicio de sesión) | No |
| Ubicación | Aproximada y precisa | Funciones de la app (cercanía, clima) | Open-Meteo recibe ubicación aproximada | Sí |
| Fotos y videos | Fotos de negocio; fotos de agenda (se analizan y se descartan) | Funciones de la app | Cloudinary (fotos de negocio), proveedor de IA (agenda) | Sí |
| Mensajes | Chats con el asistente de un negocio y reseñas | Funciones de la app | Mi Asistente | Sí |
| Actividad en la app | Visitas, guardados y contactos a un negocio; búsquedas con el asistente | Funciones y estadísticas del negocio | Proveedor de IA (búsquedas) | No |
| Identificadores | ID de cliente del dispositivo y suscripción a notificaciones | Notificaciones y seguridad | No | Sí |
| Información financiera | Historial de compras (ID de pago de la suscripción) | Cobro de suscripción | Mercado Pago | Sí (solo dueños) |

La tarjeta y los datos de pago los maneja Mercado Pago: la app **no** los recibe.

## Otras declaraciones
- Anuncios: **No** tiene.
- Acceso a la app (login obligatorio): cargá en "Acceso a la aplicación" un usuario y contraseña de prueba **para los revisores**, con un negocio de ejemplo. Sin esto, Google no puede entrar y rechaza la app.
- Contenido generado por usuarios: tiene reseñas con opción de reportar (cumple). Revisá también el punto de IA en el informe.
- Público objetivo: 18+ (hay negocios, cobros y chat con IA).
