#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const TIERS = ["NONE", "BASIC", "STANDARD", "ENHANCED", "INSTITUTIONAL"] as const;
type Tier = (typeof TIERS)[number];
const ASSETS = ["ETH", "ERC20", "ERC721"] as const;
const SETTLEMENT_TYPES = ["bilateral", "ring", "batch"] as const;
const SOLVER_TYPES = ["open", "preferred", "exclusive"] as const;
const SOLVER_STRATEGIES = ["best_price", "fastest", "lowest_fee"] as const;
const TRIGGER_TYPES = ["immediate", "conditional"] as const;
const ATOMICITY_TYPES = ["full", "partial"] as const;
const PRINCIPAL_TYPES = ["HUMAN", "INSTITUTION", "AGENT"] as const;

class HashlockClient {
  private baseUrl: string;
  private apiKey: string;
  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
        ...(init.headers as Record<string, string> ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Hashlock API ${res.status} ${res.statusText}: ${body}`);
    }
    return (await res.json()) as T;
  }
}

const server = new McpServer({ name: "hashlock", version: "1.0.0" });

function getClient(): HashlockClient {
  const url = process.env.HASHLOCK_API_URL;
  const key = process.env.HASHLOCK_API_KEY;
  if (!url || !key) {
    throw new Error("Missing HASHLOCK_API_URL or HASHLOCK_API_KEY environment variables.");
  }
  return new HashlockClient(url, key);
}

server.tool("create_intent", "Create a HashLockIntent via the fluent builder. Returns the validated intent JSON.", {
  giveAsset: z.enum(ASSETS).describe("Asset type to give"),
  giveAmount: z.string().describe("Amount in smallest unit (wei for ETH)"),
  giveChain: z.number().describe("Source chain ID"),
  giveToken: z.string().optional().describe("Token contract address (required for ERC20/ERC721)"),
  receiveAsset: z.enum(ASSETS).describe("Asset type to receive"),
  receiveMinAmount: z.string().describe("Minimum acceptable amount in smallest unit"),
  receiveChain: z.number().describe("Destination chain ID"),
  receiveToken: z.string().optional().describe("Token contract address"),
  receiveMaxAmount: z.string().optional().describe("Maximum amount (optional upper bound)"),
  deadlineSeconds: z.number().describe("Deadline in seconds from now"),
  maxSlippage: z.number().min(0).max(1).optional().describe("Max slippage (0.005 = 0.5%)"),
  partialFill: z.boolean().optional().describe("Allow partial fills"),
  atomicity: z.enum(ATOMICITY_TYPES).default("full").describe("Atomicity guarantee"),
  settlementType: z.enum(SETTLEMENT_TYPES).default("bilateral").describe("Settlement mechanism"),
  ringParties: z.array(z.string()).optional().describe("Ring settlement participant addresses"),
  solverType: z.enum(SOLVER_TYPES).default("open").describe("Solver access type"),
  solverStrategy: z.enum(SOLVER_STRATEGIES).default("best_price").describe("Execution strategy"),
  solverPreferred: z.array(z.string()).optional().describe("Preferred solver addresses"),
  solverMaxFee: z.string().optional().describe("Max fee payable to solver"),
  triggerType: z.enum(TRIGGER_TYPES).optional().describe("Trigger type"),
  triggerDescription: z.string().optional().describe("Human-readable trigger condition"),
  triggerAgentId: z.string().optional().describe("Producing agent ID"),
  triggerConfidence: z.number().min(0).max(1).optional().describe("Agent confidence score"),
  attestationTier: z.enum(TIERS).optional().describe("Signer's attested KYC tier"),
  attestationPrincipalId: z.string().optional().describe("Principal ID hash"),
  attestationPrincipalType: z.enum(PRINCIPAL_TYPES).optional().describe("Principal type"),
  attestationBlindId: z.string().optional().describe("Rotating pseudonym the counterparty sees"),
  attestationIssuedAt: z.number().optional().describe("Attestation issuedAt (unix seconds)"),
  attestationExpiresAt: z.number().optional().describe("Attestation expiry (unix seconds)"),
  attestationProof: z.string().optional().describe("Opaque attestation proof verified by gateway"),
  minCounterpartyTier: z.enum(TIERS).optional().describe("Minimum KYC tier the counterparty must attest to"),
  agentInstanceId: z.string().optional().describe("Agent instance ID"),
  agentInstanceVersion: z.string().optional().describe("Agent software version"),
  agentInstanceStrategy: z.string().optional().describe("Strategy label"),
}, async (params) => {
  try {
    const client = getClient();
    const result = await client.request("/v1/intents", { method: "POST", body: JSON.stringify(params) });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: `Error creating intent: ${msg}` }], isError: true };
  }
});

server.tool("commit_intent", "Create an off-chain commitment from an intent. Returns commitment hash and solver proof with selective disclosure.", {
  intent: z.string().describe("Intent JSON string to commit"),
  hideAmounts: z.boolean().default(false).describe("Hide amounts from solver proof"),
  hideRingParties: z.boolean().default(false).describe("Strip ring settlement party list from solver proof"),
  hideIdentity: z.boolean().default(false).describe("Strip principal blindId from solver proof"),
  revealOnMatch: z.boolean().default(true).describe("Reveal full intent when matched (set false for sealed bid)"),
  hideCounterparty: z.boolean().optional().describe("DEPRECATED alias for hideRingParties"),
}, async (params) => {
  try {
    const client = getClient();
    const result = await client.request("/v1/intents/commit", { method: "POST", body: JSON.stringify(params) });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: `Error committing intent: ${msg}` }], isError: true };
  }
});

server.tool("explain_intent", "Generate a human-readable explanation of a HashLockIntent.", {
  intent: z.string().describe("Intent JSON string to explain"),
}, async (params) => {
  try {
    const client = getClient();
    const result = await client.request("/v1/intents/explain", { method: "POST", body: JSON.stringify(params) });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: `Error explaining intent: ${msg}` }], isError: true };
  }
});

server.tool("parse_natural_language", "Parse natural language text into a HashLockIntent. Supports Turkish and English.", {
  text: z.string().describe("Natural language trading intent"),
  chainId: z.number().optional().describe("Default chain ID (defaults to 1 = Ethereum)"),
}, async (params) => {
  try {
    const client = getClient();
    const result = await client.request("/v1/intents/parse", { method: "POST", body: JSON.stringify(params) });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: `Error parsing natural language: ${msg}` }], isError: true };
  }
});

server.tool("validate_intent", "Validate a HashLockIntent against schema and business rules.", {
  intent: z.string().describe("Intent JSON string to validate"),
}, async (params) => {
  try {
    const client = getClient();
    const result = await client.request("/v1/intents/validate", { method: "POST", body: JSON.stringify(params) });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: `Error validating intent: ${msg}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Hashlock MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
