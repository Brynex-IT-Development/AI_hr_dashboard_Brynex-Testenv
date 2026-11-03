import { getCachedEnterpriseAnalytics, getCachedSyncedEmployees } from './hrController.js';

export const getDashboardSummary = (req, res) => {
  const analytics = getCachedEnterpriseAnalytics();
  const employees = getCachedSyncedEmployees();

  if (!analytics && employees.length === 0) {
    return res.json({
      status: 'success',
      data: {
        healthScore: null,
        healthStatus: 'Awaiting Telemetry (No Data Ingested)',
        activeEngines: [],
        headcount: 0,
        grossRevenue: '₹0.00L',
        payrollRatio: 'N/A',
        pendingTasks: 0,
        lastUpdated: new Date().toISOString()
      }
    });
  }

  const salesRev = analytics?.sales?.formattedRevenue || '₹0.00L';
  const payrollRatio = analytics?.finance?.payrollRatio || 'N/A';
  const headcount = employees.length;
  const healthScore = analytics?.healthScore
    ? (parseInt(analytics.healthScore) || null)
    : (employees.length > 0 ? 80 : null);
  const conversionPct = analytics?.marketing?.customerConversionPct || null;

  res.json({
    status: 'success',
    data: {
      healthScore,
      healthStatus: healthScore !== null ? (healthScore >= 80 ? 'Optimal (Synchronized)' : 'Needs Attention') : 'Awaiting Telemetry',
      activeEngines: [
        { name: 'HR Intelligence', status: headcount > 0 ? 'Active' : 'Awaiting Data', metric: `${headcount} Staff Synced` },
        { name: 'Sales Intelligence', status: analytics?.sales ? 'Active' : 'Awaiting Data', metric: `${salesRev} Revenue` },
        { name: 'Finance Intelligence', status: analytics?.finance ? 'Active' : 'Awaiting Data', metric: `${payrollRatio} Payroll Ratio` },
        { name: 'Operations Intelligence', status: analytics?.operations ? 'Active' : 'Awaiting Data', metric: `${analytics?.operations?.totalOvertimeHours || 0} OT Hours` }
      ],
      headcount,
      grossRevenue: salesRev,
      payrollRatio,
      conversionPct,
      pendingTasks: 0,
      lastUpdated: new Date().toISOString()
    }
  });
};

export const getHealthCheck = (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
};
