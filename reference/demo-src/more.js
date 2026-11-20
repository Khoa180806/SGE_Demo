/* ===== RMA ===== */
const RMA_FLOW = ['requested','collected','repairing','shipped'];
function visibleRmas(u=me()){ return DB.rmas.filter(r=>{ const x=ticketById(r.ticketId); return !x||canSeeTicket(x,u); }); }
function viewRma(){
  const u=me(); const f=S.ui.rm||(S.ui.rm={status:'',q:'',page:1,size:10});
  let arr=visibleRmas(u);
  const counts=RMA_FLOW.map(s=>arr.filter(r=>r.status===s).length);
  if(f.status) arr=arr.filter(r=>r.status===f.status);
  if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(r=>(r.no+' '+r.sn+' '+r.model+' '+(ticketById(r.ticketId)?.no||'')).toLowerCase().includes(q)); }
  arr=arr.slice().sort((a,b)=>b.createdAt-a.createdAt);
  const rows=arr.slice((f.page-1)*f.size,f.page*f.size);
  return `<div class="page-head"><div><h1>${t('rma_title')}</h1></div>
    <div class="qtabs"><button class="qtab ${!f.status?'on':''}" data-a="rmFilter" data-s="">${t('all')}<b>${visibleRmas(u).length}</b></button>${RMA_FLOW.map((s,i)=>`<button class="qtab ${f.status===s?'on':''}" data-a="rmFilter" data-s="${s}">${t('r_'+s)}<b>${counts[i]}</b></button>`).join('')}</div></div>
  <div class="card"><div class="toolbar"><div class="search-inline">${ic('search',16)}<input class="input" id="rm-q" data-bind="rm.q" data-live="rmSearch" value="${esc(f.q)}" placeholder="${t('rma_search_ph')}" aria-label="${t('search')}"></div>${can('export')?`<button class="btn sm" data-a="exportRma">${ic('download',15)} ${t('export')}</button>`:''}</div>
  ${rows.length?`<div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('rma_no')}</th><th>${t('ticket_no')}</th><th>${t('rma_kind')}</th><th>${t('serial_model')}</th><th>${t('rma_items')}</th><th>${t('status')}</th>${u.role!=='distributor'?`<th>${t('distributor')}</th>`:''}<th>${t('tracking_no')}</th><th>${t('created_at')}</th></tr></thead><tbody>
  ${rows.map(r=>{ const x=ticketById(r.ticketId); return `<tr class="clickable" data-a="openRma" data-id="${r.id}"><td data-l="${t('rma_no')}" class="mono nowrap" style="color:var(--blue)">${r.no}</td><td data-l="${t('ticket_no')}" class="mono nowrap">${x?x.no:'—'}</td><td data-l="${t('rma_kind')}">${t('rk_'+r.kind)}</td><td data-l="${t('serial_model')}" class="nowrap"><span class="mono">${r.sn}</span><br><small class="muted">${r.model}</small></td><td data-l="${t('rma_items')}">${r.kind==='unit'?`${r.model} ×1`:r.parts.map(p=>`${esc(partName(p.pn))} ×${p.qty}`).join(', ')}</td><td data-l="${t('status')}">${rmaPill(r.status)}</td>${u.role!=='distributor'?`<td data-l="${t('distributor')}">${esc(distById(r.distributorId).short)}</td>`:''}<td data-l="${t('tracking_no')}" class="mono">${r.outTracking||r.inTracking||'—'}</td><td data-l="${t('created_at')}" class="num nowrap">${fmtD(r.createdAt)}</td></tr>`; }).join('')}
  </tbody></table></div>`:`<div class="empty">${t('no_results')}</div>`}${pager(arr.length,f,'rm')}</div>`;
}
A.rmFilter = el => { S.ui.rm.status=el.dataset.s; S.ui.rm.page=1; rerender(); };
A.rmSearch = () => { S.ui.rm.page=1; rerender(); };
A.exportRma = () => { const rows=[[t('rma_no'),t('ticket_no'),t('rma_kind'),'Serial','Model',t('rma_items'),t('status'),t('distributor'),t('tracking_no'),t('created_at')]]; visibleRmas().forEach(r=>rows.push([r.no,ticketById(r.ticketId)?.no||'',t('rk_'+r.kind),r.sn,r.model,r.kind==='unit'?r.model:r.parts.map(p=>p.pn+' x'+p.qty).join(' '),t('r_'+r.status),distById(r.distributorId).name,(r.outTracking||r.inTracking||''),fmtD(r.createdAt)])); download(`rma_${toISODate(Date.now())}.csv`,csv(rows)); };
function rmaBlock(r){
  const m=S.ui['rmd_'+r.id]||(S.ui['rmd_'+r.id]={}); const u=me(); const x=ticketById(r.ticketId); const idx=RMA_FLOW.indexOf(r.status);
  const stepAt = s => { const h=(r.history||[]).filter(h=>h.to===s); return h.length?h[h.length-1].at:null; };
  const steps=`<div class="stepper">${RMA_FLOW.map((s,i)=>{ const done=i<idx||(i===idx&&s==='shipped'); const cur=i===idx&&s!=='shipped'; const at=stepAt(s); return `<div class="step ${done?'done':''} ${cur?'cur':''}"><span class="c">${done?ic('check',12):i+1}</span><span>${t('r_'+s)}</span>${at&&(done||cur)?`<small class="muted num">${fmtD(at)}</small>`:''}</div>`; }).join('')}</div>`;
  const mineOk = u.role!=='distributor'||r.distributorId===u.distributorId;
  let act='', btn='';
  if(r.status==='requested' && can('rma_return') && mineOk){
    act=`<div class="form-grid"><div class="field"><label for="rm-in">${t('rma_in_tracking')}</label><input class="input mono" id="rm-in" data-bind="rmd_${r.id}.inTracking" value="${esc(m.inTracking||'')}"></div><div class="field"><label for="rm-cd">${t('rma_collected_date')}</label><input class="input" type="date" id="rm-cd" data-bind="rmd_${r.id}.date" value="${esc(m.date||toISODate(Date.now()))}"></div></div>`;
    btn=`<button class="btn primary" data-a="rmaNext" data-id="${r.id}">${ic('box',15)} ${t('rma_do_collect')}</button>`;
  } else if(r.status==='collected' && can('rma_ship')){
    act=`<div class="field"><label for="rm-note">${t('rma_repair_note')}</label><textarea class="textarea" id="rm-note" data-bind="rmd_${r.id}.note" style="min-height:70px">${esc(m.note||'')}</textarea></div>`;
    btn=`<button class="btn primary" data-a="rmaNext" data-id="${r.id}">${ic('wrench',15)} ${t('rma_do_repair')}</button>`;
  } else if(r.status==='repairing' && can('rma_ship')){
    act=`<div class="form-grid"><div class="field full"><label for="rm-res">${t('rma_repair_result')}</label><textarea class="textarea" id="rm-res" data-bind="rmd_${r.id}.note" style="min-height:70px">${esc(m.note!=null?m.note:L(r.repairNote))}</textarea></div>
      <div class="field"><label for="rm-osn">${t('rma_out_sn')}</label><input class="input mono" id="rm-osn" data-bind="rmd_${r.id}.outSn" value="${esc(m.outSn!=null?m.outSn:(r.kind==='unit'?'':r.sn))}"></div>
      <div class="field"><label for="rm-car">${t('carrier')}</label><select class="select" id="rm-car" data-bind="rmd_${r.id}.carrier">${['Viettel Post','GHN','GHTK','Xe SGE'].map(c=>`<option ${(m.carrier||'Viettel Post')===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label for="rm-out">${t('rma_out_tracking')}</label><input class="input mono" id="rm-out" data-bind="rmd_${r.id}.outTracking" value="${esc(m.outTracking||'')}"></div></div>`;
    btn=`<button class="btn primary" data-a="rmaNext" data-id="${r.id}">${ic('truck',15)} ${t('rma_do_ship')}</button>`;
  }
  return `${steps}
    <div class="kv-grid">${kv(t('rma_kind'),t('rk_'+r.kind))}${kv(t('distributor'),distById(r.distributorId)?.name||'—')}${kv(t('serial_no'),`<span class="mono">${r.sn}</span>`,true)}${kv(t('product_model'),r.model)}${kv(t('created_at'),fmtDT(r.createdAt))}
      ${r.inTracking||r.collectedAt?kv(t('rma_in_tracking'),`<span class="mono">${esc(r.inTracking||'—')}</span>`,true)+kv(t('rma_collected_date'),fmtD(r.collectedAt)):''}
      ${r.repairNote?kv(t('rma_repair_result'),L(r.repairNote)):''}
      ${r.shippedAt?kv(t('rma_out_sn'),`<span class="mono">${esc(r.outSn||'—')}</span>`,true)+kv(t('carrier'),r.carrier||'—')+kv(t('rma_out_tracking'),`<span class="mono">${esc(r.outTracking||'—')}</span>`,true)+kv(t('rma_shipped_date'),fmtD(r.shippedAt)):''}</div>
    ${r.kind==='part'&&r.parts.length?`<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('part_no')}</th><th>${t('part_name')}</th><th class="r">${t('qty')}</th></tr></thead><tbody>${r.parts.map(p=>`<tr><td class="mono">${p.pn}</td><td>${esc(partName(p.pn))}</td><td class="r">${p.qty}</td></tr>`).join('')}</tbody></table></div>`:''}${act}${btn?`<div class="row" style="margin-top:14px">${btn}</div>`:''}`;
}
A.rmaNext = el => {
  const r=rmaById(el.dataset.id), m=S.ui['rmd_'+r.id]||{}, u=me(); const i=RMA_FLOW.indexOf(r.status); const to=RMA_FLOW[i+1]; if(!to) return;
  if(to==='collected'){ r.inTracking=(m.inTracking||'').trim(); r.collectedAt=m.date?new Date(m.date+'T12:00:00').getTime():Date.now(); notify({toRole:'manager',key:'n_rma_collected',vars:{no:r.no},ticketId:r.ticketId}); }
  if(to==='repairing'){ r.repairNote=(m.note||'').trim(); }
  if(to==='shipped'){ r.repairNote=String(m.note!=null?m.note:L(r.repairNote)||'').trim(); r.outSn=String(m.outSn!=null?m.outSn:(r.kind==='unit'?'':r.sn)).trim()||r.sn; r.carrier=m.carrier||'Viettel Post'; r.outTracking=(m.outTracking||'').trim(); r.shippedAt=Date.now(); notify({toDist:r.distributorId,key:'n_rma_shipped',vars:{no:r.no},ticketId:r.ticketId}); }
  r.status=to; r.history=r.history||[]; r.history.push({at:Date.now(),by:u.id,to});
  const x=ticketById(r.ticketId); if(x) x.history.push({at:Date.now(),by:u.id,action:'rma_'+to,from:null,to:null,note:r.no});
  S.ui['rmd_'+r.id]={}; save(); rerender(); toast(t('toast_rma_'+to,{no:r.no}),'ok');
};

/* ===== Warranty lookup ===== */
function viewLookup(isPublic){
  const f=S.ui.lk||(S.ui.lk={mode:'sn',q:'',done:false});
  const q=f.q.trim();
  let res='';
  if(f.done && q){
    if(f.mode==='sn'){
      const d=devBySn(q);
      if(!d && !REG.ready && !REG.failed) res=`<div class="card card-b empty">${t('reg_loading')}</div>`;
      else if(!d) res=`<div class="card card-b empty">${t('sn_not_found_long',{sn:esc(q)})}</div>`;
      else {
        const w=warrantyState(d); const total=d.warrantyYears*365; const ws=warrantyStart(d); const totalMs=w.end-ws; const used=Math.min(1,Math.max(0,(Date.now()-ws)/totalMs));
        const hist=DB.tickets.filter(x=>x.products.some(p=>p.sn===d.sn) && x.status!=='draft').sort((a,b)=>b.createdAt-a.createdAt);
        const u=me(); const canOpen = x=> u && canSeeTicket(x,u);
        res=`<div class="card"><div class="card-h"><h3>${t('lookup_result')} · <span class="mono">${d.sn}</span></h3>${wPill(d)}</div><div class="card-b" style="display:flex;flex-direction:column;gap:18px">
          ${d.source==='registry'?`<div class="hint">${ic('shield',14)} ${t('reg_source',{f:esc(REG.meta.src),n:fmtNum(REG.count)})}</div>`:''}
          <div class="kv-grid">${kv(t('product_model'),d.model)}${d.productName?kv(t('product_name'),d.productName):''}${kv(t('product_code'),`<span class="mono">${esc(d.pn||'—')}</span>`,true)}${d.source==='registry'?(isPublic?'':kv(t('buyer'),d.company||'—')):kv(t('distributor'),distById(d.distributorId)?.name||'—')}${kv(t('ship_date'),fmtD(d.shipDate))}${d.startDate?kv(t('warranty_start'),fmtD(d.startDate)):kv(t('install_date'),fmtD(d.installDate))}${kv(t('warranty_package'),(d.pkg?d.pkg+' · ':'')+(d.extended?t('pkg_ext',{y:d.warrantyYears}):t('pkg_std',{y:d.warrantyYears})))}${kv(t('warranty_end'),fmtD(w.end))}${d.province?kv(t('province'),d.province):''}${isPublic||!d.project?'':kv(t('project_name'),d.project)}${d.note&&!isPublic?kv(t('note'),d.note):''}</div>
          <div><div class="row" style="justify-content:space-between;margin-bottom:6px;font-size:13px"><span>${fmtD(ws)}</span><b style="color:${w.inW?'var(--ok)':'var(--bad)'}">${w.inW?t('days_left',{n:fmtNum(w.daysLeft)}):t('expired_ago',{n:fmtNum(-w.daysLeft)})}</b><span>${fmtD(w.end)}</span></div><div class="wbar ${w.inW?'':'out'}"><i style="width:${(used*100).toFixed(1)}%"></i></div></div>
          <div><div class="lbl" style="margin-bottom:8px">${t('service_history')} (${hist.length})</div>${hist.length?`<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('ticket_no')}</th><th>${t('service_type')}</th><th>${t('status')}</th><th>${t('created_at')}</th><th>${t('closed_at')}</th></tr></thead><tbody>${hist.map(x=>`<tr ${canOpen(x)?`class="clickable" data-a="openTicket" data-id="${x.id}"`:''}><td class="mono">${x.no}</td><td>${esc(stName(x.type))}</td><td>${statusPill(x.status)}</td><td class="num">${fmtD(x.createdAt)}</td><td class="num">${fmtD(x.closedAt)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="muted">${t('no_service_history')}</div>`}</div>
          ${u&&can('ticket_create')?`<div><button class="btn primary" data-a="lkCreate" data-sn="${d.sn}">${ic('plus',15)} ${isExternal(u)?t('new_request'):t('create_ticket')}</button></div>`:''}
        </div></div>`;
      }
    } else {
      const Q=q.toUpperCase();
      const byNo=DB.tickets.find(x=>x.no.toUpperCase()===Q && x.status!=='draft');
      const list = byNo? [byNo] : DB.tickets.filter(x=>x.status!=='draft' && x.products.some(p=>p.sn.toUpperCase()===Q)).sort((a,b)=>b.createdAt-a.createdAt);
      if(!list.length) res=`<div class="card card-b empty">${devBySn(q)?t('sn_no_repairs',{sn:esc(q)}):t('repair_not_found',{q:esc(q)})}</div>`;
      else {
        const u=me();
        res=(!byNo?`<div class="muted" style="padding:0 4px">${t('repairs_for_sn',{sn:esc(Q),n:list.length})}</div>`:'')+list.slice(0,10).map((x,idx)=>{ const cur=STEP_OF[x.status]; const fin=x.status==='closed'; const bad=x.status==='rejected'||x.status==='cancelled';
          const open = idx===0 || S.ui.lk.open===x.id;
          const head=`<div class="card-h" ${open?'':`style="cursor:pointer" data-a="lkOpen" data-id="${x.id}"`}><h3>${t('ticket_no')} <span class="mono">${x.no}</span> <span class="muted" style="font-weight:400;font-size:13px">· ${fmtD(x.createdAt)}</span></h3>${statusPill(x.status)}</div>`;
          if(!open) return `<div class="card">${head}</div>`;
          return `<div class="card">${head}<div class="card-b" style="display:flex;flex-direction:column;gap:16px">
          <div class="stepper">${STEPS.map((st,i)=>{ const done=cur!=null&&(i<cur||fin); const c=cur===i&&!fin; return `<div class="step ${done?'done':''} ${c?(bad?'cur bad':'cur'):''}"><span class="c">${done?ic('check',12):i+1}</span><span>${t('step_'+st)}</span></div>`; }).join('')}</div>
          ${x.status==='rejected'?`<div class="quote" style="border-color:var(--bad)"><b>${t('s_rejected')}:</b> ${esc(L(lastNote(x,'rejected')))}</div>`:''}
          <div class="kv-grid">${kv(t('service_type'),stName(x.type))}${kv(t('product_model'),x.products.map(p=>p.model).join(', '))}${kv(t('serial_no'),`<span class="mono">${x.products.map(p=>p.sn).join(', ')}</span>`,true)}${kv(t('distributor'),x.distributorId?distById(x.distributorId).name:t('not_assigned'))}${kv(t('created_at'),fmtD(x.createdAt))}${kv(t('updated_at'),fmtDT(x.updatedAt))}
          ${x.delivery?kv(t('carrier'),x.delivery.carrier)+kv(t('tracking_no'),`<span class="mono">${esc(x.delivery.tracking||'—')}</span>`,true)+kv(t('delivery_date'),fmtD(x.delivery.at)):''}${x.closedAt?kv(t('closed_at'),fmtD(x.closedAt)):''}</div>
          ${u&&canSeeTicket(x,u)?`<div><button class="btn sm" data-a="openTicket" data-id="${x.id}">${t('open_ticket')}</button></div>`:''}
          </div></div>`; }).join('');
      }
    }
  }
  const sampleSn = (DB.tickets.find(x=>isOpen(x)&&x.status!=='draft')||DB.tickets[0]).products[0].sn;
  const modeTitle = f.mode==='sn'? t('lk_warranty_title') : t('lk_repair_title');
  const modeSub = f.mode==='sn'? t('lk_warranty_sub') : t('lk_repair_sub');
  return `<div class="lookup-hero">
    <div class="card lookup-search">
      <div class="seg" style="align-self:flex-start"><button class="${f.mode==='sn'?'on':''}" data-a="lkMode" data-v="sn">${ic('shield',15)} ${t('lk_tab_warranty')}</button><button class="${f.mode==='ticket'?'on':''}" data-a="lkMode" data-v="ticket">${ic('wrench',15)} ${t('lk_tab_repair')}</button></div>
      <div><h1>${modeTitle}</h1></div>
      <form class="lookup-bar" data-form="lookup"><input class="input" id="lk-q" data-bind="lk.q" value="${esc(f.q)}" placeholder="${f.mode==='sn'?t('lk_ph_sn'):t('lk_ph_repair')}" aria-label="${t('search')}"><button class="btn primary" type="submit">${ic('search',16)} ${t('lookup_btn')}</button></form>
      <div class="samples">${t('try')}: ${(f.mode==='sn'?DB.devices.slice(0,3).map(d=>d.sn):[DB.tickets.filter(x=>x.status!=='draft')[0].no, sampleSn]).map(s=>`<button data-a="lkSample" data-v="${s}">${s}</button>`).join('')}</div>
    </div>${res}</div>`;
}
function viewPublicLookup(){
  return `<header class="public-top"><span class="logo-mask"></span><span class="brand-sep"></span><b style="color:var(--ink-2)">${t('nav_lookup')}</b><span class="grow"></span><button class="icon-btn lang-btn" data-a="lang">${S.lang==='vi'?'VI':'EN'}</button><button class="btn sm" data-a="backLogin">${t('login_btn')}</button></header><main class="main">${viewLookup(true)}</main>${siteFooter()}`;
}
SUBMITS.lookup = () => { S.ui.lk.done=true; rerender(); };
A.lkMode = el => { S.ui.lk={mode:el.dataset.v,q:'',done:false}; rerender(); };
A.lkOpen = el => { S.ui.lk.open=el.dataset.id; rerender(); };
A.lkSample = el => { S.ui.lk.q=el.dataset.v; S.ui.lk.done=true; rerender(); };
A.lkCreate = el => { const u=me(); S.ui.nt=blankNT(u); S.ui.nt.products[0].sn=el.dataset.sn; openTab('new'); A.ntSnCheck({dataset:{i:'0'}}); };

/* ===== Reports ===== */
function viewReports(){
  const u=me();
  const f=S.ui.rp||(S.ui.rp={dist:'',from:'2026-01',to:toISODate(Date.now()).slice(0,7)});
  if(u.role==='distributor') f.dist=u.distributorId;
  const fromTs=new Date(f.from+'-01T00:00:00').getTime(); const toD=new Date(f.to+'-01T00:00:00'); const toTs=new Date(toD.getFullYear(),toD.getMonth()+1,1).getTime();
  let tk=DB.tickets.filter(x=>x.status!=='draft' && x.createdAt>=fromTs && x.createdAt<toTs);
  if(f.dist) tk=tk.filter(x=>x.distributorId===f.dist);
  const months=[]; for(let d=new Date(fromTs); d.getTime()<toTs; d=new Date(d.getFullYear(),d.getMonth()+1,1)) months.push({y:d.getFullYear(),m:d.getMonth()});
  const mLabel=o=>S.lang==='vi'?`T${o.m+1}`:new Date(o.y,o.m,1).toLocaleDateString('en-US',{month:'short'});
  const inMonth=(ts,o)=>{ const d=new Date(ts); return d.getFullYear()===o.y&&d.getMonth()===o.m; };
  const closed=tk.filter(x=>x.status==='closed'&&x.closedAt);
  const avgDays = arr => arr.length? arr.reduce((s,x)=>s+(x.closedAt-x.createdAt)/D,0)/arr.length : 0;
  const slaMet=closed.filter(x=>(x.closedAt-x.createdAt)<=SLA_DAYS*D).length;
  const tkRmas=DB.rmas.filter(r=>tk.some(x=>x.id===r.ticketId)); const rmaUnit=tkRmas.filter(r=>r.kind==='unit').length;
  const fb=tk.filter(x=>x.feedback); const csat=fb.length?fb.reduce((s,x)=>s+x.feedback.score,0)/fb.length:0;
  const approvedCnt=tk.filter(x=>x.approval&&x.approval.decision==='approved').length, rejectedCnt=tk.filter(x=>x.status==='rejected').length;
  const approvalRate=(approvedCnt+rejectedCnt)?approvedCnt/(approvedCnt+rejectedCnt):0;
  // status
  const sts=STATUS_ORDER.filter(s=>s!=='draft'); const stCounts=sts.map(s=>tk.filter(x=>x.status===s).length);
  // monthly
  const created=months.map(o=>tk.filter(x=>inMonth(x.createdAt,o)).length);
  const closedM=months.map(o=>closed.filter(x=>inMonth(x.closedAt,o)).length);
  const avgM=months.map(o=>{ const a=closed.filter(x=>inMonth(x.closedAt,o)); return a.length?Math.round(avgDays(a)*10)/10:null; });
  // failure rate by model
  const devs=DB.devices.filter(d=>!f.dist||d.distributorId===f.dist);
  const failTk=tk.filter(x=>x.type!=='OT');
  const share=f.dist?0.25:1; const fr=MODELS.map(m=>{ const n=Math.round(m.sold*share); const c=failTk.filter(x=>x.products.some(p=>p.model===m.id)).length; return {label:m.id, value:n?c/n*100:0, sub:`${c}/${fmtNum(n)}`}; }).filter(x=>x.value>0||true).sort((a,b)=>b.value-a.value);
  // parts
  const partQty={}; tk.forEach(x=>x.parts.forEach(p=>partQty[p.pn]=(partQty[p.pn]||0)+p.qty));
  const topParts=Object.entries(partQty).map(([pn,q])=>({label:partName(pn),value:q,sub:pn})).sort((a,b)=>b.value-a.value).slice(0,8);
  // fault codes
  const fc={}; failTk.forEach(x=>{ if(x.faultCode) fc[x.faultCode]=(fc[x.faultCode]||0)+1; });
  const topFaults=Object.entries(fc).map(([c,n])=>({label:faultName(c),value:n})).sort((a,b)=>b.value-a.value).slice(0,8);
  const dists=f.dist?DISTRIBUTORS.filter(d=>d.id===f.dist):DISTRIBUTORS;
  const caseSeries=dists.map(d=>({name:d.short,color:d.color,values:months.map(o=>tk.filter(x=>x.distributorId===d.id&&inMonth(x.createdAt,o)).length)}));
  const distRows=dists.map(d=>{ const a=tk.filter(x=>x.distributorId===d.id); const c=a.filter(x=>x.status==='closed'&&x.closedAt); const fbs=a.filter(x=>x.feedback); return {d,n:a.length,open:a.filter(isOpen).length,closed:c.length,avg:avgDays(c),sla:c.length?c.filter(x=>(x.closedAt-x.createdAt)<=SLA_DAYS*D).length/c.length:0,rma:tkRmas.filter(r=>r.distributorId===d.id).length,rej:a.filter(x=>x.status==='rejected').length,csat:fbs.length?fbs.reduce((s,x)=>s+x.feedback.score,0)/fbs.length:0}; });
  // technicians
  const techs=DB.users.filter(x=>x.role==='distributor'&&(!f.dist||x.distributorId===f.dist));
  const techRows=techs.map(te=>{ const a=tk.filter(x=>x.assigneeId===te.id); const c=a.filter(x=>x.status==='closed'&&x.closedAt); const fbs=a.filter(x=>x.feedback); return { te, n:a.length, open:a.filter(isOpen).length, closed:c.length, avg:avgDays(c), sla:c.length?c.filter(x=>(x.closedAt-x.createdAt)<=SLA_DAYS*D).length/c.length:0, csat:fbs.length?fbs.reduce((s,x)=>s+x.feedback.score,0)/fbs.length:0, parts:a.reduce((s,x)=>s+x.parts.reduce((q,p)=>q+p.qty,0),0) }; }).sort((a,b)=>b.closed-a.closed);
  S._rp={distRows,techRows,fr,topParts};
  const byType=SERVICE_TYPES.map(st=>({label:stName(st.id),value:tk.filter(x=>x.type===st.id).length,color:TYPE_COLORS[st.id]}));
  const monthOpts=[]; for(let m=0;m<12;m++){ const v=`2026-${pad(m+1)}`; monthOpts.push(v); }
  const stat=(l,v,d)=>`<div class="card stat"><div class="l">${l}</div><div class="v">${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
  return `<div class="page-head"><div><h1>${t('nav_reports')}</h1></div>
    <div class="row">
      ${u.role!=='distributor'?`<select class="select" style="width:210px" data-bind="rp.dist" data-re aria-label="${t('distributor')}"><option value="">${t('all_distributors')}</option>${DISTRIBUTORS.map(d=>`<option value="${d.id}" ${f.dist===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select>`:`<span class="chip" style="height:36px;padding:0 12px">${esc(distById(u.distributorId).name)}</span>`}
      <select class="select" style="width:120px" data-bind="rp.from" data-re aria-label="${t('from_month')}">${monthOpts.map(v=>`<option value="${v}" ${f.from===v?'selected':''}>${v}</option>`).join('')}</select>
      <span class="muted">→</span>
      <select class="select" style="width:120px" data-bind="rp.to" data-re aria-label="${t('to_month')}">${monthOpts.map(v=>`<option value="${v}" ${f.to===v?'selected':''}>${v}</option>`).join('')}</select>
      ${can('export')?`<button class="btn" data-a="exportReport">${ic('download',15)} ${t('export')}</button>`:''}
    </div></div>
  <div class="stat-row">
    ${stat(t('rs_total'),fmtNum(tk.length),t('rs_open',{n:fmtNum(tk.filter(isOpen).length)}))}
    ${stat(t('rs_closed'),fmtNum(closed.length),tk.length?fmtNum(closed.length/tk.length*100)+'%':'')}
    ${stat(t('rs_avg_time'),fmtNum(avgDays(closed),1)+' '+t('days'),t('rs_sla',{p:closed.length?fmtNum(slaMet/closed.length*100):0,d:SLA_DAYS}))}
    ${stat(t('rs_approval'),fmtNum(approvalRate*100)+'%',t('rs_rejected',{n:rejectedCnt}))}
    ${stat(t('rs_rma'),fmtNum(tkRmas.length),t('rs_rma_sub',{u:rmaUnit,p:tkRmas.length-rmaUnit}))}
    ${stat(t('rs_csat'),csat?fmtNum(csat,2)+'/5':'—',t('rs_csat_n',{n:fb.length}))}
  </div>
  <div class="report-grid">
    <div class="card"><div class="card-h"><h3>${t('rp_status')}</h3></div><div class="card-b">${Charts.bars({labels:sts.map(s=>t('s_'+s)),values:stCounts,color:'var(--blue)',rotate:true,h:290})}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp_monthly')}</h3></div><div class="card-b">${Charts.line({labels:months.map(mLabel),series:[{name:t('created'),color:'var(--accent)',values:created},{name:t('closed'),color:'var(--blue)',values:closedM}],area:true,h:270})}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp_failure_rate')}</h3><span class="hint">${t('rp_failure_hint')}</span></div><div class="card-b">${Charts.hbars({items:fr,fmt:v=>fmtNum(v,1)+'%',color:'var(--accent)'})}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp_avg_time')}</h3><span class="hint">SLA ${SLA_DAYS} ${t('days')}</span></div><div class="card-b">${Charts.bars({labels:months.map(mLabel),values:avgM.map(v=>v||0),colors:avgM.map(v=>v>SLA_DAYS?'var(--bad)':'var(--teal)'),h:250,fmtVal:v=>fmtNum(v,1),fmt:v=>fmtNum(v,0)})}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp_top_parts')}</h3></div><div class="card-b">${topParts.length?Charts.hbars({items:topParts,color:'var(--violet)'}):`<div class="muted">${t('no_data')}</div>`}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp_top_faults')}</h3></div><div class="card-b">${topFaults.length?Charts.hbars({items:topFaults,color:'var(--blue)'}):`<div class="muted">${t('no_data')}</div>`}</div></div>
    <div class="card full"><div class="card-h"><h3>${t('rp_cases_month')}</h3></div><div class="card-b">${Charts.stacked({labels:months.map(mLabel),series:caseSeries,w:1200,h:300,fmtVal:v=>fmtNum(v)})}
      <div class="table-wrap" style="margin-top:16px"><table class="tbl cards"><thead><tr><th>${t('distributor')}</th><th class="r">${t('rp_cases')}</th><th class="r">${t('rp_open')}</th><th class="r">${t('rp_closed')}</th><th class="r">${t('rp_rejected')}</th><th class="r">RMA</th><th class="r">${t('rp_avg_days')}</th><th>${t('rp_sla_met')}</th><th class="r">${t('rp_csat')}</th></tr></thead><tbody>
      ${distRows.map(r=>`<tr><td data-l="${t('distributor')}"><span class="row" style="gap:8px"><i style="width:10px;height:10px;border-radius:2px;background:${r.d.color};display:inline-block"></i>${esc(r.d.name)}</span></td><td data-l="${t('rp_cases')}" class="r num"><b>${fmtNum(r.n)}</b></td><td data-l="${t('rp_open')}" class="r num">${r.open}</td><td data-l="${t('rp_closed')}" class="r num">${r.closed}</td><td data-l="${t('rp_rejected')}" class="r num">${r.rej}</td><td data-l="RMA" class="r num">${r.rma}</td><td data-l="${t('rp_avg_days')}" class="r num" style="${r.avg>SLA_DAYS?'color:var(--bad)':''}">${fmtNum(r.avg,1)}</td><td data-l="${t('rp_sla_met')}">${`<span class="bar-inline"><span class="b" style="width:${Math.round(r.sla*80)}px;background:${r.sla>=0.8?'var(--ok)':r.sla>=0.6?'var(--warn)':'var(--bad)'}"></span><span class="num">${fmtNum(r.sla*100)}%</span></span>`}</td><td data-l="${t('rp_csat')}" class="r num">${r.csat?fmtNum(r.csat,2):'—'}</td></tr>`).join('')}
      </tbody></table></div></div></div>
    <div class="card full"><div class="card-h"><h3>${t('rp_tech')}</h3>${can('export')?`<button class="btn sm" data-a="exportTech">${ic('download',14)} ${t('export')}</button>`:''}</div><div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('technician')}</th><th>${t('distributor')}</th><th class="r">${t('rp_assigned')}</th><th class="r">${t('rp_open')}</th><th class="r">${t('rp_closed')}</th><th class="r">${t('rp_avg_days')}</th><th>${t('rp_sla_met')}</th><th class="r">${t('rp_csat')}</th><th class="r">${t('rp_parts_qty')}</th></tr></thead><tbody>
      ${techRows.map(r=>`<tr><td data-l="${t('technician')}"><span class="row" style="gap:8px;flex-wrap:nowrap"><span class="avatar" style="width:26px;height:26px;font-size:10px">${esc(initials(r.te.name))}</span>${esc(r.te.name)}</span></td><td data-l="${t('distributor')}">${esc(distById(r.te.distributorId).short)}</td><td data-l="${t('rp_assigned')}" class="r num">${r.n}</td><td data-l="${t('rp_open')}" class="r num">${r.open}</td><td data-l="${t('rp_closed')}" class="r num">${r.closed}</td><td data-l="${t('rp_avg_days')}" class="r num" style="${r.avg>SLA_DAYS?'color:var(--bad)':''}">${fmtNum(r.avg,1)}</td><td data-l="${t('rp_sla_met')}"><span class="bar-inline"><span class="b" style="width:${Math.round(r.sla*80)}px;background:${r.sla>=0.8?'var(--ok)':r.sla>=0.6?'var(--warn)':'var(--bad)'}"></span><span class="num">${fmtNum(r.sla*100)}%</span></span></td><td data-l="${t('rp_csat')}" class="r num">${r.csat?fmtNum(r.csat,2):'—'}</td><td data-l="${t('rp_parts_qty')}" class="r num">${r.parts}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>${t('by_service_type')}</h3></div><div class="card-b">${Charts.donut({items:byType,sub:'ticket'})}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp_by_province')}</h3></div><div class="card-b">${Charts.hbars({items:Object.entries(tk.reduce((a,x)=>{a[x.province]=(a[x.province]||0)+1;return a},{})).map(([k,v])=>({label:k,value:v})).sort((a,b)=>b.value-a.value).slice(0,8),color:'var(--teal)'})}</div></div>
  </div>`;
}
A.exportReport = () => { const r=S._rp; const rows=[[t('distributor'),t('rp_cases'),t('rp_open'),t('rp_closed'),t('rp_rejected'),'RMA',t('rp_avg_days'),t('rp_sla_met'),t('rp_csat')]]; r.distRows.forEach(x=>rows.push([x.d.name,x.n,x.open,x.closed,x.rej,x.rma,x.avg.toFixed(1),(x.sla*100).toFixed(0)+'%',x.csat.toFixed(2)])); rows.push([]); rows.push([t('rp_failure_rate'),'%','cases/units']); r.fr.forEach(x=>rows.push([x.label,x.value.toFixed(2),x.sub])); rows.push([]); rows.push([t('rp_top_parts'),t('part_no'),t('qty')]); r.topParts.forEach(x=>rows.push([x.label,x.sub,x.value])); download(`bao_cao_${S.ui.rp.from}_${S.ui.rp.to}.csv`,csv(rows)); };
A.exportTech = () => { const rows=[[t('technician'),t('distributor'),t('rp_assigned'),t('rp_open'),t('rp_closed'),t('rp_avg_days'),t('rp_sla_met'),t('rp_csat'),t('rp_parts_qty')]]; S._rp.techRows.forEach(r=>rows.push([r.te.name,distById(r.te.distributorId).name,r.n,r.open,r.closed,r.avg.toFixed(1),(r.sla*100).toFixed(0)+'%',r.csat.toFixed(2),r.parts])); download(`hieu_suat_ktv.csv`,csv(rows)); };


/* ===== Báo cáo hỗ trợ kỹ thuật ===== */
function spAt(s,a){ const e=(s.history||[]).find(x=>x.action===a); return e?e.at:null; }
function spRespH(s){ const v=spAt(s,'sp_claimed'); return v?(v-s.createdAt)/H:null; }
function spSolveH(s){ const v=s.status==='resolved'?spAt(s,'sp_resolved'):s.status==='converted'?spAt(s,'sp_converted'):null; return v?(v-s.createdAt)/H:null; }
function avgOf(a){ a=a.filter(v=>v!=null); return a.length?a.reduce((x,y)=>x+y,0)/a.length:null; }
function supportReport(u,f,fromTs,toTs,months,mLabel,inMonth){
  let sp=visibleSupport(u).filter(s=>s.createdAt>=fromTs&&s.createdAt<toTs);
  if(f.dist) sp=sp.filter(s=>s.distributorId===f.dist);
  const n=st=>sp.filter(s=>s.status===st).length;
  const done=sp.filter(s=>s.status==='resolved'||s.status==='converted');
  const resp=avgOf(sp.map(spRespH)), solve=avgOf(done.map(spSolveH));
  const hrs=v=>v==null?'—':fmtNum(v,1)+' h';
  const burn=sp.filter(s=>s.burn).length;
  const stat=(l,v,d)=>`<div class="card stat"><div class="l">${l}</div><div class="v">${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
  const createdM=months.map(o=>sp.filter(s=>inMonth(s.createdAt,o)).length);
  const doneM=months.map(o=>done.filter(s=>{ const v=spAt(s,s.status==='resolved'?'sp_resolved':'sp_converted'); return v&&inMonth(v,o); }).length);
  const SC={ new:'var(--accent)', in_progress:'var(--blue)', resolved:'var(--ok)', converted:'var(--teal)' };
  const byStatus=['new','in_progress','resolved','converted'].map(k=>({label:t('sp_s_'+k),value:n(k),color:SC[k]}));
  const TC={ inverter:'var(--accent)', isolarcloud:'var(--blue)', comm:'var(--teal)', other:'var(--slate)' };
  const byType=SP_TYPES.map(k=>({label:t('sp_t_'+k),value:sp.filter(s=>s.type===k).length,color:TC[k]||'var(--slate)'}));
  const cnt=key=>{ const o={}; sp.forEach(s=>key(s).forEach(k=>{ if(k) o[k]=(o[k]||0)+1; })); return Object.entries(o).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,8); };
  const topModels=cnt(s=>[String(s.model||'').trim().toUpperCase()]);
  const topCodes=cnt(s=>String(s.faultCodes||'').split(/[,;\s]+/).map(c=>c.trim()).filter(Boolean));
  const dists=f.dist?DISTRIBUTORS.filter(d=>d.id===f.dist):DISTRIBUTORS;
  const distRows=dists.map(d=>{ const a=sp.filter(s=>s.distributorId===d.id); const c=k=>a.filter(s=>s.status===k).length; return {name:d.name,color:d.color,n:a.length,nw:c('new'),ip:c('in_progress'),rs:c('resolved'),cv:c('converted'),resp:avgOf(a.map(spRespH)),solve:avgOf(a.filter(s=>s.status==='resolved'||s.status==='converted').map(spSolveH))}; });
  const handlers=DB.users.filter(x=>x.role==='engineer'||x.role==='manager');
  const hRows=handlers.map(h=>{ const a=sp.filter(s=>s.handlerId===h.id); return {name:h.name,role:h.role,n:a.length,ip:a.filter(s=>s.status==='in_progress').length,rs:a.filter(s=>s.status==='resolved').length,cv:a.filter(s=>s.status==='converted').length,resp:avgOf(a.map(spRespH)),solve:avgOf(a.map(spSolveH))}; }).filter(r=>r.n);
  S._rpsp={distRows,hRows};
  return `<div class="page-head" style="margin-top:28px"><div><h1 style="font-size:20px">${t('nav_support')}</h1></div>${can('export')?`<button class="btn" data-a="exportSpReport">${ic('download',15)} ${t('export')}</button>`:''}</div>
  <div class="stat-row">
    ${stat(t('sp_total'),fmtNum(sp.length),t('rs_open',{n:fmtNum(n('new')+n('in_progress'))}))}
    ${stat(t('sp_s_resolved'),fmtNum(n('resolved')),sp.length?fmtNum(n('resolved')/sp.length*100)+'%':'')}
    ${stat(t('sp_s_converted'),fmtNum(n('converted')),sp.length?fmtNum(n('converted')/sp.length*100)+'%':'')}
    ${stat(t('sp_avg_response'),hrs(resp),'')}
    ${stat(t('sp_avg_solve'),hrs(solve),'')}
    ${stat(t('sp_burn_short'),fmtNum(burn),sp.length?fmtNum(burn/sp.length*100)+'%':'')}
  </div>
  <div class="report-grid">
    <div class="card"><div class="card-h"><h3>${t('rp_sp_monthly')}</h3></div><div class="card-b">${Charts.line({labels:months.map(mLabel),series:[{name:t('created'),color:'var(--accent)',values:createdM},{name:t('rp_sp_done'),color:'var(--ok)',values:doneM}],area:true,h:270})}</div></div>
    <div class="card"><div class="card-h"><h3>${t('sp_by_status')}</h3></div><div class="card-b">${Charts.donut({items:byStatus,sub:t('sp_unit')})}</div></div>
    <div class="card"><div class="card-h"><h3>${t('sp_by_type')}</h3></div><div class="card-b">${Charts.donut({items:byType,sub:t('sp_unit')})}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp_sp_models')}</h3></div><div class="card-b">${topModels.length?Charts.hbars({items:topModels,color:'var(--accent)'}):`<div class="muted">${t('no_data')}</div>`}</div></div>
    <div class="card"><div class="card-h"><h3>${t('rp_sp_codes')}</h3></div><div class="card-b">${topCodes.length?Charts.hbars({items:topCodes,color:'var(--blue)'}):`<div class="muted">${t('no_data')}</div>`}</div></div>
    <div class="card full"><div class="card-h"><h3>${t('sp_by_dist')}</h3></div><div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('distributor')}</th><th class="r">${t('sp_total')}</th><th class="r">${t('sp_s_in_progress')}</th><th class="r">${t('sp_s_resolved')}</th><th class="r">${t('sp_s_converted')}</th><th class="r">${t('rp_resp_h')}</th></tr></thead><tbody>
      ${distRows.map(r=>`<tr><td data-l="${t('distributor')}"><span class="row" style="gap:8px;flex-wrap:nowrap"><i style="width:10px;height:10px;border-radius:2px;background:${r.color};display:inline-block;flex-shrink:0"></i>${esc(r.name)}</span></td><td data-l="${t('sp_total')}" class="r num"><b>${r.n}</b></td><td data-l="${t('sp_s_in_progress')}" class="r num">${r.nw+r.ip}</td><td data-l="${t('sp_s_resolved')}" class="r num">${r.rs}</td><td data-l="${t('sp_s_converted')}" class="r num">${r.cv}</td><td data-l="${t('rp_resp_h')}" class="r num">${hrs(r.resp)}</td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="card full"><div class="card-h"><h3>${t('rp_sp_handlers')}</h3></div><div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('sp_handler')}</th><th class="r">${t('rp_assigned')}</th><th class="r">${t('sp_s_in_progress')}</th><th class="r">${t('sp_s_resolved')}</th><th class="r">${t('sp_s_converted')}</th><th class="r">${t('sp_avg_response')}</th><th class="r">${t('sp_avg_solve')}</th></tr></thead><tbody>
      ${hRows.length?hRows.map(r=>`<tr><td data-l="${t('sp_handler')}"><span class="row" style="gap:8px;flex-wrap:nowrap"><span class="avatar" style="width:26px;height:26px;font-size:10px">${esc(initials(r.name))}</span>${esc(r.name)} <small class="muted">${t('role_'+r.role)}</small></span></td><td data-l="${t('rp_assigned')}" class="r num"><b>${r.n}</b></td><td data-l="${t('sp_s_in_progress')}" class="r num">${r.ip}</td><td data-l="${t('sp_s_resolved')}" class="r num">${r.rs}</td><td data-l="${t('sp_s_converted')}" class="r num">${r.cv}</td><td data-l="${t('sp_avg_response')}" class="r num">${hrs(r.resp)}</td><td data-l="${t('sp_avg_solve')}" class="r num">${hrs(r.solve)}</td></tr>`).join(''):`<tr><td colspan="7" class="muted">${t('no_data')}</td></tr>`}
    </tbody></table></div></div>
  </div>`;
}
A.exportSpReport = () => { const r=S._rpsp; const h=v=>v==null?'':v.toFixed(1); const rows=[[t('distributor'),t('sp_total'),t('sp_s_new'),t('sp_s_in_progress'),t('sp_s_resolved'),t('sp_s_converted'),t('sp_avg_response')+' (h)',t('sp_avg_solve')+' (h)']]; r.distRows.forEach(x=>rows.push([x.name,x.n,x.nw,x.ip,x.rs,x.cv,h(x.resp),h(x.solve)])); rows.push([]); rows.push([t('sp_handler'),t('rp_assigned'),'',t('sp_s_in_progress'),t('sp_s_resolved'),t('sp_s_converted'),t('sp_avg_response')+' (h)',t('sp_avg_solve')+' (h)']); r.hRows.forEach(x=>rows.push([x.name,x.n,'',x.ip,x.rs,x.cv,h(x.resp),h(x.solve)])); download(`support_report_${toISODate(Date.now())}.csv`, csv(rows)); };
