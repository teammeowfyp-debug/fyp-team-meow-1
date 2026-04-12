import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { CustomizedXAxisTick } from '../UI/ChartUtils';
import { FocusModal } from '../UI/FocusModal';
import { QuadrantModeSwitch } from './QuadrantModeSwitch';

const ALLOCATION_COLORS: Record<string, string> = {
    'Equity': 'var(--primary)',
    'Fixed Income': '#3E5C76',
    'Cash': 'var(--success)',
    'Bonds': '#3E5C76',
    'Life Insurance': '#BC6C25',
    'Health Insurance': '#9B2226',
    'General Insurance': '#606C38',
};

const FALLBACK_COLORS = ['#C5B358', '#D4A373', '#719266', '#BC6C25', '#9B2226', '#606C38'];

interface AssetAllocationProps {
    client?: any;
    mode?: 'overview' | 'focused';
    dateRange?: { startDate: string; endDate: string };
    isExporting?: boolean;
    forceChartType?: 'absolute' | 'percent';
}

const AssetAllocation: React.FC<AssetAllocationProps> = ({ client, mode = 'overview', dateRange, isExporting = false, forceChartType }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [activePlanName, setActivePlanName] = useState<string | null>(null);
    const [chartTypeState, setChartType] = useState<'absolute' | 'percent'>('absolute');
    const chartType = forceChartType || chartTypeState;

    const handleChartClick = (data: any) => {
        if (mode === 'focused' && data) {
            const payload = data.activePayload?.[0]?.payload ||
                (data.activeTooltipIndex !== undefined ? history[data.activeTooltipIndex] : null);

            if (payload) {
                setSelectedSnapshot(payload);
                setIsModalOpen(true);
            }
        }
    };
    // 1. Process Allocation history (stacked bar chart: month × asset_class)
    const { history, assetClasses } = useMemo(() => {
        let cashflowMonths: string[] = [...(client.cashflow || [])]
            .sort((a: any, b: any) => new Date(a.as_of_date).getTime() - new Date(b.as_of_date).getTime())
            .map((c: any) => c.as_of_date);

        if (dateRange) {
            cashflowMonths = cashflowMonths.filter(dateStr => {
                const itemDate = dateStr.substring(0, 10); // get YYYY-MM-DD
                if (dateRange.startDate && itemDate < dateRange.startDate) return false;
                if (dateRange.endDate && itemDate > dateRange.endDate) return false;
                return true;
            });
        }

        // Collect asset classes from ALL plans
        const assetClassSet = new Set<string>();
        client.client_plans?.forEach((plan: any) => assetClassSet.add(plan.asset_class));
        const allAssetClasses = Array.from(assetClassSet);

        const allocation_history = cashflowMonths.map((asOfDate: string) => {
            const monthTs = new Date(asOfDate).getTime();
            const row: Record<string, any> = {
                as_of_date: asOfDate,
                date: new Date(asOfDate).toLocaleDateString('en-SG', { month: 'short', year: '2-digit' }),
                fullDate: new Date(asOfDate).toLocaleDateString('en-SG', { day: '2-digit', month: 'long', year: 'numeric' }),
            };

            allAssetClasses.forEach((cls: string) => { row[cls] = 0; });
            row.plans = [];

            client.client_plans?.forEach((plan: any) => {
                const ed = plan.end_date;
                const isActive = ed === null || ed === undefined || ed === '';
                const wasActiveThisMonth = isActive || new Date(ed).getTime() >= monthTs;
                if (!wasActiveThisMonth) return;

                // Pick either investment or insurance valuations
                let valuations = [];
                let valueKey = 'market_value';

                if (plan.asset_class.includes('Insurance')) {
                    valuations = plan.insurance_valuations || [];
                    valueKey = 'cash_value';
                } else {
                    valuations = plan.investment_valuations || [];
                }

                const eligible = valuations.filter(
                    (v: any) => new Date(v.as_of_date).getTime() <= monthTs
                );
                if (eligible.length === 0) return;

                const best = eligible.reduce((a: any, b: any) =>
                    new Date(a.as_of_date).getTime() > new Date(b.as_of_date).getTime() ? a : b
                );

                const val = parseFloat(best[valueKey] || 0);
                row[plan.asset_class] = (row[plan.asset_class] || 0) + val;

                if (val > 0) {
                    row.plans.push({
                        name: plan.plan_name,
                        value: val,
                        category: plan.asset_class,
                        color: ALLOCATION_COLORS[plan.asset_class] || FALLBACK_COLORS[0]
                    });
                }
            });

            return row;
        });

        // Filter out asset classes that never have a value > 0 in the history
        const activeAssetClasses = allAssetClasses.filter(cls =>
            allocation_history.some(row => row[cls] > 0)
        );

        return { history: allocation_history, assetClasses: activeAssetClasses };
    }, [client?.cashflow, client?.client_plans, dateRange]);

    const hasData = history.length > 0 && assetClasses.length > 0;

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const total = payload.reduce((s: number, e: any) => s + (e.value || 0), 0);
            const data = payload[0].payload;
            return (
                <div style={{
                    backgroundColor: '#fff',
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: 160,
                }}>
                    <p style={{ color: 'var(--secondary)', fontWeight: 700, marginBottom: 6 }}>{data.fullDate}</p>
                    {payload.map((entry: any, i: number) => entry.value > 0 && (
                        <p key={i} style={{ color: entry.fill, fontSize: 'var(--text-sm)', margin: '3px 0' }}>
                            {entry.name}: <span style={{ fontWeight: 600 }}>
                                {chartType === 'percent'
                                    ? `${((entry.value / total) * 100).toFixed(1)}%`
                                    : `$${entry.value.toLocaleString()}`}
                            </span>
                        </p>
                    ))}
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                        Total: ${total.toLocaleString()}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (isExporting) {
        return (
            <div className="chart-container" style={{ width: '100%', flex: 1, marginTop: '10px' }}>
                <ResponsiveContainer width="100%" height={370}>
                    <BarChart
                        data={history}
                        margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                        stackOffset={chartType === 'percent' ? 'expand' : undefined}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                            dataKey="as_of_date"
                            stroke="var(--text-muted)"
                            tick={<CustomizedXAxisTick />}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                            height={60}
                        />
                        <YAxis
                            stroke="var(--text-muted)"
                            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                            tickFormatter={(v) => chartType === 'percent' ? `${(v * 100).toFixed(0)}%` : `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '5px', fontSize: '10px' }} />
                        {assetClasses.map((cls, i) => (
                            <Bar
                                key={cls}
                                dataKey={cls}
                                stackId="a"
                                fill={ALLOCATION_COLORS[cls] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                                radius={i === assetClasses.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                isAnimationActive={false}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return (
        <section className={`glass-card quadrant ${mode === 'focused' ? 'no-hover' : ''}`}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h3>Asset Allocation</h3>
                <QuadrantModeSwitch
                    value={chartType}
                    onChange={(v) => setChartType(v)}
                    options={[
                        { value: 'absolute', label: 'Value' },
                        { value: 'percent', label: 'Percent' },
                    ]}
                    ariaLabel="Allocation display scale"
                />
            </div>
            <div className="chart-container" style={{ width: '100%', flex: 1, marginTop: '10px' }}>
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={history}
                            onClick={handleChartClick}
                            margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                            style={{ cursor: mode === 'focused' ? 'pointer' : 'default' }}
                            stackOffset={chartType === 'percent' ? 'expand' : undefined}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis
                                dataKey="as_of_date"
                                stroke="var(--text-muted)"
                                tick={<CustomizedXAxisTick />}
                                tickLine={false}
                                axisLine={false}
                                interval={isExporting ? 'preserveStartEnd' : 0}
                                height={isExporting ? 60 : 50}
                            />
                            <YAxis
                                stroke="var(--text-muted)"
                                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                tickFormatter={(v) => chartType === 'percent' ? `${(v * 100).toFixed(0)}%` : `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '5px' }} />
                            {assetClasses.map((cls, i) => (
                                <Bar
                                    key={cls}
                                    dataKey={cls}
                                    stackId="a"
                                    fill={ALLOCATION_COLORS[cls] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                                    radius={i === assetClasses.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                    isAnimationActive={!isExporting}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="chart-placeholder line-chart-mimic">
                        <svg viewBox="0 0 400 150" className="svg-chart">
                            <path d="M0,120 Q50,110 100,80 T200,60 T300,50 T400,20" fill="none" stroke="var(--primary)" strokeWidth="3" />
                            <path d="M0,120 Q50,110 100,80 T200,60 T300,50 T400,20 L400,150 L0,150 Z" fill="url(#gradient-allocation)" opacity="0.2" />
                            <defs>
                                <linearGradient id="gradient-allocation" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="var(--primary)" />
                                    <stop offset="100%" stopColor="transparent" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="chart-labels">
                            <span>Missing</span><span>Financial</span><span>Data</span>
                        </div>
                    </div>
                )}
            </div>

            <FocusModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                modalContentStyle={{ gap: '1rem' }}
            >
                {selectedSnapshot && (
                    <AllocationBreakdown
                        selectedSnapshot={selectedSnapshot}
                        assetClasses={assetClasses}
                        activeCategory={activeCategory}
                        setActiveCategory={setActiveCategory}
                        activePlanName={activePlanName}
                        setActivePlanName={setActivePlanName}
                        ALLOCATION_COLORS={ALLOCATION_COLORS}
                        FALLBACK_COLORS={FALLBACK_COLORS}
                    />
                )}
            </FocusModal>
        </section>
    );
};

interface AllocationBreakdownProps {
    selectedSnapshot: any;
    assetClasses: string[];
    activeCategory: string | null;
    setActiveCategory: (cat: string | null) => void;
    activePlanName: string | null;
    setActivePlanName: (name: string | null) => void;
    ALLOCATION_COLORS: Record<string, string>;
    FALLBACK_COLORS: string[];
}

const AllocationBreakdown: React.FC<AllocationBreakdownProps> = ({
    selectedSnapshot, assetClasses, activeCategory, setActiveCategory, activePlanName, setActivePlanName, ALLOCATION_COLORS, FALLBACK_COLORS
}) => {
    return (
        <>
            <div className="modal-header" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <h2 style={{ marginBottom: '0.25rem', fontSize: 'var(--text-2xl)' }}>Allocation Breakdown</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{selectedSnapshot.fullDate}</p>
            </div>

            <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: '2rem' }}>
                    <div style={{ flex: '1.2', minWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ width: '100%', height: '400px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    {(() => {
                                        const activeCats = assetClasses.filter(cls => (selectedSnapshot[cls] || 0) > 0);
                                        const alignedPlans = activeCats.flatMap(cls =>
                                            selectedSnapshot.plans.filter((p: any) => p.category === cls)
                                        );
                                        const totalValue = alignedPlans.reduce((sum, p) => sum + (p.value || 0), 0);

                                        return (
                                            <>
                                                <Tooltip
                                                    formatter={(value: any, name: any) => [
                                                        `${((Number(value) / (totalValue || 1)) * 100).toFixed(1)}%`,
                                                        name
                                                    ]}
                                                />
                                                <Pie
                                                    data={alignedPlans}
                                                    cx="50%" cy="50%" innerRadius={80} outerRadius={160} paddingAngle={1} dataKey="value" animationDuration={800}
                                                >
                                                    {alignedPlans.map((p: any, idx: number) => {
                                                        const isHighlighted = activePlanName === p.name || (activeCategory === p.category && !activePlanName);
                                                        const isDimmed = (activePlanName && activePlanName !== p.name) || (activeCategory && activeCategory !== p.category && !activePlanName);

                                                        return (
                                                            <Cell
                                                                key={`plan-${p.name}-${idx}`}
                                                                fill={p.color}
                                                                style={{
                                                                    opacity: isDimmed ? 0.3 : 1,
                                                                    transition: '0.2s', cursor: 'pointer', outline: 'none',
                                                                    transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                                                                    transformOrigin: 'center'
                                                                }}
                                                                onMouseEnter={() => setActivePlanName(p.name)}
                                                                onMouseLeave={() => setActivePlanName(null)}
                                                            />
                                                        );
                                                    })}
                                                </Pie>
                                            </>
                                        );
                                    })()}
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div
                            style={{
                                width: '100%', maxWidth: '320px', padding: '15px', textAlign: 'center',
                                background: 'rgba(197, 179, 88, 0.08)', borderRadius: '12px', border: '1px solid rgba(197, 179, 88, 0.2)',
                                transition: '0.2s',
                                opacity: activePlanName ? 0.3 : 1
                            }}
                        >
                            <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.05em' }}>Total Portfolio Value</div>
                            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--secondary)' }}>
                                ${assetClasses.reduce((sum, cls) => sum + (selectedSnapshot[cls] || 0), 0).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: '1', minWidth: '350px' }}>
                        <h4 style={{ fontSize: 'var(--text-sm)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1.5rem', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Details by Asset Class</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {assetClasses.filter(cls => selectedSnapshot[cls] > 0).map((cls, i) => {
                                const isCatActive = activeCategory === cls || (activePlanName && selectedSnapshot.plans.find((p: any) => p.name === activePlanName)?.category === cls);
                                const catColor = ALLOCATION_COLORS[cls] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];

                                return (
                                    <div
                                        key={cls}
                                        style={{
                                            opacity: activeCategory && activeCategory !== cls && !activePlanName ? 0.3 : 1,
                                            transition: 'all 0.3s ease',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            background: isCatActive ? (catColor.includes('primary') ? 'rgba(197, 179, 88, 0.05)' : 'rgba(100, 100, 100, 0.04)') : 'transparent',
                                            borderLeft: isCatActive ? `4px solid ${catColor}` : '4px solid transparent',
                                            boxShadow: isCatActive ? '0 4px 15px rgba(0,0,0,0.05)' : 'none'
                                        }}
                                        onMouseEnter={() => setActiveCategory(cls)}
                                        onMouseLeave={() => setActiveCategory(null)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: catColor, boxShadow: '0 0 10px rgba(0,0,0,0.1)' }} />
                                                <span style={{ fontWeight: 800, color: 'var(--secondary)', letterSpacing: '-0.01em', fontSize: 'var(--text-base)' }}>{cls}</span>
                                            </div>
                                            <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>${(selectedSnapshot[cls] || 0).toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '12px' }}>
                                            {selectedSnapshot.plans.filter((p: any) => p.category === cls).map((plan: any, idx: number) => {
                                                const isPlanActive = activePlanName === plan.name;
                                                return (
                                                    <div
                                                        key={idx}
                                                        onMouseEnter={(e) => {
                                                            e.stopPropagation();
                                                            setActivePlanName(plan.name);
                                                        }}
                                                        onMouseLeave={() => setActivePlanName(null)}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            fontSize: '0.85rem',
                                                            color: isPlanActive ? 'var(--secondary)' : 'var(--text-muted)',
                                                            fontWeight: isPlanActive ? 700 : 400,
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            background: isPlanActive ? '#fff' : 'transparent',
                                                            borderLeft: isPlanActive ? `2px solid ${plan.color}` : '2px solid transparent',
                                                            boxShadow: isPlanActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            cursor: 'pointer',
                                                            transform: isPlanActive ? 'translateX(4px)' : 'none'
                                                        }}
                                                    >
                                                        <span>{plan.name}</span>
                                                        <span>${plan.value.toLocaleString()}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AssetAllocation;
