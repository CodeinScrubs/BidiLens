<!-- SPDX-License-Identifier: Apache-2.0 -->
# Trojan Source and Bidirectional Security Guide

## Overview

In 2021, Cambridge University researchers disclosed **Trojan Source** (tracked under **CVE-2021-42574** and **CVE-2021-42694**), a vulnerability class where attackers use invisible Unicode bidirectional formatting characters to visually manipulate source code or displayed text.

Compilers and interpreters parse code in logical character order, but code editors and web browsers render text according to the Unicode Bidirectional Algorithm (UAX #9). By injecting directional controls such as `U+202E` (RIGHT-TO-LEFT OVERRIDE) or `U+202B` (RIGHT-TO-LEFT EMBEDDING), an adversary can make dangerous code appear benign or commented out to human reviewers.

---

## Dangerous Control Characters

BidiLens classifies 18 bidirectional formatting characters into risk categories:

| Code Point | Name | Abbr | Risk Level | Threat Scenario |
|---|---|:---:|:---:|---|
| `U+202E` | RIGHT-TO-LEFT OVERRIDE | RLO | High | Reverses characters following it, spoofing file extensions or hiding code |
| `U+202D` | LEFT-TO-RIGHT OVERRIDE | LRO | High | Overrides natural RTL text flow |
| `U+202B` | RIGHT-TO-LEFT EMBEDDING | RLE | High | Embeds RTL sub-string with inherited levels |
| `U+202A` | LEFT-TO-RIGHT EMBEDDING | LRE | High | Embeds LTR sub-string |
| `U+2066`..`U+2068` | DIRECTIONAL ISOLATES | LRI/RLI/FSI | Medium | Isolates bidirectional runs; dangerous if unbalanced |
| `U+206A`..`U+206F` | DEPRECATED CONTROLS | ISS/ASS/... | Medium | Ancient shaping and digit controls |

---

## Defenses in BidiLens

### 1. Security Scanner (`scanBidiSecurity`)

The `scanBidiSecurity` function detects all 18 control characters, unbalanced control pairs, and hidden joiners:

```ts
import { scanBidiSecurity } from '@bidilens/core';

const report = scanBidiSecurity(untrustedUserInput, { mode: 'warn' });
if (report.shouldBlock) {
  console.warn('Suspicious bidirectional controls detected:', report.findings);
}
```

### 2. Sanitizer (`sanitizeBidiControls`)

Strip or normalize controls safely without altering surrounding natural language prose:

```ts
import { sanitizeBidiControls } from '@bidilens/core';

const { text: cleanText, removed } = sanitizeBidiControls(untrustedUserInput);
```
