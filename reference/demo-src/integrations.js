/* ===== Integrations: Google Sheets (Apps Script), Email ===== */
const INT_EVENTS = ['submitted','approved','transfer','returned','rejected','delivered','closed'];
const EMAIL_PH = ['ticket_no','customer','contact','serial','model','status','contract_no','distributor','center','note','date'];
function defaultIntegrations(){
  const tpl = {
    submitted:{on:true, subject:'[SGE] Đã tiếp nhận yêu cầu bảo hành {ticket_no}', body:'Kính gửi {contact},\n\nSGE đã tiếp nhận yêu cầu bảo hành {ticket_no} cho thiết bị {model} (serial {serial}).\nNhà phân phối {distributor} sẽ liên hệ với Quý khách trong thời gian sớm nhất.\n\nTrân trọng,\nSGE - Chăm sóc khách hàng'},
    transfer:{on:false, subject:'[SGE] Thiết bị của yêu cầu {ticket_no} đã chuyển đến {center}', body:'Kính gửi {contact},\n\nThiết bị (serial {serial}) của yêu cầu {ticket_no} đã được chuyển đến {center} để tiếp tục xử lý.\n{note}\n\nTrân trọng,\nSGE - Chăm sóc khách hàng'},
    approved:{on:true, subject:'[SGE] Yêu cầu {ticket_no} đã được duyệt bảo hành', body:'Kính gửi {contact},\n\nYêu cầu {ticket_no} (serial {serial}) đã được SGE duyệt bảo hành. Số hợp đồng: {contract_no}.\nKỹ thuật viên sẽ tiến hành xử lý và thông báo khi hoàn tất.\n\nTrân trọng,\nSGE - Chăm sóc khách hàng'},
    returned:{on:false, subject:'[SGE] Cần bổ sung thông tin cho {ticket_no}', body:'Kính gửi {contact},\n\nYêu cầu {ticket_no} cần bổ sung thông tin: {note}\n\nTrân trọng,\nSGE - Chăm sóc khách hàng'},
    rejected:{on:true, subject:'[SGE] Kết quả xét duyệt bảo hành {ticket_no}', body:'Kính gửi {contact},\n\nRất tiếc, yêu cầu {ticket_no} (serial {serial}) không đủ điều kiện bảo hành.\nLý do: {note}\n\nVui lòng liên hệ {distributor} để được hỗ trợ thêm.\n\nTrân trọng,\nSGE - Chăm sóc khách hàng'},
    delivered:{on:true, subject:'[SGE] Thiết bị {model} ({serial}) đã được giao trả', body:'Kính gửi {contact},\n\nThiết bị {model}, serial {serial} thuộc yêu cầu {ticket_no} đã được xử lý xong và giao trả ngày {date}.\n\nTrân trọng,\nSGE - Chăm sóc khách hàng'},
    closed:{on:true, subject:'[SGE] Hoàn tất yêu cầu {ticket_no}', body:'Kính gửi {contact},\n\nYêu cầu {ticket_no} đã hoàn tất. Cảm ơn Quý khách đã tin dùng sản phẩm SGE.\nMời Quý khách đánh giá chất lượng dịch vụ trên hệ thống chăm sóc khách hàng SGE.\n\nTrân trọng,\nSGE - Chăm sóc khách hàng'},
  };
  return {
    sheets:{ on:false, url:'', token:'SG-'+Math.random().toString(36).slice(2,10).toUpperCase(), sheet:'Tickets', events:['submitted','approved','rejected','delivered','closed'] },
    email:{ on:true, fromName:'SGE Customer Care', replyTo:'cskh@sge-demo.vn', ccDist:true, tpl },
    zalo:{ on:false, oaId:'', tpl:{ submitted:'', approved:'', rejected:'', delivered:'', closed:'' } },
    log:[],
  };
}
function intg(){ if(!DB.integrations) DB.integrations=defaultIntegrations(); const T=DB.integrations.email&&DB.integrations.email.tpl; if(T){ const d=defaultIntegrations().email.tpl; for(const k in d) if(!T[k]) T[k]=d[k]; } return DB.integrations; }

function ticketVars(x,note){
  const d=x.distributorId?distById(x.distributorId):null;
  return { ticket_no:x.no, customer:x.customer.company||'', contact:x.customer.contact||x.customer.company||'', serial:x.products.map(p=>p.sn).join(', '), model:x.products.map(p=>p.model).join(', '),
    status:t('s_'+x.status), contract_no:(x.svcId&&svcById(x.svcId)||{}).no||'—', distributor:d?d.name:'SGE', center:centerName(x.centerId), note:L(note)||'', date:fmtD(Date.now()) };
}
const fillTpl = (s,v) => String(s||'').replace(/\{(\w+)\}/g,(m,k)=>v[k]!=null?v[k]:m);
function ticketRow(x){
  return { no:x.no, gspNo:(x.svcId&&svcById(x.svcId)||{}).no||'', maNo:'', status:t('s_'+x.status), type:stName(x.type), serials:x.products.map(p=>p.sn).join(' '), models:x.products.map(p=>p.model).join(' '),
    customer:x.customer.company||'', email:x.customer.email||'', phone:x.customer.phone||'', province:x.province||'', distributor:x.distributorId?distById(x.distributorId).name:'', assignee:uname(x.assigneeId), faultCode:x.faultCode||'', description:L(x.description), center:centerName(x.centerId), createdAt:fmtDT(x.createdAt), createdBy:(x.creator&&x.creator.name)||uname(x.createdBy), approvedBy:x.approval?approverInfo(x.approval).name:'', approverEmail:x.approval?approverInfo(x.approval).email:'', approvedAt:x.approval?fmtDT(x.approval.at):'', folderUrl:x.folderUrl||'' };
}

/* called from logH on each status change */
function onTicketEvent(action,x,note){
  const ev = action==='submitted_req'?'submitted':action;
  if(!INT_EVENTS.includes(ev)) return;
  const I=intg(); const v=ticketVars(x,note);
  const entry={ id:'l'+Date.now()+Math.random().toString(36).slice(2,5), at:Date.now(), ev, ticketId:x.id, no:x.no, ch:[], status:'simulated', note:'' };
  const payload={ token:I.sheets.token, sheet:I.sheets.sheet, event:ev, sync:false, ticket:ticketRow(x) };
  if(I.sheets.on && I.sheets.events.includes(ev)){ payload.sync=true; entry.ch.push('sheets'); }
  const tp=I.email.tpl[ev];
  if(I.email.on && tp && tp.on && x.customer.email){
    const cc = I.email.ccDist && x.distributorId ? DB.users.filter(u=>u.distributorId===x.distributorId && u.active!==false).map(u=>u.email).join(',') : '';
    payload.email={ to:x.customer.email, cc, replyTo:x.customer.email||'', fromName:I.email.fromName, subject:fillTpl(tp.subject,v), body:fillTpl(tp.body,v) };
    entry.ch.push('email'); entry.email=payload.email;
  }
  if(!entry.ch.length) return;
  I.log.unshift(entry); I.log=I.log.slice(0,200);
  if((payload.sync||payload.email) && I.sheets.url){ postToScript(payload).then(ok=>{ entry.status=ok?'sent':'failed'; entry.noteKey=ok?'':'int_fetch_blocked'; save(); if(S.active==='admin'&&S.ui.adm&&S.ui.adm.tab==='integrations') rerender(); }); entry.status='sending'; }
  else entry.noteKey = (payload.sync||payload.email)? 'int_no_url' : '';
  if(entry.ch.includes('zalo') && entry.ch.length===1) entry.noteKey='int_zalo_sim';
  save();
}
async function postToScript(payload){
  const url=intg().sheets.url;
  if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(url)) return false;
  try{ await fetch(url,{ method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(payload) }); return true; }
  catch(e){ return false; }
}

function appsScriptCode(){
  const I=intg();
  return `// SGE Customer Care → Google Sheets + Gmail + Google Drive
// Dán vào: Google Sheet > Tiện ích mở rộng > Apps Script, rồi Deploy > Web app
const TOKEN = '${I.sheets.token}';
const HEADERS = ['Mã ticket','Số hợp đồng','','Trạng thái','Sự kiện cuối','Cập nhật lúc','Loại dịch vụ','Serial','Model','Khách hàng','Email KH','SĐT','Tỉnh/TP','Nhà phân phối','Trung tâm','Người phụ trách','Mã lỗi','Mô tả','Ngày tạo','Người tạo','Người duyệt','Email người duyệt','Thời gian duyệt','Link Record'];

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.token !== TOKEN) return out({ ok: false, error: 'bad token' });
  if (data.action === 'upload') return out(saveFile(data));
  if (data.sync) upsertRow(data);
  if (data.email && data.email.to) {
    MailApp.sendEmail({
      to: data.email.to, cc: data.email.cc || '', replyTo: data.email.replyTo || '',
      name: data.email.fromName || 'SGE Customer Care',
      subject: data.email.subject, body: data.email.body
    });
  }
  return out({ ok: true });
}

function upsertRow(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(data.sheet) || ss.insertSheet(data.sheet);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS).setFrozenRows(1);
  const t = data.ticket;
  const row = [t.no, t.gspNo, t.maNo, t.status, data.event, new Date(), t.type, t.serials, t.models,
               t.customer, t.email, t.phone, t.province, t.distributor, t.center, t.assignee, t.faultCode, t.description, t.createdAt, t.createdBy, t.approvedBy, t.approverEmail, t.approvedAt, t.folderUrl];
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().flat();
  const i = ids.indexOf(t.no);
  if (i > 0) sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);
}

// Lưu hình ảnh / log file vào Google Drive, mỗi ticket một thư mục con
function saveFile(d) {
  let folder = DriveApp.getFolderById(d.folderId);
  if (d.perTicket) {
    const it = folder.getFoldersByName(d.ticket);
    folder = it.hasNext() ? it.next() : folder.createFolder(d.ticket);
  }
  const blob = Utilities.newBlob(Utilities.base64Decode(d.data), d.mime || 'application/octet-stream', d.name);
  const file = folder.createFile(blob);
  return { ok: true, url: file.getUrl(), folderUrl: folder.getUrl() };
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
`;
}

function viewIntegrations(){
  const I=intg(); S.ui.intObj=I; const u=S.ui.int||(S.ui.int={showCode:false});
  const evChk=(path,list)=>INT_EVENTS.map(ev=>`<label class="row" style="gap:6px;flex-wrap:nowrap;cursor:pointer;font-size:13.5px"><input type="checkbox" data-a="intEv" data-path="${path}" data-ev="${ev}" ${list.includes(ev)?'checked':''} style="width:16px;height:16px;accent-color:var(--accent)">${t('ev_'+ev)}</label>`).join('');
  const sw=(path,on)=>`<span class="switch"><input type="checkbox" data-a="intToggle" data-path="${path}" ${on?'checked':''} aria-label="on/off"><span></span></span>`;
  const statusChip = on => on?`<span class="pill s-closed">${t('int_on')}</span>`:`<span class="pill s-draft">${t('int_off')}</span>`;
  return `<div class="card-b" style="display:flex;flex-direction:column;gap:16px">

  <section class="card"><div class="card-h"><h3 class="row" style="gap:10px">${ic('db',17)} Google Sheets ${statusChip(I.sheets.on)}</h3>${sw('sheets.on',I.sheets.on)}</div>
    <div class="card-b" style="display:flex;flex-direction:column;gap:14px">
      <div class="form-grid">
        <div class="field full"><label for="gs-url">${t('int_url')}</label><input class="input mono" id="gs-url" data-bind="intObj.sheets.url" data-re="intSave" value="${esc(I.sheets.url)}"></div>
        <div class="field"><label for="gs-sheet">${t('int_sheet')}</label><input class="input" id="gs-sheet" data-bind="intObj.sheets.sheet" data-re="intSave" value="${esc(I.sheets.sheet)}"></div>
        <div class="field"><label for="gs-token">${t('int_token')}</label><div class="row" style="flex-wrap:nowrap"><input class="input mono" id="gs-token" data-bind="intObj.sheets.token" data-re="intSave" value="${esc(I.sheets.token)}"><button class="btn sm" data-a="intNewToken">${t('int_regen')}</button></div></div>
      </div>
      <div class="field"><span class="lbl">${t('int_sync_on')}</span><div class="row" style="gap:18px">${evChk('sheets.events',I.sheets.events)}</div></div>
      <div class="row"><button class="btn" data-a="intTest">${ic('send',15)} ${t('int_test')}</button><button class="btn" data-a="intCode">${ic('file',15)} ${u.showCode?t('int_hide_code'):t('int_show_code')}</button></div>
      ${u.showCode?`<div class="field"><div class="row" style="justify-content:space-between"><span class="lbl">Apps Script</span><button class="btn sm" data-a="intCopy">${ic('copy',14)} ${t('copy')}</button></div><pre id="gs-code" style="margin:0;max-height:360px;overflow:auto;background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:12px;font-family:var(--mono);font-size:12px;line-height:1.5;white-space:pre">${esc(appsScriptCode())}</pre>
        <ol style="margin:4px 0 0;padding-left:20px;color:var(--ink-2);font-size:13.5px;line-height:1.7">${t('int_steps')}</ol></div>`:''}
    </div></section>

  ${storageCard()}

  <section class="card"><div class="card-h"><h3 class="row" style="gap:10px">${ic('send',17)} ${t('int_email')} ${statusChip(I.email.on)}</h3>${sw('email.on',I.email.on)}</div>
    <div class="card-b" style="display:flex;flex-direction:column;gap:14px">
      <div class="hint">${t('int_email_hint')}</div>
      <div class="form-grid">
        <div class="field"><label for="em-from">${t('int_from_name')}</label><input class="input" id="em-from" data-bind="intObj.email.fromName" data-re="intSave" value="${esc(I.email.fromName)}"></div>
        <div class="field"><label for="em-reply">${t('int_reply_to')}</label><input class="input" id="em-reply" value="${esc(t('int_reply_customer'))}" disabled></div>
        <label class="row full" style="gap:10px;cursor:pointer"><span class="switch"><input type="checkbox" data-a="intToggle" data-path="email.ccDist" ${I.email.ccDist?'checked':''}><span></span></span><span class="lbl">${t('int_cc_dist')}</span></label>
      </div>
      <div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--radius)"><table class="tbl"><thead><tr><th style="width:60px">${t('int_send')}</th><th>${t('int_event')}</th><th>${t('int_subject')}</th><th></th></tr></thead><tbody>
        ${INT_EVENTS.map(ev=>{ const tp=I.email.tpl[ev]; return `<tr><td><input type="checkbox" data-a="intTplOn" data-ev="${ev}" ${tp.on?'checked':''} style="width:16px;height:16px;accent-color:var(--accent)" aria-label="${t('ev_'+ev)}"></td><td class="nowrap">${t('ev_'+ev)}</td><td style="color:var(--ink-2)">${esc(tp.subject)}</td><td class="nowrap"><button class="btn sm ghost" data-a="intTplEdit" data-ev="${ev}">${ic('edit',14)} ${t('edit')}</button></td></tr>`; }).join('')}
      </tbody></table></div>
    </div></section>

  <section class="card"><div class="card-h"><h3>${t('int_log')}</h3><span class="hint">${t('int_log_hint')}</span></div>
    ${I.log.length?`<div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('time')}</th><th>${t('int_event')}</th><th>${t('ticket_no')}</th><th>${t('int_channels')}</th><th>${t('status')}</th><th></th></tr></thead><tbody>
    ${I.log.slice(0,30).map(l=>`<tr><td data-l="${t('time')}" class="num nowrap">${fmtDT(l.at)}</td><td data-l="${t('int_event')}">${t('ev_'+l.ev)}</td><td data-l="${t('ticket_no')}"><button class="link-btn mono" data-a="openTicket" data-id="${l.ticketId}">${l.no}</button></td>
      <td data-l="${t('int_channels')}">${l.ch.map(c=>`<span class="chip">${c==='sheets'?'Sheets':c==='email'?'Email':'Zalo'}</span>`).join(' ')}</td>
      <td data-l="${t('status')}"><span class="pill ${l.status==='sent'?'s-closed':l.status==='failed'?'s-rejected':l.status==='sending'?'s-pending':'s-draft'}">${t('ls_'+l.status)}</span>${l.noteKey?`<br><small class="muted">${esc(t(l.noteKey))}</small>`:''}</td>
      <td class="nowrap"><button class="btn sm ghost" data-a="intLogView" data-id="${l.id}">${t('view')}</button></td></tr>`).join('')}
    </tbody></table></div>`:`<div class="empty">${t('int_log_empty')}</div>`}
  </section>
  </div>`;
}
A.intSave = () => { save(); rerender(); };
A.intToggle = el => { const I=intg(); const [a,b]=el.dataset.path.split('.'); I[a][b]=!I[a][b]; save(); rerender(); toast(t('toast_saved'),'ok'); };
A.intEv = el => { const I=intg(); const [a,b]=el.dataset.path.split('.'); const arr=I[a][b]; const i=arr.indexOf(el.dataset.ev); if(i>=0) arr.splice(i,1); else arr.push(el.dataset.ev); save(); rerender(); };
A.intTplOn = el => { const tp=intg().email.tpl[el.dataset.ev]; tp.on=!tp.on; save(); rerender(); };
A.intNewToken = () => { intg().sheets.token='SG-'+Math.random().toString(36).slice(2,10).toUpperCase(); save(); rerender(); toast(t('int_token_changed'),'ok'); };
A.intCode = () => { S.ui.int.showCode=!S.ui.int.showCode; rerender(); };
A.intCopy = () => { const txt=appsScriptCode(); const done=()=>toast(t('copied'),'ok'); try{ navigator.clipboard.writeText(txt).then(done,()=>{ selectCode(); }); }catch(e){ selectCode(); } };
function selectCode(){ const el=document.getElementById('gs-code'); if(!el) return; const r=document.createRange(); r.selectNodeContents(el); const s=getSelection(); s.removeAllRanges(); s.addRange(r); toast(t('copy_manual')); }
A.intTest = async () => {
  const I=intg(); if(!I.sheets.url){ toast(t('int_no_url'),'bad'); return; }
  const x=DB.tickets.find(t=>t.approval&&t.approval.gspNo)||DB.tickets[0];
  const ok=await postToScript({ token:I.sheets.token, sheet:I.sheets.sheet, event:'test', sync:true, ticket:ticketRow(x) });
  I.log.unshift({ id:'l'+Date.now(), at:Date.now(), ev:'test', ticketId:x.id, no:x.no, ch:['sheets'], status:ok?'sent':'failed', noteKey:ok?'int_test_note':'int_fetch_blocked' }); save(); rerender();
  toast(ok?t('int_test_ok'):t('int_fetch_blocked'), ok?'ok':'bad');
};
A.intTplEdit = el => { const tp=intg().email.tpl[el.dataset.ev]; openModal({type:'tplEdit', ev:el.dataset.ev, subject:tp.subject, body:tp.body}); };
MODALS.tplEdit = m => {
  const x=DB.tickets.find(t=>t.status==='closed'&&t.approval)||DB.tickets[0]; const v=ticketVars(x,{vi:'Thiếu ảnh tem serial',en:'Missing serial label photo'});
  return { wide:true, title:`${t('int_tpl')} · ${t('ev_'+m.ev)}`, body:`
    <div class="field"><label for="tp-s">${t('int_subject')}</label><input class="input" id="tp-s" data-bind="modal.subject" data-live="noopLive" value="${esc(m.subject)}"></div>
    <div class="field"><label for="tp-b">${t('int_body')}</label><textarea class="textarea" id="tp-b" data-bind="modal.body" data-live="noopLive" style="min-height:180px;font-family:var(--font)">${esc(m.body)}</textarea></div>
    <div class="hint">${t('int_placeholders')}: ${EMAIL_PH.map(p=>`<button class="chip" style="border:0;cursor:pointer" data-a="tplIns" data-p="${p}">{${p}}</button>`).join(' ')}</div>
    <div class="field"><span class="lbl">${t('int_preview')} <small class="muted">(${x.no})</small></span><div style="border:1px solid var(--line);border-radius:6px;padding:12px 14px;background:var(--surface-2)"><div style="font-weight:600;margin-bottom:8px">${esc(fillTpl(m.subject,v))}</div><div style="white-space:pre-wrap;font-size:13.5px;color:var(--ink-2)">${esc(fillTpl(m.body,v))}</div></div></div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="tplSave">${t('save')}</button>` };
};
A.noopLive = () => { rerender(); };
A.tplIns = el => { const m=S.ui.modal; m.body=(m.body||'')+'{'+el.dataset.p+'}'; S._focus='tp-b'; rerender(); };
A.tplSave = () => { const m=S.ui.modal; const tp=intg().email.tpl[m.ev]; tp.subject=m.subject; tp.body=m.body; S.ui.modal=null; save(); rerender(); toast(t('toast_saved'),'ok'); };
A.intLogView = el => openModal({type:'logView', id:el.dataset.id});
MODALS.logView = m => { const l=intg().log.find(x=>x.id===m.id); return { wide:true, title:`${t('ev_'+l.ev)} · <span class="mono">${l.no}</span>`, body:`
  <div class="kv-grid">${kv(t('time'),fmtDT(l.at))}${kv(t('int_channels'),l.ch.join(', '))}${kv(t('status'),t('ls_'+l.status))}</div>
  ${l.email?`<div class="field"><span class="lbl">Email</span><div style="border:1px solid var(--line);border-radius:6px;padding:12px 14px;background:var(--surface-2);font-size:13.5px"><div><span class="muted">${t('int_to')}:</span> ${esc(l.email.to)}</div>${l.email.cc?`<div><span class="muted">CC:</span> ${esc(l.email.cc)}</div>`:''}<div style="font-weight:600;margin:8px 0">${esc(l.email.subject)}</div><div style="white-space:pre-wrap;color:var(--ink-2)">${esc(l.email.body)}</div></div></div>`:''}
  ${l.zalo?`<div class="field"><span class="lbl">Zalo</span><div class="quote">${t('phone')}: ${esc(l.zalo.phone)} · Template: <span class="mono">${esc(l.zalo.template)}</span></div></div>`:''}
  ${l.noteKey?`<div class="hint">${esc(t(l.noteKey))}</div>`:''}`, foot:`<button class="btn" data-a="closeModal">${t('close')}</button>` }; };
