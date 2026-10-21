'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CalendarClock, RefreshCw, Layers, CheckSquare, Trash, Play, CheckCircle2 } from 'lucide-react';

interface PMPlan {
  id: number;
  planName: string;
  departmentId: number | null;
  departmentName: string | null;
  assetId: number;
  assetTag: string;
  assetName: string;
  assignedToUserName: string | null;
  latestTicketStatus: 'Open' | 'In_Progress' | 'Pending' | 'Resolved' | 'Closed' | 'Pending_Approval' | null;
  latestTicketNo: string | null;
  frequency: 'Monthly' | 'Quarterly' | 'Yearly';
  nextDueDate: string;
  checklistJson: string; // JSON string array
  createdAt: string;
}

interface AssetSummary {
  id: number;
  assetTag: string;
  name: string;
  assignedToUserDepartmentId: number | null;
}

export default function PMPage() {
  const [plans, setPlans] = useState<PMPlan[]>([]);
  const [assetsList, setAssetsList] = useState<AssetSummary[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form Fields
  const [planName, setPlanName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [frequency, setFrequency] = useState<'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [nextDueDate, setNextDueDate] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset selected asset if it doesn't belong to the newly selected department
  useEffect(() => {
    if (departmentId && assetId && assetId !== 'all') {
      const selectedAsset = assetsList.find(a => a.id === Number(assetId));
      if (selectedAsset && selectedAsset.assignedToUserDepartmentId !== Number(departmentId)) {
        setAssetId('');
      }
    }
  }, [departmentId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, assetsRes, deptsRes] = await Promise.all([
        fetch('/api/pm-plans'),
        fetch('/api/assets'),
        fetch('/api/departments')
      ]);

      if (plansRes.ok) {
        const plansData = (await plansRes.json() as any);
        setPlans(plansData);
      }
      if (assetsRes.ok) {
        const assetsData = (await assetsRes.json() as any);
        // Only show Active assets for PM plans
        setAssetsList(
          assetsData
            .filter((a: any) => a.status === 'Active')
            .map((a: any) => ({
              id: a.id,
              assetTag: a.assetTag,
              name: a.name,
              assignedToUserDepartmentId: a.assignedToUserDepartmentId
            }))
        );
      }
      if (deptsRes.ok) {
        const deptsData = (await deptsRes.json() as any);
        setDepartmentsList(deptsData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditId(null);
    setPlanName('');
    setDepartmentId('');
    setAssetId('');
    setFrequency('Monthly');
    setNextDueDate('');
    setChecklist(['ทำความสะอาดฝุ่นผงภายในเครื่อง', 'ตรวจสอบพัดลมระบายความร้อน', 'ตรวจสอบพื้นที่จัดเก็บข้อมูล (Disk Space)', 'อัปเดตระบบปฏิบัติการและโปรแกรมความปลอดภัย']);
    setNewItem('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (plan: PMPlan) => {
    setEditId(plan.id);
    setPlanName(plan.planName);
    setDepartmentId(plan.departmentId ? String(plan.departmentId) : '');
    setAssetId(String(plan.assetId));
    setFrequency(plan.frequency);
    setNextDueDate(plan.nextDueDate);
    try {
      setChecklist(JSON.parse(plan.checklistJson));
    } catch (e) {
      setChecklist([]);
    }
    setNewItem('');
    setError('');
    setShowModal(true);
  };

  const handleAddChecklist = () => {
    if (!newItem.trim()) return;
    setChecklist([...checklist, newItem.trim()]);
    setNewItem('');
  };

  const handleRemoveChecklist = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบแผนบำรุงรักษานี้?')) return;
    try {
      const res = await fetch(`/api/pm-plans/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = (await res.json() as any);
        alert(data.error || 'ลบข้อมูลไม่สำเร็จ');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleTriggerPM = async (plan: PMPlan) => {
    if (!confirm(`คุณต้องการสร้างตั๋วงานซ่อมบำรุง PM สำหรับแผน "${plan.planName}" ทันทีหรือไม่?`)) return;
    try {
      const res = await fetch('/api/tickets/pm-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pmPlanId: plan.id }),
      });
      const data = (await res.json() as any);
      if (res.ok) {
        alert('สร้างตั๋วงาน PM และส่งแจ้งเตือนช่างเรียบร้อยแล้ว!');
      } else {
        alert(data.error || 'ไม่สามารถสร้างตั๋วงานได้');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการติดต่อฐานข้อมูล');
    }
  };

  // Filter assets by selected department
  const filteredAssetsForSelect = assetsList.filter(asset => {
    if (!departmentId) return true; // If no department selected, show all
    return asset.assignedToUserDepartmentId === Number(departmentId);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    if (checklist.length === 0) {
      setError('กรุณาเพิ่มรายการตรวจสอบ (Checklist) อย่างน้อย 1 รายการ');
      setSaving(false);
      return;
    }

    try {
      const url = editId ? `/api/pm-plans/${editId}` : '/api/pm-plans';
      const method = editId ? 'PUT' : 'POST';

      if (!editId && assetId === 'all') {
        const promises = filteredAssetsForSelect.map(asset => {
          const payload = {
            planName,
            departmentId: departmentId ? Number(departmentId) : null,
            assetId: asset.id,
            frequency,
            nextDueDate,
            checklistJson: JSON.stringify(checklist),
          };
          return fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        });

        const responses = await Promise.all(promises);
        const failed = responses.some(res => !res.ok);
        if (failed) {
          throw new Error('เกิดข้อผิดพลาด: มีแผนบางรายการสร้างไม่สำเร็จ');
        }
      } else {
        const payload = {
          planName,
          departmentId: departmentId ? Number(departmentId) : null,
          assetId: Number(assetId),
          frequency,
          nextDueDate,
          checklistJson: JSON.stringify(checklist),
        };

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = (await res.json() as any);
        if (!res.ok) {
          throw new Error(data.error || 'ประมวลผลไม่สำเร็จ');
        }
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (plans.length === 0) return;

    const csvRows: (string | number)[][] = [
      ['ชื่อแผนบำรุงรักษา', 'แผนก', 'รหัสทรัพย์สิน (Asset Tag)', 'ชื่อทรัพย์สิน', 'ผู้ถือครองทรัพย์สิน', 'ความถี่', 'กำหนดการตรวจสอบถัดไป', 'จำนวนเช็กลิสต์', 'รายการเช็กลิสต์'],
    ];

    plans.forEach(plan => {
      let checklistItems: string[] = [];
      try {
        checklistItems = JSON.parse(plan.checklistJson);
      } catch (e) {}

      let frequencyText = '';
      if (plan.frequency === 'Monthly') frequencyText = 'รายเดือน';
      else if (plan.frequency === 'Quarterly') frequencyText = 'รายไตรมาส';
      else if (plan.frequency === 'Yearly') frequencyText = 'รายปี';
      else frequencyText = plan.frequency;

      const formattedDate = new Date(plan.nextDueDate).toLocaleDateString('th-TH');
      const deptName = plan.departmentName || 'ไม่มีแผนก (ส่วนกลาง)';
      const userName = plan.assignedToUserName || 'ไม่มี (ส่วนกลาง)';

      csvRows.push([
        plan.planName,
        deptName,
        plan.assetTag,
        plan.assetName,
        userName,
        frequencyText,
        formattedDate,
        checklistItems.length,
        checklistItems.join('; ')
      ]);
    });

    const csvContent = csvRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `IT_PM_Plans_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <CalendarClock className="w-8 h-8 text-indigo-400" />
            แผนการบำรุงรักษา (PM Plans)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            วางแผน ตรวจสอบรอบ และจัดทำเช็กลิสต์การตรวจสุขภาพเครื่องมือไอทีแต่ละชิ้นตามรอบเวลา
          </p>
        </div>

        <div className="flex gap-3 items-center shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-sm tracking-wide shadow-lg shadow-emerald-600/10 active:scale-95 transition-all duration-200"
          >
            Export Report (CSV)
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/20 active:scale-95 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            สร้างแผน PM ใหม่
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#090d16]/90 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/20">
          <h3 className="font-bold text-white text-base">รายการแผน PM ทั้งหมด</h3>
          <button 
            onClick={fetchData} 
            className="p-2 hover:bg-slate-900 border border-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/10 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">ชื่อแผนบำรุงรักษา</th>
                <th className="py-4 px-6">ทรัพย์สินที่บำรุงรักษา</th>
                <th className="py-4 px-6">ความถี่</th>
                <th className="py-4 px-6">กำหนดการถัดไป</th>
                <th className="py-4 px-6">จำนวน Checklist</th>
                <th className="py-4 px-6 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    กำลังโหลดข้อมูลแผน PM...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    ไม่มีแผนบำรุงรักษาเชิงป้องกันในระบบ
                  </td>
                </tr>
              ) : (
                plans.map((plan) => {
                  let checkCount = 0;
                  try {
                    checkCount = JSON.parse(plan.checklistJson).length;
                  } catch (e) {}

                  return (
                    <tr key={plan.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-semibold text-white">{plan.planName}</p>
                          {plan.departmentName ? (
                            <span className="inline-block mt-1 text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                              {plan.departmentName}
                            </span>
                          ) : (
                            <span className="inline-block mt-1 text-[10px] text-slate-500 italic">
                              ไม่มีแผนก (ส่วนกลาง)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-semibold text-indigo-400 font-mono text-xs">{plan.assetTag}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{plan.assetName}</p>
                          {plan.assignedToUserName ? (
                            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                              👤 ผู้ถือครอง: {plan.assignedToUserName}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-500 mt-1 italic">
                              👤 ผู้ถือครอง: ไม่มี (ส่วนกลาง)
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                          plan.frequency === 'Monthly'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : plan.frequency === 'Quarterly'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                          {plan.frequency === 'Monthly' ? 'รายเดือน' : plan.frequency === 'Quarterly' ? 'รายไตรมาส' : 'รายปี'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-400">
                        {new Date(plan.nextDueDate).toLocaleDateString('th-TH')}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs">
                        {checkCount} รายการ
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        {plan.latestTicketStatus === 'Resolved' || plan.latestTicketStatus === 'Closed' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-extrabold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ดำเนินการแล้ว
                          </span>
                        ) : plan.latestTicketStatus ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-extrabold text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                            ⏳ อยู่ระหว่าง PM
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleTriggerPM(plan)}
                              className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center"
                              title="สั่งเปิดงานซ่อมบำรุง PM ทันที"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(plan)}
                              className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center"
                              title="แก้ไขรายละเอียด"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(plan.id)}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-colors inline-flex items-center"
                              title="ลบแผน"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg p-0.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-2xl">
            <div className="bg-[#090d16] rounded-[15px] p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-3">
                {editId ? 'แก้ไขข้อมูลแผนบำรุงรักษา' : 'สร้างแผนบำรุงรักษาใหม่'}
              </h3>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">ชื่อแผนงาน PM</label>
                  <input
                    type="text"
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="ตรวจสุขภาพประจำปี"
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">แผนก (Department)</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  >
                    <option value="">-- ไม่ระบุแผนก --</option>
                    {departmentsList.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">ทรัพย์สินที่จะดูแล</label>
                  <select
                    required
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  >
                    <option value="">-- กรุณาเลือกทรัพย์สิน --</option>
                    {!editId && filteredAssetsForSelect.length > 0 && (
                      <option value="all">
                        {departmentId 
                          ? `ทั้งหมดในแผนกนี้ (${filteredAssetsForSelect.length} รายการ)` 
                          : `ทั้งหมด (${filteredAssetsForSelect.length} รายการ)`}
                      </option>
                    )}
                    {filteredAssetsForSelect.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.assetTag} - {asset.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">ความถี่ (Frequency)</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    >
                      <option value="Monthly">รายเดือน (Monthly)</option>
                      <option value="Quarterly">รายไตรมาส (Quarterly)</option>
                      <option value="Yearly">รายปี (Yearly)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">กำหนดเช็กครั้งต่อไป</label>
                    <input
                      type="date"
                      required
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    />
                  </div>
                </div>

                {/* Checklist Section */}
                <div className="border-t border-white/5 pt-3">
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                    ขั้นตอนการตรวจเช็ก Checklist ({checklist.length})
                  </label>
                  
                  <div className="space-y-2 mb-3 max-h-[180px] overflow-y-auto pr-1">
                    {checklist.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
                        <span className="flex items-center gap-2">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                          {item}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklist(index)}
                          className="p-1 hover:text-rose-400 transition-colors"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {checklist.length === 0 && (
                      <p className="text-xs text-slate-500 italic py-2">ยังไม่มีเช็กลิสต์รายการตรวจสอบ</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="เช่น ทำความสะอาดเครื่อง, เช็กแบตเสื่อม..."
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklist}
                      className="px-4 py-2 bg-slate-900 border border-white/5 hover:bg-slate-800 rounded-xl text-xs font-bold text-white transition-colors"
                    >
                      เพิ่ม
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold text-white shadow-md shadow-indigo-600/10 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึกแผน'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}