# Built-in asset archive

This folder is the on-drive backup of the assets that the admin asset editor previously listed as
"built in". It is deliberately not imported by the DeskCat application.

- `accessories/` contains cleanly named copies of every unique PNG that appeared in the editor.
- `manifest.json` records every former editor row and the roles each file served.
- `source-definitions/appearance.ts.txt` preserves the complete definitions for all nine CSS background
  themes.
- `source-definitions/deskcatSprite.ts.txt` preserves the original cosmetic definitions, pose mappings,
  scale, and offsets.

The original source paths are included in the manifest so an archived file can be traced back to
its previous bundled location. The archive is data only; moving files here does not make them part
of a production build.
