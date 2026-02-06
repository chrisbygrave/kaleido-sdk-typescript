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
  WorkflowEngineClient,
  BasicStageDirector,
  DirectedActionConfig,
  InvocationMode,
  EvalResult,
  WSEvaluateRequest,
  WithStageDirector,
  addOp,
  Trigger,
  TransactionHandler,
  newEventSource,
  newDirectedTransactionHandler,
  EventSourceConf,
  EventSourceEvent,
  EngineAPI,
  WSEvaluateReply,
  WSEvaluateBatch,
  newLogger,
} from '../src/index';

// Create logger for this example
const log = newLogger('example');

function isMainModule(): boolean {
  if (typeof require !== 'undefined' && require.main === module) {
    return true;
  }
  // ES module check (without using import.meta to avoid TS module restrictions)
  // This checks if this file is executed directly as a script
  return !!process.argv[1] && (process.argv[1].endsWith('usage-example.ts') || process.argv[1].endsWith('usage-example.js'));
}

class MyHandlerInput implements WithStageDirector {
  public stageDirector: BasicStageDirector;
  public action1?: { inputA: string };
  public action2?: { inputB: string };
  public customData?: any;

  constructor(data: any) {
    this.stageDirector = new BasicStageDirector(
      data.action || 'default',
      data.outputPath || '/output',
      data.nextStage || 'complete',
      data.failureStage || 'failed'
    );
    this.action1 = data.action1;
    this.action2 = data.action2;
    this.customData = data.customData;
  }

  getStageDirector() {
    return this.stageDirector;
  }
}

// Example action handlers
const action1Handler = async (
  request: WSEvaluateRequest,
  input: MyHandlerInput
): Promise<{ result: EvalResult; output?: any; error?: Error; triggers?: Trigger[] }> => {
  log.info('Executing action1 with input:', input.action1);
  
  return {
    result: EvalResult.COMPLETE,
    output: { resultA: `Processed: ${input.action1?.inputA}` },
    triggers: [{
      topic: 'action1.completed'
    }]
  };
};

const action2Handler = async (
  request: WSEvaluateRequest,
  input: MyHandlerInput
): Promise<{ result: EvalResult; output?: any; error?: Error }> => {
  log.info('Executing action2 with input:', input.action2);
  
  return {
    result: EvalResult.COMPLETE,
    output: { resultB: `Processed: ${input.action2?.inputB}` }
  };
};

// Example custom transaction handler (not using directed pattern)
class MyRequestHandler implements TransactionHandler {
  name(): string {
    return 'my-request-handler';
  }

  async init(_engAPI: EngineAPI): Promise<void> {
    log.info('MyRequestHandler initialized');
  }

  close(): void {
    log.info('MyRequestHandler closed');
  }

  async transactionHandlerBatch(
    reply: WSEvaluateReply,
    batch: WSEvaluateBatch
  ): Promise<void> {
    log.info(`Processing ${batch.requests.length} requests`);
    
    reply.results = batch.requests.map((_request) => {
      return {
        stage: 'completed',
        stateUpdates: [
          addOp('/processed', { timestamp: new Date().toISOString() })
        ]
      };
    });
  }
}

// Example event source handler using the factory
interface MyEventSourceConfig {
  pollingInterval: number;
}

interface MyEventSourceCheckpoint {
  lastPollTime: number;
}

interface MyEventData {
  message: string;
  timestamp: number;
}

const myEventSource = newEventSource<MyEventSourceCheckpoint, MyEventSourceConfig, MyEventData>(
  'my-listener',
  async (config: EventSourceConf<MyEventSourceConfig>, _checkpoint: MyEventSourceCheckpoint | null) => {
    log.info('Polling for events with config:', config.config);
    
    const events: EventSourceEvent<MyEventData>[] = [
      {
        idempotencyKey: `event-${Date.now()}`,
        topic: 'my-topic',
        data: { 
          message: 'Hello from event source',
          timestamp: Date.now()
        }
      }
    ];

    return {
      checkpointOut: { lastPollTime: Date.now() },
      events
    };
  }
)
.withInitialCheckpoint(async (_config) => ({
  lastPollTime: 0
}))
.withConfigParser(async (_info, config) => {
  return {
    pollingInterval: config.pollingInterval || 5000
  };
})
.withDeleteFn(async (info) => {
  log.info(`Cleaning up event source ${info.streamName} (${info.streamId})`);
});

// Main usage example
async function main() {
  // Option 1: Create client from config file
  // const fileConfig = ConfigLoader.loadFromFile('./config.yaml');
  // const clientConfig = ConfigLoader.createClientConfig(fileConfig, 'example-provider');
  // const client = new WorkflowEngineClient(clientConfig);

  // Option 2: Create client with inline configuration
  const client = new WorkflowEngineClient({
    url: 'ws://localhost:5503/ws',
    authToken: process.env.AUTH_TOKEN || 'dev-token-123',
    providerName: 'example-provider',
    reconnectDelay: 2000,
  });

  // Option 1: Register a directed transaction handler (recommended)
  const actionMap = new Map<string, DirectedActionConfig<MyHandlerInput>>();
  actionMap.set('action1', {
    invocationMode: InvocationMode.PARALLEL,
    handler: action1Handler,
  });
  actionMap.set('action2', {
    invocationMode: InvocationMode.PARALLEL,
    handler: action2Handler,
  });

  // Create directed handler using factory
  const handler = newDirectedTransactionHandler('my-directed-handler', actionMap);
  client.registerTransactionHandler('my-directed-handler', handler);

  // Option 2: Register a custom transaction handler
  client.registerTransactionHandler('my-request-handler', new MyRequestHandler());

  // Option 3: Register an event source
  client.registerEventSource('my-listener', myEventSource);

  // Connect (initializes handlers and establishes WebSocket connection)
  await client.connect();

  log.info('Client connected and handlers registered');

  log.info('Client is ready to process transactions');
  
  // Example: You can now submit transactions via the HTTP API
  // const transaction = {
  //   operation: 'invoke',
  //   handler: 'my-directed-handler',
  //   stage: 'start',
  //   input: {
  //     action: 'action1',
  //     action1: { inputA: 'example-value' },
  //     outputPath: '/output',
  //     nextStage: 'complete',
  //     failureStage: 'failed',
  //   },
  // };
  // const result = await postTransactionsInvoke('http://localhost:5503', transaction);
  // log.info('Transaction submitted:', result.transaction?.id);

  // Keep running until interrupted
  process.on('SIGINT', () => {
    log.info('Shutting down...');
    client.disconnect();
    process.exit(0);
  });
}

// Run if executed directly
if (isMainModule()) {
  main().catch(log.error);
}

export { MyHandlerInput, MyRequestHandler, myEventSource };
