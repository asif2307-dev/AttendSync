/**
 * AttendSync – Shift Management & Coverage Logic
 * Calculates shift allocations, identifies understaffing deficits, and handles reassignment workflows.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('shifts');
  initShiftsPage();
});

function initShiftsPage() {
  loadShiftsData();
  setupShiftListeners();
  populateReassignDropdown();
}

function loadShiftsData() {
  const employees = Storage.getEmployees();
  const attendance = Storage.getAttendance();

  // Calculate actual employee counts per shift
  const shiftCounts = {
    Morning: employees.filter(e => e.shift === 'Morning').length,
    Evening: employees.filter(e => e.shift === 'Evening').length,
    Night: employees.filter(e => e.shift === 'Night').length
  };

  const shiftConfigs = [
    { name: 'Morning Shift', code: 'Morning', time: '09:00 AM – 06:00 PM', min: 20, count: shiftCounts.Morning, desc: 'Core business & client liaison hours' },
    { name: 'Evening Shift', code: 'Evening', time: '02:00 PM – 11:00 PM', min: 15, count: shiftCounts.Evening, desc: 'Support, deployment & evening dispatch' },
    { name: 'Night Shift', code: 'Night', time: '10:00 PM – 07:00 AM', min: 10, count: shiftCounts.Night, desc: 'Infrastructure, batch jobs & security ops' }
  ];

  // Render Shift Cards
  const cardsContainer = document.getElementById('shiftCardsContainer');
  let cardsHtml = '';

  shiftConfigs.forEach(s => {
    const isUnderstaffed = s.count < s.min;
    const badgeClass = isUnderstaffed ? 'badge-high-risk' : 'badge-low-risk';
    const statusText = isUnderstaffed ? `Understaffed (${s.min - s.count} Short)` : 'Adequately Staffed';

    cardsHtml += `
      <div class="card" style="border-top: 3px solid ${isUnderstaffed ? 'var(--status-absent)' : 'var(--status-present)'};">
        <div class="card-header">
          <h3 class="card-title">${s.name}</h3>
          <span class="badge ${badgeClass}">${statusText}</span>
        </div>
        <div class="card-body">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">⏰ ${s.time}</div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
            <span style="font-size: 26px; font-weight: 700; color: var(--color-navy);">${s.count}</span>
            <span style="font-size: 11.5px; color: var(--text-muted);">Required Min: <strong>${s.min}</strong></span>
          </div>
          <div class="progress-bar-container" style="margin-bottom: 8px;">
            <div class="progress-bar-fill ${isUnderstaffed ? 'fill-red' : 'fill-green'}" style="width: ${Math.min(100, (s.count / s.min) * 100)}%;"></div>
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">${s.desc}</div>
        </div>
      </div>
    `;
  });

  cardsContainer.innerHTML = cardsHtml;

  // Render Roster Table
  renderShiftRosterTable(employees, attendance);
}

function renderShiftRosterTable(employees, attendance) {
  const filterVal = document.getElementById('shiftTableFilter').value;
  const filtered = employees.filter(e => filterVal === 'ALL' || e.shift === filterVal);

  const countBadge = document.getElementById('rosterFilterCount');
  if (countBadge) countBadge.textContent = `${filtered.length} Employees`;

  const tbody = document.getElementById('shiftRosterTableBody');
  let html = '';

  const shiftTimes = {
    Morning: '09:00 AM – 06:00 PM',
    Evening: '02:00 PM – 11:00 PM',
    Night: '10:00 PM – 07:00 AM'
  };

  filtered.forEach(emp => {
    const stats = RiskCalculator.calculateStats(emp.id, attendance);
    html += `
      <tr>
        <td><strong><a href="employee-profile.html?id=${emp.id}">${emp.id}</a></strong></td>
        <td>
          <a href="employee-profile.html?id=${emp.id}" style="font-weight: 600; color: var(--color-navy);">${emp.name}</a>
        </td>
        <td><span class="badge badge-blue">${emp.department}</span></td>
        <td>${emp.designation}</td>
        <td><strong>${emp.shift} Shift</strong></td>
        <td style="font-size: 11.5px; color: var(--text-muted);">${shiftTimes[emp.shift] || '-'}</td>
        <td>
          <span class="badge ${stats.badgeClass}">${stats.attendancePercentage}% (${stats.riskLevel})</span>
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-secondary btn-sm quick-reassign-btn" data-id="${emp.id}" data-name="${emp.name}" data-shift="${emp.shift}">
            Reassign Shift
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  document.querySelectorAll('.quick-reassign-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('reassignEmpSelect').value = btn.dataset.id;
      openModal('reassignShiftModal');
    });
  });
}

function populateReassignDropdown() {
  const select = document.getElementById('reassignEmpSelect');
  if (!select) return;

  const employees = Storage.getEmployees();
  select.innerHTML = employees.map(e => `<option value="${e.id}">${e.name} (${e.id}) — Currently ${e.shift} Shift</option>`).join('');
}

function setupShiftListeners() {
  document.getElementById('shiftTableFilter').addEventListener('change', () => {
    loadShiftsData();
  });

  document.getElementById('openReassignModalBtn').addEventListener('click', () => {
    openModal('reassignShiftModal');
  });

  document.getElementById('reassignShiftForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const empId = document.getElementById('reassignEmpSelect').value;
    const targetShift = document.getElementById('reassignTargetShift').value;
    const reason = document.getElementById('reassignReason').value.trim();

    const emp = Storage.getEmployeeById(empId);
    if (!emp) return;

    const oldShift = emp.shift;
    emp.shift = targetShift;
    Storage.updateEmployee(emp);
    Storage.addAuditEntry('Shift Reassignment', `${emp.name} (${emp.id})`, `Reassigned from ${oldShift} to ${targetShift} Shift. Reason: ${reason || 'Supervisor adjustment'}`);

    closeModal('reassignShiftModal');
    showToast(`${emp.name} reassigned to ${targetShift} Shift!`, 'success');
    loadShiftsData();
  });
}
