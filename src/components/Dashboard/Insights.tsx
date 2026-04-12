import React from 'react';
import { RiskAnalysis } from './Insights/RiskAnalysis';
import { MeetingNotes } from './Insights/MeetingNotes';
import type { InsightsProps } from './Insights/Insights.helpers';
import { QuadrantModeSwitch } from './QuadrantModeSwitch';

const INSIGHTS_MODE_OPTIONS = [
    { value: 'risk-analysis' as const, label: 'Risk analysis' },
    { value: 'meeting-notes' as const, label: 'Meeting notes' },
] as const;

const Insights: React.FC<InsightsProps> = (props) => {
    const {
        insightsMode = 'risk-analysis',
        onInsightsModeChange
    } = props;

    return (
        <section className={`glass-card quadrant ${props.mode === 'focused' ? 'no-hover' : ''}`}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h3>Insights</h3>
                <QuadrantModeSwitch
                    value={insightsMode}
                    onChange={(v) => onInsightsModeChange?.(v)}
                    options={INSIGHTS_MODE_OPTIONS}
                    ariaLabel="Choose insights mode"
                />
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
