---
"pi-magic-context": patch
---

fix: bypass no-raw-history gate at force-80, fix proactive trigger for large-context models, and skip projected-post-drop gate when drops are deferred

- Proactive trigger caps at ~171K tokens for models > 272K context
- Force-80 trigger fires even when protected tail covers all messages
- Use proactiveTriggerPercentage for post-drop target comparison
- Prefer usageContextLimit from session_meta when larger than cache
- Skip projected-post-drop gate when scheduler defers drops
