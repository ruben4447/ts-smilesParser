export interface IAtomCount {
  atom: string;
  charge: number;
  count: number;
}

export interface IParseOptions {
  cumulativeCharge?: boolean; // Allow O{-}{-}
}

export const createParseOptionsObject = (): IParseOptions => ({
  cumulativeCharge: true,
});

export interface IElementToIonMap {
  [element: string]: IAtomCount[];
}