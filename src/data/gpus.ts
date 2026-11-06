import type { Region } from "@/data/models";

export type GpuId = "h100" | "h200" | "b200";

export interface Gpu {
  id: GpuId;
  name: string;
  memoryGb: number;
  /** USD per GPU-hour, billed per second on dedicated endpoints. */
  hourly: number;
  /** Regions where dedicated replicas on this GPU can be reserved. */
  regions: Region[];
}

export const gpus: Gpu[] = [
  { id: "h100", name: "NVIDIA H100", memoryGb: 80, hourly: 2.49, regions: ["us-east", "us-west", "eu-west"] },
  { id: "h200", name: "NVIDIA H200", memoryGb: 141, hourly: 3.39, regions: ["us-east", "us-west", "eu-west"] },
  { id: "b200", name: "NVIDIA B200", memoryGb: 192, hourly: 5.49, regions: ["us-east", "us-west"] },
];

/** "H100" for "NVIDIA H100": how tables and sentences name a GPU. */
export function gpuShortName(g: Pick<Gpu, "name">): string {
  return g.name.replace(/^NVIDIA /, "");
}

export function getGpu(id: GpuId): Gpu {
  const gpu = gpus.find((g) => g.id === id);
  if (!gpu) throw new Error(`Unknown GPU: ${id}`);
  return gpu;
}
