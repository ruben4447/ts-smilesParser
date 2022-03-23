import type { SMILES } from "./classes/SMILES";
import type { Tabs } from "./classes/Tabs";

export interface IGlobals {
  env: SMILES;
  error: Error | null;
  useHillSystem: boolean;
  canvas: HTMLCanvasElement;
  tabs: Tabs;
}

const globals: IGlobals = {
  env: undefined,
  error: null,
  useHillSystem: true,
  canvas: undefined,
  tabs: undefined
};

export default globals;