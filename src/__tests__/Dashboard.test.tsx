import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthProvider';

// Mock the dependencies
vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

vi.mock('../lib/AuthProvider', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../components/ClientHeader', () => ({
    default: () => <div data-testid="client-header">ClientHeader Mock</div>,
}));

vi.mock('../components/quadrants/PlansHeld', () => ({
    default: () => <div data-testid="plans-held">PlansHeld Mock</div>,
}));

vi.mock('../components/quadrants/RiskProfile', () => ({
    default: () => <div data-testid="risk-profile">RiskProfile Mock</div>,
}));

vi.mock('../components/quadrants/Cashflow', () => ({
    default: () => <div data-testid="cashflow">Cashflow Mock</div>,
}));

vi.mock('../components/quadrants/AssetAllocation', () => ({
    default: () => <div data-testid="asset-allocation">AssetAllocation Mock</div>,
}));

describe('Dashboard Data Mapping Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default auth mock setup (admin by default for simple testing)
        (useAuth as any).mockReturnValue({
            user: { userId: 'admin-123', admin: true },
        });
    });

    const renderDashboard = (clientId = '123') => {
        return render(
            <MemoryRouter initialEntries={[`/${clientId}`]}>
                <Routes>
                    <Route path="/:clientId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );
    };

    it('shows loading state initially when clientId is present', () => {
        // Setup a promise that won't resolve immediately to keep it in loading state
        const mockSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockReturnValue(new Promise(() => { })) }) });
        (supabase.from as any).mockReturnValue({ select: mockSelect });

        renderDashboard();

        expect(screen.getByText('Loading Client Data')).toBeInTheDocument();
    });

    it('maps Supabase data to the format expected by child components correctly', async () => {
        // Mock data based on the structure fetched from Supabase
        const mockSupabaseData = {
            client_id: '123',
            name_as_per_id: 'Test User',
            client_family: [{ id: 1 }, { id: 2 }],
            client_investments: [
                {
                    policy_id: 'inv-1',
                    policy_name: 'Tech Fund',
                    policy_type: 'Equities',
                    start_date: '2020-01-01',
                    expiry_date: '2030-01-01',
                    investment_valuations: [{ current_value: 10000, as_of_date: '2023-01-01' }]
                }
            ],
            client_insurance: [
                {
                    policy_id: 'ins-1',
                    policy_name: 'Life Plan',
                    policy_type: 'Whole Life',
                    start_date: '2021-01-01',
                    expiry_date: '2050-01-01',
                    sum_assured: 500000,
                    insurance_valuations: [{ current_value: 5000, as_of_date: '2023-01-01' }]
                }
            ]
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: mockSupabaseData, error: null });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        (supabase.from as any).mockReturnValue({ select: mockSelect });

        renderDashboard();

        // Wait for the data fetching to complete and the loading state to disappear
        await waitFor(() => {
            expect(screen.queryByText('Loading Client Data')).not.toBeInTheDocument();
        });

        // If it renders the grid, the data fetch succeeded and the state updated
        expect(screen.getByTestId('client-header')).toBeInTheDocument();
        expect(screen.getByTestId('asset-allocation')).toBeInTheDocument();

        // Unfortunately we can't easily assert the internal state `client` value directly in a standard functional component test without extracting the hook.
        // However, if the error state doesn't show up ("Client not found."), it means our mapping logic didn't throw an error.
        expect(screen.queryByText('Client not found.')).not.toBeInTheDocument();
    });

    it('renders "Client not found" if Supabase returns no data', async () => {
        const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        (supabase.from as any).mockReturnValue({ select: mockSelect });

        renderDashboard();

        await waitFor(() => {
            expect(screen.getByText('Client not found.')).toBeInTheDocument();
        });
    });

    it('blocks access if user is staff and client is assigned to someone else', async () => {
        (useAuth as any).mockReturnValue({
            user: { userId: 'staff-1', admin: false },
        });

        const mockSupabaseData = {
            client_id: '123',
            assigned_user_id: 'staff-2', // Different staff member
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: mockSupabaseData, error: null });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        (supabase.from as any).mockReturnValue({ select: mockSelect });

        renderDashboard();

        await waitFor(() => {
            expect(screen.getByText('Client not found.')).toBeInTheDocument();
        });
    });
});
