/* ===== Ticket detail & workflow ===== */
const STEPS = ['received','diagnosing','pending','approved','in_service','testing','delivered','closed'];
const STEP_OF = { draft:0, unassigned:0, diagnosing:1, returned:1, pending:2, rejected:2, cancelled:null, approved:3, in_service:4, on_hold:4, testing:5, delivered:6, return_pending:6, invoiced:6, paid:6, closed:7 };
const STEP_EVENTS = { received:['created'], diagnosing:['claimed','created'], pending:['submitted'], approved:['approved'], in_service:['started'], testing:['to_testing'], delivered:['delivered'], invoiced:['invoiced'], paid:['paid'], closed:['closed'] };

function tdState(id){ const k='td_'+id; if(!S.ui[k]) S.ui[k]={tab:'detail', msg:'', imsg:''}; return S.ui[k]; }

function viewTicket(id){
  const x=ticketById(id); const u=me();
  if(!x||!canSeeTicket(x,u)) return `<div class="card empty">${t('no_access')}</div>`;
  const st=tdState(id);
  const cur=STEP_OF[x.status];
  const bad = x.status==='rejected'||x.status==='cancelled';
  const stepAt = s => { const ev=x.history.filter(h=>STEP_EVENTS[s].includes(h.action)); return ev.length?ev[ev.length-1].at:null; };
  const stepper = `<div class="stepper">${STEPS.map((s,i)=>{ const fin=x.status==='closed'; const done = cur!=null && (i<cur || fin); const isCur = cur===i && !fin; const at=stepAt(s);
    return `<div class="step ${done?'done':''} ${isCur?(bad?'cur bad':'cur'):''}"><span class="c">${done?ic('check',12):i+1}</span><span>${t('step_'+s)}</span>${(done||isCur)&&at?`<small class="muted num">${fmtD(at)}</small>`:''}</div>`; }).join('')}</div>`;
  const internalCount=x.internal.length, convCount=x.conversation.length;
  const tabs=[['detail',t('tab_detail')]]; if(can('internal_chat')) tabs.push(['internal',t('tab_internal'),internalCount]); tabs.push(['conversation',t('tab_conversation'),convCount]); tabs.push(['history',t('tab_history'),x.history.length]);
  const d0=devBySn(x.products[0].sn);
  const rma=x.rmaId?rmaById(x.rmaId):null;
  return `<div class="detail">
    <aside class="card detail-side">
      <div><div class="muted" style="font-size:12px">${t('ticket_no')}</div><div class="no mono">${x.no}</div></div>
      <div class="row">${statusPill(x.status)} ${x.vital?`<span class="chip vital">${t('vital_fault')}</span>`:''}</div>
      ${kv(t('ticket_source'), x.source==='enduser'?t('src_enduser'):t('src_npp'))}
      ${kv(t('service_type'), stName(x.type))}
      ${kv(t('priority'), `<span class="row" style="gap:6px">${flag(x.priority)} ${t('p_'+x.priority)}</span>`, true)}
      ${kv(t('project_name'), x.project||'—')}
      ${kv(t('customer'), x.customer.company||'—')}
      ${kv(t('distributor'), x.distributorId?distById(x.distributorId).name:t('not_assigned'))}
      ${kv(t('center'), `<b style="font-weight:600">${esc(centerName(x.centerId))}</b>${(x.centerHistory||[]).length?`<br><small class="muted">${t('transferred_n',{n:x.centerHistory.length})} · ${fmtDT(x.centerHistory[x.centerHistory.length-1].at)}</small>`:''}${can('ticket_transfer')&&isOpen(x)&&canTransfer(x)?`<br><button class="link-btn" data-a="transferAsk" data-id="${x.id}">${ic('send',13)} ${t('transfer_center')}</button>`:''}`, true)}
      ${kv(t('person_in_charge'), uname(x.assigneeId))}
      ${kv(t('created_by'), creatorHtml(x), true)}
      ${kv(t('proc_time'), `<span style="${isOpen(x)&&slaBreached(x)?'color:var(--bad)':''}">${fmtNum(procHours(x),1)} h</span> <small class="muted">· SLA ${SLA_DAYS} ${t('days')}</small>${openPause(x)?`<br><span class="pill" style="background:var(--warn-soft,#FFF4E0);color:var(--warn,#B25E00)">${ic('clock',12)} ${t('sla_paused')} · ${esc(t('pr_'+openPause(x).reason))}</span>`:''}${(x.slaPauses||[]).length?`<br><small class="muted">${t('paused_total')}: ${fmtNum(pausedMs(x,x.closedAt||Date.now())/H,1)} h</small>`:''}`, true)}
      ${x.approval?kv(x.approval.decision==='approved'?t('approved_by'):t('rejected_by'),approverHtml(x.approval)+`<br><small class="muted num">${fmtDT(x.approval.at)}</small>`,true):''}
      ${x.folderUrl?kv(t('storage_folder'),`<a href="${esc(x.folderUrl)}" target="_blank" rel="noopener">${t('open_folder')}</a>`,true):''}
      ${x.approval&&x.approval.gspNo?kv(t('gsp_no'),`<span class="mono">${esc(x.approval.gspNo)}</span>`,true)+(x.approval.maNo?kv(t('ma_no'),`<span class="mono">${esc(x.approval.maNo)}</span>`,true):''):''}
      ${x.supportId&&spById(x.supportId)?kv(t('from_support'),`<button class="link-btn mono" data-a="openSupport" data-id="${x.supportId}">${spById(x.supportId).no}</button>`,true):''}
      ${erpTicketSide(x)}
      ${rma?kv('RMA', `<button class="link-btn mono" data-a="openRma" data-id="${rma.id}">${rma.no}</button> ${rmaPill(rma.status)}`, true):''}
    </aside>
    <div class="detail-main">
      <div class="card detail-head">
        <div class="row" style="justify-content:space-between;align-items:flex-start">
          <h2>${esc(x.title)} <span class="muted" style="font-weight:400;font-size:15px">· ${esc(stName(x.type))}</span> ${flag(x.priority)}</h2>
          <div class="pill" style="background:var(--accent-soft);color:var(--accent-ink)">${ic('clock',13)} ${fmtNum(procHours(x),1)}h</div>
        </div>
        ${stepper}
        ${x.status==='returned'?`<div class="quote" style="border-color:var(--accent)"><b>${t('s_returned')}:</b> ${esc(L(lastNote(x,'returned')))}</div>`:''}
        ${x.status==='rejected'?`<div class="quote" style="border-color:var(--bad)"><b>${t('s_rejected')}:</b> ${esc(L(lastNote(x,'rejected')))}</div>`:''}
        ${x.status==='on_hold'?(()=>{ const p=openPause(x); return p?`<div class="quote"><b>${t('sla_paused')}:</b> ${esc(t('pr_'+p.reason))}${p.note?' · '+esc(L(p.note)):''} <small class="muted">· ${t('since')} ${fmtDT(p.from)} · ${esc(uname(p.by))}</small></div>`:`<div class="quote"><b>${t('s_on_hold')}:</b> ${esc(L(lastNote(x,'hold')))}</div>`; })():''}
      </div>
      ${actionCard(x,u,st)}
      ${svcBox(x)}
      <div class="card"><div class="dtabs">${tabs.map(([k,l,c])=>`<button class="${st.tab===k?'on':''}" data-a="tdTab" data-id="${x.id}" data-k="${k}">${l}${c?`<span class="cnt">${c}</span>`:''}</button>`).join('')}</div></div>
      ${st.tab==='detail'?detailSections(x,u,d0,rma):st.tab==='internal'?msgPanel(x,u,'internal'):st.tab==='conversation'?msgPanel(x,u,'conversation'):historyPanel(x)}
    </div>
  </div>`;
}
function approverInfo(ap){ const u=userById(ap.by)||{}; return { name:ap.byName||u.name||'—', email:ap.byEmail||u.email||'', role:ap.byRole||u.role||'' }; }
function creatorHtml(x){ const u=userById(x.createdBy)||{}; const c=x.creator||{}; const name=c.name||u.name||(x.createdBy==='guest'||!x.createdBy?t('guest'):'—'); const role=c.role||u.role; const email=c.email||u.email; return `${esc(name)}${role?` <small class="muted">· ${esc(t('role_'+role))}</small>`:''}${email?`<br><small class="muted">${esc(email)}</small>`:''}<br><small class="muted num">${fmtDT(x.createdAt)}</small>`; }
const approverHtml = ap => { const i=approverInfo(ap); return `${esc(i.name)}${i.role?` <small class="muted">· ${esc(t('role_'+i.role))}</small>`:''}${i.email?`<br><small class="muted">${esc(i.email)}</small>`:''}`; };
const kv=(k,v,raw)=>`<div class="kv"><span>${esc(k)}</span><b>${raw?v:esc(v)}</b></div>`;
function lastNote(x,action){ const h=[...x.history].reverse().find(h=>h.action===action); return h?h.note:''; }

function detailSections(x,u,d0,rma){
  const secs=[...(svcForTicket(x)?[['contract',t('sec_contract')]]:[]),['intake',t('sec_intake')],['products',t('sec_products')],['fault',t('sec_fault')],['customer',t('sec_customer')],['diagnosis',t('sec_diagnosis')],['approval',t('sec_approval')],['parts',t('sec_parts')],...(x.rmaId&&rmaById(x.rmaId)?[['rma','RMA']]:[]),['test',t('sec_test_delivery')],['attach',t('sec_attachments')],['feedback',t('sec_feedback')]];
  const sec=(k,title,body,extra)=>`<section class="card sec" id="sec-${k}"><div class="card-h"><h3>${title}</h3>${extra||''}</div><div class="card-b">${body}</div></section>`;
  const w=d0?warrantyState(d0,x.createdAt):null;
  const out=[];
  { const sc=svcForTicket(x); if(sc) out.push(svcSection(sc)); }
  out.push(intakeSection(x));
  out.push(sec('products',t('sec_products'),`<div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>${t('serial_no')}</th><th>${t('material_code')}</th><th>${t('product_model')}</th><th class="r">${t('qty')}</th><th>${t('warranty_status')}</th><th>${t('warranty_end')}</th></tr></thead><tbody>
    ${x.products.map((p,i)=>{ const d=devBySn(p.sn); return `<tr><td>${i+1}</td><td class="mono">${p.sn}</td><td class="mono">${d?d.pn:'—'}</td><td>${p.model}</td><td class="r num">${p.qty}</td><td>${wPill(d,x.createdAt)}</td><td class="num">${d?fmtD(warrantyEnd(d)):'—'}</td></tr>`; }).join('')}</tbody></table></div>
    ${w?`<div class="hint" style="margin-top:8px">${t(d0.startDate?'warranty_basis_start':'warranty_basis',{d:fmtD(warrantyStart(d0)),y:d0.warrantyYears})}</div>`:''}`));
  out.push(sec('fault',t('sec_fault'),`<div class="kv-grid">${kv(t('fault_code'),x.faultCode?faultName(x.faultCode):'—')}${kv(t('fault_time'),fmtDT(x.faultTime))}${kv(t('vital_fault'),x.vital?t('yes'):t('no'))}${kv(t('customer_ticket_no'),x.customerTicketNo||'—')}</div><div class="kv" style="margin-top:14px"><span>${t('detailed_description')}</span><p style="margin:4px 0 0;white-space:pre-wrap">${esc(L(x.description))}</p></div>`));
  out.push(sec('customer',t('sec_customer'),`<div class="kv-grid">${kv(t('customer'),x.customer.company||'—')}${kv(t('contact'),x.customer.contact||'—')}${kv(t('phone'),x.customer.phone||'—')}${kv(t('email'),x.customer.email||'—')}${kv(t('province'),x.province||'—')}${kv(t('project_address'),x.address||'—')}</div>`));
  out.push(sec('diagnosis',t('sec_diagnosis'), x.diagnosis? `<div class="kv-grid">${kv(t('proposal'),t('prop_'+x.diagnosis.proposal))}${kv(t('diagnosed_by'),uname(x.assigneeId||x.createdBy))}</div><p class="quote" style="margin-top:12px;white-space:pre-wrap">${esc(L(x.diagnosis.text))}</p>${x.diagnosis.estParts&&x.diagnosis.estParts.length?`<div class="hint" style="margin-top:10px">${t('est_parts')}: ${x.diagnosis.estParts.map(p=>`<span class="chip">${p.pn} · ${esc(partName(p.pn))} ×${p.qty}</span>`).join(' ')}</div>`:''}` : `<div class="muted">${t('no_diagnosis')}</div>`));
  out.push(sec('approval',t('sec_approval'), x.approval? `<div class="kv-grid">${kv(t('decision'), x.approval.decision==='approved'?t('s_approved'):t('s_rejected'))}${x.approval.gspNo?kv(t('gsp_no'),`<span class="mono">${esc(x.approval.gspNo)}</span>`,true)+kv(t('ma_no'),x.approval.maNo?`<span class="mono">${esc(x.approval.maNo)}</span>`:'—',true):''}${kv(t('approved_by'),approverHtml(x.approval),true)}${kv(t('time'),fmtDT(x.approval.at))}</div>${x.approval.note?`<p class="quote" style="margin-top:12px">${esc(L(x.approval.note))}</p>`:''}` : `<div class="muted">${t('not_approved_yet')}</div>`));
  out.push(sec('parts',t('sec_parts'), x.parts.length? `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('part_no')}</th><th>${t('part_name')}</th><th class="r">${t('qty')}</th></tr></thead><tbody>
    ${x.parts.map(p=>`<tr><td class="mono">${p.pn}</td><td>${esc(partName(p.pn))}</td><td class="r num">${p.qty}</td></tr>`).join('')}
    </tbody></table></div>` : `<div class="muted">${x.rmaId&&rmaById(x.rmaId)?.kind==='unit'?t('parts_unit_swap'):t('no_parts_yet')}</div>`));
  if(x.rmaId&&rmaById(x.rmaId)){ const r=rmaById(x.rmaId); out.push(sec('rma',`RMA <span class="mono" style="font-weight:500">${r.no}</span>`, rmaBlock(r), rmaPill(r.status))); }
  out.push(sec('test',t('sec_test_delivery'), x.test||x.delivery? `<div class="kv-grid">${x.test?kv(t('test_result'),x.test.result==='pass'?t('pass'):t('fail'))+kv(t('tested_by'),uname(x.test.by))+kv(t('test_time'),fmtDT(x.test.at)):''}${x.delivery?kv(t('carrier'),x.delivery.carrier)+kv(t('tracking_no'),x.delivery.tracking||'—')+kv(t('delivery_date'),fmtD(x.delivery.at)):''}</div>${x.test&&x.test.note?`<p class="quote" style="margin-top:12px">${esc(L(x.test.note))}</p>`:''}` : `<div class="muted">${t('no_test_yet')}</div>`));
  out.push(sec('attach',t('sec_attachments'), `${x.folderUrl?`<div style="margin-bottom:10px"><a href="${esc(x.folderUrl)}" target="_blank" rel="noopener">${ic('db',14)} ${t('open_ticket_folder')}</a></div>`:''}${uploadZones('td', x.attachments, null, `data-id="${x.id}"`)}`));
  const fbBody = x.feedback? `<div class="row"><div class="stars">${[1,2,3,4,5].map(n=>`<span style="color:${n<=x.feedback.score?'var(--warn)':'var(--line-2)'}">${ic('star',20)}</span>`).join('')}</div><b>${x.feedback.score}/5</b></div>${x.feedback.comment?`<p class="quote" style="margin-top:10px">${esc(x.feedback.comment)}</p>`:''}` : (can('feedback') && isExternal(u) && ['delivered','closed'].includes(x.status)? feedbackForm(x) : `<div class="muted">${t('no_feedback')}</div>`);
  out.push(sec('feedback',t('sec_feedback'), fbBody));
  return `<div class="detail-body"><div style="display:flex;flex-direction:column;gap:16px;min-width:0">${out.join('')}</div>
    <nav class="card sec-nav">${secs.map(([k,l])=>`<button data-a="scrollSec" data-k="${k}">${l}</button>`).join('')}</nav></div>`;
}
function feedbackForm(x){ const st=tdState(x.id); const fb=st.fb||(st.fb={score:0,comment:''});
  return `<div class="field"><span class="lbl">${t('rate_service')}</span><div class="stars">${[1,2,3,4,5].map(n=>`<button data-a="fbStar" data-id="${x.id}" data-n="${n}" class="${n<=fb.score?'on':''}" aria-label="${n}">${ic('star',26)}</button>`).join('')}</div></div>
  <div class="field" style="margin-top:10px"><label for="fb-c">${t('comment')}</label><textarea class="textarea" id="fb-c" data-bind="td_${x.id}.fb.comment" style="min-height:70px">${esc(fb.comment)}</textarea></div>
  <div class="row" style="margin-top:10px"><button class="btn primary" data-a="fbSend" data-id="${x.id}" ${fb.score?'':'disabled'}>${t('send_feedback')}</button></div>`; }

function msgPanel(x,u,kind){
  const st=tdState(x.id); const list=x[kind]; const key=kind==='internal'?'imsg':'msg';
  return `<div class="card"><div class="card-b">
    ${kind==='internal'?``:``}
    <div class="msgs">${list.length?list.map(m=>`<div class="msg ${m.by===u.id?'me':''} ${m.tag==='opinion'?'opinion':''}"><span class="avatar">${esc(initials(uname(m.by)))}</span><div class="bubble"><div class="who">${esc(uname(m.by))} · ${fmtDT(m.at)}${m.tag==='opinion'?` · <b style="color:var(--blue)">${t('tech_opinion')}</b>`:''}</div>${m.text?esc(L(m.text)):''}${msgImgs(m)}</div></div>`).join(''):`<div class="empty">${t('no_messages')}</div>`}</div>
    ${chatPendingHtml('td',x.id,kind)}<div class="composer" data-drop="chatImgs" data-scope="td" data-id="${x.id}" data-k="${kind}">${chatAttachBtn('td',x.id,kind)}<textarea class="textarea grow" id="cmp-${kind}" data-bind="td_${x.id}.${key}" placeholder="${t('type_message')}">${esc(st[key]||'')}</textarea><button class="btn primary" data-a="sendMsg" data-id="${x.id}" data-k="${kind}">${ic('send',15)} ${t('send')}</button></div>
  </div></div>`;
}
function historyPanel(x){
  return `<div class="card"><div class="card-b"><div class="timeline">${[...x.history].reverse().map(h=>`<div class="tl"><span class="d">${ic(h.action==='approved'||h.action==='closed'?'check':h.action==='rejected'||h.action==='cancelled'?'x':'clock',13)}</span><div class="m"><div><b style="font-weight:600">${esc(uname(h.by))}</b> ${esc(t('h_'+h.action))} ${h.to?`→ ${statusPill(h.to)}`:''}</div><small class="num">${fmtDT(h.at)}</small>${h.note?`<p class="quote" style="margin-top:6px">${esc(L(h.note))}</p>`:''}</div></div>`).join('')}</div></div></div>`;
}

/* ---------- Action card (role × status) ---------- */
function actionCard(x,u,st){
  const mine = u.role==='distributor' && x.distributorId===u.distributorId;
  const own = mine || globalScope(u);
  const creator = x.createdBy===u.id;
  const box=(title,body,hint)=>`<section class="card action-card"><div class="card-h"><h3 style="color:var(--accent-ink)">${ic('wrench',16)} ${title}</h3>${hint?`<span class="hint">${hint}</span>`:''}</div><div class="card-b">${body}</div></section>`;
  const r=u.role, s=x.status;
  { const ca=contractAction(x,u,box); if(ca!==undefined) return ca; }
  // End user
  if(isExternal(u)){
    if(s==='draft'&&creator&&can('ticket_create')) return box(t('act_title'), `<div class="row"><button class="btn primary" data-a="wf" data-op="sendReq" data-id="${x.id}">${t('send_request')}</button>${can('ticket_cancel')?`<button class="btn danger" data-a="wf" data-op="cancelAsk" data-id="${x.id}">${t('cancel_ticket')}</button>`:''}</div>`);
    return '';
  }
  // Unassigned
  if(s==='unassigned'){
    if(r==='distributor'&&can('ticket_claim')) return box(t('act_claim_title'), `<button class="btn primary" data-a="wf" data-op="claim" data-id="${x.id}">${t('claim')}</button>`);
    if(can('ticket_assign')) return box(t('act_assign_title'), `<div class="row"><select class="select" style="max-width:280px" data-bind="td_${x.id}.assignDist" aria-label="${t('person_in_charge')}"><option value="">${t('choose_tech')}</option>${DB.users.filter(q=>q.role==='engineer'&&q.active!==false).map(d=>`<option value="${d.id}" ${st.assignDist===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select><button class="btn primary" data-a="wf" data-op="assign" data-id="${x.id}">${t('assign')}</button></div>`);
    return '';
  }
  // Diagnosis (draft / diagnosing / returned)
  if(['draft','diagnosing','returned'].includes(s) && own && can('ticket_diagnose')){
    const dg=st.dg||(st.dg={ svcType:(x.type&&x.type!=='TN')?x.type:suggestType(x), text:x.diagnosis?L(x.diagnosis.text):'', proposal:x.diagnosis?x.diagnosis.proposal:'repair', faultCode:x.faultCode||'', parts:x.diagnosis&&x.diagnosis.estParts?x.diagnosis.estParts.map(p=>({...p})):[] });
    return box(t('act_diag_title'), `<div class="form-grid">
      ${classifyField(x,dg)}
      <div class="field"><label for="dg-fc">${t('fault_code')}</label><select class="select" id="dg-fc" data-bind="td_${x.id}.dg.faultCode"><option value="">${t('choose')}</option>${FAULTS.map(f=>`<option value="${f.code}" ${dg.faultCode===f.code?'selected':''}>${esc(f.code+' · '+(f.en||f.vi))}</option>`).join('')}</select></div>
      <div class="field"><label for="dg-p">${t('proposal')}</label><select class="select" id="dg-p" data-bind="td_${x.id}.dg.proposal">${PROPOSALS.map(p=>`<option value="${p}" ${dg.proposal===p?'selected':''}>${t('prop_'+p)}</option>`).join('')}</select></div>
      <div class="field full"><label class="req" for="dg-t">${t('npp_diagnosis')}</label><textarea class="textarea ${st.dgErr?'err':''}" id="dg-t" data-bind="td_${x.id}.dg.text">${esc(dg.text)}</textarea>${st.dgErr?`<div class="err-text">${t('e_diag')}</div>`:''}</div>
      <div class="field full"><span class="lbl">${t('est_parts')}</span>${partsEditor(x.id,'dg',dg.parts)}</div>
    </div>
    <div class="row" style="margin-top:14px"><button class="btn primary" data-a="wf" data-op="submitDiag" data-id="${x.id}">${ic('send',15)} ${t('submit_for_approval')}</button><button class="btn" data-a="wf" data-op="saveDiag" data-id="${x.id}">${t('save')}</button><span class="grow"></span>${can('ticket_cancel')?`<button class="btn danger" data-a="wf" data-op="cancelAsk" data-id="${x.id}">${t('cancel_ticket')}</button>`:''}</div>`, s==='returned'?t('returned_hint'):'');
  }
  // Pending approval
  if(s==='pending'){
    if(can('ticket_approve')) return box(t('act_approve_title'), `${x.diagnosis?`<p class="quote" style="margin:0 0 14px"><b>${t('prop_'+x.diagnosis.proposal)}</b> — ${esc(L(x.diagnosis.text))}</p>`:''}
      <div class="row"><button class="btn okb" data-a="wf" data-op="decide" data-d="approve" data-id="${x.id}">${ic('check',15)} ${t('approve')}</button><button class="btn" data-a="wf" data-op="decide" data-d="return" data-id="${x.id}">${t('request_more')}</button><button class="btn danger" data-a="wf" data-op="decide" data-d="reject" data-id="${x.id}">${ic('x',15)} ${t('reject')}</button></div>`, t('waiting_since',{h:fmtNum((Date.now()-x.updatedAt)/H,1)}));
    if(can('ticket_opinion')) return box(t('act_opinion_title'), `<button class="btn primary" data-a="wf" data-op="opinion" data-id="${x.id}">${ic('msg',15)} ${t('add_opinion')}</button>`);
    return mine? box(t('act_wait_title'), `<p style="margin:0">${t('act_wait_desc')}</p>`) : '';
  }
  // Approved → start
  if(s==='approved' && own && can('ticket_repair')){
    return box(t('act_start_title'), `<div class="row"><button class="btn primary" data-a="wf" data-op="start" data-id="${x.id}">${ic('play',14)} ${t('start_repair')}</button>${can('rma_create')&&!x.rmaId?`<button class="btn" data-a="wf" data-op="mkRma" data-id="${x.id}">${ic('box',15)} ${t('create_rma')}</button>`:''}</div>`);
  }
  // In service → record repair
  if(s==='in_service' && own && can('ticket_repair')){
    const rp=st.rp||(st.rp={ parts:(x.parts.length?x.parts:(x.diagnosis&&x.diagnosis.estParts)||[]).map(p=>({...p})) });
    return box(t('act_repair_title'), `${x.type==='OT'?``:''}<div class="field"><span class="lbl">${t('parts_used')}</span>${partsEditor(x.id,'rp',rp.parts)}</div>
      <div class="row" style="margin-top:14px"><button class="btn primary" data-a="wf" data-op="toTesting" data-id="${x.id}">${t('finish_repair')}</button><button class="btn" data-a="wf" data-op="saveRepair" data-id="${x.id}">${t('save')}</button><span class="grow"></span>${can('ticket_hold')?`<button class="btn" data-a="wf" data-op="holdAsk" data-id="${x.id}">${ic('pause',14)} ${t('sla_pause')}</button>`:''}${can('rma_create')&&!x.rmaId?`<button class="btn" data-a="wf" data-op="mkRma" data-id="${x.id}">${ic('box',15)} ${t('create_rma')}</button>`:''}</div>`);
  }
  if(s==='on_hold' && can('ticket_hold')) return box(t('s_on_hold'), `<button class="btn primary" data-a="wf" data-op="resume" data-id="${x.id}">${ic('play',14)} ${t('resume')}</button>`);
  // Testing → test + delivery
  if(s==='testing' && own && can('ticket_repair')){
    const ts=st.ts||(st.ts={ result:'pass', note:'', carrier:'Viettel Post', tracking:'', date:toISODate(Date.now()) });
    return box(t('act_test_title'), `<div class="form-grid">
      <div class="field"><span class="lbl">${t('test_result')}</span><div class="seg">${['pass','fail'].map(v=>`<button class="${ts.result===v?'on':''}" data-a="tsResult" data-id="${x.id}" data-v="${v}">${t(v)}</button>`).join('')}</div></div>
      <div class="field"><label for="ts-n">${t('test_note')}</label><input class="input" id="ts-n" data-bind="td_${x.id}.ts.note" value="${esc(ts.note)}"></div>
      ${ts.result==='pass'?`<div class="field"><label for="ts-c">${t('carrier')}</label><select class="select" id="ts-c" data-bind="td_${x.id}.ts.carrier">${['Viettel Post','GHN','GHTK','Xe của NPP'].map(c=>`<option ${ts.carrier===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label for="ts-t">${t('tracking_no')}</label><input class="input mono" id="ts-t" data-bind="td_${x.id}.ts.tracking" value="${esc(ts.tracking)}"></div>
      <div class="field"><label for="ts-d">${t('delivery_date')}</label><input class="input" type="date" id="ts-d" data-bind="td_${x.id}.ts.date" value="${ts.date}"></div>`:''}
    </div><div class="row" style="margin-top:14px">${ts.result==='pass'?`<button class="btn primary" data-a="wf" data-op="deliver" data-id="${x.id}">${ic('truck',15)} ${t('confirm_delivery')}</button>`:`<button class="btn danger" data-a="wf" data-op="testFail" data-id="${x.id}">${t('back_to_repair')}</button>`}</div>`);
  }
  if(s==='delivered' && own && can('ticket_repair')) return box(t('act_close_title'), `<button class="btn primary" data-a="wf" data-op="close" data-id="${x.id}">${ic('check',15)} ${t('close_case')}</button>`);
  return '';
}
function partsFor(id,cur){ const x=ticketById(id); const pns=x?x.products.map(p=>(devBySn(p.sn)||{}).pn||(modelBy(p.model)||{}).pn).filter(Boolean):[]; const ok=PARTS.filter(pp=>!pp.products||!pp.products.length||pp.products.some(c=>pns.includes(c))); if(cur&&!ok.some(pp=>pp.pn===cur)){ const c=partByPn(cur); if(c) ok.unshift(c); } return ok.length?ok:PARTS; }
function partsEditor(id,ns,parts){
  return `<div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl parts-edit"><thead><tr><th style="min-width:220px">${t('part_name')}</th><th style="width:100px">${t('qty')}</th><th></th></tr></thead><tbody>
    ${parts.map((p,i)=>`<tr><td><select class="select" data-bind="td_${id}.${ns}.parts.${i}.pn" data-re aria-label="${t('part_name')}">${partsFor(id,p.pn).map(pp=>`<option value="${pp.pn}" ${p.pn===pp.pn?'selected':''}>${pp.pn} · ${esc(pp.en||pp.vi)}</option>`).join('')}</select></td><td><input class="input num" type="number" min="1" data-bind="td_${id}.${ns}.parts.${i}.qty" data-num data-re value="${p.qty}" aria-label="${t('qty')}"></td><td><button class="icon-btn" data-a="partDel" data-id="${id}" data-ns="${ns}" data-i="${i}" aria-label="${t('delete')}">${ic('trash',14)}</button></td></tr>`).join('')}
    <tr><td colspan="3"><button class="btn sm soft" data-a="partAdd" data-id="${id}" data-ns="${ns}">${ic('plus',14)} ${t('add_part')}</button></td></tr></tbody></table></div>`;
}
A.partAdd = el => { const st=tdState(el.dataset.id); st[el.dataset.ns].parts.push({pn:partsFor(el.dataset.id)[0].pn,qty:1}); rerender(); };
A.partDel = el => { const st=tdState(el.dataset.id); st[el.dataset.ns].parts.splice(+el.dataset.i,1); rerender(); };
A.tdTab = el => { tdState(el.dataset.id).tab=el.dataset.k; rerender(); };
A.scrollSec = el => { const s=document.getElementById('sec-'+el.dataset.k); if(s) s.scrollIntoView({behavior:'smooth',block:'start'}); };
A.tsResult = el => { tdState(el.dataset.id).ts.result=el.dataset.v; rerender(); };
A.fbStar = el => { const st=tdState(el.dataset.id); st.fb.score=+el.dataset.n; rerender(); };
A.fbSend = el => { const x=ticketById(el.dataset.id); const st=tdState(x.id); x.feedback={score:st.fb.score,comment:st.fb.comment||'',at:Date.now()}; x.history.push({at:Date.now(),by:S.userId,action:'feedback',from:null,to:null,note:''}); if(x.distributorId) notify({toDist:x.distributorId,key:'n_feedback',vars:{no:x.no,s:x.feedback.score},ticketId:x.id}); save(); rerender(); toast(t('toast_feedback'),'ok'); };
const tdAdd = (input,kind) => { const x=ticketById(input.dataset.id); readFiles(input, kind, arr=>{ x.attachments.push(...arr); x.history.push({at:Date.now(),by:S.userId,action:'attached',from:null,to:null,note:''}); save(); rerender(); toast(t('toast_uploaded',{n:arr.length}),'ok'); uploadAttachments(x,arr); }); };
A.tdImgs = input => tdAdd(input,'image');
A.tdLogs = input => tdAdd(input,'log');
A.sendMsg = el => { const x=ticketById(el.dataset.id); const kind=el.dataset.k; const st=tdState(x.id); const key=kind==='internal'?'imsg':'msg'; const txt=(st[key]||'').trim(); const d={scope:'td',id:x.id,k:kind}; if(!txt&&!chatPending(d).length) return; const imgs=takeChatImgs(d); x[kind].push({at:Date.now(),by:S.userId,text:txt,images:imgs}); if(imgs.length) setTimeout(()=>uploadAttachments(x, imgs),0); st[key]='';
  if(kind==='conversation'){ const u=me(); if(isExternal(u)){ if(x.distributorId) notify({toDist:x.distributorId,key:'n_message',vars:{no:x.no},ticketId:x.id}); } else if(x.customerId) notify({toCustomer:x.customerId,key:'n_message',vars:{no:x.no},ticketId:x.id}); }
  save(); rerender(); };
A.openRma = el => { const r=rmaById(el.dataset.id); if(!r) return; S.ui.modal=null; if(S.active!=='t:'+r.ticketId) openTicket(r.ticketId); setTimeout(()=>{ const s=document.getElementById('sec-rma'); if(s) s.scrollIntoView({behavior:'smooth',block:'start'}); },60); };

/* ---------- Workflow operations ---------- */
A.wf = el => {
  const x=ticketById(el.dataset.id); const u=me(); const st=tdState(x.id); const op=el.dataset.op;
  const done=(msg)=>{ save(); rerender(); if(msg) toast(msg,'ok'); };
  switch(op){
    case 'claim': claimTicket(x,u); return done(t('toast_claimed',{n:1}));
    case 'assign': if(!st.assignDist){ toast(t('choose_tech'),'bad'); return; } x.assigneeId=st.assignDist; logH(x,'assigned',u.id,'unassigned','diagnosing'); notify({toUser:x.assigneeId,key:'n_assigned',vars:{no:x.no},ticketId:x.id}); return done(t('toast_assigned'));
    case 'sendReq': logH(x,'submitted_req',u.id,x.status,'unassigned'); notify({toRole:'manager',key:'n_unassigned',vars:{no:x.no},ticketId:x.id}); return done(t('toast_submitted',{no:x.no}));
    case 'saveDiag': case 'submitDiag': {
      const dg=st.dg; if(op==='submitDiag' && !dg.text.trim()){ st.dgErr=true; rerender(); toast(t('e_diag'),'bad'); return; }
      st.dgErr=false; if(dg.svcType) x.type=dg.svcType; if(x.svcId&&svcById(x.svcId)){ const sc=svcById(x.svcId); if(['quote'].includes(sc.status)) sc.warranty=x.type==='RW'; } x.faultCode=dg.faultCode; x.diagnosis={text:dg.text,proposal:dg.proposal,estParts:dg.parts.map(p=>({...p}))};
      if(!x.assigneeId && u.role==='distributor') x.assigneeId=u.id;
      if(op==='submitDiag'){ logH(x,'submitted',u.id,x.status,'pending'); notify({toRole:'manager',key:'n_submitted',vars:{no:x.no},ticketId:x.id}); notify({toRole:'engineer',key:'n_submitted',vars:{no:x.no},ticketId:x.id}); st.dg=null; return done(t('toast_submitted',{no:x.no})); }
      x.updatedAt=Date.now(); return done(t('toast_saved'));
    }
    case 'decide': return openModal({type:'decision', id:x.id, d:el.dataset.d, note:''});
    case 'cancelAsk': return openModal({type:'decision', id:x.id, d:'cancel', note:''});
    case 'holdAsk': return openModal({type:'decision', id:x.id, d:'hold', note:''});
    case 'opinion': return openModal({type:'opinion', id:x.id, note:'', rec:'approve'});
    case 'start': logH(x,'started',u.id,'approved','in_service'); return done(t('toast_started'));
    case 'resume': { const p=openPause(x); if(p){ p.to=Date.now(); p.resumedBy=u.id; } } logH(x,'resumed',u.id,'on_hold','in_service'); return done(t('toast_saved'));
    case 'saveRepair': case 'toTesting': {
      const rp=st.rp; x.parts=rp.parts.filter(p=>p.qty>0).map(p=>({...p}));
      if(op==='toTesting'){ logH(x,'to_testing',u.id,'in_service','testing'); st.rp=null; return done(t('toast_to_testing')); }
      x.updatedAt=Date.now(); return done(t('toast_saved'));
    }
    case 'testFail': { const ts=st.ts; x.test={at:Date.now(),by:u.id,result:'fail',note:ts.note}; logH(x,'test_failed',u.id,'testing','in_service',ts.note); st.ts=null; return done(t('toast_saved')); }
    case 'deliver': { const ts=st.ts; x.test={at:Date.now(),by:u.id,result:'pass',note:ts.note||''}; x.delivery={at:ts.date?new Date(ts.date+'T12:00:00').getTime():Date.now(),carrier:ts.carrier,tracking:ts.tracking,note:''}; logH(x,'delivered',u.id,'testing','delivered'); if(x.customerId) notify({toCustomer:x.customerId,key:'n_delivered',vars:{no:x.no},ticketId:x.id}); st.ts=null; return done(t('toast_delivered')); }
    case 'close': logH(x,'closed',u.id,'delivered','closed'); x.closedAt=Date.now(); if(x.customerId) notify({toCustomer:x.customerId,key:'n_closed',vars:{no:x.no},ticketId:x.id}); if(x.rmaId){ const r=rmaById(x.rmaId); } return done(t('toast_closed'));
    case 'mkRma': { const r=createRma(x,u); return done(t('toast_rma_created',{no:r.no})); }
  }
};
function createRma(x,u){
  const unit = x.diagnosis && isUnitSwap(x.diagnosis.proposal);
  const parts = unit?[]:((x.parts.length?x.parts:(x.diagnosis&&x.diagnosis.estParts)||[]).map(p=>({...p})));
  const r={ id:'rn'+Date.now(), no:'RMA'+x.no.slice(2), ticketId:x.id, kind:unit?'unit':'part', sn:x.products[0].sn, model:x.products[0].model, newSn:'', parts, status:'requested', distributorId:x.distributorId, createdAt:Date.now(), tracking:'', history:[{at:Date.now(),by:u.id,to:'requested'}] };
  DB.rmas.unshift(r); x.rmaId=r.id; x.history.push({at:Date.now(),by:u.id,action:'rma_created',from:null,to:null,note:r.no});
  notify({toDist:x.distributorId,key:'n_rma',vars:{no:r.no},ticketId:x.id});
  return r;
}
MODALS.decision = m => {
  const x=ticketById(m.id);
  const cfg={ approve:{title:t('approve'),btn:'okb',need:false}, return:{title:t('request_more'),btn:'primary',need:true}, reject:{title:t('reject'),btn:'danger',need:true}, cancel:{title:t('cancel_ticket'),btn:'danger',need:true}, hold:{title:t('hold'),btn:'primary',need:true} }[m.d];
  const auto = m.d==='approve' && x.diagnosis && isUnitSwap(x.diagnosis.proposal);
  const E=m.errs||{};
  const refs = m.d==='approve'? `<div class="form-grid"><div class="field"><label class="req" for="dc-gsp">${t('gsp_no')}</label><input class="input mono ${E.gsp?'err':''}" id="dc-gsp" data-bind="modal.gsp" value="${esc(m.gsp||'')}" autocomplete="off">${E.gsp?`<div class="err-text">${esc(E.gsp)}</div>`:''}</div><div class="field"><label for="dc-ma">${t('ma_no')}</label><input class="input mono ${E.ma?'err':''}" id="dc-ma" data-bind="modal.ma" value="${esc(m.ma||'')}" autocomplete="off">${E.ma?`<div class="err-text">${esc(E.ma)}</div>`:''}</div></div>` : '';
  const holdSel = m.d==='hold'? `<div class="field"><label class="req" for="dc-reason">${t('sla_pause_reason')}</label><select class="select ${E.reason?'err':''}" id="dc-reason" data-bind="modal.reason" data-re="1"><option value="">${t('choose_reason')}</option>${SLA_PAUSE_REASONS.map(r=>`<option value="${r}" ${m.reason===r?'selected':''}>${t('pr_'+r)}</option>`).join('')}</select>${E.reason?`<div class="err-text">${esc(E.reason)}</div>`:''}</div>`:'';
  if(m.d==='hold') cfg.need = m.reason==='other';
  return { title:`${m.d==='hold'?t('sla_pause'):cfg.title} · <span class="mono">${x.no}</span>`, body:`${refs}${holdSel}<div class="field"><label class="${cfg.need?'req':''}" for="dc-n">${t('note')}</label><textarea class="textarea ${m.err?'err':''}" id="dc-n" data-bind="modal.note">${esc(m.note)}</textarea>${m.err?`<div class="err-text">${t('e_reason')}</div>`:''}</div>${auto?`<div class="hint">${t('auto_rma_hint')}</div>`:''}`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn ${cfg.btn}" data-a="doDecision">${cfg.title}</button>` };
};
A.doDecision = () => {
  const m=S.ui.modal, x=ticketById(m.id), u=me(); const note=(m.note||'').trim();
  if(m.d==='hold'){ m.errs={}; if(!m.reason){ m.errs.reason=t('e_required'); rerender(); return; } if(m.reason==='other'&&!note){ m.err=true; rerender(); return; } }
  else if(m.d!=='approve' && !note){ m.err=true; rerender(); return; }
  if(m.d==='approve'){ const E={}; const gsp=(m.gsp||'').trim().toUpperCase(), ma=(m.ma||'').trim().toUpperCase();
    if(!gsp) E.gsp=t('e_required'); else if(!/^[A-Z0-9-]{6,20}$/.test(gsp)) E.gsp=t('e_ref_format'); else if(DB.tickets.some(o=>o.id!==x.id&&o.approval&&o.approval.gspNo===gsp)) E.gsp=t('e_gsp_used');
    if(ma && !/^[A-Z0-9-]{2,20}$/.test(ma)) E.ma=t('e_ref_format');
    m.errs=E; if(Object.keys(E).length){ rerender(); return; } m.gsp=gsp; m.ma=ma; }
  if(m.d==='approve'){ x.approval={by:u.id,byName:u.name,byEmail:u.email,byRole:u.role,at:Date.now(),decision:'approved',note,gspNo:m.gsp,maNo:m.ma}; logH(x,'approved',u.id,'pending','approved',note); notify({toDist:x.distributorId,key:'n_approved',vars:{no:x.no},ticketId:x.id}); if(x.diagnosis&&isUnitSwap(x.diagnosis.proposal)&&!x.rmaId) createRma(x,u); }
  if(m.d==='return'){ logH(x,'returned',u.id,'pending','returned',note); notify({toDist:x.distributorId,key:'n_returned',vars:{no:x.no},ticketId:x.id}); }
  if(m.d==='reject'){ x.approval={by:u.id,byName:u.name,byEmail:u.email,byRole:u.role,at:Date.now(),decision:'rejected',note}; logH(x,'rejected',u.id,'pending','rejected',note); notify({toDist:x.distributorId,key:'n_rejected',vars:{no:x.no},ticketId:x.id}); }
  if(m.d==='cancel'){ logH(x,'cancelled',u.id,x.status,'cancelled',note); }
  if(m.d==='hold'){ x.slaPauses=x.slaPauses||[]; x.slaPauses.push({reason:m.reason,note,from:Date.now(),to:null,by:u.id}); logH(x,'hold',u.id,x.status,'on_hold',t('pr_'+m.reason)+(note?' · '+note:'')); }
  S.ui.modal=null; save(); rerender(); toast(t('toast_done_'+m.d,{no:x.no}),'ok');
};
A.transferAsk = el => openModal({type:'transfer', id:el.dataset.id, note:''});
function canTransfer(x){ const u=me(); if(isExternal(u)) return false; if(u.role==='distributor') return x.centerId===u.distributorId; return true; }
MODALS.transfer = m => { const x=ticketById(m.id); const opts=centers().filter(c=>c.id!==x.centerId); if(!m.to) m.to=opts[0]?opts[0].id:'';
  const hist=(x.centerHistory||[]);
  return { title:`${t('transfer_center')} · <span class="mono">${x.no}</span>`,
  body:`<div class="field"><span class="lbl">${t('center_current')}</span><div><b>${esc(centerName(x.centerId))}</b></div></div>
  <div class="field"><label class="req" for="tr-to">${t('center_to')}</label><select class="select" id="tr-to" data-bind="modal.to">${opts.map(c=>`<option value="${c.id}" ${m.to===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
  <div class="field"><label for="tr-n">${t('transfer_reason')}</label><textarea class="textarea" id="tr-n" data-bind="modal.note">${esc(m.note||'')}</textarea></div>
  ${hist.length?`<div class="field"><span class="lbl">${t('transfer_history')}</span>${hist.map(h=>`<div style="font-size:13px">${esc(centerName(h.from))} → <b>${esc(centerName(h.to))}</b> <small class="muted">· ${esc(uname(h.by))} · ${fmtDT(h.at)}</small></div>`).join('')}</div>`:''}`,
  foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="doTransfer">${t('transfer_center')}</button>` }; };
A.doTransfer = () => { const m=S.ui.modal, x=ticketById(m.id), u=me(); if(!m.to||m.to===x.centerId){ toast(t('e_required'),'bad'); return; }
  const from=x.centerId; const note=(m.note||'').trim();
  x.centerHistory=x.centerHistory||[]; x.centerHistory.push({from,to:m.to,at:Date.now(),by:u.id,note});
  x.centerId=m.to; x.updatedAt=Date.now();
  x.history.push({at:Date.now(),by:u.id,action:'transfer',from:null,to:null,note:centerName(from)+' → '+centerName(m.to)+(note?' · '+note:'')});
  const vars={no:x.no,from:centerName(from),to:centerName(m.to)};
  if(m.to==='sge'){ notify({toRole:'manager',key:'n_transfer',vars,ticketId:x.id}); notify({toRole:'engineer',key:'n_transfer',vars,ticketId:x.id}); }
  else notify({toDist:m.to,key:'n_transfer',vars,ticketId:x.id});
  if(from!=='sge'&&from!==m.to) notify({toDist:from,key:'n_transfer',vars,ticketId:x.id});
  try{ onTicketEvent('transfer',x,note); }catch(e){}
  S.ui.modal=null; save(); rerender(); toast(t('toast_transferred',{no:x.no,to:centerName(m.to)}),'ok'); };
MODALS.opinion = m => { const x=ticketById(m.id); return { title:`${t('add_opinion')} · <span class="mono">${x.no}</span>`,
  body:`<div class="field"><span class="lbl">${t('recommendation')}</span><div class="seg">${['approve','return','reject'].map(v=>`<button class="${m.rec===v?'on':''}" data-a="opRec" data-v="${v}">${t('rec_'+v)}</button>`).join('')}</div></div><div class="field"><label class="req" for="op-n">${t('tech_opinion')}</label><textarea class="textarea" id="op-n" data-bind="modal.note">${esc(m.note)}</textarea></div>`,
  foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="doOpinion">${t('send')}</button>` }; };
A.opRec = el => { S.ui.modal.rec=el.dataset.v; rerender(); };
A.doOpinion = () => { const m=S.ui.modal, x=ticketById(m.id); const note=(m.note||'').trim(); if(!note){ toast(t('e_required'),'bad'); return; } x.internal.push({at:Date.now(),by:S.userId,text:`[${t('rec_'+m.rec)}] ${note}`,tag:'opinion'}); x.history.push({at:Date.now(),by:S.userId,action:'opinion',from:null,to:null,note:''}); notify({toRole:'manager',key:'n_opinion',vars:{no:x.no},ticketId:x.id}); S.ui.modal=null; tdState(x.id).tab='internal'; save(); rerender(); toast(t('toast_saved'),'ok'); };
