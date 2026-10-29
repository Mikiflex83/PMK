/* PimpMyKoha — moteur commun des plannings et estimations de navette. */
(function(window){
  'use strict';
  if(window.PMKPlanningCommon)return;

  const text=value=>String(value??'').trim();
  const clone=value=>JSON.parse(JSON.stringify(value));
  const isoDate=date=>{
    const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0'),day=String(date.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  };
  const parseDate=value=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(text(value)))return null;
    const date=new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())?null:date;
  };
  const minutes=value=>{
    const match=/^(\d{1,2}):(\d{2})$/.exec(text(value));
    if(!match)return null;
    const result=Number(match[1])*60+Number(match[2]);
    return result>=0&&result<1440?result:null;
  };
  const key=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  function normalizeStop(stop){
    const name=text(stop?.name);if(!name)return null;
    return {name,location:text(stop?.location),time:text(stop?.time)};
  }
  function normalizeSlot(slot,index){
    if(!slot||typeof slot!=='object')return null;
    const stops=(Array.isArray(slot.stops)?slot.stops:[]).map(normalizeStop).filter(Boolean);if(!stops.length)return null;
    const kind=slot.kind==='weekly'?'weekly':'date';
    const result={id:text(slot.id)||`slot-${index+1}`,kind,period:text(slot.period),start:text(slot.start),end:text(slot.end),stops};
    if(kind==='weekly')Object.assign(result,{weekday:Math.min(6,Math.max(0,Number(slot.weekday)||0)),dateFrom:text(slot.dateFrom),dateTo:text(slot.dateTo)});
    else result.date=text(slot.date);
    return result;
  }
  function normalizeService(service,index){
    const name=text(service?.name)||`Service ${index+1}`;
    return {
      ...clone(service&&typeof service==='object'?service:{}),
      id:text(service?.id)||`service-${index+1}`,name,title:text(service?.title)||name,
      active:service?.active!==false,order:Number.isFinite(Number(service?.order))?Number(service.order):(index+1)*10,
      maxUpcoming:Math.min(50,Math.max(1,Number(service?.maxUpcoming)||5)),
      slots:(Array.isArray(service?.slots)?service.slots:[]).map(normalizeSlot).filter(Boolean),
      exceptions:(Array.isArray(service?.exceptions)?service.exceptions:[]).map((exception,i)=>({id:text(exception?.id)||`exception-${i+1}`,date:text(exception?.date),period:text(exception?.period),cancelled:exception?.cancelled!==false})).filter(exception=>parseDate(exception.date))
    };
  }
  function normalizeConfig(raw){
    const input=raw&&typeof raw==='object'?raw:{};
    return {schemaVersion:Number(input.schemaVersion)||1,source:text(input.source)||'koha',services:(Array.isArray(input.services)?input.services:[]).map(normalizeService)};
  }
  function cancelled(service,date,period){return service.exceptions.some(exception=>exception.cancelled&&exception.date===date&&(!exception.period||exception.period===period));}
  function collectOccurrences(service,options={}){
    service=normalizeService(service,0);const now=options.now instanceof Date?new Date(options.now):new Date(),today=new Date(now);today.setHours(0,0,0,0);
    const horizonDays=Math.min(730,Math.max(1,Number(options.horizonDays)||180)),limit=Math.min(200,Math.max(1,Number(options.limit)||service.maxUpcoming||5)),result=[];
    for(const slot of service.slots){
      if(slot.kind==='date'){
        const date=parseDate(slot.date);if(date&&date>=today&&!cancelled(service,slot.date,slot.period))result.push({...clone(slot),iso:slot.date,dateObj:date});
        continue;
      }
      for(let offset=0;offset<=horizonDays;offset++){
        const date=new Date(today);date.setDate(date.getDate()+offset);const iso=isoDate(date);
        if(date.getDay()!==slot.weekday||(slot.dateFrom&&iso<slot.dateFrom)||(slot.dateTo&&iso>slot.dateTo)||cancelled(service,iso,slot.period))continue;
        result.push({...clone(slot),iso,dateObj:date});
      }
    }
    result.sort((a,b)=>a.dateObj-b.dateObj||(minutes(a.start)??9999)-(minutes(b.start)??9999));
    return result.slice(0,limit);
  }
  function aliasNames(value,aliases){
    const values=[text(value)],mapping=aliases&&typeof aliases==='object'?aliases:{};
    const direct=mapping[value]??mapping[text(value).toUpperCase()]??mapping[text(value).toLowerCase()];
    (Array.isArray(direct)?direct:[direct]).filter(Boolean).forEach(item=>values.push(text(item)));
    return new Set(values.map(key).filter(Boolean));
  }
  function stopIndex(stops,names){return stops.findIndex(stop=>names.has(key(stop.name))||names.has(key(stop.location)));}
  function occurrenceDate(occurrence,stop){
    const result=new Date(occurrence.dateObj),value=minutes(stop?.time)||minutes(occurrence.start);
    if(value!=null)result.setHours(Math.floor(value/60),value%60,0,0);else result.setHours(0,0,0,0);
    return result;
  }
  function estimate(config,query={}){
    const normalized=normalizeConfig(config),now=query.at instanceof Date?query.at:new Date(query.at||Date.now()),fromNames=aliasNames(query.from,query.aliases),toNames=aliasNames(query.to,query.aliases),matches=[];
    for(const service of normalized.services.filter(service=>service.active&&(!query.serviceId||service.id===query.serviceId))){
      for(const occurrence of collectOccurrences(service,{now,horizonDays:query.horizonDays||180,limit:200})){
        const fromIndex=stopIndex(occurrence.stops,fromNames),toIndex=stopIndex(occurrence.stops,toNames);
        if(fromIndex<0||toIndex<0||fromIndex>=toIndex)continue;
        const estimatedAt=occurrenceDate(occurrence,occurrence.stops[toIndex]);if(estimatedAt<now)continue;
        matches.push({kind:'estimate',serviceId:service.id,serviceTitle:service.title,occurrenceId:occurrence.id,date:occurrence.iso,period:occurrence.period,fromStop:occurrence.stops[fromIndex],toStop:occurrence.stops[toIndex],estimatedAt:estimatedAt.toISOString()});
      }
    }
    matches.sort((a,b)=>Date.parse(a.estimatedAt)-Date.parse(b.estimatedAt));
    return matches[0]||null;
  }
  async function read(){
    const registered=window.PMKHomeWidgets?.storage?.get('planning-services/config');
    if(registered?.read){const snapshot=await registered.read();return normalizeConfig(snapshot?.data?snapshot.data():snapshot);}
    const api=window.PMKNativeData;if(!api)throw new Error('Stockage natif Koha indisponible.');
    const snapshot=await api.getDoc(api.doc(api.createDatabase('planning'),'planning','config'));
    return normalizeConfig(snapshot?.exists?.()?snapshot.data():{});
  }

  window.PMKPlanningCommon=Object.freeze({normalizeConfig,collectOccurrences,estimate,read,key});
})(window);
