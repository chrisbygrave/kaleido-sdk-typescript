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


import {
  newDirectedTransactionHandler,
  WorkflowEngineClient,
} from '@kaleido-io/workflow-engine-sdk';

import provider from './provider.js';

import { actionMap as helloActionMap } from './samples/hello/handlers.js';
import { actionMap as httpInvokeActionMap } from './samples/http-invoke/handlers.js';
import { actionMap as echoActionMap } from './samples/event-source/echo-handler.js';
import { eventSource } from './samples/event-source/event-source.js';
import dotenv from 'dotenv';

dotenv.config();
const wsUrl = `wss://${process.env.ACCOUNT}/endpoint/${process.env.ENVIRONMENT}/${process.env.WORKFLOW_ENGINE}/rest/ws`;
const client = new WorkflowEngineClient({
  url: wsUrl,
  authHeaderName: 'Authorization',
  authToken: `basic ${Buffer.from(`${process.env.KEY_NAME}:${process.env.KEY_VALUE}`).toString("base64")}`,
  providerName: provider.name,
  providerMetadata: provider.metadata ?? {},
  reconnectDelay: 2000,
});

const helloHandler = newDirectedTransactionHandler('hello', helloActionMap);
client.registerTransactionHandler('hello', helloHandler);

const httpInvokeHandler = newDirectedTransactionHandler('http-invoke', httpInvokeActionMap);
client.registerTransactionHandler('http-invoke', httpInvokeHandler);

const echoEventHandler = newDirectedTransactionHandler('echo', echoActionMap);
client.registerTransactionHandler('echo', echoEventHandler);
client.registerEventSource('my-listener', eventSource);

await client.connect();
