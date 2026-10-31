# Mi Zona — Informe de revisión final para Google Play (21 de octubre de 2026 · Fase 11)

Reemplaza al informe del 9 de octubre (quedó viejo: hablaba de Mercado Pago y de funciones que hoy cambiaron).

## Cómo leer esto
✅ Hecho y verificado · ⚠️ Trámite o decisión tuya (bloquea publicar) · 📌 Recomendado, no hecho.
**Qué verifiqué y qué no:** corrí 33 pruebas sin internet ni base de datos (`npm run probar:todo` en `server/`) y revisé la sintaxis y los nombres de todo el código nuevo de la web. **No pude** instalar paquetes, compilar con Vite, generar el `.aab`, ni probar con MongoDB, Anthropic o Google Play: hay que correr `npm install && npm run build` y probar en celulares (lista en `play-store/LISTA-DE-VERIFICACION.md`, sección C).

## 1. Requisitos de Google Play (verificados el 21/10/2026 en la documentación oficial)
| Requisito | Estado |
|---|---|
| Apuntar a Android 16 (API 36) en apps nuevas y actualizaciones (desde el 31/08/2026) | ⚠️ Se cumple al empaquetar con la última versión de Bubblewrap/PWABuilder; Play Console avisa si no |
| Play Billing Library 8 o superior (desde el 31/08/2026) | ⚠️ Idem: Bubblewrap trae la biblioteca; usar la versión más nueva |
| Pagos digitales con Google Play Billing (TWA: Digital Goods API, Chrome 101+) | ✅ Resuelto en la Fase 9. ⚠️ Falta la configuración en Play Console y el `assetlinks.json` |
| Cuenta personal nueva: prueba cerrada con 12 testers × 14 días | ⚠️ Aplica si la cuenta es personal y posterior al 13/11/2023 |
| Verificación de desarrollador (nueva en 2026; Argentina entra más adelante) | ⚠️ Revisar el estado de la app en Play Console → Inicio |
| Política de privacidad pública y completa | ✅ Reescrita a lo que la app hace hoy. ⚠️ Cargar `VITE_SOPORTE_EMAIL` y `LEGAL_TITULAR` |
| Eliminar cuenta: dentro de la app y con enlace web | ✅ Ambos. La página web ahora dice qué se borra y qué se conserva |
| Contenido de usuarios: términos, denunciar, bloquear, moderación | ✅ Cumple (Fases 7 y 8). Los términos ahora definen el contenido prohibido |
| IA generativa: reportar respuestas sin salir de la app | ✅ **Nuevo:** «Reportar respuesta» en el buscador con IA y en los dos chats de asistente |
| Seguridad de los datos | ✅ Reescrita (`SEGURIDAD-DE-LOS-DATOS.md`). ⚠️ La completás y verificás vos |
| Acceso para revisores | ⚠️ Crear usuario y contraseña de prueba con datos de ejemplo |
| Ficha: ícono, gráfico, textos, capturas | ✅ Textos y gráficos. ⚠️ Capturas: las sacás vos |
| Incentivos: prohibido premiar calificaciones o reseñas | ✅ Los días son por invitar, no por calificar; la ficha lo aclara |

## 2. Errores encontrados y corregidos en esta fase
1. **El clima enviaba tu ubicación con precisión de ~100 m** (3 decimales) a Open-Meteo, aunque la política decía «aproximada». Ahora se redondea a ~5 km antes de enviarla (`src/clima.jsx`).
2. **La política de privacidad y los términos estaban desactualizados:** no decían nada de invitaciones, historial de compras, errores técnicos, menores de edad, plazos de conservación ni qué se conserva al eliminar la cuenta, y los términos no definían el contenido prohibido (Google lo exige) ni hablaban de oficios, alquileres, Comunidad ni IA. Todo agregado.
3. **La página «Eliminar cuenta» no listaba lo que se borra de las Fases 3 a 9** y mandaba a «Soporte de la aplicación» a quien no podía entrar a la app. Reescrita, con la opción por correo.
4. **No había forma de reportar una respuesta de la IA** (requisito de Google). Agregado, y llega a Soporte con el motivo «Respuesta de la IA».
5. **No había registro de errores de la web.** Una TWA corre la web dentro de Chrome, así que Crashlytics no ve sus errores. Ahora la app avisa los errores a `/api/errores` (sin datos de personas, agrupados, se borran a los 30 días) y el equipo los mira en `/api/errores/admin`.
6. **El armado de la web publicaba una app rota si faltaba `VITE_API_URL`** (llamaba a localhost). Ahora se frena con un aviso claro.
7. **Una bandera sobrante de Mercado Pago** en el diagnóstico del servidor se cambió por la de Play Billing.
8. **La plantilla de la TWA no activaba Play Billing** (la guía lo pedía pero la plantilla no lo tenía): corregida, con ubicación delegada.
9. **Una cuenta suspendida no podía abrir sus favoritos de oficios y alquileres** (un pedido de solo lectura que estaba bloqueado por error) y recibía el cartel de suspensión. Ahora puede.
10. **La ficha de la tienda y la guía describían solo negocios**: reescritas con oficios, alquileres, buscador con IA y aclaraciones.

## 3. Lo que sigue pendiente
- ✅ **Eliminar la cuenta** ya llama a `/integracion/borrar-cliente` de Mi Asistente y borra las fotos de Cloudinary (Fase 12; si algo no responde, queda pendiente y se reintenta solo). ⚠️ Falta probarlo de punta a punta con los dos servidores encendidos y las claves de Cloudinary cargadas. Este punto estaba desactualizado en versiones anteriores del informe.
- ⚠️ **Comunidad está apagada por defecto** (`COMUNIDAD_HABILITADA=false`). Decidí si sale encendida: cambia la ficha y la declaración de datos (ver la lista, sección D).
- 📌 **Mapas:** OpenStreetMap limita el uso intensivo de sus teselas y Esri tiene condiciones propias; si el uso crece conviene un proveedor con contrato.
- 📌 **Modo oscuro** con un filtro CSS (pesado en celulares modestos) y **`App.jsx` de más de 5.700 líneas**: dividirlo baja el riesgo de errores. No lo toqué a ciegas.
- 📌 **Dos chats con la IA siguen enviando más que el texto de la búsqueda:** la «búsqueda con asistente» de Inicio manda a la IA la lista de negocios, distancias y, si la persona lo permite, un resumen de chats. Está declarado en la política y se puede apagar en Ajustes → Privacidad; falta decidir si se alinea con la regla de la Fase 10.
- 📌 No hay monitoreo de caídas del servidor ni copias de seguridad programadas de MongoDB (configurarlas en tu proveedor).
- 📌 Fuentes de Google Fonts: autoalojarlas mejora velocidad, privacidad y el modo sin conexión.

## 4. Antes de publicar (en orden)
1. `npm install` (web y `server/`), `npm run build`, `npm run probar:todo` (en `server/`), probar en celulares.
2. Resolver cuenta y pagos (guía, punto 0). Cargar las variables de `.env.example` (web y servidor).
3. Revisión legal de `src/legal.js`.
4. Empaquetar, `assetlinks.json`, prueba interna → cerrada → producción (`play-store/GUIA-PLAY-STORE.md`).


---

## Sorteos y la política de Google Play (Fase 13 · revisado el 25/10/2026)

**Lo que dicen las políticas hoy (páginas oficiales de Google Play):**
- *Juegos de azar con dinero real, juegos y concursos* (`support.google.com/googleplay/android-developer/answer/9877032`): en general Google Play prohíbe que las apps faciliten apuestas y juegos con dinero real; hace una excepción para las que tienen licencia y están aprobadas por Google, y exige un trámite de aprobación. Entre los ejemplos no permitidos figuran los juegos que aceptan dinero a cambio de la oportunidad de ganar un premio físico o en dinero, y las apps con botones o menús que invitan a apostar o participar con dinero real. También dice que el contenido de la app no debe promover ni dirigir a las personas a juegos de azar, loterías o torneos con dinero real (esa frase está en la parte de anuncios, pero marca el criterio).
- *Contenido generado por usuarios* (`.../answer/9876937`): hay que pedir que se acepten los términos antes de publicar, moderar de forma razonable según el tipo de contenido, y ofrecer dentro de la app funciones para denunciar contenido y personas y para bloquear usuarios.

**Cómo queda esta versión simple:**
- ✅ La app **no vende números, no cobra, no reserva, no procesa pagos y no tiene botones de «apostar» o «participar con dinero»**. No hay premios en dinero y la ficha no puede llevar precios ni cuentas (lo controla el servidor).
- ✅ **Contenido de usuarios:** términos aceptados al registrarse, denunciar y bloquear dentro de la app, panel de moderación del equipo, ocultar contenido, suspender cuentas y apelar (Fases 7 y 8). La ficha de sorteo usa todo eso. Los términos ahora aclaran que Mi Zona no organiza ni cobra sorteos.
- ⚠️ **Duda que queda:** la ficha anuncia una rifa y un botón lleva a la persona a hablar con el organizador para participar, y esa participación se paga **fuera** de la app. Google podría interpretar que la app «dirige» a las personas a una rifa con dinero real, aunque Mi Zona no toque el dinero. **Yo no puedo asegurar cómo lo va a interpretar el equipo de revisión**, y no encontré en la documentación un texto que diga que un anuncio informativo de una rifa entre vecinos esté permitido o prohibido. Tampoco puedo decir si una rifa con entrada paga sin licencia cae en la definición de «juego de azar» en cada país.
- ⚠️ **Declaraciones en Play Console:** respondé con exactitud el cuestionario de clasificación de contenido (contenido generado por usuarios) y la declaración de juegos de azar: la app **no** ofrece apuestas con dinero real. Si dudás, consultalo con el soporte de Google Play antes de publicar.
- 📌 **Opción de cero riesgo:** dejar el tipo «Sorteo o rifa» apagado en la versión de Play Store (instrucciones en `SORTEOS-ARGENTINA.md`) y habilitarlo después de ver cómo responde la revisión, o permitir solo sorteos sin cobro (por ejemplo, en redes).
- 📌 **Reglas por provincia:** las rifas con venta de números suelen requerir autorización provincial. Mi Zona no verifica nada; quien organiza es el responsable. Conviene que un abogado revise la redacción de los términos.


---

## Revisión de la Fase 14 (25/10/2026): pendientes ordenados por importancia

1. **Probar de verdad** (`npm install && npm run build` y un celular): sobre todo el botón fijo de abajo en oficios, alquileres y Comunidad, y el formulario de negocios a 360 px.
2. **Rediseño pendiente, sin tocar a propósito:** detalle de negocio (`BusinessDetail`), Herramientas (`HerramientasScreen`), Ajustes (`AjustesScreen`) y chats. No pude ver cómo quedan los estilos de Tailwind sin compilar, y rediseñarlas a ciegas podía romper lo que hoy funciona. Conviene hacerlo con la web compilada y una pantalla por vez.
3. **Listas largas sin paginar** (negocios, chats, notificaciones): hoy cargan todo. Es un cambio de comportamiento, por eso no se hizo.
4. **Dividir `App.jsx`** (casi 6.000 líneas): baja el riesgo de errores a futuro.
5. **Modo oscuro** con un filtro CSS pesado en celulares modestos.
6. **Fuente Manrope:** cargarla desde la propia app en vez de Google Fonts (más rápido y más privado).
7. **Datos duplicados entre web y servidor** (categorías, rubros, planes): hoy coinciden; conviene una prueba que avise si dejan de coincidir.

---

## Fase 17 (26/10/2026): reclamos, devoluciones y cambios

**Lo que se agregó.** Mi Asistente ya tenía listo su lado (ver `INTEGRACION-RECLAMOS.md` de ese proyecto), pero Mi Zona no enviaba nada ni mostraba la respuesta del dueño. Ahora sí:
- **Pantalla «Mis reclamos»** (`src/reclamos.jsx`) y formulario (tipo, motivo, producto, descripción y hasta 4 fotos). Se abre desde **Mis pedidos** (botón «¿Hubo un problema? Hacer un reclamo» en cada pedido ya confirmado, y acceso «Mis reclamos y devoluciones»).
- **Servidor:** `routes/reclamos.js` (crear y listar), `utils/reclamos.js`, `models/Reclamo.js`. El reclamo se envía a Mi Asistente con la clave compartida; si Mi Asistente está dormido o caído, se guarda y se reenvía solo cuando la persona abre «Mis reclamos» (hasta 10 intentos).
- **Respuesta del dueño:** llega por aviso inmediato (`POST /api/integracion/reclamo-decidido`, lo llama Mi Asistente con `MIZONA_WEBHOOK_URL`) y, si ese aviso falla, la app la consulta sola al abrir la pantalla. La persona recibe una notificación (se apaga junto con «Pedidos» en Ajustes → Notificaciones).
- **Reglas:** el negocio ve solo el usuario público, el texto y las fotos (nunca correo ni teléfono); las fotos deben estar en Cloudinary; máximo 5 reclamos por hora y 10 sin respuesta; no se puede repetir el mismo reclamo de un pedido mientras esté abierto; en comida/bebida solo corresponde devolución del dinero (lo decide la categoría del negocio); una cuenta suspendida puede leer sus reclamos pero no crear nuevos.
- **Privacidad:** los reclamos entran en la descarga de datos, se borran (con sus fotos) al eliminar la cuenta, y la política y la declaración de datos de Play los mencionan. La política dice que se le pide a Mi Asistente que quite la identidad de la persona: **Mi Asistente todavía tiene que hacerlo** (ver `PEDIDO-PARA-MI-ASISTENTE.md`, punto 3) antes de publicar.

**No pude verificar:** en este entorno no hay internet, así que no corrí `npm install`, `npm run build` ni las pruebas. Los archivos del servidor pasan `node --check` (sintaxis) y revisé a mano que las llaves de los archivos de la web estén balanceadas, pero **nada se compiló ni se probó con datos reales**. Probalo en un celular antes de publicar.

**Sigue pendiente (no lo toqué a propósito):** rediseño de detalle de negocio, Herramientas, Ajustes y chats (hay que verlo compilado); paginar listas largas; dividir `App.jsx`; alojar la fuente Manrope en la propia app; la prueba que compara datos duplicados entre web y servidor.

---

## Fase 18 (28/10/2026): arreglos de pantalla y diseño como Mi Asistente

- **«Otros» abre una subpantalla.** En Alquileres, al tocar una categoría (Viviendas, Eventos, Herramientas, Otros) se abre una hoja con todos sus tipos, y el tipo elegido queda como una píldora que se quita con la «x». Ya no aparecen píldoras debajo de los filtros. En Negocios se sumó el botón «Otros», que abre una hoja con el resto de los rubros.
- **Selector «Destacados»:** ahora abre una lista chica debajo del botón, con una opción por renglón; al elegir una se cierra, y tocar afuera también la cierra.
- **Comunidad dentro de Chats:** se quitó de la barra de abajo y de la portada del inicio. En Chats hay una tarjeta «Comunidad» arriba de todo. La barra queda con dos pestañas a cada lado del «+» (Inicio, Chats, Negocio o Herramientas, Ajustes). Comunidad ya era solo de fichas (sin escribir ni comentar) y cada persona ve las de su departamento, así que eso no cambió.
- **Botón «+» de Chats:** el error era que la animación de entrada de cada pantalla usaba `translate`, y eso hace que los botones fijos de adentro se coloquen según la pantalla y no según el celular: aparecían arriba y saltaban. Ahora la entrada es solo un fundido (`index.css`, final del archivo). También corrige el «+» de Comunidad.
- **Línea en blanco al abrir la app:** el fondo detrás de la pantalla azul de bienvenida ahora es del mismo azul.
- **Pantalla Negocio ordenada:** baldosas del mismo tamaño y más aire; un solo acceso para compartir (se quitó el cartel grande «Todavía no compartiste Mi Zona»: ahora es una baldosa con un punto rojo mientras esté pendiente); «Código QR» y «Compartir» se unieron en «Compartir mi negocio»; «Mi Asistente» es una fila ancha propia; «Eliminar negocio» quedó aparte y discreto.
- **Diseño como Mi Asistente:** tipo de letra del sistema (Roboto en Android; ya no se baja Manrope de internet, ni en las páginas legales), fondo y tinta de Mi Asistente, barra de abajo flotante con la pestaña activa en una píldora celeste, cabeceras con esquinas redondeadas, botones con degradado azul y esquinas de 16.
- **Pendiente / no verificado:** no se pudo compilar ni probar (sin internet); revisé a mano que las llaves de los archivos estén balanceadas. Probalo en el celular, sobre todo la barra de abajo, la lista del selector y la subpantalla de «Otros». Otras pantallas (detalle de negocio, Ajustes, chats) conservan su estilo anterior salvo lo anterior.

