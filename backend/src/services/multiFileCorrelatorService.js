/**
 * Dynamic Multi-File HR Intelligence Correlator & Analytics Engine:
 * Analyzes uploaded datasets (Employees, Attendance, Payroll, Performance, etc.)
 * purely from actual parsed rows without any hardcoded mock data.
 */

import { parsePromptIntent, recordMatchesPrompt } from './promptMatcherService.js';

// Helper to categorize what a file primarily holds
export const identifyFileScope = (fileName = '', rows = []) => {
  const lowerName = fileName.toLowerCase();
  const sample = rows[0] || {};
  const keys = Object.keys(sample).map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const hasEmployeeMaster = keys.some((k) =>
    k.includes('empid') || k.includes('employeeno') || k.includes('employeeid') ||
    k.includes('empname') || k.includes('employeename') || k.includes('employeedetails') ||
    k.includes('doj') || k.includes('dob') || k.includes('birthday') ||
    k.includes('bloodgroup') || k.includes('employmentstatus') || k.includes('maritalstatus') ||
    k.includes('confirmationdate') || k.includes('designation')
  );

  const hasSales = keys.some((k) =>
    k.includes('revenue') || k.includes('grosssales') || k.includes('netsales') ||
    k.includes('dailyrevenue') || k.includes('transactions') || k.includes('footfall')
  );

  const hasSalary = keys.some((k) =>
    k.includes('basesalary') || k.includes('grosssalary') || k.includes('payroll') ||
    k.includes('ctc') || k.includes('takehome') || k.includes('deductions')
  );

  const hasAttendance = keys.some((k) =>
    k.includes('presentdays') || k.includes('absentdays') || k.includes('shiftdate') ||
    k.includes('scheduledhours') || k.includes('productivehours') || k.includes('overtimehours') ||
    k.includes('restinterval') || k.includes('punchin') || k.includes('punchout') ||
    k.includes('timesheet') || k.includes('present') || k.includes('absent')
  );

  if (lowerName.includes('revenue') || lowerName.includes('sales') || lowerName.includes('finance') || hasSales) {
    return 'Branch Revenue & Telemetry';
  }
  if (lowerName.includes('attendance') || lowerName.includes('muster') || lowerName.includes('roster') || lowerName.includes('timesheet') || (hasAttendance && !hasEmployeeMaster)) {
    return 'Attendance & Shifts';
  }
  if (lowerName.includes('payroll') || (hasSalary && !hasEmployeeMaster)) {
    return 'Payroll & Compensation';
  }
  return 'Employee Master & Workforce';
};

// Correlates multiple files or single uploaded dataset
export const analyzeMultiFileHrData = async ({ files = [], customRules = null, adminPrompt = '' }) => {
  if (!files || files.length === 0) {
    return null;
  }

  const empFile = files.find((f) =>
    (f.holds && f.holds.includes('People')) ||
    (f.name && (f.name.toLowerCase().includes('employee') || f.name.toLowerCase().includes('staff')))
  );

  const attFile = files.find((f) =>
    (f.holds && f.holds.includes('Attendance')) ||
    (f.name && (f.name.toLowerCase().includes('attend') || f.name.toLowerCase().includes('roster') || f.name.toLowerCase().includes('shift')))
  );

  const salesFile = files.find((f) =>
    (f.holds && f.holds.includes('Revenue')) ||
    (f.name && (f.name.toLowerCase().includes('sale') || f.name.toLowerCase().includes('revenue') || f.name.toLowerCase().includes('business')))
  );

  // Consolidated Master Employee Map: Key = ID / Name / Index
  const masterEmployees = new Map();
  const departmentStats = {};
  let totalPayrollSpend = 0;
  let totalAttendanceSum = 0;
  let attendanceEntries = 0;
  let totalOvertimeHours = 0;
  let highOvertimeEmployees = [];
  let restIntervalViolations = 0;
  let exitedEmployees = [];
  let highAbsenceEmployees = [];

  const intent = parsePromptIntent(adminPrompt);

  // Process every uploaded file and stitch data onto master entities
  files.forEach((file) => {
    const rows = file.parsedRows || [];

    rows.forEach((row, idx) => {
      if (intent.isFiltered && !recordMatchesPrompt(row, intent)) {
        return;
      }
      const rowKeys = Object.keys(row);
      const idKey = rowKeys.find((k) => /id|emp_id|employee_id|code|badge/i.test(k));
      const nameKey = rowKeys.find((k) => /name|full_name|employee/i.test(k));
      const deptKey = rowKeys.find((k) => /dept|department|team|business_unit/i.test(k));
      const statusKey = rowKeys.find((k) => /status|active|employment|exit|resigned/i.test(k));
      const salaryKey = rowKeys.find((k) => /salary|pay|gross|wage|compensation/i.test(k));
      const overtimeKey = rowKeys.find((k) => /overtime|ot_hours|ot/i.test(k));
      const attendKey = rowKeys.find((k) => /attendance|present|score|hours_worked|days|shifts/i.test(k));
      const restKey = rowKeys.find((k) => /rest|interval|turnaround/i.test(k));

      // Derive consistent primary key
      const idVal = (idKey && String(row[idKey]).trim()) || '';
      const nameVal = (nameKey && String(row[nameKey]).trim()) || '';
      const primaryKey = idVal || nameVal || `EMP-${idx + 1}`;

      if (!masterEmployees.has(primaryKey)) {
        masterEmployees.set(primaryKey, {
          id: idVal || primaryKey,
          name: nameVal || idVal || null,
          department: (deptKey && String(row[deptKey])) || null,
          branch: (row.branch || row.location) ? String(row.branch || row.location) : null,
          status: 'Active',
          salary: 0,
          attendance: null,
          overtime: 0,
          restIntervals: [],
          sources: []
        });
      }

      const emp = masterEmployees.get(primaryKey);
      emp.sources.push(file.name);

      if (deptKey && row[deptKey]) emp.department = String(row[deptKey]);
      if (row.branch || row.location) emp.branch = String(row.branch || row.location);

      // Check Status
      if (statusKey && row[statusKey]) {
        const s = String(row[statusKey]).toLowerCase();
        if (s.includes('exit') || s.includes('resigned') || s.includes('notice') || s.includes('left') || s.includes('inactive')) {
          emp.status = 'Exited';
          if (!exitedEmployees.find((e) => e.id === emp.id)) {
            exitedEmployees.push(emp);
          }
        }
      }

      // Check Salary
      if (salaryKey && row[salaryKey]) {
        const sal = parseFloat(String(row[salaryKey]).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(sal) && sal > 0) {
          emp.salary = sal;
          totalPayrollSpend += sal;
        }
      }

      // Check Overtime
      if (overtimeKey && row[overtimeKey]) {
        const ot = parseFloat(String(row[overtimeKey]).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(ot) && ot > 0) {
          emp.overtime += ot;
          totalOvertimeHours += ot;
          if (ot > 10 && !highOvertimeEmployees.find((e) => e.id === emp.id)) {
            highOvertimeEmployees.push({ id: emp.id, name: emp.name, ot, branch: emp.branch });
          }
        }
      }

      // Check Rest Intervals
      if (restKey && row[restKey]) {
        const rest = parseFloat(String(row[restKey]).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(rest) && rest > 0 && rest < 10) {
          restIntervalViolations++;
          emp.restIntervals.push(rest);
        }
      }

      // Check Attendance
      if (attendKey && row[attendKey]) {
        const att = parseFloat(String(row[attendKey]).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(att)) {
          emp.attendance = att;
          totalAttendanceSum += att;
          attendanceEntries++;
          if (att < 85 && !highAbsenceEmployees.find((e) => e.id === emp.id)) {
            highAbsenceEmployees.push({ id: emp.id, name: emp.name, att, dept: emp.department });
          }
        }
      }
    });
  });

  const totalHeadcount = masterEmployees.size;
  if (totalHeadcount === 0) {
    return null;
  }

  // Aggregate Department stats
  masterEmployees.forEach((emp) => {
    const dept = emp.department || 'Operations';
    if (!departmentStats[dept]) {
      departmentStats[dept] = { total: 0, exited: 0, payroll: 0, attendanceSum: 0, count: 0 };
    }
    departmentStats[dept].total += 1;
    if (emp.status === 'Exited') {
      departmentStats[dept].exited += 1;
    }
    departmentStats[dept].payroll += emp.salary;
    if (emp.attendance !== null) {
      departmentStats[dept].attendanceSum += emp.attendance;
      departmentStats[dept].count += 1;
    }
  });

  // Calculate actual metrics from real data
  const targetAttrition = (customRules && customRules.targetAttrition) || 5.0;
  const targetProductivity = (customRules && customRules.targetProductivity) || 90;

  const calculatedAttrition = totalHeadcount > 0 
    ? ((exitedEmployees.length / totalHeadcount) * 100).toFixed(1) 
    : '0.0';

  const calculatedProductivity = attendanceEntries > 0
    ? Math.min(100, Math.round(totalAttendanceSum / attendanceEntries))
    : 100;

  const activeDateRange = customRules?.timeHorizon || 'Current Ingested Period';

  // Dynamic Health Score
  const productivityGap = Math.max(0, targetProductivity - calculatedProductivity);
  const attritionGap = Math.max(0, parseFloat(calculatedAttrition) - targetAttrition);
  const healthScoreNum = Math.max(50, Math.min(100, Math.round(100 - (attritionGap * 4) - (productivityGap * 2))));

  // Pure raw data anomaly detection — stored as raw telemetry flags, NOT attention items
  const rawTelemetryFlags = [];
  let issueCounter = 1;

  // 1. DATASET 1: EMPLOYEES MASTER (Raw data records only)
  if (empFile) {
    if (exitedEmployees.length > 0) {
      rawTelemetryFlags.push({
        id: `flag-emp-attrition-${issueCounter++}`,
        flagType: 'attrition_detected',
        sourceFile: empFile.name,
        branch: exitedEmployees[0]?.branch || null,
        department: exitedEmployees[0]?.department || null,
        data: {
          exitCount: exitedEmployees.length,
          attritionRatePct: parseFloat(calculatedAttrition),
          targetAttritionPct: targetAttrition,
          totalHeadcount,
          exitedEmployees: exitedEmployees.map((e) => ({
            id: e.id,
            name: e.name,
            department: e.department,
            branch: e.branch,
            status: e.status
          }))
        }
      });
    }

    if (totalPayrollSpend > 0) {
      const deptKeys = Object.keys(departmentStats);
      rawTelemetryFlags.push({
        id: `flag-emp-payroll-${issueCounter++}`,
        flagType: 'payroll_distribution',
        sourceFile: empFile.name,
        data: {
          totalPayrollSpend,
          totalHeadcount,
          averageSalary: totalHeadcount > 0 ? Math.round(totalPayrollSpend / totalHeadcount) : 0,
          departmentCount: deptKeys.length,
          departmentStats
        }
      });
    }

    if (totalHeadcount > 0) {
      rawTelemetryFlags.push({
        id: `flag-emp-headcount-${issueCounter++}`,
        flagType: 'workforce_headcount_distribution',
        sourceFile: empFile.name,
        data: {
          totalHeadcount,
          departmentBreakdown: departmentStats
        }
      });
    }
  }

  // 2. DATASET 2: ATTENDANCE & SHIFTS (Raw data records only — zero fallback numbers)
  if (attFile) {
    const aRows = attFile.parsedRows || [];

    if (restIntervalViolations > 0) {
      rawTelemetryFlags.push({
        id: `flag-att-rest-${issueCounter++}`,
        flagType: 'rest_interval_violations',
        sourceFile: attFile.name,
        branch: highOvertimeEmployees[0]?.branch || null,
        data: {
          restIntervalViolations,
          totalShiftEntries: aRows.length,
          violationRatePct: aRows.length > 0 ? parseFloat(((restIntervalViolations / aRows.length) * 100).toFixed(2)) : null
        }
      });
    }

    if (totalOvertimeHours > 0) {
      rawTelemetryFlags.push({
        id: `flag-att-overtime-${issueCounter++}`,
        flagType: 'overtime_concentration',
        sourceFile: attFile.name,
        branch: highOvertimeEmployees[0]?.branch || null,
        data: {
          totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
          highOvertimeEmployeeCount: highOvertimeEmployees.length,
          highOvertimeEmployees: highOvertimeEmployees.map((e) => ({
            id: e.id,
            name: e.name,
            ot: e.ot,
            branch: e.branch
          }))
        }
      });
    }

    if (highAbsenceEmployees.length > 0) {
      rawTelemetryFlags.push({
        id: `flag-att-absence-${issueCounter++}`,
        flagType: 'absence_detected',
        sourceFile: attFile.name,
        data: {
          highAbsenceEmployeeCount: highAbsenceEmployees.length,
          highAbsenceEmployees: highAbsenceEmployees.map((e) => ({
            id: e.id,
            name: e.name,
            att: e.att,
            dept: e.dept
          }))
        }
      });
    }
  }

  // 3. DATASET 3: BUSINESS OUTPUT & SALES (Raw data records only — zero fake stores or fallbacks)
  let salesSummaryData = null;
  if (salesFile && salesFile.parsedRows && salesFile.parsedRows.length > 0) {
    const sRows = salesFile.parsedRows;
    const zeroRevBranches = [];
    const branchRevs = [];
    let totalDailyRev = 0;
    let totalTx = 0;

    sRows.forEach((r) => {
      const rev = parseFloat(String(r.daily_revenue || r.revenue || 0).replace(/[^0-9.-]/g, '')) || 0;
      const tx = parseFloat(String(r.transactions_count || r.transactions || r.bills || 0).replace(/[^0-9.-]/g, '')) || 0;
      totalDailyRev += rev;
      totalTx += tx;
      const bName = String(r.branch || r.location || r.store || '').trim();
      if (bName) {
        branchRevs.push({ branch: bName, rev, tx });
        if (rev === 0) zeroRevBranches.push(bName);
      }
    });

    salesSummaryData = {
      totalDailyRev,
      totalTx,
      branchCount: branchRevs.length,
      zeroRevBranchesCount: zeroRevBranches.length
    };

    if (zeroRevBranches.length > 0) {
      rawTelemetryFlags.push({
        id: `flag-sales-zero-${issueCounter++}`,
        flagType: 'zero_revenue_branches',
        sourceFile: salesFile.name,
        branch: zeroRevBranches[0] || null,
        data: {
          zeroRevenueBranchCount: zeroRevBranches.length,
          zeroRevenueBranches: zeroRevBranches,
          totalBranches: branchRevs.length,
          totalDailyRevenue: totalDailyRev
        }
      });
    }

    if (totalDailyRev > 0 || totalTx > 0) {
      rawTelemetryFlags.push({
        id: `flag-sales-summary-${issueCounter++}`,
        flagType: 'sales_telemetry_distribution',
        sourceFile: salesFile.name,
        data: {
          totalDailyRevenue: totalDailyRev,
          totalTransactions: totalTx,
          totalBranches: branchRevs.length,
          topBranches: branchRevs.sort((a, b) => b.rev - a.rev).slice(0, 5)
        }
      });
    }
  }

  // 4. CROSS-DATASET CORRELATION (Raw data records only)
  if (salesFile && attFile) {
    const sRows = salesFile.parsedRows || [];
    const aRows = attFile.parsedRows || [];
    const totalDailyRev = sRows.reduce((sum, r) => sum + (parseFloat(String(r.daily_revenue || r.revenue || 0).replace(/[^0-9.-]/g, '')) || 0), 0);

    rawTelemetryFlags.push({
      id: `flag-cross-att-sales-${issueCounter++}`,
      flagType: 'cross_dataset_fatigue_sales',
      sourceFile: `${attFile.name} + ${salesFile.name}`,
      data: {
        restIntervalViolations,
        totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
        totalDailyRevenue: totalDailyRev,
        shiftCount: aRows.length,
        storeCount: sRows.length
      }
    });
  }

  // 5. PROMPT-MATCHING ROWS (Raw data records only)
  if (adminPrompt && adminPrompt.trim()) {
    const pClean = adminPrompt.toLowerCase().replace(/only show|show|focus on|filter by|data|employees?|staff|please|all/gi, '').trim();
    if (pClean.length > 2) {
      const matched = Array.from(masterEmployees.values()).filter((e) =>
        JSON.stringify(e).toLowerCase().includes(pClean)
      );
      if (matched.length > 0) {
        rawTelemetryFlags.unshift({
          id: `flag-prompt-match-${issueCounter++}`,
          flagType: 'prompt_filter_match',
          sourceFile: 'Ingested Datasets',
          data: {
            promptQuery: pClean,
            matchedRecordCount: matched.length,
            matchedRecords: matched.slice(0, 10).map((e) => ({
              id: e.id,
              name: e.name,
              department: e.department,
              branch: e.branch,
              status: e.status
            }))
          }
        });
      }
    }
  }

  // Dynamic KPI Metrics calculated strictly from real data
  const monitoredCount = totalHeadcount > 0 ? totalHeadcount : (salesFile?.parsedRows?.length || 0);
  const monitoredTitle = totalHeadcount > 0 ? 'Staff Monitored' : 'Locations Monitored';
  const evaluatedHealthScore = totalHeadcount > 0 ? `${healthScoreNum}%` : 'N/A';
  const evaluatedHealthStatus = totalHeadcount > 0 
    ? (healthScoreNum >= 80 ? 'Healthy' : healthScoreNum >= 65 ? 'Needs Attention' : 'Critical') 
    : 'Insufficient Data';

  const kpiMetrics = [
    {
      id: 'issues',
      title: 'Issues Detected',
      value: '0',
      trend: 'Awaiting AI analysis',
      trendPositive: true,
      colorClass: 'hr-kpi-icon-purple'
    },
    {
      id: 'decisions',
      title: 'Awaited Decisions',
      value: '0',
      trend: 'Awaiting AI analysis',
      trendPositive: true,
      colorClass: 'hr-kpi-icon-red'
    },
    {
      id: 'monitored',
      title: intent.isFiltered ? 'Staff Monitored' : monitoredTitle,
      value: String(monitoredCount),
      trend: intent.isFiltered ? `${monitoredCount} records matching "${adminPrompt}"` : `${monitoredCount} records ingested`,
      trendPositive: true,
      colorClass: 'hr-kpi-icon-green'
    },
    {
      id: 'opportunities',
      title: 'Opportunities',
      value: '0',
      trend: 'Optimization levers',
      trendPositive: true,
      colorClass: 'hr-kpi-icon-orange'
    },
    {
      id: 'productivity',
      title: 'Avg. Productivity',
      value: `${calculatedProductivity}%`,
      trend: `${calculatedProductivity}% attendance rate`,
      trendPositive: calculatedProductivity >= targetProductivity,
      colorClass: 'hr-kpi-icon-blue'
    }
  ];

  return {
    status: 'success',
    connectedFilesCount: files.length,
    fileNames: files.map((f) => f.name),
    fileScope: files.length === 1 ? files[0].holds : 'Connected Datasets Telemetry',
    totalRecords: totalHeadcount,
    analyzedAt: new Date().toISOString(),
    reportingPeriod: activeDateRange,
    customRulesApplied: customRules || null,
    adminPromptApplied: adminPrompt || null,
    healthScore: evaluatedHealthScore,
    healthStatus: evaluatedHealthStatus,
    kpiMetrics,
    attentionItems: [], // Pure real AI data only — zero mock/fallback items
    rawTelemetryFlags,
    attentionSummary: intent.isFiltered
      ? `Filtered dataset intelligence active: Focused on "${adminPrompt}" (${totalHeadcount} employee records). Ready for AI synthesis.`
      : (totalHeadcount > 0
          ? `Ingested ${totalHeadcount} employee records across ${files.length} connected dataset(s): ${exitedEmployees.length} exits, ${Math.round(totalOvertimeHours)} overtime hours, ${restIntervalViolations} rest interval violations detected. Ready for AI synthesis.`
          : `Ingested ${files.length} connected dataset(s).`),
    departmentBreakdown: departmentStats
  };
};