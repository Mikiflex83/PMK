const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/appointments-consistency.json');

(async()=>{
  let definition=null,pageSource='';
  const sandbox={window:{PMKPages:{register:value=>{definition=value;}}}};sandbox.window.window=sandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'138-pages/138-page-appointments.js'),'utf8'),sandbox,{filename:'138-page-appointments.js'});
  await definition.mount({}, {mountLegacyHtml:async(_container,value)=>{pageSource=value;}});
  const widgetSource=fs.readFileSync(path.join(ROOT,'137-widgets/137-widget-doodle-koha.js'),'utf8');
  const checks={
    pageBookingTransaction:pageSource.includes('await runTransaction(db, async tx =>')&&pageSource.includes('const slotSnap = await tx.get(slotRef)')&&pageSource.includes('const existingBooking = await tx.get(bookingRef)'),
    pageLiveCapacity:pageSource.includes('Number(slotSnap.data().confirmedCount || 0) >= Number(slotSnap.data().capacity || 1)'),
    approvalCapacityTransaction:pageSource.includes('if (current >= capacity)')&&pageSource.includes('confirmedCount:current + 1'),
    cancellationTransaction:pageSource.includes('bookingSnap.data().status !== "approved"')&&pageSource.includes('confirmedCount: Math.max(0, current - 1)'),
    recurrenceDeterministic:pageSource.includes('const occurrenceId = (`occ_${String(ruleId)')&&pageSource.includes('collectionName("slots")), occurrenceId'),
    recurrenceExceptions:pageSource.includes('excludedDates')&&pageSource.includes('if (existing.has(occurrenceKey)) continue'),
    notificationSeparated:pageSource.includes('Demande enregistrée. La notification est traitée séparément.')&&pageSource.includes('sendEmailQuietly'),
    widgetBookingTransaction:widgetSource.includes('await doodleStore.transact(async transaction =>')&&widgetSource.includes('Number(currentSlot.confirmedCount || 0)'),
    widgetBusinessSuccessIndependent:widgetSource.includes("La notification à l’équipe est traitée séparément et n’annule pas cet enregistrement en cas d’échec."),
    widgetEmptyDistinctFromError:widgetSource.includes('Aucun créneau disponible pour le moment.')&&widgetSource.includes('Données de rendez-vous indisponibles'),
    widgetSourceErrorsTracked:widgetSource.includes('state.errors.slots = error')&&widgetSource.includes('state.errors.themes = error')&&widgetSource.includes('state.errors.bookings = error')
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Contrats page et widget : transactions natives Koha, récurrence idempotente et états vide/erreur distincts.'},null,2)+'\n');
  console.log('PASS appointments concurrency, cancellation, recurrence and widget states');
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
