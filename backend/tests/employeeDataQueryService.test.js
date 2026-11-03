import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseUploadedFile } from '../src/services/fileParserService.js';
import {
  parseFlexibleDate,
  formatDateIso,
  maskPii,
  extractRowAttributes,
  queryEmployeeData,
  formatQueryResultForAi
} from '../src/services/employeeDataQueryService.js';

const FIXTURE_PATH = path.resolve('tests/fixtures/export_102_employees.csv');

test('Brynex AI HR Brain - Deterministic Employee Data Query Layer Test Suite', async (t) => {
  let parsed102Rows = [];

  await t.test('1. Ingest export_102_employees.csv and verify exactly 102 rows parsed', async () => {
    assert.ok(fs.existsSync(FIXTURE_PATH), 'Fixture export_102_employees.csv must exist');
    parsed102Rows = await parseUploadedFile(FIXTURE_PATH, 'export_102_employees.csv');
    assert.equal(parsed102Rows.length, 102, 'Must contain exactly 102 employee rows');
  });

  await t.test('2. Exact Employee ID lookup: Verify original EMP610 details', () => {
    const res = queryEmployeeData(parsed102Rows, {
      fileId: 'export_102',
      fileName: 'export_102_employees.csv',
      empId: 'EMP610',
      includePii: true
    });

    assert.equal(res.verified, true);
    assert.equal(res.matchedCount, 1);
    const emp = res.results[0];
    const attr = extractRowAttributes(emp);

    assert.equal(attr.empId, 'EMP610');
    assert.equal(attr.empName, 'VISHNUJITH S S');
    assert.equal(attr.status, 'Probation');
    assert.equal(attr.employmentStatus, 'Active');
    assert.equal(attr.confirmationDateIso, '2026-11-30');
    assert.equal(attr.dojIso, '2026-09-01');
    assert.equal(attr.store, 'SUITOR GUY EDAPPALLY');
    assert.equal(attr.designation, 'Assistant Store Manager');
    assert.equal(emp['PAN No'], 'SRPPS7051M');
    assert.equal(emp['UAN No'], '102088194370');
  });

  await t.test('3. Exact Employee ID lookup: Verify original EMP626 details', () => {
    const res = queryEmployeeData(parsed102Rows, {
      fileId: 'export_102',
      fileName: 'export_102_employees.csv',
      empId: 'EMP626',
      includePii: true
    });

    assert.equal(res.verified, true);
    assert.equal(res.matchedCount, 1);
    const emp = res.results[0];
    const attr = extractRowAttributes(emp);

    assert.equal(attr.empId, 'EMP626');
    assert.equal(attr.empName, 'Vishnu PK');
    assert.equal(attr.status, 'Probation');
    assert.equal(attr.employmentStatus, 'Active');
    assert.equal(attr.confirmationDateIso, '2026-12-20');
    assert.equal(attr.dojIso, '2026-09-21');
    assert.equal(attr.store, 'SUITOR GUY EDAPPALLY');
    assert.equal(attr.designation, 'Store Admin');
    assert.equal(emp['PAN No'], 'SRPPS7052N');
    assert.equal(emp['UAN No'], '102088194371');
  });

  await t.test('4. Verify exactly 14 populated probation confirmation dates', () => {
    const res = queryEmployeeData(parsed102Rows, {
      fileId: 'export_102',
      fileName: 'export_102_employees.csv',
      status: 'Probation',
      hasConfirmationDate: true
    });

    assert.equal(res.verified, true);
    assert.equal(res.matchedCount, 14, 'Must return exactly 14 probation employees with confirmation dates');
    assert.equal(res.aggregates.populatedConfirmationDatesCount, 14, 'Source aggregate count must be 14');
  });

  await t.test('5. Verify exactly 0 active employees have an LWD populated', () => {
    const res = queryEmployeeData(parsed102Rows, {
      fileId: 'export_102',
      fileName: 'export_102_employees.csv',
      employmentStatus: 'Active',
      hasLwd: true,
      checkChronology: true
    });

    assert.equal(res.verified, true);
    assert.equal(res.matchedCount, 0, 'No active employees should have an LWD');
    assert.equal(res.aggregates.activeWithLwdCount, 0, 'activeWithLwdCount aggregate must be 0');
    assert.equal(res.chronologyAudit.violationCount, 0, 'Zero chronology violations');
  });

  await t.test('6. Filter by Confirmation Date range: November 2026 (EMP610 only)', () => {
    const res = queryEmployeeData(parsed102Rows, {
      confirmationDateStart: '2026-11-01',
      confirmationDateEnd: '2026-11-30'
    });

    assert.equal(res.verified, true);
    assert.equal(res.matchedCount, 1);
    assert.equal(extractRowAttributes(res.results[0]).empId, 'EMP610');
  });

  await t.test('7. Filter by Confirmation Date range: December 2026 (13 employees including EMP626)', () => {
    const res = queryEmployeeData(parsed102Rows, {
      confirmationDateStart: '2026-12-01',
      confirmationDateEnd: '2026-12-31'
    });

    assert.equal(res.verified, true);
    assert.equal(res.matchedCount, 13);
    const hasEmp626 = res.results.some((r) => extractRowAttributes(r).empId === 'EMP626');
    assert.ok(hasEmp626, 'Must include EMP626');
  });

  await t.test('8. Date parsing: Validate non-destructive parsing of text and ISO dates', () => {
    const d1 = parseFlexibleDate('30 Nov 2026');
    assert.ok(d1 instanceof Date);
    assert.equal(d1.getUTCFullYear(), 2026);
    assert.equal(d1.getUTCMonth(), 10); // November = 10
    assert.equal(d1.getUTCDate(), 30);
    assert.equal(formatDateIso(d1), '2026-11-30');

    const d2 = parseFlexibleDate('2026-09-01');
    assert.equal(formatDateIso(d2), '2026-09-01');

    const d3 = parseFlexibleDate('09 JUN 2003');
    assert.equal(formatDateIso(d3), '2003-06-09');

    // Blank / null safety
    assert.equal(parseFlexibleDate(''), null);
    assert.equal(parseFlexibleDate(null), null);
    assert.equal(parseFlexibleDate(undefined), null);
  });

  await t.test('9. Blank / null field auditing counts across 102 employees', () => {
    const res = queryEmployeeData(parsed102Rows, {
      auditBlankFields: ['Confirmation Date', 'LWD', 'PAN No', 'UAN No']
    });

    assert.equal(res.aggregates.blankFieldCounts['Confirmation Date'], 102 - 14, '88 blank confirmation dates');
    assert.equal(res.aggregates.blankFieldCounts['LWD'], 102 - 8, '94 blank LWDs');
    assert.equal(res.aggregates.blankFieldCounts['PAN No'], 0, '0 blank PAN numbers');
    assert.equal(res.aggregates.blankFieldCounts['UAN No'], 0, '0 blank UAN numbers');
  });

  await t.test('10. Store-level filtering and Branch Isolation enforcement', () => {
    const edappallyRes = queryEmployeeData(parsed102Rows, {
      store: 'SUITOR GUY EDAPPALLY'
    });
    assert.ok(edappallyRes.matchedCount > 0);
    assert.ok(edappallyRes.results.every((r) => extractRowAttributes(r).store === 'SUITOR GUY EDAPPALLY'));

    // Test branch isolation scope restriction
    const isolatedRes = queryEmployeeData(parsed102Rows, {
      branchIsolationScope: ['G.Calicut']
    });
    assert.ok(isolatedRes.matchedCount > 0);
    assert.ok(isolatedRes.results.every((r) => extractRowAttributes(r).store.toLowerCase().includes('calicut')));
    assert.ok(!isolatedRes.results.some((r) => extractRowAttributes(r).store.toLowerCase().includes('edappally')));
  });

  await t.test('11. Security & Privacy: Automatic PII redaction by default', () => {
    const res = queryEmployeeData(parsed102Rows, {
      empId: 'EMP610',
      includePii: false // Default
    });

    const emp = res.results[0];
    assert.match(emp['PAN No'], /\[REDACTED_PAN/, 'PAN must be redacted');
    assert.match(emp['UAN No'], /\[REDACTED_UAN/, 'UAN must be redacted');
    assert.match(emp['Phone No'], /\[REDACTED_PHONE/, 'Phone must be redacted');
    assert.match(emp['Bank A/c No'], /\[REDACTED_BANK/, 'Bank account must be redacted');
  });

  await t.test('12. Fallback when raw rows are unavailable: Explicit unverified state', () => {
    const res = queryEmployeeData([], {
      empId: 'EMP610'
    });

    assert.equal(res.verified, false);
    assert.equal(res.status, 'unverified');
    assert.match(res.message, /cannot be verified/i);

    const aiPromptBlock = formatQueryResultForAi(res);
    assert.match(aiPromptBlock, /CANNOT BE VERIFIED/);
    assert.match(aiPromptBlock, /DO NOT GUESS OR ESTIMATE/);
  });

  await t.test('13. Metadata response verification (Task 6)', () => {
    const res = queryEmployeeData(parsed102Rows, {
      fileId: 'f_test_102',
      fileName: 'export_102_employees.csv',
      status: 'Probation'
    });

    assert.equal(res.sourceFileId, 'f_test_102');
    assert.equal(res.sourceFileName, 'export_102_employees.csv');
    assert.ok(res.referenceDate);
    assert.equal(res.totalRecordsInSource, 102);
    assert.equal(res.calculationMethod, 'Deterministic row-level evaluation across parsed dataset');
    assert.deepEqual(res.filtersApplied, {
      fileId: 'f_test_102',
      fileName: 'export_102_employees.csv',
      status: 'Probation'
    });
  });
});

