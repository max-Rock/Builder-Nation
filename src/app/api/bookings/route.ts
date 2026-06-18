import { NextRequest, NextResponse } from "next/server";
import { appendBookingToSheet, BookingData } from "@/lib/sheets";

// POST new booking
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, address, serviceId, serviceName, areaSqFt, estimatedCost, preferredDate, notes } = body;

    if (!name || !email || !phone || !address || !serviceId || !areaSqFt || !preferredDate) {
      return NextResponse.json(
        { success: false, message: "Missing required booking details." },
        { status: 400 }
      );
    }

    // Generate reference ID e.g., BN-123456
    const bookingId = `BN-${Math.floor(100000 + Math.random() * 900000)}`;
    const createdAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const status = "Pending Site Visit";

    const newBooking: BookingData = {
      bookingId,
      name,
      email,
      phone,
      address,
      serviceId,
      serviceName,
      areaSqFt: Number(areaSqFt),
      estimatedCost,
      preferredDate,
      notes: notes || "",
      status,
      createdAt
    };

    let savedInSheets = false;
    let sheetErrorMsg = "";

    // Attempt to write to Google Sheets
    try {
      const sheetsConfigured = !!(
        process.env.GOOGLE_CLIENT_EMAIL &&
        process.env.GOOGLE_PRIVATE_KEY &&
        process.env.GOOGLE_SPREADSHEET_ID
      );

      if (sheetsConfigured) {
        await appendBookingToSheet(newBooking);
        savedInSheets = true;
      } else {
        throw new Error("Google Sheets credentials are not configured.");
      }
    } catch (sheetErr: any) {
      console.warn("Google Sheet write failed. Error:", sheetErr);
      sheetErrorMsg = sheetErr.message || String(sheetErr);
    }

    return NextResponse.json({
      success: true,
      bookingId,
      savedInSheets,
      sheetError: sheetErrorMsg,
      booking: newBooking
    });

  } catch (error: any) {
    console.error("Booking post handler error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
