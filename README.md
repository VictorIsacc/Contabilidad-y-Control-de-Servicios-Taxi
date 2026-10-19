# Contabilidad y Control de Servicios Taxi — PWA 1.10.0

Aplicación para GitHub Pages, adaptada de la versión Android 1.10.0. URL de publicación estable:

https://victorisacc.github.io/Contabilidad-y-Control-de-Servicios-Taxi/

## Cambios funcionales

- Ganancias, efectivo del chófer y liquidación por jornada, mes o fechas. App y TPV los cobra el jefe, también en PideTaxi, Uber y Free Now. Abonados, Imbric y Join Up también son cobros del jefe.
- El saldo compara ganancia después de comisiones y seguro con efectivo cobrado; indica cuánto paga el jefe o cuánto entrega el chófer. No descuenta anticipos ni entregas previas.
- Porcentaje y seguro diario se pueden fijar para nuevas jornadas, sin cambiar las anteriores.
- Pantalla principal con total neto; la información del conductor se consulta en Parciales y en los informes correspondientes.
- PDF en color con logos, tarjetas, gráficos y tablas; JSON de jornada, periodo y copia completa. Las jornadas antiguas sin modalidad suficiente dejan la liquidación pendiente en vez de suponer efectivo.
- Mismos siete logos, icono del taxi blanco y temas claro/oscuro.

## Identidad de instalación corregida

El manifiesto anterior declaraba `id: ./index.html`. El navegador interpretaba ese identificador como `https://victorisacc.github.io/index.html`, que podía coincidir con otra aplicación del mismo dominio. El identificador del manifiesto se resuelve respecto al origen, no como una imagen relativa a la carpeta del manifiesto.

Se fija una identidad explícita, exclusiva y estable:

- `id`: `https://victorisacc.github.io/Contabilidad-y-Control-de-Servicios-Taxi/contabilidad-control-servicios-taxi`
- `start_url`: `https://victorisacc.github.io/Contabilidad-y-Control-de-Servicios-Taxi/index.html`
- `scope`: `https://victorisacc.github.io/Contabilidad-y-Control-de-Servicios-Taxi/`

No cambies estos valores en futuras actualizaciones ni muevas la publicación a otra URL. Se mantiene la URL de acceso y el almacenamiento `TaxiJornadaDB`, sin migrar ni borrar jornadas.

## Instalar y actualizar

1. Abre la dirección de publicación directamente en Chrome o Edge de Android, fuera del navegador integrado de otras aplicaciones y sin modo privado.
2. Visita **Instrucciones → Instalación y actualizaciones**.
3. Cuando el navegador ofrezca la instalación, pulsa **Instalar aplicación** para abrir su diálogo oficial. También puedes usar el menú del navegador.
4. Espera a que termine y abre Taxi desde el cajón de aplicaciones. Un acceso directo del navegador no equivale a una instalación WebAPK.

La app solo muestra una instalación confirmada por un evento del navegador o cuando está abierta en modo de aplicación. Nunca deduce que está instalada por no recibir el aviso ni guarda un indicador ficticio de instalación.

Chrome y Android deciden cuándo ofrecen y completan la instalación. Si la identidad antigua ya estaba asociada a otra PWA, la nueva identidad permite distinguir Taxi. No se desinstala, desregistra ni elimina automáticamente ninguna otra app. Antes de corregir una instalación antigua o borrar algo, exporta la copia JSON completa y comprueba el archivo. No hace falta desinstalar para actualizar la web.

Las nuevas versiones del trabajador sin conexión esperan a que pulses **Aplicar actualización**. Guarda antes cualquier formulario abierto. Después de aplicar, se recarga la interfaz conservando los datos guardados.

## Sin conexión y aislamiento

El archivo `sw.js` está en la carpeta de la aplicación y solo se registra con ese alcance. Precarga todos los recursos, incluidos los nuevos generadores PDF. Usa una caché propia por nombre de aplicación, ruta y versión. Solo limpia versiones anteriores de su mismo prefijo; nunca limpia las cachés de otras rutas o aplicaciones.

Se conservan las cachés antiguas de nombre ambiguo porque no se puede garantizar que no las use otra PWA. Los recursos de una versión se sirven juntos desde su propia caché, evitando mezclar archivos de diferentes versiones. Las descargas de PDF y JSON funcionan mediante archivos locales del navegador.

## Datos

Los datos siguen en IndexedDB `TaxiJornadaDB`, versión 1, y las preferencias en el almacenamiento local. El tema usa `taxi-theme`; los valores por defecto del conductor usan `taxi-driver-defaults-v1`. No se envían jornadas a GitHub ni a servidores.

El APK, los distintos navegadores y el modo privado pueden usar almacenes independientes. La copia completa JSON se exporta y carga desde Instrucciones → Datos y copias JSON, compatible con Android 1.10.0. Incluye todas las jornadas, servicios, cobros, comisiones, porcentajes y seguros por jornada, valores fijados para nuevas jornadas y tema. También permite cargar los JSON anteriores de una jornada o periodo. La transferencia se realiza mediante archivos; no hay sincronización automática. No borres datos del sitio ni desinstales sin copias comprobadas.

## Publicación

Los archivos de esta carpeta van en la raíz del repositorio que ya publica GitHub Pages. Actualízalos en un único commit. No subas el ZIP como sustituto de los archivos ni crees una carpeta de versión nueva dentro de la URL publicada.

El APK y su clave privada no forman parte de esta PWA ni deben subirse al repositorio. El generador PDF solo usa recursos incluidos y no necesita servicios remotos.

## Novedades 1.10.0

- Copia completa e importación JSON con vista previa por meses y restauración opcional de ajustes generales.
- Los registros idénticos no se duplican. Las jornadas distintas se conservan por defecto; solo se sustituyen al marcar la opción expresamente. El resto de jornadas se mantiene.
- La validación completa y una transacción impiden cargar medias copias. No se permiten dos jornadas abiertas. Si los datos cambian desde la vista previa, hay que seleccionar de nuevo el archivo.
- Los totales, comisiones, participación, seguro y liquidación mensual se recalculan con los registros originales. Los resúmenes incluidos en el JSON son informativos. Los cobros históricos sin modalidad siguen pendientes de clasificar.
- Listado de servicios enmarcado, filas alternas y botones ↑ ↓ para recorrerlo, en Parciales e Historial y en ambos temas.
- Botones de cobro con iconos: 💵 Efectivo, 💳 TPV y 📱 App.
- Archivos UTF-8 de hasta 20 MB, 10.000 jornadas y 100.000 servicios por carga. Un JSON mensual no incluye ajustes generales salvo que sea una copia completa. Las comisiones de plataforma siguen siendo Imbric 12 % y Join Up 10 %, con activación guardada por jornada.

## Ajustes 1.10.0

Etiqueta corta 💳 TPV en toda la aplicación y los PDF. Abonados, Imbric y Join Up se identifican con 🧾 y «cobro en central» al registrar, consultar parciales y cierres, y con un recibo vectorial en el PDF. No cambia el cálculo ni la modalidad guardada.

## Cobro de abonados por jornada · 1.10.0

Al iniciar una jornada, «Los abonados los cobra el chófer» afecta a Abonado, Imbric y Join Up. Desactivado por defecto: cobro en central. Activado: los importes brutos se suman al efectivo del chófer y dejan de sumarse a cobros del jefe/central. El reparto usa el mismo porcentaje del conductor para todos los servicios de la jornada. No se aplica un 50 % adicional. Comisiones, base de reparto y seguro se mantienen.

El ajuste queda en cada jornada (`centralCashByDriver`, esquema 4), no cambia las anteriores y se incluye en JSON de jornada, periodo y copia completa (formato 8). Las versiones anteriores no pueden interpretar este nuevo formato; actualiza tanto PWA como APK a 1.10.0 para intercambiarlo. Las copias antiguas sí se pueden cargar y conservan cobro en central.

«Descontar seguro diario» se puede desactivar para una jornada. Se conserva la cuantía fijada para próximas jornadas; el descuento aplicado es cero ese día. El campo `insuranceEnabled` se conserva en cada jornada y en los JSON. Las jornadas antiguas sin el campo aplican el seguro como hasta ahora. Los resúmenes mensuales solo suman los seguros efectivamente activados.

El resumen mensual y el PDF del periodo muestran el seguro total efectivamente descontado y el número de jornadas con descuento. También se exportan estos datos al JSON mensual.
