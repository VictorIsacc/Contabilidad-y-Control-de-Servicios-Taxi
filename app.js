'use strict';
const TYPES = [
  {id:'pidetaxi',name:'PideTaxi',icon:'🚖'},
  {id:'imbric',name:'Imbric',icon:'◈'},
  {id:'joinup',name:'Join Up',icon:'↗'},
  {id:'abonado',name:'Abonado sin',icon:'◉'},
  {id:'uber',name:'Uber',icon:'◆'},
  {id:'freenow',name:'Free Now',icon:'✦'},
  {id:'concertado',name:'Concertado',icon:'★'}
];
const METHODS = {pidetaxi:['app','efectivo','tpv'],uber:['app','efectivo','tpv'],freenow:['app','efectivo','tpv'],concertado:['efectivo','tpv']};
const METHOD_NAMES = {app:'App',efectivo:'Efectivo',tpv:'TPV'};
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
const driverInsurance = session => driverOn(session) ? session.dailyInsuranceCents : 0;
const driverEarnings = session => driverShare(session) - driverInsurance(session);
const percentLabel = session => (session.driverBasisPoints / 100).toLocaleString('es-ES',{maximumFractionDigits:2}) + ' %';
function moneyOrDash(session){return driverOn(session)?money(driverEarnings(session)):'Sin configurar';}
function parseNonnegativeCents(input){const val=String(input).trim().replace(/\s/g,'').replace(/€/g,'').replace(',','.');if(!/^\d+(?:\.\d{1,2})?$/.test(val))return null;const [a,b='']=val.split('.');const n=Number(a)*100+Number((b+'00').slice(0,2));return Number.isSafeInteger(n)&&n>=0&&n<=999999999?n:null;}
function parsePercentBasisPoints(input){const val=String(input).trim().replace(',','.');if(!/^\d{1,3}(?:\.\d{1,2})?$/.test(val))return null;const n=Math.round(Number(val)*100);return n>=0&&n<=10000?n:null;}


const serviceLabel = x => nameType(x.type) + (x.paymentMethod ? ' · '+(METHOD_NAMES[x.paymentMethod] || x.paymentMethod) : '');
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
function hideModal(id){$(id).hidden=true;if(['startDialog','entryDialog','listDialog','historyDialog','monthlyDialog','instructionsDialog'].every(k=>$(k).hidden))document.body.style.overflow='';lastFocus?.focus();}
function render(){
  const on=!!active;
  $('status').classList.toggle('active',on);
  $('status').innerHTML='<span class="status-dot"></span>'+(on?'Jornada en curso':'Sin jornada activa');
  $('total').textContent=money(on?accountingTotal(active):0);
  $('totalBasis').textContent=on&&commissionsOn(active)?'TOTAL NETO · COMISIONES ACTIVADAS':'TOTAL DE LA JORNADA';
  $('heroDriver').hidden=!on||!driverOn(active);
  if(on&&driverOn(active))$('heroDriver').innerHTML=`Ganancias estimadas · ${percentLabel(active)} · Seguro ${money(driverInsurance(active))}<strong>${money(driverEarnings(active))}</strong>`;
  $('heroCommission').textContent=on&&commissionsOn(active)?`Bruto: ${money(totalCents(active))}  ·  Comisiones: −${money(totalCommission(active))}`:'';
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
function buildCategories(){for(const type of TYPES){const btn=document.createElement('button');btn.className='category';btn.type='button';btn.dataset.id=type.id;btn.setAttribute('aria-label',type.name);btn.title=type.name;btn.innerHTML=`<img class="category-logo" src="./logos/${type.id}.webp" alt="" loading="eager" decoding="async">`;btn.addEventListener('click',()=>{if(!active)return;selected=type.id;selectedMethod=null;$('entryTitle').textContent=type.name;$('amount').value='';updateCommissionPreview();const methods=METHODS[type.id]||[];const picker=$('methodPicker');picker.replaceChildren();picker.hidden=!methods.length;for(const method of methods){const option=document.createElement('button');option.type='button';option.className='method-button method-'+method;option.textContent=METHOD_NAMES[method];option.setAttribute('aria-pressed','false');option.addEventListener('click',()=>{selectedMethod=method;picker.querySelectorAll('button').forEach(b=>{b.classList.remove('chosen');b.setAttribute('aria-pressed','false')});option.classList.add('chosen');option.setAttribute('aria-pressed','true');$('amount').focus();});picker.append(option);} $('amount').disabled=!!methods.length;$('saveBtn').disabled=!!methods.length;picker.querySelectorAll('button').forEach(option=>option.addEventListener('click',()=>{$('amount').disabled=false;$('saveBtn').disabled=false;}));showModal('entryDialog');if(!methods.length)$('amount').focus();});$('categoryGrid').append(btn);}}
function parseAmount(raw){
  const cleaned=raw.trim().replace(/\s/g,'').replace(/€/g,'');
  // Accept 1.234,56, 1234.56 and 12,50, but reject ambiguous repeated separators.
  const normalized=/^\d{1,3}(?:\.\d{3})+,(?:\d{1,2})?$/.test(cleaned)?cleaned.replace(/\./g,'').replace(',','.'):/^\d{1,3}(?:,\d{3})+\.(?:\d{1,2})?$/.test(cleaned)?cleaned.replace(/,/g,''):cleaned.replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(normalized))return null;
  const [whole,dec='']=normalized.split('.');const cents=Number(whole)*100+Number((dec+'00').slice(0,2));
  return Number.isSafeInteger(cents)&&cents>0&&cents<=999999999?cents:null;
}
async function startSession(){
  if(active)return;
  const sessions=await readAll();const existing=sessions.find(s=>!s.closedAt);
  if(existing){active=existing;render();notify('Se ha recuperado la jornada abierta');return;}
  showModal('startDialog');
}
async function confirmStartSession(e){
 e.preventDefault();
 try{
   const existing=(await readAll()).find(s=>!s.closedAt);
   if(existing){active=existing;hideModal('startDialog');render();notify('Se ha recuperado la jornada abierta');return;}
   const useDriver=$('driverToggle').checked;
   const pct=useDriver?parsePercentBasisPoints($('driverPercent').value):0;
   const insurance=useDriver?parseNonnegativeCents($('driverInsurance').value):0;
   if(useDriver&&(pct===null||insurance===null)){notify('Introduce un porcentaje entre 0 y 100 y un seguro diario válido');return;}
   const now=new Date().toISOString();
   const s={schemaVersion:3,id:makeId(),startedAt:now,closedAt:null,commissionEnabled:$('commissionToggle').checked,driverEnabled:useDriver,driverBasisPoints:pct,dailyInsuranceCents:insurance,services:[]};
   await writeOne(s);active=s;hideModal('startDialog');render();notify('Jornada iniciada. Ya puedes añadir servicios.');
 }catch(e){markError(e);}

}
async function addService(e){e.preventDefault();if(!active||!selected)return;if(METHODS[selected]&&!selectedMethod){notify('Elige primero App, Efectivo o TPV');return;}const cents=parseAmount($('amount').value);if(cents===null){notify('Introduce un importe válido mayor que cero (máximo 2 decimales)');$('amount').focus();return;}
  $('saveBtn').disabled=true;
  try{const latest=await readOne(active.id);if(!latest||latest.closedAt)throw Error('La jornada ya está cerrada');latest.services.push({id:makeId(),type:selected,paymentMethod:selectedMethod,amountCents:cents,at:new Date().toISOString()});await writeOne(latest);active=latest;render();hideModal('entryDialog');notify(`${serviceLabel({type:selected,paymentMethod:selectedMethod})} · ${money(cents)} guardado${commissionCents({type:selected,amountCents:cents},latest)?' · neto '+money(netCents({type:selected,amountCents:cents},latest)):''}`);}catch(err){markError(err);}finally{$('saveBtn').disabled=false;}
}
async function closeSession(){if(!active)return;
  if(!confirm(`¿Cerrar la jornada con ${active.services.length} servicios y ${money(accountingTotal(active))} ${commissionsOn(active)?'(netos)':'(brutos)'}? Podrás consultarla en el historial, pero no añadir más servicios.`))return;
  try{const latest=await readOne(active.id);if(!latest||latest.closedAt)throw Error('La jornada ya está cerrada');latest.closedAt=new Date().toISOString();await writeOne(latest);active=null;render();showList(latest);notify('Jornada cerrada y guardada.');}catch(e){markError(e);}
}
function renderDriverLines(element,session){
 const data=[['Total para reparto',money(accountingTotal(session))],['Participación ('+percentLabel(session)+')',money(driverShare(session))],['Seguro diario','−'+money(driverInsurance(session))],['Ganancia del conductor',money(driverEarnings(session))]];
 element.replaceChildren();const h=document.createElement('h3');h.textContent='Ganancias del conductor';element.append(h);
 for(const [label,value] of data){const line=document.createElement('div');line.className='driver-line'+(label==='Ganancia del conductor'?' driver-final':'');const a=document.createElement('span');a.textContent=label;const b=document.createElement('strong');b.textContent=value;line.append(a,b);element.append(line);}
}
function showList(session){
 listSession=session;
 $('listEyebrow').textContent=session.closedAt?'JORNADA CERRADA':'PARCIAL DE JORNADA';
 $('listTitle').textContent=session.closedAt?'Resumen del cierre':'Servicios registrados';
 $('listMeta').textContent=`Inicio: ${dateText(session.startedAt)} · ${session.closedAt?'Cierre: '+dateText(session.closedAt):'En curso'} · ${session.services.length} servicios`;
 $('listTotal').textContent=money(accountingTotal(session));
  $('listBasis').textContent=commissionsOn(session)?'Total NETO de la jornada':'Total de la jornada';
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
   const items=session.services.filter(x=>x.paymentMethod===method);
   if(!items.length)continue;
   const b=document.createElement('div');b.className='method-total';
   b.textContent=METHOD_NAMES[method]+' · '+money(items.reduce((n,x)=>n+accountingValue(x,session),0));byMethod.append(b);
 }
 const div=$('serviceList');div.replaceChildren();
 if(!session.services.length){div.innerHTML='<div class="empty">Todavía no hay servicios registrados.</div>';}else{
 for(const svc of sortServices(session)){
   const row=document.createElement('div');row.className='service-row';
   const time=document.createElement('span');time.className='service-time';
   time.textContent=new Date(svc.at).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
   const label=document.createElement('span');label.className='service-name';label.textContent=serviceLabel(svc);
   const amount=document.createElement('span');amount.className='service-amount';
   const comm=commissionCents(svc,session);
   if(commissionsOn(session)&&COMMISSION_RATES[svc.type]){amount.innerHTML=`<span class="amount-gross">Bruto ${money(svc.amountCents)}</span><span class="amount-commission">Comisión −${money(comm)}</span><span class="amount-net">Neto ${money(netCents(svc,session))}</span>`;}
   else amount.textContent=money(svc.amountCents);
   row.append(time,label,amount);
   if(!session.closedAt){
     const edit=document.createElement('button');edit.type='button';edit.className='small-action';edit.textContent='✎';edit.title='Corregir importe bruto';edit.setAttribute('aria-label','Corregir importe de '+serviceLabel(svc));edit.addEventListener('click',()=>updateService(session.id,svc.id,'edit'));
     const del=document.createElement('button');del.type='button';del.className='small-action';del.textContent='✕';del.title='Eliminar servicio';del.setAttribute('aria-label','Eliminar importe de '+serviceLabel(svc));del.addEventListener('click',()=>updateService(session.id,svc.id,'delete'));row.append(edit,del);
   }
   div.append(row);
 }}
 hideModal('historyDialog');showModal('listDialog');
}

async function updateService(sessionId,serviceId,action){try{
  const session=await readOne(sessionId);if(!session||session.closedAt)return notify('Jornada ya cerrada');const ix=session.services.findIndex(x=>x.id===serviceId);if(ix<0)return;
  const svc=session.services[ix];
  if(action==='delete'){if(!confirm(`¿Eliminar ${serviceLabel(svc)} de ${money(svc.amountCents)}?`))return;session.services.splice(ix,1);}else{
    const proposed=prompt(`Nuevo importe de ${serviceLabel(svc)} (€):`,(svc.amountCents/100).toFixed(2).replace('.',','));if(proposed===null)return;
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
  if(driverOn(s))foot.textContent+=` · Ganancia chófer ${money(driverEarnings(s))}`;
  info.append(top,sum,foot);
  const actions=document.createElement('div');actions.className='history-actions';
  const view=document.createElement('button');view.type='button';view.textContent='Ver';view.addEventListener('click',()=>showList(s));
  const remove=document.createElement('button');remove.type='button';remove.className='danger-action';remove.textContent='Eliminar';remove.setAttribute('aria-label','Eliminar jornada del '+dateText(s.startedAt));remove.addEventListener('click',()=>deleteSession(s.id,'history'));
  actions.append(view,remove);row.append(info,actions);container.append(row);
 }
 if($('historyDialog').hidden)showModal('historyDialog');
}catch(e){markError(e);}}

function download(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function fileStem(s){const d=new Date(s.startedAt);const part=n=>String(n).padStart(2,'0');return `contabilidad-control-servicios-taxi-${d.getFullYear()}-${part(d.getMonth()+1)}-${part(d.getDate())}-${part(d.getHours())}${part(d.getMinutes())}`;}
function exportJSON(){if(!listSession)return;const s=listSession;const json={app:'Contabilidad y Control de Servicios Taxi',version:5,id:s.id,inicio:s.startedAt,cierre:s.closedAt,comisiones:{activadas:commissionsOn(s),imbricPorcentaje:12,joinUpPorcentaje:10},totalBrutoCentimos:totalCents(s),totalComisionCentimos:totalCommission(s),totalNetoCentimos:totalNet(s),totalContabilizadoCentimos:accountingTotal(s),criterioTotal:commissionsOn(s)?'neto':'bruto',conductor:{activado:driverOn(s),porcentaje:driverOn(s)?s.driverBasisPoints/100:null,seguroDiarioCentimos:driverOn(s)?driverInsurance(s):null,participacionCentimos:driverOn(s)?driverShare(s):null,gananciaCentimos:driverOn(s)?driverEarnings(s):null},totalBrutoEuros:(totalCents(s)/100).toFixed(2),totalComisionEuros:(totalCommission(s)/100).toFixed(2),totalNetoEuros:(totalNet(s)/100).toFixed(2),totalContabilizadoEuros:(accountingTotal(s)/100).toFixed(2),servicios:sortServices(s).map(x=>({id:x.id,etiqueta:serviceLabel(x),tipo:x.type,modalidadCobro:x.paymentMethod||null,fechaHora:x.at,importeBrutoCentimos:x.amountCents,comisionPorcentaje:commissionsOn(s)?(COMMISSION_RATES[x.type]||0):0,comisionCentimos:commissionCents(x,s),importeNetoCentimos:netCents(x,s),importeBrutoEuros:(x.amountCents/100).toFixed(2),comisionEuros:(commissionCents(x,s)/100).toFixed(2),importeNetoEuros:(netCents(x,s)/100).toFixed(2),...(x.editedAt?{corregidoEn:x.editedAt}:{})}))};download(new Blob([JSON.stringify(json,null,2)],{type:'application/json;charset=utf-8'}),fileStem(s)+'.json');notify('JSON preparado para descargar');}
// Small, self-contained PDF exporter: no network libraries and fully offline.
function pdfWinAnsi(s){const substitutions={'€':128,'–':150,'—':151,'‘':145,'’':146,'“':147,'”':148,'•':149};return [...String(s)].map(ch=>{const n=ch.codePointAt(0);if(n>=32&&n<=255&&n!==127&&n!==129&&n!==141&&n!==143&&n!==144&&n!==157)return n;return substitutions[ch]||63;});}
function pdfEscape(str){let out='';for(const n of pdfWinAnsi(str)){if(n===40||n===41||n===92)out+='\\'+String.fromCharCode(n);else if(n>=128)out+='\\'+n.toString(8).padStart(3,'0');else out+=String.fromCharCode(n);}return out;}
function pdfString(text,x,y,size=10,bold=false){return `BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfEscape(text)}) Tj ET\n`;}
function pdfSafeMoney(cents){return (cents/100).toFixed(2).replace('.',',')+' EUR';}

function createPDFPages(pages,filename){
 const objects=[null];function add(s){objects.push(s);return objects.length-1;}
 const catalog=add(''),root=add(''),f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');const refs=[];
 pages.forEach((page,i)=>{page+=pdfString(`Pagina ${i+1} de ${pages.length}`,470,35,9);const stream=add(`<< /Length ${page.length} >>\nstream\n${page}endstream`);refs.push(add(`<< /Type /Page /Parent ${root} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${stream} 0 R >>`));});
 objects[catalog]=`<< /Type /Catalog /Pages ${root} 0 R >>`;objects[root]=`<< /Type /Pages /Kids [${refs.map(n=>n+' 0 R').join(' ')}] /Count ${refs.length} >>`;
 let pdf='%PDF-1.4\n%Control de Servicios\n';const offsets=[0];for(let i=1;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+=`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
 download(new Blob([Uint8Array.from(pdf,ch=>ch.charCodeAt(0))],{type:'application/pdf'}),filename);notify('PDF preparado para descargar');
}
function pdfDriverPage(s){
 let content='0.075 0.13 0.22 rg 0 743 595 99 re f\n1 1 1 rg\n';
 content+=pdfString('CONTABILIDAD Y CONTROL DE SERVICIOS TAXI',42,798,15,true);
 content+=pdfString('INFORME DE GANANCIAS DEL CONDUCTOR',42,777,11,true);content+='0 0 0 rg\n';
 content+=pdfString('Inicio: '+dateText(s.startedAt),42,723,10);content+=pdfString(s.closedAt?'Cierre: '+dateText(s.closedAt):'Jornada en curso (parcial)',42,703,10);
 if(!driverOn(s))return content+pdfString('Ganancias del conductor no configuradas en esta jornada.',42,666,11,true);
 const lines=[['Servicios',String(s.services.length)],['Bruto taxi',pdfSafeMoney(totalCents(s))],['Comisiones plataformas','-'+pdfSafeMoney(totalCommission(s))],['Base para reparto',pdfSafeMoney(accountingTotal(s))],['Porcentaje chófer',percentLabel(s)],['Participacion del conductor',pdfSafeMoney(driverShare(s))],['Seguro diario','-'+pdfSafeMoney(driverInsurance(s))],['GANANCIA FINAL',pdfSafeMoney(driverEarnings(s))]];
 let y=664;for(const [a,b] of lines){content+=pdfString(a,42,y,11,a==='GANANCIA FINAL')+pdfString(b,365,y,11,a==='GANANCIA FINAL');y-=38;}
 content+=pdfString('Importe estimado según los datos anotados; no sustituye una nómina.',42,300,9);
 return content;
}

function exportPDF(customFilename){
 if(!listSession)return;
 const s=listSession, services=sortServices(s), discounts=commissionsOn(s);
 const pdfType=$('pdfType').value;
 if(pdfType==='driver'){
   if(!driverOn(s)){notify('Esta jornada no tiene ganancias del conductor configuradas');return;}
   createPDFPages([pdfDriverPage(s)],customFilename||fileStem(s)+'-conductor.pdf');return;
 }
 const capacity=26, chunks=[];
 for(let i=0;i<services.length;i+=capacity)chunks.push(services.slice(i,i+capacity));
 if(!chunks.length)chunks.push([]);
 const pages=[];
 for(let page=0;page<chunks.length;page++){
   let content='0.075 0.13 0.22 rg 0 747 595 95 re f\n1 1 1 rg\n';
   content+=pdfString('CONTABILIDAD Y CONTROL DE SERVICIOS TAXI',42,800,15,true);
   content+=pdfString(`Inicio: ${dateText(s.startedAt)}`,42,779,10);
   content+=pdfString(s.closedAt?`Cierre: ${dateText(s.closedAt)}`:'Jornada abierta (parcial)',300,779,10);
   content+='0 0 0 rg\n';
   content+=pdfString(`Comisiones Imbric 12% / Join Up 10%: ${discounts?'ACTIVADAS':'DESACTIVADAS'}`,42,734,9);
   content+=pdfString(`TOTAL CONTABILIZADO (${discounts?'NETO':'BRUTO'}): ${pdfSafeMoney(accountingTotal(s))}`,42,752,11,true);
   content+=pdfString('Fecha y hora',42,712,9,true)+pdfString('Servicio',163,712,9,true);
   if(discounts){content+=pdfString('Bruto',372,712,9,true)+pdfString('Comision',438,712,9,true)+pdfString('Neto',515,712,9,true);}
   else content+=pdfString('Importe',475,712,9,true);
   content+='0.8 0.85 0.9 RG 42 702 m 551 702 l S\n';
   for(let i=0;i<chunks[page].length;i++){
     const item=chunks[page][i], y=681-i*18;
     if(i%2===1)content+='0.96 0.97 0.98 rg 40 '+(y-5)+' 515 18 re f 0 0 0 rg\n';
     content+=pdfString(dateText(item.at),42,y,8)+pdfString(serviceLabel(item),163,y,9);
     if(discounts){
       content+=pdfString(pdfSafeMoney(item.amountCents),364,y,8);
       content+=pdfString(commissionCents(item,s)?'-'+pdfSafeMoney(commissionCents(item,s)):'-',429,y,8);
       content+=pdfString(pdfSafeMoney(netCents(item,s)),501,y,8);
     }else content+=pdfString(pdfSafeMoney(item.amountCents),466,y,9);
   }
   if(page===chunks.length-1){
     let y=681-chunks[page].length*18-24;if(y<102)y=102;
     content+='0.8 0.85 0.9 RG 42 '+(y+13)+' m 551 '+(y+13)+' l S\n';
     content+=pdfString(`${services.length} servicios registrados`,42,y,10);
     content+=pdfString(`TOTAL ${discounts?'NETO':'BRUTO'}: ${pdfSafeMoney(accountingTotal(s))}`,315,y,12,true);
     if(discounts){content+=pdfString(`Bruto: ${pdfSafeMoney(totalCents(s))}`,315,y-19,10);content+=pdfString(`Comisiones: -${pdfSafeMoney(totalCommission(s))}`,315,y-38,10);}
   }
   content+=pdfString(`Pagina ${page+1} de ${chunks.length}`,475,35,9);
   pages.push(content);
 }
 if(pdfType==='both')pages.push(pdfDriverPage(s));
 let objects=[null];function add(s){objects.push(s);return objects.length-1;}
 const catalog=add(''),pagesRoot=add(''),font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');let pageRefs=[];
 for(const content of pages){const stream=add(`<< /Length ${content.length} >>\nstream\n${content}endstream`);const pageObj=add(`<< /Type /Page /Parent ${pagesRoot} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${stream} 0 R >>`);pageRefs.push(pageObj);}
 objects[catalog]=`<< /Type /Catalog /Pages ${pagesRoot} 0 R >>`;objects[pagesRoot]=`<< /Type /Pages /Kids [${pageRefs.map(n=>n+' 0 R').join(' ')}] /Count ${pageRefs.length} >>`;
 let pdf='%PDF-1.4\n%Control de Servicios\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+=`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
 const bytes=Uint8Array.from(pdf,ch=>ch.charCodeAt(0));download(new Blob([bytes],{type:'application/pdf'}),customFilename||fileStem(s)+'.pdf');notify('PDF preparado para descargar');
}


// Resumen mensual: agrupar exclusivamente por la fecha LOCAL de inicio de cada jornada.
function monthKey(iso){const d=new Date(iso);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function thisMonth(){return monthKey(new Date().toISOString());}
function sumBy(xs,fn){return xs.reduce((n,x)=>n+fn(x),0);}
function monthAccounting(sessions){
  const rows=TYPES.map(t=>({id:t.id,label:t.name,count:0,gross:0,commission:0,total:0}));
  for(const s of sessions)for(const svc of s.services){const r=rows.find(x=>x.id===svc.type);if(!r)continue;r.count++;r.gross+=svc.amountCents;r.commission+=commissionCents(svc,s);r.total+=accountingValue(svc,s);}
  const gross=sumBy(sessions,totalCents),commission=sumBy(sessions,totalCommission),total=sumBy(sessions,accountingTotal),count=sumBy(sessions,s=>s.services.length);
  const driverSessions=sessions.filter(driverOn),driverParticipation=sumBy(driverSessions,driverShare),insurance=sumBy(driverSessions,driverInsurance),driverTotal=sumBy(driverSessions,driverEarnings);
  return {sessions,rows:rows.filter(r=>r.count),gross,commission,total,count,driverSessions,driverParticipation,insurance,driverTotal,averageService:count?Math.round(total/count):0,averageSession:sessions.length?Math.round(total/sessions.length):0};
}
function td(text){const cell=document.createElement('td');cell.textContent=text;return cell;}
async function refreshMonth(){
  const key=$('monthPicker').value;
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)){$('monthPdfBtn').disabled=true;return;}
  const sessions=(await readAll()).filter(s=>monthKey(s.startedAt)===key).sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
  monthSnapshot={key,...monthAccounting(sessions)};
  $('monthlyEmpty').hidden=!!sessions.length;$('monthlyContent').hidden=!sessions.length;$('monthPdfBtn').disabled=!sessions.length;
  if(!sessions.length)return;
  const m=monthSnapshot;
  $('monthTotal').textContent=money(m.total);$('monthServices').textContent=String(m.count);
  $('monthMeanService').textContent=money(m.averageService);$('monthSessions').textContent=String(sessions.length);
  $('monthMeanSession').textContent=money(m.averageSession);$('monthCommission').textContent=money(m.commission);
  $('monthDriver').hidden=!m.driverSessions.length;
  if(m.driverSessions.length){const d=$('monthDriver');d.replaceChildren();const h=document.createElement('h3');h.textContent='Ganancias del conductor';d.append(h);
    for(const [a,b] of [['Jornadas con porcentaje configurado',String(m.driverSessions.length)+' / '+String(m.sessions.length)],['Participación acumulada',money(m.driverParticipation)],['Seguros descontados','−'+money(m.insurance)],['GANANCIA DEL MES',money(m.driverTotal)]]){const el=document.createElement('div');el.className='driver-line'+(a==='GANANCIA DEL MES'?' driver-final':'');const k=document.createElement('span');k.textContent=a;const v=document.createElement('strong');v.textContent=b;el.append(k,v);d.append(el);}}
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
async function showMonthly(){try{$('monthPicker').value=thisMonth();await refreshMonth();showModal('monthlyDialog');}catch(e){markError(e);}}
function monthlyPdf(customFilename){
  const m=monthSnapshot;if(!m||!m.sessions.length){notify('No hay jornadas para exportar');return;}
  const [year,month]=m.key.split('-').map(Number);
  const monthName=new Date(year,month-1,1).toLocaleDateString('es-ES',{month:'long',year:'numeric'}).toUpperCase();
  const pdfType=$('monthPdfType').value;
  if(pdfType==='driver'&&!m.driverSessions.length){notify('No hay jornadas con ganancias configuradas en este mes');return;}
  const lines=[
    {header:'JORNADAS',cols:['Fecha inicio','Serv.','Bruto','Comision','Contabilizado','Media']},
    ...m.sessions.map(s=>({cols:[dateText(s.startedAt)+(s.closedAt?'':' *'),String(s.services.length),pdfSafeMoney(totalCents(s)),pdfSafeMoney(totalCommission(s)),pdfSafeMoney(accountingTotal(s)),pdfSafeMoney(s.services.length?Math.round(accountingTotal(s)/s.services.length):0)]})),
    {header:'PLATAFORMAS',cols:['Plataforma','Serv.','Bruto','Comision','Contabilizado','Media']},
    ...m.rows.map(r=>({cols:[r.label,String(r.count),pdfSafeMoney(r.gross),pdfSafeMoney(r.commission),pdfSafeMoney(r.total),pdfSafeMoney(Math.round(r.total/r.count))]})),
    {header:'MEDIAS Y CRITERIO',cols:[]},
    {note:`Media por servicio: ${pdfSafeMoney(m.averageService)} / Media por jornada: ${pdfSafeMoney(m.averageSession)}`},
    {note:'Se contabiliza el neto si la jornada tenia comisiones activadas; si no, el bruto.'},
    {note:'Las jornadas marcadas con * siguen abiertas al generar este informe.'}
  ];
  const driverLines=[
    {header:'GANANCIAS DEL CONDUCTOR',cols:['Jornada','%','Base','Participacion','Seguro','Ganancia']},
    ...m.driverSessions.map(s=>({cols:[dateText(s.startedAt),percentLabel(s),pdfSafeMoney(accountingTotal(s)),pdfSafeMoney(driverShare(s)),pdfSafeMoney(driverInsurance(s)),pdfSafeMoney(driverEarnings(s))]})),
    {header:'RESUMEN DE GANANCIAS',cols:[]},
    {note:`Jornadas configuradas: ${m.driverSessions.length} de ${m.sessions.length}`},
    {note:`Participacion del conductor: ${pdfSafeMoney(m.driverParticipation)} / Seguro: ${pdfSafeMoney(m.insurance)}`},
    {note:`GANANCIA FINAL DEL MES: ${pdfSafeMoney(m.driverTotal)}`},
    {note:'Los seguros se descuentan una vez por jornada configurada.'},
    {note:'Las jornadas antiguas sin porcentaje configurado no se incluyen en las ganancias.'}
  ];
  if(pdfType==='driver')lines.splice(0,lines.length,...driverLines);
  else if(pdfType==='both')lines.push(...driverLines);
  const pages=[];let content='',y=0,pageNo=0;
  function newPage(){if(content)pages.push(content);pageNo++;content='0.075 0.13 0.22 rg 0 741 595 101 re f\n1 1 1 rg\n';content+=pdfString('CONTABILIDAD Y CONTROL DE SERVICIOS TAXI',38,800,15,true);content+=pdfString(`RESUMEN MENSUAL: ${monthName}`,38,776,12,true);content+='0 0 0 rg\n';if(pageNo===1){content+=pdfString(`Jornadas: ${m.sessions.length}   Servicios: ${m.count}`,38,726,10);content+=pdfString(`Bruto: ${pdfSafeMoney(m.gross)}   Comisiones: ${pdfSafeMoney(m.commission)}`,38,709,10);content+=pdfString(pdfType==='driver'?`GANANCIA CONDUCTOR: ${pdfSafeMoney(m.driverTotal)}`:`TOTAL CONTABILIZADO: ${pdfSafeMoney(m.total)}`,38,687,13,true);y=652;}else y=710;}
  newPage();
  for(const line of lines){if(y<85)newPage();if(line.header){content+='0.90 0.94 0.98 rg 35 '+(y-7)+' 525 23 re f 0 0 0 rg\n';content+=pdfString(line.header,40,y,10,true);y-=26;if(line.cols.length){const xs=[40,183,242,310,388,507];line.cols.forEach((x,i)=>content+=pdfString(x,xs[i],y,7.5,true));y-=23;}}else if(line.note){content+=pdfString(line.note,40,y,8);y-=18;}else{const xs=[40,183,242,310,388,507];line.cols.forEach((x,i)=>content+=pdfString(x,xs[i],y,7.5));y-=17;}}
  pages.push(content);
  const objects=[null];function add(s){objects.push(s);return objects.length-1;}
  const catalog=add(''),root=add(''),f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');const refs=[];
  pages.forEach((page,i)=>{page+=pdfString(`Pagina ${i+1} de ${pages.length}`,480,36,9);const stream=add(`<< /Length ${page.length} >>\nstream\n${page}endstream`);refs.push(add(`<< /Type /Page /Parent ${root} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${stream} 0 R >>`));});
  objects[catalog]=`<< /Type /Catalog /Pages ${root} 0 R >>`;objects[root]=`<< /Type /Pages /Kids [${refs.map(n=>n+' 0 R').join(' ')}] /Count ${refs.length} >>`;
  let pdf='%PDF-1.4\n%Control de Servicios\n';const offsets=[0];for(let i=1;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+=`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  download(new Blob([Uint8Array.from(pdf,ch=>ch.charCodeAt(0))],{type:'application/pdf'}),customFilename||`contabilidad-control-servicios-taxi-resumen-${m.key}-${pdfType}.pdf`);notify('PDF mensual preparado para descargar');
}

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
 const basis=kind==='monthly'?`mensual-${monthSnapshot.key}`:`jornada-${monthKey(listSession.startedAt)}`;
 const labels={taxi:'facturacion',driver:'ganancias-conductor',both:'informe-completo'};
 $('filenameInput').value=`Contabilidad_Control_Servicios_Taxi_${basis}_${labels[pdfType]}_${downloadTimestamp()}`;
 pendingPdfExport=kind;
 $('filenameDialog').hidden=false;
 document.body.style.overflow='hidden';
 $('filenameInput').focus();$('filenameInput').select();
}
function closeFilenameDialog(){pendingPdfExport=null;$('filenameDialog').hidden=true;if(['startDialog','entryDialog','listDialog','historyDialog','monthlyDialog','instructionsDialog'].every(k=>$(k).hidden))document.body.style.overflow='';}
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
  $('driverToggle').addEventListener('change',e=>{$('driverConfigFields').hidden=!e.target.checked;});
  $('pdfType').addEventListener('change',()=>{if(listSession&&$('pdfType').value==='driver'&&!driverOn(listSession))notify('Sin ganancias configuradas en esta jornada');});
  $('amount').addEventListener('input',updateCommissionPreview);
  $('closeBtn').addEventListener('click',()=>closeSession());
  $('entryForm').addEventListener('submit',addService);
  $('partialsBtn').addEventListener('click',async()=>{try{const s=await readOne(active.id);active=s;render();showList(s);}catch(e){markError(e);}});
  $('historyBtn').addEventListener('click',showHistory);
  $('monthlyBtn').addEventListener('click',showMonthly);
  $('instructionsBtn').addEventListener('click',()=>showModal('instructionsDialog'));
  $('monthPicker').addEventListener('change',()=>refreshMonth().catch(markError));
  $('currentMonthBtn').addEventListener('click',()=>{$('monthPicker').value=thisMonth();refreshMonth().catch(markError);});
  $('monthPdfBtn').addEventListener('click',()=>askPdfFilename('monthly'));
  $('jsonBtn').addEventListener('click',exportJSON);$('pdfBtn').addEventListener('click',()=>askPdfFilename('daily'));
  $('filenameForm').addEventListener('submit',confirmPdfFilename);
  document.querySelectorAll('[data-dismiss=filename]').forEach(b=>b.addEventListener('click',closeFilenameDialog));
  document.querySelectorAll('[data-dismiss]').forEach(b=>b.addEventListener('click',()=>hideModal(b.dataset.dismiss+'Dialog')));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const d of ['startDialog','entryDialog','listDialog','historyDialog','monthlyDialog','instructionsDialog'])if(!$(d).hidden)hideModal(d);if(!$('filenameDialog').hidden)closeFilenameDialog();});
  $('themeBtn').addEventListener('click',()=>{const next=!document.body.classList.contains('light');document.body.classList.toggle('light',next);localStorage.setItem('taxi-theme',next?'light':'dark');$('themeBtn').textContent=next?'🌙':'☀️';});
  try{const light=localStorage.getItem('taxi-theme')==='light';document.body.classList.toggle('light',light);$('themeBtn').textContent=light?'🌙':'☀️';}catch(e){console.warn('Preferencia de tema no disponible',e);}
  setInterval(()=>{$('clock').textContent=new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});},500);
  $('clock').textContent=timeText(new Date().toISOString());
  document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='visible'&&db){try{const all=await readAll();active=all.find(x=>!x.closedAt)||null;render();}catch(e){markError(e);}}});
}
async function init(){buildCategories();attach();try{db=await openDB();const all=await readAll();active=all.find(x=>!x.closedAt)||null;render();}catch(e){console.error(e);$('inactiveHint').textContent='No se puede acceder al almacenamiento local. Comprueba los permisos del navegador y vuelve a cargar.';$('startBtn').disabled=true;notify('Error al abrir el almacenamiento local.');}
  if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Sin servicio offline:',e));
}
init();
