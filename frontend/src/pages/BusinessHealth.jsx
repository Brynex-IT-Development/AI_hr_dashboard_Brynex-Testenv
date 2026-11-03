import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  DollarSign,
  BarChart3,
  Clock,
  Send,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export default function BusinessHealth() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/business-health');
        const json = await res.json();
        if (json.data) {
          setHealthData(json.data);
        }
      } catch (err) {
        console.warn('Could not load business health data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  const overallScore = healthData?.overallScore || null;
  const status = healthData?.status || 'Awaiting Ingestion';
  const engines = healthData?.engineBreakdown || [];
  const insights = healthData?.keyInsights || [];

  if (!loading && (!healthData || engines.length === 0)) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="page-header" style={{ marginBottom: '4px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
            Business Health & System Diagnostics
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
            Holistic enterprise health index computed in real-time across workforce, sales, and financial datasets.
          </p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '60px 40px', textAlign: 'center' }}>
          <Activity size={36} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
            No System Telemetry Ingested
          </h3>
          <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '480px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
            Upload your workforce, shift, or revenue CSV files in Data Management. Brynex One AI will dynamically compute your composite business health score.
          </p>
          <Link
            to="/intelligence/hr/data"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#0ca678',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            <span>Go to Data Management</span>
          </Link>
        </div>
      </div>
    );
  }

  const priorities = healthData?.strategicPriorities || [];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner: Composite Health Index */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '16px',
          padding: '24px 28px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.12)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #10b981 0%, #059669 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
            }}
          >
            <span style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1 }}>{overallScore || '--'}</span>
            <span style={{ fontSize: '11px', opacity: 0.9 }}>/ 100</span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Composite Business Health Score</h2>
              <span style={{ fontSize: '11px', background: '#065f46', color: '#6ee7b7', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
                {status}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '600px', lineHeight: '1.4' }}>
              {healthData?.summaryDescription || 'Multi-file automated correlation dynamically evaluating operational execution and revenue velocity.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Telemetry Engines</span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8' }}>{engines.length} Synced</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Live Synchronized</span>
        </div>
      </div>

      {/* Engine Score Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(engines.length, 1)}, 1fr)`, gap: '14px' }}>
        {engines.map((eng) => (
          <div
            key={eng.id}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>{eng.name}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: eng.score >= 90 ? '#10b981' : '#f59e0b',
                  background: eng.score >= 90 ? '#ecfdf5' : '#fffbeb',
                  padding: '2px 6px',
                  borderRadius: '6px'
                }}
              >
                {eng.score} / 100
              </span>
            </div>

            <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: '1.4', flex: 1 }}>
              {eng.detail}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: eng.status === 'Needs Attention' ? '#d97706' : '#10b981' }}>
              {eng.status === 'Needs Attention' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
              <span>{eng.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cross-Engine Insights & Strategic Priorities */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Real-time Diagnostics Insights */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
            Cross-Engine Risk & Opportunity Signals
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
            Algorithmic insights derived by correlating HR attendance rosters, payroll, and retail sales output.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {insights.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                    {item.desc}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    whiteSpace: 'nowrap',
                    background: item.impact === 'High' ? '#fee2e2' : item.impact === 'Positive' ? '#ecfdf5' : '#fef3c7',
                    color: item.impact === 'High' ? '#b91c1c' : item.impact === 'Positive' ? '#047857' : '#b45309'
                  }}
                >
                  {item.impact}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Recommended Actions */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
              Strategic Action Priorities
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              AI-generated executive interventions to optimize enterprise health score.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {priorities.map((p, idx) => (
              <div key={idx} style={{ padding: '12px', borderRadius: '10px', background: p.bg, border: `1px solid ${p.border}`, fontSize: '12.5px', color: p.color, lineHeight: '1.4' }}>
                <strong>{idx + 1}. {p.title}:</strong> {p.desc}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
