/**
 * Dewangan Photo & Videography – Invoice Management System
 * Backup, Export & Restore Controller (Rule #35)
 */

class DPVBackup {
  constructor() {}

  /**
   * Export all database tables to timestamped JSON file
   */
  downloadBackup() {
    const jsonString = window.dpvStore.exportAllData();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `DPV_Studio_Backup_${dateStr}.json`;

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.dpvStore.logAudit('BACKUP_DOWNLOADED', `Downloaded database backup file ${filename}`);
  }

  /**
   * Restore database from user provided JSON file
   */
  restoreFromFile(file, onSuccess, onError) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        window.dpvStore.importAllData(content);
        window.dpvStore.logAudit('BACKUP_RESTORED', `Restored database backup from file ${file.name}`);
        if (onSuccess) onSuccess();
      } catch (err) {
        if (onError) onError(err);
      }
    };
    reader.onerror = () => {
      if (onError) onError(new Error("Failed to read selected file"));
    };
    reader.readAsText(file);
  }

  /**
   * Export invoices to CSV format for Excel/Spreadsheets
   */
  exportInvoicesCsv() {
    const invoices = window.dpvStore.getInvoices();
    if (!invoices.length) {
      alert("No invoices found to export.");
      return;
    }

    const headers = [
      "Invoice Number",
      "Billing Date",
      "Customer Name",
      "Customer Mobile",
      "Customer Email",
      "Event Type",
      "Venue",
      "Grand Total",
      "Total Paid",
      "Balance Due",
      "Payment Status",
      "Payment Method"
    ];

    const rows = invoices.map(inv => [
      `"${inv.invoiceNumber}"`,
      `"${inv.invoiceDate}"`,
      `"${(inv.customer?.name || '').replace(/"/g, '""')}"`,
      `"${inv.customer?.phone || ''}"`,
      `"${inv.customer?.email || ''}"`,
      `"${inv.event?.type || ''}"`,
      `"${(inv.event?.venue || '').replace(/"/g, '""')}"`,
      inv.financials?.grandTotal || 0,
      inv.financials?.totalPaid || 0,
      inv.financials?.balanceDue || 0,
      `"${inv.paymentStatus}"`,
      `"${inv.paymentMethod}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DPV_Invoices_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export customers directory to CSV
   */
  exportCustomersCsv() {
    const customers = window.dpvStore.getCustomers();
    if (!customers.length) {
      alert("No customers found to export.");
      return;
    }
    const headers = ["Name", "Mobile", "WhatsApp", "Email", "Address", "City", "Notes"];
    const rows = customers.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      `"${c.whatsapp || ''}"`,
      `"${c.email || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${(c.city || '').replace(/"/g, '""')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DPV_Customers_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate parsed backup object
   */
  createBackupData() {
    const raw = window.dpvStore.exportAllData();
    return JSON.parse(raw);
  }

  /**
   * Validate backup structure
   */
  validateBackup(backupData) {
    if (!backupData || typeof backupData !== 'object') return false;
    if (!backupData.data || !backupData.data.settings) return false;
    return true;
  }
}

window.dpvBackup = new DPVBackup();
