import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Activity,
  UserCheck,
  BarChart3,
  Wallet,
  Clock,
  Send,
  CheckSquare,
  MessageSquare,
  Boxes,
  FileText,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  BrainCircuit,
  Database
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const [hrExpanded, setHrExpanded] = useState(true);

  useEffect(() => {
    if (location.pathname.startsWith('/intelligence/hr') || location.pathname.startsWith('/hr')) {
      setHrExpanded(true);
    }
  }, [location.pathname]);

  const toggleHr = (e) => {
    e.preventDefault();
    setHrExpanded((prev) => !prev);
  };

  const isHrActive = location.pathname.startsWith('/intelligence/hr') || location.pathname.startsWith('/hr');

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <BrainCircuit size={16} color="#ffffff" />
          </div>
          <span className="brand-title">AI Business Brain</span>
        </div>
        <button className="brand-more-btn" title="Options">
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Nav List */}
      <nav className="sidebar-nav">
        {/* MAIN */}
        <div className="nav-section-title">MAIN</div>
        <NavLink 
          to="/workspace" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="nav-item-left">
            <Home size={18} className="nav-icon" />
            <span>AI Workspace</span>
          </div>
        </NavLink>

        <NavLink 
          to="/business-health" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="nav-item-left">
            <Activity size={18} className="nav-icon" />
            <span>Business Health</span>
          </div>
        </NavLink>

        {/* INTELLIGENCE ENGINES */}
        <div className="nav-section-title" style={{ marginTop: '16px' }}>INTELLIGENCE ENGINES</div>
        <div className="nav-group">
          <NavLink 
            to="/intelligence/hr" 
            className={`nav-item ${isHrActive && location.pathname === '/intelligence/hr' ? 'active' : ''}`}
          >
            <div className="nav-item-left">
              <UserCheck size={18} className="nav-icon" />
              <span>HR</span>
            </div>
            <button 
              type="button" 
              onClick={toggleHr}
              style={{ background: 'transparent', border: 'none', color: 'inherit', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '2px' }}
            >
              {hrExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </NavLink>

          {/* Submenu for HR */}
          {hrExpanded && (
            <div className="nav-sub-menu">
              <NavLink 
                to="/intelligence/hr/data" 
                className={({ isActive }) => `nav-sub-item ${isActive ? 'active' : ''}`}
              >
                <Database size={14} className="nav-sub-icon" />
                <span>Data</span>
              </NavLink>
            </div>
          )}
        </div>

        <NavLink 
          to="/intelligence/sales" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="nav-item-left">
            <BarChart3 size={18} className="nav-icon" />
            <span>Sales</span>
          </div>
        </NavLink>

        <NavLink 
          to="/intelligence/finance" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="nav-item-left">
            <Wallet size={18} className="nav-icon" />
            <span>Finance</span>
          </div>
        </NavLink>

        <NavLink 
          to="/intelligence/operations" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="nav-item-left">
            <Clock size={18} className="nav-icon" />
            <span>Operations</span>
          </div>
        </NavLink>

        <NavLink 
          to="/intelligence/marketing" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="nav-item-left">
            <Send size={18} className="nav-icon" />
            <span>Marketing</span>
          </div>
        </NavLink>

        {/* AI TOOLS */}
        <div className="nav-section-title" style={{ marginTop: '16px' }}>AI TOOLS</div>
        <NavLink 
          to="/tasks" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="nav-item-left">
            <CheckSquare size={18} className="nav-icon" />
            <span>AI Tasks</span>
          </div>
          <span className="badge badge-green">12</span>
        </NavLink>

        <NavLink 
          to="/assistant" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="nav-item-left">
            <MessageSquare size={18} className="nav-icon" />
            <span>AI Assistant</span>
          </div>
          <span className="badge badge-mint">New</span>
        </NavLink>

        {/* SYSTEM & GENERAL */}
        <div className="nav-section-title" style={{ marginTop: '16px' }}>SYSTEM & GENERAL</div>

        <NavLink 
          to="/integrations" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="nav-item-left">
            <Boxes size={18} className="nav-icon" />
            <span>Integrations</span>
          </div>
        </NavLink>

        <NavLink 
          to="/reports" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="nav-item-left">
            <FileText size={18} className="nav-icon" />
            <span>Reports</span>
          </div>
        </NavLink>

        <NavLink 
          to="/team" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="nav-item-left">
            <Users size={18} className="nav-icon" />
            <span>Team & Roles</span>
          </div>
        </NavLink>

        <NavLink 
          to="/settings" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="nav-item-left">
            <Settings size={18} className="nav-icon" />
            <span>Settings</span>
          </div>
        </NavLink>
      </nav>
    </aside>
  );
}
