import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import SupportWidget from "./components/SupportWidget";
import SupportPage from "./pages/SupportPage";
import NotFoundPage from "./pages/NotFoundPage";
import CertificatePage from "./pages/CertificatePage";
import FloatingActionButton from "./components/FloatingActionButton";
import MyCertificatesPage from "./pages/MyCertificatesPage";
import PublicCertificatePage from "./pages/PublicCertificatePage";

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
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CoursePage />} />
        <Route
          path="/courses/:courseId/lessons/:lessonId"
          element={<LessonPage />}
        />
        <Route path="/kids" element={<KidsPage />} />
        <Route path="/online-college" element={<OnlineCollegePage />} />
        <Route path="/free" element={<FreePage />} />
        <Route path="/free/career-test" element={<CareerTestPage />} />
        <Route path="/free/webinars" element={<WebinarsPage />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/career-center" element={<CareerCenterPage />} />
        <Route path="/find-employee" element={<FindEmployeePage />} />
        <Route path="/bonus" element={<BonusPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/certificate" element={<CertificatePage />} />
        <Route path="*" element={<NotFoundPage />} />
        <Route path="/my-certificates" element={<MyCertificatesPage />} />
        <Route path="/certificate/public" element={<PublicCertificatePage />} />
      </Routes>
      <Footer />
      <FloatingActionButton />
    </BrowserRouter>
  );
}
