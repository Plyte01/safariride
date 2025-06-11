// src/lib/invoiceTemplate.ts
import { Booking, Car, User, Payment } from '@prisma/client';

interface InvoiceData extends Booking {
  car: Car & { owner: Pick<User, 'name' | 'email'> };
  user: Pick<User, 'name' | 'email'>; // Renter
  payment: Payment | null;
  platformName?: string;
  platformAddress?: string;
  platformContact?: string;
  platformLogoUrl?: string; // Optional: URL for a logo
}

export const getInvoiceHTML = (data: InvoiceData): string => {
  const formatDate = (dateStr: string | Date | null) => dateStr ? new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric'}) : 'N/A';
  // Assuming KES, adjust if platform setting is used
  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`; 

  // Converts enum-like values (e.g., BOOKED, PAID) to a more readable format
  const formatEnum = (value: string | null | undefined) => {
    if (!value) return 'N/A';
    return value
      .toString()
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/(^|\s)\S/g, (l) => l.toUpperCase());
  };

  // A4 dimensions: ~210mm x 297mm. With 1cm margins, content area ~190mm.
  // Good font sizes for print: 10pt-12pt for body, 14-18pt for headings.
  // 1pt = ~0.35mm. So 10pt = 3.5mm.
  // Max width for content within A4 with 1cm margins each side is approx 19cm or 190mm.
  // Let's use `pt` for font sizes and be mindful of widths.

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Invoice #${data.id.substring(0,8).toUpperCase()}</title>
        <style>
            @page {
                size: A4;
                margin: 1cm; /* Default browser margins, puppeteer can override */
            }
            body { 
                font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; 
                margin: 0; 
                padding: 0; 
                color: #333333; 
                font-size: 10pt; /* Base font size for print */
                line-height: 1.4;
            }
            .invoice-container { 
                width: 100%; 
                /* max-width will be implicitly handled by A4 page size and margins */
            }
            .header-section {
                display: flex; /* Use flexbox for alignment */
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 25pt;
                padding-bottom: 15pt;
                border-bottom: 1px solid #cccccc;
            }
            .platform-info h1 { 
                margin: 0 0 5pt 0; 
                color: #003366; /* Darker blue */
                font-size: 20pt; 
                font-weight: bold;
            }
            .platform-info p { margin: 2pt 0; font-size: 8pt; color: #444444; }
            .invoice-title { text-align: right; }
            .invoice-title h2 { margin: 0; font-size: 22pt; color: #003366; text-transform: uppercase; }
            .invoice-title p { margin: 2pt 0; font-size: 9pt; }

            .parties-section { 
                display: flex;
                justify-content: space-between;
                margin-bottom: 25pt; 
            }
            .party-box { width: 48%; font-size: 9pt; }
            .party-box h3 { font-size: 10pt; margin: 0 0 5pt 0; color: #003366; border-bottom: 1px solid #eeeeee; padding-bottom:3pt;}
            .party-box p { margin: 2pt 0; }

            .items-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 20pt; 
                font-size: 9pt;
            }
            .items-table th, .items-table td { 
                border: 1px solid #dddddd; 
                padding: 6pt; 
                text-align: left; 
                vertical-align: top;
            }
            .items-table th { 
                background-color: #e9eff5; /* Lighter blue */
                font-weight: bold; 
                font-size: 8.5pt;
                text-transform: uppercase;
            }
            .items-table td.description { width: 55%; }
            .items-table td.dates { width: 25%; }
            .items-table td.amount { text-align: right; width: 20%; }

            .summary-section { 
                display: flex;
                justify-content: flex-end; /* Align summary to the right */
                margin-top: 15pt;
            }
            .summary-box { width: 40%; font-size: 10pt; }
            .summary-box div { display: flex; justify-content: space-between; padding: 3pt 0;}
            .summary-box .grand-total { font-weight: bold; font-size: 11pt; color: #003366; border-top: 1px solid #333; padding-top: 5pt; margin-top:5pt;}

            .payment-details-section {
                margin-top: 20pt;
                padding-top: 10pt;
                border-top: 1px dashed #cccccc;
                font-size: 9pt;
            }
            .payment-details-section h3 { font-size: 10pt; margin: 0 0 5pt 0; color: #003366;}
            .payment-details-section p { margin: 2pt 0; }

            .footer-notes { 
                text-align: center; 
                margin-top: 30pt; 
                padding-top: 15pt; 
                border-top: 1px solid #cccccc; 
                font-size: 8pt; 
                color: #666666; 
            }
            .logo { max-height: 60px; max-width: 180px; margin-bottom: 10px;} /* Logo styling */
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="header-section">
                <div class="platform-info">
                    ${data.platformLogoUrl ? `<img src="${data.platformLogoUrl}" alt="Logo" class="logo">` : ''}
                    <h1>${data.platformName || 'SafariRide'}</h1>
                    <p>${data.platformAddress || 'Nairobi, Kenya'}</p>
                    <p>Email: ${data.platformContact || 'safariride2@gmail.com'}</p>
                </div>
                <div class="invoice-title">
                    <h2>Invoice</h2>
                    <p><strong>Invoice #:</strong> ${data.id.substring(0,8).toUpperCase()}</p>
                    <p><strong>Date Issued:</strong> ${formatDate(new Date())}</p>
                </div>
            </div>

            <div class="parties-section">
                <div class="party-box">
                    <h3>Billed To:</h3>
                    <p><strong>${data.user.name || 'Valued Customer'}</strong></p>
                    <p>${data.user.email}</p>
                    
                </div>
                <div class="party-box" style="text-align:right;">
                    <h3>Service Provided By:</h3>
                    <p><strong>${data.platformName || 'SafariRide Platform'}</strong></p>
                    <p>(On behalf of: ${data.car.owner.name || 'Car Owner'})</p>
                    <p>Owner Email: ${data.car.owner.email}</p>
                </div>
            </div>
            
            <div style="margin-bottom: 15pt;">
                <p style="font-size:9pt;"><strong>Booking ID:</strong> ${data.id}</p>
                <p style="font-size:9pt;"><strong>Booking Status:</strong> ${formatEnum(data.status)}</p>
            </div>

            <table class="items-table">
                <thead>
                    <tr>
                        <th class="description">Item Description</th>
                        <th class="dates">Rental Period</th>
                        <th class="amount">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="description">
                            <strong>${data.car.title || `${data.car.make} ${data.car.model}`} (${data.car.year})</strong><br>
                            <span style="font-size:8pt; color:#555;">Category: ${formatEnum(data.car.category)}, Trans: ${formatEnum(data.car.transmission)}</span>
                        </td>
                        <td class="dates">${formatDate(data.startDate)} - ${formatDate(data.endDate)}</td>
                        <td class="amount">${formatCurrency(data.totalPrice)}</td>
                    </tr>
                    <!-- Potential additional line items: Insurance, Extras, Fees -->
                </tbody>
            </table>

            <div class="summary-section">
                <div class="summary-box">
                    <div><span>Subtotal:</span> <span>${formatCurrency(data.totalPrice)}</span></div>
                    <!-- 
                    <div><span>Discount:</span> <span style="color:red;">- KES XXX.XX</span></div>
                    <div><span>Taxes (e.g., VAT 16%):</span> <span>KES XXX.XX</span></div> 
                    -->
                    <div class="grand-total"><span>GRAND TOTAL:</span> <span>${formatCurrency(data.totalPrice)}</span></div>
                </div>
            </div>
            
            ${data.payment ? `
                <div class="payment-details-section">
                    <h3>Payment Details</h3>
                    <p><strong>Method:</strong> ${formatEnum(data.payment.paymentMethod)}</p>
                    <p><strong>Status:</strong> <span style="font-weight:bold;">${formatEnum(data.payment.status)}</span></p>
                    ${data.payment.transactionId ? `<p><strong>Transaction ID:</strong> ${data.payment.transactionId}</p>` : ''}
                    <p><strong>Payment Date:</strong> ${formatDate(data.payment.updatedAt)}</p>
                </div>
            ` : '<p class="payment-details-section" style="font-style:italic;">Payment information will be updated upon transaction.</p>'}

            <div class="footer-notes">
                <p>Thank you for choosing ${data.platformName || 'SafariRide'}!</p>
                <p>This is a computer-generated invoice and does not require a signature.</p>
                <p>Questions? Contact ${data.platformContact || 'safariride2@gmail.com'}</p>
            </div>
        </div>
    </body>
    </html>
  `;
};