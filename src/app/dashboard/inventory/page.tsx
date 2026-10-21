'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Boxes, Search, AlertTriangle, RefreshCw, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SparePart {
  id: number;
  name: string;
  partNumber: string | null;
  quantity: number;
  minQuantity: number;
  createdAt: string;
}

export default function InventoryPage() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = (await res.json() as any);
        setParts(data);
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
    setPartNumber('');
    setQuantity('0');
    setMinQuantity('5'); // Default reorder point suggest
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (part: SparePart) => {
    setEditId(part.id);
    setName(part.name);
    setPartNumber(part.partNumber || '');
    setQuantity(String(part.quantity));
    setMinQuantity(String(part.minQuantity));
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบอะไหล่ชิ้นนี้ออกจากคลังสินค้า?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchParts();
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
      name,
      partNumber,
      quantity: Number(quantity),
      minQuantity: Number(minQuantity),
    };

    try {
      const url = editId ? `/api/inventory/${editId}` : '/api/inventory';
      const method = editId ? 'PUT' : 'POST';

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
      fetchParts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Find if there are any low stock items
  const lowStockItems = parts.filter(p => p.quantity <= p.minQuantity);
  const filteredParts = parts.filter(part => {
    const term = searchTerm.toLowerCase();
    return (
      part.name.toLowerCase().includes(term) ||
      (part.partNumber || '').toLowerCase().includes(term)
    );
  });

  const handleExportCSV = () => {
    if (filteredParts.length === 0) return;

    const csvRows: (string | number)[][] = [
      ['ชื่อชิ้นส่วนอะไหล่', 'Part Number', 'จำนวนคงเหลือในคลัง', 'จุดแจ้งเตือนขั้นต่ำ', 'สถานะสต็อก', 'วันที่บันทึก'],
    ];

    filteredParts.forEach(part => {
      const stockStatus = part.quantity <= part.minQuantity ? 'สต็อกต่ำ (ใกล้หมด)' : 'ปกติ';
      const formattedDate = new Date(part.createdAt).toLocaleDateString('th-TH');

      csvRows.push([
        part.name,
        part.partNumber || '-',
        part.quantity,
        part.minQuantity,
        stockStatus,
        formattedDate
      ]);
    });

    const csvContent = csvRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `IT_Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <Boxes className="w-8 h-8 text-indigo-400" />
            คลังอะไหล่และอุปกรณ์ไอที (Inventory & Spare Parts)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            บันทึกอุปกรณ์ไอที อะไหล่สำรองสำหรับงานซ่อม (SSD, RAM, Mouse, Keyboard) ควบคุมสต็อกขั้นต่ำเพื่อสั่งซื้อเพิ่มเติม
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
            เพิ่มรายการอะไหล่
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-3 shadow-md animate-pulse" style={{ animationDuration: '3s' }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">การแจ้งเตือน: อะไหล่ใกล้หมดคลัง!</h4>
            <p className="text-xs text-slate-300 mt-1">
              พบอะไหล่จำนวน {lowStockItems.length} รายการที่ต่ำกว่าหรือเท่ากับจุดสต็อกขั้นต่ำ (Reorder Point) กรุณาดำเนินการสั่งซื้อเพิ่มเติม
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#090d16]/40 border border-white/5 p-4 rounded-xl backdrop-blur-md">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="ค้นหาชื่ออะไหล่ หรือ Part Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
        </div>
        <button
          onClick={fetchParts}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรชสต็อก
        </button>
      </div>

      {/* Parts Table Container */}
      <div className="bg-[#090d16]/90 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/10 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">ชื่อชิ้นส่วนอะไหล่</th>
                <th className="py-4 px-6">Part Number</th>
                <th className="py-4 px-6">จำนวนคงเหลือในคลัง</th>
                <th className="py-4 px-6">จุดแจ้งเตือนขั้นต่ำ</th>
                <th className="py-4 px-6">สถานะสต็อก</th>
                <th className="py-4 px-6 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    กำลังโหลดข้อมูลสต็อกอะไหล่...
                  </td>
                </tr>
              ) : filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    ไม่พบข้อมูลชิ้นส่วนอะไหล่ในคลัง
                  </td>
                </tr>
              ) : (
                filteredParts.map((part) => {
                  const isLow = part.quantity <= part.minQuantity;

                  return (
                    <tr key={part.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-4 px-6 font-semibold text-white">{part.name}</td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-400">
                        {part.partNumber || '-'}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-base">
                        {part.quantity.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-400">
                        {part.minQuantity.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                          isLow 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isLow ? (
                            <>
                              <ArrowDownRight className="w-3 h-3" />
                              สต็อกต่ำกว่าเกณฑ์
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3" />
                              สต็อกปกติ
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(part)}
                          className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors"
                          title="แก้ไขสต็อก"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(part.id)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                          title="ลบอะไหล่"
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

      {/* CRUD Parts Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-0.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-2xl">
            <div className="bg-[#090d16] rounded-[15px] p-6 text-slate-100">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-3">
                {editId ? 'แก้ไขข้อมูลอะไหล่' : 'เพิ่มรายการชิ้นส่วนอะไหล่'}
              </h3>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">ชื่อรายการอะไหล่</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Solid State Drive (SSD) 512GB WD Blue"
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">Part Number / Model Code</label>
                  <input
                    type="text"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="WDS500G2B0A"
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">จำนวนในคลัง (Quantity)</label>
                    <input
                      type="number"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="10"
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">จุดแจ้งเตือนขั้นต่ำ</label>
                    <input
                      type="number"
                      required
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      placeholder="3"
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono"
                    />
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