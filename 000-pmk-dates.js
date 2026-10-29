/* Dates communes Koha : dates impossibles refusées, ordre local explicite,
   fuseau respecté lorsqu’il est fourni. Le défaut historique reste jour/mois. */
(function(){
 'use strict';
 if(window.PMKDates)return;
 function order(options={}){
  const values=[options.order,window.dateformat,window.DateFormat,window.kohaDateFormat,document.documentElement.dataset.dateformat,document.body?.dataset.dateformat];
  for(const value of values){const text=String(value||'').toLowerCase();if(['us','mdy','mm/dd/yyyy'].includes(text))return {value:'mdy',source:'koha'};if(['metric','dmy','dd/mm/yyyy','dd.mm.yyyy'].includes(text))return {value:'dmy',source:'koha'};}
  return {value:'dmy',source:'historical-default'};
 }
 function inspect(value,options={}){
  if(value instanceof Date)return Number.isNaN(value.getTime())?{status:'invalid',date:null}:{status:'ok',date:new Date(value),source:'date',ambiguous:false};
  const raw=String(value??'').replace(/\u00a0/g,' ').trim();if(!raw)return {status:'empty',date:null};
  // Extract one complete date from a Koha label; refuse multiple dates or partial identifiers.
  const pattern=/(?<![\d\p{L}])(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})(?:[T ]+\d{1,2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:\s*(?:Z|[+-]\d{2}:?\d{2}|AM|PM))?)?(?![\d\p{L}])/giu;
  const matches=[...raw.matchAll(pattern)];if(matches.length!==1)return {status:matches.length?'ambiguous':'invalid',date:null};
  const text=matches[0][0];if(options.exact&&text!==raw)return {status:'invalid',date:null};
  const remainder=raw.slice(matches[0].index+text.length);
  if(/^(?:[:.]\d|\s*[+-]\d|\s+\d+:)/.test(remainder))return {status:'invalid',date:null};
  const m=text.match(/^(\d+)[-/.](\d+)[-/.](\d+)(?:[T ]+(\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?\s*(Z|[+-]\d{2}:?\d{2}|AM|PM)?)?$/i);if(!m)return {status:'invalid',date:null};
  let year,month,day,source='iso',dateOrder='ymd',ambiguous=false;const a=Number(m[1]),b=Number(m[2]),c=Number(m[3]);
  if(m[1].length===4){year=a;month=b;day=c;}else{year=c;const chosen=order(options);source=chosen.source;dateOrder=a>12?'dmy':b>12?'mdy':chosen.value;ambiguous=a<=12&&b<=12&&a!==b&&chosen.source==='historical-default';month=dateOrder==='mdy'?a:b;day=dateOrder==='mdy'?b:a;}
  let hour=Number(m[4]||0),minute=Number(m[5]||0),second=Number(m[6]||0),ms=Number((m[7]||'').padEnd(3,'0').slice(0,3)),zone=(m[8]||'').toUpperCase();
  if(zone==='AM'||zone==='PM'){if(hour<1||hour>12)return {status:'invalid',date:null};hour=hour%12+(zone==='PM'?12:0);zone='';}
  if(year<1000||year>9999||month<1||month>12||day<1||day>31||hour>23||minute>59||second>59)return {status:'invalid',date:null};
  const validation=new Date(Date.UTC(year,month-1,day,hour,minute,second,ms));if(validation.getUTCMonth()!==month-1||validation.getUTCDate()!==day)return {status:'invalid',date:null};
  let date;
  if(zone){let offset=0;if(zone!=='Z'){const z=zone.match(/^([+-])(\d{2}):?(\d{2})$/);if(!z||Number(z[2])>14||Number(z[3])>59||(Number(z[2])===14&&Number(z[3])!==0))return {status:'invalid',date:null};offset=(Number(z[2])*60+Number(z[3]))*(z[1]==='-'?-1:1);}date=new Date(validation.getTime()-offset*60000);}
  else{date=new Date(year,month-1,day,hour,minute,second,ms);if(date.getHours()!==hour||date.getMinutes()!==minute)return {status:'invalid',date:null};}
  return {status:ambiguous?'assumed':'ok',date,source,ambiguous,order:dateOrder};
 }
 const api={version:'1.0.0',inspect,parse:(value,options)=>inspect(value,options).date,order};window.PMKDates=api;window.PMKConfig?.services.register('dates',api);
})();
