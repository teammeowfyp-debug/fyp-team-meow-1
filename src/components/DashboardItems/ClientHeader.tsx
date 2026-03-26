import React, { useState } from 'react';
import '../Dashboard.css';
import { FocusModal } from '../UI/FocusModal';
import PdfImport from './PdfImport';
import ExportReportModal from './ExportReportModal';
import { Button } from '../UI/Button';

interface ClientDetailModalProps {
    client: any;
    onClose: () => void;
    onUpdate?: () => void;
}

const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    try {
        return new Date(dateString).toLocaleDateString('en-SG', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return 'Invalid Date';
    }
};

// Helper to format labels
const formatLabel = (key: string) => {
    if (key === 'address_type') return 'Type of Address';
    if (key === 'house_block_no') return 'House / Block No.';
    const label = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return label.endsWith(' No') ? label + '.' : label;
};

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose }) => {
    const [activeTab, setActiveTab] = useState<'personal' | 'family'>('personal');
    const [mode, setMode] = useState<'view' | 'update'>('view');

    // Define Groups
    const contactFields = ['email', 'employment_status', 'occupation', 'mobile_no', 'home_no', 'office_no'];
    const addressFields = ['address_type', 'postal_district', 'house_block_no', 'street_name', 'building_name', 'unit_no'];
    const technicalFields = ['client_id', 'full_name', 'name_as_per_id', 'client_investments', 'client_insurance', 'cashflow', 'client_plans', 'client_family', 'family_members_count', 'last_updated'];

    const renderValue = (key: string, value: any) => {
        if (value === null || value === undefined || value === '') return '-';
        if (Array.isArray(value)) return value.join(', ');

        let display = value.toString();

        // Handle Pandas/float conversion artifacts: strip '.0' from numeric strings
        if (typeof value === 'number' || (typeof value === 'string' && /^\d+\.0$/.test(value))) {
            display = display.replace(/\.0$/, '');
        }

        if (key.includes('date') || key === 'last_updated') {
            try {
                return new Date(value).toLocaleDateString('en-SG', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });
            } catch { return display; }
        }
        return display;
    };

    const renderSection = (title: string, fields: string[]) => (
        <div className="modal-section" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--secondary)',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '8px',
                marginBottom: '1.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 700
            }}>{title}</h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '1.25rem 2rem'
            }}>
                {fields.map(key => (
                    <div key={key} className="info-item">
                        <label style={{
                            display: 'block',
                            fontSize: 'var(--text-xs)',
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            marginBottom: '4px'
                        }}>
                            {formatLabel(key)}
                        </label>
                        <div style={{
                            fontSize: 'var(--text-base)',
                            color: 'var(--secondary)',
                            fontWeight: 500
                        }}>
                            {renderValue(key, client[key])}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const basicFields = Object.keys(client).filter(key =>
        !contactFields.includes(key) &&
        !addressFields.includes(key) &&
        !technicalFields.includes(key)
    );

    if (mode === 'update') {
        return (
            <FocusModal isOpen={true} onClose={onClose} modalContentStyle={{ gap: 0 }}>
                <PdfImport
                    clientId={client.client_id}
                    variant="inline"
                    onClose={onClose}
                    onCancel={() => setMode('view')}
                    onSuccess={() => {
                        window.location.reload();
                    }}
                />
            </FocusModal>
        );
    }

    return (
        <FocusModal
            isOpen={true}
            onClose={onClose}
        >
            {/* Fixed Header Area */}
            <div className="modal-header">
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 'var(--text-3xl)', color: 'var(--secondary)', marginBottom: '8px' }}>{client.full_name}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
                                {client.client_id}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--border)', paddingLeft: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Last Updated:</span>
                                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary)', fontWeight: 600 }}>
                                        {formatDate(client.last_updated)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Switcher - Segmented Control Style */}
                <div className="tabs-switcher" style={{
                    display: 'flex',
                    marginBottom: '0.5rem',
                    width: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    borderRadius: '12px',
                    padding: '4px',
                    gap: 0
                }}>
                    <Button
                        variant="tab"
                        isActive={activeTab === 'personal'}
                        onClick={() => setActiveTab('personal')}
                    >
                        Personal
                    </Button>
                    <Button
                        variant="tab"
                        isActive={activeTab === 'family'}
                        onClick={() => setActiveTab('family')}
                    >
                        Family
                    </Button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="modal-body">
                {activeTab === 'personal' ? (
                    <>
                        {renderSection('Basic Information', basicFields)}
                        {renderSection('Contact Information and Other Information', contactFields)}
                        {renderSection('Residential Address', addressFields)}
                        
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                            <Button
                                variant="outline"
                                size="medium"
                                onClick={() => setMode('update')}
                            >
                                Update Profile
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="family-section">
                        {!client.client_family || client.client_family.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                                No family members found for this client.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {client.client_family.map((member: any, idx: number) => (
                                    <div key={idx} className="family-member-card" style={{
                                        padding: '1.5rem',
                                        background: 'rgba(0, 0, 0, 0.02)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                                            <h4 style={{ fontSize: 'var(--text-xl)', color: 'var(--secondary)', margin: 0 }}>{member.family_member_name}</h4>
                                        </div>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                            gap: '1.25rem 2rem'
                                        }}>
                                            {[
                                                { mkey: 'relationship', label: 'Relationship', value: member.relationship },
                                                { mkey: 'gender', label: 'Gender', value: member.gender },
                                                { mkey: 'date_of_birth', label: 'Date of Birth', value: renderValue('date_of_birth', member.date_of_birth) },
                                                { mkey: 'age', label: 'Age', value: member.age },
                                                {
                                                    mkey: 'monthly_upkeep', label: 'Monthly Upkeep',
                                                    value: (member.support_until_age && member.age >= member.support_until_age) || !member.monthly_upkeep || member.monthly_upkeep <= 0
                                                        ? '-'
                                                        : `$${(member.monthly_upkeep || 0).toLocaleString()}`
                                                },
                                                {
                                                    mkey: 'support_until_age', label: 'Support Until Age',
                                                    value: member.support_until_age
                                                        ? `${member.support_until_age} (${member.age >= member.support_until_age ? 'Completed' : `${member.years_to_support} Yrs Left`})`
                                                        : '-'
                                                }
                                            ].map((field, fIdx) => (
                                                <div key={fIdx} className="info-item">
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: 'var(--text-xs)',
                                                        textTransform: 'uppercase',
                                                        color: 'var(--text-muted)',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.05em',
                                                        marginBottom: '4px'
                                                    }}>
                                                        {formatLabel(field.mkey)}
                                                    </label>
                                                    <div style={{
                                                        fontSize: 'var(--text-base)',
                                                        color: 'var(--secondary)',
                                                        fontWeight: 500
                                                    }}>
                                                        {renderValue(field.mkey, member[field.mkey])}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </FocusModal>
    );
};

interface ClientHeaderProps {
    client: any;
    onBack?: () => void;
    showBack?: boolean;
    startDate: string;
    endDate: string;
    onStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSetMaxRange: () => void;
    absoluteBounds: { start: string; end: string } | null;
    onImportPdf?: () => void;
    cache?: any;
    dashboardStartDate?: string;
    dashboardEndDate?: string;
    onFocusQuadrant?: (quadId: string, mode?: string) => void;
}

const ClientHeader: React.FC<ClientHeaderProps> = ({
    client,
    onBack,
    showBack,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onSetMaxRange,
    absoluteBounds,
    onImportPdf,
    cache,
    dashboardStartDate,
    dashboardEndDate,
    onFocusQuadrant
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

    if (!client) return null;



    return (
        <>
            <header
                className="dashboard-header glass"
                onClick={() => setIsModalOpen(true)}
                style={{ cursor: 'pointer', transition: 'transform 0.2s ease', display: 'flex', alignItems: 'center', gap: '2rem' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <div className="client-meta" style={{ flex: '1 1 auto' }}>
                    {showBack && (
                        <button
                            className="back-button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onBack?.();
                            }}
                            aria-label="Go back"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                        </button>
                    )}
                    <div style={{ 
                        background: 'var(--primary-glow)', 
                        padding: '0.75rem', 
                        borderRadius: '50%', 
                        color: 'var(--primary)',
                        width: '64px',
                        height: '64px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0 
                    }}>
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <div className="client-details">
                        <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>{client.full_name}</h1>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <Button
                                    variant="outline"
                                    size="medium"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsUpdateModalOpen(true);
                                    }}
                                    style={{ padding: '6px 14px' }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                    </svg>
                                    Update Profile
                                </Button>
                            <Button
                                variant="outline"
                                size="medium"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExportModalOpen(true);
                                }}
                                style={{ padding: '6px 14px' }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Export Report
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Integrated Date Filter */}
                <div
                    className="header-date-filter-container"
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '300px' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: '0.25rem'}}>
                        <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                            Analysis Period
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {[
                                { label: '3Y', years: 3},
                                { label: '5Y', years: 5}
                            ].map(p => (
                                <Button
                                    key={p.label}
                                    variant="mode"
                                    size="small"
                                    isActive={!!(startDate && new Date(startDate).getFullYear() === new Date().getFullYear() - p.years)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const end = new Date();
                                        const start = new Date();
                                        start.setFullYear(end.getFullYear() - p.years);
                                        const formatDateStr = (d: Date) => d.toISOString().split('T')[0];
                                        onStartDateChange({ target: { value: formatDateStr(start) } } as any);
                                        onEndDateChange({ target: { value: formatDateStr(end) } } as any);
                                    }}
                                    style={{ padding: '2px 10px' }}
                                >
                                    {p.label}
                                </Button>
                            ))}
                            <Button
                                variant="mode"
                                size="small"
                                isActive={!!(absoluteBounds && startDate === absoluteBounds.start && endDate === absoluteBounds.end)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSetMaxRange();
                                }}
                                style={{ padding: '2px 10px' }}
                            >
                                MAX
                            </Button>
                        </div>
                    </div>
                    <div
                        className="header-date-filter"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-sm)',
                            boxSizing: 'border-box'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0, marginLeft: '0.25rem' }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <label style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.06em'}}>Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={onStartDateChange}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        color: 'var(--secondary)',
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        width: '100%',
                                        marginLeft: '-2px' // Adjustment for browser default internal padding
                                    }}
                                />
                            </div>

                            <div style={{ color: 'var(--primary)', height: '18px', width: '2px', backgroundColor: 'var(--primary-glow)', borderRadius: '4px', opacity: 0.5}}></div>

                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <label style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.06em'}}>End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={onEndDateChange}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        color: 'var(--secondary)',
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        width: '100%',
                                        marginLeft: '-2px' // Adjustment for browser default internal padding
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>


            </header>

            {isModalOpen && (
                <ClientDetailModal
                    client={client}
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={onImportPdf}
                />
            )}
            
            {isExportModalOpen && (
                <ExportReportModal
                    client={client}
                    startDate={startDate}
                    endDate={endDate}
                    dashboardStartDate={dashboardStartDate || startDate}
                    dashboardEndDate={dashboardEndDate || endDate}
                    cache={cache}
                    onClose={() => setIsExportModalOpen(false)}
                    onFocusQuadrant={onFocusQuadrant}
                />
            )}

            {isUpdateModalOpen && (
                <FocusModal isOpen={true} onClose={() => setIsUpdateModalOpen(false)} modalContentStyle={{ gap: 0 }}>
                    <PdfImport
                        clientId={client.client_id}
                        variant="inline"
                        onClose={() => setIsUpdateModalOpen(false)}
                        onCancel={() => setIsUpdateModalOpen(false)}
                        onSuccess={() => {
                            window.location.reload();
                        }}
                    />
                </FocusModal>
            )}
        </>
    );
};

export default ClientHeader;
