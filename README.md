# Taxi 1.12.0

## Actualización

Instala **ControlServiciosTaxi-1.12.0-Android.apk** sobre la aplicación anterior, sin desinstalar. Se conservan el paquete es.controlservicios.taxi, la firma y el origen del almacenamiento. Antes de actualizar, exporta una copia JSON completa.

La PWA se publica en https://victorisacc.github.io/Contabilidad-y-Control-de-Servicios-Taxi/

En Instrucciones → Instalación y actualizaciones, busca y aplica la actualización. Comprueba que muestra 1.12.0. No es necesario desinstalar.

## Uber: total neto y cobro bruto

En **nuevas jornadas de 1.12.0**, los servicios Uber de Efectivo y TPV se introducen en bruto y descuentan automáticamente el **12 %**, redondeado al céntimo en cada servicio. Este descuento se aplica aunque no actives el ajuste de Imbric y Join Up.

- Uber Efectivo de 100 €: comisión 12 €, total neto 88 €, efectivo del chófer 100 €.
- Uber TPV de 50 €: comisión 6 €, total neto 44 €, cobro TPV 50 €.
- Uber App: conserva el importe y el cálculo de las versiones anteriores. No se aplica otro 12 % a ese importe.

El reparto del conductor usa el neto total y el porcentaje de la jornada. El dinero recibido usa el efectivo bruto y los abonados netos recibidos por él, cuando se ha marcado esa opción. TPV y App no se añaden al efectivo del chófer.

La vista previa, el detalle, los parciales, los cierres, los meses, los PDF y JSON siguen el mismo cálculo.

**Las jornadas antiguas, incluida una que ya estuviera abierta, conservan sus cálculos originales.** No se aplica el 12 % de forma retroactiva, para no alterar liquidaciones guardadas. Cierra la jornada anterior y empieza otra para utilizar la configuración nueva. Los resúmenes avisan si incluyen servicios Uber antiguos.

## Desglose Uber por jornada, mes o fechas

Se muestran importes registrados, comisión descontada, facturación neta, efectivo bruto, TPV bruto y saldo calculado:

**Saldo Uber = neto Uber del periodo − efectivo Uber bruto − TPV Uber bruto.**

Ejemplo: efectivo 100 €, TPV 50 € y App 200 € → neto 332 € → cobrado fuera de App 150 € → resta por abonar Uber 182 €.

Si el saldo es negativo aparece **Saldo a favor de Uber**. No se descuenta ninguna transferencia de Uber ya recibida: es una conciliación de los servicios registrados, no un control de transferencias bancarias. Los cobros antiguos sin modalidad dejan ese saldo sin calcular.

## Nombre y modo

Al iniciar la jornada puedes indicar un nombre opcional de hasta 60 caracteres. Se recuerda por separado para Chófer y Titular. Cambiar de modo recupera el nombre de ese modo. El nombre se guarda cuando comienzas, no al cancelar.

La octava casilla junto a los siete logos muestra **Modo chófer** o **Modo titular** y el nombre. Es informativa, sin acción. El nombre de cada jornada aparece en parciales, cierres, historial, resumen mensual, PDF y JSON. Cambiar el nombre para una nueva jornada no modifica las anteriores.

Titular mantiene la facturación íntegra, descontando las comisiones que correspondan, sin reparto ni seguro del conductor. Chófer mantiene su porcentaje, seguro diario opcional y liquidación. Se puede recordar el modo habitual y cambiarlo por jornada. El mismo porcentaje se aplica a todos sus servicios.

Abonado, Imbric y Join Up siguen siendo **cobro en central**, y se cuentan por separado de Efectivo, TPV y App. En modo Chófer, «Los abonados los cobra el chófer» incluye sus importes netos recibidos en su liquidación; no cambia su modalidad ni duplica el recuento. Las comisiones de Imbric 12 % y Join Up 10 % siguen dependiendo de su ajuste al inicio.

## Pantalla completa Android

La APK oculta las barras del sistema. Desliza desde el borde inferior para mostrarlas temporalmente y acceder a los controles o gestos de Android. No se bloquea el cambio de aplicación. Se respeta el recorte de cámara y el teclado.

Implementación basada en el [modo inmersivo de Android](https://developer.android.com/develop/ui/views/layout/immersive), con barras transitorias al deslizar. Puede variar el gesto concreto según el teléfono y su configuración de navegación. La compilación y el análisis Android han pasado; queda por comprobar físicamente en el móvil el gesto, el teclado y el selector nativo de archivos.

## Copias JSON compatibles

Actualiza **ambas versiones a 1.12.0** para intercambiar las copias nuevas (formato 11). Instrucciones → Datos y copias JSON permite exportar y cargar todos los datos: jornadas, servicios, nombres, comisiones, modalidades, porcentajes, seguro, modo y preferencias fijadas. Se incluyen resúmenes mensuales y saldos Uber recalculables. Las copias anteriores siguen admitiéndose conservando sus cálculos.

Revisa la vista previa antes de cargar. Por defecto se conservan las jornadas diferentes ya existentes; solo se sustituyen si lo marcas expresamente. Los nombres habituales se restauran junto con los ajustes generales si dejas esa opción activada. No hay sincronización automática. Se admiten JSON UTF-8 de hasta 20 MB, 10.000 jornadas y 100.000 servicios.

## Archivos e instalación PWA

El ZIP PWA contiene los archivos para la raíz del mismo repositorio. Extrae el ZIP y sube su contenido, sin una carpeta adicional de versión. El proyecto Android se entrega en otro ZIP. La clave privada de firma entregada anteriormente sigue siendo la misma y no debe subirse a GitHub.

La PWA conserva el identificador explícito estable /Contabilidad-y-Control-de-Servicios-Taxi/contabilidad-control-servicios-taxi, el inicio en su index.html y el alcance limitado a /Contabilidad-y-Control-de-Servicios-Taxi/. Su trabajador sin conexión y sus cachés están limitados a esa aplicación y ruta. La limpieza conserva las cachés de las demás aplicaciones. Se mantienen los siete logos, el icono del taxi, ambos temas y el almacenamiento local.

## Verificación

Se han comprobado 72 combinaciones de Uber por importe, modalidad, modo y ajuste de comisiones; redondeos; cobros brutos; total neto; saldo Uber negativo; liquidación del chófer; modo Titular; recepción neta de abonados; nombres por jornada; intercambio JSON PWA → Android → PWA; copias antiguas y rechazo de datos inválidos. También se ha probado actualizar desde la PWA 1.8.5 conservando jornadas, temas y cachés de otras apps, guardar y exportar sin conexión y reiniciar el navegador sin red. Los informes de ejemplo están marcados como datos de ejemplo y se han revisado visualmente.
