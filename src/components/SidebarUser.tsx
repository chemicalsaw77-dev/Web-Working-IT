'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';

interface SidebarUserProps {
  userId: string;
  userName: string;
  userRole: string;
  initialProfilePicture: string | null;
}

export default function SidebarUser({
  userId,
  userName,
  userRole,
  initialProfilePicture,
}: SidebarUserProps) {
  const [profilePic, setProfilePic] = useState<string | null>(initialProfilePicture);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 1.5MB for Base64 database storage
    if (file.size > 1.5 * 1024 * 1024) {
      alert('ขนาดรูปภาพต้องไม่เกิน 1.5MB');
      return;
    }

    setUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch('/api/users/profile-picture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profilePicture: base64Data }),
        });

        if (res.ok) {
          setProfilePic(base64Data);
        } else {
          const data = (await res.json() as any);
          alert(data.error || 'อัปโหลดรูปไม่สำเร็จ');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div 
      onClick={handleClick}
      className="p-4 mx-3 my-4 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-white/5 flex items-center gap-3 cursor-pointer group transition-all duration-300 relative overflow-hidden"
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="w-10 h-10 rounded-xl relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold uppercase shadow-lg shadow-indigo-500/10 shrink-0">
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-white" />
        ) : profilePic ? (
          <img 
            src={profilePic} 
            alt="Profile Avatar" 
            className="w-full h-full object-cover" 
          />
        ) : (
          userName.substring(0, 2)
        )}

        {/* Hover Camera Icon Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
          <Camera className="w-4 h-4 text-white" />
        </div>
      </div>

      <div className="overflow-hidden pr-2">
        <p className="text-sm font-bold truncate text-white group-hover:text-indigo-400 transition-colors">
          {userName}
        </p>
        <div className="inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
          {userRole}
        </div>
      </div>
    </div>
  );
}
