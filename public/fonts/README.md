# VOVERE display font

`vovere-display-heavy.woff2` is a self-hosted static instance of **Roboto Flex**,
licensed under SIL OFL 1.1 (see `RobotoFlex-OFL.txt`). It is not SF Pro and is not
an exact reproduction of Apple's typeface.

Source: https://github.com/googlefonts/roboto-flex/tree/main/fonts
Prepared 2026-09-27 using fontTools varLib.instancer and subset:
- wght 900, wdth 125, opsz 48; all other axes at their source defaults
- Unicode U+0020–024F, U+0400–052F, U+2000–206F, U+20AC, U+2192, U+2197
- WOFF2, approximately 25 KB
- Family/PostScript naming changed to Vovere Expanded / VovereExpanded-Heavy

The source's copyright and license metadata remain intact. The font is preloaded
from the same origin; there is no third-party request for the display face.

2026-09-27 optical refinement: C, G, c, g, comma and semicolon use outlines
from opsz 32, normalized horizontally to the original advance widths. This
opens the counters/apertures slightly without changing line metrics. All other
glyphs retain opsz 48. No outlines from Apple fonts were used.
