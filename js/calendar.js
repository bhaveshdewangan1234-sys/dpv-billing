/**
 * Dewangan Photo & Videography – Invoice Management System
 * Interactive Shooting Calendar & Schedule Controller
 */

class DPVCalendar {
  constructor() {
    this.currentDate = new Date();
  }

  /**
   * Aggregate all shoot dates from invoices
   */
  getAllShootingEvents() {
    const invoices = window.dpvStore.getInvoices();
    const events = [];

    invoices.forEach(inv => {
      // Multiple shooting dates per invoice
      if (inv.shootingDates && Array.isArray(inv.shootingDates)) {
        inv.shootingDates.forEach(sd => {
          if (sd.date) {
            events.push({
              id: `${inv.id}_${sd.id || Math.random().toString(36).substr(2, 4)}`,
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              documentType: inv.documentType || 'invoice',
              customerName: inv.customer ? inv.customer.name : 'Unknown Client',
              customerPhone: inv.customer ? (inv.customer.whatsapp || inv.customer.phone) : '',
              date: sd.date,
              dayNumber: sd.dayNumber || 1,
              dayName: sd.dayName || new Date(sd.date).toLocaleDateString('en-US', { weekday: 'long' }),
              eventName: sd.eventName || inv.event?.type || 'Shoot Event',
              eventType: inv.event ? inv.event.type : 'Wedding',
              venue: sd.venue || inv.event?.venue || 'Studio / On-location',
              location: sd.location || inv.event?.location || '',
              startTime: sd.startTime || '',
              endTime: sd.endTime || '',
              services: sd.services || [],
              paymentStatus: inv.paymentStatus,
              grandTotal: inv.financials ? inv.financials.grandTotal : 0,
              balanceDue: inv.financials ? inv.financials.balanceDue : 0,
              notes: sd.notes || ''
            });
          }
        });
      } else if (inv.event && inv.invoiceDate) {
        // Fallback if no specific shoot date was specified
        events.push({
          id: `${inv.id}_main`,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          documentType: inv.documentType || 'invoice',
          customerName: inv.customer ? inv.customer.name : 'Unknown Client',
          customerPhone: inv.customer ? (inv.customer.whatsapp || inv.customer.phone) : '',
          date: inv.invoiceDate,
          dayNumber: 1,
          dayName: new Date(inv.invoiceDate).toLocaleDateString('en-US', { weekday: 'long' }),
          eventName: inv.event.type || 'Shoot Event',
          eventType: inv.event.type || 'Wedding',
          venue: inv.event.venue || 'Balod',
          location: inv.event.location || '',
          startTime: '',
          endTime: '',
          services: (inv.items || []).map(i => i.name),
          paymentStatus: inv.paymentStatus,
          grandTotal: inv.financials ? inv.financials.grandTotal : 0,
          balanceDue: inv.financials ? inv.financials.balanceDue : 0,
          notes: ''
        });
      }
    });

    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Filter shoots happening today or in the future
   */
  getUpcomingShoots(limit = 10) {
    const all = this.getAllShootingEvents();
    const today = new Date().toISOString().split('T')[0];
    return all.filter(e => e.date >= today).slice(0, limit);
  }

  /**
   * Render Interactive Month Calendar (Monday First per Studio Master Specification)
   */
  renderMonthCalendar(containerId, onEventClick) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    // Shift Sunday (0) to 6, Monday (1) to 0 for Monday-first calendar layout
    const rawFirstDay = new Date(year, month, 1).getDay();
    const firstDayIndex = (rawFirstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    const allEvents = this.getAllShootingEvents();
    const eventsByDate = {};
    allEvents.forEach(e => {
      eventsByDate[e.date] = eventsByDate[e.date] || [];
      eventsByDate[e.date].push(e);
    });

    let html = `
      <div class="calendar-header">
        <div class="cal-title">${monthNames[month]} ${year}</div>
        <div class="cal-nav-buttons">
          <button class="btn btn-outline btn-sm" id="cal-prev-btn"><i data-lucide="chevron-left"></i></button>
          <button class="btn btn-outline btn-sm" id="cal-today-btn">Today</button>
          <button class="btn btn-outline btn-sm" id="cal-next-btn"><i data-lucide="chevron-right"></i></button>
        </div>
      </div>
      <div class="calendar-grid">
        <div class="cal-weekday">Mon</div>
        <div class="cal-weekday">Tue</div>
        <div class="cal-weekday">Wed</div>
        <div class="cal-weekday">Thu</div>
        <div class="cal-weekday">Fri</div>
        <div class="cal-weekday">Sat</div>
        <div class="cal-weekday">Sun</div>
    `;

    // Empty cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
      html += `<div class="cal-day empty"></div>`;
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const dayEvents = eventsByDate[dateStr] || [];

      html += `
        <div class="cal-day ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}" data-date="${dateStr}">
          <div class="day-number">${day}</div>
          <div class="day-events-list">
            ${dayEvents.map(e => `
              <div class="cal-event-pill status-${(e.paymentStatus || 'pending').toLowerCase().replace(/\s+/g, '-')}" data-event-id="${e.id}" title="${escapeHtml(e.customerName)} - ${escapeHtml(e.eventName)} (${escapeHtml(e.venue)})">
                <span class="event-bullet"></span>
                <span class="event-text"><strong>${escapeHtml(e.eventName)}</strong>: ${escapeHtml(e.customerName)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Attach navigation listeners
    document.getElementById('cal-prev-btn')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.renderMonthCalendar(containerId, onEventClick);
    });

    document.getElementById('cal-today-btn')?.addEventListener('click', () => {
      this.currentDate = new Date();
      this.renderMonthCalendar(containerId, onEventClick);
    });

    document.getElementById('cal-next-btn')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.renderMonthCalendar(containerId, onEventClick);
    });

    // Attach event item clicks
    container.querySelectorAll('.cal-event-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const evId = pill.dataset.eventId;
        const found = allEvents.find(x => x.id === evId);
        if (found && onEventClick) onEventClick(found);
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  /**
   * Render Clean Schedule List / Table View (Requirement #14)
   */
  renderScheduleListView(containerId, onEventClick, searchQuery = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let allEvents = this.getAllShootingEvents();
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      allEvents = allEvents.filter(e => 
        e.customerName.toLowerCase().includes(q) ||
        e.eventName.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        (e.customerPhone && e.customerPhone.includes(q)) ||
        (e.invoiceNumber && e.invoiceNumber.toLowerCase().includes(q))
      );
    }

    if (!allEvents.length) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i data-lucide="calendar-x" style="width: 36px; height: 36px; margin-bottom: 8px; opacity: 0.5;"></i>
          <p>No scheduled shoot events found matching your filter.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="min-width: 140px;">Shoot Date &amp; Day</th>
              <th>Function / Ceremony</th>
              <th>Client Name</th>
              <th>Phone</th>
              <th>Venue / Location</th>
              <th>Timings</th>
              <th>Included Services</th>
              <th>Doc #</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    allEvents.forEach(e => {
      const dt = new Date(e.date);
      const formattedDate = !isNaN(dt.getTime()) 
        ? dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : e.date;
      const srvList = Array.isArray(e.services) && e.services.length > 0 
        ? e.services.map(s => `<span class="filter-chip" style="font-size: 10px; padding: 2px 6px; margin: 1px;">${escapeHtml(s)}</span>`).join(' ')
        : `<span style="color: var(--text-muted); font-size: 11px;">General Coverage</span>`;

      const timingsStr = [e.startTime, e.endTime].filter(Boolean).join(' - ') || 'Full Day';
      const venueStr = [e.venue, e.location].filter(Boolean).join(', ') || 'Studio / As Agreed';

      html += `
        <tr>
          <td>
            <strong>${formattedDate}</strong>
            <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(e.dayName || '')}</div>
          </td>
          <td>
            <span style="font-weight: 700; color: var(--primary);">${escapeHtml(e.eventName)}</span>
            <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(e.eventType || '')}</div>
          </td>
          <td><strong>${escapeHtml(e.customerName)}</strong></td>
          <td><a href="tel:${e.customerPhone}" style="color: var(--primary); text-decoration: none;">${escapeHtml(e.customerPhone)}</a></td>
          <td style="font-size: 12px;">${escapeHtml(venueStr)}</td>
          <td style="font-size: 12px;">${escapeHtml(timingsStr)}</td>
          <td style="max-width: 220px;">${srvList}</td>
          <td><code>${escapeHtml(e.invoiceNumber)}</code></td>
          <td><span class="status-pill status-${(e.paymentStatus || 'pending').toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(e.paymentStatus || 'PENDING')}</span></td>
          <td>
            <button class="btn btn-outline btn-sm view-cal-event-btn" data-event-id="${e.id}" style="padding: 4px 8px;" title="View Booking Details">
              <i data-lucide="eye"></i>
            </button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

    container.querySelectorAll('.view-cal-event-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const evId = btn.dataset.eventId;
        const found = allEvents.find(x => x.id === evId);
        if (found && onEventClick) onEventClick(found);
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }
}

// Global escape utility
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.dpvCalendar = new DPVCalendar();
