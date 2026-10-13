// Motor de cálculo del Co-Piloto de Negocio (copiado SIN CAMBIOS de CoPiloto_Trendo_v5.html, líneas 470–586).
// Funciones puras: no tocan el DOM ni el almacenamiento. Portar a TypeScript manteniendo el resultado idéntico.
// Única dependencia externa: E.diagnose usa money() y pct() para armar textos; se inyectan con setFormatters().
let money = n => String(n), pct = n => String(n);
export function setFormatters(f) { if (f.money) money = f.money; if (f.pct) pct = f.pct; }
export const E = {
 riskProfile(r){return r<=3?{label:"Pasivo",tone:"g"}:r<=7?{label:"Normal",tone:"a"}:{label:"Agresivo",tone:"r"}},
 rn(r){return (r-1)/9},
 // Reglas del método según riesgo
 rules(r){const n=E.rn(r);return{
   holguraCPA:0.40-0.30*n,          // margen de seguridad exigido sobre el CPA máximo (40% → 10%)
   margenMin:0.20-0.10*n,           // utilidad por pedido mínima / precio (20% → 10%)
   pedidosDecidir:10,               // pedidos para tomar decisión de un test
   killMult:1.5+1.0*n,              // matar si gastas X × CPA máximo sin una venta (1.5× → 2.5×)
   asignacion:50+40*n, reinversion:50+40*n,  // simulador (50% → 90%)
   k:0.7+0.7*n, mult:1.8-0.75*n, start:0.25+0.45*n, // analizador y planificador (spec v2)
   subida:Math.round(15+15*n)        // % de subida de presupuesto cada 2–3 días al escalar
 }},
 unit(p){const e=p.entrega/100,c=(p.conf??100)/100,tx=(p.com+(p.imp||0))/100,ut=(p.upTasa||0)/100;const upP=p.upPrecio||0,upC=p.upCosto||0,emp=p.empaque||0,cc=p.costoConf||0;
   const aov=p.precio+ut*upP;const mE=aov*(1-tx)-p.costo-ut*upC-p.flete-emp;const pD=p.flete+p.fleteRet+emp;const u=c*(e*mE-(1-e)*pD-cc);
   return{e,c,aov,costoUnit:p.costo+ut*upC,costoConf:cc,margenEntregado:mE,perdidaDevuelto:pD,utilidadPedido:u,cpaMax:u,roasMin:u>0?(aov*e*c)/u:Infinity,margenPct:aov?u/aov:0,cmRatio:aov*e*c>0?u/(aov*e*c):0}},
 gate(p,r){const u=E.unit(p),R=E.rules(r);const cpaObj=Math.max(0,u.cpaMax*(1-R.holguraCPA));
   const ok1=u.utilidadPedido>0, ok2=u.margenPct>=R.margenMin;
   const presTest=cpaObj*R.pedidosDecidir, fondo=presTest*5;
   return{u,R,cpaObj,presTest,fondo,pass:ok1&&ok2,ok1,ok2}},
 // Analizador de test (contraentrega): generados -> confirmados (despachados) -> entregados
 test(f,p){const U=E.unit(p);const has=v=>v!==null&&v!==undefined&&v!=="";const ped=+f.ped||0;const conf=has(f.conf)?Math.min(+f.conf,ped):Math.min(ped,Math.max(ped*((p.conf??100)/100),has(f.ent)?+f.ent:0));
   const ent=has(f.ent)?Math.min(+f.ent,conf):conf*(p.entrega/100);const dev=Math.max(0,conf-ent);
   const aov=f.aov>0?f.aov:U.aov;const ingresos=ent*aov;const com=p.com/100;const ads=+f.ads||0,imp=+f.imp||0,clics=+f.clics||0;
   const emp=p.empaque||0;const costosVar=ent*(U.costoUnit+p.flete+emp)+dev*(p.flete+p.fleteRet+emp)+ingresos*(com+(p.imp||0)/100)+conf*(p.costoConf||0);const contrib=ingresos-costosVar;const neta=contrib-ads;const cm=ingresos?contrib/ingresos:0;
   return{ped,conf,ent,dev,aov,ingresos,contrib,neta,cm,ads,imp,clics,roas:ads?ingresos/ads:0,roasEq:cm>0?1/cm:Infinity,cpa:ped?ads/ped:ads,cpaMax:ped?contrib/ped:U.cpaMax,
     tasaConf:ped?conf/ped:0,tasaEntrega:conf?ent/conf:0,rent:ingresos?neta/ingresos*100:0,ctr:imp?clics/imp:null,cpc:clics?ads/clics:null,cvr:clics?ped/clics:null}},
 verdict(c,meta,r,p){const R=E.rules(r);const cpaMaxTeo=E.unit(p).cpaMax;
   if(c.ads>0&&c.ped===0)return c.ads>=R.killMult*cpaMaxTeo?{label:"Pausar / matar",tone:"r",why:`Gastaste ${R.killMult.toFixed(1)}× el CPA máximo sin un solo pedido.`}:{label:"Seguir midiendo",tone:"b",why:`Aún no hay pedidos. Regla de corte: matar al llegar a ${R.killMult.toFixed(1)}× el CPA máximo sin ventas.`};
   if(!c.ads||!c.ingresos)return{label:"Faltan datos",tone:"b",why:"Ingresa gasto en ads y pedidos."};
   const ratio=isFinite(c.roasEq)?c.roas/c.roasEq:0;
   if(c.neta<=0)return ratio>0.85?{label:"Optimizar",tone:"a",why:"Estás cerca del equilibrio: mejora creativo, oferta o % de entrega antes de subir presupuesto."}:{label:"Pausar / matar",tone:"r",why:"Muy lejos del equilibrio. Pasa al siguiente producto."};
   const pocos=c.ped<R.pedidosDecidir;
   if(c.rent>=meta/R.k&&ratio>=1.1/R.k)return pocos?{label:"Escalar con cautela",tone:"g",why:`Rentable, pero con solo ${c.ped} pedidos la muestra es pequeña. Sube ${R.subida}% y confirma.`}:{label:"Escalar",tone:"g",why:`Rentable y sobre el equilibrio. Sube el presupuesto ${R.subida}% cada 2–3 días.`};
   return{label:"Mantener y optimizar",tone:"a",why:"Gana dinero pero no llega a tu meta para tu nivel de riesgo."}},
 // Agregado de resultados (ponderado)
 agg(tests){const t=tests.filter(x=>x.c);if(!t.length)return null;const S=f=>t.reduce((s,x)=>s+(+f(x.c)||0),0);
   const ads=S(c=>c.ads),imp=S(c=>c.imp),clics=S(c=>c.clics),ped=S(c=>c.ped),conf=S(c=>c.conf??c.ped),ent=S(c=>c.ent),dev=S(c=>c.dev),ing=S(c=>c.ingresos),con=S(c=>c.contrib),neta=S(c=>c.neta);
   const cm=ing?con/ing:0;return{n:t.length,ads,imp,clics,ped,conf,ent,dev,ingresos:ing,contrib:con,neta,cm,roas:ads?ing/ads:0,roasEq:cm>0?1/cm:Infinity,cpa:ped?ads/ped:0,cpaMax:ped?con/ped:0,
     ctr:imp?clics/imp:null,cpc:clics?ads/clics:null,cvr:clics?ped/clics:null,tasaConf:ped?conf/ped:0,tasaEntrega:conf?ent/conf:0,entrega:conf?ent/conf:0,aov:ent?ing/ent:0,rent:ing?neta/ing*100:0,
     dias:t.reduce((s,x)=>s+(+(x.form&&x.form.dias)||0),0)}},
 real(tests){return E.agg(tests.filter(x=>x.c&&x.c.ped>0))},
 // Evaluación inicial: criterios cualitativos (65%) + economía (35%)
 CRIT:[["wow","Factor wow · se luce en un video de 15 s",15],["problema","Resuelve un problema o un deseo fuerte",12],["valor","Valor percibido mayor que el precio",12],["demanda","Demanda / tendencia",12],["competencia","Competencia (5 = poca)",10],["envio","Fácil de enviar (ligero, no frágil)",8],["recompra","Recompra o upsell posible",8],["creativos","Hay material para creativos (videos, UGC)",8],["devol","Bajo riesgo de devolución o garantía",7],["prov","Proveedor confiable (stock, calificación)",8]],
 evaluate(p,r){const g=E.gate(p,r);const sc=p.score||{};let cual=0;E.CRIT.forEach(([k,,w])=>{const v=Math.max(1,Math.min(5,+sc[k]||3));cual+=w*(v-1)/4});
   const econ=Math.max(0,Math.min(1,g.u.margenPct/0.30))*100;const total=Math.round(0.65*cual+0.35*econ);
   const clase=!g.pass?"C":total>=75?"A":total>=60?"B":"C";const warn=[];
   if(!g.pass)warn.push(["r","No pasa la validación de margen para tu nivel de riesgo."]);
   if(p.invima==="Sí")warn.push(["a","Requiere permiso sanitario (INVIMA): pide al proveedor el registro o la notificación antes de pautar."]);
   if(p.invima==="No sé")warn.push(["a","Verifica si el producto necesita registro o notificación INVIMA (cosméticos y dispositivos de salud suelen requerirlo)."]);
   if(p.precioComp>0&&p.precio>p.precioComp*1.15)warn.push(["a",`Tu precio está ${Math.round((p.precio/p.precioComp-1)*100)}% por encima del promedio de la competencia: necesitas una oferta o un ángulo que lo justifique.`]);
   if(p.precioComp>0&&p.precio<p.precioComp*0.85)warn.push(["g","Tu precio está por debajo de la competencia: hay espacio para subirlo o para un combo."]);
   if(p.competidores>=15)warn.push(["a",`Viste ${p.competidores} tiendas vendiéndolo: diferencia la marca, la oferta o el ángulo.`]);
   if(p.ancla>0&&p.ancla<=p.precio)warn.push(["a","El precio tachado debe ser mayor que el precio de venta."]);
   if(!(p.upTasa>0))warn.push(["b","Sin upsell ni combo: agregar uno sube el ticket y te deja pagar más por cada pedido."]);
   return{g,cual:Math.round(cual),econ:Math.round(econ),total,clase,warn}},
 // Diagnóstico por cuellos de botella del embudo
 diagnose(a,p,r){const out=[];if(!a)return out;const g=E.gate(p,r),U=g.u,R=E.rules(r);
   if(a.ped===0){out.push(["r","Sin pedidos",a.ads>=R.killMult*U.cpaMax?`Ya gastaste ${money(a.ads)} (más de ${R.killMult.toFixed(1)}× el CPA máximo). Mata el test o cambia de creativo y ángulo.`:"Todavía no hay pedidos. Deja correr hasta el corte o revisa el creativo."]);return out}
   if(a.ctr!==null){if(a.ctr<0.008)out.push(["r","Creativo (CTR "+pct(a.ctr)+")","El anuncio no detiene el scroll. Prueba 3 ganchos nuevos en los primeros 3 segundos y muestra el producto en uso."]);
     else if(a.ctr<0.012)out.push(["a","Creativo (CTR "+pct(a.ctr)+")","CTR aceptable pero mejorable. Prueba variaciones del gancho y del texto."]);else out.push(["g","Creativo (CTR "+pct(a.ctr)+")","El anuncio atrae clics. Mantén el ángulo y crea variaciones."])}
   if(a.cvr!==null){if(a.cvr<0.008)out.push(["r","Página y oferta (conversión "+pct(a.cvr)+")","Llegan pero no compran: revisa precio tachado, reseñas, video en la página, velocidad en celular, garantía y un combo 2×."]);
     else if(a.cvr<0.015)out.push(["a","Página y oferta (conversión "+pct(a.cvr)+")","Conversión media. Prueba una oferta más clara (envío gratis, combo, garantía) y prueba social arriba."]);else out.push(["g","Página y oferta (conversión "+pct(a.cvr)+")","La página convierte bien."])}
   if(a.tasaConf<0.8)out.push(["a","Confirmación ("+pct(a.tasaConf)+")","Muchos pedidos no se confirman. Escribe por WhatsApp en menos de 1 hora y usa un mensaje automático con resumen del pedido."]);
   if(a.conf>0){if(a.tasaEntrega<0.7)out.push(["r","Entregas ("+pct(a.tasaEntrega)+")","Demasiadas devoluciones. Confirma dirección y disponibilidad, compara transportadoras por ciudad y evita zonas con más rechazo."]);
     else if(a.tasaEntrega<0.8)out.push(["a","Entregas ("+pct(a.tasaEntrega)+")","Entrega aceptable. Cada punto que subas aquí va directo a utilidad."]);else out.push(["g","Entregas ("+pct(a.tasaEntrega)+")","Buena tasa de entrega."])}
   if(a.cpa>a.cpaMax)out.push(["r","Unidad económica","Tu CPA real ("+money(a.cpa)+") supera lo que deja cada pedido ("+money(a.cpaMax)+"). Sube el ticket con combo o upsell, o el precio."]);
   else if(a.cpa>g.cpaObj)out.push(["a","Unidad económica","Ganas, pero el CPA ("+money(a.cpa)+") está por encima de tu objetivo ("+money(g.cpaObj)+"). Optimiza antes de escalar fuerte."]);
   else out.push(["g","Unidad económica","CPA ("+money(a.cpa)+") dentro de tu objetivo ("+money(g.cpaObj)+")."]);
   if(a.aov>0&&a.aov<=p.precio*1.02)out.push(["b","Ticket promedio","El AOV es igual al precio: agrega un combo 2× o un upsell posventa para subirlo."]);
   if(a.ped<R.pedidosDecidir)out.push(["b","Muestra",`Llevas ${a.ped} pedidos. Con menos de ${R.pedidosDecidir} las conclusiones son preliminares.`]);
   return out},
 // ===== Calculadora de precio y costo de venta =====
 // CPA sensible al precio: A(P)=A0·(P/P0)^ε hasta el techo percibido T; por encima, la sensibilidad se duplica.
 cpaAt(q,P){const T=q.techo>0?q.techo:Infinity;const base=Math.min(P,T);let A=q.cpa0*Math.pow(base/q.p0,q.elast);if(P>T)A*=Math.pow(P/T,2*q.elast);return A},
 priceEval(q,P){const c=q.conf/100,e=q.entrega/100,ce=c*e,ut=(q.upTasa||0)/100,tx=(q.com+q.imp)/100;
   const aov=P+ut*(q.upPrecio||0);const A=E.cpaAt(q,P);const rev=ce*aov;
   const cProd=ce*(q.costo+ut*(q.upCosto||0)),cFlete=ce*q.flete,cEmp=ce*q.empaque,cCom=rev*tx,cDev=c*(1-e)*(q.flete+q.fleteRet+q.empaque),cConf=c*q.costoConf;
   const vari=cProd+cFlete+cEmp+cCom+cDev+cConf;const pedidos=A>0?q.presupuesto/A:0;const fpp=pedidos>0?q.fijosMes/pedidos:0;const pi=rev-vari-A-fpp;
   return{P,aov,A,rev,ce,pedidos,entregados:pedidos*ce,pi,mes:pedidos*pi,mn:rev?pi/rev:-1,mc:rev?(rev-vari)/rev:-1,roas:A?rev/A:0,roasEq:rev-vari>0?rev/(rev-vari):Infinity,markup:q.costo?P/q.costo:0,
     parts:{producto:cProd,flete:cFlete,devoluciones:cDev,comision:cCom,empaque:cEmp,confirmacion:cConf,publicidad:A,fijos:fpp,utilidad:pi}}},
 psych(P){const g=P>=50000?10000:1000;return Math.max(g-100,Math.ceil((P+100)/g)*g-100)},
 pricing(q){const lo=Math.max(1000,Math.round(q.costo*1.1/1000)*1000);const hi=Math.max(q.costo*5,(q.techo||0)*1.6,q.p0*2,lo+20000);const step=Math.max(500,Math.round((hi-lo)/160/500)*500);
   const grid=[];for(let P=lo;P<=hi;P+=step)grid.push(E.priceEval(q,P));
   const first=fn=>{const x=grid.find(fn);return x?x.P:null};
   const be=first(g=>g.pi>=0),pMin=first(g=>g.mn>=q.margenMin/100),pObj=first(g=>g.mn>=q.margenObj/100);
   const opt=grid.reduce((a,b)=>b.mes>a.mes?b:a,grid[0]);const H=grid.filter(g=>g.mn>=q.margenMin/100&&g.mes>0);
   let range=null,rec=null,bestH=null;
   if(H.length){bestH=H.reduce((a,b)=>b.mes>a.mes?b:a,H[0]);const ok=H.filter(g=>g.mes>=0.85*bestH.mes);range=[ok[0].P,ok[ok.length-1].P];
     const fl=P=>{const g2=P>=50000?10000:1000;return Math.floor((P+100)/g2)*g2-100};
     const cand=[E.psych(bestH.P),fl(bestH.P),E.psych(range[0]),fl(range[1])].filter((v,i,a)=>v>0&&a.indexOf(v)===i).map(P=>E.priceEval(q,P)).filter(g=>g.mn>=q.margenMin/100&&g.mes>0);
     rec=cand.length?cand.reduce((a,b)=>b.mes>a.mes?b:a).P:Math.round(bestH.P/100)*100}
   return{grid,step,lo,hi,be,pMin,pObj,opt,bestH,range,rec}},
 // Planificador (lógica de la spec v2 con la contabilidad de caja corregida)
 plan(p,r){const R=p.R,m=p.modo==="pct"?p.m/100:(R?p.m/R:0);const N=Math.max(1,Math.min(12,Math.round(p.N||1)));const RR=E.rules(r);
   const be=m>0?1/m:0,targetROAS=be*RR.mult,full=targetROAS>0?R/targetROAS:0;const rRet=p.ret/100,rRee=p.ree/100;
   let cash=p.cap,cum=0,tot=0,self=null,prevB=0;const rows=[];
   for(let i=0;i<N;i++){const t=N>1?i/(N-1):1;const ramp=Math.min(1,RR.start+(1-RR.start)*t);const spend=full*ramp,rev=spend*targetROAS;
     const gp=rev*m*(1-rRee);const buffer=rev*rRet;const net=gp-spend-p.fijos;const need=spend+p.fijos+Math.max(0,buffer-prevB);
     let inject=0;if(cash<need){inject=need-cash;cash=0}else cash-=need;
     cash+=gp; // vuelve la contribución (antes de ads); la pauta y los fijos ya salieron
     cum+=net;tot+=inject;prevB=buffer;if(self===null&&i>0&&inject===0)self=i+1;
     rows.push({i:i+1,spend,rev,gp,buffer,net,inject,cum,cash})}
   return{R,m,be,targetROAS,full,N,rows,tot,cum,fullNet:R*m*(1-rRee)-full-p.fijos,self}},
 // Simulador de crecimiento con interés compuesto y fase de testeo
 sim(p){const u=E.unit(p);const cpm=30/p.ciclo,n=Math.max(1,Math.round(p.meses*cpm)),fc=p.fijos/cpm,tope=p.tope*p.ciclo;
   let cap=p.cap-p.testeo,ret=0,base=null;const rows=[];let payback=null,dup=null,quiebra=null;
   if(cap<=0)return{u,rows:[{ciclo:0,mes:0,pauta:0,cpa:p.cpa,pedidos:0,entregados:0,utilidad:-p.testeo,retiro:0,capital:cap,retirado:0,ventas:0,roas:0}],patrimonio:Math.max(0,cap),roi:-1,tm:-1,ta:-1,payback,dup,quiebra:0,cdt:p.cap,totPed:0,totUtil:-p.testeo,totPauta:0,testeo:p.testeo};
   for(let i=1;i<=n;i++){const disp=Math.max(0,cap-fc);const pauta=Math.max(0,Math.min(disp*p.asig/100,tope));if(base===null)base=Math.max(pauta,1);
     const f=pauta>base?Math.pow(1+p.deg/100,Math.log2(pauta/base)):1;const cpa=p.cpa*f;const ped=cpa>0?pauta/cpa:0;const ship=ped*u.c;const ent=ship*u.e;
     const util=ent*u.margenEntregado-(ship-ent)*u.perdidaDevuelto-ship*u.costoConf-pauta-fc;const retiro=util>0?util*(1-p.reinv/100):0;cap=cap+util-retiro;ret+=retiro;const mes=i/cpm;
     rows.push({ciclo:i,mes,pauta,cpa,pedidos:ped,entregados:ent,utilidad:util,retiro,capital:cap,retirado:ret,ventas:ent*p.precio,roas:pauta?ent*p.precio/pauta:0});
     if(payback===null&&cap+ret>=p.cap&&ret>0)payback=mes;if(dup===null&&cap+ret>=2*p.cap)dup=mes;if(cap<=fc){quiebra=mes;break}}
   const L=rows[rows.length-1],pat=L.capital+L.retirado,m=L.mes;const tm=pat>0?Math.pow(pat/p.cap,1/m)-1:-1;
   return{u,rows,patrimonio:pat,roi:pat/p.cap-1,tm,ta:Math.pow(1+tm,12)-1,payback,dup,quiebra,cdt:p.cap*Math.pow(1+p.cdt/100,m/12),
     totPed:rows.reduce((s,r)=>s+r.pedidos,0),totUtil:rows.reduce((s,r)=>s+r.utilidad,0),totPauta:rows.reduce((s,r)=>s+r.pauta,0),testeo:p.testeo}}
};
export default E;
