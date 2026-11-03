import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import botLogo from '../assets/bot-logo.png';
import bannerImg from '../assets/banner-illustration.png';
import {
  Settings,
  Calendar,
  Download,
  TrendingUp,
  ArrowUpRight,
  ArrowDown,
  AlertTriangle,
  FileText,
  Clock,
  User,
  Activity,
  Building2,
  ShieldAlert,
  Target,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Search,
  Filter,
  Users,
  Network,
  AppWindow,
  UserCheck,
  BarChart2,
  ClipboardList,
  Wallet,
  AlertCircle,
  Info,
  X,
  Send,
  Play,
  RotateCw,
  Cpu,
  BrainCircuit,
  Check,
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  ExternalLink,
  Copy,
  UserPlus,
  Coins
} from 'lucide-react';
import {
  diagnoseHrIssue,
  generateDecisionOptions,
  deployActionPlan
} from '../services/aiService';
import FormattedChatMessage from '../components/FormattedChatMessage';
import './HrIntelligence.css';

// ChatGPT & Claude inspired Human Skeleton Loaders
function SkeletonBlock({ width = '100%', height = '16px', borderRadius = '6px', style = {} }) {
  return (
    <div
      className="human-skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
}

function SkeletonKpiCard() {
  return (
    <div className="hr-kpi-card human-skeleton-card">
      <div className="hr-kpi-top">
        <SkeletonBlock width="26px" height="26px" borderRadius="7px" />
        <SkeletonBlock width="80px" height="12px" />
      </div>
      <div style={{ marginTop: '14px', marginBottom: '10px' }}>
        <SkeletonBlock width="55px" height="26px" borderRadius="4px" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <SkeletonBlock width="110px" height="11px" />
      </div>
    </div>
  );
}

function SkeletonIssueCard() {
  return (
    <div className="hr-issue-card human-skeleton-card" style={{ cursor: 'default' }}>
      <div className="hr-issue-card-top" style={{ marginBottom: '10px' }}>
        <SkeletonBlock width="70px" height="20px" borderRadius="999px" />
        <SkeletonBlock width="90px" height="18px" borderRadius="6px" />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <SkeletonBlock width="85%" height="16px" borderRadius="4px" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        <SkeletonBlock width="100%" height="12px" />
        <SkeletonBlock width="65%" height="12px" />
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <SkeletonBlock width="75px" height="13px" />
        <SkeletonBlock width="65px" height="13px" />
        <SkeletonBlock width="70px" height="13px" />
      </div>
    </div>
  );
}

function SkeletonDetailCard() {
  return (
    <div className="hr-detail-card human-skeleton-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <SkeletonBlock width="85px" height="28px" borderRadius="8px" />
        <SkeletonBlock width="120px" height="24px" borderRadius="6px" />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <SkeletonBlock width="70%" height="22px" borderRadius="5px" />
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '22px' }}>
        <SkeletonBlock width="95px" height="14px" />
        <SkeletonBlock width="110px" height="14px" />
        <SkeletonBlock width="85px" height="14px" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '22px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <SkeletonBlock width="60px" height="11px" style={{ marginBottom: '8px' }} />
            <SkeletonBlock width="45px" height="20px" style={{ marginBottom: '6px' }} />
            <SkeletonBlock width="75px" height="10px" />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: '18px' }}>
        <SkeletonBlock width="120px" height="15px" style={{ marginBottom: '10px' }} />
        <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
          <SkeletonBlock width="90%" height="13px" style={{ marginBottom: '6px' }} />
          <SkeletonBlock width="75%" height="13px" />
        </div>
      </div>
      <div>
        <SkeletonBlock width="130px" height="15px" style={{ marginBottom: '10px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
            <SkeletonBlock width="40%" height="14px" style={{ marginBottom: '8px' }} />
            <SkeletonBlock width="85%" height="12px" />
          </div>
          <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
            <SkeletonBlock width="35%" height="14px" style={{ marginBottom: '8px' }} />
            <SkeletonBlock width="80%" height="12px" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HrIntelligence() {
  const navigate = useNavigate();
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('Overview');
  const [dateRange, setDateRange] = useState('01-30 Sep 2026');
  const [aiQuery, setAiQuery] = useState('');

  // Floating AI Chat Copilot popup
  const [showChatPopup, setShowChatPopup] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: 'Hello! I am your Brynex AI Workforce Intelligence Copilot powered by Claude. Ask me about your workforce metrics, shift rosters, or labor expenditure.'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Live dynamic analysis state from uploaded dataset (null if no data or API error)
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Live API Telemetry Prompt Controls
  const [apiPromptInput, setApiPromptInput] = useState('');
  const [activeApiPrompt, setActiveApiPrompt] = useState('');
  const [isSubmittingPrompt, setIsSubmittingPrompt] = useState(false);

  // Left-Brain AI Diagnosis State
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [revealedCausesByIssue, setRevealedCausesByIssue] = useState({});

  // Layer 6 Decision Engine Options State
  const [isGeneratingOptions, setIsGeneratingOptions] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [revealedOptionsByIssue, setRevealedOptionsByIssue] = useState({});

  // Layer 7 Action Execution State
  const [actionOwner, setActionOwner] = useState('HR Director');
  const [actionDeadline, setActionDeadline] = useState('14 Days (Recommended)');
  const [actionKpi, setActionKpi] = useState('Optimize Schedule & Retention');
  const [deploymentSuccess, setDeploymentSuccess] = useState(false);
  const [brynexOneSuccess, setBrynexOneSuccess] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);
  const [showDescriptionPreview, setShowDescriptionPreview] = useState(false);

  const fetchAnalysis = async (isBackgroundPoll = false) => {
    try {
      if (!isBackgroundPoll) setIsLoadingAnalysis(true);
      setAnalysisError(null);
      const res = await fetch('/api/hr/analysis');
      if (!res.ok) {
        throw new Error(`API Error ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      if (json.status === 'success') {
        setLiveAnalysis(json.data || null);
        setIsAiAnalyzing(Boolean(json.isAiAnalyzing));
        const systemLabels = [
          'Autonomous Analysis',
          'Autonomous Multi-Dataset Synthesis',
          'Live External Retail LMS API Telemetry',
          'File Ingestion Synthesis',
          'Live Retail LMS API Ingestion'
        ];
        if (json.activePrompt) {
          setActiveApiPrompt(json.activePrompt);
        } else if (json.data?.adminPromptApplied && !systemLabels.includes(json.data.adminPromptApplied)) {
          setActiveApiPrompt(json.data.adminPromptApplied);
        } else {
          setActiveApiPrompt('');
        }
        if (json.data?.reportingPeriod) {
          setDateRange(json.data.reportingPeriod);
        }
        if (json.data?.attentionItems && json.data.attentionItems.length > 0) {
          setSelectedIssueId((prev) => {
            if (prev && json.data.attentionItems.some((item) => item.id === prev)) {
              return prev;
            }
            return json.data.attentionItems[0].id;
          });
        } else {
          setSelectedIssueId(null);
        }
      } else {
        throw new Error(json.message || 'API Error: Failed to fetch live HR intelligence');
      }
    } catch (err) {
      console.error('Could not load live HR analysis:', err);
      setAnalysisError(err.message || 'API Connection Error');
      setLiveAnalysis(null);
      setSelectedIssueId(null);
    } finally {
      if (!isBackgroundPoll) setIsLoadingAnalysis(false);
    }
  };

  // Submit custom AI prompt on live API telemetry
  const handleApplyApiPrompt = async (promptToApply = apiPromptInput) => {
    const p = (promptToApply || '').trim();
    setIsSubmittingPrompt(true);
    try {
      const res = await fetch('/api/hr/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPrompt: p })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setActiveApiPrompt(p);
        setApiPromptInput(p);
        setLiveAnalysis(json.data || null);
        setIsAiAnalyzing(Boolean(json.isAiAnalyzing));
        if (json.data?.attentionItems && json.data.attentionItems.length > 0) {
          setSelectedIssueId(json.data.attentionItems[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to analyze API telemetry with prompt:', err);
      alert('Error analyzing API telemetry with prompt.');
    } finally {
      setIsSubmittingPrompt(false);
    }
  };

  // Reset to default unprompted API baseline
  const handleResetApiPrompt = async () => {
    setIsSubmittingPrompt(true);
    try {
      const res = await fetch('/api/hr/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPrompt: '' })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setActiveApiPrompt('');
        setApiPromptInput('');
        setLiveAnalysis(json.data || null);
        setIsAiAnalyzing(Boolean(json.isAiAnalyzing));
        if (json.data?.attentionItems && json.data.attentionItems.length > 0) {
          setSelectedIssueId(json.data.attentionItems[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to reset prompt filter:', err);
    } finally {
      setIsSubmittingPrompt(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();

    const handleDataUpdate = () => {
      fetchAnalysis();
    };

    window.addEventListener('focus', fetchAnalysis);
    window.addEventListener('hr-data-updated', handleDataUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'hr_data_last_updated') {
        fetchAnalysis();
      }
    });

    return () => {
      window.removeEventListener('focus', fetchAnalysis);
      window.removeEventListener('hr-data-updated', handleDataUpdate);
      window.removeEventListener('storage', handleDataUpdate);
    };
  }, []);

  // Background polling while Claude AI is dynamically synthesizing in background
  useEffect(() => {
    let intervalId = null;
    if (isAiAnalyzing) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch('/api/hr/analysis');
          const json = await res.json();
          if (json.status === 'success') {
            setLiveAnalysis(json.data || null);
            setIsAiAnalyzing(Boolean(json.isAiAnalyzing));
            if (!json.isAiAnalyzing && intervalId) {
              clearInterval(intervalId);
            }
          }
        } catch (e) {
          console.warn('Polling error:', e);
        }
      }, 2500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAiAnalyzing]);

  // Icon mapping for dynamic KPI tiles exactly matching screenshot
  const kpiIconMap = {
    issues: <User size={13} />,
    decisions: <Calendar size={13} />,
    monitored: <Calendar size={13} />,
    opportunities: <UserPlus size={13} />,
    productivity: <Coins size={13} />
  };

  // Resolve attention items strictly from genuine AI-analyzed items (must have valid title)
  const resolvedAttentionItems = (liveAnalysis?.attentionItems && Array.isArray(liveAnalysis.attentionItems))
    ? liveAnalysis.attentionItems.filter((i) => i && typeof i.title === 'string' && i.title.trim().length > 0)
    : [];

  const isWaitingForAi = isLoadingAnalysis || (isAiAnalyzing && resolvedAttentionItems.length === 0);

  const resolvedKpiMetrics = (liveAnalysis?.kpiMetrics && Array.isArray(liveAnalysis.kpiMetrics) && liveAnalysis.kpiMetrics.length > 0)
    ? liveAnalysis.kpiMetrics.map((kpi) => {
        let val = kpi.value;
        let trend = kpi.trend;
        if (kpi.id === 'issues') {
          val = String(resolvedAttentionItems.length);
<<<<<<< HEAD
          trend = resolvedAttentionItems.length > 0
            ? `${resolvedAttentionItems.length} active risks across datasets`
            : (isAiAnalyzing ? 'Synthesizing telemetry...' : 'No active risks logged');
        } else if (kpi.id === 'decisions') {
          val = String(resolvedAttentionItems.length);
          trend = resolvedAttentionItems.length > 0
            ? `${resolvedAttentionItems.length} management options ready for approval`
            : (isAiAnalyzing ? 'Synthesizing options...' : 'No pending decisions');
=======
          trend = resolvedAttentionItems.length > 0 ? `${resolvedAttentionItems.length} active risks` : 'No risks detected';
        } else if (kpi.id === 'decisions') {
          const decCount = resolvedAttentionItems.filter((i) => i.decisionOptions && i.decisionOptions.length > 0).length;
          val = String(decCount);
          trend = decCount > 0 ? `${decCount} ready for review` : 'No pending decisions';
        } else if (kpi.id === 'monitored') {
          val = kpi.value || '25';
          trend = kpi.trend || '25 retail stores synced';
        } else if (kpi.id === 'opportunities') {
          const oppCount = resolvedAttentionItems.filter((i) => i.category === 'Opportunity').length;
          val = String(oppCount);
          trend = oppCount > 0 ? `${oppCount} optimization areas` : 'Awaiting prompt';
        } else if (kpi.id === 'productivity') {
          val = kpi.value || '—';
          trend = kpi.trend || 'Target benchmark';
>>>>>>> ExelData
        }
        return {
          ...kpi,
          value: val,
          trend: trend,
          icon: kpiIconMap[kpi.id] || <Activity size={13} />
        };
      })
    : [
        { id: 'issues', title: 'Issues Detected', value: String(resolvedAttentionItems.length), trend: 'No risks detected', trendPositive: true, colorClass: 'hr-kpi-icon-purple', icon: <User size={13} /> },
        { id: 'decisions', title: 'Awaited Decisions', value: '0', trend: 'No pending decisions', trendPositive: true, colorClass: 'hr-kpi-icon-red', icon: <Calendar size={13} /> },
        { id: 'monitored', title: 'Being Monitored', value: '25', trend: '25 live stores synced', trendPositive: true, colorClass: 'hr-kpi-icon-green', icon: <Calendar size={13} /> },
        { id: 'opportunities', title: 'Opportunities', value: '0', trend: 'Awaiting prompt', trendPositive: true, colorClass: 'hr-kpi-icon-orange', icon: <UserPlus size={13} /> },
        { id: 'productivity', title: 'Avg. Productivity', value: '—', trend: 'Awaiting prompt', trendPositive: true, colorClass: 'hr-kpi-icon-blue', icon: <Coins size={13} /> }
      ];

  // Filter list
  const filteredItems = resolvedAttentionItems.filter((item) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Critical') return item.category === 'Critical';
    if (activeFilter === 'Need investigation') return item.category === 'Need investigation';
    if (activeFilter === 'Opportunity') return item.category === 'Opportunity';
    return true;
  });

  const selectedItem = resolvedAttentionItems.find((item) => String(item.id) === String(selectedIssueId)) || resolvedAttentionItems[0] || null;

  // Only show causes and options after user clicks the respective buttons!
  const isCausesRevealed = Boolean(selectedItem && revealedCausesByIssue[selectedItem.id] && revealedCausesByIssue[selectedItem.id].length > 0);
  const displayCauses = isCausesRevealed ? revealedCausesByIssue[selectedItem.id] : [];

  const isOptionsRevealed = Boolean(selectedItem && revealedOptionsByIssue[selectedItem.id] && revealedOptionsByIssue[selectedItem.id].length > 0);
  const displayOptions = isOptionsRevealed ? revealedOptionsByIssue[selectedItem.id] : [];
  const selectedOption = isOptionsRevealed ? (displayOptions.find((opt) => opt.id === selectedOptionId) || displayOptions[0] || null) : null;

  // Synchronize options selection when selected issue or revealed options change
  useEffect(() => {
    if (selectedItem) {
      const opts = revealedOptionsByIssue[selectedItem.id] || [];
      if (opts.length > 0) {
        setSelectedOptionId(opts[0].id);
      } else {
        setSelectedOptionId(null);
      }
      setDeploymentSuccess(false);
      setBrynexOneSuccess(false);
      setShowDescriptionPreview(false);
    }
  }, [selectedIssueId]);

  const handleExport = () => {
    alert('Exporting verified workforce intelligence report...');
  };

  const handleAskAi = async (e) => {
    e?.preventDefault();
    if (!aiQuery.trim()) return;

    const userText = aiQuery.trim();
    setAiQuery('');
    setShowChatPopup(true);

    const userMsg = { id: Date.now(), sender: 'user', text: userText };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const contextualPrompt = liveAnalysis
        ? `[Live Dataset Telemetry Context: Summary: ${liveAnalysis.attentionSummary || 'Active'} | Health Score: ${liveAnalysis.healthScore}% | Issues Detected: ${(liveAnalysis.attentionItems || []).map((i) => i.title).join('; ')}]\n\nUser Question: ${userText}`
        : userText;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: contextualPrompt })
      });
      const data = await res.json();
      const reply = data.success && data.message ? data.message : 'Telemetry synthesized. You can connect additional files in Data Management for deeper multi-source correlation.';
      setChatMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'assistant', text: reply }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'assistant', text: 'Error contacting AI assistant. Please verify your API key in Settings.' }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Trigger Left-Brain AI Diagnosis with Claude (reveals causes ONLY after clicking button)
  const handleRunAiDiagnosis = async () => {
    if (!selectedItem) return;
    setIsDiagnosing(true);
    try {
      const result = await diagnoseHrIssue(selectedItem);
      let causes = [];
      if (result && result.rootCauses && result.rootCauses.length > 0) {
        causes = result.rootCauses;
      } else if (selectedItem.possibleCauses && selectedItem.possibleCauses.length > 0) {
        causes = selectedItem.possibleCauses;
      }
      setRevealedCausesByIssue((prev) => ({ ...prev, [selectedItem.id]: causes }));
    } catch (err) {
      console.warn(`Diagnosis error: ${err.message}`);
      if (selectedItem.possibleCauses && selectedItem.possibleCauses.length > 0) {
        setRevealedCausesByIssue((prev) => ({ ...prev, [selectedItem.id]: selectedItem.possibleCauses }));
      }
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Trigger Decision Engine Options Generation with Claude (reveals options ONLY after clicking button)
  const handleRegenerateOptions = async () => {
    if (!selectedItem) return;
    setIsGeneratingOptions(true);
    try {
      const options = await generateDecisionOptions(selectedItem);
      let opts = [];
      if (options && options.length > 0) {
        opts = options;
      } else if (selectedItem.decisionOptions && selectedItem.decisionOptions.length > 0) {
        opts = selectedItem.decisionOptions;
      }
      setRevealedOptionsByIssue((prev) => ({ ...prev, [selectedItem.id]: opts }));
      if (opts.length > 0) {
        setSelectedOptionId(opts[0].id);
      }
    } catch (err) {
      console.warn(`Options generator error: ${err.message}`);
      if (selectedItem.decisionOptions && selectedItem.decisionOptions.length > 0) {
        setRevealedOptionsByIssue((prev) => ({ ...prev, [selectedItem.id]: selectedItem.decisionOptions }));
        setSelectedOptionId(selectedItem.decisionOptions[0].id);
      }
    } finally {
      setIsGeneratingOptions(false);
    }
  };

  // Generate complete, structured description for BrynexOne task creation
  const generateBrynexOneDescription = (option = selectedOption) => {
    if (!option || !selectedItem) return '';

    return [
      `🎯 MANAGEMENT ACTION PLAN: ${option.badge || 'Action'} - ${option.title || ''}`,
      `--------------------------------------------------`,
      `📌 ISSUE CONTEXT:`,
      `• Title: ${selectedItem.title || 'Workforce Issue'}`,
      `• Department: ${selectedItem.department || 'Retail Operations'}`,
      `• Store / Branch: ${selectedItem.branch || 'All Branches'}`,
      `• Priority: ${selectedItem.priority || 'High Priority'}`,
      `• Topic: ${selectedItem.topic || 'Workforce & Operational Risk'}`,
      selectedItem.confidence ? `• AI Confidence: ${selectedItem.confidence}` : '',
      ``,
      `💡 SELECTED DECISION DETAILS:`,
      `• Action: ${option.title || ''}`,
      `• Description: ${option.description || ''}`,
      option.impact ? `• Expected Impact: ${option.impact}` : '',
      ``,
      `📋 EXECUTION PARAMETERS:`,
      `• Action Owner: ${actionOwner || 'HR Director'}`,
      `• Target Deadline: ${actionDeadline || '14 Days (Recommended)'}`,
      `• KPI Alignment: ${actionKpi || 'Workforce Quota Attainment & Retention'}`,
      ``,
      `🔍 TELEMETRY & ROOT CAUSES:`,
      selectedItem.whatsHappening ? `• What's Happening: ${selectedItem.whatsHappening}` : '',
      selectedItem.evidence && selectedItem.evidence[0] ? `• Key Evidence: ${selectedItem.evidence[0].title} - ${selectedItem.evidence[0].desc}` : '',
      `--------------------------------------------------`,
      `Generated via AI HR Intelligence Dashboard • Brynex Business Brain`
    ].filter(Boolean).join('\n');
  };

  // Redirect to BrynexOne (/task/create) with all selected option data under description & fields
  const handleAssignBrynexOneTask = (option = selectedOption) => {
    if (!option || !selectedItem) return;

    const taskTitle = `[HR Intelligence] ${option.badge || 'Action'}: ${option.title || selectedItem.title}`;
    const descriptionText = generateBrynexOneDescription(option);

    const baseUrl = 'https://brynexone.brynex.com/task/create';
    const url = new URL(baseUrl);

    // Pass description under common keys so BrynexOne form picks it up in description section
    url.searchParams.set('description', descriptionText);
    url.searchParams.set('desc', descriptionText);
    url.searchParams.set('task_description', descriptionText);
    url.searchParams.set('taskDescription', descriptionText);
    url.searchParams.set('details', descriptionText);

    // Title / task name
    url.searchParams.set('title', taskTitle);
    url.searchParams.set('name', taskTitle);
    url.searchParams.set('task_name', taskTitle);
    url.searchParams.set('taskTitle', taskTitle);

    // Assignee / Action Owner
    url.searchParams.set('assignee', actionOwner || 'HR Director');
    url.searchParams.set('assignedTo', actionOwner || 'HR Director');
    url.searchParams.set('assigned_to', actionOwner || 'HR Director');
    url.searchParams.set('owner', actionOwner || 'HR Director');

    // Priority & Deadline
    const prio = selectedItem.priority?.includes('Low') ? 'Low' : (selectedItem.priority?.includes('Medium') ? 'Medium' : 'High');
    url.searchParams.set('priority', prio);
    url.searchParams.set('deadline', actionDeadline || '14 Days');
    url.searchParams.set('dueDate', actionDeadline || '14 Days');
    url.searchParams.set('due_date', actionDeadline || '14 Days');

    // Store & Department tags
    url.searchParams.set('branch', selectedItem.branch || '');
    url.searchParams.set('department', selectedItem.department || '');
    url.searchParams.set('source', 'HR_Intelligence');

    // Automatically copy description to clipboard for seamless fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(descriptionText).catch((err) => console.warn('Clipboard write error:', err));
    }

    // Save to local storage as well for cross-app synchronization
    try {
      localStorage.setItem('brynexone_pending_task', JSON.stringify({
        title: taskTitle,
        description: descriptionText,
        assignee: actionOwner,
        deadline: actionDeadline,
        priority: prio,
        source: 'HR_Intelligence',
        createdAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }

    // Open BrynexOne in a new tab
    window.open(url.toString(), '_blank', 'noopener,noreferrer');

    setBrynexOneSuccess(true);
    setTimeout(() => setBrynexOneSuccess(false), 8000);
  };

  const handleCopyDescription = () => {
    const text = generateBrynexOneDescription();
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedDescription(true);
      setTimeout(() => setCopiedDescription(false), 2500);
    }
  };

  // Deploy Action to Layer 7 Execution Engine
  const handleDeployAction = () => {
    if (!selectedOption) return;
    deployActionPlan({
      title: `${selectedOption.badge}: ${selectedOption.title}`,
      owner: actionOwner,
      deadline: actionDeadline,
      kpi: actionKpi,
      optionBadge: selectedOption.badge
    });
    setDeploymentSuccess(true);
  };

  return (
    <div className="hr-page-container" style={{ position: 'relative' }}>
      {/* Sleek Top Streaming Progress Line (ChatGPT / Claude / Linear aesthetic) */}
      {(isLoadingAnalysis || isSubmittingPrompt || isAiAnalyzing) && (
        <div className="human-streaming-progress-bar" />
      )}

      {/* 1. Page Header Row: Welcome Greeting on Left, Date & Export Actions on Right */}
      <div className="hr-header-greeting-row">
        <div className="hr-welcome-greeting-section">
          <div className="hr-welcome-greeting-badge">WELCOME BACK</div>
          <h2 className="hr-welcome-greeting-title">Here's what's happening in your workforce.</h2>
          <p className="hr-welcome-greeting-sub">Key insights, trends and actions — all in one place.</p>
        </div>

        <div className="hr-page-header-actions">
          <button className="hr-date-btn hr-date-btn-shadow">
            <Calendar size={14} color="#64748b" />
            <span>{dateRange}</span>
            <ChevronDown size={14} color="#64748b" />
          </button>
          <button className="hr-export-btn hr-btn-shadow" onClick={handleExport}>
            <Download size={14} color="#64748b" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* API Error Notification Banner */}
      {analysisError && (
        <div style={{
          background: '#fef2f2',
          border: '1.5px solid #f87171',
          borderRadius: '12px',
          padding: '14px 18px',
          margin: '0 0 20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={22} color="#dc2626" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#991b1b' }}>API Connection Error</div>
              <div style={{ fontSize: '13px', color: '#b91c1c' }}>{analysisError} — Backend connection failed. No hardcoded or fallback data is being displayed.</div>
            </div>
          </div>
          <button
            onClick={() => fetchAnalysis()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RotateCw size={13} />
            <span>Retry API</span>
          </button>
        </div>
      )}

      {/* Top Banner Row: Live API Intelligence Prompt Engine + HR Health Score Card */}
      <div className="hr-prompt-and-health-row">
        {/* Left: Executive AI Live API Telemetry Prompt Bar */}
        <div className="hr-api-prompt-bar-container">
          <div className="hr-api-prompt-bar-header">
            <div className="hr-api-prompt-title-wrap">
              <div className="hr-api-prompt-sparkle-pill">
                <Sparkles size={15} color="#7c3aed" className="hr-sparkle-animated" />
              </div>
              <div>
                <div className="hr-api-prompt-title">Live API Intelligence Prompt Engine</div>
                <div className="hr-api-prompt-subtitle">
                  Prompt or filter live retail LMS telemetry across 25 stores and 204 staff profiles (e.g., target deficits, specific stores, consultant skills)
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {isAiAnalyzing && (
                <div className="human-status-pill">
                  <span className="human-pulse-dot" />
                  <span className="human-status-text">
                    {activeApiPrompt ? `Synthesizing "${activeApiPrompt}"` : 'Synthesizing live telemetry'}
                  </span>
                </div>
              )}
              {activeApiPrompt && (
                <div className="hr-api-active-badge-wrap">
                  <span className="hr-api-active-badge">
                    <span className="hr-live-dot" />
                    Active Focus: "{activeApiPrompt}"
                  </span>
                  <button
                    type="button"
                    className="hr-api-reset-prompt-btn"
                    onClick={handleResetApiPrompt}
                    title="Reset to default unprompted telemetry"
                    disabled={isSubmittingPrompt}
                  >
                    <RotateCw size={11} />
                    <span>Reset View</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <form
            className="hr-api-prompt-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleApplyApiPrompt(apiPromptInput);
            }}
          >
            <div className="hr-api-prompt-input-wrapper">
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                className="hr-api-prompt-input"
                placeholder="Prompt AI on live API data (e.g. 'Show stores lagging on quota < 80%', 'Analyze Suitor Guy Edappally', 'Focus on accessories conversion vs training')..."
                value={apiPromptInput}
                onChange={(e) => setApiPromptInput(e.target.value)}
              />
              {apiPromptInput && (
                <button
                  type="button"
                  className="hr-api-clear-input-btn"
                  onClick={() => setApiPromptInput('')}
                  title="Clear input"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="hr-api-prompt-submit-btn"
              disabled={isSubmittingPrompt || (!apiPromptInput.trim() && !activeApiPrompt)}
            >
              {isSubmittingPrompt ? (
                <>
                  <Loader2 size={14} className="hr-spin-animation" />
                  <span>Analyzing API...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Analyze API</span>
                </>
              )}
            </button>
          </form>

          {/* 1-Click Suggestion Chips */}
          <div className="hr-api-prompt-chips">
            <span className="hr-api-chips-label">Quick Inquiries:</span>
            <button
              type="button"
              className={`hr-api-chip ${activeApiPrompt === 'Top Lagging Stores' ? 'active' : ''}`}
              onClick={() => {
                setApiPromptInput('Top Lagging Stores');
                handleApplyApiPrompt('Top Lagging Stores');
              }}
            >
              🎯 Top Lagging Stores
            </button>
            <button
              type="button"
              className={`hr-api-chip ${activeApiPrompt === 'Suitor Guy Edappally' ? 'active' : ''}`}
              onClick={() => {
                setApiPromptInput('Suitor Guy Edappally');
                handleApplyApiPrompt('Suitor Guy Edappally');
              }}
            >
              🏬 Suitor Guy Edappally
            </button>
            <button
              type="button"
              className={`hr-api-chip ${activeApiPrompt === 'Accessories Basket Gap' ? 'active' : ''}`}
              onClick={() => {
                setApiPromptInput('Accessories Basket Gap');
                handleApplyApiPrompt('Accessories Basket Gap');
              }}
            >
              👔 Accessories Basket Gap
            </button>
            <button
              type="button"
              className={`hr-api-chip ${activeApiPrompt === 'Camera Audit Discrepancies' ? 'active' : ''}`}
              onClick={() => {
                setApiPromptInput('Camera Audit Discrepancies');
                handleApplyApiPrompt('Camera Audit Discrepancies');
              }}
            >
              📹 Camera Audit Discrepancies
            </button>
            {activeApiPrompt && (
              <button
                type="button"
                className="hr-api-chip hr-api-chip-reset"
                onClick={handleResetApiPrompt}
              >
                🔄 Reset to Default
              </button>
            )}
          </div>
        </div>

        {/* Right: HR Health Score Card */}
        <div className="hr-health-score-card">
          {isWaitingForAi ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '4px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <SkeletonBlock width="95px" height="13px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <SkeletonBlock width="60px" height="20px" borderRadius="999px" style={{ background: 'rgba(255,255,255,0.2)' }} />
              </div>
              <SkeletonBlock width="75px" height="34px" borderRadius="6px" style={{ background: 'rgba(255,255,255,0.25)', margin: '4px 0' }} />
              <SkeletonBlock width="140px" height="12px" style={{ background: 'rgba(255,255,255,0.18)' }} />
            </div>
          ) : (
            <>
              <div className="hr-health-header">
                <span className="hr-health-title">HR Health Score</span>
                <span className="hr-health-badge">
                  {resolvedAttentionItems.length > 0
                    ? (liveAnalysis?.healthStatus || 'Needs Attention')
                    : (analysisError ? 'API Error' : 'Standby')}
                </span>
              </div>
              <div className="hr-health-value">
                {resolvedAttentionItems.length > 0 && liveAnalysis?.healthScore && liveAnalysis.healthScore !== 'N/A'
                  ? (String(liveAnalysis.healthScore).includes('%') ? liveAnalysis.healthScore : `${liveAnalysis.healthScore}%`)
                  : (analysisError ? 'ERR' : '—')}
              </div>
              <div className="hr-health-footer">
                <TrendingUp size={14} />
                <span>
                  {analysisError
                    ? 'API connection failure'
                    : resolvedAttentionItems.length > 0
                      ? `${resolvedAttentionItems.length} area${resolvedAttentionItems.length === 1 ? '' : 's'} need attention`
                      : 'Awaiting prompt analysis'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row of 5 Metric KPI Cards */}
      <div className="hr-metrics-grid">
        {isWaitingForAi ? (
          [1, 2, 3, 4, 5].map((idx) => <SkeletonKpiCard key={idx} />)
        ) : (
          resolvedKpiMetrics.map((kpi, idx) => (
            <div key={kpi.id || idx} className="hr-kpi-card">
              <div className="hr-kpi-top">
                <div className={`hr-kpi-icon-pill ${kpi.colorClass || 'hr-kpi-icon-blue'}`}>
                  {kpi.icon || <Activity size={13} />}
                </div>
                <span className="hr-kpi-label">{kpi.title}</span>
              </div>
              <div className="hr-kpi-val">{kpi.value}</div>
              <div className="hr-kpi-trend">
                <div className="hr-kpi-trend-left">
                  <ArrowUpRight size={13} />
                  <span>{kpi.trend || '3%'}</span>
                </div>
                <span className="hr-kpi-trend-sub">vs last month</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. Main Split Grid (Faithful to Figma layout) */}
      <div className="hr-split-grid">
        {/* Left Column: Management Attention */}
        <div className="hr-attention-column">
          <div className="hr-attention-header-card">
            <div className="hr-attention-title-row">
              <h3 className="hr-attention-title">Management Attention</h3>
              <button className="hr-date-btn hr-date-btn-small">
                <Calendar size={14} color="#64748b" />
                <span style={{ color: '#0f172a', fontWeight: '500' }}>{dateRange}</span>
                <ChevronDown size={14} color="#64748b" />
              </button>
            </div>
            <p className="hr-attention-desc">
              {analysisError ? (
                <span style={{ color: '#dc2626', fontWeight: 500 }}>
                  API Error: {analysisError}. Please verify backend connection.
                </span>
              ) : (
                liveAnalysis?.attentionSummary || (
                  isLoadingAnalysis
                    ? 'Checking for live workforce telemetry...'
                    : 'No workforce datasets currently synced. Upload employee and attendance records in Data Management to detect live management issues.'
                )
              )}
            </p>

            {/* Filter Pills Row */}
            <div className="hr-filter-row">
              <div className="hr-filter-pills">
                <button
                  className={`hr-filter-pill ${activeFilter === 'All' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('All')}
                >
                  All ({resolvedAttentionItems.length})
                </button>
                <button
                  className={`hr-filter-pill ${activeFilter === 'Critical' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('Critical')}
                >
                  <span className="hr-dot hr-dot-red"></span>
                  Critical ({resolvedAttentionItems.filter((i) => i.category === 'Critical').length})
                </button>
                <button
                  className={`hr-filter-pill ${activeFilter === 'Need investigation' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('Need investigation')}
                >
                  <span className="hr-dot hr-dot-yellow"></span>
                  Need investigation ({resolvedAttentionItems.filter((i) => i.category === 'Need investigation').length})
                </button>
                <button
                  className={`hr-filter-pill ${activeFilter === 'Opportunity' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('Opportunity')}
                >
                  <span className="hr-dot hr-dot-green"></span>
                  Opportunity ({resolvedAttentionItems.filter((i) => i.category === 'Opportunity').length})
                </button>
              </div>
              <button className="hr-filter-icon-btn-borderless" title="Filter settings">
                <Filter size={15} />
              </button>
            </div>
          </div>

          {/* List of Issue Cards */}
          <div className="hr-issue-cards-list">
            {isWaitingForAi ? (
              <>
                <SkeletonIssueCard />
                <SkeletonIssueCard />
                <SkeletonIssueCard />
              </>
            ) : filteredItems.length === 0 ? (
              <div
                className="hr-empty-state-card"
                style={{
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1.5px dashed #cbd5e1',
                  marginTop: '12px'
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: '#f5f3ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px'
                  }}
                >
                  <Sparkles size={26} color="#7c3aed" />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1e293b', fontWeight: 600 }}>
                  {resolvedAttentionItems.length === 0
                    ? 'Live Retail API Connected • Awaiting Prompt'
                    : 'No Issues in Selected Filter'}
                </h4>
                <p style={{ margin: '0 auto 18px', fontSize: '13px', color: '#64748b', lineHeight: 1.5, maxWidth: '420px' }}>
                  {resolvedAttentionItems.length === 0
                    ? 'Live telemetry across 25 retail branches and 204 staff profiles is synchronized. Enter a prompt above or choose a quick inquiry to generate AI management diagnostics.'
                    : 'All workforce metrics and attendance rosters for this filter are currently within nominal thresholds.'}
                </p>
                {resolvedAttentionItems.length === 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="hr-api-chip"
                      onClick={() => {
                        setApiPromptInput('Top Lagging Stores');
                        handleApplyApiPrompt('Top Lagging Stores');
                      }}
                    >
                      🎯 Top Lagging Stores
                    </button>
                    <button
                      type="button"
                      className="hr-api-chip"
                      onClick={() => {
                        setApiPromptInput('Suitor Guy Edappally');
                        handleApplyApiPrompt('Suitor Guy Edappally');
                      }}
                    >
                      🏬 Suitor Guy Edappally
                    </button>
                    <button
                      type="button"
                      className="hr-api-chip"
                      onClick={() => {
                        setApiPromptInput('Accessories Basket Gap');
                        handleApplyApiPrompt('Accessories Basket Gap');
                      }}
                    >
                      👔 Accessories Basket Gap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`hr-issue-card ${String(selectedIssueId) === String(item.id) ? 'selected' : ''}`}
                  onClick={() => setSelectedIssueId(item.id)}
                >
                  <div className="hr-issue-card-tags">
                    <span
                      className={`hr-priority-tag ${
                        item.priority?.includes('Low') ? 'hr-priority-low' : 'hr-priority-high'
                      }`}
                    >
                      ● {item.priority || 'High Priority'}
                    </span>
                    <span className="hr-status-badge-outline">{item.status || 'Needs investigation'}</span>
                  </div>

                  <h4 className="hr-issue-card-title">{item.title}</h4>
                  <p className="hr-issue-card-desc">{item.description}</p>

                  {item.branch && (
                    <div className="hr-issue-card-meta">
                      <div className="hr-meta-item">
                        <Building2 size={13} color="#d97706" />
                        <span>{item.branch}</span>
                      </div>
                      {item.topic && (
                        <div className="hr-meta-item">
                          <AlertTriangle size={13} color="#d97706" />
                          <span>{item.topic}</span>
                        </div>
                      )}
                      <div className="hr-meta-item">
                        <Calendar size={13} color="#d97706" />
                        <span>{item.dateRange || dateRange}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Detailed Investigation View */}
        {isWaitingForAi ? (
          <SkeletonDetailCard />
        ) : !selectedItem ? (
          <div
            className="hr-detail-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '60px 24px',
              minHeight: '450px'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#f5f3ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}
            >
              <BrainCircuit size={32} color="#7c3aed" />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              {resolvedAttentionItems.length === 0
                ? 'AI Workforce Diagnostics on Standby'
                : 'Select an Issue to Investigate'}
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '440px', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              {resolvedAttentionItems.length === 0
                ? 'Telemetry across 25 retail branches (targets, net sales, footfall, audit discrepancies) and 204 employee records is active. Enter an executive prompt above to identify anomalies, root causes, and decision options.'
                : 'Click on any detected attention item in the left column to inspect telemetry evidence, Claude AI root causes, and decision options.'}
            </p>
          </div>
        ) : (
          <div className="hr-detail-card">
            {/* Top Bar inside Detail */}
            <div className="hr-detail-top-nav">
              <button className="hr-back-btn" onClick={() => setActiveFilter('All')}>
                <ArrowLeft size={14} />
                <span>Back to list</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isAiAnalyzing && (
                  <span className="human-detail-status-pill">
                    <span className="human-pulse-dot" />
                    <span>Enriching telemetry</span>
                  </span>
                )}
                <span className="hr-status-badge-outline" style={{ padding: '3px 12px' }}>
                  {selectedItem.status || 'Needs investigation'}
                </span>
              </div>
            </div>

            {/* Title & Metadata */}
            <div>
              <h2 className="hr-detail-title">{selectedItem.title}</h2>
              <div className="hr-detail-meta-row" style={{ marginTop: '10px' }}>
                <div className="hr-meta-item">
                  <Building2 size={14} color="#d97706" />
                  <span>{selectedItem.branch || 'All branches'}</span>
                </div>
                <div className="hr-meta-item">
                  <AlertTriangle size={14} color="#d97706" />
                  <span>{selectedItem.topic || 'Employee Retention & Attrition'}</span>
                </div>
                <div className="hr-meta-item">
                  <Calendar size={14} color="#d97706" />
                  <span>{selectedItem.dateRange || dateRange || 'Current Period'}</span>
                </div>
              </div>
            </div>

            {/* Priority & Confidence row */}
            <div className="hr-detail-badges-row">
              <span className={`hr-priority-tag ${selectedItem.priority?.includes('Low') ? 'hr-priority-low' : 'hr-priority-high'}`}>
                ● {selectedItem.priority || 'High Priority'}
              </span>
              <span className="hr-confidence-badge">Confidence: {selectedItem.confidence || 'N/A'}</span>
            </div>

            {/* All 6 Navigation Tabs */}
            <div className="hr-tabs-container">
              {['Overview', 'Evidence', 'Possible Causes', 'Options', 'Decision & Actions', 'Outcome'].map((tab) => (
                <button
                  key={tab}
                  className={`hr-tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'Overview' && (
              <div className="hr-tab-content">
                {/* "What's happening?" container */}
                <div className="hr-section-box">
                  <h4 className="hr-section-header-title">What's happening?</h4>
                  <p className="hr-section-paragraph">{selectedItem.whatsHappening || selectedItem.description}</p>

                  {/* Dynamic Metric Highlight Boxes */}
                  {selectedItem.metrics && selectedItem.metrics.length > 0 && (
                    <div className="hr-four-metrics-grid">
                      {selectedItem.metrics.map((m, idx) => (
                        <div key={idx} className="hr-mini-metric-tile">
                          <span className="hr-mini-metric-title">{m.label}</span>
                          <div className="hr-mini-metric-val">
                            <span>{m.val}</span>
                            {m.hasDownArrow && <ArrowDown size={14} color="#ef4444" />}
                          </div>
                          <span className="hr-mini-metric-note">{m.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* "Why does it matter?" container with 2 side-by-side impact cards */}
                <div className="hr-section-box">
                  <h4 className="hr-section-header-title">Why does it matter?</h4>
                  <div className="hr-impact-cards-grid">
                    <div className="hr-impact-card">
                      <div className="hr-impact-card-header">
                        <Target size={16} color="#d97706" />
                        <span>Workforce continuity</span>
                      </div>
                      <p className="hr-impact-card-p">
                        {selectedItem.impactContinuity || 'Vacancies and replacement periods may affect team capacity and service delivery.'}
                      </p>
                    </div>

                    <div className="hr-impact-card">
                      <div className="hr-impact-card-header">
                        <AlertTriangle size={16} color="#dc2626" />
                        <span>Business performance</span>
                      </div>
                      <p className="hr-impact-card-p">
                        {selectedItem.impactPerformance || 'Investigate whether turnover is affecting sales productivity, customer experience or branch targets.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Evidence */}
            {activeTab === 'Evidence' && (
              <div className="hr-tab-content">
                <div className="hr-section-box">
                  <h4 className="hr-section-header-title">Workforce Telemetry Evidence</h4>
                  <p className="hr-section-paragraph">
                    Signals linking workforce attendance, shifts, compensation benchmarks, and exit patterns.
                  </p>
                  {selectedItem.evidence && selectedItem.evidence.length > 0 ? (
                    <div className="hr-evidence-list">
                      {selectedItem.evidence.map((ev, idx) => (
                        <div key={idx} className="hr-evidence-item">
                          <div>
                            <div className="hr-evidence-title">{ev.title}</div>
                            <div className="hr-evidence-desc">{ev.desc}</div>
                          </div>
                          <span className="hr-evidence-record-pill">{ev.record}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      No specific evidence records attached for this item. Click "Run Live AI Diagnosis" to analyze.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Possible Causes (Claude AI Diagnosis) */}
            {activeTab === 'Possible Causes' && (
              <div className="hr-tab-content">
                <div className="hr-section-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h4 className="hr-section-header-title" style={{ margin: 0 }}>
                        Claude AI Root Cause Diagnosis
                      </h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Diagnostic evaluation using Left-Brain workforce framework
                      </span>
                    </div>
                    <button
                      onClick={handleRunAiDiagnosis}
                      disabled={isDiagnosing}
                      style={{
                        background: '#0f172a',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isDiagnosing ? 'wait' : 'pointer'
                      }}
                    >
                      <Sparkles size={13} color="#0ca678" />
                      <span>{isDiagnosing ? 'Diagnosing with Claude...' : 'Run Live AI Diagnosis'}</span>
                    </button>
                  </div>

                  {!isCausesRevealed ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '44px 20px',
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1.5px dashed #cbd5e1',
                        marginTop: '12px'
                      }}
                    >
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: '#f0fdf4',
                        color: '#0ca678',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                      }}>
                        <BrainCircuit size={22} />
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#0f172a', fontWeight: 600 }}>
                        Root Cause Diagnosis On Standby
                      </h4>
                      <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b', maxWidth: '440px', marginInline: 'auto', lineHeight: 1.5 }}>
                        Click below to run live Left-Brain diagnostic evaluation with Claude AI and reveal correlated root causes for this issue.
                      </p>
                      <button
                        type="button"
                        onClick={handleRunAiDiagnosis}
                        disabled={isDiagnosing}
                        style={{
                          background: '#0f172a',
                          color: '#ffffff',
                          border: 'none',
                          padding: '9px 18px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          cursor: isDiagnosing ? 'wait' : 'pointer',
                          boxShadow: '0 2px 5px rgba(15, 23, 42, 0.12)'
                        }}
                      >
                        <Sparkles size={13} color="#0ca678" />
                        <span>{isDiagnosing ? 'Diagnosing with Claude...' : 'Run Live AI Diagnosis'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="hr-causes-list">
                      {displayCauses.map((cause, idx) => (
                        <div key={idx} className="hr-cause-item">
                          <div className="hr-cause-icon-wrapper">
                            <AlertCircle size={18} />
                          </div>
                          <div className="hr-cause-text">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span className="hr-cause-title">{cause.title}</span>
                              <span
                                className={`hr-cause-confidence ${
                                  cause.confidence?.includes('High') ? 'high-confidence' : 'medium-confidence'
                                }`}
                              >
                                {cause.confidence}
                              </span>
                            </div>
                            <p className="hr-cause-desc">{cause.description}</p>
                            {cause.evidence && (
                              <div style={{ fontSize: '12px', color: '#0ca678', marginTop: '6px', fontWeight: 500 }}>
                                <strong>Evidence:</strong> {cause.evidence}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Options (Claude AI Decision Engine) */}
            {activeTab === 'Options' && (
              <div className="hr-tab-content">
                <div className="hr-section-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h4 className="hr-section-header-title" style={{ margin: 0 }}>
                        Layer 6 Decision Engine (Option A / B / C)
                      </h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Strategic decision options synthesized by Claude AI
                      </span>
                    </div>
                    <button
                      onClick={handleRegenerateOptions}
                      disabled={isGeneratingOptions}
                      style={{
                        background: '#0f172a',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isGeneratingOptions ? 'wait' : 'pointer'
                      }}
                    >
                      <Sparkles size={13} color="#0ca678" />
                      <span>{isGeneratingOptions ? 'Synthesizing with Claude...' : 'Generate AI Options'}</span>
                    </button>
                  </div>

                  {!isOptionsRevealed ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '44px 20px',
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1.5px dashed #cbd5e1',
                        marginTop: '12px',
                        width: '100%'
                      }}
                    >
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: '#ecfdf5',
                        color: '#0ca678',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                      }}>
                        <Target size={22} />
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#0f172a', fontWeight: 600 }}>
                        Decision Engine On Standby
                      </h4>
                      <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b', maxWidth: '440px', marginInline: 'auto', lineHeight: 1.5 }}>
                        Click below to synthesize 3 strategic management decision paths (Option A / B / C) with projected operational ROI.
                      </p>
                      <button
                        type="button"
                        onClick={handleRegenerateOptions}
                        disabled={isGeneratingOptions}
                        style={{
                          background: '#0f172a',
                          color: '#ffffff',
                          border: 'none',
                          padding: '9px 18px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          cursor: isGeneratingOptions ? 'wait' : 'pointer',
                          boxShadow: '0 2px 5px rgba(15, 23, 42, 0.12)'
                        }}
                      >
                        <Sparkles size={13} color="#0ca678" />
                        <span>{isGeneratingOptions ? 'Synthesizing with Claude...' : 'Generate AI Options'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="hr-options-grid">
                      {displayOptions.map((opt) => (
                        <div
                          key={opt.id}
                          className={`hr-option-card ${selectedOptionId === opt.id ? 'active' : ''}`}
                          onClick={() => setSelectedOptionId(opt.id)}
                          style={{
                            cursor: 'pointer',
                            borderColor: selectedOptionId === opt.id ? '#0ca678' : '#e2e8f0',
                            boxShadow: selectedOptionId === opt.id ? '0 0 0 1.5px #0ca678' : 'none'
                          }}
                        >
                          <span className="hr-option-badge">{opt.badge}</span>
                          <h5 className="hr-option-title">{opt.title}</h5>
                          <p className="hr-option-desc">{opt.description}</p>
                          {opt.impact && (
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0ca678', marginTop: '8px' }}>
                              Impact: {opt.impact}
                            </div>
                          )}
                          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOptionId(opt.id);
                                handleAssignBrynexOneTask(opt);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 11px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                background: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title="Assign this decision option directly in BrynexOne"
                            >
                              <span>Assign in BrynexOne</span>
                              <ExternalLink size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 5: Decision & Actions */}
            {activeTab === 'Decision & Actions' && (
              <div className="hr-tab-content">
                <div className="hr-section-box">
                  <h4 className="hr-section-header-title">Layer 7 Action Execution</h4>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    Deploy selected management decision to operational action items.
                  </p>

                  {selectedOption ? (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginTop: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                        Selected Decision: {selectedOption.badge}
                      </div>
                      <div style={{ fontSize: '13px', color: '#334155', marginBottom: '14px' }}>
                        {selectedOption.title}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                            Action Owner
                          </label>
                          <input
                            type="text"
                            value={actionOwner}
                            onChange={(e) => setActionOwner(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                            Target Deadline
                          </label>
                          <input
                            type="text"
                            value={actionDeadline}
                            onChange={(e) => setActionDeadline(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => handleAssignBrynexOneTask(selectedOption)}
                          style={{
                            background: 'linear-gradient(135deg, #0ca678 0%, #059669 100%)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px',
                            boxShadow: '0 2px 6px rgba(12, 166, 120, 0.25)',
                            transition: 'all 0.15s ease'
                          }}
                          title="Redirect to BrynexOne with selected option prefilled in description"
                        >
                          <ExternalLink size={15} />
                          <span>Assign Task in BrynexOne</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDeployAction}
                          style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <CheckCircle2 size={15} />
                          <span>Deploy to AI Tasks</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowDescriptionPreview((prev) => !prev)}
                          style={{
                            background: '#ffffff',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            padding: '9px 14px',
                            borderRadius: '8px',
                            fontWeight: 500,
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <FileText size={13} color="#64748b" />
                          <span>{showDescriptionPreview ? 'Hide Description Payload' : 'Preview Task Description'}</span>
                          <ChevronDown size={13} style={{ transform: showDescriptionPreview ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                      </div>

                      {/* BrynexOne Success Notification */}
                      {brynexOneSuccess && (
                        <div style={{
                          marginTop: '12px',
                          padding: '12px 16px',
                          background: '#ecfdf5',
                          border: '1.5px solid #a7f3d0',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={16} color="#059669" />
                            <div>
                              <div style={{ fontSize: '13px', color: '#065f46', fontWeight: 600 }}>
                                Redirected to BrynexOne (`task/create`)!
                              </div>
                              <div style={{ fontSize: '12px', color: '#047857' }}>
                                Selected option data has been prefilled via URL parameters & copied to your clipboard.
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyDescription}
                            style={{
                              fontSize: '12px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              background: '#ffffff',
                              border: '1px solid #059669',
                              color: '#059669',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {copiedDescription ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedDescription ? 'Copied!' : 'Copy Again'}</span>
                          </button>
                        </div>
                      )}

                      {/* Local Deployment Success */}
                      {deploymentSuccess && (
                        <div style={{ marginTop: '10px', fontSize: '12.5px', color: '#0ca678', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={14} />
                          <span>Action plan deployed successfully to local AI Tasks!</span>
                        </div>
                      )}

                      {/* Expandable BrynexOne Task Description Payload Preview */}
                      {showDescriptionPreview && (
                        <div style={{
                          marginTop: '14px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            background: '#f1f5f9',
                            padding: '8px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #e2e8f0'
                          }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                              Description Payload sent to BrynexOne:
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyDescription}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: '#0f172a',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              {copiedDescription ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                              <span>{copiedDescription ? 'Copied!' : 'Copy Description'}</span>
                            </button>
                          </div>
                          <pre style={{
                            margin: 0,
                            padding: '12px 14px',
                            fontSize: '12px',
                            color: '#1e293b',
                            background: '#f8fafc',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.55,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            maxHeight: '260px',
                            overflowY: 'auto'
                          }}>
                            {generateBrynexOneDescription()}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                      Select an option in the "Options" tab first.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 6: Outcome */}
            {activeTab === 'Outcome' && (
              <div className="hr-tab-content">
                <div className="hr-section-box">
                  <h4 className="hr-section-header-title">Projected Stabilization & ROI Forecast</h4>
                  <p className="hr-section-paragraph">
                    Estimated organizational impact of implementing selected management decision options.
                  </p>

                  {selectedOption ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', marginTop: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#166534', marginBottom: '6px' }}>
                        Selected Option: {selectedOption.badge} - {selectedOption.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#15803d', lineHeight: 1.5 }}>
                        {selectedOption.impact || selectedOption.description}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      Select an option in the "Options" tab to view specific stabilization forecasts and expected operational ROI.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
