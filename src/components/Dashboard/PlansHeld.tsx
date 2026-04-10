import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CustomizedXAxisTick } from '../UI/ChartUtils';
import { FocusModal } from '../UI/FocusModal';
import CustomSelect from '../UI/CustomSelect';
import { Button } from '../UI/Button';

interface PlansHeldProps {
    client?: any;
    mode?: 'overview' | 'focused';
    dateRange?: { startDate: string; endDate: string };
}

const PlansHeld: React.FC<PlansHeldProps> = ({ client, mode = 'overview', dateRange }) => {
    const rawPlans = client?.client_plans || [];
    const [selectedPlan, setSelectedPlan] = useState<any>(null);

    // Filter states
    const [assetFilter, setAssetFilter] = useState<string[]>(['All']);
    const [statusFilter, setStatusFilter] = useState<string[]>(['All']);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-SG', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const filteredPlans = React.useMemo(() => {
        return rawPlans.filter((plan: any) => {
            // Asset Class Filter
            if (!assetFilter.includes('All') && !assetFilter.includes(plan.asset_class)) return false;

            // Status Filter
            const status = plan.status;
            if (!statusFilter.includes('All') && !statusFilter.includes(status)) return false;

            // Global Dashboard Date Range Filter
            if (dateRange) {
                const planStart = plan.start_date ? plan.start_date.substring(0, 10) : null;
                if (planStart) {
                    if (dateRange.startDate && planStart < dateRange.startDate) return false;
                    if (dateRange.endDate && planStart > dateRange.endDate) return false;
                }
            }

            return true;
        });
    }, [rawPlans, assetFilter, statusFilter, dateRange]);

    const clearFilters = () => {
        setAssetFilter(['All']);
        setStatusFilter(['All']);
    };

    return (
        <>
            <section className={`glass-card quadrant ${mode === 'focused' ? 'no-hover' : ''}`}>
                <div className="card-header">
                    <h3>Plans Held</h3>
                </div>

                {mode === 'focused' && (
                    <div className="filter-bar">
                        <CustomSelect
                            label="Asset Class"
                            value={assetFilter}
                            onChange={setAssetFilter}
                            multi={true}
                            style={{ minWidth: '170px' }}
                            options={[
                                { label: 'All', value: 'All' },
                                { label: 'Equity', value: 'Equity' },
                                { label: 'Fixed Income', value: 'Fixed Income' },
                                { label: 'Cash', value: 'Cash' },
                                { label: 'Life Insurance', value: 'Life Insurance' },
                                { label: 'Health Insurance', value: 'Health Insurance' },
                                { label: 'General Insurance', value: 'General Insurance' }
                            ]}
                        />

                        <CustomSelect
                            label="Status"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            multi={true}
                            style={{ minWidth: '170px' }}
                            options={[
                                { label: 'All', value: 'All' },
                                { label: 'Pending', value: 'Pending' },
                                { label: 'Active', value: 'Active' },
                                { label: 'Lapsed', value: 'Lapsed' },
                                { label: 'Matured', value: 'Matured' },
                                { label: 'Settled', value: 'Settled' },
                                { label: 'Void', value: 'Void' }
                            ]}
                        />

                        {(!assetFilter.includes('All') || !statusFilter.includes('All')) && (
                            <Button variant="outline" size="small" onClick={clearFilters} style={{ marginLeft: '10px', height: 'fit-content', alignSelf: 'center' }}>
                                Clear Filters
                            </Button>
                        )}
                    </div>
                )}

                <div className="plans-header-container">
                    <table className="plans-table">
                        <thead>
                            <tr>
                                <th>Plan Name</th>
                                <th>Asset Class</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                    </table>
                </div>

                <div className="plans-body-container">
                    <table className={`plans-table ${mode === 'focused' ? 'interactive' : ''}`}>
                        <tbody>
                            {filteredPlans.map((plan: any, index: number) => {
                                const status = plan.status;
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
                                            <span className={`status-pill ${(status || '').toLowerCase()}`}>
                                                {status || '-'}
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
            </section>

            <FocusModal
                isOpen={!!selectedPlan}
                onClose={() => setSelectedPlan(null)}
                modalContentStyle={{ gap: '0' }}
            >
                {selectedPlan && (
                    <PlanDetailView plan={selectedPlan} />
                )}
            </FocusModal>
        </>
    );
};

interface PlanDetailViewProps {
    plan: any;
}

const PlanDetailView: React.FC<PlanDetailViewProps> = ({ plan }) => {
    const isInsurance = plan.asset_class.includes('Insurance');

    const valuationData = React.useMemo(() => {
        const sourceData = isInsurance ? plan.insurance_valuations : plan.investment_valuations;
        if (!sourceData) return [];

        return [...sourceData]
            .sort((a: any, b: any) => new Date(a.as_of_date).getTime() - new Date(b.as_of_date).getTime())
            .map((v: any) => ({
                date: new Date(v.as_of_date).toLocaleDateString('en-SG', { month: 'short', year: '2-digit' }),
                fullDate: new Date(v.as_of_date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }),
                rawDate: v.as_of_date,
                value: parseFloat(isInsurance ? v.cash_value : v.market_value),
                // Keep extra fields for insurance
                ...(isInsurance && {
                    death: parseFloat(v.death_benefit),
                    ci: parseFloat(v.critical_illness_benefit),
                    disability: parseFloat(v.disability_benefit)
                })
            }));
    }, [plan, isInsurance]);


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
                    <p style={{ color: 'var(--primary)', fontSize: 'var(--text-sm)' }}>
                        {isInsurance ? 'Cash Value' : 'Market Value'}: <span style={{ fontWeight: 600 }}>${payload[0].value.toLocaleString()}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const hasValue = valuationData.some(v => v.value > 0);

    return (
        <>
            <div className="modal-header" style={{ textAlign: 'center', marginBottom: '0', marginTop: '0' }}>
                <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '0.25rem' }}>{plan.plan_name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <div className="modal-id" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Plan ID: {plan.plan_id}</div>
                    <span className={`status-pill ${(plan.status || '').toLowerCase()}`} style={{ fontSize: 'var(--text-xs)', padding: '2px 10px' }}>
                        {plan.status || '-'}
                    </span>
                </div>
            </div>

            <div className="modal-body">
                {hasValue ? (
                    <div className="chart-container" style={{ width: '100%', height: '430px', marginTop: '0.5rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={valuationData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis
                                    dataKey="rawDate"
                                    stroke="var(--text-muted)"
                                    tick={<CustomizedXAxisTick />}
                                    interval={0}
                                    height={30}
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
                                    name={isInsurance ? "Cash Value" : "Market Value"}
                                    stroke="var(--primary)"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#fff', stroke: 'var(--primary)', strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="no-value-info" style={{
                        padding: '1.5rem',
                        textAlign: 'center',
                        color: 'var(--secondary)',
                        background: 'rgba(0, 0, 0, 0.02)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        marginTop: '1rem',
                        marginBottom: '1rem',
                        fontSize: 'var(--text-sm)'
                    }}>
                        {isInsurance ? "This is a pure protection plan with no cash value." : "No valuation data available for this plan."}
                    </div>
                )}

                {isInsurance && (
                    <div className="insurance-details" style={{
                        marginTop: '0.5rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '0.75rem 1rem',
                        borderTop: '1px solid var(--border)',
                        paddingTop: '1.5rem'
                    }}>
                        <div className="stat-group align-center">
                            <span className="label">Policy Type</span>
                            <span className="value" style={{ color: 'var(--secondary)', fontWeight: 600 }}>{plan.policy_type || '-'}</span>
                        </div>
                        <div className="stat-group align-center">
                            <span className="label">Benefit Type</span>
                            <span className="value" style={{ color: 'var(--secondary)', fontWeight: 600 }}>{plan.benefit_type || '-'}</span>
                        </div>
                        <div className="stat-group align-center">
                            <span className="label">Sum Assured</span>
                            <span className="value" style={{ color: 'var(--secondary)', fontWeight: 600 }}>${(plan.sum_assured || 0).toLocaleString()}</span>
                        </div>
                        <div className="stat-group align-center">
                            <span className="label">Premium Amount</span>
                            <span className="value" style={{ color: 'var(--secondary)', fontWeight: 600 }}>
                                ${(plan.premium_amount || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="stat-group align-center">
                            <span className="label">Payment Term</span>
                            <span className="value" style={{ color: 'var(--secondary)', fontWeight: 600 }}>
                                {plan.payment_term ? `${plan.payment_term} Years` : '-'} {plan.payment_frequency ? `(${plan.payment_frequency})` : ''}
                            </span>
                        </div>
                        <div className="stat-group align-center">
                            <span className="label">Life Assured</span>
                            <span className="value" style={{ color: 'var(--secondary)', fontWeight: 600 }}>{plan.life_assured || '-'}</span>
                        </div>
                        <div className="stat-group align-center">
                            <span className="label">Start Date</span>
                            <span className="value" style={{ color: 'var(--secondary)', fontWeight: 600 }}>
                                {plan.start_date ? new Date(plan.start_date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </span>
                        </div>
                        <div className="stat-group align-center">
                            <span className="label">Expiry Date</span>
                            <span className="value" style={{ color: 'var(--secondary)', fontWeight: 600 }}>
                                {plan.expiry_date ? new Date(plan.expiry_date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </span>
                        </div>
                    </div>
                )}

                {!isInsurance && (
                    <div className="investment-details" style={{
                        marginTop: '0.5rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '0.75rem 1rem',
                        borderTop: '1px solid var(--border)',
                        paddingTop: '1.5rem'
                    }}>
                        <div className="stat-group align-center">
                            <span className="label">Policy Type</span>
                            <span className="value" style={{ color: 'var(--secondary)', fontWeight: 600 }}>{plan.policy_type || '-'}</span>
                        </div>
                        <div className="stat-group align-center">
                            <span className="label">Start Date</span>
                            <span className="value" style={{ color: 'var(--secondary)', fontWeight: 600 }}>
                                {plan.start_date ? new Date(plan.start_date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </span>
                        </div>
                        <div className="stat-group align-center">
                            <span className="label">End Date</span>
                            <span className="value" style={{ color: 'var(--secondary)', fontWeight: 600 }}>
                                {plan.end_date ? new Date(plan.end_date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PlansHeld;
