export const RISK_LEVEL_DESCRIPTIONS: Record<string, string> = {
    'Level 1': 'You seek to preserve capital and understand that potential investment returns, when adjusted for inflation, may be very low or even zero. You are willing to accept a very low volatility in your investment(s).',
    'Level 2': 'You seek small capital growth and understand that potential investment income and capital gains come with some short term fluctuations. You are willing to accept low volatility in your investment(s).',
    'Level 3': 'You seek moderate capital growth and understand that potential moderate investment returns over the medium term come with relatively higher risks. You are willing to accept medium volatility in your investment(s) over the short term.',
    'Level 4': 'You seek high capital gains and understand that potential higher investment returns over the long term come with relatively higher risks. You are willing to accept high volatility in your investment(s) over the short to medium term.'
};

export interface InsightsProps {
    clientId?: string;
    client?: any;
    mode?: 'overview' | 'focused';
    dateRange?: { startDate: string; endDate: string };
    cache?: {
        overview?: string;
        focused?: any;
        meetingNotes?: any;
        meetingNotesSummary?: string;
        meetingNotesTranscript?: string;
        generatedPeriod?: { startDate: string; endDate: string };
    } | null;
    onCacheUpdate?: (update: {
        overview?: string;
        focused?: any;
        meetingNotes?: any;
        meetingNotesSummary?: string;
        meetingNotesTranscript?: string;
        generatedPeriod?: { startDate: string; endDate: string };
    }) => void;
    insightsMode?: 'risk-analysis' | 'meeting-notes';
    onInsightsModeChange?: (mode: 'risk-analysis' | 'meeting-notes') => void;
}

export const buildFinancialContextParams = (client: any, dateRange?: { startDate: string; endDate: string }) => {
    if (!client) return null;
    const referenceDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date();
    const oneYearBeforeRef = new Date(referenceDate);
    oneYearBeforeRef.setFullYear(oneYearBeforeRef.getFullYear() - 1);

    const category = client?.risk_profile || 'Level 2';
    const description = RISK_LEVEL_DESCRIPTIONS[category] || RISK_LEVEL_DESCRIPTIONS['Level 2'];

    const activePlans = (client?.client_plans || []).filter((p: any) => {
        if (p.status !== 'Active') return false;
        const startDate = p.start_date ? new Date(p.start_date) : null;
        const endDate = (p.end_date || p.expiry_date) ? new Date(p.end_date || p.expiry_date) : null;
        if (startDate && startDate > referenceDate) return false;
        if (endDate && endDate < referenceDate) return false;
        return true;
    });

    const allocationMap: Record<string, number> = {};
    let totalAssetValue = 0;
    let totalSumAssured = 0;
    let earliestStart: Date | null = null;
    let latestEnd: Date | null = null;
    const activeCategories = new Set<string>();

    activePlans.forEach((plan: any) => {
        const isInsurance = plan.asset_class?.includes('Insurance') || plan.sum_assured !== undefined;
        const valuations = isInsurance ? (plan.insurance_valuations || []) : (plan.investment_valuations || []);
        const valueKey = isInsurance ? 'cash_value' : 'market_value';
        const cat = plan.asset_class || plan.policy_type || 'Other';
        if (cat) activeCategories.add(cat);

        if (plan.start_date) {
            const d = new Date(plan.start_date);
            if (!earliestStart || d < earliestStart) earliestStart = d;
        }
        const endDateStr = plan.end_date || plan.expiry_date;
        if (endDateStr) {
            const d = new Date(endDateStr);
            if (!latestEnd || d > latestEnd) latestEnd = d;
        }

        const valuationsAtRef = valuations?.filter((v: any) =>
            new Date(v.as_of_date) <= referenceDate
        ).sort((a: any, b: any) =>
            new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime()
        );

        const latestVal = valuationsAtRef[0];
        if (latestVal) {
            const val = parseFloat(latestVal[valueKey] || 0);
            if (val > 0) {
                totalAssetValue += val;
                allocationMap[cat] = (allocationMap[cat] || 0) + val;
            }
        }
        if (isInsurance && plan.sum_assured) {
            totalSumAssured += parseFloat(plan.sum_assured);
        }
    });

    // Historical Performance Calculation
    let portfolioPerformanceString = '';
    const activeInvestments = activePlans.filter((p: any) => !p.asset_class?.includes('Insurance') && p.market_value !== undefined);
    if (activeInvestments.length > 0) {
        let pastTotalValue = 0;
        let hasPastData = false;

        activeInvestments.forEach((plan: any) => {
            const valuations = plan.investment_valuations || [];
            const valuationsAtRef = valuations?.filter((v: any) =>
                new Date(v.as_of_date) <= referenceDate
            ).sort((a: any, b: any) =>
                new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime()
            );

            if (valuationsAtRef.length > 1) {
                const sortedVals = valuationsAtRef;
                const latestVal = parseFloat(sortedVals[0].market_value || 0);
                let pastValRecord = sortedVals.find((v: any) => new Date(v.as_of_date) <= oneYearBeforeRef);
                if (!pastValRecord && sortedVals.length > 0) {
                    pastValRecord = sortedVals[sortedVals.length - 1];
                }
                if (pastValRecord && sortedVals[0].as_of_date !== pastValRecord.as_of_date) {
                    pastTotalValue += parseFloat(pastValRecord.market_value || 0);
                    hasPastData = true;
                } else {
                    pastTotalValue += latestVal;
                }
            } else if (valuationsAtRef.length === 1) {
                pastTotalValue += parseFloat(valuationsAtRef[0].market_value || 0);
            }
        });

        if (hasPastData && pastTotalValue > 0) {
            const diff = totalAssetValue - pastTotalValue;
            const percentChange = ((diff / pastTotalValue) * 100).toFixed(1);
            portfolioPerformanceString = `\n                       - Portfolio Value Change (Last 12 Months from Ref): ${diff >= 0 ? '+' : ''}${percentChange}%`;
        }
    }

    const allocationString = totalAssetValue > 0
        ? Object.entries(allocationMap)
            .filter(([_, val]) => val > 0)
            .map(([cat, val]) => `${Math.round((val / totalAssetValue) * 100)}% ${cat}`)
            .join(', ')
        : 'No allocation data';

    const cashflowsAtRef = (client?.cashflow || [])
        .filter((cf: any) => new Date(cf.as_of_date) <= referenceDate)
        .sort((a: any, b: any) =>
            new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime()
        );

    // Cashflow Trends Calculation
    let historicalTrend = '';
    const recentCashflows = cashflowsAtRef.filter((cf: any) => new Date(cf.as_of_date) >= oneYearBeforeRef);
    if (recentCashflows.length > 1) {
        const avgSurplus = recentCashflows.reduce((sum: number, cf: any) => sum + (parseFloat(cf.net_surplus) || 0), 0) / recentCashflows.length;
        const avgInflow = recentCashflows.reduce((sum: number, cf: any) => sum + (parseFloat(cf.total_inflow) || 0), 0) / recentCashflows.length;

        let surplusVolatilityInfo = '';
        if (recentCashflows.length >= 3) {
            const surpluses = recentCashflows.map((cf: any) => parseFloat(cf.net_surplus) || 0);
            const variance = surpluses.reduce((sum: number, val: number) => sum + Math.pow(val - avgSurplus, 2), 0) / surpluses.length;
            const stdDev = Math.sqrt(variance);
            const stdDevPercent = avgSurplus !== 0 ? ((stdDev / Math.abs(avgSurplus)) * 100).toFixed(1) : '0';
            surplusVolatilityInfo = `, Net Surplus Std Dev: ${stdDevPercent}%`;
        }
        historicalTrend = `\n                       - Last 12 Months Average: Total Inflow ($${Math.round(avgInflow)}), Net Surplus ($${Math.round(avgSurplus)})${surplusVolatilityInfo}`;
    }

    const latestCashflow = cashflowsAtRef[0];
    const cashflowString = latestCashflow
        ? `Current Cashflow Summary (at Ref Date):
                   - Income: Employment ($${latestCashflow.employment_income_gross}), Rental ($${latestCashflow.rental_income}), Investment ($${latestCashflow.investment_income}). Total Inflow: $${latestCashflow.total_inflow}
                   - Expense: Household ($${latestCashflow.household_expenses}), Tax ($${latestCashflow.income_tax}), Insurance ($${latestCashflow.insurance_premiums}), Property ($${latestCashflow.property_expenses}), Debt/Loan ($${latestCashflow.property_loan_repayment + latestCashflow.non_property_loan_repayment}). Total Expense: $${latestCashflow.total_expense}
                   - Net State: Net Surplus ($${latestCashflow.net_surplus}), Net Cashflow ($${latestCashflow.net_cashflow}).${historicalTrend}`
        : 'No cashflow data';

    const plansString = activePlans.length > 0
        ? `Current Portfolio Summary (at Ref Date):
                   - Total Assets: $${Math.round(totalAssetValue).toLocaleString()}
                   - Total Insurance Sum Assured: $${Math.round(totalSumAssured).toLocaleString()}
                   - Holding Period: ${earliestStart ? (earliestStart as Date).toLocaleDateString() : 'Unknown'} to ${latestEnd ? (latestEnd as Date).toLocaleDateString() : 'Ongoing'}
                   - Plan Distribution: ${Array.from(activeCategories).join(', ')}${portfolioPerformanceString}`
        : 'No active plans';

    return {
        riskProfileDescription: description,
        assetAllocation: allocationString,
        cashflow: cashflowString,
        plansHeld: plansString,
    };
};

export const getStandardButtonStyle = (mode: 'overview' | 'focused' = 'focused') => {
    return {
        padding: mode === 'focused' ? '10px 24px' : '6px 16px',
        borderRadius: mode === 'focused' ? '10px' : '8px',
        background: 'transparent',
        color: 'var(--primary)',
        border: '1px solid var(--primary)',
        fontWeight: 'var(--font-semibold)',
        fontSize: mode === 'focused' ? 'var(--text-sm)' : 'var(--text-xs)',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer' as const,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em'
    };
};

export const handleButtonHover = (e: any, isHovering: boolean) => {
    if (e && e.currentTarget) {
        e.currentTarget.style.transform = isHovering ? 'translateY(-2px)' : 'translateY(0)';
    }
};
