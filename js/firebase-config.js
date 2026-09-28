/**
 * Dewangan Photo & Videography – Invoice Management System
 * Firebase Cloud Sync Adapter (Isolated & Modular)
 */

class DPVFirebaseSync {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.isConnected = false;
  }

  /**
   * Initialize Firebase if user configured it in Settings
   */
  async init() {
    const settings = window.dpvStore.getSettings();
    if (!settings.firebaseConfig || !settings.firebaseConfig.apiKey) {
      console.log("[DPVFirebaseSync] Cloud sync not configured, operating in standalone local mode.");
      this.isConnected = false;
      return false;
    }

    try {
      if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        this.app = firebase.initializeApp(settings.firebaseConfig);
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.isConnected = true;
        console.log("[DPVFirebaseSync] Successfully connected to dedicated Firebase Cloud project.");
        return true;
      }
    } catch (err) {
      console.warn("[DPVFirebaseSync] Firebase initialization error:", err);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Sync a document to isolated cloud collection
   */
  async syncToCloud(collectionName, docId, data) {
    if (!this.isConnected || !this.db) return false;
    try {
      // Prefix collection name for complete safety and namespace isolation
      const safeCollection = `dpv_inv_${collectionName}`;
      await this.db.collection(safeCollection).doc(docId).set(data, { merge: true });
      return true;
    } catch (e) {
      console.error(`[DPVFirebaseSync] Failed to sync ${collectionName}/${docId}:`, e);
      return false;
    }
  }
}

window.dpvFirebaseSync = new DPVFirebaseSync();
