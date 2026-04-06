import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthProvider';

export interface DateRange {
    startDate: string;
    endDate: string;
}

export interface AbsoluteBounds {
    start: string;
    end: string;
}

export interface RiskAnalysisCache {
    overview?: string;
    focused?: any;
    meetingNotes?: any;
    meetingNotesSummary?: string;
    meetingNotesTranscript?: string;
    generatedPeriod?: { startDate: string; endDate: string };
}

export const useDashboardData = (clientId: string | undefined) => {
    const { user } = useAuth();
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(!!clientId);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [riskAnalysisCache, setRiskAnalysisCache] = useState<Record<string, RiskAnalysisCache>>({});
    const [absoluteBounds, setAbsoluteBounds] = useState<AbsoluteBounds | null>(null);
    const [insightsMode, setInsightsMode] = useState<'risk-analysis' | 'meeting-notes'>('risk-analysis');

    const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setStartDate(newStart);
        if (newStart && endDate && newStart > endDate) {
            setEndDate(newStart);
        }
    }, [endDate]);

    const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = e.target.value;
        setEndDate(newEnd);
        if (newEnd && startDate && newEnd < startDate) {
            setStartDate(newEnd);
        }
    }, [startDate]);

    const handleSetMaxRange = useCallback(() => {
        if (absoluteBounds) {
            setStartDate(absoluteBounds.start);
            setEndDate(absoluteBounds.end);
        }
    }, [absoluteBounds]);

    const handleRiskCacheUpdate = useCallback((update: Partial<RiskAnalysisCache>) => {
        if (!clientId) return;
        setRiskAnalysisCache(prev => ({
            ...prev,
            [clientId]: { ...(prev[clientId] || {}), ...update }
        }));
    }, [clientId]);

    // Insights cache is now persistent across date changes
    // Meeting notes remain as they are tied to transcript
    // Risk analysis remains but will show a "different period" indicator in UI

    const fetchClientData = useCallback(async () => {
        if (!clientId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select(`
                    *,
                    client_family (*),
                    client_investments (
                        *,
                        investment_valuations (
                            current_value,
                            as_of_date
                        )
                    ),
                    client_insurance (
                        *,
                        insurance_valuations (
                            current_value,
                            as_of_date
                        )
                    ),
                    cashflow (
                        as_of_date,
                        employment_income_gross,
                        rental_income,
                        investment_income,
                        household_expenses,
                        income_tax,
                        insurance_premiums,
                        property_expenses,
                        property_loan_repayment,
                        non_property_loan_repayment,
                        cpf_contribution_total,
                        regular_investments,
                        total_inflow,
                        total_outflow,
                        net_position
                    )
                `)
                .eq('client_id', clientId)
                .single();

            if (error) throw error;

            if (data && user && !user.admin) {
                if (!user.userId || data.assigned_user_id !== user.userId) {
                    setClient(null);
                    setLoading(false);
                    return;
                }
            }

            if (data) {
                // Map new schema to old structure
                data.family_members_count = data.client_family?.length || 0;
                data.full_name = data.name_as_per_id;

                const mappedInvestments = (data.client_investments || []).map((inv: any) => ({
                    ...inv,
                    plan_id: inv.policy_id,
                    plan_name: inv.policy_name,
                    asset_class: inv.policy_type,
                    start_date: inv.start_date,
                    end_date: inv.expiry_date,
                    investment_valuations: (inv.investment_valuations || []).map((v: any) => ({
                        ...v,
                        market_value: v.current_value
                    }))
                }));

                const mappedInsurance = (data.client_insurance || []).map((ins: any) => ({
                    ...ins,
                    plan_id: ins.policy_id,
                    plan_name: ins.policy_name,
                    asset_class: ins.policy_type,
                    start_date: ins.start_date,
                    end_date: ins.expiry_date,
                    insurance_valuations: (ins.insurance_valuations || []).map((v: any) => ({
                        ...v,
                        cash_value: v.current_value,
                        death_benefit: ins.sum_assured || 0,
                        critical_illness_benefit: 0,
                        disability_benefit: 0
                    }))
                }));

                data.client_plans = [...mappedInvestments, ...mappedInsurance];

                const allDates: string[] = [];
                data.cashflow?.forEach((c: any) => allDates.push(c.as_of_date));
                data.client_plans.forEach((p: any) => {
                    if (p.start_date) allDates.push(p.start_date);
                    if (p.end_date) allDates.push(p.end_date);
                });

                if (allDates.length > 0) {
                    const sorted = allDates.map(d => d.substring(0, 10)).sort();
                    const today = new Date().toISOString().split('T')[0];
                    const maxDataDate = sorted[sorted.length - 1];
                    const bounds = {
                        start: sorted[0],
                        end: maxDataDate > today ? today : maxDataDate
                    };
                    setAbsoluteBounds(bounds);
                    setStartDate(bounds.start);
                    setEndDate(bounds.end);
                }

                setClient(data);
            }
        } catch (err) {
            console.error('Error fetching comprehensive client data:', err);
        } finally {
            setLoading(false);
        }
    }, [clientId, user]);

    useEffect(() => {
        fetchClientData();
    }, [fetchClientData]);

    return {
        client,
        loading,
        startDate,
        endDate,
        absoluteBounds,
        riskAnalysisCache,
        insightsMode,
        setStartDate,
        setEndDate,
        setInsightsMode,
        handleStartDateChange,
        handleEndDateChange,
        handleRiskCacheUpdate,
        handleSetMaxRange,
        refreshData: fetchClientData
    };
};
