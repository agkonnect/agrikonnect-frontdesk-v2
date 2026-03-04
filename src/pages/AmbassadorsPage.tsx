import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Ambassador, DailyLog } from '../types';
import { computeTierStatus, getTierLabel, getTierColor, getTierBorderColor, TierStatus } from '../lib/ambassadorTier';

const REGIONS = ['Ashanti','Greater Accra','Central','Eastern','Western','Northern','Upper East','Upper West','Volta','Brong-Ahafo','Savannah','North East','Bono','Bono East','Ahafo','Western North','Oti'];
interface FD { name:string; region:string; phone:string; type:'field'|'digital'; tier:1|2|3; status:'active'|'inactive'; notes:string; }
const EF: FD = { name:'', region:'', phone:'', type:'field', tier:1, status:'active', notes:'' };

export default function AmbassadorsPage() {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState<FD>({...EF});
  const [saving, setSaving] = useState(false);
  const [fRegion, setFRegion] = useState('');
  const [fTier, setFTier] = useState<''|'1'|'2'|'3'>('');
  const [fStatus, setFStatus] = useState<''|'active'|'inactive'>('');
  const [sel, setSel] = useState<Ambassador|null>(null);

  async function load() {
    setLoading(true);
    const [ar, lr] = await Promise.all([
      supabase.from('ambassadors').select('*').order('created_at',{ascending:false}),
      supabase.from('daily_logs').select('*').not('ambassador_id','is',null),
    ]);
    if (ar.error) { setError(ar.error.message); setLoading(false); return; }
    setAmbassadors((ar.data??[]) as Ambassador[]);
    if (lr.data) setLogs(lr.data as DailyLog[]);
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  function openAdd() { setForm({...EF}); setEditingId(null); setShowForm(true); }
  function openEdit(a:Ambassador) {
    setForm({name:a.name,region:a.region,phone:a.phone,type:a.type,tier:a.tier,status:a.status,notes:a.notes??''});
    setEditingId(a.id); setShowForm(true);
  }
  async function save() {
    setSaving(true);
    if (editingId) await supabase.from('ambassadors').update(form).eq('id',editingId);
    else await supabase.from('ambassadors').insert([form]);
    setSaving(false); setShowForm(false); load();
  }
  async function upgradeTier(a:Ambassador, t:1|2|3) {
    await supabase.from('ambassadors').update({tier:t}).eq('id',a.id); load();
  }

  const ts = new Map<string,TierStatus>();
  for (const a of ambassadors) ts.set(a.id, computeTierStatus(a,logs));
  const filtered = ambassadors.filter(a=>{
    if (fRegion && a.region!==fRegion) return false;
    if (fTier && a.tier!==Number(fTier)) return false;
    if (fStatus && a.status!==fStatus) return false;
    return true;
  });
  const upgrades = [...ts.values()].filter(s=>s.suggestUpgrade).length;
  const selLogs = sel ? logs.filter(l=>l.ambassador_id===sel.id) : [];

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400 animate-pulse">Loading...</p></div>;
  if (error) return <div className="flex items-center justify-center min-h-screen"><p className="text-red-500">{error}</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ambassadors</h1>
          <p className="text-sm text-gray-500">{ambassadors.length} total &middot; {ambassadors.filter(a=>a.status==='active').length} active
            {upgrades>0 && <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">&#x2B06; {upgrades} upgrade{upgrades>1?'s':''} ready</span>}
          </p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">+ Add Ambassador</button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {label:'Active',value:ambassadors.filter(a=>a.status==='active').length,color:'text-green-600'},
          {label:'Referrals This Month',value:[...ts.values()].reduce((s,t)=>s+t.referralsThisMonth,0),color:'text-blue-600'},
          {label:'Upgrades Ready',value:upgrades,color:'text-yellow-600'},
          {label:'Star Ambassadors',value:ambassadors.filter(a=>a.tier===3).length,color:'text-purple-600'},
        ].map(c=>(
          <div key={c.label} className="bg-white rounded-xl shadow p-4">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <select value={fRegion} onChange={e=>setFRegion(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">All Regions</option>
          {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <select value={fTier} onChange={e=>setFTier(e.target.value as ''|'1'|'2'|'3')} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">All Tiers</option>
          <option value="1">T1 Starter</option><option value="2">T2 Active</option><option value="3">T3 Star</option>
        </select>
        <select value={fStatus} onChange={e=>setFStatus(e.target.value as ''|'active'|'inactive')} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">All Status</option>
          <option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ambassador</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Region</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Refs/Mo</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Resolved</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(a=>{
              const s=ts.get(a.id)!;
              const tgt=[10,20,30][a.tier-1];
              const pct=Math.min(100,Math.round((s.referralsThisMonth/tgt)*100));
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="font-medium text-gray-900">{a.name}</div><div className="text-xs text-gray-400">{a.type} &middot; {a.phone}</div></td>
                  <td className="px-4 py-3 text-gray-600">{a.region}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTierColor(a.tier)}`}>T{a.tier} {getTierLabel(a.tier)}</span>
                      {s.suggestUpgrade && <span className="text-yellow-500 text-xs" title={`Eligible T${s.eligibleTier}`}>&#x2B06;</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-sm font-medium ${s.referralsThisMonth>=tgt?'text-green-600':'text-gray-700'}`}>{s.referralsThisMonth}/{tgt}</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${s.referralsThisMonth>=tgt?'bg-green-500':'bg-blue-400'}`} style={{width:`${pct}%`}} /></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">{s.verifiedTransactions}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status==='active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{a.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={()=>setSel(a)} className="text-xs text-green-600 hover:underline">Logs</button>
                      <button onClick={()=>openEdit(a)} className="text-xs text-gray-500 hover:underline">Edit</button>
                      {s.suggestUpgrade && <button onClick={()=>upgradeTier(a,s.eligibleTier)} className="text-xs text-yellow-600 font-semibold hover:underline">&#x2191; T{s.eligibleTier}</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length===0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No ambassadors found</td></tr>}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={()=>setSel(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex justify-between items-start">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{sel.name}</h2>
                <div className="flex gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTierColor(sel.tier)}`}>T{sel.tier} {getTierLabel(sel.tier)}</span>
                  <span className="text-xs text-gray-500">{sel.region}</span>
                </div>
              </div>
              <button onClick={()=>setSel(null)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            {(()=>{
              const s=ts.get(sel.id)!;
              return (
                <div className={`m-4 p-4 rounded-xl border-2 ${getTierBorderColor(sel.tier)}`}>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-3">This Month</div>
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    <div><div className="text-2xl font-bold">{s.referralsThisMonth}</div><div className="text-xs text-gray-500">Referrals</div></div>
                    <div><div className="text-2xl font-bold">{s.verifiedTransactions}</div><div className="text-xs text-gray-500">Resolved</div></div>
                    <div><div className="text-2xl font-bold text-green-600">GHS {s.honorarium}</div><div className="text-xs text-gray-500">Base Pay</div></div>
                  </div>
                  {s.bonusPerTransaction>0&&s.verifiedTransactions>0&&<div className="text-xs text-blue-600">+ GHS {s.bonusPerTransaction*s.verifiedTransactions} bonus</div>}
                  {s.progressToNextTier&&sel.tier<3&&(
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-0.5">
                      <div className="font-medium text-gray-700">To T{sel.tier+1}:</div>
                      {s.progressToNextTier.referralsNeeded>0&&<div>&#x2022; {s.progressToNextTier.referralsNeeded} more referrals</div>}
                      {s.progressToNextTier.tenureNeeded>0&&<div>&#x2022; {s.progressToNextTier.tenureNeeded} more month(s)</div>}
                      {s.progressToNextTier.transactionsNeeded>0&&<div>&#x2022; {s.progressToNextTier.transactionsNeeded} more resolved</div>}
                      {s.progressToNextTier.referralsNeeded===0&&s.progressToNextTier.tenureNeeded===0&&s.progressToNextTier.transactionsNeeded===0&&<div className="text-green-600 font-medium">&#x2713; Upgrade ready!</div>}
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="px-4 pb-6">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Referred Contacts ({selLogs.length})</div>
              {selLogs.length===0&&<div className="text-sm text-gray-400 py-6 text-center">No referrals yet</div>}
              <div className="space-y-2">
                {selLogs.map(l=>(
                  <div key={l.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{l.contact_name??'Unknown'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${l.outcome==='resolved'?'bg-green-100 text-green-600':'bg-gray-100 text-gray-500'}`}>{l.outcome.replace(/_/g,' ')}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{l.contact_type} &middot; {l.region} &middot; {l.crop??'—'}</div>
                    <div className="text-xs text-gray-400">{new Date(l.created_at).toLocaleDateString('en-GH',{day:'numeric',month:'short',year:'numeric'})}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">{editingId?'Edit':'Add'} Ambassador</h2>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Ama Owusu" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Phone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0244xxxxxx" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
                <select value={form.region} onChange={e=>setForm({...form,region:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select region...</option>
                  {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select value={form.type} onChange={e=>setForm({...form,type:e.target.value as 'field'|'digital'})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="field">Field</option><option value="digital">Digital</option>
                </select>
              </div>
              {editingId&&(
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Tier</label>
                  <select value={form.tier} onChange={e=>setForm({...form,tier:Number(e.target.value) as 1|2|3})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value={1}>T1 Starter</option><option value={2}>T2 Active</option><option value={3}>T3 Star</option>
                  </select>
                </div>
              )}
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value as 'active'|'inactive'})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowForm(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              <button onClick={save} disabled={saving||!form.name||!form.phone||!form.region} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Saving...':editingId?'Save':'Add Ambassador'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
