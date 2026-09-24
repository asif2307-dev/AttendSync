/**
 * AttendSync – Daily Attendance Marking Logic
 * Allows supervisors to mark, modify, bulk-update, and commit attendance records.
 */

let activeDate = '2026-09-21';
let currentDailyRecords = [];

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('attendance');
  initAttendancePage();
});

function initAttendancePage() {
  const datePicker = document.getElementById('attendanceDatePicker');
  if (datePicker) {
    activeDate = datePicker.value || '2026-09-21';
    datePicker.addEventListener('change', () => {
      activeDate = datePicker.value;
      loadDailyAttendance();
    });
  }

  setupFilterListeners();
  loadDailyAttendance();
}

function loadDailyAttendance() {
  const employees = Storage.getEmployees();
  const allAttendance = Storage.getAttendance();
  const existingForDate = allAttendance.filter(a => a.date === activeDate);

  // Merge existing records with full employee list
  currentDailyRecords = employees.map(emp => {
    const existing = existingForDate.find(a => a.employeeId === emp.id);
    if (existing) {
      return {
        employeeId: emp.id,
        name: emp.name,
        department: emp.department,
        shift: emp.shift,
        status: existing.status || 'Present',
        checkIn: existing.checkIn || '09:00 AM',
        checkOut: existing.checkOut || '06:00 PM',
        remarks: existing.remarks || ''
      };
    } else {
      // Default new entry
      return {
        employeeId: emp.id,
        name: emp.name,
        department: emp.department,
        shift: emp.shift,
        status: 'Present',
        checkIn: '09:05 AM',
        checkOut: '06:00 PM',
        remarks: 'Regular Attendance'
      };
    }
  });

  renderAttendanceGrid();
  updateLiveCounters();
}

function renderAttendanceGrid() {
  const deptVal = document.getElementById('attDeptFilter').value;
  const shiftVal = document.getElementById('attShiftFilter').value;
  const searchVal = document.getElementById('attSearchInput').value.trim().toLowerCase();

  const filtered = currentDailyRecords.filter(rec => {
    const matchDept = deptVal === 'ALL' || rec.department === deptVal;
    const matchShift = shiftVal === 'ALL' || rec.shift === shiftVal;
    const matchSearch = !searchVal || 
      rec.name.toLowerCase().includes(searchVal) || 
      rec.employeeId.toLowerCase().includes(searchVal);
    return matchDept && matchShift && matchSearch;
  });

  const tbody = document.getElementById('attendanceGridBody');
  const countBadge = document.getElementById('tableRosterCount');
  if (countBadge) countBadge.textContent = `${filtered.length} Employees Shown`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--text-muted);">No employees match the filter criteria.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach((rec, idx) => {
    const isProblem = rec.status === 'Absent' || rec.status === 'Late' || rec.checkOut === 'MISSING';
    const rowClass = isProblem ? (rec.status === 'Absent' ? 'row-high-risk' : 'row-medium-risk') : '';

    html += `
      <tr class="${rowClass}" data-emp-id="${rec.employeeId}">
        <td><strong><a href="employee-profile.html?id=${rec.employeeId}">${rec.employeeId}</a></strong></td>
        <td>
          <a href="employee-profile.html?id=${rec.employeeId}" style="font-weight: 600; color: var(--color-navy);">${rec.name}</a>
        </td>
        <td><span class="badge badge-blue">${rec.department}</span></td>
        <td><span class="badge" style="background-color: #f1f5f9; color: var(--text-main); border: 1px solid #cbd5e1;">${rec.shift}</span></td>
        <td>
          <select class="form-control status-select" data-id="${rec.employeeId}" style="font-weight: 600;">
            <option value="Present" ${rec.status === 'Present' ? 'selected' : ''}>🟢 Present</option>
            <option value="Late" ${rec.status === 'Late' ? 'selected' : ''}>🟡 Late Arrival</option>
            <option value="Absent" ${rec.status === 'Absent' ? 'selected' : ''}>🔴 Absent</option>
            <option value="Leave" ${rec.status === 'Leave' ? 'selected' : ''}>🟣 Approved Leave</option>
            <option value="Work From Home" ${rec.status === 'Work From Home' ? 'selected' : ''}>🔵 Work From Home</option>
            <option value="Half Day" ${rec.status === 'Half Day' ? 'selected' : ''}>🔷 Half Day</option>
          </select>
        </td>
        <td>
          <input type="text" class="form-control checkin-input" data-id="${rec.employeeId}" value="${rec.checkIn}" placeholder="09:00 AM">
        </td>
        <td>
          <input type="text" class="form-control checkout-input" data-id="${rec.employeeId}" value="${rec.checkOut}" placeholder="06:00 PM">
        </td>
        <td>
          <input type="text" class="form-control remarks-input" data-id="${rec.employeeId}" value="${rec.remarks}" placeholder="Enter supervisor notes / reason...">
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  bindGridInputs();
}

function bindGridInputs() {
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const empId = e.target.dataset.id;
      const val = e.target.value;
      const rec = currentDailyRecords.find(r => r.employeeId === empId);
      if (rec) {
        rec.status = val;
        // Auto-adjust default times
        if (val === 'Absent' || val === 'Leave') {
          rec.checkIn = '-';
          rec.checkOut = '-';
          rec.remarks = val === 'Absent' ? 'Unannounced Absence' : 'Approved Leave';
        } else if (val === 'Late') {
          if (rec.checkIn === '-' || !rec.checkIn) rec.checkIn = '09:40 AM';
          if (rec.checkOut === '-' || !rec.checkOut) rec.checkOut = '06:15 PM';
          rec.remarks = 'Arrived after grace threshold';
        } else if (val === 'Present' || val === 'Work From Home') {
          if (rec.checkIn === '-') rec.checkIn = '09:05 AM';
          if (rec.checkOut === '-') rec.checkOut = '06:05 PM';
          rec.remarks = val === 'Work From Home' ? 'Approved Remote Work' : 'Regular Attendance';
        }
      }
      renderAttendanceGrid();
      updateLiveCounters();
    });
  });

  document.querySelectorAll('.checkin-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const rec = currentDailyRecords.find(r => r.employeeId === e.target.dataset.id);
      if (rec) rec.checkIn = e.target.value.trim();
    });
  });

  document.querySelectorAll('.checkout-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const rec = currentDailyRecords.find(r => r.employeeId === e.target.dataset.id);
      if (rec) rec.checkOut = e.target.value.trim();
    });
  });

  document.querySelectorAll('.remarks-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const rec = currentDailyRecords.find(r => r.employeeId === e.target.dataset.id);
      if (rec) rec.remarks = e.target.value.trim();
    });
  });
}

function updateLiveCounters() {
  let present = 0, late = 0, absent = 0, leave = 0, wfh = 0;
  currentDailyRecords.forEach(r => {
    if (r.status === 'Present') present++;
    else if (r.status === 'Late') late++;
    else if (r.status === 'Absent') absent++;
    else if (r.status === 'Leave') leave++;
    else if (r.status === 'Work From Home') wfh++;
  });

  const bP = document.getElementById('countPresentBadge');
  const bL = document.getElementById('countLateBadge');
  const bA = document.getElementById('countAbsentBadge');
  const bLv = document.getElementById('countLeaveBadge');
  const bW = document.getElementById('countWfhBadge');

  if (bP) bP.textContent = `Present: ${present}`;
  if (bL) bL.textContent = `Late: ${late}`;
  if (bA) bA.textContent = `Absent: ${absent}`;
  if (bLv) bLv.textContent = `Leave: ${leave}`;
  if (bW) bW.textContent = `WFH: ${wfh}`;
}

function setupFilterListeners() {
  document.getElementById('attDeptFilter').addEventListener('change', renderAttendanceGrid);
  document.getElementById('attShiftFilter').addEventListener('change', renderAttendanceGrid);
  document.getElementById('attSearchInput').addEventListener('input', renderAttendanceGrid);
  
  const reloadBtn = document.getElementById('reloadDateBtn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      loadDailyAttendance();
      showToast(`Reloaded attendance data for ${activeDate}`, 'info');
    });
  }

  // Mark All Present Button
  const markAllBtn = document.getElementById('markAllPresentBtn');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      if (confirm(`Set all employees to 'Present' for ${activeDate}?`)) {
        currentDailyRecords.forEach(r => {
          r.status = 'Present';
          r.checkIn = '09:00 AM';
          r.checkOut = '06:00 PM';
          r.remarks = 'Verified by Supervisor (Bulk Present)';
        });
        renderAttendanceGrid();
        updateLiveCounters();
        showToast('All employee records marked Present for today.', 'success');
      }
    });
  }

  // Save Attendance Buttons
  const saveAction = () => {
    // Format records for persistence
    const recordsToSave = currentDailyRecords.map(r => ({
      date: activeDate,
      employeeId: r.employeeId,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      status: r.status,
      workingHours: (r.status === 'Absent' || r.status === 'Leave' || r.checkOut === 'MISSING') ? 0 : 9.0,
      remarks: r.remarks
    }));

    Storage.updateDailyAttendance(activeDate, recordsToSave);
    showToast(`Successfully saved attendance records for ${recordsToSave.length} employees on ${activeDate}!`, 'success');
  };

  const saveBtn = document.getElementById('saveAttendanceBtn');
  const saveFooterBtn = document.getElementById('saveAttendanceFooterBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveAction);
  if (saveFooterBtn) saveFooterBtn.addEventListener('click', saveAction);
}
