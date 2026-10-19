# Contabilidad y Control de Servicios Taxi — PWA v1.8.1

**Subtítulo dentro de la interfaz:** Jornada Taxi.

## Novedades v1.8.1

- Eliminar jornadas **cerradas** desde Historial o directamente desde la tabla del resumen Mensual.
- Confirmación previa con fecha de inicio, número de servicios y total contabilizado; advierte que es irreversible.
- Al confirmar, se elimina una única jornada de IndexedDB y los totales del resumen mensual se recalculan automáticamente (servicios, medias, comisiones, ganancias del chófer y seguros diarios).
- Las jornadas activas no se pueden eliminar desde el resumen mensual. Primero hay que cerrarlas.
- Para conservar una jornada antes de borrarla, utilizar **Historial > Ver > Exportar JSON**.
- Se mantiene la misma base de datos `TaxiJornadaDB`, sin migraciones ni borrado de datos al instalar esta actualización.

## Novedades v1.7

- Nuevo nombre de la app, de instalación, de la cabecera, de los JSON y de los PDF.
- Icono 3D del taxi blanco elegido por el usuario, en 192, 512 px y formato maskable.
- Mantiene el almacenamiento `TaxiJornadaDB` y la ruta web anterior. Para conservar las jornadas guardadas, **no cambies la URL o el origen donde publicas la PWA**.
- Sigue ofreciendo los cálculos e informes de v1.6.1 y los logos de las siete categorías.
- Tras actualizar los archivos, recarga la página y vuelve a abrir la PWA para que el navegador incorpore el nuevo icono. En algunos Android puede hacer falta quitar el acceso directo anterior y volver a instalar; exporta una copia JSON antes de hacerlo y evita borrar datos de la web.

# Historial de funcionalidades

Aplicación web instalable en español para registrar los importes de los servicios del taxi.

## Identidad y botones (v1.4)

- Nombre de instalación: **Control de Servicios**. Cabecera: **Control de Servicios**; subtítulo: **Jornada Taxi**.
- Botones cuadrados con logos sin títulos adicionales. Los nombres siguen accesibles para lectores de pantalla y aparecen al registrar servicios y en informes.
- **Ver parciales** en azul; **Historial** en turquesa.
- Icono de instalación propio, taxi dorado con marca de control.
- Almacenamiento de jornadas existente sin migración: misma base de datos IndexedDB. Actualización compatible con 1.3.

## Comisiones y criterio de totales (v1.3)

Al iniciar la jornada se muestra un interruptor para **descontar comisiones**. Si está activado, Imbric descuenta el **12 %** y Join Up el **10 %** automáticamente sobre el importe bruto introducido. El neto se presenta antes de guardar y se detallan bruto, descuento y neto en parciales, historial, JSON y PDF. **Con comisiones activadas, el total principal y los subtotales de plataforma, modalidad e historial se calculan sobre el neto**; sin comisiones, sobre el bruto. Si está desactivado, el comportamiento previo se mantiene. El ajuste queda guardado **por jornada**, y los informes anteriores conservan su propia configuración. Para evitar errores, los importes siempre se introducen como brutos. El descuento se redondea al céntimo por servicio; los totales suman esos descuentos redondeados.

## Mejoras de v1.3

- Cálculo neto coherente en el encabezado, parciales, resumen por plataforma, pagos, historial y cierre.
- JSON con total contabilizado y el criterio utilizado.
- PDF con total contabilizado destacado y detalle de comisiones.
- Corrección de la distribución de páginas del PDF para evitar que los totales se superpongan al listado.

## Funciones

- Iniciar y cerrar una jornada de trabajo, incluso si cruza la medianoche.
- Servicios: PideTaxi, Imbric, Join Up, Abonado sin, Uber, Free Now y Concertado.
- Cuadrícula visual de dos botones por fila, con botones casi cuadrados.
- Modalidad App/Efectivo/TPV en PideTaxi, Uber y Free Now; Efectivo/TPV en Concertado.
- Imbric, Join Up y Abonado sin se registran sin modalidad asociada.
- Subtotales por modalidad para los servicios con modalidad definida.
- Introducir importe en euros; fecha y hora local se registran automáticamente (en ISO con zona UTC internamente).
- Total acumulado, recuento y parciales ordenados cronológicamente.
- Corregir o eliminar anotaciones mientras la jornada siga abierta.
- Mantener la jornada en IndexedDB aunque cierres la PWA o cambies de aplicación.
- Consultar jornadas cerradas; exportar JSON individual y PDF con listado ordenado.
- Modo claro/oscuro (la preferencia se guarda localmente).
- Funcionamiento sin conexión con service worker tras una primera visita online.

## Instalar en GitHub Pages

1. Sube **todos** los archivos de esta carpeta a la raíz de un repositorio de GitHub, o a una carpeta publicada en Pages.
2. Ve a Settings > Pages, selecciona Deploy from a branch, `main` y `/ (root)`, y guarda.
3. Abre la URL `https://TU-USUARIO.github.io/TU-REPOSITORIO/` en Chrome Android.
4. Usa el menú de Chrome > **Instalar aplicación** o **Añadir a pantalla de inicio**.

También puede desplegarse en cualquier servidor HTTPS. Para probarla localmente usa, por ejemplo, `python -m http.server 8000` dentro de la carpeta y visita `http://localhost:8000` (un archivo abierto como `file://` no ofrece todas las funciones PWA).

## Datos y copias de seguridad

Los registros se almacenan únicamente en la **IndexedDB del navegador en el dispositivo**. No se suben a servidores ni a GitHub. Volver a abrir la aplicación instalada recupera la jornada activa. Limpiar los datos del sitio, usar navegación privada o desinstalar el navegador/PWA con borrado de datos **puede borrar los registros**. Descarga y guarda el JSON de cada jornada como copia de seguridad; el PDF es un informe legible.

**Importante:** Los JSON exportados son copias, pero esta versión aún no permite importarlos o restaurarlos. Tampoco sincroniza entre móviles o navegadores. No uses múltiples pestañas editando la misma jornada al mismo tiempo.

## Consideraciones de diseño

- El registro almacena el instante en que pulsas **Guardar servicio**, no el instante en que se efectuó realmente el trayecto si lo anotas con retraso.
- Las jornadas cerradas son de solo lectura. Se requiere confirmar el cierre.
- El PDF usa un generador autónomo simple y no necesita conexión; permite varias páginas.
- Preparada para empaquetar más adelante como APK mediante Capacitor, sujeto a las pruebas de almacenamiento y permisos de Android.
- La app no crea automáticamente archivos JSON en cada pulsación: mantiene los datos de cada jornada en IndexedDB y permite exportar un JSON por jornada a demanda, porque una web instalada no puede escribir archivos arbitrarios en segundo plano en Android.

## Próxima versión sugerida

Importación/restauración JSON, estadísticas mensuales, importación y revisión de método de cobro, desglose de propinas, identificación de taxi/conductor y ajustes de hora del servicio. Todo sujeto a cómo se use en la práctica.


## v1.5 · Resumen mensual

Botón **Mensual** (violeta) en la pantalla principal. Permite elegir un mes, consultar jornadas, número total de servicios, bruto, comisiones y total contabilizado, medias por servicio y jornada, y desglose por plataforma. **PDF del mes** exporta todas las jornadas y plataformas con importes, comisiones y resumen; funciona sin conexión.

Cada jornada se asigna al mes en que comenzó, incluso cuando termina después de medianoche. Incluye la jornada abierta en curso; los datos de esta cambiarán al registrar más servicios. Las medias dividen el total contabilizado entre el número de servicios o jornadas del periodo. Si no existen servicios, la media por servicio es cero. Se conservan las configuraciones de comisiones de cada jornada y la base IndexedDB de versiones anteriores (TaxiJornadaDB).


## Novedades v1.6: ganancias del conductor

Al comenzar cada jornada es posible activar «Ganancias del conductor», indicar el porcentaje personal (0–100%, hasta dos decimales) y el seguro diario (importe no negativo). Los parámetros se guardan dentro de cada jornada, y las jornadas antiguas permanecen sin este cálculo.

El cálculo utiliza el **total contabilizado**, descontando primero las comisiones Imbric/Join Up si estaban activadas. Participación = redondeo al céntimo de total contabilizado × porcentaje. Ganancia = participación − seguro diario (una única vez por jornada). Puede resultar negativa si el seguro supera la participación; es deliberado para reflejar la cantidad a cubrir. La pantalla de jornada, los parciales, el historial y el resumen mensual muestran las ganancias. Los PDF diarios y mensuales permiten Facturación, Ganancias del conductor e Informe completo. Los JSON incluyen la configuración y resultados. Las jornadas históricas sin configuración de conductor no se cuentan en el cálculo de ganancias del mes. El total de facturación del taxi permanece independiente del de ganancias.

**Importante:** Los resultados son orientativos según los importes introducidos, no una nómina ni una certificación de cotizaciones. Usa la misma URL de GitHub Pages para conservar el almacenamiento IndexedDB; realiza copias de seguridad JSON antes de actualizar o borrar datos del navegador.

## Nombre personalizado de PDF (v1.6.1)

Al exportar informes PDF diarios o mensuales, aparece una ventana con un nombre de archivo propuesto automáticamente según la fecha y hora de generación, el periodo y el tipo de informe. Se puede editar antes de descargar. Los caracteres no válidos para nombres de archivo se sustituyen y `.pdf` se añade automáticamente. No cambia los datos de las jornadas.

### Ajuste v1.8.4
La cuadrícula mantiene dos columnas y el último botón (Concertado) ocupa la casilla izquierda de la última fila, dejando la derecha libre.


Novedad v1.8.4: botón de Instrucciones con guía visual de uso básico y posibilidades de la app.


## Corrección de pantalla e instalación v1.8.4

La pantalla principal utiliza el alto útil del móvil y dos columnas en orientación vertical. Los botones de registro cambian su altura para que puedan verse sin desplazar el contenido en pantallas habituales. En dispositivos de menos de 590 px de alto se mantiene el desplazamiento como opción de seguridad para no hacer botones demasiado pequeños. Las ventanas de informes, historial e instrucciones siguen siendo desplazables.

El manifiesto mantiene la identidad de la PWA y el modo standalone. El service worker utiliza ahora una caché nueva y consulta la red primero cuando existe conexión para evitar que versiones antiguas queden bloqueadas. Para ver el resultado en Android, refresca la URL con Chrome y abre la aplicación instalada desde su icono. Si Android dice que ya está instalada, comprueba el cajón de aplicaciones antes de crear un acceso directo nuevo. No borres almacenamiento ni desinstales sin exportar una copia JSON de las jornadas. La instalación standalone requiere HTTPS (por ejemplo GitHub Pages) y Chrome compatible.

## Novedad 1.8.5
- Los botones de plataforma se ajustan a la proporción cuadrada de los logos en vez de dejar tarjetas rectangulares anchas.
- El séptimo botón permanece en la columna izquierda.
- Los accesos Parciales, Historial, Mensual e Instrucciones se distribuyen en dos filas de dos columnas.
- Se conserva la apariencia atenuada de las plataformas mientras la jornada está cerrada.
- Se renueva el identificador de la caché de la PWA; se conserva la identidad de instalación y la base de datos existente.
