# subagent-result-display Specification

## Purpose

TBD - created by archiving change show-full-get-subagent-result. Update Purpose after archive.

## Requirements

### Requirement: get_subagent_result exposes only retrieval controls

The `get_subagent_result` tool SHALL expose only the controls needed to identify a background agent and optionally wait for completion.

#### Scenario: Tool schema omits verbose

- **WHEN** the `get_subagent_result` tool definition is created
- **THEN** its parameter schema MUST include `agent_id` and optional `wait`
- **AND** its parameter schema MUST NOT include `verbose`

#### Scenario: Result retrieval does not append conversation transcript

- **WHEN** `get_subagent_result` retrieves a completed agent result
- **THEN** the returned tool content MUST include the agent status summary and retrieved result text
- **AND** the returned tool content MUST NOT append an `--- Agent Conversation ---` section

### Requirement: Expanded get_subagent_result shows complete result text

The `get_subagent_result` tool SHALL render the complete returned result text when its tool row is expanded.

#### Scenario: Expanded view renders more than fifty result lines

- **WHEN** `get_subagent_result` returns result text with more than 50 lines
- **AND** the tool row is rendered with `expanded` set to true
- **THEN** the rendered output MUST include lines after line 50
- **AND** the rendered output MUST NOT include an overflow hint

#### Scenario: Expanded view renders no verbose hint

- **WHEN** `get_subagent_result` renders an expanded completed result
- **THEN** the rendered output MUST NOT instruct the user to use `get_subagent_result` with `verbose`

### Requirement: Collapsed get_subagent_result remains compact

The `get_subagent_result` tool SHALL keep collapsed result rendering compact.

#### Scenario: Collapsed completed result hides result body

- **WHEN** `get_subagent_result` returns a completed result
- **AND** the tool row is rendered with `expanded` set to false
- **THEN** the rendered output MUST show a compact completion summary
- **AND** the rendered output MUST NOT include the full result body

#### Scenario: Running result remains a status view

- **WHEN** `get_subagent_result` retrieves an agent that is still running
- **THEN** the rendered output MUST show running status information
- **AND** the rendered output MUST NOT show a completed result body
