/* ===================================================================
   Role workspaces: each role gets a desk built around its next action.
   Kỹ thuật → nhận máy + việc sửa · Kế toán → báo giá, hợp đồng, thu tiền
   Quản trị → tổng quan chi phí, hợp đồng, phê duyệt · Kho → nhận/xuất hàng
   =================================================================== */
const ROLE_NAV = {
  manager:['home','todo','tickets','contracts','finance','stock','customers','reports'],
  dev:['home','todo','tickets','contracts','finance','stock','customers','reports'],
  engineer:['home','tickets','stock','rma'],
  warehouse:['home','stock','tickets','rma'],
  accountant:['home','contracts','finance','customers','reports'],
  agent:['home','tickets','contracts'], enduser:['home','tickets','contracts'],
};
const isDeskRole = u => u && ['engineer','warehouse','accountant'].includes(u.role);
const isBossRole = u => u && ['manager','dev'].includes(u.role);
const _navItems0 = navItems;
navItems = function(u=me()){
  const all=_navItems0(u); if(S._fullNav) return all;
  const pref=ROLE_NAV[u.role]; if(!pref) return all;
  const main=pref.map(k=>all.find(n=>n.k===k)).filter(Boolean).map(n=>n.k==='home'?Object.assign({},n,{l:isBossRole(u)?t('nav_overview'):isDeskRole(u)?t('nav_desk'):n.l}):n);
  const rest=all.filter(n=>!pref.includes(n.k));
  if(rest.length) main.push({k:'more', l:t('nav_more'), more:rest});
  return main;
};
const _drawer0 = drawer; drawer = function(u){ S._fullNav=true; try{ return _drawer0(u); } finally{ S._fullNav=false; } };
const _topbar0 = topbar;
topbar = function(u){
  let html=_topbar0(u);
  const more=navItems(u).find(n=>n.k==='more'); if(!more) return html;
  const act=activeNavKey(); const on=more.more.some(n=>n.k===act);
  const pop = S.ui.pop==='more' ? `<div class="popover nav-more">${more.more.map(n=>`<button class="item ${act===n.k?'on':''}" data-a="nav" data-k="${n.k}">${esc(n.l)}</button>`).join('')}</div>` : '';
  html = html.replace(/<button class="[^"]*" data-a="nav" data-k="more">([^<]*)<\/button>/, (_m,l)=>`<span class="nav-more-wrap"><button class="${on?'on':''}" data-a="nav" data-k="more" aria-haspopup="menu" aria-expanded="${S.ui.pop==='more'}">${l} <span class="caret">▾</span></button>${pop}</span>`);
  return html;
};
const _navA = A.nav; A.nav = (el,ev) => { if(el.dataset.k==='more'){ S.ui.pop = S.ui.pop==='more'?null:'more'; rerender(); return; } S.ui.pop=null; _navA(el,ev); };

const _viewHome0 = viewHome;
viewHome = function(){ const u=me(); if(u.role==='engineer') return homeTech(u); if(u.role==='accountant') return homeAcc(u); if(u.role==='warehouse') return homeWh(u); if(isBossRole(u)) return homeBoss(u); return _viewHome0(); };

/* ---------- shared desk bits ---------- */
const firstName = u => (u.name||'').trim().split(/\s+/).slice(-1)[0]||u.name||'';
const dayAge = ts => { const d=Math.floor((Date.now()-ts)/D); return d<=0? t('d_today') : t('d_ago',{n:d}); };
function deskHead(u,sub,actions){ const d=new Date();
  return `<div class="desk-head"><div><div class="desk-date">${['CN','T2','T3','T4','T5','T6','T7'].at(d.getDay())}, ${fmtD(Date.now())}</div><h1>${t('desk_hi',{n:esc(firstName(u))})}</h1><div class="sub">${sub}</div></div><div class="row">${actions||''}</div></div>`; }
function lane(title,items,card,opts){ opts=opts||{};
  return `<section class="lane ${opts.tone?'tone-'+opts.tone:''}"><header><span class="lane-t">${title}</span><span class="lane-n">${items.length}</span>${opts.sum?`<span class="lane-sum">${opts.sum}</span>`:''}</header>
    <div class="lane-body">${items.length? items.slice(0,opts.max||8).map(card).join('') + (items.length>(opts.max||8)?`<button class="lane-more" data-a="${opts.moreA||'nav'}" data-k="${opts.moreK||''}">${t('see_more',{n:items.length-(opts.max||8)})}</button>`:'') : `<div class="lane-empty">${ic('check',16)} ${opts.empty||t('lane_clear')}</div>`}</div></section>`; }
const kcard = (x,btn,meta) => `<article class="kc"><button class="kc-main" data-a="openTicket" data-id="${x.id}"><span class="kc-top"><span class="mono">${x.no}</span><span class="kc-age">${dayAge(x.updatedAt||x.createdAt)}</span></span><b>${esc(x.title)}</b><span class="kc-sub mono">${esc(x.products[0].sn)}</span><span class="kc-tags">${meta||''}</span></button>${btn||''}</article>`;
const bigStat = (l,v,sub,tone,a) => `<button class="bstat ${tone?'t-'+tone:''}" ${a||'data-a="noop"'}><span class="l">${l}</span><span class="v">${v}</span>${sub?`<span class="s">${sub}</span>`:''}</button>`;

/* ================= KỸ THUẬT ================= */
function homeTech(u){
  const f=S.ui.tech||(S.ui.tech={mine:false,q:''});
  let vt=visibleTickets(u).filter(x=>!['closed','cancelled','rejected','draft'].includes(x.status));
  if(f.mine) vt=vt.filter(x=>x.assigneeId===u.id||!x.assigneeId);
  const by=ss=>vt.filter(x=>ss.includes(x.status)).sort((a,b)=>a.createdAt-b.createdAt);
  const recv=vt.filter(x=>!x.intake&&['unassigned','diagnosing','returned'].includes(x.status));
  const diag=by(['diagnosing','returned']).filter(x=>x.intake);
  const wait=by(['pending']); const fix=by(['approved','in_service','on_hold']); const out=by(['testing','delivered','return_pending']);
  const w=x=>{ const d=devBySn(x.products[0].sn); return (x.type&&x.type!=='TN'?`<span class="chip">${esc(stName(x.type))}</span>`:wPill(d,x.createdAt)); };
  const go=(x,label,op)=>`<button class="kc-act" ${op?`data-a="wf" data-op="${op}" data-id="${x.id}"`:`data-a="openTicket" data-id="${x.id}"`}>${label} →</button>`;
  const q=f.q.trim(); const hits = q.length>=2 ? rxSearch(q,u).slice(0,6) : [];
  const low=(DB.stock||[]).filter(s=>s.qty<s.min).slice(0,5);
  return `${deskHead(u, t('tech_sub',{a:diag.length,b:fix.length}), `<label class="mine-t"><input type="checkbox" data-bind="tech.mine" data-re ${f.mine?'checked':''}> ${t('only_mine')}</label>`)}
  <section class="rx-hero card">
    <div class="rx-l"><div class="rx-ic">${ic('box',26)}</div><div><h2>${t('rx_title')}</h2><p>${t('rx_desc')}</p></div></div>
    <div class="rx-r"><div class="rx-search">${ic('search',18)}<input class="input" id="rx-q" data-bind="tech.q" data-live value="${esc(f.q)}" placeholder="${t('rx_ph')}" autocomplete="off"></div><button class="btn primary rx-go" data-a="rxOpen">${ic('plus',18)} ${t('rx_btn')}</button></div>
    ${hits.length?`<div class="rx-hits">${hits.map(d=>`<button class="rx-hit" data-a="rxOpen" data-sn="${esc(d.sn)}"><span class="mono">${esc(d.sn)}</span><b>${esc(d.model)}</b><span>${esc(custName(d.customerId))}</span>${wPill(d)}<span class="go">${t('rx_this')} →</span></button>`).join('')}</div>`:q.length>=2?`<div class="rx-hits"><div class="muted" style="padding:10px">${t('rx_none')}</div></div>`:''}
  </section>
  <div class="lanes">
    ${lane(t('ln_recv'),recv,x=>kcard(x,go(x,t('act_recv')),w(x)),{tone:'warn',empty:t('ln_recv_e')})}
    ${lane(t('ln_diag'),diag,x=>kcard(x,go(x,t('act_diag')),w(x)),{tone:'violet'})}
    ${lane(t('ln_fix'),fix,x=>kcard(x, x.status==='approved'?go(x,t('act_start'),'start'):go(x,x.status==='on_hold'?t('act_resume'):t('act_finish_fix')), tkPill(x)),{tone:'blue'})}
    ${lane(t('ln_out'),out,x=>kcard(x,go(x,x.status==='testing'?t('act_test'):t('act_handover')),tkPill(x)),{tone:'green'})}
  </div>
  ${low.length?`<div class="card desk-note"><div class="card-h"><h3>${ic('alert',16)} ${t('parts_low')}</h3><button class="link-btn" data-a="stkLow">${t('see_all')}</button></div><div class="card-b chips-row">${low.map(s=>`<span class="chip">${esc(s.pn)} · ${esc(s.name)} <b style="margin-left:6px;color:var(--bad)">${fmtNum(s.qty)}</b></span>`).join('')}</div></div>`:''}`;
}
function rxSearch(q,u){ const low=q.toLowerCase(); return (DB.devices||[]).filter(d=>inScope(d.customerId,u)&&(d.sn+' '+d.model+' '+custName(d.customerId)+' '+(d.project||'')).toLowerCase().includes(low)); }

/* ---- Nhận máy: 3-step wizard → phiếu sửa chữa + biên bản nhận hàng ---- */
A.rxOpen = el => { const sn=(el&&el.dataset&&el.dataset.sn)||''; const q=sn||((S.ui.tech||{}).q||'').trim();
  const d=sn?devBySn(sn):(rxSearch(q,me()).length===1?rxSearch(q,me())[0]:null);
  openModal({type:'rx', f:{ step:d?2:1, q:d?'':q, sn:d?d.sn:'', method:'walkin', desc:'', pri:'medium', cond:'ok', condNote:'', acc:{}, other:'', loc:'', print:true, signA:'', signB:'' }}); if(!d) S._focus='rx-q2'; };
MODALS.rx = m => { const f=m.f; const u=me(); const d=rxDev(f); const c=rxCust(f,d);
  const stepper=`<div class="rx-steps">${[t('rx_s1'),t('rx_s2'),t('rx_s3')].map((l,i)=>`<span class="${f.step===i+1?'on':f.step>i+1?'done':''}"><i>${f.step>i+1?'✓':i+1}</i>${l}</span>`).join('')}</div>`;
  let body='', foot='';
  if(f.step===1&&f.nd){ body=stepper+rxNdForm(f); foot=`<button class="btn" data-a="rxNdCancel">← ${t('back')}</button><button class="btn primary" data-a="rxNdNext">${t('next')} →</button>`; }
  else if(f.step===1){ const hits=f.q.trim().length>=2?rxSearch(f.q.trim(),u).slice(0,8):[]; const sq=f.q.trim().toUpperCase(); const serialLike=SN_RE.test(sq)&&!devBySn(sq);
    body=`${stepper}<div class="field"><label for="rx-q2">${t('rx_find')}</label><div class="rx-search">${ic('search',18)}<input class="input" id="rx-q2" data-bind="modal.f.q" data-live value="${esc(f.q)}" placeholder="${t('rx_ph')}" autocomplete="off"></div></div>
      <div class="rx-list">${hits.map(d=>`<button class="rx-hit" data-a="rxPick" data-sn="${esc(d.sn)}"><span class="mono">${esc(d.sn)}</span><b>${esc(d.model)}</b><span>${esc(custName(d.customerId))}</span>${wPill(d)}</button>`).join('')||`<div class="muted" style="padding:6px 2px">${f.q.trim().length>=2?t('rx_none'):t('rx_type')}</div>`}</div>
      <div class="rx-new">${serialLike?`<button class="btn primary" data-a="rxNewDev" data-sn="${esc(sq)}">${ic('plus',15)} ${t('rx_new_sn',{sn:esc(sq)})}</button>`:''}<button class="link-btn" data-a="rxNewDev" data-sn="${serialLike?esc(sq):''}">${t('rx_not_in_db')}</button></div>`;
    foot=`<button class="btn" data-a="closeModal">${t('cancel')}</button>`; }
  if(f.step>=2&&d){ const rw=repairWarranty(d.sn); const past=DB.tickets.filter(x=>x.products.some(p=>p.sn===d.sn)); const openT=past.filter(x=>isOpen(x)&&x.status!=='draft');
    const devCard=`<div class="rx-dev"><div><span class="mono">${esc(d.sn)}</span> <b>${esc(d.model)}</b> ${rwPill(rw)} ${d.isNew?`<span class="pill k1">${t('rx_badge_newdev')}</span>`:''} ${f.newCust&&d.customerId==='__new'?`<span class="pill k5">${t('rx_badge_newcust')}</span>`:''}</div><div class="muted">${esc(c?c.company:'—')}${d.project?' · '+esc(d.project):''}</div><div class="muted" style="font-size:12px">${rw?`${t('warranty_end')}: ${fmtD(rw.end)} (${esc(rw.c.no)})`:t('w_unknown_long')}${past.length?` · ${t('rx_past',{n:past.length})}`:''}</div>${openT.length?`<div class="rx-dup">${ic('alert',15)} ${t('rx_dup',{n:openT.length})} ${openT.map(x=>`<button class="link-btn mono" data-a="openTicketClose" data-id="${x.id}">${x.no}</button> ${tkPill(x)}`).join(' ')}</div>`:''}${f.step===2?`<button class="link-btn" data-a="rxBack1">${t('rx_change')}</button>`:''}</div>`;
    if(f.step===2){
      body=`${stepper}${devCard}<div class="form-grid" style="margin-top:14px">
        <div class="field full"><label class="req" for="rx-d">${t('rx_issue')}</label><textarea class="textarea" id="rx-d" data-bind="modal.f.desc" style="min-height:70px" placeholder="${t('rx_issue_ph')}">${esc(f.desc)}</textarea></div>
        <div class="field"><span class="lbl">${t('intake_method')}</span><div class="seg wrap">${INTAKE_METHODS.map(x=>`<button class="${f.method===x?'on':''}" data-a="rxSet" data-k="method" data-v="${x}">${t('im_'+x)}</button>`).join('')}</div></div>
        <div class="field"><span class="lbl">${t('priority')}</span><div class="seg">${['high','medium','low'].map(x=>`<button class="${f.pri===x?'on':''}" data-a="rxSet" data-k="pri" data-v="${x}">${t('p_'+x)}</button>`).join('')}</div></div>
        <div class="field full"><span class="lbl">${t('intake_cond')}</span><div class="chip-pick">${CONDITIONS.map(x=>`<button class="${f.cond===x?'on':''} ${OUT_OF_SCOPE.includes(x)?'warn':''}" data-a="rxSet" data-k="cond" data-v="${x}">${t('cd_'+x)}</button>`).join('')}</div>${OUT_OF_SCOPE.includes(f.cond)?`<div class="hint" style="color:var(--warn)">${t('cond_oos_hint')}</div>`:''}</div>
        <div class="field full"><div class="row" style="justify-content:space-between"><span class="lbl">${t('rx_acc')}</span><button class="link-btn" data-a="rxAllAcc">${t('ho_all_yes')}</button></div><div class="chip-pick">${HO_CHECKS.receive.map((l,i)=>{ const k=String.fromCharCode(97+i); return `<button class="${f.acc[k]?'on':''}" data-a="rxAcc" data-k="${k}">${f.acc[k]?'✓ ':''}${esc(l)}</button>`; }).join('')}</div></div>
        <div class="field"><label for="rx-o">${t('rx_other')}</label><input class="input" id="rx-o" data-bind="modal.f.other" value="${esc(f.other)}" placeholder="${t('intake_acc_ph')}"></div>
        <div class="field"><label for="rx-l">${t('intake_loc')}</label><input class="input" id="rx-l" data-bind="modal.f.loc" value="${esc(f.loc)}" placeholder="${t('intake_loc_ph')}"></div>
      </div>`;
      foot=`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="rxNext">${t('next')} →</button>`; }
    if(f.step===3){ const sug=rxSuggest(d,f.cond);
      body=`${stepper}${devCard}<div class="rx-sum"><div><span>${t('rx_issue')}</span><b>${esc(f.desc)}</b></div><div><span>${t('intake_cond')}</span><b>${t('cd_'+f.cond)}</b></div><div><span>${t('rx_acc')}</span><b>${Object.keys(f.acc).filter(k=>f.acc[k]).length} / ${HO_CHECKS.receive.length}${f.other?' · '+esc(f.other):''}</b></div><div><span>${t('rx_suggest')}</span><b>${sug==='RW'?t('cls_rw'):sug==='PR'?t('cls_pr'):t('cls_unknown')}</b></div></div>
        <div class="ho-parties" style="margin-top:14px">${[['A',t('rx_sign_cust'),c?c.contact:''],['B',t('rx_sign_sge'),u.name]].map(([k,l,n])=>`<div class="ho-party"><div class="row" style="justify-content:space-between"><b>${l}</b><button class="btn sm ghost" data-a="hoSigClear" data-k="${k}">${t('ho_clear_sig')}</button></div><canvas class="sig-pad" data-sig="${k}" aria-label="${t('ho_sign_here')}"></canvas><div class="hint" style="text-align:center">${esc(n||'')}</div></div>`).join('')}</div>
        <label class="row" style="gap:8px;margin-top:12px;cursor:pointer"><input type="checkbox" data-bind="modal.f.print" ${f.print?'checked':''}> ${t('rx_print')}</label>`;
      foot=`<button class="btn" data-a="rxBack2">← ${t('back')}</button><button class="btn primary" data-a="rxSave">${ic('check',16)} ${t('rx_save')}</button>`; }
  }
  return { wide:true, title:t('rx_title'), body, foot };
};
A.rxPick = el => { const f=S.ui.modal.f; f.sn=el.dataset.sn; f.step=2; S._focus='rx-d'; rerender(); };
A.rxBack1 = () => { const f=S.ui.modal.f; f.step=1; if(f.newDev){ f.nd=true; } else { f.q=f.sn; f.sn=''; } rerender(); };
A.rxBack2 = () => { S.ui.modal.f.step=2; rerender(); };
A.rxSet = el => { S.ui.modal.f[el.dataset.k]=el.dataset.v; rerender(); };
A.rxAcc = el => { const a=S.ui.modal.f.acc; a[el.dataset.k]=!a[el.dataset.k]; rerender(); };
A.rxAllAcc = () => { const a=S.ui.modal.f.acc; HO_CHECKS.receive.forEach((_,i)=>a[String.fromCharCode(97+i)]=true); rerender(); };
A.rxNext = () => { const f=S.ui.modal.f; if(!String(f.desc||'').trim()){ toast(t('rx_need_issue'),'bad'); S._focus='rx-d'; rerender(); return; } f.step=3; rerender(); };
A.rxSave = () => { const f=S.ui.modal.f, u=me(); let d=rxDev(f); if(!d) return; const now=Date.now();
  if(d.isNew){ if(devBySn(d.sn)&&DB.devices.some(x=>x.sn===d.sn)){ toast(t('e_key_exists'),'bad'); return; }
    if(d.customerId==='__new'){ const nc=Object.assign({ id:'c'+now.toString(36), distributorId:'' }, f.newCust); DB.customers.push(nc); d.customerId=nc.id; }
    const dev={ sn:d.sn, model:d.model, pn:d.pn||'', customerId:d.customerId, distributorId:(custById(d.customerId)||{}).distributorId||null, project:d.project||'', province:(custById(d.customerId)||{}).province||'', shipDate:d.shipDate, startDate:d.startDate, installDate:null, warrantyYears:d.warrantyYears, extended:false, unknownW:!!d.unknownW, addedAt:now, addedBy:u.id };
    DB.devices.push(dev); d=dev; f.newDev=null; f.sn=dev.sn; }
  const c=custById(d.customerId)||{};
  const x={ id:'tn'+now, no:nextNo('TN'), type:'TN', status:'draft', source:'npp', priority:f.pri, vital:false, distributorId:d.distributorId||null, assigneeId:null, createdBy:u.id, creator:{name:u.name,email:u.email,role:u.role}, centerId:'sge', centerHistory:[], customerId:d.customerId,
    customer:{company:c.company||'',contact:c.contact||'',phone:c.phone||'',email:c.email||''}, project:d.project||'', province:d.province||c.province||'', address:c.address||'', products:[{sn:d.sn,model:d.model,qty:1}],
    faultCode:'', faultTime:null, description:f.desc.trim(), diagnosis:null,
    intake:{ method:f.method, date:toISODate(now), cond:f.cond, condNote:'', acc:[...HO_CHECKS.receive.filter((_,i)=>f.acc[String.fromCharCode(97+i)]),f.other].filter(Boolean).join(', '), loc:f.loc, at:now, by:u.id },
    parts:[], test:null, delivery:null, approval:null, attachments:[], internal:[], conversation:[], history:[], feedback:null, rmaId:null, createdAt:now, updatedAt:now, closedAt:null, customerTicketNo:'' };
  x.title=`${(d.project||c.company||'').split(' – ')[0]} ${d.model}`.trim();
  x.history.push({at:now,by:u.id,action:'created',from:null,to:'draft',note:''});
  if(can('ticket_diagnose',u)){ x.assigneeId=u.id; logH(x,'received',u.id,'draft','diagnosing'); } else { logH(x,'received',u.id,'draft','unassigned'); notify({toRole:'manager',key:'n_unassigned',vars:{no:x.no},ticketId:x.id}); }
  if(x.customerId) notify({toCustomer:x.customerId,key:'n_received',vars:{no:x.no},ticketId:x.id});
  DB.tickets.unshift(x);
  const h=Object.assign({ id:'ho'+now.toString(36), createdBy:u.id, createdAt:now }, hoDraft('receive',{kind:'ticket',id:x.id}));
  HO_CHECKS.receive.forEach((_,i)=>{ const k=String.fromCharCode(97+i); h.checks[k]=f.acc[k]?'yes':''; }); if(OUT_OF_SCOPE.includes(f.cond)) h.checkNotes={c:t('cd_'+f.cond)};
  h.other=f.other; h.signA=f.signA||''; h.signB=f.signB||''; DB.handovers=DB.handovers||[]; DB.handovers.unshift(h);
  S.ui.modal=null; if(S.ui.tech) S.ui.tech.q=''; save(); rerender(); toast(t('rx_done',{no:x.no}),'ok'); if(f.print) hoPrint(h); };

/* ================= KẾ TOÁN ================= */
function homeAcc(u){
  const ms=monthStartTs(); const led=cashLedger(u);
  const inM=led.filter(r=>r.dir==='in'&&r.at>=ms).reduce((s,r)=>s+r.amount,0), outM=led.filter(r=>r.dir==='out'&&r.at>=ms).reduce((s,r)=>s+r.amount,0);
  const sv=visibleSvc(u).filter(c=>c.status!=='cancelled'); const tk=c=>ticketById(c.ticketId);
  const toQuote=sv.filter(c=>c.status==='quote'); const toSign=sv.filter(c=>c.status==='sent');
  const toInv=sv.filter(c=>{ const x=tk(c); return x&&x.status==='delivered'&&!c.invoice&&docTotal(c)>0; });
  const ar=arDocs(u); const arTot=ar.reduce((s,x)=>s+docDue(x),0); const od=ar.filter(x=>soById(x.id)&&isOverdue(x));
  const exp=(DB.expenses||[]).filter(e=>e.status==='approved');
  const ccard=(c,btns)=>{ const x=tk(c); return `<article class="kc"><button class="kc-main" data-a="qdOpen" data-id="${c.id}"><span class="kc-top"><span class="mono">${c.no}</span><span class="kc-age">${dayAge(c.at)}</span></span><b>${esc(custName(c.customerId))}</b><span class="kc-sub">${esc(c.model||'')} · <span class="mono">${esc(c.sn||'')}</span>${x?` · ${x.no}`:''}</span><span class="kc-tags"><b class="num">${money(docTotal(c))}</b> ${c.warranty?`<span class="chip">${t('warranty_job')}</span>`:''}</span></button>${btns}</article>`; };
  const dcard=d=>{ const svc=!!svcById(d.id); const late=!svc&&isOverdue(d); return `<article class="kc ${late?'late':''}"><button class="kc-main" data-a="nav" data-k="${svc?'sc':'so'}:${d.id}"><span class="kc-top"><span class="mono">${d.no}</span>${late?`<span class="pill k4">${t('overdue')}</span>`:`<span class="kc-age">${dayAge(d.at)}</span>`}</span><b>${esc(custName(d.customerId))}</b><span class="kc-tags"><span>${t('remaining')}</span> <b class="num" style="color:var(--bad)">${money(docDue(d))}</b></span></button><button class="kc-act" data-a="payAsk" data-id="${d.id}">${t('record_payment')} →</button></article>`; };
  return `${deskHead(u, t('acc_sub',{a:toQuote.length,b:toInv.length,c:ar.length}), `<button class="btn" data-a="exNew">${ic('plus',15)} ${t('new_expense')}</button><button class="btn primary" data-a="soNewAsk">${ic('plus',15)} ${t('new_sale')}</button>`)}
  <div class="bstats">${bigStat(t('receivable_total'),moneyS(arTot),od.length?t('n_overdue',{n:od.length}):t('n_docs',{n:ar.length}),od.length?'bad':'', 'data-a="nav" data-k="finance"')}${bigStat(t('in_month'),moneyS(inM),'','ok','data-a="nav" data-k="finance"')}${bigStat(t('out_month'),moneyS(outM),'','', 'data-a="nav" data-k="finance"')}${bigStat(t('quotes_open'),fmtNum(toQuote.length+toSign.length),t('quote_split',{a:toQuote.length,b:toSign.length}),'blue','data-a="nav" data-k="contracts"')}</div>
  <div class="lanes">
    ${lane(t('ln_quote'),toQuote,c=>ccard(c,`<button class="kc-act" data-a="qdOpen" data-id="${c.id}">${t('act_quote')} →</button>`),{tone:'violet',empty:t('ln_quote_e')})}
    ${lane(t('ln_sign'),toSign,c=>ccard(c,`<button class="kc-act" data-a="tkSign" data-id="${c.ticketId}">${t('act_mark_signed')} →</button>`),{tone:'muted'})}
    ${lane(t('ln_invoice'),toInv,c=>ccard(c,`<button class="kc-act" data-a="tkInvoice" data-id="${c.ticketId}">${t('issue_invoice')} →</button>`),{tone:'blue'})}
    ${lane(t('ln_collect'),ar,dcard,{tone:'warn',sum:moneyS(arTot),moreK:'finance'})}
    ${lane(t('ln_payout'),exp,e=>`<article class="kc"><div class="kc-main"><span class="kc-top"><span class="mono">${e.no}</span><span class="kc-age">${fmtD(e.at)}</span></span><b>${esc(L(e.desc))}</b><span class="kc-sub">${t('ec_'+e.cat)} · ${esc(uname(e.by))}</span><span class="kc-tags"><b class="num">${money(e.amount)}</b></span></div><button class="kc-act" data-a="exSet" data-id="${e.id}" data-s="paid">${t('mark_paid')} →</button></article>`,{tone:'green',empty:t('ln_payout_e'),moreK:'finance'})}
  </div>`;
}
/* ---- quote panel: everything needed to price a job on one screen ---- */
A.qdOpen = el => openModal({type:'qd', id:el.dataset.id});
MODALS.qd = m => { const c=svcById(m.id); if(!c) return {title:'—',body:''}; const x=ticketById(c.ticketId); const d=devBySn(c.sn); const mg=can('svc_manage'); const editable=mg&&c.status==='quote';
  const dg=x&&x.diagnosis; const intake=x&&x.intake;
  const left=`<div class="qd-info">
    <div class="qd-blk"><span>${t('customer')}</span><b>${esc(custName(c.customerId))}</b></div>
    <div class="qd-blk"><span>${t('serial_model')}</span><b><span class="mono">${esc(c.sn)}</span> · ${esc(c.model||'')}</b>${d?`<div style="margin-top:4px">${wPill(d,x?x.createdAt:undefined)}</div>`:''}</div>
    <div class="qd-blk"><span>${t('classify')}</span><b>${c.warranty?t('cls_rw'):t('cls_pr')}</b></div>
    ${intake?`<div class="qd-blk"><span>${t('intake_cond')}</span><b>${t('cd_'+intake.cond)}</b></div>`:''}
    ${dg?`<div class="qd-blk"><span>${t('npp_diagnosis')}</span><p class="quote" style="margin:4px 0 0">${esc(L(dg.text))}</p></div>`:''}
    ${x?`<button class="btn sm" data-a="openTicketClose" data-id="${x.id}">${t('open_job')} ${x.no} →</button>`:''}</div>`;
  const presets=editable?`<div class="qd-presets"><span class="lbl">${t('qd_quick')}</span>${QD_PRESETS.map((p,i)=>`<button class="btn sm soft" data-a="qdPreset" data-id="${c.id}" data-i="${i}">+ ${esc(p.vi)}${p.price?` · ${moneyS(p.price)}`:''}</button>`).join('')}</div>`:'';
  const acts=[]; if(mg&&c.status==='quote') acts.push(`<button class="btn primary" data-a="svcGo" data-id="${c.id}" data-s="sent">${ic('send',15)} ${t('act_send_quote')}</button>`);
  if(mg&&c.status==='sent'&&x) acts.push(`<button class="btn primary" data-a="tkSign" data-id="${x.id}">${ic('check',15)} ${t('act_mark_signed')}</button>`);
  if(mg&&['quote','sent'].includes(c.status)&&x) acts.push(`<button class="btn danger" data-a="tkDeclineAsk" data-id="${x.id}">${t('customer_declined')}</button>`);
  return { wide:true, title:`${t('qd_title')} · <span class="mono" style="font-weight:500">${c.no}</span> ${svcPillC(c)}`, body:`<div class="qd">${left}<div class="qd-main">${presets}${editable?itemsEditor('svc',c):svcItemsTable(c)}</div></div>`,
    foot:`<button class="btn" data-a="qdPrint" data-id="${c.id}">${ic('file',15)} ${t('qd_print')}</button><span class="grow"></span><button class="btn" data-a="closeModal">${t('close')}</button>${acts.join('')}` }; };
const QD_PRESETS=[ {type:'labor',vi:'Công kiểm tra, sửa chữa',price:1500000}, {type:'labor',vi:'Công thay board',price:800000}, {type:'other',vi:'Phí đi lại kỹ thuật viên',price:500000}, {type:'other',vi:'Phí vận chuyển 2 chiều',price:400000}, {type:'part',vi:'Linh kiện',price:0} ];
A.qdPreset = el => { const c=svcById(el.dataset.id); const st=edState('svc',c); const p=QD_PRESETS[+el.dataset.i]; const free=c.warranty&&p.type!=='other';
  st.items.push(p.type==='part'?{type:'part',pn:'',desc:'',qty:1,price:0}:{type:p.type,desc:p.vi,qty:1,price:free?0:p.price}); rerender(); };
A.openTicketClose = el => { S.ui.modal=null; openTicket(el.dataset.id); };
A.qdPrint = el => { const c=svcById(el.dataset.id); if(S.ui['ed_'+c.id]) edCommit(c.id); save(); printDoc(quoteHtml(c), c.no); };
function quoteHtml(c){ const cu=custById(c.customerId)||{}; const e=s=>esc(s==null?'':s);
  return `<div class="a4"><table class="hd"><tr><td style="width:24%;text-align:center"><img src="${ASSETS.logo}" alt="SGE" style="height:46px"></td><td style="text-align:center"><div class="t1">BÁO GIÁ DỊCH VỤ SỬA CHỮA</div><div class="t1">SERVICE QUOTATION</div></td><td style="width:30%">Số/No: ${e(c.no)}<br>Ngày/Date: ${fmtD(c.at)}</td></tr></table>
  <p style="margin:10px 0 2px"><b>Kính gửi:</b> ${e(String(cu.company||'').toUpperCase())}</p><p style="margin:0">Địa chỉ: ${e(cu.address)} · SĐT: ${e(cu.phone)}</p>
  <p style="margin:6px 0">Thiết bị: <b>${e(c.model)}</b> · Serial: <b>${e(c.sn)}</b> · ${c.warranty?'Trong bảo hành':'Sửa chữa tính phí'}</p>
  <table class="grid"><tr><th style="width:6%">STT</th><th>Hạng mục</th><th style="width:9%">SL</th><th style="width:18%">Đơn giá</th><th style="width:18%">Thành tiền</th></tr>
  ${c.items.map((it,i)=>`<tr><td class="c">${i+1}</td><td>${it.pn?e(it.pn)+' · ':''}${e(L(it.desc))}</td><td class="c">${e(it.qty)}</td><td style="text-align:right">${fmtNum(it.price)}</td><td style="text-align:right">${fmtNum(lineTotal(it))}</td></tr>`).join('')}
  <tr><td colspan="4" style="text-align:right">Cộng tiền hàng</td><td style="text-align:right">${fmtNum(docSubtotal(c))}</td></tr><tr><td colspan="4" style="text-align:right">VAT (${c.vat||0}%)</td><td style="text-align:right">${fmtNum(docVat(c))}</td></tr><tr><td colspan="4" style="text-align:right"><b>TỔNG CỘNG (VNĐ)</b></td><td style="text-align:right"><b>${fmtNum(docTotal(c))}</b></td></tr></table>
  <p class="agree"><i>Báo giá có hiệu lực ${c.validDays||15} ngày. Bảo hành sửa chữa ${c.repairWarrantyMonths||6} tháng cho linh kiện đã thay. Thanh toán chuyển khoản: TK 67852068 – MB Bank (CN Thuận An), CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ SGE.</i></p>
  <table class="sign"><tr><td>XÁC NHẬN CỦA KHÁCH HÀNG</td><td>ĐẠI DIỆN SGE</td></tr><tr><td class="s"></td><td class="s"></td></tr><tr><td></td><td><b>${e(String(uname(c.createdBy)).toUpperCase())}</b></td></tr></table>
  <div class="ft"><span>SGE TRADING AND SERVICE CO., LTD · 0364422429 · sge.company2026@gmail.com</span><span>1</span></div></div>`; }
function printDoc(inner,title){ const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4;margin:0}body{margin:0;background:#fff}${HO_CSS}</style></head><body>${inner}</body></html>`;
  const fr=document.createElement('iframe'); fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(fr);
  const d=fr.contentWindow.document; d.open(); d.write(html); d.close(); setTimeout(()=>{ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ toast(t('ho_print_fail'),'bad'); } setTimeout(()=>fr.remove(),2000); },350); }

/* ================= KHO ================= */
function homeWh(u){
  const pos=(DB.purchases||[]).filter(p=>p.status==='ordered'); const low=(DB.stock||[]).filter(s=>s.qty<s.min).sort((a,b)=>a.qty/a.min-b.qty/b.min);
  const need=(DB.tickets||[]).filter(x=>(x.wh&&['new','pending','approved'].includes(x.wh.status))||(x.ret&&x.ret.status==='new')).sort((a,b)=>({new:0,approved:1,pending:2}[(a.wh&&a.wh.status)]??3)-({new:0,approved:1,pending:2}[(b.wh&&b.wh.status)]??3));
  const rmas=typeof visibleRmas==='function'?visibleRmas(u).filter(r=>['requested','repairing'].includes(r.status)):[];
  const val=(DB.stock||[]).reduce((s,x)=>s+x.qty*x.cost,0); const mv7=(DB.moves||[]).filter(m=>m.at>=Date.now()-7*D).length;
  return `${deskHead(u, t('wh_sub',{a:pos.length,b:low.length}), `<button class="btn" data-a="mvAsk" data-t="out">${ic('upload',15)} ${t('stock_out')}</button><button class="btn" data-a="mvAsk" data-t="in">${ic('download',15)} ${t('stock_in')}</button><button class="btn primary" data-a="rxOpen">${ic('plus',15)} ${t('rx_btn')}</button>`)}
  <div class="bstats">${bigStat(t('wh_req_open'),fmtNum(need.length),'',need.length?'bad':'','data-a="stkReq"')}${bigStat(t('stock_value'),moneyS(val),t('n_items_s',{n:(DB.stock||[]).length}),'','data-a="nav" data-k="stock"')}${bigStat(t('low_stock'),fmtNum(low.length),'',low.length?'bad':'','data-a="stkLow"')}${bigStat(t('po_open'),fmtNum(pos.length),'','blue','data-a="nav" data-k="stock"')}</div>
  <div class="lanes">
    ${lane(t('ln_po'),pos,p=>`<article class="kc"><button class="kc-main" data-a="nav" data-k="po:${p.id}"><span class="kc-top"><span class="mono">${p.no}</span><span class="kc-age">${t('expected_at')} ${fmtD(p.expectedAt)}</span></span><b>${esc((supById(p.supplierId)||{}).name||'')}</b><span class="kc-sub">${t('items_n',{n:p.items.length})}</span></button><button class="kc-act" data-a="whRecv" data-id="${p.id}">${t('act_receive_check')} →</button></article>`,{tone:'blue',empty:t('ln_po_e')})}
    ${lane(t('ln_issue'),need,x=>whCard(x),{tone:'violet',empty:t('ln_issue_e')})}
    ${lane(t('ln_low'),low,s=>`<article class="kc"><div class="kc-main"><span class="kc-top"><span class="mono">${esc(s.pn)}</span><span class="pill ${s.qty<=0?'k4':'k2'}">${fmtNum(s.qty)} / ${fmtNum(s.min)}</span></span><b>${esc(s.name)}</b><span class="kc-sub">${esc((supById(s.supplierId)||{}).name||'')}</span></div><button class="kc-act" data-a="poNewAsk">${t('new_po')} →</button></article>`,{tone:'warn'})}
  </div>`;
}
A.whRecv = el => { if(typeof waStartPo==='function') waStartPo(el.dataset.id); else openTab('po:'+el.dataset.id); };

/* ================= QUẢN TRỊ: TỔNG QUAN ================= */
function homeBoss(u){
  const ms=monthStartTs(); const led=cashLedger(u);
  const inM=led.filter(r=>r.dir==='in'&&r.at>=ms).reduce((s,r)=>s+r.amount,0), outM=led.filter(r=>r.dir==='out'&&r.at>=ms).reduce((s,r)=>s+r.amount,0);
  const ar=arDocs(u); const arTot=ar.reduce((s,x)=>s+docDue(x),0); const od=(DB.orders||[]).filter(isOverdue);
  const sv=(DB.svc||[]).filter(c=>!['cancelled','declined'].includes(c.status)); const so=(DB.orders||[]).filter(c=>c.status!=='cancelled');
  const openVal=[...sv,...so].filter(d=>d.status!=='done').reduce((s,d)=>s+docTotal(d),0);
  const months=monthsBack(6); const inS=months.map(mo=>led.filter(r=>r.dir==='in'&&r.at>=mo.start&&r.at<mo.end).reduce((s,r)=>s+r.amount,0)); const outS=months.map(mo=>led.filter(r=>r.dir==='out'&&r.at>=mo.start&&r.at<mo.end).reduce((s,r)=>s+r.amount,0));
  /* approvals */
  const pendExp=(DB.expenses||[]).filter(e=>e.status==='pending'); const pendQuote=sv.filter(c=>c.status==='quote'); const draftPo=(DB.purchases||[]).filter(p=>p.status==='draft'); const unassigned=DB.tickets.filter(x=>x.status==='unassigned');
  /* pipeline */
  const stages=[['quote',t('cb_quote'),sv.filter(c=>c.status==='quote')],['sent',t('cb_sent'),sv.filter(c=>c.status==='sent')],['signed',t('ps_running'),sv.filter(c=>['signed','in_progress'].includes(c.status))],['so',t('ps_sales'),so.filter(c=>['draft','confirmed','delivered'].includes(c.status))],['due',t('ps_due'),[...sv,...so].filter(d=>d.status==='done'&&docDue(d)>0)]];
  const stMax=Math.max(1,...stages.map(s=>s[2].reduce((a,d)=>a+docTotal(d),0)));
  /* cost watch */
  const sns=[...new Set(DB.tickets.map(x=>x.products[0].sn))].map(snCost).filter(k=>k.total>0).sort((a,b)=>(a.revenue-a.total)-(b.revenue-b.total)).slice(0,5);
  const expCat=EXP_CATS.map(cat=>({label:t('ec_'+cat),value:(DB.expenses||[]).filter(e=>e.cat===cat&&e.at>=monthsBack(3)[0].start&&e.status!=='rejected').reduce((s,e)=>s+e.amount,0)})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
  /* operations */
  const vt=DB.tickets; const opsDef=[['ln_recv',x=>!x.intake&&['unassigned','diagnosing','returned'].includes(x.status)],['ln_diag',x=>x.intake&&['diagnosing','returned'].includes(x.status)],['ops_parts',x=>x.status==='pending'&&!partsApproved(x)],['ops_cust',x=>x.status==='pending'&&partsApproved(x)],['ln_fix',x=>['approved','in_service','on_hold'].includes(x.status)],['ops_test',x=>x.status==='testing'&&!isReady(x)],['ops_ready',x=>isReady(x)||x.status==='return_pending']];
  const sla=vt.filter(x=>isOpen(x)&&slaBreached(x)); const low=(DB.stock||[]).filter(s=>s.qty<s.min);
  const net=inM-outM;
  return `${deskHead(u, t('boss_sub'), `<button class="btn" data-a="nav" data-k="reports">${ic('chart',15)} ${t('nav_reports')}</button><button class="btn" data-a="nav" data-k="finance">${t('nav_finance')}</button>`)}
  <div class="bstats five">${bigStat(t('in_month'),moneyS(inM),'','ok','data-a="nav" data-k="finance"')}${bigStat(t('out_month'),moneyS(outM),'','','data-a="nav" data-k="finance"')}${bigStat(t('net_month'),(net<0?'−':'')+moneyS(Math.abs(net)),t('net_hint'),net>=0?'ok':'bad','data-a="nav" data-k="finance"')}${bigStat(t('receivable_total'),moneyS(arTot),od.length?t('n_overdue',{n:od.length}):'',od.length?'bad':'','data-a="nav" data-k="finance"')}${bigStat(t('open_value'),moneyS(openVal),t('n_docs',{n:[...sv,...so].filter(d=>d.status!=='done').length}),'blue','data-a="nav" data-k="contracts"')}</div>
  <div class="boss-grid">
    <div class="card"><div class="card-h"><h3>${t('cash_6m')}</h3></div><div class="card-b">${Charts.line({labels:months.map(m=>m.label),series:[{name:t('in_l'),color:'var(--ok)',values:inS},{name:t('out_l'),color:'var(--bad)',values:outS}],h:230})}</div></div>
    <div class="card appr"><div class="card-h"><h3>${t('need_you')}</h3><span class="lane-n">${pendExp.length+pendQuote.length+draftPo.length+unassigned.length}</span></div><div class="card-b">
      ${pendExp.length?`<div class="appr-g"><div class="lbl">${t('exp_to_approve')}</div>${pendExp.slice(0,4).map(e=>`<div class="appr-row"><div><b>${esc(L(e.desc))}</b><small>${t('ec_'+e.cat)} · ${esc(uname(e.by))}${e.ticketId&&ticketById(e.ticketId)?' · '+ticketById(e.ticketId).no:''}</small></div><b class="num">${money(e.amount)}</b><button class="btn sm okb" data-a="exSet" data-id="${e.id}" data-s="approved" aria-label="${t('approve')}">${ic('check',14)}</button><button class="btn sm ghost" style="color:var(--bad)" data-a="exSet" data-id="${e.id}" data-s="rejected" aria-label="${t('reject')}">${ic('x',14)}</button></div>`).join('')}</div>`:''}
      <div class="appr-links">${pendQuote.length?`<button data-a="nav" data-k="contracts"><b>${pendQuote.length}</b> ${t('quotes_unsent')}</button>`:''}${unassigned.length?`<button data-a="todoGo" data-tab="tickets" data-st="unassigned"><b>${unassigned.length}</b> ${t('jobs_unassigned')}</button>`:''}${draftPo.length?`<button data-a="nav" data-k="stock"><b>${draftPo.length}</b> ${t('po_drafts')}</button>`:''}${sla.length?`<button class="bad" data-a="todoGo" data-tab="tickets" data-quick="overdue"><b>${sla.length}</b> ${t('jobs_sla')}</button>`:''}</div>
      ${!(pendExp.length+pendQuote.length+draftPo.length+unassigned.length+sla.length)?`<div class="lane-empty">${ic('check',16)} ${t('lane_clear')}</div>`:''}
    </div></div>
    <div class="card"><div class="card-h"><h3>${t('pipeline')}</h3><button class="link-btn" data-a="nav" data-k="contracts">${t('see_all')}</button></div><div class="card-b"><div class="pipe">${stages.map(([k,l,arr])=>{ const v=arr.reduce((a,d)=>a+docTotal(d),0); return `<button class="pipe-row" data-a="nav" data-k="contracts"><span class="pl">${l}</span><span class="pb"><i style="width:${Math.max(2,v/stMax*100)}%"></i></span><span class="pv num">${moneyS(v)}</span><span class="pn">${arr.length}</span></button>`; }).join('')}</div></div></div>
    <div class="card"><div class="card-h"><h3>${t('cost_watch')}</h3><button class="link-btn" data-a="bossCost">${t('see_all')}</button></div><div class="card-b">
      ${sns.length?`<table class="tbl mini"><thead><tr><th>Serial</th><th class="r">${t('total_cost')}</th><th class="r">${t('revenue')}</th><th class="r">${t('margin')}</th></tr></thead><tbody>${sns.map(k=>{ const m=k.revenue-k.total; return `<tr class="clickable" data-a="snDetail" data-sn="${esc(k.sn)}"><td><span class="mono">${esc(k.sn)}</span><br><small class="muted">${esc((devBySn(k.sn)||{}).model||'')} · ${esc(custName((devBySn(k.sn)||{}).customerId))}</small></td><td class="r num">${moneyS(k.total)}</td><td class="r num">${moneyS(k.revenue)}</td><td class="r num" style="color:${m>=0?'var(--ok)':'var(--bad)'};font-weight:600">${m<0?'−':''}${moneyS(Math.abs(m))}</td></tr>`; }).join('')}</tbody></table>`:`<div class="muted">${t('no_data')}</div>`}
      ${expCat.length?`<div class="lbl" style="margin:16px 0 8px">${t('exp_by_cat_3m')}</div>${Charts.hbars({items:expCat.slice(0,5),color:'var(--accent)',fmt:v=>moneyS(v)})}`:''}
    </div></div>
    <div class="card"><div class="card-h"><h3>${t('ops_title')}</h3><button class="link-btn" data-a="nav" data-k="tickets">${t('see_all')}</button></div><div class="card-b"><div class="ops">${opsDef.map(([k,fn])=>`<button class="ops-c" data-a="nav" data-k="tickets"><b>${vt.filter(fn).length}</b><span>${t(k)}</span></button>`).join('')}</div>
      <div class="ops-foot">${sla.length?`<span class="pill k4">${t('jobs_sla_n',{n:sla.length})}</span>`:`<span class="pill k3">${t('sla_ok')}</span>`} ${low.length?`<button class="pill k2" data-a="stkLow">${t('low_n',{n:low.length})}</button>`:''}</div></div></div>
    ${recentCard(u)}
  </div>`;
}
A.bossCost = () => { S.ui.exp={tab:'sn',q:'',cat:'',st:'',page:1,size:10}; if(tabAllowed('expenses')) openTab('expenses'); else { S.ui.fin={tab:'exp',q:'',dir:'',page:1,size:10}; openTab('finance'); } };

/* ---------- strings ---------- */
Object.assign(DICT.vi,{ nav_overview:'Tổng quan', nav_desk:'Bàn làm việc', nav_more:'Thêm', d_today:'hôm nay', d_ago:'{n} ngày', desk_hi:'Chào {n}', see_more:'Xem thêm {n}', see_all:'Xem tất cả', lane_clear:'Không có việc tồn', only_mine:'Chỉ việc của tôi',
  tech_sub:'{a} máy cần chẩn đoán · {b} máy đang chờ sửa', rx_title:'Nhận máy', rx_desc:'Gõ hoặc quét serial, chọn thiết bị, ghi tình trạng — phiếu sửa chữa và biên bản nhận hàng được tạo cùng lúc.', rx_ph:'Serial, model hoặc tên khách hàng…', rx_btn:'Nhận máy', rx_this:'Nhận máy này', rx_none:'Không tìm thấy thiết bị', rx_type:'Gõ ít nhất 2 ký tự để tìm',
  rx_s1:'Thiết bị', rx_s2:'Tình trạng', rx_s3:'Xác nhận & ký', rx_find:'Tìm thiết bị', rx_past:'{n} lần sửa trước', rx_change:'Đổi thiết bị', rx_issue:'Khách báo lỗi', rx_issue_ph:'VD: máy báo lỗi 036, không phát điện từ sáng', rx_acc:'Phụ kiện / tình trạng kèm theo', rx_other:'Phụ kiện khác',
  rx_suggest:'Gợi ý phân loại', rx_sign_cust:'Khách hàng (bên giao)', rx_sign_sge:'SGE (bên nhận)', rx_print:'In biên bản nhận hàng sau khi lưu', rx_save:'Nhận máy & lập biên bản', rx_need_issue:'Nhập lỗi khách báo', rx_done:'Đã nhận máy {no} và lập biên bản nhận hàng', next:'Tiếp tục', back:'Quay lại',
  ln_recv:'Chờ nhận máy', ln_recv_e:'Không có yêu cầu chờ', ln_diag:'Cần chẩn đoán', ln_wait:'Chờ báo giá / khách ký', ln_wait_e:'Không có phiếu chờ khách', ln_fix:'Cần sửa', ln_out:'Kiểm tra & giao', act_recv:'Xác nhận nhận máy', act_diag:'Chẩn đoán', act_start:'Bắt đầu sửa', act_resume:'Tiếp tục sửa', act_finish_fix:'Ghi linh kiện, xong sửa', act_test:'Kiểm tra', act_handover:'Giao máy', parts_low:'Linh kiện sắp hết',
  acc_sub:'{a} báo giá cần lập · {b} phiếu cần xuất hóa đơn · {c} khoản cần thu', in_month:'Thu tháng này', out_month:'Chi tháng này', quotes_open:'Báo giá đang mở', quote_split:'{a} cần lập · {b} chờ ký', n_overdue:'{n} quá hạn', n_docs:'{n} chứng từ',
  ln_quote:'Cần lập báo giá', ln_quote_e:'Không có báo giá cần lập', ln_sign:'Chờ khách ký', ln_invoice:'Cần xuất hóa đơn', ln_collect:'Cần thu tiền', ln_payout:'Chi phí chờ chi', ln_payout_e:'Không có khoản chờ chi', act_quote:'Lập báo giá',
  qd_title:'Báo giá', qd_quick:'Thêm nhanh', qd_print:'In báo giá', open_job:'Mở phiếu',
  wh_sub:'{a} đơn mua chờ nhận · {b} mặt hàng dưới định mức', n_items_s:'{n} mặt hàng', moves_7d:'Phiếu nhập/xuất 7 ngày', ln_po:'Hàng NCC sắp về', ln_po_e:'Không có đơn chờ nhận', act_receive_check:'Kiểm & nhận hàng', ln_issue:'Linh kiện cần cấp cho sửa chữa', ln_issue_e:'Chưa có phiếu cần linh kiện', ln_low:'Dưới định mức',
  boss_sub:'Tổng quan thu chi, hợp đồng, chi phí và vận hành', net_month:'Chênh lệch thu – chi', net_hint:'tháng này, theo dòng tiền', open_value:'Hợp đồng đang mở', cash_6m:'Thu – chi 6 tháng', in_l:'Thu', out_l:'Chi',
  need_you:'Cần bạn xử lý', exp_to_approve:'Chi phí chờ duyệt', quotes_unsent:'báo giá chưa gửi khách', jobs_unassigned:'phiếu chưa phân công', po_drafts:'đơn mua nháp', jobs_sla:'phiếu quá hạn SLA',
  pipeline:'Hợp đồng theo giai đoạn', ps_running:'Đã ký, đang làm', ps_sales:'Mua bán đang chạy', ps_due:'Xong, còn nợ', cost_watch:'Biến tần lỗ / chi phí cao', exp_by_cat_3m:'Chi phí 3 tháng theo nhóm',
  ops_title:'Vận hành sửa chữa', jobs_sla_n:'{n} phiếu quá hạn SLA', sla_ok:'Không phiếu nào quá hạn', low_n:'{n} mặt hàng dưới định mức' });
Object.assign(DICT.en,{ nav_overview:'Overview', nav_desk:'My desk', nav_more:'More', d_today:'today', d_ago:'{n}d', desk_hi:'Hi {n}', see_more:'{n} more', see_all:'See all', lane_clear:'Nothing pending', only_mine:'Only mine',
  tech_sub:'{a} units to diagnose · {b} waiting for repair', rx_title:'Receive a unit', rx_desc:'Type or scan the serial, pick the device, note its condition — the repair job and receipt minutes are created together.', rx_ph:'Serial, model or customer…', rx_btn:'Receive unit', rx_this:'Receive this', rx_none:'No device found', rx_type:'Type at least 2 characters',
  rx_s1:'Device', rx_s2:'Condition', rx_s3:'Confirm & sign', rx_find:'Find the device', rx_past:'{n} past repairs', rx_change:'Change device', rx_issue:'Reported fault', rx_issue_ph:'e.g. fault 036, no output since morning', rx_acc:'Accessories / condition received', rx_other:'Other accessories',
  rx_suggest:'Suggested class', rx_sign_cust:'Customer (handing over)', rx_sign_sge:'SGE (receiving)', rx_print:'Print receipt minutes after saving', rx_save:'Receive & create minutes', rx_need_issue:'Enter the reported fault', rx_done:'Unit received as {no}, receipt minutes created', next:'Next', back:'Back',
  ln_recv:'Waiting for the unit', ln_recv_e:'No requests waiting', ln_diag:'To diagnose', ln_wait:'Quote / waiting for customer', ln_wait_e:'Nothing waiting on customers', ln_fix:'To repair', ln_out:'Test & hand over', act_recv:'Confirm received', act_diag:'Diagnose', act_start:'Start repair', act_resume:'Resume', act_finish_fix:'Log parts, finish', act_test:'Test', act_handover:'Hand over', parts_low:'Parts running low',
  acc_sub:'{a} quotes to prepare · {b} jobs to invoice · {c} amounts to collect', in_month:'Received this month', out_month:'Paid out this month', quotes_open:'Open quotes', quote_split:'{a} to prepare · {b} awaiting signature', n_overdue:'{n} overdue', n_docs:'{n} documents',
  ln_quote:'Quotes to prepare', ln_quote_e:'No quotes to prepare', ln_sign:'Awaiting signature', ln_invoice:'To invoice', ln_collect:'To collect', ln_payout:'Expenses to pay', ln_payout_e:'Nothing to pay', act_quote:'Prepare quote',
  qd_title:'Quote', qd_quick:'Quick add', qd_print:'Print quote', open_job:'Open job',
  wh_sub:'{a} POs to receive · {b} items below minimum', n_items_s:'{n} items', moves_7d:'Stock slips, 7 days', ln_po:'Supplier goods arriving', ln_po_e:'No POs to receive', act_receive_check:'Check & receive', ln_issue:'Parts to issue for repairs', ln_issue_e:'No jobs need parts', ln_low:'Below minimum',
  boss_sub:'Cash, contracts, costs and operations at a glance', net_month:'Net cash', net_hint:'this month, cash basis', open_value:'Open contracts', cash_6m:'Cash in / out, 6 months', in_l:'In', out_l:'Out',
  need_you:'Needs you', exp_to_approve:'Expenses to approve', quotes_unsent:'quotes not sent', jobs_unassigned:'jobs unassigned', po_drafts:'draft POs', jobs_sla:'jobs past SLA',
  pipeline:'Contracts by stage', ps_running:'Signed, in progress', ps_sales:'Sales in progress', ps_due:'Done, still owed', cost_watch:'Loss-making / costly inverters', exp_by_cat_3m:'Expenses by category, 3 months',
  ops_title:'Repair operations', jobs_sla_n:'{n} jobs past SLA', sla_ok:'No jobs past SLA', low_n:'{n} items below minimum' });

const _tabTitle0=tabTitle; tabTitle=function(k){ if(k==='home'){ const u=me(); if(u&&isBossRole(u)) return t('nav_overview'); if(u&&isDeskRole(u)) return t('nav_desk'); } return _tabTitle0(k); };

/* ---- unknown serials and new customers at intake ---- */
const SN_RE=/^[A-Z0-9][A-Z0-9-]{5,19}$/;
function rxDev(f){ return f.newDev || (f.sn?devBySn(f.sn):null); }
function rxCust(f,d){ if(!d) return null; if(d.customerId==='__new') return f.newCust; return custById(d.customerId); }
function rxSuggest(d,cond){ if(OUT_OF_SCOPE.includes(cond)) return 'PR'; const rw=d&&repairWarranty(d.sn); if(!rw) return '?'; return rw.inW?'RW':'PR'; }
const _wPill0=wPill; wPill=function(d,at){ if(d&&d.unknownW) return `<span class="pill k2">${t('w_unknown_s')}</span>`; return _wPill0(d,at); };
const _suggestType0=suggestType; suggestType=function(x){ const d=devBySn(x.products[0].sn); if(d&&d.unknownW&&!(x.intake&&OUT_OF_SCOPE.includes(x.intake.cond))) return 'PR'; return _suggestType0(x); };
A.rxNewDev = el => { const f=S.ui.modal?S.ui.modal.f:null; const sn=(el.dataset.sn||'').toUpperCase();
  if(!f){ A.rxOpen({dataset:{}}); }
  const g=S.ui.modal.f; g.nd=true; g.ndf=g.ndf||{ sn, model:'', project:'', start:'', years:5, unknownW:false, custMode:'existing', custId:'', custQ:'', nc:{company:'',contact:'',phone:'',email:'',province:'',address:''}, err:{} }; if(sn) g.ndf.sn=sn; S._focus=sn?'nd-model':'nd-sn'; rerender(); };
A.rxNdCancel = () => { const f=S.ui.modal.f; f.nd=false; rerender(); };
function rxNdForm(f){ const n=f.ndf, E=n.err||{}; const b=k=>`data-bind="modal.f.ndf.${k}"`; const er=k=>E[k]?`<div class="err-text">${E[k]}</div>`:'';
  const cq=(n.custQ||'').toLowerCase(); const custs=DB.customers.filter(c=>!cq||(c.company+' '+(c.contact||'')+' '+(c.phone||'')).toLowerCase().includes(cq)).slice(0,8);
  return `<div class="nd-head">${ic('plus',16)} ${t('nd_title')}</div><div class="form-grid">
    <div class="field"><label class="req" for="nd-sn">${t('serial_no')}</label><input class="input mono ${E.sn?'err':''}" id="nd-sn" ${b('sn')} value="${esc(n.sn)}" placeholder="A2611xxxxxx">${er('sn')}</div>
    <div class="field"><label class="req" for="nd-model">${t('product_model')}</label><select class="select ${E.model?'err':''}" id="nd-model" ${b('model')}><option value="">${t('choose')}</option>${MODELS.map(m=>`<option value="${esc(m.id)}" ${n.model===m.id?'selected':''}>${esc(m.id)}${m.kw?` · ${m.kw} kW`:''}</option>`).join('')}</select>${er('model')}</div>
    <div class="field full"><label for="nd-proj">${t('project_name')}</label><input class="input" id="nd-proj" ${b('project')} value="${esc(n.project)}" placeholder="${t('nd_proj_ph')}"></div>
    <div class="field"><label for="nd-start">${t('warranty_start')}</label><input class="input ${E.start?'err':''}" type="date" id="nd-start" ${b('start')} value="${esc(n.start)}" ${n.unknownW?'disabled':''}>${er('start')}</div>
    <div class="field"><label for="nd-years">${t('warranty_years')}</label><input class="input num" type="number" min="1" max="20" id="nd-years" data-num ${b('years')} value="${n.years}" ${n.unknownW?'disabled':''}></div>
    <label class="row full" style="gap:8px;cursor:pointer"><input type="checkbox" ${b('unknownW')} data-re ${n.unknownW?'checked':''}> ${t('nd_unknown_w')}</label>
  </div>
  <div class="nd-head" style="margin-top:16px">${ic('user',16)} ${t('customer')}</div>
  <div class="seg" style="margin-bottom:12px">${[['existing',t('nd_cust_existing')],['new',t('nd_cust_new')]].map(([v,l])=>`<button class="${n.custMode===v?'on':''}" data-a="ndCustMode" data-v="${v}">${l}</button>`).join('')}</div>
  ${n.custMode==='existing'?`<div class="rx-search">${ic('search',18)}<input class="input" id="nd-cq" ${b('custQ')} data-live value="${esc(n.custQ)}" placeholder="${t('nd_cust_find')}" autocomplete="off"></div>${er('cust')}
    <div class="rx-list">${custs.map(cu=>`<button class="rx-hit nd-c ${n.custId===cu.id?'sel':''}" data-a="ndPickCust" data-id="${cu.id}"><b>${esc(cu.company)}</b><span>${esc(cu.contact||'')} · ${esc(cu.phone||'')}</span><span>${esc(cu.province||'')}</span><span class="go">${n.custId===cu.id?'✓':''}</span></button>`).join('')||`<div class="muted" style="padding:8px">${t('no_results')} — <button class="link-btn" data-a="ndCustMode" data-v="new">${t('nd_cust_new')}</button></div>`}</div>`
  :`<div class="form-grid">
    <div class="field full"><label class="req" for="nd-co">${t('company')}</label><input class="input ${E.company?'err':''}" id="nd-co" data-bind="modal.f.ndf.nc.company" value="${esc(n.nc.company)}">${er('company')}</div>
    <div class="field"><label for="nd-ct">${t('contact')}</label><input class="input" id="nd-ct" data-bind="modal.f.ndf.nc.contact" value="${esc(n.nc.contact)}"></div>
    <div class="field"><label class="req" for="nd-ph">${t('phone')}</label><input class="input ${E.phone?'err':''}" id="nd-ph" type="tel" data-bind="modal.f.ndf.nc.phone" value="${esc(n.nc.phone)}">${er('phone')}</div>
    <div class="field"><label for="nd-em">${t('email')}</label><input class="input ${E.email?'err':''}" id="nd-em" type="email" data-bind="modal.f.ndf.nc.email" value="${esc(n.nc.email)}">${er('email')}</div>
    <div class="field"><label for="nd-pv">${t('province')}</label><select class="select" id="nd-pv" data-bind="modal.f.ndf.nc.province"><option value="">—</option>${PROVINCES.map(x=>`<option ${n.nc.province===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field full"><label for="nd-ad">${t('address')}</label><input class="input" id="nd-ad" data-bind="modal.f.ndf.nc.address" value="${esc(n.nc.address)}"></div></div>`}`; }
A.ndCustMode = el => { const n=S.ui.modal.f.ndf; n.custMode=el.dataset.v; n.err={}; if(n.custMode==='new'&&n.custQ&&!n.nc.company) n.nc.company=n.custQ; rerender(); };
A.ndPickCust = el => { S.ui.modal.f.ndf.custId=el.dataset.id; S.ui.modal.f.ndf.err={}; rerender(); };
A.rxNdNext = () => { const f=S.ui.modal.f, n=f.ndf, E={}; n.sn=String(n.sn||'').trim().toUpperCase();
  if(!SN_RE.test(n.sn)) E.sn=t('e_sn_format'); else if(DB.devices.some(d=>d.sn===n.sn)) E.sn=t('nd_sn_exists');
  if(!n.model) E.model=t('e_required');
  if(!n.unknownW&&n.start&&isNaN(Date.parse(n.start))) E.start=t('e_date');
  if(n.custMode==='existing'){ if(!custById(n.custId)) E.cust=t('nd_pick_cust'); }
  else { if(!String(n.nc.company||'').trim()) E.company=t('e_required'); if(!/^[0-9 +().-]{8,}$/.test(String(n.nc.phone||'').trim())) E.phone=t('e_phone'); if(n.nc.email&&!/^\S+@\S+\.\S+$/.test(n.nc.email)) E.email=t('e_email');
    const dupC=DB.customers.find(c=>c.company.trim().toLowerCase()===String(n.nc.company).trim().toLowerCase()); if(dupC) E.company=t('nd_cust_dup',{c:dupC.company}); }
  n.err=E; if(Object.keys(E).length){ rerender(); return; }
  const md=MODELS.find(m=>m.id===n.model)||{}; const unknown=n.unknownW||!n.start; const start=unknown?null:new Date(n.start+'T12:00:00').getTime();
  f.newCust = n.custMode==='new'? { company:n.nc.company.trim(), contact:n.nc.contact.trim(), phone:n.nc.phone.trim(), email:n.nc.email.trim(), province:n.nc.province, address:n.nc.address.trim() } : null;
  f.newDev={ sn:n.sn, model:n.model, pn:md.pn||'', customerId:n.custMode==='new'?'__new':n.custId, project:n.project.trim(), shipDate:start, startDate:start, warrantyYears:Number(n.years)||5, extended:false, unknownW:unknown, isNew:true };
  f.sn=n.sn; f.nd=false; f.step=2; S._focus='rx-d'; rerender(); };
Object.assign(DICT.vi,{ rx_new_sn:'Khai báo thiết bị mới: {sn}', rx_not_in_db:'Thiết bị chưa có trong hệ thống?', rx_badge_newdev:'Thiết bị mới', rx_badge_newcust:'Khách hàng mới', rx_dup:'Máy này đang có {n} phiếu chưa đóng:',
  w_unknown_s:'Chưa rõ BH', w_unknown_long:'Chưa có thông tin bảo hành — xác minh khi kiểm tra', cls_unknown:'Chưa xác định — xác minh khi chẩn đoán',
  nd_title:'Khai báo thiết bị mới', nd_proj_ph:'VD: Mái nhà xưởng khu B', nd_unknown_w:'Chưa rõ ngày bắt đầu bảo hành', nd_cust_existing:'Khách hàng có sẵn', nd_cust_new:'Khách hàng mới', nd_cust_find:'Tìm tên công ty, người liên hệ, SĐT…',
  nd_sn_exists:'Serial này đã có trong hệ thống', nd_pick_cust:'Chọn một khách hàng', nd_cust_dup:'Đã có khách hàng "{c}" — chọn ở tab Khách hàng có sẵn' });
Object.assign(DICT.en,{ rx_new_sn:'Register new device: {sn}', rx_not_in_db:'Device not in the system?', rx_badge_newdev:'New device', rx_badge_newcust:'New customer', rx_dup:'This unit has {n} open job(s):',
  w_unknown_s:'Warranty unknown', w_unknown_long:'No warranty data — verify during inspection', cls_unknown:'Unknown — verify at diagnosis',
  nd_title:'Register a new device', nd_proj_ph:'e.g. Factory roof, zone B', nd_unknown_w:'Warranty start date unknown', nd_cust_existing:'Existing customer', nd_cust_new:'New customer', nd_cust_find:'Search company, contact, phone…',
  nd_sn_exists:'This serial already exists', nd_pick_cust:'Pick a customer', nd_cust_dup:'Customer "{c}" already exists — pick it under Existing customer' });

/* ---- manager: "Việc cần làm" shown as "Bàn làm việc" ---- */
const _navItems1=navItems; navItems=function(u=me()){ const r=_navItems1(u); return isBossRole(u)?r.map(n=>n.k==='todo'?Object.assign({},n,{l:t('nav_desk')}):n):r; };
const _tabTitle1=tabTitle; tabTitle=function(k){ if(k==='todo'&&isBossRole(me())) return t('nav_desk'); return _tabTitle1(k); };
const _viewTodo0=viewTodo; viewTodo=function(){ const h=_viewTodo0(); return isBossRole(me())?h.replace(`<h1>${t('nav_todo')}</h1>`,`<h1>${t('nav_desk')}</h1>`):h; };

/* ---- finance permissions ---- */
(function(){
  const g=PERM_GROUPS.find(x=>x.key==='pg_contract'); g.perms=['svc_view','svc_manage','so_view','so_manage'];
  const ex=PERM_GROUPS.findIndex(x=>x.key==='pg_expense'); if(ex>=0) PERM_GROUPS.splice(ex,1);
  PERM_GROUPS.splice(PERM_GROUPS.findIndex(x=>x.key==='pg_contract')+1,0,
    { key:'pg_finance', perms:['fin_view','fin_cash','invoice_issue','pay_record','pay_out','debt_manage','discount_approve','cost_view','fin_export'] },
    { key:'pg_expense', perms:['exp_view','exp_create','exp_approve','exp_pay'] });
})();
const FIN_DEFAULTS = {
  manager:['fin_view','fin_cash','invoice_issue','pay_record','pay_out','debt_manage','discount_approve','cost_view','fin_export','exp_pay'],
  accountant:['fin_view','fin_cash','invoice_issue','pay_record','pay_out','debt_manage','cost_view','fin_export','exp_pay'],
  engineer:[], warehouse:[], agent:[], enduser:[] };
const _defaultPerms0=defaultPerms; defaultPerms=function(){ const p=_defaultPerms0(); Object.keys(FIN_DEFAULTS).forEach(r=>{ if(p[r]) FIN_DEFAULTS[r].forEach(k=>{ if(!p[r].includes(k)) p[r].push(k); }); }); return p; };
function migrateFinPerms(){ if(!DB||!DB.perms||DB.permsFin) return; Object.keys(FIN_DEFAULTS).forEach(r=>{ const l=DB.perms[r]; if(l) FIN_DEFAULTS[r].forEach(k=>{ if(!l.includes(k)) l.push(k); }); }); DB.permsFin=1; }
const _render0=render; render=function(){ try{ migrateFinPerms(); }catch(e){} return _render0(); };
canFinance=function(u=me()){ return can('fin_view',u)||can('exp_view',u)||can('cost_view',u); };
function finDeny(){ toast(t('fin_no_perm'),'bad'); }
const _payAsk0=A.payAsk; A.payAsk=el=>{ const d=docOf(el.dataset.id); const out=!!poById(el.dataset.id); if(!can(out?'pay_out':'pay_record')) return finDeny(); _payAsk0(el); };
const _tkInvoice0=A.tkInvoice; A.tkInvoice=el=>{ if(!can('invoice_issue')) return finDeny(); _tkInvoice0(el); };
if(A.exSet){ const _exSet0=A.exSet; A.exSet=el=>{ if(el.dataset.s==='paid'&&!can('exp_pay')) return finDeny(); _exSet0(el); }; }
Object.assign(DICT.vi,{ pg_ticket:'Phiếu sửa chữa', pg_contract:'Hợp đồng', pg_finance:'Tài chính', pg_expense:'Chi phí',
  perm_fin_view:'Xem tài chính', pd_fin_view:'Mở mục Tài chính: doanh thu, công nợ phải thu/phải trả',
  perm_fin_cash:'Xem dòng tiền & số dư', pd_fin_cash:'Sổ quỹ, tiền vào/ra theo tháng, lãi ròng',
  perm_invoice_issue:'Xuất hóa đơn', pd_invoice_issue:'Xuất hóa đơn cho hợp đồng dịch vụ, đơn bán',
  perm_pay_record:'Thu tiền khách hàng', pd_pay_record:'Ghi nhận tiền khách thanh toán cho hợp đồng, đơn bán',
  perm_pay_out:'Chi trả nhà cung cấp', pd_pay_out:'Ghi nhận thanh toán đơn mua hàng (PO) cho nhà cung cấp',
  perm_debt_manage:'Quản lý công nợ', pd_debt_manage:'Theo dõi quá hạn, nhắc nợ, gia hạn thanh toán',
  perm_discount_approve:'Duyệt chiết khấu', pd_discount_approve:'Duyệt giảm giá/chiết khấu trên báo giá, đơn bán',
  perm_cost_view:'Xem giá vốn & lãi/lỗ', pd_cost_view:'Giá vốn, lãi/lỗ theo từng biến tần và hợp đồng',
  perm_fin_export:'Xuất báo cáo tài chính', pd_fin_export:'Tải Excel công nợ, sổ quỹ, chi phí',
  perm_exp_pay:'Chi tiền chi phí', pd_exp_pay:'Đánh dấu chi phí đã duyệt là đã chi',
  fin_no_perm:'Bạn không có quyền thực hiện thao tác tài chính này' });
Object.assign(DICT.en,{ pg_ticket:'Repair jobs', pg_contract:'Contracts', pg_finance:'Finance', pg_expense:'Expenses',
  perm_fin_view:'View finance', pd_fin_view:'Open Finance: revenue, receivables and payables',
  perm_fin_cash:'View cash flow & balance', pd_fin_cash:'Cash book, monthly in/out, net cash',
  perm_invoice_issue:'Issue invoices', pd_invoice_issue:'Issue invoices for service contracts and sales orders',
  perm_pay_record:'Collect from customers', pd_pay_record:'Record customer payments for contracts and sales orders',
  perm_pay_out:'Pay suppliers', pd_pay_out:'Record payments on purchase orders',
  perm_debt_manage:'Manage debt', pd_debt_manage:'Track overdue, send reminders, extend terms',
  perm_discount_approve:'Approve discounts', pd_discount_approve:'Approve discounts on quotes and sales orders',
  perm_cost_view:'View cost & margin', pd_cost_view:'Cost and profit/loss per inverter and contract',
  perm_fin_export:'Export finance reports', pd_fin_export:'Download receivables, cash book, expenses to Excel',
  perm_exp_pay:'Pay out expenses', pd_exp_pay:'Mark approved expenses as paid',
  fin_no_perm:'You don\'t have permission for this finance action' });

/* ===== Customer / agent portal: contracts + status + warranty policy only ===== */
ROLE_NAV.agent=['home','policy']; ROLE_NAV.enduser=['home','policy'];
const _navItems2=navItems; navItems=function(u=me()){ if(u&&isExternal(u)&&!S._fullNav) return [{k:'home',l:t('nav_my_contracts')},{k:'policy',l:t('nav_policy')}]; if(u&&isExternal(u)) return [{k:'home',l:t('nav_my_contracts')},{k:'policy',l:t('nav_policy')}]; return _navItems2(u); };
const _tabAllowed0=tabAllowed; tabAllowed=function(k,u=me()){ if(u&&isExternal(u)) return k==='home'||k==='policy'||k.startsWith('sc:')||k.startsWith('so:')||k.startsWith('t:'); if(k==='policy') return true; return _tabAllowed0(k,u); };
const _tabTitle2=tabTitle; tabTitle=function(k){ if(k==='policy') return t('nav_policy'); if(k==='home'&&isExternal(me())) return t('nav_my_contracts'); return _tabTitle2(k); };
const _activeNav0=activeNavKey; activeNavKey=function(){ if(isExternal(me())){ const k=S.active; return k==='policy'?'policy':'home'; } return _activeNav0(); };
const _erpView0=erpView; erpView=function(k){ if(k==='policy') return viewPolicy(); return _erpView0(k); };
const _viewHome1=viewHome; viewHome=function(){ const u=me(); if(isExternal(u)) return homeCust(u); return _viewHome1(); };
/* keep an external user from landing on a hidden tab */
const _render1=render; render=function(){ try{ const u=me(); if(u&&isExternal(u)){ S.tabs=(S.tabs||[]).filter(k=>tabAllowed(k,u)); if(!S.tabs.includes('home')) S.tabs.unshift('home'); if(!tabAllowed(S.active,u)) S.active='home'; } }catch(e){} return _render1(); };

function soBar(o){ const st=['confirmed','delivered','done']; if(o.status==='cancelled') return `<div class="quote" style="border-color:var(--bad);margin:0">${t('so_cancelled')}</div>`;
  const i=Math.max(0,st.indexOf(o.status)); const pst=payState(o); const steps=[['confirmed',t('so_confirmed')],['delivered',t('so_delivered')],['paid',t('cb_paid')],['done',t('cb_done')]];
  const paid=pst==='paid'||pst==='na'; const idx=o.status==='done'?(paid?4:3):i===0?0:(paid?3:2);
  return `<div class="stepper">${steps.map(([s,l],k)=>`<div class="step ${k<idx?'done':''} ${k===idx?'cur':''}"><span class="c">${k<idx?ic('check',12):k+1}</span><span>${esc(l)}</span></div>`).join('')}</div>`; }
function custStage(c){ if(c.status==='declined') return ['bad',t('sv_declined')]; if(c.status==='cancelled') return ['bad',t('sv_cancelled')]; const p=payState(c);
  if(c.status==='sent') return ['warn',t('cs_need_sign')]; if(c.status==='done'&&(p==='paid'||p==='na')) return ['ok',t('cs_done')];
  if(c.invoice&&docDue(c)>0) return ['warn',t('cs_need_pay')]; if(c.status==='done') return ['info',t('cs_ready')]; return ['info',t('cs_working')]; }
function homeCust(u){
  const svc=visibleSvc(u).slice().sort((a,b)=>(b.at||0)-(a.at||0)); const so=visibleSo(u).slice().sort((a,b)=>(b.at||0)-(a.at||0));
  const isDone=c=>['done','declined','cancelled'].includes(c.status)&&!(docDue(c)>0);
  const all=[...svc.map(c=>({k:'sc',c})),...so.map(c=>({k:'so',c}))]; const open=all.filter(x=>!isDone(x.c));
  const due=all.reduce((s,x)=>s+(x.c.invoice||x.k==='so'?Math.max(0,docDue(x.c)):0),0); const sign=svc.filter(c=>c.status==='sent').length;
  const comp=u.role==='agent'?[...new Set(all.map(x=>x.c.customerId))].length:0;
  const card=({k,c})=>{ const x=k==='sc'?ticketById(c.ticketId):null; const cu=custById(c.customerId)||{}; const [tone,lab]=k==='sc'?custStage(c):(c.status==='cancelled'?['bad',t('so_cancelled')]:docDue(c)>0&&c.status!=='confirmed'?['warn',t('cs_need_pay')]:c.status==='done'?['ok',t('cs_done')]:['info',t('so_'+c.status)]);
    return `<article class="cc-card"><button class="cc-head" data-a="nav" data-k="${k}:${c.id}">
      <div><div class="cc-no mono">${esc(c.no)}${x?` · ${esc(x.no)}`:''}</div><div class="cc-t">${k==='sc'?t('ct_service'):t('ct_sale')}${c.sn?` · <span class="mono">${esc(c.sn)}</span>`:''}${x&&x.products[0]?` · ${esc(x.products[0].model)}`:''}</div>${u.role==='agent'?`<div class="muted" style="font-size:13px">${esc(cu.company||'')}</div>`:''}</div>
      <div class="cc-r"><span class="cc-st ${tone}">${esc(lab)}</span><div class="cc-amt num">${money(docTotal(c))}</div>${docDue(c)>0&&(c.invoice||k==='so')?`<div class="cc-due num">${t('remaining')}: ${money(docDue(c))}</div>`:''}</div></button>
      <div class="cc-bar">${k==='sc'?contractBar(c):soBar(c)}</div>
      ${x?`<div class="cc-rep"><span class="muted">${t('repair_status')}:</span> ${tkPill(x)}</div>`:''}</article>`; };
  return `<div class="desk"><div class="desk-head"><div><div class="muted" style="font-weight:600;font-size:13px">${esc(u.company||u.name)}</div><h1>${t('nav_my_contracts')}</h1><div class="sub">${t('cust_sub')}</div></div></div>
    <div class="bstats cc-stats">${[[t('cs_open'),open.length,''],[t('cs_need_sign'),sign,sign?'warn':''],[t('to_pay'),money(due),due?'bad':''],...(comp?[[t('cs_companies'),comp,'']]:[])].map(([l,v,tone])=>`<div class="bstat"><div class="l">${l}</div><div class="v ${tone}">${v}</div></div>`).join('')}</div>
    <h2 class="cc-sec">${t('cs_tab_open')} <span class="muted">${open.length}</span></h2>
    <div class="cc-list">${open.map(card).join('')||`<div class="card empty"><p>${t('cs_none_open')}</p></div>`}</div>
    ${all.length>open.length?`<h2 class="cc-sec">${t('cs_tab_done')} <span class="muted">${all.length-open.length}</span></h2><div class="cc-list">${all.filter(x=>isDone(x.c)).map(card).join('')}</div>`:''}
    <div class="cc-help muted">${ic('shield',15)} ${t('cs_help')} <button class="link-btn" data-a="nav" data-k="policy">${t('nav_policy')}</button> · ${SGE_INFO.phone} · ${SGE_INFO.email}</div></div>`; }
A.custTab=el=>{ S.ui.cust.tab=el.dataset.v; rerender(); };

function viewPolicy(){ const sec=(n,h,b)=>`<section class="pol-sec"><h2><span class="pol-n">${n}</span>${h}</h2>${b}</section>`; const ul=a=>`<ul>${a.map(x=>`<li>${x}</li>`).join('')}</ul>`;
  const vi=S.lang!=='en';
  return `<div class="pol"><div class="page-head"><div><h1>${t('nav_policy')}</h1><div class="sub">${vi?'Áp dụng cho biến tần và thiết bị do SGE phân phối, lắp đặt hoặc tiếp nhận bảo hành.':'Applies to inverters and equipment distributed, installed or serviced by SGE.'}</div></div><button class="btn" data-a="polPrint">${ic('print',15)} ${vi?'In chính sách':'Print'}</button></div>
  <div class="card"><div class="card-b pol-body">
  ${sec(1,vi?'Thời hạn bảo hành':'Warranty period',`<table class="tbl pol-t"><thead><tr><th>${vi?'Thiết bị':'Equipment'}</th><th>${vi?'Thời hạn tiêu chuẩn':'Standard'}</th><th>${vi?'Tính từ':'Counted from'}</th></tr></thead><tbody>
    <tr><td>${vi?'Biến tần hòa lưới (string inverter)':'Grid-tied string inverter'}</td><td><b>5 ${vi?'năm':'years'}</b></td><td>${vi?'Ngày lắp đặt ghi trên biên bản nghiệm thu, tối đa 6 tháng sau ngày xuất kho':'Installation date on the acceptance record, at most 6 months after shipping'}</td></tr>
    <tr><td>${vi?'Biến tần gia hạn bảo hành':'Inverter with extended warranty'}</td><td><b>${vi?'Theo hợp đồng gia hạn':'Per extension contract'}</b></td><td>${vi?'Nối tiếp thời hạn tiêu chuẩn':'Follows the standard period'}</td></tr>
    <tr><td>${vi?'Linh kiện, board thay thế khi sửa chữa tính phí':'Parts and boards replaced in a paid repair'}</td><td><b>${vi?'6 tháng':'6 months'}</b></td><td>${vi?'Ngày giao trả thiết bị':'Return date'}</td></tr>
    <tr><td>${vi?'Phụ kiện (module WiFi, đầu nối, terminal)':'Accessories (WiFi module, connectors, terminals)'}</td><td><b>${vi?'12 tháng':'12 months'}</b></td><td>${vi?'Ngày xuất kho':'Shipping date'}</td></tr></tbody></table>`)}
  ${sec(2,vi?'Điều kiện được bảo hành':'Conditions',ul(vi?['Thiết bị còn trong thời hạn bảo hành, tem và nhãn serial còn nguyên, đọc được.','Lỗi phát sinh do linh kiện hoặc quá trình sản xuất của nhà sản xuất.','Thiết bị được lắp đặt, vận hành đúng hướng dẫn kỹ thuật và điều kiện môi trường của nhà sản xuất.','Có serial (SN) để đối chiếu; SGE kiểm tra và xác nhận lỗi khi tiếp nhận.']:['Within the warranty period, with intact and legible seals and serial label.','Fault caused by a component or manufacturing defect.','Installed and operated per the manufacturer\'s technical and environmental guidelines.','A serial number (SN) is available; SGE inspects and confirms the fault at intake.']))}
  ${sec(3,vi?'Trường hợp không được bảo hành':'Not covered',ul(vi?['Cháy nổ, chập điện do sét đánh, quá áp lưới, đấu nối sai cực tính hoặc sai cấu hình chuỗi pin.','Hư hỏng do nước, côn trùng, ăn mòn hóa chất, rơi vỡ, va đập trong vận chuyển của khách hàng.','Tự ý tháo, sửa chữa, thay linh kiện hoặc cập nhật firmware không do SGE/nhà sản xuất cung cấp.','Thiết bị mất tem, sửa serial, hoặc không xác định được nguồn gốc.','Thiên tai, hỏa hoạn và các sự kiện bất khả kháng.']:['Burn, short-circuit from lightning, grid over-voltage, reverse polarity or wrong string configuration.','Damage from water, insects, chemical corrosion, drops or impact in customer transport.','Unauthorised opening, repair, part replacement or firmware not provided by SGE or the manufacturer.','Missing seals, altered serial, or unknown origin.','Natural disasters, fire and force majeure.'])+`<p class="muted" style="margin:8px 0 0">${vi?'Các trường hợp này được chuyển sang sửa chữa tính phí; SGE gửi báo giá để khách hàng xác nhận trước khi sửa.':'These cases become paid repairs; SGE sends a quote for your approval before any work.'}</p>`)}
  ${sec(4,vi?'Quy trình bảo hành':'Process',`<ol class="pol-steps">${(vi?[['Báo lỗi','Gọi hotline hoặc gửi email kèm serial, mã lỗi, ảnh màn hình/ứng dụng.'],['Gửi thiết bị','Gửi máy kèm phụ kiện về SGE. Hai bên ký biên bản nhận hàng ghi rõ tình trạng.'],['Kiểm tra & phân loại','Kỹ thuật SGE chẩn đoán và xác định bảo hành hay sửa chữa tính phí.'],['Báo giá (nếu tính phí)','Khách hàng xem và ký báo giá — báo giá chính là hợp đồng dịch vụ.'],['Sửa chữa / đổi board','Thực hiện sửa, thay linh kiện hoặc đổi trả (RMA) với nhà sản xuất.'],['Giao trả','Kiểm tra vận hành, giao máy kèm biên bản giao hàng; xuất hóa đơn nếu có phí.']]:[['Report','Call or email with the serial, fault code and screenshots.'],['Send the unit','Ship the unit with accessories. Both sides sign the receipt minutes noting its condition.'],['Inspect & classify','SGE diagnoses and classifies warranty vs paid repair.'],['Quote (if paid)','Review and sign the quote — the quote is the service contract.'],['Repair / board swap','Repair, replace parts or RMA with the manufacturer.'],['Return','Run test, return with delivery minutes; invoice if chargeable.']]).map(([h,d])=>`<li><b>${h}</b><span>${d}</span></li>`).join('')}</ol>`)}
  ${sec(5,vi?'Thời gian xử lý':'Turnaround',ul(vi?['Phản hồi tiếp nhận: trong 24 giờ làm việc.','Chẩn đoán và thông báo kết quả: 3–5 ngày làm việc kể từ khi nhận máy.','Sửa chữa có sẵn linh kiện: 5–7 ngày làm việc. Trường hợp đổi board/RMA với nhà sản xuất: theo thời gian vận chuyển, SGE cập nhật tiến độ trên hệ thống.']:['Acknowledgement within 24 working hours.','Diagnosis and result within 3–5 working days of receipt.','Repair with parts in stock: 5–7 working days. Board swap / RMA: per shipping time, tracked in this portal.']))}
  ${sec(6,vi?'Chi phí':'Charges',ul(vi?['Bảo hành: miễn phí linh kiện và nhân công sửa chữa tại SGE.','Chi phí vận chuyển thiết bị đến SGE do khách hàng chịu, SGE chịu chiều gửi trả với ca bảo hành.','Khách hàng từ chối báo giá sửa chữa tính phí: thiết bị được gửi trả nguyên trạng, có thể thu phí kiểm tra theo báo giá.']:['Warranty: parts and labour at SGE are free.','Shipping to SGE is paid by the customer; SGE pays return shipping for warranty jobs.','If you decline a paid-repair quote, the unit is returned as-is; an inspection fee may apply per the quote.']))}
  ${sec(7,vi?'Liên hệ':'Contact',`<div class="pol-contact"><div><b>${esc(SGE_INFO.company)}</b></div><div>${esc(SGE_INFO.address)}</div><div>${vi?'Hotline':'Hotline'}: <b>${esc(SGE_INFO.phone)}</b> · Email: <b>${esc(SGE_INFO.email)}</b></div></div>`)}
  </div></div></div>`; }
A.polPrint=()=>{ const el=document.querySelector('.pol-body'); if(!el) return; printDoc(`<h1 style="font-size:20px">${t('nav_policy')} — SGE</h1>`+el.innerHTML, t('nav_policy')); };
Object.assign(DICT.vi,{ nav_my_contracts:'Hợp đồng của tôi', nav_policy:'Chính sách bảo hành', cust_sub:'Theo dõi báo giá, hợp đồng, hóa đơn và tiến độ sửa chữa thiết bị', cs_open:'Đang thực hiện', cs_need_sign:'Chờ bạn ký', cs_need_pay:'Chờ thanh toán', cs_done:'Hoàn tất', cs_ready:'Đã xong, chờ quyết toán', cs_working:'Đang thực hiện', cs_companies:'Công ty', cs_tab_open:'Đang mở', cs_tab_done:'Đã hoàn tất', cs_empty:'Chưa có hợp đồng nào', cs_none_open:'Không có hợp đồng nào đang mở', cs_help:'Thắc mắc về bảo hành?', ct_service:'Hợp đồng dịch vụ sửa chữa', ct_sale:'Hợp đồng mua bán', sv_cancelled:'Đã hủy' });
Object.assign(DICT.en,{ nav_my_contracts:'My contracts', nav_policy:'Warranty policy', cust_sub:'Track quotes, contracts, invoices and repair progress', cs_open:'In progress', cs_need_sign:'Awaiting your signature', cs_need_pay:'Awaiting payment', cs_done:'Completed', cs_ready:'Finished, settling', cs_working:'In progress', cs_companies:'Companies', cs_tab_open:'Open', cs_tab_done:'Completed', cs_empty:'No contracts yet', cs_none_open:'No open contracts', cs_help:'Warranty questions?', ct_service:'Repair service contract', ct_sale:'Sales contract', sv_cancelled:'Cancelled' });
ICONS.print='<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>';


/* ===================================================================
   Duyệt linh kiện dự kiến trước khi làm báo giá
   KTV được phân công nhập linh kiện dự kiến → Lưu & gửi duyệt → báo quản lý
   → Quản lý duyệt → báo Quản lý / Kế toán / Thủ kho → một trong ba người lập báo giá
   =================================================================== */
const QUOTE_ROLES=['manager','accountant','warehouse'];
function partsApproved(x){ if(x.partsApproval) return true; const c=x.svcId&&svcById(x.svcId); return !!(c&&c.status!=='quote'&&c.status!=='cancelled'); }
function stockQty(pn){ try{ const s=typeof stockBy==='function'?stockBy(pn):null; return s?s.qty:null; }catch(e){ return null; } }
function estPartsTable(x){ const ps=(x.diagnosis&&x.diagnosis.estParts||[]).filter(p=>p.pn);
  if(!ps.length) return `<p class="muted" style="margin:0">${t('pa_no_parts')}</p>`;
  return `<div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl"><thead><tr><th>${t('part_no')}</th><th>${t('part_name')}</th><th class="r">${t('qty')}</th><th class="r">${t('pa_stock')}</th></tr></thead><tbody>${ps.map(p=>{ const q=stockQty(p.pn); const av=q==null?null:q-reservedQty(p.pn,x.id); return `<tr><td class="mono">${esc(p.pn)}</td><td>${esc(partName(p.pn))}</td><td class="r num">${p.qty||1}</td><td class="r num" style="${av!=null&&av<(p.qty||1)?'color:var(--bad);font-weight:600':''}">${q==null?'—':fmtNum(q)+' / '+fmtNum(av)}</td></tr>`; }).join('')}</tbody></table></div>`; }
const _contractAction0=contractAction;
contractAction=function(x,u,box){
  if(x.status==='pending' && !partsApproved(x)){
    if(isExternal(u)) return '';
    const dg=x.diagnosis;
    const info=`${dg&&L(dg.text)?`<p class="quote" style="margin:0 0 12px"><b>${t('prop_'+dg.proposal)}</b> — ${esc(L(dg.text))}</p>`:''}<div class="lbl" style="margin-bottom:8px">${t('est_parts')}</div>${estPartsTable(x)}<div class="hint" style="margin-top:8px">${t('pa_by',{n:esc(uname(x.assigneeId||(x.history.slice().reverse().find(h=>h.action==='submitted')||{}).by))})}</div>`;
    if(can('ticket_approve',u)) return box(t('act_partsappr_title'), `${info}<div class="row" style="margin-top:14px"><button class="btn okb" data-a="paApprove" data-id="${x.id}">${ic('check',15)} ${t('pa_approve')}</button><button class="btn" data-a="wf" data-op="decide" data-d="return" data-id="${x.id}">${t('request_more')}</button><span class="grow"></span><button class="btn danger" data-a="wf" data-op="decide" data-d="reject" data-id="${x.id}">${ic('x',15)} ${t('reject')}</button></div>`, t('waiting_since',{h:fmtNum((Date.now()-x.updatedAt)/H,1)}));
    return box(t('act_partsappr_title'), `${info}<p class="muted" style="margin:12px 0 0">${t('pa_wait')}</p>`);
  }
  return _contractAction0(x,u,box);
};
function refreshQuoteParts(c,x){ const paid=x.type==='OW'||x.type==='PR'; const parts=(x.diagnosis&&x.diagnosis.estParts||[]).filter(p=>p.pn);
  c.items=c.items.filter(i=>i.type!=='part').concat([]); const add=parts.map(p=>{ const s=typeof stockBy==='function'?stockBy(p.pn):null; return { type:'part', pn:p.pn, desc:s?s.name:partName(p.pn), qty:p.qty||1, price:paid&&s?s.price:0 }; }); c.items=add.concat(c.items); }
A.paApprove = el => { const x=ticketById(el.dataset.id); const u=me(); if(!x||x.status!=='pending') return;
  x.partsApproval={ by:u.id, at:Date.now() }; x.updatedAt=Date.now();
  x.history.push({ at:Date.now(), by:u.id, action:'parts_approved', from:null, to:null, note:'' });
  const c=x.svcId&&svcById(x.svcId); if(!c) autoQuote(x); else if(c.status==='quote') refreshQuoteParts(c,x);
  QUOTE_ROLES.forEach(r=>notify({ toRole:r, key:'n_parts_ok', vars:{no:x.no}, ticketId:x.id }));
  if(x.assigneeId) notify({ toUser:x.assigneeId, key:'n_parts_ok_tech', vars:{no:x.no}, ticketId:x.id });
  save(); rerender(); toast(t('pa_done'),'ok'); };
/* trả về bổ sung → phải duyệt lại */
const _wfPA=A.wf; A.wf=(el,ev)=>{ const x=ticketById(el.dataset.id); const r=_wfPA(el,ev); if(x&&x.status!=='pending'&&x.partsApproval&&['diagnosing','returned','draft'].includes(x.status)) x.partsApproval=null; return r; };
/* Thủ kho được lập báo giá */
const QUOTE_PERMS={ warehouse:['svc_view','svc_manage'] };
const _defaultPermsPA=defaultPerms; defaultPerms=function(){ const p=_defaultPermsPA(); Object.keys(QUOTE_PERMS).forEach(r=>{ if(p[r]) QUOTE_PERMS[r].forEach(k=>{ if(!p[r].includes(k)) p[r].push(k); }); }); return p; };
function migrateQuotePerms(){ if(!DB||!DB.perms||DB.permsQuote) return; Object.keys(QUOTE_PERMS).forEach(r=>{ const l=DB.perms[r]; if(l) QUOTE_PERMS[r].forEach(k=>{ if(!l.includes(k)) l.push(k); }); }); DB.permsQuote=1; }
const _renderPA=render; render=function(){ try{ migrateQuotePerms(); }catch(e){} return _renderPA(); };
if(ROLE_NAV.warehouse&&!ROLE_NAV.warehouse.includes('contracts')) ROLE_NAV.warehouse.splice(ROLE_NAV.warehouse.indexOf('tickets')+1,0,'contracts');
Object.assign(DICT.vi,{ submit_for_approval:'Lưu & gửi duyệt', act_diag_title:'Chẩn đoán & linh kiện dự kiến', e_diag:'Cần nhập chẩn đoán hoặc linh kiện dự kiến',
  n_submitted:'{no}: linh kiện dự kiến chờ duyệt', n_parts_ok:'{no}: đã duyệt linh kiện, cần làm báo giá', n_parts_ok_tech:'{no}: quản lý đã duyệt linh kiện dự kiến',
  act_partsappr_title:'Duyệt linh kiện dự kiến', pa_approve:'Duyệt linh kiện', pa_wait:'Đang chờ quản lý duyệt. Duyệt xong, Quản lý / Kế toán / Thủ kho sẽ lập báo giá.',
  pa_no_parts:'Không có linh kiện dự kiến (chỉ công sửa chữa).', pa_stock:'Tồn / khả dụng', pa_by:'Người nhập: {n}', pa_done:'Đã duyệt, đã báo Quản lý, Kế toán, Thủ kho làm báo giá',
  h_parts_approved:'đã duyệt linh kiện dự kiến', h_submitted:'đã lưu linh kiện dự kiến, gửi duyệt' });
Object.assign(DICT.en,{ submit_for_approval:'Save & submit', act_diag_title:'Diagnosis & estimated parts', e_diag:'Enter a diagnosis or estimated parts',
  n_submitted:'{no}: estimated parts awaiting approval', n_parts_ok:'{no}: parts approved, quote needed', n_parts_ok_tech:'{no}: manager approved the estimated parts',
  act_partsappr_title:'Approve estimated parts', pa_approve:'Approve parts', pa_wait:'Waiting for manager approval. After that, Manager / Accountant / Warehouse prepares the quote.',
  pa_no_parts:'No estimated parts (labour only).', pa_stock:'In stock', pa_by:'Entered by: {n}', pa_done:'Approved; Manager, Accountant and Warehouse notified to quote',
  h_parts_approved:'approved the estimated parts', h_submitted:'saved estimated parts and submitted' });


/* ===================================================================
   Bước "Khách đồng ý sửa" + trạng thái sau khi quản lý duyệt + mở phiếu chi từ thông báo
   =================================================================== */
/* Thanh tiến trình sửa chữa: Tiếp nhận → Chẩn đoán → Chờ duyệt → Đã duyệt → Khách đồng ý → Sửa chữa → Kiểm tra → Chờ giao máy → Giao trả */
STEPS.length=0; STEPS.push('received','diagnosing','pending','approved','agreed','in_service','testing','ready','delivered');
Object.assign(STEP_EVENTS,{ received:['created','received'], approved:['parts_approved','approved'], agreed:['customer_agreed','approved','declined'], in_service:['started','customer_agreed'], testing:['to_testing'], ready:['test_passed','delivered'], delivered:['delivered'] });
function isReady(x){ return x.status==='testing' && !!(x.test&&x.test.result==='pass') && !x.delivery; }
const DONE_ST=['delivered','invoiced','paid','closed'];
function stepOf(x){ const s=x.status; if(STEP_OF[s]==null&&s!=='return_pending') return null;
  if(['draft','unassigned'].includes(s)) return 0; if(['diagnosing','returned'].includes(s)) return 1;
  if(['pending','rejected'].includes(s)) return (s==='pending'&&partsApproved(x))?4:2;
  if(s==='approved') return 5; if(['in_service','on_hold'].includes(s)) return 5;
  if(s==='testing') return isReady(x)?7:6; if(s==='return_pending') return 8;
  return 8; }
function tkPill(x){ if(isReady(x)) return `<span class="pill s-ready">${esc(t('s_ready'))}</span>`; const h=statusPill(x.status); return (x.status==='pending'&&partsApproved(x))? h.replace(t('s_pending'),t('s_wait_customer')) : h; }
const FLOW_IC={ received:'download', diagnosing:'search', pending:'clock', approved:'shield', agreed:'file', in_service:'wrench', testing:'chart', ready:'box', delivered:'truck' };
function tkFlow(x,compact){
  const cur=stepOf(x); const n=STEPS.length;
  const declined=x.status==='return_pending'||x.history.some(h=>h.action==='declined');
  const fin=DONE_ST.includes(x.status)||(x.status==='closed');
  const bad=['rejected','cancelled'].includes(x.status);
  const at=s=>{ const ev=x.history.filter(h=>(STEP_EVENTS[s]||[]).includes(h.action)); return ev.length?ev[ev.length-1].at:(s==='received'?x.createdAt:null); };
  const ur=x.unrepairable; const urStep=ur?(ur.stage==='repair'?'in_service':'agreed'):null;
  const state=i=>{ const s=STEPS[i];
    if(ur){ if(s===urStep) return 'bad'; if(['agreed','in_service','testing','ready'].includes(s)&&i>STEPS.indexOf(urStep)) return 'skip'; if(s==='delivered') return fin?'done':'cur'; if(i<STEPS.indexOf(urStep)) return 'done'; }
    if(declined && ['in_service','testing','ready'].includes(s)) return 'skip';
    if(declined && s==='agreed') return 'bad';
    if(fin) return 'done'; if(cur==null) return 'todo';
    if(i<cur) return 'done'; if(i===cur) return bad?'bad':(x.status==='on_hold'?'hold':'cur'); return 'todo'; };
  const doneN=STEPS.filter((s,i)=>['done','skip'].includes(state(i))).length;
  const pct=fin?100:Math.round(doneN/(n-1)*100);
  const curName=fin?t('flow_done'):cur!=null?t('step_'+STEPS[cur]):'—';
  const sub=bad?t('s_'+x.status):x.status==='on_hold'?t('s_on_hold'):ur&&!fin?t('flow_unrep_sub'):declined&&!fin?t('flow_declined'):'';
  const items=STEPS.map((s,i)=>{ const stt=state(i); const d=at(s); const lbl=ur&&s===urStep?t('flow_unrep'):(s==='agreed'&&declined&&!ur)?t('flow_cust_declined'):t('step_'+s);
    return `<li class="tf-${stt}" ${stt==='cur'||stt==='hold'||stt==='bad'?'aria-current="step"':''}><span class="tf-dot">${stt==='done'?ic('check',15):stt==='bad'?ic('x',15):stt==='skip'?'<i></i>':ic(FLOW_IC[s],15)}</span><span class="tf-lb">${lbl}</span><small class="tf-dt">${(stt!=='todo'&&stt!=='skip')&&d?fmtD(d):'&nbsp;'}</small></li>`; }).join('');
  return `<div class="tkflow ${compact?'tkflow-sm':''}">
    <div class="tkflow-head"><div class="tf-now"><span class="tf-k">${t('flow_title')}</span><b>${fin?'':`${t('flow_step',{i:Math.min((cur||0)+1,n),n})} · `}${curName}</b>${sub?`<span class="tf-sub ${bad?'bad':''}">${esc(sub)}</span>`:''}</div>
    <div class="tf-pct"><div class="tf-bar"><i style="width:${pct}%"></i></div><span class="num">${pct}%</span></div></div>
    <ol class="tf-steps" style="--n:${n}">${items}</ol></div>`;
}
/* Thông báo phiếu chi: bấm vào mở đúng phiếu chi */
const _notifEx=A.notif; A.notif=el=>{ const n=DB.notifs.find(q=>q.id===el.dataset.id);
  if(n&&n.key==='n_exp'&&!n.ticketId){ n.read=true; S.ui.pop=null; S.ui.exp={tab:'list',q:(n.vars&&n.vars.no)||'',cat:'',st:'',page:1,size:10};
    S.ui.fin=Object.assign({q:'',dir:'',page:1,size:10},S.ui.fin||{},{tab:'exp'}); openTab(tabAllowed('expenses')?'expenses':'finance'); save(); rerender(); return; }
  return _notifEx(el); };
Object.assign(DICT.vi,{ act_mark_signed:'Khách đồng ý sửa', step_agreed:'Khách đồng ý', s_wait_customer:'Chờ khách đồng ý', h_customer_agreed:'xác nhận khách đồng ý sửa, chuyển sang sửa chữa',
  n_agreed_tech:'{no}: khách đã đồng ý sửa, bắt đầu sửa chữa', toast_agreed:'Khách đã đồng ý, phiếu chuyển sang Sửa chữa', act_accept_quote:'Đồng ý sửa' });
Object.assign(DICT.en,{ act_mark_signed:'Customer agreed', step_agreed:'Customer OK', s_wait_customer:'Awaiting customer', h_customer_agreed:'confirmed the customer agreed, moved to repair',
  n_agreed_tech:'{no}: customer agreed, start the repair', toast_agreed:'Customer agreed; job moved to repair', act_accept_quote:'Agree to repair' });


/* ===================================================================
   Tách "Khách đồng ý sửa" khỏi "Ký hợp đồng"
   - Khách đồng ý: báo giá ghi nhận khách đồng ý, phiếu chuyển sang Sửa chữa, hợp đồng CHƯA ký
   - Ký hợp đồng: làm riêng sau (nút "Đã ký hợp đồng" trong khung Báo giá & hợp đồng)
   =================================================================== */
function svcPillC(c){ if(c&&c.agreedAt&&['quote','sent'].includes(c.status)) return kpill(SVC_CLS.sent,t('sv_agreed')); return svcPill(c?c.status:''); }
A.tkSign = el => { const x=ticketById(el.dataset.id); if(!x) return; const c=x.svcId&&svcById(x.svcId); const u=me(); if(!c) return;
  if(S.ui['ed_'+c.id]&&!edCommit(c.id)) return; const now=Date.now();
  if(x.status==='pending'){
    if(c.status==='quote'){ c.status='sent'; c.sentAt=c.sentAt||now; }
    c.agreedAt=now; c.agreedBy=u.id; x.customerAgreed={ by:u.id, at:now };
    logH(x,'customer_agreed',u.id,'pending','in_service');
    if(isExternal(u)) notify({toRole:'manager',key:'n_accepted',vars:{no:c.no},ticketId:x.id});
    if(x.assigneeId) notify({ toUser:x.assigneeId, key:'n_agreed_tech', vars:{no:x.no}, ticketId:x.id });
    save(); rerender(); toast(t('toast_agreed'),'ok'); return; }
  svcSign(x,c,u); };
function svcSign(x,c,u){ if(!['quote','sent'].includes(c.status)) return; const now=Date.now();
  c.status='signed'; c.signedAt=now; c.sentAt=c.sentAt||now;
  x.approval={by:u.id,byName:u.name,byEmail:u.email,byRole:u.role,at:now,decision:'approved',note:'',contract:c.no};
  x.history.push({at:now,by:u.id,action:'contract_signed',from:null,to:null,note:c.no}); x.updatedAt=now;
  try{ syncSvc(x); }catch(e){}
  if(x.customerId&&!isExternal(u)) notify({toCustomer:x.customerId,key:'n_signed',vars:{no:x.no},ticketId:x.id});
  save(); rerender(); toast(t('toast_contract_signed'),'ok'); }
A.svcSignNow = el => { const x=ticketById(el.dataset.id); const c=x&&x.svcId&&svcById(x.svcId); if(!c) return; if(S.ui['ed_'+c.id]&&!edCommit(c.id)) return; svcSign(x,c,me()); };
const _svcGoAg=A.svcGo; A.svcGo=el=>{ const c=svcById(el.dataset.id); const r=_svcGoAg(el); if(c&&el.dataset.s==='sent'&&c.status==='sent') c.sentAt=c.sentAt||Date.now(); save(); return r; };
/* thanh tiến trình hợp đồng: từng bước tích theo đúng việc đã làm */
const CBAR2=['quote','sent','agreed','signed','invoiced','paid','done'];
contractBar=function(c){ if(c.status==='declined') return `<div class="quote" style="border-color:var(--bad);margin:0">${t('sv_declined')}${c.declined?' — '+esc(c.declined.reason):''}</div>`;
  const pst=payState(c); const signed=!!c.signedAt||['signed','in_progress','done'].includes(c.status);
  const ok={ quote:true, sent:c.status!=='quote'||!!c.sentAt, agreed:!!c.agreedAt||signed, signed, invoiced:!!c.invoice, paid:(pst==='paid'||pst==='na')&&(!!c.invoice||c.status==='done'), done:c.status==='done' };
  const dates={ quote:c.at, sent:c.sentAt, agreed:c.agreedAt, signed:c.signedAt, invoiced:c.invoice&&c.invoice.at, paid:(c.payments||[]).length?c.payments[c.payments.length-1].at:null, done:c.doneAt };
  const cur=CBAR2.findIndex(s=>!ok[s]);
  return `<div class="stepper">${CBAR2.map((s,k)=>{ const done=ok[s]; const isCur=k===cur; return `<div class="step ${done?'done':''} ${isCur?'cur':''}"><span class="c">${done?ic('check',12):k+1}</span><span>${t('cb_'+s)}</span>${(done||isCur)&&dates[s]?`<small class="muted num">${fmtD(dates[s])}</small>`:''}</div>`; }).join('')}</div>`; };
Object.assign(DICT.vi,{ cb_agreed:'Khách đồng ý', sv_agreed:'Khách đồng ý, chưa ký HĐ', act_contract_signed:'Đã ký hợp đồng', agreed_not_signed:'Khách đã đồng ý sửa. Khi ký hợp đồng giấy xong, bấm "Đã ký hợp đồng".',
  toast_contract_signed:'Đã ghi nhận ký hợp đồng', h_contract_signed:'ghi nhận đã ký hợp đồng' });
Object.assign(DICT.en,{ cb_agreed:'Agreed', sv_agreed:'Agreed, not signed', act_contract_signed:'Contract signed', agreed_not_signed:'Customer agreed to the repair. Once the paper contract is signed, press "Contract signed".',
  toast_contract_signed:'Contract signing recorded', h_contract_signed:'recorded the signed contract' });

Object.assign(DICT.vi,{ step_received:'Tiếp nhận', step_diagnosing:'Chẩn đoán', step_pending:'Chờ duyệt', step_approved:'Đã duyệt', step_agreed:'Khách đồng ý', step_in_service:'Sửa chữa', step_testing:'Kiểm tra', step_ready:'Chờ giao máy', step_delivered:'Giao trả',
  s_ready:'Chờ giao máy', flow_title:'Tiến trình sửa chữa', flow_step:'Bước {i}/{n}', flow_done:'Đã giao trả máy', flow_declined:'Khách không đồng ý sửa, trả máy', flow_cust_declined:'Khách từ chối',
  act_ready_title:'Giao trả máy', ready_hint:'Đã kiểm tra đạt lúc {d} ({u})', test_pass_ready:'Đạt, chuyển chờ giao máy', retest:'Kiểm tra lại', confirm_delivery:'Xác nhận đã giao máy',
  n_ready:'{no}: đã sửa xong, kiểm tra đạt, chờ giao máy', toast_ready:'Kiểm tra đạt, máy chuyển sang chờ giao', h_test_passed:'kiểm tra đạt, chờ giao máy', carrier:'Hình thức giao' });
Object.assign(DICT.en,{ step_received:'Received', step_diagnosing:'Diagnosis', step_pending:'Approval', step_approved:'Approved', step_agreed:'Customer OK', step_in_service:'Repair', step_testing:'Testing', step_ready:'Ready', step_delivered:'Returned',
  s_ready:'Ready for pickup', flow_title:'Repair progress', flow_step:'Step {i}/{n}', flow_done:'Returned to customer', flow_declined:'Customer declined, returning unit', flow_cust_declined:'Declined',
  act_ready_title:'Hand over the unit', ready_hint:'Passed testing at {d} ({u})', test_pass_ready:'Pass, ready to hand over', retest:'Test again', confirm_delivery:'Confirm handover',
  n_ready:'{no}: repaired and tested, ready to hand over', toast_ready:'Test passed; unit is ready to hand over', h_test_passed:'passed testing, ready to hand over', carrier:'Delivery method' });
/* màn hình hẹp: tự cuộn thanh tiến trình tới bước hiện tại */
const _renderTF=render; render=function(){ const r=_renderTF.apply(this,arguments); try{ document.querySelectorAll('.tf-steps').forEach(ol=>{ const c=ol.querySelector('[aria-current]')||ol.querySelector('.tf-todo'); if(c&&ol.scrollWidth>ol.clientWidth) ol.scrollLeft=Math.max(0,c.offsetLeft-ol.clientWidth/2+c.offsetWidth/2); }); }catch(e){} return r; };


/* ===================================================================
   Kho: yêu cầu xuất linh kiện cho phiếu sửa chữa
   Tiếp nhận (kho nhận yêu cầu) → Chờ duyệt (quản lý) → Đã duyệt → Đã xuất kho (trừ tồn)
   Yêu cầu tự tạo khi phiếu chuyển sang Sửa chữa và có linh kiện
   =================================================================== */
const WH_STEPS=['received','pending','approved','issued'];
const WH_IC={ received:'clip', pending:'clock', approved:'shield', issued:'box' };
function whParts(x){ const c=x.svcId&&svcById(x.svcId); let ps=c?c.items.filter(i=>i.type==='part'&&i.pn).map(i=>({pn:i.pn,qty:i.qty||1})):[];
  if(!ps.length) ps=((x.diagnosis&&x.diagnosis.estParts)||[]).filter(p=>p.pn).map(p=>({pn:p.pn,qty:p.qty||1})); return ps; }
function whEnsure(x,silent){ if(x.wh) return x.wh; if(!['in_service','on_hold'].includes(x.status)) return null; const ps=whParts(x); if(!ps.length) return null;
  const now=Date.now(); x.wh={ no:erpNo('YX'), status:'new', parts:ps, createdAt:now, log:[] };
  if(!silent) notify({ toRole:'warehouse', key:'n_wh_new', vars:{no:x.no}, ticketId:x.id }); return x.wh; }
function whLog(x,k){ const now=Date.now(); x.wh.log.push({ k, at:now, by:S.userId }); x.updatedAt=now; }
function whAt(w,k){ const e=(w.log||[]).filter(l=>l.k===k); return e.length?e[e.length-1]:null; }
function whBox(x){ const u=me(); if(!u||isExternal(u)) return ''; const w=whEnsure(x); if(!w) return ''; if(w.status==='cancelled') return `<section class="card"><div class="card-b row" style="gap:10px">${ic('box',16)} <b>${t('wh_title')} <span class="mono">${w.no}</span></b> <span class="kst k-bad">${t('wh_st_cancelled')}</span></div></section>`;
  const idx={ new:0, pending:1, approved:3, issued:4 }[w.status];
  const items=WH_STEPS.map((s,i)=>{ const stt=i<idx?'done':i===idx?'cur':'todo'; const ev=s==='received'?(whAt(w,'received')||{at:w.createdAt}):whAt(w,s); 
    return `<li class="tf-${stt}" ${stt==='cur'?'aria-current="step"':''}><span class="tf-dot">${stt==='done'?ic('check',15):ic(WH_IC[s],15)}</span><span class="tf-lb">${t('wh_'+s)}</span><small class="tf-dt">${stt!=='todo'&&ev&&ev.at?fmtD(ev.at):'&nbsp;'}</small></li>`; }).join('');
  const pct=Math.round(Math.min(idx,4)/4*100);
  const head=w.status==='issued'?t('wh_done'):t('flow_step',{i:Math.min(idx+1,4),n:4})+' · '+t('wh_now_'+w.status);
  const rows=w.parts.map(p=>{ const s=stockBy(p.pn); const q=s?s.qty:null; const short=w.status!=='issued'&&(q==null||q<p.qty); const av=q==null?null:q-reservedQty(p.pn,x.id); return `<tr><td class="mono">${esc(p.pn)}</td><td>${esc(partName(p.pn))}</td><td class="r num">${p.qty}</td><td class="r num" style="${short?'color:var(--bad);font-weight:600':''}">${q==null?'—':fmtNum(q)}${w.status!=='issued'&&av!=null?` <small class="muted">/ ${fmtNum(av)}</small>`:''}</td></tr>`; }).join('');
  const short=w.parts.filter(p=>{ const s=stockBy(p.pn); return !s||s.qty<p.qty; });
  let act='';
  if(w.status==='new') act=can('stock_move')?`<button class="btn primary" data-a="whGo" data-id="${x.id}" data-to="pending">${ic('check',15)} ${t('wh_act_receive')}</button>`:`<span class="hint">${t('wh_wait_receive')}</span>`;
  if(w.status==='pending') act=can('ticket_approve')?`<button class="btn okb" data-a="whGo" data-id="${x.id}" data-to="approved">${ic('check',15)} ${t('wh_act_approve')}</button>`:`<span class="hint">${t('wh_wait_approve')}</span>`;
  if(w.status==='approved') act=can('stock_move')?`<button class="btn primary" data-a="whGo" data-id="${x.id}" data-to="issued">${ic('box',15)} ${t('wh_act_issue')}</button>${short.length?`<span class="hint" style="color:var(--bad)">${t('insufficient_stock',{p:short.map(p=>p.pn).join(', ')})}</span>`:''}`:`<span class="hint">${t('wh_wait_issue')}</span>`;
  const cS=x.svcId&&svcById(x.svcId); if(w.status!=='issued'){ if(short.length&&(can('stock_move')||can('po_manage'))) act+=`<button class="btn" data-a="whPo" data-id="${x.id}">${ic('truck',15)} ${t('wh_po_btn')}</button>`; if(w.poNos&&w.poNos.length) act+=`<span class="hint">${t('wh_po_made',{p:w.poNos.join(', ')})}</span>`; if(cS&&!cS.depMet&&!depOk(cS)) act+=`<span class="hint" style="color:var(--warn)">${t('wh_dep_wait',{a:money(depNeed(cS)-docPaid(cS))})}</span>`; }
  if(w.status==='issued'){ const e=whAt(w,'issued'); act=`<span class="hint">${t('wh_issued_by',{u:esc(uname(e&&e.by)),d:e?fmtDT(e.at):''})}${w.moveNos&&w.moveNos.length?' · '+w.moveNos.map(n=>`<span class="mono">${n}</span>`).join(', '):''}</span>`; }
  return `<section class="card action-card whbox"><div class="card-h"><h3 style="color:var(--accent-ink)">${ic('box',16)} ${t('wh_title')} <span class="mono" style="font-weight:500;color:var(--ink-2)">${w.no}</span></h3><span class="pill ${w.status==='issued'?'s-closed':w.status==='approved'?'s-approved':'s-pending'}">${t('wh_st_'+w.status)}</span>${w.extra?` <span class="kst k-blue">${t('wh_extra')}</span>`:''}</div>
    <div class="card-b" style="display:flex;flex-direction:column;gap:14px">
      <div class="tkflow tkflow-sm"><div class="tkflow-head"><div class="tf-now"><span class="tf-k">${t('wh_flow')}</span><b>${head}</b></div><div class="tf-pct"><div class="tf-bar"><i style="width:${pct}%"></i></div><span class="num">${pct}%</span></div></div><ol class="tf-steps" style="--n:4">${items}</ol></div>
      <div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl"><thead><tr><th>${t('part_no')}</th><th>${t('part_name')}</th><th class="r">${t('qty')}</th><th class="r">${t('pa_stock')}</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="row" style="gap:10px;flex-wrap:wrap">${act}</div></div></section>`; }
A.whGo = el => { const x=ticketById(el.dataset.id); const w=x&&x.wh; const to=el.dataset.to; if(!w) return; const u=me();
  if(to==='pending'&&w.status==='new'){ w.status='pending'; whLog(x,'received'); notify({toRole:'manager',key:'n_wh_pending',vars:{no:x.no},ticketId:x.id}); }
  else if(to==='approved'&&w.status==='pending'){ w.status='approved'; whLog(x,'pending'); whLog(x,'approved'); notify({toRole:'warehouse',key:'n_wh_approved',vars:{no:x.no},ticketId:x.id}); }
  else if(to==='issued'&&w.status==='approved'){ const short=w.parts.filter(p=>{ const s=stockBy(p.pn); return !s||s.qty<p.qty; });
    if(short.length){ toast(t('insufficient_stock',{p:short.map(p=>p.pn).join(', ')}),'bad'); return; }
    const c=x.svcId&&svcById(x.svcId); w.moveNos=[];
    w.parts.forEach(p=>{ const s=stockBy(p.pn); s.qty=Math.max(0,s.qty-p.qty); logMove('out',p.pn,p.qty,c?{kind:'svc',id:c.id}:{kind:'ticket',id:x.id},x.no); w.moveNos.push(DB.moves[0].no); });
    w.status='issued'; whLog(x,'issued'); x.history.push({at:Date.now(),by:u.id,action:'wh_issued',from:null,to:null,note:w.no});
    if(x.assigneeId) notify({toUser:x.assigneeId,key:'n_wh_issued',vars:{no:x.no},ticketId:x.id}); }
  else return;
  save(); rerender(); toast(t('wh_toast_'+w.status),'ok'); };
Object.assign(DICT.vi,{ wh_title:'Kho · Xuất linh kiện', wh_flow:'Tiến trình kho', wh_received:'Tiếp nhận', wh_pending:'Chờ duyệt', wh_approved:'Đã duyệt', wh_issued:'Đã xuất kho',
  wh_now_new:'Kho tiếp nhận yêu cầu', wh_now_pending:'Chờ quản lý duyệt', wh_now_approved:'Chờ xuất kho', wh_done:'Đã xuất kho đủ linh kiện',
  wh_st_new:'Yêu cầu mới', wh_st_pending:'Chờ duyệt', wh_st_approved:'Đã duyệt', wh_st_issued:'Đã xuất kho',
  wh_act_receive:'Tiếp nhận yêu cầu', wh_act_approve:'Duyệt xuất kho', wh_act_issue:'Xuất kho', wh_wait_receive:'Chờ thủ kho tiếp nhận yêu cầu.', wh_wait_approve:'Chờ quản lý duyệt xuất kho.', wh_wait_issue:'Đã duyệt, chờ thủ kho xuất linh kiện.',
  wh_issued_by:'Xuất bởi {u} lúc {d}', wh_toast_pending:'Kho đã tiếp nhận, đã gửi quản lý duyệt', wh_toast_approved:'Đã duyệt xuất kho, đã báo thủ kho', wh_toast_issued:'Đã xuất kho, tồn kho đã trừ',
  n_wh_new:'{no}: yêu cầu xuất linh kiện mới, cần kho tiếp nhận', n_wh_pending:'{no}: yêu cầu xuất kho chờ duyệt', n_wh_approved:'{no}: đã duyệt xuất kho, cần xuất linh kiện', n_wh_issued:'{no}: kho đã xuất linh kiện cho bạn', h_wh_issued:'kho đã xuất linh kiện' });
Object.assign(DICT.en,{ wh_title:'Warehouse · Parts issue', wh_flow:'Warehouse progress', wh_received:'Received', wh_pending:'Approval', wh_approved:'Approved', wh_issued:'Issued',
  wh_now_new:'Warehouse to receive request', wh_now_pending:'Awaiting manager approval', wh_now_approved:'Awaiting issue', wh_done:'All parts issued',
  wh_st_new:'New request', wh_st_pending:'Pending', wh_st_approved:'Approved', wh_st_issued:'Issued',
  wh_act_receive:'Receive request', wh_act_approve:'Approve issue', wh_act_issue:'Issue parts', wh_wait_receive:'Waiting for the warehouse to receive.', wh_wait_approve:'Waiting for manager approval.', wh_wait_issue:'Approved; waiting for the warehouse to issue.',
  wh_issued_by:'Issued by {u} at {d}', wh_toast_pending:'Received; sent to manager for approval', wh_toast_approved:'Issue approved; warehouse notified', wh_toast_issued:'Parts issued; stock updated',
  n_wh_new:'{no}: new parts request for the warehouse', n_wh_pending:'{no}: parts issue awaiting approval', n_wh_approved:'{no}: parts issue approved, please issue', n_wh_issued:'{no}: the warehouse issued your parts', h_wh_issued:'warehouse issued the parts' });
/* tạo yêu cầu ngay khi phiếu chuyển sang Sửa chữa */
const _tkSignWh=A.tkSign; A.tkSign=el=>{ _tkSignWh(el); const x=ticketById(el.dataset.id); if(x&&!x.wh&&whEnsure(x)){ save(); rerender(); } };
const _wfWh=A.wf; A.wf=(el,ev)=>{ const r=_wfWh(el,ev); const x=ticketById(el.dataset.id); if(x&&!x.wh&&whEnsure(x)){ save(); rerender(); } return r; };


/* ===================================================================
   Thanh toán trước khi giao máy + kế toán xác nhận nhận tiền kèm hình chứng từ
   =================================================================== */
function payDue(x){ const c=x&&x.svcId&&svcById(x.svcId); return c&&c.status!=='cancelled'&&c.status!=='declined'&&docTotal(c)>0?docDue(c):0; }
function payGate(x){ const c=x.svcId&&svcById(x.svcId); const due=payDue(x); if(!c) return '';
  if(due<=0) return docTotal(c)>0?`<div class="paygate ok">${ic('check',16)}<div><b>${t('pay_ok')}</b><span>${t('pay_ok_hint',{a:money(docPaid(c))})}</span></div></div>`:'';
  return `<div class="paygate">${ic('lock',16)}<div><b>${t('pay_first')}</b><span>${t('pay_left',{a:money(due),t:money(docTotal(c))})}</span></div>${can('pay_record')?`<button class="btn primary sm" data-a="payAsk" data-id="${c.id}">${ic('check',14)} ${t('pay_confirm_btn')}</button>`:`<span class="hint">${t('pay_wait_acc')}</span>`}</div>`; }
/* chặn giao máy khi chưa thanh toán; báo kế toán khi máy chờ giao */
const _wfPay=A.wf; A.wf=(el,ev)=>{ const x=ticketById(el.dataset.id); const op=el.dataset.op;
  if(op==='deliver'&&x&&payDue(x)>0){ toast(t('pay_first'),'bad'); return; }
  const r=_wfPay(el,ev);
  if(op==='testPass'&&x&&isReady(x)&&payDue(x)>0){ notify({toRole:'accountant',key:'n_ready_pay',vars:{no:x.no,a:money(payDue(x))},ticketId:x.id}); save(); }
  return r; };
/* form ghi nhận thanh toán: thêm hình chứng từ (bắt buộc với tiền thu của khách) */
const _mPay=MODALS.pay; MODALS.pay=m=>{ const r=_mPay(m); if(poById(m.id)) return r; const imgs=m.f.images||(m.f.images=[]); const E=m.err||{};
  r.body+=`<div class="field full" style="margin-top:14px"><span class="lbl req">${t('pay_proof')}</span>
    <div class="payimgs">${imgs.map((a,i)=>`<div class="payimg"><img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt="${esc(a.name)}"><button type="button" class="icon-btn" data-a="payImgDel" data-i="${i}" aria-label="${t('delete')}">${ic('x',13)}</button></div>`).join('')}
    <label class="payimg-add ${E.img?'err':''}">${ic('upload',18)}<span>${t('pay_proof_add')}</span><input type="file" accept="image/*" multiple data-file="payImgs" hidden></label></div>
    ${E.img?`<div class="err-text">${E.img}</div>`:`<div class="hint">${t('pay_proof_hint')}</div>`}</div>`;
  return r; };
A.payImgs = input => readFiles(input,'image', arr=>{ const m=S.ui.modal; if(!m||m.type!=='pay') return; m.f.images=(m.f.images||[]).concat(arr); if(m.err) delete m.err.img; rerender(); });
A.payImgDel = el => { const m=S.ui.modal; if(!m) return; m.f.images.splice(+el.dataset.i,1); rerender(); };
const _paySaveImg=A.paySave; A.paySave=()=>{ const m=S.ui.modal; if(!m) return; const d=docOf(m.id); const incoming=!poById(m.id);
  if(incoming&&!(m.f.images||[]).length){ m.err=Object.assign({},m.err,{img:t('pay_proof_req')}); rerender(); return; }
  const n0=(d.payments||[]).length; const imgs=(m.f.images||[]).slice();
  _paySaveImg();
  if((d.payments||[]).length>n0){ const p=d.payments[d.payments.length-1]; p.images=imgs; try{ if(typeof uploadAttachments==='function'&&imgs.length){ const x=ticketById(d.ticketId); if(x) setTimeout(()=>uploadAttachments(x,imgs),0); } }catch(e){}
    const x=d.ticketId&&ticketById(d.ticketId);
    if(x&&payDue(x)<=0&&isReady(x)){ if(x.assigneeId) notify({toUser:x.assigneeId,key:'n_paid_handover',vars:{no:x.no},ticketId:x.id}); notify({toRole:'manager',key:'n_paid_handover',vars:{no:x.no},ticketId:x.id}); }
    save(); rerender(); } };
/* danh sách thanh toán: có cột hình chứng từ */
payList=function(d){ const ps=d.payments||[]; if(!ps.length) return `<div class="muted">${t('no_payments')}</div>`;
  return `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('doc_date')}</th><th>${t('pay_method')}</th><th>${t('note_l')}</th><th>${t('created_by_l')}</th><th>${t('pay_proof')}</th><th class="r">${t('amount')}</th></tr></thead><tbody>${ps.map(p=>`<tr><td class="num nowrap">${fmtD(p.at)}</td><td>${t('pm_'+(p.method||'bank'))}</td><td>${esc(L(p.note)||'—')}</td><td>${esc(uname(p.by))}</td><td>${(p.images||[]).length?`<div class="msg-imgs" style="margin:0">${p.images.map(a=>`<button type="button" class="msg-img" data-a="imgView" data-f="${a.id}" title="${esc(a.name)}"><img src="${imgSrc(a)}" alt="${esc(a.name)}"></button>`).join('')}</div>`:'<span class="muted">—</span>'}</td><td class="r num">${money(p.amount)}</td></tr>`).join('')}</tbody></table></div>`; };
const _findImgPay=findImg; findImg=function(fid){ const a=_findImgPay(fid); if(a) return a; for(const list of [DB.svc,DB.orders,DB.purchases]) for(const d of (list||[])) for(const p of (d.payments||[])) for(const im of (p.images||[])) if(im.id===fid) return im; return null; };
Object.assign(DICT.vi,{ pay_first:'Chưa thanh toán đủ, chưa được giao máy', pay_left:'Còn phải thu {a} / tổng {t}. Kế toán xác nhận đã nhận tiền thì mới giao máy.', pay_confirm_btn:'Xác nhận đã nhận tiền', pay_wait_acc:'Chờ kế toán xác nhận thanh toán.',
  pay_ok:'Đã thanh toán đủ', pay_ok_hint:'Đã thu {a}. Có thể giao máy cho khách.', pay_proof:'Hình chứng từ thanh toán', pay_proof_add:'Tải hình lên', pay_proof_hint:'Ảnh chụp ủy nhiệm chi, màn hình chuyển khoản hoặc phiếu thu.', pay_proof_req:'Cần tải ít nhất 1 hình chứng từ',
  n_ready_pay:'{no}: máy đã sửa xong, chờ thu {a} để giao máy', n_paid_handover:'{no}: kế toán đã xác nhận thanh toán, có thể giao máy', record_payment:'Xác nhận thanh toán' });
Object.assign(DICT.en,{ pay_first:'Not fully paid; handover is locked', pay_left:'{a} still due of {t}. The unit can be handed over once accounting confirms payment.', pay_confirm_btn:'Confirm payment received', pay_wait_acc:'Waiting for accounting to confirm payment.',
  pay_ok:'Fully paid', pay_ok_hint:'{a} received. Ready to hand over.', pay_proof:'Payment proof', pay_proof_add:'Upload images', pay_proof_hint:'Bank transfer screenshot, payment order or receipt.', pay_proof_req:'Upload at least one proof image',
  n_ready_pay:'{no}: repaired, collect {a} before handover', n_paid_handover:'{no}: payment confirmed, ready to hand over', record_payment:'Confirm payment' });

/* người không phải KTV phụ trách (kế toán, quản lý...) cũng thấy khung chờ thanh toán khi máy chờ giao */
function readyPayBox(x){ const u=me(); if(!u||isExternal(u)||!isReady(x)) return ''; if(x.assigneeId===u.id&&can('ticket_repair')) return '';
  const c=x.svcId&&svcById(x.svcId); if(!c||docTotal(c)<=0) return '';
  return `<section class="card action-card"><div class="card-h"><h3>${ic('box',16)} ${t('ready_pay_title')}</h3></div><div class="card-b" style="padding-top:2px">${payGate(x)}</div></section>`; }
Object.assign(DICT.vi,{ ready_pay_title:'Máy chờ giao · Thanh toán' }); Object.assign(DICT.en,{ ready_pay_title:'Ready for handover · Payment' });


/* ===================================================================
   Bắt buộc hình ảnh / file xác nhận ở các bước:
   sửa xong · kiểm tra đạt · giao máy · ký hợp đồng · xuất hóa đơn
   =================================================================== */
const PROOF_STAGES=['repair','test','delivery','contract','invoice'];
const PROOF_DOCS={ contract:true, invoice:true };
const PROOF_ACCEPT_DOC='image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.log,.zip';
function proofAsk(stage,tid,cid,run){ openModal({ type:'proof', stage, tid, cid, run, f:{ files:[], note:'' }, err:{} }); }
MODALS.proof = m => { const f=m.f, E=m.err||{}; const doc=PROOF_DOCS[m.stage]; const x=m.tid&&ticketById(m.tid); const c=m.cid&&svcById(m.cid);
  const ref=[x&&x.no, c&&c.no].filter(Boolean).join(' · ');
  return { title:`${t('pf_title_'+m.stage)}${ref?` · <span class="mono">${esc(ref)}</span>`:''}`, body:`<p class="muted" style="margin:0 0 12px">${t('pf_hint_'+m.stage)}</p>
    <div class="payimgs">${f.files.map((a,i)=>`<div class="payimg">${(a.mime||'').startsWith('image/')?`<img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt="${esc(a.name)}">`:`<div class="pf-file">${ic('file',22)}<span>${esc(a.name)}</span></div>`}<button type="button" class="icon-btn" data-a="pfDel" data-i="${i}" aria-label="${t('delete')}">${ic('x',13)}</button></div>`).join('')}
    <label class="payimg-add ${E.files?'err':''}">${ic('upload',18)}<span>${t(doc?'pf_add_doc':'pf_add_img')}</span><input type="file" accept="${doc?PROOF_ACCEPT_DOC:'image/*'}" multiple data-file="pfFiles" hidden></label></div>
    ${E.files?`<div class="err-text">${E.files}</div>`:`<div class="hint">${t(doc?'pf_req_doc':'pf_req_img')}</div>`}
    <div class="field" style="margin-top:14px"><label for="pf-n">${t('note_l')}</label><input class="input" id="pf-n" data-bind="modal.f.note" value="${esc(f.note)}"></div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="pfOk">${ic('check',15)} ${t('pf_confirm_'+m.stage)}</button>` }; };
A.pfFiles = input => readFiles(input,'image', arr=>{ const m=S.ui.modal; if(!m||m.type!=='proof') return; arr.forEach(a=>{ if(!(a.mime||'').startsWith('image/')) a.kind='file'; }); m.f.files=m.f.files.concat(arr); if(m.err) delete m.err.files; rerender(); });
A.pfDel = el => { const m=S.ui.modal; if(!m) return; m.f.files.splice(+el.dataset.i,1); rerender(); };
A.pfOk = () => { const m=S.ui.modal; if(!m||m.type!=='proof') return;
  if(!m.f.files.length){ m.err={files:t(PROOF_DOCS[m.stage]?'pf_need_doc':'pf_need_img')}; rerender(); return; }
  const x=m.tid&&ticketById(m.tid); const c=m.cid?svcById(m.cid):(x&&x.svcId&&svcById(x.svcId));
  const sig=()=>[x&&x.status,x&&x.test&&x.test.result,x&&x.delivery&&1,x&&x.wh&&x.wh.status,x&&x.intake&&1,c&&c.status,c&&c.invoice&&c.invoice.no].join('|');
  const before=sig(); const rec={ stage:m.stage, files:m.f.files.slice(), note:m.f.note||'', at:Date.now(), by:S.userId };
  S.ui.modal=null; S._proofOK=m.stage; const run=m.run;
  try{ A[run.a](Object.assign({dataset:run.ds})); } finally { S._proofOK=null; }
  if(sig()!==before){ const tgt=(m.stage==='contract'||m.stage==='invoice')&&c?c:(x||c); if(tgt){ (tgt.proofs=tgt.proofs||[]).push(rec); if(x&&tgt!==x) (x.proofs=x.proofs||[]); }
    if(x){ x.history.push({at:rec.at,by:rec.by,action:'proof_'+m.stage,from:null,to:null,note:t('pf_n_files',{n:rec.files.length})}); try{ if(typeof uploadAttachments==='function') setTimeout(()=>uploadAttachments(x,rec.files),0); }catch(e){} }
    save(); rerender(); } };
/* chặn các thao tác: chưa có hình thì mở hộp tải hình trước */
const WF_PROOF={ toTesting:'repair', testPass:'test', deliver:'delivery' };
const _wfProof=A.wf; A.wf=(el,ev)=>{ const op=el.dataset.op; const stage=WF_PROOF[op]; const x=ticketById(el.dataset.id);
  if(stage&&x&&S._proofOK!==stage){
    if(op==='deliver'&&payDue(x)>0){ toast(t('pay_first'),'bad'); return; }
    if(op==='testPass'&&x.status!=='testing') return _wfProof(el,ev);
    return proofAsk(stage,x.id,null,{a:'wf',ds:Object.assign({},el.dataset)}); }
  return _wfProof(el,ev); };
const _tkSignPf=A.tkSign; A.tkSign=el=>{ const x=ticketById(el.dataset.id); if(x&&x.status!=='pending'&&S._proofOK!=='contract'){ const c=x.svcId&&svcById(x.svcId); if(c&&['quote','sent'].includes(c.status)) return proofAsk('contract',x.id,c.id,{a:'tkSign',ds:Object.assign({},el.dataset)}); } return _tkSignPf(el); };
const _svcSignNowPf=A.svcSignNow; A.svcSignNow=el=>{ if(S._proofOK!=='contract'){ const x=ticketById(el.dataset.id); return proofAsk('contract',x&&x.id,x&&x.svcId,{a:'svcSignNow',ds:Object.assign({},el.dataset)}); } return _svcSignNowPf(el); };
const _svcGoPf=A.svcGo; A.svcGo=el=>{ if(el.dataset.s==='signed'&&S._proofOK!=='contract'){ const c=svcById(el.dataset.id); if(c) return proofAsk('contract',c.ticketId||null,c.id,{a:'svcGo',ds:Object.assign({},el.dataset)}); } return _svcGoPf(el); };
const _tkInvoicePf=A.tkInvoice; A.tkInvoice=el=>{ if(S._proofOK!=='invoice'){ if(!can('invoice_issue')) return finDeny(); const x=ticketById(el.dataset.id); return proofAsk('invoice',x&&x.id,x&&x.svcId,{a:'tkInvoice',ds:Object.assign({},el.dataset)}); } return _tkInvoicePf(el); };
/* khung hình ảnh & chứng từ trong phiếu */
function proofThumb(a){ return (a.mime||'').startsWith('image/')||a.data?`<button type="button" class="msg-img" data-a="imgView" data-f="${a.id}" title="${esc(a.name)}"><img src="${imgSrc(a)}" alt="${esc(a.name)}"></button>`:`<span class="pf-chip">${ic('file',14)} ${esc(a.name)}</span>`; }
function proofBox(x){ const u=me(); if(!u) return ''; const c=x.svcId&&svcById(x.svcId); const recs=(x.proofs||[]).concat(c&&c.proofs||[]); if(!recs.length) return '';
  const rows=PROOF_STAGES.map(s=>{ const rs=recs.filter(r=>r.stage===s); const files=rs.flatMap(r=>r.files); const last=rs[rs.length-1];
    return `<div class="pf-row ${files.length?'':'pf-empty'}"><div class="pf-h"><span class="pf-dot">${files.length?ic('check',12):''}</span><b>${t('pf_stage_'+s)}</b>${last?`<small class="muted">${esc(uname(last.by))} · ${fmtDT(last.at)}${last.note?' · '+esc(last.note):''}</small>`:`<small class="muted">${t('pf_none')}</small>`}</div>${files.length?`<div class="msg-imgs">${files.map(proofThumb).join('')}</div>`:''}</div>`; }).join('');
  return `<section class="card"><div class="card-h"><h3>${ic('image',16)} ${t('pf_box')}</h3></div><div class="card-b pf-list">${rows}</div></section>`; }
const _findImgPf=findImg; findImg=function(fid){ const a=_findImgPf(fid); if(a) return a; for(const list of [DB.tickets,DB.svc]) for(const d of (list||[])) for(const r of (d.proofs||[])) for(const f of r.files) if(f.id===fid) return f; return null; };
Object.assign(DICT.vi,{ pf_box:'Hình ảnh & chứng từ', pf_none:'Chưa có',
  pf_stage_repair:'Sau sửa chữa', pf_stage_test:'Kiểm tra / test', pf_stage_delivery:'Giao máy', pf_stage_contract:'Hợp đồng đã ký', pf_stage_invoice:'Hóa đơn đã xuất',
  pf_title_repair:'Hình ảnh sau sửa chữa', pf_title_test:'Hình ảnh kiểm tra đạt', pf_title_delivery:'Hình ảnh giao máy', pf_title_contract:'Xác nhận đã ký hợp đồng', pf_title_invoice:'Xác nhận đã xuất hóa đơn',
  pf_hint_repair:'Chụp bo mạch / linh kiện đã thay và máy sau khi sửa xong.', pf_hint_test:'Chụp màn hình thông số chạy thử, máy test, kết quả đo đạt.', pf_hint_delivery:'Chụp máy khi bàn giao, biên bản giao nhận hoặc vận đơn.',
  pf_hint_contract:'Tải bản scan / ảnh chụp hợp đồng đã ký (hình hoặc file PDF, Word).', pf_hint_invoice:'Tải hóa đơn đã xuất (hình hoặc file PDF, XML in ra...).',
  pf_add_img:'Tải hình lên', pf_add_doc:'Tải hình / file', pf_req_img:'Bắt buộc ít nhất 1 hình.', pf_req_doc:'Bắt buộc ít nhất 1 hình hoặc file.', pf_need_img:'Cần tải ít nhất 1 hình', pf_need_doc:'Cần tải ít nhất 1 hình hoặc file',
  pf_confirm_repair:'Hoàn tất sửa → Kiểm tra', pf_confirm_test:'Xác nhận kiểm tra đạt', pf_confirm_delivery:'Xác nhận đã giao máy', pf_confirm_contract:'Xác nhận đã ký hợp đồng', pf_confirm_invoice:'Xác nhận đã xuất hóa đơn',
  pf_n_files:'{n} hình/file', h_proof_repair:'tải hình sau sửa chữa', h_proof_test:'tải hình kiểm tra', h_proof_delivery:'tải hình giao máy', h_proof_contract:'tải hợp đồng đã ký', h_proof_invoice:'tải hóa đơn đã xuất' });
Object.assign(DICT.en,{ pf_box:'Photos & documents', pf_none:'None yet',
  pf_stage_repair:'After repair', pf_stage_test:'Testing', pf_stage_delivery:'Handover', pf_stage_contract:'Signed contract', pf_stage_invoice:'Issued invoice',
  pf_title_repair:'Photos after repair', pf_title_test:'Test photos', pf_title_delivery:'Handover photos', pf_title_contract:'Confirm signed contract', pf_title_invoice:'Confirm issued invoice',
  pf_hint_repair:'Photograph the replaced board/parts and the repaired unit.', pf_hint_test:'Photograph the test readings and passing results.', pf_hint_delivery:'Photograph the unit at handover, the handover form or waybill.',
  pf_hint_contract:'Upload the signed contract scan/photo (image, PDF or Word).', pf_hint_invoice:'Upload the issued invoice (image or PDF).',
  pf_add_img:'Upload photos', pf_add_doc:'Upload photo/file', pf_req_img:'At least one photo is required.', pf_req_doc:'At least one photo or file is required.', pf_need_img:'Upload at least one photo', pf_need_doc:'Upload at least one photo or file',
  pf_confirm_repair:'Finish repair → Testing', pf_confirm_test:'Confirm test passed', pf_confirm_delivery:'Confirm handover', pf_confirm_contract:'Confirm contract signed', pf_confirm_invoice:'Confirm invoice issued',
  pf_n_files:'{n} file(s)', h_proof_repair:'uploaded after-repair photos', h_proof_test:'uploaded test photos', h_proof_delivery:'uploaded handover photos', h_proof_contract:'uploaded the signed contract', h_proof_invoice:'uploaded the issued invoice' });

/* ===================================================================
   Xuất kho bắt buộc hình / file chứng từ
   =================================================================== */
PROOF_STAGES.splice(PROOF_STAGES.indexOf('delivery'),0,'issue'); PROOF_DOCS.issue=true;
const _whGoPf=A.whGo; A.whGo=el=>{ if(el.dataset.to==='issued'&&S._proofOK!=='issue'){ const x=ticketById(el.dataset.id); const w=x&&x.wh; if(!w||w.status!=='approved') return;
    const short=w.parts.filter(p=>{ const s=stockBy(p.pn); return !s||s.qty<p.qty; }); if(short.length){ toast(t('insufficient_stock',{p:short.map(p=>p.pn).join(', ')}),'bad'); return; }
    return proofAsk('issue',x.id,null,{a:'whGo',ds:Object.assign({},el.dataset)}); }
  const x=ticketById(el.dataset.id); const n0=x&&x.wh&&x.wh.status; const r=_whGoPf(el);
  if(S._proofOK==='issue'&&x&&x.wh&&x.wh.status==='issued'&&n0!=='issued'){ S._issueTid=x.id; } return r; };
const _pfOkIssue=A.pfOk; A.pfOk=()=>{ const m=S.ui.modal; const stage=m&&m.stage; const files=m&&m.f&&m.f.files.slice(); _pfOkIssue();
  if(stage==='issue'&&S._issueTid){ const x=ticketById(S._issueTid); S._issueTid=null; (x.wh.moveNos||[]).forEach(no=>{ const mv=DB.moves.find(q=>q.no===no); if(mv) mv.images=files; }); save(); rerender(); } };
/* phiếu nhập / xuất tay: chứng từ (xuất bắt buộc) */
function mvProofField(m){ const f=m.f; const imgs=f.images||(f.images=[]); const E=m.err||{}; const req=f.type==='out';
  return `<div class="field full" style="margin-top:14px"><span class="lbl ${req?'req':''}">${t('pf_docs')}</span><div class="payimgs">${imgs.map((a,i)=>`<div class="payimg">${(a.mime||'').startsWith('image/')?`<img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt="${esc(a.name)}">`:`<div class="pf-file">${ic('file',22)}<span>${esc(a.name)}</span></div>`}<button type="button" class="icon-btn" data-a="mvImgDel" data-i="${i}" aria-label="${t('delete')}">${ic('x',13)}</button></div>`).join('')}
    <label class="payimg-add ${E.img?'err':''}">${ic('upload',18)}<span>${t('pf_add_doc')}</span><input type="file" accept="${PROOF_ACCEPT_DOC}" multiple data-file="mvImgs" hidden></label></div>
    ${E.img?`<div class="err-text">${E.img}</div>`:`<div class="hint">${t(req?'mv_proof_out':'mv_proof_in')}</div>`}</div>`; }
A.mvImgs = input => readFiles(input,'image', arr=>{ const m=S.ui.modal; if(!m||m.type!=='mv') return; arr.forEach(a=>{ if(!(a.mime||'').startsWith('image/')) a.kind='file'; }); m.f.images=(m.f.images||[]).concat(arr); if(m.err) delete m.err.img; rerender(); });
A.mvImgDel = el => { const m=S.ui.modal; if(!m) return; m.f.images.splice(+el.dataset.i,1); rerender(); };
const _mvSavePf=A.mvSave; A.mvSave=()=>{ const m=S.ui.modal; if(!m) return; const f=m.f; const imgs=(f.images||[]).slice();
  if(f.type==='out'&&!imgs.length){ m.err=Object.assign({},m.err,{img:t('pf_need_doc')}); rerender(); return; }
  const top=DB.moves[0]; _mvSavePf(); if(DB.moves[0]!==top&&imgs.length){ DB.moves[0].images=imgs; save(); rerender(); } };
function mvProofs(m){ const fs=m.images||[]; if(!fs.length) return '<span class="muted">—</span>'; return `<div class="msg-imgs" style="margin:0">${fs.map(a=>(a.mime||'').startsWith('image/')||a.data?`<button type="button" class="msg-img sm" data-a="imgView" data-f="${a.id}" title="${esc(a.name)}"><img src="${imgSrc(a)}" alt="${esc(a.name)}"></button>`:`<span class="pf-chip">${ic('file',13)} ${esc(a.name)}</span>`).join('')}</div>`; }
const _findImgMv=findImg; findImg=function(fid){ const a=_findImgMv(fid); if(a) return a; for(const m of (DB.moves||[])) for(const f of (m.images||[])) if(f.id===fid) return f; return null; };
Object.assign(DICT.vi,{ pf_stage_issue:'Xuất kho', pf_title_issue:'Chứng từ xuất kho', pf_hint_issue:'Chụp linh kiện xuất ra, phiếu xuất kho có ký nhận (hình hoặc file).', pf_confirm_issue:'Xác nhận xuất kho', h_proof_issue:'tải chứng từ xuất kho',
  pf_docs:'Chứng từ', mv_proof_out:'Bắt buộc ít nhất 1 hình hoặc file (phiếu xuất, ảnh hàng xuất).', mv_proof_in:'Không bắt buộc: hóa đơn, phiếu giao hàng, ảnh hàng nhập.' });
Object.assign(DICT.en,{ pf_stage_issue:'Parts issue', pf_title_issue:'Parts issue proof', pf_hint_issue:'Photograph the issued parts or the signed issue slip (image or file).', pf_confirm_issue:'Confirm issue', h_proof_issue:'uploaded the issue proof',
  pf_docs:'Documents', mv_proof_out:'At least one photo or file is required (issue slip, photo).', mv_proof_in:'Optional: invoice, delivery note, photo of goods.' });

/* ===================================================================
   Bộ lọc thời gian dùng chung: tuần / tháng / quý / năm / tùy chọn
   =================================================================== */
const DAYMS=24*3600*1000;
function perState(key,def){ return S.ui[key]||(S.ui[key]={p:def||'month',anchor:Date.now(),from:'',to:'',tab:'all',open:null,role:''}); }
function isoWeekNo(d){ const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const day=x.getUTCDay()||7; x.setUTCDate(x.getUTCDate()+4-day); const y0=new Date(Date.UTC(x.getUTCFullYear(),0,1)); return Math.ceil(((x-y0)/DAYMS+1)/7); }
function perRange(f){ const a=new Date(f.anchor||Date.now()); const y=a.getFullYear(), m=a.getMonth(); let s,e,label;
  if(f.p==='week'){ const d=new Date(y,m,a.getDate()); const dow=(d.getDay()+6)%7; s=new Date(y,m,a.getDate()-dow); e=new Date(s.getFullYear(),s.getMonth(),s.getDate()+7); label=t('per_week_l',{w:isoWeekNo(s),a:fmtD(s.getTime()),b:fmtD(e.getTime()-1)}); }
  else if(f.p==='quarter'){ const q=Math.floor(m/3); s=new Date(y,q*3,1); e=new Date(y,q*3+3,1); label=t('per_quarter_l',{q:q+1,y}); }
  else if(f.p==='year'){ s=new Date(y,0,1); e=new Date(y+1,0,1); label=t('per_year_l',{y}); }
  else if(f.p==='custom'){ const fr=f.from?new Date(f.from+'T00:00:00'):new Date(y,m,1); const to=f.to?new Date(f.to+'T00:00:00'):new Date(); s=fr; e=new Date(to.getFullYear(),to.getMonth(),to.getDate()+1); if(e<=s) e=new Date(s.getTime()+DAYMS); label=`${fmtD(s.getTime())} – ${fmtD(e.getTime()-1)}`; }
  else { s=new Date(y,m,1); e=new Date(y,m+1,1); label=t('per_month_l',{m:m+1,y}); }
  return { from:s.getTime(), to:e.getTime(), label, days:Math.round((e-s)/DAYMS) }; }
function perShift(f,dir){ const a=new Date(f.anchor||Date.now()); if(f.p==='week') a.setDate(a.getDate()+7*dir); else if(f.p==='quarter') a.setMonth(a.getMonth()+3*dir); else if(f.p==='year') a.setFullYear(a.getFullYear()+dir); else a.setMonth(a.getMonth()+dir); f.anchor=a.getTime(); }
function perBar(key){ const f=perState(key); const r=perRange(f); const isNow=Date.now()>=r.from&&Date.now()<r.to;
  return `<div class="perbar"><div class="seg">${['week','month','quarter','year','custom'].map(p=>`<button class="${f.p===p?'on':''}" data-a="perP" data-k="${key}" data-p="${p}">${t('per_'+p)}</button>`).join('')}</div>
    ${f.p==='custom'?`<div class="row" style="gap:6px"><input class="input" type="date" data-bind="${key}.from" data-re value="${f.from}" aria-label="${t('from_date')}"><span class="muted">→</span><input class="input" type="date" data-bind="${key}.to" data-re value="${f.to}" aria-label="${t('to_date')}"></div>`
    :`<div class="pernav"><button class="icon-btn" data-a="perNav" data-k="${key}" data-d="-1" aria-label="${t('per_prev')}">${ic('left',16)}</button><b>${r.label}</b><button class="icon-btn" data-a="perNav" data-k="${key}" data-d="1" aria-label="${t('per_next')}">${ic('right',16)}</button>${isNow?'':`<button class="btn sm" data-a="perNow" data-k="${key}">${t('per_now')}</button>`}</div>`}</div>`; }
A.perP = el => { const f=perState(el.dataset.k); f.p=el.dataset.p; f.anchor=Date.now(); if(f.p==='custom'&&!f.from){ const d=new Date(); f.from=toISODate(new Date(d.getFullYear(),d.getMonth(),1).getTime()); f.to=toISODate(Date.now()); } rerender(); };
A.perNav = el => { perShift(perState(el.dataset.k),+el.dataset.d); rerender(); };
A.perNow = el => { perState(el.dataset.k).anchor=Date.now(); rerender(); };
function perBuckets(r){ const out=[]; if(r.days<=31){ for(let s=r.from;s<r.to;s+=DAYMS){ const d=new Date(s); out.push({s,e:s+DAYMS,l:`${d.getDate()}/${d.getMonth()+1}`}); } }
  else if(r.days<=100){ for(let s=r.from;s<r.to;s+=7*DAYMS){ out.push({s,e:Math.min(s+7*DAYMS,r.to),l:'T'+isoWeekNo(new Date(s))}); } }
  else { let d=new Date(r.from); while(d.getTime()<r.to){ const n=new Date(d.getFullYear(),d.getMonth()+1,1); out.push({s:d.getTime(),e:Math.min(n.getTime(),r.to),l:`T${d.getMonth()+1}${r.days>370?'/'+String(d.getFullYear()).slice(2):''}`}); d=n; } }
  return out; }

/* ===================================================================
   KPI nhân sự: lọc tuần / tháng / quý / năm / tùy chọn + danh sách việc
   =================================================================== */
const histAt=(x,acts,by)=>{ const h=(x.history||[]).find(h=>acts.includes(h.action)&&(!by||h.by===by)); return h?h.at:null; };
const histBy=(x,acts)=>{ const h=(x.history||[]).find(h=>acts.includes(h.action)); return h?h.by:null; };
function kpiTasks(u){ const out=[]; const role=u.role;
  (DB.tickets||[]).forEach(x=>{
    if(x.assigneeId===u.id){ const at=histAt(x,['assigned','claimed'])||x.createdAt; const doneAt=histAt(x,['to_testing','delivered','test_passed','unrepairable']);
      out.push({kind:'repair',ref:x.id,no:x.no,what:x.company||'',at,due:x.createdAt+SLA_DAYS*DAYMS,doneAt,doneBy:doneAt?u.id:null}); }
    if(['manager','dev'].includes(role)){ const sub=histAt(x,['submitted']); if(sub){ const DA=['parts_approved','approved','returned','rejected','declined','customer_agreed']; const doneAt=histAt(x,DA); const leg=!histAt(x,['parts_approved']); out.push({kind:'approve',ref:x.id,no:x.no,what:x.company||'',at:sub,due:sub+DAYMS,doneAt,doneBy:doneAt?(leg?u.id:histBy(x,['parts_approved'])):null}); }
      if(x.wh&&whAt(x.wh,'received')){ const r=whAt(x.wh,'received'), a=whAt(x.wh,'approved'); out.push({kind:'wh_approve',ref:x.id,no:x.wh.no,what:x.no,at:r.at,due:r.at+DAYMS,doneAt:a&&a.at,doneBy:a&&a.by}); } }
    if(role==='warehouse'&&x.wh){ const i=whAt(x.wh,'issued'); out.push({kind:'wh_issue',ref:x.id,no:x.wh.no,what:x.no,at:x.wh.createdAt,due:x.wh.createdAt+2*DAYMS,doneAt:i&&i.at,doneBy:i&&i.by}); }
    if(role==='accountant'){ const c=x.svcId&&svcById(x.svcId); const rd=histAt(x,['test_passed']);
      if(c&&rd&&docTotal(c)>0){ const last=(c.payments||[]).slice(-1)[0]; const paid=docDue(c)<=0; out.push({kind:'payment',ref:x.id,no:c.no,what:x.no,at:rd,due:rd+DAYMS,doneAt:paid&&last?last.at:null,doneBy:paid&&last?last.by:null}); }
      if(c&&c.invoice&&c.invoice.by){ const d0=histAt(x,['delivered'])||c.invoice.at; out.push({kind:'invoice',ref:x.id,no:c.no,what:x.no,at:d0,due:d0+2*DAYMS,doneAt:c.invoice.at,doneBy:c.invoice.by}); } }
  });
  if(['manager','dev'].includes(role)) (DB.expenses||[]).forEach(e=>{ if(e.by===u.id) return; const done=['approved','rejected','paid'].includes(e.status)&&e.approvedBy; out.push({kind:'expense',ref:null,no:e.no,what:L(e.desc)||'',at:e.at,due:e.at+DAYMS,doneAt:done?(e.approvedAt||e.at):null,doneBy:done?e.approvedBy:null}); });
  return out.filter(k=>k.kind==='repair'||!k.doneBy||k.doneBy===u.id); }
function kpiActions(u,from,to){ let n=0; const inR=at=>at>=from&&at<to;
  (DB.tickets||[]).forEach(x=>{ (x.history||[]).forEach(h=>{ if(h.by===u.id&&inR(h.at)) n++; }); (x.internal||[]).forEach(m=>{ if(m.by===u.id&&inR(m.at)) n++; }); });
  (DB.moves||[]).forEach(m=>{ if(m.by===u.id&&inR(m.at)) n++; });
  (DB.svc||[]).forEach(c=>(c.payments||[]).forEach(p=>{ if(p.by===u.id&&inR(p.at)) n++; }));
  return n; }
function kpiTaskState(k,to){ const now=Math.min(Date.now(),to); if(k.doneAt&&k.doneAt<to) return k.doneAt<=k.due?'ontime':'late'; return now>k.due?'overdue':'doing'; }
function kpiOf(u,r){ const {from,to}=r;
  const tasks=kpiTasks(u).filter(k=>k.at<to&&(!k.doneAt||k.doneAt>=from)).map(k=>Object.assign({},k,{st:kpiTaskState(k,to)}));
  const done=tasks.filter(k=>k.st==='ontime'||k.st==='late'); const open=tasks.filter(k=>k.st==='doing'||k.st==='overdue');
  const c=s=>tasks.filter(k=>k.st===s).length;
  return { u, tasks, assigned:tasks.length, done:done.length, open:open.length, onTime:c('ontime'), late:c('late'), overdue:c('overdue'), doing:c('doing'),
    rework:(DB.tickets||[]).filter(t2=>t2.createdAt>=from&&t2.createdAt<to&&(()=>{ const rw=reworkOf(t2); return rw&&rw.t.assigneeId===u.id; })()).length,
    rate:tasks.length?done.length/tasks.length:null, onTimeRate:done.length?c('ontime')/done.length:null, actions:kpiActions(u,from,to),
    byKind:['repair','field','approve','wh_approve','wh_issue','payment','invoice','expense'].map(k=>({k,a:tasks.filter(q=>q.kind===k).length,d:done.filter(q=>q.kind===k).length,o:tasks.filter(q=>q.kind===k&&q.st==='overdue').length})).filter(x=>x.a) }; }
function kpiScore(r,maxAct){ if(!r.assigned) return null;
  const comp=r.rate, ont=r.onTimeRate==null?(r.overdue?0:1):r.onTimeRate, vol=maxAct?Math.min(1,r.actions/maxAct):0, od=1-r.overdue/r.assigned;
  return Math.max(0,Math.round(35*comp+35*ont+15*vol+15*od)-Math.min(15,5*(r.rework||0))); }
const kpiGrade=s=>s==null?'—':s>=85?'A':s>=70?'B':s>=50?'C':'D';
const kpiStaff=()=>(DB.users||[]).filter(u=>['manager','engineer','warehouse','accountant'].includes(u.role)&&u.active!==false);
function kpiRows(r,role){ const me0=me(); const boss=isBossRole(me0); let staff=boss?kpiStaff():[me0]; if(boss&&role) staff=staff.filter(u=>u.role===role);
  const rows=staff.map(u=>kpiOf(u,r)); const mx={}; rows.forEach(x=>{ mx[x.u.role]=Math.max(mx[x.u.role]||0,x.actions); }); rows.forEach(x=>{ x.score=kpiScore(x,mx[x.u.role]); });
  return rows.sort((a,b)=>(b.score??-1)-(a.score??-1)); }
const KST_CLS={ ontime:'k-ok', late:'k-warn', doing:'k-blue', overdue:'k-bad' };
function viewKpi(){ const me0=me(); const boss=isBossRole(me0); const f=perState('kpi'); const r=perRange(f);
  const rows=kpiRows(r,f.role); const pct=v=>v==null?'—':Math.round(v*100)+'%'; const tot=k=>rows.reduce((s,x)=>s+x[k],0);
  const sc=rows.filter(x=>x.score!=null); const avgS=sc.length?Math.round(sc.reduce((s,x)=>s+x.score,0)/sc.length):null;
  const cards=`<div class="stat-row kpi-stats">
    <div class="card stat"><div class="l">${t(boss?'kpi_avg':'kpi_my_score')}</div><div class="v">${avgS==null?'—':avgS} <span class="kgrade g${kpiGrade(avgS)}">${kpiGrade(avgS)}</span></div></div>
    <div class="card stat"><div class="l">${t('kpi_assigned')}</div><div class="v">${fmtNum(tot('assigned'))}</div></div>
    <div class="card stat"><div class="l">${t('kst_ontime')}</div><div class="v" style="color:var(--ok)">${fmtNum(tot('onTime'))}</div></div>
    <div class="card stat"><div class="l">${t('kst_late')}</div><div class="v" style="color:var(--warn)">${fmtNum(tot('late'))}</div></div>
    <div class="card stat"><div class="l">${t('kst_doing')}</div><div class="v" style="color:var(--blue)">${fmtNum(tot('doing'))}</div></div>
    <div class="card stat"><div class="l">${t('kst_overdue')}</div><div class="v" style="color:var(--bad)">${fmtNum(tot('overdue'))}</div></div></div>`;
  const body=rows.map(x=>{ const opened=f.open===x.u.id||!boss; const s=x.score; const seg=k=>x.assigned?(x[k]/x.assigned*100):0;
    return `<tr class="kpi-row" data-a="kpiOpen" data-id="${x.u.id}" style="cursor:pointer">
      <td><div class="row" style="gap:10px;flex-wrap:nowrap"><span class="tw-car">${ic(opened?'down':'right',14)}</span><span class="avatar">${esc(initials(x.u.name))}</span><div><b>${esc(x.u.name)}</b><br><small class="muted">${t('role_'+x.u.role)}</small></div></div></td>
      <td class="r num">${fmtNum(x.assigned)}</td>
      <td style="min-width:180px">${x.assigned?`<div class="kstack" title="${t('kst_ontime')} ${x.onTime} · ${t('kst_late')} ${x.late} · ${t('kst_doing')} ${x.doing} · ${t('kst_overdue')} ${x.overdue}"><i class="k-ok" style="width:${seg('onTime')}%"></i><i class="k-warn" style="width:${seg('late')}%"></i><i class="k-blue" style="width:${seg('doing')}%"></i><i class="k-bad" style="width:${seg('overdue')}%"></i></div><small class="muted num">${x.onTime} · ${x.late} · ${x.doing} · <span style="${x.overdue?'color:var(--bad);font-weight:700':''}">${x.overdue}</span></small>`:'<span class="muted">—</span>'}</td>
      <td class="r num">${pct(x.rate)}</td><td class="r num">${pct(x.onTimeRate)}</td><td class="r num" style="${x.rework?'color:var(--bad);font-weight:700':''}">${x.u.role==='engineer'?fmtNum(x.rework):'—'}</td><td class="r num">${fmtNum(x.actions)}</td>
      <td style="min-width:150px"><div class="kscore"><div class="kbar"><i class="g${kpiGrade(s)}" style="width:${s||0}%"></i></div><b class="num">${s==null?'—':s}</b><span class="kgrade g${kpiGrade(s)}">${kpiGrade(s)}</span></div></td></tr>
      ${opened?`<tr class="kpi-detail"><td colspan="8">${kpiDetail(x,f)}</td></tr>`:''}`; }).join('');
  return `<div class="page-head"><div><h1>${t('kpi_title')}</h1><p class="muted" style="margin:4px 0 0">${t(boss?'kpi_sub':'kpi_sub_me')}</p></div>
    ${boss?`<select class="select" style="width:auto" data-bind="kpi.role" data-re aria-label="${t('kpi_all_roles')}"><option value="">${t('kpi_all_roles')}</option>${['manager','engineer','warehouse','accountant'].map(x=>`<option value="${x}" ${f.role===x?'selected':''}>${t('role_'+x)}</option>`).join('')}</select>`:''}</div>
    ${perBar('kpi')}${cards}
    <section class="card"><div class="table-wrap"><table class="tbl"><thead><tr><th>${t('kpi_staff')}</th><th class="r">${t('kpi_assigned')}</th><th>${t('kpi_breakdown')} <small class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">(${t('kst_ontime')} · ${t('kst_late')} · ${t('kst_doing')} · ${t('kst_overdue')})</small></th><th class="r">${t('kpi_rate')}</th><th class="r">${t('kpi_ontime')}</th><th class="r">${t('kpi_rework')}</th><th class="r">${t('kpi_actions')}</th><th>${t('kpi_score')}</th></tr></thead><tbody>${body||`<tr><td colspan="8" class="empty">${t('no_results')}</td></tr>`}</tbody></table></div></section>
    <p class="hint" style="margin-top:10px">${t('kpi_formula')}</p>`; }
function kpiDetail(x,f){ if(!x.tasks.length) return `<div class="muted" style="padding:6px 0">${t('kpi_no_task')}</div>`;
  const tab=f.tab||'all'; const cnt={all:x.tasks.length,done:x.onTime+x.late,open:x.doing,late:x.overdue};
  const list=x.tasks.filter(k=>tab==='all'||(tab==='done'&&(k.st==='ontime'||k.st==='late'))||(tab==='open'&&k.st==='doing')||(tab==='late'&&k.st==='overdue'))
    .sort((a,b)=>({overdue:0,doing:1,late:2,ontime:3}[a.st]-{overdue:0,doing:1,late:2,ontime:3}[b.st])||(b.at-a.at));
  return `<div class="kpi-dgrid"><div><div class="lbl" style="margin-bottom:6px">${t('kpi_by_kind')}</div><table class="tbl compact"><thead><tr><th>${t('kpi_kind')}</th><th class="r">${t('kpi_assigned')}</th><th class="r">${t('kpi_done')}</th><th class="r">${t('kst_overdue')}</th></tr></thead><tbody>${x.byKind.map(b=>`<tr><td>${t('kk_'+b.k)}</td><td class="r num">${b.a}</td><td class="r num">${b.d}</td><td class="r num" style="${b.o?'color:var(--bad);font-weight:700':''}">${b.o}</td></tr>`).join('')}</tbody></table></div>
    <div><div class="row" style="justify-content:space-between;margin-bottom:8px;gap:8px;flex-wrap:wrap"><div class="lbl">${t('kpi_task_list')}</div><div class="seg sm">${['all','done','open','late'].map(k=>`<button class="${tab===k?'on':''}" data-a="kpiTab" data-k="${k}">${t('ktab_'+k)} <span class="muted">${cnt[k]}</span></button>`).join('')}</div></div>
    ${list.length?`<div class="table-wrap ktasks"><table class="tbl compact"><thead><tr><th>${t('kpi_kind')}</th><th>${t('kpi_ref')}</th><th>${t('kpi_given')}</th><th>${t('kpi_due')}</th><th>${t('kpi_done_at')}</th><th>${t('status')}</th></tr></thead><tbody>${list.slice(0,40).map(k=>`<tr ${k.ref?`data-a="openTicket" data-id="${k.ref}" style="cursor:pointer"`:''}><td>${t('kk_'+k.kind)}</td><td><span class="mono">${esc(k.no||'')}</span>${k.what?`<br><small class="muted">${esc(k.what)}</small>`:''}</td><td class="num nowrap">${fmtD(k.at)}</td><td class="num nowrap">${fmtD(k.due)}</td><td class="num nowrap">${k.doneAt?fmtDT(k.doneAt):'—'}</td><td><span class="kst ${KST_CLS[k.st]}">${t('kst_'+k.st)}</span></td></tr>`).join('')}</tbody></table>${list.length>40?`<div class="muted" style="padding:6px">+${list.length-40}</div>`:''}</div>`:`<div class="muted" style="padding:8px 0">${t('kpi_none_here')}</div>`}</div></div>`; }
A.kpiOpen = el => { const f=perState('kpi'); f.open=f.open===el.dataset.id?null:el.dataset.id; rerender(); };
A.kpiTab = el => { perState('kpi').tab=el.dataset.k; rerender(); };
const _exSetKpi=A.exSet; A.exSet=el=>{ const e=DB.expenses.find(x=>x.id===el.dataset.id); _exSetKpi(el); if(e&&['approved','rejected'].includes(e.status)&&!e.approvedAt){ e.approvedAt=Date.now(); save(); } };

/* ===================================================================
   Báo cáo (viết lại cho SGE): sửa chữa, doanh thu, kho, nhân sự
   =================================================================== */
function tkDoneAt(x){ return histAt(x,['delivered'])||(x.status==='closed'?x.closedAt:null); }
viewReports=function(){ const u=me(); const f=perState('rp2'); const r=perRange(f); const inR=ts=>ts&&ts>=r.from&&ts<r.to;
  const all=(DB.tickets||[]).filter(x=>x.status!=='draft');
  const recv=all.filter(x=>inR(x.createdAt)); const deliv=all.filter(x=>inR(tkDoneAt(x)));
  const openNow=all.filter(x=>isOpen(x)&&!['delivered','invoiced','paid','return_pending'].includes(x.status));
  const days=deliv.map(x=>(tkDoneAt(x)-x.createdAt)/DAYMS); const avgD=days.length?days.reduce((a,b)=>a+b,0)/days.length:null;
  const slaOk=deliv.filter(x=>tkDoneAt(x)-x.createdAt<=SLA_DAYS*DAYMS).length;
  const agreed=all.filter(x=>inR(histAt(x,['customer_agreed','approved']))).length, declined=all.filter(x=>inR(histAt(x,['declined']))).length;
  const svc=(DB.svc||[]); const pays=svc.flatMap(c=>(c.payments||[]).map(p=>Object.assign({c},p))).filter(p=>inR(p.at)); const revenue=pays.reduce((s,p)=>s+(Number(p.amount)||0),0);
  const quoted=svc.filter(c=>inR(c.agreedAt||c.signedAt)).reduce((s,c)=>s+docTotal(c),0);
  const receivable=svc.filter(c=>c.status!=='cancelled'&&c.status!=='declined'&&(c.agreedAt||c.signedAt)).reduce((s,c)=>s+Math.max(0,docDue(c)),0);
  const B=perBuckets(r).filter(b=>b.s<=Date.now()); const stepL=Math.ceil(B.length/12); B.forEach((b,i)=>{ if(B.length>14&&i%stepL!==0&&i!==B.length-1) b.l=''; }); const inB=(ts,b)=>ts&&ts>=b.s&&ts<b.e;
  const recvS=B.map(b=>recv.filter(x=>inB(x.createdAt,b)).length), delivS=B.map(b=>deliv.filter(x=>inB(tkDoneAt(x),b)).length);
  const revS=B.map(b=>pays.filter(p=>inB(p.at,b)).reduce((s,p)=>s+(Number(p.amount)||0),0));
  /* đang xử lý theo bước */
  const stepCnt=STEPS.map((s,i)=>({label:t('step_'+s),value:openNow.filter(x=>stepOf(x)===i).length})).filter(x=>x.value>0);
  /* model, lỗi, linh kiện, khách hàng */
  const cnt=(arr,key)=>Object.entries(arr.reduce((a,x)=>{ const k=key(x); if(k) a[k]=(a[k]||0)+1; return a; },{})).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
  const topModels=cnt(recv.flatMap(x=>x.products||[]),p=>p.model&&p.model!=='?'?p.model:null).slice(0,8);
  const topFaults=cnt(recv,x=>x.faultCode?faultName(x.faultCode):null).slice(0,8);
  const pq={}; (DB.moves||[]).filter(m=>m.type==='out'&&inR(m.at)&&m.ref&&['svc','ticket'].includes(m.ref.kind)).forEach(m=>{ pq[m.pn]=(pq[m.pn]||0)+m.qty; });
  const topParts=Object.entries(pq).map(([pn,q])=>({label:partName(pn),value:q,sub:pn})).sort((a,b)=>b.value-a.value).slice(0,8);
  const custRev={}; pays.forEach(p=>{ const k=custName(p.c.customerId)||'—'; custRev[k]=(custRev[k]||0)+(Number(p.amount)||0); });
  const custCnt=cnt(recv,x=>x.company||custName(x.customerId));
  const topCust=custCnt.slice(0,8).map(c=>({label:c.label,value:c.value,sub:custRev[c.label]?money(custRev[c.label]):''}));
  const byType=SERVICE_TYPES.map(st=>({label:stName(st.id),value:recv.filter(x=>x.type===st.id).length,color:TYPE_COLORS[st.id]})).filter(x=>x.value);
  /* kỹ thuật viên */
  const techs=(DB.users||[]).filter(x=>x.role==='engineer'&&x.active!==false);
  const techRows=techs.map(te=>{ const mine=all.filter(x=>x.assigneeId===te.id); const asg=mine.filter(x=>inR(histAt(x,['assigned','claimed'])||x.createdAt)); const fin=mine.filter(x=>inR(histAt(x,['to_testing','test_passed']))); const doing=mine.filter(x=>['diagnosing','pending','approved','in_service','on_hold','testing','returned'].includes(x.status)&&!isReady(x));
    const dd=fin.map(x=>(histAt(x,['to_testing','test_passed'])-x.createdAt)/DAYMS); const k=kpiOf(te,r); const mx=1; return { te, asg:asg.length, fin:fin.length, doing:doing.length, late:doing.filter(x=>slaBreached(x)).length, avg:dd.length?dd.reduce((a,b)=>a+b,0)/dd.length:null, sla:fin.length?fin.filter(x=>histAt(x,['to_testing','test_passed'])-x.createdAt<=SLA_DAYS*DAYMS).length/fin.length:null }; }).sort((a,b)=>b.fin-a.fin||b.asg-a.asg);
  S._rp2={techRows,r};
  const stat=(l,v,d,col)=>`<div class="card stat"><div class="l">${l}</div><div class="v" ${col?`style="color:${col}"`:''}>${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
  const pct=v=>v==null?'—':Math.round(v*100)+'%'; const empty=`<div class="muted">${t('no_data')}</div>`;
  return `<div class="page-head"><div><h1>${t('nav_reports')}</h1><p class="muted" style="margin:4px 0 0">${t('rp2_sub')}</p></div>${can('export')?`<button class="btn" data-a="rp2Export">${ic('download',15)} ${t('export')}</button>`:''}</div>
  ${perBar('rp2')}
  <div class="stat-row">
    ${stat(t('rp2_received'),fmtNum(recv.length),t('rp2_open_now',{n:fmtNum(openNow.length)}))}
    ${stat(t('rp2_delivered'),fmtNum(deliv.length),recv.length?t('rp2_vs_recv',{p:Math.round(deliv.length/recv.length*100)}):'')}
    ${stat(t('rp2_avg_days'),avgD==null?'—':fmtNum(avgD,1)+' '+t('days'),t('rp2_sla',{p:deliv.length?Math.round(slaOk/deliv.length*100):'—',d:SLA_DAYS}))}
    ${stat(t('rp2_accept'),(agreed+declined)?Math.round(agreed/(agreed+declined)*100)+'%':'—',t('rp2_accept_sub',{a:agreed,d:declined}))}
    ${stat(t('rp2_revenue'),moneyS(revenue),t('rp2_quoted',{v:moneyS(quoted)}),'var(--ok)')}
    ${stat(t('rp2_receivable'),moneyS(receivable),t('rp2_receivable_sub'),receivable?'var(--bad)':'')}
  </div>
  <div class="report-grid">
    <div class="card"><div class="card-h"><h3>${t('rp2_flow')}</h3><span class="hint">${t('rp2_bucket_'+(r.days<=31?'d':r.days<=100?'w':'m'))}</span></div><div class="card-b">${Charts.line({labels:B.map(b=>b.l),series:[{name:t('rp2_received'),color:'#E8871E',values:recvS},{name:t('rp2_delivered'),color:'var(--blue)',values:delivS}],area:true,h:260})}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp2_rev_chart')}</h3><span class="hint">${moneyS(revenue)}</span></div><div class="card-b">${Charts.bars({labels:B.map(b=>b.l),values:revS,color:'var(--ok)',h:260,fmtVal:v=>v?moneyS(v):''})}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp2_pipeline')}</h3><span class="hint">${t('rp2_pipeline_hint',{n:openNow.length})}</span></div><div class="card-b">${stepCnt.length?Charts.hbars({items:stepCnt,color:'var(--blue)'}):empty}</div></div>
    <div class="card"><div class="card-h"><h3>${t('by_service_type')}</h3></div><div class="card-b">${byType.length?Charts.donut({items:byType,sub:t('rp2_jobs')}):empty}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp2_top_models')}</h3></div><div class="card-b">${topModels.length?Charts.hbars({items:topModels,color:'var(--accent)'}):empty}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp2_top_faults')}</h3></div><div class="card-b">${topFaults.length?Charts.hbars({items:topFaults,color:'var(--violet)'}):empty}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp2_top_parts')}</h3><span class="hint">${t('rp2_top_parts_hint')}</span></div><div class="card-b">${topParts.length?Charts.hbars({items:topParts,color:'var(--teal)'}):empty}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp2_top_cust')}</h3></div><div class="card-b">${topCust.length?Charts.hbars({items:topCust,color:'var(--blue)'}):empty}</div></div>
    <div class="card full"><div class="card-h"><h3>${t('rp2_tech')}</h3><button class="btn sm" data-a="nav" data-k="kpi">${t('rp2_see_kpi')} →</button></div><div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('technician')}</th><th class="r">${t('rp2_t_asg')}</th><th class="r">${t('rp2_t_fin')}</th><th class="r">${t('rp2_t_doing')}</th><th class="r">${t('rp2_t_late')}</th><th class="r">${t('rp2_avg_days')}</th><th class="r">${t('rp2_t_sla')}</th></tr></thead><tbody>
      ${techRows.map(x=>`<tr><td data-l="${t('technician')}"><span class="row" style="gap:8px;flex-wrap:nowrap"><span class="avatar" style="width:26px;height:26px;font-size:10px">${esc(initials(x.te.name))}</span>${esc(x.te.name)}</span></td><td data-l="${t('rp2_t_asg')}" class="r num">${fmtNum(x.asg)}</td><td data-l="${t('rp2_t_fin')}" class="r num"><b>${fmtNum(x.fin)}</b></td><td data-l="${t('rp2_t_doing')}" class="r num">${fmtNum(x.doing)}</td><td data-l="${t('rp2_t_late')}" class="r num" style="${x.late?'color:var(--bad);font-weight:700':''}">${fmtNum(x.late)}</td><td data-l="${t('rp2_avg_days')}" class="r num">${x.avg==null?'—':fmtNum(x.avg,1)}</td><td data-l="${t('rp2_t_sla')}" class="r num">${pct(x.sla)}</td></tr>`).join('')}
    </tbody></table></div></div>
  </div>`; };
A.rp2Export = () => { const z=S._rp2; if(!z) return; const rows=[[t('technician'),t('rp2_t_asg'),t('rp2_t_fin'),t('rp2_t_doing'),t('rp2_t_late'),t('rp2_avg_days'),t('rp2_t_sla')]]; z.techRows.forEach(x=>rows.push([x.te.name,x.asg,x.fin,x.doing,x.late,x.avg==null?'':x.avg.toFixed(1),x.sla==null?'':Math.round(x.sla*100)+'%'])); download(`bao_cao_ky_thuat_${toISODate(z.r.from)}_${toISODate(z.r.to-1)}.csv`,csv(rows)); };
Object.assign(DICT.vi,{ per_week:'Tuần', per_month:'Tháng', per_quarter:'Quý', per_year:'Năm', per_custom:'Tùy chọn', per_prev:'Kỳ trước', per_next:'Kỳ sau', per_now:'Hiện tại',
  per_week_l:'Tuần {w} · {a} – {b}', per_month_l:'Tháng {m}/{y}', per_quarter_l:'Quý {q}/{y}', per_year_l:'Năm {y}',
  kpi_breakdown:'Tình trạng việc', kst_ontime:'Xong đúng hạn', kst_late:'Xong trễ', kst_doing:'Đang làm', kst_overdue:'Quá hạn chưa xong',
  kpi_task_list:'Danh sách việc', ktab_all:'Tất cả', ktab_done:'Đã xong', ktab_open:'Đang làm', ktab_late:'Quá hạn', kpi_ref:'Mã / nội dung', kpi_given:'Giao lúc', kpi_done_at:'Hoàn thành lúc', kpi_none_here:'Không có việc nào ở mục này.',
  rp2_sub:'Sửa chữa, doanh thu, kho và hiệu suất kỹ thuật theo kỳ đã chọn', rp2_received:'Phiếu tiếp nhận', rp2_open_now:'{n} phiếu đang xử lý', rp2_delivered:'Đã giao trả', rp2_vs_recv:'{p}% so với số tiếp nhận',
  rp2_avg_days:'Thời gian xử lý TB', rp2_sla:'{p}% đúng SLA {d} ngày', rp2_accept:'Tỉ lệ khách đồng ý sửa', rp2_accept_sub:'{a} đồng ý · {d} từ chối', rp2_revenue:'Doanh thu đã thu', rp2_quoted:'Giá trị báo giá được đồng ý: {v}',
  rp2_receivable:'Còn phải thu', rp2_receivable_sub:'Hợp đồng đã đồng ý / đã ký chưa thu đủ', rp2_flow:'Tiếp nhận & giao trả', rp2_bucket_d:'theo ngày', rp2_bucket_w:'theo tuần', rp2_bucket_m:'theo tháng',
  rp2_rev_chart:'Doanh thu đã thu', rp2_pipeline:'Phiếu đang xử lý theo bước', rp2_pipeline_hint:'{n} phiếu hiện tại', rp2_jobs:'phiếu', rp2_top_models:'Model sửa nhiều nhất', rp2_top_faults:'Lỗi gặp nhiều nhất',
  rp2_top_parts:'Linh kiện xuất cho sửa chữa', rp2_top_parts_hint:'theo phiếu xuất kho', rp2_top_cust:'Khách hàng nhiều phiếu nhất', rp2_tech:'Hiệu suất kỹ thuật viên', rp2_see_kpi:'Xem KPI chi tiết',
  rp2_t_asg:'Được giao', rp2_t_fin:'Sửa xong', rp2_t_doing:'Đang làm', rp2_t_late:'Quá SLA', rp2_t_sla:'Đúng SLA' });
Object.assign(DICT.en,{ per_week:'Week', per_month:'Month', per_quarter:'Quarter', per_year:'Year', per_custom:'Custom', per_prev:'Previous', per_next:'Next', per_now:'Current',
  per_week_l:'Week {w} · {a} – {b}', per_month_l:'{m}/{y}', per_quarter_l:'Q{q} {y}', per_year_l:'Year {y}',
  kpi_breakdown:'Task status', kst_ontime:'Done on time', kst_late:'Done late', kst_doing:'In progress', kst_overdue:'Overdue',
  kpi_task_list:'Tasks', ktab_all:'All', ktab_done:'Done', ktab_open:'In progress', ktab_late:'Overdue', kpi_ref:'Ref / subject', kpi_given:'Assigned', kpi_done_at:'Completed', kpi_none_here:'Nothing here.',
  rp2_sub:'Repairs, revenue, stock and technician performance for the selected period', rp2_received:'Jobs received', rp2_open_now:'{n} jobs open', rp2_delivered:'Returned', rp2_vs_recv:'{p}% of received',
  rp2_avg_days:'Avg turnaround', rp2_sla:'{p}% within {d}-day SLA', rp2_accept:'Quote acceptance', rp2_accept_sub:'{a} agreed · {d} declined', rp2_revenue:'Cash collected', rp2_quoted:'Agreed quotes: {v}',
  rp2_receivable:'Receivable', rp2_receivable_sub:'Agreed / signed contracts not fully paid', rp2_flow:'Received vs returned', rp2_bucket_d:'by day', rp2_bucket_w:'by week', rp2_bucket_m:'by month',
  rp2_rev_chart:'Cash collected', rp2_pipeline:'Open jobs by step', rp2_pipeline_hint:'{n} jobs now', rp2_jobs:'jobs', rp2_top_models:'Most repaired models', rp2_top_faults:'Most common faults',
  rp2_top_parts:'Parts issued for repairs', rp2_top_parts_hint:'from issue slips', rp2_top_cust:'Top customers', rp2_tech:'Technician performance', rp2_see_kpi:'See detailed KPI',
  rp2_t_asg:'Assigned', rp2_t_fin:'Repaired', rp2_t_doing:'In progress', rp2_t_late:'Past SLA', rp2_t_sla:'Within SLA' });

/* đăng ký trang KPI */
const _navKpi=navItems; navItems=function(u=me()){ const r=_navKpi(u); if(!u||isExternal(u)||u.role==='dev'&&false) return r; const item={k:'kpi',l:t('nav_kpi')};
  if(S._fullNav){ if(!r.some(n=>n.k==='kpi')) r.push(item); return r; } const more=r.find(n=>n.k==='more'); if(more){ if(!more.more.some(n=>n.k==='kpi')) more.more.unshift(item); } else r.push(item); return r; };
const _tabAllowedKpi=tabAllowed; tabAllowed=function(k,u=me()){ if(k==='kpi') return !!u&&!isExternal(u); if(k==='today') return !!u&&!isExternal(u); return _tabAllowedKpi(k,u); };
const _tabTitleKpi=tabTitle; tabTitle=function(k){ if(k==='kpi') return t('nav_kpi'); if(k==='today') return t('today_title'); return _tabTitleKpi(k); };
const _erpViewKpi=erpView; erpView=function(k){ if(k==='kpi') return viewKpi(); if(k==='today') return viewToday(); return _erpViewKpi(k); };

/* ===================================================================
   Việc cần làm mỗi ngày theo nhiệm vụ từng người + thông báo đầu ngày
   =================================================================== */
function todayTasks(u){ const L=[]; const add=(key,list,go)=>{ if(list.length) L.push({key,n:list.length,items:list,go}); };
  const tk=DB.tickets||[]; const mine=tk.filter(x=>x.assigneeId===u.id);
  if(u.role==='engineer'){
    add('td_diag',mine.filter(x=>['diagnosing','returned'].includes(x.status)));
    add('td_repair',mine.filter(x=>['in_service','approved'].includes(x.status)));
    add('td_test',mine.filter(x=>x.status==='testing'&&!isReady(x)));
    add('td_handover',mine.filter(x=>isReady(x)&&payDue(x)<=0));
    add('td_wait_parts',mine.filter(x=>x.wh&&x.wh.status!=='issued'&&['in_service','on_hold'].includes(x.status)));
    add('td_overdue_mine',mine.filter(x=>isOpen(x)&&slaBreached(x)));
  }
  if(['manager','dev'].includes(u.role)){
    add('td_unassigned',tk.filter(x=>x.status==='unassigned'));
    add('td_parts_approve',tk.filter(x=>x.status==='pending'&&!partsApproved(x)));
    add('td_wh_approve',tk.filter(x=>x.wh&&x.wh.status==='pending'));
    add('td_exp_approve',(DB.expenses||[]).filter(e=>e.status==='pending').map(e=>({id:null,no:e.no,exp:1,title:(e.desc&&typeof e.desc==='object'?(e.desc[S.lang]||e.desc.vi||e.desc.en):e.desc)||'',amt:e.amount})));
    add('td_overdue_all',tk.filter(x=>isOpen(x)&&slaBreached(x)));
  }
  if(['manager','dev','accountant','warehouse'].includes(u.role)) add('td_quote',tk.filter(x=>x.status==='pending'&&partsApproved(x)&&(()=>{ const c=x.svcId&&svcById(x.svcId); return !c||c.status==='quote'; })()));
  if(u.role==='warehouse'){
    add('td_wh_receive',tk.filter(x=>x.wh&&x.wh.status==='new'));
    add('td_wh_issue',tk.filter(x=>x.wh&&x.wh.status==='approved'));
    add('td_low_stock',(DB.stock||[]).filter(s=>s.qty<s.min).map(s=>({id:null,no:s.pn,stock:1})));
  }
  if(u.role==='accountant'){
    add('td_collect',tk.filter(x=>isReady(x)&&payDue(x)>0));
    add('td_sign',tk.filter(x=>{ const c=x.svcId&&svcById(x.svcId); return c&&c.agreedAt&&['quote','sent'].includes(c.status); }));
    add('td_invoice',tk.filter(x=>x.status==='delivered'&&(()=>{ const c=x.svcId&&svcById(x.svcId); return c&&!c.invoice&&docTotal(c)>0; })()));
  }
  return L; }
function viewToday(){ const u=me(); const L=todayTasks(u); const total=L.reduce((s,l)=>s+l.n,0);
  return `<div class="page-h"><div><h1>${t('today_title')}</h1><p class="muted" style="margin:4px 0 0">${t('today_sub',{d:fmtD(Date.now()),n:total})}</p></div></div>
  ${L.length?`<div class="today-grid">${L.map(l=>`<section class="card today-card"><div class="card-h"><h3>${t(l.key)}</h3><span class="tcount">${l.n}</span></div><div class="card-b"><div class="mini-list">${l.items.slice(0,8).map(x=>x.exp?`<div class="mini-item" data-a="todayExp" data-no="${esc(x.no)}" style="cursor:pointer"><span class="t"><div class="mono">${esc(x.no)}</div></span></div>`:x.stock?`<div class="mini-item" style="cursor:default"><span class="t"><div class="mono">${esc(x.no)}</div><small>${esc((stockBy(x.no)||{}).name||'')} · ${t('on_hand')}: ${fmtNum((stockBy(x.no)||{}).qty||0)}</small></span></div>`:`<div class="mini-item" data-a="openTicket" data-id="${x.id}" style="cursor:pointer"><span class="t"><div><span class="mono">${esc(x.no)}</span> ${tkPill(x)}</div><small>${esc(x.company||'')}${slaBreached(x)&&isOpen(x)?` · <b style="color:var(--bad)">${t('kpi_late')}</b>`:''}</small></span></div>`).join('')}${l.n>8?`<div class="muted" style="padding:6px 2px">+${l.n-8}</div>`:''}</div></div></section>`).join('')}</div>`
  :`<div class="card empty">${ic('check',28)}<p>${t('today_empty')}</p></div>`}`; }
A.todayExp = el => { S.ui.exp={tab:'list',q:el.dataset.no,cat:'',st:'',page:1,size:10}; S.ui.fin=Object.assign({q:'',dir:'',page:1,size:10},S.ui.fin||{},{tab:'exp'}); openTab(tabAllowed('expenses')?'expenses':'finance'); };
function dayKey(ts){ const d=new Date(ts||Date.now()); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function dailyDigest(u){ if(!u||isExternal(u)) return; DB.digest=DB.digest||{}; const k=dayKey(); if(DB.digest[u.id]===k) return; DB.digest[u.id]=k;
  const L=todayTasks(u); const total=L.reduce((s,l)=>s+l.n,0);
  const s=L.length?L.slice(0,4).map(l=>`${l.n} ${t(l.key).toLowerCase()}`).join(', ')+(L.length>4?'…':''):t('today_empty');
  notify({ toUser:u.id, key:'n_daily', vars:{n:total,s}, daily:1 }); save(); }
const _renderDaily=render; render=function(){ try{ dailyDigest(me()); }catch(e){} return _renderDaily.apply(this,arguments); };
const _notifDaily=A.notif; A.notif=el=>{ const n=DB.notifs.find(q=>q.id===el.dataset.id); if(n&&n.key==='n_daily'){ n.read=true; S.ui.pop=null; openTab('todo'); save(); rerender(); return; } return _notifDaily(el); };
Object.assign(DICT.vi,{ nav_kpi:'KPI nhân sự', kpi_title:'KPI nhân sự', kpi_sub:'Tính theo việc được giao và việc đã hoàn thành của từng người', kpi_sub_me:'KPI của bạn theo việc được giao và việc đã hoàn thành',
  kpi_p_month:'Tháng này', kpi_p_last:'Tháng trước', kpi_p_d30:'30 ngày', kpi_p_all:'Tất cả', kpi_all_roles:'Tất cả vai trò',
  kpi_avg:'Điểm KPI trung bình', kpi_my_score:'Điểm KPI của bạn', kpi_done_assigned:'Hoàn thành / được giao', kpi_ontime:'Đúng hạn', kpi_overdue:'Quá hạn',
  kpi_staff:'Nhân sự', kpi_assigned:'Được giao', kpi_done:'Hoàn thành', kpi_rate:'Tỉ lệ HT', kpi_open:'Đang mở', kpi_actions:'Thao tác', kpi_score:'Điểm KPI',
  kpi_formula:'Cách tính điểm (100): 35 × tỉ lệ hoàn thành + 35 × tỉ lệ đúng hạn + 15 × khối lượng thao tác (so với người cao nhất cùng vai trò) + 15 × (1 − tỉ lệ quá hạn), trừ 5 điểm cho mỗi máy phải sửa lại trong thời gian bảo hành (tối đa trừ 15). Xếp loại: A ≥ 85 · B ≥ 70 · C ≥ 50 · D < 50.',
  kpi_by_kind:'Theo loại việc', kpi_kind:'Loại việc', kpi_open_list:'Việc đang mở', kpi_due:'Hạn', kpi_late:'Trễ hạn', kpi_none_open:'Không có việc đang mở.', kpi_no_task:'Chưa có việc trong kỳ này.',
  kk_repair:'Sửa chữa được giao', kk_approve:'Duyệt linh kiện', kk_wh_approve:'Duyệt xuất kho', kk_wh_issue:'Xuất kho', kk_payment:'Xác nhận thanh toán', kk_invoice:'Xuất hóa đơn', kk_expense:'Duyệt phiếu chi',
  nav_today:'Việc hôm nay', today_title:'Việc cần làm hôm nay', today_sub:'{d} · {n} việc theo nhiệm vụ của bạn', today_empty:'Không có việc tồn, mọi thứ đã xong!',
  n_daily:'Việc hôm nay ({n}): {s}',
  td_diag:'Phiếu cần chẩn đoán', td_repair:'Phiếu đang sửa', td_test:'Phiếu cần kiểm tra', td_handover:'Máy sẵn sàng giao', td_wait_parts:'Phiếu chờ kho cấp linh kiện', td_overdue_mine:'Phiếu của bạn quá hạn SLA',
  td_unassigned:'Phiếu chưa phân công', td_parts_approve:'Linh kiện chờ duyệt', td_wh_approve:'Xuất kho chờ duyệt', td_exp_approve:'Phiếu chi chờ duyệt', td_overdue_all:'Phiếu quá hạn SLA',
  td_quote:'Phiếu cần làm báo giá', td_wh_receive:'Yêu cầu xuất kho cần tiếp nhận', td_wh_issue:'Yêu cầu đã duyệt cần xuất', td_low_stock:'Mặt hàng dưới tồn tối thiểu',
  td_collect:'Máy chờ thu tiền để giao', td_sign:'Hợp đồng chờ ghi nhận ký', td_invoice:'Phiếu đã giao cần xuất hóa đơn' });
Object.assign(DICT.en,{ nav_kpi:'Staff KPI', kpi_title:'Staff KPI', kpi_sub:'Based on each person’s assigned and completed work', kpi_sub_me:'Your KPI based on assigned and completed work',
  kpi_p_month:'This month', kpi_p_last:'Last month', kpi_p_d30:'30 days', kpi_p_all:'All', kpi_all_roles:'All roles',
  kpi_avg:'Average KPI score', kpi_my_score:'Your KPI score', kpi_done_assigned:'Done / assigned', kpi_ontime:'On time', kpi_overdue:'Overdue',
  kpi_staff:'Staff', kpi_assigned:'Assigned', kpi_done:'Done', kpi_rate:'Done %', kpi_open:'Open', kpi_actions:'Actions', kpi_score:'KPI score',
  kpi_formula:'Score (100): 35 × completion rate + 35 × on-time rate + 15 × activity volume (vs top person in the same role) + 15 × (1 − overdue rate). Grades: A ≥ 85 · B ≥ 70 · C ≥ 50 · D < 50.',
  kpi_by_kind:'By task type', kpi_kind:'Task type', kpi_open_list:'Open tasks', kpi_due:'Due', kpi_late:'Late', kpi_none_open:'No open tasks.', kpi_no_task:'No tasks in this period.',
  kk_repair:'Assigned repairs', kk_approve:'Parts approval', kk_wh_approve:'Issue approval', kk_wh_issue:'Parts issue', kk_payment:'Payment confirmation', kk_invoice:'Invoicing', kk_expense:'Expense approval',
  nav_today:'Today', today_title:'Today’s to-do', today_sub:'{d} · {n} tasks for your role', today_empty:'Nothing pending, all done!',
  n_daily:'Today ({n}): {s}',
  td_diag:'Jobs to diagnose', td_repair:'Jobs in repair', td_test:'Jobs to test', td_handover:'Units ready to hand over', td_wait_parts:'Jobs waiting for parts', td_overdue_mine:'Your jobs past SLA',
  td_unassigned:'Unassigned jobs', td_parts_approve:'Parts awaiting approval', td_wh_approve:'Issues awaiting approval', td_exp_approve:'Expenses awaiting approval', td_overdue_all:'Jobs past SLA',
  td_quote:'Jobs needing a quote', td_wh_receive:'Parts requests to receive', td_wh_issue:'Approved requests to issue', td_low_stock:'Items below minimum',
  td_collect:'Units awaiting payment', td_sign:'Contracts to record as signed', td_invoice:'Delivered jobs to invoice' });
/* giao hàng đơn bán (xuất kho) cũng bắt buộc chứng từ */
const _soGoPf=A.soGo; A.soGo=el=>{ const d=soById(el.dataset.id); if(d&&el.dataset.s==='delivered'&&S._proofOK!=='issue'){ const short=d.items.filter(i=>{ const st=stockBy(i.pn); return !st||st.qty<i.qty; }); if(short.length){ toast(t('insufficient_stock',{p:short.map(i=>i.pn).join(', ')}),'bad'); return; } return proofAsk('issue',null,null,{a:'soGo',ds:Object.assign({},el.dataset)}); } return _soGoPf(el); };
const _pfOkSo=A.pfOk; A.pfOk=()=>{ const m=S.ui.modal; const so=m&&m.type==='proof'&&m.run&&m.run.a==='soGo'?soById(m.run.ds.id):null; const files=m&&m.f&&m.f.files.slice(); const had=so&&so.deliveredAt; _pfOkSo();
  if(so&&files&&files.length&&so.deliveredAt&&!had){ (so.proofs=so.proofs||[]).push({stage:'issue',files,note:'',at:Date.now(),by:S.userId}); DB.moves.filter(q=>q.ref&&q.ref.kind==='so'&&q.ref.id===so.id&&!q.images).forEach(q=>q.images=files); save(); rerender(); } };

/* ===================================================================
   Loại dịch vụ chỉ còn 2: Bảo hành (RW) và Sửa chữa (PR — có tính phí)
   Dữ liệu cũ OW (ngoài bảo hành) / OT (khác) gộp vào Sửa chữa
   =================================================================== */
SERVICE_TYPES.length=0; SERVICE_TYPES.push({id:'RW',key:'st_RW'},{id:'PR',key:'st_PR'});
function normTypes(){ (DB.tickets||[]).forEach(x=>{ if(x.type==='OW'||x.type==='OT') x.type='PR'; if(!x.wh&&['in_service','on_hold'].includes(x.status)&&typeof whEnsure==='function') whEnsure(x,true); }); if(S&&S.ui&&S.ui.tl&&['OW','OT'].includes(S.ui.tl.type)) S.ui.tl.type='PR'; }
const _renderType=render; render=function(){ try{ normTypes(); }catch(e){} return _renderType.apply(this,arguments); };
Object.assign(DICT.vi,{ st_RW:'Bảo hành', st_PR:'Sửa chữa', st_OW:'Sửa chữa', st_OT:'Sửa chữa', by_service_type:'Theo loại dịch vụ' });
Object.assign(DICT.en,{ st_RW:'Warranty', st_PR:'Repair', st_OW:'Repair', st_OT:'Repair', by_service_type:'By service type' });


/* ===================================================================
   MẪU GIẤY TỜ SGE: Báo giá · Hợp đồng · Biên bản nghiệm thu · Đề nghị thanh toán · Phiếu bảo hành
   (theo mẫu báo giá Excel và hợp đồng PDF của SGE)
   =================================================================== */
const SGE_LOGO='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIbHRsYHRYYGRj/2wBDAQQEBAYFBgsGBgsYEA0QGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCADeAQQDASIAAhEBAxEB/8QAHQABAAICAwEBAAAAAAAAAAAAAAcIBQYDBAkCAf/EAFgQAAEDAwIDBAUHBgUQCQUAAAECAwQABREGIQcSMRNBUWEIFCJxgTJCUmKRobEVIzNywdEWF0Oy4RgkJTQ1U1WCg5KUoqOz0vAmN1ZjdYSTwtMnREVl4v/EABsBAQADAQEBAQAAAAAAAAAAAAAEBQYCAwEH/8QANxEAAQMCAwUECAYDAQAAAAAAAQACAwQRBRIhIjFBUbETFHGhBhUyUmGB0eEjJEKRwfAzNHJi/9oADAMBAAIRAxEAPwC/1KUoiUpSiJSlKIlKx14vtpsMIyrpMbYR81JOVLPglPU1F1+4nXC5lUazoMGMcguZy6se8fJ+H21JgpZJvZGnNRKmuipxtnXkpKu2pbVaCW35AW/3Mt7q+Ph8a0q7aunXB9plkhppbqRyJPdzDv760SM8ouklRUpR3JOSTWTilS7gxzb4dT+Iq0bQMibc6lUUmKyTuyt0C7zOsrjbOMd/swfUGzILjKVHKT7IJTj7/tqRLfrC3SVJamKEZ095+QT7+6oA4iuOw+Md2kxlFDrchC0kePIk1ttontXe0tTgPlDCk/RUOoruagY+Jkg4gLmHEpI5pI73sT1U6AhSQpJBB6EV+1Fds1FcLSsJZcLrPe04cj4eFbtadV2254aWr1Z/6Dh2PuNVEtK+PXeFfQV0cul7FZ6lKVGUxKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpStbvWtbRanFRmnBLlDYttHIR+se73da7YxzzlaLriSVkYzPNgtkyB1NRlxE4my9MSvyXAtzrLyxtNlNnsj5t9yv2eFYwasuF24mWaG5KIbVJSpTKNkpGDgYrXNL6wenQnbBeGWLnEQSPVZSeYFGcZSeoIzj7KsoKFzX3eL2F7KmqcUY9mWN2W5IB8FpcvUCrrcFzblcVSH1fKcdUSf6PcK5mbzbW8c01ge9YFbReuF9qugMrRk9LbygSbVMXhWfBtZ6+4/bUW3K0TrdcXINxivRZLZwpl5HKofvHnWip5IZRlZpbgstUwzxHM/W/HfdSTZpEeY0qWy628hKuQFCgcGszHf5J8cj++p/nCop0/dDY7l7asRn8Jc8Ae5Xwreo8vnuUdPOd3kd/wBYV5VEB1PBelPINOa+OI7BXxTvCsfyqf5ia6unLsmyuOMyHUtxHd1KWcBCh0P/AD5VmeILRHEy7KHetH8xNR/eXQ+BDQrISeZfmfD4V1TAPp2NPIJVAsqXuHM9Vv69aabbVg3Nsnv5UKV+ArpyNfWBvZCpLnmhrGftNR3AtU+5XFu326K7KkuHCGmkcyj/AEedTdorgY0zyXDWTiXldU29pXsj9dQ6+4beZqPUvp6cbZueSk0kVTVm0YsOfBdjQevdSX64JiWOyyZkBB5XH5WG2mh+v4+Qz+2pk7t64YkSLAhtxIUdqOw2MIaaSEpSPICuaszPIJHlzW2C2FNC6Jga51ylKUrxUhKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESsHqPV1g0rED14noaWoZbYT7Tjn6qevx6VEfF/jpN0heXNMWq2SbfII/upNYIbWPFjblX7yfhUAq1jEnXNc6530SJLpyt59wqUo+ZNXNDg8lQ3tHGzVSYhjLKY9mwXd5BTxf+KV41E4uPAzboB2CEK/OrH1lDp7h99YZue3DgLfcGUoGcZ6+AqPIWqtPpQCu9wR73RXNcdQsXBlpuDJbej9VONqyFH3+VX0NA2PYY2wWXqK98t3vdcrcdDT3ZXFqzvPHKnJYJ9+DWrM3FyBdjLYVhbayfeO8VkeHEkq4s2BJVnMtP4GtWdkJMx0D6Z/GuxEO8ub/5HUrwklvStcPePQKYYM5i6W1uYwTyrHTO6SOoPxrJyrxFmwBbtTW5F2hjZKnDh9nzQ51+BqJ9P6qY0+pxuYlxcR3fDe6kq8QCay7uvbNKPsNTRnuU2n/iqLLR3duUmCtLW3ushduHSJ7bk3RU78qsAcy4LuESmR+r0WPMf01hLO+/GnxoclC23WHkJKFghQ9obEHwrla1VEZkplRFymXUbpWjCVJPvBrftLThxIujMa76efmLYUD+Wo4DLjODkBxXyVjbp164FcSSS08Z7Tab5/de8LIamQCPZdy3j7LrcSngzri6OoSe0UtCEjxPImuno/g/er84mbeOe2QFHJLifzzn6qT095+w1OQ0lZDqp3UMiKJE5ZBQp72ktYAHsjoDt161nKpjij2xCKPSw3rQtwhjpTLLrruWG09pWxaWhGNZoDbHN+kdO7jn6yuprM0pVY5xcbkq3axrBlaLBKUpXxdJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiKm+idaKu+iRprV0FrUVnSkIchyzlbY7ltOfKQfceo7qwupeBhVAev3Daa9e4Ccrdtb2BOijqdujo807+RrVNO3I2u6x314LBAQ6nxSf3dammL20V5qbbpDjLicLbeZVg/A1uZIHQOEkBtfhwK/OoasTAxzi4HHiFV8qCnFNqQpCkkgoUCCkjqCD0NbDpi4CK8qE6rCHPaR5K/pqf9Qae0hxCBOqo6LPfiMIv8JvAcPd6w2NlD6wwfMVBuueHeqdATWjdmEOwHlf1pdYZ7SO/wCGFDofI4NTKfEGSns5Nl3LgfArzqKEtYXxnM3zHiFIvC+Tz8aNOpGceuJH3GtUXJCZLmVb8x/Gs1wak+t8WdMvEDn9cSFjwODWlTpJS45yK3UsjPhvXywFY7/kdSvCNhdSNB35j0C78ib273XKEHA867MBL8uc1EiMOyJDp5W2WklSlnwAG5rY+HXCPVeviiZHaFvtBOFXCSk8qsdezT1Wfu86tbojhrpjQcEItUQOzFDDs98BTqzjfB+aPIffVdW4vFT3azad0VtR4JJUgF2y3+7lF2heAz7yWrlrVZZQfaFuZX7R8nFjp7h9tTvAt8G1wG4NuiMxYzYwhppISkD3CuzSspUVMk7s0hWvpaKKlbljH1SlKVHUtKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlEXm8wseroyOiRUqcO9RRXrM5arlKZaci4LK31hAU2e4EnqD9xFRK2T2KTv0xisHd5vrMoMpOW2jjb6XfX6c6MSRBpX5RAxwmJCs3LuFo5SBc4B/8AMIP7a6kPWbdpQ/AVMtk+1yRyybZLcQ4w6P1Sdj5iq1x3PbCc4qWNAcGrtqqCnUN/eVYtPJ3Et5B7aT5MoPyv1jt76rKiGCNn4508/krOn7cvvCNf7vUoaB0PpC58WbXqXh5cUwhEfTIuFgkOdp2SNxzsODqnJHsnx+FbRw89HC0WeQLzrhxq7z+bnbhIz6szvkc3e4r37eR61j7JqOzaR1hpbQ+jLam1xJ89HbrUQt+QgZyp1fUkkYx5GrD1ma2eeN5bcgEcd9lq8Pgp5mZrAkH5XXy22200lppCUIQAlKUjASB0AFfVKVVK5SlKURKUpREpShIAyTgURKVqN/1/abRztR1plOoBK1hQDbeOpUe/HgK1fhBru5a71DqmZLezEjqjNxGhsEpIcyceJOPsHhUjusvZmUjZCiGuh7YQA3cVK1KVGnF7jJZOFNla7Zg3C8y0kxICFcuQNi44r5qAdvEnYd5HlHG6RwYwXJUiSRsbS5xsApLpXntqP0huK+o5SwdTPWxlZITHtiQwkZJwAr5ZI6dd8VgV8QeLETLzmrNXNAb9ouW/y495OKtPU0oG04A8rqqdjUV7NaSF6T0qhGmPSc4p6eloXOubGoYfzmbg2OYjp7LiACPHfO9Xd0hf16q0HadSOW123G4xUShFdUFqbChkbjqCCCDtsRsOlQ6qikprZ+Km0tbHU3ybws1Svh11piOt99xDTTaSta1nCUgDJJJ6CqucTPSyRGlv2bhpFakKbVyKvEtHM2SDv2Te3MO7mVse4dDXnT00lQ7LGLr0nqY4G5pDZWmpXnBdeNHFW8Se0l66u6SclLcV71ZI8gG+XPxzXWgcX+KFtk9pE1/fA59F6WXh/mucw+6rL1JLb2hdVpxqL3TZelFKqJw49LW5MTmbZxJhtyIiyEflSE3yuNd2XGxsoeJTv12PSrZwJ8K6WyPcbdKalRJDYdZfaUFJcSRkEEdRVdU0stO7LILKxp6qOobmjK7FKqz6TXEnXejOJ1qt+ltSyrZEetaXnGmUoIUvtXBze0knoAPhUHq488XQrC+IVwQfNLQ/9lS4MKlmjEgIsVFnxSOF5jINwvRalec54+cWwcDiJPPwZ/4aDj5xZByeIdwPwa/4a9PU0vvD914euovdK9GKVXj0e9fas1bwzuFx1Bf37jJbujjCHXAjIQGmlBOwHeon40qtkiMbiw8FZxTCRgeBvVTZM8QbWX1KPMoYQPM/85rE2K1XbUV6atNit8m43B/9HHjoK1r8T5DxJ2HfW5aY4Y3zXsNF+lymbBpCGAH75OBDavEMp6ur7gBtnv7qkmBqyw6WszmnOGFrctcNwckq8ySDPn+alD5Cfqp+6t4+tJHZwC7hx4Dx+ixEVI2PbmNgf3K5tLcNdKcO3GrhrBUbUuqUe0m0sqC4UFX/AHyv5RY+j0+41ucvUs68SFT7vMCuRPTHKhpI7kjoABUew3CAFZyc5znrXW1deVRrILa2sdpK2VvuEDr9p2+2o0dKXvDpDmdz+nJJqqzC1gs3l9ea7Giryq9+klp64KUezXckIaSr5qBkJFXeqhXCkf8A1x0pn/CLf7avrVN6QtDZ2gcld+jd+7uvz/hKUpVAtElKUoiUro3a82uxW5U67TmYjCfnOKxzHwA6k+QqINR8Y5dwKommmlRI5ykynR+dUPqj5vv3PuqTT0ss5swKLU1kVOLyH5cVKV81VZrAgplyQuRjKY7ftLPvHcPM1HN61lc74C0lRixT/IoO6v1j3/hUfsSHHXS684pxxRypa1ZKj5muPUupUad06qSMKlO/m46PrfSPkOv2Dvq8psLawi+pWarMXfIDbRq1riRqQEHTsFwcxwZS0np3hH7T8POpD9Fn+1dUjPRyN+DlVzcfW8+488pS3FqKlKPVRO5NWK9FhWWNVDGDzxfwcqzxiIR0BaPh1VTgcplxFrj8eisTXnt6Q14k3b0jNRl9wlMJxENpJPyUJbScfapR+NehNUs9KPhfeLVr+VxDtsJ2RZrilCpjjSeb1Z5KQnK/BKgE4PTOR3jOcweRjKja4jRbHF2PdBs8Cpf9Gzh5pW38HLVqs26HNvN0Qt52a4gOKbSFqSGkk/JwBggdVZ8sTeuNGcb7NyO0tH0VIBFeevDTjlrfhnH9RtTsefZ1KLht0wEoSTuShQ3QT8R34zU96e9MTS0pSGtTaYudsUU5U9EUmS3nPQD2VYx34rqtw6q7QvtmB4rzosQphG1l8pCkXW/ADhprhXrEuxN26aVhS5duHYKcGcqSsJ2VkbZxkdxFSY002ywhlpIQ2hISlI6ADYCta0hxF0TryOp3SmoodwUgZcYSSh1v9ZtQCgPPGK2iqyRz9GvvpzVnG2P2mW15KqvpZ8TJbKmOGdmlKaS62mTdVtqwVIPyGSR3HHMR4cvcaibgjwSmcVL49KmvvwNOQVBEmS1s48vGeybz0ONyrfAI23FapxUvTt4416sukh0uhdzfShZ69mhZS2PghKR8KvfwS061pngLpq3obQl1yImW+pPz3HfbUr/W+Gwq/mf3Kja2PRzt5VFEzvtY4v8AZas1pvh9orSVuTC0/pq3REAAKWGQpxzHetZypR95rtXjR+ldQ25UG96dtk6Orqh+OlWPMHGQfMb1m6Vni9xOa+q0GRtsttFWS5eiDZHeJ8Sba7u7G0qtRdlQFqKn0EYw22s9Uq3GVbpA76sha7Xb7JZotptMNqHBithpiO0nCW0gYAArlVKioWUrkspUOoKwCK5UqSpIUlQUDuCDkGvWaokmAEhvZecVPHET2YtdUw9ML/risf8A4On/AH7tbn6IFvgzdAalM2FGkctzTyl5pKyB2KemRWmemACeMdkPhZk/792sLwQ45WzhNp262u4afnXJU2UmSlyO6hAQAgJwebv2zV/2L5cNa2MXP3VGZWR4g50hsPsFdr8g2P8AwNb/APR0fup+QbH/AIGt/wDo6P3VXX+rK09/2Gu/+ktUPplaeAz/AAGu5/8AMtVUHDqofoKtPWFL7wVk48GFEaLcWIwwgnJS02EjPjgUr6jPCTCZkJSUh1CVgHqMjNKgKaFTHXDd24v2pnUnC6/KlsRY6VHRj6EMvQUBOP62QnCHE48Nx55wIMGpb9AlLjuJQ0+0oocada5VoUDggpO4IPcayeiLk/CTGMaQ7HlNBL0d1pRStCsb4I6eP21LkuZpTidFRF4kxjbr0hIQxqmA0O0VjoJLY2cT9Ybjy61uImyUTQLZmeY+vVZGXs6l5J0d5H6dFDjfEHUbAwkRTjxa/pruMXyRf1qmTOUSE4SpKRhIHdgd376/dccMtS6ElNu3JhqZaZG8S8wVdpFkDuwofJV9VWD761+2qMaelzcII5Ve6rSCSOQZ4zcKuqoC0ZSLFSvwpOeOOlCT/wDkW/21faqC8KFn+PPSidv7pt/tq/VZP0j/ANhvh/JV/wCjn+u7x/gJSldC8zLhAs7sm12h26y0/o4jbyGSs+alkADx6nyNZ9aFdx55qPHW/IdQ002krW4tQSlIG5JJ6Cod1nx8s1uDlv0iG7pMB5TKUD2DfiR0Kz7sDzNaRruw+kPrh5Tc3TKGbfn2bfHuUdtoD63t5Wfft4CtJHBnjQgAI0XGT4ZuLCsf69XVHRU2jp5B4XVHW1tUQWU8ZHxt0X7cb9edRXU3G9XF6W/vylatkA9yR0SPIV2oayQOprqOcHuOzieVOnGWh9SZGH/vrSdSaW13pa+ItOq3pMCQtoPpbRKDmUEqAPsHHVKhv4VooX07/wAOFw8As3NBOy8swPiVKxnRoMYvy5CGUJBUStWM+4d5qKNQage1Be1zXSUNpHIy2fmoHj5nqaxigxEWEtJytzda1bqPvNd2O62rZYCh571NhjERzHVVs7u0Fgul2g5diKsj6KpBj6qP14v4O1FGltEzdX3ERbTakOJT+lkq9hpkeK19B+PgKshwe0vpjSLl5tNlnuTrgUx3Z7w/QgntAhLfftheT35FVeO1sbqcwt9rRW3o/RSCpExFhr04KUq+XG23mVsvNpcbWkpUhYyFA9QR3ivqoPvfpL6U03xsuGi7zGcFsi8rKrtHy4Gn8ZWlaBvyjIHMnJBByO8Y6OJ8hIYL2W4klZGAXm11kNVejPws1O+7KZtkixynCVFy1O9knJOSezIKP9Wod1X6HuoIjTsjR2potzAGUxbgjsHD5BacpJ8zyirX2TUVh1Jb0zrBeIVyjqAV2kV1LgAPTOOnxrIrWhttTji0oQkZUpRwAPEmpMVfUQ6NcfAqNLQU82pb8wvMGXA1PoLWa48xMyx32AsH2V8jjR6gpUOoI3BGxFX04FcR3OJXCePc562zdoazEncmBzLSAQ5gdOZJB9+cbVV30o9Taf1VxpjK0/NZmogQERJEhhQU2pztFqIBGxwFAZ8du6pf9Dq0S4fDK/XZ5vkYn3IdiT1V2baUqPuz+FW2I2mpGzvFnKrw+8NU6Fhu1Va4mWl208ZNV2uS2pBaucgJC+qkFZKFf4ySCPIir8cF9Qs6n4D6ZubSkc6YSIzyUZwhxodmpO/gU1AvpbcN5SLpG4lWiGXI7iExrqW0/oynAbdV5EewT5JqPuBHG1/hdeHbTeUOydMznQt5KBzLiOdC6gd4wBzJ6nAxuMFOzvtGx0erm71zA/uVY9sm5yvvSsPp7VWm9V25M7Tl6hXJhSQrMd0KKQfpJ6p+Iru3G6W20QVTLrcI0KOnq7IdDaR8SazpaQbELRBwIvfRedXGxls+kNrAlCcm4uE7delXo4N4/iA0hjp+SmP5oqhvFW72298a9T3i0S0S4EqctxiQjPK4nbceVXx4M7+j7o//AMKY/m1e4o0NpodLH7Kjwt16iXX+3VaPTCIHGGyEnrZk7f5d2sbwE4I6b4raZvNzvl1u0N2FMTHbTBW2EqSWwrJ50K3yayHph/8AXJYyegsyc/8Aru1vPobPNJ0DqgKWlP8AZNHU4/kU17GR8eGtcw2P3K8hG2TEXNeLj7BZL+o94fnc6k1Of8qx/wDFQ+h7w+Kcfwj1N/6rH/xVYP1iP/f2/wDOFfnrMf8Av7X+cKpu/VHvlW3caf3AkdhMaG1GQSUtICAVdSAMb0p6zH/v7X+cKVEUxeW1ucciCJIaI5mglQ89ulS/bW2rjb2ZjGC26kKHl5VDsUgxmcbDkT09wrddHa0tOnIr8K+uuojqV2jBaRzkH5yceHQ1+lFpMYIWEmFzopVsF8uen2XoKUMT7RKHLKtU1Adjvp78pPQ+YrHXvhDYdUR3LrwxfEecMrf0zMcHaJ8THcPyx9UnPx2rX3uKOiOz9hVxUcbYj/8A9ViZXE3T6HEuxhcErSeZKw2EkHxzmq91K8O7SLZPkfELuOc5ckgzDzHgshwnjS4fH3TEGdHdjyY90bS406koUg77EHcGr/VXnho4NbvWXVWvtOKgSIr7X5GvsxQjy5y/mtlHV1GCfaUPdnrU3ab1Vp3V9lRdtNXiLc4a/wCUYXnlPgpJ3SfIgGs1i1QaiXMRqBY8lpcLpxBEQDvN1mKUpVUrNKUpREqqPpMlKeLMJSlAJFoaJJ7h2z1Wuqr3pFaN1RrHi9Bh2GIhuIm0tGbc5auyixGw88Spxw7efKNz4d9WeESNjqQ55sNVVYzG6SmLWi5uFWsTXpFwPIhSluK5UISMk+AAHfU1aU4Ti3xGb1xJkrtrDg52LMwr+vJA+uP5NPv391cdkk6H4eJDeiWk3vUKU8rmpJzfstHofVmzsB9c719M3OVNlrkz5bsiQ4eZTzqipSj5k1p5JZqkWbst58T9FlGxw05Gbad5D69FJLuo2mrP6hCjx7RZI6SpMSOOVISBkqWrqo+JNc3o23V29XnW9ycJ/PPxSgH5qMOhI+wCoh1xf0x9Li2NOcr0s8qvHsxuft2H21JHoluc7GrhnOFxPwdqDX0zYqJxA4jqpmGTvlrm5jwPRWUqpXE/0Trs7dZd74eXITESHFvuW25PntedRKjyPK+VufnkHxUatm44hppTri0oQkFSlKOAAOpNYe26qst0thuLL78eJzJCXp0ZyIlzmGUlBdSnmBHQjNZumqZKd+eMrWVFPHO3JIvO+48OuJekJpVN0tfoDqFfpmGVqTkd4WjKT7wTXC6xxJ1AEwHmdU3MZ9llaH3PuNelAnQlSVR0zI5eSMqbDg5htnce4g112L3bXwCZTTPO8phoOrSkuqScexv7QPdVmMacdXRglVvqdo0EhsqQ8PfRj4gaouLL+oYitN2fOXHJQxJWO8Ia6g+aseIzV29O6fteltLQdPWWMI8CE0GmkdTgdST3knJJ7yTXeZkx5PP6vIad5FFCuzUFcp8Djoax961DbLAhn19Ulbr5IajxIzkl5zAyohttKlEDbJxgZGTuKr6qtlqiC/hwU6lo4qYbH7rvzIkW4QHoM6O3IjPoLbrLqQpK0kYIIPUVUziV6JlxYmPXThnIbkxlEqNoluBLiPJpw7KHgFEY8atgzPhvx23kPhKXAOVLoLat08wBSrBBxvggGvlN0tq2kOouEVSFqKEqDqSFKHUA53PlXNNVS07s0ZXdTSxVDcsgXmtdNB6+01LLdz0rfYDmccwjLAV7lJ2PvBr4h6Q11fnhHhab1BcFk55BGdWPvFelSrxaUstvKukINuEpQsvpwsggEA533IHxrjZv9lkGV2V0in1WR6o/lwDs3cA8hz34UNvOrT15JvyC6rPUsY/WbKmuhvRP1rfZbMnWLzWnraMKU0lYdlODwCQSlHvJz5VcnT9it+mdLW/T1qQtEKAwmOwlaipQSkYGSepruIlRXJS4zcllbzYBW0lYKkg9CR1FdW8XqDYoCJc/1goW4llCI7C33FrPQJQgFR6HoO6q2qrJap15CrGmpIqYbH7qrvpS6G1hqfilaZ2ntMXW6xm7UlpbsOMt1KV9s4eUkDrgg486gtHCnim3nk0BqhHkmC6P2VfOfxQ0tb7g1AkLmJlutsrTHcZ7J3mdcKG2yhwpUlaiCcEDAGSRkZz38IbYIJkOPpaV+e5WFrSHHOyUpKuVOd90n9uKlwYrJDGIg0EBRZ8MjnkMmYgleeH8VfFYnP8AAPVPxhvfup/FXxX/AOweqf8AQnf3V6Lou9tUFc06O2tDQecbW6kKbQRkFQzsPOvr8qWzsmXfyjE5HzytK7VOHD4JOdz7q9PXUnuBefqeP3yvO2Lwu4rNtKCtDaqGVE/2k7+6leiD14tEYoEi6Qmu0QHEdo+lPMk9FDJ3B8aVFfiDnEuLQvduHMaLZivLmIcQm1EgAIGT8KwM2aJUtTgPsDZI8q7d0noh2tuPzcqnGxknbAxUhaM4LdpZmNW8UbmvSmnXMKYjqT/ZC4Drhlk7pSfpqG3h3jbSVUcLG5zry4n5KiigLyTZaLpLS2p9calasGlrS7cZzm/IjZLae9bizshI8T9/SrJaS4d6H4buImXJ2LrHViMYQRzW6AseA6vLB7zttsB1ONc1rDYsh0toK0NaY03n247By/MP0pDvVZPhnA6bisRcb4bLp5yS2R2xHI0B9I9/uHWoT2TVX+TZby4/NHzRwm0Quef0Wea4hXfU/paaLtUue5KRGuiC8snAU4QfZAGwCRtgd5PgKh3h5qi+2O8uTdO3aTbp7CvlMLwHEZOyk9FDqMEHrWZ4Plcj0l9HvOKKlm6IWpR6kkKJNaLZpCrTqNExR/NhwodHignf9/wrplPG2d0dtMo0+ZXT3udTh19bnX9ldbh96SceYlq28QIiYUjHKLnFSSyv9dG5QfMZB8B0qfYU6HcoDU23ymZUZ0cyHmVhaVDyIqiLdsQQHEe0lQBSod4NbZpLUOotHSw9Yp7jDZVzORle005+sjpnzG/nVVWYMw7UBt8FIpMZc05Z9firk0qN9H8X7Nf1NQbw2LVcFYSOdWWXD9VXd7j9prucRNUass8BcTSem5kyQpGVTw3ztMg+CRupX3DzqgNNI2Ts3Cx+KvRVRuj7RpuPgsprTX2ntC2v1m8SeZ9YJZhtYLrp8h3DzO1U34qcWNWa4mpVKe9UtaVns7ayr82MbgqPz1eZ28AK71+/K79xem6h9eEt5WVuzUKQpZ/xgPu2rSL1H546uXfBztWsw3C4YbPcQ53ksniOKSz7AGVv93rowr8+AC0psqHVKhvWbj6tfaSO0iNrI+isp/Ya0d9gtLKkEg9cjur9YuZ/RSAc9zgGx99X2RvFUeU/pWb1BfHbpd/WFo7NISEoTnOBj9+asV6H7naMax8lxPweqrkvmdj8zZyobjHeKs36Ga+0iayVnPtw/wAHqp8cAFI4fEdVc4G380D49FaRxPO0pHTmBG4z91RbJ4RT5ccdpqOA2428XGIrNudTCbSpsoWOwMknmIPVK0gYxy4JzKlKw4cRuW1c0O3rRZHDZhdpnR4N0MCXJmIkomsMDnaT6uiOtG6vay2leCT7JUk4PLv8I4biJeWZtvnW9DQdd7RiVbQ+EsreS6EMnnHZLSUgc/tDYHlyBjfaUzFMjVpmi9AjSVqlQXbn672rLcVD7bbjLoabCgjnUXFczntHK0hGT3CsnddPTnZFun2O6tQ7hAZcjNuzo6pba2l8nMFpDiFFWW0EK5x0Oc5rYKUvxX0NAFlHzfDy9InQSrV6XozPZOvh6BzvvvojrY5+0LmEpIWFcpSTlPysGuCz8K3oER8TtQNSpS3Xnm5DcAJ7FbkRuMFJS4twcwDfNvkEkjAFSRSvuYrnI1RhH4PtqYli63eJNdfgzYaD6gQllUhDCC4kLdWQU9gdubfnO4xv9XjhPIubs1TV/itofkuPoadgrUgB1ltp1K+R9BWT2QKVAp5eZQIVnNSbSmYp2bbWstG0zw5b05rKRek3JEllfbFlpTSw60XVJUsFztSlScpwkcgIASMnGT39TaOVfNLM2mJcUtLZlplpcuCHJaVEEnlUA4hWPa2wsYwO7atqpXwkk3X0MAFgtGTw8Lr0KVMuEMyY64K1mPCKEK9WcdWAkLdWpIV2oG6lY5c75wOm7wve57ihm8QVM3Ft9Egyrb2zrfO48tJZX2g7PlL24wrJTkcpO0i0pmKZAoyZ4QsNS7h2t2YkRZcdbfI9EUpxClpQlZ5u15VIPZ7JKMgYHNhIrKOcPex1S1ebfMt6W0uOlyFKtweb7Nxxtwhv209m5zN55/aHtbpyM1vNK+5ivgjaNwUc6f4awZFrcd1Vb0uvl5fqrDqkumJGBw2zzbj2RnptvSpGpXy5X0MAXn7czozgRevyc7a0ap4iR0JLk24xlJt1tXjb1dtQBeUnP6Q7ZAxg5Aji569n6hv7161Ld5lynvHK3nck48EjYJSO4DAFejuvOGujOJVh/JWr7KzNQndmQPYfjq+k24N0nf3HoQRtVN+KXokav0il27aGce1Pak5UqMEgTWU9fkjZ0fq7/VrT4ZiFOT+N7fM/3RVNVRvtZns8lGsXXdpjIGY85RHghIH281d2XfGNR21EmOlaUIJQW1H2knz94wfdUYEFLqmlJUhxBIWhYwpJ8CDuKy9hn+oTy2sgMv4SvPce4/8APjWlaG3uFSywADTepL4NpKPSP0eP/wBmj8DWmyIpMp08o3WrYe+t04RkJ9JDRxPfdWx9xrFuw8yHMZzzn8aiNP5x3/I6lfJHWp2+J/hb/wAMXzdNLGBIwZEE8mT85s/J+zp8BW3XFdvskBU65vIYYT847lR8EjqT5CodtWplaIvLd0Q325WC0Y2cdqCPHuwcHPlWLvuprpqe4+vXV/mKSezaRs20PBI/b1r17Al976Kudfetsn6se1Dqi1RYqVRYAnxyG8+25+dT8sj8Bt76lrXGr71pnjzqNVvnvobMlPMyHVJH6NHQg7fCq6WJ4p1bad//AL+P/vU1LXGOWUcetToBHsykj/ZIqJPCx1U1pFxlPUKZDmbTuIPEdCpVtHFa43SKEN3FLywn2os5pLpHxIyofGsdc7zpmalSb5w+09LCt1uRmzFWr4tkVBse5Fp1K0OqQsHIUDgiue9cSH7alqK7HTMkqTzE83Lgd3N765OGx3uwW8NFz3mc/qv469VvdxsXBy4pcL1l1PZXPm+oym5KR/iuY2+JrAS+EmgpqSbDxZjMucuQze4Dkff6PaD2R8M1oK+IlzkKITAitZ6ZKl/urrOakuck8zjjLYzsG2/35r2FHKPYkI8+q5M7Ro6MHy6Lc18C+JMcIXZkWLUTK08xNnurToHlyuFCyT4BJ99Tr6Kmj9TaSXrBvUdguFp9YXEUymW0Uc+A9zcp78Ejp4iof4UcJNX8Sbgi4oeftdiSr27mQUFzHUMgY5z59B491XW0xpq3aS0zHsdrVJXHZH6SU8p5xZPVSlK6n7h0AArP4rWPDTTueHc9NyvcKpWlwnDC3571mKUpWfV+lKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIox4mcBeHvE9l2RdbWiDeCk8l2gpDbwPdz9zg8lfAjrVJuKfo98Q+GSnZr8E3uxI3/KtvQSlA8XW91N+/dPnXpPX4QFJKVAEHYg99WFHic1KbA3HIqNNSsl3715p8DJap/H3RSVbutXVoKPiADvWUvDke2KkPvZwFkADqo56CriS/R+0AnifateWCCLFdIMtMlxuEkJYk4zkKb6JJz8pOOgzmqi8S+H+uNJX5w6ptK24inCGJjB7SOsE9ywNifBWDWiocQjqqku3aAWPO6pK2jdFEBa9iVHM5x+4TFSXup2SkdEjwFddTimgAaynq6QPGuvLhKciLDY9sDKfOtBZVVwdEscj/pdZ/O4xh/tkVJXG6aG/SO1ejOMTE9T/wB0ioksD3NrGyJzgm5Rdv8ALIqROPiyj0ldYY75qf8Act1XnWsb/wAnqFKbH+XI+I/la6u6ojx1PLPsoGevXyrVTMcmS3JUg+24rJ36eAr4lyVvJDBV7I3UPOsrozRep9eambsOlLU7Plr3Vj2W2k/TcWdkp9/XuqY97ImlzzYLmOC+g3rrNFankNMsrdcWoJQhtJUpRJwAANyT4Va3gz6McmSljUnE+KWWflsWIn21eCn1A7D6g+J6gyfwb9HzTvDGI1dbkWrxqZSRzzlp/Nxz3pZSeg+sfaPl0qZayOI406W8cGg58SrmlwtrTnl1PJcUaNHhQ2okNhtiO0gIbaaSEpQkDAAA2ArlpSs+rhKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESuCZCh3GC7CuERiVGdTyuMvoC0LHgUnYiuelEVceIPosWqeHrlw/li2yT7X5OkqKmFHwQrdSPccj3VV7UGn77pS8LtOorRLtstOfzchGAoeKVdFDzBIr0vrEaj0vp/VtmXatR2mNcYit+R5O6T4pUN0nzBBq6osbmg2ZNpvmqypwuOXaZoV5dx4pi8RbI8hOG3blFUPI9ujNbx6QjgR6SGsVd4mJH+ybqb9e+irdId+gXXQcsT4TE+PIVBlLCHmkpeSpXKvZKwEg7HB99bYr0aI2qPSH1Dr7XchuRZnpgeg2hlR/P4bQOZ9X0cpOEDr3nuNo7F4GyicG+ydON7hRY6GTszG7mqz8GuAWquLFxTOcbdtGmm1Dtro6nd7xQwk/LP1vkjxJ2q++guHmlOG2lUWHSltTFYzzvPKPM9IX3rcWd1H7gNgABitkjx48SI3FiMNsMNJCG2mkhKUJHQADYCuWqCtxCWrdd2g5K0p6ZkI03pSlKgKSlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpX4TiiL9pXxkmuJalhRANfQF8uuxkV+cw8a6SnFgfKNcSlu5+VX0Nuuc6yXMPEUyPGsQpUnGQ4K4+0mA/pE/fXXZrkyhZvI8aZHjWISuTzZ7QVypW6diuvhYvokusnkUrqIUvHWudPNjc5rkhdgrkpXyM5r6FfF9SlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlEX/9k=';
const SGE_CO={ name:'CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ SGE', addr:'12E1 đường số 4, KDC Vĩnh Phú 1, Phường Bình Hòa, TP Hồ Chí Minh, Việt Nam', mst:'3703455937', email:'sge.company2026@gmail.com', phone:'0364422429',
  bankAcc:'67852068', bankName:'Ngân hàng Thương mại Cổ phần Quân Đội (MB Bank) – Chi nhánh Thuận An', director:'ĐINH THỊ THU NGA', dirTitle:'Giám đốc', dirGender:'Bà' };
function viWords(n){ n=Math.round(Math.abs(Number(n)||0)); if(!n) return 'Không đồng'; const d=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
  const three=(x,full)=>{ const h=Math.floor(x/100), tt=Math.floor(x%100/10), u=x%10; const s=[]; if(full||h) s.push(d[h]+' trăm');
    if(tt>1){ s.push(d[tt]+' mươi'); if(u===1) s.push('mốt'); else if(u===4) s.push('tư'); else if(u===5) s.push('lăm'); else if(u) s.push(d[u]); }
    else if(tt===1){ s.push('mười'); if(u===5) s.push('lăm'); else if(u) s.push(d[u]); }
    else if(u){ if(full||h) s.push('linh'); s.push(d[u]); } return s.join(' '); };
  const units=['','nghìn','triệu','tỷ','nghìn tỷ','triệu tỷ']; const g=[]; while(n>0){ g.push(n%1000); n=Math.floor(n/1000); }
  const parts=[]; for(let i=g.length-1;i>=0;i--){ if(!g[i]) continue; parts.push(three(g[i],i<g.length-1)+(units[i]?' '+units[i]:'')); }
  const s=parts.join(' ').replace(/\s+/g,' ').trim(); return s.charAt(0).toUpperCase()+s.slice(1)+' đồng'; }
const vnd=n=>fmtNum(Math.round(Number(n)||0));
function noAccent(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D'); }
function custCode(cu){ const w=noAccent(cu&&cu.company).toUpperCase().replace(/CONG TY|CO PHAN|TNHH|TRACH NHIEM HUU HAN|THUONG MAI|DICH VU|SAN XUAT|DAU TU|MTV|CP|&/g,' ').replace(/[^A-Z0-9 ]/g,' ').trim().split(/\s+/).filter(Boolean); return (w.slice(-2).join('')||'KH').slice(0,12); }
function docCfg(c){ const cu=custById(c.customerId)||{}; const x=c.ticketId&&ticketById(c.ticketId); const d=new Date(c.signedAt||c.agreedAt||Date.now());
  const seq=String((DB.svc||[]).filter(o=>o.customerId===c.customerId&&o.at<=c.at).length).padStart(2,'0');
  const def={ contractNo:`SGE-${custCode(cu)}/${d.getFullYear()}${seq}`, quoteNo:`SGE-${custCode(cu)}-${seq}`, date:toISODate(c.signedAt||c.agreedAt||Date.now()),
    aRep:cu.rep||'', aTitle:cu.repTitle||'Giám đốc', aGender:cu.repGender||'Ông', aTax:cu.taxCode||'', aPhone:cu.phone||'', aBank:cu.bankAcc||'', aBankName:cu.bankName||'', aAddr:cu.address||'', contact:cu.contact||'',
    shipAddr:(x&&x.address)||cu.address||'', payDays:10, workDays:5, wMonths:c.repairWarrantyMonths||12, validDays:c.validDays||15, mode:'lump',
    tWarranty:'', tPay:'Thanh toán 100% giá trị sửa chữa thiết bị trước khi giao hàng', tDelivery:'Giao hàng trong vòng 3 ngày làm việc kể từ khi ký xác nhận đồng ý sửa chữa',
    bRep:(x&&x.assigneeId&&uname(x.assigneeId))||'', bTitle:'Nhân viên Kỹ thuật', seller:uname(c.createdBy)||'' };
  return Object.assign(def, c.doc||{}); }
function docProducts(c){ const x=c.ticketId&&ticketById(c.ticketId); const ps=x&&x.products&&x.products.length?x.products.flatMap(p=>Array.from({length:Math.max(1,p.qty||1)},()=>({sn:p.sn,model:p.model&&p.model!=='?'?p.model:c.model}))):[{sn:c.sn,model:c.model}]; return ps; }
const UNIT={ part:'Cái', labor:'Gói', other:'Lần' };
function docRows(c,cfg){ const items=c.items||[]; const free=items.filter(i=>i.type==='other'); const main=items.filter(i=>i.type!=='other');
  if(cfg.mode==='detail') return items.map(it=>({ name:`${it.pn?esc(it.pn)+' – ':''}${esc(L(it.desc)||partName(it.pn))}`, unit:UNIT[it.type]||'Cái', qty:it.qty||1, price:Number(it.price)||0, total:lineTotal(it) }));
  const ps=docProducts(c); const sub=main.reduce((s,i)=>s+lineTotal(i),0); const per=ps.length?Math.round(sub/ps.length):sub;
  const bullets=main.map(it=>`<br>+ ${it.type==='part'?'Thay ':''}${esc(it.type==='part'?partName(it.pn):L(it.desc))}${it.qty>1&&it.type==='part'?' (x'+it.qty+')':''}`).join('');
  const rows=ps.map(p=>({ name:`Sửa chữa biến tần ${esc(p.model||'')} ${esc(p.sn||'')}${bullets}`, unit:'Máy', qty:1, price:per, total:per }));
  if(ps.length&&per*ps.length!==sub) rows[rows.length-1].total+=sub-per*ps.length, rows[rows.length-1].price=rows[rows.length-1].total;
  return rows.concat(free.map(it=>({ name:esc(L(it.desc)), unit:'Lần', qty:it.qty||1, price:Number(it.price)||0, total:lineTotal(it) }))); }
function docTable(c,cfg,opt){ const rows=docRows(c,cfg); const sub=docSubtotal(c), disc=docDiscount(c), vat=docVat(c), tot=docTotal(c);
  return `<table class="grid dg"><tr><th style="width:6%">TT</th><th>${opt&&opt.q?'Hạng mục':'Nội dung công việc'}</th><th style="width:9%">Đơn vị tính</th><th style="width:8%">Số lượng</th><th style="width:15%">Đơn giá</th><th style="width:17%">Thành tiền (đồng)</th></tr>
    ${rows.map((r,i)=>`<tr><td class="c">${i+1}</td><td>${r.name}</td><td class="c">${r.unit}</td><td class="c">${r.qty}</td><td class="r">${vnd(r.price)}</td><td class="r">${vnd(r.total)}</td></tr>`).join('')}
    <tr><td colspan="5" class="r"><b>Tổng cộng</b></td><td class="r"><b>${vnd(sub)}</b></td></tr>
    ${disc?`<tr><td colspan="5" class="r">Chiết khấu (${c.discount}%)</td><td class="r">− ${vnd(disc)}</td></tr>`:''}
    <tr><td colspan="5" class="r">Thuế GTGT (${c.vat||0}%)</td><td class="r">${vnd(vat)}</td></tr>
    <tr><td colspan="5" class="r"><b>Tổng cộng thanh toán</b></td><td class="r"><b>${vnd(tot)}</b></td></tr></table>
    <p style="margin:6px 0"><b><i>Bằng chữ: ${viWords(tot)}.</i></b></p>`; }
const natHead=()=>`<div class="nat"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br><b><u>Độc lập - Tự do - Hạnh phúc</u></b></div>`;
const fmtLong=iso=>{ const d=iso?new Date(iso+'T12:00:00'):new Date(); return `ngày ${String(d.getDate()).padStart(2,'0')} tháng ${String(d.getMonth()+1).padStart(2,'0')} năm ${d.getFullYear()}`; };
const partyA=(cu,cfg,lbl)=>`<table class="info"><tr><td style="width:22%"><b>${lbl}</b></td><td colspan="3"><b>${esc(String(cu.company||'').toUpperCase())}</b></td></tr>
  <tr><td>Đại diện</td><td>: ${esc(cfg.aGender)} <b>${esc(String(cfg.aRep||'…………………').toUpperCase())}</b></td><td style="width:12%">Chức vụ:</td><td>${esc(String(cfg.aTitle).toUpperCase())}</td></tr>
  <tr><td>Mã số thuế</td><td colspan="3">: ${esc(cfg.aTax||'…………………')}</td></tr><tr><td>Địa chỉ</td><td colspan="3">: ${esc(cfg.aAddr)}</td></tr>
  <tr><td>Điện thoại</td><td colspan="3">: ${esc(cfg.aPhone)}</td></tr><tr><td>Tài khoản</td><td colspan="3">: ${esc(cfg.aBank||'…………………')}${cfg.aBankName?' &nbsp; Ngân hàng: '+esc(cfg.aBankName):''}</td></tr></table>`;
const partyB=(lbl,rep,title,gender)=>`<table class="info"><tr><td style="width:22%"><b>${lbl}</b></td><td colspan="3"><b>${SGE_CO.name}</b></td></tr>
  <tr><td>Đại diện</td><td>: ${gender||SGE_CO.dirGender} <b>${esc(String(rep).toUpperCase())}</b></td><td style="width:12%">Chức vụ:</td><td>${esc(title)}</td></tr>
  <tr><td>Mã số thuế</td><td colspan="3">: ${SGE_CO.mst}</td></tr><tr><td>Địa chỉ</td><td colspan="3">: ${SGE_CO.addr}</td></tr>
  <tr><td>Tài khoản</td><td colspan="3">: ${SGE_CO.bankAcc} tại ${SGE_CO.bankName}</td></tr></table>`;
function docQuote(c,cfg){ const cu=custById(c.customerId)||{}; const d0=c.sentAt||c.at; const exp=d0+(cfg.validDays||15)*DAYMS; const dep=Number(c.depositPct)||0;
  return `<div class="a4 sgedoc"><table class="lh"><tr><td style="width:24%"><img src="${SGE_LOGO}" alt="SGE" style="height:78px"></td><td><b style="font-size:15px">${SGE_CO.name}</b><br>Địa chỉ: ${SGE_CO.addr}<br>MST: ${SGE_CO.mst}<br>Email: ${SGE_CO.email}</td></tr></table>
  <h2 class="ttl">BẢNG BÁO GIÁ</h2>
  <table class="info"><tr><td style="width:64%">Tên khách hàng: <b>${esc(cu.company||'')}</b></td><td style="width:14%">Số:</td><td><b>${esc(cfg.quoteNo)}</b></td></tr>
  <tr><td>Địa chỉ: ${esc(cfg.aAddr)}</td><td>Ngày:</td><td>${fmtD(d0)}</td></tr><tr><td>Mã số thuế: ${esc(cfg.aTax)}</td><td>Hiệu lực đến:</td><td>${fmtD(exp)}</td></tr>
  <tr><td>Người liên hệ: ${esc(cfg.contact)}</td><td>Loại tiền:</td><td>VNĐ</td></tr><tr><td>Điện thoại: ${esc(cfg.aPhone)}</td><td></td><td></td></tr><tr><td>Nhân viên bán hàng: <b>${esc(String(cfg.seller).toUpperCase())}</b></td><td></td><td></td></tr></table>
  <p>Chúng tôi trân trọng gửi đến Quý khách bảng chào giá ${c.warranty?'dịch vụ bảo hành':'dịch vụ sửa chữa'} như sau:</p>${docTable(c,cfg,{q:1})}
  <p style="margin:10px 0 2px"><b>Ghi chú:</b></p>
  <p style="margin:0 0 0 18px">+ Bảo hành: ${esc(cfg.tWarranty||`Bảo hành ${cfg.wMonths} tháng cho nội dung sửa chữa ở trên kể từ ngày giao hàng`)}<br>+ Thanh toán: ${esc(dep?`Đặt cọc ${dep}% khi ký xác nhận đồng ý sửa chữa, thanh toán phần còn lại trước khi giao hàng`:cfg.tPay)}<br>+ Thời gian giao hàng: ${esc(cfg.tDelivery)}<br>+ Tài khoản: ${SGE_CO.bankAcc} – ${SGE_CO.bankName}</p>
  <p style="margin:10px 0">Trân trọng cảm ơn Quý khách.</p>
  <table class="sign"><tr><td><b>Xác nhận của khách hàng</b><br><i>(Ký, họ tên)</i></td><td><b>Giám Đốc</b><br><i>(Ký, họ tên, đóng dấu)</i></td></tr><tr><td class="s"></td><td class="s"></td></tr><tr><td></td><td><b>${SGE_CO.director}</b></td></tr></table></div>`; }
function docContract(c,cfg){ const cu=custById(c.customerId)||{}; const tot=docTotal(c); const dep=Number(c.depositPct)||0;
  return `<div class="a4 sgedoc">${natHead()}<div class="c" style="margin:2px 0 8px">-----o0o-----</div><h2 class="ttl" style="margin-bottom:0">HỢP ĐỒNG</h2><h3 class="c" style="margin:2px 0">SỬA CHỮA THIẾT BỊ</h3><p class="c" style="margin:0 0 10px">Số: <b>${esc(cfg.contractNo)}</b></p>
  <p class="it">- Căn cứ Luật Dân sự số 91/2015/QH13 ngày 24 tháng 11 năm 2015 của Quốc hội nước Cộng Hoà XHCN Việt Nam;<br>- Căn cứ Luật Thương Mại số 36/2005/QH11 ngày 14 tháng 06 năm 2005 của Quốc hội nước Cộng Hoà XHCN Việt Nam có hiệu lực áp dụng từ ngày 01 tháng 01 năm 2006;<br>- Căn cứ vào khả năng và nhu cầu của hai bên.</p>
  <p>Hôm nay, ${fmtLong(cfg.date)}, chúng tôi gồm:</p>${partyA(cu,cfg,'Bên Mua (Bên A):')}${partyB('Bên Bán (Bên B):',SGE_CO.director,SGE_CO.dirTitle)}
  <p>Hai bên cùng nhau thống nhất ký hợp đồng sửa chữa biến tần như sau:</p>
  <p class="art">Điều 1: Nội dung và giá trị hợp đồng:</p><p style="margin:0">- Giá trị thực hiện hợp đồng như sau:</p>${docTable(c,cfg)}<p style="margin:0">- Đơn giá trên là cố định trong suốt thời gian thực hiện Hợp đồng.</p>
  <p class="art">Điều 2: Chất lượng và bảo hành.</p><p>- Bên B cam kết hàng hóa được thay sau khi sửa chữa cho Bên A phải hoạt động ổn định, đạt các thông số kỹ thuật, công suất và chức năng vận hành theo đúng tiêu chuẩn chất lượng.<br>- Bảo hành sản phẩm dịch vụ:<br>+ Theo chính sách bảo hành của bên B (Điều 7)<br>+ Thời gian bảo hành đối với biến tần trong vòng ${cfg.wMonths} tháng kể từ ngày hai bên ký Biên bản nghiệm thu và bàn giao thiết bị đưa vào sử dụng.</p>
  <p class="art">Điều 3: Phương thức và thời gian thanh toán.</p><p>3.1 Phương thức thanh toán: Thanh toán bằng chuyển khoản<br>3.2 Thời hạn thanh toán: ${dep?`Bên A đặt cọc ${dep}% giá trị hợp đồng (${vnd(Math.round(tot*dep/100))} đồng) ngay sau khi ký hợp đồng; phần còn lại thanh toán trong vòng ${cfg.payDays} ngày`:`${cfg.payDays} ngày`} kể từ ngày nhận hàng và nhận đủ hồ sơ thanh toán bên B.<br>* Hồ sơ thanh toán gồm:<br>+ Giấy đề nghị thanh toán<br>+ Biên bản nghiệm thu khối lượng và giá trị hoàn thành<br>+ Hóa đơn GTGT hợp lệ</p>
  <p class="art">Điều 4: Giao hàng và tiến độ thực hiện hợp đồng.</p><p>- Bên B chịu chi phí vận chuyển 2 đầu. Bên B nhận thiết bị tại chân công trình của Bên A đến Trung tâm sửa chữa của bên B và bàn giao thiết bị sau khi sửa chữa xong đến tại chân công trình ${esc(String(cu.company||'').toUpperCase())}.<br>- Địa chỉ nhận hàng tại ${esc(String(cu.company||'').toUpperCase())}: ${esc(cfg.shipAddr)}<br>- Tiến độ thực hiện: ${String(cfg.workDays).padStart(2,'0')} ngày kể cả ngày nghỉ, lễ, tết.<br>- Bên B sẽ bắt đầu tiến hành sửa chữa thiết bị ngay sau khi được nhận hàng hóa từ bên A.</p>
  <p class="art">Điều 5: Quyền hạn và trách nhiệm của các bên.</p><p>5.1. Quyền và trách nhiệm của bên A<br>- Tạo điều kiện để bên B thực hiện công việc theo yêu cầu của bên A.<br>- Bên B chỉ hỗ trợ kỹ thuật, lắp đặt và kiểm tra Biến tần cho bên A, nếu có công việc phát sinh thì Bên A sẽ tiến hành xử lý theo sự hướng dẫn của Bên B.<br>- Bên A cam kết nhận hàng đúng hạn từ bên B theo đúng điều 4 của hợp đồng này.<br>- Bên A cam kết thanh toán cho bên B theo đúng điều 3 của hợp đồng này.<br>- Thực hiện đầy đủ trách nhiệm và nghĩa vụ khác theo quy định tại Hợp đồng này và theo quy định của pháp luật Việt Nam.<br>5.2. Quyền và trách nhiệm của bên B<br>- Bên B cam kết thực hiện đầy đủ cho bên A theo đúng điều 1 của hợp đồng này.<br>- Bên B cam kết chất lượng thiết bị sau sửa chữa và hỗ trợ kỹ thuật cho bên A.<br>- Bên B cam kết giao thiết bị đúng hạn theo đúng điều 4 của hợp đồng này.<br>- Thực hiện đầy đủ trách nhiệm và nghĩa vụ khác theo quy định tại Hợp đồng này và theo quy định của pháp luật Việt Nam.</p>
  <p class="art">Điều 6: Bất khả kháng</p><p>- Bất khả kháng là những sự kiện hoàn cảnh xảy ra mang tính khách quan nằm ngoài khả năng kiểm soát của hai Bên. Những sự kiện này bao gồm: chiến tranh, động đất, bão, lũ, lụt, lốc, mưa, sóng thần, lở đất, hoả hoạn, chiến tranh hoặc có nguy cơ xảy ra chiến tranh, do thay đổi cơ chế chính sách hoặc theo quyết định của cơ quan nhà nước có thẩm quyền mà việc quyết định đó không phải do lỗi của một trong các bên và các thảm họa khác chưa lường hết được, .. thì được coi là bất khả kháng.<br>- Việc một bên không hoàn thành nghĩa vụ của mình do sự kiện bất khả kháng sẽ không phải là cơ sở để bên kia chấm dứt hợp đồng. Tuy nhiên bên bị ảnh hưởng bởi sự kiện bất khả kháng có nghĩa vụ phải:<br>+ Tiến hành các biện pháp ngăn ngừa hợp lý và các biện pháp thay thế cần thiết để hạn chế tối đa ảnh hưởng, thiệt hại do sự kiện bất khả kháng gây ra.<br>+ Thông báo ngay cho bên kia về sự kiện bất khả kháng xảy ra trong vòng 1 ngày ngay sau khi xảy ra sự kiện bất khả kháng.<br>- Không bên nào phải chịu trách nhiệm pháp lý và trách nhiệm bồi thường thiệt hại hay bị phạt trong trường hợp không thực hiện các nghĩa vụ theo Hợp đồng do các trường hợp bất khả kháng.<br>- Trong trường hợp bất khả kháng xảy ra, bên B phải cố gắng hết sức để ngăn chặn các ảnh hưởng của sự kiện bất khả kháng và đề xuất các biện pháp để khắc phục các hậu quả do bất khả kháng xảy ra và tiếp tục thực hiện công việc, bao gồm cả đề xuất về việc tăng chi phí và kéo dài ngày hoàn thành cam kết.<br>- Trong trường bất khả kháng dẫn đến việc các bên buộc phải chấm dứt hợp đồng thì các bên sẽ thỏa thuận để thống nhất giá trị thanh toán.</p>
  <p class="art">Điều 7: Chính sách bảo hành</p><p>a. Phạm vi bảo hành.<br>- Sản phẩm bị lỗi không nằm trong “Điều khoản loại trừ bảo hành” và còn trong thời gian bảo hành theo hợp đồng sửa chữa của chúng tôi và khách hàng.<br>- Nếu có sự cố xảy ra bên A phải giữ nguyên hiện trạng hiện trường và mời kỹ thuật hai Bên để cùng xác định nguyên nhân và kết luận. Nếu:<br>+ Lỗi do Bên A, thì Bên B nhận sửa chữa và Bên A thanh toán chi phí cho Bên B.<br>+ Lỗi do Bên B trong thời gian bảo hành, Bên B sửa chữa, Bên A không thanh toán chi phí.<br>- Bên B cam kết trong thời gian còn bảo hành nếu thiết bị hư hỏng kể từ khi có thông báo của Bên A thì Bên B cử nhân sự đến địa chỉ lắp đặt của Bên A để khắc phục sự cố trong vòng 24 giờ để tiến hành sửa chữa đảm bảo hệ thống vận hành tốt. Trường hợp Bên B không đến khắc phục đúng thời gian yêu cầu, Bên A có quyền yêu cầu đơn vị khác đến sửa chữa và mọi chi phí phát sinh do Bên B chi trả.<br>b. Điều khoản loại trừ bảo hành.<br>- Bảo hành này sẽ bị hủy, nếu:<br>+ Số sê-ri của Sản phẩm đã bị thay đổi, chỉnh sửa hoặc không thể xác định rõ ràng.<br>+ Khách hàng tự ý xóa dữ liệu của biến tần.<br>+ Khách hàng tự ý sửa chữa, điều chỉnh hoặc thay đổi, không được ủy quyền hoặc đồng ý của chúng tôi.<br>- Bảo hành này không bao gồm cho cầu chì, bộ chống sét lan truyền, bộ lọc hoặc các hư hỏng liên quan đến thẩm mỹ.<br>- Trong quá trình sử dụng Bên A vận chuyển hàng không đúng cách gây ảnh hưởng đến thiết bị ( biến dạng vỏ thùng, gãy giắc kết nối,...).<br>- Lưu kho không đúng cách sản phẩm trước khi lắp đặt (động vật, bụi bẩn, nước… xâm nhập vào bên trong thiết bị).<br>- Hư hỏng do chạm đất từ phía trung thế.<br>- Lắp đặt không đúng, không tuân theo Hướng dẫn lắp đặt của nhà sản xuất.<br>- Sử dụng và ứng dụng vượt quá phạm vi trong hướng dẫn sử dụng Sản phẩm.<br>- Bỏ mặc, lạm dụng, sử dụng sai, bảo trì không đúng cách hoặc thiếu bảo trì, như được quy định trong Hướng dẫn sử dụng nhà sản xuất.<br>- Xung quá điện áp đến từ phía chuỗi TH DC hoặc từ phía lưới AC.<br>- Tác động của thiên tai như hỏa hoạn, lũ lụt, bệnh dịch, động đất và sét đánh.<br>- Hư hỏng hoặc tai nạn do hành động của bên thứ ba hoặc bất kỳ lý do nào khác với điều kiện sử dụng tiêu chuẩn của biến tần và nằm ngoài thông số kỹ thuật của sản phẩm.<br>- Hệ thống biến tần cần được kiểm tra và bảo trì định thường xuyên. Khi biến tần hoạt động ở môi trường bụi bẩn thì cần tăng tần xuất bảo trì bảo dưỡng cho biến tần. Với các trường hợp biến tần quá bẩn do không được kiểm tra bảo trì bảo dưỡng kịp thời và đúng cách sẽ ảnh hưởng đến tản nhiệt phần công suất, Chúng tôi có quyền xem xét từ chối bảo hành cho những trường hợp này.<br>c. Địa điểm bảo hành:<br>- Tại ${esc(String(cu.company||'').toUpperCase())}, ${esc(cfg.shipAddr)}. Lỗi kỹ thuật của bên nào thì bên đó chịu chi phí.</p>
  <p class="art">Điều 8: Điều khoản chung.</p><p>- Hai bên đã đọc và chấp thuận những điều khoản đã ghi trong hợp đồng. Nếu có phát sinh vấn đề mới hoặc sửa đổi bổ sung nội dung hợp đồng này phải được hai bên đồng ý và ký kết bằng văn bản mới có giá trị.<br>- Trong quá trình thực hiện hợp đồng, nếu có khó khăn vướng mắc hai bên sẽ bàn bạc thương lượng giải quyết trên nguyên tắc hợp tác cùng có lợi. Trường hợp xảy ra tranh chấp, hai bên không tự giải quyết được thì việc giải quyết do Toà án có thẩm quyền xét xử theo pháp luật hiện hành.<br>- Hợp đồng sẽ tự động được thanh lí sau khi đã thanh toán đầy đủ, bàn giao hàng hoá, không có vướng mắc gì khác và tự động chuyển sang điều kiện bảo hành theo điều 2 của hợp đồng này.<br>- Hợp đồng này được làm thành 03 (ba) bản, có giá trị như nhau. Bên A giữ 02 (hai) bản, Bên B giữ 01 (một) bản.</p>
  <table class="sign"><tr><td><b>ĐẠI DIỆN BÊN BÁN</b><br><b>GIÁM ĐỐC</b></td><td><b>ĐẠI DIỆN BÊN MUA</b><br><b>${esc(String(cfg.aTitle).toUpperCase())}</b></td></tr><tr><td class="s"></td><td class="s"></td></tr><tr><td><b>${SGE_CO.director}</b></td><td><b>${esc(String(cfg.aRep||'').toUpperCase())}</b></td></tr></table></div>`; }
function docBbnt(c,cfg){ const cu=custById(c.customerId)||{}; const ps=docProducts(c); const ml=ps.map(p=>`- Model: ${esc(p.model||'')} – ${esc(p.sn||'')}`).join('<br>');
  return `<div class="a4 sgedoc">${natHead()}<h2 class="ttl" style="margin-top:14px">BIÊN BẢN NGHIỆM THU KHỐI LƯỢNG VÀ GIÁ TRỊ HOÀN THÀNH</h2><p class="c" style="margin:0 0 10px">Số: <b>${esc(cfg.contractNo)} - BBNT</b></p>
  <table class="info"><tr><td style="width:18%">Dự án</td><td>: ${esc(String(cu.company||'').toUpperCase())}</td></tr><tr><td>Hạng mục</td><td>: Sửa chữa thiết bị biến tần inverter</td></tr><tr><td>Địa điểm</td><td>: ${esc(cfg.shipAddr)}</td></tr></table>
  <p class="art">1. Đối tượng nghiệm thu:</p><p>- Sửa chữa biến tần năng lượng mặt trời<br>${ml}</p>
  <p class="art">2. Thành phần nghiệm thu:</p>${partyA(cu,cfg,'Bên giao thầu (Bên A):')}${partyB('Bên nhận thầu (Bên B):',cfg.bRep||'…………………',cfg.bTitle,'Ông')}
  <p class="art">3. Thời gian nghiệm thu:</p><p>- Bắt đầu : …… giờ …… phút, ngày …… tháng …… năm ${new Date().getFullYear()}<br>- Kết thúc: …… giờ …… phút, ngày …… tháng …… năm ${new Date().getFullYear()}<br>- Địa điểm: ${esc(cfg.shipAddr)}</p>
  <p class="art">4. Đánh giá chất lượng sửa chữa:</p><p>4.1. Các tài liệu làm căn cứ nghiệm thu:<br>- Căn cứ hợp đồng số: ${esc(cfg.contractNo)} giữa ${esc(String(cu.company||'').toUpperCase())} và ${SGE_CO.name} về việc sửa chữa biến tần năng lượng mặt trời<br>${ml}<br>- Căn cứ thực tế sửa chữa tại trung tâm sửa chữa;<br>- Căn cứ hoạt động của inverter được lắp đặt tại dự án;</p>
  <p>4.2. Về khối lượng:<br>- ${SGE_CO.name} đã hoàn thành công tác sửa chữa biến tần năng lượng mặt trời<br>${ml}</p><p>4.3. Về chất lượng:<br>- Đảm bảo chất lượng theo đúng yêu cầu của Hợp đồng</p><p>4.4. Về tiến độ:<br>- Hoàn thành công tác sửa chữa đảm bảo tiến độ theo Hợp đồng.</p>
  <p>4.5 Giá trị nghiệm thu, thanh toán:</p>${docTable(c,cfg)}
  <p class="art">5. Kết luận:</p><p>- Chấp nhận nghiệm thu công tác sửa chữa: Sửa chữa biến tần năng lượng mặt trời<br>${ml}<br>Biên bản nghiệm thu làm thành 03 bản có giá trị pháp lý như nhau, bên A giữ 02 bản, bên B giữ 01 bản.</p>
  <table class="sign"><tr><td><b>ĐẠI DIỆN BÊN A</b></td><td><b>ĐẠI DIỆN BÊN B</b></td></tr><tr><td class="s"></td><td class="s"></td></tr><tr><td><b>${esc(String(cfg.aRep||'').toUpperCase())}</b></td><td><b>${esc(String(cfg.bRep||'').toUpperCase())}</b></td></tr></table></div>`; }
function docDntt(c,cfg){ const cu=custById(c.customerId)||{}; const paid=docPaid(c); const due=docDue(c);
  return `<div class="a4 sgedoc"><table class="lh2"><tr><td style="width:44%" class="c"><b>${SGE_CO.name}</b><br>Số: ${esc(cfg.contractNo)}- ĐNTT</td><td class="c"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br><b><u>Độc lập – Tự do – Hạnh phúc</u></b><br><i>Tp.Hồ Chí Minh, ${fmtLong(toISODate(Date.now()))}</i></td></tr></table>
  <h2 class="ttl" style="margin-top:18px">GIẤY ĐỀ NGHỊ THANH TOÁN</h2><p class="c"><b>Kính gửi: ${esc(String(cu.company||'').toUpperCase())}</b></p>
  <p>${SGE_CO.name} xin gửi tới ${esc(String(cu.company||'').toUpperCase())} lời cảm ơn chân thành vì đã tin tưởng tạo điều kiện cho chúng tôi có dịp hợp tác trong hợp đồng số: ${esc(cfg.contractNo)}. Theo điều khoản về thanh toán của hợp đồng, kính đề nghị Quý công ty thanh toán cho chúng tôi số tiền bao gồm cả thuế VAT như sau:</p>${docTable(c,cfg)}
  ${paid?`<p style="margin:4px 0">Đã thanh toán (đặt cọc / tạm ứng): <b>${vnd(paid)} đồng</b><br>Số tiền đề nghị thanh toán còn lại: <b>${vnd(due)} đồng</b> <i>(${viWords(due)})</i></p>`:''}
  <p>• Tên tài khoản: ${SGE_CO.name}<br>• Tài khoản số: ${SGE_CO.bankAcc} tại Ngân hàng: ${SGE_CO.bankName}</p><p>Rất mong nhận được sự hợp tác của Quý Công ty.<br>Trân trọng cảm ơn./</p>
  <table class="sign"><tr><td style="text-align:left"><b><i>Nơi nhận:</i></b><br>Như trên;<br>Lưu TH, KT</td><td><b>${SGE_CO.name}</b><br><b>Giám đốc</b></td></tr><tr><td class="s"></td><td class="s"></td></tr><tr><td></td><td><b>${SGE_CO.director}</b></td></tr></table></div>`; }
function docWcard(c,cfg){ const cu=custById(c.customerId)||{}; const x=c.ticketId&&ticketById(c.ticketId); const rw=repairWarranty(c.sn); const start=(x&&x.delivery&&x.delivery.at)||c.doneAt||Date.now(); const end=addMonthsTs(start,cfg.wMonths);
  const used=(x&&x.parts&&x.parts.length?x.parts:c.items.filter(i=>i.type==='part')).filter(p=>p.pn);
  return `<div class="a4 sgedoc"><table class="lh"><tr><td style="width:24%"><img src="${SGE_LOGO}" alt="SGE" style="height:78px"></td><td><b style="font-size:15px">${SGE_CO.name}</b><br>Địa chỉ: ${SGE_CO.addr}<br>MST: ${SGE_CO.mst} · Hotline: ${SGE_CO.phone}<br>Email: ${SGE_CO.email}</td></tr></table>
  <h2 class="ttl">PHIẾU BẢO HÀNH SỬA CHỮA</h2><p class="c" style="margin:0 0 10px">Số: <b>${esc((x&&x.no)||c.no)}-PBH</b></p>
  <table class="info"><tr><td style="width:26%">Khách hàng</td><td>: <b>${esc(cu.company||'')}</b></td></tr><tr><td>Địa chỉ</td><td>: ${esc(cfg.aAddr)}</td></tr><tr><td>Hợp đồng / báo giá</td><td>: ${esc(cfg.contractNo)} · ${esc(c.no)}</td></tr></table>
  <table class="grid dg" style="margin-top:10px"><tr><th style="width:6%">TT</th><th>Thiết bị</th><th style="width:26%">Số serial</th><th style="width:30%">Nội dung đã sửa chữa / thay thế</th></tr>
  ${docProducts(c).map((p,i)=>`<tr><td class="c">${i+1}</td><td>Biến tần ${esc(p.model||'')}</td><td class="c"><b>${esc(p.sn||'')}</b></td><td>${used.map(u=>`+ ${esc(partName(u.pn))}${u.qty>1?' (x'+u.qty+')':''}`).join('<br>')||'Sửa chữa theo hợp đồng'}</td></tr>`).join('')}</table>
  <table class="info" style="margin-top:10px"><tr><td style="width:26%">Ngày bàn giao</td><td>: <b>${fmtD(start)}</b></td></tr><tr><td>Thời hạn bảo hành</td><td>: <b>${cfg.wMonths} tháng</b>, đến hết ngày <b>${fmtD(end)}</b></td></tr></table>
  <p class="art">Điều kiện bảo hành</p><p>- Bảo hành cho nội dung sửa chữa và linh kiện đã thay nêu trên, theo Điều 7 Hợp đồng số ${esc(cfg.contractNo)}.<br>- Không bảo hành khi: số sê-ri bị thay đổi hoặc không xác định được; khách hàng tự ý sửa chữa, can thiệp; hư hỏng do sét đánh, thiên tai, quá áp từ phía DC/AC, chạm đất phía trung thế; vận chuyển, lắp đặt, bảo trì không đúng hướng dẫn của nhà sản xuất.<br>- Không bảo hành cầu chì, bộ chống sét lan truyền, bộ lọc và hư hỏng thẩm mỹ.<br>- Khi có sự cố trong thời hạn bảo hành, vui lòng giữ nguyên hiện trạng và liên hệ hotline <b>${SGE_CO.phone}</b> hoặc email ${SGE_CO.email}, kèm số phiếu này.</p>
  <table class="sign"><tr><td><b>KHÁCH HÀNG</b><br><i>(Ký, ghi rõ họ tên)</i></td><td><b>ĐẠI DIỆN SGE</b><br><i>(Ký, ghi rõ họ tên)</i></td></tr><tr><td class="s"></td><td class="s"></td></tr><tr><td></td><td><b>${esc(String(cfg.bRep||'').toUpperCase())}</b></td></tr></table></div>`; }
const DOC_KINDS={ quote:docQuote, contract:docContract, bbnt:docBbnt, dntt:docDntt, wcard:docWcard };
const DOC_CSS=`.sgedoc{font-size:13.5px;line-height:1.45}.sgedoc p{margin:4px 0;text-align:justify}.sgedoc .c{text-align:center}.sgedoc .r{text-align:right}.sgedoc .ttl{text-align:center;font-size:19px;margin:14px 0 6px}.sgedoc .nat{text-align:center;line-height:1.5}.sgedoc .art{font-weight:700;margin:10px 0 2px}.sgedoc .it{font-style:italic}.sgedoc .lh td{vertical-align:middle;padding:0 6px}.sgedoc .lh{border-bottom:2px solid #1f4e8c;margin-bottom:6px}.sgedoc .lh2 td{vertical-align:top}.sgedoc .info td{padding:1px 4px;vertical-align:top}.sgedoc .dg th{font-weight:700;background:#f2f2f2}.sgedoc .dg td,.sgedoc .dg th{padding:4px 6px;height:auto}.sgedoc .sign{margin-top:16px}.sgedoc .sign td.s{height:96px}`;
/* hộp xem trước + sửa thông tin + in */
const DOC_FIELDS={
  quote:[['quoteNo','doc_quote_no'],['contact','doc_contact'],['aTax','tax_code'],['aPhone','phone'],['aAddr','address',1],['seller','doc_seller'],['validDays','doc_valid',0,'n'],['wMonths','doc_wmonths',0,'n'],['tDelivery','doc_t_delivery',1],['tPay','doc_t_pay',1]],
  contract:[['contractNo','doc_contract_no'],['date','doc_sign_date',0,'d'],['aGender','doc_gender',0,'g'],['aRep','doc_a_rep'],['aTitle','doc_a_title'],['aTax','tax_code'],['aPhone','phone'],['aBank','doc_a_bank'],['aBankName','doc_a_bankname'],['aAddr','address',1],['shipAddr','doc_ship',1],['payDays','doc_paydays',0,'n'],['workDays','doc_workdays',0,'n'],['wMonths','doc_wmonths',0,'n']],
  bbnt:[['contractNo','doc_contract_no'],['aGender','doc_gender',0,'g'],['aRep','doc_a_rep'],['aTitle','doc_a_title'],['aTax','tax_code'],['shipAddr','doc_ship',1],['bRep','doc_b_rep'],['bTitle','doc_b_title']],
  dntt:[['contractNo','doc_contract_no']],
  wcard:[['contractNo','doc_contract_no'],['wMonths','doc_wmonths',0,'n'],['bRep','doc_b_rep']] };
A.docOpen = el => { const c=svcById(el.dataset.id); if(!c) return; if(S.ui['ed_'+c.id]) edCommit(c.id); openModal({ type:'doc', id:c.id, kind:el.dataset.k||'quote', f:Object.assign({},docCfg(c)) }); };
MODALS.doc = m => { const c=svcById(m.id); if(!c) return {title:'—',body:''}; const f=m.f; const edit=can('svc_manage')||can('pay_record');
  const fields=(DOC_FIELDS[m.kind]||[]).map(([k,l,full,ty])=>`<div class="field ${full?'full':''}"><label for="dc-${k}">${t(l)}</label>${ty==='g'?`<select class="select" id="dc-${k}" data-bind="modal.f.${k}" data-re>${['Ông','Bà'].map(g=>`<option ${f[k]===g?'selected':''}>${g}</option>`).join('')}</select>`:`<input class="input" id="dc-${k}" type="${ty==='n'?'number':ty==='d'?'date':'text'}" data-bind="modal.f.${k}" data-re value="${esc(f[k]??'')}" ${edit?'':'readonly'}>`}</div>`).join('');
  const modeSel=['quote','contract','bbnt','dntt'].includes(m.kind)?`<div class="field"><label>${t('doc_mode')}</label><div class="seg">${['lump','detail'].map(v=>`<button class="${f.mode===v?'on':''}" data-a="docMode" data-v="${v}">${t('doc_mode_'+v)}</button>`).join('')}</div></div>`:'';
  const html=DOC_KINDS[m.kind](c,f);
  return { wide:true, title:`${t('doc_k_'+m.kind)} · <span class="mono" style="font-weight:500">${esc(c.no)}</span>`,
    body:`<div class="doc-tabs seg">${Object.keys(DOC_KINDS).map(k=>`<button class="${m.kind===k?'on':''}" data-a="docKind" data-k="${k}">${t('doc_k_'+k)}</button>`).join('')}</div>
    <div class="doc-wrap"><div class="doc-form"><div class="form-grid">${modeSel}${fields}</div><p class="hint" style="margin-top:8px">${t('doc_hint')}</p></div><div class="doc-prev"><style>${HO_CSS}${DOC_CSS}</style>${html}</div></div>`,
    foot:`<button class="btn" data-a="closeModal">${t('close')}</button><span class="grow"></span>${edit?`<button class="btn" data-a="docSave">${t('save')}</button>`:''}<button class="btn primary" data-a="docPrint">${ic('print',15)} ${t('doc_print')}</button>` }; };
A.docKind = el => { const m=S.ui.modal; m.kind=el.dataset.k; rerender(); };
A.docMode = el => { S.ui.modal.f.mode=el.dataset.v; rerender(); };
function docPersist(){ const m=S.ui.modal; const c=svcById(m.id); const f=m.f; c.doc=Object.assign({},c.doc||{},f); ['validDays','payDays','workDays','wMonths'].forEach(k=>{ if(c.doc[k]!=null) c.doc[k]=Number(c.doc[k])||0; });
  if(c.doc.wMonths&&c.status!=='done') c.repairWarrantyMonths=c.doc.wMonths; if(c.doc.validDays) c.validDays=c.doc.validDays;
  const cu=custById(c.customerId); if(cu){ cu.rep=f.aRep||cu.rep; cu.repTitle=f.aTitle||cu.repTitle; cu.repGender=f.aGender||cu.repGender; cu.taxCode=f.aTax||cu.taxCode; cu.bankAcc=f.aBank||cu.bankAcc; cu.bankName=f.aBankName||cu.bankName; } save(); }
A.docSave = () => { docPersist(); toast(t('toast_saved'),'ok'); rerender(); };
A.docPrint = () => { const m=S.ui.modal; const c=svcById(m.id); if(can('svc_manage')||can('pay_record')) docPersist(); printDoc(`<style>${DOC_CSS}</style>`+DOC_KINDS[m.kind](c,m.f), `${t('doc_k_'+m.kind)} ${c.no}`); };
/* nút báo giá cũ dùng mẫu mới */
A.qdPrint = el => { const c=svcById(el.dataset.id); if(S.ui['ed_'+c.id]) edCommit(c.id); save(); openModal({ type:'doc', id:c.id, kind:'quote', f:Object.assign({},docCfg(c)) }); };
function docBtns(c){ return `<div class="doc-btns"><span class="lbl">${t('doc_print_lbl')}</span>${Object.keys(DOC_KINDS).map(k=>`<button class="btn sm soft" data-a="docOpen" data-id="${c.id}" data-k="${k}">${ic('file',13)} ${t('doc_k_'+k)}</button>`).join('')}</div>`; }
Object.assign(DICT.vi,{ doc_k_quote:'Báo giá', doc_k_contract:'Hợp đồng', doc_k_bbnt:'Biên bản nghiệm thu', doc_k_dntt:'Đề nghị thanh toán', doc_k_wcard:'Phiếu bảo hành', doc_print:'In / Lưu PDF', doc_print_lbl:'In giấy tờ:',
  doc_quote_no:'Số báo giá', doc_contract_no:'Số hợp đồng', doc_sign_date:'Ngày ký', doc_contact:'Người liên hệ', doc_seller:'Nhân viên bán hàng', doc_valid:'Hiệu lực (ngày)', doc_wmonths:'Bảo hành (tháng)', doc_t_delivery:'Thời gian giao hàng', doc_t_pay:'Điều kiện thanh toán',
  doc_gender:'Danh xưng', doc_a_rep:'Người đại diện bên A', doc_a_title:'Chức vụ bên A', doc_a_bank:'Số tài khoản bên A', doc_a_bankname:'Ngân hàng bên A', doc_ship:'Địa chỉ nhận / giao hàng', doc_paydays:'Hạn thanh toán (ngày)', doc_workdays:'Tiến độ (ngày)', doc_b_rep:'Đại diện SGE nghiệm thu', doc_b_title:'Chức vụ đại diện SGE',
  doc_mode:'Cách trình bày hạng mục', doc_mode_lump:'Gộp theo máy', doc_mode_detail:'Chi tiết từng dòng', doc_hint:'Thông tin bên A được lưu vào hồ sơ khách hàng để lần sau tự điền. Nội dung bảng giá lấy từ báo giá trong hệ thống.' });
Object.assign(DICT.en,{ doc_k_quote:'Quotation', doc_k_contract:'Contract', doc_k_bbnt:'Acceptance record', doc_k_dntt:'Payment request', doc_k_wcard:'Warranty card', doc_print:'Print / Save PDF', doc_print_lbl:'Print documents:',
  doc_quote_no:'Quote no.', doc_contract_no:'Contract no.', doc_sign_date:'Signing date', doc_contact:'Contact person', doc_seller:'Sales person', doc_valid:'Valid (days)', doc_wmonths:'Warranty (months)', doc_t_delivery:'Delivery time', doc_t_pay:'Payment terms',
  doc_gender:'Title', doc_a_rep:'Party A representative', doc_a_title:'Party A position', doc_a_bank:'Party A bank account', doc_a_bankname:'Party A bank', doc_ship:'Pickup / delivery address', doc_paydays:'Payment term (days)', doc_workdays:'Lead time (days)', doc_b_rep:'SGE acceptance rep', doc_b_title:'SGE rep position',
  doc_mode:'Line layout', doc_mode_lump:'One line per unit', doc_mode_detail:'Itemised', doc_hint:'Party A details are saved to the customer record for next time. Prices come from the quote in the system.' });

/* ===================================================================
   BỔ SUNG QUY TRÌNH: hình tiếp nhận · phát sinh · không sửa được · sửa lại trong BH
   · đặt cọc · duyệt báo giá theo hạn mức · hiệu lực báo giá · phí lưu kho
   · đối chiếu xuất kho / nhập trả / thu hồi xác · thiếu hàng → đề nghị mua · giữ hàng · giá vốn
   =================================================================== */
const QUOTE_LIMIT=20000000, DISC_LIMIT=10, STORE_FREE_DAYS=7, STORE_RATE=50000;
/* ---------- 1. Hình ảnh lúc tiếp nhận bắt buộc ---------- */
PROOF_STAGES.unshift('intake');
const _storageCfgI=storageCfg; storageCfg=function(){ return Object.assign({},_storageCfgI(),{reqImage:true}); };
const _ntSubmitI=A.ntSubmit; A.ntSubmit=el=>{ const ids=new Set(DB.tickets.map(x=>x.id)); const imgs=((S.ui.nt&&S.ui.nt.attachments)||[]).filter(a=>a.kind!=='log'); const r=_ntSubmitI(el);
  if(el.dataset.mode!=='draft'){ DB.tickets.filter(x=>!ids.has(x.id)).forEach(x=>{ if(imgs.length&&!(x.proofs||[]).some(p=>p.stage==='intake')) (x.proofs=x.proofs||[]).push({stage:'intake',files:imgs,note:'',at:Date.now(),by:S.userId}); }); save(); } return r; };
const _intakeSaveP=A.intakeSave; A.intakeSave=el=>{ const x=ticketById(el.dataset.id); if(x&&S._proofOK!=='intake'&&!(x.proofs||[]).some(p=>p.stage==='intake')) return proofAsk('intake',x.id,null,{a:'intakeSave',ds:Object.assign({},el.dataset)}); return _intakeSaveP(el); };

/* ---------- 2. Máy quay lại trong thời gian bảo hành sửa chữa ---------- */
function reworkOf(x){ const sns=(x.products||[]).map(p=>String(p.sn||'').trim().toUpperCase()).filter(Boolean); if(!sns.length) return null; let best=null;
  (DB.tickets||[]).forEach(p=>{ if(p===x||p.createdAt>=x.createdAt) return; if(!(p.products||[]).some(q=>sns.includes(String(q.sn||'').trim().toUpperCase()))) return;
    const done=tkDoneAt(p); if(!done||done>x.createdAt) return; const c=p.svcId&&svcById(p.svcId); const end=addMonthsTs(done,(c&&c.repairWarrantyMonths)||6);
    if(x.createdAt<=end&&(!best||done>best.done)) best={t:p,done,end}; }); return best; }

/* ---------- 3. Cảnh báo đầu phiếu ---------- */
function quoteExpiry(c){ return (c.sentAt||c.at)+(c.validDays||15)*DAYMS; }
const quoteOpen=c=>c&&['quote','sent'].includes(c.status)&&!c.agreedAt;
function readyDays(x){ const a=histAt(x,['test_passed']); return isReady(x)&&a?Math.floor((Date.now()-a)/DAYMS):0; }
function tkAlerts(x){ const u=me(); if(!u||isExternal(u)) return ''; const out=[]; const c=x.svcId&&svcById(x.svcId);
  const rw=reworkOf(x); if(rw) out.push(['bad','refresh',t('al_rework',{no:rw.t.no,id:rw.t.id,d:fmtD(rw.done),e:fmtD(rw.end),k:esc(uname(rw.t.assigneeId)||'—')})]);
  if(x.unrepairable) out.push(['bad','x',t('al_unrep',{r:t('ur_'+x.unrepairable.reason),n:esc(x.unrepairable.note||'')})]);
  if(c&&quoteOpen(c)&&c.status==='sent'){ const e=quoteExpiry(c); if(Date.now()>e) out.push(['bad','clock',t('al_q_expired',{d:fmtD(e)})]); else if(e-Date.now()<2*DAYMS) out.push(['warn','clock',t('al_q_soon',{d:fmtD(e)})]); }
  if(c&&c.quoteReq&&!quoteApproved(c)&&quoteOpen(c)) out.push(['warn','shield',t('al_q_wait_mgr')]);
  const rd=readyDays(x); if(rd>STORE_FREE_DAYS) out.push(['warn','box',t('al_storage',{n:rd,f:STORE_FREE_DAYS,a:money((rd-STORE_FREE_DAYS)*STORE_RATE)})]);
  if(x.extra&&['mgr','quote','sent'].includes(x.extra.status)) out.push(['warn','plus',t('al_extra_'+x.extra.status)]);
  return out.length?`<div class="tk-alerts">${out.map(([k,i,s])=>`<div class="tk-al ${k}">${ic(i,15)}<span>${s}</span></div>`).join('')}</div>`:''; }
A.goTicket = el => openTicket(el.dataset.id);

/* ---------- 4. Báo giá: hạn mức duyệt · hiệu lực · đặt cọc · giấy tờ ---------- */
const needMgr=c=>docTotal(c)>QUOTE_LIMIT||(Number(c.discount)||0)>DISC_LIMIT;
const quoteApproved=c=>!!(c.quoteOk&&c.quoteOk.total===docTotal(c)&&c.quoteOk.disc===(Number(c.discount)||0));
const depNeed=c=>Math.round(docTotal(c)*(Number(c.depositPct)||0)/100);
const depOk=c=>!(Number(c.depositPct)>0)||docPaid(c)>=depNeed(c);
function quoteBox(x){ const u=me(); if(!u||isExternal(u)) return ''; const c=x.svcId&&svcById(x.svcId); if(!c||c.status==='declined') return ''; const mg=can('svc_manage'); const rows=[];
  if(quoteOpen(c)){ const lim=needMgr(c);
    rows.push(`<div class="qb-row"><span class="qb-k">${t('qb_appr')}</span><span>${!lim?`<span class="kst k-ok">${t('qb_no_need')}</span>`:quoteApproved(c)?`<span class="kst k-ok">${t('qb_ok',{u:esc(uname(c.quoteOk.by))})}</span>`:c.quoteReq?`<span class="kst k-warn">${t('qb_wait')}</span>`:`<span class="kst k-blue">${t('qb_need',{l:moneyS(QUOTE_LIMIT),d:DISC_LIMIT})}</span>`}</span>${lim&&!quoteApproved(c)&&can('ticket_approve')?`<button class="btn sm okb" data-a="qApprove" data-id="${c.id}">${ic('check',13)} ${t('qb_approve')}</button>`:''}</div>`);
    const e=quoteExpiry(c); rows.push(`<div class="qb-row"><span class="qb-k">${t('qb_valid')}</span><span>${c.status==='sent'?(Date.now()>e?`<span class="kst k-bad">${t('qb_expired',{d:fmtD(e)})}</span>`:t('qb_until',{d:fmtD(e)})):t('qb_from_send',{n:c.validDays||15})}</span>${mg&&c.status==='sent'?`<button class="btn sm" data-a="qExtend" data-id="${c.id}">${t('qb_extend')}</button>`:''}</div>`); }
  const pct=Number(c.depositPct)||0; const need=depNeed(c), paid=docPaid(c);
  rows.push(`<div class="qb-row"><span class="qb-k">${t('qb_dep')}</span><span>${mg&&quoteOpen(c)?`<select class="select sm" style="width:auto" data-chg="depSet" data-id="${c.id}">${[0,30,50,70,100].map(p=>`<option value="${p}" ${pct===p?'selected':''}>${p?p+'%':t('qb_dep_none')}</option>`).join('')}</select>`:(pct?pct+'%':t('qb_dep_none'))}
    ${pct?` · ${t('qb_dep_amt',{a:money(need)})} · ${paid>=need?`<span class="kst k-ok">${t('qb_dep_ok')}</span>`:`<span class="kst k-warn">${t('qb_dep_wait',{a:money(need-paid)})}</span>`}`:''}</span>${pct&&paid<need&&can('pay_record')&&(c.agreedAt||c.status==='sent')?`<button class="btn sm primary" data-a="depAsk" data-id="${c.id}">${t('qb_dep_take')}</button>`:''}</div>`);
  return `<section class="card qbox"><div class="card-b">${rows.join('')}${docBtns(c)}</div></section>`; }
A.depSet = el => { const c=svcById(el.dataset.id); c.depositPct=Number(el.value)||0; save(); rerender(); };
A.depAsk = el => { const c=svcById(el.dataset.id); A.payAsk({dataset:{id:c.id}}); const m=S.ui.modal; if(m&&m.type==='pay'){ m.f.amount=Math.max(0,depNeed(c)-docPaid(c)); m.f.note=t('qb_dep_note'); m.f.deposit=1; rerender(); } };
A.qApprove = el => { const c=svcById(el.dataset.id); c.quoteOk={by:S.userId,at:Date.now(),total:docTotal(c),disc:Number(c.discount)||0}; const x=c.ticketId&&ticketById(c.ticketId);
  if(c.quoteReq&&c.quoteReq.by&&c.quoteReq.by!==S.userId) notify({toUser:c.quoteReq.by,key:'n_q_ok',vars:{no:c.no},ticketId:x&&x.id}); if(x) x.history.push({at:Date.now(),by:S.userId,action:'quote_approved',from:null,to:null,note:c.no}); save(); rerender(); toast(t('toast_q_ok'),'ok'); };
A.qExtend = el => { const c=svcById(el.dataset.id); c.sentAt=Date.now(); const x=c.ticketId&&ticketById(c.ticketId); if(x) x.history.push({at:Date.now(),by:S.userId,action:'quote_extended',from:null,to:null,note:c.no}); save(); rerender(); toast(t('toast_q_ext',{d:fmtD(quoteExpiry(c))}),'ok'); };
const _svcGoQ=A.svcGo; A.svcGo=el=>{ const c=svcById(el.dataset.id); if(c&&el.dataset.s==='sent'&&c.status==='quote'){ if(S.ui['ed_'+c.id]&&!edCommit(c.id)) return;
    if(needMgr(c)&&!quoteApproved(c)){ if(isBossRole(me())||can('ticket_approve')) c.quoteOk={by:S.userId,at:Date.now(),total:docTotal(c),disc:Number(c.discount)||0};
      else { c.quoteReq={by:S.userId,at:Date.now()}; notify({toRole:'manager',key:'n_q_req',vars:{no:c.no,a:money(docTotal(c))},ticketId:c.ticketId}); save(); rerender(); toast(t('toast_q_req'),'ok'); return; } } }
  return _svcGoQ(el); };
const _tkSignQ=A.tkSign; A.tkSign=el=>{ const x=ticketById(el.dataset.id); const c=x&&x.svcId&&svcById(x.svcId);
  if(x&&c&&x.status==='pending'){ if(c.status==='sent'&&Date.now()>quoteExpiry(c)){ toast(t('err_q_expired'),'bad'); return; } if(needMgr(c)&&!quoteApproved(c)){ toast(t('err_q_unapproved'),'bad'); return; } }
  return _tkSignQ(el); };
const _paySaveDep=A.paySave; A.paySave=()=>{ const m=S.ui.modal; const dep=m&&m.f&&m.f.deposit; const d=m&&docOf(m.id); const n0=d?(d.payments||[]).length:0; _paySaveDep(); if(dep&&d&&(d.payments||[]).length>n0){ d.payments[d.payments.length-1].deposit=1; const x=d.ticketId&&ticketById(d.ticketId); if(x&&x.wh&&x.wh.status==='approved') notify({toRole:'warehouse',key:'n_dep_ok',vars:{no:x.no},ticketId:x.id}); save(); rerender(); } };

/* ---------- 5. Phí lưu kho ---------- */
A.storageFee = el => { const x=ticketById(el.dataset.id); const c=x&&x.svcId&&svcById(x.svcId); if(!c) return; const n=readyDays(x)-STORE_FREE_DAYS; if(n<=0) return;
  let it=c.items.find(i=>i.storage); if(!it){ it={type:'other',desc:'',qty:0,price:STORE_RATE,storage:1}; c.items.push(it); } it.qty=n; it.desc=t('storage_line',{n,f:STORE_FREE_DAYS});
  x.history.push({at:Date.now(),by:S.userId,action:'storage_fee',from:null,to:null,note:money(n*STORE_RATE)}); save(); rerender(); toast(t('toast_storage',{a:money(n*STORE_RATE)}),'ok'); };
const _payGateS=payGate; payGate=function(x){ const rd=readyDays(x); const c=x.svcId&&svcById(x.svcId); const extra=rd>STORE_FREE_DAYS&&c&&(can('pay_record')||can('svc_manage'))?`<div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><span class="hint">${t('al_storage',{n:rd,f:STORE_FREE_DAYS,a:money((rd-STORE_FREE_DAYS)*STORE_RATE)})}</span><button class="btn sm" data-a="storageFee" data-id="${x.id}">${t('storage_add')}</button></div>`:''; return _payGateS(x)+extra; };

/* ---------- 6. Phát sinh linh kiện (báo giá bổ sung) ---------- */
A.exAsk = el => { const x=ticketById(el.dataset.id); const st=tdState(x.id); st.ex={ parts:[{pn:partsFor(x.id)[0].pn,qty:1}], note:'' }; openModal({type:'exReq',id:x.id}); };
MODALS.exReq = m => { const x=ticketById(m.id); const st=tdState(x.id); const E=m.err||{};
  return { title:`${t('ex_title')} · <span class="mono">${x.no}</span>`, body:`<p class="muted" style="margin:0 0 10px">${t('ex_hint')}</p>${partsEditor(x.id,'ex',st.ex.parts)}
    <div class="field" style="margin-top:12px"><label class="req" for="ex-n">${t('ex_reason')}</label><textarea class="textarea ${E.note?'err':''}" id="ex-n" data-bind="td_${x.id}.ex.note" placeholder="${t('ex_reason_ph')}">${esc(st.ex.note||'')}</textarea>${E.note?`<div class="err-text">${E.note}</div>`:''}</div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="exSubmit" data-id="${x.id}">${ic('send',15)} ${t('ex_submit')}</button>` }; };
A.exSubmit = el => { const x=ticketById(el.dataset.id); const st=tdState(x.id); const m=S.ui.modal; const parts=(st.ex.parts||[]).filter(p=>p.pn&&p.qty>0).map(p=>({pn:p.pn,qty:Number(p.qty)||1}));
  if(!parts.length){ toast(t('ex_need_part'),'bad'); return; } if(!String(st.ex.note||'').trim()){ m.err={note:t('e_required')}; rerender(); return; }
  x.extra={ id:'ex'+Date.now().toString(36), no:erpNo('PS'), parts, note:st.ex.note.trim(), status:'mgr', at:Date.now(), by:S.userId, log:[] };
  x.history.push({at:Date.now(),by:S.userId,action:'extra_req',from:null,to:null,note:x.extra.note}); notify({toRole:'manager',key:'n_ex_req',vars:{no:x.no},ticketId:x.id});
  S.ui.modal=null; save(); rerender(); toast(t('toast_ex_req'),'ok'); };
function exPrice(x,p){ const s=stockBy(p.pn); return x.type==='RW'?0:(s?s.price:0); }
function extraBox(x){ const u=me(); if(!u||isExternal(u)) return ''; const e=x.extra; const hist=(x.extras||[]);
  if(!e&&!hist.length) return ''; const st=tdState(x.id); const c=x.svcId&&svcById(x.svcId);
  const block=ex=>{ const editPrice=ex.status==='quote'&&can('svc_manage'); const pr=st.exq||(st.exq={});
    const rows=ex.parts.map((p,i)=>{ const price=ex.prices?ex.prices[i]:(pr['p'+i]!=null?pr['p'+i]:exPrice(x,p)); const s=stockBy(p.pn); const av=s?s.qty-reservedQty(p.pn,x.id):0;
      return `<tr><td class="mono">${esc(p.pn)}</td><td>${esc(partName(p.pn))}</td><td class="r num">${p.qty}</td><td class="r num" style="${av<p.qty?'color:var(--bad);font-weight:600':''}">${fmtNum(av)}</td><td class="r num">${editPrice?`<input class="input num sm" style="width:120px;text-align:right" type="number" data-bind="td_${x.id}.exq.p${i}" data-num data-re value="${price}">`:money(price)}</td><td class="r num">${money(price*p.qty)}</td></tr>`; }).join('');
    const total=ex.parts.reduce((s,p,i)=>s+p.qty*(ex.prices?ex.prices[i]:(pr['p'+i]!=null?Number(pr['p'+i]):exPrice(x,p))),0);
    let act='';
    if(ex.status==='mgr') act=can('ticket_approve')?`<button class="btn okb" data-a="exGo" data-id="${x.id}" data-to="approve">${ic('check',15)} ${t('ex_approve')}</button><button class="btn danger" data-a="exGo" data-id="${x.id}" data-to="reject">${t('reject')}</button>`:`<span class="hint">${t('ex_wait_mgr')}</span>`;
    if(ex.status==='quote') act=can('svc_manage')?`<button class="btn primary" data-a="exGo" data-id="${x.id}" data-to="sent">${ic('send',15)} ${t('ex_send')}</button>`:`<span class="hint">${t('ex_wait_quote')}</span>`;
    if(ex.status==='sent') act=can('svc_manage')?`<button class="btn okb" data-a="exGo" data-id="${x.id}" data-to="agreed">${ic('check',15)} ${t('ex_cust_ok')}</button><button class="btn danger" data-a="exGo" data-id="${x.id}" data-to="declined">${t('ex_cust_no')}</button>`:`<span class="hint">${t('ex_wait_cust')}</span>`;
    return `<div class="ex-blk"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b class="mono">${ex.no}</b> <span class="kst ${({mgr:'k-warn',quote:'k-blue',sent:'k-blue',agreed:'k-ok',declined:'k-bad',rejected:'k-bad'})[ex.status]}">${t('exs_'+ex.status)}</span></div><small class="muted">${esc(uname(ex.by))} · ${fmtDT(ex.at)}</small></div>
      <p class="quote" style="margin:8px 0">${esc(ex.note)}</p><div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl compact"><thead><tr><th>${t('part_no')}</th><th>${t('part_name')}</th><th class="r">${t('qty')}</th><th class="r">${t('avail')}</th><th class="r">${t('unit_price')}</th><th class="r">${t('amount')}</th></tr></thead><tbody>${rows}<tr><td colspan="5" class="r"><b>${t('ex_total')}</b>${x.type==='RW'?` <small class="muted">(${t('ex_warranty_free')})</small>`:''}</td><td class="r num"><b>${money(total)}</b></td></tr></tbody></table></div>
      ${act?`<div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">${act}</div>`:''}</div>`; };
  return `<section class="card action-card exbox"><div class="card-h"><h3 style="color:var(--accent-ink)">${ic('plus',16)} ${t('ex_box')}</h3></div><div class="card-b" style="display:flex;flex-direction:column;gap:14px">${e?block(e):''}${hist.slice().reverse().map(block).join('')}</div></section>`; }
function whAddParts(x,parts){ if(x.wh&&x.wh.status!=='issued'&&x.wh.status!=='cancelled'){ parts.forEach(p=>{ const q=x.wh.parts.find(z=>z.pn===p.pn); if(q) q.qty+=p.qty; else x.wh.parts.push({pn:p.pn,qty:p.qty}); }); if(x.wh.status!=='new'){ x.wh.status='new'; x.wh.log.push({k:'reopened',at:Date.now(),by:S.userId}); } }
  else { if(x.wh) (x.whHist=x.whHist||[]).push(x.wh); x.wh={ no:erpNo('YX'), status:'new', parts:parts.map(p=>({pn:p.pn,qty:p.qty})), createdAt:Date.now(), log:[], extra:1 }; }
  notify({toRole:'warehouse',key:'n_wh_new',vars:{no:x.no},ticketId:x.id}); }
A.exGo = el => { const x=ticketById(el.dataset.id); const e=x&&x.extra; if(!e) return; const to=el.dataset.to; const now=Date.now(); const c=x.svcId&&svcById(x.svcId); const st=tdState(x.id);
  const finish=()=>{ (x.extras=x.extras||[]).push(e); x.extra=null; st.exq=null; };
  if(to==='reject'){ e.status='rejected'; finish(); if(e.by) notify({toUser:e.by,key:'n_ex_rej',vars:{no:x.no},ticketId:x.id}); }
  else if(to==='approve'){ e.approvedBy=S.userId; e.approvedAt=now; if(x.type==='RW'||!c){ e.prices=e.parts.map(()=>0); e.status='agreed'; }
    else { e.status='quote'; ['manager','accountant','warehouse'].forEach(r=>notify({toRole:r,key:'n_ex_quote',vars:{no:x.no},ticketId:x.id})); } }
  else if(to==='sent'){ e.prices=e.parts.map((p,i)=>Number((st.exq||{})['p'+i]!=null?st.exq['p'+i]:exPrice(x,p))||0); e.status='sent'; e.sentAt=now; if(x.customerId) notify({toCustomer:x.customerId,key:'n_ex_cust',vars:{no:x.no},ticketId:x.id}); }
  else if(to==='agreed'){ if(e.status!=='sent') return; e.status='agreed'; }
  else if(to==='declined'){ e.status='declined'; finish(); if(x.assigneeId) notify({toUser:x.assigneeId,key:'n_ex_declined',vars:{no:x.no},ticketId:x.id}); }
  else return;
  if(e.status==='agreed'){ e.agreedAt=now; if(c) e.parts.forEach((p,i)=>c.items.push({type:'part',pn:p.pn,desc:partName(p.pn),qty:p.qty,price:e.prices[i]||0,extra:e.id})); whAddParts(x,e.parts); if(x.assigneeId) notify({toUser:x.assigneeId,key:'n_ex_ok',vars:{no:x.no},ticketId:x.id}); finish(); }
  x.history.push({at:now,by:S.userId,action:'extra_'+e.status,from:null,to:null,note:e.no}); save(); rerender(); toast(t('toast_ex_'+e.status),'ok'); };

/* ---------- 7. Không sửa được ---------- */
const UR_REASONS=['no_parts','too_damaged','not_economic','customer_cancel','other'];
A.urAsk = el => openModal({type:'ur', id:el.dataset.id, f:{reason:'',note:'',fee:0,files:[]}, err:{}});
MODALS.ur = m => { const x=ticketById(m.id); const f=m.f, E=m.err||{};
  return { title:`${t('ur_title')} · <span class="mono">${x.no}</span>`, body:`<p class="muted" style="margin:0 0 12px">${t('ur_hint')}</p><div class="form-grid">
    <div class="field"><label class="req" for="ur-r">${t('ur_reason')}</label><select class="select ${E.reason?'err':''}" id="ur-r" data-bind="modal.f.reason" data-re><option value="">—</option>${UR_REASONS.map(r=>`<option value="${r}" ${f.reason===r?'selected':''}>${t('ur_'+r)}</option>`).join('')}</select>${E.reason?`<div class="err-text">${E.reason}</div>`:''}</div>
    <div class="field"><label for="ur-f">${t('ur_fee')}</label><input class="input num" type="number" min="0" id="ur-f" data-bind="modal.f.fee" data-num value="${f.fee||0}"></div>
    <div class="field full"><label class="req" for="ur-n">${t('ur_note')}</label><textarea class="textarea ${E.note?'err':''}" id="ur-n" data-bind="modal.f.note">${esc(f.note)}</textarea>${E.note?`<div class="err-text">${E.note}</div>`:''}</div></div>
    <div class="field full" style="margin-top:12px"><span class="lbl req">${t('ur_photos')}</span><div class="payimgs">${f.files.map((a,i)=>`<div class="payimg"><img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt=""><button type="button" class="icon-btn" data-a="urDel" data-i="${i}" aria-label="${t('delete')}">${ic('x',13)}</button></div>`).join('')}<label class="payimg-add ${E.files?'err':''}">${ic('upload',18)}<span>${t('pf_add_img')}</span><input type="file" accept="image/*" multiple data-file="urFiles" hidden></label></div>${E.files?`<div class="err-text">${E.files}</div>`:''}</div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn danger" data-a="urSave">${t('ur_confirm')}</button>` }; };
A.urFiles = input => readFiles(input,'image',arr=>{ const m=S.ui.modal; if(!m||m.type!=='ur') return; m.f.files=m.f.files.concat(arr); if(m.err) delete m.err.files; rerender(); });
A.urDel = el => { S.ui.modal.f.files.splice(+el.dataset.i,1); rerender(); };
A.urSave = () => { const m=S.ui.modal; const x=ticketById(m.id); const f=m.f; const E={}; if(!f.reason) E.reason=t('e_required'); if(!String(f.note||'').trim()) E.note=t('e_required'); if(!f.files.length) E.files=t('pf_need_img'); m.err=E; if(Object.keys(E).length){ rerender(); return; }
  const now=Date.now(); const u=me(); const stage=['in_service','on_hold','testing'].includes(x.status)?'repair':'diag'; const fee=Math.max(0,Math.round(Number(f.fee)||0)); const c=x.svcId&&svcById(x.svcId);
  x.unrepairable={reason:f.reason,note:f.note.trim(),fee,at:now,by:u.id,stage}; (x.proofs=x.proofs||[]).push({stage:'unrepairable',files:f.files.slice(),note:f.note.trim(),at:now,by:u.id});
  if(c&&!['done','cancelled'].includes(c.status)){ c.declined={at:now,by:u.id,reason:t('ur_'+f.reason)+': '+f.note.trim(),quoteItems:c.items.map(i=>({...i})),quoteTotal:docTotal(c)}; c.items=fee?[{type:'other',desc:t('ur_fee_line'),qty:1,price:fee}]:[]; c.status='declined'; delete S.ui['ed_'+c.id]; }
  if(x.wh){ if(x.wh.status==='issued') makeReturn(x,[],true); else { x.wh.status='cancelled'; x.wh.log.push({k:'cancelled',at:now,by:u.id}); } }
  if(x.extra){ x.extra.status='rejected'; (x.extras=x.extras||[]).push(x.extra); x.extra=null; }
  x.decline=x.decline||{at:now,by:u.id,reason:t('ur_'+f.reason),fee};
  logH(x,'unrepairable',u.id,x.status,'return_pending',t('ur_'+f.reason)+' · '+f.note.trim());
  notify({toRole:'manager',key:'n_unrep',vars:{no:x.no},ticketId:x.id}); if(x.customerId) notify({toCustomer:x.customerId,key:'n_unrep_cust',vars:{no:x.no},ticketId:x.id});
  S.ui.modal=null; save(); rerender(); toast(t('toast_unrep'),'ok'); };

/* ---------- 8. Giữ hàng (đặt chỗ tồn kho) ---------- */
function reservedQty(pn,exceptId){ let n=0; (DB.tickets||[]).forEach(x=>{ if(x.id===exceptId) return;
    if(x.wh&&['new','pending','approved'].includes(x.wh.status)) x.wh.parts.forEach(p=>{ if(p.pn===pn) n+=p.qty; });
    else if(!x.wh&&x.status==='pending'&&x.partsApproval) ((x.diagnosis&&x.diagnosis.estParts)||[]).forEach(p=>{ if(p.pn===pn) n+=p.qty||1; }); }); return n; }
const availQty=(pn,exceptId)=>{ const s=stockBy(pn); return (s?s.qty:0)-reservedQty(pn,exceptId); };

/* ---------- 9. Thiếu hàng → đề nghị mua + dừng SLA chờ linh kiện ---------- */
function whShort(x){ return (x.wh?x.wh.parts:[]).map(p=>({pn:p.pn,need:p.qty,have:stockBy(p.pn)?stockBy(p.pn).qty:0})).filter(r=>r.have<r.need); }
A.whPo = el => { const x=ticketById(el.dataset.id); const sh=whShort(x); if(!sh.length) return; const now=Date.now(); const bySup={};
  sh.forEach(r=>{ const s=stockBy(r.pn); const sid=(s&&s.supplierId)||((DB.suppliers||[])[0]||{}).id; (bySup[sid]=bySup[sid]||[]).push({pn:r.pn,qty:r.need-r.have+reservedQty(r.pn,x.id),cost:s?s.cost:0}); });
  const nos=[]; Object.entries(bySup).forEach(([sid,items])=>{ const po={ id:'po'+now.toString(36)+Math.random().toString(36).slice(2,4), no:erpNo('PO'), supplierId:sid, at:now, items, vat:VAT_DEFAULT, status:'draft', note:t('po_for',{no:x.no}), payments:[], expectedAt:now+7*DAYMS, receivedAt:null, createdBy:S.userId, ticketId:x.id }; DB.purchases.unshift(po); nos.push(po.no); });
  x.wh.poNos=(x.wh.poNos||[]).concat(nos); if(!openPause(x)){ x.slaPauses=x.slaPauses||[]; x.slaPauses.push({reason:'wait_parts',note:nos.join(', '),from:now,to:null,by:S.userId,auto:1}); }
  x.history.push({at:now,by:S.userId,action:'po_created',from:null,to:null,note:nos.join(', ')}); notify({toRole:'manager',key:'n_po_req',vars:{no:x.no,p:nos.join(', ')},ticketId:x.id});
  save(); rerender(); toast(t('toast_po_req',{p:nos.join(', ')}),'ok'); };

/* ---------- 10. Xuất kho: ghi giá vốn, chặn khi chưa đặt cọc, mở lại SLA ---------- */
const _whGoD=A.whGo; A.whGo=el=>{ const x=ticketById(el.dataset.id); const c=x&&x.svcId&&svcById(x.svcId);
  if(el.dataset.to==='issued'&&c&&!c.depMet){ if(!depOk(c)){ toast(t('err_dep_first',{a:money(depNeed(c)-docPaid(c))}),'bad'); return; } if(Number(c.depositPct)>0) c.depMet=1; }
  const before=x&&x.wh&&x.wh.status; if(x&&x.wh&&el.dataset.to==='issued') x.wh.parts.forEach(p=>{ const s=stockBy(p.pn); p.cost=s?s.cost:0; });
  const r=_whGoD(el); if(x&&x.wh&&before!=='issued'&&x.wh.status==='issued'){ const op=openPause(x); if(op&&op.reason==='wait_parts'&&op.auto){ op.to=Date.now(); save(); rerender(); } } return r; };

/* ---------- 11. Hoàn tất sửa: đối chiếu linh kiện thực tế với số đã xuất ---------- */
function issuedParts(x){ const m={}; [x.wh].concat(x.whHist||[]).filter(w=>w&&w.status==='issued').forEach(w=>w.parts.forEach(p=>{ m[p.pn]=(m[p.pn]||0)+p.qty; })); return m; }
const _wfRec=A.wf; A.wf=(el,ev)=>{ const op=el.dataset.op; const x=ticketById(el.dataset.id);
  if(op==='toTesting'&&x){ if(x.extra&&['mgr','quote','sent'].includes(x.extra.status)){ toast(t('err_extra_open'),'bad'); return; }
    if(x.wh&&!['issued','cancelled'].includes(x.wh.status)){ toast(t('err_wh_not_issued'),'bad'); return; }
    const st=tdState(x.id); const used={}; ((st.rp&&st.rp.parts)||x.parts||[]).filter(p=>p.pn&&p.qty>0).forEach(p=>{ used[p.pn]=(used[p.pn]||0)+Number(p.qty); });
    if(x.wh||x.whHist){ const iss=issuedParts(x); const over=Object.keys(used).filter(pn=>used[pn]>(iss[pn]||0)); if(over.length){ toast(t('err_used_over',{p:over.map(pn=>`${pn} (${used[pn]}/${iss[pn]||0})`).join(', ')}),'bad'); return; } }
    if(S._proofOK==='repair'){ const r=_wfRec(el,ev); if(x.status==='testing'&&(x.wh||x.whHist)) makeReturn(x,Object.entries(used).map(([pn,qty])=>({pn,qty})),false); return r; } }
  return _wfRec(el,ev); };
function makeReturn(x,used,all){ const iss=issuedParts(x); const usedM={}; used.forEach(p=>{ usedM[p.pn]=(usedM[p.pn]||0)+p.qty; });
  const back=Object.entries(iss).map(([pn,q])=>({pn,qty:all?q:q-(usedM[pn]||0)})).filter(p=>p.qty>0); const scrap=all?[]:used.filter(p=>p.qty>0).map(p=>({pn:p.pn,qty:p.qty}));
  if(!back.length&&!scrap.length) return; x.ret={ no:erpNo('NT'), status:'new', back, scrap, at:Date.now(), by:S.userId };
  notify({toRole:'warehouse',key:'n_ret_new',vars:{no:x.no},ticketId:x.id}); }
function retBox(x){ const u=me(); if(!u||isExternal(u)||!x.ret) return ''; const r=x.ret; const tbl=(rows,lbl,ico)=>rows.length?`<div class="lbl" style="margin:4px 0 6px">${ic(ico,13)} ${lbl}</div><div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl compact"><thead><tr><th>${t('part_no')}</th><th>${t('part_name')}</th><th class="r">${t('qty')}</th></tr></thead><tbody>${rows.map(p=>`<tr><td class="mono">${esc(p.pn)}</td><td>${esc(partName(p.pn))}</td><td class="r num">${p.qty}</td></tr>`).join('')}</tbody></table></div>`:'';
  const act=r.status==='done'?`<span class="hint">${t('ret_done',{u:esc(uname(r.doneBy)),d:fmtDT(r.doneAt)})}</span>`:can('stock_move')?`<button class="btn primary" data-a="retDone" data-id="${x.id}">${ic('download',15)} ${t('ret_confirm')}</button>`:`<span class="hint">${t('ret_wait')}</span>`;
  return `<section class="card action-card"><div class="card-h"><h3 style="color:var(--accent-ink)">${ic('download',16)} ${t('ret_title')} <span class="mono" style="font-weight:500;color:var(--ink-2)">${r.no}</span></h3><span class="kst ${r.status==='done'?'k-ok':'k-warn'}">${t('ret_st_'+r.status)}</span></div>
    <div class="card-b" style="display:flex;flex-direction:column;gap:10px">${tbl(r.back,t('ret_back'),'refresh')}${tbl(r.scrap,t('ret_scrap'),'trash')}<div class="row" style="gap:8px">${act}</div></div></section>`; }
A.retDone = el => { const x=ticketById(el.dataset.id); const r=x&&x.ret; if(!r||r.status==='done') return; const c=x.svcId&&svcById(x.svcId); const ref=c?{kind:'svc',id:c.id}:{kind:'ticket',id:x.id};
  r.back.forEach(p=>{ const s=stockBy(p.pn); if(s){ s.qty+=p.qty; logMove('in',p.pn,p.qty,ref,t('ret_mv_note',{no:x.no})); } });
  DB.scrap=DB.scrap||[]; r.scrap.forEach(p=>DB.scrap.unshift({ id:'sc'+Date.now().toString(36)+Math.random().toString(36).slice(2,4), pn:p.pn, qty:p.qty, ticketId:x.id, sn:(x.products[0]||{}).sn||'', at:Date.now(), by:S.userId, state:'hold' }));
  r.status='done'; r.doneAt=Date.now(); r.doneBy=S.userId; x.history.push({at:r.doneAt,by:S.userId,action:'ret_done',from:null,to:null,note:r.no}); save(); rerender(); toast(t('toast_ret'),'ok'); };
/* tab "Xác linh kiện" trong Kho */
const SCRAP_ST=['hold','rma','closed','disposed'];
function scrapView(f){ const arr=(DB.scrap||[]).filter(s=>!f.q||(s.pn+' '+partName(s.pn)+' '+((ticketById(s.ticketId)||{}).no||'')).toLowerCase().includes(f.q.toLowerCase()));
  const tools=`<div class="row grow">${searchBox('stk-q','stk.q',f.q)}</div>`;
  const body=arr.length?`<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('item_code')}</th><th>${t('item_name')}</th><th class="r">${t('qty_l')}</th><th>${t('sc_from')}</th><th>${t('doc_date')}</th><th>${t('created_by_l')}</th><th>${t('status')}</th></tr></thead><tbody>${arr.map(s=>`<tr><td class="mono">${esc(s.pn)}</td><td>${esc(partName(s.pn))}</td><td class="r num">${s.qty}</td><td><button class="link-btn mono" data-a="goTicket" data-id="${s.ticketId}">${esc((ticketById(s.ticketId)||{}).no||'')}</button><br><small class="muted mono">${esc(s.sn)}</small></td><td class="num">${fmtD(s.at)}</td><td>${esc(uname(s.by))}</td><td class="nowrap">${s.state==='hold'&&can('stock_move')?`<select class="select sm" style="width:auto" data-id="${s.id}" data-chg="scrapSet">${['hold','rma','disposed'].map(k=>`<option value="${k}" ${s.state===k?'selected':''}>${t('scs_'+k)}</option>`).join('')}</select>`:`<span class="kst ${s.state==='rma'?'k-blue':s.state==='closed'?'k-ok':''}">${t('scs_'+s.state)}</span>${s.claimId?` <button class="link-btn mono" data-a="clOpen" data-id="${s.claimId}">${esc((claimById(s.claimId)||{}).no||'')}</button>`:''}`}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${t('sc_empty')}</div>`;
  return {tools,body}; }
A.scrapSet = el => { const s=(DB.scrap||[]).find(z=>z.id===el.dataset.id); if(s){ s.state=el.value; s.stateAt=Date.now(); save(); rerender(); } };

/* ---------- 12. Giá vốn & lãi gộp từng phiếu ---------- */
function jobCost(x){ let parts=0; [x.wh].concat(x.whHist||[]).filter(w=>w&&w.status==='issued').forEach(w=>w.parts.forEach(p=>{ const s=stockBy(p.pn); parts+=(p.cost!=null?p.cost:(s?s.cost:0))*p.qty; }));
  if(x.ret&&x.ret.status==='done') x.ret.back.forEach(p=>{ const s=stockBy(p.pn); parts-=(s?s.cost:0)*p.qty; });
  if(!x.wh&&!x.whHist) (x.parts||[]).forEach(p=>{ const s=stockBy(p.pn); parts+=(s?s.cost:0)*(p.qty||1); });
  const exp=(DB.expenses||[]).filter(e=>e.ticketId===x.id&&['approved','paid'].includes(e.status)).reduce((s,e)=>s+(Number(e.amount)||0),0);
  const c=x.svcId&&svcById(x.svcId); const rev=c&&c.status!=='cancelled'?docSubtotal(c)-docDiscount(c):0; return { parts:Math.max(0,parts), exp, cost:Math.max(0,parts)+exp, rev, profit:rev-Math.max(0,parts)-exp }; }
function costBox(x){ const u=me(); if(!u||!(isBossRole(u)||canFinance(u))) return ''; const k=jobCost(x); if(!k.rev&&!k.cost) return ''; const pct=k.rev?Math.round(k.profit/k.rev*100):null;
  return `<section class="card"><div class="card-h"><h3>${ic('chart',16)} ${t('cost_title')}</h3><span class="hint">${t('cost_hint')}</span></div><div class="card-b"><div class="cost-grid">
    <div><span>${t('cost_rev')}</span><b>${money(k.rev)}</b></div><div><span>${t('cost_parts')}</span><b>${money(k.parts)}</b></div><div><span>${t('cost_exp')}</span><b>${money(k.exp)}</b></div>
    <div class="${k.profit<0?'neg':'pos'}"><span>${t('cost_profit')}</span><b>${money(k.profit)}${pct!=null?` <small>(${pct}%)</small>`:''}</b></div></div></div></section>`; }

document.addEventListener('change', ev=>{ const a=ev.target&&ev.target.dataset&&ev.target.dataset.chg; if(a&&A[a]) A[a](ev.target); });

/* ---------- 13. Báo cáo: lãi gộp, sửa lại, không sửa được ---------- */
const _viewReportsP=viewReports; viewReports=function(){ let h=_viewReportsP(); const f=perState('rp2'); const r=perRange(f); const inR=ts=>ts&&ts>=r.from&&ts<r.to;
  const all=(DB.tickets||[]).filter(x=>x.status!=='draft'); const deliv=all.filter(x=>inR(tkDoneAt(x)));
  const ks=deliv.map(x=>({x,k:jobCost(x)})).filter(z=>z.k.rev||z.k.cost); const rev=ks.reduce((s,z)=>s+z.k.rev,0), cost=ks.reduce((s,z)=>s+z.k.cost,0), pr=rev-cost;
  const recv=all.filter(x=>inR(x.createdAt)); const rw=recv.filter(x=>reworkOf(x)).length; const ur=all.filter(x=>x.unrepairable&&inR(x.unrepairable.at)).length;
  const top=ks.slice().sort((a,b)=>b.k.profit-a.k.profit); const rowsH=arr=>arr.map(z=>`<tr data-a="goTicket" data-id="${z.x.id}" style="cursor:pointer"><td class="mono">${esc(z.x.no)}</td><td>${esc(z.x.company||custName(z.x.customerId))}</td><td class="r num">${money(z.k.rev)}</td><td class="r num">${money(z.k.cost)}</td><td class="r num" style="color:${z.k.profit<0?'var(--bad)':'var(--ok)'};font-weight:600">${money(z.k.profit)}</td></tr>`).join('');
  const card=`<div class="card full"><div class="card-h"><h3>${t('rp3_profit')}</h3><span class="hint">${t('rp3_profit_hint')}</span></div><div class="card-b">
    <div class="cost-grid" style="margin-bottom:14px"><div><span>${t('cost_rev')}</span><b>${money(rev)}</b></div><div><span>${t('rp3_cost')}</span><b>${money(cost)}</b></div><div class="${pr<0?'neg':'pos'}"><span>${t('cost_profit')}</span><b>${money(pr)}${rev?` <small>(${Math.round(pr/rev*100)}%)</small>`:''}</b></div><div><span>${t('rp3_quality')}</span><b>${t('rp3_quality_v',{a:rw,b:ur})}</b></div></div>
    ${ks.length?`<div class="table-wrap"><table class="tbl compact"><thead><tr><th>${t('ticket')}</th><th>${t('customer')}</th><th class="r">${t('cost_rev')}</th><th class="r">${t('rp3_cost')}</th><th class="r">${t('cost_profit')}</th></tr></thead><tbody>${rowsH(top.slice(0,5))}${top.length>5?`<tr><td colspan="5" class="muted" style="text-align:center">···</td></tr>${rowsH(top.slice(-Math.min(3,top.length-5)))}`:''}</tbody></table></div>`:`<div class="muted">${t('no_data')}</div>`}</div></div>`;
  const i=h.lastIndexOf('</div>'); return h.slice(0,i)+card+h.slice(i); };

/* ---------- 14. Việc hôm nay: bổ sung các việc mới ---------- */
const _todayTasksP=todayTasks; todayTasks=function(u){ const L=_todayTasksP(u); const add=(key,list)=>{ if(list.length) L.push({key,n:list.length,items:list}); }; const tk=DB.tickets||[]; const svcOf=x=>x.svcId&&svcById(x.svcId);
  if(['manager','dev'].includes(u.role)){ add('td_ex_mgr',tk.filter(x=>x.extra&&x.extra.status==='mgr')); add('td_q_appr',tk.filter(x=>{ const c=svcOf(x); return c&&c.quoteReq&&!quoteApproved(c)&&quoteOpen(c); })); add('td_po_draft',(DB.purchases||[]).filter(p=>p.status==='draft'&&p.ticketId).map(p=>({id:p.ticketId,no:p.no,company:t('po_for',{no:(ticketById(p.ticketId)||{}).no||''})}))); }
  if(['manager','dev','accountant','warehouse'].includes(u.role)){ add('td_ex_quote',tk.filter(x=>x.extra&&x.extra.status==='quote')); add('td_q_expiring',tk.filter(x=>{ const c=svcOf(x); return c&&c.status==='sent'&&!c.agreedAt&&quoteExpiry(c)-Date.now()<2*DAYMS; })); }
  if(u.role==='warehouse') add('td_ret',tk.filter(x=>x.ret&&x.ret.status==='new'));
  if(['accountant','manager','dev'].includes(u.role)){ add('td_dep',tk.filter(x=>{ const c=svcOf(x); return c&&c.agreedAt&&!depOk(c)&&isOpen(x); })); add('td_storage',tk.filter(x=>readyDays(x)>STORE_FREE_DAYS)); }
  return L; };

/* ---------- 15. Lịch sử / hình chứng từ: các bước mới ---------- */
PROOF_STAGES.push('unrepairable');
Object.assign(DICT.vi,{
  pf_stage_intake:'Tiếp nhận', pf_title_intake:'Hình ảnh tiếp nhận máy', pf_hint_intake:'Chụp toàn thân máy, tem serial, các vết trầy móp, phụ kiện kèm theo trước khi nhận.', pf_confirm_intake:'Xác nhận đã nhận máy', h_proof_intake:'tải hình tiếp nhận', pf_stage_unrepairable:'Không sửa được',
  al_rework:'Máy quay lại trong thời gian bảo hành sửa chữa: phiếu trước <button class="link-btn mono" data-a="goTicket" data-id="{id}">{no}</button> (KTV {k}) giao ngày {d}, bảo hành đến {e}.', al_unrep:'Không sửa được: {r}. {n}',
  al_q_expired:'Báo giá đã hết hiệu lực từ {d}. Cần gia hạn hoặc gửi lại trước khi ghi nhận khách đồng ý.', al_q_soon:'Báo giá sắp hết hiệu lực ({d}). Nên gọi lại khách.', al_q_wait_mgr:'Báo giá vượt hạn mức, đang chờ quản lý duyệt trước khi gửi khách.',
  al_storage:'Máy đã chờ giao {n} ngày (miễn phí {f} ngày). Phí lưu kho tạm tính: {a}.', al_extra_mgr:'Có phát sinh linh kiện đang chờ quản lý duyệt.', al_extra_quote:'Phát sinh đã duyệt, đang chờ làm báo giá bổ sung.', al_extra_sent:'Đã gửi báo giá bổ sung, đang chờ khách đồng ý.',
  qb_appr:'Duyệt báo giá', qb_no_need:'Không cần duyệt', qb_ok:'Đã duyệt bởi {u}', qb_wait:'Đang chờ quản lý duyệt', qb_need:'Cần quản lý duyệt (trên {l} hoặc giảm giá trên {d}%)', qb_approve:'Duyệt báo giá',
  qb_valid:'Hiệu lực', qb_until:'Đến hết {d}', qb_expired:'Hết hiệu lực từ {d}', qb_from_send:'{n} ngày kể từ khi gửi khách', qb_extend:'Gia hạn',
  qb_dep:'Đặt cọc', qb_dep_none:'Không cọc', qb_dep_amt:'cần thu {a}', qb_dep_ok:'Đã cọc đủ', qb_dep_wait:'Còn thiếu {a}', qb_dep_take:'Thu đặt cọc', qb_dep_note:'Đặt cọc',
  toast_q_ok:'Đã duyệt báo giá', toast_q_ext:'Đã gia hạn báo giá đến {d}', toast_q_req:'Báo giá vượt hạn mức, đã gửi quản lý duyệt', err_q_expired:'Báo giá đã hết hiệu lực, hãy gia hạn hoặc gửi lại', err_q_unapproved:'Báo giá vượt hạn mức chưa được quản lý duyệt',
  n_q_req:'{no}: báo giá {a} cần duyệt trước khi gửi khách', n_q_ok:'{no}: báo giá đã được duyệt, có thể gửi khách', n_dep_ok:'{no}: khách đã đặt cọc, có thể xuất kho',
  storage_add:'Tính phí lưu kho', storage_line:'Phí lưu kho {n} ngày (sau {f} ngày miễn phí)', toast_storage:'Đã thêm phí lưu kho {a} vào hợp đồng',
  ex_btn:'Phát sinh', ex_title:'Phát sinh linh kiện', ex_hint:'Dùng khi đang sửa phát hiện thêm lỗi cần thay linh kiện ngoài báo giá. Quản lý duyệt → làm báo giá bổ sung → khách đồng ý → kho xuất thêm.', ex_reason:'Lý do phát sinh', ex_reason_ph:'VD: thay IGBT xong, kiểm tra thấy board driver cháy', ex_submit:'Gửi quản lý duyệt', ex_need_part:'Cần ít nhất 1 linh kiện',
  ex_box:'Phát sinh / báo giá bổ sung', ex_approve:'Duyệt phát sinh', ex_send:'Gửi báo giá bổ sung cho khách', ex_cust_ok:'Khách đồng ý phần bổ sung', ex_cust_no:'Khách không đồng ý', ex_total:'Cộng phát sinh (chưa VAT)', ex_warranty_free:'phiếu bảo hành, không tính phí',
  ex_wait_mgr:'Chờ quản lý duyệt.', ex_wait_quote:'Chờ Quản lý / Kế toán / Thủ kho làm báo giá bổ sung.', ex_wait_cust:'Chờ khách đồng ý.',
  exs_mgr:'Chờ duyệt', exs_quote:'Chờ báo giá', exs_sent:'Chờ khách', exs_agreed:'Khách đồng ý', exs_declined:'Khách từ chối', exs_rejected:'Không duyệt',
  toast_ex_req:'Đã gửi phát sinh cho quản lý duyệt', toast_ex_quote:'Đã duyệt, đã báo làm báo giá bổ sung', toast_ex_sent:'Đã gửi báo giá bổ sung', toast_ex_agreed:'Đã cộng vào hợp đồng và tạo yêu cầu xuất kho', toast_ex_declined:'Đã ghi nhận khách không đồng ý', toast_ex_rejected:'Đã không duyệt phát sinh',
  n_ex_req:'{no}: phát sinh linh kiện chờ duyệt', n_ex_quote:'{no}: phát sinh đã duyệt, cần báo giá bổ sung', n_ex_cust:'{no}: có báo giá bổ sung chờ quý khách đồng ý', n_ex_ok:'{no}: phát sinh đã được khách đồng ý, chờ kho xuất', n_ex_declined:'{no}: khách không đồng ý phần phát sinh', n_ex_rej:'{no}: quản lý không duyệt phát sinh',
  h_extra_req:'đề nghị phát sinh linh kiện', h_extra_quote:'duyệt phát sinh', h_extra_sent:'gửi báo giá bổ sung', h_extra_agreed:'khách đồng ý phát sinh', h_extra_declined:'khách từ chối phát sinh', h_extra_rejected:'không duyệt phát sinh', h_quote_approved:'duyệt báo giá', h_quote_extended:'gia hạn báo giá', h_storage_fee:'tính phí lưu kho', h_po_created:'tạo đề nghị mua hàng', h_ret_done:'kho nhận trả linh kiện & xác', h_unrepairable:'xác nhận không sửa được',
  ur_btn:'Không sửa được', ur_title:'Xác nhận không sửa được', ur_hint:'Máy sẽ được trả lại cho khách. Hợp đồng chuyển sang chỉ thu phí kiểm tra (nếu có); linh kiện đã xuất sẽ được yêu cầu nhập lại kho.', ur_reason:'Lý do', ur_note:'Mô tả tình trạng', ur_fee:'Phí kiểm tra (đ)', ur_photos:'Hình ảnh tình trạng', ur_confirm:'Xác nhận không sửa được', ur_fee_line:'Phí kiểm tra, chẩn đoán (không sửa được)',
  ur_no_parts:'Không có linh kiện thay thế', ur_too_damaged:'Hư hỏng quá nặng', ur_not_economic:'Chi phí sửa không kinh tế', ur_customer_cancel:'Khách hủy yêu cầu', ur_other:'Lý do khác', toast_unrep:'Đã ghi nhận không sửa được, chuyển trả máy', n_unrep:'{no}: kỹ thuật xác nhận không sửa được', n_unrep_cust:'{no}: thiết bị không thể sửa chữa, SGE sẽ liên hệ trả máy',
  flow_unrep:'Không sửa được', flow_unrep_sub:'Không sửa được, trả máy',
  avail:'Khả dụng', reserved_l:'Đang giữ', wh_st_cancelled:'Đã hủy', wh_extra:'Phát sinh', wh_po_btn:'Tạo đề nghị mua hàng thiếu', wh_po_made:'Đã tạo đơn mua: {p}', wh_dep_wait:'Chờ khách đặt cọc {a} mới được xuất kho.', err_dep_first:'Khách chưa đặt cọc đủ (còn thiếu {a})', po_for:'Mua cho phiếu {no}', toast_po_req:'Đã tạo đơn mua nháp {p}, phiếu chuyển chờ linh kiện', n_po_req:'{no}: thiếu linh kiện, đã tạo đơn mua {p} chờ duyệt',
  err_extra_open:'Còn phát sinh chưa xử lý xong', err_wh_not_issued:'Kho chưa xuất đủ linh kiện cho phiếu này', err_used_over:'Linh kiện thay vượt số kho đã xuất: {p}. Hãy tạo phát sinh.',
  ret_title:'Nhập trả kho sau sửa chữa', ret_back:'Linh kiện xuất dư — nhập lại kho', ret_scrap:'Xác linh kiện cũ tháo ra — thu hồi', ret_confirm:'Xác nhận đã nhận về kho', ret_wait:'Chờ thủ kho xác nhận nhận về.', ret_done:'Đã nhận bởi {u} lúc {d}', ret_st_new:'Chờ nhận', ret_st_done:'Đã nhận', ret_mv_note:'Nhập trả dư từ {no}', toast_ret:'Đã nhập lại kho và thu hồi xác linh kiện', n_ret_new:'{no}: cần nhận lại linh kiện dư và xác linh kiện cũ',
  st_scrap:'Xác linh kiện', sc_from:'Từ phiếu', sc_empty:'Chưa có xác linh kiện thu hồi.', scs_hold:'Đang lưu', scs_rma:'Gửi NCC đổi bảo hành', scs_disposed:'Đã thanh lý',
  cost_title:'Giá vốn & lãi gộp', cost_hint:'Chỉ quản lý / kế toán thấy', cost_rev:'Doanh thu (chưa VAT)', cost_parts:'Giá vốn linh kiện', cost_exp:'Chi phí phát sinh', cost_profit:'Lãi gộp',
  rp3_profit:'Lãi gộp sửa chữa', rp3_profit_hint:'các phiếu đã giao trả trong kỳ', rp3_cost:'Giá vốn + chi phí', rp3_quality:'Chất lượng', rp3_quality_v:'{a} máy sửa lại · {b} không sửa được', kpi_rework:'Sửa lại',
  td_ex_mgr:'Phát sinh chờ duyệt', td_q_appr:'Báo giá vượt hạn mức chờ duyệt', td_po_draft:'Đơn mua cho phiếu sửa chờ duyệt', td_ex_quote:'Phát sinh cần báo giá bổ sung', td_q_expiring:'Báo giá sắp / đã hết hiệu lực', td_ret:'Linh kiện dư & xác cần nhận về', td_dep:'Phiếu chờ thu đặt cọc', td_storage:'Máy chờ giao quá hạn lưu kho' });
Object.assign(DICT.en,{
  pf_stage_intake:'Intake', pf_title_intake:'Intake photos', pf_hint_intake:'Photograph the whole unit, serial label, scratches/dents and accessories before accepting.', pf_confirm_intake:'Confirm received', h_proof_intake:'uploaded intake photos', pf_stage_unrepairable:'Unrepairable',
  al_rework:'Returned within repair warranty: previous job <button class="link-btn mono" data-a="goTicket" data-id="{id}">{no}</button> (tech {k}) handed over {d}, warranty until {e}.', al_unrep:'Unrepairable: {r}. {n}',
  al_q_expired:'Quote expired on {d}. Extend or resend before recording acceptance.', al_q_soon:'Quote expires soon ({d}). Follow up with the customer.', al_q_wait_mgr:'Quote is above the limit and awaits manager approval.',
  al_storage:'Unit has waited {n} days for pickup ({f} free). Storage fee so far: {a}.', al_extra_mgr:'Extra parts request awaiting manager approval.', al_extra_quote:'Extra parts approved; supplementary quote needed.', al_extra_sent:'Supplementary quote sent; awaiting customer.',
  qb_appr:'Quote approval', qb_no_need:'Not required', qb_ok:'Approved by {u}', qb_wait:'Awaiting manager', qb_need:'Manager approval needed (over {l} or discount over {d}%)', qb_approve:'Approve quote',
  qb_valid:'Validity', qb_until:'Until {d}', qb_expired:'Expired on {d}', qb_from_send:'{n} days from sending', qb_extend:'Extend',
  qb_dep:'Deposit', qb_dep_none:'None', qb_dep_amt:'collect {a}', qb_dep_ok:'Deposit received', qb_dep_wait:'{a} outstanding', qb_dep_take:'Collect deposit', qb_dep_note:'Deposit',
  toast_q_ok:'Quote approved', toast_q_ext:'Quote extended to {d}', toast_q_req:'Quote over limit; sent to manager for approval', err_q_expired:'Quote has expired; extend or resend it', err_q_unapproved:'Quote over limit is not approved yet',
  n_q_req:'{no}: quote {a} needs approval before sending', n_q_ok:'{no}: quote approved, ready to send', n_dep_ok:'{no}: deposit received, parts can be issued',
  storage_add:'Add storage fee', storage_line:'Storage fee {n} days (after {f} free days)', toast_storage:'Storage fee {a} added to the contract',
  ex_btn:'Extra parts', ex_title:'Extra parts request', ex_hint:'Use when repair reveals more faults needing parts beyond the quote. Manager approves → supplementary quote → customer agrees → warehouse issues.', ex_reason:'Reason', ex_reason_ph:'e.g. after replacing the IGBT, the driver board is also burnt', ex_submit:'Send for approval', ex_need_part:'Add at least one part',
  ex_box:'Extras / supplementary quote', ex_approve:'Approve extras', ex_send:'Send supplementary quote', ex_cust_ok:'Customer agreed', ex_cust_no:'Customer declined', ex_total:'Extras subtotal (ex VAT)', ex_warranty_free:'warranty job, free of charge',
  ex_wait_mgr:'Awaiting manager.', ex_wait_quote:'Awaiting Manager / Accountant / Warehouse to quote.', ex_wait_cust:'Awaiting customer.',
  exs_mgr:'Pending', exs_quote:'To quote', exs_sent:'With customer', exs_agreed:'Agreed', exs_declined:'Declined', exs_rejected:'Rejected',
  toast_ex_req:'Extras sent for approval', toast_ex_quote:'Approved; quoting requested', toast_ex_sent:'Supplementary quote sent', toast_ex_agreed:'Added to contract; issue request created', toast_ex_declined:'Customer declined recorded', toast_ex_rejected:'Extras rejected',
  n_ex_req:'{no}: extra parts awaiting approval', n_ex_quote:'{no}: extras approved, supplementary quote needed', n_ex_cust:'{no}: a supplementary quote awaits your approval', n_ex_ok:'{no}: customer agreed to extras, awaiting issue', n_ex_declined:'{no}: customer declined the extras', n_ex_rej:'{no}: manager rejected the extras',
  h_extra_req:'requested extra parts', h_extra_quote:'approved extras', h_extra_sent:'sent supplementary quote', h_extra_agreed:'customer agreed extras', h_extra_declined:'customer declined extras', h_extra_rejected:'rejected extras', h_quote_approved:'approved the quote', h_quote_extended:'extended the quote', h_storage_fee:'added storage fee', h_po_created:'created purchase request', h_ret_done:'warehouse received returns & scrap', h_unrepairable:'marked unrepairable',
  ur_btn:'Unrepairable', ur_title:'Mark as unrepairable', ur_hint:'The unit will be returned. The contract keeps only the inspection fee (if any); issued parts will be requested back to stock.', ur_reason:'Reason', ur_note:'Condition notes', ur_fee:'Inspection fee (₫)', ur_photos:'Condition photos', ur_confirm:'Confirm unrepairable', ur_fee_line:'Inspection & diagnosis fee (unrepairable)',
  ur_no_parts:'No replacement parts', ur_too_damaged:'Damage too severe', ur_not_economic:'Repair not economical', ur_customer_cancel:'Customer cancelled', ur_other:'Other', toast_unrep:'Marked unrepairable; returning the unit', n_unrep:'{no}: technician marked unrepairable', n_unrep_cust:'{no}: the unit cannot be repaired; SGE will arrange return',
  flow_unrep:'Unrepairable', flow_unrep_sub:'Unrepairable, returning',
  avail:'Available', reserved_l:'Reserved', wh_st_cancelled:'Cancelled', wh_extra:'Extras', wh_po_btn:'Create purchase for shortage', wh_po_made:'Purchase orders: {p}', wh_dep_wait:'Waiting for the {a} deposit before issuing.', err_dep_first:'Deposit not fully paid ({a} outstanding)', po_for:'For job {no}', toast_po_req:'Draft PO {p} created; job waiting for parts', n_po_req:'{no}: parts short, PO {p} awaiting approval',
  err_extra_open:'An extras request is still open', err_wh_not_issued:'The warehouse has not issued all parts yet', err_used_over:'Parts used exceed parts issued: {p}. Raise an extras request.',
  ret_title:'Returns to stock after repair', ret_back:'Unused parts — back to stock', ret_scrap:'Old parts removed — scrap recovery', ret_confirm:'Confirm received', ret_wait:'Waiting for the warehouse to confirm.', ret_done:'Received by {u} at {d}', ret_st_new:'Pending', ret_st_done:'Received', ret_mv_note:'Unused return from {no}', toast_ret:'Returned to stock and scrap recorded', n_ret_new:'{no}: receive unused parts and old parts',
  st_scrap:'Scrap parts', sc_from:'From job', sc_empty:'No recovered scrap yet.', scs_hold:'In storage', scs_rma:'Sent to supplier RMA', scs_disposed:'Disposed',
  cost_title:'Cost & gross profit', cost_hint:'Managers / accounting only', cost_rev:'Revenue (ex VAT)', cost_parts:'Parts cost', cost_exp:'Job expenses', cost_profit:'Gross profit',
  rp3_profit:'Repair gross profit', rp3_profit_hint:'jobs returned in the period', rp3_cost:'Cost + expenses', rp3_quality:'Quality', rp3_quality_v:'{a} reworks · {b} unrepairable', kpi_rework:'Rework',
  td_ex_mgr:'Extras awaiting approval', td_q_appr:'Quotes over limit awaiting approval', td_po_draft:'Job purchase orders awaiting approval', td_ex_quote:'Extras needing a quote', td_q_expiring:'Quotes expiring / expired', td_ret:'Unused parts & scrap to receive', td_dep:'Jobs awaiting deposit', td_storage:'Units past free storage' });

/* ===================================================================
   HOÀN THIỆN GIAO DIỆN: Việc cần làm (gộp Bàn làm việc + Việc hôm nay),
   tiến trình mini trong danh sách phiếu, yêu cầu xuất kho trong Kho, thẻ kho
   =================================================================== */
function miniFlow(x){ const cur=stepOf(x); const n=STEPS.length; const fin=['delivered','invoiced','paid','closed'].includes(x.status); const bad=['rejected','cancelled'].includes(x.status)||!!x.unrepairable||x.status==='return_pending';
  const i=fin?n:Math.max(0,(cur??0)); const pct=fin?100:Math.round((i+1)/n*100);
  return `<div class="mflow ${bad?'bad':fin?'fin':''}" title="${t('flow_title')}: ${fin?t('flow_done'):(cur!=null?t('step_'+STEPS[cur]):'—')}"><div class="mf-bar"><i style="width:${pct}%"></i></div><small class="num">${fin?'✓':`${Math.min(i+1,n)}/${n}`}</small></div>`; }
/* ---- yêu cầu xuất kho / nhập trả: danh sách gộp ---- */
function whReqAll(){ const out=[]; (DB.tickets||[]).forEach(x=>{ [x.wh].concat(x.whHist||[]).filter(Boolean).forEach(w=>out.push({kind:'out',x,w,no:w.no,st:w.status,at:w.createdAt,parts:w.parts,open:['new','pending','approved'].includes(w.status)}));
  if(x.ret) out.push({kind:'ret',x,w:x.ret,no:x.ret.no,st:x.ret.status==='done'?'done':'ret_new',at:x.ret.at,parts:x.ret.back.concat(x.ret.scrap),open:x.ret.status==='new'}); }); return out.sort((a,b)=>(b.open-a.open)||(b.at-a.at)); }
const REQ_PILL={ new:'k-warn', pending:'k-blue', approved:'k-blue', issued:'k-ok', cancelled:'k-bad', ret_new:'k-warn', done:'k-ok' };
function reqAct(rq){ const x=rq.x; if(rq.kind==='ret') return rq.st==='ret_new'&&can('stock_move')?`<button class="btn sm primary" data-a="retDone" data-id="${x.id}">${t('ret_confirm')}</button>`:'';
  if(x.wh!==rq.w) return ''; if(rq.st==='new'&&can('stock_move')) return `<button class="btn sm primary" data-a="whGo" data-id="${x.id}" data-to="pending">${t('wh_act_receive')}</button>`;
  if(rq.st==='pending'&&can('ticket_approve')) return `<button class="btn sm okb" data-a="whGo" data-id="${x.id}" data-to="approved">${t('wh_act_approve')}</button>`;
  if(rq.st==='approved'&&can('stock_move')) return `<button class="btn sm primary" data-a="whGo" data-id="${x.id}" data-to="issued">${t('wh_act_issue')}</button>`; return ''; }
function reqView(f){ const st=f.rst||'open'; let arr=whReqAll(); if(st==='open') arr=arr.filter(r=>r.open); else if(st!=='all') arr=arr.filter(r=>r.kind===st);
  if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(r=>(r.no+' '+r.x.no+' '+(r.x.company||'')+' '+r.parts.map(p=>p.pn+' '+partName(p.pn)).join(' ')).toLowerCase().includes(q)); }
  const tools=`<div class="row grow">${searchBox('stk-q','stk.q',f.q)}<div class="seg">${['open','out','ret','all'].map(k=>`<button class="${st===k?'on':''}" data-a="reqF" data-k="${k}">${t('rq_f_'+k)}</button>`).join('')}</div></div>`;
  const body=arr.length?`<div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('rq_no')}</th><th>${t('rq_kind')}</th><th>${t('ticket')}</th><th>${t('rq_items')}</th><th>${t('doc_date')}</th><th>${t('status')}</th><th></th></tr></thead><tbody>${arr.map(rq=>`<tr><td data-l="${t('rq_no')}" class="mono nowrap">${esc(rq.no)}</td><td data-l="${t('rq_kind')}">${t('rq_k_'+rq.kind)}${rq.w.extra?` <span class="kst k-blue">${t('wh_extra')}</span>`:''}</td><td data-l="${t('ticket')}"><button class="link-btn mono" data-a="goTicket" data-id="${rq.x.id}">${esc(rq.x.no)}</button><br><small class="muted">${esc(rq.x.company||'')}</small></td>
    <td data-l="${t('rq_items')}">${rq.parts.map(p=>{ const s=stockBy(p.pn); const sh=rq.kind==='out'&&rq.open&&(!s||s.qty<p.qty); return `<div class="nowrap"><span class="mono">${esc(p.pn)}</span> ${esc(partName(p.pn))} ×${p.qty}${rq.kind==='out'&&rq.open?` <small style="color:${sh?'var(--bad)':'var(--muted)'}">(${t('on_hand')} ${fmtNum(s?s.qty:0)})</small>`:''}</div>`; }).join('')}</td>
    <td data-l="${t('doc_date')}" class="num nowrap">${fmtD(rq.at)}</td><td data-l="${t('status')}"><span class="kst ${REQ_PILL[rq.st]||''}">${rq.kind==='ret'?t(rq.st==='done'?'ret_st_done':'ret_st_new'):t('wh_st_'+rq.st)}</span></td><td data-l="" class="nowrap">${reqAct(rq)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${t('rq_empty')}</div>`;
  return {tools,body}; }
A.reqF = el => { S.ui.stk.rst=el.dataset.k; rerender(); };
A.stkReq = () => { S.ui.stk={tab:'req',q:'',cat:'',low:false,page:1,size:10,rst:'open'}; openTab('stock'); };
function whCard(x){ const rq=x.ret&&x.ret.status==='new'&&!(x.wh&&['new','pending','approved'].includes(x.wh.status)); const w=rq?x.ret:x.wh; const parts=rq?x.ret.back.concat(x.ret.scrap):x.wh.parts;
  const act=rq?`<button class="kc-act" data-a="retDone" data-id="${x.id}">${t('ret_confirm')} →</button>`:w.status==='new'?`<button class="kc-act" data-a="whGo" data-id="${x.id}" data-to="pending">${t('wh_act_receive')} →</button>`:w.status==='approved'?`<button class="kc-act" data-a="whGo" data-id="${x.id}" data-to="issued">${t('wh_act_issue')} →</button>`:`<span class="kc-act" style="cursor:default;color:var(--muted)">${t('wh_wait_approve')}</span>`;
  return `<article class="kc"><button class="kc-main" data-a="openTicket" data-id="${x.id}"><span class="kc-top"><span class="mono">${esc(w.no)}</span><span class="kst ${rq?'k-warn':REQ_PILL[w.status]}">${rq?t('rq_k_ret'):t('wh_st_'+w.status)}</span></span><b>${esc(x.no)} · ${esc(x.company||'')}</b><span class="kc-sub">${parts.map(p=>`${esc(p.pn)} ×${p.qty}${rq?'':` <span class="${((stockBy(p.pn)||{}).qty||0)<p.qty?'neg':'muted'}">(${t('on_hand')} ${fmtNum((stockBy(p.pn)||{}).qty||0)})</span>`}`).join('<br>')}</span></button>${act}</article>`; }

/* ---- Việc cần làm: 1 trang duy nhất cho mọi vai trò ---- */
const EXTRA_TODO_KEYS=['todo_pay_in','todo_pay_out','todo_po_recv','todo_so_confirm','todo_so_deliver','todo_feedback'];
const URGENT_KEYS=['td_overdue_mine','td_overdue_all','td_q_expiring','td_storage','td_ex_mgr','td_parts_approve','td_wh_approve','td_q_appr'];
function allTasks(u=me()){ if(!u) return []; const wf=isExternal(u)?[]:todayTasks(u).map(l=>({id:l.key,title:t(l.key),n:l.n,items:l.items,wf:1,urgent:URGENT_KEYS.includes(l.key)}));
  const ex=collectTodos(u).filter(g=>isExternal(u)||EXTRA_TODO_KEYS.includes(g.id)).map(g=>Object.assign({},g,{wf:0}));
  return wf.sort((a,b)=>(b.urgent-a.urgent)).concat(ex); }
todoTotal=function(u=me()){ return allTasks(u).reduce((s,g)=>s+g.n,0); };
function taskItem(x){ if(x.exp) return `<button class="mini-item" data-a="todayExp" data-no="${esc(x.no)}"><span class="t"><div><span class="mono">${esc(x.no)}</span> ${esc(x.title||'')}</div></span><b class="num">${money(x.amt||0)}</b></button>`;
  if(x.stock) return `<button class="mini-item" data-a="stkLow"><span class="t"><div><span class="mono">${esc(x.no)}</span> ${esc((stockBy(x.no)||{}).name||'')}</div></span><span class="muted num">${fmtNum((stockBy(x.no)||{}).qty||0)} / ${fmtNum((stockBy(x.no)||{}).min||0)}</span></button>`;
  const late=x.status&&isOpen(x)&&slaBreached(x);
  return `<button class="mini-item" data-a="openTicket" data-id="${x.id}"><span class="t"><div><span class="mono">${esc(x.no)}</span> ${esc(x.company||x.title||'')}</div>${late?`<small style="color:var(--bad);font-weight:600">${t('kpi_late')}</small>`:''}</span>${x.status?tkPill(x):''}</button>`; }
viewTodo=function(){ const u=me(); const G=allTasks(u); const f=S.ui.tdo||(S.ui.tdo={g:''}); const shown=f.g?G.filter(g=>g.id===f.g):G; const tot=G.reduce((s,g)=>s+g.n,0);
  const late=G.filter(g=>g.urgent).reduce((s,g)=>s+g.n,0); const mine=G.filter(g=>g.wf&&!g.urgent).reduce((s,g)=>s+g.n,0); const fin=G.filter(g=>!g.wf).reduce((s,g)=>s+g.n,0);
  return `<div class="page-head"><div><h1>${t('nav_tasks')}</h1><div class="sub">${t('tasks_sub',{d:fmtD(Date.now()),r:t('role_'+u.role)})}</div></div></div>
  <div class="stat-row task-stats"><div class="card stat"><div class="l">${t('tasks_total')}</div><div class="v">${fmtNum(tot)}</div></div><div class="card stat"><div class="l">${t('tasks_urgent')}</div><div class="v" style="color:${late?'var(--bad)':'inherit'}">${fmtNum(late)}</div></div><div class="card stat"><div class="l">${t('tasks_flow')}</div><div class="v" style="color:var(--blue)">${fmtNum(mine)}</div></div><div class="card stat"><div class="l">${t('tasks_fin')}</div><div class="v">${fmtNum(fin)}</div></div></div>
  ${G.length?`<div class="qtabs" style="margin-bottom:14px"><button class="qtab ${!f.g?'on':''}" data-a="tdoG" data-g="">${t('all')}<b>${tot}</b></button>${G.map(g=>`<button class="qtab ${f.g===g.id?'on':''} ${g.urgent?'urg':''}" data-a="tdoG" data-g="${g.id}">${esc(g.title)}<b>${g.n}</b></button>`).join('')}</div>`:''}
  ${shown.length?`<div class="today-grid">${shown.map(g=>`<section class="card today-card ${g.urgent?'urgent':g.wf?'flow':'fin'}"><div class="card-h"><h3>${esc(g.title)}</h3><span class="tcount">${g.n}</span></div><div class="card-b"><div class="mini-list">${g.wf?g.items.slice(0,8).map(taskItem).join(''):g.items.map(todoRow).join('')}${g.n>8&&g.wf?`<div class="muted" style="padding:6px 2px">+${g.n-8}</div>`:''}</div>${!g.wf&&g.all?`<button class="link-btn" style="margin-top:8px" data-a="todoGo" data-tab="${esc(g.all.tab)}" data-quick="${esc(g.all.quick||'')}" data-st="${esc(g.all.st||'')}" data-ftab="${esc(g.all.ftab||'')}" data-stab="${esc(g.all.stab||'')}" data-rst="${esc(g.all.rst||'')}" data-low="${esc(g.all.low||'')}">${t('todo_see_all',{n:g.n})} →</button>`:''}</div></section>`).join('')}</div>`
  :`<div class="card empty">${ic('check',28)}<p>${t('today_empty')}</p></div>`}`; };
A.tdoG = el => { (S.ui.tdo||(S.ui.tdo={})).g=el.dataset.g; rerender(); };
viewToday=function(){ return viewTodo(); };
['engineer','warehouse','accountant'].forEach(r=>{ const n=ROLE_NAV[r]; if(n&&!n.includes('todo')) n.splice(1,0,'todo'); });
const _navTasks=navItems; navItems=function(u=me()){ return _navTasks(u).map(n=>n.k==='todo'?Object.assign({},n,{l:t('nav_tasks')}):n.more?Object.assign({},n,{more:n.more.map(m=>m.k==='todo'?Object.assign({},m,{l:t('nav_tasks')}):m)}):n); };
const _tabTitleTasks=tabTitle; tabTitle=function(k){ if(k==='todo'||k==='today') return t('nav_tasks'); return _tabTitleTasks(k); };
const _tabAllowedTasks=tabAllowed; tabAllowed=function(k,u=me()){ if(k==='todo') return !!u; return _tabAllowedTasks(k,u); };
Object.assign(DICT.vi,{ nav_tasks:'Việc cần làm', tasks_sub:'{d} · Theo nhiệm vụ của {r}', tasks_total:'Tổng việc', tasks_urgent:'Gấp / quá hạn', tasks_flow:'Việc sửa chữa & kho', tasks_fin:'Thu chi, mua bán',
  flow_col:'Tiến trình', st_req:'Yêu cầu xuất kho', rq_f_open:'Đang chờ', rq_f_out:'Xuất kho', rq_f_ret:'Nhập trả', rq_f_all:'Tất cả', rq_no:'Số phiếu', rq_kind:'Loại', rq_items:'Mặt hàng', rq_k_out:'Xuất cho sửa chữa', rq_k_ret:'Nhập trả / thu xác', rq_empty:'Không có yêu cầu nào.', wh_req_open:'Yêu cầu kho đang chờ',
  ln_issue:'Yêu cầu xuất kho & nhập trả', ln_issue_e:'Không có yêu cầu nào đang chờ', ops_parts:'Chờ duyệt linh kiện', ops_cust:'Chờ khách đồng ý', ops_test:'Kiểm tra', ops_ready:'Chờ giao / trả máy', rma_title:'Đổi bảo hành với hãng (RMA)' });
Object.assign(DICT.en,{ nav_tasks:'To-do', tasks_sub:'{d} · For your {r} role', tasks_total:'Total', tasks_urgent:'Urgent / overdue', tasks_flow:'Repair & stock', tasks_fin:'Finance & trading',
  flow_col:'Progress', st_req:'Issue requests', rq_f_open:'Open', rq_f_out:'Issues', rq_f_ret:'Returns', rq_f_all:'All', rq_no:'No.', rq_kind:'Type', rq_items:'Items', rq_k_out:'Issue for repair', rq_k_ret:'Return / scrap', rq_empty:'No requests.', wh_req_open:'Open stock requests',
  ln_issue:'Issue requests & returns', ln_issue_e:'No open requests', ops_parts:'Parts approval', ops_cust:'Awaiting customer', ops_test:'Testing', ops_ready:'Ready / returning', rma_title:'Manufacturer warranty claims (RMA)' });

/* ===================================================================
   BẢO HÀNH HÃNG / NCC (thay RMA cũ): gửi xác linh kiện hoặc máy còn bảo hành hãng
   Tạo phiếu → Đã gửi hãng → Hãng đã nhận → Hoàn tất (đổi mới / sửa trả / bù tiền) hoặc Từ chối
   =================================================================== */
const CL_STEPS=['draft','sent','vendor','done'];
const CL_RESULTS=['replaced','repaired','credit','rejected'];
const claimById=id=>(DB.claims||[]).find(c=>c.id===id);
function clNew(o){ DB.claims=DB.claims||[]; const c=Object.assign({ id:'cl'+Date.now().toString(36)+Math.random().toString(36).slice(2,4), no:erpNo('BH'), status:'draft', result:null, qty:1, createdAt:Date.now(), by:S.userId, proofs:[], log:[] },o); DB.claims.unshift(c); return c; }
const clName=c=>c.kind==='unit'?`${t('cl_unit')} ${c.model||''}`:partName(c.pn);
const clPill=c=>`<span class="kst ${c.status==='done'?(c.result==='rejected'?'k-bad':'k-ok'):c.status==='draft'?'k-warn':'k-blue'}">${c.status==='done'?t('clr_'+c.result):t('cls_'+c.status)}</span>`;
A.clNewScrap = el => { const s=(DB.scrap||[]).find(z=>z.id===el.dataset.id); if(!s) return; const st=stockBy(s.pn); openModal({type:'clNew',f:{kind:'part',pn:s.pn,qty:s.qty,sn:s.sn||'',model:'',supplierId:(st&&st.supplierId)||((DB.suppliers||[])[0]||{}).id||'',ticketId:s.ticketId,scrapId:s.id,note:''},err:{}}); };
A.clNewAsk = () => openModal({type:'clNew',f:{kind:'part',pn:(DB.stock[0]||{}).pn,qty:1,sn:'',model:'',supplierId:((DB.suppliers||[])[0]||{}).id||'',ticketId:'',scrapId:'',note:''},err:{}});
MODALS.clNew = m => { const f=m.f, E=m.err||{};
  return { title:t('cl_new'), body:`<div class="form-grid">
    <div class="field"><span class="lbl">${t('cl_kind')}</span><div class="seg">${['part','unit'].map(k=>`<button class="${f.kind===k?'on':''}" data-a="clKind" data-k="${k}">${t('clk_'+k)}</button>`).join('')}</div></div>
    <div class="field"><label for="cl-s">${t('cl_vendor')}</label><select class="select" id="cl-s" data-bind="modal.f.supplierId">${(DB.suppliers||[]).map(s=>`<option value="${s.id}" ${f.supplierId===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
    ${f.kind==='part'?`<div class="field"><label for="cl-p">${t('item_name')}</label><select class="select" id="cl-p" data-bind="modal.f.pn" data-re>${DB.stock.map(s=>`<option value="${s.pn}" ${f.pn===s.pn?'selected':''}>${s.pn} · ${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label for="cl-q">${t('qty_l')}</label><input class="input num" type="number" min="1" id="cl-q" data-bind="modal.f.qty" data-num value="${f.qty}"></div>`
    :`<div class="field"><label class="req" for="cl-m">${t('product_model')}</label><input class="input ${E.model?'err':''}" id="cl-m" data-bind="modal.f.model" value="${esc(f.model)}"></div>`}
    <div class="field"><label ${f.kind==='unit'?'class="req"':''} for="cl-sn">${t('serial_no')}</label><input class="input mono ${E.sn?'err':''}" id="cl-sn" data-bind="modal.f.sn" value="${esc(f.sn)}"></div>
    <div class="field full"><label class="req" for="cl-n">${t('cl_fault')}</label><textarea class="textarea ${E.note?'err':''}" id="cl-n" data-bind="modal.f.note" placeholder="${t('cl_fault_ph')}">${esc(f.note)}</textarea>${E.note?`<div class="err-text">${E.note}</div>`:''}</div></div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="clCreate">${t('cl_create')}</button>` }; };
A.clKind = el => { S.ui.modal.f.kind=el.dataset.k; rerender(); };
A.clCreate = () => { const m=S.ui.modal; const f=m.f; const E={}; if(!String(f.note||'').trim()) E.note=t('e_required'); if(f.kind==='unit'){ if(!String(f.model||'').trim()) E.model=t('e_required'); if(!String(f.sn||'').trim()) E.sn=t('e_required'); } m.err=E; if(Object.keys(E).length){ rerender(); return; }
  const c=clNew({ kind:f.kind, pn:f.kind==='part'?f.pn:'', qty:f.kind==='part'?Math.max(1,Number(f.qty)||1):1, sn:String(f.sn||'').trim(), model:f.kind==='unit'?f.model.trim():'', supplierId:f.supplierId, ticketId:f.ticketId||'', scrapId:f.scrapId||'', note:f.note.trim() });
  if(c.scrapId){ const s=(DB.scrap||[]).find(z=>z.id===c.scrapId); if(s){ s.state='rma'; s.claimId=c.id; } }
  const x=c.ticketId&&ticketById(c.ticketId); if(x){ x.claimIds=(x.claimIds||[]).concat(c.id); x.history.push({at:Date.now(),by:S.userId,action:'claim_created',from:null,to:null,note:c.no}); }
  S.ui.modal=null; save(); toast(t('toast_cl_new',{no:c.no}),'ok'); openModal({type:'claim',id:c.id}); };
/* thay nút "Tạo RMA" trong phiếu sửa: tạo phiếu bảo hành hãng cho máy */
const _wfClaim=A.wf; A.wf=(el,ev)=>{ if(el.dataset.op==='mkRma'){ const x=ticketById(el.dataset.id); const p=(x.products||[])[0]||{}; openModal({type:'clNew',f:{kind:'unit',pn:'',qty:1,sn:p.sn||'',model:p.model||'',supplierId:((DB.suppliers||[])[0]||{}).id||'',ticketId:x.id,scrapId:'',note:x.diagnosis&&L(x.diagnosis.text)||''},err:{}}); return; } return _wfClaim(el,ev); };
A.clOpen = el => openModal({type:'claim',id:el.dataset.id});
MODALS.claim = m => { const c=claimById(m.id); if(!c) return {title:'—',body:''}; const f=m.f||(m.f={carrier:'Viettel Post',tracking:'',result:'replaced',newSn:'',credit:0,rnote:'',files:[]}); const E=m.err||{}; const mg=can('stock_move')||can('po_manage');
  const idx=c.status==='done'?4:CL_STEPS.indexOf(c.status); const ev=k=>(c.log.find(l=>l.k===k)||{}).at;
  const flow=`<div class="tkflow tkflow-sm" style="margin-bottom:14px"><ol class="tf-steps" style="--n:4">${CL_STEPS.map((s,i)=>{ const st=c.status==='done'&&c.result==='rejected'&&s==='done'?'bad':i<idx?'done':i===idx?'cur':'todo'; const d=s==='draft'?c.createdAt:ev(s);
    return `<li class="tf-${st}"><span class="tf-dot">${st==='done'?ic('check',15):st==='bad'?ic('x',15):ic(['file','truck','box','check'][i],15)}</span><span class="tf-lb">${s==='done'&&c.status==='done'?t('clr_'+c.result):t('cls_'+s)}</span><small class="tf-dt">${st!=='todo'&&d?fmtD(d):'&nbsp;'}</small></li>`; }).join('')}</ol></div>`;
  const x=c.ticketId&&ticketById(c.ticketId);
  const info=`<div class="kv-grid">${kv(t('cl_kind'),t('clk_'+c.kind))}${kv(t('cl_vendor'),esc((supById(c.supplierId)||{}).name||'—'))}${kv(t('item_name'),`${c.pn?`<span class="mono">${esc(c.pn)}</span> `:''}${esc(clName(c))} ×${c.qty}`)}${kv(t('serial_no'),`<span class="mono">${esc(c.sn||'—')}</span>`)}${x?kv(t('ticket'),`<button class="link-btn mono" data-a="openTicketClose" data-id="${x.id}">${x.no}</button>`):''}${c.tracking?kv(t('tracking_no'),`<span class="mono">${esc(c.tracking)}</span> · ${esc(c.carrier||'')}`):''}${c.newSn?kv(t('cl_new_sn'),`<span class="mono">${esc(c.newSn)}</span>`):''}${c.credit?kv(t('cl_credit'),money(c.credit)):''}</div>
    <p class="quote" style="margin:12px 0"><b>${t('cl_fault')}:</b> ${esc(c.note)}${c.rnote?`<br><b>${t('cl_result_note')}:</b> ${esc(c.rnote)}`:''}</p>
    ${c.proofs.length?`<div class="msg-imgs">${c.proofs.flatMap(p=>p.files).map(proofThumb).join('')}</div>`:''}`;
  const up=`<div class="field full" style="margin-top:10px"><span class="lbl req">${t('pf_docs')}</span><div class="payimgs">${f.files.map((a,i)=>`<div class="payimg">${(a.mime||'').startsWith('image/')?`<img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt="">`:`<div class="pf-file">${ic('file',22)}<span>${esc(a.name)}</span></div>`}<button type="button" class="icon-btn" data-a="clFileDel" data-i="${i}" aria-label="${t('delete')}">${ic('x',13)}</button></div>`).join('')}<label class="payimg-add ${E.files?'err':''}">${ic('upload',18)}<span>${t('pf_add_doc')}</span><input type="file" accept="${PROOF_ACCEPT_DOC}" multiple data-file="clFiles" hidden></label></div>${E.files?`<div class="err-text">${E.files}</div>`:''}</div>`;
  let form='', foot=`<button class="btn" data-a="closeModal">${t('close')}</button>`;
  if(mg&&c.status==='draft'){ form=`<div class="form-grid" style="margin-top:6px"><div class="field"><label for="cl-c">${t('carrier')}</label><select class="select" id="cl-c" data-bind="modal.f.carrier">${['Viettel Post','GHN','GHTK','Hãng đến lấy','Xe SGE giao'].map(v=>`<option ${f.carrier===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label for="cl-t">${t('tracking_no')}</label><input class="input mono" id="cl-t" data-bind="modal.f.tracking" value="${esc(f.tracking)}"></div>${up}</div>`; foot+=`<span class="grow"></span><button class="btn danger" data-a="clCancel">${t('cl_cancel')}</button><button class="btn primary" data-a="clGo" data-to="sent">${ic('truck',15)} ${t('cl_go_sent')}</button>`; }
  if(mg&&c.status==='sent') foot+=`<span class="grow"></span><button class="btn primary" data-a="clGo" data-to="vendor">${ic('check',15)} ${t('cl_go_vendor')}</button>`;
  if(mg&&c.status==='vendor'){ form=`<div class="form-grid" style="margin-top:6px"><div class="field"><label for="cl-r">${t('cl_result')}</label><select class="select" id="cl-r" data-bind="modal.f.result" data-re>${CL_RESULTS.map(v=>`<option value="${v}" ${f.result===v?'selected':''}>${t('clr_'+v)}</option>`).join('')}</select></div>
      ${f.result==='replaced'&&c.kind==='unit'?`<div class="field"><label for="cl-ns">${t('cl_new_sn')}</label><input class="input mono" id="cl-ns" data-bind="modal.f.newSn" value="${esc(f.newSn)}"></div>`:''}${f.result==='credit'?`<div class="field"><label for="cl-cr">${t('cl_credit')}</label><input class="input num" type="number" id="cl-cr" data-bind="modal.f.credit" data-num value="${f.credit}"></div>`:''}
      <div class="field full"><label for="cl-rn">${t('cl_result_note')}</label><input class="input" id="cl-rn" data-bind="modal.f.rnote" value="${esc(f.rnote)}"></div>${up}</div><p class="hint">${t(c.kind==='part'&&['replaced','repaired'].includes(f.result)?'cl_hint_stock':'cl_hint_other')}</p>`;
    foot+=`<span class="grow"></span><button class="btn primary" data-a="clGo" data-to="done">${ic('check',15)} ${t('cl_go_done')}</button>`; }
  return { wide:true, title:`${t('cl_title')} · <span class="mono">${esc(c.no)}</span> ${clPill(c)}`, body:flow+info+form, foot }; };
A.clFiles = input => readFiles(input,'image',arr=>{ const m=S.ui.modal; if(!m||m.type!=='claim') return; arr.forEach(a=>{ if(!(a.mime||'').startsWith('image/')) a.kind='file'; }); m.f.files=m.f.files.concat(arr); if(m.err) delete m.err.files; rerender(); });
A.clFileDel = el => { S.ui.modal.f.files.splice(+el.dataset.i,1); rerender(); };
A.clCancel = () => { const m=S.ui.modal; const c=claimById(m.id); if(!c) return; DB.claims=DB.claims.filter(z=>z!==c); const s=c.scrapId&&(DB.scrap||[]).find(z=>z.id===c.scrapId); if(s){ s.state='hold'; s.claimId=null; } S.ui.modal=null; save(); rerender(); toast(t('toast_saved'),'ok'); };
A.clGo = el => { const m=S.ui.modal; const c=claimById(m.id); const f=m.f; const to=el.dataset.to; const now=Date.now();
  if((to==='sent'||to==='done')&&!f.files.length){ m.err={files:t('pf_need_doc')}; rerender(); return; }
  if(to==='sent'){ c.carrier=f.carrier; c.tracking=f.tracking; c.sentAt=now; }
  if(to==='done'){ c.result=f.result; c.rnote=f.rnote; c.doneAt=now; if(f.result==='replaced'&&c.kind==='unit') c.newSn=f.newSn; if(f.result==='credit') c.credit=Number(f.credit)||0;
    if(c.kind==='part'&&['replaced','repaired'].includes(f.result)){ const s=stockBy(c.pn); if(s){ s.qty+=c.qty; logMove('in',c.pn,c.qty,{kind:'claim',id:c.id},t('cl_mv_note',{no:c.no})); DB.moves[0].images=f.files.slice(); } }
    const sc=c.scrapId&&(DB.scrap||[]).find(z=>z.id===c.scrapId); if(sc) sc.state=f.result==='rejected'?'hold':'closed';
    const x=c.ticketId&&ticketById(c.ticketId); if(x){ x.history.push({at:now,by:S.userId,action:'claim_done',from:null,to:null,note:c.no+' · '+t('clr_'+f.result)}); if(x.assigneeId) notify({toUser:x.assigneeId,key:'n_cl_done',vars:{no:c.no,r:t('clr_'+f.result)},ticketId:x.id}); } }
  if(f.files.length) c.proofs.push({stage:to,files:f.files.slice(),at:now,by:S.userId});
  c.status=to; c.log.push({k:to,at:now,by:S.userId}); m.f=null; m.err={}; save(); rerender(); toast(t('toast_cl_'+to),'ok'); };
function viewClaims(){ const f=S.ui.cl||(S.ui.cl={st:'open',q:''}); const all=DB.claims||[]; const open=all.filter(c=>c.status!=='done');
  let arr=f.st==='open'?open:f.st==='all'?all:all.filter(c=>c.status===f.st);
  if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(c=>(c.no+' '+c.pn+' '+clName(c)+' '+c.sn+' '+((supById(c.supplierId)||{}).name||'')).toLowerCase().includes(q)); }
  const late=open.filter(c=>c.status!=='draft'&&Date.now()-(c.sentAt||c.createdAt)>21*DAYMS).length; const m0=new Date(); m0.setDate(1); m0.setHours(0,0,0,0);
  const doneM=all.filter(c=>c.status==='done'&&c.doneAt>=m0.getTime()); const ok=doneM.filter(c=>c.result!=='rejected').length;
  const scrapHold=(DB.scrap||[]).filter(s=>s.state==='hold').length;
  return `<div class="page-head"><div><h1>${t('rma_title')}</h1><div class="sub">${t('cl_sub')}</div></div><div class="row">${scrapHold?`<button class="btn" data-a="clScrapTab">${t('cl_from_scrap',{n:scrapHold})}</button>`:''}${(can('stock_move')||can('po_manage'))?`<button class="btn primary" data-a="clNewAsk">${ic('plus',15)} ${t('cl_new')}</button>`:''}</div></div>
  <div class="stat-row task-stats"><div class="card stat"><div class="l">${t('cl_open')}</div><div class="v">${open.length}</div></div><div class="card stat"><div class="l">${t('cl_at_vendor')}</div><div class="v" style="color:var(--blue)">${open.filter(c=>c.status!=='draft').length}</div></div><div class="card stat"><div class="l">${t('cl_late')}</div><div class="v" style="color:${late?'var(--bad)':'inherit'}">${late}</div></div><div class="card stat"><div class="l">${t('cl_done_m')}</div><div class="v" style="color:var(--ok)">${ok}<small class="muted" style="font-size:14px"> / ${doneM.length}</small></div></div></div>
  <div class="card"><div class="toolbar"><div class="row grow">${searchBox('cl-q','cl.q',f.q)}<div class="seg">${['open','draft','sent','vendor','done','all'].map(k=>`<button class="${f.st===k?'on':''}" data-a="clF" data-k="${k}">${t('clf_'+k)}</button>`).join('')}</div></div></div>
  ${arr.length?`<div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('rq_no')}</th><th>${t('cl_kind')}</th><th>${t('item_name')}</th><th>${t('serial_no')}</th><th>${t('cl_vendor')}</th><th>${t('ticket')}</th><th>${t('doc_date')}</th><th>${t('status')}</th></tr></thead><tbody>${arr.map(c=>{ const x=c.ticketId&&ticketById(c.ticketId); const age=Math.floor((Date.now()-(c.sentAt||c.createdAt))/DAYMS);
    return `<tr class="clickable" data-a="clOpen" data-id="${c.id}"><td data-l="${t('rq_no')}" class="mono nowrap" style="color:var(--blue)">${esc(c.no)}</td><td data-l="${t('cl_kind')}">${t('clk_'+c.kind)}</td><td data-l="${t('item_name')}">${c.pn?`<span class="mono">${esc(c.pn)}</span> `:''}${esc(clName(c))} ×${c.qty}</td><td data-l="${t('serial_no')}" class="mono">${esc(c.sn||'—')}</td><td data-l="${t('cl_vendor')}">${esc((supById(c.supplierId)||{}).name||'—')}</td><td data-l="${t('ticket')}" class="mono">${x?esc(x.no):'—'}</td><td data-l="${t('doc_date')}" class="num nowrap">${fmtD(c.createdAt)}${c.status!=='done'&&c.status!=='draft'?`<br><small style="color:${age>21?'var(--bad)':'var(--muted)'}">${t('cl_age',{n:age})}</small>`:''}</td><td data-l="${t('status')}">${clPill(c)}</td></tr>`; }).join('')}</tbody></table></div>`:`<div class="empty">${t('cl_empty')}</div>`}</div>`; }
A.clF = el => { S.ui.cl.st=el.dataset.k; rerender(); };
A.clScrapTab = () => { S.ui.stk={tab:'scrap',q:'',cat:'',low:false,page:1,size:10}; openTab('stock'); };
const _erpViewCl=erpView; erpView=function(k){ if(k==='rma') return viewClaims(); return _erpViewCl(k); };
const _tabAllowedCl=tabAllowed; tabAllowed=function(k,u=me()){ if(k==='rma') return !!u&&!isExternal(u); return _tabAllowedCl(k,u); };
const _findImgCl=findImg; findImg=function(fid){ const a=_findImgCl(fid); if(a) return a; for(const c of (DB.claims||[])) for(const p of c.proofs) for(const f of p.files) if(f.id===fid) return f; return null; };

/* ===================================================================
   TÌNH HUỐNG BỔ SUNG: chuyển KTV · sửa lại báo giá · hoàn tiền cọc dư
   · kiểm tra không đạt nhiều lần · máy bỏ quên
   =================================================================== */
const ABANDON_DAYS=30;
const testFails=x=>(x.history||[]).filter(h=>h.action==='test_failed').length;
const overPaid=c=>c?Math.max(0,docPaid(c)-docTotal(c)):0;
const _tkAlertsX=tkAlerts; tkAlerts=function(x){ const u=me(); let h=_tkAlertsX(x); if(!u||isExternal(u)) return h; const extra=[];
  const tf=testFails(x); if(tf>=2&&isOpen(x)) extra.push(['bad','alert',t('al_test_fail',{n:tf})]);
  if(readyDays(x)>ABANDON_DAYS) extra.push(['bad','alert',t('al_abandon',{n:readyDays(x)})]);
  const c=x.svcId&&svcById(x.svcId); if(overPaid(c)>0) extra.push(['warn','refresh',t('al_refund',{a:money(overPaid(c))})]);
  const add=extra.map(([k,i,s])=>`<div class="tk-al ${k}">${ic(i,15)}<span>${s}</span></div>`).join('');
  const bar=(can('ticket_assign')&&isOpen(x)&&x.assigneeId&&!['delivered','invoiced','paid','closed'].includes(x.status))?`<div class="tk-tools"><button class="btn sm" data-a="raAsk" data-id="${x.id}">${ic('refresh',13)} ${t('ra_btn')}</button></div>`:'';
  if(!add&&!bar) return h; if(!h) return `<div class="tk-alerts">${add}${bar}</div>`; return h.replace(/<\/div>$/,add+bar+'</div>'); };
/* chuyển kỹ thuật viên */
A.raAsk = el => openModal({type:'ra',id:el.dataset.id,f:{to:'',reason:''},err:{}});
MODALS.ra = m => { const x=ticketById(m.id); const f=m.f,E=m.err||{}; const techs=(DB.users||[]).filter(u=>u.role==='engineer'&&u.active!==false&&u.id!==x.assigneeId);
  return { title:`${t('ra_btn')} · <span class="mono">${x.no}</span>`, body:`<p class="muted" style="margin:0 0 10px">${t('ra_now',{u:esc(uname(x.assigneeId))})}</p><div class="form-grid"><div class="field"><label class="req" for="ra-t">${t('ra_to')}</label><select class="select ${E.to?'err':''}" id="ra-t" data-bind="modal.f.to"><option value="">—</option>${techs.map(u=>`<option value="${u.id}" ${f.to===u.id?'selected':''}>${esc(u.name)} · ${visibleTickets(u).filter(q=>q.assigneeId===u.id&&isOpen(q)).length} ${t('ra_open')}</option>`).join('')}</select></div>
    <div class="field"><label class="req" for="ra-r">${t('ra_reason')}</label><input class="input ${E.reason?'err':''}" id="ra-r" data-bind="modal.f.reason" value="${esc(f.reason)}" placeholder="${t('ra_reason_ph')}"></div></div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="raSave">${t('ra_save')}</button>` }; };
A.raSave = () => { const m=S.ui.modal; const x=ticketById(m.id); const f=m.f; const E={}; if(!f.to) E.to=t('e_required'); if(!String(f.reason||'').trim()) E.reason=t('e_required'); m.err=E; if(Object.keys(E).length){ rerender(); return; }
  const from=x.assigneeId; x.assigneeId=f.to; x.history.push({at:Date.now(),by:S.userId,action:'reassigned',from:null,to:null,note:`${uname(from)} → ${uname(f.to)} · ${f.reason.trim()}`}); x.updatedAt=Date.now();
  notify({toUser:f.to,key:'n_ra_to',vars:{no:x.no},ticketId:x.id}); if(from) notify({toUser:from,key:'n_ra_from',vars:{no:x.no,u:uname(f.to)},ticketId:x.id});
  S.ui.modal=null; save(); rerender(); toast(t('toast_ra',{u:uname(f.to)}),'ok'); };
/* sửa lại báo giá sau khi đã gửi (khách mặc cả, đổi phương án) + hoàn tiền dư */
const _quoteBoxX=quoteBox; quoteBox=function(x){ let h=_quoteBoxX(x); const c=x.svcId&&svcById(x.svcId); if(!h||!c) return h; const btns=[];
  if(can('svc_manage')&&c.status==='sent'&&!c.agreedAt) btns.push(`<button class="btn sm" data-a="qRevise" data-id="${c.id}">${ic('edit',13)} ${t('qr_btn')}</button>`);
  const op=overPaid(c); if(op>0&&can('pay_record')) btns.push(`<button class="btn sm danger" data-a="refundAsk" data-id="${c.id}">${t('rf_btn',{a:money(op)})}</button>`);
  if(!btns.length) return h; return h.replace('<div class="doc-btns">',`<div class="qb-row"><span class="qb-k">${t('qb_more')}</span>${btns.join('')}</div><div class="doc-btns">`); };
/* hợp đồng đã hủy / khách từ chối vẫn cần nút hoàn tiền: hiện quoteBox cả khi declined nếu có tiền dư */
const _quoteBoxD=quoteBox; quoteBox=function(x){ const c=x.svcId&&svcById(x.svcId); if(c&&c.status==='declined'&&overPaid(c)>0&&can('pay_record')) return `<section class="card qbox"><div class="card-b"><div class="qb-row"><span class="qb-k">${t('qb_more')}</span><button class="btn sm danger" data-a="refundAsk" data-id="${c.id}">${t('rf_btn',{a:money(overPaid(c))})}</button></div>${docBtns(c)}</div></section>`; return _quoteBoxD(x); };
A.qRevise = el => { const c=svcById(el.dataset.id); c.status='quote'; c.quoteOk=null; c.quoteReq=null; c.revisions=(c.revisions||0)+1; const x=c.ticketId&&ticketById(c.ticketId); if(x) x.history.push({at:Date.now(),by:S.userId,action:'quote_revised',from:null,to:null,note:c.no+' · lần '+c.revisions}); save(); rerender(); toast(t('toast_qr'),'ok'); };
A.refundAsk = el => { const c=svcById(el.dataset.id); openModal({type:'refund',id:c.id,f:{amount:overPaid(c),method:'bank',note:'',files:[]},err:{}}); };
MODALS.refund = m => { const c=svcById(m.id); const f=m.f,E=m.err||{};
  return { title:`${t('rf_title')} · <span class="mono">${c.no}</span>`, body:`<p class="muted" style="margin:0 0 10px">${t('rf_hint',{p:money(docPaid(c)),t:money(docTotal(c))})}</p><div class="form-grid"><div class="field"><label class="req" for="rf-a">${t('amount')}</label><input class="input num" type="number" id="rf-a" data-bind="modal.f.amount" data-num value="${f.amount}"></div><div class="field"><label for="rf-m">${t('pay_method')}</label><select class="select" id="rf-m" data-bind="modal.f.method">${['bank','cash'].map(v=>`<option value="${v}" ${f.method===v?'selected':''}>${t('pm_'+v)}</option>`).join('')}</select></div><div class="field full"><label for="rf-n">${t('note_l')}</label><input class="input" id="rf-n" data-bind="modal.f.note" value="${esc(f.note)}"></div></div>
    <div class="field full" style="margin-top:10px"><span class="lbl req">${t('pay_proof')}</span><div class="payimgs">${f.files.map((a,i)=>`<div class="payimg"><img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt=""><button type="button" class="icon-btn" data-a="rfDel" data-i="${i}" aria-label="${t('delete')}">${ic('x',13)}</button></div>`).join('')}<label class="payimg-add ${E.files?'err':''}">${ic('upload',18)}<span>${t('pay_proof_add')}</span><input type="file" accept="image/*" multiple data-file="rfFiles" hidden></label></div>${E.files?`<div class="err-text">${E.files}</div>`:''}</div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn danger" data-a="refundSave">${t('rf_save')}</button>` }; };
A.rfFiles = input => readFiles(input,'image',arr=>{ const m=S.ui.modal; if(!m||m.type!=='refund') return; m.f.files=m.f.files.concat(arr); if(m.err) delete m.err.files; rerender(); });
A.rfDel = el => { S.ui.modal.f.files.splice(+el.dataset.i,1); rerender(); };
A.refundSave = () => { const m=S.ui.modal; const c=svcById(m.id); const f=m.f; const a=Math.round(Number(f.amount)||0); if(a<=0||a>overPaid(c)){ toast(t('rf_bad',{a:money(overPaid(c))}),'bad'); return; } if(!f.files.length){ m.err={files:t('pay_proof_req')}; rerender(); return; }
  c.payments=c.payments||[]; c.payments.push({at:Date.now(),amount:-a,method:f.method,by:S.userId,note:f.note||t('rf_title'),refund:1,images:f.files.slice()});
  const x=c.ticketId&&ticketById(c.ticketId); if(x) x.history.push({at:Date.now(),by:S.userId,action:'refunded',from:null,to:null,note:money(a)}); S.ui.modal=null; save(); rerender(); toast(t('toast_rf',{a:money(a)}),'ok'); };
/* kiểm tra không đạt lần 2 trở lên → báo quản lý */
const _wfTf=A.wf; A.wf=(el,ev)=>{ const x=ticketById(el.dataset.id); const op=el.dataset.op; const r=_wfTf(el,ev); if(op==='testFail'&&x&&testFails(x)>=2){ notify({toRole:'manager',key:'n_test_fail',vars:{no:x.no,n:testFails(x)},ticketId:x.id}); save(); } return r; };
/* việc cần làm: thêm tình huống mới */
const _todayTasksX=todayTasks; todayTasks=function(u){ const L0=_todayTasksX(u); const add=(key,list)=>{ if(list.length) L0.push({key,n:list.length,items:list}); }; const tk=DB.tickets||[];
  if(['manager','dev'].includes(u.role)){ add('td_abandon',tk.filter(x=>readyDays(x)>ABANDON_DAYS)); add('td_test_fail',tk.filter(x=>isOpen(x)&&testFails(x)>=2&&['in_service','testing'].includes(x.status))); }
  if(['accountant','manager','dev'].includes(u.role)) add('td_refund',tk.filter(x=>{ const c=x.svcId&&svcById(x.svcId); return overPaid(c)>0; }));
  if(['warehouse','manager','dev'].includes(u.role)){ const cl=DB.claims||[]; add('td_cl_send',cl.filter(c=>c.status==='draft').map(c=>({id:c.ticketId||null,no:c.no,company:clName(c),claim:c.id}))); add('td_cl_late',cl.filter(c=>['sent','vendor'].includes(c.status)&&Date.now()-(c.sentAt||c.createdAt)>21*DAYMS).map(c=>({id:c.ticketId||null,no:c.no,company:clName(c),claim:c.id}))); }
  return L0; };
const _taskItemX=taskItem; taskItem=function(x){ if(x.claim) return `<button class="mini-item" data-a="clOpen" data-id="${x.claim}"><span class="t"><div><span class="mono">${esc(x.no)}</span> ${esc(x.company||'')}</div></span></button>`; return _taskItemX(x); };
URGENT_KEYS.push('td_abandon','td_test_fail','td_cl_late');

/* ---- hợp đồng: lọc nhanh ---- */
const CTR_QK={ appr:c=>!!(c.quoteReq&&!quoteApproved(c)&&quoteOpen(c)), cust:c=>c.status==='sent'&&!c.agreedAt, expired:c=>c.status==='sent'&&!c.agreedAt&&Date.now()>quoteExpiry(c), sign:c=>!!c.agreedAt&&['quote','sent'].includes(c.status), dep:c=>!!c.agreedAt&&!depOk(c)&&!['done','cancelled','declined'].includes(c.status), debt:c=>!['cancelled'].includes(c.status)&&docDue(c)>0&&!!(c.signedAt||c.agreedAt), refund:c=>overPaid(c)>0 };
function ctrChips(list,f){ return `<div class="qtabs" style="padding:12px 16px 0"><button class="qtab ${!f.qk?'on':''}" data-a="ctrQk" data-k="">${t('all')}<b>${list.length}</b></button>${Object.keys(CTR_QK).map(k=>{ const n=list.filter(CTR_QK[k]).length; return n||f.qk===k?`<button class="qtab ${f.qk===k?'on':''} ${['expired','refund','appr'].includes(k)?'urg':''}" data-a="ctrQk" data-k="${k}">${t('ctq_'+k)}<b>${n}</b></button>`:''; }).join('')}</div>`; }
A.ctrQk = el => { const f=S.ui.ctr; f.qk=el.dataset.k; f.page=1; rerender(); };

Object.assign(DICT.vi,{ rma_title:'Bảo hành hãng / NCC', nav_rma:'Bảo hành hãng', cl_sub:'Gửi xác linh kiện hoặc máy còn bảo hành hãng về Sungrow / nhà cung cấp và theo dõi kết quả', cl_new:'Tạo phiếu gửi bảo hành', cl_create:'Tạo phiếu', cl_title:'Phiếu bảo hành hãng',
  cl_kind:'Loại', clk_part:'Linh kiện', clk_unit:'Nguyên máy', cl_unit:'Biến tần', cl_vendor:'Hãng / NCC', cl_fault:'Mô tả lỗi', cl_fault_ph:'VD: IGBT chập pha W, còn bảo hành hãng 24 tháng', cl_send_btn:'Gửi bảo hành hãng', cl_from_scrap:'{n} xác linh kiện chưa xử lý',
  cls_draft:'Tạo phiếu', cls_sent:'Đã gửi hãng', cls_vendor:'Hãng đã nhận', cls_done:'Hoàn tất', clr_replaced:'Đổi mới', clr_repaired:'Hãng sửa trả', clr_credit:'Hãng bù tiền', clr_rejected:'Hãng từ chối',
  cl_go_sent:'Xác nhận đã gửi hãng', cl_go_vendor:'Hãng đã nhận hàng', cl_go_done:'Ghi nhận kết quả', cl_cancel:'Hủy phiếu', cl_result:'Kết quả', cl_result_note:'Ghi chú kết quả', cl_new_sn:'Serial máy mới', cl_credit:'Số tiền hãng bù',
  cl_hint_stock:'Hàng đổi / sửa trả về sẽ tự nhập lại kho.', cl_hint_other:'Không phát sinh nhập kho.', cl_mv_note:'Nhận về từ bảo hành hãng {no}',
  cl_open:'Đang xử lý', cl_at_vendor:'Đang ở hãng', cl_late:'Quá 21 ngày chưa có kết quả', cl_done_m:'Đổi thành công tháng này', cl_age:'{n} ngày', cl_empty:'Chưa có phiếu bảo hành hãng nào.',
  clf_open:'Đang xử lý', clf_draft:'Chưa gửi', clf_sent:'Đã gửi', clf_vendor:'Hãng đã nhận', clf_done:'Hoàn tất', clf_all:'Tất cả',
  toast_cl_new:'Đã tạo phiếu {no}', toast_cl_sent:'Đã ghi nhận gửi hãng', toast_cl_vendor:'Đã ghi nhận hãng nhận hàng', toast_cl_done:'Đã ghi nhận kết quả bảo hành', n_cl_done:'{no}: bảo hành hãng có kết quả — {r}', h_claim_created:'tạo phiếu bảo hành hãng', h_claim_done:'bảo hành hãng có kết quả', scs_closed:'Đã đổi xong', scs_rma:'Đang gửi hãng',
  td_cl_send:'Phiếu bảo hành hãng chưa gửi', td_cl_late:'Bảo hành hãng quá 21 ngày', td_abandon:'Máy khách bỏ quên (quá 30 ngày)', td_test_fail:'Phiếu kiểm tra không đạt nhiều lần', td_refund:'Hợp đồng cần hoàn tiền cho khách',
  al_test_fail:'Đã kiểm tra không đạt {n} lần. Quản lý nên xem lại phương án sửa hoặc chuyển kỹ thuật khác.', al_abandon:'Máy đã sửa xong {n} ngày khách chưa nhận. Cần liên hệ khách bằng văn bản về việc lưu kho / thanh lý theo chính sách.', al_refund:'Khách đã trả dư {a} so với giá trị hợp đồng hiện tại. Cần hoàn tiền.',
  ra_btn:'Chuyển kỹ thuật viên', ra_now:'Đang phụ trách: {u}', ra_to:'Chuyển cho', ra_open:'phiếu đang làm', ra_reason:'Lý do', ra_reason_ph:'VD: nghỉ phép, cần chuyên môn khác', ra_save:'Chuyển', toast_ra:'Đã chuyển phiếu cho {u}', n_ra_to:'{no}: bạn được giao phụ trách phiếu này', n_ra_from:'{no}: phiếu đã chuyển cho {u}', h_reassigned:'chuyển kỹ thuật viên',
  qb_more:'Thao tác', qr_btn:'Sửa lại báo giá', toast_qr:'Báo giá đã mở lại để chỉnh sửa, cần gửi lại khách', h_quote_revised:'sửa lại báo giá',
  rf_btn:'Hoàn tiền {a}', rf_title:'Hoàn tiền cho khách', rf_hint:'Khách đã trả {p}, giá trị hợp đồng hiện tại {t}.', rf_save:'Xác nhận đã hoàn tiền', rf_bad:'Số tiền hoàn phải lớn hơn 0 và không quá {a}', toast_rf:'Đã ghi nhận hoàn {a}', h_refunded:'hoàn tiền cho khách',
  n_test_fail:'{no}: kiểm tra không đạt lần {n}',
  ctq_appr:'Chờ duyệt', ctq_cust:'Chờ khách đồng ý', ctq_expired:'Báo giá hết hạn', ctq_sign:'Chờ ký HĐ', ctq_dep:'Chờ đặt cọc', ctq_debt:'Còn phải thu', ctq_refund:'Cần hoàn tiền' });
Object.assign(DICT.en,{ rma_title:'Manufacturer / supplier warranty', nav_rma:'Vendor warranty', cl_sub:'Send failed parts or units under manufacturer warranty to Sungrow / suppliers and track the outcome', cl_new:'New warranty claim', cl_create:'Create', cl_title:'Vendor warranty claim',
  cl_kind:'Type', clk_part:'Part', clk_unit:'Whole unit', cl_unit:'Inverter', cl_vendor:'Vendor', cl_fault:'Fault description', cl_fault_ph:'e.g. IGBT shorted on phase W, 24-month vendor warranty', cl_send_btn:'Send to vendor', cl_from_scrap:'{n} scrap parts pending',
  cls_draft:'Created', cls_sent:'Sent', cls_vendor:'Vendor received', cls_done:'Completed', clr_replaced:'Replaced', clr_repaired:'Repaired', clr_credit:'Credited', clr_rejected:'Rejected',
  cl_go_sent:'Confirm sent', cl_go_vendor:'Vendor received', cl_go_done:'Record outcome', cl_cancel:'Cancel claim', cl_result:'Outcome', cl_result_note:'Outcome notes', cl_new_sn:'Replacement serial', cl_credit:'Credit amount',
  cl_hint_stock:'Replaced / repaired parts are received back into stock.', cl_hint_other:'No stock movement.', cl_mv_note:'Received from vendor claim {no}',
  cl_open:'Open', cl_at_vendor:'At vendor', cl_late:'Over 21 days without outcome', cl_done_m:'Successful this month', cl_age:'{n} days', cl_empty:'No vendor claims yet.',
  clf_open:'Open', clf_draft:'Not sent', clf_sent:'Sent', clf_vendor:'At vendor', clf_done:'Done', clf_all:'All',
  toast_cl_new:'Claim {no} created', toast_cl_sent:'Marked as sent', toast_cl_vendor:'Vendor receipt recorded', toast_cl_done:'Outcome recorded', n_cl_done:'{no}: vendor claim outcome — {r}', h_claim_created:'created vendor claim', h_claim_done:'vendor claim completed', scs_closed:'Claimed', scs_rma:'At vendor',
  td_cl_send:'Vendor claims not sent', td_cl_late:'Vendor claims over 21 days', td_abandon:'Abandoned units (30+ days)', td_test_fail:'Jobs failing tests repeatedly', td_refund:'Contracts needing a refund',
  al_test_fail:'Failed testing {n} times. Review the repair plan or reassign.', al_abandon:'Repaired {n} days ago and not collected. Notify the customer in writing about storage/disposal per policy.', al_refund:'Customer overpaid {a} against the current contract value. Refund needed.',
  ra_btn:'Reassign technician', ra_now:'Currently: {u}', ra_to:'Reassign to', ra_open:'open jobs', ra_reason:'Reason', ra_reason_ph:'e.g. on leave, different expertise needed', ra_save:'Reassign', toast_ra:'Job reassigned to {u}', n_ra_to:'{no}: you are now responsible for this job', n_ra_from:'{no}: job reassigned to {u}', h_reassigned:'reassigned the technician',
  qb_more:'Actions', qr_btn:'Revise quote', toast_qr:'Quote reopened for editing; resend to the customer', h_quote_revised:'revised the quote',
  rf_btn:'Refund {a}', rf_title:'Refund to customer', rf_hint:'Customer paid {p}; current contract value {t}.', rf_save:'Confirm refund', rf_bad:'Refund must be above 0 and at most {a}', toast_rf:'Refund {a} recorded', h_refunded:'refunded the customer',
  n_test_fail:'{no}: failed testing (attempt {n})',
  ctq_appr:'Awaiting approval', ctq_cust:'Awaiting customer', ctq_expired:'Quote expired', ctq_sign:'To sign', ctq_dep:'Awaiting deposit', ctq_debt:'Receivable', ctq_refund:'Refund due' });

Object.assign(DICT.vi,{ create_rma:'Gửi bảo hành hãng' }); Object.assign(DICT.en,{ create_rma:'Vendor warranty claim' });
const _navRma=navItems; navItems=function(u=me()){ const fx=n=>n.k==='rma'?Object.assign({},n,{l:t('nav_rma')}):n; return _navRma(u).map(n=>n.more?Object.assign(fx(n),{more:n.more.map(fx)}):fx(n)); };

/* ===================================================================
   CÔNG TRÌNH & BẢO TRÌ TẬN NƠI
   Công trình (dự án) · Hợp đồng bảo trì định kỳ · Phiếu công tác tại công trình
   Phiếu công tác: Lên lịch → Tại công trình → Hoàn thành (khách ký) → Đóng phiếu (trả vật tư, chi phí)
   =================================================================== */
const FJ_KINDS=['pm','repair','inspect','install'];
const FJ_ST=['planned','onsite','done','closed'];
const FJ_CHK={
  pm:['Vệ sinh tản nhiệt, quạt biến tần','Kiểm tra, siết lại đầu cos AC/DC','Kiểm tra đầu nối MC4, dây DC','Đo điện trở cách điện DC','Kiểm tra lịch sử lỗi, cảnh báo','Kiểm tra / cập nhật firmware','Kiểm tra SPD, chống sét lan truyền','Kiểm tra hệ thống tiếp địa','Kiểm tra logger, kết nối giám sát','Kiểm tra tủ điện AC/DC, CB','Vệ sinh tấm pin','Kiểm tra khung giá đỡ, kẹp pin'],
  repair:['Xác định nguyên nhân lỗi','Cô lập nguồn, đảm bảo an toàn điện','Thay thế / sửa chữa linh kiện','Chạy thử, kiểm tra thông số','Hướng dẫn khách vận hành'],
  inspect:['Khảo sát hiện trạng hệ thống','Đo đạc thông số vận hành','Chụp ảnh hiện trạng','Đề xuất phương án xử lý'],
  install:['Kiểm tra vật tư, thiết bị trước khi lắp','Lắp đặt cơ khí','Đấu nối điện AC/DC','Kiểm tra cách điện, tiếp địa','Cấu hình biến tần, logger','Chạy thử, nghiệm thu'] };
const FJ_READ=[['pac','kW'],['eday','kWh'],['vdc','V'],['riso','MΩ'],['temp','°C'],['err','']];
const FJ_COST=['travel','meal','hotel','shipping','other'];
const siteById=id=>(DB.sites||[]).find(s=>s.id===id);
const omById=id=>(DB.oms||[]).find(o=>o.id===id);
const fjById=id=>(DB.fjobs||[]).find(j=>j.id===id);
const dayStart=ts=>{ const d=new Date(ts); d.setHours(0,0,0,0); return d.getTime(); };
function fjNew(o){ const site=siteById(o.siteId)||{}; const kind=o.kind||'pm';
  return Object.assign({ id:'fj'+Date.now().toString(36)+Math.random().toString(36).slice(2,4), no:erpNo('CT'), siteId:o.siteId, customerId:site.customerId, kind, omId:o.omId||null, date:o.date||Date.now(), team:o.team||[], leader:(o.team||[])[0]||null, note:o.note||'',
    status:'planned', createdAt:Date.now(), by:S.userId, checklist:FJ_CHK[kind].map(l=>({l,v:null,note:''})), readings:(site.inverters||[]).map(iv=>({sn:iv.sn,model:iv.model,pac:'',eday:'',vdc:'',riso:'',temp:'',err:''})),
    materials:[], matIssued:false, costs:[], before:[], after:[], findings:'', recommend:'', sign:{name:site.contact||'',title:'',img:'',paper:[]}, log:[] }, o.extra||{}); }
function omNext(om){ const js=(DB.fjobs||[]).filter(j=>j.omId===om.id&&j.status!=='cancelled').map(j=>j.date); const last=js.length?Math.max(...js):null; return last?addMonthsTs(last,om.cycle):om.start; }
function omDue(om){ const n=omNext(om); return om.end&&n>om.end?null:n; }
const fjPill=j=>`<span class="kst ${({planned:'k-blue',onsite:'k-warn',done:'k-ok',closed:'k-ok',cancelled:'k-bad'})[j.status]}">${t('fjs_'+j.status)}</span>`;
const fjKind=k=>`<span class="fjk fjk-${k}">${t('fjk_'+k)}</span>`;
const fjLate=j=>j.status==='planned'&&dayStart(j.date)<dayStart(Date.now());
const canFj=j=>{ const u=me(); return !!u&&(isBossRole(u)||can('ticket_assign')||(j.team||[]).includes(u.id)); };
/* ---------- dữ liệu mẫu ---------- */
function seedField(){ if(DB.sites) return; const cs=(DB.customers||[]).slice(0,4); const now=Date.now(); const D0=DAYMS; const models=['SG110CX','SG125CX-P2','SG50CX','MG10RL'];
  DB.sites=cs.map((c,i)=>({ id:'st'+(i+1), customerId:c.id, name:c.company.replace(/^Công ty /,'')+' – '+['Nhà máy','Mái kho A','Xưởng 2','Văn phòng'][i], address:c.address||'', kwp:[998,1500,650,2000][i], contact:c.contact||'', phone:c.phone||'',
    inverters:Array.from({length:[4,6,3,8][i]},(_,k)=>({model:models[i%4],sn:'A2'+String(4600000000+i*1000+k*37).slice(0,9)})) }));
  DB.oms=[{id:'om1',no:'BT-2026-01',siteId:'st1',cycle:3,start:now-200*D0,end:now+165*D0,value:48000000},{id:'om2',no:'BT-2026-02',siteId:'st2',cycle:1,start:now-40*D0,end:now+325*D0,value:96000000}];
  DB.fjobs=[];
  const done=fjNew({siteId:'st1',kind:'pm',omId:'om1',date:now-22*D0,team:['u_eng','u_eng2']}); done.status='closed'; done.checklist.forEach((c,i)=>{ c.v=i===10?'na':'ok'; }); done.checklist[5].v='ng'; done.checklist[5].note='Firmware cũ, hẹn kỳ sau cập nhật';
  done.readings.forEach((r,i)=>Object.assign(r,{pac:(95+i*2).toString(),eday:(420+i*11).toString(),vdc:'680',riso:(12+i).toString(),temp:'48',err:''})); done.findings='Hệ thống hoạt động ổn định. 1 biến tần firmware cũ.'; done.recommend='Cập nhật firmware kỳ tới, vệ sinh tấm pin định kỳ 1 tháng/lần.';
  done.sign={name:'Anh Tuấn',title:'Trưởng ca vận hành',img:'',paper:[]}; done.checkin=now-22*D0+8*3600e3; done.doneAt=now-22*D0+15*3600e3; done.closedAt=now-21*D0; done.log=[{k:'onsite',at:done.checkin,by:'u_eng'},{k:'done',at:done.doneAt,by:'u_eng'},{k:'closed',at:done.closedAt,by:'u_mgr'}];
  DB.oms[0].start=done.date-90*D0;
  const today=fjNew({siteId:'st2',kind:'pm',omId:'om2',date:dayStart(now)+8.5*3600e3,team:['u_eng2','u_eng'],note:'Bảo trì tháng 11'}); today.materials=[{pn:'MC400012',qty:4,used:''},{pn:'FN000210',qty:1,used:''}];
  const next=fjNew({siteId:'st3',kind:'repair',date:dayStart(now)+5*D0+9*3600e3,team:['u_eng'],note:'Khách báo biến tần số 2 lỗi 036 (quá nhiệt module)'});
  DB.fjobs.push(today,next,done); }
/* ---------- thao tác ---------- */
function fjLog(j,k){ j.log.push({k,at:Date.now(),by:S.userId}); }
A.fjNewAsk = el => { const sid=(el&&el.dataset&&el.dataset.site)||((DB.sites||[])[0]||{}).id||''; const om=(DB.oms||[]).find(o=>o.siteId===sid);
  openModal({type:'fjNew',f:{siteId:sid,kind:(el&&el.dataset&&el.dataset.kind)||'pm',omId:(el&&el.dataset&&el.dataset.om)||(om?om.id:''),date:toISODate((el&&el.dataset&&+el.dataset.date)||Date.now()+DAYMS),time:'08:00',team:[me().role==='engineer'?me().id:''].filter(Boolean),note:''},err:{}}); };
MODALS.fjNew = m => { const f=m.f,E=m.err||{}; const techs=(DB.users||[]).filter(u=>u.role==='engineer'&&u.active!==false); const oms=(DB.oms||[]).filter(o=>o.siteId===f.siteId);
  return { title:t('fj_new'), body:`<div class="fj-form">
    <div class="field"><label class="req" for="fj-s">${t('fj_site')}</label><div class="row" style="gap:8px;flex-wrap:nowrap"><select class="select ${E.siteId?'err':''}" id="fj-s" data-bind="modal.f.siteId" data-re><option value="">—</option>${(DB.sites||[]).map(s=>`<option value="${s.id}" ${f.siteId===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select><button class="btn" data-a="siteAsk" data-from="fj">${ic('plus',14)}</button></div>${E.siteId?`<div class="err-text">${E.siteId}</div>`:`<div class="hint">${t('fj_site_hint')}</div>`}</div>
    <div class="field"><span class="lbl">${t('fj_kind')}</span><div class="kind-pick">${FJ_KINDS.map(k=>`<button class="kp ${f.kind===k?'on':''}" data-a="fjKindPick" data-k="${k}"><b>${t('fjk_'+k)}</b><small>${t('fjkh_'+k)}</small></button>`).join('')}</div></div>
    <div class="form-grid"><div class="field"><label class="req" for="fj-d">${t('fj_date')}</label><input class="input" type="date" id="fj-d" data-bind="modal.f.date" value="${f.date}"></div><div class="field"><label for="fj-t">${t('fj_time')}</label><input class="input" type="time" id="fj-t" data-bind="modal.f.time" value="${f.time}"></div></div>
    ${oms.length?`<div class="field"><label for="fj-o">${t('fj_om')}</label><select class="select" id="fj-o" data-bind="modal.f.omId"><option value="">${t('fj_om_none')}</option>${oms.map(o=>`<option value="${o.id}" ${f.omId===o.id?'selected':''}>${esc(o.no)} · ${t('om_every',{n:o.cycle})}</option>`).join('')}</select></div>`:''}
    <div class="field"><span class="lbl req">${t('fj_team')}</span><div class="team-pick">${techs.map(u=>`<button class="tp ${f.team.includes(u.id)?'on':''}" data-a="fjTeamPick" data-id="${u.id}"><span class="avatar">${esc(initials(u.name))}</span>${esc(u.name.replace(/^KTV /,''))}${f.team[0]===u.id?` <small>(${t('fj_leader')})</small>`:''}</button>`).join('')}</div>${E.team?`<div class="err-text">${E.team}</div>`:`<div class="hint">${t('fj_team_hint')}</div>`}</div>
    <div class="field"><label for="fj-n">${t('fj_note')}</label><textarea class="textarea" id="fj-n" data-bind="modal.f.note" placeholder="${t('fj_note_ph')}">${esc(f.note)}</textarea></div></div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="fjCreate">${ic('check',15)} ${t('fj_create')}</button>` }; };
A.fjKindPick = el => { S.ui.modal.f.kind=el.dataset.k; rerender(); };
A.fjTeamPick = el => { const f=S.ui.modal.f; const i=f.team.indexOf(el.dataset.id); if(i>=0) f.team.splice(i,1); else f.team.push(el.dataset.id); rerender(); };
A.fjCreate = () => { const m=S.ui.modal,f=m.f,E={}; if(!f.siteId) E.siteId=t('e_required'); if(!f.team.length) E.team=t('fj_need_team'); m.err=E; if(Object.keys(E).length){ rerender(); return; }
  const date=new Date(f.date+'T'+(f.time||'08:00')+':00').getTime(); const j=fjNew({siteId:f.siteId,kind:f.kind,omId:f.omId||null,date,team:f.team.slice(),note:f.note.trim()}); DB.fjobs=DB.fjobs||[]; DB.fjobs.unshift(j);
  j.team.forEach(uid=>notify({toUser:uid,key:'n_fj_new',vars:{no:j.no,d:fmtD(date),s:(siteById(j.siteId)||{}).name||''}}));
  S.ui.modal=null; save(); toast(t('toast_fj_new',{no:j.no}),'ok'); openTab('fj:'+j.id); };
/* công trình */
A.siteAsk = el => openModal({type:'site',id:(el&&el.dataset&&el.dataset.id)||'',from:(el&&el.dataset&&el.dataset.from)||'',back:S.ui.modal&&S.ui.modal.type==='fjNew'?S.ui.modal:null,f:(()=>{ const s=el&&el.dataset&&el.dataset.id&&siteById(el.dataset.id); return s?{customerId:s.customerId,name:s.name,address:s.address,kwp:s.kwp,contact:s.contact,phone:s.phone,inv:s.inverters.map(i=>i.model+', '+i.sn).join('\n')}:{customerId:((DB.customers||[])[0]||{}).id||'',name:'',address:'',kwp:'',contact:'',phone:'',inv:''}; })(),err:{}});
MODALS.site = m => { const f=m.f,E=m.err||{}; return { title:m.id?t('site_edit'):t('site_new'), body:`<div class="form-grid">
  <div class="field full"><label class="req" for="si-c">${t('customer')}</label><select class="select" id="si-c" data-bind="modal.f.customerId" data-re>${(DB.customers||[]).map(c=>`<option value="${c.id}" ${f.customerId===c.id?'selected':''}>${esc(c.company)}</option>`).join('')}</select></div>
  <div class="field full"><label class="req" for="si-n">${t('site_name')}</label><input class="input ${E.name?'err':''}" id="si-n" data-bind="modal.f.name" value="${esc(f.name)}" placeholder="${t('site_name_ph')}"></div>
  <div class="field full"><label for="si-a">${t('address')}</label><input class="input" id="si-a" data-bind="modal.f.address" value="${esc(f.address)}"></div>
  <div class="field"><label for="si-k">${t('site_kwp')}</label><input class="input num" type="number" id="si-k" data-bind="modal.f.kwp" value="${esc(f.kwp)}"></div><div class="field"><label for="si-p">${t('phone')}</label><input class="input" id="si-p" data-bind="modal.f.phone" value="${esc(f.phone)}"></div>
  <div class="field full"><label for="si-ct">${t('site_contact')}</label><input class="input" id="si-ct" data-bind="modal.f.contact" value="${esc(f.contact)}"></div>
  <div class="field full"><label for="si-i">${t('site_inv')}</label><textarea class="textarea mono" id="si-i" rows="5" data-bind="modal.f.inv" placeholder="SG110CX, A2460104910&#10;SG110CX, A2460104911">${esc(f.inv)}</textarea><div class="hint">${t('site_inv_hint')}</div></div></div>`,
  foot:`<button class="btn" data-a="${m.back?'siteBack':'closeModal'}">${t('cancel')}</button><button class="btn primary" data-a="siteSave">${t('save')}</button>` }; };
A.siteBack = () => { S.ui.modal=S.ui.modal.back; rerender(); };
A.siteSave = () => { const m=S.ui.modal,f=m.f; if(!String(f.name||'').trim()){ m.err={name:t('e_required')}; rerender(); return; } const cu=custById(f.customerId)||{};
  const inv=String(f.inv||'').split(/\n+/).map(l=>l.split(/[,;\t]/).map(x=>x.trim())).filter(a=>a[0]).map(a=>a.length>1?{model:a[0],sn:a[1]}:{model:'',sn:a[0]});
  const data={customerId:f.customerId,name:f.name.trim(),address:f.address||cu.address||'',kwp:Number(f.kwp)||0,contact:f.contact||cu.contact||'',phone:f.phone||cu.phone||'',inverters:inv}; DB.sites=DB.sites||[]; let s;
  if(m.id){ s=siteById(m.id); Object.assign(s,data); } else { s=Object.assign({id:'st'+Date.now().toString(36)},data); DB.sites.push(s); }
  save(); toast(t('toast_saved'),'ok'); if(m.back){ m.back.f.siteId=s.id; S.ui.modal=m.back; } else S.ui.modal=null; rerender(); };
/* hợp đồng bảo trì */
A.omAsk = el => { const o=el&&el.dataset&&el.dataset.id&&omById(el.dataset.id); openModal({type:'om',id:o?o.id:'',f:o?{no:o.no,siteId:o.siteId,cycle:o.cycle,start:toISODate(o.start),end:o.end?toISODate(o.end):'',value:o.value||0}:{no:'BT-'+new Date().getFullYear()+'-'+String((DB.oms||[]).length+1).padStart(2,'0'),siteId:((DB.sites||[])[0]||{}).id||'',cycle:3,start:toISODate(Date.now()),end:toISODate(addMonthsTs(Date.now(),12)),value:0},err:{}}); };
MODALS.om = m => { const f=m.f; return { title:m.id?t('om_edit'):t('om_new'), body:`<div class="form-grid">
  <div class="field"><label for="om-n">${t('om_no')}</label><input class="input mono" id="om-n" data-bind="modal.f.no" value="${esc(f.no)}"></div>
  <div class="field"><label class="req" for="om-s">${t('fj_site')}</label><select class="select" id="om-s" data-bind="modal.f.siteId">${(DB.sites||[]).map(s=>`<option value="${s.id}" ${f.siteId===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
  <div class="field full"><span class="lbl">${t('om_cycle')}</span><div class="seg">${[1,3,6,12].map(c=>`<button class="${+f.cycle===c?'on':''}" data-a="omCycle" data-c="${c}">${t('om_every',{n:c})}</button>`).join('')}</div></div>
  <div class="field"><label for="om-a">${t('om_start')}</label><input class="input" type="date" id="om-a" data-bind="modal.f.start" value="${f.start}"></div><div class="field"><label for="om-b">${t('om_end')}</label><input class="input" type="date" id="om-b" data-bind="modal.f.end" value="${f.end}"></div>
  <div class="field"><label for="om-v">${t('om_value')}</label><input class="input num" type="number" id="om-v" data-bind="modal.f.value" value="${f.value}"></div></div><p class="hint">${t('om_hint')}</p>`,
  foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="omSave">${t('save')}</button>` }; };
A.omCycle = el => { S.ui.modal.f.cycle=+el.dataset.c; rerender(); };
A.omSave = () => { const m=S.ui.modal,f=m.f; if(!f.siteId){ toast(t('fj_site')+': '+t('e_required'),'bad'); return; } const data={no:f.no,siteId:f.siteId,cycle:+f.cycle||3,start:new Date(f.start+'T08:00:00').getTime(),end:f.end?new Date(f.end+'T20:00:00').getTime():null,value:Number(f.value)||0};
  DB.oms=DB.oms||[]; if(m.id) Object.assign(omById(m.id),data); else DB.oms.push(Object.assign({id:'om'+Date.now().toString(36)},data)); S.ui.modal=null; save(); rerender(); toast(t('toast_saved'),'ok'); };
/* ---------- nhập liệu trực tiếp trong phiếu (tự lưu) ---------- */
function setPath(o,p,v){ const k=p.split('.'); let c=o; for(let i=0;i<k.length-1;i++){ c=c[isNaN(k[i])?k[i]:+k[i]]; if(c==null) return; } c[isNaN(k[k.length-1])?k[k.length-1]:+k[k.length-1]]=v; }
document.addEventListener('change', ev=>{ const el=ev.target; const p=el&&el.dataset&&el.dataset.fj; if(!p) return; const j=fjById(el.dataset.id); if(!j) return;
  let v=el.type==='checkbox'?el.checked:el.value; if(el.dataset.num!=null) v=v===''?'':Number(v); if(p==='date') v=new Date(v+'T'+new Date(j.date).toTimeString().slice(0,5)+':00').getTime();
  setPath(j,p,v); j.updatedAt=Date.now(); save(); if(el.dataset.re!=null) rerender(); else { const s=document.querySelector('.fj-saved'); if(s){ s.classList.add('on'); setTimeout(()=>s.classList.remove('on'),1200); } } });
A.fjChk = el => { const j=fjById(el.dataset.id); const c=j.checklist[+el.dataset.i]; c.v=c.v===el.dataset.v?null:el.dataset.v; save(); rerender(); };
A.fjChkAll = el => { const j=fjById(el.dataset.id); j.checklist.forEach(c=>{ if(!c.v) c.v='ok'; }); save(); rerender(); };
A.fjChkAdd = el => { const j=fjById(el.dataset.id); const inp=document.getElementById('chkadd-'+j.id); const l=inp&&inp.value; if(l&&l.trim()){ j.checklist.push({l:l.trim(),v:null,note:''}); save(); rerender(); } else if(inp) inp.focus(); };
A.fjMatAdd = el => { const j=fjById(el.dataset.id); j.materials.push({pn:(DB.stock[0]||{}).pn,qty:1,used:''}); save(); rerender(); };
A.fjMatDel = el => { const j=fjById(el.dataset.id); j.materials.splice(+el.dataset.i,1); save(); rerender(); };
A.fjCostAdd = el => { const j=fjById(el.dataset.id); j.costs.push({type:'travel',amount:'',note:'',by:S.userId}); save(); rerender(); };
A.fjCostDel = el => { const j=fjById(el.dataset.id); j.costs.splice(+el.dataset.i,1); save(); rerender(); };
A.fjReadAdd = el => { const j=fjById(el.dataset.id); j.readings.push({sn:'',model:'',pac:'',eday:'',vdc:'',riso:'',temp:'',err:''}); save(); rerender(); };
const fjImgFn=k=>input=>readFiles(input,'image',arr=>{ const j=fjById(input.dataset.id); if(!j) return; j[k]=(j[k]||[]).concat(arr); save(); rerender(); });
A.fjBefore=fjImgFn('before'); A.fjAfter=fjImgFn('after');
A.fjPaper = input => readFiles(input,'image',arr=>{ const j=fjById(input.dataset.id); j.sign.paper=(j.sign.paper||[]).concat(arr); save(); rerender(); });
A.fjImgDel = el => { const j=fjById(el.dataset.id); j[el.dataset.k].splice(+el.dataset.i,1); save(); rerender(); };
A.fjPaperDel = el => { const j=fjById(el.dataset.id); j.sign.paper.splice(+el.dataset.i,1); save(); rerender(); };
A.fjSignClear = el => { const j=fjById(el.dataset.id); j.sign.img=''; save(); rerender(); };
/* chữ ký trên màn hình */
function bindSigPads(){ document.querySelectorAll('canvas.sigpad[data-sig]').forEach(cv=>{ if(cv._b) return; cv._b=1; const j=fjById(cv.dataset.sig); const ctx=cv.getContext('2d'); const r=cv.getBoundingClientRect(); cv.width=r.width*2; cv.height=r.height*2; ctx.scale(2,2); ctx.lineWidth=2.2; ctx.lineCap='round'; ctx.strokeStyle='#0b2a5b';
  if(j&&j.sign.img){ const im=new Image(); im.onload=()=>ctx.drawImage(im,0,0,r.width,r.height); im.src=j.sign.img; }
  let draw=false, last=null; const pos=e=>{ const b=cv.getBoundingClientRect(); return [e.clientX-b.left,e.clientY-b.top]; };
  cv.addEventListener('pointerdown',e=>{ draw=true; last=pos(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
  cv.addEventListener('pointermove',e=>{ if(!draw) return; const p=pos(e); ctx.beginPath(); ctx.moveTo(last[0],last[1]); ctx.lineTo(p[0],p[1]); ctx.stroke(); last=p; e.preventDefault(); });
  const end=()=>{ if(!draw) return; draw=false; if(j){ j.sign.img=cv.toDataURL('image/png'); j.sign.at=Date.now(); save(); } };
  cv.addEventListener('pointerup',end); cv.addEventListener('pointerleave',end); }); }
const _renderSig=render; render=function(){ const r=_renderSig.apply(this,arguments); try{ bindSigPads(); }catch(e){} return r; };
/* ---------- chuyển trạng thái ---------- */
function fjMissing(j){ const m=[]; if(!(j.before||[]).length) m.push(t('fj_sec_before')); const un=j.checklist.filter(c=>!c.v).length; if(un) m.push(t('fj_miss_chk',{n:un}));
  if(!(j.after||[]).length) m.push(t('fj_sec_after')); if(!String(j.sign.name||'').trim()) m.push(t('fj_sign_name')); if(!j.sign.img&&!(j.sign.paper||[]).length) m.push(t('fj_miss_sign'));
  if(j.materials.length&&j.matIssued&&j.materials.some(x=>x.used===''||x.used==null)) m.push(t('fj_miss_used')); return m; }
A.fjGo = el => { const j=fjById(el.dataset.id); const to=el.dataset.to; const now=Date.now();
  if(to==='onsite'){ j.status='onsite'; j.checkin=now; fjLog(j,'onsite'); }
  else if(to==='done'){ const miss=fjMissing(j); if(miss.length){ S.ui['fjm_'+j.id]=1; rerender(); toast(t('fj_miss',{m:miss.join(', ')}),'bad'); return; } j.status='done'; j.doneAt=now; fjLog(j,'done'); notify({toRole:'manager',key:'n_fj_done',vars:{no:j.no,s:(siteById(j.siteId)||{}).name||''}}); }
  else if(to==='closed'){ const bad=j.costs.filter(c=>!(Number(c.amount)>0)); if(bad.length){ toast(t('fj_cost_bad'),'bad'); return; } const noimg=j.costs.filter(c=>!(c.images||[]).length); if(noimg.length){ toast(t('fj_cost_noimg',{n:noimg.length}),'bad'); return; }
    const site=siteById(j.siteId)||{}; j.materials.forEach(x=>{ if(!j.matIssued) return; const back=Math.max(0,(Number(x.qty)||0)-(Number(x.used)||0)); if(back>0){ const s=stockBy(x.pn); if(s){ s.qty+=back; logMove('in',x.pn,back,{kind:'fj',id:j.id},t('fj_mv_back',{no:j.no})); } } });
    j.costs.forEach(c=>{ DB.expenses.unshift({ id:'ex'+Date.now().toString(36)+Math.random().toString(36).slice(2,4), no:erpNo('CP'), at:now, cat:c.type==='shipping'?'shipping':'travel', amount:Number(c.amount), desc:{vi:`${t('fjc_'+c.type)} – ${j.no} ${site.name||''}${c.note?' · '+c.note:''}`,en:`${t('fjc_'+c.type)} – ${j.no}`}, ticketId:null, fjId:j.id, images:(c.images||[]).slice(), docType:c.docType||'none', sn:'', svcId:null, by:c.by||S.userId, status:'pending', approvedBy:null, paidAt:null, method:'bank' }); });
    if(j.costs.length) notify({toRole:'manager',key:'n_exp',vars:{no:j.no,s:t('ex_pending')}});
    j.status='closed'; j.closedAt=now; fjLog(j,'closed'); }
  else if(to==='cancelled'){ if(S.ui.fjCx!==j.id){ S.ui.fjCx=j.id; rerender(); toast(t('fj_cancel_q'),'bad'); return; } S.ui.fjCx=null; j.status='cancelled'; fjLog(j,'cancelled'); }
  save(); rerender(); toast(t('toast_fj_'+j.status),'ok'); };
A.fjIssue = el => { const j=fjById(el.dataset.id); const short=j.materials.filter(x=>{ const s=stockBy(x.pn); return !s||s.qty<(Number(x.qty)||0); }); if(short.length){ toast(t('insufficient_stock',{p:short.map(x=>x.pn).join(', ')}),'bad'); return; }
  j.materials.forEach(x=>{ const s=stockBy(x.pn); const q=Number(x.qty)||0; if(s&&q>0){ s.qty-=q; logMove('out',x.pn,q,{kind:'fj',id:j.id},t('fj_mv_out',{no:j.no})); } }); j.matIssued=true; j.matIssuedAt=Date.now(); j.matIssuedBy=S.userId; fjLog(j,'mat'); save(); rerender(); toast(t('toast_fj_mat'),'ok'); };
A.fjPrint = el => { const j=fjById(el.dataset.id); printDoc(`<style>${DOC_CSS}</style>`+fjDoc(j), j.no); };
/* ---------- biên bản in ---------- */
function fjDoc(j){ const s=siteById(j.siteId)||{}; const cu=custById(j.customerId)||{}; const om=j.omId&&omById(j.omId); const chkMark={ok:'✔ Đạt',ng:'✘ Không đạt',na:'— Không áp dụng'};
  const photos=arr=>(arr||[]).slice(0,6).map(a=>`<img src="${PENDING_FILES[a.id]||imgSrc(a)}" style="width:31%;height:120px;object-fit:cover;margin:0 1% 6px 0;border:1px solid #999">`).join('');
  return `<div class="a4 sgedoc"><table class="lh"><tr><td style="width:24%"><img src="${SGE_LOGO}" alt="SGE" style="height:72px"></td><td><b style="font-size:15px">${SGE_CO.name}</b><br>Địa chỉ: ${SGE_CO.addr}<br>MST: ${SGE_CO.mst} · Hotline: ${SGE_CO.phone}</td></tr></table>
  <h2 class="ttl">BIÊN BẢN ${j.kind==='pm'?'BẢO TRÌ ĐỊNH KỲ':j.kind==='repair'?'SỬA CHỮA TẠI CÔNG TRÌNH':j.kind==='install'?'LẮP ĐẶT, NGHIỆM THU':'KHẢO SÁT HIỆN TRẠNG'} HỆ THỐNG ĐIỆN MẶT TRỜI</h2><p class="c" style="margin:0 0 8px">Số: <b>${esc(j.no)}</b>${om?` · Theo hợp đồng bảo trì số <b>${esc(om.no)}</b>`:''}</p>
  <table class="info"><tr><td style="width:24%">Khách hàng</td><td>: <b>${esc(cu.company||'')}</b></td></tr><tr><td>Công trình</td><td>: ${esc(s.name||'')}${s.kwp?` (${fmtNum(s.kwp)} kWp)`:''}</td></tr><tr><td>Địa điểm</td><td>: ${esc(s.address||'')}</td></tr>
  <tr><td>Thời gian</td><td>: ${j.checkin?fmtDT(j.checkin):fmtDT(j.date)}${j.doneAt?' → '+fmtDT(j.doneAt):''}</td></tr><tr><td>Nhân sự SGE</td><td>: ${j.team.map(u=>esc(uname(u))).join(', ')}</td></tr></table>
  <p class="art">1. Nội dung kiểm tra, thực hiện</p><table class="grid dg"><tr><th style="width:6%">TT</th><th>Hạng mục</th><th style="width:18%">Kết quả</th><th style="width:28%">Ghi chú</th></tr>${j.checklist.map((c,i)=>`<tr><td class="c">${i+1}</td><td>${esc(c.l)}</td><td class="c">${c.v?chkMark[c.v]:''}</td><td>${esc(c.note||'')}</td></tr>`).join('')}</table>
  ${j.readings.length&&j.kind!=='install'?`<p class="art">2. Thông số vận hành biến tần</p><table class="grid dg"><tr><th>Model / Serial</th>${FJ_READ.map(([k,u])=>`<th>${t('fjr_'+k)}${u?' ('+u+')':''}</th>`).join('')}</tr>${j.readings.map(r=>`<tr><td>${esc(r.model)} <span style="font-family:monospace">${esc(r.sn)}</span></td>${FJ_READ.map(([k])=>`<td class="c">${esc(r[k]??'')}</td>`).join('')}</tr>`).join('')}</table>`:''}
  ${j.materials.length&&j.matIssued?`<p class="art">3. Vật tư sử dụng</p><table class="grid dg"><tr><th>Mã</th><th>Tên</th><th style="width:14%">Số lượng</th></tr>${j.materials.filter(x=>Number(x.used)>0).map(x=>`<tr><td>${esc(x.pn)}</td><td>${esc(partName(x.pn))}</td><td class="c">${x.used}</td></tr>`).join('')}</table>`:''}
  <p class="art">4. Đánh giá, phát hiện</p><p>${esc(j.findings||'—').replace(/\n/g,'<br>')}</p><p class="art">5. Kiến nghị</p><p>${esc(j.recommend||'—').replace(/\n/g,'<br>')}</p>
  ${(j.before||[]).length||(j.after||[]).length?`<p class="art">6. Hình ảnh</p>${(j.before||[]).length?`<p><i>Trước khi thực hiện</i></p>${photos(j.before)}`:''}${(j.after||[]).length?`<p><i>Sau khi thực hiện</i></p>${photos(j.after)}`:''}`:''}
  <p>Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản.</p>
  <table class="sign"><tr><td><b>ĐẠI DIỆN KHÁCH HÀNG</b><br><i>${esc(j.sign.title||'')}</i></td><td><b>ĐẠI DIỆN SGE</b></td></tr><tr><td class="s">${j.sign.img?`<img src="${j.sign.img}" alt="">`:''}</td><td class="s"></td></tr><tr><td><b>${esc(String(j.sign.name||'').toUpperCase())}</b></td><td><b>${esc(String(uname(j.leader||j.team[0])||'').toUpperCase())}</b></td></tr></table></div>`; }
/* ---------- trang phiếu công tác ---------- */
function fjFlow(j){ const idx=j.status==='cancelled'?-1:FJ_ST.indexOf(j.status); const at={planned:j.createdAt,onsite:j.checkin,done:j.doneAt,closed:j.closedAt}; const icn={planned:'clock',onsite:'wrench',done:'check',closed:'file'};
  return `<div class="tkflow"><div class="tkflow-head"><div class="tf-now"><span class="tf-k">${t('fj_flow')}</span><b>${j.status==='cancelled'?t('fjs_cancelled'):j.status==='closed'?t('fjs_closed'):t('flow_step',{i:idx+1,n:4})+' · '+t('fjs_'+j.status)}</b></div></div>
  <ol class="tf-steps" style="--n:4">${FJ_ST.map((s,i)=>{ const st=j.status==='cancelled'?'todo':(i<idx||j.status==='closed')?'done':i===idx?'cur':'todo'; return `<li class="tf-${st}" ${st==='cur'?'aria-current="step"':''}><span class="tf-dot">${st==='done'?ic('check',15):ic(icn[s],15)}</span><span class="tf-lb">${t('fjs_'+s)}</span><small class="tf-dt">${st!=='todo'&&at[s]?fmtD(at[s]):'&nbsp;'}</small></li>`; }).join('')}</ol></div>`; }
function imgGrid(j,k,edit,fileFn,label){ const arr=j[k]||[]; return `<div class="payimgs">${arr.map((a,i)=>`<div class="payimg"><button type="button" class="msg-img" style="width:100%;height:100%;border:0" data-a="imgView" data-f="${a.id}"><img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt=""></button>${edit?`<button type="button" class="icon-btn" data-a="fjImgDel" data-id="${j.id}" data-k="${k}" data-i="${i}" aria-label="${t('delete')}">${ic('x',13)}</button>`:''}</div>`).join('')}${edit?`<label class="payimg-add">${ic('upload',18)}<span>${label}</span><input type="file" accept="image/*" capture="environment" multiple data-file="${fileFn}" data-id="${j.id}" hidden></label>`:''}${!arr.length&&!edit?`<span class="muted">—</span>`:''}</div>`; }
function viewFj(id){ const j=fjById(id); if(!j) return `<div class="card empty">${t('no_results')}</div>`; const s=siteById(j.siteId)||{}; const cu=custById(j.customerId)||{}; const om=j.omId&&omById(j.omId);
  const mine=canFj(j); const edit=mine&&j.status==='onsite'; const prep=mine&&j.status==='planned'; const showMiss=S.ui['fjm_'+j.id]; const miss=j.status==='onsite'?fjMissing(j):[];
  const sec=(n,title,body,hint,ok)=>`<section class="card fj-sec ${ok?'ok':''}"><div class="card-h"><h3><span class="fj-n">${ok?ic('check',13):n}</span>${title}</h3>${hint?`<span class="hint">${hint}</span>`:''}</div><div class="card-b">${body}</div></section>`;
  const head=`<div class="card fj-head"><div class="fj-top"><div><div class="row" style="gap:8px;flex-wrap:wrap"><span class="mono muted">${esc(j.no)}</span>${fjKind(j.kind)}${fjPill(j)}${fjLate(j)?`<span class="kst k-bad">${t('fj_late')}</span>`:''}</div><h2 style="margin:6px 0 2px">${esc(s.name||'—')}</h2><div class="muted">${esc(cu.company||'')}${s.kwp?` · ${fmtNum(s.kwp)} kWp`:''}${om?` · ${t('fj_om')} <b class="mono">${esc(om.no)}</b>`:''}</div></div>
    <div class="row" style="gap:8px;flex-wrap:wrap">${['done','closed'].includes(j.status)||j.status==='onsite'?`<button class="btn" data-a="fjPrint" data-id="${j.id}">${ic('print',15)} ${t('fj_print')}</button>`:''}${prep?`<button class="btn danger" data-a="fjGo" data-to="cancelled" data-id="${j.id}">${S.ui.fjCx===j.id?t('fj_cancel_again'):t('fj_cancel')}</button>`:''}</div></div>
    <div class="fj-info"><div><span>${ic('clock',14)} ${t('fj_date')}</span>${prep?`<input class="input sm" type="date" data-fj="date" data-id="${j.id}" data-re value="${toISODate(j.date)}">`:`<b>${fmtDT(j.date)}</b>`}</div><div><span>${ic('globe',14)} ${t('address')}</span><b>${esc(s.address||'—')}</b>${s.address?` <a class="link-btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}" target="_blank" rel="noopener">${t('fj_map')}</a>`:''}</div>
    <div><span>${ic('msg',14)} ${t('site_contact')}</span><b>${esc(s.contact||'—')}</b>${s.phone?` · <a href="tel:${esc(s.phone)}">${esc(s.phone)}</a>`:''}</div><div><span>${ic('wrench',14)} ${t('fj_team')}</span><b>${j.team.map(u=>esc(uname(u))).join(', ')}</b></div></div>
    ${j.note?`<p class="quote" style="margin:12px 0 0">${esc(j.note)}</p>`:''}${fjFlow(j)}</div>`;
  /* chuẩn bị: vật tư + bắt đầu */
  const matRows=j.materials.map((x,i)=>{ const st=stockBy(x.pn); return `<tr><td>${prep&&!j.matIssued?`<select class="select sm" data-fj="materials.${i}.pn" data-id="${j.id}" data-re>${DB.stock.map(z=>`<option value="${z.pn}" ${x.pn===z.pn?'selected':''}>${z.pn} · ${esc(z.name)}</option>`).join('')}</select>`:`<span class="mono">${esc(x.pn)}</span> ${esc(partName(x.pn))}`}</td>
    <td class="r">${prep&&!j.matIssued?`<input class="input sm num" style="width:80px" type="number" min="1" data-fj="materials.${i}.qty" data-num data-id="${j.id}" value="${x.qty}">`:x.qty}</td><td class="r muted">${st?fmtNum(st.qty):'—'}</td>
    <td class="r">${edit&&j.matIssued?`<input class="input sm num" style="width:80px" type="number" min="0" max="${x.qty}" data-fj="materials.${i}.used" data-num data-id="${j.id}" value="${x.used}">`:(x.used===''?'—':x.used)}</td><td>${prep&&!j.matIssued?`<button class="icon-btn" data-a="fjMatDel" data-id="${j.id}" data-i="${i}" aria-label="${t('delete')}">${ic('trash',14)}</button>`:''}</td></tr>`; }).join('');
  const matTbl=`<div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl compact"><thead><tr><th>${t('item_name')}</th><th class="r">${t('fj_mat_take')}</th><th class="r">${t('on_hand')}</th><th class="r">${t('fj_mat_used')}</th><th></th></tr></thead><tbody>${matRows||`<tr><td colspan="5" class="muted">${t('fj_mat_none')}</td></tr>`}</tbody></table></div>
    <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">${prep&&!j.matIssued?`<button class="btn sm soft" data-a="fjMatAdd" data-id="${j.id}">${ic('plus',14)} ${t('fj_mat_add')}</button>`:''}${!j.matIssued&&j.materials.length&&can('stock_move')&&['planned','onsite'].includes(j.status)?`<button class="btn sm primary" data-a="fjIssue" data-id="${j.id}">${ic('upload',14)} ${t('fj_mat_issue')}</button>`:''}${j.matIssued?`<span class="hint">${t('fj_mat_issued',{u:esc(uname(j.matIssuedBy)),d:fmtDT(j.matIssuedAt)})}</span>`:j.materials.length?`<span class="hint">${t('fj_mat_wait')}</span>`:''}</div>`;
  let body='';
  if(j.status==='planned'){ body+=sec(1,t('fj_sec_mat'),matTbl,t('fj_sec_mat_h'),j.matIssued||!j.materials.length);
    body+=`<section class="card fj-go"><div class="card-b"><div><b>${t('fj_go_title')}</b><p class="muted" style="margin:4px 0 0">${t('fj_go_hint')}</p></div>${mine?`<button class="btn primary lg" data-a="fjGo" data-to="onsite" data-id="${j.id}">${ic('play',16)} ${t('fj_go_btn')}</button>`:`<span class="hint">${t('fj_not_team')}</span>`}</div></section>`; }
  if(['onsite','done','closed'].includes(j.status)){
    const chk=j.checklist.map((c,i)=>`<div class="chk ${c.v||''}"><div class="chk-l"><span class="chk-i">${i+1}</span>${esc(c.l)}</div><div class="chk-b">${['ok','ng','na'].map(v=>`<button class="cb-${v} ${c.v===v?'on':''}" ${edit?`data-a="fjChk" data-id="${j.id}" data-i="${i}" data-v="${v}"`:'disabled'}>${t('fjv_'+v)}</button>`).join('')}</div>${(c.v==='ng'||c.note)?`<input class="input sm chk-n" placeholder="${t('fj_chk_note_ph')}" ${edit?`data-fj="checklist.${i}.note" data-id="${j.id}"`:'readonly'} value="${esc(c.note||'')}">`:''}</div>`).join('');
    const doneChk=j.checklist.filter(c=>c.v).length;
    body+=sec(1,t('fj_sec_before'),imgGrid(j,'before',edit,'fjBefore',t('fj_take_photo')),t('fj_sec_before_h'),(j.before||[]).length);
    body+=sec(2,t('fj_sec_chk')+` <small class="muted">(${doneChk}/${j.checklist.length})</small>`,`<div class="chk-list">${chk}</div>${edit?`<div class="row" style="gap:8px;margin-top:10px"><button class="btn sm soft" data-a="fjChkAll" data-id="${j.id}">${t('fj_chk_all')}</button><input class="input sm" id="chkadd-${j.id}" placeholder="${t('fj_chk_add_ph')}" style="max-width:260px"><button class="btn sm" data-a="fjChkAdd" data-id="${j.id}">${ic('plus',13)} ${t('fj_chk_add')}</button></div>`:''}`,t('fj_sec_chk_h'),doneChk===j.checklist.length);
    if(j.kind!=='install') body+=sec(3,t('fj_sec_read'),`<div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl compact readings"><thead><tr><th>${t('serial_no')}</th>${FJ_READ.map(([k,u])=>`<th>${t('fjr_'+k)}${u?` <small>${u}</small>`:''}</th>`).join('')}</tr></thead><tbody>${j.readings.map((r,i)=>`<tr><td>${edit&&!r.sn?`<input class="input sm mono" data-fj="readings.${i}.sn" data-id="${j.id}" value="${esc(r.sn)}" placeholder="Serial">`:`<span class="mono">${esc(r.sn)}</span><br><small class="muted">${esc(r.model)}</small>`}</td>${FJ_READ.map(([k])=>`<td>${edit?`<input class="input sm ${k==='err'?'':'num'}" style="width:${k==='err'?'90':'72'}px" data-fj="readings.${i}.${k}" data-id="${j.id}" value="${esc(r[k]??'')}" inputmode="${k==='err'?'text':'decimal'}">`:esc(r[k]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${edit?`<button class="btn sm soft" style="margin-top:8px" data-a="fjReadAdd" data-id="${j.id}">${ic('plus',13)} ${t('fj_read_add')}</button>`:''}`,t('fj_sec_read_h'));
    if(j.materials.length) body+=sec(4,t('fj_sec_mat'),matTbl,t('fj_sec_used_h'),j.matIssued&&j.materials.every(x=>x.used!==''&&x.used!=null));
    body+=sec(5,t('fj_sec_find'),`<div class="form-grid"><div class="field full"><label>${t('fj_findings')}</label><textarea class="textarea" ${edit?`data-fj="findings" data-id="${j.id}"`:'readonly'} placeholder="${t('fj_findings_ph')}">${esc(j.findings)}</textarea></div><div class="field full"><label>${t('fj_recommend')}</label><textarea class="textarea" ${edit?`data-fj="recommend" data-id="${j.id}"`:'readonly'} placeholder="${t('fj_recommend_ph')}">${esc(j.recommend)}</textarea></div></div>`,'',String(j.findings).trim());
    body+=sec(6,t('fj_sec_after'),imgGrid(j,'after',edit,'fjAfter',t('fj_take_photo')),t('fj_sec_after_h'),(j.after||[]).length);
    body+=sec(7,t('fj_sec_sign'),`<div class="form-grid"><div class="field"><label class="req">${t('fj_sign_name')}</label><input class="input" ${edit?`data-fj="sign.name" data-id="${j.id}"`:'readonly'} value="${esc(j.sign.name)}"></div><div class="field"><label>${t('fj_sign_title')}</label><input class="input" ${edit?`data-fj="sign.title" data-id="${j.id}"`:'readonly'} value="${esc(j.sign.title)}"></div></div>
      <div class="sig-wrap">${edit?`<canvas class="sigpad" data-sig="${j.id}"></canvas><div class="row" style="justify-content:space-between;margin-top:6px"><span class="hint">${t('fj_sign_hint')}</span><button class="btn sm" data-a="fjSignClear" data-id="${j.id}">${t('fj_sign_clear')}</button></div>`:j.sign.img?`<img class="sigimg" src="${j.sign.img}" alt="">`:'<span class="muted">—</span>'}</div>
      <div class="field" style="margin-top:10px"><span class="lbl">${t('fj_paper')}</span><div class="payimgs">${(j.sign.paper||[]).map((a,i)=>`<div class="payimg"><img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt="">${edit?`<button type="button" class="icon-btn" data-a="fjPaperDel" data-id="${j.id}" data-i="${i}">${ic('x',13)}</button>`:''}</div>`).join('')}${edit?`<label class="payimg-add">${ic('upload',18)}<span>${t('fj_take_photo')}</span><input type="file" accept="image/*" capture="environment" data-file="fjPaper" data-id="${j.id}" hidden></label>`:''}</div></div>`,t('fj_sec_sign_h'),String(j.sign.name).trim()&&(j.sign.img||(j.sign.paper||[]).length));
    if(j.status==='onsite') body+=`<section class="card fj-go ${showMiss&&miss.length?'warn':''}"><div class="card-b"><div><b>${t('fj_finish_title')}</b><p class="muted" style="margin:4px 0 0">${miss.length?t('fj_still',{m:miss.join(' · ')}):t('fj_ready')}</p><span class="fj-saved">${ic('check',13)} ${t('fj_autosaved')}</span></div>${mine?`<button class="btn primary lg" data-a="fjGo" data-to="done" data-id="${j.id}" ${miss.length?'':''}>${ic('check',16)} ${t('fj_finish_btn')}</button>`:''}</div></section>`;
    if(['done','closed'].includes(j.status)){ const cedit=j.status==='done'&&(mine||isBossRole(me()));
      const costRows=j.costs.map((c,i)=>`<tr><td>${cedit?`<select class="select sm" data-fj="costs.${i}.type" data-id="${j.id}">${FJ_COST.map(k=>`<option value="${k}" ${c.type===k?'selected':''}>${t('fjc_'+k)}</option>`).join('')}</select>`:t('fjc_'+c.type)}</td><td class="r">${cedit?`<input class="input sm num" style="width:130px" type="number" data-fj="costs.${i}.amount" data-num data-id="${j.id}" data-re value="${c.amount}">`:money(c.amount)}</td><td>${cedit?`<input class="input sm" data-fj="costs.${i}.note" data-id="${j.id}" value="${esc(c.note)}">`:esc(c.note||'')}</td><td class="fj-cimg">${(c.images||[]).map((a,k)=>`<span class="payimg sm"><img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt="">${cedit?`<button type="button" class="icon-btn" data-a="fjCostImgDel" data-id="${j.id}" data-i="${i}" data-k="${k}">${ic('x',11)}</button>`:''}</span>`).join('')}${cedit?`<label class="payimg-add sm ${(c.images||[]).length?'':'err'}">${ic('upload',14)}<input type="file" accept="image/*" capture="environment" multiple data-file="fjCostImg" data-id="${j.id}" data-i="${i}" hidden></label>`:''}</td><td>${cedit?`<button class="icon-btn" data-a="fjCostDel" data-id="${j.id}" data-i="${i}">${ic('trash',14)}</button>`:''}</td></tr>`).join('');
      const back=j.matIssued?j.materials.map(x=>({pn:x.pn,q:Math.max(0,(Number(x.qty)||0)-(Number(x.used)||0))})).filter(x=>x.q>0):[];
      body+=sec(8,t('fj_sec_close'),`<div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl compact"><thead><tr><th>${t('fj_cost_type')}</th><th class="r">${t('amount')}</th><th>${t('note_l')}</th><th>${t('fj_cost_img')}</th><th></th></tr></thead><tbody>${costRows||`<tr><td colspan="5" class="muted">${t('fj_cost_none')}</td></tr>`}${j.costs.length?`<tr><td class="r"><b>${t('grand_total')}</b></td><td class="r"><b>${money(j.costs.reduce((a,c)=>a+(Number(c.amount)||0),0))}</b></td><td colspan="2"></td></tr>`:''}</tbody></table></div>
        ${cedit?`<button class="btn sm soft" style="margin-top:8px" data-a="fjCostAdd" data-id="${j.id}">${ic('plus',13)} ${t('fj_cost_add')}</button>`:''}${back.length?`<p class="hint" style="margin-top:10px">${t('fj_back_hint',{p:back.map(x=>x.pn+' ×'+x.q).join(', ')})}</p>`:''}
        ${cedit?`<div class="row" style="margin-top:14px"><button class="btn primary" data-a="fjGo" data-to="closed" data-id="${j.id}">${ic('check',15)} ${t('fj_close_btn')}</button></div>`:j.status==='closed'?`<p class="hint" style="margin-top:10px">${t('fj_closed_at',{d:fmtDT(j.closedAt)})}</p>`:''}`,t('fj_sec_close_h'),j.status==='closed'); } }
  return `<div class="fj-page">${head}${body}</div>`; }
/* ---------- trang tổng Công trình ---------- */
function fjRow(j){ const s=siteById(j.siteId)||{}; return `<button class="fj-row" data-a="nav" data-k="fj:${j.id}"><div class="fj-date"><b>${new Date(j.date).getDate()}</b><small>T${new Date(j.date).getMonth()+1}</small></div><div class="fj-main"><div class="row" style="gap:6px;flex-wrap:wrap">${fjKind(j.kind)}${fjPill(j)}${fjLate(j)?`<span class="kst k-bad">${t('fj_late')}</span>`:''}</div><b>${esc(s.name||'—')}</b><small class="muted">${esc(j.no)} · ${new Date(j.date).toTimeString().slice(0,5)} · ${j.team.map(u=>esc(uname(u).replace(/^KTV /,''))).join(', ')}</small></div><span class="fj-go-i">${ic('right',16)}</span></button>`; }
function viewField(){ const f=S.ui.fld||(S.ui.fld={tab:'cal',mine:me().role==='engineer'}); const u=me(); const now=Date.now(); const t0=dayStart(now);
  let jobs=(DB.fjobs||[]).filter(j=>j.status!=='cancelled'); if(f.mine) jobs=jobs.filter(j=>j.team.includes(u.id));
  const late=jobs.filter(fjLate), today=jobs.filter(j=>['planned','onsite'].includes(j.status)&&dayStart(j.date)===t0&&!fjLate(j)), onsite=jobs.filter(j=>j.status==='onsite'&&dayStart(j.date)!==t0);
  const soon=jobs.filter(j=>j.status==='planned'&&dayStart(j.date)>t0).sort((a,b)=>a.date-b.date), toClose=jobs.filter(j=>j.status==='done'), closed=jobs.filter(j=>j.status==='closed').sort((a,b)=>b.date-a.date).slice(0,6);
  const due=(DB.oms||[]).map(o=>({o,d:omDue(o)})).filter(x=>x.d&&x.d-now<14*DAYMS&&!(DB.fjobs||[]).some(j=>j.omId===x.o.id&&j.status==='planned')).sort((a,b)=>a.d-b.d);
  const mg=isBossRole(u)||can('ticket_assign');
  const grp=(title,arr,cls)=>arr.length?`<div class="fj-grp ${cls||''}"><h4>${title} <span>${arr.length}</span></h4>${arr.map(fjRow).join('')}</div>`:'';
  const tabs=`<div class="dtabs">${[['cal',t('fl_tab_cal'),jobs.filter(j=>j.status!=='closed').length],['sites',t('fl_tab_sites'),(DB.sites||[]).length],['oms',t('fl_tab_oms'),(DB.oms||[]).length]].map(([k,l,n])=>`<button class="${f.tab===k?'on':''}" data-a="fldTab" data-k="${k}">${l}<span class="cnt">${n}</span></button>`).join('')}</div>`;
  let body='';
  if(f.tab==='cal') body=`<div class="toolbar"><label class="row" style="gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" data-bind="fld.mine" data-re ${f.mine?'checked':''}> ${t('fl_mine')}</label></div><div class="card-b">
    ${due.length&&mg?`<div class="fj-grp due"><h4>${t('fl_due')} <span>${due.length}</span></h4>${due.map(x=>{ const s=siteById(x.o.siteId)||{}; return `<div class="fj-row as-div"><div class="fj-date"><b>${new Date(x.d).getDate()}</b><small>T${new Date(x.d).getMonth()+1}</small></div><div class="fj-main"><div>${fjKind('pm')} <span class="kst ${x.d<now?'k-bad':'k-warn'}">${x.d<now?t('fl_overdue'):t('fl_due_in',{n:Math.max(0,Math.ceil((x.d-now)/DAYMS))})}</span></div><b>${esc(s.name||'')}</b><small class="muted">${esc(x.o.no)} · ${t('om_every',{n:x.o.cycle})}</small></div><button class="btn sm primary" data-a="fjNewAsk" data-site="${x.o.siteId}" data-om="${x.o.id}" data-kind="pm" data-date="${Math.max(x.d,now+DAYMS)}">${t('fl_schedule')}</button></div>`; }).join('')}</div>`:''}
    ${grp(t('fl_late'),late,'bad')}${grp(t('fl_today'),today.concat(onsite),'today')}${grp(t('fl_to_close'),toClose,'warn')}${grp(t('fl_soon'),soon)}${grp(t('fl_closed'),closed,'muted')}
    ${!late.length&&!today.length&&!soon.length&&!toClose.length&&!onsite.length&&!due.length?`<div class="empty">${t('fl_empty')}</div>`:''}</div>`;
  if(f.tab==='sites') body=(DB.sites||[]).length?`<div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('site_name')}</th><th>${t('customer')}</th><th class="r">kWp</th><th class="r">${t('fl_inv_n')}</th><th>${t('fj_om')}</th><th>${t('fl_last')}</th><th>${t('fl_next')}</th><th></th></tr></thead><tbody>${(DB.sites||[]).map(s=>{ const om=(DB.oms||[]).find(o=>o.siteId===s.id); const js=(DB.fjobs||[]).filter(j=>j.siteId===s.id&&j.status==='closed').sort((a,b)=>b.date-a.date); const nx=(DB.fjobs||[]).filter(j=>j.siteId===s.id&&j.status==='planned').sort((a,b)=>a.date-b.date)[0];
    return `<tr><td data-l="${t('site_name')}"><b>${esc(s.name)}</b><br><small class="muted">${esc(s.address)}</small></td><td data-l="${t('customer')}">${esc(custName(s.customerId))}</td><td data-l="kWp" class="r num">${fmtNum(s.kwp||0)}</td><td data-l="${t('fl_inv_n')}" class="r num">${(s.inverters||[]).length}</td><td data-l="${t('fj_om')}">${om?`<span class="mono">${esc(om.no)}</span><br><small class="muted">${t('om_every',{n:om.cycle})}</small>`:'—'}</td><td data-l="${t('fl_last')}" class="num">${js[0]?`<button class="link-btn" data-a="nav" data-k="fj:${js[0].id}">${fmtD(js[0].date)}</button>`:'—'}</td><td data-l="${t('fl_next')}" class="num">${nx?`<button class="link-btn" data-a="nav" data-k="fj:${nx.id}">${fmtD(nx.date)}</button>`:om&&omDue(om)?`<span class="muted">${fmtD(omDue(om))}</span>`:'—'}</td>
      <td class="nowrap">${mg?`<button class="btn sm" data-a="siteAsk" data-id="${s.id}">${ic('edit',13)}</button> <button class="btn sm primary" data-a="fjNewAsk" data-site="${s.id}">${t('fl_new_job')}</button>`:''}</td></tr>`; }).join('')}</tbody></table></div>`:`<div class="empty">${t('fl_no_sites')}</div>`;
  if(f.tab==='oms') body=(DB.oms||[]).length?`<div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('om_no')}</th><th>${t('fj_site')}</th><th>${t('om_cycle')}</th><th>${t('om_term')}</th><th class="r">${t('om_value')}</th><th class="r">${t('fl_done_n')}</th><th>${t('fl_next')}</th><th></th></tr></thead><tbody>${(DB.oms||[]).map(o=>{ const s=siteById(o.siteId)||{}; const n=(DB.fjobs||[]).filter(j=>j.omId===o.id&&j.status==='closed').length; const d=omDue(o);
    return `<tr><td data-l="${t('om_no')}" class="mono">${esc(o.no)}</td><td data-l="${t('fj_site')}">${esc(s.name||'')}</td><td data-l="${t('om_cycle')}">${t('om_every',{n:o.cycle})}</td><td data-l="${t('om_term')}" class="num nowrap">${fmtD(o.start)} – ${o.end?fmtD(o.end):'…'}</td><td data-l="${t('om_value')}" class="r num">${o.value?money(o.value):'—'}</td><td data-l="${t('fl_done_n')}" class="r num">${n}</td><td data-l="${t('fl_next')}" class="num">${d?`<span style="${d<now?'color:var(--bad);font-weight:600':''}">${fmtD(d)}</span>`:t('om_ended')}</td><td class="nowrap">${mg?`<button class="btn sm" data-a="omAsk" data-id="${o.id}">${ic('edit',13)}</button>`:''}</td></tr>`; }).join('')}</tbody></table></div>`:`<div class="empty">${t('fl_no_oms')}</div>`;
  const st=(l,v,c)=>`<div class="card stat"><div class="l">${l}</div><div class="v" ${c?`style="color:${c}"`:''}>${v}</div></div>`;
  return `<div class="page-head"><div><h1>${t('nav_field')}</h1><div class="sub">${t('fl_sub')}</div></div><div class="row">${mg?`<button class="btn" data-a="siteAsk">${ic('plus',15)} ${t('site_new')}</button><button class="btn" data-a="omAsk">${ic('plus',15)} ${t('om_new')}</button>`:''}<button class="btn primary" data-a="fjNewAsk">${ic('plus',15)} ${t('fj_new')}</button></div></div>
    <div class="stat-row task-stats">${st(t('fl_today'),today.length+onsite.length,'var(--blue)')}${st(t('fl_late'),late.length,late.length?'var(--bad)':'')}${st(t('fl_to_close'),toClose.length,toClose.length?'var(--warn)':'')}${st(t('fl_due'),due.length,due.length?'var(--accent-ink)':'')}</div>
    <div class="card">${tabs}${body}</div>`; }
A.fldTab = el => { S.ui.fld.tab=el.dataset.k; rerender(); };
/* ---------- đăng ký trang ---------- */
const _erpViewF=erpView; erpView=function(k){ if(k==='field'){ seedField(); return viewField(); } if(k.startsWith('fj:')){ seedField(); return viewFj(k.slice(3)); } return _erpViewF(k); };
const _tabAllowedF=tabAllowed; tabAllowed=function(k,u=me()){ if(k==='field'||k.startsWith('fj:')) return !!u&&!isExternal(u); return _tabAllowedF(k,u); };
const _tabTitleF=tabTitle; tabTitle=function(k){ if(k==='field') return t('nav_field'); if(k.startsWith('fj:')){ const j=fjById(k.slice(3)); return j?j.no:'?'; } return _tabTitleF(k); };
const _activeNavF=activeNavKey; activeNavKey=function(){ if(S.active&&S.active.startsWith('fj:')) return 'field'; return _activeNavF(); };
['manager','dev'].forEach(r=>{ const n=ROLE_NAV[r]; if(n&&!n.includes('field')) n.splice(n.indexOf('tickets')+1,0,'field'); });
['engineer'].forEach(r=>{ const n=ROLE_NAV[r]; if(n&&!n.includes('field')) n.splice(n.indexOf('tickets')+1,0,'field'); });
['warehouse'].forEach(r=>{ const n=ROLE_NAV[r]; if(n&&!n.includes('field')) n.push('field'); });
Object.keys(ROLE_NAV).forEach(r=>{ ROLE_NAV[r]=ROLE_NAV[r].filter(k=>k!=='rma'); });
const _navField=navItems; navItems=function(u=me()){ const strip=n=>n.k!=='rma'; let r=_navField(u).filter(strip).map(n=>n.more?Object.assign({},n,{more:n.more.filter(strip)}):n);
  if(u&&!isExternal(u)&&!r.some(n=>n.k==='field')&&!(r.find(n=>n.more)||{more:[]}).more.some(n=>n.k==='field')){ const it={k:'field',l:t('nav_field')}; const i=r.findIndex(n=>n.k==='tickets'); if(i>=0) r.splice(i+1,0,it); else r.push(it); }
  return r.map(n=>n.k==='field'?Object.assign({},n,{l:t('nav_field')}):n); };
const _renderSeed=render; render=function(){ try{ if(DB&&!DB.sites) seedField(); }catch(e){} return _renderSeed.apply(this,arguments); };
/* ---------- việc cần làm & KPI ---------- */
const _todayTasksF=todayTasks; todayTasks=function(u){ const L0=_todayTasksF(u); const add=(key,list)=>{ if(list.length) L0.push({key,n:list.length,items:list}); }; const js=(DB.fjobs||[]).filter(j=>j.status!=='cancelled'); const t0=dayStart(Date.now());
  const it=j=>({fj:j.id,no:j.no,company:(siteById(j.siteId)||{}).name||''});
  if(u.role==='engineer'){ add('td_fj_today',js.filter(j=>j.team.includes(u.id)&&['planned','onsite'].includes(j.status)&&dayStart(j.date)<=t0).map(it)); add('td_fj_week',js.filter(j=>j.team.includes(u.id)&&j.status==='planned'&&dayStart(j.date)>t0&&j.date-Date.now()<7*DAYMS).map(it)); }
  if(['manager','dev'].includes(u.role)){ add('td_fj_close',js.filter(j=>j.status==='done').map(it)); add('td_om_due',(DB.oms||[]).filter(o=>{ const d=omDue(o); return d&&d-Date.now()<7*DAYMS&&!js.some(j=>j.omId===o.id&&j.status==='planned'); }).map(o=>({om:o.id,no:o.no,company:(siteById(o.siteId)||{}).name||''}))); add('td_fj_late',js.filter(fjLate).map(it)); }
  if(u.role==='warehouse') add('td_fj_mat',js.filter(j=>j.status==='planned'&&j.materials.length&&!j.matIssued).map(it));
  return L0; };
const _taskItemF=taskItem; taskItem=function(x){ if(x.fj) return `<button class="mini-item" data-a="nav" data-k="fj:${x.fj}"><span class="t"><div><span class="mono">${esc(x.no)}</span> ${esc(x.company||'')}</div></span></button>`; if(x.om) return `<button class="mini-item" data-a="nav" data-k="field"><span class="t"><div><span class="mono">${esc(x.no)}</span> ${esc(x.company||'')}</div></span></button>`; return _taskItemF(x); };
URGENT_KEYS.push('td_fj_late','td_om_due');
const _kpiTasksF=kpiTasks; kpiTasks=function(u){ const out=_kpiTasksF(u); (DB.fjobs||[]).filter(j=>j.team.includes(u.id)&&j.status!=='cancelled').forEach(j=>out.push({kind:'field',ref:null,no:j.no,what:(siteById(j.siteId)||{}).name||'',at:j.createdAt,due:dayStart(j.date)+DAYMS,doneAt:j.doneAt||null,doneBy:j.doneAt?u.id:null})); return out; };
Object.assign(DICT.vi,{ kk_field:'Công tác tại công trình' }); Object.assign(DICT.en,{ kk_field:'Field jobs' });

Object.assign(DICT.vi,{ nav_field:'Công trình', fl_sub:'Bảo trì định kỳ, sửa chữa và lắp đặt tại công trình của khách', fl_tab_cal:'Lịch công tác', fl_tab_sites:'Công trình', fl_tab_oms:'Hợp đồng bảo trì', fl_mine:'Chỉ việc của tôi',
  fl_today:'Hôm nay', fl_late:'Quá ngày chưa làm', fl_to_close:'Chờ đóng phiếu', fl_soon:'Sắp tới', fl_closed:'Đã xong gần đây', fl_due:'Đến kỳ bảo trì', fl_overdue:'Đã quá kỳ', fl_due_in:'Còn {n} ngày', fl_schedule:'Lên lịch', fl_empty:'Chưa có lịch công tác nào.',
  fl_inv_n:'Số biến tần', fl_last:'Lần gần nhất', fl_next:'Kỳ tới', fl_new_job:'Tạo phiếu', fl_no_sites:'Chưa có công trình. Bấm "Thêm công trình" để tạo.', fl_no_oms:'Chưa có hợp đồng bảo trì.', fl_done_n:'Đã làm',
  fj_new:'Tạo phiếu công tác', fj_create:'Tạo phiếu', fj_site:'Công trình', fj_site_hint:'Chưa có trong danh sách? Bấm dấu + để thêm nhanh.', fj_kind:'Loại công việc', fj_date:'Ngày đi', fj_time:'Giờ', fj_om:'HĐ bảo trì', fj_om_none:'Không theo hợp đồng',
  fj_team:'Đội đi công trình', fj_leader:'trưởng nhóm', fj_team_hint:'Bấm chọn người đi. Người chọn đầu tiên là trưởng nhóm.', fj_need_team:'Chọn ít nhất 1 người', fj_note:'Nội dung / yêu cầu của khách', fj_note_ph:'VD: biến tần số 2 báo lỗi 036, khách cần đến trong tuần',
  fjk_pm:'Bảo trì định kỳ', fjk_repair:'Sửa tại chỗ', fjk_inspect:'Khảo sát', fjk_install:'Lắp đặt', fjkh_pm:'Kiểm tra, vệ sinh theo hợp đồng', fjkh_repair:'Xử lý sự cố tại công trình', fjkh_inspect:'Đánh giá hiện trạng, báo giá', fjkh_install:'Lắp mới, nghiệm thu',
  fjs_planned:'Đã lên lịch', fjs_onsite:'Đang tại công trình', fjs_done:'Hoàn thành', fjs_closed:'Đã đóng phiếu', fjs_cancelled:'Đã hủy', fj_flow:'Tiến trình công tác', fj_late:'Quá ngày',
  toast_fj_new:'Đã tạo phiếu {no}', toast_fj_onsite:'Đã ghi nhận bắt đầu tại công trình', toast_fj_done:'Đã hoàn thành, đã báo quản lý', toast_fj_closed:'Đã đóng phiếu, trả vật tư và tạo đề nghị chi phí', toast_fj_cancelled:'Đã hủy phiếu', toast_fj_mat:'Đã xuất vật tư cho đội',
  n_fj_new:'{no}: bạn được phân công đi {s} ngày {d}', n_fj_done:'{no}: đã hoàn thành công tác tại {s}, chờ đóng phiếu',
  fj_print:'In biên bản', fj_cancel:'Hủy phiếu', fj_cancel_again:'Bấm lần nữa để hủy', fj_cancel_q:'Bấm "Hủy phiếu" lần nữa để xác nhận', fj_map:'Mở bản đồ', fj_not_team:'Chỉ người trong đội mới bắt đầu được.',
  fj_sec_mat:'Vật tư mang theo', fj_sec_mat_h:'Thủ kho xuất trước khi đi', fj_sec_used_h:'Ghi số đã dùng, phần dư tự nhập lại kho khi đóng phiếu', fj_mat_take:'Mang theo', fj_mat_used:'Đã dùng', fj_mat_none:'Không mang vật tư', fj_mat_add:'Thêm vật tư', fj_mat_issue:'Xuất vật tư cho đội', fj_mat_issued:'Đã xuất bởi {u} lúc {d}', fj_mat_wait:'Chờ thủ kho xuất vật tư',
  fj_go_title:'Đến công trình rồi?', fj_go_hint:'Bấm nút để bắt đầu. Hệ thống ghi giờ đến và mở các bước làm việc.', fj_go_btn:'Bắt đầu tại công trình',
  fj_sec_before:'Hình trước khi làm', fj_sec_before_h:'Chụp tổng thể và chỗ cần xử lý', fj_take_photo:'Chụp / tải hình', fj_sec_chk:'Kiểm tra theo danh mục', fj_sec_chk_h:'Bấm Đạt / Không đạt / Không áp dụng cho từng mục', fj_chk_all:'Đánh dấu Đạt các mục còn lại', fj_chk_add:'Thêm mục', fj_chk_add_ph:'Tên mục kiểm tra thêm', fj_chk_note_ph:'Ghi chú (bắt buộc nên ghi khi Không đạt)',
  fjv_ok:'Đạt', fjv_ng:'Không đạt', fjv_na:'Không áp dụng', fj_sec_read:'Thông số từng biến tần', fj_sec_read_h:'Nhập số đọc trên màn hình biến tần / app giám sát', fj_read_add:'Thêm biến tần',
  fjr_pac:'Công suất', fjr_eday:'Sản lượng ngày', fjr_vdc:'Điện áp DC', fjr_riso:'Cách điện', fjr_temp:'Nhiệt độ', fjr_err:'Mã lỗi',
  fj_sec_find:'Đánh giá & kiến nghị', fj_findings:'Tình trạng, phát hiện', fj_findings_ph:'VD: hệ thống ổn định; biến tần số 3 bụi nhiều, đã vệ sinh', fj_recommend:'Kiến nghị cho khách', fj_recommend_ph:'VD: thay quạt biến tần số 3 trong kỳ tới',
  fj_sec_after:'Hình sau khi làm', fj_sec_after_h:'Chụp kết quả sau xử lý', fj_sec_sign:'Khách xác nhận', fj_sec_sign_h:'Khách ký trên màn hình hoặc chụp biên bản giấy đã ký', fj_sign_name:'Họ tên người xác nhận', fj_sign_title:'Chức vụ', fj_sign_hint:'Khách ký bằng ngón tay vào khung trên', fj_sign_clear:'Ký lại', fj_paper:'Hoặc chụp biên bản giấy đã ký',
  fj_finish_title:'Hoàn thành công việc', fj_finish_btn:'Hoàn thành', fj_still:'Còn thiếu: {m}', fj_ready:'Đã đủ thông tin, có thể hoàn thành.', fj_autosaved:'Đã tự lưu', fj_miss:'Chưa thể hoàn thành, còn thiếu: {m}', fj_miss_chk:'{n} mục kiểm tra chưa đánh giá', fj_miss_sign:'chữ ký khách', fj_miss_used:'số vật tư đã dùng',
  fj_sec_close:'Chi phí & đóng phiếu', fj_sec_close_h:'Nhập chi phí đi lại, ăn ở để tạo đề nghị chi', fj_cost_type:'Khoản chi', fj_cost_add:'Thêm chi phí', fj_cost_none:'Không có chi phí', fj_cost_bad:'Số tiền chi phí phải lớn hơn 0', fj_close_btn:'Đóng phiếu',
  fj_back_hint:'Vật tư dư sẽ tự nhập lại kho khi đóng phiếu: {p}', fj_closed_at:'Đã đóng phiếu lúc {d}', fj_mv_out:'Xuất vật tư công tác {no}', fj_mv_back:'Nhập lại vật tư dư {no}',
  fjc_travel:'Đi lại, xăng xe', fjc_meal:'Ăn uống', fjc_hotel:'Lưu trú', fjc_shipping:'Vận chuyển vật tư', fjc_other:'Khác',
  site_new:'Thêm công trình', site_edit:'Sửa công trình', site_name:'Tên công trình', site_name_ph:'VD: Nhà máy Bao bì Việt Hưng – mái kho A', site_kwp:'Công suất (kWp)', site_contact:'Người liên hệ tại công trình', site_inv:'Danh sách biến tần', site_inv_hint:'Mỗi dòng 1 máy: model, serial. Có thể dán từ Excel.',
  om_new:'Thêm HĐ bảo trì', om_edit:'Sửa HĐ bảo trì', om_no:'Số HĐ', om_cycle:'Chu kỳ bảo trì', om_every:'{n} tháng/lần', om_start:'Ngày bắt đầu', om_end:'Ngày kết thúc', om_value:'Giá trị HĐ (đ)', om_term:'Thời hạn', om_ended:'Đã hết hạn', om_hint:'Hệ thống tự tính kỳ bảo trì tiếp theo và nhắc trước 7 ngày.',
  td_fj_today:'Công tác hôm nay', td_fj_week:'Công tác trong 7 ngày tới', td_fj_close:'Phiếu công tác chờ đóng', td_om_due:'Đến kỳ bảo trì chưa lên lịch', td_fj_late:'Công tác quá ngày chưa làm', td_fj_mat:'Vật tư cần xuất cho công tác' });
Object.assign(DICT.en,{ nav_field:'Field service', fl_sub:'Scheduled maintenance, on-site repair and installation', fl_tab_cal:'Schedule', fl_tab_sites:'Sites', fl_tab_oms:'O&M contracts', fl_mine:'My jobs only',
  fl_today:'Today', fl_late:'Overdue', fl_to_close:'To close', fl_soon:'Upcoming', fl_closed:'Recently closed', fl_due:'Maintenance due', fl_overdue:'Overdue', fl_due_in:'In {n} days', fl_schedule:'Schedule', fl_empty:'No field jobs yet.',
  fl_inv_n:'Inverters', fl_last:'Last visit', fl_next:'Next', fl_new_job:'New job', fl_no_sites:'No sites yet.', fl_no_oms:'No O&M contracts.', fl_done_n:'Done',
  fj_new:'New field job', fj_create:'Create', fj_site:'Site', fj_site_hint:'Not listed? Press + to add it.', fj_kind:'Job type', fj_date:'Date', fj_time:'Time', fj_om:'O&M contract', fj_om_none:'Not under contract',
  fj_team:'Team', fj_leader:'lead', fj_team_hint:'Tap to select. The first person is the team lead.', fj_need_team:'Select at least one person', fj_note:'Scope / customer request', fj_note_ph:'e.g. inverter #2 shows error 036',
  fjk_pm:'Maintenance', fjk_repair:'On-site repair', fjk_inspect:'Survey', fjk_install:'Installation', fjkh_pm:'Scheduled check & cleaning', fjkh_repair:'Fix a fault on site', fjkh_inspect:'Assess & quote', fjkh_install:'New install & commissioning',
  fjs_planned:'Scheduled', fjs_onsite:'On site', fjs_done:'Completed', fjs_closed:'Closed', fjs_cancelled:'Cancelled', fj_flow:'Job progress', fj_late:'Overdue',
  toast_fj_new:'Job {no} created', toast_fj_onsite:'Arrival recorded', toast_fj_done:'Completed; manager notified', toast_fj_closed:'Closed; materials returned and expenses filed', toast_fj_cancelled:'Job cancelled', toast_fj_mat:'Materials issued to the team',
  n_fj_new:'{no}: you are assigned to {s} on {d}', n_fj_done:'{no}: completed at {s}, awaiting close',
  fj_print:'Print report', fj_cancel:'Cancel job', fj_cancel_again:'Tap again to cancel', fj_cancel_q:'Tap "Cancel job" again to confirm', fj_map:'Open map', fj_not_team:'Only team members can start.',
  fj_sec_mat:'Materials', fj_sec_mat_h:'Warehouse issues before departure', fj_sec_used_h:'Enter used quantities; the rest returns to stock on close', fj_mat_take:'Taken', fj_mat_used:'Used', fj_mat_none:'No materials', fj_mat_add:'Add material', fj_mat_issue:'Issue materials', fj_mat_issued:'Issued by {u} at {d}', fj_mat_wait:'Waiting for the warehouse',
  fj_go_title:'Arrived on site?', fj_go_hint:'Press to start. Arrival time is recorded and the work steps open.', fj_go_btn:'Start on site',
  fj_sec_before:'Photos before', fj_sec_before_h:'Overall view and problem areas', fj_take_photo:'Take / upload photo', fj_sec_chk:'Checklist', fj_sec_chk_h:'Mark Pass / Fail / N/A for each item', fj_chk_all:'Mark the rest as Pass', fj_chk_add:'Add item', fj_chk_add_ph:'Extra check item', fj_chk_note_ph:'Note (recommended when failing)',
  fjv_ok:'Pass', fjv_ng:'Fail', fjv_na:'N/A', fj_sec_read:'Inverter readings', fj_sec_read_h:'From the inverter screen / monitoring app', fj_read_add:'Add inverter',
  fjr_pac:'Power', fjr_eday:'Daily yield', fjr_vdc:'DC voltage', fjr_riso:'Insulation', fjr_temp:'Temp', fjr_err:'Error code',
  fj_sec_find:'Findings & recommendations', fj_findings:'Condition / findings', fj_findings_ph:'e.g. system stable; inverter #3 dusty, cleaned', fj_recommend:'Recommendations', fj_recommend_ph:'e.g. replace fan of inverter #3 next visit',
  fj_sec_after:'Photos after', fj_sec_after_h:'Result after the work', fj_sec_sign:'Customer sign-off', fj_sec_sign_h:'Sign on screen or photograph the signed paper form', fj_sign_name:'Signer name', fj_sign_title:'Position', fj_sign_hint:'Customer signs with a finger in the box', fj_sign_clear:'Clear', fj_paper:'Or photo of signed paper report',
  fj_finish_title:'Finish the job', fj_finish_btn:'Complete', fj_still:'Missing: {m}', fj_ready:'All set, ready to complete.', fj_autosaved:'Saved', fj_miss:'Cannot complete yet, missing: {m}', fj_miss_chk:'{n} checklist items not rated', fj_miss_sign:'customer signature', fj_miss_used:'used material quantities',
  fj_sec_close:'Costs & close', fj_sec_close_h:'Enter travel and lodging costs to file expenses', fj_cost_type:'Cost', fj_cost_add:'Add cost', fj_cost_none:'No costs', fj_cost_bad:'Cost amounts must be above 0', fj_close_btn:'Close job',
  fj_back_hint:'Unused materials return to stock on close: {p}', fj_closed_at:'Closed at {d}', fj_mv_out:'Materials for field job {no}', fj_mv_back:'Unused materials back from {no}',
  fjc_travel:'Travel, fuel', fjc_meal:'Meals', fjc_hotel:'Lodging', fjc_shipping:'Material shipping', fjc_other:'Other',
  site_new:'Add site', site_edit:'Edit site', site_name:'Site name', site_name_ph:'e.g. Viet Hung packaging plant – warehouse roof A', site_kwp:'Capacity (kWp)', site_contact:'Site contact', site_inv:'Inverters', site_inv_hint:'One per line: model, serial. Paste from Excel works.',
  om_new:'Add O&M contract', om_edit:'Edit O&M contract', om_no:'Contract no.', om_cycle:'Maintenance cycle', om_every:'Every {n} month(s)', om_start:'Start', om_end:'End', om_value:'Contract value (₫)', om_term:'Term', om_ended:'Ended', om_hint:'The next visit is calculated automatically and reminded 7 days ahead.',
  td_fj_today:'Field jobs today', td_fj_week:'Field jobs next 7 days', td_fj_close:'Field jobs to close', td_om_due:'Maintenance due, not scheduled', td_fj_late:'Overdue field jobs', td_fj_mat:'Materials to issue for field jobs' });
try{ new MutationObserver(()=>{ try{ bindSigPads(); }catch(e){} }).observe(document.documentElement,{childList:true,subtree:true}); }catch(e){}

/* ===================================================================
   LƯU FILE THẬT (đưa file lên kho lưu trữ của trang) + chứng từ bắt buộc
   =================================================================== */
let ASSETS_NS=undefined; function assetsNs(){ if(ASSETS_NS!==undefined) return Promise.resolve(ASSETS_NS); try{ if(!(window.claude&&window.claude.use)) { ASSETS_NS=null; return Promise.resolve(null); } return window.claude.use('assets').then(a=>(ASSETS_NS=a||null)).catch(()=>(ASSETS_NS=null)); }catch(e){ ASSETS_NS=null; return Promise.resolve(null); } }
function dataUrlBlob(d){ const [h,b64]=d.split(','); const mime=(h.match(/data:([^;]+)/)||[])[1]||'application/octet-stream'; const bin=atob(b64); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return new Blob([u],{type:mime}); }
const _readFilesA=readFiles; readFiles=function(input,kind,cb){ return _readFilesA(input,kind,arr=>{ cb(arr); assetsNs().then(as=>{ if(!as) return; arr.forEach(a=>{ const d=PENDING_FILES[a.id]; if(!d||a.url) return; let blob; try{ blob=dataUrlBlob(d); }catch(e){ return; }
  as.upload(blob).then(r=>{ a.url=r.url; a.assetId=r.id; a.up='cloud'; save(); }).catch(()=>{}); }); }); }); };
const _imgSrcA=imgSrc; imgSrc=function(a){ return a&&a.url&&(a.mime||'').startsWith('image/')?a.url:_imgSrcA(a); };
const fileHref=a=>a.url||PENDING_FILES[a.id]||'';
proofThumb=function(a){ if((a.mime||'').startsWith('image/')||a.data) return `<button type="button" class="msg-img" data-a="imgView" data-f="${a.id}" title="${esc(a.name)}"><img src="${imgSrc(a)}" alt="${esc(a.name)}"></button>`;
  const h=fileHref(a); return h?`<a class="pf-chip" href="${h}" target="_blank" rel="noopener" download="${esc(a.name)}">${ic('file',14)} ${esc(a.name)}</a>`:`<span class="pf-chip" title="${esc(t('file_local_only'))}">${ic('file',14)} ${esc(a.name)}</span>`; };
function docsCell(imgs,docType){ const fs=imgs||[]; if(!fs.length) return '<span class="muted">—</span>'; return `<div class="msg-imgs" style="margin:0">${fs.map(a=>(a.mime||'').startsWith('image/')||a.data?`<button type="button" class="msg-img sm" data-a="imgView" data-f="${a.id}"><img src="${imgSrc(a)}" alt=""></button>`:proofThumb(a)).join('')}</div>${docType?`<small class="muted">${t('dt_'+docType)}</small>`:''}`; }
const _findImgE=findImg; findImg=function(fid){ const a=_findImgE(fid); if(a) return a; for(const list of [DB.expenses,DB.purchases]) for(const d of (list||[])){ for(const f of (d.images||[])) if(f.id===fid) return f; for(const p of (d.proofs||[])) for(const f of p.files) if(f.id===fid) return f; } for(const j of (DB.fjobs||[])) for(const k of ['before','after']) for(const f of (j[k]||[])) if(f.id===fid) return f; return null; };
/* loại chứng từ mua hàng */
const DOC_TYPES=['vat','retail','none'];
const docTypeSel=(bind,val)=>`<div class="field"><label class="req">${t('dt_label')}</label><div class="seg">${DOC_TYPES.map(k=>`<button class="${val===k?'on':''}" data-a="dtPick" data-b="${bind}" data-v="${k}">${t('dt_'+k)}</button>`).join('')}</div><div class="hint">${t('dt_hint_'+(val||'vat'))}</div></div>`;
A.dtPick = el => { const m=S.ui.modal; if(!m) return; m.f[el.dataset.b]=el.dataset.v; rerender(); };
/* hộp tải chứng từ: thêm chọn loại hóa đơn cho nhận hàng / chi phí */
const _mProofDT=MODALS.proof; MODALS.proof=m=>{ const r=_mProofDT(m); if(['po_recv','os_return'].includes(m.stage)){ m.f.docType=m.f.docType||'vat'; r.body=docTypeSel('docType',m.f.docType)+r.body; } return r; };
const _pfOkDT=A.pfOk; A.pfOk=()=>{ const m=S.ui.modal; const st=m&&m.stage; const dt=m&&m.f&&m.f.docType; const files=m&&m.f&&m.f.files.slice(); const run=m&&m.run; const po=run&&run.a==='poGo'?poById(run.ds.id):null; const was=po&&po.status;
  _pfOkDT(); if(po&&files&&files.length&&po.status==='received'&&was!=='received'){ (po.proofs=po.proofs||[]).push({stage:'po_recv',files,docType:dt,at:Date.now(),by:S.userId}); po.docType=dt; po.images=files; DB.moves.filter(q=>q.ref&&q.ref.kind==='po'&&q.ref.id===po.id&&!q.images).forEach(q=>q.images=files); save(); rerender(); } };
/* nhận hàng đơn mua: bắt buộc hình hóa đơn / bill */
const _poGoP=A.poGo; A.poGo=el=>{ if(el.dataset.s==='received'&&S._proofOK!=='po_recv'){ const p=poById(el.dataset.id); if(p&&!p.items.length){ toast(t('items_empty'),'bad'); return; } return proofAsk('po_recv',null,null,{a:'poGo',ds:Object.assign({},el.dataset)}); } return _poGoP(el); };
/* thanh toán: mọi khoản (kể cả trả NCC) đều phải có hình */
MODALS.pay=(()=>{ const prev=MODALS.pay; return m=>{ const r=prev(m); if(poById(m.id)&&!r.body.includes('data-file="payImgs"')){ const imgs=m.f.images||(m.f.images=[]); const E=m.err||{};
  r.body+=`<div class="field full" style="margin-top:14px"><span class="lbl req">${t('pay_proof')}</span><div class="payimgs">${imgs.map((a,i)=>`<div class="payimg"><img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt=""><button type="button" class="icon-btn" data-a="payImgDel" data-i="${i}">${ic('x',13)}</button></div>`).join('')}<label class="payimg-add ${E.img?'err':''}">${ic('upload',18)}<span>${t('pay_proof_add')}</span><input type="file" accept="image/*" multiple data-file="payImgs" hidden></label></div>${E.img?`<div class="err-text">${E.img}</div>`:''}</div>`; } return r; }; })();
A.paySave=(()=>{ const prev=A.paySave; return ()=>{ const m=S.ui.modal; if(m&&poById(m.id)){ if(!(m.f.images||[]).length){ m.err=Object.assign({},m.err,{img:t('pay_proof_req')}); rerender(); return; } const d=poById(m.id); const n0=(d.payments||[]).length; const imgs=m.f.images.slice(); prev(); if((d.payments||[]).length>n0){ d.payments[d.payments.length-1].images=imgs; save(); } return; } return prev(); }; })();
/* đề nghị chi phí: bắt buộc hình (có hay không hóa đơn) */
const _exFormP=MODALS.exForm; MODALS.exForm=m=>{ const r=_exFormP(m); const f=m.f; f.images=f.images||[]; f.docType=f.docType||'retail'; const E=m.err||{};
  r.body+=`<div class="form-grid" style="margin-top:12px">${docTypeSel('docType',f.docType)}<div class="field full"><span class="lbl req">${t('ex_proof')}</span><div class="payimgs">${f.images.map((a,i)=>`<div class="payimg">${(a.mime||'').startsWith('image/')?`<img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt="">`:`<div class="pf-file">${ic('file',22)}<span>${esc(a.name)}</span></div>`}<button type="button" class="icon-btn" data-a="exImgDel" data-i="${i}">${ic('x',13)}</button></div>`).join('')}<label class="payimg-add ${E.img?'err':''}">${ic('upload',18)}<span>${t('pf_add_doc')}</span><input type="file" accept="${PROOF_ACCEPT_DOC}" multiple data-file="exImgs" hidden></label></div>${E.img?`<div class="err-text">${E.img}</div>`:`<div class="hint">${t('ex_proof_hint')}</div>`}</div></div>`; return r; };
A.exImgs = input => readFiles(input,'image',arr=>{ const m=S.ui.modal; if(!m||m.type!=='exForm') return; arr.forEach(a=>{ if(!(a.mime||'').startsWith('image/')) a.kind='file'; }); m.f.images=(m.f.images||[]).concat(arr); if(m.err) delete m.err.img; rerender(); });
A.exImgDel = el => { S.ui.modal.f.images.splice(+el.dataset.i,1); rerender(); };
const _exSaveP=A.exSave; A.exSave=()=>{ const m=S.ui.modal; if(!m) return; if(!(m.f.images||[]).length){ m.err=Object.assign({},m.err,{img:t('ex_proof_req')}); rerender(); return; } const imgs=m.f.images.slice(), dt=m.f.docType; const top=DB.expenses[0]; _exSaveP(); if(DB.expenses[0]!==top){ DB.expenses[0].images=imgs; DB.expenses[0].docType=dt; save(); rerender(); } };

/* ---------- báo cáo biến tần bắt buộc khi gửi chẩn đoán ---------- */
PROOF_STAGES.splice(PROOF_STAGES.indexOf('repair'),0,'report','quote'); PROOF_DOCS.report=true; PROOF_DOCS.quote=true;
const _wfRep=A.wf; A.wf=(el,ev)=>{ const op=el.dataset.op; const x=ticketById(el.dataset.id);
  if(op==='submitDiag'&&x&&S._proofOK!=='report'&&!(x.proofs||[]).some(p=>p.stage==='report')){ const dg=tdState(x.id).dg; if(dg&&(String(dg.text||'').trim()||(dg.parts||[]).some(p=>p.pn))) return proofAsk('report',x.id,null,{a:'wf',ds:Object.assign({},el.dataset)}); }
  return _wfRep(el,ev); };
/* ---------- báo giá gửi khách bắt buộc lưu file ---------- */
const _svcGoQF=A.svcGo; A.svcGo=el=>{ const c=svcById(el.dataset.id); if(c&&el.dataset.s==='sent'&&c.status==='quote'&&S._proofOK!=='quote'){ if(needMgr(c)&&!quoteApproved(c)&&!(isBossRole(me())||can('ticket_approve'))) return _svcGoQF(el); if(S.ui['ed_'+c.id]&&!edCommit(c.id)) return; return proofAsk('quote',c.ticketId||null,c.id,{a:'svcGo',ds:Object.assign({},el.dataset)}); } return _svcGoQF(el); };
const _exGoQF=A.exGo; A.exGo=el=>{ const x=ticketById(el.dataset.id); if(x&&x.extra&&el.dataset.to==='sent'&&S._proofOK!=='quote') return proofAsk('quote',x.id,x.svcId,{a:'exGo',ds:Object.assign({},el.dataset)}); return _exGoQF(el); };
/* pfOk: báo giá lưu vào hợp đồng; phát sinh đổi trạng thái cũng được ghi nhận */
const _pfOkQ=A.pfOk; A.pfOk=()=>{ const m=S.ui.modal; if(m&&m.type==='proof'&&m.stage==='quote'&&m.run&&m.run.a==='exGo'){ const x=ticketById(m.run.ds.id); const files=m.f.files.slice(); if(!files.length) return _pfOkQ(); const st0=x.extra&&x.extra.status; _pfOkQ(); const c=x.svcId&&svcById(x.svcId); const now=(x.extras||[]).concat(x.extra||[]).find(e=>e.status==='sent'); if(st0!=='sent'&&c&&now){ (c.proofs=c.proofs||[]).push({stage:'quote',files,note:t('ex_quote_note',{no:now.no}),at:Date.now(),by:S.userId}); save(); rerender(); } return; } return _pfOkQ(); };

/* ===================================================================
   THUÊ NGOÀI SỬA (gửi máy sang đơn vị khác sửa, SGE báo giá & xuất hóa đơn cho khách)
   Gửi đi → Bên ngoài báo giá → Đang sửa → Đã nhận về  (+ chi phí trả bên ngoài thành đề nghị chi)
   =================================================================== */
EXP_CATS.push('outsource');
const OS_ST=['sent','quoted','repairing','returned'];
PROOF_STAGES.push('os_send','os_quote','os_return'); PROOF_DOCS.os_send=true; PROOF_DOCS.os_quote=true; PROOF_DOCS.os_return=true;
const osActive=x=>x.os&&['sent','quoted','repairing'].includes(x.os.status);
const osSell=c=>Math.round(c*1.25/1000)*1000;
A.osAsk = el => { const x=ticketById(el.dataset.id); openModal({type:'osSend',id:x.id,f:{vendorId:((DB.suppliers||[]).find(s=>s.partner)||(DB.suppliers||[])[0]||{}).id||'',newName:'',newPhone:'',method:'Xe SGE giao',tracking:'',note:(x.diagnosis&&L(x.diagnosis.text))||'',files:[]},err:{}}); };
MODALS.osSend = m => { const x=ticketById(m.id); const f=m.f,E=m.err||{};
  return { title:`${t('os_send_t')} · <span class="mono">${x.no}</span>`, body:`<p class="muted" style="margin:0 0 12px">${t('os_send_hint')}</p><div class="form-grid">
    <div class="field full"><label class="req" for="os-v">${t('os_vendor')}</label><select class="select" id="os-v" data-bind="modal.f.vendorId" data-re>${(DB.suppliers||[]).map(s=>`<option value="${s.id}" ${f.vendorId===s.id?'selected':''}>${esc(s.name)}${s.partner?' · '+t('os_partner'):''}</option>`).join('')}<option value="_new" ${f.vendorId==='_new'?'selected':''}>+ ${t('os_new_vendor')}</option></select></div>
    ${f.vendorId==='_new'?`<div class="field"><label class="req" for="os-nn">${t('os_new_name')}</label><input class="input ${E.newName?'err':''}" id="os-nn" data-bind="modal.f.newName" value="${esc(f.newName)}"></div><div class="field"><label for="os-np">${t('phone')}</label><input class="input" id="os-np" data-bind="modal.f.newPhone" value="${esc(f.newPhone)}"></div>`:''}
    <div class="field"><label for="os-m">${t('carrier')}</label><select class="select" id="os-m" data-bind="modal.f.method">${['Xe SGE giao','Bên ngoài đến lấy','Viettel Post','GHN','GHTK'].map(v=>`<option ${f.method===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label for="os-t">${t('tracking_no')}</label><input class="input mono" id="os-t" data-bind="modal.f.tracking" value="${esc(f.tracking)}"></div>
    <div class="field full"><label class="req" for="os-n">${t('os_note')}</label><textarea class="textarea ${E.note?'err':''}" id="os-n" data-bind="modal.f.note" placeholder="${t('os_note_ph')}">${esc(f.note)}</textarea></div></div>
    <div class="field full" style="margin-top:12px"><span class="lbl req">${t('os_send_files')}</span>${fileBox(f,E,'osFiles')}</div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="osSendSave">${ic('truck',15)} ${t('os_send_btn')}</button>` }; };
function fileBox(f,E,fn){ return `<div class="payimgs">${f.files.map((a,i)=>`<div class="payimg">${(a.mime||'').startsWith('image/')?`<img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt="">`:`<div class="pf-file">${ic('file',22)}<span>${esc(a.name)}</span></div>`}<button type="button" class="icon-btn" data-a="mFileDel" data-i="${i}" aria-label="${t('delete')}">${ic('x',13)}</button></div>`).join('')}<label class="payimg-add ${E.files?'err':''}">${ic('upload',18)}<span>${t('pf_add_doc')}</span><input type="file" accept="${PROOF_ACCEPT_DOC}" multiple data-file="${fn}" hidden></label></div>${E.files?`<div class="err-text">${E.files}</div>`:''}`; }
A.osFiles = input => readFiles(input,'image',arr=>{ const m=S.ui.modal; if(!m||!m.f||!m.f.files) return; arr.forEach(a=>{ if(!(a.mime||'').startsWith('image/')) a.kind='file'; }); m.f.files=m.f.files.concat(arr); if(m.err) delete m.err.files; rerender(); });
A.mFileDel = el => { S.ui.modal.f.files.splice(+el.dataset.i,1); rerender(); };
function osProof(x,stage,files,note){ (x.proofs=x.proofs||[]).push({stage,files:files.slice(),note:note||'',at:Date.now(),by:S.userId}); }
A.osSendSave = () => { const m=S.ui.modal,f=m.f,E={}; const x=ticketById(m.id); if(f.vendorId==='_new'&&!String(f.newName||'').trim()) E.newName=t('e_required'); if(!String(f.note||'').trim()) E.note=t('e_required'); if(!f.files.length) E.files=t('pf_need_doc'); m.err=E; if(Object.keys(E).length){ rerender(); return; }
  let vid=f.vendorId; if(vid==='_new'){ const s={id:'sp'+Date.now().toString(36),name:f.newName.trim(),short:f.newName.trim().split(' ').slice(-2).join(' '),contact:'',phone:f.newPhone||'',email:'',address:'',terms:0,partner:1}; DB.suppliers.push(s); vid=s.id; }
  const now=Date.now(); x.os={ vendorId:vid, status:'sent', sentAt:now, method:f.method, tracking:f.tracking, note:f.note.trim(), by:S.userId, log:[{k:'sent',at:now,by:S.userId}] }; osProof(x,'os_send',f.files,f.method+(f.tracking?' · '+f.tracking:''));
  x.history.push({at:now,by:S.userId,action:'os_sent',from:null,to:null,note:(supById(vid)||{}).name||''}); notify({toRole:'manager',key:'n_os_sent',vars:{no:x.no,v:(supById(vid)||{}).name||''},ticketId:x.id});
  S.ui.modal=null; save(); rerender(); toast(t('toast_os_sent'),'ok'); };
A.osQuoteAsk = el => openModal({type:'osQuote',id:el.dataset.id,f:{cost:'',days:5,note:'',files:[]},err:{}});
MODALS.osQuote = m => { const x=ticketById(m.id); const f=m.f,E=m.err||{}; const sell=Number(f.cost)>0?osSell(Number(f.cost)):0;
  return { title:`${t('os_quote_t')} · <span class="mono">${x.no}</span>`, body:`<div class="form-grid"><div class="field"><label class="req" for="oq-c">${t('os_cost')}</label><input class="input num ${E.cost?'err':''}" type="number" id="oq-c" data-bind="modal.f.cost" data-re value="${esc(f.cost)}">${sell?`<div class="hint">${t('os_sell_hint',{a:money(sell)})}</div>`:''}</div><div class="field"><label for="oq-d">${t('os_days')}</label><input class="input num" type="number" id="oq-d" data-bind="modal.f.days" value="${f.days}"></div>
    <div class="field full"><label for="oq-n">${t('os_quote_note')}</label><textarea class="textarea" id="oq-n" data-bind="modal.f.note" placeholder="${t('os_quote_note_ph')}">${esc(f.note)}</textarea></div></div><div class="field full" style="margin-top:12px"><span class="lbl req">${t('os_quote_files')}</span>${fileBox(f,E,'osFiles')}</div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="osQuoteSave">${t('save')}</button>` }; };
A.osQuoteSave = () => { const m=S.ui.modal,f=m.f,E={}; const x=ticketById(m.id); const cost=Math.round(Number(f.cost)||0); if(!(cost>0)) E.cost=t('e_amount'); if(!f.files.length) E.files=t('pf_need_doc'); m.err=E; if(Object.keys(E).length){ rerender(); return; }
  const now=Date.now(); Object.assign(x.os,{status:'quoted',cost,days:Number(f.days)||0,quoteNote:f.note.trim(),quotedAt:now}); x.os.log.push({k:'quoted',at:now,by:S.userId}); osProof(x,'os_quote',f.files,money(cost));
  const st=tdState(x.id); if(['diagnosing','returned'].includes(x.status)&&st.dg&&!String(st.dg.text||'').trim()) st.dg.text=t('os_diag_text',{v:(supById(x.os.vendorId)||{}).name||'',n:f.note.trim()||x.os.note});
  const c=x.svcId&&svcById(x.svcId); if(c&&c.status==='quote'&&!c.items.some(i=>i.os||(x.os.lineDesc&&L(i.desc)===x.os.lineDesc))) { x.os.lineDesc=t('os_line',{n:x.os.note}); c.items.push({type:'labor',desc:x.os.lineDesc,qty:1,price:osSell(cost),os:1}); delete S.ui['ed_'+c.id]; }
  x.history.push({at:now,by:S.userId,action:'os_quoted',from:null,to:null,note:money(cost)}); if(x.assigneeId) notify({toUser:x.assigneeId,key:'n_os_quoted',vars:{no:x.no,a:money(cost)},ticketId:x.id});
  S.ui.modal=null; save(); rerender(); toast(t('toast_os_quoted'),'ok'); };
A.osGo = el => { const x=ticketById(el.dataset.id); const to=el.dataset.to; const now=Date.now();
  if(to==='repairing'){ x.os.status='repairing'; x.os.repairAt=now; x.os.log.push({k:'repairing',at:now,by:S.userId}); x.history.push({at:now,by:S.userId,action:'os_repairing',from:null,to:null,note:''}); }
  else if(to==='cancel'){ x.os.status='cancelled'; x.os.log.push({k:'cancelled',at:now,by:S.userId}); x.history.push({at:now,by:S.userId,action:'os_cancelled',from:null,to:null,note:''}); }
  save(); rerender(); toast(t('toast_saved'),'ok'); };
A.osBackAsk = el => { const x=ticketById(el.dataset.id); openModal({type:'osBack',id:x.id,f:{result:'ok',cost:x.os.cost||'',docType:'vat',note:'',files:[]},err:{}}); };
MODALS.osBack = m => { const x=ticketById(m.id); const f=m.f,E=m.err||{};
  return { title:`${t('os_back_t')} · <span class="mono">${x.no}</span>`, body:`<div class="form-grid"><div class="field full"><span class="lbl">${t('os_result')}</span><div class="seg">${['ok','fail'].map(v=>`<button class="${f.result===v?'on':''}" data-a="osRes" data-v="${v}">${t('osr_'+v)}</button>`).join('')}</div></div>
    <div class="field"><label class="req" for="ob-c">${t('os_cost_real')}</label><input class="input num ${E.cost?'err':''}" type="number" id="ob-c" data-bind="modal.f.cost" value="${esc(f.cost)}"><div class="hint">${t('os_cost_real_hint')}</div></div>${docTypeSel('docType',f.docType)}
    <div class="field full"><label for="ob-n">${t('note_l')}</label><input class="input" id="ob-n" data-bind="modal.f.note" value="${esc(f.note)}"></div></div><div class="field full" style="margin-top:12px"><span class="lbl req">${t('os_back_files')}</span>${fileBox(f,E,'osFiles')}</div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="osBackSave">${ic('check',15)} ${t('os_back_btn')}</button>` }; };
A.osRes = el => { S.ui.modal.f.result=el.dataset.v; rerender(); };
A.osBackSave = () => { const m=S.ui.modal,f=m.f,E={}; const x=ticketById(m.id); const cost=Math.round(Number(f.cost)||0); if(cost<0||f.cost==='') E.cost=t('e_required'); if(!f.files.length) E.files=t('pf_need_doc'); m.err=E; if(Object.keys(E).length){ rerender(); return; }
  const now=Date.now(); const v=supById(x.os.vendorId)||{}; Object.assign(x.os,{status:'returned',result:f.result,realCost:cost,docType:f.docType,backNote:f.note,backAt:now}); x.os.log.push({k:'returned',at:now,by:S.userId}); osProof(x,'os_return',f.files,t('osr_'+f.result));
  if(cost>0){ DB.expenses.unshift({ id:'ex'+now.toString(36), no:erpNo('CP'), at:now, cat:'outsource', amount:cost, desc:{vi:`${t('ec_outsource')} – ${x.no} – ${v.name||''}`,en:`Outsourced repair – ${x.no} – ${v.name||''}`}, ticketId:x.id, sn:(x.products[0]||{}).sn||'', svcId:x.svcId||null, by:S.userId, status:'pending', approvedBy:null, paidAt:null, method:'bank', images:f.files.slice(), docType:f.docType, vendorId:v.id }); x.os.expenseNo=DB.expenses[0].no; notify({toRole:'manager',key:'n_exp',vars:{no:DB.expenses[0].no,s:t('ex_pending')}}); }
  x.history.push({at:now,by:S.userId,action:'os_returned',from:null,to:null,note:t('osr_'+f.result)+(cost?' · '+money(cost):'')}); if(x.assigneeId) notify({toUser:x.assigneeId,key:'n_os_back',vars:{no:x.no,r:t('osr_'+f.result)},ticketId:x.id});
  S.ui.modal=null; save(); rerender(); toast(t('toast_os_back'),'ok'); };
function osBox(x){ const u=me(); if(!u||isExternal(u)) return ''; const o=x.os; const startable=!o||['cancelled'].includes(o.status);
  if(!o) return ''; const v=supById(o.vendorId)||{}; const idx={sent:1,quoted:2,repairing:3,returned:4,cancelled:0}[o.status];
  const icn={sent:'truck',quoted:'file',repairing:'wrench',returned:'download'}; const at=k=>(o.log.find(l=>l.k===k)||{}).at;
  const flow=`<div class="tkflow tkflow-sm"><ol class="tf-steps" style="--n:4">${OS_ST.map((s,i)=>{ const stt=o.status==='cancelled'?'todo':i<idx-1||o.status==='returned'?'done':i===idx-1?'cur':'todo'; return `<li class="tf-${stt}"><span class="tf-dot">${stt==='done'?ic('check',15):ic(icn[s],15)}</span><span class="tf-lb">${t('oss_'+s)}</span><small class="tf-dt">${stt!=='todo'&&at(s)?fmtD(at(s)):'&nbsp;'}</small></li>`; }).join('')}</ol></div>`;
  const c=x.svcId&&svcById(x.svcId); const sell=c?c.items.filter(i=>i.os||(o.lineDesc&&L(i.desc)===o.lineDesc)).reduce((s,i)=>s+lineTotal(i),0):0; const mg=isBossRole(u)||can('ticket_assign')||x.assigneeId===u.id;
  let act='';
  if(o.status==='sent'&&mg) act=`<button class="btn primary" data-a="osQuoteAsk" data-id="${x.id}">${ic('file',15)} ${t('os_quote_btn')}</button><button class="btn" data-a="osGo" data-to="cancel" data-id="${x.id}">${t('os_cancel')}</button>`;
  if(o.status==='quoted'&&mg) act=x.status==='in_service'||!c?`<button class="btn primary" data-a="osGo" data-to="repairing" data-id="${x.id}">${ic('wrench',15)} ${t('os_go_repair')}</button>`:`<span class="hint">${t('os_wait_cust')}</span>`;
  if(o.status==='repairing'&&mg) act=`<button class="btn primary" data-a="osBackAsk" data-id="${x.id}">${ic('download',15)} ${t('os_back_btn')}</button>`;
  return `<section class="card action-card osbox"><div class="card-h"><h3 style="color:var(--accent-ink)">${ic('truck',16)} ${t('os_title')} · ${esc(v.name||'')}</h3><span class="kst ${o.status==='returned'?(o.result==='fail'?'k-bad':'k-ok'):o.status==='cancelled'?'k-bad':'k-blue'}">${o.status==='returned'?t('osr_'+o.result):t('oss_'+o.status)}</span></div><div class="card-b" style="display:flex;flex-direction:column;gap:12px">${flow}
    <div class="cost-grid"><div><span>${t('os_cost')}</span><b>${o.realCost!=null?money(o.realCost):o.cost?money(o.cost):'—'}</b></div><div><span>${t('os_sell')}</span><b>${sell?money(sell):'—'}</b></div><div class="${sell-(o.realCost??o.cost??0)<0?'neg':'pos'}"><span>${t('cost_profit')}</span><b>${sell&&(o.realCost??o.cost)?money(sell-(o.realCost??o.cost)):'—'}</b></div><div><span>${t('os_vendor_ct')}</span><b style="font-size:13px">${esc(v.phone||'—')}</b></div></div>
    <p class="quote" style="margin:0">${esc(o.note)}${o.quoteNote?`<br><b>${t('os_quote_note')}:</b> ${esc(o.quoteNote)}`:''}${o.expenseNo?`<br><b>${t('os_payable')}:</b> <span class="mono">${o.expenseNo}</span> (${t('os_payable_hint')})`:''}</p>
    ${act?`<div class="row" style="gap:8px;flex-wrap:wrap">${act}</div>`:''}</div></section>`; }
/* nút "Thuê ngoài sửa" ở bước chẩn đoán và bước sửa */
const _tkAlertsOS=tkAlerts; tkAlerts=function(x){ const u=me(); let h=_tkAlertsOS(x); if(!u||isExternal(u)) return h; const can0=(isBossRole(u)||can('ticket_assign')||x.assigneeId===u.id)&&['diagnosing','returned','in_service'].includes(x.status)&&!osActive(x)&&!(x.os&&x.os.status==='returned');
  if(!can0) return h; const btn=`<button class="btn sm" data-a="osAsk" data-id="${x.id}">${ic('truck',13)} ${t('os_btn')}</button>`; if(h.includes('class="tk-tools"')) return h.replace('<div class="tk-tools">','<div class="tk-tools">'+btn); if(!h) return `<div class="tk-alerts"><div class="tk-tools">${btn}</div></div>`; return h.replace(/<\/div>$/,`<div class="tk-tools">${btn}</div></div>`); };
/* tự thêm dòng thuê ngoài vào báo giá khi tạo, chuyển "đang sửa" khi khách đồng ý, chặn kiểm tra khi máy còn ở ngoài */
const _paApproveOS=A.paApprove; A.paApprove=el=>{ _paApproveOS(el); const x=ticketById(el.dataset.id); const c=x&&x.svcId&&svcById(x.svcId); if(x&&x.os&&x.os.cost&&c&&c.status==='quote'&&!c.items.some(i=>i.os||(x.os.lineDesc&&L(i.desc)===x.os.lineDesc))){ x.os.lineDesc=t('os_line',{n:x.os.note}); c.items.push({type:'labor',desc:x.os.lineDesc,qty:1,price:osSell(x.os.cost),os:1}); delete S.ui['ed_'+c.id]; save(); rerender(); } };
const _tkSignOS=A.tkSign; A.tkSign=el=>{ const x=ticketById(el.dataset.id); const b=x&&x.status; _tkSignOS(el); if(x&&b==='pending'&&x.status==='in_service'&&x.os&&x.os.status==='quoted'){ x.os.status='repairing'; x.os.repairAt=Date.now(); x.os.log.push({k:'repairing',at:Date.now(),by:S.userId}); save(); rerender(); } };
const _wfOS=A.wf; A.wf=(el,ev)=>{ const x=ticketById(el.dataset.id); if(el.dataset.op==='toTesting'&&x&&osActive(x)){ toast(t('err_os_out'),'bad'); return; } return _wfOS(el,ev); };
const _whEnsureOS=whEnsure; whEnsure=function(x,silent){ return _whEnsureOS(x,silent); };
Object.assign(DICT.vi,{ ec_outsource:'Thuê ngoài sửa chữa', file_local_only:'File chỉ còn trên máy đã tải lên', pf_stage_report:'Báo cáo biến tần', pf_title_report:'Báo cáo biến tần / chẩn đoán', pf_hint_report:'Tải file báo cáo xuất từ biến tần (log, PDF, Excel, ảnh màn hình lỗi) hoặc báo cáo kiểm tra.', pf_confirm_report:'Lưu & gửi duyệt', h_proof_report:'tải báo cáo biến tần',
  pf_stage_quote:'Báo giá đã gửi', pf_title_quote:'Lưu báo giá gửi khách', pf_hint_quote:'Tải bản báo giá đã gửi khách (PDF có dấu, ảnh chụp, email…).', pf_confirm_quote:'Gửi báo giá', h_proof_quote:'lưu báo giá đã gửi', ex_quote_note:'Báo giá bổ sung {no}',
  pf_stage_po_recv:'Nhận hàng mua', pf_title_po_recv:'Chứng từ nhận hàng', pf_hint_po_recv:'Chụp hóa đơn hoặc bill / phiếu giao hàng của nhà cung cấp và hàng nhận.', pf_confirm_po_recv:'Xác nhận nhập kho', pf_need_po:'Cần ít nhất 1 hình',
  dt_label:'Chứng từ', dt_vat:'Hóa đơn VAT', dt_retail:'Hóa đơn bán lẻ / bill', dt_none:'Không có hóa đơn', dt_hint_vat:'Chụp hóa đơn GTGT (hoặc tải file PDF/XML).', dt_hint_retail:'Chụp bill, phiếu thu hoặc phiếu giao hàng.', dt_hint_none:'Chụp hàng hóa / biên nhận tay / ảnh chuyển khoản làm bằng chứng.',
  ex_proof:'Hình chứng từ', ex_proof_hint:'Có hay không có hóa đơn đều phải chụp hình: hóa đơn, bill, biên nhận hoặc ảnh chuyển khoản.', ex_proof_req:'Cần tải ít nhất 1 hình chứng từ',
  os_btn:'Thuê ngoài sửa', os_title:'Thuê ngoài sửa', os_send_t:'Gửi máy cho đơn vị khác sửa', os_send_hint:'SGE vẫn là bên báo giá và xuất hóa đơn cho khách. Chi phí trả bên ngoài sẽ thành đề nghị chi khi nhận máy về.', os_vendor:'Đơn vị sửa', os_partner:'đối tác', os_new_vendor:'Thêm đơn vị mới', os_new_name:'Tên đơn vị',
  os_note:'Nội dung nhờ sửa', os_note_ph:'VD: sửa board công suất SG110CX, lỗi 036', os_send_files:'Biên bản giao máy / hình máy gửi đi', os_send_btn:'Xác nhận đã gửi đi',
  os_quote_t:'Bên ngoài báo giá', os_cost:'Chi phí bên ngoài báo', os_sell_hint:'Gợi ý giá báo khách (+25%): {a}', os_days:'Số ngày sửa', os_quote_note:'Nội dung bên ngoài báo', os_quote_note_ph:'VD: thay IGBT + driver, bảo hành 6 tháng', os_quote_files:'File / hình báo giá của bên ngoài', os_quote_btn:'Nhập báo giá bên ngoài',
  os_go_repair:'Cho bên ngoài tiến hành sửa', os_wait_cust:'Chờ khách đồng ý báo giá của SGE rồi mới cho bên ngoài sửa.', os_cancel:'Thu hồi máy', os_back_t:'Nhận máy về từ bên ngoài', os_result:'Kết quả', osr_ok:'Sửa được', osr_fail:'Không sửa được', os_cost_real:'Chi phí thực trả (đ)', os_cost_real_hint:'Nhập 0 nếu bên ngoài không tính phí.',
  os_back_files:'Hóa đơn / bill của bên ngoài và hình máy nhận về', os_back_btn:'Đã nhận máy về', os_sell:'Giá báo khách', os_vendor_ct:'Liên hệ bên ngoài', os_payable:'Đề nghị chi trả bên ngoài', os_payable_hint:'chờ quản lý duyệt, kế toán chi',
  oss_sent:'Đã gửi đi', oss_quoted:'Bên ngoài báo giá', oss_repairing:'Đang sửa ngoài', oss_returned:'Đã nhận về', oss_cancelled:'Đã thu hồi', os_line:'Sửa chữa: {n}', os_diag_text:'Gửi {v} sửa: {n}',
  toast_os_sent:'Đã ghi nhận gửi máy đi', toast_os_quoted:'Đã lưu báo giá bên ngoài', toast_os_back:'Đã nhận máy về, đã tạo đề nghị chi', err_os_out:'Máy đang ở đơn vị bên ngoài, chưa thể kiểm tra',
  n_os_sent:'{no}: máy đã gửi sang {v} sửa', n_os_quoted:'{no}: bên ngoài báo giá {a}', n_os_back:'{no}: máy đã về từ bên ngoài — {r}',
  h_os_sent:'gửi máy sang đơn vị khác sửa', h_os_quoted:'nhập báo giá bên ngoài', h_os_repairing:'cho bên ngoài tiến hành sửa', h_os_returned:'nhận máy về từ bên ngoài', h_os_cancelled:'thu hồi máy từ bên ngoài',
  pf_stage_os_send:'Gửi bên ngoài', pf_stage_os_quote:'Báo giá bên ngoài', pf_stage_os_return:'Nhận về từ bên ngoài', td_os:'Máy đang sửa ở bên ngoài' });
Object.assign(DICT.en,{ ec_outsource:'Outsourced repair', file_local_only:'File only available on the uploading device', pf_stage_report:'Inverter report', pf_title_report:'Inverter / diagnostic report', pf_hint_report:'Upload the inverter export (log, PDF, Excel, error screenshot) or test report.', pf_confirm_report:'Save & submit', h_proof_report:'uploaded inverter report',
  pf_stage_quote:'Quote sent', pf_title_quote:'Save the quote sent', pf_hint_quote:'Upload the quote sent to the customer (stamped PDF, photo, email…).', pf_confirm_quote:'Send quote', h_proof_quote:'saved the sent quote', ex_quote_note:'Supplementary quote {no}',
  pf_stage_po_recv:'Purchase receipt', pf_title_po_recv:'Receipt documents', pf_hint_po_recv:'Photograph the invoice or supplier bill / delivery note and the goods.', pf_confirm_po_recv:'Confirm stock-in', pf_need_po:'At least one photo',
  dt_label:'Document', dt_vat:'VAT invoice', dt_retail:'Retail bill', dt_none:'No invoice', dt_hint_vat:'Photo or PDF/XML of the VAT invoice.', dt_hint_retail:'Photo of the bill, receipt or delivery note.', dt_hint_none:'Photo of the goods, handwritten receipt or transfer screenshot as evidence.',
  ex_proof:'Proof photos', ex_proof_hint:'Required with or without an invoice: invoice, bill, receipt or transfer screenshot.', ex_proof_req:'Upload at least one proof photo',
  os_btn:'Outsource repair', os_title:'Outsourced repair', os_send_t:'Send unit to another repairer', os_send_hint:'SGE still quotes and invoices the customer. The repairer fee becomes an expense on return.', os_vendor:'Repairer', os_partner:'partner', os_new_vendor:'Add new repairer', os_new_name:'Name',
  os_note:'Work requested', os_note_ph:'e.g. repair SG110CX power board, error 036', os_send_files:'Handover note / photos of the unit sent', os_send_btn:'Confirm sent',
  os_quote_t:'Repairer quote', os_cost:'Repairer cost', os_sell_hint:'Suggested customer price (+25%): {a}', os_days:'Days to repair', os_quote_note:'Repairer notes', os_quote_note_ph:'e.g. replace IGBT + driver, 6-month warranty', os_quote_files:'Repairer quote file / photo', os_quote_btn:'Enter repairer quote',
  os_go_repair:'Approve outside repair', os_wait_cust:'Wait for the customer to accept SGE’s quote first.', os_cancel:'Recall unit', os_back_t:'Receive unit back', os_result:'Result', osr_ok:'Repaired', osr_fail:'Not repairable', os_cost_real:'Actual cost (₫)', os_cost_real_hint:'Enter 0 if free of charge.',
  os_back_files:'Repairer invoice / bill and photos of the returned unit', os_back_btn:'Unit received back', os_sell:'Price to customer', os_vendor_ct:'Repairer contact', os_payable:'Payable to repairer', os_payable_hint:'awaiting approval and payment',
  oss_sent:'Sent', oss_quoted:'Quoted', oss_repairing:'Repairing outside', oss_returned:'Returned', oss_cancelled:'Recalled', os_line:'Repair: {n}', os_diag_text:'Sent to {v}: {n}',
  toast_os_sent:'Unit marked as sent', toast_os_quoted:'Repairer quote saved', toast_os_back:'Unit received; expense created', err_os_out:'The unit is still with the outside repairer',
  n_os_sent:'{no}: unit sent to {v}', n_os_quoted:'{no}: repairer quoted {a}', n_os_back:'{no}: unit back from repairer — {r}',
  h_os_sent:'sent the unit to another repairer', h_os_quoted:'entered repairer quote', h_os_repairing:'approved outside repair', h_os_returned:'received the unit back', h_os_cancelled:'recalled the unit',
  pf_stage_os_send:'Sent outside', pf_stage_os_quote:'Outside quote', pf_stage_os_return:'Back from outside', td_os:'Units being repaired outside' });
const _todayTasksOS=todayTasks; todayTasks=function(u){ const L0=_todayTasksOS(u); if(['manager','dev','engineer'].includes(u.role)){ const l=(DB.tickets||[]).filter(x=>osActive(x)&&(u.role!=='engineer'||x.assigneeId===u.id)); if(l.length) L0.push({key:'td_os',n:l.length,items:l}); } return L0; };
/* hoàn tiền cho khách là tiền ra, không phải thu âm */
const _cashLedgerR=cashLedger; cashLedger=function(u=me()){ return _cashLedgerR(u).map(r=>r.dir==='in'&&r.amount<0?Object.assign({},r,{dir:'out',amount:-r.amount,note:(r.note?r.note+' · ':'')+t('rf_title')}):r); };
Object.assign(DICT.vi,{ ec_rma:'Bảo hành hãng / NCC' }); Object.assign(DICT.en,{ ec_rma:'Vendor warranty' });

/* ===================================================================
   GỠ RMA / BẢO HÀNH HÃNG · KIỂM TRA MIỄN PHÍ
   =================================================================== */
(function(){ const i=EXP_CATS.indexOf('rma'); if(i>=0) EXP_CATS.splice(i,1); })();
const _tabAllowedNoRma=tabAllowed; tabAllowed=function(k,u=me()){ if(k==='rma') return false; return _tabAllowedNoRma(k,u); };
function cleanupLegacy(){ if(DB.rmas&&DB.rmas.length){ DB.rmasArchive=(DB.rmasArchive||[]).concat(DB.rmas); DB.rmas=[]; }
  (DB.scrap||[]).forEach(s=>{ if(s.state==='rma') s.state='hold'; });
  (DB.svc||[]).forEach(c=>{ if(c.status==='declined'&&c.items.length&&docPaid(c)===0&&!c.feeCleared){ c.items=[]; c.feeCleared=1; } });
  (DB.tickets||[]).forEach(x=>{ if(x.decline&&x.decline.fee) x.decline.fee=0; if(x.unrepairable&&x.unrepairable.fee) x.unrepairable.fee=0; }); }
Object.assign(DICT.vi,{ fee_waived:'SGE kiểm tra miễn phí, không thu phí khi khách không sửa.', ur_hint:'Máy sẽ được trả lại cho khách (SGE kiểm tra miễn phí). Linh kiện đã xuất sẽ được yêu cầu nhập lại kho.' });
Object.assign(DICT.en,{ fee_waived:'SGE inspects free of charge.', ur_hint:'The unit will be returned (free inspection). Issued parts will be requested back to stock.' });

/* ===================================================================
   NHẬT KÝ CHỈNH SỬA (ai sửa gì, lúc nào) — chỉ quản lý xem
   =================================================================== */
function audit(act,ref,detail){ DB.audit=DB.audit||[]; DB.audit.unshift({at:Date.now(),by:S.userId,act,ref:ref||'',detail:detail||''}); if(DB.audit.length>3000) DB.audit.length=3000; }
const wrapA=(name,fn)=>{ const prev=A[name]; if(!prev) return; A[name]=function(el,ev){ const pre=fn.before?fn.before(el):null; const r=prev(el,ev); try{ fn.after(el,pre); }catch(e){} return r; }; };
wrapA('paySave',{ before:()=>{ const m=S.ui.modal; const d=m&&docOf(m.id); return d?{d,n:(d.payments||[]).length}:null; }, after:(el,p)=>{ if(p&&(p.d.payments||[]).length>p.n){ const x=p.d.payments[p.d.payments.length-1]; audit('pay',p.d.no,`${money(x.amount)} · ${t('pm_'+(x.method||'bank'))}${x.deposit?' · '+t('qb_dep_note'):''}`); save(); } } });
wrapA('refundSave',{ before:()=>{ const m=S.ui.modal; const c=m&&svcById(m.id); return c?{c,n:(c.payments||[]).length}:null; }, after:(el,p)=>{ if(p&&p.c.payments.length>p.n){ audit('refund',p.c.no,money(-p.c.payments[p.c.payments.length-1].amount)); save(); } } });
wrapA('exSet',{ before:el=>{ const e=DB.expenses.find(x=>x.id===el.dataset.id); return e?{e,s:e.status}:null; }, after:(el,p)=>{ if(p&&p.e.status!==p.s){ audit('exp_'+p.e.status,p.e.no,money(p.e.amount)+' · '+L(p.e.desc)); save(); } } });
wrapA('exSave',{ before:()=>DB.expenses[0], after:(el,top)=>{ if(DB.expenses[0]!==top){ const e=DB.expenses[0]; audit('exp_new',e.no,money(e.amount)+' · '+L(e.desc)); save(); } } });
wrapA('mvSave',{ before:()=>DB.moves[0], after:(el,top)=>{ if(DB.moves[0]!==top){ const m=DB.moves[0]; audit('stock_'+m.type,m.no,`${m.pn} × ${m.qty}`); save(); } } });
wrapA('qApprove',{ after:el=>{ const c=svcById(el.dataset.id); audit('quote_ok',c.no,money(docTotal(c))); save(); } });
wrapA('depSet',{ after:el=>{ const c=svcById(el.dataset.id); audit('deposit_set',c.no,(c.depositPct||0)+'%'); save(); } });
wrapA('qRevise',{ after:el=>{ const c=svcById(el.dataset.id); audit('quote_revise',c.no,''); save(); } });
wrapA('storageFee',{ after:el=>{ const x=ticketById(el.dataset.id); audit('storage_fee',x.no,''); save(); } });
const _edCommitA=edCommit; edCommit=function(id){ const d=docOf(id); const before=d?docTotal(d)+'|'+(d.discount||0)+'|'+(d.vat||0):null; const r=_edCommitA(id); try{ if(d&&before!==docTotal(d)+'|'+(d.discount||0)+'|'+(d.vat||0)){ const [b0,dc,v]=before.split('|'); audit('doc_edit',d.no,`${money(+b0)} → ${money(docTotal(d))}${+dc!==(Number(d.discount)||0)?` · ${t('discount')} ${dc}% → ${d.discount||0}%`:''}${+v!==(Number(d.vat)||0)?` · VAT ${v}% → ${d.vat}%`:''}`); } }catch(e){} return r; };
const _logHA=logH; logH=function(x,action,by,from,to,note){ const r=_logHA(x,action,by,from,to,note); try{ if(['unrepairable','customer_agreed','declined','delivered','invoiced','reassigned'].includes(action)) audit('tk_'+action,x.no,note||''); }catch(e){} return r; };
function viewAudit(){ const f=perState('aud'); const r=perRange(f); const q=(f.q||'').toLowerCase(); const who=f.who||'';
  let arr=(DB.audit||[]).filter(a=>a.at>=r.from&&a.at<r.to); if(who) arr=arr.filter(a=>a.by===who); if(f.act) arr=arr.filter(a=>a.act.startsWith(f.act)); if(q) arr=arr.filter(a=>(a.ref+' '+a.detail+' '+t('au_'+a.act)).toLowerCase().includes(q));
  const users=[...new Set((DB.audit||[]).map(a=>a.by))];
  return `<div class="page-head"><div><h1>${t('nav_audit')}</h1><div class="sub">${t('au_sub')}</div></div></div>${perBar('aud')}
  <div class="card"><div class="toolbar"><div class="row grow">${searchBox('aud-q','aud.q',f.q)}<select class="select" style="width:auto" data-bind="aud.who" data-re><option value="">${t('au_all_people')}</option>${users.map(id=>`<option value="${id}" ${who===id?'selected':''}>${esc(uname(id))}</option>`).join('')}</select><select class="select" style="width:auto" data-bind="aud.act" data-re><option value="">${t('au_all_acts')}</option>${['pay','refund','exp','doc_edit','quote','deposit','stock','count','tk_','backup','price','om_'].map(k=>`<option value="${k}" ${f.act===k?'selected':''}>${t('auf_'+k.replace(/_$/,''))}</option>`).join('')}</select></div></div>
  ${arr.length?`<div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('au_time')}</th><th>${t('au_who')}</th><th>${t('au_act')}</th><th>${t('au_ref')}</th><th>${t('au_detail')}</th></tr></thead><tbody>${arr.slice(0,300).map(a=>`<tr><td data-l="${t('au_time')}" class="num nowrap">${fmtDT(a.at)}</td><td data-l="${t('au_who')}">${esc(uname(a.by))}</td><td data-l="${t('au_act')}"><span class="kst ${/refund|rejected|count/.test(a.act)?'k-warn':/pay|paid/.test(a.act)?'k-ok':'k-blue'}">${t('au_'+a.act)}</span></td><td data-l="${t('au_ref')}" class="mono">${esc(a.ref)}</td><td data-l="${t('au_detail')}">${esc(a.detail)}</td></tr>`).join('')}</tbody></table></div>${arr.length>300?`<p class="hint" style="padding:8px 16px">${t('au_more',{n:arr.length-300})}</p>`:''}`:`<div class="empty">${t('au_empty')}</div>`}</div>`; }

/* ===================================================================
   HỢP ĐỒNG BẢO TRÌ: lập kỳ thu tiền, xuất hóa đơn, công nợ
   Mỗi kỳ thu là 1 chứng từ dịch vụ (mã DV) → tự vào Công nợ, Sổ quỹ, Hóa đơn, Lãi lỗ
   =================================================================== */
const omBillCycle=o=>Number(o.billCycle||o.cycle||3);
function omBillPlan(o){ const out=[]; if(!o.value) return out; const cyc=omBillCycle(o); const end=o.end||addMonthsTs(o.start,12); let s=o.start; const starts=[]; while(s<end&&starts.length<60){ starts.push(s); s=addMonthsTs(s,cyc); }
  const each=Math.round(o.value/starts.length/1000)*1000; starts.forEach((st,i)=>out.push({k:i,start:st,end:Math.min(addMonthsTs(st,cyc),end),amount:i===starts.length-1?o.value-each*(starts.length-1):each})); return out; }
function omBills(o){ return (DB.svc||[]).filter(c=>c.omId===o.id).sort((a,b)=>a.omK-b.omK); }
function omGenBills(){ (DB.oms||[]).forEach(o=>{ const site=siteById(o.siteId)||{}; omBillPlan(o).forEach(p=>{ if(p.start>Date.now()+7*DAYMS) return; if((DB.svc||[]).some(c=>c.omId===o.id&&c.omK===p.k)) return;
  const c={ id:'sc'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), no:erpNo('DV'), customerId:site.customerId, ticketId:null, sn:'', model:'', at:p.start, items:[{type:'other',desc:t('om_bill_line',{no:o.no,a:fmtD(p.start),b:fmtD(p.end-1)}),qty:1,price:p.amount}], vat:8, discount:0, payments:[], status:'signed', signedAt:p.start, agreedAt:p.start, createdBy:'u_acc', omId:o.id, omK:p.k, dueDays:15, kind:'om', validDays:15, repairWarrantyMonths:0 };
  if(o.id==='om1'||o.id==='om2'){ if(p.end<Date.now()-10*DAYMS){ c.invoice={no:erpNo('HD'),at:p.start+3*DAYMS,by:'u_acc'}; c.payments.push({at:p.start+9*DAYMS,amount:docTotal(c),method:'bank',by:'u_acc',note:''}); } else if(p.start<Date.now()){ c.invoice={no:erpNo('HD'),at:p.start+2*DAYMS,by:'u_acc'}; } }
  DB.svc.unshift(c); }); }); }
A.omInvoice = el => { if(S._proofOK!=='invoice'){ const c=svcById(el.dataset.id); if(!can('invoice_issue')) return finDeny(); return proofAsk('invoice',null,c.id,{a:'omInvoice',ds:Object.assign({},el.dataset)}); }
  const c=svcById(el.dataset.id); c.invoice={no:erpNo('HD'),at:Date.now(),by:S.userId}; audit('om_invoice',c.no,money(docTotal(c))); save(); rerender(); toast(t('toast_inv_ok'),'ok'); };
function omBillsHtml(o){ const bills=omBills(o); const plan=omBillPlan(o); if(!o.value) return `<span class="muted">${t('om_no_value')}</span>`;
  return `<div class="table-wrap"><table class="tbl compact"><thead><tr><th>${t('om_period')}</th><th>${t('contract_no')}</th><th class="r">${t('amount')}</th><th>${t('fin_invoice')}</th><th class="r">${t('paid_amt')}</th><th></th></tr></thead><tbody>${plan.map(p=>{ const c=bills.find(b=>b.omK===p.k);
    return `<tr><td class="num nowrap">${fmtD(p.start)} – ${fmtD(p.end-1)}</td><td class="mono">${c?`<button class="link-btn mono" data-a="nav" data-k="sc:${c.id}">${c.no}</button>`:'<span class="muted">'+t('om_not_yet')+'</span>'}</td><td class="r num">${money(c?docTotal(c):Math.round(p.amount*1.08))}</td><td>${c&&c.invoice?`<span class="mono">${c.invoice.no}</span>`:'—'}</td><td class="r num">${c?money(docPaid(c)):'—'}</td>
      <td class="nowrap">${c&&!c.invoice&&can('invoice_issue')?`<button class="btn sm" data-a="omInvoice" data-id="${c.id}">${t('om_issue')}</button>`:''}${c&&docDue(c)>0&&can('pay_record')?` <button class="btn sm primary" data-a="payAsk" data-id="${c.id}">${t('om_collect')}</button>`:''}</td></tr>`; }).join('')}</tbody></table></div>`; }
/* thêm "kỳ thu tiền" vào form HĐ bảo trì và bảng thu tiền */
const _mOmB=MODALS.om; MODALS.om=m=>{ const r=_mOmB(m); const f=m.f; f.billCycle=f.billCycle||(m.id&&omById(m.id)&&omById(m.id).billCycle)||f.cycle; r.body=r.body.replace('<p class="hint">',`<div class="field full" style="margin-top:12px"><span class="lbl">${t('om_bill')}</span><div class="seg">${[1,3,6,12].map(c=>`<button class="${+f.billCycle===c?'on':''}" data-a="omBillC" data-c="${c}">${t('om_bill_every',{n:c})}</button>`).join('')}</div><div class="hint">${t('om_bill_hint')}</div></div><p class="hint">`); return r; };
A.omBillC = el => { S.ui.modal.f.billCycle=+el.dataset.c; rerender(); };
const _omSaveB=A.omSave; A.omSave=()=>{ const m=S.ui.modal; const bc=+m.f.billCycle||+m.f.cycle; const id=m.id; const n0=(DB.oms||[]).length; _omSaveB(); const o=id?omById(id):DB.oms[DB.oms.length-1]; if(o){ o.billCycle=bc; audit(id?'om_edit':'om_new',o.no,money(o.value)); omGenBills(); save(); rerender(); } };
const _viewFieldB=viewField; viewField=function(){ let h=_viewFieldB(); const f=S.ui.fld; if(f&&f.tab==='oms'&&(DB.oms||[]).length){ h=h.replace(/<\/div>\s*$/, `<div class="card-b">${(DB.oms||[]).map(o=>`<div class="om-bills"><h4>${esc(o.no)} · ${esc((siteById(o.siteId)||{}).name||'')} <small class="muted">${t('om_bill_every',{n:omBillCycle(o)})} · ${money(o.value||0)} ${t('om_ex_vat')}</small></h4>${omBillsHtml(o)}</div>`).join('')}</div></div>`); } return h; };

/* ===================================================================
   BÁO CÁO LÃI LỖ (theo hóa đơn) · VAT ĐẦU RA / ĐẦU VÀO · TUỔI NỢ
   =================================================================== */
const revOf=d=>docSubtotal(d)-docDiscount(d);
function soCost(d){ return (d.items||[]).reduce((s,i)=>{ const st=stockBy(i.pn); const c=i.costAt!=null?i.costAt:(st?st.cost:0); return s+c*(Number(i.qty)||0); },0); }
function pnlData(r){ const inR=ts=>ts&&ts>=r.from&&ts<r.to;
  const svcInv=(DB.svc||[]).filter(c=>c.invoice&&inR(c.invoice.at)&&c.status!=='cancelled'); const soInv=(DB.orders||[]).filter(d=>d.invoice&&inR(d.invoice.at)&&d.status!=='cancelled');
  const repInv=svcInv.filter(c=>c.kind!=='om'), omInv=svcInv.filter(c=>c.kind==='om');
  const revRep=repInv.reduce((s,c)=>s+revOf(c),0), revOm=omInv.reduce((s,c)=>s+revOf(c),0), revSo=soInv.reduce((s,d)=>s+revOf(d),0);
  const cogsRep=repInv.reduce((s,c)=>{ const x=c.ticketId&&ticketById(c.ticketId); return s+(x?jobCost(x).parts:0); },0); const cogsSo=soInv.reduce((s,d)=>s+soCost(d),0);
  const exps=(DB.expenses||[]).filter(e=>['approved','paid'].includes(e.status)&&inR(e.at));
  const outs=exps.filter(e=>e.cat==='outsource').reduce((s,e)=>s+e.amount,0);
  const opex={}; exps.filter(e=>e.cat!=='outsource').forEach(e=>{ opex[e.cat]=(opex[e.cat]||0)+e.amount; }); const opexTot=Object.values(opex).reduce((a,b)=>a+b,0);
  const rev=revRep+revOm+revSo, cogs=cogsRep+cogsSo+outs, gross=rev-cogs, net=gross-opexTot;
  const unbilled=(DB.tickets||[]).filter(x=>['delivered','invoiced','paid','closed'].includes(x.status)&&x.svcId&&(()=>{ const c=svcById(x.svcId); return c&&!c.invoice&&docTotal(c)>0&&c.status!=='cancelled'; })());
  return {revRep,revOm,revSo,rev,cogsRep,cogsSo,outs,cogs,gross,opex,opexTot,net,unbilled,svcInv,soInv}; }
function viewPnl(){ const f=perState('pnl'); const r=perRange(f); const p=pnlData(r); const pc=v=>p.rev?` <small class="muted">${Math.round(v/p.rev*100)}%</small>`:'';
  const B=perBuckets(r).filter(b=>b.s<=Date.now()); const sub=B.length>14?B.filter((b,i)=>i%Math.ceil(B.length/12)===0):B; const mb=B.length>40?(()=>{ const out=[]; let d=new Date(r.from); while(d.getTime()<Math.min(r.to,Date.now())){ const n=new Date(d.getFullYear(),d.getMonth()+1,1); out.push({s:d.getTime(),e:n.getTime(),l:'T'+(d.getMonth()+1)}); d=n; } return out; })():B;
  const series=mb.map(b=>pnlData({from:b.s,to:b.e}));
  const row=(l,v,cls,ind)=>`<tr class="${cls||''}"><td style="${ind?'padding-left:28px':''}">${l}</td><td class="r num">${money(v)}${cls&&cls.includes('tot')?'':pc(v)}</td></tr>`;
  return `${perBar('pnl')}<div class="stat-row task-stats" style="padding:0 16px">${[[t('pl_rev'),p.rev,''],[t('pl_gross'),p.gross,p.gross<0?'var(--bad)':'var(--ok)'],[t('pl_opex'),p.opexTot,''],[t('pl_net'),p.net,p.net<0?'var(--bad)':'var(--ok)']].map(([l,v,c])=>`<div class="card stat"><div class="l">${l}</div><div class="v" ${c?`style="color:${c}"`:''}>${moneyS(v)}</div></div>`).join('')}</div>
  <div class="report-grid" style="padding:0 16px 16px"><div class="card"><div class="card-h"><h3>${t('pl_title')}</h3><span class="hint">${t('pl_basis')}</span></div><div class="table-wrap"><table class="tbl pnl">
    ${row('<b>'+t('pl_rev')+'</b>',p.rev,'tot')}${row(t('pl_rev_rep'),p.revRep,'',1)}${row(t('pl_rev_om'),p.revOm,'',1)}${row(t('pl_rev_so'),p.revSo,'',1)}
    ${row('<b>'+t('pl_cogs')+'</b>',p.cogs,'tot')}${row(t('pl_cogs_rep'),p.cogsRep,'',1)}${row(t('pl_cogs_out'),p.outs,'',1)}${row(t('pl_cogs_so'),p.cogsSo,'',1)}
    ${row('<b>'+t('pl_gross')+'</b>',p.gross,'tot hl')}${row('<b>'+t('pl_opex')+'</b>',p.opexTot,'tot')}${Object.entries(p.opex).sort((a,b)=>b[1]-a[1]).map(([k,v])=>row(t('ec_'+k),v,'',1)).join('')}
    ${row('<b>'+t('pl_net')+'</b>',p.net,'tot hl '+(p.net<0?'neg':'pos'))}</table></div>${p.unbilled.length?`<div class="tk-al warn" style="margin:12px 16px">${ic('alert',15)}<span>${t('pl_unbilled',{n:p.unbilled.length,a:money(p.unbilled.reduce((s,x)=>s+revOf(svcById(x.svcId)),0))})} ${p.unbilled.slice(0,6).map(x=>`<button class="link-btn mono" data-a="goTicket" data-id="${x.id}">${x.no}</button>`).join(' ')}</span></div>`:''}</div>
    <div class="card"><div class="card-h"><h3>${t('pl_trend')}</h3></div><div class="card-b">${Charts.line({labels:mb.map(b=>b.l),series:[{name:t('pl_rev'),color:'#2f6db5',values:series.map(s=>s.rev)},{name:t('pl_cogs')+' + '+t('pl_opex'),color:'#E8871E',values:series.map(s=>s.cogs+s.opexTot)},{name:t('pl_net'),color:'#1f8a5b',values:series.map(s=>s.net)}],h:280})}</div></div></div>`; }
function viewVat(){ const f=perState('vat'); const r=perRange(f); const inR=ts=>ts&&ts>=r.from&&ts<r.to;
  const out=[...(DB.svc||[]),...(DB.orders||[])].filter(d=>d.invoice&&inR(d.invoice.at)&&d.status!=='cancelled').map(d=>({no:d.invoice.no,doc:d.no,at:d.invoice.at,party:custName(d.customerId),base:revOf(d),vat:docVat(d)}));
  const inPo=(DB.purchases||[]).filter(p=>p.receivedAt&&inR(p.receivedAt)).map(p=>({no:p.no,at:p.receivedAt,party:(supById(p.supplierId)||{}).name||'',base:revOf(p),vat:p.docType==='vat'||!p.docType?docVat(p):0,dt:p.docType||'vat',kind:'po'}));
  const inEx=(DB.expenses||[]).filter(e=>['approved','paid'].includes(e.status)&&inR(e.at)).map(e=>({no:e.no,at:e.at,party:L(e.desc),base:e.amount-(Number(e.vat)||0),vat:e.docType==='vat'?Number(e.vat)||0:0,dt:e.docType||'none',kind:'exp',amount:e.amount,method:e.method}));
  const ins=inPo.concat(inEx); const vOut=out.reduce((s,x)=>s+x.vat,0), vIn=ins.reduce((s,x)=>s+x.vat,0);
  const noInv=ins.filter(x=>x.dt!=='vat'); const noInvAmt=noInv.reduce((s,x)=>s+(x.amount||x.base),0);
  const cash20=[...(DB.purchases||[]).flatMap(p=>(p.payments||[]).filter(y=>inR(y.at)&&y.method==='cash'&&y.amount>=20000000).map(y=>({no:p.no,amount:y.amount}))),...inEx.filter(x=>x.method==='cash'&&x.amount>=20000000).map(x=>({no:x.no,amount:x.amount}))];
  const tbl=(rows,cols)=>rows.length?`<div class="table-wrap"><table class="tbl compact cards"><thead><tr>${cols.map(c=>`<th class="${c.r?'r':''}">${c.h}</th>`).join('')}</tr></thead><tbody>${rows.map(x=>`<tr>${cols.map(c=>`<td data-l="${c.h}" class="${c.r?'r num':''}">${c.v(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="empty">${t('no_data')}</div>`;
  return `${perBar('vat')}<div class="stat-row task-stats" style="padding:0 16px"><div class="card stat"><div class="l">${t('vat_out')}</div><div class="v">${moneyS(vOut)}</div></div><div class="card stat"><div class="l">${t('vat_in')}</div><div class="v">${moneyS(vIn)}</div></div><div class="card stat"><div class="l">${t('vat_pay')}</div><div class="v" style="color:${vOut-vIn>0?'var(--bad)':'var(--ok)'}">${moneyS(vOut-vIn)}</div></div><div class="card stat"><div class="l">${t('vat_noinv')}</div><div class="v" style="color:${noInvAmt?'var(--warn)':'inherit'}">${moneyS(noInvAmt)}</div></div></div>
  ${cash20.length?`<div class="tk-al bad" style="margin:0 16px 12px">${ic('alert',15)}<span>${t('vat_cash20',{n:cash20.length})} ${cash20.map(c=>`<b class="mono">${c.no}</b> ${money(c.amount)}`).join(', ')}</span></div>`:''}
  <div class="report-grid" style="padding:0 16px 16px"><div class="card"><div class="card-h"><h3>${t('vat_out_list')}</h3><span class="hint">${out.length}</span></div>${tbl(out,[{h:t('fin_invoice'),v:x=>`<span class="mono">${x.no}</span><br><small class="muted mono">${x.doc}</small>`},{h:t('doc_date'),v:x=>fmtD(x.at)},{h:t('customer'),v:x=>esc(x.party)},{h:t('vat_base'),v:x=>money(x.base),r:1},{h:'VAT',v:x=>money(x.vat),r:1}])}</div>
  <div class="card"><div class="card-h"><h3>${t('vat_in_list')}</h3><span class="hint">${ins.length}</span></div>${tbl(ins.sort((a,b)=>b.at-a.at),[{h:t('rq_no'),v:x=>`<span class="mono">${x.no}</span>`},{h:t('doc_date'),v:x=>fmtD(x.at)},{h:t('vat_party'),v:x=>esc(x.party)},{h:t('dt_label'),v:x=>`<span class="kst ${x.dt==='vat'?'k-ok':x.dt==='retail'?'k-warn':'k-bad'}">${t('dt_'+x.dt)}</span>`},{h:t('vat_base'),v:x=>money(x.base),r:1},{h:'VAT',v:x=>money(x.vat),r:1}])}</div></div>`; }
/* tiền thuế VAT trên chi phí có hóa đơn VAT */
const _exFormV=MODALS.exForm; MODALS.exForm=m=>{ const r=_exFormV(m); if(m.f.docType==='vat') r.body=r.body.replace(`<div class="field full"><span class="lbl req">${t('ex_proof')}</span>`,`<div class="field"><label for="ex-vat">${t('vat_amt')}</label><input class="input num" type="number" id="ex-vat" data-bind="modal.f.vat" value="${esc(m.f.vat||'')}"><div class="hint">${t('vat_amt_hint')}</div></div><div class="field full"><span class="lbl req">${t('ex_proof')}</span>`); return r; };
const _exSaveV=A.exSave; A.exSave=()=>{ const m=S.ui.modal; const v=m&&m.f&&m.f.docType==='vat'?Number(m.f.vat)||0:0; const top=DB.expenses[0]; _exSaveV(); if(DB.expenses[0]!==top&&v){ DB.expenses[0].vat=v; save(); } };
/* tuổi nợ phải thu / phải trả + nhắc nợ */
const AGE_B=[['cur',-1e9,0],['b30',0,30],['b60',30,60],['b90',60,90],['b90p',90,1e9]];
function arDueAt(d){ if(d.omId||d.kind==='om') return d.at+(d.dueDays||15)*DAYMS; if(d.ticketId!==undefined){ const x=d.ticketId&&ticketById(d.ticketId); const del=x&&histAt(x,['delivered']); return (del||d.invoice&&d.invoice.at||d.signedAt||d.at)+(d.dueDays||10)*DAYMS; } return dueAt(d); }
function viewAging(){ const u=me(); const now=Date.now(); const ar=arDocs(u).filter(d=>d.status!=='declined'); const ap=apDocs(u);
  const apDue=p=>(p.receivedAt||p.at)+((supById(p.supplierId)||{}).terms||30)*DAYMS; const bucket=(due)=>{ const od=(now-due)/DAYMS; return AGE_B.find(([,a,b])=>od>a&&od<=b)[0]; };
  const sumB=(arr,dueFn)=>{ const s={}; AGE_B.forEach(([k])=>s[k]=0); arr.forEach(d=>{ s[bucket(dueFn(d))]+=docDue(d); }); return s; };
  const sA=sumB(ar,arDueAt), sP=sumB(ap,apDue);
  const bar=s=>{ const tot=Object.values(s).reduce((a,b)=>a+b,0)||1; return `<div class="agebar">${AGE_B.map(([k])=>s[k]?`<i class="ag-${k}" style="width:${s[k]/tot*100}%" title="${t('age_'+k)}: ${money(s[k])}"></i>`:'').join('')}</div><div class="agelegend">${AGE_B.map(([k])=>`<span><i class="ag-${k}"></i>${t('age_'+k)} <b>${moneyS(s[k])}</b></span>`).join('')}</div>`; };
  const rows=(arr,dueFn,isAr)=>arr.map(d=>({d,due:dueFn(d)})).sort((a,b)=>a.due-b.due).map(({d,due})=>{ const od=Math.floor((now-due)/DAYMS); const k=bucket(due); const party=isAr?custName(d.customerId):(supById(d.supplierId)||{}).name||'';
    return `<tr><td data-l="${t('rq_no')}"><button class="link-btn mono" data-a="nav" data-k="${isAr?(d.items&&DB.orders.includes(d)?'so:':'sc:'):'po:'}${d.id}">${d.no}</button></td><td data-l="${t(isAr?'customer':'vat_party')}">${esc(party)}</td><td data-l="${t('due_date')}" class="num nowrap">${fmtD(due)}</td><td data-l="${t('age_days')}" class="r num" style="${od>0?'color:var(--bad);font-weight:600':''}">${od>0?od:'—'}</td><td data-l="${t('amount')}" class="r num">${money(docDue(d))}</td><td data-l=""><span class="agechip ag-${k}">${t('age_'+k)}</span></td>
      <td class="nowrap">${isAr&&od>0&&can('debt_manage')?`<button class="btn sm" data-a="dunAsk" data-id="${d.id}">${t('dun_btn')}</button>${d.dun&&d.dun.length?` <small class="muted">${t('dun_last',{n:d.dun.length,d:fmtD(d.dun[d.dun.length-1].at)})}</small>`:''}`:''}</td></tr>`; }).join('');
  const head=isAr=>`<thead><tr><th>${t('rq_no')}</th><th>${t(isAr?'customer':'vat_party')}</th><th>${t('due_date')}</th><th class="r">${t('age_days')}</th><th class="r">${t('amount')}</th><th>${t('age_group')}</th><th></th></tr></thead>`;
  return `<div class="report-grid" style="padding:16px"><div class="card full"><div class="card-h"><h3>${t('age_ar')}</h3><b>${money(ar.reduce((s,d)=>s+docDue(d),0))}</b></div><div class="card-b">${bar(sA)}</div><div class="table-wrap"><table class="tbl cards">${head(1)}<tbody>${rows(ar,arDueAt,1)}</tbody></table></div></div>
    <div class="card full"><div class="card-h"><h3>${t('age_ap')}</h3><b>${money(ap.reduce((s,d)=>s+docDue(d),0))}</b></div><div class="card-b">${bar(sP)}</div><div class="table-wrap"><table class="tbl cards">${head(0)}<tbody>${rows(ap,apDue,0)}</tbody></table></div></div></div>`; }
A.dunAsk = el => { const d=docOf(el.dataset.id); if(!d) return; d.dun=d.dun||[]; d.dun.push({at:Date.now(),by:S.userId}); if(d.customerId) notify({toCustomer:d.customerId,key:'n_dun',vars:{no:d.no,a:money(docDue(d))}}); audit('dun',d.no,money(docDue(d))); save(); rerender(); toast(t('toast_dun'),'ok'); };

/* ===================================================================
   KIỂM KÊ KHO: đếm thực tế → gửi duyệt → quản lý duyệt → tự điều chỉnh tồn
   =================================================================== */
function countView(f){ const cs=DB.counts||[]; const cur=f.cid&&cs.find(c=>c.id===f.cid);
  if(cur) return {tools:`<div class="row grow"><button class="btn sm" data-a="cntBack">← ${t('back')}</button><b class="mono">${cur.no}</b> <span class="kst ${cur.status==='done'?'k-ok':cur.status==='sent'?'k-blue':'k-warn'}">${t('cnts_'+cur.status)}</span></div>`, body:countSheet(cur)};
  const tools=`<div class="row grow"><span class="hint">${t('cnt_hint')}</span></div>${can('stock_move')?`<button class="btn primary sm" data-a="cntNew">${ic('plus',14)} ${t('cnt_new')}</button>`:''}`;
  const body=cs.length?`<div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('rq_no')}</th><th>${t('doc_date')}</th><th>${t('cnt_by')}</th><th class="r">${t('cnt_lines')}</th><th class="r">${t('cnt_diff_n')}</th><th class="r">${t('cnt_diff_v')}</th><th>${t('status')}</th></tr></thead><tbody>${cs.map(c=>{ const dl=c.lines.filter(l=>l.count!==''&&+l.count!==l.sys); const dv=dl.reduce((s,l)=>s+(+l.count-l.sys)*l.cost,0);
    return `<tr class="clickable" data-a="cntOpen" data-id="${c.id}"><td data-l="${t('rq_no')}" class="mono">${c.no}</td><td data-l="${t('doc_date')}" class="num">${fmtD(c.at)}</td><td data-l="${t('cnt_by')}">${esc(uname(c.by))}</td><td data-l="${t('cnt_lines')}" class="r num">${c.lines.length}</td><td data-l="${t('cnt_diff_n')}" class="r num">${dl.length}</td><td data-l="${t('cnt_diff_v')}" class="r num" style="color:${dv<0?'var(--bad)':dv>0?'var(--ok)':'inherit'}">${money(dv)}</td><td data-l="${t('status')}"><span class="kst ${c.status==='done'?'k-ok':c.status==='sent'?'k-blue':'k-warn'}">${t('cnts_'+c.status)}</span></td></tr>`; }).join('')}</tbody></table></div>`:`<div class="empty">${t('cnt_empty')}</div>`;
  return {tools,body}; }
function countSheet(c){ const edit=c.status==='draft'&&can('stock_move'); const appr=c.status==='sent'&&(can('ticket_approve')||isBossRole(me()));
  const lines=c.lines.map((l,i)=>{ const d=l.count===''?null:+l.count-l.sys; return `<tr class="${d?(d<0?'cnt-neg':'cnt-pos'):''}"><td class="mono">${esc(l.pn)}</td><td>${esc(partName(l.pn))}<br><small class="muted">${esc(l.loc||'')}</small></td><td class="r num">${l.sys}</td><td class="r">${edit?`<input class="input sm num" style="width:84px" type="number" min="0" data-cnt="${i}" data-cid="${c.id}" value="${l.count}" inputmode="numeric">`:(l.count===''?'—':l.count)}</td><td class="r num" style="font-weight:600;color:${d<0?'var(--bad)':d>0?'var(--ok)':'inherit'}">${d==null?'':d>0?'+'+d:d}</td><td>${edit&&d?`<input class="input sm" data-cntr="${i}" data-cid="${c.id}" value="${esc(l.reason||'')}" placeholder="${t('cnt_reason_ph')}">`:esc(l.reason||'')}</td></tr>`; }).join('');
  const done=c.lines.filter(l=>l.count!=='').length; const dl=c.lines.filter(l=>l.count!==''&&+l.count!==l.sys); const dv=dl.reduce((s,l)=>s+(+l.count-l.sys)*l.cost,0);
  return `<div class="card-b"><div class="row" style="gap:16px;flex-wrap:wrap;margin-bottom:12px"><span>${t('cnt_progress',{a:done,b:c.lines.length})}</span><span>${t('cnt_diff_n')}: <b>${dl.length}</b></span><span>${t('cnt_diff_v')}: <b style="color:${dv<0?'var(--bad)':'inherit'}">${money(dv)}</b></span>${edit?`<button class="btn sm soft" data-a="cntFill" data-id="${c.id}">${t('cnt_fill')}</button>`:''}</div>
    <div class="table-wrap"><table class="tbl compact"><thead><tr><th>${t('item_code')}</th><th>${t('item_name')}</th><th class="r">${t('cnt_sys')}</th><th class="r">${t('cnt_real')}</th><th class="r">${t('cnt_diff')}</th><th>${t('cnt_reason')}</th></tr></thead><tbody>${lines}</tbody></table></div>
    <div class="row" style="gap:8px;margin-top:14px;flex-wrap:wrap">${edit?`<button class="btn primary" data-a="cntSend" data-id="${c.id}">${t('cnt_send')}</button><button class="btn danger" data-a="cntDel" data-id="${c.id}">${t('delete')}</button>`:''}${appr?`<button class="btn okb" data-a="cntApprove" data-id="${c.id}">${ic('check',15)} ${t('cnt_approve')}</button><button class="btn" data-a="cntReturn" data-id="${c.id}">${t('request_more')}</button>`:''}${c.status==='done'?`<span class="hint">${t('cnt_done_by',{u:esc(uname(c.approvedBy)),d:fmtDT(c.doneAt)})}</span>`:''}</div></div>`; }
document.addEventListener('change',ev=>{ const el=ev.target; if(!el||!el.dataset) return; const cid=el.dataset.cid; if(!cid) return; const c=(DB.counts||[]).find(z=>z.id===cid); if(!c) return;
  if(el.dataset.cnt!=null){ c.lines[+el.dataset.cnt].count=el.value===''?'':Math.max(0,Math.round(Number(el.value)||0)); save(); rerender(); }
  if(el.dataset.cntr!=null){ c.lines[+el.dataset.cntr].reason=el.value; save(); } });
A.cntNew = () => { DB.counts=DB.counts||[]; const c={id:'kk'+Date.now().toString(36),no:erpNo('KK'),at:Date.now(),by:S.userId,status:'draft',lines:DB.stock.map(s=>({pn:s.pn,sys:s.qty,count:'',cost:s.cost||0,loc:s.loc||'',reason:''}))}; DB.counts.unshift(c); S.ui.stk.cid=c.id; audit('count_new',c.no,''); save(); rerender(); };
A.cntOpen = el => { S.ui.stk.cid=el.dataset.id; rerender(); }; A.cntBack = () => { S.ui.stk.cid=null; rerender(); };
A.cntFill = el => { const c=DB.counts.find(z=>z.id===el.dataset.id); c.lines.forEach(l=>{ if(l.count==='') l.count=l.sys; }); save(); rerender(); };
A.cntDel = el => { DB.counts=DB.counts.filter(z=>z.id!==el.dataset.id); S.ui.stk.cid=null; save(); rerender(); };
A.cntSend = el => { const c=DB.counts.find(z=>z.id===el.dataset.id); const left=c.lines.filter(l=>l.count==='').length; if(left){ toast(t('cnt_left',{n:left}),'bad'); return; } const nr=c.lines.filter(l=>+l.count!==l.sys&&!String(l.reason||'').trim()).length; if(nr){ toast(t('cnt_need_reason',{n:nr}),'bad'); return; }
  c.status='sent'; c.sentAt=Date.now(); notify({toRole:'manager',key:'n_cnt',vars:{no:c.no}}); audit('count_send',c.no,''); save(); rerender(); toast(t('toast_cnt_sent'),'ok'); };
A.cntReturn = el => { const c=DB.counts.find(z=>z.id===el.dataset.id); c.status='draft'; save(); rerender(); };
A.cntApprove = el => { const c=DB.counts.find(z=>z.id===el.dataset.id); const now=Date.now(); let n=0;
  c.lines.forEach(l=>{ const s=stockBy(l.pn); const real=+l.count; if(!s) return; const d=real-s.qty; if(d!==0){ s.qty=real; logMove(d>0?'in':'out',l.pn,Math.abs(d),{kind:'count',id:c.id},t('cnt_mv',{no:c.no})+(l.reason?' · '+l.reason:'')); n++; } });
  c.status='done'; c.doneAt=now; c.approvedBy=S.userId; audit('count_done',c.no,t('cnt_adj_n',{n})); save(); rerender(); toast(t('toast_cnt_done',{n}),'ok'); };

/* ===================================================================
   BẢNG GIÁ DỊCH VỤ + CẢNH BÁO BÁO GIÁ DƯỚI GIÁ VỐN
   =================================================================== */
function seedPrices(){ if(DB.prices) return; DB.prices=[
  {id:'pr1',name:'Công kiểm tra, sửa chữa board công suất',model:'SG110CX',price:3500000,cost:0},{id:'pr2',name:'Thay IGBT module (công)',model:'SG110CX',price:2500000,cost:0},{id:'pr3',name:'Sửa board AC relay',model:'',price:1800000,cost:0},
  {id:'pr4',name:'Vệ sinh, bảo dưỡng biến tần tại xưởng',model:'',price:800000,cost:0},{id:'pr5',name:'Cập nhật firmware, cấu hình',model:'',price:500000,cost:0},{id:'pr6',name:'Vận chuyển 2 chiều nội thành',model:'',price:600000,cost:300000}]; }
function quoteCost(c){ const x=c.ticketId&&ticketById(c.ticketId); let cost=c.items.filter(i=>i.type==='part'&&i.pn).reduce((s,i)=>{ const st=stockBy(i.pn); return s+(st?st.cost:0)*(Number(i.qty)||0); },0);
  if(x&&x.os&&(x.os.realCost!=null||x.os.cost)) cost+=x.os.realCost!=null?x.os.realCost:x.os.cost; c.items.filter(i=>i.priceId).forEach(i=>{ const p=(DB.prices||[]).find(z=>z.id===i.priceId); if(p&&p.cost) cost+=p.cost*(Number(i.qty)||0); }); return cost; }
const belowCost=c=>c&&docTotal(c)>0&&revOf(c)<quoteCost(c);
const lowParts=c=>(c.items||[]).filter(i=>i.type==='part'&&i.pn&&(Number(i.price)||0)>0&&(Number(i.price)||0)<((stockBy(i.pn)||{}).cost||0));
const _quoteBoxPL=quoteBox; quoteBox=function(x){ let h=_quoteBoxPL(x); const c=x.svcId&&svcById(x.svcId); if(!h||!c) return h; let extra='';
  if(quoteOpen(c)&&c.status==='quote'&&can('svc_manage')){ seedPrices(); const ps=(DB.prices||[]).filter(p=>!p.model||!c.model||p.model===c.model);
    extra+=`<div class="qb-row"><span class="qb-k">${t('pl_add')}</span><select class="select sm" style="width:auto;max-width:360px" id="prpick-${c.id}">${ps.map(p=>`<option value="${p.id}">${esc(p.name)}${p.model?' · '+esc(p.model):''} — ${money(p.price)}</option>`).join('')}</select><button class="btn sm" data-a="prAdd" data-id="${c.id}">${ic('plus',13)} ${t('pl_add_btn')}</button></div>`; }
  if(quoteOpen(c)&&(belowCost(c)||lowParts(c).length)) extra+=`<div class="tk-al bad">${ic('alert',15)}<span>${belowCost(c)?t('pl_below',{r:money(revOf(c)),c:money(quoteCost(c))}):''} ${lowParts(c).length?t('pl_low_parts',{p:lowParts(c).map(i=>i.pn).join(', ')}):''}</span></div>`;
  return extra?h.replace('<div class="doc-btns">',extra+'<div class="doc-btns">'):h; };
A.prAdd = el => { const c=svcById(el.dataset.id); const sel=document.getElementById('prpick-'+c.id); const p=sel&&(DB.prices||[]).find(z=>z.id===sel.value); if(!p) return; if(S.ui['ed_'+c.id]) edCommit(c.id);
  c.items.push({type:p.cost?'other':'labor',desc:p.name,qty:1,price:p.price,priceId:p.id}); delete S.ui['ed_'+c.id]; audit('price_use',c.no,p.name+' · '+money(p.price)); save(); rerender(); };
/* báo giá dưới giá vốn bắt buộc quản lý duyệt */
const _svcGoBC=A.svcGo; A.svcGo=el=>{ const c=svcById(el.dataset.id); if(c&&el.dataset.s==='sent'&&c.status==='quote'&&belowCost(c)&&!quoteApproved(c)&&!(isBossRole(me())||can('ticket_approve'))){ c.quoteReq={by:S.userId,at:Date.now()}; notify({toRole:'manager',key:'n_q_below',vars:{no:c.no},ticketId:c.ticketId}); save(); rerender(); toast(t('toast_q_below'),'bad'); return; } return _svcGoBC(el); };
function viewPrices(){ seedPrices(); const mg=isBossRole(me())||can('svc_manage'); const ed=S.ui.prEdit||null;
  return `<div class="page-head"><div><h1>${t('nav_prices')}</h1><div class="sub">${t('pl_sub')}</div></div>${mg?`<button class="btn primary" data-a="prNew">${ic('plus',15)} ${t('pl_new')}</button>`:''}</div>
  <div class="card"><div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('pl_name')}</th><th>${t('product_model')}</th><th class="r">${t('pl_price')}</th><th class="r">${t('pl_cost')}</th><th class="r">${t('pl_margin')}</th><th></th></tr></thead><tbody>${DB.prices.map(p=>ed===p.id?`<tr><td><input class="input sm" data-pr="${p.id}" data-k="name" value="${esc(p.name)}"></td><td><input class="input sm" style="width:120px" data-pr="${p.id}" data-k="model" value="${esc(p.model)}" placeholder="${t('pl_all_models')}"></td><td class="r"><input class="input sm num" style="width:130px" type="number" data-pr="${p.id}" data-k="price" value="${p.price}"></td><td class="r"><input class="input sm num" style="width:120px" type="number" data-pr="${p.id}" data-k="cost" value="${p.cost||0}"></td><td></td><td class="nowrap"><button class="btn sm primary" data-a="prDone">${t('save')}</button> <button class="btn sm danger" data-a="prDel" data-id="${p.id}">${ic('trash',13)}</button></td></tr>`
    :`<tr><td data-l="${t('pl_name')}"><b>${esc(p.name)}</b></td><td data-l="${t('product_model')}">${esc(p.model||t('pl_all_models'))}</td><td data-l="${t('pl_price')}" class="r num">${money(p.price)}</td><td data-l="${t('pl_cost')}" class="r num">${p.cost?money(p.cost):'—'}</td><td data-l="${t('pl_margin')}" class="r num">${p.price?Math.round((p.price-(p.cost||0))/p.price*100)+'%':'—'}</td><td class="nowrap">${mg?`<button class="btn sm" data-a="prEditA" data-id="${p.id}">${ic('edit',13)}</button>`:''}</td></tr>`).join('')}</tbody></table></div></div><p class="hint" style="margin-top:8px">${t('pl_note')}</p>`; }
document.addEventListener('change',ev=>{ const el=ev.target; const id=el&&el.dataset&&el.dataset.pr; if(!id) return; const p=(DB.prices||[]).find(z=>z.id===id); if(!p) return; const k=el.dataset.k; const old=p[k]; p[k]=['price','cost'].includes(k)?Math.round(Number(el.value)||0):el.value; if(old!==p[k]) audit('price_edit',p.name,`${t('pl_'+(k==='name'?'name':k==='model'?'m':k))}: ${old} → ${p[k]}`); save(); });
A.prNew = () => { seedPrices(); const p={id:'pr'+Date.now().toString(36),name:t('pl_new_name'),model:'',price:0,cost:0}; DB.prices.unshift(p); S.ui.prEdit=p.id; save(); rerender(); };
A.prEditA = el => { S.ui.prEdit=el.dataset.id; rerender(); }; A.prDone = () => { S.ui.prEdit=null; save(); rerender(); };
A.prDel = el => { const p=DB.prices.find(z=>z.id===el.dataset.id); DB.prices=DB.prices.filter(z=>z.id!==el.dataset.id); audit('price_del',p?p.name:'',''); S.ui.prEdit=null; save(); rerender(); };

/* ===================================================================
   NHẮC KHÁCH SẮP HẾT BẢO HÀNH SỬA CHỮA → chào hợp đồng bảo trì
   =================================================================== */
function wExpiring(){ const now=Date.now(); return (DB.svc||[]).filter(c=>c.ticketId&&c.kind!=='om'&&!c.wContacted).map(c=>{ const x=ticketById(c.ticketId); const del=x&&histAt(x,['delivered']); if(!del) return null; const end=addMonthsTs(del,c.repairWarrantyMonths||6); return end>now&&end-now<30*DAYMS?{c,x,end}:null; }).filter(Boolean).filter(z=>!(DB.oms||[]).some(o=>(siteById(o.siteId)||{}).customerId===z.c.customerId&&(!o.end||o.end>now))); }
A.wContact = el => { const c=svcById(el.dataset.id); c.wContacted=Date.now(); audit('w_contact',c.no,''); save(); rerender(); toast(t('toast_saved'),'ok'); };
const _todayTasksW=todayTasks; todayTasks=function(u){ const L0=_todayTasksW(u); if(['manager','dev','accountant'].includes(u.role)){ const w=wExpiring(); if(w.length) L0.push({key:'td_w_exp',n:w.length,items:w.map(z=>({wc:z.c.id,no:z.x.no,company:custName(z.c.customerId)+' · '+t('w_until',{d:fmtD(z.end)})}))}); const od=arDocs(u).filter(d=>d.status!=='declined'&&Date.now()-arDueAt(d)>30*DAYMS); if(od.length) L0.push({key:'td_ar_30',n:od.length,items:od.map(d=>({doc:d.id,no:d.no,company:custName(d.customerId)+' · '+money(docDue(d))}))}); }
  if(['manager','dev'].includes(u.role)){ const cc=(DB.counts||[]).filter(c=>c.status==='sent'); if(cc.length) L0.push({key:'td_cnt',n:cc.length,items:cc.map(c=>({cnt:c.id,no:c.no,company:''}))}); } return L0; };
const _taskItemW=taskItem; taskItem=function(x){ if(x.wc) return `<div class="mini-item"><span class="t"><div><span class="mono">${esc(x.no)}</span> ${esc(x.company)}</div></span><button class="btn sm" data-a="wContact" data-id="${x.wc}">${t('w_contacted')}</button></div>`;
  if(x.doc) return `<button class="mini-item" data-a="nav" data-k="sc:${x.doc}"><span class="t"><div><span class="mono">${esc(x.no)}</span> ${esc(x.company)}</div></span></button>`; if(x.cnt) return `<button class="mini-item" data-a="cntGo" data-id="${x.cnt}"><span class="t"><div class="mono">${esc(x.no)}</div></span></button>`; return _taskItemW(x); };
A.cntGo = el => { S.ui.stk={tab:'count',q:'',cat:'',low:false,page:1,size:10,cid:el.dataset.id}; openTab('stock'); };
URGENT_KEYS.push('td_ar_30');

/* ===================================================================
   SAO LƯU / KHÔI PHỤC DỮ LIỆU
   =================================================================== */
async function saveFile(name,text,mime){ try{ if(window.claude&&window.claude.use){ const dl=await window.claude.use('downloads'); if(dl){ await dl.save({filename:name,data:text}); return true; } } }catch(e){ if(e&&e.code==='declined') return false; }
  try{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:mime||'application/json'})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); return true; }catch(e){ return false; } }
function viewBackup(){ const last=DB.lastBackup; const sz=JSON.stringify(DB).length; const days=last?Math.floor((Date.now()-last.at)/DAYMS):null;
  return `<div class="page-head"><div><h1>${t('nav_backup')}</h1><div class="sub">${t('bk_sub')}</div></div></div>
  <div class="report-grid"><div class="card"><div class="card-h"><h3>${ic('download',16)} ${t('bk_export')}</h3></div><div class="card-b"><p>${t('bk_export_hint')}</p>
    <div class="kv-grid">${kv(t('bk_last'),last?`${fmtDT(last.at)} · ${esc(uname(last.by))}`:`<span style="color:var(--bad)">${t('bk_never')}</span>`)}${kv(t('bk_size'),`${(sz/1024).toFixed(0)} KB`)}${kv(t('bk_counts'),t('bk_counts_v',{a:(DB.tickets||[]).length,b:(DB.svc||[]).length,c:(DB.expenses||[]).length,d:(DB.moves||[]).length}))}</div>
    ${days!=null&&days>7||!last?`<div class="tk-al warn" style="margin-top:12px">${ic('alert',15)}<span>${t('bk_remind')}</span></div>`:''}
    <button class="btn primary lg" style="margin-top:14px" data-a="bkExport">${ic('download',16)} ${t('bk_export_btn')}</button></div></div>
  <div class="card"><div class="card-h"><h3>${ic('upload',16)} ${t('bk_import')}</h3></div><div class="card-b"><p>${t('bk_import_hint')}</p>
    <label class="btn" style="cursor:pointer">${ic('upload',15)} ${t('bk_choose')}<input type="file" accept=".json,application/json" data-file="bkFile" hidden></label>
    ${S.ui.bkPending?`<div class="tk-al bad" style="margin-top:12px">${ic('alert',15)}<span>${t('bk_confirm_q',{n:S.ui.bkPending.name,d:S.ui.bkPending.at?fmtDT(S.ui.bkPending.at):'?'})}</span></div><div class="row" style="gap:8px;margin-top:10px"><button class="btn danger" data-a="bkRestore">${t('bk_restore_btn')}</button><button class="btn" data-a="bkCancel">${t('cancel')}</button></div>`:''}</div></div></div>`; }
A.bkExport = async () => { const at=Date.now(); const data=JSON.stringify({app:'SGE-AfterSales',version:1,at,by:S.userId,db:DB}); const ok=await saveFile(`SGE-saoluu-${toISODate(at)}.json`,data,'application/json'); if(ok){ DB.lastBackup={at,by:S.userId}; audit('backup','',`${(data.length/1024).toFixed(0)} KB`); save(); rerender(); toast(t('toast_bk'),'ok'); } };
A.bkFile = input => { const f=input.files&&input.files[0]; input.value=''; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const o=JSON.parse(r.result); if(!o||!o.db||!o.db.tickets) throw 0; BK_DATA=o; S.ui.bkPending={name:f.name,at:o.at}; rerender(); }catch(e){ toast(t('bk_bad'),'bad'); } }; r.readAsText(f); };
let BK_DATA=null;
A.bkCancel = () => { BK_DATA=null; S.ui.bkPending=null; rerender(); };
A.bkRestore = () => { if(!BK_DATA) return; const by=S.userId; Object.keys(DB).forEach(k=>delete DB[k]); Object.assign(DB,BK_DATA.db); BK_DATA=null; S.ui.bkPending=null; audit('restore','',''); DB.audit[0].by=by; save(); rerender(); toast(t('toast_restore'),'ok'); };

/* ---------- đăng ký các trang mới ---------- */
const _erpViewX=erpView; erpView=function(k){ if(k==='audit') return viewAudit(); if(k==='prices') return viewPrices(); if(k==='backup') return viewBackup(); return _erpViewX(k); };
const _tabAllowedX=tabAllowed; tabAllowed=function(k,u=me()){ if(k==='audit'||k==='backup') return !!u&&isBossRole(u); if(k==='prices') return !!u&&!isExternal(u); return _tabAllowedX(k,u); };
const _tabTitleX=tabTitle; tabTitle=function(k){ if(['audit','prices','backup'].includes(k)) return t('nav_'+k); return _tabTitleX(k); };
const _navX=navItems; navItems=function(u=me()){ const r=_navX(u); if(!u||isExternal(u)) return r; const add=[]; if(isBossRole(u)||can('svc_manage')) add.push({k:'prices',l:t('nav_prices')}); if(isBossRole(u)) add.push({k:'audit',l:t('nav_audit')},{k:'backup',l:t('nav_backup')});
  const more=r.find(n=>n.more); add.forEach(it=>{ if(r.some(n=>n.k===it.k)||(more&&more.more.some(n=>n.k===it.k))) return; if(more) more.more.push(it); else r.push(it); }); return r; };
const _renderX=render; render=function(){ try{ if(DB){ cleanupLegacy(); if(DB.sites) omGenBills(); } }catch(e){} return _renderX.apply(this,arguments); };

Object.assign(DICT.vi,{ back:'Quay lại', fin_pnl:'Lãi lỗ', fin_vat:'Thuế VAT', fin_aging:'Tuổi nợ',
  pl_title:'Báo cáo kết quả kinh doanh', pl_basis:'Theo ngày xuất hóa đơn, chưa gồm VAT', pl_rev:'Doanh thu', pl_rev_rep:'Sửa chữa, bảo hành', pl_rev_om:'Hợp đồng bảo trì', pl_rev_so:'Bán hàng', pl_cogs:'Giá vốn', pl_cogs_rep:'Linh kiện xuất cho sửa chữa', pl_cogs_out:'Thuê ngoài sửa chữa', pl_cogs_so:'Giá vốn hàng bán',
  pl_gross:'Lãi gộp', pl_opex:'Chi phí hoạt động', pl_net:'Lãi ròng', pl_trend:'Diễn biến theo kỳ', pl_unbilled:'Có {n} phiếu đã giao máy nhưng chưa xuất hóa đơn ({a}), chưa được tính vào doanh thu:',
  vat_out:'VAT đầu ra', vat_in:'VAT đầu vào', vat_pay:'VAT phải nộp (tạm tính)', vat_noinv:'Chi không có hóa đơn VAT', vat_out_list:'Hóa đơn đầu ra', vat_in_list:'Chứng từ đầu vào', vat_base:'Tiền chưa thuế', vat_party:'Nhà cung cấp / nội dung',
  vat_cash20:'{n} khoản thanh toán từ 20 triệu bằng tiền mặt — không được khấu trừ VAT, nên chuyển khoản:', vat_amt:'Tiền thuế VAT trên hóa đơn', vat_amt_hint:'Để tính VAT đầu vào được khấu trừ.',
  age_ar:'Phải thu khách hàng theo tuổi nợ', age_ap:'Phải trả nhà cung cấp theo tuổi nợ', age_cur:'Chưa đến hạn', age_b30:'Quá 1–30 ngày', age_b60:'Quá 31–60 ngày', age_b90:'Quá 61–90 ngày', age_b90p:'Quá trên 90 ngày', age_days:'Số ngày quá hạn', age_group:'Nhóm',
  dun_btn:'Nhắc nợ', dun_last:'đã nhắc {n} lần, gần nhất {d}', toast_dun:'Đã gửi nhắc nợ cho khách', n_dun:'{no}: quý khách còn {a} chưa thanh toán, vui lòng thanh toán sớm',
  om_bill:'Kỳ thu tiền', om_bill_every:'Thu {n} tháng/lần', om_bill_hint:'Mỗi kỳ hệ thống tự tạo chứng từ thu tiền (cộng VAT 8%) trước 7 ngày, vào công nợ và báo cáo.', om_bill_line:'Phí bảo trì định kỳ HĐ {no} ({a} – {b})', om_period:'Kỳ', om_not_yet:'chưa đến kỳ', om_issue:'Xuất HĐ', om_collect:'Thu tiền', om_no_value:'Chưa nhập giá trị hợp đồng.', om_ex_vat:'(chưa VAT)', toast_inv_ok:'Đã xuất hóa đơn',
  st_count:'Kiểm kê', cnt_hint:'Đếm thực tế từng mặt hàng, hệ thống so với sổ và điều chỉnh khi quản lý duyệt.', cnt_new:'Tạo phiếu kiểm kê', cnt_by:'Người kiểm', cnt_lines:'Số mặt hàng', cnt_diff_n:'Số mặt hàng lệch', cnt_diff_v:'Giá trị chênh lệch', cnt_empty:'Chưa có phiếu kiểm kê.',
  cnts_draft:'Đang đếm', cnts_sent:'Chờ duyệt', cnts_done:'Đã điều chỉnh', cnt_sys:'Tồn sổ', cnt_real:'Đếm thực tế', cnt_diff:'Lệch', cnt_reason:'Lý do lệch', cnt_reason_ph:'VD: xuất sửa chưa ghi, hỏng, mất…', cnt_progress:'Đã đếm {a}/{b} mặt hàng', cnt_fill:'Điền bằng tồn sổ cho mục chưa đếm',
  cnt_send:'Gửi quản lý duyệt', cnt_approve:'Duyệt & điều chỉnh tồn', cnt_done_by:'Duyệt bởi {u} lúc {d}', cnt_left:'Còn {n} mặt hàng chưa đếm', cnt_need_reason:'{n} mặt hàng lệch chưa ghi lý do', toast_cnt_sent:'Đã gửi quản lý duyệt', toast_cnt_done:'Đã điều chỉnh {n} mặt hàng', cnt_mv:'Điều chỉnh kiểm kê {no}', cnt_adj_n:'{n} mặt hàng điều chỉnh', n_cnt:'{no}: phiếu kiểm kê chờ duyệt',
  nav_prices:'Bảng giá dịch vụ', pl_sub:'Giá chuẩn để báo giá nhanh và đồng đều', pl_new:'Thêm dòng giá', pl_new_name:'Dịch vụ mới', pl_name:'Dịch vụ', pl_price:'Giá báo khách', pl_cost:'Chi phí (nếu có)', pl_margin:'Lãi', pl_all_models:'Mọi model', pl_m:'model', pl_price_k:'giá',
  pl_note:'Trong báo giá đang soạn, chọn "Thêm từ bảng giá" để chèn dòng. Báo giá có tổng thấp hơn giá vốn sẽ bắt buộc quản lý duyệt.', pl_add:'Bảng giá', pl_add_btn:'Thêm vào báo giá', pl_below:'Báo giá {r} (chưa VAT) đang THẤP HƠN giá vốn {c}. Cần quản lý duyệt.', pl_low_parts:'Linh kiện báo dưới giá vốn: {p}.', n_q_below:'{no}: báo giá thấp hơn giá vốn, cần duyệt', toast_q_below:'Báo giá dưới giá vốn — đã gửi quản lý duyệt',
  td_w_exp:'Khách sắp hết bảo hành sửa chữa — chào bảo trì', w_until:'hết BH {d}', w_contacted:'Đã liên hệ', td_ar_30:'Công nợ quá hạn trên 30 ngày', td_cnt:'Phiếu kiểm kê chờ duyệt',
  nav_backup:'Sao lưu dữ liệu', bk_sub:'Tải toàn bộ dữ liệu về máy và khôi phục khi cần', bk_export:'Sao lưu', bk_export_hint:'Tải 1 file chứa toàn bộ phiếu, hợp đồng, kho, tài chính. Nên sao lưu ít nhất mỗi tuần và cất ở nơi an toàn (Google Drive, USB).', bk_last:'Lần sao lưu gần nhất', bk_never:'Chưa sao lưu lần nào', bk_size:'Dung lượng', bk_counts:'Nội dung', bk_counts_v:'{a} phiếu sửa · {b} chứng từ dịch vụ · {c} phiếu chi · {d} phiếu kho',
  bk_remind:'Đã hơn 7 ngày chưa sao lưu. Nên sao lưu ngay.', bk_export_btn:'Tải file sao lưu', bk_import:'Khôi phục', bk_import_hint:'Chọn file sao lưu (.json). Toàn bộ dữ liệu hiện tại sẽ bị thay bằng dữ liệu trong file.', bk_choose:'Chọn file sao lưu', bk_confirm_q:'Khôi phục từ "{n}" (sao lưu lúc {d})? Dữ liệu hiện tại sẽ bị thay thế hoàn toàn.', bk_restore_btn:'Khôi phục ngay', bk_bad:'File không đúng định dạng sao lưu', toast_bk:'Đã tải file sao lưu', toast_restore:'Đã khôi phục dữ liệu',
  nav_audit:'Nhật ký chỉnh sửa', au_sub:'Ai đã thay đổi tiền, giá, kho, chứng từ — lúc nào', au_all_people:'Mọi người', au_all_acts:'Mọi thao tác', au_time:'Thời gian', au_who:'Người làm', au_act:'Thao tác', au_ref:'Chứng từ', au_detail:'Chi tiết', au_empty:'Chưa có thao tác nào trong kỳ.', au_more:'Còn {n} dòng cũ hơn, thu hẹp kỳ để xem.',
  auf_pay:'Thu / trả tiền', auf_refund:'Hoàn tiền', auf_exp:'Phiếu chi', auf_doc_edit:'Sửa giá chứng từ', auf_quote:'Báo giá', auf_deposit:'Đặt cọc', auf_stock:'Nhập / xuất kho', auf_count:'Kiểm kê', auf_tk:'Phiếu sửa chữa', auf_backup:'Sao lưu', auf_price:'Bảng giá', auf_om:'HĐ bảo trì',
  au_pay:'Ghi nhận thanh toán', au_refund:'Hoàn tiền', au_exp_new:'Tạo phiếu chi', au_exp_approved:'Duyệt phiếu chi', au_exp_rejected:'Từ chối phiếu chi', au_exp_paid:'Chi tiền', au_doc_edit:'Sửa giá / chiết khấu', au_quote_ok:'Duyệt báo giá', au_quote_revise:'Sửa lại báo giá', au_deposit_set:'Đặt % cọc', au_storage_fee:'Tính phí lưu kho',
  au_stock_in:'Nhập kho', au_stock_out:'Xuất kho', au_count_new:'Tạo phiếu kiểm kê', au_count_send:'Gửi duyệt kiểm kê', au_count_done:'Duyệt kiểm kê, điều chỉnh tồn', au_tk_unrepairable:'Không sửa được', au_tk_customer_agreed:'Khách đồng ý sửa', au_tk_declined:'Khách từ chối', au_tk_delivered:'Giao máy', au_tk_invoiced:'Xuất hóa đơn', au_tk_reassigned:'Chuyển KTV',
  au_backup:'Sao lưu dữ liệu', au_restore:'Khôi phục dữ liệu', au_price_use:'Dùng bảng giá', au_price_edit:'Sửa bảng giá', au_price_del:'Xóa dòng giá', au_om_new:'Tạo HĐ bảo trì', au_om_edit:'Sửa HĐ bảo trì', au_om_invoice:'Xuất HĐ bảo trì', au_dun:'Nhắc nợ', au_w_contact:'Liên hệ chào bảo trì' });
Object.assign(DICT.en,{ back:'Back', fin_pnl:'P&L', fin_vat:'VAT', fin_aging:'Aging',
  pl_title:'Income statement', pl_basis:'By invoice date, excluding VAT', pl_rev:'Revenue', pl_rev_rep:'Repairs & warranty', pl_rev_om:'Maintenance contracts', pl_rev_so:'Sales', pl_cogs:'Cost of sales', pl_cogs_rep:'Parts issued for repairs', pl_cogs_out:'Outsourced repairs', pl_cogs_so:'Cost of goods sold',
  pl_gross:'Gross profit', pl_opex:'Operating expenses', pl_net:'Net profit', pl_trend:'Trend', pl_unbilled:'{n} returned jobs are not invoiced yet ({a}) and not counted as revenue:',
  vat_out:'Output VAT', vat_in:'Input VAT', vat_pay:'VAT payable (est.)', vat_noinv:'Spend without VAT invoice', vat_out_list:'Sales invoices', vat_in_list:'Purchase documents', vat_base:'Net amount', vat_party:'Supplier / description',
  vat_cash20:'{n} payments of 20M+ in cash — input VAT not deductible, pay by transfer:', vat_amt:'VAT on the invoice', vat_amt_hint:'Used for deductible input VAT.',
  age_ar:'Receivables aging', age_ap:'Payables aging', age_cur:'Not due', age_b30:'1–30 days', age_b60:'31–60 days', age_b90:'61–90 days', age_b90p:'Over 90 days', age_days:'Days overdue', age_group:'Bucket',
  dun_btn:'Send reminder', dun_last:'{n} reminders, last {d}', toast_dun:'Reminder sent', n_dun:'{no}: {a} is outstanding, please arrange payment',
  om_bill:'Billing cycle', om_bill_every:'Bill every {n} month(s)', om_bill_hint:'Each period a billing document (+8% VAT) is created 7 days ahead and flows into receivables and reports.', om_bill_line:'Scheduled maintenance fee {no} ({a} – {b})', om_period:'Period', om_not_yet:'not yet', om_issue:'Invoice', om_collect:'Collect', om_no_value:'No contract value entered.', om_ex_vat:'(ex VAT)', toast_inv_ok:'Invoice issued',
  st_count:'Stocktake', cnt_hint:'Count each item; differences are adjusted once a manager approves.', cnt_new:'New stocktake', cnt_by:'Counted by', cnt_lines:'Items', cnt_diff_n:'Items with variance', cnt_diff_v:'Variance value', cnt_empty:'No stocktakes yet.',
  cnts_draft:'Counting', cnts_sent:'Awaiting approval', cnts_done:'Adjusted', cnt_sys:'Book qty', cnt_real:'Counted', cnt_diff:'Variance', cnt_reason:'Reason', cnt_reason_ph:'e.g. unrecorded issue, damaged, lost…', cnt_progress:'Counted {a}/{b} items', cnt_fill:'Fill uncounted with book qty',
  cnt_send:'Send for approval', cnt_approve:'Approve & adjust', cnt_done_by:'Approved by {u} at {d}', cnt_left:'{n} items not counted yet', cnt_need_reason:'{n} variances need a reason', toast_cnt_sent:'Sent for approval', toast_cnt_done:'{n} items adjusted', cnt_mv:'Stocktake adjustment {no}', cnt_adj_n:'{n} items adjusted', n_cnt:'{no}: stocktake awaiting approval',
  nav_prices:'Service price list', pl_sub:'Standard prices for quick, consistent quotes', pl_new:'Add price', pl_new_name:'New service', pl_name:'Service', pl_price:'Customer price', pl_cost:'Cost (if any)', pl_margin:'Margin', pl_all_models:'All models', pl_m:'model', pl_price_k:'price',
  pl_note:'In a draft quote, use "Price list" to insert a line. Quotes below cost require manager approval.', pl_add:'Price list', pl_add_btn:'Add to quote', pl_below:'Quote {r} (ex VAT) is BELOW cost {c}. Manager approval required.', pl_low_parts:'Parts priced below cost: {p}.', n_q_below:'{no}: quote below cost needs approval', toast_q_below:'Quote below cost — sent for approval',
  td_w_exp:'Repair warranty ending — offer maintenance', w_until:'ends {d}', w_contacted:'Contacted', td_ar_30:'Receivables 30+ days overdue', td_cnt:'Stocktakes awaiting approval',
  nav_backup:'Backup', bk_sub:'Download all data and restore when needed', bk_export:'Backup', bk_export_hint:'Download one file with all jobs, contracts, stock and finance. Back up at least weekly and keep it safe.', bk_last:'Last backup', bk_never:'Never backed up', bk_size:'Size', bk_counts:'Contents', bk_counts_v:'{a} jobs · {b} service docs · {c} expenses · {d} stock moves',
  bk_remind:'More than 7 days since the last backup.', bk_export_btn:'Download backup', bk_import:'Restore', bk_import_hint:'Choose a backup file (.json). All current data will be replaced.', bk_choose:'Choose backup file', bk_confirm_q:'Restore from "{n}" (taken {d})? Current data will be fully replaced.', bk_restore_btn:'Restore now', bk_bad:'Not a valid backup file', toast_bk:'Backup downloaded', toast_restore:'Data restored',
  nav_audit:'Audit log', au_sub:'Who changed money, prices, stock and documents — and when', au_all_people:'Everyone', au_all_acts:'All actions', au_time:'Time', au_who:'By', au_act:'Action', au_ref:'Document', au_detail:'Detail', au_empty:'No actions in this period.', au_more:'{n} older rows; narrow the period.',
  auf_pay:'Payments', auf_refund:'Refunds', auf_exp:'Expenses', auf_doc_edit:'Price edits', auf_quote:'Quotes', auf_deposit:'Deposits', auf_stock:'Stock in/out', auf_count:'Stocktake', auf_tk:'Repair jobs', auf_backup:'Backup', auf_price:'Price list', auf_om:'O&M contracts',
  au_pay:'Payment recorded', au_refund:'Refund', au_exp_new:'Expense created', au_exp_approved:'Expense approved', au_exp_rejected:'Expense rejected', au_exp_paid:'Expense paid', au_doc_edit:'Price / discount edited', au_quote_ok:'Quote approved', au_quote_revise:'Quote revised', au_deposit_set:'Deposit % set', au_storage_fee:'Storage fee',
  au_stock_in:'Stock in', au_stock_out:'Stock out', au_count_new:'Stocktake created', au_count_send:'Stocktake submitted', au_count_done:'Stocktake approved', au_tk_unrepairable:'Unrepairable', au_tk_customer_agreed:'Customer agreed', au_tk_declined:'Customer declined', au_tk_delivered:'Handed over', au_tk_invoiced:'Invoiced', au_tk_reassigned:'Reassigned',
  au_backup:'Backup', au_restore:'Restore', au_price_use:'Price list used', au_price_edit:'Price edited', au_price_del:'Price deleted', au_om_new:'O&M contract created', au_om_edit:'O&M contract edited', au_om_invoice:'O&M invoice', au_dun:'Payment reminder', au_w_contact:'Maintenance offer contact' });
Object.assign(DICT.vi,{ ec_rma:'Khác (dữ liệu cũ)' }); Object.assign(DICT.en,{ ec_rma:'Other (legacy)' });

/* ===================================================================
   MÁY BÁO LỖI LẠI SAU KHI ĐÃ GIAO (bảo hành sau sửa chữa)
   Phiếu cũ → "Báo lỗi lại" → phiếu mới liên kết → KTV xác định có thuộc bảo hành không
   → thuộc BH: miễn phí, bỏ qua báo giá, tự chuyển sửa · không thuộc BH: báo giá tính phí như thường
   =================================================================== */
const WX_REASONS=['lightning','overvolt','tamper','install','transport','other_part','consumable','expired'];
const _reworkOfX=reworkOf; reworkOf=function(x){ if(x&&x.reworkOf){ const o=ticketById(x.reworkOf); if(o){ const done=tkDoneAt(o)||o.updatedAt; const c=o.svcId&&svcById(o.svcId); return {t:o,done,end:addMonthsTs(done,(c&&c.repairWarrantyMonths)||6),explicit:1}; } } return _reworkOfX(x); };
function reworkKids(o){ return (DB.tickets||[]).filter(x=>x.reworkOf===o.id); }
/* nút "Báo lỗi lại" trên phiếu đã giao / đã đóng */
const _tkAlertsWX=tkAlerts; tkAlerts=function(x){ let h=_tkAlertsWX(x); const u=me(); if(!u||isExternal(u)) return h; const add=[];
  const kids=reworkKids(x); if(kids.length) add.push(`<div class="tk-al warn">${ic('refresh',15)}<span>${t('wx_kids',{n:kids.length})} ${kids.map(k=>`<button class="link-btn mono" data-a="goTicket" data-id="${k.id}">${k.no}</button> ${tkPill(k)}`).join(' · ')}</span></div>`);
  if(['delivered','invoiced','paid','closed'].includes(x.status)&&can('ticket_create')){ const c=x.svcId&&svcById(x.svcId); const done=tkDoneAt(x); const end=done?addMonthsTs(done,(c&&c.repairWarrantyMonths)||6):null; const inW=end&&Date.now()<end;
    add.push(`<div class="wx-bar ${inW?'in':'out'}"><div>${ic('shield',16)}<span>${inW?t('wx_in',{d:fmtD(end)}):end?t('wx_out',{d:fmtD(end)}):''}</span></div><button class="btn ${inW?'primary':''} sm" data-a="wxAsk" data-id="${x.id}">${ic('refresh',14)} ${t('wx_btn')}</button></div>`); }
  if(!add.length) return h; const blk=add.join(''); if(!h) return `<div class="tk-alerts">${blk}</div>`; return h.replace(/<\/div>$/,blk+'</div>'); };
A.wxAsk = el => { const o=ticketById(el.dataset.id); const f=Object.assign(blankNT(me()),{ products:(o.products||[]).map(p=>({sn:p.sn,model:p.model,qty:p.qty||1})), company:(o.customer&&o.customer.company)||o.company||custName(o.customerId)||'', contact:(o.customer&&o.customer.contact)||'', email:(o.customer&&o.customer.email)||'', phone:(o.customer&&o.customer.phone)||'', province:o.province||'', address:o.address||'', project:o.project||'', description:'', reworkOf:o.id, type:'RW' });
  S.ui.nt=f; openTab('new'); };
const _viewNewWX=viewNewTicket; viewNewTicket=function(){ const h=_viewNewWX(); const f=S.ui.nt; const o=f&&f.reworkOf&&ticketById(f.reworkOf); if(!o) return h; const rw=reworkOf({reworkOf:o.id});
  const banner=`<div class="tk-al warn" style="margin-bottom:14px">${ic('refresh',15)}<span>${t('wx_banner',{no:o.no,k:esc(uname(o.assigneeId)||'—'),d:fmtD(rw.done),e:fmtD(rw.end)})} <button class="link-btn" data-a="wxCancel">${t('wx_unlink')}</button></span></div>`;
  return h.replace(/(<div class="card[^"]*"[^>]*>)/,banner+'$1'); };
A.wxCancel = () => { if(S.ui.nt) S.ui.nt.reworkOf=null; rerender(); };
const _ntSubmitWX=A.ntSubmit; A.ntSubmit=el=>{ const f=S.ui.nt; const link=f&&f.reworkOf; const desc=f&&f.description; const ids=new Set(DB.tickets.map(x=>x.id)); const r=_ntSubmitWX(el);
  DB.tickets.filter(x=>!ids.has(x.id)).forEach(x=>{ let o=link&&ticketById(link); if(!o){ const rw=_reworkOfX(x); if(rw) o=rw.t; } if(!o) return;
    x.reworkOf=o.id; x.type='RW'; if(!x.customerId) x.customerId=o.customerId; x.history.push({at:Date.now(),by:S.userId,action:'rework_open',from:null,to:null,note:o.no});
    o.history.push({at:Date.now(),by:S.userId,action:'rework_child',from:null,to:null,note:x.no}); audit('rework_open',x.no,o.no+(desc?' · '+desc:''));
    notify({toRole:'manager',key:'n_wx_new',vars:{no:x.no,o:o.no},ticketId:x.id}); if(o.assigneeId) notify({toUser:o.assigneeId,key:'n_wx_tech',vars:{no:x.no,o:o.no},ticketId:x.id}); });
  save(); return r; };
/* xác định có thuộc bảo hành không (bắt buộc trước khi gửi chẩn đoán) */
function wcBox(x){ const u=me(); if(!u||isExternal(u)||!x.reworkOf||!['diagnosing','returned','unassigned'].includes(x.status)) return ''; const o=ticketById(x.reworkOf); const rw=reworkOf(x); const inW=rw&&x.createdAt<=rw.end;
  const st=tdState(x.id); const w=st.wx||(st.wx={covered:x.wcover?String(x.wcover.covered):(inW?'':'false'),reason:(x.wcover&&x.wcover.reason)||(inW?'':'expired'),note:(x.wcover&&x.wcover.note)||''}); const edit=can('ticket_repair')&&(x.assigneeId===u.id||isBossRole(u)||can('ticket_assign'));
  const o2=o&&o.svcId&&svcById(o.svcId); const usedPrev=o?((o.parts&&o.parts.length?o.parts:(o2?o2.items.filter(i=>i.type==='part'):[])).filter(p=>p.pn)):[];
  return `<section class="card action-card wxbox"><div class="card-h"><h3 style="color:var(--accent-ink)">${ic('shield',16)} ${t('wx_title')}</h3>${x.wcover?`<span class="kst ${x.wcover.covered?'k-ok':'k-bad'}">${t(x.wcover.covered?'wx_cov':'wx_notcov')}</span>`:`<span class="kst k-warn">${t('wx_pending')}</span>`}</div><div class="card-b">
    <div class="wx-prev"><div><span>${t('wx_prev')}</span><b><button class="link-btn mono" data-a="goTicket" data-id="${o.id}">${o.no}</button></b></div><div><span>${t('wx_prev_tech')}</span><b>${esc(uname(o.assigneeId)||'—')}</b></div><div><span>${t('wx_prev_done')}</span><b>${fmtD(rw.done)}</b></div><div><span>${t('wx_prev_end')}</span><b style="color:${inW?'var(--ok)':'var(--bad)'}">${fmtD(rw.end)} · ${t(inW?'wx_still':'wx_expired')}</b></div></div>
    ${usedPrev.length?`<p class="muted" style="margin:10px 0 0">${t('wx_prev_parts')}: ${usedPrev.map(p=>`<span class="mono">${esc(p.pn)}</span> ${esc(partName(p.pn))}`).join(', ')}</p>`:''}
    ${edit&&!x.wcover?`<div class="form-grid" style="margin-top:14px"><div class="field full"><span class="lbl req">${t('wx_q')}</span><div class="kind-pick" style="grid-template-columns:1fr 1fr"><button class="kp ${w.covered==='true'?'on':''}" data-a="wxPick" data-id="${x.id}" data-v="true" ${inW?'':'disabled'}><b>${t('wx_yes')}</b><small>${t('wx_yes_h')}</small></button><button class="kp ${w.covered==='false'?'on':''}" data-a="wxPick" data-id="${x.id}" data-v="false"><b>${t('wx_no')}</b><small>${t('wx_no_h')}</small></button></div></div>
      ${w.covered==='false'?`<div class="field"><label class="req" for="wx-r">${t('wx_reason')}</label><select class="select" id="wx-r" data-bind="td_${x.id}.wx.reason"><option value="">—</option>${WX_REASONS.map(k=>`<option value="${k}" ${w.reason===k?'selected':''}>${t('wxr_'+k)}</option>`).join('')}</select></div>`:''}
      <div class="field ${w.covered==='false'?'':'full'}"><label for="wx-n">${t('wx_note')}</label><input class="input" id="wx-n" data-bind="td_${x.id}.wx.note" value="${esc(w.note)}" placeholder="${t('wx_note_ph')}"></div></div>
      <div class="row" style="margin-top:12px"><button class="btn primary" data-a="wxSave" data-id="${x.id}">${t('wx_save')}</button><span class="hint">${t('wx_save_h')}</span></div>`
    :x.wcover?`<p style="margin:12px 0 0">${x.wcover.covered?t('wx_cov_txt'):t('wx_notcov_txt',{r:t('wxr_'+x.wcover.reason)})}${x.wcover.note?' · '+esc(x.wcover.note):''} <small class="muted">— ${esc(uname(x.wcover.by))}, ${fmtDT(x.wcover.at)}</small>${edit&&['diagnosing','returned'].includes(x.status)?` <button class="link-btn" data-a="wxReset" data-id="${x.id}">${t('wx_change')}</button>`:''}</p>`:`<p class="hint" style="margin:12px 0 0">${t('wx_wait_tech')}</p>`}</div></section>`; }
A.wxPick = el => { const st=tdState(el.dataset.id); st.wx.covered=el.dataset.v; if(el.dataset.v==='true') st.wx.reason=''; rerender(); };
A.wxReset = el => { const x=ticketById(el.dataset.id); x.wcover=null; save(); rerender(); };
A.wxSave = el => { const x=ticketById(el.dataset.id); const w=tdState(x.id).wx; if(!w.covered){ toast(t('wx_need'),'bad'); return; } if(w.covered==='false'&&!w.reason){ toast(t('wx_need_reason'),'bad'); return; }
  const cov=w.covered==='true'; x.wcover={covered:cov,reason:cov?'':w.reason,note:w.note||'',by:S.userId,at:Date.now()}; x.type=cov?'RW':'PR';
  x.history.push({at:Date.now(),by:S.userId,action:cov?'wx_covered':'wx_excluded',from:null,to:null,note:cov?'':t('wxr_'+w.reason)}); audit(cov?'wx_covered':'wx_excluded',x.no,cov?'':t('wxr_'+w.reason));
  notify({toRole:'manager',key:cov?'n_wx_cov':'n_wx_ex',vars:{no:x.no,r:cov?'':t('wxr_'+w.reason)},ticketId:x.id}); if(!cov&&x.customerId) notify({toCustomer:x.customerId,key:'n_wx_ex_cust',vars:{no:x.no,r:t('wxr_'+w.reason)},ticketId:x.id});
  save(); rerender(); toast(t(cov?'toast_wx_cov':'toast_wx_ex'),'ok'); };
const _readyPayWX=readyPayBox; readyPayBox=function(x){ return wcBox(x)+_readyPayWX(x); };
/* chưa xác định bảo hành thì chưa gửi chẩn đoán */
const _wfWX=A.wf; A.wf=(el,ev)=>{ const x=ticketById(el.dataset.id); if(el.dataset.op==='submitDiag'&&x&&x.reworkOf&&!x.wcover){ toast(t('wx_need_first'),'bad'); return; } return _wfWX(el,ev); };
/* thuộc bảo hành: quản lý duyệt linh kiện xong → giá 0, bỏ qua báo giá & khách đồng ý, chuyển sửa luôn */
const _paApproveWX=A.paApprove; A.paApprove=el=>{ _paApproveWX(el); const x=ticketById(el.dataset.id); if(!(x&&x.reworkOf&&x.wcover&&x.wcover.covered&&x.status==='pending')) return; const c=x.svcId&&svcById(x.svcId);
  if(c){ c.items.forEach(i=>{ i.price=0; }); c.warranty=true; c.depositPct=0; delete S.ui['ed_'+c.id]; c.quoteOk={by:S.userId,at:Date.now(),total:0,disc:0}; c.doc=Object.assign({},c.doc||{},{tWarranty:t('wx_doc_note')}); }
  const prevU=S.userId; A.tkSign({dataset:{id:x.id}}); if(x.customerId) notify({toCustomer:x.customerId,key:'n_wx_free',vars:{no:x.no},ticketId:x.id}); save(); rerender(); };
/* chi phí bảo hành gộp vào phiếu gốc + báo cáo lãi lỗ */
function wxCost(o){ return reworkKids(o).filter(k=>k.wcover&&k.wcover.covered).reduce((s,k)=>s+jobCost(k).cost,0); }
const _costBoxWX=costBox; costBox=function(x){ let h=_costBoxWX(x); const wc=wxCost(x); if(!h||!wc) return h; const k=jobCost(x);
  return h.replace('</div></div></section>',`</div><div class="tk-al warn" style="margin-top:10px">${ic('refresh',15)}<span>${t('wx_cost_line',{a:money(wc),p:money(k.profit-wc)})}</span></div></div></section>`); };
const _pnlDataWX=pnlData; pnlData=function(r){ const p=_pnlDataWX(r); const inR=ts=>ts&&ts>=r.from&&ts<r.to;
  const wk=(DB.tickets||[]).filter(x=>x.reworkOf&&x.wcover&&x.wcover.covered&&inR(tkDoneAt(x)||(x.status==='closed'?x.updatedAt:null))); const wc=wk.reduce((s,x)=>s+jobCost(x).cost,0);
  p.wx=wc; p.cogs+=wc; p.gross-=wc; p.net-=wc; return p; };
const _viewPnlWX=viewPnl; viewPnl=function(){ const h=_viewPnlWX(); const p=pnlData(perRange(perState('pnl'))); const row=`<tr class=""><td style="padding-left:28px">${t('pl_cogs_wx')}</td><td class="r num">${money(p.wx||0)}</td></tr>`;
  return h.replace(/(<tr class=""><td style="padding-left:28px">[^<]*<\/td><td class="r num">[^<]*(?:<small[^>]*>[^<]*<\/small>)?<\/td><\/tr>)(\s*<tr class="tot hl)/,`$1${row}$2`); };
/* KPI: chỉ trừ điểm khi lỗi thuộc bảo hành (do SGE sửa) */
const _kpiOfWX=kpiOf; kpiOf=function(u,r){ const k=_kpiOfWX(u,r); k.rework=(DB.tickets||[]).filter(t2=>t2.createdAt>=r.from&&t2.createdAt<r.to&&!(t2.wcover&&t2.wcover.covered===false)&&(()=>{ const rw=reworkOf(t2); return rw&&rw.t.assigneeId===u.id; })()).length; return k; };
/* việc cần làm */
const _todayTasksWX=todayTasks; todayTasks=function(u){ const L0=_todayTasksWX(u); const tk=DB.tickets||[];
  const pend=tk.filter(x=>x.reworkOf&&!x.wcover&&isOpen(x)&&(['manager','dev'].includes(u.role)||x.assigneeId===u.id)); if(pend.length) L0.unshift({key:'td_wx',n:pend.length,items:pend});
  return L0; };
URGENT_KEYS.push('td_wx');
Object.assign(DICT.vi,{ wx_btn:'Báo lỗi lại / bảo hành sau sửa', wx_in:'Còn bảo hành sửa chữa đến {d}', wx_out:'Đã hết bảo hành sửa chữa ({d}) — nếu báo lỗi lại sẽ là sửa tính phí', wx_kids:'Máy này đã báo lỗi lại {n} lần:',
  wx_banner:'Phiếu bảo hành sau sửa của <b class="mono">{no}</b> (người sửa: {k}, giao ngày {d}, bảo hành đến {e}). Thông tin khách và serial đã điền sẵn — chỉ cần ghi tình trạng lỗi và hình tiếp nhận.', wx_unlink:'Không liên kết',
  wx_title:'Xác định bảo hành sau sửa', wx_pending:'Chưa xác định', wx_cov:'Thuộc bảo hành', wx_notcov:'Không thuộc bảo hành', wx_prev:'Phiếu sửa trước', wx_prev_tech:'KTV đã sửa', wx_prev_done:'Ngày giao', wx_prev_end:'Hạn bảo hành', wx_still:'còn hạn', wx_expired:'đã hết hạn', wx_prev_parts:'Linh kiện đã thay lần trước',
  wx_q:'Lỗi lần này có thuộc bảo hành của SGE không?', wx_yes:'Có — lỗi do lần sửa trước', wx_yes_h:'Miễn phí: bỏ qua báo giá, quản lý duyệt linh kiện là sửa luôn', wx_no:'Không — ngoài phạm vi bảo hành', wx_no_h:'Báo giá tính phí như phiếu sửa thường',
  wx_reason:'Lý do không bảo hành', wx_note:'Ghi chú kết luận', wx_note_ph:'VD: IGBT đã thay lần trước bị chập lại', wx_save:'Lưu kết luận', wx_save_h:'Sau đó ghi chẩn đoán, linh kiện và gửi duyệt như bình thường.', wx_change:'Đổi kết luận', wx_wait_tech:'Chờ kỹ thuật phụ trách kết luận.',
  wx_need:'Chọn có hoặc không thuộc bảo hành', wx_need_reason:'Chọn lý do không bảo hành', wx_need_first:'Phải xác định có thuộc bảo hành không trước khi gửi chẩn đoán',
  wx_cov_txt:'Kết luận: THUỘC bảo hành — sửa miễn phí, chi phí tính vào phiếu sửa trước.', wx_notcov_txt:'Kết luận: KHÔNG thuộc bảo hành ({r}) — báo giá tính phí.', wx_doc_note:'Bảo hành miễn phí theo hợp đồng sửa chữa trước',
  wxr_lightning:'Sét đánh, thiên tai', wxr_overvolt:'Quá áp phía DC/AC, chạm đất trung thế', wxr_tamper:'Khách tự ý sửa, can thiệp', wxr_install:'Lắp đặt, vận hành sai hướng dẫn', wxr_transport:'Vận chuyển, lưu kho không đúng', wxr_other_part:'Lỗi bộ phận khác, không liên quan lần sửa trước', wxr_consumable:'Cầu chì, SPD, bộ lọc, thẩm mỹ (không bảo hành)', wxr_expired:'Hết thời hạn bảo hành',
  toast_wx_cov:'Đã kết luận thuộc bảo hành', toast_wx_ex:'Đã kết luận không thuộc bảo hành, đã báo khách', wx_cost_line:'Chi phí bảo hành phát sinh sau sửa: {a}. Lãi thực tế của phiếu sau bảo hành: {p}.', pl_cogs_wx:'Chi phí bảo hành sau sửa',
  n_wx_new:'{no}: máy báo lỗi lại sau sửa (phiếu cũ {o})', n_wx_tech:'{no}: máy bạn sửa ở phiếu {o} báo lỗi lại', n_wx_cov:'{no}: kết luận thuộc bảo hành, chờ duyệt linh kiện', n_wx_ex:'{no}: kết luận không thuộc bảo hành ({r})', n_wx_ex_cust:'{no}: lỗi lần này không thuộc bảo hành ({r}), SGE sẽ gửi báo giá', n_wx_free:'{no}: lỗi thuộc bảo hành, SGE sửa miễn phí cho quý khách',
  h_rework_open:'mở phiếu bảo hành sau sửa', h_rework_child:'máy báo lỗi lại, mở phiếu', h_wx_covered:'kết luận thuộc bảo hành', h_wx_excluded:'kết luận không thuộc bảo hành', td_wx:'Máy báo lỗi lại cần xác định bảo hành', au_rework_open:'Mở phiếu bảo hành sau sửa', au_wx_covered:'Kết luận thuộc bảo hành', au_wx_excluded:'Kết luận không thuộc bảo hành' });
Object.assign(DICT.en,{ wx_btn:'Report fault again / warranty return', wx_in:'Repair warranty valid until {d}', wx_out:'Repair warranty ended ({d}) — a new fault will be paid', wx_kids:'This unit came back {n} time(s):',
  wx_banner:'Warranty return for <b class="mono">{no}</b> (tech {k}, handed over {d}, warranty until {e}). Customer and serial are prefilled — just describe the fault and add intake photos.', wx_unlink:'Unlink',
  wx_title:'Warranty decision', wx_pending:'Not decided', wx_cov:'Covered', wx_notcov:'Not covered', wx_prev:'Previous job', wx_prev_tech:'Previous tech', wx_prev_done:'Handed over', wx_prev_end:'Warranty until', wx_still:'valid', wx_expired:'expired', wx_prev_parts:'Parts replaced last time',
  wx_q:'Is this fault covered by SGE’s repair warranty?', wx_yes:'Yes — caused by the previous repair', wx_yes_h:'Free: skips the quote; repair starts once parts are approved', wx_no:'No — outside warranty', wx_no_h:'Quoted and charged like a normal job',
  wx_reason:'Exclusion reason', wx_note:'Notes', wx_note_ph:'e.g. the IGBT replaced last time shorted again', wx_save:'Save decision', wx_save_h:'Then diagnose, add parts and submit as usual.', wx_change:'Change', wx_wait_tech:'Waiting for the assigned technician.',
  wx_need:'Choose covered or not', wx_need_reason:'Choose an exclusion reason', wx_need_first:'Decide warranty coverage before submitting the diagnosis',
  wx_cov_txt:'Decision: COVERED — free repair, cost charged to the previous job.', wx_notcov_txt:'Decision: NOT covered ({r}) — will be quoted.', wx_doc_note:'Free warranty repair under the previous repair contract',
  wxr_lightning:'Lightning, natural disaster', wxr_overvolt:'DC/AC overvoltage, MV ground fault', wxr_tamper:'Customer tampering', wxr_install:'Wrong installation / operation', wxr_transport:'Improper transport / storage', wxr_other_part:'Unrelated component failure', wxr_consumable:'Fuse, SPD, filter, cosmetic (excluded)', wxr_expired:'Warranty expired',
  toast_wx_cov:'Marked as covered', toast_wx_ex:'Marked as not covered; customer notified', wx_cost_line:'Warranty cost after repair: {a}. Real job profit after warranty: {p}.', pl_cogs_wx:'Post-repair warranty cost',
  n_wx_new:'{no}: unit returned after repair (previous {o})', n_wx_tech:'{no}: a unit you repaired in {o} came back', n_wx_cov:'{no}: covered, awaiting parts approval', n_wx_ex:'{no}: not covered ({r})', n_wx_ex_cust:'{no}: this fault is not covered ({r}); SGE will send a quote', n_wx_free:'{no}: covered by warranty, SGE repairs free of charge',
  h_rework_open:'opened a warranty return', h_rework_child:'unit returned, new job', h_wx_covered:'marked as covered', h_wx_excluded:'marked as not covered', td_wx:'Returned units awaiting warranty decision', au_rework_open:'Warranty return opened', au_wx_covered:'Covered by warranty', au_wx_excluded:'Not covered' });

/* ===================================================================
   SOẠN THẢO GIẤY TỜ TRỰC TIẾP + XUẤT WORD / PDF
   Báo giá · Hợp đồng · Biên bản nghiệm thu · Đề nghị thanh toán · Phiếu bảo hành
   · Biên bản giao nhận (nhận / trả máy) · Biên bản công tác
   Mọi nội dung sửa được ngay trên trang A4, tự lưu; tải Word (.docx) hoặc PDF
   =================================================================== */
const SC_KINDS=['quote','contract','bbnt','dntt','wcard'];
function docHost(key){ const [type,id,kind]=key.split('|'); return {type,id,kind}; }
function docSource(key){ const {type,id,kind}=docHost(key);
  if(type==='sc'){ const c=svcById(id); if(!c) return null; c.docs=c.docs||{}; const st=c.docs[kind]||null; const cfg=docCfg(c);
    return { type,id,kind,host:c, store:st, setStore:v=>{ c.docs[kind]=v; }, title:`${t('doc_k_'+kind)} · ${c.no}`, gen:()=>DOC_KINDS[kind](c,docCfg(c)), sig:()=>[docTotal(c),c.items.length,c.status,JSON.stringify(c.doc||{})].join('|'), back:c.ticketId?'t:'+c.ticketId:'sc:'+c.id, fields:DOC_FIELDS[kind]||[], cfg, file:`${t('doc_k_'+kind)}_${c.no}` }; }
  if(type==='ho'){ const h=(DB.handovers||[]).find(z=>z.id===id); if(!h) return null; return { type,id,kind:'ho',host:h, store:h.edit||null, setStore:v=>{ h.edit=v; }, title:`${t('ho_doc_'+h.kind)} · ${h.no}`, gen:()=>hoDocHtml(h), sig:()=>String(h.at), back:h.ref&&h.ref.kind==='ticket'?'t:'+h.ref.id:'stock', fields:[], file:`BBGN_${h.no}` }; }
  if(type==='fj'){ const j=fjById(id); if(!j) return null; return { type,id,kind:'fj',host:j, store:j.docEdit||null, setStore:v=>{ j.docEdit=v; }, title:`${t('fj_print')} · ${j.no}`, gen:()=>fjDoc(j), sig:()=>[j.status,j.checklist.filter(c=>c.v).length,(j.after||[]).length,!!j.sign.img].join('|'), back:'fj:'+j.id, fields:[], file:`Bien_ban_${j.no}` }; }
  return null; }
const docHtmlOf=src=>src.store&&src.store.html?src.store.html:src.gen();
const edKey=(type,id,kind)=>`ed:${type}|${id}|${kind}`;
A.docEdit = el => openTab(edKey(el.dataset.t||'sc',el.dataset.id,el.dataset.k));
/* các nút cũ chuyển sang trình soạn thảo */
A.docOpen = el => { const c=svcById(el.dataset.id); if(!c) return; if(S.ui['ed_'+c.id]) edCommit(c.id); save(); openTab(edKey('sc',c.id,el.dataset.k||'quote')); };
A.qdPrint = el => { const c=svcById(el.dataset.id); if(S.ui['ed_'+c.id]) edCommit(c.id); save(); openTab(edKey('sc',c.id,'quote')); };
hoPrint=function(h){ if(h) openTab(edKey('ho',h.id,'ho')); };
A.fjPrint = el => openTab(edKey('fj',el.dataset.id,'fj'));
docBtns=function(c){ return `<div class="doc-btns"><span class="lbl">${t('doc_print_lbl')}</span>${SC_KINDS.map(k=>{ const ed=c.docs&&c.docs[k]; return `<button class="btn sm soft" data-a="docEdit" data-t="sc" data-id="${c.id}" data-k="${k}">${ic(ed?'edit':'file',13)} ${t('doc_k_'+k)}${ed?' ✓':''}</button>`; }).join('')}</div>`; };
/* ---------- trang soạn thảo ---------- */
function viewDocEditor(key){ const src=docSource(key); if(!src) return `<div class="card empty">${t('no_results')}</div>`; const html=docHtmlOf(src); const st=src.store; const can0=!isExternal(me());
  const stale=st&&st.sig&&st.sig!==src.sig(); const tabs=src.type==='sc'?`<div class="seg doc-kinds">${SC_KINDS.map(k=>`<button class="${src.kind===k?'on':''}" data-a="nav" data-k="${edKey('sc',src.id,k)}">${t('doc_k_'+k)}${src.host.docs&&src.host.docs[k]?' ✓':''}</button>`).join('')}</div>`:'';
  const f=S.ui['dcf_'+src.id]||(S.ui['dcf_'+src.id]=Object.assign({},src.cfg||{}));
  const fields=src.fields.length?`<div class="card doc-side"><div class="card-h"><h3>${t('de_fields')}</h3></div><div class="card-b"><div class="form-grid" style="grid-template-columns:1fr">${['quote','contract','bbnt','dntt'].includes(src.kind)?`<div class="field"><label>${t('doc_mode')}</label><div class="seg">${['lump','detail'].map(v=>`<button class="${f.mode===v?'on':''}" data-a="deMode" data-id="${src.id}" data-v="${v}">${t('doc_mode_'+v)}</button>`).join('')}</div></div>`:''}
    ${src.fields.map(([k,l,full,ty])=>`<div class="field"><label for="de-${k}">${t(l)}</label>${ty==='g'?`<select class="select" id="de-${k}" data-bind="dcf_${src.id}.${k}">${['Ông','Bà'].map(g=>`<option ${f[k]===g?'selected':''}>${g}</option>`).join('')}</select>`:`<input class="input" id="de-${k}" type="${ty==='n'?'number':ty==='d'?'date':'text'}" data-bind="dcf_${src.id}.${k}" value="${esc(f[k]??'')}">`}</div>`).join('')}</div>
    <button class="btn primary" style="margin-top:12px;width:100%" data-a="deApply" data-key="${key}">${ic('refresh',14)} ${t(st?'de_apply_over':'de_apply')}</button><p class="hint" style="margin-top:8px">${t(st?'de_apply_warn':'de_fields_hint')}</p></div></div>`:'';
  const tb=`<div class="doc-tb" role="toolbar" aria-label="${t('de_tb')}">${[['bold','B','de_b'],['italic','<i>I</i>','de_i'],['underline','<u>U</u>','de_u']].map(([c,l,tt])=>`<button data-a="deCmd" data-c="${c}" title="${t(tt)}"><b>${l}</b></button>`).join('')}<span class="sep"></span>
    ${[['justifyLeft','≡','de_al'],['justifyCenter','≣','de_ac'],['justifyRight','≡','de_ar'],['justifyFull','☰','de_aj']].map(([c,l,tt],i)=>`<button data-a="deCmd" data-c="${c}" title="${t(tt)}" class="al al${i}">${l}</button>`).join('')}<span class="sep"></span>
    <select data-chg="deSize" title="${t('de_size')}"><option value="">${t('de_size')}</option>${[['2','11'],['3','13'],['4','15'],['5','18'],['6','24']].map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select><span class="sep"></span>
    <button data-a="deRow" data-v="add" title="${t('de_row_add')}">${ic('plus',13)} ${t('de_row')}</button><button data-a="deRow" data-v="del" title="${t('de_row_del')}">${ic('trash',13)} ${t('de_row')}</button><span class="sep"></span>
    <button data-a="deCmd" data-c="undo" title="${t('de_undo')}">↶</button><button data-a="deCmd" data-c="redo" title="${t('de_redo')}">↷</button></div>`;
  return `<div class="page-head"><div><div class="row" style="gap:8px"><button class="btn sm" data-a="nav" data-k="${src.back}">← ${t('back')}</button><h1 style="margin:0">${esc(src.title)}</h1></div><div class="sub"><span class="de-saved">${st?t('de_saved_at',{d:fmtDT(st.at),u:esc(uname(st.by))}):t('de_not_saved')}</span></div></div>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-a="deSave" data-key="${key}">${ic('check',15)} ${t('save')}</button><button class="btn" data-a="deWord" data-key="${key}">${ic('file',15)} Word</button><button class="btn" data-a="dePdf" data-key="${key}">${ic('download',15)} PDF</button><button class="btn" data-a="dePrint" data-key="${key}">${ic('print',15)} ${t('de_print')}</button>${st?`<button class="btn danger" data-a="deReset" data-key="${key}">${S.ui.deRx===key?t('de_reset_again'):t('de_reset')}</button>`:''}</div></div>
    ${tabs}${stale?`<div class="tk-al warn" style="margin:10px 0">${ic('alert',15)}<span>${t('de_stale')}</span></div>`:''}
    <div class="doc-ed-wrap ${fields?'':'nofields'}">${fields}<div class="doc-main">${can0?tb:''}<div class="doc-canvas"><style>${HO_CSS}${DOC_CSS}</style><div class="doc-edit" ${can0?'contenteditable="true"':''} spellcheck="false" data-key="${key}">${html}</div></div><p class="hint" style="margin-top:8px">${t('de_hint')}</p></div></div>`; }
/* tự lưu khi gõ */
let DE_T=null; function deStore(key,html,silent){ const src=docSource(key); if(!src) return; src.setStore({html,at:Date.now(),by:S.userId,sig:src.sig()}); save(); const s=document.querySelector('.de-saved'); if(s) s.textContent=t('de_saved_at',{d:fmtDT(Date.now()),u:uname(S.userId)}); if(!silent) audit('doc_save',src.title,''); }
document.addEventListener('input',ev=>{ const el=ev.target&&ev.target.closest&&ev.target.closest('.doc-edit'); if(!el) return; clearTimeout(DE_T); const key=el.dataset.key; DE_T=setTimeout(()=>deStore(key,el.innerHTML,true),700); });
document.addEventListener('mousedown',ev=>{ if(ev.target.closest&&ev.target.closest('.doc-tb button')) ev.preventDefault(); });
const edEl=()=>document.querySelector('.doc-edit');
A.deCmd = el => { try{ document.execCommand(el.dataset.c,false,null); }catch(e){} const e=edEl(); if(e) deStore(e.dataset.key,e.innerHTML,true); };
A.deSize = el => { if(!el.value) return; try{ document.execCommand('fontSize',false,el.value); }catch(e){} el.value=''; const e=edEl(); if(e) deStore(e.dataset.key,e.innerHTML,true); };
A.deRow = el => { const sel=window.getSelection(); const n=sel&&sel.anchorNode; const tr=n&&(n.nodeType===1?n:n.parentElement).closest('tr'); if(!tr||!tr.closest('.doc-edit')){ toast(t('de_row_pick'),'bad'); return; }
  if(el.dataset.v==='add'){ const c=tr.cloneNode(true); c.querySelectorAll('td,th').forEach(td=>{ td.innerHTML='&nbsp;'; }); tr.after(c); } else tr.remove(); const e=edEl(); if(e) deStore(e.dataset.key,e.innerHTML,true); };
A.deSave = el => { const e=edEl(); if(e) deStore(el.dataset.key,e.innerHTML); toast(t('toast_saved'),'ok'); rerender(); };
A.deMode = el => { (S.ui['dcf_'+el.dataset.id]||{}).mode=el.dataset.v; rerender(); };
A.deApply = el => { const key=el.dataset.key; const src=docSource(key); if(src.type==='sc'){ const c=src.host; const f=S.ui['dcf_'+c.id]||{}; c.doc=Object.assign({},c.doc||{},f); ['validDays','payDays','workDays','wMonths'].forEach(k=>{ if(c.doc[k]!=null) c.doc[k]=Number(c.doc[k])||0; }); if(c.doc.wMonths&&c.status!=='done') c.repairWarrantyMonths=c.doc.wMonths;
    const cu=custById(c.customerId); if(cu){ cu.rep=f.aRep||cu.rep; cu.repTitle=f.aTitle||cu.repTitle; cu.repGender=f.aGender||cu.repGender; cu.taxCode=f.aTax||cu.taxCode; cu.bankAcc=f.aBank||cu.bankAcc; cu.bankName=f.aBankName||cu.bankName; } }
  const s2=docSource(key); s2.setStore(null); deStore(key,s2.gen()); rerender(); toast(t('de_applied'),'ok'); };
A.deReset = el => { const key=el.dataset.key; if(S.ui.deRx!==key){ S.ui.deRx=key; rerender(); return; } S.ui.deRx=null; const src=docSource(key); src.setStore(null); audit('doc_reset',src.title,''); save(); rerender(); toast(t('de_reset_done'),'ok'); };
const curHtml=key=>{ const e=edEl(); if(e&&e.dataset.key===key) return e.innerHTML; return docHtmlOf(docSource(key)); };
A.dePrint = el => { const key=el.dataset.key; const src=docSource(key); printDoc(`<style>${DOC_CSS}</style>`+curHtml(key),src.title); };
/* ---------- tải thư viện khi cần ---------- */
const LIBS={ jszip:'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', h2p:'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js' };
const LIB_P={}; function loadLib(k){ if(LIB_P[k]) return LIB_P[k]; LIB_P[k]=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=LIBS[k]; s.onload=()=>res(); s.onerror=()=>{ LIB_P[k]=null; rej(new Error('load')); }; document.head.appendChild(s); }); return LIB_P[k]; }
async function saveBlob(name,blob){ try{ if(window.claude&&window.claude.use){ const dl=await window.claude.use('downloads'); if(dl){ await dl.save({filename:name,data:blob}); return true; } } }catch(e){ if(e&&e.code==='declined') return false; }
  try{ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },800); return true; }catch(e){ return false; } }
const safeName=s=>noAccent(s).replace(/[^A-Za-z0-9._-]+/g,'_').replace(/_+/g,'_').slice(0,80);
/* ---------- Word (.docx) ---------- */
const WORD_CSS=`body{font-family:"Times New Roman",serif;font-size:13pt;line-height:1.35}.a4{width:auto!important;padding:0!important;margin:0!important;box-shadow:none!important;min-height:0!important}table{border-collapse:collapse;width:100%}.grid td,.grid th,.dg td,.dg th{border:1px solid #000;padding:3pt 5pt;vertical-align:top}th{background:#f2f2f2}.c{text-align:center}.r{text-align:right}.ttl{text-align:center;font-size:16pt;font-weight:bold}.art{font-weight:bold;margin-top:8pt}.sign td{text-align:center;vertical-align:top;border:none}.sign td.s{height:80pt}.info td{border:none;padding:1pt 3pt}.lh td{border:none}.lh{border-bottom:2px solid #1f4e8c}p{margin:3pt 0}`;
function b64utf8(s){ return btoa(unescape(encodeURIComponent(s))); }
function wrap76(s){ return s.replace(/(.{76})/g,'$1\r\n'); }
function buildMht(html){ const parts=[]; let i=0; html=html.replace(/src="(data:(image\/[a-z+]+);base64,([^"]+))"/g,(m,all,mime,b64)=>{ const ext=mime.split('/')[1].replace('jpeg','jpg').replace('svg+xml','svg'); const loc=`file:///C:/sge/img${i++}.${ext}`; parts.push({loc,mime,b64}); return `src="${loc}"`; });
  const doc=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${WORD_CSS}${HO_CSS.replace(/\.a4\{[^}]*\}/,'')}</style></head><body>${html}</body></html>`; const B='----=_SGE_MHT_BOUNDARY';
  let out=`MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="${B}"; type="text/html"\r\n\r\n--${B}\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\nContent-Location: file:///C:/sge/doc.html\r\n\r\n${wrap76(b64utf8(doc))}\r\n`;
  parts.forEach(p=>{ out+=`\r\n--${B}\r\nContent-Type: ${p.mime}\r\nContent-Transfer-Encoding: base64\r\nContent-Location: ${p.loc}\r\n\r\n${wrap76(p.b64)}\r\n`; }); return out+`\r\n--${B}--\r\n`; }
let buildDocx=async function(html){ await loadLib('jszip'); const z=new JSZip();
  z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/afchunk.mht" ContentType="message/rfc822"/></Types>');
  z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="/word/afchunk.mht"/></Relationships>');
  z.file('word/document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:altChunk r:id="htmlChunk"/><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>');
  z.file('word/afchunk.mht',buildMht(html)); return z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}); }
A.deWord = async el => { const key=el.dataset.key; const src=docSource(key); const html=curHtml(key); toast(t('de_making'),'ok');
  try{ const blob=await buildDocx(html); const ok=await saveBlob(safeName(src.file)+'.docx',blob); if(ok){ audit('doc_word',src.title,''); save(); } }catch(e){ toast(t('de_lib_fail'),'bad'); } };
/* ---------- PDF ---------- */
async function buildPdf(html){ await loadLib('h2p'); const box=document.createElement('div'); box.style.cssText='position:fixed;left:-12000px;top:0;width:794px;background:#fff;color:#000';
  box.innerHTML=`<style>${HO_CSS}${DOC_CSS}.a4{box-shadow:none!important;margin:0!important}</style>${html}`; document.body.appendChild(box);
  try{ return await html2pdf().set({ margin:0, filename:'doc.pdf', image:{type:'jpeg',quality:0.96}, html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}, pagebreak:{mode:['css','legacy'],avoid:['tr','.sign','img']} }).from(box.querySelector('.a4')||box).outputPdf('blob'); }
  finally{ box.remove(); } }
A.dePdf = async el => { const key=el.dataset.key; const src=docSource(key); const html=curHtml(key); toast(t('de_making'),'ok');
  try{ const blob=await buildPdf(html); const ok=await saveBlob(safeName(src.file)+'.pdf',blob); if(ok){ audit('doc_pdf',src.title,''); save(); } }catch(e){ toast(t('de_lib_fail'),'bad'); } };
/* tải nhanh từ danh sách giấy tờ */
A.docQuick = async el => { const key=`${el.dataset.t}|${el.dataset.id}|${el.dataset.k}`; const src=docSource(key); const html=docHtmlOf(src); toast(t('de_making'),'ok');
  try{ const blob=el.dataset.f==='pdf'?await buildPdf(html):await buildDocx(html); await saveBlob(safeName(src.file)+(el.dataset.f==='pdf'?'.pdf':'.docx'),blob); audit('doc_'+(el.dataset.f==='pdf'?'pdf':'word'),src.title,''); save(); }catch(e){ toast(t('de_lib_fail'),'bad'); } };
/* ---------- khung "Giấy tờ" trong phiếu sửa chữa ---------- */
function docsBox(x){ const u=me(); if(!u||isExternal(u)) return ''; const c=x.svcId&&svcById(x.svcId); const hos=hoList('ticket',x.id); const rows=[];
  const row=(label,key,meta,exists,createBtn)=>rows.push(`<div class="dl-row"><div class="dl-l">${ic('file',16)}<div><b>${label}</b><small class="muted">${meta}</small></div></div><div class="dl-a">${exists?`<button class="btn sm" data-a="nav" data-k="ed:${key}">${ic('edit',13)} ${t('de_open')}</button><button class="btn sm soft" data-a="docQuick" data-t="${key.split('|')[0]}" data-id="${key.split('|')[1]}" data-k="${key.split('|')[2]}" data-f="docx">Word</button><button class="btn sm soft" data-a="docQuick" data-t="${key.split('|')[0]}" data-id="${key.split('|')[1]}" data-k="${key.split('|')[2]}" data-f="pdf">PDF</button>`:createBtn||''}</div></div>`);
  const hr=hos.find(h=>h.kind==='receive'); row(t('ho_doc_receive'),hr?`ho|${hr.id}|ho`:'',hr?(hr.edit?t('de_edited',{d:fmtDT(hr.edit.at)}):hr.no):t('de_none'),!!hr,can('ticket_create')?`<button class="btn sm" data-a="hoNew" data-kind="receive" data-rk="ticket" data-rid="${x.id}">${ic('plus',13)} ${t('de_create')}</button>`:'');
  if(c) SC_KINDS.forEach(k=>{ const st=c.docs&&c.docs[k]; row(t('doc_k_'+k),`sc|${c.id}|${k}`,st?t('de_edited',{d:fmtDT(st.at)}):t('de_auto'),true); });
  const hd=hos.find(h=>h.kind==='deliver'); row(t('ho_doc_deliver'),hd?`ho|${hd.id}|ho`:'',hd?(hd.edit?t('de_edited',{d:fmtDT(hd.edit.at)}):hd.no):t('de_none'),!!hd,can('ticket_create')&&['testing','delivered','invoiced','paid','closed','return_pending'].includes(x.status)?`<button class="btn sm" data-a="hoNew" data-kind="deliver" data-rk="ticket" data-rid="${x.id}">${ic('plus',13)} ${t('de_create')}</button>`:'');
  return `<section class="card"><div class="card-h"><h3>${ic('file',16)} ${t('de_box')}</h3><span class="hint">${t('de_box_h')}</span></div><div class="card-b dl-list">${rows.join('')}</div></section>`; }
const _proofBoxDL=proofBox; proofBox=function(x){ return docsBox(x)+_proofBoxDL(x); };
/* biên bản giao nhận: lưu xong mở trình soạn thảo */
const _hoSaveDE=A.hoSave; A.hoSave=el=>{ const n0=(DB.handovers||[]).length; _hoSaveDE(el); };
/* ---------- đăng ký trang ---------- */
const _erpViewDE=erpView; erpView=function(k){ if(k.startsWith('ed:')) return viewDocEditor(k.slice(3)); return _erpViewDE(k); };
const _tabAllowedDE=tabAllowed; tabAllowed=function(k,u=me()){ if(k.startsWith('ed:')) return !!u; return _tabAllowedDE(k,u); };
const _tabTitleDE=tabTitle; tabTitle=function(k){ if(k.startsWith('ed:')){ const s=docSource(k.slice(3)); return s?s.title:'?'; } return _tabTitleDE(k); };
const _activeNavDE=activeNavKey; activeNavKey=function(){ if(S.active&&S.active.startsWith('ed:')){ const h=docHost(S.active.slice(3)); return h.type==='fj'?'field':'tickets'; } return _activeNavDE(); };
Object.assign(DICT.vi,{ de_fields:'Thông tin tự điền', de_fields_hint:'Sửa thông tin rồi bấm "Điền vào giấy tờ". Muốn sửa câu chữ, bảng biểu thì gõ trực tiếp trên trang bên phải.', de_apply:'Điền vào giấy tờ', de_apply_over:'Điền lại từ dữ liệu', de_apply_warn:'Lưu ý: điền lại sẽ thay toàn bộ nội dung bạn đã sửa tay trên trang.', de_applied:'Đã điền lại giấy tờ',
  de_tb:'Định dạng', de_b:'In đậm', de_i:'In nghiêng', de_u:'Gạch chân', de_al:'Căn trái', de_ac:'Căn giữa', de_ar:'Căn phải', de_aj:'Căn đều', de_size:'Cỡ chữ', de_row:'dòng', de_row_add:'Thêm dòng bảng bên dưới', de_row_del:'Xóa dòng bảng đang chọn', de_row_pick:'Đặt con trỏ vào một dòng trong bảng trước', de_undo:'Hoàn tác', de_redo:'Làm lại',
  de_print:'In', de_reset:'Về mẫu gốc', de_reset_again:'Bấm lần nữa để xác nhận', de_reset_done:'Đã khôi phục mẫu gốc', de_saved_at:'Đã lưu {d} · {u}', de_not_saved:'Bản tự động từ dữ liệu — gõ vào trang để chỉnh sửa, tự lưu', de_stale:'Số liệu (giá, hạng mục, trạng thái) đã thay đổi sau lần bạn sửa giấy tờ này. Kiểm tra lại hoặc bấm "Điền lại từ dữ liệu".',
  de_hint:'Bấm vào bất kỳ chỗ nào trên trang để sửa chữ, số, bảng. Nội dung tự lưu sau khi gõ. Tải Word để chỉnh tiếp trên máy tính, tải PDF để gửi khách.', de_making:'Đang tạo file…', de_lib_fail:'Không tạo được file (cần kết nối mạng để tải thư viện). Thử lại hoặc dùng nút In → Lưu PDF.',
  de_box:'Giấy tờ', de_box_h:'Soạn, sửa và tải Word / PDF', de_open:'Mở & sửa', de_create:'Tạo', de_none:'Chưa tạo', de_auto:'Tự tạo từ dữ liệu, chưa sửa tay', de_edited:'Đã chỉnh sửa {d}', ho_doc_receive:'Biên bản giao nhận (nhận máy)', ho_doc_deliver:'Biên bản giao nhận (trả máy)',
  au_doc_save:'Lưu giấy tờ', au_doc_reset:'Khôi phục mẫu gốc giấy tờ', au_doc_word:'Tải Word', au_doc_pdf:'Tải PDF' });
Object.assign(DICT.en,{ de_fields:'Auto-filled details', de_fields_hint:'Edit details then press "Fill into document". To change wording or tables, type directly on the page.', de_apply:'Fill into document', de_apply_over:'Refill from data', de_apply_warn:'Refilling replaces everything you edited by hand.', de_applied:'Document refilled',
  de_tb:'Formatting', de_b:'Bold', de_i:'Italic', de_u:'Underline', de_al:'Align left', de_ac:'Center', de_ar:'Align right', de_aj:'Justify', de_size:'Font size', de_row:'row', de_row_add:'Add table row below', de_row_del:'Delete current table row', de_row_pick:'Place the cursor in a table row first', de_undo:'Undo', de_redo:'Redo',
  de_print:'Print', de_reset:'Reset to template', de_reset_again:'Tap again to confirm', de_reset_done:'Template restored', de_saved_at:'Saved {d} · {u}', de_not_saved:'Auto-generated from data — type on the page to edit; saves automatically', de_stale:'Figures changed after you edited this document. Review it or press "Refill from data".',
  de_hint:'Click anywhere on the page to edit text, numbers and tables. Changes save automatically. Download Word to keep editing on a computer, or PDF to send.', de_making:'Creating file…', de_lib_fail:'Could not create the file (needs internet to load a library). Try again or use Print → Save as PDF.',
  de_box:'Documents', de_box_h:'Create, edit and download Word / PDF', de_open:'Open & edit', de_create:'Create', de_none:'Not created', de_auto:'Auto-generated, not edited', de_edited:'Edited {d}', ho_doc_receive:'Handover record (receipt)', ho_doc_deliver:'Handover record (return)',
  au_doc_save:'Document saved', au_doc_reset:'Document reset', au_doc_word:'Word downloaded', au_doc_pdf:'PDF downloaded' });

/* ===================================================================
   XUẤT WORD THẬT (.docx chuẩn OpenXML — mở được bằng Word, WPS, LibreOffice, Google Docs)
   =================================================================== */
const XE=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const FONT_SZ={1:8,2:10,3:12,4:14,5:18,6:24,7:36};
function imgDims(src){ return new Promise(res=>{ const im=new Image(); im.onload=()=>res({w:im.naturalWidth||100,h:im.naturalHeight||100}); im.onerror=()=>res({w:100,h:100}); im.src=src; }); }
function svgToPng(src,h){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>{ const sc=3; const w=(im.naturalWidth||200)*(h/(im.naturalHeight||60)); const cv=document.createElement('canvas'); cv.width=Math.round(w*sc); cv.height=Math.round(h*sc); const ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,cv.width,cv.height); ctx.drawImage(im,0,0,cv.width,cv.height); res(cv.toDataURL('image/png')); }; im.onerror=rej; im.src=src; }); }
async function htmlToDocx(html){ await loadLib('jszip');
  const root=document.createElement('div'); root.innerHTML=html; root.querySelectorAll('style,script').forEach(n=>n.remove());
  const media=[]; const imgs=[...root.querySelectorAll('img')]; for(const im of imgs){ let src0=im.getAttribute('src')||''; if(src0.startsWith('data:image/svg')){ try{ src0=await svgToPng(src0,parseFloat(im.style.height)||60); im.setAttribute('src',src0); }catch(e){} } const src=im.getAttribute('src')||''; const m=src.match(/^data:image\/(png|jpe?g|gif);base64,(.+)$/); if(!m){ im.remove(); continue; } const d=await imgDims(src); const ext=m[1]==='jpeg'?'jpg':m[1]; const id='rIdImg'+media.length;
    let hpx=parseFloat(im.style.height)||parseFloat(im.getAttribute('height'))||0, wpx=parseFloat(im.style.width)||parseFloat(im.getAttribute('width'))||0; if(im.style.width&&im.style.width.endsWith('%')) wpx=0;
    if(!wpx&&!hpx){ wpx=Math.min(d.w,600); } if(wpx&&!hpx) hpx=wpx*d.h/d.w; if(hpx&&!wpx) wpx=hpx*d.w/d.h; if(wpx>620){ hpx=hpx*620/wpx; wpx=620; }
    media.push({id,ext,b64:m[2],n:media.length}); im.dataset.rid=id; im.dataset.cx=Math.round(wpx*9525); im.dataset.cy=Math.round(hpx*9525); }
  const R=(text,f)=>{ if(text==='') return ''; const pr=`${f.b?'<w:b/>':''}${f.i?'<w:i/>':''}${f.u?'<w:u w:val="single"/>':''}${f.sz?`<w:sz w:val="${f.sz*2}"/><w:szCs w:val="${f.sz*2}"/>`:''}${f.color?`<w:color w:val="${f.color}"/>`:''}`; return `<w:r>${pr?`<w:rPr>${pr}</w:rPr>`:''}<w:t xml:space="preserve">${XE(text)}</w:t></w:r>`; };
  const imgRun=im=>`<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${im.dataset.cx}" cy="${im.dataset.cy}"/><wp:docPr id="${parseInt(im.dataset.rid.slice(6))+1}" name="img"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${im.dataset.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${im.dataset.cx}" cy="${im.dataset.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  const BLOCK=new Set(['P','DIV','H1','H2','H3','H4','TABLE','UL','OL','LI','SECTION','TBODY','THEAD','TR']);
  const fmtOf=(el,f)=>{ const g=Object.assign({},f); const tg=el.tagName; if(tg==='B'||tg==='STRONG'||tg==='TH') g.b=1; if(tg==='I'||tg==='EM') g.i=1; if(tg==='U') g.u=1; if(tg==='FONT'&&el.getAttribute('size')) g.sz=FONT_SZ[el.getAttribute('size')]||g.sz;
    const st=el.style||{}; if(st.fontWeight&&(st.fontWeight==='bold'||+st.fontWeight>=600)) g.b=1; if(st.fontStyle==='italic') g.i=1; if((st.textDecoration||'').includes('underline')) g.u=1; if(st.fontSize&&st.fontSize.endsWith('px')) g.sz=Math.round(parseFloat(st.fontSize)*0.75); if(st.fontSize&&st.fontSize.endsWith('pt')) g.sz=parseFloat(st.fontSize);
    const cl=el.classList||{contains:()=>false}; if(cl.contains('it')) g.i=1; if(cl.contains('art')||cl.contains('ttl')) g.b=1; if(cl.contains('ttl')) g.sz=16; if(tg==='H2') { g.b=1; g.sz=g.sz||16; } if(tg==='H3'){ g.b=1; g.sz=g.sz||14; } if(tg==='SMALL') g.sz=10; return g; };
  const alignOf=(el,dflt)=>{ const st=el.style&&el.style.textAlign; const cl=el.classList||{contains:()=>false}; const a=st||(el.getAttribute&&el.getAttribute('align'))||(cl.contains('c')||cl.contains('ttl')||cl.contains('nat')?'center':cl.contains('r')?'right':''); return a==='center'?'center':a==='right'?'right':a==='justify'?'both':dflt||''; };
  const P=(runs,al,sp)=>`<w:p><w:pPr>${al?`<w:jc w:val="${al}"/>`:''}<w:spacing w:before="${sp&&sp.b||0}" w:after="${sp&&sp.a!=null?sp.a:60}" w:line="276" w:lineRule="auto"/></w:pPr>${runs}</w:p>`;
  function inl(node,f){ let out=''; node.childNodes.forEach(n=>{ if(n.nodeType===3){ out+=R(n.nodeValue.replace(/\s+/g,' '),f); } else if(n.nodeType===1){ if(n.tagName==='BR') out+='<w:r><w:br/></w:r>'; else if(n.tagName==='IMG'&&n.dataset.rid) out+=imgRun(n); else if(!BLOCK.has(n.tagName)){ out+=inl(n,fmtOf(n,f)); if(n.style&&n.style.display==='inline-block') out+=R('    ',f); } } }); return out; }
  function blocks(node,f,dAl){ const out=[]; let runs=''; const flush=()=>{ if(runs.replace(/<w:r><w:t xml:space="preserve"> <\/w:t><\/w:r>/g,'').trim()){ out.push(P(runs,alignOf(node,dAl))); } runs=''; };
    node.childNodes.forEach(n=>{ if(n.nodeType===3){ runs+=R(n.nodeValue.replace(/\s+/g,' '),f); return; } if(n.nodeType!==1) return; const tg=n.tagName;
      if(tg==='BR'){ runs+='<w:r><w:br/></w:r>'; return; } if(tg==='IMG'){ if(n.dataset.rid) runs+=imgRun(n); return; }
      if(tg==='TABLE'){ flush(); out.push(table(n,f)); return; }
      if(BLOCK.has(tg)){ flush(); const g=fmtOf(n,f); const al=alignOf(n,tg==='P'&&n.closest('.sgedoc')&&!n.querySelector('br')?'both':dAl); const hasBlock=[...n.children].some(c=>BLOCK.has(c.tagName));
        if(hasBlock) out.push(...blocks(n,g,al)); else { const r=inl(n,g); const sp=tg==='H2'?{b:120,a:120}:tg==='H3'?{b:0,a:60}:(n.classList&&n.classList.contains('art'))?{b:120,a:40}:null; out.push(P(r||'',al,sp)); } return; }
      runs+=inl(n,fmtOf(n,f)); }); flush(); return out; }
  function table(t0,f){ const rows=[...t0.rows]; if(!rows.length) return ''; const grid=t0.classList.contains('grid')||t0.classList.contains('dg'); const ncol=Math.max(...rows.map(r=>[...r.cells].reduce((s,c)=>s+(c.colSpan||1),0)));
    const first=rows.find(r=>r.cells.length===ncol)||rows[0]; const pw=v=>{ if(!v) return 0; const n=parseFloat(v); if(!n) return 0; if(v.endsWith('px')) return n/680*100; if(v.endsWith('mm')) return n/170*100; if(v.endsWith('cm')) return n/17*100; return n; }; let ws=[...first.cells].map(c=>pw(c.style.width||c.getAttribute('width')||'')); let known=ws.reduce((a,b)=>a+b,0); if(known>95){ ws=ws.map(w=>w*90/known); known=90; } const unk=ws.filter(w=>!w).length; ws=ws.map(w=>w||Math.max(5,(100-known)/Math.max(1,unk))); while(ws.length<ncol) ws.push(100/ncol);
    const tw=9354; const gridCols=ws.map(w=>Math.round(tw*w/100)); const bd=grid?`<w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(s=>`<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('')}</w:tblBorders>`:`<w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(s=>`<w:${s} w:val="nil"/>`).join('')}</w:tblBorders>`;
    const lh=t0.classList.contains('lh'); const sign=t0.classList.contains('sign');
    const trs=rows.map(r=>{ let ci=0; const tcs=[...r.cells].map(c=>{ const span=c.colSpan||1; const w=gridCols.slice(ci,ci+span).reduce((a,b)=>a+b,0); ci+=span; const g=fmtOf(c,f); const al=alignOf(c,sign?'center':'');
      let inner=blocks(c,g,al).join(''); if(!inner) inner=P('',al); if(c.classList.contains('s')&&!c.querySelector('img')) inner+=P('',al)+P('',al)+P('',al);
      return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${span>1?`<w:gridSpan w:val="${span}"/>`:''}${c.tagName==='TH'?'<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>':''}<w:vAlign w:val="${lh?'center':'top'}"/></w:tcPr>${inner}</w:tc>`; }).join('');
      return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${tcs}</w:tr>`; }).join('');
    const bottom=lh?`<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/><w:bottom w:val="single" w:sz="12" w:space="0" w:color="1F4E8C"/></w:tblBorders>`:bd;
    return `<w:tbl><w:tblPr><w:tblW w:w="${tw}" w:type="dxa"/>${bottom}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${gridCols.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${trs}</w:tbl>${P('',null,{a:0})}`; }
  const start=root.querySelector('.a4')||root; const body=blocks(start,{},'').join('');
  const z=new JSZip(); const W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  z.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
  z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${media.map(m=>`<Relationship Id="${m.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${m.n}.${m.ext}"/>`).join('')}</Relationships>`);
  z.file('word/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`);
  media.forEach(m=>z.file(`word/media/image${m.n}.${m.ext}`,m.b64,{base64:true}));
  z.file('word/document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  return z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}); }
buildDocx=htmlToDocx;

/* ===================================================================
   GIAO DIỆN ĐIỆN THOẠI: thanh điều hướng dưới màn hình
   =================================================================== */
const BNAV_IC={ home:'chart', todo:'check', tickets:'wrench', field:'globe', stock:'box', contracts:'file', finance:'chart', customers:'msg', reports:'chart', kpi:'star' };
function bottomNav(){ const u=me(); if(!u||isExternal(u)) return ''; const items=navItems(u).filter(n=>!n.more).slice(0,4); const act=activeNavKey(); const tot=todoTotal(u);
  return items.map(n=>`<button class="bn-i ${act===n.k?'on':''}" data-a="nav" data-k="${n.k}"><span class="bn-ic">${ic(BNAV_IC[n.k]||'file',20)}${n.k==='todo'&&tot?`<b class="bn-b">${tot>99?'99+':tot}</b>`:''}</span><span class="bn-l">${esc(n.l)}</span></button>`).join('')+`<button class="bn-i" data-a="drawer"><span class="bn-ic">${ic('menu',20)}</span><span class="bn-l">${t('bn_more')}</span></button>`; }
function syncBottomNav(){ let el=document.getElementById('bnav'); const html=bottomNav(); if(!html){ if(el) el.remove(); document.body.classList.remove('has-bnav'); return; }
  if(!el){ el=document.createElement('nav'); el.id='bnav'; el.className='bnav'; el.setAttribute('aria-label',t('bn_label')); document.body.appendChild(el); } el.innerHTML=html; document.body.classList.add('has-bnav'); }
const _renderBN=render; render=function(){ const r=_renderBN.apply(this,arguments); try{ syncBottomNav(); }catch(e){} return r; };
Object.assign(DICT.vi,{ bn_more:'Thêm', bn_label:'Điều hướng chính' }); Object.assign(DICT.en,{ bn_more:'More', bn_label:'Main navigation' });

/* bỏ hàng nút "In giấy tờ" trong khung báo giá (đã có khung Giấy tờ riêng) */
docBtns=function(){ return '<div class="doc-btns"></div>'; };

/* ===================================================================
   TRỢ LÝ AI SGE — tra cứu & xử lý nhanh bằng tiếng Việt
   Tự tra dữ liệu thật của hệ thống qua các công cụ (chỉ đọc), trả lời ngắn gọn,
   dẫn mã phiếu bấm mở được; tra nhanh ngay không cần AI khi gõ mã / serial
   =================================================================== */
const AIX={ open:false, turns:[], busy:false, ctl:null, deep:false, el:null, sample:undefined };
function aiSample(){ if(AIX.sample!==undefined) return Promise.resolve(AIX.sample); try{ if(!(window.claude&&window.claude.use)) { AIX.sample=null; return Promise.resolve(null); } return window.claude.use('sample').then(s=>(AIX.sample=s||null)).catch(()=>(AIX.sample=null)); }catch(e){ AIX.sample=null; return Promise.resolve(null); } }
const lc=s=>noAccent(String(s||'')).toLowerCase();
const stepName=x=>{ const i=stepOf(x); return x.unrepairable?t('flow_unrep'):i==null?t('s_'+x.status):t('step_'+STEPS[i]); };
function tkBrief(x){ const c=x.svcId&&svcById(x.svcId); return { no:x.no, khach:x.company||custName(x.customerId), may:(x.products||[]).map(p=>`${p.model||''} ${p.sn||''}`.trim()).join(', '), loai:stName(x.type), buoc:stepName(x), trang_thai:t('s_'+x.status), ktv:uname(x.assigneeId)||'', tao_luc:fmtD(x.createdAt), qua_han_sla:isOpen(x)&&slaBreached(x)||false, con_phai_thu:c?docDue(c):0 }; }
function aiSearch(q,limit=8){ const k=lc(q).trim(); if(!k) return []; const words=k.split(/\s+/).filter(Boolean); const hit=s=>{ const v=lc(s); return words.every(w=>v.includes(w)); }; const out=[];
  (DB.tickets||[]).forEach(x=>{ if(hit([x.no,x.company,custName(x.customerId),x.project,x.address,(x.products||[]).map(p=>p.sn+' '+p.model).join(' '),uname(x.assigneeId),x.description].join(' '))) out.push({kind:'ticket',ref:x.no,id:x.id,title:`${x.no} · ${x.company||custName(x.customerId)}`,sub:`${(x.products||[]).map(p=>p.model+' '+p.sn).join(', ')} · ${stepName(x)}`,at:x.createdAt}); });
  (DB.customers||[]).forEach(c=>{ if(hit([c.company,c.contact,c.phone,c.taxCode,c.address].join(' '))) out.push({kind:'customer',ref:c.company,id:c.id,title:c.company,sub:`${c.contact||''} · ${c.phone||''}`}); });
  (DB.stock||[]).forEach(s=>{ if(hit([s.pn,s.name,s.group].join(' '))) out.push({kind:'stock',ref:s.pn,id:s.pn,title:`${s.pn} · ${s.name}`,sub:`${t('on_hand')} ${s.qty} · ${t('avail')} ${s.qty-reservedQty(s.pn)}`}); });
  (DB.svc||[]).forEach(c=>{ if(hit([c.no,custName(c.customerId),c.sn,c.model,(c.doc&&c.doc.contractNo)||''].join(' '))) out.push({kind:'contract',ref:c.no,id:c.id,title:`${c.no} · ${custName(c.customerId)}`,sub:`${money(docTotal(c))} · ${t('sv_'+c.status)}${docDue(c)>0?' · còn thu '+money(docDue(c)):''}`}); });
  (DB.fjobs||[]).forEach(j=>{ const s=siteById(j.siteId)||{}; if(hit([j.no,s.name,custName(j.customerId),j.note].join(' '))) out.push({kind:'field',ref:j.no,id:j.id,title:`${j.no} · ${s.name||''}`,sub:`${t('fjk_'+j.kind)} · ${fmtD(j.date)} · ${t('fjs_'+j.status)}`}); });
  (DB.expenses||[]).forEach(e=>{ if(hit([e.no,L(e.desc)].join(' '))) out.push({kind:'expense',ref:e.no,id:e.id,title:`${e.no} · ${money(e.amount)}`,sub:`${L(e.desc)} · ${t('ex_'+e.status)}`}); });
  const exact=out.filter(o=>lc(o.ref)===k); return (exact.length?exact:out).slice(0,limit); }
const aiGo=o=>o.kind==='ticket'?`t:${o.id}`:o.kind==='contract'?`sc:${o.id}`:o.kind==='field'?`fj:${o.id}`:o.kind==='stock'?'stock':o.kind==='customer'?'customers':o.kind==='expense'?'finance':'home';
/* ---- công cụ cho AI (chỉ đọc) ---- */
const finOK=()=>can('fin_view')||can('fin_cash')||isBossRole(me());
const AI_TOOLS=[
 {name:'tim_kiem',description:'Tìm nhanh trên toàn hệ thống (phiếu sửa chữa, khách hàng, linh kiện kho, hợp đồng/báo giá, phiếu công tác, phiếu chi) theo từ khóa: mã phiếu, serial, model, tên khách, SĐT, mã linh kiện. Trả về danh sách kết quả ngắn kèm mã.',inputSchema:{type:'object',properties:{q:{type:'string'}},required:['q']},execute:i=>aiSearch(String(i.q||''),15)},
 {name:'chi_tiet_phieu',description:'Xem chi tiết 1 phiếu sửa chữa theo mã (vd RW2611030011): khách, máy, bước hiện tại, KTV, chẩn đoán, linh kiện, báo giá/hợp đồng, thanh toán, xuất kho, thuê ngoài, bảo hành sau sửa, lịch sử gần nhất.',inputSchema:{type:'object',properties:{ma:{type:'string'}},required:['ma']},execute:i=>{ const k=String(i.ma||'').trim().toUpperCase(); const x=(DB.tickets||[]).find(z=>z.no.toUpperCase()===k)||(DB.tickets||[]).find(z=>(z.products||[]).some(p=>String(p.sn).toUpperCase()===k)); if(!x) throw new Error('Không tìm thấy phiếu '+k);
   const c=x.svcId&&svcById(x.svcId); const rw=reworkOf(x);
   return Object.assign(tkBrief(x),{ chan_doan:x.diagnosis?L(x.diagnosis.text):'', linh_kien_du_kien:((x.diagnosis&&x.diagnosis.estParts)||[]).map(p=>p.pn+' x'+(p.qty||1)), linh_kien_da_thay:(x.parts||[]).map(p=>p.pn+' x'+(p.qty||1)),
     bao_gia:c?{so:c.no,trang_thai:t('sv_'+c.status),tong:docTotal(c),da_thu:docPaid(c),con_thu:docDue(c),dat_coc:(c.depositPct||0)+'%',hoa_don:c.invoice?c.invoice.no:'',het_hieu_luc:c.status==='sent'&&!c.agreedAt?fmtD(quoteExpiry(c)):''}:null,
     kho:x.wh?{so:x.wh.no,trang_thai:t('wh_st_'+x.wh.status),hang:x.wh.parts.map(p=>p.pn+' x'+p.qty)}:null, thue_ngoai:x.os?{don_vi:(supById(x.os.vendorId)||{}).name,trang_thai:t('oss_'+x.os.status),chi_phi:x.os.realCost??x.os.cost}:null,
     bao_hanh_sau_sua:rw?{phieu_truoc:rw.t.no,ktv_truoc:uname(rw.t.assigneeId),het_han:fmtD(rw.end),ket_luan:x.wcover?(x.wcover.covered?'thuộc BH':'không thuộc BH: '+t('wxr_'+x.wcover.reason)):'chưa xác định'}:null,
     khong_sua_duoc:x.unrepairable?t('ur_'+x.unrepairable.reason)+' – '+x.unrepairable.note:'', lich_su:(x.history||[]).slice(-8).map(h=>`${fmtDT(h.at)} ${uname(h.by)}: ${t('h_'+h.action)}${h.note?' ('+h.note+')':''}`) }); }},
 {name:'danh_sach_phieu',description:'Liệt kê phiếu sửa chữa theo bộ lọc. buoc: tiep_nhan|chan_doan|cho_duyet|cho_khach|sua_chua|kiem_tra|cho_giao|da_giao|tat_ca_dang_mo. Có thể lọc ktv (tên), khach (tên), qua_han (true), loai (bao_hanh|sua_chua).',inputSchema:{type:'object',properties:{buoc:{type:'string'},ktv:{type:'string'},khach:{type:'string'},qua_han:{type:'boolean'},loai:{type:'string'},gioi_han:{type:'number'}}},execute:i=>{ const B={tiep_nhan:x=>['unassigned','draft'].includes(x.status),chan_doan:x=>['diagnosing','returned'].includes(x.status),cho_duyet:x=>x.status==='pending'&&!partsApproved(x),cho_khach:x=>x.status==='pending'&&partsApproved(x),sua_chua:x=>['approved','in_service','on_hold'].includes(x.status),kiem_tra:x=>x.status==='testing'&&!isReady(x),cho_giao:x=>isReady(x),da_giao:x=>['delivered','invoiced','paid','closed'].includes(x.status),tat_ca_dang_mo:x=>isOpen(x)&&!['delivered','invoiced','paid'].includes(x.status)};
   let a=(DB.tickets||[]).filter(B[i.buoc]||B.tat_ca_dang_mo); if(i.ktv) a=a.filter(x=>lc(uname(x.assigneeId)).includes(lc(i.ktv))); if(i.khach) a=a.filter(x=>lc(x.company||custName(x.customerId)).includes(lc(i.khach))); if(i.qua_han) a=a.filter(x=>isOpen(x)&&slaBreached(x)); if(i.loai) a=a.filter(x=>i.loai==='bao_hanh'?x.type==='RW':x.type!=='RW');
   return {tong:a.length,phieu:a.slice(0,Math.min(40,Number(i.gioi_han)||25)).map(tkBrief)}; }},
 {name:'viec_cua_toi',description:'Danh sách việc cần làm hôm nay của người đang dùng (theo vai trò), gồm việc gấp/quá hạn.',execute:()=>allTasks(me()).map(g=>({nhom:g.title,so_luong:g.n,gap:!!g.urgent,muc:(g.items||[]).slice(0,8).map(it=>it.no||it.title||'')}))},
 {name:'kho',description:'Tra tồn kho 1 linh kiện hoặc danh sách: theo mã/tên (q). Trả về tồn, đang giữ cho phiếu, khả dụng, định mức, giá vốn, giá bán, vị trí. q="duoi_dinh_muc" để lấy hàng dưới định mức.',inputSchema:{type:'object',properties:{q:{type:'string'}}},execute:i=>{ const q=String(i.q||''); let a=q==='duoi_dinh_muc'?DB.stock.filter(s=>s.qty<s.min):DB.stock.filter(s=>!q||lc(s.pn+' '+s.name+' '+s.group).includes(lc(q)));
   return a.slice(0,30).map(s=>({ma:s.pn,ten:s.name,ton:s.qty,dang_giu:reservedQty(s.pn),kha_dung:s.qty-reservedQty(s.pn),dinh_muc:s.min,gia_von:finOK()?s.cost:undefined,gia_ban:s.price,vi_tri:s.loc||''})); }},
 {name:'khach_hang',description:'Hồ sơ 1 khách hàng theo tên/SĐT/MST: liên hệ, số phiếu đang mở, lịch sử sửa, công nợ phải thu, hợp đồng bảo trì, công trình.',inputSchema:{type:'object',properties:{q:{type:'string'}},required:['q']},execute:i=>{ const q=lc(i.q); const c=(DB.customers||[]).find(z=>lc(z.company+' '+z.phone+' '+(z.taxCode||'')+' '+z.contact).includes(q)); if(!c) throw new Error('Không tìm thấy khách');
   const tk=(DB.tickets||[]).filter(x=>x.customerId===c.id||lc(x.company)===lc(c.company)); const ar=(DB.svc||[]).concat(DB.orders||[]).filter(d=>d.customerId===c.id&&docDue(d)>0&&d.status!=='cancelled');
   return {ten:c.company,lien_he:c.contact,sdt:c.phone,email:c.email,mst:c.taxCode||'',dia_chi:c.address,phieu_dang_mo:tk.filter(isOpen).map(x=>x.no+' '+stepName(x)),so_lan_sua:tk.length,phieu_gan_nhat:tk.sort((a,b)=>b.createdAt-a.createdAt).slice(0,5).map(x=>x.no+' '+fmtD(x.createdAt)),
     cong_no:finOK()?{tong:ar.reduce((s,d)=>s+docDue(d),0),chung_tu:ar.map(d=>d.no+': '+money(docDue(d)))}:'không có quyền xem',hd_bao_tri:(DB.oms||[]).filter(o=>(siteById(o.siteId)||{}).customerId===c.id).map(o=>o.no+' '+t('om_every',{n:o.cycle})),cong_trinh:(DB.sites||[]).filter(s=>s.customerId===c.id).map(s=>s.name+' '+(s.inverters||[]).length+' biến tần')}; }},
 {name:'tai_chinh',description:'Số liệu tài chính (chỉ người có quyền): doanh thu, giá vốn, lãi gộp, chi phí, lãi ròng theo kỳ; công nợ phải thu/phải trả, quá hạn; VAT. ky: thang|quy|nam; lui: số kỳ lùi về trước (0 = kỳ hiện tại).',inputSchema:{type:'object',properties:{ky:{type:'string'},lui:{type:'number'}}},execute:i=>{ if(!finOK()) throw new Error('Người dùng không có quyền xem tài chính'); const f={p:{thang:'month',quy:'quarter',nam:'year'}[i.ky]||'month',anchor:Date.now()}; for(let k=0;k<(Number(i.lui)||0);k++) perShift(f,-1); const r=perRange(f); const p=pnlData(r); const ar=arDocs(me()).filter(d=>d.status!=='declined'); const ap=apDocs(me());
   return {ky:r.label,doanh_thu:p.rev,dt_sua_chua:p.revRep,dt_bao_tri:p.revOm,dt_ban_hang:p.revSo,gia_von:p.cogs,lai_gop:p.gross,chi_phi_hoat_dong:p.opexTot,chi_phi_theo_nhom:Object.fromEntries(Object.entries(p.opex).map(([k,v])=>[t('ec_'+k),v])),lai_rong:p.net,phieu_giao_chua_xuat_hd:p.unbilled.map(x=>x.no),phai_thu:ar.reduce((s,d)=>s+docDue(d),0),phai_thu_qua_han_30:ar.filter(d=>Date.now()-arDueAt(d)>30*DAYMS).map(d=>d.no+' '+custName(d.customerId)+' '+money(docDue(d))),phai_tra:ap.reduce((s,d)=>s+docDue(d),0)}; }},
 {name:'kpi',description:'KPI nhân sự theo kỳ (thang|quy|nam): điểm, việc được giao, xong đúng hạn, trễ, quá hạn, sửa lại. Nhân viên thường chỉ thấy của mình.',inputSchema:{type:'object',properties:{ky:{type:'string'}}},execute:i=>{ const r=perRange({p:{thang:'month',quy:'quarter',nam:'year'}[i.ky]||'month',anchor:Date.now()}); return kpiRows(r,'').map(x=>({ten:x.u.name,vai_tro:t('role_'+x.u.role),diem:x.score,xep_loai:kpiGrade(x.score),duoc_giao:x.assigned,xong_dung_han:x.onTime,xong_tre:x.late,dang_lam:x.doing,qua_han:x.overdue,sua_lai:x.rework})); }},
 {name:'cong_trinh',description:'Lịch công tác tại công trình / bảo trì: phiếu hôm nay, sắp tới, quá ngày, chờ đóng; kỳ bảo trì đến hạn.',execute:()=>{ const js=(DB.fjobs||[]).filter(j=>j.status!=='cancelled'); return {cong_tac:js.filter(j=>j.status!=='closed').map(j=>({ma:j.no,cong_trinh:(siteById(j.siteId)||{}).name,loai:t('fjk_'+j.kind),ngay:fmtDT(j.date),trang_thai:t('fjs_'+j.status),doi:j.team.map(uname).join(', '),qua_ngay:fjLate(j)})),ky_bao_tri_den_han:(DB.oms||[]).map(o=>({hd:o.no,cong_trinh:(siteById(o.siteId)||{}).name,ky_toi:omDue(o)?fmtD(omDue(o)):'hết hạn'}))}; }},
 {name:'bao_hanh_serial',description:'Kiểm tra bảo hành sửa chữa của SGE theo serial: còn hay hết, hạn, hợp đồng, các lần sửa trước.',inputSchema:{type:'object',properties:{serial:{type:'string'}},required:['serial']},execute:i=>{ const sn=String(i.serial||'').trim().toUpperCase(); const rw=repairWarranty(sn); const tk=(DB.tickets||[]).filter(x=>(x.products||[]).some(p=>String(p.sn).toUpperCase()===sn)); return {serial:sn,model:(knownModel(sn)||{}).model||'',bao_hanh:rw?{con_han:rw.inW,het_han:fmtD(rw.end),hop_dong:rw.c.no}:'chưa từng sửa ở SGE',cac_lan_sua:tk.map(x=>x.no+' '+fmtD(x.createdAt)+' '+stepName(x))}; }},
 {name:'bang_gia',description:'Tra bảng giá dịch vụ chuẩn của SGE theo từ khóa/model.',inputSchema:{type:'object',properties:{q:{type:'string'}}},execute:i=>{ seedPrices(); const q=lc(i.q||''); return (DB.prices||[]).filter(p=>!q||lc(p.name+' '+p.model).includes(q)).map(p=>({dich_vu:p.name,model:p.model||'mọi model',gia:p.price})); }}
];
function aiRules(){ const u=me(); return `Bạn là "Trợ lý SGE" — trợ lý AI nội bộ của ${SGE_CO.name} (sửa chữa biến tần năng lượng mặt trời, bảo trì, lắp đặt). Hôm nay là ${fmtD(Date.now())}. Người hỏi: ${u.name}, vai trò ${t('role_'+u.role)}.
QUY TẮC:
- Trả lời bằng tiếng Việt, ngắn gọn, đi thẳng vào việc. Dùng gạch đầu dòng khi liệt kê. Số tiền ghi dạng 1.250.000 đ.
- LUÔN dùng công cụ để lấy dữ liệu thật trước khi trả lời về phiếu, khách, kho, tiền, KPI, lịch. Không bịa số liệu, không đoán mã. Không tìm thấy thì nói rõ.
- Ghi đúng nguyên văn mã (RW2611030011, DV2611-009, CT2611-002, BP004541…) để người dùng bấm mở.
- Khi được nhờ soạn tin nhắn/email/Zalo cho khách: viết sẵn nội dung lịch sự, xưng "SGE" – "Quý khách", dùng số liệu thật từ công cụ.
- Khi được hỏi nên làm gì: đề xuất bước tiếp theo cụ thể theo quy trình (tiếp nhận → chẩn đoán → duyệt linh kiện → báo giá → khách đồng ý → xuất kho → sửa → kiểm tra → thu tiền → giao máy → hóa đơn).
- Bạn chỉ đọc dữ liệu, không thay đổi được gì; nếu người dùng muốn thao tác, chỉ cho họ bấm ở đâu.
- Tôn trọng quyền: nếu công cụ báo không có quyền thì nói người dùng không có quyền xem.`; }
function mdLite(s){ let h=esc(s); h=h.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/^#{1,4}\s*(.+)$/gm,'<b>$1</b>').replace(/^\s*[-•*]\s+(.+)$/gm,'<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g,m=>`<ul>${m.replace(/\n/g,'')}</ul>`).replace(/\n/g,'<br>');
  return h.replace(/\b((?:RW|PR|OW|TN)\d{10}|DV\d{4}-\d{3}|CT\d{4}-\d{3}|CP\d{4}-\d{3}|YX\d{4}-\d{3}|BP\d{6}|[A-Z]{2}\d{6})\b/g,(m)=>{ const r=aiSearch(m,1)[0]; return r&&lc(r.ref)===lc(m)?`<button class="ai-ref" data-a="aiGo" data-k="${aiGo(r)}">${m}</button>`:m; }); }
A.aiGo = el => { openTab(el.dataset.k); if(window.innerWidth<761) aiToggle(false); };
/* ---- giao diện ---- */
const AI_CHIPS={ manager:['Việc gấp hôm nay của tôi','Phiếu nào quá hạn SLA?','Tình hình lãi lỗ tháng này','Khách nào nợ quá 30 ngày?','KPI tháng này ai thấp nhất?','Lịch công tác tuần này'],
  engineer:['Việc của tôi hôm nay','Phiếu tôi đang sửa','Tra bảo hành serial …','Tồn kho IGBT còn bao nhiêu?','Lịch công tác của tôi'], warehouse:['Yêu cầu xuất kho đang chờ','Hàng dưới định mức','Tồn kho AC relay','Việc của tôi hôm nay'],
  accountant:['Máy nào chờ thu tiền để giao?','Công nợ quá hạn','Phiếu đã giao chưa xuất hóa đơn','Lãi lỗ tháng này','Soạn tin nhắc nợ cho khách …'] };
function aiEnsure(){ if(AIX.el) return AIX.el; const el=document.createElement('div'); el.id='aiPanel'; el.className='ai-panel'; el.setAttribute('role','dialog'); el.setAttribute('aria-label',t('ai_title'));
  el.innerHTML=`<div class="ai-h"><div class="ai-t">${ic('star',18)}<div><b>${t('ai_title')}</b><small>${t('ai_sub')}</small></div></div><label class="ai-deep"><input type="checkbox" id="aiDeep"> ${t('ai_deep')}</label><button class="icon-btn" id="aiNew" title="${t('ai_new')}" aria-label="${t('ai_new')}">${ic('refresh',16)}</button><button class="icon-btn" id="aiClose" aria-label="${t('close')}">${ic('x',18)}</button></div>
    <div class="ai-body" id="aiBody"></div><div class="ai-chips" id="aiChips"></div>
    <form class="ai-in" id="aiForm"><textarea id="aiQ" rows="1" placeholder="${t('ai_ph')}"></textarea><button type="submit" class="btn primary" id="aiSend">${ic('send',16)}</button><button type="button" class="btn" id="aiStop" hidden>${t('ai_stop')}</button></form>`;
  document.body.appendChild(el); AIX.el=el;
  el.querySelector('#aiClose').onclick=()=>aiToggle(false); el.querySelector('#aiNew').onclick=()=>{ AIX.turns=[]; aiRenderAll(); };
  el.querySelector('#aiDeep').onchange=e=>{ AIX.deep=e.target.checked; };
  el.querySelector('#aiStop').onclick=()=>{ if(AIX.ctl) AIX.ctl.abort(); };
  const q=el.querySelector('#aiQ'); q.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); aiAsk(q.value); } }); q.addEventListener('input',()=>{ q.style.height='auto'; q.style.height=Math.min(140,q.scrollHeight)+'px'; });
  el.querySelector('#aiForm').onsubmit=e=>{ e.preventDefault(); aiAsk(q.value); };
  aiRenderAll(); return el; }
function aiChipsHtml(){ const u=me(); return (AI_CHIPS[u&&u.role]||AI_CHIPS.manager).map(c=>`<button class="ai-chip" data-q="${esc(c)}">${esc(c)}</button>`).join(''); }
function aiRenderAll(){ const el=AIX.el; if(!el) return; const body=el.querySelector('#aiBody');
  body.innerHTML=AIX.turns.length?AIX.turns.map(m=>m.role==='user'?`<div class="ai-msg me">${esc(m.content)}</div>`:`<div class="ai-msg bot">${m.quick||''}${m.html||mdLite(m.content||'')}</div>`).join(''):`<div class="ai-empty">${ic('star',28)}<p>${t('ai_hello',{n:esc((me()||{}).name||'')})}</p><small>${t('ai_hello2')}</small></div>`;
  el.querySelector('#aiChips').innerHTML=AIX.turns.length?'':aiChipsHtml(); el.querySelectorAll('.ai-chip').forEach(b=>b.onclick=()=>{ const v=b.dataset.q; if(v.includes('…')){ const q=el.querySelector('#aiQ'); q.value=v.replace('…','').trim()+' '; q.focus(); } else aiAsk(v); });
  body.scrollTop=body.scrollHeight; }
function aiToggle(on){ const el=aiEnsure(); AIX.open=on==null?!AIX.open:on; el.classList.toggle('on',AIX.open); document.body.classList.toggle('ai-open',AIX.open); if(AIX.open) setTimeout(()=>el.querySelector('#aiQ').focus(),50); }
A.waToggle = () => aiToggle();
A.aiOpen = () => aiToggle(true);
function quickHtml(q){ const r=aiSearch(q,6); if(!r.length) return ''; return `<div class="ai-quick"><small>${t('ai_quick')}</small>${r.map(o=>`<button class="ai-card" data-a="aiGo" data-k="${aiGo(o)}"><b>${esc(o.title)}</b><span>${esc(o.sub||'')}</span></button>`).join('')}</div>`; }
async function aiAsk(text){ text=String(text||'').trim(); if(!text||AIX.busy) return; const el=aiEnsure(); const q=el.querySelector('#aiQ'); q.value=''; q.style.height='auto';
  AIX.turns.push({role:'user',content:text}); const looksCode=/^[A-Za-z]{1,3}\d{4,}|^\d{6,}|^[A-Z0-9-]{6,}$/i.test(text)&&text.split(/\s+/).length<=2;
  const bot={role:'assistant',content:'',quick:quickHtml(text),html:`<span class="ai-think">${t('ai_thinking')}</span>`}; AIX.turns.push(bot); aiRenderAll();
  const sample=await aiSample(); if(!sample){ bot.html=bot.quick?`<p class="muted">${t('ai_offline_found')}</p>`:`<p class="muted">${t('ai_offline')}</p>`; aiRenderAll(); return; }
  if(looksCode&&bot.quick&&aiSearch(text,6).length===1&&!AIX.deep){ /* mã chính xác: vẫn nhờ AI tóm tắt ngắn */ }
  AIX.busy=true; AIX.ctl=new AbortController(); el.querySelector('#aiStop').hidden=false; el.querySelector('#aiSend').hidden=true;
  const prog=[]; const tools=AI_TOOLS.map(tl=>Object.assign({},tl,{execute:async(inp,ctx)=>{ prog.push(t('ai_tool_'+tl.name)||tl.name); bot.html=`<span class="ai-think">${prog.map(p=>'🔎 '+esc(p)).join('<br>')}</span>`; aiRenderAll(); return tl.execute(inp,ctx); }}));
  const hist=AIX.turns.slice(0,-1).filter(m=>m.content).slice(-10).map(m=>({role:m.role,content:m.content}));
  const input=[{role:'user',content:aiRules()},{role:'assistant',content:'Đã rõ. Tôi sẵn sàng tra cứu và hỗ trợ.'},...hist];
  try{ const r=await sample(input,{tools,cache:false,signal:AIX.ctl.signal,modelTier:AIX.deep?'complex':'quick',onText:({text})=>{ bot.content=text; bot.html=null; aiRenderAll(); }}); bot.content=r.text; bot.html=null; if(r.truncated) bot.content+='\n\n'+t('ai_trunc'); }
  catch(e){ bot.content=e&&e.text||''; bot.html=(bot.content?mdLite(bot.content):'')+`<p class="muted">${t('ai_err_'+(e&&e.code))!=='ai_err_'+(e&&e.code)?t('ai_err_'+e.code):t('ai_err')}</p>`; }
  finally{ AIX.busy=false; AIX.ctl=null; el.querySelector('#aiStop').hidden=true; el.querySelector('#aiSend').hidden=false; aiRenderAll(); try{ audit('ai_ask','',text.slice(0,120)); save(); }catch(e){} } }
document.addEventListener('keydown',ev=>{ if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='k'){ ev.preventDefault(); aiToggle(true); } if(ev.key==='Escape'&&AIX.open) aiToggle(false); });
Object.assign(DICT.vi,{ ai_title:'Trợ lý AI SGE', ai_sub:'Tra cứu & xử lý nhanh bằng tiếng Việt', ai_deep:'Phân tích sâu', ai_new:'Cuộc trò chuyện mới', ai_ph:'Hỏi bất cứ điều gì: mã phiếu, serial, khách, tồn kho, công nợ…', ai_stop:'Dừng', ai_btn:'Hỏi AI',
  ai_hello:'Chào {n}, tôi có thể giúp gì?', ai_hello2:'Gõ mã phiếu, serial, tên khách hoặc hỏi như nói chuyện. Tôi tự tra dữ liệu thật trong hệ thống. Phím tắt: Ctrl + K.', ai_quick:'Kết quả khớp ngay', ai_thinking:'Đang suy nghĩ…', ai_trunc:'(Câu trả lời bị cắt ngắn — hãy hỏi hẹp hơn.)',
  ai_offline:'AI chỉ hoạt động trên link online của claude.ai. Bản chạy trên máy chỉ tìm kiếm nhanh được.', ai_offline_found:'Trên đây là kết quả tìm nhanh. (AI chỉ hoạt động trên link online.)', ai_err:'Không gọi được AI lúc này, thử lại sau.', ai_err_not_granted:'Bạn chưa cho phép trang dùng Claude. Mở lại và bấm Cho phép để dùng trợ lý.', ai_err_rate_limited:'Hỏi quá nhanh, đợi một chút rồi thử lại.', ai_err_cancelled:'Đã dừng.',
  ai_tool_tim_kiem:'Tìm trong hệ thống', ai_tool_chi_tiet_phieu:'Xem chi tiết phiếu', ai_tool_danh_sach_phieu:'Lọc danh sách phiếu', ai_tool_viec_cua_toi:'Xem việc cần làm', ai_tool_kho:'Tra tồn kho', ai_tool_khach_hang:'Xem hồ sơ khách', ai_tool_tai_chinh:'Tính số liệu tài chính', ai_tool_kpi:'Tính KPI', ai_tool_cong_trinh:'Xem lịch công trình', ai_tool_bao_hanh_serial:'Kiểm tra bảo hành serial', ai_tool_bang_gia:'Tra bảng giá', au_ai_ask:'Hỏi trợ lý AI' });
Object.assign(DICT.en,{ ai_title:'SGE AI assistant', ai_sub:'Fast lookup & help', ai_deep:'Deep analysis', ai_new:'New chat', ai_ph:'Ask anything: job no., serial, customer, stock, receivables…', ai_stop:'Stop', ai_btn:'Ask AI',
  ai_hello:'Hi {n}, how can I help?', ai_hello2:'Type a job number, serial, customer, or ask naturally. I look up live data. Shortcut: Ctrl + K.', ai_quick:'Instant matches', ai_thinking:'Thinking…', ai_trunc:'(Answer was cut short — ask something narrower.)',
  ai_offline:'AI works only on the claude.ai online link. The local copy supports quick search only.', ai_offline_found:'Above are quick matches. (AI works only online.)', ai_err:'AI unavailable right now, try again later.', ai_err_not_granted:'Allow the page to use Claude to enable the assistant.', ai_err_rate_limited:'Too many requests, wait a moment.', ai_err_cancelled:'Stopped.',
  ai_tool_tim_kiem:'Searching', ai_tool_chi_tiet_phieu:'Reading job', ai_tool_danh_sach_phieu:'Filtering jobs', ai_tool_viec_cua_toi:'Reading to-dos', ai_tool_kho:'Checking stock', ai_tool_khach_hang:'Reading customer', ai_tool_tai_chinh:'Computing finance', ai_tool_kpi:'Computing KPI', ai_tool_cong_trinh:'Reading field schedule', ai_tool_bao_hanh_serial:'Checking warranty', ai_tool_bang_gia:'Reading price list', au_ai_ask:'Asked AI' });

/* ===================================================================
   QUỸ TIỀN MẶT
   Thu: tiền sửa chữa / bán board không VAT (tiền mặt), rút ngân hàng về quỹ, thu khác
   Chi: hóa đơn nhân viên mua không hóa đơn (phiếu chi trả bằng tiền mặt), chi khác, nộp ngân hàng, tạm ứng
   Sổ quỹ = số dư đầu + mọi khoản thu/chi tiền mặt trong hệ thống + phiếu thu/chi lập tại đây; kiểm quỹ định kỳ
   =================================================================== */
const FUND_LIMIT=5000000;
const CV_IN=['retail','repair_cash','withdraw','refund_adv','other_in'];
const CV_OUT_NONEXP=['deposit_bank','advance'];
const DENOMS=[500000,200000,100000,50000,20000,10000,5000,2000,1000];
function fundInit(){ if(!DB.cashfund){ const d=new Date(); d.setMonth(d.getMonth()-2); d.setDate(1); d.setHours(0,0,0,0); DB.cashfund={opening:15000000,openingAt:d.getTime(),by:'u_acc'}; } DB.cashv=DB.cashv||[]; DB.cashCounts=DB.cashCounts||[]; }
const canFund=()=>can('pay_record')||can('fin_cash')||isBossRole(me());
/* phiếu thu/chi lập tay đưa vào sổ quỹ chung */
const _cashLedgerF=cashLedger; cashLedger=function(u=me()){ const rows=_cashLedgerF(u); if(isExternal(u)) return rows; fundInit();
  DB.cashv.filter(v=>v.status==='done'&&!v.expId).forEach(v=>{ rows.push({at:v.at,dir:v.type,amount:v.amount,method:'cash',no:v.no,kind:'cv',note:v.note||t('cvc_'+v.cat),by:v.by,jump:null,party:v.party||'',cv:v.id});
    if(v.cat==='deposit_bank') rows.push({at:v.at,dir:'in',amount:v.amount,method:'bank',no:v.no,kind:'cv',note:t('cvc_deposit_bank'),by:v.by,jump:null,party:'',cv:v.id});
    if(v.cat==='withdraw') rows.push({at:v.at,dir:'out',amount:v.amount,method:'bank',no:v.no,kind:'cv',note:t('cvc_withdraw'),by:v.by,jump:null,party:'',cv:v.id}); });
  return rows.sort((a,b)=>b.at-a.at); };
function fundRows(){ fundInit(); const o=DB.cashfund; return cashLedger(me()).filter(r=>r.method==='cash'&&r.at>=o.openingAt).sort((a,b)=>a.at-b.at); }
function fundBalance(at){ fundInit(); let b=DB.cashfund.opening; fundRows().forEach(r=>{ if(at==null||r.at<=at) b+=r.dir==='in'?r.amount:-r.amount; }); return b; }
/* ---- trang Quỹ tiền mặt ---- */
function viewFund(){ fundInit(); const f=perState('fund'); const r=perRange(f); const all=fundRows(); let bal=DB.cashfund.opening; const withBal=all.map(x=>{ bal+=x.dir==='in'?x.amount:-x.amount; return Object.assign({},x,{bal}); });
  const rows=withBal.filter(x=>x.at>=r.from&&x.at<r.to).reverse(); const open=fundBalance(r.from-1); const tin=rows.filter(x=>x.dir==='in').reduce((s,x)=>s+x.amount,0), tout=rows.filter(x=>x.dir==='out').reduce((s,x)=>s+x.amount,0);
  const pend=DB.cashv.filter(v=>v.status==='pending'); const lastCnt=DB.cashCounts[0]; const days=lastCnt?Math.floor((Date.now()-lastCnt.at)/DAYMS):null; const mg=canFund(); const boss=isBossRole(me())||can('ticket_approve');
  const kindLbl=x=>x.kind==='cv'?t('cvk_'+(x.dir==='in'?'in':'out')):x.kind==='exp'?t('fund_k_exp'):x.kind==='po'?t('fund_k_po'):t('fund_k_cust');
  return `<div style="padding:0 16px">${perBar('fund')}</div>
  <div class="stat-row task-stats" style="padding:0 16px"><div class="card stat fund-bal"><div class="l">${t('fund_balance')}</div><div class="v">${money(fundBalance())}</div><div class="d">${t('fund_as_of',{d:fmtDT(Date.now())})}</div></div>
    <div class="card stat"><div class="l">${t('fund_in')}</div><div class="v" style="color:var(--ok)">+${moneyS(tin)}</div><div class="d">${r.label}</div></div><div class="card stat"><div class="l">${t('fund_out')}</div><div class="v" style="color:var(--bad)">−${moneyS(tout)}</div><div class="d">${t('fund_open_p',{a:money(open)})}</div></div>
    <div class="card stat"><div class="l">${t('fund_last_count')}</div><div class="v" style="font-size:18px">${lastCnt?fmtD(lastCnt.at):'—'}</div><div class="d" style="${!lastCnt||days>7?'color:var(--warn)':''}">${lastCnt?(lastCnt.diff?t('fund_diff',{a:money(lastCnt.diff)}):t('fund_match')):t('fund_never')}</div></div></div>
  ${mg?`<div class="fund-acts" style="padding:0 16px 14px"><button class="btn primary" data-a="cvNew" data-t="in">${ic('download',15)} ${t('cv_new_in')}</button><button class="btn primary" data-a="cvNew" data-t="out">${ic('upload',15)} ${t('cv_new_out')}</button><button class="btn" data-a="rsNew">${ic('box',15)} ${t('rs_new')}</button><button class="btn" data-a="fcNew">${ic('check',15)} ${t('fc_new')}</button>${isBossRole(me())?`<button class="btn" data-a="fundOpenAsk">${t('fund_set_open')}</button>`:''}</div>`:''}
  ${pend.length?`<div class="card" style="margin:0 16px 14px;border-color:var(--warn)"><div class="card-h"><h3>${t('cv_pending')}</h3><span class="kst k-warn">${pend.length}</span></div><div class="card-b">${pend.map(v=>`<div class="dl-row"><div class="dl-l">${ic('upload',16)}<div><b>${v.no} · ${money(v.amount)}</b><small class="muted">${esc(t('cvc_'+v.cat))} · ${esc(v.note||'')} · ${esc(uname(v.by))}</small></div></div><div class="dl-a">${boss?`<button class="btn sm okb" data-a="cvApprove" data-id="${v.id}">${t('approve')}</button><button class="btn sm danger" data-a="cvReject" data-id="${v.id}">${t('reject')}</button>`:`<span class="hint">${t('cv_wait_mgr')}</span>`}</div></div>`).join('')}</div></div>`:''}
  <div class="card" style="margin:0 16px 16px"><div class="card-h"><h3>${t('fund_book')}</h3><span class="hint">${t('fund_book_h')}</span></div>
  ${rows.length?`<div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('doc_date')}</th><th>${t('rq_no')}</th><th>${t('fund_kind')}</th><th>${t('fund_content')}</th><th class="r">${t('fund_in_c')}</th><th class="r">${t('fund_out_c')}</th><th class="r">${t('fund_bal_c')}</th><th>${t('pf_docs')}</th><th></th></tr></thead><tbody>
    ${rows.map(x=>{ const v=x.cv&&DB.cashv.find(z=>z.id===x.cv); const e=x.kind==='exp'&&DB.expenses.find(z=>z.no===x.no); const imgs=(v&&v.images)||(e&&e.images)||[]; const printKey=v?`cv|${v.id}|cv`:e?`ce|${e.id}|cv`:null;
      return `<tr><td data-l="${t('doc_date')}" class="num nowrap">${fmtDT(x.at)}</td><td data-l="${t('rq_no')}" class="mono">${x.jump?`<button class="link-btn mono" data-a="nav" data-k="${x.jump}">${esc(x.no)}</button>`:esc((e&&e.voucherNo)||x.no)}</td><td data-l="${t('fund_kind')}">${kindLbl(x)}</td><td data-l="${t('fund_content')}">${esc(x.note||'')}${x.party?`<br><small class="muted">${esc(x.party)}</small>`:''}</td>
        <td data-l="${t('fund_in_c')}" class="r num" style="color:var(--ok)">${x.dir==='in'?money(x.amount):''}</td><td data-l="${t('fund_out_c')}" class="r num" style="color:var(--bad)">${x.dir==='out'?money(x.amount):''}</td><td data-l="${t('fund_bal_c')}" class="r num"><b>${money(x.bal)}</b></td><td data-l="${t('pf_docs')}">${docsCell(imgs)}</td><td class="nowrap">${printKey?`<button class="icon-btn" data-a="nav" data-k="ed:${printKey}" title="${t('cv_print')}">${ic('print',15)}</button>`:''}</td></tr>`; }).join('')}
    </tbody></table></div>`:`<div class="empty">${t('fund_empty')}</div>`}</div>
  ${DB.cashCounts.length?`<div class="card" style="margin:0 16px 16px"><div class="card-h"><h3>${t('fc_hist')}</h3></div><div class="table-wrap"><table class="tbl compact cards"><thead><tr><th>${t('doc_date')}</th><th>${t('cnt_by')}</th><th class="r">${t('fc_book')}</th><th class="r">${t('fc_real')}</th><th class="r">${t('cnt_diff')}</th><th>${t('cnt_reason')}</th></tr></thead><tbody>${DB.cashCounts.slice(0,10).map(c=>`<tr><td data-l="${t('doc_date')}" class="num">${fmtDT(c.at)}</td><td data-l="${t('cnt_by')}">${esc(uname(c.by))}</td><td data-l="${t('fc_book')}" class="r num">${money(c.book)}</td><td data-l="${t('fc_real')}" class="r num">${money(c.real)}</td><td data-l="${t('cnt_diff')}" class="r num" style="color:${c.diff<0?'var(--bad)':c.diff>0?'var(--ok)':'inherit'};font-weight:600">${c.diff>0?'+':''}${money(c.diff)}</td><td data-l="${t('cnt_reason')}">${esc(c.reason||'')}</td></tr>`).join('')}</tbody></table></div></div>`:''}`; }
/* ---- lập phiếu thu / chi ---- */
A.cvNew = el => { fundInit(); const type=el.dataset.t; openModal({type:'cv',f:{type,cat:type==='in'?'other_in':'parts',amount:'',party:'',note:'',date:toISODate(Date.now()),files:[],docType:'none',ticket:''},err:{}}); };
MODALS.cv = m => { const f=m.f,E=m.err||{}; const isIn=f.type==='in'; const cats=isIn?CV_IN.filter(c=>c!=='retail'):EXP_CATS.filter(c=>!['rma','outsource'].includes(c)).concat(CV_OUT_NONEXP); const bal=fundBalance();
  return { title:t(isIn?'cv_new_in':'cv_new_out'), body:`${isIn?'':`<div class="tk-al ${bal<(Number(f.amount)||0)?'bad':'warn'}" style="margin-bottom:12px">${ic('box',15)}<span>${t('fund_now',{a:money(bal)})}</span></div>`}<div class="form-grid">
    <div class="field"><label class="req" for="cv-c">${t('cv_cat')}</label><select class="select" id="cv-c" data-bind="modal.f.cat" data-re>${cats.map(c=>`<option value="${c}" ${f.cat===c?'selected':''}>${CV_IN.includes(c)||CV_OUT_NONEXP.includes(c)?t('cvc_'+c):t('ec_'+c)}</option>`).join('')}</select></div>
    <div class="field"><label class="req" for="cv-a">${t('amount')}</label><input class="input num ${E.amount?'err':''}" type="number" min="0" id="cv-a" data-bind="modal.f.amount" data-re value="${esc(f.amount)}">${Number(f.amount)>0?`<div class="hint">${viWords(f.amount)}</div>`:''}${E.amount?`<div class="err-text">${E.amount}</div>`:''}</div>
    <div class="field"><label for="cv-p">${t(isIn?'cv_payer':'cv_receiver')}</label><input class="input" id="cv-p" data-bind="modal.f.party" value="${esc(f.party)}" placeholder="${t(isIn?'cv_payer_ph':'cv_receiver_ph')}"></div>
    <div class="field"><label for="cv-d">${t('doc_date')}</label><input class="input" type="date" id="cv-d" data-bind="modal.f.date" value="${f.date}"></div>
    <div class="field full"><label class="req" for="cv-n">${t('cv_reason')}</label><input class="input ${E.note?'err':''}" id="cv-n" data-bind="modal.f.note" value="${esc(f.note)}" placeholder="${t(isIn?'cv_reason_in_ph':'cv_reason_out_ph')}"></div></div>
    <div class="field full" style="margin-top:12px"><span class="lbl ${isIn?'':'req'}">${t('pf_docs')}</span>${fileBox(f,E,'cvFiles')}<div class="hint">${t(isIn?'cv_files_in':'cv_files_out')}</div></div>
    ${!isIn&&Number(f.amount)>FUND_LIMIT&&!(isBossRole(me())||can('ticket_approve'))?`<p class="hint" style="color:var(--warn)">${t('cv_need_mgr',{a:money(FUND_LIMIT)})}</p>`:''}`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="cvSave">${t('save')}</button>` }; };
A.cvFiles = input => readFiles(input,'image',arr=>{ const m=S.ui.modal; if(!m||!m.f) return; arr.forEach(a=>{ if(!(a.mime||'').startsWith('image/')) a.kind='file'; }); m.f.files=(m.f.files||[]).concat(arr); if(m.err) delete m.err.files; rerender(); });
function cvMake(o){ fundInit(); const v=Object.assign({id:'cv'+Date.now().toString(36)+Math.random().toString(36).slice(2,4),no:erpNo(o.type==='in'?'PT':'PC'),at:Date.now(),by:S.userId,status:'done',images:[]},o); DB.cashv.unshift(v); return v; }
function cvPost(v){ /* phiếu chi thuộc nhóm chi phí → ghi luôn 1 phiếu chi phí đã chi bằng tiền mặt để vào báo cáo lãi lỗ */
  if(v.type==='out'&&!CV_OUT_NONEXP.includes(v.cat)&&!v.expId){ const e={ id:'ex'+Date.now().toString(36)+Math.random().toString(36).slice(2,4), no:erpNo('CP'), at:v.at, cat:v.cat, amount:v.amount, desc:{vi:v.note,en:v.note}, ticketId:null, sn:'', svcId:null, by:v.by, status:'paid', approvedBy:v.approvedBy||S.userId, approvedAt:Date.now(), paidAt:v.at, method:'cash', images:v.images, payImages:v.images, paidBy:v.approvedBy||v.by, docType:v.docType||'none', voucherId:v.id, voucherNo:v.no }; DB.expenses.unshift(e); v.expId=e.id; } }
A.cvSave = () => { const m=S.ui.modal,f=m.f,E={}; const a=Math.round(Number(f.amount)||0); if(!(a>0)) E.amount=t('e_amount'); if(!String(f.note||'').trim()) E.note=t('e_required'); if(f.type==='out'&&!f.files.length) E.files=t('pf_need_doc');
  if(f.type==='out'&&a>fundBalance()) E.amount=t('fund_short',{a:money(fundBalance())}); m.err=E; if(Object.keys(E).length){ rerender(); return; }
  const at=f.date?new Date(f.date+'T'+new Date().toTimeString().slice(0,8)).getTime():Date.now(); const needMgr=f.type==='out'&&a>FUND_LIMIT&&!(isBossRole(me())||can('ticket_approve'));
  const v=cvMake({type:f.type,cat:f.cat,amount:a,party:f.party.trim(),note:f.note.trim(),at,images:f.files.slice(),status:needMgr?'pending':'done'}); if(!needMgr) cvPost(v); else notify({toRole:'manager',key:'n_cv_pending',vars:{no:v.no,a:money(a)}});
  audit('cv_'+f.type,v.no,`${money(a)} · ${f.note.trim()}`); S.ui.modal=null; save(); rerender(); toast(t(needMgr?'toast_cv_pending':'toast_cv_ok',{no:v.no}),'ok'); };
A.cvApprove = el => { const v=DB.cashv.find(z=>z.id===el.dataset.id); if(v.amount>fundBalance()){ toast(t('fund_short',{a:money(fundBalance())}),'bad'); return; } v.status='done'; v.approvedBy=S.userId; v.at=Date.now(); cvPost(v); audit('cv_approve',v.no,money(v.amount)); notify({toUser:v.by,key:'n_cv_ok',vars:{no:v.no}}); save(); rerender(); };
A.cvReject = el => { const v=DB.cashv.find(z=>z.id===el.dataset.id); v.status='void'; audit('cv_reject',v.no,money(v.amount)); notify({toUser:v.by,key:'n_cv_no',vars:{no:v.no}}); save(); rerender(); };
/* ---- bán board / linh kiện lẻ không VAT, thu tiền mặt ---- */
A.rsNew = () => openModal({type:'rs',f:{lines:[{pn:(DB.stock[0]||{}).pn,qty:1,price:(DB.stock[0]||{}).price||0}],party:'',phone:'',note:'',files:[]},err:{}});
MODALS.rs = m => { const f=m.f,E=m.err||{}; const tot=f.lines.reduce((s,l)=>s+(Number(l.qty)||0)*(Number(l.price)||0),0);
  return { title:t('rs_new'), body:`<p class="muted" style="margin:0 0 10px">${t('rs_hint')}</p><div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl compact"><thead><tr><th>${t('item_name')}</th><th class="r">${t('qty')}</th><th class="r">${t('unit_price')}</th><th class="r">${t('amount')}</th><th></th></tr></thead><tbody>${f.lines.map((l,i)=>{ const s=stockBy(l.pn)||{}; return `<tr><td><select class="select sm" data-bind="modal.f.lines.${i}.pn" data-chg="rsPick" data-i="${i}">${DB.stock.map(z=>`<option value="${z.pn}" ${l.pn===z.pn?'selected':''}>${z.pn} · ${esc(z.name)} (${z.qty})</option>`).join('')}</select></td><td class="r"><input class="input sm num" style="width:70px" type="number" min="1" data-bind="modal.f.lines.${i}.qty" data-num data-re value="${l.qty}"></td><td class="r"><input class="input sm num" style="width:120px" type="number" data-bind="modal.f.lines.${i}.price" data-num data-re value="${l.price}"></td><td class="r num" style="${(s.qty||0)<l.qty?'color:var(--bad)':''}">${money((l.qty||0)*(l.price||0))}</td><td>${f.lines.length>1?`<button class="icon-btn" data-a="rsDel" data-i="${i}">${ic('trash',14)}</button>`:''}</td></tr>`; }).join('')}<tr><td colspan="3" class="r"><b>${t('grand_total')}</b></td><td class="r num"><b>${money(tot)}</b></td><td></td></tr></tbody></table></div>
    <button class="btn sm soft" style="margin-top:8px" data-a="rsAdd">${ic('plus',13)} ${t('rs_add')}</button>${E.lines?`<div class="err-text">${E.lines}</div>`:''}
    <div class="form-grid" style="margin-top:12px"><div class="field"><label for="rs-p">${t('rs_buyer')}</label><input class="input" id="rs-p" data-bind="modal.f.party" value="${esc(f.party)}" placeholder="${t('rs_buyer_ph')}"></div><div class="field"><label for="rs-ph">${t('phone')}</label><input class="input" id="rs-ph" data-bind="modal.f.phone" value="${esc(f.phone)}"></div><div class="field full"><label for="rs-n">${t('note_l')}</label><input class="input" id="rs-n" data-bind="modal.f.note" value="${esc(f.note)}"></div></div>
    <div class="field full" style="margin-top:12px"><span class="lbl">${t('pf_docs')}</span>${fileBox(f,E,'cvFiles')}</div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="rsSave">${ic('check',15)} ${t('rs_save',{a:money(tot)})}</button>` }; };
A.rsPick = el => { const m=S.ui.modal; const l=m.f.lines[+el.dataset.i]; l.pn=el.value; const s=stockBy(l.pn); if(s) l.price=s.price||0; rerender(); };
A.rsAdd = () => { S.ui.modal.f.lines.push({pn:(DB.stock[0]||{}).pn,qty:1,price:(DB.stock[0]||{}).price||0}); rerender(); };
A.rsDel = el => { S.ui.modal.f.lines.splice(+el.dataset.i,1); rerender(); };
A.rsSave = () => { const m=S.ui.modal,f=m.f; const lines=f.lines.filter(l=>l.pn&&Number(l.qty)>0); const short=lines.filter(l=>{ const s=stockBy(l.pn); return !s||s.qty<l.qty; });
  if(!lines.length){ m.err={lines:t('e_required')}; rerender(); return; } if(short.length){ m.err={lines:t('insufficient_stock',{p:short.map(l=>l.pn).join(', ')})}; rerender(); return; }
  const tot=lines.reduce((s,l)=>s+l.qty*(Number(l.price)||0),0); const v=cvMake({type:'in',cat:'retail',amount:tot,party:[f.party,f.phone].filter(Boolean).join(' · '),note:t('rs_note',{n:lines.map(l=>`${l.pn} x${l.qty}`).join(', ')})+(f.note?' · '+f.note:''),images:f.files.slice(),items:lines.map(l=>({pn:l.pn,qty:Number(l.qty),price:Number(l.price)||0,costAt:(stockBy(l.pn)||{}).cost||0}))});
  lines.forEach(l=>{ const s=stockBy(l.pn); s.qty-=Number(l.qty); logMove('out',l.pn,Number(l.qty),{kind:'cv',id:v.id},t('rs_mv',{no:v.no})); });
  audit('cv_retail',v.no,money(tot)); S.ui.modal=null; save(); rerender(); toast(t('toast_rs',{no:v.no,a:money(tot)}),'ok'); };
/* ---- trả phiếu chi phí: chọn chi bằng tiền mặt từ quỹ hay chuyển khoản ---- */
const _exSetF=A.exSet; A.exSet=el=>{ const e=DB.expenses.find(x=>x.id===el.dataset.id); if(el.dataset.s==='paid'&&e&&!S._exPayOK){ openModal({type:'exPay',id:e.id,f:{method:e.docType==='vat'?'bank':'cash'}}); return; } return _exSetF(el); };
MODALS.exPay = m => { const e=DB.expenses.find(x=>x.id===m.id); const bal=fundBalance(); const f=m.f;
  return { title:`${t('exp_pay_t')} · <span class="mono">${e.no}</span>`, body:`<p style="margin:0 0 10px"><b>${money(e.amount)}</b> · ${esc(L(e.desc))} · ${esc(uname(e.by))}</p><div class="field"><span class="lbl">${t('pay_method')}</span><div class="kind-pick" style="grid-template-columns:1fr 1fr"><button class="kp ${f.method==='cash'?'on':''}" data-a="exPayM" data-v="cash"><b>${t('exp_pay_cash')}</b><small>${t('fund_now',{a:money(bal)})}</small></button><button class="kp ${f.method==='bank'?'on':''}" data-a="exPayM" data-v="bank"><b>${t('exp_pay_bank')}</b><small>${t('exp_pay_bank_h')}</small></button></div></div>${f.method==='cash'&&bal<e.amount?`<div class="tk-al bad" style="margin-top:10px">${ic('alert',15)}<span>${t('fund_short',{a:money(bal)})}</span></div>`:''}`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="exPayOk" ${f.method==='cash'&&bal<e.amount?'disabled':''}>${t('exp_pay_ok')}</button>` }; };
A.exPayM = el => { S.ui.modal.f.method=el.dataset.v; rerender(); };
A.exPayOk = () => { const m=S.ui.modal; const e=DB.expenses.find(x=>x.id===m.id); e.method=m.f.method; S.ui.modal=null; S._exPayOK=1; try{ _exSetF({dataset:{id:e.id,s:'paid'}}); }finally{ S._exPayOK=0; } audit('exp_paid',e.no,`${money(e.amount)} · ${t('pm_'+e.method)}`); save(); rerender(); };
/* ---- kiểm quỹ ---- */
A.fcNew = () => openModal({type:'fc',f:{cnt:{},reason:''},err:{}});
MODALS.fc = m => { const f=m.f; const real=DENOMS.reduce((s,d)=>s+d*(Number(f.cnt[d])||0),0); const book=fundBalance(); const diff=real-book;
  return { title:t('fc_new'), body:`<p class="muted" style="margin:0 0 10px">${t('fc_hint')}</p><div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl compact"><thead><tr><th>${t('fc_denom')}</th><th class="r">${t('fc_pieces')}</th><th class="r">${t('amount')}</th></tr></thead><tbody>${DENOMS.map(d=>`<tr><td class="num">${fmtNum(d)} đ</td><td class="r"><input class="input sm num" style="width:90px" type="number" min="0" data-bind="modal.f.cnt.${d}" data-num data-re value="${f.cnt[d]||''}" inputmode="numeric"></td><td class="r num">${money(d*(Number(f.cnt[d])||0))}</td></tr>`).join('')}</tbody></table></div>
    <div class="cost-grid" style="margin-top:12px"><div><span>${t('fc_book')}</span><b>${money(book)}</b></div><div><span>${t('fc_real')}</span><b>${money(real)}</b></div><div class="${diff<0?'neg':diff>0?'pos':''}"><span>${t('cnt_diff')}</span><b>${diff>0?'+':''}${money(diff)}</b></div></div>
    ${diff?`<div class="field" style="margin-top:12px"><label class="req" for="fc-r">${t('fc_reason')}</label><input class="input" id="fc-r" data-bind="modal.f.reason" value="${esc(f.reason)}" placeholder="${t('fc_reason_ph')}"></div>`:''}`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="fcSave">${t(diff?'fc_save_adj':'fc_save')}</button>` }; };
A.fcSave = () => { const m=S.ui.modal,f=m.f; const real=DENOMS.reduce((s,d)=>s+d*(Number(f.cnt[d])||0),0); const book=fundBalance(); const diff=real-book; if(diff&&!String(f.reason||'').trim()){ toast(t('fc_need_reason'),'bad'); return; }
  const c={at:Date.now(),by:S.userId,book,real,diff,reason:f.reason||'',cnt:Object.assign({},f.cnt)}; DB.cashCounts.unshift(c);
  if(diff){ const v=cvMake({type:diff>0?'in':'out',cat:diff>0?'other_in':'deposit_bank',amount:Math.abs(diff),note:t('fc_adj_note',{r:f.reason}),status:'done',adj:1}); v.cat=diff>0?'adj_in':'adj_out'; c.voucher=v.no; }
  audit('fund_count',c.voucher||'',`${money(real)} / ${money(book)}`); S.ui.modal=null; save(); rerender(); toast(t(diff?'toast_fc_adj':'toast_fc_ok'),'ok'); };
CV_OUT_NONEXP.push('adj_out');
A.fundOpenAsk = () => { fundInit(); openModal({type:'fundOpen',f:{amount:DB.cashfund.opening,date:toISODate(DB.cashfund.openingAt)}}); };
MODALS.fundOpen = m => ({ title:t('fund_set_open'), body:`<div class="form-grid"><div class="field"><label for="fo-a">${t('fund_open_amt')}</label><input class="input num" type="number" id="fo-a" data-bind="modal.f.amount" value="${m.f.amount}"></div><div class="field"><label for="fo-d">${t('fund_open_date')}</label><input class="input" type="date" id="fo-d" data-bind="modal.f.date" value="${m.f.date}"></div></div><p class="hint">${t('fund_open_hint')}</p>`, foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="fundOpenSave">${t('save')}</button>` });
A.fundOpenSave = () => { const f=S.ui.modal.f; DB.cashfund={opening:Math.round(Number(f.amount)||0),openingAt:new Date(f.date+'T00:00:00').getTime(),by:S.userId}; audit('fund_open','',money(DB.cashfund.opening)); S.ui.modal=null; save(); rerender(); };
/* ---- in phiếu thu / phiếu chi (mẫu 01-TT / 02-TT) ---- */
function cvDoc(o){ const isIn=o.type==='in'; const d=new Date(o.at); return `<div class="a4 sgedoc"><table class="lh2"><tr><td style="width:55%"><b>Đơn vị: ${SGE_CO.name}</b><br>Địa chỉ: ${SGE_CO.addr}</td><td class="c"><b>Mẫu số ${isIn?'01':'02'} - TT</b><br><i>(Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/08/2016 của Bộ Tài chính)</i></td></tr></table>
  <h2 class="ttl" style="margin-top:18px">${isIn?'PHIẾU THU':'PHIẾU CHI'}</h2><p class="c" style="margin:0"><i>Ngày ${String(d.getDate()).padStart(2,'0')} tháng ${String(d.getMonth()+1).padStart(2,'0')} năm ${d.getFullYear()}</i></p><p class="r" style="margin:0">Quyển số: ……… &nbsp; Số: <b>${esc(o.no)}</b><br>Nợ: ……… &nbsp; Có: ………</p>
  <table class="info" style="margin-top:10px"><tr><td style="width:30%">Họ và tên ${isIn?'người nộp tiền':'người nhận tiền'}</td><td>: <b>${esc(o.party||'…………………………………')}</b></td></tr><tr><td>Địa chỉ</td><td>: ……………………………………………</td></tr><tr><td>Lý do ${isIn?'nộp':'chi'}</td><td>: ${esc(o.note||'')}</td></tr><tr><td>Số tiền</td><td>: <b>${vnd(o.amount)} đồng</b></td></tr><tr><td>Viết bằng chữ</td><td>: <i>${viWords(o.amount)}</i></td></tr><tr><td>Kèm theo</td><td>: ${(o.images||[]).length||'……'} chứng từ gốc</td></tr></table>
  <table class="sign" style="margin-top:24px;table-layout:fixed;width:100%"><tr>${['Giám đốc','Kế toán trưởng',isIn?'Người nộp tiền':'Người nhận tiền','Người lập phiếu','Thủ quỹ'].map(s=>`<td style="width:20%"><b>${s}</b><br><i>(Ký, họ tên)</i></td>`).join('')}</tr><tr>${'<td class="s"></td>'.repeat(5)}</tr><tr><td><b>${SGE_CO.director}</b></td><td></td><td></td><td><b>${esc(String(uname(o.by)||'').toUpperCase())}</b></td><td></td></tr></table>
  <p style="margin-top:14px">Đã ${isIn?'nhận':'chi'} đủ số tiền (viết bằng chữ): ………………………………………………………………</p></div>`; }
const _docSourceCV=docSource; docSource=function(key){ const {type,id}=docHost(key);
  if(type==='cv'){ const v=(DB.cashv||[]).find(z=>z.id===id); if(!v) return null; return {type,id,kind:'cv',host:v,store:v.edit||null,setStore:x=>{ v.edit=x; },title:`${t(v.type==='in'?'cv_doc_in':'cv_doc_out')} ${v.no}`,gen:()=>cvDoc(v),sig:()=>String(v.amount),back:'finance',fields:[],file:`${v.type==='in'?'Phieu_thu':'Phieu_chi'}_${v.no}`}; }
  if(type==='ce'){ const e=(DB.expenses||[]).find(z=>z.id===id); if(!e) return null; const o={type:'out',no:e.voucherNo||e.no,at:e.paidAt||e.at,party:uname(e.by),note:L(e.desc),amount:e.amount,images:e.images,by:S.userId}; return {type,id,kind:'cv',host:e,store:e.cvEdit||null,setStore:x=>{ e.cvEdit=x; },title:`${t('cv_doc_out')} ${e.no}`,gen:()=>cvDoc(o),sig:()=>String(e.amount),back:'finance',fields:[],file:`Phieu_chi_${e.no}`}; }
  return _docSourceCV(key); };
/* ---- doanh thu bán lẻ / sửa lẻ thu tiền mặt vào báo cáo lãi lỗ ---- */
const _pnlDataF=pnlData; pnlData=function(r){ const p=_pnlDataF(r); fundInit(); const vs=DB.cashv.filter(v=>v.status==='done'&&['retail','repair_cash'].includes(v.cat)&&v.at>=r.from&&v.at<r.to);
  p.revCash=vs.reduce((s,v)=>s+v.amount,0); p.cogsCash=vs.reduce((s,v)=>s+(v.items||[]).reduce((a,i)=>a+i.costAt*i.qty,0),0); p.rev+=p.revCash; p.cogs+=p.cogsCash; p.gross+=p.revCash-p.cogsCash; p.net+=p.revCash-p.cogsCash; return p; };
const _viewPnlF=viewPnl; viewPnl=function(){ let h=_viewPnlF(); const p=pnlData(perRange(perState('pnl'))); const row=(l,v)=>`<tr class=""><td style="padding-left:28px">${l}</td><td class="r num">${money(v)}</td></tr>`;
  const ins=(lbl,html)=>{ const k=h.indexOf(`>${lbl}</td>`); if(k<0) return; const e=h.indexOf('</tr>',k); if(e<0) return; h=h.slice(0,e+5)+html+h.slice(e+5); };
  ins(t('pl_rev_so'),row(t('pl_rev_cash'),p.revCash||0)); ins(t('pl_cogs_so'),row(t('pl_cogs_cash'),p.cogsCash||0)); return h; };
/* ---- việc cần làm, AI ---- */
const _todayTasksF2=todayTasks; todayTasks=function(u){ const L0=_todayTasksF2(u); fundInit(); if(['manager','dev'].includes(u.role)){ const pv=DB.cashv.filter(v=>v.status==='pending'); if(pv.length) L0.unshift({key:'td_cv',n:pv.length,items:pv.map(v=>({fund:1,no:v.no,company:money(v.amount)+' · '+(v.note||'')}))}); }
  if(['accountant'].includes(u.role)){ const last=DB.cashCounts[0]; if(!last||Date.now()-last.at>7*DAYMS) L0.push({key:'td_fc',n:1,items:[{fund:1,no:t('fund_tab'),company:last?t('fund_last_count')+': '+fmtD(last.at):t('fund_never')}]}); } return L0; };
const _taskItemF2=taskItem; taskItem=function(x){ if(x.fund) return `<button class="mini-item" data-a="fundGo"><span class="t"><div><span class="mono">${esc(x.no)}</span> ${esc(x.company||'')}</div></span></button>`; return _taskItemF2(x); };
A.fundGo = () => { S.ui.fin=Object.assign(S.ui.fin||{},{tab:'fund'}); openTab('finance'); };
AI_TOOLS.push({name:'quy_tien_mat',description:'Quỹ tiền mặt: số dư hiện tại, thu/chi tiền mặt trong tháng, các phiếu thu/chi gần nhất, phiếu chờ duyệt, lần kiểm quỹ gần nhất.',execute:()=>{ if(!canFund()) throw new Error('Không có quyền xem quỹ'); const m0=new Date(); m0.setDate(1); m0.setHours(0,0,0,0); const rs=fundRows().filter(x=>x.at>=m0.getTime());
  return {so_du:fundBalance(),thu_thang:rs.filter(x=>x.dir==='in').reduce((s,x)=>s+x.amount,0),chi_thang:rs.filter(x=>x.dir==='out').reduce((s,x)=>s+x.amount,0),gan_nhat:fundRows().slice(-12).reverse().map(x=>`${fmtD(x.at)} ${x.no} ${x.dir==='in'?'+':'-'}${x.amount} ${x.note||''}`),cho_duyet:DB.cashv.filter(v=>v.status==='pending').map(v=>v.no+' '+v.amount),kiem_quy:DB.cashCounts[0]?{ngay:fmtD(DB.cashCounts[0].at),chenh_lech:DB.cashCounts[0].diff}:'chưa kiểm'}; }});
Object.assign(DICT.vi,{ ai_tool_quy_tien_mat:'Xem quỹ tiền mặt', fund_tab:'Quỹ tiền mặt', fund_balance:'Tồn quỹ hiện tại', fund_as_of:'đến {d}', fund_in:'Thu tiền mặt', fund_out:'Chi tiền mặt', fund_open_p:'Tồn đầu kỳ {a}', fund_last_count:'Kiểm quỹ gần nhất', fund_diff:'lệch {a}', fund_match:'khớp sổ', fund_never:'chưa kiểm lần nào',
  cv_new_in:'Phiếu thu', cv_new_out:'Phiếu chi', rs_new:'Bán lẻ không VAT', fc_new:'Kiểm quỹ', fund_set_open:'Số dư đầu', cv_pending:'Phiếu chi chờ duyệt', cv_wait_mgr:'Chờ quản lý duyệt',
  fund_book:'Sổ quỹ tiền mặt', fund_book_h:'Gồm mọi khoản thu/chi bằng tiền mặt trong hệ thống', fund_kind:'Loại', fund_content:'Nội dung', fund_in_c:'Thu', fund_out_c:'Chi', fund_bal_c:'Tồn', fund_empty:'Chưa có thu chi tiền mặt trong kỳ.', cvk_in:'Phiếu thu', cvk_out:'Phiếu chi', fund_k_exp:'Chi phí', fund_k_po:'Trả NCC', fund_k_cust:'Thu khách',
  fc_hist:'Lịch sử kiểm quỹ', fc_book:'Tồn sổ', fc_real:'Tiền thực tế', cv_print:'In phiếu', cv_cat:'Loại thu/chi', cv_payer:'Người nộp tiền', cv_receiver:'Người nhận tiền', cv_payer_ph:'VD: Anh Hùng – khách sửa board', cv_receiver_ph:'VD: Nguyễn Trực', cv_reason:'Lý do',
  cv_reason_in_ph:'VD: Thu tiền sửa board inverter cho khách lẻ', cv_reason_out_ph:'VD: Mua tụ, điện trở ở chợ Nhật Tảo (không hóa đơn)', cv_files_in:'Không bắt buộc: biên nhận, ảnh chuyển tiền.', cv_files_out:'Bắt buộc: ảnh hàng mua, bill tay, biên nhận ký nhận tiền.', cv_need_mgr:'Phiếu chi trên {a} sẽ chờ quản lý duyệt mới trừ quỹ.',
  cvc_retail:'Bán board / linh kiện lẻ không VAT', cvc_repair_cash:'Thu tiền sửa chữa lẻ không VAT', cvc_withdraw:'Rút tiền ngân hàng về quỹ', cvc_refund_adv:'Nhân viên hoàn tạm ứng', cvc_other_in:'Thu khác', cvc_deposit_bank:'Nộp tiền quỹ vào ngân hàng', cvc_advance:'Tạm ứng cho nhân viên', cvc_adj_in:'Điều chỉnh tăng (kiểm quỹ)', cvc_adj_out:'Điều chỉnh giảm (kiểm quỹ)',
  fund_now:'Tồn quỹ hiện tại: {a}', fund_short:'Quỹ không đủ tiền (tồn {a})', toast_cv_ok:'Đã lập {no}', toast_cv_pending:'Đã lập {no}, chờ quản lý duyệt', n_cv_pending:'{no}: phiếu chi tiền mặt {a} chờ duyệt', n_cv_ok:'{no}: phiếu chi đã được duyệt', n_cv_no:'{no}: phiếu chi bị từ chối',
  rs_hint:'Bán board, linh kiện cho khách lẻ không xuất hóa đơn VAT. Hàng tự trừ kho, tiền vào quỹ tiền mặt.', rs_add:'Thêm hàng', rs_buyer:'Người mua', rs_buyer_ph:'VD: Anh Tuấn – thợ điện Bình Dương', rs_save:'Thu {a}', rs_note:'Bán lẻ: {n}', rs_mv:'Bán lẻ không VAT {no}', toast_rs:'Đã thu {a} ({no}), đã trừ kho',
  exp_pay_t:'Chi trả phiếu chi phí', exp_pay_cash:'Tiền mặt từ quỹ', exp_pay_bank:'Chuyển khoản', exp_pay_bank_h:'Từ tài khoản ngân hàng công ty', exp_pay_ok:'Xác nhận đã chi',
  fc_hint:'Đếm số tờ từng mệnh giá trong két. Hệ thống so với tồn sổ.', fc_denom:'Mệnh giá', fc_pieces:'Số tờ', fc_reason:'Lý do chênh lệch', fc_reason_ph:'VD: quên ghi phiếu chi mua vật tư', fc_save:'Lưu kiểm quỹ', fc_save_adj:'Lưu & điều chỉnh sổ', fc_need_reason:'Nhập lý do chênh lệch', fc_adj_note:'Điều chỉnh theo kiểm quỹ: {r}', toast_fc_ok:'Đã kiểm quỹ, khớp sổ', toast_fc_adj:'Đã kiểm quỹ và điều chỉnh chênh lệch',
  fund_open_amt:'Số dư đầu (đ)', fund_open_date:'Tính từ ngày', fund_open_hint:'Số tiền mặt thực có trong két tại ngày bắt đầu dùng sổ quỹ trên hệ thống.', cv_doc_in:'Phiếu thu', cv_doc_out:'Phiếu chi', pl_rev_cash:'Bán lẻ / sửa lẻ không VAT (tiền mặt)', pl_cogs_cash:'Giá vốn hàng bán lẻ',
  td_cv:'Phiếu chi tiền mặt chờ duyệt', td_fc:'Đến hạn kiểm quỹ tiền mặt', au_cv_in:'Lập phiếu thu', au_cv_out:'Lập phiếu chi', au_cv_retail:'Bán lẻ không VAT', au_cv_approve:'Duyệt phiếu chi quỹ', au_cv_reject:'Từ chối phiếu chi quỹ', au_fund_count:'Kiểm quỹ', au_fund_open:'Đặt số dư đầu quỹ' });
Object.assign(DICT.en,{ ai_tool_quy_tien_mat:'Reading cash fund', fund_tab:'Cash fund', fund_balance:'Cash on hand', fund_as_of:'as of {d}', fund_in:'Cash in', fund_out:'Cash out', fund_open_p:'Opening {a}', fund_last_count:'Last cash count', fund_diff:'off by {a}', fund_match:'matches book', fund_never:'never counted',
  cv_new_in:'Cash receipt', cv_new_out:'Cash payment', rs_new:'Retail sale (no VAT)', fc_new:'Count cash', fund_set_open:'Opening balance', cv_pending:'Cash payments awaiting approval', cv_wait_mgr:'Awaiting manager',
  fund_book:'Cash book', fund_book_h:'All cash movements in the system', fund_kind:'Type', fund_content:'Description', fund_in_c:'In', fund_out_c:'Out', fund_bal_c:'Balance', fund_empty:'No cash movements in this period.', cvk_in:'Receipt', cvk_out:'Payment', fund_k_exp:'Expense', fund_k_po:'Supplier', fund_k_cust:'Customer',
  fc_hist:'Cash count history', fc_book:'Book', fc_real:'Counted', cv_print:'Print voucher', cv_cat:'Category', cv_payer:'Paid by', cv_receiver:'Paid to', cv_payer_ph:'e.g. walk-in customer', cv_receiver_ph:'e.g. staff name', cv_reason:'Reason',
  cv_reason_in_ph:'e.g. board repair for a walk-in customer', cv_reason_out_ph:'e.g. capacitors bought at the market (no invoice)', cv_files_in:'Optional: receipt, transfer screenshot.', cv_files_out:'Required: photo of goods, handwritten bill, signed receipt.', cv_need_mgr:'Payments over {a} wait for manager approval.',
  cvc_retail:'Retail board/parts sale (no VAT)', cvc_repair_cash:'Walk-in repair (no VAT)', cvc_withdraw:'Bank withdrawal to fund', cvc_refund_adv:'Advance returned', cvc_other_in:'Other income', cvc_deposit_bank:'Deposit to bank', cvc_advance:'Staff advance', cvc_adj_in:'Count adjustment (+)', cvc_adj_out:'Count adjustment (−)',
  fund_now:'Cash on hand: {a}', fund_short:'Not enough cash (on hand {a})', toast_cv_ok:'{no} recorded', toast_cv_pending:'{no} recorded, awaiting approval', n_cv_pending:'{no}: cash payment {a} awaiting approval', n_cv_ok:'{no}: cash payment approved', n_cv_no:'{no}: cash payment rejected',
  rs_hint:'Sell boards/parts to walk-in buyers without a VAT invoice. Stock is deducted; cash goes to the fund.', rs_add:'Add item', rs_buyer:'Buyer', rs_buyer_ph:'e.g. local electrician', rs_save:'Collect {a}', rs_note:'Retail: {n}', rs_mv:'Retail sale {no}', toast_rs:'Collected {a} ({no}); stock updated',
  exp_pay_t:'Pay expense', exp_pay_cash:'Cash from fund', exp_pay_bank:'Bank transfer', exp_pay_bank_h:'From company bank account', exp_pay_ok:'Confirm paid',
  fc_hint:'Count notes per denomination; compared with the book.', fc_denom:'Denomination', fc_pieces:'Notes', fc_reason:'Reason for difference', fc_reason_ph:'e.g. unrecorded purchase', fc_save:'Save count', fc_save_adj:'Save & adjust book', fc_need_reason:'Enter a reason', fc_adj_note:'Cash count adjustment: {r}', toast_fc_ok:'Counted; matches book', toast_fc_adj:'Counted and adjusted',
  fund_open_amt:'Opening balance (₫)', fund_open_date:'From date', fund_open_hint:'Actual cash in the safe on the day the fund book starts.', cv_doc_in:'Receipt', cv_doc_out:'Payment voucher', pl_rev_cash:'Retail / walk-in (cash, no VAT)', pl_cogs_cash:'Retail cost of goods',
  td_cv:'Cash payments awaiting approval', td_fc:'Cash count due', au_cv_in:'Cash receipt', au_cv_out:'Cash payment', au_cv_retail:'Retail sale', au_cv_approve:'Cash payment approved', au_cv_reject:'Cash payment rejected', au_fund_count:'Cash count', au_fund_open:'Opening balance set' });

/* ===================================================================
   CHI TIẾT PHIẾU CHI PHÍ: bấm vào dòng để xem đủ thông tin,
   hình mua hàng / chứng từ và hình đã chi trả (hoàn tiền cho người mua)
   =================================================================== */
A.exView = el => openModal({type:'exView',id:el.dataset.id,f:{files:[]},err:{}});
MODALS.exView = m => { const e=(DB.expenses||[]).find(x=>x.id===m.id); if(!e) return {title:'—',body:''}; const x=e.ticketId&&ticketById(e.ticketId); const j=e.fjId&&fjById(e.fjId); const v=e.voucherId&&(DB.cashv||[]).find(z=>z.id===e.voucherId);
  const mine=e.by===S.userId; const canAdd=(mine&&['pending','approved'].includes(e.status))||can('pay_record');
  const step=(ok,lbl,who,at)=>`<div class="ex-st ${ok?'ok':''}"><span class="ex-dot">${ok?ic('check',12):''}</span><div><b>${lbl}</b>${ok&&(who||at)?`<small class="muted">${esc(who||'')}${at?' · '+fmtDT(at):''}</small>`:''}</div></div>`;
  const imgs=(arr,empty)=>(arr||[]).length?`<div class="msg-imgs">${arr.map(proofThumb).join('')}</div>`:`<p class="muted" style="margin:4px 0">${empty}</p>`;
  const rej=e.status==='rejected';
  return { wide:true, title:`${t('exv_title')} · <span class="mono">${esc(e.voucherNo||e.no)}</span> ${exPill(e.status)}`,
    body:`<div class="exv-top"><div class="exv-amt">${money(e.amount)}</div><div><b>${esc(L(e.desc)||'—')}</b><br><span class="muted">${t('ec_'+e.cat)} · ${t('dt_'+(e.docType||'none'))}${e.vat?' · VAT '+money(e.vat):''}</span></div></div>
    <div class="kv-grid" style="margin-top:12px">${kv(t('doc_date'),fmtDT(e.at))}${kv(t('requested_by'),esc(uname(e.by)))}${x?kv(t('job_no'),`<button class="link-btn mono" data-a="exGoT" data-id="${x.id}">${x.no}</button>`,true):''}${j?kv(t('nav_field'),`<button class="link-btn mono" data-a="exGoF" data-id="${j.id}">${j.no}</button>`,true):''}${v?kv(t('cv_doc_out'),`<span class="mono">${v.no}</span>`,true):''}${e.paidAt?kv(t('pay_method'),t('pm_'+(e.method||'bank'))):''}</div>
    <div class="ex-steps">${step(true,t('exv_s_new'),uname(e.by),e.at)}${rej?step(true,t('exv_s_rej'),uname(e.approvedBy),e.approvedAt):step(['approved','paid'].includes(e.status),t('exv_s_appr'),uname(e.approvedBy),e.approvedAt)}${rej?'':step(e.status==='paid',t('exv_s_paid'),uname(e.paidBy||e.approvedBy),e.paidAt)}</div>
    <div class="exv-sec"><h4>${ic('image',15)} ${t('exv_buy_imgs')}</h4>${imgs(e.images,t('exv_none'))}</div>
    <div class="exv-sec"><h4>${ic('check',15)} ${t('exv_pay_imgs')}</h4>${e.status==='paid'?imgs(e.payImages,t('exv_pay_none')):`<p class="muted" style="margin:4px 0">${t('exv_not_paid')}</p>`}</div>
    ${canAdd&&!rej?`<div class="exv-sec"><h4>${ic('upload',15)} ${t(e.status==='paid'?'exv_add_pay':'exv_add_buy')}</h4>${fileBox(m.f,m.err||{},'osFiles')}${m.f.files.length?`<button class="btn sm primary" style="margin-top:8px" data-a="exAddImgs" data-id="${e.id}">${t('save')}</button>`:''}</div>`:''}`,
    foot:`<button class="btn" data-a="closeModal">${t('close')}</button><span class="grow"></span>${e.status==='paid'&&e.method==='cash'?`<button class="btn" data-a="exPrintCv" data-id="${e.id}">${ic('print',15)} ${t('cv_print')}</button>`:''}${e.status==='pending'&&can('exp_approve')?`<button class="btn danger" data-a="exSet" data-id="${e.id}" data-s="rejected">${t('reject')}</button><button class="btn okb" data-a="exSet" data-id="${e.id}" data-s="approved">${t('approve')}</button>`:''}${e.status==='approved'&&can('pay_record')?`<button class="btn primary" data-a="exSet" data-id="${e.id}" data-s="paid">${t('mark_paid')}</button>`:''}` }; };
A.exGoT = el => { S.ui.modal=null; openTicket(el.dataset.id); };
A.exGoF = el => { S.ui.modal=null; openTab('fj:'+el.dataset.id); };
A.exPrintCv = el => { S.ui.modal=null; openTab(`ed:ce|${el.dataset.id}|cv`); };
A.exAddImgs = el => { const m=S.ui.modal; const e=DB.expenses.find(x=>x.id===el.dataset.id); const fs=m.f.files.slice(); if(!fs.length) return; if(e.status==='paid') e.payImages=(e.payImages||[]).concat(fs); else e.images=(e.images||[]).concat(fs); m.f.files=[]; audit('exp_imgs',e.no,t('pf_n_files',{n:fs.length})); save(); rerender(); toast(t('toast_saved'),'ok'); };
/* sau khi duyệt / từ chối / chi từ cửa sổ chi tiết thì đóng cửa sổ, cập nhật danh sách */
const _exSetV=A.exSet; A.exSet=el=>{ const fromView=S.ui.modal&&S.ui.modal.type==='exView'; const e=DB.expenses.find(x=>x.id===el.dataset.id); if(fromView&&el.dataset.s!=='paid') S.ui.modal=null; if(e&&['approved','rejected'].includes(el.dataset.s)) e.approvedAt=Date.now(); return _exSetV(el); };
/* chi tiền: bắt buộc hình đã chi trả (biên nhận ký nhận / ảnh chuyển khoản) */
const _mExPay=MODALS.exPay; MODALS.exPay=m=>{ const r=_mExPay(m); m.f.files=m.f.files||[]; const E=m.err||{}; r.body+=`<div class="field full" style="margin-top:14px"><span class="lbl req">${t('exv_pay_imgs')}</span>${fileBox(m.f,E,'osFiles')}<div class="hint">${t(m.f.method==='cash'?'exv_pay_hint_cash':'exv_pay_hint_bank')}</div></div>`; return r; };
const _exPayOkV=A.exPayOk; A.exPayOk=()=>{ const m=S.ui.modal; if(!m) return; if(!(m.f.files||[]).length){ m.err={files:t('pay_proof_req')}; rerender(); return; } const id=m.id, fs=m.f.files.slice(); _exPayOkV(); const e=DB.expenses.find(x=>x.id===id); if(e&&e.status==='paid'){ e.payImages=fs; e.paidBy=S.userId; save(); rerender(); } };
Object.assign(DICT.vi,{ exv_title:'Phiếu chi phí', exv_s_new:'Đề nghị chi', exv_s_appr:'Quản lý duyệt', exv_s_rej:'Bị từ chối', exv_s_paid:'Đã chi trả', exv_buy_imgs:'Hình mua hàng / chứng từ (hóa đơn, bill, ảnh hàng)', exv_pay_imgs:'Hình đã chi trả (ký nhận tiền / chuyển khoản)',
  exv_none:'Chưa có hình.', exv_pay_none:'Chưa có hình xác nhận đã chi.', exv_not_paid:'Chưa chi trả.', exv_add_buy:'Bổ sung hình chứng từ', exv_add_pay:'Bổ sung hình đã chi trả',
  exv_pay_hint_cash:'Chụp biên nhận / phiếu chi có chữ ký người nhận tiền.', exv_pay_hint_bank:'Chụp màn hình giao dịch chuyển khoản.', au_exp_imgs:'Bổ sung hình phiếu chi' });
Object.assign(DICT.en,{ exv_title:'Expense', exv_s_new:'Requested', exv_s_appr:'Approved', exv_s_rej:'Rejected', exv_s_paid:'Paid out', exv_buy_imgs:'Purchase photos / documents', exv_pay_imgs:'Payment proof (signed receipt / transfer)',
  exv_none:'No photos yet.', exv_pay_none:'No payment proof yet.', exv_not_paid:'Not paid yet.', exv_add_buy:'Add documents', exv_add_pay:'Add payment proof',
  exv_pay_hint_cash:'Photo of the receipt signed by the person paid.', exv_pay_hint_bank:'Screenshot of the bank transfer.', au_exp_imgs:'Expense photos added' });

A.fjCostImg = input => readFiles(input,'image',arr=>{ const j=fjById(input.dataset.id); const c=j&&j.costs[+input.dataset.i]; if(!c) return; c.images=(c.images||[]).concat(arr); save(); rerender(); });
A.fjCostImgDel = el => { const j=fjById(el.dataset.id); j.costs[+el.dataset.i].images.splice(+el.dataset.k,1); save(); rerender(); };
/* chốt chặn chung: mọi phiếu chi phí khi tạo phải có hình, khi chi phải có hình đã chi */
const _exSetImg=A.exSet; A.exSet=el=>{ const e=DB.expenses.find(x=>x.id===el.dataset.id); if(e&&el.dataset.s==='approved'&&!(e.images||[]).length){ toast(t('exv_need_buy'),'bad'); openModal({type:'exView',id:e.id,f:{files:[]},err:{}}); return; } return _exSetImg(el); };
Object.assign(DICT.vi,{ fj_cost_img:'Hình bill / chứng từ', fj_cost_noimg:'Còn {n} khoản chi chưa có hình bill / chứng từ', exv_need_buy:'Phiếu chi phí chưa có hình mua hàng / chứng từ — bổ sung hình trước khi duyệt' });
Object.assign(DICT.en,{ fj_cost_img:'Receipt photo', fj_cost_noimg:'{n} cost line(s) have no receipt photo', exv_need_buy:'This expense has no purchase photo — add one before approving' });

/* ===================================================================
   QUẢN LÝ TOÀN DIỆN: Thông tin công ty · Nhân sự · Tài sản & dụng cụ
   · Chính sách bảo hành (sửa được) · Hướng dẫn quy trình
   =================================================================== */
/* ---------- Thông tin công ty (dùng cho mọi giấy tờ) ---------- */
const CO_FIELDS=[['name','co_name',1],['mst','co_mst'],['phone','co_phone'],['email','co_email'],['website','co_web'],['addr','co_addr',1],['bankAcc','co_bank_acc'],['bankName','co_bank_name',1],['director','co_director'],['dirTitle','co_dir_title'],['dirGender','co_dir_gender']];
function coApply(){ if(DB&&DB.company) Object.assign(SGE_CO,DB.company); }
function viewCompany(){ coApply(); const f=S.ui.co||(S.ui.co=Object.assign({website:'sgesolartech.vn'},SGE_CO)); const ed=isBossRole(me());
  return `<div class="page-head"><div><h1>${t('nav_company')}</h1><div class="sub">${t('co_sub')}</div></div>${ed?`<button class="btn primary" data-a="coSave">${ic('check',15)} ${t('save')}</button>`:''}</div>
  <div class="report-grid"><div class="card"><div class="card-h"><h3>${t('co_info')}</h3></div><div class="card-b"><div class="form-grid">${CO_FIELDS.map(([k,l,full])=>`<div class="field ${full?'full':''}"><label for="co-${k}">${t(l)}</label>${k==='dirGender'?`<select class="select" id="co-${k}" data-bind="co.${k}" ${ed?'':'disabled'}>${['Ông','Bà'].map(g=>`<option ${f[k]===g?'selected':''}>${g}</option>`).join('')}</select>`:`<input class="input" id="co-${k}" data-bind="co.${k}" value="${esc(f[k]||'')}" ${ed?'':'readonly'}>`}</div>`).join('')}</div></div></div>
  <div class="card"><div class="card-h"><h3>${t('co_preview')}</h3></div><div class="card-b"><div class="co-card"><img src="${SGE_LOGO}" alt="SGE"><div><b>${esc(f.name)}</b><span>${esc(f.addr)}</span><span>MST: ${esc(f.mst)} · ${esc(f.phone)} · ${esc(f.email)}</span><span>TK: ${esc(f.bankAcc)} – ${esc(f.bankName)}</span><span>${esc(f.dirGender)} ${esc(f.director)} – ${esc(f.dirTitle)}</span></div></div><p class="hint" style="margin-top:12px">${t('co_hint')}</p></div></div></div>`; }
A.coSave = () => { const f=S.ui.co; DB.company={}; CO_FIELDS.forEach(([k])=>{ DB.company[k]=String(f[k]||'').trim(); }); coApply(); audit('company_edit','',DB.company.name); save(); rerender(); toast(t('toast_saved'),'ok'); };

/* ---------- Nhân sự: hồ sơ, đang làm gì, KPI, tài sản đang giữ ---------- */
const STAFF_ROLES=['manager','engineer','warehouse','accountant'];
function staffLoad(u){ const tk=(DB.tickets||[]).filter(x=>x.assigneeId===u.id&&isOpen(x)&&!['delivered','invoiced','paid'].includes(x.status)); const fj=(DB.fjobs||[]).filter(j=>j.team.includes(u.id)&&['planned','onsite','done'].includes(j.status));
  const late=tk.filter(x=>slaBreached(x)).length+fj.filter(fjLate).length; let tasks=0; try{ tasks=todayTasks(u).reduce((s,g)=>s+g.n,0); }catch(e){} return {tk,fj,late,tasks,assets:(DB.assets||[]).filter(a=>a.holder===u.id&&a.status==='issued')}; }
function viewStaff(){ const f=S.ui.stf||(S.ui.stf={q:'',role:'',open:null}); const boss=isBossRole(me()); let us=(DB.users||[]).filter(u=>STAFF_ROLES.includes(u.role)); if(!boss) us=us.filter(u=>u.id===S.userId);
  if(f.role) us=us.filter(u=>u.role===f.role); if(f.q) us=us.filter(u=>lc(u.name+' '+u.email+' '+(u.phone||'')).includes(lc(f.q)));
  const r=perRange({p:'month',anchor:Date.now()}); const rows=us.map(u=>({u,l:staffLoad(u),k:kpiOf(u,r)})); const mx={}; rows.forEach(x=>{ mx[x.u.role]=Math.max(mx[x.u.role]||0,x.k.actions); }); rows.forEach(x=>{ x.score=kpiScore(x.k,mx[x.u.role]); });
  const sel=f.open&&rows.find(x=>x.u.id===f.open)||(!boss&&rows[0]);
  return `<div class="page-head"><div><h1>${t('nav_staff')}</h1><div class="sub">${t('stf_sub')}</div></div>${boss?`<button class="btn" data-a="nav" data-k="admin">${ic('plus',15)} ${t('stf_add')}</button>`:''}</div>
  <div class="stat-row task-stats"><div class="card stat"><div class="l">${t('stf_total')}</div><div class="v">${rows.length}</div></div><div class="card stat"><div class="l">${t('stf_busy')}</div><div class="v" style="color:var(--blue)">${rows.reduce((s,x)=>s+x.l.tk.length+x.l.fj.length,0)}</div><div class="d">${t('stf_busy_h')}</div></div><div class="card stat"><div class="l">${t('stf_late')}</div><div class="v" style="color:${rows.some(x=>x.l.late)?'var(--bad)':'inherit'}">${rows.reduce((s,x)=>s+x.l.late,0)}</div></div><div class="card stat"><div class="l">${t('stf_assets')}</div><div class="v">${rows.reduce((s,x)=>s+x.l.assets.length,0)}</div></div></div>
  <div class="staff-wrap"><div class="card"><div class="toolbar"><div class="row grow">${searchBox('stf-q','stf.q',f.q)}<select class="select" style="width:auto" data-bind="stf.role" data-re><option value="">${t('all_roles')}</option>${STAFF_ROLES.map(x=>`<option value="${x}" ${f.role===x?'selected':''}>${t('role_'+x)}</option>`).join('')}</select></div></div>
    <div class="staff-list">${rows.map(x=>`<button class="staff-row ${sel&&sel.u.id===x.u.id?'on':''}" data-a="stfOpen" data-id="${x.u.id}"><span class="avatar">${esc(initials(x.u.name))}</span><div class="sr-m"><b>${esc(x.u.name)}</b><small>${t('role_'+x.u.role)}${x.u.phone?' · '+esc(x.u.phone):''}</small></div><div class="sr-load"><span title="${t('stf_tk')}">${ic('wrench',13)} ${x.l.tk.length}</span><span title="${t('stf_fj')}">${ic('globe',13)} ${x.l.fj.length}</span>${x.l.late?`<span class="bad" title="${t('stf_late')}">${ic('alert',13)} ${x.l.late}</span>`:''}</div><span class="kgrade g${kpiGrade(x.score)}">${kpiGrade(x.score)}</span></button>`).join('')||`<div class="empty">${t('no_results')}</div>`}</div></div>
    <div>${sel?staffProfile(sel):`<div class="card empty">${ic('msg',28)}<p>${t('stf_pick')}</p></div>`}</div></div>`; }
function staffProfile(x){ const u=x.u, l=x.l, k=x.k; const ed=isBossRole(me())||u.id===S.userId; const d=S.ui['stp_'+u.id]||(S.ui['stp_'+u.id]={phone:u.phone||'',title2:u.position||'',start:u.startDate?toISODate(u.startDate):'',skills:u.skills||'',note:u.note||''});
  const act=[]; (DB.tickets||[]).forEach(t2=>(t2.history||[]).forEach(h=>{ if(h.by===u.id) act.push({at:h.at,txt:`${t2.no}: ${t('h_'+h.action)}`,go:'t:'+t2.id}); })); act.sort((a,b)=>b.at-a.at);
  return `<div class="card"><div class="card-b"><div class="stp-head"><span class="avatar lg">${esc(initials(u.name))}</span><div><h2 style="margin:0">${esc(u.name)}</h2><div class="muted">${t('role_'+u.role)}${u.position?' · '+esc(u.position):''} · ${esc(u.email||'')}</div></div><span class="kgrade g${kpiGrade(x.score)}" style="margin-left:auto;width:44px;height:44px;font-size:20px">${kpiGrade(x.score)}</span></div>
    <div class="cost-grid" style="margin-top:14px"><div><span>${t('stf_tk')}</span><b>${l.tk.length}</b></div><div><span>${t('stf_fj')}</span><b>${l.fj.length}</b></div><div><span>${t('stf_tasks')}</span><b>${l.tasks}</b></div><div class="${l.late?'neg':''}"><span>${t('stf_late')}</span><b>${l.late}</b></div></div></div></div>
  <div class="card"><div class="card-h"><h3>${t('stf_doing')}</h3></div><div class="card-b">${l.tk.length||l.fj.length?`<div class="mini-list">${l.tk.map(t2=>`<button class="mini-item" data-a="openTicket" data-id="${t2.id}"><span class="t"><div><span class="mono">${t2.no}</span> ${esc(t2.company||custName(t2.customerId))}</div><small>${esc(stepName(t2))}${slaBreached(t2)?' · <b style="color:var(--bad)">'+t('kpi_late')+'</b>':''}</small></span>${miniFlow(t2)}</button>`).join('')}${l.fj.map(j=>`<button class="mini-item" data-a="nav" data-k="fj:${j.id}"><span class="t"><div><span class="mono">${j.no}</span> ${esc((siteById(j.siteId)||{}).name||'')}</div><small>${t('fjk_'+j.kind)} · ${fmtDT(j.date)}</small></span>${fjPill(j)}</button>`).join('')}</div>`:`<p class="muted">${t('stf_free')}</p>`}</div></div>
  <div class="card"><div class="card-h"><h3>${t('stf_kpi_m')}</h3><button class="link-btn" data-a="nav" data-k="kpi">${t('rp2_see_kpi')} →</button></div><div class="card-b"><div class="cost-grid"><div><span>${t('kpi_assigned')}</span><b>${k.assigned}</b></div><div><span>${t('kst_ontime')}</span><b style="color:var(--ok)">${k.onTime}</b></div><div><span>${t('kst_late')}</span><b style="color:var(--warn)">${k.late}</b></div><div><span>${t('kpi_rework')}</span><b>${k.rework||0}</b></div></div></div></div>
  <div class="card"><div class="card-h"><h3>${t('stf_profile')}</h3>${ed?`<button class="btn sm primary" data-a="stpSave" data-id="${u.id}">${t('save')}</button>`:''}</div><div class="card-b"><div class="form-grid">
    <div class="field"><label>${t('phone')}</label><input class="input" data-bind="stp_${u.id}.phone" value="${esc(d.phone)}" ${ed?'':'readonly'}></div><div class="field"><label>${t('stf_position')}</label><input class="input" data-bind="stp_${u.id}.title2" value="${esc(d.title2)}" placeholder="${t('stf_position_ph')}" ${ed?'':'readonly'}></div>
    <div class="field"><label>${t('stf_start')}</label><input class="input" type="date" data-bind="stp_${u.id}.start" value="${d.start}" ${ed?'':'readonly'}></div><div class="field"><label>${t('stf_skills')}</label><input class="input" data-bind="stp_${u.id}.skills" value="${esc(d.skills)}" placeholder="${t('stf_skills_ph')}" ${ed?'':'readonly'}></div>
    <div class="field full"><label>${t('note_l')}</label><input class="input" data-bind="stp_${u.id}.note" value="${esc(d.note)}" ${ed?'':'readonly'}></div></div></div></div>
  <div class="card"><div class="card-h"><h3>${t('stf_assets_h')}</h3><button class="link-btn" data-a="nav" data-k="assets">${t('nav_assets')} →</button></div><div class="card-b">${l.assets.length?`<div class="mini-list">${l.assets.map(a=>`<div class="mini-item"><span class="t"><div><span class="mono">${esc(a.code)}</span> ${esc(a.name)}</div><small>${t('as_since',{d:fmtD(a.issuedAt)})}</small></span></div>`).join('')}</div>`:`<p class="muted">${t('stf_no_assets')}</p>`}</div></div>
  <div class="card"><div class="card-h"><h3>${t('stf_recent')}</h3></div><div class="card-b">${act.length?`<div class="mini-list">${act.slice(0,12).map(a=>`<button class="mini-item" data-a="nav" data-k="${a.go}"><span class="t"><div>${esc(a.txt)}</div><small>${fmtDT(a.at)}</small></span></button>`).join('')}</div>`:`<p class="muted">—</p>`}</div></div>`; }
A.stfOpen = el => { (S.ui.stf||(S.ui.stf={})).open=el.dataset.id; rerender(); };
A.stpSave = el => { const u=userById(el.dataset.id); const d=S.ui['stp_'+u.id]; u.phone=d.phone.trim(); u.position=d.title2.trim(); u.startDate=d.start?new Date(d.start+'T08:00:00').getTime():null; u.skills=d.skills.trim(); u.note=d.note.trim(); audit('staff_edit',u.name,''); save(); rerender(); toast(t('toast_saved'),'ok'); };

/* ---------- Tài sản & dụng cụ công ty: cấp phát / thu hồi / hỏng / kiểm định ---------- */
const AS_TYPES=['meter','solder','scope','laptop','vehicle','tool','other'];
function seedAssets(){ if(DB.assets) return; const n=Date.now(); DB.assets=[
  {id:'as1',code:'DC-001',name:'Đồng hồ đo cách điện Kyoritsu 3025A',type:'meter',serial:'KY3025-1188',value:9800000,buyAt:n-400*DAYMS,status:'issued',holder:'u_eng2',issuedAt:n-30*DAYMS,calibDue:n+20*DAYMS,log:[]},
  {id:'as2',code:'DC-002',name:'Máy hàn khò Quick 861DW',type:'solder',serial:'Q861-552',value:4200000,buyAt:n-300*DAYMS,status:'stock',holder:null,calibDue:null,log:[]},
  {id:'as3',code:'DC-003',name:'Oscilloscope Rigol DS1054Z',type:'scope',serial:'DS1ZA2201',value:11500000,buyAt:n-500*DAYMS,status:'issued',holder:'u_eng',issuedAt:n-90*DAYMS,calibDue:n-5*DAYMS,log:[]},
  {id:'as4',code:'XE-001',name:'Xe tải nhỏ Suzuki Carry Pro',type:'vehicle',serial:'61C-123.45',value:310000000,buyAt:n-700*DAYMS,status:'stock',holder:null,calibDue:n+60*DAYMS,log:[]},
  {id:'as5',code:'DC-004',name:'Ampe kìm Fluke 376 FC',type:'meter',serial:'FL376-9921',value:12600000,buyAt:n-200*DAYMS,status:'broken',holder:null,calibDue:null,log:[]} ]; }
const asPill=a=>`<span class="kst ${({stock:'k-ok',issued:'k-blue',broken:'k-bad',disposed:''})[a.status]}">${t('ass_'+a.status)}</span>`;
function viewAssets(){ seedAssets(); const f=S.ui.ast||(S.ui.ast={q:'',st:''}); const mg=isBossRole(me())||can('stock_move'); let arr=DB.assets.slice(); if(f.st) arr=arr.filter(a=>a.status===f.st); if(f.q) arr=arr.filter(a=>lc(a.code+' '+a.name+' '+a.serial+' '+uname(a.holder)).includes(lc(f.q)));
  const calib=DB.assets.filter(a=>a.calibDue&&a.calibDue-Date.now()<30*DAYMS&&a.status!=='disposed');
  return `<div class="page-head"><div><h1>${t('nav_assets')}</h1><div class="sub">${t('as_sub')}</div></div>${mg?`<button class="btn primary" data-a="asNew">${ic('plus',15)} ${t('as_new')}</button>`:''}</div>
  <div class="stat-row task-stats"><div class="card stat"><div class="l">${t('as_total')}</div><div class="v">${DB.assets.filter(a=>a.status!=='disposed').length}</div><div class="d">${money(DB.assets.filter(a=>a.status!=='disposed').reduce((s,a)=>s+(a.value||0),0))}</div></div><div class="card stat"><div class="l">${t('ass_issued')}</div><div class="v" style="color:var(--blue)">${DB.assets.filter(a=>a.status==='issued').length}</div></div><div class="card stat"><div class="l">${t('ass_broken')}</div><div class="v" style="color:var(--bad)">${DB.assets.filter(a=>a.status==='broken').length}</div></div><div class="card stat"><div class="l">${t('as_calib')}</div><div class="v" style="color:${calib.length?'var(--warn)':'inherit'}">${calib.length}</div></div></div>
  <div class="card"><div class="toolbar"><div class="row grow">${searchBox('ast-q','ast.q',f.q)}<div class="seg">${['','stock','issued','broken','disposed'].map(k=>`<button class="${f.st===k?'on':''}" data-a="asF" data-k="${k}">${k?t('ass_'+k):t('all')}</button>`).join('')}</div></div></div>
  ${arr.length?`<div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('item_code')}</th><th>${t('as_name')}</th><th>${t('as_type')}</th><th>${t('serial_no')}</th><th>${t('as_holder')}</th><th>${t('as_calib_due')}</th><th class="r">${t('as_value')}</th><th>${t('status')}</th><th></th></tr></thead><tbody>${arr.map(a=>{ const cd=a.calibDue; const cl=cd&&cd<Date.now()?'color:var(--bad);font-weight:600':cd&&cd-Date.now()<30*DAYMS?'color:var(--warn);font-weight:600':'';
    return `<tr><td data-l="${t('item_code')}" class="mono">${esc(a.code)}</td><td data-l="${t('as_name')}"><b>${esc(a.name)}</b></td><td data-l="${t('as_type')}">${t('ast_'+a.type)}</td><td data-l="${t('serial_no')}" class="mono">${esc(a.serial||'—')}</td><td data-l="${t('as_holder')}">${a.holder?`${esc(uname(a.holder))}<br><small class="muted">${t('as_since',{d:fmtD(a.issuedAt)})}</small>`:'—'}</td><td data-l="${t('as_calib_due')}" class="num" style="${cl}">${cd?fmtD(cd):'—'}</td><td data-l="${t('as_value')}" class="r num">${money(a.value||0)}</td><td data-l="${t('status')}">${asPill(a)}</td>
      <td class="nowrap">${mg?(a.status==='stock'?`<button class="btn sm primary" data-a="asIssueAsk" data-id="${a.id}">${t('as_issue')}</button>`:a.status==='issued'?`<button class="btn sm" data-a="asReturn" data-id="${a.id}">${t('as_return')}</button>`:'')+(a.status!=='disposed'?` <button class="btn sm ghost" data-a="asEdit" data-id="${a.id}">${ic('edit',13)}</button>`:''):''}</td></tr>`; }).join('')}</tbody></table></div>`:`<div class="empty">${t('no_results')}</div>`}</div>`; }
A.asF = el => { S.ui.ast.st=el.dataset.k; rerender(); };
A.asNew = () => openModal({type:'asForm',id:'',f:{code:'DC-'+String((DB.assets||[]).length+1).padStart(3,'0'),name:'',type:'tool',serial:'',value:'',buyAt:toISODate(Date.now()),calibDue:'',status:'stock'}});
A.asEdit = el => { const a=DB.assets.find(z=>z.id===el.dataset.id); openModal({type:'asForm',id:a.id,f:{code:a.code,name:a.name,type:a.type,serial:a.serial||'',value:a.value||'',buyAt:a.buyAt?toISODate(a.buyAt):'',calibDue:a.calibDue?toISODate(a.calibDue):'',status:a.status}}); };
MODALS.asForm = m => { const f=m.f; return { title:t(m.id?'as_edit':'as_new'), body:`<div class="form-grid"><div class="field"><label class="req">${t('item_code')}</label><input class="input mono" data-bind="modal.f.code" value="${esc(f.code)}"></div><div class="field"><label>${t('as_type')}</label><select class="select" data-bind="modal.f.type">${AS_TYPES.map(k=>`<option value="${k}" ${f.type===k?'selected':''}>${t('ast_'+k)}</option>`).join('')}</select></div>
  <div class="field full"><label class="req">${t('as_name')}</label><input class="input" data-bind="modal.f.name" value="${esc(f.name)}" placeholder="${t('as_name_ph')}"></div><div class="field"><label>${t('serial_no')}</label><input class="input mono" data-bind="modal.f.serial" value="${esc(f.serial)}"></div><div class="field"><label>${t('as_value')}</label><input class="input num" type="number" data-bind="modal.f.value" value="${esc(f.value)}"></div>
  <div class="field"><label>${t('as_buy')}</label><input class="input" type="date" data-bind="modal.f.buyAt" value="${f.buyAt}"></div><div class="field"><label>${t('as_calib_due')}</label><input class="input" type="date" data-bind="modal.f.calibDue" value="${f.calibDue}"><div class="hint">${t('as_calib_h')}</div></div>
  ${m.id?`<div class="field"><label>${t('status')}</label><select class="select" data-bind="modal.f.status">${['stock','issued','broken','disposed'].map(k=>`<option value="${k}" ${f.status===k?'selected':''}>${t('ass_'+k)}</option>`).join('')}</select></div>`:''}</div>`,
  foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="asSave">${t('save')}</button>` }; };
A.asSave = () => { const m=S.ui.modal,f=m.f; if(!String(f.name).trim()||!String(f.code).trim()){ toast(t('e_required'),'bad'); return; } const d={code:f.code.trim(),name:f.name.trim(),type:f.type,serial:f.serial.trim(),value:Number(f.value)||0,buyAt:f.buyAt?new Date(f.buyAt+'T08:00:00').getTime():null,calibDue:f.calibDue?new Date(f.calibDue+'T08:00:00').getTime():null};
  if(m.id){ const a=DB.assets.find(z=>z.id===m.id); Object.assign(a,d); if(f.status!==a.status){ a.log.push({k:f.status,at:Date.now(),by:S.userId}); a.status=f.status; if(f.status!=='issued') a.holder=null; } } else DB.assets.unshift(Object.assign({id:'as'+Date.now().toString(36),status:'stock',holder:null,log:[{k:'new',at:Date.now(),by:S.userId}]},d));
  audit('asset_save',d.code,d.name); S.ui.modal=null; save(); rerender(); };
A.asIssueAsk = el => openModal({type:'asIssue',id:el.dataset.id,f:{to:'',files:[]},err:{}});
MODALS.asIssue = m => { const a=DB.assets.find(z=>z.id===m.id); const f=m.f; return { title:`${t('as_issue')} · ${esc(a.code)}`, body:`<p style="margin:0 0 10px"><b>${esc(a.name)}</b></p><div class="field"><label class="req">${t('as_to')}</label><select class="select" data-bind="modal.f.to"><option value="">—</option>${(DB.users||[]).filter(u=>STAFF_ROLES.includes(u.role)).map(u=>`<option value="${u.id}" ${f.to===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div><div class="field" style="margin-top:10px"><span class="lbl">${t('as_issue_img')}</span>${fileBox(f,m.err||{},'osFiles')}</div>`, foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="asIssue">${t('as_issue')}</button>` }; };
A.asIssue = () => { const m=S.ui.modal; const a=DB.assets.find(z=>z.id===m.id); if(!m.f.to){ toast(t('e_required'),'bad'); return; } a.status='issued'; a.holder=m.f.to; a.issuedAt=Date.now(); a.log.push({k:'issued',to:m.f.to,at:Date.now(),by:S.userId,images:m.f.files.slice()}); notify({toUser:m.f.to,key:'n_as_issue',vars:{c:a.code,n:a.name}}); audit('asset_issue',a.code,uname(m.f.to)); S.ui.modal=null; save(); rerender(); };
A.asReturn = el => { const a=DB.assets.find(z=>z.id===el.dataset.id); a.log.push({k:'returned',from:a.holder,at:Date.now(),by:S.userId}); audit('asset_return',a.code,uname(a.holder)); a.status='stock'; a.holder=null; a.issuedAt=null; save(); rerender(); toast(t('toast_saved'),'ok'); };

/* ---------- Chính sách bảo hành SGE (sửa được, in / Word / PDF) ---------- */
function policyDoc(){ coApply(); const C=SGE_CO; return `<div class="a4 sgedoc"><table class="lh"><tr><td style="width:24%"><img src="${SGE_LOGO}" alt="SGE" style="height:72px"></td><td><b style="font-size:15px">${C.name}</b><br>Địa chỉ: ${C.addr}<br>Hotline: ${C.phone} · Email: ${C.email}</td></tr></table>
  <h2 class="ttl">CHÍNH SÁCH BẢO HÀNH DỊCH VỤ SỬA CHỮA</h2><p class="c" style="margin:0 0 10px"><i>Áp dụng cho thiết bị biến tần năng lượng mặt trời do SGE sửa chữa, bảo trì</i></p>
  <p class="art">1. Thời hạn bảo hành</p><p>- Bảo hành nội dung sửa chữa và linh kiện đã thay theo thời hạn ghi trên hợp đồng / phiếu bảo hành (thông thường từ 06 đến 12 tháng).<br>- Thời hạn tính từ ngày hai bên ký biên bản nghiệm thu và bàn giao thiết bị đưa vào sử dụng.<br>- Thiết bị thay thế bằng hàng mới nguyên chiếc áp dụng theo chính sách của nhà sản xuất.</p>
  <p class="art">2. Phạm vi bảo hành</p><p>- Lỗi phát sinh trên chính phần đã sửa chữa hoặc linh kiện SGE đã thay, trong thời hạn bảo hành.<br>- Khi có sự cố, khách hàng giữ nguyên hiện trạng và báo cho SGE; kỹ thuật hai bên cùng xác định nguyên nhân.<br>- Lỗi do SGE: SGE sửa chữa miễn phí (linh kiện, công, vận chuyển hai chiều).<br>- Lỗi không do SGE: SGE báo giá sửa chữa, khách hàng đồng ý mới thực hiện.</p>
  <p class="art">3. Thời gian xử lý</p><p>- Tiếp nhận thông tin và phản hồi trong vòng 24 giờ kể từ khi nhận được thông báo.<br>- Cử kỹ thuật đến địa điểm lắp đặt trong vòng 24 giờ (nội thành) đối với khách hàng có cam kết trong hợp đồng.<br>- Kiểm tra, chẩn đoán tại xưởng: <b>miễn phí</b>.</p>
  <p class="art">4. Các trường hợp không được bảo hành</p><p>- Số sê-ri bị thay đổi, chỉnh sửa hoặc không xác định được; khách hàng tự ý xóa dữ liệu biến tần.<br>- Khách hàng tự ý sửa chữa, điều chỉnh, thay đổi khi chưa được SGE đồng ý.<br>- Cầu chì, bộ chống sét lan truyền (SPD), bộ lọc và các hư hỏng thẩm mỹ.<br>- Vận chuyển, lưu kho, lắp đặt không đúng hướng dẫn của nhà sản xuất (biến dạng vỏ, gãy giắc, nước, côn trùng, bụi bẩn xâm nhập…).<br>- Hư hỏng do chạm đất phía trung thế; quá áp phía chuỗi DC hoặc lưới AC; sét đánh, hỏa hoạn, lũ lụt, thiên tai.<br>- Sử dụng vượt quá phạm vi, không bảo trì hoặc bảo trì sai cách; thiết bị quá bẩn ảnh hưởng tản nhiệt công suất.<br>- Hư hỏng do bên thứ ba hoặc điều kiện ngoài thông số kỹ thuật của sản phẩm.</p>
  <p class="art">5. Quy trình yêu cầu bảo hành</p><p>1) Khách hàng liên hệ hotline ${C.phone} hoặc email ${C.email}, cung cấp số phiếu bảo hành / số serial, mô tả lỗi và hình ảnh.<br>2) SGE kiểm tra thông tin bảo hành, hẹn lịch nhận máy hoặc cử kỹ thuật đến công trình.<br>3) SGE xác định nguyên nhân, thông báo kết luận bảo hành cho khách hàng.<br>4) Sửa chữa, kiểm tra vận hành và bàn giao lại thiết bị kèm biên bản.</p>
  <p class="art">6. Cam kết</p><p>SGE cam kết thiết bị sau sửa chữa hoạt động ổn định, đạt thông số kỹ thuật, công suất và chức năng vận hành theo tiêu chuẩn. Chính sách này là một phần của hợp đồng sửa chữa giữa SGE và khách hàng.</p></div>`; }
const _docSourceP=docSource; docSource=function(key){ const {type}=docHost(key); if(type==='pol'){ DB.policy=DB.policy||{}; return {type,id:'main',kind:'pol',host:DB.policy,store:DB.policy.edit||null,setStore:v=>{ DB.policy.edit=v; },title:t('nav_policy'),gen:policyDoc,sig:()=>'1',back:'policy',fields:[],file:'Chinh_sach_bao_hanh_SGE'}; } return _docSourceP(key); };
viewPolicy=function(){ DB.policy=DB.policy||{}; const html=(DB.policy.edit&&DB.policy.edit.html)||policyDoc(); const ed=isBossRole(me());
  return `<div class="page-head"><div><h1>${t('nav_policy')}</h1><div class="sub">${t('pol_sub')}${DB.policy.edit?' · '+t('de_saved_at',{d:fmtDT(DB.policy.edit.at),u:esc(uname(DB.policy.edit.by))}):''}</div></div><div class="row" style="gap:8px;flex-wrap:wrap">${ed?`<button class="btn primary" data-a="nav" data-k="ed:pol|main|pol">${ic('edit',15)} ${t('pol_edit')}</button>`:''}<button class="btn" data-a="docQuick" data-t="pol" data-id="main" data-k="pol" data-f="docx">Word</button><button class="btn" data-a="docQuick" data-t="pol" data-id="main" data-k="pol" data-f="pdf">PDF</button></div></div>
  <div class="doc-canvas"><style>${HO_CSS}${DOC_CSS}</style><div class="doc-view">${html}</div></div>`; };

/* ---------- Hướng dẫn quy trình (SOP) cho người mới ---------- */
const GUIDES=[
 {k:'repair',ic:'wrench',steps:[['all','g_r1'],['manager','g_r2'],['engineer','g_r3'],['manager','g_r4'],['accountant','g_r5'],['accountant','g_r6'],['warehouse','g_r7'],['engineer','g_r8'],['engineer','g_r9'],['accountant','g_r10'],['engineer','g_r11'],['accountant','g_r12']]},
 {k:'rework',ic:'refresh',steps:[['all','g_w1'],['engineer','g_w2'],['manager','g_w3'],['engineer','g_w4']]},
 {k:'outsource',ic:'truck',steps:[['engineer','g_o1'],['engineer','g_o2'],['accountant','g_o3'],['engineer','g_o4'],['manager','g_o5']]},
 {k:'field',ic:'globe',steps:[['manager','g_f1'],['warehouse','g_f2'],['engineer','g_f3'],['engineer','g_f4'],['engineer','g_f5'],['manager','g_f6']]},
 {k:'expense',ic:'file',steps:[['all','g_e1'],['manager','g_e2'],['accountant','g_e3']]},
 {k:'cash',ic:'box',steps:[['accountant','g_c1'],['accountant','g_c2'],['accountant','g_c3'],['accountant','g_c4']]},
 {k:'stock',ic:'box',steps:[['warehouse','g_s1'],['warehouse','g_s2'],['warehouse','g_s3'],['manager','g_s4']]},
 {k:'om',ic:'shield',steps:[['manager','g_m1'],['accountant','g_m2'],['manager','g_m3']]} ];
function viewGuide(){ const f=S.ui.gd||(S.ui.gd={mine:!isBossRole(me()),open:'repair'}); const role=me().role;
  return `<div class="page-head"><div><h1>${t('nav_guide')}</h1><div class="sub">${t('gd_sub')}</div></div><label class="row" style="gap:6px;font-size:13px"><input type="checkbox" data-bind="gd.mine" data-re ${f.mine?'checked':''}> ${t('gd_mine')}</label></div>
  <div class="guide-grid">${GUIDES.map(g=>{ const st=g.steps.filter(([r])=>!f.mine||r==='all'||r===role||(role==='dev')); if(f.mine&&!st.length) return ''; const open=f.open===g.k;
    return `<section class="card guide ${open?'open':''}"><button class="guide-h" data-a="gdOpen" data-k="${g.k}"><span class="gi">${ic(g.ic,18)}</span><div><b>${t('gd_'+g.k)}</b><small>${t('gd_'+g.k+'_h')}</small></div><span class="muted">${st.length} ${t('gd_steps')} ${ic(open?'down':'right',14)}</span></button>
    ${open?`<ol class="guide-steps">${g.steps.map(([r,k],i)=>{ const mine=r==='all'||r===role; return `<li class="${mine?'mine':''}"><span class="gs-n">${i+1}</span><div><div class="gs-who">${r==='all'?t('gd_anyone'):t('role_'+r)}${mine?` <span class="kst k-blue">${t('gd_you')}</span>`:''}</div><p>${t(k)}</p></div></li>`; }).join('')}</ol>`:''}</section>`; }).join('')}</div>`; }
A.gdOpen = el => { const f=S.ui.gd; f.open=f.open===el.dataset.k?null:el.dataset.k; rerender(); };

/* ---------- đăng ký trang & menu ---------- */
const _erpViewM=erpView; erpView=function(k){ if(k==='company') return viewCompany(); if(k==='staff') return viewStaff(); if(k==='assets') return viewAssets(); if(k==='guide') return viewGuide(); return _erpViewM(k); };
const _tabAllowedM=tabAllowed; tabAllowed=function(k,u=me()){ if(k==='company') return !!u&&!isExternal(u); if(['staff','assets','guide'].includes(k)) return !!u&&!isExternal(u); return _tabAllowedM(k,u); };
const _tabTitleM=tabTitle; tabTitle=function(k){ if(['company','staff','assets','guide'].includes(k)) return t('nav_'+k); return _tabTitleM(k); };
const _navM=navItems; navItems=function(u=me()){ let r=_navM(u); if(!u||isExternal(u)) return r;
  /* "Công trình" luôn đứng trước "Thêm" */ const fi=r.findIndex(n=>n.k==='field'), mi=r.findIndex(n=>n.more); if(fi>mi&&mi>=0){ const [it]=r.splice(fi,1); r.splice(mi,0,it); }
  const more=r.find(n=>n.more)||(r.push({k:'more',l:t('nav_more'),more:[]}),r[r.length-1]); const add=[{k:'staff',l:t('nav_staff')},{k:'assets',l:t('nav_assets')},{k:'policy',l:t('nav_policy')},{k:'guide',l:t('nav_guide')}]; if(isBossRole(u)) add.push({k:'company',l:t('nav_company')});
  add.forEach(it=>{ if(!r.some(n=>n.k===it.k)&&!more.more.some(n=>n.k===it.k)) more.more.push(it); }); return r; };
const _renderCo=render; render=function(){ try{ if(DB) coApply(); }catch(e){} return _renderCo.apply(this,arguments); };
/* nhắc kiểm định dụng cụ */
const _todayTasksA=todayTasks; todayTasks=function(u){ const L0=_todayTasksA(u); if(['manager','dev','warehouse'].includes(u.role)){ seedAssets(); const c=DB.assets.filter(a=>a.calibDue&&a.calibDue-Date.now()<15*DAYMS&&a.status!=='disposed'); if(c.length) L0.push({key:'td_calib',n:c.length,items:c.map(a=>({asset:1,no:a.code,company:a.name+' · '+fmtD(a.calibDue)}))}); } return L0; };
const _taskItemA=taskItem; taskItem=function(x){ if(x.asset) return `<button class="mini-item" data-a="nav" data-k="assets"><span class="t"><div><span class="mono">${esc(x.no)}</span> ${esc(x.company)}</div></span></button>`; return _taskItemA(x); };
AI_TOOLS.push({name:'nhan_su',description:'Danh sách nhân sự và mỗi người đang làm gì: số phiếu sửa đang giữ, phiếu công tác, việc quá hạn, tài sản đang giữ.',execute:()=>(DB.users||[]).filter(u=>STAFF_ROLES.includes(u.role)&&(isBossRole(me())||u.id===S.userId)).map(u=>{ const l=staffLoad(u); return {ten:u.name,vai_tro:t('role_'+u.role),sdt:u.phone||'',phieu_sua:l.tk.map(x=>x.no+' '+stepName(x)),cong_tac:l.fj.map(j=>j.no+' '+fmtD(j.date)),qua_han:l.late,tai_san:l.assets.map(a=>a.code+' '+a.name)}; })},
  {name:'tai_san',description:'Tài sản, dụng cụ, xe của công ty: ai đang giữ, trạng thái, hạn kiểm định.',execute:()=>{ seedAssets(); return DB.assets.map(a=>({ma:a.code,ten:a.name,trang_thai:t('ass_'+a.status),nguoi_giu:uname(a.holder)||'',kiem_dinh:a.calibDue?fmtD(a.calibDue):''})); }});
Object.assign(DICT.vi,{ nav_company:'Thông tin công ty', nav_staff:'Nhân sự', nav_assets:'Tài sản & dụng cụ', nav_guide:'Hướng dẫn quy trình', nav_more:'Thêm', ai_tool_nhan_su:'Xem nhân sự', ai_tool_tai_san:'Xem tài sản',
  co_sub:'Thông tin này tự điền vào mọi giấy tờ: báo giá, hợp đồng, phiếu thu chi…', co_info:'Thông tin pháp lý', co_preview:'Xem trước đầu giấy tờ', co_hint:'Sửa xong bấm Lưu. Giấy tờ đã chỉnh tay trước đó giữ nguyên; giấy tờ mới hoặc bấm "Điền lại từ dữ liệu" sẽ dùng thông tin mới.',
  co_name:'Tên công ty', co_mst:'Mã số thuế', co_phone:'Hotline', co_email:'Email', co_web:'Website', co_addr:'Địa chỉ', co_bank_acc:'Số tài khoản', co_bank_name:'Ngân hàng', co_director:'Người đại diện', co_dir_title:'Chức vụ', co_dir_gender:'Danh xưng',
  stf_sub:'Hồ sơ, việc đang làm, KPI và tài sản của từng người', stf_add:'Thêm tài khoản', stf_total:'Nhân sự', stf_busy:'Việc đang làm', stf_busy_h:'phiếu sửa + công tác', stf_late:'Việc quá hạn', stf_assets:'Tài sản đang cấp', stf_tk:'Phiếu sửa đang giữ', stf_fj:'Phiếu công tác', stf_tasks:'Việc cần làm', stf_pick:'Chọn một người để xem chi tiết',
  stf_doing:'Đang làm', stf_free:'Hiện không giữ phiếu nào.', stf_kpi_m:'KPI tháng này', stf_profile:'Hồ sơ', stf_position:'Vị trí / chức danh', stf_position_ph:'VD: Kỹ thuật viên board công suất', stf_start:'Ngày vào làm', stf_skills:'Kỹ năng, chứng chỉ', stf_skills_ph:'VD: Sungrow, Huawei, hàn SMD, an toàn điện', stf_assets_h:'Tài sản đang giữ', stf_no_assets:'Không giữ tài sản nào.', stf_recent:'Hoạt động gần đây',
  as_sub:'Dụng cụ đo, máy hàn, laptop, xe… — ai đang giữ, hạn kiểm định', as_new:'Thêm tài sản', as_edit:'Sửa tài sản', as_total:'Tổng tài sản', as_calib:'Sắp / quá hạn kiểm định', as_name:'Tên tài sản', as_name_ph:'VD: Đồng hồ đo cách điện Kyoritsu 3025A', as_type:'Loại', as_holder:'Người giữ', as_calib_due:'Hạn kiểm định / đăng kiểm', as_calib_h:'Để trống nếu không cần kiểm định', as_value:'Giá trị (đ)', as_buy:'Ngày mua',
  as_issue:'Cấp phát', as_return:'Thu hồi', as_to:'Cấp cho', as_issue_img:'Hình bàn giao (không bắt buộc)', as_since:'giữ từ {d}', ass_stock:'Trong kho', ass_issued:'Đang cấp phát', ass_broken:'Hỏng', ass_disposed:'Đã thanh lý',
  ast_meter:'Dụng cụ đo', ast_solder:'Máy hàn', ast_scope:'Máy hiện sóng', ast_laptop:'Máy tính', ast_vehicle:'Xe', ast_tool:'Dụng cụ', ast_other:'Khác', n_as_issue:'Bạn được cấp {c} – {n}',
  pol_sub:'Chính sách bảo hành dịch vụ sửa chữa của SGE', pol_edit:'Sửa chính sách',
  gd_sub:'Từng bước làm việc, ai làm, bấm ở đâu, cần chụp hình gì', gd_mine:'Chỉ xem phần việc của tôi', gd_steps:'bước', gd_anyone:'Bất kỳ ai', gd_you:'Bạn',
  gd_repair:'Nhận máy & sửa chữa tại xưởng', gd_repair_h:'Từ lúc nhận máy đến khi giao trả và xuất hóa đơn', gd_rework:'Máy báo lỗi lại sau khi giao', gd_rework_h:'Bảo hành sau sửa chữa', gd_outsource:'Thuê đơn vị khác sửa', gd_outsource_h:'SGE vẫn báo giá và xuất hóa đơn cho khách',
  gd_field:'Bảo trì / sửa tại công trình', gd_field_h:'Lên lịch, đi công trình, khách ký biên bản', gd_expense:'Mua hàng & đề nghị chi phí', gd_expense_h:'Có hay không có hóa đơn đều phải chụp hình', gd_cash:'Quỹ tiền mặt', gd_cash_h:'Thu, chi, bán lẻ, kiểm quỹ', gd_stock:'Kho', gd_stock_h:'Xuất, nhập trả, đặt mua, kiểm kê', gd_om:'Hợp đồng bảo trì định kỳ', gd_om_h:'Lập hợp đồng, lịch bảo trì, thu tiền theo kỳ',
  g_r1:'Bấm "Nhận máy" (hoặc Phiếu sửa chữa mới). Gõ serial → model và tình trạng bảo hành tự hiện. Nhập khách, người liên hệ. BẮT BUỘC chụp hình máy lúc nhận.', g_r2:'Vào "Việc cần làm" → Phiếu chưa phân công → chọn kỹ thuật viên.',
  g_r3:'Bấm "Xác nhận đã nhận máy". Ghi chẩn đoán, thêm linh kiện dự kiến → "Lưu & gửi duyệt" (bắt buộc tải báo cáo biến tần). Không sửa được thì bấm "Không sửa được". Cần bên ngoài sửa thì bấm "Thuê ngoài sửa".',
  g_r4:'Mở phiếu → khung "Duyệt linh kiện dự kiến": xem tồn kho → "Duyệt linh kiện". Hệ thống tự tạo báo giá nháp.', g_r5:'Chỉnh giá (dùng "Bảng giá" nếu cần), chọn % đặt cọc → "Gửi báo giá cho khách" (bắt buộc lưu file báo giá). Báo giá trên 20 triệu hoặc dưới giá vốn phải quản lý duyệt.',
  g_r6:'Khách đồng ý → bấm "Khách đồng ý sửa". Ký hợp đồng giấy xong → "Đã ký hợp đồng" + tải scan. Thu cọc nếu có (bắt buộc hình chứng từ).', g_r7:'Khung "Kho · Xuất linh kiện": "Tiếp nhận yêu cầu" → chờ quản lý duyệt → "Xuất kho" (bắt buộc hình phiếu xuất). Thiếu hàng: "Tạo đề nghị mua hàng thiếu".',
  g_r8:'Sửa xong: ghi linh kiện thực tế đã thay → "Hoàn tất sửa → Kiểm tra" (bắt buộc hình sau sửa). Phát sinh thêm lỗi: bấm "Phát sinh".', g_r9:'Kiểm tra đạt → "Đạt, chuyển chờ giao máy" (bắt buộc hình test).',
  g_r10:'Khung "Máy chờ giao · Thanh toán" → "Xác nhận đã nhận tiền" + hình chứng từ. Chưa thu đủ thì không giao máy được.', g_r11:'Chọn hình thức giao, mã vận đơn → "Xác nhận đã giao máy" (bắt buộc hình giao). In phiếu bảo hành trong khung "Giấy tờ".', g_r12:'"Xuất hóa đơn" + tải file hóa đơn → phiếu đóng.',
  g_w1:'Mở phiếu cũ đã giao → "Báo lỗi lại / bảo hành sau sửa". Thông tin khách và serial tự điền; ghi lỗi, chụp hình.', g_w2:'Khung "Xác định bảo hành sau sửa": chọn THUỘC bảo hành (lỗi do lần sửa trước) hoặc KHÔNG (chọn lý do theo chính sách).',
  g_w3:'Thuộc bảo hành: duyệt linh kiện → hệ thống bỏ qua báo giá, tự chuyển sửa miễn phí. Không thuộc: báo giá như thường.', g_w4:'Sửa, kiểm tra, giao máy như quy trình thường. Chi phí bảo hành tự tính vào phiếu cũ.',
  g_o1:'Trong phiếu bấm "Thuê ngoài sửa": chọn đơn vị (hoặc thêm mới), nội dung, tải biên bản / hình máy gửi đi.', g_o2:'Bên ngoài báo giá → "Nhập báo giá bên ngoài" + tải file. Hệ thống gợi ý giá báo khách +25%.', g_o3:'Báo giá cho khách như quy trình thường; khách đồng ý thì phiếu chuyển "Đang sửa ngoài".',
  g_o4:'Nhận máy về → "Đã nhận máy về": nhập chi phí thực, tải hóa đơn/bill của họ. Hệ thống tạo đề nghị chi trả bên ngoài.', g_o5:'Duyệt đề nghị chi trả bên ngoài; kế toán chi và tải hình đã chi.',
  g_f1:'Mục "Công trình" → "Tạo phiếu công tác": chọn công trình, loại việc, ngày, bấm chọn người đi. Hợp đồng bảo trì đến kỳ: bấm "Lên lịch".', g_f2:'Mở phiếu → thêm vật tư mang theo → "Xuất vật tư cho đội".', g_f3:'Đến nơi bấm "Bắt đầu tại công trình". Chụp hình trước khi làm.',
  g_f4:'Đi qua danh mục kiểm tra (Đạt / Không đạt / Không áp dụng), nhập thông số từng biến tần, ghi vật tư đã dùng, đánh giá & kiến nghị, chụp hình sau.', g_f5:'Khách ký tên trên màn hình (hoặc chụp biên bản giấy) → "Hoàn thành". In biên bản trong phiếu.', g_f6:'Nhập chi phí đi lại, ăn ở (mỗi khoản phải có hình bill) → "Đóng phiếu". Vật tư dư tự nhập lại kho.',
  g_e1:'Tài chính → Chi phí → "Đề nghị chi": chọn nhóm, số tiền, nội dung, loại chứng từ (hóa đơn VAT / bill / không hóa đơn) và BẮT BUỘC chụp hình hàng mua, bill.', g_e2:'Bấm vào phiếu để xem hình → "Duyệt" hoặc "Từ chối".', g_e3:'Bấm "Chi tiền": chọn tiền mặt từ quỹ hoặc chuyển khoản, BẮT BUỘC tải hình đã chi (ký nhận tiền / ảnh chuyển khoản).',
  g_c1:'Ngày đầu: Tài chính → Quỹ tiền mặt → "Số dư đầu" (số tiền thực có trong két).', g_c2:'Bán board/linh kiện lẻ không VAT: "Bán lẻ không VAT" → chọn hàng, giá → thu tiền (tự trừ kho).', g_c3:'Chi tiền mặt khác: "Phiếu chi" + hình bill / biên nhận. Trên 5 triệu chờ quản lý duyệt.', g_c4:'Mỗi tuần: "Kiểm quỹ" → đếm số tờ từng mệnh giá; lệch thì ghi lý do.',
  g_s1:'Kho → "Yêu cầu xuất kho": tiếp nhận và xuất cho phiếu sửa (kèm hình). Hàng dư và xác linh kiện cũ: "Xác nhận đã nhận về kho".', g_s2:'Nhập hàng mua: Đơn mua NCC → nhận hàng → chụp hóa đơn/bill (có hay không VAT đều phải có hình).', g_s3:'Kiểm kê: tab "Kiểm kê" → "Tạo phiếu kiểm kê" → nhập số đếm thực tế, ghi lý do lệch → gửi duyệt.', g_s4:'Duyệt phiếu kiểm kê → tồn kho tự điều chỉnh.',
  g_m1:'Công trình → "Thêm công trình" (dán danh sách biến tần từ Excel) → "Thêm HĐ bảo trì": chu kỳ bảo trì và kỳ thu tiền.', g_m2:'Mỗi kỳ hệ thống tự tạo chứng từ thu tiền: "Xuất HĐ" (tải hóa đơn) và "Thu tiền" (tải chứng từ).', g_m3:'Đến kỳ bảo trì hệ thống nhắc trước 7 ngày → bấm "Lên lịch" tạo phiếu công tác.',
  td_calib:'Dụng cụ / xe sắp đến hạn kiểm định', au_company_edit:'Sửa thông tin công ty', au_staff_edit:'Sửa hồ sơ nhân sự', au_asset_save:'Lưu tài sản', au_asset_issue:'Cấp phát tài sản', au_asset_return:'Thu hồi tài sản' });
Object.assign(DICT.en,{ nav_company:'Company info', nav_staff:'Staff', nav_assets:'Assets & tools', nav_guide:'Process guide', nav_more:'More', ai_tool_nhan_su:'Reading staff', ai_tool_tai_san:'Reading assets',
  co_sub:'Used on every document: quotes, contracts, vouchers…', co_info:'Legal details', co_preview:'Document header preview', co_hint:'Save to apply. Hand-edited documents keep their text; new ones or "Refill from data" use the new details.',
  co_name:'Company name', co_mst:'Tax code', co_phone:'Hotline', co_email:'Email', co_web:'Website', co_addr:'Address', co_bank_acc:'Bank account', co_bank_name:'Bank', co_director:'Legal representative', co_dir_title:'Position', co_dir_gender:'Title',
  stf_sub:'Profile, current work, KPI and assets per person', stf_add:'Add account', stf_total:'Staff', stf_busy:'Open work', stf_busy_h:'repair + field jobs', stf_late:'Overdue', stf_assets:'Assets issued', stf_tk:'Repair jobs', stf_fj:'Field jobs', stf_tasks:'To-dos', stf_pick:'Select a person',
  stf_doing:'Working on', stf_free:'No open jobs.', stf_kpi_m:'KPI this month', stf_profile:'Profile', stf_position:'Position', stf_position_ph:'e.g. power board technician', stf_start:'Start date', stf_skills:'Skills, certificates', stf_skills_ph:'e.g. Sungrow, Huawei, SMD soldering', stf_assets_h:'Assets held', stf_no_assets:'No assets held.', stf_recent:'Recent activity',
  as_sub:'Meters, soldering stations, laptops, vehicles — who holds them, calibration due', as_new:'Add asset', as_edit:'Edit asset', as_total:'Total assets', as_calib:'Calibration due', as_name:'Name', as_name_ph:'e.g. insulation tester', as_type:'Type', as_holder:'Holder', as_calib_due:'Calibration / inspection due', as_calib_h:'Leave empty if not needed', as_value:'Value (₫)', as_buy:'Purchase date',
  as_issue:'Issue', as_return:'Return', as_to:'Issue to', as_issue_img:'Handover photo (optional)', as_since:'since {d}', ass_stock:'In store', ass_issued:'Issued', ass_broken:'Broken', ass_disposed:'Disposed',
  ast_meter:'Meter', ast_solder:'Soldering', ast_scope:'Oscilloscope', ast_laptop:'Computer', ast_vehicle:'Vehicle', ast_tool:'Tool', ast_other:'Other', n_as_issue:'You were issued {c} – {n}',
  pol_sub:'SGE repair-service warranty policy', pol_edit:'Edit policy',
  gd_sub:'Step by step: who, where to click, which photos', gd_mine:'Only my steps', gd_steps:'steps', gd_anyone:'Anyone', gd_you:'You',
  gd_repair:'Workshop repair', gd_repair_h:'From intake to handover and invoice', gd_rework:'Warranty return', gd_rework_h:'Unit fails again after repair', gd_outsource:'Outsourced repair', gd_outsource_h:'SGE still quotes and invoices',
  gd_field:'On-site maintenance / repair', gd_field_h:'Schedule, visit, customer sign-off', gd_expense:'Purchases & expenses', gd_expense_h:'Photos required with or without invoice', gd_cash:'Cash fund', gd_cash_h:'Receipts, payments, retail, counts', gd_stock:'Stock', gd_stock_h:'Issue, returns, purchasing, stocktake', gd_om:'O&M contracts', gd_om_h:'Contract, schedule, periodic billing',
  td_calib:'Tools / vehicles due for calibration', au_company_edit:'Company info edited', au_staff_edit:'Staff profile edited', au_asset_save:'Asset saved', au_asset_issue:'Asset issued', au_asset_return:'Asset returned' });
['g_r1','g_r2','g_r3','g_r4','g_r5','g_r6','g_r7','g_r8','g_r9','g_r10','g_r11','g_r12','g_w1','g_w2','g_w3','g_w4','g_o1','g_o2','g_o3','g_o4','g_o5','g_f1','g_f2','g_f3','g_f4','g_f5','g_f6','g_e1','g_e2','g_e3','g_c1','g_c2','g_c3','g_c4','g_s1','g_s2','g_s3','g_s4','g_m1','g_m2','g_m3'].forEach(k=>{ if(!DICT.en[k]) DICT.en[k]=DICT.vi[k]; });

/* ===================================================================
   CHẤM CÔNG & BẢNG LƯƠNG
   Nhân viên tự chấm vào / ra trên điện thoại · xin nghỉ · quản lý sửa công
   Bảng lương tháng: lương theo công + phụ cấp + tăng ca + thưởng KPI − BHXH − tạm ứng
   =================================================================== */
const WORK_START='08:00', WORK_END='17:00', STD_DAYS=26, KPI_BONUS={A:2000000,B:1000000,C:0,D:0}, BHXH_RATE=0.105;
const ATT_T=['work','half','leave','unpaid','off','absent'];
const dkey=ts=>toISODate(ts);
const attId=(uid,d)=>`${uid}_${d}`;
function attOf(uid,d){ DB.att=DB.att||[]; return DB.att.find(a=>a.id===attId(uid,d)); }
function attSet(uid,d,patch){ DB.att=DB.att||[]; let a=attOf(uid,d); if(!a){ a={id:attId(uid,d),uid,d,type:'work',ot:0}; DB.att.push(a); } Object.assign(a,patch); return a; }
const hm=ts=>ts?new Date(ts).toTimeString().slice(0,5):'';
const isLate=a=>a&&a.in&&hm(a.in)>WORK_START&&a.type==='work';
const isSun=d=>new Date(d+'T12:00:00').getDay()===0;
const canHR=()=>isBossRole(me())||can('fin_view')||can('pay_record');
/* ---- chấm công nhanh ở trang Việc cần làm ---- */
function attWidget(){ const u=me(); if(!u||isExternal(u)||!STAFF_ROLES.includes(u.role)) return ''; const d=dkey(Date.now()); const a=attOf(u.id,d);
  return `<div class="att-w card"><div class="att-w-l">${ic('clock',22)}<div><b>${t('att_today',{d:fmtD(Date.now())})}</b><small>${a&&a.in?t('att_in_at',{h:hm(a.in)})+(isLate(a)?` · <span style="color:var(--bad)">${t('att_late')}</span>`:'')+(a.out?' · '+t('att_out_at',{h:hm(a.out)}):''):t('att_not_yet')}</small></div></div>
    <div class="row" style="gap:8px">${!a||!a.in?`<button class="btn primary lg" data-a="attIn">${ic('play',16)} ${t('att_in')}</button>`:!a.out?`<button class="btn lg" data-a="attOut">${ic('check',16)} ${t('att_out')}</button>`:`<span class="kst k-ok">${t('att_done')}</span>`}<button class="btn" data-a="lvAsk">${t('lv_ask')}</button></div></div>`; }
A.attIn = () => { const u=me(); const d=dkey(Date.now()); attSet(u.id,d,{in:Date.now(),type:'work',src:'self'}); audit('att_in',u.name,hm(Date.now())); save(); rerender(); toast(t('toast_att_in',{h:hm(Date.now())}),'ok'); };
A.attOut = () => { const u=me(); const d=dkey(Date.now()); const a=attSet(u.id,d,{out:Date.now()}); const hrs=(a.out-a.in)/3600e3; if(hrs<5) a.type='half'; audit('att_out',u.name,hm(Date.now())); save(); rerender(); toast(t('toast_att_out',{h:hm(Date.now())}),'ok'); };
const _viewTodoAtt=viewTodo; viewTodo=function(){ const h=_viewTodoAtt(); return h.replace('<div class="stat-row task-stats">',attWidget()+'<div class="stat-row task-stats">'); };
/* ---- xin nghỉ ---- */
A.lvAsk = () => openModal({type:'lv',f:{from:dkey(Date.now()+DAYMS),to:dkey(Date.now()+DAYMS),type:'leave',reason:''}});
MODALS.lv = m => { const f=m.f; return { title:t('lv_ask'), body:`<div class="form-grid"><div class="field"><label>${t('lv_from')}</label><input class="input" type="date" data-bind="modal.f.from" value="${f.from}"></div><div class="field"><label>${t('lv_to')}</label><input class="input" type="date" data-bind="modal.f.to" value="${f.to}"></div>
  <div class="field full"><span class="lbl">${t('lv_type')}</span><div class="seg">${['leave','unpaid','half'].map(k=>`<button class="${f.type===k?'on':''}" data-a="lvType" data-v="${k}">${t('att_t_'+k)}</button>`).join('')}</div></div><div class="field full"><label class="req">${t('lv_reason')}</label><input class="input" data-bind="modal.f.reason" value="${esc(f.reason)}" placeholder="${t('lv_reason_ph')}"></div></div>`,
  foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="lvSave">${t('lv_send')}</button>` }; };
A.lvType = el => { S.ui.modal.f.type=el.dataset.v; rerender(); };
A.lvSave = () => { const f=S.ui.modal.f; if(!String(f.reason).trim()){ toast(t('e_required'),'bad'); return; } if(f.to<f.from){ toast(t('lv_bad'),'bad'); return; } DB.leaves=DB.leaves||[]; const l={id:'lv'+Date.now().toString(36),uid:S.userId,from:f.from,to:f.to,type:f.type,reason:f.reason.trim(),status:'pending',at:Date.now()}; DB.leaves.unshift(l);
  notify({toRole:'manager',key:'n_lv',vars:{u:uname(S.userId),a:fmtD(new Date(f.from+'T12:00').getTime()),b:fmtD(new Date(f.to+'T12:00').getTime())}}); S.ui.modal=null; save(); rerender(); toast(t('toast_lv'),'ok'); };
function lvDays(l){ const out=[]; let d=new Date(l.from+'T12:00:00'); const e=new Date(l.to+'T12:00:00'); while(d<=e&&out.length<62){ const k=dkey(d.getTime()); if(!isSun(k)) out.push(k); d.setDate(d.getDate()+1); } return out; }
A.lvDecide = el => { const l=(DB.leaves||[]).find(z=>z.id===el.dataset.id); l.status=el.dataset.v; l.by=S.userId; l.decidedAt=Date.now(); if(l.status==='approved') lvDays(l).forEach(d=>attSet(l.uid,d,{type:l.type,src:'leave',note:l.reason})); notify({toUser:l.uid,key:l.status==='approved'?'n_lv_ok':'n_lv_no',vars:{}}); audit('leave_'+l.status,uname(l.uid),`${l.from} → ${l.to}`); save(); rerender(); };
/* ---- bảng chấm công tháng ---- */
function monthDays(y,mo){ const n=new Date(y,mo+1,0).getDate(); return Array.from({length:n},(_,i)=>dkey(new Date(y,mo,i+1,12).getTime())); }
function attSummary(uid,days){ let cong=0,late=0,leave=0,unpaid=0,absent=0,ot=0; const today=dkey(Date.now()); days.forEach(d=>{ const a=attOf(uid,d); if(isSun(d)&&!(a&&a.in)) return; if(!a){ if(d<today) absent++; return; }
  if(a.type==='work'){ cong+=1; if(isLate(a)) late++; } else if(a.type==='half'){ cong+=0.5; } else if(a.type==='leave'){ cong+=1; leave++; } else if(a.type==='unpaid'){ unpaid++; } else if(a.type==='absent'){ absent++; } ot+=Number(a.ot)||0; }); return {cong,late,leave,unpaid,absent,ot}; }
function viewAtt(){ const f=S.ui.att||(S.ui.att={ym:dkey(Date.now()).slice(0,7)}); const [y,mo]=f.ym.split('-').map(Number); const days=monthDays(y,mo-1); const hr=canHR(); const us=(DB.users||[]).filter(u=>STAFF_ROLES.includes(u.role)&&u.active!==false&&(hr||u.id===S.userId)); const today=dkey(Date.now());
  const sym=(u,d)=>{ const a=attOf(u.id,d); if(!a){ return isSun(d)?'<span class="ac off">CN</span>':d<today?'<span class="ac absent">K</span>':'<span class="ac"></span>'; } const cls=a.type==='work'?(isLate(a)?'late':'ok'):a.type; const s={work:'✓',half:'½',leave:'P',unpaid:'KL',off:'—',absent:'K'}[a.type]; return `<span class="ac ${cls}" title="${a.in?hm(a.in):''}${a.out?' – '+hm(a.out):''}${a.ot?' · OT '+a.ot+'h':''}${a.note?' · '+esc(a.note):''}">${s}${a.ot?'<sup>+</sup>':''}</span>`; };
  const pend=(DB.leaves||[]).filter(l=>l.status==='pending'&&(hr||l.uid===S.userId));
  return `<div class="page-head"><div><h1>${t('nav_att')}</h1><div class="sub">${t('att_sub',{s:WORK_START,e:WORK_END})}</div></div><div class="row" style="gap:8px"><input class="input" type="month" style="width:auto" data-bind="att.ym" data-re value="${f.ym}"><button class="btn" data-a="lvAsk">${t('lv_ask')}</button>${hr?`<button class="btn primary" data-a="nav" data-k="payroll">${ic('file',15)} ${t('nav_payroll')}</button>`:''}</div></div>
  ${attWidget()}
  ${pend.length?`<div class="card" style="margin-bottom:14px;border-color:var(--warn)"><div class="card-h"><h3>${t('lv_pending')}</h3><span class="kst k-warn">${pend.length}</span></div><div class="card-b">${pend.map(l=>`<div class="dl-row"><div class="dl-l">${ic('clock',16)}<div><b>${esc(uname(l.uid))} · ${t('att_t_'+l.type)}</b><small class="muted">${fmtD(new Date(l.from+'T12:00').getTime())} → ${fmtD(new Date(l.to+'T12:00').getTime())} · ${esc(l.reason)}</small></div></div><div class="dl-a">${isBossRole(me())?`<button class="btn sm okb" data-a="lvDecide" data-id="${l.id}" data-v="approved">${t('approve')}</button><button class="btn sm danger" data-a="lvDecide" data-id="${l.id}" data-v="rejected">${t('reject')}</button>`:`<span class="hint">${t('cv_wait_mgr')}</span>`}</div></div>`).join('')}</div></div>`:''}
  <div class="card"><div class="card-h"><h3>${t('att_grid')}</h3><span class="hint">${t('att_legend')}</span></div><div class="table-wrap"><table class="tbl att-tbl"><thead><tr><th class="att-name">${t('nav_staff')}</th>${days.map(d=>`<th class="${isSun(d)?'sun':''} ${d===today?'tod':''}">${+d.slice(8)}</th>`).join('')}<th class="r">${t('att_cong')}</th><th class="r">${t('att_late_n')}</th><th class="r">P</th><th class="r">K</th><th class="r">OT</th></tr></thead>
  <tbody>${us.map(u=>{ const s=attSummary(u.id,days); return `<tr><td class="att-name"><b>${esc(u.name)}</b><br><small class="muted">${t('role_'+u.role)}</small></td>${days.map(d=>`<td class="${isSun(d)?'sun':''} ${d===today?'tod':''}">${isBossRole(me())?`<button class="ac-btn" data-a="attEdit" data-u="${u.id}" data-d="${d}">${sym(u,d)}</button>`:sym(u,d)}</td>`).join('')}<td class="r num"><b>${s.cong}</b></td><td class="r num" style="${s.late?'color:var(--warn)':''}">${s.late}</td><td class="r num">${s.leave}</td><td class="r num" style="${s.absent?'color:var(--bad)':''}">${s.absent+s.unpaid}</td><td class="r num">${s.ot||''}</td></tr>`; }).join('')}</tbody></table></div></div>`; }
A.attEdit = el => { const a=attOf(el.dataset.u,el.dataset.d)||{}; openModal({type:'attEd',u:el.dataset.u,d:el.dataset.d,f:{type:a.type||'work',in:hm(a.in)||WORK_START,out:hm(a.out)||WORK_END,ot:a.ot||0,note:a.note||''}}); };
MODALS.attEd = m => { const f=m.f; return { title:`${esc(uname(m.u))} · ${fmtD(new Date(m.d+'T12:00').getTime())}`, body:`<div class="field"><span class="lbl">${t('att_type')}</span><div class="seg" style="flex-wrap:wrap">${ATT_T.map(k=>`<button class="${f.type===k?'on':''}" data-a="attType" data-v="${k}">${t('att_t_'+k)}</button>`).join('')}</div></div>
  ${['work','half'].includes(f.type)?`<div class="form-grid" style="margin-top:10px"><div class="field"><label>${t('att_in')}</label><input class="input" type="time" data-bind="modal.f.in" value="${f.in}"></div><div class="field"><label>${t('att_out')}</label><input class="input" type="time" data-bind="modal.f.out" value="${f.out}"></div><div class="field"><label>${t('att_ot')}</label><input class="input num" type="number" min="0" step="0.5" data-bind="modal.f.ot" value="${f.ot}"></div></div>`:''}
  <div class="field" style="margin-top:10px"><label>${t('note_l')}</label><input class="input" data-bind="modal.f.note" value="${esc(f.note)}"></div>`,
  foot:`<button class="btn danger" data-a="attClear">${t('att_clear')}</button><span class="grow"></span><button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="attSave">${t('save')}</button>` }; };
A.attType = el => { S.ui.modal.f.type=el.dataset.v; rerender(); };
A.attSave = () => { const m=S.ui.modal,f=m.f; const ts=h=>h?new Date(m.d+'T'+h+':00').getTime():null; attSet(m.u,m.d,{type:f.type,in:['work','half'].includes(f.type)?ts(f.in):null,out:['work','half'].includes(f.type)?ts(f.out):null,ot:Number(f.ot)||0,note:f.note,src:'admin',by:S.userId}); audit('att_edit',uname(m.u),`${m.d} ${t('att_t_'+f.type)}`); S.ui.modal=null; save(); rerender(); };
A.attClear = () => { const m=S.ui.modal; DB.att=(DB.att||[]).filter(a=>a.id!==attId(m.u,m.d)); S.ui.modal=null; save(); rerender(); };
/* ---- bảng lương ---- */
function payLine(u,ym){ const [y,mo]=ym.split('-').map(Number); const days=monthDays(y,mo-1); const s=attSummary(u.id,days); const base=Number(u.salary)||0; const daily=base/STD_DAYS;
  const r={from:new Date(y,mo-1,1).getTime(),to:new Date(y,mo,1).getTime()}; let grade='—'; try{ const k=kpiOf(u,r); const all=(DB.users||[]).filter(x=>x.role===u.role).map(x=>kpiOf(x,r).actions); grade=kpiGrade(kpiScore(k,Math.max(...all,1))); }catch(e){}
  const adj=((DB.payAdj||{})[ym+'_'+u.id])||{}; const workPay=Math.round(daily*Math.min(s.cong,STD_DAYS+5)); const otPay=Math.round(daily/8*1.5*s.ot); const allow=Number(u.allowance)||0; const bonus=adj.bonus!=null?Number(adj.bonus):(KPI_BONUS[grade]||0);
  const ins=u.insured?Math.round(base*BHXH_RATE):0; const adv=(DB.cashv||[]).filter(v=>v.status==='done'&&v.cat==='advance'&&v.staffId===u.id&&v.at>=r.from&&v.at<r.to).reduce((a,v)=>a+v.amount,0)-(DB.cashv||[]).filter(v=>v.status==='done'&&v.cat==='refund_adv'&&v.staffId===u.id&&v.at>=r.from&&v.at<r.to).reduce((a,v)=>a+v.amount,0);
  const other=Number(adj.deduct)||0; const net=workPay+otPay+allow+bonus-ins-adv-other; return {u,s,base,workPay,otPay,allow,bonus,grade,ins,adv,other,net,note:adj.note||''}; }
function viewPayroll(){ if(!canHR()) return `<div class="card empty">${t('no_perm')}</div>`; const f=S.ui.pr||(S.ui.pr={ym:dkey(Date.now()).slice(0,7)}); DB.payrolls=DB.payrolls||[]; const pr=DB.payrolls.find(p=>p.ym===f.ym);
  const us=(DB.users||[]).filter(u=>STAFF_ROLES.includes(u.role)&&u.active!==false); const lines=pr&&pr.status!=='draft'?pr.lines:us.map(u=>payLine(u,f.ym)); const tot=lines.reduce((a,l)=>a+l.net,0); const st=pr?pr.status:'draft'; const boss=isBossRole(me());
  const missing=us.filter(u=>!Number(u.salary));
  return `<div class="page-head"><div><h1>${t('nav_payroll')}</h1><div class="sub">${t('pr_sub',{d:STD_DAYS})}</div></div><div class="row" style="gap:8px"><input class="input" type="month" style="width:auto" data-bind="pr.ym" data-re value="${f.ym}"><span class="kst ${st==='paid'?'k-ok':st==='approved'?'k-blue':'k-warn'}">${t('prs_'+st)}</span></div></div>
  <div class="stat-row task-stats"><div class="card stat"><div class="l">${t('pr_total')}</div><div class="v">${money(tot)}</div></div><div class="card stat"><div class="l">${t('pr_people')}</div><div class="v">${lines.length}</div></div><div class="card stat"><div class="l">${t('pr_bonus')}</div><div class="v" style="color:var(--ok)">${money(lines.reduce((a,l)=>a+l.bonus,0))}</div></div><div class="card stat"><div class="l">${t('pr_ins')}</div><div class="v">${money(lines.reduce((a,l)=>a+l.ins,0))}</div></div></div>
  ${missing.length&&st==='draft'?`<div class="tk-al warn" style="margin-bottom:12px">${ic('alert',15)}<span>${t('pr_missing',{n:missing.map(u=>u.name).join(', ')})} <button class="link-btn" data-a="nav" data-k="staff">${t('nav_staff')} →</button></span></div>`:''}
  <div class="card"><div class="table-wrap"><table class="tbl cards pr-tbl"><thead><tr><th>${t('nav_staff')}</th><th class="r">${t('pr_base')}</th><th class="r">${t('att_cong')}</th><th class="r">${t('pr_work')}</th><th class="r">OT</th><th class="r">${t('pr_allow')}</th><th class="r">${t('pr_kpi')}</th><th class="r">BHXH</th><th class="r">${t('pr_adv')}</th><th class="r">${t('pr_other')}</th><th class="r">${t('pr_net')}</th><th></th></tr></thead><tbody>
  ${lines.map(l=>`<tr><td data-l="${t('nav_staff')}"><b>${esc(l.u.name||uname(l.u.id))}</b><br><small class="muted">${t('role_'+l.u.role)}</small></td><td data-l="${t('pr_base')}" class="r num">${money(l.base)}</td><td data-l="${t('att_cong')}" class="r num">${l.s.cong}/${STD_DAYS}${l.s.late?`<br><small style="color:var(--warn)">${l.s.late} ${t('att_late_n').toLowerCase()}</small>`:''}</td><td data-l="${t('pr_work')}" class="r num">${money(l.workPay)}</td><td data-l="OT" class="r num">${l.otPay?money(l.otPay):'—'}</td><td data-l="${t('pr_allow')}" class="r num">${money(l.allow)}</td>
    <td data-l="${t('pr_kpi')}" class="r num"><span class="kgrade g${l.grade}" style="width:22px;height:22px;font-size:12px">${l.grade}</span> ${st==='draft'&&boss?`<input class="input sm num" style="width:110px" type="number" data-pradj="bonus" data-u="${l.u.id}" value="${l.bonus}">`:money(l.bonus)}</td><td data-l="BHXH" class="r num">${l.ins?'−'+money(l.ins):'—'}</td><td data-l="${t('pr_adv')}" class="r num">${l.adv?'−'+money(l.adv):'—'}</td>
    <td data-l="${t('pr_other')}" class="r num">${st==='draft'&&boss?`<input class="input sm num" style="width:100px" type="number" data-pradj="deduct" data-u="${l.u.id}" value="${l.other||''}">`:l.other?'−'+money(l.other):'—'}</td><td data-l="${t('pr_net')}" class="r num"><b style="font-size:15px">${money(l.net)}</b></td><td class="nowrap"><button class="icon-btn" data-a="nav" data-k="ed:ps|${f.ym}_${l.u.id}|ps" title="${t('pr_slip')}">${ic('print',15)}</button></td></tr>`).join('')}
  <tr class="pr-tot"><td><b>${t('grand_total')}</b></td><td colspan="9"></td><td class="r num"><b>${money(tot)}</b></td><td></td></tr></tbody></table></div>
  <div class="card-b row" style="gap:8px;flex-wrap:wrap;justify-content:flex-end">${st==='draft'&&boss?`<button class="btn primary" data-a="prApprove">${ic('check',15)} ${t('pr_approve')}</button>`:''}${st==='approved'&&boss?`<button class="btn" data-a="prReopen">${t('pr_reopen')}</button>`:''}${st==='approved'&&can('pay_record')?`<button class="btn primary" data-a="prPayAsk">${t('pr_pay')}</button>`:''}${st==='paid'?`<span class="hint">${t('pr_paid_at',{d:fmtDT(pr.paidAt),u:esc(uname(pr.paidBy))})}</span>`:''}</div></div>
  <p class="hint" style="margin-top:8px">${t('pr_formula',{d:STD_DAYS,a:money(KPI_BONUS.A),b:money(KPI_BONUS.B)})}</p>`; }
document.addEventListener('change',ev=>{ const el=ev.target; const k=el&&el.dataset&&el.dataset.pradj; if(!k) return; const ym=S.ui.pr.ym; DB.payAdj=DB.payAdj||{}; const key=ym+'_'+el.dataset.u; DB.payAdj[key]=Object.assign({},DB.payAdj[key]||{},{[k]:el.value===''?null:Number(el.value)}); save(); rerender(); });
A.prApprove = () => { const ym=S.ui.pr.ym; const us=(DB.users||[]).filter(u=>STAFF_ROLES.includes(u.role)&&u.active!==false); const lines=us.map(u=>{ const l=payLine(u,ym); return Object.assign({},l,{u:{id:u.id,name:u.name,role:u.role}}); }); DB.payrolls=DB.payrolls||[]; DB.payrolls=DB.payrolls.filter(p=>p.ym!==ym); DB.payrolls.unshift({id:'pr'+ym.replace('-',''),ym,status:'approved',lines,approvedBy:S.userId,approvedAt:Date.now()}); audit('payroll_ok',ym,money(lines.reduce((a,l)=>a+l.net,0))); save(); rerender(); toast(t('toast_pr_ok'),'ok'); };
A.prReopen = () => { const ym=S.ui.pr.ym; DB.payrolls=(DB.payrolls||[]).filter(p=>p.ym!==ym); save(); rerender(); };
A.prPayAsk = () => openModal({type:'prPay',f:{method:'bank',files:[]},err:{}});
MODALS.prPay = m => { const pr=DB.payrolls.find(p=>p.ym===S.ui.pr.ym); const tot=pr.lines.reduce((a,l)=>a+l.net,0); const f=m.f; return { title:`${t('pr_pay')} ${pr.ym}`, body:`<p style="margin:0 0 10px">${t('pr_total')}: <b>${money(tot)}</b></p><div class="field"><span class="lbl">${t('pay_method')}</span><div class="seg">${['bank','cash'].map(k=>`<button class="${f.method===k?'on':''}" data-a="prPayM" data-v="${k}">${t('pm_'+k)}</button>`).join('')}</div>${f.method==='cash'?`<div class="hint">${t('fund_now',{a:money(fundBalance())})}</div>`:''}</div><div class="field" style="margin-top:10px"><span class="lbl req">${t('exv_pay_imgs')}</span>${fileBox(f,m.err||{},'osFiles')}<div class="hint">${t('pr_pay_hint')}</div></div>`, foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="prPay">${t('exp_pay_ok')}</button>` }; };
A.prPayM = el => { S.ui.modal.f.method=el.dataset.v; rerender(); };
A.prPay = () => { const m=S.ui.modal; const pr=DB.payrolls.find(p=>p.ym===S.ui.pr.ym); const tot=pr.lines.reduce((a,l)=>a+l.net,0); if(!m.f.files.length){ m.err={files:t('pay_proof_req')}; rerender(); return; } if(m.f.method==='cash'&&tot>fundBalance()){ toast(t('fund_short',{a:money(fundBalance())}),'bad'); return; }
  const now=Date.now(); DB.expenses.unshift({id:'ex'+now.toString(36),no:erpNo('CP'),at:now,cat:'salary',amount:tot,desc:{vi:t('pr_exp',{m:pr.ym}),en:'Payroll '+pr.ym},ticketId:null,sn:'',svcId:null,by:S.userId,status:'paid',approvedBy:pr.approvedBy,approvedAt:pr.approvedAt,paidAt:now,paidBy:S.userId,method:m.f.method,images:m.f.files.slice(),payImages:m.f.files.slice(),docType:'none',payrollId:pr.id});
  pr.status='paid'; pr.paidAt=now; pr.paidBy=S.userId; pr.lines.forEach(l=>notify({toUser:l.u.id,key:'n_payslip',vars:{m:pr.ym,a:money(l.net)}})); audit('payroll_paid',pr.ym,money(tot)); S.ui.modal=null; save(); rerender(); toast(t('toast_pr_paid'),'ok'); };
if(!EXP_CATS.includes('salary')) EXP_CATS.push('salary');
/* phiếu lương (in / Word / PDF) */
function slipDoc(ym,uid){ const pr=(DB.payrolls||[]).find(p=>p.ym===ym); const u=userById(uid)||{id:uid,name:uname(uid),role:''}; const l=pr&&pr.lines.find(x=>x.u.id===uid)||payLine(u,ym); const [y,mo]=ym.split('-');
  const row=(a,b,neg)=>`<tr><td>${a}</td><td class="r">${neg&&b?'−':''}${vnd(b)}</td></tr>`;
  return `<div class="a4 sgedoc"><table class="lh"><tr><td style="width:24%"><img src="${SGE_LOGO}" alt="SGE" style="height:64px"></td><td><b>${SGE_CO.name}</b><br>${SGE_CO.addr}</td></tr></table><h2 class="ttl">PHIẾU LƯƠNG THÁNG ${mo}/${y}</h2>
  <table class="info"><tr><td style="width:30%">Họ và tên</td><td>: <b>${esc(l.u.name||u.name)}</b></td></tr><tr><td>Bộ phận</td><td>: ${t('role_'+(l.u.role||u.role))}</td></tr><tr><td>Ngày công</td><td>: ${l.s.cong} / ${STD_DAYS} (đi trễ ${l.s.late}, nghỉ phép ${l.s.leave}, tăng ca ${l.s.ot} giờ)</td></tr><tr><td>Xếp loại KPI</td><td>: ${l.grade}</td></tr></table>
  <table class="grid dg" style="margin-top:12px"><tr><th>Khoản</th><th style="width:30%">Số tiền (đ)</th></tr>${row('Lương cơ bản',l.base)}${row('Lương theo ngày công',l.workPay)}${row('Tăng ca',l.otPay)}${row('Phụ cấp',l.allow)}${row('Thưởng KPI',l.bonus)}${row('BHXH, BHYT, BHTN (10,5%)',l.ins,1)}${row('Tạm ứng trong tháng',l.adv,1)}${row('Khấu trừ khác',l.other,1)}<tr><td><b>THỰC LĨNH</b></td><td class="r"><b>${vnd(l.net)}</b></td></tr></table>
  <p><i>Bằng chữ: ${viWords(Math.max(0,l.net))}</i></p><table class="sign" style="margin-top:20px"><tr><td><b>Người lập</b><br><i>(Ký, họ tên)</i></td><td><b>Người nhận</b><br><i>(Ký, họ tên)</i></td></tr><tr><td class="s"></td><td class="s"></td></tr></table></div>`; }
const _docSourcePS=docSource; docSource=function(key){ const {type,id}=docHost(key); if(type==='ps'){ const [ym,uid]=[id.slice(0,7),id.slice(8)]; if(!canHR()&&uid!==S.userId) return null; DB.slips=DB.slips||{}; const k=id; return {type,id,kind:'ps',host:DB.slips,store:DB.slips[k]||null,setStore:v=>{ DB.slips[k]=v; },title:`${t('pr_slip')} ${uname(uid)} ${ym}`,gen:()=>slipDoc(ym,uid),sig:()=>ym,back:canHR()?'payroll':'att',fields:[],file:`Phieu_luong_${ym}_${safeName(uname(uid))}`}; } return _docSourcePS(key); };
/* hồ sơ nhân sự: thêm lương cơ bản, phụ cấp, BHXH (chỉ quản lý / kế toán) */
const _staffProfileP=staffProfile; staffProfile=function(x){ let h=_staffProfileP(x); if(!canHR()) return h; const u=x.u; const d=S.ui['sal_'+u.id]||(S.ui['sal_'+u.id]={salary:u.salary||'',allowance:u.allowance||'',insured:!!u.insured});
  const card=`<div class="card"><div class="card-h"><h3>${t('pr_sal_h')}</h3>${isBossRole(me())?`<button class="btn sm primary" data-a="salSave" data-id="${u.id}">${t('save')}</button>`:''}</div><div class="card-b"><div class="form-grid"><div class="field"><label>${t('pr_base')}</label><input class="input num" type="number" data-bind="sal_${u.id}.salary" value="${d.salary}" ${isBossRole(me())?'':'readonly'}></div><div class="field"><label>${t('pr_allow')}</label><input class="input num" type="number" data-bind="sal_${u.id}.allowance" value="${d.allowance}" ${isBossRole(me())?'':'readonly'}></div><div class="field full"><label class="row" style="gap:6px"><input type="checkbox" data-bind="sal_${u.id}.insured" ${d.insured?'checked':''} ${isBossRole(me())?'':'disabled'}> ${t('pr_insured')}</label></div></div></div></div>`;
  return h.replace(`<div class="card"><div class="card-h"><h3>${t('stf_assets_h')}</h3>`,card+`<div class="card"><div class="card-h"><h3>${t('stf_assets_h')}</h3>`); };
A.salSave = el => { const u=userById(el.dataset.id); const d=S.ui['sal_'+u.id]; u.salary=Number(d.salary)||0; u.allowance=Number(d.allowance)||0; u.insured=!!d.insured; audit('salary_edit',u.name,money(u.salary)); save(); rerender(); toast(t('toast_saved'),'ok'); };
/* tạm ứng: chọn nhân viên để trừ vào lương */
const _mCvA=MODALS.cv; MODALS.cv=m=>{ const r=_mCvA(m); if(['advance','refund_adv'].includes(m.f.cat)) r.body=r.body.replace('<div class="field"><label for="cv-d">',`<div class="field"><label class="req">${t('pr_adv_staff')}</label><select class="select" data-bind="modal.f.staffId"><option value="">—</option>${(DB.users||[]).filter(u=>STAFF_ROLES.includes(u.role)).map(u=>`<option value="${u.id}" ${m.f.staffId===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div><div class="field"><label for="cv-d">`); return r; };
const _cvSaveA=A.cvSave; A.cvSave=()=>{ const m=S.ui.modal; if(m&&['advance','refund_adv'].includes(m.f.cat)&&!m.f.staffId){ toast(t('pr_adv_staff')+': '+t('e_required'),'bad'); return; } const sid=m&&m.f.staffId; const top=(DB.cashv||[])[0]; _cvSaveA(); const v=(DB.cashv||[])[0]; if(sid&&v&&v!==top){ v.staffId=sid; if(!v.party) v.party=uname(sid); save(); } };
/* đăng ký trang */
const _erpViewH=erpView; erpView=function(k){ if(k==='att') return viewAtt(); if(k==='payroll') return viewPayroll(); return _erpViewH(k); };
const _tabAllowedH=tabAllowed; tabAllowed=function(k,u=me()){ if(k==='att') return !!u&&!isExternal(u); if(k==='payroll') return !!u&&canHR(); return _tabAllowedH(k,u); };
const _tabTitleH=tabTitle; tabTitle=function(k){ if(k==='att'||k==='payroll') return t('nav_'+k); return _tabTitleH(k); };
const _navH=navItems; navItems=function(u=me()){ const r=_navH(u); if(!u||isExternal(u)) return r; const more=r.find(n=>n.more); if(!more) return r; (canHR()?[{k:'payroll',l:t('nav_payroll')}]:[]).concat([{k:'att',l:t('nav_att')}]).forEach(it=>{ if(!more.more.some(n=>n.k===it.k)) more.more.splice(more.more.findIndex(n=>n.k==='staff')+1,0,it); }); return r; };
const _todayTasksH=todayTasks; todayTasks=function(u){ const L0=_todayTasksH(u); if(['manager','dev'].includes(u.role)){ const p=(DB.leaves||[]).filter(l=>l.status==='pending'); if(p.length) L0.push({key:'td_lv',n:p.length,items:p.map(l=>({leave:1,no:uname(l.uid),company:`${l.from} → ${l.to} · ${t('att_t_'+l.type)}`}))}); } return L0; };
const _taskItemH=taskItem; taskItem=function(x){ if(x.leave) return `<button class="mini-item" data-a="nav" data-k="att"><span class="t"><div><b>${esc(x.no)}</b> ${esc(x.company)}</div></span></button>`; return _taskItemH(x); };
Object.assign(DICT.vi,{ nav_att:'Chấm công', nav_payroll:'Bảng lương', att_sub:'Giờ làm {s} – {e}, nghỉ Chủ nhật. Bấm vào ô để sửa công (quản lý).', att_today:'Chấm công hôm nay · {d}', att_in_at:'Vào lúc {h}', att_out_at:'ra lúc {h}', att_not_yet:'Chưa chấm công', att_late:'đi trễ', att_in:'Chấm công vào', att_out:'Chấm công ra', att_done:'Đã chấm đủ',
  toast_att_in:'Đã chấm công vào lúc {h}', toast_att_out:'Đã chấm công ra lúc {h}', att_grid:'Bảng chấm công', att_legend:'✓ đủ công · ½ nửa ngày · P phép · KL không lương · K vắng · ô vàng: đi trễ · + có tăng ca', att_cong:'Công', att_late_n:'Trễ', att_type:'Loại', att_ot:'Tăng ca (giờ)', att_clear:'Xóa công',
  att_t_work:'Đi làm', att_t_half:'Nửa ngày', att_t_leave:'Nghỉ phép', att_t_unpaid:'Nghỉ không lương', att_t_off:'Ngày nghỉ', att_t_absent:'Vắng không phép',
  lv_ask:'Xin nghỉ', lv_from:'Từ ngày', lv_to:'Đến ngày', lv_type:'Loại nghỉ', lv_reason:'Lý do', lv_reason_ph:'VD: việc gia đình, khám bệnh', lv_send:'Gửi đơn', lv_bad:'Ngày kết thúc phải sau ngày bắt đầu', lv_pending:'Đơn xin nghỉ chờ duyệt', toast_lv:'Đã gửi đơn xin nghỉ', n_lv:'{u} xin nghỉ {a} → {b}', n_lv_ok:'Đơn xin nghỉ của bạn đã được duyệt', n_lv_no:'Đơn xin nghỉ của bạn bị từ chối',
  pr_sub:'Lương = lương cơ bản ÷ {d} × ngày công + tăng ca + phụ cấp + thưởng KPI − BHXH − tạm ứng − khấu trừ', pr_total:'Tổng thực lĩnh', pr_people:'Số người', pr_bonus:'Thưởng KPI', pr_ins:'BHXH (NLĐ đóng)', pr_base:'Lương cơ bản', pr_work:'Lương theo công', pr_allow:'Phụ cấp', pr_kpi:'Thưởng KPI', pr_adv:'Tạm ứng', pr_other:'Khấu trừ khác', pr_net:'Thực lĩnh', pr_slip:'Phiếu lương',
  prs_draft:'Bảng nháp', prs_approved:'Đã duyệt', prs_paid:'Đã trả lương', pr_approve:'Duyệt bảng lương', pr_reopen:'Mở lại để sửa', pr_pay:'Trả lương', pr_paid_at:'Đã trả lúc {d} · {u}', pr_pay_hint:'Ảnh ủy nhiệm chi / danh sách chuyển khoản, hoặc bảng ký nhận lương.', pr_exp:'Lương nhân viên tháng {m}',
  pr_formula:'Công chuẩn {d} ngày/tháng; tăng ca tính 150%; thưởng KPI mặc định: A = {a}, B = {b} (sửa được từng người trước khi duyệt); BHXH 10,5% lương cơ bản với người có đóng.', pr_missing:'Chưa nhập lương cơ bản cho: {n}.', pr_sal_h:'Lương & phúc lợi', pr_insured:'Có đóng BHXH', pr_adv_staff:'Nhân viên tạm ứng',
  toast_pr_ok:'Đã duyệt bảng lương', toast_pr_paid:'Đã trả lương, đã ghi chi phí lương', n_payslip:'Đã có phiếu lương tháng {m}: thực lĩnh {a}', ec_salary:'Lương nhân viên', td_lv:'Đơn xin nghỉ chờ duyệt',
  au_att_in:'Chấm công vào', au_att_out:'Chấm công ra', au_att_edit:'Sửa công', au_leave_approved:'Duyệt nghỉ', au_leave_rejected:'Từ chối nghỉ', au_payroll_ok:'Duyệt bảng lương', au_payroll_paid:'Trả lương', au_salary_edit:'Sửa lương' });
Object.assign(DICT.en,{ nav_att:'Attendance', nav_payroll:'Payroll', att_sub:'Hours {s} – {e}, Sundays off. Managers click a cell to edit.', att_today:'Today · {d}', att_in_at:'In at {h}', att_out_at:'out at {h}', att_not_yet:'Not checked in', att_late:'late', att_in:'Check in', att_out:'Check out', att_done:'Done for today',
  toast_att_in:'Checked in at {h}', toast_att_out:'Checked out at {h}', att_grid:'Attendance sheet', att_legend:'✓ full · ½ half · P leave · KL unpaid · K absent · yellow: late · + overtime', att_cong:'Days', att_late_n:'Late', att_type:'Type', att_ot:'Overtime (h)', att_clear:'Clear',
  att_t_work:'Worked', att_t_half:'Half day', att_t_leave:'Paid leave', att_t_unpaid:'Unpaid leave', att_t_off:'Day off', att_t_absent:'Absent',
  lv_ask:'Request leave', lv_from:'From', lv_to:'To', lv_type:'Type', lv_reason:'Reason', lv_reason_ph:'e.g. family matter', lv_send:'Send', lv_bad:'End date must be after start', lv_pending:'Leave requests', toast_lv:'Leave request sent', n_lv:'{u} requests leave {a} → {b}', n_lv_ok:'Your leave was approved', n_lv_no:'Your leave was rejected',
  pr_sub:'Pay = base ÷ {d} × days + overtime + allowance + KPI bonus − insurance − advances − deductions', pr_total:'Total net pay', pr_people:'People', pr_bonus:'KPI bonus', pr_ins:'Insurance (employee)', pr_base:'Base salary', pr_work:'Pay for days', pr_allow:'Allowance', pr_kpi:'KPI bonus', pr_adv:'Advances', pr_other:'Other deductions', pr_net:'Net pay', pr_slip:'Payslip',
  prs_draft:'Draft', prs_approved:'Approved', prs_paid:'Paid', pr_approve:'Approve payroll', pr_reopen:'Reopen', pr_pay:'Pay salaries', pr_paid_at:'Paid {d} · {u}', pr_pay_hint:'Bank transfer order / list, or signed payroll sheet.', pr_exp:'Salaries {m}',
  pr_formula:'{d} standard days/month; overtime at 150%; default KPI bonus A = {a}, B = {b} (editable per person before approval); insurance 10.5% of base for insured staff.', pr_missing:'No base salary for: {n}.', pr_sal_h:'Salary & benefits', pr_insured:'Pays social insurance', pr_adv_staff:'Staff member',
  toast_pr_ok:'Payroll approved', toast_pr_paid:'Salaries paid and expensed', n_payslip:'Payslip {m}: net {a}', ec_salary:'Salaries', td_lv:'Leave requests',
  au_att_in:'Check in', au_att_out:'Check out', au_att_edit:'Attendance edited', au_leave_approved:'Leave approved', au_leave_rejected:'Leave rejected', au_payroll_ok:'Payroll approved', au_payroll_paid:'Payroll paid', au_salary_edit:'Salary edited' });
/* dữ liệu mẫu: lương & công tháng này */
function seedHR(){ if(DB.hrSeeded) return; DB.hrSeeded=1; const sal={manager:18000000,engineer:11000000,warehouse:9000000,accountant:10000000}; (DB.users||[]).forEach(u=>{ if(STAFF_ROLES.includes(u.role)&&u.salary==null){ u.salary=sal[u.role]; u.allowance=u.role==='engineer'?1500000:800000; u.insured=true; } });
  const now=new Date(); const days=monthDays(now.getFullYear(),now.getMonth()).filter(d=>d<dkey(Date.now())&&!isSun(d)); (DB.users||[]).filter(u=>STAFF_ROLES.includes(u.role)).forEach((u,i)=>days.forEach((d,j)=>{ const r=(i*7+j*13)%23; const type=r===0?'leave':r===1?'absent':r===2?'half':'work'; const late=r===3||r===4; attSet(u.id,d,{type,in:['work','half'].includes(type)?new Date(d+'T'+(late?'08:2':'07:5')+(j%10)+':00').getTime():null,out:type==='work'?new Date(d+'T17:0'+(j%10)+':00').getTime():type==='half'?new Date(d+'T12:00:00').getTime():null,ot:r===5?2:0,src:'seed'}); })); }
const _renderHR=render; render=function(){ try{ if(DB&&DB.users) seedHR(); }catch(e){} return _renderHR.apply(this,arguments); };

/* ===================================================================
   DỮ LIỆU DÙNG CHUNG TRÊN MÁY CHỦ (claude.ai) + ĐĂNG NHẬP BẰNG TÀI KHOẢN THẬT
   - Bật một lần bởi chủ trang; sau đó mọi người mở link đều dùng chung 1 bộ dữ liệu
   - Mỗi bản ghi (phiếu, hợp đồng, khách, kho…) là 1 tài liệu; nhật ký gộp theo khối
   - Tự đồng bộ: lưu là đẩy lên, người khác thay đổi thì tự tải về
   - Danh tính: tài khoản claude.ai của người mở; gắn với tài khoản nhân viên bằng mã kích hoạt
   =================================================================== */
const CLOUD={ db:null, user:null, on:false, ready:false, loading:false, uid:null, owner:false, cid:Math.random().toString(36).slice(2,10), last:{}, lastBlob:{}, pushing:false, again:false, timer:null, unsub:null, rev:0, status:'off', err:'', linked:false };
const REC_KEYS=['tickets','svc','orders','purchases','customers','expenses','fjobs','sites','oms','handovers','cashv','counts','users','stock','suppliers','prices','assets','devices','scrap','att','leaves','payrolls','cashCounts','support'];
const LOG_KEYS=['moves','notifs','audit'];
const NO_SYNC=['lastBackup'];
const recId=x=>String(x.id||x.pn||x.sn||x.no||'').replace(/[^A-Za-z0-9_-]/g,'_').slice(0,180);
function stripBig(o){ return JSON.parse(JSON.stringify(o,(k,v)=>{ if(v&&typeof v==='object'&&v.url&&typeof v.data==='string'){ const c=Object.assign({},v); delete c.data; return c; } return v; })); }
function recJson(x){ let j=JSON.stringify(stripBig(x)); if(j.length>230000){ j=JSON.stringify(x,(k,v)=>k==='data'&&typeof v==='string'&&v.length>2000?undefined:v); CLOUD.warnBig=true; } return j; }
const CHUNK=200000;
async function cloudInit(){ try{ if(!(window.claude&&window.claude.use)) return; const [db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]); if(!db) return; CLOUD.db=db; CLOUD.user=user;
  if(user){ try{ CLOUD.uid=await user.id(); }catch(e){} try{ CLOUD.owner=await user.isOwner(); }catch(e){} }
  const cfg=await db.doc('meta/cfg').get(); if(cfg.exists&&cfg.data().on){ CLOUD.on=true; await cloudLoadAll(); cloudSubscribe(); cloudIdentity(); } else { CLOUD.status='local'; } rerender(); }catch(e){ CLOUD.status='error'; CLOUD.err=String(e&&e.message||e); rerender(); } }
async function cloudReadKey(key){ const db=CLOUD.db; const out=[]; let last=''; for(let i=0;i<30;i++){ let q=db.collection('r_'+key).orderBy('s').limit(1000); if(last) q=q.where('s','>',last); const snap=await q.get(); snap.docs.forEach(d=>out.push(d.data())); if(snap.size<1000) break; last=snap.docs[snap.docs.length-1].data().s; } 
  const recs=[]; for(const b of out){ let j=b.j; if(b.c){ const parts=[]; for(let i=0;i<b.c;i++){ const d=await db.doc(`rc_${key}/${b.s}__${i}`).get(); parts.push(d.exists?d.data().j:''); } j=parts.join(''); } try{ recs.push({id:b.s,j,o:JSON.parse(j),at:b.at||0}); }catch(e){} } return recs; }
async function cloudReadBlob(key){ const db=CLOUD.db; const d0=await db.doc(`blob/${key}__0`).get(); if(!d0.exists) return null; const n=d0.data().n||1; const parts=[d0.data().j]; for(let i=1;i<n;i++){ const d=await db.doc(`blob/${key}__${i}`).get(); parts.push(d.exists?d.data().j:''); } const j=parts.join(''); try{ return {j,o:JSON.parse(j)}; }catch(e){ return null; } }
async function cloudLoadAll(){ CLOUD.loading=true; CLOUD.status='loading'; rerender(); const db=CLOUD.db; const idx=await db.doc('meta/keys').get(); const keys=idx.exists?idx.data():{rec:REC_KEYS,blob:[]};
  const next={}; for(const k of (keys.rec||[])){ const recs=await cloudReadKey(k); const ord=(keys.order||{})[k]||[]; const pos={}; ord.forEach((id,i)=>pos[id]=i); recs.sort((a,b)=>(pos[a.id]??1e9)-(pos[b.id]??1e9)); next[k]=recs.map(r=>r.o); CLOUD.last[k]={}; recs.forEach(r=>{ CLOUD.last[k][r.id]=r.j; }); }
  for(const k of (keys.blob||[])){ const b=await cloudReadBlob(k); if(b){ next[k]=b.o; CLOUD.lastBlob[k]=b.j; } }
  Object.keys(DB).forEach(k=>{ if(!NO_SYNC.includes(k)) delete DB[k]; }); Object.assign(DB,next); const rv=await db.doc('meta/rev').get(); CLOUD.rev=rv.exists?rv.data().rev:0;
  CLOUD.loading=false; CLOUD.ready=true; CLOUD.status='ok'; try{ localStorage.setItem(LS_KEY+'-cloud','1'); }catch(e){} save0(); }
function cloudSubscribe(){ if(CLOUD.unsub) return; CLOUD.unsub=CLOUD.db.doc('meta/rev').onSnapshot(s=>{ if(!s.exists) return; const d=s.data(); if(d.rev<=CLOUD.rev||d.cid===CLOUD.cid) { CLOUD.rev=Math.max(CLOUD.rev,d.rev||0); return; } CLOUD.rev=d.rev; cloudPull(d.keys||[]); },e=>{ CLOUD.status='error'; CLOUD.err=e&&e.code; cloudBadge(); }); }
async function cloudPull(keys){ if(!CLOUD.ready) return; try{ const idx=await CLOUD.db.doc('meta/keys').get(); const kk=idx.exists?idx.data():{rec:[],blob:[],order:{}}; let changed=false;
  for(const k of keys){ if((kk.rec||[]).includes(k)){ const recs=await cloudReadKey(k); const arr=DB[k]=DB[k]||[]; const last=CLOUD.last[k]=CLOUD.last[k]||{}; const remote={}; recs.forEach(r=>remote[r.id]=r);
      /* thay bản ghi đổi ở máy khác (trừ khi máy mình đang sửa dở chưa đẩy) */
      for(let i=arr.length-1;i>=0;i--){ const id=recId(arr[i]); const mine=recJson(arr[i]); const dirty=last[id]!==undefined&&mine!==last[id]; if(remote[id]){ if(!dirty&&remote[id].j!==mine){ arr[i]=remote[id].o; changed=true; } last[id]=remote[id].j; delete remote[id]; } else if(last[id]!==undefined&&!dirty){ arr.splice(i,1); delete last[id]; changed=true; } }
      const ord=(kk.order||{})[k]||[]; const pos={}; ord.forEach((id,i)=>pos[id]=i); Object.values(remote).sort((a,b)=>(pos[b.id]??-1)-(pos[a.id]??-1)).forEach(r=>{ const p=pos[r.id]; if(p!=null&&p<arr.length/2) arr.unshift(r.o); else arr.push(r.o); last[r.id]=r.j; changed=true; }); }
    else if((kk.blob||[]).includes(k)){ const b=await cloudReadBlob(k); if(!b) continue; const mine=JSON.stringify(DB[k]); if(mine===CLOUD.lastBlob[k]||mine===undefined){ DB[k]=b.o; changed=true; } else if(LOG_KEYS.includes(k)){ DB[k]=mergeLog(DB[k],b.o); changed=true; } CLOUD.lastBlob[k]=b.j; } }
  if(changed){ save0(); const ae=document.activeElement; if(ae&&(/INPUT|TEXTAREA|SELECT/.test(ae.tagName)||ae.isContentEditable)) CLOUD.pendingRender=true; else rerender(); toastSync(); } }catch(e){ CLOUD.status='error'; CLOUD.err=String(e&&e.message||e); cloudBadge(); } }
function toastSync(){ const now=Date.now(); if(now-(CLOUD.lastToast||0)>8000){ CLOUD.lastToast=now; toast(t('cl_synced_in'),'ok'); } }
document.addEventListener('focusout',()=>{ if(CLOUD.pendingRender){ CLOUD.pendingRender=false; setTimeout(()=>rerender(),50); } });
function logIdOf(x){ return x.id||`${x.at}|${x.by||''}|${x.act||x.key||x.type||''}|${x.ref||x.pn||''}`; }
function mergeLog(a,b){ const seen=new Set(); const out=[]; (a||[]).concat(b||[]).forEach(x=>{ const k=logIdOf(x); if(seen.has(k)) return; seen.add(k); out.push(x); }); out.sort((p,q)=>(q.at||0)-(p.at||0)); return out; }
/* ---- đẩy thay đổi lên ---- */
const save0=save; save=function(){ save0(); if(CLOUD.on&&CLOUD.ready){ clearTimeout(CLOUD.timer); CLOUD.timer=setTimeout(cloudPush,700); } };
async function pool(tasks,n){ let i=0; const run=async()=>{ while(i<tasks.length){ const k=i++; await tasks[k](); } }; await Promise.all(Array.from({length:Math.min(n,tasks.length)},run)); }
async function cloudPush(){ if(!CLOUD.ready||!CLOUD.on) return; if(CLOUD.pushing){ CLOUD.again=true; return; } CLOUD.pushing=true; CLOUD.status='saving'; cloudBadge(); const db=CLOUD.db; const changedKeys=new Set(); const tasks=[]; const recKeys=[], blobKeys=[], order={};
  try{ Object.keys(DB).forEach(k=>{ if(NO_SYNC.includes(k)) return; const v=DB[k]; if(REC_KEYS.includes(k)&&Array.isArray(v)) recKeys.push(k); else blobKeys.push(k); });
    for(const k of recKeys){ const last=CLOUD.last[k]=CLOUD.last[k]||{}; const seen={}; order[k]=DB[k].map(recId).slice(0,4000);
      DB[k].forEach(x=>{ const id=recId(x); if(!id||seen[id]) return; seen[id]=1; const j=recJson(x); if(last[id]===j) return; changedKeys.add(k);
        tasks.push(async()=>{ if(j.length<=CHUNK){ await db.doc(`r_${k}/${id}`).set({s:id,j,at:Date.now(),by:S.userId||''}); } else { const n=Math.ceil(j.length/CHUNK); for(let i=0;i<n;i++) await db.doc(`rc_${k}/${id}__${i}`).set({j:j.slice(i*CHUNK,(i+1)*CHUNK)}); await db.doc(`r_${k}/${id}`).set({s:id,c:n,at:Date.now(),by:S.userId||''}); } last[id]=j; }); });
      Object.keys(last).forEach(id=>{ if(!seen[id]){ changedKeys.add(k); tasks.push(async()=>{ await db.doc(`r_${k}/${id}`).delete(); delete last[id]; }); } }); }
    for(const k of blobKeys){ let v=DB[k]; const j=JSON.stringify(v===undefined?null:v); if(CLOUD.lastBlob[k]===j) continue; changedKeys.add(k);
      tasks.push(async()=>{ let out=j; if(LOG_KEYS.includes(k)){ const r=await cloudReadBlob(k); if(r&&r.j!==CLOUD.lastBlob[k]){ DB[k]=mergeLog(DB[k],r.o); out=JSON.stringify(DB[k]); } }
        const n=Math.max(1,Math.ceil(out.length/CHUNK)); for(let i=0;i<n;i++) await db.doc(`blob/${k}__${i}`).set({j:out.slice(i*CHUNK,(i+1)*CHUNK),n}); CLOUD.lastBlob[k]=out; }); }
    await pool(tasks,4);
    if(changedKeys.size){ await db.doc('meta/keys').set({rec:recKeys,blob:blobKeys,order}); CLOUD.rev=(CLOUD.rev||0)+1; await db.doc('meta/rev').set({rev:CLOUD.rev,cid:CLOUD.cid,by:S.userId||'',at:Date.now(),keys:[...changedKeys]}); }
    CLOUD.status='ok'; CLOUD.err=''; CLOUD.savedAt=Date.now(); if(CLOUD.warnBig){ CLOUD.warnBig=false; toast(t('cl_big'),'bad'); } }
  catch(e){ CLOUD.status='error'; CLOUD.err=(e&&e.code)||String(e&&e.message||e); if(e&&e.code==='quota_exceeded') toast(t('cl_quota'),'bad'); }
  finally{ CLOUD.pushing=false; cloudBadge(); if(CLOUD.again){ CLOUD.again=false; setTimeout(cloudPush,300); } } }
/* ---- trạng thái trên thanh trên cùng ---- */
function cloudBadge(){ let b=document.getElementById('cloudBadge'); if(!CLOUD.on){ if(b) b.remove(); return; } const tb=document.querySelector('.topbar .top-right,.topbar .right,.top-actions'); if(!b){ b=document.createElement('button'); b.id='cloudBadge'; b.className='cloud-b'; b.setAttribute('data-a','nav'); b.setAttribute('data-k','cloud'); }
  if(tb&&b.parentElement!==tb) tb.prepend(b); const st=CLOUD.status; b.className='cloud-b '+st; b.title=st==='error'?t('cl_st_error')+': '+CLOUD.err:t('cl_st_'+st); b.innerHTML=`${ic(st==='error'?'alert':st==='saving'||st==='loading'?'refresh':'check',14)}<span>${t('cl_st_'+st)}</span>`; }
const _renderCl=render; render=function(){ const root=document.getElementById('root'); document.body.classList.toggle('cloud-on',!!CLOUD.on);
  if(CLOUD.on&&!CLOUD.ready&&root){ root.innerHTML=`<div class="cl-loading"><div class="spin"></div><b>${t('cl_loading')}</b><small>${t('cl_loading_h')}</small></div><div class="toasts" id="toasts"></div>`; return; }
  if(CLOUD.on&&CLOUD.ready&&!CLOUD.linked&&root){ root.innerHTML=cloudGate()+`<div class="toasts" id="toasts"></div>`+renderModal(); return; }
  const r=_renderCl.apply(this,arguments); try{ cloudBadge(); }catch(e){} return r; };
/* ---- danh tính: gắn tài khoản claude.ai với tài khoản nhân viên ---- */
async function sha256(s){ const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(s).trim().toUpperCase())); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function cloudIdentity(){ const u=(DB.users||[]).find(x=>x.claudeId&&x.claudeId===CLOUD.uid&&x.active!==false); if(u){ CLOUD.linked=true; if(S.userId!==u.id){ S.userId=u.id; S.tabs=['home']; S.active='home'; S.ui={}; } return; }
  CLOUD.linked=false; S.userId=null; }
function cloudGate(){ const anyLinked=(DB.users||[]).some(u=>u.claudeId); const ownerSetup=CLOUD.owner&&!anyLinked;
  return `<div class="cl-gate"><img src="${SGE_LOGO}" alt="SGE" style="height:60px"><h2>${t('cl_gate_t')}</h2>${ownerSetup?`<p>${t('cl_owner_pick')}</p><div class="cl-pick">${(DB.users||[]).filter(u=>isBossRole(u)&&u.active!==false).map(u=>`<button class="btn" data-a="clClaimOwner" data-id="${u.id}"><span class="avatar">${esc(initials(u.name))}</span>${esc(u.name)} · ${t('role_'+u.role)}</button>`).join('')}</div>`:
    `<p>${t('cl_gate_h')}</p><div class="cl-code"><input class="input" id="clCode" placeholder="${t('cl_code_ph')}" maxlength="12" autocomplete="off"><button class="btn primary" data-a="clRedeem">${t('cl_activate')}</button></div><p class="hint">${t('cl_gate_h2')}</p>`}</div>`; }
A.clClaimOwner = async el => { if(!CLOUD.owner) return; const u=userById(el.dataset.id); u.claudeId=CLOUD.uid; CLOUD.linked=true; S.userId=u.id; S.tabs=['home']; S.active='home'; audit('cloud_link',u.name,'owner'); save(); render(); toast(t('cl_linked',{n:u.name}),'ok'); };
A.clRedeem = async () => { const code=(document.getElementById('clCode')||{}).value||''; if(code.trim().length<6){ toast(t('cl_code_bad'),'bad'); return; } const h=await sha256(code); const u=(DB.users||[]).find(x=>x.inviteHash===h&&x.active!==false); if(!u){ toast(t('cl_code_bad'),'bad'); return; }
  u.claudeId=CLOUD.uid; delete u.inviteHash; CLOUD.linked=true; S.userId=u.id; S.tabs=['home']; S.active='home'; audit('cloud_link',u.name,'code'); save(); render(); toast(t('cl_linked',{n:u.name}),'ok'); };
/* chế độ dùng chung: không cho đổi tài khoản / khôi phục demo */
const _logoutCl=A.logout; A.logout=()=>{ if(CLOUD.on){ toast(t('cl_no_logout'),'bad'); return; } return _logoutCl(); };
const _askResetCl=A.askReset; A.askReset=()=>{ if(CLOUD.on){ toast(t('cl_no_reset'),'bad'); return; } return _askResetCl(); };
const _loginAsCl=A.loginAs; A.loginAs=el=>{ if(CLOUD.on&&CLOUD.ready){ toast(t('cl_no_logout'),'bad'); return; } return _loginAsCl(el); };
/* ---- trang quản trị "Dữ liệu dùng chung" ---- */
function viewCloud(){ const boss=isBossRole(me()); const on=CLOUD.on; const users=(DB.users||[]).filter(u=>STAFF_ROLES.includes(u.role)||u.role==='admin'||u.role==='dev');
  if(!CLOUD.db) return `<div class="page-head"><div><h1>${t('nav_cloud')}</h1></div></div><div class="card"><div class="card-b"><p>${t('cl_unavail')}</p></div></div>`;
  return `<div class="page-head"><div><h1>${t('nav_cloud')}</h1><div class="sub">${t('cl_sub')}</div></div></div>
  ${!on?`<div class="card"><div class="card-b"><h3 style="margin-top:0">${t('cl_off_t')}</h3><p>${t('cl_off_h')}</p>${CLOUD.owner?`<div class="kind-pick" style="grid-template-columns:1fr 1fr;margin:14px 0"><button class="kp ${S.ui.clMode!=='all'?'on':''}" data-a="clMode" data-v="clean"><b>${t('cl_m_clean')}</b><small>${t('cl_m_clean_h')}</small></button><button class="kp ${S.ui.clMode==='all'?'on':''}" data-a="clMode" data-v="all"><b>${t('cl_m_all')}</b><small>${t('cl_m_all_h')}</small></button></div>
      <button class="btn primary lg" data-a="clEnable">${S.ui.clConfirm?t('cl_enable_again'):t('cl_enable')}</button>`:`<p class="hint">${t('cl_owner_only')}</p>`}</div></div>`
  :`<div class="stat-row task-stats"><div class="card stat"><div class="l">${t('cl_state')}</div><div class="v" style="font-size:18px;color:${CLOUD.status==='error'?'var(--bad)':'var(--ok)'}">${t('cl_st_'+CLOUD.status)}</div><div class="d">${CLOUD.savedAt?t('cl_saved',{d:fmtDT(CLOUD.savedAt)}):''}${CLOUD.err?' · '+esc(CLOUD.err):''}</div></div><div class="card stat"><div class="l">${t('cl_linked_n')}</div><div class="v">${users.filter(u=>u.claudeId).length} / ${users.length}</div></div><div class="card stat"><div class="l">${t('cl_records')}</div><div class="v">${REC_KEYS.reduce((s,k)=>s+((DB[k]||[]).length),0)}</div><div class="d">${t('cl_cap')}</div></div><div class="card stat"><div class="l">${t('cl_you')}</div><div class="v" style="font-size:16px">${esc((me()||{}).name||'')}</div></div></div>
  <div class="card"><div class="card-h"><h3>${t('cl_accounts')}</h3><span class="hint">${t('cl_accounts_h')}</span></div><div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('nav_staff')}</th><th>${t('role')}</th><th>${t('cl_link')}</th><th></th></tr></thead><tbody>${users.map(u=>`<tr><td data-l="${t('nav_staff')}"><b>${esc(u.name)}</b><br><small class="muted">${esc(u.email||'')}</small></td><td data-l="${t('role')}">${t('role_'+u.role)}</td><td data-l="${t('cl_link')}">${u.claudeId?`<span class="kst k-ok">${t('cl_l_yes')}</span>${u.claudeId===CLOUD.uid?` <small class="muted">(${t('cl_this')})</small>`:''}`:u.inviteHash?`<span class="kst k-warn">${t('cl_l_wait')}</span>`:`<span class="kst">${t('cl_l_no')}</span>`}</td>
    <td class="nowrap">${boss?(u.claudeId?(u.claudeId!==CLOUD.uid?`<button class="btn sm danger" data-a="clUnlink" data-id="${u.id}">${t('cl_unlink')}</button>`:''):`<button class="btn sm primary" data-a="clInvite" data-id="${u.id}">${t(u.inviteHash?'cl_invite_new':'cl_invite')}</button>`):''}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><div class="card-b"><h3 style="margin-top:0">${t('cl_how_t')}</h3><ol class="cl-how"><li>${t('cl_how1')}</li><li>${t('cl_how2')}</li><li>${t('cl_how3')}</li><li>${t('cl_how4')}</li></ol>${boss?`<button class="btn" data-a="clReload">${ic('refresh',14)} ${t('cl_reload')}</button>`:''}</div></div>`}`; }
A.clMode = el => { S.ui.clMode=el.dataset.v; S.ui.clConfirm=false; rerender(); };
A.clEnable = async () => { if(!CLOUD.owner||!CLOUD.db) return; if(!S.ui.clConfirm){ S.ui.clConfirm=true; rerender(); return; } S.ui.clConfirm=false;
  if(S.ui.clMode!=='all'){ ['tickets','svc','orders','purchases','expenses','fjobs','handovers','cashv','counts','moves','notifs','audit','att','leaves','payrolls','cashCounts','rmas','rmasArchive','claims','support','scrap','slips','payAdj'].forEach(k=>{ if(Array.isArray(DB[k])) DB[k]=[]; else if(DB[k]&&typeof DB[k]==='object'&&['slips','payAdj'].includes(k)) DB[k]={}; });
    (DB.stock||[]).forEach(s=>{ s.qty=0; }); DB.cashfund={opening:0,openingAt:Date.now(),by:S.userId}; DB.oms=[]; DB.sites=[]; DB.devices=[]; DB.customers=[]; DB.assets=[]; DB.policy=DB.policy||{}; DB.erpSeq={}; DB.seq=1000; DB.hrSeeded=1; DB.digest={}; }
  const me0=me(); if(me0){ me0.claudeId=CLOUD.uid; }
  toast(t('cl_uploading'),'ok'); CLOUD.on=true; CLOUD.ready=true; CLOUD.linked=true; CLOUD.last={}; CLOUD.lastBlob={}; await cloudPush(); if(CLOUD.status==='error'){ CLOUD.on=false; toast(t('cl_fail')+': '+CLOUD.err,'bad'); rerender(); return; }
  await CLOUD.db.doc('meta/cfg').set({on:true,at:Date.now(),by:CLOUD.uid}); cloudSubscribe(); audit('cloud_on','',S.ui.clMode||'clean'); save(); rerender(); toast(t('cl_on_ok'),'ok'); };
function genCode(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; const r=crypto.getRandomValues(new Uint8Array(8)); r.forEach(x=>{ s+=a[x%a.length]; }); return s; }
A.clInvite = async el => { const u=userById(el.dataset.id); const code=genCode(); u.inviteHash=await sha256(code); audit('cloud_invite',u.name,''); save(); rerender(); openModal({type:'clCode',name:u.name,code}); };
MODALS.clCode = m => ({ title:t('cl_invite_t',{n:esc(m.name)}), body:`<p>${t('cl_invite_h')}</p><div class="cl-codebox">${m.code}</div><p class="hint">${t('cl_invite_h2')}</p>`, foot:`<button class="btn primary" data-a="closeModal">${t('close')}</button>` });
A.clUnlink = el => { const u=userById(el.dataset.id); if(S.ui.clUx!==u.id){ S.ui.clUx=u.id; toast(t('cl_unlink_q'),'bad'); return; } S.ui.clUx=null; delete u.claudeId; audit('cloud_unlink',u.name,''); save(); rerender(); };
A.clReload = async () => { CLOUD.ready=false; render(); await cloudLoadAll(); cloudIdentity(); rerender(); };
/* số chứng từ không trùng khi nhiều người cùng tạo */
const allNos=()=>{ const s=new Set(); ['tickets','svc','orders','purchases','expenses','fjobs','handovers','cashv','counts'].forEach(k=>(DB[k]||[]).forEach(x=>x.no&&s.add(x.no))); return s; };
const _erpNoU=erpNo; erpNo=function(p){ let n=_erpNoU(p); if(CLOUD.on){ const s=allNos(); let g=0; while(s.has(n)&&g++<500) n=_erpNoU(p); } return n; };
const _nextNoU=nextNo; nextNo=function(tp){ let n=_nextNoU(tp); if(CLOUD.on){ const s=allNos(); let g=0; while(s.has(n)&&g++<500) n=_nextNoU(tp); } return n; };
/* đăng ký */
const _erpViewCl2=erpView; erpView=function(k){ if(k==='cloud') return viewCloud(); return _erpViewCl2(k); };
const _tabAllowedCl2=tabAllowed; tabAllowed=function(k,u=me()){ if(k==='cloud') return !!u&&!isExternal(u); return _tabAllowedCl2(k,u); };
const _tabTitleCl2=tabTitle; tabTitle=function(k){ if(k==='cloud') return t('nav_cloud'); return _tabTitleCl2(k); };
const _navCl=navItems; navItems=function(u=me()){ const r=_navCl(u); if(!u||!isBossRole(u)) return r; const more=r.find(n=>n.more); if(more&&!more.more.some(n=>n.k==='cloud')) more.more.push({k:'cloud',l:t('nav_cloud')}); return r; };
Object.assign(DICT.vi,{ nav_cloud:'Dữ liệu dùng chung', cl_sub:'Cả công ty dùng chung 1 bộ dữ liệu trên máy chủ claude.ai, đăng nhập bằng tài khoản thật', cl_unavail:'Tính năng này chỉ có trên link online của claude.ai (bản chạy trên máy dùng dữ liệu riêng trên trình duyệt).',
  cl_off_t:'Đang dùng dữ liệu riêng trên trình duyệt này', cl_off_h:'Bật dùng chung để mọi nhân viên mở link đều thấy cùng phiếu, kho, tiền… và tự cập nhật khi người khác thay đổi. Mỗi người đăng nhập bằng tài khoản claude.ai của họ.', cl_owner_only:'Chỉ chủ trang (người tạo link) mới bật được.',
  cl_m_clean:'Bắt đầu dữ liệu thật (sạch)', cl_m_clean_h:'Giữ nhân sự, danh mục linh kiện (tồn về 0), nhà cung cấp, bảng giá, thông tin công ty, chính sách. Xóa toàn bộ phiếu, hợp đồng, khách, tiền, kho demo.', cl_m_all:'Đưa toàn bộ dữ liệu hiện tại lên', cl_m_all_h:'Dùng tiếp dữ liệu đang có trên trình duyệt này (kể cả dữ liệu demo).',
  cl_enable:'Bật dùng chung', cl_enable_again:'Bấm lần nữa để xác nhận', cl_uploading:'Đang đưa dữ liệu lên máy chủ…', cl_fail:'Không bật được', cl_on_ok:'Đã bật dữ liệu dùng chung',
  cl_state:'Trạng thái', cl_saved:'Lưu lần cuối {d}', cl_linked_n:'Tài khoản đã kích hoạt', cl_records:'Bản ghi', cl_cap:'Giới hạn 25.000 bản ghi', cl_you:'Bạn đang là', cl_accounts:'Kích hoạt tài khoản nhân viên', cl_accounts_h:'Tạo mã → gửi cho nhân viên → họ mở link, nhập mã 1 lần',
  cl_link:'Kích hoạt', cl_l_yes:'Đã kích hoạt', cl_l_wait:'Chờ nhập mã', cl_l_no:'Chưa', cl_this:'bạn', cl_invite:'Tạo mã kích hoạt', cl_invite_new:'Tạo mã mới', cl_unlink:'Hủy kích hoạt', cl_unlink_q:'Bấm lần nữa để hủy kích hoạt tài khoản này',
  cl_invite_t:'Mã kích hoạt cho {n}', cl_invite_h:'Gửi mã này cho nhân viên (Zalo, tin nhắn). Họ mở link hệ thống bằng tài khoản claude.ai của mình và nhập mã 1 lần:', cl_invite_h2:'Mã chỉ hiện 1 lần và chỉ dùng được 1 lần. Hệ thống chỉ lưu dạng mã hóa.',
  cl_how_t:'Cách cho nhân viên dùng', cl_how1:'Trên claude.ai, mở trang này → Chia sẻ → mời nhân viên (quyền "Có thể tương tác" để họ nhập liệu được).', cl_how2:'Tại bảng trên, bấm "Tạo mã kích hoạt" cho từng người và gửi mã cho họ.', cl_how3:'Nhân viên mở link, đăng nhập claude.ai, nhập mã → vào thẳng tài khoản của mình, không cần mật khẩu riêng.', cl_how4:'Nghỉ việc: bấm "Hủy kích hoạt" và gỡ họ khỏi danh sách chia sẻ.',
  cl_reload:'Tải lại toàn bộ dữ liệu', cl_gate_t:'Kích hoạt tài khoản SGE', cl_gate_h:'Bạn chưa được gắn với tài khoản nhân viên nào. Nhập mã kích hoạt quản lý gửi cho bạn:', cl_gate_h2:'Chưa có mã? Liên hệ quản lý để được cấp.', cl_code_ph:'VD: K7M2QX9A', cl_activate:'Kích hoạt', cl_code_bad:'Mã không đúng hoặc đã dùng', cl_linked:'Đã đăng nhập: {n}',
  cl_owner_pick:'Bạn là chủ trang. Chọn tài khoản quản lý của bạn:', cl_no_logout:'Đang dùng dữ liệu chung: tài khoản gắn với claude.ai, không đổi tài khoản được', cl_no_reset:'Đang dùng dữ liệu chung: không thể khôi phục dữ liệu demo',
  cl_loading:'Đang tải dữ liệu từ máy chủ…', cl_loading_h:'Lần đầu có thể mất vài giây', cl_synced_in:'Đã cập nhật thay đổi từ người khác', cl_big:'Có hồ sơ quá nhiều hình, một số ảnh thu nhỏ không được đồng bộ', cl_quota:'Máy chủ đã đầy giới hạn lưu trữ. Liên hệ quản trị để dọn dữ liệu cũ.',
  cl_st_ok:'Đã đồng bộ', cl_st_saving:'Đang lưu…', cl_st_loading:'Đang tải…', cl_st_error:'Lỗi đồng bộ', cl_st_off:'Dữ liệu riêng', cl_st_local:'Dữ liệu riêng',
  au_cloud_on:'Bật dữ liệu dùng chung', au_cloud_link:'Kích hoạt tài khoản', au_cloud_invite:'Tạo mã kích hoạt', au_cloud_unlink:'Hủy kích hoạt' });
Object.assign(DICT.en,{ nav_cloud:'Shared data', cl_sub:'The whole company shares one dataset on claude.ai, signed in with real accounts', cl_unavail:'Only available on the claude.ai online link.', cl_off_t:'Using private data in this browser', cl_off_h:'Enable sharing so every staff member sees the same jobs, stock and money, updated live. Each person signs in with their claude.ai account.', cl_owner_only:'Only the page owner can enable this.',
  cl_m_clean:'Start real data (clean)', cl_m_clean_h:'Keeps staff, parts catalog (qty 0), suppliers, prices, company info, policy. Clears demo jobs, contracts, customers, money and stock.', cl_m_all:'Upload current data', cl_m_all_h:'Continue with the data in this browser (including demo data).',
  cl_enable:'Enable sharing', cl_enable_again:'Tap again to confirm', cl_uploading:'Uploading data…', cl_fail:'Could not enable', cl_on_ok:'Shared data enabled',
  cl_state:'Status', cl_saved:'Last saved {d}', cl_linked_n:'Activated accounts', cl_records:'Records', cl_cap:'Limit 25,000 records', cl_you:'You are', cl_accounts:'Activate staff accounts', cl_accounts_h:'Create a code → send it → they enter it once',
  cl_link:'Activation', cl_l_yes:'Activated', cl_l_wait:'Awaiting code', cl_l_no:'Not yet', cl_this:'you', cl_invite:'Create code', cl_invite_new:'New code', cl_unlink:'Deactivate', cl_unlink_q:'Tap again to deactivate',
  cl_invite_t:'Activation code for {n}', cl_invite_h:'Send this code to the staff member. They open the link with their claude.ai account and enter it once:', cl_invite_h2:'Shown once, usable once; stored only as a hash.',
  cl_how_t:'How staff get access', cl_how1:'On claude.ai, share this page with staff (with interact access so they can enter data).', cl_how2:'Create an activation code per person above and send it.', cl_how3:'They open the link, sign in to claude.ai and enter the code — no separate password.', cl_how4:'When someone leaves: deactivate here and remove them from sharing.',
  cl_reload:'Reload all data', cl_gate_t:'Activate your SGE account', cl_gate_h:'Your account is not linked yet. Enter the activation code from your manager:', cl_gate_h2:'No code? Ask your manager.', cl_code_ph:'e.g. K7M2QX9A', cl_activate:'Activate', cl_code_bad:'Invalid or used code', cl_linked:'Signed in as {n}',
  cl_owner_pick:'You own this page. Pick your manager account:', cl_no_logout:'Shared mode: your account follows your claude.ai sign-in', cl_no_reset:'Shared mode: demo reset is disabled',
  cl_loading:'Loading data from the server…', cl_loading_h:'This can take a few seconds', cl_synced_in:'Updated with changes from others', cl_big:'Some records have too many photos; some thumbnails were not synced', cl_quota:'Server storage limit reached. Ask an admin to clean up old data.',
  cl_st_ok:'Synced', cl_st_saving:'Saving…', cl_st_loading:'Loading…', cl_st_error:'Sync error', cl_st_off:'Private data', cl_st_local:'Private data',
  au_cloud_on:'Shared data enabled', au_cloud_link:'Account activated', au_cloud_invite:'Activation code created', au_cloud_unlink:'Account deactivated' });
setTimeout(()=>{ cloudInit(); },0);

/* ===================================================================
   GỌN MENU · CHÍNH SÁCH BẢO HÀNH CHO KHÁCH · CHẤM CÔNG PHẢI Ở CÔNG TY
   =================================================================== */
/* bỏ "Hướng dẫn quy trình" và "Dữ liệu dùng chung" khỏi menu; chính sách bảo hành ra menu chính cho khách hàng */
const _navFinal=navItems; navItems=function(u=me()){ let r=_navFinal(u); if(!u) return r; const drop=['guide','cloud']; r=r.filter(n=>!drop.includes(n.k)).map(n=>n.more?Object.assign({},n,{more:n.more.filter(m=>!drop.includes(m.k))}):n);
  if(isExternal(u)){ r=r.map(n=>n.more?Object.assign({},n,{more:n.more.filter(m=>m.k!=='policy')}):n).filter(n=>n.k!=='policy'); const it={k:'policy',l:t('nav_policy')}; const mi=r.findIndex(n=>n.more); if(mi>=0) r.splice(mi,0,it); else r.push(it); }
  return r; };
const _tabAllowedFinal=tabAllowed; tabAllowed=function(k,u=me()){ if(k==='guide'||k==='cloud') return false; if(k==='policy') return !!u; return _tabAllowedFinal(k,u); };
/* trang chủ khách hàng: thẻ dẫn tới chính sách bảo hành */
const _erpViewPolC=erpView; erpView=function(k){ const h=_erpViewPolC(k); const u=me(); if(k==='home'&&u&&isExternal(u)) return `<button class="pol-card" data-a="nav" data-k="policy">${ic('shield',22)}<div><b>${t('nav_policy')}</b><small>${t('pol_card_h')}</small></div>${ic('right',16)}</button>`+(h||''); return h; };
Object.assign(DICT.vi,{ pol_card_h:'Thời hạn, phạm vi, các trường hợp không bảo hành và cách yêu cầu bảo hành — bấm để xem' });
Object.assign(DICT.en,{ pol_card_h:'Period, coverage, exclusions and how to claim — tap to read' });

/* ---------- chấm công chỉ được khi đang ở công ty ----------
   Cách 1: định vị GPS trong bán kính quanh công ty
   Cách 2: mã 6 số đổi mỗi 30 giây hiện trên màn hình đặt tại công ty (chống chấm từ xa kể cả khi giả GPS)
   Có thể bắt buộc thêm ảnh chụp tại chỗ */
const ATT_MODES=['gps_or_code','gps','code','both','off'];
function attCfg(){ const c=(DB.company||{}).att||{}; return Object.assign({mode:'gps_or_code',lat:null,lng:null,radius:150,selfie:true,secret:null},c); }
function attSecret(){ const c=attCfg(); return c.secret||('SGE-'+(SGE_CO.mst||'')+'-'+(SGE_CO.name||'')); }
async function attCode(slot){ const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(attSecret()+':'+slot)); const v=new DataView(b); return String(v.getUint32(0)%1000000).padStart(6,'0'); }
const attSlot=()=>Math.floor(Date.now()/30000);
async function attCodeOk(code){ code=String(code||'').replace(/\D/g,''); if(code.length!==6) return false; const s=attSlot(); for(const k of [s,s-1,s-2]){ if(await attCode(k)===code) return true; } return false; }
function geoDist(a,b,c,d){ const R=6371000,toR=x=>x*Math.PI/180; const dLat=toR(c-a),dLng=toR(d-b); const h=Math.sin(dLat/2)**2+Math.cos(toR(a))*Math.cos(toR(c))*Math.sin(dLng/2)**2; return Math.round(2*R*Math.asin(Math.sqrt(h))); }
function getPos(){ return new Promise(res=>{ if(!navigator.geolocation) return res({err:'unsupported'}); navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy)}),e=>res({err:e&&e.code===1?'denied':'fail'}),{enableHighAccuracy:true,timeout:12000,maximumAge:0}); }); }
/* mở hộp chấm công thay cho bấm là ghi ngay */
A.attIn = () => attOpen('in'); A.attOut = () => attOpen('out');
function attOpen(dir){ const c=attCfg(); if(c.mode==='off'){ return attCommit(dir,{method:'free'}); } openModal({type:'attCk',dir,f:{code:'',files:[],geo:null,geoSt:'wait'},err:{}}); attLocate(); }
async function attLocate(){ const m=S.ui.modal; if(!m||m.type!=='attCk') return; m.f.geoSt='wait'; rerender(); const c=attCfg(); if(c.mode==='code'){ m.f.geoSt='skip'; rerender(); return; } const p=await getPos(); const mm=S.ui.modal; if(!mm||mm.type!=='attCk') return;
  if(p.err){ mm.f.geoSt=p.err; mm.f.geo=null; } else if(c.lat==null){ mm.f.geoSt='nocfg'; mm.f.geo=p; } else { p.dist=geoDist(p.lat,p.lng,c.lat,c.lng); mm.f.geo=p; mm.f.geoSt=p.dist<=c.radius+Math.min(p.acc,100)?'in':'out'; } rerender(); }
MODALS.attCk = m => { const c=attCfg(); const f=m.f,E=m.err||{}; const g=f.geo; const needCode=c.mode==='code'||c.mode==='both'||(c.mode==='gps_or_code'&&f.geoSt!=='in'); const gpsUsed=c.mode!=='code';
  const geoLine=!gpsUsed?'':f.geoSt==='wait'?`<div class="ak-row wait">${ic('refresh',16)}<span>${t('ak_locating')}</span></div>`:f.geoSt==='in'?`<div class="ak-row ok">${ic('check',16)}<span>${t('ak_in',{d:g.dist,a:g.acc})}</span></div>`:f.geoSt==='out'?`<div class="ak-row bad">${ic('alert',16)}<span>${t('ak_out',{d:fmtNum(g.dist),r:c.radius})}</span></div>`:f.geoSt==='nocfg'?`<div class="ak-row warn">${ic('alert',16)}<span>${t('ak_nocfg')}</span></div>`:`<div class="ak-row warn">${ic('alert',16)}<span>${t('ak_geo_'+f.geoSt)}</span></div>`;
  return { title:t(m.dir==='in'?'att_in':'att_out')+' · '+hm(Date.now()), body:`${geoLine}${gpsUsed&&f.geoSt!=='wait'&&f.geoSt!=='in'?`<button class="btn sm" style="margin:6px 0 10px" data-a="attRetry">${ic('refresh',13)} ${t('ak_retry')}</button>`:''}
    ${needCode?`<div class="field" style="margin-top:10px"><label class="req">${t('ak_code')}</label><input class="input ak-code ${E.code?'err':''}" inputmode="numeric" maxlength="6" data-bind="modal.f.code" value="${esc(f.code)}" placeholder="••••••"><div class="hint">${t(c.mode==='gps_or_code'?'ak_code_h_or':'ak_code_h')}</div>${E.code?`<div class="err-text">${E.code}</div>`:''}</div>`:''}
    ${c.selfie?`<div class="field" style="margin-top:10px"><span class="lbl req">${t('ak_selfie')}</span><div class="payimgs">${f.files.map((a,i)=>`<div class="payimg"><img src="${PENDING_FILES[a.id]||imgSrc(a)}" alt=""><button type="button" class="icon-btn" data-a="mFileDel" data-i="${i}">${ic('x',13)}</button></div>`).join('')}${f.files.length?'':`<label class="payimg-add ${E.files?'err':''}">${ic('upload',18)}<span>${t('ak_take')}</span><input type="file" accept="image/*" capture="user" data-file="osFiles" hidden></label>`}</div>${E.files?`<div class="err-text">${E.files}</div>`:''}</div>`:''}`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="attConfirm" ${gpsUsed&&f.geoSt==='wait'?'disabled':''}>${t('ak_confirm')}</button>` }; };
A.attRetry = () => attLocate();
A.attConfirm = async () => { const m=S.ui.modal,f=m.f,c=attCfg(); const E={}; const gpsOk=f.geoSt==='in'; let codeOk=false;
  const needCode=c.mode==='code'||c.mode==='both'||(c.mode==='gps_or_code'&&!gpsOk); if(needCode){ codeOk=await attCodeOk(f.code); if(!codeOk) E.code=t('ak_code_bad'); }
  if((c.mode==='gps'||c.mode==='both')&&!gpsOk) E.geo=1; if(c.selfie&&!f.files.length) E.files=t('ak_selfie_req'); m.err=E;
  if(Object.keys(E).length){ if(E.geo&&!E.code) toast(t('ak_must_site'),'bad'); rerender(); return; }
  const dir=m.dir; S.ui.modal=null; attCommit(dir,{method:gpsOk&&codeOk?'gps+code':gpsOk?'gps':'code',geo:f.geo&&!f.geo.err?{lat:+f.geo.lat.toFixed(6),lng:+f.geo.lng.toFixed(6),acc:f.geo.acc,dist:f.geo.dist}:null,photo:f.files[0]||null}); };
function attCommit(dir,info){ const u=me(); const d=dkey(Date.now()); const now=Date.now(); let a;
  if(dir==='in') a=attSet(u.id,d,{in:now,type:'work',src:'self',inBy:info.method,inGeo:info.geo||null,inPhoto:info.photo||null});
  else { a=attSet(u.id,d,{out:now,outBy:info.method,outGeo:info.geo||null,outPhoto:info.photo||null}); if(a.in&&(a.out-a.in)/3600e3<5) a.type='half'; }
  audit(dir==='in'?'att_in':'att_out',u.name,`${hm(now)} · ${t('akm_'+info.method)}${info.geo?' · '+info.geo.dist+'m':''}`); save(); rerender(); toast(t(dir==='in'?'toast_att_in':'toast_att_out',{h:hm(now)}),'ok'); }
/* bảng chấm công: xem chi tiết cách chấm, vị trí, ảnh khi bấm vào ô (quản lý) */
const _mAttEd=MODALS.attEd; MODALS.attEd=m=>{ const r=_mAttEd(m); const a=attOf(m.u,m.d); if(!a||(!a.inBy&&!a.outBy)) return r; const line=(lb,by,g,ph,ts)=>by?`<div class="ak-log"><b>${lb} ${hm(ts)}</b> · ${t('akm_'+by)}${g?` · ${t('ak_dist',{d:g.dist??'?'})} <a href="https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}" target="_blank" rel="noopener">${t('fj_map')}</a>`:''}${ph?`<div class="msg-imgs" style="margin-top:6px">${proofThumb(ph)}</div>`:''}</div>`:'';
  r.body=`<div class="ak-logs">${line(t('att_in'),a.inBy,a.inGeo,a.inPhoto,a.in)}${line(t('att_out'),a.outBy,a.outGeo,a.outPhoto,a.out)}</div>`+r.body; return r; };
const _findImgAtt=findImg; findImg=function(fid){ const x=_findImgAtt(fid); if(x) return x; for(const a of (DB.att||[])) for(const p of [a.inPhoto,a.outPhoto]) if(p&&p.id===fid) return p; return null; };
/* màn hình mã chấm công đặt tại công ty */
function viewKiosk(){ const c=attCfg(); const today=dkey(Date.now()); const list=(DB.att||[]).filter(a=>a.d===today&&a.in).sort((x,y)=>y.in-x.in);
  return `<div class="kiosk"><div class="kiosk-h"><img src="${SGE_LOGO}" alt="SGE"><div><b>${t('ak_kiosk_t')}</b><small>${fmtD(Date.now())}</small></div></div><div class="kiosk-code" id="kioskCode">······</div><div class="kiosk-bar"><i id="kioskBar"></i></div><p class="kiosk-hint">${t('ak_kiosk_h')}</p>
    <div class="kiosk-list"><b>${t('ak_today_list',{n:list.length})}</b>${list.slice(0,12).map(a=>`<div><span>${esc(uname(a.uid))}</span><span class="num">${hm(a.in)}${a.out?' – '+hm(a.out):''}</span></div>`).join('')}</div></div>`; }
let KIOSK_T=null; async function kioskTick(){ const el=document.getElementById('kioskCode'); if(!el){ clearInterval(KIOSK_T); KIOSK_T=null; return; } const s=attSlot(); const c=await attCode(s); if(el.textContent!==c) el.textContent=c.slice(0,3)+' '+c.slice(3); const bar=document.getElementById('kioskBar'); if(bar) bar.style.width=(100-((Date.now()%30000)/300))+'%'; }
const _renderK=render; render=function(){ const r=_renderK.apply(this,arguments); if(document.getElementById('kioskCode')&&!KIOSK_T){ kioskTick(); KIOSK_T=setInterval(kioskTick,1000); } return r; };
/* cài đặt chấm công trong trang Thông tin công ty */
const _viewCompanyA=viewCompany; viewCompany=function(){ const h=_viewCompanyA(); const ed=isBossRole(me()); const c=S.ui.akc||(S.ui.akc=attCfg());
  const card=`<div class="card" style="margin-top:16px"><div class="card-h"><h3>${ic('clock',16)} ${t('ak_set_t')}</h3>${ed?`<button class="btn sm primary" data-a="akSave">${t('save')}</button>`:''}</div><div class="card-b"><p class="hint" style="margin-top:0">${t('ak_set_h')}</p>
    <div class="field"><span class="lbl">${t('ak_mode')}</span><div class="kind-pick ak-modes">${ATT_MODES.map(k=>`<button class="kp ${c.mode===k?'on':''}" data-a="akMode" data-v="${k}" ${ed?'':'disabled'}><b>${t('akmode_'+k)}</b><small>${t('akmode_'+k+'_h')}</small></button>`).join('')}</div></div>
    <div class="form-grid" style="margin-top:12px"><div class="field"><label>${t('ak_lat')}</label><input class="input num" data-bind="akc.lat" value="${c.lat??''}" ${ed?'':'readonly'}></div><div class="field"><label>${t('ak_lng')}</label><input class="input num" data-bind="akc.lng" value="${c.lng??''}" ${ed?'':'readonly'}></div>
      <div class="field"><label>${t('ak_radius')}</label><input class="input num" type="number" data-bind="akc.radius" value="${c.radius}" ${ed?'':'readonly'}></div><div class="field"><label class="row" style="gap:6px;margin-top:26px"><input type="checkbox" data-bind="akc.selfie" ${c.selfie?'checked':''} ${ed?'':'disabled'}> ${t('ak_selfie_set')}</label></div></div>
    ${ed?`<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn" data-a="akHere">${ic('globe',14)} ${t('ak_here')}</button><button class="btn" data-a="nav" data-k="kiosk">${ic('clock',14)} ${t('ak_open_kiosk')}</button><button class="btn ghost" data-a="akNewSecret">${t('ak_new_secret')}</button></div><p class="hint">${t('ak_here_h')}</p>`:''}</div></div>`;
  return h+card; };
A.akMode = el => { S.ui.akc.mode=el.dataset.v; rerender(); };
A.akHere = async () => { toast(t('ak_locating'),'ok'); const p=await getPos(); if(p.err){ toast(t('ak_geo_'+p.err),'bad'); return; } Object.assign(S.ui.akc,{lat:+p.lat.toFixed(6),lng:+p.lng.toFixed(6)}); rerender(); toast(t('ak_got',{a:p.acc}),'ok'); };
A.akNewSecret = () => { S.ui.akc.secret=genCode()+genCode(); toast(t('ak_secret_note'),'ok'); };
A.akSave = () => { const c=S.ui.akc; DB.company=DB.company||{}; DB.company.att={mode:c.mode,lat:c.lat===''||c.lat==null?null:Number(c.lat),lng:c.lng===''||c.lng==null?null:Number(c.lng),radius:Math.max(30,Number(c.radius)||150),selfie:!!c.selfie,secret:c.secret||(attCfg().secret)||null}; audit('att_cfg','',t('akmode_'+c.mode)); save(); rerender(); toast(t('toast_saved'),'ok'); };
/* nút mở màn hình mã ở trang chấm công (quản lý) */
const _viewAttK=viewAtt; viewAtt=function(){ const h=_viewAttK(); if(!isBossRole(me())) return h; return h.replace(`<button class="btn" data-a="lvAsk">${t('lv_ask')}</button>`,`<button class="btn" data-a="nav" data-k="kiosk">${ic('clock',15)} ${t('ak_open_kiosk')}</button><button class="btn" data-a="lvAsk">${t('lv_ask')}</button>`); };
const _erpViewK=erpView; erpView=function(k){ if(k==='kiosk') return viewKiosk(); return _erpViewK(k); };
const _tabAllowedK=tabAllowed; tabAllowed=function(k,u=me()){ if(k==='kiosk') return !!u&&isBossRole(u); return _tabAllowedK(k,u); };
const _tabTitleK=tabTitle; tabTitle=function(k){ if(k==='kiosk') return t('ak_kiosk_tab'); return _tabTitleK(k); };
Object.assign(DICT.vi,{ ak_locating:'Đang lấy vị trí…', ak_in:'Đang ở công ty (cách {d} m, sai số ±{a} m)', ak_out:'Bạn đang cách công ty {d} m (cho phép {r} m). Phải ở công ty mới chấm công được.', ak_nocfg:'Công ty chưa cài vị trí — cần nhập mã tại công ty.', ak_geo_denied:'Bạn chưa cho phép lấy vị trí. Bật quyền vị trí cho trình duyệt hoặc nhập mã tại công ty.', ak_geo_fail:'Không lấy được vị trí. Ra chỗ thoáng thử lại hoặc nhập mã tại công ty.', ak_geo_unsupported:'Thiết bị không hỗ trợ định vị — nhập mã tại công ty.',
  ak_retry:'Thử lấy lại vị trí', ak_code:'Mã chấm công tại công ty', ak_code_h:'Xem mã 6 số trên màn hình đặt tại công ty (đổi mỗi 30 giây).', ak_code_h_or:'Không xác nhận được vị trí? Nhập mã 6 số trên màn hình đặt tại công ty (đổi mỗi 30 giây).', ak_code_bad:'Mã không đúng hoặc đã hết hạn', ak_selfie:'Ảnh chụp tại chỗ', ak_take:'Chụp ảnh', ak_selfie_req:'Cần chụp ảnh khi chấm công', ak_confirm:'Xác nhận chấm công', ak_must_site:'Phải ở công ty mới chấm công được', ak_dist:'cách công ty {d} m',
  akm_gps:'định vị', akm_code:'mã tại công ty', 'akm_gps+code':'định vị + mã', akm_free:'tự do',
  ak_kiosk_t:'Mã chấm công SGE', ak_kiosk_tab:'Màn hình mã chấm công', ak_kiosk_h:'Nhân viên mở hệ thống trên điện thoại → Chấm công → nhập mã đang hiện. Mã đổi mỗi 30 giây nên không gửi cho người ở xa được.', ak_today_list:'Đã chấm hôm nay: {n}',
  ak_set_t:'Chấm công tại công ty', ak_set_h:'Chọn cách xác nhận nhân viên đang ở công ty khi chấm công. Khuyên dùng: định vị hoặc mã — và đặt 1 máy tính/máy tính bảng ở công ty mở "Màn hình mã chấm công".', ak_mode:'Cách xác nhận',
  akmode_gps_or_code:'Định vị HOẶC mã', akmode_gps_or_code_h:'Ở trong bán kính là chấm được; định vị lỗi thì nhập mã tại công ty', akmode_gps:'Chỉ định vị', akmode_gps_h:'Phải ở trong bán kính quanh công ty', akmode_code:'Chỉ mã tại công ty', akmode_code_h:'Chặt nhất: phải nhìn màn hình mã ở công ty', akmode_both:'Định vị VÀ mã', akmode_both_h:'Cần cả hai', akmode_off:'Tắt kiểm tra', akmode_off_h:'Chấm ở đâu cũng được (không khuyên dùng)',
  ak_lat:'Vĩ độ công ty', ak_lng:'Kinh độ công ty', ak_radius:'Bán kính cho phép (m)', ak_selfie_set:'Bắt buộc chụp ảnh khi chấm công', ak_here:'Lấy vị trí hiện tại làm vị trí công ty', ak_here_h:'Đứng tại công ty rồi bấm "Lấy vị trí hiện tại", sau đó bấm Lưu.', ak_got:'Đã lấy vị trí (sai số ±{a} m) — bấm Lưu', ak_open_kiosk:'Mở màn hình mã chấm công', ak_new_secret:'Đổi khóa mã', ak_secret_note:'Đã tạo khóa mới — bấm Lưu. Màn hình mã cần mở lại.', au_att_cfg:'Cài đặt chấm công' });
Object.assign(DICT.en,{ ak_locating:'Getting location…', ak_in:'At the company ({d} m away, ±{a} m)', ak_out:'You are {d} m from the company (allowed {r} m). Check-in only works on site.', ak_nocfg:'Company location not set — enter the on-site code.', ak_geo_denied:'Location permission denied. Allow it or enter the on-site code.', ak_geo_fail:'Could not get location. Try again or enter the on-site code.', ak_geo_unsupported:'No location support — enter the on-site code.',
  ak_retry:'Retry location', ak_code:'On-site code', ak_code_h:'Read the 6-digit code on the office screen (changes every 30 s).', ak_code_h_or:'Location not confirmed? Enter the 6-digit code on the office screen.', ak_code_bad:'Wrong or expired code', ak_selfie:'On-site photo', ak_take:'Take photo', ak_selfie_req:'A photo is required', ak_confirm:'Confirm', ak_must_site:'You must be at the company to check in', ak_dist:'{d} m from company',
  akm_gps:'location', akm_code:'on-site code', 'akm_gps+code':'location + code', akm_free:'unrestricted',
  ak_kiosk_t:'SGE check-in code', ak_kiosk_tab:'Check-in code screen', ak_kiosk_h:'Staff open the app on their phone → Check in → type the code shown. It changes every 30 s so it cannot be used remotely.', ak_today_list:'Checked in today: {n}',
  ak_set_t:'On-site check-in', ak_set_h:'Choose how to confirm staff are at the company. Recommended: location or code, with an office device showing the code screen.', ak_mode:'Method',
  akmode_gps_or_code:'Location OR code', akmode_gps_or_code_h:'Within radius, or enter the office code', akmode_gps:'Location only', akmode_gps_h:'Must be within the radius', akmode_code:'Office code only', akmode_code_h:'Strictest', akmode_both:'Location AND code', akmode_both_h:'Both required', akmode_off:'Off', akmode_off_h:'Anywhere (not recommended)',
  ak_lat:'Latitude', ak_lng:'Longitude', ak_radius:'Allowed radius (m)', ak_selfie_set:'Require a photo', ak_here:'Use my current location', ak_here_h:'Stand at the company, tap "Use my current location", then Save.', ak_got:'Location captured (±{a} m) — Save', ak_open_kiosk:'Open check-in code screen', ak_new_secret:'Rotate key', ak_secret_note:'New key created — Save, then reopen the code screen.', au_att_cfg:'Check-in settings' });

/* ===== CHẤM CÔNG CHỈ BẰNG ĐỊNH VỊ GPS (cách 1) ===== */
const _attCfgG=attCfg; attCfg=function(){ const c=_attCfgG(); c.mode='gps'; return c; };
A.attIn = () => attOpen('in'); A.attOut = () => attOpen('out');
/* hộp chấm công: không còn ô nhập mã; hướng dẫn bật định vị khi bị chặn */
const _mAttCk=MODALS.attCk; MODALS.attCk=m=>{ const r=_mAttCk(m); const f=m.f; const c=attCfg();
  if(c.lat==null) r.body=`<div class="ak-row bad">${ic('alert',16)}<span>${t('akg_nocfg')}</span></div>`;
  else if(['denied','fail','unsupported'].includes(f.geoSt)) r.body=r.body.replace(/<div class="ak-row warn">[\s\S]*?<\/div>/,`<div class="ak-row bad">${ic('alert',16)}<span>${t('akg_'+f.geoSt)}</span></div>`)+`<details class="ak-help"><summary>${t('akg_how')}</summary><ol><li>${t('akg_how1')}</li><li>${t('akg_how2')}</li><li>${t('akg_how3')}</li></ol></details>`;
  if(f.geo&&f.geo.acc>300&&f.geoSt!=='in') r.body+=`<p class="hint">${t('akg_weak',{a:f.geo.acc})}</p>`;
  return r; };
const _attConfirmG=A.attConfirm; A.attConfirm=async()=>{ const m=S.ui.modal; const c=attCfg(); if(c.lat==null){ toast(t('akg_nocfg'),'bad'); return; } if(m.f.geoSt!=='in'){ toast(t('ak_must_site'),'bad'); return; } return _attConfirmG(); };
/* cài đặt: chỉ còn vị trí, bán kính, ảnh */
const _viewCompanyG=viewCompany; viewCompany=function(){ let h=_viewCompanyG(); h=h.replace(/<div class="field"><span class="lbl">[^<]*<\/span><div class="kind-pick ak-modes">[\s\S]*?<\/div><\/div>/,'').replace(/<button class="btn" data-a="nav" data-k="kiosk">[\s\S]*?<\/button>/,'').replace(/<button class="btn ghost" data-a="akNewSecret">[\s\S]*?<\/button>/,''); return h.replace(t('ak_set_h'),t('akg_set_h')); };
const _viewAttG=viewAtt; viewAtt=function(){ return _viewAttG().replace(/<button class="btn" data-a="nav" data-k="kiosk">[\s\S]*?<\/button>/,''); };
const _tabAllowedG=tabAllowed; tabAllowed=function(k,u=me()){ if(k==='kiosk') return false; return _tabAllowedG(k,u); };
/* nhắc quản lý cài vị trí công ty */
const _todayTasksG=todayTasks; todayTasks=function(u){ const L0=_todayTasksG(u); if(['manager','dev'].includes(u.role)&&attCfg().lat==null) L0.unshift({key:'td_akcfg',n:1,items:[{akcfg:1,no:t('nav_company'),company:t('akg_nocfg_short')}]}); return L0; };
const _taskItemG=taskItem; taskItem=function(x){ if(x.akcfg) return `<button class="mini-item" data-a="nav" data-k="company"><span class="t"><div><b>${esc(x.no)}</b> ${esc(x.company)}</div></span></button>`; return _taskItemG(x); };
URGENT_KEYS.push('td_akcfg');
Object.assign(DICT.vi,{ akg_set_h:'Nhân viên chỉ chấm công được khi điện thoại xác định đang ở trong bán kính quanh công ty. Đứng tại công ty, bấm "Lấy vị trí hiện tại", chỉnh bán kính rồi Lưu.',
  akg_nocfg:'Công ty chưa cài vị trí chấm công. Quản lý vào Thêm → Thông tin công ty → "Lấy vị trí hiện tại làm vị trí công ty".', akg_nocfg_short:'Chưa cài vị trí chấm công', td_akcfg:'Cần cài vị trí công ty để chấm công',
  akg_denied:'Điện thoại đang chặn quyền vị trí nên không chấm công được.', akg_fail:'Chưa lấy được vị trí. Bật GPS, ra chỗ thoáng rồi bấm "Thử lấy lại vị trí".', akg_unsupported:'Thiết bị không hỗ trợ định vị, không chấm công được. Báo quản lý để chấm thay.',
  akg_how:'Cách bật quyền vị trí', akg_how1:'iPhone: Cài đặt → Quyền riêng tư → Dịch vụ định vị → bật, và cho phép trình duyệt / app Claude dùng vị trí.', akg_how2:'Android: kéo thanh thông báo → bật Vị trí; khi trình duyệt hỏi "Cho phép truy cập vị trí" chọn Cho phép.', akg_how3:'Vẫn không được: báo quản lý chấm công thay trong bảng chấm công.',
  akg_weak:'Tín hiệu định vị yếu (sai số ±{a} m) — ra gần cửa / chỗ thoáng để chính xác hơn.' });
Object.assign(DICT.en,{ akg_set_h:'Staff can only check in when their phone is within the radius around the company. Stand at the company, tap "Use my current location", adjust the radius and Save.',
  akg_nocfg:'Company location not set. Manager: More → Company info → "Use my current location".', akg_nocfg_short:'Check-in location not set', td_akcfg:'Set the company location for check-in',
  akg_denied:'Location permission is blocked, so check-in is not possible.', akg_fail:'Could not get location. Turn on GPS, move to an open spot and retry.', akg_unsupported:'This device has no location support. Ask your manager to record attendance.',
  akg_how:'How to allow location', akg_how1:'iPhone: Settings → Privacy → Location Services → on, and allow the browser / Claude app.', akg_how2:'Android: pull down quick settings → Location on; allow when the browser asks.', akg_how3:'Still failing: ask your manager to record it in the attendance sheet.',
  akg_weak:'Weak location signal (±{a} m) — move closer to a door or open area.' });
const _mAttCk2=MODALS.attCk; MODALS.attCk=m=>{ const r=_mAttCk2(m); if(m.f.geoSt!=='in') r.foot=r.foot.replace('data-a="attConfirm"','data-a="attConfirm" disabled'); return r; };
/* Nhân sự trên điện thoại: chọn người thì hiện hồ sơ, có nút quay lại danh sách */
const _viewStaffM=viewStaff; viewStaff=function(){ const h=_viewStaffM(); const f=S.ui.stf||{}; if(!f.open) return h; return h.replace('<div class="staff-wrap">',`<div class="staff-wrap has-sel"><button class="btn sm staff-back" data-a="stfBack">← ${t('stf_back')}</button>`); };
A.stfBack = () => { S.ui.stf.open=null; rerender(); window.scrollTo(0,0); };
const _stfOpenM=A.stfOpen; A.stfOpen=el=>{ _stfOpenM(el); if(window.innerWidth<761) window.scrollTo(0,0); };
Object.assign(DICT.vi,{ stf_back:'Danh sách nhân sự' }); Object.assign(DICT.en,{ stf_back:'Staff list' });

/* ===================================================================
   BIÊN BẢN GIAO NHẬN: điền xong là ra phiếu để khách ký ngay trên màn hình
   =================================================================== */
const hoOfTicket=(x,kind)=>(DB.handovers||[]).find(h=>h.ref&&h.ref.kind==='ticket'&&h.ref.id===x.id&&h.kind===kind);
/* nút chính của form: Lưu & mở biên bản để ký */
const _mHoForm=MODALS.hoForm; MODALS.hoForm=m=>{ const r=_mHoForm(m); r.foot=`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn" data-a="hoSave">${t('ho_save_only')}</button><button class="btn primary" data-a="hoSave" data-print="1">${ic('edit',15)} ${t('ho_save_sign')}</button>`; return r; };
/* nhận máy xong (đã chụp hình tiếp nhận) → mở ngay biên bản nhận hàng để khách ký */
const _pfOkHo=A.pfOk; A.pfOk=()=>{ const m=S.ui.modal; const stage=m&&m.stage; const tid=m&&m.tid; _pfOkHo(); const x=tid&&ticketById(tid); if(!x) return;
  if(stage==='intake'&&x.intake&&!hoOfTicket(x,'receive')&&!S.ui.modal) openModal({type:'hoForm',f:hoDraft('receive',{kind:'ticket',id:x.id})});
  if(stage==='delivery'&&x.status==='delivered'&&!hoOfTicket(x,'deliver')&&!S.ui.modal) openModal({type:'hoForm',f:hoDraft('deliver',{kind:'ticket',id:x.id})}); };
/* ký ngay trên trang biên bản */
function hoSetSignInHtml(html,idx,img){ const d=document.createElement('div'); d.innerHTML=html; const cells=d.querySelectorAll('table.sign td.s'); if(cells[idx]) cells[idx].innerHTML=img?`<img src="${img}" alt="">`:''; return d.innerHTML; }
const _viewDocEdHo=viewDocEditor; viewDocEditor=function(key){ let h=_viewDocEdHo(key); const src=docSource(key); if(!src||src.type!=='ho') return h; const ho=src.host;
  const bar=`<div class="ho-signbar">${['A','B'].map(k=>{ const ok=!!ho['sign'+k]; const P=ho[k]||{}; return `<button class="ho-sb ${ok?'ok':''}" data-a="hoSignAsk" data-id="${ho.id}" data-k="${k}">${ic(ok?'check':'edit',18)}<div><b>${t('ho_sign_btn_'+k)}</b><small>${esc(P.rep||P.company||'')}${ok?' · '+t('ho_signed_ok'):' · '+t('ho_tap_sign')}</small></div></button>`; }).join('')}</div>`;
  return h.replace('<div class="doc-ed-wrap',bar+'<div class="doc-ed-wrap'); };
A.hoSignAsk = el => { const ho=DB.handovers.find(x=>x.id===el.dataset.id); const k=el.dataset.k; openModal({type:'hoSign',id:ho.id,k,f:{['sign'+k]:ho['sign'+k]||''}}); };
MODALS.hoSign = m => { const ho=DB.handovers.find(x=>x.id===m.id); const P=ho[m.k]||{}; return { title:`${t('ho_sign_btn_'+m.k)} · ${esc(ho.no)}`, body:`<p style="margin:0 0 8px"><b>${esc(P.rep||'')}</b>${P.title?' – '+esc(P.title):''}<br><span class="muted">${esc(P.company||'')}</span></p><canvas class="sig-pad big" data-sig="${m.k}" aria-label="${t('ho_sign_here')}"></canvas><div class="row" style="justify-content:space-between;margin-top:8px"><span class="hint">${t('ho_sign_tip2')}</span><button class="btn sm ghost" data-a="hoSigClear" data-k="${m.k}">${t('ho_clear_sig')}</button></div>`,
  foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="hoSignSave">${ic('check',15)} ${t('ho_sign_ok')}</button>` }; };
A.hoSignSave = () => { const m=S.ui.modal; const ho=DB.handovers.find(x=>x.id===m.id); const img=m.f['sign'+m.k]||''; if(!img){ toast(t('ho_sign_empty'),'bad'); return; } ho['sign'+m.k]=img; ho['signAt'+m.k]=Date.now();
  if(ho.edit&&ho.edit.html) ho.edit.html=hoSetSignInHtml(ho.edit.html,m.k==='A'?0:1,img);
  audit('ho_sign',ho.no,t('ho_sign_btn_'+m.k)); S.ui.modal=null; save(); rerender(); toast(t('ho_sign_done'),'ok'); };
/* khung Giấy tờ: hiện tình trạng chữ ký */
const _docsBoxHo=docsBox; docsBox=function(x){ let h=_docsBoxHo(x); ['receive','deliver'].forEach(k=>{ const ho=hoOfTicket(x,k); if(!ho) return; const n=(ho.signA?1:0)+(ho.signB?1:0); h=h.replace(`<b>${t('ho_doc_'+k)}</b><small class="muted">`,`<b>${t('ho_doc_'+k)}</b><small class="muted"><span class="kst ${n===2?'k-ok':'k-warn'}" style="margin-right:6px">${n===2?t('ho_signed2'):t('ho_signed_n',{n})}</span>`); }); return h; };
Object.assign(DICT.vi,{ ho_save_only:'Chỉ lưu', ho_save_sign:'Lưu & mở biên bản để ký', ho_sign_btn_A:'Bên A ký tên', ho_sign_btn_B:'Bên B ký tên', ho_signed_ok:'đã ký', ho_tap_sign:'bấm để ký', ho_sign_tip2:'Ký bằng ngón tay hoặc bút cảm ứng vào khung trên', ho_sign_ok:'Xác nhận chữ ký', ho_sign_empty:'Chưa có chữ ký', ho_sign_done:'Đã thêm chữ ký vào biên bản', ho_signed2:'Đã ký đủ 2 bên', ho_signed_n:'Đã ký {n}/2', au_ho_sign:'Ký biên bản giao nhận' });
Object.assign(DICT.en,{ ho_save_only:'Save only', ho_save_sign:'Save & open for signing', ho_sign_btn_A:'Party A signs', ho_sign_btn_B:'Party B signs', ho_signed_ok:'signed', ho_tap_sign:'tap to sign', ho_sign_tip2:'Sign with a finger or stylus in the box', ho_sign_ok:'Confirm signature', ho_sign_empty:'No signature yet', ho_sign_done:'Signature added', ho_signed2:'Signed by both', ho_signed_n:'Signed {n}/2', au_ho_sign:'Handover signed' });

/* ===================================================================
   CHẤM CÔNG NGOÀI CÔNG TY (đi công trình, gặp khách, mua hàng…)
   - Gắn với phiếu công tác được phân công hôm nay → tự duyệt
   - Lý do khác → chờ quản lý duyệt; luôn lưu vị trí + ảnh
   =================================================================== */
const OFF_REASONS=['field','customer','purchase','delivery','other'];
function myFjToday(u){ const t0=dayStart(Date.now()); return (DB.fjobs||[]).filter(j=>j.team.includes(u.id)&&j.status!=='cancelled'&&dayStart(j.date)===t0); }
const _mAttCkOff=MODALS.attCk; MODALS.attCk=m=>{ const r=_mAttCkOff(m); const f=m.f; const u=me(); if(m.dir!=='in'&&!(attOf(u.id,dkey(Date.now()))||{}).offsite) return r; if(f.geoSt==='in'||f.geoSt==='wait') return r;
  f.off=f.off||{on:false,reason:myFjToday(u).length?'field':'customer',fjId:(myFjToday(u)[0]||{}).id||'',note:''}; const o=f.off; const fjs=myFjToday(u); const auto=o.reason==='field'&&o.fjId;
  const sec=`<div class="off-box ${o.on?'on':''}"><label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" data-bind="modal.f.off.on" data-re ${o.on?'checked':''}><b>${t('off_toggle')}</b></label>
    ${o.on?`<div class="form-grid" style="margin-top:10px"><div class="field full"><span class="lbl">${t('off_reason')}</span><div class="seg" style="flex-wrap:wrap">${OFF_REASONS.map(k=>`<button class="${o.reason===k?'on':''}" data-a="offReason" data-v="${k}">${t('off_r_'+k)}</button>`).join('')}</div></div>
      ${o.reason==='field'?`<div class="field full"><label class="req">${t('off_fj')}</label>${fjs.length?`<select class="select" data-bind="modal.f.off.fjId" data-re>${fjs.map(j=>`<option value="${j.id}" ${o.fjId===j.id?'selected':''}>${j.no} · ${esc((siteById(j.siteId)||{}).name||'')}</option>`).join('')}</select>`:`<div class="hint" style="color:var(--warn)">${t('off_no_fj')}</div>`}</div>`:''}
      <div class="field full"><label class="${auto?'':'req'}">${t('off_note')}</label><input class="input" data-bind="modal.f.off.note" value="${esc(o.note)}" placeholder="${t('off_note_ph')}"></div></div>
      <p class="hint" style="margin:6px 0 0">${auto?t('off_auto'):t('off_pending')}</p>`:`<p class="hint" style="margin:6px 0 0">${t('off_hint')}</p>`}</div>`;
  r.body=r.body+sec; if(o.on) r.foot=r.foot.replace('data-a="attConfirm" disabled','data-a="attConfirm"'); return r; };
A.offReason = el => { const o=S.ui.modal.f.off; o.reason=el.dataset.v; if(o.reason==='field'&&!o.fjId) o.fjId=(myFjToday(me())[0]||{}).id||''; rerender(); };
const _attConfirmOff=A.attConfirm; A.attConfirm=async()=>{ const m=S.ui.modal; const f=m.f; const o=f.off; const u=me(); const cur=attOf(u.id,dkey(Date.now()));
  const offOut=m.dir==='out'&&cur&&cur.offsite; if(!(o&&o.on)&&!offOut) return _attConfirmOff();
  const c=attCfg(); if(c.selfie&&!f.files.length){ m.err={files:t('ak_selfie_req')}; rerender(); return; }
  if(o&&o.on){ if(o.reason==='field'&&!o.fjId){ toast(t('off_no_fj'),'bad'); return; } const auto=o.reason==='field'&&!!o.fjId; if(!auto&&!String(o.note||'').trim()){ toast(t('off_note')+': '+t('e_required'),'bad'); return; } }
  const geo=f.geo&&!f.geo.err?{lat:+f.geo.lat.toFixed(6),lng:+f.geo.lng.toFixed(6),acc:f.geo.acc,dist:f.geo.dist}:null; const dir=m.dir; S.ui.modal=null;
  if(dir==='in'){ const auto=o.reason==='field'&&!!o.fjId; const j=o.fjId&&fjById(o.fjId);
    attCommit('in',{method:'offsite',geo,photo:f.files[0]||null}); const a=attOf(u.id,dkey(Date.now())); a.offsite={reason:o.reason,fjId:o.reason==='field'?o.fjId:null,fjNo:j?j.no:'',note:String(o.note||'').trim(),status:auto?'approved':'pending',at:Date.now()};
    if(!auto) notify({toRole:'manager',key:'n_off',vars:{u:u.name,r:t('off_r_'+o.reason)}}); save(); rerender(); if(!auto) toast(t('off_sent'),'ok'); }
  else attCommit('out',{method:geo&&geo.dist!=null&&geo.dist<=c.radius?'gps':'offsite',geo,photo:f.files[0]||null}); };
/* tính công: chấm ngoài công ty chưa duyệt / bị từ chối thì chưa tính */
const _attSummaryOff=attSummary; attSummary=function(uid,days){ const hidden=[]; (DB.att||[]).forEach(a=>{ if(a.uid===uid&&a.offsite&&a.offsite.status!=='approved'&&days.includes(a.d)){ hidden.push([a,a.type]); a.type='__p'; } }); try{ const s=_attSummaryOff(uid,days); s.pendingOff=hidden.filter(([a])=>a.offsite.status==='pending').length; return s; } finally { hidden.forEach(([a,tp])=>{ a.type=tp; }); } };
A.offDecide = el => { const a=(DB.att||[]).find(z=>z.id===el.dataset.id); a.offsite.status=el.dataset.v; a.offsite.by=S.userId; a.offsite.decidedAt=Date.now(); notify({toUser:a.uid,key:el.dataset.v==='approved'?'n_off_ok':'n_off_no',vars:{d:fmtD(new Date(a.d+'T12:00').getTime())}}); audit('off_'+el.dataset.v,uname(a.uid),a.d+' · '+t('off_r_'+a.offsite.reason)); save(); rerender(); };
const _viewAttOff=viewAtt; viewAtt=function(){ let h=_viewAttOff(); const hr=canHR(); const pend=(DB.att||[]).filter(a=>a.offsite&&a.offsite.status==='pending'&&(hr||a.uid===S.userId)); if(!pend.length) return h;
  const card=`<div class="card" style="margin-bottom:14px;border-color:var(--blue)"><div class="card-h"><h3>${t('off_pending_t')}</h3><span class="kst k-blue">${pend.length}</span></div><div class="card-b">${pend.map(a=>`<div class="dl-row"><div class="dl-l">${a.inPhoto?`<span class="msg-imgs" style="margin:0">${proofThumb(a.inPhoto)}</span>`:ic('globe',16)}<div><b>${esc(uname(a.uid))} · ${t('off_r_'+a.offsite.reason)}</b><small class="muted">${fmtD(new Date(a.d+'T12:00').getTime())} ${hm(a.in)} · ${esc(a.offsite.note||'')}${a.inGeo?` · <a href="https://www.google.com/maps/search/?api=1&query=${a.inGeo.lat},${a.inGeo.lng}" target="_blank" rel="noopener">${t('fj_map')}</a> (${t('ak_dist',{d:fmtNum(a.inGeo.dist||0)})})`:''}</small></div></div><div class="dl-a">${isBossRole(me())?`<button class="btn sm okb" data-a="offDecide" data-id="${a.id}" data-v="approved">${t('approve')}</button><button class="btn sm danger" data-a="offDecide" data-id="${a.id}" data-v="rejected">${t('reject')}</button>`:`<span class="hint">${t('cv_wait_mgr')}</span>`}</div></div>`).join('')}</div></div>`;
  return h.replace('<div class="card"><div class="card-h"><h3>'+t('att_grid'),card+'<div class="card"><div class="card-h"><h3>'+t('att_grid')); };
/* ô bảng công: CT = công tác ngoài, ? = chờ duyệt */
const _viewAttOff2=viewAtt; viewAtt=function(){ let h=_viewAttOff2(); (DB.att||[]).filter(a=>a.offsite).forEach(a=>{ const sym=a.offsite.status==='approved'?'CT':a.offsite.status==='pending'?'?':'✗'; const cls=a.offsite.status==='approved'?'off-ok':a.offsite.status==='pending'?'off-p':'absent';
  const re=new RegExp(`(data-u="${a.uid}" data-d="${a.d}"><span class=")[^"]*("[^>]*>)[^<]*`); h=h.replace(re,`$1ac ${cls}$2${sym}`); }); return h.replace(t('att_legend'),t('att_legend')+' · '+t('off_legend')); };
const _todayTasksOff=todayTasks; todayTasks=function(u){ const L0=_todayTasksOff(u); if(['manager','dev'].includes(u.role)){ const p=(DB.att||[]).filter(a=>a.offsite&&a.offsite.status==='pending'); if(p.length) L0.push({key:'td_off',n:p.length,items:p.map(a=>({leave:1,no:uname(a.uid),company:`${a.d} · ${t('off_r_'+a.offsite.reason)}`}))}); } return L0; };
Object.assign(DICT.vi,{ off_toggle:'Tôi đang đi công tác / làm việc bên ngoài', off_hint:'Đi công trình, gặp khách, mua hàng… thì bật mục này để chấm công ngoài công ty.', off_reason:'Đang đi', off_r_field:'Công trình (phiếu công tác)', off_r_customer:'Gặp khách hàng', off_r_purchase:'Mua hàng / vật tư', off_r_delivery:'Giao / nhận máy', off_r_other:'Việc khác',
  off_fj:'Phiếu công tác hôm nay', off_no_fj:'Hôm nay bạn không có phiếu công tác nào — chọn lý do khác hoặc báo quản lý tạo phiếu.', off_note:'Ghi chú (đi đâu, làm gì)', off_note_ph:'VD: Giao máy cho Cty Minh Long – KCN Sơn La', off_auto:'Có phiếu công tác được phân công → công được tính ngay.', off_pending:'Chấm công ngoài công ty sẽ chờ quản lý duyệt mới được tính công.',
  off_sent:'Đã chấm công ngoài công ty — chờ quản lý duyệt', off_pending_t:'Chấm công ngoài công ty chờ duyệt', off_legend:'CT công tác ngoài · ? chờ duyệt', n_off:'{u} chấm công ngoài công ty ({r}) — cần duyệt', n_off_ok:'Chấm công ngoài công ty ngày {d} đã được duyệt', n_off_no:'Chấm công ngoài công ty ngày {d} bị từ chối', td_off:'Chấm công ngoài công ty chờ duyệt',
  akm_offsite:'ngoài công ty', au_off_approved:'Duyệt công tác ngoài', au_off_rejected:'Từ chối công tác ngoài' });
Object.assign(DICT.en,{ off_toggle:'I am working off-site', off_hint:'At a site, meeting a customer, buying parts… turn this on to check in off-site.', off_reason:'Reason', off_r_field:'Site (field job)', off_r_customer:'Customer meeting', off_r_purchase:'Purchasing', off_r_delivery:'Pickup / delivery', off_r_other:'Other',
  off_fj:'Today’s field job', off_no_fj:'No field job assigned today — choose another reason or ask your manager.', off_note:'Note (where, what)', off_note_ph:'e.g. delivering a unit to a customer', off_auto:'Assigned field job → counted immediately.', off_pending:'Off-site check-ins need manager approval before they count.',
  off_sent:'Off-site check-in sent for approval', off_pending_t:'Off-site check-ins awaiting approval', off_legend:'CT off-site · ? pending', n_off:'{u} checked in off-site ({r}) — approval needed', n_off_ok:'Off-site check-in on {d} approved', n_off_no:'Off-site check-in on {d} rejected', td_off:'Off-site check-ins awaiting approval',
  akm_offsite:'off-site', au_off_approved:'Off-site approved', au_off_rejected:'Off-site rejected' });

/* ===================================================================
   VÁ LỖ HỔNG & BỔ SUNG (rà soát lần cuối)
   =================================================================== */
/* 1) Không im lặng khi bộ nhớ trình duyệt đầy — báo ngay để sao lưu, tránh mất dữ liệu */
let SAVE_WARNED=0; const _saveQ=save; save=function(){ _saveQ(); setTimeout(()=>{ try{ const probe=JSON.stringify({db:DB}); if(probe.length>4500000&&Date.now()-SAVE_WARNED>600000){ SAVE_WARNED=Date.now(); toast(t('ls_near_full',{m:(probe.length/1048576).toFixed(1)}),'bad'); } localStorage.setItem('__sge_probe','1'); }catch(e){ if(Date.now()-SAVE_WARNED>60000){ SAVE_WARNED=Date.now(); toast(t('ls_full'),'bad'); } } },400); };
/* 2) Khách hàng không dùng trợ lý AI nội bộ (tránh lộ dữ liệu khách khác) */
const _aiToggleX=aiToggle; aiToggle=function(on){ const u=me(); if(u&&isExternal(u)){ toast(t('ai_staff_only'),'bad'); return; } return _aiToggleX(on); };
const _aiSearchX=aiSearch; aiSearch=function(q,l){ const u=me(); if(u&&isExternal(u)) return []; return _aiSearchX(q,l); };
const _renderX2=render; render=function(){ const r=_renderX2.apply(this,arguments); try{ const u=me(); document.body.classList.toggle('is-ext',!!(u&&isExternal(u))); }catch(e){} return r; };
/* 3) Ngày lễ: không tính vắng, được tính công hưởng lương */
function isHoliday(d){ return (DB.holidays||[]).includes(d); }
const _attSummaryHol=attSummary; attSummary=function(uid,days){ const s=_attSummaryHol(uid,days); const today=dkey(Date.now()); days.forEach(d=>{ if(!isHoliday(d)||isSun(d)||d>today) return; const a=attOf(uid,d); if(!a){ s.cong+=1; s.absent=Math.max(0,s.absent-1); s.holiday=(s.holiday||0)+1; } }); return s; };
const _viewAttHol=viewAtt; viewAtt=function(){ let h=_viewAttHol(); const f=S.ui.att||{}; const [y,mo]=(f.ym||dkey(Date.now()).slice(0,7)).split('-').map(Number); const days=monthDays(y,mo-1); const hol=days.filter(isHoliday);
  days.forEach(d=>{ if(!isHoliday(d)) return; h=h.replace(new RegExp(`(<td class="[^"]*)("[^>]*>(?:<button class="ac-btn" data-a="attEdit" data-u="[^"]+" data-d="${d}">)?<span class="ac absent">K</span>)`,'g'),'$1 hol$2').replace(new RegExp(`(data-d="${d}"><span class=")ac absent(">)K`,'g'),'$1ac hol$2L'); });
  const box=isBossRole(me())?`<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>${t('hol_t')}</h3><span class="hint">${t('hol_h')}</span></div><div class="card-b row" style="gap:8px;flex-wrap:wrap">${hol.map(d=>`<span class="chip">${fmtD(new Date(d+'T12:00').getTime())} <button class="link-btn" data-a="holDel" data-d="${d}">✕</button></span>`).join('')}<input class="input sm" type="date" id="holNew" style="width:auto"><button class="btn sm" data-a="holAdd">${ic('plus',13)} ${t('hol_add')}</button></div></div>`:'';
  return h.replace('<div class="card"><div class="card-h"><h3>'+t('att_grid'),box+'<div class="card"><div class="card-h"><h3>'+t('att_grid')).replace(t('att_legend'),t('att_legend')+' · '+t('hol_legend')); };
A.holAdd = () => { const v=(document.getElementById('holNew')||{}).value; if(!v) return; DB.holidays=DB.holidays||[]; if(!DB.holidays.includes(v)) DB.holidays.push(v); audit('holiday_add','',v); save(); rerender(); };
A.holDel = el => { DB.holidays=(DB.holidays||[]).filter(d=>d!==el.dataset.d); save(); rerender(); };
/* 4) Nhân viên xem được phiếu lương của chính mình */
const _viewAttSlip=viewAtt; viewAtt=function(){ const h=_viewAttSlip(); const u=me(); if(!u||canHR()) return h; const mine=(DB.payrolls||[]).filter(p=>p.status==='paid'&&p.lines.some(l=>l.u.id===u.id)).slice(0,6); if(!mine.length) return h;
  const card=`<div class="card" style="margin-top:14px"><div class="card-h"><h3>${t('my_slips')}</h3></div><div class="card-b">${mine.map(p=>{ const l=p.lines.find(x=>x.u.id===u.id); return `<div class="dl-row"><div class="dl-l">${ic('file',16)}<div><b>${t('pr_slip')} ${p.ym}</b><small class="muted">${t('pr_net')}: ${money(l.net)}</small></div></div><div class="dl-a"><button class="btn sm" data-a="nav" data-k="ed:ps|${p.ym}_${u.id}|ps">${t('de_open')}</button></div></div>`; }).join('')}</div></div>`;
  return h+card; };
/* 5) Quên chấm công ra: đánh dấu để quản lý xử lý */
const _viewAttForgot=viewAtt; viewAtt=function(){ let h=_viewAttForgot(); const today=dkey(Date.now()); (DB.att||[]).filter(a=>a.in&&!a.out&&a.d<today&&a.type==='work').forEach(a=>{ h=h.replace(new RegExp(`(data-u="${a.uid}" data-d="${a.d}"><span class="ac [^"]*)(")`),'$1 forgot$2'); }); return h.replace(t('att_legend'),t('att_legend')+' · '+t('forgot_legend')); };
Object.assign(DICT.vi,{ ls_full:'⚠ Bộ nhớ trình duyệt đã đầy — thay đổi mới KHÔNG được lưu. Vào Thêm → Sao lưu dữ liệu để tải file sao lưu ngay.', ls_near_full:'Dữ liệu trên trình duyệt đã khoảng {m} MB, gần đầy. Nên sao lưu và giảm bớt hình ảnh.', ai_staff_only:'Trợ lý AI chỉ dành cho nhân viên SGE. Quý khách vui lòng liên hệ hotline để được hỗ trợ.',
  hol_t:'Ngày lễ trong tháng', hol_h:'Ngày lễ được tính công hưởng lương, không tính vắng', hol_add:'Thêm ngày lễ', hol_legend:'L ngày lễ', my_slips:'Phiếu lương của tôi', forgot_legend:'viền đỏ: quên chấm ra', au_holiday_add:'Thêm ngày lễ' });
Object.assign(DICT.en,{ ls_full:'⚠ Browser storage is full — new changes are NOT saved. Go to More → Backup and download a backup now.', ls_near_full:'Browser data is about {m} MB, nearly full. Back up and reduce photos.', ai_staff_only:'The AI assistant is for SGE staff only. Please contact our hotline.',
  hol_t:'Public holidays this month', hol_h:'Holidays are paid, not counted as absence', hol_add:'Add holiday', hol_legend:'L holiday', my_slips:'My payslips', forgot_legend:'red outline: missed check-out', au_holiday_add:'Holiday added' });
