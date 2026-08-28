# UrbanFox ILR Brand and Colour Guidelines

## Visual direction

UrbanFox ILR uses a modern, professional monochrome interface. The product
should feel calm, trustworthy, precise, and contemporary.

The interface itself uses only white, near-black, and neutral greys. **Freddy
the Urban Fox is the only full-colour element.** His natural fox colouring
creates warmth and personality without making the immigration information feel
casual or decorative.

## Interface palette

| Token | Hex | Intended use |
| --- | --- | --- |
| `--colour-canvas` | `#FFFFFF` | Main page and app background |
| `--colour-surface` | `#F7F7F5` | Cards, grouped controls, and quiet panels |
| `--colour-surface-strong` | `#EFEFED` | Selected or raised neutral surfaces |
| `--colour-border` | `#D8D8D4` | Dividers, input borders, and card outlines |
| `--colour-text-muted` | `#62625E` | Secondary text and supporting metadata |
| `--colour-text` | `#111111` | Primary text |
| `--colour-strong` | `#000000` | Primary actions and highest emphasis |
| `--colour-on-strong` | `#FFFFFF` | Text and icons on black controls |

These values are the initial design tokens. Every text and interactive
combination must still be tested against the applicable WCAG contrast
requirement during implementation.

## Freddy’s reserved palette

Freddy should use a realistic but polished UK red-fox palette:

| Freddy colour | Hex | Intended use |
| --- | --- | --- |
| Urban fox orange | `#C65A24` | Main coat |
| Deep rust | `#7A2F1B` | Legs, ear edges, and shaded fur |
| Warm cream | `#EEC895` | Chest, cheeks, and tail detail |
| Soft fur white | `#FFF8EE` | Lightest fur areas |
| Fox charcoal | `#211A17` | Eyes, nose, paws, and line detail |
| Inner-ear warmth | `#C98276` | Restrained anatomical detail |

These colours are reserved for Freddy artwork. They must not be reused for
buttons, links, progress bars, charts, badges, page backgrounds, focus states,
or decorative interface accents.

Final asset colours may be adjusted slightly when Freddy is illustrated, but
the character must remain recognisably consistent across expressions,
animations, icons, and screen sizes.

## Component rules

- Primary buttons use a black background with white text.
- Secondary buttons use white or a neutral surface with a black border.
- Links use underlining, weight, or an arrow—not a new colour.
- Cards use white or neutral-grey surfaces with restrained borders.
- Shadows should be subtle and neutral; borders should provide most hierarchy.
- Selected states use contrast, border weight, icons, or shape rather than
  colour.
- Focus indicators use a clearly visible monochrome outline and must remain
  distinguishable from ordinary borders.
- Charts use patterns, line styles, direct labels, and greyscale values.
- Success, warning, error, and manual-review messages use an explicit label,
  recognisable icon, heading, and border treatment.
- No state may rely on colour alone.
- Avoid gradients, glass effects, neon accents, or decorative colour washes.
- Freddy must not appear behind form text, legal warnings, calculations, or PIN
  controls.

## Typography and spacing

Use a clean modern sans-serif typeface with a reliable system-font fallback.
Typography should create hierarchy through size, weight, spacing, and alignment
rather than colour.

Use generous white space, compact mobile cards, consistent corner radii, and
large touch targets. The app should resemble a considered native mobile utility,
not a marketing landing page.

## Freddy’s role in the interface

Freddy may appear in onboarding, empty states, explanations, celebrations, and
optional help. He should normally occupy a contained illustration area so his
colour does not compete with the working interface.

Freddy must not:

- replace an icon needed to understand a status
- be the sole source of an instruction
- cover or interrupt critical information
- turn refusal-risk or legal-warning states into playful moments
- imply government, Home Office, or UKVI affiliation
- provide a definitive statement of immigration eligibility

Every Freddy visual cue needs an equivalent accessible text explanation.
Animation must respect reduced-motion settings and should stop during PIN entry,
long forms, critical warnings, and calculation review.
