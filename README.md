# Hashlock MCP Server

MCP server for the [Hashlock](https://hashlock.tech) intent protocol. Enables AI agents to create, commit, validate, explain, and parse trading intents with attestation-based counterparty verification.

## Tools

| Tool | Description |
|------|-------------|
| `create_intent` | Create a HashLockIntent with full parameter control |
| `commit_intent` | Create an off-chain commitment with selective disclosure |
| `explain_intent` | Generate human-readable explanation of an intent |
| `parse_natural_language` | Parse natural language into a structured intent (EN & TR) |
| `validate_intent` | Validate an intent against schema and business rules |

## Setup

### Environment Variables

```bash
HASHLOCK_API_URL=https://api.hashlock.tech
HASHLOCK_API_KEY=your-api-key
```

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "hashlock": {
      "command": "npx",
      "args": ["-y", "hashlock-mcp-server"],
      "env": {
        "HASHLOCK_API_URL": "https://api.hashlock.tech",
        "HASHLOCK_API_KEY": "your-api-key"
      }
    }
  }
}
```

### From Source

```bash
git clone https://github.com/Hashlock-Tech/hashlock-mcp-server.git
cd hashlock-mcp-server
npm install
npm run build
```

## Key Concepts

**Attestation Tiers**: NONE > BASIC > STANDARD > ENHANCED > INSTITUTIONAL

**Sealed Bids**: Use `commit_intent` with `hideAmounts: true`, `hideIdentity: true`, `revealOnMatch: false`

**Settlement Types**: bilateral (direct), ring (multi-party), batch (aggregated)

## License

MIT
