# SMILES Syntax
SMILES stands for Simple Molecular Input Line Entry System

The following is my understanding of SMILES syntax. I have used the following links:
- https://www.daylight.com/dayhtml/doc/theory/theory.smiles.html
- https://archive.epa.gov/med/med_archive_03/web/html/smiles.html
- https://biocyc.org/help.html?object=smiles
- https://openbabel.org/wiki/Radicals_and_SMILES_extensions#SMILES_extensions_for_radicals

##  Atoms
Atoms are represented by their atomic symbol and are enclosed by square brackets `[X]`

Number of bonds withing `[]` is not enforced, unless a charge is enforced.

A charge may be speficied by `[+\-]<number>` (e.g. `[Fe+3]`) or `[+/-]` (e.g. `[Fe+++]`). CHarge may also be specified by a number in `{}` following the atom e.g. `O{-1}` = `[O-]`.

Ions may also be specified e.g. `[NH4+]` for the ammonium ion.

Atomic mass may be specified preceding the atom e.g. `[13C]` for Carbon-13. This may be part of an ion - but only the first atom may have a specified atomic mass e.g. `[13CH4]` for C-13 methane.

The wildcard `*` represents any atom.

### Organic Subset
The following elements are members of the *organic subset*. These may be specified without brackets `[X]` **only if** the number of attached atoms conforms to the following valences:
- `B` : 3
- `C` : 4,
- `N` : 3, 5
- `O` : 2
- `P` : 3, 5
- `S` : 2, 4, 6
- `F`, `I`, `Cl`, `Br` : 1

## Bonds
- `-` : Single bond. These are implicit between atoms.
- `=` : Double bond.
- `#` : Triple bond.
- `:` : Aromatic bond (only allowed in aromatic rings). Implicit in aromatic rings.

## Branches
Branches are speficied by enclosing a SMILES string in parentheses `()`

A branch's parent atom is the left-most atom in the SMILES string e.g. `C(CO)`. If a bond is the first character encountered in `()` (e.g. `C(=O)`) then this is the bond that it is connected to its parent atom by.

## Radicals
Radicals are atoms with one unpaired valence electron.

To define a radical, define the atom in an inorganic group and include a period e.g. `[Cl.]`. Radicals are rendered as normal, with a dot `•` above the group

*Note, a radical cannot have any formal charge, its bond count is not checked and no implicit Hydrogen are added.*

## Cyclic Structures
Opened by a number which indicates which ring it is. When a closing digit is reached, these two atoms bond in a ring. e.g. `C1CCC1`

SYNTAX: `<atom><digit>[<SMILES>]<atom><digit>`

Any one atom may have multiple ring digits e.g. `C12` is opening/closing rings 1 and 2. Due to this, only 10 (0-9) rings may be open at once (a unmber may be reused once the ring is closed e.g. `C1CCCC1C1CC1`).

Therefore, digits may be speficied prefixed by a percent symbol `%` e.g. `C%10` (ring 10). Multiple may be present e.g. `C%10%11` (rings 10, 11) and may be mixed e.g. `C1%10%11` (rings 1, 10, 11).

### Aromaticity
Drawn as a cycle with a circle inside of it.

- May be specified by using a ring with lower-case atoms e.g. `c1ccc1`.
    The only valid atoms in this case are: `C, N, O, P, S, As, Se`.
- May be speficied with aromatic bonds e.g. `C1:C:C:C1`

An inputted molecule may be detected as aromatic - see https://chem.libretexts.org/Bookshelves/Organic_Chemistry/Map%3A_Organic_Chemistry_(McMurry)/15%3A_Benzene_and_Aromaticity/15.03%3A_Aromaticity_and_the_Huckel_4n__2_Rule

## Disconnected Structures
Disconnected structures are seperated by a period `.` (not bonded).

Note that digited atoms still cover this gap e.g. `C1.C1` same as `CC`.

## Atom Configuration around Double Bonds
**For double bonds only**

Specify configuration around a double bond e.g. F/C=C/F and F/C=C\F

*(see link 1, section 3.3.2)*

## Chiral Specification
Signalled by an `@` character, followed by an identifier and a digit
- `@` : anticlockwise around the axis represented by the SMILES order
- `@@` : clockwise around the axis represented by the SMILES order

*(see link 1, sections 3.3.3, 3.3.4)*

## Reactions
Without Agent: `<reacant>`>>`<product>` e.g. `C=CCBr>>C=CCI`

With Agent: `<reacant>`>`<agent>`>`<product>` e.g. `C=CCBr>CC(=O)C>C=CCI`

Reactions are rended to be seperated by long arrows. Agents (if present) are surrounded by large square brackets `[]`
