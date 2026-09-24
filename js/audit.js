/**
 * AttendSync – System Audit Log Logic
 * Renders chronological supervisor activity and exports audit records.
 */

let allAuditLogs = [];

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('audit');
  initAuditPage();
});

function initAuditPage() {
  loadAuditData();
  setupAuditListeners();
}

function loadAuditData() {
  allAuditLogs = Storage.getAuditLog();
  renderAuditTable();
}

function renderAuditTable() {
  const actionVal = document.getElementById('auditActionFilter').value;
  const searchVal = document.getElementById('auditSearchInput').value.trim().toLowerCase();

  let filtered = allAuditLogs.filter(item => {
    let matchAction = true;
    if (actionVal !== 'ALL') {
      matchAction = item.action.toLowerCase().includes(actionVal.toLowerCase());
    }

    const matchSearch = !searchVal ||
      item.employee.toLowerCase().includes(searchVal) ||
      item.action.toLowerCase().includes(searchVal) ||
      item.details.toLowerCase().includes(searchVal) ||
      item.user.toLowerCase().includes(searchVal);

    return matchAction && matchSearch;
  });

  const tbody = document.getElementById('auditTableBody');
  const countBadge = document.getElementById('auditCountBadge');
  const footerText = document.getElementById('auditFooterText');

  if (countBadge) countBadge.textContent = `${filtered.length} Entries`;
  if (footerText) footerText.textContent = `Showing ${filtered.length} audit entry records`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">No audit entries match filter criteria.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach(log => {
    let actionBadgeClass = 'badge-blue';
    if (log.action.includes('Warning') || log.action.includes('Escalat')) actionBadgeClass = 'badge-danger';
    else if (log.action.includes('Leave') || log.action.includes('Approved')) actionBadgeClass = 'badge-present';
    else if (log.action.includes('Regularization')) actionBadgeClass = 'badge-late';

    html += `
      <tr>
        <td style="font-family: monospace; font-weight: 600;">${log.id}</td>
        <td style="white-space: nowrap; font-size: 11.5px;">${log.timestamp}</td>
        <td><strong>${log.user}</strong></td>
        <td><span class="badge ${actionBadgeClass}">${log.action}</span></td>
        <td style="font-weight: 600; color: var(--color-navy);">${log.employee}</td>
        <td style="font-size: 11.5px;">${log.details}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function setupAuditListeners() {
  document.getElementById('auditActionFilter').addEventListener('change', renderAuditTable);
  document.getElementById('auditSearchInput').addEventListener('input', renderAuditTable);

  document.getElementById('resetAuditFilterBtn').addEventListener('click', () => {
    document.getElementById('auditActionFilter').value = 'ALL';
    document.getElementById('auditSearchInput').value = '';
    renderAuditTable();
  });

  document.getElementById('exportAuditCsvBtn').addEventListener('click', () => {
    if (allAuditLogs.length === 0) {
      alert('No audit entries available.');
      return;
    }

    const headers = ['Log ID', 'Timestamp', 'User', 'Action', 'Employee/Scope', 'Details'];
    const rows = allAuditLogs.map(l => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.user}"`,
      `"${l.action}"`,
      `"${l.employee.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendsync_audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Audit log CSV exported successfully!', 'success');
  });
}
