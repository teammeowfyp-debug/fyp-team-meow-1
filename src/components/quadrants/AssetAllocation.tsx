import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CustomizedXAxisTick } from '../ChartUtils';

const ALLOCATION_COLORS: Record<string, string> = {
    'Equity': 'var(--primary)',
    'Fixed Income': 'var(--warning)',
    'Cash': 'var(--success)',
    'Bonds': 'var(--warning)',
    'Real Estate': '#BC6C25', // Specialized color
    'Commodities': 'var(--danger)',
    'Alternatives': '#606C38', // Specialized color
};

const FALLBACK_COLORS = ['#C5B358', '#D4A373', '#719266', '#BC6C25', '#9B2226', '#606C38'];

interface AssetAllocationProps {
    client?: any;
}

const AssetAllocation: React.FC<AssetAllocationProps> = ({ client }) => {
    // 1. Process Allocation history (stacked bar chart: month × asset_class)
    const { history, assetClasses } = React.useMemo(() => {
        if (!client?.monthly_cashflow || !client?.client_plans) {
            return { history: [], assetClasses: [] };
        }

        const cashflowMonths: string[] = [...(client.monthly_cashflow || [])]
            .sort((a: any, b: any) => new Date(a.month_year).getTime() - new Date(b.month_year).getTime())
            .map((c: any) => c.month_year);

        // Collect asset classes from ALL plans
        const assetClassSet = new Set<string>();
        client.client_plans?.forEach((plan: any) => assetClassSet.add(plan.asset_class));
        const allAssetClasses = Array.from(assetClassSet);

        const allocation_history = cashflowMonths.map((monthYear: string) => {
            const monthTs = new Date(monthYear).getTime();
            const row: Record<string, any> = {
                date: new Date(monthYear).toLocaleDateString('en-SG', { month: 'short', year: '2-digit' }),
                fullDate: new Date(monthYear).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' }),
            };

            allAssetClasses.forEach((cls: string) => { row[cls] = 0; });

            client.client_plans?.forEach((plan: any) => {
                const ed = plan.end_date;
                const isActive = ed === null || ed === undefined || ed === '';
                const wasActiveThisMonth = isActive || new Date(ed).getTime() >= monthTs;
                if (!wasActiveThisMonth) return;

                const eligible = (plan.monthly_valuations || []).filter(
                    (v: any) => new Date(v.as_of_date).getTime() <= monthTs
                );
                if (eligible.length === 0) return;
                const best = eligible.reduce((a: any, b: any) =>
                    new Date(a.as_of_date).getTime() > new Date(b.as_of_date).getTime() ? a : b
                );
                row[plan.asset_class] = (row[plan.asset_class] || 0) + parseFloat(best.market_value);
            });

            return row;
        });

        return { history: allocation_history, assetClasses: allAssetClasses };
    }, [client?.monthly_cashflow, client?.client_plans]);

    const hasData = history.length > 0 && assetClasses.length > 0;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const total = payload.reduce((s: number, e: any) => s + (e.value || 0), 0);
            return (
                <div style={{
                    backgroundColor: '#fff',
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: 160,
                }}>
                    <p style={{ color: 'var(--secondary)', fontWeight: 700, marginBottom: 6 }}>{label}</p>
                    {payload.map((entry: any, i: number) => entry.value > 0 && (
                        <p key={i} style={{ color: entry.fill, fontSize: '0.85rem', margin: '3px 0' }}>
                            {entry.name}: <span style={{ fontWeight: 600 }}>${entry.value.toLocaleString()}</span>
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

    return (
        <section className="glass-card quadrant">
            <div className="card-header">
                <h3>Asset Allocation</h3>
            </div>
            <div className="chart-container" style={{ width: '100%', height: '250px', marginTop: '10px' }}>
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={history} margin={{ top: 5, right: 20, bottom: 35, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="var(--text-muted)"
                                tick={<CustomizedXAxisTick />}
                                tickLine={false}
                                axisLine={false}
                                interval={0}
                                height={50}
                            />
                            <YAxis
                                stroke="var(--text-muted)"
                                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            {assetClasses.map((cls, i) => (
                                <Bar
                                    key={cls}
                                    dataKey={cls}
                                    stackId="a"
                                    fill={ALLOCATION_COLORS[cls] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                                    radius={i === assetClasses.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
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
        </section>
    );
};

export default AssetAllocation;
