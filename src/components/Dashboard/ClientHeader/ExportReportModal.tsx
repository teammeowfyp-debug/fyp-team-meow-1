import React, { useState, useRef } from 'react';
import { FocusModal } from '../../UI/FocusModal';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import AssetAllocation from '../AssetAllocation';
import Cashflow from '../Cashflow';
import { renderCleanList } from '../Insights/Insights.components';
import { Button } from '../../UI/Button';
import calibreLogo from '../../../assets/calibre logo.png';

interface ExportReportModalProps {
    client: any;
    startDate: string;
    endDate: string;
    dashboardStartDate: string;
    dashboardEndDate: string;
    cache: any;
    onClose: () => void;
    onFocusQuadrant?: (quadId: string, mode?: string) => void;
}

/* ─── PDF Specific Styles ─── */
const GOLD = '#C5B358';

const PDF_S = {
    page: {
        width: '800px',
        minHeight: '1120px',
        background: '#fff',
        color: '#333',
        boxSizing: 'border-box' as const,
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative' as const,
        overflow: 'hidden' as const,
        padding: '60px 40px'
    },
    coverPage: {
        width: '800px',
        height: '1120px',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center' as const,
        background: '#fff',
        padding: '80px 40px'
    },
    sectionTitle: {
        fontSize: '24px', color: GOLD, borderBottom: `3px solid ${GOLD}`,
        paddingBottom: '12px', marginBottom: '24px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.05em'
    },
    subTitle: { fontSize: '15px', color: GOLD, marginBottom: '14px', marginTop: '24px', fontWeight: 700 as const, textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
    table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '9px', marginBottom: '24px', tableLayout: 'fixed' as const },
    th: {
        textAlign: 'left' as const, padding: '8px 8px', background: '#f8f9fa',
        borderBottom: '2px solid #dee2e6', fontWeight: 700, color: '#495057', fontSize: '8px',
        textTransform: 'uppercase' as const, letterSpacing: '0.05em', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis'
    },
    td: { padding: '8px 8px', borderBottom: '1px solid #eee', verticalAlign: 'top' as const, lineHeight: '1.4', overflow: 'hidden', wordWrap: 'break-word' as const },
    tdRight: { padding: '8px 8px', borderBottom: '1px solid #eee', textAlign: 'right' as const, verticalAlign: 'top' as const, fontWeight: 500 },
    infoGrid: { display: 'grid' as const, gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 25px', fontSize: '11px', marginBottom: '15px' },
    infoLabel: { fontSize: '9px', textTransform: 'uppercase' as const, color: '#888', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '3px' },
    infoValue: { color: 'var(--secondary)', fontWeight: 600 as const, wordBreak: 'break-word' as const },
    footer: {
        position: 'absolute' as const, bottom: '40px', left: '0', right: '0',
        padding: '0 40px', display: 'flex', alignItems: 'center',
        fontSize: '9px', color: '#aaa', borderTop: '1px solid #f0f0f0', paddingTop: '15px'
    },
    footerItem: { flex: 1 }
};

const fmtDate = (d: string | null | undefined) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return '-'; }
};

const fmtCurrency = (v: any) => {
    const n = parseFloat(v || 0);
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const fmtLabel = (key: string) => {
    if (key === 'address_type') return 'Type of Address';
    if (key === 'house_block_no') return 'House / Block';
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const fmtValue = (key: string, value: any) => {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) return value.join(', ');
    let display = value.toString();
    if (typeof value === 'number' || (typeof value === 'string' && /^\d+\.0$/.test(value))) {
        display = display.replace(/\.0$/, '');
    }
    if (key.includes('date') || key === 'last_updated') {
        try { return new Date(value).toLocaleDateString('en-SG', { day: '2-digit', month: 'long', year: 'numeric' }); }
        catch { return display; }
    }
    return display;
};

const chunkArray = (arr: any[], size: number) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
};

const ExportReportModal: React.FC<ExportReportModalProps> = ({
    client,
    startDate: initialStartDate,
    endDate: initialEndDate,
    cache,
    onClose,
    onFocusQuadrant
}) => {
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [filename, setFilename] = useState(`${client.full_name}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    const [isExporting, setIsExporting] = useState(false);
    const [statusText, setStatusText] = useState('');

    const [includeRiskAnalysis, setIncludeRiskAnalysis] = useState(false);
    const [includeMeetingNotes, setIncludeMeetingNotes] = useState(false);

    const reportRef = useRef<HTMLDivElement>(null);

    const isRiskAnalysisValid = !!(
        cache?.overview &&
        cache?.generatedPeriod?.startDate?.substring(0, 10) === startDate?.substring(0, 10) &&
        cache?.generatedPeriod?.endDate?.substring(0, 10) === endDate?.substring(0, 10)
    );

    const isMeetingNotesValid = !!(
        cache?.meetingNotes &&
        cache?.meetingNotesSummary
    );

    /* ─── Derive all report data ─── */
    const allPlans = client.client_plans || [];

    const filteredCashflows = (client?.cashflow || [])
        .filter((item: any) => {
            const d = item.as_of_date.substring(0, 10);
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
        })
        .sort((a: any, b: any) => new Date(a.as_of_date).getTime() - new Date(b.as_of_date).getTime());

    const basicFields = ['name_as_per_id', 'id_type', 'id_no', 'title', 'gender', 'date_of_birth', 'age', 'nationality', 'singapore_pr'];
    const personalProfileFields = ['marital_status', 'smoker_status', 'race', 'qualification', 'languages_spoken', 'languages_written', 'risk_profile', 'employment_status', 'occupation'];
    const contactFields = ['email', 'mobile_no', 'home_no', 'office_no'];
    const addressFields = ['address_type', 'postal_district', 'house_block_no', 'street_name', 'building_name', 'unit_no'];

    const handleExport = async () => {
        setIsExporting(true);
        setStatusText('Preparing Document...');

        // showSaveFilePicker must run before any other await: the browser only allows it during a user gesture.
        let saveHandle: FileSystemFileHandle | undefined;
        if ('showSaveFilePicker' in window) {
            try {
                // @ts-expect-error File System Access API
                saveHandle = await window.showSaveFilePicker({
                    suggestedName: filename || 'Report.pdf',
                    types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
                });
            } catch (err: unknown) {
                const e = err as { name?: string };
                if (e.name === 'AbortError') {
                    setIsExporting(false);
                    return;
                }
                console.error('Failed to generate report:', err);
                alert('An error occurred during export. Please check the console for details.');
                setIsExporting(false);
                return;
            }
        }

        try {
            await new Promise(r => setTimeout(r, 1000));

            if (!reportRef.current) return;

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const pageElements = reportRef.current.querySelectorAll('.pdf-page');

            for (let i = 0; i < pageElements.length; i++) {
                const element = pageElements[i] as HTMLElement;
                const sectionTag = element.querySelector('h2');
                let sectionName = '';

                if (i === 0) {
                    setStatusText('Rendering Cover Page...');
                } else {
                    if (sectionTag && sectionTag.textContent) {
                        sectionName = sectionTag.textContent.replace(/^\d+\.\s*/, '');
                    } else if (i === 1) {
                        sectionName = 'Table of Contents';
                    }
                    setStatusText(`Rendering Page ${i} of ${pageElements.length - 1} — ${sectionName}...`);
                }

                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    width: 800,
                    height: 1120
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.9);

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
            }

            setStatusText('Saving PDF File...');
            const pdfBlob = pdf.output('blob');

            if (saveHandle) {
                const writable = await saveHandle.createWritable();
                await writable.write(pdfBlob);
                await writable.close();
            } else {
                pdf.save(filename || 'Report.pdf');
            }
            onClose();

        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Failed to generate report:', err);
                alert('An error occurred during export. Please check the console for details.');
            }
        } finally {
            setIsExporting(false);
        }
    };

    const renderFooter = (page: number, total: number) => (
        <div style={PDF_S.footer}>
            <span style={{ ...PDF_S.footerItem, textAlign: 'left' }}>Confidential | Calibre Advisory</span>
            <span style={{ ...PDF_S.footerItem, textAlign: 'center' }}>Page {page} of {total}</span>
            <span style={{ ...PDF_S.footerItem, textAlign: 'right' }}>{new Date().toLocaleDateString('en-SG')}</span>
        </div>
    );

    const renderInfoSection = (title: string, fields: string[]) => (
        <div style={{ marginBottom: '20px' }}>
            <h4 style={PDF_S.subTitle}>{title}</h4>
            <div style={PDF_S.infoGrid}>
                {fields.map(key => (
                    <div key={key}>
                        <div style={PDF_S.infoLabel}>{fmtLabel(key)}</div>
                        <div style={PDF_S.infoValue}>{fmtValue(key, client[key])}</div>
                    </div>
                ))}
            </div>
        </div>
    );

    /* ─── Calculate Chunking for Safe Boundaries ─── */
    const familyChunks = chunkArray(client.client_family || [], 8);
    const profilePages = 1 + Math.max(0, familyChunks.length - 1); // first chunk fits on profile page, rest overflow

    const planChunksSummary = chunkArray(allPlans, 12);
    const planChunksDetails = chunkArray(allPlans, 1);
    const cashflowChunks = chunkArray(filteredCashflows, 30);

    let cashflowMonths: string[] = [...(client.cashflow || [])].sort((a: any, b: any) => new Date(a.as_of_date).getTime() - new Date(b.as_of_date).getTime()).map((c: any) => c.as_of_date).filter((d: string) => (!startDate || d.substring(0, 10) >= startDate) && (!endDate || d.substring(0, 10) <= endDate));
    const assetClassSet = new Set<string>(); (client.client_plans || []).forEach((p: any) => assetClassSet.add(p.asset_class));
    const classes = Array.from(assetClassSet).filter(c => c !== 'Insurance (Wealth)');
    const allocationHistoryChunks = chunkArray(cashflowMonths, 25);

    const pages = {
        cover: 1,
        toc: 1,
        profile: profilePages,
        portfolio: Math.max(1, planChunksSummary.length) + planChunksDetails.length,
        cashflow: 1 + Math.max(1, cashflowChunks.length),
        allocation: 1 + Math.max(1, allocationHistoryChunks.length),
        risk: includeRiskAnalysis ? 1 : 0,
        meeting: includeMeetingNotes ? 1 : 0
    };

    let offset = 2; // TOC is Page 1, so Personal Profile starts at Page 2
    const profileRange = { start: offset, end: offset + pages.profile - 1 };
    offset = profileRange.end + 1;

    const cashflowRange = { start: offset, end: offset + pages.cashflow - 1 };
    offset = cashflowRange.end + 1;

    const portfolioRange = { start: offset, end: offset + pages.portfolio - 1 };
    offset = portfolioRange.end + 1;

    const allocRange = { start: offset, end: offset + pages.allocation - 1 };
    offset = allocRange.end + 1;

    const riskRange = pages.risk ? { start: offset, end: offset + pages.risk - 1 } : null;
    if (pages.risk) offset += pages.risk;

    const meetingRange = pages.meeting ? { start: offset, end: offset + pages.meeting - 1 } : null;
    if (pages.meeting) offset += pages.meeting;

    const totalPages = offset - 1;
    let currentPage = 1;

    const formatRange = (r: { start: number, end: number }) => r.start === r.end ? `${r.start}` : `${r.start} – ${r.end}`;

    // Build TOC entries with subsections
    let sectionNum = 1;
    const tocSections: { num: string; title: string; range: string; indent?: boolean }[] = [];

    tocSections.push({ num: `${sectionNum}`, title: 'Personal Profile', range: formatRange(profileRange) });
    tocSections.push({ num: `${sectionNum}.1`, title: 'Basic Details', range: '', indent: true });
    tocSections.push({ num: `${sectionNum}.2`, title: 'Personal Profile', range: '', indent: true });
    tocSections.push({ num: `${sectionNum}.3`, title: 'Contact Information', range: '', indent: true });
    tocSections.push({ num: `${sectionNum}.4`, title: 'Residential Address', range: '', indent: true });
    if ((client.client_family || []).length > 0) {
        tocSections.push({ num: `${sectionNum}.5`, title: 'Family Members', range: '', indent: true });
    }
    sectionNum++;

    tocSections.push({ num: `${sectionNum}`, title: 'Cashflow', range: formatRange(cashflowRange) });
    tocSections.push({ num: `${sectionNum}.1`, title: 'Trend Visualisation', range: '', indent: true });
    tocSections.push({ num: `${sectionNum}.2`, title: 'History by Component', range: '', indent: true });
    sectionNum++;

    tocSections.push({ num: `${sectionNum}`, title: 'Plans Held', range: formatRange(portfolioRange) });
    tocSections.push({ num: `${sectionNum}.1`, title: 'Holdings Summary', range: '', indent: true });
    tocSections.push({ num: `${sectionNum}.2`, title: 'Individual Valuations', range: '', indent: true });
    sectionNum++;

    tocSections.push({ num: `${sectionNum}`, title: 'Asset Allocation', range: formatRange(allocRange) });
    tocSections.push({ num: `${sectionNum}.1`, title: 'Trend Visualisation', range: '', indent: true });
    tocSections.push({ num: `${sectionNum}.2`, title: 'History by Asset Type', range: '', indent: true });
    sectionNum++;

    if (riskRange) {
        tocSections.push({ num: `${sectionNum}`, title: 'Risk Analysis', range: formatRange(riskRange) });
        tocSections.push({ num: `${sectionNum}.1`, title: 'Summary', range: '', indent: true });
        tocSections.push({ num: `${sectionNum}.2`, title: 'Key Insights', range: '', indent: true });
        tocSections.push({ num: `${sectionNum}.3`, title: 'Potential Risks', range: '', indent: true });
        tocSections.push({ num: `${sectionNum}.4`, title: 'Recommendations', range: '', indent: true });
        sectionNum++;
    }
    if (meetingRange) {
        tocSections.push({ num: `${sectionNum}`, title: 'Meeting Notes', range: formatRange(meetingRange) });
        tocSections.push({ num: `${sectionNum}.1`, title: 'Summary', range: '', indent: true });
        tocSections.push({ num: `${sectionNum}.2`, title: 'Key Takeaways', range: '', indent: true });
        tocSections.push({ num: `${sectionNum}.3`, title: 'Action Items', range: '', indent: true });
        tocSections.push({ num: `${sectionNum}.4`, title: 'Financial Insights', range: '', indent: true });
    }


    return (
        <FocusModal 
            isOpen={true} 
            onClose={onClose} 
            modalContentClassName="modal-sm"
            modalContentStyle={{ maxWidth: '480px', padding: '0' }}
        >
            <div className="modal-header" style={{ padding: '2rem 2rem 1rem 2rem', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 'var(--text-2xl)', color: 'var(--secondary)', margin: 0 }}>Export Client Report</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: '0.25rem' }}>Generate a comprehensive financial review for your client</p>
            </div>

            <div className="modal-body" style={{ padding: '2rem' }}>
                {isExporting ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', gap: '1.5rem' }}>
                        <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--primary-glow)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--secondary)', fontSize: '1rem' }}>Generating Report</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{statusText}</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Analysis Period</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }} />
                                <span style={{ color: '#888' }}>-</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Filename</label>
                            <input type="text" value={filename} onChange={e => setFilename(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }} />
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={includeRiskAnalysis}
                                        onChange={e => setIncludeRiskAnalysis(e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Include Risk Analysis</span>
                                </label>
                                {includeRiskAnalysis && !isRiskAnalysisValid && (
                                    <div className="error-text" style={{ marginLeft: '26px', padding: '10px', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', margin: '4px 0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                            </svg>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                                {cache?.overview
                                                    ? `This analysis was generated for a different period (${fmtDate(cache.generatedPeriod?.startDate)} - ${fmtDate(cache.generatedPeriod?.endDate)})`
                                                    : 'No risk analysis found.'}
                                            </span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="small"
                                            onClick={() => { onFocusQuadrant?.('risk', 'risk-analysis'); onClose(); }}
                                            style={{ alignSelf: 'flex-start', fontSize: '0.75rem', padding: '4px 10px', color: 'var(--danger)', borderColor: 'rgba(155, 34, 38, 0.3)' }}
                                        >
                                            Go to Risk Analysis
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={includeMeetingNotes}
                                        onChange={e => setIncludeMeetingNotes(e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Include Meeting Notes</span>
                                </label>
                                {includeMeetingNotes && !isMeetingNotesValid && (
                                    <div className="error-text" style={{ marginLeft: '26px', padding: '10px', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', margin: '4px 0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                            </svg>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>No meeting notes found.</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="small"
                                            onClick={() => { onFocusQuadrant?.('risk', 'meeting-notes'); onClose(); }}
                                            style={{ alignSelf: 'flex-start', fontSize: '0.75rem', padding: '4px 10px', color: 'var(--danger)', borderColor: 'rgba(155, 34, 38, 0.3)' }}
                                        >
                                            Go to Meeting Notes
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            size="large"
                            fullWidth
                            onClick={handleExport}
                            disabled={!filename.trim() || !startDate || !endDate || (includeRiskAnalysis && !isRiskAnalysisValid) || (includeMeetingNotes && !isMeetingNotesValid)}
                        >
                            Generate Report
                        </Button>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                HIDDEN REPORT CONTAINER — Multi-Page PDF Engine
               ══════════════════════════════════════════════════════════════ */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
                <div ref={reportRef} style={{ background: '#f5f5f5' }}>

                    {/* COVER */}
                    <div className="pdf-page" style={PDF_S.coverPage}>
                        <img src={calibreLogo} alt="" style={{ width: '320px', marginBottom: '100px' }} />
                        <div style={{ width: '160px', height: '6px', background: GOLD, marginBottom: '50px' }} />
                        <h1 style={{ fontSize: '56px', color: 'var(--secondary)', margin: '0 0 10px 0', fontWeight: 900 }}>Client Report</h1>
                        <h2 style={{ fontSize: '22px', color: GOLD, margin: '0 0 80px 0', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Private & Confidential</h2>

                        <div style={{ marginTop: 'auto', textAlign: 'center' }}>
                            <p style={{ fontSize: '20px', color: '#666', margin: '0 0 6px 0' }}>Financial Review for</p>
                            <p style={{ fontSize: '38px', color: 'var(--secondary)', margin: '0 0 50px 0', fontWeight: 800 }}>{client.full_name}</p>

                            <div style={{ display: 'flex', gap: '60px', justifyContent: 'center', borderTop: '1px solid #eee', paddingTop: '40px' }}>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={PDF_S.infoLabel}>Analysis Period</p>
                                    <p style={{ ...PDF_S.infoValue, fontSize: '15px' }}>{fmtDate(startDate)} — {fmtDate(endDate)}</p>
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={PDF_S.infoLabel}>Document Date</p>
                                    <p style={{ ...PDF_S.infoValue, fontSize: '15px' }}>{new Date().toLocaleDateString('en-SG', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TOC */}
                    <div className="pdf-page" style={PDF_S.page}>
                        <h2 style={PDF_S.sectionTitle}>Table of Contents</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', padding: '0 10px' }}>
                            {tocSections.map((sec, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    borderBottom: sec.indent ? 'none' : '1px dotted #bbb',
                                    paddingBottom: sec.indent ? '2px' : '10px',
                                    paddingTop: sec.indent ? '2px' : '14px',
                                    paddingLeft: sec.indent ? '30px' : '0'
                                }}>
                                    <span style={{
                                        fontSize: sec.indent ? '12px' : '15px',
                                        fontWeight: sec.indent ? 400 : 600,
                                        color: sec.indent ? '#666' : '#333'
                                    }}>{sec.num}. {sec.title}</span>
                                    {sec.range && <span style={{ color: '#888', fontSize: sec.indent ? '12px' : '14px' }}>{sec.range}</span>}
                                </div>
                            ))}
                        </div>
                        {renderFooter(currentPage++, totalPages)}
                    </div>

                    {/* SECTION 1: Client Personal Profile (page 1 with first family chunk) */}
                    <div className="pdf-page" style={PDF_S.page}>
                        <h2 style={PDF_S.sectionTitle}>1. Personal Profile</h2>
                        {renderInfoSection('1.1 Basic Details', basicFields)}
                        {renderInfoSection('1.2 Personal Profile', personalProfileFields)}
                        {renderInfoSection('1.3 Contact Information', contactFields)}
                        {renderInfoSection('1.4 Residential Address', addressFields)}

                        {familyChunks.length > 0 && (
                            <>
                                <h4 style={PDF_S.subTitle}>1.5 Family Members</h4>
                                <table style={PDF_S.table}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...PDF_S.th, width: '22%' }}>Name</th>
                                            <th style={{ ...PDF_S.th, width: '10%' }}>Gender</th>
                                            <th style={{ ...PDF_S.th, width: '10%' }}>Rel.</th>
                                            <th style={{ ...PDF_S.th, width: '12%' }}>DOB</th>
                                            <th style={{ ...PDF_S.th, width: '8%' }}>Age</th>
                                            <th style={{ ...PDF_S.th, width: '12%', textAlign: 'right' }}>Upkeep/mo</th>
                                            <th style={{ ...PDF_S.th, width: '12%' }}>Support Till</th>
                                            <th style={{ ...PDF_S.th, width: '14%' }}>Yrs to Support</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {familyChunks[0].map((m: any, i: number) => (
                                            <tr key={i}>
                                                <td style={{ ...PDF_S.td, fontWeight: 600 }}>{m.family_member_name}</td>
                                                <td style={PDF_S.td}>{m.gender}</td>
                                                <td style={PDF_S.td}>{m.relationship}</td>
                                                <td style={PDF_S.td}>{fmtDate(m.date_of_birth)}</td>
                                                <td style={PDF_S.td}>{m.age}</td>
                                                <td style={PDF_S.tdRight}>{fmtCurrency(m.monthly_upkeep)}</td>
                                                <td style={PDF_S.td}>{m.support_until_age ? `Age ${m.support_until_age}` : '-'}</td>
                                                <td style={PDF_S.td}>{m.years_to_support ?? '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                        {renderFooter(currentPage++, totalPages)}
                    </div>

                    {/* Overflow family pages */}
                    {familyChunks.slice(1).map((chunk, chunkIdx) => (
                        <div key={`family-overflow-${chunkIdx}`} className="pdf-page" style={PDF_S.page}>
                            <h2 style={PDF_S.sectionTitle}>1. Personal Profile</h2>
                            <h4 style={PDF_S.subTitle}>1.5 Family Members (cont.)</h4>
                            <table style={PDF_S.table}>
                                <thead>
                                    <tr>
                                        <th style={{ ...PDF_S.th, width: '22%' }}>Name</th>
                                        <th style={{ ...PDF_S.th, width: '10%' }}>Gender</th>
                                        <th style={{ ...PDF_S.th, width: '10%' }}>Rel.</th>
                                        <th style={{ ...PDF_S.th, width: '12%' }}>DOB</th>
                                        <th style={{ ...PDF_S.th, width: '8%' }}>Age</th>
                                        <th style={{ ...PDF_S.th, width: '12%', textAlign: 'right' }}>Upkeep/mo</th>
                                        <th style={{ ...PDF_S.th, width: '12%' }}>Support Till</th>
                                        <th style={{ ...PDF_S.th, width: '14%' }}>Yrs to Support</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chunk.map((m: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ ...PDF_S.td, fontWeight: 600 }}>{m.family_member_name}</td>
                                            <td style={PDF_S.td}>{m.gender}</td>
                                            <td style={PDF_S.td}>{m.relationship}</td>
                                            <td style={PDF_S.td}>{fmtDate(m.date_of_birth)}</td>
                                            <td style={PDF_S.td}>{m.age}</td>
                                            <td style={PDF_S.tdRight}>{fmtCurrency(m.monthly_upkeep)}</td>
                                            <td style={PDF_S.td}>{m.support_until_age ? `Age ${m.support_until_age}` : '-'}</td>
                                            <td style={PDF_S.td}>{m.years_to_support ?? '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {renderFooter(currentPage++, totalPages)}
                        </div>
                    ))}

                    {/* SECTION 2: CASHFLOW CHART */}
                    <div className="pdf-page" style={PDF_S.page}>
                        <h2 style={PDF_S.sectionTitle}>2. Cashflow</h2>
                        <h4 style={PDF_S.subTitle}>2.1 Trend Visualisation</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginBottom: '30px' }}>
                            <div style={{ height: '420px', background: '#fff', border: '1px solid #eee', padding: '10px', borderRadius: '8px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: '#666', textAlign: 'center', margin: '0 0 8px' }}>Periodic</p>
                                <Cashflow client={client} mode="overview" dateRange={{ startDate, endDate }} isExporting={true} forceViewMode="periodic" />
                            </div>
                            <div style={{ height: '420px', background: '#fff', border: '1px solid #eee', padding: '10px', borderRadius: '8px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: '#666', textAlign: 'center', margin: '0 0 8px' }}>Cumulative</p>
                                <Cashflow client={client} mode="overview" dateRange={{ startDate, endDate }} isExporting={true} forceViewMode="cumulative" />
                            </div>
                        </div>
                        {renderFooter(currentPage++, totalPages)}
                    </div>

                    {/* SECTION 2: DETAILED CASHFLOW TABLES */}
                    {cashflowChunks.length === 0 ? (
                        <div className="pdf-page" style={PDF_S.page}>
                            <h2 style={PDF_S.sectionTitle}>2. Cashflow</h2>
                            <h4 style={PDF_S.subTitle}>2.2 History by Component</h4>
                            <p style={{ fontSize: '12px', color: '#666' }}>No cashflow data in this period.</p>
                            {renderFooter(currentPage++, totalPages)}
                        </div>
                    ) : cashflowChunks.map((chunk, chunkIdx) => (
                        <div key={`cf-chunk-${chunkIdx}`} className="pdf-page" style={PDF_S.page}>
                            <h2 style={PDF_S.sectionTitle}>2. Cashflow</h2>
                            <h4 style={PDF_S.subTitle}>2.2 History by Component</h4>

                            <table style={{ ...PDF_S.table, fontSize: '7.5px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...PDF_S.th, width: '48px', fontSize: '7px' }} rowSpan={2}>Date</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'center', background: '#eef5ee', fontSize: '7px' }} colSpan={4}>Inflows</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'center', background: '#fff5f5', fontSize: '7px' }} colSpan={9}>Outflows</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', background: '#f0f2f5', fontWeight: 800, fontSize: '7px' }}>Net</th>
                                    </tr>
                                    <tr style={{ fontSize: '6.5px' }}>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', fontSize: '6.5px' }}>Emp.</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', fontSize: '6.5px' }}>Rental</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', fontSize: '6.5px' }}>Invest.</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', background: '#dcecdb', fontSize: '6.5px' }}>TOTAL</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', fontSize: '6.5px' }}>H'hold</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', fontSize: '6.5px' }}>Tax</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', fontSize: '6.5px' }}>Ins.</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', fontSize: '6.5px' }}>Prop.</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', fontSize: '6.5px' }}>Mort.</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', fontSize: '6.5px' }}>Loans</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', fontSize: '6.5px' }}>CPF</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', fontSize: '6.5px' }}>Invest.</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', background: '#fbe9e9', fontSize: '6.5px' }}>TOTAL</th>
                                        <th style={{ ...PDF_S.th, textAlign: 'right', background: '#d5d7d9', fontSize: '6.5px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chunk.map((cf: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ ...PDF_S.td, fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{new Date(cf.as_of_date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}</td>
                                            <td style={{ ...PDF_S.tdRight, fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.employment_income_gross)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.rental_income)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.investment_income)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontWeight: 800, background: '#eef5ee', fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.total_inflow)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.household_expenses)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.income_tax)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.insurance_premiums)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.property_expenses)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.property_loan_repayment)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.non_property_loan_repayment)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.cpf_contribution_total)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.regular_investments)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontWeight: 800, background: '#fff5f5', fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.total_outflow)}</td>
                                            <td style={{ ...PDF_S.tdRight, fontWeight: 900, background: '#f0f2f5', fontSize: '7px', paddingLeft: '4px', paddingRight: '4px' }}>{fmtCurrency(cf.net_position)}</td>
                                        </tr>
                                    ))}

                                </tbody>
                            </table>
                            {renderFooter(currentPage++, totalPages)}
                        </div>
                    ))}

                    {/* SECTION 3: PORTFOLIO — Plan Summary */}
                    {planChunksSummary.length === 0 ? (
                        <div className="pdf-page" style={PDF_S.page}>
                            <h2 style={PDF_S.sectionTitle}>3. Plans Held</h2>
                            <h4 style={PDF_S.subTitle}>3.1 Holdings Summary</h4>
                            <p style={{ fontSize: '12px', color: '#666' }}>No plans recorded during this period.</p>
                            {renderFooter(currentPage++, totalPages)}
                        </div>
                    ) : planChunksSummary.map((chunk, chunkIdx) => (
                        <div key={`plan-summary-chunk-${chunkIdx}`} className="pdf-page" style={PDF_S.page}>
                            <h2 style={PDF_S.sectionTitle}>3. Plans Held</h2>
                            <h4 style={PDF_S.subTitle}>3.1 Holdings Summary</h4>

                            <table style={PDF_S.table}>
                                <thead>
                                    <tr>
                                        <th style={{ ...PDF_S.th, width: '30%' }}>Plan Name</th>
                                        <th style={{ ...PDF_S.th, width: '16%' }}>Type</th>
                                        <th style={{ ...PDF_S.th, width: '11%' }}>Start</th>
                                        <th style={{ ...PDF_S.th, width: '11%' }}>Expiry</th>
                                        <th style={{ ...PDF_S.th, width: '10%' }}>Status</th>
                                        <th style={{ ...PDF_S.th, width: '15%', textAlign: 'right' }}>Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chunk.map((plan: any, i: number) => {
                                        const isIns = (plan.asset_class || '').includes('Insurance');
                                        const vals = isIns ? (plan.insurance_valuations || []) : (plan.investment_valuations || []);
                                        const eligible = vals.filter((v: any) => v.as_of_date.substring(0, 10) >= startDate && v.as_of_date.substring(0, 10) <= endDate);
                                        const latestVal = eligible.length > 0 ? eligible.reduce((a: any, b: any) => new Date(a.as_of_date) > new Date(b.as_of_date) ? a : b) : null;
                                        const value = latestVal ? parseFloat(isIns ? latestVal.cash_value : latestVal.market_value) : 0;
                                        return (
                                            <tr key={i}>
                                                <td style={{ ...PDF_S.td, fontWeight: 600 }}>{plan.plan_name}</td>
                                                <td style={PDF_S.td}>{plan.policy_type || plan.asset_class}</td>
                                                <td style={{ ...PDF_S.td, whiteSpace: 'nowrap' }}>{fmtDate(plan.start_date)}</td>
                                                <td style={{ ...PDF_S.td, whiteSpace: 'nowrap' }}>{fmtDate(plan.end_date)}</td>
                                                <td style={{ ...PDF_S.td, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{plan.status || '-'}</td>
                                                <td style={PDF_S.tdRight}>{value > 0 ? fmtCurrency(value) : '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {renderFooter(currentPage++, totalPages)}
                        </div>
                    ))}

                    {/* SECTION 3: PORTFOLIO — Deep Dive Valuations */}
                    {planChunksDetails.map((chunk, chunkIdx) => (
                        <div key={`plan-details-chunk-${chunkIdx}`} className="pdf-page" style={PDF_S.page}>
                            <h2 style={PDF_S.sectionTitle}>3. Plans Held</h2>
                            <h4 style={PDF_S.subTitle}>3.2 Individual Valuations</h4>

                            {chunk.map((plan: any, i: number) => {
                                const isIns = (plan.asset_class || '').includes('Insurance');
                                const allVals = isIns ? (plan.insurance_valuations || []) : (plan.investment_valuations || []);
                                const vals = allVals.filter((v: any) => v.as_of_date.substring(0, 10) >= startDate && v.as_of_date.substring(0, 10) <= endDate).slice(0, 10);

                                return (
                                    <div key={i} style={{ marginBottom: '30px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h3 style={{ margin: 0, fontSize: '14px', color: '#333', fontWeight: 600 }}>{plan.plan_name}</h3>
                                        </div>

                                        <div style={PDF_S.infoGrid}>
                                            <div><div style={PDF_S.infoLabel}>Policy Type</div><div style={PDF_S.infoValue}>{plan.policy_type || plan.asset_class}</div></div>
                                            <div><div style={PDF_S.infoLabel}>Policy No.</div><div style={PDF_S.infoValue}>{plan.policy_no || plan.policy_id || '-'}</div></div>
                                            <div><div style={PDF_S.infoLabel}>Start Date</div><div style={PDF_S.infoValue}>{fmtDate(plan.start_date)}</div></div>
                                            <div><div style={PDF_S.infoLabel}>Expiry Date</div><div style={PDF_S.infoValue}>{fmtDate(plan.end_date)}</div></div>
                                            <div><div style={PDF_S.infoLabel}>Status</div><div style={PDF_S.infoValue}>{plan.status || '-'}</div></div>
                                            {isIns && <div><div style={PDF_S.infoLabel}>Sum Assured</div><div style={PDF_S.infoValue}>{fmtCurrency(plan.sum_assured)}</div></div>}
                                            {isIns && <div><div style={PDF_S.infoLabel}>Premium</div><div style={PDF_S.infoValue}>{fmtCurrency(plan.premium_amount)}</div></div>}
                                            {isIns && <div><div style={PDF_S.infoLabel}>Payment Frequency</div><div style={PDF_S.infoValue}>{plan.payment_frequency || '-'}</div></div>}
                                            {isIns && <div><div style={PDF_S.infoLabel}>Payment Term</div><div style={PDF_S.infoValue}>{plan.payment_term ? `${plan.payment_term} yrs` : '-'}</div></div>}
                                            {isIns && <div><div style={PDF_S.infoLabel}>Life Assured</div><div style={PDF_S.infoValue}>{plan.life_assured || '-'}</div></div>}
                                            {isIns && <div><div style={PDF_S.infoLabel}>Benefit Type</div><div style={PDF_S.infoValue}>{plan.benefit_type || '-'}</div></div>}
                                        </div>

                                        <p style={{ fontSize: '10px', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '10px', marginBottom: '8px' }}>Valuation History</p>
                                        {vals.length > 0 ? (
                                            <table style={{ ...PDF_S.table, marginBottom: 0 }}>
                                                <thead>
                                                    <tr>
                                                        <th style={PDF_S.th}>Date</th>
                                                        <th style={{ ...PDF_S.th, textAlign: 'right' }}>Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {vals.map((v: any, j: number) => (
                                                        <tr key={j}>
                                                            <td style={PDF_S.td}>{fmtDate(v.as_of_date)}</td>
                                                            <td style={PDF_S.tdRight}>{fmtCurrency(isIns ? v.cash_value : v.market_value)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p style={{ fontSize: '10px', color: '#888' }}>No valuations in this period.</p>
                                        )}
                                    </div>
                                );
                            })}
                            {renderFooter(currentPage++, totalPages)}
                        </div>
                    ))}

                    {/* SECTION 4: ASSET ALLOCATION CHART */}
                    <div className="pdf-page" style={PDF_S.page}>
                        <h2 style={PDF_S.sectionTitle}>4. Asset Allocation</h2>
                        <h4 style={PDF_S.subTitle}>4.1 Trend Visualisation</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginBottom: '30px' }}>
                            <div style={{ height: '420px', background: '#fff', border: '1px solid #eee', padding: '10px', borderRadius: '8px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: '#666', textAlign: 'center', margin: '0 0 8px' }}>Raw Value</p>
                                <AssetAllocation client={client} mode="overview" dateRange={{ startDate, endDate }} isExporting={true} forceChartType="absolute" />
                            </div>
                            <div style={{ height: '420px', background: '#fff', border: '1px solid #eee', padding: '10px', borderRadius: '8px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: '#666', textAlign: 'center', margin: '0 0 8px' }}>Percentage</p>
                                <AssetAllocation client={client} mode="overview" dateRange={{ startDate, endDate }} isExporting={true} forceChartType="percent" />
                            </div>
                        </div>
                        {renderFooter(currentPage++, totalPages)}
                    </div>

                    {/* SECTION 4: ASSET ALLOCATION DETAILS */}
                    {allocationHistoryChunks.length === 0 ? (
                        <div className="pdf-page" style={PDF_S.page}>
                            <h2 style={PDF_S.sectionTitle}>4. Asset Allocation</h2>
                            <h4 style={PDF_S.subTitle}>4.2 History by Asset Type</h4>
                            <p style={{ fontSize: '12px', color: '#666' }}>No data in this period.</p>
                            {renderFooter(currentPage++, totalPages)}
                        </div>
                    ) : allocationHistoryChunks.map((chunk, chunkIdx) => (
                        <div key={`alloc-chunk-${chunkIdx}`} className="pdf-page" style={PDF_S.page}>
                            <h2 style={PDF_S.sectionTitle}>4. Asset Allocation</h2>
                            <h4 style={PDF_S.subTitle}>4.2 History by Asset Type</h4>
                            <table style={{ ...PDF_S.table, width: '100%', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...PDF_S.th, width: '60px' }}>Date</th>
                                        {classes.map(c => <th key={c} style={{ ...PDF_S.th, textAlign: 'right', wordWrap: 'break-word', whiteSpace: 'normal' }}>{c}</th>)}
                                        <th style={{ ...PDF_S.th, textAlign: 'right', fontWeight: 700, width: '80px' }}>Net Worth</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chunk.map((d, i) => {
                                        const monthTs = new Date(d).getTime();
                                        let total = 0;
                                        return (
                                            <tr key={i}>
                                                <td style={{ ...PDF_S.td, fontWeight: 600 }}>{new Date(d).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}</td>
                                                {classes.map(cls => {
                                                    const pValue = (client.client_plans || []).filter((p: any) => p.asset_class === cls).reduce((s: any, p: any) => {
                                                        const vals = (p.asset_class.includes('Insurance') ? p.insurance_valuations : p.investment_valuations) || [];
                                                        const eligible = vals.filter((v: any) => new Date(v.as_of_date).getTime() <= monthTs);
                                                        if (eligible.length === 0) return s;
                                                        const best = eligible.reduce((a: any, b: any) => new Date(a.as_of_date).getTime() > new Date(b.as_of_date).getTime() ? a : b);
                                                        return s + parseFloat(best.market_value || best.cash_value || 0);
                                                    }, 0);
                                                    total += pValue;
                                                    return <td key={cls} style={PDF_S.tdRight}>{fmtCurrency(pValue)}</td>;
                                                })}
                                                <td style={{ ...PDF_S.tdRight, fontWeight: 700, background: '#f8f9fa' }}>{fmtCurrency(total)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {renderFooter(currentPage++, totalPages)}
                        </div>
                    ))}

                    {/* SECTION 5: RISK ANALYSIS */}
                    {includeRiskAnalysis && (
                        <div className="pdf-page" style={PDF_S.page}>
                            <h2 style={PDF_S.sectionTitle}>5. Risk Analysis</h2>
                            <div style={{}}>
                                {cache?.overview && (
                                    <>
                                        <p style={{ ...PDF_S.subTitle, marginTop: '0' }}>5.1 Summary</p>
                                        <div style={{ fontSize: '12px', marginLeft: '10px', lineHeight: '1.7' }}>{renderCleanList(cache.overview)}</div>
                                    </>
                                )}
                                {cache?.focused ? (
                                    <>
                                        <p style={{ ...PDF_S.subTitle, marginTop: cache?.overview ? '24px' : '0' }}>5.2 Key Insights</p>
                                        <div style={{ fontSize: '12px', marginLeft: '10px', lineHeight: '1.7' }}>{renderCleanList(cache.focused["Key Insights"])}</div>
                                        <p style={{ ...PDF_S.subTitle }}>5.3 Potential Risks</p>
                                        <div style={{ fontSize: '12px', marginLeft: '10px', lineHeight: '1.7' }}>{renderCleanList(cache.focused["Potential Risks"])}</div>
                                        <p style={{ ...PDF_S.subTitle }}>5.4 Recommendations</p>
                                        <div style={{ fontSize: '12px', marginLeft: '10px', lineHeight: '1.7' }}>{renderCleanList(cache.focused["Recommendations"])}</div>
                                    </>
                                ) : (!cache?.overview && <p style={{ fontSize: '12px', color: '#888' }}>No analysis data available. Please generate a risk analysis on the dashboard first.</p>)}
                            </div>
                            {renderFooter(currentPage++, totalPages)}
                        </div>
                    )}

                    {/* SECTION 6: MEETING NOTES */}
                    {includeMeetingNotes && (
                        <div className="pdf-page" style={PDF_S.page}>
                            <h2 style={PDF_S.sectionTitle}>{includeRiskAnalysis ? '6' : '5'}. Meeting Notes</h2>
                            <div style={{}}>
                                <p style={{ ...PDF_S.subTitle, marginTop: '0' }}>{includeRiskAnalysis ? '6.1' : '5.1'} Summary</p>
                                <div style={{ fontSize: '12px', marginLeft: '10px', lineHeight: '1.7' }}>{renderCleanList(cache?.meetingNotesSummary)}</div>
                                {cache?.meetingNotes && (
                                    <>
                                        <p style={{ ...PDF_S.subTitle }}>{includeRiskAnalysis ? '6.2' : '5.2'} Key Takeaways</p>
                                        <div style={{ fontSize: '12px', marginLeft: '10px', lineHeight: '1.7' }}>{renderCleanList(cache?.meetingNotes?.["Key Takeaways"])}</div>
                                        <p style={{ ...PDF_S.subTitle }}>{includeRiskAnalysis ? '6.3' : '5.3'} Action Items</p>
                                        <div style={{ fontSize: '12px', marginLeft: '10px', lineHeight: '1.7' }}>{renderCleanList(cache?.meetingNotes?.["Action Items"])}</div>
                                        <p style={{ ...PDF_S.subTitle }}>{includeRiskAnalysis ? '6.4' : '5.4'} Financial Insights</p>
                                        <div style={{ fontSize: '12px', marginLeft: '10px', lineHeight: '1.7' }}>{renderCleanList(cache?.meetingNotes?.["Financial Insights"])}</div>
                                    </>
                                )}
                            </div>
                            {renderFooter(currentPage++, totalPages)}
                        </div>
                    )}
                </div>
            </div>
        </FocusModal>
    );
};

export default ExportReportModal;
