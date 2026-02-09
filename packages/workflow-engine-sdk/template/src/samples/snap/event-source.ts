// Copyright © 2026 Kaleido, Inc.
//
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { newLogger } from "@kaleido-io/workflow-engine-sdk";

const log = newLogger('dealer-event-source');

export interface PlayingCard {
    description: string;
    suit: string;
    rank: string;
}

export const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
export const ranks = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king'];

const newDeck = (): PlayingCard[] => {
    const deck: PlayingCard[] = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({
                description: `${rank} of ${suit}`,
                suit,
                rank
            });
        }
    }
    return deck;
}

const shuffleDeck = (deck: PlayingCard[]): void => {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

const deck: PlayingCard[] = newDeck();
shuffleDeck(deck);

let dealt = 0;

const dealerEventSource = {
    name: () => 'snap-dealer',
    init: async () => {
        log.info('Dealer initialized');
    },
    close: () => {
        log.info('Dealer closed');
    },
    eventSourcePoll: async (_config: any, result: any) => {
        const toDeal = Math.min(Math.floor(Math.random() * 9) + 1, deck.length - dealt);
        const dealSet = deck.slice(dealt, dealt + toDeal);

        if (dealSet.length === 0) {
            result.events = [];
            result.checkpoint = { dealt };
            return;
        }

        result.events = dealSet.map(card => ({
            idempotencyKey: `${card.suit}-${card.rank}-${Date.now()}-${Math.random()}`,
            topic: `suit.${card.suit}.rank.${card.rank}`,
            data: card
        }));

        dealt += toDeal;
        result.checkpoint = { dealt };

        log.info(`Dealt ${toDeal} cards, total: ${dealt}/${deck.length}`);
    },
    eventSourceValidateConfig: async () => { },
    eventSourceDelete: async () => { }
};

export const eventSource = dealerEventSource;