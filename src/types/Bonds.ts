export type BondType = "-" | "=" | "#";

export interface IBond {
  bond: BondType;
  dest: number; // ID of destination Group
  smilesPosition?: number; // Position in originating smiles
}