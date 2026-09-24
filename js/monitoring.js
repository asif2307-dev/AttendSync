/**
 * AttendSync – Smart Monitoring & Anomaly Detection Logic
 * Evaluates rule-based constraints over employee attendance data and provides supervisor decision pathways.
 */

let anomalyList = [];

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('monitoring');
  initMonitoringPage();
});

function initMonitoringPage() {
  loadAnomalies();
  setupMonitoringListeners();
}

function loadAnomalies() {
  const employees = Storage.getEmployees();
  const attendance = Storage.getAttendance();
  const shifts = Storage.getShifts();

  anomalyList = [];
  let countLowAtt = 0;
  let countConsec = 0;
  let countLate = 0;
  let countMissing = 0;
  let countDrop = 0;
  let countShift = 0;

  // 1. Employee-level rule evaluation
  employees.forEach(emp => {
    const stats = RiskCalculator.calculateStats(emp.id, attendance);
    const empRecords = attendance.filter(a => a.employeeId === emp.id && a.status !== 'Weekly Off').sort((a, b) => new Date(a.date) - new Date(b.date));

    // Rule 1: Attendance below 75%
    if (stats.attendancePercentage < 75) {
      countLowAtt++;
      anomalyList.push({
        type: 'LOW_ATT',
        employeeId: emp.id,
        name: emp.name,
        department: emp.department,
        issue: 'Chronic Low Attendance (< 75%)',
        severity: 'High',
        evidence: `Overall attendance rate is ${stats.attendancePercentage}% across 30 days (${stats.absentCount} absent days recorded).`,
        recommendation: 'Issue written warning, conduct 1-on-1 counseling, or initiate HR performance review.',
        score: stats.riskScore
      });
    }

    // Rule 2: 3+ Consecutive Absences
    if (stats.maxConsecutiveAbsences >= 3) {
      countConsec++;
      anomalyList.push({
        type: 'CONSECUTIVE',
        employeeId: emp.id,
        name: emp.name,
        department: emp.department,
        issue: `${stats.maxConsecutiveAbsences} Consecutive Unannounced Absences`,
        severity: 'High',
        evidence: `Employee recorded ${stats.maxConsecutiveAbsences} consecutive absent days with no pre-approved leave.`,
        recommendation: 'Immediate telephone outreach & escalate incident to HR for welfare check.',
        score: stats.riskScore
      });
    }

    // Rule 3: Frequent Late Arrivals (>= 4)
    if (stats.lateCount >= 4) {
      countLate++;
      anomalyList.push({
        type: 'FREQUENT_LATE',
        employeeId: emp.id,
        name: emp.name,
        department: emp.department,
        issue: `Frequent Late Arrivals (${stats.lateCount} Days)`,
        severity: 'Medium',
        evidence: `Arrived past grace period (${stats.lateCount} times in last 30 days). Average delay ~35 minutes.`,
        recommendation: 'Counsel employee on punctuality policy & discuss shift/transit buffer adjustments.',
        score: stats.riskScore
      });
    }

    // Rule 4: Missing Punches
    if (stats.missingPunches >= 1) {
      countMissing++;
      anomalyList.push({
        type: 'MISSING_PUNCH',
        employeeId: emp.id,
        name: emp.name,
        department: emp.department,
        issue: `Incomplete Punch Record (${stats.missingPunches} Missing Swipes)`,
        severity: 'Medium',
        evidence: `Check-in recorded without matching out-swipe on biometric sensor.`,
        recommendation: 'Direct employee to submit punch regularization request with supervisor verification.',
        score: stats.riskScore
      });
    }

    // Rule 5: Sudden Attendance Drop (>15% drop over recent 2 weeks vs previous 2 weeks)
    if (empRecords.length >= 20) {
      const mid = Math.floor(empRecords.length / 2);
      const firstHalf = empRecords.slice(0, mid);
      const secondHalf = empRecords.slice(mid);

      const firstPres = firstHalf.filter(r => r.status === 'Present' || r.status === 'Late' || r.status === 'Work From Home').length;
      const secondPres = secondHalf.filter(r => r.status === 'Present' || r.status === 'Late' || r.status === 'Work From Home').length;

      const rate1 = (firstPres / firstHalf.length) * 100;
      const rate2 = (secondPres / secondHalf.length) * 100;

      if ((rate1 - rate2) >= 15) {
        countDrop++;
        anomalyList.push({
          type: 'SUDDEN_DROP',
          employeeId: emp.id,
          name: emp.name,
          department: emp.department,
          issue: `Sudden Attendance Velocity Decline (-${Math.round(rate1 - rate2)}%)`,
          severity: 'Medium',
          evidence: `Attendance dropped from ${Math.round(rate1)}% in earlier fortnight down to ${Math.round(rate2)}% recently.`,
          recommendation: 'Check with team supervisor for workload stress, medical concerns, or personal issues.',
          score: stats.riskScore
        });
      }
    }
  });

  // 2. Shift-level rule evaluation
  shifts.forEach(sh => {
    if (sh.assignedCount < sh.minRequired) {
      countShift++;
      anomalyList.push({
        type: 'SHIFT',
        employeeId: 'ROSTER',
        name: `${sh.name} Staffing`,
        department: 'Operations / Cross-dept',
        issue: `Shift Understaffing (${sh.assignedCount} / ${sh.minRequired} Required)`,
        severity: 'Medium',
        evidence: `${sh.name} (${sh.start} - ${sh.end}) has only ${sh.assignedCount} personnel assigned (deficit of ${sh.minRequired - sh.assignedCount}).`,
        recommendation: 'Rebalance shift roster by reassigning personnel from Morning shift or opening shift swap requests.',
        score: 45
      });
    }
  });

  // Update Summary Metric Cards
  document.getElementById('ruleLowAttCount').textContent = countLowAtt;
  document.getElementById('ruleConsecCount').textContent = countConsec;
  document.getElementById('ruleLateCount').textContent = countLate;
  document.getElementById('ruleMissingCount').textContent = countMissing;
  document.getElementById('ruleDropCount').textContent = countDrop;
  document.getElementById('ruleShiftCount').textContent = countShift;

  renderAnomalyTable();
}

function renderAnomalyTable() {
  const catVal = document.getElementById('ruleCategoryFilter').value;
  const deptVal = document.getElementById('monDeptFilter').value;
  const searchVal = document.getElementById('monSearchInput').value.trim().toLowerCase();

  const filtered = anomalyList.filter(item => {
    const matchCat = catVal === 'ALL' || item.type === catVal;
    const matchDept = deptVal === 'ALL' || item.department.includes(deptVal);
    const matchSearch = !searchVal ||
      item.name.toLowerCase().includes(searchVal) ||
      item.employeeId.toLowerCase().includes(searchVal) ||
      item.issue.toLowerCase().includes(searchVal) ||
      item.evidence.toLowerCase().includes(searchVal);

    return matchCat && matchDept && matchSearch;
  });

  const tbody = document.getElementById('monitoringTableBody');
  const countBadge = document.getElementById('monTotalBadge');
  if (countBadge) countBadge.textContent = `${filtered.length} Flagged Case(s)`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">No anomalies match selected filter. System conditions normal.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach(item => {
    const isHigh = item.severity === 'High';
    const rowClass = isHigh ? 'row-high-risk' : 'row-medium-risk';
    const badgeClass = isHigh ? 'badge-high-risk' : 'badge-medium-risk';

    html += `
      <tr class="${rowClass}">
        <td><strong>${item.employeeId === 'ROSTER' ? 'ROSTER' : `<a href="employee-profile.html?id=${item.employeeId}">${item.employeeId}</a>`}</strong></td>
        <td>
          ${item.employeeId === 'ROSTER' ? `<strong>${item.name}</strong>` : `<a href="employee-profile.html?id=${item.employeeId}" style="font-weight: 600; color: var(--color-navy);">${item.name}</a>`}
        </td>
        <td><span class="badge badge-blue">${item.department}</span></td>
        <td style="font-weight: 600; color: ${isHigh ? 'var(--status-absent)' : '#92400e'};">${item.issue}</td>
        <td><span class="badge ${badgeClass}">${item.severity}</span></td>
        <td style="font-size: 11.5px; max-width: 260px;">${item.evidence}</td>
        <td style="font-size: 11.5px; color: var(--text-navy); font-weight: 500;">${item.recommendation}</td>
        <td style="text-align: center;">
          ${item.employeeId === 'ROSTER' ? 
            `<a href="shifts.html" class="btn btn-secondary btn-sm">Manage Shift</a>` : 
            `<button type="button" class="btn btn-primary btn-sm open-mon-action-btn"
              data-id="${item.employeeId}"
              data-name="${item.name}"
              data-dept="${item.department}"
              data-issue="${item.issue}"
              data-rec="${item.recommendation}">
              Take Action
            </button>`
          }
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  document.querySelectorAll('.open-mon-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, name, dept, issue, rec } = btn.dataset;
      openMonModal(id, name, dept, issue, rec);
    });
  });
}

function openMonModal(id, name, dept, issue, rec) {
  document.getElementById('monEmpId').value = id;
  document.getElementById('monEmpName').value = name;
  document.getElementById('monIssue').value = issue;
  document.getElementById('monEmpDetails').textContent = `${name} (${id}) — ${dept} Department`;
  
  const alertBox = document.getElementById('monModalAlert');
  alertBox.innerHTML = `
    <div>
      <strong>Identified Problem:</strong> ${issue}
      <div style="font-size: 11px; margin-top: 3px; color: var(--text-main);">
        <strong>Recommended Strategy:</strong> ${rec}
      </div>
    </div>
  `;

  document.getElementById('monActionRemark').value = '';
  openModal('monActionModal');
}

function setupMonitoringListeners() {
  document.getElementById('ruleCategoryFilter').addEventListener('change', renderAnomalyTable);
  document.getElementById('monDeptFilter').addEventListener('change', renderAnomalyTable);
  document.getElementById('monSearchInput').addEventListener('input', renderAnomalyTable);

  document.getElementById('resetMonFilterBtn').addEventListener('click', () => {
    document.getElementById('ruleCategoryFilter').value = 'ALL';
    document.getElementById('monDeptFilter').value = 'ALL';
    document.getElementById('monSearchInput').value = '';
    renderAnomalyTable();
  });

  document.getElementById('saveMonActionBtn').addEventListener('click', () => {
    const empId = document.getElementById('monEmpId').value;
    const empName = document.getElementById('monEmpName').value;
    const issue = document.getElementById('monIssue').value;
    const decision = document.getElementById('monActionDecision').value;
    const remark = document.getElementById('monActionRemark').value.trim();

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

    closeModal('monActionModal');
    showToast(`Decision recorded: ${decision} for ${empName}`, 'success');
    loadAnomalies();
  });
}
