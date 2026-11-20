/* ===== Tickets: list ===== */
const activeFilterCount = f => ['type','status','dist','model','from','to'].filter(k=>f[k]).length;
const defaultTL = () => ({ quick:'all', q:'', type:'', status:'', dist:'', model:'', from:'', to:'', page:1, size:10, filter:false, sel:{} });

function quickDefs(u){
  const own = x=> u.role!=='distributor' || x.distributorId===u.distributorId;
  const inProg = x=>['approved','in_service','testing','delivered','on_hold'].includes(x.status);
  const d = [ {k:'all', l:t('q_all'), f:()=>true} ];
  if(globalScope(u)) d.push({k:'pending', l:t('s_pending'), f:x=>x.status==='pending'});
  if(u.role==='distributor'){ d.push({k:'unassigned', l:t('q_unassigned'), f:x=>x.status==='unassigned'}); d.push({k:'action', l:t('q_need_action'), f:x=>own(x)&&['draft','diagnosing','returned'].includes(x.status)}); }
  if(u.role==='manager'||u.role==='dev') d.push({k:'overdue', l:t('q_overdue'), f:x=>isOpen(x)&&slaBreached(x)});
  if(u.role==='engineer') d.push({k:'vital', l:t('q_vital'), f:x=>isOpen(x)&&x.vital});
  d.push({k:'progress', l:t('q_progress'), f:inProg});
  d.push({k:'rma', l:t('q_rma'), f:x=>{ const r=x.rmaId&&rmaById(x.rmaId); return !!r&&r.status!=='shipped'; }});
  d.push({k:'open', l:t('q_open'), f:isOpen});
  d.push({k:'closed', l:t('q_closed'), f:x=>x.status==='closed'});
  return d;
}
function filteredTickets(){
  const u=me(), f=S.ui.tl;
  let arr=visibleTickets(u);
  const qd=quickDefs(u).find(q=>q.k===f.quick)||quickDefs(u)[0];
  arr=arr.filter(qd.f);
  if(f.q){ const q=f.q.trim().toLowerCase(); arr=arr.filter(x=>(x.no+' '+x.title+' '+x.products.map(p=>p.sn+' '+p.model).join(' ')+' '+x.customer.company+' '+x.customerTicketNo+' '+((x.svcId&&svcById(x.svcId)||{}).no||'')).toLowerCase().includes(q)); }
  if(f.type) arr=arr.filter(x=>x.type===f.type);
  if(f.status) arr=arr.filter(x=>x.status===f.status);
  if(f.dist) arr=arr.filter(x=>x.distributorId===f.dist);
  if(f.model) arr=arr.filter(x=>x.products.some(p=>p.model===f.model));
  if(f.from) arr=arr.filter(x=>x.createdAt>=new Date(f.from+'T00:00:00').getTime());
  if(f.to) arr=arr.filter(x=>x.createdAt<=new Date(f.to+'T23:59:59').getTime());
  return arr.slice().sort((a,b)=>b.createdAt-a.createdAt);
}
function viewTickets(){
  const u=me(); if(!S.ui.tl) S.ui.tl=defaultTL(); const f=S.ui.tl;
  const all=filteredTickets(); const pages=Math.max(1,Math.ceil(all.length/f.size)); if(f.page>pages) f.page=pages;
  const rows=all.slice((f.page-1)*f.size, f.page*f.size);
  const vt=visibleTickets(u);
  const selIds=Object.keys(f.sel).filter(k=>f.sel[k]);
  const canClaim = u.role==='distributor' && can('ticket_claim') && selIds.some(id=>ticketById(id)?.status==='unassigned');
  return `
  <div class="page-head"><div><h1>${esc(tabTitle('tickets'))}</h1></div>
    <div class="qtabs">${quickDefs(u).map(q=>`<button class="qtab ${f.quick===q.k?'on':''}" data-a="quick" data-k="${q.k}">${esc(q.l)}<b>${fmtNum(vt.filter(q.f).length)}</b></button>`).join('')}</div></div>
  <div class="list-layout ${f.filter?'':'nofilter'}">
    ${f.filter?filterPanel(u,f):''}
    <div class="card" style="min-width:0">
      <div class="toolbar">
        <div class="row grow">
          <button class="btn sm ${f.filter?'soft':''}" data-a="toggleFilter" aria-pressed="${f.filter}" title="${f.filter?t('hide_filters'):t('show_filters')}">${ic('filter',15)} ${f.filter?t('hide_filters'):t('filters')}${activeFilterCount(f)?` <span class="badge" style="background:var(--accent);color:var(--on-accent);border-radius:9px;padding:0 6px;font-size:11px;line-height:17px">${activeFilterCount(f)}</span>`:''}</button>
          <div class="search-inline">${ic('search',16)}<input class="input" id="tl-q" data-bind="tl.q" data-live="tlSearch" value="${esc(f.q)}" placeholder="${t('search_ph')}" aria-label="${t('search')}"></div>
        </div>
        <div class="row">
          <button class="icon-btn" data-a="refresh" title="${t('refresh')}" aria-label="${t('refresh')}">${ic('refresh',16)}</button>
          ${can('ticket_create')?`<button class="btn primary sm" data-a="nav" data-k="new">${ic('plus',15)} ${isExternal(u)?t('new_request'):t('create')}</button>`:''}
          ${u.role==='distributor'&&can('ticket_claim')?`<button class="btn sm" data-a="claimSel" ${canClaim?'':'disabled'}>${t('claim')}</button>`:''}
          ${can('export')?`<button class="btn sm" data-a="exportTickets">${ic('download',15)} ${t('export')}</button>`:''}
        </div>
      </div>
      ${rows.length?`<div class="table-wrap"><table class="tbl cards"><thead><tr>
        ${u.role==='distributor'?'<th class="cb"></th>':''}<th>${t('ticket_no')}</th><th>${t('ticket_title')}</th><th>${t('service_type')}</th><th class="r">${t('proc_time')}</th><th>${t('status')}</th><th>${t('priority')}</th><th>${t('serial_model')}</th>${u.role!=='distributor'&&!isExternal(u)?`<th>${t('distributor')}</th>`:''}<th>${t('person_in_charge')}</th><th>${t('created_at')}</th></tr></thead><tbody>
        ${rows.map(x=>`<tr class="clickable" data-a="openTicket" data-id="${x.id}">
          ${u.role==='distributor'?`<td class="cb" data-a="noop"><input type="checkbox" data-bind="tl.sel.${x.id}" data-re ${f.sel[x.id]?'checked':''} ${x.status==='unassigned'?'':'disabled'} aria-label="select"></td>`:''}
          <td data-l="${t('ticket_no')}" class="nowrap"><span class="mono" style="color:var(--blue)">${x.no}</span>${x.vital?' <span class="chip vital">!</span>':''}</td>
          <td data-l="${t('ticket_title')}"><div class="ttl" title="${esc(x.title)}">${esc(x.title)}</div></td>
          <td data-l="${t('service_type')}" class="nowrap">${esc(stName(x.type))}</td>
          <td data-l="${t('proc_time')}" class="r num nowrap ${isOpen(x)&&slaBreached(x)?'':''}" style="${isOpen(x)&&slaBreached(x)?'color:var(--bad);font-weight:600':''}">${fmtNum(procHours(x),1)}h</td>
          <td data-l="${t('status')}">${statusPill(x.status)}${x.rmaId&&rmaById(x.rmaId)?`<div style="margin-top:4px">${rmaPill(rmaById(x.rmaId).status)}</div>`:''}</td>
          <td data-l="${t('priority')}">${flag(x.priority)}</td>
          <td data-l="${t('serial_model')}" class="nowrap"><span class="mono">${x.products[0].sn}</span><br><small class="muted">${x.products[0].model}${x.products.length>1?' +'+(x.products.length-1):''}</small></td>
          ${u.role!=='distributor'&&!isExternal(u)?`<td data-l="${t('distributor')}" class="nowrap">${x.distributorId?esc(distById(x.distributorId).short):'<span class="muted">—</span>'}</td>`:''}
          <td data-l="${t('person_in_charge')}" class="nowrap">${esc(uname(x.assigneeId))}</td>
          <td data-l="${t('created_at')}" class="nowrap num">${fmtD(x.createdAt)}</td>
        </tr>`).join('')}</tbody></table></div>`:`<div class="empty">${t('no_results')}</div>`}
      ${pager(all.length,f,'tl')}
    </div>
  </div>`;
}
function filterPanel(u,f){
  return `<div class="card filter-panel"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><h3>${t('ticket_filter')}</h3><button class="icon-btn" style="width:30px;height:30px" data-a="toggleFilter" title="${t('hide_filters')}" aria-label="${t('hide_filters')}">${ic('x',15)}</button></div>
    <div class="field"><label for="f-type">${t('service_type')}</label><select class="select" id="f-type" data-bind="tl.type" data-re="resetPage"><option value="">${t('all')}</option>${SERVICE_TYPES.map(s=>`<option value="${s.id}" ${f.type===s.id?'selected':''}>${esc(stName(s.id))}</option>`).join('')}</select></div>
    <div class="field"><label for="f-st">${t('status')}</label><select class="select" id="f-st" data-bind="tl.status" data-re="resetPage"><option value="">${t('all')}</option>${STATUS_ORDER.map(s=>`<option value="${s}" ${f.status===s?'selected':''}>${esc(t('s_'+s))}</option>`).join('')}</select></div>
    ${globalScope(u)?`<div class="field"><label for="f-d">${t('distributor')}</label><select class="select" id="f-d" data-bind="tl.dist" data-re="resetPage"><option value="">${t('all')}</option>${DISTRIBUTORS.map(d=>`<option value="${d.id}" ${f.dist===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div>`:''}
    <div class="field"><label for="f-m">${t('product_model')}</label><select class="select" id="f-m" data-bind="tl.model" data-re="resetPage"><option value="">${t('all')}</option>${MODELS.map(m=>`<option ${f.model===m.id?'selected':''}>${m.id}</option>`).join('')}</select></div>
    <div class="field"><label for="f-from">${t('from_date')}</label><input class="input" type="date" id="f-from" data-bind="tl.from" data-re="resetPage" value="${f.from}"></div>
    <div class="field"><label for="f-to">${t('to_date')}</label><input class="input" type="date" id="f-to" data-bind="tl.to" data-re="resetPage" value="${f.to}"></div>
    <div class="row"><button class="btn grow" data-a="resetFilter">${t('reset')}</button></div>
  </div>`;
}
function pager(total,f,ns){
  const pages=Math.max(1,Math.ceil(total/f.size)); const p=f.page;
  const nums=[]; for(let i=1;i<=pages;i++){ if(i===1||i===pages||Math.abs(i-p)<=1) nums.push(i); else if(nums[nums.length-1]!=='…') nums.push('…'); }
  return `<div class="pager"><span>${t('total')} <b class="num">${fmtNum(total)}</b></span>
    <select data-bind="${ns}.size" data-num data-re="resetPage" aria-label="page size">${[10,20,50].map(n=>`<option value="${n}" ${f.size===n?'selected':''}>${n}/${t('page')}</option>`).join('')}</select>
    <button class="pg" data-a="pg" data-ns="${ns}" data-p="${p-1}" ${p<=1?'disabled':''} aria-label="prev">‹</button>
    ${nums.map(n=>n==='…'?'<span>…</span>':`<button class="pg ${n===p?'on':''}" data-a="pg" data-ns="${ns}" data-p="${n}">${n}</button>`).join('')}
    <button class="pg" data-a="pg" data-ns="${ns}" data-p="${p+1}" ${p>=pages?'disabled':''} aria-label="next">›</button></div>`;
}
A.noop = (el,ev)=>{ ev.stopPropagation(); };
A.quick = el => { S.ui.tl.quick=el.dataset.k; S.ui.tl.page=1; rerender(); };
A.toggleFilter = () => { S.ui.tl.filter=!S.ui.tl.filter; rerender(); };
A.resetFilter = () => { const q=S.ui.tl.quick; S.ui.tl=Object.assign(defaultTL(),{quick:q,filter:S.ui.tl.filter}); rerender(); };
A.resetPage = el => { const ns=el.dataset.bind.split('.')[0]; if(S.ui[ns]) S.ui[ns].page=1; rerender(); };
A.tlSearch = () => { S.ui.tl.page=1; rerender(); };
A.pg = el => { const o=S.ui[el.dataset.ns]; o.page=+el.dataset.p; rerender(); };
A.refresh = () => { rerender(); toast(t('refreshed')); };
A.claimSel = () => { const u=me(); const ids=Object.keys(S.ui.tl.sel).filter(k=>S.ui.tl.sel[k]); let n=0; ids.forEach(id=>{ const x=ticketById(id); if(x&&x.status==='unassigned'){ claimTicket(x,u); n++; } }); S.ui.tl.sel={}; save(); rerender(); toast(t('toast_claimed',{n}),'ok'); };
A.exportTickets = () => {
  const rows=[[t('ticket_no'),t('ticket_title'),t('service_type'),t('status'),t('priority'),'Serial','Model',t('distributor'),t('person_in_charge'),t('customer'),t('province'),t('fault_code'),t('created_at'),t('closed_at'),t('proc_time')+' (h)',t('center'),'RMA',t('created_by'),t('contract_no'),t('approved_by'),t('approved_at'),t('parts_used')]];
  filteredTickets().forEach(x=>rows.push([x.no,x.title,stName(x.type),t('s_'+x.status),t('p_'+x.priority),x.products.map(p=>p.sn).join(' '),x.products.map(p=>p.model).join(' '),x.distributorId?distById(x.distributorId).name:'',uname(x.assigneeId),x.customer.company,x.province,x.faultCode,fmtDT(x.createdAt),x.closedAt?fmtDT(x.closedAt):'',procHours(x).toFixed(1),centerName(x.centerId),x.rmaId&&rmaById(x.rmaId)?rmaById(x.rmaId).no+' · '+t('r_'+rmaById(x.rmaId).status):'',(x.creator&&x.creator.name)||uname(x.createdBy),(x.svcId&&svcById(x.svcId)||{}).no||'',x.approval?approverInfo(x.approval).name:'',x.approval?fmtDT(x.approval.at):'',x.parts.map(p=>p.pn+' x'+p.qty).join(' ')]));
  download(`tickets_${toISODate(Date.now())}.csv`, csv(rows));
};

/* ===== Workflow helpers ===== */
function logH(x,action,by,from,to,note){ x.history.push({at:Date.now(),by,action,from,to,note:note||''}); x.status=to; x.updatedAt=Date.now(); try{ onTicketEvent(action,x,note); }catch(e){} }
function claimTicket(x,u){ x.distributorId=u.distributorId; x.assigneeId=u.id; logH(x,'claimed',u.id,'unassigned','diagnosing'); if(x.customerId) notify({toCustomer:x.customerId,key:'n_claimed',vars:{no:x.no,d:distById(u.distributorId).short},ticketId:x.id}); }
function nextNo(type){ const d=new Date(); const k=String(d.getFullYear()).slice(2)+pad(d.getMonth()+1)+pad(d.getDate()); DB.seq=(DB.seq||1000)+1; const pre=type; return pre+k+String(DB.seq%10000).padStart(4,'0'); }

/* ===== New ticket ===== */
function blankNT(u){
  return { type:'TN', intake:{ method:'walkin', date:toISODate(Date.now()), cond:'ok', condNote:'', acc:'', loc:'' }, products:[{sn:'',model:'',qty:1}], project:'', company:'', contact:isExternal(u)?u.name:'', email:isExternal(u)?u.email:'', phone:'', province:'', address:'', customerNo:'', centerId:u.role==='distributor'?u.distributorId:(isExternal(u)?'':'sge'), faultCode:'', faultTime:'', description:'', diagnosis:'', proposal:'repair', vital:false, priority:'medium', sendEmail:true, attachments:[], errors:{} };
}
function sampleSns(u){ const now=Date.now(); const pool=DB.devices.filter(d=>u.role!=='distributor'||d.distributorId===u.distributorId); const inW=pool.find(d=>warrantyState(d).inW); const out=pool.find(d=>!warrantyState(d).inW); return [inW,out].filter(Boolean).map(d=>d.sn); }
function viewNewTicket(){
  const u=me(); if(!S.ui.nt) S.ui.nt=blankNT(u); const f=S.ui.nt; const E=f.errors||{};
  if(isExternal(u)&&!f.company){ const c=DB.customers.find(c=>c.id===myCust(u)); if(c){ f.company=c.company; f.phone=c.phone; f.province=c.province; f.address=c.address; } }
  const isNpp=!isExternal(u)&&can('ticket_diagnose');
  const err=k=>E[k]?`<div class="err-text">${esc(E[k])}</div>`:'';
  const myDevices = isExternal(u)? DB.devices.filter(d=>d.customerId===myCust(u)) : [];
  return `<div class="card" style="max-width:1100px;margin:0 auto">
  <div class="card-h"><div><h3 style="font-size:18px">${isExternal(u)?t('new_request'):t('new_ticket')}</h3></div></div>
  <form class="card-b" data-form="newTicket" novalidate style="display:flex;flex-direction:column;gap:22px">
    <div class="form-grid">
      ${isExternal(u)?'':`<div class="field full"><div class="hint">${ic('box',14)} ${t('intake_form_hint')}</div></div>`}
      <div class="field"><label for="nt-pri">${t('priority')}</label><select class="select" id="nt-pri" data-bind="nt.priority">${['high','medium','low'].map(p=>`<option value="${p}" ${f.priority===p?'selected':''}>${t('p_'+p)}</option>`).join('')}</select></div>
    </div>
    <div class="field">
      <div class="row" style="justify-content:space-between"><span class="lbl req">${t('products')}</span><button type="button" class="btn sm soft" data-a="ntAddRow">${ic('plus',14)} ${t('add_product')}</button></div>
      <div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl"><thead><tr><th style="min-width:190px">${t('serial_no')}</th><th>${t('product_model')}</th><th style="width:90px">${t('qty')}</th><th>${t('warranty_status')}</th><th>${t('warranty_end')}</th><th></th></tr></thead><tbody>
      ${f.products.map((p,i)=>{ const d=devBySn(p.sn); return `<tr>
        <td><input class="input mono ${E['sn'+i]?'err':''}" id="nt-sn-${i}" data-bind="nt.products.${i}.sn" data-re="ntSnCheck" data-i="${i}" value="${esc(p.sn)}" ${myDevices.length?`list="mydev"`:''}>${err('sn'+i)}</td>
        <td>${d?`<b>${d.model}</b><br><small class="muted">${d.pn}</small>`:p.sn?`<span class="muted">${t('sn_not_found')}</span>`:'<span class="muted">—</span>'}</td>
        <td><input class="input num" type="number" min="1" data-bind="nt.products.${i}.qty" data-num value="${p.qty}"></td>
        <td>${p.sn?wPill(d):'—'}</td><td class="num">${d?fmtD(warrantyEnd(d)):'—'}</td>
        <td>${f.products.length>1?`<button type="button" class="icon-btn" data-a="ntDelRow" data-i="${i}" aria-label="${t('delete')}">${ic('trash',15)}</button>`:''}</td></tr>`; }).join('')}
      </tbody></table></div>
      ${myDevices.length?`<datalist id="mydev">${myDevices.map(d=>`<option value="${d.sn}">${d.model} · ${esc(d.project)}</option>`).join('')}</datalist>`:`<div class="hint">${t('sn_hint')} ${sampleSns(u).map(sn=>`<button type="button" class="link-btn mono" data-a="ntSample" data-sn="${sn}">${sn}</button>`).join(' · ')}</div>`}
    </div>
    <div class="form-grid">
      <div class="field"><label for="nt-proj">${t('project_name')}</label><input class="input" id="nt-proj" data-bind="nt.project" value="${esc(f.project)}"></div>
      <div class="field"><label for="nt-comp">${t('customer_name')}</label>${u.role==='agent'?`<select class="select" id="nt-comp" data-bind="nt.custId" data-re="ntCust">${(u.customerIds||[]).map(id=>{ const c=DB.customers.find(c=>c.id===id); return c?`<option value="${c.id}" ${myCust(u)===c.id?'selected':''}>${esc(c.company)}</option>`:''; }).join('')}</select>`:`<input class="input" id="nt-comp" data-bind="nt.company" value="${esc(f.company)}" ${isExternal(u)?'readonly':''}>`}</div>
      <div class="field"><label class="req" for="nt-center">${t('center_recv')}</label><select class="select ${E.centerId?'err':''}" id="nt-center" data-bind="nt.centerId"><option value="">${t('choose_center')}</option>${centers().map(c=>`<option value="${c.id}" ${f.centerId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>${err('centerId')}</div>
      <div class="field"><label class="req" for="nt-prov">${t('province')}</label><select class="select ${E.province?'err':''}" id="nt-prov" data-bind="nt.province"><option value="">${t('choose')}</option>${PROVINCES.map(p=>`<option ${f.province===p?'selected':''}>${p}</option>`).join('')}</select>${err('province')}</div>
      <div class="field"><label for="nt-cno">${t('customer_ticket_no')}</label><input class="input" id="nt-cno" data-bind="nt.customerNo" value="${esc(f.customerNo)}"></div>
      <div class="field full"><label for="nt-addr">${t('project_address')}</label><input class="input" id="nt-addr" data-bind="nt.address" value="${esc(f.address)}"></div>
    </div>
    <div class="form-grid">
      <div class="field"><label for="nt-fc">${t('fault_code')}</label><select class="select" id="nt-fc" data-bind="nt.faultCode"><option value="">${t('choose')}</option>${FAULTS.map(x=>`<option value="${x.code}" ${f.faultCode===x.code?'selected':''}>${esc(x.code+' · '+(x.en||x.vi))}</option>`).join('')}</select></div>
      <div class="field"><label for="nt-ft">${t('fault_time')}</label><input class="input" type="datetime-local" id="nt-ft" data-bind="nt.faultTime" value="${esc(f.faultTime)}"></div>
      <div class="field full"><label class="req" for="nt-desc">${t('detailed_description')}</label><textarea class="textarea ${E.description?'err':''}" id="nt-desc" data-bind="nt.description">${esc(f.description)}</textarea>${err('description')}</div>
      ${false?`<div class="field full"><label class="req" for="nt-diag">${t('npp_diagnosis')}</label><textarea class="textarea ${E.diagnosis?'err':''}" id="nt-diag" data-bind="nt.diagnosis">${esc(f.diagnosis)}</textarea>${err('diagnosis')}</div>
      <div class="field"><label for="nt-prop">${t('proposal')}</label><select class="select" id="nt-prop" data-bind="nt.proposal">${PROPOSALS.map(p=>`<option value="${p}" ${f.proposal===p?'selected':''}>${t('prop_'+p)}</option>`).join('')}</select></div>`:''}
    </div>
    ${isExternal(u)?'':intakeFields('nt.intake',f.intake,E)}
    <div class="form-grid">
      <div class="field"><label class="req" for="nt-contact">${t('contact')}</label><input class="input ${E.contact?'err':''}" id="nt-contact" data-bind="nt.contact" value="${esc(f.contact)}">${err('contact')}</div>
      <div class="field"><label class="req" for="nt-phone">${t('phone')}</label><input class="input ${E.phone?'err':''}" id="nt-phone" type="tel" data-bind="nt.phone" value="${esc(f.phone)}">${err('phone')}</div>
      <div class="field"><label class="req" for="nt-email">${t('email')}</label><input class="input ${E.email?'err':''}" id="nt-email" type="email" data-bind="nt.email" value="${esc(f.email)}">${err('email')}</div>
      <div class="row" style="gap:28px;align-items:flex-end">
        <label class="row" style="gap:10px;cursor:pointer"><span class="switch"><input type="checkbox" data-bind="nt.vital" ${f.vital?'checked':''}><span></span></span><span class="lbl">${t('vital_fault')}</span></label>
        <label class="row" style="gap:10px;cursor:pointer"><span class="switch"><input type="checkbox" data-bind="nt.sendEmail" ${f.sendEmail?'checked':''}><span></span></span><span class="lbl">${t('send_email')}</span></label>
      </div>
    </div>
    <div class="field"><span class="lbl">${t('attachments')}</span>${uploadZones('nt', f.attachments, 'ntDelFile')}${E.files?`<div class="err-text">${esc(E.files)}</div>`:''}</div>
    <div class="row" style="border-top:1px solid var(--line);padding-top:18px">
      <button type="button" class="btn" data-a="ntSubmit" data-mode="draft">${t('save_draft')}</button>
      ${isExternal(u)?`<button type="button" class="btn primary" data-a="ntSubmit" data-mode="submit">${t('send_request')}</button>`:`${can('ticket_diagnose')?`<button type="button" class="btn primary" data-a="ntSubmit" data-mode="self">${ic('check',15)} ${t('intake_self')}</button>`:''}<button type="button" class="btn ${can('ticket_diagnose')?'':'primary'}" data-a="ntSubmit" data-mode="submit">${t('intake_queue')}</button>`}
      <span class="grow"></span><button type="button" class="btn ghost" data-a="ntCancel">${t('cancel')}</button>
    </div>
  </form></div>`;
}
A.ntAddRow = () => { S.ui.nt.products.push({sn:'',model:'',qty:1}); rerender(); };
A.ntDelRow = el => { S.ui.nt.products.splice(+el.dataset.i,1); rerender(); };
A.ntSample = el => { S.ui.nt.products[0].sn=el.dataset.sn; A.ntSnCheck({dataset:{i:'0'}}); };
A.ntSnCheck = el => { const f=S.ui.nt; const p=f.products[+el.dataset.i]; const d=devBySn(p.sn); if(d){ p.sn=d.sn; p.model=d.model; if(!f.project) f.project=d.project; const c=DB.customers.find(c=>c.id===d.customerId); if(c&&!f.company){ f.company=c.company; f.contact=f.contact||c.contact; f.phone=f.phone||c.phone; f.email=f.email||c.email; f.address=f.address||c.address; } if(!f.province) f.province=d.province; const w=warrantyState(d); if(!w.inW && f.type==='RW') f.type='OW'; else if(w.inW && f.type==='OW') f.type='RW'; } rerender(); };
A.ntImgs = input => readFiles(input,'image', arr=>{ S.ui.nt.attachments.push(...arr); rerender(); });
A.ntLogs = input => readFiles(input,'log', arr=>{ S.ui.nt.attachments.push(...arr); rerender(); });
A.ntDelFile = el => { const L=S.ui.nt.attachments; const i=L.findIndex(a=>a.id===el.dataset.f); if(i>=0){ delete PENDING_FILES[L[i].id]; L.splice(i,1); } rerender(); };
A.ntCancel = () => { S.ui.nt=null; closeTab('new'); };
A.ntSubmit = el => {
  const u=me(), f=S.ui.nt, mode=el.dataset.mode, E={};
  const isNpp=!isExternal(u)&&can('ticket_diagnose');
  f.products=f.products.filter((p,i)=>p.sn.trim()||i===0);
  if(mode!=='draft'){
    f.products.forEach((p,i)=>{ const d=devBySn(p.sn); if(!p.sn.trim()) E['sn'+i]=t('e_required'); else if(!d) E['sn'+i]=t('e_sn_unknown');  });
    if(!f.province) E.province=t('e_required');
    if(!f.centerId) E.centerId=t('e_required');
    if(!f.description.trim()) E.description=t('e_required');
    if(!isExternal(u) && !f.intake.date) E.intakeDate=t('e_required');
    if(!f.contact.trim()) E.contact=t('e_required');
    if(!/^[0-9 +().-]{8,}$/.test(f.phone.trim())) E.phone=t('e_phone');
    if(!/^\S+@\S+\.\S+$/.test(f.email.trim())) E.email=t('e_email');
    const sc=storageCfg(); const miss=[]; if(sc.reqImage&&!f.attachments.some(a=>a.kind!=='log')) miss.push(t('images')); if(sc.reqLog&&!f.attachments.some(a=>a.kind==='log')) miss.push(t('log_files')); if(miss.length) E.files=t('e_files_required',{w:miss.join(', ')});
  } else if(!f.products[0].sn.trim()) E.sn0=t('e_required');
  f.errors=E;
  if(Object.keys(E).length){ rerender(); toast(t('toast_fix_errors'),'bad'); return; }
  const d0=devBySn(f.products[0].sn); const sp0=f.fromSupport?spById(f.fromSupport):null; const spAgent=sp0&&userById(sp0.createdBy);
  const now=Date.now();
  const x={ id:'tn'+now, no:nextNo(f.type), type:f.type, status:'draft', source:isExternal(u)?'enduser':'npp', priority:f.priority, vital:f.vital,
    distributorId: u.role==='distributor'?u.distributorId : (sp0&&sp0.distributorId) || (globalScope(u)? (d0?d0.distributorId:null) : null),
    assigneeId: u.role==='distributor'?u.id : (spAgent&&spAgent.role==='distributor'?spAgent.id : (mode==='self'?u.id:null)), createdBy:u.id, creator:{name:u.name,email:u.email,role:u.role}, centerId:f.centerId||'sge', centerHistory:[],
    customerId: isExternal(u)?myCust(u) : (d0?d0.customerId:null),
    customer:{company:f.company||(d0?'':'—'),contact:f.contact,phone:f.phone,email:f.email}, project:f.project, province:f.province, address:f.address,
    products:f.products.filter(p=>p.sn.trim()).map(p=>{ const d=devBySn(p.sn); return {sn:d?d.sn:p.sn.trim(), model:d?d.model:'?', qty:p.qty||1}; }),
    faultCode:f.faultCode, faultTime:f.faultTime?new Date(f.faultTime).getTime():null, description:f.description,
    diagnosis: null, intake: isExternal(u)? null : Object.assign({}, f.intake, { at:f.intake.date?new Date(f.intake.date+'T'+String(new Date().getHours()).padStart(2,'0')+':00:00').getTime():now, by:u.id }),
    parts:[], test:null, delivery:null, approval:null, attachments:f.attachments.map(a=>Object.assign({},a)), internal:[], conversation:[], history:[], feedback:null, rmaId:null, createdAt:now, updatedAt:now, closedAt:null, customerTicketNo:f.customerNo };
  x.title = `${(f.project||f.company||'').split(' – ')[0]} ${x.products[0].model}`.trim();
  x.history.push({at:now,by:u.id,action:'created',from:null,to:'draft',note:''});
  if(mode!=='draft'){
    if(isExternal(u)){ logH(x,'submitted_req',u.id,'draft','unassigned'); notify({toRole:'manager',key:'n_unassigned',vars:{no:x.no},ticketId:x.id}); }
    else if(mode==='self'){ x.assigneeId=u.id; logH(x,'received',u.id,'draft','diagnosing'); }
    else { logH(x,'received',u.id,'draft','unassigned'); notify({toRole:'manager',key:'n_unassigned',vars:{no:x.no},ticketId:x.id}); }
  }
  if(f.fromSupport){ const sp=spById(f.fromSupport); if(sp){ if(!x.distributorId) x.distributorId=sp.distributorId; if(!x.assigneeId && u.role!=='distributor') x.assigneeId=sp.createdBy; x.supportId=sp.id; sp.ticketId=x.id; sp.status='converted'; sp.handlerId=sp.handlerId||(u.role!=='distributor'?u.id:null); sp.history.push({at:Date.now(),by:u.id,action:'sp_converted',note:x.no}); sp.updatedAt=Date.now(); notify({toUser:sp.createdBy,key:'n_sp_converted',vars:{no:sp.no,t:x.no},ticketId:x.id}); } S.tabs=S.tabs.filter(k=>k!=='s:'+f.fromSupport); }
  DB.tickets.unshift(x); S.ui.nt=null; save();
  if(x.attachments.length) uploadAttachments(x, x.attachments);
  S.tabs=S.tabs.filter(k=>k!=='new');
  toast(mode==='draft'?t('toast_draft_saved',{no:x.no}):t('toast_submitted',{no:x.no}),'ok');
  openTicket(x.id);
};
SUBMITS.newTicket = ()=>{};

function myCust(u=me()){ if(!u) return null; if(u.customerId) return u.customerId; const f=S.ui.nt; if(f&&f.custId&&(u.customerIds||[]).includes(f.custId)) return f.custId; return (u.customerIds||[])[0]||null; }
A.ntCust = () => { const f=S.ui.nt; const c=DB.customers.find(c=>c.id===f.custId); if(c){ f.company=c.company; f.phone=c.phone; f.province=c.province; f.address=c.address; } rerender(); };
