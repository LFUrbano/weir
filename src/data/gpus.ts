export type GpuId = "h100" | "h200" | "b200";

export interface Gpu {
  id: GpuId;
  name: string;
  memoryGb: number;
  /** USD per GPU-hour, billed per second on dedicated endpoints. */
  hourly: number;
}

export const gpus: Gpu[] = [
  { id: "h100", name: "NVIDIA H100", memoryGb: 80, hourly: 2.49 },
  { id: "h200", name: "NVIDIA H200", memoryGb: 141, hourly: 3.39 },
  { id: "b200", name: "NVIDIA B200", memoryGb: 192, hourly: 5.49 },
];

export function getGpu(id: GpuId): Gpu {
  const gpu = gpus.find((g) => g.id === id);
  if (!gpu) throw new Error(`Unknown GPU: ${id}`);
  return gpu;
}
