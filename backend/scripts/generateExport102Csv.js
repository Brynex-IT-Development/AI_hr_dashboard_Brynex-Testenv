import fs from 'fs';
import path from 'path';

const headers = [
  'Emp ID', 'Emp Name', 'DOJ', 'Gender', 'DOB', 'Email ID', 'Status',
  'Confirmation Date', 'Manager ID', 'Manager Name', 'Phone No',
  'Blood Group', 'Employment Status', 'PAN No', 'UAN No', 'Bank A/c No',
  'LWD', 'Designation', 'Department', 'Storename'
];

const rows = [];

// 1. EMP610 (Probation, Active, Populated Confirmation Date: 30 Nov 2026, LWD: empty)
rows.push([
  'EMP610', 'VISHNUJITH S S', '2026-09-01', 'Male', '09 JUN 2003', 'vishnuappuvj6@gmail.com',
  'Probation', '30 Nov 2026', 'Emp02', 'HR MANAGER', '9847405762', 'O +ve',
  'Active', 'SRPPS7051M', '102088194370', '38709324996', '', 'Assistant Store Manager', 'Store', 'SUITOR GUY EDAPPALLY'
]);

// 2. EMP626 (Probation, Active, Populated Confirmation Date: 20 Dec 2026, LWD: empty)
rows.push([
  'EMP626', 'Vishnu PK', '2026-09-21', 'Male', '14 AUG 2000', 'vishnupk@gmail.com',
  'Probation', '20 Dec 2026', 'Emp02', 'HR MANAGER', '9847405763', 'B +ve',
  'Active', 'SRPPS7052N', '102088194371', '38709324997', '', 'Store Admin', 'Store', 'SUITOR GUY EDAPPALLY'
]);

// 12 more Probation employees with populated Confirmation Dates (making exactly 14 probation confirmation dates)
const probationWithConf = [
  ['EMP613', 'Mirzwa fathima', '2026-09-02', 'Female', '12 MAY 2002', 'mirzwa@gmail.com', 'Probation', '01 Dec 2026', 'Emp02', 'HR MANAGER', '9847405764', 'A +ve', 'Resigned', 'SRPPS7053O', '102088194372', '38709324998', '2026-10-15', 'Fashion Consultant', 'Store', 'SUITOR GUY EDAPPALLY'],
  ['EMP614', 'RAHUL R NAIR', '2026-09-07', 'Male', '18 JUL 2001', 'rahul@gmail.com', 'Probation', '06 Dec 2026', 'Emp02', 'HR MANAGER', '9847405765', 'O -ve', 'Resigned', 'SRPPS7054P', '102088194373', '38709324999', '2026-10-20', 'Sales Executive', 'Store', 'SUITOR GUY EDAPPALLY'],
  ['EMP615', 'Fathima Rinsha C', '2026-09-07', 'Female', '22 OCT 2003', 'fathima@gmail.com', 'Probation', '06 Dec 2026', 'Emp02', 'HR MANAGER', '9847405766', 'B +ve', 'Active', 'SRPPS7055Q', '102088194374', '38709325000', '', 'Cashier', 'Store', 'SUITOR GUY EDAPPALLY'],
  ['EMP616', 'Raihana Shirin A M', '2026-09-07', 'Female', '05 JAN 2002', 'raihana@gmail.com', 'Probation', '06 Dec 2026', 'Emp02', 'HR MANAGER', '9847405767', 'O +ve', 'Active', 'SRPPS7056R', '102088194375', '38709325001', '', 'Fashion Consultant', 'Store', 'SUITOR GUY EDAPPALLY'],
  ['EMP617', 'Sreejesh c s', '2026-09-09', 'Male', '19 MAR 2000', 'sreejesh@gmail.com', 'Probation', '08 Dec 2026', 'Emp02', 'HR MANAGER', '9847405768', 'AB +ve', 'Active', 'SRPPS7057S', '102088194376', '38709325002', '', 'Inventory Executive', 'Store', 'SUITOR GUY EDAPPALLY'],
  ['EMP618', 'Vineeth V', '2026-09-11', 'Male', '14 NOV 1999', 'vineeth@gmail.com', 'Probation', '10 Dec 2026', 'Emp02', 'HR MANAGER', '9847405769', 'A +ve', 'Active', 'SRPPS7058T', '102088194377', '38709325003', '', 'Store Associate', 'Store', 'SUITOR GUY EDAPPALLY'],
  ['EMP619', 'TINEESHA TOJO', '2026-09-10', 'Female', '30 APR 2001', 'tineesha@gmail.com', 'Probation', '09 Dec 2026', 'Emp02', 'HR MANAGER', '9847405770', 'O +ve', 'Active', 'SRPPS7059U', '102088194378', '38709325004', '', 'Customer Service', 'Store', 'SUITOR GUY EDAPPALLY'],
  ['EMP624', 'ASWATHI A', '2026-09-18', 'Female', '08 SEP 2002', 'aswathi@gmail.com', 'Probation', '17 Dec 2026', 'Emp02', 'HR MANAGER', '9847405771', 'B +ve', 'Active', 'SRPPS7060V', '102088194379', '38709325005', '', 'Sales Associate', 'Store', 'SUITOR GUY EDAPPALLY'],
  ['EMP625', 'AKHIL SEBASTIAN', '2026-09-21', 'Male', '11 FEB 2001', 'akhil@gmail.com', 'Probation', '20 Dec 2026', 'Emp02', 'HR MANAGER', '9847405772', 'O +ve', 'Active', 'SRPPS7061W', '102088194380', '38709325006', '', 'Store Admin', 'Store', 'SUITOR GUY EDAPPALLY'],
  ['EMP627', 'Brijesh P G', '2026-09-21', 'Male', '25 AUG 2000', 'brijesh@gmail.com', 'Probation', '20 Dec 2026', 'Emp02', 'HR MANAGER', '9847405773', 'A -ve', 'Active', 'SRPPS7062X', '102088194381', '38709325007', '', 'Cashier', 'Store', 'SUITOR GUY EDAPPALLY'],
  ['EMP628', 'MUHAMMAD ALTHAF P S', '2026-09-16', 'Male', '03 DEC 2001', 'althaf@gmail.com', 'Probation', '15 Dec 2026', 'Emp02', 'HR MANAGER', '9847405774', 'B +ve', 'Active', 'SRPPS7063Y', '102088194382', '38709325008', '', 'Sales Associate', 'Store', 'SUITOR GUY EDAPPALLY'],
  ['EMP629', 'Karthika Shaiju', '2026-09-21', 'Female', '16 JUN 2002', 'karthika@gmail.com', 'Probation', '20 Dec 2026', 'Emp02', 'HR MANAGER', '9847405775', 'O +ve', 'Active', 'SRPPS7064Z', '102088194383', '38709325009', '', 'Fashion Consultant', 'Store', 'SUITOR GUY EDAPPALLY']
];
rows.push(...probationWithConf);

// 6 more Resigned employees with valid LWD (total 8 resigned employees, all with LWD >= DOJ)
for (let i = 1; i <= 6; i++) {
  const empId = `EMP70${i}`;
  rows.push([
    empId, `Resigned Staff ${i}`, '2025-01-10', i % 2 === 0 ? 'Male' : 'Female', '15 MAY 1998', `${empId.toLowerCase()}@brynex.com`,
    'Confirmed', '', 'Emp01', 'GENERAL MANAGER', `984740580${i}`, 'O +ve',
    'Resigned', `SRPPS708${i}A`, `10208819440${i}`, `3870932510${i}`,
    '2026-08-30', 'Sales Executive', 'Sales', 'G.Calicut'
  ]);
}

// 82 Active Confirmed employees (LWD is empty string: 0 active employees have an LWD)
const branches = ['SUITOR GUY EDAPPALLY', 'G.Calicut', 'G.Palakkad', 'G.Thrissur', 'G.Kottayam'];
const depts = ['Store', 'Operations', 'Administration', 'Sales', 'Logistics'];
const designations = ['Store Manager', 'Sales Executive', 'Assistant Manager', 'Visual Merchandiser', 'Inventory Controller'];

for (let i = 1; i <= 82; i++) {
  const num = String(i).padStart(3, '0');
  const empId = `EMP8${num}`;
  rows.push([
    empId, `Active Employee ${i}`, `2024-0${(i % 9) + 1}-15`, i % 2 === 0 ? 'Male' : 'Female', '10 MAR 1997', `${empId.toLowerCase()}@brynex.com`,
    'Confirmed', '', 'Emp02', 'HR MANAGER', `9847406${num}`, 'A +ve',
    'Active', `SRPPS8${num}B`, `102088195${num}`, `38709326${num}`,
    '', designations[i % designations.length], depts[i % depts.length], branches[i % branches.length]
  ]);
}

// Total rows: 2 + 12 + 6 + 82 = 102 employees!
console.log('Generating CSV with total rows:', rows.length);

const csvLines = [headers.join(',')];
for (const r of rows) {
  csvLines.push(r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','));
}

const outputPath = path.resolve('tests/fixtures/export_102_employees.csv');
fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8');
console.log('Written to:', outputPath);

