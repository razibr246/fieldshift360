// The phone keypad menu for the farmer's field assistant (browser phone mode, and the same keys on the phone line).
// Each key asks the assistant what a farmer would say, so a key and the spoken question get the same answer.
export const KEY_MENU = {
  1: { bn: 'কী লাগাব', en: 'What to plant', ask: { bn: 'এই রবিতে কী লাগাব?', en: 'What should I plant this Rabi?' } },
  2: { bn: 'আজ সেচ', en: 'Water today', ask: { bn: 'আজ সেচ লাগবে?', en: 'Do I need to water today?' } },
  3: { bn: 'ফসল তোলা', en: 'Harvest', ask: { bn: 'ফসল কবে উঠবে, কত মণ হবে?', en: 'When is my harvest and how many maund?' } },
  4: { bn: 'সমস্যা জানানো', en: 'Report a problem', ask: { bn: 'সমস্যা জানাতে চাই', en: 'I want to report a problem' } },
  5: { bn: 'কৃষি অফিসার', en: 'Agriculture officer', ask: { bn: 'কৃষি অফিসারের সঙ্গে কথা বলতে চাই', en: 'I want to talk to the agriculture officer' } },
  6: { bn: 'তথ্য কোথা থেকে', en: 'Where data comes from', ask: { bn: 'এই তথ্য কোথা থেকে এল?', en: 'Where does this data come from?' } },
  7: { bn: 'আবহাওয়া', en: 'Weather', ask: { bn: 'আবহাওয়া কেমন?', en: 'How is the weather?' } },
  8: { bn: 'দাম ও বিক্রি', en: 'Prices', ask: { bn: 'সবাই একসঙ্গে লাগালে দাম পড়বে?', en: 'Will prices fall if everyone plants together?' } },
  9: { bn: 'পরের ফসল', en: 'Next crop', ask: { bn: 'এরপর কোন ফসল করব?', en: 'What comes after this crop?' } },
  0: { bn: 'আবার শুনুন', en: 'Hear again', ask: { bn: 'আবার বলুন', en: 'Say that again' } },
  '*': { bn: 'থামান', en: 'Stop', ask: { bn: 'থামুন', en: 'Goodbye' } },
  '#': { bn: 'মেনু', en: 'Menu', ask: { bn: 'মেনু', en: 'Menu' } },
};
