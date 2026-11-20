/* ===== Catalog (master data): view, edit, CSV import/export ===== */
const isoD = ts => ts ? toISODate(ts) : '';
const parseD = v => { v=String(v||'').trim(); if(!v) return null; let m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if(m) return new Date(+m[1],+m[2]-1,+m[3],12).getTime(); m=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m) return new Date(+m[3],+m[2]-1,+m[1],12).getTime(); return NaN; };
const parseBool = v => /^(1|true|yes|y|có|co|x)$/i.test(String(v==null?'':v).trim());
const isMulti = fd => fd.type==='provinces'||fd.type==='multi';
const multiList = fd => fd.type==='provinces'?PROVINCES:fd.list();
const countParts = pn => DB.tickets.reduce((s,x)=>s+x.parts.filter(q=>q.pn===pn).reduce((a,q)=>a+q.qty,0),0);

const CAT = {
  devices:{
    label:'ct_devices', list:()=>DB.devices, key:'sn', paged:true,
    search:d=>d.sn+' '+d.model+' '+d.project+' '+d.province+' '+(distById(d.distributorId)?.short||''),
    fields:[
      {k:'sn',l:'serial_no',type:'text',req:true,key:true,mono:true},
      {k:'model',l:'product_model',type:'select',req:true,opts:()=>MODELS.map(m=>[m.id,m.id])},
      {k:'pn',l:'product_code',type:'select',opts:()=>[['',t('pn_from_model')],...PRODUCTS.map(p=>[p.code,`${p.code} · ${p.name}`])]},
      {k:'distributorId',l:'distributor',type:'select',req:true,opts:()=>DISTRIBUTORS.map(d=>[d.id,d.name])},
      {k:'customerId',l:'customer',type:'select',opts:()=>[['','—'],...DB.customers.map(c=>[c.id,c.company])]},
      {k:'project',l:'project_name',type:'text',full:true},
      {k:'province',l:'province',type:'select',opts:()=>[['','—'],...PROVINCES.map(p=>[p,p])]},
      {k:'shipDate',l:'ship_date',type:'date',req:true},
      {k:'installDate',l:'install_date',type:'date'},
      {k:'warrantyYears',l:'warranty_years',type:'number',req:true,min:1},
      {k:'extended',l:'w_ext',type:'bool'},
    ],
    fromItem:d=>({ sn:d.sn, model:d.model, pn:d.pn||'', distributorId:d.distributorId, customerId:d.customerId||'', project:d.project||'', province:d.province||'', shipDate:isoD(d.shipDate), installDate:isoD(d.installDate), warrantyYears:d.warrantyYears, extended:!!d.extended }),
    toItem:f=>({ sn:f.sn.toUpperCase(), model:f.model, pn:f.pn||modelBy(f.model)?.pn||'', distributorId:f.distributorId, customerId:f.customerId||'', project:f.project, province:f.province, shipDate:parseD(f.shipDate), installDate:parseD(f.installDate), warrantyYears:Number(f.warrantyYears), extended:parseBool(f.extended) }),
    refs:d=>DB.tickets.filter(x=>x.products.some(p=>p.sn===d.sn)).length,
    cols:[
      ['serial_no',d=>`<span class="mono">${d.sn}</span>`],['product_model',d=>esc(d.model)],['project_name',d=>esc(d.project)],['province',d=>esc(d.province)],
      ['distributor',d=>esc(distById(d.distributorId)?.short||'—')],['ship_date',d=>`<span class="num">${fmtD(d.shipDate)}</span>`],['warranty_end',d=>`<span class="num">${fmtD(warrantyEnd(d))}</span>`],['warranty_status',d=>wPill(d)],
    ],
  },
  models:{
    label:'ct_models', list:()=>MODELS, key:'id',
    search:m=>m.id+' '+m.pn,
    fields:[
      {k:'id',l:'model_code',type:'text',req:true,key:true},
      {k:'pn',l:'material_code',type:'text',req:true,mono:true},
      {k:'cat',l:'category',type:'select',req:true,opts:()=>['inv3','inv1','hyb','bat'].map(c=>[c,t('cat_'+c)])},
      {k:'kw',l:'power_kw',type:'number',min:0},
      {k:'sold',l:'installed_units',type:'number',min:0},
    ],
    fromItem:m=>({ id:m.id, pn:m.pn, cat:m.cat, kw:m.kw, sold:m.sold||0 }),
    toItem:(f,old)=>({ id:f.id.trim(), pn:f.pn.trim().toUpperCase(), cat:f.cat, kw:Number(f.kw)||0, sold:Number(f.sold)||0, w:old?old.w:1 }),
    refs:m=>DB.devices.filter(d=>d.model===m.id).length,
    cols:[['model_code',m=>`<b>${esc(m.id)}</b>`],['material_code',m=>`<span class="mono">${esc(m.pn)}</span>`],['category',m=>t('cat_'+m.cat)],['power',m=>`<span class="num">${m.kw} kW${m.cat==='bat'?'h':''}</span>`]],
  },
  products:{
    label:'ct_products', list:()=>PRODUCTS, key:'code', paged:true,
    search:p=>p.code+' '+p.name,
    fields:[{k:'code',l:'product_code',type:'text',req:true,key:true,mono:true},{k:'name',l:'product_name',type:'text',req:true,full:true}],
    fromItem:p=>({code:p.code,name:p.name}), toItem:f=>({code:f.code.trim().toUpperCase(),name:f.name.trim()}),
    refs:p=>PARTS.filter(x=>(x.products||[]).includes(p.code)).length+DB.devices.filter(d=>d.pn===p.code).length,
    cols:[['product_code',p=>`<span class="mono">${esc(p.code)}</span>`],['product_name',p=>esc(p.name)],['linked_parts',p=>`<span class="num">${PARTS.filter(x=>(x.products||[]).includes(p.code)).length}</span>`],['devices',p=>`<span class="num">${DB.devices.filter(d=>d.pn===p.code).length}</span>`]],
  },
  parts:{
    label:'ct_parts', list:()=>PARTS, key:'pn',
    search:p=>p.pn+' '+p.en+' '+(p.products||[]).map(c=>c+' '+(productBy(c)?.name||'')).join(' '),
    fields:[{k:'pn',l:'part_no',type:'text',req:true,key:true,mono:true},{k:'en',l:'part_name',type:'text',req:true},{k:'products',l:'products',type:'multi',full:true,list:()=>PRODUCTS.map(p=>p.code),label:c=>{ const p=productBy(c); return p?`${p.name} (${p.code})`:c; },hint:'part_products_hint'}],
    fromItem:p=>({pn:p.pn,en:p.en||p.vi,products:(p.products||[]).slice()}), toItem:(f,old)=>({pn:f.pn.trim().toUpperCase(),en:f.en.trim(),vi:(old&&old.vi&&old.en===f.en.trim())?old.vi:f.en.trim(),products:Array.isArray(f.products)?f.products:String(f.products||'').split('|').map(s=>s.trim()).filter(Boolean)}),
    refs:p=>DB.tickets.filter(x=>x.parts.some(q=>q.pn===p.pn)||(x.diagnosis&&(x.diagnosis.estParts||[]).some(q=>q.pn===p.pn))).length,
    cols:[['part_no',p=>`<span class="mono">${esc(p.pn)}</span>`],['part_name',p=>esc(p.en)],['products',p=>(p.products&&p.products.length)?p.products.map(c=>{ const pr=productBy(c); return `<span class="chip" style="margin:2px 2px 2px 0"><b style="font-weight:600">${esc(pr?pr.name:'?')}</b>&nbsp;<span class="mono muted">(${esc(c)})</span></span>`; }).join(''):`<span class="muted">${t('all_products')}</span>`]],
  },
  faults:{
    label:'ct_faults', list:()=>FAULTS, key:'code',
    search:f=>f.code+' '+(f.en||f.vi),
    fields:[{k:'code',l:'fault_code',type:'text',req:true,key:true,mono:true},{k:'en',l:'fault_desc',type:'text',req:true,full:true}],
    fromItem:f=>({code:f.code,en:f.en||f.vi}), toItem:(f,old)=>({code:f.code.trim().toUpperCase(),en:f.en.trim(),vi:(old&&old.vi&&old.en===f.en.trim())?old.vi:f.en.trim()}),
    refs:f=>DB.tickets.filter(x=>x.faultCode===f.code).length,
    cols:[['fault_code',f=>`<span class="mono">${esc(f.code)}</span>`],['fault_desc',f=>esc(f.en||f.vi)],['used_in',f=>`<span class="num">${fmtNum(DB.tickets.filter(x=>x.faultCode===f.code).length)}</span>`]],
  },
  dists:{
    label:'ct_dists', list:()=>DISTRIBUTORS, key:'id',
    search:d=>d.id+' '+d.name+' '+d.short+' '+d.city+' '+(d.regions||[]).join(' '),
    fields:[
      {k:'id',l:'dist_code',type:'text',req:true,key:true,mono:true,hint:'dist_code_hint'},
      {k:'short',l:'short_name',type:'text',req:true},
      {k:'name',l:'distributor',type:'text',req:true,full:true},
      {k:'city',l:'head_office',type:'select',opts:()=>[['','—'],...PROVINCES.map(p=>[p,p])]},
      {k:'color',l:'chart_color',type:'color'},
      {k:'aliases',l:'dist_aliases',type:'text',full:true,hint:'dist_aliases_hint'},
      {k:'regions',l:'region',type:'provinces',full:true},
    ],
    fromItem:d=>({id:d.id,short:d.short,name:d.name,city:d.city||'',color:d.color||'#465FFF',aliases:(d.aliases||[]).join('|'),regions:(d.regions||[]).slice()}),
    toItem:f=>({id:f.id.trim().toLowerCase(),short:f.short.trim().toUpperCase(),name:f.name.trim(),city:f.city,color:f.color||'#465FFF',aliases:String(f.aliases||'').split('|').map(s=>s.trim()).filter(Boolean),regions:Array.isArray(f.regions)?f.regions:String(f.regions||'').split('|').map(s=>s.trim()).filter(Boolean)}),
    refs:d=>DB.devices.filter(x=>x.distributorId===d.id).length+DB.users.filter(u=>u.distributorId===d.id).length+DB.tickets.filter(x=>x.distributorId===d.id).length,
    cols:[['distributor',d=>`<span class="row" style="gap:8px;flex-wrap:nowrap"><i style="width:10px;height:10px;border-radius:2px;background:${esc(d.color)};display:inline-block;flex-shrink:0"></i><b style="font-weight:600">${esc(d.name)}</b> <small class="muted mono">${esc(d.short)}</small></span>`],['dist_aliases',d=>(d.aliases||[]).map(a=>`<span class="chip mono" style="margin:1px">${esc(a)}</span>`).join(' ')||'—'],['region',d=>(d.regions||[]).length?esc(d.regions.join(', ')):'<span class="muted">—</span>'],['reg_serials',d=>`<span class="num">${REG.ready?fmtNum(regAll().filter(r=>r.distributorId===d.id).length):'…'}</span>`],['devices',d=>`<span class="num">${DB.devices.filter(x=>x.distributorId===d.id).length}</span>`],['technicians',d=>`<span class="num">${DB.users.filter(x=>x.distributorId===d.id).length}</span>`]],
  },
};

function catValidate(tab,f,isNew,oldKey){
  const C=CAT[tab], E={};
  C.fields.forEach(fd=>{
    const v=f[fd.k]; const s=Array.isArray(v)?v.join('|'):String(v==null?'':v).trim();
    if(fd.req && !s){ E[fd.k]=t('e_required'); return; }
    if(!s) return;
    if(fd.type==='select'){ const ok=fd.opts().some(o=>String(o[0])===s); if(!ok) E[fd.k]=t('e_invalid_value'); }
    if(fd.type==='number' && (isNaN(Number(s)) || (fd.min!=null && Number(s)<fd.min))) E[fd.k]=t('e_number');
    if(fd.type==='date' && isNaN(parseD(s))) E[fd.k]=t('e_date');
    if(isMulti(fd)){ const L=multiList(fd); const bad=(Array.isArray(v)?v:s.split('|')).map(x=>String(x).trim()).filter(x=>x&&!L.includes(x)); if(bad.length) E[fd.k]=t(fd.type==='provinces'?'e_province':'e_multi',{p:bad.join(', ')}); }
    if(fd.type==='color' && !/^#[0-9a-fA-F]{6}$/.test(s)) E[fd.k]=t('e_color');
  });
  const kf=C.fields.find(x=>x.key); const kv=String(f[kf.k]||'').trim();
  if(kv){
    const norm = tab==='dists'?kv.toLowerCase():(tab==='models'?kv:kv.toUpperCase());
    if(tab==='dists' && !/^[a-z0-9]{2,12}$/.test(norm)) E[kf.k]=t('dist_code_hint');
    else if(tab==='devices' && !/^[A-Z0-9]{6,20}$/.test(norm)) E[kf.k]=t('e_sn_format');
    else if(isNew && C.list().some(x=>String(x[C.key])===norm)) E[kf.k]=t('e_key_exists');
  }
  return E;
}

function viewCatalog(){
  const f=S.ui.ct||(S.ui.ct={tab:'devices',q:'',page:1,size:10}); if(!CAT[f.tab]) f.tab='devices';
  const C=CAT[f.tab]; const edit=can('catalog_edit')&&!C.readonly; const exp=can('catalog_edit')||can('export');
  let arr=C.list();
  if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(x=>C.search(x).toLowerCase().includes(q)); }
  const rows=C.paged?arr.slice((f.page-1)*f.size,f.page*f.size):arr;
  return `<div class="page-head"><div><h1>${t('nav_catalog')}</h1></div></div>
  <div class="card"><div class="dtabs">${Object.keys(CAT).filter(k=>!['models','products'].includes(k)).map(k=>`<button class="${f.tab===k?'on':''}" data-a="ctTab" data-k="${k}">${t(CAT[k].label)}<span class="cnt">${CAT[k].list().length}</span></button>`).join('')}</div>
  <div class="toolbar"><div class="row grow"><div class="search-inline">${ic('search',16)}<input class="input" id="ct-q" data-bind="ct.q" data-live="ctSearch" value="${esc(f.q)}" placeholder="${t('search')}…" aria-label="${t('search')}"></div></div>
    <div class="row">
      ${edit?`<button class="btn primary sm" data-a="catNew">${ic('plus',15)} ${t('add_new')}</button><label class="btn sm" style="cursor:pointer">${ic('upload',15)} ${t('import_csv')}<input type="file" accept=".csv,text/csv" data-file="catImport" hidden></label>`:''}
      ${exp?`<button class="btn sm" data-a="catExport">${ic('download',15)} ${t('export_csv')}</button>`:''}
    </div></div>
  ${rows.length?`<div class="table-wrap"><table class="tbl cards"><thead><tr>${C.cols.map(c=>`<th>${t(c[0])}</th>`).join('')}${edit?'<th></th>':''}</tr></thead><tbody>
    ${rows.map(x=>`<tr>${C.cols.map(c=>`<td data-l="${t(c[0])}">${c[1](x)}</td>`).join('')}${edit?`<td class="nowrap"><button class="btn sm ghost" data-a="catEdit" data-key="${esc(x[C.key])}">${ic('edit',14)} ${t('edit')}</button><button class="btn sm ghost" style="color:var(--bad)" data-a="catDelAsk" data-key="${esc(x[C.key])}" aria-label="${t('delete')}">${ic('trash',14)}</button></td>`:''}</tr>`).join('')}
  </tbody></table></div>`:`<div class="empty">${t('no_results')}</div>`}
  ${C.paged?pager(arr.length,f,'ct'):''}
  ${edit?`<div class="card-b hint">${t('csv_hint',{cols:C.fields.map(x=>x.k).join(', ')})}</div>`:''}
  </div>`;
}
A.ctTab = el => { S.ui.ct={tab:el.dataset.k,q:'',page:1,size:10}; rerender(); };
A.ctSearch = () => { S.ui.ct.page=1; rerender(); };
const catFind = (tab,key) => CAT[tab].list().find(x=>String(x[CAT[tab].key])===String(key));
A.catNew = () => { const tab=S.ui.ct.tab; const f={}; CAT[tab].fields.forEach(fd=>f[fd.k]= fd.type==='bool'?false: isMulti(fd)?[]: fd.type==='color'?'#465FFF': fd.type==='number'?(fd.k==='warrantyYears'?5:0): fd.type==='select'&&fd.req?String(fd.opts()[0]?.[0]||''):''); openModal({type:'catForm',tab,f,isNew:true,err:{}}); };
A.catEdit = el => { const tab=S.ui.ct.tab; const it=catFind(tab,el.dataset.key); openModal({type:'catForm',tab,f:CAT[tab].fromItem(it),isNew:false,oldKey:el.dataset.key,err:{}}); };
MODALS.catForm = m => {
  const C=CAT[m.tab], f=m.f, E=m.err||{};
  const inp = fd => { const id='cf-'+fd.k, b=`data-bind="modal.f.${fd.k}"`, v=f[fd.k], ro=fd.key&&!m.isNew;
    if(fd.type==='select') return `<select class="select ${E[fd.k]?'err':''}" id="${id}" ${b}>${fd.opts().map(o=>`<option value="${esc(o[0])}" ${String(v)===String(o[0])?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
    if(fd.type==='bool') return `<label class="row" style="gap:10px;cursor:pointer"><span class="switch"><input type="checkbox" id="${id}" ${b} ${v?'checked':''}><span></span></span></label>`;
    if(fd.type==='color') return `<div class="row" style="flex-wrap:nowrap"><input type="color" id="${id}" ${b} value="${esc(v)}" style="width:44px;height:38px;border:1px solid var(--line-2);border-radius:6px;background:var(--surface);padding:2px"><span class="mono">${esc(v)}</span></div>`;
    if(isMulti(fd)){ const all=multiList(fd); const q=((m.mq||{})[fd.k]||'').toLowerCase(); const lab=x=>fd.label?fd.label(x):x; const shown=all.filter(x=>!q||lab(x).toLowerCase().includes(q)||v.includes(x)).sort((a,b)=>(v.includes(b)?1:0)-(v.includes(a)?1:0));
      const box = all.length>20?`<div class="row" style="margin-bottom:6px;flex-wrap:nowrap"><input class="input" id="cf-q-${fd.k}" data-bind="modal.mq.${fd.k}" data-live="noopLive" value="${esc((m.mq||{})[fd.k]||'')}" placeholder="${t('filter_list')}"><span class="chip">${v.length}/${all.length}</span></div>`:'';
      return box+`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(${all.length>20?260:150}px,1fr));gap:4px 12px;max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:6px;padding:8px 10px">${shown.map(p=>`<label class="row" style="gap:6px;font-size:13px;flex-wrap:nowrap;cursor:pointer"><input type="checkbox" data-a="catProv" data-k="${fd.k}" data-p="${esc(p)}" ${v.includes(p)?'checked':''} style="accent-color:var(--accent);flex-shrink:0"><span>${esc(lab(p))}</span></label>`).join('')}</div>`; }
    return `<input class="input ${fd.mono?'mono':''} ${E[fd.k]?'err':''}" id="${id}" ${b} type="${fd.type==='number'?'number':fd.type==='date'?'date':'text'}" value="${esc(v)}" ${ro?'readonly':''} ${fd.min!=null?`min="${fd.min}"`:''}>`; };
  return { wide:true, title:(m.isNew?t('add_new'):t('edit'))+' · '+t(C.label),
    body:`<div class="form-grid">${C.fields.map(fd=>`<div class="field ${fd.full||isMulti(fd)?'full':''}"><label class="${fd.req?'req':''}" for="cf-${fd.k}">${t(fd.l)}</label>${inp(fd)}${E[fd.k]?`<div class="err-text">${esc(E[fd.k])}</div>`:''}${fd.hint&&(m.isNew||!fd.key)?`<div class="hint">${t(fd.hint)}</div>`:''}${fd.key&&!m.isNew?`<div class="hint">${t('key_readonly')}</div>`:''}</div>`).join('')}</div>`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="catSave">${m.isNew?t('add_new'):t('save')}</button>` };
};
A.catProv = el => { const r=S.ui.modal.f[el.dataset.k]; const p=el.dataset.p; const i=r.indexOf(p); if(i>=0) r.splice(i,1); else r.push(p); rerender(); };
function catUpsert(tab,f,isNew,oldKey){
  const C=CAT[tab]; const list=C.list();
  if(isNew){ list.push(C.toItem(f,null)); return; }
  const idx=list.findIndex(x=>String(x[C.key])===String(oldKey)); const old=list[idx];
  const item=C.toItem(f,old); item[C.key]=old[C.key];
  Object.keys(old).forEach(k=>{ if(!(k in item)) item[k]=old[k]; });
  list[idx]=Object.assign(old,item);
}
A.catSave = () => {
  const m=S.ui.modal; m.err=catValidate(m.tab,m.f,m.isNew,m.oldKey);
  if(Object.keys(m.err).length){ rerender(); return; }
  catUpsert(m.tab,m.f,m.isNew,m.oldKey); S.ui.modal=null; save(); rerender(); toast(t('toast_saved'),'ok');
};
A.catDelAsk = el => { const tab=S.ui.ct.tab; const it=catFind(tab,el.dataset.key); openModal({type:'catDel',tab,key:el.dataset.key,refs:CAT[tab].refs(it)}); };
MODALS.catDel = m => ({ title:t('delete')+' · '+esc(m.key), body:`<p style="margin:0">${m.refs?t('cat_in_use',{n:m.refs}):t('cat_del_confirm',{k:esc(m.key)})}</p>`,
  foot: m.refs?`<button class="btn" data-a="closeModal">${t('close')}</button>`:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn danger" data-a="catDel">${t('delete')}</button>` });
A.catDel = () => { const m=S.ui.modal, C=CAT[m.tab]; const list=C.list(); const i=list.findIndex(x=>String(x[C.key])===String(m.key)); if(i>=0) list.splice(i,1); S.ui.modal=null; save(); rerender(); toast(t('toast_deleted'),'ok'); };

/* ---- CSV ---- */
A.catExport = () => { const tab=S.ui.ct.tab, C=CAT[tab]; const rows=[C.fields.map(x=>x.k)];
  C.list().forEach(it=>{ const f=C.fromItem(it); rows.push(C.fields.map(fd=>{ const v=f[fd.k]; return fd.type==='bool'?(v?1:0):Array.isArray(v)?v.join('|'):v; })); });
  download(`danh_muc_${tab}_${toISODate(Date.now())}.csv`, csv(rows)); };
function parseCSV(text){
  text=text.replace(/^﻿/,''); const first=text.split(/\r?\n/)[0]||''; const delim=(first.split(';').length>first.split(',').length)?';':',';
  const rows=[]; let row=[], cur='', q=false;
  for(let i=0;i<text.length;i++){ const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){ cur+='"'; i++; } else q=false; } else cur+=c; }
    else if(c==='"') q=true; else if(c===delim){ row.push(cur); cur=''; } else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(cur); rows.push(row); row=[]; cur=''; } else cur+=c; }
  if(cur!==''||row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r=>r.some(c=>String(c).trim()!==''));
}
A.catImport = input => {
  const file=input.files&&input.files[0]; input.value=''; if(!file) return;
  const tab=S.ui.ct.tab, C=CAT[tab];
  const r=new FileReader(); r.onload=()=>{
    const rows=parseCSV(String(r.result)); if(!rows.length){ toast(t('csv_empty'),'bad'); return; }
    const head=rows[0].map(h=>h.trim()); const keyF=C.fields.find(x=>x.key);
    const missing=C.fields.filter(fd=>fd.req&&!head.includes(fd.k)).map(fd=>fd.k);
    if(missing.length){ openModal({type:'catImport',tab,file:file.name,fatal:t('csv_missing_cols',{c:missing.join(', ')}),items:[]}); return; }
    const seen=new Set(); const items=rows.slice(1).map((cells,i)=>{
      const f={}; C.fields.forEach(fd=>{ const ci=head.indexOf(fd.k); let v=ci>=0?(cells[ci]||'').trim():'';
        if(fd.type==='bool') v=parseBool(v); if(isMulti(fd)) v=v?v.split('|').map(s=>s.trim()).filter(Boolean):[]; if(fd.type==='color'&&!v) v='#465FFF'; f[fd.k]=v; });
      let key=String(f[keyF.k]||'').trim(); key = tab==='dists'?key.toLowerCase():tab==='models'?key:key.toUpperCase();
      const exists=!!catFind(tab,key);
      const E=catValidate(tab,f,!exists,key); if(seen.has(key)) E[keyF.k]=t('e_dup_in_file'); seen.add(key);
      return { line:i+2, key, f, isNew:!exists, errs:Object.entries(E).map(([k,v])=>`${k}: ${v}`) };
    });
    openModal({type:'catImport',tab,file:file.name,items});
  }; r.readAsText(file,'utf-8');
};
MODALS.catImport = m => {
  const ok=m.items.filter(x=>!x.errs.length), bad=m.items.filter(x=>x.errs.length);
  const nNew=ok.filter(x=>x.isNew).length, nUpd=ok.length-nNew;
  return { wide:true, title:t('import_csv')+' · '+t(CAT[m.tab].label), body: m.fatal? `<p class="err-text" style="font-size:14px;margin:0">${esc(m.fatal)}</p><div class="hint">${t('csv_hint',{cols:CAT[m.tab].fields.map(x=>x.k).join(', ')})}</div>` : `
    <div class="muted">${esc(m.file)} · ${m.items.length} ${t('rows')}</div>
    <div class="stat-row" style="grid-template-columns:repeat(3,minmax(0,1fr));margin:0"><div class="card stat"><div class="l">${t('imp_new')}</div><div class="v" style="color:var(--ok)">${nNew}</div></div><div class="card stat"><div class="l">${t('imp_update')}</div><div class="v" style="color:var(--blue)">${nUpd}</div></div><div class="card stat"><div class="l">${t('imp_error')}</div><div class="v" style="color:var(--bad)">${bad.length}</div></div></div>
    ${bad.length?`<div class="table-wrap" style="max-height:240px;overflow:auto;border:1px solid var(--line);border-radius:6px"><table class="tbl"><thead><tr><th>${t('line')}</th><th>${t('key_col')}</th><th>${t('error')}</th></tr></thead><tbody>${bad.slice(0,50).map(x=>`<tr><td class="num">${x.line}</td><td class="mono">${esc(x.key||'—')}</td><td style="color:var(--bad)">${esc(x.errs.join('; '))}</td></tr>`).join('')}</tbody></table></div><div class="hint">${t('imp_skip_hint')}</div>`:''}`,
    foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button>${!m.fatal&&ok.length?`<button class="btn primary" data-a="catImportDo">${t('imp_confirm',{n:ok.length})}</button>`:''}` };
};
A.catImportDo = () => { const m=S.ui.modal; const ok=m.items.filter(x=>!x.errs.length); ok.forEach(x=>catUpsert(m.tab,x.f,x.isNew,x.key)); S.ui.modal=null; save(); rerender(); toast(t('toast_imported',{n:ok.length}),'ok'); };
