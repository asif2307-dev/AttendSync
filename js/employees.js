/**
 * AttendSync – Employee Management Logic
 * Handles CRUD operations, DSA Hash Table Linear Probing visual feedback, filtering, and sorting.
 */

let currentSort = { field: 'id', order: 'asc' };

document.addEventListener('DOMContentLoaded', () => {
  renderAppLayout('employees');
  initEmployeePage();
});

function initEmployeePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get('search');
  if (searchParam) {
    const input = document.getElementById('empSearchInput');
    if (input) input.value = searchParam;
  }

  loadEmployeeTable();
  setupEventListeners();
}

function loadEmployeeTable() {
  const employees = Storage.getEmployees();
  const attendance = Storage.getAttendance();

  // Pre-calculate risk stats for all employees
  const employeeData = employees.map(emp => {
    const stats = RiskCalculator.calculateStats(emp.id, attendance);
    return { ...emp, stats };
  });

  // Apply filters
  const searchVal = document.getElementById('empSearchInput').value.trim().toLowerCase();
  const deptVal = document.getElementById('deptFilterSelect').value;
  const riskVal = document.getElementById('riskFilterSelect').value;
  const shiftVal = document.getElementById('shiftFilterSelect').value;

  // DSA Search feedback check
  const dsaBanner = document.getElementById('dsaSearchFeedback');
  const dsaDetails = document.getElementById('dsaSearchDetails');
  
  if (searchVal.toUpperCase().startsWith('EMP') && searchVal.length >= 6) {
    const hashResult = globalEmployeeHashTable.search(searchVal.toUpperCase());
    if (dsaBanner && dsaDetails) {
      if (hashResult.found) {
        dsaDetails.innerHTML = `
          <strong>⚡ DSA Hash Table Search:</strong> Key: <code>${searchVal.toUpperCase()}</code> mapped to Hash Bucket <code>#${hashResult.initialIndex}</code>. 
          Found at slot <code>#${hashResult.finalIndex}</code> with <strong>${hashResult.probesCount} probe(s)</strong> 
          ${hashResult.collided ? '<span class="badge badge-medium-risk">Linear Collision Resolved</span>' : '<span class="badge badge-low-risk">O(1) Direct Hit</span>'}.
        `;
        dsaBanner.style.display = 'flex';
      } else {
        dsaDetails.innerHTML = `
          <strong>⚡ DSA Hash Table Search:</strong> Key <code>${searchVal.toUpperCase()}</code> not found after searching <code>#${hashResult.initialIndex}</code> (${hashResult.probesCount} probes).
        `;
        dsaBanner.style.display = 'flex';
      }
    }
  } else if (dsaBanner) {
    dsaBanner.style.display = 'none';
  }

  let filtered = employeeData.filter(item => {
    const matchSearch = !searchVal || 
      item.name.toLowerCase().includes(searchVal) || 
      item.id.toLowerCase().includes(searchVal) ||
      item.designation.toLowerCase().includes(searchVal);

    const matchDept = deptVal === 'ALL' || item.department === deptVal;
    const matchRisk = riskVal === 'ALL' || item.stats.riskLevel === riskVal;
    const matchShift = shiftVal === 'ALL' || item.shift === shiftVal;

    return matchSearch && matchDept && matchRisk && matchShift;
  });

  // Apply Sorting
  filtered.sort((a, b) => {
    let fieldA, fieldB;
    if (currentSort.field === 'id') {
      fieldA = a.id;
      fieldB = b.id;
    } else if (currentSort.field === 'name') {
      fieldA = a.name.toLowerCase();
      fieldB = b.name.toLowerCase();
    } else if (currentSort.field === 'department') {
      fieldA = a.department;
      fieldB = b.department;
    } else if (currentSort.field === 'att') {
      fieldA = a.stats.attendancePercentage;
      fieldB = b.stats.attendancePercentage;
    } else if (currentSort.field === 'risk') {
      fieldA = a.stats.riskScore;
      fieldB = b.stats.riskScore;
    }

    if (fieldA < fieldB) return currentSort.order === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return currentSort.order === 'asc' ? 1 : -1;
    return 0;
  });

  // Render Table Rows
  const tbody = document.getElementById('employeesTableBody');
  const countBadge = document.getElementById('employeeCountBadge');
  const paginInfo = document.getElementById('tablePaginationInfo');

  if (countBadge) countBadge.textContent = `${filtered.length} of ${employees.length} Records`;
  if (paginInfo) paginInfo.textContent = `Displaying ${filtered.length} employee record(s)`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted);">No employee records found matching selected filter criteria.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach(emp => {
    const { stats } = emp;
    const rowClass = stats.riskLevel === 'High' ? 'row-high-risk' : (stats.riskLevel === 'Medium' ? 'row-medium-risk' : '');

    html += `
      <tr class="${rowClass}">
        <td><strong><a href="employee-profile.html?id=${emp.id}" title="View 30-Day Attendance Profile">${emp.id}</a></strong></td>
        <td>
          <a href="employee-profile.html?id=${emp.id}" style="font-weight: 600; color: var(--color-navy);">${emp.name}</a>
          <div style="font-size: 11px; color: var(--text-muted);">${emp.joiningDate ? `Joined: ${emp.joiningDate}` : ''}</div>
        </td>
        <td><span class="badge badge-blue">${emp.department}</span></td>
        <td>${emp.designation}</td>
        <td>
          <div style="font-size: 11.5px;">${emp.email}</div>
          <div style="font-size: 10.5px; color: var(--text-muted);">${emp.phone}</div>
        </td>
        <td><span class="badge" style="background-color: #f1f5f9; color: var(--text-main); border: 1px solid #cbd5e1;">${emp.shift}</span></td>
        <td style="text-align: center;">
          <strong style="color: ${stats.attendancePercentage < 75 ? 'var(--status-absent)' : (stats.attendancePercentage < 85 ? 'var(--status-late)' : 'var(--status-present)')};">
            ${stats.attendancePercentage}%
          </strong>
        </td>
        <td style="text-align: center;">
          <span class="badge ${stats.badgeClass}">${stats.riskScore} (${stats.riskLevel})</span>
        </td>
        <td style="text-align: center;">
          <div style="display: inline-flex; gap: 4px;">
            <a href="employee-profile.html?id=${emp.id}" class="btn btn-secondary btn-sm" title="View Full Profile">Profile</a>
            <button type="button" class="btn btn-primary btn-sm edit-emp-btn" data-id="${emp.id}" title="Edit Record">Edit</button>
            <button type="button" class="btn btn-danger btn-sm delete-emp-btn" data-id="${emp.id}" data-name="${emp.name}" title="Delete Record">✕</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Bind edit & delete action buttons
  document.querySelectorAll('.edit-emp-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });

  document.querySelectorAll('.delete-emp-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteEmployeeRecord(btn.dataset.id, btn.dataset.name));
  });
}

function setupEventListeners() {
  // Filters change
  document.getElementById('empSearchInput').addEventListener('input', loadEmployeeTable);
  document.getElementById('deptFilterSelect').addEventListener('change', loadEmployeeTable);
  document.getElementById('riskFilterSelect').addEventListener('change', loadEmployeeTable);
  document.getElementById('shiftFilterSelect').addEventListener('change', loadEmployeeTable);

  document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    document.getElementById('empSearchInput').value = '';
    document.getElementById('deptFilterSelect').value = 'ALL';
    document.getElementById('riskFilterSelect').value = 'ALL';
    document.getElementById('shiftFilterSelect').value = 'ALL';
    loadEmployeeTable();
  });

  const clearDsaBtn = document.getElementById('clearDsaSearchBtn');
  if (clearDsaBtn) {
    clearDsaBtn.addEventListener('click', () => {
      document.getElementById('empSearchInput').value = '';
      loadEmployeeTable();
    });
  }

  // Sorting columns
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.order = 'asc';
      }
      loadEmployeeTable();
    });
  });

  // Add Employee Modal trigger
  document.getElementById('openAddEmployeeModalBtn').addEventListener('click', () => {
    document.getElementById('formMode').value = 'add';
    document.getElementById('empModalTitle').textContent = '➕ Register New Employee';
    document.getElementById('empIdInput').value = `EMP${101 + Storage.getEmployees().length}`;
    document.getElementById('empIdInput').readOnly = false;
    document.getElementById('empNameInput').value = '';
    document.getElementById('empEmailInput').value = '';
    document.getElementById('empPhoneInput').value = '';
    document.getElementById('empDeptInput').value = 'IT';
    document.getElementById('empDesigInput').value = '';
    document.getElementById('empJoiningInput').value = new Date().toISOString().split('T')[0];
    document.getElementById('empShiftInput').value = 'Morning';
    openModal('employeeFormModal');
  });

  // Save Form (Add or Edit)
  document.getElementById('employeeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const mode = document.getElementById('formMode').value;
    const empId = document.getElementById('empIdInput').value.trim().toUpperCase();
    const name = document.getElementById('empNameInput').value.trim();
    const email = document.getElementById('empEmailInput').value.trim();
    const phone = document.getElementById('empPhoneInput').value.trim();
    const dept = document.getElementById('empDeptInput').value;
    const desig = document.getElementById('empDesigInput').value.trim();
    const joining = document.getElementById('empJoiningInput').value;
    const shift = document.getElementById('empShiftInput').value;

    const empObj = {
      id: empId,
      name,
      email,
      phone,
      department: dept,
      designation: desig,
      joiningDate: joining,
      shift,
      status: 'Active'
    };

    if (mode === 'add') {
      // Check duplicate ID
      if (Storage.getEmployeeById(empId)) {
        alert(`Employee ID ${empId} already exists in database! Please use a unique ID.`);
        return;
      }
      Storage.addEmployee(empObj);
      globalEmployeeHashTable.insert(empObj);
      showToast(`Employee ${name} (${empId}) added successfully!`, 'success');
    } else {
      Storage.updateEmployee(empObj);
      globalEmployeeHashTable.buildFromArray(Storage.getEmployees());
      showToast(`Employee ${name} updated successfully!`, 'success');
    }

    closeModal('employeeFormModal');
    loadEmployeeTable();
  });
}

function openEditModal(id) {
  const emp = Storage.getEmployeeById(id);
  if (!emp) return;

  document.getElementById('formMode').value = 'edit';
  document.getElementById('empModalTitle').textContent = `✏️ Edit Employee Details – ${emp.name} (${emp.id})`;
  document.getElementById('empIdInput').value = emp.id;
  document.getElementById('empIdInput').readOnly = true;
  document.getElementById('empNameInput').value = emp.name;
  document.getElementById('empEmailInput').value = emp.email;
  document.getElementById('empPhoneInput').value = emp.phone;
  document.getElementById('empDeptInput').value = emp.department;
  document.getElementById('empDesigInput').value = emp.designation;
  document.getElementById('empJoiningInput').value = emp.joiningDate || '2023-01-01';
  document.getElementById('empShiftInput').value = emp.shift || 'Morning';

  openModal('employeeFormModal');
}

function deleteEmployeeRecord(id, name) {
  if (confirm(`Are you sure you want to permanently delete employee ${name} (${id}) from the active database?`)) {
    Storage.deleteEmployee(id);
    globalEmployeeHashTable.buildFromArray(Storage.getEmployees());
    showToast(`Employee ${name} (${id}) deleted from database.`, 'danger');
    loadEmployeeTable();
  }
}
