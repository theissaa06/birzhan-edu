import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import FloatingActionButton from "./components/FloatingActionButton";
import FrameMotion from "./components/FrameMotion";
import AdminRoute from "./components/AdminRoute";
import { AuthSessionProvider } from "./components/AuthSessionProvider";
import AppToast from "./components/AppToast";
import PresenceMessages from "./components/PresenceMessages";
import AnnouncementStrip from "./components/AnnouncementStrip";
import NotificationCenter from "./components/NotificationCenter";
import "./styles/global.css";

const HomePage = lazy(() => import("./pages/HomePage"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const CoursePage = lazy(() => import("./pages/CoursePage"));
const LessonPage = lazy(() => import("./pages/LessonPage"));
const KidsPage = lazy(() => import("./pages/KidsPage"));
const OnlineCollegePage = lazy(() => import("./pages/OnlineCollegePage"));
const FreePage = lazy(() => import("./pages/FreePage"));
const CareerTestPage = lazy(() => import("./pages/CareerTestPage"));
const WebinarsPage = lazy(() => import("./pages/WebinarsPage"));
const MediaPage = lazy(() => import("./pages/MediaPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const CareerCenterPage = lazy(() => import("./pages/CareerCenterPage"));
const FindEmployeePage = lazy(() => import("./pages/FindEmployeePage"));
const BonusPage = lazy(() => import("./pages/BonusPage"));
const PremiumPage = lazy(() => import("./pages/PremiumPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const MyCertificatesPage = lazy(() => import("./pages/MyCertificatesPage"));
const PublicCertificatePage = lazy(() => import("./pages/PublicCertificatePage"));
const StaticInfoPage = lazy(() => import("./pages/StaticInfoPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const adminPaths = ["/admin", "/admin/users", "/admin/bans", "/admin/content", "/admin/reviews", "/admin/announcements", "/admin/support"];

function LoadingScreen() {
  return <main className="route-loading" aria-live="polite"><div className="loading-state"><span className="timecode">LOADING / 00:00:01</span><p>Собираем кадры страницы…</p></div></main>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthSessionProvider>
        <AppToast />
        <PresenceMessages />
        <FrameMotion />
        <AnnouncementStrip />
        <Header />
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:courseId" element={<CoursePage />} />
            <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPage />} />
            <Route path="/kids" element={<KidsPage />} />
            <Route path="/online-college" element={<OnlineCollegePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/free" element={<FreePage />} />
            <Route path="/free/career-test" element={<CareerTestPage />} />
            <Route path="/free/webinars" element={<Navigate to="/webinars" replace />} />
            <Route path="/webinars" element={<WebinarsPage />} />
            <Route path="/free/media" element={<Navigate to="/media" replace />} />
            <Route path="/media" element={<MediaPage />} />
            <Route path="/ai" element={<AIAssistantPage />} />
            <Route path="/ai-assistant" element={<Navigate to="/ai" replace />} />
            <Route path="/free/ai" element={<Navigate to="/ai" replace />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/free/students" element={<Navigate to="/students" replace />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/free/reviews" element={<Navigate to="/reviews" replace />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/career-center" element={<CareerCenterPage />} />
            <Route path="/find-employee" element={<FindEmployeePage />} />
            <Route path="/bonus" element={<BonusPage />} />
            <Route path="/premium" element={<PremiumPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {adminPaths.map((path) => <Route key={path} path={path} element={<AdminRoute><AdminPage /></AdminRoute>} />)}
            <Route path="/support" element={<SupportPage />} />
            <Route path="/certificate" element={<Navigate to="/certificates" replace />} />
            <Route path="/certificates" element={<MyCertificatesPage />} />
            <Route path="/my-certificates" element={<Navigate to="/certificates" replace />} />
            <Route path="/certificate/:certificateId" element={<PublicCertificatePage />} />
            <Route path="/certificate/public/:certificateId" element={<PublicCertificatePage />} />
            <Route path="/certificate/public" element={<Navigate to="/certificates" replace />} />
            <Route path="/faq" element={<StaticInfoPage kind="faq" />} />
            <Route path="/privacy" element={<StaticInfoPage kind="privacy" />} />
            <Route path="/offer" element={<StaticInfoPage kind="offer" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <Footer />
        <NotificationCenter />
        <FloatingActionButton />
      </AuthSessionProvider>
    </BrowserRouter>
  );
}
