"use client";

import React, { useState, useEffect } from "react";
import { servicesData, ServiceCategory, SubService } from "../data/services";
import { Calculator, ArrowRight, Info, CheckCircle } from "lucide-react";

interface PriceCalculatorProps {
  onBookWithEstimate: (prefilledData: {
    subServiceId: string;
    area: number;
    estimatedMin: number;
    estimatedMax: number;
  }) => void;
  prefilledCategory?: string;
  prefilledSubService?: string;
}

export default function PriceCalculator({ 
  onBookWithEstimate,
  prefilledCategory,
  prefilledSubService
}: PriceCalculatorProps) {
  const availableCategories = servicesData.filter(c => !c.comingSoon);
  const initialCategory = availableCategories[0] || servicesData[0];
  const [selectedCatId, setSelectedCatId] = useState(initialCategory.id);
  const [selectedSubId, setSelectedSubId] = useState(initialCategory.subServices[0].id);
  const [areaSqFt, setAreaSqFt] = useState<number>(500);

  // Sync prefilled data if passed
  useEffect(() => {
    if (prefilledCategory) {
      setSelectedCatId(prefilledCategory);
      const cat = availableCategories.find(c => c.id === prefilledCategory);
      if (cat && cat.subServices.length > 0) {
        // Find if prefilled sub service is in this category
        const sub = cat.subServices.find(s => s.id === prefilledSubService);
        setSelectedSubId(sub ? sub.id : cat.subServices[0].id);
      }
    }
  }, [prefilledCategory, prefilledSubService]);

  // Find active data objects
  const activeCategory = availableCategories.find((c) => c.id === selectedCatId) || initialCategory;
  
  // If the selected sub service ID is not in the active category's sub services, reset it
  useEffect(() => {
    const isSubInCat = activeCategory.subServices.some((s) => s.id === selectedSubId);
    if (!isSubInCat && activeCategory.subServices.length > 0) {
      setSelectedSubId(activeCategory.subServices[0].id);
    }
  }, [selectedCatId, activeCategory, selectedSubId]);

  const activeSubService = activeCategory.subServices.find((s) => s.id === selectedSubId) || activeCategory.subServices[0];

  const minRate = activeSubService?.pricePerSqFtMin || 0;
  const maxRate = activeSubService?.pricePerSqFtMax || 0;

  // Calculate totals
  const totalMin = Math.round(areaSqFt * minRate);
  const totalMax = Math.round(areaSqFt * maxRate);

  const handleAreaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setAreaSqFt(val < 0 ? 0 : val);
  };

  const handleBook = () => {
    if (activeSubService) {
      onBookWithEstimate({
        subServiceId: activeSubService.id,
        area: areaSqFt,
        estimatedMin: totalMin,
        estimatedMax: totalMax
      });
    }
  };

  return (
    <section id="calculator" className="py-20 bg-slate-50 border-y border-slate-100 grid-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-block px-3 py-1 bg-brand-gold-light text-brand-dark-light text-xs font-semibold tracking-widest uppercase rounded-sm mb-4">
            Instant Estimate
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-brand-dark mb-4">
            Project Cost Calculator
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Select a service, input your project area in square feet, and get an instant, transparent estimate range.
          </p>
        </div>

        <div className="max-w-5xl mx-auto bg-white border border-slate-200/60 shadow-xl rounded-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Input Form Column (Left) */}
          <div className="p-8 lg:col-span-7 flex flex-col gap-6">
            <h3 className="font-heading font-extrabold text-lg text-brand-dark flex items-center gap-2 pb-4 border-b border-slate-100">
              <Calculator className="w-5 h-5 text-brand-gold" />
              Configure Project Details
            </h3>

            {/* 1. Category Selector */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
                1. Select Service Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCatId(cat.id);
                      setSelectedSubId(cat.subServices[0].id);
                    }}
                    className={`px-3 py-3 border text-xs font-heading font-bold uppercase tracking-wider rounded-sm text-center transition-all duration-200 ${
                      selectedCatId === cat.id
                        ? "bg-brand-dark border-brand-dark text-white shadow-md"
                        : "bg-white border-slate-200 hover:border-brand-gold text-slate-700"
                    }`}
                  >
                    {cat.title.replace(" Installation", "").replace(" Solutions", "")}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Sub-service Selector */}
            <div>
              <label htmlFor="subservice-select" className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
                2. Select Specific Service Type
              </label>
              <select
                id="subservice-select"
                value={selectedSubId}
                onChange={(e) => setSelectedSubId(e.target.value)}
                className="w-full bg-white border border-slate-200 text-brand-dark px-4 py-3 rounded-sm focus:outline-none focus:border-brand-gold text-sm font-medium"
              >
                {activeCategory.subServices.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} (₹{sub.pricePerSqFtMin.toFixed(2)} - ₹{sub.pricePerSqFtMax.toFixed(2)}/sqft)
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Area Input (Numeric & Slider) */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="area-input" className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                  3. Enter Project Area (Sq Ft)
                </label>
                <div className="relative">
                  <input
                    id="area-input"
                    type="number"
                    value={areaSqFt === 0 ? "" : areaSqFt}
                    onChange={handleAreaChange}
                    className="w-24 bg-slate-50 border border-slate-200 text-brand-dark text-right pr-2 py-1 rounded-sm focus:outline-none focus:border-brand-gold text-sm font-bold"
                  />
                  <span className="text-xs text-slate-400 font-medium ml-1">sqft</span>
                </div>
              </div>

              {/* Slider for area quick adjustment */}
              <input
                type="range"
                min="50"
                max="5000"
                step="50"
                value={areaSqFt}
                onChange={(e) => setAreaSqFt(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-gold mt-2"
                aria-label="Area range slider"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
                <span>50 sqft</span>
                <span>1,000 sqft</span>
                <span>2,500 sqft</span>
                <span>5,000 sqft</span>
              </div>
            </div>

            {/* Service details reminder card */}
            {activeSubService && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-sm">
                <div className="flex gap-2 items-start text-xs text-slate-600">
                  <Info className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-brand-dark">{activeSubService.name} Includes:</p>
                    <div className="grid grid-cols-2 gap-1 mt-1.5 font-normal">
                      {activeSubService.features.slice(0, 4).map((f, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="w-1 h-1 bg-brand-gold rounded-full" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Pricing Summary Column (Right) */}
          <div className="p-8 lg:col-span-5 bg-brand-dark text-white flex flex-col justify-between relative border-l border-slate-800">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-brand-gold/10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-brand-gold/10 pointer-events-none" />

            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                Estimated Rate
              </p>
              <h4 className="font-heading font-extrabold text-xl sm:text-2xl text-brand-gold mb-6">
                ₹{minRate.toFixed(2)} - ₹{maxRate.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ sqft</span>
              </h4>

              <div className="h-[1px] bg-slate-800 w-full my-6" />

              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                Project Cost Estimate
              </p>
              
              <div className="flex flex-col gap-1">
                <p className="text-xs text-slate-400">Approximate Budget Range:</p>
                <h3 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                  ₹{totalMin.toLocaleString("en-IN")} - <br className="sm:hidden" />
                  <span className="text-brand-gold">₹{totalMax.toLocaleString("en-IN")}</span>
                </h3>
              </div>

              <div className="mt-6 flex flex-col gap-2 text-xs text-slate-400 font-normal">
                <div className="flex justify-between">
                  <span>Selected Service:</span>
                  <span className="text-white font-semibold">{activeSubService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Area:</span>
                  <span className="text-white font-semibold">{areaSqFt.toLocaleString()} sq ft</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={handleBook}
                disabled={areaSqFt <= 0}
                className="w-full bg-brand-gold hover:bg-brand-gold-hover disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-brand-dark font-heading font-bold text-sm tracking-wider uppercase py-4 rounded-sm transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>Book With This Estimate</span>
                <ArrowRight className="w-4 h-4 text-brand-dark" />
              </button>
              <p className="text-[10px] text-slate-500 text-center mt-2.5 leading-relaxed">
                Estimate includes basic site prep and materials. Final invoice based on formal on-site measurement.
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
