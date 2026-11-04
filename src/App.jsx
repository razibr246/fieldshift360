import { Component, lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import Home from './pages/public/Home';
import { WhyDrawer, DataInfo, Toast } from './components/Overlays';
import { MotionManager } from './components/Motion';
import DemoTour from './components/tour/DemoTour';

// Every page except Home loads on first visit, so the landing page does not download the whole app. The service
// worker caches each route's assets when that route is first opened instead of downloading every page up front.
const load = (f, pick) => lazy(() => f().then((m) => (pick ? { default: m[pick] } : m)));
// the farmer, officer and neighbouring-country shells too: the landing page needs none of them (or their charts)
const FarmerLayout = load(() => import('./layouts/FarmerLayout'));
const OfficerLayout = load(() => import('./layouts/OfficerLayout'));
const AbroadLayout = load(() => import('./layouts/AbroadLayout'));
const Login = load(() => import('./pages/public/Login'));
const Play = load(() => import('./pages/public/Play'));
const Saga = load(() => import('./pages/public/Saga'));
const KidsDream = load(() => import('./pages/public/KidsDream'));
const People = load(() => import('./pages/public/People'));
const TestKit = load(() => import('./pages/public/TestKit'));
const Science = load(() => import('./pages/public/Science'));
const Games = load(() => import('./pages/public/Games'));
const Stories = load(() => import('./pages/public/Stories'));
const StoryLevel = load(() => import('./pages/public/StoryLevel'));
const FarmGame = load(() => import('./pages/public/FarmGame'));
const FarmerDashboard = load(() => import('./pages/farmer/Dashboard'));
const Plan = load(() => import('./pages/farmer/Plan'));
const Today = load(() => import('./pages/farmer/Today'));
const CropDoctor = load(() => import('./pages/farmer/CropDoctor'));
const Help = load(() => import('./pages/farmer/Help'));
const Support = load(() => import('./pages/farmer/Support'));
const Profile = load(() => import('./pages/farmer/Profile'));
const Harvest = load(() => import('./pages/farmer/Harvest'));
const FieldFuture = load(() => import('./pages/farmer/FieldFuture'));
const Signals = load(() => import('./pages/farmer/Signals'));
const MyFarm = load(() => import('./pages/farmer/MyFarm'));
const FarmerVoice = load(() => import('./pages/farmer/Voice'));
const SmsMode = load(() => import('./pages/farmer/SmsMode'));
const OfficerVoice = load(() => import('./pages/officer/Voice'));
const Radar = load(() => import('./pages/officer/Radar'));
const RadarOriginal = load(() => import('./pages/officer/RadarOriginal'));
const OfficerDashboard = load(() => import('./pages/officer/Dashboard'));
const Requests = load(() => import('./pages/officer/Requests'));
const RequestDetail = load(() => import('./pages/officer/RequestDetail'));
const Farmers = load(() => import('./pages/officer/Farmers'));
const FarmDetail = load(() => import('./pages/officer/Farmers'), 'FarmDetail');
const AreaMap = load(() => import('./pages/officer/AreaMap'));
const Alerts = load(() => import('./pages/officer/Alerts'));
const Planting = load(() => import('./pages/officer/Planting'));
const Upazila = load(() => import('./pages/officer/UpazilaSupply'), 'Upazila');
const Supply = load(() => import('./pages/officer/UpazilaSupply'), 'Supply');
const AbHome = load(() => import('./pages/abroad/farmer'), 'Home');
const AbField = load(() => import('./pages/abroad/farmer'), 'Field');
const AbPlan = load(() => import('./pages/abroad/farmer'), 'Plan');
const AbRisks = load(() => import('./pages/abroad/farmer'), 'Risks');
const AbFuture = load(() => import('./pages/abroad/farmer'), 'Future');
const AbHelp = load(() => import('./pages/abroad/farmer'), 'Help');
const AbOverview = load(() => import('./pages/abroad/officer'), 'Overview');
const AbAlerts = load(() => import('./pages/abroad/officer'), 'Alerts');
const AbRequests = load(() => import('./pages/abroad/officer'), 'Requests');
const AbFarmer = load(() => import('./pages/abroad/officer'), 'FarmerView');
const AbCountry = load(() => import('./pages/abroad/officer'), 'Country');
const AbAreaMap = load(() => import('./pages/abroad/officer'), 'AreaMap');
const AbPlanting = load(() => import('./pages/abroad/officer'), 'Planting');

// A quiet placeholder while a page's code arrives (usually a fraction of a second).
function PageLoading() {
  return (
    <div className="page-shell py-10" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">পাতা খোলা হচ্ছে · Loading page</span>
      <div className="skeleton h-7 w-56" style={{ animationDelay: '0ms' }} />
      <div className="skeleton mt-3 h-4 w-80 max-w-full" style={{ animationDelay: '80ms' }} />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-28" style={{ animationDelay: `${160 + i * 60}ms` }} />)}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => <div key={i} className="skeleton h-20" style={{ animationDelay: `${340 + i * 60}ms` }} />)}
      </div>
    </div>
  );
}
// If a page's code cannot be fetched (offline before it was ever opened, or a new version was deployed), say so
// plainly and offer a retry instead of a blank screen.
class PageError extends Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    const bn = document.documentElement.lang !== 'en';
    return (
      <div className="page-shell py-16 text-center" role="alert">
        <p className="text-[20px] font-bold">{bn ? 'এই পাতাটি খোলা গেল না' : 'This page could not be opened'}</p>
        <p className="mt-2 text-[15px] text-muted">{bn ? 'প্রথমবার খুলতে ইন্টারনেট লাগে। সংযোগ দেখে আবার চেষ্টা করুন।' : 'It needs the internet the first time. Check the connection and try again.'}</p>
        <button type="button" onClick={() => window.location.reload()} className="btn-gloss mt-5 inline-flex h-11 items-center rounded-full px-6 text-[15px] font-semibold text-white">{bn ? 'আবার চেষ্টা করুন' : 'Try again'}</button>
      </div>
    );
  }
}
function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <PageError key={pathname}>{children}</PageError>;
}
const page = (el) => <RouteErrorBoundary><Suspense fallback={<PageLoading />}>{el}</Suspense></RouteErrorBoundary>;

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}><Route path="/" element={<Home />} /><Route path="/play" element={page(<Play />)} /><Route path="/games" element={page(<Games />)} /><Route path="/farm" element={page(<FarmGame />)} /><Route path="/saga" element={page(<Saga />)} /><Route path="/kids" element={page(<KidsDream />)} /><Route path="/people" element={page(<People />)} /><Route path="/testkit" element={page(<TestKit />)} /><Route path="/science" element={page(<Science />)} /><Route path="/stories" element={page(<Stories />)} /><Route path="/stories/:id" element={page(<StoryLevel />)} /></Route>
        <Route path="/login" element={page(<Login />)} />
        <Route path="/farmer" element={page(<FarmerLayout />)}>
          <Route index element={page(<FarmerDashboard />)} />
          <Route path="plan" element={page(<Plan />)} />
          <Route path="today" element={page(<Today />)} />
          <Route path="doctor" element={page(<CropDoctor />)} />
          <Route path="help" element={page(<Help />)} />
          <Route path="support" element={page(<Support />)} />
          <Route path="profile" element={page(<Profile />)} />
          <Route path="harvest" element={page(<Harvest />)} />
          <Route path="future" element={page(<FieldFuture />)} />
          <Route path="signals" element={page(<Signals />)} />
          <Route path="farm" element={page(<MyFarm />)} />
          <Route path="voice" element={page(<FarmerVoice />)} />
          <Route path="sms" element={page(<SmsMode />)} />
        </Route>
        <Route path="/officer" element={page(<OfficerLayout />)}>
          <Route index element={page(<OfficerDashboard />)} />
          <Route path="requests" element={page(<Requests />)} />
          <Route path="requests/:id" element={page(<RequestDetail />)} />
          <Route path="farmers" element={page(<Farmers />)} />
          <Route path="farmers/:id" element={page(<FarmDetail />)} />
          <Route path="map" element={page(<AreaMap />)} />
          <Route path="alerts" element={page(<Alerts />)} />
          <Route path="planting" element={page(<Planting />)} />
          <Route path="supply" element={page(<Supply />)} />
          <Route path="upazila" element={page(<Upazila />)} />
          <Route path="voice" element={page(<OfficerVoice />)} />
          <Route path="radar" element={page(<Radar />)} />
          <Route path="radar-original" element={page(<RadarOriginal />)} />
        </Route>
        <Route path="/abroad/:cc" element={page(<AbroadLayout />)}>
          <Route index element={page(<AbHome />)} />
          <Route path="field" element={page(<AbField />)} />
          <Route path="plan" element={page(<AbPlan />)} />
          <Route path="risks" element={page(<AbRisks />)} />
          <Route path="future" element={page(<AbFuture />)} />
          <Route path="help" element={page(<AbHelp />)} />
          <Route path="officer" element={page(<AbOverview />)} />
          <Route path="officer/alerts" element={page(<AbAlerts />)} />
          <Route path="officer/requests" element={page(<AbRequests />)} />
          <Route path="officer/farmer" element={page(<AbFarmer />)} />
          <Route path="officer/country" element={page(<AbCountry />)} />
          <Route path="officer/map" element={page(<AbAreaMap />)} />
          <Route path="officer/planting" element={page(<AbPlanting />)} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <MotionManager />
      <WhyDrawer />
      <DataInfo />
      <Toast />
      <DemoTour />
    </>
  );
}
