import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  X,
  Eye,
  Download,
  Sliders,
  Sparkles,
  Loader2,
  ArrowRight,
  Database,
  Check,
  RotateCcw,
  Edit3,
  Filter,
  Info,
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Users,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './HrData.css';

export default function HrData() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Modals state
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Pre-connection Prompt Modal State
  const [showPromptConfirmModal, setShowPromptConfirmModal] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null); // { file: File, type: 'file' }
  const [confirmModalChoice, setConfirmModalChoice] = useState('none'); // 'none' | 'active' | 'saved' | 'custom'
  const [confirmModalPromptText, setConfirmModalPromptText] = useState('');
  const [confirmModalSelectedPromptId, setConfirmModalSelectedPromptId] = useState('');
  const [confirmModalSaveToDb, setConfirmModalSaveToDb] = useState(false);
  const [confirmModalNewTitle, setConfirmModalNewTitle] = useState('');

  // Admin Custom Rules & Manual Selection Options
  const [adminPrompt, setAdminPrompt] = useState('');
  const [activeAdminPrompt, setActiveAdminPrompt] = useState('');
  const [targetAttrition, setTargetAttrition] = useState('5.0');
  const [targetProductivity, setTargetProductivity] = useState('90');
  const [targetDepartment, setTargetDepartment] = useState('All');
  const [focusPriority, setFocusPriority] = useState('All');
  const [calculationMode, setCalculationMode] = useState('hybrid'); // 'hybrid' | 'manual' | 'autonomous'
  const [timeHorizon, setTimeHorizon] = useState('01-30 Sep 2026');

  // Saved Prompts from MongoDB Atlas
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [activeSavedPromptId, setActiveSavedPromptId] = useState(null);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // File records & Synced Employee Profiles list
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [syncedEmployees, setSyncedEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [toast, setToast] = useState(null);

  // Fetch saved prompts from MongoDB Atlas
  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/prompts');
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.prompts)) {
        setSavedPrompts(data.prompts);
      }
    } catch (err) {
      console.warn('Could not fetch prompts from MongoDB:', err);
    }
  };

  // Fetch existing uploaded files from backend
  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/hr/files');
      const data = await res.json();
      if (data.status === 'success') {
        setUploadedFiles(data.files);
      }
    } catch (err) {
      console.warn('Could not fetch backend files:', err);
    }
  };

  // Fetch real synced employees from backend
  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/hr/employees');
      const data = await res.json();
      if (data.status === 'success') {
        setSyncedEmployees(data.data || []);
        setAllEmployees(data.allEmployees || data.data || []);
        if (data.activePrompt) {
          setActiveAdminPrompt(data.activePrompt);
          setAdminPrompt(data.activePrompt);
        }
      }
    } catch (err) {
      console.warn('Could not fetch backend employees:', err);
    }
  };

  // Fetch latest AI analysis from backend
  const fetchAnalysis = async () => {
    try {
      const res = await fetch('/api/hr/analysis');
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setLatestAnalysis(data.data);
        if (data.activePrompt) {
          setActiveAdminPrompt(data.activePrompt);
        }
      }
    } catch (err) {
      console.warn('Could not fetch analysis:', err);
    }
  };

  useEffect(() => {
    fetchPrompts();
    fetchFiles();
    fetchEmployees();
    fetchAnalysis();
  }, []);

  // Open the pre-connection modal before uploading
  const openPromptConfirmModal = (file) => {
    setPendingUpload({ file });
    setConfirmModalChoice('none'); // Default: No prompt needed
    setConfirmModalPromptText(activeAdminPrompt || '');
    setConfirmModalSelectedPromptId(savedPrompts[0]?._id || '');
    setConfirmModalSaveToDb(false);
    setConfirmModalNewTitle('');
    setShowPromptConfirmModal(true);
  };

  // Upload file execution
  const executeUpload = async (file, promptToSend) => {
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('adminPrompt', promptToSend || '');
    formData.append(
      'customRules',
      JSON.stringify({
        targetAttrition: parseFloat(targetAttrition) || 5.0,
        targetProductivity: parseFloat(targetProductivity) || 90,
        targetDepartment,
        focusPriority,
        calculationMode,
        timeHorizon
      })
    );

    try {
      const res = await fetch('/api/hr/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.status === 'success') {
        setShowPromptConfirmModal(false);
        setPendingUpload(null);
        setActiveAdminPrompt(promptToSend || '');
        setAdminPrompt(promptToSend || '');
        await fetchFiles();
        await fetchEmployees();
        await fetchAnalysis();

        try {
          localStorage.setItem('hr_data_last_updated', String(Date.now()));
          window.dispatchEvent(new CustomEvent('hr-data-updated'));
        } catch (_) {}

        setToast({
          title: `File "${file.name}" Connected!`,
          message: `Dataset connected to MongoDB. Claude AI deep intelligence synthesis is running in the background on the HR Intelligence dashboard.`,
          showViewDashboard: true
        });
      } else {
        alert(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading file to server.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle user confirming their prompt in the pre-connection modal
  const handleConfirmPromptAndConnect = async () => {
    if (!pendingUpload?.file) return;

    let chosenPrompt = '';
    if (confirmModalChoice === 'none') {
      chosenPrompt = '';
    } else if (confirmModalChoice === 'active') {
      chosenPrompt = activeAdminPrompt;
    } else if (confirmModalChoice === 'saved') {
      const found = savedPrompts.find((p) => p._id === confirmModalSelectedPromptId);
      chosenPrompt = found ? found.promptText : '';
    } else if (confirmModalChoice === 'custom') {
      chosenPrompt = confirmModalPromptText.trim();

      // If user opted to save to MongoDB Atlas
      if (confirmModalSaveToDb && chosenPrompt) {
        try {
          await fetch('/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: confirmModalNewTitle.trim() || undefined,
              promptText: chosenPrompt,
              customRules: {
                targetAttrition: parseFloat(targetAttrition) || 5.0,
                targetProductivity: parseFloat(targetProductivity) || 90,
                targetDepartment,
                focusPriority,
                calculationMode,
                timeHorizon
              }
            })
          });
          await fetchPrompts();
        } catch (err) {
          console.warn('Could not save prompt to MongoDB:', err);
        }
      }
    }

    await executeUpload(pendingUpload.file, chosenPrompt);
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      openPromptConfirmModal(files[0]);
      e.target.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      openPromptConfirmModal(files[0]);
    }
  };

  const handleAddSheet = async (e) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;

    try {
      setIsUploading(true);
      let exportUrl = sheetUrl.trim();
      if (exportUrl.includes('/edit')) {
        exportUrl = exportUrl.replace(/\/edit.*$/, '/export?format=csv');
      }
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error('Could not fetch Google Sheet. Please ensure the link is shared as "Anyone with the link can view", or download it as a CSV and drag-and-drop it into the upload box.');
      }
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const file = new File([blob], 'Google_Sheet_Export.csv', { type: 'text/csv' });
      setShowSheetModal(false);
      setSheetUrl('');
      openPromptConfirmModal(file);
    } catch (err) {
      alert(err.message || 'Error fetching sheet. Please download it as a CSV and upload it directly.');
    } finally {
      setIsUploading(false);
    }
  };

  // Save current prompt to MongoDB Atlas
  const handleSaveCurrentPromptToAtlas = async () => {
    if (!adminPrompt.trim()) {
      alert('Please enter prompt text before saving.');
      return;
    }

    setIsSavingPrompt(true);
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPromptTitle.trim() || undefined,
          promptText: adminPrompt.trim(),
          customRules: {
            targetAttrition: parseFloat(targetAttrition) || 5.0,
            targetProductivity: parseFloat(targetProductivity) || 90,
            targetDepartment,
            focusPriority,
            calculationMode,
            timeHorizon
          }
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        await fetchPrompts();
        setActiveSavedPromptId(data.prompt._id);
        setNewPromptTitle('');
        alert(`Saved successfully to MongoDB Atlas as "${data.prompt.title}"!`);
      } else {
        alert(data.message || 'Error saving prompt to database.');
      }
    } catch (err) {
      console.error('Error saving prompt:', err);
      alert('Failed to connect to MongoDB backend.');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  // Delete prompt from MongoDB Atlas
  const handleDeleteSavedPrompt = async (e, promptId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this prompt from MongoDB Atlas?')) {
      return;
    }

    try {
      const res = await fetch(`/api/prompts/${promptId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        if (activeSavedPromptId === promptId) {
          setActiveSavedPromptId(null);
        }
        await fetchPrompts();
      }
    } catch (err) {
      alert('Error deleting prompt.');
    }
  };

  // Load a saved prompt into the rules modal
  const handleSelectSavedPrompt = (prompt) => {
    setActiveSavedPromptId(prompt._id);
    setAdminPrompt(prompt.promptText);
    if (prompt.customRules) {
      if (prompt.customRules.targetAttrition !== undefined) setTargetAttrition(String(prompt.customRules.targetAttrition));
      if (prompt.customRules.targetProductivity !== undefined) setTargetProductivity(String(prompt.customRules.targetProductivity));
      if (prompt.customRules.targetDepartment) setTargetDepartment(prompt.customRules.targetDepartment);
      if (prompt.customRules.focusPriority) setFocusPriority(prompt.customRules.focusPriority);
      if (prompt.customRules.calculationMode) setCalculationMode(prompt.customRules.calculationMode);
      if (prompt.customRules.timeHorizon) setTimeHorizon(prompt.customRules.timeHorizon);
    }
  };

  // Reset to "No Prompt (Default)"
  const handleSelectNoPrompt = () => {
    setActiveSavedPromptId(null);
    setAdminPrompt('');
  };

  // Apply & Re-calculate with prompt and rules
  const handleApplyRules = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch('/api/hr/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPrompt,
          customRules: {
            targetAttrition: parseFloat(targetAttrition) || 5.0,
            targetProductivity: parseFloat(targetProductivity) || 90,
            targetDepartment,
            focusPriority,
            calculationMode,
            timeHorizon
          }
        })
      });
      const json = await res.json();
      setShowRulesModal(false);

      if (json.status === 'success') {
        setActiveAdminPrompt(adminPrompt);
        setShowAllProfiles(false);
        await fetchEmployees();
        setToast({
          title: 'AI Prompt & Rules Applied',
          message: adminPrompt ? `In-scope profiles and AI analysis updated for: "${adminPrompt}".` : 'Autonomous AI analysis re-calculated across all profiles.',
          showViewDashboard: true
        });
      }
    } catch (err) {
      console.error('Failed to apply manual rules:', err);
      alert('Error re-calculating analysis.');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Clear prompt filter and show all records
  const handleClearPromptFilter = async () => {
    try {
      setIsRecalculating(true);
      const res = await fetch('/api/hr/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPrompt: '',
          customRules: {
            targetAttrition: parseFloat(targetAttrition) || 5.0,
            targetProductivity: parseFloat(targetProductivity) || 90,
            targetDepartment: 'All',
            focusPriority: 'All',
            calculationMode,
            timeHorizon
          }
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setActiveAdminPrompt('');
        setAdminPrompt('');
        setActiveSavedPromptId(null);
        setShowAllProfiles(true);
        await fetchEmployees();
        await fetchAnalysis();
      }
    } catch (err) {
      console.error('Error clearing filter:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleOpenFilePreview = async (file) => {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/hr/files/${file.savedFilename || file.id}/preview`);
      const data = await res.json();
      if (data.status === 'success') {
        setPreviewFile(data.file);
      } else {
        alert(data.message || 'Could not load preview for this file.');
      }
    } catch (err) {
      console.warn('Failed to load preview:', err);
      alert('Error fetching file preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDeleteFile = async (e, file) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${file.name}"? This will re-calculate HR dashboard metrics.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/hr/files/${file.savedFilename || file.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.status === 'success') {
        if (previewFile && (previewFile.id === file.id || previewFile.savedFilename === file.savedFilename)) {
          setPreviewFile(null);
        }
        await fetchFiles();
        await fetchEmployees();
        await fetchAnalysis();

        try {
          localStorage.setItem('hr_data_last_updated', String(Date.now()));
          window.dispatchEvent(new CustomEvent('hr-data-updated'));
        } catch (_) {}
      } else {
        alert(data.message || 'Error deleting file.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting file from server.');
    }
  };

  // Determine which employees to display in the table
  const displayedEmployees = showAllProfiles ? allEmployees : syncedEmployees;
  const isPromptFilterActive = Boolean(activeAdminPrompt && activeAdminPrompt.trim());

  // Section-specific search and collapse state
  const [sectionSearchQueries, setSectionSearchQueries] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});

  const handleToggleSectionCollapse = (fileId) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [fileId]: !prev[fileId]
    }));
  };

  const handleSectionSearchChange = (fileId, val) => {
    setSectionSearchQueries((prev) => ({
      ...prev,
      [fileId]: val
    }));
  };

  const getDatasetCategory = (file) => {
    const name = (file.name || '').toLowerCase();
    const holds = (file.holds || '').toLowerCase();
    const cols = (file.columns || []).map((c) => String(c).toLowerCase().replace(/[^a-z0-9]/g, ''));

    if (
      holds.includes('revenue') ||
      holds.includes('sales') ||
      name.includes('sale') ||
      name.includes('revenue') ||
      name.includes('business') ||
      cols.includes('dailyrevenue') ||
      cols.includes('revenue')
    ) {
      return 'sales';
    }

    if (
      holds.includes('workforce') ||
      holds.includes('people') ||
      holds.includes('employee') ||
      name.includes('employee') ||
      name.includes('staff') ||
      name.includes('workforce') ||
      cols.includes('empid') ||
      cols.includes('employeeno') ||
      cols.includes('empname') ||
      cols.includes('employeename') ||
      cols.includes('employeedetails') ||
      cols.includes('employmentstatus') ||
      cols.includes('doj') ||
      cols.includes('dob') ||
      cols.includes('designation') ||
      cols.includes('basesalarymonthly')
    ) {
      return 'employees';
    }

    if (
      holds.includes('attendance') ||
      name.includes('attend') ||
      name.includes('roster') ||
      name.includes('muster') ||
      name.includes('shift') ||
      cols.includes('shiftdate') ||
      cols.includes('overtimehours') ||
      cols.includes('presentdays') ||
      cols.includes('present')
    ) {
      return 'attendance';
    }

    return 'generic';
  };

  // Render Sales / Branch Revenue & Telemetry Section
  const renderSalesSection = (file, sectionNum) => {
    const rows = file.data || [];
    const query = (sectionSearchQueries[file.id] || '').toLowerCase().trim();
    const isCollapsed = Boolean(collapsedSections[file.id]);

    const filteredRows = query
      ? rows.filter((r) =>
          Object.values(r).some((val) => String(val || '').toLowerCase().includes(query))
        )
      : rows;

    const totalDailyRev = rows.reduce(
      (sum, r) => sum + (parseFloat(String(r.daily_revenue || r.revenue || 0).replace(/[^0-9.-]/g, '')) || 0),
      0
    );
    const totalTx = rows.reduce(
      (sum, r) => sum + (parseInt(String(r.transactions_count || r.transactions || 0), 10) || 0),
      0
    );
    const totalFootfall = rows.reduce(
      (sum, r) => sum + (parseInt(String(r.footfall_or_leads || r.footfall || 0), 10) || 0),
      0
    );
    const uniqueBranches = Array.from(new Set(rows.map((r) => r.branch).filter(Boolean)));
    const totalPeriodRev = rows.reduce(
      (sum, r) => sum + (parseFloat(String(r.period_to_date_revenue || 0).replace(/[^0-9.-]/g, '')) || 0),
      0
    );

    return (
      <div className="hr-uploaded-section hr-dataset-card" key={file.id}>
        <div className="hr-dataset-header">
          <div className="hr-dataset-title-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="hr-section-badge">Section {sectionNum}</span>
              <h2 className="hr-uploaded-title" style={{ margin: 0 }}>
                {file.name}
              </h2>
            </div>
            <p className="hr-dataset-subtitle">
              Branch Revenue & Sales Telemetry · Financial performance, daily transactions, footfall & conversion
            </p>
          </div>

          <div className="hr-dataset-actions-block">
            <span className="hr-records-count-pill">
              ● {filteredRows.length} of {rows.length} Records Loaded
            </span>

            <div className="hr-section-search-wrapper">
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search branch, date..."
                value={sectionSearchQueries[file.id] || ''}
                onChange={(e) => handleSectionSearchChange(file.id, e.target.value)}
                className="hr-section-search-input"
              />
              {sectionSearchQueries[file.id] && (
                <button
                  type="button"
                  className="hr-search-clear-btn"
                  onClick={() => handleSectionSearchChange(file.id, '')}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {file.downloadUrl && (
              <a
                href={file.downloadUrl}
                download
                className="hr-dataset-btn-subtle"
                title="Download CSV"
              >
                <Download size={14} />
              </a>
            )}

            <button
              type="button"
              className="hr-dataset-btn-subtle"
              onClick={() => handleToggleSectionCollapse(file.id)}
              title={isCollapsed ? 'Expand Section' : 'Collapse Section'}
            >
              {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <>
            {/* Sales KPI Row */}
            <div className="hr-inscope-metrics-row hr-sales-metrics-row">
              <div className="hr-inscope-metric-pill">
                <div className="hr-inscope-metric-label">Daily Revenue (FTD)</div>
                <div className="hr-inscope-metric-val" style={{ color: '#0ca678' }}>
                  ₹{Math.round(totalDailyRev).toLocaleString()}
                </div>
              </div>
              <div className="hr-inscope-metric-pill">
                <div className="hr-inscope-metric-label">Daily Transactions</div>
                <div className="hr-inscope-metric-val">{totalTx.toLocaleString()} Tx</div>
              </div>
              <div className="hr-inscope-metric-pill">
                <div className="hr-inscope-metric-label">Active Branches</div>
                <div className="hr-inscope-metric-val">{uniqueBranches.length} Branches</div>
              </div>
              <div className="hr-inscope-metric-pill">
                <div className="hr-inscope-metric-label">MTD Revenue Total</div>
                <div className="hr-inscope-metric-val">
                  ₹{Math.round(totalPeriodRev).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Sales Table */}
            <div className="hr-table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="hr-data-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Date</th>
                    <th>Daily Revenue</th>
                    <th>Transactions</th>
                    <th>Footfall / Leads</th>
                    <th>Period-to-Date Rev</th>
                    <th>MTD Tx</th>
                    <th>ABV (MTD)</th>
                    <th>Conversion (MTD)</th>
                    <th>Complaints</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: '13.5px' }}>
                        No records match search "{query}".
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, rIdx) => {
                      const dailyRev = parseFloat(String(row.daily_revenue || row.revenue || 0).replace(/[^0-9.-]/g, '')) || 0;
                      const ptdRev = parseFloat(String(row.period_to_date_revenue || 0).replace(/[^0-9.-]/g, '')) || 0;
                      const txCount = row.transactions_count || row.transactions || '0';
                      const footfall = row.footfall_or_leads || row.footfall || '0';
                      const abvMtd = row.abv_mtd || row.abv_ftd || '-';
                      const convMtd = row.conversion_pct_mtd || row.conversion_pct_ftd || '0%';
                      const complaints = parseInt(row.customer_complaints_count || 0, 10);

                      return (
                        <tr key={row.branch ? `${row.branch}-${row.date}-${rIdx}` : rIdx}>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{row.branch || 'Branch'}</td>
                          <td style={{ color: '#64748b', fontSize: '12.5px', fontFamily: 'monospace' }}>{row.date || 'N/A'}</td>
                          <td style={{ fontWeight: 600, color: '#0ca678' }}>₹{Math.round(dailyRev).toLocaleString()}</td>
                          <td style={{ fontWeight: 500 }}>{txCount}</td>
                          <td style={{ color: '#64748b' }}>{footfall}</td>
                          <td style={{ fontWeight: 500, color: '#1e293b' }}>
                            {ptdRev > 0 ? `₹${Math.round(ptdRev).toLocaleString()}` : '-'}
                          </td>
                          <td style={{ color: '#475569' }}>{row.period_to_date_transactions_count || '-'}</td>
                          <td style={{ color: '#475569' }}>{abvMtd !== '-' ? `₹${abvMtd}` : '-'}</td>
                          <td>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0ca678', background: '#e6fcf5', padding: '2px 8px', borderRadius: '10px' }}>
                              {convMtd}
                            </span>
                          </td>
                          <td>
                            {complaints > 0 ? (
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: '10px' }}>
                                {complaints} Alert
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render Employee Digital Profiles Section
  // Render Employee Digital Profiles Section
  const renderEmployeesSection = (file, sectionNum) => {
    const isCollapsed = Boolean(collapsedSections[file.id]);
    const query = (sectionSearchQueries[file.id] || '').toLowerCase().trim();

    // Use file.data specifically for this connected file's section
    const rows = (file.data && file.data.length > 0) ? file.data : (displayedEmployees || []);

    const filteredEmployees = query
      ? rows.filter((e) =>
          Object.values(e).some((val) => String(val || '').toLowerCase().includes(query))
        )
      : rows;

    // Determine relevant columns to display from file.columns or row keys
    const rawCols = (file.columns && file.columns.length > 0)
      ? file.columns
      : (rows.length > 0 ? Object.keys(rows[0]) : []);

    const internalKeys = new Set(['id', 'emp_id', 'full_name', 'dept', 'role', 'branch', 'email', 'phone', 'rawSalary', 'rawOt', 'sources', 'restIntervals', 'gender', 'dob', 'doj', 'status', 'blood_group', 'manager_name', 'designation', 'department']);
    const hasOriginalKeys = rawCols.some((c) => !internalKeys.has(c));
    let displayCols = hasOriginalKeys ? rawCols.filter((c) => !internalKeys.has(c)) : rawCols;
    if (displayCols.length === 0) displayCols = rawCols;

    const totalRecords = rows.length;
    const activeCount = rows.filter((e) => /active/i.test(String(e['Employment Status'] || e.status || 'Active'))).length;
    const probationCount = rows.filter((e) => /probation|notice|exit|resigned/i.test(String(e['Status'] || e['Employment Status'] || e.status || ''))).length;
    const deptCount = new Set(rows.map((e) => e['Department'] || e['Location'] || e.dept || e.branch).filter(Boolean)).size;

    return (
      <div className="hr-uploaded-section hr-dataset-card" key={file.id}>
        <div className="hr-dataset-header">
          <div className="hr-dataset-title-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="hr-section-badge">Section {sectionNum}</span>
              <h2 className="hr-uploaded-title" style={{ margin: 0 }}>
                {file.name}
              </h2>
              {isPromptFilterActive && (
                <span style={{ fontSize: '11px', background: '#e6fcf5', color: '#0ca678', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  Prompt Filter Active
                </span>
              )}
            </div>
            <p className="hr-dataset-subtitle">
              Workforce Directory · {displayCols.length} Columns, {rows.length} Total Records
            </p>
          </div>

          <div className="hr-dataset-actions-block">
            <span className="hr-records-count-pill">
              ● {filteredEmployees.length} of {totalRecords} Records In Scope
            </span>

            <div className="hr-section-search-wrapper">
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search Emp ID, name, status, role..."
                value={sectionSearchQueries[file.id] || ''}
                onChange={(e) => handleSectionSearchChange(file.id, e.target.value)}
                className="hr-section-search-input"
              />
              {sectionSearchQueries[file.id] && (
                <button
                  type="button"
                  className="hr-search-clear-btn"
                  onClick={() => handleSectionSearchChange(file.id, '')}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {file.downloadUrl && (
              <a
                href={file.downloadUrl}
                download
                className="hr-dataset-btn-subtle"
                title="Download File"
              >
                <Download size={14} />
              </a>
            )}

            <button
              type="button"
              className="hr-dataset-btn-subtle"
              onClick={() => handleToggleSectionCollapse(file.id)}
              title={isCollapsed ? 'Expand Section' : 'Collapse Section'}
            >
              {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <>
            {/* Prompt Active Banner */}
            {isPromptFilterActive && (
              <div className="hr-prompt-active-banner">
                <div className="hr-prompt-banner-left">
                  <div className="hr-prompt-banner-icon">
                    <Sparkles size={16} />
                  </div>
                  <div className="hr-prompt-banner-text">
                    <h4>AI Focus Applied: "{activeAdminPrompt}"</h4>
                    <p>
                      Analyzing {filteredEmployees.length} matching profile{filteredEmployees.length === 1 ? '' : 's'} based on your instructions.
                    </p>
                  </div>
                </div>

                <div className="hr-prompt-banner-actions">
                  <button
                    type="button"
                    className="hr-prompt-banner-btn hr-prompt-banner-btn-secondary"
                    onClick={() => setShowAllProfiles(!showAllProfiles)}
                  >
                    {showAllProfiles ? `Show Filtered (${filteredEmployees.length})` : `Show All (${rows.length})`}
                  </button>

                  <button
                    type="button"
                    className="hr-prompt-banner-btn hr-prompt-banner-btn-secondary"
                    onClick={() => setShowRulesModal(true)}
                  >
                    <Edit3 size={13} style={{ display: 'inline', marginRight: '4px' }} />
                    <span>Change Prompt</span>
                  </button>

                  <button
                    type="button"
                    className="hr-prompt-banner-btn"
                    onClick={handleClearPromptFilter}
                  >
                    <RotateCcw size={13} style={{ display: 'inline', marginRight: '4px' }} />
                    <span>Clear Filter</span>
                  </button>
                </div>
              </div>
            )}

            {/* In-Scope Overview Details Card */}
            <div className="hr-prompt-inscope-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} color="#0ca678" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    Dataset Overview
                  </span>
                  <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '10px' }}>
                    {activeAdminPrompt ? `Prompt: ${activeAdminPrompt}` : 'Direct Tabular Ingestion'}
                  </span>
                </div>

                {latestAnalysis?.healthScore && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#0ca678', background: '#e6fcf5', padding: '3px 10px', borderRadius: '12px' }}>
                    Composite Health: {latestAnalysis.healthScore}%
                  </span>
                )}
              </div>

              <div className="hr-inscope-metrics-row">
                <div className="hr-inscope-metric-pill">
                  <div className="hr-inscope-metric-label">In-Scope Profiles</div>
                  <div className="hr-inscope-metric-val">{filteredEmployees.length} Records</div>
                </div>
                <div className="hr-inscope-metric-pill">
                  <div className="hr-inscope-metric-label">Active Headcount</div>
                  <div className="hr-inscope-metric-val" style={{ color: '#0ca678' }}>
                    {activeCount} Active
                  </div>
                </div>
                <div className="hr-inscope-metric-pill">
                  <div className="hr-inscope-metric-label">Status / Attention</div>
                  <div className="hr-inscope-metric-val" style={{ color: probationCount > 0 ? '#d97706' : '#16a34a' }}>
                    {probationCount > 0 ? `${probationCount} Review / Probation` : 'All Confirmed'}
                  </div>
                </div>
                <div className="hr-inscope-metric-pill">
                  <div className="hr-inscope-metric-label">Workforce Units</div>
                  <div className="hr-inscope-metric-val">
                    {deptCount > 0 ? `${deptCount} Departments` : 'Network Wide'}
                  </div>
                </div>
              </div>

              {latestAnalysis?.attentionSummary && (
                <p style={{ fontSize: '12.5px', color: '#475569', margin: '4px 0 0 0', lineHeight: 1.5, background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #0ca678' }}>
                  <strong>AI Executive Insight:</strong> {latestAnalysis.attentionSummary}
                </p>
              )}
            </div>

            {/* Profiles Table */}
            <div className="hr-table-wrapper" style={{ maxHeight: '440px', overflowY: 'auto', overflowX: 'auto' }}>
              <table className="hr-data-table">
                <thead>
                  <tr>
                    {displayCols.map((c) => (
                      <th key={c} style={{ whiteSpace: 'nowrap' }}>
                        {c.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={displayCols.length || 1} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: '13.5px' }}>
                        No employee profiles match "{query || activeAdminPrompt}".
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp, rIdx) => {
                      const empKey = emp['Emp ID'] || emp['Employee No'] || emp.id || rIdx;
                      return (
                        <tr key={`${empKey}-${rIdx}`}>
                          {displayCols.map((c, cIdx) => {
                            const val = emp[c];
                            const isId = cIdx === 0 || /id|code|no\b/i.test(c);
                            const isStatus = /status/i.test(c);
                            const isEmail = /email/i.test(c);

                            let cellContent = val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '-';

                            let statusColor = 'inherit';
                            if (isStatus) {
                              if (/active/i.test(String(val))) statusColor = '#0ca678';
                              else if (/resigned|exit/i.test(String(val))) statusColor = '#ef4444';
                              else if (/probation/i.test(String(val))) statusColor = '#d97706';
                            }

                            return (
                              <td
                                key={c}
                                style={{
                                  fontFamily: isId ? 'monospace' : 'inherit',
                                  fontWeight: isId || cIdx === 1 ? 600 : 'normal',
                                  color: isId ? '#0f172a' : statusColor,
                                  whiteSpace: isEmail || isId ? 'nowrap' : 'normal'
                                }}
                              >
                                {cellContent}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render Attendance & Roster Telemetry Section
  const renderAttendanceSection = (file, sectionNum) => {
    const isCollapsed = Boolean(collapsedSections[file.id]);
    const query = (sectionSearchQueries[file.id] || '').toLowerCase().trim();
    const rows = file.data || [];

    const filteredRows = query
      ? rows.filter((r) =>
          Object.values(r).some((val) => String(val || '').toLowerCase().includes(query))
        )
      : rows;

    const rawCols = (file.columns && file.columns.length > 0)
      ? file.columns
      : (rows.length > 0 ? Object.keys(rows[0]) : []);

    const internalKeys = new Set(['id', 'emp_id', 'full_name', 'dept', 'role', 'branch', 'email', 'phone', 'rawSalary', 'rawOt', 'sources', 'restIntervals', 'gender', 'dob', 'doj', 'status', 'blood_group', 'manager_name', 'designation', 'department']);
    const hasOriginalKeys = rawCols.some((c) => !internalKeys.has(c));
    let displayCols = hasOriginalKeys ? rawCols.filter((c) => !internalKeys.has(c)) : rawCols;
    if (displayCols.length === 0) displayCols = rawCols;

    const totalOt = rows.reduce(
      (sum, r) => sum + (parseFloat(String(r.overtime_hours || r.ot || r['Overtime Hours'] || 0)) || 0),
      0
    );
    const presentTotal = rows.reduce(
      (sum, r) => sum + (parseFloat(String(r['Present'] || r['Present Days'] || r.presentDays || 0)) || 0),
      0
    );

    return (
      <div className="hr-uploaded-section hr-dataset-card" key={file.id}>
        <div className="hr-dataset-header">
          <div className="hr-dataset-title-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="hr-section-badge">Section {sectionNum}</span>
              <h2 className="hr-uploaded-title" style={{ margin: 0 }}>
                {file.name}
              </h2>
            </div>
            <p className="hr-dataset-subtitle">
              Attendance & Shifts Telemetry · {displayCols.length} Columns, {rows.length} Records
            </p>
          </div>

          <div className="hr-dataset-actions-block">
            <span className="hr-records-count-pill">
              ● {filteredRows.length} of {rows.length} Records
            </span>

            <div className="hr-section-search-wrapper">
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search attendance records..."
                value={sectionSearchQueries[file.id] || ''}
                onChange={(e) => handleSectionSearchChange(file.id, e.target.value)}
                className="hr-section-search-input"
              />
              {sectionSearchQueries[file.id] && (
                <button
                  type="button"
                  className="hr-search-clear-btn"
                  onClick={() => handleSectionSearchChange(file.id, '')}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {file.downloadUrl && (
              <a
                href={file.downloadUrl}
                download
                className="hr-dataset-btn-subtle"
                title="Download File"
              >
                <Download size={14} />
              </a>
            )}

            <button
              type="button"
              className="hr-dataset-btn-subtle"
              onClick={() => handleToggleSectionCollapse(file.id)}
              title={isCollapsed ? 'Expand Section' : 'Collapse Section'}
            >
              {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <>
            <div className="hr-inscope-metrics-row">
              <div className="hr-inscope-metric-pill">
                <div className="hr-inscope-metric-label">Total Records</div>
                <div className="hr-inscope-metric-val">{rows.length} Records</div>
              </div>
              {presentTotal > 0 && (
                <div className="hr-inscope-metric-pill">
                  <div className="hr-inscope-metric-label">Total Present Logged</div>
                  <div className="hr-inscope-metric-val" style={{ color: '#0ca678' }}>
                    {Math.round(presentTotal)} Days
                  </div>
                </div>
              )}
              {totalOt > 0 && (
                <div className="hr-inscope-metric-pill">
                  <div className="hr-inscope-metric-label">Total Overtime Logged</div>
                  <div className="hr-inscope-metric-val" style={{ color: totalOt > 50 ? '#ef4444' : '#0ca678' }}>
                    {totalOt.toFixed(1)} hrs
                  </div>
                </div>
              )}
              <div className="hr-inscope-metric-pill">
                <div className="hr-inscope-metric-label">Dataset Status</div>
                <div className="hr-inscope-metric-val" style={{ color: '#16a34a' }}>
                  All Rows Valid
                </div>
              </div>
            </div>

            <div className="hr-table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto', overflowX: 'auto' }}>
              <table className="hr-data-table">
                <thead>
                  <tr>
                    {displayCols.map((c) => (
                      <th key={c} style={{ whiteSpace: 'nowrap' }}>
                        {c.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={displayCols.length || 1} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: '13.5px' }}>
                        No records match search "{query}".
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, idx) => {
                      const empId = r.employee_id || r.id || r.emp_id || r['Employee No'] || r['Emp ID'] || idx;
                      return (
                        <tr key={`${empId}-${idx}`}>
                          {displayCols.map((c, cIdx) => {
                            const val = r[c];
                            const isId = cIdx === 0 || /id|no\b|code/i.test(c);
                            let cellContent = val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '-';

                            return (
                              <td
                                key={c}
                                style={{
                                  fontFamily: isId ? 'monospace' : 'inherit',
                                  fontWeight: isId || cIdx === 1 ? 600 : 'normal',
                                  color: isId ? '#0f172a' : 'inherit',
                                  whiteSpace: isId ? 'nowrap' : 'normal'
                                }}
                              >
                                {cellContent}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render Generic / Other CSV Section
  const renderGenericSection = (file, sectionNum) => {
    const isCollapsed = Boolean(collapsedSections[file.id]);
    const query = (sectionSearchQueries[file.id] || '').toLowerCase().trim();
    const rows = file.data || [];
    const cols = file.columns || (rows.length > 0 ? Object.keys(rows[0]) : []);

    const filteredRows = query
      ? rows.filter((r) =>
          Object.values(r).some((val) => String(val || '').toLowerCase().includes(query))
        )
      : rows;

    return (
      <div className="hr-uploaded-section hr-dataset-card" key={file.id}>
        <div className="hr-dataset-header">
          <div className="hr-dataset-title-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="hr-section-badge">Section {sectionNum}</span>
              <h2 className="hr-uploaded-title" style={{ margin: 0 }}>
                {file.name}
              </h2>
            </div>
            <p className="hr-dataset-subtitle">
              Connected Dataset Telemetry · {cols.length} Columns, {rows.length} Records
            </p>
          </div>

          <div className="hr-dataset-actions-block">
            <span className="hr-records-count-pill">
              ● {filteredRows.length} of {rows.length} Records
            </span>

            <div className="hr-section-search-wrapper">
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search dataset..."
                value={sectionSearchQueries[file.id] || ''}
                onChange={(e) => handleSectionSearchChange(file.id, e.target.value)}
                className="hr-section-search-input"
              />
              {sectionSearchQueries[file.id] && (
                <button
                  type="button"
                  className="hr-search-clear-btn"
                  onClick={() => handleSectionSearchChange(file.id, '')}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {file.downloadUrl && (
              <a
                href={file.downloadUrl}
                download
                className="hr-dataset-btn-subtle"
                title="Download File"
              >
                <Download size={14} />
              </a>
            )}

            <button
              type="button"
              className="hr-dataset-btn-subtle"
              onClick={() => handleToggleSectionCollapse(file.id)}
              title={isCollapsed ? 'Expand Section' : 'Collapse Section'}
            >
              {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="hr-table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto', overflowX: 'auto' }}>
            <table className="hr-data-table">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c} style={{ whiteSpace: 'nowrap' }}>{c.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={cols.length || 1} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: '13.5px' }}>
                      No records match search "{query}".
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => (
                    <tr key={idx}>
                      {cols.map((c) => (
                        <td key={c} style={{ whiteSpace: /id|no\b/i.test(c) ? 'nowrap' : 'normal' }}>{String(r[c] ?? '-')}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="hr-data-container">
      {/* 1. Header */}
      <div className="hr-data-header">
        <div className="hr-data-header-left">
          <h1>Data</h1>
          <p>Start with spreadsheets. Connect live systems when you are ready.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* MongoDB Atlas Status Pill */}
          <span className="hr-mongo-pill" title="MongoDB Atlas connection active">
            <Database size={13} color="#059669" />
            <span>Atlas Connected</span>
          </span>

          <button
            type="button"
            className="hr-admin-rules-btn"
            onClick={() => setShowRulesModal(true)}
            title="Configure analysis parameters & saved prompts"
          >
            <Sliders size={15} />
            <span>AI & Admin Rules</span>
            {isPromptFilterActive && (
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0ca678' }} />
            )}
          </button>

          <button
            type="button"
            className="hr-admin-rules-btn"
            style={{ background: '#0f172a', color: '#fff', border: 'none' }}
            onClick={() => navigate('/intelligence/hr')}
            title="View HR Dashboard"
          >
            <span>View HR Dashboard</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 2. Upload Dropzone */}
      <div
        className={`hr-upload-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".csv,.xlsx,.xls,.pdf"
          onChange={handleFileSelect}
        />
        <div className="hr-upload-icon-circle">
          {isUploading ? <Loader2 size={24} className="spin" /> : <UploadCloud size={24} />}
        </div>
        <h3 className="hr-upload-title">
          {isUploading ? 'Scanning & Ingesting Dataset...' : 'Drop a CSV, Excel, PDF or paste a Google Sheets link'}
        </h3>
        <p className="hr-upload-subtitle">
          Employees, attendance and branch revenue are the three files the HR Brain needs first.
        </p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            className="hr-choose-file-btn"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Choose a file
          </button>
          <button
            type="button"
            style={{
              padding: '9px 18px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#334155',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowSheetModal(true);
            }}
          >
            Connect Google Sheet
          </button>
        </div>
      </div>

      {/* 3. Uploaded files Section */}
      <div className="hr-uploaded-section">
        <h2 className="hr-uploaded-title">Uploaded files</h2>

        <div className="hr-table-wrapper">
          <table className="hr-data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Holds</th>
                <th>Rows</th>
                <th>Period</th>
                <th>Checks</th>
                <th style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploadedFiles.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: '13.5px' }}>
                    No files uploaded yet. Drag and drop CSV or Excel datasets above to begin.
                  </td>
                </tr>
              ) : (
                uploadedFiles.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleOpenFilePreview(item)}
                    title="Click to preview file rows & download"
                  >
                    <td className="hr-file-name-cell">
                      <FileSpreadsheet size={16} color="#0ca678" />
                      <span>{item.name}</span>
                    </td>
                    <td className="hr-holds-cell">{item.holds}</td>
                    <td className="hr-rows-cell">{item.rows}</td>
                    <td className="hr-period-cell">{item.period}</td>
                    <td>
                      <span className="hr-check-badge">
                        <CheckCircle2 size={12} />
                        <span>{item.status}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                      <button
                        type="button"
                        className="hr-table-delete-btn"
                        onClick={(e) => handleDeleteFile(e, item)}
                        title="Delete file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Connected Dataset Sections (One dedicated section per connected CSV file; if 2+ files, shows both details like 2 sections) */}
      <div className="hr-connected-datasets-wrapper" style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {uploadedFiles.length === 0 ? (
          <div className="hr-uploaded-section hr-dataset-card hr-empty-dataset-card">
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <Database size={26} color="#64748b" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 6px 0' }}>
                No Connected Datasets
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '460px', margin: '0 auto', lineHeight: 1.5 }}>
                Connect a Sales CSV, Employee Master, or Shift Roster above. Each connected CSV will automatically render its own dedicated, live telemetry section here.
              </p>
            </div>
          </div>
        ) : (
          uploadedFiles.map((file, idx) => {
            const category = getDatasetCategory(file);
            const sectionNum = idx + 1;
            if (category === 'sales') return renderSalesSection(file, sectionNum);
            if (category === 'employees') return renderEmployeesSection(file, sectionNum);
            if (category === 'attendance') return renderAttendanceSection(file, sectionNum);
            return renderGenericSection(file, sectionNum);
          })
        )}
      </div>

      {/* =========================================================================
          5. PRE-CONNECTION PROMPT CONFIRMATION MODAL
          Automatically asks user to configure or skip prompt before connecting
      ========================================================================= */}
      {showPromptConfirmModal && pendingUpload && (
        <div className="hr-modal-overlay" onClick={() => !isUploading && setShowPromptConfirmModal(false)}>
          <div className="hr-prompt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#0ca678" />
                <span>Configure AI Prompt Before Connecting Document</span>
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => !isUploading && setShowPromptConfirmModal(false)}
                disabled={isUploading}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <FileSpreadsheet size={16} color="#0ca678" />
              <div style={{ flex: 1, fontSize: '12.5px', color: '#1e293b' }}>
                Connecting: <strong>{pendingUpload.file?.name}</strong> ({((pendingUpload.file?.size || 0) / 1024).toFixed(1)} KB)
              </div>
              <span className="hr-mongo-pill">
                <Database size={12} />
                <span>MongoDB Atlas</span>
              </span>
            </div>

            <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
              How would you like the AI to analyze this document? You can proceed with no prompt, use the active one, or pick a saved prompt:
            </p>

            <div className="hr-prompt-choice-list">
              {/* Option 1: No Prompt Needed (Default) */}
              <div
                className={`hr-prompt-choice-card ${confirmModalChoice === 'none' ? 'selected' : ''}`}
                onClick={() => setConfirmModalChoice('none')}
              >
                <div className="hr-prompt-radio-dot">
                  {confirmModalChoice === 'none' && <div className="hr-prompt-radio-inner" />}
                </div>
                <div className="hr-prompt-choice-content">
                  <div className="hr-prompt-choice-header">
                    <span className="hr-prompt-choice-title">No prompt needed</span>
                    <span className="hr-prompt-badge-default">Default</span>
                  </div>
                  <p className="hr-prompt-choice-desc">
                    Perform autonomous AI analysis across all workforce data and detect universal management benchmarks automatically.
                  </p>
                </div>
              </div>

              {/* Option 2: Use Same / Active Prompt (if one exists) */}
              {activeAdminPrompt && (
                <div
                  className={`hr-prompt-choice-card ${confirmModalChoice === 'active' ? 'selected' : ''}`}
                  onClick={() => setConfirmModalChoice('active')}
                >
                  <div className="hr-prompt-radio-dot">
                    {confirmModalChoice === 'active' && <div className="hr-prompt-radio-inner" />}
                  </div>
                  <div className="hr-prompt-choice-content">
                    <div className="hr-prompt-choice-header">
                      <span className="hr-prompt-choice-title">Use Active Prompt</span>
                      <span className="hr-prompt-badge-active">Currently Active</span>
                    </div>
                    <p className="hr-prompt-choice-desc">
                      "{activeAdminPrompt}"
                    </p>
                  </div>
                </div>
              )}

              {/* Option 3: Choose from Saved Prompts */}
              {savedPrompts.length > 0 && (
                <div
                  className={`hr-prompt-choice-card ${confirmModalChoice === 'saved' ? 'selected' : ''}`}
                  onClick={() => setConfirmModalChoice('saved')}
                >
                  <div className="hr-prompt-radio-dot">
                    {confirmModalChoice === 'saved' && <div className="hr-prompt-radio-inner" />}
                  </div>
                  <div className="hr-prompt-choice-content">
                    <div className="hr-prompt-choice-header">
                      <span className="hr-prompt-choice-title">Select from Saved Prompts ({savedPrompts.length})</span>
                    </div>
                    <p className="hr-prompt-choice-desc">
                      Choose a previously saved prompt from MongoDB Atlas:
                    </p>

                    {confirmModalChoice === 'saved' && (
                      <div style={{ marginTop: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <select
                          className="hr-modal-input"
                          value={confirmModalSelectedPromptId}
                          onChange={(e) => setConfirmModalSelectedPromptId(e.target.value)}
                          style={{ background: '#fff' }}
                        >
                          {savedPrompts.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.title}: "{p.promptText.substring(0, 50)}..."
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Option 4: Enter New Custom Prompt */}
              <div
                className={`hr-prompt-choice-card ${confirmModalChoice === 'custom' ? 'selected' : ''}`}
                onClick={() => setConfirmModalChoice('custom')}
              >
                <div className="hr-prompt-radio-dot">
                  {confirmModalChoice === 'custom' && <div className="hr-prompt-radio-inner" />}
                </div>
                <div className="hr-prompt-choice-content">
                  <div className="hr-prompt-choice-header">
                    <span className="hr-prompt-choice-title">Write New Custom Prompt</span>
                  </div>
                  <p className="hr-prompt-choice-desc">
                    Provide manual focus instructions for Claude AI to analyze specific roles, departments, or conditions.
                  </p>

                  {confirmModalChoice === 'custom' && (
                    <div style={{ marginTop: '10px' }} onClick={(e) => e.stopPropagation()}>
                      <textarea
                        className="hr-modal-textarea"
                        rows={2}
                        value={confirmModalPromptText}
                        onChange={(e) => setConfirmModalPromptText(e.target.value)}
                        placeholder="e.g. only show FASHION CONSULTANT data"
                        autoFocus
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <input
                          type="checkbox"
                          id="saveToAtlasCheck"
                          checked={confirmModalSaveToDb}
                          onChange={(e) => setConfirmModalSaveToDb(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <label htmlFor="saveToAtlasCheck" style={{ fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                          Save to MongoDB Atlas (e.g. Prompt {savedPrompts.length + 1})
                        </label>
                      </div>

                      {confirmModalSaveToDb && (
                        <input
                          type="text"
                          className="hr-modal-input"
                          style={{ marginTop: '6px' }}
                          placeholder={`Custom Title (default: Prompt ${savedPrompts.length + 1})`}
                          value={confirmModalNewTitle}
                          onChange={(e) => setConfirmModalNewTitle(e.target.value)}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="hr-modal-actions">
              <button
                type="button"
                className="hr-prompt-banner-btn hr-prompt-banner-btn-secondary"
                onClick={() => setShowPromptConfirmModal(false)}
                disabled={isUploading}
              >
                Cancel
              </button>

              <button
                type="button"
                style={{
                  padding: '9px 20px',
                  background: '#0ca678',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={handleConfirmPromptAndConnect}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
                <span>{isUploading ? 'Connecting File...' : 'Connect Document'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. ADMIN RULES & SAVED PROMPTS MODAL
      ========================================================================= */}
      {showRulesModal && (
        <div className="hr-modal-overlay" onClick={() => !isRecalculating && setShowRulesModal(false)}>
          <div className="hr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#0ca678" />
                <span>AI & Admin Analysis Rules</span>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="hr-mongo-pill">
                  <Database size={11} />
                  <span>MongoDB Atlas</span>
                </span>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => setShowRulesModal(false)}
                  disabled={isRecalculating}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <p style={{ fontSize: '12.5px', color: '#64748b' }}>
              Set custom parameters and AI prompts. Prompts are persisted in MongoDB Atlas so you can reuse Prompt 1, Prompt 2, etc. anytime.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
              {/* Saved Prompts Chip Selector */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Saved Prompts (from MongoDB Atlas)</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Default is "No Prompt"</span>
                </label>

                <div className="hr-saved-prompts-bar">
                  <button
                    type="button"
                    className={`hr-saved-prompt-chip ${!adminPrompt && !activeSavedPromptId ? 'active' : ''}`}
                    onClick={handleSelectNoPrompt}
                  >
                    <span>No Prompt (Default)</span>
                  </button>

                  {savedPrompts.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      className={`hr-saved-prompt-chip ${activeSavedPromptId === p._id ? 'active' : ''}`}
                      onClick={() => handleSelectSavedPrompt(p)}
                      title={`"${p.promptText}"`}
                    >
                      <span>{p.title}</span>
                      <span
                        className="chip-delete"
                        onClick={(e) => handleDeleteSavedPrompt(e, p._id)}
                        title="Delete from MongoDB"
                      >
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 1: Target Attrition & Productivity Baseline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Target Attrition Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="hr-modal-input"
                    value={targetAttrition}
                    onChange={(e) => setTargetAttrition(e.target.value)}
                    placeholder="5.0"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Productivity Baseline (%)
                  </label>
                  <input
                    type="number"
                    className="hr-modal-input"
                    value={targetProductivity}
                    onChange={(e) => setTargetProductivity(e.target.value)}
                    placeholder="90"
                  />
                </div>
              </div>

              {/* Row 2: Manual Department Focus & Attention Priority Filter */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Focus Department / Team
                  </label>
                  <select
                    className="hr-modal-input"
                    value={targetDepartment}
                    onChange={(e) => setTargetDepartment(e.target.value)}
                    style={{ background: '#fff' }}
                  >
                    <option value="All">All Departments (Auto-Detect)</option>
                    <option value="Sales">Sales & Business Development</option>
                    <option value="Retail">Retail & Store Operations</option>
                    <option value="Operations">Operations & Logistics</option>
                    <option value="Engineering">Engineering & Product</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Dashboard Severity Focus
                  </label>
                  <select
                    className="hr-modal-input"
                    value={focusPriority}
                    onChange={(e) => setFocusPriority(e.target.value)}
                    style={{ background: '#fff' }}
                  >
                    <option value="All">All Severity Levels</option>
                    <option value="Critical">Critical Issues Only</option>
                    <option value="Need investigation">Needs Investigation</option>
                    <option value="Opportunity">Opportunities Only</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Calculation Mode & Reporting Period */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Calculation Mode
                  </label>
                  <select
                    className="hr-modal-input"
                    value={calculationMode}
                    onChange={(e) => setCalculationMode(e.target.value)}
                    style={{ background: '#fff' }}
                  >
                    <option value="hybrid">Hybrid (Custom Rules + AI)</option>
                    <option value="manual">Strict Manual Parameters</option>
                    <option value="autonomous">Fully Autonomous AI</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Reporting Date Horizon
                  </label>
                  <input
                    type="text"
                    className="hr-modal-input"
                    value={timeHorizon}
                    onChange={(e) => setTimeHorizon(e.target.value)}
                    placeholder="e.g. 01-30 Sep 2026"
                  />
                </div>
              </div>

              {/* Row 4: Prompting Instructions for AI */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Admin Prompt / Focus Instructions for AI</span>
                  {activeSavedPromptId && (
                    <span style={{ color: '#0ca678' }}>
                      Loaded from {savedPrompts.find((p) => p._id === activeSavedPromptId)?.title}
                    </span>
                  )}
                </label>
                <textarea
                  className="hr-modal-textarea"
                  rows={2}
                  value={adminPrompt}
                  onChange={(e) => setAdminPrompt(e.target.value)}
                  placeholder="e.g. only show FASHION CONSULTANT data"
                />

                {/* Save Prompt to MongoDB Atlas controls */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="hr-modal-input"
                    style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                    placeholder={`Name (default: Prompt ${savedPrompts.length + 1})`}
                    value={newPromptTitle}
                    onChange={(e) => setNewPromptTitle(e.target.value)}
                  />
                  <button
                    type="button"
                    style={{
                      padding: '7px 12px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: isSavingPrompt ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={handleSaveCurrentPromptToAtlas}
                    disabled={isSavingPrompt}
                  >
                    {isSavingPrompt ? 'Saving...' : 'Save as New Prompt in MongoDB'}
                  </button>
                </div>
              </div>

              <div className="hr-modal-actions" style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                  onClick={() => setShowRulesModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  style={{
                    padding: '8px 18px',
                    background: '#0ca678',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isRecalculating ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={handleApplyRules}
                  disabled={isRecalculating}
                >
                  {isRecalculating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                  <span>{isRecalculating ? 'Re-Calculating...' : 'Apply & Re-Calculate'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Preview Modal */}
      {previewFile && (
        <div className="hr-modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="hr-modal-card hr-preview-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal-header">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={18} color="#0ca678" />
                  <span>{previewFile.name}</span>
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Previewing {previewFile.data?.length || 0} rows of {previewFile.rowsCount || previewFile.data?.length || 0} total records
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={`/api/hr/files/${previewFile.savedFilename || previewFile.name}/download`}
                  className="hr-action-icon-btn"
                  download
                  title="Download raw file"
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  className="hr-action-icon-btn hr-action-danger-btn"
                  onClick={(e) => handleDeleteFile(e, previewFile)}
                  title="Delete file from server"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                  onClick={() => setPreviewFile(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="hr-preview-scroll-area">
              <table className="hr-preview-table">
                <thead>
                  <tr>
                    {previewFile.columns?.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewFile.data?.map((row, idx) => (
                    <tr key={idx}>
                      {previewFile.columns?.map((col) => (
                        <td key={col}>{String(row[col] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="hr-modal-actions" style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="hr-action-icon-btn"
                onClick={() => {
                  setPreviewFile(null);
                  navigate('/intelligence/hr');
                }}
                style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px' }}
              >
                <span>View in HR Intelligence</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Google Sheets Modal */}
      {showSheetModal && (
        <div className="hr-modal-overlay" onClick={() => setShowSheetModal(false)}>
          <div className="hr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal-header">
              <h3>Connect Google Sheet</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowSheetModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Paste the public or shared Google Sheets link to sync live workforce records.
            </p>
            <form onSubmit={handleAddSheet} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="url"
                className="hr-modal-input"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                required
              />
              <div className="hr-modal-actions">
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                  onClick={() => setShowSheetModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: '#0f172a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  Connect & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Modern Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0f172a',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '14px 20px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            zIndex: 9999,
            maxWidth: '480px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <Sparkles size={20} color="#0ca678" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{toast.title}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', lineHeight: 1.4 }}>{toast.message}</div>
          </div>
          {toast.showViewDashboard && (
            <button
              type="button"
              style={{
                background: '#0ca678',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              onClick={() => {
                setToast(null);
                navigate('/intelligence/hr');
              }}
            >
              View Dashboard →
            </button>
          )}
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
