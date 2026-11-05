import { useState, useEffect, useRef } from 'react';
import { Activity, Dumbbell, Flame, Heart, Compass, Layers, ShieldCheck, Play, Pause, RotateCcw, Sparkles, Droplets, Zap, ChevronRight } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import { num, bnDigits } from '../../engine/dates';

// 4 distinct agricultural biomechanical actions with physiological kinematic parameters
const ACTIONS = {
  transplant: {
    id: 'transplant',
    name: { bn: 'ধান রোপণ (Paddy Transplant)', en: 'Paddy Transplanting' },
    desc: {
      bn: 'কাদামাটিতে ঝুঁকে ধানের চারা লাগানো: কোমর ও হাঁটুর ওপর দীর্ঘস্থায়ী চাপ, কিন্তু গতি ধীর।',
      en: 'Forward crouch planting in mud: continuous lumbar and knee flexion, slow measured gait.',
    },
    torsoFlexion: 42, // degrees forward tilt
    kneeFlexion: 58,  // degrees bent
    cadence: 18,      // plants / min
    l4l5Compression: 1920, // Newtons
    metabolicWatts: 320,   // Watts
    kcalPerHour: 345,
    respirationRate: 24,   // breaths/min
    tool: { bn: 'ধানের চারা গুচ্ছ', en: 'Seedling cluster' },
    toolMassKg: 0.25,
  },
  hoe: {
    id: 'hoe',
    name: { bn: 'কোদাল কোপানো (Kodal Hoeing)', en: 'Kodal / Hoe Striking' },
    desc: {
      bn: 'মাটি কোপানো ও আল বাঁধা: ওপর থেকে নিচে গতিশক্তি সঞ্চালন, সর্বোচ্চ পেশী শক্তি ও কম্পন প্রভাব।',
      en: 'Trenching and ridge building: vertical kinetic energy transfer, high muscle impulse and vibration.',
    },
    torsoFlexion: 28,
    kneeFlexion: 34,
    cadence: 26,      // strikes / min
    l4l5Compression: 2480, // Newtons
    metabolicWatts: 420,
    kcalPerHour: 430,
    respirationRate: 32,
    tool: { bn: 'ভারী দেশি কোদাল (৩.২ কেজি)', en: 'Forged iron kodal (3.2 kg)' },
    toolMassKg: 3.2,
  },
  spray: {
    id: 'spray',
    name: { bn: 'ন্যাপস্যাক স্প্রেয়ার (Knapsack Spray)', en: 'Knapsack Spraying' },
    desc: {
      bn: 'পিঠে ১৬ কেজির ট্যাংক নিয়ে সোজা হেঁটে স্প্রে: মাধ্যাকর্ষণ কেন্দ্র উপরে ওঠে, কাঁধ ও গোড়ালির ভারসাম্য জরুরি।',
      en: 'Walking with a 16 kg backpack tank: elevated center of gravity, sustained shoulder and ankle stability.',
    },
    torsoFlexion: 8,
    kneeFlexion: 16,
    cadence: 52,      // paces / min
    l4l5Compression: 1540,
    metabolicWatts: 270,
    kcalPerHour: 285,
    respirationRate: 20,
    tool: { bn: 'ন্যাপস্যাক প্রেসার স্প্রেয়ার (১৬ লিটার)', en: 'Knapsack sprayer (16 L tank)' },
    toolMassKg: 18.5,
  },
  sickle: {
    id: 'sickle',
    name: { bn: 'কাঁচি দিয়ে ফসল কাটা (Sickle Reaping)', en: 'Sickle Harvesting' },
    desc: {
      bn: 'মাটির কাছাকাছি স্কোয়াট পজিশনে ধান কাটা: গভীর হাঁটু বাঁকানো ও কবজির কাটিং মোশন।',
      en: 'Deep squat reaping close to root crown: extreme knee flexion and rapid repetitive wrist shear.',
    },
    torsoFlexion: 48,
    kneeFlexion: 74,
    cadence: 38,      // sweeps / min
    l4l5Compression: 2150,
    metabolicWatts: 350,
    kcalPerHour: 365,
    respirationRate: 26,
    tool: { bn: 'দাঁতালো ইস্পাত কাঁচি (০.৪ কেজি)', en: 'Toothed steel sickle (0.4 kg)' },
    toolMassKg: 0.45,
  },
};

// 3 Bengal delta soil strata with distinct geotechnical and tribological parameters
const SOILS = {
  wetland: {
    id: 'wetland',
    name: { bn: 'কাদাময় প্লাবনভূমি পলি (Wetland Mud)', en: 'Puddled Wetland Silt' },
    color: '#3d3024',
    waterContentPct: 42,
    cohesionKPa: 4.5,
    frictionAngleDeg: 12,
    shearStrengthKPa: 8.5,
    penetrationResistanceMPa: 0.35,
    footSinkageCm: 4.8,
    viscousDragFactor: 2.4,
    geology: { bn: 'হোলোসিন পলল ও কাদা', en: 'Holocene alluvial mud' },
  },
  barind: {
    id: 'barind',
    name: { bn: 'বরেন্দ্র শক্ত লাল এঁটেল (Barind Hardpan)', en: 'Barind Compacted Paleosol' },
    color: '#8b3d24',
    waterContentPct: 18,
    cohesionKPa: 28.0,
    frictionAngleDeg: 26,
    shearStrengthKPa: 42.0,
    penetrationResistanceMPa: 2.85,
    footSinkageCm: 0.4,
    viscousDragFactor: 1.0,
    geology: { bn: 'প্লাইস্টোসিন প্রাচীন লাল মাটি (Paleosol)', en: 'Pleistocene weathered paleosol' },
  },
  loam: {
    id: 'loam',
    name: { bn: 'চর ও নদীর বেলে দোআঁশ (Sandy Loam)', en: 'Riverine Sandy Loam' },
    color: '#7a6042',
    waterContentPct: 24,
    cohesionKPa: 12.0,
    frictionAngleDeg: 34,
    shearStrengthKPa: 22.5,
    penetrationResistanceMPa: 1.20,
    footSinkageCm: 1.6,
    viscousDragFactor: 1.3,
    geology: { bn: 'মেঘনা ও তিস্তা বালুময় দোআঁশ', en: 'Meghna & Tista alluvial loam' },
  },
};

export default function BiomechanicsLab() {
  const { T, s } = useStore();
  const lang = s.lang;

  const [actionId, setActionId] = useState('transplant');
  const [soilId, setSoilId] = useState('wetland');
  const [effortMultiplier, setEffortMultiplier] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const act = ACTIONS[actionId];
  const soil = SOILS[soilId];

  // Effective biomechanics adjusted for effort and soil interaction
  const effectiveEffort = effortMultiplier;
  const sinkageAdjusted = (soil.footSinkageCm * Math.sqrt(effectiveEffort)).toFixed(1);
  const currentL4L5 = Math.round(act.l4l5Compression * effectiveEffort * (1 + (soil.viscousDragFactor - 1) * 0.15));
  const currentKcal = Math.round(act.kcalPerHour * effectiveEffort * (1 + (soil.viscousDragFactor - 1) * 0.22));
  const currentWatts = Math.round(act.metabolicWatts * effectiveEffort * soil.viscousDragFactor);
  const currentBreaths = Math.round(act.respirationRate * Math.sqrt(effectiveEffort) * (soil.viscousDragFactor > 1.5 ? 1.12 : 1.0));

  // Tool impact or kinetic momentum
  const toolVelocity = (2.2 * effectiveEffort).toFixed(1);
  const kineticEnergy = (0.5 * act.toolMassKg * Math.pow(parseFloat(toolVelocity), 2)).toFixed(1);

  // Animation loop driving the canvas
  useEffect(() => {
    let lastTs = performance.now();
    const loop = (ts) => {
      const dt = Math.min(0.1, (ts - lastTs) / 1000);
      lastTs = ts;
      if (isPlaying) {
        setTime((prev) => prev + dt * (act.cadence / 22) * effectiveEffort);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, act.cadence, effectiveEffort]);

  // Render canvas frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Background gradient representing rural delta ambient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#f0fdf4');
    skyGrad.addColorStop(0.55, '#e0f2fe');
    skyGrad.addColorStop(1, '#ecfdf5');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    const groundY = h * 0.72;
    const sinkPx = parseFloat(sinkageAdjusted) * 3.5;

    // Draw Soil Strata Profile
    // Stratum 1: Topsoil / Mud
    ctx.fillStyle = soil.color;
    ctx.fillRect(0, groundY, w, 28);

    // Stratum 2: Plough Pan (compacted)
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(0, groundY + 28, w, 14);

    // Stratum 3: Ancient Paleosol / Subsoil
    ctx.fillStyle = '#2c180e';
    ctx.fillRect(0, groundY + 42, w, h - (groundY + 42));

    // Water puddle sheen if wetland
    if (soil.id === 'wetland') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.fillRect(0, groundY - 6, w, 10);
      // Ripples around farmer feet
      const rippleRadius = (time * 18) % 36;
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, 1 - rippleRadius / 36)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, groundY + 2, rippleRadius * 1.6, rippleRadius * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ground boundary line
    ctx.strokeStyle = '#2d1a0e';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // Biomechanical Kinematic Rig
    const cycle = Math.sin(time * Math.PI * 2);
    const breathe = Math.sin(time * (currentBreaths / 10));

    const cx = w * 0.48;
    const footY = groundY + sinkPx;

    // Joint positions calculated from inverse kinematics
    const hipY = groundY - 95 + cycle * 4 * (actionId === 'hoe' ? 2.5 : 0.8);
    const hipX = cx + (actionId === 'hoe' ? cycle * 8 : 0);

    // Spine & Thorax
    const spineAngle = (act.torsoFlexion * Math.PI) / 180 + cycle * 0.08;
    const thoraxLen = 48 + breathe * 1.5;
    const thoraxX = hipX - Math.sin(spineAngle) * thoraxLen;
    const thoraxY = hipY - Math.cos(spineAngle) * thoraxLen;

    // Head
    const headX = thoraxX - Math.sin(spineAngle * 0.6) * 22;
    const headY = thoraxY - Math.cos(spineAngle * 0.6) * 22;

    // Legs: Left & Right
    const lKneeX = hipX - 16;
    const lKneeY = hipY + 48 + (actionId === 'sickle' ? 22 : 0);
    const rKneeX = hipX + 18;
    const rKneeY = hipY + 46;

    // Draw Legs & Feet (immersed in soil stratum)
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Left leg (back)
    ctx.strokeStyle = '#1e3a29';
    ctx.beginPath();
    ctx.moveTo(hipX - 6, hipY);
    ctx.lineTo(lKneeX, lKneeY);
    ctx.lineTo(cx - 24, footY);
    ctx.stroke();

    // Right leg (front)
    ctx.strokeStyle = '#2e5c3e';
    ctx.beginPath();
    ctx.moveTo(hipX + 6, hipY);
    ctx.lineTo(rKneeX, rKneeY);
    ctx.lineTo(cx + 18, footY);
    ctx.stroke();

    // Feet in soil
    ctx.strokeStyle = '#1b3323';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 28, footY);
    ctx.lineTo(cx - 16, footY);
    ctx.moveTo(cx + 14, footY);
    ctx.lineTo(cx + 28, footY);
    ctx.stroke();

    // Torso / Thoracic cage
    ctx.strokeStyle = '#22723a';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(thoraxX, thoraxY);
    ctx.stroke();

    // Thoracic respiration pulse highlight
    ctx.strokeStyle = `rgba(74, 222, 128, ${0.4 + breathe * 0.3})`;
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(hipX * 0.4 + thoraxX * 0.6, hipY * 0.4 + thoraxY * 0.6);
    ctx.lineTo(thoraxX, thoraxY);
    ctx.stroke();

    // Knapsack Tank if spraying
    if (actionId === 'spray') {
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(thoraxX - 22, thoraxY - 10, 18, 38, 5);
      ctx.fill();
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Spray Lance and droplet cone
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(thoraxX + 10, thoraxY + 15);
      ctx.lineTo(cx + 55, groundY - 20);
      ctx.stroke();

      // Aerosol droplet spray cone
      const sprayGrad = ctx.createRadialGradient(cx + 55, groundY - 20, 2, cx + 80, groundY, 40);
      sprayGrad.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
      sprayGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = sprayGrad;
      ctx.beginPath();
      ctx.moveTo(cx + 55, groundY - 20);
      ctx.lineTo(cx + 90, groundY - 8);
      ctx.lineTo(cx + 70, groundY + 12);
      ctx.closePath();
      ctx.fill();
    }

    // Kodal / Hoe Strike Motion
    if (actionId === 'hoe') {
      const strikeAngle = Math.sin(time * Math.PI * 2);
      const hoeX = cx + 25 + strikeAngle * 25;
      const hoeY = groundY - 5 - Math.max(0, -strikeAngle * 45);

      // Shaft
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(thoraxX + 10, thoraxY + 15);
      ctx.lineTo(hoeX, hoeY);
      ctx.stroke();

      // Steel blade
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.rect(hoeX - 4, hoeY - 3, 14, 8);
      ctx.fill();

      // Soil impact spark/dust
      if (strikeAngle > 0.85) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(hoeX, groundY, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Rice seedlings cluster if transplanting
    if (actionId === 'transplant') {
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2.5;
      for (let i = -8; i <= 8; i += 4) {
        ctx.beginPath();
        ctx.moveTo(cx + 20 + i, groundY - 5);
        ctx.quadraticCurveTo(cx + 22 + i * 1.5, groundY - 22, cx + 24 + i * 2, groundY - 32);
        ctx.stroke();
      }
    }

    // Sickle Reaping
    if (actionId === 'sickle') {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx + 20, groundY - 12, 14, Math.PI * 0.2, Math.PI * 1.1, false);
      ctx.stroke();
    }

    // Arms
    ctx.strokeStyle = '#316943';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(thoraxX, thoraxY + 8);
    const elbowX = (thoraxX + cx + 25) * 0.5 - 10;
    const elbowY = (thoraxY + groundY) * 0.5 - 15;
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(cx + 20, actionId === 'transplant' ? groundY - 10 : groundY - 35);
    ctx.stroke();

    // Head & Gamcha / Cap
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(headX, headY, 13, 0, Math.PI * 2);
    ctx.fill();

    // Gamcha wrap
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(headX, headY - 6, 14, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Depth Markers on the right
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('0 cm', w - 42, groundY - 3);
    ctx.fillText('15 cm (Plough pan)', w - 95, groundY + 24);
    ctx.fillText('30 cm+ (Paleosol)', w - 95, groundY + 54);

    // Sinkage indicator callout line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx + 32, groundY);
    ctx.lineTo(cx + 65, groundY);
    ctx.moveTo(cx + 32, footY);
    ctx.lineTo(cx + 65, footY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillText(`Δz = ${sinkPx > 0 ? sinkageAdjusted : '0.0'} cm`, cx + 70, (groundY + footY) * 0.5 + 4);
  }, [time, actionId, soilId, sinkageAdjusted, currentBreaths, effectiveEffort, soil]);

  return (
    <section className="mt-10 overflow-hidden rounded-[30px] border border-primary-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-md sm:p-8">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-100 text-primary-800 shadow-xs">
            <Activity size={22} className="animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
                {T('কৃষক বায়োমেকানিক্স ও মাটির ঘর্ষণ ল্যাব', 'Farmer Biomechanics & Soil Physics Lab')}
              </h2>
              <Tags list={['MODEL', 'RULE']} />
            </div>
            <p className="text-[13px] text-muted">
              {T('৩ডি কাইনেম্যাটিক্স, পেশী শক্তি, ফুসফুস শ্বাসক্রিয়া ও মাটির স্ট্র্যাটিগ্রাফি প্রতিরোধ সিমুলেশন',
                 '3D inverse kinematics, metabolic power, respiratory cycle, and soil stratum resistance simulation')}
            </p>
          </div>
        </div>

        {/* Play / Pause / Reset Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-primary-800 shadow-xs hover:bg-primary-50 transition-colors"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? T('থামান', 'Pause') : T('চালান', 'Play')}</span>
          </button>
          <button
            type="button"
            onClick={() => { setTime(0); setEffortMultiplier(1.0); }}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-white text-muted hover:text-ink transition-colors"
            title={T('পুনরায় শুরু', 'Reset')}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Main Grid: Visualizer Canvas on Left, Controls & Metrics on Right */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Left Column: Visualizer Canvas & Overlays */}
        <div className="relative overflow-hidden rounded-[24px] border border-border bg-slate-50 shadow-inner">
          <canvas
            ref={canvasRef}
            className="h-[340px] w-full sm:h-[400px]"
          />

          {/* Action & Soil Title Badge Overlay */}
          <div className="absolute left-4 top-4 flex flex-col gap-1.5 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[12px] font-bold text-ink shadow-sm backdrop-blur-md">
              <Dumbbell size={13} className="text-primary-600" />
              {T(act.name.bn, act.name.en)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11.5px] font-medium text-muted shadow-sm backdrop-blur-md">
              <Layers size={12} className="text-amber-600" />
              {T(soil.name.bn, soil.name.en)}
            </span>
          </div>

          {/* Bottom Telemetry Strip */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/90 p-2.5 text-[11.5px] font-medium text-ink shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-primary-800">
                <Heart size={13} className="text-red-500 animate-pulse" />
                <span>{T(`শ্বাসক্রিয়া: ${bnDigits(currentBreaths)} বার/মি`, `Respiration: ${currentBreaths} bpm`)}</span>
              </span>
              <span className="flex items-center gap-1 text-amber-900">
                <Flame size={13} className="text-amber-500" />
                <span>{T(`ব্যয়: ${bnDigits(currentKcal)} ক্যালরি/ঘণ্টা`, `Burn: ${currentKcal} kcal/h`)}</span>
              </span>
            </div>
            <span className="tabular text-muted">
              {T(`মাটির রোধ: ${bnDigits(soil.shearStrengthKPa)} kPa`, `Soil shear: ${soil.shearStrengthKPa} kPa`)}
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Selectors, Sliders & Physiological Readout */}
        <div className="flex flex-col gap-5">
          {/* Action Selector Pills */}
          <div>
            <label className="text-[13px] font-bold text-ink flex items-center justify-between">
              <span>{T('১. কৃষি কাজের ধরন (Action Kinematics)', '1. Agricultural Activity')}</span>
              <span className="text-[11.5px] font-normal text-muted">{T('৪টি শারীরিক ভঙ্গি', '4 postures')}</span>
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.values(ACTIONS).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActionId(a.id)}
                  className={`flex flex-col items-start rounded-2xl p-2.5 text-left transition-all ${
                    actionId === a.id
                      ? 'border border-primary-500 bg-primary-50/80 shadow-xs ring-2 ring-primary-500/20'
                      : 'border border-border/80 bg-white hover:border-primary-200'
                  }`}
                >
                  <span className={`text-[12.5px] font-bold ${actionId === a.id ? 'text-primary-900' : 'text-ink'}`}>
                    {T(a.name.bn, a.name.en)}
                  </span>
                  <span className="mt-0.5 text-[11px] text-muted line-clamp-1">
                    {T(a.tool.bn, a.tool.en)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Soil Type Selector */}
          <div>
            <label className="text-[13px] font-bold text-ink flex items-center justify-between">
              <span>{T('২. মাটির ভূ-প্রকৃতি ও প্রতিরোধ (Soil Stratum)', '2. Soil Geotechnical Layer')}</span>
              <span className="text-[11.5px] font-normal text-muted">{T('বাংলাদেশ ডেল্টা', 'Bengal Delta')}</span>
            </label>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {Object.values(SOILS).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSoilId(s.id)}
                  className={`rounded-2xl p-2 text-center transition-all ${
                    soilId === s.id
                      ? 'border border-amber-600 bg-amber-50/80 shadow-xs ring-2 ring-amber-500/20'
                      : 'border border-border/80 bg-white hover:border-amber-200'
                  }`}
                >
                  <span className="block text-[11.5px] font-bold text-ink">
                    {T(s.name.bn.split(' ')[0], s.name.en.split(' ')[0])}
                  </span>
                  <span className="block text-[10.5px] text-muted tabular">
                    {T(`${bnDigits(s.footSinkageCm)} সেমি দেবে`, `${s.footSinkageCm}cm sink`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Exertion / Effort Multiplier Slider */}
          <div>
            <div className="flex items-center justify-between text-[12.5px] font-bold text-ink">
              <span>{T('৩. শ্রমের তীব্রতা (Physical Exertion Level)', '3. Labor Exertion Level')}</span>
              <span className="text-primary-700 tabular">{T(`${bnDigits((effortMultiplier * 100).toFixed(0))}%`, `${(effortMultiplier * 100).toFixed(0)}%`)}</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.1"
              value={effortMultiplier}
              onChange={(e) => setEffortMultiplier(parseFloat(e.target.value))}
              className="mt-2 w-full accent-primary-600 cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-[10.5px] text-muted">
              <span>{T('ধীর / হালকা (0.6x)', 'Light (0.6x)')}</span>
              <span>{T('স্বাভাবিক (1.0x)', 'Nominal (1.0x)')}</span>
              <span>{T('তীব্র গতি (1.6x)', 'Intensive (1.6x)')}</span>
            </div>
          </div>

          {/* 4 Quantitative Biomechanical Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* L4/L5 Lumbar Force */}
            <div className="rounded-2xl border border-border bg-slate-50/70 p-3">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                {T('কোমরের চাপ (L4/L5)', 'Spinal L4/L5 Load')}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-[20px] font-bold text-ink tabular">
                  {T(bnDigits(currentL4L5), currentL4L5.toLocaleString())}
                </span>
                <span className="text-[11.5px] text-muted">N</span>
              </div>
              <span className={`mt-1 inline-block text-[10.5px] font-bold ${currentL4L5 > 2200 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {currentL4L5 > 2200 ? T('সতর্কতা: উচ্চ কোমর টান', 'High disc compression') : T('সহনশীল মাত্রা (NIOSH)', 'Within NIOSH limits')}
              </span>
            </div>

            {/* Metabolic Power Output */}
            <div className="rounded-2xl border border-border bg-slate-50/70 p-3">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                {T('বিপাকীয় শক্তি (Power)', 'Metabolic Power')}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-[20px] font-bold text-ink tabular">
                  {T(bnDigits(currentWatts), currentWatts)}
                </span>
                <span className="text-[11.5px] text-muted">Watts</span>
              </div>
              <span className="mt-1 inline-block text-[10.5px] text-muted">
                {T(`গতিবেগ: ${bnDigits(toolVelocity)} মি/সে`, `Velocity: ${toolVelocity} m/s`)}
              </span>
            </div>

            {/* Kinetic Energy / Tool Momentum */}
            <div className="rounded-2xl border border-border bg-slate-50/70 p-3">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                {T('হাতিয়ারের গতিশক্তি', 'Tool Kinetic Energy')}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-[20px] font-bold text-ink tabular">
                  {T(bnDigits(kineticEnergy), kineticEnergy)}
                </span>
                <span className="text-[11.5px] text-muted">Joules</span>
              </div>
              <span className="mt-1 inline-block text-[10.5px] text-muted">
                {T(`ভর: ${bnDigits(act.toolMassKg)} কেজি`, `Mass: ${act.toolMassKg} kg`)}
              </span>
            </div>

            {/* Soil Foot Sinkage */}
            <div className="rounded-2xl border border-border bg-slate-50/70 p-3">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                {T('পা দেবে যাওয়ার গভীরতা', 'Soil Foot Sinkage')}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-[20px] font-bold text-ink tabular">
                  {T(bnDigits(sinkageAdjusted), sinkageAdjusted)}
                </span>
                <span className="text-[11.5px] text-muted">cm</span>
              </div>
              <span className="mt-1 inline-block text-[10.5px] text-muted">
                {T(`ঘর্ষণ কোণ: ${bnDigits(soil.frictionAngleDeg)}°`, `Friction angle: ${soil.frictionAngleDeg}°`)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
