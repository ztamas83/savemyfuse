export interface PhaseDataProps {
  phase_id: string;
  mapped_phase: string;
  target_current: number;
  samples: number[];
}
export function PhaseDataGrid(phaseDataProps: PhaseDataProps) {
  console.log("PhaseDataProps:", phaseDataProps);
  return (
    <>
      <div className="flex flex-col gap-2 p-3 bg-white rounded shadow">
        <h1 className="font-bold mr-2">
          {phaseDataProps.phase_id} ({phaseDataProps.mapped_phase.toUpperCase()}
          ) - Target Current: {phaseDataProps.target_current}A
        </h1>
        <div className="flex flex-col items-center">
          <h2>Samples:</h2>
          {phaseDataProps.samples.map((sample, index) => (
            <div
              key={index}
              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded"
            >
              {sample.toFixed(1)}A
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
