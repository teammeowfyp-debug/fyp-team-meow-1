import React, { useState, useRef } from 'react';
import { FocusModal } from '../UI/FocusModal';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import AssetAllocation from './AssetAllocation';
import Cashflow from './Cashflow';
import { renderCleanList } from './Insights/Insights.components';
import { Button } from '../UI/Button';

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

const ExportReportModal: React.FC<ExportReportModalProps> = ({
    client,
    startDate: initialStartDate,
    endDate: initialEndDate,
    dashboardStartDate,
    dashboardEndDate,
    cache,
    onClose,
    onFocusQuadrant
}) => {
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [filename, setFilename] = useState(`${client.full_name}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    const [isExporting, setIsExporting] = useState(false);
    const [statusText, setStatusText] = useState('');

    // Feature toggles
    const [includeRiskAnalysis, setIncludeRiskAnalysis] = useState(false);
    const [includeMeetingNotes, setIncludeMeetingNotes] = useState(false);

    const reportRef = useRef<HTMLDivElement>(null);

    const isRiskAnalysisValid = !!(
        cache?.focused &&
        startDate === dashboardStartDate &&
        endDate === dashboardEndDate
    );

    const isMeetingNotesValid = !!(
        cache?.meetingNotes &&
        cache?.meetingNotesSummary
    );

    const handleExport = async () => {
        setIsExporting(true);
        setStatusText('Preparing report content...');

        try {
            setStatusText('Rendering report document...');

            // Allow React to render the report Data before capturing
            setTimeout(async () => {
                try {
                    if (reportRef.current) {
                        const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, logging: false });
                        const imgData = canvas.toDataURL('image/png');
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                        const pageHeight = pdf.internal.pageSize.getHeight();
                        let heightLeft = pdfHeight;
                        let position = 0;

                        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                        heightLeft -= pageHeight;

                        while (heightLeft >= 0) {
                            position = position - pageHeight;
                            pdf.addPage();
                            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                            heightLeft -= pageHeight;
                        }

                        const pdfBlob = pdf.output('blob');

                        try {
                            if ('showSaveFilePicker' in window) {
                                // @ts-ignore
                                const handle = await window.showSaveFilePicker({
                                    suggestedName: filename || 'Report.pdf',
                                    types: [{
                                        description: 'PDF Document',
                                        accept: { 'application/pdf': ['.pdf'] },
                                    }],
                                });
                                const writable = await handle.createWritable();
                                await writable.write(pdfBlob);
                                await writable.close();
                            } else {
                                pdf.save(filename || 'Report.pdf');
                            }
                        } catch (saveErr: any) {
                            if (saveErr.name !== 'AbortError') {
                                pdf.save(filename || 'Report.pdf');
                            }
                        }
                        onClose();
                    }
                } catch (err) {
                    console.error('Failed to generate PDF:', err);
                    alert('Failed to generate PDF. Please try again.');
                } finally {
                    setIsExporting(false);
                }
            }, 1500); // Wait for charts and content to fully render

        } catch (err) {
            console.error('Failed to generate report data:', err);
            alert('Failed to fetch data for report. Please try again.');
            setIsExporting(false);
        }
    };

    return (
        <FocusModal isOpen={true} onClose={onClose} modalContentStyle={{ maxWidth: '500px', padding: '0' }}>
            <div className="modal-header" style={{ padding: '2rem 2rem 1rem 2rem', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 'var(--text-2xl)', color: 'var(--secondary)', margin: 0 }}>Export Client Report</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: '0.5rem' }}>Generate a comprehensive PDF report for {client.full_name}</p>
            </div>

            <div className="modal-body" style={{ padding: '2rem' }}>
                {isExporting ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '1.5rem' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 15px var(--primary-glow))', animation: 'hourglassFlip 1.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}>
                            <path d="M5 2h14l-7 9.5-7-9.5z" fill="var(--bg-main)"></path>
                            <path d="M5 22h14l-7-9.5-7 9.5z" fill="var(--bg-main)"></path>
                        </svg>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--secondary)' }}>Exporting PDF...</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{statusText}</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Analysis Period</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', outline: 'none' }} />
                                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>to</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', outline: 'none' }} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Filename</label>
                            <input
                                type="text"
                                value={filename}
                                onChange={e => setFilename(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={includeRiskAnalysis} onChange={(e) => setIncludeRiskAnalysis(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--secondary)' }}>Include Risk Analysis</span>
                                    </div>
                                </label>
                                {includeRiskAnalysis && !isRiskAnalysisValid && (
                                    <div className="animate-fade" style={{ marginLeft: '30px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(155, 34, 38, 0.08)', border: '1px solid rgba(155, 34, 38, 0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#9B2226', lineHeight: '1.4', fontWeight: 'var(--font-semibold)' }}>
                                            No risk analysis found for the selected period.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="small"
                                            onClick={() => { onFocusQuadrant?.('risk', 'risk-analysis'); onClose(); }}
                                            style={{ 
                                                alignSelf: 'flex-start',
                                                color: '#9B2226',
                                                borderColor: 'rgba(155, 34, 38, 0.3)',
                                                background: 'transparent'
                                            }}
                                            onMouseEnter={(e: any) => {
                                                e.currentTarget.style.background = 'rgba(155, 34, 38, 0.1)';
                                            }}
                                            onMouseLeave={(e: any) => {
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            Go to Risk Analysis
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={includeMeetingNotes} onChange={(e) => setIncludeMeetingNotes(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--secondary)' }}>Include Meeting Notes</span>
                                    </div>
                                </label>
                                {includeMeetingNotes && !isMeetingNotesValid && (
                                    <div className="animate-fade" style={{ marginLeft: '30px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(155, 34, 38, 0.08)', border: '1px solid rgba(155, 34, 38, 0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#9B2226', lineHeight: '1.4', fontWeight: 'var(--font-semibold)' }}>
                                            No meeting notes found.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="small"
                                            onClick={() => { onFocusQuadrant?.('risk', 'meeting-notes'); onClose(); }}
                                            style={{ 
                                                alignSelf: 'flex-start',
                                                color: '#9B2226',
                                                borderColor: 'rgba(155, 34, 38, 0.3)',
                                                background: 'transparent'
                                            }}
                                            onMouseEnter={(e: any) => {
                                                e.currentTarget.style.background = 'rgba(155, 34, 38, 0.1)';
                                            }}
                                            onMouseLeave={(e: any) => {
                                                e.currentTarget.style.background = 'transparent';
                                            }}
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
                            style={{ marginTop: '0.5rem' }}
                        >
                            Export Data
                        </Button>
                    </div>
                )}
            </div>

            {/* Hidden Report Container */}
            {isExporting && (
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
                    <div ref={reportRef} style={{ width: '800px', background: '#fff', padding: '40px', color: '#333', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {/* 1. HEADER */}
                        <div style={{ borderBottom: '2px solid var(--primary)', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                                <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', color: 'var(--secondary)' }}>Client Financial Report</h1>
                                <p style={{ margin: 0, fontSize: '18px', color: '#555' }}>Client: <strong style={{ color: 'var(--secondary)' }}>{client.full_name}</strong></p>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '12px', color: '#777' }}>
                                <p style={{ margin: '0 0 4px 0' }}>Export Date: {new Date().toLocaleDateString()}</p>
                                <p style={{ margin: 0 }}>Analysis Period: {startDate} to {endDate}</p>
                            </div>
                        </div>

                        {/* 2. ASSET ALLOCATION */}
                        <div style={{ marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '20px', color: 'var(--primary)', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '16px' }}>1. Asset Allocation & Portfolio</h2>
                            <div style={{ height: '350px', marginBottom: '20px' }}>
                                <AssetAllocation client={client} mode="overview" dateRange={{ startDate, endDate }} isExporting={true} />
                            </div>

                            <h3 style={{ fontSize: '16px', color: '#444', marginBottom: '8px' }}>Active Plans Breakdown</h3>
                            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
                                {(client.client_plans || []).filter((p: any) => p.status === 'Active').map((plan: any, i: number) => {
                                    const value = parseFloat(plan.market_value || plan.cash_value || plan.surrender_value || 0);
                                    return (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i !== (client.client_plans || []).filter((p: any) => p.status === 'Active').length - 1 ? '1px solid #ddd' : 'none', padding: '8px 0', fontSize: '13px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600, color: '#333' }}>{plan.plan_name}</span>
                                                <span style={{ color: '#777', fontSize: '11px' }}>{plan.asset_class || plan.policy_type} | {plan.company_name}</span>
                                            </div>
                                            <div style={{ fontWeight: 600, color: '#333' }}>
                                                ${value.toLocaleString()}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 3. CASHFLOW */}
                        <div style={{ marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '20px', color: 'var(--primary)', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '16px' }}>2. Cashflow</h2>
                            <div style={{ height: '350px', marginBottom: '20px' }}>
                                <Cashflow client={client} mode="overview" dateRange={{ startDate, endDate }} isExporting={true} />
                            </div>
                            <h3 style={{ fontSize: '16px', color: '#444', marginBottom: '8px' }}>Latest Cashflow Statement</h3>
                            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
                                {(() => {
                                    const cfs = (client?.cashflow || [])
                                        .filter((item: any) => {
                                            const itemDate = item.as_of_date.substring(0, 10);
                                            if (startDate && itemDate < startDate) return false;
                                            if (endDate && itemDate > endDate) return false;
                                            return true;
                                        })
                                        .sort((a: any, b: any) => new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime());

                                    if (cfs.length > 0) {
                                        const latest = cfs[0];
                                        return (
                                            <div style={{ display: 'flex', gap: '20px', justifyContent: 'space-between' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, color: '#555', marginBottom: '10px', fontSize: '13px', textTransform: 'uppercase' }}>Inflows</div>
                                                    <p style={{ margin: '4px 0', fontSize: '12px' }}>Employment: ${parseFloat(latest.employment_income_gross || 0).toLocaleString()}</p>
                                                    <p style={{ margin: '4px 0', fontSize: '12px' }}>Rental: ${parseFloat(latest.rental_income || 0).toLocaleString()}</p>
                                                    <p style={{ margin: '4px 0', fontSize: '12px' }}>Investment: ${parseFloat(latest.investment_income || 0).toLocaleString()}</p>
                                                    <div style={{ borderTop: '1px solid #ccc', marginTop: '6px', paddingTop: '6px', fontWeight: 700, fontSize: '13px' }}>Total Inflow: ${parseFloat(latest.total_inflow || 0).toLocaleString()}</div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, color: '#555', marginBottom: '10px', fontSize: '13px', textTransform: 'uppercase' }}>Expenses</div>
                                                    <p style={{ margin: '4px 0', fontSize: '12px' }}>Household: ${parseFloat(latest.household_expenses || 0).toLocaleString()}</p>
                                                    <p style={{ margin: '4px 0', fontSize: '12px' }}>Taxes: ${parseFloat(latest.income_tax || 0).toLocaleString()}</p>
                                                    <p style={{ margin: '4px 0', fontSize: '12px' }}>Insurance: ${parseFloat(latest.insurance_premiums || 0).toLocaleString()}</p>
                                                    <div style={{ borderTop: '1px solid #ccc', marginTop: '6px', paddingTop: '6px', fontWeight: 700, fontSize: '13px' }}>Total Expense: ${parseFloat(latest.total_expense || 0).toLocaleString()}</div>
                                                </div>
                                                <div style={{ flex: 1, borderLeft: '1px solid #ddd', paddingLeft: '20px' }}>
                                                    <div style={{ fontWeight: 700, color: '#555', marginBottom: '10px', fontSize: '13px', textTransform: 'uppercase' }}>Net Status</div>
                                                    <p style={{ margin: '4px 0', fontSize: '12px' }}>Wealth Transfer: ${parseFloat(latest.wealth_transfers || 0).toLocaleString()}</p>
                                                    <p style={{ margin: '4px 0', fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>Net Surplus: ${parseFloat(latest.net_surplus || 0).toLocaleString()}</p>
                                                    <div style={{ borderTop: '1px solid #ccc', marginTop: '6px', paddingTop: '6px', fontWeight: 800, fontSize: '14px', color: 'var(--primary)' }}>Net Cashflow: ${parseFloat(latest.net_cashflow || 0).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return <p style={{ fontSize: '12px', color: '#777' }}>No cashflow data in this period.</p>;
                                })()}
                            </div>
                        </div>

                        {/* 4. RISK ANALYSIS */}
                        {includeRiskAnalysis && (
                            <div style={{ marginBottom: '40px' }}>
                                <h2 style={{ fontSize: '20px', color: 'var(--primary)', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '16px' }}>3. Risk Analysis</h2>
                                <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
                                    {cache?.focused ? (
                                        <>
                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase' }}>Key Insights</strong>
                                                {renderCleanList(cache.focused["Key Insights"])}
                                            </div>
                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase' }}>Potential Risks</strong>
                                                {renderCleanList(cache.focused["Potential Risks"])}
                                            </div>
                                            <div>
                                                <strong style={{ fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase' }}>Recommendations</strong>
                                                {renderCleanList(cache.focused["Recommendations"])}
                                            </div>
                                        </>
                                    ) : (
                                        <p style={{ fontSize: '13px', color: '#777' }}>No risk analysis identified.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 5. MEETING NOTES */}
                        {includeMeetingNotes && cache?.meetingNotes && (
                            <div style={{ marginBottom: '40px' }}>
                                <h2 style={{ fontSize: '20px', color: 'var(--primary)', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '16px' }}>{includeRiskAnalysis ? '4.' : '3.'} Meeting Notes</h2>
                                <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
                                    {cache?.meetingNotesSummary && (
                                        <div style={{ marginBottom: '16px' }}>
                                            <strong style={{ fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase' }}>Meeting Summary</strong>
                                            {renderCleanList(cache.meetingNotesSummary)}
                                        </div>
                                    )}
                                    <>
                                        {cache.meetingNotes["Key Takeaways"] && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase' }}>Key Takeaways</strong>
                                                {renderCleanList(cache.meetingNotes["Key Takeaways"])}
                                            </div>
                                        )}
                                        {cache.meetingNotes["Action Items"] && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase' }}>Action Items</strong>
                                                {renderCleanList(cache.meetingNotes["Action Items"])}
                                            </div>
                                        )}
                                        {cache.meetingNotes["Financial Insights"] && (
                                            <div>
                                                <strong style={{ fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase' }}>Financial Insights</strong>
                                                {renderCleanList(cache.meetingNotes["Financial Insights"])}
                                            </div>
                                        )}
                                    </>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </FocusModal>
    );
};

export default ExportReportModal;
