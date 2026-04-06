import re

with open('src/components/Dashboard/Cashflow.tsx', 'r') as f:
    code = f.read()

code = re.sub(
    r'const \[visibleLines, setVisibleLines\] = useState<Record<string, boolean>>\(\{.*?\}\);',
    r'''const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
        inflow: true,
        outflow: true,
        netSurplus: true
    });''',
    code, flags=re.DOTALL
)

code = re.sub(
    r"const CASHFLOW_COLORS: Record<string, string> = \{.*?\};",
    r"""const CASHFLOW_COLORS: Record<string, string> = {
        'Inflows': '#719266', // Matches Inflow green
        'Outflows': '#9B2226' // Matches Outflow red
    };""",
    code, flags=re.DOTALL
)

code = re.sub(r'let cumulativeExpense = 0;\n        let cumulativeWealthTransfers = 0;\n        let cumulativeNetSurplus = 0;\n        let cumulativeNetCashflow = 0;', 'let cumulativeOutflow = 0;\n        let cumulativeNetSurplus = 0;', code)
code = re.sub(r'const expenseVal = parseFloat\(item\.total_expense \|\| 0\);\n            const wtVal = parseFloat\(item\.wealth_transfers \|\| 0\);\n            const surplusVal = parseFloat\(item\.net_surplus \|\| 0\);\n            const cashflowVal = parseFloat\(item\.net_cashflow \|\| 0\);', 'const outflowVal = parseFloat(item.total_outflow || 0);\n            const surplusVal = parseFloat(item.net_surplus || 0);', code)
code = re.sub(r'cumulativeExpense \+= expenseVal;\n            cumulativeWealthTransfers \+= wtVal;\n            cumulativeNetSurplus \+= surplusVal;\n            cumulativeNetCashflow \+= cashflowVal;', 'cumulativeOutflow += outflowVal;\n            cumulativeNetSurplus += surplusVal;', code)
code = re.sub(r"expense: viewMode === 'cumulative' \? cumulativeExpense : expenseVal,\n                wealthTransfers: viewMode === 'cumulative' \? cumulativeWealthTransfers : wtVal,\n                netSurplus: viewMode === 'cumulative' \? cumulativeNetSurplus : surplusVal,\n                netCashflow: viewMode === 'cumulative' \? cumulativeNetCashflow : cashflowVal,", "outflow: viewMode === 'cumulative' ? cumulativeOutflow : outflowVal,\n                netSurplus: viewMode === 'cumulative' ? cumulativeNetSurplus : surplusVal,", code)
code = re.sub(r'rawExpense: expenseVal,\n                rawWealthTransfers: wtVal,\n                rawNetSurplus: surplusVal,\n                rawNetCashflow: cashflowVal,', 'rawOutflow: outflowVal,\n                rawNetSurplus: surplusVal,', code)

code = re.sub(r"\{visibleLines\.expense &&.*?\}\n                    \{visibleLines\.wealthTransfers &&.*?\}\n                    \{visibleLines\.netSurplus &&.*?\}\n                    \{visibleLines\.netCashflow &&.*?\}", "{visibleLines.outflow && <p style={{ color: '#9B2226', fontSize: '0.9rem', margin: '4px 0' }}>{viewMode === 'cumulative' ? 'Total Outflow' : 'Outflow'}: <strong>${data.outflow.toLocaleString()}</strong></p>}\n                    {visibleLines.netSurplus && <p style={{ color: '#BC6C25', fontSize: '0.9rem', margin: '4px 0' }}>{viewMode === 'cumulative' ? 'Net Position' : 'Net Surplus'}: <strong>${data.netSurplus.toLocaleString()}</strong></p>}", code)

code = re.sub(r'<Line type="monotone" dataKey="expense".*?\/>\n                        <Line type="monotone" dataKey="wealthTransfers".*?\/>\n                        <Line type="monotone" dataKey="netSurplus".*?\/>\n                        <Line type="monotone" dataKey="netCashflow".*?\/>', '<Line type="monotone" dataKey="outflow" stroke="#9B2226" strokeWidth={1.5} dot={false} isAnimationActive={false} />\n                        <Line type="monotone" dataKey="netSurplus" stroke="#BC6C25" strokeWidth={1.5} dot={false} isAnimationActive={false} />', code)

code = re.sub(r"\{ key: 'expense', label: 'Expense', color: '#9B2226' \},\n                        \{ key: 'wealthTransfers', label: 'Wealth Transfers', color: '#3C5A82' \},\n                        \{ key: 'netSurplus', label: 'Net Surplus', color: '#BC6C25' \},\n                        \{ key: 'netCashflow', label: 'Net Cashflow', color: '#C5B358' \}", "{ key: 'outflow', label: 'Outflow', color: '#9B2226' },\n                        { key: 'netSurplus', label: 'Net Surplus', color: '#BC6C25' }", code)

code = re.sub(r"\{visibleLines\.expense && <Line type=\"monotone\" dataKey=\"expense\".*?\/>\}\n                                                \{visibleLines\.wealthTransfers && <Line type=\"monotone\" dataKey=\"wealthTransfers\".*?\/>\}\n                                                \{visibleLines\.netSurplus && <Line type=\"monotone\" dataKey=\"netSurplus\".*?\/>\}\n                                                \{visibleLines\.netCashflow && <Line type=\"monotone\" dataKey=\"netCashflow\".*?\/>\}", "{visibleLines.outflow && <Line type=\"monotone\" dataKey=\"outflow\" stroke=\"#9B2226\" strokeWidth={1.5} dot={dotStyle} activeDot={activeDotStyle} isAnimationActive={!isExporting} animationDuration={800} />}\n                                                {visibleLines.netSurplus && <Line type=\"monotone\" dataKey=\"netSurplus\" stroke=\"#BC6C25\" strokeWidth={1.5} dot={dotStyle} activeDot={activeDotStyle} isAnimationActive={!isExporting} animationDuration={800} />}", code)

code = re.sub(r"\{ key: 'expense', label: 'Expense', color: '#9B2226' \},\n                                    \{ key: 'wealthTransfers', label: 'Wealth Transfers', color: '#3C5A82' \},\n                                    \{ key: 'netSurplus', label: 'Net Surplus', color: '#BC6C25' \},\n                                    \{ key: 'netCashflow', label: 'Net Cashflow', color: '#C5B358' \}", "{ key: 'outflow', label: 'Outflow', color: '#9B2226' },\n                                    { key: 'netSurplus', label: 'Net Surplus', color: '#BC6C25' }", code)

code = re.sub(r"\{[\s\S]*?name:\s*'Expenses'[\s\S]*?\}\s*\]\s*\}\s*;", """{
                name: 'Outflows',
                items: [
                    { name: 'Household Expenses', value: data.household, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'Income Tax', value: data.tax, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'Insurance Premiums', value: data.insurance, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'Property Expenses', value: data.propertyExp, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'Property Loan', value: data.propertyLoan, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'Non-Property Loan', value: data.nonPropertyLoan, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'CPF Contributions', value: data.cpf, color: CASHFLOW_COLORS['Outflows'] },
                    { name: 'Regular Investments', value: data.regularInv, color: CASHFLOW_COLORS['Outflows'] }
                ]
            }
        ];""", code)

code = re.sub(r"onMouseEnter=\{\(\) => setActiveItemName\('Net Cashflow'\)\} onMouseLeave=\{\(\) => setActiveItemName\(null\)\}\n.*?style=\{\{.*?\n.*?background: selectedSnapshot\.netCashflow >= 0 \? 'rgba\(197, 179, 88, 0\.08\)' : 'rgba\(214, 40, 40, 0\.08\)',\n.*?borderRadius: '12px', border: `1px solid \$\{selectedSnapshot\.netCashflow >= 0 \? 'rgba\(197, 179, 88, 0\.2\)' : 'rgba\(214, 40, 40, 0\.2\)'\}`,[\s\S]*?<div style=\{\{(.*?)\}\}>Net Cashflow<\/div>\n.*?<div style=\{\{(.*?)\}\}>\$\{selectedSnapshot\.netCashflow\.toLocaleString\(\)\}<\/div>", """onMouseEnter={() => setActiveItemName('Net Surplus')} onMouseLeave={() => setActiveItemName(null)}
                            style={{
                                width: '100%', maxWidth: '320px', padding: '15px', textAlign: 'center',
                                background: selectedSnapshot.netSurplus >= 0 ? 'rgba(197, 179, 88, 0.08)' : 'rgba(214, 40, 40, 0.08)',
                                borderRadius: '12px', border: `1px solid ${selectedSnapshot.netSurplus >= 0 ? 'rgba(197, 179, 88, 0.2)' : 'rgba(214, 40, 40, 0.2)'}`,
                                opacity: activeItemName && activeItemName !== 'Net Surplus' ? 0.3 : 1, transition: '0.2s', cursor: 'pointer',
                                transform: activeItemName === 'Net Surplus' ? 'scale(1.05)' : 'scale(1)'
                            }}
                        >
                            <div style={{\\1}}>Net Surplus</div>
                            <div style={{\\2}}>${selectedSnapshot.netSurplus.toLocaleString()}</div>""", code)

with open('src/components/Dashboard/Cashflow.tsx', 'w') as f:
    f.write(code)
