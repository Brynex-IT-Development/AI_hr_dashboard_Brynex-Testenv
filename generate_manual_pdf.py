import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Suppress headers/footers on title cover
            return

        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Running Header
        self.drawString(54, 11 * 72 - 36, "BRYNEX ONE — AI HR INTELLIGENCE & ENTERPRISE DASHBOARD")
        self.setFont("Helvetica", 8)
        self.drawRightString(8.5 * 72 - 54, 11 * 72 - 36, "SYSTEM WORKING MANUAL & USER GUIDE")
        
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.75)
        self.line(54, 11 * 72 - 42, 8.5 * 72 - 54, 11 * 72 - 42)

        # Running Footer
        self.line(54, 45, 8.5 * 72 - 54, 45)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(54, 32, "Confidential • Brynex Technology Group • Internal Operations Documentation")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * 72 - 54, 32, page_str)

        self.restoreState()


def build_pdf(filename="Brynex_AI_HR_Dashboard_User_Manual.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#0f172a")     # Deep Navy
    SECONDARY = colors.HexColor("#00a876")   # Brynex Emerald
    ACCENT = colors.HexColor("#2563eb")      # Corporate Blue
    TEXT_DARK = colors.HexColor("#1e293b")   # Slate 800
    TEXT_MUTED = colors.HexColor("#64748b")  # Slate 500
    BG_LIGHT = colors.HexColor("#f8fafc")    # Slate 50
    BORDER_LIGHT = colors.HexColor("#e2e8f0")# Slate 200
    ALERT_BG = colors.HexColor("#eff6ff")    # Blue 50
    WARN_BG = colors.HexColor("#fffbeb")     # Amber 50

    # Custom Typography Styles
    styles.add(ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=PRIMARY,
        alignment=0,
        spaceAfter=10
    ))

    styles.add(ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=SECONDARY,
        alignment=0,
        spaceAfter=25
    ))

    styles.add(ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=TEXT_MUTED
    ))

    styles.add(ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=22,
        textColor=PRIMARY,
        spaceBefore=18,
        spaceAfter=8,
        keepWithNext=True
    ))

    styles.add(ParagraphStyle(
        'SubSectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    ))

    styles.add(ParagraphStyle(
        'SubSubSectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=TEXT_DARK,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    ))

    styles.add(ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=TEXT_DARK,
        spaceAfter=7
    ))

    styles.add(ParagraphStyle(
        'BodyCustomBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=14,
        textColor=TEXT_DARK,
        spaceAfter=7
    ))

    styles.add(ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=TEXT_DARK,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    ))

    styles.add(ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=TEXT_DARK
    ))

    styles.add(ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white,
        alignment=0
    ))

    styles.add(ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK
    ))

    styles.add(ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK
    ))

    styles.add(ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a")
    ))

    story = []

    def callout(text, bg_color=ALERT_BG, border_color=ACCENT, title="NOTE"):
        p_title = Paragraph(f"<b>{title}:</b> {text}", styles['CalloutText'])
        tbl = Table([[p_title]], colWidths=[504])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg_color),
            ('BOX', (0, 0), (-1, -1), 1, border_color),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        return tbl

    # =========================================================================
    # COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 40))
    # Brand Top Bar
    story.append(HRFlowable(width="100%", thickness=6, color=SECONDARY, spaceBefore=0, spaceAfter=25))
    story.append(Paragraph("BRYNEX ONE AI HR BRAIN", styles['CoverTitle']))
    story.append(Paragraph("Enterprise Workforce Intelligence, Telemetry Engine & Decision Support System", styles['CoverSubtitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_LIGHT, spaceBefore=0, spaceAfter=20))

    meta_text = """
    <b>Document Type:</b> Comprehensive System User Manual & Technical Working Specification<br/>
    <b>Platform Version:</b> Production v1.0.0 (MERN + Claude AI Engine)<br/>
    <b>Deployment Targets:</b> Vercel (Client Web App) • Render Cloud (API Engine) • MongoDB Atlas<br/>
    <b>Author / Engineering:</b> Brynex Development & Intelligence Engineering Team<br/>
    <b>Target Audience:</b> HR Directors, Operations Heads, Store General Managers & System Administrators<br/>
    <b>Date of Issue:</b> November 2026
    """
    story.append(Paragraph(meta_text, styles['CoverMeta']))
    story.append(Spacer(1, 35))

    # Executive Overview Box
    exec_summary = (
        "<b>System Purpose:</b> The Brynex One AI HR Brain is an advanced workforce intelligence ecosystem "
        "engineered to bridge disconnected retail data sources—unifying multi-format attendance spreadsheets (.xls/.xlsx), "
        "employee master directories, and point-of-sale business metrics with live retail LMS external APIs. Powered by "
        "Claude 4.5/5.5 Sonnet and a deterministic mathematical correlator, the system autonomously identifies attendance "
        "irregularities, rest interval violations, attrition hazards, and cross-dataset operational correlations in real time."
    )
    story.append(callout(exec_summary, bg_color=BG_LIGHT, border_color=SECONDARY, title="EXECUTIVE ARCHITECTURE BRIEF"))

    story.append(PageBreak())

    # =========================================================================
    # TABLE OF CONTENTS
    # =========================================================================
    story.append(Paragraph("Table of Contents", styles['SectionHeading']))
    story.append(HRFlowable(width="100%", thickness=1.5, color=SECONDARY, spaceBefore=2, spaceAfter=14))

    toc_data = [
        [Paragraph("<b>Section 1: Platform Overview & System Philosophy</b>", styles['TableCellBold']), Paragraph("<b>Page 3</b>", styles['TableCell'])],
        [Paragraph("• Core Value Proposition & Retail Operational Context", styles['TableCell']), Paragraph("Page 3", styles['TableCell'])],
        [Paragraph("• Dual-Layer Intelligence Engine (Ingested Files + Live LMS Telemetry)", styles['TableCell']), Paragraph("Page 3", styles['TableCell'])],
        [Paragraph("<b>Section 2: High-Level Architecture & Data Flow</b>", styles['TableCellBold']), Paragraph("<b>Page 4</b>", styles['TableCell'])],
        [Paragraph("• End-to-End Ingestion, Correlation, and AI Synthesis Pipeline", styles['TableCell']), Paragraph("Page 4", styles['TableCell'])],
        [Paragraph("• Prompt Branch Isolation & Anti-Cross-Brand Leakage Protection", styles['TableCell']), Paragraph("Page 4", styles['TableCell'])],
        [Paragraph("<b>Section 3: Complete Navigation & Module Reference</b>", styles['TableCellBold']), Paragraph("<b>Page 5</b>", styles['TableCell'])],
        [Paragraph("• 3.1 AI Workspace (Executive Operational Cockpit)", styles['TableCell']), Paragraph("Page 5", styles['TableCell'])],
        [Paragraph("• 3.2 HR Intelligence Dashboard (Real-time Synthesis, Left-Brain Diagnosis, Decision Engine)", styles['TableCell']), Paragraph("Page 5", styles['TableCell'])],
        [Paragraph("• 3.3 HR Data Management (Adaptive Excel Matrix Ingestion & Prompt Rules)", styles['TableCell']), Paragraph("Page 5", styles['TableCell'])],
        [Paragraph("• 3.4 Interactive AI Assistant (Multi-Model Chat & Workforce RAG)", styles['TableCell']), Paragraph("Page 6", styles['TableCell'])],
        [Paragraph("• 3.5 Specialized Domain Engines (Sales, Finance, Operations, Marketing)", styles['TableCell']), Paragraph("Page 6", styles['TableCell'])],
        [Paragraph("<b>Section 4: Step-by-Step Operator Workflows</b>", styles['TableCellBold']), Paragraph("<b>Page 7</b>", styles['TableCell'])],
        [Paragraph("• Ingesting Multiple Heterogeneous Workforce Files", styles['TableCell']), Paragraph("Page 7", styles['TableCell'])],
        [Paragraph("• Executing Isolated Natural-Language Branch Queries", styles['TableCell']), Paragraph("Page 7", styles['TableCell'])],
        [Paragraph("• Approving AI Decisions & Pushing Tasks to Brynex One", styles['TableCell']), Paragraph("Page 7", styles['TableCell'])],
        [Paragraph("<b>Section 5: Deployment, Connectivity & Configuration Guide</b>", styles['TableCellBold']), Paragraph("<b>Page 8</b>", styles['TableCell'])],
        [Paragraph("• Vercel SPA Routing & Reverse-Proxy Rewrites (`vercel.json`)", styles['TableCell']), Paragraph("Page 8", styles['TableCell'])],
        [Paragraph("• Frontend Centralized Endpoint Router (`frontend/src/api.js`)", styles['TableCell']), Paragraph("Page 8", styles['TableCell'])],
        [Paragraph("• Render Cloud Backend Environment Setup & CORS Policies", styles['TableCell']), Paragraph("Page 8", styles['TableCell'])],
        [Paragraph("<b>Section 6: Troubleshooting, Fallbacks & Error Catalog</b>", styles['TableCellBold']), Paragraph("<b>Page 9</b>", styles['TableCell'])],
    ]

    toc_table = Table(toc_data, colWidths=[420, 84])
    toc_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
    ]))
    story.append(toc_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 1: PLATFORM OVERVIEW & PHILOSOPHY
    # =========================================================================
    story.append(Paragraph("1. Platform Overview & System Philosophy", styles['SectionHeading']))
    story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "Modern enterprise retail networks operate under extreme complexity. Managing dozens of store locations "
        "requires balancing shift compliance, rest period statutory obligations, turnover trends, and sales quota attainment. "
        "Historically, HR departments were burdened with disconnected manual files—attendance rosters exported from biometric "
        "clocks, employee directories from legacy ERPs, and daily revenue reports from POS terminals.",
        styles['BodyCustom']
    ))
    story.append(Paragraph(
        "<b>Brynex One AI HR Brain</b> is engineered from the ground up to solve this fragmented landscape. Rather than "
        "relying on rigid dashboards with static charts, the platform acts as an autonomous cognitive intelligence layer "
        "that cross-examines multiple datasets simultaneously.",
        styles['BodyCustom']
    ))

    story.append(Paragraph("Core Architectural Pillars:", styles['SubSectionHeading']))
    story.append(Paragraph("<b>1. Dual-Layer Cognitive Synthesis:</b> Combines deterministic mathematical correlation (for zero-hallucination statistical facts) with Claude AI neural reasoning (for root cause diagnosis and strategic options).", styles['BulletCustom']))
    story.append(Paragraph("<b>2. Adaptive Matrix Header Parsing:</b> Ingests unformatted, messy multi-row Excel sheets (.xls/.xlsx) that include title banners, merged date columns (Day 1..31), and varying column naming conventions without requiring data pre-cleaning.", styles['BulletCustom']))
    story.append(Paragraph("<b>3. Zero Cross-Brand / Branch Leakage:</b> Employs strict prompt token isolation. When an executive asks about 'Edappally' or 'MG Road', the engine dynamically isolates that branch's employees, store metrics, and anomalies, silencing all irrelevant data from other branches.", styles['BulletCustom']))
    story.append(Paragraph("<b>4. Closed-Loop Action Protocol:</b> Every identified management risk is immediately paired with 3 structured decision paths (Option A, B, C) and can be dispatched to operational staff as a verified ticket in the central Brynex One task engine.", styles['BulletCustom']))

    story.append(Spacer(1, 10))

    # Key Architectural Capabilities Table
    caps_data = [
        [Paragraph("Intelligence Dimension", styles['TableHeader']), Paragraph("Operational Mechanism", styles['TableHeader']), Paragraph("Business Impact", styles['TableHeader'])],
        [
            Paragraph("<b>File Ingestion</b>", styles['TableCellBold']),
            Paragraph("Adaptive multi-row Excel matrix locator; handles merged headers, shifts, and directory rosters.", styles['TableCell']),
            Paragraph("Eliminates manual CSV cleaning and formatting overhead.", styles['TableCell'])
        ],
        [
            Paragraph("<b>Cross-File Correlation</b>", styles['TableCellBold']),
            Paragraph("Links staff roster to attendance logs and store sales to detect fatigue vs. revenue drag.", styles['TableCell']),
            Paragraph("Uncovers invisible root causes (e.g., store revenue dips caused by excessive overtime).", styles['TableCell'])
        ],
        [
            Paragraph("<b>Left-Brain Diagnosis</b>", styles['TableCellBold']),
            Paragraph("Structured reasoning analyzing organizational compliance, morale, and productivity.", styles['TableCell']),
            Paragraph("Provides instant executive clarity with confidence percentages.", styles['TableCell'])
        ],
        [
            Paragraph("<b>Layer 6 Decision Engine</b>", styles['TableCellBold']),
            Paragraph("Formulates 3 actionable remedies: Conservative / Protocol, Balanced Tactical, and Aggressive Structural.", styles['TableCell']),
            Paragraph("Transforms raw warnings into immediate management actions.", styles['TableCell'])
        ]
    ]

    t_caps = Table(caps_data, colWidths=[120, 220, 164])
    t_caps.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_caps)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 2: HIGH-LEVEL ARCHITECTURE & DATA FLOW
    # =========================================================================
    story.append(Paragraph("2. High-Level Architecture & Data Flow", styles['SectionHeading']))
    story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "The system follows a modern MERN decoupled architecture enhanced by Anthropic Claude generative AI and a "
        "dynamic reverse-proxy orchestration on Vercel and Render Cloud.",
        styles['BodyCustom']
    ))

    arch_flow = """
    <b>Data Flow & Processing Lifecycle:</b><br/>
    <b>Step 1 [Ingestion]:</b> User uploads files (.xlsx, .xls, .csv, .pdf) in HR Data Management. Multer stages raw binaries into <code>backend/uploads/</code>, and <code>fileParserService.js</code> strips metadata rows, detects true header columns, and produces normalized JSON row arrays.<br/>
    <b>Step 2 [Deterministic Correlation]:</b> <code>multiFileCorrelatorService.js</code> executes high-speed mathematical analysis—aggregating total headcount, calculating attrition rate, tracking overtime hours, evaluating 11-hour rest turnaround violations, and computing department breakdowns.<br/>
    <b>Step 3 [Live External Telemetry]:</b> In parallel, <code>externalIntegrationService.js</code> fetches real-time store metrics (25 retail locations) and staff baselines (204 employee records) from the enterprise LMS API.<br/>
    <b>Step 4 [Cognitive AI Synthesis]:</b> <code>aiDocumentAnalyzerService.js</code> transmits sanitized statistical profiles and representative sample records to Claude 4.5 Sonnet to synthesize actionable Management Attention items.<br/>
    <b>Step 5 [Prompt Isolation Filter]:</b> If an executive enters a query (e.g., <i>'Suitor Guy Edappally'</i>), <code>promptMatcherService.js</code> applies strict regex and token boundary matching across all KPI tiles, attention cards, and employee records.<br/>
    <b>Step 6 [Executive Presentation]:</b> React frontend renders reactive KPI metrics, diagnosis panels, and decision execution modal windows with sub-second responsiveness.
    """
    story.append(callout(arch_flow, bg_color=ALERT_BG, border_color=ACCENT, title="END-TO-END PIPELINE ARCHITECTURE"))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Anti-Cross-Brand Leakage Protection Mechanism:", styles['SubSectionHeading']))
    story.append(Paragraph(
        "A critical vulnerability in retail enterprise software is cross-store data leakage—where insights or employee "
        "records from one store branch accidentally appear under another store's filtered view. Brynex One eliminates this "
        "via a three-tier defensive filtering layer in <code>promptMatcherService.js</code>:",
        styles['BodyCustom']
    ))
    story.append(Paragraph("• <b>Intent Extraction:</b> The prompt analyzer scans the query for known retail branch tokens (e.g., 'Edappally', 'MG Road', 'Kottayam', 'Kakkanad', 'Calicut', 'Trivandrum').", styles['BulletCustom']))
    story.append(Paragraph("• <b>Scope Lockdown:</b> When a branch token is detected, <code>intent.branchTarget</code> is locked, and <code>intent.isFiltered</code> is flagged as <code>true</code>.", styles['BulletCustom']))
    story.append(Paragraph("• <b>Strict Filtering:</b> Attention items, employee rows, and store KPI calculations are filtered using <code>recordMatchesPrompt()</code> and <code>itemMatchesPrompt()</code>. Any card that does not explicitly match the targeted store is excluded.", styles['BulletCustom']))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 3: COMPLETE NAVIGATION & MODULE REFERENCE
    # =========================================================================
    story.append(Paragraph("3. Complete Navigation & Module Reference", styles['SectionHeading']))
    story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph("3.1 AI Workspace (/workspace)", styles['SubSectionHeading']))
    story.append(Paragraph(
        "The AI Workspace is the central mission control. It summarizes overall organizational health, displays "
        "active intelligence modules, reports real-time system alerts, and provides shortcuts for launching custom AI queries. "
        "Executives can view company-wide headcount, average employee sentiment, critical operational hazards, and quick launch "
        "buttons for deep-dive investigations.",
        styles['BodyCustom']
    ))

    story.append(Paragraph("3.2 HR Intelligence Dashboard (/intelligence/hr)", styles['SubSectionHeading']))
    story.append(Paragraph(
        "The primary analytical cockpit of the platform. Key components include:",
        styles['BodyCustom']
    ))
    story.append(Paragraph("• <b>Executive Prompt Bar & Inquiry Chips:</b> An intelligent input allowing free-form natural language prompts (e.g., <i>'Show overtime violations in Edappally'</i> or <i>'Employees on notice period'</i>). Includes quick-click pre-configured prompt chips for instant focus.", styles['BulletCustom']))
    story.append(Paragraph("• <b>HR Health Score Tile:</b> A weighted index combining turnover risk, compliance violations, and quota attainment. Color-coded into Healthy (>=80%), Needs Attention (65-79%), and Critical (<65%).", styles['BulletCustom']))
    story.append(Paragraph("• <b>Five Synchronized Dynamic KPI Cards:</b>", styles['BulletCustom']))
    story.append(Paragraph("  - <i>Critical Issues:</i> Total active management attention risks detected across connected datasets.", styles['BulletCustom']))
    story.append(Paragraph("  - <i>Pending Decisions:</i> Issues that have 3 synthesized options formulated and ready for managerial approval.", styles['BulletCustom']))
    story.append(Paragraph("  - <i>Workforce Monitored:</i> Total headcount or store count currently tracked in active memory.", styles['BulletCustom']))
    story.append(Paragraph("  - <i>Opportunities:</i> Strategic upside areas (e.g., capacity balancing, scheduling optimization).", styles['BulletCustom']))
    story.append(Paragraph("  - <i>Avg. Productivity:</i> Benchmark score reflecting quota attainment and shift output.", styles['BulletCustom']))
    story.append(Paragraph("• <b>Management Attention Cards:</b> Interactive anomaly cards displaying Issue Severity (CRITICAL, HIGH, MODERATE), Target Department/Branch, Source File provenance, Left-Brain Root Cause Diagnosis, and an 'Action' button to launch the decision engine.", styles['BulletCustom']))
    story.append(Paragraph("• <b>Retail LMS Store Telemetry Section:</b> Overview of 25 retail branches, showing monthly target, net revenue, walk-ins, conversion %, and assigned workforce.", styles['BulletCustom']))
    story.append(Paragraph("• <b>Synced Employees Master Table:</b> Searchable table of 204 staff records with designation, department, branch, salary baseline, overtime hours, and flight risk classification.", styles['BulletCustom']))

    story.append(Spacer(1, 8))

    story.append(Paragraph("3.3 HR Data Management (/intelligence/hr/data)", styles['SubSectionHeading']))
    story.append(Paragraph(
        "The ingestion engine where data files are ingested and AI evaluation parameters are set:",
        styles['BodyCustom']
    ))
    story.append(Paragraph("• <b>Drag-and-Drop Ingestion Zone:</b> Accepts .xlsx, .xls, .csv, and .pdf documents up to 50MB. Features automatic dataset classification (Employee Master, Attendance Muster, Sales/Revenue, Compensation).", styles['BulletCustom']))
    story.append(Paragraph("• <b>Active Ingested Files Registry:</b> Shows file ID, original file name, data category, ingestion timestamp, and operational actions (Preview Rows in modal, Download Raw File, and Delete).", styles['BulletCustom']))
    story.append(Paragraph("• <b>Custom Evaluation Rules Engine:</b> Sliders allowing HR leaders to set custom thresholds for Target Attrition % (default 5.0%) and Target Productivity % (default 90%).", styles['BulletCustom']))
    story.append(Paragraph("• <b>Prompt Presets Library:</b> Create, update, or remove reusable prompt filters stored directly in backend storage.", styles['BulletCustom']))

    story.append(PageBreak())

    story.append(Paragraph("3.4 Interactive AI Assistant (/assistant)", styles['SubSectionHeading']))
    story.append(Paragraph(
        "A full-featured conversational intelligence interface designed for interactive workforce inquiries:",
        styles['BodyCustom']
    ))
    story.append(Paragraph("• <b>Multi-Model LLM Selector:</b> Switch between Anthropic Claude 4.5 Haiku, Claude 4.6 Sonnet, Claude 4.6 Opus, or free models via OpenRouter (Liquid LFM, Google Gemma 4 26B, NVIDIA Nemotron).", styles['BulletCustom']))
    story.append(Paragraph("• <b>Conversation Thread Management:</b> Create new conversation sessions, rename topics, save message histories, and revisit past analyses.", styles['BulletCustom']))
    story.append(Paragraph("• <b>Context-Aware HR Intelligence:</b> The AI assistant automatically receives the active dataset summary, employee metrics, and store telemetry in its system context, allowing deep questions like: <i>'Who are our top 3 flight risks in sales and how do we retain them?'</i>", styles['BulletCustom']))

    story.append(Spacer(1, 8))

    story.append(Paragraph("3.5 Specialized Domain Engines", styles['SubSectionHeading']))
    story.append(Paragraph("• <b>Sales Intelligence (/intelligence/sales):</b> Evaluates retail footfall against revenue, top-performing stores (e.g., Suitor Guy Edappally), conversion rates, and consultant sales incentives.", styles['BulletCustom']))
    story.append(Paragraph("• <b>Finance Intelligence (/intelligence/finance):</b> Analyzes department salary overhead, overtime financial drain, budget attainment, and compensation cost ratios.", styles['BulletCustom']))
    story.append(Paragraph("• <b>Operations Intelligence (/intelligence/operations):</b> Monitors store shift coverage, rest period compliance (11-hour statutory turnaround between shifts), and store manager staffing.", styles['BulletCustom']))
    story.append(Paragraph("• <b>Marketing Intelligence (/intelligence/marketing):</b> Correlates promotional campaigns with store walk-in spikes and retail staff capacity.", styles['BulletCustom']))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 4: STEP-BY-STEP OPERATOR WORKFLOWS
    # =========================================================================
    story.append(Paragraph("4. Step-by-Step Operator Workflows", styles['SectionHeading']))
    story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph("Workflow A: Ingesting New Workforce Data Files", styles['SubSectionHeading']))
    wf_a = [
        [Paragraph("Step", styles['TableHeader']), Paragraph("Action Description", styles['TableHeader']), Paragraph("Expected System Response", styles['TableHeader'])],
        [
            Paragraph("<b>1</b>", styles['TableCellBold']),
            Paragraph("Navigate to <b>HR Data</b> via sidebar navigation (<code>/intelligence/hr/data</code>).", styles['TableCell']),
            Paragraph("Page loads Ingestion Zone, Connected Files list, and Active Analysis Summary.", styles['TableCell'])
        ],
        [
            Paragraph("<b>2</b>", styles['TableCellBold']),
            Paragraph("Drag your Excel file (e.g., <code>Attendance_Muster__October-2026.xls</code> or <code>Employee_Directory.xlsx</code>) into the upload box.", styles['TableCell']),
            Paragraph("Green upload progress bar appears; file uploads and displays in Connected Files with 'All rows valid'.", styles['TableCell'])
        ],
        [
            Paragraph("<b>3</b>", styles['TableCellBold']),
            Paragraph("Click <b>Preview</b> on the file card.", styles['TableCell']),
            Paragraph("Modal opens showing the first 15 normalized records with auto-detected columns.", styles['TableCell'])
        ],
        [
            Paragraph("<b>4</b>", styles['TableCellBold']),
            Paragraph("Click <b>Run AI Intelligence Synthesis</b> or adjust rule sliders.", styles['TableCell']),
            Paragraph("System initiates mathematical correlation and Claude AI synthesis in the background.", styles['TableCell'])
        ]
    ]
    t_wfa = Table(wf_a, colWidths=[40, 260, 204])
    t_wfa.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_wfa)

    story.append(Spacer(1, 12))

    story.append(Paragraph("Workflow B: Executing Branch-Specific Inquiries (Anti-Leakage)", styles['SubSectionHeading']))
    wf_b = [
        [Paragraph("Step", styles['TableHeader']), Paragraph("Action Description", styles['TableHeader']), Paragraph("Expected System Response", styles['TableHeader'])],
        [
            Paragraph("<b>1</b>", styles['TableCellBold']),
            Paragraph("Navigate to <b>HR Intelligence</b> (<code>/intelligence/hr</code>).", styles['TableCell']),
            Paragraph("Global dashboard displays all 25 retail branches and combined workforce metrics.", styles['TableCell'])
        ],
        [
            Paragraph("<b>2</b>", styles['TableCellBold']),
            Paragraph("Click the chip <b>'Edappally Branch Focus'</b> or type <i>'Suitor Guy Edappally'</i> in the Prompt Bar and press <b>Enter</b> or click <b>Apply Prompt</b>.", styles['TableCell']),
            Paragraph("Prompt indicator turns active. System executes scoped prompt isolation.", styles['TableCell'])
        ],
        [
            Paragraph("<b>3</b>", styles['TableCellBold']),
            Paragraph("Review filtered KPIs and attention items.", styles['TableCell']),
            Paragraph("Store count drops to 1, Attention items show only Edappally alerts, and employee roster lists only Edappally staff.", styles['TableCell'])
        ],
        [
            Paragraph("<b>4</b>", styles['TableCellBold']),
            Paragraph("To restore full network view, click <b>'Show All Data (Reset)'</b> chip.", styles['TableCell']),
            Paragraph("Prompt clears and full enterprise telemetry across all 25 locations re-emerges.", styles['TableCell'])
        ]
    ]
    t_wfb = Table(wf_b, colWidths=[40, 260, 204])
    t_wfb.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_wfb)

    story.append(Spacer(1, 12))

    story.append(Paragraph("Workflow C: Resolving Anomaly & Pushing to Brynex One Tasks", styles['SubSectionHeading']))
    story.append(Paragraph("1. On any Attention Card, click <b>'Review Decision Options'</b>.", styles['BulletCustom']))
    story.append(Paragraph("2. The Layer 6 Decision Engine Modal opens displaying:", styles['BulletCustom']))
    story.append(Paragraph("   • <b>Option A (Conservative / Policy):</b> Immediate statutory compliance or formal policy enforcement.", styles['BulletCustom']))
    story.append(Paragraph("   • <b>Option B (Balanced Tactical):</b> Recommended pragmatic balance of cost, staff morale, and store operations.", styles['BulletCustom']))
    story.append(Paragraph("   • <b>Option C (Structural / Strategic):</b> Permanent roster restructuring or hiring overhaul.", styles['BulletCustom']))
    story.append(Paragraph("3. Select your chosen Option and click <b>'Approve & Push to Brynex One Task'</b>.", styles['BulletCustom']))
    story.append(Paragraph("4. The system encodes the title, description, priority, and assigned store into URL parameters and securely redirects to <code>https://brynexone.brynex.com/task/create</code> with pre-filled fields.", styles['BulletCustom']))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 5: DEPLOYMENT, CONNECTIVITY & CONFIGURATION
    # =========================================================================
    story.append(Paragraph("5. Deployment, Connectivity & Configuration Guide", styles['SectionHeading']))
    story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "Brynex One is architected for zero-downtime, distributed deployment across Vercel (Frontend CDN) and "
        "Render Cloud (Node.js API Microservice).",
        styles['BodyCustom']
    ))

    story.append(Paragraph("5.1 Vercel Frontend Configuration & SPA Rewrites (vercel.json)", styles['SubSectionHeading']))
    story.append(Paragraph(
        "To guarantee that sub-route browser refreshes (such as refreshing <code>/intelligence/hr</code>) do not trigger 404 blank screens, "
        "and to completely eliminate CORS cross-origin errors in the browser, both <code>frontend/vercel.json</code> and root <code>vercel.json</code> "
        "are configured as follows:",
        styles['BodyCustom']
    ))

    code_vj = """{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://ai-hr-dashboard-brynex-testenv.onrender.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}"""
    tbl_vj = Table([[Paragraph(f"<pre>{code_vj}</pre>", styles['CodeBlock'])]], colWidths=[504])
    tbl_vj.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_LIGHT),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(tbl_vj)
    story.append(Spacer(1, 8))

    story.append(Paragraph("5.2 Centralized Frontend Endpoint Router (frontend/src/api.js)", styles['SubSectionHeading']))
    story.append(Paragraph(
        "To change the backend link in one single location without editing dozens of React page files, edit <code>frontend/src/api.js</code>:",
        styles['BodyCustom']
    ))

    code_api = """// In frontend/src/api.js:
export const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  'https://ai-hr-dashboard-brynex-testenv.onrender.com';

export const API_BASE_URL = BACKEND_URL.replace(/\\/+$/, '');

export const apiUrl = (endpoint = '') => {
  if (!endpoint) return API_BASE_URL;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
};

export const apiFetch = (endpoint, options = {}) => fetch(apiUrl(endpoint), options);"""

    tbl_api = Table([[Paragraph(f"<pre>{code_api}</pre>", styles['CodeBlock'])]], colWidths=[504])
    tbl_api.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_LIGHT),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(tbl_api)
    story.append(Spacer(1, 8))

    story.append(Paragraph("5.3 Render Cloud Backend Environment Variables", styles['SubSectionHeading']))
    story.append(Paragraph("In your Render Dashboard Service Settings, ensure these variables are configured:", styles['BodyCustom']))

    env_data = [
        [Paragraph("Variable Name", styles['TableHeader']), Paragraph("Required Value / Example", styles['TableHeader']), Paragraph("Description", styles['TableHeader'])],
        [Paragraph("<b>PORT</b>", styles['TableCellBold']), Paragraph("5000", styles['TableCell']), Paragraph("Port bound by Express server on Render container.", styles['TableCell'])],
        [Paragraph("<b>CLIENT_URL</b>", styles['TableCellBold']), Paragraph("https://your-frontend.vercel.app", styles['TableCell']), Paragraph("Vercel production domain allowed through CORS.", styles['TableCell'])],
        [Paragraph("<b>ANTHROPIC_API_KEY</b>", styles['TableCellBold']), Paragraph("sk-ant-api03-...", styles['TableCell']), Paragraph("Required for Claude AI document analysis and chat.", styles['TableCell'])],
        [Paragraph("<b>MONGO_URI</b>", styles['TableCellBold']), Paragraph("mongodb+srv://...", styles['TableCell']), Paragraph("Optional MongoDB connection string for persisted chat & prompts.", styles['TableCell'])],
    ]
    t_env = Table(env_data, colWidths=[130, 180, 194])
    t_env.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_env)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 6: TROUBLESHOOTING & FAQ
    # =========================================================================
    story.append(Paragraph("6. Troubleshooting, Fallbacks & Error Catalog", styles['SectionHeading']))
    story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=2, spaceAfter=10))

    faq_data = [
        [
            Paragraph("<b>Issue / Symptom</b>", styles['TableHeader']),
            Paragraph("<b>Underlying Cause</b>", styles['TableHeader']),
            Paragraph("<b>Standard Resolution Procedure</b>", styles['TableHeader'])
        ],
        [
            Paragraph("<b>Vercel build fails with 'vite: Permission denied'</b>", styles['TableCellBold']),
            Paragraph("<code>node_modules/</code> was tracked in Git from Windows, stripping Linux execute (+x) permissions.", styles['TableCell']),
            Paragraph("Run <code>git rm -r --cached frontend/node_modules backend/node_modules</code> and commit. (Already fixed in repo commit 2a43729).", styles['TableCell'])
        ],
        [
            Paragraph("<b>Blank screen upon refreshing sub-routes on Vercel</b>", styles['TableCellBold']),
            Paragraph("Static web server attempts to find physical directory instead of routing through React Router SPA.", styles['TableCell']),
            Paragraph("Ensure <code>vercel.json</code> includes the rewrite rule mapping <code>/(.*)</code> to <code>/index.html</code>.", styles['TableCell'])
        ],
        [
            Paragraph("<b>Render Backend initial request takes 30-50 seconds</b>", styles['TableCellBold']),
            Paragraph("Render Free tier instances spin down after 15 minutes of inactivity (Cold Start).", styles['TableCell']),
            Paragraph("This is expected behavior on free tiers. The frontend shows animated loading telemetry. Upgrade to Render Starter or ping every 10 min.", styles['TableCell'])
        ],
        [
            Paragraph("<b>Uploaded Excel file shows '0 valid rows'</b>", styles['TableCellBold']),
            Paragraph("Spreadsheet contains multiple title banners or unsupported non-standard date formatting.", styles['TableCell']),
            Paragraph("The adaptive parser searches the first 10 rows for recognized headers. Ensure employee name or ID is present in column headers.", styles['TableCell'])
        ],
        [
            Paragraph("<b>Claude AI Analysis shows 'API Key not configured'</b>", styles['TableCellBold']),
            Paragraph("<code>ANTHROPIC_API_KEY</code> is missing from backend environment variables.", styles['TableCell']),
            Paragraph("Add the key in Render Environment Variables. Note: If missing, system gracefully falls back to deterministic mathematical correlation.", styles['TableCell'])
        ]
    ]

    t_faq = Table(faq_data, colWidths=[140, 164, 200])
    t_faq.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_faq)

    story.append(Spacer(1, 20))

    # Closing Sign-off
    closing = (
        "<b>System Support & Maintenance:</b> For additional feature requests, API key rotations, or custom enterprise "
        "LMS connector modifications, consult the Brynex Technology Development Brief or contact the enterprise engineering lead at "
        "<code>techrootments@gmail.com</code>.<br/><br/>"
        "<i>Brynex One AI HR Brain • Copyright © 2026 Brynex Technology Group. All Rights Reserved.</i>"
    )
    story.append(callout(closing, bg_color=BG_LIGHT, border_color=SECONDARY, title="DOCUMENTATION CLOSING SIGN-OFF"))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] PDF generated successfully: {filename}")


if __name__ == '__main__':
    output_pdf = sys.argv[1] if len(sys.argv) > 1 else "Brynex_AI_HR_Dashboard_User_Manual.pdf"
    build_pdf(output_pdf)
