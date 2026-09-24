/**
 * AttendSync – Individual Employee Profile Logic
 * Computes 30-day historical performance, risk breakdown, and logs supervisor decisions.
 */

let currentEmployeeId = 'EMP101';

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('employees');

  const urlParams = new URLSearchParams(window.location.search);
  const idParam = urlParams.get('id');
  if (idParam) {
    currentEmployeeId = idParam.toUpperCase();
  }

  loadEmployeeProfile();
  setupProfileEventListeners();
});

function loadEmployeeProfile() {
  const emp = Storage.getEmployeeById(currentEmployeeId);
  if (!emp) {
    alert(`Employee with ID ${currentEmployeeId} not found in database.`);
    window.location.href = 'employees.html';
    return;
  }

  const attendance = Storage.getAttendance();
  const stats = RiskCalculator.calculateStats(emp.id, attendance);
  const actions = Storage.getSupervisorActions().filter(a => a.employeeId === emp.id);

  // 1. Fill Master Details
  document.getElementById('profileBreadcrumbName').textContent = `${emp.name} (${emp.id})`;
  document.getElementById('profileEmpName').textContent = emp.name;
  document.getElementById('profileEmpId').textContent = `(${emp.id})`;
  document.getElementById('profileEmpSubtitle').textContent = `${emp.designation} • ${emp.department} Department`;

  document.getElementById('profileDeptDesig').textContent = `${emp.department} — ${emp.designation}`;
  document.getElementById('profileEmail').textContent = emp.email;
  document.getElementById('profilePhone').textContent = emp.phone;
  document.getElementById('profileJoiningDate').textContent = emp.joiningDate || '15 Mar 2022';
  document.getElementById('profileShift').textContent = `${emp.shift} Shift`;

  // DSA Hash lookup details
  const hashRes = globalEmployeeHashTable.search(emp.id);
  document.getElementById('profileHashLocation').textContent = `Bucket #${hashRes.finalIndex} (${hashRes.probesCount} probe${hashRes.probesCount > 1 ? 's' : ''}${hashRes.collided ? ' - Collision resolved' : ''})`;

  // 2. Fill KPI Stat Tiles
  document.getElementById('kpiProfileAttPct').textContent = `${stats.attendancePercentage}%`;
  document.getElementById('kpiProfilePresent').textContent = stats.presentCount;
  document.getElementById('kpiProfileAbsent').textContent = stats.absentCount;
  document.getElementById('kpiProfileLate').textContent = stats.lateCount;
  document.getElementById('kpiProfileLeaves').textContent = stats.leaveCount;
  document.getElementById('kpiProfileRiskScore').textContent = stats.riskScore;

  const riskBadge = document.getElementById('kpiProfileRiskBadge');
  if (riskBadge) {
    riskBadge.className = `badge ${stats.badgeClass}`;
    riskBadge.textContent = `${stats.riskLevel} Risk`;
  }

  // 3. Risk Analysis Card
  const reasonsList = document.getElementById('riskReasonsList');
  if (reasonsList) {
    reasonsList.innerHTML = stats.reasons.map(r => `<li><strong>${r}</strong></li>`).join('');
  }

  const recText = document.getElementById('riskRecommendedText');
  if (recText) {
    recText.textContent = stats.recommendedAction;
  }

  const riskCardHeader = document.querySelector('#riskAnalysisCard .card-header');
  if (riskCardHeader) {
    if (stats.riskLevel === 'Low') {
      riskCardHeader.style.backgroundColor = '#f0fdf4';
      riskCardHeader.querySelector('.card-title').style.color = '#166534';
      document.getElementById('riskAnalysisBadge').className = 'badge badge-low-risk';
      document.getElementById('riskAnalysisBadge').textContent = 'Normal Health';
    } else if (stats.riskLevel === 'Medium') {
      riskCardHeader.style.backgroundColor = '#fffbeb';
      riskCardHeader.querySelector('.card-title').style.color = '#b45309';
      document.getElementById('riskAnalysisBadge').className = 'badge badge-medium-risk';
      document.getElementById('riskAnalysisBadge').textContent = 'Attention Needed';
    } else {
      riskCardHeader.style.backgroundColor = '#fff1f2';
      riskCardHeader.querySelector('.card-title').style.color = '#991b1b';
      document.getElementById('riskAnalysisBadge').className = 'badge badge-high-risk';
      document.getElementById('riskAnalysisBadge').textContent = 'Action Required';
    }
  }

  // 4. Populate 30-Day Attendance Records Table
  renderProfileAttendanceTable(emp.id, attendance);

  // 5. Populate Supervisor Action History for this Employee
  renderProfileActionsTable(actions);
}

function renderProfileAttendanceTable(empId, attendance) {
  const tbody = document.getElementById('profileAttendanceTableBody');
  if (!tbody) return;

  const records = attendance
    .filter(a => a.employeeId === empId)
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Descending

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 16px; color: var(--text-muted);">No attendance records found for this employee.</td></tr>`;
    return;
  }

  let html = '';
  records.forEach(rec => {
    const d = new Date(rec.date + 'T00:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

    let statusBadgeClass = 'badge-present';
    if (rec.status === 'Absent') statusBadgeClass = 'badge-absent';
    else if (rec.status === 'Late') statusBadgeClass = 'badge-late';
    else if (rec.status === 'Leave') statusBadgeClass = 'badge-leave';
    else if (rec.status === 'Work From Home') statusBadgeClass = 'badge-wfh';
    else if (rec.status === 'Half Day') statusBadgeClass = 'badge-halfday';
    else if (rec.status === 'Weekly Off') statusBadgeClass = 'badge';

    const isProblem = rec.status === 'Absent' || rec.status === 'Late' || rec.checkOut === 'MISSING';
    const rowClass = isProblem ? 'row-high-risk' : '';

    html += `
      <tr class="${rowClass}">
        <td><strong>${rec.date}</strong></td>
        <td>${dayName}</td>
        <td>${rec.checkIn}</td>
        <td>
          ${rec.checkOut === 'MISSING' 
            ? '<span class="badge badge-absent">MISSING PUNCH</span>' 
            : rec.checkOut}
        </td>
        <td>${rec.workingHours > 0 ? `${rec.workingHours} hrs` : '-'}</td>
        <td><span class="badge ${statusBadgeClass}">${rec.status}</span></td>
        <td style="font-size: 11.5px; color: ${isProblem ? 'var(--status-absent)' : 'var(--text-muted)'};">
          ${rec.remarks || '-'}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function renderProfileActionsTable(actions) {
  const tbody = document.getElementById('employeeActionLogBody');
  if (!tbody) return;

  if (actions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 14px; color: var(--text-muted);">No supervisor actions recorded yet for this employee.</td></tr>`;
    return;
  }

  let html = '';
  actions.forEach(act => {
    html += `
      <tr>
        <td style="white-space: nowrap; font-size: 11px;">${act.timestamp}</td>
        <td><strong>${act.supervisor}</strong></td>
        <td style="color: #92400e;">${act.issue}</td>
        <td><span class="badge badge-blue">${act.action}</span></td>
        <td style="font-size: 11.5px;">${act.remark}</td>
        <td><span class="badge badge-present">${act.status}</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function setupProfileEventListeners() {
  const openActionBtn = document.getElementById('openActionPanelBtn');
  const addRemarkBtn = document.getElementById('addRemarkModalBtn');
  const directActionBtn = document.getElementById('riskDirectActionBtn');

  const openAction = () => {
    document.getElementById('profileActionRemark').value = '';
    openModal('profileActionModal');
  };

  if (openActionBtn) openActionBtn.addEventListener('click', openAction);
  if (addRemarkBtn) addRemarkBtn.addEventListener('click', openAction);
  if (directActionBtn) directActionBtn.addEventListener('click', openAction);

  const submitActionBtn = document.getElementById('submitProfileActionBtn');
  if (submitActionBtn) {
    submitActionBtn.addEventListener('click', () => {
      const actionType = document.getElementById('profileActionType').value;
      const remark = document.getElementById('profileActionRemark').value.trim();

      if (!remark) {
        alert('Please enter supervisor justification notes before saving.');
        return;
      }

      const emp = Storage.getEmployeeById(currentEmployeeId);
      const stats = RiskCalculator.calculateStats(emp.id, Storage.getAttendance());
      const mainIssue = stats.reasons[0] || 'Attendance Observation';

      Storage.addSupervisorAction({
        employeeId: emp.id,
        employeeName: emp.name,
        issue: mainIssue,
        action: actionType,
        remark: remark,
        status: actionType === 'Escalated to HR' ? 'Escalated' : (actionType === 'Supervisor Follow-up' ? 'Follow-up Scheduled' : 'Resolved')
      });

      closeModal('profileActionModal');
      showToast(`Action recorded: ${actionType} for ${emp.name}`, 'success');
      loadEmployeeProfile();
    });
  }
}
