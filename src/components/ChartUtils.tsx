

// Shared custom tick renderer to rotate and anchor labels (TypeScript-friendly)
export const CustomizedXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="end" fill="#555" fontSize={12} transform="rotate(-25)">
                {payload.value}
            </text>
        </g>
    );
};
