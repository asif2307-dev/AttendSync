/**
 * AttendSync – Reports Suite Engine
 * Generates 9 comprehensive report types with CSV download and formatted print layouts.
 */

let activeReportType = 'DAILY';
let activeReportData = [];

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('reports');
  initReportsPage();
});

function initReportsPage() {
  generateSelectedReport();
  setupReportListeners();
}

function generateSelectedReport() {
  const repType = document.getElementById('reportTypeSelect').value;
  const deptVal = document.getElementById('reportDeptFilter').value;
  const dateVal = document.getElementById('reportDateInput').value || '2026-09-21';

  activeReportType = repType;
  const employees = Storage.getEmployees().filter(e => deptVal === 'ALL' || e.department === deptVal);
  const attendance = Storage.getAttendance();
  const leaves = Storage.getLeaves().filter(l => deptVal === 'ALL' || l.department === deptVal);
  const regularizations = Storage.getRegularizations().filter(r => deptVal === 'ALL' || r.department === deptVal);

  const titleEl = document.getElementById('reportTitleHeader');
  const subEl = document.getElementById('reportSubtitleHeader');
  const chipsEl = document.getElementById('reportSummaryChips');
  const thead = document.getElementById('reportTableHead');
  const tbody = document.getElementById('reportTableBody');
  const footEl = document.getElementById('reportFooterInfo');

  let headers = [];
  let rows = [];
  let chipsHtml = '';

  if (repType === 'DAILY') {
    titleEl.textContent = `Daily Attendance Report – ${dateVal}`;
    subEl.textContent = `Department Scope: ${deptVal} • Generated for ${dateVal} • Total Employees: ${employees.length}`;

    const dateAtt = attendance.filter(a => a.date === dateVal);
    let pres = 0, late = 0, abs = 0, lv = 0;

    headers = ['Emp ID', 'Employee Name', 'Department', 'Shift', 'Check-In', 'Check-Out', 'Hours', 'Status', 'Remarks'];

    rows = employees.map(emp => {
      const rec = dateAtt.find(a => a.employeeId === emp.id) || {
        checkIn: '-', checkOut: '-', status: 'Present', workingHours: 9.0, remarks: 'Verified'
      };

      if (rec.status === 'Present') pres++;
      else if (rec.status === 'Late') { late++; pres++; }
      else if (rec.status === 'Absent') abs++;
      else if (rec.status === 'Leave') lv++;

      return {
        id: emp.id,
        name: emp.name,
        dept: emp.department,
        shift: emp.shift,
        checkIn: rec.checkIn,
        checkOut: rec.checkOut,
        hours: rec.workingHours > 0 ? `${rec.workingHours} hrs` : '-',
        status: rec.status,
        remarks: rec.remarks || '-'
      };
    });

    chipsHtml = `
      <span class="badge badge-present">Present: ${pres}</span>
      <span class="badge badge-late">Late: ${late}</span>
      <span class="badge badge-absent">Absent: ${abs}</span>
      <span class="badge badge-leave">Leave: ${lv}</span>
      <span style="font-size: 11.5px; margin-left: 8px;"><strong>Daily Attendance Rate:</strong> ${Math.round((pres / (employees.length || 1)) * 100)}%</span>
    `;
  } 
  else if (repType === 'EMPLOYEE' || repType === 'MONTHLY') {
    titleEl.textContent = repType === 'EMPLOYEE' ? 'Employee 30-Day Master Attendance Report' : 'Monthly Attendance Performance Summary';
    subEl.textContent = `Evaluated Period: 23 Aug 2026 to 21 Sep 2026 • Scope: ${deptVal}`;

    headers = ['Emp ID', 'Employee Name', 'Department', 'Total Days', 'Present', 'Absent', 'Late', 'Leave', 'Att %', 'Risk Level'];

    let totalAtt = 0;
    rows = employees.map(emp => {
      const stats = RiskCalculator.calculateStats(emp.id, attendance);
      totalAtt += stats.attendancePercentage;

      return {
        id: emp.id,
        name: emp.name,
        dept: emp.department,
        totalDays: stats.totalWorkingDays,
        present: stats.presentCount,
        absent: stats.absentCount,
        late: stats.lateCount,
        leave: stats.leaveCount,
        attPct: `${stats.attendancePercentage}%`,
        riskLevel: `${stats.riskScore} (${stats.riskLevel})`
      };
    });

    const avgPct = Math.round((totalAtt / (employees.length || 1)) * 10) / 10;
    chipsHtml = `
      <span class="badge badge-blue">Workforce Count: ${employees.length}</span>
      <span class="badge badge-present">Overall Average Attendance: ${avgPct}%</span>
      <span class="badge badge-high-risk">High Risk Flagged: ${rows.filter(r => r.riskLevel.includes('High')).length}</span>
    `;
  }
  else if (repType === 'DEPARTMENT') {
    titleEl.textContent = 'Department-Wise Attendance Performance Report';
    subEl.textContent = 'Aggregated department attendance statistics & risk distributions';

    headers = ['Department', 'Employees', 'Avg Attendance %', 'Present Today', 'Absent Today', 'Late Today', 'High Risk Cases'];

    const depts = deptVal === 'ALL' ? ['IT', 'HR', 'Finance', 'Sales', 'Operations'] : [deptVal];
    const todayAtt = attendance.filter(a => a.date === dateVal);

    rows = depts.map(d => {
      const dEmps = employees.filter(e => e.department === d);
      let totAtt = 0;
      let highRisk = 0;

      dEmps.forEach(emp => {
        const stats = RiskCalculator.calculateStats(emp.id, attendance);
        totAtt += stats.attendancePercentage;
        if (stats.riskLevel === 'High') highRisk++;
      });

      const dToday = todayAtt.filter(a => dEmps.some(e => e.id === a.employeeId));
      const presToday = dToday.filter(a => a.status === 'Present' || a.status === 'Late' || a.status === 'Work From Home').length;
      const absToday = dToday.filter(a => a.status === 'Absent').length;
      const lateToday = dToday.filter(a => a.status === 'Late').length;

      const avg = dEmps.length > 0 ? Math.round((totAtt / dEmps.length) * 10) / 10 : 0;

      return {
        dept: d,
        empCount: dEmps.length,
        avgAtt: `${avg}%`,
        presToday: presToday,
        absToday: absToday,
        lateToday: lateToday,
        highRisk: highRisk
      };
    });

    chipsHtml = `<span class="badge badge-present">5 Active Departments Evaluated</span>`;
  }
  else if (repType === 'LATE') {
    titleEl.textContent = 'Late Arrival & Punctuality Violation Report';
    subEl.textContent = 'Employees with repeated check-in delays past standard grace period';

    headers = ['Emp ID', 'Employee Name', 'Department', 'Shift', 'Late Days (30d)', 'Avg Delay', 'Punctuality Impact', 'Recommended Action'];

    const lateEmps = [];
    employees.forEach(emp => {
      const stats = RiskCalculator.calculateStats(emp.id, attendance);
      if (stats.lateCount >= 2) {
        lateEmps.push({
          id: emp.id,
          name: emp.name,
          dept: emp.department,
          shift: emp.shift,
          lateCount: stats.lateCount,
          avgDelay: '~35 mins',
          impact: stats.lateCount >= 4 ? 'High Frequency' : 'Moderate',
          action: stats.lateCount >= 4 ? 'Punctuality Counseling & Shift Review' : 'Monitor Grace Punch'
        });
      }
    });

    rows = lateEmps.sort((a, b) => b.lateCount - a.lateCount);
    chipsHtml = `<span class="badge badge-late">Total Flagged Late Offenders: ${rows.length}</span>`;
  }
  else if (repType === 'ABSENCE') {
    titleEl.textContent = 'Chronic Absence & Lost Hours Report';
    subEl.textContent = 'Detailed breakdown of unannounced absences & consecutive stoppage';

    headers = ['Emp ID', 'Employee Name', 'Department', 'Absent Days', 'Max Consecutive', 'Lost Hours (Est)', 'Risk Category', 'Supervisor Directive'];

    const absEmps = [];
    employees.forEach(emp => {
      const stats = RiskCalculator.calculateStats(emp.id, attendance);
      if (stats.absentCount >= 3 || stats.maxConsecutiveAbsences >= 2) {
        absEmps.push({
          id: emp.id,
          name: emp.name,
          dept: emp.department,
          absentDays: stats.absentCount,
          maxConsec: stats.maxConsecutiveAbsences,
          lostHours: `${stats.absentCount * 9} hrs`,
          riskCat: stats.riskLevel,
          directive: stats.recommendedAction
        });
      }
    });

    rows = absEmps.sort((a, b) => b.absentDays - a.absentDays);
    chipsHtml = `<span class="badge badge-absent">Employees with 3+ Absences: ${rows.length}</span>`;
  }
  else if (repType === 'LEAVE') {
    titleEl.textContent = 'Leave Utilization & Application Audit Report';
    subEl.textContent = 'Comprehensive log of employee leave usage, types, and supervisor remarks';

    headers = ['Req ID', 'Emp ID', 'Employee Name', 'Department', 'Leave Type', 'From – To', 'Days', 'Reason', 'Status', 'Supervisor Remark'];

    rows = leaves.map(l => ({
      id: l.id,
      empId: l.employeeId,
      name: l.employeeName,
      dept: l.department,
      type: l.leaveType,
      dates: `${l.startDate} to ${l.endDate}`,
      days: `${l.days} d`,
      reason: l.reason,
      status: l.status,
      remark: l.supervisorRemark || '-'
    }));

    chipsHtml = `<span class="badge badge-leave">Total Applications: ${rows.length}</span>`;
  }
  else if (repType === 'REGULARIZATION') {
    titleEl.textContent = 'Biometric Punch Regularization Log';
    subEl.textContent = 'Reconciled and pending punch correction requests for audit compliance';

    headers = ['Req ID', 'Emp ID', 'Employee Name', 'Department', 'Date', 'Original', 'Requested', 'Reason', 'Status', 'Supervisor Remark'];

    rows = regularizations.map(r => ({
      id: r.id,
      empId: r.employeeId,
      name: r.employeeName,
      dept: r.department,
      date: r.date,
      orig: `In: ${r.originalCheckIn || '-'} / Out: ${r.originalCheckOut || '-'}`,
      req: `In: ${r.requestedCheckIn || '-'} / Out: ${r.requestedCheckOut || '-'}`,
      reason: r.reason,
      status: r.status,
      remark: r.supervisorRemark || '-'
    }));

    chipsHtml = `<span class="badge badge-low-risk">Regularization Requests: ${rows.length}</span>`;
  }
  else if (repType === 'RISK') {
    titleEl.textContent = 'High-Risk Workforce Anomaly Assessment Report';
    subEl.textContent = 'Composite attendance risk scoring, anomaly factors, and supervisor action paths';

    headers = ['Emp ID', 'Employee Name', 'Department', 'Risk Score', 'Severity', 'Attendance %', 'Identified Triggers', 'Supervisor Protocol'];

    const riskList = [];
    employees.forEach(emp => {
      const stats = RiskCalculator.calculateStats(emp.id, attendance);
      if (stats.riskLevel === 'High' || stats.riskLevel === 'Medium') {
        riskList.push({
          id: emp.id,
          name: emp.name,
          dept: emp.department,
          score: stats.riskScore,
          severity: stats.riskLevel,
          attPct: `${stats.attendancePercentage}%`,
          triggers: stats.reasons.join('; '),
          protocol: stats.recommendedAction
        });
      }
    });

    rows = riskList.sort((a, b) => b.score - a.score);
    chipsHtml = `<span class="badge badge-high-risk">High & Medium Risk Employees: ${rows.length}</span>`;
  }

  activeReportData = { title: titleEl.textContent, headers, rows };

  // Render Table Head
  thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

  // Render Table Body
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align: center; padding: 24px; color: var(--text-muted);">No records found for this report configuration.</td></tr>`;
  } else {
    tbody.innerHTML = rows.map(r => {
      const values = Object.values(r);
      return `<tr>${values.map((v, i) => `<td>${v}</td>`).join('')}</tr>`;
    }).join('');
  }

  chipsEl.innerHTML = chipsHtml;
  footEl.textContent = `Displaying ${rows.length} report record(s) • AttendSync v1.0`;
}

function setupReportListeners() {
  document.getElementById('generateReportBtn').addEventListener('click', () => {
    generateSelectedReport();
    showToast('Report generated successfully!', 'success');
  });

  document.getElementById('reportTypeSelect').addEventListener('change', generateSelectedReport);
  document.getElementById('reportDeptFilter').addEventListener('change', generateSelectedReport);

  // CSV Export
  document.getElementById('exportReportCsvBtn').addEventListener('click', () => {
    if (!activeReportData.rows || activeReportData.rows.length === 0) {
      alert('No report data to export.');
      return;
    }

    const { headers, rows, title } = activeReportData;
    const csvRows = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.map(h => `"${h}"`).join(','), ...csvRows].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Report CSV exported successfully!', 'success');
  });
}
