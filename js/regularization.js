/**
 * AttendSync – Attendance Regularization Logic
 * Handles reviewing missed punches, approving biometric corrections, and patching attendance records.
 */

let allRegularizations = [];

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('regularization');
  initRegularizationPage();
});

function initRegularizationPage() {
  loadRegularizations();
  setupRegularizationListeners();
  populateEmpDropdown();
}

function loadRegularizations() {
  allRegularizations = Storage.getRegularizations();

  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;

  allRegularizations.forEach(r => {
    if (r.status === 'Pending') pendingCount++;
    else if (r.status === 'Approved') approvedCount++;
    else if (r.status === 'Rejected') rejectedCount++;
  });

  document.getElementById('countPendingRegs').textContent = pendingCount;
  document.getElementById('countApprovedRegs').textContent = approvedCount;
  document.getElementById('countRejectedRegs').textContent = rejectedCount;
  document.getElementById('countTotalRegs').textContent = allRegularizations.length;

  renderRegularizationTable();
}

function renderRegularizationTable() {
  const statusVal = document.getElementById('regStatusFilter').value;
  const deptVal = document.getElementById('regDeptFilter').value;
  const searchVal = document.getElementById('regSearchInput').value.trim().toLowerCase();

  let filtered = allRegularizations.filter(item => {
    const matchStatus = statusVal === 'ALL' || item.status === statusVal;
    const matchDept = deptVal === 'ALL' || item.department === deptVal;
    const matchSearch = !searchVal ||
      item.employeeName.toLowerCase().includes(searchVal) ||
      item.employeeId.toLowerCase().includes(searchVal) ||
      item.reason.toLowerCase().includes(searchVal);

    return matchStatus && matchDept && matchSearch;
  });

  const tbody = document.getElementById('regularizationTableBody');
  const countBadge = document.getElementById('regCountBadge');
  if (countBadge) countBadge.textContent = `${filtered.length} Requests`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 24px; color: var(--text-muted);">No regularization requests match the selected filters.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach(req => {
    let statusBadge = 'badge-medium-risk';
    if (req.status === 'Approved') statusBadge = 'badge-low-risk';
    else if (req.status === 'Rejected') statusBadge = 'badge-high-risk';

    const originalText = `In: ${req.originalCheckIn || '-'} | Out: ${req.originalCheckOut || '-'}`;
    const requestedText = `In: ${req.requestedCheckIn || (req.originalCheckIn || '-')} | Out: ${req.requestedCheckOut || (req.originalCheckOut || '-')}`;

    html += `
      <tr>
        <td><strong>${req.id}</strong></td>
        <td><strong><a href="employee-profile.html?id=${req.employeeId}">${req.employeeId}</a></strong></td>
        <td>
          <a href="employee-profile.html?id=${req.employeeId}" style="font-weight: 600; color: var(--color-navy);">${req.employeeName}</a>
        </td>
        <td><span class="badge badge-blue">${req.department}</span></td>
        <td style="white-space: nowrap; font-weight: 600;">${req.date}</td>
        <td style="font-size: 11.5px; color: var(--status-absent);">${originalText}</td>
        <td style="font-size: 11.5px; color: var(--status-present); font-weight: 600;">${requestedText}</td>
        <td style="font-size: 11.5px; max-width: 180px;">${req.reason}</td>
        <td><span class="badge ${statusBadge}">${req.status}</span></td>
        <td style="font-size: 11px; color: var(--text-muted);">${req.supervisorRemark || '-'}</td>
        <td style="text-align: center;">
          ${req.status === 'Pending' ? `
            <div style="display: inline-flex; gap: 4px;">
              <button type="button" class="btn btn-success btn-sm review-reg-btn" data-id="${req.id}" data-action="Approved">Approve</button>
              <button type="button" class="btn btn-danger btn-sm review-reg-btn" data-id="${req.id}" data-action="Rejected">Reject</button>
            </div>
          ` : `
            <span style="font-size: 11px; color: var(--text-muted);">Reconciled</span>
          `}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  document.querySelectorAll('.review-reg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openReviewRegModal(btn.dataset.id, btn.dataset.action);
    });
  });
}

function openReviewRegModal(regId, action) {
  const req = allRegularizations.find(r => r.id === regId);
  if (!req) return;

  document.getElementById('reviewRegId').value = req.id;
  document.getElementById('reviewRegDecision').value = action;
  document.getElementById('reviewRegModalTitle').textContent = action === 'Approved' ? '✅ Approve Regularization' : '❌ Reject Regularization';
  document.getElementById('reviewRegEmpDetails').textContent = `${req.employeeName} (${req.employeeId}) — ${req.department}`;
  document.getElementById('reviewRegDateInfo').textContent = `Punch Date: ${req.date} (Requested on ${req.requestedOn || 'Recent'})`;
  document.getElementById('reviewRegOriginal').textContent = `In: ${req.originalCheckIn || '-'} | Out: ${req.originalCheckOut || '-'}`;
  document.getElementById('reviewRegRequested').textContent = `In: ${req.requestedCheckIn || (req.originalCheckIn || '-')} | Out: ${req.requestedCheckOut || (req.originalCheckOut || '-')}`;
  document.getElementById('reviewRegReason').textContent = req.reason;

  const remarkInput = document.getElementById('reviewRegRemark');
  remarkInput.value = action === 'Approved' ? 'Verified against physical security ledger and CCTV entry log' : 'Unable to confirm presence during claimed time window';

  const confirmBtn = document.getElementById('confirmRegDecisionBtn');
  confirmBtn.className = action === 'Approved' ? 'btn btn-success' : 'btn btn-danger';
  confirmBtn.textContent = action === 'Approved' ? 'Approve & Patch Attendance' : 'Confirm Rejection';

  openModal('reviewRegModal');
}

function populateEmpDropdown() {
  const select = document.getElementById('newRegEmpSelect');
  if (!select) return;

  const employees = Storage.getEmployees();
  select.innerHTML = employees.map(e => `<option value="${e.id}">${e.name} (${e.id}) — ${e.department}</option>`).join('');
}

function setupRegularizationListeners() {
  document.getElementById('regStatusFilter').addEventListener('change', renderRegularizationTable);
  document.getElementById('regDeptFilter').addEventListener('change', renderRegularizationTable);
  document.getElementById('regSearchInput').addEventListener('input', renderRegularizationTable);

  document.getElementById('resetRegFilterBtn').addEventListener('click', () => {
    document.getElementById('regStatusFilter').value = 'ALL';
    document.getElementById('regDeptFilter').value = 'ALL';
    document.getElementById('regSearchInput').value = '';
    renderRegularizationTable();
  });

  // Confirm Decision Handler
  document.getElementById('confirmRegDecisionBtn').addEventListener('click', () => {
    const regId = document.getElementById('reviewRegId').value;
    const action = document.getElementById('reviewRegDecision').value;
    const remark = document.getElementById('reviewRegRemark').value.trim();

    Storage.updateRegularizationStatus(regId, action, remark);
    closeModal('reviewRegModal');
    showToast(`Regularization ${regId} ${action.toLowerCase()}! Attendance patched.`, action === 'Approved' ? 'success' : 'warning');
    loadRegularizations();
  });

  // Submit New Regularization
  document.getElementById('openNewRegModalBtn').addEventListener('click', () => {
    openModal('newRegModal');
  });

  document.getElementById('newRegForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const empId = document.getElementById('newRegEmpSelect').value;
    const emp = Storage.getEmployeeById(empId);
    const dateVal = document.getElementById('newRegDate').value;
    const correctIn = document.getElementById('newRegCorrectIn').value.trim();
    const correctOut = document.getElementById('newRegCorrectOut').value.trim();
    const reason = document.getElementById('newRegReasonInput').value.trim();

    const list = Storage.getRegularizations();
    const newReg = {
      id: `REG-${Date.now().toString().slice(-3)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      date: dateVal,
      originalCheckIn: 'MISSING',
      originalCheckOut: 'MISSING',
      requestedCheckIn: correctIn,
      requestedCheckOut: correctOut,
      reason: reason,
      status: 'Pending',
      requestedOn: new Date().toISOString().split('T')[0]
    };

    list.unshift(newReg);
    Storage.saveRegularizations(list);
    Storage.addAuditEntry('Regularization Request Logged', `${emp.name} (${emp.id})`, `Requested punch correction for ${dateVal}`);

    closeModal('newRegModal');
    showToast(`Regularization request submitted for ${emp.name}`, 'success');
    loadRegularizations();
  });
}
