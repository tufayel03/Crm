
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Payment, Client, GeneralSettings } from '../types';
import { getInvoiceDisplayId } from './invoiceId';

export const createInvoiceDoc = (payment: Payment, client?: Client, settings?: GeneralSettings) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colors from the design
  const primaryColor = [24, 161, 199]; // #18A1C7 (Teal/Cyan)
  const secondaryColor = [1, 23, 31];  // #01171F (Dark Blue/Black)
  const white = [255, 255, 255];

  const companyName = settings?.companyName || "Matlance CRM";
  const companyAddress = settings?.companyAddress || "123 Anywhere St., Any City";
  const currency = settings?.currency || "USD";
  const notesText = settings?.invoiceFooterText || "We prioritize customer satisfaction. Thank you for your business.";

  // --- Background Graphics (The Curves) ---
  
  // Top Right Curve
  // Simulate the swoosh by drawing a large circle outside the canvas
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.circle(pageWidth, 0, 90, 'F'); // Main curve
  
  // Top Right Inner Curve
  doc.setFillColor(24, 161, 199); // #18A1C7
  doc.lines(
      [[0, 100], [100, 0], [0, -100], [-100, 0]], // Rough coordinates relative to start
      pageWidth, 
      0, 
      [1, 1], 
      'F', 
      true
  );
  // Actually, a simple circle at (pageWidth, 30) with radius 80 works well for that corner arc.
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.circle(pageWidth + 20, -20, 100, 'F'); 

  // --- Header Section ---
  let leftX = 15;
  let topY = 20;

  // Logo
  if (settings?.invoiceUseLogo && settings?.logoUrl) {
      try {
          const imgProps = doc.getImageProperties(settings.logoUrl);
          const ratio = imgProps.height / imgProps.width;
          const w = 40;
          const h = w * ratio;
          doc.addImage(settings.logoUrl, imgProps.fileType, leftX, topY, w, h);
          
          // Removed Company Name text next to logo as requested
          
      } catch (e) {
          // Fallback text logo
          doc.setFontSize(24);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.setFont("helvetica", "bold");
          doc.text(companyName.toUpperCase(), leftX, topY + 10);
      }
  } else {
      doc.setFontSize(24);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text(companyName.toUpperCase(), leftX, topY + 10);
  }

  // "INVOICE" Title (Right Side)
  doc.setFontSize(36);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - 15, 40, { align: 'right' });

  // --- Meta Data (Number, Date) ---
  const metaY = 55;
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont("helvetica", "normal");
  
  const invoiceNumber = getInvoiceDisplayId(payment.invoiceId, payment.id);
  doc.text(`Number: ${invoiceNumber}`, pageWidth - 15, metaY, { align: 'right' });
  doc.text(`Date: ${new Date(payment.date).toLocaleDateString()}`, pageWidth - 15, metaY + 6, { align: 'right' });
  // Optionally Due Date
  if (payment.dueDate) {
      doc.text(`Due: ${new Date(payment.dueDate).toLocaleDateString()}`, pageWidth - 15, metaY + 12, { align: 'right' });
  }

  // --- Payable To & Bill To (Left Side) ---
  let infoY = 70;
  
  // PAYABLE TO
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text("PAYABLE TO", leftX, infoY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80); // Grayer text
  infoY += 6;
  doc.text(companyName, leftX, infoY);
  infoY += 5;
  
  // Handle multiline address
  const splitAddress = doc.splitTextToSize(companyAddress, 80);
  doc.text(splitAddress, leftX, infoY);
  infoY += (splitAddress.length * 5) + 5;

  // BILL TO
  doc.setFont("helvetica", "bold");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("BILL TO", leftX, infoY);
  
  infoY += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  
  // Client Info
  doc.text(client?.companyName || payment.clientName, leftX, infoY);
  infoY += 5;
  
  const clientDetails = [];
  if (client?.contactName && client.contactName !== client.companyName) clientDetails.push(client.contactName);
  if (client?.email) clientDetails.push(client.email);
  if (client?.country) clientDetails.push(client.country);
  
  clientDetails.forEach(line => {
      doc.text(line, leftX, infoY);
      infoY += 5;
  });

  // --- Items Table ---
  // Ensure items exist, fallback to single serviceType if legacy data
  const items = payment.items && payment.items.length > 0 
    ? payment.items 
    : [{ description: payment.serviceType, quantity: 1, unitPrice: payment.amount, amount: payment.amount }];

  const tableBody = items.map(item => [
      item.description,
      item.quantity.toString(),
      `$${item.unitPrice.toLocaleString()}`,
      `$${item.amount.toLocaleString()}`
  ]);

  let tableY = Math.max(infoY + 10, 110); // Ensure clear of header

  autoTable(doc, {
    startY: tableY,
    head: [['ITEM DESCRIPTION', 'QTY', 'PRICE', 'TOTAL']],
    body: tableBody,
    theme: 'plain', // We will custom style it
    styles: {
        fontSize: 9,
        cellPadding: 6,
        textColor: [80, 80, 80],
    },
    headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left', // Design has left aligned header text except maybe numbers
    },
    columnStyles: {
        0: { cellWidth: 'auto' }, // Description
        1: { cellWidth: 20, halign: 'center' }, // Qty
        2: { cellWidth: 30, halign: 'right' }, // Price
        3: { cellWidth: 30, halign: 'right' }  // Total
    },
    // Custom styling to match image (Rounded headers? jsPDF autotable supports hooks)
    didParseCell: (data) => {
        // Custom styling if needed per cell
    },
    willDrawCell: (data) => {
       // Add border-bottom to body rows only if desired
       if (data.section === 'body' && data.row.index < data.table.body.length - 1) {
           // doc.setDrawColor(230);
           // doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
       }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // --- Bottom Section (Notes & Totals) ---
  
  // Left: Notes
  const notesWidth = pageWidth * 0.5;
  let notesY = finalY;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("NOTES:", leftX, notesY);
  
  notesY += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  const splitNotes = doc.splitTextToSize(notesText, notesWidth - 20);
  doc.text(splitNotes, leftX, notesY);

  // Right: Totals
  let totalsY = finalY;
  const rightAlignX = pageWidth - 15;
  const labelX = pageWidth - 70;

  // Sub Total
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  doc.text("SUB TOTAL", labelX, totalsY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(`$${payment.amount.toLocaleString()}`, rightAlignX, totalsY, { align: 'right' });
  
  totalsY += 8;
  
  // Tax (Mocked at 0 for now unless added to payment model)
  doc.setFont("helvetica", "bold");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("TAX (0%)", labelX, totalsY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("$0.00", rightAlignX, totalsY, { align: 'right' });

  totalsY += 10;

  // Grand Total
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("GRAND TOTAL", labelX, totalsY);
  doc.text(`$${payment.amount.toLocaleString()}`, rightAlignX, totalsY, { align: 'right' });

  // --- Footer Bar ---
  const footerHeight = 20;
  const footerY = pageHeight - footerHeight;

  // Draw gradient/solid bar
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]); // #01171F
  doc.rect(0, footerY, pageWidth, footerHeight, 'F');
  
  // Footer Content
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const footerCenterY = footerY + 13;
  
  // Website
  if (settings?.companyWebsite) {
      doc.text(settings.companyWebsite, 20, footerCenterY);
  }
  
  // Phone (Centered)
  if (settings?.companyPhone) {
      doc.text(settings.companyPhone, pageWidth / 2, footerCenterY, { align: 'center' });
  }

  // Email (Right)
  doc.text(settings?.supportEmail || "", pageWidth - 20, footerCenterY, { align: 'right' });

  // Decorative Circle at bottom left (Design match)
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  // doc.circle(0, pageHeight, 40, 'F'); // Bottom left corner swoosh optional

  return doc;
};

export const generateInvoicePDF = (payment: Payment, client?: Client, settings?: GeneralSettings) => {
  const doc = createInvoiceDoc(payment, client, settings);
  const invoiceNumber = getInvoiceDisplayId(payment.invoiceId, payment.id);
  doc.save(`Invoice_${invoiceNumber}.pdf`);
};

export const getInvoicePDFBlob = (payment: Payment, client?: Client, settings?: GeneralSettings): Blob => {
  const doc = createInvoiceDoc(payment, client, settings);
  return doc.output('blob');
};
