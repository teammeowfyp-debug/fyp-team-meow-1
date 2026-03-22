import React, { useState } from 'react';
import '../Dashboard.css';
import { FocusModal } from '../UI/FocusModal';
import { PdfImport } from './PdfImport';
import ExportReportModal from './ExportReportModal';

interface ClientDetailModalProps {
    client: any;
    onClose: () => void;
    onUpdate?: () => void;
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose }) => {
    const [activeTab, setActiveTab] = useState<'personal' | 'family'>('personal');
    const [mode, setMode] = useState<'view' | 'update'>('view');

    // Helper to format labels
    const formatLabel = (key: string) => {
        if (key === 'address_type') return 'Type of Address';
        if (key === 'house_block_no') return 'House / Block No.';
        const label = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        return label.endsWith(' No') ? label + '.' : label;
    };

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
                fontSize: '0.85rem',
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
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            marginBottom: '4px'
                        }}>
                            {formatLabel(key)}
                        </label>
                        <div style={{
                            fontSize: '0.95rem',
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

    // Filter for basic info (everything else)
    const basicFields = Object.keys(client).filter(key =>
        !contactFields.includes(key) &&
        !addressFields.includes(key) &&
        !technicalFields.includes(key)
    );

    const tabButtonStyle = (isActive: boolean) => ({
        flex: 1,
        padding: '0.75rem 2rem',
        border: 'none',
        background: isActive ? 'var(--primary)' : 'transparent',
        color: isActive ? '#fff' : 'var(--text-muted)',
        borderRadius: '10px',
        fontWeight: 600,
        fontSize: '0.9rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
        textAlign: 'center' as const
    });

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
                        <h2 style={{ fontSize: '1.8rem', color: 'var(--secondary)', marginBottom: '8px' }}>{client.full_name}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '0.02em', margin: 0 }}>
                                Client ID: <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>{client.client_id}</span>
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Last Updated:</span>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--secondary)', fontWeight: 600 }}>
                                        {renderValue('last_updated', client.last_updated)}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMode('update');
                                    }}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '2px 12px',
                                        background: 'var(--primary, #c5b358)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(197, 179, 88, 0.2)',
                                        transition: 'all 0.2s',
                                        letterSpacing: '0.02em',
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    Update
                                </button>
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
                    <button
                        style={tabButtonStyle(activeTab === 'personal')}
                        onClick={() => setActiveTab('personal')}
                    >
                        Personal
                    </button>
                    <button
                        style={tabButtonStyle(activeTab === 'family')}
                        onClick={() => setActiveTab('family')}
                    >
                        Family
                    </button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="modal-body">
                {activeTab === 'personal' ? (
                    <>
                        {renderSection('Basic Information', basicFields)}
                        {renderSection('Contact Information and Other Information', contactFields)}
                        {renderSection('Residential Address', addressFields)}
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
                                            <h4 style={{ fontSize: '1.2rem', color: 'var(--secondary)', margin: 0 }}>{member.family_member_name}</h4>
                                        </div>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                            gap: '1.25rem 2rem'
                                        }}>
                                            {[
                                                { label: 'Relationship', value: member.relationship },
                                                { label: 'Gender', value: member.gender },
                                                { label: 'Date of Birth', value: renderValue('date_of_birth', member.date_of_birth) },
                                                { label: 'Age', value: member.age },
                                                {
                                                    label: 'Monthly Upkeep',
                                                    value: (member.support_until_age && member.age >= member.support_until_age) || !member.monthly_upkeep || member.monthly_upkeep <= 0
                                                        ? '-'
                                                        : `$${(member.monthly_upkeep || 0).toLocaleString()}`
                                                },
                                                {
                                                    label: 'Support Until Age',
                                                    value: member.support_until_age
                                                        ? `${member.support_until_age} (${member.age >= member.support_until_age ? 'Completed' : `${member.years_to_support} Yrs Left`})`
                                                        : '-'
                                                }
                                            ].map((field, fIdx) => (
                                                <div key={fIdx} className="info-item">
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.65rem',
                                                        textTransform: 'uppercase',
                                                        color: 'var(--text-muted)',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.05em',
                                                        marginBottom: '4px'
                                                    }}>
                                                        {field.label}
                                                    </label>
                                                    <div style={{
                                                        fontSize: '0.95rem',
                                                        color: 'var(--secondary)',
                                                        fontWeight: 500
                                                    }}>
                                                        {field.value}
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
    onFocusQuadrant?: (quadId: string) => void;
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

    if (!client) return null;

    // Generate initials for avatar
    const initials = client.full_name
        ? client.full_name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : '--';

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
                    <div className="client-avatar">{initials}</div>
                    <div className="client-details">
                        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{client.full_name}</h1>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>
                            <span style={{ opacity: 0.8 }}>Last Updated:</span> <span style={{ color: 'var(--secondary)' }}>{client.last_updated ? new Date(client.last_updated).toLocaleDateString('en-SG', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                            }) : 'Never'}</span>
                            <span style={{ margin: '0 8px', opacity: 0.3 }}>|</span>
                            <span style={{ opacity: 0.8 }}>Click for profile details</span>
                        </p>
                    </div>
                </div>

                {/* Integrated Date Filter */}
                <div
                    className="header-date-filter-container"
                    style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '320px' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                                Analysis Period
                            </span>
                            <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                                {[
                                    { label: '3Y', years: 3 },
                                    { label: '5Y', years: 5 }
                                ].map(p => (
                                    <button
                                        key={p.label}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const end = new Date();
                                            const start = new Date();
                                            start.setFullYear(end.getFullYear() - p.years);

                                            // Format to YYYY-MM-DD for input type="date"
                                            const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

                                            // We need to bypass the React.ChangeEvent<HTMLInputElement> type since we're calling directly
                                            // but the implementation in Dashboard.tsx just takes e.target.value
                                            onStartDateChange({ target: { value: formatDateStr(start) } } as any);
                                            onEndDateChange({ target: { value: formatDateStr(end) } } as any);
                                        }}
                                        style={{
                                            background: (startDate && new Date(startDate).getFullYear() === new Date().getFullYear() - p.years) ? 'var(--primary)' : 'rgba(0,0,0,0.03)',
                                            border: '1px solid var(--border)',
                                            color: (startDate && new Date(startDate).getFullYear() === new Date().getFullYear() - p.years) ? '#fff' : 'var(--text-muted)',
                                            fontSize: '0.6rem',
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => {
                                            if (e.currentTarget.style.background !== 'var(--primary)') {
                                                e.currentTarget.style.background = 'rgba(0,0,0,0.08)';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (e.currentTarget.style.background !== 'var(--primary)') {
                                                e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                                            }
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSetMaxRange();
                                    }}
                                    style={{
                                        background: (absoluteBounds && startDate === absoluteBounds.start && endDate === absoluteBounds.end) ? 'var(--primary)' : 'rgba(0,0,0,0.03)',
                                        border: '1px solid var(--border)',
                                        color: (absoluteBounds && startDate === absoluteBounds.start && endDate === absoluteBounds.end) ? '#fff' : 'var(--text-muted)',
                                        fontSize: '0.6rem',
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >MAX</button>
                            </div>
                        </div>
                        {absoluteBounds && (startDate !== absoluteBounds.start || endDate !== absoluteBounds.end) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSetMaxRange();
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '0.65rem',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    color: 'var(--secondary)',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    padding: 0
                                }}
                            >Reset</button>
                        )}
                    </div>
                    <div
                        className="header-date-filter"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.5)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            height: '42px', // Fixed height to prevent shift
                            boxSizing: 'border-box'
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                            <label style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={onStartDateChange}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--secondary)',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    width: '100%'
                                }}
                            />
                        </div>
                        <div style={{ color: 'var(--border)', height: '24px', width: '1px', backgroundColor: 'var(--border)' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                            <label style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={onEndDateChange}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--secondary)',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    width: '100%'
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="header-stats" style={{ flex: '0 0 auto' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExportModalOpen(true);
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px 14px',
                            background: 'var(--primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(197, 179, 88, 0.2)',
                            transition: 'all 0.2s',
                            letterSpacing: '0.02em',
                            marginLeft: '1rem',
                            gap: '6px'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(197, 179, 88, 0.3)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(197, 179, 88, 0.2)';
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export Report
                    </button>
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
        </>
    );
};

export default ClientHeader;
