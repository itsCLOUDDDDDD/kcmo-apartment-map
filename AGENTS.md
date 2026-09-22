# Housing website project instructions

Read README.md, docs/CURRENT-STATUS.md and docs/DATA-FLOW.md at the start of a task. Read docs/BUILD.md before builds or publication. Read docs/CHATGPT-PROJECT-INSTRUCTIONS.md for the shared handoff convention.

Use the accessible current files as evidence. Do not assume that a project chat has read every repository file, that another chat's transcript is available, or that a local folder equals the GitHub revision. Report missing access briefly and continue independent work.

The user works in the existing live Google Sheet. It is the property-data master; local workbook exports are dated inputs. The private sheet URL and private research are supplied separately, not stored in this public repository. Do not restore the older local-workbook-master workflow from historical release text.

Shared technical instructions and progress live here. The approved frontend source and private context live in the confirmed-private `itsCLOUDDDDDD/aistudio` repository; retrieve personal preferences only when relevant from `docs/HOUSING-CONTEXT.md` and dated private research workflow from `docs/PROJECT-MEMORY.md` on its current branch. Those files are outside the Vite build and must never be copied into this public repository or website assets. Research Markdown and handoffs are dated evidence, not automatically applied Sheet values.

The interface goal is a compact sheet with everyday confirmed inputs first and supporting calculations/history grouped or hidden. Preserve evidence, formulas, stable IDs, and one building row with its own units. No separate Units tab. Do not turn unknown utility/fee values into zero or claim a planning estimate is a verified amount. Preserve newer user edits.

Inspect actual headers before editing; recorded column letters are snapshots. Keep unit rent, size, availability, photos and sources attributed to the same unit. Do not merge separate addresses merely because names match.

For housing research, retain a candidate with even one evidenced income-restricted unit; a task focused on LIHTC has that narrower scope only for that task. Original discovery evidence remains relevant when a current site is silent. Keep program participation, restriction scope, HCV treatment, vacancy and application approval separate. Match research to the existing Property ID and street address/ZIP/building or phase before proposing Sheet changes; hold ambiguous identities. District boundaries alone do not prove TIF, PIEA, Chapter 353 or other property-level incentives. Record exact sources, dates, project scope, stage and conflicts. Do not turn TIF, PIEA, Chapter 353 or historic tax credits into LIHTC or voucher conclusions.

The approved planning comparison is (recorded rent + configured utility planning setting once) / the property's recorded 1BR payment standard for every apartment size. Missing rent, setting or positive standard leaves the result unresolved. Fees, official utility allowances and bedroom verification are separate evidence, not gates for this estimate; do not change the configured setting from a reference schedule without an explicit decision. See docs/DATA-FLOW.md.

Location search links only navigate. No automatic geocoding, browser-URL capture or route fetch currently exists in this repository. Never claim it does. If implementing it, verify property identity, distinguish the pin from the map camera, and retain measured routes and source dates. Do not substitute straight-line estimates for saved walking times.

Keep current work status in docs/CURRENT-STATUS.md, structural mappings in docs/DATA-FLOW.md, and operating commands in docs/BUILD.md. Update the appropriate documents when the user changes direction. Avoid maintaining competing current-status copies. Distinguish proposed, implemented, checked, and published work; never present a plan as a completed change.

This repository is public. Source code and reviewed technical documentation may be committed; private workbooks, household/eligibility records, research originals, local paths and credentials must remain outside it. Ignore rules help but are not a substitute for reviewing the actual diff.

Perform authorized work directly. For user-operated steps, give the exact app/action and one manageable step at a time, then review the result. Do not make the user assemble code or repair formulas that available tools can safely handle. Use existing access without new spending.

Do not publish just because a build passed. Follow the current request's publication scope; a push to the configured main branch can deploy the website. End with changed files, meaningful verification, remaining blockers, and the next action in plain language.
