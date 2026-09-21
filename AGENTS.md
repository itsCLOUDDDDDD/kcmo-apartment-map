# Housing website project instructions

Read README.md, docs/CURRENT-STATUS.md and docs/DATA-FLOW.md at the start of a task. Read docs/BUILD.md before builds or publication. Read docs/CHATGPT-PROJECT-INSTRUCTIONS.md for the shared handoff convention.

Use the accessible current files as evidence. Do not assume that a project chat has read every repository file, that another chat's transcript is available, or that a local folder equals the GitHub revision. Report missing access briefly and continue independent work.

The user works in the existing live Google Sheet. It is the property-data master; local workbook exports are dated inputs. The private sheet URL and private research are supplied separately, not stored in this public repository. Do not restore the older local-workbook-master workflow from historical release text.

The interface goal is a compact sheet with everyday confirmed inputs first and supporting calculations/history grouped or hidden. Preserve evidence, formulas, stable IDs, and one building row with its own units. No separate Units tab. Do not turn unknown utility/fee values into zero or claim a planning estimate is a verified amount. Preserve newer user edits.

Property facts and venue facts join by stable Property ID, Place ID and Destination ID; names and addresses are diagnostics, not join keys. Keep each unit's rent, size, availability, photos and sources with its building. Preserve public visibility boundaries: a public candidate without coordinates stays list-only, while held/private candidates stay out of the public export.

Inspect actual headers before editing; recorded column letters are snapshots. Keep unit rent, size, availability, photos and sources attributed to the same unit. Do not merge separate addresses merely because names match.

Location search links only navigate. No automatic geocoding, browser-URL capture or route fetch currently exists in this repository. Never claim it does. If implementing it, verify property identity, distinguish the pin from the map camera, and retain measured routes and source dates. Do not substitute straight-line estimates for saved walking times.

Provider retrieval is explicit-only: no timer or automatic address-edit retrieval. Preserve valid recorded time/distance even when geometry is absent, and never invent paths, steps or street summaries. Keep the frozen original 27-venue routing cohort separate from the larger browsing catalog; new destinations without saved routes remain unrouted.

Preserve the approved AI Studio React/Tailwind design and bind authoritative exported data rather than recreating demo facts or fallbacks. Planning gross is recorded unit rent plus the configured Utility planning standard once (currently $90), divided by the property's recorded 1BR payment standard for every bedroom size. Do not add a fee or official-allowance component or gate the estimate on availability/bedroom confirmation; missing inputs remain unresolved and the result is a planning estimate, not voucher approval.

Keep current work status in docs/CURRENT-STATUS.md, structural mappings in docs/DATA-FLOW.md, and operating commands in docs/BUILD.md. Update the appropriate documents when the user changes direction. Avoid maintaining competing current-status copies. Distinguish proposed, implemented, checked, and published work; never present a plan as a completed change.

This repository is public. Source code and reviewed technical documentation may be committed; private workbooks, household/eligibility records, research originals, local paths and credentials must remain outside it. Ignore rules help but are not a substitute for reviewing the actual diff.

Perform authorized work directly. For user-operated steps, give the exact app/action and one manageable step at a time, then review the result. Do not make the user assemble code or repair formulas that available tools can safely handle. Use existing access without new spending.

Do not publish just because a build passed. Follow the current request's publication scope; a push to the configured main branch can deploy the website. End with changed files, meaningful verification, remaining blockers, and the next action in plain language.
