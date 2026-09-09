# mathflash™ — Current State

## Purpose

mathflash™ is a cross-platform arithmetic-fluency app intended to help students memorize basic arithmetic facts involving digits 1–9. It is intended to run on the web and as a standalone app on iPhone and Android.

The immediate goal is to complete and ship the **first reliable production version** without unnecessary redesign or architectural churn.

## Current Technology

* React Native / Expo
* Expo Web for browser deployment
* GitHub repository as the authoritative source
* GitHub Pages currently used for web deployment
* Development performed primarily in VS Code
* Codex used within VS Code for repository inspection, editing, testing, and implementation
* Git used for version control, feature branches, review, and rollback

The local development repository is `~/linux_projects/mathflash`.

## Core Application Model

The canonical arithmetic model uses **single-digit facts involving digits 1–9**.

The app supports:

* Addition and multiplication fact practice
* Operation selection
* Problem-order selection
* Operand-order selection
* Missing-value selection
* Custom digit sets using 1–9 controls
* Multiple practice cycles
* Randomized problem presentation

The underlying fact structure has historically been based on **45 unordered operand pairs/triads per operation**, with presentation behavior determining operand order and missing-value position.

## Speech Input

Speech recognition has been a major development area.

Two approaches have been investigated:

### Web Speech API

The existing app has used browser speech recognition and has encountered behavior including:

* interim and final recognition results
* empty final results
* duplicate recognition tokens
* malformed/time-like recognition strings
* negative values
* stitched digits
* recognition latency that cannot always be distinguished from student response latency

Numeric recognition is intended to accept only valid spoken values in the range **0–99**.

### Whisper / whisper.cpp

A local `whisper.cpp` implementation has also been explored as a possible alternative to Web Speech.

The repository currently contains an archived `whisper.cpp` checkout under:

`archive/whisper.cpp`

Whisper/VAD work should presently be treated as **experimental unless the active repository demonstrates otherwise**.

## Timing / Performance Measurement

The app has included detailed timing instrumentation around problem presentation and spoken responses.

An important measurement has been:

`CURR_PROB → REC_RES`

This has been used to estimate the interval between presenting a problem and receiving recognition output.

Historical work attempted to distinguish approximately:

* reading/perception time
* calculation time
* speech-recognition delay

Any timing implementation currently in production code should be verified directly from the repository before relying on archived definitions.

## UI / UX

The interface has been designed in Figma and implemented through React Native / Expo.

Design work has included:

* reusable component variants
* keypad controls
* text/icon state properties
* responsive web/mobile behavior
* Safari-specific rendering investigation
* controlled transitions between arithmetic problems

UI behavior should be preserved unless there is a production reason to change it.

## Deployment

The web version has historically been exported and deployed using:

```bash
npx expo export --platform web
npx gh-pages --nojekyll -d dist
```

Expo has been configured for the GitHub Pages base path `/mathflash/`.

Deployment behavior and configuration should be revalidated before the first production release rather than assumed current.

## Archived / Experimental Areas

The following should **not automatically be treated as active production architecture**:

* Whisper experiments
* VAD experiments
* speech-capture diagnostic harnesses
* historical logging experiments
* abandoned recognition heuristics
* old branches and prototypes
* archived implementation discussions

These may be consulted when useful, but should only be brought forward deliberately.

## Development Workflow

The authoritative implementation state is the **current Git repository**, not ChatGPT conversation history.

The intended workflow is:

**ChatGPT Project**

* architecture
* roadmap
* technical analysis
* debugging interpretation
* design decisions
* production planning
* concise prompts for Codex

**Codex in VS Code**

* inspect actual repository
* implement changes
* run commands/tests
* produce diffs
* verify implementation behavior

**Git**

* authoritative history
* branches
* review
* rollback

A change discussed in ChatGPT should not be considered implemented until confirmed in the repository.

## Production Principles

For the first production release:

* Preserve existing working behavior.
* Prefer minimal targeted changes.
* Avoid speculative refactoring.
* Verify repository reality before relying on historical assumptions.
* Fix production blockers before improving architecture.
* Test web and mobile-relevant behavior.
* Maintain clear Git checkpoints.
* Keep debugging evidence sufficient to diagnose failures.
* Distinguish required-v1 work from post-v1 improvements.

## Immediate Next Objective

Perform a **fresh repository-based production-readiness assessment** to establish:

1. what the current code actually does,
2. current dependencies and versions,
3. build/deployment status,
4. active speech-recognition architecture,
5. known or discoverable production blockers,
6. obsolete/archive material that can be ignored,
7. the shortest reliable path to a v1 production release.

No significant code changes should be made solely on the basis of this document; Codex should verify the relevant implementation in the repository first.
