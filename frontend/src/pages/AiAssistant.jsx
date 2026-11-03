import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import botLogo from '../assets/bot-logo.png';
import {
  BrainCircuit,
  TriangleAlert,
  User,
  UserCheck,
  GitBranch,
  Wallet,
  Briefcase,
  ArrowRight,
  Link2,
  Mic,
  Send,
  Sparkles,
  Database,
  Building,
  ShoppingCart,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
  Cpu,
  FileSpreadsheet,
  UploadCloud,
  Clock,
  Plus,
  MessageSquare,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  PanelLeft,
  ShieldCheck,
  Home,
  Compass,
  BookOpen,
  Square,
  Paperclip,
  Lightbulb,
  Wand2,
  Globe,
  ChevronDown
} from 'lucide-react';
import {
  sendChatMessage,
  checkAiStatus,
  AVAILABLE_MODELS,
  getStoredModel,
  setStoredModel
} from '../services/aiService';
import FormattedChatMessage from '../components/FormattedChatMessage';
import './AiAssistant.css';

// Helper to render AI markdown-style text with bolding and lists
function FormattedAiContent({ content, bullets, title }) {
  if (bullets && bullets.length > 0) {
    return (
      <div className="ai-rendered-content">
        {title && <h4>{title}</h4>}
        {content && <FormattedChatMessage content={content} />}
        <ul>
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="ai-rendered-content">
      {title && <h4>{title}</h4>}
      <FormattedChatMessage content={content} />
    </div>
  );
}

// Group conversations by date (ChatGPT / Claude style)
function groupConversationsByDate(convList = []) {
  const groups = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: []
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const last7DaysStart = todayStart - 6 * 86400000;

  convList.forEach((conv) => {
    const time = new Date(conv.updatedAt || conv.createdAt).getTime();
    if (time >= todayStart) {
      groups.today.push(conv);
    } else if (time >= yesterdayStart) {
      groups.yesterday.push(conv);
    } else if (time >= last7DaysStart) {
      groups.previous7Days.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  return groups;
}

export function getTimeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function createInitialGreeting(analysis) {
  const greeting = getTimeOfDayGreeting();
  return {
    id: 'greeting-dynamic',
    sender: 'assistant',
    text: `${greeting}! I'm your Senior Workforce & People Intelligence Partner. I'm actively monitoring our live retail telemetry across all 25 retail branches (204 employee profiles, camera footfall audits, sales quotas). Whether you'd like to inspect store performance, employee 360 reviews, footfall variance, or executive workforce optimization, I'm ready to assist you. What area would you like to review?`,
    role: 'Workforce Advisor'
  };
}

export default function AiAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(getStoredModel());
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const chatBottomRef = useRef(null);
  const chatStreamRef = useRef(null);

  // Live connected datasets state from backend
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [latestAnalysis, setLatestAnalysis] = useState(null);

  // ChatGPT / Claude style Chat History state
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isContextOpen, setIsContextOpen] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitleText, setEditingTitleText] = useState('');

  // Active chat messages - dynamically time-aware
  const [messages, setMessages] = useState([createInitialGreeting()]);

  // Fetch conversations from MongoDB Atlas
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/ai/conversations');
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.warn('Could not fetch conversations from MongoDB Atlas:', err);
    }
  };

  // Check AI connection & fetch uploaded datasets on mount
  useEffect(() => {
    checkAiStatus().then((res) => {
      if (res && res.connected) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('offline');
      }
    });

    const fetchDatasets = async () => {
      try {
        const [filesRes, analysisRes] = await Promise.all([
          fetch('/api/hr/files'),
          fetch('/api/hr/analysis')
        ]);
        const filesData = await filesRes.json();
        const analysisData = await analysisRes.json();
        if (filesData.status === 'success' && filesData.files) {
          setUploadedFiles(filesData.files);
        }
        if (analysisData.status === 'success' && analysisData.data) {
          setLatestAnalysis(analysisData.data);
        }
      } catch (err) {
        console.warn('Could not load connected datasets in assistant:', err);
      }
    };

    fetchDatasets();
    fetchConversations();

    if (location.state?.initialPrompt) {
      handleSend(location.state.initialPrompt);
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Total records across connected datasets
  const totalConnectedRecords = useMemo(() => {
    return uploadedFiles.reduce((acc, f) => acc + (f.rows || 0), 0);
  }, [uploadedFiles]);

  // Ensure page always starts cleanly at top on reload/mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-scroll chat stream only when new messages are added (not on initial mount with greeting)
  useEffect(() => {
    if (messages.length > 1) {
      if (chatStreamRef.current) {
        chatStreamRef.current.scrollTo({
          top: chatStreamRef.current.scrollHeight,
          behavior: 'smooth'
        });
      } else if (chatBottomRef.current) {
        chatBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [messages, isLoading]);

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    setStoredModel(newModel);
  };

  // Select a previous conversation to view & continue
  const handleSelectConversation = async (convId) => {
    if (activeConversationId === convId) return;
    setActiveConversationId(convId);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/ai/conversations/${convId}`);
      const data = await res.json();
      if (data.status === 'success' && data.conversation) {
        const loadedMessages = data.conversation.messages || [];
        setMessages(loadedMessages.length > 0 ? loadedMessages : [createInitialGreeting(latestAnalysis)]);
        if (data.conversation.model) {
          setSelectedModel(data.conversation.model);
        }
      }
    } catch (err) {
      console.error('Error loading conversation from MongoDB Atlas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Start a new chat session (+ New Chat)
  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([createInitialGreeting(latestAnalysis)]);
    setInputText('');
  };

  // Rename a conversation in MongoDB Atlas
  const handleSaveRename = async (convId) => {
    if (!editingTitleText.trim()) {
      setEditingConvId(null);
      return;
    }

    try {
      const res = await fetch(`/api/ai/conversations/${convId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitleText.trim() })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setConversations((prev) =>
          prev.map((c) => (c._id === convId || c.id === convId ? { ...c, title: editingTitleText.trim() } : c))
        );
      }
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    } finally {
      setEditingConvId(null);
      setEditingTitleText('');
    }
  };

  // Delete a conversation from MongoDB Atlas
  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation history from MongoDB Atlas?')) {
      return;
    }

    try {
      const res = await fetch(`/api/ai/conversations/${convId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setConversations((prev) => prev.filter((c) => c._id !== convId && c.id !== convId));
        if (activeConversationId === convId) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Send message and persist both prompt and AI response into MongoDB Atlas
  const handleSend = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    // 1. Add user message
    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      createdAt: new Date().toISOString()
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    let currentId = activeConversationId;

    try {
      // 2. If this is a new conversation session, create it in MongoDB Atlas
      if (!currentId) {
        try {
          const createRes = await fetch('/api/ai/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: query.length > 38 ? query.substring(0, 36) + '...' : query,
              messages: [userMsg],
              model: selectedModel,
              connectedFilesCount: uploadedFiles.length
            })
          });
          const createData = await createRes.json();
          if (createData.status === 'success' && createData.conversation) {
            currentId = createData.conversation._id || createData.conversation.id;
            setActiveConversationId(currentId);
            setConversations((prev) => [createData.conversation, ...prev.filter((c) => (c._id || c.id) !== currentId)]);
            fetchConversations();
          }
        } catch (dbErr) {
          console.warn('MongoDB conversation creation fallback:', dbErr);
        }
      }

      // 3. Call AI Intelligence Gateway (Claude)
      const response = await sendChatMessage(updatedMessages, {
        model: selectedModel
      });

      const assistantMsg = {
        id: `ast-${Date.now() + 1}`,
        sender: 'assistant',
        text: response.content,
        model: response.model || selectedModel,
        source: response.source,
        createdAt: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      // 4. Persist updated messages to MongoDB Atlas
      if (currentId) {
        try {
          await fetch(`/api/ai/conversations/${currentId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: finalMessages,
              model: selectedModel
            })
          });
          setConversations((prev) =>
            prev.map((c) =>
              (c._id || c.id) === currentId
                ? { ...c, lastMessageSnippet: (assistantMsg.text || '').slice(0, 60), updatedAt: new Date().toISOString() }
                : c
            )
          );
          fetchConversations();
        } catch (dbSaveErr) {
          console.warn('Could not save messages to MongoDB:', dbSaveErr);
        }
      }
    } catch (err) {
      console.error('AI chat failed:', err);
      const errorMsg = {
        id: `err-${Date.now() + 1}`,
        sender: 'assistant',
        title: 'AI Connection Notice',
        text: `Unable to get response: ${err.message || 'Error communicating with AI engine.'} Please verify your API key in Settings.`,
        isError: true,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // 4 Strategic Advisory Cards generated dynamically based on connected workforce data & live retail telemetry
  const promptCards = useMemo(() => {
    const cards = [];
    const attentionItems = latestAnalysis?.attentionItems || [];

    // Dynamically populate from real attention items
    if (attentionItems.length > 0) {
      attentionItems.slice(0, 4).forEach((item, idx) => {
        const titleStr = item.title || item.flagType || 'workforce telemetry pattern';
        cards.push({
          id: item.id || `issue-${idx + 1}`,
          category: (item.category || 'RETAIL TELEMETRY').toUpperCase(),
          icon: <TriangleAlert size={16} />,
          text: `Why did "${titleStr.slice(0, 52)}" occur and what is the strategic remedy?`
        });
      });
    }

    // Add cards from real connected datasets if space remains
    if (cards.length < 4 && uploadedFiles && uploadedFiles.length > 0) {
      uploadedFiles.slice(0, 2).forEach((f, idx) => {
        if (cards.length < 4) {
          cards.push({
            id: `dataset-${idx}`,
            category: 'DATASET INSIGHT',
            icon: <FileSpreadsheet size={16} />,
            text: `Evaluate workforce trends and headcount signals from "${f.name}"`
          });
        }
      });
    }

    // Fill remaining slots with clean, non-mock operational inquiries
    const defaultInquiries = [
      {
        id: 'quota-variance',
        category: 'SALES & QUOTA',
        icon: <TriangleAlert size={16} />,
        text: 'Which retail branches have the highest target vs actual net sales variances?'
      },
      {
        id: 'workforce-roster',
        category: 'ROSTER & SHIFTS',
        icon: <Clock size={16} />,
        text: 'Evaluate workforce attendance rosters, rest turnaround intervals, and overtime'
      },
      {
        id: 'talent-retention',
        category: 'TALENT RETENTION',
        icon: <UserCheck size={16} />,
        text: 'List employees currently in notice period, probation, or approaching confirmation'
      },
      {
        id: 'audit-discrepancies',
        category: 'COMPLIANCE & AUDIT',
        icon: <GitBranch size={16} />,
        text: 'Review operational audit scores and register discrepancies across store locations'
      }
    ];

    for (const item of defaultInquiries) {
      if (cards.length >= 4) break;
      cards.push(item);
    }

    return cards.slice(0, 4);
  }, [uploadedFiles, latestAnalysis]);

  // Suggested Follow-ups derived dynamically from connected datasets & live telemetry
  const suggestedFollowUps = useMemo(() => {
    const list = [];

    if (latestAnalysis?.attentionItems?.length > 0) {
      latestAnalysis.attentionItems.forEach((item) => {
        const itemTitle = item.title || item.flagType || null;
        if (itemTitle) {
          list.push(`What is the recommended remedy for "${itemTitle.slice(0, 42)}..."?`);
        }
      });
    }

    if (uploadedFiles && uploadedFiles.length > 0) {
      uploadedFiles.forEach((f) => {
        const lower = f.name.toLowerCase();
        if (lower.includes('attend') || f.holds?.includes('Attendance')) {
          list.push(`Which employees recorded rest intervals under 10 hours in ${f.name}?`);
          list.push(`Analyze shift turnaround compliance and overtime patterns from ${f.name}`);
        }
        if (lower.includes('employee') || f.holds?.includes('Payroll') || f.holds?.includes('People')) {
          list.push(`List employees currently on probation or notice period in ${f.name}`);
          list.push(`What is our monthly payroll cost breakdown by role from ${f.name}?`);
        }
        if (lower.includes('sale') || f.holds?.includes('Revenue')) {
          list.push(`Which branch achieved the highest quota attainment in ${f.name}?`);
        }
      });
    }

    // Default dynamic inquiry inquiries when telemetry is pending
    if (list.length < 5) {
      const generalQueries = [
        'Which retail branches have the lowest quota attainment?',
        'Analyze attendance roster compliance and shift rest turnaround intervals',
        'List active employees with upcoming confirmation dates',
        'Review store audit scores and operational discrepancy logs',
        'Compare sales performance across connected store locations'
      ];
      for (const gq of generalQueries) {
        if (list.length >= 5) break;
        if (!list.includes(gq)) list.push(gq);
      }
    }

    return Array.from(new Set(list)).slice(0, 5);
  }, [uploadedFiles, latestAnalysis]);

  // Filtered & grouped conversation history
  const filteredConversations = useMemo(() => {
    if (!historySearch.trim()) return conversations;
    const term = historySearch.toLowerCase();
    return conversations.filter(
      (c) =>
        (c.title || '').toLowerCase().includes(term) ||
        (c.lastMessageSnippet || '').toLowerCase().includes(term)
    );
  }, [conversations, historySearch]);

  const conversationGroups = useMemo(() => {
    return groupConversationsByDate(filteredConversations);
  }, [filteredConversations]);

  // Active navigation tab on the left sidebar
  const [activeNavTab, setActiveNavTab] = useState('Home');
  const [activeModelMenuOpen, setActiveModelMenuOpen] = useState(false);

  // Selected prompt mode chip (Reasoning, Create Image, Deep Research)
  const [activeChip, setActiveChip] = useState('Reasoning');

  return (
    <div className="bee-window-container">
      {/* 1. TOP WINDOW TAB BAR (macOS / browser pill tab style from mockup) */}
      <div className="bee-window-topbar">
        <div className="bee-topbar-tabs-left">
          <button type="button" className="bee-window-tab-add" title="New Tab" onClick={handleNewChat}>
            <Plus size={13} />
          </button>
          <div className="bee-window-tab">
            <span className="bee-tab-dot-orange"></span>
            <span className="bee-tab-title">Brynex | Workforce</span>
            <button type="button" className="bee-tab-close" onClick={(e) => { e.stopPropagation(); }}>
              <X size={11} />
            </button>
          </div>
          <div className="bee-window-tab">
            <span className="bee-tab-badge-blue">E</span>
            <span className="bee-tab-title">Executive Studio</span>
          </div>
          <div className="bee-window-tab active">
            <span className="bee-tab-icon-logo">
              <Sparkles size={12} color="#00a876" />
            </span>
            <span className="bee-tab-title">Brynex AI</span>
            <button type="button" className="bee-tab-close" onClick={handleNewChat}>
              <X size={11} />
            </button>
          </div>
        </div>

        {/* Right window control buttons */}
        <div className="bee-topbar-window-controls">
          <button type="button" className="bee-win-btn" title="Minimize">
            <span>&minus;</span>
          </button>
          <button type="button" className="bee-win-btn" title="Maximize">
            <Square size={10} />
          </button>
          <button type="button" className="bee-win-btn close" title="Close" onClick={() => navigate('/intelligence/hr')}>
            <X size={11} />
          </button>
        </div>
      </div>

      {/* 2. INNER APPLICATION WORKSPACE (Split Left Sidebar + Main Canvas) */}
      <div className="bee-app-body">
        {/* =========================================================================
            LEFT COLUMN: BRYNEX AI SIDEBAR (Search, Navigation, History, User Profile)
        ========================================================================= */}
        <aside className="bee-sidebar">
          {/* Brand Header */}
          <div className="bee-sidebar-brand" onClick={() => navigate('/workspace')}>
            <div className="bee-brand-icon-wrap">
              <img src={botLogo} alt="Brynex AI Logo" className="bee-brand-logo-img" />
            </div>
            <span className="bee-brand-name">Brynex AI</span>
          </div>

          {/* Search Input Box with Shortcut Badge */}
          <div className="bee-sidebar-search-box">
            <Search size={13} className="bee-search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="bee-search-input"
            />
            <span className="bee-search-shortcut">⌘K</span>
          </div>

          {/* Primary Navigation Links */}
          <nav className="bee-sidebar-nav">
            <button
              type="button"
              className={`bee-nav-link ${activeNavTab === 'Home' ? 'active' : ''}`}
              onClick={() => {
                setActiveNavTab('Home');
                handleNewChat();
              }}
            >
              <Home size={15} />
              <span>Home</span>
            </button>
            <button
              type="button"
              className={`bee-nav-link ${activeNavTab === 'Explore' ? 'active' : ''}`}
              onClick={() => {
                setActiveNavTab('Explore');
                navigate('/intelligence/hr');
              }}
            >
              <Compass size={15} />
              <span>Explore</span>
            </button>
            <button
              type="button"
              className={`bee-nav-link ${activeNavTab === 'Library' ? 'active' : ''}`}
              onClick={() => {
                setActiveNavTab('Library');
                navigate('/intelligence/hr/data');
              }}
            >
              <BookOpen size={15} />
              <span>Library</span>
            </button>
            <button
              type="button"
              className={`bee-nav-link ${activeNavTab === 'History' ? 'active' : ''}`}
              onClick={() => setActiveNavTab('History')}
            >
              <Clock size={15} />
              <span>History</span>
            </button>
          </nav>

          {/* Grouped Chronological Conversations Section */}
          <div className="bee-sidebar-history-section">
            {conversations.length === 0 ? (
              <div className="bee-history-empty">
                <div className="bee-history-category-title">Recent Chats</div>
                <div className="bee-history-empty-sub">
                  Start a new query to save sessions in history.
                </div>
              </div>
            ) : (
              <>
                {/* Today */}
                {conversationGroups.today.length > 0 && (
                  <div className="bee-history-group">
                    <div className="bee-history-category-title">Tomorrow / Today</div>
                    {conversationGroups.today.map((conv) => (
                      <div
                        key={conv._id || conv.id}
                        className={`bee-history-item ${activeConversationId === (conv._id || conv.id) ? 'active' : ''}`}
                        onClick={() => handleSelectConversation(conv._id || conv.id)}
                      >
                        {editingConvId === (conv._id || conv.id) ? (
                          <input
                            type="text"
                            value={editingTitleText}
                            onChange={(e) => setEditingTitleText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(conv._id || conv.id);
                              if (e.key === 'Escape') setEditingConvId(null);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="bee-history-edit-input"
                          />
                        ) : (
                          <span className="bee-history-item-title" title={conv.title}>
                            {conv.title}
                          </span>
                        )}
                        <button
                          type="button"
                          className="bee-history-item-delete"
                          title="Delete"
                          onClick={(e) => handleDeleteConversation(e, conv._id || conv.id)}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Yesterday */}
                {conversationGroups.yesterday.length > 0 && (
                  <div className="bee-history-group">
                    <div className="bee-history-category-title">Yesterday</div>
                    {conversationGroups.yesterday.map((conv) => (
                      <div
                        key={conv._id || conv.id}
                        className={`bee-history-item ${activeConversationId === (conv._id || conv.id) ? 'active' : ''}`}
                        onClick={() => handleSelectConversation(conv._id || conv.id)}
                      >
                        <span className="bee-history-item-title" title={conv.title}>
                          {conv.title}
                        </span>
                        <button
                          type="button"
                          className="bee-history-item-delete"
                          title="Delete"
                          onClick={(e) => handleDeleteConversation(e, conv._id || conv.id)}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 7 Days Ago */}
                {conversationGroups.previous7Days.length > 0 && (
                  <div className="bee-history-group">
                    <div className="bee-history-category-title">7 Days Ago</div>
                    {conversationGroups.previous7Days.map((conv) => (
                      <div
                        key={conv._id || conv.id}
                        className={`bee-history-item ${activeConversationId === (conv._id || conv.id) ? 'active' : ''}`}
                        onClick={() => handleSelectConversation(conv._id || conv.id)}
                      >
                        <span className="bee-history-item-title" title={conv.title}>
                          {conv.title}
                        </span>
                        <button
                          type="button"
                          className="bee-history-item-delete"
                          title="Delete"
                          onClick={(e) => handleDeleteConversation(e, conv._id || conv.id)}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Older */}
                {conversationGroups.older.length > 0 && (
                  <div className="bee-history-group">
                    <div className="bee-history-category-title">Older</div>
                    {conversationGroups.older.map((conv) => (
                      <div
                        key={conv._id || conv.id}
                        className={`bee-history-item ${activeConversationId === (conv._id || conv.id) ? 'active' : ''}`}
                        onClick={() => handleSelectConversation(conv._id || conv.id)}
                      >
                        <span className="bee-history-item-title" title={conv.title}>
                          {conv.title}
                        </span>
                        <button
                          type="button"
                          className="bee-history-item-delete"
                          title="Delete"
                          onClick={(e) => handleDeleteConversation(e, conv._id || conv.id)}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* User Profile Pill at Bottom of Left Sidebar */}
          <div className="bee-sidebar-user-card" onClick={() => navigate('/settings')}>
            <div className="bee-user-avatar">
              <User size={15} color="#00a876" />
            </div>
            <div className="bee-user-details">
              <span className="bee-user-name">Executive Leader</span>
              <span className="bee-user-email">brynex.executive@company.com</span>
            </div>
            <div className="bee-user-more">
              <ChevronDown size={13} color="#94a3b8" />
            </div>
          </div>
        </aside>

        {/* =========================================================================
            RIGHT MAIN CANVAS: MODEL PILL, TOP ACTIONS, GREETING, CHAT DOCK
        ========================================================================= */}
        <main className="bee-main-canvas">
          {/* Canvas Header Bar */}
          <div className="bee-canvas-header">
            {/* Top Left: Model Selector Pill */}
            <div className="bee-model-pill-wrapper">
              <button
                type="button"
                className="bee-model-selector-pill"
                onClick={() => setActiveModelMenuOpen(!activeModelMenuOpen)}
              >
                <div className="bee-model-dot-icon">
                  <Cpu size={12} color="#00a876" />
                </div>
                <span className="bee-model-name">
                  {AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name?.split(' ')[0] || 'Claude 4.5'}
                </span>
                <ChevronDown size={12} color="#00a876" />
              </button>

              {activeModelMenuOpen && (
                <div className="bee-model-dropdown-menu">
                  {AVAILABLE_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`bee-model-dropdown-item ${selectedModel === m.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setStoredModel(m.id);
                        setActiveModelMenuOpen(false);
                      }}
                    >
                      <span>{m.name}</span>
                      {selectedModel === m.id && <Check size={13} color="#00a876" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Top Right: + New Chat Pill and User Profile Icon */}
            <div className="bee-canvas-header-right">
              <button type="button" className="bee-new-chat-pill" onClick={handleNewChat}>
                <Plus size={13} />
                <span>New Chat</span>
              </button>
              <div className="bee-top-avatar" onClick={() => navigate('/settings')}>
                <User size={14} color="#0f172a" />
              </div>
            </div>
          </div>

          {/* Canvas Center Interaction Content */}
          <div className="bee-canvas-content-scroll">
            {/* When conversation is empty or just starting: Center Spherical Hero */}
            {messages.length <= 1 && (
              <div className="bee-hero-welcome-section">
                {/* Brynex 3D AI Bot Mascot */}
                <div className="bee-mascot-hero-wrap">
                  <img src={botLogo} alt="Brynex AI Assistant" className="bee-mascot-hero-img" />
                </div>

                {/* Greeting Title matching screenshot typography */}
                <h1 className="bee-hero-greeting-title">
                  {getTimeOfDayGreeting()}, Executive
                </h1>
                <h2 className="bee-hero-sub-title">
                  How Can I <span className="bee-highlight-assist">Assist You</span> Today?
                </h2>
              </div>
            )}

            {/* Active Conversation Messages Stream */}
            {messages.length > 1 && (
              <div className="bee-conversation-stream" ref={chatStreamRef}>
                {messages.map((msg) => (
                  <div key={msg.id} className={`bee-chat-row ${msg.sender}`}>
                    {msg.sender === 'assistant' ? (
                      <div className="bee-chat-bubble assistant">
                        <div className="bee-bubble-header">
                          <div className="bee-bubble-avatar">
                            <Sparkles size={13} color="#00a876" />
                          </div>
                          <span className="bee-bubble-sender">Brynex Intelligence</span>
                          <span className="bee-bubble-time">
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="bee-bubble-body">
                          <FormattedAiContent
                            content={msg.text}
                            bullets={msg.bullets}
                            title={msg.title}
                          />
                        </div>
                        {uploadedFiles.length > 0 && !msg.isError && (
                          <div className="bee-bubble-grounding-tag">
                            <CheckCircle2 size={12} color="#00a876" />
                            <span>Grounded in live retail LMS telemetry & 25 branches</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bee-chat-bubble user">
                        <div className="bee-bubble-header user">
                          <span className="bee-bubble-sender">You</span>
                          <span className="bee-bubble-time">
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="bee-bubble-body user">{msg.text}</div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="bee-chat-row assistant">
                    <div className="bee-chat-bubble assistant loading">
                      <div className="bee-bubble-header">
                        <div className="bee-bubble-avatar">
                          <Sparkles size={13} color="#00a876" />
                        </div>
                        <span className="bee-bubble-sender">Brynex Synthesizing...</span>
                      </div>
                      <div className="bee-typing-dots">
                        <span className="bee-dot"></span>
                        <span className="bee-dot"></span>
                        <span className="bee-dot"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Quick Suggestions (Shown on hero start) */}
            {messages.length <= 1 && (
              <div className="bee-hero-suggestions">
                {promptCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className="bee-suggestion-chip"
                    onClick={() => {
                      if (card.isUpload) {
                        navigate('/intelligence/hr/data');
                      } else {
                        handleSend(card.text);
                      }
                    }}
                  >
                    <span className="bee-sugg-icon">{card.icon}</span>
                    <span className="bee-sugg-text">{card.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* =========================================================================
              BOTTOM WIDE INPUT CARD (Matching Screenshot with Inner Action Chips)
          ========================================================================= */}
          <div className="bee-input-card-dock">
            <form
              className="bee-input-card-container"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              {/* Primary Input Textarea / Row */}
              <div className="bee-input-row">
                <Sparkles size={14} className="bee-input-sparkle-icon" color="#94a3b8" />
                <input
                  type="text"
                  className="bee-main-input-field"
                  placeholder="Initiate a query or send a command to the AI..."
                  value={inputText}
                  disabled={isLoading}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              {/* Bottom Card Action Bar (Chips + Send Button) */}
              <div className="bee-input-card-footer">
                <div className="bee-input-tools-left">
                  {/* Paperclip / Attach Data */}
                  <button
                    type="button"
                    className="bee-tool-icon-btn"
                    title="Attach or manage datasets"
                    onClick={() => navigate('/intelligence/hr/data')}
                  >
                    <Paperclip size={14} />
                  </button>

                  {/* Mode Chips from Screenshot */}
                  <button
                    type="button"
                    className={`bee-mode-chip ${activeChip === 'Reasoning' ? 'active' : ''}`}
                    onClick={() => setActiveChip('Reasoning')}
                  >
                    <Lightbulb size={13} />
                    <span>Reasoning</span>
                  </button>

                  <button
                    type="button"
                    className={`bee-mode-chip ${activeChip === 'Create Image' ? 'active' : ''}`}
                    onClick={() => setActiveChip('Create Image')}
                  >
                    <Wand2 size={13} />
                    <span>Create Image</span>
                  </button>

                  <button
                    type="button"
                    className={`bee-mode-chip ${activeChip === 'Deep Research' ? 'active' : ''}`}
                    onClick={() => setActiveChip('Deep Research')}
                  >
                    <Globe size={13} />
                    <span>Deep Research</span>
                  </button>

                  {/* Voice input mic */}
                  <button
                    type="button"
                    className="bee-tool-icon-btn"
                    title="Voice dictation"
                    onClick={() => {
                      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                        const recognition = new SpeechRecognition();
                        recognition.onresult = (e) => {
                          const transcript = e.results[0][0].transcript;
                          setInputText(transcript);
                        };
                        recognition.start();
                      } else {
                        alert('Speech recognition is not supported in this browser.');
                      }
                    }}
                  >
                    <Mic size={14} />
                  </button>
                </div>

                {/* Right: Pill Send Button from screenshot */}
                <button
                  type="submit"
                  className="bee-send-action-btn"
                  disabled={isLoading || !inputText.trim()}
                  title="Send query"
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
