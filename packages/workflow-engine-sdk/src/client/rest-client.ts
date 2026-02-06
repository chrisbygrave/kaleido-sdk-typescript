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


/**
 * REST Client for Workflow Engine API
 * 
 * Provides methods to interact with the workflow engine REST API including:
 * - Workflow management (create, delete)
 * - Transaction management (create, delete)
 * - Stream management (create, delete, start, stop)
 */

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Base configuration for REST client
 */
export interface WorkflowEngineRestClientConfig {
  baseUrl?: string;
  keyName?: string;
  keyValue?: string;
}

/**
 * Transaction input payload
 */
export interface TransactionInput {
  [key: string]: unknown;
}

/**
 * Request to create a transaction
 */
export interface CreateTransactionRequest {
  workflow: string;
  operation: string;
  input?: TransactionInput;
  idempotencyKey?: string;
  labels?: Record<string, string>;
  workflowId?: string;
}

/**
 * Response from creating a transaction
 */
export interface CreateTransactionResponse {
  id?: string;
  idempotencyKey: string;
  position?: number;
  preexisting?: boolean;
  rejectedError?: string;
}

/**
 * Request to create a workflow
 */
export interface CreateWorkflowRequest {
  name?: string;
  description?: string;
  currentVersion?: string;
  constants?: Record<string, Record<string, unknown>>;
  configProfileBindings?: Record<string, {
    configProfile?: string;
    configProfileId?: string;
    dynamicMapping?: {
      namePrefix?: string;
    };
  }>;
  events?: Array<{
    configProfile?: {
      name?: string;
      type?: string;
    };
    errorRetry?: {
      condition?: {
        jsonata?: string;
      };
      maxAttempts?: number;
      retryDelay?: string;
    };
    [key: string]: unknown;
  }>;
  stages?: Array<{
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Response from creating a workflow
 */
export interface CreateWorkflowResponse {
  id?: string;
  name?: string;
  description?: string;
  created?: string;
  updated?: string;
  [key: string]: unknown;
}

/**
 * Request to create a stream
 */
export interface CreateStreamRequest {
  name?: string;
  description?: string;
  type?: 'event_stream' | 'correlation_stream' | 'transaction_dispatch';
  started?: boolean;
  config?: Record<string, unknown>;
  eventHandler?: string;
  eventHandlerProvider?: string;
  listenerHandler?: string;
  listenerHandlerProvider?: string;
  postFilter?: {
    jsonata?: string;
  };
  transactionTemplate?: {
    jsonata?: string;
    operation?: string;
    workflow?: string;
  };
  uniquenessPrefix?: string;
}

/**
 * Response from creating a stream
 */
export interface CreateStreamResponse {
  id?: string;
  name?: string;
  description?: string;
  type?: string;
  started?: boolean;
  created?: string;
  updated?: string;
  [key: string]: unknown;
}

/**
 * Request to update a stream (for start/stop)
 */
export interface UpdateStreamRequest {
  started?: boolean;
  description?: string;
  name?: string;
  uniquenessPrefix?: string;
}

/**
 * REST Client for Workflow Engine API
 */
export class WorkflowEngineRestClient {
  private baseUrl: string;
  private keyName?: string;
  private keyValue?: string;

  constructor(config?: WorkflowEngineRestClientConfig) {
    // Build base URL from environment variables if not provided
    if (!config?.baseUrl) {
      if (!process.env.ACCOUNT) {
        throw new Error('ACCOUNT is not set and no baseUrl provided');
      }
      if (!process.env.ENVIRONMENT) {
        throw new Error('ENVIRONMENT is not set and no baseUrl provided');
      }
      if (!process.env.WORKFLOW_ENGINE) {
        throw new Error('WORKFLOW_ENGINE is not set and no baseUrl provided');
      }
      this.baseUrl = `https://${process.env.ACCOUNT}/endpoint/${process.env.ENVIRONMENT}/${process.env.WORKFLOW_ENGINE}/rest`;
    } else {
      this.baseUrl = config.baseUrl;
    }

    this.keyName = config?.keyName || process.env.KEY_NAME;
    this.keyValue = config?.keyValue || process.env.KEY_VALUE;
  }

  /**
   * Gets the full REST API endpoint URL for workflows
   */
  private getWorkflowsEndpoint(): string {
    return `${this.baseUrl}/api/v1/workflows`;
  }

  /**
   * Gets the full REST API endpoint URL for a specific workflow
   */
  private getWorkflowEndpoint(workflowNameOrId: string): string {
    return `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(workflowNameOrId)}`;
  }

  /**
   * Gets the full REST API endpoint URL for transactions
   */
  private getTransactionsEndpoint(): string {
    return `${this.baseUrl}/api/v1/transactions`;
  }

  /**
   * Gets the full REST API endpoint URL for a specific transaction
   */
  private getTransactionEndpoint(idempotencyKeyOrId: string): string {
    return `${this.baseUrl}/api/v1/transactions/${encodeURIComponent(idempotencyKeyOrId)}`;
  }

  /**
   * Gets the full REST API endpoint URL for streams
   */
  private getStreamsEndpoint(): string {
    return `${this.baseUrl}/api/v1/streams`;
  }

  /**
   * Gets the full REST API endpoint URL for a specific stream
   */
  private getStreamEndpoint(streamNameOrId: string): string {
    return `${this.baseUrl}/api/v1/streams/${encodeURIComponent(streamNameOrId)}`;
  }

  /**
   * Gets the authorization header if credentials are available
   */
  private getAuthHeader(): string | undefined {
    if (this.keyName && this.keyValue) {
      return `basic ${Buffer.from(`${this.keyName}:${this.keyValue}`).toString('base64')}`;
    }
    return undefined;
  }

  /**
   * Makes an HTTP request with proper error handling
   */
  private async makeRequest<T>(
    url: string,
    method: string,
    body?: unknown,
    timeout?: number
  ): Promise<T> {
    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (timeout) {
      headers['Request-Timeout'] = `${timeout}m0s`;
    }

    // Add authorization if credentials are available
    const authHeader = this.getAuthHeader();
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to ${method} ${url}: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  // ============================================================================
  // Workflow Methods
  // ============================================================================

  /**
   * Creates a new workflow
   * 
   * @param workflow - The workflow definition
   * @param timeout - Optional timeout in seconds (default: 120)
   * @returns Promise resolving to the created workflow
   */
  async createWorkflow(
    workflow: CreateWorkflowRequest,
    timeout?: number
  ): Promise<CreateWorkflowResponse> {
    const endpoint = this.getWorkflowsEndpoint();
    return this.makeRequest<CreateWorkflowResponse>(endpoint, 'POST', workflow, timeout);
  }

  /**
   * Deletes a workflow by name or ID
   * 
   * @param workflowNameOrId - The name or ID of the workflow to delete
   * @param timeout - Optional timeout in seconds (default: 120)
   * @returns Promise that resolves when the workflow is deleted
   */
  async deleteWorkflow(
    workflowNameOrId: string,
    timeout?: number
  ): Promise<void> {
    const endpoint = this.getWorkflowEndpoint(workflowNameOrId);
    return this.makeRequest<void>(endpoint, 'DELETE', undefined, timeout);
  }

  // ============================================================================
  // Transaction Methods
  // ============================================================================

  /**
   * Creates a new transaction
   * 
   * @param transaction - The transaction request
   * @param timeout - Optional timeout in seconds (default: 120)
   * @returns Promise resolving to the transaction response
   */
  async createTransaction(
    transaction: CreateTransactionRequest,
    timeout?: number
  ): Promise<CreateTransactionResponse> {
    const endpoint = this.getTransactionsEndpoint();
    return this.makeRequest<CreateTransactionResponse>(endpoint, 'POST', transaction, timeout);
  }

  /**
   * Deletes a transaction by idempotency key or ID
   * 
   * @param idempotencyKeyOrId - The idempotency key or ID of the transaction to delete
   * @param timeout - Optional timeout in seconds (default: 120)
   * @returns Promise that resolves when the transaction is deleted
   */
  async deleteTransaction(
    idempotencyKeyOrId: string,
    timeout?: number
  ): Promise<void> {
    const endpoint = this.getTransactionEndpoint(idempotencyKeyOrId);
    return this.makeRequest<void>(endpoint, 'DELETE', undefined, timeout);
  }

  // ============================================================================
  // Stream Methods
  // ============================================================================

  /**
   * Creates a new stream
   * 
   * @param stream - The stream definition
   * @param timeout - Optional timeout in seconds (default: 120)
   * @returns Promise resolving to the created stream
   */
  async createStream(
    stream: CreateStreamRequest,
    timeout?: number
  ): Promise<CreateStreamResponse> {
    const endpoint = this.getStreamsEndpoint();
    return this.makeRequest<CreateStreamResponse>(endpoint, 'POST', stream, timeout);
  }

  /**
   * Deletes a stream by name or ID
   * 
   * @param streamNameOrId - The name or ID of the stream to delete
   * @param force - Optional flag to force delete without waiting for handler cleanup
   * @param timeout - Optional timeout in seconds (default: 120)
   * @returns Promise that resolves when the stream is deleted
   */
  async deleteStream(
    streamNameOrId: string,
    force?: boolean,
    timeout?: number
  ): Promise<void> {
    let endpoint = this.getStreamEndpoint(streamNameOrId);
    if (force) {
      endpoint += '?force=true';
    }
    return this.makeRequest<void>(endpoint, 'DELETE', undefined, timeout);
  }

  /**
   * Starts a stream by updating its started status to true
   * 
   * @param streamNameOrId - The name or ID of the stream to start
   * @param timeout - Optional timeout in seconds (default: 120)
   * @returns Promise resolving to the updated stream
   */
  async startStream(
    streamNameOrId: string,
    timeout?: number
  ): Promise<CreateStreamResponse> {
    const endpoint = this.getStreamEndpoint(streamNameOrId);
    const update: UpdateStreamRequest = { started: true };
    return this.makeRequest<CreateStreamResponse>(endpoint, 'PATCH', update, timeout);
  }

  /**
   * Stops a stream by updating its started status to false
   * 
   * @param streamNameOrId - The name or ID of the stream to stop
   * @param timeout - Optional timeout in seconds (default: 120)
   * @returns Promise resolving to the updated stream
   */
  async stopStream(
    streamNameOrId: string,
    timeout?: number
  ): Promise<CreateStreamResponse> {
    const endpoint = this.getStreamEndpoint(streamNameOrId);
    const update: UpdateStreamRequest = { started: false };
    return this.makeRequest<CreateStreamResponse>(endpoint, 'PATCH', update, timeout);
  }
}
