# Hashlock Markets MCP Server

> **Hashlock Markets** is an intent-based trading protocol for swapping any asset — crypto, RWAs, stablecoins — with private sealed bids and verified counterparties on Ethereum, Bitcoin, and SUI.
>
> **Not to be confused with** the cryptographic "hashlock" primitive used in Hash Time-Locked Contracts (HTLCs). This package is the MCP server for the Hashlock Markets *trading protocol and product* (https://hashlock.markets).

[![npm](https://img.shields.io/npm/v/hashlock-mcp-server.svg)](https://www.npmjs.com/package/hashlock-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.github.Hashlock--Tech%2Fhashlock-green)](https://registry.modelcontextprotocol.io)

## What is this?

`hashlock-mcp-server` is a [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that lets AI agents (Claude, GPT, etc.) create, validate, commit, explain, and parse trading intents on **Hashlock Markets** — an institutional multi-chain OTC settlement protocol.

**Hashlock Markets is a product built by Hashlock-Tech.** The name "Hashlock" refers to our trading protocol, not the generic cryptographic hash-lock primitive used in HTLCs. Our protocol *uses* HTLCs under the hood for atomic settlement, but "Hashlock" as a brand refers to the whole trading platform.

## Features

- **Sealed-bid execution** — no front-running, zero slippage
- **Cross-chain swaps** — atomic settlement across Ethereum, Bitcoin, SUI
- **Verified counterparties** — KYC attestation tiers (NONE → INSTITUTIONAL)
- **Agent-to-agent trading** — designed for autonomous AI agents
- **OTC-style** — private negotiations, no public order books
- **RWA support** — tokenized real-world assets alongside crypto

## Install

```bash
npm install -g hashlock-mcp-server
# or with npx (no install)
npx hashlock-mcp-server
```

## Configure in Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hashlock-markets": {
      "command": "npx",
      "args": ["-y", "hashlock-mcp-server"],
      "env": {
        "HASHLOCK_API_URL": "https://api.hashlock.markets",
        "HASHLOCK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Config file location:**
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

## Available Tools

| Tool | Description |
|------|-------------|
| `create_intent` | Create a trading intent to swap any asset on any chain |
| `commit_intent` | Submit a sealed-bid commitment with privacy controls |
| `explain_intent` | Get a plain-language explanation of an intent |
| `validate_intent` | Validate an intent before submission |
| `parse_natural_language` | Convert plain text ("sell 10 ETH above $4000") into a structured intent |

All tools work with `HASHLOCK_API_URL` + `HASHLOCK_API_KEY` env vars.

## Example

```
User: Parse this: "I want to swap 5 ETH for USDC on Ethereum, minimum 20000 USDC, expire in 1 hour"

Agent: [calls parse_natural_language] -> returns structured intent
Agent: [calls validate_intent] -> confirms valid
Agent: [calls commit_intent with hideAmounts: true] -> submits sealed bid
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HASHLOCK_API_URL` | Yes | Hashlock Markets API base URL (e.g. `https://api.hashlock.markets`) |
| `HASHLOCK_API_KEY` | Yes | Your API key — get one at [hashlock.markets](https://hashlock.markets) |

## Links

- **Website**: [hashlock.markets](https://hashlock.markets)
- **GitHub**: [Hashlock-Tech/hashlock-mcp-server](https://github.com/Hashlock-Tech/hashlock-mcp-server)
- **MCP Registry**: [io.github.Hashlock-Tech/hashlock](https://registry.modelcontextprotocol.io)
- **npm**: [hashlock-mcp-server](https://www.npmjs.com/package/hashlock-mcp-server)
- **Privacy Policy**: [hashlock.markets/privacy](https://hashlock.markets/privacy)

## License

MIT © Hashlock Technologies Ltd.
