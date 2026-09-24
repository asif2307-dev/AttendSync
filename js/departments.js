/**
 * AttendSync – Department Management & Analytics Logic
 * Aggregates department metrics and handles department roster exploration.
 */

let activeDept = 'IT';

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('departments');
  initDepartmentsPage();
});

function initDepartmentsPage() {
  loadDepartmentOverview();
  setupDepartmentListeners();
}

function loadDepartmentOverview() {
  const employees = Storage.getEmployees();
  const attendance = Storage.getAttendance();
  const todayStr = '2026-09-21';
  const todayAtt = attendance.filter(a => a.date === todayStr);

  const departments = ['IT', 'HR', 'Finance', 'Sales', 'Operations'];
  const grid = document.getElementById('departmentCardsGrid');
  let gridHtml = '';

  departments.forEach(dept => {
    const deptEmps = employees.filter(e => e.department === dept);
    const count = deptEmps.length;

    // Today's attendance counts
    const dToday = todayAtt.filter(a => deptEmps.some(e => e.id === a.employeeId));
    const presToday = dToday.filter(a => a.status === 'Present' || a.status === 'Late' || a.status === 'Work From Home').length;
    const absToday = dToday.filter(a => a.status === 'Absent').length;
    const lateToday = dToday.filter(a => a.status === 'Late').length;

    // 30-day average
    let totalAtt = 0;
    let highRiskCount = 0;
    deptEmps.forEach(emp => {
      const stats = RiskCalculator.calculateStats(emp.id, attendance);
      totalAtt += stats.attendancePercentage;
      if (stats.riskLevel === 'High') highRiskCount++;
    });

    const avgAtt = count > 0 ? Math.round((totalAtt / count) * 10) / 10 : 0;
    const isSelected = dept === activeDept;

    gridHtml += `
      <div class="card dept-select-card" data-dept="${dept}" style="cursor: pointer; border: ${isSelected ? '2px solid var(--color-blue-primary)' : '1px solid var(--color-border)'};">
        <div class="card-header">
          <h3 class="card-title">🏢 ${dept} Department</h3>
          <span class="badge ${avgAtt < 75 ? 'badge-high-risk' : (avgAtt < 85 ? 'badge-medium-risk' : 'badge-low-risk')}">${avgAtt}% Avg</span>
        </div>
        <div class="card-body">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
            <span>Staff Headcount: <strong>${count}</strong></span>
            <span>High Risk: <strong style="color: ${highRiskCount > 0 ? 'var(--status-absent)' : 'inherit'};">${highRiskCount}</strong></span>
          </div>

          <div class="progress-bar-container" style="margin-bottom: 10px;">
            <div class="progress-bar-fill ${avgAtt < 75 ? 'fill-red' : (avgAtt < 85 ? 'fill-yellow' : 'fill-green')}" style="width: ${avgAtt}%;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--color-border-light); padding-top: 6px;">
            <span>Present: <strong>${presToday}</strong></span>
            <span>Absent: <strong style="color: var(--status-absent);">${absToday}</strong></span>
            <span>Late: <strong style="color: var(--status-late);">${lateToday}</strong></span>
          </div>
        </div>
      </div>
    `;
  });

  grid.innerHTML = gridHtml;

  // Bind click on cards
  document.querySelectorAll('.dept-select-card').forEach(card => {
    card.addEventListener('click', () => {
      activeDept = card.dataset.dept;
      document.getElementById('switchDeptSelect').value = activeDept;
      loadDepartmentOverview();
      renderDeptRoster();
    });
  });

  renderDeptRoster();
}

function renderDeptRoster() {
  const employees = Storage.getEmployees();
  const attendance = Storage.getAttendance();

  const deptEmps = employees.filter(e => e.department === activeDept);
  document.getElementById('selectedDeptTitle').textContent = `📋 ${activeDept} Department Personnel Roster`;
  document.getElementById('deptEmpCountBadge').textContent = `${deptEmps.length} Employees`;

  const tbody = document.getElementById('deptRosterTableBody');
  let html = '';

  deptEmps.forEach(emp => {
    const stats = RiskCalculator.calculateStats(emp.id, attendance);
    html += `
      <tr>
        <td><strong><a href="employee-profile.html?id=${emp.id}">${emp.id}</a></strong></td>
        <td>
          <a href="employee-profile.html?id=${emp.id}" style="font-weight: 600; color: var(--color-navy);">${emp.name}</a>
        </td>
        <td>${emp.designation}</td>
        <td><span class="badge" style="background-color: #f1f5f9; color: var(--text-main); border: 1px solid #cbd5e1;">${emp.shift}</span></td>
        <td style="font-size: 11.5px;">${emp.email}</td>
        <td style="font-size: 11px; color: var(--text-muted);">${emp.phone}</td>
        <td style="text-align: center;">
          <strong style="color: ${stats.attendancePercentage < 75 ? 'var(--status-absent)' : (stats.attendancePercentage < 85 ? 'var(--status-late)' : 'var(--status-present)')};">
            ${stats.attendancePercentage}%
          </strong>
        </td>
        <td style="text-align: center;">
          <span class="badge ${stats.badgeClass}">${stats.riskScore} (${stats.riskLevel})</span>
        </td>
        <td style="text-align: center;">
          <a href="employee-profile.html?id=${emp.id}" class="btn btn-secondary btn-sm">Profile →</a>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function setupDepartmentListeners() {
  const switchSelect = document.getElementById('switchDeptSelect');
  if (switchSelect) {
    switchSelect.addEventListener('change', (e) => {
      activeDept = e.target.value;
      loadDepartmentOverview();
    });
  }
}
