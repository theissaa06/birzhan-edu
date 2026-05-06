import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import FloatingActionButton from "./components/FloatingActionButton";

import HomePage from "./pages/HomePage";
import CoursesPage from "./pages/CoursesPage";
import CoursePage from "./pages/CoursePage";
import LessonPage from "./pages/LessonPage";

import KidsPage from "./pages/KidsPage";
import OnlineCollegePage from "./pages/OnlineCollegePage";
import FreePage from "./pages/FreePage";
import CareerTestPage from "./pages/CareerTestPage";
import WebinarsPage from "./pages/WebinarsPage";
import MediaPage from "./pages/MediaPage";

import AboutPage from "./pages/AboutPage";
import StudentsPage from "./pages/StudentsPage";
import ReviewsPage from "./pages/ReviewsPage";
import JobsPage from "./pages/JobsPage";
import CareerCenterPage from "./pages/CareerCenterPage";
import FindEmployeePage from "./pages/FindEmployeePage";

import BonusPage from "./pages/BonusPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import SupportPage from "./pages/SupportPage";

import AIAssistantPage from "./pages/AIAssistantPage";

import CertificatePage from "./pages/CertificatePage";
import MyCertificatesPage from "./pages/MyCertificatesPage";
import PublicCertificatePage from "./pages/PublicCertificatePage";

import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <Header />

      <Routes>
        {/* Главная */}
        <Route path="/" element={<HomePage />} />

        {/* Курсы */}
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CoursePage />} />
        <Route
          path="/courses/:courseId/lessons/:lessonId"
          element={<LessonPage />}
        />

        {/* Основные страницы */}
        <Route path="/kids" element={<KidsPage />} />
        <Route path="/online-college" element={<OnlineCollegePage />} />
        <Route path="/about" element={<AboutPage />} />

        {/* Бесплатный раздел */}
        <Route path="/free" element={<FreePage />} />
        <Route path="/free/career-test" element={<CareerTestPage />} />
        <Route path="/free/webinars" element={<WebinarsPage />} />
        <Route path="/free/media" element={<MediaPage />} />
        <Route path="/media" element={<MediaPage />} />

        {/* AI помощник */}
        <Route path="/ai" element={<AIAssistantPage />} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/free/ai" element={<AIAssistantPage />} />

        {/* Социальные / карьерные страницы */}
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/free/students" element={<StudentsPage />} />

        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/free/reviews" element={<ReviewsPage />} />

        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/career-center" element={<CareerCenterPage />} />
        <Route path="/find-employee" element={<FindEmployeePage />} />

        {/* Бонусы */}
        <Route path="/bonus" element={<BonusPage />} />

        {/* Аккаунт */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/support" element={<SupportPage />} />

        {/* Сертификаты */}
        <Route path="/certificate" element={<CertificatePage />} />
        <Route path="/my-certificates" element={<MyCertificatesPage />} />
        <Route path="/certificate/public" element={<PublicCertificatePage />} />

        {/* 404 всегда самым последним */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Footer />
      <FloatingActionButton />
    </BrowserRouter>
  );
}
