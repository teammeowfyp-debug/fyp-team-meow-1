import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CustomizedXAxisTick } from '../ChartUtils';

interface PlanDetailModalProps {
    plan: any;
    onClose: () => void;
}

const PlanDetailModal: React.FC<PlanDetailModalProps> = ({ plan, onClose }) => {
    const valuationData = React.useMemo(() => {
        if (!plan?.monthly_valuations) return [];
        return [...plan.monthly_valuations]
            .sort((a: any, b: any) => new Date(a.as_of_date).getTime() - new Date(b.as_of_date).getTime())
            .map((v: any) => ({
                date: new Date(v.as_of_date).toLocaleDateString('en-SG', { month: 'short', year: '2-digit' }),
                fullDate: new Date(v.as_of_date).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' }),
                value: parseFloat(v.market_value)
            }));
    }, [plan]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: '#fff',
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    boxShadow: 'var(--shadow-lg)',
                }}>
                    <p style={{ color: 'var(--secondary)', fontWeight: 600, marginBottom: 4 }}>{payload[0].payload.fullDate}</p>
                    <p style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
                        Value: <span style={{ fontWeight: 600 }}>${payload[0].value.toLocaleString()}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>
                <div className="modal-header">
                    <h2>{plan.plan_name}</h2>
                    <div className="modal-id">Plan ID: {plan.plan_id}</div>
                </div>

                <div className="chart-container" style={{ width: '100%', height: '350px', marginTop: '20px' }}>
                    {valuationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={valuationData} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--text-muted)"
                                    tick={<CustomizedXAxisTick />}
                                    interval={0}
                                    height={50}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="var(--text-muted)"
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    name="Market Value"
                                    stroke="var(--primary)"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="error-text" style={{ textAlign: 'center', padding: '2rem' }}>
                            No valuation history available for this plan.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface CustomSelectProps {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (val: string) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    return (
        <div className="filter-group" ref={dropdownRef}>
            <label>{label}</label>
            <div className="custom-select-wrapper">
                <div
                    className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span>{selectedOption?.label || value}</span>
                    <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
                {isOpen && (
                    <div className="custom-select-options glass-card">
                        {options.map(opt => (
                            <div
                                key={opt.value}
                                className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

interface PlansHeldProps {
    client?: any;
    mode?: 'overview' | 'focused';
}

const PlansHeld: React.FC<PlansHeldProps> = ({ client, mode = 'overview' }) => {
    const rawPlans = client?.client_plans || [];
    const [selectedPlan, setSelectedPlan] = useState<any>(null);

    // Filter states
    const [assetFilter, setAssetFilter] = useState<string>('All');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [startDateFilter, setStartDateFilter] = useState<string>('');
    const [endDateFilter, setEndDateFilter] = useState<string>('');

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-SG', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatus = (startDate: string, endDate: string | null) => {
        const today = new Date();
        const start = new Date(startDate);
        if (today < start) return 'Pending';
        if (endDate && today > new Date(endDate)) return 'Ended';
        return 'Active';
    };

    const startMonthOptions = React.useMemo(() => {
        const months = new Set<string>();
        rawPlans.forEach((plan: any) => {
            if (plan.start_date) {
                const date = new Date(plan.start_date);
                months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`);
            }
        });
        const sorted = Array.from(months).sort();
        return [
            { label: 'All', value: '' },
            ...sorted.map(m => ({
                label: new Date(m).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }),
                value: m
            }))
        ];
    }, [rawPlans]);

    const endMonthOptions = React.useMemo(() => {
        const months = new Set<string>();
        let hasNull = false;
        rawPlans.forEach((plan: any) => {
            if (plan.end_date) {
                const date = new Date(plan.end_date);
                months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`);
            } else {
                hasNull = true;
            }
        });
        const sorted = Array.from(months).sort();
        const options = [
            { label: 'All', value: '' },
            ...sorted.map(m => ({
                label: new Date(m).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }),
                value: m
            }))
        ];
        if (hasNull) {
            options.push({ label: 'None', value: 'None' });
        }
        return options;
    }, [rawPlans]);

    const filteredPlans = React.useMemo(() => {
        return rawPlans.filter((plan: any) => {
            // Asset Class Filter
            if (assetFilter !== 'All' && plan.asset_class !== assetFilter) return false;

            // Status Filter
            const status = getStatus(plan.start_date, plan.end_date);
            if (statusFilter !== 'All' && status !== statusFilter) return false;

            // Start Month Filter (Exact month match)
            if (startDateFilter) {
                const pDate = new Date(plan.start_date);
                const fDate = new Date(startDateFilter);
                if (pDate.getFullYear() !== fDate.getFullYear() || pDate.getMonth() !== fDate.getMonth()) {
                    return false;
                }
            }

            // End Month Filter (Exact month match or None)
            if (endDateFilter) {
                if (endDateFilter === 'None') {
                    if (plan.end_date) return false;
                } else {
                    if (!plan.end_date) return false;
                    const pDate = new Date(plan.end_date);
                    const fDate = new Date(endDateFilter);
                    if (pDate.getFullYear() !== fDate.getFullYear() || pDate.getMonth() !== fDate.getMonth()) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [rawPlans, assetFilter, statusFilter, startDateFilter, endDateFilter]);

    const clearFilters = () => {
        setAssetFilter('All');
        setStatusFilter('All');
        setStartDateFilter('');
        setEndDateFilter('');
    };

    return (
        <section className="glass-card quadrant">
            <div className="card-header">
                <h3>Plans Held</h3>
            </div>

            {mode === 'focused' && (
                <div className="filter-bar animate-fade">
                    <CustomSelect
                        label="Asset Class"
                        value={assetFilter}
                        onChange={setAssetFilter}
                        options={[
                            { label: 'All', value: 'All' },
                            { label: 'Equity', value: 'Equity' },
                            { label: 'Fixed Income', value: 'Fixed Income' },
                            { label: 'Cash', value: 'Cash' }
                        ]}
                    />

                    <CustomSelect
                        label="Start Month"
                        value={startDateFilter}
                        onChange={setStartDateFilter}
                        options={startMonthOptions}
                    />

                    <CustomSelect
                        label="End Month"
                        value={endDateFilter}
                        onChange={setEndDateFilter}
                        options={endMonthOptions}
                    />

                    <CustomSelect
                        label="Status"
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[
                            { label: 'All', value: 'All' },
                            { label: 'Active', value: 'Active' },
                            { label: 'Pending', value: 'Pending' },
                            { label: 'Ended', value: 'Ended' }
                        ]}
                    />

                    {(assetFilter !== 'All' || statusFilter !== 'All' || startDateFilter || endDateFilter) && (
                        <button className="clear-filters" onClick={clearFilters}>
                            Clear Filters
                        </button>
                    )}
                </div>
            )}

            <div className="plans-table-container">
                <table className={`plans-table ${mode === 'focused' ? 'interactive' : ''}`}>
                    <thead>
                        <tr>
                            <th>Plan Name</th>
                            <th>Asset Class</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPlans.map((plan: any, index: number) => {
                            const status = getStatus(plan.start_date, plan.end_date);
                            return (
                                <tr key={index} onClick={(e) => {
                                    if (mode !== 'focused') return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedPlan(plan);
                                }}>
                                    <td>{plan.plan_name}</td>
                                    <td>{plan.asset_class}</td>
                                    <td>{formatDate(plan.start_date)}</td>
                                    <td>{formatDate(plan.end_date)}</td>
                                    <td>
                                        <span className={`status-pill ${status.toLowerCase()}`}>
                                            {status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredPlans.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No plans found matching your filters.
                    </p>
                )}
            </div>

            {selectedPlan && (
                <PlanDetailModal
                    plan={selectedPlan}
                    onClose={() => setSelectedPlan(null)}
                />
            )}
        </section>
    );
};

export default PlansHeld;
