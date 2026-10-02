/**
 * Dewangan Photo & Videography – Invoice Management System
 * High-Fidelity A4 PDF Generator & WhatsApp / Web Share Controller
 */

class DPVPDFGenerator {
  constructor() {}

  /**
   * Export an invoice DOM element directly to a pristine A4 PDF
   */
  async generatePdf(invoiceElement, invoiceNumber = "Invoice", isDownload = true) {
    if (!invoiceElement) {
      throw new Error("Invoice element not found");
    }

    const cleanNumber = invoiceNumber.replace(/[\/\\]/g, '-');
    const filename = `Invoice_${cleanNumber}.pdf`;

    // Configuration for optimal full-bleed A4 layout and multi-page integrity
    const opt = {
      margin: 0, // Full bleed for luxury black & gold headers/footers
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2, // High resolution for crisp photography studio prints
        useCORS: true,
        letterRendering: true,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 794, // Lock capture width to exact A4 pixel width (prevents mobile squishing)
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: {
        mode: ['css', 'legacy'],
        before: ['.inv-table-wrapper'],
        avoid: ['.avoid-break', '.inv-terms-box', '.inv-bottom-signatures-row', '.inv-payment-totals-row', '.inv-main-table tr', '.inv-pay-history-item', '.shoot-summary-card', '.inv-deliverables-card']
      }
    };

    // Desktop PDF Alignment Fix: Prevent html2canvas offset/cropping caused by flexbox center on wide screens
    // Mobile PDF (<=860px) code path remains 100% IDENTICAL and untouched.
    const isDesktop = typeof window !== 'undefined' && window.innerWidth > 860;
    let desktopContainer = null;
    let prevJustify = '';
    let prevPad = '';
    let prevMarginLeft = '';
    let prevMarginRight = '';

    if (isDesktop) {
      // Desktop fix: html2canvas calculates crop offset from element's viewport getBoundingClientRect().left
      // On desktop (screen > 860px), the container is centered in wide viewport, causing a positive left offset
      // that html2canvas shifts leftward, cutting off the left half and leaving blank space on the right.
      // Setting x: 0 forces html2canvas to render from the exact left origin (x=0) with zero clipping.
      opt.html2canvas.x = 0;
      opt.html2canvas.y = 0;
      opt.html2canvas.scrollX = 0;
      opt.html2canvas.scrollY = 0;

      if (invoiceElement && invoiceElement.parentElement) {
        desktopContainer = invoiceElement.parentElement;
        prevJustify = desktopContainer.style.justifyContent;
        prevPad = desktopContainer.style.padding;
        prevMarginLeft = invoiceElement.style.marginLeft;
        prevMarginRight = invoiceElement.style.marginRight;
        desktopContainer.style.justifyContent = 'flex-start';
        desktopContainer.style.padding = '0';
        invoiceElement.style.marginLeft = '0';
        invoiceElement.style.marginRight = '0';
      }
    }

    try {
      if (typeof html2pdf !== 'undefined') {
        const worker = html2pdf().set(opt).from(invoiceElement);
        if (isDownload) {
          await worker.save();
        } else {
          // Output blob for sharing or previewing
          return await worker.output('blob');
        }
        return true;
      } else {
        // Fallback to window print
        window.print();
        return true;
      }
    } catch (err) {
      console.error("[DPVPDFGenerator] PDF generation failed, triggering print fallback:", err);
      window.print();
      return false;
    } finally {
      if (isDesktop && desktopContainer) {
        desktopContainer.style.justifyContent = prevJustify;
        desktopContainer.style.padding = prevPad;
        invoiceElement.style.marginLeft = prevMarginLeft;
        invoiceElement.style.marginRight = prevMarginRight;
      }
    }
  }

  /**
   * Native Print Trigger
   */
  printInvoice(invoiceElement) {
    window.print();
  }

  /**
   * Share via WhatsApp or Mobile Native Share
   */
  async shareInvoice(invoice, pdfBlob = null) {
    const cust = invoice.customer || {};
    const fin = invoice.financials || {};
    const snap = invoice.businessSnapshot || {};

    const cleanPhone = (cust.whatsapp || cust.phone || '').replace(/\D/g, '');
    const intlPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    // Compose professional wedding studio message
    const message = 
`*DEWANGAN PHOTO & VIDEOGRAPHY*
Invoice No: *${invoice.invoiceNumber}*
Date: ${invoice.invoiceDate}
---------------------------------
Dear *${cust.name}*,
Thank you for booking with Dewangan Photo & Videography for your *${invoice.event.type}*.

*Event Venue:* ${invoice.event.venue || 'As agreed'}
*Package / Services:* ${invoice.items.map(i => i.name).join(', ')}
*Grand Total:* ₹${(fin.grandTotal || 0).toLocaleString('en-IN')}
*Amount Paid:* ₹${(fin.totalPaid || 0).toLocaleString('en-IN')}
*Balance Due:* ₹${(fin.balanceDue || 0).toLocaleString('en-IN')}
*Payment Status:* ${invoice.paymentStatus}

UPI Payment ID: *${snap.upiId || '9301614549@ybl'}*
For any inquiries, contact: ${[snap.mobile, (snap.altMobile && snap.altMobile !== snap.mobile) ? snap.altMobile : ''].filter(Boolean).join(' / ') || '+91 93016 14549'}
_We capture your memories forever._`;

    // 1. Try Web Share API with File (Mobile Chrome/Safari)
    if (pdfBlob && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], `Invoice_${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' })] })) {
      try {
        const file = new File([pdfBlob], `Invoice_${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: message,
          files: [file]
        });
        return { shared: true, mode: 'native_file' };
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('Native share failed, falling back to WhatsApp link:', e);
      }
    }

    // 2. Try Native Web Share with text
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: message
        });
        return { shared: true, mode: 'native_text' };
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('Native text share failed:', e);
      }
    }

    // 3. Fallback: Direct WhatsApp URL
    const waUrl = intlPhone 
      ? `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
    return { shared: true, mode: 'whatsapp_web' };
  }
}

window.dpvPdfGenerator = new DPVPDFGenerator();
window.dpvPdf = window.dpvPdfGenerator;
