/**
 * Brynex One AI HR Brain - Deterministic Employee Data Query Service
 * 
 * Provides secure, read-only, deterministic row-level queries on parsed
 * employee datasets (CSV/XLSX) and LMS synced profiles.
 * 
 * Features:
 * - Exact Employee ID lookup (e.g., EMP610, EMP626)
 * - Filtering by Status ('Probation', 'Confirmed') and Employment Status ('Active', 'Resigned')
 * - Robust Date Parsing & Confirmation Date range filtering
 * - Chronological integrity checks (DOJ vs LWD, Active with LWD)
 * - Blank/null field auditing
 * - Store/Branch level filtering with branch isolation
 * - Aggregate counts, percentages, and distribution breakdowns
 * - Automatic PII redaction (PAN, UAN, Phone, Bank details)
 * - Complete audit metadata (source file ID, row counts, calculation method, reference date)
 */

// Canonical PII field identifiers to sanitize
const PII_FIELDS = [
  'pan no', 'pan', 'panno', 'pan_number',
  'uan no', 'uan', 'uanno', 'uan_number',
  'phone no', 'phone', 'phoneno', 'mobile', 'cell', 'contact',
  'bank a/c no', 'bank ac no', 'bank account no', 'bank_account_no', 'bank_acc', 'bank_account',
  'current access card no.', 'access card', 'access_card_no'
];

/**
 * Robustly parses various date formats into standard JavaScript Date
 * Supports:
 * - ISO: 2026-09-01, 2026-09-01T00:00:00Z
 * - Textual: "30 Nov 2026", "09 JUN 2003", "20 Dec 2026"
 * - Delimited: "30/11/2026", "30-11-2026", "11/30/2026"
 */
export const parseFlexibleDate = (dateVal) => {
  if (!dateVal || dateVal === '' || dateVal === null || dateVal === undefined) {
    return null;
  }

  // If already a Date object
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return dateVal;
  }

  const str = String(dateVal).trim();
  if (!str) return null;

  // Month names dictionary
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  // 1. Text format: "30 Nov 2026" or "09 JUN 2003"
  const textMatch = str.match(/^(\d{1,2})[\s\-]+([A-Za-z]{3,9})[\s\-]+(\d{4})$/);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const mStr = textMatch[2].substring(0, 3).toLowerCase();
    const year = parseInt(textMatch[3], 10);
    if (months[mStr] !== undefined && day >= 1 && day <= 31 && year > 1900 && year < 2100) {
      const d = new Date(Date.UTC(year, months[mStr], day));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 2. ISO format: "YYYY-MM-DD"
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  // 3. DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  // Standard Date fallback
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
};

/**
 * Format Date to clean standard ISO "YYYY-MM-DD"
 */
export const formatDateIso = (d) => {
  if (!d) return null;
  const dateObj = d instanceof Date ? d : parseFlexibleDate(d);
  if (!dateObj || isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString().split('T')[0];
};

/**
 * Mask PII fields to protect privacy and comply with access restrictions
 */
export const maskPii = (row, includePii = false) => {
  if (!row || typeof row !== 'object') return row;
  if (includePii) return { ...row };

  const sanitized = {};
  for (const [key, value] of Object.entries(row)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isPii = PII_FIELDS.some((p) => cleanKey === p.replace(/[^a-z0-9]/g, '') || cleanKey.includes('panno') || cleanKey.includes('uanno') || cleanKey.includes('bankac') || cleanKey.includes('phoneno'));

    if (isPii) {
      if (!value || String(value).trim() === '') {
        sanitized[key] = '';
      } else {
        const valStr = String(value).trim();
        if (cleanKey.includes('pan')) {
          sanitized[key] = valStr.length > 4 ? `[REDACTED_PAN_***${valStr.slice(-4)}]` : '[REDACTED_PAN]';
        } else if (cleanKey.includes('uan')) {
          sanitized[key] = valStr.length > 4 ? `[REDACTED_UAN_***${valStr.slice(-4)}]` : '[REDACTED_UAN]';
        } else if (cleanKey.includes('phone') || cleanKey.includes('contact') || cleanKey.includes('mobile')) {
          sanitized[key] = valStr.length > 4 ? `[REDACTED_PHONE_***${valStr.slice(-4)}]` : '[REDACTED_PHONE]';
        } else if (cleanKey.includes('bank')) {
          sanitized[key] = valStr.length > 4 ? `[REDACTED_BANK_***${valStr.slice(-4)}]` : '[REDACTED_BANK_ACC]';
        } else {
          sanitized[key] = '[REDACTED_PII]';
        }
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Standardize and extract key employee attributes from row with varying column namings
 */
export const extractRowAttributes = (row = {}) => {
  const entries = Object.entries(row);

  const findVal = (patterns) => {
    for (const p of patterns) {
      for (const [k, v] of entries) {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanK === p || (p.length >= 3 && cleanK.includes(p))) {
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            return String(v).trim();
          }
        }
      }
    }
    return '';
  };

  const empId = findVal(['empid', 'employeeno', 'employeeid', 'badge', 'code', 'id']) || row.id || row.emp_id || '';
  const empName = findVal(['empname', 'employeename', 'employeedetails', 'fullname', 'staffname', 'name']) || row.name || row.full_name || '';
  const status = findVal(['status', 'employeestatus', 'state']) || row.status || '';
  const employmentStatus = findVal(['employmentstatus', 'workstatus', 'activeinactive']) || row.employment_status || '';
  const confirmationDateRaw = findVal(['confirmationdate', 'probationconfirmation', 'confirmedon']) || row['Confirmation Date'] || row.confirmation_date || '';
  const dojRaw = findVal(['doj', 'dateofjoining', 'joiningdate', 'hiredate']) || row.doj || row.joining_date || '';
  const lwdRaw = findVal(['lwd', 'lastworkingday', 'lastworkingdate', 'exitdate', 'resignationdate']) || row.lwd || row.last_working_day || '';
  const store = findVal(['storename', 'location', 'workingbranch', 'branch', 'costcenter', 'unit']) || row.store || row.branch || '';
  const department = findVal(['department', 'dept', 'team', 'businessunit']) || row.department || row.dept || '';
  const designation = findVal(['designation', 'role', 'roletitle', 'title', 'position', 'grade']) || row.designation || row.role || '';

  return {
    empId,
    empName,
    status,
    employmentStatus,
    confirmationDateRaw,
    confirmationDateParsed: parseFlexibleDate(confirmationDateRaw),
    confirmationDateIso: formatDateIso(confirmationDateRaw),
    dojRaw,
    dojParsed: parseFlexibleDate(dojRaw),
    dojIso: formatDateIso(dojRaw),
    lwdRaw,
    lwdParsed: parseFlexibleDate(lwdRaw),
    lwdIso: formatDateIso(lwdRaw),
    store,
    department,
    designation
  };
};

/**
 * Execute a deterministic, authorized query against parsed employee rows
 * 
 * @param {Array<Object>} rows - Array of employee row objects
 * @param {Object} options - Query filters and configuration
 * @returns {Object} Deterministic query result with audit metadata
 */
export const queryEmployeeData = (rows = [], options = {}) => {
  const {
    fileId = 'dataset',
    fileName = 'Employee Dataset',
    empId = null,
    status = null,
    employmentStatus = null,
    confirmationDateStart = null,
    confirmationDateEnd = null,
    dojStart = null,
    dojEnd = null,
    store = null,
    branch = null,
    department = null,
    hasConfirmationDate = null,
    hasLwd = null,
    includePii = false,
    branchIsolationScope = null, // e.g. ['SUITOR GUY EDAPPALLY'] or null if unrestricted
    checkChronology = false,
    auditBlankFields = []
  } = options;

  const referenceDate = new Date().toISOString();

  // If no rows available, explicitly return unverified response
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return {
      status: 'unverified',
      verified: false,
      message: 'Raw row-level employee data is unavailable. Requested individual employee data cannot be verified.',
      sourceFileId: fileId,
      sourceFileName: fileName,
      referenceDate,
      totalRecordsInSource: 0,
      matchedCount: 0,
      returnedCount: 0,
      filtersApplied: options,
      calculationMethod: 'Deterministic row-level evaluation (no rows found)',
      results: []
    };
  }

  const targetStore = (store || branch || '').trim().toLowerCase();
  const targetEmpId = empId ? String(empId).trim().toLowerCase().replace(/[^a-z0-9]/g, '') : null;
  const targetStatus = status ? String(status).trim().toLowerCase() : null;
  const targetEmpStatus = employmentStatus ? String(employmentStatus).trim().toLowerCase() : null;

  const confStart = confirmationDateStart ? parseFlexibleDate(confirmationDateStart) : null;
  const confEnd = confirmationDateEnd ? parseFlexibleDate(confirmationDateEnd) : null;
  const dStart = dojStart ? parseFlexibleDate(dojStart) : null;
  const dEnd = dojEnd ? parseFlexibleDate(dojEnd) : null;

  // Filter rows
  const matched = [];
  const statusCounts = {};
  const empStatusCounts = {};
  const storeCounts = {};
  const deptCounts = {};
  let populatedConfDatesCount = 0;
  let activeWithLwdCount = 0;

  // Chronology tracking
  const chronologyViolations = [];

  // Blank field tracking
  const blankCounts = {};
  const fieldsToCheck = Array.isArray(auditBlankFields) && auditBlankFields.length > 0
    ? auditBlankFields
    : ['Confirmation Date', 'LWD', 'PAN No', 'UAN No', 'Phone No', 'Manager ID'];
  fieldsToCheck.forEach((f) => { blankCounts[f] = 0; });

  rows.forEach((row, index) => {
    const attr = extractRowAttributes(row);

    // Track aggregates across the whole source dataset
    const stNorm = attr.status || 'Unspecified';
    statusCounts[stNorm] = (statusCounts[stNorm] || 0) + 1;

    const estNorm = attr.employmentStatus || 'Unspecified';
    empStatusCounts[estNorm] = (empStatusCounts[estNorm] || 0) + 1;

    if (attr.store) {
      storeCounts[attr.store] = (storeCounts[attr.store] || 0) + 1;
    }
    if (attr.department) {
      deptCounts[attr.department] = (deptCounts[attr.department] || 0) + 1;
    }

    if (attr.confirmationDateParsed) {
      populatedConfDatesCount++;
    }

    // Chronology check: Active employee with an LWD populated
    const isActive = attr.employmentStatus.toLowerCase() === 'active';
    const hasLwdVal = attr.lwdRaw && attr.lwdRaw.trim() !== '';
    if (isActive && hasLwdVal) {
      activeWithLwdCount++;
      if (checkChronology) {
        chronologyViolations.push({
          type: 'ACTIVE_EMPLOYEE_WITH_LWD',
          empId: attr.empId,
          empName: attr.empName,
          doj: attr.dojIso,
          lwd: attr.lwdIso || attr.lwdRaw,
          issue: `Employee is marked Active but has a Last Working Day populated: ${attr.lwdRaw}`
        });
      }
    }

    // Chronology check: LWD earlier than DOJ
    if (attr.lwdParsed && attr.dojParsed && attr.lwdParsed.getTime() < attr.dojParsed.getTime()) {
      if (checkChronology) {
        chronologyViolations.push({
          type: 'LWD_BEFORE_DOJ',
          empId: attr.empId,
          empName: attr.empName,
          doj: attr.dojIso,
          lwd: attr.lwdIso,
          issue: `Last Working Day (${attr.lwdIso}) is earlier than Date of Joining (${attr.dojIso})`
        });
      }
    }

    // Blank field checks
    fieldsToCheck.forEach((f) => {
      const val = row[f];
      if (val === undefined || val === null || String(val).trim() === '') {
        blankCounts[f]++;
      }
    });

    // --- APPLY FILTERS ---

    // 1. Branch Isolation Security Check
    if (branchIsolationScope && Array.isArray(branchIsolationScope) && branchIsolationScope.length > 0) {
      const rowStoreClean = attr.store.toLowerCase();
      const inScope = branchIsolationScope.some((allowed) => rowStoreClean.includes(allowed.toLowerCase()));
      if (!inScope) return;
    }

    // 2. Emp ID Filter
    if (targetEmpId) {
      const cleanRowEmpId = attr.empId.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanRowEmpId !== targetEmpId) return;
    }

    // 3. Status Filter (e.g. 'Probation', 'Confirmed')
    if (targetStatus) {
      const rowStatusClean = attr.status.toLowerCase();
      if (!rowStatusClean.includes(targetStatus)) return;
    }

    // 4. Employment Status Filter (e.g. 'Active', 'Resigned')
    if (targetEmpStatus) {
      const rowEmpStatusClean = attr.employmentStatus.toLowerCase();
      if (!rowEmpStatusClean.includes(targetEmpStatus)) return;
    }

    // 5. Store / Branch Filter
    if (targetStore) {
      const rowStoreClean = attr.store.toLowerCase();
      if (!rowStoreClean.includes(targetStore)) return;
    }

    // 6. Department Filter
    if (department) {
      const rowDeptClean = attr.department.toLowerCase();
      if (!rowDeptClean.includes(department.toLowerCase())) return;
    }

    // 7. Confirmation Date Range Filter
    if (confStart || confEnd) {
      if (!attr.confirmationDateParsed) return;
      if (confStart && attr.confirmationDateParsed.getTime() < confStart.getTime()) return;
      if (confEnd && attr.confirmationDateParsed.getTime() > confEnd.getTime()) return;
    }

    // 8. DOJ Date Range Filter
    if (dStart || dEnd) {
      if (!attr.dojParsed) return;
      if (dStart && attr.dojParsed.getTime() < dStart.getTime()) return;
      if (dEnd && attr.dojParsed.getTime() > dEnd.getTime()) return;
    }

    // 9. Populated / Null Confirmation Date filter
    if (hasConfirmationDate === true && !attr.confirmationDateParsed) return;
    if (hasConfirmationDate === false && attr.confirmationDateParsed) return;

    // 10. Populated / Null LWD filter
    if (hasLwd === true && !hasLwdVal) return;
    if (hasLwd === false && hasLwdVal) return;

    // Record passed all filters
    matched.push(maskPii(row, includePii));
  });

  return {
    status: 'success',
    verified: true,
    sourceFileId: fileId,
    sourceFileName: fileName,
    referenceDate,
    totalRecordsInSource: rows.length,
    matchedCount: matched.length,
    returnedCount: matched.length,
    filtersApplied: options,
    calculationMethod: 'Deterministic row-level evaluation across parsed dataset',
    aggregates: {
      statusBreakdown: statusCounts,
      employmentStatusBreakdown: empStatusCounts,
      storeBreakdown: storeCounts,
      departmentBreakdown: deptCounts,
      populatedConfirmationDatesCount: populatedConfDatesCount,
      activeWithLwdCount,
      blankFieldCounts: blankCounts
    },
    chronologyAudit: {
      performed: checkChronology,
      violationCount: chronologyViolations.length,
      violations: chronologyViolations
    },
    results: matched
  };
};

/**
 * Format deterministic query results into an executive, tamper-proof summary block for Claude AI
 */
export const formatQueryResultForAi = (queryResponse = {}) => {
  if (!queryResponse || queryResponse.verified === false) {
    return `
--- VERIFIED DATA VERIFICATION STATUS: UNAVAILABLE ---
ALERT TO ASSISTANT:
The requested individual employee facts cannot be verified because raw row-level records are unavailable or the specified ID was not found in the ingested datasets.
YOU MUST EXPLICITLY STATE THAT THIS DATA CANNOT BE VERIFIED FROM THE INGESTED RECORDS. DO NOT GUESS OR ESTIMATE INDIVIDUAL DATES, SALARIES, OR VALUES.
`;
  }

  const {
    sourceFileId,
    sourceFileName,
    referenceDate,
    totalRecordsInSource,
    matchedCount,
    filtersApplied,
    calculationMethod,
    aggregates,
    chronologyAudit,
    results
  } = queryResponse;

  const sampleResults = (results || []).slice(0, 25);
  const displayResults = sampleResults.map((r) => {
    const attr = extractRowAttributes(r);
    return `  - Emp ID: ${attr.empId} | Name: ${attr.empName} | Status: ${attr.status} | Employment Status: ${attr.employmentStatus} | Confirmation Date: ${attr.confirmationDateIso || attr.confirmationDateRaw || 'N/A'} | DOJ: ${attr.dojIso || 'N/A'} | Store: ${attr.store} | Role: ${attr.designation}`;
  }).join('\n');

  return `
--- DETERMINISTIC VERIFIED EMPLOYEE DATA QUERY (AUTHORIZED RECORD LAYER) ---
Source File: "${sourceFileName}" (ID: ${sourceFileId})
Reference Date: ${referenceDate}
Calculation Method: ${calculationMethod}
Total Records in File: ${totalRecordsInSource}
Records Matching Query: ${matchedCount}
Filters Applied: ${JSON.stringify(filtersApplied || {})}

AUDIT METRICS & AGGREGATES:
- Total Populated Confirmation Dates: ${aggregates?.populatedConfirmationDatesCount || 0}
- Active Employees with LWD: ${aggregates?.activeWithLwdCount || 0} (Strict standard: 0 active employees should possess an LWD)
- Status Distribution: ${JSON.stringify(aggregates?.statusBreakdown || {})}
- Employment Status Distribution: ${JSON.stringify(aggregates?.employmentStatusBreakdown || {})}
${chronologyAudit?.performed ? `- Chronology Violations Found: ${chronologyAudit.violationCount}` : ''}
${aggregates?.blankFieldCounts ? `- Blank/Null Field Counts: ${JSON.stringify(aggregates.blankFieldCounts)}` : ''}

VERIFIED RECORD DETAILS (${sampleResults.length} of ${matchedCount} matching records shown):
${displayResults || '  (No matching records found for the applied filter)'}

CRITICAL DIRECTIVE FOR ASSISTANT:
Ground your response strictly on these verified deterministic query records. Do not guess dates, IDs, or statuses. Note that all PII (PAN, UAN, Phone No, Bank A/c No) has been intentionally masked for data protection.
`;
};

