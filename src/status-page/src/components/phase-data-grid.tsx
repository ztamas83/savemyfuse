import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import { GaugeComponent } from "react-gauge-component";

export interface PhaseDataProps {
  phase_id: string;
  mapped_phase: string;
  target_current: number;
  samples: number[];
  charger_target: number;
  last_update?: Timestamp;
}

const SamplesBarChart = ({ samples }: { samples: number[] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!samples || samples.length === 0) return null;

  const height = 120;
  const width = 320;

  const marginLeft = 35; // Space for labels "16", "Ampere"
  const marginTop = 10;
  const marginBottom = 5;
  const marginRight = 5;

  const drawHeight = height - marginTop - marginBottom;
  const drawWidth = width - marginLeft - marginRight;

  const maxVal = Math.max(16, ...samples);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Grid lines and Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const val = tick * maxVal;
          // tick 0 -> bottom -> y = marginTop + drawHeight
          // tick 1 -> top -> y = marginTop
          const y = marginTop + drawHeight - tick * drawHeight;

          return (
            <g key={tick}>
              {/* Grid line */}
              <line
                x1={marginLeft}
                y1={y}
                x2={width - marginRight}
                y2={y}
                stroke={tick === 0 ? "#e5e7eb" : "#f3f4f6"}
                strokeWidth="1"
                strokeDasharray={tick === 0 ? "" : "2 2"}
              />
              {/* Y-axis Label */}
              <text
                x={marginLeft - 6}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] fill-gray-400 font-mono"
              >
                {val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Y Axis Title */}
        <text
          x={10}
          y={height / 2}
          transform={`rotate(-90, 10, ${height / 2})`}
          textAnchor="middle"
          className="text-[10px] fill-gray-500 font-semibold"
        >
          Ampere
        </text>

        {/* Bars */}
        {samples.map((val, i) => {
          const barH = (val / maxVal) * drawHeight;

          const slotWidth = drawWidth / samples.length;
          const gap = Math.min(2, slotWidth * 0.2);
          const barW = Math.max(1, slotWidth - gap);

          const x = marginLeft + i * slotWidth + gap / 2;
          const y = marginTop + drawHeight - barH;

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={barH}
              className="fill-blue-400 hover:fill-blue-600 transition-colors"
              rx={1}
              onMouseEnter={() => setHoveredIndex(i)}
            />
          );
        })}

        {/* Custom Tooltip */}
        {hoveredIndex !== null && (
          <g pointerEvents="none">
            {(() => {
              const val = samples[hoveredIndex];
              const barH = (val / maxVal) * drawHeight;
              const slotWidth = drawWidth / samples.length;
              const gap = Math.min(2, slotWidth * 0.2);
              const barW = Math.max(1, slotWidth - gap);

              const x =
                marginLeft + hoveredIndex * slotWidth + gap / 2 + barW / 2;
              const y = marginTop + drawHeight - barH - 8;

              return (
                <g transform={`translate(${x}, ${y})`}>
                  <rect
                    x="-20"
                    y="-18"
                    width="40"
                    height="18"
                    rx="4"
                    fill="#1f2937"
                    opacity="0.9"
                  />
                  <text
                    x="0"
                    y="-5"
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                    className="font-mono"
                  >
                    {val.toFixed(1)}A
                  </text>
                  <path d="M -4 0 L 4 0 L 0 4 Z" fill="#1f2937" opacity="0.9" />
                </g>
              );
            })()}
          </g>
        )}
      </svg>
    </div>
  );
};

export function PhaseDataGrid(phaseDataProps: PhaseDataProps) {
  return (
    <>
      <div className="flex flex-col gap-2 p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center pb-2 border-b border-gray-50">
          <h1 className="font-bold text-lg text-gray-700">
            {phaseDataProps.mapped_phase.toUpperCase()}
          </h1>
          <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
            {phaseDataProps.phase_id}
          </span>
        </div>

        <GaugeComponent
          value={phaseDataProps.target_current}
          maxValue={16}
          pointer={{ type: "arrow", elastic: true }}
          minValue={0}
          type="radial"
          arc={{
            gradient: true,
            width: 0.15,
            padding: 0,
            subArcs: [
              {
                limit: 4,
                color: "#ff4000",
                showTick: true,
              },
              {
                limit: 8,
                color: "#F5CD19",
                showTick: true,
              },
              {
                limit: 12,
                color: "#bfff00",
                showTick: true,
              },
              {
                limit: 16,
                color: "#009900",
                showTick: false,
              },
              { color: "#ff4000" /* remainder */ },
            ],
          }}
        />

        {phaseDataProps.last_update && (
          <div className="text-center text-xs text-gray-400 mb-2 mt-4">
            Last update: {phaseDataProps.last_update.toDate().toLocaleString()}
          </div>
        )}

        <div className="flex flex-col items-center mt-3 w-full px-2">
          <SamplesBarChart samples={phaseDataProps.samples} />
        </div>
      </div>
    </>
  );
}
