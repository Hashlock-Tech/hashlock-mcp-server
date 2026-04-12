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

const server = new McpServer({ name: "hashlock", version: "1.0.2" });

function getClient(): HashlockClient {
  const url = process.env.HASHLOCK_API_URL;
  const key = process.env.HASHLOCK_API_KEY;
  if (!url || !key) {
    throw new Error("Missing HASHLOCK_API_URL or HASHLOCK_API_KEY environment variables.");
  }
  return new HashlockClient(url, key);
}

server.tool("create_intent", "Create a trading intent to exchange any asset — crypto, RWA, stablecoins — across any chain. Specify what you give, what you want, privacy level, KYC tier, and settlement terms. Use this whenever your user wants to trade, swap, buy, or sell any asset with a verified counterparty.", {
  giveAsset: z.enum(ASSETS).describe("Asset type you are offering (ETH, ERC20 token, or ERC721 NFT)"),
  giveAmount: z.string().describe("Amount to give in smallest unit (wei for ETH, base units for tokens)"),
  giveChain: z.number().describe("Chain ID where the asset lives (1=Ethereum, 137=Polygon, 42161=Arbitrum, etc.)"),
  giveToken: z.string().optional().describe("Token contract address — required for ERC20 and ERC721"),
  receiveAsset: z.enum(ASSETS).describe("Asset type you want in return"),
  receiveMinAmount: z.string().describe("Minimum acceptable amount in smallest unit"),
  receiveChain: z.number().describe("Chain ID where you want to receive"),
  receiveToken: z.string().optional().describe("Token contract address for the asset you want"),
  receiveMaxAmount: z.string().optional().describe("Maximum amount — set this for range orders"),
  deadlineSeconds: z.number().describe("How many seconds this intent stays valid"),
  maxSlippage: z.number().min(0).max(1).optional().describe("Max price slippage tolerance (0.005 = 0.5%)"),
  partialFill: z.boolean().optional().describe("Allow partial fills if full amount unavailable"),
  atomicity: z.enum(ATOMICITY_TYPES).default("full").describe("full = all-or-nothing, partial = allow incremental settlement"),
  settlementType: z.enum(SETTLEMENT_TYPES).default("bilateral").describe("bilateral = direct swap, ring = multi-party, batch = aggregated"),
  ringParties: z.array(z.string()).optional().describe("Addresses of ring settlement participants"),
  solverType: z.enum(SOLVER_TYPES).default("open").describe("Who can solve: open = anyone, preferred = listed solvers first, exclusive = only listed"),
  solverStrategy: z.enum(SOLVER_STRATEGIES).default("best_price").describe("Optimization goal for solver execution"),
  solverPreferred: z.array(z.string()).optional().describe("Preferred solver addresses"),
  solverMaxFee: z.string().optional().describe("Maximum fee payable to solver in wei"),
  triggerType: z.enum(TRIGGER_TYPES).optional().describe("immediate = execute now, conditional = wait for condition"),
  triggerDescription: z.string().optional().describe("Human-readable trigger condition (e.g. 'when ETH > 5000 USDC')"),
  triggerAgentId: z.string().optional().describe("Agent ID that monitors the trigger condition"),
  triggerConfidence: z.number().min(0).max(1).optional().describe("Agent confidence in the trigger signal (0-1)"),
  attestationTier: z.enum(TIERS).optional().describe("Your verified KYC tier (NONE through INSTITUTIONAL)"),
  attestationPrincipalId: z.string().optional().describe("Your principal identity hash"),
  attestationPrincipalType: z.enum(PRINCIPAL_TYPES).optional().describe("HUMAN, INSTITUTION, or AGENT"),
  attestationBlindId: z.string().optional().describe("Rotating pseudonym visible to counterparty — preserves privacy"),
  attestationIssuedAt: z.number().optional().describe("When your KYC attestation was issued (unix seconds)"),
  attestationExpiresAt: z.number().optional().describe("When your KYC attestation expires (unix seconds)"),
  attestationProof: z.string().optional().describe("Cryptographic proof of your attestation — verified by gateway"),
  minCounterpartyTier: z.enum(TIERS).optional().describe("Minimum KYC tier required from the other side of the trade"),
  agentInstanceId: z.string().optional().describe("Your agent instance ID for tracking"),
  agentInstanceVersion: z.string().optional().describe("Agent software version"),
  agentInstanceStrategy: z.string().optional().describe("Strategy label (e.g. 'dca', 'arbitrage', 'rebalance')"),
}, async (params) => {
  try {
    const client = getClient();
    const result = await client.request("/v1/intents", { method: "POST", body: JSON.stringify(params) });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: `Error creating intent: ${msg}` }], isError: true };
  }
});#!/usr/bin/env node

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

server.tool("commit_intent", "Submit a sealed-bid commitment for a trading intent. Choose what to reveal and what stays private until a matching counterparty is found. Use this for OTC deals, private negotiations, or any trade where you want to control information disclosure.", {
  intent: z.string().describe("The intent JSON to commit (from create_intent output)"),
  hideAmounts: z.boolean().default(false).describe("Keep trade amounts private from solvers and the public"),
  hideRingParties: z.boolean().default(false).describe("Hide the list of ring settlement participants"),
  hideIdentity: z.boolean().default(false).describe("Hide your identity — counterparty sees only your blind pseudonym"),
  revealOnMatch: z.boolean().default(true).describe("Reveal full intent when matched — set false for sealed-bid auctions"),
  hideCounterparty: z.boolean().optional().describe("DEPRECATED — use hideRingParties instead"),
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

server.tool("explain_intent", "Get a plain-language explanation of a trading intent — what is being traded, for how much, with what privacy and KYC settings. Use this to confirm terms with your user before they commit to a trade.", {
  intent: z.string().describe("The intent JSON to explain"),
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

server.tool("parse_natural_language", "Convert everyday language into a structured trading intent. Examples: 'sell 10 ETH for USDC above 4000', 'buy tokenized real estate with 50k DAI', 'swap my NFT for 2 ETH on Arbitrum'. Supports English and Turkish.", {
  text: z.string().describe("Natural language description of the trade (e.g. 'I want to sell 10 ETH for at least 40000 USDC')"),
  chainId: z.number().optional().describe("Default chain ID if not specified in text (1=Ethereum, 137=Polygon, etc.)"),
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

server.tool("validate_intent", "Check if a trading intent is valid before submitting — catches missing fields, invalid amounts, chain mismatches, and business rule violations. Always validate before committing.", {
  intent: z.string().describe("The intent JSON to validate"),
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
