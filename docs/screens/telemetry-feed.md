# Telemetry Feed Component

`TelemetryFeed` tails contract events from Soroban RPC:

- Queries `getEvents` with `event_auth_checked` topic filter.
- Decodes contract addresses, decision results (`allowed` or `blocked`), reason codes, and timestamps.
- Color-coded badges highlight blocked transactions and policy violations in real-time.
