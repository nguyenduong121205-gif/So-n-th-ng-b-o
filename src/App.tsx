/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bell, 
  ChevronRight, 
  Copy, 
  Download, 
  History, 
  Layout, 
  LayoutDashboard, 
  LifeBuoy, 
  LogOut, 
  Menu, 
  Moon, 
  Plus, 
  RefreshCw, 
  Save, 
  Search, 
  Settings, 
  Sparkles, 
  Sun, 
  Trash2, 
  X,
  AlertCircle,
  CheckCircle2,
  Info,
  Mail,
  MessageSquare,
  Smartphone,
  Zap,
  Clock,
  BarChart3,
  FileText,
  Tag,
  Briefcase,
  ShieldAlert,
  CreditCard,
  Rocket,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// --- Types ---

type Urgency = 'low' | 'medium' | 'high';
type Channel = 'email' | 'sms' | 'app' | 'push' | 'zalo' | 'banner';
type Language = 'vi' | 'en' | 'both';
type Tone = 'professional' | 'friendly' | 'formal' | 'concise' | 'empathetic' | 'direct';
type NotifType = 'maintenance' | 'incident' | 'update' | 'payment' | 'security' | 'promotion' | 'policy' | 'custom';

interface NotificationEntry {
  id: string;
  subject: string;
  situation: string;
  urgency: Urgency;
  channel: Channel;
  action: string;
  timeStart: string;
  timeEnd: string;
  language: Language;
  tone: Tone;
  notifType: NotifType;
  brand: string;
  tags: string[];
  message: string;
  timestamp: string;
}

interface Template {
  id: number;
  category: string;
  icon: string;
  name: string;
  urgency: Urgency;
  channel: Channel;
  type: NotifType;
  tone: Tone;
  situation: string;
  action: string;
}

// --- Constants ---

const TEMPLATES: Template[] = [
  {
    id: 1, category: 'Kỹ thuật', icon: '🔧', name: 'Bảo trì định kỳ',
    urgency: 'medium', channel: 'email', type: 'maintenance', tone: 'professional',
    situation: 'Hệ thống sẽ tạm dừng để bảo trì nâng cấp định kỳ.',
    action: 'Vui lòng hoàn tất các giao dịch trước thời gian bảo trì.'
  },
  {
    id: 2, category: 'Khẩn cấp', icon: '🚨', name: 'Sự cố hệ thống khẩn',
    urgency: 'high', channel: 'sms', type: 'incident', tone: 'concise',
    situation: 'Hệ thống đang gặp sự cố kỹ thuật nghiêm trọng, dịch vụ bị gián đoạn.',
    action: 'Liên hệ hotline 1800-xxxx để được hỗ trợ khẩn cấp'
  },
  {
    id: 3, category: 'Tính năng', icon: '✨', name: 'Ra mắt tính năng mới',
    urgency: 'low', channel: 'app', type: 'update', tone: 'friendly',
    situation: 'Chúng tôi vừa ra mắt tính năng mới giúp bạn quản lý tài khoản dễ dàng hơn.',
    action: 'Khám phá ngay trong ứng dụng'
  },
  {
    id: 4, category: 'Thanh toán', icon: '💳', name: 'Lỗi thanh toán',
    urgency: 'high', channel: 'email', type: 'payment', tone: 'empathetic',
    situation: 'Hệ thống thanh toán đang gặp lỗi kỹ thuật. Một số giao dịch có thể bị trì hoãn.',
    action: 'Kiểm tra trạng thái giao dịch trong 24h, liên hệ CSKH nếu cần'
  }
];

// --- Components ---

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info' | 'warning', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <X className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="flex items-center gap-3 bg-surface border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-xl pointer-events-auto min-w-[300px]"
    >
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
};

export default function App() {
  const [activePage, setActivePage] = useState('compose');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [history, setHistory] = useState<NotificationEntry[]>([]);
  const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'error' | 'info' | 'warning' }[]>([]);
  
  // Form State
  const [subject, setSubject] = useState('');
  const [situation, setSituation] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('medium');
  const [channel, setChannel] = useState<Channel>('email');
  const [action, setAction] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [language, setLanguage] = useState<Language>('vi');
  const [tone, setTone] = useState<Tone>('professional');
  const [notifType, setNotifType] = useState<NotifType>('maintenance');
  const [audience, setAudience] = useState('all');
  const [brand, setBrand] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [showResult, setShowResult] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('notifypro_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('notifypro_history', JSON.stringify(history));
  }, [history]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/,$/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const clearForm = () => {
    setSubject('');
    setSituation('');
    setUrgency('medium');
    setChannel('email');
    setAction('');
    setTimeStart('');
    setTimeEnd('');
    setLanguage('vi');
    setTone('professional');
    setNotifType('maintenance');
    setAudience('all');
    setBrand('');
    setTags([]);
    setShowResult(false);
    setGeneratedMessage('');
    addToast('Đã xóa toàn bộ form!', 'info');
  };

  const loadTemplate = (t: Template) => {
    setSituation(t.situation);
    setUrgency(t.urgency);
    setChannel(t.channel);
    setAction(t.action);
    setTone(t.tone);
    setNotifType(t.type);
    addToast(`Đã tải mẫu: ${t.name}`, 'success');
  };

  const generateNotification = async () => {
    if (!situation) {
      addToast('Vui lòng nhập mô tả tình huống!', 'warning');
      return;
    }

    setIsGenerating(true);
    setShowResult(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Bạn là một chuyên gia truyền thông doanh nghiệp. Hãy viết một thông báo khách hàng dựa trên các thông tin sau:
        - Tình huống: ${situation}
        - Chủ đề: ${subject}
        - Mức độ khẩn cấp: ${urgency}
        - Kênh: ${channel}
        - Hành động yêu cầu: ${action}
        - Thời gian: ${timeStart} đến ${timeEnd}
        - Ngôn ngữ: ${language}
        - Giọng điệu: ${tone}
        - Loại thông báo: ${notifType}
        - Đối tượng: ${audience}
        - Thương hiệu: ${brand}

        Yêu cầu:
        1. Ngắn gọn, súc tích, chuyên nghiệp.
        2. Phù hợp với kênh ${channel} (ví dụ SMS phải cực ngắn, Email có thể dài hơn).
        3. Nếu là song ngữ, hãy viết cả hai phần rõ ràng.
        4. Trình bày đẹp, dễ đọc.
        5. Đưa ra lời khuyên hành động cụ thể cho khách hàng.`,
      });

      const response = await model;
      const text = response.text || "Không thể tạo nội dung.";
      
      setGeneratedMessage(text);
      setShowResult(true);
      
      // Save to history
      const newEntry: NotificationEntry = {
        id: Date.now().toString(),
        subject,
        situation,
        urgency,
        channel,
        action,
        timeStart,
        timeEnd,
        language,
        tone,
        notifType,
        brand,
        tags,
        message: text,
        timestamp: new Date().toISOString()
      };
      setHistory([newEntry, ...history.slice(0, 49)]);
      
      addToast('Thông báo đã được tạo thành công! 🎉', 'success');
    } catch (error) {
      console.error(error);
      addToast('Đã xảy ra lỗi khi gọi AI. Vui lòng thử lại.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addToast('Đã sao chép vào clipboard!', 'success');
    });
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(history.filter(h => h.id !== id));
    addToast('Đã xóa thông báo khỏi lịch sử', 'info');
  };

  const loadHistoryItem = (h: NotificationEntry) => {
    setSubject(h.subject);
    setSituation(h.situation);
    setUrgency(h.urgency);
    setChannel(h.channel);
    setAction(h.action);
    setTimeStart(h.timeStart);
    setTimeEnd(h.timeEnd);
    setLanguage(h.language);
    setTone(h.tone);
    setNotifType(h.notifType);
    setBrand(h.brand);
    setTags(h.tags);
    setGeneratedMessage(h.message);
    setShowResult(true);
    setActivePage('compose');
    addToast('Đã tải lại thông báo từ lịch sử', 'success');
  };

  // --- Render Helpers ---

  const renderSidebar = () => (
    <aside className={`bg-surface border-r border-white/5 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Bell className="w-6 h-6 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <h1 className="font-display font-extrabold text-lg bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">NotifyPro</h1>
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Enterprise</span>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <NavItem 
          icon={<LayoutDashboard className="w-5 h-5" />} 
          label="Soạn Thông Báo" 
          active={activePage === 'compose'} 
          collapsed={sidebarCollapsed}
          onClick={() => setActivePage('compose')}
        />
        <NavItem 
          icon={<History className="w-5 h-5" />} 
          label="Lịch Sử" 
          active={activePage === 'history'} 
          collapsed={sidebarCollapsed}
          onClick={() => setActivePage('history')}
          badge={history.length > 0 ? history.length : undefined}
        />
        <NavItem 
          icon={<Layout className="w-5 h-5" />} 
          label="Mẫu Thông Báo" 
          active={activePage === 'templates'} 
          collapsed={sidebarCollapsed}
          onClick={() => setActivePage('templates')}
        />
        <NavItem 
          icon={<BarChart3 className="w-5 h-5" />} 
          label="Phân Tích" 
          active={activePage === 'analytics'} 
          collapsed={sidebarCollapsed}
          onClick={() => setActivePage('analytics')}
        />
        <div className="pt-4 pb-2">
          {!sidebarCollapsed && <span className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Cấu hình</span>}
        </div>
        <NavItem 
          icon={<Settings className="w-5 h-5" />} 
          label="Cài Đặt" 
          active={activePage === 'settings'} 
          collapsed={sidebarCollapsed}
          onClick={() => setActivePage('settings')}
        />
        <NavItem 
          icon={<LifeBuoy className="w-5 h-5" />} 
          label="Hướng Dẫn" 
          active={activePage === 'help'} 
          collapsed={sidebarCollapsed}
          onClick={() => setActivePage('help')}
        />
      </nav>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-slate-400 transition-colors"
        >
          <Menu className="w-5 h-5" />
          {!sidebarCollapsed && <span className="text-sm font-medium">Thu gọn</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {renderSidebar()}

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Canvas Effect (Simulated with CSS) */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/20 blur-[120px] rounded-full" />
        </div>

        {/* Topbar */}
        <header className="h-16 border-b border-white/5 bg-bg/80 backdrop-blur-xl flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>NotifyPro</span>
            <ChevronRight className="w-4 h-4 opacity-30" />
            <span className="text-slate-200 font-semibold">
              {activePage === 'compose' ? 'Soạn Thông Báo' : 
               activePage === 'history' ? 'Lịch Sử' : 
               activePage === 'templates' ? 'Thư Viện Mẫu' : 
               activePage === 'analytics' ? 'Phân Tích' : 'Cài Đặt'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-bg notif-dot" />
              </button>
            </div>
            <div className="h-8 w-[1px] bg-white/5" />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white">NotifyPro User</p>
                <p className="text-[10px] text-slate-500">Enterprise Plan</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-violet-500/20">
                NP
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 z-10">
          <AnimatePresence mode="wait">
            {activePage === 'compose' && (
              <motion.div 
                key="compose"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="font-display text-3xl font-extrabold text-white">Soạn Thông Báo</h2>
                    <p className="text-slate-400 mt-1">Tạo thông báo chuyên nghiệp với AI trong vài giây</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={clearForm} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-300 font-semibold text-sm hover:bg-white/10 transition-all">
                      Xóa form
                    </button>
                    <button onClick={generateNotification} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Tạo nhanh
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Form Section */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card icon={<Zap className="w-5 h-5" />} title="Thông Tin Tình Huống" subtitle="Mô tả chi tiết sự cố hoặc cập nhật dịch vụ">
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tiêu Đề / Chủ Đề <span className="text-rose-500">*</span></label>
                          <input 
                            type="text" 
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="VD: Bảo trì hệ thống thanh toán định kỳ"
                            className="w-full bg-bg2 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mô Tả Chi Tiết Tình Huống <span className="text-rose-500">*</span></label>
                          <textarea 
                            value={situation}
                            onChange={(e) => setSituation(e.target.value)}
                            rows={5}
                            placeholder="Mô tả rõ: vấn đề gì đang xảy ra, nguyên nhân, phạm vi ảnh hưởng..."
                            className="w-full bg-bg2 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                          />
                          <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                            <div className="flex-1 h-1 bg-white/5 rounded-full mr-4 overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${Math.min(situation.length / 500 * 100, 100)}%` }} />
                            </div>
                            <span>{situation.length} / 500</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thời Gian Bắt Đầu</label>
                            <input 
                              type="text" 
                              value={timeStart}
                              onChange={(e) => setTimeStart(e.target.value)}
                              placeholder="VD: 23:00 ngày 15/06"
                              className="w-full bg-bg2 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thời Gian Kết Thúc</label>
                            <input 
                              type="text" 
                              value={timeEnd}
                              onChange={(e) => setTimeEnd(e.target.value)}
                              placeholder="VD: 01:00 ngày 16/06"
                              className="w-full bg-bg2 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hành Động Yêu Cầu</label>
                          <input 
                            type="text" 
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            placeholder="VD: Đặt lại mật khẩu, liên hệ hotline..."
                            className="w-full bg-bg2 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thẻ / Tags</label>
                          <div className="flex flex-wrap gap-2 p-2 bg-bg2 border border-white/5 rounded-xl min-h-[46px]">
                            {tags.map(tag => (
                              <span key={tag} className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                #{tag}
                                <button onClick={() => removeTag(tag)} className="hover:text-white"><X className="w-3 h-3" /></button>
                              </span>
                            ))}
                            <input 
                              type="text"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={handleAddTag}
                              placeholder="thêm tag..."
                              className="bg-transparent border-none outline-none text-sm flex-1 min-w-[80px]"
                            />
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card icon={<ShieldAlert className="w-5 h-5" />} title="Mức Độ & Kênh Phân Phối" subtitle="Chọn mức khẩn cấp và kênh thông báo">
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mức Độ Khẩn Cấp</label>
                          <div className="grid grid-cols-3 gap-3">
                            <UrgencyPill 
                              type="low" 
                              active={urgency === 'low'} 
                              onClick={() => setUrgency('low')} 
                              label="Thấp" 
                              desc="Thông tin, cập nhật nhỏ" 
                              icon="🟢"
                            />
                            <UrgencyPill 
                              type="medium" 
                              active={urgency === 'medium'} 
                              onClick={() => setUrgency('medium')} 
                              label="Trung Bình" 
                              desc="Ảnh hưởng một phần" 
                              icon="🟡"
                            />
                            <UrgencyPill 
                              type="high" 
                              active={urgency === 'high'} 
                              onClick={() => setUrgency('high')} 
                              label="Khẩn Cấp" 
                              desc="Gián đoạn nghiêm trọng" 
                              icon="🔴"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kênh Thông Báo</label>
                          <div className="grid grid-cols-3 gap-3">
                            <ChannelPill icon={<Mail />} label="Email" active={channel === 'email'} onClick={() => setChannel('email')} />
                            <ChannelPill icon={<MessageSquare />} label="SMS" active={channel === 'sms'} onClick={() => setChannel('sms')} />
                            <ChannelPill icon={<Smartphone />} label="In-App" active={channel === 'app'} onClick={() => setChannel('app')} />
                            <ChannelPill icon={<Bell />} label="Push" active={channel === 'push'} onClick={() => setChannel('push')} />
                            <ChannelPill icon={<MessageSquare />} label="Zalo" active={channel === 'zalo'} onClick={() => setChannel('zalo')} />
                            <ChannelPill icon={<Layout />} label="Banner" active={channel === 'banner'} onClick={() => setChannel('banner')} />
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card icon={<Settings className="w-5 h-5" />} title="Tùy Chọn Nâng Cao" subtitle="Điều chỉnh giọng điệu và phong cách">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ngôn Ngữ</label>
                          <select 
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as Language)}
                            className="w-full bg-bg2 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                          >
                            <option value="vi">🇻🇳 Tiếng Việt</option>
                            <option value="en">🇺🇸 English</option>
                            <option value="both">🔀 Song ngữ Vi + En</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Giọng Điệu</label>
                          <select 
                            value={tone}
                            onChange={(e) => setTone(e.target.value as Tone)}
                            className="w-full bg-bg2 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                          >
                            <option value="professional">💼 Chuyên nghiệp</option>
                            <option value="friendly">😊 Thân thiện</option>
                            <option value="formal">🏛️ Trang trọng</option>
                            <option value="concise">⚡ Cực ngắn gọn</option>
                            <option value="empathetic">🤝 Thông cảm</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Loại Thông Báo</label>
                          <select 
                            value={notifType}
                            onChange={(e) => setNotifType(e.target.value as NotifType)}
                            className="w-full bg-bg2 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                          >
                            <option value="maintenance">🔧 Bảo trì hệ thống</option>
                            <option value="incident">🚨 Sự cố kỹ thuật</option>
                            <option value="update">✨ Cập nhật tính năng</option>
                            <option value="payment">💳 Lỗi thanh toán</option>
                            <option value="security">🔒 Bảo mật</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thương Hiệu</label>
                          <input 
                            type="text" 
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder="Tên công ty của bạn"
                            className="w-full bg-bg2 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                      </div>
                    </Card>

                    <button 
                      onClick={generateNotification}
                      disabled={isGenerating}
                      className="w-full py-5 bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl font-display text-lg font-bold text-white shadow-xl shadow-blue-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          Đang soạn thảo...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6" />
                          Tạo Thông Báo
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sidebar Section */}
                  <div className="space-y-6">
                    <Card icon={<Layout className="w-5 h-5" />} title="Mẫu Nhanh" subtitle="Click để điền tự động">
                      <div className="space-y-2">
                        {TEMPLATES.map(t => (
                          <button 
                            key={t.id} 
                            onClick={() => loadTemplate(t)}
                            className="w-full p-4 bg-bg2 border border-white/5 rounded-xl flex items-start gap-3 hover:border-blue-500/30 hover:bg-white/5 transition-all text-left"
                          >
                            <span className="text-xl">{t.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white">{t.name}</p>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{t.situation}</p>
                              <div className="flex gap-2 mt-2">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${t.urgency === 'high' ? 'bg-rose-500/10 text-rose-500' : t.urgency === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                  {t.urgency}
                                </span>
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-blue-500/10 text-blue-500">
                                  {t.channel}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-600 mt-1" />
                          </button>
                        ))}
                      </div>
                    </Card>

                    <Card icon={<Info className="w-5 h-5" />} title="Mẹo Viết" subtitle="Để thông báo hiệu quả hơn">
                      <div className="space-y-4">
                        <Tip icon="📏" text="SMS: Giữ dưới 160 ký tự, chỉ thông tin cốt lõi." />
                        <Tip icon="🎯" text="Luôn có Call-to-Action rõ ràng, cụ thể." />
                        <Tip icon="⏰" text="Ghi rõ thời gian bắt đầu và kết thúc." />
                        <Tip icon="🤝" text="Thể hiện sự xin lỗi và đồng cảm." />
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Result Section */}
                {showResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        Kết Quả Tạo Ra
                      </h3>
                      <div className="flex gap-2">
                        <button onClick={() => copyToClipboard(generatedMessage)} className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors">
                          <Copy className="w-5 h-5" />
                        </button>
                        <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-surface border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                      <pre className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                        {generatedMessage}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activePage === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="font-display text-3xl font-extrabold text-white">Lịch Sử Thông Báo</h2>
                    <p className="text-slate-400 mt-1">Xem lại và tái sử dụng các thông báo đã tạo</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm..." 
                        className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all w-64"
                      />
                    </div>
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-600">
                      <History className="w-10 h-10" />
                    </div>
                    <p className="text-slate-500 font-medium">Chưa có lịch sử thông báo nào.</p>
                    <button onClick={() => setActivePage('compose')} className="text-blue-500 font-bold text-sm hover:underline">Tạo thông báo ngay</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {history.map(item => (
                      <HistoryCard 
                        key={item.id} 
                        item={item} 
                        onLoad={() => loadHistoryItem(item)} 
                        onDelete={() => deleteHistoryItem(item.id)}
                        onCopy={() => copyToClipboard(item.message)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activePage === 'templates' && (
              <motion.div 
                key="templates"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                <div>
                  <h2 className="font-display text-3xl font-extrabold text-white">Thư Viện Mẫu</h2>
                  <p className="text-slate-400 mt-1">Bộ sưu tập mẫu thông báo chuyên nghiệp theo ngành</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {TEMPLATES.map(t => (
                    <div key={t.id} className="bg-surface border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all group">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl">
                          {t.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{t.name}</h3>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.category}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-3 mb-6 leading-relaxed">
                        {t.situation}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 uppercase">{t.channel}</span>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${t.urgency === 'high' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>{t.urgency}</span>
                        </div>
                        <button onClick={() => loadTemplate(t)} className="text-blue-500 group-hover:translate-x-1 transition-transform">
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="bg-surface border border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-slate-500 hover:border-blue-500/30 hover:text-blue-500 transition-all cursor-pointer">
                    <Plus className="w-8 h-8" />
                    <span className="text-sm font-bold">Thêm mẫu mới</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toast Container */}
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
          <AnimatePresence>
            {toasts.map(toast => (
              <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
            ))}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- Sub-components ---

function NavItem({ icon, label, active, collapsed, onClick, badge }: { icon: React.ReactNode, label: string, active?: boolean, collapsed?: boolean, onClick: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all relative group ${active ? 'bg-blue-500/10 text-blue-500' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
      <div className={`${active ? 'filter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''}`}>
        {icon}
      </div>
      {!collapsed && <span className="text-sm font-semibold flex-1 text-left">{label}</span>}
      {!collapsed && badge !== undefined && (
        <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {badge}
        </span>
      )}
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />}
      {collapsed && (
        <div className="absolute left-full ml-4 px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {label}
        </div>
      )}
    </button>
  );
}

function Card({ icon, title, subtitle, children }: { icon: React.ReactNode, title: string, subtitle: string, children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-5 border-b border-white/5 flex items-center gap-4 bg-white/[0.02]">
        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-[10px] text-slate-500 font-medium">{subtitle}</p>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function UrgencyPill({ type, active, onClick, label, desc, icon }: { type: Urgency, active: boolean, onClick: () => void, label: string, desc: string, icon: string }) {
  const colors = {
    low: active ? 'border-emerald-500 bg-emerald-500/10 shadow-emerald-500/10' : 'border-white/5 bg-bg2',
    medium: active ? 'border-amber-500 bg-amber-500/10 shadow-amber-500/10' : 'border-white/5 bg-bg2',
    high: active ? 'border-rose-500 bg-rose-500/10 shadow-rose-500/10' : 'border-white/5 bg-bg2'
  };

  const textColors = {
    low: active ? 'text-emerald-500' : 'text-white',
    medium: active ? 'text-amber-500' : 'text-white',
    high: active ? 'text-rose-500' : 'text-white'
  };

  return (
    <button 
      onClick={onClick}
      className={`p-4 border-2 rounded-2xl text-center transition-all duration-300 ${colors[type]} ${active ? 'shadow-xl scale-[1.02]' : 'hover:border-white/10'}`}
    >
      <span className="text-2xl block mb-2 transition-transform duration-300 group-hover:scale-110">{icon}</span>
      <span className={`text-xs font-bold block ${textColors[type]}`}>{label}</span>
      <span className="text-[9px] text-slate-500 block mt-1 leading-tight">{desc}</span>
    </button>
  );
}

function ChannelPill({ icon, label, active, onClick }: { icon: React.ReactElement, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${active ? 'border-blue-500 bg-blue-500/10 text-blue-500 shadow-lg shadow-blue-500/10 scale-[1.02]' : 'border-white/5 bg-bg2 text-slate-400 hover:border-white/10 hover:text-slate-200'}`}
    >
      {React.cloneElement(icon, { className: 'w-6 h-6' })}
      <span className="text-[11px] font-bold">{label}</span>
    </button>
  );
}

function Tip({ icon, text }: { icon: string, text: string }) {
  return (
    <div className="flex gap-3 items-start p-3 rounded-xl bg-white/5 border border-white/5">
      <span className="text-lg flex-shrink-0">{icon}</span>
      <p className="text-[11px] text-slate-400 leading-relaxed">{text}</p>
    </div>
  );
}

interface HistoryCardProps {
  item: NotificationEntry;
  onLoad: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

const HistoryCard: React.FC<HistoryCardProps> = ({ item, onLoad, onDelete, onCopy }) => {
  const urgencyColors = {
    low: 'bg-emerald-500',
    medium: 'bg-amber-500',
    high: 'bg-rose-500'
  };

  return (
    <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all group flex flex-col">
      <div className={`h-1 ${urgencyColors[item.urgency]}`} />
      <div className="p-5 flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase ${item.urgency === 'high' ? 'bg-rose-500/10 text-rose-500' : item.urgency === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              {item.urgency}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase bg-blue-500/10 text-blue-500">
              {item.channel}
            </span>
          </div>
          <span className="text-[10px] text-slate-600 font-medium">
            {new Date(item.timestamp).toLocaleDateString('vi-VN')}
          </span>
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white line-clamp-1">{item.subject || 'Không có tiêu đề'}</h4>
          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
            {item.message}
          </p>
        </div>
      </div>
      <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
        <button onClick={onLoad} className="text-[11px] font-bold text-blue-500 hover:text-blue-400">Tải lại</button>
        <div className="flex gap-2">
          <button onClick={onCopy} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-rose-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
