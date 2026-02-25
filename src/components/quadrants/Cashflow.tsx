import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CustomizedXAxisTick } from '../ChartUtils';

interface CashflowProps {
    client?: any;
}

const Cashflow: React.FC<CashflowProps> = ({ client }) => {
    // State to track which lines are visible
    const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
        inflow: true,
        expense: true,
        wealthTransfers: true,
        netSurplus: true,
        netCashflow: true
    });

    const toggleLine = (dataKey: string) => {
        setVisibleLines(prev => ({
            ...prev,
            [dataKey]: !prev[dataKey]
        }));
    };

    // Transform data for the chart
    const chartData = useMemo(() => {
        if (!client?.cashflow || client.cashflow.length === 0) {
            return [];
        }

        return [...client.cashflow]
            .sort((a: any, b: any) => new Date(a.as_of_date).getTime() - new Date(b.as_of_date).getTime())
            .map((item: any) => ({
                date: new Date(item.as_of_date).toLocaleDateString('en-SG', { month: 'short', year: '2-digit' }),
                fullDate: new Date(item.as_of_date).toLocaleDateString('en-SG', { day: '2-digit', month: 'long', year: 'numeric' }),
                inflow: parseFloat(item.total_inflow),
                expense: parseFloat(item.total_expense),
                wealthTransfers: parseFloat(item.wealth_transfers),
                netSurplus: parseFloat(item.net_surplus),
                netCashflow: parseFloat(item.net_cashflow)
            }));
    }, [client?.cashflow]);

    const hasData = chartData.length > 0;

    // Custom Tooltip for better UX
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="custom-tooltip" style={{
                    backgroundColor: '#fff',
                    padding: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: '220px'
                }}>
                    <p className="tooltip-date" style={{ color: 'var(--secondary)', marginBottom: '8px', fontWeight: 600 }}>{data.fullDate}</p>
                    {visibleLines.inflow && (
                        <p style={{ color: 'var(--success)', fontSize: '0.9rem', margin: '4px 0' }}>
                            Total Inflow: <span style={{ fontWeight: 600 }}>${data.inflow.toLocaleString()}</span>
                        </p>
                    )}
                    {visibleLines.expense && (
                        <p style={{ color: 'var(--danger)', fontSize: '0.9rem', margin: '4px 0' }}>
                            Total Expense: <span style={{ fontWeight: 600 }}>${data.expense.toLocaleString()}</span>
                        </p>
                    )}
                    {visibleLines.wealthTransfers && (
                        <p style={{ color: '#3C5A82', fontSize: '0.9rem', margin: '4px 0' }}>
                            Wealth Transfers: <span style={{ fontWeight: 600 }}>${data.wealthTransfers.toLocaleString()}</span>
                        </p>
                    )}
                    {visibleLines.netSurplus && (
                        <p style={{ color: 'var(--primary)', fontSize: '0.9rem', margin: '4px 0', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                            Net Surplus: <span style={{ fontWeight: 600 }}>${data.netSurplus.toLocaleString()}</span>
                        </p>
                    )}
                    {visibleLines.netCashflow && (
                        <p style={{ color: 'var(--warning)', fontSize: '0.9rem', margin: '4px 0' }}>
                            Net Cashflow: <span style={{ fontWeight: 600 }}>${data.netCashflow.toLocaleString()}</span>
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    const legendItems = [
        { key: 'inflow', label: 'Total Inflow', color: 'var(--success)' },
        { key: 'expense', label: 'Total Expense', color: 'var(--danger)' },
        { key: 'wealthTransfers', label: 'Wealth Transfers', color: '#3C5A82' },
        { key: 'netSurplus', label: 'Net Surplus', color: 'var(--primary)' },
        { key: 'netCashflow', label: 'Net Cashflow', color: 'var(--warning)' }
    ];

    return (
        <section className="glass-card quadrant">
            <div className="card-header">
                <h3>Cashflow</h3>
            </div>
            <div className="chart-container" style={{ width: '100%', flex: 1, marginTop: '10px', display: 'flex', flexDirection: 'column' }}>
                {hasData ? (
                    <>
                        <ResponsiveContainer width="100%" height="85%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 0, left: 0 }}>
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
                                    tickFormatter={(value) => `$${value >= 1000 ? `${value / 1000}k` : value}`}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="inflow"
                                    name="Total Inflow"
                                    stroke="var(--success)"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: 'var(--success)', strokeWidth: 0 }}
                                    activeDot={{ r: 6 }}
                                    hide={!visibleLines.inflow}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="expense"
                                    name="Total Expense"
                                    stroke="var(--danger)"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: 'var(--danger)', strokeWidth: 0 }}
                                    activeDot={{ r: 6 }}
                                    hide={!visibleLines.expense}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="wealthTransfers"
                                    name="Wealth Transfers"
                                    stroke="#3C5A82"
                                    strokeWidth={2}
                                    strokeDasharray="3 3"
                                    dot={{ r: 4, fill: '#3C5A82', strokeWidth: 0 }}
                                    activeDot={{ r: 6 }}
                                    hide={!visibleLines.wealthTransfers}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="netSurplus"
                                    name="Net Surplus"
                                    stroke="var(--primary)"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                                    activeDot={{ r: 6 }}
                                    hide={!visibleLines.netSurplus}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="netCashflow"
                                    name="Net Cashflow"
                                    stroke="var(--warning)"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={{ r: 4, fill: 'var(--warning)', strokeWidth: 0 }}
                                    activeDot={{ r: 6 }}
                                    hide={!visibleLines.netCashflow}
                                />
                            </LineChart>
                        </ResponsiveContainer>

                        {/* Custom Interactive Legend */}
                        <div className="custom-legend" style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: '16px',
                            marginTop: '20px',
                            paddingBottom: '5px'
                        }}>
                            {legendItems.map(item => (
                                <div
                                    key={item.key}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        toggleLine(item.key);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        opacity: visibleLines[item.key] ? 1 : 0.4,
                                        transition: 'opacity 0.2s ease',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        color: 'var(--text-main)',
                                        userSelect: 'none'
                                    }}
                                >
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        backgroundColor: item.color,
                                        marginRight: '6px'
                                    }} />
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="chart-placeholder line-chart-mimic">
                        <svg viewBox="0 0 400 150" className="svg-chart">
                            <path d="M0,120 Q50,110 100,80 T200,60 T300,50 T400,20" fill="none" stroke="var(--primary)" strokeWidth="3" />
                            <path d="M0,120 Q50,110 100,80 T200,60 T300,50 T400,20 L400,150 L0,150 Z" fill="url(#gradient-cashflow)" opacity="0.2" />
                            <defs>
                                <linearGradient id="gradient-cashflow" x1="0%" y1="0%" x2="0%" y2="100%">
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
        </section>
    );
};

export default Cashflow;
