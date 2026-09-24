/**
 * AttendSync – Leave Management Logic
 * Handles supervisor leave approvals, rejections, auto-syncing with attendance table, and manual applications.
 */

let allLeaves = [];

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('leaves');
  initLeavesPage();
});

function initLeavesPage() {
  loadLeavesData();
  setupLeavesListeners();
  populateEmployeeDropdown();
}

function loadLeavesData() {
  allLeaves = Storage.getLeaves();

  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;

  allLeaves.forEach(l => {
    if (l.status === 'Pending') pendingCount++;
    else if (l.status === 'Approved') approvedCount++;
    else if (l.status === 'Rejected') rejectedCount++;
  });

  document.getElementById('countPendingLeaves').textContent = pendingCount;
  document.getElementById('countApprovedLeaves').textContent = approvedCount;
  document.getElementById('countRejectedLeaves').textContent = rejectedCount;
  document.getElementById('countTotalLeaves').textContent = allLeaves.length;

  renderLeavesTable();
}

function renderLeavesTable() {
  const statusVal = document.getElementById('leaveStatusFilter').value;
  const typeVal = document.getElementById('leaveTypeFilter').value;
  const deptVal = document.getElementById('leaveDeptFilter').value;
  const searchVal = document.getElementById('leaveSearchInput').value.trim().toLowerCase();

  let filtered = allLeaves.filter(item => {
    const matchStatus = statusVal === 'ALL' || item.status === statusVal;
    const matchType = typeVal === 'ALL' || item.leaveType === typeVal;
    const matchDept = deptVal === 'ALL' || item.department === deptVal;
    const matchSearch = !searchVal ||
      item.employeeName.toLowerCase().includes(searchVal) ||
      item.employeeId.toLowerCase().includes(searchVal) ||
      item.reason.toLowerCase().includes(searchVal);

    return matchStatus && matchType && matchDept && matchSearch;
  });

  const tbody = document.getElementById('leavesTableBody');
  const countBadge = document.getElementById('leavesTableBadge');
  if (countBadge) countBadge.textContent = `${filtered.length} Applications`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 24px; color: var(--text-muted);">No leave applications match the selected criteria.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach(req => {
    let statusBadge = 'badge-medium-risk';
    if (req.status === 'Approved') statusBadge = 'badge-low-risk';
    else if (req.status === 'Rejected') statusBadge = 'badge-high-risk';

    html += `
      <tr>
        <td><strong>${req.id}</strong></td>
        <td><strong><a href="employee-profile.html?id=${req.employeeId}">${req.employeeId}</a></strong></td>
        <td>
          <a href="employee-profile.html?id=${req.employeeId}" style="font-weight: 600; color: var(--color-navy);">${req.employeeName}</a>
        </td>
        <td><span class="badge badge-blue">${req.department}</span></td>
        <td><span class="badge badge-leave">${req.leaveType}</span></td>
        <td style="white-space: nowrap;">${req.startDate} to ${req.endDate}</td>
        <td style="text-align: center; font-weight: 700;">${req.days} d</td>
        <td style="font-size: 11.5px; max-width: 180px;">${req.reason}</td>
        <td><span class="badge ${statusBadge}">${req.status}</span></td>
        <td style="font-size: 11px; color: var(--text-muted);">${req.supervisorRemark || '-'}</td>
        <td style="text-align: center;">
          ${req.status === 'Pending' ? `
            <div style="display: inline-flex; gap: 4px;">
              <button type="button" class="btn btn-success btn-sm review-leave-btn" data-id="${req.id}" data-action="Approved">Approve</button>
              <button type="button" class="btn btn-danger btn-sm review-leave-btn" data-id="${req.id}" data-action="Rejected">Reject</button>
            </div>
          ` : `
            <span style="font-size: 11px; color: var(--text-muted);">Reviewed</span>
          `}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  document.querySelectorAll('.review-leave-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openReviewModal(btn.dataset.id, btn.dataset.action);
    });
  });
}

function openReviewModal(leaveId, action) {
  const req = allLeaves.find(l => l.id === leaveId);
  if (!req) return;

  document.getElementById('reviewLeaveId').value = req.id;
  document.getElementById('reviewDecisionAction').value = action;
  document.getElementById('reviewLeaveModalTitle').textContent = action === 'Approved' ? '✅ Approve Leave Request' : '❌ Reject Leave Request';
  document.getElementById('reviewEmpDetails').textContent = `${req.employeeName} (${req.employeeId}) — ${req.department}`;
  document.getElementById('reviewLeaveTypeBadge').textContent = req.leaveType;
  document.getElementById('reviewLeaveDates').textContent = `Dates: ${req.startDate} to ${req.endDate} (${req.days} Day${req.days > 1 ? 's' : ''})`;
  document.getElementById('reviewLeaveReason').textContent = req.reason;
  
  const remarkInput = document.getElementById('reviewSupervisorRemark');
  remarkInput.value = action === 'Approved' ? 'Approved by supervisor; workload cover arranged' : 'Staffing shortage during sprint milestone';

  const confirmBtn = document.getElementById('confirmLeaveDecisionBtn');
  confirmBtn.className = action === 'Approved' ? 'btn btn-success' : 'btn btn-danger';
  confirmBtn.textContent = action === 'Approved' ? 'Confirm Approval & Sync Attendance' : 'Confirm Rejection';

  openModal('reviewLeaveModal');
}

function populateEmployeeDropdown() {
  const select = document.getElementById('newLeaveEmpSelect');
  if (!select) return;

  const employees = Storage.getEmployees();
  select.innerHTML = employees.map(e => `<option value="${e.id}">${e.name} (${e.id}) — ${e.department}</option>`).join('');
}

function setupLeavesListeners() {
  document.getElementById('leaveStatusFilter').addEventListener('change', renderLeavesTable);
  document.getElementById('leaveTypeFilter').addEventListener('change', renderLeavesTable);
  document.getElementById('leaveDeptFilter').addEventListener('change', renderLeavesTable);
  document.getElementById('leaveSearchInput').addEventListener('input', renderLeavesTable);

  document.getElementById('resetLeavesFilterBtn').addEventListener('click', () => {
    document.getElementById('leaveStatusFilter').value = 'ALL';
    document.getElementById('leaveTypeFilter').value = 'ALL';
    document.getElementById('leaveDeptFilter').value = 'ALL';
    document.getElementById('leaveSearchInput').value = '';
    renderLeavesTable();
  });

  // Confirm Decision Action
  document.getElementById('confirmLeaveDecisionBtn').addEventListener('click', () => {
    const leaveId = document.getElementById('reviewLeaveId').value;
    const action = document.getElementById('reviewDecisionAction').value;
    const remark = document.getElementById('reviewSupervisorRemark').value.trim();

    Storage.updateLeaveStatus(leaveId, action, remark);
    closeModal('reviewLeaveModal');
    showToast(`Leave request ${leaveId} marked as ${action}!`, action === 'Approved' ? 'success' : 'warning');
    loadLeavesData();
  });

  // Apply on Behalf Modal
  document.getElementById('openNewLeaveModalBtn').addEventListener('click', () => {
    openModal('newLeaveModal');
  });

  document.getElementById('newLeaveForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const empId = document.getElementById('newLeaveEmpSelect').value;
    const emp = Storage.getEmployeeById(empId);
    const leaveType = document.getElementById('newLeaveTypeSelect').value;
    const startDate = document.getElementById('newLeaveStartDate').value;
    const endDate = document.getElementById('newLeaveEndDate').value;
    const reason = document.getElementById('newLeaveReasonInput').value.trim();

    if (new Date(endDate) < new Date(startDate)) {
      alert('End date cannot be earlier than start date.');
      return;
    }

    const diffDays = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

    const leaves = Storage.getLeaves();
    const newLeave = {
      id: `LV-${Date.now().toString().slice(-3)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      leaveType: leaveType,
      startDate: startDate,
      endDate: endDate,
      days: diffDays,
      reason: reason,
      status: 'Pending',
      requestedOn: new Date().toISOString().split('T')[0]
    };

    leaves.unshift(newLeave);
    Storage.saveLeaves(leaves);
    Storage.addAuditEntry('Leave Application Submitted', `${emp.name} (${emp.id})`, `Applied for ${leaveType} (${diffDays} days)`);

    closeModal('newLeaveModal');
    showToast(`Leave application submitted for ${emp.name}`, 'success');
    loadLeavesData();
  });
}
