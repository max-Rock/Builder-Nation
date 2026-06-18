"use client";

import React, { useState } from "react";
import { Star, ChevronDown, ChevronUp, Quote } from "lucide-react";

export default function Testimonials() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const testimonials = [
    {
      name: "Rohan Sharma",
      role: "Homeowner, New Delhi",
      text: "Builder Nation did an exceptional job with our Kaavi (red oxide) flooring. It has that authentic antique sheen and keeps our living room noticeably cool. The pricing per sq ft was transparent right from day one.",
      rating: 5,
    },
    {
      name: "Meera Nair",
      role: "Restaurant Owner, Mumbai",
      text: "We hired them for kitchen epoxy flooring and basement waterproofing. The work was finished within the 3-day window, and they dealt with some tricky wet spots very professionally. Direct logging into sheets kept our project costs organized.",
      rating: 5,
    },
    {
      name: "Vikram Malhotra",
      role: "Project Manager, Bangalore",
      text: "Their interior design visualization was spot on, and the actual execution of our false ceiling and modular fittings matched the 3D drawings perfectly. The per sq ft bidding made it very easy to get corporate approvals.",
      rating: 5,
    },
  ];

  const faqs = [
    {
      q: "How does the pricing per square foot work?",
      a: "Our rates are transparent and inclusive of primary surface prep, standard materials, and laying labor. After you input your approximate area in our calculator, we provide an estimated range. The final quote is confirmed after a physical site measurement by our supervisor.",
    },
    {
      q: "Do you provide a warranty on waterproofing?",
      a: "Yes! All waterproofing jobs come with a written warranty of up to 10 years depending on the tier selected (PU Membrane, Cementitious, or Injection Grouting). We run a 24-hour ponding test before clearing the invoice.",
    },
    {
      q: "What is Kaavi flooring, and what are its benefits?",
      a: "Kaavi is a traditional Indian red-oxide flooring. It is extremely eco-friendly, hypoallergenic, ages beautifully over decades, and provides natural thermal cooling. It requires skilled manual troweling, which our certified builders specialize in.",
    },
    {
      q: "How do I trace my booking and view scheduling updates?",
      a: "Once you submit a request, a unique Booking Reference (e.g. BN-XXXXXX) is generated. Our field supervisor will contact you within 24 hours to schedule the final physical measurements and provide scheduling updates.",
    },
  ];

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <section id="testimonials" className="py-20 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Testimonials Block */}
        <div className="mb-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-block px-3 py-1 bg-brand-gold-light text-brand-dark-light text-xs font-semibold tracking-widest uppercase rounded-sm mb-4">
              Reviews
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-brand-dark mb-4">
              What Our Clients Say
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Real feedback from residential and commercial clients across our service nations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <div 
                key={idx} 
                className="bg-slate-50 border border-slate-100/60 p-8 rounded-sm relative flex flex-col justify-between"
              >
                <Quote className="w-10 h-10 text-brand-gold/15 absolute top-6 right-6" />
                
                <div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-brand-gold text-brand-gold" />
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6 italic">
                    "{t.text}"
                  </p>
                </div>

                <div className="border-t border-slate-200/60 pt-4 mt-auto">
                  <h4 className="font-heading font-extrabold text-sm text-brand-dark">{t.name}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Block */}
        <div className="max-w-3xl mx-auto border-t border-slate-100 pt-16">
          <div className="text-center mb-10">
            <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-brand-dark">
              Frequently Asked Questions
            </h3>
            <p className="text-slate-500 text-sm mt-2">
              Got questions? We've got transparent answers.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-slate-50 border border-slate-100 rounded-sm overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between font-heading font-bold text-sm sm:text-base text-brand-dark hover:text-brand-gold transition-colors focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-brand-gold" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </button>

                  <div 
                    className={`transition-all duration-350 ease-in-out ${
                      isOpen ? "max-h-[500px] border-t border-slate-200/50" : "max-h-0 pointer-events-none"
                    } overflow-hidden`}
                  >
                    <p className="px-6 py-4 text-slate-600 text-sm leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
