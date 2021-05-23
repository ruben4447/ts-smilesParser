import type { Environment } from "./classes/Environment";

export interface IGlobals {
  env: Environment;
  error: Error | null;
  useHillSystem: boolean;
  canvas: HTMLCanvasElement;
}

const globals: IGlobals = {
  env: undefined,
  error: null,
  useHillSystem: true,
  canvas: undefined,
};

export default globals;