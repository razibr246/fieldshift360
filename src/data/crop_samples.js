// Sample crop photos for testing the Crop Doctor.
// Self-contained SVG data-URIs crafted to match the diagnostic symptoms recognized by DAE and BARI,
// so farmers and evaluators can test the AI vision and local rule pipeline without needing an external file.

function svgToDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const CROP_SAMPLES = [
  {
    id: 'sample_tomato_blight',
    crop: 'tomato',
    symptomKey: 'late_blight',
    name: { bn: 'টমেটো: নাবি ধসা (মড়ক)', en: 'Tomato: Late blight' },
    desc: {
      bn: 'পাতার কিনারায় কালচে ভেজা দাগ ও কুয়াশার পর পচন',
      en: 'Dark water-soaked leaf margins after heavy fog',
    },
    note: {
      bn: 'দুই দিন ধরে কুয়াশার পর পাতার আগায় কালচে ভেজা ছোপ পড়েছে, দ্রুত ছড়াচ্ছে।',
      en: 'Dark water-soaked patches on leaf edges after morning fog, spreading quickly.',
    },
    image: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#4a5538"/>
            <stop offset="100%" stop-color="#2d3720"/>
          </radialGradient>
          <filter id="lesionBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5"/>
          </filter>
          <radialGradient id="necrosis" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#1c1813"/>
            <stop offset="60%" stop-color="#3d2c1d"/>
            <stop offset="85%" stop-color="#735227"/>
            <stop offset="100%" stop-color="#a49339" stop-opacity="0.2"/>
          </radialGradient>
        </defs>
        <!-- Background field soil/canopy -->
        <rect width="400" height="300" fill="url(#bgGrad)"/>
        
        <!-- Main Stem -->
        <path d="M 60 280 Q 150 200 200 130 T 290 40" fill="none" stroke="#5f8c36" stroke-width="8" stroke-linecap="round"/>
        <path d="M 170 160 Q 230 180 320 210" fill="none" stroke="#557c30" stroke-width="5" stroke-linecap="round"/>
        
        <!-- Compound Leaf 1 (Top Healthy-ish) -->
        <g transform="translate(230, 70) rotate(-25)">
          <path d="M 0 0 Q 30 -25 70 0 Q 30 25 0 0" fill="#69a338" stroke="#487523" stroke-width="1.5"/>
          <path d="M 0 0 L 65 0" stroke="#8ec857" stroke-width="1.2"/>
        </g>
        
        <!-- Main Infected Leaf (Center) -->
        <g transform="translate(130, 90)">
          <!-- Leaf base shape -->
          <path d="M 0 30 C 30 -20 110 -30 160 10 C 130 60 60 80 0 30" fill="#588b2e" stroke="#3b611c" stroke-width="2"/>
          <!-- Veins -->
          <path d="M 0 30 Q 80 15 155 10" stroke="#7bb848" stroke-width="2" fill="none"/>
          <path d="M 40 25 Q 70 -5 95 -10" stroke="#7bb848" stroke-width="1.2" fill="none"/>
          <path d="M 70 21 Q 100 45 125 40" stroke="#7bb848" stroke-width="1.2" fill="none"/>
          
          <!-- Late blight water-soaked necrotic lesions -->
          <path d="M 85 -15 C 110 -25 150 -10 160 10 C 145 25 120 15 100 0 Z" fill="url(#necrosis)" filter="url(#lesionBlur)"/>
          <circle cx="130" cy="-2" r="18" fill="#261b11" opacity="0.85"/>
          <!-- Fungal mold white edge -->
          <path d="M 95 -10 Q 120 10 145 18" fill="none" stroke="#e8eedb" stroke-width="1.8" stroke-dasharray="3,2" opacity="0.75"/>
          
          <!-- Secondary lesion -->
          <ellipse cx="65" cy="38" rx="22" ry="14" fill="url(#necrosis)" transform="rotate(-15, 65, 38)"/>
          <circle cx="63" cy="37" r="10" fill="#18130e"/>
        </g>
        
        <!-- Lower Wilting Leaflet -->
        <g transform="translate(190, 175) rotate(18)">
          <path d="M 0 10 Q 50 -15 90 10 Q 45 35 0 10" fill="#758231" stroke="#48521a"/>
          <path d="M 30 -5 Q 65 0 88 10 Q 60 20 40 10 Z" fill="#2d2218"/>
        </g>
        
        <!-- Label badge in corner -->
        <rect x="12" y="12" width="138" height="26" rx="6" fill="rgba(13,38,20,0.75)"/>
        <text x="20" y="29" fill="#f8e6bd" font-family="sans-serif" font-size="12" font-weight="bold">নমুনা: নাবি ধসা (টমেটো)</text>
      </svg>
    `),
  },
  {
    id: 'sample_mustard_aphid',
    crop: 'mustard',
    symptomKey: 'aphid',
    name: { bn: 'সরিষা: জাব পোকা', en: 'Mustard: Aphid attack' },
    desc: {
      bn: 'ফুল ও কচি ডগায় কালো-ধূসর জাব পোকার ঝাঁক',
      en: 'Clusters of small aphids coating flowers and growing tips',
    },
    note: {
      bn: 'সরিষার ডগায় আর ফুলে কালো কালো পোকা দলবেঁধে রস খাচ্ছে, ফুল ঝরে যাচ্ছে।',
      en: 'Clusters of dark aphids swarming the flowering tips, buds dropping.',
    },
    image: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
        <defs>
          <linearGradient id="mustardSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8ba870"/>
            <stop offset="100%" stop-color="#466133"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#mustardSky)"/>
        
        <!-- Main mustard stalk -->
        <path d="M 200 300 L 200 60" stroke="#719e38" stroke-width="10" stroke-linecap="round"/>
        <path d="M 200 180 Q 240 150 280 130" stroke="#689330" stroke-width="6" stroke-linecap="round"/>
        <path d="M 200 140 Q 150 110 110 90" stroke="#689330" stroke-width="5" stroke-linecap="round"/>
        
        <!-- Golden mustard flowers at top -->
        <g transform="translate(200, 50)">
          <circle cx="-12" cy="-6" r="9" fill="#facc15"/>
          <circle cx="8" cy="-14" r="10" fill="#fde047"/>
          <circle cx="16" cy="2" r="8" fill="#eab308"/>
          <circle cx="-2" cy="10" r="9" fill="#facc15"/>
          <circle cx="0" cy="-2" r="6" fill="#ca8a04"/>
        </g>
        <g transform="translate(285, 125)">
          <circle cx="-8" cy="-4" r="7" fill="#facc15"/>
          <circle cx="6" cy="-8" r="8" fill="#fde047"/>
          <circle cx="4" cy="5" r="7" fill="#eab308"/>
        </g>
        
        <!-- Pods (siliques) -->
        <path d="M 200 220 Q 250 210 270 190" stroke="#84b045" stroke-width="3" fill="none"/>
        <path d="M 200 200 Q 140 190 120 170" stroke="#84b045" stroke-width="3" fill="none"/>
        
        <!-- Aphid clusters on the stem and flower base (dozens of tiny dark specks) -->
        <g fill="#1f2416" stroke="#11140c" stroke-width="0.5">
          <!-- Main cluster near flower neck -->
          <ellipse cx="197" cy="80" rx="3.5" ry="2.5"/>
          <ellipse cx="203" cy="83" rx="3" ry="2.5"/>
          <ellipse cx="196" cy="88" rx="3.2" ry="2.2"/>
          <ellipse cx="202" cy="91" rx="3.5" ry="2.7"/>
          <ellipse cx="198" cy="97" rx="3.8" ry="2.8"/>
          <ellipse cx="203" cy="102" rx="3.2" ry="2.4"/>
          <ellipse cx="197" cy="108" rx="3.6" ry="2.6"/>
          <ellipse cx="202" cy="114" rx="3.4" ry="2.5"/>
          <ellipse cx="196" cy="120" rx="3.5" ry="2.8"/>
          <ellipse cx="203" cy="126" rx="3.7" ry="2.9"/>
          <!-- Branch cluster -->
          <ellipse cx="225" cy="165" rx="3.2" ry="2.3"/>
          <ellipse cx="233" cy="160" rx="3.5" ry="2.6"/>
          <ellipse cx="242" cy="154" rx="3.4" ry="2.4"/>
          <ellipse cx="250" cy="148" rx="3.6" ry="2.5"/>
          <!-- Honey-dew sheen effect -->
          <path d="M 195 85 Q 200 115 197 135" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" fill="none"/>
        </g>
        
        <!-- Label badge -->
        <rect x="12" y="12" width="138" height="26" rx="6" fill="rgba(13,38,20,0.75)"/>
        <text x="20" y="29" fill="#f8e6bd" font-family="sans-serif" font-size="12" font-weight="bold">নমুনা: জাব পোকা (সরিষা)</text>
      </svg>
    `),
  },
  {
    id: 'sample_rice_blast',
    crop: 'aman',
    symptomKey: 'blast',
    name: { bn: 'ধান: ব্লাস্ট রোগ', en: 'Rice: Neck & Leaf blast' },
    desc: {
      bn: 'পাতায় চোখের মতো বাদামি দাগ ও শীষের গোড়ায় কালো পচন',
      en: 'Spindle-shaped eye lesions and neck rot on the panicle',
    },
    note: {
      bn: 'ধানের পাতায় দুপাশে সূচালো চোখের মতো দাগ পড়েছে, শীষের গোড়া কালচে হয়ে ভেঙে পড়ছে।',
      en: 'Spindle-shaped lesions with grey centers on leaves; panicle neck blackening.',
    },
    image: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
        <defs>
          <linearGradient id="paddyField" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4e7240"/>
            <stop offset="100%" stop-color="#2a4522"/>
          </linearGradient>
          <radialGradient id="blastLesion" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#dcd7cd"/>
            <stop offset="45%" stop-color="#936a38"/>
            <stop offset="80%" stop-color="#542e12"/>
            <stop offset="100%" stop-color="#7ca034" stop-opacity="0.1"/>
          </radialGradient>
        </defs>
        <rect width="400" height="300" fill="url(#paddyField)"/>
        
        <!-- Long Arching Rice Blade (Center) -->
        <path d="M 60 290 Q 150 160 210 120 T 370 70" fill="none" stroke="#689e3a" stroke-width="26" stroke-linecap="round"/>
        <!-- Midrib -->
        <path d="M 60 290 Q 150 160 210 120 T 370 70" fill="none" stroke="#87c452" stroke-width="3"/>
        
        <!-- Characteristic spindle/eye-shaped Blast lesions -->
        <!-- Lesion 1 (Big) -->
        <g transform="translate(190, 130) rotate(-35)">
          <path d="M -30 0 Q 0 -12 30 0 Q 0 12 -30 0 Z" fill="url(#blastLesion)" stroke="#3f210d" stroke-width="1"/>
          <ellipse cx="0" cy="0" rx="14" ry="4" fill="#cac5b9"/>
        </g>
        
        <!-- Lesion 2 -->
        <g transform="translate(260, 95) rotate(-22)">
          <path d="M -22 0 Q 0 -8 22 0 Q 0 8 -22 0 Z" fill="url(#blastLesion)" stroke="#3f210d" stroke-width="1"/>
          <ellipse cx="0" cy="0" rx="10" ry="3" fill="#cfcac0"/>
        </g>
        
        <!-- Lesion 3 (Small emerging) -->
        <g transform="translate(130, 195) rotate(-55)">
          <path d="M -15 0 Q 0 -6 15 0 Q 0 6 -15 0 Z" fill="url(#blastLesion)"/>
        </g>
        
        <!-- Blackened Panicle Neck (Top Right) -->
        <path d="M 280 140 Q 320 120 340 70" fill="none" stroke="#251a12" stroke-width="4.5"/>
        <circle cx="330" cy="90" r="5" fill="#1b120c"/>
        
        <!-- Label badge -->
        <rect x="12" y="12" width="138" height="26" rx="6" fill="rgba(13,38,20,0.75)"/>
        <text x="20" y="29" fill="#f8e6bd" font-family="sans-serif" font-size="12" font-weight="bold">নমুনা: ব্লাস্ট রোগ (ধান)</text>
      </svg>
    `),
  },
  {
    id: 'sample_lentil_blight',
    crop: 'lentil',
    symptomKey: 'stemphylium',
    name: { bn: 'মসুর: স্টেমফাইলিয়াম ব্লাইট', en: 'Lentil: Stemphylium blight' },
    desc: {
      bn: 'ফুল আসার সময় পাতার ডগা তামাটে হয়ে ঝরে পড়া',
      en: 'Foliage scorching and leaf drop during flowering',
    },
    note: {
      bn: 'মসুর গাছে ফুল আসার সময় পাতা তামাটে বাদামি হয়ে ঝরে যাচ্ছে, জমি পুড়ে যাওয়ার মতো দেখাচ্ছে।',
      en: 'Lentil leaves browning and dropping at flowering; canopy appears scorched.',
    },
    image: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
        <defs>
          <radialGradient id="lentilBg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#4e5c3e"/>
            <stop offset="100%" stop-color="#2a331f"/>
          </radialGradient>
        </defs>
        <rect width="400" height="300" fill="url(#lentilBg)"/>
        <!-- Lentil branch -->
        <path d="M 120 300 Q 180 180 230 70" fill="none" stroke="#6b9944" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M 180 180 Q 240 160 290 120" fill="none" stroke="#628d3e" stroke-width="3" stroke-linecap="round"/>
        <!-- Small pinnate leaflets with scorched necrotic tips -->
        <g transform="translate(190, 150) rotate(-20)">
          <ellipse cx="-15" cy="-8" rx="8" ry="4" fill="#8cb952"/>
          <ellipse cx="15" cy="-8" rx="8" ry="4" fill="#694f27"/>
          <ellipse cx="-18" cy="8" rx="7" ry="4" fill="#4d371b"/>
          <ellipse cx="18" cy="8" rx="7" ry="4" fill="#7ba845"/>
        </g>
        <g transform="translate(240, 110) rotate(15)">
          <ellipse cx="-14" cy="-6" rx="7" ry="3.5" fill="#422f18"/>
          <ellipse cx="14" cy="-6" rx="7" ry="3.5" fill="#3b2b16"/>
          <ellipse cx="-14" cy="6" rx="7" ry="3.5" fill="#84af4d"/>
          <ellipse cx="14" cy="6" rx="7" ry="3.5" fill="#523d20"/>
        </g>
        <rect x="12" y="12" width="138" height="26" rx="6" fill="rgba(13,38,20,0.75)"/>
        <text x="20" y="29" fill="#f8e6bd" font-family="sans-serif" font-size="12" font-weight="bold">নমুনা: ব্লাইট (মসুর ডাল)</text>
      </svg>
    `),
  },
  {
    id: 'sample_healthy_rice',
    crop: 'aman',
    symptomKey: 'healthy',
    name: { bn: 'সুস্থ আমন ধান', en: 'Healthy Aman Rice' },
    desc: {
      bn: 'গাঢ় সবুজ সতেজ পাতা, কোনো দাগ বা পোকা নেই',
      en: 'Vibrant green upright leaves, clean margins and no spotting',
    },
    note: {
      bn: 'জমির ধান সুন্দর সবুজ ও তাজা আছে, কোনো সমস্যা আছে কি না জানতে চাই।',
      en: 'Lush upright green leaves, checking to ensure field health.',
    },
    image: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
        <defs>
          <linearGradient id="healthyPaddy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3b6932"/>
            <stop offset="100%" stop-color="#1c3a17"/>
          </linearGradient>
          <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#46882b"/>
            <stop offset="50%" stop-color="#6bb842"/>
            <stop offset="100%" stop-color="#46882b"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#healthyPaddy)"/>
        
        <!-- Multiple healthy rice leaves -->
        <path d="M 120 300 Q 160 140 240 50" fill="none" stroke="url(#leafGrad)" stroke-width="20" stroke-linecap="round"/>
        <path d="M 120 300 Q 160 140 240 50" fill="none" stroke="#9de26e" stroke-width="2.5"/>
        
        <path d="M 190 300 Q 230 160 310 90" fill="none" stroke="url(#leafGrad)" stroke-width="18" stroke-linecap="round"/>
        <path d="M 190 300 Q 230 160 310 90" fill="none" stroke="#9de26e" stroke-width="2"/>
        
        <path d="M 80 300 Q 90 180 120 110" fill="none" stroke="url(#leafGrad)" stroke-width="16" stroke-linecap="round"/>
        
        <!-- Morning Dew Drops (Freshness shine) -->
        <circle cx="210" cy="85" r="4" fill="white" opacity="0.8"/>
        <circle cx="211" cy="84" r="1.5" fill="#e2fbd0"/>
        <circle cx="270" cy="120" r="3.5" fill="white" opacity="0.75"/>
        
        <!-- Label badge -->
        <rect x="12" y="12" width="138" height="26" rx="6" fill="rgba(13,38,20,0.75)"/>
        <text x="20" y="29" fill="#dcebd3" font-family="sans-serif" font-size="12" font-weight="bold">নমুনা: সুস্থ ধান (আমন)</text>
      </svg>
    `),
  },
];
