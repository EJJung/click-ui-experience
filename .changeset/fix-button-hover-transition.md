---
'@clickhouse/click-ui': patch
---

Fix the `Button` hover transition, which never applied because it referenced a token that does not exist. Hover colours now ease in over 100ms, and not at all when the user prefers reduced motion.

Visual: resting and hovered states are unchanged; only the change between them is now animated.
