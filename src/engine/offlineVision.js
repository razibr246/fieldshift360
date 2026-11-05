// Offline colour metrics only. This is an RGB-threshold heuristic, not a trained model,
// crop identifier, or disease detector. Camera, lighting, cultivar, age, and background all affect it.

// Extract agronomic spectral and spatial features from raw RGBA pixel data
export function extractLeafMetrics({ data, width, height }) {
  const pixelCount = width * height;
  if (!pixelCount || !data || data.length < pixelCount * 4) {
    return { isCrop: false, gli: 0, chlorosis: 0, necroticPct: 0, edgeComplexity: 0 };
  }

  let totalGli = 0;
  let totalChlorosis = 0;
  let greenPixels = 0;
  let necroticPixels = 0;
  let totalLuminance = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Green Leaf Index (GLI): (2G - R - B) / (2G + R + B + 1e-4)
    const denom = 2 * g + r + b + 0.0001;
    const gli = (2 * g - r - b) / denom;
    totalGli += gli;

    // Optical Chlorosis Metric: Red-to-Green ratio (carotenoid yellow reflection: R/G approaches 1.0)
    const rgRatio = r / (g + 0.0001);
    totalChlorosis += rgRatio;

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLuminance += lum;

    // Foliage pixel check: healthy green or chlorotic yellow plant tissue
    if (g > b && (g > r * 0.85 || (r > b && rgRatio > 0.8))) {
      greenPixels++;
    }

    // Necrotic lesion check: dark brown/black necrotic fungal patches
    // (r > 40, g < r, b < g, and lower overall luminance)
    if (lum < 130 && r > 40 && r > g * 1.15 && r > b * 1.3) {
      necroticPixels++;
    }
  }

  const avgGli = Math.round((totalGli / pixelCount) * 100) / 100;
  const yellowing = Math.round((totalChlorosis / pixelCount) * 100) / 100;
  const greenRatio = greenPixels / pixelCount;
  const necroticPct = Math.round((necroticPixels / pixelCount) * 1000) / 10; // e.g. 14.5%

  // A weak green-colour signal; green backgrounds can also satisfy this threshold.
  const isCrop = greenRatio >= 0.25 || avgGli > 0.08;

  return {
    isCrop,
    gli: avgGli,
    chlorosis: yellowing,
    necroticPct,
    greenRatio: Math.round(greenRatio * 100) / 100,
  };
}

// Report colour measurements only. RGB thresholds cannot identify a crop or distinguish diseases.
export function classifyLeafPixels({ metrics, lang = 'bn' }) {
  const hasGreenSignal = !!metrics?.isCrop;
  return {
    is_crop_photo: hasGreenSignal, // weak colour heuristic; green backgrounds can produce false positives
    crop_seen: '',
    image_analyzed: true,
    on_device_pixel_check: true,
    method: 'rgb-thresholds',
    vision_metrics: metrics,
    findings: [],
    urgency: 'low',
    summary: lang === 'bn'
      ? hasGreenSignal
        ? 'ছবির কিছু পিক্সেলে সবুজ বা হলুদাভ রঙের ইঙ্গিত আছে। এই সহজ রঙ-পরীক্ষা ফসল বা রোগ শনাক্ত করে না; কর্মকর্তার পরামর্শ নিন।'
        : 'ছবিতে যথেষ্ট সবুজ রঙের ইঙ্গিত পাওয়া যায়নি। এটি ফসলের ছবি কি না বা গাছ সুস্থ কি না, এই পরীক্ষা বলতে পারে না।'
      : hasGreenSignal
        ? 'Some pixels have green or yellow-like colour values. This simple colour check cannot identify a crop or disease; ask an agriculture officer.'
        : 'The image did not have a strong green colour signal. This check cannot tell whether it is a crop photo or whether a plant is healthy.',
    actions_now: lang === 'bn'
      ? ['পাতার পরিষ্কার ছবি তুলুন, যাতে পাতা ও পেছনের অংশ আলাদা বোঝা যায়।', 'লক্ষণ থাকলে ছবিসহ কৃষি কর্মকর্তার পরামর্শ নিন।', 'শুধু এই রঙ-পরীক্ষার ভিত্তিতে কীটনাশক ব্যবহার করবেন না।']
      : ['Take a clear photo that separates the leaf from its background.', 'If the plant shows symptoms, ask an agriculture officer and share the photo.', 'Do not apply pesticide based on this colour check alone.'],
    call_officer_if: lang === 'bn' ? 'গাছের লক্ষণ থাকলে কৃষি কর্মকর্তাকে ছবিটি দেখান।' : 'Show the photo to an agriculture officer if the plant has symptoms.',
    offline: true,
  };
}

// Transform an RGBA pixel buffer into an agro-spectral false-colour representation.
// Maps healthy chlorophyll to emerald, chlorotic stress to amber, necrotic spots to crimson, and background to monochrome.
export function generateFalseColorSpectralMap({ data, width, height }) {
  const pixelCount = width * height;
  if (!pixelCount || !data || data.length < pixelCount * 4) {
    return { falseColorData: null, stats: { greenPct: 0, chlorosisPct: 0, necroticPct: 0, otherPct: 100 } };
  }

  const out = new Uint8ClampedArray(data.length);
  let greenCount = 0;
  let chlorosisCount = 0;
  let necroticCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    const denom = 2 * g + r + b + 0.0001;
    const gli = (2 * g - r - b) / denom;
    const rgRatio = r / (g + 0.0001);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Check necrotic
    if (lum < 130 && r > 40 && r > g * 1.15 && r > b * 1.3) {
      necroticCount++;
      out[i] = 239;
      out[i + 1] = 68;
      out[i + 2] = 68;
      out[i + 3] = a;
    } else if (r > b && rgRatio > 0.85 && rgRatio < 1.35 && g > 70) {
      chlorosisCount++;
      out[i] = 245;
      out[i + 1] = 158;
      out[i + 2] = 11;
      out[i + 3] = a;
    } else if (g > b && (g > r * 0.85 || gli > 0.05)) {
      greenCount++;
      out[i] = 16;
      out[i + 1] = 185;
      out[i + 2] = 129;
      out[i + 3] = a;
    } else {
      const gray = Math.round(lum * 0.45 + 50);
      out[i] = gray;
      out[i + 1] = gray;
      out[i + 2] = gray;
      out[i + 3] = Math.round(a * 0.8);
    }
  }

  const greenPct = Math.round((greenCount / pixelCount) * 1000) / 10;
  const chlorosisPct = Math.round((chlorosisCount / pixelCount) * 1000) / 10;
  const necroticPct = Math.round((necroticCount / pixelCount) * 1000) / 10;
  const otherPct = Math.max(0, Math.round((100 - greenPct - chlorosisPct - necroticPct) * 10) / 10);

  return {
    falseColorData: out,
    stats: { greenPct, chlorosisPct, necroticPct, otherPct },
  };
}

