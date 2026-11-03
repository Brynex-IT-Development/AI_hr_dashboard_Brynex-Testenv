import {
  getUploadedFilesStore,
  getCachedSyncedEmployees,
  getCachedLatestAnalysis,
  getCachedEnterpriseAnalytics
} from './hrController.js';
import { extractDatasetTelemetry } from '../services/aiDocumentAnalyzerService.js';
import { queryEmployeeData, formatQueryResultForAi } from '../services/employeeDataQueryService.js';
import { fetchEmployeeOverview, fetchStoreOverview } from '../services/externalIntegrationService.js';

// AI Controller - Human Executive Workforce & HR Advisory Partner Persona
const DEFAULT_SYSTEM_PROMPT = `You are the Senior Workforce Advisor & Chief People Intelligence Partner at Brynex.
You communicate with the warmth, strategic depth, empathy, and professional composure of a senior human HR consultant, seasoned People Officer, and trusted executive workforce advisor.

CRITICAL COMMUNICATION GUIDELINES:
1. HUMAN TONE: Speak naturally, conversationally, and collegially in the first person ("I recommend...", "Looking at our workforce numbers...", "Here is my advice on this department...").
2. ABSOLUTELY NO ROBOTIC PHRASES: Never say "As an AI...", "I am an artificial intelligence...", "As a language model...", or include robotic disclaimers. Speak like a senior human peer in the room.
3. EMPATHETIC YET COMMERCIALLY SHARP: Balance organizational empathy (employee burnout, retention, workplace morale, career pathing) with practical business realities (labor costs, overtime efficiency, revenue targets, operational stability).
4. CLEAR EXECUTIVE STRUCTURING: Provide structured, insightful answers using clean formatting, bold takeaways, and clear bullet points where helpful. Avoid clinical database dumps—synthesize observations into actionable management guidance.
5. CHAT PRESENTATION: Write clean, executive-friendly responses suited for a conversational chat widget. Do NOT use giant document-level title hashes (never start with '# Document Title' or '---' dividers). Use concise sub-headings, clear bullet points, and bold metrics for fast scanning.`;

const CLAUDE_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-haiku-5-5',
  'claude-opus-4-6'
];

const OPENROUTER_FALLBACK_MODELS = [
  'liquid/lfm-2.5-2.6b:free',
  'google/gemma-4-26b-a4b-it:free',
  'thinkingmachines/inkling:free',
  'nvidia/nemotron-3.5-lightning:free'
];

/**
 * Helper to call Anthropic Claude API
 */
async function callClaude({ apiKey, model, messages, systemPrompt, temperature = 0.7 }) {
  // Anthropic requires system prompt at the top-level 'system' property
  const system = systemPrompt || DEFAULT_SYSTEM_PROMPT;

  // Filter messages to strictly alternate or keep 'user' and 'assistant' roles
  const anthropicMessages = [];
  messages.forEach((msg) => {
    const role = msg.role === 'assistant' || msg.sender === 'assistant' ? 'assistant' : 'user';
    const content = msg.content || msg.text || '';
    if (!content.trim()) return;

    // Ensure we don't send consecutive identical roles
    if (anthropicMessages.length > 0 && anthropicMessages[anthropicMessages.length - 1].role === role) {
      anthropicMessages[anthropicMessages.length - 1].content += `\n\n${content}`;
    } else {
      anthropicMessages.push({ role, content });
    }
  });

  // Ensure first message is user
  if (anthropicMessages.length === 0 || anthropicMessages[0].role !== 'user') {
    anthropicMessages.unshift({ role: 'user', content: 'Hello assistant.' });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system,
      messages: anthropicMessages,
      temperature: typeof temperature === 'number' ? Math.min(Math.max(temperature, 0), 1) : 0.7
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.error?.message || `Anthropic request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  const text = data.content?.[0]?.text || '';
  return {
    content: text,
    model: data.model || model,
    provider: 'Anthropic Claude',
    usage: data.usage
  };
}

/**
 * Helper to call OpenRouter API
 */
async function callOpenRouter({ apiKey, model, messages, systemPrompt, temperature = 0.7 }) {
  const conversation = [{ role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT }];
  messages.forEach((msg) => {
    conversation.push({
      role: msg.role || (msg.sender === 'user' ? 'user' : 'assistant'),
      content: msg.content || msg.text || ''
    });
  });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Brynex AI Business Brain'
    },
    body: JSON.stringify({
      model: model || process.env.OPENROUTER_MODEL || 'liquid/lfm-2.5-2.6b:free',
      messages: conversation,
      temperature: typeof temperature === 'number' ? temperature : 0.7
    })
  });

  const data = await response.json();
  if (!response.ok || !data.choices || data.choices.length === 0) {
    throw new Error(data.error?.message || `OpenRouter request failed with status ${response.status}`);
  }

  return {
    content: data.choices[0].message?.content || '',
    model: data.model || model,
    provider: 'OpenRouter AI',
    usage: data.usage
  };
}

/**
 * Perform chat completion with Claude (Primary) with OpenRouter fallback
 */
export const chatWithAi = async (req, res) => {
  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (!anthropicKey && !openrouterKey) {
      return res.status(500).json({
        success: false,
        error: 'No AI API key (Anthropic or OpenRouter) is configured in backend environment.'
      });
    }

    const { messages = [], prompt, model, systemPrompt, temperature = 0.7 } = req.body;

    // Normalize messages format
    const normalizedMessages = [];
    if (Array.isArray(messages) && messages.length > 0) {
      messages.forEach((msg) => {
        normalizedMessages.push({
          role: msg.role || (msg.sender === 'user' ? 'user' : 'assistant'),
          content: msg.content || msg.text || ''
        });
      });
    } else if (prompt) {
      normalizedMessages.push({
        role: 'user',
        content: prompt
      });
    }

    // Build context-aware system prompt grounded in live API telemetry and dual-layer state
    let dynamicDataContext = '';
    try {
      const uploadedFiles = getUploadedFilesStore();
      const latestAnalysis = getCachedLatestAnalysis();
      const syncedEmployees = getCachedSyncedEmployees();
      const enterpriseAnalytics = getCachedEnterpriseAnalytics();

      // 1. Deep Uploaded Dataset Telemetry (statistical distributions, departments, notices, overtime)
      let filesTelemetryContext = '';
      if (uploadedFiles && uploadedFiles.length > 0) {
        try {
          const telemetryProfiles = extractDatasetTelemetry(uploadedFiles);
          if (telemetryProfiles && telemetryProfiles.length > 0) {
            filesTelemetryContext = telemetryProfiles.map((p) => `
• DATASET "${p.fileName}" TELEMETRY PROFILE (${p.totalRows} records):
  - Columns: ${(p.columns || []).join(', ')}
  - Categorical Distributions: ${JSON.stringify(p.categoricalSummary || {})}
  - Numeric Stats (Averages, Min/Max): ${JSON.stringify(p.numericSummary || {})}
  - Key Anomaly/Exit Records:
${(p.anomalyRows || []).slice(0, 6).map((r) => `    * ${JSON.stringify(r)}`).join('\n')}`).join('\n');
          }
        } catch (telemetryErr) {
          console.warn('Dataset telemetry extraction notice:', telemetryErr.message);
        }
      }

      // 2. Deterministic Row-Level Employee Dataset Query Layer
      let verifiedDatasetQueryContext = '';
      const empIdMatches = userText.match(/\b(emp[-_]?\d+|mgr[-_]?\d+)\b/gi);

      if (uploadedFiles && uploadedFiles.length > 0) {
        // A. Specific Employee ID lookups
        if (empIdMatches && empIdMatches.length > 0) {
          for (const rawId of empIdMatches) {
            for (const file of uploadedFiles) {
              const qRes = queryEmployeeData(file.parsedRows || [], {
                fileId: file.id,
                fileName: file.name,
                empId: rawId,
                includePii: false
              });
              if (qRes.matchedCount > 0) {
                verifiedDatasetQueryContext += formatQueryResultForAi(qRes) + '\n';
              }
            }
          }
        }

        // B. Probation / Confirmation Date / LWD / Resignation Queries
        const isProbationQuery = userText.includes('probation') || userText.includes('confirmation date') || userText.includes('confirmation') || userText.includes('confirm');
        const isLwdQuery = userText.includes('lwd') || userText.includes('last working') || userText.includes('resigned');
        const isChronologyQuery = userText.includes('chronology') || userText.includes('active with lwd') || userText.includes('doj');

        if (isProbationQuery || isLwdQuery || isChronologyQuery) {
          for (const file of uploadedFiles) {
            const isEmpFile = file.holds?.includes('Employee') || file.name.toLowerCase().includes('employee') || file.name.toLowerCase().includes('export');
            if (isEmpFile) {
              const qRes = queryEmployeeData(file.parsedRows || [], {
                fileId: file.id,
                fileName: file.name,
                status: isProbationQuery ? 'Probation' : null,
                hasConfirmationDate: isProbationQuery ? true : null,
                hasLwd: isLwdQuery ? true : null,
                checkChronology: true,
                includePii: false
              });
              if (qRes.verified) {
                verifiedDatasetQueryContext += formatQueryResultForAi(qRes) + '\n';
              }
            }
          }
        }
      } else if (empIdMatches && empIdMatches.length > 0) {
        // Explicitly notify assistant that raw dataset is unavailable so it does not guess
        verifiedDatasetQueryContext += formatQueryResultForAi({
          verified: false,
          message: 'No uploaded raw employee dataset available to verify requested employee facts.'
        }) + '\n';
      }

      // 3. Query Entity Matcher (Deep lookups for any mentioned employee or store in LMS API)
      const userText = normalizedMessages.map((m) => m.content || '').join(' ').toLowerCase();
      let matchedEntitiesContext = '';

      // Check if user mentioned specific employees (e.g. EMP93, Niyas, Akhila, Emp390, etc.)
      if (syncedEmployees && syncedEmployees.length > 0) {
        const matchedEmps = syncedEmployees.filter((e) => {
          const id = (e.empId || e.EmpId || e.id || '').toLowerCase();
          const name = (e.name || '').toLowerCase();
          if (id && userText.includes(id)) return true;
          if (name && name.length > 3) {
            const parts = name.split(' ').filter((p) => p.length > 3);
            return parts.some((p) => userText.includes(p));
          }
          return false;
        }).slice(0, 3);

        for (const me of matchedEmps) {
          try {
            const empDetail = await fetchEmployeeOverview({ empId: me.empId || me.id });
            if (empDetail && empDetail.data) {
              const d = empDetail.data;
              matchedEntitiesContext += `
SPECIFIC EMPLOYEE 360 PROFILE FOR "${d.summary?.name || me.name}" (${d.summary?.empId || me.empId}):
- Designation: ${d.summary?.designation || me.designation || 'Staff'}, Department: ${d.summary?.department || me.department || 'Sales'}
- Working Branch: ${d.summary?.workingBranch || me.workingBranch || 'Store Network'} (locCode: ${d.summary?.locCode || 'N/A'})
- Email: ${d.summary?.email || 'N/A'}, Phone: ${d.profile?.user?.phoneNumber || 'N/A'}
- Learning & Certifications: ${JSON.stringify(d.learning?.assessmentAttempts || d.learning?.trainingProgress || [])}
- Walk-ins & Consultations Handled: ${d.operations?.walkinsHandledCount || 0}
- Recent Walk-in Customer Interactions: ${(d.operations?.walkinsHandled || []).slice(0, 4).map((w) => `${w.customerName || 'Customer'} (${w.status || 'Resolved'}: ${w.remarks || w.lossReason || w.outcome || 'Handled'})`).join('; ')}
- Assigned Store Tasks: ${(d.tasks?.assignedTasks || []).map((t) => `${t.title} [${t.status}, Priority: ${t.priority}]`).join('; ')}
- Sales Targets: ${JSON.stringify(d.salesAttributions?.targets || [])}
`;
            }
          } catch (empErr) {
            console.warn('Employee 360 lookup notice:', empErr.message);
          }
        }
      }

      // Check if user mentioned specific store (e.g. Perinthalmanna, Edappally, Kottayam, 102, 709, etc.)
      const branches = latestAnalysis?.storesSummary?.branches || [];
      const matchedBranch = branches.find((b) => {
        const code = String(b.locCode || '').toLowerCase();
        const name = String(b.name || '').toLowerCase();
        if (code && userText.includes(code)) return true;
        if (name && name.length > 3 && userText.includes(name)) return true;
        return false;
      });

      if (matchedBranch) {
        try {
          const storeDetail = await fetchStoreOverview({ locCode: matchedBranch.locCode });
          if (storeDetail && storeDetail.data) {
            const sd = storeDetail.data;
            matchedEntitiesContext += `
DEEP STORE 360 OPERATIONAL TELEMETRY FOR "${matchedBranch.name}" (locCode: ${matchedBranch.locCode}):
- Location: ${sd.summary?.location || 'N/A'}, Manager: ${sd.summary?.manager || 'N/A'}
- Total Staff Count: ${sd.summary?.totalStaffCount || matchedBranch.staffCount || 0}, Active Walk-ins Logged: ${sd.summary?.totalWalkinsLogged || matchedBranch.walkinsCount || 0}
- Camera Audits: ${(sd.operations?.cameraAudits || []).map((ca) => `Date: ${ca.date}, Footfall: ${ca.footfallCount}, Discrepancies: ${ca.discrepancyCount}, Notes: "${ca.notes}"`).join('; ')}
- Branch Quality Audits: ${(sd.operations?.branchAudits || []).map((ba) => `Score: ${ba.auditScore}%, Auditor: ${ba.auditor}, Observations: "${ba.observations}"`).join('; ')}
- Active Store Tasks: ${(sd.operations?.storeTasks || []).map((st) => `Task: ${st.title} (Status: ${st.status}, Assigned: ${st.assignedTo || st.owner}, Priority: ${st.priority}, Due: ${st.dueDate || st.deadline})`).join('; ')}
- Staff Roster at this branch: ${(sd.staff?.users || []).slice(0, 8).map((u) => `${u.username || u.name} (${u.empID || u.EmpId || 'N/A'} - ${u.designation || 'Staff'})`).join(', ')}
`;
          }
        } catch (stErr) {
          console.warn('Store 360 lookup notice:', stErr.message);
        }
      }

      dynamicDataContext = `
--- BRYNEX ONE AI PERSISTENT RETAIL & WORKFORCE TELEMETRY (LIVE INGESTION ACTIVE) ---
OPERATIONAL PHILOSOPHY:
• Diagnose root causes before recommending action.
• Distinguish between people issues, traffic issues, and target design issues.
• Ground every answer in specific facts, figures, and verified telemetry from the connected APIs and datasets.

CURRENT AGGREGATED ENTERPRISE STATUS:
- HR Health Score: ${latestAnalysis?.healthScore || 'N/A'} (${latestAnalysis?.healthStatus || 'No Data'})
- Total Active Employees Monitored: ${syncedEmployees?.length || 0} across retail stores & operational units
- Enterprise Sales Pipeline: ${enterpriseAnalytics?.sales?.formattedRevenue || 'N/A'}
- Payroll to Revenue Ratio: ${enterpriseAnalytics?.finance?.payrollRatio || 'N/A'} (Target: ${enterpriseAnalytics?.finance?.targetRatio || '12.0%'})
- Open Audit Discrepancies: ${enterpriseAnalytics?.operations?.openDiscrepancies || 0}
- In-Progress Operations Tasks: ${enterpriseAnalytics?.operations?.inProgressTasks || 0}

CONNECTED RETAIL NETWORK STORES (${latestAnalysis?.storesSummary?.branches?.length || 0} active locations):
${(latestAnalysis?.storesSummary?.branches || []).map((b, idx) => `
${idx + 1}. ${b.name || 'Store'} (locCode: ${b.locCode || 'N/A'}):
   - Monthly Target: ₹${(b.monthlyTarget || 0).toLocaleString()}
   - Actual Net Sales: ₹${(b.netSales || 0).toLocaleString()} (${b.quotaAttainment || 'N/A'})
   - Staff Count: ${b.staffCount || 0}
   - Logged Footfall: ${b.footfall || 0}
   - Walk-ins Count: ${b.walkinsCount || 0}
   - Audit Score: ${b.auditScore != null ? `${b.auditScore}%` : 'N/A'}
`).join('')}

ACTIVE MANAGEMENT ATTENTION ITEMS (${latestAnalysis?.attentionItems?.length || 0} detected):
${(latestAnalysis?.attentionItems || []).map((it, idx) => `
${idx + 1}. [${it.category}] ${it.title}:
   - Source: ${it.sourceFile || 'Connected Dataset'}
   - Description: ${it.description || 'N/A'}
   - Confidence: ${it.confidence || 'N/A'}
`).join('')}

CONNECTED INGESTED DATASETS (${uploadedFiles && uploadedFiles.length > 0 ? uploadedFiles.length : 0} file(s)):
${filesTelemetryContext || (uploadedFiles && uploadedFiles.length > 0 ? uploadedFiles.map((f) => `• "${f.name}" (${f.rows} rows, holds: ${f.holds})`).join('\n') : 'No uploaded files. Operating on live synced store data.')}

${verifiedDatasetQueryContext ? verifiedDatasetQueryContext : ''}
${matchedEntitiesContext ? `--- REAL-TIME DEEP ENTITY 360 TELEMETRY ---\n${matchedEntitiesContext}` : ''}
---------------------------------------------------------------------------------
BEHAVIOR & REASONING RULES:
1. DATA-GROUNDED EXECUTIVE ADVICE: When asked questions about workforce numbers, shifts, employees, attendance, rest turnaround intervals, overtime, payroll, or specific branches/roles, analyze the actual records and metrics above.
2. ROOT CAUSE PRINCIPLE: Always distinguish between people issues, traffic issues, and target design issues based on actual store footfall, conversion, and quota metrics from the data above.
3. CHAT-FRIENDLY SCANABILITY: Format responses for high readability in a compact chat window. Use clean bullet points, bold key numbers/names, and concise subheadings. Avoid giant '#' document headers or unnecessary '---' horizontal rules.
`;
    } catch (dataErr) {
      console.warn('Could not compile dataset context for chat:', dataErr.message);
    }

    const effectiveSystemPrompt = systemPrompt
      ? `${systemPrompt}\n\n${dynamicDataContext}`
      : `${DEFAULT_SYSTEM_PROMPT}\n\n${dynamicDataContext}`;

    const isClaudeModelRequested = model && (model.startsWith('claude') || model.includes('anthropic'));
    const preferClaude = !!anthropicKey && (process.env.AI_PROVIDER === 'anthropic' || isClaudeModelRequested || !openrouterKey);

    // 1. Try Anthropic Claude if configured
    if (anthropicKey && (preferClaude || isClaudeModelRequested)) {
      const claudeCandidates = [];
      if (model && model.startsWith('claude')) claudeCandidates.push(model);
      if (process.env.ANTHROPIC_MODEL && !claudeCandidates.includes(process.env.ANTHROPIC_MODEL)) {
        claudeCandidates.push(process.env.ANTHROPIC_MODEL);
      }
      CLAUDE_MODELS.forEach((m) => {
        if (!claudeCandidates.includes(m)) claudeCandidates.push(m);
      });

      let claudeError = null;
      for (const targetModel of claudeCandidates) {
        try {
          const result = await callClaude({
            apiKey: anthropicKey,
            model: targetModel,
            messages: normalizedMessages,
            systemPrompt: effectiveSystemPrompt,
            temperature
          });

          return res.json({
            success: true,
            message: result.content,
            model: result.model,
            provider: 'Anthropic Claude',
            usage: result.usage
          });
        } catch (err) {
          claudeError = err.message;
          console.warn(`Claude attempt with ${targetModel} failed: ${err.message}. Trying next option...`);
        }
      }

      console.warn('All Claude model attempts failed. Fallback to OpenRouter if available:', claudeError);
    }

    // 2. OpenRouter fallback or primary
    if (openrouterKey) {
      const orCandidates = [];
      if (model && !model.startsWith('claude')) orCandidates.push(model);
      if (process.env.OPENROUTER_MODEL && !orCandidates.includes(process.env.OPENROUTER_MODEL)) {
        orCandidates.push(process.env.OPENROUTER_MODEL);
      }
      OPENROUTER_FALLBACK_MODELS.forEach((m) => {
        if (!orCandidates.includes(m)) orCandidates.push(m);
      });

      let orError = null;
      for (const targetModel of orCandidates) {
        try {
          const result = await callOpenRouter({
            apiKey: openrouterKey,
            model: targetModel,
            messages: normalizedMessages,
            systemPrompt: effectiveSystemPrompt,
            temperature
          });

          return res.json({
            success: true,
            message: result.content,
            model: result.model,
            provider: 'OpenRouter AI',
            usage: result.usage
          });
        } catch (err) {
          orError = err.message;
          console.warn(`OpenRouter model ${targetModel} failed: ${err.message}.`);
        }
      }
    }

    // If all real AI models failed or unavailable, return genuine error (no hardcoded/mock text)
    return res.status(502).json({
      success: false,
      error: claudeError || 'AI synthesis service unavailable. Please check your Anthropic API connection.'
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while processing AI request.'
    });
  }
};

/**
 * Check AI status and verify token validity (Claude primary, OpenRouter secondary)
 */
export const getAiStatus = async (req, res) => {
  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (!anthropicKey && !openrouterKey) {
      return res.json({
        connected: false,
        status: 'missing_key',
        message: 'No Anthropic or OpenRouter API key found in configuration.'
      });
    }

    // Check Anthropic Claude first
    if (anthropicKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/models', {
          method: 'GET',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          }
        });

        if (response.ok) {
          const modelsData = await response.json();
          const activeModels = (modelsData.data || [])
            .map((m) => ({ id: m.id, name: m.display_name || m.id, provider: 'Anthropic' }))
            .slice(0, 6);

          return res.json({
            connected: true,
            provider: 'Anthropic Claude',
            status: 'active',
            defaultModel: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
            availableModels: activeModels.length > 0 ? activeModels : [
              { id: 'claude-haiku-4-5-20251001', name: 'Claude 4.5 Haiku', provider: 'Anthropic' },
              { id: 'claude-sonnet-4-6', name: 'Claude 4.6 Sonnet', provider: 'Anthropic' },
              { id: 'claude-haiku-5-5', name: 'Claude 5.5 Haiku', provider: 'Anthropic' }
            ]
          });
        }
      } catch (err) {
        console.warn('Anthropic status check error:', err.message);
      }
    }

    // Fallback to OpenRouter verification
    if (openrouterKey) {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${openrouterKey}` }
      });

      const keyData = await response.json();
      if (response.ok) {
        return res.json({
          connected: true,
          provider: 'OpenRouter AI',
          status: 'active',
          defaultModel: process.env.OPENROUTER_MODEL || 'liquid/lfm-2.5-2.6b:free',
          availableFallbacks: OPENROUTER_FALLBACK_MODELS,
          data: keyData.data
        });
      }
    }

    return res.json({
      connected: false,
      status: 'invalid_key',
      error: 'Failed to authenticate with configured AI provider.'
    });
  } catch (error) {
    return res.status(500).json({
      connected: false,
      status: 'error',
      error: error.message
    });
  }
};

/**
 * Analyze workforce metrics / issue with AI
 */
export const analyzeWorkforce = async (req, res) => {
  const { title, description, category, metrics } = req.body;
  const prompt = `Please provide a fast executive intelligence analysis for the following workforce issue:
Category: ${category || 'HR Operations'}
Issue Title: ${title || 'Workforce Metric Anomaly'}
Description: ${description || 'Unspecified'}
Metrics context: ${JSON.stringify(metrics || {})}

Provide:
1. Root cause synthesis
2. Immediate operational risk level
3. 3 concrete action recommendations with estimated impact.`;

  req.body.prompt = prompt;
  return chatWithAi(req, res);
};

/**
 * Left-Brain AI Diagnosis: Evaluates Root Causes with Confidence Ratings
 */
export const diagnoseHrIssue = async (req, res) => {
  const { title, description, category, metrics } = req.body;

  const prompt = `You are the Left Brain HR Management Intelligence Engine for Brynex One AI.
Apply the Left-Brain diagnostic framework to identify root causes for this workforce issue:
Issue: "${title}"
Category: "${category || 'HR Operations'}"
Details: "${description || 'Workforce variance detected'}"
Telemetry Context: ${JSON.stringify(metrics || {})}

Evaluate against standard diagnostic questions:
- Is performance decline due to attendance, shift overlap, traffic drop, stock availability, manager conflict, or unrealistic target?
- Is payroll ratio increase due to revenue drop, overtime concentration, or excess staffing?

Return your analysis in valid JSON format with this exact structure:
{
  "summary": "Short 1-2 sentence executive diagnosis",
  "rootCauses": [
    {
      "title": "Cause Title (e.g. Concentrated Overtime in Peak Shifts)",
      "description": "Specific explanation cross-referencing telemetry.",
      "confidence": "High Confidence",
      "evidence": "Data point supporting this"
    },
    {
      "title": "Second Cause Title",
      "description": "Explanation.",
      "confidence": "Medium Confidence",
      "evidence": "Data point supporting this"
    },
    {
      "title": "Third Cause Title",
      "description": "Explanation.",
      "confidence": "Low Confidence",
      "evidence": "Data point supporting this"
    }
  ]
}
Return ONLY valid JSON. No surrounding markdown backticks or commentary.`;

  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    let content = '';
    let usedModel = '';

    if (anthropicKey) {
      const result = await callClaude({
        apiKey: anthropicKey,
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: 'You are an enterprise AI workforce intelligence diagnostic engine. Always respond in pure valid JSON.',
        temperature: 0.2
      });
      content = result.content;
      usedModel = result.model;
    } else if (process.env.OPENROUTER_API_KEY) {
      const result = await callOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'liquid/lfm-2.5-2.6b:free',
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: 'You are an enterprise AI workforce intelligence diagnostic engine. Always respond in pure valid JSON.',
        temperature: 0.2
      });
      content = result.content;
      usedModel = result.model;
    }

    // Attempt JSON parse
    let parsed;
    try {
      const clean = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('Failed to parse AI diagnosis JSON:', e.message, content);
      return res.status(500).json({ success: false, error: 'AI diagnosis returned invalid JSON format. Please retry.' });
    }

    return res.json({ success: true, data: parsed, model: usedModel });
  } catch (err) {
    console.error('HR Diagnosis error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Layer 6 Decision Engine: Generates Option A, Option B, Option C
 */
export const generateDecisionOptions = async (req, res) => {
  const { title, description } = req.body;

  const prompt = `You are the Layer 6 Decision Engine for Brynex One AI.
Generate 3 distinct, structured decision options (Option A, Option B, Option C) for this workforce issue:
Issue: "${title}"
Details: "${description}"

Strict rules from Product Architecture Layer 6:
- Option A: Growth / Upside oriented (higher investment/upside)
- Option B: Cost Optimization / Roster efficiency (minimal investment, low risk)
- Option C: Balanced Turnaround / Combined approach

Return your response in valid JSON format with this exact structure:
{
  "options": [
    {
      "id": "opt-a",
      "badge": "Option A - Revenue Growth",
      "title": "Clear action title",
      "description": "Specific operational steps",
      "impact": "Potential +$24k revenue / month",
      "effort": "Medium",
      "risk": "Medium Risk",
      "cost": "Moderate"
    },
    {
      "id": "opt-b",
      "badge": "Option B - Cost Optimisation",
      "title": "Clear action title",
      "description": "Specific operational steps",
      "impact": "Save $14.2k/month in overtime",
      "effort": "Low",
      "risk": "Low Risk",
      "cost": "Minimal"
    },
    {
      "id": "opt-c",
      "badge": "Option C - Combined Turnaround",
      "title": "Clear action title",
      "description": "Specific operational steps",
      "impact": "EBITDA improvement $18k/month",
      "effort": "High",
      "risk": "Medium Risk",
      "cost": "Low"
    }
  ]
}
Return ONLY valid JSON. No surrounding markdown backticks.`;

  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    let content = '';
    let usedModel = '';

    if (anthropicKey) {
      const result = await callClaude({
        apiKey: anthropicKey,
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: 'You are the Brynex One AI Layer 6 Decision Engine. Always respond in pure valid JSON.',
        temperature: 0.2
      });
      content = result.content;
      usedModel = result.model;
    } else if (process.env.OPENROUTER_API_KEY) {
      const result = await callOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'liquid/lfm-2.5-2.6b:free',
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: 'You are the Brynex One AI Layer 6 Decision Engine. Always respond in pure valid JSON.',
        temperature: 0.2
      });
      content = result.content;
      usedModel = result.model;
    }

    let parsed;
    try {
      const clean = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('Failed to parse AI options JSON:', e.message, content);
      return res.status(500).json({ success: false, error: 'AI decision generator returned invalid JSON format. Please retry.' });
    }

    return res.json({ success: true, data: parsed, model: usedModel });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
