# SMILES Parser

Simplified Molecular Input Line Entry System if a system for representing chemical structures (see `GRAMMAR.md`).

Testing Parser: https://doc.gdb.tools/smilesDrawer/sd/example/index_light.html

Current Support:

## Atoms
Organic subset atoms: `[B, C, N, O, P, S, F, Cl, Br, I, *]`

Inorganic atoms in `[...]` with charges e.g. `[Au]`, `[O-]`, `[NH4+]`

## Charge Declarations
Syntax: `<item>{<charge>}`

e.g. `O{-}`, `N{-2}`, `N{--}`

May be stacked (e.g. `N{-}{-}`) or stacked with inorganic atoms (e.g. `[N-]{-}`). In this case, charges will be cumulative

## Bonds
Supports explicit bonds `-`, `=` and `#`

Impllicit bonds `-` are automatically inserted between atoms