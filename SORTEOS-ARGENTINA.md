# Sorteos y rifas en Mi Zona

> Resumen orientativo, **no es asesoramiento legal**. Las reglas cambian por provincia: confirmá siempre con la lotería o el ente de juegos de azar de tu provincia (en Tucumán, la Caja Popular de Ahorros; dato a verificar).

## Qué es un sorteo en Mi Zona (desde la Fase 13)
Una **publicación informativa dentro de Comunidad**, como un aviso, un regalo o un evento. Una persona anuncia su sorteo o rifa (a beneficio o por cualquier otro motivo) y quien se interese le escribe por WhatsApp. Nada más.

**La ficha lleva:** título, descripción, quién organiza, motivo (a beneficio u otro), premios (hasta 6), cantidad de números (opcional, solo como dato), fecha (hora opcional), cómo se define (Quiniela, Lotería, en vivo, por redes u otra forma), lugar (opcional), una foto (opcional), localidad y el botón «Escribirle por WhatsApp». El número de teléfono nunca viaja en los listados: se entrega recién al tocar el botón.

**Qué NO hay en la app:** grilla de números, reservas, marcar pagado, «ventas cerradas», precio por número, forma de pago, recaudado ni barra de progreso. Tampoco hay ningún pago, cobro ni transferencia dentro de Mi Zona: si el organizador cobra, lo habla por privado, fuera de la app.

## Reglas que aplica el servidor (`server/utils/comunidad.js`)
- **Sin premios en dinero:** se rechazan premios que mencionen dinero, efectivo, pesos, dólares, «$», «100 mil», billetes, etc.
- **Sin precios ni cobros en la ficha:** se rechazan «$», «precio», «valor del número», «cada número», «por número», CBU/CVU, alias, MercadoPago, transferencia, efectivo, y también números largos (teléfonos o cuentas) en el título y la descripción.
- **WhatsApp obligatorio:** sin botón de contacto no hay forma de participar, así que no se puede publicar.
- **Aviso fijo:** «Mi Zona no organiza ni cobra sorteos: solo muestra lo que publica cada persona. Pagá únicamente a quien conocés y no pagues por adelantado si algo no te cierra.» Se ve en el listado de sorteos, en la ficha y en el formulario.
- **Máximo 5 sorteos abiertos por persona**, y los límites generales de Comunidad (5 publicaciones por día, espera de 60 segundos entre una y otra).
- **Fecha:** hasta 120 días hacia adelante. La ficha se oculta sola **3 días después de la fecha**, y MongoDB la borra 90 días más tarde.
- **Resultado:** desde el día del sorteo, el organizador puede escribir los números ganadores (solo texto, hasta 300 letras, sin enlaces ni precios) y puede borrarlo. Mi Zona no sortea ni verifica nada.
- **Organizador:** puede editar, cancelar (la ficha queda como «Cancelado» y sin botón de contacto), reactivar y eliminar.
- **Moderación:** se denuncia como cualquier publicación de Comunidad (`HojaDenunciar` con tipo `publicacion`), se puede bloquear al organizador, el equipo puede ocultarla, y se borra al eliminar la cuenta.
- Comunidad sigue **apagada por defecto** (`COMUNIDAD_HABILITADA=true` y moderación configurada) y la ven solo las personas del mismo departamento, con cuenta y localidad.

## Cómo funcionan los sorteos más comunes en Argentina
- **Rifa numerada** (la más común): se venden números (del 00 al 99, del 000 al 999...). El ganador se define con las últimas cifras de la **Quiniela** o la **Lotería Nacional** de una fecha y turno (Previa, Primera, Matutina, Vespertina, Nocturna).
- **Sorteo en vivo / tómbola**: se sortea ante los participantes o en una transmisión.
- **Sorteo en redes**: gratuito, entre quienes siguen o comentan. Si es una promoción de un comercio, rige la ley de lealtad comercial (22.802) y suele pedir autorización.
- **Bono contribución / rifa solidaria**: a beneficio de un club, escuela o persona. También suele requerir autorización provincial.

## Marco legal (general)
- Rifas, bingos, tómbolas y bonos de contribución con venta de números están **regulados por cada provincia**; hacerlo sin autorización puede ser infracción. Algunas provincias exigen que los premios sean bienes y no dinero.
- Mi Zona **no verifica autorizaciones** y la ficha ya no pide declararlas (se sacó junto con la venta de números). Quien organiza es responsable de cumplir las reglas de su provincia.

## Google Play (revisado el 25/10/2026)
Ver `INFORME-REVISION.md`, sección «Sorteos y la política de Google Play», con lo que dicen las políticas de Google y las dudas que quedan. Resumen: la versión simple no vende, no cobra ni acepta apuestas dentro de la app, pero **sigue habiendo una duda razonable** porque la ficha lleva a las personas a una rifa que se paga por fuera. Si querés cero riesgo, dejá apagado el tipo «Sorteo» (ver abajo).

## Apagar los sorteos sin tocar el resto
En `server/utils/comunidad.js` quitá `sorteo` de `TIPOS` y en `src/comunidad.js` quitá su línea de `TIPOS`: el resto de Comunidad sigue igual y las publicaciones de sorteo existentes dejan de poder crearse.
