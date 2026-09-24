/**
 * AttendSync – Settings & DSA Visualizer Logic
 * Handles configuration management, factory data reset, and interactive Hash Table simulation.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('settings');
  initSettingsPage();
});

function initSettingsPage() {
  loadCurrentSettings();
  setupSettingsListeners();
  renderHashGrid();
  simulateHashSearch('EMP106');
}

function loadCurrentSettings() {
  const settings = Storage.getSettings();
  document.getElementById('settingLowAtt').value = settings.lowAttendanceThreshold || 75;
  document.getElementById('settingConsecLimit').value = settings.consecutiveAbsenceLimit || 3;
  document.getElementById('settingLateLimit').value = settings.lateArrivalLimit || 4;
  document.getElementById('settingHours').value = settings.standardWorkingHours || 9;
  document.getElementById('settingGrace').value = settings.gracePeriodMinutes || 15;
  document.getElementById('settingSupervisor').value = settings.supervisorName || 'Mo Asif';
}

function renderHashGrid(highlightIndices = [], matchedIndex = -1) {
  const grid = document.getElementById('hashGridVisualizer');
  if (!grid) return;

  const sampleSize = 32; // Display first 32 buckets
  let html = '';

  for (let i = 0; i < sampleSize; i++) {
    const slotData = globalEmployeeHashTable.table[i];
    let slotClass = 'hash-slot';
    let content = `<strong>#${i}</strong><br><span style="color: #94a3b8;">[Empty]</span>`;

    if (slotData) {
      slotClass += ' occupied';
      content = `<strong>#${i}</strong><br><span style="color: var(--color-navy); font-weight: 600;">${slotData.id}</span>`;
    }

    if (highlightIndices.includes(i)) {
      slotClass += ' probed';
      content = `<strong>#${i}</strong><br><span style="color: #92400e;">Probe Step</span>`;
    }

    if (i === matchedIndex) {
      slotClass = 'hash-slot matched';
      content = `<strong>#${i}</strong><br><span style="color: #166534;">✓ MATCH</span>`;
    }

    html += `<div class="${slotClass}">${content}</div>`;
  }

  grid.innerHTML = html;
}

function simulateHashSearch(empId) {
  const outputBox = document.getElementById('hashSimOutputBox');
  if (!empId) return;

  const res = globalEmployeeHashTable.search(empId.toUpperCase());
  if (res.found) {
    outputBox.className = 'alert-box alert-success';
    outputBox.innerHTML = `
      <div>
        <strong>✓ Search Successful:</strong> Employee <code>${res.employee.name}</code> (${res.employee.id}) found in Hash Table.
        <div style="margin-top: 4px; font-size: 11.5px; line-height: 1.5;">
          • Key: <strong>${empId.toUpperCase()}</strong> | Table Capacity: <strong>97 Prime Buckets</strong><br>
          • Computed Hash Index: <strong>#${res.initialIndex}</strong><br>
          • Probing Path: <code>${res.probePath.map(p => `#${p}`).join(' → ')}</code> (Total Probes: <strong>${res.probesCount}</strong>)<br>
          • Collision Status: ${res.collided ? '<span class="badge badge-medium-risk">Collision Resolved via Linear Probing (i + 1) % N</span>' : '<span class="badge badge-low-risk">Direct O(1) Hit (Zero Collisions)</span>'}<br>
          • Associated Record: <strong>${res.employee.designation} • ${res.employee.department} Department</strong>
        </div>
      </div>
    `;
    renderHashGrid(res.probePath, res.finalIndex);
  } else {
    outputBox.className = 'alert-box alert-danger';
    outputBox.innerHTML = `
      <div>
        <strong>✕ Employee Key Not Found:</strong> Could not locate record with ID <code>${empId.toUpperCase()}</code>.
        <div style="margin-top: 4px; font-size: 11.5px;">
          Calculated Hash: #${res.initialIndex} • Probed: ${res.probePath.map(p => `#${p}`).join(' → ')}
        </div>
      </div>
    `;
    renderHashGrid(res.probePath);
  }
}

function setupSettingsListeners() {
  document.getElementById('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const settings = {
      systemName: 'AttendSync',
      lowAttendanceThreshold: parseInt(document.getElementById('settingLowAtt').value) || 75,
      consecutiveAbsenceLimit: parseInt(document.getElementById('settingConsecLimit').value) || 3,
      lateArrivalLimit: parseInt(document.getElementById('settingLateLimit').value) || 4,
      standardWorkingHours: parseInt(document.getElementById('settingHours').value) || 9,
      gracePeriodMinutes: parseInt(document.getElementById('settingGrace').value) || 15,
      supervisorName: document.getElementById('settingSupervisor').value.trim() || 'Mo Asif',
      supervisorEmail: 'supervisor@attendsync.com',
      departmentScope: 'All Departments'
    };

    Storage.saveSettings(settings);
    showToast('System operational settings saved successfully!', 'success');
  });

  // Simulator Buttons
  document.getElementById('runHashSimBtn').addEventListener('click', () => {
    const val = document.getElementById('simEmpIdInput').value.trim();
    if (!val) {
      alert('Please enter an Employee ID (e.g. EMP101, EMP106).');
      return;
    }
    simulateHashSearch(val);
  });

  document.getElementById('testCollisionBtn').addEventListener('click', () => {
    // Find an employee whose initial index has collision
    const employees = Storage.getEmployees();
    let collisionEmp = null;
    for (const emp of employees) {
      const res = globalEmployeeHashTable.search(emp.id);
      if (res.collided) {
        collisionEmp = emp;
        break;
      }
    }

    if (collisionEmp) {
      document.getElementById('simEmpIdInput').value = collisionEmp.id;
      simulateHashSearch(collisionEmp.id);
    } else {
      document.getElementById('simEmpIdInput').value = 'EMP121';
      simulateHashSearch('EMP121');
    }
  });

  // Reset Demo Data Handlers
  const handleReset = () => {
    if (confirm('WARNING: Are you sure you want to reset all 50 employees, 30 days of attendance records, leaves, regularizations, and audit logs to the initial demo state?')) {
      Storage.resetDemoData();
      globalEmployeeHashTable.buildFromArray(Storage.getEmployees());
      alert('All demo data has been restored to factory seed state.');
      window.location.href = 'dashboard.html';
    }
  };

  document.getElementById('resetDemoDataBtn').addEventListener('click', handleReset);
  const topResetBtn = document.getElementById('resetDemoDataTopBtn');
  if (topResetBtn) topResetBtn.addEventListener('click', handleReset);
}
