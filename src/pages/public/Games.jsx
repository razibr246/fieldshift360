// The games hub: two ways to learn FieldShift by playing.
import { Link } from 'react-router-dom';
import { Swords, Sprout, ArrowRight, BookOpen, Gamepad2, MapPinned, Check, Trophy, Sparkles, Users, Droplets, Bug, CloudLightning, Coins } from 'lucide-react';
import Photo from '../../components/Photo';
import { useStore } from '../../store';
import BiomechanicsLab from '../../components/game/BiomechanicsLab';

export default function Games() {
  const { T } = useStore();
  const games = [
    { to: '/stories', icon: MapPinned, photo: 'droughtFlood', badge: T('৭ স্তর', '7 levels'), title: T('সাত বিভাগ, সাত কৃষক', 'Seven divisions, seven farmers'), kind: T('মিশনের খেলা · আসল নাসা আবহাওয়ায়', 'Mission game · on real NASA weather'),
      text: T('সিলেটের পাহাড়ি ঢল, খুলনার লবণ, বরিশালের জোয়ার, রংপুরের কুয়াশা-ব্লাইট, চট্টগ্রামের মেঘভাঙা বৃষ্টি। আপনার সিদ্ধান্ত চলে সেই এলাকার একটি আসল পুরোনো বছরে।', 'Sylhet’s flash floods, Khulna’s salt, Barishal’s tides, Rangpur’s fog and blight, Chattogram’s cloudbursts. Your choices are played through a real past year of that place.') },
    { to: '/farm', icon: Gamepad2, photo: 'farmGame', badge: T('নতুন', 'New'), title: T('মাঠের মানুষ', 'Field Folk'), kind: T('বড়দের 3D খামারের খেলা · ১২টি নমুনা চরিত্র', '3D farm game for grown-ups · 12 sample characters'),
      text: T('বাংলাদেশের সাত বিভাগ আর প্রতিবেশী পাঁচ দেশের ১২টি নমুনা চরিত্রের একজন বেছে নিন। নিজের এলাকার আদলে বানানো মাঠে গরম, পোকা, ঝড় আর বাজারের চ্যালেঞ্জ সামলে মৌসুম পার করুন।', 'Choose one of 12 sample farmers from Bangladesh and five neighbouring countries. Face heat, pests, storms and market challenges on a field inspired by their region.') },
    { to: '/kids', icon: Sparkles, photo: 'heroDawn', badge: T('ছোটদের', 'For children'), title: T('স্বপ্নের মাঠ', 'The Dream Field'), kind: T('ছোটদের 3D স্বপ্ন · VR আর AR-এ', 'A 3D dream for children · in VR and AR'),
      text: T('কৃষক বাবা-মায়ের চিন্তা শুনে ঘুমিয়ে পড়া শিশু স্বপ্নে নাসার উপগ্রহ "তারা"-র সঙ্গে আকাশে ওড়ে: মেঘ ধরে, খালি মাটিতে সবুজ কম্বল দেয়, ঠিক মাপে পানি দেয়, আর দুই দরজা পেরিয়ে দেখে আগে জানলে কী বদলায়। হাসি, কান্না আর সকালের আনন্দ।', 'A child falls asleep hearing the family worry, and in a dream flies with Tara, a NASA satellite: catching clouds, giving bare soil a green blanket, watering just right, and walking through two doors to see what changes when you know in time. Laughter, tears and a happy morning.') },
    { to: '/people', icon: Users, photo: 'farmer', badge: T('3D', '3D'), title: T('মাঠের মানুষেরা', 'Meet the people'), kind: T('বারোজন কৃষক আর তাঁদের সন্তান', 'Twelve farmers and their children'),
      text: T('প্রত্যেক কৃষক নিজের পোশাকে, নিজের সন্তানের পাশে, মঞ্চের আলোয়: কোথায় চাষ করেন, কোন ঝড়ের ভয়। এখান থেকেই বড়দের খেলা বা শিশুর স্বপ্ন শুরু করুন।', 'Each farmer in their own clothes, beside their own child, under stage lights: where they farm and which storm they fear. Start the grown-ups’ game or the child’s dream from here.') },
    { to: '/play', icon: Swords, photo: 'farmer', title: T('মাঠের লড়াই', 'Field Fight'), kind: T('গল্পের খেলা · ৬টি অধ্যায়', 'Story game · 6 chapters'),
      text: T('এক রবি মৌসুমের ছয়টি সত্যিকারের বিপদ। প্রতিবার বেছে নিন — আগের অভ্যাস, নাকি FieldShift-এর ঠিক হাতিয়ার।', 'Six real problems across one Rabi season. Each time choose — the old habit, or the right FieldShift tool.') },
  ];
  return (
    <div className="page-shell pb-24 pt-[110px] sm:pt-[124px]">
      <div className="hero-rise max-w-3xl">
        <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800"><BookOpen size={15} />{T('খেলে শিখুন', 'Learn by playing')}</p>
        <h1 className="mt-5 text-[44px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[62px]">
          <span className="block">{T('খেলতে খেলতে', 'Learn the field')}</span>
          <span className="block bg-[linear-gradient(100deg,#245a28_0%,#43863a_45%,#237479_100%)] bg-clip-text pb-2 text-transparent">{T('মাঠ চিনুন।', 'by playing.')}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[18px] leading-[1.65] text-ink/70">{T('পাঁচটি খেলা, একটাই শিক্ষা: বিপদ আসার আগে জানলে ফসল বাঁচে। খেলে দেখুন FieldShift কোন সমস্যায় কীভাবে পাশে থাকে।', 'Five games, one lesson: know before trouble arrives and the crop survives. Play and see how FieldShift helps with each problem.')}</p>
      </div>
      <ol className="mt-7 grid gap-2 sm:grid-cols-3" aria-label={T('খেলার ধাপ', 'How the games work')}>
        {[
          T('একটি গল্প বাছুন', 'Choose a story'),
          T('নিজের সিদ্ধান্ত নিন', 'Make your choices'),
          T('ফসলের ফল দেখুন', 'See the season outcome'),
        ].map((step, i) => (
          <li key={step} className="game-path-step relative flex items-center gap-3 rounded-2xl border border-primary-100 bg-white/75 px-4 py-3 shadow-sm" style={{ '--step': i }}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${i === 2 ? 'bg-paddy-100 text-paddy-700' : 'bg-primary-100 text-primary-800'}`}>
              {i === 2 ? <Trophy size={16} /> : i === 1 ? <Check size={16} /> : <MapPinned size={16} />}
            </span>
            <span className="text-[14px] font-semibold text-ink">{step}</span>
            {i < 2 && <ArrowRight size={15} className="ml-auto hidden text-primary-500 sm:block" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      {/* The story campaign, first: the biggest game here. */}
      <Link to="/saga" className="lift group relative isolate mt-10 flex min-h-[340px] items-end overflow-hidden rounded-[32px] bg-primary-950 text-white shadow-[var(--shadow-lift)]">
        <div className="absolute inset-0 -z-10 transition-transform duration-[1.4s] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"><Photo name="dhamraiBridge" fill sizes="100vw" decorative /></div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(8,20,12,.92)_0%,rgba(8,20,12,.6)_55%,rgba(8,20,12,.15)_100%)]" />
        <div className="max-w-2xl p-7 sm:p-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-paddy-300 px-3 py-1 text-[13px] font-bold text-primary-950"><BookOpen size={14} />{T('নতুন · গল্পের অভিযান · ৩D', 'New · story campaign · 3D')}</p>
          <p className="font-display mt-3 text-[34px] font-bold leading-tight sm:text-[48px]">{T('দশ বছরের উত্তরাধিকার', 'The Ten-Year Inheritance')}</p>
          <p className="mt-2 text-[16px] leading-7 text-white/85">{T('অসুস্থ বাবার দুই বিঘা জমি আর চল্লিশ বছরের পুরোনো খাতা এখন আপনার। ধামরাইয়ের তিনটি আসল নাসা-আবহাওয়ার মৌসুম, পরিবার আর গ্রামের কঠিন সিদ্ধান্ত, আর ২০৪৫ সালে আপনার মেয়ে পাবে যা আপনি রেখে যাবেন।', 'Your ailing father’s two bigha and forty-year-old notebook are yours now. Three seasons of Dhamrai’s real NASA weather, hard choices for family and village, and in 2045 your daughter inherits what you leave.')}</p>
          <span className="mt-4 inline-flex items-center gap-2 font-semibold text-paddy-300">{T('গল্প শুরু করুন', 'Begin the story')}<ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" /></span>
        </div>
      </Link>
      <section className="relative isolate mt-7 overflow-hidden rounded-[30px] bg-primary-950 text-white shadow-[var(--shadow-lift)]" aria-labelledby="field-folk-feature">
        <div className="absolute inset-0 -z-10 opacity-45"><Photo name="farmGame" fill sizes="100vw" decorative /></div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-950 via-primary-950/90 to-primary-950/45" />
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end lg:p-10">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-paddy-300 px-3 py-1 text-[13px] font-bold text-primary-950"><Gamepad2 size={15} />{T('৩D মৌসুমের সিমুলেশন', '3D season simulation')}</p>
            <h2 id="field-folk-feature" className="font-display mt-3 text-[30px] font-bold leading-tight sm:text-[40px]">{T('মাঠের মানুষ: সিদ্ধান্ত নিন, ফল দেখুন', 'Field Folk: make the call, live with the season')}</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-white/80">{T('নিজের এলাকার কৃষক বেছে নিয়ে বীজ কিনুন, জমি লাগান, পানি ও পোকা সামলান, সতর্কতা পেলে ফসল বাঁচান। শেষে আপনার ফসলচক্র আর শেখা বিষয়গুলোর হিসাব পাবেন।', 'Choose a farmer from their own region. Buy seed, plant plots, manage water and pests, and protect the crop when warnings arrive. Finish with a rotation summary and a review of what you learned.')}</p>
            <ul className="mt-4 grid gap-2 text-[13.5px] text-white/85 sm:grid-cols-2">
              {[[Droplets, T('পানি ভাগ করে ব্যবহার', 'Use limited water well')], [Bug, T('পোকা দেখে ব্যবস্থা', 'Respond to pest reports')], [CloudLightning, T('ঝড়ে নিরাপদ আশ্রয়', 'Reach shelter before storms')], [Coins, T('ফসল তুলে বাজারে বিক্রি', 'Harvest and sell at market')]].map(([Icon, text]) => <li key={text} className="flex items-center gap-2"><Icon size={16} className="shrink-0 text-paddy-300" />{text}</li>)}
            </ul>
            <p className="mt-4 text-[12.5px] text-white/70">{T('ফোনে: বাঁয়ের চাকা দিয়ে হাঁটুন, ডানে টেনে দেখুন, কাজের বোতাম চাপুন। কম্পিউটারে: WASD হাঁটা · E/F/Space কাজ।', 'Phone: move with the left stick, drag on the right to look, tap Act. Computer: WASD to move · E/F/Space to act.')}</p>
            <p className="mt-2 text-[12.5px] text-white/60">{T('শেখার সিমুলেশন: ফলন ও বাজারের টাকা বাস্তব পূর্বাভাস নয়।', 'Educational simulation: crop outcomes and market money are not real-world forecasts.')}</p>
          </div>
          <Link to="/farm" className="btn-gloss inline-flex items-center justify-center gap-2 self-start rounded-full px-6 py-3.5 font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[.98] lg:self-end">{T('মাঠে নামুন', 'Enter the field')}<ArrowRight size={18} /></Link>
        </div>
      </section>
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {games.map((g, n) => (
          <Link key={g.to} to={g.to} style={{ '--n': n }} className="tool-card tool-deal glass flat group overflow-hidden rounded-[28px] border border-white/80 shadow-md hover:shadow-2xl hover:border-primary-400/60 transition-all duration-300 bg-white/80 backdrop-blur-md">
            <div className="relative aspect-[16/9] overflow-hidden">
              <div className="absolute inset-0 transition-transform duration-[1.2s] ease-[var(--ease-smooth)] group-hover:scale-110"><Photo name={g.photo} fill sizes="(min-width: 768px) 600px, 100vw" decorative /></div>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,26,14,0)_30%,rgba(8,26,14,.8)_100%)]" />
              <span className="absolute bottom-4 left-5 grid h-14 w-14 place-items-center rounded-2xl bg-white/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_8px_20px_rgba(0,0,0,.3)] backdrop-blur-xl transition-all duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-primary-600/70"><g.icon size={26} /></span>
              {g.badge && <span className="absolute right-4 top-4 rounded-full bg-paddy-300 px-3 py-1 text-[13px] font-bold text-primary-950 shadow-md ring-1 ring-white/50">{g.badge}</span>}
            </div>
            <div className="p-6">
              <p className="text-[13px] font-semibold text-primary-700 tracking-tight">{g.kind}</p>
              <p className="font-display mt-1 text-[26px] font-bold tracking-tight text-ink group-hover:text-primary-800 transition-colors">{g.title}</p>
              <p className="mt-2 text-[15px] leading-7 text-ink/75">{g.text}</p>
              <span className="mt-4 inline-flex items-center gap-2 font-semibold text-primary-700 transition-colors group-hover:text-primary-800">{T('খেলুন', 'Play')}<ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1.5" /></span>
            </div>
          </Link>
        ))}
      </div>

      {/* 3D Biomechanical & Soil Ground Physics Lab */}
      <BiomechanicsLab />

      <p className="mt-8 flex items-center gap-2 text-[13.5px] text-muted"><Sprout size={15} />{T('খেলার টাকা আর সংখ্যা শেখানোর জন্য বানানো, আসল হিসাব নয়।', 'Money and numbers in the games are for learning, not real estimates.')}</p>
    </div>
  );
}
