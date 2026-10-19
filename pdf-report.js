// Informes A4 vectoriales, con recursos locales y sin dependencias de red.
const PDF_COLORS={navy:'#14283f',ink:'#1c3046',muted:'#61778a',paper:'#f4f7fb',line:'#dce5ee',white:'#ffffff',green:'#08765e',greenLight:'#e2f5ef',blue:'#215ab5',blueLight:'#e9f0ff',purple:'#6b3db5',purpleLight:'#f0e9fc',amber:'#995208',amberLight:'#fff0d6'};
const PDF_PLATFORM_COLORS={pidetaxi:'#cf3650',imbric:'#237ea3',joinup:'#008b86',abonado:'#344d93',uber:'#273242',freenow:'#c33c65',concertado:'#c14b40'};
function pdfWinAnsi(s){const substitutions={'€':128,'–':150,'—':151,'‘':145,'’':146,'“':147,'”':148,'•':149};return [...String(s)].map(ch=>{const n=ch.codePointAt(0);if(n>=32&&n<=255&&n!==127&&n!==129&&n!==141&&n!==143&&n!==144&&n!==157)return n;return substitutions[ch]||63;});}
function pdfEscape(s){let out='';for(const n of pdfWinAnsi(s)){if(n===40||n===41||n===92)out+='\\'+String.fromCharCode(n);else if(n>=128)out+='\\'+n.toString(8).padStart(3,'0');else out+=String.fromCharCode(n);}return out;}
function pdfString(text,x,y,size=10,bold=false){return `BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfEscape(text)}) Tj ET\n`;}
function pdfSafeMoney(cents){return (cents/100).toFixed(2).replace('.',',')+' EUR';}
function pdfRGB(hex){return [1,3,5].map(i=>(parseInt(hex.slice(i,i+2),16)/255).toFixed(3)).join(' ');}
function pdfWidth(text,size,bold=false){return pdfWinAnsi(text).reduce((v,n)=>v+(PDF_WIDTHS[bold?'bold':'normal'][n]||556),0)*size/1000;}
function pdfText(text,x,y,size=10,bold=false,color=PDF_COLORS.ink,width=null,align='left'){
 text=String(text);if(width&&pdfWidth(text,size,bold)>width)size*=width/pdfWidth(text,size,bold);
 if(align==='right')x-=pdfWidth(text,size,bold);
 return `${pdfRGB(color)} rg\n`+pdfString(text,x,y,size,bold);
}
function pdfBox(x,y,w,h,color,r=0){
 let path=`${x} ${y} ${w} ${h} re`;
 if(r){r=Math.min(r,w/2,h/2);const k=r*0.55228475;path=`${x+r} ${y} m ${x+w-r} ${y} l ${x+w-r+k} ${y} ${x+w} ${y+r-k} ${x+w} ${y+r} c ${x+w} ${y+h-r} l ${x+w} ${y+h-r+k} ${x+w-r+k} ${y+h} ${x+w-r} ${y+h} c ${x+r} ${y+h} l ${x+r-k} ${y+h} ${x} ${y+h-r+k} ${x} ${y+h-r} c ${x} ${y+r} l ${x} ${y+r-k} ${x+r-k} ${y} ${x+r} ${y} c h`;}
 return `${pdfRGB(color)} rg ${path} f\n`;
}
// Símbolos vectoriales: se imprimen sin depender de fuentes emoji del dispositivo.
function pdfPaymentIcon(method,x,y,size=14){
 const c=PDF_COLORS,scale=size/24;let out=`q ${scale} 0 0 ${scale} ${x} ${y} cm\n`;
 if(method==='efectivo'){
  out+=pdfBox(1,5,22,14,c.green,2)+pdfBox(3,7,18,10,c.greenLight,1);
  out+=`${pdfRGB(c.green)} rg 12 7 m 14.8 7 17 9.2 17 12 c 17 14.8 14.8 17 12 17 c 9.2 17 7 14.8 7 12 c 7 9.2 9.2 7 12 7 c f\n`;
  out+=pdfText('€',9.6,9,8,true,c.white)+pdfBox(4,10,2,4,c.green)+pdfBox(18,10,2,4,c.green);
 }else if(method==='tpv'){
  out+=pdfBox(1,4,22,16,c.blue,2)+pdfBox(1,14,22,3,'#9dbcf0')+pdfBox(4,7,5,4,'#f5c24b',1)+pdfBox(12,8,7,1,c.white);
 }else if(method==='abonado'){
  out+=pdfBox(4,1,16,22,c.blue,1)+pdfBox(6,3,12,18,c.blueLight);for(const line of [7,11,15,18])out+=pdfBox(8,line,8,1,c.blue);
 }else if(method==='app'){
  out+=pdfBox(5,1,14,22,c.purple,3)+pdfBox(7,5,10,15,c.purpleLight,1)+pdfBox(10,2.5,4,1,c.white,.5)+pdfBox(9,11,6,5,c.purple,1);
 }
 return out+'Q\n';
}
function pdfPaymentLegend(x,y){
 let out='';for(const [method,label,offset] of [['efectivo','Efectivo',0],['tpv','TPV',82],['app','App',198]])out+=pdfPaymentIcon(method,x+offset,y-3,17)+pdfText(label,x+offset+23,y+2,8.5,true,PDF_COLORS.muted);return out;
}
function pdfImage(key,x,y,w,h){return `q ${w} 0 0 ${h} ${x} ${y} cm /Img_${key} Do Q\n`;}
function pdfWrap(text,width,size=9,bold=false){
 const lines=[];let line='';for(const word of String(text).split(/\s+/)){const next=line?line+' '+word:word;if(line&&pdfWidth(next,size,bold)>width){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;
}
function pdfHeader(title,subtitle,badge,example=false){
 const c=PDF_COLORS;let out=pdfBox(0,0,595,842,c.paper)+pdfBox(0,690,595,152,c.navy)+pdfBox(0,690,595,5,'#f5c24b');
 out+=pdfBox(36,781,43,43,c.white,10)+pdfImage('taxi',39,784,37,37);
 out+=pdfText('CONTABILIDAD Y CONTROL',90,812,10,true,c.white)+pdfText('DE SERVICIOS TAXI',90,797,10,true,'#a9c4dc');
 out+=pdfBox(411,797,148,23,'#29455f',8)+pdfText(example?'DATOS DE EJEMPLO':badge,423,805,8,true,'#f8d680',124);
 out+=pdfText(title,36,749,23,true,c.white,523)+pdfText(subtitle,36,725,9,false,'#d1deea',523);
 return out;
}
function pdfMetric(x,top,w,label,value,color,light,detail=''){
 const y=top-80;let out=pdfBox(x,y,w,80,light,11)+pdfBox(x,y+12,4,56,color,2);
 out+=pdfText(label.toUpperCase(),x+13,y+59,8,true,color,w-25);
 out+=pdfText(value,x+13,y+31,21,true,color,w-25);
 if(detail)out+=pdfText(detail,x+13,y+13,7.5,false,PDF_COLORS.muted,w-25);
 return out;
}
function pdfSettlementBanner(value,top,scope=''){
 const c=PDF_COLORS,h=82,y=top-h,color=value.ready?(value.balance<0?c.blue:c.green):c.amber,light=value.ready?(value.balance<0?c.blueLight:c.greenLight):c.amberLight;
 let out=pdfBox(36,y,523,h,light,12)+pdfBox(36,y+11,5,h-22,color,2);
 out+=pdfText('LIQUIDACIÓN DEL CONDUCTOR',51,y+61,8,true,color);
 const label=settlementLabel(value);out+=pdfText(label,51,y+42,12,true,color,487);
 out+=pdfText(value.ready?pdfSafeMoney(Math.abs(value.balance)):'Sin calcular',51,y+14,21,true,color,300);
 if(scope)out+=pdfText(scope,544,y+17,7.5,false,c.muted,170,'right');
 return out;
}
class TaxiPDFReport{
 constructor(title,subtitle,badge,example=false){this.title=title;this.subtitle=subtitle;this.badge=badge;this.example=example;this.pages=[];this.content='';this.y=672;this.newPage();}
 newPage(){if(this.content)this.pages.push(this.content);this.content=pdfHeader(this.title,this.subtitle,this.badge,this.example);this.y=672;}
 ensure(height){if(this.y-height<76)this.newPage();}
 section(label,color=PDF_COLORS.blue){this.ensure(60);this.content+=pdfBox(36,this.y-21,4,18,color,2)+pdfText(label,48,this.y-15,12,true,PDF_COLORS.ink,511);this.y-=32;}
 cards(items){this.ensure(100);const gap=9,w=(523-gap*(items.length-1))/items.length;items.forEach((item,i)=>this.content+=pdfMetric(36+i*(w+gap),this.y,w,...item));this.y-=98;}
 payout(value,scope=''){this.ensure(100);this.content+=pdfSettlementBanner(value,this.y,scope);this.y-=100;}
 note(text){const lines=pdfWrap(text,499,8.5);this.ensure(lines.length*13+20);this.content+=pdfBox(36,this.y-lines.length*13-14,523,lines.length*13+14,'#eaf0f6',8);for(const line of lines){this.content+=pdfText(line,48,this.y-15,8.5,false,PDF_COLORS.muted);this.y-=13;}this.y-=25;}
 table(title,columns,rows){
  const c=PDF_COLORS;let rowIndex=0;
  const heading=()=>{this.section(title);this.content+=pdfBox(36,this.y-27,523,27,c.navy,5);let x=36;for(const col of columns){this.content+=pdfText(col.label,col.right?x+col.width-8:x+8,this.y-17,8,true,c.white,col.width-16,col.right?'right':'left');x+=col.width;}this.y-=28;};
  this.ensure(100);heading();
  for(const row of rows){const height=row.serviceDetail?36:25;if(this.y-height<76){this.newPage();heading();}
   this.content+=pdfBox(36,this.y-height,523,height,rowIndex%2?'#eaf0f8':c.white);
   if(row.type)this.content+=pdfBox(36,this.y-height+3,3,height-6,PDF_PLATFORM_COLORS[row.type]||c.blue,1);
   let x=36;columns.forEach((col,i)=>{let pad=8;if(row.serviceDetail&&i===1){if(row.logo)this.content+=pdfImage(row.logo,x+7,this.y-28,21,21);const methodLabel=row.paymentMethod?(METHOD_NAMES[row.paymentMethod]||row.paymentMethod):row.methodFallback;this.content+=pdfText(row.serviceName,x+34,this.y-12,8.5,true,c.ink,col.width-42);if(row.paymentIcon)this.content+=pdfPaymentIcon(row.paymentIcon,x+33,this.y-30,15);this.content+=pdfText(methodLabel,x+(row.paymentIcon?52:34),this.y-27,8,false,c.muted,col.width-(row.paymentIcon?60:42));x+=col.width;return;}if(row.logo&&row.logoColumn===i){this.content+=pdfImage(row.logo,x+7,this.y-21,17,17);pad=30;if(['abonado','imbric','joinup'].includes(row.type)){this.content+=pdfPaymentIcon('abonado',x+29,this.y-20,12);pad=45;}}
    this.content+=pdfText(row.cells[i]??'',col.right?x+col.width-8:x+pad,this.y-(row.serviceDetail?22:16),8.2,!!col.bold,col.color||c.ink,col.width-pad-8,col.right?'right':'left');x+=col.width;});
   this.y-=height;rowIndex++;
  }
  if(!rows.length){this.content+=pdfBox(36,this.y-34,523,34,c.white)+pdfText('No hay registros para mostrar.',48,this.y-21,10,false,c.muted);this.y-=34;}
  this.y-=18;
 }
 finish(){return [...this.pages,this.content];}
}
function pdfCashStrip(report,value,label='Distribución de los cobros brutos'){
 const c=PDF_COLORS;report.ensure(85);const top=report.y,total=value.cash+value.boss+value.unclassified;
 report.content+=pdfText(label,36,top-10,9,true,c.ink);
 report.content+=pdfPaymentLegend(300,top-12);
 const segments=[[value.cash,c.green],[value.boss,c.blue],[value.unclassified,c.amber]];let x=36;
 report.content+=pdfBox(36,top-33,523,12,c.line,5);
 for(const [amount,color] of segments){const width=total?523*amount/total:0;if(width){report.content+=pdfBox(x,top-33,width,12,color);x+=width;}}
 report.content+=pdfText('EFECTIVO DEL CHÓFER',36,top-51,7.5,true,c.green)+pdfText(pdfSafeMoney(value.cash),36,top-66,11,true,c.green,165);
 report.content+=pdfText('COBRADO POR EL JEFE',214,top-51,7.5,true,c.blue)+pdfText(pdfSafeMoney(value.boss),214,top-66,11,true,c.blue,165);
 report.content+=pdfText('SIN CLASIFICAR',392,top-51,7.5,true,c.amber)+pdfText(pdfSafeMoney(value.unclassified),392,top-66,11,true,c.amber,165);report.y-=85;
}
function pdfPlatformChart(report,rows){
 report.section('Actividad por plataforma');const max=Math.max(1,...rows.map(r=>r.total));
 for(const r of rows){report.ensure(32);const y=report.y;report.content+=pdfBox(36,y-28,523,28,PDF_COLORS.white,6)+pdfImage(r.id,43,y-25,22,22);
  report.content+=pdfText(r.label,74,y-12,8.5,true,PDF_COLORS.ink,140)+pdfText(`${r.count} servicios`,74,y-25,7,false,PDF_COLORS.muted,140);
  report.content+=pdfBox(220,y-21,219,9,'#e7edf5',4)+pdfBox(220,y-21,219*r.total/max,9,PDF_PLATFORM_COLORS[r.id]||PDF_COLORS.blue,4);
  report.content+=pdfText(pdfSafeMoney(r.total),548,y-17,9,true,PDF_PLATFORM_COLORS[r.id]||PDF_COLORS.ink,99,'right');report.y-=32;
 }
 report.y-=8;
}
function pdfSessionSubtitle(s){return `Inicio: ${dateText(s.startedAt)}  |  ${s.closedAt?'Cierre: '+dateText(s.closedAt):'Jornada abierta - parcial'}`;}
function pdfDriverOverview(model){
 const c=PDF_COLORS,value=model.value,d=new TaxiPDFReport(model.title,model.subtitle,model.badge,model.example);
 d.cards([
  ['Ganancia del chófer',value.configured?pdfSafeMoney(value.earnings):'Sin configurar',c.purple,c.purpleLight,'Después de comisiones y seguro'],
  ['Efectivo cobrado',pdfSafeMoney(value.cash),c.green,c.greenLight,'Dinero cobrado por el chófer'],
  ['Diferencia a liquidar',value.ready?pdfSafeMoney(Math.abs(value.balance)):'Pendiente',value.ready&&value.balance<0?c.blue:c.amber,value.ready&&value.balance<0?c.blueLight:c.amberLight,'Ver quién debe pagar debajo']
 ]);
 d.payout(value,model.scope||'');
 d.section('Cómo se calcula la ganancia',c.purple);
 const rows=[['Facturación bruta',pdfSafeMoney(model.gross)],['Comisiones de plataformas','- '+pdfSafeMoney(model.commission)],['Base para reparto',pdfSafeMoney(model.base)],['Participación del chófer'+(model.percent?' ('+model.percent+')':''),value.configured?pdfSafeMoney(model.share):'Sin configurar'],['Seguro diario'+(model.period?' acumulado':''),value.configured?'- '+pdfSafeMoney(model.insurance):'Sin configurar']];
 for(let i=0;i<rows.length;i++){const y=d.y-27;d.content+=pdfBox(36,y,523,27,i%2?'#eaf0f8':c.white,4)+pdfText(rows[i][0],48,y+9,9,false,c.ink,340)+pdfText(rows[i][1],547,y+9,10,true,c.ink,150,'right');d.y-=29;}
 d.y-=15;pdfCashStrip(d,value,model.period?'Cobros de las jornadas con porcentaje':'Quién ha cobrado los servicios');
 d.note('Saldo = ganancia del chófer menos efectivo cobrado. App, TPV, abonados, Imbric y Join Up los cobra el jefe. No descuenta entregas ni anticipos ya realizados.');
 if(model.period)d.note('Solo se liquidan jornadas con porcentaje configurado. Los seguros se descuentan una vez por jornada. Las jornadas antiguas sin modalidad de cobro pueden dejar el saldo pendiente.');
 return d.finish();
}
function pdfDriverPage(s){return pdfDriverOverview({title:'Ganancias del conductor',subtitle:pdfSessionSubtitle(s),badge:'INFORME DEL CHÓFER',example:!!s.reportExample,value:settlement(s),gross:totalCents(s),commission:totalCommission(s),base:accountingTotal(s),share:driverShare(s),insurance:driverInsurance(s),percent:driverOn(s)?percentLabel(s):'',scope:s.services.length+' servicios'} )[0];}
function pdfCollectionsPage(s){
 const c=PDF_COLORS,value=settlement(s),d=new TaxiPDFReport('Cobros y liquidación',pdfSessionSubtitle(s),'RESUMEN DE JORNADA',!!s.reportExample);
 d.cards([['Efectivo del chófer',pdfSafeMoney(value.cash),c.green,c.greenLight,'Cobros en efectivo'],['Cobrado por el jefe',pdfSafeMoney(value.boss),c.blue,c.blueLight,'App, TPV, abonados y plataformas'],['Servicios registrados',String(s.services.length),c.purple,c.purpleLight,'Todas las plataformas']]);
 d.payout(value);pdfCashStrip(d,value);pdfPlatformChart(d,monthAccounting([s]).rows);
 d.note('Importes por plataforma: total contabilizado. Los cobros se muestran en bruto. La liquidación no descuenta entregas ni anticipos ya realizados.');
 return d.finish();
}
function exportPDF(customFilename){
 if(!listSession)return;const s=listSession,type=$('pdfType').value;
 if(type==='driver'){
  if(!driverOn(s)){notify('Esta jornada no tiene ganancias del conductor configuradas');return;}
  createPDFPages([pdfDriverPage(s)],customFilename||fileStem(s)+'-conductor.pdf');return;
 }
 const c=PDF_COLORS,d=new TaxiPDFReport('Facturación de la jornada',pdfSessionSubtitle(s),'DETALLE DE SERVICIOS',!!s.reportExample);
 d.cards([['Facturación bruta',pdfSafeMoney(totalCents(s)),c.blue,c.blueLight,'Importe de todos los servicios'],['Comisiones',pdfSafeMoney(totalCommission(s)),c.amber,c.amberLight,commissionsOn(s)?'Imbric 12 % - Join Up 10 %':'Descuentos desactivados'],['Total contabilizado',pdfSafeMoney(accountingTotal(s)),c.green,c.greenLight,commissionsOn(s)?'Neto después de comisiones':'Sin descuentos de comisión']]);
 const columns=[{label:'Fecha y hora',width:103},{label:'Plataforma / cobro',width:180},{label:'Bruto',width:80,right:true},{label:'Comisión',width:78,right:true,color:c.amber},{label:'Neto',width:82,right:true,bold:true,color:c.green}];
 d.table(`${s.services.length} servicios registrados`,columns,sortServices(s).map(item=>({type:item.type,serviceDetail:true,serviceName:nameType(item.type),paymentIcon:item.paymentMethod||(['abonado','imbric','joinup'].includes(item.type)?'abonado':null),paymentMethod:item.paymentMethod||null,methodFallback:['abonado','imbric','joinup'].includes(item.type)?'Cobro en central':collectionOwner(item)==='jefe'?'Cobro del jefe':'Sin clasificar',logo:PDF_IMAGES[item.type]?item.type:null,logoColumn:1,cells:[dateText(item.at),serviceLabel(item),pdfSafeMoney(item.amountCents),commissionCents(item,s)?'- '+pdfSafeMoney(commissionCents(item,s)):'-',pdfSafeMoney(netCents(item,s))]})));
 const pages=d.finish();pages.push(...pdfCollectionsPage(s));if(type==='both')pages.push(pdfDriverPage(s));createPDFPages(pages,customFilename||fileStem(s)+'.pdf');
}
function pdfPeriodOverview(m){
 const c=PDF_COLORS,d=new TaxiPDFReport('Resumen del periodo',m.periodLabel+'  |  '+m.sessions.length+' jornadas - '+m.count+' servicios','FACTURACIÓN DEL TAXI',!!m.reportExample);
 d.cards([['Facturación bruta',pdfSafeMoney(m.gross),c.blue,c.blueLight,'Todas las jornadas seleccionadas'],['Comisiones',pdfSafeMoney(m.commission),c.amber,c.amberLight,'Descuentos de las plataformas'],['Total contabilizado',pdfSafeMoney(m.total),c.green,c.greenLight,'Según la configuración de cada día']]);
 d.payout(m.settlement,`${m.driverSessions.length} jornadas con porcentaje`);
 pdfCashStrip(d,m.allCollections,'Cobros de todas las jornadas del periodo');pdfPlatformChart(d,m.rows);
 d.note(`Media por servicio: ${pdfSafeMoney(m.averageService)}. Media por jornada: ${pdfSafeMoney(m.averageSession)}. La liquidación usa solo la ganancia y el efectivo de las jornadas con porcentaje; no descuenta entregas ni anticipos.`);
 return d.finish();
}
function monthlyPdf(customFilename){
 const m=monthSnapshot;if(!m||!m.sessions.length){notify('No hay jornadas para exportar');return;}const type=$('monthPdfType').value,c=PDF_COLORS,pages=[];
 if(type==='driver'&&!m.driverSessions.length){notify('No hay jornadas con ganancias configuradas en este periodo');return;}
 if(type!=='driver'){
  pages.push(...pdfPeriodOverview(m));
  const d=new TaxiPDFReport('Detalle de la facturación',m.periodLabel,'JORNADAS Y PLATAFORMAS',!!m.reportExample);
  d.table('Por jornada',[{label:'Inicio',width:115},{label:'Serv.',width:36,right:true},{label:'Bruto',width:93,right:true},{label:'Comisión',width:93,right:true},{label:'Contabilizado',width:93,right:true,bold:true,color:c.green},{label:'Media',width:93,right:true}],m.sessions.map(s=>({cells:[dateText(s.startedAt)+(s.closedAt?'':' *'),s.services.length,pdfSafeMoney(totalCents(s)),pdfSafeMoney(totalCommission(s)),pdfSafeMoney(accountingTotal(s)),pdfSafeMoney(s.services.length?Math.round(accountingTotal(s)/s.services.length):0)]})));
  d.table('Por plataforma',[{label:'Plataforma',width:115},{label:'Serv.',width:36,right:true},{label:'Bruto',width:93,right:true},{label:'Comisión',width:93,right:true},{label:'Contabilizado',width:93,right:true,bold:true,color:c.green},{label:'Media',width:93,right:true}],m.rows.map(r=>({type:r.id,logo:r.id,logoColumn:0,cells:[r.label,r.count,pdfSafeMoney(r.gross),pdfSafeMoney(r.commission),pdfSafeMoney(r.total),pdfSafeMoney(Math.round(r.total/r.count))]})));
  d.note('Cada jornada se atribuye a su fecha local de inicio, aunque cierre después de medianoche. Se incluyen las fechas Desde y Hasta. Las jornadas marcadas con * siguen abiertas. Neto si había comisiones activadas; bruto en las restantes.');pages.push(...d.finish());
 }
 if(type!=='taxi'){
  pages.push(...pdfDriverOverview({title:'Ganancias del conductor',subtitle:m.periodLabel+'  |  '+m.driverSessions.length+' de '+m.sessions.length+' jornadas con porcentaje',badge:'LIQUIDACIÓN DEL PERIODO',example:!!m.reportExample,period:true,scope:'Solo jornadas con porcentaje',value:m.settlement,gross:sumBy(m.driverSessions,totalCents),commission:sumBy(m.driverSessions,totalCommission),base:sumBy(m.driverSessions,accountingTotal),share:m.driverParticipation,insurance:m.insurance}));
  const d=new TaxiPDFReport('Detalle del conductor',m.periodLabel,'REPARTO Y LIQUIDACIÓN',!!m.reportExample);
  d.table('Cálculo de ganancias por jornada',[{label:'Inicio',width:115},{label:'%',width:36,right:true},{label:'Base',width:93,right:true},{label:'Participación',width:93,right:true},{label:'Seguro',width:93,right:true},{label:'Ganancia',width:93,right:true,bold:true,color:c.purple}],m.driverSessions.map(s=>({cells:[dateText(s.startedAt),percentLabel(s),pdfSafeMoney(accountingTotal(s)),pdfSafeMoney(driverShare(s)),pdfSafeMoney(driverInsurance(s)),pdfSafeMoney(driverEarnings(s))]})));
  d.table('Efectivo y saldo de cada jornada',[{label:'Inicio',width:115},{label:'Ganancia',width:102,right:true,color:c.purple},{label:'Efectivo',width:102,right:true,color:c.green},{label:'Paga el jefe',width:102,right:true,bold:true,color:c.green},{label:'Entrega el chófer',width:102,right:true,bold:true,color:c.blue}],m.driverSessions.map(s=>{const v=settlement(s);return {cells:[dateText(s.startedAt),pdfSafeMoney(v.earnings),pdfSafeMoney(v.cash),v.ready?pdfSafeMoney(v.fromBoss):'Pendiente',v.ready?pdfSafeMoney(v.toBoss):'Pendiente']};}));
  d.note('La liquidación del periodo compensa los saldos de sus jornadas. Solo se incluyen jornadas con porcentaje configurado. No se descuentan entregas ni anticipos anteriores. Un cobro sin clasificar deja el saldo pendiente.');pages.push(...d.finish());
 }
 createPDFPages(pages,customFilename||`contabilidad-control-servicios-taxi-resumen-${m.from}_${m.to}-${type}.pdf`);
}
function createPDFPages(pages,filename){
 const objects=[null],add=s=>(objects.push(s),objects.length-1);
 const catalog=add(''),root=add(''),normal=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const imageRefs={};for(const [key,asset] of Object.entries(PDF_IMAGES)){const data=asset.hex+'>';imageRefs[key]=add(`<< /Type /XObject /Subtype /Image /Width ${asset.width} /Height ${asset.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${data.length} >>\nstream\n${data}\nendstream`);}
 const imageResources=Object.entries(imageRefs).map(([key,ref])=>`/Img_${key} ${ref} 0 R`).join(' '),refs=[];
 pages.forEach((content,i)=>{
  content+=pdfBox(36,48,523,1,PDF_COLORS.line)+pdfText('CONTROL SERVICIOS TAXI  /  Informe generado en el dispositivo',36,30,7,false,PDF_COLORS.muted)+pdfText(`Página ${i+1} de ${pages.length}`,559,30,8,true,PDF_COLORS.muted,120,'right');
  const stream=add(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
  refs.push(add(`<< /Type /Page /Parent ${root} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${normal} 0 R /F2 ${bold} 0 R >> /XObject << ${imageResources} >> >> /Contents ${stream} 0 R >>`));
 });
 objects[catalog]=`<< /Type /Catalog /Pages ${root} 0 R >>`;objects[root]=`<< /Type /Pages /Kids [${refs.map(n=>n+' 0 R').join(' ')}] /Count ${refs.length} >>`;
 let pdf='%PDF-1.4\n%Control Servicios Taxi\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+=`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
 download(new Blob([Uint8Array.from(pdf,ch=>ch.charCodeAt(0))],{type:'application/pdf'}),filename);notify('PDF preparado para descargar');
}
