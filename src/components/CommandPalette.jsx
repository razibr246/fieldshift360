import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Sprout,
  ShieldCheck,
  Gamepad2,
  Telescope,
  ScanLine,
  Droplets,
  MapPinned,
  Languages,
  Clapperboard,
  RotateCcw,
  Globe2,
  Wheat,
  Radar,
  LifeBuoy,
  HandCoins,
  MessageSquareText,
  Mic,
  UserRound,
  X,
  ArrowRight,
  Sparkles,
  Layers,
  BookOpen,
  Building2,
  Command,
} from 'lucide-react';
import { useStore, demo } from '../store';
import { LEVELS } from '../data/stories';
import { UPAZILAS } from '../data/upazilas';
import { ABROAD } from '../data/abroad';
import { startTour } from './tour/DemoTour';

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent('fs:open-palette'));
}

export default function CommandPalette() {
  const { s, dispatch, T, L, farmers, farmer: currentFarmer } = useStore();
  const lang = s.lang;
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Global keyboard shortcut: Cmd+K, Ctrl+K, or slash (/) outside inputs
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const isSlash = e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (isCmdK || isSlash) {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    const handleCustomOpen = () => setOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('fs:open-palette', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('fs:open-palette', handleCustomOpen);
    };
  }, [open]);

  // Focus input on open and reset selection
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close palette on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // All searchable commands and destinations
  const items = useMemo(() => {
    const list = [
      // ---- Applications & Hubs ----
      {
        id: 'hub-farmer',
        category: T('অ্যাপসমূহ', 'Applications'),
        icon: Sprout,
        title: T('কৃষকের সিদ্ধান্ত সেবা', 'Farmer Decision Suite'),
        sub: T('মৌসুমের পরিকল্পনা, পানির হিসাব, ও ফসলের ডাক্তার', 'Seasonal planning, field water balance, and crop doctor'),
        action: () => navigate('/farmer'),
        keywords: ['farmer', 'krishi', 'krisok', 'chash', 'plan', 'khet'],
      },
      {
        id: 'hub-officer',
        category: T('অ্যাপসমূহ', 'Applications'),
        icon: ShieldCheck,
        title: T('উপজেলা কৃষি কর্মকর্তা হাব', 'Agriculture Officer Hub'),
        sub: T('এলাকার সতর্কতা, অনুরোধ, মানচিত্র ও সার সরবরাহ', 'Area alerts, requests queue, area risk map, and supply'),
        action: () => navigate('/officer'),
        keywords: ['officer', 'dae', 'upazila', 'saao', 'uao', 'kormokorta'],
      },
      {
        id: 'hub-farm-game',
        category: T('অ্যাপসমূহ', 'Applications'),
        icon: Gamepad2,
        title: T('মাঠের মানুষ · ৩D খামার খেলা', 'Field Folk · 3D Farm Game'),
        sub: T('১২টি চরিত্রের ৩D বাস্তব সিমুলেশন ও আবহাওয়া চ্যালেঞ্জ', '3D living-world farm simulation with 12 characters'),
        action: () => navigate('/farm'),
        keywords: ['game', '3d', 'farm', 'khela', 'folk', 'play'],
      },
      {
        id: 'hub-saga',
        category: T('অ্যাপসমূহ', 'Applications'),
        icon: BookOpen,
        title: T('দশ বছরের উত্তরাধিকার · গল্পের ৩D অভিযান', 'Ten-Year Inheritance · 3D Story Campaign'),
        sub: T('ধামরাইয়ের আসল নাসা আবহাওয়ায় বাবার জমির তিন মৌসুম', 'Generational farm campaign through real NASA weather seasons'),
        action: () => navigate('/saga'),
        keywords: ['saga', 'story', 'inheritance', 'campaign', 'golpo'],
      },
      {
        id: 'hub-kids',
        category: T('অ্যাপসমূহ', 'Applications'),
        icon: Sparkles,
        title: T('স্বপ্নের মাঠ · ছোটদের ৩D স্বপ্ন (VR/AR)', 'The Dream Field · Kids 3D Journey (VR/AR)'),
        sub: T('শিশুর চোখে তারা উপগ্রহের সঙ্গে মেঘ ও মাটির স্বপ্ন', 'Peaceful, non-violent children’s farming dream with Tara satellite'),
        action: () => navigate('/kids'),
        keywords: ['kids', 'dream', 'children', 'vr', 'ar', 'chotoder'],
      },
      {
        id: 'hub-science',
        category: T('অ্যাপসমূহ', 'Applications'),
        icon: Layers,
        title: T('বিজ্ঞান, তথ্যসূত্র ও এআই মডেল', 'Science & Data Provenance'),
        sub: T('নাসা পাওয়ার, সয়েলগ্রিডস ২.০, বিএমডি স্টেশন ও এসআরডিআই ল্যাব', 'NASA POWER, SoilGrids 2.0, BMD normals, and SRDI lab data'),
        action: () => navigate('/science'),
        keywords: ['science', 'data', 'nasa', 'soilgrids', 'bmd', 'srdi', 'model'],
      },

      // ---- Farmer Suite Quick Actions ----
      {
        id: 'farmer-doctor',
        category: T('কৃষক সেবা', 'Farmer Tools'),
        icon: ScanLine,
        title: T('ফসলের ডাক্তার (AI ভিশন)', 'Crop Doctor (AI Vision)'),
        sub: T('পাতার ছবি তুলে অন-ডিভাইস ও ক্লাউড রোগবালাই পরীক্ষা', 'On-device and cloud visual diagnosis of plant leaves'),
        action: () => navigate('/farmer/doctor'),
        keywords: ['doctor', 'poka', 'rog', 'leaf', 'vision', 'ai', 'scan'],
      },
      {
        id: 'farmer-plan',
        category: T('কৃষক সেবা', 'Farmer Tools'),
        icon: Sprout,
        title: T('১০ বছরের ফসলচক্র পরিকল্পনা', '10-Year Crop Rotation Plan'),
        sub: T('এফএও-৫৬ পানি ও আইসিবিএম মাটির কার্বন মডেলিং', 'FAO-56 water balance and ICBM soil carbon optimizer'),
        action: () => navigate('/farmer/plan'),
        keywords: ['plan', 'rotation', 'crop', 'fasal', 'soil', 'carbon'],
      },
      {
        id: 'farmer-future',
        category: T('কৃষক সেবা', 'Farmer Tools'),
        icon: Telescope,
        title: T('জমির ভবিষ্যৎ (Field Future)', 'Field Future Projections'),
        sub: T('৪০টি জলবায়ু ভবিষ্যৎ ও মাটির স্বাস্থ্য পূর্বাভাস', '40-scenario climate ensemble and 10-year soil health forecast'),
        action: () => navigate('/farmer/future'),
        keywords: ['future', 'climate', 'ensemble', 'carbon', 'health'],
      },
      {
        id: 'farmer-today',
        category: T('কৃষক সেবা', 'Farmer Tools'),
        icon: Droplets,
        title: T('আজকের কাজ ও স্প্রে চেক', 'Today’s Work & Spray Check'),
        sub: T('লাইভ নাসা আবহাওয়া অনুযায়ী সেচ ও বালাইনাশকের পরামর্শ', 'Live NASA weather spray check and irrigation advisory'),
        action: () => navigate('/farmer/today'),
        keywords: ['today', 'spray', 'weather', 'irrigation', 'sech', 'kaj'],
      },
      {
        id: 'farmer-support',
        category: T('কৃষক সেবা', 'Farmer Tools'),
        icon: HandCoins,
        title: T('সরকারি সহায়তা ও ভর্তুকি', 'Government Subsidies & Support'),
        sub: T('আপনার জমির উপযোগী সরকারি বীজ, সার ও মেশিন প্রকল্প', 'Matched government agricultural subsidy programs and grants'),
        action: () => navigate('/farmer/support'),
        keywords: ['support', 'subsidy', 'grant', 'govt', 'bhortuki', 'sahajjo'],
      },
      {
        id: 'farmer-harvest',
        category: T('কৃষক সেবা', 'Farmer Tools'),
        icon: Wheat,
        title: T('ফসল তোলা ও হাটের বাজারদর', 'Harvest Timing & Haat Prices'),
        sub: T('ডিএএম বাজারদর ও ফসল কাটার অনুকূল সময়সূচি', 'DAM market prices, harvest windows, and glut risk'),
        action: () => navigate('/farmer/harvest'),
        keywords: ['harvest', 'market', 'price', 'haat', 'dam', 'bazar'],
      },

      // ---- Officer Quick Actions ----
      {
        id: 'officer-radar',
        category: T('কর্মকর্তা সেবা', 'Officer Tools'),
        icon: Radar,
        title: T('রোপণ রাডার (Ropon Radar)', 'Ropon Radar (Monsoon Onset)'),
        sub: T('নাসা আইমার্গ থেকে বর্ষার শুরু ও আমন বোনার দিনক্ষণ', 'NASA IMERG monsoon onset prediction and Aman hazard window'),
        action: () => navigate('/officer/radar'),
        keywords: ['radar', 'monsoon', 'rain', 'onset', 'imerg', 'aman'],
      },
      {
        id: 'officer-requests',
        category: T('কর্মকর্তা সেবা', 'Officer Tools'),
        icon: LifeBuoy,
        title: T('কৃষকের অনুরোধ ও উত্তর খসড়া', 'Farmer Requests & AI Drafts'),
        sub: T('চক্র এজেন্ট দ্বারা প্রস্তুত উত্তর ও কর্মকর্তার অনুমোদন', 'Chakra Agent AI assisted replies pending officer approval'),
        action: () => navigate('/officer/requests'),
        keywords: ['requests', 'reply', 'onurodh', 'chakra', 'agent'],
      },
      {
        id: 'officer-map',
        category: T('কর্মকর্তা সেবা', 'Officer Tools'),
        icon: MapPinned,
        title: T('এলাকার স্যাটেলাইট ঝুঁকি মানচিত্র', 'Area Satellite Risk Map'),
        sub: T('ইউনিয়ন ভিত্তিক ফসলের ঘনত্ব, রোগ বিস্তার ও বন্যা ঝুঁকি', 'Satellite risk mapping across union blocks and crop clusters'),
        action: () => navigate('/officer/map'),
        keywords: ['map', 'area', 'satellite', 'gis', 'union', 'risk'],
      },
      {
        id: 'officer-cyclone',
        category: T('কর্মকর্তা সেবা', 'Officer Tools'),
        icon: Radar,
        title: T('বঙ্গোপসাগর ঘূর্ণিঝড় ও জলোচ্ছ্বাস রাডার', 'Cyclone & Storm Surge Trajectory Radar'),
        sub: T('নাসা জিপিএম ও সেন্টিনেল-১ থেকে জরুরি ফসল কর্তন ও পোল্ডার লকডাউন', 'NASA GPM & Sentinel-1 emergency harvest and polder gate lockdown protocols'),
        action: () => navigate('/officer/radar'),
        keywords: ['cyclone', 'surge', 'jholochhas', 'ghurnijhor', 'radar', 'gpm', 'polder'],
      },
      {
        id: 'officer-loss-damage',
        category: T('কর্মকর্তা সেবা', 'Officer Tools'),
        icon: ShieldCheck,
        title: T('ইউএনএফসিসিসি ধারা ৮: জলবায়ু ক্ষতিপূরণ লেজার', 'UNFCCC Article 8 Loss & Damage Ledger'),
        sub: T('উপগ্রহ-যাচাইকৃত চরম আবহাওয়ার আর্থিক ক্ষতি নিরূপণ ও ক্ষতিপূরণ সনদ', 'Satellite-verified extreme climate disaster valuation and sovereign reparations claim dossier'),
        action: () => navigate('/officer/upazila'),
        keywords: ['unfccc', 'loss', 'damage', 'reparations', 'cop28', 'santiago', 'khotipuron'],
      },
      {
        id: 'officer-calls',
        category: T('কর্মকর্তা সেবা', 'Officer Tools'),
        icon: Mic,
        title: T('কৃষকের কথার নোট ও এআই প্রতিলিপি', 'Farmer Call Notes & AI Transcription'),
        sub: T('সম্মতিভিত্তিক অডিও রেকর্ড, জেমিনি প্রতিলিপি ও এসএইচএ-২৫৬ প্রমাণ সিল', 'Consent-first call recording, Gemini audio transcription, and SHA-256 evidence seal'),
        action: () => navigate('/officer/calls'),
        keywords: ['call', 'audio', 'transcribe', 'kothar note', 'gemini', 'sha256', 'evidence'],
      },

      // ---- Regional Abroad Hubs ----
      {
        id: 'abroad-in',
        category: T('আন্তর্জাতিক প্রতিবেশী', 'Regional Abroad'),
        icon: Globe2,
        title: 'India · Punjab (Harjinder Singh)',
        sub: T('পাঞ্জাবের গম ও ধান চক্র, ইআরএ৫ তথ্যসহ', 'Punjab wheat-paddy cycle with ERA5 normals and PM-Kisan'),
        action: () => navigate('/abroad/in'),
        keywords: ['india', 'punjab', 'bharat', 'harjinder'],
      },
      {
        id: 'abroad-pk',
        category: T('আন্তর্জাতিক প্রতিবেশী', 'Regional Abroad'),
        icon: Globe2,
        title: 'Pakistan · Sindh (Ghulam Nabi Chandio)',
        sub: T('সিন্ধুর তুলা ও গম চাষ, ক্যানাল সেচ ব্যবস্থা', 'Sindh cotton-wheat rotation, canal water and drought advisory'),
        action: () => navigate('/abroad/pk'),
        keywords: ['pakistan', 'sindh', 'ghulam'],
      },
      {
        id: 'abroad-np',
        category: T('আন্তর্জাতিক প্রতিবেশী', 'Regional Abroad'),
        icon: Globe2,
        title: 'Nepal · Terai (Rampyari Chaudhary)',
        sub: T('তরাই অঞ্চলের ধান ও মসুর চাষ, আকস্মিক বন্যা ঝুঁকি', 'Terai paddy-lentil farming with flash flood early warnings'),
        action: () => navigate('/abroad/np'),
        keywords: ['nepal', 'terai', 'rampyari'],
      },
      {
        id: 'abroad-bt',
        category: T('আন্তর্জাতিক প্রতিবেশী', 'Regional Abroad'),
        icon: Globe2,
        title: 'Bhutan · Punakha (Kinley Wangmo)',
        sub: T('পুনাখা উপত্যকার ধাপযুক্ত পাহাড়ি চাষ ও লাল ধান', 'Punakha terrace rice and organic mountain microclimate'),
        action: () => navigate('/abroad/bt'),
        keywords: ['bhutan', 'punakha', 'kinley'],
      },
      {
        id: 'abroad-mm',
        category: T('আন্তর্জাতিক প্রতিবেশী', 'Regional Abroad'),
        icon: Globe2,
        title: 'Myanmar · Mandalay (U Kyaw Win)',
        sub: T('শুষ্ক অঞ্চলের তিল ও ডাল চাষ, মৌসুমি খরা প্রস্তুতি', 'Dry zone sesame-pulse rotation and monsoon resilience'),
        action: () => navigate('/abroad/mm'),
        keywords: ['myanmar', 'burma', 'mandalay', 'kyaw'],
      },

      // ---- System Actions ----
      {
        id: 'action-lang',
        category: T('সিস্টেম ও পছন্দ', 'System & Preferences'),
        icon: Languages,
        title: lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন (Switch to Bangla)',
        sub: T('পুরো প্ল্যাটফর্মের ভাষা পরিবর্তন করুন', 'Toggle app language between Bangla and English'),
        action: () => dispatch({ type: 'set', patch: { lang: lang === 'bn' ? 'en' : 'bn' } }),
        keywords: ['language', 'bhasha', 'bangla', 'english', 'toggle'],
      },
      {
        id: 'action-tour',
        category: T('সিস্টেম ও পছন্দ', 'System & Preferences'),
        icon: Clapperboard,
        title: T('৩ মিনিটের ডেমো গল্প চালু করুন', 'Start 3-Minute Demo Tour'),
        sub: T('প্ল্যাটফর্মের মূল সুবিধাগুলোর পরিচিতিমূলক ট্যুর', 'Interactive guided walkthrough of the FieldShift ecosystem'),
        action: () => startTour(dispatch, navigate),
        keywords: ['tour', 'demo', 'help', 'walkthrough', 'guide'],
      },
      {
        id: 'action-switch-farmer',
        category: T('সিস্টেম ও পছন্দ', 'System & Preferences'),
        icon: UserRound,
        title: T('কৃষক পরিবর্তন করুন (লগইন)', 'Switch Farmer Profile'),
        sub: T('বাংলাদেশের সাত বিভাগের ১২ জন কৃষকের যেকোনো একজন বেছে নিন', 'Choose from 12 representative farmer profiles across divisions'),
        action: () => navigate('/login'),
        keywords: ['switch', 'login', 'farmer', 'profile', 'change'],
      },
    ];

    return list;
  }, [T, lang, navigate, dispatch]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items.slice(0, 8);
    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSub = item.sub.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchKw = item.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchSub || matchCat || matchKw;
    });
  }, [items, query]);

  // Handle arrow keys and Enter
  const handleKeyDownInList = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        setOpen(false);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-start justify-center bg-primary-950/50 p-4 pt-[10vh] backdrop-blur-md transition-opacity duration-200"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label={T('কমান্ড প্যালেট ও সার্চ', 'Command Palette & Search')}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/60 bg-white/95 shadow-[0_25px_65px_-12px_rgba(13,38,20,0.45)] backdrop-blur-xl transition-all duration-250 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownInList}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-border/80 px-4 py-3.5">
          <Search size={20} className="mr-3 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={T('যেকোনো পাতা, কৃষক, উপজেলা বা ফসল খুঁজুন... (যেমন: ডাক্তার, রাডার, ধান)', 'Search anything across FieldShift 360... (e.g. Doctor, Radar, Wheat)')}
            className="w-full bg-transparent text-[16px] font-medium text-ink outline-none placeholder:text-muted/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mr-2 grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-black/5"
              aria-label={T('মুছুন', 'Clear')}
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-canvas px-2 py-0.5 text-[11px] font-bold text-muted">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2 scroll-thin">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <Search size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-[15px] font-semibold">{T('কিছু পাওয়া যায়নি', 'No matching results found')}</p>
              <p className="mt-1 text-[13px] text-muted/80">{T('অন্য কোনো শব্দ দিয়ে চেষ্টা করুন', 'Try searching with different terms like "plan", "doctor", or "radar"')}</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.action();
                    setOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`group flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left transition-all duration-150 ${
                    isSelected ? 'bg-primary-50 text-ink' : 'text-ink/85 hover:bg-black/[0.03]'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 ${
                      isSelected ? 'bg-primary-600 text-white scale-105 shadow-sm' : 'bg-primary-100 text-primary-800'
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14.5px] font-bold">{item.title}</span>
                      <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10.5px] font-semibold text-muted">
                        {item.category}
                      </span>
                    </div>
                    <p className="truncate text-[12.5px] text-muted">{item.sub}</p>
                  </div>
                  <ArrowRight
                    size={16}
                    className={`text-primary-600 transition-transform duration-200 ${
                      isSelected ? 'translate-x-1 opacity-100' : 'opacity-0'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex flex-wrap items-center justify-between border-t border-border/70 bg-canvas/60 px-4 py-2 text-[12px] text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-white px-1.5 py-0.5 font-bold">↑</kbd>
              <kbd className="rounded border border-border bg-white px-1.5 py-0.5 font-bold">↓</kbd>
              <span className="ml-0.5">{T('নেভিগেট', 'navigate')}</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-white px-1.5 py-0.5 font-bold">↵</kbd>
              <span className="ml-0.5">{T('নির্বাচন', 'select')}</span>
            </span>
          </div>
          <span className="text-[11.5px] font-medium text-primary-800">
            FieldShift 360 Ecosystem
          </span>
        </div>
      </div>
    </div>
  );
}

