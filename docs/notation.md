# Exercise Notation System

This document describes the notation system used for specifying weights, reps, sets, rest periods, and effort levels in workout programs.

## Overview

All notation fields are stored as strings in the database. The notation parsers in `src/lib/notation/` provide:
- Validation (is the notation syntactically correct?)
- Parsing (convert string to structured data for UI rendering)
- Error messages (what's wrong with invalid input?)

Values are stored **unitless**. Display units (lbs/kg, RPE/RIR) are determined by user/program configuration.

## Notation Reference

### Weight

Weight values support fixed numbers, ranges, per-set values, bodyweight, and per-side (dumbbell) notation.

| Pattern | Example | Description |
|---------|---------|-------------|
| `N` | `125` | Fixed weight for all sets |
| `N,N,N` | `125,130,135` | Per-set weights |
| `N-N` | `125-135` | Weight range |
| `N ES` | `50 ES` | Per side (each side) |
| `NES` | `50ES` | Per side (no space) |
| `N E/S` | `50 E/S` | Per side (with slash) |
| `BW` | `BW` | Bodyweight only |
| `BW+N` | `BW+25` | Bodyweight + added weight |
| `BW+N-N` | `BW+20-30` | Bodyweight + weight range |
| `BW+N ES` | `BW+25 ES` | Bodyweight + per side |
| Mixed | `125-135,140,145` | Range then fixed per-set |
| Mixed | `BW,125,130` | Bodyweight then regular |

**Constraints:**
- Decimals: up to 2 places (e.g., `125.25`)
- Range: 0-2000
- Zero is allowed (for bodyweight-only exercises)
- Case-insensitive (`bw`, `BW`, `es`, `ES`, `E/S` all valid)
- Whitespace around commas is allowed (`125 , 130`)

### Reps

Rep values support fixed numbers, ranges, per-set values, and AMRAP.

| Pattern | Example | Description |
|---------|---------|-------------|
| `N` | `8` | Fixed reps for all sets |
| `N,N,N` | `12,10,8` | Per-set reps (pyramid) |
| `N-N` | `8-12` | Rep range |
| `AMRAP` | `AMRAP` | As many reps as possible |
| `N,N,AMRAP` | `10,8,AMRAP` | Fixed then AMRAP |
| `N-N,AMRAP` | `8-12,AMRAP` | Range then AMRAP |

**Constraints:**
- Integers only (no decimals)
- Range: 1-999
- Zero is not allowed
- Case-insensitive (`amrap`, `AMRAP`, `Amrap` all valid)

### Sets

Set values support fixed numbers, ranges, and AMRAP finisher notation.

| Pattern | Example | Description |
|---------|---------|-------------|
| `N` | `3` | Fixed number of sets |
| `N-N` | `3-4` | Set range |
| `N+AMRAP` | `3+AMRAP` | Fixed sets plus AMRAP finisher |

**Constraints:**
- Integers only (no decimals)
- Range: 1-99
- Zero is not allowed
- No per-set notation (sets is a count, not per-set values)
- Case-insensitive for AMRAP

### Rest

Rest values support seconds, minutes, combined, ranges, and per-set notation.

| Pattern | Example | Description |
|---------|---------|-------------|
| `Ns` | `90s` | Seconds |
| `Nm` | `2m` | Minutes |
| `NmNs` | `1m30s` | Minutes and seconds |
| `N-Nm` | `1m-2m` | Range in minutes |
| `N-Ns` | `60s-90s` | Range in seconds |
| `Nm-NmNs` | `1m-1m30s` | Range with mixed format |
| `N,N,N` | `90s,2m,2m` | Per-set rest periods |

**Constraints:**
- Integers only for time values (no `1.5m`)
- Range: 1 second to 60 minutes (3600 seconds)
- Zero is not allowed
- Case-insensitive (`m`, `M`, `s`, `S` all valid)

### Effort

Effort values are unitless numbers displayed as RPE or RIR based on configuration.

| Pattern | Example | Description |
|---------|---------|-------------|
| `N` | `8` | Fixed effort for all sets |
| `N,N,N` | `7,8,9` | Per-set effort |
| `N-N` | `7-8` | Effort range |

**Constraints:**
- Decimals: up to 2 places (e.g., `7.5`)
- Range: 0-10
- Zero is allowed (RIR 0 = failure)

**Display:**
- RPE mode: `8` displays as `@8` or `RPE 8`
- RIR mode: `8` displays as `RIR 8`

## Parser API

Each notation type has a parser module in `src/lib/notation/`:

```typescript
import { parse, validate } from '@/lib/notation/weight'

// Parse returns structured result
const result = parse('125,130,135')
// {
//   value: { values: [...], perSide: false, bodyweight: false },
//   valid: true,
//   errors: []
// }

// Validate returns boolean
const isValid = validate('125,130,135') // true
```

### ParseResult Type

```typescript
type ParseResult<T> = {
  value: T | null    // null if empty string input
  valid: boolean     // true if notation is valid
  errors: string[]   // error messages if invalid
}
```

### Empty String Handling

Empty strings are valid and return `{ value: null, valid: true, errors: [] }`. This allows optional fields to be left blank.

## Schema

Exercise rows in `convex/schema.ts` include:

```typescript
{
  kind: "exercise",
  dayId: Id<"days">,
  order: number,
  libraryExerciseId: Id<"exerciseLibrary"> | undefined,
  weight: string,      // Weight notation
  reps: string,        // Rep notation
  sets: string,        // Set notation
  rest: string | undefined,    // Rest notation (optional)
  effort: string | undefined,  // Effort notation (optional)
  notes: string,
  groupId: string | undefined,
}
```

## Agent Integration

The agent tools in `convex/tools.ts` include full notation documentation in their argument descriptions. This helps the LLM generate valid notation when creating or updating exercises.

Example from `addExerciseTool`:

```typescript
weight: z.string().describe(`Weight notation (unitless). Examples:
- Fixed: "125"
- Per-set: "125,130,135"
- Range: "125-135"
- Per side: "50 ES", "50ES", "50 E/S"
- Bodyweight: "BW", "BW+25", "BW+20-30"
Decimals up to 2 places allowed. Max 2000.`),
```

## Client-Side Validation

Import parsers from `@/lib/notation/*` to validate user input before submission:

```typescript
import { validate } from '@/lib/notation/weight'

function onCellChange(value: string) {
  if (!validate(value)) {
    // Show error indicator on cell
  }
}
```

## Future Considerations

### Configuration

Unit preferences (lbs/kg, RPE/RIR) will be stored at the program or user level. The parsers are unit-agnostic; formatting for display is handled separately.

### Tempo Notation

Tempo notation (e.g., `3-1-2-0` for eccentric-pause-concentric-pause) is not currently supported but could be added as a separate field.

### Server-Side Validation

Currently, parsers are available for validation but mutations do not enforce valid notation. This allows flexibility while the UI develops. Server-side enforcement can be added by calling validators in mutations and throwing errors for invalid input.
