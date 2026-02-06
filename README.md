![Kaleido](./kaleido-logo.svg "Kaleido")

# Kaleido TypeScript SDKs

This monorepo contains Kaleido's official TypeScript SDKs for integrating with Kaleido services.

## 📦 Available Packages

### [@kaleido-io/workflow-engine-sdk](./packages/workflow-engine-sdk)

**TypeScript SDK for building handlers that integrate with the Kaleido Workflow Engine.**

Build transaction handlers, event sources, and event processors with full type safety and automatic reconnection.

**Quick Start:**
```bash
npm install @kaleido-io/workflow-engine-sdk
# or
npx @kaleido-io/workflow-engine-sdk init <project-name>
```

**Features:**
- Transaction handlers with parallel and batch processing modes
- Event sources for polling external systems
- Event processors for handling event streams
- Automatic WebSocket reconnection
- Type-safe configuration management
- REST client for workflow operations

📖 **[Full Documentation →](./packages/workflow-engine-sdk/README.md)**

---


### Prerequisites

- Node.js >= 22
- npm >= 11


### Package Structure

```
packages/
  ├── workflow-engine-sdk/    # Workflow Engine SDK
  └── [future-packages]/      # Additional SDKs
```

## 📚 Documentation

- [Workflow Engine SDK Documentation](./packages/workflow-engine-sdk/README.md)

## 🤝 Contributing

Contributions are welcome! Please see our contributing guidelines (if applicable).

## 📄 License

All packages in this monorepo are licensed under the Apache-2.0 License.

## 🔗 Links

- [Kaleido Documentation](https://docs.kaleido.io)
- [GitHub Issues](https://github.com/kaleido-io/kaleido-sdk-typescript/issues)
