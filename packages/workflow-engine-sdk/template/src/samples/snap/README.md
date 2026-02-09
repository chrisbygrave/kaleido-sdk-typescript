# Snap handler sample

This example demonstrates how to set up a transaction handler that uses event triggers to wait for and respond to external events, implementing a "snap" card game mechanic.

## Overview

The snap handler sample consists of three main components:

1. **Transaction Handler** (`snap-handler.ts`) - Implements a card game "snap" mechanic with three actions
2. **Event Source** (`event-source.ts`) - Acts as a card dealer, dealing cards from a shuffled deck
3. **Workflow** (`flow.ts`) - Defines the workflow stages and event bindings

## How it works

### Transaction handler

The snap handler (`snap-handler.ts`) implements a card game where you can "set a trap" for a specific playing card (suit and rank) and wait for that card to be played. The handler has three actions:

1. **`set-trap`** - Sets up a trigger for a specific card by creating an event topic based on the suit and rank (e.g., `suit.hearts.rank.king`)
2. **`trap-set`** - Marks that the trap is active and waits for the matching card to be played
3. **`trap-fired`** - Handles when a matching card is played via an event, completing the "snap" and returning the card data

### Event source

The event source (`event-source.ts`) acts as a card dealer that generates card play events. It maintains a shuffled deck of 52 playing cards and deals random batches of cards (1-9 cards per poll) when polled by the workflow engine. Each card dealt generates an event with:

- A topic matching the pattern `suit.<suit>.rank.<rank>` (e.g., `suit.hearts.rank.king`)
- A data payload containing the card's description, suit, and rank
- A unique idempotency key

The event source tracks how many cards have been dealt and stops generating events when the deck is exhausted.

### Workflow

The workflow (`flow.ts`) defines the stages and event bindings:

- **`set-trap` stage**: Initializes the trap by calling the `set-trap` action
- **`trap-set` stage**: Confirms the trap is set and enters a waiting state
- **Event listener**: Listens for card play events matching the pattern `suit.<suit>.rank.<rank>`
- **`snap` stage**: Final success stage reached when the matching card is played

When the event source deals a card matching the trap (via an event with the matching topic), the workflow automatically transitions to the `snap` stage, completing the transaction.

## Usage

1. Register the snap handler in your provider's main file:
   ```typescript
   const snapHandler = newDirectedTransactionHandler('snap-watcher', snapActionMap);
   client.registerTransactionHandler('snap-watcher', snapHandler);
   ```

2. Register the dealer event source:
   ```typescript
   client.registerEventSource('snap-dealer', dealerEventSource);
   ```

3. Start your application to register your provider and handlers with the workflow engine.

4. Post the workflow to the workflow engine using the utility scripts:
   ```bash
   npm run create-workflow src/samples/snap/flow.ts
   ```

5. Create an event stream to connect the dealer event source to the workflow engine (this can be done via the REST API or workflow engine UI).

6. Create a transaction with a suit and rank to set a trap:
   ```bash
   npm run create-transaction src/samples/snap/transaction.json
   ```

Once configured, the event source will deal cards from a shuffled deck, and the handler will wait for a card matching the specified suit and rank. When the dealer deals a matching card, the workflow will automatically transition to the `snap` stage, completing the transaction.
