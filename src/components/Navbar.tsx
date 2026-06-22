"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { Menu, X, Calendar } from "lucide-react";

interface NavbarProps {
  onBookClick?: () => void;
}

export default function Navbar({ onBookClick }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (pathname === "/") {
      e.preventDefault();
      const el = document.getElementById(targetId);
      if (el) {
        const offset = 80; // height of navbar
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = el.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
      setIsOpen(false);
    }
  };

  const navLinks = [
    { label: "Services", href: "/#services", targetId: "services" },
    { label: "Pricing Calculator", href: "/#calculator", targetId: "calculator" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white shadow-md border-b border-slate-100 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo on the left */}
          <Link href="/" className="flex items-center">
            <Logo className="scale-90 md:scale-100 transform origin-left" />
          </Link>

          {/* Navigation links for Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.targetId)}
                className="font-medium text-slate-600 hover:text-brand-gold transition-colors duration-200 text-sm tracking-wide"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Action buttons on the right */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={onBookClick}
              className="bg-brand-dark hover:bg-brand-dark-light text-white px-5 py-2.5 rounded-sm font-heading font-semibold text-sm tracking-wider uppercase transition-all duration-300 flex items-center gap-2 border border-brand-dark shadow-sm hover:shadow-md active:scale-95"
            >
              <Calendar className="w-4 h-4 text-brand-gold" />
              <span>Book Now</span>
            </button>
          </div>

          {/* Mobile hamburger menu */}
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-brand-dark p-2 hover:bg-slate-100 rounded-full transition-colors duration-200"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 top-[60px] bg-white z-40 flex flex-col px-6 py-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-5 duration-200">
          <div className="flex flex-col gap-6 text-lg font-heading">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.targetId)}
                className="font-semibold text-slate-800 hover:text-brand-gold transition-colors duration-200 border-b border-slate-100 pb-3"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-auto pb-10">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onBookClick) onBookClick();
              }}
              className="w-full bg-brand-dark hover:bg-brand-dark-light text-white py-4 rounded-sm font-heading font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 text-base"
            >
              <Calendar className="w-5 h-5 text-brand-gold shrink-0" />
              <span className="leading-none">Request Inspection</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
