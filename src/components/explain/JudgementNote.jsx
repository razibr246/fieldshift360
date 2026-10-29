// A short reminder, always in view on the planning pages: the app helps decide, the farmer and the agriculture
// officer decide. One line, Bangla first, with where the numbers are weakest.
import { HandHeart } from 'lucide-react';
import { useStore } from '../../store';

export default function JudgementNote({ className = '' }) {
  const { T } = useStore();
  return (
    <p role="note" className={`flex items-start gap-2 rounded-xl bg-paddy-50/80 px-3 py-2 text-[13px] leading-5 text-ink/80 ring-1 ring-paddy-200 ${className}`}>
      <HandHeart size={16} className="mt-0.5 shrink-0 text-paddy-700" />
      <span>{T('এই হিসাব সিদ্ধান্তে সাহায্য করে, সিদ্ধান্ত দেয় না। আবহাওয়া উপজেলার, মাটি আনুমানিক, ফসলের নিয়ম এখনো যাচাই হয়নি: শেষ কথা আপনার অভিজ্ঞতা আর কৃষি কর্মকর্তার।', 'This helps you decide; it does not decide for you. The weather is the upazila’s, the soil an estimate, and the crop rules are not yet reviewed: your experience and your agriculture officer have the last word.')}</span>
    </p>
  );
}
