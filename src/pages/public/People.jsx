// The people of মাঠের মানুষ, one at a time on a studio stage, the way an open-world game shows its characters: a big
// slanted name, where they farm and what threatens it, what they wear, and their child. From here, play the
// grown-ups' game or the child's dream. Stage: game/three/characterStage.js; people: game/regions.js and dream.js.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Gamepad2, Sparkles, CloudLightning, MapPin, Shirt, UserRound } from 'lucide-react';
import { useStore } from '../../store';
import { REGIONS } from '../../game/regions';
import { CHILDREN, CHILD_IDS } from '../../game/dream';
import { bnDigits, num } from '../../engine/dates';

export default function People() {
  const { T, L, s } = useStore();
  const host = useRef(null), stage = useRef(null);
  const [i, setI] = useState(0);
  const [ready, setReady] = useState(false);
  const [stageError, setStageError] = useState(false);
  const id = CHILD_IDS[i], r = REGIONS[id], kid = CHILDREN[id], f = r.farmer;

  useEffect(() => {
    let alive = true, st = null;
    import('../../game/three/characterStage').then(({ createCharacterStage }) => {
      if (!alive) return;
      st = stage.current = createCharacterStage(host.current);
      setReady(true);
    }).catch(() => { if (alive) setStageError(true); });
    return () => { alive = false; st?.dispose(); stage.current = null; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    import('../../game/three/dreamScene').then(({ bodyFor, kidBody }) => stage.current?.show(bodyFor(id, r), kidBody(kid, r)));
  }, [ready, id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'ArrowRight') setI((x) => (x + 1) % CHILD_IDS.length); if (e.key === 'ArrowLeft') setI((x) => (x - 1 + CHILD_IDS.length) % CHILD_IDS.length); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const go = (d) => setI((x) => (x + d + CHILD_IDS.length) % CHILD_IDS.length);

  return (
    <div className="fixed inset-0 z-[70] bg-[#0d1712] text-white">
      <div ref={host} className="absolute inset-0" />
      {stageError && <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 pb-40 pt-24 text-center" role="status" aria-live="polite">
        <div className="max-w-sm rounded-3xl border border-white/15 bg-black/45 p-6 backdrop-blur-sm">
          <UserRound size={56} className="mx-auto mb-3 text-white/80" aria-hidden="true" />
          <p className="text-[15px] leading-6 text-white/90">{T('৩ডি চরিত্রটি লোড করা যায়নি। নাম, এলাকা ও পোশাকের তথ্য নিচে আছে।', 'The 3D character could not be loaded. Their name, place and clothing details are still shown below.')}</p>
        </div>
      </div>}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,transparent_35%,rgba(0,0,0,.55)_100%)]" />
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <div className="pointer-events-auto flex items-center gap-2 p-3">
          <Link to="/games" className="grid h-11 w-11 place-items-center rounded-full bg-white/15 backdrop-blur" aria-label={T('খেলাগুলোয় ফিরুন', 'Back to the games')}><ArrowLeft size={20} /></Link>
          <span className="rounded-full bg-white/15 px-4 py-2 text-[14px] font-semibold backdrop-blur">{T('মাঠের মানুষেরা', 'The people of the fields')} · {num(i + 1, s.lang)}/{num(CHILD_IDS.length, s.lang)}</span>
        </div>

        {/* the name, big and slanted, with who they are */}
        <div className="mt-2 max-w-[560px] px-5 sm:mt-10 sm:px-10">
          <p className="text-[13px] font-bold tracking-[.04em] text-[#8be08a]">{r.flag ?? '🇧🇩'} {L(r.place)}</p>
          <h1 key={id} className="hero-rise mt-1 -skew-x-6 text-[44px] font-black uppercase leading-[.95] tracking-tight [text-shadow:0_4px_0_#000,0_0_24px_rgba(0,0,0,.6)] sm:text-[72px]" style={{ WebkitTextStroke: '1.5px #000' }}>{T(f.bn, f.en)}</h1>
          <p className="mt-1 text-[22px] font-bold text-white/90 sm:text-[26px]">{T(`${f.bn}, ${bnDigits(f.age)} বছর`, `${f.en}, ${num(f.age, 'en')} years old`)}</p>
          {f.trait && <p className="mt-1 text-[15px] text-white/75">{L(f.trait)}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-[14px] text-white/85 sm:hidden"><CloudLightning size={15} className="text-amber-300" />{L(r.storm)}</p>
          <ul className="mt-4 hidden space-y-1.5 text-[14px] text-white/85 sm:block">
            <li className="flex items-start gap-2"><CloudLightning size={16} className="mt-0.5 shrink-0 text-amber-300" />{L(r.storm)}</li>
            {r.place.area && <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-sky-300" />{L(r.place.area)}</li>}
            {f.dress?.length > 0 && <li className="flex items-start gap-2"><Shirt size={16} className="mt-0.5 shrink-0 text-pink-300" />{f.dress.map((d) => L(d)).join(' · ')}</li>}
            <li className="flex items-start gap-2"><Sparkles size={16} className="mt-0.5 shrink-0 text-yellow-300" />{T(`পাশে ${kid.name.bn}, ${kid.rel.bn}`, `Beside: ${kid.name.en}, ${kid.rel.en}`)}</li>
          </ul>
        </div>

        <div className="pointer-events-auto mt-auto p-3 sm:p-5">
          <div className="mx-auto flex max-w-[980px] flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => go(-1)} className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25" aria-label={T('আগের জন', 'Previous')}><ArrowLeft size={22} /></button>
            <Link to="/farm" className="flex h-12 items-center gap-2 rounded-full bg-[#2f6e2f] px-5 text-[16px] font-bold shadow-lg hover:bg-[#3b833b]"><Gamepad2 size={19} />{T(`${f.bn} হয়ে খেলুন`, `Play as ${f.en}`)}</Link>
            <Link to={`/kids?who=${id}`} className="flex h-12 items-center gap-2 rounded-full bg-[#e2b84a] px-5 text-[16px] font-bold text-[#1b2620] shadow-lg hover:bg-[#ecc860]"><Sparkles size={19} />{T(`${kid.name.bn}র স্বপ্ন`, `${kid.name.en}’s dream`)}</Link>
            <button type="button" onClick={() => go(1)} className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25" aria-label={T('পরের জন', 'Next')}><ArrowRight size={22} /></button>
          </div>
          <ol className="hide-scrollbar mx-auto mt-3 flex max-w-[980px] gap-1.5 overflow-x-auto pb-1" aria-label={T('সব মানুষ', 'Everyone')}>
            {CHILD_IDS.map((x, k) => (
              <li key={x} className="shrink-0">
                <button type="button" onClick={() => setI(k)} aria-current={k === i ? 'true' : undefined}
                  className={`min-h-11 rounded-full px-3.5 py-2 text-[13px] font-semibold backdrop-blur transition ${k === i ? 'bg-white text-[#1b2620]' : 'bg-white/12 text-white/80 hover:bg-white/25'}`}>
                  {REGIONS[x].flag ?? '🇧🇩'} {REGIONS[x].farmer.bn}
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-center text-[11.5px] text-white/50">{T('মানুষগুলো বানানো চরিত্র; দেহের 3D মডেল Quaternius-এর (CC0)।', 'The people are made-up characters; 3D bodies by Quaternius (CC0).')}</p>
        </div>
      </div>
    </div>
  );
}
