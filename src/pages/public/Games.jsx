// The games hub: two ways to learn FieldShift by playing.
import { Link } from 'react-router-dom';
import { Swords, Sprout, ArrowRight, BookOpen, Gamepad2, MapPinned } from 'lucide-react';
import Photo from '../../components/Photo';
import { useStore } from '../../store';

export default function Games() {
  const { T } = useStore();
  const games = [
    { to: '/stories', icon: MapPinned, photo: 'droughtFlood', badge: T('৭ স্তর', '7 levels'), title: T('সাত বিভাগ, সাত কৃষক', 'Seven divisions, seven farmers'), kind: T('মিশনের খেলা · আসল নাসা আবহাওয়ায়', 'Mission game · on real NASA weather'),
      text: T('সিলেটের পাহাড়ি ঢল, খুলনার লবণ, বরিশালের জোয়ার, রংপুরের কুয়াশা-ব্লাইট, চট্টগ্রামের মেঘভাঙা বৃষ্টি। আপনার সিদ্ধান্ত চলে সেই এলাকার একটি আসল পুরোনো বছরে।', 'Sylhet’s flash floods, Khulna’s salt, Barishal’s tides, Rangpur’s fog and blight, Chattogram’s cloudbursts. Your choices are played through a real past year of that place.') },
    { to: '/farm', icon: Gamepad2, photo: 'landParcels', badge: T('নতুন', 'New'), title: T('মাঠের মানুষ', 'Field Folk'), kind: T('3D খামারের খেলা · ১২ জন কৃষক', '3D farm game · 12 farmers'),
      text: T('বাংলাদেশের সাত বিভাগ আর প্রতিবেশী পাঁচ দেশের বারোজন কৃষকের যেকোনো একজন হয়ে উপগ্রহ থেকে তাঁর নিজের মাঠে নামুন — নিজের পোশাক, নিজের ফসল, নিজের বিপদ। গরম, পোকা, ঝড়ের নিরাপদ বৃত্ত আর দাম পড়া পার করে মৌসুম জিতুন।', 'Be one of twelve farmers from Bangladesh’s seven divisions and five neighbouring countries and drop from orbit onto their own field — their clothes, their crops, their dangers. Win the season through heat, pests, the storm’s safe circle and the price crash.') },
    { to: '/play', icon: Swords, photo: 'droughtFlood', title: T('মাঠের লড়াই', 'Field Fight'), kind: T('গল্পের খেলা · ৬টি অধ্যায়', 'Story game · 6 chapters'),
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
        <p className="mt-3 max-w-2xl text-[18px] leading-[1.65] text-ink/70">{T('তিনটি খেলা, একটাই শিক্ষা: বিপদ আসার আগে জানলে ফসল বাঁচে। খেলে দেখুন FieldShift কোন সমস্যায় কীভাবে পাশে থাকে।', 'Three games, one lesson: know before trouble arrives and the crop survives. Play and see how FieldShift helps with each problem.')}</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {games.map((g, n) => (
          <Link key={g.to} to={g.to} style={{ '--n': n }} className="tool-card tool-deal glass flat group overflow-hidden rounded-[30px]">
            <div className="relative aspect-[16/9] overflow-hidden">
              <div className="absolute inset-0 transition-transform duration-[1.2s] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-110"><Photo name={g.photo} fill sizes="(min-width: 768px) 600px, 100vw" decorative /></div>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,26,14,0)_40%,rgba(8,26,14,.7)_100%)]" />
              <span className="absolute bottom-4 left-5 grid h-14 w-14 place-items-center rounded-2xl bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4)] backdrop-blur-xl transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110"><g.icon size={26} /></span>
              {g.badge && <span className="absolute right-4 top-4 rounded-full bg-paddy-300 px-3 py-1 text-[13px] font-bold text-primary-950 shadow">{g.badge}</span>}
            </div>
            <div className="p-6">
              <p className="text-[13px] font-semibold text-primary-700">{g.kind}</p>
              <p className="font-display mt-1 text-[28px] font-semibold tracking-[-0.025em]">{g.title}</p>
              <p className="mt-2 text-[15.5px] leading-7 text-ink/70">{g.text}</p>
              <span className="mt-4 inline-flex items-center gap-2 font-semibold text-primary-700">{T('খেলুন', 'Play')}<ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" /></span>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-8 flex items-center gap-2 text-[13.5px] text-muted"><Sprout size={15} />{T('খেলার টাকা আর সংখ্যা শেখানোর জন্য বানানো, আসল হিসাব নয়।', 'Money and numbers in the games are for learning, not real estimates.')}</p>
    </div>
  );
}
