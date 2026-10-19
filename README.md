# Contabilidad y Control de Servicios Taxi · PWA 1.11.0

Publicación estable: https://victorisacc.github.io/Contabilidad-y-Control-de-Servicios-Taxi/

## Modos de uso

Al iniciar una jornada se elige **Titular / uso propio** o **Chófer**. «Recordar como modo habitual» guarda la preferencia. Desmárcalo para cambiar solo la jornada actual. Cambiar de modo no modifica las anteriores.

Titular conserva la facturación íntegra después de las comisiones activadas. No muestra ni aplica reparto, seguro del conductor o liquidación con el jefe. Se distinguen efectivo, App, TPV y cobro en central. Los PDF del titular omiten los apartados del conductor.

Chófer conserva el porcentaje fijado, el seguro diario opcional y la liquidación. El mismo porcentaje se aplica a todos los servicios de cada jornada. Las ganancias, el efectivo y la diferencia a entregar o recibir se consultan en Parciales y cierres.

En las nuevas jornadas, **Abonado, Imbric y Join Up siempre son cobro en central**. Se ha retirado la opción anterior de cobrarlos en efectivo. Los registros antiguos se conservan tal como se guardaron; no se recalculan cambiando sus modalidades históricas.

## Resúmenes y recuentos

El resumen de cada jornada muestra el número de servicios y el importe de efectivo, TPV, App y abonados/central. Los cuatro grupos no se duplican. Si un registro antiguo no tiene modalidad, se informa como sin clasificar. El mes muestra el desglose por jornada; los PDF incluyen los recuentos de cada día.

Los filtros de Historial y Mes permiten ver Titular, Chófer o Todas. Por defecto se utiliza el modo activo o habitual. En «Todas», la facturación del titular y la ganancia del conductor se presentan por separado. El seguro mensual solo suma las jornadas de conductor donde se descontó.

Las comisiones conservan Imbric 12 % y Join Up 10 % cuando se activan al iniciar la jornada. App y TPV se distinguen del efectivo; el cobro en central se muestra separado. Se conservan los siete logos, el taxi blanco y ambos temas.

## Copias e intercambio

Instrucciones → Datos y copias JSON permite exportar y cargar copias completas: jornadas, servicios, cobros, comisiones, modo de cada jornada, porcentaje y seguro, ajustes fijados, tema y modo habitual. También se pueden cargar JSON anteriores de jornada o periodo.

Formato JSON 9, esquema de jornada 5. Actualiza tanto PWA como APK a **1.11.0** para intercambiar las nuevas copias. Se preservan los registros históricos con modalidad anterior al nuevo esquema. Las jornadas idénticas no se duplican y las diferentes solo se sustituyen con elección expresa. La importación se valida completa y se escribe en una transacción; también se restauran los ajustes si falla la escritura.

Límites: UTF-8, 20 MB, 10.000 jornadas y 100.000 servicios por archivo. Las copias se transfieren manualmente, sin sincronización automática. Antes de sustituir datos, exporta una copia de los actuales.

## Instalación y actualización

En Chrome o Edge de Android, abre la publicación HTTPS y utiliza la instalación oficial del navegador o Instrucciones → Instalación y actualizaciones. Para actualizar, busca y aplica la actualización sin desinstalar ni borrar datos.

La identidad se mantiene estable:

- id: https://victorisacc.github.io/Contabilidad-y-Control-de-Servicios-Taxi/contabilidad-control-servicios-taxi
- start_url: https://victorisacc.github.io/Contabilidad-y-Control-de-Servicios-Taxi/index.html
- scope: https://victorisacc.github.io/Contabilidad-y-Control-de-Servicios-Taxi/

No uses identificadores genéricos ni cambies la ruta. El trabajador sin conexión se limita a esta carpeta. Las cachés tienen prefijo propio por aplicación y ruta; solo se borran sus versiones anteriores. IndexedDB sigue siendo TaxiJornadaDB, versión 1, almacén sessions. Preferencias locales: taxi-theme, taxi-driver-defaults-v1 y taxi-usage-mode-v1.

Los recursos, PDF y JSON funcionan sin conexión después de la primera carga completa. No se envían jornadas a GitHub. Para publicar el ZIP, extrae los archivos en la raíz del mismo repositorio, sin una carpeta de versión adicional. No subas la APK ni la clave privada al repositorio de la PWA.
