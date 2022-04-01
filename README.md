# SMILES Parser

Simplified Molecular Input Line Entry System if a system for representing chemical structures (see `GRAMMAR.md`).

Testing Parser: https://doc.gdb.tools/smilesDrawer/sd/example/index_light.html

# Current Support
Listed below simplified explanations of what this SMILES engine supports in parsing. For full grammar, see `GRAMMAR.md`

## Atoms
Organic subset atoms: `[B, C, N, O, P, S, F, Cl, Br, I, *]`

Inorganic atoms in `[...]` with charges e.g. `[Au]`, `[O-]`, `[NH4+]`

### Charge Declarations
Syntax: `<item>{<charge>}`

e.g. `O{-}`, `N{-2}`, `N{--}`

May be stacked (e.g. `N{-}{-}`) or stacked with inorganic atoms (e.g. `[N-]{-}`). In this case, charges will be cumulative

### Radicals
Syntax: `[<atom>.]`

Radicals may not have any formal charge

## Bonds
Supports explicit bonds with the given bond value:
`-` (1), `=` (2), `:` (1.5) and `#` (3)

Impllicit bonds `-` are automatically inserted between atoms

Aromatic bonds `:` may only be present in rings, and makes the ring aromatic. All bonds in an aromatic ring must be `:`

## Chains
Enclosed by `(...)`

The atom/group before the `(` is the parent atom of the chain. Multiple chains may be stacked e.g. `C(Cl)(Cl)=O`

Chains may start with a bond - this is what the chain is bonded to the patent atom by e.g. `C(=O)O[H]`

## Rings
Syntax: `<atom>[[%<digits>]|<digit>]`

Opened by a number which indicates which ring it is. When a closing digit is reached, these two atoms bond in a ring. e.g. `C1CCC1`

Any one atom may support multiple ring digits. Ring digits range `0-9`, but multiple digits may be used by prefixing the rigit with `%`

### Aromaticity
Rings defined with lowercase atoms are aromatic, as are rings bonded using `:`

## Seperated Structures
Structures may be seperated by `.`. Bonds may not be greated across structures.

`.` cannot appear in a chain or a ring.

# API
Described below are key classes used in this program, with key fields outlines. See source code for more information.

## Class: `SMILES`
File: `classes/SMILES.ts`

The `SMILES` class is the SMILES parser.
- Attribute `parseOptions` provides condigurable parsing options
- Method `parse` takes a SMILES string and returns a `ParsedSMILES` object

## Class: `ParsedSMILES`
File: `classes/SMILES.ts`

The `ParsedSMILES` class is returned from `SMILES#parse` and represents parsed SMILES data
- Attribute `smiles` contains the original SMILES string
- Method `render` renders the SMILES to a canvas element
- Method `generateSMILES` generates a SMILES string from the parsed SMILES. It may not be equivalent to the original SMILES string.

## Class: `Group`
File: `classes/Group.ts`

This class represents a group of atoms
- Attribute `elements` contains a map of element symbol to its count
- Attribute `bonds` contains list of all bonds from this group
- Method `toString`, `toStringFancy`, `toStringAdv` all return string representations of this group

## Class: `Molecule`
File: `classes/Molecule.ts`

This class represents a molecule as a collection of bonded `Group`s
- Attribute `groups` maps group IDs to the corresponding `Group` class
- Attribute `rings` contains list of all rings present in a molecule
- Method `generateSMILES` returns SMILES representation of molecule
- Method `generateMolecularFormula`, `generateEmpiricalFormula` and `generateCondensedFormula` return different chemical formulae of this molecule

## Class: `Ring`
File: `classes/Ring.ts`

This class represents a cyclic ring structure
- Attribute `members` contains `Group` IDs of member groups
- Attribute `isAromatic` indicates whether ring is aromatic
- Attribute `digit` indicates the SMILES ring digit the is identified by
