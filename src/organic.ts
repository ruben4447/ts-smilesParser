import { IMoleculeType, IReactionInfo } from "./types/utils";

export const moleculeTypes: { [id: number]: IMoleculeType } = {
  1: {
    repr: "alkane",
    name: "Alkane",
    eg: { smiles: "CC", name: "ethane" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "C", bond: "-" }] }),
  },
  2: {
    repr: "alkene",
    name: "Alkene",
    eg: { smiles: "C=C", name: "ethene" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "C", bond: "=", rec: 2 }] }),
  },
  3: {
    repr: "alcohol",
    name: "Alcohol",
    eg: { smiles: "CO", name: "methanol" },
    // test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", rec: 2, bondedTo: [{ atom: "H" }] }] }),
  },
  4: {
    repr: "1-alcohol",
    name: "Primary Alcohol",
    eg: { smiles: "CO", name: "methanol" },
    variantOf: 3,
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", rec: 2, bondedTo: [{ atom: "H" }] }, { atom: ["C", "H"] }, { atom: "H" }, { atom: "H" }] }),
  },
  5: {
    repr: "2-alcohol",
    name: "Secondary Alcohol",
    eg: { smiles: "CC(O)C", name: "propan-2-ol" },
    variantOf: 3,
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", rec: 2, bondedTo: [{ atom: "H" }] }, { atom: "C" }, { atom: "C" }, { atom: "H" }] }),
  },
  6: {
    repr: "3-alcohol",
    name: "Tertiary Alcohol",
    eg: { smiles: "CC(O)(C)C", name: "2-methylpropan-2-ol" },
    variantOf: 3,
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", rec: 2, bondedTo: [{ atom: "H" }] }, { atom: "C" }, { atom: "C" }, { atom: "C" }] }),
  },
  7: {
    repr: "nitrile",
    name: "Nitrile",
    eg: { smiles: "CC#N", name: "ethanenitrile" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "N", bond: "#", rec: 2 }] }),
  },
  8: {
    repr: "amine",
    name: "Amine",
    eg: { smiles: "CN", name: "methylamine" },
    // test: mol => mol.matchMolecule({ atom: "N", rec: 1, bondedTo: [{ atom: "C", rec: 2 }, { atom: "H" }, { atom: "H" }] }),
  },
  9: {
    repr: "1-amine",
    name: "Primary Amine",
    variantOf: 9,
    eg: { smiles: "CN", name: "methylamine" },
    test: mol => mol.matchMolecule({ atom: "N", rec: 1, bondedTo: [{ atom: "C", rec: 2 }, { atom: "H" }, { atom: "H" }] }),
  },
  10: {
    repr: "2-amine",
    name: "Secondary Amine",
    variantOf: 9,
    eg: { smiles: "CNC", name: "dimethylanamine" },
    test: mol => mol.matchMolecule({ atom: "N", rec: 1, bondedTo: [{ atom: "C", rec: 2 }, { atom: "C" }, { atom: "H" }] }),
  },
  11: {
    repr: "3-amine",
    name: "Tertiary Amine",
    variantOf: 9,
    eg: { smiles: "CN(C)C", name: "trimethylamine" },
    test: mol => mol.matchMolecule({ atom: "N", rec: 1, bondedTo: [{ atom: "C", rec: 2 }, { atom: "C" }, { atom: "C" }] }),
  },
  12: {
    repr: "ketone",
    name: "Ketone",
    eg: { smiles: "CC(=O)C", name: "propan-2-one" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "C" }, { atom: "C" }] }),
  },
  13: {
    repr: "aldehyde",
    name: "Aldehyde",
    eg: { smiles: "C=O", name: "methanal" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "H" }] }),
  },
  14: {
    repr: "carboxylic-acid",
    name: "Carboxylic Acid",
    eg: { smiles: "C(=O)O", name: "methanoic acid" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "O", rec: 3, bondedTo: [{ atom: "H" }] }] }),
    removeIfPresent: [12, 13],
  },
  15: {
    repr: "hydroxynitrile",
    name: "Hydroxynitrile",
    eg: { smiles: "CC(C)(C#N)O", name: "2-hydroxy-2-methylpropanenitrile" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "C", rec: 2, bondedTo: [{ atom: "N", bond: "#" }] }, { atom: "O", rec: 3, bondedTo: [{ atom: "H" }] }, { atom: ["C", "H"] }, { atom: ["C", "H"] }] }),
    removeIfPresent: [3, 7],
  },
  16: {
    repr: "ester",
    name: "Ester",
    eg: { smiles: "C(=O)OC", name: "methyl methanoate" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "O", bondedTo: [{ atom: "C", rec: 3 }] }] }),
    removeIfPresent: [13],
  },
  17: {
    repr: "carboxylate",
    name: "Carboxylate",
    eg: { smiles: "C(=O)[O-]", name: "methanoate" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "O", rec: 3, charge: -1 }] }),
    removeIfPresent: [13],
  },
  18: {
    repr: "acyl-chloride",
    name: "Acyl Chloride",
    eg: { smiles: "C(=O)OCl", name: "methanoyl chloride" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "O", rec: 3, bondedTo: [{ atom: "Cl", rec: 4 }] }] }),
    removeIfPresent: [13],
  },
  19: {
    repr: "amide",
    name: "Amide",
    eg: { smiles: "C(=O)N", name: "methanamide" },
    removeIfPresent: [13]
  },
  20: {
    repr: "1-amide",
    name: "Primary Amide",
    eg: { smiles: "C(=O)N", name: "methanamide" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "N", rec: 3, bondedTo: [{ atom: "H" }, { atom: "H" }] }] }),
    removeIfPresent: [13, 8]
  },
  21: {
    repr: "2-amide",
    name: "Secondary Amide",
    eg: { smiles: "C(=O)NC", name: "N-methylmethanamide" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "N", rec: 3, bondedTo: [{ atom: "C" }, { atom: "H" }] }] }),
    removeIfPresent: [13, 8]
  },
  22: {
    repr: "3-amide",
    name: "Tertiary Amide",
    eg: { smiles: "C(=O)N(C)C", name: "N,N-dimethylmethanamide" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "N", rec: 3, bondedTo: [{ atom: "C" }, { atom: "C" }] }] }),
    removeIfPresent: [13, 8]
  },
  23: {
    repr: "haloalkane",
    name: "Haloalkane",
    eg: { smiles: "CBr", name: "bromomethane" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: ["F", "Cl", "Br", "I"], rec: 2 }] }),
    removeIfPresent: [1],
  },
  24: {
    repr: "acid-anhydride",
    name: "Acid Anhydride",
    eg: { smiles: "CC(=O)OC(=O)C", name: "ethanoic anhydride" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=" }, { atom: "O", bondedTo: [{ atom: "C", bondedTo: [{ atom: "O", bond: "=" }] }] }] }),
    removeIfPresent: [13, 8, 16]
  },
};

export const reactions: IReactionInfo[] = [
  {
    name: "Hydrogenation",
    start: 2,
    end: 1,
    reagents: "H2/Ni",
    conditions: "150C",
    react: (mol, groups) => {
      // Replace with single bond
      // const bond = groups[1].
    }
  },
  {
    name: "Halogenation",
    type: "electrophilic addition",
    start: 2,
    end: 23,
    reagents: "HX",
  },
  {
    name: "Halogenation",
    type: "electrophilic addition",
    start: 2,
    end: 23,
    reagents: "X2",
  },
  {
    name: "Halogenation",
    start: 1,
    end: 23,
    reagents: "X2",
    conditions: "UV",
  },
  {
    type: "nucleophilic substitution",
    start: 23,
    end: 7,
    reagents: "CN{-}/ethanol",
    conditions: "reflux"
  },
  {
    type: "nucleophilic substitution",
    start: 23,
    end: 8,
    reagents: "conc NH3/ethanol",
    conditions: "heat"
  },
  {
    name: "Reduction",
    start: 7,
    end: 8,
    reagents: "H2/Ni",
    conditions: "heat/pressure"
  },
  {
    name: "Hydration",
    start: 2,
    end: 3,
    reagents: "H2O(g)/H3PO4",
    conditions: "heat/pressure"
  },
  {
    name: "Dehydration",
    start: 3,
    end: 2,
    reagents: "conc H3PO4"
  },
  {
    name: "Oxidation",
    start: 5,
    end: 12,
    reagents: "K2Cr2O7/H2SO4",
    conditions: "reflux"
  },
  {
    name: "Reduction",
    start: 12,
    end: 5,
    reagents: "NaBH4 or AlLiH4",
    conditions: "ethanol or dry ether"
  },
  {
    name: "Oxidation",
    start: 4,
    end: 13,
    reagents: "K2CR2O7/H2SO4",
    conditions: "distill"
  },
  {
    name: "Reduction",
    start: 13,
    end: 4,
    reagents: "NaBH4 or AlLiH4",
    conditions: "ethanol or dry ether"
  },
  {
    name: "Oxidation",
    start: 4,
    end: 14,
    reagents: "K2Cr2O7/H2SO4",
    conditions: "reflux"
  },
  {
    type: "nucleophilic addition",
    start: 12,
    end: 15,
    reagents: "NaCN(aq)/H{+}(aq)",
  },
  {
    name: "Hydrolysis",
    start: 7,
    end: 14,
    reagents: "H2O/HCl",
  },
  {
    name: "Hydrolysis",
    start: 15,
    end: 14,
    reagents: "H2O/HCl",
  },
  {
    name: "Esterification",
    start: 3,
    end: 16,
    reagents: "Carboxylic acid/conc H2SO4 or acid anhydride",
    conditions: "50C"
  },
  {
    name: "Esterification",
    start: 14,
    end: 16,
    reagents: "alcohol/conc H2SO4",
    conditions: "50C"
  },
  {
    name: "Hydrolysis",
    start: 16,
    end: 14,
    reagents: "dil HCl",
    conditions: "reflux"
  },
  {
    name: "Base Hydrolysis",
    start: 16,
    end: 17,
    reagents: "dil HCl",
    conditions: "reflux"
  },
  {
    name: "Reduction",
    start: 14,
    end: 4,
    reagents: "LiAlH4/HCl",
    conditions: "dry ether"
  },
  {
    start: 14,
    end: 18,
    reagents: "SOCl2",
  },
  {
    name: "Esterification",
    start: 18,
    end: 16,
    reagents: "alcohol",
    conditions: "cold",
  },
  {
    start: 18,
    end: 14,
    reagents: "H2O",
  },
  {
    start: 18,
    end: 20,
    reagents: "NH3",
  },
  {
    start: 18,
    end: 21,
    reagents: "primary amine",
  },
  {
    name: "Dehydration",
    start: 14,
    end: 24,
    reagents: "carboxylic acid or acid chloride/NaOH",
  },
  {
    start: 9,
    end: 4,
    reagents: "HNO2",
  },
  // Start again at Reaction ID 28
];