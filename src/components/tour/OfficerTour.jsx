// The complete guided tour of the upazila officer's pages: every page and every part of it, from the officer's side
// — what it is, and how it helps the day's work. It follows whichever upazila, officer and union is signed in, opens
// each page itself, lights up the part being explained (the rest of the page dims but still works, so the officer can
// try it there and then), and remembers where it stopped. Nothing here computes anything; it only points at the pages.
//   Start it from the "গাইড" button in the officer header (it sends the 'fs-officer-tour' event), or from the
//   first-visit invitation.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Compass, ListOrdered, X, Lightbulb, MousePointerClick } from 'lucide-react';
import { useStore, demo } from '../../store';
import { STORAGE_PREFIX } from '../../config/brand';
import { TourModePicker, TourPlayback, QUICK_TOUR_STEP_SECONDS, TOUR_STEP_SECONDS } from './TourPlayback';

const KEY = `${STORAGE_PREFIX}.officerTour`;
const SEEN = `${STORAGE_PREFIX}.officerTourSeen`;
// The guide style and the time played, so an auto or quick tour keeps playing if the guide mounts again (a reload, or
// a hot update while developing) instead of quietly turning into a manual one.
const MODE = `${STORAGE_PREFIX}.officerTourMode`;
const readMode = () => { try { return JSON.parse(sessionStorage.getItem(MODE)) ?? {}; } catch { return {}; } };
const saveMode = (m) => { try { if (m) sessionStorage.setItem(MODE, JSON.stringify(m)); else sessionStorage.removeItem(MODE); } catch { /* storage blocked */ } };
export const startOfficerTour = (at = 0) => window.dispatchEvent(new CustomEvent('fs-officer-tour', { detail: at }));

const CHAPTERS = [
  { bn: 'শুরু', en: 'Getting started' },
  { bn: 'আজকের চিত্র', en: 'Overview' },
  { bn: 'এলাকার সতর্কতা', en: 'Area alerts' },
  { bn: 'কৃষকের অনুরোধ', en: 'Farmer requests' },
  { bn: 'কৃষক ও জমি', en: 'Farmers and fields' },
  { bn: 'এলাকার মানচিত্র', en: 'Area map' },
  { bn: 'রোপণ রাডার', en: 'Ropan Radar' },
  { bn: 'লাগানোর সময় ও দাম', en: 'Planting and prices' },
  { bn: 'কবে কত ফসল উঠবে', en: 'Harvest timing' },
  { bn: 'উপজেলার সার্বিক চিত্র', en: 'Upazila overview' },
  { bn: 'ভয়েস সহকারী', en: 'Voice assistant' },
  { bn: 'আপনার কাজের দিন', en: 'Your working day' },
];

// A step: chapter, page (a path, or a function of the signed-in context), the part to light up (`sel`: a CSS
// selector; `text`: the part's own label in either language, widened to `up`), and three lines: what it is (`say`),
// how it helps (`help`), and what to try (`act`). {upz}, {union}, {officer} and {district} are filled in.
const t = (bn, en) => ({ bn, en });
const STEPS = [
  // ---- 0. Getting started
  { ch: 0, path: '/officer', title: t('স্বাগতম, {officer}', 'Welcome, {officer}'),
    say: t('এটা {upz} উপজেলা কৃষি অফিসের ডিজিটাল কাজের ঘর। কৃষকের অনুরোধ, এলাকার সতর্কতা, কে কী লাগাচ্ছেন, উপগ্রহে মাঠের অবস্থা আর বাজারদর — সব এক জায়গায়।', 'This is the digital desk of the {upz} upazila agriculture office. Farmers’ requests, area alerts, who is planting what, the fields from satellites and market prices — all in one place.'),
    help: t('খাতা, ফোনের তালিকা আর আলাদা আলাদা সরকারি প্রতিবেদন ঘাঁটার সময় বাঁচে; কোন কাজটা আগে করবেন, পাতাগুলোই সাজিয়ে দেয়।', 'It saves the time spent on registers, call lists and separate government reports, and puts the most urgent work first.'),
    act: t('গাইডে সব পাতা ঘুরে দেখুন। "অধ্যায়" থেকে যেকোনো অংশে লাফ দিতে পারেন।', 'Explore every page in the guide. Jump to any part from “Chapters” at any time.') },
  { ch: 0, path: '/officer', text: t('কোন ইউনিয়ন বা পৌরসভা দেখবেন', 'Union or municipality to look at'), up: 'div.rounded-2xl', alt: 'button[aria-label="মেনু খুলুন"], button[aria-label="Open menu"]',
    title: t('আপনার পরিচয় আর ইউনিয়ন বাছাই', 'Who you are, and which union'),
    say: t('বাঁ পাশে আপনার নাম, উপজেলা, জেলা আর বিভাগ। নিচের তালিকা থেকে যে ইউনিয়ন বা পৌরসভা দেখবেন সেটা বাছুন — এখন দেখছেন {union}।', 'On the left: your name, upazila, district and division. Pick the union or municipality to look at from the list below — now {union}.'),
    help: t('সকালে যে ইউনিয়নে মাঠ পরিদর্শনে যাবেন, সেটা বেছে নিলে সতর্কতা, অনুরোধ আর মানচিত্র সব সেই ইউনিয়নের হয়ে যায়।', 'Choose the union you are visiting today and the alerts, requests and map all switch to it.'),
    act: t('তালিকাটা খুলে আরেকটা ইউনিয়ন বেছে দেখুন (ফোনে এটা ☰ মেনুর ভেতরে)।', 'Open the list and try another union (on a phone it is inside the ☰ menu).') },
  { ch: 0, path: '/officer', sel: 'nav[aria-label="কর্মকর্তার পাতা"], nav[aria-label="Officer pages"]', alt: 'button[aria-label="মেনু খুলুন"], button[aria-label="Open menu"]',
    title: t('মেনু সাজানো আপনার দিনের ক্রমে', 'The menu follows your day'),
    say: t('আজকের কাজ (চিত্র, সতর্কতা, অনুরোধ) → আমার এলাকা (কৃষক, মানচিত্র) → মৌসুমের পরিকল্পনা (রাডার, লাগানোর সময়, ফসল তোলা) → পুরো উপজেলা → সহায়তা। লাল বা কমলা সংখ্যা মানে খোলা কাজ।', 'Today’s work (overview, alerts, requests) → my area (farmers, map) → season planning (radar, planting, harvest) → whole upazila → help. A red or amber number means work waiting.'),
    help: t('সংখ্যাগুলো দেখেই বোঝা যায় আজ কোথায় হাত দিতে হবে; কিছু খুঁজতে হয় না।', 'The badges tell you where today’s work is without searching.'),
    act: t('ফোনে মেনু খোলে ওপরের বাঁয়ের ☰ বোতামে।', 'On a phone, the ☰ button at the top left opens the menu.') },
  { ch: 0, path: '/officer', sel: 'input[placeholder*="খুঁজুন"], input[placeholder*="Search"]', alt: 'button[aria-label="খুঁজুন"], button[aria-label="Search"]',
    title: t('কৃষক বা গ্রাম খুঁজুন', 'Find a farmer or a village'),
    say: t('যেকোনো কৃষক বা গ্রামের নাম লিখলেই তাঁর জমি আর অনুরোধ খুলে যায়। কিবোর্ডে "/" চাপলে সরাসরি এখানে আসে।', 'Type any farmer’s or village’s name to open their fields and requests. Press “/” on the keyboard to jump here.'),
    help: t('কেউ ফোন করলে নাম বলামাত্র তাঁর পুরো তথ্য সামনে চলে আসে।', 'When a farmer phones, their whole record is up as soon as they say their name.'),
    act: t('একটা গ্রামের নাম লিখে দেখুন (ফোনে আগে ওপরের খোঁজার বোতাম চাপুন)।', 'Try typing a village name (on a phone, tap the search button at the top first).') },
  { ch: 0, path: '/officer', sel: 'button[aria-label*="খোলা অনুরোধ"], button[aria-label*="open requests"]',
    title: t('ঘণ্টা আর ভাষা', 'The bell and the language'),
    say: t('ঘণ্টার গায়ের সংখ্যা মানে উত্তরের অপেক্ষায় থাকা অনুরোধ, চাপ দিলে তালিকা খোলে। পাশের বোতামে বাংলা আর ইংরেজি বদলানো যায়; বাঁয়ে "ফিরে যান" আগের পাতায় নেয়।', 'The number on the bell is requests waiting for a reply; tap it for the list. The next button switches Bangla and English, and “Back” on the left returns to the previous page.'),
    help: t('যেকোনো পাতা থেকে এক চাপে অপেক্ষমাণ কৃষকদের কাছে পৌঁছানো যায়।', 'From any page, waiting farmers are one tap away.') },
  { ch: 0, path: '/officer', text: t('কৃষকের পাতায় যান', 'Go to the farmer view'), up: 'div', alt: 'button[aria-label="মেনু খুলুন"], button[aria-label="Open menu"]',
    title: t('কৃষকের চোখে দেখা, তথ্যের অবস্থা', 'See it as a farmer; data status'),
    say: t('"কৃষকের পাতায় যান" চাপলে কৃষক যা দেখেন সেটাই দেখবেন। নিচের চিপগুলো বলে আবহাওয়া আর মাটির তথ্য আসল (নাসা, SoilGrids) কি না; "নমুনা আবার শুরু করুন" সব নমুনা কাজ প্রথম অবস্থায় ফেরায়।', '“Go to the farmer view” shows exactly what farmers see. The chips below say whether the weather and soil data are real (NASA, SoilGrids); “Restart the sample” resets all sample work.'),
    help: t('কৃষককে ফোনে কিছু বোঝানোর আগে নিজে সেই পাতাটা দেখে নিতে পারেন।', 'Before explaining something to a farmer on the phone, you can look at their screen yourself.'),
    act: t('ফোনে এগুলো ☰ মেনুর নিচের দিকে।', 'On a phone these sit at the bottom of the ☰ menu.') },

  // ---- 1. Overview
  { ch: 1, path: '/officer', text: t('খোলা অনুরোধ', 'Open requests'), up: '.grid',
    title: t('এক নজরে আজকের অবস্থা', 'Today at a glance'),
    say: t('পাঁচটা ঘর: খোলা অনুরোধ, এলাকার সতর্কতা, কাছাকাছি কয়েক জমিতে একই সমস্যা, পরিকল্পনা করা জমির ভাগ আর দাম পড়ার ঝুঁকি। প্রতিটায় চাপ দিলে তার পুরো পাতা খোলে।', 'Five tiles: open requests, area alerts, the same problem on nearby fields, the share of fields with a plan, and the price-drop risk. Tap any tile for its full page.'),
    help: t('অফিসে ঢুকে প্রথম দশ সেকেন্ডেই বোঝা যায় আজ কোনদিকে নজর দেবেন।', 'Within ten seconds of sitting down you know where today needs you.') },
  { ch: 1, path: '/officer', text: t('সবাইকে পরামর্শ পাঠান', 'Advise them all'), up: 'section, .surface-card, [class*="rounded-"]',
    title: t('একই সমস্যা কয়েক জমিতে: আগাম সতর্কতা', 'One problem on several fields: an early warning'),
    say: t('কাছাকাছি কয়েকটা জমি থেকে এক সপ্তাহে একই লক্ষণের অনুরোধ এলে অ্যাপ সেগুলো একটা গুচ্ছ ধরে দেখায়। "সবাইকে পরামর্শ পাঠান" চাপলে লেখা খসড়া পাবেন; বদলে নিয়ে একবারে ওই এলাকার সব কৃষককে পাঠান।', 'When several nearby fields report the same symptom within a week, the app groups them. “Advise them all” gives you a draft to edit and send to every farmer there at once.'),
    help: t('রোগ বা পোকা ছড়ানোর আগেই পুরো এলাকাকে জানানো যায় — একজন একজন করে ফোন করতে হয় না।', 'You warn the whole area before a disease or pest spreads, without phoning farmers one by one.'),
    act: t('কোনো গুচ্ছ না থাকলে এই অংশটা দেখা যায় না — তখন বুঝবেন এলাকায় ছড়ানো সমস্যা নেই।', 'If there is no cluster this part is hidden — which means nothing is spreading.') },
  { ch: 1, path: '/officer', text: t('এলাকার মানচিত্র', 'Area map'), up: 'section, .surface-card',
    title: t('ইউনিয়নের মানচিত্র', 'The union on a map'),
    say: t('প্রতিটা বিন্দু একটা জমি, রং বলে কী লাগানো হচ্ছে; গোল দাগ মানে অনুরোধ এসেছে। "বড় করে দেখুন" পুরো মানচিত্রের পাতা খোলে।', 'Each dot is a field, its colour the crop being planted; a ringed dot is a request. “Full map” opens the full map page.'),
    help: t('মাঠে যাওয়ার আগে কোন গ্রামে কোন সমস্যা, সেটা দেখে রাস্তা ঠিক করতে পারেন।', 'Before going out, see which village has which problem and plan your route.') },
  { ch: 1, path: '/officer', text: t('আগে যেগুলো দেখবেন', 'Look at these first'), up: 'section, .surface-card',
    title: t('আগে যেগুলো দেখবেন', 'Look at these first'),
    say: t('জরুরি অনুরোধ ওপরে, তারপর নতুন। প্রতিটায় কৃষকের নাম, ফসল, গ্রাম, লক্ষণ, আর ছবি থাকলে ফসলের ডাক্তারের প্রথম ধারণা।', 'Urgent requests on top, then the new ones. Each shows the farmer, crop, village, symptom and, with a photo, the crop doctor’s first look.'),
    help: t('দিনে বিশটা অনুরোধ এলেও কোনটা আগে ধরবেন তা নিয়ে ভাবতে হয় না।', 'Even with twenty requests a day, there is no doubt which comes first.'),
    act: t('যেকোনো অনুরোধে চাপ দিলে তার পুরো পাতা খোলে — পরের অধ্যায়ে আমরা সেটাই দেখব।', 'Tap any request to open it — the next chapters do just that.') },
  { ch: 1, path: '/officer', text: t('কর্মকর্তার যাচাই দরকার', 'Officer review needed'), up: 'section, .surface-card, details, div.rounded-2xl',
    title: t('যে হিসাবগুলো আপনার যাচাই চায়', 'The rules that need your review'),
    say: t('অ্যাপের প্রতিটা সীমা (যেমন কত গরমে গমের ক্ষতি, কত লবণে ধান টেকে না) কোথা থেকে নেওয়া, তার তালিকা এখানে খোলে। কিছু সংখ্যা আপনার এলাকার অভিজ্ঞতায় মিলিয়ে নেওয়ার কথা।', 'Every threshold the app uses (how much heat hurts wheat, how much salt rice can stand) is listed here with its source. Some are meant to be checked against your area’s experience.'),
    help: t('কৃষককে যে পরামর্শ যায়, তার নিয়ম আপনি নিজে দেখে নিশ্চিত হতে পারেন — অন্ধ বিশ্বাস নয়।', 'You can see and check the rules behind every piece of advice — nothing taken on trust.') },

  // ---- 2. Area alerts
  { ch: 2, path: '/officer/alerts', sel: 'main h1',
    title: t('এলাকার সব সতর্কতা এক পাতায়', 'Every alert for the area on one page'),
    say: t('ছয় রকম সতর্কতা আসে: আগামী ৮ দিনের আবহাওয়া, রোগের উপযোগী আবহাওয়া, উপগ্রহে দুর্বল দেখানো জমি, কাছাকাছি একই সমস্যার গুচ্ছ, খুব শুকনো জমি (FAO-56 পানির হিসাব) আর দাম পড়ার ঝুঁকি। সবচেয়ে জরুরিটা সবার ওপরে।', 'Six kinds arrive: the next 8 days’ weather, weather that suits disease, fields that look weak from the satellite, clusters of the same problem, very dry fields (FAO-56 water balance) and price-drop risk. The most urgent sits on top.'),
    help: t('মাঠে কিছু ঘটার আগেই জানতে পারেন, আর কৃষকও আগে থেকে প্রস্তুত থাকেন।', 'You hear of trouble before it happens in the field, and farmers get time to prepare.') },
  { ch: 2, path: '/officer/alerts', text: t('কৃষকদের সতর্কবার্তা পাঠান', 'Warn the farmers'), up: 'section, .surface-card, div.rounded-2xl', alt: ['main textarea', 'main h1'],
    title: t('এক চাপে সতর্কবার্তা', 'A warning in one tap'),
    say: t('আবহাওয়ার সতর্কতায় একটা লেখা খসড়া থাকে (যেমন "দুই দিন ভারী বৃষ্টি, এখন ওষুধ দেবেন না")। বদলে নিয়ে পাঠালে ইউনিয়নের পরিকল্পনা করা সব কৃষক পান।', 'A weather alert comes with a drafted message (e.g. “two days of heavy rain, do not spray now”). Edit it and send, and every farmer in the union with a plan gets it.'),
    help: t('ঝড় বা ভারী বৃষ্টির আগে মিনিটের মধ্যে পুরো ইউনিয়নকে জানানো যায়।', 'Before a storm or a downpour, the whole union hears from you within minutes.'),
    act: t('জরুরি সতর্কতার খসড়া আগে থেকেই খোলা থাকে: লেখা বদলে "পাঠান" চাপুন। কোনো সতর্কতা না থাকলে এই অংশ দেখা যাবে না।', 'An urgent alert opens with its draft ready: edit it and press “Send”. With no alert at all, this part is not shown.') },

  // ---- 3. Farmer requests
  { ch: 3, path: '/officer/requests', sel: 'main h1',
    title: t('কে কী জানতে চেয়েছেন', 'Who needs what'),
    say: t('কৃষকেরা অ্যাপ, এসএমএস বা ফোনে যা জানিয়েছেন, সব অনুরোধ এখানে: জরুরিগুলো ওপরে, উত্তর দেওয়াগুলো নিচে।', 'Everything farmers sent by app, SMS or phone: urgent ones first, answered ones below.'),
    help: t('কোনো অনুরোধ হারায় না, কে কতদিন অপেক্ষা করছেন সব চোখের সামনে।', 'No request gets lost, and you can see how long each farmer has waited.') },
  { ch: 3, path: (c) => (c.req ? `/officer/requests/${c.req}` : '/officer/requests'), text: t('কৃষক যা লিখেছেন', 'What the farmer wrote'), up: 'section, .surface-card, div.rounded-2xl',
    title: t('একটা অনুরোধের ভেতরে', 'Inside one request'),
    say: t('কৃষকের কথা, কত জমিতে আর কবে থেকে, কীভাবে জানাতে চান (অ্যাপে না এসএমএসে), আর তাঁর জমির মাটির পানির অবস্থা।', 'What the farmer said, how much of the field and since when, how they want the answer (app or SMS), and their field’s soil-water state.'),
    help: t('কৃষককে আবার ফোন করে খুঁটিনাটি জিজ্ঞেস করতে হয় না।', 'No need to call back for the details.') },
  { ch: 3, path: (c) => (c.req ? `/officer/requests/${c.req}` : '/officer/requests'), text: t('ফসলের ডাক্তারের ধারণা', 'Crop doctor’s first look'), up: 'section, .surface-card, div.rounded-2xl',
    title: t('ছবি আর ফসলের ডাক্তারের প্রথম ধারণা', 'The photo and the crop doctor’s first look'),
    say: t('ছবি থাকলে AI কী রোগ বা পোকা ভাবছে আর কতটা নিশ্চিত, তা দেখায়। ৭০ শতাংশের কম নিশ্চিত হলে স্পষ্ট বলে দেয় আপনার নিজের চোখে দেখা দরকার।', 'With a photo, it shows what the AI thinks it is and how sure it is. Under 70% sure, it says plainly that your own eyes are needed.'),
    help: t('প্রথম ধারণা তৈরি থাকে, আপনি শুধু যাচাই করেন — সিদ্ধান্ত সবসময় আপনার।', 'A first guess is ready and you only check it — the decision stays yours.'),
    act: t('এই অনুরোধে ছবি না থাকলে অংশটা দেখা যাবে না।', 'If this request has no photo, this part is not shown.') },
  { ch: 3, path: (c) => (c.req ? `/officer/requests/${c.req}` : '/officer/requests'), text: t('জমিতে আগামী ৩ দিন', 'The next 3 days at the field'), up: 'section, .surface-card, div.rounded-2xl',
    title: t('কৃষকের জমি, আশপাশ আর আগামী তিন দিন', 'The field, its neighbours and the next three days'),
    say: t('জমির জায়গা, আশপাশে একই সমস্যা আছে কি না, আর ওই জমিতে আগামী তিন দিনের লাইভ আবহাওয়া: দুই দিনে বৃষ্টি হলে অ্যাপ বলে এখন ওষুধ বা সার দিতে মানা করুন, ধুয়ে যাবে।', 'Where the field is, whether neighbours have the same trouble, and the live weather there for three days: if rain is due within two, it says to hold off sprays and fertiliser, which would wash away.'),
    help: t('পরামর্শটা ওই দিনের আবহাওয়ার সঙ্গে মিলিয়ে দিতে পারেন, ফলে কৃষকের টাকা নষ্ট হয় না।', 'Your advice matches that week’s weather, so the farmer’s money isn’t washed away.') },
  { ch: 3, path: (c) => (c.req ? `/officer/requests/${c.req}` : '/officer/requests'), sel: '#reply',
    title: t('উত্তর পাঠানো', 'Sending the reply'),
    say: t('"খসড়া বাছুন" থেকে তৈরি উত্তর নিন বা নিজে লিখুন; এসএমএসে গেলে কত ভাগে যাবে তাও দেখায়। "আরও ছবি চান" বা "জমিতে যাবেন" এক চাপে জানানো যায়।', 'Take a ready reply from “Pick a draft” or write your own; for SMS it shows how many parts it will take. “Ask for photos” or “Visit the field” go out in one tap.'),
    help: t('উত্তর সঙ্গে সঙ্গে কৃষকের "সাহায্য" পাতায় আর ঘণ্টায় পৌঁছায় — দিনে অনেক কৃষককে কম সময়ে উত্তর দেওয়া যায়।', 'The answer reaches the farmer’s Help page and bell at once — you can answer many more farmers in a day.'),
    act: t('একটা খসড়া বেছে পাঠিয়ে দেখুন; নমুনা অ্যাকাউন্ট, তাই কোনো আসল কৃষকের কাছে যাবে না।', 'Pick a draft and send it; this is a sample account, so it reaches no real farmer.') },

  // ---- 4. Farmers and fields
  { ch: 4, path: '/officer/farmers', sel: 'main h1',
    title: t('ইউনিয়নের সব কৃষক', 'Every farmer in the union'),
    say: t('কে কী লাগাচ্ছেন, কার অনুরোধ খোলা, সেচের পানি কোথা থেকে। নাম বা গ্রাম দিয়ে খুঁজুন, ফসল দিয়ে ছাঁকুন, "আমার ইউনিয়ন" থেকে "সব ইউনিয়ন" করে পুরো উপজেলা দেখুন।', 'Who plants what, whose request is open, where the irrigation comes from. Search by name or village, filter by crop, and switch “My union” to “All unions” for the whole upazila.'),
    help: t('মৌসুমে কতজন কোন ফসল করছেন, খাতা না খুলেই জানা যায় — প্রতিবেদন লিখতে সুবিধা।', 'How many farmers grow which crop this season, without opening a register — handy for reports.'),
    act: t('"ফসল দিয়ে ছাঁকুন" থেকে একটা ফসল বেছে দেখুন।', 'Try “Filter by crop”.') },
  { ch: 4, path: '/officer/farmers', text: t('যাচাই করুন', 'Check'), up: 'li, tr, a, div.rounded-2xl', alt: 'main input',
    title: t('যে জমিগুলো আপনার যাচাই চায়', 'Fields that need your check'),
    say: t('কৃষক নতুন জমি যোগ করলে বা জমির অবস্থান বদলালে তালিকায় "যাচাই করুন" চিহ্ন আসে, পাশে আগের অবস্থান।', 'When a farmer adds a field or moves one, it is flagged “Check”, with the old position beside it.'),
    help: t('উপজেলা অফিসের জমির নিবন্ধন সঠিক থাকে।', 'The office’s field register stays right.'),
    act: t('এখন কোনো বদল না থাকলে চিহ্নটা দেখা যাবে না।', 'With no changes pending, no flag shows.') },
  { ch: 4, path: (c) => (c.farmer ? `/officer/farmers/${c.farmer}` : '/officer/farmers'), text: t('এই জমির জন্য পরামর্শ', 'Recommendation for this field'), up: 'section, .surface-card',
    title: t('একজন কৃষকের পুরো খাতা', 'One farmer’s whole record'),
    say: t('জমির মানচিত্র, এই রবিতে ও গত রবিতে কী, অ্যাপের পরামর্শ (কৃষকের নিজের চাওয়া বাদ দিয়ে সব দিক সমান ধরে), দাম পড়ার ঝুঁকি আর তাঁর আগের সব অনুরোধ।', 'The field map, this Rabi and last, the app’s recommendation (all goals weighed equally, without the farmer’s own preferences), the price-drop risk and every earlier request.'),
    help: t('মাঠে কৃষকের সঙ্গে বসে একই পাতা দেখে পরামর্শ দিতে পারেন।', 'Sit with the farmer in the field and advise from the same page.') },

  // ---- 5. Area map
  { ch: 5, path: '/officer/map', sel: 'main h1',
    title: t('পুরো এলাকার মানচিত্র', 'The whole area on a map'),
    say: t('স্তর বেছে নিন: ফসলের পরিকল্পনা, খোলা অনুরোধ, এলাকার সতর্কতা, জমির ব্যবহার, গ্রাম ও ইউনিয়নের নাম। "কতটা জায়গা দেখাবে" দিয়ে ইউনিয়ন বা পুরো উপজেলা; বিন্দুতে চাপ দিলে সেই কৃষক বা অনুরোধ খোলে।', 'Pick layers: crop plans, open requests, area alerts, land use, village and union names. “How much to show” switches union or whole upazila; tap a dot to open that farmer or request.'),
    help: t('কোন এলাকায় সমস্যা জমছে চোখে দেখা যায় — পরিদর্শনের রুট আর সভার জায়গা ঠিক করতে কাজে লাগে।', 'You can see where problems gather — useful for planning visits and where to hold a meeting.'),
    act: t('"জমির ব্যবহার" স্তরটা চালু করে দেখুন।', 'Switch on the “Land use” layer.') },
  { ch: 5, path: '/officer/map', text: t('জমির ব্যবহার', 'Land use'), alt: 'main h1',
    title: t('২০১৭ থেকে জমি কীভাবে বদলাল', 'How the land changed since 2017'),
    say: t('"জমির ব্যবহার" স্তর চালু করলে মানচিত্রে সেন্টিনেল-২ উপগ্রহের ১০ মিটার ভূমি-মানচিত্র আসে, আর পাশে ফসলি জমি, বসতি, পানি, গাছপালা — প্রতিটা উপজেলায় কত বর্গকিমি, আর ২০১৭ থেকে কত বাড়ল বা কমল।', 'Switch on the “Land use” layer and the Sentinel-2 10 m land-cover map appears, with cropland, settlements, water and trees — how many km² each covers in the upazila, and how much each gained or lost since 2017.'),
    help: t('ফসলি জমি কতটা বাড়িঘরে চলে যাচ্ছে, তার আসল হিসাব সভায় বা প্রতিবেদনে দেখাতে পারেন।', 'Real numbers on how much farmland is being built over, for meetings and reports.'),
    act: t('এখনই বোতামটা চাপুন — গাইড খোলা থাকতেও মানচিত্র কাজ করে।', 'Press it now — the map works while the guide is open.') },

  // ---- 6. Ropan Radar
  { ch: 6, path: '/officer/radar', sel: '.section-nav',
    title: t('রোপণ রাডার: মেঘের নিচেও মাঠ দেখা', 'Ropan Radar: seeing the fields under cloud'),
    say: t('সেন্টিনেল-১ রাডার মেঘ ভেদ করে দেখে কোন জমিতে কবে পানি দিয়ে আমন চারা রোপণ হলো। ওপরের সারিতে পাতার সব অংশ; যেকোনোটায় চাপ দিলে সেখানে যায়, আর স্ক্রল করলে সারিটা সঙ্গে থাকে।', 'Sentinel-1 radar sees through cloud when each field was flooded and Aman was transplanted. The strip at the top lists every part of the page; tap one to go there, and it stays with you as you scroll.'),
    help: t('বর্ষায় মাঠে না গিয়েও জানা যায় রোপণ কতটা এগোল, কোন এলাকা পিছিয়ে।', 'In the monsoon you know how far planting has got, and which areas lag, without going out.') },
  { ch: 6, path: '/officer/radar', sel: '#rd-onset',
    title: t('বৃষ্টি কবে সত্যিই শুরু হলো', 'When the rains really began'),
    say: t('নাসা/জাক্সার জিপিএম আইমার্জ উপগ্রহের ২৫ বছরের বৃষ্টি থেকে একই নিয়মে প্রতি বছরের বর্ষা শুরুর দিন, আর এ বছরেরটা স্বাভাবিকের তুলনায় আগে না পরে।', 'From 25 years of NASA/JAXA GPM IMERG rain, the same rule gives each year’s monsoon onset, and whether this year’s came early or late.'),
    help: t('বীজতলা আর রোপণের পরামর্শ পঞ্জিকা নয়, এ বছরের আসল বৃষ্টি দেখে দিতে পারেন।', 'Advise on seedbeds and transplanting from this year’s real rain, not the calendar.') },
  { ch: 6, path: '/officer/radar', sel: '#rd-season, #rd-progress',
    title: t('এই মৌসুম: রাডার, বৃষ্টি আর অগ্রগতি', 'This season: radar, rain and progress'),
    say: t('মৌসুমজুড়ে রাডার সংকেত আর দৈনিক বৃষ্টি পাশাপাশি; রোপণ কতটা এগোল আগের বছরগুলোর মধ্যমার সঙ্গে তুলনায়।', 'The radar signal and daily rain side by side across the season; planting progress against the median of past years.'),
    help: t('জেলা অফিসে রোপণের অগ্রগতি জানাতে আসল সংখ্যা হাতে থাকে।', 'Real numbers to hand when the district asks how planting is going.') },
  { ch: 6, path: '/officer/radar', sel: '#rd-hazards',
    title: t('খরা আর বন্যার ঝুঁকি', 'Drought and flood risk'),
    say: t('রোপণের পরের দিনগুলোতে খরা বা অতিবৃষ্টির ঝুঁকি কতটা, বৃষ্টির হিসাব থেকে।', 'How much drought or flood risk follows planting, from the rain record.'),
    help: t('কোন এলাকায় সম্পূরক সেচ বা পানি নিষ্কাশনের কথা আগে বলতে হবে, বোঝা যায়।', 'Shows where to talk about supplementary irrigation or drainage first.') },
  { ch: 6, path: '/officer/radar', sel: '#rd-fields, #rd-history',
    title: t('নমুনা জমি আর রাডারের ছবি', 'Sample fields and radar images'),
    say: t('ইউনিয়ন অনুযায়ী নমুনা জমির মানচিত্রে কোন জমিতে কবে রোপণ ধরা পড়েছে, আর রাডার ছবির ইতিহাস।', 'A map of sample fields by union with the date each was planted, and the history of radar images.'),
    help: t('দেরিতে রোপণ হওয়া জমি চিহ্নিত করে সেখানকার কৃষকদের আগাম পরামর্শ দিতে পারেন।', 'Spot late-planted fields and reach those farmers early.') },
  { ch: 6, path: '/officer/radar', sel: '#rd-district, #rd-method',
    title: t('জেলার তুলনা আর পদ্ধতি', 'The district comparison and the method'),
    say: t('জেলার অন্য উপজেলার সঙ্গে আপনার উপজেলার তুলনা, আর শেষে তথ্য কোথা থেকে, কীভাবে হিসাব — সব খোলা। মূল রাডার প্রোটোটাইপ "কৃত্রিম ডেমো" হিসেবেও খোলা যায়।', 'Your upazila against the rest of the district, and at the end where the data comes from and how it is worked out — all open. The original radar prototype opens as a “synthetic demo”.'),
    help: t('জেলা সভায় নিজের উপজেলার অবস্থান সংখ্যা দিয়ে দেখাতে পারেন, আর কেউ জিজ্ঞেস করলে পদ্ধতি দেখাতে পারেন।', 'Show where your upazila stands in district meetings, and the method if anyone asks.') },

  // ---- 7. Planting and prices
  { ch: 7, path: '/officer/planting', sel: 'main h1',
    title: t('লাগানোর সময় ও দাম পড়ার ঝুঁকি', 'Planting time and price-drop risk'),
    say: t('সবাই একই সপ্তাহে একই ফসল তুললে বাজারে দাম পড়ে। এই পাতা সবার পরিকল্পনা মিলিয়ে দেখায় কোন সপ্তাহে কত টন উঠবে, আর কোন সপ্তাহ সীমার ওপরে যাচ্ছে।', 'When everyone harvests the same crop in the same week, prices fall. This page adds up everyone’s plans: how many tonnes each week, and which weeks go over the line.'),
    help: t('দাম পড়ার আগেই কয়েকজনকে আগে-পরে লাগাতে বলে কৃষকের লোকসান ঠেকানো যায়।', 'Ask a few farmers to plant earlier or later before prices drop, and save them a loss.') },
  { ch: 7, path: '/officer/planting', text: t('টমেটো লাগানোর পালা', 'Tomato planting slots'), up: 'section, .surface-card',
    title: t('লাগানোর পালা', 'Planting slots'),
    say: t('প্রতিটা ফসলের জন্য সপ্তাহ ধরে লাগানোর পালা: কোন সপ্তাহ "ভরে গেছে", কোনটায় জায়গা আছে।', 'For each crop, planting slots by week: which weeks are “full” and which have room.'),
    help: t('কৃষক ফোন করে জিজ্ঞেস করলে কোন সপ্তাহে লাগালে ভালো দাম পাবেন, সঙ্গে সঙ্গে বলতে পারেন।', 'When a farmer asks which week to plant for a better price, you can answer on the spot.') },
  { ch: 7, path: '/officer/planting', text: t('এখনো ঠিক করেননি', 'Not decided yet'), up: 'section, .surface-card',
    title: t('কোন ফসলে কত জমি, কে এখনো ঠিক করেননি', 'Land by crop, and who hasn’t decided'),
    say: t('ইউনিয়নে কোন ফসলে কত জমি, আর যাঁরা এখনো পরিকল্পনা পাকা করেননি তাঁদের তালিকা — "ফোন করে জানান" বোতামসহ।', 'How much land each crop takes in the union, and who has not settled a plan yet — with a “Call them” button.'),
    help: t('মৌসুমের শুরুতে কাদের সঙ্গে আগে কথা বলতে হবে, তা পরিষ্কার।', 'At the start of the season it is clear whom to talk to first.') },
  { ch: 7, path: '/officer/planting', text: t('কেন?', 'Why?'), alt: 'main h1',
    title: t('ঝুঁকির হিসাব খোলা', 'The risk rule, in the open'),
    say: t('ঝুঁকি বেশি মানে সেই সপ্তাহে ফসল সীমার ওপরে আর দামও সাধারণত কমে; দামের মৌসুম কৃষি বিপণন অধিদপ্তরের (DAM) আসল তথ্য থেকে।', 'High risk means that week goes over the line and prices usually fall too; the price seasons are the Department of Agricultural Marketing’s (DAM) real data.'),
    help: t('কৃষককে কেন আগে-পরে লাগাতে বলছেন, সেটা বিশ্বাসযোগ্যভাবে ব্যাখ্যা করতে পারেন।', 'You can explain convincingly why you are asking a farmer to shift.'),
    act: t('"কেন?" চাপলে পুরো হিসাব আর উৎস খোলে।', 'Press “Why?” to open the full rule and its source.') },

  // ---- 8. Harvest timing
  { ch: 8, path: '/officer/supply', sel: '#ho-district',
    title: t('জেলায় কোন উপজেলায় কবে আমন কাটা', 'When Aman is cut, upazila by upazila'),
    say: t('রাডারে মাপা রোপণের দিন থেকে জেলার প্রতিটা উপজেলায় আমন কাটার সময়, আর প্রতি সপ্তাহে জেলায় কত টন চাল উঠবে (আনুমানিক)।', 'From radar-measured planting dates, when Aman is cut in each upazila of the district, and roughly how many tonnes of rice come in each week.'),
    help: t('ধান কাটার শ্রমিক, যন্ত্র আর সরকারি ধান কেনার প্রস্তুতি আগে থেকে নেওয়া যায়।', 'Labour, harvesters and government procurement can be lined up in advance.') },
  { ch: 8, path: '/officer/supply', sel: '#ho-switch',
    title: t('আমনের পরে কী লাগাবেন', 'What to plant after Aman'),
    say: t('আমন সময়মতো কাটা হলে মাঝে সরিষা ঢুকিয়ে বোরো রেখেই বাড়তি আয়; দেরি হলে অ্যাপ সোজা বলে এ বছর সময় হবে না। পাশে বোরোর বদলে কম পানির ফসল: বোনার শেষ দিন, ফলন আর লাভ।', 'If Aman comes off in time, mustard fits in before Boro for extra income; if late, it says plainly there isn’t time this year. Beside it, low-water crops instead of Boro: last sowing day, yield and profit.'),
    help: t('প্রতিটা ইউনিয়নে কোন ফসলচক্রের কথা বলবেন, এ বছরের আসল সময় দেখে ঠিক করতে পারেন।', 'Decide which rotation to promote in each union from this year’s real timing.') },
  { ch: 8, path: '/officer/supply', sel: '#ho-unions',
    title: t('ইউনিয়নের রবি ফসল কবে উঠবে', 'When the union’s Rabi crops come in'),
    say: t('প্রথম সপ্তাহ, সবচেয়ে বেশি যে সপ্তাহে, শেষ সপ্তাহ আর মোট টন — নমুনা কৃষকদের পরিকল্পনা থেকে জমির মাপ × গড় ফলন।', 'First week, peak week, last week and total tonnes — from the sample farmers’ plans, area × average yield.'),
    help: t('হাট, পাইকার আর হিমাগারকে আগে থেকে জানানো যায়।', 'Markets, traders and cold stores can be told in advance.') },

  // ---- 9. Upazila overview
  { ch: 9, path: '/officer/upazila', sel: '#up-now',
    title: t('এখন মাঠে কী হচ্ছে', 'What is happening in the fields now'),
    say: t('রাডারে এ মৌসুমের রোপণ, জমি কীভাবে বদলাচ্ছে, আর নাসা SEDAC ও জনশুমারির হিসাবে মানুষ, ঘনত্ব, নিচু জমি আর ফসলি জমি।', 'This season’s planting from radar, how the land is changing, and from NASA SEDAC and the census: people, density, low-lying land and cropland.'),
    help: t('উপজেলা পরিষদের সভায় পুরো উপজেলার ছবি এক পাতায়।', 'The whole upazila on one page for the upazila council meeting.') },
  { ch: 9, path: '/officer/upazila', sel: '#up-rotation',
    title: t('ফসলচক্র বদলালে উপজেলায় কী লাভ', 'What a change of rotation would do for the upazila'),
    say: t('কত ভাগ বোরো চাষি ফসলচক্র বদলালে বছরে কত ঘনমিটার সেচের পানি বাঁচে, কত টন গ্রিনহাউস গ্যাস কমে, দশ বছরে মাটিতে কত কার্বন জমে। নিজের জানা সংখ্যা বসাতে পারেন।', 'If a share of Boro farmers changed rotation: cubic metres of irrigation water saved a year, tonnes of greenhouse gas cut, carbon built in the soil over ten years. You can enter your own numbers.'),
    help: t('প্রকল্প প্রস্তাব বা ঊর্ধ্বতনদের প্রতিবেদনে ফসলচক্র বদলের সুফল সংখ্যা দিয়ে দেখাতে পারেন।', 'Put numbers on the benefits of changing rotation in project proposals and reports.'),
    act: t('"কত ভাগ বোরো চাষি বদলান" স্লাইডারটা টেনে দেখুন।', 'Drag the “share of Boro farmers who switch” slider.') },
  { ch: 9, path: '/officer/upazila', sel: '#up-weather, #up-crops',
    title: t('আবহাওয়া আর ফসলের পরিসংখ্যান', 'Weather and crop statistics'),
    say: t('উপজেলার আবহাওয়া, আর বাংলাদেশ পরিসংখ্যান ব্যুরোর (বিবিএস) জেলার ফসল: প্রধান ফসল, প্রধান ফল, প্রায় হারিয়ে যাওয়া ফসল।', 'The upazila’s weather, and the district’s crops from the Bangladesh Bureau of Statistics (BBS): main crops, main fruit, crops nearly lost.'),
    help: t('সরকারি পরিসংখ্যান খুঁজতে আলাদা বই বা ওয়েবসাইট লাগে না।', 'No separate yearbook or website needed for official statistics.') },
  { ch: 9, path: '/officer/upazila', sel: '#up-prices',
    title: t('সরকারি বাজারদর', 'Official market prices'),
    say: t('কৃষি বিপণন অধিদপ্তরের সাপ্তাহিক বাজারদর: এ সপ্তাহ, আগের সপ্তাহ, গত বছর আর এক বছরে বদল।', 'The Department of Agricultural Marketing’s weekly prices: this week, last week, last year and the change in a year.'),
    help: t('কৃষক দাম জিজ্ঞেস করলে সরকারি সংখ্যা সঙ্গে সঙ্গে বলতে পারেন।', 'When a farmer asks about prices, you have the official figure at once.') },
  { ch: 9, path: '/officer/upazila', sel: '#up-sample',
    title: t('ইউনিয়ন ধরে পরিকল্পনা', 'Plans union by union'),
    say: t('প্রতিটা ইউনিয়নের পরিকল্পনা, দাম পড়ার ঝুঁকি, ব্যস্ততম সপ্তাহ, সতর্কতা আর খোলা অনুরোধ পাশাপাশি। এই অংশের সংখ্যা নমুনা কৃষকদের, আসল নয়।', 'Every union’s plans, price-drop risk, busiest week, alerts and open requests side by side. The numbers here come from sample farmers, not real ones.'),
    help: t('কোন ইউনিয়নের উপসহকারী কৃষি কর্মকর্তার বেশি সাহায্য লাগবে, তুলনা করে বোঝা যায়।', 'Compare unions to see which sub-assistant officer needs more support.') },
  { ch: 9, path: '/officer/upazila', sel: '#up-advice',
    title: t('পুরো উপজেলায় পরামর্শ পাঠান', 'Send advice to the whole upazila'),
    say: t('একটা লেখা লিখে একবারে উপজেলার সব কৃষককে পাঠান; তাঁরা "সাহায্য" পাতায় আর ঘণ্টায় দেখেন।', 'Write once and send to every farmer in the upazila; they see it on their Help page and bell.'),
    help: t('সরকারি নির্দেশনা, প্রশিক্ষণের খবর বা ঝড়ের সতর্কতা মিনিটে সবার কাছে।', 'Government instructions, training news or a storm warning reach everyone in minutes.') },

  // ---- 10. Voice assistant
  { ch: 10, path: '/officer/voice', sel: 'main h1',
    title: t('হাত খালি না থাকলে, মুখে বলে কাজ', 'Hands full? Say it'),
    say: t('মাঠে বা মোটরসাইকেলে থাকলে মুখে বলুন: "আজকের অবস্থা", "জরুরি অনুরোধ কোনগুলো?", "প্রথমটা পড়ুন", "সবাইকে পরামর্শ পাঠান", "কবে কত ফসল উঠবে?"। এআই খসড়া করে পড়ে শোনায়।', 'In the field or on the motorcycle, say “today’s situation”, “which requests are urgent?”, “read the first one”, “advise everyone”, “when does the harvest come?”. The AI drafts and reads it aloud.'),
    help: t('কৃষকের কাছে কিছু যায় শুধু আপনার "হ্যাঁ"-র পর — তাড়াহুড়োয় ভুল পাঠানোর ভয় নেই।', 'Nothing goes to a farmer until you say “yes” — no risk of sending something by mistake in a hurry.'),
    act: t('একটা উদাহরণে চাপ দিয়ে শুনে দেখুন।', 'Tap an example and listen.') },

  // ---- 11. Your working day
  { ch: 11, path: '/officer', title: t('আপনার কাজের দিনে কীভাবে লাগে', 'How it fits your working day'),
    say: t('সকালে: আজকের চিত্র → সতর্কতা → জরুরি অনুরোধের উত্তর। মাঠে যাওয়ার আগে: মানচিত্রে রুট আর কৃষকের খাতা। সপ্তাহে: লাগানোর পালা আর দাম। মৌসুমে: রোপণ রাডার আর ফসল তোলার সময়। মাসে বা সভায়: উপজেলার সার্বিক চিত্র আর ফসলচক্রের প্রভাব।', 'Mornings: overview → alerts → answer urgent requests. Before a field visit: the route on the map and the farmer’s record. Weekly: planting slots and prices. Each season: Ropan Radar and harvest timing. Monthly or for meetings: the upazila overview and rotation impact.'),
    help: t('সংখ্যার পাশে "আসল তথ্য", "নিয়মে হিসাব", "AI" বা "নমুনা তথ্য" লেখা থাকে — কোনটা উপগ্রহ বা সরকারি তথ্য আর কোনটা উদাহরণ, সবসময় বোঝা যায়।', 'Every number carries “Real data”, “Rule-based”, “AI” or “Sample data”, so you always know what comes from satellites or official sources and what is an example.'),
    act: t('গাইড আবার দেখতে চাইলে ওপরের "গাইড" বোতাম চাপুন।', 'To see the guide again, press “Guide” at the top.') },
];

const QUICK_STEPS = [1, 3, 5, 6, 9].map((chapter) => STEPS.findIndex((step) => step.ch === chapter));

// Fill the {placeholders} from the signed-in context.
const fill = (s, c) => s.replace(/\{(\w+)\}/g, (_, k) => c[k] ?? '');

// The element a step lights up: a selector (first match that is on screen), or the smallest visible element whose text
// starts with the label in either language, widened to the nearest `up` container.
function findTarget(step) {
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
  if (step.sel) return [...document.querySelectorAll(step.sel)].find(visible) ?? null;
  if (!step.text) return null;
  const want = [step.text.bn, step.text.en];
  const scope = document.querySelector('.officer-shell') ?? document.body;
  const hits = [...scope.querySelectorAll('h1,h2,h3,h4,label,span,button,a,p,dt,summary,div')]
    .filter((el) => { const tx = el.textContent.trim(); return want.some((w) => tx.startsWith(w)) && visible(el); })
    .filter((el, _, all) => !all.some((o) => o !== el && el.contains(o)));
  const el = hits[0];
  if (!el) return null;
  const wide = step.up ? el.closest(step.up) : null;
  return wide && visible(wide) && wide.getBoundingClientRect().height < window.innerHeight * 1.6 ? wide : el;
}

export default function OfficerTour() {
  const { s, T, L, officerUpazila: upz } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [k, setK] = useState(() => { try { const v = localStorage.getItem(KEY); return v == null ? null : +v; } catch { return null; } });
  const [rect, setRect] = useState(null);
  const [menu, setMenu] = useState(false);
  const [invite, setInvite] = useState(() => { try { return !localStorage.getItem(SEEN); } catch { return false; } });
  const [chooser, setChooser] = useState(false);
  const [autoMode, setAutoMode] = useState(() => !!readMode().auto);
  const [quickMode, setQuickMode] = useState(() => !!readMode().quick);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [elapsed, setElapsed] = useState(() => readMode().elapsed ?? 0);
  useEffect(() => { if (autoMode) saveMode({ auto: true, quick: quickMode, elapsed }); }, [autoMode, quickMode, elapsed]);
  const target = useRef(null);
  const card = useRef(null);
  const [place, setPlace] = useState('right');

  const unionName = demo.unions.find((u) => u.id === s.officerUnion)?.full;
  const ctx = useMemo(() => {
    const req = s.requests.find((r) => r.union === s.officerUnion && r.status === 'open') ?? s.requests.find((r) => r.union === s.officerUnion);
    const farmer = demo.farmers.find((f) => f.union === s.officerUnion);
    return { req: req?.id, farmer: farmer?.id, upz: L(upz.name), officer: L(upz.officer), district: L(upz.district), union: unionName ? L(unionName) : s.officerUnion };
  }, [s.requests, s.officerUnion, upz, unionName, L]);

  const set = useCallback((n) => {
    setK(n); setMenu(false);
    try { if (n == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, String(n)); localStorage.setItem(SEEN, '1'); } catch { /* storage blocked */ }
    setInvite(false);
  }, []);
  useEffect(() => {
    const on = () => {
      set(null);
      setChooser(true);
    };
    window.addEventListener('fs-officer-tour', on);
    return () => window.removeEventListener('fs-officer-tour', on);
  }, [set]);
  const startTour = (mode) => {
    setChooser(false);
    setAutoMode(mode !== 'manual');
    setQuickMode(mode === 'quick');
    setPaused(false);
    setCompleted(false);
    setElapsed(0);
    saveMode(mode === 'manual' ? null : { auto: true, quick: mode === 'quick', elapsed: 0 });
    set(mode === 'quick' ? QUICK_STEPS[0] : 0);
  };
  const closeTour = () => {
    setChooser(false);
    setAutoMode(false);
    setQuickMode(false);
    setPaused(false);
    setCompleted(false);
    saveMode(null);
    set(null);
  };

  useEffect(() => {
    if (k == null || !autoMode || paused || completed) return undefined;
    const steps = quickMode ? QUICK_STEPS : STEPS.map((_, index) => index);
    const position = steps.indexOf(k);
    const timer = setTimeout(() => {
      if (position >= steps.length - 1) setCompleted(true);
      else set(steps[position + 1]);
    }, (quickMode ? QUICK_TOUR_STEP_SECONDS : TOUR_STEP_SECONDS) * 1000);
    return () => clearTimeout(timer);
  }, [k, autoMode, quickMode, paused, completed, set]);
  useEffect(() => {
    if (k == null || !autoMode || paused || completed) return undefined;
    const timer = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [k, autoMode, paused, completed]);

  const step = k == null ? null : STEPS[Math.min(k, STEPS.length - 1)];
  const path = step ? (typeof step.path === 'function' ? step.path(ctx) : step.path) : null;

  // Open the step's page, then find its part (pages and their data arrive a moment later), bring it into view below
  // the header, and follow it while the page scrolls or reflows.
  useEffect(() => {
    if (!step) return undefined;
    if (pathname !== path) { navigate(path); return undefined; }
    setRect(null); target.current = null;
    let tries = 0, timer = 0, raf = 0, stop = false;
    const header = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-header')) || 72;
    const track = () => { if (stop) return; const el = target.current; if (el) { const r = el.getBoundingClientRect(); setRect((p) => (p && Math.abs(p.top - r.top) < 0.5 && Math.abs(p.height - r.height) < 0.5 && Math.abs(p.left - r.left) < 0.5 && Math.abs(p.width - r.width) < 0.5 ? p : { top: r.top, left: r.left, width: r.width, height: r.height })); } raf = requestAnimationFrame(track); };
    // Charts higher up the page load as it scrolls and push the part down, so after each glide look again and re-aim,
    // up to four times, until it sits still below the header.
    const aim = (el, n) => {
      if (stop) return;
      const fixed = !!el.closest('header, aside, nav[aria-label="কর্মকর্তার পাতা"], nav[aria-label="Officer pages"]') && !el.closest('main');
      // in the sidebar or header: the page does not move, but a sidebar that scrolls on its own brings the part into view
      if (fixed) { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
      const r = el.getBoundingClientRect();
      const room = window.innerHeight - (window.innerWidth >= 1024 ? 40 : 300);
      const off = r.top < header() + 4 || (r.top > header() + 24 && r.bottom > room);
      if (off) window.scrollTo({ top: Math.max(0, r.top + window.scrollY - header() - 16), behavior: n ? 'auto' : 'smooth' });
      if (off && n < 4) timer = setTimeout(() => aim(el, n + 1), 900);
    };
    const look = () => {
      // A part that shows only sometimes (a warning button with no warning today) falls back to `alt` (one selector, or several in order of preference).
      const el = findTarget(step) ?? (tries >= 3 && step.alt ? [].concat(step.alt).map((sel) => findTarget({ sel })).find(Boolean) : null);
      if (!el) { if (++tries < 16) timer = setTimeout(look, 300); return; }
      target.current = el;
      track();
      aim(el, 0);
    };
    timer = setTimeout(look, 350);
    return () => { stop = true; clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [k, path, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (k == null) return undefined;
    const key = (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key === 'Escape') closeTour();
      if (e.key === 'ArrowRight') changeStep(1);
      if (e.key === 'ArrowLeft') changeStep(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [k, set]);

  // On a wide screen the card takes whichever corner hides least of the lit part: bottom right, bottom left, or top
  // right when the part fills the bottom. It decides once the page stops gliding, so it does not hop mid-scroll.
  useEffect(() => {
    if (!rect || window.innerWidth < 1024) { setPlace('right'); return undefined; }
    const timer = setTimeout(() => {
      const W = window.innerWidth, H = window.innerHeight, w = 464, h = (card.current?.offsetHeight ?? 320) + 12;
      const hdr = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-header')) || 64;
      const x0 = rect.left - 8, x1 = rect.left + rect.width + 8, y0 = rect.top - 8, y1 = rect.top + rect.height + 8;
      const hide = (l, r, t, b) => Math.max(0, Math.min(x1, r) - Math.max(x0, l)) * Math.max(0, Math.min(y1, b) - Math.max(y0, t));
      const spots = [['right', hide(W - w, W - 24, H - h, H - 12)], ['left', hide(24, w, H - h, H - 12)], ['top', hide(W - w, W - 24, hdr + 12, hdr + 12 + h)]];
      setPlace(spots.reduce((best, x) => (x[1] < best[1] ? x : best))[0]);
    }, 250);
    return () => clearTimeout(timer);
  }, [rect]);

  const sequence = quickMode ? QUICK_STEPS : STEPS.map((_, index) => index);
  const sequencePosition = Math.max(0, sequence.indexOf(k));
  const changeStep = (direction) => {
    const nextPosition = sequencePosition + direction;
    if (nextPosition < 0) return;
    if (nextPosition >= sequence.length) { setCompleted(true); return; }
    set(sequence[nextPosition]);
  };
  const selectChapter = (chapter) => {
    setQuickMode(false);
    setAutoMode(false);
    saveMode(null);
    set(STEPS.findIndex((step) => step.ch === chapter));
  };

  if (k == null) {
    if (!chooser && !invite) return null;
    return <TourModePicker T={T} title={T(`${ctx.officer}, অফিসার অংশের গাইড`, `${ctx.officer}, officer section guide`)}
      steps={STEPS.length} quickSteps={QUICK_STEPS.length} onStart={startTour} onClose={closeTour} />;
  }

  const ch = step.ch;
  const inChapter = STEPS.filter((x) => x.ch === ch);
  const pos = STEPS.slice(0, k + 1).filter((x) => x.ch === ch).length;
  const pad = 8;
  return (
    <>
      {/* The spotlight: everything else dims (the page still answers clicks), the part being explained gets a glowing rim. */}
      {rect ? (
        <div aria-hidden="true" className="tour-spot pointer-events-none fixed z-[65] rounded-[18px]"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      ) : <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[65] bg-[rgba(13,38,20,.28)] transition-opacity duration-300" />}
      <aside ref={card} role="dialog" aria-label={T('অফিসার অংশের গাইড', 'Officer guide')} aria-live="polite"
        className={`fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-[560px] rounded-[22px] border border-white/70 bg-white/97 p-4 shadow-[0_24px_56px_-16px_rgba(13,38,20,.6)] backdrop-blur lg:mx-0 lg:w-[440px] ${place === 'left' ? 'lg:left-6 lg:right-auto' : 'lg:left-auto lg:right-6'} ${place === 'top' ? 'lg:bottom-auto lg:top-[calc(var(--app-header,64px)+12px)]' : ''}`}>
        <div key={k} className="swap-in">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 text-white"><Compass size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-bold uppercase tracking-[.12em] text-primary-700">{T(`অধ্যায় ${(ch + 1).toLocaleString('bn-BD')}: ${CHAPTERS[ch].bn} · ${quickMode ? `${(sequencePosition + 1).toLocaleString('bn-BD')}/${sequence.length.toLocaleString('bn-BD')}` : `${pos.toLocaleString('bn-BD')}/${inChapter.length.toLocaleString('bn-BD')}`}`, `Chapter ${ch + 1}: ${CHAPTERS[ch].en} · ${quickMode ? `${sequencePosition + 1}/${sequence.length}` : `${pos}/${inChapter.length}`}`)}</p>
              <p className="mt-0.5 text-[16.5px] font-bold leading-snug">{fill(L(step.title), ctx)}</p>
            </div>
            <button type="button" onClick={closeTour} aria-label={T('গাইড বন্ধ করুন', 'Close the guide')} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/5"><X size={17} /></button>
          </div>
          <div className="mt-2 max-h-[38vh] space-y-2 overflow-y-auto pr-1 lg:max-h-[46vh]">
            <p className="text-[14px] leading-6 text-ink/85">{fill(L(step.say), ctx)}</p>
            {step.help && <p className="flex gap-2 rounded-xl bg-primary-50 px-3 py-2 text-[13.5px] leading-6 text-primary-900 ring-1 ring-primary-100"><Lightbulb size={16} className="mt-1 shrink-0 text-paddy-500" /><span><b>{T('আপনার কাজে: ', 'In your work: ')}</b>{fill(L(step.help), ctx)}</span></p>}
            {step.act && <p className="flex gap-2 text-[13px] leading-5 text-muted"><MousePointerClick size={15} className="mt-0.5 shrink-0" />{fill(L(step.act), ctx)}</p>}
          </div>
        </div>
        {autoMode && <TourPlayback T={T} lang={s.lang} mode={quickMode ? 'quick' : 'auto'} step={sequencePosition + 1} total={sequence.length} elapsed={elapsed} paused={paused} complete={completed} onToggle={() => setPaused((value) => !value)} />}
        {menu && (
          <ol className="mt-3 grid max-h-[30vh] grid-cols-1 gap-1 overflow-y-auto rounded-xl bg-black/[.03] p-1.5 sm:grid-cols-2">
            {CHAPTERS.map((c, i) => (
              <li key={c.en}><button type="button" onClick={() => selectChapter(i)} className={`w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] font-semibold transition ${i === ch ? 'bg-primary-700 text-white' : 'hover:bg-white'}`}>{T(`${(i + 1).toLocaleString('bn-BD')}. ${c.bn}`, `${i + 1}. ${c.en}`)}</button></li>
            ))}
          </ol>
        )}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/[.06]"><div className="gold-fill h-full rounded-full" style={{ width: `${((sequencePosition + 1) / sequence.length) * 100}%` }} /></div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" disabled={sequencePosition === 0} onClick={() => changeStep(-1)} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold text-ink/70 hover:bg-black/5 disabled:opacity-40"><ArrowLeft size={16} />{T('আগে', 'Back')}</button>
          <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold text-primary-800 ring-1 ring-primary-200 hover:bg-primary-50"><ListOrdered size={15} />{T('অধ্যায়', 'Chapters')}</button>
          {sequencePosition < sequence.length - 1
            ? <button type="button" onClick={() => changeStep(1)} className="btn-gloss inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold text-white">{T('পরে', 'Next')}<ArrowRight size={16} /></button>
            : <button type="button" onClick={closeTour} className="btn-gloss inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold text-white">{T('শেষ', 'Finish')}</button>}
        </div>
      </aside>
    </>
  );
}

export const OFFICER_TOUR_STEPS = STEPS.length;
