import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, ChevronDown, User, Menu } from 'lucide-react';

export default function Header({ toggleSidebar }) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const getPageInfo = (path) => {
    switch (path) {
      case '/':
      case '/workspace':
        return { title: 'AI Workspace', parent: 'Dashboard' };
      case '/business-health':
        return { title: 'Business Health', parent: 'AI Workspace' };
      case '/intelligence/hr':
        return { title: 'HR Intelligence', parent: 'AI Workspace' };
      case '/intelligence/hr/data':
        return { title: 'Data', parent: 'HR Intelligence' };
      case '/intelligence/sales':
        return { title: 'Sales Intelligence', parent: 'AI Workspace' };
      case '/intelligence/finance':
        return { title: 'Finance Intelligence', parent: 'AI Workspace' };
      case '/intelligence/operations':
        return { title: 'Operations Intelligence', parent: 'AI Workspace' };
      case '/intelligence/marketing':
        return { title: 'Marketing Intelligence', parent: 'AI Workspace' };
      case '/tasks':
        return { title: 'AI Tasks', parent: 'AI Tools' };
      case '/assistant':
        return { title: 'AI Assistant', parent: 'AI Tools' };
      case '/integrations':
        return { title: 'Integrations', parent: 'System' };
      case '/reports':
        return { title: 'Reports & Analytics', parent: 'System' };
      case '/team':
        return { title: 'Team & Roles', parent: 'System' };
      case '/settings':
        return { title: 'Settings', parent: 'System' };
      default:
        return { title: 'HR Intelligence', parent: 'AI Workspace' };
    }
  };

  const { title, parent } = getPageInfo(location.pathname);

  return (
    <header className="top-navbar">
      {/* Left: Title & Breadcrumbs + Hamburger Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          className="top-navbar-hamburger-btn"
          onClick={toggleSidebar}
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>
        <div className="top-navbar-title-group">
          <h1 className="top-navbar-heading">{title}</h1>
          <div className="top-navbar-breadcrumb">
            <span>{parent}</span>
            <span className="crumb-separator">&gt;</span>
            <span className="crumb-current">{title}</span>
          </div>
        </div>
      </div>

      {/* Right Area: Search, Bell Notification, User Profile */}
      <div className="top-navbar-right-group">
        {/* Search Bar */}
        <div className="top-navbar-search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="top-navbar-search-input"
            placeholder="Search employee, roles or insights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Bell Notification */}
        <button className="top-navbar-bell-btn" title="Notifications">
          <Bell size={18} />
          <span className="bell-badge-dot"></span>
        </button>

        {/* User Profile Pill */}
        <div className="top-navbar-user-profile">
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
            alt="User profile"
            className="user-avatar-img"
          />
          <ChevronDown size={14} className="user-dropdown-icon" />
        </div>
      </div>
    </header>
  );
}
