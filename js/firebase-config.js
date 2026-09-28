/**
 * Dewangan Photo & Videography – Invoice Management System
 * Firebase Cloud Sync Engine (Real-Time Multi-Device Synchronization for 3+ Devices)
 * Connected to Project: dpv-studio-billing
 */

const DPV_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAfInnJUYhvcJnddPbFU7Kn2nMUNiu-cYI",
  authDomain: "dpv-studio-billing.firebaseapp.com",
  projectId: "dpv-studio-billing",
  storageBucket: "dpv-studio-billing.firebasestorage.app",
  messagingSenderId: "677655215175",
  appId: "1:677655215175:web:d8dc4e113c0037177b4562"
};

class DPVFirebaseSync {
  constructor() {
    this.app = null;
    this.db = null;
    this.isConnected = false;
    this.isSyncing = false;
    this.unsubscribeListeners = [];
    this.hasPerformedInitialSync = false;
  }

  /**
   * Initialize Firebase & Firestore Cloud Sync
   */
  async init() {
    // Check if Firebase SDK is present (requires internet or cached CDN)
    if (typeof firebase === 'undefined') {
      console.log("[DPVFirebaseSync] Operating in standalone offline mode (Firebase SDK not loaded).");
      this.isConnected = false;
      this.updateSyncUI(false);
      return false;
    }

    try {
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(DPV_FIREBASE_CONFIG);
      } else {
        this.app = firebase.app();
      }

      this.db = firebase.firestore();

      // Enable offline persistence in background (NON-BLOCKING) so init never hangs
      try {
        this.db.enablePersistence().catch((pErr) => {
          console.warn("[DPVFirebaseSync] Offline persistence notice (non-fatal):", pErr.code || pErr.message);
        });
      } catch (pErr) {
        // Ignored
      }

      this.isConnected = true;
      console.log("[DPVFirebaseSync] Connected to Firebase Cloud Firestore for real-time 3-device sync.");
      this.updateSyncUI(true);

      // Start listening to real-time changes from other devices
      this.setupRealtimeListeners();

      // Check if cloud has records; if totally empty and we have local data, do initial push
      this.checkAndPerformInitialPush();

      return true;
    } catch (err) {
      console.warn("[DPVFirebaseSync] Cloud connection pending or Firestore not yet started:", err.message);
      this.isConnected = false;
      this.updateSyncUI(false);
      return false;
    }
  }

  /**
   * Listen to real-time additions/edits across all studio devices
   */
  setupRealtimeListeners() {
    if (!this.isConnected || !this.db) return;
    this.cleanupListeners();

    // 1. INVOICES & QUOTATIONS REAL-TIME LISTENER
    try {
      const unsubInvoices = this.db.collection('dpv_invoices').onSnapshot((snapshot) => {
        if (!window.dpvStore) return;
        snapshot.docChanges().forEach((change) => {
          const inv = change.doc.data();
          if (change.type === 'added' || change.type === 'modified') {
            const isNew = window.dpvStore.mergeRemoteInvoice(inv);
            if (isNew && window.dpvApp && typeof window.dpvApp.showToast === 'function') {
              window.dpvApp.showToast(`Cloud Sync: Invoice ${inv.invoiceNumber || ''} updated!`, 'info');
            }
          } else if (change.type === 'removed') {
            window.dpvStore.removeRemoteInvoice(change.doc.id);
          }
        });
      }, (err) => {
        console.warn("[DPVFirebaseSync] Invoices listener note:", err.message);
      });
      this.unsubscribeListeners.push(unsubInvoices);
    } catch (e) {
      console.warn("[DPVFirebaseSync] Invoices listener setup:", e);
    }

    // 2. CUSTOMERS REAL-TIME LISTENER
    try {
      const unsubCustomers = this.db.collection('dpv_customers').onSnapshot((snapshot) => {
        if (!window.dpvStore) return;
        snapshot.docChanges().forEach((change) => {
          const cust = change.doc.data();
          if (change.type === 'added' || change.type === 'modified') {
            window.dpvStore.mergeRemoteCustomer(cust);
          } else if (change.type === 'removed') {
            window.dpvStore.removeRemoteCustomer(change.doc.id);
          }
        });
      }, (err) => {
        console.warn("[DPVFirebaseSync] Customers listener note:", err.message);
      });
      this.unsubscribeListeners.push(unsubCustomers);
    } catch (e) {
      console.warn("[DPVFirebaseSync] Customers listener setup:", e);
    }

    // 3. PAYMENTS REAL-TIME LISTENER
    try {
      const unsubPayments = this.db.collection('dpv_payments').onSnapshot((snapshot) => {
        if (!window.dpvStore) return;
        snapshot.docChanges().forEach((change) => {
          const pay = change.doc.data();
          if (change.type === 'added' || change.type === 'modified') {
            window.dpvStore.mergeRemotePayment(pay);
          } else if (change.type === 'removed') {
            window.dpvStore.removeRemotePayment(change.doc.id);
          }
        });
      }, (err) => {
        console.warn("[DPVFirebaseSync] Payments listener note:", err.message);
      });
      this.unsubscribeListeners.push(unsubPayments);
    } catch (e) {
      console.warn("[DPVFirebaseSync] Payments listener setup:", e);
    }

    // 4. STUDIO SETTINGS REAL-TIME LISTENER (Phone, Rates, UPI, Tagline across all devices)
    try {
      const unsubSettings = this.db.collection('dpv_settings').doc('studio_settings').onSnapshot((doc) => {
        if (!window.dpvStore || !doc.exists) return;
        window.dpvStore.mergeRemoteSettings(doc.data());
      }, (err) => {
        console.warn("[DPVFirebaseSync] Settings listener note:", err.message);
      });
      this.unsubscribeListeners.push(unsubSettings);
    } catch (e) {
      console.warn("[DPVFirebaseSync] Settings listener setup:", e);
    }
  }

  cleanupListeners() {
    this.unsubscribeListeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.unsubscribeListeners = [];
  }

  /**
   * Push an individual invoice to Firestore
   */
  async syncInvoice(invoice) {
    if (!this.db && typeof firebase !== 'undefined') await this.init();
    if (!this.db || !invoice || !invoice.id) return false;
    try {
      await this.db.collection('dpv_invoices').doc(invoice.id).set(invoice, { merge: true });
      return true;
    } catch (e) {
      console.error("[DPVFirebaseSync] Error syncing invoice:", e);
      return false;
    }
  }

  /**
   * Delete an invoice from Firestore
   */
  async deleteInvoice(invoiceId) {
    if (!this.db && typeof firebase !== 'undefined') await this.init();
    if (!this.db || !invoiceId) return false;
    try {
      await this.db.collection('dpv_invoices').doc(invoiceId).delete();
      return true;
    } catch (e) {
      console.error("[DPVFirebaseSync] Error deleting invoice:", e);
      return false;
    }
  }

  /**
   * Push customer record to Firestore
   */
  async syncCustomer(customer) {
    if (!this.db && typeof firebase !== 'undefined') await this.init();
    if (!this.db || !customer || !customer.id) return false;
    try {
      await this.db.collection('dpv_customers').doc(customer.id).set(customer, { merge: true });
      return true;
    } catch (e) {
      console.error("[DPVFirebaseSync] Error syncing customer:", e);
      return false;
    }
  }

  /**
   * Delete customer record from Firestore
   */
  async deleteCustomer(customerId) {
    if (!this.db && typeof firebase !== 'undefined') await this.init();
    if (!this.db || !customerId) return false;
    try {
      await this.db.collection('dpv_customers').doc(customerId).delete();
      return true;
    } catch (e) {
      console.error("[DPVFirebaseSync] Error deleting customer:", e);
      return false;
    }
  }

  /**
   * Push payment record to Firestore
   */
  async syncPayment(payment) {
    if (!this.db && typeof firebase !== 'undefined') await this.init();
    if (!this.db || !payment || !payment.id) return false;
    try {
      await this.db.collection('dpv_payments').doc(payment.id).set(payment, { merge: true });
      return true;
    } catch (e) {
      console.error("[DPVFirebaseSync] Error syncing payment:", e);
      return false;
    }
  }

  /**
   * Delete payment record from Firestore
   */
  async deletePayment(paymentId) {
    if (!this.db && typeof firebase !== 'undefined') await this.init();
    if (!this.db || !paymentId) return false;
    try {
      await this.db.collection('dpv_payments').doc(paymentId).delete();
      return true;
    } catch (e) {
      console.error("[DPVFirebaseSync] Error deleting payment:", e);
      return false;
    }
  }

  /**
   * Push studio settings record to Firestore
   */
  async syncSettings(settings) {
    if (!this.db && typeof firebase !== 'undefined') await this.init();
    if (!this.db || !settings) return false;
    try {
      await this.db.collection('dpv_settings').doc('studio_settings').set(settings, { merge: true });
      return true;
    } catch (e) {
      console.error("[DPVFirebaseSync] Error syncing settings:", e);
      return false;
    }
  }

  /**
   * Check if Cloud database has existing invoices. If totally empty, upload all local data.
   */
  async checkAndPerformInitialPush() {
    if (this.hasPerformedInitialSync || !this.isConnected || !this.db || !window.dpvStore) return;
    try {
      const snap = await this.db.collection('dpv_invoices').limit(1).get();
      if (snap.empty) {
        console.log("[DPVFirebaseSync] Cloud collection is empty. Performing initial data population...");
        await this.uploadAllDataToCloud(true);
      }
      this.hasPerformedInitialSync = true;
    } catch (e) {
      console.warn("[DPVFirebaseSync] Initial check note:", e.message);
    }
  }

  /**
   * 1-Click Upload all local invoices, customers, payments, and settings to Cloud
   */
  async uploadAllDataToCloud(silent = false) {
    if (!this.db && typeof firebase !== 'undefined') await this.init();
    if (!this.isConnected || !this.db || !window.dpvStore) {
      if (!silent) alert("Firebase is not connected yet. Please ensure you have internet access and Firestore Database is enabled.");
      return false;
    }

    try {
      const invoices = window.dpvStore.getInvoices();
      const customers = window.dpvStore.getCustomers();
      const payments = window.dpvStore.getPayments();
      const settings = window.dpvStore.getSettings();

      const batch = this.db.batch();

      invoices.forEach(inv => {
        batch.set(this.db.collection('dpv_invoices').doc(inv.id), inv, { merge: true });
      });

      customers.forEach(cust => {
        batch.set(this.db.collection('dpv_customers').doc(cust.id), cust, { merge: true });
      });

      payments.forEach(pay => {
        batch.set(this.db.collection('dpv_payments').doc(pay.id), pay, { merge: true });
      });

      if (settings && Object.keys(settings).length > 0) {
        batch.set(this.db.collection('dpv_settings').doc('studio_settings'), settings, { merge: true });
      }

      await batch.commit();

      if (!silent && window.dpvApp && typeof window.dpvApp.showToast === 'function') {
        window.dpvApp.showToast("All studio bills, customers, settings & payments synced to Cloud!", "success");
      }
      console.log("[DPVFirebaseSync] Batch sync to cloud succeeded.");
      return true;
    } catch (err) {
      console.error("[DPVFirebaseSync] Batch upload error:", err);
      if (!silent) alert("Upload error: " + err.message);
      return false;
    }
  }

  /**
   * Update top navigation badge to reflect real-time sync state
   */
  updateSyncUI(connected) {
    const el = document.getElementById('cloud-sync-status-badge');
    if (el) {
      if (connected) {
        el.className = 'badge badge-success';
        el.style.display = 'inline-flex';
        el.style.alignItems = 'center';
        el.style.background = '#059669';
        el.style.color = '#ffffff';
        el.innerHTML = '<i data-lucide="cloud" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> Live Sync Active (3 Devices)';
      } else {
        el.className = 'badge badge-secondary';
        el.style.display = 'inline-flex';
        el.style.alignItems = 'center';
        el.innerHTML = '<i data-lucide="cloud-off" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> Offline Mode';
      }
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }
}

window.dpvFirebaseSync = new DPVFirebaseSync();
