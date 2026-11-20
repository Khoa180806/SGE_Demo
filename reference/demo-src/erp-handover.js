/* ===== Biên bản giao nhận (receipt / delivery minutes) at each node: intake, return/delivery, sales delivery ===== */
const SGE_INFO = { company:'CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ SGE', phone:'0364422429', email:'sge.company2026@gmail.com', address:'12E1 đường số 4, KDC Vĩnh Phú 1, Phường Bình Hòa, TP Hồ Chí Minh, Việt Nam' };
const HO_FORM = { receive:{ code:'BM-SGE-001-002', title:'BIÊN BẢN NHẬN HÀNG', en:'RECEIPT MINUTES', prefix:'N' }, deliver:{ code:'BM-SGE-001-003', title:'BIÊN BẢN GIAO HÀNG', en:'DELIVERY MINUTES', prefix:'G' } };
const HO_CHECKS = {
  receive:['Có pallet khi vận chuyển','Có thùng carton, mút xốp','Vỏ thiết bị không cấn móp','Đầu nối MC4 bình thường','DC/AC Switch bình thường','Lưới che quạt tản nhiệt','Nhãn tên thiết bị','Cable gland','Module wifi đi kèm','AC terminal đi kèm','Terminal truyền thông đi kèm','Tay nắm biến tần đi kèm','Pad đỡ biến tần đi kèm'],
  deliver:['Có pallet khi vận chuyển','Có thùng carton, mút xốp','Có đủ phụ kiện bên B đã bàn giao'],
};
const HO_OTHER = { receive:'Các phụ kiện khác (liệt kê chi tiết)', deliver:'Các thông tin khác (liệt kê chi tiết)' };
const HO_RECOMMEND = '- Kiểm tra điện áp, điện trở cách điện của hệ thống PV, AC trước khi đóng điện.';
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function hoNo(kind,ts){ const d=new Date(ts||Date.now()); let h=d.getHours(); const ap=h>=12?'PM':'AM'; h=h%12||12;
  return `${HO_FORM[kind].prefix}-${String(d.getDate()).padStart(2,'0')}-${MON[d.getMonth()]}-${String(d.getFullYear()).slice(2)}-${String(h).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} ${ap}`; }
const letter = i => String.fromCharCode(97+i);
function sgeParty(u){ u=u||me()||{}; return { company:SGE_INFO.company, phone:SGE_INFO.phone, email:SGE_INFO.email, address:SGE_INFO.address, rep:String(u.name||'').toUpperCase(), title:u.title?t(u.title):'' }; }
function custParty(cid,fallback){ const c=custById(cid)||{}; const f=fallback||{}; return { company:String(c.company||f.company||'').toUpperCase(), phone:c.phone||f.phone||'', email:c.email||f.email||'', address:c.address||f.address||'', rep:(c.contact||f.contact||''), title:'' }; }
const hoList = (refKind,refId) => (DB.handovers||[]).filter(h=>h.ref&&h.ref.kind===refKind&&h.ref.id===refId);

/* ---- create from a node ---- */
function hoDraft(kind,ref){
  const at=Date.now(); let A_, B_, items=[], other='', recommend=kind==='deliver'?HO_RECOMMEND:'';
  if(ref.kind==='ticket'){ const x=ticketById(ref.id);
    const cust=custParty(x.customerId,{company:x.customer.company,phone:x.customer.phone,email:x.customer.email,address:x.address,contact:x.customer.contact});
    items=x.products.map(p=>({ desc:`Biến tần ${p.model}`, qty:p.qty||1, sn:p.sn, note:kind==='deliver'&&x.decline?'Trả lại, không sửa chữa':'' }));
    if(kind==='receive'){ A_=cust; B_=sgeParty(); other=(x.intake&&x.intake.acc)||''; } else { A_=sgeParty(); B_=cust; other=x.decline?`Khách từ chối báo giá: ${x.decline.reason}`:''; }
  } else if(ref.kind==='so'){ const so=soById(ref.id); A_=sgeParty(); B_=custParty(so.customerId);
    items=so.items.map(i=>({ desc:i.name||(stockBy(i.pn)||{}).name||i.pn, qty:i.qty, sn:'', note:i.pn })); }
  const n=HO_CHECKS[kind].length; const checks={}; for(let i=0;i<n;i++) checks[letter(i)]= kind==='receive'&&ref.kind==='ticket'&&ticketById(ref.id).intake&&['dent','burn'].includes(ticketById(ref.id).intake.cond)&&i===2?'no':'';
  return { kind, ref, no:hoNo(kind,at), at, A:A_, B:B_, items, checks, checkNotes:{}, other, recommend, signA:'', signB:'' };
}
A.hoNew = el => { const ref={kind:el.dataset.rk,id:el.dataset.rid}; openModal({type:'hoForm', f:hoDraft(el.dataset.kind,ref)}); };
A.hoOpen = el => { const h=(DB.handovers||[]).find(x=>x.id===el.dataset.id); openModal({type:'hoView', id:h.id}); };

/* ---- form ---- */
MODALS.hoForm = m => { const f=m.f; const F=HO_FORM[f.kind]; const b=p=>`data-bind="modal.f.${p}"`;
  const party=(k,label,isSge)=>`<div class="ho-party"><div class="row" style="justify-content:space-between"><b>${label}</b>${isSge?`<span class="chip">${t('ho_default_sge')}</span>`:''}</div>
    <div class="form-grid" style="margin-top:8px"><div class="field full"><label>${t('company')}</label><input class="input" ${b(k+'.company')} value="${esc(f[k].company)}"></div>
    <div class="field"><label>${t('phone')}</label><input class="input" ${b(k+'.phone')} value="${esc(f[k].phone)}"></div><div class="field"><label>Email</label><input class="input" ${b(k+'.email')} value="${esc(f[k].email)}"></div>
    <div class="field full"><label>${t('address')}</label><input class="input" ${b(k+'.address')} value="${esc(f[k].address)}"></div>
    <div class="field"><label>${(f.kind==='receive')===(k==='B')?(f.kind==='receive'?t('ho_receiver'):t('ho_rep')):(f.kind==='deliver'&&k==='A'?t('ho_deliverer'):t('ho_rep'))}</label><input class="input" ${b(k+'.rep')} value="${esc(f[k].rep)}"></div><div class="field"><label>${t('title_col')}</label><input class="input" ${b(k+'.title')} value="${esc(f[k].title)}"></div></div></div>`;
  return { wide:true, title:`${F.title} · <span class="mono" style="font-weight:500">${F.code}</span>`, body:`<div class="ho-form">
    <div class="field"><label>${t('ho_no')}</label><div class="row" style="flex-wrap:nowrap"><input class="input mono" ${b('no')} value="${esc(f.no)}"><button class="btn sm" data-a="hoNow">↻ ${t('ho_now')}</button></div></div>
    <h4>1. ${t('ho_s1')}</h4><div class="ho-parties">${party('A',t('ho_partyA'),f.kind==='deliver')}${party('B',t('ho_partyB'),f.kind==='receive')}</div>
    <h4>2. ${t('ho_s2')}</h4><div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl items-edit"><thead><tr><th style="width:40px">#</th><th>${t('ho_desc')}</th><th style="width:80px">${t('qty_l')}</th><th style="width:170px">Series Number</th><th>${t('note_l')}</th><th style="width:40px"></th></tr></thead><tbody>
      ${f.items.map((it,i)=>`<tr><td>${i+1}</td><td><input class="input" ${b(`items.${i}.desc`)} value="${esc(it.desc)}"></td><td><input class="input num" type="number" min="1" data-num ${b(`items.${i}.qty`)} value="${it.qty}"></td><td><input class="input mono" ${b(`items.${i}.sn`)} value="${esc(it.sn)}"></td><td><input class="input" ${b(`items.${i}.note`)} value="${esc(it.note)}"></td><td><button class="btn sm ghost" style="color:var(--bad)" data-a="hoRowDel" data-i="${i}" aria-label="${t('delete')}">${ic('trash',14)}</button></td></tr>`).join('')}
      <tr><td colspan="6"><button class="btn sm soft" data-a="hoRowAdd">${ic('plus',14)} ${t('ho_add_row')}</button></td></tr></tbody></table></div>
    <h4>3. ${f.kind==='receive'?t('ho_s3r'):t('ho_s3d')} <button class="btn sm" style="margin-left:8px" data-a="hoAllYes">${t('ho_all_yes')}</button></h4>
    <div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl ho-checks"><thead><tr><th>${t('ho_check_item')}</th><th style="width:70px;text-align:center">Có</th><th style="width:70px;text-align:center">Không</th><th>${t('note_l')}</th></tr></thead><tbody>
      ${HO_CHECKS[f.kind].map((c,i)=>{ const k=letter(i); return `<tr><td>${k}. ${c}</td>${['yes','no'].map(v=>`<td style="text-align:center"><input type="radio" name="hoc-${k}" value="${v}" ${b('checks.'+k)} ${f.checks[k]===v?'checked':''} aria-label="${v}"></td>`).join('')}<td><input class="input" style="height:32px" ${b('checkNotes.'+k)} value="${esc(f.checkNotes[k]||'')}"></td></tr>`; }).join('')}
      <tr><td colspan="4"><label class="lbl">${letter(HO_CHECKS[f.kind].length)}. ${HO_OTHER[f.kind]}</label><input class="input" style="margin-top:6px" ${b('other')} value="${esc(f.other)}"></td></tr></tbody></table></div>
    ${f.kind==='deliver'?`<h4>4. ${t('ho_recommend')}</h4><textarea class="textarea" ${b('recommend')} style="min-height:70px" placeholder="${t('ho_recommend_ph')}">${esc(f.recommend)}</textarea><div class="hint">${t('ho_recommend_hint')}</div>`:''}
    <h4>${f.kind==='deliver'?5:4}. ${t('ho_sign')}</h4><div class="ho-parties">${['A','B'].map(k=>`<div class="ho-party"><div class="row" style="justify-content:space-between"><b>${t('ho_rep_'+k)}</b><button class="btn sm ghost" data-a="hoSigClear" data-k="${k}">${t('ho_clear_sig')}</button></div><canvas class="sig-pad" data-sig="${k}" aria-label="${t('ho_sign_here')}"></canvas><div class="hint" style="text-align:center">${esc(f[k].rep||'')}</div></div>`).join('')}</div>
    <div class="hint">${t('ho_sign_tip')}</div></div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn" data-a="hoSave" data-print="1">${ic('file',15)} ${t('ho_save_print')}</button><button class="btn primary" data-a="hoSave">${t('save')}</button>` }; };
A.hoNow = () => { const f=S.ui.modal.f; f.at=Date.now(); f.no=hoNo(f.kind,f.at); rerender(); };
A.hoRowAdd = () => { S.ui.modal.f.items.push({desc:'',qty:1,sn:'',note:''}); rerender(); };
A.hoRowDel = el => { S.ui.modal.f.items.splice(+el.dataset.i,1); rerender(); };
A.hoAllYes = () => { const f=S.ui.modal.f; HO_CHECKS[f.kind].forEach((c,i)=>f.checks[letter(i)]='yes'); rerender(); };
A.hoSigClear = el => { S.ui.modal.f['sign'+el.dataset.k]=''; rerender(); };
A.hoSave = el => { const f=S.ui.modal.f; const u=me();
  const h=Object.assign({ id:'ho'+Date.now().toString(36), createdBy:u.id, createdAt:Date.now() }, JSON.parse(JSON.stringify(f)));
  DB.handovers=DB.handovers||[]; DB.handovers.unshift(h);
  if(h.ref.kind==='ticket'){ const x=ticketById(h.ref.id); if(x){ x.history.push({at:Date.now(),by:u.id,action:h.kind==='receive'?'ho_receive':'ho_deliver',from:x.status,to:x.status,note:h.no}); } }
  S.ui.modal=null; save(); rerender(); toast(t('ho_saved',{no:h.no}),'ok'); if(el.dataset.print) hoPrint(h); };
MODALS.hoView = m => { const h=DB.handovers.find(x=>x.id===m.id);
  return { wide:true, title:`${HO_FORM[h.kind].title} · <span class="mono" style="font-weight:500">${esc(h.no)}</span>`, body:`<div class="ho-preview">${hoDocHtml(h)}</div>`,
    foot:`<button class="btn" data-a="closeModal">${t('close')}</button><button class="btn primary" data-a="hoPrintBtn" data-id="${h.id}">${ic('file',15)} ${t('ho_print')}</button>` }; };
A.hoPrintBtn = el => hoPrint(DB.handovers.find(x=>x.id===el.dataset.id));

/* ---- signature pads ---- */
const _afterRender0=afterRender; afterRender=function(){ _afterRender0(); document.querySelectorAll('canvas[data-sig]').forEach(cv=>{
  const k='sign'+cv.dataset.sig; const r=cv.getBoundingClientRect(); const dpr=window.devicePixelRatio||1; cv.width=Math.max(1,r.width*dpr); cv.height=Math.max(1,r.height*dpr);
  const ctx=cv.getContext('2d'); ctx.scale(dpr,dpr); ctx.lineWidth=2; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#111';
  const f=S.ui.modal&&S.ui.modal.f; if(f&&f[k]){ const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,r.width,r.height); img.src=f[k]; }
  let drawing=false; const pos=e=>{ const b=cv.getBoundingClientRect(); return [e.clientX-b.left,e.clientY-b.top]; };
  cv.addEventListener('pointerdown',e=>{ drawing=true; cv.setPointerCapture(e.pointerId); const [x,y]=pos(e); ctx.beginPath(); ctx.moveTo(x,y); });
  cv.addEventListener('pointermove',e=>{ if(!drawing) return; const [x,y]=pos(e); ctx.lineTo(x,y); ctx.stroke(); });
  const end=()=>{ if(!drawing) return; drawing=false; if(S.ui.modal&&S.ui.modal.f) S.ui.modal.f[k]=cv.toDataURL('image/png'); };
  cv.addEventListener('pointerup',end); cv.addEventListener('pointerleave',end);
}); };

/* ---- A4 document ---- */
function hoDocHtml(h){ const F=HO_FORM[h.kind]; const e=s=>esc(s||''); const n=HO_CHECKS[h.kind].length;
  const p=(lbl,P,head)=>`<tr><td colspan="2"><b>${lbl}</b>${head?`&nbsp;&nbsp;&nbsp;&nbsp;<b>${e(P.company)}</b>`:''}</td></tr>${head?'':`<tr><td style="width:110px">Tên công ty:</td><td>${e(P.company)}</td></tr>`}
    <tr><td style="width:110px">SĐT:</td><td>${e(P.phone)}</td></tr><tr><td>Email:</td><td>${e(P.email)}</td></tr><tr><td>Địa chỉ:</td><td>${e(P.address)}</td></tr><tr><td>Đại diện:</td><td><span style="display:inline-block;min-width:55%">${e(P.rep)}</span>Chức vụ: ${e(P.title)}</td></tr>`;
  const rows=Math.max(4,h.items.length);
  return `<div class="a4">
  <table class="hd"><tr><td style="width:24%;text-align:center"><img src="${ASSETS.logo}" alt="SGE" style="height:46px"></td><td style="text-align:center"><div class="t1">${F.title}</div><div class="t1">${F.en}</div></td><td style="width:30%">Số/Number: ${F.code}<br>Lần ban hành/Issue time: 00</td></tr></table>
  <p class="no"><i>Số/No: ${e(h.no)}</i></p>
  <div class="sec">1. THÔNG TIN GIAO NHẬN HÀNG HÓA</div>
  <table class="info">${p(h.kind==='receive'?'Đại diện bên gửi (Bên A):':'Đại diện bên giao (Bên A):',h.A,h.kind==='deliver')}${p('Đại diện bên nhận (Bên B):',h.B,h.kind==='receive')}</table>
  <table class="grid"><tr><th colspan="5" class="l">2. THÔNG TIN SẢN PHẨM</th></tr><tr><th style="width:7%">STT</th><th>Thiết bị/ Mô tả</th><th style="width:11%">Số Lượng</th><th style="width:20%">Series Number</th><th style="width:28%">Ghi chú</th></tr>
    ${Array.from({length:rows},(_,i)=>{ const it=h.items[i]; return `<tr><td class="c">${i+1}</td><td>${it?e(it.desc):''}</td><td class="c">${it?e(it.qty):''}</td><td class="c">${it?e(it.sn):''}</td><td>${it?e(it.note):''}</td></tr>`; }).join('')}</table>
  <table class="grid"><tr><th colspan="4" class="l">3. ${h.kind==='receive'?'KIỂM TRA NGOẠI QUAN HÀNG HÓA':'KIỂM TRA HÀNG HÓA KHI GIAO HÀNG'}</th></tr><tr><td>Thông tin cần kiểm tra</td><td class="c" style="width:9%">Có</td><td class="c" style="width:9%">Không</td><td class="c" style="width:38%">Ghi chú</td></tr>
    ${HO_CHECKS[h.kind].map((c,i)=>{ const k=letter(i); return `<tr><td>${k}. ${c}</td><td class="c">${h.checks[k]==='yes'?'☑':'☐'}</td><td class="c">${h.checks[k]==='no'?'☑':'☐'}</td><td>${e((h.checkNotes||{})[k])}</td></tr>`; }).join('')}
    <tr><td>${letter(n)}. ${HO_OTHER[h.kind]}:</td><td colspan="3">${e(h.other)||'………'}</td></tr></table>
  ${h.kind==='deliver'&&String(h.recommend||'').trim()?`<table class="grid"><tr><th class="l">4. KHUYẾN NGHỊ</th></tr><tr><td style="white-space:pre-wrap">${e(h.recommend)}</td></tr></table>`:''}
  <p class="agree"><i>Các bên cùng thống nhất với nội dung trên, biên bản này được lập thành 02 bản. Bên A giữ 01 bản, bên B giữ 01 bản.</i></p>
  <table class="sign"><tr><td>ĐẠI DIỆN BÊN A</td><td>ĐẠI DIỆN BÊN B</td></tr><tr><td class="s">${h.signA?`<img src="${h.signA}" alt="">`:''}</td><td class="s">${h.signB?`<img src="${h.signB}" alt="">`:''}</td></tr><tr><td><b>${e(h.A.rep)}</b></td><td><b>${e(h.B.rep)}</b></td></tr></table>
  <div class="ft"><span>SGE TRADING AND SERVICE CO., LTD</span><span>1</span></div></div>`; }
const HO_CSS=`.a4{font-family:"Times New Roman",Times,serif;color:#000;font-size:13px;line-height:1.35;background:#fff;padding:14mm 14mm 10mm;width:210mm;max-width:100%;box-sizing:border-box;margin:0 auto}
.a4 table{width:100%;border-collapse:collapse}.a4 .hd td{border:1px solid #000;padding:6px 8px;vertical-align:middle}.a4 .t1{font-weight:700;font-size:15px}
.a4 .no{margin:10px 0 4px}.a4 .sec{font-weight:700;margin:4px 0}.a4 .info td{padding:1px 4px;vertical-align:top}
.a4 .grid{margin-top:10px}.a4 .grid th,.a4 .grid td{border:1px solid #000;padding:2px 6px;font-weight:400}.a4 .grid th{font-weight:400;text-align:center}.a4 .grid th.l{text-align:left;font-weight:700}.a4 .grid td{height:18px}.a4 .c{text-align:center}
.a4 .agree{margin:12px 0 8px}.a4 .sign td{text-align:center;width:50%;vertical-align:top}.a4 .sign td.s{height:90px}.a4 .sign img{max-height:86px;max-width:90%}
.a4 .ft{display:flex;justify-content:space-between;margin-top:24px;font-size:12px}`;
function hoPrint(h){ const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(h.no)}</title><style>@page{size:A4;margin:0}body{margin:0;background:#fff}${HO_CSS}</style></head><body>${hoDocHtml(h)}</body></html>`;
  const fr=document.createElement('iframe'); fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(fr);
  const d=fr.contentWindow.document; d.open(); d.write(html); d.close();
  setTimeout(()=>{ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ toast(t('ho_print_fail'),'bad'); } setTimeout(()=>fr.remove(),2000); },350); }
(function(){ const s=document.createElement('style'); s.textContent=HO_CSS.replace(/\.a4/g,'.ho-preview .a4')+`.ho-preview{background:#e9ebef;padding:12px;border-radius:8px;overflow:auto}.ho-preview .a4{box-shadow:0 2px 10px rgba(0,0,0,.15)}`; document.head.appendChild(s); })();

/* ---- node widgets ---- */
function hoWidget(refKind,refId,kinds){ const list=hoList(refKind,refId); const canMake=!isExternal(me())&&(can('ticket_repair')||can('ticket_diagnose')||can('stock_move')||can('so_manage')||can('ticket_assign'));
  return `<div class="ho-box"><div class="row" style="justify-content:space-between"><span class="lbl">${t('ho_title')}</span><span class="row" style="gap:6px">${canMake?kinds.map(k=>`<button class="btn sm soft" data-a="hoNew" data-kind="${k}" data-rk="${refKind}" data-rid="${refId}">${ic('plus',14)} ${k==='receive'?t('ho_new_receive'):t('ho_new_deliver')}</button>`).join(''):''}</span></div>
    ${list.length?`<div class="ho-list">${list.map(h=>`<button class="ho-item" data-a="hoOpen" data-id="${h.id}">${ic('file',15)} <b>${HO_FORM[h.kind].title}</b> <span class="mono">${esc(h.no)}</span> <small class="muted">${fmtDT(h.createdAt)} · ${esc(uname(h.createdBy))}${h.signA&&h.signB?' · '+t('ho_signed'):''}</small></button>`).join('')}</div>`:`<div class="hint" style="margin-top:6px">${t('ho_none')}</div>`}</div>`; }
/* ticket: intake section gets "receive", delivery gets "deliver" */
const _intakeSection0=intakeSection; intakeSection=function(x){ const html=_intakeSection0(x); const kinds=[]; if(x.intake) kinds.push('receive'); if(x.delivery||['delivered','invoiced','paid','closed','return_pending'].includes(x.status)) kinds.push('deliver');
  return html.replace(/<\/div><\/section>$/, `${hoWidget('ticket',x.id,kinds)}</div></section>`); };
/* sales order: delivery minutes once delivered */
const _goodsTable0=goodsTable; goodsTable=function(d,po){ const html=_goodsTable0(d,po); if(po||!soById(d.id)||!['delivered','done'].includes(d.status)) return html; return html+hoWidget('so',d.id,['deliver']); };
/* nudge after intake / return */
const _intakeSave0=A.intakeSave; A.intakeSave=el=>{ _intakeSave0(el); const x=ticketById(el.dataset.id); if(x&&x.intake) openModal({type:'hoForm', f:hoDraft('receive',{kind:'ticket',id:x.id})}); };
const _returnU0=A.returnUnrepaired; A.returnUnrepaired=el=>{ _returnU0(el); openModal({type:'hoForm', f:hoDraft('deliver',{kind:'ticket',id:el.dataset.id})}); };
const _wfHo=A.wf; A.wf=(el,ev)=>{ const r=_wfHo(el,ev); if(el.dataset.op==='deliver'){ const x=ticketById(el.dataset.id); if(x&&x.status==='delivered') openModal({type:'hoForm', f:hoDraft('deliver',{kind:'ticket',id:x.id})}); } return r; };

Object.assign(DICT.vi,{ ho_title:'Biên bản giao nhận', ho_new_receive:'Biên bản nhận hàng', ho_new_deliver:'Biên bản giao hàng', ho_none:'Chưa lập biên bản.', ho_signed:'đã ký đủ',
  ho_no:'Số / No', ho_now:'Giờ hiện tại', ho_s1:'Thông tin giao nhận hàng hóa', ho_s2:'Thông tin sản phẩm', ho_s3r:'Kiểm tra ngoại quan hàng hóa', ho_s3d:'Kiểm tra hàng hóa khi giao hàng',
  ho_partyA:'Bên A – Bên gửi', ho_partyB:'Bên B – Bên nhận', ho_default_sge:'Mặc định SGE', ho_receiver:'Người nhận', ho_deliverer:'Người giao', ho_rep:'Người đại diện',
  ho_desc:'Thiết bị / Mô tả', ho_add_row:'Thêm dòng', ho_all_yes:'Tất cả “Có”', ho_check_item:'Thông tin cần kiểm tra', ho_recommend:'Khuyến nghị', ho_recommend_ph:'- Nội dung khuyến nghị cho khách hàng', ho_recommend_hint:'Để trống nếu không cần in mục Khuyến nghị.',
  ho_sign:'Chữ ký xác nhận', ho_rep_A:'Đại diện Bên A', ho_rep_B:'Đại diện Bên B', ho_clear_sig:'Xóa chữ ký', ho_sign_here:'Ký tên tại đây', ho_sign_tip:'Ký bằng chuột hoặc ngón tay trong khung. Xoay ngang điện thoại để có khung ký rộng hơn.',
  ho_save_print:'Lưu & in', ho_print:'In phiếu (A4)', ho_saved:'Đã lưu biên bản {no}', ho_print_fail:'Trình duyệt chặn in, hãy thử lại.' });
Object.assign(DICT.en,{ ho_title:'Handover minutes', ho_new_receive:'Receipt minutes', ho_new_deliver:'Delivery minutes', ho_none:'No minutes yet.', ho_signed:'fully signed',
  ho_no:'No.', ho_now:'Now', ho_s1:'Handover parties', ho_s2:'Products', ho_s3r:'Visual inspection', ho_s3d:'Checks on delivery',
  ho_partyA:'Party A – Sender', ho_partyB:'Party B – Receiver', ho_default_sge:'SGE default', ho_receiver:'Received by', ho_deliverer:'Delivered by', ho_rep:'Representative',
  ho_desc:'Device / Description', ho_add_row:'Add row', ho_all_yes:'All “Yes”', ho_check_item:'Check item', ho_recommend:'Recommendations', ho_recommend_ph:'- Recommendations for the customer', ho_recommend_hint:'Leave empty to omit this section from the print.',
  ho_sign:'Signatures', ho_rep_A:'Party A representative', ho_rep_B:'Party B representative', ho_clear_sig:'Clear', ho_sign_here:'Sign here', ho_sign_tip:'Sign with mouse or finger inside the box. Rotate your phone for a wider pad.',
  ho_save_print:'Save & print', ho_print:'Print (A4)', ho_saved:'Saved minutes {no}', ho_print_fail:'The browser blocked printing, please try again.' });
