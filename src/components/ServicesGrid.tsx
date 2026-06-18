"use client";

import React, { useState } from "react";
import { servicesData, ServiceCategory, SubService } from "../data/services";
import { 
  Grid, 
  Home, 
  ShieldAlert, 
  Paintbrush, 
  Compass, 
  ArrowRight, 
  Check, 
  X, 
  Calculator,
  CalendarCheck
} from "lucide-react";

interface ServicesGridProps {
  onBookClick: (prefilledServiceId?: string) => void;
  onEstimateClick: (categoryId?: string, subServiceId?: string) => void;
}

export default function ServicesGrid({ onBookClick, onEstimateClick }: ServicesGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (selectedCategory) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedCategory]);

  // Map icon strings to Lucide components
  const iconMap: Record<string, React.ComponentType<any>> = {
    Grid: Grid,
    Home: Home,
    ShieldAlert: ShieldAlert,
    Paintbrush: Paintbrush,
    Compass: Compass,
  };

  const renderIcon = (iconName: string, className: string) => {
    const IconComponent = iconMap[iconName] || Grid;
    return <IconComponent className={className} />;
  };

  return (
    <section id="services" className="py-20 bg-brand-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 bg-brand-gold-light text-brand-dark-light text-xs font-semibold tracking-widest uppercase rounded-sm mb-4">
            Our Expertise
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-brand-dark mb-4">
            Professional Construction & Renovation Services
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            From foundation waterproofing to high-end finish work, we provide upfront per square foot pricing and certified workmanship on every project.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {servicesData.map((category) => (
            <div 
              key={category.id}
              onClick={() => !category.comingSoon && setSelectedCategory(category)}
              className={`bg-white border border-slate-100 shadow-sm rounded-sm p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                category.comingSoon 
                  ? 'opacity-80 grayscale-[20%]' 
                  : 'hover:border-brand-gold/50 hover:shadow-xl group transform hover:-translate-y-1 cursor-pointer'
              }`}
            >
              {/* Gold top accent line on hover */}
              {!category.comingSoon && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-brand-gold transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              )}
              
              <div>
                {/* Icon Circle */}
                <div className="w-14 h-14 bg-slate-50 group-hover:bg-brand-gold-light flex items-center justify-center rounded-sm text-brand-dark group-hover:text-brand-gold transition-colors duration-300 mb-6">
                  {renderIcon(category.iconName, "w-6 h-6")}
                </div>

                <h3 className="font-heading font-extrabold text-xl text-brand-dark group-hover:text-brand-gold transition-colors duration-300 mb-3">
                  {category.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  {category.shortDescription}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {category.comingSoon ? (
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <span className="inline-block bg-slate-100 text-slate-500 font-bold text-xs px-3 py-1 rounded-sm uppercase tracking-wider">
                      Coming Soon
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Min price display */}
                    <div className="text-xs text-slate-400 font-medium">
                      Rates start from: <span className="text-brand-dark font-heading font-bold text-sm">₹{Math.min(...category.subServices.map(s => s.pricePerSqFtMin))} - ₹{Math.max(...category.subServices.map(s => s.pricePerSqFtMax))} <span className="text-xs font-normal text-slate-400">/ sqft</span></span>
                    </div>
                    
                    <span
                      className="inline-flex items-center gap-2 text-brand-dark font-heading font-bold text-xs uppercase tracking-wider group-hover:text-brand-gold transition-colors w-fit pt-2"
                    >
                      View Specific Options
                      <ArrowRight className="w-4 h-4 text-brand-gold transform group-hover:translate-x-1 transition-transform" />
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Detail Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 shadow-2xl rounded-sm w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 md:p-8 bg-slate-50 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="flex gap-3 md:gap-4 items-start md:items-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-gold-light rounded-sm flex items-center justify-center text-brand-gold shrink-0">
                  {renderIcon(selectedCategory.iconName, "w-5 h-5 md:w-6 md:h-6")}
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg md:text-2xl text-brand-dark leading-snug">
                    {selectedCategory.title} Options
                  </h3>
                  <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                    {selectedCategory.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-slate-400 hover:text-brand-dark p-1.5 hover:bg-slate-200 rounded-full transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5 md:w-6 h-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable options list */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 flex flex-col gap-8">
              {selectedCategory.subServices.map((sub) => (
                <div key={sub.id} className="border-b border-slate-100 last:border-none pb-6 last:pb-0">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
                    <h4 className="font-heading font-extrabold text-lg text-brand-dark">
                      {sub.name}
                    </h4>
                    {/* Price Tag */}
                    <div className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-sm text-xs font-semibold text-brand-dark">
                      Estimate: <span className="text-brand-gold font-heading font-extrabold text-sm">₹{sub.pricePerSqFtMin.toFixed(2)} - ₹{sub.pricePerSqFtMax.toFixed(2)}</span> / sq ft
                    </div>
                  </div>
                  
                  <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                    {sub.description}
                  </p>

                  {/* Features checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {sub.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        onEstimateClick(selectedCategory.id, sub.id);
                      }}
                      className="inline-flex items-center justify-center sm:justify-start gap-1.5 text-xs font-heading font-bold uppercase tracking-wider text-brand-gold hover:text-brand-gold-hover transition-colors"
                    >
                      <Calculator className="w-4 h-4" />
                      Calculate Estimate
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        onBookClick(sub.id);
                      }}
                      className="inline-flex items-center justify-center sm:justify-start gap-1.5 text-xs font-heading font-bold uppercase tracking-wider text-brand-dark hover:text-brand-dark-light transition-colors sm:ml-4 sm:border-l sm:border-slate-200 sm:pl-4"
                    >
                      <CalendarCheck className="w-4 h-4" />
                      Book Service
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCategory(null)}
                className="bg-brand-dark text-white font-heading font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-sm hover:bg-brand-dark-light transition-colors"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}
