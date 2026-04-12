import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine, Legend } from 'recharts';
import { CustomizedXAxisTick } from '../UI/ChartUtils';
import { FocusModal } from '../UI/FocusModal';
import { QuadrantModeSwitch } from './QuadrantModeSwitch';

interface CashflowProps {
    client?: any;
    mode?: 'overview' | 'focused';
    dateRange?: { startDate: string; endDate: string };
    isExporting?: boolean;
    forceViewMode?: 'periodic' | 'cumulative';
}

const getNetPositionColor = (value: number) => value >= 0 ? '#719266' : '#9B2226';
const getNetPositionBg = (value: number) => value >= 0 ? 'rgba(113, 146, 102, 0.08)' : 'rgba(155, 34, 38, 0.08)';
const getNetPositionBorder = (value: number) => value >= 0 ? 'rgba(113, 146, 102, 0.2)' : 'rgba(155, 34, 38, 0.2)';

const Cashflow: React.FC<CashflowProps> = ({ client, mode = 'overview', dateRange, isExporting = false, forceViewMode }) => {
    // State to track which lines are visible
    const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
        inflow: true,
        outflow: true,
        netPosition: true
    });

    const [viewModeState, setViewMode] = useState<'periodic' | 'cumulative'>('periodic');
    const viewMode = forceViewMode || viewModeState;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [activeItemName, setActiveItemName] = useState<string | null>(null);

    const CASHFLOW_COLORS: Record<string, string> = {
        'Inflows': '#3C5A82', // Deep Professional Blue
        'Outflows': '#E09F3E'  // Warm Amber/Gold
    };

    const toggleLine = (dataKey: string) => {
        setVisibleLines(prev => ({
            ...prev,
            [dataKey]: !prev[dataKey]
        }));
    };

    const handleChartClick = (data: any) => {
        if (mode === 'focused' && data) {
            const payload = data.activePayload?.[0]?.payload ||
                (data.activeTooltipIndex !== undefined ? chartData[data.activeTooltipIndex] : null);

            if (payload) {
                setSelectedSnapshot(payload);
                setIsModalOpen(true);
            }
        }
    };

    // Transform data for the chart - Show all snapshots individually
    const chartData = useMemo(() => {
        if (!client?.cashflow || client.cashflow.length === 0) {
            return [];
        }

        let data = [...client.cashflow];

        if (dateRange) {
            data = data.filter((item: any) => {
                const itemDate = item.as_of_date.substring(0, 10);
                if (dateRange.startDate && itemDate < dateRange.startDate) return false;
                if (dateRange.endDate && itemDate > dateRange.endDate) return false;
                return true;
            });
        }

        const sortedData = data.sort((a: any, b: any) => new Date(a.as_of_date).getTime() - new Date(b.as_of_date).getTime());

        // Cumulative calculations
        let cumulativeInflow = 0;
        let cumulativeOutflow = 0;
        let cumulativeNetPosition = 0;

        return sortedData.map((item: any) => {
            const inflowVal = parseFloat(item.total_inflow || 0);
            const outflowVal = parseFloat(item.total_outflow || 0);
            const netPositionVal = parseFloat(item.net_position || 0);

            cumulativeInflow += inflowVal;
            cumulativeOutflow += outflowVal;
            cumulativeNetPosition += netPositionVal;

            return {
                as_of_date: item.as_of_date,
                date: new Date(item.as_of_date).toLocaleDateString('en-SG', { month: 'short', year: '2-digit' }),
                fullDate: new Date(item.as_of_date).toLocaleDateString('en-SG', { day: '2-digit', month: 'long', year: 'numeric' }),
                inflow: viewMode === 'cumulative' ? cumulativeInflow : inflowVal,
                outflow: viewMode === 'cumulative' ? cumulativeOutflow : outflowVal,
                netPosition: viewMode === 'cumulative' ? cumulativeNetPosition : netPositionVal,
                // These are for the breakdown modal (non-cumulative)
                rawInflow: inflowVal,
                rawOutflow: outflowVal,
                rawNetPosition: netPositionVal,
                // Details
                employmentIncome: parseFloat(item.employment_income_gross || 0),
                rentalIncome: parseFloat(item.rental_income || 0),
                investmentIncome: parseFloat(item.investment_income || 0),
                household: parseFloat(item.household_expenses || 0),
                tax: parseFloat(item.income_tax || 0),
                insurance: parseFloat(item.insurance_premiums || 0),
                propertyExp: parseFloat(item.property_expenses || 0),
                propertyLoan: parseFloat(item.property_loan_repayment || 0),
                nonPropertyLoan: parseFloat(item.non_property_loan_repayment || 0),
                cpf: parseFloat(item.cpf_contribution_total || 0),
                regularInv: parseFloat(item.regular_investments || 0)
            };
        });
    }, [client?.cashflow, dateRange, viewMode]);

    const hasData = chartData.length > 0;

    const gradientOffset = useMemo(() => {
        if (!chartData.length) return 0;
        const netPosData = chartData.map(d => d.netPosition);
        const max = Math.max(...netPosData);
        const min = Math.min(...netPosData);

        if (max <= 0) return 0;
        if (min >= 0) return 1;

        return max / (max - min);
    }, [chartData]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{ backgroundColor: '#fff', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', minWidth: '220px' }}>
                    <p style={{ color: 'var(--secondary)', marginBottom: '8px', fontWeight: 600 }}>{data.fullDate}</p>
                    {visibleLines.inflow && <p style={{ color: CASHFLOW_COLORS['Inflows'], fontSize: '0.9rem', margin: '4px 0' }}>{viewMode === 'cumulative' ? 'Total Inflow' : 'Inflow'}: <strong>${data.inflow.toLocaleString()}</strong></p>}
                    {visibleLines.outflow && <p style={{ color: CASHFLOW_COLORS['Outflows'], fontSize: '0.9rem', margin: '4px 0' }}>{viewMode === 'cumulative' ? 'Total Outflow' : 'Outflow'}: <strong>${data.outflow.toLocaleString()}</strong></p>}
                    {visibleLines.netPosition && <p style={{ color: getNetPositionColor(data.netPosition), fontSize: '0.9rem', margin: '4px 0' }}>Net Position: <strong>${data.netPosition.toLocaleString()}</strong></p>}
                </div>
            );
        }
        return null;
    };

    if (isExporting) {
        return (
            <div className="chart-container" style={{ width: '100%', flex: 1, marginTop: '10px' }}>
                <ResponsiveContainer width="100%" height={370}>
                    <LineChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                        <defs>
                            <linearGradient id="netPositionGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset={gradientOffset} stopColor="#719266" stopOpacity={1} />
                                <stop offset={gradientOffset} stopColor="#9B2226" stopOpacity={1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="as_of_date" tick={<CustomizedXAxisTick />} interval="preserveStartEnd" axisLine={false} tickLine={false} height={60} />
                        <YAxis tickFormatter={(v) => {
                            const absV = Math.abs(v);
                            const sign = v < 0 ? '-' : '';
                            return `${sign}$${absV >= 1000 ? (absV / 1000).toFixed(0) + 'k' : absV}`;
                        }} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <Legend 
                            verticalAlign="bottom" 
                            wrapperStyle={{ paddingTop: '5px', fontSize: '10px' }}
                            content={(props: any) => {
                                const { payload } = props;
                                if (!payload) return null;
                                
                                // FORCE ORDER: Inflow -> Outflow -> Net Position
                                const order = ['Inflow', 'Outflow', 'Net Position'];
                                const sortedPayload = [...payload].sort((a, b) => 
                                    order.indexOf(a.value) - order.indexOf(b.value)
                                );

                                return (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', paddingTop: '8px' }}>
                                        {sortedPayload.map((entry: any, index: number) => {
                                            // Handle gradient color fallback for legend icon
                                            let iconColor = entry.color;
                                            if (entry.value === 'Net Position' && (iconColor.includes('url') || !iconColor)) {
                                                const lastVal = chartData[chartData.length - 1]?.netPosition ?? 0;
                                                iconColor = lastVal >= 0 ? '#719266' : '#9B2226';
                                            }
                                            return (
                                                <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: iconColor }} />
                                                    <span style={{ color: '#666', fontWeight: 600 }}>{entry.value}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            }}
                        />
                                {visibleLines.inflow && <Line name="Inflow" type="monotone" dataKey="inflow" stroke={CASHFLOW_COLORS['Inflows']} strokeWidth={1.5} dot={false} isAnimationActive={false} />}
                                {visibleLines.outflow && <Line name="Outflow" type="monotone" dataKey="outflow" stroke={CASHFLOW_COLORS['Outflows']} strokeWidth={1.5} dot={false} isAnimationActive={false} />}
                                {visibleLines.netPosition && <Line 
                                    name="Net Position"
                                    type="monotone" 
                                    dataKey="netPosition" 
                                    stroke={chartData.every(d => d.netPosition >= 0) ? '#719266' : (chartData.every(d => d.netPosition < 0) ? '#9B2226' : 'url(#netPositionGradient)')} 
                                    strokeWidth={1.5} 
                                    dot={false} 
                                    isAnimationActive={false} 
                                />}
                        <ReferenceLine y={0} stroke="#555555" strokeWidth={2} strokeDasharray="6 4" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return (
        <>
            <section className={`glass-card quadrant ${mode === 'focused' ? 'focused no-hover' : ''}`}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h3>Cashflow</h3>
                    <QuadrantModeSwitch
                        value={viewMode}
                        onChange={(v) => setViewMode(v)}
                        options={[
                            { value: 'periodic', label: 'Periodic' },
                            { value: 'cumulative', label: 'Cumulative' },
                        ]}
                        ariaLabel="Cashflow chart basis"
                    />
                </div>

                <div className="chart-container" style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                    {hasData ? (
                        <>
                            <ResponsiveContainer width="100%" height="95%">
                                <LineChart data={chartData} onClick={handleChartClick} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="netPositionGradientNormal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset={gradientOffset} stopColor="#719266" stopOpacity={1} />
                                            <stop offset={gradientOffset} stopColor="#9B2226" stopOpacity={1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="as_of_date" tick={<CustomizedXAxisTick />} interval={0} axisLine={false} tickLine={false} height={50} />
                                    <YAxis tickFormatter={(v) => {
                                        const absV = Math.abs(v);
                                        const sign = v < 0 ? '-' : '';
                                        return `${sign}$${absV >= 1000 ? (absV / 1000).toFixed(0) + 'k' : absV}`;
                                    }} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    {(() => {
                                        const isFocused = mode === 'focused';
                                        const dotStyle = isFocused ? { r: 4, fill: '#fff', strokeWidth: 2 } : { r: 2.5 };
                                        const activeDotStyle = isFocused ? { r: 6 } : { r: 4 };

                                        return (
                                            <>
                                                {visibleLines.inflow && <Line type="monotone" dataKey="inflow" stroke={CASHFLOW_COLORS['Inflows']} strokeWidth={1.5} dot={dotStyle} activeDot={activeDotStyle} isAnimationActive={!isExporting} animationDuration={800} />}
                                                {visibleLines.outflow && <Line type="monotone" dataKey="outflow" stroke={CASHFLOW_COLORS['Outflows']} strokeWidth={1.5} dot={dotStyle} activeDot={activeDotStyle} isAnimationActive={!isExporting} animationDuration={800} />}
                                                {visibleLines.netPosition && <Line 
                                                    type="monotone" 
                                                    dataKey="netPosition" 
                                                    stroke={chartData.every(d => d.netPosition >= 0) ? '#719266' : (chartData.every(d => d.netPosition < 0) ? '#9B2226' : 'url(#netPositionGradientNormal)')} 
                                                    strokeWidth={2} 
                                                    dot={(props: any) => {
                                                        const { cx, cy, payload } = props;
                                                        if (cx === undefined || cy === undefined) return null;
                                                        return <circle key={`dot-${payload.as_of_date}`} cx={cx} cy={cy} r={isFocused ? 4 : 2.5} fill="#fff" stroke={getNetPositionColor(payload.netPosition)} strokeWidth={2} />;
                                                    }}
                                                    activeDot={(props: any) => {
                                                        const { cx, cy, payload } = props;
                                                        if (cx === undefined || cy === undefined) return null;
                                                        return <circle key={`active-dot-${payload.as_of_date}`} cx={cx} cy={cy} r={isFocused ? 6 : 4} fill={getNetPositionColor(payload.netPosition)} stroke="#fff" strokeWidth={2} />;
                                                    }}
                                                    isAnimationActive={!isExporting} 
                                                    animationDuration={800} 
                                                />}
                                            </>
                                        );
                                    })()}
                                    <ReferenceLine y={0} stroke="#555555" strokeWidth={2} strokeDasharray="6 4" />
                                </LineChart>
                            </ResponsiveContainer>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '0rem' }}>
                                {[
                                { key: 'inflow', label: 'Inflow', color: CASHFLOW_COLORS['Inflows'] },
                                    { key: 'outflow', label: 'Outflow', color: CASHFLOW_COLORS['Outflows'] },
                                    { 
                                        key: 'netPosition', 
                                        label: 'Net Position', 
                                        color: getNetPositionColor(chartData[chartData.length - 1]?.netPosition ?? 0) 
                                    }
                                ].map((item) => (
                                    <div
                                        key={item.key}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleLine(item.key);
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem',
                                            cursor: 'pointer', opacity: visibleLines[item.key] ? 1 : 0.4,
                                            padding: '4px 10px', borderRadius: '20px', background: '#fff', transition: '0.2s',
                                            color: item.color, fontWeight: 600
                                        }}
                                    >
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                                        {item.label}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="chart-placeholder line-chart-mimic" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                            No Cashflow Data Available
                        </div>
                    )}
                </div>
            </section>

            <FocusModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                modalContentStyle={{ gap: '1rem' }}
            >
                {selectedSnapshot && (
                    <CashflowBreakdown
                        selectedSnapshot={selectedSnapshot}
                        activeCategory={activeCategory}
                        setActiveCategory={setActiveCategory}
                        activeItemName={activeItemName}
                        setActiveItemName={setActiveItemName}
                        CASHFLOW_COLORS={CASHFLOW_COLORS}
                    />
                )}
            </FocusModal>
        </>
    );
};


interface CashflowBreakdownProps {
    selectedSnapshot: any;
    activeCategory: string | null;
    setActiveCategory: (cat: string | null) => void;
    activeItemName: string | null;
    setActiveItemName: (name: string | null) => void;
    CASHFLOW_COLORS: Record<string, string>;
}

const CashflowBreakdown: React.FC<CashflowBreakdownProps> = ({
    selectedSnapshot, activeCategory, setActiveCategory, activeItemName, setActiveItemName, CASHFLOW_COLORS
}) => {
    const getPieGroups = (data: any) => {
        if (!data) return [];
        return [
            {
                name: 'Inflows',
                items: [
                    { name: 'Employment Income', value: data.employmentIncome, color: CASHFLOW_COLORS['Inflows'] },
                    { name: 'Rental Income', value: data.rentalIncome, color: CASHFLOW_COLORS['Inflows'] },
                    { name: 'Investment Income', value: data.investmentIncome, color: CASHFLOW_COLORS['Inflows'] }
                ]
            },
            {
                name: 'Outflows',
                items: [
                    { name: 'Household Expenses', value: data.household, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'Income Tax', value: data.tax, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'Insurance Premiums', value: data.insurance, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'Property Expenses', value: data.propertyExp, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'Property Loan', value: data.propertyLoan, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'Non-Property Loan', value: data.nonPropertyLoan, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'CPF Contributions', value: data.cpf, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'Regular Investments', value: data.regularInv, color: CASHFLOW_COLORS['Outflows'] }
                ]
            }
        ];
    };

    return (
        <>
            <div className="modal-header" style={{ textAlign: 'center', marginBottom: '1rem', marginTop: '0.5rem' }}>
                <h2 style={{ marginBottom: '0.25rem', fontSize: 'var(--text-2xl)' }}>Cashflow Breakdown</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>{selectedSnapshot.fullDate}</p>
            </div>

            <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: '2rem' }}>
                    <div style={{ flex: '1.2', minWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ width: '100%', height: '400px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    {(() => {
                                        const groups = getPieGroups(selectedSnapshot);
                                        const inflowItems = groups[0].items.map(i => ({ ...i, category: groups[0].name })).filter(i => i.value > 0);
                                        const outflowItems = groups.slice(1).flatMap(g => g.items.map(i => ({ ...i, category: g.name }))).filter(i => i.value > 0);
                                        const totalInflows = inflowItems.reduce((sum, i) => sum + (i.value || 0), 0);
                                        const totalOutflows = outflowItems.reduce((sum, i) => sum + (i.value || 0), 0);

                                        return (
                                            <>
                                                <Tooltip
                                                    formatter={(value: any, name: any, entry: any) => {
                                                        const itemCategory = entry.payload.category;
                                                        const total = itemCategory === 'Inflows' ? totalInflows : totalOutflows;
                                                        return [`${((Number(value) / (total || 1)) * 100).toFixed(1)}%`, name];
                                                    }}
                                                />
                                                <Pie data={inflowItems} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={1} dataKey="value" animationDuration={800}>
                                                    {inflowItems.map((p: any, idx: number) => {
                                                        const isHighlighted = activeItemName === p.name || (activeCategory === p.category && !activeItemName);
                                                        const isDimmed = (activeItemName && activeItemName !== p.name) || (activeCategory && activeCategory !== p.category && !activeItemName);
                                                        return (
                                                            <Cell
                                                                key={`inflow-${p.name}-${idx}`}
                                                                fill={p.color}
                                                                style={{
                                                                    opacity: isDimmed ? 0.3 : 1,
                                                                    transition: '0.2s', cursor: 'pointer', outline: 'none',
                                                                    transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                                                                    transformOrigin: 'center'
                                                                }}
                                                                onMouseEnter={() => setActiveItemName(p.name)}
                                                                onMouseLeave={() => setActiveItemName(null)}
                                                            />
                                                        );
                                                    })}
                                                </Pie>
                                                <Pie data={outflowItems} cx="50%" cy="50%" innerRadius={115} outerRadius={165} paddingAngle={1} dataKey="value" animationDuration={800}>
                                                    {outflowItems.map((p: any, idx: number) => {
                                                        const isHighlighted = activeItemName === p.name || (activeCategory === p.category && !activeItemName);
                                                        const isDimmed = (activeItemName && activeItemName !== p.name) || (activeCategory && activeCategory !== p.category && !activeItemName);
                                                        return (
                                                            <Cell
                                                                key={`outflow-${p.name}-${idx}`}
                                                                fill={p.color}
                                                                style={{
                                                                    opacity: isDimmed ? 0.3 : 1,
                                                                    transition: '0.2s', cursor: 'pointer', outline: 'none',
                                                                    transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                                                                    transformOrigin: 'center'
                                                                }}
                                                                onMouseEnter={() => setActiveItemName(p.name)}
                                                                onMouseLeave={() => setActiveItemName(null)}
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
                            onMouseEnter={() => setActiveItemName('Net Position')} onMouseLeave={() => setActiveItemName(null)}
                            style={{
                                width: '100%', maxWidth: '320px', padding: '15px', textAlign: 'center',
                                background: getNetPositionBg(selectedSnapshot.netPosition),
                                borderRadius: '12px', border: `1px solid ${getNetPositionBorder(selectedSnapshot.netPosition)}`,
                                opacity: activeItemName && activeItemName !== 'Net Position' ? 0.3 : 1, transition: '0.2s', cursor: 'pointer',
                                transform: activeItemName === 'Net Position' ? 'scale(1.05)' : 'scale(1)'
                            }}
                        >
                            <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: getNetPositionColor(selectedSnapshot.netPosition), fontWeight: 700 }}>Net Position</div>
                            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--secondary)' }}>${selectedSnapshot.netPosition.toLocaleString()}</div>
                        </div>
                    </div>

                    <div style={{ flex: '1', minWidth: '350px' }}>
                        <h4 style={{ fontSize: 'var(--text-sm)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1.5rem', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Details by Category</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {getPieGroups(selectedSnapshot).map((group) => {
                                const groupColor = CASHFLOW_COLORS[group.name];
                                const actualItems = group.items.filter(it => it.value > 0);
                                const isCatActive = activeCategory === group.name || (activeItemName && actualItems.find(it => it.name === activeItemName));
                                const total = group.items.reduce((sum, it) => sum + it.value, 0);

                                return (
                                    <div
                                        key={group.name}
                                        style={{
                                            opacity: total === 0 ? 0.4 : (activeCategory && activeCategory !== group.name && !activeItemName ? 0.3 : 1),
                                            transition: 'all 0.3s ease',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            background: isCatActive ? (group.name === 'Inflows' ? 'rgba(60, 90, 130, 0.05)' : 'rgba(224, 159, 62, 0.05)') : 'transparent',
                                            borderLeft: isCatActive ? `4px solid ${groupColor}` : '4px solid transparent',
                                            boxShadow: isCatActive && total > 0 ? '0 4px 15px rgba(0,0,0,0.05)' : 'none'
                                        }}
                                        onMouseEnter={() => total > 0 && setActiveCategory(group.name)}
                                        onMouseLeave={() => setActiveCategory(null)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: total === 0 ? '#ccc' : groupColor }} />
                                                <span style={{ fontWeight: 800, color: total === 0 ? 'var(--text-muted)' : 'var(--secondary)', fontSize: 'var(--text-base)' }}>{group.name}</span>
                                            </div>
                                            <span style={{ fontWeight: 700, color: total === 0 ? 'var(--text-muted)' : 'var(--secondary)' }}>${total.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '12px' }}>
                                            {group.items.map((item, idx) => {
                                                const isItemActive = activeItemName === item.name;
                                                const isZero = item.value === 0;
                                                return (
                                                    <div
                                                        key={idx}
                                                        onMouseEnter={(e) => {
                                                            e.stopPropagation();
                                                            if (!isZero) setActiveItemName(item.name);
                                                        }}
                                                        onMouseLeave={() => setActiveItemName(null)}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            fontSize: 'var(--text-sm)',
                                                            color: isZero ? 'var(--text-muted)' : (isItemActive ? 'var(--secondary)' : 'var(--text-muted)'),
                                                            opacity: isZero ? 0.35 : 1,
                                                            fontWeight: isItemActive ? 700 : 400,
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            background: isItemActive ? '#fff' : 'transparent',
                                                            borderLeft: isItemActive ? `2px solid ${item.color}` : '2px solid transparent',
                                                            boxShadow: isItemActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                                            transition: 'all 0.2s ease',
                                                            cursor: isZero ? 'default' : 'pointer',
                                                            transform: isItemActive ? 'translateX(4px)' : 'none'
                                                        }}
                                                    >
                                                        <span>{item.name}</span>
                                                        <span>${item.value.toLocaleString()}</span>
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

export default Cashflow;
