import React from 'react';
import { RiskAnalysis } from './Insights/RiskAnalysis';
import { MeetingNotes } from './Insights/MeetingNotes';
import type { InsightsProps } from './Insights/Insights.helpers';
import { Button } from '../UI/Button';

const Insights: React.FC<InsightsProps> = (props) => {
    const {
        insightsMode = 'risk-analysis',
        onInsightsModeChange
    } = props;

    return (
        <section className="glass-card quadrant">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Insights</h3>
                <Button
                    variant="primary"
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onInsightsModeChange?.(insightsMode === 'risk-analysis' ? 'meeting-notes' : 'risk-analysis');
                    }}
                    style={{ borderRadius: '20px', padding: '4px 12px', fontSize: '0.7rem' }}
                >
                    {insightsMode === 'risk-analysis' ? 'Risk Analysis' : 'Meeting Notes'}
                </Button>
            </div>

            {insightsMode === 'risk-analysis' ? (
                <RiskAnalysis {...props} />
            ) : (
                <MeetingNotes {...props} />
            )}
        </section>
    );
};

export default Insights;
