import { useStore } from '../../store';
import { PageHeader, Card, Note } from '../../components/ui';
import VoiceAssistant from '../../voice/VoiceAssistant';

export default function OfficerVoice() {
  const { T } = useStore();
  const ex = [T('আজকের অবস্থা', 'Today’s briefing'), T('কোন ইউনিয়নে ঝুঁকি বেশি?', 'Which union is most at risk?'), T('জরুরি অনুরোধ কোনগুলো?', 'Which requests are urgent?'), T('প্রথমটা পড়ুন', 'Read the first one'), T('সবাইকে পরামর্শ পাঠান', 'Advise everyone in the area'), T('পুরো উপজেলায় পরামর্শ পাঠান', 'Send advice to the whole upazila'), T('কবে কত ফসল উঠবে?', 'Harvest timing'), T('বৃষ্টি ও আমন রোপণ', 'Rain and Aman planting')];
  return (
    <div>
      <PageHeader eyebrow={T('কথা বলে কাজ', 'Work by voice')} title={T('কর্মকর্তার ভয়েস সহকারী', 'Officer voice assistant')} subtitle={T('মাঠে বা মোটরসাইকেলে হাত খালি না থাকলে বলে কাজ সারুন। অনুরোধ শুনুন, উত্তর পাঠান, এলাকায় সতর্কতা দিন। কৃষকের কাছে কিছু যাওয়ার আগে আমি হ্যাঁ বলার অপেক্ষা করি।', 'Work hands-free in the field. Hear requests, send replies, warn an area. Nothing goes to a farmer until you say yes.')} tags={['RULE', 'AI']} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <VoiceAssistant role="uao" />
        <div className="space-y-4">
          <Card className="p-5"><h2 className="text-[17px] font-bold">{T('যেমন বলতে পারেন', 'Things you can say')}</h2><ul className="mt-2 space-y-1.5 text-[15px] text-ink/80">{ex.map((e) => <li key={e}>“{e}”</li>)}</ul></Card>
          <Note tone="gold">{T('এআই শুধু খসড়া করে আর পড়ে শোনায়। উত্তর আর পরামর্শ — সবকিছু আপনার “হ্যাঁ”-র পরই যায়।', 'The assistant only drafts and reads aloud. Replies and advice go out only after your “yes”.')}</Note>
        </div>
      </div>
    </div>
  );
}
