# Alpha Testing Prep Tracker

This document is an informal working list for items we want to clean up, refine, or begin before MathFlash enters alpha testing.

## How To Use

- Keep this list lightweight and practical.
- Update item status as work becomes clearer.
- Add notes, owners, links, or follow-up questions directly under the relevant item.
- Add new items to the bottom of the current list or create a new section if a theme emerges.

## Status Key

- `Not started`
- `Exploring`
- `In progress`
- `Blocked`
- `Done`

## Current Prep List

1. `Not started` App display in mobile device browsers, including areas above/below SafeView
   Notes:
   - Check browser chrome overlap and usable viewport behavior on mobile web.

2. `Not started` Flash card animation (flip) between problems
   Notes:
   - Define desired motion, timing, and whether animation should differ by platform.

3. `Not started` Keypad button height, and possibly width
   Notes:
   - Confirm tap comfort on mobile and layout balance across screen sizes.

4. `Not started` Restyle operation selector, and possibly relocate it
   Notes:
   - Revisit both appearance and placement together so layout decisions stay coordinated.

5. `Not started` Confirm all SVG path definitions are current
   Notes:
   - Cross-check against the latest source path definitions and any shadow variants.

6. `Not started` Consider a triad-centric app name and/or tagline
   Notes:
   - Keep branding ideas separate from any final rename decision until product direction is firmer.
   - Names to consider: triadmath or triadmathfacts

7. `Not started` Change session reports to tenths-of-a-second values instead of milliseconds
   Notes:
   - Confirm display-only change vs. data-model change.

8. `Not started` Add an accuracy-vs-speed (efficiency) graph to the session report, with target zones
   Notes:
   - Define efficiency formula and what target zones should communicate to the user.

9. `Not started` Begin historical session data collection/presentation, such as time-vs-efficiency graphing
   Notes:
   - Start with data shape and storage decisions before polishing the UI.

10. `Not started` Settings options, layout, and animation
    Notes:
    - Clarify which settings are needed for alpha vs. later releases.

11. `Not started` Session report access (icon/menu/location)
    Notes:
    - Decide whether reports should be persistent, in-session only, or accessible from multiple entry points.

12. `Not started` Begin development on user login
    Notes:
    - Scope first milestone tightly for alpha if login is needed at all.

13. `Not started` Brainstorm freemium app release model, features, and pricing
    Notes:
    - Product strategy item; can stay exploratory until core experience is validated.

14. `Not started` Brainstorm next features after initial release
    Notes:
    - Keep future-facing ideas separate from alpha blockers when prioritizing.

## New Items

Add new prep items here as they come up.

1. `Not started` Define freemium strategy and features/settings
   Notes:
   - Consider the following strategy for the first production release:
     `Strategy` Offer premium features for a trial period (10 days?) upon free download (with no login required).

     `Free (single device, no login required)` Basic 1-9 digit selection for fact sets, keypad-only answer input, shareable simplified current session report (date, time, fact set (fact count only), session cycles, total session facts, facts completed, first-attempt correct count+percentage, first-attempt missed count+percentage, list of first-attempt missed facts (standard form only), average correct-fact speed (all facts), average correct-first-attempt-fact speed, average missed first-attempt-fact speed), session performance grade level equivalent.

     `Premium (multiple devices(number???), login required)` Free features, plus custom problem sets, traditional horizontal and vertical problem layout options, voice input, detailed session reports and analysis (including lists of all session facts), recent session history (limit to how many?), intentional performance assessment sessions (for consistent performance assessment and recommendations), AI generated session settings (problems, cycles, standard/random options, etc.) based on the most recent intentional performancee assessment and/or recent session history.

2. `Not started` 
   Notes:
   - Create a simple animated tutorial and app walkthrough to demonstrate/explain the triad math fact learning philosophy and app features/settings.


## Decision Notes

Use this section for short decisions we want to preserve without turning the prep list into a long narrative.

- No decisions recorded yet.
