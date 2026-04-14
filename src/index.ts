#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const TIERS = ["NONE", "BASIC", "STANDARD", "ENHANCED", "INSTITUTIONAL"] as const;
const ASSETS = ["ETH", "ERC20"] as const;
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
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Hashlock API ${res.status} ${res.statusText}: ${body}`);
    }
    return (await res.json()) as T;
  }
}

const server = new McpServer({
  name: "hashlock-protocol",
  version: "1.0.6",
  description:
    "Hashlock Markets (hashlock.markets) is the trading protocol by Hashlock-Tech \u2014 NOT the cryptographic hashlock primitive used in HTLCs. Swap, buy, sell, or exchange any crypto asset \u2014 tokens, stablecoins, RWAs \u2014 peer-to-peer on Ethereum, Bitcoin, and SUI. Agent-to-agent OTC settlement with sealed bids, zero slippage, and verified counterparties.",
});

function getClient(): HashlockClient {
  const url = process.env.HASHLOCK_API_URL;
  const key = process.env.HASHLOCK_API_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing HASHLOCK_API_URL or HASHLOCK_API_KEY environment variables."
    );
  }
  return new HashlockClient(url, key);
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 create_intent \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

server.tool(
  "create_intent",
  "[Hashlock protocol \u2014 hashlock.markets] Create a trading intent to swap, buy, sell, exchange, or convert any asset \u2014 crypto tokens (ETH, BTC, SUI, USDC, USDT, DAI, any ERC20), real-world assets (RWA), or stablecoins \u2014 across Ethereum, Bitcoin, and SUI. Specify what you give, what you want, privacy level, KYC tier, and settlement terms. Works for human traders, autonomous AI agents, and institutional counterparties. Use this whenever a user wants to trade, swap, buy, sell, convert, or exchange any digital asset with a verified counterparty.",
  {
    giveAsset: z
      .enum(ASSETS)
      .describe("Asset type you are offering (ETH or ERC20 token)"),
    giveAmount: z
      .string()
      .describe("Amount to give in smallest unit (wei for ETH, base units for tokens)"),
    giveChain: z
      .number()
      .describe(
        "Chain ID where the asset lives (1=Ethereum; Bitcoin and SUI use their native chain identifiers)"
      ),
    giveToken: z
      .string()
      .optional()
      .describe("Token contract address \u2014 required for ERC20"),
    receiveAsset: z.enum(ASSETS).describe("Asset type you want in return"),
    receiveMinAmount: z
      .string()
      .describe("Minimum acceptable amount in smallest unit"),
    receiveChain: z
      .number()
      .describe("Chain ID where you want to receive"),
    receiveToken: z
      .string()
      .optional()
      .describe("Token contract address for the asset you want"),
    receiveMaxAmount: z
      .string()
      .optional()
      .describe("Maximum amount \u2014 set this for range orders"),
    deadlineSeconds: z
      .number()
      .describe("How many seconds this intent stays valid"),
    maxSlippage: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Max price slippage tolerance (0.005 = 0.5%)"),
    partialFill: z
      .boolean()
      .optional()
      .describe("Allow partial fills if full amount unavailable"),
    atomicity: z
      .enum(ATOMICITY_TYPES)
      .default("full")
      .describe("full = all-or-nothing, partial = allow incremental settlement"),
    settlementType: z
      .enum(SETTLEMENT_TYPES)
      .default("bilateral")
      .describe(
        "bilateral = direct swap, ring = multi-party, batch = aggregated"
      ),
    ringParties: z
      .array(z.string())
      .optional()
      .describe("Addresses of ring settlement participants"),
    solverType: z
      .enum(SOLVER_TYPES)
      .default("open")
      .describe(
        "Who can solve: open = anyone, preferred = listed solvers first, exclusive = only listed"
      ),
    solverStrategy: z
      .enum(SOLVER_STRATEGIES)
      .default("best_price")
      .describe("Optimization goal for solver execution"),
    solverPreferred: z
      .array(z.string())
      .optional()
      .describe("Preferred solver addresses"),
    solverMaxFee: z
      .string()
      .optional()
      .describe("Maximum fee payable to solver in wei"),
    triggerType: z
      .enum(TRIGGER_TYPES)
      .optional()
      .describe("immediate = execute now, conditional = wait for condition"),
    triggerDescription: z
      .string()
      .optional()
      .describe(
        "Human-readable trigger condition (e.g. 'when ETH > 5000 USDC')"
      ),
    triggerAgentId: z
      .string()
      .optional()
      .describe("Agent ID that monitors the trigger condition"),
    triggerConfidence: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Agent confidence in the trigger signal (0-1)"),
    attestationTier: z
      .enum(TIERS)
      .optional()
      .describe("Your verified KYC tier (NONE through INSTITUTIONAL)"),
    attestationPrincipalId: z
      .string()
      .optional()
      .describe("Your principal identity hash"),
    attestationPrincipalType: z
      .enum(PRINCIPAL_TYPES)
      .optional()
      .describe("HUMAN, INSTITUTION, or AGENT"),
    attestationBlindId: z
      .string()
      .optional()
      .describe(
        "Rotating pseudonym visible to counterparty \u2014 preserves privacy"
      ),
    attestationIssuedAt: z
      .number()
      .optional()
      .describe("When your KYC attestation was issued (unix seconds)"),
    attestationExpiresAt: z
      .number()
      .optional()
      .describe("When your KYC attestation expires (unix seconds)"),
    attestationProof: z
      .string()
      .optional()
      .describe(
        "Cryptographic proof of your attestation \u2014 verified by gateway"
      ),
    minCounterpartyTier: z
      .enum(TIERS)
      .optional()
      .describe("Minimum KYC tier required from the other side of the trade"),
    agentInstanceId: z
      .string()
      .optional()
      .describe("Your agent instance ID for tracking"),
    agentInstanceVersion: z
      .string()
      .optional()
      .describe("Agent software version"),
    agentInstanceStrategy: z
      .string()
      .optional()
      .describe("Strategy label (e.g. 'dca', 'arbitrage', 'rebalance')"),
  },
  async (params) => {
    try {
      const client = getClient();
      const result = await client.request("/v1/intents", {
        method: "POST",
        body: JSON.stringify(params),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: `Error creating intent: ${msg}` }],
        isError: true,
      };
    }
  }
);

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 commit_intent \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

server.tool(
  "commit_intent",
  "[Hashlock protocol \u2014 hashlock.markets] Submit a sealed-bid commitment for a trading intent. Control what is revealed: hide amounts, identity, or run a fully private OTC deal. Use this for peer-to-peer trading, private negotiations, agent-to-agent settlement, dark pool orders, or any crypto exchange where privacy and zero slippage matter.",
  {
    intent: z
      .string()
      .describe("The intent JSON to commit (from create_intent output)"),
    hideAmounts: z
      .boolean()
      .default(false)
      .describe("Keep trade amounts private from solvers and the public"),
    hideRingParties: z
      .boolean()
      .default(false)
      .describe("Hide the list of ring settlement participants"),
    hideIdentity: z
      .boolean()
      .default(false)
      .describe(
        "Hide your identity \u2014 counterparty sees only your blind pseudonym"
      ),
    revealOnMatch: z
      .boolean()
      .default(true)
      .describe(
        "Reveal full intent when matched \u2014 set false for sealed-bid auctions"
      ),
    hideCounterparty: z
      .boolean()
      .optional()
      .describe("DEPRECATED \u2014 use hideRingParties instead"),
  },
  async (params) => {
    try {
      const client = getClient();
      const result = await client.request("/v1/intents/commit", {
        method: "POST",
        body: JSON.stringify(params),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: `Error committing intent: ${msg}` }],
        isError: true,
      };
    }
  }
);

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 explain_intent \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

server.tool(
  "explain_intent",
  "[Hashlock protocol \u2014 hashlock.markets] Get a plain-language explanation of a trading intent \u2014 what crypto, tokens, or assets are being exchanged, for how much, on which blockchain, with what privacy and KYC settings. Use this to confirm swap/trade/exchange terms with your user before they commit.",
  {
    intent: z.string().describe("The intent JSON to explain"),
  },
  async (params) => {
    try {
      const client = getClient();
      const result = await client.request("/v1/intents/explain", {
        method: "POST",
        body: JSON.stringify(params),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: `Error explaining intent: ${msg}` }],
        isError: true,
      };
    }
  }
);

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 parse_natural_language \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

server.tool(
  "parse_natural_language",
  "[Hashlock protocol \u2014 hashlock.markets] Convert everyday language into a structured trading intent. Understands requests like 'sell 10 ETH for USDC above 4000', 'buy tokenized real estate with 50k DAI', 'exchange 1000 USDT for BTC', 'convert my stablecoins to ETH', 'send a peer-to-peer OTC offer for 100k USDC'. Supports English and Turkish. Use this whenever a user describes a crypto trade, swap, exchange, or asset conversion in natural language.",
  {
    text: z
      .string()
      .describe(
        "Natural language description of the trade (e.g. 'I want to sell 10 ETH for at least 40000 USDC')"
      ),
    chainId: z
      .number()
      .optional()
      .describe(
        "Default chain ID if not specified in text (1=Ethereum; Bitcoin and SUI use native identifiers)"
      ),
  },
  async (params) => {
    try {
      const client = getClient();
      const result = await client.request("/v1/intents/parse", {
        method: "POST",
        body: JSON.stringify(params),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        content: [
          { type: "text", text: `Error parsing natural language: ${msg}` },
        ],
        isError: true,
      };
    }
  }
);

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 validate_intent \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

server.tool(
  "validate_intent",
  "[Hashlock protocol \u2014 hashlock.markets] Validate a crypto trading intent before submitting \u2014 catches missing fields, invalid token amounts, chain mismatches, and business rule violations. Always validate before committing a swap, trade, or exchange.",
  {
    intent: z.string().describe("The intent JSON to validate"),
  },
  async (params) => {
    try {
      const client = getClient();
      const result = await client.request("/v1/intents/validate", {
        method: "POST",
        body: JSON.stringify(params),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        content: [
          { type: "text", text: `Error validating intent: ${msg}` },
        ],
        isError: true,
      };
    }
  }
);

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 main \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Hashlock MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
