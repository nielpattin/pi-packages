# Runtime diagrams

These diagrams explain how the Pi Magic Context extension fits together at runtime.

## 1. Big picture

```mermaid
flowchart LR
   Pi[Pi runtime] --> Extension[src/index.ts]
   Extension --> Config[magic-context.jsonc]
   Extension --> DB[(context.db)]
   Extension --> Tools[ctx_* tools]
   Extension --> Commands[slash commands]
   Extension --> Transform[context transform]
   Extension --> Prompt[system prompt injection]
   Extension --> Dreamer[Dreamer scheduler]

   Transform --> Tags[§N§ tags]
   Transform --> Drops[pending drops]
   Transform --> History[session-history injection]
   Transform --> Nudges[rolling nudges]
   Transform --> AutoSearch[auto-search hint]
   Transform --> HistorianTrigger[Historian trigger]

   HistorianTrigger --> Historian[Historian subagent]
   Historian --> Compartments[compartments]
   Historian --> Facts[session facts]
   Historian --> Drops

   Tools --> DB
   Commands --> DB
   Prompt --> DB
   Dreamer --> DB
```

## 2. Extension startup

```mermaid
sequenceDiagram
   participant Pi
   participant Entry as src/index.ts
   participant Config as loadPiConfig()
   participant DB as context.db
   participant Runtime as Runtime hooks

   Pi->>Entry: load extension
   Entry->>Entry: set harness = pi
   Entry->>Entry: resolve ~/.pi/agent/pi-magic-context/
   Entry->>DB: openDatabase()
   alt DB open fails
      Entry-->>Pi: log warning and register nothing
   else DB opens
      Entry->>DB: rehydrate deferred compaction markers
      Entry->>Config: read project and user magic-context.jsonc
      Config-->>Entry: config + warnings
      alt enabled=false
         Entry-->>Pi: stop registration
      else enabled
         Entry->>Runtime: register ctx tools
         Entry->>Runtime: register context transform
         Entry->>Runtime: register slash commands
         Entry->>Runtime: register status line
         Entry->>Runtime: register Dreamer schedule if configured
         Entry->>Runtime: register lifecycle hooks
      end
   end
```

## 3. Per-turn transform pipeline

```mermaid
flowchart TD
   Start[User sends message] --> Handler[registerPiContextHandler transform]
   Handler --> Transcript[Adapt Pi messages to shared transcript]
   Transcript --> Tagging[Tag eligible content with §N§]
   Tagging --> PendingDrops[Apply safe pending drops outside protected tail]
   PendingDrops --> Heuristics{Execute pass?}
   Heuristics -- yes --> Cleanup[Heuristic cleanup and materialization]
   Heuristics -- no --> CacheStable[Keep prompt cache stable]
   Cleanup --> InjectHistory[Inject session-history block]
   CacheStable --> InjectHistory
   InjectHistory --> Scheduler[Evaluate pressure and scheduler thresholds]
   Scheduler --> HistorianGate{Historian should run?}
   HistorianGate -- yes --> SpawnHistorian[Fire-and-forget Historian]
   HistorianGate -- no --> PostTransform[Post-transform helpers]
   SpawnHistorian --> PostTransform
   PostTransform --> Sticky[Sticky turn reminder]
   Sticky --> Nudge[Rolling nudge]
   Nudge --> NoteNudge[Ready note nudges]
   NoteNudge --> AutoSearch{Auto-search enabled?}
   AutoSearch -- yes --> AutoSearchFlow[Run auto-search gates]
   AutoSearch -- no --> Final[Return messages to Pi]
   AutoSearchFlow --> Final
   Final --> Model[Provider model call]
```

## 4. Auto-search trigger and gates

```mermaid
flowchart TD
   A[Transform reached post-transform stage] --> B{experimental.auto_search.enabled?}
   B -- no --> Z[Skip]
   B -- yes --> C[Find latest meaningful user message]
   C --> D{Found?}
   D -- no --> Z
   D -- yes --> E{Decision already stored for message?}
   E -- hint --> E1[Replay stored hint]
   E -- no-hint --> Z
   E -- none --> F{Strict entry IDs available?}
   F -- no --> F1[Replay only, do not create new decision]
   F -- yes --> G{Already contains augmentation or hint?}
   G -- yes --> G1[Store no-hint reason: stacked]
   G -- no --> H{Prompt length >= min_prompt_chars?}
   H -- no --> H1[Store no-hint reason: too-short]
   H -- yes --> I[Run unifiedSearch with 3s timeout]
   I --> J{Result}
   J -- error --> J1[Store no-hint reason: error]
   J -- timeout --> J2[Store no-hint reason: timeout]
   J -- empty --> J3[Store no-hint reason: empty]
   J -- top score below threshold --> J4[Store no-hint reason: below-threshold]
   J -- good match --> K[Build compact ctx-search-hint]
   K --> L[Store hint decision]
   L --> M[Append hint to user message]

   E1 --> M
   F1 --> Z
   G1 --> Z
   H1 --> Z
   J1 --> Z
   J2 --> Z
   J3 --> Z
   J4 --> Z
   M --> Done[Continue turn]
   Z --> Done
```

## 5. Historian trigger and publish flow

```mermaid
flowchart TD
   Pressure[Context pressure and event state] --> Trigger{Historian trigger?}
   Trigger -- failure recovery --> Run[Start Historian if no in-flight run]
   Trigger -- force at 80 percent --> Run
   Trigger -- proactive near execute threshold --> Run
   Trigger -- commit cluster --> Run
   Trigger -- tail-size threshold --> Run
   Trigger -- none --> NoRun[No Historian run]

   Run --> Lease{Compartment lease acquired?}
   Lease -- no --> Skip[Skip, another process owns lease]
   Lease -- yes --> ValidateExisting{Stored compartments valid?}
   ValidateExisting -- no --> Fail1[Record historian failure and stop]
   ValidateExisting -- yes --> Chunk[Read safe raw session chunk]
   Chunk --> Coverage{Chunk coverage valid?}
   Coverage -- no --> Fail2[Record historian failure and stop]
   Coverage -- yes --> Subagent[Run Historian subagent]
   Subagent --> ValidateResult{Output validates?}
   ValidateResult -- no --> Repair[Try repair/fallback path]
   Repair --> ValidateAgain{Repair validates?}
   ValidateAgain -- no --> Fail3[Record historian failure and stop]
   ValidateResult -- yes --> OptionalEditor[Optional two-pass editor]
   ValidateAgain -- yes --> OptionalEditor
   OptionalEditor --> Publish[Write compartments and facts]
   Publish --> QueueDrops[Queue drops for summarized range]
   QueueDrops --> Refresh[Signal history refresh and materialization]
   Refresh --> Done[Future transform applies updated history]
```

## 6. Emergency overflow recovery

```mermaid
flowchart TD
   MessageEnd[message_end hook] --> ErrorMessage{Assistant message has errorMessage?}
   ErrorMessage -- no --> Done[No recovery state]
   ErrorMessage -- yes --> Detect[detectOverflow check]
   Detect --> IsOverflow{Known overflow pattern?}
   IsOverflow -- no --> Done
   IsOverflow -- yes --> Record[recordOverflowDetected in session_meta]
   Record --> NextTurn[Next transform sees emergency recovery flag]
   NextTurn --> Emergency[Emergency mode]
   Emergency --> Wait[Wait up to 30s for in-flight Historian]
   Emergency --> DropAll[Apply drop-all-tools cleanup]
   Emergency --> Materialize[Materialize queued drops]
   Materialize --> Continue[Continue provider call with smaller prompt]
```

## 7. Dreamer lifecycle

```mermaid
flowchart TD
   PiRunning[Pi process running] --> Timer[Dreamer timer tick]
   Timer --> Window{Inside schedule window?}
   Window -- no --> Sleep[Wait for next tick]
   Window -- yes --> Config{Dreamer configured and not disabled?}
   Config -- no --> Sleep
   Config -- yes --> Due{Project due for dream?}
   Due -- no --> Sleep
   Due -- yes --> Lease{Acquire dream lease?}
   Lease -- no --> Busy[Record lease busy and stop]
   Lease -- yes --> Tasks[Run configured Dreamer tasks]

   Tasks --> Consolidate[consolidate]
   Tasks --> Verify[verify]
   Tasks --> Archive[archive-stale]
   Tasks --> Improve[improve]
   Tasks --> Docs[maintain-docs]

   Consolidate --> Results[Record task results]
   Verify --> Results
   Archive --> Results
   Improve --> Results
   Docs --> Results
   Results --> SmartNotes[Mark matching smart notes ready]
   SmartNotes --> Memory[Update long-term memory state]
   Memory --> Release[Release lease]
```

## 8. Smart notes

```mermaid
stateDiagram-v2
   [*] --> ActiveSessionNote: ctx_note without surface_condition
   [*] --> PendingSmartNote: ctx_note with surface_condition
   PendingSmartNote --> PendingSmartNote: Dreamer condition not met
   PendingSmartNote --> ReadySmartNote: Dreamer decides condition is met
   ReadySmartNote --> Injected: next session prompt includes ready note
   ActiveSessionNote --> Dismissed: ctx_note dismiss
   ReadySmartNote --> Dismissed: ctx_note dismiss
   Injected --> Dismissed: user/agent dismisses or resolves
```

## 9. Tool and storage flow

```mermaid
flowchart LR
   Agent[Assistant] --> Tools{ctx tools}
   Tools --> Search[ctx_search]
   Tools --> Memory[ctx_memory]
   Tools --> Notes[ctx_note]
   Tools --> Reduce[ctx_reduce]

   Search --> DB[(context.db)]
   Memory --> DB
   Notes --> DB
   Reduce --> DB

   DB --> Memories[memories]
   DB --> Facts[session facts]
   DB --> Compartments[compartments]
   DB --> Tags[tags and source contents]
   DB --> Pending[pending_ops]
   DB --> Meta[session_meta]

   Meta --> Status[/ctx-status]
   Memories --> Prompt[system prompt and history injection]
   Facts --> Prompt
   Compartments --> Prompt
   Pending --> Transform[future transform materialization]
```

## 10. `/ctx-status` overlay data flow

```mermaid
flowchart TD
   Command[/ctx-status] --> Dialog[Status dialog]
   Dialog --> Cached[Cached first paint]
   Cached --> Meta[session_meta]
   Cached --> Render1[Render immediately]
   Render1 --> Deferred[queueMicrotask full refresh]
   Deferred --> Full[buildPiStatusDetail]
   Full --> DB[(context.db)]
   Full --> Prompt[ctx.getSystemPrompt token estimate]
   Full --> Tools[Pi tool definition estimate]
   Full --> Render2[Refresh overlay]
   Render2 --> Timer[1s live refresh while open]
   Timer --> Full
```

## 11. Demo mode

```mermaid
flowchart TD
   Env{PI_MAGIC_CONTEXT_DEMO=1?} -->|no| Normal[Normal runtime]
   Env -->|yes| Demo[registerStatusDemoMode]
   Demo --> SkipDB[Skip database open]
   Demo --> SkipRuntime[Skip tools, context handler, Historian, Dreamer]
   Demo --> DemoCommand[Register demo /ctx-status]
   DemoCommand --> Controller[Fresh demo controller per invocation]
   Controller --> Overlay[Demo status overlay]
   Overlay --> Keys{Key input}
   Keys -- N --> Next[Next fixture step]
   Keys -- P --> Previous[Previous fixture step]
   Keys -- R --> Reset[Reset to first step]
   Keys -- L --> Logs[Emit fake demo logs]
   Keys -- Esc --> Close[Close overlay]
```

## 12. Failure handling map

```mermaid
flowchart TD
   Failure[Handled failure] --> Config[Config parse or schema recovery]
   Failure --> Storage[DB open or marker rehydrate warning]
   Failure --> Search[Auto-search error or timeout]
   Failure --> Historian[Historian validation, spawn, no-progress, editor fallback]
   Failure --> Overflow[Provider context overflow]
   Failure --> Dreamer[Dreamer lease busy, task failure, lease lost]
   Failure --> Transform[Sticky/nudge/note/transform helper warning]
   Failure --> Cache[Expired injection cache]

   Config --> Behavior[Warn and use defaults]
   Storage --> Behavior2[Warn and continue or fail closed]
   Search --> Behavior3[Record no-hint and continue]
   Historian --> Behavior4[Record failure and keep prior durable state]
   Overflow --> Behavior5[Set emergency recovery for next transform]
   Dreamer --> Behavior6[Record task result and continue runtime]
   Transform --> Behavior7[Log warning and keep messages usable]
   Cache --> Behavior8[Rebuild when next needed]
```
