'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Key, Users, Mail, UserCheck, Shield, ExternalLink, RefreshCw, Building } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  lineUserId: string | null;
  telegramChatId: string | null;
  departmentId: number | null;
  profilePicture: string | null;
  createdAt: string;
}

interface Role {
  name: string;
}

interface Department {
  id: number;
  name: string;
}

export default function UsersPage() {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('USER');
  const [rolesList, setRolesList] = useState<Role[]>([
    { name: 'USER' },
    { name: 'TECH' },
    { name: 'APPROVER' },
    { name: 'ADMIN' }
  ]);
  const [lineUserId, setLineUserId] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, rolesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/departments'),
        fetch('/api/roles')
      ]);

      if (usersRes.ok) {
        const usersData = (await usersRes.json() as any);
        setUsersList(usersData);
      }
      if (deptsRes.ok) {
        const deptsData = (await deptsRes.json() as any);
        setDepartments(deptsData);
      }
      if (rolesRes.ok) {
        const rolesData = (await rolesRes.json() as any);
        setRolesList(rolesData);
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
    setEmail('');
    setPassword('');
    setRole('USER');
    setLineUserId('');
    setTelegramChatId('');
    setDepartmentId('');
    setProfilePicture('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // keep blank if no change
    setRole(user.role);
    setLineUserId(user.lineUserId || '');
    setTelegramChatId(user.telegramChatId || '');
    setDepartmentId(user.departmentId ? String(user.departmentId) : '');
    setProfilePicture(user.profilePicture || '');
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้ออกจากระบบ?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = (await res.json() as any);
        alert(data.error || 'ลบผู้ใช้ไม่สำเร็จ');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload: any = { 
      name, 
      email, 
      role, 
      lineUserId, 
      telegramChatId,
      profilePicture: profilePicture || null,
      departmentId: departmentId ? Number(departmentId) : null
    };
    if (password) payload.password = password;

    try {
      const url = editId ? `/api/users/${editId}` : '/api/users';
      const method = editId ? 'PUT' : 'POST';

      // If creating, password is required
      if (!editId && !password) {
        setError('กรุณากรอกรหัสผ่านสำหรับผู้ใช้ใหม่');
        setSaving(false);
        return;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json() as any);
      if (!res.ok) {
        throw new Error(data.error || 'ประมวลผลไม่สำเร็จ');
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
    if (usersList.length === 0) return;

    const csvRows: (string | number)[][] = [
      ['ชื่อผู้ใช้งาน', 'อีเมล', 'บทบาท / สิทธิ์การใช้งาน', 'แผนก / ฝ่าย', 'Line User ID', 'Telegram Chat ID', 'วันที่ลงทะเบียน'],
    ];

    usersList.forEach(user => {
      const dept = departments.find(d => d.id === user.departmentId);
      const deptName = dept ? dept.name : 'ไม่มีแผนก (ส่วนกลาง)';
      const formattedDate = new Date(user.createdAt).toLocaleDateString('th-TH');

      csvRows.push([
        user.name,
        user.email,
        user.role,
        deptName,
        user.lineUserId || '-',
        user.telegramChatId || '-',
        formattedDate
      ]);
    });

    const csvContent = csvRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `IT_Users_Report_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <Users className="w-8 h-8 text-indigo-400" />
            จัดการผู้ใช้และสิทธิ์การใช้งาน (Users)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            ลงทะเบียน ปรับสิทธิ์ ย้ายแผนก และจัดการช่องทางแจ้งเตือนของสมาชิกในระบบ
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
            เพิ่มผู้ใช้ใหม่
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#090d16]/90 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/20">
          <h3 className="font-bold text-white text-base">รายชื่อผู้ใช้งานทั้งหมด</h3>
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
                <th className="py-4 px-6">ชื่อ-นามสกุล</th>
                <th className="py-4 px-6">แผนก (Department)</th>
                <th className="py-4 px-6">อีเมล</th>
                <th className="py-4 px-6">บทบาท</th>
                <th className="py-4 px-6">LINE ID</th>
                <th className="py-4 px-6">Telegram ID</th>
                <th className="py-4 px-6">สร้างเมื่อ</th>
                <th className="py-4 px-6 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    กำลังโหลดข้อมูลผู้ใช้งาน...
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                    ไม่มีข้อมูลผู้ใช้งานในระบบ
                  </td>
                </tr>
              ) : (
                usersList.map((user) => {
                  const dept = departments.find(d => d.id === user.departmentId);
                  return (
                    <tr key={user.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-4 px-6 font-semibold text-white">
                        <div className="flex items-center gap-3">
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt={user.name} className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                              {user.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span>{user.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {dept ? (
                          <span className="flex items-center gap-1.5 text-xs text-indigo-300 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg w-fit">
                            <Building className="w-3.5 h-3.5" />
                            {dept.name}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">{user.email}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider ${
                          user.role === 'ADMIN' 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : user.role === 'TECH'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : user.role === 'APPROVER'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs">{user.lineUserId || '-'}</td>
                      <td className="py-4 px-6 font-mono text-xs">{user.telegramChatId || '-'}</td>
                      <td className="py-4 px-6 text-slate-400 text-xs">
                        {new Date(user.createdAt).toLocaleDateString('th-TH')}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                          title="ลบผู้ใช้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg p-0.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-2xl">
            <div className="bg-[#090d16] rounded-[15px] p-6 text-slate-100 max-h-[90vh] overflow-y-auto pr-2">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-3">
                {editId ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'ลงทะเบียนผู้ใช้งานใหม่'}
              </h3>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm flex items-center gap-2">
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Profile Picture Upload Section */}
                <div className="flex flex-col items-center gap-2 bg-slate-900/30 border border-white/5 p-4 rounded-2xl">
                  <div className="w-16 h-16 rounded-xl relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold uppercase shadow-lg shadow-indigo-500/10">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      name ? name.substring(0, 2).toUpperCase() : 'Avatar'
                    )}
                  </div>
                  <label className="cursor-pointer px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/5 text-[11px] font-bold text-slate-300 hover:text-white rounded-lg transition-colors">
                    <span>อัปโหลดรูปโปรไฟล์ (ไม่เกิน 1.5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1.5 * 1024 * 1024) {
                            alert('ขนาดรูปภาพต้องไม่เกิน 1.5MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            setProfilePicture(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {profilePicture && (
                    <button
                      type="button"
                      onClick={() => setProfilePicture('')}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      ลบรูปภาพ
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">ชื่อ-นามสกุล</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="สมชาย ใจดี"
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">อีเมลแอดเดรส</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="somchai@company.com"
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">
                      รหัสผ่าน {editId && <span className="text-slate-500">(ปล่อยว่างไว้หากไม่เปลี่ยน)</span>}
                    </label>
                    <input
                      type="password"
                      required={!editId}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">สิทธิ์การใช้งาน (Role)</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    >
                      {rolesList.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">สังกัดแผนก (Department)</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  >
                    <option value="">-- ไม่ระบุแผนก --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-white/5 pt-3 mt-2">
                  <span className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">ข้อมูลแจ้งเตือน (Notifications)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">LINE User ID</label>
                      <input
                        type="text"
                        value={lineUserId}
                        onChange={(e) => setLineUserId(e.target.value)}
                        placeholder="U123456789..."
                        className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">Telegram Chat ID</label>
                      <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="987654321"
                        className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-xs font-mono"
                      />
                    </div>
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
