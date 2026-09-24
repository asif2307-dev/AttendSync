/**
 * AttendSync – Alerts & Risk Engine Logic
 * Evaluates risk score formulas, manages the supervisor alert queue, and handles resolution flows.
 */

let alertsData = [];

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('alerts');
  initAlertsPage();
});

function initAlertsPage() {
  loadAlerts();
  setupAlertsListeners();
}

function loadAlerts() {
  const employees = Storage.getEmployees();
  const attendance = Storage.getAttendance();

  alertsData = [];
  let highCount = 0;
  let medCount = 0;
  let lowCount = 0;

  employees.forEach(emp => {
    const stats = RiskCalculator.calculateStats(emp.id, attendance);
    if (stats.riskLevel === 'High') highCount++;
    else if (stats.riskLevel === 'Medium') medCount++;
    else lowCount++;

    alertsData.push({
      employee: emp,
      stats: stats
    });
  });

  // Update Top Metric Cards
  document.getElementById('countHighAlerts').textContent = highCount;
  document.getElementById('countMedAlerts').textContent = medCount;
  document.getElementById('countLowAlerts').textContent = lowCount;
  document.getElementById('countTotalEvaluated').textContent = employees.length;

  renderAlertsTable();
}

function renderAlertsTable() {
  const sevVal = document.getElementById('alertSeverityFilter').value;
  const deptVal = document.getElementById('alertDeptFilter').value;
  const searchVal = document.getElementById('alertSearchInput').value.trim().toLowerCase();

  let filtered = alertsData.filter(item => {
    const matchSev = sevVal === 'ALL' || item.stats.riskLevel === sevVal;
    const matchDept = deptVal === 'ALL' || item.employee.department === deptVal;
    const matchSearch = !searchVal ||
      item.employee.name.toLowerCase().includes(searchVal) ||
      item.employee.id.toLowerCase().includes(searchVal) ||
      item.stats.reasons.join(' ').toLowerCase().includes(searchVal);

    return matchSev && matchDept && matchSearch;
  });

  // Sort by risk score descending
  filtered.sort((a, b) => b.stats.riskScore - a.stats.riskScore);

  const tbody = document.getElementById('alertsTableBody');
  const countBadge = document.getElementById('alertQueueCountBadge');
  if (countBadge) countBadge.textContent = `${filtered.length} Employee Alert(s)`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">No alerts match the selected criteria.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach(({ employee, stats }) => {
    const isHigh = stats.riskLevel === 'High';
    const isMed = stats.riskLevel === 'Medium';
    const rowClass = isHigh ? 'row-high-risk' : (isMed ? 'row-medium-risk' : '');
    const badgeClass = stats.badgeClass;

    const mainIssue = stats.reasons[0] || 'Regular attendance pattern';

    html += `
      <tr class="${rowClass}">
        <td><strong><a href="employee-profile.html?id=${employee.id}">${employee.id}</a></strong></td>
        <td>
          <a href="employee-profile.html?id=${employee.id}" style="font-weight: 600; color: var(--color-navy);">${employee.name}</a>
          <div style="font-size: 11px; color: var(--text-muted);">${employee.designation}</div>
        </td>
        <td><span class="badge badge-blue">${employee.department}</span></td>
        <td style="text-align: center;">
          <strong style="font-size: 14px; color: ${isHigh ? 'var(--status-absent)' : (isMed ? 'var(--status-late)' : 'var(--status-present)')};">
            ${stats.riskScore}
          </strong>
        </td>
        <td><span class="badge ${badgeClass}">${stats.riskLevel}</span></td>
        <td>
          <div style="font-weight: 600; color: ${isHigh ? 'var(--status-absent)' : '#92400e'};">${mainIssue}</div>
          <div style="font-size: 11px; color: var(--text-muted);">Att: ${stats.attendancePercentage}% | Absences: ${stats.absentCount} | Late: ${stats.lateCount} | Missed: ${stats.missingPunches}</div>
        </td>
        <td style="font-size: 11.5px; color: var(--text-navy); font-weight: 500;">
          ${stats.recommendedAction}
        </td>
        <td style="text-align: center;">
          <div style="display: inline-flex; gap: 4px;">
            <a href="employee-profile.html?id=${employee.id}" class="btn btn-secondary btn-sm" title="Inspect Full Record">Profile</a>
            <button type="button" class="btn btn-primary btn-sm open-alert-action-btn"
              data-id="${employee.id}"
              data-name="${employee.name}"
              data-dept="${employee.department}"
              data-issue="${mainIssue}"
              data-score="${stats.riskScore}"
              data-rec="${stats.recommendedAction}">
              Take Action
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  document.querySelectorAll('.open-alert-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, name, dept, issue, score, rec } = btn.dataset;
      openAlertActionModal(id, name, dept, issue, score, rec);
    });
  });
}

function openAlertActionModal(id, name, dept, issue, score, rec) {
  document.getElementById('alertEmpId').value = id;
  document.getElementById('alertEmpName').value = name;
  document.getElementById('alertIssueText').value = issue;
  document.getElementById('alertEmployeeLabel').textContent = `${name} (${id}) — ${dept} Department (Score: ${score})`;

  const box = document.getElementById('alertProblemBox');
  box.innerHTML = `
    <div>
      <strong>Triggering Issue:</strong> ${issue} (Risk Score: <strong>${score}</strong>)
      <div style="font-size: 11px; margin-top: 3px; color: var(--text-main);">
        <strong>Recommended Protocol:</strong> ${rec}
      </div>
    </div>
  `;

  document.getElementById('alertSupervisorRemark').value = '';
  openModal('alertDialogActionModal');
}

function setupAlertsListeners() {
  document.getElementById('alertSeverityFilter').addEventListener('change', renderAlertsTable);
  document.getElementById('alertDeptFilter').addEventListener('change', renderAlertsTable);
  document.getElementById('alertSearchInput').addEventListener('input', renderAlertsTable);

  document.getElementById('resetAlertsBtn').addEventListener('click', () => {
    document.getElementById('alertSeverityFilter').value = 'ALL';
    document.getElementById('alertDeptFilter').value = 'ALL';
    document.getElementById('alertSearchInput').value = '';
    renderAlertsTable();
  });

  document.getElementById('saveAlertActionBtn').addEventListener('click', () => {
    const empId = document.getElementById('alertEmpId').value;
    const empName = document.getElementById('alertEmpName').value;
    const issue = document.getElementById('alertIssueText').value;
    const decision = document.getElementById('alertSupervisorDecision').value;
    const remark = document.getElementById('alertSupervisorRemark').value.trim();

    if (!remark) {
      alert('Please enter supervisor justification notes before saving.');
      return;
    }

    Storage.addSupervisorAction({
      employeeId: empId,
      employeeName: empName,
      issue: issue,
      action: decision,
      remark: remark,
      status: decision === 'Escalated to HR' ? 'Escalated' : (decision === 'Supervisor Follow-up' ? 'Follow-up Scheduled' : 'Resolved')
    });

    closeModal('alertDialogActionModal');
    showToast(`Decision recorded: ${decision} for ${empName}`, 'success');
    loadAlerts();
  });
}
