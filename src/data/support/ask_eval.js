// Questions for measuring the support question box (engine/support.js askSupport), written the way a farmer might
// ask, not copied from any programme's keywords. Each has the programme a good answer starts with. The score
// (right first, in the top 3, mean reciprocal rank) is measured by evalAsk and shown on /farmer/support; add a
// question here whenever the box gets one wrong in a field session, rather than tuning the keywords to this list.
export const ASK_EVAL = [
  { q: 'ইউরিয়া কেজি কত টাকা হওয়ার কথা', want: 'fert_price' },
  { q: 'ডিলার সার বেশি দামে বেচছে', want: 'fert_price' },
  { q: 'how much should DAP cost', want: 'fert_price' },
  { q: 'মসুর চাষের জন্য কম সুদে টাকা ধার', want: 'credit_4pc' },
  { q: 'low interest loan for mustard', want: 'credit_4pc' },
  { q: 'বর্গাচাষি কি ব্যাংক থেকে ঋণ পায়', want: 'agri_credit' },
  { q: 'আগের ঋণ কি মাফ হবে', want: 'loan_waiver' },
  { q: 'free seeds this winter', want: 'prono_rabi' },
  { q: 'সরকার কি বিনা পয়সায় বীজ দেয়', want: 'prono_rabi' },
  { q: 'খরায় ফসল নষ্ট হলে টাকা পাব', want: 'wibci' },
  { q: 'crop insurance', want: 'wibci' },
  { q: 'ধান সরকারের কাছে বেচব কীভাবে', want: 'paddy_buy' },
  { q: 'government rice buying price', want: 'paddy_buy' },
  { q: 'হারভেস্টার কিনতে ভর্তুকি', want: 'machinery' },
  { q: 'subsidy for a tractor or reaper', want: 'machinery' },
  { q: 'মাটি কোথায় পরীক্ষা করাব', want: 'soil_test' },
  { q: 'soil testing lab', want: 'soil_test' },
  { q: 'ডিজেল ছাড়া সেচের পাম্প', want: 'solar_pump' },
  { q: 'solar irrigation', want: 'solar_pump' },
  { q: 'কৃষি কার্ড কীভাবে করব', want: 'krishi_card' },
  { q: 'how do I get on the farmer list', want: 'krishi_card' },
  { q: 'দশ টাকায় ব্যাংক হিসাব', want: 'ten_taka' },
  { q: 'পোকা লাগলে কাকে ফোন করব', want: 'call_16123' },
  { q: 'phone number for farming advice', want: 'call_16123' },
];
