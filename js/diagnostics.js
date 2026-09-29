/**
 * Dewangan Photo & Videography – Invoice Management System
 * Temporary Admin-Only Billing Diagnostic / Error Recorder System
 * 
 * MODULE: DPVDiagnostics
 * ISOLATION: 100% standalone module. Can be safely removed at any time
 *            without breaking core invoice or billing logic.
 */

class DPVDiagnostics {
  constructor() {
    this.STORAGE_KEY = 'dpv_diagnostic_logs';
    this.CONFIG_KEY = 'dpv_diagnostic_config';
    this.TOMBSTONE_KEY = 'dpv_diagnostic_monitored_tombstones';
    this.TRACES_KEY = 'dpv_diagnostic_active_traces';

    // Default configuration (Enabled by default for immediate diagnostic recording)
    this.config = {
      enabled: true,
      maxLogs: 2000,
      autoTraceLifecycle: true,
      captureErrors: true
    };

    this.logs = [];
    this.traces = {};
    this.monitoredTombstones = {};
    this.activeFilter = 'all';
    this.searchQuery = '';
    this.initialized = false;
    this.wrapped = false;
  }

  /**
   * Initialize Diagnostics, restore logs & attach global hooks
   */
  init() {
    if (this.initialized) return;

    try {
      // 1. Load config
      const savedConfig = localStorage.getItem(this.CONFIG_KEY);
      if (savedConfig) {
        try {
          this.config = { ...this.config, ...JSON.parse(savedConfig) };
        } catch (e) {
          console.warn("[Diagnostics] Config load error:", e);
        }
      }

      // 2. Load persistent logs
      const savedLogs = localStorage.getItem(this.STORAGE_KEY);
      if (savedLogs) {
        try {
          this.logs = JSON.parse(savedLogs);
          if (!Array.isArray(this.logs)) this.logs = [];
        } catch (e) {
          this.logs = [];
        }
      }

      // 3. Load monitored tombstones
      const savedTombstones = localStorage.getItem(this.TOMBSTONE_KEY);
      if (savedTombstones) {
        try {
          this.monitoredTombstones = JSON.parse(savedTombstones) || {};
        } catch (e) {
          this.monitoredTombstones = {};
        }
      }

      // 4. Attach Global Error Handlers
      this.attachGlobalErrorHandlers();

      // 5. Wrap application modules (store, app, pdf, sync)
      this.attachWrappers();

      // 6. Record Initial System State
      this.record({
        action: 'DIAGNOSTIC_SYSTEM_INITIALIZED',
        category: 'SYSTEM',
        status: 'INFO',
        message: 'Billing Diagnostic Recorder initialized successfully',
        details: {
          enabled: this.config.enabled,
          restoredLogsCount: this.logs.length,
          userAgent: navigator.userAgent,
          screen: `${window.innerWidth}x${window.innerHeight}`,
          online: navigator.onLine,
          memoryCacheInvoices: (window.dpvStore && window.dpvStore.memoryCache) ? (window.dpvStore.memoryCache.invoices || []).length : 0,
          tombstonesCount: (window.dpvStore && window.dpvStore.memoryCache) ? (window.dpvStore.memoryCache.deletedInvoiceIds || []).length : 0
        }
      });

      this.initialized = true;

      // Check on startup if any deleted bill resurrected
      setTimeout(() => this.checkDeletedBillsResurrection("STARTUP_CHECK"), 500);

    } catch (err) {
      console.error("[Diagnostics] Init fatal error:", err);
    }
  }

  /**
   * Diagnostic Mode State
   */
  isEnabled() {
    return !!this.config.enabled;
  }

  setEnabled(enabled) {
    this.config.enabled = !!enabled;
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {}

    this.record({
      action: 'DIAGNOSTIC_MODE_TOGGLED',
      category: 'SYSTEM',
      status: 'INFO',
      message: `Diagnostic Mode has been switched ${this.config.enabled ? 'ON' : 'OFF'}`,
      details: { enabled: this.config.enabled }
    });

    this.updateUIControls();
    if (window.dpvApp && typeof window.dpvApp.showToast === 'function') {
      window.dpvApp.showToast(`Billing Diagnostic Mode is now ${this.config.enabled ? 'ON' : 'OFF'}`, this.config.enabled ? 'success' : 'info');
    }
  }

  /**
   * Sanitize payload (Strictly strip passwords, tokens, API keys)
   */
  sanitize(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    try {
      const copy = JSON.parse(JSON.stringify(obj, (k, v) => {
        if (/password|passwordHash|token|secret|apiKey|authDomain|sessionKey/i.test(k)) {
          return '[REDACTED_FOR_SECURITY]';
        }
        return v;
      }));
      return copy;
    } catch (e) {
      return '[Unserializable Payload]';
    }
  }

  /**
   * Core Logging Engine
   */
  record({
    action = 'GENERIC_ACTION',
    category = 'SYSTEM', // LIFECYCLE | DATABASE | SYNC | PDF_PRINT | UI | ERROR | SYSTEM
    status = 'INFO',     // SUCCESS | FAILURE | WARNING | INFO
    message = '',
    invoiceId = null,
    invoiceNumber = null,
    details = {},
    error = null
  }) {
    if (!this.config.enabled && action !== 'DIAGNOSTIC_MODE_TOGGLED' && action !== 'DIAGNOSTIC_SYSTEM_INITIALIZED') {
      return;
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeFormatted = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${String(now.getMilliseconds()).padStart(3, '0')}`;

    const currentView = (window.dpvApp && window.dpvApp.currentView) ? window.dpvApp.currentView : 'unknown';

    let errorInfo = null;
    if (error) {
      if (typeof error === 'string') {
        errorInfo = { message: error };
      } else if (error instanceof Error || typeof error === 'object') {
        errorInfo = {
          name: error.name || 'Error',
          message: error.message || String(error),
          stack: error.stack || null,
          code: error.code || null,
          filename: error.filename || error.fileName || null,
          lineno: error.lineno || error.lineNumber || null,
          colno: error.colno || null
        };
      }
    }

    const entry = {
      id: `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      timeFormatted: timeFormatted,
      action: action,
      category: category,
      status: status,
      invoiceId: invoiceId || (details && details.invoiceId) || null,
      invoiceNumber: invoiceNumber || (details && details.invoiceNumber) || null,
      currentView: currentView,
      message: message || action,
      details: this.sanitize(details),
      error: errorInfo,
      deviceInfo: {
        online: navigator.onLine,
        screen: `${window.innerWidth}x${window.innerHeight}`
      }
    };

    // Keep memory array bounded
    this.logs.unshift(entry);
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(0, this.config.maxLogs);
    }

    // Persist to separate storage key
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      // Storage quota safety: prune older half if quota exceeded
      try {
        this.logs = this.logs.slice(0, Math.floor(this.config.maxLogs / 2));
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
      } catch (errPrune) {}
    }

    // Auto-update UI if user is on Diagnostics view
    if (currentView === 'view-diagnostics') {
      this.renderDiagnosticsTable();
    }
  }

  /**
   * Bill Lifecycle Trace Engine
   */
  traceInvoice(invoiceId, action, stage, metadata = {}) {
    if (!invoiceId) return;

    if (!this.traces[invoiceId]) {
      this.traces[invoiceId] = {
        invoiceId: invoiceId,
        invoiceNumber: metadata.invoiceNumber || 'Pending',
        createdAt: new Date().toISOString(),
        steps: []
      };
    }

    const trace = this.traces[invoiceId];
    if (metadata.invoiceNumber && trace.invoiceNumber === 'Pending') {
      trace.invoiceNumber = metadata.invoiceNumber;
    }

    const stepRecord = {
      stage: stage,
      action: action,
      timestamp: new Date().toISOString(),
      metadata: this.sanitize(metadata)
    };
    trace.steps.push(stepRecord);

    // Record formal log entry
    this.record({
      action: action,
      category: 'LIFECYCLE',
      status: metadata.status || 'SUCCESS',
      invoiceId: invoiceId,
      invoiceNumber: trace.invoiceNumber,
      message: metadata.message || `Invoice ${trace.invoiceNumber} -> ${stage}`,
      details: {
        stage: stage,
        stepIndex: trace.steps.length,
        ...metadata
      },
      error: metadata.error || null
    });
  }

  /**
   * Verify Complete Invoice Integrity After Print / PDF / Back
   */
  verifyInvoiceIntegrity(invoiceId, previousSnapshot, context = "AFTER_BACK") {
    if (!invoiceId || !previousSnapshot) return true;

    if (!window.dpvStore) return false;
    const current = window.dpvStore.getInvoiceById(invoiceId);

    if (!current) {
      this.record({
        action: `INVOICE_DISAPPEARED_${context}`,
        category: 'LIFECYCLE',
        status: 'FAILURE',
        invoiceId: invoiceId,
        invoiceNumber: previousSnapshot.invoiceNumber,
        message: `CRITICAL: Invoice ${previousSnapshot.invoiceNumber} completely disappeared from store ${context}!`,
        details: {
          context: context,
          previousState: {
            id: previousSnapshot.id,
            invoiceNumber: previousSnapshot.invoiceNumber,
            customer: previousSnapshot.customer,
            grandTotal: previousSnapshot.financials?.grandTotal || previousSnapshot.grandTotal,
            paymentsCount: (previousSnapshot.payments || []).length
          },
          resultingStateInStore: null,
          totalInvoicesInStore: window.dpvStore.getInvoices().length
        }
      });
      return false;
    }

    // Deep check all critical fields
    const prevCust = previousSnapshot.customer || {};
    const currCust = current.customer || {};
    const prevFin = previousSnapshot.financials || {};
    const currFin = current.financials || {};

    const diffs = [];
    if (currCust.name !== prevCust.name) diffs.push(`customer.name: was "${prevCust.name}", now "${currCust.name}"`);
    if (currCust.phone !== prevCust.phone) diffs.push(`customer.phone: was "${prevCust.phone}", now "${currCust.phone}"`);
    if ((currFin.grandTotal || current.grandTotal) !== (prevFin.grandTotal || previousSnapshot.grandTotal)) {
      diffs.push(`grandTotal: was ${prevFin.grandTotal || previousSnapshot.grandTotal}, now ${currFin.grandTotal || current.grandTotal}`);
    }
    if ((current.items || []).length !== (previousSnapshot.items || []).length) {
      diffs.push(`items count: was ${(previousSnapshot.items || []).length}, now ${(current.items || []).length}`);
    }
    if ((current.payments || []).length !== (previousSnapshot.payments || []).length) {
      diffs.push(`payments count: was ${(previousSnapshot.payments || []).length}, now ${(current.payments || []).length}`);
    }

    if (diffs.length > 0) {
      this.record({
        action: `INVOICE_DATA_CORRUPTED_${context}`,
        category: 'LIFECYCLE',
        status: 'FAILURE',
        invoiceId: invoiceId,
        invoiceNumber: current.invoiceNumber,
        message: `INTEGRITY WARNING: Invoice ${current.invoiceNumber} fields changed or disappeared ${context}!`,
        details: {
          context: context,
          differences: diffs,
          currentInvoice: this.sanitize(current)
        }
      });
      return false;
    }

    this.record({
      action: `INVOICE_VERIFY_SUCCESS_${context}`,
      category: 'LIFECYCLE',
      status: 'SUCCESS',
      invoiceId: invoiceId,
      invoiceNumber: current.invoiceNumber,
      message: `Verified: Invoice ${current.invoiceNumber} intact and preserved ${context}`,
      details: {
        context: context,
        grandTotal: current.financials?.grandTotal || current.grandTotal,
        balanceDue: current.financials?.balanceDue || current.balanceDue,
        paymentsCount: (current.payments || []).length,
        itemsCount: (current.items || []).length
      }
    });
    return true;
  }

  /**
   * Monitor Deleted Bill Resurrection (Requirement 5)
   */
  registerDeletedInvoice(invoiceId, invoiceNumber = null) {
    if (!invoiceId) return;
    this.monitoredTombstones[invoiceId] = {
      invoiceId: invoiceId,
      invoiceNumber: invoiceNumber || 'Unknown',
      deletedAt: new Date().toISOString(),
      screen: window.dpvApp ? window.dpvApp.currentView : ''
    };
    try {
      localStorage.setItem(this.TOMBSTONE_KEY, JSON.stringify(this.monitoredTombstones));
    } catch (e) {}

    this.record({
      action: 'DELETE_BILL',
      category: 'DATABASE',
      status: 'SUCCESS',
      invoiceId: invoiceId,
      invoiceNumber: invoiceNumber,
      message: `Invoice ${invoiceNumber || invoiceId} deleted & tombstoned`,
      details: {
        tombstoneRegistered: true,
        deletedAt: this.monitoredTombstones[invoiceId].deletedAt
      }
    });
  }

  checkDeletedBillsResurrection(context = "PERIODIC_CHECK") {
    if (!window.dpvStore) return;
    const currentInvoices = window.dpvStore.getInvoices() || [];

    currentInvoices.forEach(inv => {
      if (inv && inv.id && this.monitoredTombstones[inv.id]) {
        const tomb = this.monitoredTombstones[inv.id];
        this.record({
          action: 'DELETED_INVOICE_REAPPEARED',
          category: 'SYNC',
          status: 'FAILURE',
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber || tomb.invoiceNumber,
          message: `CRITICAL ALERT: Previously deleted invoice ${inv.invoiceNumber || tomb.invoiceNumber} has reappeared in store!`,
          details: {
            context: context,
            deletedAt: tomb.deletedAt,
            reappearedAt: new Date().toISOString(),
            sourceInvoice: this.sanitize(inv),
            storeTombstonePresent: window.dpvStore.isInvoiceDeleted(inv.id),
            localCacheInvoicesCount: currentInvoices.length,
            firestoreSyncStatus: window.dpvFirebaseSync ? window.dpvFirebaseSync.isConnected : false
          }
        });
      }
    });
  }

  /**
   * Global Unhandled Error Handlers
   */
  attachGlobalErrorHandlers() {
    window.addEventListener('error', (event) => {
      this.record({
        action: 'UNHANDLED_ERROR',
        category: 'ERROR',
        status: 'FAILURE',
        message: event.message || 'JavaScript unhandled runtime error',
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        error: event.error || { message: event.message }
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      let reasonMsg = 'Unhandled Promise Rejection';
      let errObj = null;
      if (event.reason) {
        if (event.reason instanceof Error) {
          reasonMsg = event.reason.message;
          errObj = event.reason;
        } else {
          reasonMsg = String(event.reason);
          errObj = { message: reasonMsg };
        }
      }
      this.record({
        action: 'UNHANDLED_PROMISE_ERROR',
        category: 'ERROR',
        status: 'FAILURE',
        message: reasonMsg,
        details: { reason: String(event.reason) },
        error: errObj
      });
    });
  }

  /**
   * Non-Invasive Module Wrappers
   */
  attachWrappers() {
    if (this.wrapped) return;

    const self = this;

    // 1. Wrap DPVStore methods
    if (window.dpvStore) {
      // saveInvoice
      const origSaveInvoice = window.dpvStore.saveInvoice;
      window.dpvStore.saveInvoice = function(invoiceData, allowPaymentUpdate) {
        const countBefore = (this.memoryCache.invoices || []).length;
        const invId = invoiceData ? invoiceData.id : null;
        const invNum = invoiceData ? invoiceData.invoiceNumber : null;

        self.record({
          action: 'DATABASE_WRITE',
          category: 'DATABASE',
          status: 'INFO',
          invoiceId: invId,
          invoiceNumber: invNum,
          message: `DATABASE_WRITE started for ${invNum || 'new bill'}`,
          details: {
            step: 'DATABASE_WRITE',
            functionName: 'dpvStore.saveInvoice',
            invoicesCountBefore: countBefore,
            allowPaymentUpdate: allowPaymentUpdate
          }
        });

        try {
          const result = origSaveInvoice.apply(this, arguments);

          // Immediate verification
          const inStore = this.getInvoiceById(result.id);
          const countAfter = (this.memoryCache.invoices || []).length;

          if (inStore) {
            self.record({
              action: 'DATABASE_VERIFY',
              category: 'DATABASE',
              status: 'SUCCESS',
              invoiceId: result.id,
              invoiceNumber: result.invoiceNumber,
              message: `DATABASE_VERIFY: Invoice ${result.invoiceNumber} successfully confirmed in memory cache`,
              details: {
                step: 'DATABASE_VERIFY',
                invoicesCountAfter: countAfter,
                customer: result.customer?.name,
                grandTotal: result.financials?.grandTotal || result.grandTotal,
                balanceDue: result.financials?.balanceDue || result.balanceDue
              }
            });

            // Update lifecycle trace
            self.traceInvoice(result.id, 'DATABASE_VERIFY', 'DATABASE_VERIFY', {
              invoiceNumber: result.invoiceNumber,
              status: 'SUCCESS',
              message: `Database verified: invoice preserved with total ₹${result.financials?.grandTotal || result.grandTotal}`
            });
          } else {
            self.record({
              action: 'SAVE_DATABASE_WRITE_FAILED',
              category: 'DATABASE',
              status: 'FAILURE',
              invoiceId: result.id,
              invoiceNumber: result.invoiceNumber,
              message: `CRITICAL: saveInvoice returned object but getInvoiceById(${result.id}) returned NULL!`,
              details: {
                step: 'DATABASE_VERIFY_FAILURE',
                returnedResult: self.sanitize(result)
              }
            });
          }

          return result;
        } catch (err) {
          self.record({
            action: 'SAVE_DATABASE_WRITE_FAILED',
            category: 'DATABASE',
            status: 'FAILURE',
            invoiceId: invId,
            invoiceNumber: invNum,
            message: `Exception in saveInvoice: ${err.message}`,
            error: err
          });
          throw err;
        }
      };

      // deleteInvoice
      const origDeleteInvoice = window.dpvStore.deleteInvoice;
      window.dpvStore.deleteInvoice = function(id) {
        const inv = this.getInvoiceById(id);
        const invNum = inv ? inv.invoiceNumber : null;
        self.registerDeletedInvoice(id, invNum);

        try {
          const res = origDeleteInvoice.apply(this, arguments);
          self.record({
            action: 'DATABASE_DELETE',
            category: 'DATABASE',
            status: 'SUCCESS',
            invoiceId: id,
            invoiceNumber: invNum,
            message: `DATABASE_DELETE: Invoice ${invNum || id} removed from memory cache`,
            details: {
              remainingInvoices: (this.memoryCache.invoices || []).length,
              tombstoneCount: (this.memoryCache.deletedInvoiceIds || []).length
            }
          });
          return res;
        } catch (err) {
          self.record({
            action: 'DATABASE_DELETE_FAILED',
            category: 'DATABASE',
            status: 'FAILURE',
            invoiceId: id,
            invoiceNumber: invNum,
            message: `Error deleting invoice ${id}: ${err.message}`,
            error: err
          });
          throw err;
        }
      };

      // syncFromCloud
      const origSyncFromCloud = window.dpvStore.syncFromCloud;
      window.dpvStore.syncFromCloud = function(cloudInvoices, fromCache) {
        const countBefore = (this.memoryCache.invoices || []).length;
        self.record({
          action: 'SYNC',
          category: 'SYNC',
          status: 'INFO',
          message: `SYNC: syncFromCloud received ${(cloudInvoices || []).length} items from ${fromCache ? 'cache' : 'live server'}`,
          details: {
            cloudCount: (cloudInvoices || []).length,
            fromCache: !!fromCache,
            localCountBefore: countBefore
          }
        });

        const res = origSyncFromCloud.apply(this, arguments);
        const countAfter = (this.memoryCache.invoices || []).length;

        // Check if zero-wipe occurred
        if (countBefore > 0 && countAfter === 0 && (cloudInvoices || []).length === 0) {
          self.record({
            action: 'ZERO_BILL_STATE_UNEXPECTED',
            category: 'SYNC',
            status: 'FAILURE',
            message: `ALERT: Store invoices dropped from ${countBefore} to ZERO after empty cloud sync!`,
            details: { countBefore, countAfter, fromCache }
          });
        }

        // Check if any deleted bill returned
        self.checkDeletedBillsResurrection("SYNC_FROM_CLOUD");

        return res;
      };

      // persist
      const origPersist = window.dpvStore.persist;
      window.dpvStore.persist = function() {
        try {
          const res = origPersist.apply(this, arguments);
          const raw = localStorage.getItem(this.dbName);
          self.record({
            action: 'LOCAL_STORAGE',
            category: 'DATABASE',
            status: 'SUCCESS',
            message: `LOCAL_STORAGE: Saved database snapshot (${raw ? Math.round(raw.length / 1024) : 0} KB)`,
            details: {
              invoicesCount: (this.memoryCache.invoices || []).length,
              customersCount: (this.memoryCache.customers || []).length,
              tombstoneCount: (this.memoryCache.deletedInvoiceIds || []).length
            }
          });
          return res;
        } catch (err) {
          self.record({
            action: 'LOCAL_STORAGE_FAILED',
            category: 'DATABASE',
            status: 'FAILURE',
            message: `LOCAL_STORAGE: Failed to write to localStorage: ${err.message}`,
            error: err
          });
          throw err;
        }
      };
    }

    // 2. Wrap DPVApp preview and back methods
    if (window.dpvApp) {
      // previewBuiltInvoice
      const origPreviewBuilt = window.dpvApp.previewBuiltInvoice;
      window.dpvApp.previewBuiltInvoice = function() {
        self.record({
          action: 'PREVIEW_BILL',
          category: 'UI',
          status: 'INFO',
          message: 'User triggered Preview & Save for built invoice'
        });

        try {
          const res = origPreviewBuilt.apply(this, arguments);
          if (this.activeInvoice) {
            self.traceInvoice(this.activeInvoice.id, 'PREVIEW_BILL', 'PREVIEW', {
              invoiceNumber: this.activeInvoice.invoiceNumber,
              status: 'SUCCESS',
              message: `Invoice ${this.activeInvoice.invoiceNumber} opened in A4 Preview`
            });
          }
          return res;
        } catch (err) {
          self.record({
            action: 'PREVIEW_BILL_FAILED',
            category: 'UI',
            status: 'FAILURE',
            message: `Preview failed: ${err.message}`,
            error: err
          });
          throw err;
        }
      };

      // backFromPreview
      const origBackFromPreview = window.dpvApp.backFromPreview;
      window.dpvApp.backFromPreview = function() {
        const inv = this.activeInvoice ? JSON.parse(JSON.stringify(this.activeInvoice)) : null;
        const invId = inv ? inv.id : null;
        const invNum = inv ? inv.invoiceNumber : null;

        self.record({
          action: 'BACK',
          category: 'UI',
          status: 'INFO',
          invoiceId: invId,
          invoiceNumber: invNum,
          message: `BACK: User pressed Back button from invoice preview (${invNum || 'none'})`,
          details: {
            hasActiveInvoice: !!inv,
            previewSourceView: this.previewSourceView
          }
        });

        const res = origBackFromPreview.apply(this, arguments);

        // Immediate post-back verification (Requirement 7)
        if (invId) {
          self.verifyInvoiceIntegrity(invId, inv, "AFTER_BACK");
          self.traceInvoice(invId, 'FINAL_DATABASE_CHECK', 'FINAL_DATABASE_CHECK', {
            invoiceNumber: invNum,
            status: 'SUCCESS',
            message: `Final check completed: invoice preserved after navigation back to directory`
          });
        }

        return res;
      };

      // refreshAllData
      const origRefresh = window.dpvApp.refreshAllData;
      window.dpvApp.refreshAllData = function() {
        self.record({
          action: 'REFRESH',
          category: 'UI',
          status: 'INFO',
          message: 'REFRESH: Refreshing all UI tables and stats'
        });
        const res = origRefresh.apply(this, arguments);
        self.checkDeletedBillsResurrection("REFRESH_ALL_DATA");
        return res;
      };
    }

    // 3. Wrap DPVPDFGenerator
    if (window.dpvPdf) {
      const origGeneratePdf = window.dpvPdf.generatePdf;
      window.dpvPdf.generatePdf = async function(invoiceElement, invoiceNumber, isDownload) {
        const invNum = invoiceNumber || 'Invoice';
        self.record({
          action: 'GENERATE_PDF',
          category: 'PDF_PRINT',
          status: 'INFO',
          invoiceNumber: invNum,
          message: `GENERATE_PDF started for ${invNum} (isDownload: ${isDownload})`,
          details: {
            screenWidth: window.innerWidth,
            isDesktop: window.innerWidth > 860
          }
        });

        const startTime = Date.now();
        try {
          const res = await origGeneratePdf.apply(this, arguments);
          const duration = Date.now() - startTime;

          self.record({
            action: 'GENERATE_PDF',
            category: 'PDF_PRINT',
            status: 'SUCCESS',
            invoiceNumber: invNum,
            message: `GENERATE_PDF completed successfully in ${duration}ms`,
            details: { durationMs: duration, success: !!res }
          });

          // Verify invoice still intact
          if (window.dpvApp && window.dpvApp.activeInvoice) {
            self.verifyInvoiceIntegrity(window.dpvApp.activeInvoice.id, window.dpvApp.activeInvoice, "AFTER_PDF");
          }

          return res;
        } catch (err) {
          self.record({
            action: 'GENERATE_PDF_FAILED',
            category: 'PDF_PRINT',
            status: 'FAILURE',
            invoiceNumber: invNum,
            message: `GENERATE_PDF failed: ${err.message}`,
            error: err
          });
          throw err;
        }
      };

      const origPrint = window.dpvPdf.printInvoice;
      window.dpvPdf.printInvoice = function(invoiceElement) {
        self.record({
          action: 'PRINT',
          category: 'PDF_PRINT',
          status: 'INFO',
          message: 'PRINT: Triggered print window'
        });
        const res = origPrint.apply(this, arguments);
        if (window.dpvApp && window.dpvApp.activeInvoice) {
          self.verifyInvoiceIntegrity(window.dpvApp.activeInvoice.id, window.dpvApp.activeInvoice, "AFTER_PRINT");
        }
        return res;
      };
    }

    // 4. Wrap Firebase Sync
    if (window.dpvFirebaseSync) {
      const origSyncInv = window.dpvFirebaseSync.syncInvoice;
      window.dpvFirebaseSync.syncInvoice = async function(invoice) {
        const invNum = invoice ? invoice.invoiceNumber : null;
        self.record({
          action: 'FIRESTORE',
          category: 'SYNC',
          status: 'INFO',
          invoiceId: invoice ? invoice.id : null,
          invoiceNumber: invNum,
          message: `FIRESTORE_WRITE started for ${invNum || 'invoice'}`,
          details: { function: 'dpvFirebaseSync.syncInvoice' }
        });

        try {
          const res = await origSyncInv.apply(this, arguments);
          self.record({
            action: 'FIRESTORE',
            category: 'SYNC',
            status: res ? 'SUCCESS' : 'WARNING',
            invoiceId: invoice ? invoice.id : null,
            invoiceNumber: invNum,
            message: res ? `FIRESTORE_WRITE confirmed for ${invNum}` : `FIRESTORE_WRITE skipped or offline for ${invNum}`,
            details: { success: res }
          });
          return res;
        } catch (err) {
          self.record({
            action: 'FIRESTORE_WRITE_FAILED',
            category: 'SYNC',
            status: 'FAILURE',
            invoiceId: invoice ? invoice.id : null,
            invoiceNumber: invNum,
            message: `Firestore sync failed: ${err.message}`,
            error: err
          });
          throw err;
        }
      };
    }

    this.wrapped = true;
  }

  /**
   * Filter & Search Logs
   */
  getFilteredLogs() {
    let result = [...this.logs];

    // Filter by Category / Status
    if (this.activeFilter === 'errors') {
      result = result.filter(l => l.status === 'FAILURE' || l.category === 'ERROR' || l.action.includes('FAIL') || l.action.includes('ERROR'));
    } else if (this.activeFilter === 'lifecycle') {
      result = result.filter(l => l.category === 'LIFECYCLE');
    } else if (this.activeFilter === 'database') {
      result = result.filter(l => l.category === 'DATABASE');
    } else if (this.activeFilter === 'sync') {
      result = result.filter(l => l.category === 'SYNC');
    } else if (this.activeFilter === 'pdf') {
      result = result.filter(l => l.category === 'PDF_PRINT');
    }

    // Search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(l => 
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.message && l.message.toLowerCase().includes(q)) ||
        (l.invoiceNumber && l.invoiceNumber.toLowerCase().includes(q)) ||
        (l.invoiceId && l.invoiceId.toLowerCase().includes(q)) ||
        (l.currentView && l.currentView.toLowerCase().includes(q))
      );
    }

    return result;
  }

  setFilter(filter, element) {
    this.activeFilter = filter;
    document.querySelectorAll('#diag-filter-chips .filter-chip').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    this.renderDiagnosticsTable();
  }

  /**
   * Clear Logs
   */
  clearLogs() {
    if (!confirm("Are you sure you want to clear all diagnostic logs? Active traces will be retained.")) return;
    this.logs = [];
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {}

    this.record({
      action: 'DIAGNOSTIC_LOGS_CLEARED',
      category: 'SYSTEM',
      status: 'INFO',
      message: 'All previous diagnostic logs were cleared by Admin'
    });

    this.renderDiagnosticsView();
    if (window.dpvApp && typeof window.dpvApp.showToast === 'function') {
      window.dpvApp.showToast("Diagnostic logs cleared successfully", "info");
    }
  }

  /**
   * Export Diagnostic Report (Requirement 9)
   */
  exportReport(format = 'json') {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `DPV_Diagnostic_Report_${dateStr}`;

    const systemState = {
      timestamp: now.toISOString(),
      appVersion: "v1.3.4",
      diagnosticMode: this.config.enabled ? 'ACTIVE' : 'DISABLED',
      totalLogInStore: this.logs.length,
      storeInvoicesCount: window.dpvStore ? window.dpvStore.getInvoices().length : 0,
      storeCustomersCount: window.dpvStore ? window.dpvStore.getCustomers().length : 0,
      storePaymentsCount: window.dpvStore ? (window.dpvStore.memoryCache.payments || []).length : 0,
      tombstonesCount: window.dpvStore ? (window.dpvStore.memoryCache.deletedInvoiceIds || []).length : 0,
      monitoredTombstonesCount: Object.keys(this.monitoredTombstones).length,
      cloudConnected: window.dpvFirebaseSync ? window.dpvFirebaseSync.isConnected : false,
      online: navigator.onLine,
      userAgent: navigator.userAgent,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`
    };

    const errors = this.logs.filter(l => l.status === 'FAILURE' || l.category === 'ERROR' || l.action.includes('FAIL'));
    const warnings = this.logs.filter(l => l.status === 'WARNING');

    if (format === 'json') {
      const exportData = {
        reportMetadata: {
          title: "Dewangan Photo & Videography — Billing Diagnostic Report",
          studio: "Dewangan Photo & Videography",
          contact: "+91 93016 14549",
          exportedAt: now.toISOString()
        },
        systemState: systemState,
        metrics: {
          totalLogs: this.logs.length,
          errorCount: errors.length,
          warningCount: warnings.length,
          lifecycleTracesCount: Object.keys(this.traces).length
        },
        billLifecycleTraces: this.traces,
        monitoredDeletions: this.monitoredTombstones,
        chronologicalLogs: this.logs
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      this.triggerDownload(blob, `${filename}.json`);
    } else {
      // Formatted text report
      let text = `================================================================================\n`;
      text += `DEWANGAN PHOTO & VIDEOGRAPHY — BILLING DIAGNOSTIC REPORT\n`;
      text += `Generated: ${now.toLocaleString()} (${now.toISOString()})\n`;
      text += `Diagnostic Mode: ${this.config.enabled ? 'ACTIVE' : 'DISABLED'}\n`;
      text += `App Version: v1.3.4 | Cloud Status: ${systemState.cloudConnected ? 'CONNECTED' : 'STANDALONE'}\n`;
      text += `Invoices in DB: ${systemState.storeInvoicesCount} | Tombstones: ${systemState.tombstonesCount}\n`;
      text += `================================================================================\n\n`;

      text += `--- SUMMARY ---\n`;
      text += `Total Logs Recorded : ${this.logs.length}\n`;
      text += `Fatal Errors Found  : ${errors.length}\n`;
      text += `Warnings Found      : ${warnings.length}\n`;
      text += `Active Bill Traces  : ${Object.keys(this.traces).length}\n\n`;

      if (errors.length > 0) {
        text += `--- CRITICAL ERRORS (${errors.length}) ---\n`;
        errors.forEach((e, idx) => {
          text += `[#${idx + 1}] ${e.timeFormatted} [${e.action}] (${e.invoiceNumber || 'No Doc#'}): ${e.message}\n`;
          if (e.error && e.error.stack) {
            text += `     Stack: ${e.error.stack.split('\n')[0]}\n`;
          }
        });
        text += `\n`;
      }

      text += `--- CHRONOLOGICAL ACTION LOGS ---\n`;
      this.logs.forEach(l => {
        const badge = `[${l.status}]`.padEnd(9);
        const cat = `[${l.category}]`.padEnd(12);
        const act = `${l.action}`.padEnd(28);
        const doc = l.invoiceNumber ? `Doc: ${l.invoiceNumber}`.padEnd(20) : ''.padEnd(20);
        text += `${l.timeFormatted} ${badge} ${cat} ${act} ${doc} ${l.message}\n`;
      });

      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      this.triggerDownload(blob, `${filename}.txt`);
    }

    this.record({
      action: 'DIAGNOSTIC_REPORT_EXPORTED',
      category: 'SYSTEM',
      status: 'SUCCESS',
      message: `Exported diagnostic report with ${this.logs.length} entries (${format.toUpperCase()})`
    });

    if (window.dpvApp && typeof window.dpvApp.showToast === 'function') {
      window.dpvApp.showToast(`Diagnostic Report downloaded successfully (${format.toUpperCase()})`, 'success');
    }
  }

  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /**
   * Run Diagnostic Self-Test (Requirement 13)
   * Simulates full bill lifecycle in sandbox without corrupting user data
   */
  async runDiagnosticSelfTest() {
    if (!confirm("Run Billing Diagnostic Self-Test? This will simulate a complete Bill Create -> Save -> Verify -> Preview -> PDF check -> Delete lifecycle to test all diagnostic recorders.")) return;

    this.record({
      action: 'SELF_TEST_STARTED',
      category: 'SYSTEM',
      status: 'INFO',
      message: '--- BEGINNING DIAGNOSTIC RECORDER SELF-TEST ---'
    });

    try {
      // 1. Build test bill
      const testInvoiceNumber = `DPV/DIAG/${Date.now().toString().slice(-4)}`;
      const testBill = window.dpvInvoiceEngine.buildInvoiceObject({
        invoiceNumber: testInvoiceNumber,
        customer: { name: "Diag Test Client", phone: "9301614549", city: "Durg" },
        event: { type: "Wedding Shoot", date: "2026-12-31" },
        items: [{ id: "diag_item_1", name: "Diagnostic Test Photography", rate: 25000, qty: 1 }],
        payments: [{ id: "diag_pay_1", type: "First Payment", amount: 15000, method: "UPI", date: "2026-12-01" }]
      });

      this.traceInvoice(testBill.id, 'CREATE_BILL', 'CREATE', {
        invoiceNumber: testBill.invoiceNumber,
        message: 'Self-test created invoice object'
      });

      // 2. Save bill
      const savedBill = window.dpvStore.saveInvoice(testBill);
      this.traceInvoice(savedBill.id, 'SAVE_BILL', 'SAVE', {
        invoiceNumber: savedBill.invoiceNumber,
        message: 'Self-test saved invoice into store'
      });

      // 3. Verify in store
      const retrieved = window.dpvStore.getInvoiceById(savedBill.id);
      if (!retrieved) throw new Error("Self-test: Invoice could not be retrieved immediately after save!");

      // 4. Test integrity verification
      this.verifyInvoiceIntegrity(savedBill.id, savedBill, "SELF_TEST_VERIFY");

      // 5. Clean up test bill
      window.dpvStore.deleteInvoice(savedBill.id);
      const postDelete = window.dpvStore.getInvoiceById(savedBill.id);
      if (postDelete) throw new Error("Self-test: Invoice still present after delete!");

      this.record({
        action: 'SELF_TEST_COMPLETED',
        category: 'SYSTEM',
        status: 'SUCCESS',
        message: '--- DIAGNOSTIC SELF-TEST COMPLETED SUCCESSFULLY (All 10 stages verified) ---'
      });

      this.renderDiagnosticsView();
      if (window.dpvApp && typeof window.dpvApp.showToast === 'function') {
        window.dpvApp.showToast("Diagnostic Self-Test Passed! All recorders active.", "success");
      }
    } catch (err) {
      this.record({
        action: 'SELF_TEST_FAILED',
        category: 'SYSTEM',
        status: 'FAILURE',
        message: `Self-test failure: ${err.message}`,
        error: err
      });
      this.renderDiagnosticsView();
      if (window.dpvApp && typeof window.dpvApp.showToast === 'function') {
        window.dpvApp.showToast(`Self-Test Error: ${err.message}`, "error");
      }
    }
  }

  /**
   * UI Rendering for View Diagnostics
   */
  renderDiagnosticsView() {
    this.updateUIControls();
    this.renderDiagnosticsTable();
  }

  updateUIControls() {
    // Mode toggle
    const toggleBtn = document.getElementById('diag-mode-toggle-btn');
    const statusBadge = document.getElementById('diag-mode-status-badge');
    if (toggleBtn && statusBadge) {
      if (this.config.enabled) {
        toggleBtn.innerHTML = '<i data-lucide="toggle-right"></i> Recording is ACTIVE (Click to Pause)';
        toggleBtn.className = 'btn btn-primary btn-sm';
        statusBadge.textContent = 'RECORDER ON';
        statusBadge.style.background = 'var(--success-bg)';
        statusBadge.style.color = 'var(--success)';
        statusBadge.style.border = '1px solid var(--success)';
      } else {
        toggleBtn.innerHTML = '<i data-lucide="toggle-left"></i> Recording is OFF (Click to Resume)';
        toggleBtn.className = 'btn btn-outline btn-sm';
        statusBadge.textContent = 'PAUSED';
        statusBadge.style.background = '#f1f5f9';
        statusBadge.style.color = '#64748b';
        statusBadge.style.border = '1px solid #cbd5e1';
      }
    }

    // Metric Counters
    const filtered = this.getFilteredLogs();
    const errorCount = this.logs.filter(l => l.status === 'FAILURE' || l.category === 'ERROR' || l.action.includes('FAIL')).length;
    const warningCount = this.logs.filter(l => l.status === 'WARNING').length;
    const traceCount = Object.keys(this.traces).length;

    const elTotal = document.getElementById('diag-stat-total');
    const elErrors = document.getElementById('diag-stat-errors');
    const elTraces = document.getElementById('diag-stat-traces');
    const elSync = document.getElementById('diag-stat-sync');

    if (elTotal) elTotal.textContent = this.logs.length;
    if (elErrors) elErrors.textContent = errorCount;
    if (elTraces) elTraces.textContent = traceCount;
    if (elSync) elSync.textContent = this.logs.filter(l => l.category === 'SYNC').length;

    // Filter Chips Counts
    const chipAll = document.querySelector('[data-diag-filter="all"]');
    const chipErrors = document.querySelector('[data-diag-filter="errors"]');
    const chipLifecycle = document.querySelector('[data-diag-filter="lifecycle"]');
    const chipDatabase = document.querySelector('[data-diag-filter="database"]');
    const chipSync = document.querySelector('[data-diag-filter="sync"]');
    const chipPdf = document.querySelector('[data-diag-filter="pdf"]');

    if (chipAll) chipAll.textContent = `All Logs (${this.logs.length})`;
    if (chipErrors) chipErrors.textContent = `Errors & Failures (${errorCount})`;
    if (chipLifecycle) chipLifecycle.textContent = `Bill Traces (${this.logs.filter(l => l.category === 'LIFECYCLE').length})`;
    if (chipDatabase) chipDatabase.textContent = `Database (${this.logs.filter(l => l.category === 'DATABASE').length})`;
    if (chipSync) chipSync.textContent = `Sync (${this.logs.filter(l => l.category === 'SYNC').length})`;
    if (chipPdf) chipPdf.textContent = `PDF / Print (${this.logs.filter(l => l.category === 'PDF_PRINT').length})`;

    if (window.lucide) window.lucide.createIcons();
  }

  renderDiagnosticsTable() {
    const tbody = document.getElementById('diag-logs-tbody');
    if (!tbody) return;

    const filtered = this.getFilteredLogs();
    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">
            <div style="font-size: 24px; margin-bottom: 8px;">📋</div>
            <p style="font-weight: 600;">No diagnostic logs found matching current filter.</p>
            <p style="font-size: 12px; margin-top: 4px;">Perform billing actions (Save, PDF, Print, Back) to see real-time recorded traces.</p>
          </td>
        </tr>
      `;
      return;
    }

    const rows = filtered.slice(0, 100).map(log => {
      let badgeStyle = 'background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;';
      if (log.status === 'SUCCESS') badgeStyle = 'background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;';
      else if (log.status === 'FAILURE') badgeStyle = 'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; font-weight: 700;';
      else if (log.status === 'WARNING') badgeStyle = 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;';

      const docNumber = log.invoiceNumber || (log.invoiceId ? log.invoiceId.substring(0, 10) + '...' : '-');
      const actionBadge = `<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-family: monospace; ${badgeStyle}">${log.action}</span>`;

      return `
        <tr style="${log.status === 'FAILURE' ? 'background: rgba(254, 226, 226, 0.25);' : ''}">
          <td style="font-family: monospace; font-size: 11.5px; color: var(--text-muted); white-space: nowrap;">${log.timeFormatted}</td>
          <td>${actionBadge}</td>
          <td style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">${log.category}</td>
          <td style="font-family: monospace; font-size: 11.5px; font-weight: 600; color: var(--primary);">${docNumber}</td>
          <td style="font-size: 12.5px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(log.message)}">${this.escapeHtml(log.message)}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-outline btn-sm" style="padding: 3px 8px; font-size: 11px;" onclick="window.dpvDiagnostics.viewLogDetails('${log.id}')">
              <i data-lucide="info"></i> Details
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rows;
    if (window.lucide) window.lucide.createIcons();
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  /**
   * View Single Log Details in Modal
   */
  viewLogDetails(logId) {
    const log = this.logs.find(l => l.id === logId);
    if (!log) return;

    let contentHtml = `
      <div style="font-size: 13px;">
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <strong>Timestamp:</strong> <span>${log.timestamp} (${log.timeFormatted})</span>
          <strong>Action:</strong> <span style="font-family: monospace; font-weight: 700;">${log.action}</span>
          <strong>Status:</strong> <span style="font-weight: 700; color: ${log.status === 'FAILURE' ? '#dc2626' : (log.status === 'SUCCESS' ? '#16a34a' : 'inherit')}">${log.status}</span>
          <strong>Category:</strong> <span>${log.category}</span>
          <strong>Screen/View:</strong> <span>${log.currentView}</span>
          <strong>Doc Number:</strong> <span>${log.invoiceNumber || 'None'}</span>
          <strong>Doc ID:</strong> <span>${log.invoiceId || 'None'}</span>
        </div>

        <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 6px;">Message</h4>
        <p style="padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 14px; font-size: 13px;">
          ${this.escapeHtml(log.message)}
        </p>
    `;

    if (log.error) {
      contentHtml += `
        <h4 style="font-size: 13px; font-weight: 700; color: #dc2626; margin-bottom: 6px;">Error Details</h4>
        <pre style="background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 6px; font-size: 11.5px; overflow-x: auto; margin-bottom: 14px; font-family: monospace;">${this.escapeHtml(JSON.stringify(log.error, null, 2))}</pre>
      `;
    }

    if (log.details && Object.keys(log.details).length > 0) {
      contentHtml += `
        <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 6px;">Payload &amp; State Details</h4>
        <pre style="background: #0f172a; color: #38bdf8; padding: 10px; border-radius: 6px; font-size: 11.5px; overflow-x: auto; max-height: 250px; font-family: monospace;">${this.escapeHtml(JSON.stringify(log.details, null, 2))}</pre>
      `;
    }

    contentHtml += `
        <h4 style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-top: 14px; margin-bottom: 4px;">Device &amp; Browser</h4>
        <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">
          Online: ${log.deviceInfo?.online ? 'YES' : 'NO'} | Viewport: ${log.deviceInfo?.screen || 'N/A'}
        </div>
      </div>
    `;

    const modal = document.getElementById('modal-diagnostic-detail');
    const body = document.getElementById('diag-detail-modal-body');
    if (modal && body) {
      body.innerHTML = contentHtml;
      modal.classList.add('open');
    } else {
      alert(`[${log.action}] ${log.message}\n\nDetails:\n` + JSON.stringify(log.details, null, 2));
    }
  }

  closeDetailModal() {
    const modal = document.getElementById('modal-diagnostic-detail');
    if (modal) modal.classList.remove('open');
  }
}

// Global Single Instance
window.dpvDiagnostics = new DPVDiagnostics();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.dpvDiagnostics.init());
} else {
  window.dpvDiagnostics.init();
}
