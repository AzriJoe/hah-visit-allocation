const PURPOSES = [
  'IV antibiotics','Labs','ECG','Bladder scan','Nebuliser',
  'Assess wound','PICC dressing change','Neutron change'
];

const state = { cases: [], nurses: [], schedule: [] };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const validPostal = p => /^\d{6}$/.test(p || '');
const toMinutes = t => {
  if (!t) return null;
  const [h,m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fmtTime = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const uid = prefix => prefix + Math.random().toString(36).slice(2,8);

function tomorrowISO(){
  const d = new Date();
  d.setDate(d.getDate()+1);
  return d.toISOString().slice(0,10);
}
function dayName(){
  const v = $('#assignmentDate').value;
  if(!v) return '';
  return new Date(v+'T12:00:00').toLocaleDateString('en-SG',{weekday:'long'});
}
function updateDayRule(){
  const d = dayName();
  const start = ['Monday','Wednesday'].includes(d) ? '09:30' : '09:00';
  $('#dayRule').textContent = d ? `${d}: earliest day-shift visit ${start}` : '';
}
function patientLabel(c){
  const bed = (c.bed || '').trim();
  const initials = (c.initials || '').trim().toUpperCase();
  if(bed || initials) return `Bed ${bed || '—'}${initials ? ` – ${initials}` : ''}`;
  return 'New visit';
}
function regionForPostal(postal){
  if(!validPostal(postal)) return '';
  const sector = Number(postal.slice(0,2));
  const westSectors = new Set([
    5,11,12,13,21,22,23,24,58,59,60,61,62,63,64,65,66,67,68,69,70,71
  ]);
  return westSectors.has(sector) ? 'West' : 'Rest of Singapore';
}
function newCase(data={}){
  return {
    id: data.id || uid('c'), bed: data.bed || '', initials: (data.initials || '').toUpperCase(),
    postal: data.postal || '', type: data.type || 'Fixed', session: data.session || 'Any',
    timing: data.timing || 'Flexible', exact: data.exact || '', earliest: data.earliest || '', latest: data.latest || '',
    category: data.category || 'Standard', purposes: data.purposes || [], other: data.other || '',
    duration: Number(data.duration) || 45, customDuration: !!data.customDuration,
    notes: data.notes || '', assignedNurseId: data.assignedNurseId || '', lat: data.lat || null, lng: data.lng || null,
    address: data.address || '', geoError: data.geoError || '', allocationStatus: data.allocationStatus || 'Active',
    replacementForId: data.replacementForId || '', replacedById: data.replacedById || '', struckOffAt: data.struckOffAt || ''
  };
}
function newNurse(data={}){
  return {
    id: data.id || uid('n'), name: data.name || '', shift: data.shift || 'DAY',
    startPostal: data.startPostal || $('#basePostal').value || '', max: Number(data.max) || 4,
    lat: data.lat || null, lng: data.lng || null
  };
}

function makePurposeChips(container, selected, onChange){
  PURPOSES.forEach(p => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (selected.includes(p) ? ' selected' : '');
    b.textContent = p;
    b.onclick = () => {
      b.classList.toggle('selected');
      onChange([...container.querySelectorAll('.chip.selected')].map(x => x.textContent));
    };
    container.appendChild(b);
  });
}

function renderCases(){
  const root = $('#caseList');
  root.innerHTML = '';
  state.cases.forEach(c => {
    const el = $('#caseTemplate').content.firstElementChild.cloneNode(true);
    el.dataset.id = c.id;
    const get = cl => el.querySelector(cl);
    get('.case-bed').value = c.bed;
    get('.case-initials').value = c.initials;
    get('.case-postal').value = c.postal;
    get('.case-type').value = c.type;
    get('.case-session').value = c.session;
    get('.case-timing').value = c.timing;
    get('.case-category').value = c.category;
    const assignedSelect = get('.case-assigned');
    state.nurses.forEach(n => {
      const o=document.createElement('option'); o.value=n.id; o.textContent=n.name||'Unnamed nurse'; assignedSelect.appendChild(o);
    });
    assignedSelect.value=c.assignedNurseId||'';
    get('.case-exact').value = c.exact;
    get('.case-earliest').value = c.earliest;
    get('.case-latest').value = c.latest;
    get('.case-other').value = c.other;
    get('.case-custom-duration').value = c.customDuration ? c.duration : '';
    get('.case-notes').value = c.notes;
    get('.patient-id-display').textContent = patientLabel(c);

    const region = regionForPostal(c.postal);
    if(region === 'West') el.classList.add('region-west');
    else if(region) el.classList.add('region-other');
    const regionBadge = get('.region-badge');
    if(region){
      regionBadge.textContent = region;
      regionBadge.classList.add(region === 'West' ? 'west' : 'other');
    } else {
      regionBadge.textContent = 'Enter a valid postal code';
    }
    get('.geo-status').textContent = c.address ? `✓ ${c.address}` : c.geoError ? `⚠ ${c.geoError}` : '';

    const chips = get('.purpose-chips');
    makePurposeChips(chips,c.purposes,v=>{c.purposes=v;save(false)});

    const updateIdentity = () => { get('.patient-id-display').textContent = patientLabel(c); };
    const bind = (cl,key,cast=x=>x,extra=()=>{}) => get(cl).addEventListener('input',e=>{
      c[key] = cast(e.target.value);
      extra();
      save(false);
    });
    bind('.case-bed','bed',x=>x,updateIdentity);
    bind('.case-initials','initials',x=>x.toUpperCase(),updateIdentity);
    bind('.case-postal','postal',x=>x.replace(/\D/g,'').slice(0,6),()=>{
      c.lat=c.lng=null;c.address='';c.geoError='';
      el.classList.remove('region-west','region-other');
      regionBadge.classList.remove('west','other');
      const updatedRegion=regionForPostal(c.postal);
      if(updatedRegion==='West'){
        el.classList.add('region-west');regionBadge.classList.add('west');regionBadge.textContent='West';
      }else if(updatedRegion){
        el.classList.add('region-other');regionBadge.classList.add('other');regionBadge.textContent='Rest of Singapore';
      }else regionBadge.textContent='Enter a valid postal code';
      get('.geo-status').textContent='';
    });
    bind('.case-type','type');
    bind('.case-session','session');
    bind('.case-category','category');
    get('.case-assigned').addEventListener('change',e=>{c.assignedNurseId=e.target.value;save(false)});
    bind('.case-exact','exact');
    bind('.case-earliest','earliest');
    bind('.case-latest','latest');
    bind('.case-other','other');
    bind('.case-notes','notes');

    const updateTiming = () => {
      get('.exact-field').classList.toggle('hidden',c.timing !== 'Exact time');
      el.querySelectorAll('.window-field').forEach(x=>x.classList.toggle('hidden',c.timing !== 'Time window'));
    };
    get('.case-timing').addEventListener('change',e=>{c.timing=e.target.value;updateTiming();save(false)});
    updateTiming();

    const customField = get('.custom-duration-field');
    const customButton = get('.custom-duration-button');
    const durationButtons = [...el.querySelectorAll('.duration-chip[data-minutes]')];
    const syncDurationUI = () => {
      durationButtons.forEach(b=>b.classList.toggle('selected',!c.customDuration && Number(b.dataset.minutes)===Number(c.duration)));
      customButton.classList.toggle('selected',c.customDuration);
      customField.classList.toggle('hidden',!c.customDuration);
    };
    durationButtons.forEach(b=>b.onclick=()=>{
      c.duration=Number(b.dataset.minutes); c.customDuration=false; syncDurationUI(); save(false);
    });
    customButton.onclick=()=>{c.customDuration=true; if(!c.duration)c.duration=90; get('.case-custom-duration').value=c.duration; syncDurationUI(); save(false)};
    get('.case-custom-duration').addEventListener('input',e=>{c.duration=Math.max(10,Number(e.target.value)||10);c.customDuration=true;save(false)});
    syncDurationUI();

    get('.remove').onclick = () => {state.cases=state.cases.filter(x=>x.id!==c.id);renderCases();save(false)};
    root.appendChild(el);
  });
  $('#caseCount').textContent = `${state.cases.length} visit${state.cases.length===1?'':'s'}`;
}

function renderNurses(){
  const root = $('#nurseList'); root.innerHTML='';
  state.nurses.forEach(n=>{
    const el=$('#nurseTemplate').content.firstElementChild.cloneNode(true);
    const get=cl=>el.querySelector(cl);
    get('.nurse-name').value=n.name;
    get('.nurse-shift').value=n.shift;
    get('.nurse-start').value=n.startPostal;
    get('.nurse-max').value=n.max;
    get('.nurse-name').addEventListener('input',e=>{n.name=e.target.value;save(false)});
    get('.nurse-shift').addEventListener('change',e=>{n.shift=e.target.value;save(false)});
    get('.nurse-start').addEventListener('input',e=>{n.startPostal=e.target.value.replace(/\D/g,'').slice(0,6);n.lat=n.lng=null;save(false)});
    get('.nurse-max').addEventListener('input',e=>{n.max=Number(e.target.value)||4;save(false)});
    get('.remove').onclick=()=>{state.nurses=state.nurses.filter(x=>x.id!==n.id);renderNurses();save(false)};
    root.appendChild(el);
  });
  $('#nurseCount').textContent=`${state.nurses.length} nurse${state.nurses.length===1?'':'s'}`;
}

function importBulk(){
  const lines=$('#bulkInput').value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  for(const line of lines){
    const p=line.split(/[\t,]/).map(x=>x.trim());
    let bed='',initials='',postal='';
    if(p.length===1){postal=p[0]}
    else if(p.length>=3){bed=p[0].replace(/^bed\s*/i,'');initials=p[1];postal=p[2]}
    else {bed=p[0].replace(/^bed\s*/i,'');postal=p[1]}
    state.cases.push(newCase({bed,initials,postal}));
  }
  $('#bulkInput').value='';
  renderCases(); save(false);
}

async function geocodePostal(postal,token){
  if(!validPostal(postal)) throw new Error('Invalid 6-digit postal code');
  if(!token) throw new Error('OneMap token required for live routing');
  const url=`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(postal)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
  if(!r.ok) throw new Error(`OneMap search failed (${r.status})`);
  const j=await r.json();
  if(!j.results?.length) throw new Error('Postal code not found');
  const x=j.results.find(v=>v.POSTAL===postal)||j.results[0];
  return {lat:Number(x.LATITUDE),lng:Number(x.LONGITUDE),address:[x.BLK_NO,x.ROAD_NAME,x.BUILDING].filter(Boolean).join(' ')};
}
function haversine(a,b){
  const R=6371,toR=x=>x*Math.PI/180,dLat=toR(b.lat-a.lat),dLon=toR(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(toR(a.lat))*Math.cos(toR(b.lat))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}
async function route(a,b,token){
  if(!a||!b) return {minutes:20,km:null,source:'fallback'};
  try{
    const u=`https://www.onemap.gov.sg/api/public/routingsvc/route?start=${a.lat},${a.lng}&end=${b.lat},${b.lng}&routeType=drive`;
    const r=await fetch(u,{headers:token?{Authorization:`Bearer ${token}`}:{}});
    if(!r.ok) throw new Error();
    const j=await r.json();
    return {minutes:Math.max(5,Math.ceil(Number(j.route_summary.total_time)/60)),km:Number(j.route_summary.total_distance)/1000,source:'OneMap'};
  }catch{
    const km=haversine(a,b);
    return {minutes:Math.max(8,Math.ceil(km/30*60*1.25)),km,source:'estimate'};
  }
}

function shiftRules(n){
  const monWed=['Monday','Wednesday'].includes(dayName());
  if(n.shift==='DAY') return {start:monWed?570:540,end:960,breakStart:675,breakEnd:795,breakDur:60,label:'Lunch'};
  if(n.shift==='PM12') return {start:780,end:1260,breakStart:975,breakEnd:1170,breakDur:90,label:'Dinner'};
  return {start:840,end:1320,breakStart:1035,breakEnd:1230,breakDur:90,label:'Dinner'};
}
function sessionCompatible(c,n){
  if(c.session==='Any') return true;
  if(n.shift==='DAY') return c.session!=='Evening';
  return c.session!=='AM';
}
function preferredStart(c,n,r){
  if(c.timing==='Exact time'&&c.exact) return toMinutes(c.exact);
  if(c.timing==='Time window'&&c.earliest) return toMinutes(c.earliest);
  if(n.shift==='DAY'){
    if(c.session==='AM') return r.start;
    if(c.session==='PM') return 795;
  } else {
    if(c.session==='Evening') return r.breakEnd;
    return r.start;
  }
  return r.start;
}
function allocationPenalty(c,n,p,travelMinutes){
  let score=travelMinutes + p.visits.length*15;
  if(regionForPostal(c.postal)==='West' && p.westCount===0 && p.visits.length>0) score+=35;
  if(regionForPostal(c.postal)!=='West' && p.westCount>0 && p.visits.length>0) score+=35;
  if(p.visits.length>=n.max) score+=400;
  if(p.visits.length===4 && !(c.category==='Short/simple'||c.duration<=30)) score+=250;
  return score;
}

async function generate(){
  const active=state.cases.filter(c=>c.type!=='Cancelled');
  if(!state.nurses.length||!active.length){alert('Add at least one nurse and one active visit.');return}
  $('#generateBtn').disabled=true; $('#generateBtn').textContent='Calculating…';
  const token=$('#oneMapToken').value.trim();
  const geos=[...active,...state.nurses].filter(x=>validPostal(x.postal||x.startPostal));
  for(const x of geos){
    if(x.lat&&x.lng) continue;
    const p=x.postal||x.startPostal;
    try{Object.assign(x,await geocodePostal(p,token));x.geoError=''}catch(e){x.geoError=e.message}
  }
  renderCases();
  const plans=state.nurses.map(n=>({nurse:n,visits:[],events:[],rules:shiftRules(n),loc:n.lat?{lat:n.lat,lng:n.lng}:null,totalTravel:0,totalKm:0,westCount:0}));
  const ordered=[...active].sort((a,b)=>{
    const ra=a.timing==='Exact time'?0:a.timing==='Time window'?1:2;
    const rb=b.timing==='Exact time'?0:b.timing==='Time window'?1:2;
    return ra-rb || preferredStart(a,{shift:'DAY'},shiftRules({shift:'DAY'}))-preferredStart(b,{shift:'DAY'},shiftRules({shift:'DAY'}));
  });
  for(const c of ordered){
    let candidates=c.assignedNurseId ? plans.filter(p=>p.nurse.id===c.assignedNurseId) : plans.filter(p=>sessionCompatible(c,p.nurse));
    if(!candidates.length)candidates=plans.filter(p=>sessionCompatible(c,p.nurse));
    if(!candidates.length)candidates=plans;
    let best=null;
    for(const p of candidates){
      const tr=await route(p.loc,c.lat?{lat:c.lat,lng:c.lng}:null,token);
      const score=allocationPenalty(c,p.nurse,p,tr.minutes);
      if(!best||score<best.score)best={p,tr,score};
    }
    best.p.visits.push({case:c});
    if(regionForPostal(c.postal)==='West')best.p.westCount++;
    best.p.loc=c.lat?{lat:c.lat,lng:c.lng}:best.p.loc;
  }
  for(const p of plans){
    p.loc=p.nurse.lat?{lat:p.nurse.lat,lng:p.nurse.lng}:null;
    p.cursor=p.rules.start;
    p.events=[];
    p.breakPlaced=false;
    const seq=[...p.visits].sort((a,b)=>preferredStart(a.case,p.nurse,p.rules)-preferredStart(b.case,p.nurse,p.rules));
    for(const v of seq){
      const tr=await route(p.loc,v.case.lat?{lat:v.case.lat,lng:v.case.lng}:null,token);
      let desired=preferredStart(v.case,p.nurse,p.rules);
      let start=Math.max(p.cursor+tr.minutes,desired);
      if(!p.breakPlaced && start>=p.rules.breakStart && p.cursor<=p.rules.breakEnd-p.rules.breakDur){
        const bs=Math.max(p.rules.breakStart,p.cursor);
        p.events.push({type:'break',start:bs,end:bs+p.rules.breakDur,label:p.rules.label});
        p.cursor=bs+p.rules.breakDur;p.breakPlaced=true;
        start=Math.max(p.cursor+tr.minutes,desired);
      }
      if(tr.minutes){
        p.events.push({type:'travel',start:p.cursor,end:p.cursor+tr.minutes,label:`Travel${tr.km?` · ${tr.km.toFixed(1)} km`:''}`});
        p.totalTravel+=tr.minutes;if(tr.km)p.totalKm+=tr.km;
      }
      start=Math.max(start,p.cursor+tr.minutes);
      if(v.case.timing==='Exact time'&&v.case.exact)start=toMinutes(v.case.exact);
      if(v.case.timing==='Time window'&&v.case.earliest)start=Math.max(start,toMinutes(v.case.earliest));
      const end=start+Number(v.case.duration);
      p.events.push({type:'visit',start,end,label:patientLabel(v.case),case:v.case});
      p.cursor=end;p.loc=v.case.lat?{lat:v.case.lat,lng:v.case.lng}:p.loc;
    }
    if(!p.breakPlaced){
      const latestStart=p.rules.breakEnd-p.rules.breakDur;
      const bs=Math.max(p.rules.breakStart,Math.min(p.cursor,latestStart));
      p.events.push({type:'break',start:bs,end:bs+p.rules.breakDur,label:p.rules.label});
    }
    p.events.sort((a,b)=>a.start-b.start);
  }
  state.schedule=plans;
  renderSchedule();save(false);
  $('#generateBtn').disabled=false;$('#generateBtn').textContent='Generate';
}

function openTab(name){
  $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));
  $$('.tab-panel').forEach(x=>x.classList.toggle('active',x.id===name));
}
function addAdhocForNurse(nurseId, replacementForId=''){
  const original=state.cases.find(c=>c.id===replacementForId);
  const c=newCase({
    type:'Ad hoc', assignedNurseId:nurseId, replacementForId,
    session:original?.session||'Any', timing:original?.timing||'Flexible',
    exact:original?.exact||'', earliest:original?.earliest||'', latest:original?.latest||'',
    duration:original?.duration||45, category:original?.category||'Standard',
    notes:replacementForId?`Replacement for ${patientLabel(original)}`:''
  });
  state.cases.push(c);
  if(original){original.replacedById=c.id;}
  save(false);renderCases();openTab('cases');
  requestAnimationFrame(()=>document.querySelector(`[data-id="${c.id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}));
}
function strikeOffVisit(caseId, replace=false){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  c.allocationStatus='Struck off';c.type='Cancelled';c.struckOffAt=new Date().toISOString();
  const nurseId=c.assignedNurseId || state.schedule.find(p=>p.events?.some(e=>e.type==='visit'&&e.case?.id===caseId))?.nurse?.id || '';
  state.schedule.forEach(p=>{
    const event=p.events?.find(e=>e.type==='visit'&&e.case?.id===caseId);
    if(event){event.case=c;event.struckOff=true;}
  });
  save(false);renderCases();renderSchedule();
  if(replace)addAdhocForNurse(nurseId,caseId);
}
function renderSchedule(){
  const root=$('#scheduleList');root.innerHTML='';
  const warnings=[];let assigned=0,totalTravel=0;
  for(const p of state.schedule){
    const activeVisitEvents=(p.events||[]).filter(e=>e.type==='visit' && (state.cases.find(c=>c.id===e.case?.id)?.type||e.case?.type)!=='Cancelled');
    assigned+=activeVisitEvents.length;totalTravel+=p.totalTravel;
    const card=document.createElement('section');card.className='schedule-card';
    const head=document.createElement('div');head.className='schedule-head';
    head.innerHTML=`<div><h3>${p.nurse.name||'Unnamed nurse'}</h3><span>${activeVisitEvents.length} active visit${activeVisitEvents.length===1?'':'s'}</span></div>`;
    const addBtn=document.createElement('button');addBtn.className='secondary small-btn';addBtn.textContent='+ Ad hoc visit';addBtn.onclick=()=>addAdhocForNurse(p.nurse.id);head.appendChild(addBtn);
    card.dataset.nurseId=p.nurse.id;card.appendChild(head);
    const tl=document.createElement('div');tl.className='timeline';
    for(const e of p.events){
      const row=document.createElement('div');row.className='timeline-row';
      let detail=e.label;
      if(e.type==='visit'){
        const liveCase=state.cases.find(c=>c.id===e.case.id)||e.case; e.case=liveCase;
        const purposes=[...(liveCase.purposes||[]),...(liveCase.other?[liveCase.other]:[])].join(', ')||'Visit';
        const region=regionForPostal(liveCase.postal);
        const struck=liveCase.allocationStatus==='Struck off'||liveCase.type==='Cancelled';
        row.classList.toggle('struck-off',struck);
        const eventBox=document.createElement('div');eventBox.className=`event ${e.type}`;
        eventBox.innerHTML=`<div class="visit-main"><span>${patientLabel(liveCase)}</span>${struck?'<span class="status-pill">Struck off</span>':''}</div><small>${purposes} · ${liveCase.postal||'No postal'} · ${liveCase.duration} min · ${liveCase.type} · ${region||'Region unavailable'}</small>`;
        if(!struck){
          const actions=document.createElement('div');actions.className='visit-actions';
          const strike=document.createElement('button');strike.className='danger-outline mini-btn';strike.textContent='Strike off';strike.onclick=()=>strikeOffVisit(liveCase.id,false);
          const replace=document.createElement('button');replace.className='secondary mini-btn';replace.textContent='Strike off & replace';replace.onclick=()=>strikeOffVisit(liveCase.id,true);
          actions.append(strike,replace);eventBox.appendChild(actions);
        }
        row.innerHTML=`<div class="time">${fmtTime(e.start)}–${fmtTime(e.end)}</div>`;row.appendChild(eventBox);
      }else{
        row.innerHTML=`<div class="time">${fmtTime(e.start)}–${fmtTime(e.end)}</div><div class="event ${e.type}">${detail}</div>`;
      }
      tl.appendChild(row);
    }
    card.appendChild(tl);root.appendChild(card);

    const visits=p.events.filter(e=>e.type==='visit' && (state.cases.find(c=>c.id===e.case?.id)?.type||e.case?.type)!=='Cancelled');
    const last=visits.at(-1);
    if(p.nurse.shift==='DAY'&&last&&last.end>960)warnings.push(`${p.nurse.name||'Unnamed nurse'}: last visit ends ${fmtTime(last.end)}, after 16:00.`);
    const activeCases=visits.map(v=>state.cases.find(c=>c.id===v.case?.id)||v.case);
    const fifthAllowed=activeCases.length===5&&activeCases.some(c=>c.category==='Short/simple'||c.duration<=30);
    if(activeCases.length===5&&!fifthAllowed)warnings.push(`${p.nurse.name||'Unnamed nurse'}: fifth visit has no short/simple 15–30 minute visit.`);
    if(activeCases.length>5)warnings.push(`${p.nurse.name||'Unnamed nurse'}: more than five visits assigned.`);
    const br=p.events.find(e=>e.type==='break');
    if(!br||br.start<p.rules.breakStart||br.end>p.rules.breakEnd)warnings.push(`${p.nurse.name||'Unnamed nurse'}: ${p.rules.label.toLowerCase()} is outside the preferred window.`);
    for(const e of visits){
      if(e.case.timing==='Time window'&&e.case.latest&&e.end>toMinutes(e.case.latest))warnings.push(`${e.label}: exceeds the entered time window.`);
    }
  }
  const active=state.cases.filter(c=>c.type!=='Cancelled').length;
  $('#summary').innerHTML=[
    ['Active visits',active],['Assigned',assigned],['Nurses',state.nurses.length],['Travel',`${Math.floor(totalTravel/60)}h ${totalTravel%60}m`]
  ].map(([a,b])=>`<div class="summary-box"><strong>${b}</strong><span>${a}</span></div>`).join('');
  $('#warnings').innerHTML=warnings.length?warnings.map(w=>`<div class="warning">⚠ ${w}</div>`).join(''):'<div class="warning good">✓ No major scheduling warnings detected.</div>';
  const filter=$('#nurseViewFilter');
  if(filter){
    const current=filter.value;filter.innerHTML='<option value="">All nurses</option>';
    state.schedule.forEach(p=>{const o=document.createElement('option');o.value=p.nurse.id;o.textContent=p.nurse.name||'Unnamed nurse';filter.appendChild(o)});
    filter.value=[...filter.options].some(o=>o.value===current)?current:'';
    const apply=()=>root.querySelectorAll('.schedule-card').forEach(c=>c.classList.toggle('hidden',!!filter.value&&c.dataset.nurseId!==filter.value));
    filter.onchange=apply;apply();
  }
}

function csvEscape(value){
  const s=String(value??'');
  return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
}
function exportCSV(){
  if(!state.schedule.length){alert('Generate an allocation first.');return}
  const rows=[['Nurse','Shift','Start','End','Activity','Patient','Postal Code','Purpose','Duration','Visit Type','Status']];
  for(const p of state.schedule){
    for(const e of p.events){
      if(e.type==='visit'){
        const purpose=[...(e.case.purposes||[]),...(e.case.other?[e.case.other]:[])].join('; ');
        const liveCase=state.cases.find(c=>c.id===e.case.id)||e.case;
        rows.push([p.nurse.name,p.nurse.shift,fmtTime(e.start),fmtTime(e.end),'Visit',patientLabel(liveCase),liveCase.postal,purpose,liveCase.duration,liveCase.type,liveCase.allocationStatus||'Active']);
      }else rows.push([p.nurse.name,p.nurse.shift,fmtTime(e.start),fmtTime(e.end),e.label,'','','','','','']);
    }
  }
  const blob=new Blob([rows.map(r=>r.map(csvEscape).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`hah-visit-allocation-${$('#assignmentDate').value||'schedule'}.csv`;a.click();URL.revokeObjectURL(a.href);
}

function save(show=true){
  const data={cases:state.cases,nurses:state.nurses,schedule:state.schedule,date:$('#assignmentDate').value,base:$('#basePostal').value,token:$('#oneMapToken').value};
  localStorage.setItem('hahVisitAllocation',JSON.stringify(data));
  if(show)alert('Saved on this device.');
}
function load(){
  try{
    const d=JSON.parse(localStorage.getItem('hahVisitAllocation'));
    if(d){
      state.cases=(d.cases||[]).map(x=>newCase(x));
      state.nurses=(d.nurses||[]).map(x=>newNurse(x));
      state.schedule=Array.isArray(d.schedule)?d.schedule:[];
      $('#assignmentDate').value=d.date||tomorrowISO();$('#basePostal').value=d.base||'';$('#oneMapToken').value=d.token||'';
    }else{
      $('#assignmentDate').value=tomorrowISO();state.nurses=[newNurse({name:'Nurse A'}),newNurse({name:'Nurse B'})];
    }
  }catch{
    $('#assignmentDate').value=tomorrowISO();state.nurses=[newNurse({name:'Nurse A'}),newNurse({name:'Nurse B'})];
  }
  updateDayRule();renderCases();renderNurses();renderSchedule();
}

$$('.tab').forEach(b=>b.onclick=()=>openTab(b.dataset.tab));
$('#assignmentDate').addEventListener('change',()=>{updateDayRule();save(false)});
$('#basePostal').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,6);save(false)});
$('#importBtn').onclick=importBulk;
$('#addCaseBtn').onclick=()=>{state.cases.push(newCase());renderCases();save(false)};
$('#clearCasesBtn').onclick=()=>{if(confirm('Clear all visits?')){state.cases=[];renderCases();save(false)}};
$('#addNurseBtn').onclick=()=>{state.nurses.push(newNurse());renderNurses();save(false)};
$('#generateBtn').onclick=generate;
$('#resetAllocationBtn').onclick=()=>{
  if(!state.schedule.length && !state.cases.some(c=>c.assignedNurseId)){
    alert('There is no nurse assignment to reset.');
    return;
  }
  if(confirm('Reset all nurse assignments? Visit details and the nurse roster will be kept.')){
    state.schedule=[];
    state.cases.forEach(c=>{c.assignedNurseId=''});
    renderCases();
    renderSchedule();
    save(false);
    alert('Nurse assignments have been reset.');
  }
};
$('#printBtn').onclick=()=>{if(!state.schedule.length){alert('Generate an allocation first.');return}window.print()};
$('#csvBtn').onclick=exportCSV;
$('#saveBtn').onclick=()=>save(true);
$('#loadSampleBtn').onclick=()=>{$('#bulkInput').value='12, JT, 529510\n8, MS, 460123\n27, KL, 651234\n31, AR, 760145\n5, BN, 618231'};
window.addEventListener('beforeunload',()=>save(false));
load();
