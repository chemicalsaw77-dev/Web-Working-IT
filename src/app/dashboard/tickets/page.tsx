'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Edit2, CheckCircle2, AlertCircle, Wrench, Search, Filter, 
  RefreshCw, User, Laptop, Calendar, MessageSquare, Star, Settings, ClipboardList, PackagePlus, Eye
} from 'lucide-react';

interface Ticket {
  id: number;
  ticketNo: string;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In_Progress' | 'Pending' | 'Resolved' | 'Closed' | 'Pending_Approval';
  reporterId: number;
  reporterName: string;
  reporterEmail: string;
  assigneeId: number | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  assetId: number | null;
  assetTag: string | null;
  assetName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  satisfactionRating: number | null;
  resolutionNote: string | null;
  assetImagesJson: string | null;
}

interface UserSummary {
  id: number;
  name: string;
  role: string;
}

interface AssetSummary {
  id: number;
  assetTag: string;
  name: string;
  assignedToUserId: number | null;
}

interface SparePart {
  id: number;
  name: string;
  quantity: number;
}

interface PartConsumed {
  id: number;
  partId: number;
  partName: string;
  partNumber: string | null;
  quantity: number;
  usedAt: string;
}

export default function TicketsPage() {
  const [ticketsList, setTicketsList] = useState<Ticket[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usersList, setUsersList] = useState<UserSummary[]>([]);
  const [assetsList, setAssetsList] = useState<AssetSummary[]>([]);
  const [partsInventory, setPartsInventory] = useState<SparePart[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // New Ticket Form
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [newAssetId, setNewAssetId] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Update Workspace State
  const [updateStatus, setUpdateStatus] = useState<any>('Open');
  const [updateAssigneeId, setUpdateAssigneeId] = useState('');
  const [partsConsumed, setPartsConsumed] = useState<PartConsumed[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [checklistItems, setChecklistItems] = useState<{ text: string; done: boolean }[]>([]);
  const [rating, setRating] = useState(5);
  const [resolutionNote, setResolutionNote] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [sessionRes, ticketsRes, assetsRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch('/api/tickets'),
        fetch('/api/assets')
      ]);

      if (sessionRes.ok) {
        const sessionData = (await sessionRes.json() as any);
        setCurrentUser(sessionData.user);
        
        // If Tech or Admin, fetch all users and parts inventory
        if (sessionData.user.role === 'ADMIN' || sessionData.user.role === 'TECH') {
          const [usersRes, partsRes] = await Promise.all([
            fetch('/api/users'),
            fetch('/api/inventory')
          ]);
          if (usersRes.ok) {
            const usersData = (await usersRes.json() as any);
            setUsersList(usersData.map((u: any) => ({ id: u.id, name: u.name, role: u.role })));
          }
          if (partsRes.ok) {
            const partsData = (await partsRes.json() as any);
            setPartsInventory(partsData);
          }
        }
      }

      if (ticketsRes.ok) {
        const ticketsData = (await ticketsRes.json() as any);
        const regularTickets = ticketsData.filter((t: any) => !t.ticketNo.startsWith('TCK-PM-'));
        setTicketsList(regularTickets);
      }

      if (assetsRes.ok) {
        const assetsData = (await assetsRes.json() as any);
        setAssetsList(assetsData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setNewTitle('');
    setNewDescription('');
    setNewPriority('Medium');
    setNewAssetId('');
    setFormError('');
    setShowCreateModal(true);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setCreating(true);

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          priority: newPriority,
          assetId: newAssetId ? Number(newAssetId) : null,
        }),
      });

      const data = (await res.json() as any);
      if (!res.ok) {
        throw new Error(data.error || 'สร้างตั๋วไม่สำเร็จ');
      }

      setShowCreateModal(false);
      fetchInitialData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setUpdateStatus(ticket.status);
    setUpdateAssigneeId(ticket.assigneeId ? String(ticket.assigneeId) : '');
    setRating(ticket.satisfactionRating || 5);
    
    // Parse Checklist items if PM ticket
    const items: { text: string; done: boolean }[] = [];
    if (ticket.ticketNo.includes('-PM-') && ticket.description) {
      const lines = ticket.description.split('\n');
      lines.forEach(line => {
        if (line.startsWith('[ ]') || line.startsWith('[x]')) {
          const text = line.substring(3).trim();
          const done = line.startsWith('[x]');
          items.push({ text, done });
        }
      });
    }
    setChecklistItems(items);

    // Fetch consumed parts for this ticket
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/parts`);
      if (res.ok) {
        const partsData = (await res.json() as any);
        setPartsConsumed(partsData);
      }
    } catch (e) {
      console.error(e);
    }

    setShowDetailModal(true);
  };

  const handleToggleChecklist = (index: number) => {
    const updated = [...checklistItems];
    updated[index].done = !updated[index].done;
    setChecklistItems(updated);
  };

  const handleConsumePart = async () => {
    if (!selectedPartId || !selectedTicket) return;
    const qty = Number(partQty);
    if (isNaN(qty) || qty <= 0) return;

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partId: selectedPartId, quantity: qty }),
      });

      const data = (await res.json() as any);
      if (!res.ok) {
        alert(data.error || 'บันทึกชิ้นส่วนไม่สำเร็จ');
      } else {
        // Refresh consumed parts and inventory
        const [partsRes, inventoryRes] = await Promise.all([
          fetch(`/api/tickets/${selectedTicket.id}/parts`),
          fetch('/api/inventory')
        ]);
        if (partsRes.ok) setPartsConsumed((await partsRes.json() as any));
        if (inventoryRes.ok) setPartsInventory((await inventoryRes.json() as any));
        
        setSelectedPartId('');
        setPartQty('1');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSavingUpdate(true);

    // If PM Checklist was modified, update description
    let updatedDesc = selectedTicket.description;
    if (checklistItems.length > 0) {
      const lines = selectedTicket.description?.split('\n') || [];
      const nonChecklistLines = lines.filter(l => !l.startsWith('[ ]') && !l.startsWith('[x]'));
      updatedDesc = nonChecklistLines.join('\n') + '\n' + 
        checklistItems.map(item => `${item.done ? '[x]' : '[ ]'} ${item.text}`).join('\n');
    }

    const payload: any = {
      status: updateStatus,
      assigneeId: updateAssigneeId ? Number(updateAssigneeId) : null,
      description: updatedDesc,
    };

    if (updateStatus === 'Closed' || updateStatus === 'Resolved') {
      payload.satisfactionRating = rating;
      if (resolutionNote.trim()) {
        payload.resolutionNote = resolutionNote.trim();
      }
    }

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowDetailModal(false);
        fetchInitialData();
      } else {
        const data = (await res.json() as any);
        alert(data.error || 'อัปเดตไม่สำเร็จ');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleSelfAssign = async (ticket: Ticket) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: currentUser.id, status: 'In_Progress' }),
      });
      if (res.ok) {
        fetchInitialData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter lists
  const filteredTickets = ticketsList.filter(ticket => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      ticket.ticketNo.toLowerCase().includes(term) ||
      ticket.title.toLowerCase().includes(term) ||
      (ticket.description || '').toLowerCase().includes(term) ||
      ticket.reporterName.toLowerCase().includes(term);

    const matchesStatus = statusFilter === '' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === '' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const isTechOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'TECH';

  const handleExportCSV = () => {
    if (filteredTickets.length === 0) return;

    const csvRows: (string | number)[][] = [
      ['เลขที่ตั๋ว', 'เรื่องแจ้งซ่อม', 'รายละเอียด', 'ความเร่งด่วน', 'สถานะ', 'ผู้แจ้งซ่อม', 'ช่างผู้รับผิดชอบ', 'วันที่สร้างตั๋ว', 'วันที่ปิดงาน', 'คะแนนความพึงพอใจ', 'บันทึกการแก้ไข'],
    ];

    filteredTickets.forEach(t => {
      let priorityText = '';
      if (t.priority === 'Critical') priorityText = 'วิกฤต';
      else if (t.priority === 'High') priorityText = 'สูง';
      else if (t.priority === 'Medium') priorityText = 'ปานกลาง';
      else priorityText = 'ปกติ';

      let statusText = '';
      if (t.status === 'Pending_Approval') statusText = 'รออนุมัติ';
      else if (t.status === 'Open') statusText = 'เปิดใหม่';
      else if (t.status === 'In_Progress') statusText = 'กำลังทำ';
      else if (t.status === 'Pending') statusText = 'รออะไหล่';
      else if (t.status === 'Resolved') statusText = 'เสร็จสิ้น';
      else if (t.status === 'Closed') statusText = 'ปิดงานแล้ว';
      else statusText = t.status;

      const createdDate = new Date(t.createdAt).toLocaleString('th-TH');
      const resolvedDate = t.resolvedAt ? new Date(t.resolvedAt).toLocaleString('th-TH') : '-';

      csvRows.push([
        t.ticketNo,
        t.title,
        t.description || '',
        priorityText,
        statusText,
        t.reporterName,
        t.assigneeName || '-',
        createdDate,
        resolvedDate,
        t.satisfactionRating || '-',
        t.resolutionNote || '-'
      ]);
    });

    const csvContent = csvRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `IT_Tickets_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Wrench className="w-8 h-8 text-indigo-400" />
            ระบบงานแจ้งซ่อมไอที (IT Tickets Workspace)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            แจ้งซ่อม ติดตามผล มอบหมายงานช่าง ดำเนินงาน PM และประเมินความพึงพอใจการให้บริการ
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
            เปิดงานแจ้งซ่อม
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#090d16]/40 border border-white/5 p-4 rounded-xl backdrop-blur-md">
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            placeholder="ค้นหาเลขตั๋ว เรื่องแจ้งซ่อม ผู้แจ้ง..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">ทุกสถานะ</option>
            <option value="Pending_Approval">รอการอนุมัติ (Pending Approval)</option>
            <option value="Open">เปิดใหม่ (Open)</option>
            <option value="In_Progress">กำลังทำ (In Progress)</option>
            <option value="Pending">รออะไหล่ (Pending)</option>
            <option value="Resolved">เสร็จสิ้น (Resolved)</option>
            <option value="Closed">ปิดงาน (Closed)</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">ทุกความเร่งด่วน</option>
            <option value="Low">ปกติ (Low)</option>
            <option value="Medium">ปานกลาง (Medium)</option>
            <option value="High">สูง (High)</option>
            <option value="Critical">เร่งด่วนที่สุด (Critical)</option>
          </select>

          <button
            onClick={fetchInitialData}
            className="p-2 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tickets Table Container */}
      <div className="bg-[#090d16]/90 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/10 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">เลขที่ตั๋ว</th>
                <th className="py-4 px-6">เรื่องแจ้งซ่อม</th>
                <th className="py-4 px-6">ความเร่งด่วน</th>
                <th className="py-4 px-6">ผู้แจ้งซ่อม</th>
                <th className="py-4 px-6">ช่างผู้รับผิดชอบ</th>
                <th className="py-4 px-6">สถานะ</th>
                <th className="py-4 px-6 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    กำลังโหลดข้อมูลตั๋วงาน...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    ไม่พบตั๋วแจ้งซ่อม
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-indigo-400">
                      {ticket.ticketNo}
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-semibold text-white max-w-xs truncate">{ticket.title}</p>
                        {ticket.assetTag && (
                          <span className="inline-flex mt-1 items-center gap-1 text-[10px] text-slate-400 bg-slate-900 border border-white/5 px-2 py-0.5 rounded-full font-mono">
                            <Laptop className="w-3 h-3" />
                            {ticket.assetTag}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                        ticket.priority === 'Critical'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : ticket.priority === 'High'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : ticket.priority === 'Medium'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {ticket.priority === 'Critical' ? 'วิกฤต' : ticket.priority === 'High' ? 'สูง' : ticket.priority === 'Medium' ? 'ปานกลาง' : 'ปกติ'}
                      </span>
                    </td>
                    <td className="py-4 px-6">{ticket.reporterName}</td>
                    <td className="py-4 px-6 text-slate-400">
                      {ticket.assigneeName ? (
                        <div className="flex items-center gap-1.5 text-white">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{ticket.assigneeName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-xs">ยังไม่มีช่างรับงาน</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                        ticket.status === 'Pending_Approval'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : ticket.status === 'Open'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : ticket.status === 'In_Progress'
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          : ticket.status === 'Pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : ticket.status === 'Resolved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {ticket.status === 'Pending_Approval' ? 'รออนุมัติ' : ticket.status === 'Open' ? 'เปิดใหม่' : ticket.status === 'In_Progress' ? 'กำลังทำ' : ticket.status === 'Pending' ? 'รออะไหล่' : ticket.status === 'Resolved' ? 'เสร็จสิ้น' : 'ปิดงานแล้ว'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {/* Tech action to instantly accept ticket */}
                      {isTechOrAdmin && !ticket.assigneeId && ticket.status === 'Open' && (
                        <button
                          onClick={() => handleSelfAssign(ticket)}
                          className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs font-bold transition-all"
                        >
                          รับงานซ่อม
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenDetail(ticket)}
                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
                        title="ดูรายละเอียด/อัปเดต"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg p-0.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-2xl">
            <div className="bg-[#090d16] rounded-[15px] p-6 text-slate-100">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-3 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-400" />
                เปิดใบแจ้งงานซ่อมใหม่ (New Helpdesk Ticket)
              </h3>

              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">เรื่องที่ต้องการแจ้งซ่อม</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="เช่น ลืมรหัสผ่านอีเมล หรือ จอคอมพิวเตอร์เปิดไม่ติด"
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">รายละเอียดปัญหา</label>
                  <textarea
                    rows={4}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="กรุณาอธิบายอาการเสีย หรือความช่วยเหลือที่ต้องการโดยละเอียด"
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">ระดับความเร่งด่วน</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    >
                      <option value="Low">ปกติ (Low)</option>
                      <option value="Medium">ปานกลาง (Medium)</option>
                      <option value="High">สูง (High)</option>
                      <option value="Critical">เร่งด่วนที่สุด (Critical)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">อุปกรณ์ไอทีที่มีปัญหา (ถ้ามี)</label>
                    <select
                      value={newAssetId}
                      onChange={(e) => setNewAssetId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    >
                      <option value="">-- ไม่เชื่อมต่อทรัพย์สิน --</option>
                      {assetsList
                        .filter((asset) => {
                          if (currentUser?.role === 'ADMIN' || currentUser?.role === 'TECH') {
                            return true;
                          }
                          return asset.assignedToUserId === currentUser?.id;
                        })
                        .map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.assetTag} - {asset.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold text-white shadow-md shadow-indigo-600/10 transition-colors disabled:opacity-50"
                  >
                    {creating ? 'กำลังสร้างตั๋ว...' : 'ยืนยันการแจ้งซ่อม'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL & WORKSPACE MODAL */}
      {showDetailModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl p-0.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-2xl">
            <div className="bg-[#090d16] rounded-[15px] p-6 text-slate-100 max-h-[90vh] overflow-y-auto pr-2">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                <div>
                  <span className="text-xs font-bold text-indigo-400 font-mono tracking-wider">{selectedTicket.ticketNo}</span>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedTicket.title}</h3>
                </div>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left side: details */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">รายละเอียดอาการแจ้งเสีย</h4>
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-900 text-sm text-slate-300 font-sans whitespace-pre-wrap">
                      {selectedTicket.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </div>
                  </div>

                  {/* Checklist if PM ticket */}
                  {checklistItems.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4" />
                        รายการตรวจเช็คการบำรุงรักษา (PM Checklist)
                      </h4>
                      <div className="space-y-2 p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                        {checklistItems.map((item, index) => (
                          <label 
                            key={index}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                              item.done 
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300' 
                                : 'bg-slate-900/50 border-slate-800 text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.done}
                              disabled={!isTechOrAdmin}
                              onChange={() => handleToggleChecklist(index)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                            />
                            <span className={item.done ? 'line-through decoration-emerald-500/50 text-slate-400' : ''}>
                              {item.text}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Spare Parts consumed on this ticket */}
                  {isTechOrAdmin && (
                    <div>
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <PackagePlus className="w-4 h-4" />
                        อะไหล่ที่เปลี่ยนในงานซ่อมนี้
                      </h4>
                      
                      <div className="p-3.5 bg-slate-950/40 border border-white/5 rounded-xl space-y-3">
                        {/* List parts used */}
                        {partsConsumed.length > 0 ? (
                          <div className="space-y-2">
                            {partsConsumed.map((item) => (
                              <div key={item.id} className="flex justify-between items-center text-xs p-2 rounded bg-slate-900 border border-slate-800 font-sans">
                                <span>{item.partName} {item.partNumber && <code className="text-slate-500 font-mono text-[10px]">({item.partNumber})</code>}</span>
                                <span className="font-bold font-mono text-white">x{item.quantity} ชิ้น</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">ยังไม่มีการบันทึกการเบิกใช้อะไหล่</p>
                        )}

                        {/* Add part block */}
                        {selectedTicket.status !== 'Closed' && selectedTicket.status !== 'Resolved' && (
                          <div className="flex gap-2 pt-2 border-t border-white/5">
                            <select
                              value={selectedPartId}
                              onChange={(e) => setSelectedPartId(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                            >
                              <option value="">-- เลือกอะไหล่จากคลัง --</option>
                              {partsInventory.map((part) => (
                                <option key={part.id} value={part.id} disabled={part.quantity <= 0}>
                                  {part.name} (เหลือ: {part.quantity})
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={partQty}
                              min="1"
                              onChange={(e) => setPartQty(e.target.value)}
                              className="w-16 px-2 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs font-mono text-center text-slate-200 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleConsumePart}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold text-white transition-colors"
                            >
                              ตัดสต็อก
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rating Block if ticket is Resolved & logged user is the Reporter */}
                  {!isTechOrAdmin && selectedTicket.status === 'Resolved' && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3">
                      <h4 className="text-sm font-bold text-emerald-400">ประเมินความพึงพอใจการให้บริการ</h4>
                      <p className="text-xs text-slate-300">ช่างเทคนิคได้ทำการแก้ไขตั๋วแจ้งซ่อมของท่านเรียบร้อยแล้ว โปรดประเมินเพื่อทำการปิดตั๋ว:</p>
                      
                      <div className="flex gap-2 items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="transition-transform active:scale-90"
                          >
                            <Star className={`w-8 h-8 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                          </button>
                        ))}
                        <span className="text-sm font-bold text-amber-400 ml-2">({rating} ดาว)</span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Right side: metadata & actions */}
                <div className="space-y-4 text-xs">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ข้อมูลทั่วไป</h4>
                    <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ผู้แจ้ง:</span>
                        <span className="font-semibold text-white">{selectedTicket.reporterName}</span>
                      </div>
                      {selectedTicket.assetTag && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">รหัสทรัพย์สิน:</span>
                          <span className="font-mono text-indigo-400 font-bold">{selectedTicket.assetTag}</span>
                        </div>
                      )}
                      {selectedTicket.assetImagesJson && (
                        <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
                          <span className="text-[10px] text-slate-500 font-bold">รูปภาพอุปกรณ์:</span>
                          <div className="flex gap-1.5 mt-0.5">
                            {(() => {
                              let imgs: string[] = [];
                              try {
                                imgs = JSON.parse(selectedTicket.assetImagesJson);
                              } catch(e){}
                              return imgs.map((img, i) => (
                                <img key={i} src={img} alt="Asset" className="w-8 h-8 rounded border border-white/10 object-cover cursor-pointer hover:scale-150 transition-transform" />
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">ความเร่งด่วน:</span>
                        <span className="font-semibold text-white">{selectedTicket.priority}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">วันที่สร้างตั๋ว:</span>
                        <span className="text-slate-400">{new Date(selectedTicket.createdAt).toLocaleDateString('th-TH')}</span>
                      </div>
                      {selectedTicket.resolvedAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">วันที่ปิดงาน:</span>
                          <span className="text-slate-400">{new Date(selectedTicket.resolvedAt).toLocaleDateString('th-TH')}</span>
                        </div>
                      )}
                      {selectedTicket.satisfactionRating && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">คะแนน CSAT:</span>
                          <span className="font-bold text-amber-400 flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            {selectedTicket.satisfactionRating}/5
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approver actions panel */}
                  {selectedTicket.status === 'Pending_Approval' && (currentUser?.role === 'APPROVER' || currentUser?.role === 'ADMIN') && (
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">การพิจารณาอนุมัติใบงาน (Approval Action)</h4>
                      <div className="p-3.5 rounded-xl bg-slate-900/40 border border-indigo-500/30 space-y-3">
                        <p className="text-[11px] text-slate-300">ใบงานนี้ต้องการความเห็นชอบจากคุณก่อนส่งมอบต่อให้ทีมวิศวกรคอมพิวเตอร์</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('คุณต้องการอนุมัติใบงานนี้ใช่หรือไม่?')) return;
                              try {
                                const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'Open' }),
                                });
                                if (res.ok) {
                                  setShowDetailModal(false);
                                  fetchInitialData();
                                } else {
                                  const errData = (await res.json() as any);
                                  alert(errData.error || 'อนุมัติไม่สำเร็จ');
                                }
                              } catch (e) {
                                alert('การเชื่อมต่อขัดข้อง');
                              }
                            }}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-colors"
                          >
                            อนุมัติ (Approve)
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('คุณต้องการปฏิเสธและยกเลิกใบงานนี้ใช่หรือไม่?')) return;
                              try {
                                const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'Closed' }),
                                });
                                if (res.ok) {
                                  setShowDetailModal(false);
                                  fetchInitialData();
                                } else {
                                  const errData = (await res.json() as any);
                                  alert(errData.error || 'ปฏิเสธไม่สำเร็จ');
                                }
                              } catch (e) {
                                alert('การเชื่อมต่อขัดข้อง');
                              }
                            }}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs transition-colors"
                          >
                            ปฏิเสธ (Reject)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Technician Workspace actions */}
                  {isTechOrAdmin && selectedTicket.status !== 'Pending_Approval' && (
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">แผงดำเนินการของช่าง (Tech Console)</h4>
                      <form onSubmit={handleUpdateTicket} className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-3">
                        <div>
                          <label className="block text-slate-400 mb-1">เปลี่ยนสถานะงาน</label>
                          <select
                            value={updateStatus}
                            onChange={(e) => setUpdateStatus(e.target.value)}
                            disabled={selectedTicket.status === 'Closed'}
                            className="w-full px-2.5 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-slate-200"
                          >
                            <option value="Open">เปิดใหม่ (Open)</option>
                            <option value="In_Progress">กำลังทำ (In Progress)</option>
                            <option value="Pending">รออะไหล่/Pending</option>
                            <option value="Resolved">เสร็จสิ้น (Resolved)</option>
                            <option value="Closed">ปิดงานอย่างสมบูรณ์ (Closed)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">ช่างผู้ได้รับมอบหมาย</label>
                          <select
                            value={updateAssigneeId}
                            onChange={(e) => setUpdateAssigneeId(e.target.value)}
                            disabled={selectedTicket.status === 'Closed'}
                            className="w-full px-2.5 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-slate-200"
                          >
                            <option value="">-- ยังไม่ได้มอบหมายช่าง --</option>
                            {usersList
                              .filter(u => u.role === 'TECH' || u.role === 'ADMIN')
                              .map(u => (
                                <option key={u.id} value={u.id}>
                                  {u.name} ({u.role})
                                </option>
                              ))
                            }
                          </select>
                        </div>

                        {(updateStatus === 'Resolved' || updateStatus === 'Closed') && (
                          <div>
                            <label className="block text-slate-400 mb-1">บันทึกสรุปการแก้ไข / คอมเมนต์ปิดงาน</label>
                            <textarea
                              rows={3}
                              value={resolutionNote}
                              onChange={(e) => setResolutionNote(e.target.value)}
                              placeholder="อธิบายสิ่งที่ดำเนินการแก้ไข เช่น เปลี่ยนจอใหม่ ติดตั้ง driver ฯลฯ"
                              className="w-full px-2.5 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-slate-200 text-sm resize-none focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        )}

                        {updateStatus === 'Closed' && !selectedTicket.satisfactionRating && (
                          <div>
                            <label className="block text-slate-400 mb-1">ระบุระดับคะแนน CSAT (1-5)</label>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={rating}
                              onChange={(e) => setRating(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-slate-200 font-bold"
                            />
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={savingUpdate || selectedTicket.status === 'Closed'}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition-all disabled:opacity-50"
                        >
                          {savingUpdate ? 'กำลังอัปเดต...' : 'บันทึกการอัปเดต'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Reporter actions to close tickets */}
                  {!isTechOrAdmin && selectedTicket.status === 'Resolved' && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'Closed', satisfactionRating: rating }),
                          });
                          if (res.ok) {
                            setShowDetailModal(false);
                            fetchInitialData();
                          }
                        } catch (e) {
                          alert('เกิดข้อผิดพลาด');
                        }
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      ให้คะแนนและยืนยันปิดตั๋วซ่อม
                    </button>
                  )}

                  {/* Completed Summary Panel for closed/resolved tickets visible to all users */}
                  {(selectedTicket.status === 'Closed' || selectedTicket.status === 'Resolved') && (
                    <div>
                      <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">สรุปผลการปิดงาน (Completion Summary)</h4>
                      <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">สถานะ:</span>
                          <span className="font-bold text-emerald-400">
                            {selectedTicket.status === 'Closed' ? '✅ ปิดงานเรียบร้อย' : '🔧 แก้ไขเสร็จสิ้น (รอยืนยัน)'}
                          </span>
                        </div>
                        {selectedTicket.resolvedAt && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">วันที่ปิดงาน:</span>
                            <span className="text-white font-semibold">{new Date(selectedTicket.resolvedAt).toLocaleString('th-TH')}</span>
                          </div>
                        )}
                        {selectedTicket.assigneeName && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">ช่างผู้ดำเนินการ:</span>
                            <span className="text-indigo-400 font-semibold">{selectedTicket.assigneeName}</span>
                          </div>
                        )}
                        {selectedTicket.satisfactionRating && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">คะแนนความพึงพอใจ:</span>
                            <span className="font-bold text-amber-400 flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s <= (selectedTicket.satisfactionRating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                              ))}
                              <span className="ml-1">({selectedTicket.satisfactionRating}/5)</span>
                            </span>
                          </div>
                        )}
                        {selectedTicket.status === 'Closed' && !selectedTicket.satisfactionRating && (
                          <p className="text-[11px] text-slate-500 italic">ปิดงานโดยไม่ได้ประเมินความพึงพอใจ</p>
                        )}
                        {selectedTicket.resolutionNote && (
                          <div className="pt-2 border-t border-emerald-500/10">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">บันทึกการแก้ไข:</span>
                            <p className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">{selectedTicket.resolutionNote}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
