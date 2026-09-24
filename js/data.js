/**
 * AttendSync – Data Layer & DSA Engine
 * Department: Software Development / Database Management
 * Contains:
 * - 50 Realistic Employee Records
 * - 30-Day Attendance History Generator (~1,500 records)
 * - Hash Table with Linear Probing DSA Implementation
 * - Rule-based Risk Calculation Engine
 * - LocalStorage Persistence & Factory Reset
 */

const STORAGE_KEYS = {
  EMPLOYEES: 'attendsync_employees_v1',
  ATTENDANCE: 'attendsync_attendance_v1',
  LEAVES: 'attendsync_leaves_v1',
  REGULARIZATIONS: 'attendsync_regularizations_v1',
  SHIFTS: 'attendsync_shifts_v1',
  AUDIT_LOG: 'attendsync_audit_log_v1',
  SUPERVISOR_ACTIONS: 'attendsync_supervisor_actions_v1',
  SETTINGS: 'attendsync_settings_v1',
  CURRENT_USER: 'attendsync_user_session_v1'
};

// Default Shifts
const DEFAULT_SHIFTS = [
  { id: 'SHIFT_MORN', name: 'Morning Shift', code: 'MORN', start: '09:00 AM', end: '06:00 PM', minRequired: 20, assignedCount: 26 },
  { id: 'SHIFT_EVE', name: 'Evening Shift', code: 'EVE', start: '02:00 PM', end: '11:00 PM', minRequired: 15, assignedCount: 16 },
  { id: 'SHIFT_NIGHT', name: 'Night Shift', code: 'NIGHT', start: '10:00 PM', end: '07:00 AM', minRequired: 10, assignedCount: 8 } // Understaffed!
];

// Seed Data for 50 Realistic Employees (Indian Names & Departments)
const SEED_EMPLOYEES = [
  { id: 'EMP101', name: 'Rahul Kumar', email: 'rahul.kumar@attendsync.com', phone: '+91 98765 43210', department: 'IT', designation: 'Senior Software Engineer', joiningDate: '2022-03-15', shift: 'Morning', status: 'Active' },
  { id: 'EMP102', name: 'Priya Singh', email: 'priya.singh@attendsync.com', phone: '+91 98765 43211', department: 'HR', designation: 'HR Specialist', joiningDate: '2021-06-10', shift: 'Morning', status: 'Active' },
  { id: 'EMP103', name: 'Amit Sharma', email: 'amit.sharma@attendsync.com', phone: '+91 98765 43212', department: 'Finance', designation: 'Financial Analyst', joiningDate: '2023-01-20', shift: 'Morning', status: 'Active' },
  { id: 'EMP104', name: 'Sneha Patel', email: 'sneha.patel@attendsync.com', phone: '+91 98765 43213', department: 'Sales', designation: 'Account Executive', joiningDate: '2022-08-01', shift: 'Morning', status: 'Active' },
  { id: 'EMP105', name: 'Vikram Joshi', email: 'vikram.joshi@attendsync.com', phone: '+91 98765 43214', department: 'Operations', designation: 'Operations Lead', joiningDate: '2020-11-12', shift: 'Morning', status: 'Active' },
  { id: 'EMP106', name: 'Aman Verma', email: 'aman.verma@attendsync.com', phone: '+91 98765 43215', department: 'Sales', designation: 'Sales Representative', joiningDate: '2023-04-18', shift: 'Morning', status: 'Active' },
  { id: 'EMP107', name: 'Rohit Sharma', email: 'rohit.sharma@attendsync.com', phone: '+91 98765 43216', department: 'Operations', designation: 'Logistics Associate', joiningDate: '2021-09-05', shift: 'Evening', status: 'Active' },
  { id: 'EMP108', name: 'Neha Gupta', email: 'neha.gupta@attendsync.com', phone: '+91 98765 43217', department: 'IT', designation: 'Frontend Developer', joiningDate: '2022-12-01', shift: 'Morning', status: 'Active' },
  { id: 'EMP109', name: 'Rajesh Iyer', email: 'rajesh.iyer@attendsync.com', phone: '+91 98765 43218', department: 'IT', designation: 'Database Administrator', joiningDate: '2019-05-14', shift: 'Morning', status: 'Active' },
  { id: 'EMP110', name: 'Ananya Desai', email: 'ananya.desai@attendsync.com', phone: '+91 98765 43219', department: 'HR', designation: 'Recruitment Manager', joiningDate: '2020-02-18', shift: 'Morning', status: 'Active' },
  { id: 'EMP111', name: 'Suresh Reddy', email: 'suresh.reddy@attendsync.com', phone: '+91 98765 43220', department: 'Finance', designation: 'Senior Accountant', joiningDate: '2018-07-22', shift: 'Morning', status: 'Active' },
  { id: 'EMP112', name: 'Kavita Rao', email: 'kavita.rao@attendsync.com', phone: '+91 98765 43221', department: 'Sales', designation: 'Sales Manager', joiningDate: '2021-04-11', shift: 'Morning', status: 'Active' },
  { id: 'EMP113', name: 'Manish Nair', email: 'manish.nair@attendsync.com', phone: '+91 98765 43222', department: 'Operations', designation: 'Facilities Coordinator', joiningDate: '2022-10-05', shift: 'Night', status: 'Active' },
  { id: 'EMP114', name: 'Pooja Choudhary', email: 'pooja.choudhary@attendsync.com', phone: '+91 98765 43223', department: 'Finance', designation: 'Tax Consultant', joiningDate: '2023-03-01', shift: 'Morning', status: 'Active' },
  { id: 'EMP115', name: 'Deepak Mehta', email: 'deepak.mehta@attendsync.com', phone: '+91 98765 43224', department: 'IT', designation: 'DevOps Engineer', joiningDate: '2021-08-19', shift: 'Morning', status: 'Active' },
  { id: 'EMP116', name: 'Sunita Joshi', email: 'sunita.joshi@attendsync.com', phone: '+91 98765 43225', department: 'HR', designation: 'Training Coordinator', joiningDate: '2022-05-15', shift: 'Morning', status: 'Active' },
  { id: 'EMP117', name: 'Arjun Kapoor', email: 'arjun.kapoor@attendsync.com', phone: '+91 98765 43226', department: 'Operations', designation: 'Supply Chain Analyst', joiningDate: '2020-09-30', shift: 'Evening', status: 'Active' },
  { id: 'EMP118', name: 'Divya Menon', email: 'divya.menon@attendsync.com', phone: '+91 98765 43227', department: 'IT', designation: 'QA Automation Engineer', joiningDate: '2023-02-10', shift: 'Morning', status: 'Active' },
  { id: 'EMP119', name: 'Sandeep Yadav', email: 'sandeep.yadav@attendsync.com', phone: '+91 98765 43228', department: 'Sales', designation: 'Inside Sales Associate', joiningDate: '2022-11-20', shift: 'Morning', status: 'Active' },
  { id: 'EMP120', name: 'Ritu Saxena', email: 'ritu.saxena@attendsync.com', phone: '+91 98765 43229', department: 'Finance', designation: 'Payroll Specialist', joiningDate: '2021-01-14', shift: 'Morning', status: 'Active' },
  { id: 'EMP121', name: 'Karthik Subramanian', email: 'karthik.s@attendsync.com', phone: '+91 98765 43230', department: 'IT', designation: 'Backend Developer', joiningDate: '2022-04-12', shift: 'Morning', status: 'Active' },
  { id: 'EMP122', name: 'Meera Nambiar', email: 'meera.nambiar@attendsync.com', phone: '+91 98765 43231', department: 'HR', designation: 'HR Executive', joiningDate: '2023-05-02', shift: 'Morning', status: 'Active' },
  { id: 'EMP123', name: 'Harsh Vardhan', email: 'harsh.vardhan@attendsync.com', phone: '+91 98765 43232', department: 'Operations', designation: 'Inventory Supervisor', joiningDate: '2019-11-08', shift: 'Night', status: 'Active' },
  { id: 'EMP124', name: 'Swati Mishra', email: 'swati.mishra@attendsync.com', phone: '+91 98765 43233', department: 'Sales', designation: 'Client Relations Officer', joiningDate: '2022-07-16', shift: 'Morning', status: 'Active' },
  { id: 'EMP125', name: 'Pankaj Tripathi', email: 'pankaj.tripathi@attendsync.com', phone: '+91 98765 43234', department: 'IT', designation: 'System Administrator', joiningDate: '2020-03-25', shift: 'Evening', status: 'Active' },
  { id: 'EMP126', name: 'Shilpa Shetty', email: 'shilpa.shetty@attendsync.com', phone: '+91 98765 43235', department: 'Finance', designation: 'Accounts Payable Lead', joiningDate: '2021-10-18', shift: 'Morning', status: 'Active' },
  { id: 'EMP127', name: 'Gaurav Bansal', email: 'gaurav.bansal@attendsync.com', phone: '+91 98765 43236', department: 'IT', designation: 'Security Analyst', joiningDate: '2023-06-01', shift: 'Morning', status: 'Active' },
  { id: 'EMP128', name: 'Preeti Kaushik', email: 'preeti.kaushik@attendsync.com', phone: '+91 98765 43237', department: 'HR', designation: 'Talent Acquisition Partner', joiningDate: '2022-09-09', shift: 'Morning', status: 'Active' },
  { id: 'EMP129', name: 'Naveen Patnaik', email: 'naveen.patnaik@attendsync.com', phone: '+91 98765 43238', department: 'Operations', designation: 'Warehouse Dispatcher', joiningDate: '2021-12-05', shift: 'Evening', status: 'Active' },
  { id: 'EMP130', name: 'Tarun Kumar', email: 'tarun.kumar@attendsync.com', phone: '+91 98765 43239', department: 'Sales', designation: 'Territory Sales Manager', joiningDate: '2019-08-14', shift: 'Morning', status: 'Active' },
  { id: 'EMP131', name: 'Vandana Srivastava', email: 'vandana.s@attendsync.com', phone: '+91 98765 43240', department: 'Finance', designation: 'Audit Associate', joiningDate: '2022-01-11', shift: 'Morning', status: 'Active' },
  { id: 'EMP132', name: 'Alok Nath', email: 'alok.nath@attendsync.com', phone: '+91 98765 43241', department: 'IT', designation: 'Full Stack Engineer', joiningDate: '2021-05-22', shift: 'Morning', status: 'Active' },
  { id: 'EMP133', name: 'Ruchi Tiwari', email: 'ruchi.tiwari@attendsync.com', phone: '+91 98765 43242', department: 'HR', designation: 'Employee Engagement Lead', joiningDate: '2020-08-17', shift: 'Morning', status: 'Active' },
  { id: 'EMP134', name: 'Sachin Tendulkar', email: 'sachin.t@attendsync.com', phone: '+91 98765 43243', department: 'Operations', designation: 'Fleet Manager', joiningDate: '2018-04-10', shift: 'Night', status: 'Active' },
  { id: 'EMP135', name: 'Anjali Sengupta', email: 'anjali.s@attendsync.com', phone: '+91 98765 43244', department: 'Sales', designation: 'Business Development Exec', joiningDate: '2023-07-03', shift: 'Morning', status: 'Active' },
  { id: 'EMP136', name: 'Mohit Chauhan', email: 'mohit.chauhan@attendsync.com', phone: '+91 98765 43245', department: 'IT', designation: 'UI/UX Designer', joiningDate: '2022-02-28', shift: 'Morning', status: 'Active' },
  { id: 'EMP137', name: 'Bhavna Bhatt', email: 'bhavna.bhatt@attendsync.com', phone: '+91 98765 43246', department: 'Finance', designation: 'Billing Coordinator', joiningDate: '2021-03-19', shift: 'Morning', status: 'Active' },
  { id: 'EMP138', name: 'Kiran Bedi', email: 'kiran.bedi@attendsync.com', phone: '+91 98765 43247', department: 'Operations', designation: 'Compliance Officer', joiningDate: '2019-10-01', shift: 'Evening', status: 'Active' },
  { id: 'EMP139', name: 'Ajay Devgan', email: 'ajay.devgan@attendsync.com', phone: '+91 98765 43248', department: 'Sales', designation: 'Key Accounts Specialist', joiningDate: '2020-12-15', shift: 'Morning', status: 'Active' },
  { id: 'EMP140', name: 'Shreya Ghoshal', email: 'shreya.g@attendsync.com', phone: '+91 98765 43249', department: 'HR', designation: 'Benefits Administrator', joiningDate: '2022-06-25', shift: 'Morning', status: 'Active' },
  { id: 'EMP141', name: 'Varun Dhawan', email: 'varun.dhawan@attendsync.com', phone: '+91 98765 43250', department: 'IT', designation: 'Cloud Infrastructure Eng', joiningDate: '2021-07-14', shift: 'Morning', status: 'Active' },
  { id: 'EMP142', name: 'Neetu Singh', email: 'neetu.singh@attendsync.com', phone: '+91 98765 43251', department: 'Finance', designation: 'Financial Controller', joiningDate: '2018-09-05', shift: 'Morning', status: 'Active' },
  { id: 'EMP143', name: 'Sanjay Dutt', email: 'sanjay.dutt@attendsync.com', phone: '+91 98765 43252', department: 'Operations', designation: 'Procurement Specialist', joiningDate: '2020-04-18', shift: 'Night', status: 'Active' },
  { id: 'EMP144', name: 'Radhika Apte', email: 'radhika.apte@attendsync.com', phone: '+91 98765 43253', department: 'Sales', designation: 'Field Sales Lead', joiningDate: '2022-03-30', shift: 'Morning', status: 'Active' },
  { id: 'EMP145', name: 'Vijay Sethupathi', email: 'vijay.s@attendsync.com', phone: '+91 98765 43254', department: 'IT', designation: 'Database Architect', joiningDate: '2019-02-11', shift: 'Morning', status: 'Active' },
  { id: 'EMP146', name: 'Pallavi Sharda', email: 'pallavi.s@attendsync.com', phone: '+91 98765 43255', department: 'HR', designation: 'HR Generalist', joiningDate: '2023-08-10', shift: 'Morning', status: 'Active' },
  { id: 'EMP147', name: 'Kunal Khemu', email: 'kunal.khemu@attendsync.com', phone: '+91 98765 43256', department: 'Operations', designation: 'Safety Supervisor', joiningDate: '2021-05-16', shift: 'Evening', status: 'Active' },
  { id: 'EMP148', name: 'Fatima Sana', email: 'fatima.sana@attendsync.com', phone: '+91 98765 43257', department: 'Finance', designation: 'Investment Analyst', joiningDate: '2022-11-04', shift: 'Morning', status: 'Active' },
  { id: 'EMP149', name: 'Chetan Bhagat', email: 'chetan.bhagat@attendsync.com', phone: '+91 98765 43258', department: 'Sales', designation: 'Digital Sales Executive', joiningDate: '2023-09-01', shift: 'Morning', status: 'Active' },
  { id: 'EMP150', name: 'Ishaan Khatter', email: 'ishaan.k@attendsync.com', phone: '+91 98765 43259', department: 'IT', designation: 'Mobile App Developer', joiningDate: '2023-01-15', shift: 'Evening', status: 'Active' }
];

// Helper to generate past dates (30 days ending on 2026-09-21)
function generateDateList(daysCount = 30) {
  const dates = [];
  const baseDate = new Date('2026-09-21T12:00:00');
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

// Generate Realistic 30-Day Attendance Records for all employees
function generateSeedAttendance(employees) {
  const dates = generateDateList(30);
  const attendanceList = [];

  employees.forEach((emp) => {
    dates.forEach((dateStr, dayIndex) => {
      const dateObj = new Date(dateStr);
      const isSunday = dateObj.getDay() === 0;

      // Sundays are standard off/present placeholder or regular day off
      if (isSunday) {
        attendanceList.push({
          date: dateStr,
          employeeId: emp.id,
          checkIn: '-',
          checkOut: '-',
          status: 'Weekly Off',
          workingHours: 0,
          remarks: 'Scheduled Weekly Rest Day'
        });
        return;
      }

      let status = 'Present';
      let checkIn = '09:05 AM';
      let checkOut = '06:05 PM';
      let workingHours = 9.0;
      let remarks = 'Regular Attendance';

      // --- PLANT REALISTIC PROBLEM SCENARIOS ---
      // 1. EMP101 (Rahul Kumar - IT): Chronic absenteeism (<70% attendance)
      if (emp.id === 'EMP101') {
        if (dayIndex % 3 === 0) {
          status = 'Absent';
          checkIn = '-';
          checkOut = '-';
          workingHours = 0;
          remarks = 'Unannounced Absence';
        } else if (dayIndex % 5 === 0) {
          status = 'Late';
          checkIn = '10:15 AM';
          checkOut = '06:10 PM';
          workingHours = 7.9;
          remarks = 'Arrived late past grace period';
        }
      }
      // 2. EMP106 (Aman Verma - Sales): 4 Consecutive Absences ending today!
      else if (emp.id === 'EMP106') {
        if (dayIndex >= 26) { // Days 26, 27, 28, 29 (last 4 working days)
          status = 'Absent';
          checkIn = '-';
          checkOut = '-';
          workingHours = 0;
          remarks = 'Consecutive Unplanned Absence (Critical)';
        } else if (dayIndex % 7 === 0) {
          status = 'Leave';
          checkIn = '-';
          checkOut = '-';
          workingHours = 0;
          remarks = 'Casual Leave';
        }
      }
      // 3. EMP102 (Priya Singh - HR): Frequent Late Arrivals
      else if (emp.id === 'EMP102') {
        if (dayIndex % 4 === 1 || dayIndex >= 24) {
          status = 'Late';
          checkIn = '09:42 AM';
          checkOut = '06:30 PM';
          workingHours = 8.8;
          remarks = 'Traffic delay / Late punch-in';
        }
      }
      // 4. EMP107 (Rohit Sharma - Operations): Missing Punches (checked in, no check-out)
      else if (emp.id === 'EMP107') {
        if (dayIndex === 28 || dayIndex === 22 || dayIndex === 14) {
          status = 'Present';
          checkIn = '02:05 PM';
          checkOut = 'MISSING';
          workingHours = 0;
          remarks = 'Missing Out-Punch / Regularization Needed';
        }
      }
      // 5. EMP114 (Pooja Choudhary - Finance): Sudden drop in attendance
      else if (emp.id === 'EMP114') {
        if (dayIndex > 20 && (dayIndex % 2 === 0)) {
          status = 'Absent';
          checkIn = '-';
          checkOut = '-';
          workingHours = 0;
          remarks = 'Recent repeated absence';
        }
      }
      // Regular realistic random noise for remaining employees
      else {
        const seedVal = (parseInt(emp.id.replace('EMP', '')) * 37 + dayIndex * 13) % 100;
        if (seedVal < 82) {
          status = 'Present';
          const minOffset = (seedVal % 15);
          checkIn = `09:${String(minOffset).padStart(2, '0')} AM`;
          checkOut = `06:${String((minOffset + 5) % 30).padStart(2, '0')} PM`;
          workingHours = 9.0;
        } else if (seedVal < 90) {
          status = 'Late';
          checkIn = '09:35 AM';
          checkOut = '06:15 PM';
          workingHours = 8.6;
          remarks = 'Late arrival recorded';
        } else if (seedVal < 95) {
          status = 'Leave';
          checkIn = '-';
          checkOut = '-';
          workingHours = 0;
          remarks = 'Approved Leave';
        } else if (seedVal < 98) {
          status = 'Work From Home';
          checkIn = '09:00 AM';
          checkOut = '06:00 PM';
          workingHours = 9.0;
          remarks = 'Approved Remote Work';
        } else {
          status = 'Absent';
          checkIn = '-';
          checkOut = '-';
          workingHours = 0;
          remarks = 'Absent';
        }
      }

      // If today is 2026-09-21 (dayIndex 29), set specific today values
      if (dayIndex === 29) {
        if (emp.id === 'EMP101') { status = 'Absent'; checkIn = '-'; checkOut = '-'; }
        if (emp.id === 'EMP106') { status = 'Absent'; checkIn = '-'; checkOut = '-'; }
        if (emp.id === 'EMP102') { status = 'Late'; checkIn = '09:45 AM'; checkOut = 'Pending'; }
        if (emp.id === 'EMP107') { status = 'Present'; checkIn = '02:00 PM'; checkOut = 'MISSING'; }
      }

      attendanceList.push({
        date: dateStr,
        employeeId: emp.id,
        checkIn: checkIn,
        checkOut: checkOut,
        status: status,
        workingHours: workingHours,
        remarks: remarks
      });
    });
  });

  return attendanceList;
}

// Seed Leave Requests
const SEED_LEAVES = [
  { id: 'LV-201', employeeId: 'EMP104', employeeName: 'Sneha Patel', department: 'Sales', leaveType: 'Sick Leave', startDate: '2026-09-22', endDate: '2026-09-23', days: 2, reason: 'Viral fever and prescribed rest', status: 'Pending', requestedOn: '2026-09-20' },
  { id: 'LV-202', employeeId: 'EMP118', employeeName: 'Divya Menon', department: 'IT', leaveType: 'Casual Leave', startDate: '2026-09-25', endDate: '2026-09-26', days: 2, reason: 'Family engagement out of station', status: 'Pending', requestedOn: '2026-09-20' },
  { id: 'LV-203', employeeId: 'EMP132', employeeName: 'Alok Nath', department: 'IT', leaveType: 'Privilege Leave', startDate: '2026-10-01', endDate: '2026-10-05', days: 5, reason: 'Annual family festival celebration', status: 'Pending', requestedOn: '2026-09-19' },
  { id: 'LV-204', employeeId: 'EMP101', employeeName: 'Rahul Kumar', department: 'IT', leaveType: 'Sick Leave', startDate: '2026-09-15', endDate: '2026-09-16', days: 2, reason: 'Medical treatment', status: 'Approved', requestedOn: '2026-09-14', supervisorRemark: 'Approved on medical grounds' },
  { id: 'LV-205', employeeId: 'EMP111', employeeName: 'Suresh Reddy', department: 'Finance', leaveType: 'Casual Leave', startDate: '2026-09-10', endDate: '2026-09-11', days: 2, reason: 'Personal work at hometown', status: 'Approved', requestedOn: '2026-09-08', supervisorRemark: 'Cover arranged' },
  { id: 'LV-206', employeeId: 'EMP125', employeeName: 'Pankaj Tripathi', department: 'IT', leaveType: 'Emergency Leave', startDate: '2026-09-05', endDate: '2026-09-05', days: 1, reason: 'Domestic urgent matter', status: 'Approved', requestedOn: '2026-09-05', supervisorRemark: 'Approved emergency' },
  { id: 'LV-207', employeeId: 'EMP106', employeeName: 'Aman Verma', department: 'Sales', leaveType: 'Casual Leave', startDate: '2026-09-01', endDate: '2026-09-03', days: 3, reason: 'Travel', status: 'Rejected', requestedOn: '2026-08-30', supervisorRemark: 'Quarter-end sales audit priority' }
];

// Seed Regularization Requests (Missed Punches)
const SEED_REGULARIZATIONS = [
  { id: 'REG-101', employeeId: 'EMP107', employeeName: 'Rohit Sharma', department: 'Operations', date: '2026-09-20', originalCheckIn: '02:05 PM', originalCheckOut: 'MISSING', requestedCheckOut: '11:00 PM', reason: 'Biometric device offline during shift end', status: 'Pending', requestedOn: '2026-09-21' },
  { id: 'REG-102', employeeId: 'EMP141', employeeName: 'Varun Dhawan', department: 'IT', date: '2026-09-19', originalCheckIn: 'MISSING', originalCheckOut: '06:15 PM', requestedCheckIn: '09:10 AM', reason: 'Access card misread at turnstile gate', status: 'Pending', requestedOn: '2026-09-20' },
  { id: 'REG-103', employeeId: 'EMP120', employeeName: 'Ritu Saxena', department: 'Finance', date: '2026-09-18', originalCheckIn: 'MISSING', originalCheckOut: '06:00 PM', requestedCheckIn: '09:00 AM', reason: 'Client meeting before reporting to office', status: 'Pending', requestedOn: '2026-09-19' },
  { id: 'REG-104', employeeId: 'EMP102', employeeName: 'Priya Singh', department: 'HR', date: '2026-09-12', originalCheckIn: '09:40 AM', originalCheckOut: 'MISSING', requestedCheckOut: '06:30 PM', reason: 'Forgot to swipe out while leaving for town hall', status: 'Approved', requestedOn: '2026-09-13', supervisorRemark: 'Verified with security register' }
];

// Seed Supervisor Actions Log
const SEED_SUPERVISOR_ACTIONS = [
  { id: 'ACT-501', timestamp: '2026-09-20 04:30 PM', supervisor: 'Mo Asif (Supervisor)', employeeId: 'EMP101', employeeName: 'Rahul Kumar', issue: 'Attendance below 75% (68.0%)', action: 'Formal Warning Recorded', remark: 'Conducted 1-on-1 performance & attendance review with employee. Issued 1st warning.', status: 'Resolved' },
  { id: 'ACT-502', timestamp: '2026-09-19 11:15 AM', supervisor: 'Mo Asif (Supervisor)', employeeId: 'EMP102', employeeName: 'Priya Singh', issue: 'Frequent Late Arrival (6 occurrences)', action: 'Supervisor Follow-up', remark: 'Discussed morning transit delay. Encouraged adjusting to buffer schedule.', status: 'Follow-up Scheduled' },
  { id: 'ACT-503', timestamp: '2026-09-18 03:45 PM', supervisor: 'Mo Asif (Supervisor)', employeeId: 'EMP106', employeeName: 'Aman Verma', issue: 'Consecutive Absences (Unplanned)', action: 'Escalated to HR', remark: 'Employee unreachable on mobile phone for 3 consecutive days. Escalated to HR for emergency contact reachout.', status: 'Escalated' }
];

// Seed Audit Log Entries
const SEED_AUDIT_LOG = [
  { id: 'AUD-901', timestamp: '2026-09-21 09:30 AM', user: 'Supervisor (Mo Asif)', action: 'Daily Attendance Marked', employee: 'All Departments', details: 'Supervisor completed morning attendance verification for 50 employees' },
  { id: 'AUD-902', timestamp: '2026-09-20 04:30 PM', user: 'Supervisor (Mo Asif)', action: 'Warning Recorded', employee: 'Rahul Kumar (EMP101)', details: 'Issued formal written warning for attendance falling below 75% threshold' },
  { id: 'AUD-903', timestamp: '2026-09-20 02:15 PM', user: 'Supervisor (Mo Asif)', action: 'Leave Approved', employee: 'Rahul Kumar (EMP101)', details: 'Approved 2 days Sick Leave with medical prescription attachment' },
  { id: 'AUD-904', timestamp: '2026-09-19 11:15 AM', user: 'Supervisor (Mo Asif)', action: 'Follow-up Remark Added', employee: 'Priya Singh (EMP102)', details: 'Added counselling remark for repeated late check-in records' },
  { id: 'AUD-905', timestamp: '2026-09-18 03:45 PM', user: 'Supervisor (Mo Asif)', action: 'HR Escalation', employee: 'Aman Verma (EMP106)', details: 'Forwarded incident report to HR Department due to 3+ consecutive unapproved absences' },
  { id: 'AUD-906', timestamp: '2026-09-15 10:00 AM', user: 'Supervisor (Mo Asif)', action: 'Employee Record Updated', employee: 'Pooja Choudhary (EMP114)', details: 'Updated employee phone number and emergency contact info' }
];

// Default System Settings & Thresholds
const DEFAULT_SETTINGS = {
  systemName: 'AttendSync',
  lowAttendanceThreshold: 75,
  consecutiveAbsenceLimit: 3,
  lateArrivalLimit: 4,
  missingPunchThreshold: 2,
  standardWorkingHours: 9,
  gracePeriodMinutes: 15,
  supervisorName: 'Mo Asif',
  supervisorEmail: 'supervisor@attendsync.com',
  departmentScope: 'All Departments'
};

// ==========================================================================
// DSA IMPLEMENTATION: Hash Table with Linear Probing Collision Resolution
// ==========================================================================
class EmployeeHashTable {
  constructor(capacity = 97) {
    this.capacity = capacity;
    this.table = new Array(capacity).fill(null);
    this.size = 0;
  }

  // Hash Function: Polynomial rolling hash / ASCII summation modulo table capacity
  hash(key) {
    let hashVal = 0;
    const keyStr = String(key);
    for (let i = 0; i < keyStr.length; i++) {
      hashVal = (hashVal * 31 + keyStr.charCodeAt(i)) % this.capacity;
    }
    return hashVal;
  }

  // Insert Employee Record using Linear Probing for Collisions
  insert(employee) {
    let index = this.hash(employee.id);
    let probes = 0;

    while (this.table[index] !== null && this.table[index].id !== employee.id) {
      index = (index + 1) % this.capacity;
      probes++;
      if (probes >= this.capacity) {
        throw new Error('Hash table overflow');
      }
    }

    this.table[index] = employee;
    this.size++;
    return { index, probes };
  }

  // Search Employee by ID with Linear Probing trace tracking
  search(id) {
    const key = String(id).trim().toUpperCase();
    const initialIndex = this.hash(key);
    let index = initialIndex;
    let probes = 1;
    const probePath = [index];

    while (this.table[index] !== null) {
      if (this.table[index].id.toUpperCase() === key) {
        return {
          found: true,
          employee: this.table[index],
          initialIndex: initialIndex,
          finalIndex: index,
          probesCount: probes,
          collided: initialIndex !== index,
          probePath: probePath
        };
      }
      index = (index + 1) % this.capacity;
      probes++;
      probePath.push(index);
      if (probes > this.capacity) break;
    }

    return {
      found: false,
      employee: null,
      initialIndex: initialIndex,
      finalIndex: index,
      probesCount: probes,
      collided: false,
      probePath: probePath
    };
  }

  // Re-populate Hash Table from an array of employee records
  buildFromArray(employees) {
    this.table = new Array(this.capacity).fill(null);
    this.size = 0;
    employees.forEach(emp => this.insert(emp));
  }
}

// ==========================================================================
// Risk & Attendance Analytics Engine
// ==========================================================================
const RiskCalculator = {
  // Compute attendance stats for an employee over a given date range / attendance records
  calculateStats(employeeId, attendanceRecords) {
    const empRecords = attendanceRecords.filter(r => r.employeeId === employeeId && r.status !== 'Weekly Off');
    const totalWorkingDays = empRecords.length || 1;

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let halfDayCount = 0;
    let wfhCount = 0;
    let missingPunches = 0;

    // Track consecutive absences in chronological order
    let maxConsecutiveAbsences = 0;
    let currentConsecutiveAbsences = 0;

    // Sort by date ascending
    const sortedRecords = [...empRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedRecords.forEach(rec => {
      if (rec.status === 'Present') {
        presentCount++;
        currentConsecutiveAbsences = 0;
      } else if (rec.status === 'Late') {
        lateCount++;
        presentCount++; // Late is present with penalty
        currentConsecutiveAbsences = 0;
      } else if (rec.status === 'Work From Home') {
        wfhCount++;
        presentCount++;
        currentConsecutiveAbsences = 0;
      } else if (rec.status === 'Half Day') {
        halfDayCount++;
        presentCount += 0.5;
        currentConsecutiveAbsences = 0;
      } else if (rec.status === 'Leave') {
        leaveCount++;
        currentConsecutiveAbsences = 0;
      } else if (rec.status === 'Absent') {
        absentCount++;
        currentConsecutiveAbsences++;
        if (currentConsecutiveAbsences > maxConsecutiveAbsences) {
          maxConsecutiveAbsences = currentConsecutiveAbsences;
        }
      }

      if (rec.checkOut === 'MISSING' || rec.checkIn === 'MISSING') {
        missingPunches++;
      }
    });

    const attendancePct = Math.round(((presentCount) / totalWorkingDays) * 100 * 10) / 10;

    // Risk Score Formula:
    // Risk Score = (100 - Att%) * 0.45 + (Late * 4) + (Consecutive Absences * 12) + (Missing Punches * 8)
    const attPenalty = Math.max(0, (100 - attendancePct) * 0.45);
    const latePenalty = lateCount * 4;
    const absencePenalty = maxConsecutiveAbsences * 12;
    const missingPenalty = missingPunches * 8;

    let rawScore = Math.round(attPenalty + latePenalty + absencePenalty + missingPenalty);
    const riskScore = Math.min(100, Math.max(0, rawScore));

    let riskLevel = 'Low';
    let riskClass = 'low-risk';
    let badgeClass = 'badge-low-risk';

    if (riskScore >= 60 || attendancePct < 75 || maxConsecutiveAbsences >= 3) {
      riskLevel = 'High';
      riskClass = 'high-risk';
      badgeClass = 'badge-high-risk';
    } else if (riskScore >= 30 || lateCount >= 4 || missingPunches >= 2) {
      riskLevel = 'Medium';
      riskClass = 'medium-risk';
      badgeClass = 'badge-medium-risk';
    }

    // Reasons breakdown
    const reasons = [];
    if (attendancePct < 75) reasons.push(`Attendance rate is critically low at ${attendancePct}% (< 75%)`);
    if (maxConsecutiveAbsences >= 3) reasons.push(`${maxConsecutiveAbsences} consecutive unannounced absences detected`);
    if (lateCount >= 4) reasons.push(`Frequent late arrivals (${lateCount} occurrences in 30 days)`);
    if (missingPunches >= 1) reasons.push(`${missingPunches} incomplete / missing check-out punch record(s)`);
    if (reasons.length === 0) reasons.push('Normal attendance behavior within established policy');

    // Recommended Actions
    let recommendedAction = 'Maintain standard monitoring.';
    if (riskLevel === 'High') {
      recommendedAction = maxConsecutiveAbsences >= 3 
        ? 'Immediate supervisor contact required & initiate HR escalation.'
        : 'Schedule formal 1-on-1 performance review & issue attendance warning.';
    } else if (riskLevel === 'Medium') {
      recommendedAction = lateCount >= 4 
        ? 'Supervisor counseling regarding punctuality & buffer schedule.'
        : 'Review missed punch regularization requests.';
    }

    return {
      totalWorkingDays,
      presentCount: Math.round(presentCount),
      absentCount,
      lateCount,
      leaveCount,
      halfDayCount,
      wfhCount,
      missingPunches,
      maxConsecutiveAbsences,
      attendancePercentage: attendancePct,
      riskScore,
      riskLevel,
      riskClass,
      badgeClass,
      reasons,
      recommendedAction
    };
  }
};

// ==========================================================================
// Storage Layer (LocalStorage CRUD Engine)
// ==========================================================================
const Storage = {
  // Initialize storage with Seed Data if not present
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      this.resetDemoData();
    }
  },

  getEmployees() {
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : SEED_EMPLOYEES;
  },

  saveEmployees(employees) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  },

  getEmployeeById(id) {
    const employees = this.getEmployees();
    return employees.find(e => e.id.toUpperCase() === id.toUpperCase());
  },

  addEmployee(employee) {
    const employees = this.getEmployees();
    employees.push(employee);
    this.saveEmployees(employees);
    this.addAuditEntry('Employee Added', `${employee.name} (${employee.id})`, `New employee registered in ${employee.department} department`);
  },

  updateEmployee(employee) {
    const employees = this.getEmployees();
    const index = employees.findIndex(e => e.id === employee.id);
    if (index !== -1) {
      employees[index] = employee;
      this.saveEmployees(employees);
      this.addAuditEntry('Employee Updated', `${employee.name} (${employee.id})`, `Updated employee profile and department details`);
      return true;
    }
    return false;
  },

  deleteEmployee(id) {
    let employees = this.getEmployees();
    const emp = employees.find(e => e.id === id);
    employees = employees.filter(e => e.id !== id);
    this.saveEmployees(employees);
    if (emp) {
      this.addAuditEntry('Employee Deleted', `${emp.name} (${emp.id})`, `Employee record removed from active roster`);
    }
  },

  getAttendance() {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
  },

  saveAttendance(attendance) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
  },

  getAttendanceByDate(dateStr) {
    const attendance = this.getAttendance();
    return attendance.filter(a => a.date === dateStr);
  },

  getAttendanceByEmployee(empId) {
    const attendance = this.getAttendance();
    return attendance.filter(a => a.employeeId === empId);
  },

  updateDailyAttendance(dateStr, records) {
    const allAttendance = this.getAttendance();
    // Filter out existing records for this date
    const remaining = allAttendance.filter(a => a.date !== dateStr);
    const updated = [...remaining, ...records];
    this.saveAttendance(updated);
    this.addAuditEntry('Attendance Marked', `Date: ${dateStr}`, `Supervisor recorded/updated attendance for ${records.length} employees`);
  },

  getLeaves() {
    const data = localStorage.getItem(STORAGE_KEYS.LEAVES);
    return data ? JSON.parse(data) : SEED_LEAVES;
  },

  saveLeaves(leaves) {
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(leaves));
  },

  updateLeaveStatus(leaveId, status, remark = '') {
    const leaves = this.getLeaves();
    const item = leaves.find(l => l.id === leaveId);
    if (item) {
      item.status = status;
      item.supervisorRemark = remark;
      item.reviewedOn = new Date().toISOString().split('T')[0];
      this.saveLeaves(leaves);

      // If approved, update attendance table for those dates to 'Leave'
      if (status === 'Approved') {
        const attendance = this.getAttendance();
        attendance.forEach(att => {
          if (att.employeeId === item.employeeId && att.date >= item.startDate && att.date <= item.endDate) {
            att.status = 'Leave';
            att.remarks = `Approved Leave: ${item.leaveType} (${remark || 'Supervisor Approved'})`;
          }
        });
        this.saveAttendance(attendance);
      }

      this.addAuditEntry(`Leave ${status}`, `${item.employeeName} (${item.employeeId})`, `${item.leaveType} for ${item.days} day(s) ${status.toLowerCase()}. Remark: ${remark || 'None'}`);
      return true;
    }
    return false;
  },

  getRegularizations() {
    const data = localStorage.getItem(STORAGE_KEYS.REGULARIZATIONS);
    return data ? JSON.parse(data) : SEED_REGULARIZATIONS;
  },

  saveRegularizations(regList) {
    localStorage.setItem(STORAGE_KEYS.REGULARIZATIONS, JSON.stringify(regList));
  },

  updateRegularizationStatus(regId, status, remark = '') {
    const list = this.getRegularizations();
    const item = list.find(r => r.id === regId);
    if (item) {
      item.status = status;
      item.supervisorRemark = remark;
      item.reviewedOn = new Date().toISOString().split('T')[0];
      this.saveRegularizations(list);

      // If approved, patch the attendance record
      if (status === 'Approved') {
        const attendance = this.getAttendance();
        const attRec = attendance.find(a => a.employeeId === item.employeeId && a.date === item.date);
        if (attRec) {
          if (item.requestedCheckIn) attRec.checkIn = item.requestedCheckIn;
          if (item.requestedCheckOut) attRec.checkOut = item.requestedCheckOut;
          attRec.status = 'Present';
          attRec.remarks = `Regularized by supervisor: ${remark || 'Punch corrected'}`;
          attRec.workingHours = 9.0;
          this.saveAttendance(attendance);
        }
      }

      this.addAuditEntry(`Regularization ${status}`, `${item.employeeName} (${item.employeeId})`, `Missed punch on ${item.date} marked ${status.toLowerCase()}. Remark: ${remark || 'None'}`);
      return true;
    }
    return false;
  },

  getShifts() {
    const data = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    return data ? JSON.parse(data) : DEFAULT_SHIFTS;
  },

  saveShifts(shifts) {
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
  },

  getSupervisorActions() {
    const data = localStorage.getItem(STORAGE_KEYS.SUPERVISOR_ACTIONS);
    return data ? JSON.parse(data) : SEED_SUPERVISOR_ACTIONS;
  },

  addSupervisorAction(actionObj) {
    const actions = this.getSupervisorActions();
    const newAction = {
      id: `ACT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      supervisor: this.getSettings().supervisorName + ' (Supervisor)',
      ...actionObj
    };
    actions.unshift(newAction);
    localStorage.setItem(STORAGE_KEYS.SUPERVISOR_ACTIONS, JSON.stringify(actions));
    this.addAuditEntry(newAction.action, `${newAction.employeeName} (${newAction.employeeId})`, `${newAction.issue} -> ${newAction.remark}`);
    return newAction;
  },

  getAuditLog() {
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
    return data ? JSON.parse(data) : SEED_AUDIT_LOG;
  },

  addAuditEntry(action, employee, details) {
    const log = this.getAuditLog();
    const entry = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      user: this.getSettings().supervisorName + ' (Supervisor)',
      action: action,
      employee: employee,
      details: details
    };
    log.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(log));
  },

  getSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.addAuditEntry('Settings Updated', 'System Configuration', 'Supervisor updated threshold and monitoring settings');
  },

  // Reset entire storage to default seed data
  resetDemoData() {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(SEED_EMPLOYEES));
    const seedAtt = generateSeedAttendance(SEED_EMPLOYEES);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(seedAtt));
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(SEED_LEAVES));
    localStorage.setItem(STORAGE_KEYS.REGULARIZATIONS, JSON.stringify(SEED_REGULARIZATIONS));
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(DEFAULT_SHIFTS));
    localStorage.setItem(STORAGE_KEYS.SUPERVISOR_ACTIONS, JSON.stringify(SEED_SUPERVISOR_ACTIONS));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(SEED_AUDIT_LOG));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
};

// Global Hash Table Instance for fast search operations
const globalEmployeeHashTable = new EmployeeHashTable(97);

// Initialize data layer
Storage.init();
globalEmployeeHashTable.buildFromArray(Storage.getEmployees());
