/* ===== ERP: contracts (service + sales), customers, inventory, purchases, expenses, cost per inverter ===== */
const money = v => fmtNum(Math.round(Number(v)||0))+' ₫';
const moneyS = v => { const n=Math.round(Number(v)||0); const a=Math.abs(n); if(a>=1e9) return fmtNum(n/1e9,2)+' tỷ'; if(a>=1e6) return fmtNum(n/1e6,1)+' tr'; return fmtNum(n)+' ₫'; };
const custById = id => DB.customers.find(c=>c.id===id);
const custName = id => (custById(id)||{}).company||'—';
const supById = id => (DB.suppliers||[]).find(s=>s.id===id);
const stockBy = pn => (DB.stock||[]).find(s=>s.pn===pn);
const svcById = id => (DB.svc||[]).find(x=>x.id===id);
const soById = id => (DB.orders||[]).find(x=>x.id===id);
const poById = id => (DB.purchases||[]).find(x=>x.id===id);
const kpill = (cls,txt) => `<span class="pill k${cls}">${esc(txt)}</span>`;
const SVC_CLS={quote:0,sent:5,signed:1,in_progress:2,done:3,cancelled:4}, SO_CLS={draft:0,confirmed:1,delivered:6,done:3,cancelled:4}, PO_CLS={draft:0,ordered:1,received:3,cancelled:4};
const PAY_CLS={unpaid:4,partial:2,paid:3,na:0}, EX_CLS={pending:2,approved:1,paid:3,rejected:4}, MV_CLS={in:3,out:1,adjust:5};
const svcPill = s => kpill(SVC_CLS[s],t('sv_'+s)); const soPill = s => kpill(SO_CLS[s],t('so_'+s)); const poPill = s => kpill(PO_CLS[s],t('po_'+s));
const payPill = (d,out) => { const s=payState(d); return kpill(PAY_CLS[s], t((out&&s!=='na'?'payo_':'pay_')+s)); };
const exPill = s => kpill(EX_CLS[s],t('ex_'+s));
const monthStartTs = () => { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1).getTime(); };
function erpNo(p){ const d=new Date(); const m=String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,'0'); DB.erpSeq=DB.erpSeq||{}; const k=p+m; DB.erpSeq[k]=(DB.erpSeq[k]||0)+1; return `${p}${m}-${String(DB.erpSeq[k]).padStart(3,'0')}`; }
function logMove(type,pn,qty,ref,note){ DB.moves.unshift({ id:'m'+Date.now()+Math.random().toString(36).slice(2,5), no:erpNo(type==='in'?'NK':type==='out'?'XK':'DC'), type, pn, qty, at:Date.now(), ref:ref||null, by:S.userId, note:note||'' }); }
const dueAt = so => (so.deliveredAt||so.at) + (so.dueDays||30)*D;
const isOverdue = so => ['delivered','confirmed'].includes(so.status) && docDue(so)>0 && Date.now()>dueAt(so);
function visibleSvc(u=me()){ return (DB.svc||[]).filter(x=>inScope(x.customerId,u) && (!isExternal(u) || x.status!=='quote')); }
function visibleSo(u=me()){ return (DB.orders||[]).filter(x=>inScope(x.customerId,u) && (!isExternal(u) || x.status!=='draft')); }
function refLink(ref){ if(!ref) return '—'; if(ref.kind==='po'){ const p=poById(ref.id); return p?`<button class="link-btn mono" data-a="nav" data-k="po:${p.id}">${p.no}</button>`:'—'; }
  if(ref.kind==='so'){ const p=soById(ref.id); return p?`<button class="link-btn mono" data-a="nav" data-k="so:${p.id}">${p.no}</button>`:'—'; }
  if(ref.kind==='svc'){ const p=svcById(ref.id); return p?`<button class="link-btn mono" data-a="nav" data-k="sc:${p.id}">${p.no}</button>`:'—'; }
  if(ref.kind==='ticket'){ const x=ticketById(ref.id); return x?`<button class="link-btn mono" data-a="openTicket" data-id="${x.id}">${x.no}</button>`:'—'; } return '—'; }

/* ---------- routing ---------- */
function erpTabTitle(k){
  if(k==='contracts') return t('nav_contracts'); if(k==='customers') return t('nav_customers'); if(k==='stock') return t('nav_stock'); if(k==='expenses') return t('nav_expenses');
  if(k.startsWith('sc:')){ const sc=svcById(k.slice(3)); return sc?((ticketById(sc.ticketId)||{}).no||sc.no):'?'; } if(k.startsWith('so:')) return (soById(k.slice(3))||{}).no||'?';
  if(k.startsWith('po:')) return (poById(k.slice(3))||{}).no||'?'; if(k.startsWith('cu:')){ const c=custById(k.slice(3)); return c?c.company.replace(/^Công ty /,''):'?'; }
  return null;
}
function erpView(k){
  if(k==='contracts') return viewContracts(); if(k==='customers') return viewCustomers(); if(k==='stock') return viewStock(); if(k==='expenses') return viewExpenses();
  if(k.startsWith('sc:')){ const sc=svcById(k.slice(3)); return sc&&ticketById(sc.ticketId)? viewTicket(sc.ticketId) : viewSvc(k.slice(3)); } if(k.startsWith('so:')) return viewSo(k.slice(3)); if(k.startsWith('po:')) return viewPo(k.slice(3)); if(k.startsWith('cu:')) return viewCustomer(k.slice(3));
  return null;
}

/* ---------- shared bits ---------- */
const stat = (l,v,d,col) => `<div class="card stat"><div class="l">${l}</div><div class="v" ${col?`style="color:${col}"`:''}>${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
const statRow = (cells,n) => `<div class="stat-row" style="grid-template-columns:repeat(${n||cells.length},minmax(0,1fr))">${cells.join('')}</div>`;
function searchBox(id,bind,val,ph){ return `<div class="search-inline">${ic('search',16)}<input class="input" id="${id}" data-bind="${bind}" data-live="erpSearch" value="${esc(val||'')}" placeholder="${esc(ph||t('search')+'…')}" aria-label="${t('search')}"></div>`; }
A.erpSearch = el => { const ns=el.dataset.bind.split('.')[0]; if(S.ui[ns]) S.ui[ns].page=1; rerender(); };
function steps(list,cur,labelKey,dates){ const ci=list.indexOf(cur); const bad=cur==='cancelled';
  return `<div class="stepper">${list.map((s,i)=>{ const done=ci>i||(ci===list.length-1&&i===ci); const isCur=ci===i&&!(ci===list.length-1);
    return `<div class="step ${done?'done':''} ${isCur?(bad?'cur bad':'cur'):''}"><span class="c">${done?ic('check',12):i+1}</span><span>${t(labelKey+s)}</span>${dates&&dates[s]?`<small class="muted num">${fmtD(dates[s])}</small>`:''}</div>`; }).join('')}</div>`; }
function tableHtml(cols,rows,rowAttr){ if(!rows.length) return `<div class="empty">${t('no_results')}</div>`;
  return `<div class="table-wrap"><table class="tbl cards"><thead><tr>${cols.map(c=>`<th class="${c.r?'r':''}">${c.h}</th>`).join('')}</tr></thead><tbody>${rows.map(x=>`<tr ${rowAttr?rowAttr(x):''}>${cols.map(c=>`<td data-l="${esc(c.h)}" class="${c.r?'r num':''} ${c.nw?'nowrap':''}">${c.v(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
function paged(arr,f,ns){ const rows=arr.slice((f.page-1)*f.size,f.page*f.size); return { rows, pager: arr.length>f.size||f.page>1 ? pager(arr.length,f,ns) : '' }; }
function totalsBox(d,out){ const disc=docDiscount(d);
  return `<div class="totals">
    <div><span>${t('subtotal')}</span><b class="num">${money(docSubtotal(d))}</b></div>
    ${disc?`<div><span>${t('discount')} (${d.discount}%)</span><b class="num">− ${money(disc)}</b></div>`:''}
    <div><span>${t('vat')} (${d.vat||0}%)</span><b class="num">${money(docVat(d))}</b></div>
    <div class="big"><span>${t('grand_total')}</span><b class="num">${money(docTotal(d))}</b></div>
    <div><span>${out?t('paid_out'):t('paid_amt')}</span><b class="num" style="color:var(--ok)">${money(docPaid(d))}</b></div>
    <div><span>${t('remaining')}</span><b class="num" style="color:${docDue(d)>0?'var(--bad)':'var(--ink)'}">${money(docDue(d))}</b></div></div>`; }
function payList(d){ const ps=d.payments||[]; if(!ps.length) return `<div class="muted">${t('no_payments')}</div>`;
  return `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('doc_date')}</th><th>${t('pay_method')}</th><th>${t('note_l')}</th><th>${t('created_by_l')}</th><th class="r">${t('amount')}</th></tr></thead><tbody>${ps.map(p=>`<tr><td class="num nowrap">${fmtD(p.at)}</td><td>${t('pm_'+(p.method||'bank'))}</td><td>${esc(L(p.note)||'—')}</td><td>${esc(uname(p.by))}</td><td class="r num">${money(p.amount)}</td></tr>`).join('')}</tbody></table></div>`; }

/* ---------- editable line items (kept in S.ui.ed_<id> until saved) ---------- */
function edState(kind,d){ const k='ed_'+d.id; if(!S.ui[k]) S.ui[k]={ kind, items:d.items.map(i=>({...i})), vat:d.vat, discount:d.discount||0 }; return S.ui[k]; }
function itemsEditor(kind,d){
  const st=edState(kind,d); const id=d.id; const priceKey=kind==='po'?'cost':'price';
  const pool = kind==='svc'? DB.stock.filter(s=>!['inverter','battery'].includes(s.cat)) : kind==='so'? DB.stock : DB.stock.filter(s=>!d.supplierId||s.supplierId===d.supplierId||true);
  const opt = pn => `<option value="">—</option>${pool.map(s=>`<option value="${s.pn}" ${s.pn===pn?'selected':''}>${esc(s.pn+' · '+s.name)}</option>`).join('')}`;
  const draftDoc=Object.assign({},d,{items:st.items,vat:st.vat,discount:st.discount});
  return `<div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl items-edit"><thead><tr>${kind==='svc'?`<th style="width:140px">${t('line_type')}</th>`:''}<th style="min-width:220px">${kind==='svc'?t('description'):t('item_name')}</th><th style="width:90px" class="r">${t('qty_l')}</th><th style="width:150px" class="r">${t('unit_price')}</th><th class="r" style="width:140px">${t('amount')}</th><th style="width:40px"></th></tr></thead><tbody>
    ${st.items.map((it,i)=>`<tr>
      ${kind==='svc'?`<td><select class="select" data-bind="ed_${id}.items.${i}.type" data-re aria-label="${t('line_type')}">${['part','labor','other'].map(x=>`<option value="${x}" ${it.type===x?'selected':''}>${t('it_'+x)}</option>`).join('')}</select></td>`:''}
      <td>${(kind!=='svc'||it.type==='part')?`<select class="select" data-bind="ed_${id}.items.${i}.pn" data-re="edPn" data-id="${id}" data-i="${i}" aria-label="${t('item_name')}">${opt(it.pn)}</select>`:`<input class="input" data-bind="ed_${id}.items.${i}.desc" value="${esc(L(it.desc))}" aria-label="${t('description')}">`}</td>
      <td><input class="input num r" type="number" min="1" data-num data-bind="ed_${id}.items.${i}.qty" data-re value="${it.qty}" aria-label="${t('qty_l')}"></td>
      <td><input class="input num r" type="number" min="0" step="1000" data-num data-bind="ed_${id}.items.${i}.${priceKey}" data-re value="${it[priceKey]||0}" aria-label="${t('unit_price')}"></td>
      <td class="r num">${money(lineTotal(it))}</td>
      <td><button class="btn sm ghost" style="color:var(--bad)" data-a="edDel" data-id="${id}" data-i="${i}" aria-label="${t('delete')}">${ic('trash',14)}</button></td></tr>`).join('')}
    <tr><td colspan="${kind==='svc'?6:5}"><div class="row">${kind==='svc'?`<button class="btn sm soft" data-a="edAdd" data-id="${id}" data-t="part">${ic('plus',14)} ${t('add_line_part')}</button><button class="btn sm soft" data-a="edAdd" data-id="${id}" data-t="labor">${ic('plus',14)} ${t('add_line_service')}</button>`:`<button class="btn sm soft" data-a="edAdd" data-id="${id}" data-t="${kind==='so'?'goods':'part'}">${ic('plus',14)} ${kind==='so'?t('add_line_goods'):t('add_line_part')}</button>`}
      <span class="grow"></span><label class="row" style="gap:6px;font-size:13px">${kind==='so'?`${t('discount')} <input class="input num r" style="width:70px;height:32px" type="number" min="0" max="50" data-num data-bind="ed_${id}.discount" data-re value="${st.discount||0}"> %`:''} ${t('vat')} <select class="select" style="width:80px;height:32px" data-bind="ed_${id}.vat" data-num data-re>${[0,5,8,10].map(v=>`<option value="${v}" ${Number(st.vat)===v?'selected':''}>${v}%</option>`).join('')}</select></label>
      <button class="btn sm primary" data-a="edSave" data-id="${id}">${t('save_items')}</button></div></td></tr></tbody></table></div>
    <div style="margin-top:12px">${totalsBox(draftDoc,kind==='po')}</div>`;
}
const docOf = id => svcById(id)||soById(id)||poById(id);
A.edPn = el => { const st=S.ui['ed_'+el.dataset.id]; const it=st.items[+el.dataset.i]; const s=stockBy(it.pn); if(s){ it.desc=s.name; it.name=s.name; if(st.kind==='po') it.cost=s.cost; else it.price=s.price; } rerender(); };
A.edAdd = el => { const st=S.ui['ed_'+el.dataset.id]; const ty=el.dataset.t;
  if(st.kind==='svc') st.items.push(ty==='part'?{type:'part',pn:'',desc:'',qty:1,price:0}:{type:'labor',desc:t('it_labor'),qty:1,price:500000});
  else if(st.kind==='so') st.items.push({pn:'',name:'',qty:1,price:0}); else st.items.push({pn:'',qty:1,cost:0}); rerender(); };
A.edDel = el => { const st=S.ui['ed_'+el.dataset.id]; st.items.splice(+el.dataset.i,1); rerender(); };
function edCommit(id){ const st=S.ui['ed_'+id]; const d=docOf(id); if(!st||!d) return true;
  if(st.items.some(i=>!(Number(i.qty)>0))){ toast(t('e_qty'),'bad'); return false; }
  d.items=st.items.filter(i=>(i.pn||i.type!=='part')).map(i=>{ const o={...i}; o.qty=Number(o.qty)||1; if('price' in o) o.price=Number(o.price)||0; if('cost' in o) o.cost=Number(o.cost)||0; if(o.desc&&typeof o.desc==='object') o.desc=L(o.desc); return o; });
  d.vat=Number(st.vat)||0; d.discount=Number(st.discount)||0; delete S.ui['ed_'+id]; return true; }
A.edSave = el => { if(edCommit(el.dataset.id)){ save(); rerender(); toast(t('items_saved'),'ok'); } };

/* ---------- payments modal ---------- */
A.payAsk = el => { const d=docOf(el.dataset.id); openModal({type:'pay', id:d.id, f:{ amount:docDue(d), date:toISODate(Date.now()), method:'bank', note:'' }, err:{} }); };
MODALS.pay = m => { const d=docOf(m.id); const f=m.f, E=m.err||{}; const out=!!poById(d.id);
  return { title:`${t('record_payment')} · ${d.no}`, body:`<div class="form-grid">
    <div class="field"><label class="req" for="pm-a">${t('amount')} (₫)</label><input class="input num ${E.amount?'err':''}" id="pm-a" type="number" min="0" step="1000" data-num data-bind="modal.f.amount" value="${f.amount}">${E.amount?`<div class="err-text">${E.amount}</div>`:`<div class="hint">${t('remaining')}: ${money(docDue(d))}</div>`}</div>
    <div class="field"><label for="pm-d">${t('doc_date')}</label><input class="input" type="date" id="pm-d" data-bind="modal.f.date" value="${f.date}"></div>
    <div class="field"><label for="pm-m">${t('pay_method')}</label><select class="select" id="pm-m" data-bind="modal.f.method">${PAY_METHODS.map(x=>`<option value="${x}" ${f.method===x?'selected':''}>${t('pm_'+x)}</option>`).join('')}</select></div>
    <div class="field"><label for="pm-n">${t('note_l')}</label><input class="input" id="pm-n" data-bind="modal.f.note" value="${esc(f.note)}"></div></div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="paySave">${out?t('paid_out'):t('record_payment')}</button>` }; };
A.paySave = () => { const m=S.ui.modal, d=docOf(m.id); const a=Math.round(Number(m.f.amount)||0);
  if(!(a>0)){ m.err={amount:t('e_amount')}; rerender(); return; } if(a>docDue(d)){ m.err={amount:t('e_over')}; rerender(); return; }
  d.payments=d.payments||[]; d.payments.push({ at:m.f.date?new Date(m.f.date+'T12:00:00').getTime():Date.now(), amount:a, method:m.f.method, by:S.userId, note:m.f.note });
  if(d.status==='delivered' && soById(d.id) && docDue(d)<=0) d.status='done';
  if(d.customerId) notify({toCustomer:d.customerId,key:'n_paid',vars:{no:d.no,a:money(a)}});
  S.ui.modal=null; save(); rerender(); toast(t('toast_paid',{a:money(a)}),'ok'); };
DICT.vi.n_paid='{no}: đã ghi nhận thanh toán {a}'; DICT.en.n_paid='{no}: payment of {a} recorded';
DICT.vi.n_quote='Báo giá {no} đã được gửi, vui lòng xem và xác nhận'; DICT.en.n_quote='Quote {no} has been sent for your review';
DICT.vi.n_accepted='{no}: khách hàng đã chấp nhận báo giá'; DICT.en.n_accepted='{no}: customer accepted the quote';

/* ---------- confirm modal ---------- */
A.erpCancelAsk = el => openModal({type:'erpCancel', id:el.dataset.id});
MODALS.erpCancel = m => { const d=docOf(m.id); return { title:t('act_cancel')+' · '+d.no, body:`<p style="margin:0">${t('confirm_cancel',{no:d.no})}</p>`, foot:`<button class="btn" data-a="closeModal">${t('close')}</button><button class="btn danger" data-a="erpCancel" data-id="${d.id}">${t('act_cancel')}</button>` }; };
A.erpCancel = el => { const d=docOf(el.dataset.id); d.status='cancelled'; S.ui.modal=null; save(); rerender(); toast(t('toast_status',{s:t((svcById(d.id)?'sv_':soById(d.id)?'so_':'po_')+'cancelled')}),'ok'); };

/* ================= CONTRACTS ================= */
function viewContracts(){
  const u=me(); const canSvc=can('svc_view')||can('ticket_view'), canSo=can('so_view');
  const f=S.ui.ctr||(S.ui.ctr={tab:canSvc?'svc':'so',q:'',st:'',page:1,size:10});
  if(f.tab==='svc'&&!canSvc) f.tab='so'; if(f.tab==='so'&&!canSo) f.tab='svc';
  const list = f.tab==='svc'? visibleSvc(u) : visibleSo(u);
  let arr=list.slice().sort((a,b)=>b.at-a.at);
  if(f.tab==='svc'){ arr=visibleTickets(u).filter(x=>x.status!=='draft'||x.createdBy===u.id).map(x=>{ const sc=x.svcId&&svcById(x.svcId); return { job:x, c:sc&&(!isExternal(u)||sc.status!=='quote')?sc:null, at:x.createdAt }; }).sort((a,b)=>b.at-a.at);
    if(f.st) arr=arr.filter(r=>f.st==='none'?!r.c:r.c&&r.c.status===f.st);
    if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(r=>(r.job.no+' '+r.job.title+' '+(r.c?r.c.no:'')+' '+(r.job.customer.company||'')+' '+r.job.products.map(p=>p.sn+' '+p.model).join(' ')).toLowerCase().includes(q)); } }
  else if(f.st) arr=arr.filter(x=>x.status===f.st);
  if(f.tab==='so'&&f.q){ const q=f.q.toLowerCase(); arr=arr.filter(x=>(x.no+' '+custName(x.customerId)+' '+(x.sn||'')+' '+(x.model||'')+' '+(ticketById(x.ticketId)||{}).no+' '+(x.items||[]).map(i=>i.pn+' '+(i.name||'')).join(' ')).toLowerCase().includes(q)); }
  const live=list.filter(x=>x.status!=='cancelled');
  const tot=live.reduce((s,x)=>s+docTotal(x),0), paid=live.reduce((s,x)=>s+docPaid(x),0);
  const openN=list.filter(x=>!['done','cancelled'].includes(x.status)).length;
  const {rows,pager:pg}=paged(arr,f,'ctr');
  const statuses = f.tab==='svc'? ['none',...SVC_STEPS,'cancelled'] : [...SO_STEPS,'cancelled'];
  const cols = f.tab==='svc'? [
    {h:t('job_no'),v:r=>`<span class="mono" style="color:var(--blue)">${r.job.no}</span><br><small class="muted">${esc(r.job.title)}</small>`},
    {h:t('contract_no'),v:r=>r.c?`<span class="mono">${r.c.no}</span>`:'<span class="muted">—</span>',nw:1},
    {h:t('serial_model'),v:r=>`<span class="mono">${esc(r.job.products[0].sn)}</span><br><small class="muted">${esc(r.job.products[0].model||'')}</small>`},
    {h:t('doc_date'),v:r=>`<span class="num">${fmtD(r.job.createdAt)}</span>`,nw:1},
    {h:t('repair_status'),v:r=>statusPill(r.job.status)},
    {h:t('contract_status'),v:r=>r.c?svcPill(r.c.status):'<span class="muted">—</span>'},
    {h:t('value'),v:r=>r.c?money(docTotal(r.c)):'—',r:1},{h:t('payment'),v:r=>r.c?payPill(r.c):'—'},
  ] : f.tab==='svcOld'? [
    {h:t('contract_no'),v:x=>`<span class="mono" style="color:var(--blue)">${x.no}</span>`,nw:1},
    {h:t('customer'),v:x=>esc(custName(x.customerId))},
    {h:'Ticket',v:x=>{ const tk=ticketById(x.ticketId); return tk?`<span class="mono">${tk.no}</span>`:'—'; },nw:1},
    {h:t('serial_model'),v:x=>`<span class="mono">${esc(x.sn)}</span><br><small class="muted">${esc(x.model||'')}</small>`},
    {h:t('doc_date'),v:x=>`<span class="num">${fmtD(x.at)}</span>`,nw:1},
    {h:t('value'),v:x=>money(docTotal(x)),r:1},{h:t('paid_amt'),v:x=>money(docPaid(x)),r:1},
    {h:t('status'),v:x=>svcPill(x.status)+(x.warranty?` <span class="chip">${t('warranty_job')}</span>`:'')},{h:t('payment'),v:x=>payPill(x)},
  ] : [
    {h:t('contract_no'),v:x=>`<span class="mono" style="color:var(--blue)">${x.no}</span>`,nw:1},
    {h:t('customer'),v:x=>esc(custName(x.customerId))},
    {h:t('goods'),v:x=>`${esc((x.items[0]||{}).name||(x.items[0]||{}).pn||'—')}${x.items.length>1?` <small class="muted">+${x.items.length-1}</small>`:''}`},
    {h:t('doc_date'),v:x=>`<span class="num">${fmtD(x.at)}</span>`,nw:1},
    {h:t('value'),v:x=>money(docTotal(x)),r:1},{h:t('paid_amt'),v:x=>money(docPaid(x)),r:1},
    {h:t('due_date'),v:x=>['delivered','confirmed'].includes(x.status)&&docDue(x)>0?`<span class="num" style="${isOverdue(x)?'color:var(--bad);font-weight:600':''}">${fmtD(dueAt(x))}</span>`:'—',nw:1},
    {h:t('status'),v:x=>soPill(x.status)},{h:t('payment'),v:x=>payPill(x)},
  ];
  return `<div class="page-head"><div><h1>${t('nav_contracts')}</h1>${u.role==='agent'?`<div class="sub">${t('agent_scope',{n:(u.customerIds||[]).length})}</div>`:''}</div>
    <div class="row">${f.tab==='svc'&&can('ticket_create')?`<button class="btn primary" data-a="nav" data-k="new">${ic('plus',15)} ${isExternal(u)?t('new_request'):t('new_job')}</button>`:''}${f.tab==='so'&&can('so_manage')?`<button class="btn primary" data-a="soNewAsk">${ic('plus',15)} ${t('new_sale')}</button>`:''}</div></div>
  ${statRow([stat(t('n_contracts'),fmtNum(list.length),t('open_contracts')+': '+fmtNum(openN)),stat(t('total_value'),moneyS(tot)),stat(t('paid_amt'),moneyS(paid),'',`var(--ok)`),stat(t('receivable'),moneyS(tot-paid),'',tot-paid>0?'var(--bad)':'')],4)}
  <div class="card"><div class="dtabs">${canSvc?`<button class="${f.tab==='svc'?'on':''}" data-a="ctrTab" data-k="svc">${t('tab_svc')}<span class="cnt">${visibleTickets(u).filter(x=>x.status!=='draft'||x.createdBy===u.id).length}</span></button>`:''}${canSo?`<button class="${f.tab==='so'?'on':''}" data-a="ctrTab" data-k="so">${t('tab_so')}<span class="cnt">${visibleSo(u).length}</span></button>`:''}</div>
  <div class="toolbar"><div class="row grow">${searchBox('ctr-q','ctr.q',f.q)}<select class="select" style="width:190px" data-bind="ctr.st" data-re="resetPage" aria-label="${t('status')}"><option value="">${t('all_status')}</option>${statuses.map(s=>`<option value="${s}" ${f.st===s?'selected':''}>${s==='none'?t('no_contract'):t((f.tab==='svc'?'sv_':'so_')+s)}</option>`).join('')}</select></div>
    ${can('export')?`<button class="btn sm" data-a="ctrExport">${ic('download',15)} ${t('export')}</button>`:''}</div>
  ${tableHtml(cols,rows,x=>f.tab==='svc'?`class="clickable" data-a="openTicket" data-id="${x.job.id}"`:`class="clickable" data-a="nav" data-k="${f.tab==='svc'?'sc':'so'}:${x.id}"`)}${pg}</div>`;
}
A.ctrTab = el => { S.ui.ctr={tab:el.dataset.k,q:'',st:'',page:1,size:10}; rerender(); };
A.ctrExport = () => { const f=S.ui.ctr; const svc=f.tab==='svc'; const list=svc?visibleSvc():visibleSo();
  const rows=[[t('contract_no'),t('customer'),svc?'Ticket':t('goods'),svc?'Serial':'',t('doc_date'),t('value'),t('paid_amt'),t('remaining'),t('status')]];
  list.forEach(x=>rows.push([x.no,custName(x.customerId),svc?(ticketById(x.ticketId)||{}).no||'':x.items.map(i=>i.pn+' x'+i.qty).join(' | '),svc?x.sn:'',toISODate(x.at),docTotal(x),docPaid(x),docDue(x),t((svc?'sv_':'so_')+x.status)]));
  download(`hop_dong_${f.tab}_${toISODate(Date.now())}.csv`,csv(rows)); };

/* ---- new service quote ---- */
A.svcNewAsk = (el) => { const pre=el&&el.dataset&&el.dataset.tid; openModal({type:'svcNew', tid:pre||''}); };
MODALS.svcNew = m => { const elig=DB.tickets.filter(x=>!x.svcId && !['closed','rejected','cancelled','draft'].includes(x.status)).sort((a,b)=>b.createdAt-a.createdAt);
  return { title:t('new_quote'), body: elig.length?`<div class="field"><label class="req" for="sn-t">${t('create_quote_for')}</label><select class="select" id="sn-t" data-bind="modal.tid"><option value="">${t('choose_ticket')}</option>${elig.map(x=>`<option value="${x.id}" ${m.tid===x.id?'selected':''}>${x.no} · ${esc(x.customer.company||'')} · ${esc(x.products[0].sn)} (${t('s_'+x.status)})</option>`).join('')}</select><div class="hint">${t('warranty_job')} → ${t('pay_na')}; OW/PR → ${t('paid_job')}</div></div>`:`<p class="muted" style="margin:0">${t('no_eligible_ticket')}</p>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button>${elig.length?`<button class="btn primary" data-a="svcCreate">${t('new_quote')}</button>`:''}` }; };
A.svcCreate = () => { const m=S.ui.modal; const x=ticketById(m.tid); if(!x){ toast(t('choose_ticket'),'bad'); return; } createSvcFor(x); };
function createSvcFor(x){
  if(x.svcId){ toast(t('ticket_has_quote'),'bad'); return; }
  const paid = x.type==='OW'||x.type==='PR'||!(devBySn(x.products[0].sn)&&warrantyState(devBySn(x.products[0].sn),x.createdAt).inW);
  const parts=(x.parts&&x.parts.length?x.parts:(x.diagnosis&&x.diagnosis.estParts)||[]);
  const items=parts.map(p=>{ const s=stockBy(p.pn); return { type:'part', pn:p.pn, desc:s?s.name:partName(p.pn), qty:p.qty||1, price:paid&&s?s.price:0 }; });
  items.push({ type:'labor', desc:L(t0('Công kiểm tra, sửa chữa biến tần','Inspection & repair labour')), qty:1, price:paid?2000000:0 });
  const c={ id:'sc'+Date.now().toString(36), no:erpNo('DV'), ticketId:x.id, customerId:x.customerId, sn:x.products[0].sn, model:x.products[0].model, at:Date.now(), items, vat:VAT_DEFAULT, status:'quote', warranty:!paid, validDays:15, signedAt:null, doneAt:null, payments:[], createdBy:S.userId, note:'', repairWarrantyMonths:6 };
  DB.svc.unshift(c); x.svcId=c.id; S.ui.modal=null; save(); toast(t('toast_created',{no:c.no}),'ok'); openTicket(x.id);
}
A.svcForTicket = el => { const x=ticketById(el.dataset.id); if(x) createSvcFor(x); };

/* ---- service contract detail ---- */
function viewSvc(id){
  const c=svcById(id); const u=me();
  if(!c||!inScope(c.customerId,u)||(isExternal(u)&&c.status==='quote')) return `<div class="card empty">${t('no_access')}</div>`;
  const x=ticketById(c.ticketId); const cu=custById(c.customerId); const mg=can('svc_manage'); const editable=mg&&c.status==='quote';
  const acts=[];
  if(mg){
    if(c.status==='quote') acts.push(`<button class="btn primary" data-a="svcGo" data-id="${c.id}" data-s="sent">${ic('send',15)} ${t('act_send_quote')}</button>`);
    if(c.status==='sent') acts.push(`<button class="btn primary" data-a="svcGo" data-id="${c.id}" data-s="signed">${ic('check',15)} ${t('act_mark_signed')}</button>`);
    if(c.status==='signed') acts.push(`<button class="btn primary" data-a="svcGo" data-id="${c.id}" data-s="in_progress">${ic('play',14)} ${t('act_start')}</button>`);
    if(c.status==='in_progress') acts.push(`<button class="btn okb" data-a="svcGo" data-id="${c.id}" data-s="done">${ic('check',15)} ${t('act_finish')}</button>`);
  }
  if(isExternal(u)&&c.status==='sent'&&can('svc_view')) acts.push(`<button class="btn primary" data-a="svcGo" data-id="${c.id}" data-s="signed">${ic('check',15)} ${t('act_accept_quote')}</button>`);
  if(can('pay_record')&&docDue(c)>0&&['signed','in_progress','done'].includes(c.status)) acts.push(`<button class="btn" data-a="payAsk" data-id="${c.id}">${t('record_payment')}</button>`);
  if(mg&&!['done','cancelled'].includes(c.status)) acts.push(`<span class="grow"></span><button class="btn danger" data-a="erpCancelAsk" data-id="${c.id}">${t('act_cancel')}</button>`);
  const cost=can('cost_view')?svcCost(c):null;
  return `<div class="detail">
    <aside class="card detail-side">
      <div><div class="muted" style="font-size:12px">${t('svc_contract')}</div><div class="no mono">${c.no}</div></div>
      <div class="row">${svcPill(c.status)} ${payPill(c)}</div>
      ${kv(t('customer'), cu?(can('crm_view')?`<button class="link-btn" data-a="nav" data-k="cu:${cu.id}">${esc(cu.company)}</button>`:esc(cu.company)):'—', true)}
      ${kv(t('linked_ticket'), x?`<button class="link-btn mono" data-a="openTicket" data-id="${x.id}">${x.no}</button> ${statusPill(x.status)}`:'—', true)}
      ${kv(t('serial_model'), `<span class="mono">${esc(c.sn)}</span> · ${esc(c.model||'')}`, true)}
      ${kv(t('service_type'), c.warranty?t('warranty_job'):t('paid_job'))}
      ${kv(t('doc_date'), fmtD(c.at))}${kv(t('valid_days'), t('days_n',{n:c.validDays||15}))}
      ${c.signedAt?kv(t('signed_at'),fmtD(c.signedAt)):''}${c.doneAt?kv(t('done_at'),fmtD(c.doneAt)):''}
      ${kv(t('repair_warranty'), t('months_n',{n:c.repairWarrantyMonths||6}))}
      ${kv(t('created_by_l'), uname(c.createdBy))}
    </aside>
    <div class="detail-main">
      <div class="card detail-head"><div class="row" style="justify-content:space-between"><h2>${t('svc_contract')} <span class="mono" style="font-weight:500">${c.no}</span></h2><div class="pill" style="background:var(--accent-soft);color:var(--accent-ink)">${money(docTotal(c))}</div></div>
        ${c.status==='cancelled'?`<div class="quote" style="border-color:var(--bad)"><b>${t('sv_cancelled')}</b></div>`:steps(SVC_STEPS,c.status,'sv_',{quote:c.at,signed:c.signedAt,done:c.doneAt})}
        ${acts.length?`<div class="row">${acts.join('')}</div>`:''}</div>
      <section class="card"><div class="card-h"><h3>${t('lines_n',{n:c.items.length})}</h3>${editable?'':`<span class="hint">${mg?'':t('view_only')}</span>`}</div><div class="card-b">${editable?itemsEditor('svc',c):svcItemsTable(c)}</div></section>
      <section class="card"><div class="card-h"><h3>${t('payments')}</h3></div><div class="card-b">${payList(c)}</div></section>
      ${cost?costCard(cost):''}
    </div></div>`;
}
function svcItemsTable(c){ return `${c.items.length?`<div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>${t('line_type')}</th><th>${t('description')}</th><th class="r">${t('qty_l')}</th><th class="r">${t('unit_price')}</th><th class="r">${t('amount')}</th></tr></thead><tbody>${c.items.map((it,i)=>`<tr><td>${i+1}</td><td>${t('it_'+it.type)}</td><td>${it.pn?`<span class="mono">${esc(it.pn)}</span> · `:''}${esc(L(it.desc))}</td><td class="r num">${it.qty}</td><td class="r num">${money(it.price)}</td><td class="r num">${money(lineTotal(it))}</td></tr>`).join('')}</tbody></table></div>`:`<div class="muted">${t('items_empty')}</div>`}<div style="margin-top:12px">${totalsBox(c)}</div>`; }
function svcCost(c){ const parts=c.items.filter(i=>i.type==='part').reduce((s,i)=>s+(Number(i.qty)||0)*((stockBy(i.pn)||{}).cost||0),0);
  const ex=(DB.expenses||[]).filter(e=>e.ticketId===c.ticketId&&e.status!=='rejected').reduce((s,e)=>s+e.amount,0);
  return { parts, other:ex, total:parts+ex, revenue:docTotal(c)-docVat(c) }; }
function costCard(k){ const mgn=k.revenue-k.total; return `<section class="card"><div class="card-h"><h3>${t('cost_margin')}</h3><span class="hint">${t('revenue')} = ${t('subtotal')} − ${t('discount')}</span></div><div class="card-b">${statRow([stat(t('parts_cost'),moneyS(k.parts)),stat(t('other_cost'),moneyS(k.other)),stat(t('revenue'),moneyS(k.revenue)),stat(t('margin'),moneyS(mgn),'',mgn>=0?'var(--ok)':'var(--bad)')],4)}</div></section>`; }
A.svcGo = el => { const c=svcById(el.dataset.id); const s=el.dataset.s; if(S.ui['ed_'+c.id] && !edCommit(c.id)) return;
  if(s==='sent') notify({toCustomer:c.customerId,key:'n_quote',vars:{no:c.no}});
  if(s==='signed'){ c.signedAt=Date.now(); if(isExternal(me())) notify({toRole:'manager',key:'n_accepted',vars:{no:c.no}}); }
  if(s==='in_progress'){ c.items.filter(i=>i.type==='part'&&i.pn).forEach(i=>{ const st=stockBy(i.pn); if(st){ st.qty=Math.max(0,st.qty-i.qty); logMove('out',i.pn,i.qty,{kind:'svc',id:c.id},(ticketById(c.ticketId)||{}).no||''); } }); }
  if(s==='done') c.doneAt=Date.now();
  c.status=s; save(); rerender(); toast(t('toast_status',{s:t('sv_'+s)}),'ok'); };

/* ---- sales contract ---- */
A.soNewAsk = () => openModal({type:'soNew', cid:''});
MODALS.soNew = m => ({ title:t('new_sale'), body:`<div class="field"><label class="req" for="so-c">${t('customer')}</label><select class="select" id="so-c" data-bind="modal.cid"><option value="">${t('choose_customer')}</option>${DB.customers.map(c=>`<option value="${c.id}" ${m.cid===c.id?'selected':''}>${esc(c.company)}</option>`).join('')}</select></div>`,
  foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="soCreate">${t('new_sale')}</button>` });
A.soCreate = () => { const m=S.ui.modal; if(!custById(m.cid)){ toast(t('choose_customer'),'bad'); return; }
  const so={ id:'so'+Date.now().toString(36), no:erpNo('MB'), customerId:m.cid, at:Date.now(), items:[], vat:VAT_DEFAULT, discount:0, status:'draft', payments:[], dueDays:30, deliveredAt:null, note:'', createdBy:S.userId, warrantyYears:5 };
  DB.orders.unshift(so); S.ui.modal=null; save(); toast(t('toast_created',{no:so.no}),'ok'); openTab('so:'+so.id); };
function viewSo(id){
  const d=soById(id); const u=me();
  if(!d||!inScope(d.customerId,u)||(isExternal(u)&&d.status==='draft')) return `<div class="card empty">${t('no_access')}</div>`;
  const cu=custById(d.customerId); const mg=can('so_manage'); const editable=mg&&d.status==='draft'; const acts=[];
  if(mg){ if(d.status==='draft') acts.push(`<button class="btn primary" data-a="soGo" data-id="${d.id}" data-s="confirmed">${ic('check',15)} ${t('act_confirm_so')}</button>`);
    if(d.status==='confirmed'&&(can('stock_move')||mg)) acts.push(`<button class="btn primary" data-a="soGo" data-id="${d.id}" data-s="delivered">${ic('truck',15)} ${t('act_deliver')}</button>`);
    if(d.status==='delivered'&&docDue(d)<=0) acts.push(`<button class="btn okb" data-a="soGo" data-id="${d.id}" data-s="done">${ic('check',15)} ${t('act_close_so')}</button>`); }
  if(can('pay_record')&&docDue(d)>0&&['confirmed','delivered'].includes(d.status)) acts.push(`<button class="btn" data-a="payAsk" data-id="${d.id}">${t('record_payment')}</button>`);
  if(mg&&['draft','confirmed'].includes(d.status)) acts.push(`<span class="grow"></span><button class="btn danger" data-a="erpCancelAsk" data-id="${d.id}">${t('act_cancel')}</button>`);
  const short=d.items.filter(i=>{ const s=stockBy(i.pn); return !s||s.qty<i.qty; });
  const margin = can('cost_view')? (()=>{ const cost=d.items.reduce((s,i)=>s+i.qty*((stockBy(i.pn)||{}).cost||0),0); const rev=docSubtotal(d)-docDiscount(d); return costCard({parts:cost,other:0,total:cost,revenue:rev}); })() : '';
  return `<div class="detail">
    <aside class="card detail-side">
      <div><div class="muted" style="font-size:12px">${t('so_contract')}</div><div class="no mono">${d.no}</div></div>
      <div class="row">${soPill(d.status)} ${payPill(d)} ${isOverdue(d)?kpill(4,t('overdue')):''}</div>
      ${kv(t('customer'), cu?(can('crm_view')?`<button class="link-btn" data-a="nav" data-k="cu:${cu.id}">${esc(cu.company)}</button>`:esc(cu.company)):'—', true)}
      ${kv(t('doc_date'), fmtD(d.at))}${d.deliveredAt?kv(t('delivery_date'),fmtD(d.deliveredAt)):''}
      ${kv(t('due_date'), fmtD(dueAt(d))+` <small class="muted">(${t('days_n',{n:d.dueDays||30})})</small>`, true)}
      ${kv(t('warranty_years'), String(d.warrantyYears||5))}${kv(t('created_by_l'), uname(d.createdBy))}
    </aside>
    <div class="detail-main">
      <div class="card detail-head"><div class="row" style="justify-content:space-between"><h2>${t('so_contract')} <span class="mono" style="font-weight:500">${d.no}</span></h2><div class="pill" style="background:var(--accent-soft);color:var(--accent-ink)">${money(docTotal(d))}</div></div>
        ${d.status==='cancelled'?`<div class="quote" style="border-color:var(--bad)"><b>${t('so_cancelled')}</b></div>`:steps(SO_STEPS,d.status,'so_',{draft:d.at,delivered:d.deliveredAt})}
        ${d.status==='confirmed'&&short.length&&mg?`<div class="quote" style="border-color:var(--warn)">${t('insufficient_stock',{p:short.map(i=>i.pn).join(', ')})}</div>`:''}
        ${acts.length?`<div class="row">${acts.join('')}</div>`:''}</div>
      <section class="card"><div class="card-h"><h3>${t('goods')}</h3></div><div class="card-b">${editable?itemsEditor('so',d):goodsTable(d,false)}</div></section>
      <section class="card"><div class="card-h"><h3>${t('payments')}</h3></div><div class="card-b">${payList(d)}</div></section>
      ${margin}
    </div></div>`;
}
function goodsTable(d,po){ const pk=po?'cost':'price'; return `${d.items.length?`<div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>${t('item_code')}</th><th>${t('item_name')}</th><th class="r">${t('qty_l')}</th><th class="r">${t('unit_price')}</th><th class="r">${t('amount')}</th>${!isExternal(me())?`<th class="r">${t('on_hand')}</th>`:''}</tr></thead><tbody>${d.items.map((it,i)=>{ const s=stockBy(it.pn)||{}; return `<tr><td>${i+1}</td><td class="mono">${esc(it.pn)}</td><td>${esc(it.name||s.name||'')}</td><td class="r num">${it.qty}</td><td class="r num">${money(it[pk])}</td><td class="r num">${money(lineTotal(it))}</td>${!isExternal(me())?`<td class="r num" style="${(s.qty||0)<it.qty&&!po?'color:var(--bad)':''}">${fmtNum(s.qty||0)}</td>`:''}</tr>`; }).join('')}</tbody></table></div>`:`<div class="muted">${t('items_empty')}</div>`}<div style="margin-top:12px">${totalsBox(d,po)}</div>`; }
A.soGo = el => { const d=soById(el.dataset.id); const s=el.dataset.s; if(S.ui['ed_'+d.id] && !edCommit(d.id)) return;
  if(s==='confirmed'&&!d.items.length){ toast(t('items_empty'),'bad'); return; }
  if(s==='delivered'){ const short=d.items.filter(i=>{ const st=stockBy(i.pn); return !st||st.qty<i.qty; }); if(short.length){ toast(t('insufficient_stock',{p:short.map(i=>i.pn).join(', ')}),'bad'); return; }
    d.items.forEach(i=>{ stockBy(i.pn).qty-=i.qty; logMove('out',i.pn,i.qty,{kind:'so',id:d.id},''); }); d.deliveredAt=Date.now(); }
  d.status=s; save(); rerender(); toast(s==='delivered'?t('stock_out_done'):t('toast_status',{s:t('so_'+s)}),'ok'); };

/* ================= CUSTOMERS ================= */
function custStats(c){ const sv=(DB.svc||[]).filter(x=>x.customerId===c.id&&x.status!=='cancelled'), so=(DB.orders||[]).filter(x=>x.customerId===c.id&&x.status!=='cancelled');
  const docs=[...sv,...so]; return { devices:DB.devices.filter(d=>d.customerId===c.id).length, tickets:DB.tickets.filter(x=>x.customerId===c.id).length, contracts:docs.length, value:docs.reduce((s,x)=>s+docTotal(x),0), due:docs.reduce((s,x)=>s+docDue(x),0), sv, so }; }
function viewCustomers(){
  const f=S.ui.cu||(S.ui.cu={q:'',ag:'',page:1,size:10});
  let arr=DB.customers.slice();
  if(f.ag) arr=arr.filter(c=>c.distributorId===f.ag);
  if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(c=>(c.company+' '+c.contact+' '+c.phone+' '+c.email+' '+c.province+' '+(c.taxCode||'')).toLowerCase().includes(q)); }
  const all=DB.customers.map(custStats); const totDue=all.reduce((s,x)=>s+x.due,0), totVal=all.reduce((s,x)=>s+x.value,0);
  const {rows,pager:pg}=paged(arr,f,'cu');
  const cols=[{h:t('company'),v:c=>`<b style="font-weight:600">${esc(c.company)}</b><br><small class="muted">${esc(c.province||'')}</small>`},{h:t('contact'),v:c=>`${esc(c.contact||'—')}<br><small class="muted">${esc(c.phone||'')}</small>`},
    {h:t('distributor'),v:c=>esc((distById(c.distributorId)||{}).short||'—')},{h:t('n_devices'),v:c=>fmtNum(custStats(c).devices),r:1},{h:t('n_tickets'),v:c=>fmtNum(custStats(c).tickets),r:1},
    {h:t('total_value'),v:c=>money(custStats(c).value),r:1},{h:t('receivable'),v:c=>{ const d=custStats(c).due; return `<span style="${d>0?'color:var(--bad)':''}">${money(d)}</span>`; },r:1}];
  return `<div class="page-head"><div><h1>${t('nav_customers')}</h1></div><div class="row">${can('crm_edit')?`<button class="btn primary" data-a="cuNew">${ic('plus',15)} ${t('add_customer')}</button>`:''}</div></div>
  ${statRow([stat(t('nav_customers'),fmtNum(DB.customers.length)),stat(t('n_devices'),fmtNum(DB.devices.length)),stat(t('total_value'),moneyS(totVal)),stat(t('receivable_total'),moneyS(totDue),'',totDue>0?'var(--bad)':'')],4)}
  <div class="card"><div class="toolbar"><div class="row grow">${searchBox('cu-q','cu.q',f.q)}<select class="select" style="width:200px" data-bind="cu.ag" data-re="resetPage" aria-label="${t('distributor')}"><option value="">${t('all_distributors')}</option>${DISTRIBUTORS.map(d=>`<option value="${d.id}" ${f.ag===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div>
  ${can('export')?`<button class="btn sm" data-a="cuExport">${ic('download',15)} ${t('export')}</button>`:''}</div>
  ${tableHtml(cols,rows,c=>`class="clickable" data-a="nav" data-k="cu:${c.id}"`)}${pg}</div>`;
}
A.cuExport = () => { const rows=[[t('company'),t('contact'),t('phone'),t('email'),t('province'),t('address'),t('tax_code'),t('distributor'),t('total_value'),t('receivable')]];
  DB.customers.forEach(c=>{ const s=custStats(c); rows.push([c.company,c.contact,c.phone,c.email,c.province,c.address,c.taxCode||'',(distById(c.distributorId)||{}).short||'',s.value,s.due]); }); download(`khach_hang_${toISODate(Date.now())}.csv`,csv(rows)); };
function viewCustomer(id){
  const c=custById(id); if(!c) return `<div class="card empty">${t('no_access')}</div>`;
  const s=custStats(c); const f=S.ui['cud_'+id]||(S.ui['cud_'+id]={tab:'tickets'});
  const devs=DB.devices.filter(d=>d.customerId===c.id), tks=DB.tickets.filter(x=>x.customerId===c.id).sort((a,b)=>b.createdAt-a.createdAt);
  const pays=[...s.sv,...s.so].flatMap(d=>(d.payments||[]).map(p=>({...p,doc:d}))).sort((a,b)=>b.at-a.at);
  const tabs=[['tickets',t('cu_tickets'),tks.length],['svc',t('cu_svc'),s.sv.length],['so',t('cu_so'),s.so.length],['devices',t('cu_devices'),devs.length],['pay',t('cu_pay'),pays.length]];
  let body='';
  if(f.tab==='tickets') body=tableHtml([{h:t('ticket_no'),v:x=>`<span class="mono" style="color:var(--blue)">${x.no}</span>`,nw:1},{h:t('ticket_title'),v:x=>esc(x.title)},{h:'Serial',v:x=>`<span class="mono">${esc(x.products[0].sn)}</span>`},{h:t('doc_date'),v:x=>fmtD(x.createdAt),nw:1},{h:t('status'),v:x=>statusPill(x.status)}],tks,x=>`class="clickable" data-a="openTicket" data-id="${x.id}"`);
  if(f.tab==='svc') body=tableHtml([{h:t('contract_no'),v:x=>`<span class="mono" style="color:var(--blue)">${x.no}</span>`},{h:'Serial',v:x=>`<span class="mono">${esc(x.sn)}</span>`},{h:t('doc_date'),v:x=>fmtD(x.at)},{h:t('value'),v:x=>money(docTotal(x)),r:1},{h:t('remaining'),v:x=>money(docDue(x)),r:1},{h:t('status'),v:x=>svcPill(x.status)}],s.sv,x=>`class="clickable" data-a="nav" data-k="sc:${x.id}"`);
  if(f.tab==='so') body=tableHtml([{h:t('contract_no'),v:x=>`<span class="mono" style="color:var(--blue)">${x.no}</span>`},{h:t('goods'),v:x=>esc(x.items.map(i=>i.pn+' ×'+i.qty).join(', '))},{h:t('doc_date'),v:x=>fmtD(x.at)},{h:t('value'),v:x=>money(docTotal(x)),r:1},{h:t('remaining'),v:x=>money(docDue(x)),r:1},{h:t('status'),v:x=>soPill(x.status)}],s.so,x=>`class="clickable" data-a="nav" data-k="so:${x.id}"`);
  if(f.tab==='devices') body=tableHtml([{h:t('serial_no'),v:d=>`<span class="mono">${d.sn}</span>`},{h:t('product_model'),v:d=>esc(d.model)},{h:t('project_name'),v:d=>esc(d.project||'')},{h:t('warranty_end'),v:d=>fmtD(warrantyEnd(d))},{h:t('warranty_status'),v:d=>wPill(d)},{h:t('total_cost'),v:d=>can('cost_view')?money(snCost(d.sn).total):'—',r:1}],devs, d=>can('cost_view')?`class="clickable" data-a="snDetail" data-sn="${d.sn}"`:'');
  if(f.tab==='pay') body=tableHtml([{h:t('doc_date'),v:p=>fmtD(p.at)},{h:t('contract_no'),v:p=>`<span class="mono">${p.doc.no}</span>`},{h:t('pay_method'),v:p=>t('pm_'+(p.method||'bank'))},{h:t('note_l'),v:p=>esc(L(p.note)||'—')},{h:t('amount'),v:p=>money(p.amount),r:1}],pays);
  return `<div class="detail">
    <aside class="card detail-side">
      <div><div class="muted" style="font-size:12px">${t('customer')}</div><div class="no" style="font-size:17px">${esc(c.company)}</div></div>
      ${kv(t('contact'),c.contact||'—')}${kv(t('phone'),c.phone||'—')}${kv(t('email'),c.email||'—')}${kv(t('province'),c.province||'—')}${kv(t('address'),c.address||'—')}${kv(t('tax_code'),c.taxCode||'—')}
      ${kv(t('distributor'),(distById(c.distributorId)||{}).name||'—')}
      ${can('crm_edit')?`<button class="btn sm" data-a="cuEdit" data-id="${c.id}">${ic('edit',14)} ${t('edit_customer')}</button>`:''}
    </aside>
    <div class="detail-main">
      ${statRow([stat(t('n_devices'),fmtNum(s.devices)),stat(t('n_tickets'),fmtNum(s.tickets)),stat(t('n_contracts'),fmtNum(s.contracts)),stat(t('total_value'),moneyS(s.value)),stat(t('receivable'),moneyS(s.due),'',s.due>0?'var(--bad)':'')],5)}
      <div class="card"><div class="dtabs">${tabs.map(([k,l,n])=>`<button class="${f.tab===k?'on':''}" data-a="cudTab" data-id="${c.id}" data-k="${k}">${l}<span class="cnt">${n}</span></button>`).join('')}</div>${body}</div>
    </div></div>`;
}
A.cudTab = el => { S.ui['cud_'+el.dataset.id].tab=el.dataset.k; rerender(); };
const CU_FIELDS=[['company','company',1,1],['contact','contact'],['phone','phone'],['email','email'],['province','province'],['taxCode','tax_code'],['address','address',0,1]];
A.cuNew = () => openModal({type:'cuForm', f:{company:'',contact:'',phone:'',email:'',province:'',taxCode:'',address:'',distributorId:DISTRIBUTORS[0].id}, err:{}});
A.cuEdit = el => { const c=custById(el.dataset.id); openModal({type:'cuForm', id:c.id, f:{company:c.company,contact:c.contact||'',phone:c.phone||'',email:c.email||'',province:c.province||'',taxCode:c.taxCode||'',address:c.address||'',distributorId:c.distributorId||''}, err:{}}); };
MODALS.cuForm = m => ({ wide:true, title:m.id?t('edit_customer'):t('add_customer'), body:`<div class="form-grid">${CU_FIELDS.map(([k,l,req,full])=>`<div class="field ${full?'full':''}"><label class="${req?'req':''}" for="cuf-${k}">${t(l)}</label>${k==='province'?`<select class="select" id="cuf-${k}" data-bind="modal.f.${k}"><option value="">—</option>${PROVINCES.map(p=>`<option ${m.f[k]===p?'selected':''}>${p}</option>`).join('')}</select>`:`<input class="input ${m.err[k]?'err':''}" id="cuf-${k}" data-bind="modal.f.${k}" value="${esc(m.f[k])}">`}${m.err[k]?`<div class="err-text">${m.err[k]}</div>`:''}</div>`).join('')}
  <div class="field full"><label for="cuf-d">${t('distributor')}</label><select class="select" id="cuf-d" data-bind="modal.f.distributorId"><option value="">—</option>${DISTRIBUTORS.map(d=>`<option value="${d.id}" ${m.f.distributorId===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div></div>`,
  foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="cuSave">${t('save')}</button>` });
A.cuSave = () => { const m=S.ui.modal, f=m.f; if(!String(f.company||'').trim()){ m.err={company:t('e_required')}; rerender(); return; }
  if(m.id){ Object.assign(custById(m.id),f); } else { const c=Object.assign({id:'c'+Date.now().toString(36)},f); DB.customers.push(c); }
  S.ui.modal=null; save(); rerender(); toast(t('toast_saved'),'ok'); };

/* ================= INVENTORY ================= */
function viewStock(){
  const f=S.ui.stk||(S.ui.stk={tab:'items',q:'',cat:'',low:false,page:1,size:10});
  const items=DB.stock; const low=items.filter(s=>s.qty<s.min), out=items.filter(s=>s.qty<=0); const val=items.reduce((s,x)=>s+x.qty*x.cost,0);
  const tabs=[['items',t('st_items'),items.length],['moves',t('st_moves'),DB.moves.length],['po',t('st_po'),DB.purchases.length],['sup',t('st_sup'),DB.suppliers.length]];
  let body='', tools='';
  if(f.tab==='items'){
    let arr=items.slice(); if(f.cat) arr=arr.filter(s=>s.cat===f.cat); if(f.low) arr=arr.filter(s=>s.qty<s.min);
    if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(s=>(s.pn+' '+s.name+' '+s.loc).toLowerCase().includes(q)); }
    const {rows,pager:pg}=paged(arr,f,'stk');
    tools=`<div class="row grow">${searchBox('stk-q','stk.q',f.q)}<select class="select" style="width:170px" data-bind="stk.cat" data-re="resetPage" aria-label="${t('group')}"><option value="">${t('all_groups')}</option>${STOCK_CATS.map(c=>`<option value="${c}" ${f.cat===c?'selected':''}>${t('sc_'+c)}</option>`).join('')}</select><label class="row" style="gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" data-bind="stk.low" data-re="resetPage" ${f.low?'checked':''}> ${t('only_low')}</label></div>
      <div class="row">${can('stock_move')?`<button class="btn sm" data-a="mvAsk" data-t="in">${ic('download',15)} ${t('stock_in')}</button><button class="btn sm" data-a="mvAsk" data-t="out">${ic('upload',15)} ${t('stock_out')}</button>`:''}${can('stock_edit')?`<button class="btn sm primary" data-a="itNew">${ic('plus',15)} ${t('add_item')}</button>`:''}${can('export')?`<button class="btn sm" data-a="stkExport">${ic('download',15)} CSV</button>`:''}</div>`;
    body=tableHtml([{h:t('item_code'),v:s=>`<span class="mono">${esc(s.pn)}</span>`,nw:1},{h:t('item_name'),v:s=>`${esc(s.name)}<br><small class="muted">${t('sc_'+s.cat)} · ${esc(s.loc||'')}</small>`},
      {h:t('on_hand'),v:s=>`<b style="font-weight:600;${s.qty<=0?'color:var(--bad)':s.qty<s.min?'color:var(--warn)':''}">${fmtNum(s.qty)}</b> <small class="muted">${esc(s.unit)}</small>`,r:1},{h:t('min_qty'),v:s=>fmtNum(s.min),r:1},
      {h:t('cost_price'),v:s=>money(s.cost),r:1},{h:t('sale_price'),v:s=>money(s.price),r:1},{h:t('stock_value'),v:s=>money(s.qty*s.cost),r:1},
      {h:t('status'),v:s=>s.qty<=0?kpill(4,t('out_of_stock')):s.qty<s.min?kpill(2,t('low_stock')):kpill(3,'OK')},
      ...(can('stock_move')||can('stock_edit')?[{h:'',v:s=>`<span class="nowrap">${can('stock_move')?`<button class="btn sm ghost" data-a="mvAsk" data-t="in" data-pn="${esc(s.pn)}" title="${t('stock_in')}">+</button><button class="btn sm ghost" data-a="mvAsk" data-t="out" data-pn="${esc(s.pn)}" title="${t('stock_out')}">−</button>`:''}${can('stock_edit')?`<button class="btn sm ghost" data-a="itEdit" data-pn="${esc(s.pn)}" aria-label="${t('edit')}">${ic('edit',14)}</button>`:''}</span>`}]:[])],rows)+pg;
  }
  if(f.tab==='moves'){
    let arr=DB.moves.slice(); if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(m=>(m.no+' '+m.pn+' '+((stockBy(m.pn)||{}).name||'')+' '+(m.note||'')).toLowerCase().includes(q)); }
    const {rows,pager:pg}=paged(arr,f,'stk');
    tools=`<div class="row grow">${searchBox('stk-q','stk.q',f.q)}</div>${can('stock_move')?`<div class="row"><button class="btn sm" data-a="mvAsk" data-t="in">${ic('download',15)} ${t('stock_in')}</button><button class="btn sm" data-a="mvAsk" data-t="out">${ic('upload',15)} ${t('stock_out')}</button></div>`:''}`;
    body=tableHtml([{h:t('move_no'),v:m=>`<span class="mono">${m.no}</span>`,nw:1},{h:t('doc_date'),v:m=>fmtDT(m.at),nw:1},{h:t('line_type'),v:m=>kpill(MV_CLS[m.type],t('mv_'+m.type))},
      {h:t('item_name'),v:m=>`<span class="mono">${esc(m.pn)}</span><br><small class="muted">${esc((stockBy(m.pn)||{}).name||'')}</small>`},{h:t('qty_l'),v:m=>`<b style="font-weight:600;color:${m.type==='in'?'var(--ok)':m.type==='out'?'var(--blue)':'var(--violet)'}">${m.type==='out'?'−':m.type==='in'?'+':'±'}${fmtNum(Math.abs(m.qty))}</b>`,r:1},
      {h:t('reference'),v:m=>refLink(m.ref)},{h:t('created_by_l'),v:m=>esc(uname(m.by))},{h:t('note_l'),v:m=>esc(m.note||'—')}],rows)+pg;
  }
  if(f.tab==='po'){
    let arr=DB.purchases.slice().sort((a,b)=>b.at-a.at); if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(p=>(p.no+' '+(supById(p.supplierId)||{}).name+' '+p.items.map(i=>i.pn).join(' ')).toLowerCase().includes(q)); }
    const {rows,pager:pg}=paged(arr,f,'stk');
    tools=`<div class="row grow">${searchBox('stk-q','stk.q',f.q)}</div>${can('po_manage')?`<button class="btn sm primary" data-a="poNewAsk">${ic('plus',15)} ${t('new_po')}</button>`:''}`;
    body=tableHtml([{h:t('move_no'),v:p=>`<span class="mono" style="color:var(--blue)">${p.no}</span>`,nw:1},{h:t('supplier'),v:p=>esc((supById(p.supplierId)||{}).name||'—')},{h:t('goods'),v:p=>t('items_n',{n:p.items.length})},
      {h:t('doc_date'),v:p=>fmtD(p.at),nw:1},{h:t('expected_at'),v:p=>p.status==='ordered'?fmtD(p.expectedAt):p.receivedAt?fmtD(p.receivedAt):'—',nw:1},{h:t('value'),v:p=>money(docTotal(p)),r:1},{h:t('status'),v:p=>poPill(p.status)},{h:t('payment'),v:p=>payPill(p,true)}],rows,p=>`class="clickable" data-a="nav" data-k="po:${p.id}"`)+pg;
  }
  if(f.tab==='sup'){
    tools=`<div class="row grow"></div>${can('stock_edit')?`<button class="btn sm primary" data-a="supNew">${ic('plus',15)} ${t('add_supplier')}</button>`:''}`;
    body=tableHtml([{h:t('supplier'),v:s=>`<b style="font-weight:600">${esc(s.name)}</b><br><small class="muted">${esc(s.address||'')}</small>`},{h:t('contact'),v:s=>`${esc(s.contact||'')}<br><small class="muted">${esc(s.phone||'')} · ${esc(s.email||'')}</small>`},
      {h:t('pay_terms'),v:s=>fmtNum(s.terms||0),r:1},{h:t('st_po'),v:s=>fmtNum(DB.purchases.filter(p=>p.supplierId===s.id).length),r:1},{h:t('remaining'),v:s=>money(DB.purchases.filter(p=>p.supplierId===s.id&&p.status==='received').reduce((a,p)=>a+docDue(p),0)),r:1},
      ...(can('stock_edit')?[{h:'',v:s=>`<button class="btn sm ghost" data-a="supEdit" data-id="${s.id}">${ic('edit',14)} ${t('edit')}</button>`}]:[])],DB.suppliers);
  }
  return `<div class="page-head"><div><h1>${t('nav_stock')}</h1></div></div>
  ${statRow([stat(t('n_items'),fmtNum(items.length)),stat(t('stock_value'),moneyS(val)),stat(t('low_stock'),fmtNum(low.length),'',low.length?'var(--warn)':''),stat(t('out_of_stock'),fmtNum(out.length),'',out.length?'var(--bad)':''),stat(t('po_open'),fmtNum(DB.purchases.filter(p=>p.status==='ordered').length))],5)}
  <div class="card"><div class="dtabs">${tabs.map(([k,l,n])=>`<button class="${f.tab===k?'on':''}" data-a="stkTab" data-k="${k}">${l}<span class="cnt">${n}</span></button>`).join('')}</div>
  <div class="toolbar">${tools}</div>${body}</div>`;
}
A.stkTab = el => { S.ui.stk={tab:el.dataset.k,q:'',cat:'',low:false,page:1,size:10}; rerender(); };
A.stkExport = () => { const rows=[['pn','name','group','unit','qty','min','cost','price','location']]; DB.stock.forEach(s=>rows.push([s.pn,s.name,t('sc_'+s.cat),s.unit,s.qty,s.min,s.cost,s.price,s.loc])); download(`ton_kho_${toISODate(Date.now())}.csv`,csv(rows)); };
A.mvAsk = el => openModal({type:'mv', f:{ type:el.dataset.t, pn:el.dataset.pn||'', qty:1, note:'' }, err:{}});
MODALS.mv = m => { const f=m.f, E=m.err||{}; const s=stockBy(f.pn);
  return { title:f.type==='in'?t('stock_in'):t('stock_out'), body:`<div class="form-grid">
    <div class="field full"><label class="req" for="mv-p">${t('item_name')}</label><select class="select ${E.pn?'err':''}" id="mv-p" data-bind="modal.f.pn" data-re><option value="">—</option>${DB.stock.map(x=>`<option value="${x.pn}" ${f.pn===x.pn?'selected':''}>${esc(x.pn+' · '+x.name)} (${fmtNum(x.qty)})</option>`).join('')}</select>${s?`<div class="hint">${t('on_hand')}: ${fmtNum(s.qty)} ${esc(s.unit)} · ${t('location')}: ${esc(s.loc||'—')}</div>`:''}</div>
    <div class="field"><label class="req" for="mv-q">${t('qty_l')}</label><input class="input num ${E.qty?'err':''}" id="mv-q" type="number" min="1" data-num data-bind="modal.f.qty" value="${f.qty}">${E.qty?`<div class="err-text">${E.qty}</div>`:''}</div>
    <div class="field"><label for="mv-n">${t('note_l')}</label><input class="input" id="mv-n" data-bind="modal.f.note" value="${esc(f.note)}"></div></div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="mvSave">${t('save')}</button>` }; };
A.mvSave = () => { const m=S.ui.modal, f=m.f; const s=stockBy(f.pn); const q=Math.round(Number(f.qty)||0); const E={};
  if(!s) E.pn=t('e_required'); if(!(q>0)) E.qty=t('e_qty'); else if(f.type==='out'&&s&&q>s.qty) E.qty=t('insufficient_stock',{p:s.pn});
  m.err=E; if(Object.keys(E).length){ rerender(); return; }
  s.qty+= f.type==='in'?q:-q; logMove(f.type,s.pn,q,null,f.note); S.ui.modal=null; save(); rerender(); toast(t('toast_saved'),'ok'); };
const IT_FIELDS=[['pn','item_code','text',1],['name','item_name','text',1],['cat','group','cat'],['unit','unit','text'],['qty','on_hand','number'],['min','min_qty','number'],['cost','cost_price','number'],['price','sale_price','number'],['loc','location','text'],['supplierId','supplier','sup']];
A.itNew = () => openModal({type:'itForm', f:{pn:'',name:'',cat:'board',unit:'pcs',qty:0,min:2,cost:0,price:0,loc:'',supplierId:'sp1'}, err:{}});
A.itEdit = el => { const s=stockBy(el.dataset.pn); openModal({type:'itForm', key:s.pn, f:{...s}, err:{}}); };
MODALS.itForm = m => ({ wide:true, title:m.key?t('edit_item'):t('add_item'), body:`<div class="form-grid">${IT_FIELDS.map(([k,l,ty,req])=>`<div class="field ${k==='name'?'full':''}"><label class="${req?'req':''}" for="itf-${k}">${t(l)}</label>${ty==='cat'?`<select class="select" id="itf-${k}" data-bind="modal.f.${k}">${STOCK_CATS.map(c=>`<option value="${c}" ${m.f[k]===c?'selected':''}>${t('sc_'+c)}</option>`).join('')}</select>`:ty==='sup'?`<select class="select" id="itf-${k}" data-bind="modal.f.${k}">${DB.suppliers.map(s=>`<option value="${s.id}" ${m.f[k]===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`:`<input class="input ${ty==='number'?'num':''} ${k==='pn'?'mono':''} ${m.err[k]?'err':''}" id="itf-${k}" ${ty==='number'?'type="number" min="0" data-num':''} data-bind="modal.f.${k}" value="${esc(m.f[k])}" ${k==='pn'&&m.key?'readonly':''}>`}${m.err[k]?`<div class="err-text">${m.err[k]}</div>`:''}</div>`).join('')}</div>${m.key?`<div class="hint">${t('key_readonly')}</div>`:''}`,
  foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="itSave">${t('save')}</button>` });
A.itSave = () => { const m=S.ui.modal, f=m.f, E={}; f.pn=String(f.pn||'').trim().toUpperCase(); f.name=String(f.name||'').trim();
  if(!f.pn) E.pn=t('e_required'); else if(!m.key&&stockBy(f.pn)) E.pn=t('e_key_exists'); if(!f.name) E.name=t('e_required');
  m.err=E; if(Object.keys(E).length){ rerender(); return; }
  ['qty','min','cost','price'].forEach(k=>f[k]=Number(f[k])||0);
  if(m.key){ const s=stockBy(m.key); const dq=f.qty-s.qty; Object.assign(s,f,{pn:m.key}); if(dq) logMove('adjust',s.pn,dq,null,t('edit_item')); } else DB.stock.push({...f});
  S.ui.modal=null; save(); rerender(); toast(t('toast_saved'),'ok'); };
const SUP_FIELDS=[['name','supplier',1,1],['short','short_name'],['contact','contact'],['phone','phone'],['email','email'],['terms','pay_terms'],['address','address',0,1]];
A.supNew = () => openModal({type:'supForm', f:{name:'',short:'',contact:'',phone:'',email:'',terms:30,address:''}, err:{}});
A.supEdit = el => { const s=supById(el.dataset.id); openModal({type:'supForm', id:s.id, f:{...s}, err:{}}); };
MODALS.supForm = m => ({ wide:true, title:m.id?t('edit_supplier'):t('add_supplier'), body:`<div class="form-grid">${SUP_FIELDS.map(([k,l,req,full])=>`<div class="field ${full?'full':''}"><label class="${req?'req':''}" for="spf-${k}">${t(l)}</label><input class="input ${m.err[k]?'err':''}" id="spf-${k}" ${k==='terms'?'type="number" min="0" data-num':''} data-bind="modal.f.${k}" value="${esc(m.f[k])}">${m.err[k]?`<div class="err-text">${m.err[k]}</div>`:''}</div>`).join('')}</div>`,
  foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="supSave">${t('save')}</button>` });
A.supSave = () => { const m=S.ui.modal, f=m.f; if(!String(f.name||'').trim()){ m.err={name:t('e_required')}; rerender(); return; }
  if(m.id) Object.assign(supById(m.id),f); else DB.suppliers.push(Object.assign({id:'sp'+Date.now().toString(36)},f)); S.ui.modal=null; save(); rerender(); toast(t('toast_saved'),'ok'); };

/* ---- purchase orders ---- */
A.poNewAsk = () => openModal({type:'poNew', sid:''});
MODALS.poNew = m => ({ title:t('new_po'), body:`<div class="field"><label class="req" for="po-s">${t('supplier')}</label><select class="select" id="po-s" data-bind="modal.sid"><option value="">${t('choose_supplier')}</option>${DB.suppliers.map(s=>`<option value="${s.id}" ${m.sid===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>`,
  foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="poCreate">${t('new_po')}</button>` });
A.poCreate = () => { const m=S.ui.modal; const sp=supById(m.sid); if(!sp){ toast(t('choose_supplier'),'bad'); return; }
  const low=DB.stock.filter(s=>s.supplierId===sp.id&&s.qty<s.min).map(s=>({pn:s.pn,qty:Math.max(1,s.min*2-s.qty),cost:s.cost}));
  const po={ id:'po'+Date.now().toString(36), no:erpNo('PO'), supplierId:sp.id, at:Date.now(), items:low, vat:VAT_DEFAULT, status:'draft', note:'', payments:[], expectedAt:Date.now()+14*D, receivedAt:null, createdBy:S.userId };
  DB.purchases.unshift(po); S.ui.modal=null; save(); toast(t('toast_created',{no:po.no}),'ok'); openTab('po:'+po.id); };
function viewPo(id){
  const p=poById(id); if(!p) return `<div class="card empty">${t('no_access')}</div>`;
  const sp=supById(p.supplierId)||{}; const mg=can('po_manage'); const editable=mg&&p.status==='draft'; const acts=[];
  if(mg){ if(p.status==='draft') acts.push(`<button class="btn primary" data-a="poGo" data-id="${p.id}" data-s="ordered">${ic('send',15)} ${t('act_order_po')}</button>`);
    if(p.status==='ordered') acts.push(`<button class="btn primary" data-a="poGo" data-id="${p.id}" data-s="received">${ic('box',15)} ${t('act_receive')}</button>`); }
  if(can('pay_record')&&docDue(p)>0&&['ordered','received'].includes(p.status)) acts.push(`<button class="btn" data-a="payAsk" data-id="${p.id}">${t('record_payment')}</button>`);
  if(mg&&['draft','ordered'].includes(p.status)) acts.push(`<span class="grow"></span><button class="btn danger" data-a="erpCancelAsk" data-id="${p.id}">${t('act_cancel')}</button>`);
  return `<div class="detail">
    <aside class="card detail-side">
      <div><div class="muted" style="font-size:12px">${t('purchase_order')}</div><div class="no mono">${p.no}</div></div>
      <div class="row">${poPill(p.status)} ${payPill(p,true)}</div>
      ${kv(t('supplier'),sp.name||'—')}${kv(t('contact'),`${esc(sp.contact||'')}<br><small class="muted">${esc(sp.phone||'')}</small>`,true)}
      ${kv(t('doc_date'),fmtD(p.at))}${kv(t('expected_at'),fmtD(p.expectedAt))}${p.receivedAt?kv(t('received_at'),fmtD(p.receivedAt)):''}${kv(t('pay_terms'),t('days_n',{n:sp.terms||0}))}${kv(t('created_by_l'),uname(p.createdBy))}
    </aside>
    <div class="detail-main">
      <div class="card detail-head"><div class="row" style="justify-content:space-between"><h2>${t('purchase_order')} <span class="mono" style="font-weight:500">${p.no}</span></h2><div class="pill" style="background:var(--accent-soft);color:var(--accent-ink)">${money(docTotal(p))}</div></div>
        ${p.status==='cancelled'?`<div class="quote" style="border-color:var(--bad)"><b>${t('po_cancelled')}</b></div>`:steps(PO_STEPS,p.status,'po_',{draft:p.at,received:p.receivedAt})}
        ${acts.length?`<div class="row">${acts.join('')}</div>`:''}</div>
      <section class="card"><div class="card-h"><h3>${t('goods')}</h3></div><div class="card-b">${editable?itemsEditor('po',p):goodsTable(p,true)}</div></section>
      <section class="card"><div class="card-h"><h3>${t('payments')}</h3></div><div class="card-b">${payList(p)}</div></section>
    </div></div>`;
}
A.poGo = el => { const p=poById(el.dataset.id); const s=el.dataset.s; if(S.ui['ed_'+p.id] && !edCommit(p.id)) return;
  if(s==='ordered'&&!p.items.length){ toast(t('items_empty'),'bad'); return; }
  if(s==='received'){ p.items.forEach(i=>{ const st=stockBy(i.pn); if(st){ const tot=st.qty*st.cost+i.qty*i.cost; st.qty+=i.qty; st.cost=Math.round(tot/Math.max(1,st.qty)/1000)*1000; logMove('in',i.pn,i.qty,{kind:'po',id:p.id},''); } }); p.receivedAt=Date.now(); }
  p.status=s; save(); rerender(); toast(s==='received'?t('stock_in_done',{n:p.items.length}):t('toast_status',{s:t('po_'+s)}),'ok'); };

/* ================= EXPENSES + COST PER INVERTER ================= */
function snCost(sn){
  const tks=DB.tickets.filter(x=>x.products.some(p=>p.sn===sn)); const tids=tks.map(x=>x.id);
  let parts=0; const lines=[];
  tks.forEach(x=>{ const c=x.svcId&&svcById(x.svcId);
    if(c&&c.status!=='cancelled'){ c.items.filter(i=>i.type==='part').forEach(i=>{ const v=i.qty*((stockBy(i.pn)||{}).cost||0); parts+=v; lines.push({at:c.at,kind:t('parts_cost'),ref:c.no,desc:`${i.pn} × ${i.qty}`,amount:v}); }); }
    else if(['in_service','on_hold','testing','delivered','closed'].includes(x.status)){ (x.parts||[]).forEach(p=>{ const v=(p.qty||1)*((stockBy(p.pn)||{}).cost||0); parts+=v; lines.push({at:x.createdAt,kind:t('parts_cost'),ref:x.no,desc:`${p.pn} × ${p.qty||1}`,amount:v}); }); } });
  const ex=(DB.expenses||[]).filter(e=>e.status!=='rejected'&&(e.sn===sn||tids.includes(e.ticketId)));
  ex.forEach(e=>lines.push({at:e.at,kind:t('ec_'+e.cat),ref:e.no,desc:L(e.desc),amount:e.amount}));
  const other=ex.reduce((s,e)=>s+e.amount,0);
  const svcs=tks.map(x=>x.svcId&&svcById(x.svcId)).filter(c=>c&&c.status!=='cancelled');
  const revenue=svcs.reduce((s,c)=>s+docTotal(c)-docVat(c),0);
  const rmas=DB.rmas.filter(r=>tids.includes(r.ticketId)).length;
  lines.sort((a,b)=>b.at-a.at);
  return { sn, tickets:tks, parts, other, total:parts+other, revenue, rmas, lines };
}
function viewExpenses(){
  const u=me(); const f=S.ui.exp||(S.ui.exp={tab:'list',q:'',cat:'',st:'',page:1,size:10});
  if(f.tab==='sn'&&!can('cost_view')) f.tab='list';
  const ms=monthStartTs(); const all=DB.expenses;
  const mine = can('exp_approve')||can('pay_record')||u.role==='manager'? all : all.filter(e=>e.by===u.id);
  const tabs=[['list',t('ex_list'),mine.length]]; if(can('cost_view')) tabs.push(['sn',t('ex_by_sn'),null]);
  let body='', tools='';
  if(f.tab==='list'){
    let arr=mine.slice(); if(f.cat) arr=arr.filter(e=>e.cat===f.cat); if(f.st) arr=arr.filter(e=>e.status===f.st);
    if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(e=>(e.no+' '+L(e.desc)+' '+(e.sn||'')+' '+((ticketById(e.ticketId)||{}).no||'')+' '+uname(e.by)).toLowerCase().includes(q)); }
    const {rows,pager:pg}=paged(arr,f,'exp');
    tools=`<div class="row grow">${searchBox('exp-q','exp.q',f.q)}<select class="select" style="width:170px" data-bind="exp.cat" data-re="resetPage" aria-label="${t('category')}"><option value="">${t('all')}</option>${EXP_CATS.map(c=>`<option value="${c}" ${f.cat===c?'selected':''}>${t('ec_'+c)}</option>`).join('')}</select><select class="select" style="width:150px" data-bind="exp.st" data-re="resetPage" aria-label="${t('status')}"><option value="">${t('all_status')}</option>${['pending','approved','paid','rejected'].map(s=>`<option value="${s}" ${f.st===s?'selected':''}>${t('ex_'+s)}</option>`).join('')}</select></div>
      <div class="row">${can('exp_create')?`<button class="btn sm primary" data-a="exNew">${ic('plus',15)} ${t('new_expense')}</button>`:''}${can('export')?`<button class="btn sm" data-a="exExport">${ic('download',15)} CSV</button>`:''}</div>`;
    body=tableHtml([{h:'#',v:e=>`<span class="mono">${e.no}</span>`,nw:1},{h:t('doc_date'),v:e=>fmtD(e.at),nw:1},{h:t('category'),v:e=>t('ec_'+e.cat)},{h:t('description'),v:e=>esc(L(e.desc))},
      {h:t('inverter_ticket'),v:e=>e.ticketId&&ticketById(e.ticketId)?`<span class="mono">${esc(e.sn)}</span><br><button class="link-btn mono" style="font-size:12px" data-a="openTicket" data-id="${e.ticketId}">${ticketById(e.ticketId).no}</button>`:'<span class="muted">—</span>'},
      {h:t('amount'),v:e=>money(e.amount),r:1},{h:t('requested_by'),v:e=>esc(uname(e.by))},{h:t('status'),v:e=>exPill(e.status)},
      {h:'',v:e=>`<span class="nowrap">${e.status==='pending'&&can('exp_approve')?`<button class="btn sm okb" data-a="exSet" data-id="${e.id}" data-s="approved">${t('approve')}</button> <button class="btn sm ghost" style="color:var(--bad)" data-a="exSet" data-id="${e.id}" data-s="rejected">${t('reject')}</button>`:''}${e.status==='approved'&&can('pay_record')?`<button class="btn sm" data-a="exSet" data-id="${e.id}" data-s="paid">${t('mark_paid')}</button>`:''}</span>`}],rows)+pg;
  }
  if(f.tab==='sn'){
    const sns=[...new Set([...DB.tickets.map(x=>x.products[0].sn),...DB.expenses.filter(e=>e.sn).map(e=>e.sn)])];
    let arr=sns.map(snCost).filter(k=>k.total>0||k.revenue>0).sort((a,b)=>b.total-a.total);
    if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(k=>(k.sn+' '+((devBySn(k.sn)||{}).model||'')+' '+custName((devBySn(k.sn)||{}).customerId)).toLowerCase().includes(q)); }
    const {rows,pager:pg}=paged(arr,f,'exp');
    tools=`<div class="row grow">${searchBox('exp-q','exp.q',f.q)}</div>`;
    body=tableHtml([{h:'Serial',v:k=>`<span class="mono" style="color:var(--blue)">${k.sn}</span>`},{h:t('product_model'),v:k=>esc((devBySn(k.sn)||{}).model||'—')},{h:t('customer'),v:k=>esc(custName((devBySn(k.sn)||{}).customerId))},
      {h:t('n_tickets'),v:k=>fmtNum(k.tickets.length),r:1},{h:t('n_rma'),v:k=>fmtNum(k.rmas),r:1},{h:t('parts_cost'),v:k=>money(k.parts),r:1},{h:t('other_cost'),v:k=>money(k.other),r:1},{h:t('total_cost'),v:k=>`<b style="font-weight:600">${money(k.total)}</b>`,r:1},
      {h:t('svc_revenue'),v:k=>money(k.revenue),r:1},{h:t('margin'),v:k=>{ const m=k.revenue-k.total; return `<span style="color:${m>=0?'var(--ok)':'var(--bad)'}">${money(m)}</span>`; },r:1}],rows,k=>`class="clickable" data-a="snDetail" data-sn="${k.sn}"`)+pg;
  }
  const mon=all.filter(e=>e.at>=ms&&e.status!=='rejected').reduce((s,e)=>s+e.amount,0);
  const pend=all.filter(e=>e.status==='pending'), apv=all.filter(e=>e.status==='approved');
  const paidM=all.filter(e=>e.status==='paid'&&(e.paidAt||e.at)>=ms).reduce((s,e)=>s+e.amount,0);
  return `<div class="page-head"><div><h1>${t('nav_expenses')}</h1></div></div>
  ${statRow([stat(t('this_month'),moneyS(mon)),stat(t('awaiting_approval'),fmtNum(pend.length),moneyS(pend.reduce((s,e)=>s+e.amount,0)),pend.length?'var(--warn)':''),stat(t('approved_unpaid'),fmtNum(apv.length),moneyS(apv.reduce((s,e)=>s+e.amount,0))),stat(t('paid_this_month'),moneyS(paidM),'','var(--ok)')],4)}
  <div class="card"><div class="dtabs">${tabs.map(([k,l,n])=>`<button class="${f.tab===k?'on':''}" data-a="expTab" data-k="${k}">${l}${n!=null?`<span class="cnt">${n}</span>`:''}</button>`).join('')}</div>
  <div class="toolbar">${tools}</div>${body}</div>`;
}
A.expTab = el => { S.ui.exp={tab:el.dataset.k,q:'',cat:'',st:'',page:1,size:10}; rerender(); };
A.exSet = el => { const e=DB.expenses.find(x=>x.id===el.dataset.id); const s=el.dataset.s; e.status=s; if(s==='approved'||s==='rejected') e.approvedBy=S.userId; if(s==='paid') e.paidAt=Date.now();
  if(e.by&&e.by!==S.userId) notify({toUser:e.by,key:'n_exp',vars:{no:e.no,s:t('ex_'+s)}}); save(); rerender(); toast(t('toast_status',{s:t('ex_'+s)}),'ok'); };
DICT.vi.n_exp='Phiếu chi {no}: {s}'; DICT.en.n_exp='Expense {no}: {s}';
A.exExport = () => { const rows=[['no','date','category','description','serial','ticket','amount','requested_by','status']]; DB.expenses.forEach(e=>rows.push([e.no,toISODate(e.at),t('ec_'+e.cat),L(e.desc),e.sn||'',(ticketById(e.ticketId)||{}).no||'',e.amount,uname(e.by),t('ex_'+e.status)])); download(`chi_phi_${toISODate(Date.now())}.csv`,csv(rows)); };
A.exNew = el => openModal({type:'exForm', f:{ cat:'shipping', amount:'', desc:'', date:toISODate(Date.now()), ticketId:(el&&el.dataset&&el.dataset.tid)||'' }, err:{}});
MODALS.exForm = m => { const f=m.f, E=m.err||{}; const tks=DB.tickets.slice().sort((a,b)=>b.createdAt-a.createdAt);
  return { wide:true, title:t('new_expense'), body:`<div class="form-grid">
    <div class="field"><label class="req" for="ex-c">${t('category')}</label><select class="select" id="ex-c" data-bind="modal.f.cat">${EXP_CATS.map(c=>`<option value="${c}" ${f.cat===c?'selected':''}>${t('ec_'+c)}</option>`).join('')}</select></div>
    <div class="field"><label class="req" for="ex-a">${t('amount')} (₫)</label><input class="input num ${E.amount?'err':''}" id="ex-a" type="number" min="0" step="1000" data-bind="modal.f.amount" value="${esc(f.amount)}">${E.amount?`<div class="err-text">${E.amount}</div>`:''}</div>
    <div class="field full"><label class="req" for="ex-d">${t('description')}</label><input class="input ${E.desc?'err':''}" id="ex-d" data-bind="modal.f.desc" value="${esc(f.desc)}">${E.desc?`<div class="err-text">${E.desc}</div>`:''}</div>
    <div class="field"><label for="ex-dt">${t('doc_date')}</label><input class="input" type="date" id="ex-dt" data-bind="modal.f.date" value="${f.date}"></div>
    <div class="field"><label for="ex-t">${t('link_ticket')}</label><select class="select" id="ex-t" data-bind="modal.f.ticketId"><option value="">${t('no_link')}</option>${tks.map(x=>`<option value="${x.id}" ${f.ticketId===x.id?'selected':''}>${x.no} · ${esc(x.products[0].sn)}</option>`).join('')}</select></div></div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="exSave">${t('send')}</button>` }; };
A.exSave = () => { const m=S.ui.modal, f=m.f, E={}; const a=Math.round(Number(f.amount)||0); if(!(a>0)) E.amount=t('e_amount'); if(!String(f.desc||'').trim()) E.desc=t('e_required');
  m.err=E; if(Object.keys(E).length){ rerender(); return; } const x=ticketById(f.ticketId);
  const can_ap=can('exp_approve');
  DB.expenses.unshift({ id:'ex'+Date.now().toString(36), no:erpNo('CP'), at:f.date?new Date(f.date+'T12:00:00').getTime():Date.now(), cat:f.cat, amount:a, desc:{vi:f.desc,en:f.desc}, ticketId:x?x.id:null, sn:x?x.products[0].sn:'', svcId:x&&x.svcId||null, by:S.userId, status:can_ap?'approved':'pending', approvedBy:can_ap?S.userId:null, paidAt:null, method:'bank' });
  if(!can_ap) notify({toRole:'manager',key:'n_exp',vars:{no:DB.expenses[0].no,s:t('ex_pending')}});
  S.ui.modal=null; save(); rerender(); toast(t('expense_saved'),'ok'); };
A.snDetail = el => openModal({type:'snDetail', sn:el.dataset.sn});
MODALS.snDetail = m => { const k=snCost(m.sn); const d=devBySn(m.sn)||{}; const mg=k.revenue-k.total;
  return { wide:true, title:t('cost_detail',{sn:m.sn}), body:`<div class="muted" style="margin-bottom:10px">${esc(d.model||'')} · ${esc(custName(d.customerId))} · ${k.tickets.map(x=>x.no).join(', ')||'—'}</div>
    ${statRow([stat(t('parts_cost'),moneyS(k.parts)),stat(t('other_cost'),moneyS(k.other)),stat(t('total_cost'),moneyS(k.total)),stat(t('svc_revenue'),moneyS(k.revenue)),stat(t('margin'),moneyS(mg),'',mg>=0?'var(--ok)':'var(--bad)')],5)}
    ${k.lines.length?`<div class="table-wrap" style="max-height:320px;overflow:auto;border:1px solid var(--line);border-radius:6px"><table class="tbl"><thead><tr><th>${t('doc_date')}</th><th>${t('category')}</th><th>${t('reference')}</th><th>${t('description')}</th><th class="r">${t('amount')}</th></tr></thead><tbody>${k.lines.map(l=>`<tr><td class="num nowrap">${fmtD(l.at)}</td><td>${esc(l.kind)}</td><td class="mono">${esc(l.ref)}</td><td>${esc(l.desc)}</td><td class="r num">${money(l.amount)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="muted">${t('no_data')}</div>`}`,
    foot:`<button class="btn" data-a="closeModal">${t('close')}</button>` }; };

/* ================= TICKET + HOME INTEGRATION ================= */
function erpTicketSide(x){
  const u=me(); const c=x.svcId&&svcById(x.svcId); const out=[];
  if(c&&can('svc_view')&&(!isExternal(u)||c.status!=='quote')) out.push(kv(t('contract_no'),`<button class="link-btn mono" data-a="scrollSec" data-k="contract">${c.no}</button> ${svcPill(c.status)}<br><small class="muted">${money(docTotal(c))} · ${t('pay_'+payState(c))}</small>`,true));
  if(can('cost_view')){ const k=snCost(x.products[0].sn); out.push(kv(t('cost_of_inverter'),`<button class="link-btn" data-a="snDetail" data-sn="${esc(x.products[0].sn)}">${money(k.total)}</button>${k.rmas?` <small class="muted">· ${k.rmas} RMA</small>`:''}`,true)); }
  if(can('exp_create')&&!isExternal(u)) out.push(`<button class="btn sm ghost" style="justify-content:flex-start;padding-left:0" data-a="exNew" data-tid="${x.id}">${ic('plus',14)} ${t('new_expense')}</button>`);
  return out.join('');
}
function erpHomeBand(u){
  const ms=monthStartTs();
  if(isExternal(u)){
    const sv=visibleSvc(u), so=visibleSo(u); const docs=[...sv,...so].filter(x=>x.status!=='cancelled');
    const toPay=docs.reduce((s,x)=>s+docDue(x),0); const waitQuote=sv.filter(x=>x.status==='sent');
    if(!docs.length) return '';
    return `<div class="biz-band">${u.role==='agent'?`<div class="hint" style="grid-column:1/-1">${t('agent_scope',{n:(u.customerIds||[]).length})}</div>`:''}
      <button class="kpi" data-a="nav" data-k="contracts"><div><div class="v">${fmtNum(docs.filter(x=>!['done'].includes(x.status)).length)}</div><div class="l">${t('open_contracts')}</div></div><span class="ic b">${ic('file',20)}</span></button>
      <button class="kpi" data-a="nav" data-k="contracts"><div><div class="v">${fmtNum(waitQuote.length)}</div><div class="l">${t('sv_sent')} · ${t('act_accept_quote')}</div></div><span class="ic">${ic('clip',20)}</span></button>
      <button class="kpi" data-a="nav" data-k="contracts"><div><div class="v" style="font-size:22px">${moneyS(toPay)}</div><div class="l">${t('to_pay')}</div></div><span class="ic r">${ic('alert',20)}</span></button></div>`;
  }
  const cells=[];
  if(can('svc_view')||can('so_view')){
    const docs=[...(DB.svc||[]),...(DB.orders||[])].filter(x=>x.status!=='cancelled');
    const rev=docs.flatMap(d=>d.payments||[]).filter(p=>p.at>=ms).reduce((s,p)=>s+p.amount,0);
    const rec=docs.reduce((s,x)=>s+docDue(x),0); const od=(DB.orders||[]).filter(isOverdue).length;
    cells.push(`<button class="kpi" data-a="nav" data-k="contracts"><div><div class="v" style="font-size:22px">${moneyS(rev)}</div><div class="l">${t('revenue_month')}</div></div><span class="ic g">${ic('chart',20)}</span></button>`);
    cells.push(`<button class="kpi" data-a="nav" data-k="contracts"><div><div class="v" style="font-size:22px">${moneyS(rec)}</div><div class="l">${t('receivable_total')}${od?` <span class="pill k4" style="height:20px">${od} ${t('overdue')}</span>`:''}</div></div><span class="ic r">${ic('file',20)}</span></button>`);
  }
  if(can('exp_view')){ const ex=DB.expenses.filter(e=>e.at>=ms&&e.status!=='rejected').reduce((s,e)=>s+e.amount,0); const pend=DB.expenses.filter(e=>e.status==='pending').length;
    cells.push(`<button class="kpi" data-a="nav" data-k="expenses"><div><div class="v" style="font-size:22px">${moneyS(ex)}</div><div class="l">${t('expense_month')}${pend&&can('exp_approve')?` <span class="pill k2" style="height:20px">${pend} ${t('awaiting_approval')}</span>`:''}</div></div><span class="ic">${ic('clip',20)}</span></button>`); }
  if(can('stock_view')){ const low=DB.stock.filter(s=>s.qty<s.min).length; const po=DB.purchases.filter(p=>p.status==='ordered').length;
    cells.push(`<button class="kpi" data-a="stkLow"><div><div class="v">${fmtNum(low)}</div><div class="l">${t('low_stock_items')}${po?` <span class="pill k1" style="height:20px">${po} ${t('po_open')}</span>`:''}</div></div><span class="ic ${low?'r':'b'}">${ic('box',20)}</span></button>`); }
  if(!cells.length) return '';
  return `<div class="biz-band">${cells.join('')}</div>`;
}
A.stkLow = () => { S.ui.stk={tab:'items',q:'',cat:'',low:true,page:1,size:10}; openTab('stock'); };

/* ===== Ticket = service contract ===== */
function svcForTicket(x){ const c=x.svcId&&svcById(x.svcId); if(!c||c.status==='cancelled'&&!can('svc_manage')) return null; if(!can('svc_view')) return null; if(isExternal(me())&&c.status==='quote') return null; return c; }
function svcBox(x){
  const u=me(); const c=x.svcId&&svcById(x.svcId);
  if(!c){ if(can('svc_manage')&&!['closed','rejected','cancelled','draft','unassigned','pending'].includes(x.status)) return `<section class="card action-card"><div class="card-h"><h3 style="color:var(--accent-ink)">${ic('file',16)} ${t('sec_contract')}</h3><span class="hint">${t('no_contract_hint')}</span></div><div class="card-b"><button class="btn primary" data-a="svcForTicket" data-id="${x.id}">${ic('plus',15)} ${t('new_quote')}</button></div></section>`; return ''; }
  if(!svcForTicket(x)) return '';
  const acts=[];
  if(can('pay_record')&&docDue(c)>0&&['signed','in_progress'].includes(c.status)&&!['pending','invoiced','paid'].includes(x.status)) acts.push(`<button class="btn" data-a="payAsk" data-id="${c.id}">${t('record_payment')}</button>`);
  const pst=payState(c);
  return `<section class="card action-card"><div class="card-h"><h3 style="color:var(--accent-ink)">${ic('file',16)} ${t('sec_contract')} <span class="mono" style="font-weight:500;color:var(--ink-2)">${c.no}</span></h3><div class="row" style="gap:6px">${svcPill(c.status)} ${payPill(c)} <b class="num" style="margin-left:6px">${money(docTotal(c))}</b></div></div>
    <div class="card-b">${c.status==='cancelled'?`<div class="quote" style="border-color:var(--bad);margin:0">${t('sv_cancelled')}</div>`:contractBar(c)}
    ${acts.length?`<div class="row" style="margin-top:12px">${acts.join('')}</div>`:''}
    ${c.status==='sent'&&!isExternal(u)?`<div class="hint" style="margin-top:8px">${t('wait_customer_sign')}</div>`:''}</div></section>`;
}
function svcSection(c){
  const editable=can('svc_manage')&&c.status==='quote'; const cost=can('cost_view')?svcCost(c):null;
  return `<section class="card sec" id="sec-contract"><div class="card-h"><h3>${t('sec_contract')} · <span class="mono" style="font-weight:500">${c.no}</span></h3><span class="row" style="gap:6px">${c.warranty?`<span class="chip">${t('warranty_job')}</span>`:`<span class="chip">${t('paid_job')}</span>`}<small class="muted">${t('valid_days')}: ${t('days_n',{n:c.validDays||15})} · ${t('repair_warranty')}: ${t('months_n',{n:c.repairWarrantyMonths||6})}</small></span></div>
    <div class="card-b" style="display:flex;flex-direction:column;gap:16px">${editable?itemsEditor('svc',c):svcItemsTable(c)}
      <div><div class="lbl" style="margin-bottom:8px">${t('payments')}</div>${payList(c)}</div>
      ${cost?(()=>{ const m=cost.revenue-cost.total; return `<div><div class="lbl" style="margin-bottom:8px">${t('cost_margin')}</div>${statRow([stat(t('parts_cost'),moneyS(cost.parts)),stat(t('other_cost'),moneyS(cost.other)),stat(t('revenue'),moneyS(cost.revenue)),stat(t('margin'),moneyS(m),'',m>=0?'var(--ok)':'var(--bad)')],4)}</div>`; })():''}
    </div></section>`;
}
/* keep the contract in step with the repair workflow */
function syncSvc(x){ const c=x&&x.svcId&&svcById(x.svcId); if(!c||c.status==='cancelled') return;
  if(['in_service','on_hold','testing','delivered','closed'].includes(x.status) && c.status==='signed'){ c.status='in_progress'; c.items.filter(i=>i.type==='part'&&i.pn).forEach(i=>{ const st=stockBy(i.pn); if(st){ st.qty=Math.max(0,st.qty-i.qty); logMove('out',i.pn,i.qty,{kind:'svc',id:c.id},x.no); } }); }
  if(x.status==='closed' && ['signed','in_progress'].includes(c.status)){ c.status='done'; c.doneAt=Date.now(); }
  if(['rejected','cancelled'].includes(x.status) && ['quote','sent'].includes(c.status)) c.status='cancelled';
}
const _wfOrig=A.wf; A.wf=(el,ev)=>{ const id=el.dataset.id; const before=ticketById(id)&&ticketById(id).status; const r=_wfOrig(el,ev); const x=ticketById(id);
  if(x&&x.status!==before){ if(el.dataset.op==='submitDiag'&&!x.svcId&&can('svc_manage',me())===false){} if(el.dataset.op==='submitDiag'&&!x.svcId) autoQuote(x); syncSvc(x); save(); rerender(); } return r; };
function autoQuote(x){ const paid = x.type==='OW'||x.type==='PR'; const parts=(x.diagnosis&&x.diagnosis.estParts)||[];
  const items=parts.map(p=>{ const s=stockBy(p.pn); return { type:'part', pn:p.pn, desc:s?s.name:partName(p.pn), qty:p.qty||1, price:paid&&s?s.price:0 }; });
  items.push({ type:'labor', desc:L(t0('Công kiểm tra, sửa chữa biến tần','Inspection & repair labour')), qty:1, price:paid?2000000:0 });
  const c={ id:'sc'+Date.now().toString(36), no:erpNo('DV'), ticketId:x.id, customerId:x.customerId, sn:x.products[0].sn, model:x.products[0].model, at:Date.now(), items, vat:VAT_DEFAULT, status:'quote', warranty:!paid, validDays:15, signedAt:null, doneAt:null, payments:[], createdBy:S.userId, note:'', repairWarrantyMonths:6 };
  DB.svc.unshift(c); x.svcId=c.id; }

/* ===== Contract-driven ticket steps: quote → contract → … → invoice → payment → close ===== */
function contractAction(x,u,box){
  const s=x.status; if(!['pending','delivered','invoiced','paid'].includes(s)) return undefined;
  const c=x.svcId&&svcById(x.svcId); const mg=can('svc_manage')||can('ticket_approve');
  const ext=isExternal(u);
  if(s==='pending'){
    if(!c) return mg? box(t('step_pending'),`<button class="btn primary" data-a="svcForTicket" data-id="${x.id}">${ic('plus',15)} ${t('new_quote')}</button>`) : '';
    if(ext){ return c.status==='sent'? box(t('quote_for_you'),`<p style="margin:0 0 12px">${t('quote_review_hint',{a:money(docTotal(c))})}</p><div class="row"><button class="btn primary" data-a="tkSign" data-id="${x.id}">${ic('check',15)} ${t('act_accept_quote')}</button><button class="btn" data-a="scrollSec" data-k="contract">${t('view_quote')}</button><span class="grow"></span><button class="btn danger" data-a="tkDeclineAsk" data-id="${x.id}">${t('decline_quote')}</button></div>`) : ''; }
    if(!mg) return box(t('step_pending'),`<p style="margin:0">${t(c.status==='sent'?'wait_customer_sign':'quote_preparing')}</p>`);
    return box(t('act_quote_title'),`<p style="margin:0 0 12px">${c.status==='quote'?t('quote_edit_hint'):t('wait_customer_sign')} <b class="num">${money(docTotal(c))}</b></p>
      <div class="row">${c.status==='quote'?`<button class="btn primary" data-a="svcGo" data-id="${c.id}" data-s="sent">${ic('send',15)} ${t('act_send_quote')}</button>`:''}<button class="btn ${c.status==='sent'?'primary':''}" data-a="tkSign" data-id="${x.id}">${ic('check',15)} ${t('act_mark_signed')}</button>
      <button class="btn" data-a="wf" data-op="decide" data-d="return" data-id="${x.id}">${t('back_to_diag')}</button><span class="grow"></span><button class="btn danger" data-a="tkDeclineAsk" data-id="${x.id}">${t('customer_declined')}</button></div>`, c.no);
  }
  const zero = !c || docTotal(c)<=0;
  if(s==='delivered'){
    if(ext||!(can('ticket_repair')||can('pay_record')||mg)) return '';
    if(zero) return box(t('act_close_title'),`<p style="margin:0 0 12px">${t('no_charge_close')}</p><button class="btn primary" data-a="tkFinish" data-id="${x.id}">${ic('check',15)} ${t('close_case')}</button>`);
    return box(t('act_invoice_title'),`<p style="margin:0 0 12px">${t('invoice_hint',{a:money(docTotal(c)),p:money(docPaid(c))})}</p><button class="btn primary" data-a="tkInvoice" data-id="${x.id}">${ic('file',15)} ${t('issue_invoice')}</button>`, c.no);
  }
  if(s==='invoiced'){
    if(ext) return box(t('step_paid'),`<p style="margin:0">${t('pay_request_hint',{a:money(docDue(c)),inv:(c.invoice||{}).no||''})}</p>`);
    return box(t('act_pay_title'),`<p style="margin:0 0 12px">${t('invoice_no')}: <b class="mono">${(c.invoice||{}).no||'—'}</b> · ${t('remaining')}: <b class="num" style="color:var(--bad)">${money(docDue(c))}</b></p>${can('pay_record')?`<button class="btn primary" data-a="payAsk" data-id="${c.id}">${t('record_payment')}</button>`:`<span class="hint">${t('wait_accounting')}</span>`}`);
  }
  if(s==='paid'){
    if(ext||!(can('ticket_repair')||mg)) return '';
    return box(t('act_close_title'),`<p style="margin:0 0 12px">${t('paid_close_hint')}</p><button class="btn primary" data-a="tkFinish" data-id="${x.id}">${ic('check',15)} ${t('close_case')}</button>`);
  }
}
function tkLog(x,action,to,note){ const from=x.status; x.history.push({at:Date.now(),by:S.userId,action,from,to,note:note||''}); x.status=to; x.updatedAt=Date.now(); }
A.tkSign = el => { const x=ticketById(el.dataset.id); const c=svcById(x.svcId); const u=me(); if(S.ui['ed_'+c.id]&&!edCommit(c.id)) return;
  c.status='signed'; c.signedAt=Date.now();
  x.approval={by:u.id,byName:u.name,byEmail:u.email,byRole:u.role,at:Date.now(),decision:'approved',note:'',contract:c.no};
  tkLog(x,'approved','approved',c.no);
  if(isExternal(u)) notify({toRole:'manager',key:'n_accepted',vars:{no:c.no},ticketId:x.id}); else if(x.customerId) notify({toCustomer:x.customerId,key:'n_signed',vars:{no:x.no},ticketId:x.id});
  if(x.assigneeId) notify({toUser:x.assigneeId,key:'n_signed',vars:{no:x.no},ticketId:x.id});
  save(); rerender(); toast(t('toast_status',{s:t('s_approved')}),'ok'); };
A.tkInvoice = el => { const x=ticketById(el.dataset.id); const c=svcById(x.svcId);
  c.invoice={ no:erpNo('HD'), at:Date.now(), by:S.userId }; tkLog(x,'invoiced','invoiced',c.invoice.no);
  if(docDue(c)<=0) tkLog(x,'paid','paid');
  if(x.customerId) notify({toCustomer:x.customerId,key:'n_invoiced',vars:{no:x.no,inv:c.invoice.no},ticketId:x.id});
  save(); rerender(); toast(t('toast_status',{s:t('s_'+x.status)}),'ok'); };
A.tkFinish = el => { const x=ticketById(el.dataset.id); const c=x.svcId&&svcById(x.svcId);
  if(x.status==='delivered'){ tkLog(x,'invoiced','invoiced',t('pay_na')); tkLog(x,'paid','paid'); }
  tkLog(x,'closed','closed'); x.closedAt=Date.now(); if(c&&!['cancelled','declined'].includes(c.status)){ c.status='done'; c.doneAt=Date.now(); }
  if(x.rmaId){ const r=rmaById(x.rmaId); } if(x.customerId) notify({toCustomer:x.customerId,key:'n_closed',vars:{no:x.no},ticketId:x.id});
  save(); rerender(); toast(t('toast_status',{s:t('s_closed')}),'ok'); };
/* payment on an invoiced ticket moves it to "paid" */
const _paySave=A.paySave; A.paySave=()=>{ const id=S.ui.modal&&S.ui.modal.id; _paySave(); const c=svcById(id); if(!c) return; const x=ticketById(c.ticketId);
  if(x&&x.status==='invoiced'&&docDue(c)<=0){ tkLog(x,'paid','paid'); save(); rerender(); } };
/* keep contract status aligned when the ticket moves */
const _syncSvc0=syncSvc; syncSvc=function(x){ const c=x&&x.svcId&&svcById(x.svcId);
  if(x&&x.status==='pending'&&!x.svcId) autoQuote(x);
  if(c&&x.status==='approved'&&['quote','sent'].includes(c.status)){ c.status='signed'; c.signedAt=c.signedAt||Date.now(); }
  _syncSvc0(x); };
Object.assign(DICT.vi,{ s_pending:'Báo giá', s_approved:'Đã ký HĐ', s_invoiced:'Đã xuất HĐ', s_paid:'Đã thanh toán',
  step_pending:'Báo giá', step_approved:'Ký hợp đồng', step_invoiced:'Xuất hóa đơn', step_paid:'Thanh toán',
  k_pending:'Báo giá chờ ký', k_need_you:'Cần xử lý', k_pending_opinion:'Báo giá chờ ký', submit_for_approval:'Lập báo giá', approved_by:'Xác nhận ký HĐ',
  act_quote_title:'Báo giá & ký hợp đồng', quote_edit_hint:'Kiểm tra hạng mục ở mục "Báo giá & hợp đồng" bên dưới rồi gửi cho khách. Tổng:', quote_preparing:'Quản lý đang lập báo giá.',
  back_to_diag:'Trả về chẩn đoán', customer_declined:'Khách từ chối', quote_for_you:'Báo giá cho bạn', quote_review_hint:'SGE đã gửi báo giá sửa chữa, tổng {a}. Vui lòng xem chi tiết và xác nhận.', view_quote:'Xem báo giá',
  act_invoice_title:'Xuất hóa đơn', invoice_hint:'Đã giao trả thiết bị. Giá trị hợp đồng {a}, đã thu {p}.', issue_invoice:'Xuất hóa đơn', invoice_no:'Số hóa đơn',
  act_pay_title:'Thu tiền', pay_request_hint:'Hóa đơn {inv} đã được xuất. Số tiền cần thanh toán: {a}.', wait_accounting:'Chờ kế toán ghi nhận thanh toán.',
  paid_close_hint:'Khách đã thanh toán đủ. Đóng ticket để hoàn tất hợp đồng.', no_charge_close:'Ca bảo hành không thu phí, có thể đóng ticket ngay.',
  n_signed:'{no}: hợp đồng đã được ký', n_invoiced:'{no}: đã xuất hóa đơn {inv}', perm_ticket_approve:'Xác nhận hợp đồng', pd_ticket_approve:'Gửi báo giá, xác nhận khách đã ký hợp đồng',
  act_approve_title:'Báo giá & ký hợp đồng', act_wait_title:'Đang chờ khách ký hợp đồng' });
Object.assign(DICT.en,{ s_pending:'Quote', s_approved:'Contract signed', s_invoiced:'Invoiced', s_paid:'Paid',
  step_pending:'Quote', step_approved:'Contract', step_invoiced:'Invoice', step_paid:'Payment',
  k_pending:'Quotes awaiting signature', k_need_you:'Action needed', k_pending_opinion:'Quotes awaiting signature', submit_for_approval:'Create quote', approved_by:'Contract confirmed by',
  act_quote_title:'Quote & contract', quote_edit_hint:'Check the lines in "Quote & contract" below, then send to the customer. Total:', quote_preparing:'The manager is preparing the quote.',
  back_to_diag:'Back to diagnosis', customer_declined:'Customer declined', quote_for_you:'Your quote', quote_review_hint:'SGE has sent a repair quote, total {a}. Please review and confirm.', view_quote:'View quote',
  act_invoice_title:'Issue invoice', invoice_hint:'Unit returned. Contract value {a}, received {p}.', issue_invoice:'Issue invoice', invoice_no:'Invoice No.',
  act_pay_title:'Collect payment', pay_request_hint:'Invoice {inv} issued. Amount due: {a}.', wait_accounting:'Waiting for accounting to record payment.',
  paid_close_hint:'Fully paid. Close the ticket to complete the contract.', no_charge_close:'No-charge warranty job, the ticket can be closed now.',
  n_signed:'{no}: contract signed', n_invoiced:'{no}: invoice {inv} issued', perm_ticket_approve:'Confirm contracts', pd_ticket_approve:'Send quotes, confirm the customer signed',
  act_approve_title:'Quote & contract', act_wait_title:'Waiting for customer signature' });
Object.assign(DICT.vi,{ n_submitted:'{no}: chẩn đoán xong, cần lập báo giá', act_diag_title:'Chẩn đoán & lập báo giá' });
Object.assign(DICT.en,{ n_submitted:'{no}: diagnosed, quote needed', act_diag_title:'Diagnosis & quote' });
Object.assign(DICT.vi,{ sec_approval:'Xác nhận hợp đồng', decision:'Kết quả' }); Object.assign(DICT.en,{ sec_approval:'Contract confirmation', decision:'Outcome' });

Object.assign(DICT.vi,{ ph_contract_no:'Số hợp đồng' }); Object.assign(DICT.en,{ ph_contract_no:'Contract No.' });
