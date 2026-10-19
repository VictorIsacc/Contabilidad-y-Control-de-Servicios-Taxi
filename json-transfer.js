'use strict';
// Formato compartido por Android y PWA. Los totales se recalculan de los datos originales.
(function(){
 const LIMIT=20*1024*1024, APP='Contabilidad y Control de Servicios Taxi';
 let preview=null,busy=false;
 const fail=message=>{throw new Error(message);};
 const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const integer=(x,max,label)=>{if(!Number.isSafeInteger(x)||x<0||x>max)fail(label+' no válido.');return x;};
 const id=x=>{if(typeof x!=='string'||!x.trim()||x.length>200||/[\x00-\x1f]/.test(x))fail('Identificador no válido.');return x;};
 function stamp(x){
  if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(x)||!Number.isFinite(Date.parse(x)))fail('Fecha no válida.');
  if(Number(x.slice(11,13))>23||Number(x.slice(14,16))>59||Number(x.slice(17,19))>59)fail('Hora no válida.');
  const day=x.slice(0,10),d=new Date(day+'T00:00:00Z');if(d.toISOString().slice(0,10)!==day)fail('Día no válido.');
  return new Date(x).toISOString();
 }
 function bool(x,label){if(x===undefined)return false;if(typeof x!=='boolean')fail(label+' no válido.');return x;}
 function rates(r){if(!r)return;if(!obj(r))fail('Comisiones no válidas.');for(const [key,expected] of [['imbricPorcentaje',12],['joinUpPorcentaje',10],['imbric',12],['joinup',10]])if(r[key]!==undefined&&r[key]!==expected)fail('El archivo usa comisiones de plataforma incompatibles.');}
 function normalize(raw){
  if(!obj(raw))fail('Jornada no válida.');if(raw.schemaVersion!==undefined)integer(raw.schemaVersion,4,'Versión de jornada');
  const spanish=Object.hasOwn(raw,'servicios');rates(raw.comisiones);
  const driver=spanish?raw.conductor:raw;
  if(spanish&&driver!==undefined&&!obj(driver))fail('Configuración del conductor no válida.');
  const enabled=bool(spanish?driver?.activado:raw.driverEnabled,'Activación del conductor');
  let bp=spanish?(driver?.porcentaje==null?0:Math.round(driver.porcentaje*100)):(raw.driverBasisPoints??0);
  if(spanish&&driver?.porcentaje!=null&&(typeof driver.porcentaje!=='number'||Math.abs(driver.porcentaje*100-bp)>0.000001))fail('Porcentaje no válido.');
  const insurance=spanish?(driver?.seguroDiarioCentimos??0):(raw.dailyInsuranceCents??0);
  if(enabled&&((spanish&&(driver.porcentaje==null||driver.seguroDiarioCentimos==null))||(!spanish&&(raw.driverBasisPoints==null||raw.dailyInsuranceCents==null))))fail('Falta el porcentaje o el seguro del conductor.');
  const s={schemaVersion:4,insuranceEnabled:raw.insuranceEnabled===undefined?true:bool(raw.insuranceEnabled,'Descuento del seguro'),centralCashByDriver:bool(raw.centralCashByDriver,'Cobro de abonados por el chófer'),id:id(raw.id),startedAt:stamp(spanish?raw.inicio:raw.startedAt),closedAt:null,commissionEnabled:bool(spanish?raw.comisiones?.activadas:raw.commissionEnabled,'Activación de comisiones'),driverEnabled:enabled,driverBasisPoints:integer(bp,10000,'Porcentaje'),dailyInsuranceCents:integer(insurance,999999999,'Seguro diario'),services:[]};
  const end=spanish?raw.cierre:raw.closedAt;if(end!=null)s.closedAt=stamp(end);if(s.closedAt&&s.closedAt<s.startedAt)fail('Cierre anterior al inicio.');
  const services=spanish?raw.servicios:raw.services;if(!Array.isArray(services)||services.length>100000)fail('Lista de servicios no válida.');
  const ids=new Set();for(const v of services){
   if(!obj(v))fail('Servicio no válido.');const type=spanish?v.tipo:v.type;if(!TYPES.some(t=>t.id===type))fail('Plataforma desconocida.');
   const method=(spanish?v.modalidadCobro:v.paymentMethod)??null;
   if(method!==null&&!(METHODS[type]||[]).includes(method))fail('Modalidad de cobro no válida.');
   const x={id:id(v.id),type,paymentMethod:method,amountCents:integer(spanish?(v.importeBrutoCentimos??v.importeCentimos):v.amountCents,999999999,'Importe bruto'),at:stamp(spanish?v.fechaHora:v.at)};
   const edited=spanish?v.corregidoEn:v.editedAt;if(edited!=null)x.editedAt=stamp(edited);if(ids.has(x.id))fail('Un servicio está repetido dentro de una jornada.');ids.add(x.id);s.services.push(x);
  }
  s.services.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));return s;
 }
 function preferences(value){
  if(!obj(value))fail('Preferencias no válidas.');const result={};
  if(Object.hasOwn(value,'conductor')){const c=value.conductor;result.conductor=c===null?null:{driverBasisPoints:integer(c?.driverBasisPoints,10000,'Porcentaje fijado'),dailyInsuranceCents:integer(c?.dailyInsuranceCents,999999999,'Seguro fijado')};}
  if(Object.hasOwn(value,'tema')){if(!['dark','light',null].includes(value.tema))fail('Tema no válido.');result.tema=value.tema;}
  return result;
 }
 function parse(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>LIMIT)fail('El archivo supera 20 MB.');
  let data;try{data=JSON.parse(text.replace(/^\uFEFF/,''));}catch(e){fail('El archivo no contiene un JSON válido.');}
  if(!obj(data)&&!Array.isArray(data))fail('Formato JSON no reconocido.');
  if(data.app!==undefined&&data.app!==APP)fail('La copia pertenece a otra aplicación.');
  if(data.version!==undefined)integer(data.version,8,'Versión de copia');rates(data.comisionesPlataformas);
  const source=Array.isArray(data)?data:(data.jornadas??data.sessions??(data.id?[data]:null));
  if(!Array.isArray(source)||source.length>10000)fail('No se encuentra una lista válida de jornadas (máximo 10.000).');
  if(source.length===0&&data.tipo!=='copia-completa')fail('El archivo no contiene jornadas.');
  let n=0;const unique=new Map();for(const raw of source){const s=normalize(raw);n+=s.services.length;if(n>100000)fail('La copia supera 100.000 servicios.');if(unique.has(s.id)&&JSON.stringify(unique.get(s.id))!==JSON.stringify(s))fail('Hay dos versiones distintas de la misma jornada en el archivo.');unique.set(s.id,s);}
  return {sessions:[...unique.values()],prefs:data.tipo==='copia-completa'&&data.preferencias!==undefined?preferences(data.preferencias):null};
 }
 const signature=sessions=>JSON.stringify([...sessions].sort((a,b)=>a.id.localeCompare(b.id)));
 const prefSnapshot=()=>JSON.stringify([localStorage.getItem(DRIVER_DEFAULTS_KEY),localStorage.getItem('taxi-theme')]);
 function plan(imported,existing,replace){
  const map=new Map(existing.map(s=>[s.id,s])),added=[],changed=[],same=[],kept=[];
  for(const s of imported){const old=map.get(s.id);if(!old){added.push(s);map.set(s.id,s);}else if(JSON.stringify(normalize(old))===JSON.stringify(s))same.push(s);else if(replace){changed.push(s);map.set(s.id,s);}else kept.push(s);}
  if([...map.values()].filter(s=>!s.closedAt).length>1)fail('Quedarían dos jornadas abiertas. Cierra la jornada actual antes de cargar esta copia, o revisa las jornadas en conflicto.');
  return {writes:[...added,...changed],added,changed,same,kept,result:[...map.values()]};
 }
 function monthly(sessions){
  const groups=new Map();for(const s of sessions){const k=monthKey(s.startedAt);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s);}
  return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([mes,items])=>({mes,jornadas:items.length,servicios:items.reduce((n,s)=>n+s.services.length,0),totalBrutoCentimos:items.reduce((n,s)=>n+totalCents(s),0),comisionesCentimos:items.reduce((n,s)=>n+totalCommission(s),0),totalContabilizadoCentimos:items.reduce((n,s)=>n+accountingTotal(s),0),participacionConductorCentimos:items.reduce((n,s)=>n+driverShare(s),0),jornadasConSeguro:items.filter(s=>driverInsurance(s)>0).length,seguroConductorCentimos:items.reduce((n,s)=>n+driverInsurance(s),0),gananciaConductorCentimos:items.filter(driverOn).reduce((n,s)=>n+driverEarnings(s),0),jornadasConPorcentaje:items.filter(driverOn).length,liquidacion:settlementJSON(periodSettlement(items))}));
 }
 async function exportFull(){
  try{if(!db)fail('Espera a que se abra el almacenamiento.');const sessions=await readAll();const conductor=preferences({conductor:JSON.parse(localStorage.getItem(DRIVER_DEFAULTS_KEY)||'null')}).conductor;
   const copy={app:APP,version:8,appVersion:'1.10.0',tipo:'copia-completa',exportadoEn:new Date().toISOString(),comisionesPlataformas:{imbric:12,joinup:10},preferencias:{conductor,tema:localStorage.getItem('taxi-theme')},jornadas:sessions,resumenesMensuales:monthly(sessions),criterio:'Los resúmenes se recalculan de las jornadas, servicios y ajustes originales. Mes según la fecha local de inicio de cada jornada.'};
   const json=JSON.stringify(copy,null,2);if(new TextEncoder().encode(json).length>LIMIT)fail('La copia supera 20 MB. Exporta los meses por separado desde Resumen mensual.');
   download(new Blob([json],{type:'application/json;charset=utf-8'}),'Taxi-copia-completa-'+downloadTimestamp()+'.json');notify('Copia completa preparada. Comprueba que se ha guardado.');
  }catch(e){$('transferStatus').textContent='No se pudo crear la copia: '+e.message;notify('No se pudo crear la copia completa.');}
 }
 function status(message){$('transferStatus').textContent=message;}
 function clearPreview(){preview=null;$('transferPreview').hidden=true;$('transferApply').disabled=true;$('transferMonths').replaceChildren();}
 function refreshPreview(){
  if(!preview)return;try{
   const p=plan(preview.sessions,preview.existing,$('transferReplace').checked);
   $('transferCounts').textContent=p.added.length+' nuevas · '+p.same.length+' idénticas · '+p.kept.length+' distintas que se conservan · '+p.changed.length+' que se sustituyen.';
   $('transferApply').disabled=!p.writes.length&&!($('transferPrefs').checked&&preview.prefs&&Object.keys(preview.prefs).length);
   status('Revisa los datos y pulsa Cargar datos para confirmar. Las demás jornadas se conservan.');
  }catch(e){$('transferApply').disabled=true;status(e.message);}
 }
 async function selectText(text,name){
  clearPreview();try{
   if(!db)fail('Espera a que se abra el almacenamiento.');const parsed=parse(text),existing=await readAll();
   preview={...parsed,existing,fingerprint:signature(existing),prefFingerprint:prefSnapshot()};
   $('transferFileName').textContent=name||'Archivo JSON';$('transferReplace').checked=false;
   $('transferPrefsRow').hidden=!parsed.prefs||!Object.keys(parsed.prefs).length;$('transferPrefs').checked=!!parsed.prefs;
   $('transferPreferences').textContent=parsed.prefs?('Ajustes de la copia: '+(Object.hasOwn(parsed.prefs,'conductor')?(parsed.prefs.conductor?'conductor '+(parsed.prefs.conductor.driverBasisPoints/100)+' %, seguro '+money(parsed.prefs.conductor.dailyInsuranceCents):'sin porcentaje ni seguro fijados'):'porcentaje fijado actual sin cambios')+(Object.hasOwn(parsed.prefs,'tema')?' · tema '+(parsed.prefs.tema==='light'?'claro':parsed.prefs.tema==='dark'?'oscuro':'predeterminado'):'')):'Este archivo no contiene ajustes generales; se conservarán los actuales. Cada jornada mantiene su porcentaje, seguro y comisiones.';
   for(const m of monthly(parsed.sessions)){const card=document.createElement('p');card.className='transfer-month';card.textContent=m.mes+' · '+m.jornadas+' jornadas · '+m.servicios+' servicios\nBruto '+money(m.totalBrutoCentimos)+' · Comisiones '+money(m.comisionesCentimos)+' · Total '+money(m.totalContabilizadoCentimos);$('transferMonths').append(card);}
   $('transferSummary').textContent=parsed.sessions.length+' jornadas y '+parsed.sessions.reduce((n,s)=>n+s.services.length,0)+' servicios en el archivo. '+parsed.sessions.filter(centralCash).length+' jornadas con abonados cobrados en efectivo por el chófer.';
   const previous=new Map(existing.map(s=>[s.id,s]));const conflicts=parsed.sessions.filter(s=>previous.has(s.id)&&JSON.stringify(normalize(previous.get(s.id)))!==JSON.stringify(s));
   $('transferConflicts').textContent=conflicts.length?'Jornadas distintas ya guardadas: '+conflicts.slice(0,30).map(s=>dateText(s.startedAt)).join(' · ')+(conflicts.length>30?' …':''):'';
   $('transferReplaceRow').hidden=!conflicts.length;$('transferPreview').hidden=false;refreshPreview();
  }catch(e){clearPreview();status('No se ha cargado ningún dato: '+e.message);}
 }
 function atomicImport(p,replace,restore){
  return new Promise((resolve,reject)=>{
   const tx=db.transaction('sessions','readwrite'),store=tx.objectStore('sessions');let problem=null,oldPrefs=null,prefsTouched=false,result;
   const request=store.getAll();request.onsuccess=()=>{try{
    if(signature(request.result)!==p.fingerprint||prefSnapshot()!==p.prefFingerprint)fail('Los datos han cambiado desde la vista previa. Selecciona de nuevo el archivo.');
    result=plan(p.sessions,request.result,replace);
    if(restore&&p.prefs){oldPrefs=[localStorage.getItem(DRIVER_DEFAULTS_KEY),localStorage.getItem('taxi-theme')];prefsTouched=true;
     if(Object.hasOwn(p.prefs,'conductor'))p.prefs.conductor===null?localStorage.removeItem(DRIVER_DEFAULTS_KEY):localStorage.setItem(DRIVER_DEFAULTS_KEY,JSON.stringify(p.prefs.conductor));
     if(Object.hasOwn(p.prefs,'tema'))p.prefs.tema===null?localStorage.removeItem('taxi-theme'):localStorage.setItem('taxi-theme',p.prefs.tema);
    }
    for(const s of result.writes)store.put(s);
   }catch(e){problem=e;tx.abort();}};
   tx.oncomplete=()=>resolve(result);tx.onerror=()=>{};
   tx.onabort=()=>{if(prefsTouched)try{for(const [i,key] of [DRIVER_DEFAULTS_KEY,'taxi-theme'].entries())oldPrefs[i]===null?localStorage.removeItem(key):localStorage.setItem(key,oldPrefs[i]);}catch(e){problem=new Error('La carga se canceló. Revisa los ajustes de tema, porcentaje y seguro.');}reject(problem||tx.error||new Error('Carga cancelada. No se han guardado jornadas.'));};
  });
 }
 async function apply(){
  if(!preview||busy)return;busy=true;$('transferApply').disabled=true;$('transferChoose').disabled=true;$('transferExport').disabled=true;
  try{const result=await atomicImport(preview,$('transferReplace').checked,$('transferPrefs').checked);active=result.result.find(s=>!s.closedAt)||null;listSession=null;monthSnapshot=null;render();
   const light=localStorage.getItem('taxi-theme')==='light';document.body.classList.toggle('light',light);$('themeBtn').textContent=light?'🌙':'☀️';
   clearPreview();status('Datos cargados: '+result.added.length+' jornadas nuevas y '+result.changed.length+' sustituidas. Los totales del mes, las comisiones y la liquidación ya están disponibles en Parciales, Historial y Resumen mensual.');notify('Datos cargados correctamente.');
  }catch(e){clearPreview();status('No se han cargado jornadas: '+e.message);}finally{busy=false;$('transferChoose').disabled=false;$('transferExport').disabled=false;}
 }
 function openTransfer(){if(!db){notify('Espera a que se abra el almacenamiento.');return;}for(const modal of ['instructionsDialog','installDialog'])if($(modal)&&!$(modal).hidden)hideModal(modal);showModal('transferDialog');}
 $('dataTransferBtn').addEventListener('click',openTransfer);
 $('transferExport').addEventListener('click',exportFull);
 $('transferChoose').addEventListener('click',()=>{if(busy)return;if(window.AndroidFiles?.pickJSON)window.AndroidFiles.pickJSON();else{$('transferFile').value='';$('transferFile').click();}});
 $('transferFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>LIMIT){clearPreview();status('El archivo supera 20 MB.');return;}try{await selectText(new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()),file.name);}catch(error){clearPreview();status('No se pudo leer el archivo. Debe ser un JSON con codificación UTF-8.');}});
 window.addEventListener('taxi-json-selected',event=>{if(busy)return;openTransfer();if(event.detail?.error){clearPreview();status(event.detail.error);}else selectText(event.detail?.text,event.detail?.name);});
 $('transferReplace').addEventListener('change',refreshPreview);$('transferPrefs').addEventListener('change',refreshPreview);$('transferApply').addEventListener('click',apply);
 window.TaxiTransfer=Object.freeze({exportFull});
 const list=$('serviceList'),up=$('servicesUp'),down=$('servicesDown');
 function arrows(){up.disabled=list.scrollTop<2;down.disabled=list.scrollTop+list.clientHeight>=list.scrollHeight-2;}
 up.addEventListener('click',()=>list.scrollBy({top:-Math.max(120,list.clientHeight*.75),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
 down.addEventListener('click',()=>list.scrollBy({top:Math.max(120,list.clientHeight*.75),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
 list.addEventListener('scroll',arrows,{passive:true});new ResizeObserver(arrows).observe(list);new MutationObserver(()=>{list.scrollTop=0;requestAnimationFrame(arrows);}).observe(list,{childList:true});
})();
