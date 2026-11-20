/* ===== Home ===== */
const STATUS_ORDER = ['draft','unassigned','diagnosing','pending','returned','approved','return_pending','in_service','on_hold','testing','delivered','invoiced','paid','closed','rejected','cancelled'];
const TYPE_COLORS = { RW:'var(--accent)', OW:'var(--blue)', PR:'var(--teal)', OT:'var(--slate)' };

function homeKpis(u){
  const vt=visibleTickets(u);
  const c = f => vt.filter(f).length;
  const rOpen = DB.rmas.filter(r=>r.status!=='shipped' && (u.role!=='distributor'||r.distributorId===u.distributorId)).length;
  const inProg = x=>['approved','in_service','testing','delivered','on_hold'].includes(x.status);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  if(u.role==='manager'||u.role==='dev') return [
    {v:c(x=>x.status==='pending'), l:t('k_pending'), pill:t('k_need_you'), icon:'clip', cls:'', go:{quick:'pending'}},
    {v:c(inProg), l:t('k_inprogress'), icon:'wrench', cls:'b', go:{quick:'progress'}},
    {v:rOpen, l:t('k_rma_open'), icon:'box', cls:'', go:{quick:'rma'}},
    {v:c(x=>isOpen(x)&&slaBreached(x)), l:t('k_overdue',{d:SLA_DAYS}), icon:'alert', cls:'r', go:{quick:'overdue'}},
  ];
  if(u.role==='engineer') return [
    {v:c(x=>x.status==='pending'), l:t('k_pending_opinion'), icon:'clip', cls:'', go:{quick:'pending'}},
    {v:c(x=>isOpen(x)&&x.vital), l:t('k_vital'), icon:'alert', cls:'r', go:{quick:'vital'}},
    {v:c(inProg), l:t('k_inprogress'), icon:'wrench', cls:'b', go:{quick:'progress'}},
    {v:c(x=>x.status==='closed' && x.closedAt>=monthStart), l:t('k_closed_month'), icon:'check', cls:'g', go:{quick:'closed'}},
  ];
  if(u.role==='distributor') return [
    {v:c(x=>x.status==='unassigned'), l:t('k_unassigned'), pill:t('k_claim'), icon:'bell', cls:'', go:{quick:'unassigned'}},
    {v:c(x=>x.distributorId===u.distributorId && ['returned','diagnosing','draft'].includes(x.status)), l:t('k_todo_diag'), icon:'clip', cls:'r', go:{quick:'action'}},
    {v:c(x=>x.distributorId===u.distributorId && inProg(x)), l:t('k_inprogress'), icon:'wrench', cls:'b', go:{quick:'progress'}},
    {v:c(x=>x.distributorId===u.distributorId && x.status==='closed' && x.closedAt>=monthStart), l:t('k_closed_month'), icon:'check', cls:'g', go:{quick:'closed'}},
  ];
  return [
    {v:c(isOpen), l:t('k_my_open'), icon:'wrench', cls:'b', go:{quick:'open'}},
    {v:c(x=>x.status==='closed'), l:t('k_my_closed'), icon:'check', cls:'g', go:{quick:'closed'}},
    {v:DB.devices.filter(d=>inScope(d.customerId,u)).length, l:t('k_my_devices'), icon:'shield', cls:'', go:'tickets'},
    {v:c(x=>['delivered','closed'].includes(x.status)&&!x.feedback), l:t('k_need_feedback'), icon:'star', cls:'', go:{quick:'closed'}},
  ];
}

function viewHome(){
  const u=me();
  const h=S.ui.home||(S.ui.home={dist:'',period:'90'});
  const kp=homeKpis(u);
  const now=Date.now();
  let vt=visibleTickets(u);
  if(h.dist) vt=vt.filter(x=>x.distributorId===h.dist);
  if(h.period!=='all') vt=vt.filter(x=>x.createdAt>=now-Number(h.period)*D);
  const statuses=STATUS_ORDER.filter(s=>isExternal(u)?s!=='draft':true);
  const counts=statuses.map(s=>vt.filter(x=>x.status===s).length);
  const byType=SERVICE_TYPES.map(st=>({label:stName(st.id), value:vt.filter(x=>x.type===st.id).length, color:TYPE_COLORS[st.id]}));
  const canCreate = can('ticket_create');
  return `${erpHomeBand(u)}
  <div class="kpis">
    ${kp.map((k,i)=>`<button class="kpi" data-a="kpiGo" data-i="${i}"><div><div class="v">${fmtNum(k.v)}</div><div class="l">${esc(k.l)}${k.pill?` <span class="pill s-returned" style="height:20px">${esc(k.pill)}</span>`:''}</div></div><span class="ic ${k.cls}">${ic(k.icon,20)}</span></button>`).join('')}
    ${canCreate?`<button class="kpi create" data-a="nav" data-k="new">${ic('plus',20)} ${isExternal(u)?t('new_request'):t('create_ticket')}</button>`:can('reports')?`<button class="kpi create" data-a="nav" data-k="reports">${ic('chart',20)} ${t('nav_reports')}</button>`:''}
  </div>
  <div class="home-grid">
    <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
    <div class="card">
      <div class="card-h"><h3>${t('home_chart_title')}</h3>
        <div class="row">
          ${globalScope(u)?`<select class="select" style="width:200px" data-bind="home.dist" data-re aria-label="${t('distributor')}"><option value="">${t('all_distributors')}</option>${DISTRIBUTORS.map(d=>`<option value="${d.id}" ${h.dist===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select>`:''}
          <div class="seg">${[['30','30 '+t('days')],['90','90 '+t('days')],['all',t('year')+' 2026']].map(([v,l])=>`<button class="${h.period===v?'on':''}" data-a="homePeriod" data-v="${v}">${l}</button>`).join('')}</div>
        </div>
      </div>
      <div class="card-b chart-grid">
        <div><div class="lbl" style="margin-bottom:6px">${isExternal(u)?t('my_requests_by_status'):t('tickets_by_status')} <span class="muted">· ${fmtNum(vt.length)} ticket</span></div>
          ${Charts.bars({labels:statuses.map(s=>t('s_'+s)), values:counts, color:'var(--blue)', rotate:true, h:300, attr:i=>`data-a="goStatus" data-s="${statuses[i]}"`})}</div>
        <div><div class="lbl" style="margin-bottom:10px">${t('by_service_type')}</div>${Charts.donut({items:byType, sub:'ticket'})}</div>
      </div>
    </div>
    
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      ${calendarCard(u)}
      ${recentCard(u)}
    </div>
  </div>`;
}

function calendarCard(u){
  const c=S.ui.cal||(S.ui.cal={y:new Date().getFullYear(), m:new Date().getMonth(), sel:toISODate(Date.now())});
  const first=new Date(c.y,c.m,1), startDow=first.getDay(), days=new Date(c.y,c.m+1,0).getDate();
  const vt=visibleTickets(u); const byDay={};
  vt.forEach(x=>{ const k=toISODate(x.createdAt); byDay[k]=(byDay[k]||0)+1; });
  const today=toISODate(Date.now());
  const dows=S.lang==='vi'?['CN','T2','T3','T4','T5','T6','T7']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let cells='';
  for(let i=0;i<42;i++){
    const d=new Date(c.y,c.m,1-startDow+i); const k=toISODate(d.getTime()); const out=d.getMonth()!==c.m;
    const n=byDay[k]||0; const dots=Math.min(3,Math.ceil(n/3));
    cells+=`<button class="${out?'out':''} ${k===today?'today':''} ${k===c.sel?'sel':''}" data-a="calSel" data-d="${k}" aria-label="${k}: ${n}">${d.getDate()}${n&&!out?`<span class="dots">${'<i></i>'.repeat(dots)}</span>`:''}</button>`;
    if(i>=34 && d.getMonth()!==c.m && i%7===6) break;
  }
  const selList=vt.filter(x=>toISODate(x.createdAt)===c.sel).slice(0,6);
  const mname=new Date(c.y,c.m,1).toLocaleDateString(S.lang==='vi'?'vi-VN':'en-US',{month:'long',year:'numeric'});
  return `<div class="card"><div class="card-h"><h3>${t('work_calendar')}</h3></div><div class="card-b">
    <div class="cal-h"><button class="icon-btn" data-a="calNav" data-d="-1" aria-label="prev">${ic('left',16)}</button><b style="text-transform:capitalize">${esc(mname)}</b><button class="icon-btn" data-a="calNav" data-d="1" aria-label="next">${ic('right',16)}</button></div>
    <div class="cal">${dows.map(d=>`<div class="dow">${d}</div>`).join('')}${cells}</div>
    <div class="lbl" style="margin:12px 0 4px">${t('tickets_on',{d:fmtD(new Date(c.sel).getTime())})} <span class="muted">(${(byDay[c.sel]||0)})</span></div>
    <div class="mini-list">${selList.length?selList.map(x=>`<button class="mini-item" data-a="openTicket" data-id="${x.id}"><span class="t"><div><span class="mono">${x.no}</span></div><small>${esc(x.title)}</small></span>${statusPill(x.status)}</button>`).join(''):`<div class="muted" style="padding:8px 0;font-size:13px">${t('no_tickets_day')}</div>`}</div>
  </div></div>`;
}
function recentCard(u){
  const ev=[]; visibleTickets(u).slice(0,120).forEach(x=>x.history.forEach(h=>ev.push({x,h})));
  ev.sort((a,b)=>b.h.at-a.h.at);
  return `<div class="card"><div class="card-h"><h3>${t('recent_activity')}</h3></div><div class="card-b" style="padding-top:6px;padding-bottom:6px"><div class="mini-list">
  ${ev.slice(0,7).map(({x,h})=>`<button class="mini-item" data-a="openTicket" data-id="${x.id}"><span class="avatar" style="width:28px;height:28px;font-size:11px">${esc(initials(uname(h.by)))}</span><span class="t"><div><b style="font-weight:500">${esc(uname(h.by))}</b> ${esc(t('h_'+h.action))} <span class="mono">${x.no}</span></div><small>${ago(h.at)}</small></span></button>`).join('')}
  </div></div></div>`;
}
A.kpiGo = el => { const k=homeKpis(me())[+el.dataset.i]; if(typeof k.go==='string') openTab(k.go); else { S.ui.tl=Object.assign(defaultTL(),k.go); openTab('tickets'); } };
A.homePeriod = el => { S.ui.home.period=el.dataset.v; rerender(); };
A.goStatus = el => { S.ui.tl=Object.assign(defaultTL(),{status:el.dataset.s, dist:(S.ui.home&&S.ui.home.dist)||''}); openTab('tickets'); };
A.calNav = el => { const c=S.ui.cal; c.m+=+el.dataset.d; if(c.m<0){c.m=11;c.y--} if(c.m>11){c.m=0;c.y++} rerender(); };
A.calSel = el => { S.ui.cal.sel=el.dataset.d; const d=new Date(el.dataset.d); if(d.getMonth()!==S.ui.cal.m){ S.ui.cal.m=d.getMonth(); S.ui.cal.y=d.getFullYear(); } rerender(); };

const SP_STATUS_COLORS={ new:'var(--accent)', in_progress:'var(--blue)', resolved:'var(--ok)', converted:'var(--teal)' };
function supportStatsCard(u,h){
  const now=Date.now();
  let arr=visibleSupport(u);
  if(h.dist) arr=arr.filter(s=>s.distributorId===h.dist);
  if(h.period!=='all') arr=arr.filter(s=>s.createdAt>=now-Number(h.period)*D);
  const at=(s,a)=>{ const e=(s.history||[]).find(x=>x.action===a); return e?e.at:null; };
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  const resp=avg(arr.map(s=>at(s,'sp_claimed')).map((v,i)=>v?(v-arr[i].createdAt)/H:null).filter(v=>v!=null));
  const done=arr.filter(s=>s.status==='resolved'||s.status==='converted');
  const solve=avg(done.map(s=>{ const v=at(s,s.status==='resolved'?'sp_resolved':'sp_converted'); return v?(v-s.createdAt)/H:null; }).filter(v=>v!=null));
  const n=st=>arr.filter(s=>s.status===st).length;
  const conv=n('converted');
  const hrs=v=>v==null?'—':fmtNum(v,1)+' h';
  const stats=[
    [t('sp_total'),fmtNum(arr.length),''],
    [t('sp_s_new'),fmtNum(n('new')),'new'],
    [t('sp_s_in_progress'),fmtNum(n('in_progress')),'in_progress'],
    [t('sp_s_resolved'),fmtNum(n('resolved')),'resolved'],
    [t('sp_s_converted'),fmtNum(conv),'converted', arr.length?fmtNum(conv/arr.length*100,0)+'%':''],
    [t('sp_avg_response'),hrs(resp),null],
    [t('sp_avg_solve'),hrs(solve),null],
  ];
  const byType=SP_TYPES.map(k=>arr.filter(s=>s.type===k).length);
  const byStatus=['new','in_progress','resolved','converted'].map(k=>({label:t('sp_s_'+k), value:n(k), color:SP_STATUS_COLORS[k]||'var(--slate)'}));
  const dists=globalScope(u)&&!h.dist?DISTRIBUTORS.map(d=>({d,v:arr.filter(s=>s.distributorId===d.id).length})):null;
  return `<div class="card">
    <div class="card-h"><h3>${t('nav_support')}</h3><button class="btn sm ghost" data-a="nav" data-k="support">${t('view_all')} →</button></div>
    <div class="card-b">
      <div class="sp-stats">${stats.map(([l,v,st,d])=>`<button class="stat-mini" ${st!=null?`data-a="spGo" data-s="${st}"`:'disabled'}><span class="l">${esc(l)}</span><span class="v">${v}</span>${d?`<span class="d">${d}</span>`:''}</button>`).join('')}</div>
      <div class="chart-grid" style="margin-top:18px">
        <div><div class="lbl" style="margin-bottom:6px">${t('sp_by_type')}</div>${Charts.bars({labels:SP_TYPES.map(k=>t('sp_t_'+k)), values:byType, color:'var(--accent)', h:220})}</div>
        <div><div class="lbl" style="margin-bottom:10px">${t('sp_by_status')}</div>${Charts.donut({items:byStatus, sub:t('sp_unit')})}</div>
      </div>
      ${dists?`<div class="lbl" style="margin:18px 0 8px">${t('sp_by_dist')}</div><div class="table-wrap"><table class="tbl"><thead><tr><th>${t('distributor')}</th><th class="r">${t('sp_total')}</th><th class="r">${t('sp_s_new')}</th><th class="r">${t('sp_s_in_progress')}</th><th class="r">${t('sp_s_resolved')}</th><th class="r">${t('sp_s_converted')}</th></tr></thead><tbody>${dists.map(({d})=>{ const a=arr.filter(s=>s.distributorId===d.id); const c=k=>a.filter(s=>s.status===k).length; return `<tr><td>${esc(d.name)}</td><td class="r num">${a.length}</td><td class="r num">${c('new')}</td><td class="r num">${c('in_progress')}</td><td class="r num">${c('resolved')}</td><td class="r num">${c('converted')}</td></tr>`; }).join('')}</tbody></table></div>`:''}
    </div></div>`;
}
A.spGo = el => { S.ui.sp={st:el.dataset.s||'',q:'',page:1,size:10}; openTab('support'); };
