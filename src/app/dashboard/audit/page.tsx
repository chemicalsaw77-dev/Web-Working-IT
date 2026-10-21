'use client';

import { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Terminal, Download } from 'lucide-react';

interface AuditLog {
  id: number;
  action: string;
  details: string;
  ipAddress: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      if (res.ok) {
        const data = (await res.json() as any);
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      (log.userName || '').toLowerCase().includes(term) ||
      (log.userEmail || '').toLowerCase().includes(term)
    );
  });

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('ไม่มีข้อมูลประวัติสำหรับส่งออก');
      return;
    }

    const headers = ['วัน-เวลา', 'ผู้ทำรายการ', 'อีเมล', 'การกระทำ', 'รายละเอียด', 'IP Address'];
    const rows = filteredLogs.map(log => [
      new Date(log.createdAt).toLocaleString('th-TH'),
      log.userName || 'System / Auto',
      log.userEmail || '',
      log.action,
      `"${(log.details || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      log.ipAddress || '-'
    ]);

    // Use UTF-8 BOM (\uFEFF) to support Thai language correctly in Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <History className="w-8 h-8 text-indigo-400" />
            ประวัติความเคลื่อนไหว (Audit Logs)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            บันทึกประวัติการกระทำสำคัญของระบบเพื่อความปลอดภัยและการตรวจสอบย้อนหลัง
          </p>
        </div>
      </div>

      {/* Filter and Reload Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#090d16]/40 border border-white/5 p-4 rounded-xl backdrop-blur-md">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="ค้นหาตามการกระทำ รายละเอียด หรือผู้ใช้..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-sm font-bold shadow-lg shadow-emerald-600/10 active:scale-95 duration-200"
          >
            <Download className="w-4 h-4" />
            ส่งออก CSV (Export)
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรชข้อมูล
          </button>
        </div>
      </div>

      {/* Logs Table Container */}
      <div className="bg-[#090d16]/90 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/10 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">วัน-เวลา</th>
                <th className="py-4 px-6">ผู้ทำรายการ</th>
                <th className="py-4 px-6">การกระทำ</th>
                <th className="py-4 px-6">รายละเอียด</th>
                <th className="py-4 px-6">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    กำลังโหลดประวัติความเคลื่อนไหว...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    ไม่พบข้อมูลประวัติระบบ
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-4 px-6 text-slate-400 text-xs font-sans">
                      {new Date(log.createdAt).toLocaleString('th-TH')}
                    </td>
                    <td className="py-4 px-6 font-sans">
                      {log.userName ? (
                        <div>
                          <p className="font-semibold text-white">{log.userName}</p>
                          <p className="text-slate-500 text-xs">{log.userEmail}</p>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">System / Auto</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                        <Terminal className="w-3 h-3" />
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-300 font-sans text-xs break-all max-w-sm">
                      {log.details}
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs">
                      {log.ipAddress || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
