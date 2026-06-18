"use client";

import React from "react";
import Link from "next/link";
import Logo from "./Logo";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
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
    <footer className="bg-white text-brand-dark border-t-4 border-brand-gold pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Col 1: Brand Info */}
          <div className="flex flex-col gap-6">
            <div className="flex justify-start">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm inline-block">
                <Logo />
              </div>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Builder Nation delivers premium, engineered construction and renovation services. From luxury flooring to full-scale structural roofing and waterproofing solutions.
            </p>
            <div className="flex gap-4">
              <a href="#" aria-label="Facebook link" className="text-slate-500 hover:text-brand-gold transition-colors duration-200">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                </svg>
              </a>
              <a href="#" aria-label="Instagram link" className="text-slate-500 hover:text-brand-gold transition-colors duration-200">
                <svg className="w-5 h-5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a href="#" aria-label="Twitter X link" className="text-slate-500 hover:text-brand-gold transition-colors duration-200">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn link" className="text-slate-500 hover:text-brand-gold transition-colors duration-200">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Quick links */}
          <div>
            <h3 className="font-heading font-bold text-lg tracking-wider text-brand-gold uppercase mb-6">
              Our Services
            </h3>
            <ul className="flex flex-col gap-3 text-slate-600 text-sm">
              <li>
                <Link href="/#services" onClick={(e) => handleScrollToSection(e, "services")} className="hover:text-brand-gold transition-colors duration-200">
                  Flooring Installation
                </Link>
              </li>
              <li>
                <Link href="/#services" onClick={(e) => handleScrollToSection(e, "services")} className="hover:text-brand-gold transition-colors duration-200">
                  Roofing Systems
                </Link>
              </li>
              <li>
                <Link href="/#services" onClick={(e) => handleScrollToSection(e, "services")} className="hover:text-brand-gold transition-colors duration-200">
                  Waterproofing Solutions
                </Link>
              </li>
              <li>
                <Link href="/#services" onClick={(e) => handleScrollToSection(e, "services")} className="hover:text-brand-gold transition-colors duration-200">
                  Professional Paint Jobs
                </Link>
              </li>
              <li>
                <Link href="/#services" onClick={(e) => handleScrollToSection(e, "services")} className="hover:text-brand-gold transition-colors duration-200">
                  Interior & Exterior Design
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact Details */}
          <div>
            <h3 className="font-heading font-bold text-lg tracking-wider text-brand-gold uppercase mb-6">
              Get in Touch
            </h3>
            <ul className="flex flex-col gap-4 text-slate-600 text-sm">
              <li className="flex gap-3 items-start">
                <MapPin className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
                <span>Chandrasekharpur, Bhubaneswar, Odisha, India</span>
              </li>
              <li className="flex gap-3 items-center">
                <Phone className="w-5 h-5 text-brand-gold shrink-0" />
                <span>+91 7735263548</span>
              </li>
              <li className="flex gap-3 items-center">
                <Mail className="w-5 h-5 text-brand-gold shrink-0" />
                <span>himanshusekhar272@gmail.com</span>
              </li>
              {/* <li className="flex gap-3 items-start">
                <Clock className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
                <div>
                  <p>Monday - Saturday: 8:00 AM - 6:00 PM</p>
                  <p className="text-slate-500">Sunday: Closed (Emergency Only)</p>
                </div>
              </li> */}
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h3 className="font-heading font-bold text-lg tracking-wider text-brand-gold uppercase mb-6">
              Newsletter
            </h3>
            <p className="text-slate-600 text-sm mb-4">
              Subscribe to get updates on construction rates, material news, and maintenance tips.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full bg-slate-50 border border-slate-200 text-brand-dark placeholder-slate-400 px-4 py-2.5 rounded-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-sm"
              />
              <button
                type="submit"
                className="w-full bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-heading font-bold text-xs uppercase tracking-widest py-3 rounded-sm transition-all duration-300 active:scale-95"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-200 mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} Builder Nation. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-brand-gold transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-brand-gold transition-colors">Terms of Service</Link>
            <Link href="/bookings" className="hover:text-brand-gold transition-colors font-semibold text-brand-gold">Admin Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
