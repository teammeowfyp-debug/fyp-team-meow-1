import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CustomizedXAxisTick } from '../ChartUtils';

interface CashflowProps {
    client?: any;
}

const Cashflow: React.FC<CashflowProps> = ({ client }) => {
    // Transform data for the chart
    // We want to show the cashflow history in chronological order
    const chartData = useMemo(() => {
        if (!client?.monthly_cashflow || client.monthly_cashflow.length === 0) {
            return [];
        }

        return [...client.monthly_cashflow]
            .sort((a: any, b: any) => new Date(a.month_year).getTime() - new Date(b.month_year).getTime())
            .map((item: any) => ({
                date: new Date(item.month_year).toLocaleDateString('en-SG', { month: 'short', year: '2-digit' }),
                fullDate: new Date(item.month_year).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' }),
                inflow: parseFloat(item.total_inflow),
                outflow: parseFloat(item.total_outflow),
                net: parseFloat(item.net_surplus)
            }));
    }, [client?.monthly_cashflow_history]);

    const hasData = chartData.length > 0;

    // Custom Tooltip for better UX
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip" style={{
                    backgroundColor: '#fff',
                    padding: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <p className="tooltip-date" style={{ color: 'var(--secondary)', marginBottom: '8px', fontWeight: 600 }}>{payload[0].payload.fullDate}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color, fontSize: '0.9rem', margin: '4px 0' }}>
                            {entry.name}: <span style={{ fontWeight: 600 }}>${entry.value.toLocaleString()}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <section className="glass-card quadrant">
            <div className="card-header">
                <h3>Cashflow</h3>
            </div>
            <div className="chart-container" style={{ width: '100%', height: '250px', marginTop: '10px' }}>
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 35, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="var(--text-muted)"
                                /* use shared custom tick to force all labels and rotate */
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
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Line
                                type="monotone"
                                dataKey="inflow"
                                name="Inflow"
                                stroke="var(--success)"
                                strokeWidth={2}
                                dot={{ r: 4, fill: 'var(--success)', strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="outflow"
                                name="Outflow"
                                stroke="var(--danger)"
                                strokeWidth={2}
                                dot={{ r: 4, fill: 'var(--danger)', strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="net"
                                name="Net Surplus"
                                stroke="var(--primary)"
                                strokeWidth={2}
                                dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
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
