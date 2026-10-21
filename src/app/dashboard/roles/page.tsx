'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Shield, CheckSquare, Square, Trash2, RefreshCw, Save } from 'lucide-react';

interface RoleConfig {
  name: string;
  menusJson: string;
  createdAt: string;
}

const AVAILABLE_MENUS = [
  { label: 'แดชบอร์ดสรุปผล (Dashboard)', path: '/dashboard' },
  { label: 'งานแจ้งซ่อมไอที (Tickets)', path: '/dashboard/tickets' },
  { label: 'ทรัพย์สินไอที (Assets)', path: '/dashboard/assets' },
  { label: 'แผนบำรุงรักษา PM (Preventive Maintenance)', path: '/dashboard/pm' },
  { label: 'คลังสินค้าอะไหล่ (Inventory)', path: '/dashboard/inventory' },
  { label: 'คลังความรู้ไอที (Knowledge Base)', path: '/dashboard/kb' },
  { label: 'จัดการข้อมูลผู้ใช้ (Users)', path: '/dashboard/users' },
  { label: 'จัดการโครงสร้างแผนก (Departments)', path: '/dashboard/departments' },
  { label: 'จัดการสิทธิ์เข้าถึง (Roles & Permissions)', path: '/dashboard/roles' },
  { label: 'ตั้งค่าระบบ Console (Settings)', path: '/dashboard/settings' },
  { label: 'ประวัติการใช้งานระบบ (Audit Logs)', path: '/dashboard/audit' },
];

export default function RolesPage() {
  const [rolesList, setRolesList] = useState<RoleConfig[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('USER');
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  
  // Custom Role creation
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (rolesList.length > 0) {
      const activeRole = rolesList.find(r => r.name === selectedRole);
      if (activeRole) {
        try {
          setSelectedMenus(JSON.parse(activeRole.menusJson));
        } catch (e) {
          setSelectedMenus([]);
        }
      }
    }
  }, [selectedRole, rolesList]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = (await res.json() as any);
        setRolesList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMenu = (path: string) => {
    if (selectedMenus.includes(path)) {
      setSelectedMenus(selectedMenus.filter(p => p !== path));
    } else {
      setSelectedMenus([...selectedMenus, path]);
    }
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    setSuccess('');
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedRole, menus: selectedMenus }),
      });

      if (res.ok) {
        setSuccess(`บันทึกสิทธิ์การเข้าถึงสำหรับบทบาท ${selectedRole} เรียบร้อยแล้ว`);
        fetchRoles();
      } else {
        const data = (await res.json() as any);
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    const nameUpper = newRoleName.trim().toUpperCase();
    if (!nameUpper) {
      setCreateError('กรุณากรอกชื่อบทบาทสิทธิ์');
      setCreating(false);
      return;
    }

    if (['ADMIN', 'TECH', 'USER', 'APPROVER'].includes(nameUpper)) {
      setCreateError('ชื่อสิทธิ์เริ่มต้นของระบบไม่สามารถซ้ำได้');
      setCreating(false);
      return;
    }

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameUpper, menus: ['/dashboard', '/dashboard/tickets'] }), // default view
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewRoleName('');
        await fetchRoles();
        setSelectedRole(nameUpper);
      } else {
        const data = (await res.json() as any);
        setCreateError(data.error || 'สร้างบทบาทใหม่ไม่สำเร็จ');
      }
    } catch (err: any) {
      setCreateError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async (roleName: string) => {
    if (['ADMIN', 'TECH', 'USER', 'APPROVER'].includes(roleName)) {
      alert('ไม่สามารถลบสิทธิ์หลักของระบบได้');
      return;
    }

    if (!confirm(`คุณต้องการลบบทบาทสิทธิ์ "${roleName}" ใช่หรือไม่? พนักงานในสิทธิ์นี้จะไม่เห็นเมนูระบบ`)) return;

    try {
      const res = await fetch(`/api/roles/${roleName}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedRole('USER');
        fetchRoles();
      } else {
        const data = (await res.json() as any);
        alert(data.error || 'ลบไม่สำเร็จ');
      }
    } catch (e) {
      alert('เชื่อมต่อล้มเหลว');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">กำลังโหลดข้อมูลบทบาทสิทธิ์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-400" />
            การจัดการสิทธิ์การเข้าถึง (Roles & Permissions)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            ปรับแต่งสิทธิ์การมองเห็นเมนูของแต่ละบทบาท หรือสร้างสิทธิ์การเข้าถึงบทบาทใหม่ตามหน้าที่การทำงาน
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchRoles}
            className="p-3 bg-slate-900 border border-white/5 rounded-xl hover:text-white text-slate-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/20 active:scale-95 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            สร้างสิทธิ์การใช้งานใหม่ (Custom Role)
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Role selection */}
        <div className="bg-[#090d16]/90 border border-white/5 p-5 rounded-2xl shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">เลือกบทบาทสิทธิ์</h3>
          <div className="space-y-1">
            {rolesList.map((r) => {
              const isDefault = ['ADMIN', 'TECH', 'USER', 'APPROVER'].includes(r.name);
              return (
                <div 
                  key={r.name}
                  onClick={() => setSelectedRole(r.name)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer text-sm font-bold transition-all ${
                    selectedRole === r.name 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' 
                      : 'bg-slate-900/20 text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <span className="truncate">{r.name}</span>
                  {!isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(r.name);
                      }}
                      className="p-1 hover:text-rose-400 text-slate-500 transition-colors"
                      title="ลบสิทธิ์นี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content: Permissions matrix checkbox options */}
        <div className="lg:col-span-3 bg-[#090d16]/90 border border-white/5 p-6 rounded-2xl shadow-lg space-y-6">
          <div className="border-b border-white/5 pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-400" />
                ตั้งค่าเมนูสำหรับสิทธิ์: <span className="text-indigo-300 font-extrabold">{selectedRole}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                เครื่องหมายขีดถูกสีเหลือง/คราม หมายความว่าพนักงานที่มีสิทธิ์นี้จะมองเห็นและกดเข้าไปที่เมนูด้านล่างนี้ได้
              </p>
            </div>
            
            {selectedRole === 'ADMIN' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin Has All Menus Enabled
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_MENUS.map((menu) => {
              const isChecked = selectedMenus.includes(menu.path) || selectedRole === 'ADMIN';
              const isDisabled = selectedRole === 'ADMIN'; // Admin should not edit their own menu, they always see all
              
              return (
                <div 
                  key={menu.path}
                  onClick={() => !isDisabled && handleToggleMenu(menu.path)}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all select-none ${
                    isChecked 
                      ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-200' 
                      : 'bg-slate-900/10 border-slate-800 text-slate-500 hover:text-slate-400 hover:border-slate-700'
                  } ${isDisabled ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                >
                  <div>
                    <p className="text-sm font-semibold">{menu.label}</p>
                    <p className="text-[10px] font-mono text-slate-600 mt-0.5">{menu.path}</p>
                  </div>

                  <div className="shrink-0 pl-3">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-white/5">
            <button
              onClick={handleSavePermissions}
              disabled={saving || selectedRole === 'ADMIN'}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/20 active:scale-95 transition-all duration-200 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์บทบาทการใช้งาน'}
            </button>
          </div>
        </div>
      </div>

      {/* CREATE NEW CUSTOM ROLE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-0.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-2xl">
            <div className="bg-[#090d16] rounded-[15px] p-6 text-slate-100">
              <h3 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-3">
                สร้างสิทธิ์บทบาทการใช้งานใหม่ (Create Role)
              </h3>

              {createError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateRole} className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">ชื่อบทบาทสิทธิ์ (ภาษาอังกฤษพิมพ์ใหญ่)</label>
                  <input
                    type="text"
                    required
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="เช่น SUPERVISOR, OUTSOURCE"
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm uppercase"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    * เมื่อสร้างแล้วสามารถสลับไปแต่งตั้งสิทธิ์เมนูและเปลี่ยนบทบาทสิทธิ์ให้กับพนักงานคนนั้นๆ ได้ในหน้าหลัก
                  </p>
                </div>

                <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold text-white shadow-md shadow-indigo-600/10 transition-colors disabled:opacity-50"
                  >
                    {creating ? 'กำลังสร้าง...' : 'สร้างบทบาท'}
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
