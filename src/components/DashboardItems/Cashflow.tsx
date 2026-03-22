import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CustomizedXAxisTick } from '../UI/ChartUtils';
import { FocusModal } from '../UI/FocusModal';

interface CashflowProps {
    client?: any;
    mode?: 'overview' | 'focused';
    dateRange?: { startDate: string; endDate: string };
    isExporting?: boolean;
}

const Cashflow: React.FC<CashflowProps> = ({ client, mode = 'overview', dateRange, isExporting = false }) => {
    // State to track which lines are visible
    const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
        inflow: true,
        expense: true,
        wealthTransfers: true,
        netSurplus: true,
        netCashflow: true
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [activeItemName, setActiveItemName] = useState<string | null>(null);

    const CASHFLOW_COLORS: Record<string, string> = {
        'Inflows': '#719266', // Matches Inflow green
        'Expenses': '#9B2226', // Matches Expense red
        'Wealth Transfers': '#3C5A82' // Matches Wealth Transfer blue
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

        return data
            .sort((a: any, b: any) => new Date(a.as_of_date).getTime() - new Date(b.as_of_date).getTime())
            .map((item: any) => ({
                // Use the ISO date as the unique key for Recharts to handle multiple points correctly
                as_of_date: item.as_of_date,
                date: new Date(item.as_of_date).toLocaleDateString('en-SG', { month: 'short', year: '2-digit' }),
                fullDate: new Date(item.as_of_date).toLocaleDateString('en-SG', { day: '2-digit', month: 'long', year: 'numeric' }),
                inflow: parseFloat(item.total_inflow),
                expense: parseFloat(item.total_expense),
                wealthTransfers: parseFloat(item.wealth_transfers),
                netSurplus: parseFloat(item.net_surplus),
                netCashflow: parseFloat(item.net_cashflow),
                // Inflows
                employmentIncome: parseFloat(item.employment_income_gross || 0),
                rentalIncome: parseFloat(item.rental_income || 0),
                investmentIncome: parseFloat(item.investment_income || 0),
                // Expenses
                household: parseFloat(item.household_expenses || 0),
                tax: parseFloat(item.income_tax || 0),
                insurance: parseFloat(item.insurance_premiums || 0),
                propertyExp: parseFloat(item.property_expenses || 0),
                propertyLoan: parseFloat(item.property_loan_repayment || 0),
                nonPropertyLoan: parseFloat(item.non_property_loan_repayment || 0),
                // Wealth Transfers
                cpf: parseFloat(item.cpf_contribution_total || 0),
                regularInv: parseFloat(item.regular_investments || 0)
            }));
    }, [client?.cashflow, dateRange]);



    const hasData = chartData.length > 0;

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{ backgroundColor: '#fff', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', minWidth: '220px' }}>
                    <p style={{ color: 'var(--secondary)', marginBottom: '8px', fontWeight: 600 }}>{data.fullDate}</p>
                    {visibleLines.inflow && <p style={{ color: '#719266', fontSize: '0.9rem', margin: '4px 0' }}>Inflow: <strong>${data.inflow.toLocaleString()}</strong></p>}
                    {visibleLines.expense && <p style={{ color: '#9B2226', fontSize: '0.9rem', margin: '4px 0' }}>Expense: <strong>${data.expense.toLocaleString()}</strong></p>}
                    {visibleLines.wealthTransfers && <p style={{ color: '#3C5A82', fontSize: '0.9rem', margin: '4px 0' }}>Wealth Transfers: <strong>${data.wealthTransfers.toLocaleString()}</strong></p>}
                    {visibleLines.netSurplus && <p style={{ color: '#BC6C25', fontSize: '0.9rem', margin: '4px 0' }}>Net Surplus: <strong>${data.netSurplus.toLocaleString()}</strong></p>}
                    {visibleLines.netCashflow && <p style={{ color: '#C5B358', fontSize: '0.9rem', margin: '4px 0' }}>Net Cashflow: <strong>${data.netCashflow.toLocaleString()}</strong></p>}
                </div>
            );
        }
        return null;
    };

    return (
        <>
            <section className={`glass-card quadrant ${mode === 'focused' ? 'focused' : ''}`}>
                <div className="card-header">
                    <h3>Cashflow</h3>
                </div>

                <div className="chart-container" style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                    {hasData ? (
                        <>
                            <ResponsiveContainer width="100%" height="95%">
                                <LineChart data={chartData} onClick={handleChartClick} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="as_of_date" tick={<CustomizedXAxisTick />} interval={0} axisLine={false} tickLine={false} height={50} />
                                    <YAxis tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    {(() => {
                                        const isFocused = mode === 'focused';
                                        const dotStyle = isFocused ? { r: 4, fill: '#fff', strokeWidth: 2 } : { r: 2.5 };
                                        const activeDotStyle = isFocused ? { r: 6 } : { r: 4 };

                                        return (
                                            <>
                                                {visibleLines.inflow && <Line type="monotone" dataKey="inflow" stroke="#719266" strokeWidth={1.5} dot={dotStyle} activeDot={activeDotStyle} isAnimationActive={!isExporting} animationDuration={800} />}
                                                {visibleLines.expense && <Line type="monotone" dataKey="expense" stroke="#9B2226" strokeWidth={1.5} dot={dotStyle} activeDot={activeDotStyle} isAnimationActive={!isExporting} animationDuration={800} />}
                                                {visibleLines.wealthTransfers && <Line type="monotone" dataKey="wealthTransfers" stroke="#3C5A82" strokeWidth={1.5} dot={dotStyle} activeDot={activeDotStyle} isAnimationActive={!isExporting} animationDuration={800} />}
                                                {visibleLines.netSurplus && <Line type="monotone" dataKey="netSurplus" stroke="#BC6C25" strokeWidth={1.5} dot={dotStyle} activeDot={activeDotStyle} isAnimationActive={!isExporting} animationDuration={800} />}
                                                {visibleLines.netCashflow && <Line type="monotone" dataKey="netCashflow" stroke="#C5B358" strokeWidth={1.5} dot={dotStyle} activeDot={activeDotStyle} isAnimationActive={!isExporting} animationDuration={800} />}
                                            </>
                                        );
                                    })()}
                                </LineChart>
                            </ResponsiveContainer>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '0rem' }}>
                                {[
                                    { key: 'inflow', label: 'Inflow', color: '#719266' },
                                    { key: 'expense', label: 'Expense', color: '#9B2226' },
                                    { key: 'wealthTransfers', label: 'Wealth Transfers', color: '#3C5A82' },
                                    { key: 'netSurplus', label: 'Net Surplus', color: '#BC6C25' },
                                    { key: 'netCashflow', label: 'Net Cashflow', color: '#C5B358' }
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
                name: 'Expenses',
                items: [
                    { name: 'Household Expenses', value: data.household, color: CASHFLOW_COLORS['Expenses'] },
                    { name: 'Income Tax', value: data.tax, color: CASHFLOW_COLORS['Expenses'] },
                    { name: 'Insurance Premiums', value: data.insurance, color: CASHFLOW_COLORS['Expenses'] },
                    { name: 'Property Expenses', value: data.propertyExp, color: CASHFLOW_COLORS['Expenses'] },
                    { name: 'Property Loan', value: data.propertyLoan, color: CASHFLOW_COLORS['Expenses'] },
                    { name: 'Non-Property Loan', value: data.nonPropertyLoan, color: CASHFLOW_COLORS['Expenses'] }
                ]
            },
            {
                name: 'Wealth Transfers',
                items: [
                    { name: 'CPF Contributions', value: data.cpf, color: CASHFLOW_COLORS['Wealth Transfers'] },
                    { name: 'Regular Investments', value: data.regularInv, color: CASHFLOW_COLORS['Wealth Transfers'] }
                ]
            }
        ];
    };

    return (
        <>
            <div className="modal-header" style={{ textAlign: 'center', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                <h2 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Cashflow Breakdown</h2>
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
                            onMouseEnter={() => setActiveItemName('Net Cashflow')} onMouseLeave={() => setActiveItemName(null)}
                            style={{
                                width: '100%', maxWidth: '320px', padding: '15px', textAlign: 'center',
                                background: selectedSnapshot.netCashflow >= 0 ? 'rgba(197, 179, 88, 0.08)' : 'rgba(214, 40, 40, 0.08)',
                                borderRadius: '12px', border: `1px solid ${selectedSnapshot.netCashflow >= 0 ? 'rgba(197, 179, 88, 0.2)' : 'rgba(214, 40, 40, 0.2)'}`,
                                opacity: activeItemName && activeItemName !== 'Net Cashflow' ? 0.3 : 1, transition: '0.2s', cursor: 'pointer',
                                transform: activeItemName === 'Net Cashflow' ? 'scale(1.05)' : 'scale(1)'
                            }}
                        >
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: selectedSnapshot.netCashflow >= 0 ? 'var(--primary)' : '#D62828', fontWeight: 700 }}>Net Cashflow</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--secondary)' }}>${selectedSnapshot.netCashflow.toLocaleString()}</div>
                        </div>
                    </div>

                    <div style={{ flex: '1', minWidth: '350px' }}>
                        <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1.5rem', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Details by Category</h4>
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
                                            background: isCatActive ? `rgba(${group.name === 'Inflows' ? '113, 146, 102' : '100, 100, 100'}, 0.05)` : 'transparent',
                                            borderLeft: isCatActive ? `4px solid ${groupColor}` : '4px solid transparent',
                                            boxShadow: isCatActive && total > 0 ? '0 4px 15px rgba(0,0,0,0.05)' : 'none'
                                        }}
                                        onMouseEnter={() => total > 0 && setActiveCategory(group.name)}
                                        onMouseLeave={() => setActiveCategory(null)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: total === 0 ? '#ccc' : groupColor }} />
                                                <span style={{ fontWeight: 800, color: total === 0 ? 'var(--text-muted)' : 'var(--secondary)', fontSize: '0.95rem' }}>{group.name}</span>
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
                                                            fontSize: '0.85rem',
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
