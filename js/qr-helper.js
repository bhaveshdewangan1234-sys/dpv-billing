/**
 * Dewangan Photo & Videography – Invoice Management System
 * Dynamic UPI QR Code Generator
 */

class DPVQRHelper {
  constructor() {}

  /**
   * Build standard UPI intent string
   */
  generateUpiString({
    upiId = "9301614549@ybl",
    payeeName = "Dewangan Photo & Videography",
    amount = 0,
    invoiceNumber = "",
    note = ""
  }) {
    const cleanUpi = encodeURIComponent(upiId.trim());
    const cleanName = encodeURIComponent(payeeName.trim());
    const cleanNote = encodeURIComponent(note || `Payment for Invoice ${invoiceNumber}`);
    
    let upiUrl = `upi://pay?pa=${cleanUpi}&pn=${cleanName}&cu=INR&tn=${cleanNote}`;
    if (amount > 0) {
      upiUrl += `&am=${parseFloat(amount).toFixed(2)}`;
    }
    return upiUrl;
  }

  /**
   * Render QR Code inside target DOM container
   */
  renderUpiQr(containerElement, options = {}) {
    if (!containerElement) return;
    containerElement.innerHTML = '';

    const upiString = this.generateUpiString(options);

    try {
      if (typeof QRCode !== 'undefined') {
        new QRCode(containerElement, {
          text: upiString,
          width: options.size || 135,
          height: options.size || 135,
          colorDark: "#0f172a",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        // Fallback to QR server API if script failed to load
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${options.size || 135}x${options.size || 135}&data=${encodeURIComponent(upiString)}`;
        img.alt = "UPI QR Code";
        img.style.width = `${options.size || 135}px`;
        img.style.height = `${options.size || 135}px`;
        containerElement.appendChild(img);
      }
    } catch (err) {
      console.error("[DPVQRHelper] QR Generation error:", err);
      containerElement.innerHTML = `<div class="qr-placeholder">QR Code</div>`;
    }
  }

  generateInvoiceUpiString(options) {
    return this.generateUpiString(options);
  }

  generateQrCodeDataUrl(upiString, size = 135) {
    return new Promise((resolve) => {
      try {
        const div = document.createElement('div');
        if (typeof QRCode !== 'undefined') {
          new QRCode(div, {
            text: upiString,
            width: size,
            height: size,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
          setTimeout(() => {
            const canvas = div.querySelector('canvas');
            if (canvas) {
              resolve(canvas.toDataURL('image/png'));
            } else {
              const img = div.querySelector('img');
              resolve(img ? img.src : null);
            }
          }, 60);
        } else {
          resolve(`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiString)}`);
        }
      } catch (e) {
        resolve(null);
      }
    });
  }
}

window.dpvQRHelper = new DPVQRHelper();
window.dpvQrHelper = window.dpvQRHelper;
