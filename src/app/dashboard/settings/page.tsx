'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Save, Bell, Building2, Upload, MessageSquare, Mail, RefreshCw, Sparkles, Server } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Settings Form fields
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [lineNotifyToken, setLineNotifyToken] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [resendApiKey, setResendApiKey] = useState('');

  // SMTP Settings
  const [emailService, setEmailService] = useState<'resend' | 'smtp'>('resend');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpSecure, setSmtpSecure] = useState('false');
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = (await res.json() as any);
        setCompanyName(data.companyName || 'IT workplace');
        setCompanyLogo(data.companyLogo || '');
        setLineNotifyToken(data.lineNotifyToken || '');
        setTelegramBotToken(data.telegramBotToken || '');
        setTelegramChatId(data.telegramChatId || '');
        setResendApiKey(data.resendApiKey || '');

        // Load SMTP config
        setEmailService(data.emailService || 'resend');
        setSmtpHost(data.smtpHost || '');
        setSmtpPort(data.smtpPort || '587');
        setSmtpUser(data.smtpUser || '');
        setSmtpPass(data.smtpPass || '');
        setSmtpFrom(data.smtpFrom || '');
        setSmtpSecure(data.smtpSecure || 'false');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      alert('ขนาดโลโก้ต้องไม่เกิน 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCompanyLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    const payload = {
      companyName,
      companyLogo,
      lineNotifyToken,
      telegramBotToken,
      telegramChatId,
      resendApiKey,
      emailService,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      smtpSecure,
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว');
        // Trigger a custom event to update logo in sidebar or refresh layout
        window.dispatchEvent(new Event('company-settings-updated'));
      } else {
        const data = (await res.json() as any);
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">กำลังโหลดการตั้งค่าระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-400" />
            ตั้งค่าผู้ดูแลระบบ (Console Settings)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            ปรับแต่งชื่อบริษัท, อัปโหลดโลโก้หน่วยงาน และเปิดใช้งานโทเค็นการแจ้งเตือนหลายช่องทาง
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="p-3 bg-slate-900 border border-white/5 rounded-xl hover:text-white text-slate-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Logo & Info */}
        <div className="bg-[#090d16]/90 border border-white/5 p-6 rounded-2xl shadow-lg space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
            <Building2 className="w-5 h-5 text-indigo-400" />
            ข้อมูลบริษัทและโลโก้
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1">ชื่อบริษัท / หน่วยงาน</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="เช่น บจก. ไอที เน็ตเวิร์ค แอนด์ เซอร์วิส"
                className="w-full px-3 py-2.5 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">โลโก้บริษัท</label>
              <div className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 relative">
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                {companyLogo ? (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/5 bg-slate-950 flex items-center justify-center p-2 relative group">
                    <img src={companyLogo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setCompanyLogo('')}
                      className="absolute inset-0 bg-black/70 text-rose-400 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold transition-opacity"
                    >
                      ลบโลโก้
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-600 border border-white/5">
                    <Building2 className="w-10 h-10" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-xs font-bold transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  เลือกรูปโลโก้
                </button>
                <p className="text-[10px] text-slate-500 text-center">
                  * แนะนำรูปภาพสี่เหลี่ยมจตุรัส ขนาดไม่เกิน 1MB รูปภาพจะแสดงในหน้า Login และ Sidebar
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Notification channels config */}
        <div className="lg:col-span-2 bg-[#090d16]/90 border border-white/5 p-6 rounded-2xl shadow-lg space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
            <Bell className="w-5 h-5 text-indigo-400" />
            การตั้งค่าแจ้งเตือนหลายช่องทาง (Notification Channels)
          </h3>

          <div className="space-y-6">
            {/* LINE Notify */}
            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
              <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                LINE Notify Integration (กลุ่มแจ้งเตือนส่วนตัว/กลุ่มไอที)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                กรอก Token ของ LINE Notify เพื่อให้ระบบทำการยิงข่าวสารเมื่อมีตั๋วซ่อมถูกเปิดขึ้นใหม่ หรือใกล้ถึงกำหนดรอบ PM
              </p>
              <input
                type="password"
                value={lineNotifyToken}
                onChange={(e) => setLineNotifyToken(e.target.value)}
                placeholder="LINE Notify Token"
                className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              />
            </div>

            {/* Telegram Bot */}
            <div className="p-5 rounded-2xl bg-sky-500/5 border border-sky-500/10 space-y-4">
              <h4 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Telegram Bot Integration
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                สร้างบอทจาก @BotFather แล้วนำ Token มาใส่ พร้อมระบุ Chat ID กลุ่มเพื่อส่งข้อความด่วน
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="password"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="Telegram Bot Token"
                  className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                />
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Default Group Chat ID (e.g. -100xxxxxxxx)"
                  className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                />
              </div>
            </div>

            {/* Email Dispatch Config (Toggle between Resend & SMTP) */}
            <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  การแจ้งเตือนทางอีเมล (Email Notifications)
                </h4>
                
                {/* Email Service Selector */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setEmailService('resend')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      emailService === 'resend' 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Resend API
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailService('smtp')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      emailService === 'smtp' 
                        ? 'bg-[#0d1527] text-indigo-400 border border-indigo-500/20' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SMTP Server
                  </button>
                </div>
              </div>

              {emailService === 'resend' ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    ใช้บริการส่งเมลความเร็วสูงผ่าน HTTP Endpoint ของ Resend API (แนะนำสำหรับการรันบน Edge Runtime)
                  </p>
                  <input
                    type="password"
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed flex items-center gap-1.5 text-amber-400">
                    <Server className="w-3.5 h-3.5" />
                    เชื่อมต่อเมลเซิร์ฟเวอร์แบบดั้งเดิม (SMTP) สำหรับส่งตรงผ่าน SMTP พอร์ตต่างๆ (รองรับเมื่อรันแบบ Node local.db)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">SMTP Host</label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="w-full px-2.5 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">SMTP Port</label>
                      <input
                        type="text"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="587"
                        className="w-full px-2.5 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">SSL/TLS Secure</label>
                      <select
                        value={smtpSecure}
                        onChange={(e) => setSmtpSecure(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs text-slate-200"
                      >
                        <option value="false">STARTTLS (Port 587/25)</option>
                        <option value="true">SSL/TLS (Port 465)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Username / Mail Account</label>
                      <input
                        type="text"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="admin@company.com"
                        className="w-full px-2.5 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Password</label>
                      <input
                        type="password"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-2.5 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Sender Email (From)</label>
                      <input
                        type="text"
                        value={smtpFrom}
                        onChange={(e) => setSmtpFrom(e.target.value)}
                        placeholder="IT Helpdesk <admin@company.com>"
                        className="w-full px-2.5 py-1.5 bg-[#0d1527] border border-slate-800 rounded-lg text-xs text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/20 active:scale-95 transition-all duration-200 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลงทั้งหมด'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
