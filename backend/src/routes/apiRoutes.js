import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDashboardSummary, getHealthCheck } from '../controllers/dashboardController.js';
import { chatWithAi, getAiStatus, analyzeWorkforce, diagnoseHrIssue, generateDecisionOptions } from '../controllers/aiController.js';
import {
  uploadHrFile,
  getUploadedFiles,
  getFilePreview,
  downloadRawFile,
  getLatestHrAnalysis,
  runCustomAiAnalysis,
  deleteHrFile,
  getSyncedEmployees,
  queryEmployeeRecords,
  getEnterpriseAnalytics,
  getCachedEnterpriseAnalytics,
  getCachedSyncedEmployees,
  getUploadedFilesStore,
  recomputeAnalytics
} from '../controllers/hrController.js';
import {
  fetchStoreOverview,
  fetchEmployeeOverview,
  fetchAllStoresOverview,
  fetchAllEmployeesOverview,
  syncStoresAndEmployees,
  getLiveSyncedStatus
} from '../services/externalIntegrationService.js';
import {
  getPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt
} from '../controllers/promptController.js';
import {
  getConversations,
  getConversationById,
  createConversation,
  saveConversationMessages,
  updateConversationTitle,
  deleteConversation
} from '../controllers/chatController.js';

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// System Health & Overview
router.get('/health', getHealthCheck);
router.get('/summary', getDashboardSummary);

// AI Intelligence Routes (Claude & OpenRouter)
router.post('/ai/chat', chatWithAi);
router.get('/ai/status', getAiStatus);
router.post('/ai/analyze', analyzeWorkforce);
router.post('/ai/hr/diagnose', diagnoseHrIssue);
router.post('/ai/hr/options', generateDecisionOptions);

// HR Intelligence Ingestion & AI Analysis Routes
router.post('/hr/upload', upload.single('file'), uploadHrFile);
router.get('/hr/files', getUploadedFiles);
router.get('/hr/files/:id/preview', getFilePreview);
router.get('/hr/files/:filename/download', downloadRawFile);
router.delete('/hr/files/:id', deleteHrFile);
router.get('/hr/analysis', getLatestHrAnalysis);
router.post('/hr/analyze', runCustomAiAnalysis);
router.get('/hr/employees/query', queryEmployeeRecords);
router.post('/hr/employees/query', queryEmployeeRecords);
router.get('/hr/employees', getSyncedEmployees);
router.get('/analytics/enterprise', getEnterpriseAnalytics);

// Saved Prompts Routes (MongoDB Atlas)
router.get('/prompts', getPrompts);
router.post('/prompts', createPrompt);
router.put('/prompts/:id', updatePrompt);
router.delete('/prompts/:id', deletePrompt);

// AI Conversation History Routes (MongoDB Atlas - ChatGPT / Claude style)
router.get('/ai/conversations', getConversations);
router.get('/ai/conversations/:id', getConversationById);
router.post('/ai/conversations', createConversation);
router.post('/ai/conversations/:id/messages', saveConversationMessages);
router.put('/ai/conversations/:id', updateConversationTitle);
router.delete('/ai/conversations/:id', deleteConversation);

// External Retail LMS Integration APIs (Employee 360 & Store 360)
router.get('/external/employee-overview', async (req, res) => {
  try {
    const { empId, userId, email } = req.query;
    const result = await fetchEmployeeOverview({ empId, userId, email });
    res.json({
      success: true,
      source: result.source,
      data: result.data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/external/store-overview', async (req, res) => {
  try {
    const { locCode, storeName, branchId } = req.query;
    const result = await fetchStoreOverview({ locCode, storeName, branchId });
    res.json({
      success: true,
      source: result.source,
      data: result.data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/external/stores', async (req, res) => {
  try {
    const stores = await fetchAllStoresOverview();
    res.json({ success: true, count: stores.length, data: stores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/external/sync-stores', async (req, res) => {
  try {
    const { storeCodes } = req.body;
    if (!storeCodes) {
      return res.status(400).json({ success: false, error: 'storeCodes is required (array or string of store codes)' });
    }
    const report = await syncStoresAndEmployees(storeCodes);
    await recomputeAnalytics();
    res.json({
      success: true,
      message: `Successfully synchronized ${report.totalStoresSynced} stores and ${report.totalEmployeesSynced} employee profiles from live LMS API.`,
      report
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/external/sync-status', (req, res) => {
  res.json({ success: true, ...getLiveSyncedStatus() });
});

router.get('/external/employees', async (req, res) => {
  try {
    const employees = await fetchAllEmployeesOverview();
    res.json({ success: true, count: employees.length, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cross-Engine Intelligence routes connected dynamically to ingested analytics
router.get('/sales', async (req, res) => {
  let analytics = getCachedEnterpriseAnalytics();
  if (!analytics?.sales) {
    await recomputeAnalytics();
    analytics = getCachedEnterpriseAnalytics();
  }

  const s = analytics?.sales || {
    totalRevenue: 0,
    formattedRevenue: '₹0.00L',
    totalTransactions: 0,
    conversionRate: '0.0%',
    topBranch: 'N/A',
    branches: []
  };

  res.json({
    module: 'Sales Intelligence',
    status: 'active',
    data: {
      pipelineValue: s.totalRevenue || 0,
      formattedPipeline: s.formattedRevenue || '₹0.00L',
      closedTransactions: s.totalTransactions || 0,
      conversionRate: s.conversionRate || '0.0%',
      branchLeader: s.topBranch || 'N/A',
      branches: s.branches || []
    }
  });
});

router.get('/finance', async (req, res) => {
  let analytics = getCachedEnterpriseAnalytics();
  if (!analytics?.finance) {
    await recomputeAnalytics();
    analytics = getCachedEnterpriseAnalytics();
  }

  const f = analytics?.finance;
  const grossRev = f?.grossRevenue || 0;
  const payrollExp = f?.totalMonthlyPayroll || 0;
  const hasFinanceData = grossRev > 0 || payrollExp > 0;

  // Pure dynamic metrics without hardcoded static fallbacks
  const calculatedRunway = payrollExp > 0
    ? (grossRev > 0 ? (grossRev / payrollExp).toFixed(1) + ' mos' : 'N/A')
    : 'N/A';
  const calculatedGrossMargin = grossRev > 0 && payrollExp > 0
    ? Math.max(0, Math.min(100, Math.round(((grossRev - payrollExp) / grossRev) * 100))) + '%'
    : 'N/A';

  res.json({
    module: 'Finance Intelligence',
    status: hasFinanceData ? 'active' : 'awaiting_data',
    data: {
      totalMonthlyRevenue: grossRev,
      payrollExpenditure: payrollExp,
      formattedPayroll: f?.formattedPayroll || '₹0.00L',
      payrollRatio: f?.payrollRatio || (hasFinanceData ? '0.0%' : 'N/A'),
      targetRatio: f?.targetPayrollRatio || '12.0%',
      runwayMonths: calculatedRunway,
      grossMargin: calculatedGrossMargin
    }
  });
});

router.get('/operations', async (req, res) => {
  let analytics = getCachedEnterpriseAnalytics();
  let employees = getCachedSyncedEmployees();
  const uploadedFiles = getUploadedFilesStore();

  if (!analytics || employees.length === 0) {
    await recomputeAnalytics();
    analytics = getCachedEnterpriseAnalytics();
    employees = getCachedSyncedEmployees();
  }

  // Calculate schedule compliance dynamically from ingested attendance telemetry
  let complianceStr = 'N/A';
  const attFile = uploadedFiles?.find((f) =>
    f.holds?.includes('Attendance') ||
    f.name.toLowerCase().includes('attend') ||
    f.name.toLowerCase().includes('muster') ||
    f.name.toLowerCase().includes('roster')
  );

  if (attFile && attFile.parsedRows && attFile.parsedRows.length > 0) {
    const rows = attFile.parsedRows;
    let scheduledTotal = 0;
    let productiveTotal = 0;
    rows.forEach((r) => {
      const sched = parseFloat(String(r.scheduled_hours || r.scheduledhours || 8).replace(/[^0-9.-]/g, '')) || 0;
      const prod = parseFloat(String(r.productive_hours || r.productivehours || r.hours_worked || 0).replace(/[^0-9.-]/g, '')) || 0;
      if (sched > 0) {
        scheduledTotal += sched;
        productiveTotal += Math.min(sched, prod);
      }
    });
    if (scheduledTotal > 0) {
      complianceStr = Math.min(100, Math.round((productiveTotal / scheduledTotal) * 100)) + '%';
    } else {
      complianceStr = '100%';
    }
  }

  res.json({
    module: 'Operations Intelligence',
    status: 'active',
    data: {
      activeWorkforce: employees.length || 0,
      overtimeHoursTotal: analytics?.operations?.totalOvertimeHours || '0.0',
      scheduleCompliance: complianceStr,
      openDiscrepancies: analytics?.operations?.openAuditDiscrepancies || 0,
      inProgressTasks: analytics?.operations?.inProgressTasks || 0
    }
  });
});

router.get('/operations', async (req, res) => {
  let analytics = getCachedEnterpriseAnalytics();
  let employees = getCachedSyncedEmployees();
  if (!analytics || employees.length === 0) {
    await recomputeAnalytics();
    analytics = getCachedEnterpriseAnalytics();
    employees = getCachedSyncedEmployees();
  }

  res.json({
    module: 'Operations Intelligence',
    status: 'active',
    data: {
      activeWorkforce: employees.length || 0,
      overtimeHoursTotal: analytics?.operations?.totalOvertimeHours || '0.0',
      scheduleCompliance: '98%',
      openDiscrepancies: analytics?.operations?.openAuditDiscrepancies || 0,
      inProgressTasks: analytics?.operations?.inProgressTasks || 0
    }
  });
});

router.get('/marketing', async (req, res) => {
  let analytics = getCachedEnterpriseAnalytics();
  if (!analytics?.marketing) {
    await recomputeAnalytics();
    analytics = getCachedEnterpriseAnalytics();
  }

  const m = analytics?.marketing || {
    totalFootfallAndLeads: 0,
    closedTransactions: 0,
    customerConversionPct: '0.0%',
    customerComplaints: 0
  };

  res.json({
    module: 'Marketing Intelligence',
    status: 'active',
    data: {
      totalFootfallLeads: m.totalFootfallAndLeads || 0,
      conversions: m.closedTransactions || 0,
      conversionRate: m.customerConversionPct || '0.0%',
      customerComplaints: m.customerComplaints || 0
    }
  });
});

router.get('/business-health', async (req, res) => {
  let analytics = getCachedEnterpriseAnalytics();
  let employees = getCachedSyncedEmployees();

  if (!analytics || employees.length === 0) {
    await recomputeAnalytics();
    analytics = getCachedEnterpriseAnalytics();
    employees = getCachedSyncedEmployees();
  }

  const latestAnalysis = getCachedLatestAnalysis();
  const hrScoreNum = parseInt(latestAnalysis?.healthScore) || (employees.length > 0 ? 80 : 0);

  // Dynamic Sales Score based on quota attainment across branches
  const branches = latestAnalysis?.storesSummary?.branches || [];
  let salesScore = 0;
  if (branches.length > 0) {
    const totalAttainment = branches.reduce((sum, b) => {
      const target = b.monthlyTarget || 0;
      const sales = b.netSales || 0;
      return sum + (target > 0 ? Math.min(100, (sales / target) * 100) : 75);
    }, 0);
    salesScore = Math.round(totalAttainment / branches.length);
  } else if (analytics?.sales?.totalRevenue > 0) {
    salesScore = 80;
  }

  // Dynamic Finance Score based on payroll-to-revenue ratio vs target
  let financeScore = 0;
  const payrollRatioNum = parseFloat(analytics?.finance?.payrollRatio || '0');
  const targetRatioNum = parseFloat(analytics?.finance?.targetRatio || '12.0');
  if (payrollRatioNum > 0) {
    const gap = Math.abs(payrollRatioNum - targetRatioNum);
    financeScore = Math.max(40, Math.min(100, Math.round(100 - gap * 4)));
  } else if (analytics?.finance?.grossRevenue > 0) {
    financeScore = 75;
  }

  // Dynamic Operations Score based on audit discrepancies & overtime concentration
  let opsScore = 0;
  const discrepancies = analytics?.operations?.openAuditDiscrepancies || 0;
  const otHours = parseFloat(analytics?.operations?.totalOvertimeHours || '0');
  if (employees.length > 0 || branches.length > 0) {
    opsScore = Math.max(50, Math.min(100, Math.round(100 - (discrepancies * 2) - (otHours > 50 ? 10 : 0))));
  }

  // Composite overall score from active engines
  const activeScores = [hrScoreNum, salesScore, financeScore, opsScore].filter((s) => s > 0);
  const compositeScore = activeScores.length > 0
    ? Math.round(activeScores.reduce((a, b) => a + b, 0) / activeScores.length)
    : 0;

  // Real strategic priorities synthesized directly from detected attention items
  const strategicPriorities = (latestAnalysis?.attentionItems || []).slice(0, 3).map((item, idx) => ({
    title: item.title,
    desc: item.description || item.whatsHappening || 'Action required based on telemetry.',
    bg: idx === 0 ? '#eff6ff' : (idx === 1 ? '#f0fdf4' : '#fffbeb'),
    border: idx === 0 ? '#bfdbfe' : (idx === 1 ? '#bbf7d0' : '#fde68a'),
    color: idx === 0 ? '#1e40af' : (idx === 1 ? '#166534' : '#b45309')
  }));

  res.json({
    module: 'Business Health',
    status: 'active',
    data: {
      overallScore: compositeScore > 0 ? compositeScore : null,
      status: compositeScore >= 80 ? 'Optimal (Synchronized)' : (compositeScore >= 65 ? 'Needs Attention' : (compositeScore > 0 ? 'Critical' : 'Awaiting Telemetry')),
      strategicPriorities,
      engineBreakdown: [
        { id: 'hr', name: 'HR Intelligence', score: hrScoreNum, status: hrScoreNum > 0 ? 'Active' : 'Awaiting Data', detail: `${employees.length} employees synced` },
        { id: 'sales', name: 'Sales Intelligence', score: salesScore, status: salesScore > 0 ? 'Active' : 'Awaiting Data', detail: `${analytics?.sales?.formattedRevenue || '₹0.00L'} Revenue` },
        { id: 'finance', name: 'Finance Intelligence', score: financeScore, status: financeScore > 0 ? 'Active' : 'Awaiting Data', detail: `${analytics?.finance?.payrollRatio || 'N/A'} Payroll Ratio` },
        { id: 'operations', name: 'Operations Intelligence', score: opsScore, status: opsScore > 0 ? 'Active' : 'Awaiting Data', detail: `${discrepancies} Audit Discrepancies Monitored` }
      ]
    }
  });
});

// Tasks endpoint serving live operational store tasks from LMS + user deployed tasks
let deployedUserTasks = [];

router.get('/tasks', async (req, res) => {
  try {
    const stores = await fetchAllStoresOverview();
    const lmsTasks = [];
    stores.forEach((s) => {
      const branchName = s.summary?.workingBranch || s.branch?.workingBranch || 'Store Network';
      (s.operations?.storeTasks || []).forEach((t) => {
        lmsTasks.push({
          id: t.taskCode || t._id || `tsk-${Math.random()}`,
          title: t.description || t.title || t.adminTitle || 'Store Operational Task',
          status: t.status === 'COMPLETED' ? 'Completed' : (t.status === 'IN PROGRESS' ? 'In Progress' : (t.status || 'In Progress')),
          priority: t.priority || 'Medium',
          owner: t.assignedToLabel || t.assignedByName || 'Store Admin',
          deadline: t.endDate || t.dueDate || 'Ongoing',
          branch: t.storeName || branchName,
          category: t.category || 'Operations'
        });
      });
    });

    const combined = [...deployedUserTasks, ...lmsTasks];
    res.json({ 
      module: 'AI Tasks', 
      count: combined.length,
      tasks: combined
    });
  } catch (err) {
    res.json({ module: 'AI Tasks', count: deployedUserTasks.length, tasks: deployedUserTasks });
  }
});

router.post('/tasks', (req, res) => {
  const { title, owner, deadline, kpi, priority, branch } = req.body;
  const newTask = {
    id: `tsk-${Date.now()}`,
    title: title || 'Executive Action Plan',
    owner: owner || 'Operations Lead',
    deadline: deadline || '14 Days',
    kpi: kpi || 'Optimize Operational KPI',
    priority: priority || 'High',
    branch: branch || 'Store Network',
    status: 'In Progress',
    createdAt: new Date().toISOString()
  };
  deployedUserTasks.unshift(newTask);
  res.json({ status: 'success', task: newTask });
});

router.get('/assistant', (req, res) => res.json({ module: 'AI Assistant', status: 'active' }));
router.get('/integrations', (req, res) => res.json({ module: 'Integrations', count: 4, status: 'connected' }));

router.get('/reports', (req, res) => {
  const files = getUploadedFilesStore();
  const reports = files.map((f, idx) => ({
    id: `rep-${idx + 1}`,
    name: `${f.name} (Ingested Registry)`,
    format: 'CSV / Excel',
    period: f.period || 'Current Period',
    size: `${f.rows} records`,
    downloadUrl: f.downloadUrl || `/api/hr/files/${f.id}/preview`
  }));

  res.json({
    module: 'Reports',
    status: 'active',
    reports
  });
});

router.get('/team', getSyncedEmployees);
router.get('/settings', (req, res) => res.json({ module: 'Settings', config: { theme: 'light', syncFrequency: 'Real-time', aiEngine: 'Claude' } }));

export default router;
