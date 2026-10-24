// The farmer's own account: who they are, where their land is, how they farm, their agriculture office and what they
// have sent so far. The personal part is editable and saved with the rest of the demo state (this browser only);
// address and field details come from "My field", so they are changed there, not here.
import { useState } from 'react';
import { UserRound, MapPin, Sprout, Building2, LifeBuoy, Save, CheckCircle2, Pencil, Phone } from 'lucide-react';
import { useStore, demo } from '../../store';
import { PageHeader, Card, Button, Badge, Note } from '../../components/ui';
import { IRRIGATION, cropName } from '../../engine/crops';
import { num, bnDigits } from '../../engine/dates';
import FarmerAvatar from '../../components/brand/FarmerAvatar';

const OWNERSHIP = {
  own: { bn: 'নিজের জমি', en: 'Own land' },
  sharecrop: { bn: 'বর্গা', en: 'Sharecropped' },
  lease: { bn: 'লিজ বা ইজারা', en: 'Leased' },
  mixed: { bn: 'নিজের ও বর্গা দুই-ই', en: 'Own and sharecropped' },
};
const CONTACT = {
  app: { bn: 'অ্যাপে', en: 'In the app' },
  sms: { bn: 'এসএমএসে', en: 'By SMS' },
  call: { bn: 'ফোন করে', en: 'By phone call' },
};

// Bangladeshi mobile number: Bangla or English digits, spaces, dashes and a +880 / 880 prefix are all accepted.
export function cleanMobile(v) {
  const d = String(v ?? '').replace(/[০-৯]/g, (c) => '০১২৩৪৫৬৭৮৯'.indexOf(c)).replace(/[\s-]/g, '').replace(/^\+?880/, '0');
  return { value: d, ok: d === '' || /^01[3-9]\d{8}$/.test(d) };
}

const INPUT = 'mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3 text-[15px] outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50';

function Field({ id, label, hint, children }) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-[14px] font-semibold text-ink">{label}</span>
      {hint && <span className="ml-1 text-[13px] text-muted">{hint}</span>}
      {children}
    </label>
  );
}

function Rows({ rows }) {
  return (
    <dl className="mt-3 divide-y divide-border text-[15px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
      ))}
    </dl>
  );
}

// Keyed by farmer, so switching account starts the form from that farmer's saved details.
export default function ProfilePage() {
  const { farmer } = useStore();
  return <Profile key={farmer.id} />;
}

function Profile() {
  const { s, dispatch, T, L, toast, farmer, profile, upazila, chosen, confirmedPlan, landConfirmed, myAdvisories } = useStore();
  const lang = s.lang;
  const base = demo.farmers.find((f) => f.id === farmer.id);
  const empty = { nameBn: base.name.bn, nameEn: base.name.en, mobile: '', guardian: '', card: '', ownership: 'own', years: '', household: '', contact: 'app' };
  const [form, setForm] = useState({ ...empty, ...profile });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const mobile = cleanMobile(form.mobile);
  const dirty = Object.keys(empty).some((k) => String(form[k] ?? '') !== String({ ...empty, ...profile }[k] ?? ''));
  const save = (e) => {
    e.preventDefault();
    if (!mobile.ok) return;
    dispatch({ type: 'setProfile', id: farmer.id, profile: { ...form, nameBn: form.nameBn.trim() || base.name.bn, nameEn: form.nameEn.trim() || base.name.en, mobile: mobile.value } });
    toast('প্রোফাইল সংরক্ষণ করা হয়েছে', 'Profile saved');
  };

  const u = demo.unions.find((x) => x.id === farmer.union);
  const mine = s.requests.filter((r) => r.farmerId === farmer.id);
  const openReq = mine.filter((r) => r.status === 'open' || r.status === 'need_info').length;
  const bigha = farmer.area_dec / 33;

  return (
    <div>
      <PageHeader eyebrow={T('আমার অ্যাকাউন্ট', 'My account')} title={T('আমার প্রোফাইল', 'My profile')}
        subtitle={T('আপনার নাম, যোগাযোগ, জমি আর কৃষি অফিসের সব তথ্য এক জায়গায়। নিজের তথ্য বদলে "সংরক্ষণ করুন" চাপুন।', 'Your name, contact, land and agriculture office in one place. Change your details and press "Save".')} />

      <Card data-tour="pf-top" className="mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <FarmerAvatar id={farmer.id} size={64} rounded="rounded-2xl" fallback={<span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary-100 text-[28px] font-bold text-primary-800">{L(farmer.name).slice(0, 1)}</span>} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[24px] font-bold leading-tight">{L(farmer.name)}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-[14.5px] text-muted"><MapPin size={15} className="mt-0.5 shrink-0 text-primary-600" />
            {T(`গ্রাম ${farmer.villageBn}, ${u.full.bn}, ${upazila.name.bn} উপজেলা, ${upazila.district.bn} জেলা, ${upazila.division.bn} বিভাগ`, `${farmer.village} village, ${u.full.en}, ${upazila.name.en} upazila, ${upazila.district.en} district, ${upazila.division.en} division`)}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {profile.mobile ? <Badge><Phone size={12} />{lang === 'bn' ? bnDigits(profile.mobile) : profile.mobile}</Badge> : <Badge tone="amber">{T('মোবাইল নম্বর দেওয়া হয়নি', 'No mobile number yet')}</Badge>}
            {landConfirmed ? <Badge><CheckCircle2 size={12} />{T('জমি নিশ্চিত', 'Field confirmed')}</Badge> : <Badge tone="amber">{T('জমি নিশ্চিত হয়নি', 'Field not confirmed')}</Badge>}
            <Badge tone="slate">{T(`কৃষক নম্বর ${farmer.id}`, `Farmer ID ${farmer.id}`)}</Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Card data-tour="pf-form" className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[20px] font-bold"><UserRound size={19} className="text-primary-600" />{T('ব্যক্তিগত তথ্য', 'Personal details')}</h2>
          <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="pf-bn" label={T('নাম (বাংলায়)', 'Name (Bangla)')}><input id="pf-bn" value={form.nameBn} onChange={set('nameBn')} className={INPUT} autoComplete="name" /></Field>
            <Field id="pf-en" label={T('নাম (ইংরেজিতে)', 'Name (English)')}><input id="pf-en" value={form.nameEn} onChange={set('nameEn')} className={INPUT} lang="en" /></Field>
            <Field id="pf-mobile" label={T('মোবাইল নম্বর', 'Mobile number')}>
              <input id="pf-mobile" type="tel" inputMode="tel" value={form.mobile} onChange={set('mobile')} placeholder="01XXXXXXXXX" className={`${INPUT} ${mobile.ok ? '' : '!border-red-400'}`} aria-invalid={!mobile.ok} aria-describedby="pf-mobile-msg" autoComplete="tel" />
              {!mobile.ok && <span id="pf-mobile-msg" className="mt-1 block text-[13px] text-red-700">{T('১১ অঙ্কের নম্বর দিন, ০১ দিয়ে শুরু (যেমন ০১৭১২৩৪৫৬৭৮)।', 'Enter 11 digits starting with 01 (for example 01712345678).')}</span>}
            </Field>
            <Field id="pf-guardian" label={T('পিতা বা স্বামীর নাম', 'Father’s or husband’s name')} hint={T('(ইচ্ছা হলে)', '(optional)')}><input id="pf-guardian" value={form.guardian} onChange={set('guardian')} className={INPUT} /></Field>
            <Field id="pf-card" label={T('কৃষি উপকরণ সহায়তা কার্ড নম্বর', 'Agri input card number')} hint={T('(থাকলে)', '(if any)')}><input id="pf-card" value={form.card} onChange={set('card')} className={INPUT} /></Field>
            <Field id="pf-own" label={T('জমির মালিকানা', 'Land tenure')}>
              <select id="pf-own" value={form.ownership} onChange={set('ownership')} className={INPUT}>{Object.entries(OWNERSHIP).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}</select>
            </Field>
            <Field id="pf-years" label={T('কত বছর চাষ করছেন', 'Years farming')}><input id="pf-years" type="number" inputMode="numeric" min="0" max="80" value={form.years} onChange={set('years')} className={INPUT} /></Field>
            <Field id="pf-house" label={T('পরিবারের সদস্য', 'People in the household')}><input id="pf-house" type="number" inputMode="numeric" min="1" max="30" value={form.household} onChange={set('household')} className={INPUT} /></Field>
            <Field id="pf-contact" label={T('কর্মকর্তা কীভাবে জানাবেন', 'How the officer should reach you')}>
              <select id="pf-contact" value={form.contact} onChange={set('contact')} className={INPUT}>{Object.entries(CONTACT).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}</select>
            </Field>
            <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
              <Button type="submit" disabled={!dirty || !mobile.ok} className="disabled:opacity-50"><Save size={16} />{T('সংরক্ষণ করুন', 'Save')}</Button>
              {profile.savedAt && !dirty && <span className="flex items-center gap-1.5 text-[13.5px] text-primary-700"><CheckCircle2 size={15} />{T('সব তথ্য সংরক্ষিত', 'Everything is saved')}</span>}
            </div>
          </form>
          <Note className="mt-4">{T('এই নমুনায় তথ্য শুধু এই ব্রাউজারে সংরক্ষিত থাকে; কোথাও পাঠানো হয় না। "নমুনা আবার শুরু করুন" চাপলে মুছে যাবে।', 'In this demo the details are kept in this browser only and are not sent anywhere. "Restart the demo" clears them.')}</Note>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[20px] font-bold"><MapPin size={19} className="text-primary-600" />{T('ঠিকানা', 'Address')}</h2>
              <Button to="/farmer/farm" variant="ghost" className="!h-9 !px-2 text-[13.5px]"><Pencil size={14} />{T('জমি থেকে বদলান', 'Change via My field')}</Button>
            </div>
            <Rows rows={[
              [T('গ্রাম', 'Village'), lang === 'bn' ? farmer.villageBn : farmer.village],
              [T('ইউনিয়ন', 'Union'), L(u.full)],
              [T('উপজেলা', 'Upazila'), L(upazila.name)],
              [T('জেলা', 'District'), L(upazila.district)],
              [T('বিভাগ', 'Division'), L(upazila.division)],
            ]} />
          </Card>

          <Card data-tour="pf-land" className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-[20px] font-bold"><Sprout size={19} className="text-primary-600" />{T('জমি ও চাষ', 'Land and farming')}</h2>
            <Rows rows={[
              [T('জমির মাপ', 'Field size'), T(`${num(farmer.area_dec, 'bn')} শতক (${num(bigha, 'bn', { dp: 1 })} বিঘা)`, `${farmer.area_dec} decimal (${num(bigha, 'en', { dp: 1 })} bigha)`)],
              [T('জমির মালিকানা', 'Land tenure'), L(OWNERSHIP[profile.ownership ?? 'own'])],
              [T('গত রবিতে', 'Last Rabi'), cropName(farmer.last_crop, lang)],
              [T('সেচ', 'Irrigation'), L(IRRIGATION[farmer.irrigation])],
              [T('এই মৌসুমের ফসল', 'This season'), `${L(chosen.crop.name)} · ${confirmedPlan ? T('পরিকল্পনা পাকা', 'plan confirmed') : T('পাকা হয়নি', 'not confirmed')}`],
            ]} />
          </Card>

          <Card data-tour="pf-office" className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-[20px] font-bold"><Building2 size={19} className="text-primary-600" />{T('আমার কৃষি অফিস', 'My agriculture office')}</h2>
            <Rows rows={[
              [T('উপজেলা কৃষি অফিসার', 'Upazila agriculture officer'), L(upazila.officer)],
              [T('অফিস', 'Office'), T(`${upazila.name.bn} উপজেলা কৃষি অফিস, ${upazila.district.bn}`, `${upazila.name.en} upazila agriculture office, ${upazila.district.en}`)],
              [T('জানানোর উপায়', 'Contact by'), L(CONTACT[profile.contact ?? 'app'])],
            ]} />
          </Card>

          <Card data-tour="pf-reqs" className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[20px] font-bold"><LifeBuoy size={19} className="text-primary-600" />{T('আমার অনুরোধ ও বার্তা', 'My requests and messages')}</h2>
              <Button to="/farmer/help" variant="ghost" className="!h-9 !px-2 text-[13.5px]">{T('দেখুন', 'Open')}</Button>
            </div>
            <Rows rows={[
              [T('পাঠানো অনুরোধ', 'Requests sent'), num(mine.length, lang)],
              [T('উত্তরের অপেক্ষায়', 'Waiting for a reply'), num(openReq, lang)],
              [T('কর্মকর্তার বার্তা', 'Messages from the officer'), num(myAdvisories.length, lang)],
            ]} />
          </Card>
        </div>
      </div>
    </div>
  );
}
