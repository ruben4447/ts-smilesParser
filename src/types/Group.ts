import type { IBond } from "./Bonds";

export interface IGroupInformation {
  elements?: string[];
  charge?: number;
  ringDigits?: number[];
  bonds?: IBond[];
}

export const createGroupInfoObject = (): IGroupInformation => ({ elements: [], charge: 0, ringDigits: [], bonds: [] });