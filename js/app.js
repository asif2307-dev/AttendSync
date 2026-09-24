/**
 * AttendSync – Core Application Framework & UI Utilities
 * Handles navigation, notifications dropdown, session management, modals, and toasts.
 */

// Simple Authentication & Session Manager
const Auth = {
  SESSION_KEY: 'attendsync_auth_session_v1',

  getUser() {
    const session = localStorage.getItem(this.SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  login(usernameOrEmail, password) {
    const validIds = ['admin', 'supervisor', 'supervisor@attendsync.com'];
    const cleanId = (usernameOrEmail || '').trim().toLowerCase();
    
    // Demo supervisor credentials
    if (validIds.includes(cleanId) && password === 'admin123') {
      const user = {
        name: 'Mo Asif',
        email: cleanId.includes('@') ? cleanId : 'supervisor@attendsync.com',
        username: cleanId,
        role: 'Senior Attendance Supervisor',
        department: 'Operations & HR Oversight',
        loginTime: new Date().toISOString()
      };
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
      return { success: true, user };
    }
    return { success: false, message: 'Invalid credentials. Use demo: admin / admin123 (or supervisor@attendsync.com)' };
  },

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    window.location.href = 'login.html';
  },

  requireAuth() {
    const pathname = window.location.pathname.toLowerCase();
    const isPublicPage = pathname.endsWith('index.html') || 
                         pathname.endsWith('login.html') || 
                         pathname === '/' || 
                         pathname.endsWith('/');
    const user = this.getUser();
    if (!user && !isPublicPage) {
      window.location.href = 'login.html';
    }
  }
};

// Check auth on every page load (except login page)
Auth.requireAuth();

// ==========================================================================
// Toast Notification Utility
// ==========================================================================
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'danger') icon = '⚠';
  if (type === 'warning') icon = '⚡';

  toast.innerHTML = `<span><strong>${icon}</strong></span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================================================
// Modal Helpers
// ==========================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

// Global modal close on click outside or on .modal-close-btn
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('show');
  }
  if (e.target.classList.contains('modal-close-btn') || e.target.closest('.modal-close-btn')) {
    const backdrop = e.target.closest('.modal-backdrop');
    if (backdrop) backdrop.classList.remove('show');
  }
});

// ==========================================================================
// Common Top Header & Sidebar Component Initializer
// ==========================================================================
function renderAppLayout(activePage = '') {
  const user = Auth.getUser() || { name: 'Mo Asif', role: 'Supervisor' };
  
  // Calculate dynamic notification counts from underlying data
  const employees = Storage.getEmployees();
  const attendance = Storage.getAttendance();
  const leaves = Storage.getLeaves();
  const regularizations = Storage.getRegularizations();
  
  // Compute pending leaves & regularizations
  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;
  const pendingRegsCount = regularizations.filter(r => r.status === 'Pending').length;
  
  // Compute high risk count
  let highRiskCount = 0;
  employees.forEach(emp => {
    const stats = RiskCalculator.calculateStats(emp.id, attendance);
    if (stats.riskLevel === 'High') highRiskCount++;
  });
  
  const totalNotifications = pendingLeavesCount + pendingRegsCount + highRiskCount;

  // 1. TOP HEADER HTML
  const headerHtml = `
    <header class="top-header">
      <div class="header-left">
        <button class="sidebar-toggle-btn" id="sidebarToggleBtn" title="Toggle Navigation">☰</button>
        <a href="dashboard.html" class="brand-logo" title="AttendSync – Smart Attendance Monitoring">
          <img src="assets/logo.png" alt="AttendSync Logo" class="brand-img">
          <div>
            <span style="font-weight: 700; color: #ffffff; font-size: 14px; letter-spacing: 0.3px;">AttendSync</span>
            <span class="brand-tagline">Supervisor Portal</span>
          </div>
        </a>
      </div>

      <div class="header-search">
        <span class="search-icon">🔍</span>
        <input type="text" id="globalSearchInput" placeholder="Search employee by ID or Name (DSA Hash Search)..." autocomplete="off" />
        <div id="searchDropdown" class="dropdown-menu" style="width: 100%; top: 38px; left: 0;"></div>
      </div>

      <div class="header-right">
        <!-- Notifications Menu -->
        <div class="header-nav-item">
          <button class="header-btn" id="notificationBtn" title="Notifications & Alerts">
            <span>🔔</span> Alerts
            <span class="notification-badge" id="headerNotifBadge">${totalNotifications}</span>
          </button>
          <div id="notificationDropdown" class="dropdown-menu">
            <div class="dropdown-header">
              <span>Supervisor Alerts (${totalNotifications})</span>
              <a href="alerts.html" style="font-size: 11px;">View All</a>
            </div>
            <div class="dropdown-item-list">
              ${highRiskCount > 0 ? `
                <a href="alerts.html" class="dropdown-item">
                  <div class="item-title">
                    <span style="color: var(--status-absent);">⚠ High Risk Employees</span>
                    <span class="badge badge-high-risk">${highRiskCount}</span>
                  </div>
                  <div class="item-meta">Employees with attendance &lt; 75% or consecutive absences</div>
                </a>
              ` : ''}
              ${pendingLeavesCount > 0 ? `
                <a href="leaves.html" class="dropdown-item">
                  <div class="item-title">
                    <span style="color: var(--status-late);">📝 Pending Leave Requests</span>
                    <span class="badge badge-medium-risk">${pendingLeavesCount}</span>
                  </div>
                  <div class="item-meta">Leave approvals requiring supervisor decision</div>
                </a>
              ` : ''}
              ${pendingRegsCount > 0 ? `
                <a href="regularization.html" class="dropdown-item">
                  <div class="item-title">
                    <span style="color: var(--color-blue-primary);">⏱ Regularization Requests</span>
                    <span class="badge badge-low-risk">${pendingRegsCount}</span>
                  </div>
                  <div class="item-meta">Missed attendance punch correction requests</div>
                </a>
              ` : ''}
              <a href="shifts.html" class="dropdown-item">
                <div class="item-title">
                  <span style="color: var(--status-late);">⚡ Shift Coverage Alert</span>
                  <span class="badge badge-medium-risk">Night</span>
                </div>
                <div class="item-meta">Night Shift currently below minimum staffing ratio</div>
              </a>
            </div>
            <div class="dropdown-footer">
              <a href="monitoring.html">Open Smart Monitoring Suite →</a>
            </div>
          </div>
        </div>

        <!-- Supervisor Profile Menu -->
        <div class="header-nav-item">
          <div class="supervisor-profile" id="profileMenuBtn">
            <div class="avatar-initials">${user.name.split(' ').map(n=>n[0]).join('')}</div>
            <div class="supervisor-info">
              <div class="supervisor-name">${user.name}</div>
              <div class="supervisor-role">${user.role || 'Supervisor'}</div>
            </div>
            <span style="font-size: 10px; color: #93c5fd;">▼</span>
          </div>
          <div id="profileDropdown" class="dropdown-menu" style="min-width: 200px;">
            <div class="dropdown-header">Supervisor Account</div>
            <div style="padding: 10px 12px; font-size: 11.5px; border-bottom: 1px solid var(--color-border-light);">
              <div><strong>${user.name}</strong></div>
              <div style="color: var(--text-muted); font-size: 11px;">${user.email}</div>
              <div style="margin-top: 4px;"><span class="badge badge-present">Active Session</span></div>
            </div>
            <a href="settings.html" class="dropdown-item">⚙ System Settings & DSA</a>
            <a href="audit.html" class="dropdown-item">📋 Supervisor Audit Trail</a>
            <a href="#" id="logoutActionBtn" class="dropdown-item" style="color: var(--status-absent); font-weight: 600;">🚪 Logout</a>
          </div>
        </div>
      </div>
    </header>
  `;

  // 2. SIDEBAR HTML
  const sidebarHtml = `
    <aside class="sidebar" id="appSidebar">
      <div class="sidebar-section-title">Main Navigation</div>
      <ul class="sidebar-menu">
        <li class="${activePage === 'dashboard' ? 'active' : ''}">
          <a href="dashboard.html"><span class="sidebar-icon">📊</span> Dashboard</a>
        </li>
        <li class="${activePage === 'employees' ? 'active' : ''}">
          <a href="employees.html"><span class="sidebar-icon">👥</span> Employees <span class="sidebar-badge badge-blue">50</span></a>
        </li>
        <li class="${activePage === 'attendance' ? 'active' : ''}">
          <a href="attendance.html"><span class="sidebar-icon">✍️</span> Mark Attendance</a>
        </li>
        <li class="${activePage === 'history' ? 'active' : ''}">
          <a href="history.html"><span class="sidebar-icon">📅</span> Attendance History</a>
        </li>
      </ul>

      <div class="sidebar-section-title">Decision Support & Analysis</div>
      <ul class="sidebar-menu">
        <li class="${activePage === 'monitoring' ? 'active' : ''}">
          <a href="monitoring.html"><span class="sidebar-icon">🧠</span> Smart Monitoring</a>
        </li>
        <li class="${activePage === 'alerts' ? 'active' : ''}">
          <a href="alerts.html"><span class="sidebar-icon">🚨</span> Risk & Alerts ${highRiskCount > 0 ? `<span class="sidebar-badge badge-danger">${highRiskCount}</span>` : ''}</a>
        </li>
        <li class="${activePage === 'leaves' ? 'active' : ''}">
          <a href="leaves.html"><span class="sidebar-icon">📝</span> Leave Requests ${pendingLeavesCount > 0 ? `<span class="sidebar-badge badge-warning">${pendingLeavesCount}</span>` : ''}</a>
        </li>
        <li class="${activePage === 'regularization' ? 'active' : ''}">
          <a href="regularization.html"><span class="sidebar-icon">⏱</span> Regularization ${pendingRegsCount > 0 ? `<span class="sidebar-badge badge-warning">${pendingRegsCount}</span>` : ''}</a>
        </li>
        <li class="${activePage === 'shifts' ? 'active' : ''}">
          <a href="shifts.html"><span class="sidebar-icon">🔄</span> Shift Rosters</a>
        </li>
      </ul>

      <div class="sidebar-section-title">Reports & Organization</div>
      <ul class="sidebar-menu">
        <li class="${activePage === 'reports' ? 'active' : ''}">
          <a href="reports.html"><span class="sidebar-icon">📄</span> Reports & Export</a>
        </li>
        <li class="${activePage === 'departments' ? 'active' : ''}">
          <a href="departments.html"><span class="sidebar-icon">🏢</span> Departments</a>
        </li>
        <li class="${activePage === 'audit' ? 'active' : ''}">
          <a href="audit.html"><span class="sidebar-icon">📋</span> Audit Log</a>
        </li>
        <li class="${activePage === 'settings' ? 'active' : ''}">
          <a href="settings.html"><span class="sidebar-icon">⚙️</span> Settings & DSA Info</a>
        </li>
      </ul>
    </aside>
  `;

  // Inject header and sidebar into DOM if containers exist
  const headerContainer = document.getElementById('top-header-placeholder');
  if (headerContainer) headerContainer.innerHTML = headerHtml;

  const sidebarContainer = document.getElementById('sidebar-placeholder');
  if (sidebarContainer) sidebarContainer.innerHTML = sidebarHtml;

  // Initialize interactive header dropdowns
  initHeaderInteractions();
}

function initHeaderInteractions() {
  const notifBtn = document.getElementById('notificationBtn');
  const notifDropdown = document.getElementById('notificationDropdown');
  const profileBtn = document.getElementById('profileMenuBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const sidebarToggle = document.getElementById('sidebarToggleBtn');
  const sidebar = document.getElementById('appSidebar');
  const logoutBtn = document.getElementById('logoutActionBtn');

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('show');
      if (profileDropdown) profileDropdown.classList.remove('show');
    });
  }

  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('show');
      if (notifDropdown) notifDropdown.classList.remove('show');
    });
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to log out of AttendSync?')) {
        Auth.logout();
      }
    });
  }

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    if (notifDropdown) notifDropdown.classList.remove('show');
    if (profileDropdown) profileDropdown.classList.remove('show');
  });

  // Global DSA Hash Table Search Implementation in Topbar
  const searchInput = document.getElementById('globalSearchInput');
  const searchDropdown = document.getElementById('searchDropdown');

  if (searchInput && searchDropdown) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        searchDropdown.classList.remove('show');
        searchDropdown.innerHTML = '';
        return;
      }

      // 1. Try exact Hash Table search if query resembles ID (EMPxxx)
      let hashResult = null;
      if (query.toUpperCase().startsWith('EMP')) {
        hashResult = globalEmployeeHashTable.search(query.toUpperCase());
      }

      // 2. Perform array search for partial name / ID matching
      const employees = Storage.getEmployees();
      const matches = employees.filter(emp => 
        emp.name.toLowerCase().includes(query.toLowerCase()) || 
        emp.id.toLowerCase().includes(query.toLowerCase()) ||
        emp.department.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6);

      let html = '';
      if (hashResult && hashResult.found) {
        html += `
          <div style="padding: 6px 12px; background-color: #ecfdf5; border-bottom: 1px solid #a7f3d0; font-size: 11px; color: #065f46;">
            <strong>⚡ DSA Hash Match:</strong> Bucket #${hashResult.finalIndex} (${hashResult.probesCount} probe${hashResult.probesCount > 1 ? 's' : ''}${hashResult.collided ? ' - Linear Probed' : ''})
          </div>
        `;
      }

      if (matches.length === 0) {
        html += `<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12px;">No matching employees found in database</div>`;
      } else {
        matches.forEach(emp => {
          html += `
            <a href="employee-profile.html?id=${emp.id}" class="dropdown-item">
              <div class="item-title">
                <span><strong>${emp.name}</strong> <span style="font-size: 11px; color: var(--text-muted);">(${emp.id})</span></span>
                <span class="badge badge-blue">${emp.department}</span>
              </div>
              <div class="item-meta">${emp.designation} • Shift: ${emp.shift}</div>
            </a>
          `;
        });
      }

      searchDropdown.innerHTML = html;
      searchDropdown.classList.add('show');
    });

    // Enter key navigation
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          const hashRes = globalEmployeeHashTable.search(query);
          if (hashRes.found) {
            window.location.href = `employee-profile.html?id=${hashRes.employee.id}`;
          } else {
            window.location.href = `employees.html?search=${encodeURIComponent(query)}`;
          }
        }
      }
    });
  }
}
