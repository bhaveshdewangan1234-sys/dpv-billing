/**
 * Dewangan Photo & Videography – Invoice Management System
 * Master Application Controller & UI Logic
 */

class DPVApp {
  constructor() {
    this.currentView = 'view-dashboard';
    this.activeInvoice = null;
    this.activeFilter = 'all';
    this.searchQuery = '';
    this.wizardCurrentStep = 1;
    this.tempInvoiceDraft = null;
    this.currentDocumentType = 'invoice';
    this.calendarCurrentView = 'month';
    this.calendarSearchQuery = '';
  }

  init() {
    // 1. Initialize DB and Auth
    window.dpvStore.init();
    const user = window.dpvAuth.init();

    // 2. Setup Auth Listeners
    window.dpvAuth.onAuthChange((currentUser) => {
      this.handleAuthChange(currentUser);
    });

    // 3. Register DOM Event Listeners
    this.bindEvents();

    // 4. Initial Render & Helper Datasets
    this.populateServiceDropdowns();
    this.refreshAllData();

    // 5. Initialize Real-Time Multi-Device Cloud Sync
    if (window.dpvFirebaseSync) {
      window.dpvFirebaseSync.init();
    }

    // 6. Icons
    if (window.lucide) window.lucide.createIcons();

    // 6. Handle URL navigation parameters (e.g. ?preview=1, ?invoice=inv_demo_1, or ?view=view-new-invoice)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');

      if (viewParam) {
        if (!window.dpvAuth.currentUser) {
          window.dpvAuth.login('admin', 'DPV@9301614549Kumar');
        }
        setTimeout(() => {
          if (viewParam === 'view-new-invoice') {
            this.startNewInvoice();
          } else {
            this.navigateTo(viewParam);
          }
          if (urlParams.get('open_menu') === '1') {
            this.toggleMobileSidebar();
          }
        }, 50);
      } else if (urlParams.get('open_menu') === '1') {
        if (!window.dpvAuth.currentUser) {
          window.dpvAuth.login('admin', 'DPV@9301614549Kumar');
        }
        setTimeout(() => this.toggleMobileSidebar(), 100);
      } else if (urlParams.get('preview') || urlParams.get('invoice')) {
        const reqInvId = urlParams.get('invoice');
        if (!window.dpvAuth.currentUser) {
          window.dpvAuth.login('admin', 'DPV@9301614549Kumar');
        }
        setTimeout(() => {
          const invoices = window.dpvStore.getInvoices();
          const targetId = reqInvId || (invoices.length > 0 ? invoices[0].id : null);
          if (targetId) {
            this.openInvoicePreview(targetId);
          } else {
            this.navigateTo('view-invoices');
          }
          if (urlParams.get('standalone') === '1') {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.style.display = 'none';
            const topNav = document.querySelector('.top-navbar');
            if (topNav) topNav.style.display = 'none';
            const actBar = document.querySelector('.preview-action-bar');
            if (actBar) actBar.style.display = 'none';
            const mainWrap = document.querySelector('.main-wrapper');
            if (mainWrap) { mainWrap.style.margin = '0'; mainWrap.style.minHeight = 'auto'; }
            const pageBody = document.querySelector('.page-body');
            if (pageBody) pageBody.style.padding = '0';
            const pageCont = document.querySelector('.invoice-page-container');
            if (pageCont) { pageCont.style.padding = '0'; pageCont.style.background = '#ffffff'; }
          }
        }, 30);
      }
    } catch (e) {
      console.warn("Direct preview routing warning:", e);
    }
  }

  // Auth Handling
  handleAuthChange(user) {
    const authModal = document.getElementById('auth-modal');
    const appContainer = document.getElementById('app-container');

    if (user) {
      authModal.classList.remove('open');
      authModal.style.display = 'none';
      appContainer.style.display = 'flex';
      
      document.getElementById('sidebar-user-name').textContent = user.name || user.username;
      document.getElementById('sidebar-user-role').textContent = user.role === 'admin' ? 'Owner / Admin' : 'Staff';
      document.getElementById('sidebar-user-avatar').textContent = (user.name || user.username).substring(0, 2).toUpperCase();
      const isAdmin = user.role === 'admin';
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
      });

      this.showToast(`Welcome back, ${user.name || user.username}!`, 'info');
      this.refreshAllData();
    } else {
      authModal.style.display = 'flex';
      authModal.classList.add('open');
      appContainer.style.display = 'none';
    }
  }

  // Bind All UI Events
  bindEvents() {
    // Login form
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('login-username').value;
      const p = document.getElementById('login-password').value;
      try {
        window.dpvAuth.login(u, p);
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      if (confirm("Are you sure you want to log out of Dewangan Studio?")) {
        window.dpvAuth.logout();
      }
    });

    // Navigation links (Sidebar and Mobile bar)
    document.querySelectorAll('[data-view]').forEach(elem => {
      elem.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = elem.dataset.view;
        if (targetView === 'view-new-invoice') {
          const formId = document.getElementById('inv-form-id')?.value;
          const custName = document.getElementById('cust-name-input')?.value;
          if (!formId && !custName) {
            this.startNewInvoice();
          } else {
            this.navigateTo(targetView);
          }
        } else {
          this.navigateTo(targetView);
        }
        this.closeMobileSidebar();
      });
    });

    // Mobile menu toggle & backdrop handlers
    document.getElementById('menu-toggle-btn')?.addEventListener('click', () => {
      this.toggleMobileSidebar();
    });
    document.getElementById('mobile-menu-drawer-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleMobileSidebar();
    });
    document.getElementById('sidebar-backdrop')?.addEventListener('click', () => {
      this.closeMobileSidebar();
    });
    document.getElementById('sidebar-close-btn')?.addEventListener('click', () => {
      this.closeMobileSidebar();
    });

    // Stepper step direct clicking (Smooth 1-Tap Jump)
    document.querySelectorAll('.wizard-step').forEach(stepElem => {
      stepElem.addEventListener('click', () => {
        const stepNum = parseInt(stepElem.dataset.step, 10);
        if (stepNum) this.goToWizardStep(stepNum);
      });
    });

    // Fit Screen Preview toggle
    document.getElementById('preview-fit-screen-btn')?.addEventListener('click', () => {
      this.toggleFitToScreen();
    });

    // Quick Action buttons
    document.getElementById('quick-new-invoice-btn')?.addEventListener('click', () => this.startNewInvoice());
    document.getElementById('quick-calendar-btn')?.addEventListener('click', () => this.navigateTo('view-calendar'));

    // Invoices Search and Filter
    document.getElementById('invoices-search-input')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderInvoicesTable();
    });

    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeFilter = chip.dataset.filter;
        this.renderInvoicesTable();
      });
    });

    // Customer Autocomplete in Invoice Form
    const nameInput = document.getElementById('cust-name-input');
    nameInput?.addEventListener('input', (e) => this.handleCustomerAutocomplete(e.target.value));
    nameInput?.addEventListener('focus', (e) => this.handleCustomerAutocomplete(e.target.value));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#cust-name-input') && !e.target.closest('#cust-autocomplete-dropdown')) {
        document.getElementById('cust-autocomplete-dropdown')?.classList.remove('open');
      }
    });

    // Shooting Dates in Form
    document.getElementById('add-shoot-date-btn')?.addEventListener('click', () => this.addShootDateRow());

    // Services / Packages in Form
    document.getElementById('add-service-row-btn')?.addEventListener('click', () => this.addServiceItemRow());
    document.getElementById('add-custom-service-row-btn')?.addEventListener('click', () => this.addServiceItemRow({ name: '', isCustom: true }));
    document.getElementById('add-album-btn')?.addEventListener('click', () => this.addAlbumRow());
    document.getElementById('add-deliverable-btn')?.addEventListener('click', () => this.addDeliverableRow());
    document.getElementById('add-custom-deliverable-btn')?.addEventListener('click', () => this.addDeliverableRow({ name: '', isCustom: true }));
    document.getElementById('package-selector')?.addEventListener('change', (e) => this.handlePackageSelection(e.target.value));
    document.getElementById('fast-service-selector')?.addEventListener('change', (e) => {
      this.handleFastServiceSelection(e.target.value);
      e.target.value = '';
    });

    // Dynamic builder calculations
    document.getElementById('builder-overall-discount')?.addEventListener('input', () => this.updateFormCalculations());
    document.getElementById('builder-enable-gst')?.addEventListener('change', () => this.updateFormCalculations());

    // Payments in Form
    document.getElementById('add-payment-record-btn')?.addEventListener('click', () => this.addPaymentRow());

    // Preview Actions
    document.getElementById('preview-download-pdf-btn')?.addEventListener('click', () => this.handleDownloadPdf());
    document.getElementById('preview-print-btn')?.addEventListener('click', () => this.handlePrint());
    document.getElementById('preview-whatsapp-btn')?.addEventListener('click', () => this.handleWhatsAppShare());
    document.getElementById('preview-record-pay-btn')?.addEventListener('click', () => {
      if (this.activeInvoice) {
        this.recordInvoicePayment(this.activeInvoice.id);
      }
    });
    document.getElementById('preview-finalize-btn')?.addEventListener('click', () => this.handleFinalizeInvoice());
    document.getElementById('preview-duplicate-btn')?.addEventListener('click', () => this.handleDuplicateActiveInvoice());
    document.getElementById('preview-edit-btn')?.addEventListener('click', () => this.handleEditActiveInvoice());
    document.getElementById('preview-convert-invoice-btn')?.addEventListener('click', () => this.convertActiveQuotationToInvoice());

    // Window resize handler for mobile preview scaling
    window.addEventListener('resize', () => {
      if (this.currentView === 'view-invoice-preview') {
        this.applyPreviewScale();
      }
    });

    // Management Modals & Triggers
    document.getElementById('add-service-btn')?.addEventListener('click', () => this.openServiceModal());
    document.getElementById('form-service-modal')?.addEventListener('submit', (e) => this.saveServiceModal(e));

    document.getElementById('add-package-btn')?.addEventListener('click', () => this.openPackageModal());
    document.getElementById('form-package-modal')?.addEventListener('submit', (e) => this.savePackageModal(e));

    document.getElementById('add-term-btn')?.addEventListener('click', () => this.openTermModal());
    document.getElementById('form-term-modal')?.addEventListener('submit', (e) => this.saveTermModal(e));

    document.getElementById('add-new-customer-btn')?.addEventListener('click', () => this.openCustomerModal());
    document.getElementById('form-customer-modal')?.addEventListener('submit', (e) => this.saveCustomerModal(e));

    document.getElementById('global-record-payment-btn')?.addEventListener('click', () => this.openGlobalPaymentModal());
    document.getElementById('form-record-payment')?.addEventListener('submit', (e) => this.savePaymentModal(e));

    // Calendar Search
    document.getElementById('cal-search-input')?.addEventListener('input', (e) => {
      this.handleCalendarSearch(e.target.value);
    });

    // Settings
    document.getElementById('save-all-settings-btn')?.addEventListener('click', (e) => this.saveSettings(e));
    document.getElementById('logo-file-input')?.addEventListener('change', (e) => this.handleLogoUpload(e));
    document.getElementById('restore-backup-file-input')?.addEventListener('change', (e) => this.handleRestoreBackup(e));

    // Customers search
    document.getElementById('customers-search-input')?.addEventListener('input', (e) => {
      this.renderCustomersTable(e.target.value.toLowerCase());
    });

    // Reactive store updates
    window.dpvStore.on('change', () => {
      this.refreshAllData();
      this.populateServiceDropdowns();
    });

    // PWA Offline-first auto sync when connectivity resumes
    window.addEventListener('online', () => {
      this.showToast('Back online! Syncing records...', 'info');
      if (window.dpvFirebaseSync) {
        window.dpvFirebaseSync.init();
      }
    });
  }

  // Navigation
  navigateTo(viewId) {
    document.querySelectorAll('.app-view').forEach(view => view.style.display = 'none');
    const target = document.getElementById(viewId);
    if (target) {
      target.style.display = 'block';
      this.currentView = viewId;
    }

    // Update highlights
    document.querySelectorAll('.sidebar-menu .menu-item, .mobile-bottom-nav .mobile-nav-btn').forEach(btn => {
      if (btn.dataset.view === viewId) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    // Update page title
    const titles = {
      'view-dashboard': 'Dashboard Overview',
      'view-new-invoice': 'Create Studio Invoice',
      'view-invoices': 'Invoices Directory',
      'view-calendar': 'Studio Shooting Calendar',
      'view-customers': 'Customer Directory',
      'view-services': 'Services Management',
      'view-packages': 'Packages Management',
      'view-payments': 'Payments Ledger',
      'view-terms': 'Terms & Conditions Policy',
      'view-settings': 'Studio Settings & Branding',
      'view-diagnostics': 'Billing Diagnostics & Error Recorder',
      'view-invoice-preview': 'A4 Invoice Preview'
    };
    document.getElementById('page-title').textContent = titles[viewId] || 'Dewangan Studio';

    // View specific hooks
    if (viewId === 'view-calendar') {
      this.switchCalendarView(this.calendarCurrentView || 'month');
    } else if (viewId === 'view-settings') {
      this.populateSettingsForm();
    } else if (viewId === 'view-diagnostics') {
      if (window.dpvDiagnostics) {
        window.dpvDiagnostics.renderDiagnosticsView();
      }
    } else if (viewId === 'view-packages') {
      this.renderPackagesGrid();
    } else if (viewId === 'view-terms') {
      this.renderTermsList();
    } else if (viewId === 'view-customers') {
      this.renderCustomersTable();
    } else if (viewId === 'view-services') {
      this.renderServicesTable();
    } else if (viewId === 'view-payments') {
      this.renderPaymentsTable();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) window.lucide.createIcons();
  }

  refreshAllData() {
    this.renderDashboardKpis();
    this.renderDashboardRecent();
    this.renderDashboardShoots();
    this.renderInvoicesTable();
  }

  // Dashboard KPI Rendering
  renderDashboardKpis() {
    const invoices = window.dpvStore.getInvoices();
    let totalBilling = 0;
    let totalReceived = 0;
    let totalPending = 0;

    invoices.forEach(inv => {
      const fin = inv.financials || {};
      totalBilling += (fin.grandTotal || 0);
      totalReceived += (fin.totalPaid || 0);
      totalPending += (fin.balanceDue || 0);
    });

    document.getElementById('kpi-total-invoices').textContent = invoices.length;
    document.getElementById('kpi-total-billing').textContent = `₹${totalBilling.toLocaleString('en-IN')}`;
    document.getElementById('kpi-total-received').textContent = `₹${totalReceived.toLocaleString('en-IN')}`;
    document.getElementById('kpi-total-pending').textContent = `₹${totalPending.toLocaleString('en-IN')}`;
  }

  // Dashboard Recent Invoices
  renderDashboardRecent() {
    const invoices = window.dpvStore.getInvoices().slice(0, 6);
    const tbody = document.getElementById('dashboard-recent-invoices-tbody');
    if (!tbody) return;

    if (!invoices.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No invoices generated yet. Click "Create Invoice" to begin.</td></tr>`;
      return;
    }

    tbody.innerHTML = invoices.map(inv => `
      <tr>
        <td><strong>${escapeHtml(inv.invoiceNumber)}</strong></td>
        <td>${escapeHtml(inv.customer ? inv.customer.name : 'Unknown')}</td>
        <td>${escapeHtml(inv.event ? inv.event.type : '')}</td>
        <td><strong>₹${(inv.financials ? inv.financials.grandTotal : 0).toLocaleString('en-IN')}</strong></td>
        <td style="color: ${inv.financials && inv.financials.balanceDue > 0 ? 'var(--danger)' : 'var(--text-muted)'};">
          ₹${(inv.financials ? inv.financials.balanceDue : 0).toLocaleString('en-IN')}
        </td>
        <td><span class="status-pill status-${inv.paymentStatus.toLowerCase().replace(/\s+/g, '-')}">${inv.paymentStatus}</span></td>
        <td>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-outline btn-sm" onclick="window.dpvApp.openInvoicePreview('${inv.id}')" title="Preview A4">
              <i data-lucide="eye"></i>
            </button>
            <button class="btn btn-outline btn-sm" onclick="window.dpvApp.deleteInvoice('${inv.id}')" title="Delete" style="color: var(--danger); border-color: #fecaca;">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // Dashboard Upcoming Shoots
  renderDashboardShoots() {
    const list = document.getElementById('dashboard-upcoming-shoots-list');
    if (!list) return;

    const shoots = window.dpvCalendar.getUpcomingShoots(5);
    if (!shoots.length) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px;">No upcoming shooting dates scheduled.</div>`;
      return;
    }

    list.innerHTML = shoots.map(s => `
      <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 700; color: var(--accent);">${new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${s.dayName || ''})</div>
          <div style="font-weight: 700; font-size: 13.5px; color: var(--text-main); margin: 2px 0;">${escapeHtml(s.eventName)} &bull; ${escapeHtml(s.customerName)}</div>
          <div style="font-size: 11px; color: var(--text-muted);"><i data-lucide="map-pin" style="width: 11px; height: 11px; display: inline;"></i> ${escapeHtml(s.venue)}</div>
        </div>
        <div>
          <span class="status-pill status-${s.paymentStatus.toLowerCase().replace(/\s+/g, '-')}">${s.paymentStatus}</span>
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // Invoices Directory Table
  renderInvoicesTable() {
    const tbody = document.getElementById('invoices-table-tbody');
    if (!tbody) return;

    let invoices = window.dpvStore.getInvoices();

    // Filter
    if (this.activeFilter === 'invoice') {
      invoices = invoices.filter(i => (i.documentType || 'invoice') === 'invoice');
    } else if (this.activeFilter === 'quotation') {
      invoices = invoices.filter(i => i.documentType === 'quotation');
    } else if (this.activeFilter === 'pending') {
      invoices = invoices.filter(i => i.paymentStatus === 'PENDING' && i.documentType !== 'quotation');
    } else if (this.activeFilter === 'partially-paid') {
      invoices = invoices.filter(i => i.paymentStatus === 'PARTIALLY PAID');
    } else if (this.activeFilter === 'paid') {
      invoices = invoices.filter(i => i.paymentStatus === 'PAID');
    } else if (this.activeFilter === 'draft') {
      invoices = invoices.filter(i => i.status === 'draft');
    }

    // Search query
    if (this.searchQuery) {
      invoices = invoices.filter(i => {
        const num = (i.invoiceNumber || '').toLowerCase();
        const name = (i.customer?.name || '').toLowerCase();
        const phone = (i.customer?.phone || '').toLowerCase();
        const ev = (i.event?.type || '').toLowerCase();
        return num.includes(this.searchQuery) || name.includes(this.searchQuery) || phone.includes(this.searchQuery) || ev.includes(this.searchQuery);
      });
    }

    if (!invoices.length) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 48px 24px;">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
          <div style="width:48px;height:48px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;">
            <i data-lucide="file-x" style="width:24px;height:24px;"></i>
          </div>
          <div style="font-weight:600;font-size:15px;color:#475569;">No Bills Found</div>
          <div style="font-size:13px;color:#94a3b8;max-width:320px;">No invoices or quotations match your criteria. Create a new bill to get started.</div>
          <button class="btn btn-primary btn-sm" onclick="window.dpvApp.startNewInvoice()" style="margin-top:6px;">
            <i data-lucide="plus"></i> Create New Bill
          </button>
        </div>
      </td></tr>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    tbody.innerHTML = invoices.map(inv => {
      const isQuot = (inv.documentType === 'quotation');
      return `
        <tr>
          <td><strong>${escapeHtml(inv.invoiceNumber)}</strong></td>
          <td>
            <span class="status-pill ${isQuot ? 'status-quotation' : 'status-partial'}" style="${isQuot ? 'background:#e0f2fe;color:#0369a1;border-color:#bae6fd;' : ''}">
              ${isQuot ? 'QUOTATION' : 'INVOICE'}
            </span>
          </td>
          <td>${inv.invoiceDate}</td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(inv.customer?.name || 'N/A')}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(inv.customer?.relationName || '')}</div>
          </td>
          <td>${escapeHtml(inv.customer?.phone || '')}</td>
          <td>${escapeHtml(inv.event?.type || '')}</td>
          <td><strong>₹${(inv.financials?.grandTotal || 0).toLocaleString('en-IN')}</strong></td>
          <td style="color: var(--success);">${isQuot ? '—' : `₹${(inv.financials?.totalPaid || 0).toLocaleString('en-IN')}`}</td>
          <td style="color: ${(!isQuot && inv.financials?.balanceDue > 0) ? 'var(--danger)' : 'var(--text-muted)'}; font-weight: 700;">
            ${isQuot ? '—' : `₹${(inv.financials?.balanceDue || 0).toLocaleString('en-IN')}`}
          </td>
          <td>
            ${isQuot 
              ? `<span class="status-pill status-quotation" style="background:#e0f2fe;color:#0369a1;border-color:#bae6fd;">PROPOSED</span>` 
              : `<span class="status-pill status-${inv.paymentStatus.toLowerCase().replace(/\s+/g, '-')}">${inv.paymentStatus}</span>`}
            ${inv.status === 'draft' ? '<span style="font-size: 10px; color: #64748b; display: block;">(DRAFT)</span>' : ''}
          </td>
          <td>
            <div style="display: flex; gap: 5px;">
              <button class="btn btn-outline btn-sm" onclick="window.dpvApp.openInvoicePreview('${inv.id}')" title="Preview A4">
                <i data-lucide="eye"></i>
              </button>
              ${isQuot ? `
                <button class="btn btn-outline btn-sm" onclick="window.dpvApp.convertQuotation('${inv.id}')" title="Convert to Confirmed Invoice" style="color: var(--accent); border-color: #fde68a;">
                  <i data-lucide="check-circle"></i>
                </button>
              ` : `
                <button class="btn btn-outline btn-sm" onclick="window.dpvApp.recordInvoicePayment('${inv.id}')" title="Record Payment">
                  <i data-lucide="credit-card"></i>
                </button>
              `}
              <button class="btn btn-outline btn-sm" onclick="window.dpvApp.duplicateInvoice('${inv.id}')" title="Duplicate">
                <i data-lucide="copy"></i>
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.dpvApp.deleteInvoice('${inv.id}')" title="Delete" style="color: var(--danger); border-color: #fecaca;">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // Autocomplete for Customers
  handleCustomerAutocomplete(query) {
    const dropdown = document.getElementById('cust-autocomplete-dropdown');
    if (!dropdown) return;

    if (!query || query.trim().length < 1) {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
      return;
    }

    const clean = query.toLowerCase();
    const customers = window.dpvStore.getCustomers().filter(c => 
      c.name.toLowerCase().includes(clean) || 
      (c.phone && c.phone.includes(clean))
    );

    if (!customers.length) {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
      return;
    }

    dropdown.innerHTML = customers.map(c => `
      <div class="autocomplete-item" onclick="window.dpvApp.selectAutocompleteCustomer('${c.id}')">
        <div>
          <div class="autocomplete-name">${escapeHtml(c.name)} ${c.relationName ? `<span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">${escapeHtml(c.relationName)}</span>` : ''}</div>
          <div class="autocomplete-sub">${escapeHtml(c.phone)} &bull; ${escapeHtml(c.city || 'Balod')}</div>
        </div>
        <div style="font-size: 11px; color: var(--accent); font-weight: 600;">Select Client</div>
      </div>
    `).join('');

    dropdown.classList.add('open');
  }

  selectAutocompleteCustomer(custId) {
    const cust = window.dpvStore.getCustomerById(custId);
    if (!cust) return;

    document.getElementById('cust-name-input').value = cust.name || '';
    document.getElementById('cust-relation-input').value = cust.relationName || '';
    document.getElementById('cust-phone-input').value = cust.phone || '';
    document.getElementById('cust-whatsapp-input').value = cust.whatsapp || cust.phone || '';
    document.getElementById('cust-email-input').value = cust.email || '';
    document.getElementById('cust-address-input').value = cust.address || '';
    document.getElementById('cust-city-input').value = cust.city || '';
    document.getElementById('cust-state-input').value = cust.state || 'Chhattisgarh';
    document.getElementById('cust-pincode-input').value = cust.pincode || '';

    document.getElementById('cust-autocomplete-dropdown').classList.remove('open');
    this.showToast(`Selected client: ${cust.name}`, 'info');
  }

  // Document Type Switching (Tax Invoice vs Quotation)
  setDocumentType(type) {
    this.currentDocumentType = (type === 'quotation') ? 'quotation' : 'invoice';
    const btnInv = document.getElementById('btn-doc-type-invoice');
    const btnQuot = document.getElementById('btn-doc-type-quotation');

    if (this.currentDocumentType === 'quotation') {
      if (btnQuot) {
        btnQuot.className = 'btn btn-sm btn-primary doc-type-btn active';
      }
      if (btnInv) {
        btnInv.className = 'btn btn-sm btn-outline doc-type-btn';
      }
      document.getElementById('quotation-payment-notice')?.style.setProperty('display', 'block');
      document.getElementById('payments-builder-wrapper')?.style.setProperty('display', 'none');
      const h5 = document.getElementById('step-5-heading');
      if (h5) h5.innerHTML = '<i data-lucide="file-question"></i> Step 5: Quotation Notice';
      const topHead = document.getElementById('builder-form-title');
      if (topHead) topHead.textContent = 'Create Studio Quotation / Estimate';
    } else {
      if (btnInv) {
        btnInv.className = 'btn btn-sm btn-primary doc-type-btn active';
      }
      if (btnQuot) {
        btnQuot.className = 'btn btn-sm btn-outline doc-type-btn';
      }
      document.getElementById('quotation-payment-notice')?.style.setProperty('display', 'none');
      document.getElementById('payments-builder-wrapper')?.style.setProperty('display', 'block');
      const h5 = document.getElementById('step-5-heading');
      if (h5) h5.innerHTML = '<i data-lucide="credit-card"></i> Step 5: Payments &amp; Installments';
      const topHead = document.getElementById('builder-form-title');
      if (topHead) topHead.textContent = 'Create Studio Tax Invoice';
    }
    if (window.lucide) window.lucide.createIcons();
  }

  startNewQuotation(existingQuotation = null) {
    this.currentDocumentType = 'quotation';
    this.startNewInvoice(existingQuotation);
    this.setDocumentType('quotation');
  }

  populateServiceDropdowns() {
    const services = window.dpvStore.getServices().filter(s => s.active !== false);

    // 1. Data list for item name autocomplete
    const datalist = document.getElementById('preset-services-datalist');
    if (datalist) {
      datalist.innerHTML = services.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.category ? `[${s.category}] ` : '')}₹${(s.rate || 0).toLocaleString('en-IN')}</option>`).join('');
    }

    // 2. Fast add select dropdown
    const fastSelect = document.getElementById('fast-service-selector');
    if (fastSelect) {
      fastSelect.innerHTML = `<option value="">-- Quick Add Service --</option>` +
        services.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (₹${(s.rate || 0).toLocaleString('en-IN')})</option>`).join('');
    }
  }

  handleFastServiceSelection(srvId) {
    if (!srvId) return;
    const srv = window.dpvStore.getServices().find(s => s.id === srvId);
    if (!srv) return;
    this.addServiceItemRow({
      name: srv.name,
      description: srv.description,
      rate: srv.rate,
      qty: 1
    });
    this.updateFormCalculations();
    this.showToast(`Added service: ${srv.name}`, 'info');
  }

  // Start New Invoice
  startNewInvoice(existingInvoice = null) {
    this.wizardCurrentStep = 1;
    this.updateWizardStepsUi();
    
    // Clear / reset form
    document.getElementById('invoice-builder-form').reset();
    document.getElementById('inv-form-id').value = '';
    document.getElementById('inv-form-status').value = 'draft';
    document.getElementById('inv-billing-date-input').value = new Date().toISOString().split('T')[0];

    // Clear dynamic containers
    document.getElementById('shoot-dates-container').innerHTML = '';
    document.getElementById('invoice-items-builder-tbody').innerHTML = '';
    document.getElementById('payments-builder-container').innerHTML = '';
    const albCont = document.getElementById('albums-builder-container');
    if (albCont) albCont.innerHTML = '';
    const delCont = document.getElementById('deliverables-builder-container');
    if (delCont) delCont.innerHTML = '';

    // Populate packages selector
    const pkgSelect = document.getElementById('package-selector');
    if (pkgSelect) {
      const packages = window.dpvStore.getPackages().filter(p => p.active);
      pkgSelect.innerHTML = `<option value="">-- Apply Studio Package --</option>` +
        packages.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (₹${p.price.toLocaleString('en-IN')})</option>`).join('');
    }

    // Populate service dropdowns
    this.populateServiceDropdowns();

    // Populate terms list
    this.renderFormTermsSelector();

    if (existingInvoice) {
      // Prefill for edit or duplicate
      this.populateInvoiceForm(existingInvoice);
    } else {
      this.setDocumentType(this.currentDocumentType || 'invoice');
      // Default: add 1 default shoot date and 1 default service row
      this.addShootDateRow({
        eventName: 'Wedding Ceremony',
        date: new Date().toISOString().split('T')[0],
        timings: '10:00 AM – 10:00 PM',
        venue: 'Balod',
        services: ['Traditional Photography', 'Cinematic Video']
      });
      this.addServiceItemRow({
        name: 'Wedding Photography',
        description: 'Complete photography coverage by senior photographers',
        rate: 25000,
        qty: 1
      });
      // Default album & deliverable
      this.addAlbumRow({
        type: 'NT Album',
        sheets: '30 Sheets',
        size: '12 × 18 inch',
        qty: 1
      });
      this.addDeliverableRow({
        name: 'Wedding Calendar',
        type: 'Desktop Tent',
        size: 'Desktop Size',
        qty: 1
      });
      this.addDeliverableRow({
        name: 'Pen Drive',
        type: '32GB USB Drive',
        size: 'Standard',
        qty: 1
      });
      // Add default advance payment row (if invoice)
      if (this.currentDocumentType !== 'quotation') {
        this.addPaymentRow({
          type: 'Advance Payment',
          amount: 0,
          method: 'UPI'
        });
      }
    }

    this.updateFormCalculations();
    this.navigateTo('view-new-invoice');
  }

  // Wizard Step Switching
  wizardNext(currentStep) {
    if (currentStep === 1) {
      const name = document.getElementById('cust-name-input').value.trim();
      const phone = document.getElementById('cust-phone-input').value.trim();
      if (!name) {
        this.showToast("Please enter customer name", "error");
        document.getElementById('cust-name-input').focus();
        return;
      }
      if (!phone) {
        this.showToast("Please enter customer mobile number", "error");
        document.getElementById('cust-phone-input').focus();
        return;
      }
    }

    this.wizardCurrentStep = currentStep + 1;
    this.updateWizardStepsUi();
  }

  wizardPrev(currentStep) {
    this.wizardCurrentStep = currentStep - 1;
    this.updateWizardStepsUi();
  }

  updateWizardStepsUi() {
    // Hide all panes
    document.querySelectorAll('.wizard-step-pane').forEach(p => p.style.display = 'none');
    const activePane = document.getElementById(`step-pane-${this.wizardCurrentStep}`);
    if (activePane) activePane.style.display = 'block';

    // Update indicators
    document.querySelectorAll('.wizard-step').forEach(ws => {
      const s = parseInt(ws.dataset.step, 10);
      if (s === this.wizardCurrentStep) {
        ws.classList.add('active');
        ws.classList.remove('completed');
      } else if (s < this.wizardCurrentStep) {
        ws.classList.add('completed');
        ws.classList.remove('active');
      } else {
        ws.classList.remove('active', 'completed');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) window.lucide.createIcons();
  }

  // Direct 1-Tap Jump to Wizard Step (Master UX Improvement)
  goToWizardStep(targetStep) {
    if (targetStep < 1 || targetStep > 6) return;
    if (targetStep > 1) {
      const name = document.getElementById('cust-name-input')?.value.trim();
      const phone = document.getElementById('cust-phone-input')?.value.trim();
      if (!name) {
        this.showToast("Please enter customer name first", "warning");
        this.wizardCurrentStep = 1;
        this.updateWizardStepsUi();
        document.getElementById('cust-name-input')?.focus();
        return;
      }
      if (!phone) {
        this.showToast("Please enter customer mobile number first", "warning");
        this.wizardCurrentStep = 1;
        this.updateWizardStepsUi();
        document.getElementById('cust-phone-input')?.focus();
        return;
      }
    }
    this.wizardCurrentStep = targetStep;
    this.updateWizardStepsUi();
  }

  // Mobile Drawer & Backdrop Handlers
  closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-backdrop')?.classList.remove('active');
  }

  toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) {
      const isOpen = sidebar.classList.toggle('open');
      if (backdrop) {
        backdrop.classList.toggle('active', isOpen);
      }
    }
  }

  // Mobile A4 Preview Fit-Screen Toggle
  toggleFitToScreen() {
    const container = document.querySelector('.invoice-page-container');
    if (!container) return;
    container.classList.toggle('fit-screen');
    this.applyPreviewScale();
  }

  // Shooting Dates Rows (Master Requirement #3)
  // Shooting Dates Rows (Master Requirement #1, #2, #3, #4, #5, #6)
  addShootDateRow(data = {}) {
    const container = document.getElementById('shoot-dates-container');
    if (!container) return;

    const count = container.children.length + 1;
    const card = document.createElement('div');
    card.className = 'shoot-date-card';

    // Standard preset ceremonies (Churmaati, Haldi, Mehendi, Sangeet, Wedding, Barat, Reception, etc.)
    const ceremonyPresets = ['Churmaati', 'Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Barat', 'Reception', 'Ring Ceremony', 'Pre-Wedding', 'Maternity Shoot', 'Birthday'];

    // Standard studio assigned services for quick tagging
    const availableServices = [
      'Traditional Photography',
      'Traditional Videography',
      'Candid Photography',
      'Cinematic Video',
      'Drone Coverage',
      'LED Wall',
      'Crane / Jimmy Jib'
    ];

    const initialServices = Array.isArray(data.services) ? data.services : [];

    card.innerHTML = `
      <div class="shoot-date-header">
        <span>Day ${count}: <span class="shoot-date-title-lbl">${escapeHtml(data.eventName || 'Shoot Event')}</span></span>
        <button type="button" class="btn btn-outline btn-sm remove-shoot-date-btn" style="color: var(--danger); border-color: #fecaca; padding: 2px 6px;">
          <i data-lucide="trash-2"></i> Remove Event
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">Function / Ceremony Name <span class="required">*</span></label>
          <input type="text" class="form-control shoot-event-name" value="${escapeHtml(data.eventName || '')}" placeholder="e.g. Churmaati, Haldi, Sangeet, Wedding, Reception" required>
          <div class="ceremony-chip-group">
            ${ceremonyPresets.map(c => `<span class="ceremony-chip ${(data.eventName || '').toLowerCase() === c.toLowerCase() ? 'active' : ''}">${c}</span>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Shoot Date <span class="required">*</span></label>
          <input type="date" class="form-control shoot-date-val" value="${data.date || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Event Coverage Timings</label>
          <input type="text" class="form-control shoot-timings" value="${escapeHtml(data.timings || data.session || '')}" placeholder="e.g. 05:00 PM – 09:00 PM or 10:00 AM – 10:00 PM">
        </div>
        <div class="form-group">
          <label class="form-label">Venue / Hall</label>
          <input type="text" class="form-control shoot-venue" value="${escapeHtml(data.venue || '')}" placeholder="e.g. Agrasen Bhawan / Grand Palace">
        </div>
        <div class="form-group">
          <label class="form-label">Location / City</label>
          <input type="text" class="form-control shoot-location" value="${escapeHtml(data.location || '')}" placeholder="e.g. Balod, Durg">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label class="form-label" style="margin-bottom: 0;">Booked Services for this Event (Exact Time &amp; Details)</label>
            <button type="button" class="btn btn-outline btn-sm add-custom-ev-srv-btn" style="font-size: 11px; padding: 2px 8px;">
              <i data-lucide="plus"></i> Add Service to this Event
            </button>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">
            Select services booked specifically for this ceremony. Enter individual timings (e.g. Drone 7 PM – 8 PM) and notes.
          </div>
          <div class="shoot-services-tags-container">
            ${availableServices.map(srv => {
              const isSelected = initialServices.some(s => (typeof s === 'string' ? s : s.name) === srv);
              return `<span class="shoot-service-pill ${isSelected ? 'selected' : ''}" data-service="${escapeHtml(srv)}">
                <i data-lucide="${isSelected ? 'check' : 'plus'}" style="width: 12px; height: 12px;"></i> ${escapeHtml(srv)}
              </span>`;
            }).join('')}
          </div>
          <div class="event-services-list-container" style="margin-top: 8px;">
            <!-- Dynamic Event Service Rows -->
          </div>
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">Notes for Crew / Rituals / Permissions</label>
          <input type="text" class="form-control shoot-notes" value="${escapeHtml(data.notes || '')}" placeholder="e.g. Drone permissions arranged, arrival at 9 AM, traditional rituals">
        </div>
      </div>
    `;

    const evSrvContainer = card.querySelector('.event-services-list-container');

    const addEventServiceItem = (srvObj = {}) => {
      const row = document.createElement('div');
      row.className = 'event-service-item-row';
      const evTimeDefault = card.querySelector('.shoot-timings')?.value.trim() || '';
      row.innerHTML = `
        <div style="flex: 2.5;">
          <input type="text" class="form-control ev-srv-name" list="preset-services-datalist" value="${escapeHtml(srvObj.name || '')}" placeholder="Service name (e.g. Drone Coverage)" style="padding: 4px 8px; font-size: 11.5px;" required>
        </div>
        <div style="flex: 2;">
          <input type="text" class="form-control ev-srv-time" value="${escapeHtml(srvObj.timings || srvObj.time || evTimeDefault)}" placeholder="Timing (e.g. 07:00 PM – 08:00 PM)" style="padding: 4px 8px; font-size: 11.5px;">
        </div>
        <div style="flex: 3;">
          <input type="text" class="form-control ev-srv-notes" value="${escapeHtml(srvObj.notes || '')}" placeholder="Notes (e.g. Only for Reception)" style="padding: 4px 8px; font-size: 11.5px;">
        </div>
        <button type="button" class="btn btn-outline btn-sm remove-ev-srv-btn" style="color: var(--danger); border: none; padding: 2px 6px;">
          <i data-lucide="x"></i>
        </button>
      `;

      row.querySelector('.remove-ev-srv-btn').addEventListener('click', () => {
        const sName = row.querySelector('.ev-srv-name').value.trim();
        row.remove();
        if (sName) {
          const pill = card.querySelector(`.shoot-service-pill[data-service="${sName}"]`);
          if (pill) {
            pill.classList.remove('selected');
            const icon = pill.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', 'plus');
            if (window.lucide) window.lucide.createIcons();
          }
        }
      });

      evSrvContainer.appendChild(row);
      if (window.lucide) window.lucide.createIcons();
    };

    // Populate initial services
    if (initialServices.length > 0) {
      initialServices.forEach(s => {
        if (typeof s === 'string') {
          addEventServiceItem({ name: s });
        } else {
          addEventServiceItem(s);
        }
      });
    }

    // Button to add custom service to this event
    card.querySelector('.add-custom-ev-srv-btn').addEventListener('click', () => {
      addEventServiceItem({ name: '', timings: card.querySelector('.shoot-timings')?.value.trim() || '' });
    });

    // Chip click handler
    card.querySelectorAll('.ceremony-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const input = card.querySelector('.shoot-event-name');
        input.value = chip.textContent.trim();
        card.querySelector('.shoot-date-title-lbl').textContent = input.value;
        card.querySelectorAll('.ceremony-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Assigned service pill toggle
    card.querySelectorAll('.shoot-service-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const srvName = pill.dataset.service;
        const existingRow = Array.from(evSrvContainer.querySelectorAll('.event-service-item-row')).find(r => r.querySelector('.ev-srv-name')?.value.trim() === srvName);

        if (existingRow) {
          existingRow.remove();
          pill.classList.remove('selected');
          const icon = pill.querySelector('i');
          if (icon) icon.setAttribute('data-lucide', 'plus');
        } else {
          pill.classList.add('selected');
          const icon = pill.querySelector('i');
          if (icon) icon.setAttribute('data-lucide', 'check');
          addEventServiceItem({ name: srvName, timings: card.querySelector('.shoot-timings')?.value.trim() || '' });
        }
        if (window.lucide) window.lucide.createIcons();
      });
    });

    card.querySelector('.remove-shoot-date-btn').addEventListener('click', () => {
      card.remove();
      this.renumberShootDates();
    });

    card.querySelector('.shoot-event-name').addEventListener('input', (e) => {
      card.querySelector('.shoot-date-title-lbl').textContent = e.target.value || 'Shoot Event';
    });

    container.appendChild(card);
    if (window.lucide) window.lucide.createIcons();
  }

  renumberShootDates() {
    const container = document.getElementById('shoot-dates-container');
    if (!container) return;
    Array.from(container.children).forEach((card, index) => {
      const headerSpan = card.querySelector('.shoot-date-header span');
      const titleSpan = card.querySelector('.shoot-date-title-lbl');
      const currentTitle = titleSpan ? titleSpan.textContent : 'Shoot Event';
      headerSpan.innerHTML = `Day ${index + 1}: <span class="shoot-date-title-lbl">${currentTitle}</span>`;
    });
  }

  // Albums Builder (Master Requirement #7, #8)
  addAlbumRow(data = {}) {
    const container = document.getElementById('albums-builder-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'album-builder-card';
    row.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 12px; color: var(--accent);"><i data-lucide="book"></i> Album Specification</span>
        <button type="button" class="btn btn-outline btn-sm remove-album-btn" style="color: var(--danger); border: none; padding: 2px 6px;">
          <i data-lucide="trash-2"></i> Remove
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Album Type <span class="required">*</span></label>
          <input type="text" class="form-control album-type-input" list="album-types-preset" value="${escapeHtml(data.type || 'NT Album')}" placeholder="e.g. NT Album, Premium Velvet Album" required>
          <datalist id="album-types-preset">
            <option value="NT Album">
            <option value="Premium Canvera Album">
            <option value="Luxury Velvet Album">
            <option value="Photo Book">
            <option value="Flush Mount Glossy Album">
          </datalist>
        </div>
        <div class="form-group">
          <label class="form-label">Sheet Count <span class="required">*</span></label>
          <input type="text" class="form-control album-sheets-input" list="album-sheets-preset" value="${escapeHtml(data.sheets || '30 Sheets')}" placeholder="e.g. 30 Sheets, 40 Sheets" required>
          <datalist id="album-sheets-preset">
            <option value="25 Sheets">
            <option value="30 Sheets">
            <option value="35 Sheets">
            <option value="40 Sheets">
            <option value="50 Sheets">
          </datalist>
        </div>
        <div class="form-group">
          <label class="form-label">Album Size</label>
          <input type="text" class="form-control album-size-input" list="album-sizes-preset" value="${escapeHtml(data.size || '12 × 18 inch')}" placeholder="e.g. 12 × 18 inch, 12 × 36 inch">
          <datalist id="album-sizes-preset">
            <option value="12 × 18 inch">
            <option value="12 × 36 inch">
            <option value="12 × 30 inch">
            <option value="10 × 14 inch">
          </datalist>
        </div>
        <div class="form-group">
          <label class="form-label">Quantity</label>
          <input type="number" class="form-control album-qty-input" inputmode="numeric" value="${data.qty || 1}" min="1" style="width: 75px;">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">Album Notes / Special Finishing</label>
          <input type="text" class="form-control album-notes-input" value="${escapeHtml(data.notes || '')}" placeholder="e.g. Leather briefcase bag included, metallic paper finish">
        </div>
      </div>
    `;

    row.querySelector('.remove-album-btn').addEventListener('click', () => {
      row.remove();
    });

    container.appendChild(row);
    if (window.lucide) window.lucide.createIcons();
  }

  // Deliverables Builder (Master Requirement #9, #10, #12)
  addDeliverableRow(data = {}) {
    const container = document.getElementById('deliverables-builder-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'deliv-builder-card';
    row.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 12px; color: var(--accent);"><i data-lucide="gift"></i> Deliverable Item</span>
        <button type="button" class="btn btn-outline btn-sm remove-deliv-btn" style="color: var(--danger); border: none; padding: 2px 6px;">
          <i data-lucide="trash-2"></i> Remove
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Deliverable Item Name <span class="required">*</span></label>
          <input type="text" class="form-control deliv-name-input" list="deliv-names-preset" value="${escapeHtml(data.name || '')}" placeholder="e.g. Wedding Calendar, Photo Frame, Pen Drive" required>
          <datalist id="deliv-names-preset">
            <option value="Wedding Calendar">
            <option value="Photo Frame">
            <option value="Pen Drive">
            <option value="Wall Portrait Canvas">
            <option value="Miniature Album">
            <option value="LED Table Photo Frame">
          </datalist>
        </div>
        <div class="form-group">
          <label class="form-label">Specification / Type</label>
          <input type="text" class="form-control deliv-type-input" value="${escapeHtml(data.type || '')}" placeholder="e.g. Desktop Tent, Acrylic Glass, 32GB Metal USB">
        </div>
        <div class="form-group">
          <label class="form-label">Size / Dimension</label>
          <input type="text" class="form-control deliv-size-input" value="${escapeHtml(data.size || '')}" placeholder="e.g. 12 × 18 inch, A4, Desktop">
        </div>
        <div class="form-group">
          <label class="form-label">Quantity</label>
          <input type="number" class="form-control deliv-qty-input" inputmode="numeric" value="${data.qty || 1}" min="1" style="width: 75px;">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">Notes</label>
          <input type="text" class="form-control deliv-notes-input" value="${escapeHtml(data.notes || '')}" placeholder="e.g. High resolution edited files included, acrylic stand">
        </div>
      </div>
    `;

    row.querySelector('.remove-deliv-btn').addEventListener('click', () => {
      row.remove();
    });

    container.appendChild(row);
    if (window.lucide) window.lucide.createIcons();
  }

  // Service Items Rows
  addInvoiceItemRow(data = {}) {
    return this.addServiceItemRow(data);
  }

  addServiceItemRow(data = {}) {
    const tbody = document.getElementById('invoice-items-builder-tbody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <input type="text" class="form-control item-name" list="preset-services-datalist" value="${escapeHtml(data.name || '')}" placeholder="Service name" required>
      </td>
      <td>
        <input type="text" class="form-control item-desc" value="${escapeHtml(data.description || '')}" placeholder="Coverage details">
      </td>
      <td>
        <input type="number" class="form-control item-rate" inputmode="numeric" value="${data.rate !== undefined ? data.rate : 0}" min="0" step="100" style="text-align: right;">
      </td>
      <td>
        <input type="number" class="form-control item-qty" inputmode="numeric" value="${data.qty || 1}" min="1" style="text-align: center;">
      </td>
      <td>
        <input type="number" class="form-control item-discount" inputmode="numeric" value="${data.discount || 0}" min="0" style="text-align: right;">
      </td>
      <td style="text-align: right; font-weight: 700;">
        <span class="item-amount-val">₹0</span>
      </td>
      <td>
        <button type="button" class="btn btn-outline btn-sm remove-item-btn" style="color: var(--danger); padding: 4px; border: none;">
          <i data-lucide="x"></i>
        </button>
      </td>
    `;

    // Fast autocomplete when service name is typed or selected from datalist
    const nameInput = tr.querySelector('.item-name');
    nameInput.addEventListener('change', () => {
      const val = nameInput.value.trim().toLowerCase();
      if (!val) return;
      const matched = window.dpvStore.getServices().find(s => s.name.toLowerCase() === val);
      if (matched) {
        const descInput = tr.querySelector('.item-desc');
        const rateInput = tr.querySelector('.item-rate');
        if (descInput && !descInput.value) descInput.value = matched.description || '';
        if (rateInput && (!parseFloat(rateInput.value) || parseFloat(rateInput.value) === 0)) {
          rateInput.value = matched.rate || 0;
          this.updateItemRowAmount(tr);
          this.updateFormCalculations();
        }
      }
    });

    // Recalculate row amount on inputs
    const inputs = tr.querySelectorAll('.item-rate, .item-qty, .item-discount');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        this.updateItemRowAmount(tr);
        this.updateFormCalculations();
      });
    });

    tr.querySelector('.remove-item-btn').addEventListener('click', () => {
      tr.remove();
      this.updateFormCalculations();
    });

    tbody.appendChild(tr);
    this.updateItemRowAmount(tr);
    this.updateFormCalculations();
    if (window.lucide) window.lucide.createIcons();
  }

  updateItemRowAmount(tr) {
    const rate = parseFloat(tr.querySelector('.item-rate').value) || 0;
    const qty = parseFloat(tr.querySelector('.item-qty').value) || 1;
    const discount = parseFloat(tr.querySelector('.item-discount').value) || 0;
    const amount = Math.max(0, (rate * qty) - discount);
    tr.querySelector('.item-amount-val').textContent = `₹${amount.toLocaleString('en-IN')}`;
    return amount;
  }

  handlePackageSelection(pkgId) {
    if (!pkgId) return;
    const pkg = window.dpvStore.getPackages().find(p => p.id === pkgId);
    if (!pkg) return;

    if (confirm(`Apply package "${pkg.name}"? This will add its services to the invoice.`)) {
      const allServices = window.dpvStore.getServices();
      const tbody = document.getElementById('invoice-items-builder-tbody');
      tbody.innerHTML = ''; // Fresh items for chosen package

      if (pkg.serviceIds && pkg.serviceIds.length) {
        pkg.serviceIds.forEach(srvId => {
          const srv = allServices.find(s => s.id === srvId);
          if (srv) {
            this.addServiceItemRow({
              name: srv.name,
              description: srv.description,
              rate: srv.rate,
              qty: 1
            });
          }
        });
      } else {
        this.addServiceItemRow({
          name: pkg.name,
          description: pkg.description,
          rate: pkg.price,
          qty: 1
        });
      }

      this.updateFormCalculations();
      this.showToast(`Applied package: ${pkg.name}`, 'info');
    }
  }

  // Payment Rows in Form (Master Requirement #5: Dynamic Ordinals, strictly NO hardcoded percentages)
  addPaymentRow(data = {}) {
    const container = document.getElementById('payments-builder-container');
    if (!container) return;

    const count = container.children.length + 1;
    const defaultOrdinal = window.dpvStore.getPaymentOrdinal(count);
    let paymentTitle = (data.type || defaultOrdinal).replace(/\s*\(\s*\d+%\s*\)/gi, '').replace(/\s*\b\d+%\b/g, '').trim();
    if (paymentTitle.toLowerCase() === 'advance' || paymentTitle.toLowerCase() === 'advance paid') {
      paymentTitle = 'First Payment (Advance)';
    } else if (paymentTitle.toLowerCase() === '2nd payment') {
      paymentTitle = 'Second Payment';
    }

    const row = document.createElement('div');
    row.className = 'shoot-date-card';
    row.style.padding = '12px';
    row.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 12px; color: var(--primary);" class="payment-ordinal-lbl">Payment ${count}: ${escapeHtml(paymentTitle)}</span>
        <button type="button" class="btn btn-outline btn-sm remove-pay-btn" style="color: var(--danger); border: none; padding: 2px 6px;">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Payment Installment Label</label>
          <input type="text" class="form-control form-pay-type" value="${escapeHtml(paymentTitle)}" placeholder="e.g. First Payment (Advance), Haldi Installment">
        </div>
        <div class="form-group">
          <label class="form-label">Amount Paid (₹) <span class="required">*</span></label>
          <input type="number" class="form-control form-pay-amount" inputmode="numeric" value="${data.amount || 0}" min="0" step="500">
        </div>
        <div class="form-group">
          <label class="form-label">Payment Date</label>
          <input type="date" class="form-control form-pay-date" value="${data.date || new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Method</label>
          <select class="form-control form-pay-method">
            <option value="UPI" ${data.method === 'UPI' ? 'selected' : ''}>UPI</option>
            <option value="Cash" ${data.method === 'Cash' ? 'selected' : ''}>Cash</option>
            <option value="Bank Transfer" ${data.method === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
            <option value="Card" ${data.method === 'Card' ? 'selected' : ''}>Card</option>
            <option value="Cheque" ${data.method === 'Cheque' ? 'selected' : ''}>Cheque</option>
            <option value="Other" ${data.method === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">Reference ID / UTR / Transaction No.</label>
          <input type="text" class="form-control form-pay-ref" value="${escapeHtml(data.reference || '')}" placeholder="UPI / Bank transaction reference">
        </div>
      </div>
    `;

    row.querySelector('.remove-pay-btn').addEventListener('click', () => {
      row.remove();
      this.renumberPaymentRows();
      this.updateFormCalculations();
    });

    row.querySelector('.form-pay-amount').addEventListener('input', () => {
      this.updateFormCalculations();
    });

    row.querySelector('.form-pay-type').addEventListener('input', (e) => {
      const idx = Array.from(container.children).indexOf(row) + 1;
      row.querySelector('.payment-ordinal-lbl').textContent = `Payment ${idx}: ${e.target.value || 'Payment'}`;
    });

    container.appendChild(row);
    this.updateFormCalculations();
    if (window.lucide) window.lucide.createIcons();
  }

  renumberPaymentRows() {
    const container = document.getElementById('payments-builder-container');
    if (!container) return;
    Array.from(container.children).forEach((row, idx) => {
      const num = idx + 1;
      const typeInput = row.querySelector('.form-pay-type');
      const lbl = row.querySelector('.payment-ordinal-lbl');
      if (lbl) {
        lbl.textContent = `Payment ${num}: ${typeInput?.value || window.dpvStore.getPaymentOrdinal(num)}`;
      }
    });
  }

  // Update Calculations in Form
  updateFormCalculations() {
    let subtotal = 0;
    const itemsRows = document.querySelectorAll('#invoice-items-builder-tbody tr');
    itemsRows.forEach(tr => {
      const rate = parseFloat(tr.querySelector('.item-rate')?.value) || 0;
      const qty = parseFloat(tr.querySelector('.item-qty')?.value) || 1;
      const discount = parseFloat(tr.querySelector('.item-discount')?.value) || 0;
      subtotal += Math.max(0, (rate * qty) - discount);
    });

    const overallDiscount = parseFloat(document.getElementById('builder-overall-discount')?.value) || 0;
    const afterDiscount = Math.max(0, subtotal - overallDiscount);

    const enableGst = document.getElementById('builder-enable-gst')?.checked;
    const gstAmount = enableGst ? Math.round(afterDiscount * 0.18) : 0;
    const grandTotal = afterDiscount + gstAmount;

    // Payments tally & per-row running balance
    let cumulativePaid = 0;
    const paymentCards = document.querySelectorAll('#payments-builder-container .shoot-date-card');
    paymentCards.forEach((card, idx) => {
      const amtInput = card.querySelector('.form-pay-amount');
      const typeInput = card.querySelector('.form-pay-type');
      const amt = parseFloat(amtInput?.value) || 0;
      cumulativePaid += amt;
      const runningBalance = Math.max(0, grandTotal - cumulativePaid);

      // Running balance badge inside each card
      let balBadge = card.querySelector('.payment-card-running-balance');
      if (!balBadge) {
        balBadge = document.createElement('div');
        balBadge.className = 'payment-card-running-balance';
        card.appendChild(balBadge);
      }
      const isPaidOff = (runningBalance === 0 && grandTotal > 0 && cumulativePaid >= grandTotal);
      balBadge.style.cssText = "margin-top: 10px; padding: 7px 12px; background: rgba(30, 58, 138, 0.05); border-radius: var(--radius-sm); font-size: 11.5px; display: flex; justify-content: space-between; align-items: center; border: 1px dashed rgba(30, 58, 138, 0.2);";
      balBadge.innerHTML = `
        <span style="color: var(--text-muted);"><i data-lucide="calculator" style="width: 12px; height: 12px; display: inline; vertical-align: middle;"></i> Remaining Balance after this payment:</span>
        <strong style="color: ${isPaidOff ? 'var(--success)' : 'var(--danger)'};">₹${runningBalance.toLocaleString('en-IN')}${isPaidOff ? ' (Fully Paid)' : ''}</strong>
      `;

      // Auto-label final payment if balance reaches 0
      if (isPaidOff && (!typeInput.value || typeInput.value.includes('Payment ') || typeInput.value.includes('Installment') || typeInput.value.includes('Advance'))) {
        if (idx > 0) {
          typeInput.value = 'Final Payment';
          const lbl = card.querySelector('.payment-ordinal-lbl');
          if (lbl) lbl.textContent = `Payment ${idx + 1}: Final Payment`;
        }
      }
    });

    const totalPaid = cumulativePaid;
    const balanceDue = Math.max(0, grandTotal - totalPaid);

    // Update UI elements
    document.getElementById('builder-subtotal-val').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    document.getElementById('builder-gst-val').textContent = `+₹${gstAmount.toLocaleString('en-IN')}`;
    document.getElementById('builder-grand-total-val').textContent = `₹${grandTotal.toLocaleString('en-IN')}`;

    document.getElementById('payment-summary-grand').textContent = `₹${grandTotal.toLocaleString('en-IN')}`;
    document.getElementById('payment-summary-paid').textContent = `₹${totalPaid.toLocaleString('en-IN')}`;
    document.getElementById('payment-summary-balance').textContent = `₹${balanceDue.toLocaleString('en-IN')}`;

    let statusHtml = '<span class="status-pill status-pending">PENDING</span>';
    if (balanceDue === 0 && grandTotal > 0) {
      statusHtml = '<span class="status-pill status-paid">PAID / FULLY PAID</span>';
    } else if (totalPaid > 0) {
      statusHtml = '<span class="status-pill status-partial">PARTIALLY PAID</span>';
    }
    document.getElementById('payment-summary-status').innerHTML = statusHtml;
  }

  // Terms Checklist in Form
  renderFormTermsSelector() {
    const container = document.getElementById('terms-selector-list');
    if (!container) return;
    const terms = window.dpvStore.getTerms().filter(t => t.active);

    container.innerHTML = terms.map((t, idx) => `
      <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 12px; color: var(--text-main); cursor: pointer; background: var(--bg-main); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <input type="checkbox" class="term-checkbox" value="${escapeHtml(t.text)}" checked style="margin-top: 3px; accent-color: var(--primary);">
        <div style="flex: 1;">
          <div style="font-weight: 700; color: var(--primary); margin-bottom: 3px;">${idx + 1}. ${escapeHtml(t.title || `Condition ${idx + 1}`)}</div>
          <div style="font-size: 11.5px; line-height: 1.45; color: var(--text-muted);">${escapeHtml(t.text)}</div>
        </div>
      </label>
    `).join('');
  }

  // Compile Form Data into Invoice Object
  compileInvoiceFromForm() {
    const existingId = document.getElementById('inv-form-id').value;
    const status = document.getElementById('inv-form-status').value || 'draft';
    const documentType = this.currentDocumentType || (document.getElementById('btn-doc-type-quotation')?.classList.contains('active') ? 'quotation' : 'invoice');

    // 1. Customer (with altPhone and notes support)
    const customer = {
      name: document.getElementById('cust-name-input').value.trim(),
      relationName: document.getElementById('cust-relation-input')?.value.trim() || '',
      phone: document.getElementById('cust-phone-input').value.trim(),
      altPhone: document.getElementById('cust-alt-phone-input')?.value.trim() || document.getElementById('cust-altphone-input')?.value.trim() || '',
      whatsapp: document.getElementById('cust-whatsapp-input').value.trim() || document.getElementById('cust-phone-input').value.trim(),
      email: document.getElementById('cust-email-input').value.trim(),
      address: document.getElementById('cust-address-input').value.trim(),
      city: document.getElementById('cust-city-input').value.trim() || 'Balod',
      state: document.getElementById('cust-state-input').value.trim() || 'Chhattisgarh',
      pincode: document.getElementById('cust-pincode-input').value.trim(),
      notes: document.getElementById('cust-notes-input')?.value.trim() || ''
    };

    // 2. Event
    const event = {
      type: document.getElementById('event-type-select').value,
      venue: document.getElementById('event-venue-input').value.trim(),
      location: document.getElementById('event-location-input').value.trim(),
      notes: document.getElementById('event-notes-input').value.trim()
    };

    // 3. Shooting Dates (with assigned services per date)
    const shootingDates = [];
    document.querySelectorAll('#shoot-dates-container .shoot-date-card').forEach((card, index) => {
      const evName = card.querySelector('.shoot-event-name')?.value.trim();
      const dt = card.querySelector('.shoot-date-val')?.value;
      if (evName && dt) {
        const assignedServices = [];
        // Extract services from the card's .event-services-list-container
        card.querySelectorAll('.event-service-item-row').forEach(row => {
          const sName = row.querySelector('.ev-srv-name')?.value.trim();
          if (sName) {
            assignedServices.push({
              name: sName,
              timings: row.querySelector('.ev-srv-time')?.value.trim() || '',
              notes: row.querySelector('.ev-srv-notes')?.value.trim() || '',
              qty: 1
            });
          }
        });

        // Fallback: if user only clicked pills and didn't customize rows, also include selected pills
        card.querySelectorAll('.shoot-service-pill.selected').forEach(pill => {
          const sName = pill.dataset.service;
          if (sName && !assignedServices.some(s => s.name === sName)) {
            assignedServices.push({
              name: sName,
              timings: card.querySelector('.shoot-timings')?.value.trim() || '',
              notes: '',
              qty: 1
            });
          }
        });

        shootingDates.push({
          id: `sd_${index + 1}`,
          dayNumber: index + 1,
          date: dt,
          dayName: new Date(dt).toLocaleDateString('en-US', { weekday: 'long' }),
          eventName: evName,
          timings: card.querySelector('.shoot-timings')?.value.trim() || '',
          venue: card.querySelector('.shoot-venue')?.value.trim() || event.venue,
          location: card.querySelector('.shoot-location')?.value.trim() || event.location,
          services: assignedServices,
          notes: card.querySelector('.shoot-notes')?.value.trim() || ''
        });
      }
    });

    // 3b. Photo Albums Specification (Requirement #7, #8)
    const albums = [];
    document.querySelectorAll('#albums-builder-container .album-builder-card').forEach((card, index) => {
      const type = card.querySelector('.album-type-input')?.value.trim();
      if (type) {
        albums.push({
          id: `alb_${index + 1}`,
          type: type,
          sheets: card.querySelector('.album-sheets-input')?.value.trim() || '30 Sheets',
          size: card.querySelector('.album-size-input')?.value.trim() || '12 × 18 inch',
          qty: parseInt(card.querySelector('.album-qty-input')?.value, 10) || 1,
          notes: card.querySelector('.album-notes-input')?.value.trim() || ''
        });
      }
    });

    // 3c. Deliverables & Special Items (Requirement #9, #10, #12)
    const deliverables = [];
    document.querySelectorAll('#deliverables-builder-container .deliv-builder-card').forEach((card, index) => {
      const name = card.querySelector('.deliv-name-input')?.value.trim();
      if (name) {
        deliverables.push({
          id: `del_${index + 1}`,
          name: name,
          type: card.querySelector('.deliv-type-input')?.value.trim() || '',
          size: card.querySelector('.deliv-size-input')?.value.trim() || '',
          qty: parseInt(card.querySelector('.deliv-qty-input')?.value, 10) || 1,
          notes: card.querySelector('.deliv-notes-input')?.value.trim() || ''
        });
      }
    });

    // 4. Items
    const items = [];
    document.querySelectorAll('#invoice-items-builder-tbody tr').forEach((tr, index) => {
      const name = tr.querySelector('.item-name')?.value.trim();
      if (name) {
        items.push({
          id: `item_${index + 1}`,
          name: name,
          description: tr.querySelector('.item-desc')?.value.trim() || '',
          rate: parseFloat(tr.querySelector('.item-rate')?.value) || 0,
          qty: parseFloat(tr.querySelector('.item-qty')?.value) || 1,
          discount: parseFloat(tr.querySelector('.item-discount')?.value) || 0
        });
      }
    });

    // 5. Payments (Quotations do NOT include payment history)
    const payments = [];
    if (documentType !== 'quotation') {
      document.querySelectorAll('#payments-builder-container .shoot-date-card').forEach((card, index) => {
        const amt = parseFloat(card.querySelector('.form-pay-amount')?.value) || 0;
        if (amt > 0) {
          payments.push({
            id: `pay_${Date.now()}_${index}`,
            type: card.querySelector('.form-pay-type')?.value || window.dpvStore.getPaymentOrdinal(index + 1),
            amount: amt,
            date: card.querySelector('.form-pay-date')?.value || new Date().toISOString().split('T')[0],
            method: card.querySelector('.form-pay-method')?.value || 'UPI',
            reference: card.querySelector('.form-pay-ref')?.value.trim() || ''
          });
        }
      });
    }

    // 6. Terms
    const selectedTerms = [];
    document.querySelectorAll('.term-checkbox:checked').forEach(cb => {
      selectedTerms.push(cb.value);
    });

    const billingDate = document.getElementById('inv-billing-date-input')?.value || new Date().toISOString().split('T')[0];
    const overallDiscount = parseFloat(document.getElementById('builder-overall-discount')?.value) || 0;
    const enableGst = !!document.getElementById('builder-enable-gst')?.checked;

    const existing = existingId ? window.dpvStore.getInvoiceById(existingId) : null;
    const createdAt = existing ? existing.createdAt : new Date().toISOString();

    return window.dpvInvoiceEngine.buildInvoiceObject({
      id: existingId || null,
      documentType,
      invoiceDate: billingDate,
      status,
      customer,
      event,
      shootingDates,
      albums,
      deliverables,
      items,
      payments,
      selectedTerms,
      options: { overallDiscount, enableGst, gstRate: 18 },
      createdAt,
      isOfflineDraft: true
    });
  }

  // Save Invoice Directly from Form
  saveInvoiceFromForm(silent = false) {
    try {
      const invoice = this.compileInvoiceFromForm();
      const validation = window.dpvInvoiceEngine.validateInvoiceData(invoice);
      if (!validation.isValid) {
        this.showToast(validation.errors.join(' | '), 'error');
        return null;
      }

      const saved = window.dpvStore.saveInvoice(invoice);
      this.activeInvoice = saved;

      const formIdInput = document.getElementById('inv-form-id');
      if (formIdInput && saved.id) {
        formIdInput.value = saved.id;
      }

      if (!silent) {
        const typeLabel = (saved.documentType === 'quotation') ? 'Quotation' : 'Invoice';
        this.showToast(`${typeLabel} ${saved.invoiceNumber} saved successfully!`, 'success');
      }
      this.renderInvoicesTable();
      return saved;
    } catch (err) {
      this.showToast(err.message, 'error');
      return null;
    }
  }

  saveAndExitInvoice() {
    const saved = this.saveInvoiceFromForm();
    if (saved) {
      this.navigateTo('view-invoices');
      this.renderInvoicesTable();
    }
  }

  // Preview Built Invoice
  previewBuiltInvoice() {
    try {
      const saved = this.saveInvoiceFromForm(true);
      if (!saved) return;

      this.activeInvoice = saved;
      this.previewSourceView = 'view-new-invoice';

      this.renderInvoiceSheet(this.activeInvoice);
      this.navigateTo('view-invoice-preview');
      this.autoAdjustPreviewScale();
      const typeLabel = (this.activeInvoice.documentType === 'quotation') ? 'Quotation' : 'Bill';
      this.showToast(`${typeLabel} ${this.activeInvoice.invoiceNumber} saved & ready for Preview / Print`, "success");
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // Open Preview for Existing Invoice
  openInvoicePreview(invoiceId) {
    const inv = window.dpvStore.getInvoiceById(invoiceId);
    if (!inv) {
      this.showToast("Invoice not found or has been deleted", "error");
      this.navigateTo('view-invoices');
      this.renderInvoicesTable();
      return;
    }
    this.previewSourceView = 'view-invoices';
    this.activeInvoice = inv;
    this.renderInvoiceSheet(inv);
    this.navigateTo('view-invoice-preview');
    this.autoAdjustPreviewScale();
  }

  autoAdjustPreviewScale() {
    const container = document.querySelector('.invoice-page-container');
    if (!container) return;
    if (window.innerWidth <= 860) {
      container.classList.add('fit-screen');
    } else {
      container.classList.remove('fit-screen');
    }
    this.applyPreviewScale();
  }

  applyPreviewScale() {
    const container = document.querySelector('.invoice-page-container');
    const sheet = document.getElementById('invoice-sheet');
    const btnText = document.getElementById('fit-screen-btn-text');
    const icon = document.querySelector('#preview-fit-screen-btn i');
    if (!container || !sheet) return;

    const isFit = container.classList.contains('fit-screen');
    if (isFit && window.innerWidth <= 860) {
      const containerWidth = container.clientWidth || window.innerWidth;
      // Leave 12px breathing room on phone screens
      const targetWidth = Math.max(260, containerWidth - 12);
      const sheetWidth = sheet.offsetWidth || 794;
      const scale = targetWidth / sheetWidth;

      sheet.style.transformOrigin = 'top center';
      sheet.style.transform = `scale(${scale.toFixed(4)})`;

      const sheetHeight = sheet.offsetHeight || 1123;
      const collapsedMargin = Math.round(sheetHeight * (1 - scale));
      sheet.style.marginBottom = `-${collapsedMargin}px`;

      if (btnText) btnText.textContent = 'Actual Size';
      if (icon) icon.setAttribute('data-lucide', 'zoom-in');
    } else {
      sheet.style.transformOrigin = '';
      sheet.style.transform = '';
      sheet.style.marginBottom = '';
      if (btnText) btnText.textContent = 'Fit Screen';
      if (icon) icon.setAttribute('data-lucide', 'smartphone');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // Render the A4 Sheet DOM Element (Matching Luxury Reference Bill)
  renderInvoiceSheet(inv) {
    const snap = inv.businessSnapshot || window.dpvStore.getSettings();
    const cust = inv.customer || {};
    const ev = inv.event || {};
    const fin = inv.financials || {};
    const isQuotation = (inv.documentType === 'quotation');

    // Live Dynamic Header Typography & Branding
    const hdrLogo = document.getElementById('inv-header-logo-img');
    if (hdrLogo) hdrLogo.src = snap.logoUrl || 'assets/dpv-official-logo.png';

    const setElText = (id, val, fallback) => {
      const el = document.getElementById(id);
      if (el) el.textContent = (val !== undefined && val !== null && val !== '') ? val : fallback;
    };

    setElText('inv-header-studio-name', snap.studioName, 'DEWANGAN PHOTO & VIDEOGRAPHY');
    setElText('inv-header-studio-tagline', snap.headerTagline, 'CAPTURE YOUR SPECIAL MOMENTS');
    setElText('inv-header-memories-title', snap.headerMemoriesTitle, 'Memories');
    setElText('inv-header-memories-sub', snap.headerMemoriesSub, 'THAT LAST FOREVER');
    setElText('inv-header-srv1', snap.headerServices1, 'Wedding | Pre-Wedding | Engagement');
    setElText('inv-header-srv2', snap.headerServices2, 'Birthday | Anniversary | Maternity Shoot');
    setElText('inv-header-srv3', snap.headerServices3, 'Album Design & Printing | Photo Printing');
    setElText('inv-header-address', snap.address, 'Shivpuri, Jamul, Durg (C.G.)');
    setElText('inv-header-phone', snap.mobile, '+91 93016 14549');
    setElText('inv-header-instagram', snap.instagram, 'dewangan_photo_and_videography');
    setElText('inv-header-website', snap.website, 'www.dewanganphotoandvideography.in');
    setElText('inv-header-quote', snap.headerQuote, '"Stories Through Our Lens"');

    // Live Dynamic Footer Typography
    setElText('inv-footer-address', snap.address, 'Shivpuri, Jamul, Durg (C.G.)');
    setElText('inv-footer-phone', snap.mobile, '+91 93016 14549');
    setElText('inv-footer-instagram', snap.instagram, 'dewangan_photo_and_videography');
    setElText('inv-footer-website', snap.website, 'www.dewanganphotoandvideography.in');
    setElText('inv-footer-tagline-top', snap.footerTaglineTop || 'Capture', 'Capture');
    const botTagEl = document.getElementById('inv-footer-tagline-bottom');
    if (botTagEl) botTagEl.innerHTML = `${escapeHtml(snap.footerTaglineBottom || 'Your Moments')} <span class="inv-footer-heart">♡</span>`;

    // Document Meta
    document.getElementById('inv-doc-number').textContent = inv.invoiceNumber;
    
    // Format date as DD / MM / YYYY
    const d = new Date(inv.invoiceDate);
    const dateFormatted = !isNaN(d.getTime()) 
      ? `${String(d.getDate()).padStart(2, '0')} / ${String(d.getMonth() + 1).padStart(2, '0')} / ${d.getFullYear()}`
      : inv.invoiceDate;
    document.getElementById('inv-doc-date').textContent = dateFormatted;

    // Document Type Pill & Label
    const docTypePill = document.getElementById('inv-doc-type-pill');
    if (docTypePill) {
      docTypePill.textContent = isQuotation ? 'ESTIMATE / QUOTATION' : 'TAX INVOICE';
      if (isQuotation) docTypePill.classList.add('quotation-badge');
      else docTypePill.classList.remove('quotation-badge');
    }
    const docLabel = document.getElementById('inv-doc-label');
    if (docLabel) {
      docLabel.textContent = isQuotation ? 'QUOTATION NO.' : 'INVOICE NO.';
    }

    // Action bar indicators
    const topStatus = document.getElementById('preview-status-pill');
    if (topStatus) {
      if (isQuotation) {
        topStatus.className = 'status-pill status-quotation';
        topStatus.textContent = 'PROPOSED QUOTATION';
      } else {
        topStatus.className = `status-pill status-${inv.paymentStatus.toLowerCase().replace(/\s+/g, '-')}`;
        topStatus.textContent = inv.paymentStatus;
      }
    }
    const heading = document.getElementById('preview-invoice-heading');
    if (heading) {
      heading.textContent = isQuotation 
        ? `Quotation: ${inv.invoiceNumber} (${inv.status.toUpperCase()})` 
        : `Invoice: ${inv.invoiceNumber} (${inv.status.toUpperCase()})`;
    }

    const finalizeBtn = document.getElementById('preview-finalize-btn');
    const editBtn = document.getElementById('preview-edit-btn');
    const convertBtn = document.getElementById('preview-convert-invoice-btn');

    if (isQuotation) {
      if (convertBtn) convertBtn.style.display = 'inline-flex';
      if (finalizeBtn) finalizeBtn.style.display = 'none';
      if (editBtn) editBtn.textContent = 'Edit Quotation';
    } else {
      if (convertBtn) convertBtn.style.display = 'none';
      if (inv.status === 'finalized') {
        if (finalizeBtn) finalizeBtn.style.display = 'none';
        if (editBtn) {
          editBtn.textContent = 'Unlock & Revise';
          editBtn.classList.add('btn-outline');
        }
      } else {
        if (finalizeBtn) finalizeBtn.style.display = 'inline-flex';
        if (editBtn) {
          editBtn.textContent = 'Edit Draft';
          editBtn.classList.remove('btn-outline');
        }
      }
    }

    // Status stamp (PAID / PARTIAL / PENDING) - hide in quotation
    const statusStamp = document.getElementById('inv-status-stamp');
    if (statusStamp) {
      if (isQuotation) {
        statusStamp.style.display = 'none';
      } else {
        statusStamp.style.display = 'block';
        statusStamp.className = `inv-status-stamp ${inv.paymentStatus.toLowerCase().replace(/\s+/g, '-')}`;
        statusStamp.textContent = inv.paymentStatus;
      }
    }

    // Client Details
    document.getElementById('inv-client-name').textContent = cust.name || 'Client Name';
    const clientPhoneStr = cust.phone ? (cust.altPhone ? `${cust.phone} / ${cust.altPhone}` : cust.phone) : '';
    document.getElementById('inv-client-phone').textContent = clientPhoneStr;
    const addr = [cust.address, cust.city].filter(Boolean).join(', ') || 'Shivpuri, Jamul, Durg (C.G.)';
    document.getElementById('inv-client-address').textContent = addr;

    // Event Details
    document.getElementById('inv-event-type').textContent = ev.type || 'Wedding Shoot';
    
    // Event Date: check if shootingDates exists
    let evDateStr = dateFormatted;
    if (inv.shootingDates && inv.shootingDates.length > 0) {
      const firstSd = inv.shootingDates[0];
      if (firstSd.date) {
        const sdDate = new Date(firstSd.date);
        evDateStr = !isNaN(sdDate.getTime()) 
          ? `${String(sdDate.getDate()).padStart(2, '0')} / ${String(sdDate.getMonth() + 1).padStart(2, '0')} / ${sdDate.getFullYear()}`
          : firstSd.date;
        if (inv.shootingDates.length > 1) {
          evDateStr += ` (${inv.shootingDates.length} Days Shoot)`;
        }
      }
    }
    document.getElementById('inv-event-date').textContent = evDateStr;
    document.getElementById('inv-event-venue').textContent = ev.venue || 'Balod / Durg';

    // 1. Date-Wise Event Schedule Summary Table (Requirement #1, #2, #14)
    const scheduleSec = document.getElementById('inv-schedule-section');
    const scheduleTbody = document.getElementById('inv-schedule-table-tbody');
    const shootingDates = inv.shootingDates || [];

    if (scheduleSec && scheduleTbody) {
      if (shootingDates.length > 0) {
        scheduleSec.style.display = 'block';
        scheduleTbody.innerHTML = shootingDates.map((sd, idx) => {
          const sdDate = new Date(sd.date);
          const dateStr = !isNaN(sdDate.getTime())
            ? sdDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : (sd.date || '—');
          const timeStr = sd.timings || sd.session || '—';
          const venueStr = [sd.venue, sd.location].filter(Boolean).join(', ') || ev.venue || '—';

          return `
            <tr>
              <td><span class="sch-day-badge">Day ${sd.dayNumber || (idx + 1)}</span></td>
              <td class="sch-date-val">${dateStr}</td>
              <td class="sch-event-val">${escapeHtml(sd.eventName || sd.title || 'Shoot Event')}</td>
              <td>${escapeHtml(venueStr)}</td>
              <td class="sch-time-val">${escapeHtml(timeStr)}</td>
            </tr>
          `;
        }).join('');
      } else {
        scheduleSec.style.display = 'none';
      }
    }

    // 2. Services Assigned by Event Details (Requirement #3, #4, #5, #6, #14)
    const evServicesSec = document.getElementById('inv-event-services-section');
    const evServicesGrid = document.getElementById('inv-event-services-grid');

    if (evServicesSec && evServicesGrid) {
      if (shootingDates.length > 0) {
        evServicesSec.style.display = 'block';
        evServicesGrid.innerHTML = shootingDates.map((sd, idx) => {
          const sdDate = new Date(sd.date);
          const dateStr = !isNaN(sdDate.getTime())
            ? sdDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : (sd.date || '');
          const timeStr = sd.timings || sd.session || '';
          const venueStr = [sd.venue, sd.location].filter(Boolean).join(', ') || '';

          const services = Array.isArray(sd.services) ? sd.services : [];
          let servicesListHtml = '';

          if (services.length > 0) {
            servicesListHtml = `
              <div class="inv-day-service-list">
                ${services.map(s => {
                  const sName = typeof s === 'string' ? s : (s.name || '');
                  const sTime = typeof s === 'object' && s.timings ? s.timings : '';
                  const sNotes = typeof s === 'object' && s.notes ? s.notes : '';

                  return `
                    <div class="inv-service-item">
                      <span class="inv-service-item-bullet">•</span>
                      <span class="inv-service-item-name">${escapeHtml(sName)}</span>
                      ${sTime ? `<span class="inv-service-item-time">${escapeHtml(sTime)}</span>` : ''}
                      ${sNotes ? `<span class="inv-service-item-notes">(${escapeHtml(sNotes)})</span>` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          } else {
            servicesListHtml = `<div style="font-size: 8.5px; color: #94a3b8; font-style: italic;">Standard event coverage as per booked package.</div>`;
          }

          return `
            <div class="inv-day-service-card">
              <div class="inv-day-service-header">
                <span class="inv-day-service-title">
                  <strong>Day ${sd.dayNumber || (idx + 1)}:</strong> ${escapeHtml(sd.eventName || sd.title || 'Shoot Event')}
                </span>
                <span class="inv-day-service-meta">
                  <span><strong>Date:</strong> ${dateStr}</span>
                  ${timeStr ? `<span><strong>Coverage:</strong> ${escapeHtml(timeStr)}</span>` : ''}
                  ${venueStr ? `<span><strong>Venue:</strong> ${escapeHtml(venueStr)}</span>` : ''}
                </span>
              </div>
              ${servicesListHtml}
              ${sd.notes ? `<div style="font-size: 8px; color: #64748b; margin-top: 3px; font-style: italic;"><strong>Event Note:</strong> ${escapeHtml(sd.notes)}</div>` : ''}
            </div>
          `;
        }).join('');
      } else {
        evServicesSec.style.display = 'none';
      }
    }

    // 3. Photo Albums & Deliverables Section (Requirement #7, #8, #9, #10, #12)
    const delivSec = document.getElementById('inv-deliverables-section');
    const delivGrid = document.getElementById('inv-deliverables-grid');
    const albums = inv.albums || [];
    const deliverables = inv.deliverables || [];

    if (delivSec && delivGrid) {
      if (albums.length > 0 || deliverables.length > 0) {
        delivSec.style.display = 'block';
        let groupsHtml = '';

        if (albums.length > 0) {
          groupsHtml += `
            <div class="inv-deliv-group-card">
              <div class="inv-deliv-group-title">
                <i data-lucide="book"></i> <span>Photo Albums Specification</span>
              </div>
              <div class="inv-deliv-list">
                ${albums.map(alb => `
                  <div class="inv-deliv-item-row">
                    <div>
                      <span class="inv-deliv-item-main">${escapeHtml(alb.type || 'Photo Album')}</span>
                      <span class="inv-deliv-item-spec"> — ${escapeHtml(alb.sheets || '30 Sheets')} (${escapeHtml(alb.size || '12 × 18 inch')})</span>
                      ${alb.notes ? `<div style="font-size: 7.5px; color: #64748b; font-style: italic;">${escapeHtml(alb.notes)}</div>` : ''}
                    </div>
                    <span class="inv-deliv-item-qty">Qty: ${alb.qty || 1}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }

        if (deliverables.length > 0) {
          groupsHtml += `
            <div class="inv-deliv-group-card">
              <div class="inv-deliv-group-title">
                <i data-lucide="gift"></i> <span>Deliverables &amp; Special Items</span>
              </div>
              <div class="inv-deliv-list">
                ${deliverables.map(deliv => {
                  const specs = [deliv.type, deliv.size].filter(Boolean).join(' • ');
                  return `
                    <div class="inv-deliv-item-row">
                      <div>
                        <span class="inv-deliv-item-main">${escapeHtml(deliv.name)}</span>
                        ${specs ? `<span class="inv-deliv-item-spec"> — ${escapeHtml(specs)}</span>` : ''}
                        ${deliv.notes ? `<div style="font-size: 7.5px; color: #64748b; font-style: italic;">${escapeHtml(deliv.notes)}</div>` : ''}
                      </div>
                      <span class="inv-deliv-item-qty">Qty: ${deliv.qty || 1}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }

        delivGrid.innerHTML = groupsHtml;
        if (albums.length > 0 && deliverables.length === 0) {
          delivGrid.style.gridTemplateColumns = '1fr';
        } else if (albums.length === 0 && deliverables.length > 0) {
          delivGrid.style.gridTemplateColumns = '1fr';
        } else {
          delivGrid.style.gridTemplateColumns = '1fr 1fr';
        }
      } else {
        delivSec.style.display = 'none';
      }
    }

    // Items Table (Populate minimum rows to match official bill format cleanly)
    const itemsTbody = document.getElementById('inv-items-tbody');
    const items = inv.items || [];
    const minRows = (shootingDates.length > 2 || albums.length > 0 || deliverables.length > 0) ? Math.max(items.length, 5) : 8;
    const totalRowsCount = Math.max(items.length, minRows);
    let rowsHtml = '';

    for (let i = 0; i < totalRowsCount; i++) {
      if (i < items.length) {
        const it = items[i];
        let desc = escapeHtml(it.name);
        if (it.description) {
          desc += ` <span style="font-size: 9.5px; color: #64748b;">(${escapeHtml(it.description)})</span>`;
        }
        rowsHtml += `
          <tr>
            <td class="col-sno">${i + 1}</td>
            <td class="col-desc">${desc}</td>
            <td class="col-qty">${it.qty || 1}</td>
            <td class="col-rate">${(it.rate || 0).toLocaleString('en-IN')}</td>
            <td class="col-amount">${(it.amount || 0).toLocaleString('en-IN')}</td>
          </tr>
        `;
      } else {
        // Empty placeholder row
        rowsHtml += `
          <tr class="empty-row">
            <td class="col-sno">${i + 1}</td>
            <td class="col-desc">&nbsp;</td>
            <td class="col-qty"></td>
            <td class="col-rate"></td>
            <td class="col-amount"></td>
          </tr>
        `;
      }
    }
    itemsTbody.innerHTML = rowsHtml;

    // Payment Box vs Quotation Box
    const payBox = document.getElementById('inv-payment-box-container');
    const quotBox = document.getElementById('inv-quotation-box-container');
    const paidRow = document.getElementById('inv-summary-paid-row');
    const balanceRow = document.getElementById('inv-summary-balance-row');
    const grandLabel = document.getElementById('inv-summary-grand-label');

    if (isQuotation) {
      if (payBox) payBox.style.display = 'none';
      if (quotBox) {
        quotBox.style.display = 'block';
        const upiEl = document.getElementById('inv-quot-upi-val');
        if (upiEl) upiEl.textContent = snap.upiId || '9301614549@ybl';
      }
      if (paidRow) paidRow.style.display = 'none';
      if (balanceRow) balanceRow.style.display = 'none';
      if (grandLabel) grandLabel.textContent = 'Total Quotation Amount';
    } else {
      if (payBox) payBox.style.display = 'block';
      if (quotBox) quotBox.style.display = 'none';
      if (paidRow) paidRow.style.display = 'table-row';
      if (balanceRow) balanceRow.style.display = 'table-row';
      if (grandLabel) grandLabel.textContent = 'Total Amount';

      // Render Dynamic Payments History List
      const payHistoryList = document.getElementById('inv-payments-history-list');
      const payments = inv.payments || [];
      const grand = fin.grandTotal || 0;
      const pkgTotalEl = document.getElementById('inv-pay-package-total');
      if (pkgTotalEl) pkgTotalEl.textContent = grand.toLocaleString('en-IN');

      if (payHistoryList) {
        if (payments.length > 0) {
          let runningCum = 0;
          payHistoryList.innerHTML = payments.map((p, idx) => {
            const amt = Math.max(0, parseFloat(p.amount) || 0);
            runningCum += amt;
            const runningBal = (p.balanceAfter !== undefined) ? p.balanceAfter : Math.max(0, grand - runningCum);

            let ordinal = (p.type || '').replace(/\s*\(\s*\d+%\s*\)/gi, '').replace(/\s*\b\d+%\b/g, '').trim();
            if (ordinal.toLowerCase() === 'advance' || ordinal.toLowerCase() === 'advance paid') {
              ordinal = 'First Payment (Advance)';
            } else if (ordinal.toLowerCase() === '2nd payment') {
              ordinal = 'Second Payment';
            } else if (ordinal.toLowerCase() === '3rd payment') {
              ordinal = 'Third Payment';
            }

            if (!ordinal || ordinal.startsWith('Payment ') || ordinal.includes('Installment')) {
              if (runningBal === 0 && grand > 0 && idx === payments.length - 1) {
                ordinal = 'Final Payment';
              } else if (idx === 0) {
                ordinal = 'First Payment (Advance)';
              } else {
                ordinal = window.dpvStore.getPaymentOrdinal(idx + 1);
              }
            }

            const dt = p.date ? new Date(p.date) : null;
            const dateStr = (dt && !isNaN(dt.getTime()))
              ? `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
              : '';
            const metaParts = [p.method, dateStr, p.reference ? `Ref: ${p.reference}` : ''].filter(Boolean);
            const metaStr = metaParts.length > 0 ? `(${metaParts.join(' • ')})` : '';

            return `
              <div class="inv-pay-history-item" style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed rgba(212, 175, 55, 0.25); font-size: 9.5px;">
                <div class="inv-pay-history-label">
                  <strong style="color: #0f172a;">${idx + 1}. ${escapeHtml(ordinal)}</strong>
                  ${metaStr ? `<span class="inv-pay-history-meta" style="font-size: 8px; color: #64748b; margin-left: 4px;">${escapeHtml(metaStr)}</span>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="inv-pay-history-amount" style="font-weight: 700; color: #1e3a8a;">₹ ${amt.toLocaleString('en-IN')}</span>
                  <span style="font-size: 8px; font-weight: 700; color: ${runningBal === 0 ? '#15803d' : '#b45309'}; background: ${runningBal === 0 ? 'rgba(21, 128, 61, 0.08)' : 'rgba(217, 119, 6, 0.08)'}; padding: 1.5px 6px; border-radius: 3px; border: 1px solid ${runningBal === 0 ? 'rgba(21, 128, 61, 0.2)' : 'rgba(217, 119, 6, 0.2)'};">
                    Balance ₹ ${runningBal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            `;
          }).join('');
        } else {
          payHistoryList.innerHTML = `
            <div class="inv-pay-history-item" style="color: #64748b; font-style: italic; font-size: 9.5px;">
              <span>No advance received yet (Pending)</span>
              <span style="font-weight: 700;">Balance ₹ ${grand.toLocaleString('en-IN')}</span>
            </div>
          `;
        }
      }
    }

    // Financial Totals Table
    document.getElementById('inv-summary-subtotal').textContent = (fin.rawSubtotal || fin.grandTotal || 0).toLocaleString('en-IN');
    document.getElementById('inv-summary-discount').textContent = (fin.totalDiscount || 0).toLocaleString('en-IN');
    document.getElementById('inv-summary-grand').textContent = (fin.grandTotal || 0).toLocaleString('en-IN');
    document.getElementById('inv-summary-paid').textContent = (fin.totalPaid || 0).toLocaleString('en-IN');
    document.getElementById('inv-summary-balance').textContent = (fin.balanceDue || 0).toLocaleString('en-IN');

    // Terms & Conditions (2-Column Layout matching official reference)
    const termsContainer = document.getElementById('inv-terms-columns-container');
    if (termsContainer) {
      const selectedTerms = Array.isArray(inv.terms)
        ? inv.terms
        : (Array.isArray(inv.selectedTerms) ? inv.selectedTerms : window.dpvStore.getTerms().filter(t => t.active).map(t => t.text));

      if (selectedTerms.length === 0) {
        document.getElementById('inv-terms-box')?.classList.add('no-terms');
        termsContainer.innerHTML = '<div style="font-size: 8.5px; color: #64748b; font-style: italic; padding: 4px;">Standard studio terms & conditions apply as agreed.</div>';
      } else {
        document.getElementById('inv-terms-box')?.classList.remove('no-terms');
        const half = Math.ceil(selectedTerms.length / 2);
        let col1Html = '<div class="inv-terms-col">';
        let col2Html = '<div class="inv-terms-col">';

      selectedTerms.forEach((termText, index) => {
        const num = index + 1;
        const itemHtml = `
          <div class="inv-term-item">
            <div class="inv-term-badge">${num}</div>
            <div class="inv-term-content">
              <span>${escapeHtml(termText)}</span>
            </div>
          </div>
        `;
        if (index < half) col1Html += itemHtml;
        else col2Html += itemHtml;
      });

      col1Html += '</div>';
      col2Html += '</div>';
      termsContainer.innerHTML = col1Html + col2Html;
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

  // Finalize Invoice
  handleFinalizeInvoice() {
    if (!this.activeInvoice) return;
    if (confirm(`Finalize and lock invoice ${this.activeInvoice.invoiceNumber}? Once finalized, it will create an immutable studio snapshot.`)) {
      try {
        const saved = window.dpvInvoiceEngine.finalizeInvoice(this.activeInvoice);
        this.activeInvoice = saved;
        this.renderInvoiceSheet(saved);
        this.refreshAllData();
        this.showToast(`Invoice ${saved.invoiceNumber} finalized successfully!`, 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    }
  }

  // Edit Active Invoice
  handleEditActiveInvoice() {
    if (!this.activeInvoice) return;

    if (this.activeInvoice.status === 'finalized') {
      const reason = prompt("This invoice is finalized. Enter admin revision reason to unlock and edit:");
      if (!reason || !reason.trim()) {
        this.showToast("Edit cancelled. Reason is required to modify finalized invoices.", "info");
        return;
      }
      this.activeInvoice.isRevisionUnlock = true;
      this.activeInvoice.revisionReason = reason.trim();
    }

    this.startNewInvoice(this.activeInvoice);
  }

  // Duplicate Active Invoice
  handleDuplicateActiveInvoice() {
    if (!this.activeInvoice) return;
    this.duplicateInvoice(this.activeInvoice.id);
  }

  // Download PDF
  async handleDownloadPdf() {
    const sheet = document.getElementById('invoice-sheet');
    const container = document.querySelector('.invoice-page-container');
    if (!sheet || !this.activeInvoice) return;

    this.showToast("Generating high-definition A4 PDF...", "info");
    const prevTransform = sheet.style.transform;
    const prevOrigin = sheet.style.transformOrigin;
    const prevMargin = sheet.style.marginBottom;
    const wasFit = container && container.classList.contains('fit-screen');
    if (wasFit) container.classList.remove('fit-screen');
    sheet.style.transform = 'none';
    sheet.style.transformOrigin = '';
    sheet.style.marginBottom = '';

    try {
      await window.dpvPdfGenerator.generatePdf(sheet, this.activeInvoice.invoiceNumber, true);
      this.showToast("PDF downloaded successfully!", "success");
    } catch (e) {
      this.showToast("PDF generation failed, opening print dialog...", "error");
    } finally {
      if (wasFit && container) container.classList.add('fit-screen');
      sheet.style.transform = prevTransform;
      sheet.style.transformOrigin = prevOrigin;
      sheet.style.marginBottom = prevMargin;
    }
  }

  // Print
  handlePrint() {
    const sheet = document.getElementById('invoice-sheet');
    const container = document.querySelector('.invoice-page-container');
    const prevTransform = sheet ? sheet.style.transform : '';
    const prevOrigin = sheet ? sheet.style.transformOrigin : '';
    const prevMargin = sheet ? sheet.style.marginBottom : '';
    const wasFit = container && container.classList.contains('fit-screen');
    if (wasFit) container.classList.remove('fit-screen');
    if (sheet) {
      sheet.style.transform = 'none';
      sheet.style.transformOrigin = '';
      sheet.style.marginBottom = '';
    }

    window.print();

    setTimeout(() => {
      if (wasFit && container) container.classList.add('fit-screen');
      if (sheet) {
        sheet.style.transform = prevTransform;
        sheet.style.transformOrigin = prevOrigin;
        sheet.style.marginBottom = prevMargin;
      }
    }, 500);
  }

  // WhatsApp Share
  async handleWhatsAppShare() {
    if (!this.activeInvoice) return;
    const sheet = document.getElementById('invoice-sheet');
    const container = document.querySelector('.invoice-page-container');
    this.showToast("Opening WhatsApp share...", "info");

    const prevTransform = sheet ? sheet.style.transform : '';
    const prevOrigin = sheet ? sheet.style.transformOrigin : '';
    const prevMargin = sheet ? sheet.style.marginBottom : '';
    const wasFit = container && container.classList.contains('fit-screen');
    if (wasFit) container.classList.remove('fit-screen');
    if (sheet) {
      sheet.style.transform = 'none';
      sheet.style.transformOrigin = '';
      sheet.style.marginBottom = '';
    }

    try {
      let pdfBlob = null;
      if (typeof html2pdf !== 'undefined' && sheet) {
        pdfBlob = await window.dpvPdfGenerator.generatePdf(sheet, this.activeInvoice.invoiceNumber, false);
      }
      await window.dpvPdfGenerator.shareInvoice(this.activeInvoice, pdfBlob);
    } catch (e) {
      console.warn("Share fallback:", e);
      window.dpvPdfGenerator.shareInvoice(this.activeInvoice, null);
    } finally {
      if (wasFit && container) container.classList.add('fit-screen');
      if (sheet) {
        sheet.style.transform = prevTransform;
        sheet.style.transformOrigin = prevOrigin;
        sheet.style.marginBottom = prevMargin;
      }
    }
  }

  // Back from preview
  backFromPreview() {
    if (this.currentView === 'view-invoice-preview') {
      if (this.activeInvoice && !window.dpvStore.isInvoiceDeleted(this.activeInvoice.id)) {
        // Guarantee invoice is permanently saved and preserved in store
        window.dpvStore.saveInvoice(this.activeInvoice);
        this.populateInvoiceForm(this.activeInvoice);
      }
      this.refreshAllData();
      this.navigateTo('view-invoices');
      this.renderInvoicesTable();
    }
  }

  // Populate Invoice Form from Existing Invoice
  populateInvoiceForm(inv) {
    document.getElementById('inv-form-id').value = inv.id;
    document.getElementById('inv-form-status').value = inv.status;
    document.getElementById('inv-billing-date-input').value = inv.invoiceDate;

    // Document Type
    this.setDocumentType(inv.documentType || 'invoice');

    // Customer
    const cust = inv.customer || {};
    document.getElementById('cust-name-input').value = cust.name || '';
    if (document.getElementById('cust-relation-input')) document.getElementById('cust-relation-input').value = cust.relationName || '';
    document.getElementById('cust-phone-input').value = cust.phone || '';
    if (document.getElementById('cust-alt-phone-input')) document.getElementById('cust-alt-phone-input').value = cust.altPhone || '';
    if (document.getElementById('cust-altphone-input')) document.getElementById('cust-altphone-input').value = cust.altPhone || '';
    document.getElementById('cust-whatsapp-input').value = cust.whatsapp || cust.phone || '';
    document.getElementById('cust-email-input').value = cust.email || '';
    document.getElementById('cust-address-input').value = cust.address || '';
    document.getElementById('cust-city-input').value = cust.city || '';
    document.getElementById('cust-state-input').value = cust.state || 'Chhattisgarh';
    document.getElementById('cust-pincode-input').value = cust.pincode || '';
    if (document.getElementById('cust-notes-input')) document.getElementById('cust-notes-input').value = cust.notes || '';

    // Event
    const ev = inv.event || {};
    document.getElementById('event-type-select').value = ev.type || 'Wedding';
    document.getElementById('event-venue-input').value = ev.venue || '';
    document.getElementById('event-location-input').value = ev.location || '';
    document.getElementById('event-notes-input').value = ev.notes || '';

    // Shoots
    const shootDatesContainer = document.getElementById('shoot-dates-container');
    shootDatesContainer.innerHTML = '';
    (inv.shootingDates || []).forEach(sd => {
      this.addShootDateRow(sd);
    });

    // Photo Albums Specification (Requirement #7, #8)
    const albumsContainer = document.getElementById('albums-builder-container');
    if (albumsContainer) {
      albumsContainer.innerHTML = '';
      (inv.albums || []).forEach(alb => {
        this.addAlbumRow(alb);
      });
    }

    // Deliverables & Special Items (Requirement #9, #10, #12)
    const deliverablesContainer = document.getElementById('deliverables-builder-container');
    if (deliverablesContainer) {
      deliverablesContainer.innerHTML = '';
      (inv.deliverables || []).forEach(deliv => {
        this.addDeliverableRow(deliv);
      });
    }

    // Items
    const itemsTbody = document.getElementById('invoice-items-builder-tbody');
    itemsTbody.innerHTML = '';
    (inv.items || []).forEach(it => {
      this.addServiceItemRow(it);
    });

    // Financials
    const fin = inv.financials || {};
    document.getElementById('builder-overall-discount').value = fin.overallDiscount || 0;
    document.getElementById('builder-enable-gst').checked = !!fin.enableGst;

    // Payments
    const payContainer = document.getElementById('payments-builder-container');
    payContainer.innerHTML = '';
    (inv.payments || []).forEach(p => {
      this.addPaymentRow(p);
    });

    this.updateFormCalculations();
  }

  // Convert Quotation to Confirmed Invoice (Master Requirement #6)
  convertActiveQuotationToInvoice() {
    if (!this.activeInvoice) return;
    this.convertQuotation(this.activeInvoice.id);
  }

  convertQuotation(quotationId) {
    const quot = window.dpvStore.getInvoiceById(quotationId);
    if (!quot) return;
    if (quot.documentType !== 'quotation') {
      this.showToast("This document is already an official invoice.", "info");
      return;
    }

    if (confirm(`Convert Quotation ${quot.invoiceNumber} to a Confirmed Tax Invoice?\n\nThis will assign a new official Invoice Number, record the invoice in the studio ledger, and enable payment tracking.`)) {
      try {
        const converted = window.dpvStore.convertQuotationToInvoice(quotationId);
        this.activeInvoice = converted;
        this.refreshAllData();
        this.showToast(`Quotation converted to Confirmed Invoice ${converted.invoiceNumber}!`, 'success');
        this.openInvoicePreview(converted.id);
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    }
  }

  // Duplicate Invoice Action
  duplicateInvoice(id) {
    const inv = window.dpvStore.getInvoiceById(id);
    if (!inv) return;
    if (confirm(`Duplicate invoice ${inv.invoiceNumber}? This will create a fresh draft with the same customer and services.`)) {
      const duplicated = window.dpvInvoiceEngine.duplicateInvoice(inv);
      this.showToast(`Invoice duplicated as ${duplicated.invoiceNumber}`, 'success');
      this.refreshAllData();
      this.openInvoicePreview(duplicated.id);
    }
  }

  // Delete Invoice Action
  async deleteInvoice(id) {
    const inv = window.dpvStore.getInvoiceById(id);
    const docNum = inv ? inv.invoiceNumber : id;
    if (confirm(`Are you sure you want to permanently delete invoice ${docNum}? This cannot be undone.`)) {
      window.dpvStore.deleteInvoice(id);
      if (this.activeInvoice && this.activeInvoice.id === id) {
        this.activeInvoice = null;
      }
      this.showToast(`Invoice ${docNum} deleted permanently.`, 'info');
      this.refreshAllData();
    }
  }

  // Delete Active Invoice from Preview
  async deleteActiveInvoice() {
    if (!this.activeInvoice) return;
    const inv = this.activeInvoice;
    const id = inv.id;
    const docNum = inv.invoiceNumber || id;
    if (confirm(`Are you sure you want to permanently delete invoice ${docNum}? This cannot be undone.`)) {
      this.activeInvoice = null;
      window.dpvStore.deleteInvoice(id);
      this.showToast(`Invoice ${docNum} deleted permanently.`, 'info');
      this.navigateTo('view-invoices');
      this.refreshAllData();
    }
  }

  // Record / Edit Payment Modal
  recordInvoicePayment(invoiceId, paymentId = null) {
    const inv = window.dpvStore.getInvoiceById(invoiceId);
    if (!inv) return;

    const modalTitle = document.getElementById('pay-modal-title');
    const payIdInput = document.getElementById('pay-modal-payment-id');
    const invIdInput = document.getElementById('pay-modal-invoice-id');
    const amountInput = document.getElementById('pay-modal-amount');
    const dateInput = document.getElementById('pay-modal-date');
    const typeInput = document.getElementById('pay-modal-type');
    const methodInput = document.getElementById('pay-modal-method');
    const refInput = document.getElementById('pay-modal-reference');

    if (invIdInput) invIdInput.value = inv.id;
    if (payIdInput) payIdInput.value = paymentId || '';

    if (paymentId) {
      // Edit existing payment
      const p = (inv.payments || []).find(x => x.id === paymentId) || window.dpvStore.getPaymentById(paymentId);
      if (modalTitle) modalTitle.innerHTML = `<i data-lucide="edit-3"></i> Edit Customer Payment`;
      if (amountInput) amountInput.value = p ? p.amount : 0;
      if (dateInput) dateInput.value = p ? (p.date || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
      if (typeInput) typeInput.value = p ? p.type : 'Other Installment';
      if (methodInput) methodInput.value = p ? (p.method || 'UPI') : 'UPI';
      if (refInput) refInput.value = p ? (p.reference || '') : '';
    } else {
      // Record new payment installment
      if (modalTitle) modalTitle.innerHTML = `<i data-lucide="credit-card"></i> Record Customer Payment`;
      if (amountInput) amountInput.value = inv.financials?.balanceDue || 0;
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
      if (typeInput) typeInput.value = (inv.financials?.totalPaid > 0) ? 'Second Payment' : 'Advance Payment';
      if (methodInput) methodInput.value = 'UPI';
      if (refInput) refInput.value = '';
    }

    if (window.lucide) window.lucide.createIcons();
    document.getElementById('modal-record-payment').classList.add('open');
  }

  openGlobalPaymentModal() {
    const invoices = window.dpvStore.getInvoices().filter(i => i.paymentStatus !== 'PAID');
    if (!invoices.length) {
      this.showToast("All invoices are fully paid!", "info");
      return;
    }
    this.recordInvoicePayment(invoices[0].id);
  }

  savePaymentModal(e) {
    e.preventDefault();
    const invId = document.getElementById('pay-modal-invoice-id').value;
    const payId = document.getElementById('pay-modal-payment-id')?.value || undefined;
    const amount = parseFloat(document.getElementById('pay-modal-amount').value) || 0;
    const type = document.getElementById('pay-modal-type').value;
    const date = document.getElementById('pay-modal-date').value;
    const method = document.getElementById('pay-modal-method').value;
    const reference = document.getElementById('pay-modal-reference').value.trim();

    if (amount <= 0) {
      this.showToast("Payment amount must be greater than zero", "error");
      return;
    }

    window.dpvStore.recordPayment({
      id: payId,
      invoiceId: invId,
      amount,
      type,
      date,
      method,
      reference
    });

    this.closeModals();
    this.showToast(payId ? `Payment updated successfully!` : `Payment of ₹${amount.toLocaleString('en-IN')} recorded successfully!`, 'success');
    this.refreshAllData();

    if (this.currentView === 'view-invoice-preview' && this.activeInvoice && this.activeInvoice.id === invId) {
      this.openInvoicePreview(invId);
    }
    if (this.currentView === 'view-payments') {
      this.renderPaymentsTable();
    }
  }

  deletePaymentRecord(paymentId) {
    const payment = window.dpvStore.getPaymentById(paymentId);
    if (!payment) return;

    if (confirm(`Are you sure you want to delete this payment of ₹${(payment.amount || 0).toLocaleString('en-IN')}? The invoice balance will be automatically recalculated.`)) {
      window.dpvStore.deletePayment(paymentId);
      this.showToast("Payment record deleted and balance recalculated.", "info");
      this.refreshAllData();
      if (this.currentView === 'view-payments') {
        this.renderPaymentsTable();
      }
      if (this.currentView === 'view-invoice-preview' && this.activeInvoice && this.activeInvoice.id === payment.invoiceId) {
        this.openInvoicePreview(payment.invoiceId);
      }
    }
  }

  // Calendar View Switcher & Search (Master Requirement #8)
  switchCalendarView(mode) {
    this.calendarCurrentView = mode;
    const monthCont = document.getElementById('shooting-calendar-container');
    const listCont = document.getElementById('shooting-schedule-list-container');
    const tabMonth = document.getElementById('cal-tab-month');
    const tabList = document.getElementById('cal-tab-list');
    const searchBox = document.getElementById('cal-search-box');

    if (mode === 'month') {
      if (monthCont) monthCont.style.display = 'block';
      if (listCont) listCont.style.display = 'none';
      if (searchBox) searchBox.style.display = 'none';
      if (tabMonth) { tabMonth.className = 'btn btn-sm btn-primary'; }
      if (tabList) { tabList.className = 'btn btn-sm btn-ghost'; }
      window.dpvCalendar.renderMonthCalendar('shooting-calendar-container', (event) => this.openCalendarEventModal(event));
    } else {
      if (monthCont) monthCont.style.display = 'none';
      if (listCont) listCont.style.display = 'block';
      if (searchBox) searchBox.style.display = 'block';
      if (tabMonth) { tabMonth.className = 'btn btn-sm btn-ghost'; }
      if (tabList) { tabList.className = 'btn btn-sm btn-primary'; }
      window.dpvCalendar.renderScheduleListView('shooting-schedule-list-container', (event) => this.openCalendarEventModal(event), this.calendarSearchQuery);
    }
    if (window.lucide) window.lucide.createIcons();
  }

  handleCalendarSearch(query) {
    this.calendarSearchQuery = (query || '').toLowerCase().trim();
    if (this.calendarCurrentView === 'list') {
      window.dpvCalendar.renderScheduleListView('shooting-schedule-list-container', (event) => this.openCalendarEventModal(event), this.calendarSearchQuery);
    }
  }

  // Calendar Event Details Modal
  openCalendarEventModal(event) {
    const body = document.getElementById('calendar-modal-body');
    const srvTags = (Array.isArray(event.services) && event.services.length > 0)
      ? `<div style="margin-top: 6px;"><strong>Assigned Services:</strong> ` + event.services.map(s => `<span class="filter-chip" style="font-size: 10px; padding: 2px 6px;">${escapeHtml(s)}</span>`).join(' ') + `</div>`
      : '';

    body.innerHTML = `
      <div style="font-size: 13.5px; line-height: 1.8;">
        <div><strong>Event / Ceremony:</strong> <span style="color: var(--primary); font-weight: 700;">${escapeHtml(event.eventName)}</span> (${escapeHtml(event.eventType)})</div>
        <div><strong>Date:</strong> ${new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div><strong>Client Name:</strong> ${escapeHtml(event.customerName)}</div>
        <div><strong>Phone / WhatsApp:</strong> <a href="tel:${event.customerPhone}" style="color: var(--primary);">${escapeHtml(event.customerPhone)}</a></div>
        <div><strong>Venue / Location:</strong> ${escapeHtml(event.venue)}</div>
        ${event.timings ? `<div><strong>Timings:</strong> ${escapeHtml(event.timings)}</div>` : ''}
        ${srvTags}
        <div><strong>Document Number:</strong> <code>${escapeHtml(event.invoiceNumber)}</code> <span class="status-pill ${event.documentType === 'quotation' ? 'status-quotation' : 'status-partial'}">${(event.documentType || 'invoice').toUpperCase()}</span></div>
        <div><strong>Package Total:</strong> ₹${(event.grandTotal || 0).toLocaleString('en-IN')} | <strong>Balance Due:</strong> ₹${(event.balanceDue || 0).toLocaleString('en-IN')}</div>
        <div><strong>Payment Status:</strong> <span class="status-pill status-${(event.paymentStatus || 'pending').toLowerCase().replace(/\s+/g, '-')}">${event.paymentStatus || 'PENDING'}</span></div>
        ${event.notes ? `<div style="margin-top: 8px; font-style: italic; color: var(--text-muted);">Notes: ${escapeHtml(event.notes)}</div>` : ''}
      </div>
    `;

    document.getElementById('cal-modal-view-invoice-btn').onclick = () => {
      this.closeModals();
      this.openInvoicePreview(event.invoiceId);
    };

    document.getElementById('modal-calendar-event').classList.add('open');
    if (window.lucide) window.lucide.createIcons();
  }

  // Customers Table View (Master Requirement #9)
  renderCustomersTable(filterQuery = '') {
    const tbody = document.getElementById('customers-table-tbody');
    if (!tbody) return;

    let customers = window.dpvStore.getCustomers();
    const invoices = window.dpvStore.getInvoices();

    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      customers = customers.filter(c => {
        const matchesDirect = 
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.altPhone && c.altPhone.includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q));
        if (matchesDirect) return true;
        const custInvoices = invoices.filter(inv => inv.customer?.phone === c.phone || inv.customer?.name === c.name || inv.customerId === c.id);
        return custInvoices.some(inv => 
          (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
          (inv.quotationNumber && inv.quotationNumber.toLowerCase().includes(q))
        );
      });
    }

    if (!customers.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No customer records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = customers.map(c => {
      const custInvoices = invoices.filter(inv => inv.customer?.phone === c.phone || inv.customer?.name === c.name);
      const totalBilled = custInvoices.reduce((sum, i) => sum + (i.financials?.grandTotal || 0), 0);
      const balanceDue = custInvoices.filter(i => i.documentType !== 'quotation').reduce((sum, i) => sum + (i.financials?.balanceDue || 0), 0);
      const phoneDisplay = c.altPhone ? `${escapeHtml(c.phone)}<br><span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(c.altPhone)}</span>` : escapeHtml(c.phone);

      return `
        <tr>
          <td>
            <strong>${escapeHtml(c.name)}</strong>
            ${c.relationName ? `<div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(c.relationName)}</div>` : ''}
          </td>
          <td><a href="tel:${c.phone}" style="color: var(--primary); text-decoration: none;">${phoneDisplay}</a></td>
          <td><a href="https://wa.me/91${(c.whatsapp || c.phone).replace(/\D/g, '')}" target="_blank" style="color: #15803d; text-decoration: none; font-weight: 500;">${escapeHtml(c.whatsapp || c.phone)}</a></td>
          <td>${escapeHtml([c.address, c.city].filter(Boolean).join(', ') || 'Balod')}</td>
          <td><span class="status-pill status-partial">${custInvoices.length} Bookings</span></td>
          <td><strong>₹${totalBilled.toLocaleString('en-IN')}</strong></td>
          <td style="color: ${balanceDue > 0 ? 'var(--danger)' : 'var(--text-muted)'}; font-weight: 700;">₹${balanceDue.toLocaleString('en-IN')}</td>
          <td>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-outline btn-sm" onclick="window.dpvApp.openCustomerProfile('${c.id}')" title="Customer Profile & History">
                <i data-lucide="user"></i>
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.dpvApp.openCustomerModal('${c.id}')" title="Edit Customer">
                <i data-lucide="edit-3"></i>
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.dpvApp.startInvoiceForCustomer('${c.id}')" title="Create Invoice for Client">
                <i data-lucide="plus"></i>
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.dpvApp.deleteCustomer('${c.id}')" title="Delete Customer" style="color: var(--danger); border-color: #fecaca;">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // Customer Profile & Lifetime History Modal
  openCustomerProfile(customerId) {
    const cust = window.dpvStore.getCustomerById(customerId);
    if (!cust) return;

    const data = window.dpvStore.getCustomerBookings(customerId);
    const invoices = data.invoices || [];
    const totalBilled = invoices.reduce((s, i) => s + (i.financials?.grandTotal || 0), 0);
    const totalPaid = invoices.reduce((s, i) => s + (i.financials?.totalPaid || 0), 0);
    const balanceDue = invoices.filter(i => i.documentType !== 'quotation').reduce((s, i) => s + (i.financials?.balanceDue || 0), 0);
    const quotCount = invoices.filter(i => i.documentType === 'quotation').length;
    const invCount = invoices.filter(i => i.documentType !== 'quotation').length;

    const body = document.getElementById('cust-profile-body');
    if (!body) return;

    // Header Card
    const headerHtml = `
      <div class="cust-profile-header-card">
        <div>
          <h2 style="margin: 0 0 6px 0; font-size: 19px; font-weight: 800;">${escapeHtml(cust.name)} ${cust.relationName ? `<span style="font-size: 13px; font-weight: normal; opacity: 0.85;">(${escapeHtml(cust.relationName)})</span>` : ''}</h2>
          <div style="font-size: 12.5px; opacity: 0.9; display: flex; gap: 14px; flex-wrap: wrap;">
            <span><i data-lucide="phone" style="width: 12px; height: 12px; display: inline;"></i> ${escapeHtml(cust.phone)}</span>
            ${cust.altPhone ? `<span><i data-lucide="phone-call" style="width: 12px; height: 12px; display: inline;"></i> Alt: ${escapeHtml(cust.altPhone)}</span>` : ''}
            <span><i data-lucide="map-pin" style="width: 12px; height: 12px; display: inline;"></i> ${escapeHtml([cust.address, cust.city].filter(Boolean).join(', ') || 'Balod')}</span>
          </div>
          ${cust.notes ? `<div style="margin-top: 8px; font-size: 11.5px; color: #fde68a;"><strong>Notes:</strong> ${escapeHtml(cust.notes)}</div>` : ''}
        </div>
        <div>
          <a href="https://wa.me/91${(cust.whatsapp || cust.phone).replace(/\D/g, '')}" target="_blank" class="btn btn-sm btn-accent" style="display: inline-flex; align-items: center; gap: 6px;">
            <i data-lucide="message-circle"></i> WhatsApp Client
          </a>
        </div>
      </div>
    `;

    // KPI Cards
    const kpiHtml = `
      <div class="cust-profile-kpi-grid">
        <div class="cust-profile-kpi">
          <div class="val">${invCount}</div>
          <div class="lbl">Invoices</div>
        </div>
        <div class="cust-profile-kpi">
          <div class="val">${quotCount}</div>
          <div class="lbl">Quotations</div>
        </div>
        <div class="cust-profile-kpi">
          <div class="val">₹${totalBilled.toLocaleString('en-IN')}</div>
          <div class="lbl">Total Billed</div>
        </div>
        <div class="cust-profile-kpi">
          <div class="val" style="color: var(--success);">₹${totalPaid.toLocaleString('en-IN')}</div>
          <div class="lbl">Total Paid</div>
        </div>
        <div class="cust-profile-kpi">
          <div class="val" style="color: ${balanceDue > 0 ? 'var(--danger)' : 'var(--text-muted)'};">₹${balanceDue.toLocaleString('en-IN')}</div>
          <div class="lbl">Balance Due</div>
        </div>
      </div>
    `;

    // Invoices and Quotations Table
    let tableHtml = `
      <div style="margin-bottom: 12px;">
        <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">Bookings &amp; Invoices (${invoices.length})</h4>
        <div class="table-responsive">
          <table class="data-table" style="font-size: 12px;">
            <thead>
              <tr>
                <th>Doc #</th>
                <th>Date</th>
                <th>Type</th>
                <th>Event</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (invoices.length > 0) {
      invoices.forEach(inv => {
        tableHtml += `
          <tr>
            <td><strong>${escapeHtml(inv.invoiceNumber)}</strong></td>
            <td>${inv.invoiceDate}</td>
            <td><span class="status-pill ${inv.documentType === 'quotation' ? 'status-quotation' : 'status-partial'}">${(inv.documentType || 'invoice').toUpperCase()}</span></td>
            <td>${escapeHtml(inv.event?.type || '')}</td>
            <td><strong>₹${(inv.financials?.grandTotal || 0).toLocaleString('en-IN')}</strong></td>
            <td style="color: var(--success);">${inv.documentType === 'quotation' ? '—' : `₹${(inv.financials?.totalPaid || 0).toLocaleString('en-IN')}`}</td>
            <td style="color: ${inv.financials?.balanceDue > 0 && inv.documentType !== 'quotation' ? 'var(--danger)' : 'var(--text-muted)'}; font-weight: 700;">${inv.documentType === 'quotation' ? '—' : `₹${(inv.financials?.balanceDue || 0).toLocaleString('en-IN')}`}</td>
            <td><span class="status-pill status-${inv.paymentStatus.toLowerCase().replace(/\s+/g, '-')}">${inv.paymentStatus}</span></td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="window.dpvApp.closeModals(); window.dpvApp.openInvoicePreview('${inv.id}')" title="Open A4 View">
                <i data-lucide="eye"></i>
              </button>
            </td>
          </tr>
        `;
      });
    } else {
      tableHtml += `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 16px;">No bookings recorded for this client yet.</td></tr>`;
    }
    tableHtml += `</tbody></table></div></div>`;

    body.innerHTML = headerHtml + kpiHtml + tableHtml;

    // Hook up modal footer action buttons
    const newInvBtn = document.getElementById('cust-profile-new-invoice-btn');
    if (newInvBtn) {
      newInvBtn.onclick = () => {
        this.closeModals();
        this.startInvoiceForCustomer(cust.id);
      };
    }
    const newQuotBtn = document.getElementById('cust-profile-new-quotation-btn');
    if (newQuotBtn) {
      newQuotBtn.onclick = () => {
        this.closeModals();
        this.startNewQuotation();
        this.selectAutocompleteCustomer(cust.id);
      };
    }
    const editCustBtn = document.getElementById('cust-profile-edit-btn');
    if (editCustBtn) {
      editCustBtn.onclick = () => {
        this.closeModals();
        this.openCustomerModal(cust.id);
      };
    }

    document.getElementById('modal-customer-profile').classList.add('open');
    if (window.lucide) window.lucide.createIcons();
  }

  // Customer Add / Edit Modal
  openCustomerModal(customerId = null) {
    const form = document.getElementById('form-customer-modal');
    if (form) form.reset();
    document.getElementById('cust-modal-id').value = '';
    const title = document.getElementById('customer-modal-title');

    if (customerId) {
      const cust = window.dpvStore.getCustomerById(customerId);
      if (cust) {
        if (title) title.innerHTML = '<i data-lucide="user-check"></i> Edit Customer Details';
        document.getElementById('cust-modal-id').value = cust.id;
        document.getElementById('cust-modal-name').value = cust.name || '';
        document.getElementById('cust-modal-phone').value = cust.phone || '';
        document.getElementById('cust-modal-altphone').value = cust.altPhone || '';
        document.getElementById('cust-modal-whatsapp').value = cust.whatsapp || cust.phone || '';
        document.getElementById('cust-modal-city').value = cust.city || 'Balod';
        document.getElementById('cust-modal-address').value = cust.address || '';
        document.getElementById('cust-modal-notes').value = cust.notes || '';
      }
    } else {
      if (title) title.innerHTML = '<i data-lucide="user-plus"></i> Add New Customer';
      document.getElementById('cust-modal-city').value = 'Balod';
    }

    document.getElementById('modal-customer').classList.add('open');
    if (window.lucide) window.lucide.createIcons();
  }

  saveCustomerModal(e) {
    e.preventDefault();
    const id = document.getElementById('cust-modal-id').value;
    const name = document.getElementById('cust-modal-name').value.trim();
    const phone = document.getElementById('cust-modal-phone').value.trim();
    const altPhone = document.getElementById('cust-modal-altphone')?.value.trim() || '';
    const whatsapp = document.getElementById('cust-modal-whatsapp')?.value.trim() || phone;
    const city = document.getElementById('cust-modal-city')?.value.trim() || 'Balod';
    const address = document.getElementById('cust-modal-address')?.value.trim() || '';
    const notes = document.getElementById('cust-modal-notes')?.value.trim() || '';

    if (!name || !phone) {
      this.showToast("Customer Name and Primary Phone are required.", "error");
      return;
    }

    const payload = {
      name,
      phone,
      altPhone,
      whatsapp,
      city,
      address,
      notes
    };

    if (id) {
      payload.id = id;
      window.dpvStore.updateCustomer(payload);
      this.showToast(`Customer ${name} updated successfully!`, 'success');
    } else {
      window.dpvStore.addCustomer(payload);
      this.showToast(`Customer ${name} added successfully!`, 'success');
    }

    this.closeModals();
    this.renderCustomersTable();
  }

  deleteCustomer(customerId) {
    const cust = window.dpvStore.getCustomerById(customerId);
    if (!cust) return;

    if (confirm(`Are you sure you want to delete customer "${cust.name}"? Existing invoices will remain safe, but the customer record will be removed from directory.`)) {
      window.dpvStore.deleteCustomer(customerId);
      this.showToast(`Customer ${cust.name} deleted.`, 'info');
      this.renderCustomersTable();
    }
  }

  startInvoiceForCustomer(custId) {
    const cust = window.dpvStore.getCustomerById(custId);
    if (!cust) return;
    this.startNewInvoice();
    this.selectAutocompleteCustomer(custId);
  }

  // Services CRUD
  renderServicesTable() {
    const tbody = document.getElementById('services-table-tbody');
    if (!tbody) return;

    const services = window.dpvStore.getServices();
    tbody.innerHTML = services.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td><span class="filter-chip" style="padding: 2px 8px; font-size: 11px;">${escapeHtml(s.category || 'General')}</span></td>
        <td><strong>₹${(s.rate || 0).toLocaleString('en-IN')}</strong></td>
        <td style="font-size: 12px; color: var(--text-muted); max-width: 300px;">${escapeHtml(s.description || '')}</td>
        <td><span class="status-pill ${s.active !== false ? 'status-paid' : 'status-pending'}">${s.active !== false ? 'ACTIVE' : 'INACTIVE'}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="window.dpvApp.openServiceModal('${s.id}')"><i data-lucide="edit-3"></i></button>
          <button class="btn btn-outline btn-sm" onclick="window.dpvApp.deleteService('${s.id}')" style="color: var(--danger);"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  openServiceModal(srvId = null) {
    const modal = document.getElementById('modal-service');
    const form = document.getElementById('form-service-modal');
    form.reset();
    document.getElementById('srv-modal-id').value = '';

    if (srvId) {
      const srv = window.dpvStore.getServices().find(s => s.id === srvId);
      if (srv) {
        document.getElementById('srv-modal-id').value = srv.id;
        document.getElementById('srv-modal-name').value = srv.name;
        document.getElementById('srv-modal-category').value = srv.category || 'Photography';
        document.getElementById('srv-modal-rate').value = srv.rate;
        document.getElementById('srv-modal-desc').value = srv.description || '';
      }
    }

    modal.classList.add('open');
  }

  saveServiceModal(e) {
    e.preventDefault();
    const id = document.getElementById('srv-modal-id').value;
    const name = document.getElementById('srv-modal-name').value.trim();
    const category = document.getElementById('srv-modal-category').value.trim();
    const rate = parseFloat(document.getElementById('srv-modal-rate').value) || 0;
    const description = document.getElementById('srv-modal-desc').value.trim();

    window.dpvStore.saveService({ id: id || null, name, category, rate, description, active: true });
    this.closeModals();
    this.renderServicesTable();
    this.showToast(`Service "${name}" saved!`, 'success');
  }

  deleteService(id) {
    if (confirm("Delete this service item?")) {
      window.dpvStore.deleteService(id);
      this.renderServicesTable();
      this.showToast("Service deleted.", "info");
    }
  }

  // Packages Grid
  renderPackagesGrid() {
    const grid = document.getElementById('packages-grid');
    if (!grid) return;

    const packages = window.dpvStore.getPackages();
    const allServices = window.dpvStore.getServices();

    grid.innerHTML = packages.map(pkg => {
      const includedServices = (pkg.serviceIds || []).map(id => allServices.find(s => s.id === id)?.name).filter(Boolean);
      return `
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header" style="background: var(--bg-main);">
            <h4 style="font-size: 15px; font-weight: 700; color: var(--primary);">${escapeHtml(pkg.name)}</h4>
            <span style="font-size: 16px; font-weight: 800; color: var(--accent);">₹${pkg.price.toLocaleString('en-IN')}</span>
          </div>
          <div class="card-body">
            <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 12px;">${escapeHtml(pkg.description || '')}</p>
            <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px;">Included Services:</div>
            <ul style="padding-left: 18px; font-size: 11.5px; color: var(--text-main); margin-bottom: 16px;">
              ${includedServices.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
            </ul>
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
              <button class="btn btn-outline btn-sm" onclick="window.dpvApp.openPackageModal('${pkg.id}')"><i data-lucide="edit-3"></i> Edit</button>
              <button class="btn btn-outline btn-sm" onclick="window.dpvApp.deletePackage('${pkg.id}')" style="color: var(--danger);"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  openPackageModal(pkgId = null) {
    const modal = document.getElementById('modal-package');
    const form = document.getElementById('form-package-modal');
    form.reset();
    document.getElementById('pkg-modal-id').value = '';

    const allServices = window.dpvStore.getServices();
    const servicesContainer = document.getElementById('pkg-modal-services-list');
    
    let selectedIds = [];
    if (pkgId) {
      const pkg = window.dpvStore.getPackages().find(p => p.id === pkgId);
      if (pkg) {
        document.getElementById('pkg-modal-id').value = pkg.id;
        document.getElementById('pkg-modal-name').value = pkg.name;
        document.getElementById('pkg-modal-price').value = pkg.price;
        document.getElementById('pkg-modal-desc').value = pkg.description || '';
        selectedIds = pkg.serviceIds || [];
      }
    }

    servicesContainer.innerHTML = allServices.map(s => `
      <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
        <input type="checkbox" class="pkg-srv-checkbox" value="${s.id}" ${selectedIds.includes(s.id) ? 'checked' : ''}>
        <span>${escapeHtml(s.name)} (₹${s.rate.toLocaleString('en-IN')})</span>
      </label>
    `).join('');

    modal.classList.add('open');
  }

  savePackageModal(e) {
    e.preventDefault();
    const id = document.getElementById('pkg-modal-id').value;
    const name = document.getElementById('pkg-modal-name').value.trim();
    const price = parseFloat(document.getElementById('pkg-modal-price').value) || 0;
    const description = document.getElementById('pkg-modal-desc').value.trim();

    const serviceIds = [];
    document.querySelectorAll('.pkg-srv-checkbox:checked').forEach(cb => serviceIds.push(cb.value));

    window.dpvStore.savePackage({ id: id || null, name, price, description, serviceIds, active: true });
    this.closeModals();
    this.renderPackagesGrid();
    this.showToast(`Package "${name}" saved!`, 'success');
  }

  deletePackage(id) {
    if (confirm("Delete this package?")) {
      window.dpvStore.deletePackage(id);
      this.renderPackagesGrid();
      this.showToast("Package deleted.", "info");
    }
  }

  // Terms & Conditions List
  renderTermsList() {
    const container = document.getElementById('terms-management-list');
    if (!container) return;

    const terms = window.dpvStore.getTerms();
    container.innerHTML = terms.map((t, idx) => `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px 18px; display: flex; justify-content: space-between; align-items: flex-start; gap: 14px;">
        <div style="font-size: 13px; color: var(--text-main); flex: 1;">
          <div style="font-weight: 700; color: var(--primary); margin-bottom: 4px; font-size: 13.5px;">${idx + 1}. ${escapeHtml(t.title || `Condition ${idx + 1}`)}</div>
          <div style="font-size: 12px; line-height: 1.5; color: var(--text-muted);">${escapeHtml(t.text)}</div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
          <button class="btn btn-outline btn-sm" onclick="window.dpvApp.openTermModal('${t.id}')" title="Edit Condition"><i data-lucide="edit-3"></i></button>
          <button class="btn btn-outline btn-sm" onclick="window.dpvApp.deleteTerm('${t.id}')" title="Delete Condition" style="color: var(--danger);"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  openTermModal(termId = null) {
    const modal = document.getElementById('modal-term');
    const form = document.getElementById('form-term-modal');
    form.reset();
    document.getElementById('term-modal-id').value = '';
    const titleInput = document.getElementById('term-modal-title-input');
    if (titleInput) titleInput.value = '';

    if (termId) {
      const term = window.dpvStore.getTerms().find(t => t.id === termId);
      if (term) {
        document.getElementById('term-modal-id').value = term.id;
        document.getElementById('term-modal-text').value = term.text;
        if (titleInput) titleInput.value = term.title || '';
      }
    }

    modal.classList.add('open');
  }

  saveTermModal(e) {
    e.preventDefault();
    const id = document.getElementById('term-modal-id').value;
    const text = document.getElementById('term-modal-text').value.trim();
    const titleInput = document.getElementById('term-modal-title-input');
    const title = titleInput ? titleInput.value.trim() : '';

    window.dpvStore.saveTerm({ id: id || null, title, text, active: true });
    this.closeModals();
    this.renderTermsList();
    this.showToast("Condition saved successfully!", "success");
  }

  deleteTerm(id) {
    if (confirm("Delete this policy term?")) {
      window.dpvStore.deleteTerm(id);
      this.renderTermsList();
      this.showToast("Term deleted.", "info");
    }
  }

  // Payments Ledger Table
  renderPaymentsTable() {
    const tbody = document.getElementById('payments-table-tbody');
    if (!tbody) return;

    const payments = window.dpvStore.getPayments();
    const invoices = window.dpvStore.getInvoices();

    if (!payments.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No payments recorded in ledger yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = payments.map(p => {
      const inv = invoices.find(i => i.id === p.invoiceId);
      return `
        <tr>
          <td>${escapeHtml(p.date || '-')}</td>
          <td><strong>${escapeHtml(inv ? (inv.invoiceNumber || inv.quotationNumber || 'Invoice') : 'Direct Entry')}</strong></td>
          <td><span class="status-pill status-partial">${escapeHtml(p.type)}</span></td>
          <td>${escapeHtml(p.method)}</td>
          <td><code>${escapeHtml(p.reference || '-')}</code></td>
          <td><strong style="color: var(--success);">₹${(p.amount || 0).toLocaleString('en-IN')}</strong></td>
          <td style="color: var(--text-muted); font-size: 12px;">${escapeHtml(p.notes || '-')}</td>
          <td style="text-align: right;">
            <div style="display: flex; gap: 4px; justify-content: flex-end;">
              <button class="btn btn-outline btn-sm" onclick="window.dpvApp.recordInvoicePayment('${p.invoiceId}', '${p.id}')" title="Edit Payment">
                <i data-lucide="edit-3"></i>
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.dpvApp.deletePaymentRecord('${p.id}')" title="Delete Payment" style="color: var(--danger); border-color: #fecaca;">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // Settings Management
  populateSettingsForm() {
    const s = window.dpvStore.getSettings();
    document.getElementById('set-studio-name').value = s.studioName || '';
    document.getElementById('set-short-name').value = s.shortName || '';
    document.getElementById('set-owner-name').value = s.ownerName || '';
    document.getElementById('set-mobile').value = s.mobile || '';
    document.getElementById('set-whatsapp').value = s.whatsapp || '';
    document.getElementById('set-email').value = s.email || '';
    document.getElementById('set-address').value = s.address || '';
    document.getElementById('set-city').value = s.city || '';
    document.getElementById('set-state').value = s.state || '';
    document.getElementById('set-pincode').value = s.pincode || '';
    document.getElementById('set-instagram').value = s.instagram || '';
    document.getElementById('set-website').value = s.website || '';
    document.getElementById('set-gstin').value = s.gstin || '';
    document.getElementById('set-pan').value = s.pan || '';
    document.getElementById('set-upi-id').value = s.upiId || '';
    document.getElementById('set-payee-name').value = s.payeeName || '';
    document.getElementById('set-invoice-prefix').value = s.invoicePrefix || 'DPV';
    document.getElementById('set-header-tagline').value = s.headerTagline || '';
    if (document.getElementById('set-header-memories-title')) document.getElementById('set-header-memories-title').value = s.headerMemoriesTitle || 'Memories';
    if (document.getElementById('set-header-memories-sub')) document.getElementById('set-header-memories-sub').value = s.headerMemoriesSub || 'THAT LAST FOREVER';
    if (document.getElementById('set-header-srv1')) document.getElementById('set-header-srv1').value = s.headerServices1 || 'Wedding | Pre-Wedding | Engagement';
    if (document.getElementById('set-header-srv2')) document.getElementById('set-header-srv2').value = s.headerServices2 || 'Birthday | Anniversary | Maternity Shoot';
    if (document.getElementById('set-header-srv3')) document.getElementById('set-header-srv3').value = s.headerServices3 || 'Album Design & Printing | Photo Printing';
    if (document.getElementById('set-header-quote')) document.getElementById('set-header-quote').value = s.headerQuote || '"Stories Through Our Lens"';
    if (document.getElementById('set-footer-tagline')) document.getElementById('set-footer-tagline').value = s.footerTagline || 'Capture Your Special Moment';
    document.getElementById('set-footer-note').value = s.footerNote || '';

    if (s.logoUrl) {
      document.getElementById('settings-logo-preview').src = s.logoUrl;
    }
  }

  saveSettings(e) {
    if (e) e.preventDefault();
    const updated = {
      studioName: document.getElementById('set-studio-name').value.trim(),
      shortName: document.getElementById('set-short-name').value.trim(),
      ownerName: document.getElementById('set-owner-name').value.trim(),
      mobile: document.getElementById('set-mobile').value.trim(),
      whatsapp: document.getElementById('set-whatsapp').value.trim(),
      email: document.getElementById('set-email').value.trim(),
      address: document.getElementById('set-address').value.trim(),
      city: document.getElementById('set-city').value.trim(),
      state: document.getElementById('set-state').value.trim(),
      pincode: document.getElementById('set-pincode').value.trim(),
      instagram: document.getElementById('set-instagram').value.trim(),
      website: document.getElementById('set-website').value.trim(),
      gstin: document.getElementById('set-gstin').value.trim(),
      pan: document.getElementById('set-pan').value.trim(),
      upiId: document.getElementById('set-upi-id').value.trim(),
      payeeName: document.getElementById('set-payee-name').value.trim(),
      invoicePrefix: document.getElementById('set-invoice-prefix').value.trim(),
      headerTagline: document.getElementById('set-header-tagline').value.trim(),
      headerMemoriesTitle: document.getElementById('set-header-memories-title')?.value.trim() || 'Memories',
      headerMemoriesSub: document.getElementById('set-header-memories-sub')?.value.trim() || 'THAT LAST FOREVER',
      headerServices1: document.getElementById('set-header-srv1')?.value.trim() || 'Wedding | Pre-Wedding | Engagement',
      headerServices2: document.getElementById('set-header-srv2')?.value.trim() || 'Birthday | Anniversary | Maternity Shoot',
      headerServices3: document.getElementById('set-header-srv3')?.value.trim() || 'Album Design & Printing | Photo Printing',
      headerQuote: document.getElementById('set-header-quote')?.value.trim() || '"Stories Through Our Lens"',
      footerTagline: document.getElementById('set-footer-tagline')?.value.trim() || 'Capture Your Special Moment',
      footerNote: document.getElementById('set-footer-note').value.trim()
    };

    window.dpvStore.updateSettings(updated);
    if (this.activeInvoice) {
      this.renderInvoiceSheet(this.activeInvoice);
    }
    this.showToast("Studio settings saved successfully!", "success");
  }

  handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast("Please choose an image file (PNG, JPG, SVG)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      document.getElementById('settings-logo-preview').src = dataUrl;
      window.dpvStore.updateSettings({ logoUrl: dataUrl });
      this.showToast("Studio logo uploaded and preserved!", "success");
    };
    reader.readAsDataURL(file);
  }

  handleRestoreBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (confirm("Restoring a backup will replace current records with the backup file data. Continue?")) {
      window.dpvBackup.restoreFromFile(file, () => {
        this.showToast("Backup restored successfully!", "success");
        this.refreshAllData();
      }, (err) => {
        this.showToast("Failed to restore: " + err.message, "error");
      });
    }
  }

  // Modals Controller
  closeModals() {
    document.querySelectorAll('.modal-backdrop:not(#auth-modal)').forEach(m => m.classList.remove('open'));
  }

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle-2';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // PWA App Update Manager
  checkForAppUpdates(manual = false) {
    if ('serviceWorker' in navigator) {
      if (manual) this.showToast('Checking for latest updates on cloud...', 'info');
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.update().then(() => {
            if (manual) {
              setTimeout(() => {
                this.showToast('App is running the latest version (v1.1.0)!', 'success');
              }, 1200);
            }
          }).catch(err => {
            if (manual) this.showToast('Update check note: ' + err.message, 'warning');
          });
        } else if (manual) {
          this.showToast('App is running the latest version!', 'success');
        }
      }).catch(err => {
        if (manual) this.showToast('Update check failed: ' + err.message, 'error');
      });
    } else if (manual) {
      this.showToast('Browser running latest online version.', 'info');
    }
  }
}

// Global Application Instance
window.dpvApp = new DPVApp();

// Boot application upon DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.dpvApp.init();
});
