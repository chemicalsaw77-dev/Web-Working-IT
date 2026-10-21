'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Laptop, Search, Filter, RefreshCw, User, DollarSign, Calendar, Tag } from 'lucide-react';

interface Asset {
  id: number;
  assetTag: string;
  name: string;
  serialNumber: string | null;
  category: string;
  status: 'Active' | 'In_Repair' | 'Retired';
  assignedToUserId: number | null;
  assignedToUserName: string | null;
  assignedToUserEmail: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  imagesJson: string | null;
  createdAt: string;
}

interface UserSummary {
  id: number;
  name: string;
  email: string;
}

export default function AssetsPage() {
  const [assetsList, setAssetsList] = useState<Asset[]>([]);
  const [usersList, setUsersList] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Form Fields
  const [assetTag, setAssetTag] = useState('');
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [category, setCategory] = useState('Hardware');
  const [status, setStatus] = useState<'Active' | 'In_Repair' | 'Retired'>('Active');
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetsRes, usersRes] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/users')
      ]);

      if (assetsRes.ok) {
        const assetsData = (await assetsRes.json() as any);
        setAssetsList(assetsData);
      }
      if (usersRes.ok) {
        const usersData = (await usersRes.json() as any);
        setUsersList(usersData.map((u: any) => ({ id: u.id, name: u.name, email: u.email })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditId(null);
    setAssetTag(`AST-${String(assetsList.length + 1).padStart(4, '0')}`); // Auto increment suggestion tag
    setName('');
    setSerialNumber('');
    setCategory('Hardware');
    setStatus('Active');
    setAssignedToUserId('');
    setPurchaseDate('');
    setPurchaseCost('');
    setUploadedImages([]);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (asset: Asset) => {
    setEditId(asset.id);
    setAssetTag(asset.assetTag);
    setName(asset.name);
    setSerialNumber(asset.serialNumber || '');
    setCategory(asset.category);
    setStatus(asset.status);
    setAssignedToUserId(asset.assignedToUserId ? String(asset.assignedToUserId) : '');
    setPurchaseDate(asset.purchaseDate || '');
    setPurchaseCost(asset.purchaseCost ? String(asset.purchaseCost) : '');
    let imgs: string[] = [];
    if (asset.imagesJson) {
      try {
        imgs = JSON.parse(asset.imagesJson);
      } catch (e) {}
    }
    setUploadedImages(imgs);
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณต้องการลบข้อมูลทรัพย์สินนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      assetTag,
      name,
      serialNumber,
      category,
      status,
      assignedToUserId: assignedToUserId ? Number(assignedToUserId) : null,
      purchaseDate,
      purchaseCost: purchaseCost ? Number(purchaseCost) : null,
      imagesJson: uploadedImages.length > 0 ? JSON.stringify(uploadedImages) : null,
    };

    try {
      const url = editId ? `/api/assets/${editId}` : '/api/assets';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json() as any);
      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการดำเนินการ');
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredAssets = assetsList.filter(asset => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.assignedToUserName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === '' || asset.category === categoryFilter;
    const matchesStatus = statusFilter === '' || asset.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleExportCSV = () => {
    if (filteredAssets.length === 0) return;

    const csvRows: (string | number)[][] = [
      ['รหัสทรัพย์สิน', 'ชื่อทรัพย์สิน', 'Serial Number', 'หมวดหมู่', 'สถานะ', 'ผู้ถือครอง', 'อีเมลผู้ถือครอง', 'วันที่จัดซื้อ', 'มูลค่าจัดซื้อ', 'วันที่ลงทะเบียน'],
    ];

    filteredAssets.forEach(asset => {
      let statusText = '';
      if (asset.status === 'Active') statusText = 'พร้อมใช้งาน';
      else if (asset.status === 'In_Repair') statusText = 'ส่งซ่อมบำรุง';
      else if (asset.status === 'Retired') statusText = 'ปลดระวาง';
      else statusText = asset.status;

      const formattedRegDate = new Date(asset.createdAt).toLocaleDateString('th-TH');
      const formattedPurchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('th-TH') : '-';

      csvRows.push([
        asset.assetTag,
        asset.name,
        asset.serialNumber || '-',
        asset.category,
        statusText,
        asset.assignedToUserName || 'ยังไม่ได้ระบุ',
        asset.assignedToUserEmail || '-',
        formattedPurchaseDate,
        asset.purchaseCost !== null ? asset.purchaseCost : '-',
        formattedRegDate
      ]);
    });

    const csvContent = csvRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `IT_Assets_Report_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <Laptop className="w-8 h-8 text-indigo-400" />
            การบริหารจัดการทรัพย์สินไอที (IT Asset Management)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            ลงทะเบียน ตรวจสอบประวัติ จัดสรรสิทธิ์ผู้ถือครอง และติดตามประวัติการซ่อมบำรุงเครื่องมือไอที
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
            ลงทะเบียนทรัพย์สิน
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#090d16]/40 border border-white/5 p-4 rounded-xl backdrop-blur-md">
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            placeholder="ค้นหาชื่อทรัพย์สิน, รหัส, ซีเรียล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">กรอง:</span>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">ทุกประเภท</option>
            <option value="Hardware">Hardware (คอมพิวเตอร์/จอ)</option>
            <option value="Software">Software (ลิขสิทธิ์ซอฟต์แวร์)</option>
            <option value="Network">Network (อุปกรณ์เครือข่าย)</option>
            <option value="Peripherals">Peripherals (เครื่องพิมพ์/อื่นๆ)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">ทุกสถานะ</option>
            <option value="Active">ใช้งานปกติ (Active)</option>
            <option value="In_Repair">ส่งซ่อม (In Repair)</option>
            <option value="Retired">ปลดระวาง (Retired)</option>
          </select>

          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Assets Table Container */}
      <div className="bg-[#090d16]/90 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/10 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">รหัสทรัพย์สิน</th>
                <th className="py-4 px-6">ชื่อทรัพย์สิน</th>
                <th className="py-4 px-6">ประเภท</th>
                <th className="py-4 px-6">ผู้ถือครอง</th>
                <th className="py-4 px-6">สถานะ</th>
                <th className="py-4 px-6">ราคาจัดซื้อ</th>
                <th className="py-4 px-6 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    กำลังโหลดข้อมูลทรัพย์สิน...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    ไม่พบข้อมูลทรัพย์สิน
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-indigo-400">
                      {asset.assetTag}
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-semibold text-white">{asset.name}</p>
                        {asset.serialNumber && (
                          <p className="text-slate-500 text-[11px] font-mono mt-0.5">S/N: {asset.serialNumber}</p>
                        )}
                        {/* Asset Images list */}
                        {(() => {
                          let imgs: string[] = [];
                          if (asset.imagesJson) {
                            try {
                              imgs = JSON.parse(asset.imagesJson);
                            } catch (e) {}
                          }
                          if (imgs.length > 0) {
                            return (
                              <div className="flex gap-1.5 mt-2">
                                {imgs.map((img, index) => (
                                  <img
                                    key={index}
                                    src={img}
                                    alt="Asset"
                                    className="w-8 h-8 rounded border border-white/10 object-cover cursor-pointer hover:scale-125 transition-transform"
                                  />
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="py-4 px-6">{asset.category}</td>
                    <td className="py-4 px-6">
                      {asset.assignedToUserName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                            {asset.assignedToUserName.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">{asset.assignedToUserName}</p>
                            <p className="text-slate-500 text-[10px]">{asset.assignedToUserEmail}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs italic">ไม่มี (เก็บในคลัง)</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                        asset.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : asset.status === 'In_Repair'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {asset.status === 'Active' ? 'พร้อมใช้งาน' : asset.status === 'In_Repair' ? 'ส่งซ่อม' : 'ปลดระวาง'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs">
                      {asset.purchaseCost ? `฿${asset.purchaseCost.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(asset)}
                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors"
                        title="แก้ไขรายละเอียด"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                        title="ลบข้อมูล"
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

      {/* Asset CRUD Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg p-0.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-2xl">
            <div className="bg-[#090d16] rounded-[15px] p-6 text-slate-100">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-3">
                {editId ? 'แก้ไขข้อมูลทรัพย์สิน' : 'ลงทะเบียนทรัพย์สินใหม่'}
              </h3>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-400" />
                      รหัสทรัพย์สิน (Tag)
                    </label>
                    <input
                      type="text"
                      required
                      value={assetTag}
                      onChange={(e) => setAssetTag(e.target.value)}
                      placeholder="AST-0001"
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">ประเภททรัพย์สิน</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    >
                      <option value="Hardware">Hardware (คอม/จอ/โน้ตบุ๊ก)</option>
                      <option value="Software">Software (สิทธิ์ซอฟต์แวร์)</option>
                      <option value="Network">Network (Switch/Router)</option>
                      <option value="Peripherals">Peripherals (เครื่องพิมพ์/อื่นๆ)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">ชื่อทรัพย์สิน</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Notebook Lenovo ThinkPad L14 Gen 4"
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">ซีเรียลนัมเบอร์ (S/N)</label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="PF123456"
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">สถานะ</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    >
                      <option value="Active">ใช้งานปกติ (Active)</option>
                      <option value="In_Repair">ส่งซ่อม (In Repair)</option>
                      <option value="Retired">ปลดระวาง (Retired)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    ผู้ถือครองสิทธิ์ (Assigned User)
                  </label>
                  <select
                    value={assignedToUserId}
                    onChange={(e) => setAssignedToUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  >
                    <option value="">-- เก็บไว้ที่คลังส่วนกลาง --</option>
                    {usersList.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3 mt-2">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      วันที่จัดซื้อ
                    </label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-slate-400" />
                      ราคาจัดซื้อ
                    </label>
                    <input
                      type="number"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                      placeholder="25000"
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono"
                    />
                  </div>
                </div>

                {/* IT Asset Images Section (Max 3) */}
                <div className="border-t border-white/5 pt-3 mt-2">
                  <span className="block text-slate-300 text-xs font-semibold mb-2">รูปภาพทรัพย์สิน (สูงสุด 3 รูป)</span>
                  
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    {uploadedImages.map((img, index) => (
                      <div key={index} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group bg-slate-950 flex items-center justify-center">
                        <img src={img} alt={`Asset ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedImages(uploadedImages.filter((_, idx) => idx !== index));
                          }}
                          className="absolute top-1 right-1 p-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-md text-[10px] transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    
                    {uploadedImages.length < 3 && (
                      <label className="cursor-pointer aspect-video rounded-xl border border-dashed border-white/20 hover:border-indigo-500 flex flex-col items-center justify-center bg-slate-900/40 text-slate-400 hover:text-white transition-all">
                        <Plus className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-medium">เพิ่มรูปภาพ</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 1 * 1024 * 1024) {
                                alert('ขนาดรูปภาพต้องไม่เกิน 1MB');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => {
                                setUploadedImages([...uploadedImages, reader.result as string]);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">รองรับไฟล์ภาพ ขนาดไม่เกิน 1MB ต่อรูป</p>
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
