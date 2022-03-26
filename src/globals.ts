import type { SMILES, ParsedSMILES } from "./classes/SMILES";
import type { Tabs } from "./classes/Tabs";
import { createRenderOptsObject } from "./types/SMILES";
import { IReactionOpts } from "./types/utils";

export interface IGlobals {
  env: SMILES;
  parsedSMILES: ParsedSMILES;
  error: Error | null;
  useHillSystem: boolean;
  canvas: HTMLCanvasElement;
  tabs: Tabs;
  reactionOpts: IReactionOpts;
}

const globals: IGlobals = {
  env: undefined,
  parsedSMILES: undefined,
  error: null,
  useHillSystem: true,
  canvas: undefined,
  tabs: undefined,
  reactionOpts: { addH: false, primarySide: true },
};

export default globals;