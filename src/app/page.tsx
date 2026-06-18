"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesGrid from "@/components/ServicesGrid";
import FloorVisualizer from "@/components/FloorVisualizer";
import PriceCalculator from "@/components/PriceCalculator";
import Footer from "@/components/Footer";
import BookingForm from "@/components/BookingForm";

export default function Home() {
  useEffect(() => {
    // Disable browser scroll restoration so it doesn't jump back down
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    // Force scroll to top on load
    window.scrollTo(0, 0);
  }, []);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [prefilledBookingData, setPrefilledBookingData] = useState<{
    subServiceId: string;
    area: number;
    estimatedMin: number;
    estimatedMax: number;
  } | null>(null);

  // States to pass trigger information down to the Calculator
  const [calculatorPrefill, setCalculatorPrefill] = useState<{
    category: string;
    subService: string;
  } | undefined>(undefined);

  // Handlers for interaction
  const handleOpenBookModal = (prefilledSubServiceId?: string) => {
    if (prefilledSubServiceId) {
      setPrefilledBookingData({
        subServiceId: prefilledSubServiceId,
        area: 500, // Default area
        estimatedMin: 0,
        estimatedMax: 0,
      });
    } else {
      setPrefilledBookingData(null);
    }
    setIsBookModalOpen(true);
  };

  const handleBookWithEstimate = (estimateData: {
    subServiceId: string;
    area: number;
    estimatedMin: number;
    estimatedMax: number;
  }) => {
    setPrefilledBookingData(estimateData);
    setIsBookModalOpen(true);
  };

  const handleTriggerCalculator = (categoryId?: string, subServiceId?: string) => {
    if (categoryId && subServiceId) {
      setCalculatorPrefill({ category: categoryId, subService: subServiceId });
    }
    
    // Scroll to calculator
    const el = document.getElementById("calculator");
    if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen bg-brand-light flex flex-col pt-[80px]">
      {/* Navigation Bar */}
      <Navbar onBookClick={() => handleOpenBookModal()} />

      {/* Main Home Sections */}
      <main className="flex-grow">
        
        {/* 1. Hero Section */}
        <HeroSection 
          onBookClick={() => handleOpenBookModal()} 
          onEstimateClick={() => handleScrollToSection("calculator")}
        />

        {/* 2. Interactive Floor Visualizer */}
        <FloorVisualizer />

        {/* 3. Services Showcase Grid */}
        <ServicesGrid 
          onBookClick={handleOpenBookModal} 
          onEstimateClick={handleTriggerCalculator}
        />

        {/* 4. Pricing Calculator */}
        <PriceCalculator 
          onBookWithEstimate={handleBookWithEstimate}
          prefilledCategory={calculatorPrefill?.category}
          prefilledSubService={calculatorPrefill?.subService}
        />

      </main>

      {/* Footer Block */}
      <Footer />

      {/* Modal Popup for Form Booking */}
      <BookingForm 
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        prefilledData={prefilledBookingData}
      />
    </div>
  );
}
