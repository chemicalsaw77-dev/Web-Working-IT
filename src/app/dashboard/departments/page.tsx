'use client';

import { useState, useEffect } from 'react';
import { Building, Plus, Edit2, Trash2, User, RefreshCw, Calendar } from 'lucide-react';

interface Department {
  id: number;
  name: string;
  approverUserId: number | null;
  approverName: string | null;
  approverEmail: string | null;
  createdAt: string;
}

interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function DepartmentsPage() {
  const [departmentsList, setDepartmentsList] = useState<Department[]>([]);
  const [approvers, setApprovers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal / Form States
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [approverUserId, setApproverUserId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, usersRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/users')
      ]);

      if (deptRes.ok) {
        const deptData = (await deptRes.json() as any);
        setDepartmentsList(deptData);
      }
      if (usersRes.ok) {
        const usersData = (await usersRes.json() as any);
        // Filter users who can be approvers (APPROVER or ADMIN)
        const eligibleApprovers = usersData.filter(
          (u: any) => u.role === 'APPROVER' || u.role === 'ADMIN'
        );
        setApprovers(eligibleApprovers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditId(null);
    setName('');
    setApproverUserId('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditId(dept.id);
    setName(dept.name);
    setApproverUserId(dept.approverUserId ? String(dept.approverUserId) : '');
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณต้องการลบแผนกนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = (await res.json() as any);
        alert(data.error || 'ลบไม่สำเร็จ');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      name,
      approverUserId: approverUserId ? Number(approverUserId) : null,
    };

    try {
      const url = editId ? `/api/departments/${editId}` : '/api/departments';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json() as any);
      if (!res.ok) {
        throw new Error(data.error || 'บันทึกไม่สำเร็จ');
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
    if (departmentsList.length === 0) return;

    const csvRows: (string | number)[][] = [
      ['ชื่อแผนก', 'ผู้อนุมัติประจำแผนก', 'อีเมลติดต่อผู้อนุมัติ', 'วันที่สร้าง'],
    ];

    departmentsList.forEach(dept => {
      const formattedDate = new Date(dept.createdAt).toLocaleDateString('th-TH');

      csvRows.push([
        dept.name,
        dept.approverName || 'ไม่ได้ระบุผู้อนุมัติ',
        dept.approverEmail || '-',
        formattedDate
      ]);
    });

    const csvContent = csvRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `IT_Departments_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Building className="w-8 h-8 text-indigo-400" />
            จัดการแผนกภายในองค์กร (Departments)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            สร้างและบริหารโครงสร้างแผนก พร้อมมอบหมายผู้อนุมัติ (Approver) ประจำแผนก
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-sm tracking-wide shadow-lg shadow-emerald-600/10 active:scale-95 transition-all duration-200"
          >
            Export Report (CSV)
          </button>
          <button
            onClick={fetchData}
            className="p-3 bg-slate-900 border border-white/5 rounded-xl hover:text-white text-slate-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/20 active:scale-95 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            เพิ่มแผนกใหม่
          </button>
        </div>
      </div>

      {/* Departments Table */}
      <div className="bg-[#090d16]/90 border border-white/5 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/20 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">ชื่อแผนก</th>
                <th className="py-4 px-6">หัวหน้าแผนก / ผู้อนุมัติ</th>
                <th className="py-4 px-6">อีเมลติดต่อ</th>
                <th className="py-4 px-6">วันที่สร้าง</th>
                <th className="py-4 px-6 text-right">เครื่องมือ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    กำลังโหลดข้อมูลแผนก...
                  </td>
                </tr>
              ) : departmentsList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    ยังไม่มีข้อมูลแผนกในระบบ
                  </td>
                </tr>
              ) : (
                departmentsList.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-white">{dept.name}</td>
                    <td className="py-4 px-6">
                      {dept.approverName ? (
                        <span className="flex items-center gap-2 text-indigo-300 font-semibold">
                          <User className="w-4 h-4 text-indigo-400" />
                          {dept.approverName}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs font-semibold">ไม่ได้ระบุผู้อนุมัติ</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-400">{dept.approverEmail || '-'}</td>
                    <td className="py-4 px-6 text-slate-500">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(dept.createdAt).toLocaleDateString('th-TH')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(dept)}
                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-0.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-2xl">
            <div className="bg-[#090d16] rounded-[15px] p-6 text-slate-100">
              <h3 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-3">
                {editId ? 'แก้ไขข้อมูลแผนก' : 'เพิ่มแผนกใหม่'}
              </h3>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">ชื่อแผนก</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น แผนกบัญชีและการเงิน"
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">ผู้อนุมัติประจำแผนก (Approver Head)</label>
                  <select
                    value={approverUserId}
                    onChange={(e) => setApproverUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  >
                    <option value="">-- เลือกผู้อนุมัติ (ผู้จัดการ/แอดมิน) --</option>
                    {approvers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role}) - {u.email}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    * พนักงานในแผนกนี้เมื่อยื่นแจ้งใบงานบางประเภท จะต้องผ่านความเห็นชอบจากหัวหน้าแผนกท่านนี้
                  </p>
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
                    {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
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
