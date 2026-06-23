---
"pi-magic-context": patch
---

fix: bypass no-raw-history gate at force-80 and skip projected-post-drop gate when drops are deferred

- Force-80 trigger fires even when protected tail covers all messages
- Use proactiveTriggerPercentage for post-drop target comparison
- Prefer usageContextLimit from session_meta when larger than cache
- Skip projected-post-drop gate when scheduler defers drops
