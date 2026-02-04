import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import ClientHeader from './ClientHeader';
import './Dashboard.css';

const AssetAllocation: React.FC = () => (
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
);

const CashflowAnalysis: React.FC = () => (
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
);

const PlansHeld: React.FC = () => {
    const plans = [
        { type: 'Life Insurance', status: 'Active', renewalDate: '15 Mar 2026' },
        { type: 'Retirement (SRS)', status: 'Active', renewalDate: 'N/A' },
        { type: 'Education Fund', status: 'Pending', renewalDate: '01 Jan 2027' },
        { type: 'Savings Plan', status: 'Grace Period', renewalDate: '20 Feb 2026' },
    ];

    return (
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
    );
};

const RiskProfile: React.FC = () => (
    <section className="glass-card quadrant">
        <div className="card-header">
            <h3>Risk Profile</h3>
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
);

const Dashboard: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Map the pathname to a quadrantId (removing the leading slash)
    const quadrantId = location.pathname.substring(1);
    const isFocused = quadrantId !== "" && quadrantId !== "/";

    const renderFullGrid = () => (
        <main className="dashboard-grid">
            <Link to="/asset-allocation" className="quadrant-link">
                <AssetAllocation />
            </Link>
            <Link to="/cashflow" className="quadrant-link">
                <CashflowAnalysis />
            </Link>
            <Link to="/plans" className="quadrant-link">
                <PlansHeld />
            </Link>
            <Link to="/risk" className="quadrant-link">
                <RiskProfile />
            </Link>
        </main>
    );

    const renderFocusedQuadrant = () => {
        switch (quadrantId) {
            case 'asset-allocation': return <AssetAllocation />;
            case 'cashflow': return <CashflowAnalysis />;
            case 'plans': return <PlansHeld />;
            case 'risk': return <RiskProfile />;
            default: return <div>Quadrant not found</div>;
        }
    };

    return (
        <div className="dashboard-container animate-fade">
            <ClientHeader
                showBack={isFocused}
                onBack={() => navigate('/')}
            />
            {isFocused ? (
                <main className="focused-view">
                    {renderFocusedQuadrant()}
                </main>
            ) : (
                renderFullGrid()
            )}
        </div>
    );
};

export default Dashboard;
