/**
 * Pure Dynamic AI Document Analyzer Service:
 * Ingests any uploaded file(s) (CSV, Excel, etc.), summarizes the real telemetry,
 * and calls Anthropic Claude AI to dynamically synthesize Management Attention items,
 * evidence, Left-Brain root causes, decision options, and remedies.
 * Zero hardcoded text, zero mock datasets.
 */

import { extractStoreMonthlyTarget, extractStoreNetSales, extractStoreFootfallAndWalkins } from './hrIntelligenceAggregator.js';
import { parsePromptIntent, matchesBranch, recordMatchesPrompt, itemMatchesPrompt } from './promptMatcherService.js';

// Helper to extract a statistical profile and representative rows from tabular data
export const extractDatasetTelemetry = (files = [], adminPrompt = '') => {
  if (!files || files.length === 0) return null;
  const intent = parsePromptIntent(adminPrompt);

  return files.map((file) => {
    let rows = file.parsedRows || [];
    if (intent.isFiltered) {
      rows = rows.filter((r) => recordMatchesPrompt(r, intent));
    }
    const totalRows = rows.length;
    if (totalRows === 0) {
      return {
        fileName: file.name,
        fileScope: file.holds || 'Dataset',
        totalRows: 0,
        columns: Object.keys(file.parsedRows?.[0] || {}),
        summary: intent.isFiltered
          ? `0 rows matching prompt "${adminPrompt}" in this dataset. (File has no records for this target branch/scope).`
          : 'Empty dataset'
      };
    }

    const columns = Object.keys(rows[0] || {});
    const numericStats = {};
    const categoricalCounts = {};

    // Analyze first 200 rows for fast statistical distribution
    const sampleLimit = Math.min(rows.length, 250);
    for (let i = 0; i < sampleLimit; i++) {
      const row = rows[i];
      for (const col of columns) {
        const val = row[col];
        const num = parseFloat(val);
        if (!isNaN(num) && typeof val !== 'boolean') {
          if (!numericStats[col]) {
            numericStats[col] = { count: 0, sum: 0, min: num, max: num };
          }
          numericStats[col].count += 1;
          numericStats[col].sum += num;
          if (num < numericStats[col].min) numericStats[col].min = num;
          if (num > numericStats[col].max) numericStats[col].max = num;
        } else if (val && typeof val === 'string' && val.length < 35) {
          if (!categoricalCounts[col]) categoricalCounts[col] = {};
          categoricalCounts[col][val] = (categoricalCounts[col][val] || 0) + 1;
        }
      }
    }

    // Compute averages
    const numericSummary = {};
    for (const [col, stat] of Object.entries(numericStats)) {
      if (stat.count > 0) {
        numericSummary[col] = {
          average: (stat.sum / stat.count).toFixed(2),
          min: stat.min,
          max: stat.max,
          total: stat.sum.toFixed(1)
        };
      }
    }

    // Top categorical values
    const categoricalSummary = {};
    for (const [col, counts] of Object.entries(categoricalCounts)) {
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (sorted.length > 0 && sorted.length < 15) {
        categoricalSummary[col] = sorted.map(([k, v]) => `${k} (${v})`).join(', ');
      }
    }

    // Select representative rows: first 5 rows + outlier rows
    const sampleRows = rows.slice(0, 6);
    
    // Look for potential outliers (e.g. exit notices, overtime, low rest, high spend, zero revenue, zero footfall)
    const anomalyRows = [];
    rows.forEach((r) => {
      const str = JSON.stringify(r).toLowerCase();
      const dailyRev = r.daily_revenue !== undefined ? parseFloat(r.daily_revenue) : (r.revenue !== undefined ? parseFloat(r.revenue) : null);
      const footfall = r.footfall_or_leads !== undefined ? parseFloat(r.footfall_or_leads) : (r.footfall !== undefined ? parseFloat(r.footfall) : null);

      if (
        str.includes('exit') ||
        str.includes('resigned') ||
        str.includes('notice') ||
        (r.rest_interval_hours && parseFloat(r.rest_interval_hours) < 10) ||
        (r.overtime_hours && parseFloat(r.overtime_hours) > 2) ||
        dailyRev === 0 ||
        footfall === 0
      ) {
        if (anomalyRows.length < 8 && !sampleRows.includes(r)) {
          anomalyRows.push(r);
        }
      }
    });

    return {
      fileName: file.name,
      fileScope: file.holds || 'Dataset',
      totalRows,
      columns,
      numericSummary,
      categoricalSummary,
      sampleRows,
      anomalyRows
    };
  });
};

/**
 * Call Anthropic Claude API to perform live executive analysis on the uploaded data
 */
export const runClaudeDocumentAnalysis = async ({ files, adminPrompt = '', customRules = null }) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured in backend environment.');
  }

  const intent = parsePromptIntent(adminPrompt);
  const telemetry = extractDatasetTelemetry(files, adminPrompt);
  if (!telemetry || telemetry.length === 0) {
    return null;
  }

  // Extract prompt-matching rows across files if intent is filtered
  let matchingRecordsSample = [];
  if (intent.isFiltered) {
    files.forEach((f) => {
      (f.parsedRows || []).forEach((r) => {
        if (recordMatchesPrompt(r, intent) && matchingRecordsSample.length < 35) {
          matchingRecordsSample.push(r);
        }
      });
    });
  }

  const matchingFiles = intent.isFiltered
    ? files.filter((f) => (f.parsedRows || []).some((r) => recordMatchesPrompt(r, intent)))
    : files;
  const activeFiles = matchingFiles.length > 0 ? matchingFiles : files;

  const totalHeadcountOrRows = intent.isFiltered
    ? matchingRecordsSample.length
    : files.reduce((sum, f) => sum + (f.parsedRows?.length || 0), 0);

  const filesListStr = activeFiles
    .map((f, i) => `Dataset ${i + 1}: "${f.name}" (${f.holds || 'Connected Dataset'}) - ${f.parsedRows?.length || 0} total rows (${intent.isFiltered ? (f.parsedRows || []).filter((r) => recordMatchesPrompt(r, intent)).length : f.parsedRows?.length || 0} matching target)`)
    .join('\n');

  const expectedTotalIssues = intent.isFiltered
    ? Math.max(2, Math.min(4, activeFiles.length * 2))
    : (files.length * 3) + (files.length > 1 ? 1 : 0);

  const fileItemDirectives = activeFiles.map((f, i) => `
  * FOR DATASET ${i + 1} ("${f.name}"):
    Generate high-impact Management Attention items directly from its rows/columns:
    - Issue A for "${f.name}": Primary risk / compliance / alert (e.g. exit notices, rest turnaround violations, quota variances).
    - Issue B for "${f.name}": Operational / cost / capacity variance (e.g. overtime concentration, salary cost disparities, staffing bottlenecks).
    Each item MUST set "sourceFile": "${f.name}".
  `).join('\n');

  const coverageDirective = intent.isFiltered
    ? `
CRITICAL PROMPT FOCUS & STRICT ISOLATION DIRECTIVE:
The executive user has entered prompt: "${adminPrompt}".
Target Scope: ${intent.brand ? `Brand ${intent.brand} ` : ''}${intent.location ? `Branch: ${intent.location}` : ''} (${intent.cleaned}).

STRICT BRAND & BRANCH EXCLUSION RULES (NON-NEGOTIABLE):
1. You MUST tailor your ENTIRE analysis, attention items, root causes, evidence, and decision options strictly to align with this prompt: "${adminPrompt}".
2. ZERO CROSS-BRANCH / ZERO CROSS-BRAND LEAKAGE:
${intent.brand === 'G' ? '- The user explicitly asked for Brand G (Suitor Guy Edappally / G-Edappally). You MUST NEVER include, cite, or mention Z-Edappally, Zorucci, Zeness, Zubar, or any Z format stores or staff. Citing Z format data or other branches is strictly prohibited.' : ''}
${intent.brand === 'Z' ? '- The user explicitly asked for Brand Z (Zorucci Edappally / Z-Edappally). You MUST NEVER include, cite, or mention G-Edappally, Suitor Guy, SG, or any G format stores or staff. Citing G format data or other branches is strictly prohibited.' : ''}
- DO NOT generate issues for files that contain 0 matching rows for this branch.
3. Generate 2 to 3 distinct, realistic, high-impact Management Attention items directly from the provided real matching telemetry:
- Target attainment & sales deficits for this store
- Staffing, designations, probation concentrations, and onboarding
- Attendance rosters, shift schedules, and geo-fencing compliance
4. Every cited employee name, employee ID, role, number, and branch MUST be derived strictly from the real matching records. ZERO mock data, ZERO hallucinations.
5. In "kpiMetrics", set "monitored" to "${matchingRecordsSample.length}" (${matchingRecordsSample.length} staff matching "${adminPrompt}").
`
    : `
CRITICAL COVERAGE DIRECTIVE (MANDATORY REQUIREMENT: AT LEAST 3 ISSUES PER CSV):
There are ${files.length} connected dataset(s):
${filesListStr}

THE EXECUTIVE USER EXPLICITLY REQUIRES AT LEAST 3 DISTINCT ISSUES FOR EVERY CONNECTED CSV FILE:
${fileItemDirectives}

${files.length > 1 ? `* PLUS 1 DEDICATED CROSS-DATASET CORRELATION ISSUE:
  - Generate 1 additional correlation item synthesizing linkages across files (e.g. how shift turnaround fatigue and overtime in attendance directly impacts store revenue and sales bottlenecks).
  - Its "sourceFile" must list the correlated file names (e.g. "${files[0].name} + ${files[1].name}").
` : ''}

TOTAL ATTENTION ITEMS:
You MUST generate AT LEAST ${expectedTotalIssues} attention items in the "attentionItems" array:
- If 3 CSVs are connected: generate at least 9 dataset items (3 for each file) + 1 cross-dataset correlation = at least 10 items total.
- If 2 CSVs are connected: generate at least 6 dataset items (3 for each file) + 1 cross-dataset correlation = at least 7 items total.
- If 1 CSV is connected: generate at least 3 distinct dataset items.
`;

  const prompt = `You are the Chief AI Workforce & Management Intelligence Brain for Brynex One AI.
You are analyzing actual uploaded enterprise datasets to support executive management decisions.

CONNECTED DATASETS (${activeFiles.length} active files):
${filesListStr}

DATASET TELEMETRY EXTRACTED FROM UPLOADED FILES:
${JSON.stringify(telemetry, null, 2)}

${matchingRecordsSample.length > 0 ? `SPECIFIC RECORDS MATCHING USER FOCUS PROMPT:
${JSON.stringify(matchingRecordsSample, null, 2)}
` : ''}

USER CUSTOM INSTRUCTIONS / PROMPT:
${adminPrompt ? `"${adminPrompt}"` : 'Analyze the datasets comprehensively across workforce availability, shifts, retention, sales productivity, and operational risks.'}

CUSTOM BENCHMARKS / RULES:
- Target Attrition: ${(customRules && customRules.targetAttrition) || 5.0}%
- Target Productivity: ${(customRules && customRules.targetProductivity) || 90}%
- Department Scope: ${(customRules && customRules.targetDepartment) || 'All'}

TASK:
1. Examine the actual row data, columns, numeric values, anomalies, and records from the uploaded datasets:
${filesListStr}

2. Follow the coverage and prompt focus directive:
${coverageDirective}

3. Keep all fields strictly concise and compact (1-2 sentences per description, 1-2 evidence records, 1 possibleCause, and 2 concise decisionOptions per issue). Never generate run-on essays.
4. Compute an overall composite HR Health Score (0 to 100) based strictly on the findings in the data.

OUTPUT REQUIREMENT:
Respond ONLY with a single valid, parseable JSON object matching this exact schema (no markdown formatting, no commentary before or after the JSON):
{
  "healthScore": 82,
  "healthStatus": "Healthy",
  "reportingPeriod": "Date range detected from data (e.g. 01-30 Sep 2026)",
  "attentionSummary": "1-2 sentence high-level executive summary of key management signals found across ALL connected files",
  "kpiMetrics": [
    { "id": "issues", "title": "Issues Detected", "value": "${expectedTotalIssues}", "trend": "Active risks detected", "trendPositive": false, "colorClass": "hr-kpi-icon-purple" },
    { "id": "decisions", "title": "Awaited Decisions", "value": "${expectedTotalIssues}", "trend": "Requires executive review", "trendPositive": true, "colorClass": "hr-kpi-icon-red" },
    { "id": "monitored", "title": "Records Monitored", "value": "${totalHeadcountOrRows}", "trend": "Live telemetry parsed across ${files.length} datasets", "trendPositive": true, "colorClass": "hr-kpi-icon-green" },
    { "id": "opportunities", "title": "Opportunities", "value": "2", "trend": "Optimization levers", "trendPositive": true, "colorClass": "hr-kpi-icon-orange" },
    { "id": "productivity", "title": "Avg. Productivity", "value": "88%", "trend": "+2% vs target", "trendPositive": true, "colorClass": "hr-kpi-icon-blue" }
  ],
  "attentionItems": [
    {
      "id": "issue-1",
      "category": "Critical",
      "priority": "High Priority",
      "status": "Needs investigation",
      "title": "Concise issue headline from data",
      "sourceFile": "${files[0].name}",
      "description": "Executive description referencing actual numbers and the specific file name",
      "branch": "Branch from file or All Branches",
      "department": "Department affected or Operations",
      "topic": "Domain topic (e.g. Store Revenue & Sales, Shift Scheduling, Employee Retention)",
      "dateRange": "Period from data",
      "confidence": "91%",
      "whatsHappening": "Detailed explanation of what the telemetry in this file reveals",
      "metrics": [
        { "label": "Metric 1", "val": "Value 1", "note": "Note 1", "hasDownArrow": false },
        { "label": "Metric 2", "val": "Value 2", "note": "Note 2", "hasDownArrow": true },
        { "label": "Metric 3", "val": "Value 3", "note": "Note 3", "hasDownArrow": false },
        { "label": "Metric 4", "val": "Value 4", "note": "Note 4", "hasDownArrow": false }
      ],
      "evidence": [
        { "title": "Evidence Title", "desc": "Specific data record or pattern found", "record": "Record pill" },
        { "title": "Evidence Title 2", "desc": "Specific data record or pattern found", "record": "Record pill" }
      ],
      "possibleCauses": [
        {
          "title": "Cause Headline",
          "description": "Left-brain explanation of why this occurred based on data correlation",
          "confidence": "High Confidence (88%)",
          "evidence": "Concrete evidence string"
        }
      ],
      "decisionOptions": [
        {
          "id": "opt-1-1",
          "badge": "Option A (Recommended)",
          "title": "Remedy title",
          "description": "Actionable countermeasure description",
          "impact": "Quantifiable expected outcome"
        },
        {
          "id": "opt-1-2",
          "badge": "Option B",
          "title": "Alternative remedy title",
          "description": "Actionable countermeasure description",
          "impact": "Quantifiable expected outcome"
        }
      ]
    }
  ]
}`;

  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    })
  });

  const rawJson = await response.json();
  if (!response.ok) {
    throw new Error(rawJson.error?.message || `Claude API error: ${response.status}`);
  }

  const rawText = rawJson.content?.[0]?.text || '';
  
  // Extract JSON payload safely
  let cleanJsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleanJsonText.indexOf('{');
  const lastBrace = cleanJsonText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanJsonText = cleanJsonText.substring(firstBrace, lastBrace + 1);
  }

  let parsedAnalysis = null;
  try {
    parsedAnalysis = JSON.parse(cleanJsonText);
  } catch (parseErr) {
    // Attempt auto-recovery if truncated near the end of attentionItems array
    const lastItemIdx = cleanJsonText.lastIndexOf('},\n    {');
    if (lastItemIdx !== -1) {
      try {
        const repaired = cleanJsonText.substring(0, lastItemIdx + 1) + '\n  ]\n}';
        parsedAnalysis = JSON.parse(repaired);
      } catch (_) {
        throw parseErr;
      }
    } else {
      throw parseErr;
    }
  }

  parsedAnalysis.analyzedAt = new Date().toISOString();
  parsedAnalysis.totalRecords = totalHeadcountOrRows;
  parsedAnalysis.fileNames = files.map((f) => f.name);
  parsedAnalysis.connectedFilesCount = files.length;
  parsedAnalysis.adminPromptApplied = adminPrompt || null;

  // Filter returned attention items to enforce prompt isolation
  if (parsedAnalysis.attentionItems && Array.isArray(parsedAnalysis.attentionItems) && intent.isFiltered) {
    parsedAnalysis.attentionItems = parsedAnalysis.attentionItems.filter((item) => itemMatchesPrompt(item, intent));
  }

  // Guarantee that kpiMetrics "issues", "decisions", and "monitored" strictly match parsedAnalysis.attentionItems.length!
  if (parsedAnalysis.attentionItems && Array.isArray(parsedAnalysis.attentionItems)) {
    if (parsedAnalysis.kpiMetrics && Array.isArray(parsedAnalysis.kpiMetrics)) {
      const issuesKpi = parsedAnalysis.kpiMetrics.find((k) => k.id === 'issues');
      if (issuesKpi) {
        issuesKpi.value = String(parsedAnalysis.attentionItems.length);
        issuesKpi.trend = intent.isFiltered
          ? `${parsedAnalysis.attentionItems.length} active risks for "${adminPrompt}"`
          : `${parsedAnalysis.attentionItems.length} active risks across datasets`;
      }
      const decisionsKpi = parsedAnalysis.kpiMetrics.find((k) => k.id === 'decisions');
      if (decisionsKpi) {
        decisionsKpi.value = String(parsedAnalysis.attentionItems.length);
      }
      const monitoredKpi = parsedAnalysis.kpiMetrics.find((k) => k.id === 'monitored');
      if (monitoredKpi && intent.isFiltered) {
        monitoredKpi.value = String(matchingRecordsSample.length);
        monitoredKpi.trend = `${matchingRecordsSample.length} records matching "${adminPrompt}"`;
      }
    }
  }

  return parsedAnalysis;
};

/**
 * Pure Dynamic AI Live API Telemetry Analyzer:
 * Ingests external LMS API data (Store 360 & Employee 360),
 * summarizes real store quota targets, sales attributions, camera audits, and staff metrics,
 * and calls Anthropic Claude AI to synthesize tailored Management Attention items based on the user's prompt.
 */
export const runClaudeApiAnalysis = async ({ stores = [], employees = [], adminPrompt = '', customRules = null } = {}) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('Anthropic API key not configured, skipping Claude API synthesis.');
    return null;
  }

  // Extract clean structured summaries from real stores
  const storeSummaries = stores.map((s) => {
    const name = (
      s.summary?.workingBranch?.trim() ||
      s.branch?.workingBranch?.trim() ||
      s.staff?.users?.[0]?.workingBranch?.trim() ||
      s.summary?.storeAliases?.[0]?.trim() ||
      (s.summary?.locCode ? `Store ${s.summary.locCode}` : 'N/A')
    );
    const monthlyTarget = extractStoreMonthlyTarget(s);
    const netSales = extractStoreNetSales(s);
    const { walkins, footfall } = extractStoreFootfallAndWalkins(s);
    const quotaAttainment = monthlyTarget > 0 ? ((netSales / monthlyTarget) * 100).toFixed(1) + '%' : 'N/A';

    return {
      name,
      locCode: s.summary?.locCode || s.branch?.locCode || 'N/A',
      cluster: s.summary?.cluster || s.branch?.clusterId?.name || 'Retail Network',
      monthlyTarget,
      netSales,
      quotaAttainment,
      footfall,
      walkins,
      discrepancies: s.operations?.cameraAudits?.[0]?.discrepancyCount || 0,
      auditScore: s.operations?.branchAudits?.[0]?.auditScore ?? null,
      staffCount: s.summary?.totalStaffCount || s.staff?.totalUsers || 0
    };
  });

  // Filter stores and staff based on prompt intent
  const intent = parsePromptIntent(adminPrompt);
  const relevantStores = intent.isFiltered
    ? storeSummaries.filter((s) => matchesBranch(s.name, intent))
    : storeSummaries;
  const compactStores = (relevantStores.length > 0 ? relevantStores : storeSummaries).slice(0, 8);

  // Extract compact representative staff sample focused on relevant branches
  const relevantStaff = intent.isFiltered
    ? employees.filter((e) =>
        recordMatchesPrompt(
          {
            branch: e.summary?.workingBranch,
            role: e.summary?.designation,
            dept: e.summary?.department,
            name: e.summary?.name,
            id: e.summary?.empId
          },
          intent
        )
      )
    : employees;
  const compactStaff = (relevantStaff.length > 0 ? relevantStaff : employees).slice(0, 15);
  const staffSample = compactStaff.map((e) => ({
    name: e.summary?.name || null,
    id: e.summary?.empId || null,
    role: e.summary?.designation || null,
    dept: e.summary?.department || null,
    branch: e.summary?.workingBranch || null,
    target: e.salesAttributions?.targets?.[0]?.targets?.targetAmount || 0,
    sales: e.salesAttributions?.dappr?.[0]?.attribution?.netSales || 0,
    assessmentScore: e.learning?.assessmentAttempts?.[0]?.percentage ?? e.learning?.assessmentAttempts?.[0]?.score ?? null
  }));

  const prompt = `You are the Chief AI Retail Workforce & Management Intelligence Brain for Brynex One AI.
You are evaluating LIVE LMS retail telemetry across key store branches and employee profiles.

EXTERNAL RETAIL TELEMETRY (${compactStores.length} FOCUSED STORES):
${JSON.stringify(compactStores, null, 2)}

EMPLOYEE PROFILES TELEMETRY (Sample of ${staffSample.length} staff):
${JSON.stringify(staffSample, null, 2)}

USER CUSTOM PROMPT / INSTRUCTION:
"${adminPrompt || 'Analyze retail store network performance, target variances, and staff productivity.'}"

TASK & DIRECTIVES:
1. You MUST tailor your entire analysis strictly to the user's prompt:
   - Target Scope: ${intent.brand ? `Brand ${intent.brand} ` : ''}${intent.location ? `Branch: ${intent.location}` : ''} (${intent.cleaned}).
   ${intent.brand === 'G' ? '- The user asked for Brand G (Suitor Guy Edappally / G-Edappally). You MUST NEVER include, cite, or mention Z-Edappally, Zorucci, Zeness, Zubar, or any Z format stores or staff.' : ''}
   ${intent.brand === 'Z' ? '- The user asked for Brand Z (Zorucci Edappally / Z-Edappally). You MUST NEVER include, cite, or mention G-Edappally, Suitor Guy, SG, or any G format stores or staff.' : ''}
   - Evaluate the exact targets, net sales, footfall, and conversion for this target group.
   - If the user specifies a particular store (e.g. Edappally, Kollam, Trivandrum, Perinthalmanna, Kottayam), evaluate that branch's exact targets, net sales, footfall, and conversion in depth.
   - If the user asks for "lagging stores", evaluate the lowest quota attainment stores.
   - If the user asks about "consultants" or "skills" or "accessories", evaluate the assessment pass rates vs sales conversion.
   - If the user asks about "camera" or "audit" or "discrepancies", evaluate branch camera audits vs register logs.
2. Generate AT LEAST 2 to 3 distinct, high-impact Management Attention items directly reflecting this focus:
   - Every item MUST cite actual numbers, branch names, and staff members from the telemetry above.
   - Every item MUST include:
     * title (concise, professional)
     * branch (specific store or Store Network)
     * department (Sales, Retail Operations, etc.)
     * topic
     * description (1-2 sentences with actual numbers)
     * whatsHappening (1-2 sentences explaining telemetry correlation)
     * metrics array (4 key metrics)
     * evidence array (2 concrete data points)
     * possibleCauses array (1-2 Left-Brain root causes)
     * decisionOptions array (2 actionable options: Option A Recommended & Option B)
3. Keep all text concise, executive, and punchy. No essays.

OUTPUT REQUIREMENT:
Respond ONLY with a single valid, parseable JSON object matching this exact schema (no markdown formatting, no commentary before or after):
{
  "healthScore": 79,
  "healthStatus": "Needs Attention",
  "reportingPeriod": "01-30 Sep 2026",
  "attentionSummary": "Executive summary of live retail findings matching the prompt focus",
  "kpiMetrics": [
    { "id": "issues", "title": "Issues Detected", "value": "3", "trend": "Active risks across datasets", "trendPositive": false, "colorClass": "hr-kpi-icon-purple" },
    { "id": "decisions", "title": "Awaited Decisions", "value": "3", "trend": "3 management options ready for approval", "trendPositive": true, "colorClass": "hr-kpi-icon-red" },
    { "id": "monitored", "title": "Being Monitored", "value": "25 Stores", "trend": "554 retail staff across network", "trendPositive": true, "colorClass": "hr-kpi-icon-green" },
    { "id": "opportunities", "title": "Opportunities", "value": "2", "trend": "Upsell & footfall levers", "trendPositive": true, "colorClass": "hr-kpi-icon-orange" },
    { "id": "productivity", "title": "Avg. Productivity", "value": "84%", "trend": "+2.4% retail quota benchmark", "trendPositive": true, "colorClass": "hr-kpi-icon-blue" }
  ],
  "attentionItems": [
    {
      "id": "item-1",
      "category": "Critical",
      "priority": "High Priority",
      "status": "Needs immediate action",
      "title": "Title with real store and attainment %",
      "sourceFile": "Store 360 API (Branch Name)",
      "description": "Executive description with numbers",
      "branch": "Branch Name",
      "topic": "Domain Topic",
      "dateRange": "01-30 Sep 2026",
      "confidence": "93%",
      "department": "Retail Operations",
      "whatsHappening": "Root explanation of telemetry",
      "metrics": [
        { "label": "Target Attainment", "val": "76.5%", "note": "Target Note", "hasDownArrow": true },
        { "label": "Verified Footfall", "val": "820 Visits", "note": "Footfall note" },
        { "label": "Walk-in Conversion", "val": "26.2%", "note": "Conversion note" },
        { "label": "Discrepancies", "val": "16 Items", "note": "Audit note" }
      ],
      "evidence": [
        { "title": "Evidence Title", "desc": "Evidence description", "record": "Pill text" }
      ],
      "possibleCauses": [
        {
          "title": "Root cause title",
          "confidence": "High Confidence (91%)",
          "description": "Why this happened",
          "evidence": "Data evidence"
        }
      ],
      "decisionOptions": [
        {
          "id": "opt-1",
          "badge": "Option A (Recommended)",
          "title": "Action title",
          "description": "Action description",
          "impact": "Quantifiable impact"
        },
        {
          "id": "opt-2",
          "badge": "Option B",
          "title": "Alternative action title",
          "description": "Alternative description",
          "impact": "Alternative impact"
        }
      ]
    }
  ]
}`;

  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    })
  });

  const rawJson = await response.json();
  if (!response.ok) {
    throw new Error(rawJson.error?.message || `Claude API error: ${response.status}`);
  }

  const rawText = rawJson.content?.[0]?.text || '';
  let cleanJsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleanJsonText.indexOf('{');
  const lastBrace = cleanJsonText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanJsonText = cleanJsonText.substring(firstBrace, lastBrace + 1);
  }

  let parsedAnalysis = null;
  try {
    parsedAnalysis = JSON.parse(cleanJsonText);
  } catch (parseErr) {
    const lastItemIdx = cleanJsonText.lastIndexOf('},\n    {');
    if (lastItemIdx !== -1) {
      try {
        const repaired = cleanJsonText.substring(0, lastItemIdx + 1) + '\n  ]\n}';
        parsedAnalysis = JSON.parse(repaired);
      } catch (_) {
        throw parseErr;
      }
    } else {
      throw parseErr;
    }
  }

  parsedAnalysis.analyzedAt = new Date().toISOString();
  parsedAnalysis.adminPromptApplied = adminPrompt || null;

  if (parsedAnalysis.attentionItems && Array.isArray(parsedAnalysis.attentionItems) && intent.isFiltered) {
    parsedAnalysis.attentionItems = parsedAnalysis.attentionItems.filter((item) => itemMatchesPrompt(item, intent));
  }

  if (parsedAnalysis.attentionItems && Array.isArray(parsedAnalysis.attentionItems)) {
    if (parsedAnalysis.kpiMetrics && Array.isArray(parsedAnalysis.kpiMetrics)) {
      const issuesKpi = parsedAnalysis.kpiMetrics.find((k) => k.id === 'issues');
      if (issuesKpi) {
        issuesKpi.value = String(parsedAnalysis.attentionItems.length);
        issuesKpi.trend = intent.isFiltered
          ? `${parsedAnalysis.attentionItems.length} active risks for "${adminPrompt}"`
          : `${parsedAnalysis.attentionItems.length} active risks across datasets`;
      }
      const decisionsKpi = parsedAnalysis.kpiMetrics.find((k) => k.id === 'decisions');
      if (decisionsKpi) {
        decisionsKpi.value = String(parsedAnalysis.attentionItems.length);
      }
      const monitoredKpi = parsedAnalysis.kpiMetrics.find((k) => k.id === 'monitored');
      if (monitoredKpi && intent.isFiltered) {
        monitoredKpi.value = String(relevantStaff.length);
        monitoredKpi.trend = `${relevantStaff.length} staff matching "${adminPrompt}"`;
      }
    }
  }

  return parsedAnalysis;
};