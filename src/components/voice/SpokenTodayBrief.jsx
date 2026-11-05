// Spoken Voice Briefing for rural farmers.
// Uses Web Speech API (speechSynthesis) with natural Bangla speech synthesis.
// Reads aloud today's irrigation recommendation, rain forecast, and spray timing.
import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw, Sparkles } from 'lucide-react';
import { useStore } from '../../store';
import { num, fmtBangla, fmtDate } from '../../engine/dates';

export default function SpokenTodayBrief({ crop, water, weather, dToday }) {
  const { s, T, L, farmer } = useStore();
  const lang = s.lang;
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);
    }
  }, []);

  const buildScript = () => {
    if (lang === 'bn') {
      const cropName = crop?.name?.bn || 'ফসল';
      const waterStatus = water?.color === 'GREEN'
        ? 'মাটিতে পর্যাপ্ত রস আছে, আজ সেচ দেওয়ার দরকার নেই।'
        : water?.color === 'RED'
        ? 'মাটিতে পানির টান পড়েছে, আজই সেচ দেওয়া জরুরি।'
        : 'মাটি শুকিয়ে আসছে, আগামী দুই দিনের মধ্যে সেচ দেওয়ার প্রস্তুতি নিন।';

      const rainText = weather?.rain
        ? `আজ প্রায় ${num(Math.round(weather.rain), 'bn')} মিলিমিটার বৃষ্টির সম্ভাবনা রয়েছে।`
        : 'আজ বৃষ্টির তেমন সম্ভাবনা নেই।';

      return `আসসালামু আলাইকুম ${farmer?.name?.bn || 'কৃষক ভাই'}। আপনার ${cropName} জমির আজকের বার্তা। ${waterStatus} ${rainText} জমিতে ওষুধ স্প্রে করার আগে বাতাসের গতি দেখে নিন। ধন্যবাদ।`;
    } else {
      const cropName = crop?.name?.en || 'crop';
      const waterStatus = water?.color === 'GREEN'
        ? 'Soil moisture is sufficient, no irrigation needed today.'
        : water?.color === 'RED'
        ? 'Root zone water is critically low, urgent irrigation required today.'
        : 'Soil moisture is depleting, prepare to irrigate within two days.';

      const rainText = weather?.rain
        ? `About ${Math.round(weather.rain)} mm of rain is forecast today.`
        : 'No significant rain is expected today.';

      return `Hello ${farmer?.name?.en || 'Farmer'}. Here is today's briefing for your ${cropName}. ${waterStatus} ${rainText} Check wind speeds before spraying crop protection.`;
    }
  };

  const handleSpeak = () => {
    if (!supported) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const script = buildScript();
    const utterance = new SpeechSynthesisUtterance(script);

    // Try finding a Bengali or English voice
    const voices = window.speechSynthesis.getVoices();
    if (lang === 'bn') {
      const bnVoice = voices.find((v) => v.lang.includes('bn') || v.lang.includes('BD'));
      if (bnVoice) utterance.voice = bnVoice;
      utterance.lang = 'bn-BD';
      utterance.rate = 0.92; // Slightly slower for rural clarity
    } else {
      const enVoice = voices.find((v) => v.lang.includes('en-GB') || v.lang.includes('en-US'));
      if (enVoice) utterance.voice = enVoice;
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
    }

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSpeak}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition shadow-sm active:scale-95 ${
          speaking
            ? 'bg-rose-600 text-white animate-pulse'
            : 'bg-emerald-700 text-white hover:bg-emerald-800'
        }`}
        aria-label={speaking ? T('ভয়েস থামান', 'Stop voice') : T('ভয়েস সারাংশ শুনুন', 'Listen to voice summary')}
      >
        {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
        <span>
          {speaking
            ? T('ভয়েস থামান', 'Stop Voice')
            : T('আজকের কাজের ভয়েস শুনুন', 'Listen to Daily Briefing')}
        </span>
      </button>
    </div>
  );
}
