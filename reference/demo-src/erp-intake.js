/* ===== Device intake → classification (warranty / paid repair) → quote; customer decline → return unrepaired ===== */
SERVICE_TYPES.push({ id:'TN', key:'st_TN' });
if(typeof TYPE_COLORS!=='undefined') TYPE_COLORS.TN='var(--warn)';
const INTAKE_METHODS=['walkin','courier','pickup','onsite'];
const CONDITIONS=['ok','scratch','dent','burn','water','missing'];
const OUT_OF_SCOPE=['dent','burn','water'];
const DECLINE_FEE=300000;

function intakeFields(ns,f,E){ E=E||{}; const id=ns.replace(/\./g,'-');
  return `<div class="card" style="box-shadow:none;background:var(--surface-2)"><div class="card-h" style="border-bottom:1px solid var(--line)"><h3>${ic('box',16)} ${t('sec_intake')}</h3></div><div class="card-b"><div class="form-grid">
    <div class="field"><label class="req" for="${id}-m">${t('intake_method')}</label><select class="select" id="${id}-m" data-bind="${ns}.method">${INTAKE_METHODS.map(m=>`<option value="${m}" ${f.method===m?'selected':''}>${t('im_'+m)}</option>`).join('')}</select></div>
    <div class="field"><label class="req" for="${id}-d">${t('intake_date')}</label><input class="input ${E.intakeDate?'err':''}" type="date" id="${id}-d" data-bind="${ns}.date" value="${esc(f.date||'')}">${E.intakeDate?`<div class="err-text">${E.intakeDate}</div>`:''}</div>
    <div class="field"><label for="${id}-c">${t('intake_cond')}</label><select class="select" id="${id}-c" data-bind="${ns}.cond" data-re>${CONDITIONS.map(m=>`<option value="${m}" ${f.cond===m?'selected':''}>${t('cd_'+m)}</option>`).join('')}</select>${OUT_OF_SCOPE.includes(f.cond)?`<div class="hint" style="color:var(--warn)">${t('cond_oos_hint')}</div>`:''}</div>
    <div class="field"><label for="${id}-l">${t('intake_loc')}</label><input class="input" id="${id}-l" data-bind="${ns}.loc" value="${esc(f.loc||'')}" placeholder="${t('intake_loc_ph')}"></div>
    <div class="field full"><label for="${id}-a">${t('intake_acc')}</label><input class="input" id="${id}-a" data-bind="${ns}.acc" value="${esc(f.acc||'')}" placeholder="${t('intake_acc_ph')}"></div>
    <div class="field full"><label for="${id}-n">${t('intake_note')}</label><input class="input" id="${id}-n" data-bind="${ns}.condNote" value="${esc(f.condNote||'')}" placeholder="${t('intake_note_ph')}"></div>
  </div></div></div>`; }

function intakeSection(x){
  const k=x.intake;
  const body = k? `<div class="kv-grid">${kv(t('intake_method'),t('im_'+k.method))}${kv(t('intake_date'),fmtDT(k.at))}${kv(t('received_by'),uname(k.by))}${kv(t('intake_cond'),t('cd_'+k.cond)+(k.condNote?' — '+k.condNote:''))}${kv(t('intake_acc'),k.acc||'—')}${kv(t('intake_loc'),k.loc||'—')}</div>`
    : `<div class="muted">${t('not_received_yet')}</div>`;
  return `<section class="card sec" id="sec-intake"><div class="card-h"><h3>${t('sec_intake')}</h3>${k?`<span class="pill s-closed">${t('received_ok')}</span>`:`<span class="pill s-pending">${t('not_received_short')}</span>`}</div><div class="card-b">${body}${x.decline?`<div class="quote" style="border-color:var(--bad);margin-top:12px"><b>${t('quote_declined')}</b> · ${fmtDT(x.decline.at)} · ${esc(uname(x.decline.by))}<br>${esc(x.decline.reason)}${x.decline.fee?`<br>${t('inspection_fee')}: <b class="num">${money(x.decline.fee)}</b>`:''}</div>`:''}</div></section>`;
}

/* suggested classification from warranty state + intake condition */
function suggestType(x){ const d=devBySn(x.products[0].sn); const at=(x.intake&&x.intake.at)||x.createdAt;
  if(x.intake&&OUT_OF_SCOPE.includes(x.intake.cond)) return 'PR'; return d&&warrantyState(d,at).inW?'RW':'PR'; }
function classifyField(x,dg){ const d=devBySn(x.products[0].sn); const at=(x.intake&&x.intake.at)||x.createdAt; const w=d?warrantyState(d,at):null; const sug=suggestType(x);
  const why = x.intake&&OUT_OF_SCOPE.includes(x.intake.cond)? t('why_cond',{c:t('cd_'+x.intake.cond)}) : w? (w.inW? t('why_inw',{d:fmtD(w.end)}) : t('why_outw',{d:fmtD(w.end)})) : t('why_unknown');
  return `<div class="field full"><span class="lbl req">${t('classify')}</span><div class="cls-opt">${[['RW','cls_rw','cls_rw_d'],['PR','cls_pr','cls_pr_d']].map(([v,l,dsc])=>`<label class="${dg.svcType===v?'on':''}"><input type="radio" name="cls-${x.id}" value="${v}" data-bind="td_${x.id}.dg.svcType" data-re ${dg.svcType===v?'checked':''}><span><b>${t(l)}${sug===v?` <span class="pill k1" style="height:20px">${t('suggested')}</span>`:''}</b><small>${t(dsc)}</small></span></label>`).join('')}</div><div class="hint">${why}</div></div>`; }

/* ---- action boxes: confirm intake; return unrepaired after decline ---- */
const _caBase=contractAction;
contractAction=function(x,u,box){
  const internal=!isExternal(u);
  if(internal && !x.intake && ['unassigned','diagnosing','returned'].includes(x.status) && (can('ticket_diagnose')||can('ticket_assign'))){
    const st=tdState(x.id); const f=st.in||(st.in={ method:'courier', date:toISODate(Date.now()), cond:'ok', condNote:'', acc:'', loc:'' });
    return box(t('act_intake_title'), `<p style="margin:0 0 12px">${t('act_intake_desc')}</p>${intakeFields('td_'+x.id+'.in',f,st.inErr||{})}<div class="row" style="margin-top:14px"><button class="btn primary" data-a="intakeSave" data-id="${x.id}">${ic('check',15)} ${t('confirm_received')}</button></div>`);
  }
  if(x.status==='return_pending'){
    if(!internal) return box(t('s_return_pending'),`<p style="margin:0">${t('return_wait_ext')}</p>`);
    if(!(can('ticket_repair')||can('svc_manage'))) return '';
    const st=tdState(x.id); const r=st.rt||(st.rt={ carrier:'Viettel Post', tracking:'', date:toISODate(Date.now()), note:'' });
    return box(t('act_return_title'), `<p style="margin:0 0 12px">${t('act_return_desc')}</p><div class="form-grid">
      <div class="field"><label for="rt-c">${t('carrier')}</label><select class="select" id="rt-c" data-bind="td_${x.id}.rt.carrier">${['Khách nhận tại SGE','Viettel Post','GHN','GHTK','Xe SGE'].map(c=>`<option ${r.carrier===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label for="rt-t">${t('tracking_no')}</label><input class="input mono" id="rt-t" data-bind="td_${x.id}.rt.tracking" value="${esc(r.tracking)}"></div>
      <div class="field"><label for="rt-d">${t('delivery_date')}</label><input class="input" type="date" id="rt-d" data-bind="td_${x.id}.rt.date" value="${r.date}"></div>
      <div class="field"><label for="rt-n">${t('note_l')}</label><input class="input" id="rt-n" data-bind="td_${x.id}.rt.note" value="${esc(r.note)}"></div></div>
      <div class="row" style="margin-top:14px"><button class="btn primary" data-a="returnUnrepaired" data-id="${x.id}">${ic('truck',15)} ${t('confirm_return')}</button></div>`);
  }
  return _caBase(x,u,box);
};
A.intakeSave = el => { const x=ticketById(el.dataset.id); const st=tdState(x.id); const f=st.in;
  if(!f.date){ st.inErr={intakeDate:t('e_required')}; rerender(); return; }
  x.intake=Object.assign({},f,{ at:new Date(f.date+'T'+String(new Date().getHours()).padStart(2,'0')+':00:00').getTime(), by:S.userId });
  x.history.push({at:Date.now(),by:S.userId,action:'received',from:x.status,to:x.status,note:t('im_'+f.method)}); x.updatedAt=Date.now();
  if(x.customerId) notify({toCustomer:x.customerId,key:'n_received',vars:{no:x.no},ticketId:x.id});
  st.in=null; save(); rerender(); toast(t('toast_received',{no:x.no}),'ok'); };
A.returnUnrepaired = el => { const x=ticketById(el.dataset.id); const r=tdState(x.id).rt;
  x.delivery={ at:r.date?new Date(r.date+'T12:00:00').getTime():Date.now(), carrier:r.carrier, tracking:r.tracking, note:r.note, by:S.userId, unrepaired:true };
  tkLog(x,'returned_unrepaired','delivered',r.carrier);
  if(x.customerId) notify({toCustomer:x.customerId,key:'n_returned_unrep',vars:{no:x.no},ticketId:x.id});
  save(); rerender(); toast(t('toast_status',{s:t('s_delivered')}),'ok'); };

/* ---- customer declines the quote ---- */
A.tkDeclineAsk = el => { const x=ticketById(el.dataset.id); const ext=isExternal(me());
  openModal({type:'decline', id:x.id, ext, f:{ reason:'', fee: ext? (x.type==='RW'?0:DECLINE_FEE) : (x.type==='RW'?0:DECLINE_FEE) }, err:{}}); };
MODALS.decline = m => { const x=ticketById(m.id); const f=m.f, E=m.err||{};
  return { title:(m.ext?t('decline_quote'):t('customer_declined'))+' · '+x.no, body:`<p style="margin:0 0 12px">${t('decline_explain')}</p><div class="form-grid">
    <div class="field full"><label class="req" for="dc-r">${t('decline_reason')}</label><textarea class="textarea ${E.reason?'err':''}" id="dc-r" data-bind="modal.f.reason" style="min-height:70px" placeholder="${t('decline_reason_ph')}">${esc(f.reason)}</textarea>${E.reason?`<div class="err-text">${E.reason}</div>`:''}</div>
    ${m.ext?`<div class="field full"><div class="hint">${f.fee?t('fee_policy',{a:money(f.fee)}):t('fee_waived')}</div></div>`:`<div class="field"><label for="dc-f">${t('inspection_fee')} (₫)</label><input class="input num" id="dc-f" type="number" min="0" step="10000" data-num data-bind="modal.f.fee" value="${f.fee}"><div class="hint">${t('fee_hint')}</div></div>`}
  </div>`, foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn danger" data-a="tkDecline">${t('confirm_decline')}</button>` }; };
A.tkDecline = () => { const m=S.ui.modal; const x=ticketById(m.id); const f=m.f; if(!String(f.reason||'').trim()){ m.err={reason:t('e_required')}; rerender(); return; }
  const fee=Math.max(0,Math.round(Number(f.fee)||0)); const c=x.svcId&&svcById(x.svcId);
  x.decline={ at:Date.now(), by:S.userId, reason:f.reason.trim(), fee };
  if(c){ c.declined={ at:Date.now(), by:S.userId, reason:f.reason.trim(), quoteItems:c.items.map(i=>({...i})), quoteTotal:docTotal(c) };
    c.items = fee? [{ type:'other', desc:L(t0('Phí kiểm tra, chẩn đoán (khách không sửa)','Inspection & diagnosis fee (not repaired)')), qty:1, price:fee }] : [];
    c.status='declined'; delete S.ui['ed_'+c.id]; }
  tkLog(x,'declined','return_pending',f.reason.trim());
  notify(isExternal(me())?{toRole:'manager',key:'n_declined',vars:{no:x.no},ticketId:x.id}:{toCustomer:x.customerId,key:'n_declined_c',vars:{no:x.no},ticketId:x.id});
  S.ui.modal=null; save(); rerender(); toast(t('toast_declined'),'ok'); };
/* declined contracts are view-only and show the original quote */
const _svcItemsTable=svcItemsTable; svcItemsTable=function(c){ return (c.declined?`<div class="quote" style="border-color:var(--bad);margin:0 0 12px"><b>${t('quote_declined')}</b> — ${t('orig_quote')}: <span class="num">${money(c.declined.quoteTotal)}</span> (${c.declined.quoteItems.length} ${t('lines_short')}) · ${esc(c.declined.reason)}</div>`:'')+_svcItemsTable(c); };
SVC_CLS.declined=4;

Object.assign(DICT.vi,{
  st_TN:'Chờ phân loại', sec_intake:'Tiếp nhận thiết bị', intake_method:'Hình thức nhận', intake_date:'Ngày nhận', intake_cond:'Tình trạng ngoại quan', intake_loc:'Vị trí lưu kho', intake_loc_ph:'VD: Kệ chờ sửa A1',
  intake_acc:'Phụ kiện kèm theo', intake_acc_ph:'VD: nắp che, giắc AC, dongle WiNet-S', intake_note:'Ghi chú tình trạng', intake_note_ph:'VD: vỏ trầy góc trái, tem serial còn nguyên',
  im_walkin:'Khách mang tới SGE', im_courier:'Gửi qua vận chuyển', im_pickup:'KTV thu hồi tại công trình', im_onsite:'Kiểm tra tại công trình',
  cd_ok:'Bình thường', cd_scratch:'Trầy xước nhẹ', cd_dent:'Móp méo, nứt vỏ', cd_burn:'Cháy nổ', cd_water:'Vào nước', cd_missing:'Thiếu linh kiện / tem',
  cond_oos_hint:'Tình trạng này thường nằm ngoài phạm vi bảo hành.', intake_form_hint:'Phiếu tiếp nhận: ghi nhận thiết bị khi về đến SGE. Việc phân loại bảo hành hay sửa chữa tính phí làm sau khi kỹ thuật kiểm tra.',
  intake_self:'Tiếp nhận & tự kiểm tra', intake_queue:'Tiếp nhận, chờ phân công', received_by:'Người nhận', not_received_yet:'Chưa xác nhận nhận thiết bị.', received_ok:'Đã nhận', not_received_short:'Chưa nhận',
  act_intake_title:'Xác nhận đã nhận thiết bị', act_intake_desc:'Ghi nhận tình trạng thiết bị khi về đến SGE trước khi kiểm tra.', confirm_received:'Xác nhận đã nhận', toast_received:'Đã ghi nhận nhận thiết bị {no}', n_received:'{no}: SGE đã nhận thiết bị',
  classify:'Phân loại dịch vụ', cls_rw:'Bảo hành', cls_rw_d:'Lỗi trong phạm vi bảo hành, không thu phí linh kiện và công', cls_pr:'Sửa chữa tính phí', cls_pr_d:'Hết hạn bảo hành hoặc lỗi ngoài phạm vi, báo giá cho khách',
  suggested:'Gợi ý', why_inw:'Thiết bị còn bảo hành đến {d}.', why_outw:'Thiết bị đã hết bảo hành từ {d}.', why_cond:'Tình trạng khi nhận: {c} — thường ngoài phạm vi bảo hành.', why_unknown:'Không tìm thấy thông tin bảo hành của serial.',
  customer_declined:'Khách từ chối', decline_quote:'Từ chối báo giá', decline_explain:'Thiết bị sẽ không được sửa và được trả lại cho khách. Báo giá gốc vẫn được lưu lại trong hợp đồng.',
  decline_reason:'Lý do từ chối', decline_reason_ph:'VD: chi phí cao, khách mua máy mới…', inspection_fee:'Phí kiểm tra', fee_hint:'Để 0 nếu miễn phí kiểm tra. Phí này sẽ được xuất hóa đơn khi trả máy.',
  fee_policy:'Theo chính sách, phí kiểm tra {a} sẽ được thu khi trả máy.', fee_waived:'Ca bảo hành, không thu phí kiểm tra.', confirm_decline:'Xác nhận từ chối', toast_declined:'Đã ghi nhận khách từ chối báo giá',
  s_return_pending:'Chờ trả máy (không sửa)', step_return_pending:'Trả máy', act_return_title:'Trả máy không sửa chữa', act_return_desc:'Khách đã từ chối báo giá. Đóng gói và trả thiết bị cùng phụ kiện đã nhận.', confirm_return:'Xác nhận đã trả máy',
  return_wait_ext:'Bạn đã từ chối báo giá. SGE sẽ trả lại thiết bị cho bạn.', quote_declined:'Khách đã từ chối báo giá', orig_quote:'Báo giá gốc', lines_short:'hạng mục', sv_declined:'Khách từ chối',
  n_declined:'{no}: khách hàng từ chối báo giá', n_declined_c:'{no}: đã ghi nhận bạn từ chối báo giá, thiết bị sẽ được trả lại', n_returned_unrep:'{no}: thiết bị đã được gửi trả (không sửa)',
});
Object.assign(DICT.en,{
  st_TN:'Awaiting classification', sec_intake:'Device intake', intake_method:'Received via', intake_date:'Received on', intake_cond:'Physical condition', intake_loc:'Storage location', intake_loc_ph:'e.g. Repair shelf A1',
  intake_acc:'Accessories received', intake_acc_ph:'e.g. cover, AC plug, WiNet-S dongle', intake_note:'Condition notes', intake_note_ph:'e.g. scratch on left corner, serial label intact',
  im_walkin:'Customer drop-off', im_courier:'Courier', im_pickup:'Technician pick-up on site', im_onsite:'On-site inspection',
  cd_ok:'Normal', cd_scratch:'Light scratches', cd_dent:'Dented / cracked case', cd_burn:'Burnt', cd_water:'Water ingress', cd_missing:'Missing parts / label',
  cond_oos_hint:'This condition is usually outside warranty scope.', intake_form_hint:'Intake form: record the unit when it arrives at SGE. Warranty vs paid repair is decided after the technical check.',
  intake_self:'Receive & inspect myself', intake_queue:'Receive, wait for assignment', received_by:'Received by', not_received_yet:'Receipt of the unit not confirmed yet.', received_ok:'Received', not_received_short:'Not received',
  act_intake_title:'Confirm unit received', act_intake_desc:'Record the unit condition when it arrives at SGE, before inspection.', confirm_received:'Confirm received', toast_received:'Unit received for {no}', n_received:'{no}: SGE has received your unit',
  classify:'Service classification', cls_rw:'Warranty', cls_rw_d:'Fault within warranty, no charge for parts and labour', cls_pr:'Paid repair', cls_pr_d:'Out of warranty or out of scope, quote the customer',
  suggested:'Suggested', why_inw:'Unit is under warranty until {d}.', why_outw:'Warranty expired on {d}.', why_cond:'Condition at intake: {c} — usually outside warranty scope.', why_unknown:'No warranty record found for this serial.',
  customer_declined:'Customer declined', decline_quote:'Decline quote', decline_explain:'The unit will not be repaired and will be returned. The original quote stays on record.',
  decline_reason:'Reason', decline_reason_ph:'e.g. too expensive, buying a new unit…', inspection_fee:'Inspection fee', fee_hint:'Set 0 to waive. The fee is invoiced when the unit is returned.',
  fee_policy:'Per policy, an inspection fee of {a} is charged on return.', fee_waived:'Warranty job, no inspection fee.', confirm_decline:'Confirm decline', toast_declined:'Quote decline recorded',
  s_return_pending:'Awaiting return (unrepaired)', step_return_pending:'Return', act_return_title:'Return unit unrepaired', act_return_desc:'The customer declined the quote. Pack and return the unit with its accessories.', confirm_return:'Confirm returned',
  return_wait_ext:'You declined the quote. SGE will return your unit.', quote_declined:'Customer declined the quote', orig_quote:'Original quote', lines_short:'lines', sv_declined:'Declined',
  n_declined:'{no}: customer declined the quote', n_declined_c:'{no}: your decline was recorded, the unit will be returned', n_returned_unrep:'{no}: unit returned (not repaired)',
});

/* ---- separate bars: repair progress (ticket) and contract progress ---- */
const CBAR=['quote','sent','signed','in_progress','invoiced','paid','done'];
function contractBar(c){ if(c.status==='declined') return `<div class="quote" style="border-color:var(--bad);margin:0">${t('sv_declined')}${c.declined?' — '+esc(c.declined.reason):''}</div>`;
  let i=Math.max(0,CBAR.indexOf(c.status==='done'?'in_progress':c.status)); const pst=payState(c);
  if(c.invoice) i=Math.max(i,4); if(c.invoice&&(pst==='paid'||pst==='na')) i=Math.max(i,5); if(c.status==='done') i=(pst==='paid'||pst==='na')?6:Math.max(i,4);
  const fin=c.status==='done'&&(pst==='paid'||pst==='na');
  const dates={quote:c.at,signed:c.signedAt,invoiced:c.invoice&&c.invoice.at,paid:(c.payments||[]).length?c.payments[c.payments.length-1].at:null,done:c.doneAt};
  return `<div class="stepper">${CBAR.map((s,k)=>{ const done=k<i||fin; const cur=k===i&&!fin; return `<div class="step ${done?'done':''} ${cur?'cur':''}"><span class="c">${done?ic('check',12):k+1}</span><span>${t('cb_'+s)}</span>${(done||cur)&&dates[s]?`<small class="muted num">${fmtD(dates[s])}</small>`:''}</div>`; }).join('')}</div>`; }
Object.assign(DICT.vi,{ s_pending:'Chờ duyệt', s_approved:'Đã duyệt', step_pending:'Chờ duyệt', step_approved:'Đã duyệt',
  cb_quote:'Báo giá', cb_sent:'Gửi khách', cb_signed:'Ký hợp đồng', cb_in_progress:'Thực hiện', cb_invoiced:'Xuất hóa đơn', cb_paid:'Thanh toán', cb_done:'Hoàn tất', s_invoiced:'Đã xuất hóa đơn', s_paid:'Đã thanh toán' });
Object.assign(DICT.en,{ s_pending:'Pending approval', s_approved:'Approved', step_pending:'Pending', step_approved:'Approved',
  cb_quote:'Quote', cb_sent:'Sent', cb_signed:'Signed', cb_in_progress:'In progress', cb_invoiced:'Invoice', cb_paid:'Payment', cb_done:'Completed', s_invoiced:'Invoiced', s_paid:'Paid' });
