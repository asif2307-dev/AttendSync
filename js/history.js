/**
 * AttendSync – Attendance History & Archives Logic
 * Filters 30-day records, provides table pagination, and exports to CSV.
 */

let currentPage = 1;
const pageSize = 50;
let filteredHistory = [];

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('history');
  initHistoryPage();
});

function initHistoryPage() {
  loadHistoryData();
  setupHistoryListeners();
}

function loadHistoryData() {
  const employees = Storage.getEmployees();
  const allAttendance = Storage.getAttendance();

  // Create quick lookup map for employee details
  const empMap = {};
  employees.forEach(e => { empMap[e.id] = e; });

  const startVal = document.getElementById('historyStartDate').value;
  const endVal = document.getElementById('historyEndDate').value;
  const deptVal = document.getElementById('historyDeptFilter').value;
  const statusVal = document.getElementById('historyStatusFilter').value;
  const searchVal = document.getElementById('historySearchInput').value.trim().toLowerCase();

  // Filter records
  filteredHistory = allAttendance.filter(rec => {
    if (rec.status === 'Weekly Off') return false; // Filter out routine weekend placeholders for history clarity

    const emp = empMap[rec.employeeId] || { name: 'Unknown', department: 'Unknown' };

    const matchDate = (!startVal || rec.date >= startVal) && (!endVal || rec.date <= endVal);
    const matchDept = deptVal === 'ALL' || emp.department === deptVal;
    
    let matchStatus = true;
    if (statusVal === 'Missing') {
      matchStatus = rec.checkOut === 'MISSING' || rec.checkIn === 'MISSING';
    } else if (statusVal !== 'ALL') {
      matchStatus = rec.status === statusVal;
    }

    const matchSearch = !searchVal ||
      rec.employeeId.toLowerCase().includes(searchVal) ||
      emp.name.toLowerCase().includes(searchVal);

    return matchDate && matchDept && matchStatus && matchSearch;
  });

  // Sort descending by date, then by employee ID
  filteredHistory.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.employeeId.localeCompare(b.employeeId);
  });

  currentPage = 1;
  renderHistoryTable();
}

function renderHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  const countBadge = document.getElementById('historyTotalRecordsBadge');
  const paginText = document.getElementById('historyPaginText');
  const prevBtn = document.getElementById('prevHistoryPageBtn');
  const nextBtn = document.getElementById('nextHistoryPageBtn');

  if (countBadge) countBadge.textContent = `${filteredHistory.length} Filtered Records`;

  if (filteredHistory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted);">No attendance history entries found matching criteria.</td></tr>`;
    if (paginText) paginText.textContent = 'Showing 0 records';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  const totalPages = Math.ceil(filteredHistory.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredHistory.length);
  const pageItems = filteredHistory.slice(startIdx, endIdx);

  if (paginText) paginText.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${filteredHistory.length} records (Page ${currentPage} of ${totalPages})`;
  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

  const employees = Storage.getEmployees();
  const empMap = {};
  employees.forEach(e => { empMap[e.id] = e; });

  let html = '';
  pageItems.forEach(rec => {
    const emp = empMap[rec.employeeId] || { name: 'Unknown', department: 'Unknown' };
    const isProblem = rec.status === 'Absent' || rec.status === 'Late' || rec.checkOut === 'MISSING';
    const rowClass = isProblem ? (rec.status === 'Absent' ? 'row-high-risk' : 'row-medium-risk') : '';

    let badgeClass = 'badge-present';
    if (rec.status === 'Absent') badgeClass = 'badge-absent';
    else if (rec.status === 'Late') badgeClass = 'badge-late';
    else if (rec.status === 'Leave') badgeClass = 'badge-leave';
    else if (rec.status === 'Work From Home') badgeClass = 'badge-wfh';
    else if (rec.status === 'Half Day') badgeClass = 'badge-halfday';

    html += `
      <tr class="${rowClass}">
        <td style="white-space: nowrap; font-weight: 600;">${rec.date}</td>
        <td><strong><a href="employee-profile.html?id=${rec.employeeId}">${rec.employeeId}</a></strong></td>
        <td>
          <a href="employee-profile.html?id=${rec.employeeId}" style="font-weight: 600; color: var(--color-navy);">${emp.name}</a>
        </td>
        <td><span class="badge badge-blue">${emp.department}</span></td>
        <td>${rec.checkIn}</td>
        <td>${rec.checkOut === 'MISSING' ? '<span class="badge badge-absent">MISSING</span>' : rec.checkOut}</td>
        <td style="text-align: center;">${rec.workingHours > 0 ? `${rec.workingHours} hrs` : '-'}</td>
        <td style="text-align: center;"><span class="badge ${badgeClass}">${rec.status}</span></td>
        <td style="font-size: 11.5px; color: ${isProblem ? 'var(--status-absent)' : 'var(--text-muted)'};">
          ${rec.remarks || '-'}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function setupHistoryListeners() {
  document.getElementById('historyStartDate').addEventListener('change', loadHistoryData);
  document.getElementById('historyEndDate').addEventListener('change', loadHistoryData);
  document.getElementById('historyDeptFilter').addEventListener('change', loadHistoryData);
  document.getElementById('historyStatusFilter').addEventListener('change', loadHistoryData);
  document.getElementById('historySearchInput').addEventListener('input', loadHistoryData);

  document.getElementById('resetHistoryFiltersBtn').addEventListener('click', () => {
    document.getElementById('historyStartDate').value = '2026-08-23';
    document.getElementById('historyEndDate').value = '2026-09-21';
    document.getElementById('historyDeptFilter').value = 'ALL';
    document.getElementById('historyStatusFilter').value = 'ALL';
    document.getElementById('historySearchInput').value = '';
    loadHistoryData();
  });

  document.getElementById('prevHistoryPageBtn').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderHistoryTable();
    }
  });

  document.getElementById('nextHistoryPageBtn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredHistory.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      renderHistoryTable();
    }
  });

  // Export CSV Handler
  document.getElementById('exportHistoryCsvBtn').addEventListener('click', () => {
    exportToCsv(filteredHistory);
  });
}

function exportToCsv(records) {
  if (!records || records.length === 0) {
    alert('No records available to export.');
    return;
  }

  const employees = Storage.getEmployees();
  const empMap = {};
  employees.forEach(e => { empMap[e.id] = e; });

  const headers = ['Date', 'Employee ID', 'Employee Name', 'Department', 'Check-In', 'Check-Out', 'Working Hours', 'Status', 'Remarks'];
  const rows = records.map(r => {
    const emp = empMap[r.employeeId] || { name: 'Unknown', department: 'Unknown' };
    return [
      `"${r.date}"`,
      `"${r.employeeId}"`,
      `"${emp.name.replace(/"/g, '""')}"`,
      `"${emp.department}"`,
      `"${r.checkIn}"`,
      `"${r.checkOut}"`,
      `"${r.workingHours}"`,
      `"${r.status}"`,
      `"${(r.remarks || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `attendsync_attendance_history_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Attendance history CSV exported successfully!', 'success');
}
