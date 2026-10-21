// No se deduce una instalación a partir de la ausencia del aviso ni de banderas guardadas.
const TAXI_PWA_VERSION='1.12.0';
const TAXI_PWA_BASE=new URL('./',document.baseURI);
let taxiInstallPrompt=null,taxiPwaRegistration=null,taxiInstallConfirmed=false,taxiApplyUpdate=false;
function taxiStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;}
function refreshTaxiInstall(){
 const status=$('pwaInstallStatus'),button=$('pwaInstallBtn'),help=$('pwaInstallHelp');
 if(taxiStandalone()){
  status.textContent='Esta ventana está abierta como aplicación.';button.hidden=true;help.textContent='Puedes abrir Taxi desde su icono. La instalación y los datos dependen del navegador utilizado.';
 }else if(taxiInstallConfirmed){
  status.textContent='El navegador ha confirmado la instalación.';button.hidden=true;help.textContent='Espera a que el móvil termine de instalarla y ábrela desde el cajón de aplicaciones.';
 }else if(taxiInstallPrompt){
  status.textContent='El navegador ofrece instalar esta aplicación.';button.hidden=false;button.disabled=false;help.textContent='Pulsa Instalar aplicación para abrir el diálogo oficial del navegador.';
 }else{
  status.textContent='No hay una instalación confirmada en esta ventana.';button.hidden=true;
  help.textContent=location.protocol==='file:'?'Abre la dirección HTTPS de GitHub Pages; un archivo del teléfono no permite instalar la PWA.':'Abre esta dirección directamente en Chrome o Edge de Android y usa su menú > Instalar aplicación. Si solo ofrece un acceso directo, aún no hay un aviso de instalación disponible. La ausencia del aviso no demuestra que ya esté instalada.';
 }
 const waiting=taxiPwaRegistration?.waiting;
 $('pwaUpdateBtn').hidden=!waiting;
 $('pwaUpdateStatus').textContent=waiting?'Hay una actualización lista. Guarda cualquier servicio que estés escribiendo antes de aplicarla.':'Versión '+TAXI_PWA_VERSION+'. Las actualizaciones se comprueban al abrir la app.';
 const local=taxiPwaRegistration?.scope===TAXI_PWA_BASE.href&&!!taxiPwaRegistration?.active;
 $('pwaOfflineStatus').textContent=local?'Recursos preparados para funcionar sin conexión.':'Preparando el funcionamiento sin conexión. Mantén la primera visita con Internet hasta que termine.';
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();taxiInstallPrompt=event;refreshTaxiInstall();});
window.addEventListener('appinstalled',()=>{taxiInstallPrompt=null;taxiInstallConfirmed=true;refreshTaxiInstall();});
window.matchMedia('(display-mode: standalone)').addEventListener('change',refreshTaxiInstall);
$('installHelpBtn').addEventListener('click',()=>{hideModal('instructionsDialog');refreshTaxiInstall();showModal('installDialog');});
$('pwaInstallBtn').addEventListener('click',async()=>{
 if(!taxiInstallPrompt)return;const pending=taxiInstallPrompt;taxiInstallPrompt=null;$('pwaInstallBtn').disabled=true;
 try{await pending.prompt();const choice=await pending.userChoice;refreshTaxiInstall();if(choice.outcome==='accepted'&&!taxiInstallConfirmed)$('pwaInstallHelp').textContent='Solicitud aceptada. Esperando la confirmación del navegador; la instalación puede tardar unos instantes.';}
 catch(error){refreshTaxiInstall();$('pwaInstallHelp').textContent='No se pudo abrir el diálogo. Prueba el menú Instalar aplicación de Chrome o Edge.';}
});
$('pwaUpdateBtn').addEventListener('click',()=>{
 if(!taxiPwaRegistration?.waiting)return;taxiApplyUpdate=true;$('pwaUpdateBtn').disabled=true;taxiPwaRegistration.waiting.postMessage({type:'ACTIVATE_TAXI_UPDATE'});
});
$('pwaCheckBtn').addEventListener('click',async()=>{
 if(!taxiPwaRegistration){$('pwaUpdateStatus').textContent='Todavía no se ha podido preparar la aplicación. Comprueba la conexión y abre su dirección HTTPS.';return;}
 try{await taxiPwaRegistration.update();refreshTaxiInstall();}catch(error){$('pwaUpdateStatus').textContent='No se pudieron buscar actualizaciones. Puedes seguir utilizando la versión guardada sin conexión.';}
});
$('pwaBackupBtn').addEventListener('click',()=>TaxiTransfer.exportFull());
async function prepareTaxiPwa(){
 refreshTaxiInstall();
 if(!('serviceWorker' in navigator)||!window.isSecureContext){$('pwaOfflineStatus').textContent='La instalación y el modo sin conexión requieren HTTPS y un navegador compatible.';return;}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(taxiApplyUpdate)location.reload();else refreshTaxiInstall();});
 try{
  taxiPwaRegistration=await navigator.serviceWorker.register(new URL('sw.js',TAXI_PWA_BASE).href,{scope:TAXI_PWA_BASE.href,updateViaCache:'none'});
  const observe=()=>{const worker=taxiPwaRegistration.installing;if(worker)worker.addEventListener('statechange',refreshTaxiInstall);refreshTaxiInstall();};
  taxiPwaRegistration.addEventListener('updatefound',observe);observe();
  navigator.serviceWorker.ready.then(refreshTaxiInstall);
  await taxiPwaRegistration.update();refreshTaxiInstall();
 }catch(error){console.warn('Preparación PWA no disponible',error);$('pwaOfflineStatus').textContent='No se pudo preparar el modo sin conexión. Revisa la conexión y vuelve a abrir la dirección de GitHub Pages.';}
}
prepareTaxiPwa();
