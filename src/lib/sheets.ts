import { google } from "googleapis";

export interface BookingData {
  bookingId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceId: string;
  serviceName: string;
  areaSqFt: number;
  estimatedCost: string;
  preferredDate: string;
  notes?: string;
  status?: string;
  createdAt?: string;
}

/**
 * Appends a booking record as a row in Google Sheets.
 * If credentials are not set, it throws a descriptive error so the caller can fallback.
 */
export async function appendBookingToSheet(booking: BookingData): Promise<boolean> {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Google Sheets environment variables are missing.");
  }

  // Format private key correctly (replace escaped newlines if loaded from string)
  const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: formattedPrivateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Format the date/time of submission
    const dateSubmitted = booking.createdAt || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const status = booking.status || "Pending Site Visit";

    const rowValues = [
      booking.bookingId,
      dateSubmitted,
      booking.name,
      booking.email,
      booking.phone,
      booking.serviceName,
      booking.areaSqFt,
      booking.estimatedCost,
      booking.preferredDate,
      booking.address,
      booking.notes || "",
      status
    ];

    // Append to Sheet1 or whatever the default grid is
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:L",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [rowValues],
      },
    });

    return true;
  } catch (error: any) {
    console.error("Error writing to Google Sheets:", error);
    throw new Error(`Google Sheets API Error: ${error.message || error}`);
  }
}
