import React from 'react';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const clientInfo = {
        name: 'Jonathan Sterling',
        age: 42,
        dob: '12 May 1983',
        id: 'ID-992841-B',
        lastUpdated: '04 Feb 2026, 12:45 PM',
        netWorth: '$2,485,900.00',
    };

    const plans = [
        { type: 'Life Insurance', status: 'Active', renewalDate: '15 Mar 2026' },
        { type: 'Retirement (SRS)', status: 'Active', renewalDate: 'N/A' },
        { type: 'Education Fund', status: 'Pending', renewalDate: '01 Jan 2027' },
        { type: 'Savings Plan', status: 'Grace Period', renewalDate: '20 Feb 2026' },
    ];

    return (
        <div className="dashboard-container animate-fade">
            {/* Header Section */}
            <header className="dashboard-header glass">
                <div className="client-meta">
                    <div className="client-avatar">JS</div>
                    <div className="client-details">
                        <h1>{clientInfo.name}</h1>
                        <div className="meta-pills">
                            <span className="pill">Age: {clientInfo.age}</span>
                            <span className="pill">DOB: {clientInfo.dob}</span>
                            <span className="pill">ID: {clientInfo.id}</span>
                        </div>
                    </div>
                </div>
                <div className="header-stats">
                    <div className="stat-group">
                        <span className="label">Grand Net Worth</span>
                        <span className="value net-worth">{clientInfo.netWorth}</span>
                    </div>
                    <div className="stat-group align-end">
                        <span className="label">Last Updated</span>
                        <span className="value timestamp">{clientInfo.lastUpdated}</span>
                    </div>
                </div>
            </header>

            {/* Main Grid Section */}
            <main className="dashboard-grid">
                {/* Quadrant 1: Asset Allocation */}
                <section className="glass-card quadrant">
                    <div className="card-header">
                        <h3>Asset Allocation</h3>
                        <span className="badge">Portfolio</span>
                    </div>
                    <div className="chart-placeholder">
                        <div className="donut-mimic">
                            <div className="donut-center">
                                <span className="percent">64%</span>
                                <span className="sub">Equities</span>
                            </div>
                        </div>
                        <div className="legend">
                            <div className="legend-item"><span className="dot equities"></span> Equities (64%)</div>
                            <div className="legend-item"><span className="dot fixed"></span> Fixed Income (22%)</div>
                            <div className="legend-item"><span className="dot cash"></span> Cash (14%)</div>
                        </div>
                    </div>
                </section>

                {/* Quadrant 2: Cashflow Trends */}
                <section className="glass-card quadrant">
                    <div className="card-header">
                        <h3>Cashflow Analysis</h3>
                        <span className="badge success">+12.5%</span>
                    </div>
                    <div className="chart-placeholder line-chart-mimic">
                        <svg viewBox="0 0 400 150" className="svg-chart">
                            <path d="M0,120 Q50,110 100,80 T200,60 T300,50 T400,20" fill="none" stroke="var(--primary)" strokeWidth="3" />
                            <path d="M0,120 Q50,110 100,80 T200,60 T300,50 T400,20 L400,150 L0,150 Z" fill="url(#gradient)" opacity="0.2" />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="var(--primary)" />
                                    <stop offset="100%" stopColor="transparent" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="chart-labels">
                            <span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span>
                        </div>
                    </div>
                </section>

                {/* Quadrant 3: Plans Held */}
                <section className="glass-card quadrant">
                    <div className="card-header">
                        <h3>Plans Held</h3>
                        <span className="badge accent">Summary</span>
                    </div>
                    <div className="plans-table-container">
                        <table className="plans-table">
                            <thead>
                                <tr>
                                    <th>Plan Type</th>
                                    <th>Status</th>
                                    <th>Renewal Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plans.map((plan, index) => (
                                    <tr key={index}>
                                        <td>{plan.type}</td>
                                        <td>
                                            <span className={`status-pill ${plan.status.toLowerCase().replace(' ', '-')}`}>
                                                {plan.status}
                                            </span>
                                        </td>
                                        <td>{plan.renewalDate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Quadrant 4: Risk Alignment */}
                <section className="glass-card quadrant">
                    <div className="card-header">
                        <h3>Risk Profile Alignment</h3>
                        <span className="badge warning">Moderate Action</span>
                    </div>
                    <div className="risk-indicator">
                        <div className="risk-track">
                            <div className="risk-marker" style={{ left: '72%' }}></div>
                            <div className="risk-fill" style={{ width: '72%' }}></div>
                        </div>
                        <div className="risk-labels">
                            <span>Conservative</span>
                            <span>Moderate</span>
                            <span>Aggressive</span>
                        </div>
                        <p className="risk-description">
                            Current allocation is slightly more aggressive than the target "Moderate" profile.
                            Consider rebalancing $42k from Equities to Fixed Income.
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Dashboard;
