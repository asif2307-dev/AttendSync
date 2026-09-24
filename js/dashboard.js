/**
 * AttendSync – Supervisor Dashboard Engine
 * Computes all metrics from underlying 50-employee dataset in real-time.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('dashboard');
  loadDashboardData();
  setupActionModal();
});

function loadDashboardData() {
  const employees = Storage.getEmployees();
  const attendance = Storage.getAttendance();
  const leaves = Storage.getLeaves();
  const regularizations = Storage.getRegularizations();
  const supervisorActions = Storage.getSupervisorActions();

  // 1. Date Context (Today = 2026-09-21)
  const todayStr = '2026-09-21';
  const todayAttendance = attendance.filter(a => a.date === todayStr);

  // If today's attendance has records
  let presentToday = 0;
  let absentToday = 0;
  let lateToday = 0;
  let leaveToday = 0;
  let wfhToday = 0;
  let halfDayToday = 0;

  todayAttendance.forEach(a => {
    if (a.status === 'Present') presentToday++;
    else if (a.status === 'Late') { lateToday++; presentToday++; }
    else if (a.status === 'Absent') absentToday++;
    else if (a.status === 'Leave') leaveToday++;
    else if (a.status === 'Work From Home') { wfhToday++; presentToday++; }
    else if (a.status === 'Half Day') { halfDayToday++; presentToday += 0.5; }
  });

  const totalEmployees = employees.length || 50;
  const presentPct = Math.round((presentToday / totalEmployees) * 100 * 10) / 10;

  // 2. Risk Evaluation for All 50 Employees
  const employeeRiskStats = [];
  let highRiskCount = 0;
  let mediumRiskCount = 0;

  employees.forEach(emp => {
    const stats = RiskCalculator.calculateStats(emp.id, attendance);
    if (stats.riskLevel === 'High') highRiskCount++;
    if (stats.riskLevel === 'Medium') mediumRiskCount++;
    employeeRiskStats.push({ employee: emp, stats });
  });

  // 3. Update KPI Tiles in DOM
  const elTotal = document.getElementById('kpiTotalEmployees');
  const elPresent = document.getElementById('kpiPresentToday');
  const elPresentPct = document.getElementById('kpiPresentPct');
  const elAbsent = document.getElementById('kpiAbsentToday');
  const elLate = document.getElementById('kpiLateToday');
  const elLeave = document.getElementById('kpiLeaveToday');
  const elHighRisk = document.getElementById('kpiHighRisk');

  if (elTotal) elTotal.textContent = totalEmployees;
  if (elPresent) elPresent.textContent = Math.round(presentToday);
  if (elPresentPct) elPresentPct.textContent = `${presentPct}% Rate`;
  if (elAbsent) elAbsent.textContent = absentToday;
  if (elLate) elLate.textContent = lateToday;
  if (elLeave) elLeave.textContent = leaveToday;
  if (elHighRisk) elHighRisk.textContent = highRiskCount;

  // 4. Update Today's Breakdown Progress Bars
  const elBrkPresent = document.getElementById('breakdownPresentCount');
  const elBrkLate = document.getElementById('breakdownLateCount');
  const elBrkAbsent = document.getElementById('breakdownAbsentCount');
  const elBrkLeave = document.getElementById('breakdownLeaveCount');
  const elBrkWfh = document.getElementById('breakdownWfhCount');

  if (elBrkPresent) elBrkPresent.textContent = Math.round(presentToday - lateToday - wfhToday);
  if (elBrkLate) elBrkLate.textContent = lateToday;
  if (elBrkAbsent) elBrkAbsent.textContent = absentToday;
  if (elBrkLeave) elBrkLeave.textContent = leaveToday;
  if (elBrkWfh) elBrkWfh.textContent = wfhToday;

  const barPresent = document.getElementById('barPresent');
  const barLate = document.getElementById('barLate');
  const barAbsent = document.getElementById('barAbsent');
  const barLeave = document.getElementById('barLeave');
  const barWfh = document.getElementById('barWfh');

  if (barPresent) barPresent.style.width = `${((presentToday - lateToday - wfhToday) / totalEmployees) * 100}%`;
  if (barLate) barLate.style.width = `${(lateToday / totalEmployees) * 100}%`;
  if (barAbsent) barAbsent.style.width = `${(absentToday / totalEmployees) * 100}%`;
  if (barLeave) barLeave.style.width = `${(leaveToday / totalEmployees) * 100}%`;
  if (barWfh) barWfh.style.width = `${(wfhToday / totalEmployees) * 100}%`;

  // 5. Update Pending Queue Counters
  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
  const pendingRegs = regularizations.filter(r => r.status === 'Pending').length;
  const elQueueLeaves = document.getElementById('queuePendingLeaves');
  const elQueueRegs = document.getElementById('queuePendingRegs');

  if (elQueueLeaves) elQueueLeaves.textContent = `${pendingLeaves} Pending`;
  if (elQueueRegs) elQueueRegs.textContent = `${pendingRegs} Pending`;

  // 6. Populate "Employees Requiring Attention" Table
  renderAttentionTable(employeeRiskStats);

  // 7. Render 30-Day Trend Chart
  renderAttendanceTrendChart(attendance);

  // 8. Render Department Stats Comparison
  renderDepartmentComparison(employees, attendance);

  // 9. Render Recent Supervisor Actions
  renderRecentActions(supervisorActions);
}

// Render Attention Table (Filtered to High & Medium Risk)
function renderAttentionTable(riskData) {
  const tbody = document.getElementById('attentionTableBody');
  if (!tbody) return;

  // Sort by risk score descending
  const flagged = riskData
    .filter(item => item.stats.riskLevel === 'High' || item.stats.riskLevel === 'Medium')
    .sort((a, b) => b.stats.riskScore - a.stats.riskScore)
    .slice(0, 8); // Top 8 items for clean dashboard presentation

  if (flagged.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">No employees currently flagged for supervisor attention. Good attendance health!</td></tr>`;
    return;
  }

  let html = '';
  flagged.forEach(({ employee, stats }) => {
    const mainIssue = stats.reasons[0] || 'Irregular attendance pattern';
    const rowClass = stats.riskLevel === 'High' ? 'row-high-risk' : 'row-medium-risk';

    html += `
      <tr class="${rowClass}">
        <td><strong><a href="employee-profile.html?id=${employee.id}">${employee.id}</a></strong></td>
        <td>
          <a href="employee-profile.html?id=${employee.id}" style="font-weight: 600; color: var(--color-navy);">${employee.name}</a>
          <div style="font-size: 11px; color: var(--text-muted);">${employee.designation}</div>
        </td>
        <td><span class="badge badge-blue">${employee.department}</span></td>
        <td>
          <div style="font-weight: 600; color: ${stats.riskLevel === 'High' ? 'var(--status-absent)' : '#92400e'};">${mainIssue}</div>
          <div style="font-size: 11px; color: var(--text-muted);">Att: ${stats.attendancePercentage}% | Late: ${stats.lateCount} | Max Absences: ${stats.maxConsecutiveAbsences}</div>
        </td>
        <td>
          <span class="badge ${stats.badgeClass}">Score: ${stats.riskScore} (${stats.riskLevel})</span>
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-primary btn-sm open-action-modal-btn" 
            data-id="${employee.id}" 
            data-name="${employee.name}" 
            data-dept="${employee.department}" 
            data-issue="${mainIssue}" 
            data-score="${stats.riskScore}">
            Take Action
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Attach click listeners to Take Action buttons
  document.querySelectorAll('.open-action-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const { id, name, dept, issue, score } = btn.dataset;
      openSupervisorActionModal(id, name, dept, issue, score);
    });
  });
}

// Render 30-Day Attendance Trend on Canvas
function renderAttendanceTrendChart(attendance) {
  const canvas = document.getElementById('trendChartCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Group attendance by date
  const dateMap = {};
  attendance.forEach(rec => {
    if (rec.status === 'Weekly Off') return;
    if (!dateMap[rec.date]) {
      dateMap[rec.date] = { total: 0, present: 0 };
    }
    dateMap[rec.date].total++;
    if (rec.status === 'Present' || rec.status === 'Late' || rec.status === 'Work From Home') {
      dateMap[rec.date].present += (rec.status === 'Half Day' ? 0.5 : 1);
    }
  });

  const dates = Object.keys(dateMap).sort();
  const rates = dates.map(d => Math.round((dateMap[d].present / dateMap[d].total) * 100));

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Padding
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Draw Grid Lines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.font = '10px Segoe UI, sans-serif';
  ctx.fillStyle = '#64748b';

  const yTicks = [60, 70, 80, 90, 100];
  yTicks.forEach(tick => {
    const y = padTop + chartH - ((tick - 50) / 50) * chartH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
    ctx.fillText(`${tick}%`, 10, y + 3);
  });

  // Threshold Reference Line (75% Red line)
  const threshY = padTop + chartH - ((75 - 50) / 50) * chartH;
  ctx.strokeStyle = '#fca5a5';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padLeft, threshY);
  ctx.lineTo(width - padRight, threshY);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  if (rates.length < 2) return;

  // Plot Data Line
  const stepX = chartW / (rates.length - 1);

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  rates.forEach((rate, i) => {
    const x = padLeft + i * stepX;
    const y = padTop + chartH - ((rate - 50) / 50) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Plot Data Points
  rates.forEach((rate, i) => {
    const x = padLeft + i * stepX;
    const y = padTop + chartH - ((rate - 50) / 50) * chartH;

    ctx.fillStyle = rate < 75 ? '#dc2626' : '#2563eb';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Draw X axis labels (Start, Mid, End)
  ctx.fillStyle = '#475569';
  ctx.fillText(dates[0].slice(5), padLeft, height - 8);
  ctx.fillText(dates[Math.floor(dates.length / 2)].slice(5), padLeft + chartW / 2 - 15, height - 8);
  ctx.fillText(dates[dates.length - 1].slice(5), width - padRight - 30, height - 8);
}

// Render Department Comparison
function renderDepartmentComparison(employees, attendance) {
  const container = document.getElementById('departmentStatsContainer');
  if (!container) return;

  const departments = ['IT', 'HR', 'Finance', 'Sales', 'Operations'];
  let html = '';

  departments.forEach(dept => {
    const deptEmps = employees.filter(e => e.department === dept);
    const empCount = deptEmps.length;
    
    // Calculate average attendance for this dept
    let totalAttPct = 0;
    deptEmps.forEach(emp => {
      const stats = RiskCalculator.calculateStats(emp.id, attendance);
      totalAttPct += stats.attendancePercentage;
    });

    const avgPct = empCount > 0 ? Math.round((totalAttPct / empCount) * 10) / 10 : 0;
    let barColorClass = 'fill-green';
    if (avgPct < 75) barColorClass = 'fill-red';
    else if (avgPct < 85) barColorClass = 'fill-yellow';

    html += `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
          <span><strong>${dept}</strong> <span style="color: var(--text-muted); font-size: 11px;">(${empCount} Employees)</span></span>
          <span style="font-weight: 700;">${avgPct}%</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill ${barColorClass}" style="width: ${avgPct}%;"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Render Recent Actions Table
function renderRecentActions(actions) {
  const tbody = document.getElementById('recentActionsTableBody');
  if (!tbody) return;

  if (!actions || actions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 14px; color: var(--text-muted);">No supervisor actions recorded yet.</td></tr>`;
    return;
  }

  let html = '';
  actions.slice(0, 5).forEach(act => {
    html += `
      <tr>
        <td style="white-space: nowrap; font-size: 11px;">${act.timestamp}</td>
        <td><strong>${act.supervisor}</strong></td>
        <td><a href="employee-profile.html?id=${act.employeeId}"><strong>${act.employeeName}</strong></a> (${act.employeeId})</td>
        <td style="color: #92400e; font-weight: 600;">${act.issue}</td>
        <td><span class="badge badge-blue">${act.action}</span></td>
        <td style="font-size: 11.5px;">${act.remark}</td>
        <td><span class="badge badge-present">${act.status}</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Supervisor Action Modal Handlers
function setupActionModal() {
  const saveBtn = document.getElementById('saveActionSubmitBtn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    const empId = document.getElementById('actionEmployeeId').value;
    const empName = document.getElementById('actionEmployeeName').value;
    const actionVal = document.getElementById('actionSelect').value;
    const remarkVal = document.getElementById('actionRemark').value.trim();
    const issueVal = document.getElementById('actionModalProblemAlert').dataset.issue || 'Attendance Anomaly';

    if (!remarkVal) {
      alert('Please enter a supervisor remark before recording this decision.');
      return;
    }

    Storage.addSupervisorAction({
      employeeId: empId,
      employeeName: empName,
      issue: issueVal,
      action: actionVal,
      remark: remarkVal,
      status: actionVal === 'Escalated to HR' ? 'Escalated' : (actionVal === 'Supervisor Follow-up' ? 'Follow-up Scheduled' : 'Resolved')
    });

    closeModal('quickActionModal');
    showToast(`Decision recorded: ${actionVal} for ${empName}`, 'success');

    // Reload dashboard data
    loadDashboardData();
  });
}

function openSupervisorActionModal(id, name, dept, issue, score) {
  document.getElementById('actionEmployeeId').value = id;
  document.getElementById('actionEmployeeName').value = name;
  document.getElementById('actionEmployeeInfo').textContent = `${name} (${id}) – ${dept} Department`;
  
  const problemAlert = document.getElementById('actionModalProblemAlert');
  problemAlert.dataset.issue = issue;
  problemAlert.innerHTML = `
    <div>
      <strong>Triggering Issue:</strong> ${issue} (Risk Score: <strong>${score}</strong>)
      <div style="font-size: 11px; margin-top: 3px; color: var(--text-main);">
        Recommended action: Conduct formal supervisor follow-up, record remark, or escalate to HR if consecutive absences persist.
      </div>
    </div>
  `;

  document.getElementById('actionRemark').value = '';
  openModal('quickActionModal');
}
