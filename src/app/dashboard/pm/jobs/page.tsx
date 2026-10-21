'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertCircle, Wrench, Search, Filter, 
  RefreshCw, User, Laptop, Calendar, MessageSquare, Star, Settings, ClipboardList, PackagePlus, Eye, CalendarClock
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

export default function PMJobsPage() {
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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

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
        // ONLY show PM tickets starting with TCK-PM-
        const pmTickets = ticketsData.filter((t: any) => t.ticketNo.startsWith('TCK-PM-'));
        setTicketsList(pmTickets);
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

  const handleOpenDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setUpdateStatus(ticket.status);
    setUpdateAssigneeId(ticket.assigneeId ? String(ticket.assigneeId) : '');
    setRating(ticket.satisfactionRating || 5);
    setResolutionNote(ticket.resolutionNote || '');
    
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
      ['เลขที่ตั๋ว PM', 'แผนงาน PM', 'รายละเอียด', 'ความเร่งด่วน', 'สถานะ', 'ผู้แจ้งระบบ/ผู้ดูแล', 'ช่างผู้รับผิดชอบ', 'วันที่สร้างตั๋ว', 'วันที่ปิดงาน', 'คะแนนความพึงพอใจ', 'บันทึกการแก้ไข'],
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
    link.setAttribute('download', `IT_PM_Jobs_Report_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <CalendarClock className="w-8 h-8 text-indigo-400" />
            งานบำรุงรักษาเชิงป้องกัน (PM Jobs)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            ติดตามสถานะ ดำเนินการเช็ก Checklist และอัปเดตงานบำรุงรักษาเชิงป้องกันรายตั๋ว
          </p>
        </div>

        <div className="flex gap-3 items-center shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-sm tracking-wide shadow-lg shadow-emerald-600/10 active:scale-95 transition-all duration-200"
          >
            Export Report (CSV)
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#090d16]/40 border border-white/5 p-4 rounded-xl backdrop-blur-md">
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            placeholder="ค้นหาเลขตั๋ว แผนงาน PM ทรัพย์สิน..."
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
            <option value="Open">เปิดใหม่ (Open)</option>
            <option value="In_Progress">กำลังทำ (In Progress)</option>
            <option value="Pending">รออะไหล่ (Pending)</option>
            <option value="Resolved">เสร็จสิ้น (Resolved)</option>
            <option value="Closed">ปิดงานแล้ว (Closed)</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">ทุกระดับความเร่งด่วน</option>
            <option value="Critical">วิกฤต (Critical)</option>
            <option value="High">สูง (High)</option>
            <option value="Medium">ปานกลาง (Medium)</option>
            <option value="Low">ปกติ (Low)</option>
          </select>

          <button 
            onClick={fetchInitialData}
            className="p-2 hover:bg-slate-900 border border-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#090d16]/90 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/10 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">เลขที่ตั๋ว PM</th>
                <th className="py-4 px-6">แผนงาน PM / ทรัพย์สิน</th>
                <th className="py-4 px-6">ความเร่งด่วน</th>
                <th className="py-4 px-6">ผู้ดูแลระบบ/ผู้แจ้ง</th>
                <th className="py-4 px-6">ช่างผู้รับผิดชอบ</th>
                <th className="py-4 px-6">สถานะ</th>
                <th className="py-4 px-6 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    กำลังโหลดข้อมูลตั๋วงาน PM...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    ไม่พบตั๋วงาน PM
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

      {/* DETAIL & ACTION WORKSPACE MODAL */}
      {showDetailModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl p-0.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-2xl">
            <div className="bg-[#090d16] rounded-[15px] p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-6">
                <div>
                  <span className="text-xs font-bold text-indigo-400 font-mono tracking-widest uppercase">
                    {selectedTicket.ticketNo}
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1">{selectedTicket.title}</h3>
                </div>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-white/5 hover:bg-slate-900 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  ปิดหน้าต่าง
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Columns - Details */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Metadata cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">สถานะตั๋ว</p>
                      <p className="text-sm font-semibold text-white mt-1">{selectedTicket.status}</p>
                    </div>
                    <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">ความเร่งด่วน</p>
                      <p className="text-sm font-semibold text-white mt-1">{selectedTicket.priority}</p>
                    </div>
                    <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3 col-span-2 md:col-span-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">ผู้แจ้งซ่อม</p>
                      <p className="text-sm font-semibold text-white mt-1 truncate">{selectedTicket.reporterName}</p>
                    </div>
                  </div>

                  {/* Description / Job notes */}
                  <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      รายละเอียดแผนงานบำรุงรักษา
                    </h4>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {selectedTicket.description?.split('\n').filter(l => !l.startsWith('[ ]') && !l.startsWith('[x]')).join('\n').trim()}
                    </p>
                  </div>

                  {/* PM Checklist items */}
                  {checklistItems.length > 0 && (
                    <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        ขั้นตอนการบำรุงรักษา (PM Checklist)
                      </h4>
                      <div className="space-y-2">
                        {checklistItems.map((item, index) => (
                          <label 
                            key={index} 
                            className={`flex items-start gap-3 p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 cursor-pointer select-none text-sm transition-all ${
                              item.done ? 'text-slate-500 border-indigo-500/20' : 'text-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => handleToggleChecklist(index)}
                              className="mt-0.5 w-4 h-4 rounded border-slate-800 bg-[#0d1527] text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className={item.done ? 'line-through' : ''}>{item.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Parts Consumed List */}
                  {isTechOrAdmin && (
                    <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <PackagePlus className="w-4 h-4 text-indigo-400" />
                        รายการใช้อะไหล่บำรุงรักษา
                      </h4>

                      <div className="flex gap-3">
                        <select
                          value={selectedPartId}
                          onChange={(e) => setSelectedPartId(e.target.value)}
                          className="flex-1 px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none"
                        >
                          <option value="">-- กรุณาเลือกอะไหล่ --</option>
                          {partsInventory.map(part => (
                            <option key={part.id} value={part.id} disabled={part.quantity <= 0}>
                              {part.name} (คงเหลือ {part.quantity} ชิ้น)
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={partQty}
                          onChange={(e) => setPartQty(e.target.value)}
                          className="w-20 px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleConsumePart}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-colors"
                        >
                          บันทึกการเบิกอะไหล่
                        </button>
                      </div>

                      {/* Display Consumed Parts table */}
                      {partsConsumed.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 text-slate-500 font-semibold">
                                <th className="py-2">รายการอะไหล่</th>
                                <th className="py-2">จำนวน</th>
                                <th className="py-2">วันที่เบิกใช้</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                              {partsConsumed.map(p => (
                                <tr key={p.id}>
                                  <td className="py-2 font-medium text-white">{p.partName}</td>
                                  <td className="py-2 font-mono">{p.quantity} ชิ้น</td>
                                  <td className="py-2 font-mono text-[10px] text-slate-500">
                                    {new Date(p.usedAt).toLocaleString('th-TH')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600 italic">ยังไม่มีการใช้อะไหล่ในตั๋ว PM นี้</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column - Status Update Form */}
                <div className="space-y-6">
                  
                  {/* Asset Details */}
                  {selectedTicket.assetTag && (
                    <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                        ข้อมูลทรัพย์สิน
                      </h4>
                      <div>
                        <p className="text-xs font-bold text-indigo-400 font-mono">{selectedTicket.assetTag}</p>
                        <p className="text-sm font-semibold text-white mt-0.5">{selectedTicket.assetName}</p>
                      </div>
                    </div>
                  )}

                  {/* Technician assignment and status update form */}
                  <form onSubmit={handleUpdateTicket} className="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-4">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5" />
                      อัปเดตงานบำรุงรักษา
                    </h4>

                    {/* Status Select */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">สถานะการดำเนินงาน</label>
                      <select
                        value={updateStatus}
                        onChange={(e) => setUpdateStatus(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none"
                      >
                        <option value="Open">เปิดงาน (Open)</option>
                        <option value="In_Progress">กำลังดำเนินงาน (In Progress)</option>
                        <option value="Pending">รออะไหล่/ระงับงานชั่วคราว (Pending)</option>
                        <option value="Resolved">เสร็จสิ้นการบำรุงรักษา (Resolved)</option>
                        <option value="Closed">ปิดงานถาวร (Closed)</option>
                      </select>
                    </div>

                    {/* Technician select (Admin only) */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">ช่างผู้รับผิดชอบ</label>
                      {currentUser?.role === 'ADMIN' ? (
                        <select
                          value={updateAssigneeId}
                          onChange={(e) => setUpdateAssigneeId(e.target.value)}
                          className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none"
                        >
                          <option value="">-- ยังไม่มอบหมาย --</option>
                          {usersList.filter(u => u.role === 'TECH' || u.role === 'ADMIN').map(user => (
                            <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs font-semibold text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                          {selectedTicket.assigneeName || 'ยังไม่มอบหมาย'}
                        </p>
                      )}
                    </div>

                    {/* Rating and resolution note if resolved/closed */}
                    {(updateStatus === 'Closed' || updateStatus === 'Resolved') && (
                      <div className="space-y-4 border-t border-white/5 pt-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">ประเมินผลงาน PM (1-5)</label>
                          <div className="flex items-center gap-1.5 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="focus:outline-none"
                              >
                                <Star className={`w-5 h-5 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-400 mb-1">บันทึกการซ่อมบำรุง/รายงาน PM</label>
                          <textarea
                            value={resolutionNote}
                            onChange={(e) => setResolutionNote(e.target.value)}
                            placeholder="ระบุสิ่งที่ตรวจพบ การแก้ไข หรือการเปลี่ยนชิ้นส่วนบำรุงรักษา..."
                            rows={3}
                            className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={savingUpdate}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/10"
                    >
                      {savingUpdate ? 'กำลังบันทึก...' : 'บันทึกการดำเนินการ'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
