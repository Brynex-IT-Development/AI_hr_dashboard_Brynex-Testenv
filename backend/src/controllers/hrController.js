import path from 'path';
import fs from 'fs';
import { parseUploadedFile } from '../services/fileParserService.js';
import { analyzeMultiFileHrData, identifyFileScope } from '../services/multiFileCorrelatorService.js';
import { runClaudeDocumentAnalysis, runClaudeApiAnalysis } from '../services/aiDocumentAnalyzerService.js';
import { aggregateHrIntelligence } from '../services/hrIntelligenceAggregator.js';
import { fetchAllStoresOverview, fetchAllEmployeesOverview } from '../services/externalIntegrationService.js';
import { parsePromptIntent, recordMatchesPrompt, itemMatchesPrompt } from '../services/promptMatcherService.js';

// In-memory stores (strictly populated by actual file uploads)
let uploadedFilesStore = [];
let latestAnalysis = null;
let cachedApiAnalysis = null;
let allSyncedEmployees = [];
let cachedSyncedEmployees = [];
let cachedEnterpriseAnalytics = null;
let activeAdminPrompt = '';
let activeCustomRules = null;
let isAiAnalyzingGlobal = false;
const promptAnalysisCache = new Map();

const UPLOADS_DIR = fs.existsSync(path.join(process.cwd(), 'uploads'))
  ? path.join(process.cwd(), 'uploads')
  : path.join(process.cwd(), 'backend', 'uploads');
const REGISTRY_PATH = path.join(UPLOADS_DIR, 'files_registry.json');

const persistFilesRegistry = () => {
  try {
    const dataToSave = {
      files: uploadedFilesStore.map((f) => ({
        id: f.id,
        name: f.name,
        savedFilename: f.savedFilename,
        holds: f.holds,
        period: f.period,
        status: f.status,
        uploadedAt: f.uploadedAt
      })),
      activeAdminPrompt,
      activeCustomRules
    };
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist file registry:', err.message);
  }
};

/**
 * Filter employees list based on prompt keywords and custom rules
 */
export const filterEmployeesByPrompt = (employees = [], prompt = '', customRules = null) => {
  if (!employees || employees.length === 0) return [];
  let filtered = [...employees];

  // 1. Department filter from customRules
  if (customRules?.targetDepartment && customRules.targetDepartment !== 'All') {
    const dTarget = customRules.targetDepartment.toLowerCase();
    filtered = filtered.filter((e) => (e.dept || '').toLowerCase().includes(dTarget));
  }

  // 2. Intent-based matching
  const intent = parsePromptIntent(prompt);
  if (!intent.isFiltered) {
    return filtered;
  }

  return filtered.filter((e) => recordMatchesPrompt(e, intent));
};

export const isRealAiItem = (item) =>
  Boolean(
    item &&
    typeof item.title === 'string' &&
    item.title.trim().length > 0 &&
    !String(item.id || '').startsWith('flag-') &&
    !String(item.id || '').startsWith('att-store-') &&
    !String(item.id || '').startsWith('att-audit-') &&
    !String(item.id || '').startsWith('att-csv-')
  );

/**
 * Merge CSV-derived intelligence with Live External LMS API Telemetry
 */
export const mergeDualLayerAnalysis = (csvAnalysis, apiAnalysis = cachedApiAnalysis) => {
  if (!csvAnalysis && !apiAnalysis) return null;
  if (!csvAnalysis) return apiAnalysis;
  if (!apiAnalysis) return csvAnalysis;

  const intent = parsePromptIntent(activeAdminPrompt);

  const csvItems = (csvAnalysis && Array.isArray(csvAnalysis.attentionItems)) ? csvAnalysis.attentionItems : [];
  const apiItems = (apiAnalysis && Array.isArray(apiAnalysis.attentionItems)) ? apiAnalysis.attentionItems : [];

  const seenIds = new Set();
  let combinedAttentionItems = [];

  // 1. Add CSV-derived intelligence items first (real AI items only)
  for (const item of csvItems) {
    if (isRealAiItem(item) && !seenIds.has(String(item.id))) {
      seenIds.add(String(item.id));
      combinedAttentionItems.push(item);
    }
  }

  // 2. Add Live LMS API Telemetry items (real AI items only)
  for (const item of apiItems) {
    if (isRealAiItem(item) && !seenIds.has(String(item.id))) {
      seenIds.add(String(item.id));
      combinedAttentionItems.push(item);
    }
  }

<<<<<<< HEAD
  // Calculate synchronized KPI counters strictly from real AI-analyzed items
=======
  // Enforce prompt isolation on attention items to prevent cross-branch leakage
  if (intent.isFiltered) {
    combinedAttentionItems = combinedAttentionItems.filter((item) => itemMatchesPrompt(item, intent));
  }

  // Calculate synchronized KPI counters
>>>>>>> ExelData
  const totalIssues = combinedAttentionItems.length;
  const awaitedDecisionsCount = combinedAttentionItems.reduce(
    (acc, i) => acc + (Array.isArray(i.decisionOptions) ? i.decisionOptions.length : (i.decisionOptions ? 1 : 0)),
    0
  ) || totalIssues;
  const opportunitiesCount = combinedAttentionItems.filter(
    (i) => i.category === 'Opportunity'
  ).length;

<<<<<<< HEAD
  const baseKpis = (csvAnalysis.kpiMetrics || apiAnalysis.kpiMetrics || []);
  const mergedKpis = baseKpis.map((kpi) => {
=======
  const totalHeadcount = intent.isFiltered
    ? (cachedSyncedEmployees.length > 0 ? cachedSyncedEmployees.length : (csvAnalysis.totalRecords || 0))
    : (csvAnalysis.totalRecords || allSyncedEmployees.length || 0);

  const mergedKpis = (csvAnalysis.kpiMetrics || apiAnalysis.kpiMetrics || []).map((kpi) => {
>>>>>>> ExelData
    if (kpi.id === 'issues') {
      return {
        ...kpi,
        value: String(totalIssues),
<<<<<<< HEAD
        trend: totalIssues > 0 ? `${totalIssues} active risks across datasets` : 'No active risks detected',
        trendPositive: totalIssues === 0
=======
        trend: intent.isFiltered
          ? `${totalIssues} active risks for "${activeAdminPrompt}"`
          : `${totalIssues} active risks across datasets`
>>>>>>> ExelData
      };
    }
    if (kpi.id === 'decisions') {
      return {
        ...kpi,
        value: String(awaitedDecisionsCount),
        trend: awaitedDecisionsCount > 0 ? `${awaitedDecisionsCount} management options ready for approval` : 'No pending decisions',
        trendPositive: totalIssues === 0
      };
    }
    if (kpi.id === 'opportunities') {
      return {
        ...kpi,
        value: String(opportunitiesCount),
        trend: `${opportunitiesCount} optimization areas detected`
      };
    }
    if (kpi.id === 'monitored') {
      return {
        ...kpi,
        value: String(totalHeadcount),
        trend: intent.isFiltered
          ? `${totalHeadcount} staff matching "${activeAdminPrompt}"`
          : `${totalHeadcount} staff monitored`
      };
    }
    return kpi;
  });

  const attentionSummary = intent.isFiltered
    ? `Active Focus: "${activeAdminPrompt}". Ingested ${uploadedFilesStore.length} dataset(s) (${totalHeadcount} matching records). ${combinedAttentionItems.length} active management issues.`
    : `Dual-layer intelligence active: Ingested ${uploadedFilesStore.length} dataset(s) (${totalHeadcount} employee records) correlated with Live Retail LMS API telemetry. ${combinedAttentionItems.length} total attention issues active.`;

  return {
    ...apiAnalysis,
    ...csvAnalysis,
    kpiMetrics: mergedKpis,
    attentionItems: combinedAttentionItems,
    connectedFilesCount: uploadedFilesStore.length,
<<<<<<< HEAD
    attentionSummary: totalIssues > 0
      ? `Dual-layer intelligence active: Ingested ${uploadedFilesStore.length} dataset(s) (${totalHeadcount} employee records) correlated with Live Retail LMS API telemetry. ${totalIssues} total attention issues active.`
      : `Dual-layer intelligence active: Ingested ${uploadedFilesStore.length} dataset(s) (${totalHeadcount} employee records). No AI issues fetched yet. Run AI analysis to synthesize workforce telemetry.`,
    adminPromptApplied: activeAdminPrompt || null,
=======
    fileNames: uploadedFilesStore.map((f) => f.name),
    attentionSummary,
>>>>>>> ExelData
    storesSummary: apiAnalysis.storesSummary || csvAnalysis.storesSummary,
    enterpriseAnalytics: apiAnalysis.enterpriseAnalytics || csvAnalysis.enterpriseAnalytics,
    employeesSummary: apiAnalysis.employeesSummary || csvAnalysis.employeesSummary
  };
};

/**
 * Recompute employee profiles and enterprise analytics dynamically (Dual-State Aggregation)
 */
export const recomputeAnalytics = async (prompt = activeAdminPrompt, rules = activeCustomRules) => {
  activeAdminPrompt = prompt || '';
  activeCustomRules = rules || null;

  try {
    const aggregated = await aggregateHrIntelligence({
      uploadedFiles: uploadedFilesStore,
      customRules: activeCustomRules,
      adminPrompt: activeAdminPrompt
    });

    cachedApiAnalysis = aggregated;
    allSyncedEmployees = aggregated.employeesSummary?.employees || [];
    cachedSyncedEmployees = filterEmployeesByPrompt(allSyncedEmployees, activeAdminPrompt, activeCustomRules);
    cachedEnterpriseAnalytics = aggregated.enterpriseAnalytics;

    if (uploadedFilesStore.length === 0) {
      latestAnalysis = aggregated;
    } else {
      const instantCsv = await analyzeMultiFileHrData({
        files: uploadedFilesStore,
        customRules: activeCustomRules,
        adminPrompt: activeAdminPrompt
      });
      // Preserve existing AI-synthesized attention items if present and real
      const existingAiItems = (latestAnalysis && Array.isArray(latestAnalysis.attentionItems))
        ? latestAnalysis.attentionItems.filter(isRealAiItem)
        : [];
      instantCsv.attentionItems = existingAiItems;
      latestAnalysis = mergeDualLayerAnalysis(instantCsv, cachedApiAnalysis);
    }

    return latestAnalysis;
  } catch (err) {
    console.warn('Error in aggregateHrIntelligence:', err.message);
  }
};

const hydrateFilesFromDisk = async () => {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.files)) {
        activeAdminPrompt = parsed.activeAdminPrompt || '';
        activeCustomRules = parsed.activeCustomRules || null;

        const restored = [];
        for (const meta of parsed.files) {
          const filePath = path.join(UPLOADS_DIR, meta.savedFilename);
          if (fs.existsSync(filePath)) {
            const parsedRows = await parseUploadedFile(filePath, meta.name);
            const detectedHolds = identifyFileScope(meta.name, parsedRows);
            restored.push({
              ...meta,
              holds: detectedHolds,
              downloadUrl: `/api/hr/files/${meta.savedFilename}/download`,
              rows: parsedRows.length,
              parsedRows
            });
          }
        }

        if (restored.length > 0) {
          uploadedFilesStore = restored;
          try {
            const existingContent = fs.readFileSync(REGISTRY_PATH, 'utf-8');
            const currentString = JSON.stringify({
              files: uploadedFilesStore.map((f) => ({
                id: f.id,
                name: f.name,
                savedFilename: f.savedFilename,
                holds: f.holds,
                period: f.period,
                status: f.status,
                uploadedAt: f.uploadedAt
              })),
              activeAdminPrompt,
              activeCustomRules
            }, null, 2);
            if (existingContent.trim() !== currentString.trim()) {
              persistFilesRegistry();
            }
          } catch (_) {}
          console.log(`[Hydration] Successfully hydrated ${restored.length} connected files from disk.`);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to hydrate files from disk:', err.message);
  } finally {
    // ALWAYS initialize baseline/dual-layer intelligence so state is never null/empty
    await recomputeAnalytics(activeAdminPrompt, activeCustomRules);
    // Automatically trigger pure Claude AI synthesis on boot so main issues are ready when the user opens the page!
    triggerBackgroundAiSynthesis(activeAdminPrompt, activeCustomRules);
  }
};

/**
 * Automatically trigger pure Claude AI synthesis in the background.
 * Synthesizes top/main issues based on actual uploaded CSVs or Live Retail LMS API telemetry.
 * Zero mock data, zero fallback data, zero hardcoded responses.
 */
export const triggerBackgroundAiSynthesis = (prompt = activeAdminPrompt, rules = activeCustomRules) => {
  if (isAiAnalyzingGlobal) {
    console.log('[AI Synthesis] Analysis already actively running in background.');
    return;
  }

  isAiAnalyzingGlobal = true;
  activeAdminPrompt = prompt || '';
  activeCustomRules = rules || null;

  console.log(`[AI Synthesis] Running pure Claude AI diagnostic synthesis (Prompt: "${activeAdminPrompt || 'Top Network Priorities'}", Files: ${uploadedFilesStore.length})...`);

  if (uploadedFilesStore.length > 0) {
    runClaudeDocumentAnalysis({
      files: uploadedFilesStore,
      customRules: activeCustomRules,
      adminPrompt: activeAdminPrompt
    })
      .then((dynamicAnalysis) => {
        if (dynamicAnalysis && dynamicAnalysis.attentionItems) {
          latestAnalysis = mergeDualLayerAnalysis(dynamicAnalysis, cachedApiAnalysis);
          console.log(`[AI Synthesis] Document synthesis completed with ${latestAnalysis.attentionItems.length} real issues.`);
        }
      })
      .catch((aiErr) => {
        console.warn('Claude dynamic analysis error:', aiErr.message);
      })
      .finally(() => {
        isAiAnalyzingGlobal = false;
      });
  } else {
    // Live Retail LMS API Telemetry synthesis via Claude
    Promise.all([fetchAllStoresOverview(), fetchAllEmployeesOverview()])
      .then(([stores, employees]) => {
        return runClaudeApiAnalysis({
          stores,
          employees,
          adminPrompt: activeAdminPrompt,
          customRules: activeCustomRules
        });
      })
      .then((apiAiAnalysis) => {
        if (apiAiAnalysis && apiAiAnalysis.attentionItems && apiAiAnalysis.attentionItems.length > 0) {
          latestAnalysis = {
            ...latestAnalysis,
            healthScore: apiAiAnalysis.healthScore ? `${apiAiAnalysis.healthScore}%` : latestAnalysis.healthScore,
            healthStatus: apiAiAnalysis.healthStatus || latestAnalysis.healthStatus,
            attentionSummary: apiAiAnalysis.attentionSummary || latestAnalysis.attentionSummary,
            kpiMetrics: apiAiAnalysis.kpiMetrics || latestAnalysis.kpiMetrics,
            attentionItems: apiAiAnalysis.attentionItems,
            adminPromptApplied: activeAdminPrompt
          };
          cachedApiAnalysis = latestAnalysis;
          console.log(`[AI Synthesis] Retail LMS API synthesis completed with ${latestAnalysis.attentionItems.length} real issues.`);
        }
      })
      .catch((aiErr) => {
        console.warn('Claude API analysis error:', aiErr.message);
      })
      .finally(() => {
        isAiAnalyzingGlobal = false;
      });
  }
};

hydrateFilesFromDisk();

export const uploadHrFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded.' });
    }

    const { filename, originalname, path: filePath } = req.file;
    const adminPrompt = req.body.adminPrompt || '';
    let customRules = null;
    if (req.body.customRules) {
      try {
        customRules = typeof req.body.customRules === 'string' ? JSON.parse(req.body.customRules) : req.body.customRules;
      } catch (err) {
        console.warn('Invalid custom rules format, falling back to default:', err.message);
      }
    }

    activeAdminPrompt = adminPrompt;
    activeCustomRules = customRules;

    // 1. Parse file content into tabular rows
    const parsedRows = await parseUploadedFile(filePath, originalname);

    // 2. Identify file scope
    const detectedHolds = identifyFileScope(originalname, parsedRows);

    // 3. Save to uploaded records store
    const newFileRecord = {
      id: `f_${Date.now()}`,
      name: originalname,
      savedFilename: filename,
      downloadUrl: `/api/hr/files/${filename}/download`,
      holds: detectedHolds,
      rows: parsedRows.length,
      period: 'Current Upload',
      status: 'All rows valid',
      uploadedAt: new Date().toISOString(),
      parsedRows
    };

    uploadedFilesStore.unshift(newFileRecord);
    persistFilesRegistry();

    // 4. Recompute cross-correlated analytics with prompt and rules
    await recomputeAnalytics(activeAdminPrompt, activeCustomRules);

    // 5. Compute instant mathematical correlation analysis so latestAnalysis is ready immediately (<10ms)
    const instantCsv = await analyzeMultiFileHrData({
      files: uploadedFilesStore,
      customRules: activeCustomRules,
      adminPrompt: activeAdminPrompt
    });
    latestAnalysis = mergeDualLayerAnalysis(instantCsv, cachedApiAnalysis);

    isAiAnalyzingGlobal = true;

    // 6. Return response to the frontend IMMEDIATELY so the upload modal closes in <100ms!
    res.json({
      status: 'success',
      message: `File "${originalname}" connected successfully across ${uploadedFilesStore.length} datasets. Claude AI intelligence synthesis running in background.`,
      file: newFileRecord,
      analysis: latestAnalysis,
      isAiAnalyzing: true,
      activePrompt: activeAdminPrompt,
      employeesCount: cachedSyncedEmployees.length,
      totalEmployeesCount: allSyncedEmployees.length
    });

    // 7. Perform deep Claude AI synthesis in the background
    runClaudeDocumentAnalysis({
      files: uploadedFilesStore,
      customRules: activeCustomRules,
      adminPrompt: activeAdminPrompt
    }).then((dynamicAnalysis) => {
      if (dynamicAnalysis && dynamicAnalysis.attentionItems) {
        latestAnalysis = mergeDualLayerAnalysis(dynamicAnalysis, cachedApiAnalysis);
      }
    }).catch((aiErr) => {
      console.warn('Claude dynamic analysis background fallback:', aiErr.message);
    }).finally(() => {
      isAiAnalyzingGlobal = false;
    });

    return;
  } catch (error) {
    console.error('File upload & analysis error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Error processing file.'
    });
  }
};

export const getUploadedFiles = (req, res) => {
  res.json({
    status: 'success',
    files: uploadedFilesStore.map((f) => ({
      id: f.id,
      name: f.name,
      holds: f.holds,
      rows: f.rows,
      period: f.period,
      status: f.status,
      savedFilename: f.savedFilename,
      downloadUrl: f.savedFilename ? `/api/hr/files/${f.savedFilename}/download` : null,
      uploadedAt: f.uploadedAt,
      columns: f.parsedRows && f.parsedRows.length > 0 ? Object.keys(f.parsedRows[0]) : [],
      data: f.parsedRows || []
    }))
  });
};

export const getFilePreview = (req, res) => {
  const { id } = req.params;
  const file = uploadedFilesStore.find((f) => f.id === id || f.savedFilename === id);
  if (!file) {
    return res.status(404).json({ status: 'error', message: 'File not found.' });
  }

  res.json({
    status: 'success',
    file: {
      id: file.id,
      name: file.name,
      holds: file.holds,
      rowsCount: file.rows,
      columns: file.parsedRows.length > 0 ? Object.keys(file.parsedRows[0]) : [],
      data: file.parsedRows,
      downloadUrl: file.savedFilename ? `/api/hr/files/${file.savedFilename}/download` : null
    }
  });
};

export const downloadRawFile = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);

  if (fs.existsSync(filePath)) {
    return res.download(filePath);
  }

  const file = uploadedFilesStore.find((f) => f.savedFilename === filename || f.name === filename);
  if (file && file.parsedRows && file.parsedRows.length > 0) {
    const keys = Object.keys(file.parsedRows[0]);
    const csvContent = [
      keys.join(','),
      ...file.parsedRows.map((r) => keys.map((k) => `"${r[k] || ''}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name || 'export.csv'}"`);
    return res.send(csvContent);
  }

  return res.status(404).json({ status: 'error', message: 'File does not exist on server.' });
};

export const deleteHrFile = async (req, res) => {
  try {
    const { id } = req.params;
    const fileIndex = uploadedFilesStore.findIndex((f) => f.id === id || f.savedFilename === id);
    if (fileIndex === -1) {
      return res.status(404).json({ status: 'error', message: 'File not found.' });
    }

    const removedFile = uploadedFilesStore[fileIndex];

    if (removedFile.savedFilename) {
      const filePath = path.join(UPLOADS_DIR, removedFile.savedFilename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn('Could not remove file from disk:', err.message);
        }
      }
    }

    uploadedFilesStore.splice(fileIndex, 1);
    persistFilesRegistry();

    if (uploadedFilesStore.length > 0) {
      await recomputeAnalytics(activeAdminPrompt, activeCustomRules);
      // Immediately purge deleted file data from latestAnalysis using mathematical correlator
      const instantCsv = await analyzeMultiFileHrData({
        files: uploadedFilesStore,
        customRules: activeCustomRules,
        adminPrompt: activeAdminPrompt
      });
      latestAnalysis = mergeDualLayerAnalysis(instantCsv, cachedApiAnalysis);

      isAiAnalyzingGlobal = true;

      // Send immediate response so frontend UI updates instantaneously (<50ms)
      res.json({
        status: 'success',
        message: `File "${removedFile.name}" deleted successfully.`,
        remainingFilesCount: uploadedFilesStore.length,
        analysis: latestAnalysis,
        isAiAnalyzing: true
      });

      // Run deep Claude AI synthesis in the background to refine analysis without blocking UI
      runClaudeDocumentAnalysis({
        files: uploadedFilesStore,
        customRules: activeCustomRules,
        adminPrompt: activeAdminPrompt
      }).then((aiResult) => {
        if (aiResult && aiResult.attentionItems) {
          latestAnalysis = mergeDualLayerAnalysis(aiResult, cachedApiAnalysis);
        }
      }).catch((aiErr) => {
        console.warn('Claude dynamic analysis background update on delete:', aiErr.message);
      }).finally(() => {
        isAiAnalyzingGlobal = false;
      });
      return;
    } else {
      isAiAnalyzingGlobal = false;
      await recomputeAnalytics(activeAdminPrompt, activeCustomRules);
      latestAnalysis = cachedApiAnalysis;

      return res.json({
        status: 'success',
        message: `File "${removedFile.name}" deleted. Restored live retail API baseline telemetry.`,
        remainingFilesCount: 0,
        analysis: latestAnalysis
      });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getLatestHrAnalysis = async (req, res) => {
  if (!latestAnalysis) {
    await recomputeAnalytics(activeAdminPrompt, activeCustomRules);
  }
<<<<<<< HEAD

  const hasRealAiItems = latestAnalysis && Array.isArray(latestAnalysis.attentionItems) && latestAnalysis.attentionItems.some(isRealAiItem);

  // When opening the page, if no AI analysis has been run yet, automatically trigger pure Claude AI to find the main issues!
  if (!hasRealAiItems && !isAiAnalyzingGlobal) {
    triggerBackgroundAiSynthesis(activeAdminPrompt, activeCustomRules);
  }

=======
  // Enforce idle state if no active admin prompt and no uploaded files
  if (!activeAdminPrompt && uploadedFilesStore.length === 0) {
    if (latestAnalysis?.attentionItems?.length > 0) {
      await recomputeAnalytics('', activeCustomRules);
    }
  }
>>>>>>> ExelData
  res.json({
    status: 'success',
    data: latestAnalysis,
    isAiAnalyzing: isAiAnalyzingGlobal,
    activePrompt: activeAdminPrompt,
    customRules: activeCustomRules,
    employeesCount: cachedSyncedEmployees.length,
    totalEmployeesCount: allSyncedEmployees.length
  });
};

export const runCustomAiAnalysis = async (req, res) => {
  try {
    const { adminPrompt = '', customRules = null } = req.body;
    activeAdminPrompt = (adminPrompt || '').trim();
    activeCustomRules = customRules;

    const cacheKey = activeAdminPrompt.toLowerCase();

<<<<<<< HEAD
    // Trigger pure Claude AI synthesis with user instruction (or default baseline if prompt is reset)
    triggerBackgroundAiSynthesis(activeAdminPrompt, activeCustomRules);

=======
    // If prompt is empty and no uploaded files exist, return clean idle baseline immediately
    if (!activeAdminPrompt && uploadedFilesStore.length === 0) {
      await recomputeAnalytics('', activeCustomRules);
      isAiAnalyzingGlobal = false;
      return res.json({
        status: 'success',
        data: latestAnalysis,
        isAiAnalyzing: false,
        activePrompt: '',
        customRules: activeCustomRules,
        employeesCount: cachedSyncedEmployees.length,
        totalEmployeesCount: allSyncedEmployees.length
      });
    }

    // Check fast in-memory cache for repeated prompts (instant 0ms response)
    if (activeAdminPrompt && uploadedFilesStore.length === 0 && promptAnalysisCache.has(cacheKey)) {
      const cachedResult = promptAnalysisCache.get(cacheKey);
      latestAnalysis = cachedResult;
      cachedApiAnalysis = cachedResult;
      isAiAnalyzingGlobal = false;
      return res.json({
        status: 'success',
        data: latestAnalysis,
        isAiAnalyzing: false,
        activePrompt: activeAdminPrompt,
        customRules: activeCustomRules,
        employeesCount: cachedSyncedEmployees.length,
        totalEmployeesCount: allSyncedEmployees.length
      });
    }

    if (uploadedFilesStore.length > 0) {
      await recomputeAnalytics(activeAdminPrompt, activeCustomRules);
      const instantCsv = await analyzeMultiFileHrData({
        files: uploadedFilesStore,
        customRules: activeCustomRules,
        adminPrompt: activeAdminPrompt
      });
      latestAnalysis = mergeDualLayerAnalysis(instantCsv, cachedApiAnalysis);
      isAiAnalyzingGlobal = true;

      res.json({
        status: 'success',
        data: latestAnalysis,
        isAiAnalyzing: true,
        activePrompt: activeAdminPrompt,
        customRules: activeCustomRules,
        employeesCount: cachedSyncedEmployees.length,
        totalEmployeesCount: allSyncedEmployees.length
      });

      runClaudeDocumentAnalysis({
        files: uploadedFilesStore,
        customRules: activeCustomRules,
        adminPrompt: activeAdminPrompt
      }).then((dynamicAnalysis) => {
        if (dynamicAnalysis && dynamicAnalysis.attentionItems) {
          latestAnalysis = mergeDualLayerAnalysis(dynamicAnalysis, cachedApiAnalysis);
        }
      }).catch((aiErr) => {
        console.warn('Claude dynamic analysis fallback to mathematical correlator:', aiErr.message);
      }).finally(() => {
        isAiAnalyzingGlobal = false;
      });
      return;
    }

    // Pure Real Data Fetching & Live Claude AI Synthesis (Zero Mock/Hardcoded Data)
    isAiAnalyzingGlobal = true;

    // Send immediate response so frontend triggers the high-level human loading UI
>>>>>>> ExelData
    res.json({
      status: 'success',
      data: latestAnalysis,
      isAiAnalyzing: true,
      activePrompt: activeAdminPrompt,
      customRules: activeCustomRules,
      employeesCount: cachedSyncedEmployees.length,
      totalEmployeesCount: allSyncedEmployees.length
    });
<<<<<<< HEAD
=======

    // 1. Fetch live LMS store and employee datasets from external APIs / cache
    const [stores, employees] = await Promise.all([
      fetchAllStoresOverview(),
      fetchAllEmployeesOverview()
    ]);

    // 2. Perform live, dynamic Claude AI synthesis directly on the real store and staff records
    runClaudeApiAnalysis({
      stores,
      employees,
      adminPrompt: activeAdminPrompt,
      customRules: activeCustomRules
    })
      .then((apiAiAnalysis) => {
        if (apiAiAnalysis && apiAiAnalysis.attentionItems && apiAiAnalysis.attentionItems.length > 0) {
          latestAnalysis = {
            ...latestAnalysis,
            healthScore: apiAiAnalysis.healthScore ? `${apiAiAnalysis.healthScore}%` : latestAnalysis.healthScore,
            healthStatus: apiAiAnalysis.healthStatus || latestAnalysis.healthStatus,
            attentionSummary: apiAiAnalysis.attentionSummary || latestAnalysis.attentionSummary,
            kpiMetrics: apiAiAnalysis.kpiMetrics || latestAnalysis.kpiMetrics,
            attentionItems: apiAiAnalysis.attentionItems,
            adminPromptApplied: activeAdminPrompt
          };
          cachedApiAnalysis = latestAnalysis;
          promptAnalysisCache.set(cacheKey, latestAnalysis);
        }
      })
      .catch((aiErr) => {
        console.warn('Claude API live synthesis error:', aiErr.message);
      })
      .finally(() => {
        isAiAnalyzingGlobal = false;
      });

    return;
>>>>>>> ExelData
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};


export const getSyncedEmployees = (req, res) => {
  const { all, prompt } = req.query;
  const p = prompt !== undefined ? prompt : activeAdminPrompt;
  const list = all === 'true'
    ? allSyncedEmployees
    : filterEmployeesByPrompt(allSyncedEmployees, p, activeCustomRules);

  res.json({
    status: 'success',
    count: list.length,
    totalCount: allSyncedEmployees.length,
    activePrompt: activeAdminPrompt,
    customRules: activeCustomRules,
    data: list,
    allEmployees: allSyncedEmployees
  });
};

export const getEnterpriseAnalytics = (req, res) => {
  res.json({
    status: 'success',
    data: cachedEnterpriseAnalytics
  });
};

export const getCachedEnterpriseAnalytics = () => cachedEnterpriseAnalytics;
export const getCachedSyncedEmployees = () => cachedSyncedEmployees;
export const getAllSyncedEmployees = () => allSyncedEmployees;
export const getCachedLatestAnalysis = () => latestAnalysis;
export const getUploadedFilesStore = () => uploadedFilesStore;
export const getActiveAdminPrompt = () => activeAdminPrompt;
export const getActiveCustomRules = () => activeCustomRules;
