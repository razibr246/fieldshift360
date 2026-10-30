// The farm-work scenes FarmworkScene can play: each one's loop length, stages, words, artwork and painter.
import { TOMATO_HARVEST_STAGES, MUNGBEAN_SOWING_STAGES, AMAN_TRANSPLANT_STAGES, WHEAT_HARVEST_STAGES, SESAME_SOWING_STAGES } from '../../engine/farmTimeline';
import TomatoArt, { tomatoPainter } from './TomatoArt';
import MungArt, { mungPainter } from './MungArt';
import AmanArt, { amanPainter } from './AmanArt';
import WheatArt, { wheatPainter } from './WheatArt';
import SesameArt, { sesamePainter } from './SesameArt';
import { T as TOMATO_T } from './tomato';
import { T as MUNG_T, SEAM as MUNG_SEAM } from './mungbean';
import { T as AMAN_T, SEAM as AMAN_SEAM } from './aman';
import { T as WHEAT_T } from './wheat';
import { T as SESAME_T, SEAM as SESAME_SEAM } from './sesame';

export { RABI_SCENE, NEXT_SCENE } from './sceneFor'; // which scene each crop's bar opens

export const SCENES = {
  wheat: {
    T: WHEAT_T, stages: WHEAT_HARVEST_STAGES, poster: 4.4, seam: 0, Art: WheatArt, painter: wheatPainter,
    title: { bn: 'গম কাটার অ্যানিমেশন', en: 'Wheat harvest animation' },
    action: { bn: 'গম কাটার পালা', en: 'Wheat harvest, step by step' },
    range: { bn: 'কাটার সময়', en: 'Harvest' },
    slider: { bn: 'ফসল কাটার তারিখ', en: 'Harvest date' },
  },
  sesame: {
    T: SESAME_T, stages: SESAME_SOWING_STAGES, poster: 7.55, seam: SESAME_SEAM, Art: SesameArt, painter: sesamePainter,
    title: { bn: 'তিল বোনা', en: 'Sowing sesame' },
    action: { bn: 'তিল বোনার পালা', en: 'Sesame sowing, step by step' },
    range: { bn: 'বপনের দিন', en: 'Sowing date' },
    slider: { bn: 'কাজের ধাপ', en: 'Activity stage' },
  },
  tomato: {
    T: TOMATO_T, stages: TOMATO_HARVEST_STAGES, poster: 7.6, seam: 0, Art: TomatoArt, painter: tomatoPainter,
    title: { bn: 'টমেটো তোলার অ্যানিমেশন', en: 'Tomato harvest animation' },
    action: { bn: 'টমেটো তোলার পালা', en: 'Tomato harvest, step by step' },
    range: { bn: 'তোলার সময়', en: 'Harvest' },
    slider: { bn: 'ফসল তোলার তারিখ', en: 'Harvest date' },
  },
  mungbean: {
    T: MUNG_T, stages: MUNGBEAN_SOWING_STAGES, poster: 8.3, seam: MUNG_SEAM, Art: MungArt, painter: mungPainter,
    title: { bn: 'মুগ ডাল বোনা', en: 'Sowing mung dal' },
    action: { bn: 'মুগ ডাল বোনার পালা', en: 'Mung-dal sowing, step by step' },
    range: { bn: 'বপনের দিন', en: 'Sowing date' },
    slider: { bn: 'কাজের ধাপ', en: 'Activity stage' },
  },
  aman: {
    T: AMAN_T, stages: AMAN_TRANSPLANT_STAGES, poster: 7.9, seam: AMAN_SEAM, Art: AmanArt, painter: amanPainter,
    title: { bn: 'রোপা আমন লাগানো', en: 'Transplanting Ropa Aman' },
    action: { bn: 'আমন চারা রোপণের পালা', en: 'Aman transplanting, step by step' },
    range: { bn: 'রোপণের দিন', en: 'Transplanting date' },
    slider: { bn: 'কাজের ধাপ', en: 'Activity stage' },
  },
};
