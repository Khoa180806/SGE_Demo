/* ===== File storage: images & log files (local demo or Google Drive via Apps Script) ===== */
const PENDING_FILES = {};   // attachment id -> original dataURL (kept in memory only, until uploaded)
function storageCfg(){
  const I=intg();
  if(!I.storage) I.storage={ mode:'local', folder:'', perTicket:true, maxMB:20, logExt:'.zip,.jpg,.jpeg,.png', reqImage:false, reqLog:false };
  if(I.storage.logExt==='.log,.csv,.txt,.zip,.xlsx,.dat') I.storage.logExt='.zip,.jpg,.jpeg,.png';
  return I.storage;
}
const driveFolderId = link => { const s=String(link||'').trim(); const m=s.match(/folders\/([A-Za-z0-9_-]{10,})/)||s.match(/[?&]id=([A-Za-z0-9_-]{10,})/); return m?m[1]:(/^[A-Za-z0-9_-]{15,}$/.test(s)?s:''); };
const storageReady = () => { const c=storageCfg(); return c.mode==='gdrive' && !!driveFolderId(c.folder) && !!intg().sheets.url; };

function readFiles(input, kind, cb){
  const cfg=storageCfg(); const max=(Number(cfg.maxMB)||20)*1024*1024;
  const files=[...input.files].slice(0,10); input.value='';
  const tooBig=files.filter(f=>f.size>max); if(tooBig.length) toast(t('file_too_big',{n:tooBig.map(f=>f.name).join(', '),mb:cfg.maxMB}),'bad');
  const ok=files.filter(f=>f.size<=max); let left=ok.length; const out=[]; if(!left) return;
  ok.forEach(file=>{
    const id='f'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const base={id,kind,name:file.name,size:file.size,mime:file.type||'',by:S.userId,at:Date.now(),up:'local'};
    const r=new FileReader();
    r.onload=()=>{
      PENDING_FILES[id]=r.result;
      if(kind==='image' && file.type.startsWith('image/')){
        const img=new Image(); img.onload=()=>{ const c=document.createElement('canvas'); const sc=Math.min(1,360/Math.max(img.width,img.height)); c.width=img.width*sc; c.height=img.height*sc; c.getContext('2d').drawImage(img,0,0,c.width,c.height); base.data=c.toDataURL('image/jpeg',0.72); out.push(base); if(--left===0) cb(out); };
        img.onerror=()=>{ out.push(base); if(--left===0) cb(out); }; img.src=r.result;
      } else { out.push(base); if(--left===0) cb(out); }
    };
    r.onerror=()=>{ out.push(base); if(--left===0) cb(out); };
    r.readAsDataURL(file);
  });
}

async function scriptCall(payload){
  const url=intg().sheets.url;
  if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(url)) return { ok:false, reason:'nourl' };
  try{ const r=await fetch(url,{ method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(payload) }); return await r.json(); }
  catch(e){ return { ok:false, reason:'blocked' }; }
}
async function uploadAttachments(x, list){
  const cfg=storageCfg();
  if(!storageReady()){ list.forEach(a=>{ a.up='local'; delete PENDING_FILES[a.id]; }); return; }
  for(const a of list){
    const raw=PENDING_FILES[a.id]; if(!raw){ a.up='local'; continue; }
    a.up='uploading'; save(); if(S.active==='t:'+x.id) rerender();
    const res=await scriptCall({ token:intg().sheets.token, action:'upload', folderId:driveFolderId(cfg.folder), perTicket:!!cfg.perTicket, ticket:x.no, kind:a.kind, name:a.name, mime:a.mime||'application/octet-stream', data:String(raw).split(',')[1]||'' });
    if(res&&res.ok){ a.up='done'; a.url=res.url; if(res.folderUrl) x.folderUrl=res.folderUrl; delete PENDING_FILES[a.id]; }
    else { a.up='failed'; a.err=res&&res.reason==='blocked'?'int_fetch_blocked':'upload_failed'; }
    save(); if(S.active==='t:'+x.id||S.active==='tickets') rerender();
  }
}
A.retryUpload = el => { const x=ticketById(el.dataset.id); const a=x.attachments.find(a=>a.id===el.dataset.f); if(!PENDING_FILES[a.id]){ toast(t('upload_lost'),'bad'); return; } uploadAttachments(x,[a]); };

function attachCard(a,extra){
  const src=imgSrc(a); const isImg=!!src;
  const st = a.up==='done'?`<span class="pill s-closed" style="height:20px">${t('up_done')}</span>`: a.up==='uploading'?`<span class="pill s-pending" style="height:20px">${t('up_uploading')}</span>`: a.up==='failed'?`<span class="pill s-rejected" style="height:20px" title="${esc(t(a.err||'upload_failed'))}">${t('up_failed')}</span>`:'';
  return `<div class="attach"><div class="pv">${isImg?`<button type="button" class="pv-btn" data-a="attView" data-f="${a.id||''}" aria-label="${esc(a.name)}"><img src="${src}" alt="${esc(a.name)}"></button>`:`<span style="display:flex;flex-direction:column;align-items:center;gap:4px">${ic('file',26)}<small class="mono" style="font-size:11px">${esc((a.name.split('.').pop()||'').toUpperCase())}</small></span>`}</div>
    <div class="meta"><div title="${esc(a.name)}">${a.url?`<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a>`:esc(a.name)}</div><small class="muted">${fmtNum(a.size/1024)} KB · ${esc(uname(a.by))}</small>${st?`<div style="margin-top:4px">${st}</div>`:''}${extra?`<div>${extra}</div>`:''}</div></div>`;
}
function storageNote(){
  const c=storageCfg();
  if(storageReady()) return `${ic('db',14)} ${t('store_drive')} <a href="${esc(c.folder)}" target="_blank" rel="noopener">${t('open_folder')}</a>${c.perTicket?` · ${t('store_per_ticket')}`:''}`;
  return `${ic('db',14)} ${t('store_local')}`;
}
function uploadZones(prefix, list, delAction, idAttr){
  const c=storageCfg(); const imgs=list.filter(a=>a.kind!=='log'), logs=list.filter(a=>a.kind==='log');
  const grid=(arr)=>arr.length?`<div class="attach-grid">${arr.map(a=>attachCard(a, delAction?`<button type="button" class="link-btn" style="color:var(--bad)" data-a="${delAction}" data-f="${a.id}">${t('delete')}</button>`:'')).join('')}</div>`:'';
  return `<div class="form-grid">
    <div class="field"><div class="row" style="justify-content:space-between"><span class="lbl ${c.reqImage?'req':''}">${t('images')}</span><label class="btn sm soft" style="cursor:pointer">${ic('upload',14)} ${t('upload_images')}<input type="file" accept="image/*" multiple data-file="${prefix}Imgs" ${idAttr||''} hidden></label></div>${grid(imgs)||``}</div>
    <div class="field"><div class="row" style="justify-content:space-between"><span class="lbl ${c.reqLog?'req':''}">${t('log_files')}</span><label class="btn sm soft" style="cursor:pointer">${ic('upload',14)} ${t('upload_logs')}<input type="file" accept="${esc(c.logExt)}" multiple data-file="${prefix}Logs" ${idAttr||''} hidden></label></div>${grid(logs)}</div>
  </div>`;
}

/* ---- settings card (inside Integrations) ---- */
function storageCard(){
  const c=storageCfg(); const fid=driveFolderId(c.folder);
  const sw=(k)=>`<span class="switch"><input type="checkbox" data-a="stToggle" data-k="${k}" ${c[k]?'checked':''}><span></span></span>`;
  return `<section class="card"><div class="card-h"><h3 class="row" style="gap:10px">${ic('upload',17)} ${t('store_title')} ${storageReady()?`<span class="pill s-closed">Google Drive</span>`:`<span class="pill s-draft">${t('store_local_short')}</span>`}</h3></div>
  <div class="card-b" style="display:flex;flex-direction:column;gap:14px">
    
    <div class="form-grid">
      <div class="field"><label for="st-mode">${t('store_mode')}</label><select class="select" id="st-mode" data-bind="intObj.storage.mode" data-re="intSave"><option value="local" ${c.mode==='local'?'selected':''}>${t('store_mode_local')}</option><option value="gdrive" ${c.mode==='gdrive'?'selected':''}>Google Drive (Apps Script)</option></select></div>
      <div class="field"><label for="st-max">${t('store_max')}</label><input class="input num" type="number" min="1" max="50" id="st-max" data-bind="intObj.storage.maxMB" data-num data-re="intSave" value="${c.maxMB}"></div>
      <div class="field full"><label for="st-folder">${t('store_folder')}</label><input class="input mono ${c.folder&&!fid?'err':''}" id="st-folder" data-bind="intObj.storage.folder" data-re="intSave" value="${esc(c.folder)}">${c.folder&&!fid?`<div class="err-text">${t('e_folder')}</div>`:fid?`<div class="hint">Folder ID: <span class="mono">${esc(fid)}</span></div>`:''}</div>
      <div class="field full"><label for="st-ext">${t('store_log_ext')}</label><input class="input mono" id="st-ext" data-bind="intObj.storage.logExt" data-re="intSave" value="${esc(c.logExt)}"></div>
      <label class="row" style="gap:10px;cursor:pointer">${sw('perTicket')}<span class="lbl">${t('store_per_ticket_opt')}</span></label>
      <span></span>
      <label class="row" style="gap:10px;cursor:pointer">${sw('reqImage')}<span class="lbl">${t('store_req_image')}</span></label>
      <label class="row" style="gap:10px;cursor:pointer">${sw('reqLog')}<span class="lbl">${t('store_req_log')}</span></label>
    </div>
    ${c.mode==='gdrive'&&!intg().sheets.url?`<div class="err-text">${t('store_need_url')}</div>`:''}
  </div></section>`;
}
A.stToggle = el => { const c=storageCfg(); c[el.dataset.k]=!c[el.dataset.k]; save(); rerender(); };

// ===== Ảnh trong khung chat (ticket + hỗ trợ kỹ thuật) =====
function chatKey(d){ return d.scope+':'+d.id+':'+(d.k||''); }
function chatPending(d){ S.ui.chatImgs=S.ui.chatImgs||{}; return S.ui.chatImgs[chatKey(d)]||(S.ui.chatImgs[chatKey(d)]=[]); }
function chatAttachBtn(scope,id,k){ return `<label class="btn icon-btn soft" style="cursor:pointer;height:44px;width:44px;padding:0;justify-content:center" title="${t('attach_image')}" aria-label="${t('attach_image')}">${ic('image',18)}<input type="file" accept="image/*" multiple data-file="chatImgs" data-scope="${scope}" data-id="${id}" data-k="${k||''}" hidden></label>`; }
function chatPendingHtml(scope,id,k){ const arr=chatPending({scope,id,k}); if(!arr.length) return ''; return `<div class="chat-pending">${arr.map(a=>`<div class="chat-thumb"><img src="${a.data||''}" alt="${esc(a.name)}"><button type="button" data-a="chatImgDel" data-scope="${scope}" data-id="${id}" data-k="${k||''}" data-f="${a.id}" aria-label="${t('delete')}">×</button></div>`).join('')}<small class="muted">${t('chat_imgs_ready',{n:arr.length})}</small></div>`; }
function msgImgs(m){ return (m.images&&m.images.length)?`<div class="msg-imgs">${m.images.map(a=>`<button type="button" class="msg-img" data-a="imgView" data-f="${a.id}" title="${esc(a.name)}"><img src="${imgSrc(a)}" alt="${esc(a.name)}"></button>`).join('')}</div>`:''; }
function takeChatImgs(d){ const arr=chatPending(d).slice(); S.ui.chatImgs[chatKey(d)]=[]; return arr; }
function findImg(fid){ if(!fid) return null; const scan=list=>{ for(const m of list||[]) for(const a of (m.images||[])) if(a.id===fid) return a; return null; };
  for(const x of DB.tickets){ const r=scan(x.conversation)||scan(x.internal)||(x.attachments||[]).find(a=>a.id===fid); if(r) return r; }
  for(const s of DB.support||[]){ const r=scan(s.messages)||(s.images||[]).find(a=>a.id===fid); if(r) return r; } return null; }
A.chatImgs = input => { const d={scope:input.dataset.scope,id:input.dataset.id,k:input.dataset.k||''}; const arr=chatPending(d); const room=10-arr.length; if(room<=0){ toast(t('sp_max_files'),'bad'); return; }
  readFiles(input,'image',out=>{ out.filter(a=>a.data).slice(0,room).forEach(a=>{ arr.push(a); const raw=PENDING_FILES[a.id]; if(raw){ const img=new Image(); img.onload=()=>{ const c=document.createElement('canvas'); const sc=Math.min(1,1280/Math.max(img.width,img.height)); c.width=img.width*sc; c.height=img.height*sc; c.getContext('2d').drawImage(img,0,0,c.width,c.height); a.big=c.toDataURL('image/jpeg',0.8); }; img.src=raw; } }); rerender(); }); };
A.chatImgDel = el => { const d={scope:el.dataset.scope,id:el.dataset.id,k:el.dataset.k||''}; const arr=chatPending(d); const i=arr.findIndex(a=>a.id===el.dataset.f); if(i>=0) arr.splice(i,1); rerender(); };
A.imgView = el => { const a=findImg(el.dataset.f); if(a) openModal({type:'img', f:a.id}); };
MODALS.img = m => { const a=findImg(m.f)||{}; const src=PENDING_FILES[a.id]||a.big||imgSrc(a)||''; return { wide:true, title:esc(a.name||t('images')), body:`<div style="text-align:center"><img src="${src}" alt="${esc(a.name||'')}" style="max-width:100%;max-height:70vh;border-radius:8px"></div><div class="muted" style="margin-top:8px;font-size:13px">${esc(uname(a.by))} · ${a.at?fmtDT(a.at):''}${a.url?` · <a href="${esc(a.url)}" target="_blank" rel="noopener">${t('open_folder')}</a>`:''}</div>`, foot:`<button class="btn" data-a="closeModal">${t('close')}</button>` }; };

// ===== Ảnh giả lập cho dữ liệu demo (tem serial, máy biến tần, màn hình lỗi) =====
const MOCK_IMG_CACHE={};
function isImgName(n){ return /\.(jpe?g|png|gif|webp)$/i.test(n||''); }
function hashStr(s){ let h=2166136261; for(const c of String(s)){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
function mockImgSrc(a){
  if(!a||!isImgName(a.name)) return '';
  const key=a.name; if(MOCK_IMG_CACHE[key]) return MOCK_IMG_CACHE[key];
  const sn=((a.name.match(/_([A-Z0-9]{8,14})\.[a-z]+$/i)||[])[1]||'A2460702017').toUpperCase();
  const h=hashStr(a.name); const dv=devBySn(sn); const model=(dv&&dv.model)||'SG110CX';
  const bars=()=>{ let x=60, out=''; let r=h; while(x<340){ r=Math.imul(r^ (r>>>13),1103515245)>>>0; const w=1+(r%3); out+=`<rect x="${x}" y="196" width="${w}" height="36" fill="#111"/>`; x+=w+1+((r>>>4)%3); } return out; };
  let svg;
  if(/tem|serial|label/i.test(a.name)){
    const tilt=((h%7)-3)*0.6;
    svg=`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfd3d6"/><stop offset="1" stop-color="#a9aeb3"/></linearGradient></defs><rect width="400" height="300" fill="url(#bg)"/>
    <g transform="rotate(${tilt} 200 150)"><rect x="34" y="28" width="332" height="244" rx="6" fill="#000" opacity=".18" transform="translate(4 5)"/><rect x="34" y="28" width="332" height="244" rx="6" fill="#fbfbf8"/>
    <text x="52" y="62" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700" fill="#265E8F" letter-spacing="1">SGE</text><text x="348" y="60" text-anchor="end" font-family="Arial" font-size="13" fill="#333">${model}</text>
    <line x1="52" y1="74" x2="348" y2="74" stroke="#ccc"/>
    ${['Max. PV input voltage   1100 V','Rated AC output power   '+(model.match(/\d+/)||['110'])[0]+' kW','Rated grid voltage   3/N/PE, 400 V','Protective class   I   ·   IP66'].map((l,i)=>`<text x="52" y="${96+i*20}" font-family="Arial" font-size="12" fill="#444">${l}</text>`).join('')}
    ${bars()}<text x="200" y="250" text-anchor="middle" font-family="Courier New,monospace" font-size="16" font-weight="700" fill="#111">S/N: ${sn}</text>
    <text x="348" y="262" text-anchor="end" font-family="Arial" font-size="11" font-weight="700" fill="#333">CE  ⚠</text></g>
    <rect width="400" height="300" fill="#fff" opacity="${(h%5)*0.02}"/></svg>`;
  } else if(/man_hinh|screen|loi|fault|error/i.test(a.name)){
    const code=dv&&DB.tickets.find(x=>x.products.some(p=>p.sn===sn))?.faultCode || '039';
    const fn=(typeof faultName==='function'?faultName(code):code).replace(/^\d+\s*·\s*/,'');
    svg=`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#2b2f33"/><rect x="40" y="36" width="320" height="228" rx="16" fill="#e9ebed"/><rect x="66" y="62" width="268" height="150" rx="6" fill="#0f2e3d"/>
    <text x="80" y="88" font-family="Arial" font-size="13" fill="#7fd3f0">${esc(model)}  ·  ${sn}</text><text x="80" y="124" font-family="Arial" font-size="24" font-weight="700" fill="#ff6b5a">Fault ${esc(code)}</text>
    <text x="80" y="150" font-family="Arial" font-size="13" fill="#d9eef6">${esc(String(fn).slice(0,34))}</text><text x="80" y="194" font-family="Arial" font-size="12" fill="#7fb6c9">State: Fault   Pac: 0.0 kW</text>
    <circle cx="96" cy="236" r="7" fill="#9aa1a6"/><circle cx="126" cy="236" r="7" fill="#e5483a"/><circle cx="156" cy="236" r="7" fill="#9aa1a6"/><text x="334" y="241" text-anchor="end" font-family="Arial" font-size="13" font-weight="700" fill="#265E8F">SGE</text></svg>`;
  } else {
    svg=`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8d4cc"/><stop offset="1" stop-color="#b9b4aa"/></linearGradient><linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f4f5f6"/><stop offset="1" stop-color="#d9dcdf"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#w)"/><rect x="0" y="250" width="400" height="50" fill="#8f8a80"/>
    <rect x="${108+(h%20)}" y="40" width="190" height="196" rx="10" fill="#000" opacity=".2" transform="translate(6 6)"/><rect x="${108+(h%20)}" y="40" width="190" height="196" rx="10" fill="url(#b)" stroke="#aab0b5"/>
    <rect x="${108+(h%20)}" y="40" width="190" height="34" rx="10" fill="#265E8F"/><text x="${203+(h%20)}" y="63" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#fff">SGE</text>
    <text x="${203+(h%20)}" y="104" text-anchor="middle" font-family="Arial" font-size="13" fill="#555">${esc(model)}</text>
    <circle cx="${180+(h%20)}" cy="132" r="5" fill="#3cb371"/><circle cx="${203+(h%20)}" cy="132" r="5" fill="${h%3?'#e5483a':'#9aa1a6'}"/><circle cx="${226+(h%20)}" cy="132" r="5" fill="#9aa1a6"/>
    ${[0,1,2,3,4,5].map(i=>`<rect x="${126+(h%20)+i*26}" y="236" width="12" height="16" fill="#333"/><path d="M${132+(h%20)+i*26} 252 q ${(i-2.5)*6} 30 ${(i-2.5)*14} 48" stroke="${i<3?'#c0392b':'#222'}" stroke-width="5" fill="none"/>`).join('')}
    <text x="12" y="290" font-family="Courier New,monospace" font-size="11" fill="#eee">${sn}</text></svg>`;
  }
  return MOCK_IMG_CACHE[key]='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function imgSrc(a){ return (a&&a.data&&a.data.startsWith('data:image'))?a.data:mockImgSrc(a); }
A.attView = el => openModal({type:'img', f:el.dataset.f});
