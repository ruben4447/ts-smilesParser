import type { Group } from "../classes/Group";
import type { IBond } from "./Bonds";

export interface IGroupInformation {
  elements?: string[];
  charge?: number;
  ringDigits?: number[];
  bonds?: IBond[];
  chainDepth?: number;
}

export const createGroupInfoObject = (): IGroupInformation => ({ elements: [], charge: 0, ringDigits: [], bonds: [], chainDepth: 0 });

export interface IGroupMap {
  [id: number]: Group;
}