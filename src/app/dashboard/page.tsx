'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Wrench, Laptop, Boxes, Star, Clock, CalendarCheck, ShieldAlert,
  ChevronRight, ArrowUpRight, Activity, ClipboardList, CheckCircle, Plus
} from 'lucide-react';

interface DashboardData {
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    pending: number;
    resolved: number;
    closed: number;
    priorityStats: {
      Low: number;
      Medium: number;
      High: number;
      Critical: number;
    };
  };
  assets: {
    total: number;
    active: number;
    inRepair: number;
    retired: number;
  };
  inventory: {
    total: number;
    lowStock: number;
  };
  kpis: {
    csat: number;
    mttr: number;
    sla: number;
    pmCompletion: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = (await res.json() as any);
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!stats) return;

    const csvRows = [
      ['หมวดหมู่', 'ตัวชี้วัด / รายละเอียด', 'ค่าสถิติ'],
      ['ตั๋วแจ้งซ่อมไอที', 'ตั๋วทั้งหมด (รวม)', stats.tickets.total],
      ['ตั๋วแจ้งซ่อมไอที', 'เปิดใหม่ (Open)', stats.tickets.open],
      ['ตั๋วแจ้งซ่อมไอที', 'กำลังทำ (In Progress)', stats.tickets.inProgress],
      ['ตั๋วแจ้งซ่อมไอที', 'รออะไหล่ (Pending)', stats.tickets.pending],
      ['ตั๋วแจ้งซ่อมไอที', 'ปิดงานแล้ว (Closed/Resolved)', stats.tickets.closed + stats.tickets.resolved],
      ['ตั๋วแจ้งซ่อมไอที', 'ความเร่งด่วน: ต่ำ (Low)', stats.tickets.priorityStats.Low],
      ['ตั๋วแจ้งซ่อมไอที', 'ความเร่งด่วน: ปานกลาง (Medium)', stats.tickets.priorityStats.Medium],
      ['ตั๋วแจ้งซ่อมไอที', 'ความเร่งด่วน: สูง (High)', stats.tickets.priorityStats.High],
      ['ตั๋วแจ้งซ่อมไอที', 'ความเร่งด่วน: วิกฤต (Critical)', stats.tickets.priorityStats.Critical],
      
      ['สินทรัพย์ไอที', 'สินทรัพย์ทั้งหมด', stats.assets.total],
      ['สินทรัพย์ไอที', 'พร้อมใช้งาน (Active)', stats.assets.active],
      ['สินทรัพย์ไอที', 'ส่งซ่อมบำรุง (In Repair)', stats.assets.inRepair],
      ['สินทรัพย์ไอที', 'ปลดระวางแล้ว (Retired)', stats.assets.retired],
      
      ['คลังอะไหล่', 'ชนิดชิ้นส่วนอะไหล่ทั้งหมด', stats.inventory.total],
      ['คลังอะไหล่', 'จำนวนอะไหล่สต็อกต่ำกว่าเกณฑ์', stats.inventory.lowStock],
      
      ['ดัชนีชี้วัด (KPI)', 'ความพึงพอใจผู้รับบริการ (CSAT)', stats.kpis.csat],
      ['ดัชนีชี้วัด (KPI)', 'เวลาแก้ปัญหาเฉลี่ย (MTTR - ชั่วโมง)', stats.kpis.mttr],
      ['ดัชนีชี้วัด (KPI)', 'อัตราผ่านเกณฑ์ SLA (%)', stats.kpis.sla],
      ['ดัชนีชี้วัด (KPI)', 'งานบำรุงรักษาสำเร็จตามแผน (%)', stats.kpis.pmCompletion],
    ];

    const csvContent = csvRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `IT_Dashboard_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">กำลังคำนวณและประมวลผลระบบแดชบอร์ด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Banner */}
      <div className="relative p-6 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-950 border border-indigo-500/15 overflow-hidden">
        <div className="absolute top-[-50%] right-[-10%] w-[30vw] h-[30vw] rounded-full bg-indigo-500/5 blur-[80px]" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              ระบบศูนย์กลางบริหารจัดการไอทีและสินทรัพย์
            </h2>
            <p className="text-indigo-200/70 text-sm mt-1">
              ยินดีต้อนรับสู่แดชบอร์ด รายงานสรุปสถานะการบริการไอที, ค่าสถิติ KPI, และตารางบำรุงรักษาเชิงป้องกัน
            </p>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <button 
              onClick={fetchStats}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all"
            >
              รีเฟรชสรุปผล
            </button>
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shadow-lg shadow-emerald-500/5"
            >
              Export Report (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI: CSAT */}
        <div className="bg-[#090d16]/90 border border-white/5 p-6 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-indigo-500/25 transition-all">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">ความพึงพอใจ (CSAT)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white">{stats.kpis.csat}</span>
              <span className="text-slate-500 text-sm">/ 5.0</span>
            </div>
            <div className="flex gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  className={`w-3.5 h-3.5 ${s <= Math.round(stats.kpis.csat) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} 
                />
              ))}
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
            <Star className="w-6 h-6 fill-amber-500/20" />
          </div>
        </div>

        {/* KPI: MTTR */}
        <div className="bg-[#090d16]/90 border border-white/5 p-6 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-indigo-500/25 transition-all">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">เวลาแก้ปัญหาเฉลี่ย (MTTR)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-white">{stats.kpis.mttr}</span>
              <span className="text-slate-400 text-xs font-semibold">ชั่วโมง</span>
            </div>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold mt-2">
              <Clock className="w-3.5 h-3.5" />
              เป้าหมาย: ต่ำกว่า 24 ชั่วโมง
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI: SLA */}
        <div className="bg-[#090d16]/90 border border-white/5 p-6 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-indigo-500/25 transition-all">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">อัตราผ่านเกณฑ์ SLA</span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">{stats.kpis.sla}%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              จำนวนเคสที่ปิดใน 24 ชม.
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* KPI: PM Completion */}
        <div className="bg-[#090d16]/90 border border-white/5 p-6 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-indigo-500/25 transition-all">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">งานบำรุงรักษาสำเร็จตามแผน</span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">{stats.kpis.pmCompletion}%</span>
            </div>
            <p className="text-[10px] text-indigo-400 font-semibold mt-2">
              รอบแผน PM ประจำรอบสะสม
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card: IT Tickets Stats */}
        <div className="bg-[#090d16]/90 border border-white/5 p-6 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-400" />
                สถานะตั๋วแจ้งซ่อมไอที
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-semibold">
                รวม {stats.tickets.total} ใบ
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                <p className="text-slate-500 text-xs font-bold">เปิดใหม่ (Open)</p>
                <p className="text-2xl font-extrabold text-indigo-400 mt-1">{stats.tickets.open}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                <p className="text-slate-500 text-xs font-bold">กำลังทำ (In Progress)</p>
                <p className="text-2xl font-extrabold text-sky-400 mt-1">{stats.tickets.inProgress}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                <p className="text-slate-500 text-xs font-bold">รออะไหล่ (Pending)</p>
                <p className="text-2xl font-extrabold text-amber-400 mt-1">{stats.tickets.pending}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                <p className="text-slate-500 text-xs font-bold">ปิดงานแล้ว (Closed)</p>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.tickets.closed + stats.tickets.resolved}</p>
              </div>
            </div>
          </div>
          
          <Link 
            href="/dashboard/tickets" 
            className="flex items-center justify-between text-xs text-indigo-400 hover:text-indigo-300 font-bold border-t border-white/5 pt-4 mt-6 group"
          >
            <span>เปิดหน้าตั๋วใบซ่อมทั้งหมด</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Card: Assets Stats */}
        <div className="bg-[#090d16]/90 border border-white/5 p-6 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Laptop className="w-5 h-5 text-indigo-400" />
                สรุปสถานะสินทรัพย์ไอที
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-semibold">
                รวม {stats.assets.total} รายการ
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-semibold">พร้อมใช้งาน (Active)</span>
                  <span className="font-bold text-white">{stats.assets.active} เครื่อง</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500" 
                    style={{ width: `${stats.assets.total > 0 ? (stats.assets.active / stats.assets.total) * 100 : 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-semibold">ส่งซ่อมบำรุง (In Repair)</span>
                  <span className="font-bold text-white">{stats.assets.inRepair} เครื่อง</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500" 
                    style={{ width: `${stats.assets.total > 0 ? (stats.assets.inRepair / stats.assets.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-semibold">ปลดระวางแล้ว (Retired)</span>
                  <span className="font-bold text-white">{stats.assets.retired} รายการ</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500" 
                    style={{ width: `${stats.assets.total > 0 ? (stats.assets.retired / stats.assets.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <Link 
            href="/dashboard/assets" 
            className="flex items-center justify-between text-xs text-indigo-400 hover:text-indigo-300 font-bold border-t border-white/5 pt-4 mt-6 group"
          >
            <span>เปิดหน้าจัดการทะเบียนสินทรัพย์</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Card: Inventory Stock Alert & Quick Links */}
        <div className="bg-[#090d16]/90 border border-white/5 p-6 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-400" />
                สต็อกอะไหล่ซ่อมบำรุง
              </h3>
            </div>

            <div className="space-y-4">
              {stats.inventory.lowStock > 0 ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-3 text-rose-300">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">พบคลังวิกฤต!</h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      มีอะไหล่จำนวน {stats.inventory.lowStock} รายการ ต่ำกว่าระดับเกณฑ์การแจ้งเตือน
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3 text-emerald-300">
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">คลังสินค้าอยู่ในสภาวะปกติ</h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      อะไหล่ทั้งหมดมีระดับสต็อกพร้อมใช้และเพียงพอต่องานบริการ
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-slate-500 text-xs font-bold">ชนิดชิ้นส่วนไอทีทั้งหมด</p>
                  <p className="text-2xl font-extrabold text-white mt-1">{stats.inventory.total} ชนิด</p>
                </div>
                <Link 
                  href="/dashboard/inventory"
                  className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20"
                >
                  <Plus className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
          
          <Link 
            href="/dashboard/inventory" 
            className="flex items-center justify-between text-xs text-indigo-400 hover:text-indigo-300 font-bold border-t border-white/5 pt-4 mt-6 group"
          >
            <span>ตรวจสอบสต็อกและเบิกจ่ายอะไหล่</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>
    </div>
  );
}
