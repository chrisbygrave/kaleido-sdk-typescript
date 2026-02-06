# Event source sample

This example demonstrates how to set up a custom event source that generates events and triggers workflow transactions.

## Overview

The event source sample consists of three main components:

1. **Event Source** (`event-source.ts`) - Generates timestamped events at regular intervals
2. **Workflow** (`flow.ts`) - Consumes events and processes the timestamped data
3. **Transaction Dispatch Stream** (`stream.ts`) - Connects the event source to the workflow

## How it works

### Event source

The event source (`event-source.ts`) generates a new timestamped event every ten seconds. When the workflow engine polls for events, the event source checks if more than ten seconds have passed since the last poll time stored in the checkpoint. If so, it generates a new event with:

- A unique idempotency key
- A topic (`my-topic`)
- A data payload containing a message and timestamp

### Transaction dispatch stream

When an event is received from the event source, the stream (`stream.ts`)  automatically creates a new transaction in the `echo-flow` workflow, passing the event data as input.

### Workflow

The `echo-flow` workflow (`flow.ts`) is a simple workflow that consumes the data payload from the above events and produces a message with a formatted timestamp.

## Usage

1. Register the event source in your provider's main file:
   ```typescript
   client.registerEventSource('my-listener', eventSource);
   ```

2. Register the echo handler:
   ```typescript
   const echoEventHandler = newDirectedTransactionHandler('echo', echoActionMap);
   client.registerTransactionHandler('echo', echoEventHandler);
   ```

3. Start your application to register your provider and handlers with the workflow engine.

4. Post the workflow and stream to the workflow engine using the utility scripts:
   ```bash
   npm run create-workflow src/samples/event-source/flow.ts
   npm run create-stream src/samples/event-source/stream.ts
   ```

Once configured, the event source will generate events every ten seconds, which will automatically trigger transactions in the echo-flow workflow.
