'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Search, Plus, Edit2, Trash2, Tag, Calendar, User, Eye, ArrowLeft, RefreshCw } from 'lucide-react';

interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  authorId: number;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export default function KBPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Navigation / View states
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Search / Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [sessionRes, articlesRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch('/api/kb')
      ]);

      if (sessionRes.ok) {
        const sessionData = (await sessionRes.json() as any);
        setCurrentUser(sessionData.user);
      }
      if (articlesRes.ok) {
        const articlesData = (await articlesRes.json() as any);
        setArticles(articlesData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditId(null);
    setTitle('');
    setContent('');
    setCategory('General');
    setError('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (article: Article, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail view
    setEditId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setError('');
    setShowFormModal(true);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('คุณต้องการลบบทความคลังความรู้นี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/kb/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInitialData();
        if (selectedArticle?.id === id) setSelectedArticle(null);
      } else {
        const data = (await res.json() as any);
        alert(data.error || 'ลบไม่สำเร็จ');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = { title, content, category };

    try {
      const url = editId ? `/api/kb/${editId}` : '/api/kb';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json() as any);
      if (!res.ok) {
        throw new Error(data.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }

      setShowFormModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredArticles = articles.filter(art => {
    const matchesSearch = 
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === '' || art.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = ['General', 'Software', 'Hardware', 'Network'];
  const isTechOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'TECH';

  return (
    <div className="space-y-6 font-sans">
      
      {selectedArticle ? (
        /* DETAIL VIEW */
        <div className="space-y-6">
          <button
            onClick={() => setSelectedArticle(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับสู่คลังความรู้ทั้งหมด
          </button>

          <div className="p-8 rounded-3xl bg-[#090d16]/90 border border-white/5 shadow-xl space-y-6">
            <div className="border-b border-white/5 pb-4 flex justify-between items-start">
              <div>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider mb-2">
                  {selectedArticle.category}
                </span>
                <h2 className="text-3xl font-extrabold text-white">{selectedArticle.title}</h2>
                <div className="flex gap-4 items-center text-slate-500 text-xs mt-3">
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> เขียนโดย {selectedArticle.authorName}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> ปรับปรุงเมื่อ {new Date(selectedArticle.updatedAt).toLocaleDateString('th-TH')}</span>
                </div>
              </div>

              {isTechOrAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleOpenEdit(selectedArticle, e)}
                    className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(selectedArticle.id, e)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {selectedArticle.content}
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-indigo-400" />
                คลังความรู้วิธีการแก้ปัญหา (Knowledge Base / FAQ)
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                อ่านคู่มือ วิธีการแก้ปัญหาไอทีเบื้องต้น และตอบคำถามที่พบบ่อยเพื่ออำนวยความสะดวกในการใช้งาน
              </p>
            </div>

            {isTechOrAdmin && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/20 active:scale-95 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                เขียนบทความใหม่
              </button>
            )}
          </div>

          {/* Filters and Search Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#090d16]/40 border border-white/5 p-4 rounded-xl backdrop-blur-md">
            <div className="relative w-full md:max-w-xs">
              <input
                type="text"
                placeholder="ค้นหาชื่อเรื่อง คีย์เวิร์ดปัญหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            </div>

            <div className="flex gap-2 items-center overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedCategory === '' 
                    ? 'bg-indigo-600 border-indigo-500 text-white' 
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                ทั้งหมด
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedCategory === cat 
                      ? 'bg-indigo-600 border-indigo-500 text-white' 
                      : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}

              <button
                onClick={fetchInitialData}
                className="p-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-white ml-2 shrink-0"
              >
                <RefreshCw className={`w-4.5 h-4.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <div className="col-span-2 text-center text-slate-500 py-12">
                กำลังโหลดเนื้อหาคลังความรู้...
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="col-span-2 text-center text-slate-500 py-12">
                ไม่พบบทความที่ค้นหา
              </div>
            ) : (
              filteredArticles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="bg-[#090d16]/90 border border-white/5 hover:border-indigo-500/25 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-indigo-500/5 transition-all group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                        {art.category}
                      </span>
                      <span className="text-[10px] text-slate-500">{new Date(art.createdAt).toLocaleDateString('th-TH')}</span>
                    </div>
                    <h3 className="font-bold text-white text-base group-hover:text-indigo-400 transition-colors">
                      {art.title}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                      {art.content}
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <span className="text-[10px] text-slate-500">โดย: {art.authorName}</span>
                    <span className="text-xs text-indigo-400 group-hover:text-indigo-300 font-bold flex items-center gap-1">
                      อ่านวิธีแก้ไข
                      <Eye className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CREATE/EDIT ARTICLE MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl p-0.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-2xl">
            <div className="bg-[#090d16] rounded-[15px] p-6 text-slate-100 max-h-[90vh] overflow-y-auto pr-2">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-3">
                {editId ? 'แก้ไขบทความคู่มือ' : 'เขียนบทความคู่มือ FAQ ใหม่'}
              </h3>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-slate-300 text-xs font-semibold mb-1">หัวข้อคู่มือ / ปัญหาไอทีที่พบบ่อย</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="เช่น วิธีลงทะเบียน Wi-Fi เกสต์สำหรับผู้มาติดต่อภายนอก"
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1">หมวดหมู่</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    >
                      <option value="General">General (ทั่วไป)</option>
                      <option value="Software">Software (โปรแกรม)</option>
                      <option value="Hardware">Hardware (ฮาร์ดแวร์)</option>
                      <option value="Network">Network (ระบบเครือข่าย)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">เนื้อหาบทความขั้นตอนแก้ไขปัญหา</label>
                  <textarea
                    rows={12}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="เขียนรายละเอียดและระบุขั้นตอน 1, 2, 3 เพื่ออธิบายวิธีแก้ปัญหาให้เข้าใจง่าย..."
                    className="w-full px-3 py-2 bg-[#0d1527] border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm resize-none font-sans leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold text-white shadow-md shadow-indigo-600/10 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึกเผยแพร่'}
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
