import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import csvParser from 'csv-parser';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');

/**
 * Normalizes helper keys on parsed row objects while preserving all original keys.
 */
export const enrichRowWithNormalizedKeys = (row) => {
  if (!row || typeof row !== 'object') return row;
  const enriched = { ...row };
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

  const idVal = findVal(['empid', 'employeeno', 'employeeid', 'badge', 'code', 'id']);
  const nameVal = findVal(['empname', 'employeename', 'employeedetails', 'fullname', 'staffname', 'name']);
  const deptVal = findVal(['department', 'dept', 'team', 'businessunit']);
  const roleVal = findVal(['designation', 'role', 'roletitle', 'title', 'position', 'grade']);
  const branchVal = findVal(['location', 'storename', 'workingbranch', 'branch', 'costcenter']);
  const emailVal = findVal(['emailid', 'email', 'mail']);
  const phoneVal = findVal(['phoneno', 'phone', 'contact', 'mobile', 'cell']);
  const statusVal = findVal(['employmentstatus', 'status', 'employmenttype', 'state']);
  const dojVal = findVal(['doj', 'dateofjoining', 'joiningdate', 'hiredate']);
  const dobVal = findVal(['dob', 'dateofbirth', 'birthday']);
  const genderVal = findVal(['gender', 'sex']);
  const bloodVal = findVal(['bloodgroup', 'blood']);
  const managerVal = findVal(['managername', 'manager', 'reportingto']);

  if (idVal && !enriched.id) enriched.id = idVal;
  if (idVal && !enriched.emp_id) enriched.emp_id = idVal;
  if (nameVal && !enriched.name) enriched.name = nameVal;
  if (nameVal && !enriched.full_name) enriched.full_name = nameVal;
  if (deptVal && !enriched.dept) enriched.dept = deptVal;
  if (deptVal && !enriched.department) enriched.department = deptVal;
  if (roleVal && !enriched.role) enriched.role = roleVal;
  if (roleVal && !enriched.designation) enriched.designation = roleVal;
  if (branchVal && !enriched.branch) enriched.branch = branchVal;
  if (emailVal && !enriched.email) enriched.email = emailVal;
  if (phoneVal && !enriched.phone) enriched.phone = phoneVal;
  if (statusVal && !enriched.status) enriched.status = statusVal;
  if (dojVal && !enriched.doj) enriched.doj = dojVal;
  if (dobVal && !enriched.dob) enriched.dob = dobVal;
  if (genderVal && !enriched.gender) enriched.gender = genderVal;
  if (bloodVal && !enriched.blood_group) enriched.blood_group = bloodVal;
  if (managerVal && !enriched.manager_name) enriched.manager_name = managerVal;

  return enriched;
};

export const parseUploadedFile = async (filePath, originalName) => {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.csv') {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => results.push(enrichRowWithNormalizedKeys(data)))
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err));
    });
  }

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rawMatrix || rawMatrix.length === 0) return [];

<<<<<<< HEAD
    // 1. Detect if sheet is a calendar/matrix attendance roster (e.g. Row 1-3: Month/Title, Row with staff/employee name and day columns)
    const matrixHeaderRowIdx = rawMatrix.findIndex(
      (r) => Array.isArray(r) && r.some((c) => /staff\s*name|employee\s*name|emp\s*name|^staff$|^employee$/i.test(String(c).trim()))
    );

    if (matrixHeaderRowIdx !== -1) {
      const headerRow = rawMatrix[matrixHeaderRowIdx];
      const nameColIdx = headerRow.findIndex((c) => /staff\s*name|employee\s*name|emp\s*name|^staff$|^employee$/i.test(String(c).trim()));
      const extractedRows = [];

      for (let i = matrixHeaderRowIdx + 1; i < rawMatrix.length; i++) {
        const row = rawMatrix[i];
        if (!row || !row[nameColIdx] || String(row[nameColIdx]).trim() === '') continue;
        const staffName = String(row[nameColIdx]).trim();
        if (/total|sum|average|day|sat|sun|mon|tue|wed|thr|fri/i.test(staffName)) continue;

        let present = 0;
        let absent = 0;
        for (let j = 0; j < row.length; j++) {
          if (j === nameColIdx) continue;
          const mark = String(row[j] || '').toUpperCase().trim();
          if (mark === 'P' || mark === 'PRESENT' || mark === '1') present++;
          else if (mark === 'A' || mark === 'ABSENT' || mark === '0') absent++;
        }

        const totalMarked = present + absent;
        const attendancePct = totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 100;

        extractedRows.push({
          id: `EMP-${1000 + extractedRows.length + 1}`,
          name: staffName,
          department: null,
          presentDays: present,
          absentDays: absent,
          attendance: `${attendancePct}%`,
          status: attendancePct < 60 ? 'Exited' : 'Active'
        });
      }

      if (extractedRows.length > 0) {
        return extractedRows;
=======
    // 1. Check if sheet is an actual Calendar Attendance Muster (has 10+ columns with day numbers 1..31)
    let dayRowIdx = -1;
    for (let r = 0; r < Math.min(rawMatrix.length, 6); r++) {
      const row = rawMatrix[r];
      if (!Array.isArray(row)) continue;
      const dayCells = row.filter((c) => {
        const str = String(c).trim();
        const num = parseInt(str, 10);
        return !isNaN(num) && num >= 1 && num <= 31 && String(num) === str;
      });
      if (dayCells.length >= 10) {
        dayRowIdx = r;
        break;
>>>>>>> ExelData
      }
    }

    if (dayRowIdx !== -1) {
      const metaRow = rawMatrix[dayRowIdx - 1] || [];
      const dayRow = rawMatrix[dayRowIdx] || [];
      const combinedHeaders = [];
      for (let c = 0; c < Math.max(metaRow.length, dayRow.length); c++) {
        const meta = String(metaRow[c] || '').trim();
        const day = String(dayRow[c] || '').trim();
        combinedHeaders.push(meta || day || `col_${c}`);
      }

      const records = [];
      for (let r = dayRowIdx + 1; r < rawMatrix.length; r++) {
        const row = rawMatrix[r];
        if (!row || !Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) continue;
        const rec = {};
        combinedHeaders.forEach((h, i) => {
          if (!/^\d+$/.test(h) && h && !h.startsWith('col_')) {
            rec[h] = row[i] !== undefined ? row[i] : '';
          }
        });
        if (rec['Employee Name'] || rec['Employee No'] || rec['Staff Name'] || rec['Emp ID'] || rec.name || rec.id) {
          records.push(enrichRowWithNormalizedKeys(rec));
        }
      }
      if (records.length > 0) {
        return records;
      }
    }

    // 2. Adaptive standard table header locator (locates true column headers row)
    let bestHeaderIdx = 0;
    let maxRecognizedHeaders = 0;
    for (let r = 0; r < Math.min(rawMatrix.length, 10); r++) {
      const row = rawMatrix[r];
      if (!Array.isArray(row)) continue;
      const count = row.filter((cell) => {
        const s = String(cell).toLowerCase().trim();
        return /name|id|code|dept|department|team|role|title|designation|salary|pay|wage|attend|status|date|cost|rate|gender|dob|doj|email|phone|contact|manager|branch|store/i.test(s);
      }).length;
      if (count > maxRecognizedHeaders) {
        maxRecognizedHeaders = count;
        bestHeaderIdx = r;
      }
    }

    const headerRow = rawMatrix[bestHeaderIdx] || [];
    const headers = headerRow.map((h, i) => {
      const trimmed = String(h || '').trim();
      return trimmed || `Column_${i + 1}`;
    });

    let lastValidIdx = headers.length - 1;
    while (lastValidIdx >= 0 && headers[lastValidIdx].startsWith('Column_')) {
      lastValidIdx--;
    }
    const cleanHeaders = headers.slice(0, lastValidIdx + 1);

    const records = [];
    for (let r = bestHeaderIdx + 1; r < rawMatrix.length; r++) {
      const row = rawMatrix[r];
      if (!row || !Array.isArray(row)) continue;
      if (row.every((c) => c === '' || c === null || c === undefined)) continue;

      const obj = {};
      let hasData = false;
      cleanHeaders.forEach((h, i) => {
        const val = row[i] !== undefined && row[i] !== null ? row[i] : '';
        obj[h] = val;
        if (String(val).trim() !== '') hasData = true;
      });

      if (hasData) {
        records.push(enrichRowWithNormalizedKeys(obj));
      }
    }
    return records;
  }

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const lines = pdfData.text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // Parse simple tabular lines or structured text from PDF
    const records = [];
    let headers = [];
    lines.forEach((line, idx) => {
      const parts = line.split(/\s{2,}|\t|,/);
      if (idx === 0) {
        headers = parts.length > 1 ? parts : ['line', 'content'];
      } else {
        const row = {};
        if (headers.length > 1 && parts.length === headers.length) {
          headers.forEach((h, i) => {
            row[h] = parts[i];
          });
        } else {
          row['Record'] = `Item ${idx}`;
          row['Content'] = line;
        }
        records.push(row);
      }
    });
    return records.length > 0 ? records : [{ Content: pdfData.text.slice(0, 500) }];
  }

  // Fallback text/json
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    const json = JSON.parse(raw);
    return Array.isArray(json) ? json : [json];
  } catch {
    return raw.split('\n').map((l, idx) => ({ id: idx + 1, text: l }));
  }
};
