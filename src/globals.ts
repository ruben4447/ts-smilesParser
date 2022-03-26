import type { SMILES } from "./classes/SMILES";
import type { Tabs } from "./classes/Tabs";
import { IReactionOpts } from "./types/utils";

export interface IGlobals {
  env: SMILES;
  error: Error | null;
  useHillSystem: boolean;
  canvas: HTMLCanvasElement;
  tabs: Tabs;
  reactionOpts: IReactionOpts;
}

const globals: IGlobals = {
  env: undefined,
  error: null,
  useHillSystem: true,
  canvas: undefined,
  tabs: undefined,
  reactionOpts: { addH: false, primarySide: true },
};

export default globals;