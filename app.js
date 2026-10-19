'use strict';
const TYPES = [
  {id:'pidetaxi',name:'PideTaxi',icon:'🚖'},
  {id:'imbric',name:'Imbric',icon:'◈'},
  {id:'joinup',name:'Join Up',icon:'↗'},
  {id:'abonado',name:'Abonado',icon:'◉'},
  {id:'uber',name:'Uber',icon:'◆'},
  {id:'freenow',name:'Free Now',icon:'✦'},
  {id:'concertado',name:'Concertado',icon:'★'}
];
const METHODS = {pidetaxi:['app','efectivo','tpv'],uber:['app','efectivo','tpv'],freenow:['app','efectivo','tpv'],concertado:['efectivo','tpv']};
const METHOD_NAMES = {app:'App',efectivo:'Efectivo',tpv:'TPV'};
const METHOD_UI={efectivo:'💵 Efectivo',tpv:'💳 TPV',app:'📱 App'};
const COMMISSION_RATES = {imbric:12,joinup:10};
const commissionsOn = session => session?.commissionEnabled === true;
const commissionCents = (svc,session) => commissionsOn(session) && COMMISSION_RATES[svc.type] ? Math.round(svc.amountCents * COMMISSION_RATES[svc.type] / 100) : 0;
const netCents = (svc,session) => svc.amountCents - commissionCents(svc,session);
const totalCommission = session => session.services.reduce((n,svc)=>n+commissionCents(svc,session),0);
const totalNet = session => totalCents(session) - totalCommission(session);
const accountingTotal = session => commissionsOn(session) ? totalNet(session) : totalCents(session);
const accountingValue = (svc,session) => commissionsOn(session) ? netCents(svc,session) : svc.amountCents;

// Configuración por jornada. En historiales antiguos no se presuponen ganancias.
const driverOn = session => session?.driverEnabled === true && Number.isInteger(session.driverBasisPoints) && Number.isInteger(session.dailyInsuranceCents);
const driverShare = session => driverOn(session) ? Math.round(accountingTotal(session) * session.driverBasisPoints / 10000) : 0;
const driverInsurance = session => driverOn(session) && session.insuranceEnabled!==false ? session.dailyInsuranceCents : 0;
const driverEarnings = session => driverShare(session) - driverInsurance(session);
const percentLabel = session => (session.driverBasisPoints / 100).toLocaleString('es-ES',{maximumFractionDigits:2}) + ' %';
// Cobros brutos: el efectivo físico no se reduce por las comisiones de plataforma.
const CENTRAL_TYPES=['abonado','imbric','joinup'];
const centralCash=session=>session?.centralCashByDriver===true;
const effectiveMethod=(svc,session)=>CENTRAL_TYPES.includes(svc.type)?(centralCash(session)?'efectivo':null):svc.paymentMethod;
function centralServiceLabel(type,session){return (centralCash(session)?'💵 ':'🧾 ')+nameType(type)+(centralCash(session)?' · efectivo del chófer':' · cobro en central');}
function collectionOwner(svc,session){
  if(CENTRAL_TYPES.includes(svc.type))return centralCash(session)?'conductor':'jefe';
  if(svc.paymentMethod==='efectivo')return 'conductor';
  if(['app','tpv'].includes(svc.paymentMethod))return 'jefe';
  return 'sin-clasificar';
}
function collections(session){
  const result={cash:0,boss:0,unclassified:0};
  for(const svc of session.services){const owner=collectionOwner(svc,session);result[owner==='conductor'?'cash':owner==='jefe'?'boss':'unclassified']+=svc.amountCents;}
  return result;
}
function settlement(session){
  const c=collections(session),configured=driverOn(session),ready=configured&&c.unclassified===0;
  const balance=ready?driverEarnings(session)-c.cash:null;
  return {...c,configured,ready,earnings:configured?driverEarnings(session):null,balance,fromBoss:ready?Math.max(balance,0):null,toBoss:ready?Math.max(-balance,0):null};
}
function settlementLabel(value){
  if(!value.configured)return 'Configura las ganancias para calcular la liquidación';
  if(!value.ready)return 'Liquidación pendiente: hay cobros sin clasificar';
  return value.balance>0?'El jefe debe pagar al chófer':value.balance<0?'El chófer debe entregar al jefe':'Liquidación equilibrada';
}
function settlementText(value){return settlementLabel(value)+(value.ready?' · '+money(Math.abs(value.balance)):'');}
function settlementJSON(value){return {efectivoConductorCentimos:value.cash,cobradoJefeBrutoCentimos:value.boss,sinClasificarCentimos:value.unclassified,calculable:value.ready,gananciaConductorCentimos:value.earnings,saldoAFavorConductorCentimos:value.balance,jefePagaConductorCentimos:value.fromBoss,conductorEntregaJefeCentimos:value.toBoss,criterio:'Ganancia del conductor menos efectivo cobrado. No descuenta entregas ni anticipos ya realizados.'};}
function appendSummaryLine(element,label,value,final=false){
  const row=document.createElement('div');row.className='driver-line'+(final?' driver-final':'');
  const a=document.createElement('span');a.textContent=label;const b=document.createElement('strong');b.textContent=value;row.append(a,b);element.append(row);
}
function renderCollections(element,session){
  const c=collections(session);element.replaceChildren();const h=document.createElement('h3');h.textContent='Quién ha cobrado los servicios';element.append(h);
  appendSummaryLine(element,'💵 Efectivo cobrado por el chófer',money(c.cash));
  appendSummaryLine(element,'📱 💳 🧾 Cobrado por el jefe o en central',money(c.boss));
  if(c.unclassified)appendSummaryLine(element,'Cobros antiguos sin clasificar',money(c.unclassified));
  const note=document.createElement('p');note.className='hint';note.textContent=centralCash(session)?'Abonado, Imbric y Join Up: efectivo cobrado por el chófer en esta jornada. Cobros mostrados en bruto.':'Abonado, Imbric y Join Up: cobro en central. Cobros mostrados en bruto.';element.append(note);
}
function moneyOrDash(session){return driverOn(session)?money(driverEarnings(session)):'Sin configurar';}
function parseNonnegativeCents(input){const val=String(input).trim().replace(/\s/g,'').replace(/€/g,'').replace(',','.');if(!/^\d+(?:\.\d{1,2})?$/.test(val))return null;const [a,b='']=val.split('.');const n=Number(a)*100+Number((b+'00').slice(0,2));return Number.isSafeInteger(n)&&n>=0&&n<=999999999?n:null;}
function parsePercentBasisPoints(input){const val=String(input).trim().replace(',','.');if(!/^\d{1,3}(?:\.\d{1,2})?$/.test(val))return null;const n=Math.round(Number(val)*100);return n>=0&&n<=10000?n:null;}


const serviceLabel = (x,session) => nameType(x.type)+(CENTRAL_TYPES.includes(x.type)?(centralCash(session)?' · Efectivo del chófer':' · Cobro en central'):(x.paymentMethod?' · '+(METHOD_NAMES[x.paymentMethod]||x.paymentMethod):''));
const $ = id => document.getElementById(id);
let monthSnapshot=null;
const money = cents => (cents / 100).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €';
const dateText = iso => new Date(iso).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const timeText = iso => new Date(iso).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
const totalCents = s => s.services.reduce((sum,item)=>sum+item.amountCents,0);
const nameType = id => TYPES.find(t=>t.id===id)?.name || id;
const sortServices = s => [...s.services].sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let db, active=null, selected=null, selectedMethod=null, listSession=null, lastFocus=null, toastTimer;

async function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('TaxiJornadaDB',1);
    req.onupgradeneeded=()=>{const store=req.result.createObjectStore('sessions',{keyPath:'id'});store.createIndex('startedAt','startedAt');};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(new Error('La base de datos está bloqueada por otra pestaña'));
  });
}
function transact(mode,task){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('sessions',mode);const store=tx.objectStore('sessions');let result;
    try {result=task(store);}catch(e){reject(e);return;}
    tx.oncomplete=()=>resolve(result);
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error||new Error('Operación cancelada'));
  });
}
function readAll(){return new Promise((resolve,reject)=>{const req=db.transaction('sessions','readonly').objectStore('sessions').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function readOne(id){return new Promise((resolve,reject)=>{const req=db.transaction('sessions','readonly').objectStore('sessions').get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function writeOne(s){return transact('readwrite',store=>store.put(s));}
function deleteOne(id){return transact('readwrite',store=>store.delete(id));}
function notify(msg){clearTimeout(toastTimer);$('toast').textContent=msg;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function markError(e){console.error(e);notify('No se pudo guardar. Revisa el almacenamiento del navegador.');}
function showModal(id){lastFocus=document.activeElement;$(id).hidden=false;document.body.style.overflow='hidden';$(id).querySelector('button:not(:disabled),input')?.focus();}
function hideModal(id){$(id).hidden=true;if(['startDialog','entryDialog','listDialog','historyDialog','monthlyDialog','instructionsDialog','transferDialog','installDialog'].every(k=>$(k).hidden))document.body.style.overflow='';lastFocus?.focus();}
function render(){
  const on=!!active;
  $('status').classList.toggle('active',on);
  $('status').innerHTML='<span class="status-dot"></span>'+(on?'Jornada en curso':'Sin jornada activa');
  $('total').textContent=money(on?accountingTotal(active):0);
  $('totalBasis').textContent='TOTAL NETO DE LA JORNADA';
  $('heroDriver').hidden=true;$('heroDriver').replaceChildren();
  $('heroCommission').textContent='';$('heroCommission').hidden=true;
  $('count').textContent=on?active.services.length:0;
  $('startTime').textContent=on?timeText(active.startedAt):'—';
  $('lastTime').textContent=on&&active.services.length?timeText(sortServices(active).at(-1).at):'—';
  $('startBtn').disabled=on;$('closeBtn').disabled=!on;$('partialsBtn').disabled=!on;
  $('inactiveHint').hidden=on;
  for(const b of document.querySelectorAll('.category'))b.disabled=!on;
  $('categoryTotals').innerHTML='';
  if(on){for(const type of TYPES){const sum=active.services.filter(x=>x.type===type.id).reduce((v,x)=>v+accountingValue(x,active),0);if(!sum)continue;const div=document.createElement('div');div.className='category-total';const a=document.createElement('span');a.textContent=type.name;const b=document.createElement('strong');b.textContent=money(sum);div.append(a,b);$('categoryTotals').append(div);}}
}
function updateCommissionPreview(){
 const show=!!active&&commissionsOn(active)&&!!COMMISSION_RATES[selected];
 const preview=$('commissionPreview');preview.hidden=!show;
 if(!show)return;
 const raw=parseAmount($('amount').value);
 const pct=COMMISSION_RATES[selected];
 const ded=raw===null?null:Math.round(raw*pct/100);
 $('commissionDescription').textContent=`Comisión ${nameType(selected)} (${pct} %) — cálculo automático`;
 $('commissionGross').textContent=raw===null?'—':money(raw);
 $('commissionDeduction').textContent=raw===null?'—':'−'+money(ded);
 $('commissionNet').textContent=raw===null?'—':money(raw-ded);
}
function buildCategories(){for(const type of TYPES){const btn=document.createElement('button');btn.className='category';btn.type='button';btn.dataset.id=type.id;btn.setAttribute('aria-label',type.name);btn.title=type.name;btn.innerHTML=`<img class="category-logo" src="./logos/${type.id}.webp" alt="" loading="eager" decoding="async">`;btn.addEventListener('click',()=>{if(!active)return;selected=type.id;selectedMethod=null;$('entryTitle').textContent=CENTRAL_TYPES.includes(type.id)?centralServiceLabel(type.id,active):type.name;$('amount').value='';updateCommissionPreview();const methods=METHODS[type.id]||[];const picker=$('methodPicker');picker.replaceChildren();picker.hidden=!methods.length;for(const method of methods){const option=document.createElement('button');option.type='button';option.className='method-button method-'+method;option.textContent=METHOD_UI[method];option.setAttribute('aria-pressed','false');option.addEventListener('click',()=>{selectedMethod=method;picker.querySelectorAll('button').forEach(b=>{b.classList.remove('chosen');b.setAttribute('aria-pressed','false')});option.classList.add('chosen');option.setAttribute('aria-pressed','true');$('amount').focus();});picker.append(option);} $('amount').disabled=!!methods.length;$('saveBtn').disabled=!!methods.length;picker.querySelectorAll('button').forEach(option=>option.addEventListener('click',()=>{$('amount').disabled=false;$('saveBtn').disabled=false;}));showModal('entryDialog');if(!methods.length)$('amount').focus();});$('categoryGrid').append(btn);}}
function parseAmount(raw){
  const cleaned=raw.trim().replace(/\s/g,'').replace(/€/g,'');
  // Accept 1.234,56, 1234.56 and 12,50, but reject ambiguous repeated separators.
  const normalized=/^\d{1,3}(?:\.\d{3})+,(?:\d{1,2})?$/.test(cleaned)?cleaned.replace(/\./g,'').replace(',','.'):/^\d{1,3}(?:,\d{3})+\.(?:\d{1,2})?$/.test(cleaned)?cleaned.replace(/,/g,''):cleaned.replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(normalized))return null;
  const [whole,dec='']=normalized.split('.');const cents=Number(whole)*100+Number((dec+'00').slice(0,2));
  return Number.isSafeInteger(cents)&&cents>0&&cents<=999999999?cents:null;
}
const DRIVER_DEFAULTS_KEY='taxi-driver-defaults-v1';
function loadDriverDefaults(){
  try{
    const value=JSON.parse(localStorage.getItem(DRIVER_DEFAULTS_KEY)||'null');
    if(!value||!Number.isInteger(value.driverBasisPoints)||value.driverBasisPoints<0||value.driverBasisPoints>10000||!Number.isInteger(value.dailyInsuranceCents)||value.dailyInsuranceCents<0||value.dailyInsuranceCents>999999999)return;
    $('driverPercent').value=(value.driverBasisPoints/100).toFixed(2).replace('.',',');
    $('driverInsurance').value=(value.dailyInsuranceCents/100).toFixed(2).replace('.',',');
    $('driverToggle').checked=true;$('driverConfigFields').hidden=false;$('rememberDriver').checked=true;
  }catch(e){console.warn('Preferencias de conductor no disponibles',e);}
}
function storeDriverDefaults(session){
  if(!driverOn(session))return true;
  try{
    if($('rememberDriver').checked)localStorage.setItem(DRIVER_DEFAULTS_KEY,JSON.stringify({driverBasisPoints:session.driverBasisPoints,dailyInsuranceCents:session.dailyInsuranceCents}));
    else localStorage.removeItem(DRIVER_DEFAULTS_KEY);
    return true;
  }catch(e){console.warn('No se pudieron guardar las preferencias',e);return false;}
}
async function startSession(){
  if(active)return;
  const sessions=await readAll();const existing=sessions.find(s=>!s.closedAt);
  if(existing){active=existing;render();notify('Se ha recuperado la jornada abierta');return;}
  $('centralCashToggle').checked=false;$('insuranceToggle').checked=true;$('driverInsurance').disabled=false;
  loadDriverDefaults();
  showModal('startDialog');
}
async function confirmStartSession(e){
 e.preventDefault();
 try{
   const existing=(await readAll()).find(s=>!s.closedAt);
   if(existing){active=existing;hideModal('startDialog');render();notify('Se ha recuperado la jornada abierta');return;}
   const useDriver=$('driverToggle').checked;
   const pct=useDriver?parsePercentBasisPoints($('driverPercent').value):0;
   const insuranceEnabled=$('insuranceToggle').checked;
   const insurance=useDriver?(parseNonnegativeCents($('driverInsurance').value)??(insuranceEnabled?null:0)):0;
   if(useDriver&&(pct===null||insurance===null)){notify('Introduce un porcentaje entre 0 y 100 y un seguro diario válido');return;}
   const now=new Date().toISOString();
   const s={schemaVersion:4,insuranceEnabled,centralCashByDriver:$('centralCashToggle').checked,id:makeId(),startedAt:now,closedAt:null,commissionEnabled:$('commissionToggle').checked,driverEnabled:useDriver,driverBasisPoints:pct,dailyInsuranceCents:insurance,services:[]};
   await writeOne(s);const defaultsSaved=storeDriverDefaults(s);active=s;hideModal('startDialog');render();notify(defaultsSaved?'Jornada iniciada. Ya puedes añadir servicios.':'Jornada iniciada, pero no se pudieron fijar los valores para nuevas jornadas.');
 }catch(e){markError(e);}

}
async function addService(e){e.preventDefault();if(!active||!selected)return;if(METHODS[selected]&&!selectedMethod){notify('Elige primero App, Efectivo o TPV');return;}const cents=parseAmount($('amount').value);if(cents===null){notify('Introduce un importe válido mayor que cero (máximo 2 decimales)');$('amount').focus();return;}
  $('saveBtn').disabled=true;
  try{const latest=await readOne(active.id);if(!latest||latest.closedAt)throw Error('La jornada ya está cerrada');latest.services.push({id:makeId(),type:selected,paymentMethod:selectedMethod,amountCents:cents,at:new Date().toISOString()});await writeOne(latest);active=latest;render();hideModal('entryDialog');notify(`${serviceLabel({type:selected,paymentMethod:selectedMethod},latest)} · ${money(cents)} guardado${commissionCents({type:selected,amountCents:cents},latest)?' · neto '+money(netCents({type:selected,amountCents:cents},latest)):''}`);}catch(err){markError(err);}finally{$('saveBtn').disabled=false;}
}
async function closeSession(){if(!active)return;
  if(!confirm(`¿Cerrar la jornada con ${active.services.length} servicios y ${money(accountingTotal(active))} ${commissionsOn(active)?'(netos)':'(brutos)'}? Podrás consultarla en el historial, pero no añadir más servicios.`))return;
  try{const latest=await readOne(active.id);if(!latest||latest.closedAt)throw Error('La jornada ya está cerrada');latest.closedAt=new Date().toISOString();await writeOne(latest);active=null;render();showList(latest);notify('Jornada cerrada y guardada.');}catch(e){markError(e);}
}
function renderDriverLines(element,session){
 const data=[['Total para reparto',money(accountingTotal(session))],['Participación ('+percentLabel(session)+')',money(driverShare(session))],[session.insuranceEnabled===false?'Seguro diario (no aplicado)':'Seguro diario','−'+money(driverInsurance(session))],['Ganancia del conductor',money(driverEarnings(session))]];
 element.replaceChildren();const h=document.createElement('h3');h.textContent='Ganancias del conductor';element.append(h);
 for(const [label,value] of data)appendSummaryLine(element,label,value);
 const result=settlement(session);
 appendSummaryLine(element,'💵 Efectivo cobrado por el chófer',money(result.cash));
 appendSummaryLine(element,settlementLabel(result),result.ready?money(Math.abs(result.balance)):'Sin calcular',true);
 const note=document.createElement('p');note.className='hint';note.textContent='Ganancia menos efectivo cobrado. No descuenta entregas ni anticipos ya realizados.';element.append(note);
}
function showList(session){
 listSession=session;
 $('listEyebrow').textContent=session.closedAt?'JORNADA CERRADA':'PARCIAL DE JORNADA';
 $('listTitle').textContent=session.closedAt?'Resumen del cierre':'Servicios registrados';
 $('listMeta').textContent=`Inicio: ${dateText(session.startedAt)} · ${session.closedAt?'Cierre: '+dateText(session.closedAt):'En curso'} · ${session.services.length} servicios`;
 $('listTotal').textContent=money(accountingTotal(session));
  $('listBasis').textContent=commissionsOn(session)?'Total NETO de la jornada':'Total de la jornada';
 renderCollections($('cashSessionSummary'),session);
 $('driverSessionSummary').hidden=!driverOn(session);
 if(driverOn(session))renderDriverLines($('driverSessionSummary'),session);
 $('commissionSummary').hidden=!commissionsOn(session);
 $('commissionMode').textContent=commissionsOn(session)?'Descuentos activados al iniciar jornada':'Sin descuentos de comisión';
 if(commissionsOn(session)){
   $('listCommission').textContent='−'+money(totalCommission(session));
   $('listNet').textContent=money(totalCents(session));
 }
 const byMethod=$('methodTotals');byMethod.replaceChildren();
 for(const method of ['app','efectivo','tpv']){
   const items=session.services.filter(x=>effectiveMethod(x,session)===method);
   if(!items.length)continue;
   const b=document.createElement('div');b.className='method-total';
   b.textContent=METHOD_UI[method]+' · '+money(items.reduce((n,x)=>n+x.amountCents,0));b.title='Cobros en bruto';byMethod.append(b);
 }
 const div=$('serviceList');div.replaceChildren();
 if(!session.services.length){div.innerHTML='<div class="empty">Todavía no hay servicios registrados.</div>';}else{
 for(const svc of sortServices(session)){
   const row=document.createElement('div');row.className='service-row';
   const time=document.createElement('span');time.className='service-time';
   time.textContent=new Date(svc.at).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
   const label=document.createElement('span');label.className='service-name';label.textContent=CENTRAL_TYPES.includes(svc.type)?centralServiceLabel(svc.type,session):nameType(svc.type)+(svc.paymentMethod?' · '+(METHOD_UI[svc.paymentMethod]||svc.paymentMethod):'');
   const amount=document.createElement('span');amount.className='service-amount';
   const comm=commissionCents(svc,session);
   if(commissionsOn(session)&&COMMISSION_RATES[svc.type]){amount.innerHTML=`<span class="amount-gross">Bruto ${money(svc.amountCents)}</span><span class="amount-commission">Comisión −${money(comm)}</span><span class="amount-net">Neto ${money(netCents(svc,session))}</span>`;}
   else amount.textContent=money(svc.amountCents);
   row.append(time,label,amount);
   if(!session.closedAt){
     const edit=document.createElement('button');edit.type='button';edit.className='small-action';edit.textContent='✎';edit.title='Corregir importe bruto';edit.setAttribute('aria-label','Corregir importe de '+serviceLabel(svc,session));edit.addEventListener('click',()=>updateService(session.id,svc.id,'edit'));
     const del=document.createElement('button');del.type='button';del.className='small-action';del.textContent='✕';del.title='Eliminar servicio';del.setAttribute('aria-label','Eliminar importe de '+serviceLabel(svc,session));del.addEventListener('click',()=>updateService(session.id,svc.id,'delete'));row.append(edit,del);
   }
   div.append(row);
 }}
 hideModal('historyDialog');showModal('listDialog');
}

async function updateService(sessionId,serviceId,action){try{
  const session=await readOne(sessionId);if(!session||session.closedAt)return notify('Jornada ya cerrada');const ix=session.services.findIndex(x=>x.id===serviceId);if(ix<0)return;
  const svc=session.services[ix];
  if(action==='delete'){if(!confirm(`¿Eliminar ${serviceLabel(svc,session)} de ${money(svc.amountCents)}?`))return;session.services.splice(ix,1);}else{
    const proposed=prompt(`Nuevo importe de ${serviceLabel(svc,session)} (€):`,(svc.amountCents/100).toFixed(2).replace('.',','));if(proposed===null)return;
    const n=parseAmount(proposed);if(n===null){notify('Importe no válido');return;}svc.amountCents=n;svc.editedAt=new Date().toISOString();
  }
  await writeOne(session);active=session;render();showList(session);notify(action==='delete'?'Servicio eliminado':'Importe corregido');
}catch(e){markError(e);}}
// Solo las jornadas cerradas se pueden borrar. Siempre se confirma la operación.
async function deleteSession(sessionId,origin){
 try{
  const s=await readOne(sessionId);
  if(!s){notify('La jornada ya no existe');if(origin==='monthly')await refreshMonth();else await showHistory();return;}
  if(!s.closedAt){notify('Cierra primero la jornada activa antes de eliminarla');return;}
  const summary=`${dateText(s.startedAt)}\n${s.services.length} servicios · ${money(accountingTotal(s))} contabilizados`;
  if(!confirm(`¿ELIMINAR DEFINITIVAMENTE esta jornada?\n\n${summary}\n\nSe borrarán todos sus servicios y se actualizarán los totales mensuales. Esta acción no se puede deshacer. Si quieres conservarla, exporta antes su JSON desde Historial > Ver.`))return;
  // Revalidar el estado inmediatamente antes de escribir en IndexedDB.
  const latest=await readOne(sessionId);
  if(!latest||!latest.closedAt){notify('La jornada ya no está disponible para eliminar');return;}
  await deleteOne(sessionId);
  if(listSession?.id===sessionId){listSession=null;if(!$('listDialog').hidden)hideModal('listDialog');}
  const all=await readAll();active=all.find(x=>!x.closedAt)||null;render();
  if(origin==='monthly')await refreshMonth();else await showHistory();
  notify('Jornada eliminada. Resúmenes actualizados.');
 }catch(e){markError(e);}
}
async function showHistory(){try{
 const all=(await readAll()).filter(s=>s.closedAt).sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
 const container=$('historyList');container.replaceChildren();
 if(!all.length)container.innerHTML='<div class="empty">No hay jornadas cerradas todavía.</div>';
 for(const s of all){
  const row=document.createElement('div');row.className='history-item';
  const info=document.createElement('div');
  const top=document.createElement('div');top.className='hint';top.textContent=dateText(s.startedAt);
  const sum=document.createElement('strong');sum.textContent=money(accountingTotal(s));
  const foot=document.createElement('p');foot.className='hint';foot.textContent=`${s.services.length} servicios · ${commissionsOn(s)?'Total neto':'Total bruto'} · Cierre ${dateText(s.closedAt)}`;
  if(driverOn(s))foot.textContent+=` · Ganancia chófer ${money(driverEarnings(s))} · ${settlementText(settlement(s))}`;
  info.append(top,sum,foot);
  const actions=document.createElement('div');actions.className='history-actions';
  const view=document.createElement('button');view.type='button';view.textContent='Ver';view.addEventListener('click',()=>showList(s));
  const remove=document.createElement('button');remove.type='button';remove.className='danger-action';remove.textContent='Eliminar';remove.setAttribute('aria-label','Eliminar jornada del '+dateText(s.startedAt));remove.addEventListener('click',()=>deleteSession(s.id,'history'));
  actions.append(view,remove);row.append(info,actions);container.append(row);
 }
 if($('historyDialog').hidden)showModal('historyDialog');
}catch(e){markError(e);}}

function download(blob,filename){
  if(window.AndroidFiles && typeof window.AndroidFiles.saveBase64==='function'){
    const reader=new FileReader();
    reader.onload=()=>{
      const data=String(reader.result||'');
      const b64=data.substring(data.indexOf(',')+1);
      window.AndroidFiles.saveBase64(filename,blob.type||'application/octet-stream',b64);
    };
    reader.onerror=()=>notify('No se pudo preparar la descarga');
    reader.readAsDataURL(blob);
    return;
  }
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function fileStem(s){const d=new Date(s.startedAt);const part=n=>String(n).padStart(2,'0');return `contabilidad-control-servicios-taxi-${d.getFullYear()}-${part(d.getMonth()+1)}-${part(d.getDate())}-${part(d.getHours())}${part(d.getMinutes())}`;}
function exportJSON(){if(!listSession)return;const s=listSession;const json={app:'Contabilidad y Control de Servicios Taxi',version:8,insuranceEnabled:s.insuranceEnabled!==false,centralCashByDriver:centralCash(s),liquidacion:settlementJSON(settlement(s)),id:s.id,inicio:s.startedAt,cierre:s.closedAt,comisiones:{activadas:commissionsOn(s),imbricPorcentaje:12,joinUpPorcentaje:10},totalBrutoCentimos:totalCents(s),totalComisionCentimos:totalCommission(s),totalNetoCentimos:totalNet(s),totalContabilizadoCentimos:accountingTotal(s),criterioTotal:commissionsOn(s)?'neto':'bruto',conductor:{activado:driverOn(s),porcentaje:driverOn(s)?s.driverBasisPoints/100:null,seguroDiarioCentimos:driverOn(s)?s.dailyInsuranceCents:null,seguroAplicadoCentimos:driverOn(s)?driverInsurance(s):null,participacionCentimos:driverOn(s)?driverShare(s):null,gananciaCentimos:driverOn(s)?driverEarnings(s):null},totalBrutoEuros:(totalCents(s)/100).toFixed(2),totalComisionEuros:(totalCommission(s)/100).toFixed(2),totalNetoEuros:(totalNet(s)/100).toFixed(2),totalContabilizadoEuros:(accountingTotal(s)/100).toFixed(2),servicios:sortServices(s).map(x=>({id:x.id,etiqueta:serviceLabel(x,s),tipo:x.type,modalidadCobro:x.paymentMethod||null,cobradoPor:collectionOwner(x,s),cobroAplicado:effectiveMethod(x,s)||(CENTRAL_TYPES.includes(x.type)?'central':null),fechaHora:x.at,importeBrutoCentimos:x.amountCents,comisionPorcentaje:commissionsOn(s)?(COMMISSION_RATES[x.type]||0):0,comisionCentimos:commissionCents(x,s),importeNetoCentimos:netCents(x,s),importeBrutoEuros:(x.amountCents/100).toFixed(2),comisionEuros:(commissionCents(x,s)/100).toFixed(2),importeNetoEuros:(netCents(x,s)/100).toFixed(2),...(x.editedAt?{corregidoEn:x.editedAt}:{})}))};download(new Blob([JSON.stringify(json,null,2)],{type:'application/json;charset=utf-8'}),fileStem(s)+'.json');notify('JSON preparado para descargar');}
// Los informes PDF se generan localmente en pdf-report.js.

// Resumen mensual: agrupar exclusivamente por la fecha LOCAL de inicio de cada jornada.
function monthKey(iso){const d=new Date(iso);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function thisMonth(){return monthKey(new Date().toISOString());}
function sumBy(xs,fn){return xs.reduce((n,x)=>n+fn(x),0);}
function monthAccounting(sessions){
  const rows=TYPES.map(t=>({id:t.id,label:t.name,count:0,gross:0,commission:0,total:0}));
  for(const s of sessions)for(const svc of s.services){const r=rows.find(x=>x.id===svc.type);if(!r)continue;r.count++;r.gross+=svc.amountCents;r.commission+=commissionCents(svc,s);r.total+=accountingValue(svc,s);}
  const gross=sumBy(sessions,totalCents),commission=sumBy(sessions,totalCommission),total=sumBy(sessions,accountingTotal),count=sumBy(sessions,s=>s.services.length);
  const driverSessions=sessions.filter(driverOn),driverParticipation=sumBy(driverSessions,driverShare),insurance=sumBy(driverSessions,driverInsurance),driverTotal=sumBy(driverSessions,driverEarnings),insuranceDays=driverSessions.filter(s=>driverInsurance(s)>0).length;
  return {sessions,rows:rows.filter(r=>r.count),gross,commission,total,count,driverSessions,driverParticipation,insurance,insuranceDays,driverTotal,averageService:count?Math.round(total/count):0,averageSession:sessions.length?Math.round(total/sessions.length):0};
}
function periodSettlement(sessions){
  const configuredSessions=sessions.filter(driverOn),values=configuredSessions.map(settlement);
  const cash=sumBy(values,v=>v.cash),boss=sumBy(values,v=>v.boss),unclassified=sumBy(values,v=>v.unclassified);
  const configured=configuredSessions.length>0,ready=configured&&values.every(v=>v.ready),earnings=sumBy(configuredSessions,driverEarnings),balance=ready?earnings-cash:null;
  return {cash,boss,unclassified,configured,ready,earnings:configured?earnings:null,balance,fromBoss:ready?Math.max(balance,0):null,toBoss:ready?Math.max(-balance,0):null};
}
function localDay(iso){const d=new Date(iso);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function displayDay(day){return day.split('-').reverse().join('/');}
function resetMonthDates(){
 const key=$('monthPicker').value;if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(key))return;
 const [year,month]=key.split('-').map(Number);
 $('periodFrom').value=key+'-01';$('periodTo').value=key+'-'+String(new Date(year,month,0).getDate()).padStart(2,'0');
}
function exportPeriodJSON(){
 const m=monthSnapshot;if(!m||!m.sessions.length)return;
 const payload={app:'Contabilidad y Control de Servicios Taxi',version:8,seguroDescontadoCentimos:m.insurance,jornadasConSeguro:m.insuranceDays,gananciaConductorCentimos:m.driverTotal,desde:m.from,hasta:m.to,criterioFechas:'Fecha local de inicio de cada jornada',totalBrutoCentimos:m.gross,totalComisionCentimos:m.commission,totalContabilizadoCentimos:m.total,cobros:{efectivoConductorCentimos:m.allCollections.cash,cobradoJefeBrutoCentimos:m.allCollections.boss,sinClasificarCentimos:m.allCollections.unclassified},liquidacion:{...settlementJSON(m.settlement),jornadasConPorcentaje:m.driverSessions.length,jornadasTotales:m.sessions.length},jornadas:m.sessions.map(s=>({...s,liquidacion:settlementJSON(settlement(s))}))};
 download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),`contabilidad-taxi-periodo-${m.from}_${m.to}.json`);notify('JSON del periodo preparado para descargar');
}
function td(text){const cell=document.createElement('td');cell.textContent=text;return cell;}
async function refreshMonth(){
  const key=$('monthPicker').value;
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)){monthSnapshot=null;$('monthPdfBtn').disabled=true;$('monthJsonBtn').disabled=true;$('monthlyContent').hidden=true;$('monthlyEmpty').hidden=false;$('monthlyEmpty').textContent='Selecciona un mes válido.';return;}
  const from=$('periodFrom').value,to=$('periodTo').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to){
    monthSnapshot=null;$('periodCaption').textContent='';$('monthPdfBtn').disabled=true;$('monthJsonBtn').disabled=true;$('monthlyContent').hidden=true;$('monthlyEmpty').hidden=false;$('monthlyEmpty').textContent='Elige fechas válidas: Desde no puede ser posterior a Hasta.';return;
  }
  const sessions=(await readAll()).filter(s=>{const day=localDay(s.startedAt);return day>=from&&day<=to;}).sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
  const allCollections=sessions.reduce((all,s)=>{const c=collections(s);for(const k of Object.keys(all))all[k]+=c[k];return all;},{cash:0,boss:0,unclassified:0});
  monthSnapshot={key,from,to,periodLabel:`${displayDay(from)} - ${displayDay(to)}`,...monthAccounting(sessions),allCollections,settlement:periodSettlement(sessions)};
  $('periodCaption').textContent='Periodo: '+monthSnapshot.periodLabel;
  $('monthJsonBtn').disabled=!sessions.length;
  $('monthlyEmpty').textContent='No hay jornadas registradas en este periodo.';
  $('monthlyEmpty').hidden=!!sessions.length;$('monthlyContent').hidden=!sessions.length;$('monthPdfBtn').disabled=!sessions.length;
  if(!sessions.length)return;
  const m=monthSnapshot;
  $('monthTotal').textContent=money(m.total);$('monthServices').textContent=String(m.count);
  $('monthMeanService').textContent=money(m.averageService);$('monthSessions').textContent=String(sessions.length);
  $('monthInsurance').textContent=money(m.insurance);$('monthInsuranceDays').textContent=m.insuranceDays+(m.insuranceDays===1?' jornada':' jornadas')+' con seguro descontado';
  $('monthMeanSession').textContent=money(m.averageSession);$('monthCommission').textContent=money(m.commission);
  $('monthDriver').hidden=!m.driverSessions.length;
  if(m.driverSessions.length){const d=$('monthDriver');d.replaceChildren();const h=document.createElement('h3');h.textContent='Ganancias del conductor';d.append(h);
    for(const [a,b] of [['Jornadas con porcentaje configurado',String(m.driverSessions.length)+' / '+String(m.sessions.length)],['Participación acumulada',money(m.driverParticipation)],['Seguro total descontado','−'+money(m.insurance)],['Jornadas con seguro descontado',String(m.insuranceDays)],['GANANCIA DEL PERIODO',money(m.driverTotal)],['💵 Efectivo (jornadas con porcentaje)',money(m.settlement.cash)],['Cobrado por el jefe (jornadas con porcentaje)',money(m.settlement.boss)]])appendSummaryLine(d,a,b);
    appendSummaryLine(d,settlementLabel(m.settlement),m.settlement.ready?money(Math.abs(m.settlement.balance)):'Sin calcular',true);
    const note=document.createElement('p');note.className='hint';note.textContent='Solo se liquidan jornadas con porcentaje configurado. No descuenta entregas ni anticipos ya realizados.';d.append(note);}
  const c=$('monthCollections');c.replaceChildren();const h=document.createElement('h3');h.textContent='Cobros de todas las jornadas del periodo';c.append(h);
  appendSummaryLine(c,'💵 Efectivo cobrado por el chófer',money(m.allCollections.cash));appendSummaryLine(c,'📱 💳 🧾 Cobrado por el jefe (bruto)',money(m.allCollections.boss));
  if(m.allCollections.unclassified)appendSummaryLine(c,'Cobros antiguos sin clasificar',money(m.allCollections.unclassified));
  $('monthGrossLine').textContent=`Total bruto: ${money(m.gross)} · Comisiones: −${money(m.commission)} · Neto: ${money(m.gross-m.commission)}`;
  $('monthlyDays').replaceChildren();$('monthlyPlatforms').replaceChildren();
  for(const s of sessions){
    const tr=document.createElement('tr');
    [dateText(s.startedAt)+(s.closedAt?'':' · abierta'),String(s.services.length),money(accountingTotal(s)),moneyOrDash(s)].forEach(t=>tr.append(td(t)));
    const actionCell=document.createElement('td');actionCell.className='monthly-actions';
    if(s.closedAt){
      const remove=document.createElement('button');remove.type='button';remove.className='danger-action';remove.textContent='Eliminar';remove.setAttribute('aria-label','Eliminar jornada del '+dateText(s.startedAt));remove.addEventListener('click',()=>deleteSession(s.id,'monthly'));actionCell.append(remove);
    }else{const note=document.createElement('span');note.className='hint';note.textContent='En curso';actionCell.append(note);}
    tr.append(actionCell);$('monthlyDays').append(tr);
  }
  for(const r of m.rows){const tr=document.createElement('tr');[r.label,String(r.count),money(r.total),money(Math.round(r.total/r.count))].forEach(t=>tr.append(td(t)));$('monthlyPlatforms').append(tr);}
}
async function showMonthly(){try{$('monthPicker').value=thisMonth();resetMonthDates();await refreshMonth();showModal('monthlyDialog');}catch(e){markError(e);}}
// El nombre se confirma antes de la descarga, sin modificar la jornada ni sus datos.
let pendingPdfExport=null;
function downloadTimestamp(){const d=new Date(),pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;}
function cleanPdfFilename(value){return String(value||'').replace(/\.pdf$/i,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,110);}
function askPdfFilename(kind){
 if(kind==='daily'&&!listSession)return;
 if(kind==='monthly'&&(!monthSnapshot||!monthSnapshot.sessions.length)){notify('No hay jornadas para exportar');return;}
 const pdfType=$(kind==='monthly'?'monthPdfType':'pdfType').value;
 if(kind==='daily'&&pdfType==='driver'&&!driverOn(listSession)){notify('Esta jornada no tiene ganancias configuradas');return;}
 if(kind==='monthly'&&pdfType==='driver'&&!monthSnapshot.driverSessions.length){notify('No hay jornadas con ganancias configuradas en este mes');return;}
 const basis=kind==='monthly'?`periodo-${monthSnapshot.from}_${monthSnapshot.to}`:`jornada-${monthKey(listSession.startedAt)}`;
 const labels={taxi:'facturacion',driver:'ganancias-conductor',both:'informe-completo'};
 $('filenameInput').value=`Contabilidad_Control_Servicios_Taxi_${basis}_${labels[pdfType]}_${downloadTimestamp()}`;
 pendingPdfExport=kind;
 $('filenameDialog').hidden=false;
 document.body.style.overflow='hidden';
 $('filenameInput').focus();$('filenameInput').select();
}
function closeFilenameDialog(){pendingPdfExport=null;$('filenameDialog').hidden=true;if(['startDialog','entryDialog','listDialog','historyDialog','monthlyDialog','instructionsDialog','transferDialog','installDialog'].every(k=>$(k).hidden))document.body.style.overflow='';}
function confirmPdfFilename(event){
 event.preventDefault();
 const safe=cleanPdfFilename($('filenameInput').value);
 if(!safe){notify('Escribe un nombre válido para el PDF');$('filenameInput').focus();return;}
 const kind=pendingPdfExport;closeFilenameDialog();
 if(kind==='daily')exportPDF(safe+'.pdf');else if(kind==='monthly')monthlyPdf(safe+'.pdf');
}

function attach(){
  $('startBtn').addEventListener('click',()=>startSession().catch(markError));
  $('startForm').addEventListener('submit',confirmStartSession);
  $('insuranceToggle').addEventListener('change',e=>{$('driverInsurance').disabled=!e.target.checked;});
  $('driverToggle').addEventListener('change',e=>{$('driverConfigFields').hidden=!e.target.checked;});
  $('pdfType').addEventListener('change',()=>{if(listSession&&$('pdfType').value==='driver'&&!driverOn(listSession))notify('Sin ganancias configuradas en esta jornada');});
  $('amount').addEventListener('input',updateCommissionPreview);
  $('closeBtn').addEventListener('click',()=>closeSession());
  $('entryForm').addEventListener('submit',addService);
  $('partialsBtn').addEventListener('click',async()=>{try{const s=await readOne(active.id);active=s;render();showList(s);}catch(e){markError(e);}});
  $('historyBtn').addEventListener('click',showHistory);
  $('monthlyBtn').addEventListener('click',showMonthly);
  $('instructionsBtn').addEventListener('click',()=>showModal('instructionsDialog'));
  $('monthPicker').addEventListener('change',()=>{resetMonthDates();refreshMonth().catch(markError);});
  for(const id of ['periodFrom','periodTo'])$(id).addEventListener('change',()=>refreshMonth().catch(markError));
  $('monthJsonBtn').addEventListener('click',exportPeriodJSON);
  $('currentMonthBtn').addEventListener('click',()=>{$('monthPicker').value=thisMonth();resetMonthDates();refreshMonth().catch(markError);});
  $('monthPdfBtn').addEventListener('click',()=>askPdfFilename('monthly'));
  $('jsonBtn').addEventListener('click',exportJSON);$('pdfBtn').addEventListener('click',()=>askPdfFilename('daily'));
  $('filenameForm').addEventListener('submit',confirmPdfFilename);
  document.querySelectorAll('[data-dismiss=filename]').forEach(b=>b.addEventListener('click',closeFilenameDialog));
  document.querySelectorAll('[data-dismiss]').forEach(b=>b.addEventListener('click',()=>hideModal(b.dataset.dismiss+'Dialog')));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const d of ['startDialog','entryDialog','listDialog','historyDialog','monthlyDialog','instructionsDialog','transferDialog','installDialog'])if(!$(d).hidden)hideModal(d);if(!$('filenameDialog').hidden)closeFilenameDialog();});
  $('themeBtn').addEventListener('click',()=>{const next=!document.body.classList.contains('light');document.body.classList.toggle('light',next);localStorage.setItem('taxi-theme',next?'light':'dark');$('themeBtn').textContent=next?'🌙':'☀️';});
  try{const light=localStorage.getItem('taxi-theme')==='light';document.body.classList.toggle('light',light);$('themeBtn').textContent=light?'🌙':'☀️';}catch(e){console.warn('Preferencia de tema no disponible',e);}
  setInterval(()=>{$('clock').textContent=new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});},500);
  $('clock').textContent=timeText(new Date().toISOString());
  document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='visible'&&db){try{const all=await readAll();active=all.find(x=>!x.closedAt)||null;render();}catch(e){markError(e);}}});
}
async function init(){buildCategories();attach();try{db=await openDB();const all=await readAll();active=all.find(x=>!x.closedAt)||null;render();}catch(e){console.error(e);$('inactiveHint').textContent='No se puede acceder al almacenamiento local. Comprueba los permisos del navegador y vuelve a cargar.';$('startBtn').disabled=true;notify('Error al abrir el almacenamiento local.');}
  // Instalación y actualizaciones gestionadas por pwa-install.js.
}
init();
