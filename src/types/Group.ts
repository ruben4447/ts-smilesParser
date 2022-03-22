import type { Group } from "../classes/Group";
import type { IBond } from "./Bonds";

export interface IGroupInformation {
  elements?: Map<string, number>;
  charge?: number;
  ringDigits?: number[];
  bonds?: IBond[];
  chainDepth?: number;
}

export const createGroupInfoObject = (): IGroupInformation => ({ elements: new Map(), charge: 0, ringDigits: [], bonds: [], chainDepth: 0 });

export interface IGroupMap {
  [id: number]: Group;
}