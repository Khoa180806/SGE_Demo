/* ===== Core: state, helpers, shell ===== */
const LS_KEY='sgas-demo-v36';
const H=3600e3, D=24*H;
let DB, S;
const defaultS=()=>({ lang:'vi', theme:'light', userId:null, tabs:['home'], active:'home', publicView:null, ui:{} });
function loadState(){
  try{ const raw=localStorage.getItem(LS_KEY); if(raw){ const o=JSON.parse(raw); if(o&&o.db&&o.db.version===36){ DB=o.db; bindCatalog(DB.catalog); S=Object.assign(defaultS(),o.s||{}); if(S.theme!=='dark') S.theme='light'; S.ui={}; return; } } }catch(e){}
  DB=buildMockDB(); S=defaultS();
}
let saveTimer=null;
function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>{ try{ localStorage.setItem(LS_KEY, JSON.stringify({db:DB,s:{lang:S.lang,theme:S.theme,userId:S.userId,tabs:S.tabs,active:S.active}})); }catch(e){} },250); }
function resetDemo(){ try{ localStorage.removeItem(LS_KEY); }catch(e){} const lang=S.lang, theme=S.theme, uid=S.userId; bindCatalog(JSON.parse(CATALOG_DEFAULTS)); DB=buildMockDB(); S=defaultS(); S.lang=lang; S.theme=theme; S.userId=DB.users.some(u=>u.id===uid)?uid:null; save(); render(); toast(t('toast_reset'),'ok'); }

/* ---------- i18n & format ---------- */
function t(k,v){ let s=(DICT[S.lang]&&DICT[S.lang][k]); if(s==null) s=DICT.vi[k]; if(s==null) s=k; if(v) for(const x in v) s=s.split('{'+x+'}').join(v[x]); return s; }
const L = o => o==null?'': (typeof o==='string'?o:(o[S.lang]||o.vi||''));
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
function fmtD(ts){ if(!ts) return '—'; const d=new Date(ts); return S.lang==='vi'? `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}` : d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtDT(ts){ if(!ts) return '—'; const d=new Date(ts); return fmtD(ts)+' '+pad(d.getHours())+':'+pad(d.getMinutes()); }
function fmtNum(v,d=0){ return Number(v||0).toLocaleString(S.lang==='vi'?'vi-VN':'en-US',{maximumFractionDigits:d,minimumFractionDigits:d}); }
function ago(ts){ const m=Math.round((Date.now()-ts)/60000); if(m<60) return t('ago_m',{n:Math.max(1,m)}); const h=Math.round(m/60); if(h<48) return t('ago_h',{n:h}); return t('ago_d',{n:Math.round(h/24)}); }
const initials = n => (n||'?').split(' ').filter(Boolean).slice(-2).map(x=>x[0]).join('').toUpperCase();
const toISODate = ts => { const d=new Date(ts); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };

/* ---------- lookups ---------- */
const userById = id => DB.users.find(u=>u.id===id);
const uname = id => { if(!id) return '—'; if(id==='guest') return t('guest'); const u=userById(id); return u?u.name:'—'; };
const me = () => { const u=S.userId ? userById(S.userId) : null; return u&&u.active!==false?u:null; };
const globalScope = u => ['manager','engineer','warehouse','accountant','dev'].includes(u.role);
const isExternal = u => u && (u.role==='agent'||u.role==='enduser');
const custScope = u => !u?[]: u.role==='agent'?(u.customerIds||[]): u.role==='enduser'?[u.customerId]:null; /* null = all */
const inScope = (cid,u=me()) => { const s=custScope(u); return s===null || s.includes(cid); };
function can(perm,u=me()){ if(!u) return false; if(u.role==='dev') return true; return !!(DB.perms&&DB.perms[u.role]&&DB.perms[u.role].includes(perm)); }
const distById = id => DISTRIBUTORS.find(d=>d.id===id);
const partByPn = pn => PARTS.find(p=>p.pn===pn);
const faultBy = c => FAULTS.find(f=>f.code===c);
const modelBy = id => MODELS.find(m=>m.id===id);
const productBy = c => PRODUCTS.find(p=>p.code===c);
const devBySn = sn => DB.devices.find(d=>d.sn.toUpperCase()===String(sn||'').trim().toUpperCase()) || (typeof regBySn==='function'?regBySn(sn):null);
const ticketById = id => DB.tickets.find(x=>x.id===id);
const rmaById = id => DB.rmas.find(x=>x.id===id);
const partName = pn => { const p=partByPn(pn); return p?(p.en||p.vi):pn; };
const faultName = c => { const f=faultBy(c); return f? `${f.code} · ${f.en||f.vi}` : (c||'—'); };
const warrantyStart = d => d.startDate || d.shipDate;
function warrantyEnd(d){ return d.startDate ? addYears(d.startDate,d.warrantyYears) : d.shipDate + d.warrantyYears*365*D; }
function warrantyState(d, at){ const end=warrantyEnd(d); const when=at||Date.now(); return { end, inW: when<end, ext:d.extended, daysLeft:Math.round((end-when)/D) }; }

const OPEN_EXCL = ['closed','rejected','cancelled'];
const isOpen = tk => !OPEN_EXCL.includes(tk.status);
function visibleTickets(u=me()){
  if(!u) return [];
  if(!can('ticket_view',u)) return [];
  if(globalScope(u)) return DB.tickets;
  if(u.role==='distributor') return DB.tickets.filter(x=>x.distributorId===u.distributorId || x.status==='unassigned');
  if(u.role==='enduser') return DB.tickets.filter(x=>x.customerId===u.customerId);
  if(u.role==='agent') return DB.tickets.filter(x=>(u.customerIds||[]).includes(x.customerId));
  return [];
}
function canSeeTicket(tk,u=me()){ return visibleTickets(u).includes(tk); }
const SLA_PAUSE_REASONS = ['wait_customer','customer_hold','wait_parts','wait_approval','wait_shipping','other'];
function pausedMs(tk,end){ return (tk.slaPauses||[]).reduce((s,p)=>s+Math.max(0,Math.min(p.to||end,end)-p.from),0); }
function procHours(tk){ const end = tk.closedAt || (OPEN_EXCL.includes(tk.status)? tk.updatedAt : Date.now()); return Math.max(0,(end - tk.createdAt - pausedMs(tk,end))/H); }
function openPause(tk){ const p=(tk.slaPauses||[]); const l=p[p.length-1]; return l&&!l.to?l:null; }
const SLA_DAYS = 7;
function slaBreached(tk){ return procHours(tk) > SLA_DAYS*24; }

/* ---------- icons ---------- */
const ICONS = {
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  globe:'<circle cx="12" cy="12" r="10"/><path d="M21.5 9.5h-5a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h0a1.5 1.5 0 0 1 1.5 1.5V20"/><path d="M7 3.3V5a2.5 2.5 0 0 0 2.5 2.5h0A1.5 1.5 0 0 1 11 9v.5a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V8a2 2 0 0 1 2-2h1.6"/><path d="M10 21.9V18a2 2 0 0 0-2-2h0a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  check:'<path d="M20 6 9 17l-5-5"/>', x:'<path d="M18 6 6 18M6 6l12 12"/>', plus:'<path d="M12 5v14M5 12h14"/>',
  clip:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  box:'<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  left:'<path d="m15 18-6-6 6-6"/>', right:'<path d="m9 18 6-6-6-6"/>', dleft:'<path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/>', dright:'<path d="m6 17 5-5-5-5M13 17l5-5-5-5"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', refresh:'<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>', upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  file:'<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6"/>',
  send:'<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>', clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', filter:'<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
  truck:'<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  chart:'<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>', star:'<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  msg:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', trash:'<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  pause:'<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>', play:'<path d="m6 3 14 9-14 9z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>', moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  db:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0"/>', home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
};
const ic = (n,sz=18) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||''}</svg>`;

/* ---------- small UI parts ---------- */
const statusPill = s => `<span class="pill s-${s}">${esc(t('s_'+s))}</span>`;
const rmaPill = s => `<span class="pill r-${s}">${esc(t('r_'+s))}</span>`;
const flag = p => `<span class="flag ${p||'none'}" title="${esc(t('p_'+(p||'none')))}">${ic('flag',12)}</span>`;
function wPill(d, at){ if(!d) return `<span class="pill">${t('w_unknown')}</span>`; const w=warrantyState(d,at); return w.inW? `<span class="pill ${w.ext?'w-ext':'w-in'}">${t(w.ext?'w_ext':'w_in')}</span>` : `<span class="pill w-out">${t('w_out')}</span>`; }
const stName = id => t('st_'+id);
function toast(msg,kind){ const box=document.getElementById('toasts'); if(!box) return; const el=document.createElement('div'); el.className='toast '+(kind||''); el.textContent=msg; box.appendChild(el); setTimeout(()=>el.remove(),2800); }
let _dl=null; try{ if(window.claude&&window.claude.use) window.claude.use('downloads').then(d=>{_dl=d}).catch(()=>{}); }catch(e){}
async function download(name, text, mime='text/csv'){
  if(_dl){ try{ await _dl.save({filename:name,data:'\ufeff'+text}); toast(t('toast_export',{name}),'ok'); }catch(e){ if(!e||e.code!=='declined') toast(t('toast_export_fail'),'bad'); } return; }
  try{ const blob=new Blob(['﻿'+text],{type:mime+';charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500); toast(t('toast_export',{name}),'ok'); }
  catch(e){ toast(t('toast_export_fail'),'bad'); }
}
const csv = rows => rows.map(r=>r.map(c=>{ const s=String(c==null?'':c); return /[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }).join(',')).join('\n');

/* path helpers for data-bind */
function getP(o,p){ return p.split('.').reduce((a,k)=>a==null?a:a[k],o); }
function setP(o,p,v){ const ks=p.split('.'); let a=o; ks.slice(0,-1).forEach(k=>{ if(a[k]==null) a[k]={}; a=a[k]; }); a[ks[ks.length-1]]=v; }

/* ---------- notifications ---------- */
function notify(n){ DB.notifs.unshift(Object.assign({id:'n'+Date.now()+Math.random().toString(36).slice(2,6), at:Date.now(), read:false}, n)); }
function myNotifs(u=me()){ if(!u) return []; return DB.notifs.filter(n=> (n.toRole&&(n.toRole===u.role||(n.toRole==='distributor'&&u.role==='manager'))) || (n.toDist&&u.role==='engineer') || (n.toUser===u.id) || (n.toCustomer&&(n.toCustomer===u.customerId||(u.customerIds||[]).includes(n.toCustomer)))).filter(n=>!n.ticketId || (ticketById(n.ticketId)&&canSeeTicket(ticketById(n.ticketId),u))).slice(0,30); }


/* ---------- company footer ---------- */
function siteFooter(cls=''){
  const sv=p=>`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const mail=sv('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>');
  const card=sv('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>');
  return `<footer class="site-footer ${cls}"><div class="sf-in">
    <div class="sf-co"><b>CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ SGE</b><span>MST: 3703455937</span><span>12E1 đường số 4, KDC Vĩnh Phú 1, Phường Bình Hòa, TP Hồ Chí Minh, Việt Nam</span></div>
    <div class="sf-ct"><a href="mailto:sge.company2026@gmail.com">${mail}<span>sge.company2026@gmail.com</span></a><span>${card}<span>TK: <b class="mono">67852068</b> – MB Bank (CN Thuận An)</span></span></div>
  </div></footer>`;
}

const DEMO_IDS=['u_mgr','u_eng','u_wh','u_acc','u_agent','u_end','u_dev'];
/* ---------- tabs & navigation ---------- */
function navItems(u=me()){
  const items=[{k:'home',l:t('nav_home')}];
  if(can('svc_view',u)||can('so_view',u)||can('ticket_view',u)) items.push({k:'contracts',l:t('nav_contracts')});
  if(can('crm_view',u)) items.push({k:'customers',l:t('nav_customers')});
  if(can('stock_view',u)) items.push({k:'stock',l:t('nav_stock')});
  if(can('rma_view',u)) items.push({k:'rma',l:'RMA'});
  if(can('exp_view',u)) items.push({k:'expenses',l:t('nav_expenses')});
  if(can('reports',u)) items.push({k:'reports',l:t('nav_reports')});
  if(can('catalog',u)) items.push({k:'catalog',l:t('nav_catalog')});
  if(u.role==='dev') items.push({k:'admin',l:t('nav_admin')});
  return items;
}
const TAB_PERM = { support:'support_view', supportNew:'support_create', tickets:'ticket_view', new:'ticket_create', rma:'rma_view', lookup:'lookup', reports:'reports', catalog:'catalog', customers:'crm_view', stock:'stock_view', expenses:'exp_view' };
function tabAllowed(k,u=me()){ if(k==='admin') return u.role==='dev'; if(k==='lookup') return false; if(k==='contracts') return can('svc_view',u)||can('so_view',u)||can('ticket_view',u); if(k.startsWith('sc:')) return can('svc_view',u); if(k.startsWith('so:')) return can('so_view',u); if(k.startsWith('po:')) return can('po_manage',u)||can('stock_view',u); if(k.startsWith('cu:')) return can('crm_view',u); if(k.startsWith('t:')) return can('ticket_view',u); if(k.startsWith('s:')||k==='support'||k==='supportNew') return false; return !TAB_PERM[k] || can(TAB_PERM[k],u); }
function tabTitle(k){ const et=erpTabTitle(k); if(et) return et; if(k.startsWith('t:')){ const tk=ticketById(k.slice(2)); return tk?tk.no:'?'; } if(k.startsWith('s:')){ const sp=spById(k.slice(2)); return sp?sp.no:'?'; } if(k==='support') return t('nav_support'); if(k==='supportNew') return t('sp_new'); return ({home:t('nav_home'),tickets:isExternal(me())?t('nav_my_requests'):t('nav_tickets'),new:t('new_ticket'),rma:t('nav_rma'),lookup:t('nav_lookup'),reports:t('nav_reports'),catalog:t('nav_catalog'),admin:t('nav_admin')})[k]||k; }
function openTab(k){ if(!S.tabs.includes(k)) S.tabs.push(k); if(S.tabs.length>8){ const rm=S.tabs.find(x=>x!=='home'&&x!==k); S.tabs=S.tabs.filter(x=>x!==rm); } S.active=k; S.ui.drawer=false; S.ui.pop=null; save(); render(); window.scrollTo(0,0); }
function closeTab(k){ const i=S.tabs.indexOf(k); if(i<0||k==='home') return; S.tabs.splice(i,1); if(S.active===k) S.active=S.tabs[Math.max(0,i-1)]||'home'; save(); render(); }
function openTicket(id){ openTab('t:'+id); }

/* ---------- theme ---------- */
function effectiveTheme(){ if(S.theme==='light'||S.theme==='dark') return S.theme; return (window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'; }
function applyTheme(){ const r=document.documentElement; if(S.theme==='light'||S.theme==='dark') r.setAttribute('data-theme',S.theme); else r.removeAttribute('data-theme'); }
function themeBtn(){ const d=effectiveTheme()==='dark'; return `<button class="icon-btn" data-a="theme" title="${t(d?'theme_light':'theme_dark')}" aria-label="${t(d?'theme_light':'theme_dark')}">${ic(d?'sun':'moon',17)}</button>`; }

/* ---------- render root ---------- */
function render(){
  const root=document.getElementById('root');
  const y=window.scrollY;
  document.documentElement.lang=S.lang; applyTheme();
  if(!me()){ root.innerHTML = viewLogin() + `<div class="toasts" id="toasts"></div>` + renderModal(); return; }
  const u=me();
  if(!S.tabs.includes(S.active)) S.active='home';
  root.innerHTML = `<div class="app">
    <div class="demo-banner">${t('demo_banner')} · <button data-a="askReset">${t('reset_demo')}</button></div>
    ${topbar(u)}
    <div class="tabbar" role="tablist">${S.tabs.map(k=>`<div class="tab ${k===S.active?'on':''}" data-a="tab" data-k="${esc(k)}" role="tab" tabindex="0">${esc(tabTitle(k))}${k!=='home'?`<button class="x" data-a="closeTab" data-k="${esc(k)}" aria-label="${t('close')}">${ic('x',13)}</button>`:''}</div>`).join('')}</div>
    <main class="main">${viewFor(S.active)}</main>
    ${siteFooter()}
  </div>${S.ui.drawer?drawer(u):''}<div class="toasts" id="toasts"></div>${renderModal()}`;
  if(S._keepScroll){ window.scrollTo(0,y); S._keepScroll=false; }
  afterRender();
}
function rerender(){ S._keepScroll=true; render(); }
function afterRender(){ if(S._focus){ const el=document.getElementById(S._focus); if(el){ el.focus(); if(el.setSelectionRange&&el.value!=null){ const n=el.value.length; try{el.setSelectionRange(n,n)}catch(e){} } } S._focus=null; } }

function viewFor(k){
  if(!tabAllowed(k)) return `<div class="card empty">${ic('shield',28)}<p>${t('no_perm')}</p></div>`;
  if(k==='admin') return viewAdmin();
  const ev=erpView(k); if(ev!=null) return ev;
  if(k==='support') return viewSupport();
  if(k==='supportNew') return viewSupportNew();
  if(k.startsWith('s:')) return viewSupportDetail(k.slice(2));
  if(k==='home') return viewHome();
  if(k==='tickets') return viewTickets();
  if(k==='new') return viewNewTicket();
  if(k.startsWith('t:')) return viewTicket(k.slice(2));
  if(k==='rma') return viewRma();
  if(k==='lookup') return viewLookup(false);
  if(k==='reports') return viewReports();
  if(k==='catalog') return viewCatalog();
  return '';
}
function activeNavKey(){ const k=S.active; if(k.startsWith('t:')||k==='new'||k==='tickets') return 'contracts'; if(k.startsWith('sc:')||k.startsWith('so:')) return 'contracts'; if(k.startsWith('po:')) return 'stock'; if(k.startsWith('cu:')) return 'customers'; if(k.startsWith('s:')||k==='supportNew') return 'support'; return k; }

function topbar(u){
  const unread=myNotifs(u).filter(n=>!n.read).length;
  const pendingCount = can('ticket_approve',u)? DB.tickets.filter(x=>x.status==='pending').length : (u.role==='distributor'&&can('ticket_claim',u))? DB.tickets.filter(x=>x.status==='unassigned').length : 0;
  return `<header class="topbar">
    <button class="icon-btn hamburger" data-a="drawer" aria-label="Menu">${ic('menu')}</button>
    <button class="brand" data-a="tab" data-k="home" aria-label="Home"><span class="logo-mask"></span><span class="brand-sep"></span><span class="brand-app">${t('brand_app')}</span></button>
    <nav class="nav">${navItems(u).map(n=>`<button class="${activeNavKey()===n.k?'on':''}" data-a="nav" data-k="${n.k}">${esc(n.l)}${n.k==='tickets'&&pendingCount?`<span class="badge">${pendingCount}</span>`:''}${n.k==='support'&&can('support_handle',u)&&(DB.support||[]).filter(s=>s.status==='new').length?`<span class="badge">${(DB.support||[]).filter(s=>s.status==='new').length}</span>`:''}</button>`).join('')}</nav>
    <div class="top-right">
      <div style="position:relative"><button class="icon-btn" data-a="pop" data-p="notif" aria-label="${t('notifications')}">${ic('bell')}${unread?`<span class="dot">${unread>9?'9+':unread}</span>`:''}</button>${S.ui.pop==='notif'?notifPopover(u):''}</div>
      ${themeBtn()}
      <button class="btn ghost lang-pill" data-a="lang" title="${S.lang==='vi'?'Đổi sang English':'Switch to Tiếng Việt'}">${ic('globe',17)} <span class="lp-full">${S.lang==='vi'?'Tiếng Việt':'English'}</span><span class="lp-short">${S.lang==='vi'?'VI':'EN'}</span></button>
      <div style="position:relative"><button class="user-btn" data-a="pop" data-p="user"><span class="avatar">${esc(initials(u.name))}</span><span class="user-meta"><b>${esc(u.name)}</b><small>${esc(roleLabel(u))}</small></span></button>${S.ui.pop==='user'?userPopover(u):''}</div>
    </div>
  </header>`;
}
function roleLabel(u){ return t('role_'+u.role) + (u.agencyId&&distById(u.agencyId)? ' · '+distById(u.agencyId).short : ''); }
function notifPopover(u){
  const ns=myNotifs(u);
  return `<div class="popover" style="width:340px;max-width:calc(100vw - 32px)"><div class="head">${t('notifications')}<button class="link-btn" data-a="readAll" style="font-size:13px;font-weight:400">${t('mark_all_read')}</button></div>
  ${ns.length? ns.map(n=>`<button class="item notif-item ${n.read?'':'unread'}" data-a="notif" data-id="${n.id}"><span style="color:var(--accent-ink);margin-top:2px">${ic('bell',16)}</span><span>${esc(t(n.key,n.vars))}<small>${ago(n.at)}</small></span></button>`).join('') : `<div class="empty">${t('no_notif')}</div>`}</div>`;
}
function userPopover(u){
  const others = DB.users.filter(x=>DEMO_IDS.includes(x.id)&&x.active!==false&&x.id!==u.id);
  return `<div class="popover"><div class="head" style="flex-direction:column;align-items:flex-start;gap:0">${esc(u.name)}<small class="muted" style="font-weight:400">${esc(t(u.title))} · ${esc(u.email)}</small></div><div class="sep"></div>
    <div class="head" style="font-size:12px;color:var(--muted);font-weight:500;padding-bottom:2px">${t('switch_role')}</div>
    ${others.map(o=>`<button class="item" data-a="loginAs" data-id="${o.id}"><span class="avatar" style="width:26px;height:26px;font-size:11px">${esc(initials(o.name))}</span><span>${esc(o.name)}<br><small class="muted">${esc(roleLabel(o))}</small></span></button>`).join('')}
    <div class="sep"></div>
    <button class="item" data-a="askReset">${ic('refresh',16)} ${t('reset_demo')}</button>
    <button class="item" data-a="logout">${ic('logout',16)} ${t('logout')}</button></div>`;
}
function drawer(u){
  return `<div class="drawer-nav"><div class="scrim" data-a="drawer"></div><div class="panel">
    <div style="padding:4px 12px 14px"><span class="logo-mask" style="height:44px"></span></div>
    ${navItems(u).map(n=>`<button class="nv ${activeNavKey()===n.k?'on':''}" data-a="nav" data-k="${n.k}">${esc(n.l)}</button>`).join('')}
  </div></div>`;
}

/* ---------- Login ---------- */
function viewLogin(){
  const f=S.ui.login||{user:'',pass:'',remember:false};
  const demo=DEMO_IDS.map(id=>[id,'role_'+(userById(id)||{}).role]).filter(([id])=>userById(id)&&userById(id).active!==false);
  const eye=S.ui.showPw?'<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>':'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  return `<div class="login">
    <section class="login-side">
      <div class="login-top">
        <button type="button" class="lg-back" data-a="demoOnly"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>${t('lg_back_home')}</button>
        <div class="lg-lang" role="group" aria-label="Language"><button type="button" class="${S.lang==='vi'?'on':''}" data-a="setLang" data-l="vi">VN</button><button type="button" class="${S.lang==='en'?'on':''}" data-a="setLang" data-l="en">EN</button></div>
      </div>
      <form class="login-form" data-form="login" novalidate>
        <span class="logo-mask lg-logo" role="img" aria-label="SGE"></span>
        <h1>${t('lg_title')}</h1>
        <div class="field"><label for="lg-user">Email<i class="req-star">*</i></label><input class="input" id="lg-user" data-bind="login.user" value="${esc(f.user)}" autocomplete="username" placeholder="name@company.com"></div>
        <div class="field"><label for="lg-pass">${t('password')}<i class="req-star">*</i></label><div class="pw-wrap"><input class="input" id="lg-pass" type="${S.ui.showPw?'text':'password'}" data-bind="login.pass" value="${esc(f.pass)}" autocomplete="current-password"><button type="button" class="pw-eye" data-a="togglePw" aria-label="${t('lg_show_pw')}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${eye}</svg></button></div></div>
        <div class="lg-row"><label class="lg-check"><input type="checkbox" data-a="toggleRemember" ${f.remember?'checked':''}><span>${t('lg_remember')}</span></label><button type="button" class="lg-link" data-a="demoOnly">${t('lg_forgot')}</button></div>
        ${S.ui.loginErr?`<div class="err-text">${t('login_err')}</div>`:''}
        <button class="btn primary lg-submit" type="submit">${t('login_btn')}</button>
        <div class="lg-signup">${t('lg_no_account')} <button type="button" class="lg-link" data-a="demoOnly">${t('lg_signup')}</button></div>
        <div class="lg-demo"><span>${t('lg_demo')}</span>${demo.map(([id,r])=>`<button type="button" data-a="loginAs" data-id="${id}">${t(r)}</button>`).join('')}</div>
      </form>
    </section>
    <section class="login-hero" aria-hidden="true"><span class="lg-ver">V1.02</span></section>
  </div>`;
}

/* ---------- Modal renderer (types registered by views) ---------- */
const MODALS={};
function renderModal(){ const m=S.ui.modal; if(!m||!MODALS[m.type]) return ''; const r=MODALS[m.type](m); return `<div class="modal" role="dialog" aria-modal="true"><div class="scrim" data-a="closeModal"></div><div class="box ${r.wide?'wide':''}"><div class="mh"><h3>${r.title}</h3><button class="icon-btn" data-a="closeModal" aria-label="${t('close')}">${ic('x',16)}</button></div><div class="mb">${r.body}</div>${r.foot?`<div class="mf">${r.foot}</div>`:''}</div></div>`; }
function openModal(m){ S.ui.modal=m; rerender(); }
function closeModal(){ S.ui.modal=null; rerender(); }
MODALS.reset = ()=>({ title:t('reset_demo'), body:`<p style="margin:0">${t('reset_confirm')}</p>`, foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="doReset">${t('reset_demo')}</button>` });

/* ---------- Actions registry & event wiring ---------- */
const A = {};
A.theme = () => { S.theme = effectiveTheme()==='dark'?'light':'dark'; applyTheme(); save(); rerender(); };
A.tab = el => { S.active=el.dataset.k; S.ui.pop=null; save(); render(); };
A.nav = el => { openTab(el.dataset.k); };
A.closeTab = (el,ev) => { ev.stopPropagation(); closeTab(el.dataset.k); };
A.drawer = () => { S.ui.drawer=!S.ui.drawer; rerender(); };
A.pop = el => { S.ui.pop = S.ui.pop===el.dataset.p?null:el.dataset.p; rerender(); };
A.setLang = el => { S.lang=el.dataset.l==='en'?'en':'vi'; save(); rerender(); };
A.togglePw = () => { S.ui.showPw=!S.ui.showPw; rerender(); };
A.toggleRemember = el => { S.ui.login=Object.assign(S.ui.login||{user:'',pass:''},{remember:!!el.checked}); };
A.demoOnly = () => toast(t('lg_demo_only'),'');
A.lang = () => { S.lang = S.lang==='vi'?'en':'vi'; save(); rerender(); };
A.loginAs = el => { const lu=userById(el.dataset.id); if(!lu||lu.active===false){ toast(t('login_inactive'),'bad'); return; } S.userId=el.dataset.id; S.tabs=['home']; S.active='home'; S.ui={}; S.publicView=null; save(); render(); window.scrollTo(0,0); toast(t('toast_welcome',{name:me().name}),'ok'); };
A.logout = () => { S.userId=null; S.ui={}; S.tabs=['home']; S.active='home'; save(); render(); };
A.askReset = () => { S.ui.pop=null; openModal({type:'reset'}); };
A.doReset = () => { S.ui.modal=null; resetDemo(); };
A.closeModal = () => closeModal();
A.readAll = () => { myNotifs().forEach(n=>n.read=true); save(); rerender(); };
A.notif = el => { const n=DB.notifs.find(x=>x.id===el.dataset.id); if(n){ n.read=true; save(); if(n.spId){ S.ui.pop=null; openTab('s:'+n.spId); return; } if(n.ticketId){ S.ui.pop=null; openTicket(n.ticketId); return; } } rerender(); };
A.publicLookup = () => { S.publicView='lookup'; render(); };
A.backLogin = () => { S.publicView=null; render(); };
A.openTicket = el => openTicket(el.dataset.id);

const SUBMITS = {};
SUBMITS.login = () => {
  const f=S.ui.login||{}; const id=String(f.user||'').trim().toLowerCase(); const u=DB.users.find(x=>x.login===id||String(x.email||'').toLowerCase()===id);
  if(u && u.active===false){ S.ui.loginErr=false; toast(t('login_inactive'),'bad'); return; }
  if(u && (f.pass||'')!==''){ S.ui.loginErr=false; A.loginAs({dataset:{id:u.id}}); } else { S.ui.loginErr=true; render(); }
};

function wire(){
  document.addEventListener('click', ev=>{
    const el = ev.target.closest('[data-a]');
    if(S.ui.pop && !ev.target.closest('.popover') && !(el&&el.dataset.a==='pop')){ S.ui.pop=null; if(!el){ rerender(); return; } }
    if(!el) return;
    if(el.dataset.a==='noop') return;
    const fn=A[el.dataset.a]; if(fn){ ev.preventDefault(); fn(el,ev); }
  });
  document.addEventListener('keydown', ev=>{
    if(ev.key==='Escape'){ if(S.ui.modal){ closeModal(); } else if(S.ui.pop||S.ui.drawer){ S.ui.pop=null; S.ui.drawer=false; rerender(); } }
    if(ev.key==='Enter' && ev.target.classList && ev.target.classList.contains('tab')){ ev.target.click(); }
    if(ev.key==='Enter' && ev.target.dataset && ev.target.dataset.enter){ ev.preventDefault(); const fn=A[ev.target.dataset.enter]; if(fn) fn(ev.target,ev); }
  });
  const onBind = ev=>{
    const el=ev.target; const p=el.dataset && el.dataset.bind; if(!p) return;
    let v = el.type==='checkbox'? el.checked : el.value;
    if(el.dataset.num!=null) v = Number(v)||0;
    setP(S.ui,p,v);
    if(ev.type==='change' && el.dataset.re!=null){ const fn=el.dataset.re&&A[el.dataset.re]; if(fn) fn(el,ev); else rerender(); }
    if(ev.type==='input' && el.dataset.live!=null){ S._focus=el.id; const fn=el.dataset.live&&A[el.dataset.live]; if(fn) fn(el,ev); else rerender(); }
  };
  document.addEventListener('input', onBind);
  document.addEventListener('change', ev=>{ if(ev.target.type==='file'){ const fn=A[ev.target.dataset.file]; if(fn) fn(ev.target,ev); return; } onBind(ev); });
  document.addEventListener('paste', ev=>{ const z=ev.target.closest&&ev.target.closest('[data-drop]'); if(!z||!ev.clipboardData) return; const files=[...ev.clipboardData.files].filter(f=>f.type.startsWith('image/')); if(!files.length) return; ev.preventDefault(); const fn=A[z.dataset.drop]; if(fn) fn({files, set value(v){}, dataset:z.dataset}); });
  document.addEventListener('dragover', ev=>{ const z=ev.target.closest&&ev.target.closest('[data-drop]'); if(z){ ev.preventDefault(); z.classList.add('drag'); } });
  document.addEventListener('dragleave', ev=>{ const z=ev.target.closest&&ev.target.closest('[data-drop]'); if(z) z.classList.remove('drag'); });
  document.addEventListener('drop', ev=>{ const z=ev.target.closest&&ev.target.closest('[data-drop]'); if(z){ ev.preventDefault(); z.classList.remove('drag'); const fn=A[z.dataset.drop]; if(fn&&ev.dataTransfer&&ev.dataTransfer.files.length) fn({files:ev.dataTransfer.files, set value(v){}, dataset:z.dataset}); } });
  document.addEventListener('submit', ev=>{ const f=ev.target.dataset.form; if(f&&SUBMITS[f]){ ev.preventDefault(); SUBMITS[f](ev.target,ev); } });
}
