import { describe, it, expect } from 'vitest';
import { normalizeExtractedData, handleDatabaseError } from '../lib/pdfImport';
import type { PdfExtractedData } from '../lib/pdfImport';

describe('normalizeExtractedData', () => {
    it('normalizes common family relationship aliases', () => {
        const data: Partial<PdfExtractedData> = {
            client: { name_as_per_id: 'John' } as any,
            family: [
                { family_member_name: 'Jane', relationship: 'Wife', gender: 'Female', date_of_birth: '1990-01-01', age: 34 },
                { family_member_name: 'Junior', relationship: 'son', gender: 'Male', date_of_birth: '2020-01-01', age: 4 },
                { family_member_name: 'Senior', relationship: 'Father', gender: 'Male', date_of_birth: '1960-01-01', age: 64 }
            ] as any
        };

        const normalized = normalizeExtractedData(data as any);
        
        expect(normalized.family?.[0].relationship).toBe('Spouse');
        expect(normalized.family?.[1].relationship).toBe('Child');
        expect(normalized.family?.[2].relationship).toBe('Parent');
    });

    it('normalizes employment status and smoker status casing/hyphenation', () => {
        const data: Partial<PdfExtractedData> = {
            client: {
                name_as_per_id: 'John',
                employment_status: 'Full Time',
                smoker_status: 'non smoker'
            } as any
        };

        const normalized = normalizeExtractedData(data as any);
        
        expect(normalized.client?.employment_status).toBe('Full-time');
        expect(normalized.client?.smoker_status).toBe('Non-smoker');
    });

    it('sanitizes negative financial values to 0', () => {
        const data: Partial<PdfExtractedData> = {
            client: { name_as_per_id: 'John' } as any,
            cashflow: {
                employment_income_gross: 5000,
                household_expenses: -1000,
                investment_income: "-500"
            } as any,
            insurance_plans: [
                { policy_name: 'Bad Plan', sum_assured: -50000, premium_amount: "-100" }
            ] as any
        };

        const normalized = normalizeExtractedData(data as any);
        
        expect(normalized.cashflow?.household_expenses).toBe(0);
        expect(normalized.cashflow?.investment_income).toBe(0);
        expect(normalized.insurance_plans?.[0].sum_assured).toBe(0);
        expect(normalized.insurance_plans?.[0].premium_amount).toBe(0);
    });

    it('converts empty strings to null for enum fields', () => {
        const data: Partial<PdfExtractedData> = {
            client: {
                name_as_per_id: 'John',
                marital_status: '',
                gender: '  '
            } as any
        };

        const normalized = normalizeExtractedData(data as any);
        
        expect(normalized.client?.marital_status).toBeNull();
        expect(normalized.client?.gender).toBeNull();
    });
});

describe('handleDatabaseError', () => {
    it('extracts constraint name from check constraint violation', () => {
        const error = { message: 'new row for relation "clients" violates check constraint "clients_gender_check"' };
        const result = handleDatabaseError(error);
        expect(result.message).toContain('Invalid value for clients_gender_check');
    });

    it('identifies not-null constraint violations', () => {
        const error = { message: 'null value in column "name_as_per_id" violates not-null constraint' };
        const result = handleDatabaseError(error);
        expect(result.message).toContain('field "name_as_per_id" cannot be blank');
    });

    it('identifies duplicate key violations', () => {
        const error = { message: 'duplicate key value violates unique constraint "clients_id_no_key"' };
        const result = handleDatabaseError(error);
        expect(result.message).toContain('already exists');
    });
});
