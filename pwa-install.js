// No se deduce una instalaciÃ³n a partir de la ausencia del aviso ni de banderas guardadas.
const TAXI_PWA_VERSION='1.9.0';
const TAXI_PWA_BASE=new URL('./',document.baseURI);
let taxiInstallPrompt=null,taxiPwaRegistration=null,taxiInstallConfirmed=false,taxiApplyUpdate=false;
function taxiStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;}
function refreshTaxiInstall(){
 const status=$('pwaInstallStatus'),button=$('pwaInstallBtn'),help=$('pwaInstallHelp');
 if(taxiStandalone()){
  status.textContent='Esta ventana estÃ¡ abierta como aplicaciÃ³n.';button.hidden=true;help.textContent='Puedes abrir Taxi desde su icono. La instalaciÃ³n y los datos dependen del navegador utilizado.';
 }else if(taxiInstallConfirmed){
  status.textContent='El navegador ha confirmado la instalaciÃ³n.';button.hidden=true;help.textContent='Espera a que el mÃ³vil termine de instalarla y Ã¡brela desde el cajÃ³n de aplicaciones.';
 }else if(taxiInstallPrompt){
  status.textContent='El navegador ofrece instalar esta aplicaciÃ³n.';button.hidden=false;button.disabled=false;help.textContent='Pulsa Instalar aplicaciÃ³n para abrir el diÃ¡logo oficial del navegador.';
 }else{
  status.textContent='No hay una instalaciÃ³n confirmada en esta ventana.';button.hidden=true;
  help.textContent=location.protocol==='file:'?'Abre la direcciÃ³n HTTPS de GitHub Pages; un archivo del telÃ©fono no permite instalar la PWA.':'Abre esta direcciÃ³n directamente en Chrome o Edge de Android y usa su menÃº > Instalar aplicaciÃ³n. Si solo ofrece un acceso directo, aÃºn no hay un aviso de instalaciÃ³n disponible. La ausencia del aviso no demuestra que ya estÃ© instalada.';
 }
 const waiting=taxiPwaRegistration?.waiting;
 $('pwaUpdateBtn').hidden=!waiting;
 $('pwaUpdateStatus').textContent=waiting?'Hay una actualizaciÃ³n lista. Guarda cualquier servicio que estÃ©s escribiendo antes de aplicarla.':'VersiÃ³n '+TAXI_PWA_VERSION+'. Las actualizaciones se comprueban al abrir la app.';
 const local=taxiPwaRegistration?.scope===TAXI_PWA_BASE.href&&!!taxiPwaRegistration?.active;
 $('pwaOfflineStatus').textContent=local?'Recursos preparados para funcionar sin conexiÃ³n.':'Preparando el funcionamiento sin conexiÃ³n. MantÃ©n la primera visita con Internet hasta que termine.';
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();taxiInstallPrompt=event;refreshTaxiInstall();});
window.addEventListener('appinstalled',()=>{taxiInstallPrompt=null;taxiInstallConfirmed=true;refreshTaxiInstall();});
window.matchMedia('(display-mode: standalone)').addEventListener('change',refreshTaxiInstall);
$('installHelpBtn').addEventListener('click',()=>{hideModal('instructionsDialog');refreshTaxiInstall();showModal('installDialog');});
$('pwaInstallBtn').addEventListener('click',async()=>{
 if(!taxiInstallPrompt)return;const pending=taxiInstallPrompt;taxiInstallPrompt=null;$('pwaInstallBtn').disabled=true;
 try{await pending.prompt();const choice=await pending.userChoice;refreshTaxiInstall();if(choice.outcome==='accepted'&&!taxiInstallConfirmed)$('pwaInstallHelp').textContent='Solicitud aceptada. Esperando la confirmaciÃ³n del navegador; la instalaciÃ³n puede tardar unos instantes.';}
 catch(error){refreshTaxiInstall();$('pwaInstallHelp').textContent='No se pudo abrir el diÃ¡logo. Prueba el menÃº Instalar aplicaciÃ³n de Chrome o Edge.';}
});
$('pwaUpdateBtn').addEventListener('click',()=>{
 if(!taxiPwaRegistration?.waiting)return;taxiApplyUpdate=true;$('pwaUpdateBtn').disabled=true;taxiPwaRegistration.waiting.postMessage({type:'ACTIVATE_TAXI_UPDATE'});
});
$('pwaCheckBtn').addEventListener('click',async()=>{
 if(!taxiPwaRegistration){$('pwaUpdateStatus').textContent='TodavÃ­a no se ha podido preparar la aplicaciÃ³n. Comprueba la conexiÃ³n y abre su direcciÃ³n HTTPS.';return;}
 try{await taxiPwaRegistration.update();refreshTaxiInstall();}catch(error){$('pwaUpdateStatus').textContent='No se pudieron buscar actualizaciones. Puedes seguir utilizando la versiÃ³n guardada sin conexiÃ³n.';}
});
$('pwaBackupBtn').addEventListener('click',()=>TaxiTransfer.exportFull());
async function prepareTaxiPwa(){
 refreshTaxiInstall();
 if(!('serviceWorker' in navigator)||!window.isSecureContext){$('pwaOfflineStatus').textContent='La instalaciÃ³n y el modo sin conexiÃ³n requieren HTTPS y un navegador compatible.';return;}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(taxiApplyUpdate)location.reload();else refreshTaxiInstall();});
 try{
  taxiPwaRegistration=await navigator.serviceWorker.register(new URL('sw.js',TAXI_PWA_BASE).href,{scope:TAXI_PWA_BASE.href,updateViaCache:'none'});
  const observe=()=>{const worker=taxiPwaRegistration.installing;if(worker)worker.addEventListener('statechange',refreshTaxiInstall);refreshTaxiInstall();};
  taxiPwaRegistration.addEventListener('updatefound',observe);observe();
  navigator.serviceWorker.ready.then(refreshTaxiInstall);
  await taxiPwaRegistration.update();refreshTaxiInstall();
 }catch(error){console.warn('PreparaciÃ³n PWA no disponible',error);$('pwaOfflineStatus').textContent='No se pudo preparar el modo sin conexiÃ³n. Revisa la conexiÃ³n y vuelve a abrir la direcciÃ³n de GitHub Pages.';}
}
prepareTaxiPwa();
