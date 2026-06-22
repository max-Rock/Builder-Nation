"use client";

import React, { useState, useEffect } from "react";
import { servicesData, SubService } from "../data/services";
import { X, Calendar, User, Phone, Mail, MapPin, Layers, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledData?: {
    subServiceId: string;
    area: number;
    estimatedMin: number;
    estimatedMax: number;
  } | null;
}

export default function BookingForm({ isOpen, onClose, prefilledData }: BookingFormProps) {
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [address, setAddress] = useState("");
  const [selectedSubId, setSelectedSubId] = useState("");
  const [areaSqFt, setAreaSqFt] = useState<number>(0);
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    bookingId?: string;
    message?: string;
    savedInSheets?: boolean;
  } | null>(null);

  // Load prefilled data when available
  useEffect(() => {
    if (isOpen) {
      if (prefilledData) {
        setSelectedSubId(prefilledData.subServiceId);
        setAreaSqFt(prefilledData.area);
      } else {
        // Select first available service
        const firstCat = servicesData[0];
        if (firstCat && firstCat.subServices.length > 0) {
          setSelectedSubId(firstCat.subServices[0].id);
        }
        setAreaSqFt(500);
      }
      // Reset submission states
      setSubmitResult(null);
    }
  }, [isOpen, prefilledData]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Flatten subservices list for selection drop down (flooring only)
  const allSubServices = servicesData
    .filter((cat) => cat.id === "flooring")
    .flatMap((cat) => 
      cat.subServices.map((sub) => ({
        ...sub,
        categoryTitle: cat.title
      }))
    );

  const activeSubService = allSubServices.find((s) => s.id === selectedSubId);

  // Dynamic estimate check
  const estMin = activeSubService ? Math.round(areaSqFt * activeSubService.pricePerSqFtMin) : 0;
  const estMax = activeSubService ? Math.round(areaSqFt * activeSubService.pricePerSqFtMax) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email || !address || !selectedSubId || !areaSqFt || !preferredDate) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    const bookingPayload = {
      name,
      email,
      phone,
      address,
      serviceId: selectedSubId,
      serviceName: activeSubService?.name || "Unknown Service",
      areaSqFt,
      estimatedCost: `₹${estMin.toLocaleString("en-IN")} - ₹${estMax.toLocaleString("en-IN")}`,
      preferredDate,
      notes,
    };

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitResult({
          success: true,
          bookingId: data.bookingId,
          savedInSheets: data.savedInSheets,
        });
        
        // Clear inputs on success
        setName("");
        setEmail("");
        setPhone("");
        setAddress("");
        setPreferredDate("");
        setNotes("");
      } else {
        setSubmitResult({
          success: false,
          message: data.message || "Failed to create booking. Please try again.",
        });
      }
    } catch (err) {
      console.error("Booking submission error:", err);
      setSubmitResult({
        success: false,
        message: "Network error. Please check your internet connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-100 shadow-2xl rounded-sm w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-heading font-extrabold text-xl text-brand-dark">
            Book a Professional Site Inspection
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-brand-dark p-1.5 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          
          {submitResult?.success ? (
            /* SUCCESS VIEW */
            <div className="flex flex-col items-center text-center py-8 px-4 gap-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <h4 className="font-heading font-extrabold text-2xl text-brand-dark">
                  Booking Request Received!
                </h4>
                <p className="text-slate-500 text-sm mt-2 max-w-md">
                  Thank you for choosing Builder Nation. Our field supervisor will call you within 24 hours to schedule the final physical measurements.
                </p>
              </div>

              {/* Booking Receipt Summary Card */}
              <div className="w-full bg-slate-50 border border-slate-100 p-6 rounded-sm text-left flex flex-col gap-3">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs text-slate-400 font-bold uppercase">Booking Reference</span>
                  <span className="text-sm text-brand-dark font-heading font-extrabold">{submitResult.bookingId}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Service:</span>
                  <span className="text-brand-dark font-semibold">{activeSubService?.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Project Area:</span>
                  <span className="text-brand-dark font-semibold">{areaSqFt} sq ft</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Estimated Cost:</span>
                  <span className="text-brand-gold font-bold">₹{estMin.toLocaleString("en-IN")} - ₹{estMax.toLocaleString("en-IN")}</span>
                </div>
                
                {submitResult.savedInSheets ? (
                  <div className="mt-2 text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200/50 p-2 rounded-sm text-center">
                    ✓ Confirmed: Booking logged directly into Google Sheets.
                  </div>
                ) : null}
              </div>

              <div className="flex gap-4 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 bg-brand-dark hover:bg-brand-dark-light text-white font-heading font-bold text-xs uppercase tracking-wider py-3.5 rounded-sm transition-all"
                >
                  Close Window
                </button>
              </div>
            </div>

          ) : (
            /* INPUT FORM VIEW */
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              {submitResult?.success === false && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <span className="text-xs">{submitResult.message}</span>
                </div>
              )}

              {/* Group 1: Contact Details */}
              <div>
                <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4 border-b border-slate-100 pb-2">
                  1. Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label htmlFor="name-input" className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="name-input"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-slate-50 border border-slate-200 text-brand-dark pl-10 pr-4 py-2.5 rounded-sm focus:outline-none focus:border-brand-gold text-sm"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone-input" className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="phone-input"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val.startsWith("+91 ")) {
                            setPhone("+91 " + val.replace(/^\+91\s*/i, ""));
                          } else {
                            setPhone(val);
                          }
                        }}
                        placeholder="98765 43210"
                        className="w-full bg-slate-50 border border-slate-200 text-brand-dark pl-10 pr-4 py-2.5 rounded-sm focus:outline-none focus:border-brand-gold text-sm"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="sm:col-span-2">
                    <label htmlFor="email-input" className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="email-input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john.doe@example.com"
                        className="w-full bg-slate-50 border border-slate-200 text-brand-dark pl-10 pr-4 py-2.5 rounded-sm focus:outline-none focus:border-brand-gold text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: Project Details */}
              <div>
                <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4 border-b border-slate-100 pb-2">
                  2. Project Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Service dropdown */}
                  <div className="sm:col-span-2">
                    <label htmlFor="service-select-dropdown" className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                      Service Category & Type *
                    </label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                        id="service-select-dropdown"
                        required
                        value={selectedSubId}
                        onChange={(e) => setSelectedSubId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-brand-dark pl-10 pr-4 py-3 rounded-sm focus:outline-none focus:border-brand-gold text-sm appearance-none"
                      >
                        {allSubServices.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.categoryTitle.replace(" Installation", "")} - {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Square Footage */}
                  <div>
                    <label htmlFor="form-area-input" className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                      Approx Area (Sq Ft) *
                    </label>
                    <input
                      id="form-area-input"
                      type="number"
                      required
                      min="10"
                      value={areaSqFt === 0 ? "" : areaSqFt}
                      onChange={(e) => setAreaSqFt(Number(e.target.value))}
                      placeholder="e.g. 500"
                      className="w-full bg-slate-50 border border-slate-200 text-brand-dark px-4 py-2.5 rounded-sm focus:outline-none focus:border-brand-gold text-sm font-semibold text-right"
                    />
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label htmlFor="address-input" className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                      Site Address *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-[13px] w-4 h-4 text-slate-400" />
                      <textarea
                        id="address-input"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={2}
                        placeholder="House No, Street Name, Landmark, City"
                        className="w-full bg-slate-50 border border-slate-200 text-brand-dark pl-10 pr-4 py-2.5 rounded-sm focus:outline-none focus:border-brand-gold text-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* Date Pick */}
                  <div>
                    <label htmlFor="date-input" className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                      Preferred Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="date-input"
                        type="date"
                        required
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-brand-dark pl-10 pr-3 py-2.5 rounded-sm focus:outline-none focus:border-brand-gold text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 3: Notes */}
              <div>
                <label htmlFor="notes-input" className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                  Special Notes / Scope of Work (Optional)
                </label>
                <textarea
                  id="notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Specify floor brand preferences, ceiling height, waterproofing challenges, etc."
                  className="w-full bg-slate-50 border border-slate-200 text-brand-dark px-4 py-2.5 rounded-sm focus:outline-none focus:border-brand-gold text-sm"
                />
              </div>

              {/* Estimate Summary Overlay */}
              <div className="bg-brand-dark text-white p-4 rounded-sm flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Estimated Cost (based on rates)</p>
                  <p className="font-heading font-extrabold text-sm sm:text-base text-brand-gold">
                    ₹{estMin.toLocaleString("en-IN")} - ₹{estMax.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  <p>Includes basic preparation</p>
                  <p>& raw materials</p>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-4 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50 font-heading font-bold text-xs uppercase tracking-wider py-3 rounded-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-brand-gold hover:bg-brand-gold-hover disabled:bg-slate-700 disabled:text-slate-500 text-brand-dark font-heading font-bold text-xs uppercase tracking-wider py-3 rounded-sm transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-brand-dark" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-brand-dark shrink-0" />
                      <span className="leading-none">Request Inspection</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
}
