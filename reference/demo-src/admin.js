/* ===== Admin (dev role): users & permissions ===== */
const ALL_ROLES = ['manager','engineer','warehouse','accountant','agent','enduser','dev'];
const ROLE_TITLES = { manager:['after_sales_manager'], engineer:['service_engineer','field_tech'], warehouse:['warehouse_keeper'], accountant:['accountant_t'], agent:['agent_t'], enduser:['end_user'], dev:['dev_admin'] };

function viewAdmin(){
  const f=S.ui.adm||(S.ui.adm={tab:'users',q:'',role:'',page:1,size:10});
  const tabs=[['users',t('adm_users'),DB.users.length],['perms',t('adm_perms'),EDITABLE_ROLES.length],['integrations',t('adm_integrations'),intg().log.length]];
  return `<div class="page-head"><div><h1>${t('nav_admin')}</h1></div></div>
  <div class="card"><div class="dtabs">${tabs.map(([k,l,n])=>`<button class="${f.tab===k?'on':''}" data-a="admTab" data-k="${k}">${l}<span class="cnt">${n}</span></button>`).join('')}</div>
  ${f.tab==='users'?adminUsers(f):f.tab==='perms'?adminPerms():viewIntegrations()}</div>`;
}
function userScopeLabel(u){
  if(u.role==='agent') return (distById(u.agencyId)?.name||'—')+' · '+t('n_companies',{n:(u.customerIds||[]).length});
  if(u.role==='enduser') return DB.customers.find(c=>c.id===u.customerId)?.company||'—';
  return 'SGE';
}
function adminUsers(f){
  let arr=DB.users;
  if(f.role) arr=arr.filter(u=>u.role===f.role);
  if(f.q){ const q=f.q.toLowerCase(); arr=arr.filter(u=>(u.name+' '+u.login+' '+u.email+' '+userScopeLabel(u)).toLowerCase().includes(q)); }
  const rows=arr.slice((f.page-1)*f.size,f.page*f.size);
  return `<div class="toolbar"><div class="row grow">
      <div class="search-inline">${ic('search',16)}<input class="input" id="adm-q" data-bind="adm.q" data-live="admSearch" value="${esc(f.q)}" placeholder="${t('adm_search_ph')}" aria-label="${t('search')}"></div>
      <select class="select" style="width:190px" data-bind="adm.role" data-re="resetPage" aria-label="${t('role')}"><option value="">${t('all_roles')}</option>${ALL_ROLES.map(r=>`<option value="${r}" ${f.role===r?'selected':''}>${t('role_'+r)} (${DB.users.filter(u=>u.role===r).length})</option>`).join('')}</select>
    </div><button class="btn primary sm" data-a="userNew">${ic('plus',15)} ${t('add_user')}</button></div>
  ${rows.length?`<div class="table-wrap"><table class="tbl cards"><thead><tr><th>${t('name')}</th><th>${t('username')}</th><th>${t('email')}</th><th>${t('role')}</th><th>${t('org_unit')}</th><th>${t('status')}</th><th></th></tr></thead><tbody>
  ${rows.map(u=>{ const self=u.id===S.userId; return `<tr style="${u.active===false?'opacity:.6':''}">
    <td data-l="${t('name')}"><span class="row" style="gap:8px;flex-wrap:nowrap"><span class="avatar" style="width:28px;height:28px;font-size:11px">${esc(initials(u.name))}</span><span><b style="font-weight:500">${esc(u.name)}</b>${self?` <span class="chip">${t('you')}</span>`:''}<br><small class="muted">${esc(t(u.title))}</small></span></span></td>
    <td data-l="${t('username')}" class="mono">${esc(u.login)}</td>
    <td data-l="${t('email')}">${esc(u.email)}</td>
    <td data-l="${t('role')}"><span class="pill ${u.role==='dev'?'s-testing':u.role==='manager'?'s-pending':u.role==='engineer'?'s-approved':u.role==='agent'?'s-delivered':u.role==='warehouse'?'s-in_service':u.role==='accountant'?'s-approved':'s-unassigned'}">${t('role_'+u.role)}</span></td>
    <td data-l="${t('org_unit')}">${esc(userScopeLabel(u))}</td>
    <td data-l="${t('status')}"><label class="row" style="gap:8px;flex-wrap:nowrap;cursor:${self?'not-allowed':'pointer'}"><span class="switch"><input type="checkbox" data-a="userActive" data-id="${u.id}" ${u.active!==false?'checked':''} ${self?'disabled':''} aria-label="${t('active')}"><span></span></span><span style="font-size:13px">${u.active!==false?t('active'):t('inactive')}</span></label></td>
    <td class="nowrap"><button class="btn sm ghost" data-a="userEdit" data-id="${u.id}">${ic('edit',14)} ${t('edit')}</button>${self?'':`<button class="btn sm ghost" style="color:var(--bad)" data-a="userDelAsk" data-id="${u.id}" aria-label="${t('delete')}">${ic('trash',14)}</button>`}</td>
  </tr>`; }).join('')}</tbody></table></div>`:`<div class="empty">${t('no_results')}</div>`}
  ${pager(arr.length,f,'adm')}`;
}
function adminPerms(){
  const scope={ manager:t('scope_all'), engineer:t('scope_all'), warehouse:t('scope_all'), accountant:t('scope_all'), agent:t('scope_agent'), enduser:t('scope_customer') };
  const col=r=>`<th style="text-align:center;min-width:120px">${t('role_'+r)}<br><small class="muted" style="font-weight:400">${DB.users.filter(u=>u.role===r).length} ${t('users_count')}</small></th>`;
  return `<div class="card-b" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)">
      <p class="muted" style="margin:0;max-width:760px">${t('perm_intro')}</p>
      <button class="btn sm" data-a="permResetAsk">${ic('refresh',14)} ${t('reset_perms')}</button></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th style="min-width:260px">${t('feature')}</th>${EDITABLE_ROLES.map(col).join('')}<th style="text-align:center;min-width:110px">${t('role_dev')}</th></tr></thead><tbody>
    <tr><td><b style="font-weight:600">${t('data_scope')}</b><br><small class="muted">${t('data_scope_desc')}</small></td>${EDITABLE_ROLES.map(r=>`<td style="text-align:center;font-size:12.5px">${scope[r]}</td>`).join('')}<td style="text-align:center;font-size:12.5px">${t('scope_all')}</td></tr>
    ${PERM_GROUPS.map(g=>`<tr><td colspan="${EDITABLE_ROLES.length+2}" style="background:var(--surface-2);font-weight:600;color:var(--accent-ink);font-size:12.5px;letter-spacing:.04em;text-transform:uppercase">${t(g.key)}</td></tr>
      ${g.perms.map(p=>`<tr><td><span style="font-weight:500">${t('perm_'+p)}</span><br><small class="muted">${t('pd_'+p)}</small></td>
        ${EDITABLE_ROLES.map(r=>{ const on=DB.perms[r].includes(p); return `<td style="text-align:center"><input type="checkbox" style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer" data-a="permToggle" data-r="${r}" data-p="${p}" ${on?'checked':''} aria-label="${t('role_'+r)} · ${t('perm_'+p)}"></td>`; }).join('')}
        <td style="text-align:center;color:var(--muted)" title="${t('full_access')}">${ic('lock',15)}</td></tr>`).join('')}`).join('')}
    </tbody></table></div>
    <div class="card-b hint">${t('perm_hint')}</div>`;
}
A.admTab = el => { S.ui.adm.tab=el.dataset.k; S.ui.adm.page=1; rerender(); };
A.admSearch = () => { S.ui.adm.page=1; rerender(); };
A.permToggle = el => {
  const r=el.dataset.r, p=el.dataset.p, list=DB.perms[r]; const i=list.indexOf(p);
  if(i>=0) list.splice(i,1); else list.push(p);
  save(); rerender(); toast(t(i>=0?'toast_perm_off':'toast_perm_on',{p:t('perm_'+p),r:t('role_'+r)}),'ok');
};
A.permResetAsk = () => openModal({type:'permReset'});
MODALS.permReset = () => ({ title:t('reset_perms'), body:`<p style="margin:0">${t('reset_perms_confirm')}</p>`, foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="permReset">${t('reset_perms')}</button>` });
A.permReset = () => { DB.perms=defaultPerms(); S.ui.modal=null; save(); rerender(); toast(t('toast_perm_reset'),'ok'); };
A.userActive = el => {
  const u=userById(el.dataset.id); if(!u||u.id===S.userId) return;
  u.active = u.active===false; save(); rerender(); toast(t(u.active?'toast_user_on':'toast_user_off',{n:u.name}),'ok');
};
A.userNew = () => openModal({type:'userForm', f:{ id:null, name:'', login:'', email:'', role:'engineer', title:'service_engineer', agencyId:DISTRIBUTORS[0].id, customerIds:[], customerId:DB.customers[0].id, active:true }, err:{}});
A.userEdit = el => { const u=userById(el.dataset.id); openModal({type:'userForm', f:{ id:u.id, name:u.name, login:u.login, email:u.email, role:u.role, title:u.title, agencyId:u.agencyId||DISTRIBUTORS[0].id, customerIds:(u.customerIds||[]).slice(), customerId:u.customerId||DB.customers[0].id, active:u.active!==false }, err:{}}); };
MODALS.userForm = m => {
  const f=m.f, E=m.err||{}; const self=f.id===S.userId;
  const err=k=>E[k]?`<div class="err-text">${esc(E[k])}</div>`:'';
  const titles=ROLE_TITLES[f.role]||[];
  return { title: f.id?t('edit_user'):t('add_user'), body:`<div class="form-grid">
    <div class="field"><label class="req" for="uf-n">${t('name')}</label><input class="input ${E.name?'err':''}" id="uf-n" data-bind="modal.f.name" value="${esc(f.name)}">${err('name')}</div>
    <div class="field"><label class="req" for="uf-l">${t('username')}</label><input class="input mono ${E.login?'err':''}" id="uf-l" data-bind="modal.f.login" value="${esc(f.login)}" autocomplete="off">${err('login')}</div>
    <div class="field full"><label class="req" for="uf-e">${t('email')}</label><input class="input ${E.email?'err':''}" id="uf-e" type="email" data-bind="modal.f.email" value="${esc(f.email)}">${err('email')}</div>
    <div class="field"><label class="req" for="uf-r">${t('role')}</label><select class="select" id="uf-r" data-bind="modal.f.role" data-re="userRoleChange" ${self?'disabled':''}>${ALL_ROLES.map(r=>`<option value="${r}" ${f.role===r?'selected':''}>${t('role_'+r)}</option>`).join('')}</select>${self?`<div class="hint">${t('cant_change_own_role')}</div>`:''}</div>
    <div class="field"><label for="uf-t">${t('title_col')}</label><select class="select" id="uf-t" data-bind="modal.f.title">${titles.map(x=>`<option value="${x}" ${f.title===x?'selected':''}>${t(x)}</option>`).join('')}</select></div>
    ${f.role==='agent'?`<div class="field full"><label class="req" for="uf-d">${t('distributor')}</label><select class="select" id="uf-d" data-bind="modal.f.agencyId">${DISTRIBUTORS.map(d=>`<option value="${d.id}" ${f.agencyId===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div>
    <div class="field full"><span class="lbl">${t('agent_companies')}</span><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px 12px;max-height:200px;overflow:auto;border:1px solid var(--line);border-radius:6px;padding:8px 10px">${DB.customers.map(c=>`<label class="row" style="gap:6px;font-size:13px;flex-wrap:nowrap;cursor:pointer"><input type="checkbox" data-a="ufCust" data-id="${c.id}" ${f.customerIds.includes(c.id)?'checked':''}> ${esc(c.company)}</label>`).join('')}</div><div class="hint">${t('agent_companies_hint')}</div></div>`:''}
    ${f.role==='enduser'?`<div class="field full"><label class="req" for="uf-c">${t('customer')}</label><select class="select" id="uf-c" data-bind="modal.f.customerId">${DB.customers.map(c=>`<option value="${c.id}" ${f.customerId===c.id?'selected':''}>${esc(c.company)}</option>`).join('')}</select></div>`:''}
    <label class="row full" style="gap:10px;cursor:${self?'not-allowed':'pointer'}"><span class="switch"><input type="checkbox" data-bind="modal.f.active" ${f.active?'checked':''} ${self?'disabled':''}><span></span></span><span class="lbl">${t('account_active')}</span></label>
  </div><div class="hint">${t('role_perm_hint')}</div>`,
  foot:`<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn primary" data-a="userSave">${f.id?t('save'):t('add_user')}</button>` };
};
A.userRoleChange = () => { const f=S.ui.modal.f; f.title=(ROLE_TITLES[f.role]||[''])[0]; rerender(); };
A.userSave = () => {
  const m=S.ui.modal, f=m.f, E={};
  f.name=(f.name||'').trim(); f.login=(f.login||'').trim().toLowerCase(); f.email=(f.email||'').trim();
  if(!f.name) E.name=t('e_required');
  if(!f.login) E.login=t('e_required'); else if(!/^[a-z0-9._-]{3,30}$/.test(f.login)) E.login=t('e_login_format'); else if(DB.users.some(u=>u.login===f.login&&u.id!==f.id)) E.login=t('e_login_taken');
  if(!/^\S+@\S+\.\S+$/.test(f.email)) E.email=t('e_email');
  m.err=E; if(Object.keys(E).length){ rerender(); return; }
  const data={ name:f.name, login:f.login, email:f.email, role:f.role, title:f.title||(ROLE_TITLES[f.role]||[''])[0], active:f.active!==false,
    agencyId: f.role==='agent'?f.agencyId:undefined, customerIds: f.role==='agent'?f.customerIds.slice():undefined, customerId: f.role==='enduser'?f.customerId:undefined };
  if(f.id){ const u=userById(f.id); Object.assign(u,data); delete u.distributorId; if(f.role!=='agent'){ delete u.agencyId; delete u.customerIds; } if(f.role!=='enduser') delete u.customerId; if(u.id===S.userId) u.active=true; }
  else DB.users.push(Object.assign({ id:'u_'+Date.now().toString(36) }, data));
  S.ui.modal=null; save(); rerender(); toast(t(f.id?'toast_user_saved':'toast_user_added',{n:f.name}),'ok');
};
A.userDelAsk = el => { const u=userById(el.dataset.id); const used=DB.tickets.some(x=>x.assigneeId===u.id||x.createdBy===u.id); openModal({type:'userDel', id:u.id, used}); };
MODALS.userDel = m => { const u=userById(m.id); return { title:t('delete_user'), body: m.used? `<p style="margin:0">${t('user_has_data',{n:esc(u.name)})}</p>` : `<p style="margin:0">${t('delete_user_confirm',{n:esc(u.name)})}</p>`,
  foot: m.used? `<button class="btn" data-a="closeModal">${t('close')}</button><button class="btn primary" data-a="userDeactivate" data-id="${u.id}">${t('deactivate')}</button>` : `<button class="btn" data-a="closeModal">${t('cancel')}</button><button class="btn danger" data-a="userDel" data-id="${u.id}">${t('delete')}</button>` }; };
A.userDeactivate = el => { const u=userById(el.dataset.id); u.active=false; S.ui.modal=null; save(); rerender(); toast(t('toast_user_off',{n:u.name}),'ok'); };
A.userDel = el => { const i=DB.users.findIndex(u=>u.id===el.dataset.id); const n=DB.users[i].name; DB.users.splice(i,1); S.ui.modal=null; save(); rerender(); toast(t('toast_user_deleted',{n}),'ok'); };

A.ufCust = el => { const f=S.ui.modal.f; const i=f.customerIds.indexOf(el.dataset.id); if(i>=0) f.customerIds.splice(i,1); else f.customerIds.push(el.dataset.id); rerender(); };
