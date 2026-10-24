// Registry of the photographs used across the site.
// Each entry has four widths (900 / 1600 / 2400 / 3200 px, WebP; AI-sharpened, scripts/photos/upscale_photos.py),
// its intrinsic size, a focal point for object-position,
// and bilingual alt text. Components use <Photo name="…"> (src/components/Photo.jsx) rather than raw paths.
import heroAerialDawn1600 from './hero-aerial-dawn-1600.webp';
import heroAerialDawn900 from './hero-aerial-dawn-900.webp';
import heroAerialDawn2400 from './hero-aerial-dawn-2400.webp';
import heroAerialDawn3200 from './hero-aerial-dawn-3200.webp';
import landParcels1600 from './land-parcels-aerial-1600.webp';
import landParcels900 from './land-parcels-aerial-900.webp';
import landParcels2400 from './land-parcels-aerial-2400.webp';
import landParcels3200 from './land-parcels-aerial-3200.webp';
import seedlings1600 from './seedlings-sunrise-1600.webp';
import seedlings900 from './seedlings-sunrise-900.webp';
import seedlings2400 from './seedlings-sunrise-2400.webp';
import seedlings3200 from './seedlings-sunrise-3200.webp';
import satellite1600 from './satellite-patchwork-1600.webp';
import satellite900 from './satellite-patchwork-900.webp';
import satellite2400 from './satellite-patchwork-2400.webp';
import satellite3200 from './satellite-patchwork-3200.webp';
import farmer1600 from './farmer-rice-field-1600.webp';
import farmer900 from './farmer-rice-field-900.webp';
import farmer2400 from './farmer-rice-field-2400.webp';
import farmer3200 from './farmer-rice-field-3200.webp';
import droughtFlood1600 from './drought-flood-split-1600.webp';
import droughtFlood900 from './drought-flood-split-900.webp';
import droughtFlood2400 from './drought-flood-split-2400.webp';
import droughtFlood3200 from './drought-flood-split-3200.webp';
import dhamraiBridge1600 from './dhamrai-bridge-1600.webp';
import dhamraiBridge900 from './dhamrai-bridge-900.webp';
import dhamraiBridge2400 from './dhamrai-bridge-2400.webp';
import dhamraiBridge3200 from './dhamrai-bridge-3200.webp';
import riceHarvest1600 from './rice-harvest-1600.webp';
import riceHarvest900 from './rice-harvest-900.webp';
import riceHarvest2400 from './rice-harvest-2400.webp';
import riceHarvest3200 from './rice-harvest-3200.webp';
import rajshahiMango1600 from './rajshahi-mango-1600.webp';
import rajshahiMango900 from './rajshahi-mango-900.webp';
import rajshahiMango2400 from './rajshahi-mango-2400.webp';
import rajshahiMango3200 from './rajshahi-mango-3200.webp';

// The farmer's own photos (village fields, a mantis on the paddy, sunset), AI-sharpened like the rest.
import villageSky900 from './village-sky-900.webp';
import villageSky1600 from './village-sky-1600.webp';
import villageSky2400 from './village-sky-2400.webp';
import villageSky3200 from './village-sky-3200.webp';
import sunsetFields900 from './sunset-fields-900.webp';
import sunsetFields1600 from './sunset-fields-1600.webp';
import sunsetFields2400 from './sunset-fields-2400.webp';
import sunsetFields3200 from './sunset-fields-3200.webp';
import mantisPaddy900 from './mantis-paddy-900.webp';
import mantisPaddy1600 from './mantis-paddy-1600.webp';
import mantisPaddy2400 from './mantis-paddy-2400.webp';
import mantisPaddy3200 from './mantis-paddy-3200.webp';

// Bangladesh, division by division (photos supplied by the owner; 4x Real-ESRGAN, public/models/realesr-general-x4v3-dn50.onnx,
// blended 35% with a plain enlargement so fine texture stays natural).
import hillClouds900 from './hill-clouds-900.webp';
import hillClouds1600 from './hill-clouds-1600.webp';
import hillClouds2400 from './hill-clouds-2400.webp';
import hillClouds3200 from './hill-clouds-3200.webp';
import hillWaterfall900 from './hill-waterfall-900.webp';
import hillWaterfall1600 from './hill-waterfall-1600.webp';
import hillWaterfall2400 from './hill-waterfall-2400.webp';
import hillWaterfall3200 from './hill-waterfall-3200.webp';
import wetlandBoardwalk900 from './wetland-boardwalk-900.webp';
import wetlandBoardwalk1600 from './wetland-boardwalk-1600.webp';
import wetlandBoardwalk2400 from './wetland-boardwalk-2400.webp';
import wetlandBoardwalk3200 from './wetland-boardwalk-3200.webp';
import guavaBoat900 from './guava-boat-900.webp';
import guavaBoat1600 from './guava-boat-1600.webp';
import guavaBoat2400 from './guava-boat-2400.webp';
import guavaBoat3200 from './guava-boat-3200.webp';
import teestaBarrage900 from './teesta-barrage-900.webp';
import teestaBarrage1600 from './teesta-barrage-1600.webp';
import teestaBarrage2400 from './teesta-barrage-2400.webp';
import teestaBarrage3200 from './teesta-barrage-3200.webp';
import bullockCart900 from './bullock-cart-900.webp';
import bullockCart1600 from './bullock-cart-1600.webp';
import bullockCart2400 from './bullock-cart-2400.webp';
import bullockCart3200 from './bullock-cart-3200.webp';
import stonyRiver900 from './stony-river-900.webp';
import stonyRiver1600 from './stony-river-1600.webp';
import stonyRiver2400 from './stony-river-2400.webp';
import stonyRiver3200 from './stony-river-3200.webp';

const W = 1672, H = 941;

// The neighbouring countries: Wikimedia Commons photos (author and licence in `credit`), resized from originals of
// 4,300–5,200 px.
import abroadIndia900 from './abroad/india-900.webp';
import abroadIndia1600 from './abroad/india-1600.webp';
import abroadIndia2400 from './abroad/india-2400.webp';
import abroadIndia3200 from './abroad/india-3200.webp';
import abroadPakistan900 from './abroad/pakistan-900.webp';
import abroadPakistan1600 from './abroad/pakistan-1600.webp';
import abroadPakistan2400 from './abroad/pakistan-2400.webp';
import abroadPakistan3200 from './abroad/pakistan-3200.webp';
import abroadNepal900 from './abroad/nepal-900.webp';
import abroadNepal1600 from './abroad/nepal-1600.webp';
import abroadNepal2400 from './abroad/nepal-2400.webp';
import abroadNepal3200 from './abroad/nepal-3200.webp';
import abroadBhutan900 from './abroad/bhutan-900.webp';
import abroadBhutan1600 from './abroad/bhutan-1600.webp';
import abroadBhutan2400 from './abroad/bhutan-2400.webp';
import abroadBhutan3200 from './abroad/bhutan-3200.webp';
import abroadAfghanistan900 from './abroad/afghanistan-900.webp';
import abroadAfghanistan1600 from './abroad/afghanistan-1600.webp';
import abroadAfghanistan2400 from './abroad/afghanistan-2400.webp';
import abroadAfghanistan3200 from './abroad/afghanistan-3200.webp';
// Landscapes of the neighbouring countries for the hero slideshow, supplied for the project (no outside credit).
import viewIndia900 from './abroad/india-view-900.webp';
import viewIndia1600 from './abroad/india-view-1600.webp';
import viewIndia2400 from './abroad/india-view-2400.webp';
import viewIndia3200 from './abroad/india-view-3200.webp';
import viewPakistan900 from './abroad/pakistan-view-900.webp';
import viewPakistan1600 from './abroad/pakistan-view-1600.webp';
import viewPakistan2400 from './abroad/pakistan-view-2400.webp';
import viewPakistan3200 from './abroad/pakistan-view-3200.webp';
import viewNepal900 from './abroad/nepal-view-900.webp';
import viewNepal1600 from './abroad/nepal-view-1600.webp';
import viewNepal2400 from './abroad/nepal-view-2400.webp';
import viewNepal3200 from './abroad/nepal-view-3200.webp';
import viewBhutan900 from './abroad/bhutan-view-900.webp';
import viewBhutan1600 from './abroad/bhutan-view-1600.webp';
import viewBhutan2400 from './abroad/bhutan-view-2400.webp';
import viewBhutan3200 from './abroad/bhutan-view-3200.webp';
import viewAfghanistan900 from './abroad/afghanistan-view-900.webp';
import viewAfghanistan1600 from './abroad/afghanistan-view-1600.webp';
import viewAfghanistan2400 from './abroad/afghanistan-view-2400.webp';
import viewAfghanistan3200 from './abroad/afghanistan-view-3200.webp';

export const IMAGES = {
  villageSky: {
    src: villageSky1600, srcSet: `${villageSky900} 900w, ${villageSky1600} 1600w, ${villageSky2400} 2400w, ${villageSky3200} 3200w`, width: 3200, height: 2400, focus: '62% 58%',
    alt: { bn: 'গ্রামের মাঠ, গাছের সারি আর বিকেলের মেঘলা নীল আকাশ', en: 'Village fields, a row of trees and an afternoon sky with clouds' },
  },
  sunsetFields: {
    src: sunsetFields1600, srcSet: `${sunsetFields900} 900w, ${sunsetFields1600} 1600w, ${sunsetFields2400} 2400w, ${sunsetFields3200} 3200w`, width: 3200, height: 2400, focus: '56% 55%',
    alt: { bn: 'সূর্য ডোবার সময় সবুজ খেত, গাছের সারি আর লালচে পাতা', en: 'Green fields, a tree line and reddish leaves at sunset' },
  },
  mantisPaddy: {
    src: mantisPaddy1600, srcSet: `${mantisPaddy900} 900w, ${mantisPaddy1600} 1600w, ${mantisPaddy2400} 2400w, ${mantisPaddy3200} 3200w`, width: 3200, height: 4267, focus: '56% 57%',
    alt: { bn: 'ধানক্ষেতের ওপর ডালে বসা একটি সবুজ ম্যান্টিস পোকা', en: 'A green praying mantis on a twig above a paddy field' },
  },
  hillClouds: {
    src: hillClouds1600, srcSet: `${hillClouds900} 900w, ${hillClouds1600} 1600w, ${hillClouds2400} 2400w, ${hillClouds3200} 3200w`, width: 3200, height: 2018, focus: '70% 62%',
    alt: { bn: 'পাহাড়ের ওপর বাঁশের বেড়া আর সবুজ টিনের চালের ঘর, নিচে মেঘের সাগর আর দূরে নীল পাহাড়', en: 'A bamboo cottage with a green tin roof on a hilltop, a sea of cloud below and blue hills beyond' },
  },
  hillWaterfall: {
    src: hillWaterfall1600, srcSet: `${hillWaterfall900} 900w, ${hillWaterfall1600} 1600w, ${hillWaterfall2400} 2400w, ${hillWaterfall3200} 3200w`, width: 3200, height: 1744, focus: '58% 55%',
    alt: { bn: 'সবুজ বনের মাঝে পাথরের ধাপ বেয়ে নামা ঝরনা, নিচে সবুজ পানির কুণ্ড', en: 'A waterfall stepping down layered rock in green forest into a clear green pool' },
  },
  wetlandBoardwalk: {
    src: wetlandBoardwalk1600, srcSet: `${wetlandBoardwalk900} 900w, ${wetlandBoardwalk1600} 1600w, ${wetlandBoardwalk2400} 2400w, ${wetlandBoardwalk3200} 3200w`, width: 3200, height: 2133, focus: '56% 58%',
    alt: { bn: 'আকাশ থেকে দেখা বিল: শাপলা-পাতায় ঢাকা পানির ওপর আঁকাবাঁকা কাঠের সাঁকো, দুই পাশে ঘন বন', en: 'A wetland from the air: a zigzag wooden walkway over water covered in lily pads, dense forest on both banks' },
  },
  guavaBoat: {
    src: guavaBoat1600, srcSet: `${guavaBoat900} 900w, ${guavaBoat1600} 1600w, ${guavaBoat2400} 2400w, ${guavaBoat3200} 3200w`, width: 3200, height: 2135, focus: '64% 62%',
    alt: { bn: 'খালে ডিঙি নৌকা ভরা সবুজ-হলুদ পেয়ারা, দুজন মাঝি বৈঠা বাইছেন', en: 'A dinghy full of green and yellow guavas on a canal, two boatmen poling it along' },
  },
  teestaBarrage: {
    src: teestaBarrage1600, srcSet: `${teestaBarrage900} 900w, ${teestaBarrage1600} 1600w, ${teestaBarrage2400} 2400w, ${teestaBarrage3200} 3200w`, width: 3200, height: 2133, focus: '58% 52%',
    alt: { bn: 'আকাশ থেকে তিস্তা ব্যারেজ: চওড়া নদীর ওপর গেটের সারি, পাশে বালুর চর', en: 'Teesta Barrage from the air: a row of gates across the wide river, sandbars alongside' },
  },
  bullockCart: {
    src: bullockCart1600, srcSet: `${bullockCart900} 900w, ${bullockCart1600} 1600w, ${bullockCart2400} 2400w, ${bullockCart3200} 3200w`, width: 3200, height: 2286, focus: '68% 58%',
    alt: { bn: 'সবুজ ধানক্ষেতের আলপথে গরুর গাড়িতে ধানের আঁটি নিয়ে যাচ্ছেন কৃষক, মাথার ওপর সাদা মেঘ', en: 'A farmer taking sheaves of paddy home by bullock cart along a field bund, white clouds overhead' },
  },
  stonyRiver: {
    src: stonyRiver1600, srcSet: `${stonyRiver900} 900w, ${stonyRiver1600} 1600w, ${stonyRiver2400} 2400w, ${stonyRiver3200} 3200w`, width: 3200, height: 2023, focus: '55% 58%',
    alt: { bn: 'দুই পাশে সবুজ পাহাড়, মাঝ দিয়ে বয়ে চলা স্বচ্ছ পানির পাথুরে নদী', en: 'A clear stony river running between green hills' },
  },
  // Misty aerial at dawn; open haze on the left is where the hero text sits.
  heroDawn: {
    src: heroAerialDawn1600, srcSet: `${heroAerialDawn900} 900w, ${heroAerialDawn1600} 1600w, ${heroAerialDawn2400} 2400w, ${heroAerialDawn3200} 3200w`, width: W, height: H, focus: '70% 55%',
    alt: { bn: 'ভোরের কুয়াশায় ঢাকা ধানক্ষেত, নদী আর গাছপালার আকাশ থেকে তোলা ছবি', en: 'Aerial view of paddy fields, a river and tree lines in morning mist' },
  },
  // Aerial with three plots outlined in white — used wherever a farmer marks their own land.
  landParcels: {
    src: landParcels1600, srcSet: `${landParcels900} 900w, ${landParcels1600} 1600w, ${landParcels2400} 2400w, ${landParcels3200} 3200w`, width: W, height: H, focus: '52% 62%',
    alt: { bn: 'আকাশ থেকে দেখা খেতের মধ্যে সাদা দাগে চিহ্নিত কয়েকটি জমি, পাশে পুকুর ও খাল', en: 'Aerial view of farm plots with three fields outlined in white, beside ponds and a canal' },
  },
  // Close-up of young seedlings with flooded paddy at sunrise — crop advice / today's tasks.
  seedlings: {
    src: seedlings1600, srcSet: `${seedlings900} 900w, ${seedlings1600} 1600w, ${seedlings2400} 2400w, ${seedlings3200} 3200w`, width: W, height: 940, focus: '30% 60%',
    alt: { bn: 'ভোরের আলোয় শিশিরভেজা চারা, পেছনে পানি দেওয়া ধানের জমি', en: 'Dew-covered seedlings at sunrise with flooded paddy behind' },
  },
  // Satellite-style patchwork of fields and a winding river — Earth observation / NASA data.
  satellite: {
    src: satellite1600, srcSet: `${satellite900} 900w, ${satellite1600} 1600w, ${satellite2400} 2400w, ${satellite3200} 3200w`, width: W, height: 940, focus: '50% 50%',
    alt: { bn: 'উপগ্রহ থেকে দেখা নানা রঙের খেত আর আঁকাবাঁকা নদী', en: 'Satellite-style view of patchwork fields and a winding river' },
  },
  // Farmer checking rice panicles at sunrise — people, support and impact.
  farmer: {
    src: farmer1600, srcSet: `${farmer900} 900w, ${farmer1600} 1600w, ${farmer2400} 2400w, ${farmer3200} 3200w`, width: W, height: H, focus: '22% 45%',
    alt: { bn: 'ভোরে ধানক্ষেতে দাঁড়িয়ে একজন কৃষক ধানের শিষ দেখছেন', en: 'A farmer checking rice panicles in his field at sunrise' },
  },
  // Balia–Chauhat bridge in Dhamrai, Dhaka: the river, paddy and village trees around Chauhat at midday.
  dhamraiBridge: {
    src: dhamraiBridge1600, srcSet: `${dhamraiBridge900} 900w, ${dhamraiBridge1600} 1600w, ${dhamraiBridge2400} 2400w, ${dhamraiBridge3200} 3200w`, width: 1600, height: 903, focus: '58% 60%',
    alt: { bn: 'ধামরাইয়ে বালিয়া-চৌহাট সেতু: নদীর ওপর সেতু, দুই পাশে সবুজ ধানক্ষেত আর গাছপালা', en: 'The Balia–Chauhat bridge in Dhamrai: a bridge over the river with green paddy fields and trees on both banks' },
  },
  // Golden paddy being cut and threshed with a pedal thresher, a village and river behind.
  riceHarvest: {
    src: riceHarvest1600, srcSet: `${riceHarvest900} 900w, ${riceHarvest1600} 1600w, ${riceHarvest2400} 2400w, ${riceHarvest3200} 3200w`, width: 1600, height: 872, focus: '55% 60%',
    alt: { bn: 'সোনালি ধানক্ষেতে কৃষকেরা ধান কাটছেন, পায়ে চালানো মাড়াই যন্ত্রে মাড়াই হচ্ছে, মাথায় ধানের আঁটি নিয়ে আলপথে হাঁটছেন; পেছনে গ্রাম আর নদী', en: 'Farmers cutting golden paddy and threshing it with a pedal thresher, carrying sheaves along the field bund, with a village and river behind' },
  },
  // Ripe mangoes hanging in clusters — Rajshahi's famous mangoes.
  rajshahiMango: {
    src: rajshahiMango1600, srcSet: `${rajshahiMango900} 900w, ${rajshahiMango1600} 1600w, ${rajshahiMango2400} 2400w, ${rajshahiMango3200} 3200w`, width: 1600, height: 1065, focus: '62% 50%',
    alt: { bn: 'গাছে থোকায় থোকায় ঝুলছে পাকা লাল-হলুদ আম, রাজশাহীর বিখ্যাত আম', en: 'Ripe red-and-yellow mangoes hanging in clusters on the tree, Rajshahi’s famous mangoes' },
  },
  // Same field split between drought and flood — climate risk.
  droughtFlood: {
    src: droughtFlood1600, srcSet: `${droughtFlood900} 900w, ${droughtFlood1600} 1600w, ${droughtFlood2400} 2400w, ${droughtFlood3200} 3200w`, width: W, height: 940, focus: '50% 60%',
    alt: { bn: 'একই মাঠের একপাশে খরায় ফাটা মাটি, অন্যপাশে বৃষ্টিতে ডুবে যাওয়া ফসল', en: 'One field split between cracked, drought-hit soil and flooded crops under rain' },
  },
  abroadIndia: {
    src: abroadIndia1600, srcSet: `${abroadIndia900} 900w, ${abroadIndia1600} 1600w, ${abroadIndia2400} 2400w, ${abroadIndia3200} 3200w`, width: 3200, height: 2133, focus: '50% 45%',
    alt: { bn: 'পাঞ্জাবের সবুজ গমের খেত, ভারত', en: 'Green wheat in Punjab, India' },
    credit: { artist: "Jagseer S Sidhu", license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Green_Wheat_Fields_in_Punjab.jpg' },
  },
  abroadPakistan: {
    src: abroadPakistan1600, srcSet: `${abroadPakistan900} 900w, ${abroadPakistan1600} 1600w, ${abroadPakistan2400} 2400w, ${abroadPakistan3200} 3200w`, width: 3200, height: 2133, focus: '55% 40%',
    alt: { bn: 'ধান কেটে আঁটি বাঁধছেন কৃষকেরা, পাকিস্তান', en: 'Farmers bundling the cut rice, Pakistan' },
    credit: { artist: "Tariq hameed sulemani", license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Rice_crop_in_pakistan.jpg' },
  },
  abroadNepal: {
    src: abroadNepal1600, srcSet: `${abroadNepal900} 900w, ${abroadNepal1600} 1600w, ${abroadNepal2400} 2400w, ${abroadNepal3200} 3200w`, width: 3200, height: 2125, focus: '50% 55%',
    alt: { bn: 'পাহাড়ের গায়ে ধাপে ধাপে ধানক্ষেত, ঘান্দ্রুক, নেপাল', en: 'Rice terraces on the hillside, Ghandruk, Nepal' },
    credit: { artist: "Manuel Velazquez", license: 'CC BY 3.0', page: 'https://commons.wikimedia.org/wiki/File:BANCALES_EN_GHANDRUK_-_panoramio.jpg' },
  },
  abroadBhutan: {
    src: abroadBhutan1600, srcSet: `${abroadBhutan900} 900w, ${abroadBhutan1600} 1600w, ${abroadBhutan2400} 2400w, ${abroadBhutan3200} 3200w`, width: 3200, height: 2133, focus: '50% 55%',
    alt: { bn: 'পারো উপত্যকার ধানক্ষেত, ভুটান', en: 'Rice fields of the Paro valley, Bhutan' },
    credit: { artist: "Bernard Gagnon", license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Rice_fields_in_Paro,_Bhutan.jpg' },
  },
  abroadAfghanistan: {
    src: abroadAfghanistan1600, srcSet: `${abroadAfghanistan900} 900w, ${abroadAfghanistan1600} 1600w, ${abroadAfghanistan2400} 2400w, ${abroadAfghanistan3200} 3200w`, width: 3200, height: 2400, focus: '50% 88%',
    alt: { bn: 'বামিয়ানের পাহাড়ের নিচে গমের খেত, আফগানিস্তান', en: 'Wheat below the cliffs of Bamyan, Afghanistan' },
    credit: { artist: "Monikajoannah", license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Bamyan_field.jpg' },
  },
  viewIndia: {
    src: viewIndia1600, srcSet: `${viewIndia900} 900w, ${viewIndia1600} 1600w, ${viewIndia2400} 2400w, ${viewIndia3200} 3200w`, width: 3200, height: 1794, focus: '60% 55%',
    alt: { bn: 'মেঘে ঢাকা পাহাড়ের গায়ে চা-বাগান, ভারত', en: 'Tea gardens on misty hills, India' },
  },
  viewPakistan: {
    src: viewPakistan1600, srcSet: `${viewPakistan900} 900w, ${viewPakistan1600} 1600w, ${viewPakistan2400} 2400w, ${viewPakistan3200} 3200w`, width: 3200, height: 1921, focus: '58% 62%',
    alt: { bn: 'সাইফুল মুলুক হ্রদ, কাগান উপত্যকা, পাকিস্তান', en: 'Lake Saiful Muluk, Kaghan valley, Pakistan' },
  },
  viewNepal: {
    src: viewNepal1600, srcSet: `${viewNepal900} 900w, ${viewNepal1600} 1600w, ${viewNepal2400} 2400w, ${viewNepal3200} 3200w`, width: 3200, height: 2182, focus: '48% 38%',
    alt: { bn: 'সূর্যাস্তে আমা দাবলাম, খুম্বু হিমালয়, নেপাল', en: 'Ama Dablam at sunset, Khumbu Himalaya, Nepal' },
  },
  viewBhutan: {
    src: viewBhutan1600, srcSet: `${viewBhutan900} 900w, ${viewBhutan1600} 1600w, ${viewBhutan2400} 2400w, ${viewBhutan3200} 3200w`, width: 3200, height: 1732, focus: '66% 42%',
    alt: { bn: 'পুনাখা জং, পো ছু আর মো ছু নদীর মিলনে, ভুটান', en: 'Punakha Dzong where the Pho Chhu meets the Mo Chhu, Bhutan' },
  },
  viewAfghanistan: {
    src: viewAfghanistan1600, srcSet: `${viewAfghanistan900} 900w, ${viewAfghanistan1600} 1600w, ${viewAfghanistan2400} 2400w, ${viewAfghanistan3200} 3200w`, width: 3200, height: 2394, focus: '58% 45%',
    alt: { bn: 'বান্দ-ই-আমির হ্রদ, বামিয়ান, আফগানিস্তান', en: 'The Band-e-Amir lakes, Bamyan, Afghanistan' },
  },
};
