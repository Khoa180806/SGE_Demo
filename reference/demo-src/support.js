/* ===== Technical support requests (Hỗ trợ kỹ thuật) ===== */
const SP_TYPES = ['inverter','isolarcloud','comm','other'];
const SP_TIMES = ['morning','noon','afternoon','random','continuous'];
const SP_FLOW = ['new','in_progress','resolved'];
const spById = id => (DB.support||[]).find(s=>s.id===id);
function visibleSupport(u=me()){
  if(!u||!can('support_view',u)) return [];
  const all=DB.support||[];
  if(u.role==='distributor') return all.filter(s=>s.distributorId===u.distributorId);
  if(u.role==='enduser') return all.filter(s=>s.createdBy===u.id);
  return all;
}
const spPill = s => `<span class="pill ${({new:'s-pending',in_progress:'s-in_service',resolved:'s-closed',converted:'s-delivered'})[s]||''}">${t('sp_s_'+s)}</span>`;
function nextSpNo(){ const d=new Date(); DB.spSeq=(DB.spSeq||100)+1; return 'HT'+String(d.getFullYear()).slice(2)+pad(d.getMonth()+1)+pad(d.getDate())+String(DB.spSeq%10000).padStart(4,'0'); }

/* ---------- list ---------- */
function viewSupport(){
  const u=me(); const f=S.ui.sp||(S.ui.sp={st:'',q:'',page:1,size:10});
  const all=visibleSupport(u);
  let arr=all.slice();
  if(f.st) arr=arr.filter(s=>s.status===f.st);
  if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(s=>(s.no+' '+s.model+' '+s.serials+' '+s.station+' '+s.company+' '+s.faultCodes).toLowerCase().includes(q)); }
  arr.sort((a,b)=>b.createdAt-a.createdAt);
  const rows=arr.slice((f.page-1)*f.size,f.page*f.size);
  const tabs=['','new','in_progress','resolved','converted'];
  return `<div class="page-head"><div><h1>${t('nav_support')}</h1></div>
    <div class="qtabs">${tabs.map(s=>`<button class="qtab ${f.st===s?'on':''}" data-a="spFilter" data-s="${s}">${s?t('sp_s_'+s):t('all')}<b>${fmtNum(s?all.filter(x=>x.status===s).length:all.length)}</b></button>`).join('')}</div></div>
  <div class="card"><div class="toolbar"><div class="search-inline">${ic('search',16)}<input class="input" id="sp-q" data-bind="sp.q" data-live="spSearch" value="${esc(f.q)}" placeholder="${t('sp_search_ph')}" aria-label="${t('search')}"></div>
    ${can('support_create')?`<button class="btn primary sm" data-a="nav" data-k="supportNew">${ic('plus',15)} ${t('sp_new')}</button>`:''}</div>
  ${rows.length?`<div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('sp_no')}</th><th>${t('sp_type')}</th><th>${t('sp_model')}</th><th>${t('serial_no')}</th><th>${t('sp_station')}</th><th>${t('fault_code')}</th><th>${t('status')}</th>${u.role!=='distributor'?`<th>${t('distributor')}</th>`:''}<th>${t('sp_handler')}</th><th>${t('created_at')}</th></tr></thead><tbody>
  ${rows.map(s=>`<tr class="clickable" data-a="openSupport" data-id="${s.id}">
    <td data-l="${t('sp_no')}" class="mono nowrap" style="color:var(--blue)">${s.no}${s.burn?' <span class="chip vital">!</span>':''}</td>
    <td data-l="${t('sp_type')}" class="nowrap">${t('sp_t_'+s.type)}</td>
    <td data-l="${t('sp_model')}">${esc(s.model)}</td>
    <td data-l="${t('serial_no')}" class="mono"><div class="ttl" style="max-width:170px" title="${esc(s.serials)}">${esc(s.serials||'—')}</div></td>
    <td data-l="${t('sp_station')}"><div class="ttl" style="max-width:200px">${esc(s.station||s.company)}</div></td>
    <td data-l="${t('fault_code')}" class="mono">${esc(s.faultCodes||'—')}</td>
    <td data-l="${t('status')}">${spPill(s.status)}</td>
    ${u.role!=='distributor'?`<td data-l="${t('distributor')}">${esc(distById(s.distributorId)?.short||'—')}</td>`:''}
    <td data-l="${t('sp_handler')}" class="nowrap">${esc(uname(s.handlerId))}</td>
    <td data-l="${t('created_at')}" class="num nowrap">${fmtD(s.createdAt)}</td></tr>`).join('')}
  </tbody></table></div>`:`<div class="empty">${t('no_results')}</div>`}${pager(arr.length,f,'sp')}</div>`;
}
A.spFilter = el => { S.ui.sp.st=el.dataset.s; S.ui.sp.page=1; rerender(); };
A.spSearch = () => { S.ui.sp.page=1; rerender(); };
A.openSupport = el => openTab('s:'+el.dataset.id);

/* ---------- new request form ---------- */
function blankSP(u){
  const d=distById(u.distributorId);
  return { type:'inverter', model:'', faultDate:'', serials:'', gridDate:'', station:'', faultCodes:'', remoteLink:'', cause:'', when:'morning', burn:'no', insulation:'no',
    company:d?d.name:'', email:u.email||'', contact:u.name||'', phone:'', images:[], errors:{} };
}
function viewSupportNew(){
  const u=me(); if(!S.ui.spn) S.ui.spn=blankSP(u); const f=S.ui.spn, E=f.errors||{};
  const err=k=>E[k]?`<div class="err-text">${esc(E[k])}</div>`:'';
  const radio=(k,opts)=>`<div class="row" style="gap:18px">${opts.map(([v,l])=>`<label class="row" style="gap:8px;cursor:pointer;flex-wrap:nowrap"><input type="radio" name="spn-${k}" data-bind="spn.${k}" value="${v}" ${f[k]===v?'checked':''} style="width:16px;height:16px;accent-color:var(--accent)"><b style="font-weight:500">${l}</b></label>`).join('')}</div>`;
  const h=s=>`<h3 style="margin:6px 0 0;color:var(--accent-ink);font-size:17px;font-weight:600">${s}</h3>`;
  return `<div class="card" style="max-width:980px;margin:0 auto">
  <div class="card-h"><div><h3 style="font-size:18px">${t('sp_new')}</h3></div></div>
  <form class="card-b" data-form="spNew" novalidate style="display:flex;flex-direction:column;gap:16px">
    ${h(t('sp_sec_need'))}
    <div class="field"><label for="spn-type">${t('sp_q_type')}</label><select class="select" id="spn-type" data-bind="spn.type">${SP_TYPES.map(x=>`<option value="${x}" ${f.type===x?'selected':''}>${t('sp_t_'+x)}</option>`).join('')}</select></div>
    <div class="form-grid">
      <div class="field"><label class="req" for="spn-model">${t('sp_model_lbl')}</label><input class="input ${E.model?'err':''}" id="spn-model" data-bind="spn.model" value="${esc(f.model)}" list="spn-models">${err('model')}<datalist id="spn-models">${MODELS.map(m=>`<option value="${m.id}">`).join('')}<option value="COM100"><option value="WiNet-S"></datalist></div>
      <div class="field"><label for="spn-fd">${t('sp_fault_date')}</label><input class="input" type="date" id="spn-fd" data-bind="spn.faultDate" value="${esc(f.faultDate)}"></div>
      <div class="field"><label class="req" for="spn-sn">${t('sp_serials_lbl')}</label><input class="input mono ${E.serials?'err':''}" id="spn-sn" data-bind="spn.serials" value="${esc(f.serials)}">${err('serials')}</div>
      <div class="field"><label for="spn-gd">${t('sp_grid_date')}</label><input class="input" type="date" id="spn-gd" data-bind="spn.gridDate" value="${esc(f.gridDate)}"></div>
      <div class="field"><label for="spn-st">${t('sp_station_lbl')}</label><input class="input" id="spn-st" data-bind="spn.station" value="${esc(f.station)}"></div>
      <div class="field"><label for="spn-fc">${t('sp_codes_lbl')}</label><input class="input mono" id="spn-fc" data-bind="spn.faultCodes" value="${esc(f.faultCodes)}"></div>
      <div class="field full"><label for="spn-rm">${t('sp_remote_lbl')}</label><input class="input" id="spn-rm" data-bind="spn.remoteLink" value="${esc(f.remoteLink)}"></div>
      <div class="field full"><label class="req" for="spn-cause">${t('sp_cause_lbl')}</label><textarea class="textarea ${E.cause?'err':''}" id="spn-cause" data-bind="spn.cause">${esc(f.cause)}</textarea>${err('cause')}</div>
      <div class="field"><label for="spn-when">${t('sp_when_lbl')}</label><select class="select" id="spn-when" data-bind="spn.when">${SP_TIMES.map(x=>`<option value="${x}" ${f.when===x?'selected':''}>${t('sp_w_'+x)}</option>`).join('')}</select></div>
      <span></span>
      <div class="field"><span class="lbl">${t('sp_burn_q')}</span>${radio('burn',[['yes',t('yes')],['no',t('no')]])}</div>
      <div class="field"><span class="lbl">${t('sp_insul_q')}</span>${radio('insulation',[['no',t('sp_not_yet')],['yes',t('sp_done')]])}</div>
    </div>
    ${h(t('sp_sec_contact'))}
    <div class="form-grid">
      <div class="field"><label class="req" for="spn-co">${t('sp_company')}</label><input class="input ${E.company?'err':''}" id="spn-co" data-bind="spn.company" value="${esc(f.company)}">${err('company')}</div>
      <div class="field"><label class="req" for="spn-em">${t('sp_email_lbl')}</label><input class="input ${E.email?'err':''}" id="spn-em" type="email" data-bind="spn.email" value="${esc(f.email)}">${err('email')}</div>
      <div class="field"><label class="req" for="spn-ct">${t('contact')}</label><input class="input ${E.contact?'err':''}" id="spn-ct" data-bind="spn.contact" value="${esc(f.contact)}">${err('contact')}</div>
      <div class="field"><label class="req" for="spn-ph">${t('phone')}</label><input class="input ${E.phone?'err':''}" id="spn-ph" type="tel" data-bind="spn.phone" value="${esc(f.phone)}">${err('phone')}</div>
    </div>
    ${h(t('images'))}
    <div class="field"><span class="lbl">${t('sp_images_lbl')}</span>
      <label class="dropzone" data-drop="spnImgs" for="spn-file"><b>${t('sp_drop')}</b><span class="muted">${t('sp_or')}</span><span style="color:var(--accent-ink);font-weight:500">${t('sp_browse')}</span><small class="muted">${f.images.length} / 10</small><input type="file" id="spn-file" accept="image/*" multiple data-file="spnImgs" hidden></label>
      ${f.images.length?`<div class="attach-grid">${f.images.map(a=>attachCard(a,`<button type="button" class="link-btn" style="color:var(--bad)" data-a="spnDelImg" data-f="${a.id}">${t('delete')}</button>`)).join('')}</div>`:''}
    </div>
    <div class="row" style="border-top:1px solid var(--line);padding-top:16px"><button type="submit" class="btn primary" style="height:42px;padding:0 24px">${ic('send',15)} ${t('sp_submit')}</button><span class="grow"></span><button type="button" class="btn ghost" data-a="spnCancel">${t('cancel')}</button></div>
  </form></div>`;
}
const spAddImgs = (list, input, after) => { const room=10-list.length; if(room<=0){ toast(t('sp_max_files'),'bad'); return; } const files=[...input.files].slice(0,room); readFiles({files, set value(v){}}, 'image', arr=>{ list.push(...arr); after(arr); }); };
A.spnImgs = input => spAddImgs(S.ui.spn.images, input, ()=>rerender());
A.spnDelImg = el => { const L=S.ui.spn.images; const i=L.findIndex(a=>a.id===el.dataset.f); if(i>=0){ delete PENDING_FILES[L[i].id]; L.splice(i,1); } rerender(); };
A.spnCancel = () => { S.ui.spn=null; closeTab('supportNew'); };
SUBMITS.spNew = () => {
  const u=me(), f=S.ui.spn, E={};
  if(!f.model.trim()) E.model=t('e_required');
  if(!f.serials.trim() && f.type==='inverter') E.serials=t('e_required');
  if(!f.cause.trim()) E.cause=t('e_required');
  if(!f.company.trim()) E.company=t('e_required');
  if(!/^\S+@\S+\.\S+$/.test(f.email.trim())) E.email=t('e_email');
  if(!f.contact.trim()) E.contact=t('e_required');
  if(!/^[0-9 +().-]{8,}$/.test(f.phone.trim())) E.phone=t('e_phone');
  f.errors=E; if(Object.keys(E).length){ rerender(); toast(t('toast_fix_errors'),'bad'); return; }
  const now=Date.now();
  const s={ id:'sp'+now, no:nextSpNo(), status:'new', createdBy:u.id, distributorId:u.distributorId||null, handlerId:null, createdAt:now, updatedAt:now,
    type:f.type, model:f.model.trim(), faultDate:f.faultDate||'', serials:f.serials.trim(), gridDate:f.gridDate||'', station:f.station.trim(), faultCodes:f.faultCodes.trim(), remoteLink:f.remoteLink.trim(), cause:f.cause.trim(), when:f.when, burn:f.burn==='yes', insulation:f.insulation==='yes',
    company:f.company.trim(), email:f.email.trim(), contact:f.contact.trim(), phone:f.phone.trim(), images:f.images.map(a=>Object.assign({},a)), messages:[], solution:'', ticketId:null,
    history:[{at:now,by:u.id,action:'sp_created'}] };
  DB.support=DB.support||[]; DB.support.unshift(s);
  notify({toRole:'engineer',key:'n_sp_new',vars:{no:s.no},spId:s.id}); notify({toRole:'manager',key:'n_sp_new',vars:{no:s.no},spId:s.id});
  S.ui.spn=null; S.tabs=S.tabs.filter(k=>k!=='supportNew'); save();
  if(s.images.length) uploadAttachments({id:s.id,no:s.no,products:[]}, s.images);
  toast(t('toast_sp_sent',{no:s.no}),'ok'); openTab('s:'+s.id);
};

/* ---------- detail ---------- */
function viewSupportDetail(id){
  const s=spById(id); const u=me();
  if(!s||!visibleSupport(u).includes(s)) return `<div class="card empty">${t('no_access')}</div>`;
  const st=S.ui['spd_'+id]||(S.ui['spd_'+id]={msg:'',sol:s.solution||''});
  const handler = can('support_handle');
  const linked = s.ticketId?ticketById(s.ticketId):null;
  const flowIdx = s.status==='converted'?2:SP_FLOW.indexOf(s.status);
  const stepper=`<div class="stepper">${['new','in_progress',s.status==='converted'?'converted':'resolved'].map((k,i)=>{ const done=i<flowIdx||(i===2&&flowIdx===2); const cur=i===flowIdx&&!done; return `<div class="step ${done?'done':''} ${cur?'cur':''}"><span class="c">${done?ic('check',12):i+1}</span><span>${t('sp_s_'+k)}</span></div>`; }).join('')}</div>`;
  const yn=v=>v?t('yes'):t('no');
  let act='';
  if(handler && (s.status==='new'||s.status==='in_progress')){
    act=`<section class="card action-card"><div class="card-h"><h3 style="color:var(--accent-ink)">${ic('wrench',16)} ${t('sp_act_title')}</h3>${s.handlerId?`<span class="hint">${t('sp_handler')}: ${esc(uname(s.handlerId))}</span>`:''}</div><div class="card-b" style="display:flex;flex-direction:column;gap:12px">
      ${s.status==='new'?`<div class="row"><button class="btn primary" data-a="spClaim" data-id="${s.id}">${ic('play',14)} ${t('sp_claim')}</button></div>`:`
      <div class="field"><label for="sp-sol">${t('sp_solution')}</label><textarea class="textarea" id="sp-sol" data-bind="spd_${s.id}.sol">${esc(st.sol)}</textarea></div>
      <div class="row"><button class="btn okb" data-a="spResolve" data-id="${s.id}">${ic('check',15)} ${t('sp_resolve')}</button>${can('ticket_create')||handler?`<button class="btn primary" data-a="spToTicket" data-id="${s.id}">${ic('plus',15)} ${t('sp_to_ticket')}</button>`:''}</div>`}
    </div></section>`;
  } else if(!handler && s.status!=='converted' && can('ticket_create') && s.createdBy===u.id){
    act=`<section class="card action-card"><div class="card-h"><h3 style="color:var(--accent-ink)">${ic('wrench',16)} ${t('sp_act_title')}</h3></div><div class="card-b row"><button class="btn primary" data-a="spToTicket" data-id="${s.id}">${ic('plus',15)} ${t('sp_to_ticket')}</button></div></section>`;
  }
  const sec=(title,body)=>`<section class="card sec"><div class="card-h"><h3>${title}</h3></div><div class="card-b">${body}</div></section>`;
  return `<div class="detail" style="grid-template-columns:300px minmax(0,1fr)">
    <aside class="card detail-side">
      <div><div class="muted" style="font-size:12px">${t('sp_no')}</div><div class="no mono">${s.no}</div></div>
      <div class="row">${spPill(s.status)} ${s.burn?`<span class="chip vital">${t('sp_burn_short')}</span>`:''}</div>
      ${kv(t('sp_type'),t('sp_t_'+s.type))}
      ${kv(t('distributor'),distById(s.distributorId)?.name||'—')}
      ${kv(t('sp_created_by'),uname(s.createdBy))}
      ${kv(t('sp_handler'),uname(s.handlerId))}
      ${kv(t('created_at'),fmtDT(s.createdAt))}
      ${linked?kv(t('sp_linked_ticket'),`<button class="link-btn mono" data-a="openTicket" data-id="${linked.id}">${linked.no}</button> ${statusPill(linked.status)}`,true):''}
    </aside>
    <div class="detail-main">
      <div class="card detail-head"><h2>${esc(s.station||s.company)} <span class="muted" style="font-weight:400;font-size:15px">· ${esc(s.model)}</span></h2>${stepper}
        ${s.solution?`<div class="quote" style="border-color:var(--ok)"><b>${t('sp_solution')}:</b> ${esc(L(s.solution))}</div>`:''}</div>
      ${act}
      ${sec(t('sp_sec_need'),`<div class="kv-grid">${kv(t('sp_type'),t('sp_t_'+s.type))}${kv(t('sp_model'),s.model)}${kv(t('serial_no'),`<span class="mono">${esc(s.serials||'—')}</span>`,true)}${kv(t('sp_fault_date'),s.faultDate?fmtD(new Date(s.faultDate).getTime()):'—')}${kv(t('sp_grid_date'),s.gridDate?fmtD(new Date(s.gridDate).getTime()):'—')}${kv(t('sp_station'),s.station||'—')}${kv(t('fault_code'),`<span class="mono">${esc(s.faultCodes||'—')}</span>`,true)}${kv(t('sp_when_lbl'),t('sp_w_'+s.when))}${kv(t('sp_burn_q'),yn(s.burn))}${kv(t('sp_insul_q'),s.insulation?t('sp_done'):t('sp_not_yet'))}${s.remoteLink?kv('Remote Maintenance',`<a href="${esc(s.remoteLink)}" target="_blank" rel="noopener">${esc(s.remoteLink)}</a>`,true):''}</div>
        <div class="kv" style="margin-top:14px"><span>${t('sp_cause_lbl')}</span><p class="quote" style="margin:4px 0 0;white-space:pre-wrap">${esc(L(s.cause))}</p></div>`)}
      ${sec(t('sp_sec_contact'),`<div class="kv-grid">${kv(t('sp_company'),s.company)}${kv(t('contact'),s.contact)}${kv(t('phone'),s.phone)}${kv(t('email'),s.email)}</div>`)}
      ${sec(t('images'),`${s.images.length?`<div class="attach-grid">${s.images.map(a=>attachCard(a)).join('')}</div>`:`<div class="muted">${t('no_attachments')}</div>`}${s.status!=='converted'&&(s.createdBy===u.id||handler)?`<label class="btn sm soft" style="cursor:pointer;margin-top:10px">${ic('upload',14)} ${t('upload_images')}<input type="file" accept="image/*" multiple data-file="spdImgs" data-id="${s.id}" hidden></label>`:''}`)}
      <section class="card"><div class="card-h"><h3>${t('sp_messages')}</h3></div><div class="card-b">
        <div class="msgs">${s.messages.length?s.messages.map(m=>`<div class="msg ${m.by===u.id?'me':''}"><span class="avatar">${esc(initials(uname(m.by)))}</span><div class="bubble"><div class="who">${esc(uname(m.by))} · ${fmtDT(m.at)}</div>${m.text?esc(L(m.text)):''}${msgImgs(m)}</div></div>`).join(''):`<div class="empty">${t('no_messages')}</div>`}</div>
        ${chatPendingHtml('sp',s.id,'')}<div class="composer" data-drop="chatImgs" data-scope="sp" data-id="${s.id}" data-k="">${chatAttachBtn('sp',s.id,'')}<textarea class="textarea grow" id="sp-msg" data-bind="spd_${s.id}.msg" placeholder="${t('type_message')}">${esc(st.msg)}</textarea><button class="btn primary" data-a="spSend" data-id="${s.id}">${ic('send',15)} ${t('send')}</button></div>
      </div></section>
      <section class="card"><div class="card-h"><h3>${t('tab_history')}</h3></div><div class="card-b"><div class="timeline">${[...s.history].reverse().map(h=>`<div class="tl"><span class="d">${ic('clock',13)}</span><div class="m"><div><b style="font-weight:600">${esc(uname(h.by))}</b> ${esc(t('h_'+h.action))}${h.note?` <span class="mono">${esc(h.note)}</span>`:''}</div><small class="num">${fmtDT(h.at)}</small></div></div>`).join('')}</div></div></section>
    </div></div>`;
}
const spLog=(s,action,note)=>{ s.history.push({at:Date.now(),by:S.userId,action,note:note||''}); s.updatedAt=Date.now(); };
A.spClaim = el => { const s=spById(el.dataset.id); s.handlerId=S.userId; s.status='in_progress'; spLog(s,'sp_claimed'); notify({toUser:s.createdBy,key:'n_sp_claimed',vars:{no:s.no},spId:s.id}); save(); rerender(); toast(t('toast_saved'),'ok'); };
A.spResolve = el => { const s=spById(el.dataset.id); const st=S.ui['spd_'+s.id]; const sol=(st.sol||'').trim(); if(!sol){ toast(t('sp_need_solution'),'bad'); S._focus='sp-sol'; rerender(); return; } s.solution=sol; s.status='resolved'; spLog(s,'sp_resolved'); notify({toUser:s.createdBy,key:'n_sp_resolved',vars:{no:s.no},spId:s.id}); save(); rerender(); toast(t('toast_sp_resolved',{no:s.no}),'ok'); };
A.spSend = el => { const s=spById(el.dataset.id); const st=S.ui['spd_'+s.id]; const txt=(st.msg||'').trim(); const d={scope:'sp',id:s.id,k:''}; if(!txt&&!chatPending(d).length) return; const imgs=takeChatImgs(d); s.messages.push({at:Date.now(),by:S.userId,text:txt,images:imgs}); if(imgs.length) setTimeout(()=>uploadAttachments({id:s.id,no:s.no,products:[]}, imgs),0); st.msg=''; s.updatedAt=Date.now();
  if(S.userId===s.createdBy){ if(s.handlerId) notify({toUser:s.handlerId,key:'n_sp_msg',vars:{no:s.no},spId:s.id}); else notify({toRole:'engineer',key:'n_sp_msg',vars:{no:s.no},spId:s.id}); } else notify({toUser:s.createdBy,key:'n_sp_msg',vars:{no:s.no},spId:s.id});
  save(); rerender(); };
A.spdImgs = input => { const s=spById(input.dataset.id); spAddImgs(s.images, input, arr=>{ spLog(s,'attached'); save(); rerender(); uploadAttachments({id:s.id,no:s.no,products:[]}, arr); }); };
A.spToTicket = el => {
  const s=spById(el.dataset.id); const u=me();
  const nt=blankNT(u);
  const sns=(s.serials||'').split(/[,;\s]+/).map(x=>x.trim().toUpperCase()).filter(Boolean);
  nt.products = (sns.length?sns:['']).map(sn=>({sn, model:'', qty:1}));
  nt.project=s.station||''; nt.company=s.company; nt.contact=s.contact; nt.phone=s.phone; nt.email=s.email;
  const fc=(s.faultCodes||'').split(/[,;\s]+/).map(c=>c.trim()).filter(Boolean)[0]; if(fc){ const code=/^\d+$/.test(fc)?fc.padStart(3,'0'):fc.toUpperCase(); if(faultBy(code)) nt.faultCode=code; }
  if(s.faultDate) nt.faultTime=s.faultDate+'T08:00';
  nt.vital=!!s.burn; nt.priority=s.burn?'high':'medium';
  nt.description=`[${s.no}] ${t('sp_t_'+s.type)} · ${s.model}\n${t('fault_code')}: ${s.faultCodes||'—'} · ${t('sp_when_lbl')}: ${t('sp_w_'+s.when)}\n${t('sp_burn_q')} ${s.burn?t('yes'):t('no')} · ${t('sp_insul_q')} ${s.insulation?t('sp_done'):t('sp_not_yet')}\n${L(s.cause)}`;
  nt.diagnosis = s.solution? L(s.solution) : L(s.cause);
  nt.attachments=s.images.map(a=>Object.assign({},a));
  nt.fromSupport=s.id;
  S.ui.nt=nt; openTab('new');
  nt.products.forEach((p,i)=>{ if(p.sn) A.ntSnCheck({dataset:{i:String(i)}}); });
};
