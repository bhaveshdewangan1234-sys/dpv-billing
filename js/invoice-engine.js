/**
 * Dewangan Photo & Videography – Invoice Management System
 * Core Invoice Computation Engine, Snapshotting & Immutability Controller
 */

class DPVInvoiceEngine {
  constructor() {}

  /**
   * Calculate all item subtotals, grand total, and balance due
   */
  calculateFinancials(items = [], payments = [], options = {}) {
    let subtotal = 0;
    let itemDiscountsTotal = 0;

    const calculatedItems = (items || []).map((item, idx) => {
      const qty = Math.max(1, parseFloat(item.qty) || 1);
      const rate = Math.max(0, parseFloat(item.rate) || 0);
      const discount = Math.max(0, parseFloat(item.discount) || 0);
      
      const rawAmount = qty * rate;
      const finalAmount = Math.max(0, rawAmount - discount);
      
      subtotal += rawAmount;
      itemDiscountsTotal += discount;

      return {
        id: item.id || `item_${idx + 1}`,
        name: item.name || '',
        description: item.description || '',
        qty,
        rate,
        discount,
        amount: finalAmount
      };
    });

    // Overall discount (if any applied at invoice level)
    const overallDiscount = Math.max(0, parseFloat(options.overallDiscount) || 0);
    const totalDiscount = itemDiscountsTotal + overallDiscount;

    const netSubtotal = Math.max(0, subtotal - itemDiscountsTotal);
    const taxableAmount = Math.max(0, netSubtotal - overallDiscount);

    // GST/Tax calculation
    const enableGst = !!options.enableGst;
    const gstRate = enableGst ? (parseFloat(options.gstRate) || 0) : 0;
    const taxAmount = enableGst ? Math.round((taxableAmount * gstRate) / 100) : 0;

    const grandTotal = Math.round(taxableAmount + taxAmount);

    // Payments tally
    const totalPaid = (payments || []).reduce((sum, p) => sum + (Math.max(0, parseFloat(p.amount) || 0)), 0);
    const balanceDue = Math.max(0, grandTotal - totalPaid);

    // Determine status
    let paymentStatus = 'PENDING';
    if (balanceDue === 0 && grandTotal > 0) {
      paymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIALLY PAID';
    }

    return {
      items: calculatedItems,
      financials: {
        rawSubtotal: subtotal,
        itemDiscountsTotal,
        overallDiscount,
        totalDiscount,
        taxableAmount,
        enableGst,
        gstRate,
        taxAmount,
        grandTotal,
        totalPaid,
        balanceDue
      },
      paymentStatus
    };
  }

  /**
   * Validate invoice data before preview or finalization
   */
  validateInvoiceData(data) {
    const errors = [];

    if (!data.customer || !data.customer.name || !data.customer.name.trim()) {
      errors.push("Customer name is required.");
    }

    if (!data.customer || !data.customer.phone || !data.customer.phone.trim()) {
      errors.push("Customer mobile number is required.");
    }

    if (!data.event || !data.event.type || !data.event.type.trim()) {
      errors.push("Event Type (Wedding, Pre-Wedding, etc.) is required.");
    }

    if (!data.items || data.items.length === 0) {
      errors.push("At least one photography/videography service is required.");
    } else {
      const invalidItems = data.items.filter(item => !item.name || !item.name.trim());
      if (invalidItems.length > 0) {
        errors.push("All invoice services must have a service name.");
      }
    }

    if (!data.invoiceDate) {
      errors.push("Invoice billing date is required.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Capture an immutable snapshot of studio branding, terms & settings
   * strictly protecting older invoices from future setting changes (Rule #32)
   */
  createStudioSnapshot(customSettings = null) {
    const current = customSettings || window.dpvStore.getSettings();
    return {
      studioName: current.studioName || "Dewangan Photo & Videography",
      shortName: current.shortName || "DPV",
      ownerName: current.ownerName || "Bhavesh Dewangan",
      mobile: current.mobile || "+91 93016 14549",
      altMobile: current.altMobile || "+91 93016 14549",
      whatsapp: current.whatsapp || current.mobile || "9301614549",
      email: current.email || "dewanganstudio@gmail.com",
      address: current.address || "Shivpuri, Jamul, Durg (C.G.)",
      city: current.city || "Durg",
      state: current.state || "Chhattisgarh",
      pincode: current.pincode || "490024",
      website: current.website || "www.dewanganphotoandvideography.in",
      instagram: current.instagram || "dewangan_photo_and_videography",
      gstin: current.gstin || "",
      pan: current.pan || "",
      udyam: current.udyam || "",
      upiId: current.upiId || "9301614549@ybl",
      payeeName: current.payeeName || "Dewangan Photo & Videography",
      headerTagline: current.headerTagline || "CAPTURE YOUR SPECIAL MOMENTS",
      headerMemoriesTitle: current.headerMemoriesTitle || "Memories",
      headerMemoriesSub: current.headerMemoriesSub || "THAT LAST FOREVER",
      headerServices1: current.headerServices1 || "Wedding | Pre-Wedding | Engagement",
      headerServices2: current.headerServices2 || "Birthday | Anniversary | Maternity Shoot",
      headerServices3: current.headerServices3 || "Album Design & Printing | Photo Printing",
      headerQuote: current.headerQuote || "\"Stories Through Our Lens\"",
      footerTagline: current.footerTagline || "Capture Create Cherish",
      footerNote: current.footerNote || "FOR YOUR TRUST & SUPPORT",
      currencySymbol: current.currencySymbol || "₹",
      logoUrl: current.logoUrl || "assets/dpv-official-logo.png",
      cameraArtUrl: current.cameraArtUrl || "assets/header-camera-bokeh.png",
      authorizedSignatureText: current.authorizedSignatureText || "Dewangan Photo & Videography",
      authorizedSignatureRole: current.authorizedSignatureRole || "For DPV (Authorised Signature)",
      customerSignatureRole: current.customerSignatureRole || "Customer Signature",
      snapshotTimestamp: new Date().toISOString()
    };
  }

  /**
   * Alias / Helper to compile invoice object
   */
  compileInvoice(data) {
    return this.buildInvoiceObject(data);
  }

  /**
   * Construct or update an invoice or quotation object
   */
  buildInvoiceObject({
    id = null,
    documentType = 'invoice',
    invoiceNumber = null,
    quotationNumber = null,
    invoiceDate = null,
    status = 'draft',
    customer = {},
    event = {},
    shootingDates = [],
    albums = [],
    deliverables = [],
    items = [],
    payments = [],
    selectedTerms = [],
    options = {},
    existingSnapshot = null,
    isRevisionUnlock = false,
    revisionReason = ''
  }) {
    const isNew = !id;
    const finalId = id || (documentType === 'quotation' ? 'quot_' + Date.now() : 'inv_' + Date.now());
    let finalNumber = invoiceNumber;
    if (!finalNumber) {
      if (documentType === 'quotation') {
        finalNumber = quotationNumber || window.dpvStore.getNextQuotationNumber();
      } else {
        finalNumber = window.dpvStore.getNextInvoiceNumber();
      }
    }
    const finalDate = invoiceDate || new Date().toISOString().split('T')[0];

    // Compute finances
    const effectivePayments = documentType === 'quotation' ? [] : payments;
    const calc = this.calculateFinancials(items, effectivePayments, options);

    // Business snapshot
    const businessSnapshot = (existingSnapshot && status === 'finalized' && !isRevisionUnlock)
      ? existingSnapshot
      : (existingSnapshot || this.createStudioSnapshot());

    const invoice = {
      id: finalId,
      documentType, // 'invoice' or 'quotation'
      invoiceNumber: finalNumber,
      quotationNumber: documentType === 'quotation' ? finalNumber : quotationNumber,
      invoiceDate: finalDate,
      status, // 'draft' or 'finalized'
      paymentStatus: documentType === 'quotation' ? 'QUOTATION' : calc.paymentStatus,
      paymentMethod: effectivePayments.length > 0 ? (effectivePayments[effectivePayments.length - 1].method || 'UPI') : 'UPI',
      customer: {
        id: customer.id || null,
        name: customer.name || '',
        relationName: customer.relationName || '',
        phone: customer.phone || '',
        altPhone: customer.altPhone || '',
        whatsapp: customer.whatsapp || customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
        notes: customer.notes || ''
      },
      event: {
        type: event.type || 'Wedding',
        venue: event.venue || '',
        location: event.location || '',
        notes: event.notes || ''
      },
      shootingDates: (shootingDates || []).map((sd, i) => {
        let srvs = [];
        if (Array.isArray(sd.services)) {
          srvs = sd.services.map(s => {
            if (typeof s === 'string') {
              return { name: s, timings: '', startTime: '', endTime: '', qty: 1, notes: '' };
            }
            return {
              name: s.name || '',
              timings: s.timings || (s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : ''),
              startTime: s.startTime || '',
              endTime: s.endTime || '',
              qty: s.qty || 1,
              notes: s.notes || ''
            };
          });
        } else if (sd.services) {
          srvs = String(sd.services).split(',').map(s => ({ name: s.trim(), timings: '', startTime: '', endTime: '', qty: 1, notes: '' })).filter(s => s.name);
        }
        return {
          id: sd.id || `sd_${i + 1}`,
          dayNumber: sd.dayNumber || (i + 1),
          date: sd.date || '',
          dayName: sd.dayName || (sd.date ? new Date(sd.date).toLocaleDateString('en-US', { weekday: 'long' }) : ''),
          eventName: sd.eventName || sd.title || 'Ceremony',
          timings: sd.timings || (sd.startTime && sd.endTime ? `${sd.startTime} – ${sd.endTime}` : '') || sd.session || '',
          startTime: sd.startTime || '',
          endTime: sd.endTime || '',
          venue: sd.venue || event.venue || '',
          location: sd.location || event.location || '',
          services: srvs,
          notes: sd.notes || ''
        };
      }),
      albums: (albums || []).map((alb, i) => ({
        id: alb.id || `alb_${i + 1}`,
        type: alb.type || 'NT Album',
        size: alb.size || '12 × 18 inch',
        sheets: alb.sheets || '30 Sheets',
        qty: parseInt(alb.qty, 10) || 1,
        notes: alb.notes || ''
      })),
      deliverables: (deliverables || []).map((del, i) => ({
        id: del.id || `del_${i + 1}`,
        name: del.name || '',
        type: del.type || '',
        size: del.size || '',
        qty: parseInt(del.qty, 10) || 1,
        notes: del.notes || ''
      })),
      items: calc.items,
      payments: (() => {
        let runningCum = 0;
        return (effectivePayments || []).map((p, idx) => {
          const amt = Math.max(0, parseFloat(p.amount) || 0);
          runningCum += amt;
          const currentBal = Math.max(0, calc.financials.grandTotal - runningCum);
          let pType = (p.type || '').replace(/\s*\(\s*\d+%\s*\)/gi, '').replace(/\s*\b\d+%\b/g, '').trim();
          if (pType.toLowerCase() === 'advance' || pType.toLowerCase() === 'advance paid') {
            pType = 'First Payment (Advance)';
          } else if (pType.toLowerCase() === '2nd payment') {
            pType = 'Second Payment';
          } else if (pType.toLowerCase() === '3rd payment') {
            pType = 'Third Payment';
          }
          if (currentBal === 0 && calc.financials.grandTotal > 0 && idx === (effectivePayments.length - 1)) {
            pType = 'Final Payment';
          } else if (!pType || pType.startsWith('Payment ') || pType.includes('Installment')) {
            if (idx === 0) {
              pType = 'First Payment (Advance)';
            } else {
              pType = window.dpvStore.getPaymentOrdinal(idx + 1);
            }
          }
          return {
            id: p.id || 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            paymentNumber: p.paymentNumber || (idx + 1),
            type: pType,
            amount: amt,
            balanceAfter: currentBal,
            date: p.date || new Date().toISOString().split('T')[0],
            method: p.method || 'UPI',
            reference: p.reference || '',
            notes: p.notes || ''
          };
        });
      })(),
      financials: calc.financials,
      terms: Array.isArray(selectedTerms)
        ? selectedTerms
        : window.dpvStore.getTerms().filter(t => t.active).map(t => t.text),
      businessSnapshot,
      revisions: [],
      createdAt: isNew ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString()
    };

    if (isRevisionUnlock && revisionReason) {
      invoice.revisions.push({
        timestamp: new Date().toISOString(),
        user: window.dpvAuth.currentUser ? window.dpvAuth.currentUser.name : 'Admin',
        reason: revisionReason
      });
    }

    return invoice;
  }

  /**
   * Finalize invoice and lock it
   */
  finalizeInvoice(invoiceData) {
    const validation = this.validateInvoiceData(invoiceData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' '));
    }

    invoiceData.status = 'finalized';
    // Ensure frozen snapshot is locked
    if (!invoiceData.businessSnapshot) {
      invoiceData.businessSnapshot = this.createStudioSnapshot();
    }

    // Upsert customer into directory automatically (Rule #6)
    window.dpvStore.upsertCustomerFromInvoice(invoiceData.customer);

    // Save
    const saved = window.dpvStore.saveInvoice(invoiceData);
    window.dpvStore.logAudit('INVOICE_FINALIZED', `Finalized invoice ${saved.invoiceNumber}`);
    return saved;
  }

  /**
   * Duplicate existing invoice to draft (Rule #2)
   */
  duplicateInvoice(sourceInvoice) {
    const newNumber = window.dpvStore.getNextInvoiceNumber();
    const duplicate = JSON.parse(JSON.stringify(sourceInvoice));
    
    duplicate.id = 'inv_' + Date.now();
    duplicate.invoiceNumber = newNumber;
    duplicate.invoiceDate = new Date().toISOString().split('T')[0];
    duplicate.status = 'draft';
    duplicate.payments = []; // Fresh payments for duplicate
    duplicate.financials.totalPaid = 0;
    duplicate.financials.balanceDue = duplicate.financials.grandTotal;
    duplicate.paymentStatus = 'PENDING';
    duplicate.businessSnapshot = this.createStudioSnapshot(); // Use latest settings for new duplicate
    duplicate.createdAt = new Date().toISOString();
    duplicate.updatedAt = new Date().toISOString();
    duplicate.revisions = [];

    const saved = window.dpvStore.saveInvoice(duplicate);
    window.dpvStore.logAudit('INVOICE_DUPLICATED', `Duplicated invoice ${sourceInvoice.invoiceNumber} as ${newNumber}`);
    return saved;
  }
}

window.dpvInvoiceEngine = new DPVInvoiceEngine();
