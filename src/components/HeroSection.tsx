"use client";

import React from "react";
import Image from "next/image";
import { CheckCircle2, ArrowRight, ShieldCheck, Flame, Banknote } from "lucide-react";

interface HeroSectionProps {
  onBookClick: () => void;
  onEstimateClick: () => void;
}

export default function HeroSection({ onBookClick, onEstimateClick }: HeroSectionProps) {
  const valueProps = [
    { icon: <Banknote className="w-5 h-5 text-brand-gold" />, title: "Upfront Per Sq Ft Pricing", desc: "No hidden charges, exact measurements." },
    { icon: <ShieldCheck className="w-5 h-5 text-brand-gold" />, title: "Certified Master Builders", desc: "Licensed, highly vetted technicians." },
    { icon: <Flame className="w-5 h-5 text-brand-gold" />, title: "100% Waterproof Guarantee", desc: "Industry-leading warranty on materials." },
  ];

  return (
    <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden bg-brand-light grid-bg">
      {/* Decorative architectural grid lines */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Heading and Value Props */}
          <div className="lg:col-span-7 flex flex-col gap-6 md:gap-8 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-gold-light border border-brand-gold/30 rounded-full text-brand-dark-light text-xs font-semibold tracking-wider uppercase w-fit">
              <span className="h-2 w-2 rounded-full bg-brand-gold animate-pulse" />
              India's Premier Renovation Co.
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-brand-dark leading-[1.1]">
              Engineering Your Vision, <br />
              <span className="relative">
                <span className="relative z-10 gold-text-gradient">Building the Future</span>
                <span className="absolute bottom-1 left-0 w-full h-[6px] bg-brand-gold/20 -skew-x-12 z-0" />
              </span>
            </h1>

            <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">
              Builder Nation delivers top-tier flooring, roofing, waterproofing, painting, and architectural design solutions. Know your estimated cost instantly with our transparent per-square-foot calculator.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onBookClick}
                className="bg-brand-dark hover:bg-brand-dark-light text-white px-8 py-4 rounded-sm font-heading font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 border border-brand-dark shadow-lg hover:shadow-xl active:scale-95 text-sm"
              >
                Book Inspection Now
                <ArrowRight className="w-4 h-4 text-brand-gold" />
              </button>
              <button
                onClick={onEstimateClick}
                className="bg-white hover:bg-slate-50 text-brand-dark border-2 border-brand-dark/20 hover:border-brand-dark px-8 py-4 rounded-sm font-heading font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 text-sm"
              >
                Estimate Cost
              </button>
            </div>

            {/* Value Propositions list */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200 mt-2">
              {valueProps.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <h3 className="font-heading font-extrabold text-sm text-brand-dark tracking-wide">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

          </div>

          {/* Right Column: Visual Mockup Showcase */}
          <div className="lg:col-span-5 relative w-full flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px] aspect-[4/5] md:aspect-[3/4] lg:aspect-[4/5] rounded-sm overflow-hidden shadow-2xl border-4 border-white">
              <Image
                src="/hero_interior.png"
                alt="Premium residential renovation with polished marble floors"
                fill
                priority
                className="object-cover transition-transform duration-700 hover:scale-105"
                sizes="(max-w-768px) 100vw, 420px"
              />
              {/* Floating aesthetic stats badge */}
              <div className="absolute bottom-6 left-6 right-6 glass-effect p-4 border border-white/20 shadow-lg flex items-center justify-between rounded-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Standard rate from</p>
                  <p className="font-heading font-extrabold text-brand-dark text-lg sm:text-xl">
                    ₹40 - ₹1,500 <span className="text-xs font-normal text-slate-500">/ sqft</span>
                  </p>
                </div>
                <div className="h-10 w-[1px] bg-slate-200" />
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Rating</p>
                  <p className="font-heading font-extrabold text-brand-gold text-lg sm:text-xl">
                    4.9 ★ <span className="text-xs font-normal text-slate-500">(1.2k reviews)</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Accent Gold Geometric Ring */}
            <div className="absolute -top-6 -right-6 w-24 h-24 border-2 border-brand-gold/30 -z-10 rounded-full" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-brand-gold/10 -z-10 blur-xl" />
          </div>

        </div>
      </div>
    </section>
  );
}
