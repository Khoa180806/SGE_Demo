/* ===== ERP mock data: roles, stock, suppliers, purchases, sales, service contracts, expenses ===== */
const STOCK_CATS = ['board','module','fan','connector','protect','inverter','battery','accessory','consumable'];
const EXP_CATS = ['shipping','travel','parts','labor','tools','rma','office','other'];
const SVC_STEPS = ['quote','sent','signed','in_progress','done'];
const SO_STEPS = ['draft','confirmed','delivered','done'];
const PO_STEPS = ['draft','ordered','received'];
const PAY_METHODS = ['bank','cash'];
const VAT_DEFAULT = 8;

/* Convert legacy distributor accounts into SGE technicians; add warehouse, accountant and agent accounts */
function upgradeRoles(db){
  const techNames=['KTV Trần Minh Tâm','KTV Lê Hoàng Phúc','KTV Phạm Quốc Bảo','KTV Võ Thành Đạt','KTV Nguyễn Hữu Nghĩa','KTV Đặng Văn Khoa','KTV Bùi Gia Huy','KTV Huỳnh Tấn Lộc'];
  let k=0;
  db.users.forEach(u=>{ if(u.role==='distributor'){ u.role='engineer'; u.title='field_tech'; u.name=techNames[k%techNames.length]; u.email=`ktv${k+1}@sge-demo.vn`; u.login=`ktv${k+1}`; delete u.distributorId; k++; } });
  const custOf = aid => db.customers.filter(c=>c.distributorId===aid).map(c=>c.id);
  db.users.push(
    { id:'u_wh',  role:'warehouse',  name:'Thủ kho', title:'warehouse_keeper', email:'kho@sge-demo.vn', login:'warehouse' },
    { id:'u_acc', role:'accountant', name:'Kế toán', title:'accountant_t', email:'ketoan@sge-demo.vn', login:'accountant' },
    { id:'u_agent', role:'agent', agencyId:'bke', customerIds:custOf('bke'), name:'Đại lý BKE', title:'agent_t', email:'daily@bke-demo.vn', login:'agent' },
    { id:'u_agent2', role:'agent', agencyId:'xb', customerIds:custOf('xb'), name:'Đại lý XB', title:'agent_t', email:'daily@xb-demo.vn', login:'agent2' },
  );
}

function applyStaff(db){
  const set=(id,name,email)=>{ const u=db.users.find(x=>x.id===id); if(u){ u.name=name; u.email=email; } };
  set('u_mgr','Bùi Hoài Nam','nambui@gmail.com');
  set('u_eng','Trần Minh Thuận','minhthuanatran@gmail.com');
  set('u_eng2','Nguyễn Trực','trucnguyenys@gmail.com');
  set('u_acc','Đinh Thị Thu Nga','dinhthithunga070504@gmail.com');
  set('u_wh','Đinh Thị Thu Nguyệt','nguyetdinh469@gmail.com');
}
function buildErp(db){
  applyStaff(db);
  db.tickets.forEach(x=>{ if(x.approval){ delete x.approval.gspNo; delete x.approval.maNo; } });
  const rnd0=mulberry32(20261029); const R2=()=>rnd0(); const ri=(a,b)=>a+Math.floor(R2()*(b-a+1)); const pk=a=>a[Math.floor(R2()*a.length)];
  const NOWE=Date.now(); const DAY=864e5, HR=36e5;
  const r1000 = v => Math.round(v/1000)*1000;
  const mon = ts => { const d=new Date(ts); return String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,'0'); };
  const seq={}; const no=(p,ts)=>{ const k=p+mon(ts); seq[k]=(seq[k]||0)+1; return `${p}${mon(ts)}-${String(seq[k]).padStart(3,'0')}`; };

  /* ---- suppliers ---- */
  db.suppliers=[
    { id:'sp1', name:'Sungrow Power Supply Co., Ltd', short:'Sungrow', contact:'Service Parts Dept.', phone:'+86 551 6532 7834', email:'parts@supplier-demo.com', address:'Hefei, Anhui, China', terms:30 },
    { id:'sp2', name:'Công ty TNHH Linh kiện Điện tử Tân Phú', short:'Tân Phú', contact:'Anh Khánh', phone:'0908 112 334', email:'sales@tanphu-demo.vn', address:'Q. Tân Phú, TP HCM', terms:15 },
    { id:'sp3', name:'Công ty CP Thiết bị Điện Minh Quang', short:'Minh Quang', contact:'Chị Hạnh', phone:'0912 556 778', email:'order@minhquang-demo.vn', address:'TP Thủ Đức, TP HCM', terms:30 },
    { id:'sp4', name:'Công ty TNHH Vận tải Nhanh Sài Gòn', short:'VT Sài Gòn', contact:'Anh Phát', phone:'0933 445 667', email:'cs@vtsg-demo.vn', address:'Q. Bình Tân, TP HCM', terms:7 },
  ];

  /* ---- stock items (parts from catalog + extras + saleable goods) ---- */
  const partMeta={ board:[3200000,9800000], module:[5500000,14500000], fan:[450000,1200000], connector:[60000,280000], protect:[650000,2200000] };
  const guessCat = n => /fan|quạt/i.test(n)?'fan':/mc4|connector|giắc|terminal/i.test(n)?'connector':/spd|fuse|surge|cầu chì/i.test(n)?'protect':/igbt|module/i.test(n)?'module':'board';
  const stock=[];
  PARTS.forEach((p,i)=>{ const cat=guessCat(p.en||p.vi||''); const [a,b]=partMeta[cat]; const cost=r1000(a+R2()*(b-a)); stock.push({ pn:p.pn, name:p.en||p.vi, cat, unit:'pcs', qty:ri(0,12), min:ri(2,5), cost, price:r1000(cost*(1.25+R2()*0.2)), loc:'K1-'+String.fromCharCode(65+i%4)+(1+i%5), supplierId:'sp1' }); });
  const extra=[
    ['BP005120','Control board SG110CX','board','sp1'],['BP005233','Communication board WiNet','board','sp1'],['BP004877','AC filter board','board','sp1'],
    ['BP004990','Power supply board (SMPS)','board','sp1'],['FN000315','External fan 120mm','fan','sp2'],['MC400020','MC4 connector pair 1500V','connector','sp2'],
    ['ES000210','Type II SPD 1100Vdc','protect','sp3'],['FU000032','DC fuse 20A 1500V','protect','sp3'],['CB000016','AC breaker 3P 250A','protect','sp3'],
    ['TH000004','Thermal paste 50g','consumable','sp2'],['CA000035','Cáp AC 4x35mm² (m)','consumable','sp3'],['SL000002','Silicone seal kit','consumable','sp2'],
  ];
  extra.forEach(([pn,name,cat,sid],i)=>{ const [a,b]=partMeta[cat]||[80000,600000]; const cost=r1000(a+R2()*(b-a)); stock.push({ pn, name, cat, unit:/\(m\)/.test(name)?'m':'pcs', qty:/\(m\)/.test(name)?ri(40,180):ri(0,20), min:/\(m\)/.test(name)?50:ri(2,6), cost, price:r1000(cost*(1.3+R2()*0.25)), loc:'K2-'+String.fromCharCode(65+i%3)+(1+i%6), supplierId:sid }); });
  const goods=[
    ['SG110CX','Biến tần Sungrow SG110CX (110kW)','inverter',98000000],['SG125CX-P2','Biến tần Sungrow SG125CX-P2 (125kW)','inverter',112000000],
    ['SG50CX','Biến tần Sungrow SG50CX (50kW)','inverter',52000000],['SG33CX','Biến tần Sungrow SG33CX (33kW)','inverter',38500000],
    ['SH10RT','Biến tần hybrid SH10RT (10kW)','inverter',41000000],['SG5.0RS','Biến tần SG5.0RS (5kW)','inverter',12800000],
    ['SBR096','Pin lưu trữ SBR096 (9.6kWh)','battery',86000000],['WINET-S','Dongle giám sát WiNet-S','accessory',1650000],['EYEM4','Logger EyeM4','accessory',6900000],
  ];
  goods.forEach(([pn,name,cat,cost],i)=>stock.push({ pn, name, cat, unit:'pcs', qty:ri(0,8), min:cat==='accessory'?5:2, cost, price:r1000(cost*1.12), loc:'K3-'+(i+1), supplierId:'sp1' }));
  // make a few items low/out of stock on purpose
  ['BP005233','FN000315','SG125CX-P2'].forEach(pn=>{ const s=stock.find(x=>x.pn===pn); if(s) s.qty=pn==='SG125CX-P2'?0:1; });
  db.stock=stock;
  const sBy = pn => stock.find(s=>s.pn===pn);
  const moves=[]; const mv=(type,pn,qty,at,ref,by,note)=>moves.push({ id:'m'+(moves.length+1), no:no(type==='in'?'NK':type==='out'?'XK':'DC',at), type, pn, qty, at, ref:ref||null, by:by||'u_wh', note:note||'' });

  /* ---- purchase orders ---- */
  const purchases=[];
  const poPlan=[[52,'received'],[40,'received'],[26,'received'],[14,'received'],[6,'ordered'],[1,'draft']];
  poPlan.forEach(([ago,status],i)=>{
    const at=NOWE-ago*DAY-ri(1,8)*HR; const sid=i%3===2?'sp2':(i%3===1?'sp3':'sp1');
    const pool=stock.filter(s=>s.supplierId===sid); const items=[];
    for(let j=0;j<ri(2,4);j++){ const s=pk(pool); if(items.some(x=>x.pn===s.pn)) continue; items.push({ pn:s.pn, qty:s.cat==='inverter'||s.cat==='battery'?ri(1,3):ri(3,10), cost:s.cost }); }
    const po={ id:'po'+(i+1), no:no('PO',at), supplierId:sid, at, items, vat:VAT_DEFAULT, status, note:'', payments:[], expectedAt:at+ri(7,20)*DAY, receivedAt:null, createdBy:i%2?'u_wh':'u_mgr' };
    if(status==='received'){ po.receivedAt=at+ri(5,15)*DAY; items.forEach(it=>mv('in',it.pn,it.qty,po.receivedAt,{kind:'po',id:po.id},'u_wh')); const tot=poTotal(po); po.payments.push({ at:po.receivedAt+ri(2,10)*DAY, amount:i===3?Math.round(tot*0.5/1000)*1000:tot, method:'bank', by:'u_acc', note:'' }); }
    purchases.push(po);
  });
  db.purchases=purchases;

  /* ---- sales orders (hợp đồng mua bán) ---- */
  const orders=[]; const saleGoods=stock.filter(s=>['inverter','battery','accessory'].includes(s.cat));
  const soPlan=[[48,'done'],[37,'done'],[29,'delivered'],[21,'delivered'],[15,'done'],[9,'confirmed'],[4,'confirmed'],[1,'draft']];
  soPlan.forEach(([ago,status],i)=>{
    const at=NOWE-ago*DAY-ri(1,8)*HR; const c=db.customers[(i*5+1)%db.customers.length];
    const items=[]; const n=ri(1,3);
    for(let j=0;j<n;j++){ const s=pk(saleGoods); if(items.some(x=>x.pn===s.pn)) continue; items.push({ pn:s.pn, name:s.name, qty:s.cat==='accessory'?ri(2,6):ri(1,3), price:s.price }); }
    const so={ id:'so'+(i+1), no:no('MB',at), customerId:c.id, at, items, vat:VAT_DEFAULT, discount:i%3===0?2:0, status, payments:[], dueDays:30, deliveredAt:null, note:'', createdBy:i%2?'u_acc':'u_mgr', warrantyYears:5 };
    if(['delivered','done'].includes(status)){ so.deliveredAt=at+ri(2,6)*DAY; items.forEach(it=>mv('out',it.pn,it.qty,so.deliveredAt,{kind:'so',id:so.id},'u_wh')); }
    const tot=docTotal(so);
    if(status==='done') so.payments.push({ at:at+ri(5,25)*DAY, amount:tot, method:'bank', by:'u_acc', note:'' });
    else if(status==='delivered') so.payments.push({ at:at+ri(1,4)*DAY, amount:r1000(tot*(i%2?0.3:0.5)), method:'bank', by:'u_acc', note:t0('Đặt cọc','Deposit') });
    else if(status==='confirmed' && i===5) so.payments.push({ at:at+DAY, amount:r1000(tot*0.3), method:'bank', by:'u_acc', note:t0('Đặt cọc','Deposit') });
    orders.push(so);
  });
  db.orders=orders;

  /* ---- service contracts (hợp đồng dịch vụ sửa chữa) linked to tickets ---- */
  const svc=[]; const lvlOf={draft:0,unassigned:0,diagnosing:1,returned:1,pending:2,approved:3,in_service:4,on_hold:4,testing:5,delivered:6,closed:7,rejected:-1,cancelled:-1};
  db.tickets.slice().sort((a,b)=>a.createdAt-b.createdAt).forEach(x=>{
    const lv=lvlOf[x.status]; if(lv==null||lv<1) return;
    const paid = x.type==='OW'||x.type==='PR';
    const sn=x.products[0].sn; const at=(x.diagnosis&&x.diagnosis.at)||x.createdAt+ri(4,30)*HR;
    const parts=(x.parts&&x.parts.length?x.parts:(x.diagnosis&&x.diagnosis.estParts)||[]);
    const items=[];
    parts.forEach(p=>{ const s=sBy(p.pn); items.push({ type:'part', pn:p.pn, desc:s?s.name:p.pn, qty:p.qty||1, price:paid?(s?s.price:2500000):0 }); });
    items.push({ type:'labor', desc:t0('Công kiểm tra, sửa chữa biến tần','Inspection & repair labour'), qty:1, price:paid?r1000(ri(15,45)*100000):0 });
    items.push({ type:'other', desc:t0('Phí đi lại kỹ thuật viên','Technician travel fee'), qty:1, price:r1000(ri(5,20)*100000) });
    const status = lv<=1?'quote': lv===2?'sent': lv===3?'signed': lv<=6?'in_progress':'done';
    const c={ id:'sc'+(svc.length+1), no:no('DV',at), ticketId:x.id, customerId:x.customerId, sn, model:x.products[0].model, at, items, vat:VAT_DEFAULT, status, warranty:!paid,
      validDays:15, signedAt: lv>=3?at+ri(1,3)*DAY:null, doneAt: status==='done'?(x.closedAt||at+ri(5,12)*DAY):null, payments:[], createdBy:'u_mgr', note:'', repairWarrantyMonths:6 };
    const tot=docTotal(c);
    if(status==='done') c.payments.push({ at:c.doneAt+ri(1,10)*DAY, amount:svc.length%4===1?r1000(tot*0.5):tot, method:pk(PAY_METHODS), by:'u_acc', note:'' });
    else if(['signed','in_progress'].includes(status) && paid) c.payments.push({ at:c.signedAt+DAY, amount:r1000(tot*0.5), method:'bank', by:'u_acc', note:t0('Tạm ứng 50%','50% advance') });
    if(lv>=4) items.filter(i=>i.type==='part').forEach(i=>mv('out',i.pn,i.qty,c.signedAt+ri(1,3)*DAY,{kind:'svc',id:c.id},'u_wh',x.no));
    if(x.status==='closed'){ c.invoice={ no:no('HD',c.doneAt), at:c.doneAt, by:'u_acc' }; const due=docTotal(c)-docPaid(c); if(due>0) c.payments.push({ at:c.doneAt+ri(1,6)*DAY, amount:due, method:'bank', by:'u_acc', note:'' }); }
    if(x.status==='delivered' && docTotal(c)>0){ c.invoice={ no:no('HD',x.updatedAt||at), at:(x.updatedAt||at)+DAY, by:'u_acc' }; x.status = docPaid(c)>=docTotal(c)?'paid':'invoiced'; }
    svc.push(c); x.svcId=c.id;
  });
  // warranty tickets that used parts (no contract) still consume stock
  db.tickets.forEach(x=>{ if(x.svcId||!x.parts||!x.parts.length||(lvlOf[x.status]||0)<4) return; x.parts.forEach(p=>mv('out',p.pn,p.qty||1,(x.approval&&x.approval.at||x.createdAt)+ri(1,4)*DAY,{kind:'ticket',id:x.id},'u_wh',x.no)); });
  db.svc=svc;
  /* device intake records */
  const accs=['Nắp che đầu nối, giắc AC','Giắc AC, dongle WiNet-S','Không có phụ kiện','Nắp che, 2 giắc MC4','Giắc AC'];
  db.tickets.forEach((x,i)=>{ if(['draft','unassigned'].includes(x.status)) return;
    x.intake={ method:pk(['courier','courier','walkin','pickup']), at:x.createdAt+ri(2,30)*HR, by:x.assigneeId||'u_wh', cond:i%7===3?'scratch':i%11===5?'burn':'ok', condNote:'', acc:pk(accs), loc:'Kệ chờ sửa '+String.fromCharCode(65+i%3)+(1+i%4) }; });
  /* one quote declined by the customer, unit waiting to be returned */
  const dx=db.tickets.find(x=>x.status==='pending'&&x.svcId&&svcById0(svc,x.svcId).status==='sent'&&x.type!=='RW');
  if(dx){ const c=svcById0(svc,dx.svcId); const fee=300000; dx.decline={at:NOWE-5*HR,by:'u_mgr',reason:'Khách thấy chi phí sửa cao, dự kiến thay máy mới.',fee};
    c.declined={at:dx.decline.at,by:'u_mgr',reason:dx.decline.reason,quoteItems:c.items.map(i=>({...i})),quoteTotal:docTotal(c)}; c.items=[{type:'other',desc:'Phí kiểm tra, chẩn đoán (khách không sửa)',qty:1,price:fee}]; c.status='declined';
    dx.history.push({at:dx.decline.at,by:'u_mgr',action:'declined',from:'pending',to:'return_pending',note:dx.decline.reason}); dx.status='return_pending'; dx.updatedAt=dx.decline.at; }

  /* ---- expenses ---- */
  const expenses=[];
  const expDesc={ shipping:[['Gửi biến tần về xưởng','Ship inverter to workshop'],['Giao trả biến tần cho khách','Return inverter to customer'],['Gửi board RMA về hãng','Send RMA board to vendor']],
    travel:[['Công tác phí kỹ thuật viên','Technician travel allowance'],['Xăng xe, cầu đường','Fuel and tolls'],['Lưu trú tại công trình','On-site accommodation']],
    parts:[['Mua linh kiện gấp ngoài','Urgent local parts purchase']], labor:[['Thuê nhân công tháo lắp','Hired labour for (un)mounting']],
    tools:[['Mua đồng hồ đo cách điện','Insulation tester purchase'],['Bộ dụng cụ kỹ thuật','Technician tool kit']], rma:[['Phí kiểm định board RMA','RMA board inspection fee']],
    office:[['Văn phòng phẩm','Office supplies'],['Phí chuyển phát hồ sơ','Document courier']], other:[['Chi phí khác','Other expense']] };
  const linked=db.tickets.filter(x=>(lvlOf[x.status]||0)>=3);
  for(let i=0;i<34;i++){
    const cat = i<20? pk(['shipping','shipping','travel','travel','parts','labor','rma']) : pk(['tools','office','other','travel']);
    const x = i<20? linked[i%Math.max(1,linked.length)] : null;
    const at = x? x.createdAt+ri(1,10)*DAY : NOWE-ri(1,70)*DAY;
    const base = {shipping:[180,1500],travel:[300,2800],parts:[400,3500],labor:[500,2500],tools:[800,6500],rma:[600,2000],office:[80,600],other:[100,900]}[cat];
    const ageD=(NOWE-at)/DAY;
    const status = ageD>20?'paid': ageD>6?(i%5===0?'approved':'paid'): (i%3===0?'pending':'approved');
    const d=pk(expDesc[cat]);
    expenses.push({ id:'ex'+(i+1), no:no('CP',Math.min(at,NOWE)), at:Math.min(at,NOWE-HR), cat, amount:r1000(ri(base[0],base[1])*1000), desc:{vi:d[0],en:d[1]}, ticketId:x?x.id:null, sn:x?x.products[0].sn:'', svcId:x&&x.svcId||null,
      by:x?(x.assigneeId||'u_eng'):pk(['u_mgr','u_acc','u_wh']), status, approvedBy:status!=='pending'?'u_mgr':null, paidAt:status==='paid'?Math.min(at+ri(1,5)*DAY,NOWE-HR):null, method:'bank', supplierId:cat==='shipping'?'sp4':null });
  }
  expenses.sort((a,b)=>b.at-a.at);
  db.expenses=expenses;
  moves.sort((a,b)=>b.at-a.at);
  db.moves=moves;
  db.erpSeq=seq;
  // overdue example: one delivered sale is past due
  const od=orders.find(o=>o.status==='delivered'); if(od) od.dueDays=7;
}
function t0(vi,en){ return {vi,en}; }
function lineTotal(it){ return (Number(it.qty)||0)*(Number(it.price!=null?it.price:it.cost)||0); }
function docSubtotal(d){ return (d.items||[]).reduce((s,it)=>s+lineTotal(it),0); }
function docDiscount(d){ return Math.round(docSubtotal(d)*(Number(d.discount)||0)/100); }
function docVat(d){ return Math.round((docSubtotal(d)-docDiscount(d))*(Number(d.vat)||0)/100); }
function docTotal(d){ return docSubtotal(d)-docDiscount(d)+docVat(d); }
function poTotal(p){ return docTotal(p); }
function docPaid(d){ return (d.payments||[]).reduce((s,p)=>s+(Number(p.amount)||0),0); }
function docDue(d){ return Math.max(0,docTotal(d)-docPaid(d)); }
function payState(d){ const tot=docTotal(d), p=docPaid(d); if(tot<=0) return 'na'; if(p<=0) return 'unpaid'; if(p<tot) return 'partial'; return 'paid'; }

function svcById0(list,id){ return list.find(x=>x.id===id)||{}; }
