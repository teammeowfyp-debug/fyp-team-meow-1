

// Shared custom tick renderer to rotate and anchor labels (TypeScript-friendly)
export const CustomizedXAxisTick = (props: any) => {
    const { x, y, payload } = props;

    let label = payload.value;
    // If the value is an ISO date string, format it for the display
    if (typeof label === 'string' && label.includes('-')) {
        const date = new Date(label);
        if (!isNaN(date.getTime())) {
            label = date.toLocaleDateString('en-SG', { month: 'short', year: '2-digit' });
        }
    }

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="end" fill="var(--text-muted)" fontSize={10} transform="rotate(-30)">
                {label}
            </text>
        </g>
    );
};
