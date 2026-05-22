import LandingNavbar from "../../components/landing/LandingNavbar";
import HeroSection from "../../components/landing/HeroSection";
import ProblemsSection from "../../components/landing/ProblemsSection";
import SolutionSection from "../../components/landing/SolutionSection";
import ProductsSection from "../../components/landing/ProductsSection";
import FeaturesSection from "../../components/landing/FeaturesSection";
import DashboardPreviewSection from "../../components/landing/DashboardPreviewSection";
import PricingSection from "../../components/landing/PricingSection";
import TrustSection from "../../components/landing/TrustSection";
import FAQSection from "../../components/landing/FAQSection";
import ContactSection from "../../components/landing/ContactSection";
import LandingFooter from "../../components/landing/LandingFooter";
import { useNavbarScroll, useScrollReveal } from "../../hooks/useScrollReveal";

export default function LandingPage() {
  useNavbarScroll();
  useScrollReveal();

  return (
    <div className="landing-page">
      <LandingNavbar />
      <main>
        <HeroSection />
        <ProblemsSection />
        <SolutionSection />
        <ProductsSection />
        <FeaturesSection />
        <DashboardPreviewSection />
        <PricingSection />
        <TrustSection />
        <FAQSection />
        <ContactSection />
      </main>
      <LandingFooter />
    </div>
  );
}
