// src/index.ts
import { randomUUID } from "node:crypto";
import { mkdir as mkdir2, writeFile as writeFile2 } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname as dirname2, join as join2, relative } from "node:path";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  getMarkdownTheme,
  truncateHead
} from "@mariozechner/pi-coding-agent";
import {
  Box,
  Editor,
  getKeybindings,
  Key,
  Markdown,
  matchesKey,
  Text,
  truncateToWidth,
  visibleWidth,
  wrapTextWithAnsi
} from "@mariozechner/pi-tui";
import { Type as Type16 } from "typebox";

// src/config.ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getAgentDir } from "@mariozechner/pi-coding-agent";

// src/config-values.ts
import { execSync } from "node:child_process";
var commandValueCache = /* @__PURE__ */ new Map();
function resolveConfigValue(reference) {
  if (!reference) return void 0;
  if (reference.startsWith("!")) {
    const cached = commandValueCache.get(reference);
    if (cached) {
      if (cached.errorMessage) {
        throw new Error(cached.errorMessage);
      }
      return cached.value;
    }
    try {
      const output = execSync(reference.slice(1), {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"]
      }).trim();
      const value = output.length > 0 ? output : void 0;
      commandValueCache.set(reference, { value });
      return value;
    } catch (error) {
      const errorMessage = error.message;
      commandValueCache.set(reference, { errorMessage });
      throw error;
    }
  }
  const envValue = process.env[reference];
  if (envValue !== void 0) {
    return envValue;
  }
  if (/^[A-Z][A-Z0-9_]*$/.test(reference)) {
    return void 0;
  }
  return reference;
}
function hasConfigValue(reference) {
  if (!reference) return false;
  if (reference.startsWith("!")) {
    return reference.slice(1).trim().length > 0;
  }
  const envValue = process.env[reference];
  if (envValue !== void 0) {
    return envValue.length > 0;
  }
  if (/^[A-Z][A-Z0-9_]*$/.test(reference)) {
    return false;
  }
  return reference.length > 0;
}
function resolveEnvMap(envMap) {
  if (!envMap) return void 0;
  const resolved = Object.fromEntries(
    Object.entries(envMap).map(([key, value]) => [key, resolveConfigValue(value)]).filter(
      (entry) => typeof entry[1] === "string"
    )
  );
  return Object.keys(resolved).length > 0 ? resolved : void 0;
}

// src/providers/brave.ts
import { Type } from "typebox";

// src/providers/definition.ts
function defineCapability(definition) {
  return definition;
}
function defineProvider(definition) {
  return definition;
}
function defineProviders(providers) {
  return providers;
}
async function executeProviderCapability(definition, capability, input, context) {
  const handler = definition.capabilities[capability];
  if (!handler) {
    throw new Error(
      `Provider '${definition.id}' does not support '${capability}'.`
    );
  }
  return await handler.execute(input, context);
}

// src/providers/shared.ts
function trimSnippet(input, maxLength = 300) {
  const text = (input ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}\u2026`;
}
function normalizeContentText(input) {
  const text = (input ?? "").replace(/\r/g, "").trim();
  if (!text) {
    return "";
  }
  return text.split("\n").map((line) => line.replace(/[ \t]+$/g, "")).join("\n").replace(/\n{3,}/g, "\n\n");
}
function asJsonObject(value) {
  return value ? { ...value } : {};
}
function formatJson(value) {
  return JSON.stringify(value, null, 2);
}
function getApiKeyStatus(apiKeyReference) {
  return hasConfigValue(apiKeyReference) ? { state: "ready" } : { state: "missing_api_key" };
}

// src/providers/brave.ts
var DEFAULT_BASE_URL = "https://api.search.brave.com";
var BRAVE_API_VERSION = void 0;
var countryOption = Type.Optional(
  Type.String({
    description: "Country code used to localize Brave results, for example 'US'."
  })
);
var searchLangOption = Type.Optional(
  Type.String({
    description: "Content language for Brave results, for example 'en'."
  })
);
var uiLangOption = Type.Optional(
  Type.String({
    description: "UI language for response metadata, for example 'en-US'."
  })
);
var freshnessOption = Type.Optional(
  Type.String({
    description: "Freshness filter such as 'pd' (24h), 'pw' (7d), 'pm' (31d), 'py' (year), or a Brave date range."
  })
);
var safesearchOption = Type.Optional(
  Type.Enum({ off: "off", moderate: "moderate", strict: "strict" }, {
    description: "Safe-search filtering level."
  })
);
var spellcheckOption = Type.Optional(
  Type.Boolean({ description: "Whether Brave may spellcheck the query." })
);
var countOption = Type.Optional(
  Type.Integer({
    minimum: 1,
    maximum: 50,
    description: "Mode-specific result count override. Prefer top-level maxResults unless Brave-specific pagination is needed."
  })
);
var offsetOption = Type.Optional(
  Type.Integer({
    minimum: 0,
    description: "Brave result page offset for paginated requests."
  })
);
var gogglesOption = Type.Optional(
  Type.String({ description: "Brave Goggles URL or inline definition." })
);
var extraSnippetsOption = Type.Optional(
  Type.Boolean({ description: "Whether to ask Brave for extra snippets." })
);
var braveSearchOptionsSchema = Type.Object(
  {
    mode: Type.Optional(
      Type.Enum(
        {
          web: "web",
          llm_context: "llm_context",
          news: "news",
          videos: "videos",
          images: "images",
          places: "places"
        },
        {
          description: "Brave search mode. Use 'news' for recent journalism or current events, 'videos' for clips/tutorials, 'images' for visual references, 'places' for local businesses, venues, cafes, restaurants, hotels, shops, or near/in-location searches, and 'llm_context' for retrieval context."
        }
      )
    ),
    common: Type.Optional(
      Type.Object(
        {
          country: countryOption,
          search_lang: searchLangOption,
          ui_lang: uiLangOption
        },
        {
          description: "Common Brave query options merged into the selected mode's options."
        }
      )
    ),
    web: Type.Optional(
      Type.Object(
        {
          country: countryOption,
          search_lang: searchLangOption,
          ui_lang: uiLangOption,
          freshness: freshnessOption,
          safesearch: safesearchOption,
          spellcheck: spellcheckOption,
          goggles: gogglesOption,
          extra_snippets: extraSnippetsOption,
          offset: offsetOption,
          enable_rich_callback: Type.Optional(
            Type.Boolean({
              description: "Whether to enable Brave rich callback metadata."
            })
          )
        },
        { description: "Options for Brave Web Search mode." }
      )
    ),
    llmContext: Type.Optional(
      Type.Object(
        {
          count: countOption,
          maximum_number_of_urls: Type.Optional(
            Type.Integer({ minimum: 1, description: "Maximum source URLs." })
          ),
          maximum_number_of_tokens: Type.Optional(
            Type.Integer({
              minimum: 1,
              description: "Maximum context tokens."
            })
          ),
          maximum_number_of_snippets: Type.Optional(
            Type.Integer({ minimum: 1, description: "Maximum snippets." })
          ),
          maximum_number_of_tokens_per_url: Type.Optional(
            Type.Integer({
              minimum: 1,
              description: "Maximum context tokens per URL."
            })
          ),
          maximum_number_of_snippets_per_url: Type.Optional(
            Type.Integer({
              minimum: 1,
              description: "Maximum snippets per URL."
            })
          ),
          context_threshold_mode: Type.Optional(
            Type.String({ description: "Brave LLM Context threshold mode." })
          ),
          enable_local: Type.Optional(
            Type.Boolean({ description: "Whether to include local results." })
          ),
          enable_source_metadata: Type.Optional(
            Type.Boolean({
              description: "Whether to include source metadata in grounding."
            })
          ),
          country: countryOption,
          search_lang: searchLangOption,
          ui_lang: uiLangOption,
          freshness: freshnessOption,
          safesearch: safesearchOption,
          spellcheck: spellcheckOption,
          goggles: gogglesOption
        },
        { description: "Options for Brave LLM Context mode." }
      )
    ),
    news: Type.Optional(
      Type.Object(
        {
          country: countryOption,
          search_lang: searchLangOption,
          ui_lang: uiLangOption,
          freshness: freshnessOption,
          safesearch: safesearchOption,
          spellcheck: spellcheckOption,
          goggles: gogglesOption,
          extra_snippets: extraSnippetsOption,
          offset: offsetOption,
          count: countOption
        },
        { description: "Options for Brave News Search mode." }
      )
    ),
    videos: Type.Optional(
      Type.Object(
        {
          country: countryOption,
          search_lang: searchLangOption,
          ui_lang: uiLangOption,
          freshness: freshnessOption,
          safesearch: safesearchOption,
          spellcheck: spellcheckOption,
          offset: offsetOption,
          count: countOption
        },
        { description: "Options for Brave Video Search mode." }
      )
    ),
    images: Type.Optional(
      Type.Object(
        {
          country: countryOption,
          search_lang: searchLangOption,
          ui_lang: uiLangOption,
          safesearch: safesearchOption,
          spellcheck: spellcheckOption,
          count: countOption
        },
        { description: "Options for Brave Image Search mode." }
      )
    ),
    places: Type.Optional(
      Type.Object(
        {
          country: countryOption,
          search_lang: searchLangOption,
          ui_lang: uiLangOption,
          latitude: Type.Optional(
            Type.Number({ description: "Latitude for local place search." })
          ),
          longitude: Type.Optional(
            Type.Number({ description: "Longitude for local place search." })
          ),
          location: Type.Optional(
            Type.String({
              description: "Human-readable local search location, e.g. 'Eppendorf, Hamburg, Germany'. Use with mode='places' for neighborhood or near-me style searches."
            })
          ),
          radius: Type.Optional(
            Type.Number({ description: "Local search radius." })
          ),
          units: Type.Optional(
            Type.String({ description: "Distance units for local search." })
          ),
          safesearch: safesearchOption,
          spellcheck: spellcheckOption,
          geoloc: Type.Optional(
            Type.String({
              description: "Optional geolocation token used to refine results."
            })
          ),
          count: countOption,
          includeDetails: Type.Optional(
            Type.Boolean({
              description: "Places mode only. Fetch detailed POI metadata when the task needs contact info, opening hours, ratings/review counts, photos, profiles, or richer address/distance data. Leave off for simple place listings to avoid extra latency and quota usage."
            })
          ),
          includeDescriptions: Type.Optional(
            Type.Boolean({
              description: "Places mode only. Fetch AI-generated POI descriptions when the task needs qualitative summaries or short explanations of places. Leave off for simple nearby/place listing queries to avoid extra latency and quota usage."
            })
          )
        },
        { description: "Options for Brave Local Place Search mode." }
      )
    )
  },
  { description: "Brave search options." }
);
var braveSearchPromptGuidelines = [
  "Use Brave places mode for direct point-of-interest listings such as restaurants, cafes, hotels, shops, landmarks, or venues.",
  "Prefer Brave places mode over llm_context when the user asks for nearby businesses or wants names, addresses, ratings, opening hours, categories, or contact details.",
  "In Brave places mode, set places.includeDetails when the task needs POI attributes beyond the basic result list, such as contact info, opening hours, ratings/review counts, photos, profiles, or richer address/distance metadata.",
  "In Brave places mode, set places.includeDescriptions when the task needs qualitative summaries or short explanations of places. Leave it off for simple nearby/place listing queries to avoid extra latency and quota usage.",
  "Use Brave llm_context mode when the agent needs extracted source context for reasoning, synthesis, RAG-style grounding, or source-material collection.",
  "In Brave llm_context mode, set llmContext.enable_local=true for local or near-me queries where POI/map grounding may be useful."
];
var braveAnswerOptionsSchema = Type.Object(
  {
    country: Type.Optional(Type.String()),
    language: Type.Optional(Type.String()),
    enable_citations: Type.Optional(Type.Boolean()),
    enable_entities: Type.Optional(Type.Boolean()),
    max_completion_tokens: Type.Optional(Type.Integer({ minimum: 1 }))
  },
  { description: "Brave answer options." }
);
var braveResearchOptionsSchema = Type.Object(
  {
    country: Type.Optional(Type.String()),
    language: Type.Optional(Type.String()),
    enable_entities: Type.Optional(Type.Boolean()),
    enable_citations: Type.Optional(
      Type.Boolean({
        description: "Accepted for compatibility but forced to false for Brave research mode."
      })
    ),
    max_completion_tokens: Type.Optional(Type.Integer({ minimum: 1 })),
    research_allow_thinking: Type.Optional(Type.Boolean()),
    research_maximum_number_of_tokens_per_query: Type.Optional(
      Type.Integer({ minimum: 1 })
    ),
    research_maximum_number_of_queries: Type.Optional(
      Type.Integer({ minimum: 1 })
    ),
    research_maximum_number_of_iterations: Type.Optional(
      Type.Integer({ minimum: 1 })
    ),
    research_maximum_number_of_seconds: Type.Optional(
      Type.Integer({ minimum: 1 })
    ),
    research_maximum_number_of_results_per_query: Type.Optional(
      Type.Integer({ minimum: 1 })
    )
  },
  { description: "Brave research options." }
);
var braveImplementation = {
  id: "brave",
  label: "Brave",
  docsUrl: "https://api-dashboard.search.brave.com/app/documentation",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
        return braveSearchOptionsSchema;
      case "answer":
        return braveAnswerOptionsSchema;
      case "research":
        return braveResearchOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      credentials: {
        search: "BRAVE_SEARCH_API_KEY",
        answers: "BRAVE_ANSWERS_API_KEY"
      },
      options: {}
    };
  },
  getCapabilityStatus(config, _cwd, tool) {
    const key = tool === "answer" || tool === "research" ? config?.credentials?.answers : config?.credentials?.search;
    if (tool) {
      return hasConfigValue(key) ? { state: "ready" } : { state: "missing_api_key" };
    }
    return [
      config?.credentials?.search,
      config?.credentials?.answers,
      config?.credentials?.autosuggest
    ].some((v) => hasConfigValue(v)) ? { state: "ready" } : { state: "missing_api_key" };
  },
  async search(query2, maxResults, config, context, options) {
    const apiKey = requireKey(config.credentials?.search, "Brave search");
    const defaults = asJsonObject(
      config.options?.search
    );
    const callOptions = { ...defaults, ...options ?? {} };
    const mode = readMode(callOptions.mode);
    if (mode === "llm_context")
      return await llmContext(
        query2,
        maxResults,
        config,
        context,
        apiKey,
        callOptions
      );
    if (mode === "news")
      return await news(
        query2,
        maxResults,
        config,
        context,
        apiKey,
        callOptions
      );
    if (mode === "videos")
      return await videos(
        query2,
        maxResults,
        config,
        context,
        apiKey,
        callOptions
      );
    if (mode === "images")
      return await images(
        query2,
        maxResults,
        config,
        context,
        apiKey,
        callOptions
      );
    if (mode === "places")
      return await places(
        query2,
        maxResults,
        config,
        context,
        apiKey,
        callOptions
      );
    return await web(query2, maxResults, config, context, apiKey, callOptions);
  },
  async answer(query2, config, context, options) {
    const raw = {
      ...asJsonObject(
        config.options?.answer
      ),
      ...options ?? {}
    };
    return await completion(query2, config, context, buildAnswerRequest(raw));
  },
  async research(input, config, context, options) {
    const raw = {
      ...asJsonObject(
        config.options?.research
      ),
      ...options ?? {}
    };
    return await completion(input, config, context, buildResearchRequest(raw));
  }
};
function requireKey(ref, label) {
  const key = resolveConfigValue(ref);
  if (!key) throw new Error(`${label} is missing an API key`);
  return key;
}
function base(config) {
  return (resolveConfigValue(config.baseUrl) ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    ""
  );
}
function clamp(n, max = 20) {
  return Math.max(1, Math.min(max, Math.trunc(n || 0)));
}
function readMode(v) {
  return v === "llm_context" || v === "news" || v === "videos" || v === "images" || v === "places" ? v : "web";
}
function obj(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};
}
function arr(v) {
  return Array.isArray(v) ? v : [];
}
function str(v) {
  return typeof v === "string" ? v : void 0;
}
function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : void 0;
}
function pick(source, allowed) {
  return Object.fromEntries(
    allowed.filter((k) => source[k] !== void 0).map((k) => [k, source[k]])
  );
}
function mergeOptions(options, key, allowed) {
  return pick({ ...obj(options.common), ...obj(options[key]) }, allowed);
}
function headers(key, json = false) {
  const result = { "X-Subscription-Token": key };
  if (BRAVE_API_VERSION) {
    result["Api-Version"] = BRAVE_API_VERSION;
  }
  if (json) {
    result["content-type"] = "application/json";
  }
  return result;
}
function url(config, path, params) {
  const u = new URL(`${base(config)}${path}`);
  for (const [k, v] of Object.entries(params))
    if (v !== void 0)
      u.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
  return u;
}
async function httpError(response) {
  const text = (await response.text()).trim();
  return `Brave API request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ""})${text ? `: ${text}` : "."}`;
}
async function web(query2, maxResults, config, context, key, options) {
  const params = {
    q: query2,
    count: clamp(maxResults),
    text_decorations: false,
    ...mergeOptions(options, "web", [
      "country",
      "search_lang",
      "ui_lang",
      "freshness",
      "safesearch",
      "spellcheck",
      "goggles",
      "extra_snippets",
      "offset",
      "enable_rich_callback"
    ])
  };
  const r = await fetch(url(config, "/res/v1/web/search", params), {
    headers: headers(key),
    signal: context.signal
  });
  if (!r.ok) throw new Error(await httpError(r));
  const p = obj(await r.json());
  return {
    provider: "brave",
    results: arr(obj(p.web).results).map((e) => {
      const x = obj(e);
      const u = str(x.url) ?? "";
      return {
        title: str(x.title) || u || "Untitled",
        url: u,
        snippet: trimSnippet(
          str(x.description) ?? arr(x.extra_snippets).join(" ")
        ),
        metadata: x
      };
    }).slice(0, clamp(maxResults))
  };
}
async function llmContext(query2, maxResults, config, context, key, options) {
  const params = {
    q: query2,
    count: clamp(maxResults),
    maximum_number_of_urls: clamp(maxResults),
    maximum_number_of_tokens: 8192,
    enable_source_metadata: true,
    ...mergeOptions(options, "llmContext", [
      "count",
      "maximum_number_of_urls",
      "maximum_number_of_tokens",
      "maximum_number_of_snippets",
      "maximum_number_of_tokens_per_url",
      "maximum_number_of_snippets_per_url",
      "context_threshold_mode",
      "enable_local",
      "enable_source_metadata",
      "country",
      "search_lang",
      "ui_lang",
      "freshness",
      "safesearch",
      "spellcheck",
      "goggles"
    ])
  };
  const r = await fetch(url(config, "/res/v1/llm/context", params), {
    headers: headers(key),
    signal: context.signal
  });
  if (!r.ok) throw new Error(await httpError(r));
  const p = obj(await r.json());
  return {
    provider: "brave",
    results: collectLlmContextEntries(obj(p.grounding)).map((e) => {
      const x = obj(e);
      const snippets = arr(x.snippets).map(String);
      const source = obj(x.source);
      const u = str(x.url) ?? str(source.url) ?? "";
      return {
        title: str(x.title) ?? str(x.name) ?? str(source.title) ?? (u || "Untitled"),
        url: u,
        snippet: trimSnippet(snippets.join("\n\n"), 1200),
        metadata: x
      };
    }).slice(0, clamp(maxResults))
  };
}
function collectLlmContextEntries(grounding) {
  const entries = [];
  for (const value of [grounding.generic, grounding.map]) {
    entries.push(...arr(value).map(obj));
  }
  const poiEntries = Array.isArray(grounding.poi) ? grounding.poi.map(obj) : [obj(grounding.poi)];
  entries.push(...poiEntries.filter((entry) => Object.keys(entry).length > 0));
  return entries;
}
async function news(query2, maxResults, config, context, key, options) {
  const params = {
    q: query2,
    count: clamp(maxResults, 50),
    ...mergeOptions(options, "news", [
      "country",
      "search_lang",
      "ui_lang",
      "freshness",
      "safesearch",
      "spellcheck",
      "goggles",
      "extra_snippets",
      "offset",
      "count"
    ])
  };
  const r = await fetch(url(config, "/res/v1/news/search", params), {
    headers: headers(key),
    signal: context.signal
  });
  if (!r.ok) throw new Error(await httpError(r));
  const p = obj(await r.json());
  return {
    provider: "brave",
    results: arr(p.results).map((e) => {
      const x = obj(e);
      const u = str(x.url) ?? "";
      const source = str(x.source) ?? str(x.source_name);
      return {
        title: str(x.title) || u || "Untitled",
        url: u,
        snippet: trimSnippet(
          [
            str(x.description) ?? arr(x.extra_snippets).join(" "),
            source,
            str(x.age) ?? str(x.page_age)
          ].filter(Boolean).join(" \u2014 ")
        ),
        metadata: x
      };
    }).slice(0, clamp(maxResults, 50))
  };
}
async function videos(query2, maxResults, config, context, key, options) {
  const params = {
    q: query2,
    count: clamp(maxResults, 50),
    ...mergeOptions(options, "videos", [
      "country",
      "search_lang",
      "ui_lang",
      "freshness",
      "safesearch",
      "spellcheck",
      "offset",
      "count"
    ])
  };
  const r = await fetch(url(config, "/res/v1/videos/search", params), {
    headers: headers(key),
    signal: context.signal
  });
  if (!r.ok) throw new Error(await httpError(r));
  const p = obj(await r.json());
  return {
    provider: "brave",
    results: arr(p.results).map((e) => {
      const x = obj(e);
      const u = str(x.url) ?? "";
      const video = obj(x.video);
      return {
        title: str(x.title) || u || "Untitled",
        url: u,
        snippet: trimSnippet(
          [
            str(x.description),
            str(video.creator) ?? str(x.creator),
            str(video.duration) ?? str(x.duration),
            num(video.views) ? `${num(video.views)} views` : void 0,
            str(x.age) ?? str(x.page_age)
          ].filter(Boolean).join(" \u2014 ")
        ),
        metadata: x
      };
    }).slice(0, clamp(maxResults, 50))
  };
}
async function images(query2, maxResults, config, context, key, options) {
  const params = {
    q: query2,
    count: clamp(maxResults),
    ...mergeOptions(options, "images", [
      "country",
      "search_lang",
      "ui_lang",
      "safesearch",
      "spellcheck",
      "count"
    ])
  };
  const r = await fetch(url(config, "/res/v1/images/search", params), {
    headers: headers(key),
    signal: context.signal
  });
  if (!r.ok) throw new Error(await httpError(r));
  const p = obj(await r.json());
  return {
    provider: "brave",
    results: arr(p.results).map((e) => {
      const x = obj(e);
      const props = obj(x.properties);
      const page = str(x.url) ?? str(x.source) ?? str(props.url) ?? "";
      const image = str(props.url);
      return {
        title: str(x.title) || page || "Untitled",
        url: page || image || "",
        snippet: trimSnippet(
          [str(x.description), str(x.publisher), image].filter(Boolean).join(" \u2014 ")
        ),
        metadata: x
      };
    }).slice(0, clamp(maxResults))
  };
}
async function places(query2, maxResults, config, context, key, options) {
  const placeOptions = obj(options.places);
  const params = {
    q: query2,
    count: clamp(maxResults),
    ...mergeOptions(options, "places", [
      "country",
      "search_lang",
      "ui_lang",
      "latitude",
      "longitude",
      "location",
      "radius",
      "units",
      "safesearch",
      "spellcheck",
      "geoloc",
      "count"
    ])
  };
  const r = await fetch(url(config, "/res/v1/local/place_search", params), {
    headers: headers(key),
    signal: context.signal
  });
  if (!r.ok) throw new Error(await httpError(r));
  const p = obj(await r.json());
  const rows = arr(p.results).slice(0, clamp(maxResults));
  const ids = rows.map((e) => str(obj(e).id)).filter((id) => id !== void 0);
  const [detailsById, descriptionsById] = await Promise.all([
    placeOptions.includeDetails && ids.length > 0 ? fetchPlaceDetails(
      config,
      context,
      key,
      ids,
      pick(params, ["search_lang", "ui_lang", "units"])
    ) : Promise.resolve(/* @__PURE__ */ new Map()),
    placeOptions.includeDescriptions && ids.length > 0 ? fetchPlaceDescriptions(config, context, key, ids) : Promise.resolve(/* @__PURE__ */ new Map())
  ]);
  return {
    provider: "brave",
    results: rows.map((e) => {
      const x = obj(e);
      const id = str(x.id);
      const details = id ? detailsById.get(id) : void 0;
      const description = id ? descriptionsById.get(id) : void 0;
      const u = str(x.url) ?? str(x.provider_url) ?? "";
      return {
        title: str(x.title) || u || "Untitled",
        url: u,
        snippet: trimSnippet(
          [
            placeDescriptionText(description) ?? str(x.description),
            placeAddress(x, details),
            arr(x.categories).join(", "),
            placeRating(x, details)
          ].filter(Boolean).join(" \u2014 ")
        ),
        metadata: {
          ...x,
          ...details ? { poiDetails: details } : {},
          ...description ? { poiDescription: description } : {}
        }
      };
    })
  };
}
async function fetchPlaceDetails(config, context, key, ids, options) {
  const r = await fetch(
    urlWithRepeatedArrays(config, "/res/v1/local/pois", {
      ids: ids.slice(0, 20),
      ...options
    }),
    {
      headers: headers(key),
      signal: context.signal
    }
  );
  if (!r.ok) throw new Error(await httpError(r));
  return indexById(arr(obj(await r.json()).results));
}
async function fetchPlaceDescriptions(config, context, key, ids) {
  const r = await fetch(
    urlWithRepeatedArrays(config, "/res/v1/local/descriptions", {
      ids: ids.slice(0, 20)
    }),
    {
      headers: headers(key),
      signal: context.signal
    }
  );
  if (!r.ok) throw new Error(await httpError(r));
  return indexById(arr(obj(await r.json()).results));
}
function urlWithRepeatedArrays(config, path, params) {
  const u = new URL(`${base(config)}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === void 0) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        u.searchParams.append(k, String(item));
      }
    } else {
      u.searchParams.set(k, String(v));
    }
  }
  return u;
}
function indexById(values) {
  const result = /* @__PURE__ */ new Map();
  for (const value of values) {
    const entry = obj(value);
    const id = str(entry.id);
    if (id) {
      result.set(id, entry);
    }
  }
  return result;
}
function placeDescriptionText(description) {
  if (!description) return void 0;
  return str(description.description) ?? str(description.text) ?? str(description.summary) ?? str(obj(description.description).text);
}
function placeAddress(place, details) {
  return str(place.address) ?? str(obj(place.postal_address).displayAddress) ?? str(details?.address) ?? str(obj(details?.postal_address).displayAddress);
}
function placeRating(place, details) {
  const rating = num(place.rating) ?? num(obj(place.rating).ratingValue) ?? num(details?.rating) ?? num(obj(details?.rating).ratingValue);
  return rating === void 0 ? void 0 : `Rating: ${rating}`;
}
function buildAnswerRequest(raw) {
  const answerOptions = pick(raw, [
    "country",
    "language",
    "safesearch",
    "enable_entities",
    "enable_citations"
  ]);
  if (answerOptions.enable_citations === void 0) {
    answerOptions.enable_citations = true;
  }
  const stream = answerOptions.enable_citations === true || answerOptions.enable_entities === true;
  return {
    stream,
    ...pick(raw, ["max_completion_tokens", "metadata", "seed"]),
    ...answerOptions
  };
}
function buildResearchRequest(raw) {
  const researchOptions = pick(raw, [
    "country",
    "language",
    "safesearch",
    "enable_entities",
    "research_allow_thinking",
    "research_maximum_number_of_tokens_per_query",
    "research_maximum_number_of_queries",
    "research_maximum_number_of_iterations",
    "research_maximum_number_of_seconds",
    "research_maximum_number_of_results_per_query"
  ]);
  return {
    stream: true,
    ...pick(raw, ["max_completion_tokens", "metadata", "seed"]),
    ...researchOptions,
    enable_research: true,
    enable_citations: false
  };
}
async function completion(input, config, context, request) {
  const key = requireKey(config.credentials?.answers, "Brave Answers");
  const body = {
    model: "brave",
    messages: [{ role: "user", content: input }],
    ...request
  };
  const r = await fetch(`${base(config)}/res/v1/chat/completions`, {
    method: "POST",
    headers: headers(key, true),
    body: JSON.stringify(body),
    signal: context.signal
  });
  if (!r.ok) throw new Error(await httpError(r));
  const text = await r.text();
  const parsed = body.stream === false ? parseAnswerJson(text) : parseAnswerStream(text);
  const lines = [parsed.answer.trim() || text.trim()];
  if (parsed.citations.length) {
    lines.push("", "Sources:");
    parsed.citations.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.title ?? c.url ?? "Source"}`);
      if (c.url) lines.push(`   ${c.url}`);
    });
  }
  const metadata = buildAnswerMetadata(parsed);
  return {
    provider: "brave",
    text: lines.join("\n").trimEnd(),
    itemCount: parsed.citations.length,
    ...metadata ? { metadata } : {}
  };
}
function buildAnswerMetadata(parsed) {
  const metadata = {};
  if (parsed.usage) {
    metadata.usage = parsed.usage;
  }
  if (parsed.entities.length) {
    metadata.entities = parsed.entities;
  }
  return Object.keys(metadata).length > 0 ? metadata : void 0;
}
function parseAnswerJson(text) {
  const payload = obj(JSON.parse(text));
  const choice = obj(arr(payload.choices)[0]);
  const message = obj(choice.message);
  const content = str(message.content) ?? "";
  const tags = extractBraveTags(content);
  return {
    answer: tags.text,
    citations: dedupeCitations(tags.citations),
    entities: tags.entities,
    usage: payload.usage ?? tags.usage
  };
}
function parseAnswerStream(text) {
  let rawAnswer = "";
  for (const line of text.split(/\r?\n/)) {
    const data = line.startsWith("data:") ? line.slice(5).trim() : line.trim();
    if (!data || data === "[DONE]") continue;
    try {
      const parsed = obj(JSON.parse(data));
      const choice = obj(arr(parsed.choices)[0]);
      const delta = str(obj(choice.delta).content);
      if (delta) {
        rawAnswer += delta;
      }
    } catch {
      rawAnswer += data;
    }
  }
  const tags = extractBraveTags(rawAnswer);
  return {
    answer: tags.text,
    citations: dedupeCitations(tags.citations),
    entities: tags.entities,
    usage: tags.usage
  };
}
function extractBraveTags(text) {
  const citations = [];
  const entities = [];
  let usage;
  let cleaned = "";
  let offset = 0;
  while (offset < text.length) {
    const tagStart = text.indexOf("<", offset);
    if (tagStart === -1) {
      cleaned += text.slice(offset);
      break;
    }
    const parsedTag = readBraveTagStart(text, tagStart);
    if (!parsedTag) {
      cleaned += text.slice(offset, tagStart + 1);
      offset = tagStart + 1;
      continue;
    }
    const jsonEnd = findJsonValueEnd(text, parsedTag.jsonStart);
    if (jsonEnd === -1) {
      cleaned += text.slice(offset);
      break;
    }
    cleaned += text.slice(offset, tagStart);
    const json = text.slice(parsedTag.jsonStart, jsonEnd + 1);
    try {
      const parsed = JSON.parse(json);
      if (parsedTag.tag === "answer") {
        cleaned += str(parsed.answer) ?? str(parsed.text) ?? "";
      } else if (parsedTag.tag === "citation") {
        citations.push({
          title: str(parsed.title),
          url: str(parsed.url)
        });
      } else if (parsedTag.tag === "enum_item") {
        const item = obj(parsed);
        entities.push(item);
        cleaned += str(item.original_tokens) ?? str(item.name) ?? str(item.href) ?? "";
      } else if (parsedTag.tag === "usage") {
        usage = parsed;
      }
    } catch {
    }
    const closing = `</${parsedTag.tag}>`;
    const abbreviatedClosing = `</${parsedTag.tag}`;
    if (text.startsWith(closing, jsonEnd + 1)) {
      offset = jsonEnd + 1 + closing.length;
    } else if (text.startsWith(abbreviatedClosing, jsonEnd + 1)) {
      offset = jsonEnd + 1 + abbreviatedClosing.length;
    } else {
      offset = jsonEnd + 1;
    }
  }
  return { text: cleaned, citations, entities, usage };
}
var BRAVE_STRUCTURED_TAGS = /* @__PURE__ */ new Set([
  "analyzing",
  "answer",
  "blindspots",
  "citation",
  "enum_item",
  "progress",
  "queries",
  "thinking",
  "usage"
]);
function readBraveTagStart(text, tagStart) {
  const match = /^<([A-Za-z_][A-Za-z0-9_-]*)(>)?[{[]/.exec(
    text.slice(tagStart)
  );
  if (!match) return void 0;
  const tag = match[1];
  if (!BRAVE_STRUCTURED_TAGS.has(tag)) return void 0;
  return {
    tag,
    jsonStart: tagStart + match[0].length - 1
  };
}
function findJsonValueEnd(text, start) {
  const first = text[start];
  const closing = first === "{" ? "}" : first === "[" ? "]" : void 0;
  if (!closing) return -1;
  const stack = [];
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") {
      stack.push("}");
    } else if (char === "[") {
      stack.push("]");
    } else if (char === "}" || char === "]") {
      if (stack.pop() !== char) return -1;
      if (stack.length === 0) return index;
    }
  }
  return -1;
}
function dedupeCitations(citations) {
  const seen = /* @__PURE__ */ new Set();
  return citations.filter((citation) => {
    const key = citation.url ?? citation.title;
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
var braveProvider = defineProvider({
  id: "brave",
  label: braveImplementation.label,
  docsUrl: braveImplementation.docsUrl,
  config: {
    createTemplate: () => braveImplementation.createTemplate(),
    fields: ["credentials", "baseUrl", "options", "settings"],
    credentials: {
      search: "BRAVE_SEARCH_API_KEY",
      answers: "BRAVE_ANSWERS_API_KEY",
      autosuggest: "BRAVE_AUTOSUGGEST_API_KEY"
    },
    optionCapabilities: ["search", "answer", "research"]
  },
  getCapabilityStatus: (config, cwd, tool) => braveImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: braveImplementation.getToolOptionsSchema("search"),
      promptGuidelines: braveSearchPromptGuidelines,
      async execute(input, ctx) {
        return await braveImplementation.search(
          input.query,
          input.maxResults,
          ctx.config,
          ctx,
          input.options
        );
      }
    }),
    answer: defineCapability({
      options: braveImplementation.getToolOptionsSchema("answer"),
      async execute(input, ctx) {
        return await braveImplementation.answer(
          input.query,
          ctx.config,
          ctx,
          input.options
        );
      }
    }),
    research: defineCapability({
      options: braveImplementation.getToolOptionsSchema("research"),
      async execute(input, ctx) {
        return await braveImplementation.research(
          input.input,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/claude.ts
import { existsSync } from "node:fs";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { Type as Type3 } from "typebox";

// src/providers/schema.ts
import { Type as Type2 } from "typebox";
function literalUnion(values, options) {
  return Type2.Union(
    values.map((value) => Type2.Literal(value)),
    options
  );
}

// src/providers/claude.ts
var SEARCH_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          snippet: { type: "string" }
        },
        required: ["title", "url", "snippet"]
      }
    }
  },
  required: ["sources"]
};
var ANSWER_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          url: { type: "string" }
        },
        required: ["title", "url"]
      }
    }
  },
  required: ["answer", "sources"]
};
var claudeOptionsSchema = Type3.Object(
  {
    model: Type3.Optional(
      Type3.String({ description: "Claude model override." })
    ),
    effort: Type3.Optional(
      literalUnion(["low", "medium", "high", "max"], {
        description: "How much effort Claude should use."
      })
    ),
    maxTurns: Type3.Optional(
      Type3.Integer({
        minimum: 1,
        description: "Maximum number of Claude turns."
      })
    ),
    maxThinkingTokens: Type3.Optional(
      Type3.Integer({ minimum: 0, description: "Maximum thinking tokens." })
    ),
    maxBudgetUsd: Type3.Optional(
      Type3.Number({
        exclusiveMinimum: 0,
        description: "Maximum budget in USD."
      })
    ),
    thinking: Type3.Optional(
      Type3.Object(
        {
          type: Type3.Optional(
            Type3.String({ description: "Claude thinking mode." })
          )
        },
        {
          description: "Claude thinking configuration."
        }
      )
    )
  },
  { description: "Claude options." }
);
var claudeImplementation = {
  id: "claude",
  label: "Claude",
  docsUrl: "https://github.com/anthropics/claude-agent-sdk-typescript",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
      case "answer":
        return claudeOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {};
  },
  getCapabilityStatus(config, _cwd) {
    const executablePath = config?.pathToClaudeCodeExecutable;
    if (executablePath && !existsSync(executablePath)) {
      return { state: "missing_executable" };
    }
    return { state: "ready" };
  },
  async search(queryText, maxResults, config, context, options) {
    const output = parseClaudeSearchOutput(
      await this.runStructuredQuery({
        prompt: [
          "You are performing web research for another coding agent.",
          "Use the WebSearch tool to search the public web.",
          "Return only a JSON object matching the provided schema.",
          "Do not include markdown fences or extra commentary.",
          `Return at most ${maxResults} sources.`,
          "Each snippet should be short, factual, and specific to the result.",
          "Prefer primary or official sources when they are available.",
          "",
          `User query: ${queryText}`
        ].join("\n"),
        schema: SEARCH_OUTPUT_SCHEMA,
        tools: ["WebSearch"],
        config,
        context,
        options
      })
    );
    return {
      provider: this.id,
      results: output.sources.slice(0, maxResults).map((source) => ({
        title: source.title.trim(),
        url: source.url.trim(),
        snippet: trimSnippet(source.snippet)
      }))
    };
  },
  async answer(queryText, config, context, options) {
    const output = parseClaudeAnswerOutput(
      await this.runStructuredQuery({
        prompt: [
          "Answer the user's question using current public web information.",
          "Use WebSearch to find relevant sources and WebFetch when you need to verify important details.",
          "Return only a JSON object matching the provided schema.",
          "Do not include markdown fences or extra commentary.",
          "Keep the answer concise but informative.",
          "Only cite sources you actually used.",
          "",
          `User query: ${queryText}`
        ].join("\n"),
        schema: ANSWER_OUTPUT_SCHEMA,
        tools: ["WebSearch", "WebFetch"],
        config,
        context,
        options
      })
    );
    const lines = [];
    lines.push(output.answer.trim() || "No answer returned.");
    if (output.sources.length > 0) {
      lines.push("");
      lines.push("Sources:");
      for (const [index, source] of output.sources.entries()) {
        lines.push(`${index + 1}. ${source.title}`);
        lines.push(`   ${source.url}`);
      }
    }
    return {
      provider: this.id,
      text: lines.join("\n").trimEnd(),
      itemCount: output.sources.length
    };
  },
  async runStructuredQuery({
    prompt,
    schema,
    tools,
    config,
    context,
    options
  }) {
    const abortController = new AbortController();
    if (context.signal?.aborted) {
      abortController.abort(context.signal.reason);
    }
    const onAbort = () => {
      abortController.abort(context.signal?.reason);
    };
    context.signal?.addEventListener("abort", onAbort, { once: true });
    const stream = query({
      prompt,
      options: {
        abortController,
        allowedTools: tools,
        cwd: context.cwd,
        ...getClaudeRuntimeOptions(config, options),
        outputFormat: {
          type: "json_schema",
          schema
        },
        pathToClaudeCodeExecutable: config.pathToClaudeCodeExecutable,
        persistSession: false,
        permissionMode: "dontAsk",
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: "Use only the provided web tools. Always produce output that matches the requested JSON schema exactly."
        },
        tools
      }
    });
    let finalResult;
    try {
      for await (const message of stream) {
        if (message.type === "result") {
          finalResult = message;
        }
      }
    } finally {
      context.signal?.removeEventListener("abort", onAbort);
      stream.close();
    }
    if (!finalResult) {
      throw new Error("returned no result");
    }
    if (finalResult.subtype !== "success") {
      throw new Error(
        finalResult.errors.join("\n") || `query failed (${finalResult.subtype})`
      );
    }
    return parseStructuredOutput(finalResult);
  }
};
function parseStructuredOutput(result) {
  if (result.subtype !== "success") {
    throw new Error("query did not succeed");
  }
  if (result.structured_output !== void 0) {
    return result.structured_output;
  }
  if (!result.result.trim()) {
    throw new Error("returned an empty response");
  }
  try {
    return JSON.parse(result.result);
  } catch {
    const match = result.result.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("returned invalid JSON output");
    }
    return JSON.parse(match[0]);
  }
}
function getClaudeRuntimeOptions(config, options) {
  const providerOptions = config.options;
  const model = readNonEmptyString(options?.model) ?? providerOptions?.model;
  const effort = readEnum(options?.effort, ["low", "medium", "high", "max"]);
  const maxTurns = readPositiveInteger(options?.maxTurns);
  const maxThinkingTokens = readNonNegativeInteger(options?.maxThinkingTokens);
  const maxBudgetUsd = readPositiveNumber(options?.maxBudgetUsd);
  const thinking = isPlainObject(options?.thinking) ? options?.thinking : void 0;
  return {
    ...model ? { model } : {},
    ...effort ?? providerOptions?.effort ? { effort: effort ?? providerOptions?.effort } : {},
    ...maxTurns ?? providerOptions?.maxTurns ? { maxTurns: maxTurns ?? providerOptions?.maxTurns } : {},
    ...maxThinkingTokens !== void 0 ? { maxThinkingTokens } : {},
    ...maxBudgetUsd !== void 0 ? { maxBudgetUsd } : {},
    ...thinking ? { thinking } : {}
  };
}
function readNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : void 0;
}
function readPositiveInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : void 0;
}
function readNonNegativeInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : void 0;
}
function readPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
function readEnum(value, values) {
  return typeof value === "string" && values.includes(value) ? value : void 0;
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseClaudeSearchOutput(value) {
  const sources = readArray(value, "sources").map((entry) => ({
    title: readString(entry, "title"),
    url: readString(entry, "url"),
    snippet: readString(entry, "snippet")
  }));
  return { sources };
}
function parseClaudeAnswerOutput(value) {
  return {
    answer: readString(value, "answer"),
    sources: readArray(value, "sources").map((entry) => ({
      title: readString(entry, "title"),
      url: readString(entry, "url")
    }))
  };
}
function readArray(value, key) {
  if (typeof value !== "object" || value === null || !(key in value)) {
    throw new Error(`output is missing '${key}'`);
  }
  const entry = value[key];
  if (!Array.isArray(entry)) {
    throw new Error(`output field '${key}' must be an array`);
  }
  return entry;
}
function readString(value, key) {
  if (typeof value !== "object" || value === null || !(key in value)) {
    throw new Error(`output is missing '${key}'`);
  }
  const entry = value[key];
  if (typeof entry !== "string") {
    throw new Error(`output field '${key}' must be a string`);
  }
  return entry;
}
var claudeProvider = defineProvider({
  id: "claude",
  label: claudeImplementation.label,
  docsUrl: claudeImplementation.docsUrl,
  config: {
    createTemplate: () => claudeImplementation.createTemplate(),
    fields: ["pathToClaudeCodeExecutable", "options", "settings"]
  },
  getCapabilityStatus: (config, cwd, tool) => claudeImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: claudeImplementation.getToolOptionsSchema?.("search"),
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await claudeImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    }),
    answer: defineCapability({
      options: claudeImplementation.getToolOptionsSchema?.("answer"),
      async execute(input, ctx) {
        return await claudeImplementation.answer(
          input.query,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/cloudflare.ts
import CloudflareClient from "cloudflare";
import { Type as Type4 } from "typebox";
var cloudflareContentsOptionsSchema = Type4.Object(
  {
    gotoOptions: Type4.Optional(
      Type4.Object(
        {
          waitUntil: Type4.Optional(
            literalUnion(
              ["load", "domcontentloaded", "networkidle0", "networkidle2"],
              { description: "When to consider navigation complete." }
            )
          )
        },
        {
          description: "Navigation options."
        }
      )
    )
  },
  {
    description: "Cloudflare Browser Rendering options."
  }
);
var cloudflareImplementation = {
  id: "cloudflare",
  label: "Cloudflare",
  docsUrl: "https://developers.cloudflare.com/browser-rendering/rest-api/markdown-endpoint/",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "contents":
        return cloudflareContentsOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      credentials: { api: "CLOUDFLARE_API_TOKEN" },
      accountId: "CLOUDFLARE_ACCOUNT_ID",
      options: {
        gotoOptions: {
          waitUntil: "networkidle0"
        }
      }
    };
  },
  getCapabilityStatus(config) {
    const apiTokenStatus = getApiKeyStatus(config?.credentials?.api);
    if (apiTokenStatus.state !== "ready") {
      return apiTokenStatus;
    }
    if (!hasConfigValue(config?.accountId)) {
      return { state: "invalid_config", detail: "Missing account ID" };
    }
    return { state: "ready" };
  },
  async contents(urls, config, context, options) {
    const client = createClient(config);
    const accountId = resolveConfigValue(config.accountId);
    if (!accountId) {
      throw new Error("is missing an account ID");
    }
    const defaults = asJsonObject(config.options);
    const answers = await Promise.all(
      urls.map(async (url2) => {
        try {
          const markdown = await client.browserRendering.markdown.create(
            {
              ...defaults ?? {},
              ...options ?? {},
              account_id: accountId,
              url: url2
            },
            buildRequestOptions(context)
          );
          return {
            url: url2,
            content: markdown
          };
        } catch (error) {
          return {
            url: url2,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );
    return {
      provider: cloudflareImplementation.id,
      answers
    };
  }
};
function createClient(config) {
  const apiToken = resolveConfigValue(config.credentials?.api);
  if (!apiToken) {
    throw new Error("is missing an API token");
  }
  return new CloudflareClient({
    apiToken
  });
}
function buildRequestOptions(context) {
  return context.signal ? { signal: context.signal } : void 0;
}
var cloudflareProvider = defineProvider({
  id: "cloudflare",
  label: cloudflareImplementation.label,
  docsUrl: cloudflareImplementation.docsUrl,
  config: {
    createTemplate: () => cloudflareImplementation.createTemplate(),
    fields: ["credentials", "accountId", "options", "settings"]
  },
  getCapabilityStatus: (config, cwd, tool) => cloudflareImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    contents: defineCapability({
      options: cloudflareImplementation.getToolOptionsSchema?.("contents"),
      async execute(input, ctx) {
        return await cloudflareImplementation.contents(
          input.urls,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/codex.ts
import { Codex as CodexClient } from "@openai/codex-sdk";
import { Type as Type5 } from "typebox";
var codexOutputSchema = Type5.Object(
  {
    sources: Type5.Array(
      Type5.Object(
        {
          title: Type5.String(),
          url: Type5.String(),
          snippet: Type5.String()
        },
        { additionalProperties: false }
      )
    )
  },
  { additionalProperties: false }
);
var codexSearchOptionsSchema = Type5.Object(
  {
    model: Type5.Optional(Type5.String({ description: "Codex model override." })),
    modelReasoningEffort: Type5.Optional(
      Type5.Union(
        [
          Type5.Literal("minimal"),
          Type5.Literal("low"),
          Type5.Literal("medium"),
          Type5.Literal("high"),
          Type5.Literal("xhigh")
        ],
        { description: "Reasoning depth for Codex." }
      )
    ),
    webSearchMode: Type5.Optional(
      Type5.Union(
        [
          Type5.Literal("disabled"),
          Type5.Literal("cached"),
          Type5.Literal("live")
        ],
        {
          description: "How Codex should source web results. Use 'live' for current information, 'cached' when freshness is less important, and 'disabled' only when web access should not be used."
        }
      )
    )
  },
  { description: "Codex search options." }
);
var codexImplementation = {
  id: "codex",
  label: "Codex",
  docsUrl: "https://github.com/openai/codex/tree/main/sdk/typescript",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
        return codexSearchOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      options: {
        networkAccessEnabled: true,
        webSearchEnabled: true,
        webSearchMode: "live"
      }
    };
  },
  getCapabilityStatus(config, _cwd) {
    const effectiveConfig = config ?? codexImplementation.createTemplate();
    try {
      new CodexClient({
        codexPathOverride: effectiveConfig.codexPath,
        config: effectiveConfig.config
      });
    } catch (error) {
      return {
        state: "invalid_config",
        detail: error.message
      };
    }
    return { state: "ready" };
  },
  async search(query2, maxResults, config, context, options) {
    const codex = new CodexClient({
      codexPathOverride: config.codexPath,
      baseUrl: config.baseUrl,
      apiKey: resolveConfigValue(config.credentials?.api),
      config: config.config,
      env: resolveEnvMap(config.env)
    });
    const thread = codex.startThread(
      buildCodexSearchThreadOptions(config, context.cwd, options)
    );
    const prompt = [
      "You are performing web research for another coding agent.",
      "Search the public web and return only a JSON object matching the provided schema.",
      "Do not include markdown fences or extra commentary.",
      `Return at most ${maxResults} sources.`,
      "Prefer primary or official sources when they are available.",
      "Each snippet should be short and specific.",
      "",
      `User query: ${query2}`
    ].join("\n");
    const streamed = await thread.runStreamed(prompt, {
      outputSchema: codexOutputSchema,
      signal: context.signal
    });
    let finalResponse = "";
    for await (const event of streamed.events) {
      if (event.type === "item.completed" && event.item.type === "agent_message") {
        finalResponse = event.item.text;
      }
      if (event.type === "turn.failed") {
        throw new Error(event.error.message);
      }
    }
    const parsed = parseOutput(finalResponse);
    return {
      provider: codexImplementation.id,
      results: parsed.sources.slice(0, maxResults).map((source) => ({
        title: source.title.trim(),
        url: source.url.trim(),
        snippet: trimSnippet(source.snippet)
      }))
    };
  }
};
function buildCodexSearchThreadOptions(config, cwd, options) {
  const callOptions = getCodexSearchCallOptions(options);
  const providerOptions = config.options;
  return {
    additionalDirectories: providerOptions?.additionalDirectories,
    approvalPolicy: "never",
    model: callOptions.model ?? providerOptions?.model,
    modelReasoningEffort: callOptions.modelReasoningEffort ?? providerOptions?.modelReasoningEffort,
    networkAccessEnabled: providerOptions?.networkAccessEnabled ?? true,
    sandboxMode: "read-only",
    skipGitRepoCheck: true,
    webSearchEnabled: providerOptions?.webSearchEnabled ?? true,
    webSearchMode: callOptions.webSearchMode ?? providerOptions?.webSearchMode ?? "live",
    workingDirectory: cwd
  };
}
function getCodexSearchCallOptions(options) {
  if (!options) {
    return {};
  }
  const model = readNonEmptyString2(options.model);
  const modelReasoningEffort = readEnum2(options.modelReasoningEffort, [
    "minimal",
    "low",
    "medium",
    "high",
    "xhigh"
  ]);
  const webSearchMode = readEnum2(options.webSearchMode, [
    "disabled",
    "cached",
    "live"
  ]);
  return {
    ...model ? { model } : {},
    ...modelReasoningEffort ? { modelReasoningEffort } : {},
    ...webSearchMode ? { webSearchMode } : {}
  };
}
function readNonEmptyString2(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : void 0;
}
function readEnum2(value, values) {
  return typeof value === "string" && values.includes(value) ? value : void 0;
}
function isJsonObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseOutput(raw) {
  const json = extractJsonObject(raw);
  if (!isJsonObject(json) || !Array.isArray(json.sources) || json.sources.some(
    (source) => !isJsonObject(source) || typeof source.title !== "string" || typeof source.url !== "string" || typeof source.snippet !== "string"
  )) {
    throw new Error("returned invalid JSON output");
  }
  return json;
}
function extractJsonObject(raw) {
  if (!raw.trim()) {
    throw new Error("returned an empty response");
  }
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("returned invalid JSON output");
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      throw new Error("returned invalid JSON output");
    }
  }
}
var codexProvider = defineProvider({
  id: "codex",
  label: codexImplementation.label,
  docsUrl: codexImplementation.docsUrl,
  config: {
    createTemplate: () => codexImplementation.createTemplate(),
    fields: [
      "codexPath",
      "baseUrl",
      "credentials",
      "env",
      "config",
      "options",
      "settings"
    ]
  },
  getCapabilityStatus: (config, cwd, tool) => codexImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: codexImplementation.getToolOptionsSchema?.("search"),
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await codexImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    })
  }
});

// src/providers/cli-json.ts
import { spawn } from "node:child_process";
import { isAbsolute, resolve } from "node:path";
async function runCliJsonCommand({
  command,
  payload,
  context,
  label
}) {
  const argv = normalizeArgv(command);
  const cwd = resolveCommandCwd(command.cwd, context.cwd);
  const env = {
    ...process.env,
    ...resolveEnvMap(command.env) ?? {}
  };
  return await new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    let stdout = "";
    let stderr = "";
    let abortTimer;
    const child = spawn(argv[0], argv.slice(1), {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const rejectOnce = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (abortTimer) {
        clearTimeout(abortTimer);
      }
      context.signal?.removeEventListener("abort", onAbort);
      rejectPromise(error);
    };
    const resolveOnce = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      if (abortTimer) {
        clearTimeout(abortTimer);
      }
      context.signal?.removeEventListener("abort", onAbort);
      resolvePromise(value);
    };
    const onAbort = () => {
      child.kill("SIGTERM");
      abortTimer = setTimeout(() => {
        child.kill("SIGKILL");
      }, 1e3);
    };
    if (context.signal?.aborted) {
      onAbort();
    } else {
      context.signal?.addEventListener("abort", onAbort, { once: true });
    }
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      rejectOnce(
        new Error(
          `${label} failed to start: ${error.message || String(error)}`
        )
      );
    });
    child.on("close", (code, signal) => {
      if (context.signal?.aborted) {
        rejectOnce(new Error(`${label} was aborted.`));
        return;
      }
      if (code !== 0) {
        const detail = stderr.trim() || `exit code ${code ?? "unknown"}`;
        rejectOnce(
          new Error(
            signal ? `${label} exited via signal ${signal}: ${detail}` : `${label} failed with exit code ${code}: ${detail}`
          )
        );
        return;
      }
      const trimmed = stdout.trim();
      if (!trimmed) {
        rejectOnce(new Error(`${label} did not write JSON to stdout.`));
        return;
      }
      try {
        resolveOnce(JSON.parse(trimmed));
      } catch (error) {
        rejectOnce(
          new Error(
            `${label} returned invalid JSON: ${error.message}`
          )
        );
      }
    });
    child.stdin.on("error", () => {
    });
    child.stdin.end(`${JSON.stringify(payload)}
`);
  });
}
function normalizeArgv(command) {
  const argv = command.argv?.filter((entry) => entry.trim().length > 0) ?? [];
  if (argv.length === 0) {
    throw new Error("command is missing argv");
  }
  return argv;
}
function resolveCommandCwd(commandCwd, fallbackCwd) {
  if (!commandCwd || commandCwd.trim().length === 0) {
    return fallbackCwd;
  }
  return isAbsolute(commandCwd) ? commandCwd : resolve(fallbackCwd, commandCwd);
}

// src/providers/custom.ts
var customImplementation = {
  id: "custom",
  label: "Custom",
  docsUrl: "https://github.com/mavam/pi-web-providers#custom-provider",
  getToolOptionsSchema(_capability) {
    return void 0;
  },
  createTemplate() {
    return {};
  },
  getCapabilityStatus(config, _cwd, capability) {
    if (capability) {
      return hasCommandForCapability(config, capability) ? { state: "ready" } : { state: "missing_command" };
    }
    return hasAnyCommand(config) ? { state: "ready" } : { state: "missing_command" };
  },
  async search(query2, maxResults, config, context, options) {
    const output = await runCommand({
      capability: "search",
      payload: {
        capability: "search",
        query: query2,
        maxResults,
        ...options ? { options } : {}
      },
      config,
      context
    });
    return parseSearchResponse(output, customImplementation.id);
  },
  async contents(urls, config, context, options) {
    const output = await runCommand({
      capability: "contents",
      payload: {
        capability: "contents",
        urls,
        ...options ? { options } : {}
      },
      config,
      context
    });
    return parseContentsResponse(output, customImplementation.id);
  },
  async answer(query2, config, context, options) {
    const output = await runCommand({
      capability: "answer",
      payload: {
        capability: "answer",
        query: query2,
        ...options ? { options } : {}
      },
      config,
      context
    });
    return parseToolOutput(output, customImplementation.id);
  },
  async research(input, config, context, options) {
    const output = await runCommand({
      capability: "research",
      payload: {
        capability: "research",
        input,
        ...options ? { options } : {}
      },
      config,
      context
    });
    return parseToolOutput(output, customImplementation.id);
  }
};
async function runCommand({
  capability,
  payload,
  config,
  context
}) {
  const command = getCommandConfig(config, capability);
  if (!command) {
    throw new Error(`has no command configured for ${capability}`);
  }
  return await runCliJsonCommand({
    command,
    payload: {
      ...payload,
      cwd: context.cwd
    },
    context,
    label: `Custom ${capability}`
  });
}
function getCommandConfig(config, capability) {
  return config?.options?.[capability];
}
function hasCommandForCapability(config, capability) {
  return normalizeConfiguredArgv(getCommandConfig(config, capability)).length > 0;
}
function hasAnyCommand(config) {
  return hasCommandForCapability(config, "search") || hasCommandForCapability(config, "contents") || hasCommandForCapability(config, "answer") || hasCommandForCapability(config, "research");
}
function normalizeConfiguredArgv(command) {
  return command?.argv?.filter((entry) => entry.trim().length > 0) ?? [];
}
function parseSearchResponse(value, providerId) {
  const response = requireObject(value, "search output must be a JSON object");
  if (!Array.isArray(response.results)) {
    throw new Error("search output must include a 'results' array");
  }
  return {
    provider: providerId,
    results: response.results.map(
      (entry, index) => parseSearchResult(entry, index)
    )
  };
}
function parseSearchResult(entry, index) {
  const value = requireObject(
    entry,
    `search result at index ${index} must be a JSON object`
  );
  const metadata = readLenientJsonObject(value.metadata);
  return {
    title: readRequiredString(value.title, `results[${index}].title`),
    url: readRequiredString(value.url, `results[${index}].url`),
    snippet: readRequiredString(value.snippet, `results[${index}].snippet`),
    ...typeof value.score === "number" ? { score: value.score } : {},
    ...metadata !== void 0 ? { metadata } : {}
  };
}
function parseContentsResponse(value, providerId) {
  const response = requireObject(
    value,
    "contents output must be a JSON object"
  );
  if (!Array.isArray(response.answers)) {
    throw new Error("contents output must include an 'answers' array");
  }
  return {
    provider: providerId,
    answers: response.answers.map(
      (entry, index) => parseContentsAnswer(entry, index)
    )
  };
}
function parseContentsAnswer(entry, index) {
  const value = requireObject(
    entry,
    `contents answer at index ${index} must be a JSON object`
  );
  const url2 = readRequiredString(value.url, `answers[${index}].url`);
  const content = readOptionalString(
    value.content,
    `answers[${index}].content`
  );
  const summary = value.summary;
  const metadata = readRequiredJsonObject(
    value.metadata,
    `answers[${index}].metadata`
  );
  const error = readOptionalString(value.error, `answers[${index}].error`);
  if (content === void 0 && error === void 0) {
    throw new Error(
      `contents answer at index ${index} must include 'content' or 'error'`
    );
  }
  return {
    url: url2,
    ...content !== void 0 ? { content } : {},
    ...summary !== void 0 ? { summary } : {},
    ...metadata !== void 0 ? { metadata } : {},
    ...error !== void 0 ? { error } : {}
  };
}
function parseToolOutput(value, providerId) {
  const output = requireObject(value, "output must be a JSON object");
  const metadata = readLenientJsonObject(output.metadata);
  return {
    provider: providerId,
    text: readRequiredString(output.text, "text"),
    ...readOptionalNonNegativeInteger(output.itemCount),
    ...metadata !== void 0 ? { metadata } : {}
  };
}
function readRequiredJsonObject(value, field) {
  if (value === void 0) {
    return void 0;
  }
  return requireObject(value, `output field '${field}' must be a JSON object`);
}
function readLenientJsonObject(value) {
  return isJsonObject2(value) ? value : void 0;
}
function readRequiredString(value, field) {
  if (typeof value !== "string") {
    throw new Error(`output field '${field}' must be a string`);
  }
  return value;
}
function readOptionalString(value, field) {
  if (value === void 0) {
    return void 0;
  }
  return readRequiredString(value, field);
}
function readOptionalNonNegativeInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? { itemCount: value } : {};
}
function requireObject(value, message) {
  if (!isJsonObject2(value)) {
    throw new Error(message);
  }
  return value;
}
function isJsonObject2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var customProvider = defineProvider({
  id: "custom",
  label: customImplementation.label,
  docsUrl: customImplementation.docsUrl,
  config: {
    createTemplate: () => customImplementation.createTemplate(),
    fields: ["customOptions", "settings"]
  },
  getCapabilityStatus: (config, cwd, tool) => customImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: customImplementation.getToolOptionsSchema?.("search"),
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await customImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    }),
    contents: defineCapability({
      options: customImplementation.getToolOptionsSchema?.("contents"),
      async execute(input, ctx) {
        return await customImplementation.contents(
          input.urls,
          ctx.config,
          ctx,
          input.options
        );
      }
    }),
    answer: defineCapability({
      options: customImplementation.getToolOptionsSchema?.("answer"),
      async execute(input, ctx) {
        return await customImplementation.answer(
          input.query,
          ctx.config,
          ctx,
          input.options
        );
      }
    }),
    research: defineCapability({
      options: customImplementation.getToolOptionsSchema?.("research"),
      async execute(input, ctx) {
        return await customImplementation.research(
          input.input,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/exa.ts
import { Exa as ExaClient } from "exa-js";
import { Type as Type6 } from "typebox";

// src/execution-policy-defaults.ts
var DEFAULT_REQUEST_TIMEOUT_MS = 3e4;
var DEFAULT_RETRY_COUNT = 3;
var DEFAULT_RETRY_DELAY_MS = 2e3;
var DEFAULT_RESEARCH_POLL_INTERVAL_MS = 3e3;
var DEFAULT_RESEARCH_TIMEOUT_MS = 18e5;
var DEFAULT_RESEARCH_MAX_CONSECUTIVE_POLL_ERRORS = 3;
var DEFAULT_GEMINI_RESEARCH_MAX_CONSECUTIVE_POLL_ERRORS = 10;
function createDefaultExecutionSettings(overrides = {}) {
  return {
    requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    retryCount: DEFAULT_RETRY_COUNT,
    retryDelayMs: DEFAULT_RETRY_DELAY_MS,
    researchTimeoutMs: DEFAULT_RESEARCH_TIMEOUT_MS,
    ...overrides
  };
}

// src/provider-diagnostics.ts
function normalizeDiagnosticDetail(detail) {
  return detail.trim().replace(/[.\s]+$/u, "");
}
function startsWithProviderLabel(providerLabel, detail) {
  return detail.toLowerCase().startsWith(providerLabel.toLowerCase());
}
function readsLikeProviderClause(detail) {
  return /^(is|has|was|returned|did|does|could|cannot|must|should|search\b|contents\b|answer\b|research\b|output\b|response\b|result\b|query\b|no\b|missing\b|deep research\b)/iu.test(
    detail
  );
}
function formatProviderDiagnostic(providerLabel, detail) {
  const normalized = normalizeDiagnosticDetail(detail);
  if (!normalized) {
    return `${providerLabel} failed.`;
  }
  if (startsWithProviderLabel(providerLabel, normalized)) {
    return `${normalized}.`;
  }
  if (readsLikeProviderClause(normalized)) {
    return `${providerLabel} ${normalized}.`;
  }
  return `${providerLabel}: ${normalized}.`;
}
function formatResearchTerminalDiagnostic(providerLabel, status, detail) {
  const normalized = detail ? normalizeDiagnosticDetail(detail) : "";
  if (!normalized) {
    return status === "cancelled" ? `${providerLabel} research was canceled.` : `${providerLabel} research failed.`;
  }
  if (startsWithProviderLabel(providerLabel, normalized)) {
    return `${normalized}.`;
  }
  if (/^research\b/iu.test(normalized)) {
    return `${providerLabel} ${normalized}.`;
  }
  return status === "cancelled" ? `${providerLabel} research was canceled: ${normalized}.` : `${providerLabel} research failed: ${normalized}.`;
}

// src/execution-policy.ts
var MAX_RETRY_DELAY_MS = 3e4;
var RequestTimeoutError = class extends Error {
  name = "RequestTimeoutError";
};
async function runWithExecutionPolicy(label, operation, settings, context) {
  const maxAttempts = Math.max(1, settings.retryCount + 1);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    throwIfAborted(context.signal);
    const {
      context: attemptContext,
      abort,
      cleanup
    } = createAttemptContext(context);
    try {
      const result = operation(attemptContext);
      const timeoutMessage = settings.requestTimeoutMs === void 0 ? void 0 : `${label} timed out after ${formatDuration(settings.requestTimeoutMs)}.`;
      return await withAbortAndOptionalTimeout(
        result,
        settings.requestTimeoutMs,
        context.signal,
        timeoutMessage,
        timeoutMessage ? () => abort(new RequestTimeoutError(timeoutMessage)) : void 0
      );
    } catch (error) {
      if (!shouldRetryError(error, settings) || attempt >= maxAttempts) {
        throw error;
      }
      const delayMs = Math.min(
        settings.retryDelayMs * 2 ** (attempt - 1),
        MAX_RETRY_DELAY_MS
      );
      context.onProgress?.(
        `${label} failed (${formatErrorMessage(error)}). Retrying in ${formatDuration(delayMs)} (attempt ${attempt + 1}/${maxAttempts}).`
      );
      await sleep(delayMs, context.signal);
    } finally {
      cleanup();
    }
  }
  throw new Error(`${label} failed.`);
}
async function executeAsyncResearch({
  providerLabel,
  providerId,
  context,
  pollIntervalMs = DEFAULT_RESEARCH_POLL_INTERVAL_MS,
  timeoutMs = DEFAULT_RESEARCH_TIMEOUT_MS,
  maxConsecutivePollErrors = DEFAULT_RESEARCH_MAX_CONSECUTIVE_POLL_ERRORS,
  start,
  poll
}) {
  const timeoutMessage = `${providerLabel} research exceeded ${formatDuration(timeoutMs)}.`;
  const deadline = createDeadlineSignal(
    context.signal,
    timeoutMs,
    timeoutMessage
  );
  const researchContext = {
    ...context,
    signal: deadline.signal
  };
  let lastStatus;
  let lastProgressStatus;
  const startedAt = Date.now();
  try {
    researchContext.onProgress?.(`Starting research via ${providerLabel}`);
    const job = await withAbortAndOptionalTimeout(
      start(researchContext),
      void 0,
      researchContext.signal,
      void 0
    );
    const jobId = job.id;
    if (!jobId) {
      throw new Error(`${providerLabel} research did not return a job id.`);
    }
    researchContext.onProgress?.(`${providerLabel} research started: ${jobId}`);
    let consecutivePollErrors = 0;
    while (true) {
      throwIfAborted(
        researchContext.signal,
        `${providerLabel} research aborted.`
      );
      try {
        const result = await withAbortAndOptionalTimeout(
          poll(jobId, researchContext),
          void 0,
          researchContext.signal,
          void 0
        );
        consecutivePollErrors = 0;
        const progressStatus = result.statusText ?? result.status;
        if (result.status !== lastStatus || progressStatus !== lastProgressStatus) {
          researchContext.onProgress?.(
            `Research via ${providerLabel}: ${progressStatus} (${formatElapsed(Date.now() - startedAt)} elapsed)`
          );
          lastStatus = result.status;
          lastProgressStatus = progressStatus;
        }
        if (result.status === "completed") {
          return result.output ?? {
            provider: providerId,
            text: `${providerLabel} research completed without textual output.`
          };
        }
        if (result.status === "failed" || result.status === "cancelled") {
          throw new Error(
            formatResearchTerminalDiagnostic(
              providerLabel,
              result.status,
              result.error
            )
          );
        }
      } catch (error) {
        if (isAbortErrorFromSignal(researchContext.signal, error)) {
          throw error;
        }
        if (!isRetryableError(error)) {
          throw normalizeError(error);
        }
        consecutivePollErrors += 1;
        if (consecutivePollErrors >= maxConsecutivePollErrors) {
          throw new Error(
            `${providerLabel} research polling failed too many times in a row: ${formatErrorMessage(error)}`
          );
        }
        researchContext.onProgress?.(
          `${providerLabel} research poll is still retrying after transient errors (${consecutivePollErrors}/${maxConsecutivePollErrors} consecutive poll failures). Background job id: ${jobId}`
        );
      }
      await sleep(pollIntervalMs, researchContext.signal);
    }
  } catch (error) {
    if (isAbortErrorFromSignal(researchContext.signal, error)) {
      throw new Error(
        formatProviderDiagnostic(providerLabel, formatErrorMessage(error))
      );
    }
    throw new Error(
      formatProviderDiagnostic(providerLabel, formatErrorMessage(error))
    );
  } finally {
    deadline.cleanup();
  }
}
function shouldRetryError(error, settings) {
  if (error instanceof RequestTimeoutError) {
    return settings.retryOnTimeout === true;
  }
  return isRetryableError(error);
}
function isRetryableError(error) {
  if (error instanceof RequestTimeoutError) {
    return false;
  }
  const message = formatErrorMessage(error).toLowerCase();
  if (!message || message === "operation aborted.") {
    return false;
  }
  return /429|500|502|503|504|deadline exceeded|econnreset|ecanceled|ehostunreach|eai_again|enotfound|etimedout|fetch failed|gateway timeout|internal error|network|overloaded|rate limit|resource exhausted|socket hang up|temporarily unavailable|timeout|unavailable/.test(
    message
  );
}
function formatErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
}
function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1e3));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${totalSeconds}s`;
}
function formatDuration(ms) {
  if (ms >= 6e4) {
    return formatElapsed(ms);
  }
  if (ms >= 1e3) {
    return `${Math.floor(ms / 1e3)}s`;
  }
  return `${ms}ms`;
}
async function sleep(ms, signal) {
  throwIfAborted(signal);
  await new Promise((resolve2, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve2();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(getAbortError(signal));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
function throwIfAborted(signal, message = "Operation aborted.") {
  if (signal?.aborted) {
    throw getAbortError(signal, message);
  }
}
function createAttemptContext(context) {
  const controller = new AbortController();
  if (context.signal?.aborted) {
    controller.abort(getAbortError(context.signal));
  }
  const onAbort = () => {
    controller.abort(getAbortError(context.signal));
  };
  context.signal?.addEventListener("abort", onAbort, { once: true });
  return {
    context: {
      ...context,
      signal: controller.signal
    },
    abort: (reason) => controller.abort(reason),
    cleanup: () => context.signal?.removeEventListener("abort", onAbort)
  };
}
async function withAbortAndOptionalTimeout(promise, timeoutMs, signal, message, onTimeout) {
  if (timeoutMs === void 0 && !signal) {
    return await promise;
  }
  throwIfAborted(signal);
  return await new Promise((resolve2, reject) => {
    const timer = timeoutMs === void 0 ? void 0 : setTimeout(() => {
      onTimeout?.();
      cleanup();
      reject(
        new RequestTimeoutError(
          message ?? `Operation timed out after ${formatDuration(timeoutMs)}.`
        )
      );
    }, timeoutMs);
    const onAbort = () => {
      cleanup();
      reject(getAbortError(signal));
    };
    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
      }
      signal?.removeEventListener("abort", onAbort);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve2(value);
      },
      (error) => {
        cleanup();
        reject(error);
      }
    );
  });
}
function getAbortError(signal, message = "Operation aborted.") {
  const reason = signal?.reason;
  if (reason instanceof Error) {
    return reason;
  }
  if (typeof reason === "string" && reason.length > 0) {
    return new Error(reason);
  }
  return new Error(message);
}
function isAbortErrorFromSignal(signal, error) {
  return signal?.aborted === true && signal.reason === error;
}
function createDeadlineSignal(signal, timeoutMs, timeoutMessage) {
  const controller = new AbortController();
  if (signal?.aborted) {
    controller.abort(getAbortError(signal));
  }
  const onAbort = () => {
    controller.abort(getAbortError(signal));
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => {
    controller.abort(new RequestTimeoutError(timeoutMessage));
  }, timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  };
}
function normalizeError(error) {
  return error instanceof Error ? error : new Error(formatErrorMessage(error));
}

// src/providers/exa.ts
var exaSearchOptionsSchema = Type6.Object(
  {
    type: Type6.Optional(
      literalUnion(
        [
          "keyword",
          "neural",
          "auto",
          "hybrid",
          "fast",
          "instant",
          "deep",
          "deep-reasoning",
          "deep-max"
        ],
        { description: "Exa search mode." }
      )
    ),
    category: Type6.Optional(
      Type6.String({
        description: "Filter by category (e.g., 'company', 'research paper')."
      })
    ),
    includeDomains: Type6.Optional(
      Type6.Array(Type6.String(), {
        description: "Restrict results to these domains."
      })
    ),
    excludeDomains: Type6.Optional(
      Type6.Array(Type6.String(), { description: "Exclude these domains." })
    ),
    startPublishedDate: Type6.Optional(
      Type6.String({
        description: "ISO date string for earliest publish date."
      })
    ),
    endPublishedDate: Type6.Optional(
      Type6.String({ description: "ISO date string for latest publish date." })
    ),
    userLocation: Type6.Optional(
      Type6.Object(
        {
          country: Type6.Optional(
            Type6.String({ description: "Country hint for the user location." })
          ),
          region: Type6.Optional(
            Type6.String({ description: "Region hint for the user location." })
          ),
          city: Type6.Optional(
            Type6.String({ description: "City hint for the user location." })
          ),
          timezone: Type6.Optional(
            Type6.String({
              description: "Timezone hint for the user location."
            })
          )
        },
        {
          description: "User location hint passed through to the Exa SDK."
        }
      )
    ),
    contents: Type6.Optional(
      Type6.Object(
        {
          text: Type6.Optional(
            Type6.Boolean({ description: "Include text content." })
          ),
          highlights: Type6.Optional(
            Type6.Boolean({ description: "Include highlighted excerpts." })
          ),
          summary: Type6.Optional(
            Type6.Boolean({ description: "Include AI-generated summary." })
          )
        },
        { description: "What content to include in results." }
      )
    )
  },
  { description: "Exa search options." }
);
var exaImplementation = {
  id: "exa",
  label: "Exa",
  docsUrl: "https://exa.ai/docs/sdks/typescript-sdk-specification",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
        return exaSearchOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      credentials: { api: "EXA_API_KEY" },
      options: {
        search: {
          type: "auto",
          contents: {
            text: true
          }
        }
      }
    };
  },
  getCapabilityStatus(config) {
    return getApiKeyStatus(config?.credentials?.api);
  },
  async search(query2, maxResults, config, _context, searchOptions) {
    const client = createClient2(config);
    const options = {
      ...asJsonObject(config.options?.search) ?? {},
      ...searchOptions ?? {},
      numResults: maxResults
    };
    const response = await client.search(query2, options);
    return {
      provider: exaImplementation.id,
      results: (response.results ?? []).slice(0, maxResults).map((result) => ({
        title: String(result.title ?? result.url ?? "Untitled"),
        url: String(result.url ?? ""),
        snippet: trimSnippet(
          typeof result.text === "string" ? result.text : Array.isArray(result.highlights) ? result.highlights.join(" ") : typeof result.summary === "string" ? result.summary : ""
        ),
        score: typeof result.score === "number" ? result.score : void 0
      }))
    };
  },
  async contents(urls, config, _context, options) {
    const client = createClient2(config);
    const response = await client.getContents(urls, options);
    const results = response.results ?? [];
    return {
      provider: exaImplementation.id,
      answers: urls.map((url2, index) => {
        const result = results[index];
        if (!result) {
          return {
            url: url2,
            error: "No content returned for this URL."
          };
        }
        return {
          url: url2,
          ...typeof result.text === "string" ? { content: result.text } : {},
          ...result.summary !== void 0 ? { summary: result.summary } : {},
          metadata: result
        };
      })
    };
  },
  async answer(query2, config, _context, options) {
    const client = createClient2(config);
    const response = await client.answer(query2, options);
    const lines = [];
    lines.push(
      typeof response.answer === "string" ? response.answer : formatJson(response.answer)
    );
    const citations = response.citations ?? [];
    if (citations.length > 0) {
      lines.push("");
      lines.push("Sources:");
      for (const [index, citation] of citations.entries()) {
        lines.push(
          `${index + 1}. ${String(citation.title ?? citation.url ?? "Untitled")}`
        );
        lines.push(`   ${String(citation.url ?? "")}`);
      }
    }
    return {
      provider: exaImplementation.id,
      text: lines.join("\n").trimEnd(),
      itemCount: citations.length
    };
  },
  async research(input, config, context, options) {
    return await executeAsyncResearch({
      providerLabel: exaImplementation.label,
      providerId: exaImplementation.id,
      context,
      start: (researchContext) => exaImplementation.startResearch(
        input,
        config,
        researchContext,
        options
      ),
      poll: (id, researchContext) => exaImplementation.pollResearch(id, config, researchContext, options)
    });
  },
  async startResearch(input, config, _context, options) {
    const client = createClient2(config);
    const task = await client.research.create({
      instructions: input,
      ...options ?? {}
    });
    return { id: task.researchId };
  },
  async pollResearch(id, config, _context, _options) {
    const client = createClient2(config);
    const result = await client.research.get(id, { events: false });
    if (result.status === "completed") {
      const content = result.output?.content;
      return {
        status: "completed",
        output: {
          provider: exaImplementation.id,
          text: typeof content === "string" ? content : content !== void 0 ? formatJson(content) : "Exa research completed without textual output."
        }
      };
    }
    if (result.status === "failed") {
      return {
        status: "failed",
        error: result.error ?? "research failed"
      };
    }
    if (result.status === "canceled") {
      return {
        status: "cancelled",
        error: "research was canceled"
      };
    }
    return { status: "in_progress" };
  }
};
function createClient2(config) {
  const apiKey = resolveConfigValue(config.credentials?.api);
  if (!apiKey) {
    throw new Error("is missing an API key");
  }
  return new ExaClient(apiKey, resolveConfigValue(config.baseUrl));
}
var exaProvider = defineProvider({
  id: "exa",
  label: exaImplementation.label,
  docsUrl: exaImplementation.docsUrl,
  config: {
    createTemplate: () => exaImplementation.createTemplate(),
    fields: ["credentials", "baseUrl", "options", "settings"],
    optionCapabilities: ["search"]
  },
  getCapabilityStatus: (config, cwd, tool) => exaImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: exaImplementation.getToolOptionsSchema?.("search"),
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await exaImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    }),
    contents: defineCapability({
      options: exaImplementation.getToolOptionsSchema?.("contents"),
      async execute(input, ctx) {
        return await exaImplementation.contents(
          input.urls,
          ctx.config,
          ctx,
          input.options
        );
      }
    }),
    answer: defineCapability({
      options: exaImplementation.getToolOptionsSchema?.("answer"),
      async execute(input, ctx) {
        return await exaImplementation.answer(
          input.query,
          ctx.config,
          ctx,
          input.options
        );
      }
    }),
    research: defineCapability({
      options: exaImplementation.getToolOptionsSchema?.("research"),
      async execute(input, ctx) {
        return await exaImplementation.research(
          input.input,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/firecrawl.ts
import FirecrawlClient from "@mendable/firecrawl-js";
import { Type as Type7 } from "typebox";
var firecrawlSearchOptionsSchema = Type7.Object(
  {
    lang: Type7.Optional(
      Type7.String({
        description: "Language code for search results (for example 'en')."
      })
    ),
    country: Type7.Optional(
      Type7.String({
        description: "Country code for search results (for example 'us')."
      })
    ),
    sources: Type7.Optional(
      Type7.Array(Type7.String(), {
        description: "Search source groups to include."
      })
    ),
    categories: Type7.Optional(
      Type7.Array(Type7.String(), {
        description: "Search categories to include."
      })
    ),
    location: Type7.Optional(
      Type7.Object(
        {
          country: Type7.Optional(Type7.String({ description: "Country hint." })),
          region: Type7.Optional(Type7.String({ description: "Region hint." })),
          city: Type7.Optional(Type7.String({ description: "City hint." }))
        },
        { description: "Location hint for search." }
      )
    ),
    timeout: Type7.Optional(
      Type7.Integer({
        minimum: 0,
        description: "Request timeout in milliseconds."
      })
    ),
    scrapeOptions: Type7.Optional(
      Type7.Object(
        {
          formats: Type7.Optional(
            Type7.Array(literalUnion(["markdown", "html", "rawHtml"]), {
              description: "Output formats."
            })
          ),
          onlyMainContent: Type7.Optional(
            Type7.Boolean({ description: "Extract only the main content." })
          )
        },
        {
          description: "Options for scraping each search result."
        }
      )
    )
  },
  { description: "Firecrawl search options." }
);
var firecrawlScrapeOptionsSchema = Type7.Object(
  {
    formats: Type7.Optional(
      Type7.Array(literalUnion(["markdown", "html", "rawHtml"]), {
        description: "Output formats for scraping."
      })
    ),
    onlyMainContent: Type7.Optional(
      Type7.Boolean({ description: "Extract only the main content." })
    ),
    includeTags: Type7.Optional(
      Type7.Array(Type7.String(), { description: "CSS selectors to include." })
    ),
    excludeTags: Type7.Optional(
      Type7.Array(Type7.String(), { description: "CSS selectors to exclude." })
    ),
    waitFor: Type7.Optional(
      Type7.Integer({
        minimum: 0,
        description: "Milliseconds to wait before scraping."
      })
    ),
    headers: Type7.Optional(
      Type7.Record(Type7.String(), Type7.String(), {
        description: "Headers to send when scraping."
      })
    ),
    location: Type7.Optional(
      Type7.Object(
        {
          country: Type7.Optional(Type7.String({ description: "Country hint." })),
          region: Type7.Optional(Type7.String({ description: "Region hint." })),
          city: Type7.Optional(Type7.String({ description: "City hint." }))
        },
        { description: "Location hint for scraping." }
      )
    ),
    mobile: Type7.Optional(
      Type7.Boolean({ description: "Use a mobile browser profile." })
    ),
    proxy: Type7.Optional(
      Type7.String({
        description: "Proxy mode passed through to the Firecrawl SDK."
      })
    )
  },
  { description: "Firecrawl scrape options." }
);
var firecrawlImplementation = {
  id: "firecrawl",
  label: "Firecrawl",
  docsUrl: "https://docs.firecrawl.dev/sdks/node",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
        return firecrawlSearchOptionsSchema;
      case "contents":
        return firecrawlScrapeOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      credentials: { api: "FIRECRAWL_API_KEY" },
      options: {
        scrape: {
          formats: ["markdown"],
          onlyMainContent: true
        }
      }
    };
  },
  getCapabilityStatus(config) {
    return getApiKeyStatus(config?.credentials?.api);
  },
  async search(query2, maxResults, config, _context, options) {
    const client = createClient3(config);
    const defaults = asJsonObject(config.options?.search) ?? {};
    const response = await client.search(query2, {
      ...defaults,
      ...options ?? {},
      limit: maxResults
    });
    return {
      provider: firecrawlImplementation.id,
      results: flattenSearchResults(response).slice(0, maxResults)
    };
  },
  async contents(urls, config, _context, options) {
    const client = createClient3(config);
    const defaults = asJsonObject(config.options?.scrape) ?? {};
    const scrapeOptions = {
      formats: ["markdown"],
      onlyMainContent: true,
      ...defaults,
      ...options ?? {}
    };
    return {
      provider: firecrawlImplementation.id,
      answers: await Promise.all(
        urls.map(async (url2) => {
          try {
            const document = await client.scrape(url2, scrapeOptions);
            const content = getDocumentContent(document);
            return content ? {
              url: url2,
              content,
              ...document.metadata ? {
                metadata: document.metadata
              } : {}
            } : {
              url: url2,
              error: "No content returned for this URL."
            };
          } catch (error) {
            return {
              url: url2,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        })
      )
    };
  }
};
function createClient3(config) {
  const apiKey = resolveConfigValue(config.credentials?.api);
  if (!apiKey) {
    throw new Error("is missing an API key");
  }
  return new FirecrawlClient({
    apiKey,
    apiUrl: resolveConfigValue(config.baseUrl)
  });
}
function flattenSearchResults(response) {
  return ["web", "news", "images"].flatMap(
    (source) => (response[source] ?? []).map((entry) => toSearchResult(source, entry)).filter((entry) => entry !== null)
  );
}
function toSearchResult(source, value) {
  const entry = asRecord(value);
  if (!entry) {
    return null;
  }
  const metadata = asRecord(entry.metadata);
  const url2 = readString2(entry.url) ?? readString2(metadata?.sourceURL) ?? readString2(entry.imageUrl) ?? "";
  const title = readString2(entry.title) ?? readString2(metadata?.title) ?? url2;
  const snippet = trimSnippet(
    readString2(entry.description) ?? readString2(entry.snippet) ?? readString2(entry.markdown) ?? readString2(metadata?.description) ?? ""
  );
  const resultMetadata = {
    source,
    ...readString2(entry.category) ? { category: entry.category } : {},
    ...readString2(entry.date) ? { date: entry.date } : {},
    ...readString2(entry.imageUrl) ? { imageUrl: entry.imageUrl } : {},
    ...typeof entry.position === "number" ? { position: entry.position } : {},
    ...metadata ?? {}
  };
  return {
    title: title || "Untitled",
    url: url2,
    snippet,
    metadata: Object.keys(resultMetadata).length > 1 ? resultMetadata : void 0
  };
}
function getDocumentContent(document) {
  if (typeof document.markdown === "string" && document.markdown.trim()) {
    return document.markdown;
  }
  if (typeof document.html === "string" && document.html.trim()) {
    return document.html;
  }
  if (typeof document.rawHtml === "string" && document.rawHtml.trim()) {
    return document.rawHtml;
  }
  return document.json !== void 0 ? JSON.stringify(document.json, null, 2) : void 0;
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function readString2(value) {
  return typeof value === "string" ? value : void 0;
}
var firecrawlProvider = defineProvider({
  id: "firecrawl",
  label: firecrawlImplementation.label,
  docsUrl: firecrawlImplementation.docsUrl,
  config: {
    createTemplate: () => firecrawlImplementation.createTemplate(),
    fields: ["credentials", "baseUrl", "options", "settings"]
  },
  getCapabilityStatus: (config, cwd, tool) => firecrawlImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: firecrawlImplementation.getToolOptionsSchema?.("search"),
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await firecrawlImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    }),
    contents: defineCapability({
      options: firecrawlImplementation.getToolOptionsSchema?.("contents"),
      async execute(input, ctx) {
        return await firecrawlImplementation.contents(
          input.urls,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/gemini.ts
import { GoogleGenAI } from "@google/genai";
import { Type as Type8 } from "typebox";
var DEFAULT_SEARCH_MODEL = "gemini-2.5-flash";
var DEFAULT_ANSWER_MODEL = "gemini-2.5-flash";
var DEFAULT_RESEARCH_AGENT = "deep-research-pro-preview-12-2025";
var geminiGenerationConfigSchema = Type8.Object(
  {
    temperature: Type8.Optional(
      Type8.Number({ description: "Sampling temperature." })
    ),
    topP: Type8.Optional(Type8.Number({ description: "Top-p sampling value." })),
    topK: Type8.Optional(
      Type8.Integer({ minimum: 0, description: "Top-k sampling value." })
    ),
    candidateCount: Type8.Optional(
      Type8.Integer({
        minimum: 1,
        description: "Number of candidates to generate."
      })
    ),
    maxOutputTokens: Type8.Optional(
      Type8.Integer({ minimum: 1, description: "Maximum output tokens." })
    ),
    tool_choice: Type8.Optional(
      literalUnion(["auto", "any", "none"], {
        description: "Tool choice mode for Gemini search interactions."
      })
    )
  },
  { description: "Gemini generation configuration." }
);
var geminiAnswerConfigSchema = Type8.Object(
  {
    labels: Type8.Optional(
      Type8.Record(Type8.String(), Type8.String(), {
        description: "Request labels to attach to the Gemini call."
      })
    ),
    temperature: Type8.Optional(
      Type8.Number({ description: "Sampling temperature." })
    ),
    topP: Type8.Optional(Type8.Number({ description: "Top-p sampling value." })),
    topK: Type8.Optional(
      Type8.Integer({ minimum: 0, description: "Top-k sampling value." })
    ),
    candidateCount: Type8.Optional(
      Type8.Integer({
        minimum: 1,
        description: "Number of candidates to generate."
      })
    ),
    maxOutputTokens: Type8.Optional(
      Type8.Integer({ minimum: 1, description: "Maximum output tokens." })
    )
  },
  { description: "Gemini generate-content config overrides." }
);
var geminiAgentConfigSchema = Type8.Object(
  {
    thinking_summaries: Type8.Optional(
      literalUnion(["auto", "none"], {
        description: "Whether to include thought summaries in the response."
      })
    )
  },
  {
    additionalProperties: false,
    description: "Safe Gemini deep-research agent configuration. The provider adds the required type field."
  }
);
var geminiSearchOptionsSchema = Type8.Object(
  {
    model: Type8.Optional(
      Type8.String({
        description: "Gemini model for search (for example 'gemini-2.5-flash')."
      })
    ),
    generation_config: Type8.Optional(geminiGenerationConfigSchema)
  },
  { description: "Gemini search options." }
);
var geminiAnswerOptionsSchema = Type8.Object(
  {
    model: Type8.Optional(
      Type8.String({
        description: "Gemini model for answers (for example 'gemini-2.5-flash')."
      })
    ),
    config: Type8.Optional(geminiAnswerConfigSchema)
  },
  { description: "Gemini answer options." }
);
var geminiResearchOptionsSchema = Type8.Object(
  {
    agent_config: Type8.Optional(geminiAgentConfigSchema)
  },
  { additionalProperties: false, description: "Gemini research options." }
);
var geminiImplementation = {
  id: "gemini",
  label: "Gemini",
  docsUrl: "https://github.com/googleapis/js-genai",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
        return geminiSearchOptionsSchema;
      case "answer":
        return geminiAnswerOptionsSchema;
      case "research":
        return geminiResearchOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      credentials: { api: "GOOGLE_API_KEY" },
      options: {
        searchModel: DEFAULT_SEARCH_MODEL,
        answerModel: DEFAULT_ANSWER_MODEL,
        researchAgent: DEFAULT_RESEARCH_AGENT
      }
    };
  },
  getCapabilityStatus(config) {
    return getApiKeyStatus(config?.credentials?.api);
  },
  async search(query2, maxResults, config, context, options) {
    const ai = this.createClient(config);
    const providerOptions = getGeminiOptions(config);
    const request = buildGeminiSearchRequest(
      query2,
      providerOptions?.searchModel ?? DEFAULT_SEARCH_MODEL,
      options
    );
    const interaction = await createSearchInteraction(
      ai,
      request,
      context.signal
    );
    const results = await Promise.all(
      extractGoogleSearchResults(interaction.outputs).slice(0, maxResults).map(async (result) => {
        const resolvedUrl = await resolveGoogleSearchUrl(
          result.url,
          context.signal
        );
        return {
          title: result.title ?? resolvedUrl ?? result.url ?? "Untitled",
          url: resolvedUrl ?? result.url ?? "",
          snippet: ""
        };
      })
    );
    return {
      provider: this.id,
      results
    };
  },
  async answer(query2, config, context, options) {
    const ai = this.createClient(config);
    const providerOptions = getGeminiOptions(config);
    const request = buildGeminiGenerateContentRequest({
      defaultModel: providerOptions?.answerModel ?? DEFAULT_ANSWER_MODEL,
      prompt: query2,
      options,
      toolConfig: { googleSearch: {} }
    });
    const response = await ai.models.generateContent({
      model: request.model,
      contents: request.contents,
      config: addAbortSignalToGeminiConfig(request.config, context.signal)
    });
    const lines = [];
    lines.push(response.text?.trim() || "No answer returned.");
    const sources = extractGroundingSources(
      response.candidates?.[0]?.groundingMetadata?.groundingChunks
    );
    if (sources.length > 0) {
      lines.push("");
      lines.push("Sources:");
      for (const [index, source] of sources.entries()) {
        lines.push(`${index + 1}. ${source.title}`);
        if (source.url) {
          lines.push(`   ${source.url}`);
        }
      }
    }
    return {
      provider: this.id,
      text: lines.join("\n").trimEnd(),
      itemCount: sources.length
    };
  },
  async research(input, config, context, options) {
    return await executeAsyncResearch({
      providerLabel: this.label,
      providerId: this.id,
      context,
      maxConsecutivePollErrors: DEFAULT_GEMINI_RESEARCH_MAX_CONSECUTIVE_POLL_ERRORS,
      start: (researchContext) => this.startResearch(input, config, researchContext, options),
      poll: (id, researchContext) => this.pollResearch(id, config, researchContext, options)
    });
  },
  async startResearch(input, config, context, options) {
    const ai = this.createClient(config);
    const requestOptions = getGeminiResearchRequestOptions(options);
    const interaction = await ai.interactions.create(
      {
        ...requestOptions,
        input,
        agent: getGeminiOptions(config)?.researchAgent ?? DEFAULT_RESEARCH_AGENT,
        background: true
      },
      buildGeminiRequestOptions(context.signal, context.idempotencyKey)
    );
    return { id: interaction.id };
  },
  async pollResearch(id, config, context, _options) {
    const ai = this.createClient(config);
    const interaction = await runWithoutGeminiInteractionsWarning(
      () => ai.interactions.get(
        id,
        void 0,
        buildGeminiRequestOptions(context.signal)
      )
    );
    const status = readNonEmptyString3(interaction.status) ?? "unknown";
    if (status === "completed") {
      const text = formatInteractionOutputs(interaction.outputs);
      return {
        status: "completed",
        output: {
          provider: this.id,
          text: text || "Gemini research completed without textual output."
        }
      };
    }
    if (status === "failed") {
      return {
        status: "failed",
        error: "research failed"
      };
    }
    if (status === "cancelled") {
      return {
        status: "cancelled",
        error: "research was canceled"
      };
    }
    if (status === "incomplete") {
      return {
        status: "failed",
        error: "research ended incomplete"
      };
    }
    if (status === "requires_action") {
      return {
        status: "failed",
        error: describeGeminiRequiredAction(interaction.outputs)
      };
    }
    return status === "in_progress" ? { status: "in_progress" } : { status: "in_progress", statusText: status };
  },
  createClient(config) {
    const apiKey = resolveConfigValue(config.credentials?.api);
    if (!apiKey) {
      throw new Error("is missing an API key");
    }
    return new GoogleGenAI({
      apiKey,
      apiVersion: getGeminiOptions(config)?.apiVersion
    });
  }
};
function buildGeminiRequestOptions(signal, idempotencyKey) {
  if (!signal && !idempotencyKey) {
    return void 0;
  }
  return {
    ...signal ? { signal } : {},
    ...idempotencyKey ? { idempotencyKey } : {}
  };
}
function addAbortSignalToGeminiConfig(config, signal) {
  if (!signal) {
    return config;
  }
  return {
    ...config ?? {},
    abortSignal: signal
  };
}
function extractGoogleSearchResults(outputs) {
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  if (!Array.isArray(outputs)) {
    return results;
  }
  for (const output of outputs) {
    if (typeof output !== "object" || output === null) {
      continue;
    }
    const content = output;
    if (content.type !== "google_search_result") {
      continue;
    }
    const items = Array.isArray(content.result) ? content.result : [];
    for (const item of items) {
      if (typeof item !== "object" || item === null) {
        continue;
      }
      const normalizedResults = normalizeGoogleSearchResult(
        item
      );
      for (const normalized of normalizedResults) {
        if (!normalized.title && !normalized.url) {
          continue;
        }
        const key = [
          normalized.title?.trim().toLowerCase() ?? "",
          normalized.url?.trim().toLowerCase() ?? ""
        ].join("::");
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        results.push(normalized);
      }
    }
  }
  return results;
}
function normalizeGoogleSearchResult(record) {
  const renderedContent = readNonEmptyString3(record.rendered_content) ?? readNonEmptyString3(record.renderedContent);
  const suggestionResults = extractSearchResultsFromSuggestions(record);
  const fallback = extractSearchResultsFromHtml(renderedContent)[0] ?? {};
  const primary = {
    title: readNonEmptyString3(record.title) ?? readNonEmptyString3(record.name) ?? readNonEmptyString3(record.headline) ?? fallback.title,
    url: readNonEmptyString3(record.url) ?? readNonEmptyString3(record.uri) ?? readNonEmptyString3(record.link) ?? readNonEmptyString3(record.href) ?? fallback.url,
    rendered_content: renderedContent
  };
  if (primary.title || primary.url) {
    return [primary, ...suggestionResults];
  }
  return suggestionResults;
}
function extractSearchResultsFromSuggestions(record) {
  const fragments = [
    readNonEmptyString3(record.search_suggestions),
    readNonEmptyString3(record.searchSuggestions)
  ].filter((value) => value !== void 0);
  return fragments.flatMap(
    (fragment) => extractSearchResultsFromHtml(fragment).map((result) => ({
      ...result,
      rendered_content: fragment
    }))
  );
}
function extractSearchResultsFromHtml(fragment) {
  if (!fragment) {
    return [];
  }
  const results = [];
  for (const match of fragment.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs2 = parseHtmlAttributes(match[1] ?? "");
    const result = {
      title: cleanExtractedHtmlText(match[2]) ?? normalizeHtmlAttributeValue(attrs2.title) ?? normalizeHtmlAttributeValue(attrs2["aria-label"]) ?? normalizeHtmlAttributeValue(attrs2["data-title"]),
      url: normalizeSearchUrl(attrs2.href) ?? normalizeSearchUrl(attrs2["data-href"]) ?? normalizeSearchUrl(attrs2["data-url"]) ?? normalizeSearchUrl(attrs2.url)
    };
    if (result.title || result.url) {
      results.push(result);
    }
  }
  if (results.length > 0) {
    return results;
  }
  const attrs = parseHtmlAttributes(fragment);
  const fallback = {
    title: normalizeHtmlAttributeValue(attrs.title) ?? normalizeHtmlAttributeValue(attrs["aria-label"]) ?? normalizeHtmlAttributeValue(attrs["data-title"]),
    url: normalizeSearchUrl(attrs.href) ?? normalizeSearchUrl(attrs["data-href"]) ?? normalizeSearchUrl(attrs["data-url"]) ?? normalizeSearchUrl(attrs.url)
  };
  if (fallback.title || fallback.url) {
    return [fallback];
  }
  return [];
}
function parseHtmlAttributes(fragment) {
  const attributes = {};
  for (const match of fragment.matchAll(
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(['"])([\s\S]*?)\2/g
  )) {
    attributes[match[1].toLowerCase()] = decodeHtmlEntities(match[3]);
  }
  return attributes;
}
function cleanExtractedHtmlText(html) {
  if (!html) {
    return void 0;
  }
  const text = decodeHtmlEntities(
    html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<svg[\s\S]*?<\/svg>/gi, " ").replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
  return text || void 0;
}
function normalizeHtmlAttributeValue(value) {
  return readNonEmptyString3(value);
}
function normalizeSearchUrl(value) {
  const url2 = normalizeHtmlAttributeValue(value);
  if (!url2 || url2.startsWith("#") || /^javascript:/i.test(url2)) {
    return void 0;
  }
  return url2;
}
function decodeHtmlEntities(text) {
  return text.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (_match, entity) => decodeHtmlEntity(entity)
  );
}
function decodeHtmlEntity(entity) {
  const normalized = entity.toLowerCase();
  if (normalized === "amp") return "&";
  if (normalized === "lt") return "<";
  if (normalized === "gt") return ">";
  if (normalized === "quot") return '"';
  if (normalized === "apos" || normalized === "#39") return "'";
  if (normalized === "nbsp") return " ";
  const isHex = normalized.startsWith("#x");
  const isNumeric = normalized.startsWith("#");
  if (!isNumeric) {
    return `&${entity};`;
  }
  const value = Number.parseInt(
    normalized.slice(isHex ? 2 : 1),
    isHex ? 16 : 10
  );
  return Number.isFinite(value) ? String.fromCodePoint(value) : `&${entity};`;
}
function extractGroundingSources(chunks) {
  const seen = /* @__PURE__ */ new Set();
  const sources = [];
  const maxSources = 5;
  if (!Array.isArray(chunks)) {
    return sources;
  }
  for (const chunk of chunks) {
    const web2 = typeof chunk === "object" && chunk !== null && "web" in chunk && typeof chunk.web === "object" && chunk.web !== null ? chunk.web : void 0;
    if (!web2) continue;
    const rawUrl = typeof web2.uri === "string" ? web2.uri : "";
    const title = formatGroundingSourceTitle(
      typeof web2.title === "string" ? web2.title : rawUrl,
      rawUrl
    );
    const url2 = formatGroundingSourceUrl(rawUrl);
    const key = [title.toLowerCase(), url2.toLowerCase()].join("::");
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      title,
      url: url2
    });
    if (sources.length >= maxSources) {
      break;
    }
  }
  return sources;
}
function formatInteractionOutputs(outputs) {
  const lines = [];
  if (!Array.isArray(outputs)) {
    return "";
  }
  for (const output of outputs) {
    if (typeof output === "object" && output !== null && "type" in output && output.type === "text" && "text" in output && typeof output.text === "string") {
      const text = output.text.trim();
      if (text) {
        lines.push(text);
      }
    }
  }
  return lines.join("\n\n").trim();
}
function formatGroundingSourceTitle(title, url2) {
  const trimmedTitle = title?.trim();
  if (trimmedTitle) {
    return trimmedTitle;
  }
  if (url2) {
    try {
      return new URL(url2).hostname;
    } catch {
      return url2;
    }
  }
  return "Untitled";
}
function formatGroundingSourceUrl(url2) {
  if (!url2) {
    return "";
  }
  if (isGoogleGroundingRedirect(url2)) {
    return "";
  }
  return url2;
}
function isGoogleGroundingRedirect(url2) {
  try {
    const parsed = new URL(url2);
    return parsed.hostname === "vertexaisearch.cloud.google.com" && parsed.pathname.startsWith("/grounding-api-redirect/");
  } catch {
    return false;
  }
}
async function createSearchInteraction(ai, request, signal) {
  const forcedRequest = {
    ...request,
    ...request.generation_config ? {
      generation_config: {
        ...request.generation_config,
        tool_choice: "any"
      }
    } : {
      generation_config: {
        tool_choice: "any"
      }
    }
  };
  try {
    return await runWithoutGeminiInteractionsWarning(
      () => ai.interactions.create(forcedRequest, buildGeminiRequestOptions(signal))
    );
  } catch (error) {
    if (!isBuiltInToolChoiceError(error)) {
      throw error;
    }
    const fallbackGenerationConfig = stripToolChoice(request.generation_config);
    return runWithoutGeminiInteractionsWarning(
      () => ai.interactions.create(
        {
          ...request,
          ...fallbackGenerationConfig ? { generation_config: fallbackGenerationConfig } : {}
        },
        buildGeminiRequestOptions(signal)
      )
    );
  }
}
var GEMINI_INTERACTIONS_WARNING = /GoogleGenAI\.interactions: Interactions usage is experimental and may change in future versions\.?/;
var geminiWarningSuppressionDepth = 0;
var originalGeminiConsoleWarn;
var originalGeminiStderrWrite;
async function runWithoutGeminiInteractionsWarning(operation) {
  installGeminiWarningSuppression();
  try {
    return await operation();
  } finally {
    uninstallGeminiWarningSuppression();
  }
}
function installGeminiWarningSuppression() {
  geminiWarningSuppressionDepth += 1;
  if (geminiWarningSuppressionDepth !== 1) {
    return;
  }
  originalGeminiConsoleWarn = console.warn.bind(console);
  console.warn = (...args) => {
    if (matchesGeminiInteractionsWarning(args)) {
      return;
    }
    originalGeminiConsoleWarn?.(...args);
  };
  originalGeminiStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk, ...args) => {
    if (matchesGeminiInteractionsWarning([chunk])) {
      const callback = args.find(
        (arg) => typeof arg === "function"
      );
      callback?.(null);
      return true;
    }
    return originalGeminiStderrWrite?.(
      chunk,
      ...args
    ) ?? true;
  });
}
function uninstallGeminiWarningSuppression() {
  geminiWarningSuppressionDepth = Math.max(
    0,
    geminiWarningSuppressionDepth - 1
  );
  if (geminiWarningSuppressionDepth !== 0) {
    return;
  }
  if (originalGeminiConsoleWarn) {
    console.warn = originalGeminiConsoleWarn;
    originalGeminiConsoleWarn = void 0;
  }
  if (originalGeminiStderrWrite) {
    process.stderr.write = originalGeminiStderrWrite;
    originalGeminiStderrWrite = void 0;
  }
}
function matchesGeminiInteractionsWarning(parts) {
  const text = parts.map((part) => {
    if (typeof part === "string") {
      return part;
    }
    if (part instanceof Uint8Array) {
      return Buffer.from(part).toString("utf8");
    }
    return "";
  }).join(" ");
  return GEMINI_INTERACTIONS_WARNING.test(text);
}
function isBuiltInToolChoiceError(error) {
  if (error instanceof Error) {
    return error.message.includes(
      "Function calling config is set without function_declarations"
    );
  }
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message.includes(
      "Function calling config is set without function_declarations"
    );
  }
  return false;
}
async function resolveGoogleSearchUrl(url2, signal) {
  if (!url2) {
    return void 0;
  }
  if (!isGoogleGroundingRedirect(url2)) {
    return url2;
  }
  try {
    const response = await fetch(url2, {
      method: "HEAD",
      redirect: "manual",
      signal
    });
    return response.headers.get("location") || url2;
  } catch {
    return url2;
  }
}
function buildGeminiSearchRequest(query2, defaultModel, options) {
  return {
    model: readNonEmptyString3(options?.model) ?? defaultModel,
    input: query2,
    tools: [{ type: "google_search" }],
    ...isPlainObject2(options?.generation_config) ? { generation_config: options.generation_config } : {}
  };
}
function buildGeminiGenerateContentRequest({
  defaultModel,
  prompt,
  options,
  toolConfig
}) {
  const requestOptions = isPlainObject2(options) ? options : {};
  const explicitConfig = isPlainObject2(requestOptions.config) ? requestOptions.config : {};
  return {
    model: readNonEmptyString3(requestOptions.model) ?? defaultModel,
    contents: prompt,
    config: {
      ...explicitConfig,
      tools: [toolConfig]
    }
  };
}
function describeGeminiRequiredAction(outputs) {
  if (!Array.isArray(outputs) || outputs.length === 0) {
    return "research requires additional action";
  }
  const firstOutput = outputs.find(
    (value) => typeof value === "object" && value !== null
  );
  const type = readNonEmptyString3(firstOutput?.type);
  if (!type) {
    return "research requires additional action";
  }
  return `research requires additional action (${type})`;
}
function getGeminiResearchRequestOptions(options) {
  if (!isPlainObject2(options)) {
    return {};
  }
  const unknownKeys = Object.keys(options).filter(
    (key) => key !== "agent_config"
  );
  if (unknownKeys.length > 0) {
    throw new Error(
      `Unsupported Gemini research options: ${unknownKeys.join(", ")}.`
    );
  }
  const requestOptions = {};
  const agentConfig = getGeminiDeepResearchAgentConfig(options.agent_config);
  if (agentConfig) {
    requestOptions.agent_config = agentConfig;
  }
  return requestOptions;
}
function getGeminiDeepResearchAgentConfig(value) {
  if (!isPlainObject2(value)) {
    return void 0;
  }
  if (Object.keys(value).length === 0) {
    return void 0;
  }
  const unknownKeys = Object.keys(value).filter(
    (key) => key !== "thinking_summaries"
  );
  if (unknownKeys.length > 0) {
    throw new Error(
      `Unsupported Gemini agent_config options: ${unknownKeys.join(", ")}.`
    );
  }
  const thinkingSummaries = readNonEmptyString3(value.thinking_summaries);
  if (thinkingSummaries !== "auto" && thinkingSummaries !== "none") {
    throw new Error(
      "Gemini agent_config.thinking_summaries must be 'auto' or 'none'."
    );
  }
  return {
    type: "deep-research",
    thinking_summaries: thinkingSummaries
  };
}
function stripToolChoice(generationConfig) {
  if (!generationConfig || !Object.hasOwn(generationConfig, "tool_choice")) {
    return generationConfig;
  }
  const { tool_choice: _ignored, ...rest } = generationConfig;
  return Object.keys(rest).length > 0 ? rest : void 0;
}
function isPlainObject2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function getGeminiOptions(config) {
  return config.options;
}
function readNonEmptyString3(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : void 0;
}
var geminiProvider = defineProvider({
  id: "gemini",
  label: geminiImplementation.label,
  docsUrl: geminiImplementation.docsUrl,
  config: {
    createTemplate: () => geminiImplementation.createTemplate(),
    fields: ["credentials", "options", "settings"]
  },
  getCapabilityStatus: (config, cwd, tool) => geminiImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: geminiImplementation.getToolOptionsSchema?.("search"),
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await geminiImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    }),
    answer: defineCapability({
      options: geminiImplementation.getToolOptionsSchema?.("answer"),
      async execute(input, ctx) {
        return await geminiImplementation.answer(
          input.query,
          ctx.config,
          ctx,
          input.options
        );
      }
    }),
    research: defineCapability({
      options: geminiImplementation.getToolOptionsSchema?.("research"),
      async execute(input, ctx) {
        return await geminiImplementation.research(
          input.input,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/linkup.ts
import {
  LinkupClient
} from "linkup-sdk";
import { Type as Type9 } from "typebox";
var linkupSearchOptionsSchema = Type9.Object(
  {
    depth: Type9.Optional(
      literalUnion(["standard", "deep"], {
        description: "Search depth. 'deep' is slower but more thorough."
      })
    ),
    includeImages: Type9.Optional(
      Type9.Boolean({ description: "Include images in search results." })
    ),
    includeDomains: Type9.Optional(
      Type9.Array(Type9.String(), {
        description: "Restrict results to these domains."
      })
    ),
    excludeDomains: Type9.Optional(
      Type9.Array(Type9.String(), { description: "Exclude these domains." })
    ),
    fromDate: Type9.Optional(
      Type9.String({ description: "ISO date string for earliest result date." })
    ),
    toDate: Type9.Optional(
      Type9.String({ description: "ISO date string for latest result date." })
    )
  },
  { description: "Linkup search options." }
);
var linkupContentsOptionsSchema = Type9.Object(
  {
    renderJs: Type9.Optional(
      Type9.Boolean({
        description: "Render JavaScript before extracting content."
      })
    ),
    includeRawHtml: Type9.Optional(
      Type9.Boolean({ description: "Include raw HTML in the response." })
    ),
    extractImages: Type9.Optional(
      Type9.Boolean({ description: "Extract images from the page." })
    )
  },
  { description: "Linkup fetch options." }
);
var linkupImplementation = {
  id: "linkup",
  label: "Linkup",
  docsUrl: "https://docs.linkup.so/pages/sdk/js/js",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
        return linkupSearchOptionsSchema;
      case "contents":
        return linkupContentsOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      credentials: { api: "LINKUP_API_KEY" }
    };
  },
  getCapabilityStatus(config) {
    return getApiKeyStatus(config?.credentials?.api);
  },
  async search(query2, maxResults, config, _context, options) {
    const client = createClient4(config);
    const defaults = asJsonObject(config.options?.search) ?? {};
    const response = await client.search(
      buildSearchParams(query2, maxResults, {
        ...defaults,
        ...options ?? {}
      })
    );
    return {
      provider: linkupImplementation.id,
      results: (response.results ?? []).map(toSearchResult2).filter((result) => result !== null).slice(0, maxResults)
    };
  },
  async contents(urls, config, _context, options) {
    const client = createClient4(config);
    const defaults = asJsonObject(config.options?.fetch) ?? {};
    return {
      provider: linkupImplementation.id,
      answers: await Promise.all(
        urls.map(async (url2) => {
          try {
            const response = await client.fetch(
              buildFetchParams(url2, {
                ...defaults,
                ...options ?? {}
              })
            );
            return response.markdown ? {
              url: url2,
              content: response.markdown
            } : {
              url: url2,
              error: "No content returned for this URL."
            };
          } catch (error) {
            return {
              url: url2,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        })
      )
    };
  }
};
function buildSearchParams(query2, maxResults, options) {
  const searchOptions = options;
  if (searchOptions.query !== void 0) {
    throw new Error("Linkup search options cannot override the managed query.");
  }
  if (searchOptions.maxResults !== void 0) {
    throw new Error(
      "Linkup search options cannot override the managed maxResults."
    );
  }
  if (searchOptions.outputType !== void 0 && searchOptions.outputType !== "searchResults") {
    throw new Error("Linkup search only supports outputType 'searchResults'.");
  }
  if (searchOptions.includeInlineCitations !== void 0 || searchOptions.includeSources !== void 0 || searchOptions.structuredOutputSchema !== void 0) {
    throw new Error(
      "Linkup search only supports search-results mode for managed web_search."
    );
  }
  return {
    query: query2,
    depth: searchOptions.depth ?? "standard",
    outputType: "searchResults",
    maxResults,
    ...searchOptions.includeImages !== void 0 ? { includeImages: searchOptions.includeImages } : {},
    ...searchOptions.includeDomains !== void 0 ? { includeDomains: searchOptions.includeDomains } : {},
    ...searchOptions.excludeDomains !== void 0 ? { excludeDomains: searchOptions.excludeDomains } : {},
    ...searchOptions.fromDate !== void 0 ? { fromDate: toDate(searchOptions.fromDate, "fromDate") } : {},
    ...searchOptions.toDate !== void 0 ? { toDate: toDate(searchOptions.toDate, "toDate") } : {}
  };
}
function buildFetchParams(url2, options) {
  const fetchOptions = options;
  if (fetchOptions.url !== void 0) {
    throw new Error("Linkup fetch options cannot override the managed URL.");
  }
  return {
    url: url2,
    ...fetchOptions.renderJs !== void 0 ? { renderJs: fetchOptions.renderJs } : {},
    ...fetchOptions.includeRawHtml !== void 0 ? { includeRawHtml: fetchOptions.includeRawHtml } : {},
    ...fetchOptions.extractImages !== void 0 ? { extractImages: fetchOptions.extractImages } : {}
  };
}
function createClient4(config) {
  const apiKey = resolveConfigValue(config.credentials?.api);
  if (!apiKey) {
    throw new Error("is missing an API key");
  }
  return new LinkupClient({
    apiKey,
    baseUrl: resolveConfigValue(config.baseUrl)
  });
}
function toSearchResult2(value) {
  const entry = asRecord2(value);
  if (!entry) {
    return null;
  }
  const url2 = readString3(entry.url) ?? "";
  const title = readString3(entry.name) ?? (url2 || "Untitled");
  const type = readString3(entry.type);
  const favicon = readString3(entry.favicon);
  const snippet = type === "text" ? trimSnippet(readString3(entry.content) ?? "") : "";
  const metadata = {
    ...type ? { type } : {},
    ...favicon ? { favicon } : {}
  };
  return {
    title,
    url: url2,
    snippet,
    metadata: Object.keys(metadata).length > 0 ? metadata : void 0
  };
}
function asRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function readString3(value) {
  return typeof value === "string" ? value : void 0;
}
function toDate(value, name) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Linkup option '${name}' must be a valid date string, timestamp, or Date.`
    );
  }
  return date;
}
var linkupProvider = defineProvider({
  id: "linkup",
  label: linkupImplementation.label,
  docsUrl: linkupImplementation.docsUrl,
  config: {
    createTemplate: () => linkupImplementation.createTemplate(),
    fields: ["credentials", "baseUrl", "options", "settings"]
  },
  getCapabilityStatus: (config, cwd, tool) => linkupImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: linkupImplementation.getToolOptionsSchema?.("search"),
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await linkupImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    }),
    contents: defineCapability({
      options: linkupImplementation.getToolOptionsSchema?.("contents"),
      async execute(input, ctx) {
        return await linkupImplementation.contents(
          input.urls,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/ollama.ts
var DEFAULT_BASE_URL2 = "https://ollama.com";
var WEB_SEARCH_PATH = "/api/web_search";
var WEB_FETCH_PATH = "/api/web_fetch";
var ollamaProvider = defineProvider({
  id: "ollama",
  label: "Ollama",
  docsUrl: "https://docs.ollama.com/capabilities/web-search",
  config: {
    createTemplate() {
      return {
        credentials: { api: "OLLAMA_API_KEY" }
      };
    },
    fields: ["credentials", "baseUrl", "settings"]
  },
  getCapabilityStatus(config) {
    return getApiKeyStatus(config?.credentials?.api);
  },
  capabilities: {
    search: defineCapability({
      limits: {
        maxResults: 10
      },
      async execute({ query: query2, maxResults }, { config, signal }) {
        return await searchOllama(query2, maxResults, config, {
          signal
        });
      }
    }),
    contents: defineCapability({
      async execute({ urls }, { config, signal }) {
        return await fetchOllamaContents(urls, config, { signal });
      }
    })
  }
});
async function searchOllama(query2, maxResults, config, context) {
  const apiKey = resolveApiKey(config);
  const response = await fetch(
    resolveEndpoint(config.baseUrl, WEB_SEARCH_PATH),
    {
      method: "POST",
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        query: query2,
        max_results: clampMaxResults(maxResults)
      }),
      signal: context.signal
    }
  );
  if (!response.ok) {
    throw new Error(await buildHttpError(response));
  }
  const data = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return {
    provider: ollamaProvider.id,
    results: results.slice(0, clampMaxResults(maxResults)).map((result) => ({
      title: result.title || result.url || "Untitled",
      url: result.url ?? "",
      snippet: trimSnippet(result.content)
    }))
  };
}
async function fetchOllamaContents(urls, config, context) {
  const apiKey = resolveApiKey(config);
  const endpoint = resolveEndpoint(config.baseUrl, WEB_FETCH_PATH);
  return {
    provider: ollamaProvider.id,
    answers: await Promise.all(
      urls.map(async (url2) => {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: buildHeaders(apiKey),
            body: JSON.stringify({
              url: url2
            }),
            signal: context.signal
          });
          if (!response.ok) {
            return {
              url: url2,
              error: await buildHttpError(response)
            };
          }
          const data = await response.json();
          const content = normalizeContentText(data.content);
          if (!content) {
            return {
              url: url2,
              error: "No content returned for this URL."
            };
          }
          const metadata = buildFetchMetadata(data);
          return {
            url: url2,
            content,
            ...metadata ? { metadata } : {}
          };
        } catch (error) {
          return {
            url: url2,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    )
  };
}
function resolveApiKey(config) {
  const apiKey = resolveConfigValue(config.credentials?.api);
  if (!apiKey) {
    throw new Error("is missing an API key");
  }
  return apiKey;
}
function buildHeaders(apiKey) {
  return {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json"
  };
}
function resolveEndpoint(baseUrlReference, endpointPath) {
  const baseUrl = resolveConfigValue(baseUrlReference) ?? DEFAULT_BASE_URL2;
  const base2 = baseUrl.replace(/\/+$/, "");
  const apiPath = endpointPath.replace(/^\/api\//, "");
  if (base2.endsWith(endpointPath)) {
    return base2;
  }
  if (base2.endsWith("/api")) {
    return `${base2}/${apiPath}`;
  }
  return `${base2}${endpointPath}`;
}
function clampMaxResults(value) {
  return Math.max(1, Math.min(10, Math.trunc(value || 0)));
}
async function buildHttpError(response) {
  const detail = await readErrorDetail(response);
  const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  return detail ? `Ollama API request failed (${status}): ${detail}` : `Ollama API request failed (${status}).`;
}
async function readErrorDetail(response) {
  const text = (await response.text()).trim();
  if (!text) {
    return void 0;
  }
  try {
    const parsed = JSON.parse(text);
    for (const key of ["message", "error", "detail"]) {
      if (typeof parsed[key] === "string" && parsed[key].trim()) {
        return parsed[key];
      }
    }
    return JSON.stringify(parsed);
  } catch {
    return text;
  }
}
function buildFetchMetadata(data) {
  const metadata = {};
  if (data.title) {
    metadata.title = data.title;
  }
  if (data.links?.length) {
    metadata.links = data.links;
  }
  return Object.keys(metadata).length > 0 ? metadata : void 0;
}

// src/providers/openai.ts
import { Type as Type10 } from "typebox";
import OpenAI from "openai";
var DEFAULT_SEARCH_MODEL2 = "gpt-4.1";
var DEFAULT_ANSWER_MODEL2 = "gpt-4.1";
var DEFAULT_RESEARCH_MODEL = "o4-mini-deep-research";
var openaiSearchOptionsSchema = Type10.Object(
  {
    model: Type10.Optional(
      Type10.String({
        description: "OpenAI model to use for web search (for example 'gpt-4.1')."
      })
    ),
    instructions: Type10.Optional(
      Type10.String({
        description: "Optional instructions that shape source selection and result style."
      })
    )
  },
  { description: "OpenAI search options." }
);
var openaiAnswerOptionsSchema = Type10.Object(
  {
    model: Type10.Optional(
      Type10.String({
        description: "OpenAI model to use for grounded answers (for example 'gpt-4.1')."
      })
    ),
    instructions: Type10.Optional(
      Type10.String({
        description: "Optional instructions that shape the answer structure, tone, and source selection."
      })
    )
  },
  { description: "OpenAI answer options." }
);
var openaiResearchOptionsSchema = Type10.Object(
  {
    model: Type10.Optional(
      Type10.String({
        description: "OpenAI deep research model to use (for example 'o4-mini-deep-research')."
      })
    ),
    instructions: Type10.Optional(
      Type10.String({
        description: "Optional instructions that shape the report structure, tone, and source selection."
      })
    ),
    max_tool_calls: Type10.Optional(
      Type10.Integer({
        minimum: 1,
        description: "Maximum number of built-in tool calls the model may make during the research run."
      })
    )
  },
  { description: "OpenAI deep research options." }
);
var searchResultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sources"],
  properties: {
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url", "snippet"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          snippet: { type: "string" }
        }
      }
    }
  }
};
var openaiImplementation = {
  id: "openai",
  label: "OpenAI",
  docsUrl: "https://platform.openai.com/docs/guides/deep-research",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
        return openaiSearchOptionsSchema;
      case "answer":
        return openaiAnswerOptionsSchema;
      case "research":
        return openaiResearchOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      credentials: { api: "OPENAI_API_KEY" },
      options: {
        search: {
          model: DEFAULT_SEARCH_MODEL2
        },
        answer: {
          model: DEFAULT_ANSWER_MODEL2
        },
        research: {
          model: DEFAULT_RESEARCH_MODEL
        }
      }
    };
  },
  getCapabilityStatus(config) {
    return getApiKeyStatus(config?.credentials?.api);
  },
  async search(query2, maxResults, config, context, options) {
    const client = createClient5(config);
    const response = await client.responses.create(
      buildOpenAISearchRequest(query2, maxResults, config, options),
      buildRequestOptions2(context.signal, context.idempotencyKey)
    );
    return parseSearchResponse2(response, maxResults);
  },
  async answer(query2, config, context, options) {
    const client = createClient5(config);
    const response = await client.responses.create(
      buildOpenAIAnswerRequest(query2, config, options),
      buildRequestOptions2(context.signal, context.idempotencyKey)
    );
    return ensureCompletedResponse(response, "answer");
  },
  async research(input, config, context, options) {
    return await executeAsyncResearch({
      providerLabel: openaiImplementation.label,
      providerId: openaiImplementation.id,
      context,
      start: (researchContext) => openaiImplementation.startResearch(
        input,
        config,
        researchContext,
        options
      ),
      poll: (id, researchContext) => openaiImplementation.pollResearch(id, config, researchContext, options)
    });
  },
  async startResearch(input, config, context, options) {
    const client = createClient5(config);
    const response = await client.responses.create(
      buildOpenAIResearchRequest(input, config, options),
      buildRequestOptions2(context.signal, context.idempotencyKey)
    );
    return { id: response.id };
  },
  async pollResearch(id, config, context, _options) {
    const client = createClient5(config);
    const response = await client.responses.retrieve(
      id,
      void 0,
      buildRequestOptions2(context.signal)
    );
    const status = response.status ?? "completed";
    if (status === "completed") {
      return {
        status: "completed",
        output: formatResponseOutput(response, "research")
      };
    }
    if (status === "failed") {
      return {
        status: "failed",
        error: response.error?.message ?? "research failed"
      };
    }
    if (status === "cancelled") {
      return {
        status: "cancelled",
        error: "research was canceled"
      };
    }
    if (status === "incomplete") {
      return {
        status: "failed",
        error: formatIncompleteError(response, "research")
      };
    }
    return {
      status: "in_progress",
      statusText: status
    };
  }
};
function createClient5(config) {
  const apiKey = resolveConfigValue(config.credentials?.api);
  if (!apiKey) {
    throw new Error("is missing an API key");
  }
  const baseUrl = resolveConfigValue(config.baseUrl);
  return new OpenAI({
    apiKey,
    ...baseUrl ? { baseURL: baseUrl } : {}
  });
}
function buildOpenAISearchRequest(query2, maxResults, config, options) {
  const mergedOptions = resolveOpenAISearchOptions(config, options);
  const model = mergedOptions.model ?? DEFAULT_SEARCH_MODEL2;
  const instructions = mergedOptions.instructions;
  return {
    model,
    input: [
      "Search the public web and return only the most relevant sources for the user's query.",
      `Return at most ${maxResults} sources.`,
      "Prefer official, primary, or highly reputable sources when available.",
      "Each snippet should be short, specific, and grounded in the retrieved source.",
      "Return only data matching the provided JSON schema.",
      "",
      `User query: ${query2}`
    ].join("\n"),
    tools: [{ type: "web_search_preview" }],
    text: {
      format: {
        type: "json_schema",
        name: "openai_web_search_results",
        schema: searchResultSchema,
        strict: true
      }
    },
    ...instructions ? { instructions } : {}
  };
}
function buildOpenAIAnswerRequest(query2, config, options) {
  const mergedOptions = resolveOpenAIAnswerOptions(config, options);
  const model = mergedOptions.model ?? DEFAULT_ANSWER_MODEL2;
  const instructions = mergedOptions.instructions;
  return {
    model,
    input: query2,
    tools: [{ type: "web_search_preview" }],
    ...instructions ? { instructions } : {}
  };
}
function buildOpenAIResearchRequest(input, config, options) {
  const mergedOptions = resolveOpenAIResearchOptions(config, options);
  const model = mergedOptions.model ?? DEFAULT_RESEARCH_MODEL;
  const instructions = mergedOptions.instructions;
  const maxToolCalls = mergedOptions.max_tool_calls;
  return {
    model,
    input,
    background: true,
    tools: [{ type: "web_search_preview" }],
    ...instructions ? { instructions } : {},
    ...maxToolCalls ? { max_tool_calls: maxToolCalls } : {}
  };
}
function resolveOpenAISearchOptions(config, options) {
  const mergedOptions = {
    ...config.options?.search ?? {},
    ...options ?? {}
  };
  const model = readNonEmptyString4(mergedOptions.model);
  const instructions = readNonEmptyString4(mergedOptions.instructions);
  return {
    ...model ? { model } : {},
    ...instructions ? { instructions } : {}
  };
}
function resolveOpenAIAnswerOptions(config, options) {
  const mergedOptions = {
    ...config.options?.answer ?? {},
    ...options ?? {}
  };
  const model = readNonEmptyString4(mergedOptions.model);
  const instructions = readNonEmptyString4(mergedOptions.instructions);
  return {
    ...model ? { model } : {},
    ...instructions ? { instructions } : {}
  };
}
function resolveOpenAIResearchOptions(config, options) {
  const mergedOptions = {
    ...config.options?.research ?? {},
    ...options ?? {}
  };
  const model = readNonEmptyString4(mergedOptions.model);
  const instructions = readNonEmptyString4(mergedOptions.instructions);
  const maxToolCalls = readPositiveInteger2(mergedOptions.max_tool_calls);
  return {
    ...model ? { model } : {},
    ...instructions ? { instructions } : {},
    ...maxToolCalls ? { max_tool_calls: maxToolCalls } : {}
  };
}
function buildRequestOptions2(signal, idempotencyKey) {
  if (!signal && !idempotencyKey) {
    return void 0;
  }
  return {
    ...signal ? { signal } : {},
    ...idempotencyKey ? { idempotencyKey } : {}
  };
}
function parseSearchResponse2(response, maxResults) {
  const status = response.status ?? "completed";
  if (status === "failed") {
    throw new Error(response.error?.message ?? "search failed");
  }
  if (status === "cancelled") {
    throw new Error("search was canceled");
  }
  if (status === "incomplete") {
    throw new Error(formatIncompleteError(response, "search"));
  }
  if (status !== "completed") {
    throw new Error(`search did not complete (status: ${status})`);
  }
  const payload = parseSearchPayload(response.output_text);
  return {
    provider: openaiImplementation.id,
    results: payload.sources.slice(0, maxResults).map((source) => ({
      title: source.title.trim(),
      url: source.url.trim(),
      snippet: trimSnippet(source.snippet)
    }))
  };
}
function ensureCompletedResponse(response, operation) {
  const status = response.status ?? "completed";
  if (status === "completed") {
    return formatResponseOutput(response, operation);
  }
  if (status === "failed") {
    throw new Error(response.error?.message ?? `${operation} failed`);
  }
  if (status === "cancelled") {
    throw new Error(`${operation} was canceled`);
  }
  if (status === "incomplete") {
    throw new Error(formatIncompleteError(response, operation));
  }
  throw new Error(`${operation} did not complete (status: ${status})`);
}
function formatResponseOutput(response, operation) {
  const lines = [];
  lines.push(
    response.output_text?.trim() || `OpenAI ${operation} completed without textual output.`
  );
  const citations = extractUrlCitations(response);
  if (citations.length > 0) {
    lines.push("");
    lines.push("Sources:");
    for (const [index, citation] of citations.entries()) {
      lines.push(`${index + 1}. ${citation.title}`);
      lines.push(`   ${citation.url}`);
    }
  }
  return {
    provider: openaiImplementation.id,
    text: lines.join("\n").trimEnd(),
    itemCount: citations.length,
    metadata: {
      responseId: response.id,
      model: response.model,
      citations
    }
  };
}
function extractUrlCitations(response) {
  const citations = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of response.output) {
    if (item.type !== "message" || !item.content) {
      continue;
    }
    for (const content of item.content) {
      if (content.type !== "output_text" || !content.annotations) {
        continue;
      }
      for (const annotation of content.annotations) {
        if (annotation.type !== "url_citation") {
          continue;
        }
        const title = readNonEmptyString4(annotation.title);
        const url2 = readNonEmptyString4(annotation.url);
        const startIndex = readInteger(annotation.start_index);
        const endIndex = readInteger(annotation.end_index);
        if (!title || !url2 || startIndex === void 0 || endIndex === void 0) {
          continue;
        }
        const citation = {
          title,
          url: url2,
          startIndex,
          endIndex
        };
        const key = [
          citation.title,
          citation.url,
          String(citation.startIndex),
          String(citation.endIndex)
        ].join("::");
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        citations.push(citation);
      }
    }
  }
  return citations;
}
function parseSearchPayload(text) {
  let parsed;
  try {
    parsed = JSON.parse(text ?? "");
  } catch (error) {
    throw new Error(
      `search returned invalid JSON: ${error.message}`
    );
  }
  if (typeof parsed !== "object" || parsed === null || !("sources" in parsed) || !Array.isArray(parsed.sources)) {
    throw new Error("search output must include a 'sources' array");
  }
  return {
    sources: parsed.sources.map((source, index) => {
      if (typeof source !== "object" || source === null) {
        throw new Error(`search source at index ${index} must be an object`);
      }
      const entry = source;
      const title = readNonEmptyString4(entry.title);
      const url2 = readNonEmptyString4(entry.url);
      const snippet = readNonEmptyString4(entry.snippet);
      if (!title) {
        throw new Error(`search source at index ${index} is missing title`);
      }
      if (!url2) {
        throw new Error(`search source at index ${index} is missing url`);
      }
      if (!snippet) {
        throw new Error(`search source at index ${index} is missing snippet`);
      }
      return { title, url: url2, snippet };
    })
  };
}
function formatIncompleteError(response, operation) {
  const reason = response.incomplete_details?.reason;
  if (reason) {
    return `${operation} ended incomplete (${reason})`;
  }
  return `${operation} ended incomplete`;
}
function readNonEmptyString4(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : void 0;
}
function readPositiveInteger2(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : void 0;
}
function readInteger(value) {
  return typeof value === "number" && Number.isInteger(value) ? value : void 0;
}
var openaiProvider = defineProvider({
  id: "openai",
  label: openaiImplementation.label,
  docsUrl: openaiImplementation.docsUrl,
  config: {
    createTemplate: () => openaiImplementation.createTemplate(),
    fields: ["credentials", "baseUrl", "options", "settings"],
    optionCapabilities: ["search", "answer", "research"]
  },
  getCapabilityStatus: (config, cwd, tool) => openaiImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: openaiImplementation.getToolOptionsSchema?.("search"),
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await openaiImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    }),
    answer: defineCapability({
      options: openaiImplementation.getToolOptionsSchema?.("answer"),
      async execute(input, ctx) {
        return await openaiImplementation.answer(
          input.query,
          ctx.config,
          ctx,
          input.options
        );
      }
    }),
    research: defineCapability({
      options: openaiImplementation.getToolOptionsSchema?.("research"),
      async execute(input, ctx) {
        return await openaiImplementation.research(
          input.input,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/parallel.ts
import ParallelClient from "parallel-web";
import { Type as Type11 } from "typebox";
var parallelSearchOptionsSchema = Type11.Object(
  {
    mode: Type11.Optional(
      literalUnion(["agentic", "one-shot"], {
        description: "Parallel search mode. Use 'agentic' for exploratory or multi-step source discovery and 'one-shot' for direct, simple searches."
      })
    )
  },
  { description: "Parallel search options." }
);
var parallelExtractOptionsSchema = Type11.Object(
  {
    excerpts: Type11.Optional(
      Type11.Boolean({ description: "Include excerpts in extraction results." })
    ),
    full_content: Type11.Optional(
      Type11.Boolean({
        description: "Include full page content in extraction results."
      })
    )
  },
  { description: "Parallel extract options." }
);
var parallelImplementation = {
  id: "parallel",
  label: "Parallel",
  docsUrl: "https://github.com/parallel-web/parallel-sdk-typescript",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
        return parallelSearchOptionsSchema;
      case "contents":
        return parallelExtractOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      credentials: { api: "PARALLEL_API_KEY" },
      options: {
        search: {
          mode: "agentic"
        },
        extract: {
          excerpts: false,
          full_content: true
        }
      }
    };
  },
  getCapabilityStatus(config) {
    return getApiKeyStatus(config?.credentials?.api);
  },
  async search(query2, maxResults, config, context, options) {
    const client = createClient6(config);
    const defaults = asJsonObject(config.options?.search) ?? {};
    const response = await client.beta.search(
      {
        ...defaults,
        ...options ?? {},
        objective: query2,
        max_results: maxResults
      },
      buildRequestOptions3(context)
    );
    return {
      provider: parallelImplementation.id,
      results: response.results.slice(0, maxResults).map((result) => ({
        title: result.title ?? result.url,
        url: result.url,
        snippet: trimSnippet(result.excerpts?.join(" ") ?? "")
      }))
    };
  },
  async contents(urls, config, context, options) {
    const client = createClient6(config);
    const defaults = asJsonObject(config.options?.extract) ?? {};
    const response = await client.beta.extract(
      {
        ...defaults,
        ...options ?? {},
        urls
      },
      buildRequestOptions3(context)
    );
    const resultsByUrl = new Map(
      response.results.map((result) => [result.url, result])
    );
    const errorsByUrl = new Map(
      response.errors.map((error) => [error.url, error])
    );
    return {
      provider: parallelImplementation.id,
      answers: urls.map((url2) => {
        const result = resultsByUrl.get(url2);
        if (result) {
          return {
            url: url2,
            content: result.full_content ?? result.excerpts?.join("\n\n") ?? void 0,
            metadata: result
          };
        }
        const error = errorsByUrl.get(url2);
        return error ? {
          url: url2,
          error: formatJson(error)
        } : {
          url: url2,
          error: "No content returned for this URL."
        };
      })
    };
  }
};
function createClient6(config) {
  const apiKey = resolveConfigValue(config.credentials?.api);
  if (!apiKey) {
    throw new Error("is missing an API key");
  }
  return new ParallelClient({
    apiKey,
    baseURL: resolveConfigValue(config.baseUrl)
  });
}
function buildRequestOptions3(context) {
  return context.signal ? { signal: context.signal } : void 0;
}
var parallelProvider = defineProvider({
  id: "parallel",
  label: parallelImplementation.label,
  docsUrl: parallelImplementation.docsUrl,
  config: {
    createTemplate: () => parallelImplementation.createTemplate(),
    fields: ["credentials", "baseUrl", "options", "settings"]
  },
  getCapabilityStatus: (config, cwd, tool) => parallelImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: parallelImplementation.getToolOptionsSchema?.("search"),
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await parallelImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    }),
    contents: defineCapability({
      options: parallelImplementation.getToolOptionsSchema?.("contents"),
      async execute(input, ctx) {
        return await parallelImplementation.contents(
          input.urls,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/perplexity.ts
import PerplexityClient from "@perplexity-ai/perplexity_ai";
import { Type as Type12 } from "typebox";
var DEFAULT_ANSWER_MODEL3 = "sonar";
var DEFAULT_RESEARCH_MODEL2 = "sonar-deep-research";
var perplexitySearchOptionsSchema = Type12.Object(
  {
    country: Type12.Optional(
      Type12.String({ description: "Country hint for search results." })
    ),
    search_mode: Type12.Optional(
      Type12.String({
        description: "Perplexity search mode. Choose the provider mode that best matches the user's intent, such as broad web search versus academic or other specialized retrieval modes supported by Perplexity."
      })
    ),
    search_domain_filter: Type12.Optional(
      Type12.Array(Type12.String(), {
        description: "Restrict search results to these domains."
      })
    ),
    search_recency_filter: Type12.Optional(
      Type12.String({ description: "Recency filter for search results." })
    )
  },
  { description: "Perplexity search options." }
);
var perplexityAnswerOptionsSchema = Type12.Object(
  {
    model: Type12.Optional(
      Type12.String({
        description: "Perplexity model to use (for example 'sonar' or 'sonar-pro')."
      })
    )
  },
  { description: "Perplexity answer options." }
);
var perplexityResearchOptionsSchema = Type12.Object(
  {
    model: Type12.Optional(
      Type12.String({
        description: "Perplexity model to use (for example 'sonar-deep-research')."
      })
    )
  },
  { description: "Perplexity research options." }
);
var perplexityImplementation = {
  id: "perplexity",
  label: "Perplexity",
  docsUrl: "https://docs.perplexity.ai/docs/sdk/overview.md",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
        return perplexitySearchOptionsSchema;
      case "answer":
        return perplexityAnswerOptionsSchema;
      case "research":
        return perplexityResearchOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      credentials: { api: "PERPLEXITY_API_KEY" },
      options: {
        answer: {
          model: DEFAULT_ANSWER_MODEL3
        },
        research: {
          model: DEFAULT_RESEARCH_MODEL2
        }
      }
    };
  },
  getCapabilityStatus(config) {
    return getApiKeyStatus(config?.credentials?.api);
  },
  async search(query2, maxResults, config, context, options) {
    const client = createClient7(config);
    const request = {
      ...asJsonObject(config.options?.search) ?? {},
      ...options ?? {},
      query: query2,
      max_results: maxResults
    };
    const response = await client.search.create(
      request,
      buildRequestOptions4(context)
    );
    return {
      provider: perplexityImplementation.id,
      results: response.results.slice(0, maxResults).map((result) => ({
        title: result.title,
        url: result.url,
        snippet: trimSnippet(result.snippet),
        metadata: result.date || result.last_updated ? {
          ...result.date ? { date: result.date } : {},
          ...result.last_updated ? { last_updated: result.last_updated } : {}
        } : void 0
      }))
    };
  },
  async answer(query2, config, context, options) {
    return runSilentForegroundChatTool(
      query2,
      config,
      context,
      DEFAULT_ANSWER_MODEL3,
      "Answer",
      options
    );
  },
  async research(input, config, context, options) {
    return runStreamingForegroundChatTool(
      input,
      config,
      context,
      DEFAULT_RESEARCH_MODEL2,
      "Research",
      options
    );
  }
};
async function runSilentForegroundChatTool(input, config, context, fallbackModel, label, options, isResearch = false) {
  const client = createClient7(config);
  const defaults = (isResearch ? asJsonObject(config.options?.research) : asJsonObject(config.options?.answer)) ?? {};
  const request = {
    ...defaults,
    ...options ?? {},
    messages: [{ role: "user", content: input }],
    model: resolveModel((options ?? {}).model, defaults.model, fallbackModel) ?? fallbackModel,
    stream: false
  };
  const response = await client.chat.completions.create(
    request,
    buildRequestOptions4(context)
  );
  const content = extractMessageText(response.choices[0]?.message?.content);
  const sources = dedupeSources(extractSources(response));
  const lines = [];
  lines.push(content || `No ${label.toLowerCase()} returned.`);
  if (sources.length > 0) {
    lines.push("");
    lines.push("Sources:");
    for (const [index, source] of sources.entries()) {
      lines.push(`${index + 1}. ${source.title}`);
      lines.push(`   ${source.url}`);
    }
  }
  return {
    provider: perplexityImplementation.id,
    text: lines.join("\n").trimEnd(),
    itemCount: sources.length
  };
}
async function runStreamingForegroundChatTool(input, config, context, fallbackModel, label, options) {
  const client = createClient7(config);
  const defaults = asJsonObject(config.options?.research) ?? {};
  const request = {
    ...defaults,
    ...options ?? {},
    messages: [{ role: "user", content: input }],
    model: resolveModel((options ?? {}).model, defaults.model, fallbackModel) ?? fallbackModel,
    stream: true
  };
  const stream = await client.chat.completions.create(
    request,
    buildRequestOptions4(context)
  );
  let partialText = "";
  let lastChunk;
  const sources = [];
  for await (const chunk of stream) {
    lastChunk = chunk;
    const deltaText = extractDeltaText(chunk.choices[0]?.delta?.content);
    if (deltaText) {
      partialText = `${partialText}${deltaText}`;
    }
    sources.push(...extractSources(chunk));
  }
  const finalText = partialText.trim() || extractMessageText(lastChunk?.choices?.[0]?.message?.content) || `No ${label.toLowerCase()} returned.`;
  const dedupedSources = dedupeSources(sources);
  const lines = [finalText];
  if (dedupedSources.length > 0) {
    lines.push("");
    lines.push("Sources:");
    for (const [index, source] of dedupedSources.entries()) {
      lines.push(`${index + 1}. ${source.title}`);
      lines.push(`   ${source.url}`);
    }
  }
  return {
    provider: perplexityImplementation.id,
    text: lines.join("\n").trimEnd(),
    itemCount: dedupedSources.length
  };
}
function createClient7(config) {
  const apiKey = resolveConfigValue(config.credentials?.api);
  if (!apiKey) {
    throw new Error("is missing an API key");
  }
  return new PerplexityClient({
    apiKey,
    baseURL: resolveConfigValue(config.baseUrl)
  });
}
function resolveModel(optionModel, defaultModel, fallbackModel) {
  if (typeof optionModel === "string" && optionModel.trim().length > 0) {
    return optionModel;
  }
  if (typeof defaultModel === "string" && defaultModel.trim().length > 0) {
    return defaultModel;
  }
  return fallbackModel;
}
function extractMessageText(content) {
  if (typeof content === "string") {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content.flatMap((chunk) => {
    if (typeof chunk === "object" && chunk !== null && "type" in chunk && chunk.type === "text" && "text" in chunk && typeof chunk.text === "string") {
      return [chunk.text.trim()];
    }
    return [];
  }).filter((text) => text.length > 0).join("\n\n").trim();
}
function extractDeltaText(content) {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content.flatMap((chunk) => {
    if (typeof chunk === "object" && chunk !== null && "type" in chunk && chunk.type === "text" && "text" in chunk && typeof chunk.text === "string") {
      return [chunk.text];
    }
    return [];
  }).join("");
}
function dedupeSources(sources) {
  const seen = /* @__PURE__ */ new Set();
  const unique = [];
  for (const source of sources) {
    const title = source.title.trim() || source.url.trim() || "Untitled";
    const url2 = source.url.trim();
    if (!url2) continue;
    const key = `${title.toLowerCase()}::${url2.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ title, url: url2 });
  }
  return unique;
}
function extractSources(response) {
  const searchResults = response.search_results?.flatMap((result) => {
    const url2 = result.url?.trim() ?? "";
    if (!url2) {
      return [];
    }
    return [{ title: result.title?.trim() ?? url2, url: url2 }];
  }) ?? [];
  if (searchResults.length > 0) {
    return searchResults;
  }
  return response.citations?.flatMap((citation) => {
    const url2 = citation?.trim() ?? "";
    return url2 ? [{ title: url2, url: url2 }] : [];
  }) ?? [];
}
function buildRequestOptions4(context) {
  return context.signal ? { signal: context.signal } : void 0;
}
var perplexityProvider = defineProvider({
  id: "perplexity",
  label: perplexityImplementation.label,
  docsUrl: perplexityImplementation.docsUrl,
  config: {
    createTemplate: () => perplexityImplementation.createTemplate(),
    fields: ["credentials", "baseUrl", "options", "settings"]
  },
  getCapabilityStatus: (config, cwd, tool) => perplexityImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: perplexityImplementation.getToolOptionsSchema?.("search"),
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await perplexityImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    }),
    answer: defineCapability({
      options: perplexityImplementation.getToolOptionsSchema?.("answer"),
      async execute(input, ctx) {
        return await perplexityImplementation.answer(
          input.query,
          ctx.config,
          ctx,
          input.options
        );
      }
    }),
    research: defineCapability({
      options: perplexityImplementation.getToolOptionsSchema?.("research"),
      async execute(input, ctx) {
        return await perplexityImplementation.research(
          input.input,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/serper.ts
import { Type as Type13 } from "typebox";

// src/types.ts
var TOOLS = ["search", "contents", "answer", "research"];
var SERPER_SEARCH_MODE_VALUES = {
  search: "search",
  images: "images",
  videos: "videos",
  places: "places",
  maps: "maps",
  reviews: "reviews",
  news: "news",
  shopping: "shopping",
  productReviews: "product-reviews",
  lens: "lens",
  scholar: "scholar",
  patents: "patents",
  autocomplete: "autocomplete",
  webpage: "webpage"
};

// src/providers/serper.ts
var DEFAULT_BASE_URL3 = "https://google.serper.dev";
var DEFAULT_SCRAPE_URL = "https://scrape.serper.dev";
var SERPER_SEARCH_MODES = Object.values(SERPER_SEARCH_MODE_VALUES);
var SERPER_SEARCH_MODE_SET = new Set(SERPER_SEARCH_MODES);
var RESERVED_REQUEST_OPTION_KEYS = [
  "q",
  "num",
  "mode",
  "url",
  "productId",
  "nextPageToken",
  "ll",
  "placeId",
  "cid",
  "fid",
  "sortBy",
  "topicId",
  "includeMarkdown",
  "includeImages",
  "includeLinks",
  "includeVideos",
  "location",
  "gl",
  "hl",
  "tbs",
  "page",
  "autocorrect"
];
var PRIMARY_RESULT_FIELDS_BY_MODE = {
  search: ["organic"],
  images: ["images"],
  videos: ["videos"],
  places: ["places"],
  maps: ["maps", "places"],
  reviews: ["reviews"],
  news: ["news"],
  shopping: ["shopping"],
  "product-reviews": ["reviews", "productReviews"],
  lens: ["visualMatches", "organic", "images"],
  scholar: ["organic"],
  patents: ["organic"],
  autocomplete: ["suggestions"],
  webpage: []
};
var CONTEXT_ARRAY_FIELDS = [
  "peopleAlsoAsk",
  "relatedSearches",
  "topStories",
  "news",
  "images",
  "videos",
  "places",
  "maps",
  "shopping",
  "reviews",
  "productReviews",
  "visualMatches",
  "suggestions"
];
var serperSearchPromptGuidelines = [
  "Use Serper news mode for recent journalism, current events, announcements, or time-sensitive reporting.",
  "Use Serper images or videos mode when the user asks for visual references, screenshots, diagrams, clips, tutorials, or media results.",
  "Use Serper places or maps mode for local businesses, venues, addresses, ratings, phone numbers, opening details, or nearby/in-location searches.",
  "Use Serper reviews mode when the task needs Google business reviews. Prefer cid, fid, or placeId from a maps or places result when available; otherwise use the search query as the place identifier.",
  "Use Serper shopping mode for product listings, prices, merchants, offers, or purchase comparisons, and use product-reviews mode when the task needs reviews for a known product ID.",
  "Use Serper scholar mode for academic papers and patents mode for patent searches.",
  "Use Serper autocomplete mode when the task is to discover search suggestions or query completions rather than source pages.",
  "Use Serper lens mode for reverse image search with an image URL, and use webpage mode to scrape a specific URL. Webpage mode includes Markdown by default."
];
var serperSearchOptionsSchema = Type13.Object(
  {
    mode: Type13.Optional(
      Type13.Enum(SERPER_SEARCH_MODE_VALUES, {
        description: "Serper search type. Use 'search' for web results, 'news' for recent journalism/current events, 'images' for visual references, 'videos' for clips/tutorials, 'places' or 'maps' for local businesses/venues, 'reviews' for Google business reviews by place ID/CID/FID or query, 'shopping' for products, 'product-reviews' for product reviews, 'lens' for reverse image search, 'scholar' for scholarly articles, 'patents' for patents, 'autocomplete' for suggestions, and 'webpage' to scrape a URL."
      })
    ),
    gl: Type13.Optional(
      Type13.String({
        description: "Country code hint for Google results (for example 'us')."
      })
    ),
    hl: Type13.Optional(
      Type13.String({
        description: "Language code hint for Google results (for example 'en')."
      })
    ),
    location: Type13.Optional(
      Type13.String({
        description: "Geographic location hint for Google results."
      })
    ),
    page: Type13.Optional(
      Type13.Integer({
        minimum: 1,
        description: "1-based results page to request from Serper."
      })
    ),
    tbs: Type13.Optional(
      Type13.String({
        description: "Google time/date or vertical-specific filter string passed through to Serper, for example 'qdr:d' for past day."
      })
    ),
    autocorrect: Type13.Optional(
      Type13.Boolean({
        description: "Enable or disable Serper query autocorrection."
      })
    ),
    url: Type13.Optional(
      Type13.String({
        description: "URL for modes that need one: image URL for 'lens', or page URL for 'webpage'. Defaults to the query string when omitted."
      })
    ),
    ll: Type13.Optional(
      Type13.String({
        description: "Google Maps latitude/longitude/zoom hint, for example '@40.6973709,-74.1444871,11z'."
      })
    ),
    placeId: Type13.Optional(
      Type13.String({ description: "Google place ID for maps or reviews." })
    ),
    cid: Type13.Optional(
      Type13.String({ description: "Google CID for maps or reviews." })
    ),
    fid: Type13.Optional(Type13.String({ description: "Google FID for reviews." })),
    sortBy: Type13.Optional(
      Type13.String({ description: "Review sort order for reviews mode." })
    ),
    topicId: Type13.Optional(
      Type13.String({ description: "Review topic ID for reviews mode." })
    ),
    productId: Type13.Optional(
      Type13.String({
        description: "Google product ID for product-reviews mode. Defaults to the query string when omitted."
      })
    ),
    nextPageToken: Type13.Optional(
      Type13.String({
        description: "Pagination token for reviews or product-reviews modes."
      })
    ),
    includeMarkdown: Type13.Optional(
      Type13.Boolean({
        default: true,
        description: "Include Markdown content in webpage mode. Defaults to true."
      })
    ),
    includeImages: Type13.Optional(
      Type13.Boolean({ description: "Include image metadata in webpage mode." })
    ),
    includeLinks: Type13.Optional(
      Type13.Boolean({ description: "Include link metadata in webpage mode." })
    ),
    includeVideos: Type13.Optional(
      Type13.Boolean({ description: "Include video metadata in webpage mode." })
    )
  },
  { description: "Serper search options." }
);
var serperImplementation = {
  id: "serper",
  label: "Serper",
  docsUrl: "https://serper.dev/",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
        return serperSearchOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      credentials: { api: "SERPER_API_KEY" },
      options: {
        search: {
          includeMarkdown: true
        }
      }
    };
  },
  getCapabilityStatus(config) {
    return getApiKeyStatus(config?.credentials?.api);
  },
  async search(query2, maxResults, config, context, options) {
    const apiKey = resolveConfigValue(config.credentials?.api);
    if (!apiKey) {
      throw new Error("is missing an API key");
    }
    const defaults = asJsonObject(config.options?.search);
    const callOptions = asJsonObject(options);
    const requestOptions = readRequestOptions({
      ...defaults,
      ...callOptions
    });
    const requestBody = buildRequestBody(
      query2,
      clampMaxResults2(maxResults),
      requestOptions
    );
    const response = await fetch(
      joinUrl(resolveConfigValue(config.baseUrl), requestOptions.mode),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify(requestBody),
        signal: context.signal
      }
    );
    if (!response.ok) {
      throw new Error(await buildHttpError2(response));
    }
    const payload = await response.json();
    const responseRecord = enrichResponseRecord(
      asRecord3(payload) ?? {},
      requestOptions.mode,
      requestBody
    );
    const results = readPrimaryResults(responseRecord, requestOptions.mode);
    const searchContext = buildSearchContext(
      responseRecord,
      requestOptions.mode
    );
    return {
      provider: serperImplementation.id,
      results: results.map(
        (entry) => toSearchResult3(entry, searchContext, requestOptions.mode)
      ).filter(
        (result) => result !== null
      ).slice(0, clampMaxResults2(maxResults))
    };
  }
};
function joinUrl(baseUrl, mode = "search") {
  const base2 = (baseUrl ?? DEFAULT_BASE_URL3).replace(/\/+$/, "");
  if (mode === "webpage" && base2 === DEFAULT_BASE_URL3) {
    return DEFAULT_SCRAPE_URL;
  }
  return `${base2}/${mode}`;
}
function readRequestOptions(options) {
  const result = {
    mode: readSearchMode(options.mode),
    extra: extractExtraMetadata(options, RESERVED_REQUEST_OPTION_KEYS)
  };
  copyStringOption(result, "gl", options.gl);
  copyStringOption(result, "hl", options.hl);
  copyStringOption(result, "location", options.location);
  copyStringOption(result, "tbs", options.tbs);
  copyStringOption(result, "url", options.url);
  copyStringOption(result, "ll", options.ll);
  copyStringOption(result, "placeId", options.placeId);
  copyStringOption(result, "cid", options.cid);
  copyStringOption(result, "fid", options.fid);
  copyStringOption(result, "sortBy", options.sortBy);
  copyStringOption(result, "topicId", options.topicId);
  copyStringOption(result, "productId", options.productId);
  copyStringOption(result, "nextPageToken", options.nextPageToken);
  copyBooleanOption(result, "autocorrect", options.autocorrect);
  copyBooleanOption(result, "includeMarkdown", options.includeMarkdown);
  copyBooleanOption(result, "includeImages", options.includeImages);
  copyBooleanOption(result, "includeLinks", options.includeLinks);
  copyBooleanOption(result, "includeVideos", options.includeVideos);
  const page = readInteger2(options.page);
  if (page !== void 0) {
    result.page = Math.max(1, page);
  }
  return result;
}
function buildRequestBody(query2, maxResults, options) {
  const common = omitUndefined({
    location: options.location,
    gl: options.gl,
    hl: options.hl
  });
  const withExtra = (body) => ({
    ...body,
    ...options.extra
  });
  switch (options.mode) {
    case "webpage":
      return withExtra(
        omitUndefined({
          url: options.url ?? query2,
          includeMarkdown: options.includeMarkdown ?? true,
          includeImages: options.includeImages,
          includeLinks: options.includeLinks,
          includeVideos: options.includeVideos
        })
      );
    case "product-reviews":
      return withExtra(
        omitUndefined({
          productId: options.productId ?? query2,
          nextPageToken: options.nextPageToken,
          ...common,
          num: maxResults
        })
      );
    case "autocomplete":
      return withExtra({ q: query2, ...common });
    case "maps":
      return withExtra(
        omitUndefined({
          q: query2,
          num: maxResults,
          ...common,
          ll: options.ll,
          placeId: options.placeId,
          cid: options.cid,
          page: options.page
        })
      );
    case "reviews": {
      const hasExplicitPlaceIdentifier = firstNonEmptyString(options.cid, options.fid, options.placeId) !== void 0;
      return withExtra(
        omitUndefined({
          q: hasExplicitPlaceIdentifier ? void 0 : query2,
          cid: options.cid,
          fid: options.fid,
          placeId: options.placeId,
          gl: options.gl,
          hl: options.hl,
          sortBy: options.sortBy,
          topicId: options.topicId,
          nextPageToken: options.nextPageToken
        })
      );
    }
    case "lens":
      return withExtra(
        omitUndefined({
          url: options.url ?? query2,
          ...common,
          tbs: options.tbs
        })
      );
    case "scholar":
      return withExtra(
        omitUndefined({
          q: query2,
          ...common,
          autocorrect: options.autocorrect,
          tbs: options.tbs,
          page: options.page
        })
      );
    default:
      return withExtra(
        omitUndefined({
          q: query2,
          num: maxResults,
          ...common,
          autocorrect: options.autocorrect,
          tbs: options.tbs,
          page: options.page
        })
      );
  }
}
function enrichResponseRecord(response, mode, requestBody) {
  if (mode !== "webpage") {
    return response;
  }
  return omitUndefined({
    ...response,
    url: readString4(response.url) ?? readString4(requestBody.url)
  });
}
function readSearchMode(value) {
  return typeof value === "string" && SERPER_SEARCH_MODE_SET.has(value) ? value : "search";
}
function readPrimaryResults(response, mode) {
  if (mode === "webpage") {
    return [response];
  }
  for (const field of PRIMARY_RESULT_FIELDS_BY_MODE[mode]) {
    const values = asArray(response[field]);
    if (values) {
      return values;
    }
  }
  return [];
}
function clampMaxResults2(value) {
  return Math.max(1, Math.min(20, Math.trunc(value || 0)));
}
async function buildHttpError2(response) {
  const detail = await readErrorDetail2(response);
  const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  return detail ? `Serper API request failed (${status}): ${detail}` : `Serper API request failed (${status}).`;
}
async function readErrorDetail2(response) {
  const text = (await response.text()).trim();
  if (!text) {
    return void 0;
  }
  try {
    const parsed = JSON.parse(text);
    const record = asRecord3(parsed);
    const detail = readString4(record?.message) ?? readString4(record?.error) ?? readString4(record?.detail);
    if (detail) {
      return detail;
    }
    return JSON.stringify(parsed);
  } catch {
    return text;
  }
}
function toSearchResult3(entry, searchContext, mode) {
  if (typeof entry === "string") {
    return {
      title: entry,
      url: mode === "autocomplete" ? toGoogleSearchUrl(entry) : "",
      snippet: entry,
      metadata: {
        source: mode,
        ...searchContext ? { searchContext } : {}
      }
    };
  }
  const record = asRecord3(entry);
  if (!record) {
    return null;
  }
  const responseMetadata = asRecord3(record.metadata);
  const user = asRecord3(record.user);
  const resultUrl = firstString(record.link, record.website, record.url, record.imageUrl) ?? "";
  const title = firstNonEmptyString(
    record.title,
    responseMetadata?.title,
    record.name,
    record.query,
    record.value,
    user?.name,
    formatReviewTitle(record, user),
    resultUrl
  ) ?? "Untitled";
  const url2 = resultUrl || (mode === "autocomplete" ? toGoogleSearchUrl(title) : "");
  const snippet = trimSnippet(
    firstNonEmptyString(
      record.snippet,
      record.richSnippet,
      record.markdown,
      record.text,
      record.address,
      record.price,
      record.date,
      record.name,
      record.value,
      record.url
    ) ?? ""
  );
  const metadata = omitUndefined({
    source: readString4(record.source) ?? (mode === "search" ? "organic" : mode),
    position: readNumber(record.position),
    date: readString4(record.date),
    attributes: asRecord3(record.attributes),
    sitelinks: asArray(record.sitelinks),
    rating: readNumber(record.rating),
    ratingCount: readNumber(record.ratingCount),
    cid: readString4(record.cid),
    ...extractExtraMetadata(record, [
      "title",
      "name",
      "query",
      "value",
      "link",
      "website",
      "url",
      "snippet"
    ]),
    ...searchContext ? { searchContext } : {}
  });
  return {
    title,
    url: url2,
    snippet,
    ...Object.keys(metadata).length > 0 ? { metadata } : {}
  };
}
function buildSearchContext(response, mode) {
  const context = omitUndefined({
    searchParameters: asRecord3(response.searchParameters),
    searchInformation: asRecord3(response.searchInformation),
    credits: readNumber(response.credits),
    answerBox: asRecord3(response.answerBox),
    knowledgeGraph: asRecord3(response.knowledgeGraph)
  });
  const primaryResultFields = new Set(
    PRIMARY_RESULT_FIELDS_BY_MODE[mode]
  );
  for (const field of CONTEXT_ARRAY_FIELDS) {
    if (primaryResultFields.has(field)) {
      continue;
    }
    const value = asArray(response[field]);
    if (value) {
      context[field] = value;
    }
  }
  return Object.keys(context).length > 0 ? context : void 0;
}
function copyStringOption(target, key, value) {
  const text = readString4(value);
  if (text !== void 0) {
    target[key] = text;
  }
}
function copyBooleanOption(target, key, value) {
  const flag = readBoolean(value);
  if (flag !== void 0) {
    target[key] = flag;
  }
}
function firstString(...values) {
  return values.find((value) => typeof value === "string");
}
function toGoogleSearchUrl(query2) {
  return `https://www.google.com/search?q=${encodeURIComponent(query2)}`;
}
function formatReviewTitle(record, user) {
  const userName = readString4(user?.name);
  const rating = readNumber(record.rating);
  const date = readString4(record.date) ?? readString4(record.isoDate);
  if (userName && rating !== void 0) {
    return `${userName} (${rating}-star review)`;
  }
  if (userName) {
    return `${userName}'s review`;
  }
  if (rating !== void 0 && date) {
    return `${rating}-star review from ${date}`;
  }
  if (rating !== void 0) {
    return `${rating}-star review`;
  }
  if (date) {
    return `Review from ${date}`;
  }
  return void 0;
}
function firstNonEmptyString(...values) {
  return values.find(
    (value) => typeof value === "string" && value.length > 0
  );
}
function extractExtraMetadata(record, ignoredKeys) {
  return Object.fromEntries(
    Object.entries(record).filter(
      ([key, value]) => !ignoredKeys.includes(key) && value !== void 0
    )
  );
}
function omitUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== void 0)
  );
}
function asRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function asArray(value) {
  return Array.isArray(value) ? value : void 0;
}
function readString4(value) {
  return typeof value === "string" ? value : void 0;
}
function readNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function readInteger2(value) {
  return typeof value === "number" && Number.isInteger(value) ? value : void 0;
}
function readBoolean(value) {
  return typeof value === "boolean" ? value : void 0;
}
var serperProvider = defineProvider({
  id: "serper",
  label: serperImplementation.label,
  docsUrl: serperImplementation.docsUrl,
  config: {
    createTemplate: () => serperImplementation.createTemplate(),
    fields: ["credentials", "baseUrl", "options", "settings"],
    optionCapabilities: ["search"]
  },
  getCapabilityStatus: (config, cwd, tool) => serperImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: serperImplementation.getToolOptionsSchema?.("search"),
      promptGuidelines: serperSearchPromptGuidelines,
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await serperImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    })
  }
});

// src/providers/tavily.ts
import {
  tavily
} from "@tavily/core";
import { Type as Type14 } from "typebox";
var tavilySearchOptionsSchema = Type14.Object(
  {
    topic: Type14.Optional(
      literalUnion(["general", "news", "finance"], {
        description: "Category of the search query. Use 'news' for recent journalism or current events, 'finance' for markets or company financial data, and 'general' for broad web search."
      })
    ),
    searchDepth: Type14.Optional(
      literalUnion(["basic", "advanced"], {
        description: "Depth of the search. 'advanced' is slower but more thorough."
      })
    ),
    timeRange: Type14.Optional(
      Type14.String({ description: "Named time range filter." })
    ),
    country: Type14.Optional(
      Type14.String({ description: "Country hint for search results." })
    ),
    exactMatch: Type14.Optional(
      Type14.Boolean({ description: "Prefer exact matches." })
    ),
    includeAnswer: Type14.Optional(
      Type14.Boolean({ description: "Include a short AI-generated answer." })
    ),
    includeRawContent: Type14.Optional(
      Type14.Boolean({ description: "Include raw page content in results." })
    ),
    includeImages: Type14.Optional(
      Type14.Boolean({ description: "Include related images." })
    ),
    includeFavicon: Type14.Optional(
      Type14.Boolean({ description: "Include favicon URLs." })
    ),
    includeDomains: Type14.Optional(
      Type14.Array(Type14.String(), {
        description: "Restrict results to these domains."
      })
    ),
    excludeDomains: Type14.Optional(
      Type14.Array(Type14.String(), {
        description: "Exclude these domains from results."
      })
    ),
    days: Type14.Optional(
      Type14.Integer({
        minimum: 1,
        description: "Limit results to the last N days."
      })
    )
  },
  { description: "Tavily search options." }
);
var tavilyExtractOptionsSchema = Type14.Object(
  {
    extractDepth: Type14.Optional(
      Type14.String({ description: "Depth setting for extraction." })
    ),
    format: Type14.Optional(
      literalUnion(["markdown", "text"], {
        description: "Output format for extracted content."
      })
    ),
    includeImages: Type14.Optional(
      Type14.Boolean({ description: "Include extracted images." })
    ),
    query: Type14.Optional(
      Type14.String({ description: "Optional query to focus extraction." })
    ),
    chunksPerSource: Type14.Optional(
      Type14.Integer({ minimum: 1, description: "Maximum chunks per source." })
    ),
    includeFavicon: Type14.Optional(
      Type14.Boolean({ description: "Include favicon URLs." })
    )
  },
  { description: "Tavily extract options." }
);
var tavilyImplementation = {
  id: "tavily",
  label: "Tavily",
  docsUrl: "https://docs.tavily.com/sdk/javascript/reference",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
        return tavilySearchOptionsSchema;
      case "contents":
        return tavilyExtractOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      credentials: { api: "TAVILY_API_KEY" },
      options: {
        search: {
          includeFavicon: true
        },
        extract: {
          format: "markdown",
          includeFavicon: true
        }
      }
    };
  },
  getCapabilityStatus(config) {
    return getApiKeyStatus(config?.credentials?.api);
  },
  async search(query2, maxResults, config, _context, options) {
    const client = createClient8(config);
    const defaults = asJsonObject(config.options?.search) ?? {};
    const response = await client.search(query2, {
      ...defaults,
      ...options ?? {},
      maxResults
    });
    return {
      provider: tavilyImplementation.id,
      results: response.results.slice(0, maxResults).map((result) => ({
        title: result.title || result.url || "Untitled",
        url: result.url || "",
        snippet: trimSnippet(result.content ?? result.rawContent),
        score: typeof result.score === "number" ? result.score : void 0,
        metadata: buildSearchMetadata(response, result)
      }))
    };
  },
  async contents(urls, config, _context, options) {
    const client = createClient8(config);
    const defaults = asJsonObject(config.options?.extract) ?? {};
    const response = await client.extract(urls, {
      ...defaults,
      ...options ?? {}
    });
    const resultsByUrl = new Map(
      response.results.map((result) => [result.url, result])
    );
    const failedResultsByUrl = new Map(
      response.failedResults.map((result) => [result.url, result])
    );
    return {
      provider: tavilyImplementation.id,
      answers: urls.map((url2) => {
        const result = resultsByUrl.get(url2);
        if (result) {
          return {
            url: url2,
            ...typeof result.rawContent === "string" ? { content: result.rawContent } : {},
            metadata: buildExtractMetadata(response, result)
          };
        }
        const failedResult = failedResultsByUrl.get(url2);
        if (failedResult) {
          return {
            url: url2,
            error: failedResult.error || "Content extraction failed."
          };
        }
        return {
          url: url2,
          error: "No content returned for this URL."
        };
      })
    };
  }
};
function createClient8(config) {
  const apiKey = resolveConfigValue(config.credentials?.api);
  if (!apiKey) {
    throw new Error("is missing an API key");
  }
  return tavily({
    apiKey,
    apiBaseURL: resolveConfigValue(config.baseUrl)
  });
}
function buildSearchMetadata(response, result) {
  const metadata = {
    ...result.publishedDate ? { publishedDate: result.publishedDate } : {},
    ...result.favicon ? { favicon: result.favicon } : {},
    ...result.rawContent ? { rawContent: result.rawContent } : {},
    ...response.requestId ? { requestId: response.requestId } : {},
    ...typeof response.responseTime === "number" ? { responseTime: response.responseTime } : {}
  };
  return Object.keys(metadata).length > 0 ? metadata : void 0;
}
function buildExtractMetadata(response, result) {
  const metadata = {
    ...result.title ? { title: result.title } : {},
    ...Array.isArray(result.images) ? { images: result.images } : {},
    ...result.favicon ? { favicon: result.favicon } : {},
    ...response.requestId ? { requestId: response.requestId } : {},
    ...typeof response.responseTime === "number" ? { responseTime: response.responseTime } : {}
  };
  return Object.keys(metadata).length > 0 ? metadata : void 0;
}
var tavilyProvider = defineProvider({
  id: "tavily",
  label: tavilyImplementation.label,
  docsUrl: tavilyImplementation.docsUrl,
  config: {
    createTemplate: () => tavilyImplementation.createTemplate(),
    fields: ["credentials", "baseUrl", "options", "settings"]
  },
  getCapabilityStatus: (config, cwd, tool) => tavilyImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: tavilyImplementation.getToolOptionsSchema?.("search"),
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await tavilyImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    }),
    contents: defineCapability({
      options: tavilyImplementation.getToolOptionsSchema?.("contents"),
      async execute(input, ctx) {
        return await tavilyImplementation.contents(
          input.urls,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/valyu.ts
import { Type as Type15 } from "typebox";
import { Valyu as ValyuClient } from "valyu-js";
var valyuSearchOptionsSchema = Type15.Object(
  {
    searchType: Type15.Optional(
      literalUnion(["all", "web", "proprietary", "news"], {
        description: "Valyu search type. Use 'news' for recent journalism or current events, 'web' for public web results, 'proprietary' for Valyu proprietary sources, and 'all' when both public and proprietary sources are useful."
      })
    ),
    responseLength: Type15.Optional(
      literalUnion(["short", "medium", "large", "max"], {
        description: "Response length."
      })
    ),
    countryCode: Type15.Optional(
      Type15.String({ description: "Country code to scope search results." })
    )
  },
  { description: "Valyu search options." }
);
var valyuAnswerOptionsSchema = Type15.Object(
  {
    responseLength: Type15.Optional(
      literalUnion(["short", "medium", "large", "max"], {
        description: "Response length for answers."
      })
    ),
    countryCode: Type15.Optional(
      Type15.String({ description: "Country code to scope answer results." })
    )
  },
  { description: "Valyu answer options." }
);
var valyuResearchOptionsSchema = Type15.Object(
  {
    responseLength: Type15.Optional(
      literalUnion(["short", "medium", "large", "max"], {
        description: "Response length for research."
      })
    ),
    countryCode: Type15.Optional(
      Type15.String({ description: "Country code to scope research results." })
    )
  },
  { description: "Valyu research options." }
);
var valyuImplementation = {
  id: "valyu",
  label: "Valyu",
  docsUrl: "https://docs.valyu.ai/sdk/typescript-sdk",
  getToolOptionsSchema(capability) {
    switch (capability) {
      case "search":
        return valyuSearchOptionsSchema;
      case "answer":
        return valyuAnswerOptionsSchema;
      case "research":
        return valyuResearchOptionsSchema;
      default:
        return void 0;
    }
  },
  createTemplate() {
    return {
      credentials: { api: "VALYU_API_KEY" },
      options: {
        search: {
          searchType: "all",
          responseLength: "short"
        }
      }
    };
  },
  getCapabilityStatus(config) {
    return getApiKeyStatus(config?.credentials?.api);
  },
  async search(query2, maxResults, config, _context, searchOptions) {
    const client = createClient9(config);
    const options = {
      ...asJsonObject(config.options?.search) ?? {},
      ...searchOptions ?? {},
      maxNumResults: maxResults
    };
    const response = await client.search(query2, options);
    if (!response.success) {
      throw new Error(response.error || "search failed");
    }
    return {
      provider: valyuImplementation.id,
      results: (response.results ?? []).slice(0, maxResults).map((result) => ({
        title: result.title,
        url: result.url,
        snippet: trimSnippet(
          result.description ?? (typeof result.content === "string" ? result.content : "")
        ),
        score: result.relevance_score
      }))
    };
  },
  async contents(urls, config, _context, options) {
    const client = createClient9(config);
    const response = await client.contents(urls, options);
    const finalResponse = "jobId" in response ? await client.waitForJob(response.jobId, {}) : response;
    if (!finalResponse.success) {
      throw new Error(finalResponse.error || "contents failed");
    }
    const resultsByUrl = new Map(
      (finalResponse.results ?? []).map(
        (result) => [result.url, result]
      )
    );
    return {
      provider: valyuImplementation.id,
      answers: urls.map((url2) => {
        const result = resultsByUrl.get(url2);
        if (!result) {
          return {
            url: url2,
            error: "No content returned for this URL."
          };
        }
        return result.status === "failed" ? {
          url: url2,
          error: result.error ?? formatJson(result)
        } : {
          url: url2,
          ...typeof result.content === "string" || typeof result.content === "number" ? { content: String(result.content) } : {},
          ...result.summary !== void 0 ? { summary: result.summary } : {},
          metadata: result
        };
      })
    };
  },
  async answer(query2, config, _context, options) {
    const client = createClient9(config);
    const response = await client.answer(query2, {
      ...asJsonObject(config.options?.answer) ?? {},
      ...options ?? {},
      streaming: false
    });
    if (!("success" in response) || !response.success) {
      throw new Error(
        "error" in response && typeof response.error === "string" ? response.error : "answer failed"
      );
    }
    const lines = [];
    const contents = typeof response.contents === "string" ? response.contents : formatJson(response.contents);
    lines.push(contents);
    const sources = response.search_results ?? [];
    if (sources.length > 0) {
      lines.push("");
      lines.push("Sources:");
      for (const [index, result] of sources.entries()) {
        lines.push(`${index + 1}. ${result.title}`);
        lines.push(`   ${result.url}`);
      }
    }
    return {
      provider: valyuImplementation.id,
      text: lines.join("\n").trimEnd(),
      itemCount: sources.length
    };
  },
  async research(input, config, context, options) {
    return await executeAsyncResearch({
      providerLabel: valyuImplementation.label,
      providerId: valyuImplementation.id,
      context,
      start: (researchContext) => valyuImplementation.startResearch(
        input,
        config,
        researchContext,
        options
      ),
      poll: (id, researchContext) => valyuImplementation.pollResearch(id, config, researchContext, options)
    });
  },
  async startResearch(input, config, _context, options) {
    const client = createClient9(config);
    const task = await client.deepresearch.create({
      input,
      ...asJsonObject(config.options?.research) ?? {},
      ...options ?? {}
    });
    if (!task.success || !task.deepresearch_id) {
      throw new Error(task.error || "deep research creation failed");
    }
    return { id: task.deepresearch_id };
  },
  async pollResearch(id, config, _context, _options) {
    const client = createClient9(config);
    const result = await client.deepresearch.status(id);
    if (!result.success) {
      throw new Error(result.error || "deep research failed");
    }
    if (result.status === "completed") {
      const lines = [];
      lines.push(
        typeof result.output === "string" ? result.output : result.output ? formatJson(result.output) : "Valyu deep research completed without textual output."
      );
      const sources = result.sources ?? [];
      if (sources.length > 0) {
        lines.push("");
        lines.push("Sources:");
        for (const [index, source] of sources.entries()) {
          lines.push(`${index + 1}. ${source.title}`);
          lines.push(`   ${source.url}`);
        }
      }
      return {
        status: "completed",
        output: {
          provider: valyuImplementation.id,
          text: lines.join("\n").trimEnd(),
          itemCount: sources.length
        }
      };
    }
    if (result.status === "failed") {
      return {
        status: "failed",
        error: result.error || "research failed"
      };
    }
    if (result.status === "cancelled") {
      return {
        status: "cancelled",
        error: result.error || "research was canceled"
      };
    }
    return { status: "in_progress" };
  }
};
function createClient9(config) {
  const apiKey = resolveConfigValue(config.credentials?.api);
  if (!apiKey) {
    throw new Error("is missing an API key");
  }
  return new ValyuClient(apiKey, resolveConfigValue(config.baseUrl));
}
var valyuProvider = defineProvider({
  id: "valyu",
  label: valyuImplementation.label,
  docsUrl: valyuImplementation.docsUrl,
  config: {
    createTemplate: () => valyuImplementation.createTemplate(),
    fields: ["credentials", "baseUrl", "options", "settings"],
    optionCapabilities: ["search", "answer", "research"]
  },
  getCapabilityStatus: (config, cwd, tool) => valyuImplementation.getCapabilityStatus(
    config,
    cwd,
    tool
  ),
  capabilities: {
    search: defineCapability({
      options: valyuImplementation.getToolOptionsSchema?.("search"),
      async execute(input, ctx) {
        const { query: query2, maxResults, options } = input;
        return await valyuImplementation.search(
          query2,
          maxResults,
          ctx.config,
          ctx,
          options
        );
      }
    }),
    contents: defineCapability({
      options: valyuImplementation.getToolOptionsSchema?.("contents"),
      async execute(input, ctx) {
        return await valyuImplementation.contents(
          input.urls,
          ctx.config,
          ctx,
          input.options
        );
      }
    }),
    answer: defineCapability({
      options: valyuImplementation.getToolOptionsSchema?.("answer"),
      async execute(input, ctx) {
        return await valyuImplementation.answer(
          input.query,
          ctx.config,
          ctx,
          input.options
        );
      }
    }),
    research: defineCapability({
      options: valyuImplementation.getToolOptionsSchema?.("research"),
      async execute(input, ctx) {
        return await valyuImplementation.research(
          input.input,
          ctx.config,
          ctx,
          input.options
        );
      }
    })
  }
});

// src/providers/index.ts
var PROVIDERS = defineProviders({
  brave: braveProvider,
  claude: claudeProvider,
  codex: codexProvider,
  cloudflare: cloudflareProvider,
  custom: customProvider,
  exa: exaProvider,
  firecrawl: firecrawlProvider,
  gemini: geminiProvider,
  linkup: linkupProvider,
  ollama: ollamaProvider,
  openai: openaiProvider,
  parallel: parallelProvider,
  perplexity: perplexityProvider,
  serper: serperProvider,
  tavily: tavilyProvider,
  valyu: valyuProvider
});
var PROVIDERS_BY_ID = PROVIDERS;
var PROVIDER_LIST = Object.values(PROVIDERS);
var PROVIDER_IDS = Object.keys(PROVIDERS);

// src/provider-tools.ts
var TOOL_INFO = {
  search: {
    label: "Search",
    help: "Enable the provider's search tool."
  },
  contents: {
    label: "Contents",
    help: "Enable the provider's content extraction tool."
  },
  answer: {
    label: "Answer",
    help: "Enable the provider's answer generation tool."
  },
  research: {
    label: "Research",
    help: "Enable the provider's long-form research tool."
  }
};
function supportsTool(providerId, toolId) {
  const capabilities = PROVIDERS[providerId].capabilities;
  return capabilities[toolId] !== void 0;
}
function getProviderTools(providerId) {
  return TOOLS.filter((tool) => supportsTool(providerId, tool));
}
function getCompatibleProviders(toolId) {
  return PROVIDER_LIST.filter(
    (provider) => supportsTool(provider.id, toolId)
  ).map((provider) => provider.id);
}
function getMappedProviderForTool(config, tool) {
  return config.tools?.[tool];
}

// src/config.ts
var CONFIG_FILE_NAME = "web-providers.json";
function getConfigPath() {
  return join(getAgentDir(), CONFIG_FILE_NAME);
}
async function loadConfig() {
  return readConfigFile(getConfigPath());
}
async function readConfigFile(path) {
  try {
    const content = await readFile(path, "utf-8");
    const raw = parseJson(content, path);
    const migrated = migrateLegacyCredentialConfig(raw);
    const config = normalizeConfig(migrated.config, path);
    if (migrated.changed) {
      await writeFile(path, serializeConfig(config), "utf-8");
    }
    return config;
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}
async function writeConfigFile(config) {
  const path = getConfigPath();
  await mkdir(dirname(path), { recursive: true });
  const cleaned = structuredClone(config);
  cleanupConfig(cleaned);
  await writeFile(path, serializeConfig(cleaned), "utf-8");
  return path;
}
function serializeConfig(config) {
  return `${JSON.stringify(toPublicConfig(config), null, 2)}
`;
}
function parseJson(text, source) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${source}: ${error.message}`);
  }
}
function migrateLegacyCredentialConfig(raw) {
  if (!isPlainObject3(raw) || !isPlainObject3(raw.providers)) {
    return { config: raw, changed: false };
  }
  let changed = false;
  const config = structuredClone(raw);
  const providers = config.providers;
  for (const [providerId, provider] of Object.entries(providers)) {
    if (!isPlainObject3(provider)) {
      continue;
    }
    const legacyKey = providerId === "cloudflare" ? "apiToken" : "apiKey";
    const legacyValue = provider[legacyKey];
    if (legacyValue === void 0) {
      continue;
    }
    const credentials = isPlainObject3(provider.credentials) ? { ...provider.credentials } : {};
    if (credentials.api === void 0) {
      credentials.api = legacyValue;
    }
    provider.credentials = credentials;
    delete provider[legacyKey];
    changed = true;
  }
  return { config, changed };
}
function normalizeConfig(raw, source) {
  const configObject = requireObject2(
    raw,
    `Config in ${source} must be a JSON object.`
  );
  const config = {};
  if (configObject.tools !== void 0) {
    config.tools = parseToolProviderMapping(
      configObject.tools,
      source,
      "tools"
    );
  }
  if (configObject.settings !== void 0) {
    config.settings = parseSettingsConfig(configObject.settings, source);
  }
  if (configObject.providers !== void 0) {
    const providers = requireObject2(
      configObject.providers,
      `'providers' in ${source} must be a JSON object.`
    );
    const unknownProviders = Object.keys(providers).filter(
      (key) => !PROVIDER_IDS.includes(key)
    );
    if (unknownProviders.length > 0) {
      throw new Error(
        `Unknown providers in ${source}: ${unknownProviders.join(", ")}.`
      );
    }
    config.providers = Object.fromEntries(
      PROVIDER_IDS.flatMap((providerId) => {
        const value = providers[providerId];
        return value === void 0 ? [] : [[providerId, normalizeProvider(providerId, value, source)]];
      })
    );
  }
  cleanupConfig(config);
  return config;
}
function normalizeProvider(providerId, raw, source) {
  const definition = PROVIDERS[providerId];
  return parseProviderWithShape(
    raw,
    source,
    providerId,
    buildProviderConfigShape(
      definition.config.fields,
      definition.config.optionCapabilities
    )
  );
}
function buildProviderConfigShape(fields, optionCapabilities) {
  return Object.fromEntries(
    fields.map((field) => [
      toProviderConfigKey(field),
      getProviderConfigFieldParser(field, optionCapabilities)
    ])
  );
}
function toProviderConfigKey(field) {
  return field === "customOptions" ? "options" : field;
}
function getProviderConfigFieldParser(field, optionCapabilities) {
  switch (field) {
    case "accountId":
    case "baseUrl":
    case "codexPath":
    case "pathToClaudeCodeExecutable":
      return readOptionalString2;
    case "config":
      return readOptionalObject;
    case "customOptions":
      return parseOptionalCustomProviderOptions;
    case "credentials":
    case "env":
      return readOptionalStringMap;
    case "options":
      return optionCapabilities ? (value, source, field2) => parseOptionalCapabilityOptions(
        value,
        source,
        field2,
        optionCapabilities
      ) : readOptionalObject;
    case "settings":
      return parseOptionalExecutionSettings;
  }
}
function parseProviderWithShape(raw, source, providerId, shape) {
  const provider = parseProviderObject(raw, source, providerId);
  const allowedKeys = Object.keys(shape);
  const unknownKeys = Object.keys(provider).filter(
    (key) => !allowedKeys.includes(key)
  );
  if (unknownKeys.length > 0) {
    throw new Error(
      `'providers.${providerId}' in ${source} must be a valid provider config.`
    );
  }
  return Object.fromEntries(
    Object.entries(shape).map(([key, parser]) => [
      key,
      parser(provider[key], source, `providers.${providerId}.${key}`)
    ])
  );
}
function parseProviderObject(raw, source, providerId) {
  const provider = requireObject2(
    raw,
    `'providers.${providerId}' in ${source} must be a JSON object.`
  );
  if (provider.tools !== void 0) {
    throw new Error(
      `'providers.${providerId}.tools' in ${source} is no longer supported. Use top-level 'tools' mappings instead.`
    );
  }
  if (provider.enabled !== void 0) {
    throw new Error(
      `'providers.${providerId}.enabled' in ${source} is no longer supported. Providers are always on; use top-level 'tools' mappings to route or disable capabilities.`
    );
  }
  return provider;
}
function parseSettingsConfig(value, source) {
  return parseExecutionSettings(value, source, "settings", true);
}
function parseOptionalExecutionSettings(value, source, field) {
  return value === void 0 ? void 0 : parseExecutionSettings(value, source, field, false);
}
function parseOptionalCapabilityOptions(value, source, field, allowedKeys) {
  if (value === void 0) {
    return void 0;
  }
  const options = requireObject2(
    value,
    `'${field}' in ${source} must be a JSON object.`
  );
  const unknownKeys = Object.keys(options).filter(
    (key) => !allowedKeys.includes(key)
  );
  if (unknownKeys.length > 0) {
    throw new Error(
      `'${field}' in ${source} only supports these keys: ${allowedKeys.join(", ")}.`
    );
  }
  return Object.fromEntries(
    allowedKeys.flatMap((key) => {
      const entry = options[key];
      return entry === void 0 ? [] : [
        [
          key,
          requireObject2(
            entry,
            `'${field}.${key}' in ${source} must be a JSON object.`
          )
        ]
      ];
    })
  );
}
function parseExecutionSettings(value, source, field, allowSearch) {
  const settings = requireObject2(
    value,
    `'${field}' in ${source} must be a JSON object.`
  );
  const unknownKeys = Object.keys(settings).filter(
    (key) => key !== "requestTimeoutMs" && key !== "retryCount" && key !== "retryDelayMs" && key !== "researchTimeoutMs" && (!allowSearch || key !== "search")
  );
  if (unknownKeys.length > 0) {
    throw new Error(`'${field}' in ${source} must be a JSON object.`);
  }
  const parsed = {};
  const requestTimeoutMs = parseOptionalPositiveInteger(
    settings.requestTimeoutMs,
    source,
    `${field}.requestTimeoutMs`
  );
  if (requestTimeoutMs !== void 0) {
    parsed.requestTimeoutMs = requestTimeoutMs;
  }
  const retryCount = parseOptionalNonNegativeInteger(
    settings.retryCount,
    source,
    `${field}.retryCount`
  );
  if (retryCount !== void 0) {
    parsed.retryCount = retryCount;
  }
  const retryDelayMs = parseOptionalPositiveInteger(
    settings.retryDelayMs,
    source,
    `${field}.retryDelayMs`
  );
  if (retryDelayMs !== void 0) {
    parsed.retryDelayMs = retryDelayMs;
  }
  const researchTimeoutMs = parseOptionalPositiveInteger(
    settings.researchTimeoutMs,
    source,
    `${field}.researchTimeoutMs`
  );
  if (researchTimeoutMs !== void 0) {
    parsed.researchTimeoutMs = researchTimeoutMs;
  }
  if (allowSearch && settings.search !== void 0) {
    parsed.search = parseSearchSettings(
      settings.search,
      source,
      `${field}.search`
    );
  }
  return parsed;
}
function parseToolProviderMapping(value, source, field) {
  const mapping = requireObject2(
    value,
    `'${field}' in ${source} must be a JSON object.`
  );
  const parsed = {};
  for (const [key, entry] of Object.entries(mapping)) {
    if (!TOOLS.includes(key)) {
      throw new Error(`Unknown tools in ${source}: ${key}.`);
    }
    parsed[key] = parseToolProviderMappingEntry(
      key,
      entry,
      source,
      `${field}.${key}`
    );
  }
  return parsed;
}
function parseToolProviderMappingEntry(tool, value, source, field) {
  const providerId = parseLiteral(value, source, field, PROVIDER_IDS);
  if (!supportsTool(providerId, tool)) {
    throw new Error(
      `'${field}' in ${source} must name a provider that supports '${tool}'.`
    );
  }
  return providerId;
}
function parseSearchSettings(value, source, field) {
  const settings = requireObject2(
    value,
    `'${field}' in ${source} must be a JSON object.`
  );
  const unknownFields = Object.keys(settings).filter(
    (key) => key !== "provider" && key !== "maxUrls" && key !== "ttlMs"
  );
  if (unknownFields.length > 0) {
    throw new Error(
      `Unknown search settings in ${source}: ${unknownFields.join(", ")}.`
    );
  }
  const provider = parseOptionalLiteral(
    settings.provider,
    source,
    `${field}.provider`,
    PROVIDER_IDS
  );
  if (provider !== void 0 && !supportsTool(provider, "contents")) {
    throw new Error(
      `'${field}.provider' in ${source} must name a provider that supports 'contents'.`
    );
  }
  return {
    provider,
    maxUrls: parseOptionalPositiveInteger(
      settings.maxUrls,
      source,
      `${field}.maxUrls`
    ),
    ttlMs: parseOptionalPositiveInteger(
      settings.ttlMs,
      source,
      `${field}.ttlMs`
    )
  };
}
function parseOptionalCustomProviderOptions(value, source, field) {
  if (value === void 0) {
    return void 0;
  }
  const options = requireObject2(
    value,
    `'${field}' in ${source} must be a JSON object.`
  );
  const unknownKeys = Object.keys(options).filter(
    (key) => key !== "search" && key !== "contents" && key !== "answer" && key !== "research"
  );
  if (unknownKeys.length > 0) {
    throw new Error(`'${field}' in ${source} must be a valid provider config.`);
  }
  return {
    search: parseOptionalCustomCommandConfig(
      options.search,
      source,
      `${field}.search`
    ),
    contents: parseOptionalCustomCommandConfig(
      options.contents,
      source,
      `${field}.contents`
    ),
    answer: parseOptionalCustomCommandConfig(
      options.answer,
      source,
      `${field}.answer`
    ),
    research: parseOptionalCustomCommandConfig(
      options.research,
      source,
      `${field}.research`
    )
  };
}
function parseOptionalCustomCommandConfig(value, source, field) {
  if (value === void 0) {
    return void 0;
  }
  const command = requireObject2(
    value,
    `'${field}' in ${source} must be a JSON object.`
  );
  const unknownKeys = Object.keys(command).filter(
    (key) => key !== "argv" && key !== "cwd" && key !== "env"
  );
  if (unknownKeys.length > 0) {
    throw new Error(`'${field}' in ${source} must be a valid provider config.`);
  }
  return {
    argv: readOptionalNonEmptyStringArray(
      command.argv,
      source,
      `${field}.argv`
    ),
    cwd: readOptionalString2(command.cwd, source, `${field}.cwd`),
    env: readOptionalStringMap(command.env, source, `${field}.env`)
  };
}
function toPublicConfig(config) {
  const providers = config.providers ? Object.fromEntries(
    Object.entries(config.providers).flatMap(
      ([providerId, provider]) => provider ? [[providerId, toPublicProviderConfig(provider)]] : []
    )
  ) : void 0;
  return {
    ...config.tools ? { tools: config.tools } : {},
    ...config.settings ? { settings: config.settings } : {},
    ...providers && Object.keys(providers).length > 0 ? { providers } : {}
  };
}
function toPublicProviderConfig(provider) {
  return {
    ..."pathToClaudeCodeExecutable" in provider && provider.pathToClaudeCodeExecutable !== void 0 ? {
      pathToClaudeCodeExecutable: provider.pathToClaudeCodeExecutable
    } : {},
    ..."codexPath" in provider && provider.codexPath !== void 0 ? { codexPath: provider.codexPath } : {},
    ..."baseUrl" in provider && provider.baseUrl !== void 0 ? { baseUrl: provider.baseUrl } : {},
    ...provider.credentials ? { credentials: provider.credentials } : {},
    ..."accountId" in provider && provider.accountId !== void 0 ? { accountId: provider.accountId } : {},
    ..."env" in provider && provider.env !== void 0 ? { env: provider.env } : {},
    ..."config" in provider && provider.config !== void 0 ? { config: provider.config } : {},
    ...provider.options ? { options: provider.options } : {},
    ...provider.settings ? { settings: provider.settings } : {}
  };
}
function readOptionalString2(value, source, field) {
  if (value === void 0) {
    return void 0;
  }
  if (typeof value !== "string") {
    throw new Error(`'${field}' in ${source} must be a string.`);
  }
  return value;
}
function readOptionalObject(value, source, field) {
  if (value === void 0) {
    return void 0;
  }
  return requireObject2(value, `'${field}' in ${source} must be a JSON object.`);
}
function readOptionalStringMap(value, source, field) {
  if (value === void 0) {
    return void 0;
  }
  const map = requireObject2(
    value,
    `'${field}' in ${source} must be a JSON object.`
  );
  for (const [key, entry] of Object.entries(map)) {
    if (typeof entry !== "string") {
      throw new Error(`'${field}.${key}' in ${source} must be a string.`);
    }
  }
  return map;
}
function readOptionalNonEmptyStringArray(value, source, field) {
  if (value === void 0) {
    return void 0;
  }
  if (!Array.isArray(value) || value.length === 0 || value.some(
    (entry) => typeof entry !== "string" || entry.trim().length === 0
  )) {
    throw new Error(
      `'${field}' in ${source} must be a non-empty array of non-empty strings.`
    );
  }
  return value;
}
function parseOptionalPositiveInteger(value, source, field) {
  if (value === void 0) {
    return void 0;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`'${field}' in ${source} must be a positive integer.`);
  }
  return value;
}
function parseOptionalNonNegativeInteger(value, source, field) {
  if (value === void 0) {
    return void 0;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`'${field}' in ${source} must be a non-negative integer.`);
  }
  return value;
}
function parseOptionalLiteral(value, source, field, allowed) {
  if (value === void 0) {
    return void 0;
  }
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(
      `'${field}' in ${source} must be one of: ${allowed.join(", ")}.`
    );
  }
  return value;
}
function parseLiteral(value, source, field, allowed) {
  const parsed = parseOptionalLiteral(value, source, field, allowed);
  if (parsed === void 0) {
    throw new Error(
      `'${field}' in ${source} must be one of: ${allowed.join(", ")}.`
    );
  }
  return parsed;
}
function cleanupConfig(config) {
  if (config.settings) {
    if (config.settings.search && Object.keys(config.settings.search).length === 0) {
      delete config.settings.search;
    }
    if (Object.keys(config.settings).length === 0) {
      delete config.settings;
    }
  }
  if (config.providers) {
    for (const providerId of Object.keys(config.providers)) {
      const provider = config.providers[providerId];
      if (!provider) {
        delete config.providers[providerId];
        continue;
      }
      cleanupNestedEmptyObjects(provider);
      if (Object.keys(provider).length === 0) {
        delete config.providers[providerId];
      }
    }
    if (Object.keys(config.providers).length === 0) {
      delete config.providers;
    }
  }
  if (config.tools && Object.keys(config.tools).length === 0) {
    delete config.tools;
  }
}
function cleanupNestedEmptyObjects(value) {
  for (const [key, entry] of Object.entries(value)) {
    if (Array.isArray(entry)) {
      if (entry.length === 0) {
        delete value[key];
      }
      continue;
    }
    if (isPlainObject3(entry)) {
      cleanupNestedEmptyObjects(entry);
      if (Object.keys(entry).length === 0) {
        delete value[key];
      }
      continue;
    }
    if (entry === void 0) {
      delete value[key];
    }
  }
}
function requireObject2(value, message) {
  if (!isPlainObject3(value)) {
    throw new Error(message);
  }
  return value;
}
function isPlainObject3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/contents.ts
function renderContentsAnswer(answer, index) {
  const heading = answer.error !== void 0 ? `Error: ${answer.url || "Untitled"}` : answer.url || "Untitled";
  const lines = [
    `## ${index === void 0 ? "" : `${index + 1}. `}${heading}`.trim()
  ];
  const body = answer.error !== void 0 ? answer.error.trim() : answer.content?.trim() ?? "";
  if (body) {
    lines.push("", body);
  }
  if (answer.summary !== void 0) {
    const summaryText = renderUnknown(answer.summary);
    if (summaryText) {
      lines.push("", "### Summary", "", summaryText);
    }
  }
  return lines.join("\n").trimEnd();
}
function renderContentsAnswers(answers) {
  if (answers.length === 0) {
    return "No contents found.";
  }
  return answers.map((answer, index) => renderContentsAnswer(answer, index)).join("\n\n").trim() || "No contents found.";
}
function renderUnknown(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === void 0) {
    return "";
  }
  return `\`\`\`json
${JSON.stringify(value, null, 2).trim()}
\`\`\``;
}

// src/options.ts
function buildToolOptionsSchema(_capability, providerSchema) {
  if (!providerSchema || Object.keys(providerSchema.properties).length === 0) {
    return void 0;
  }
  return closeObjectSchemas(providerSchema);
}
function closeObjectSchemas(schema) {
  if (!isSchemaRecord(schema)) {
    return schema;
  }
  const properties = isSchemaRecord(schema.properties) ? Object.fromEntries(
    Object.entries(schema.properties).map(([key, value]) => [
      key,
      closeObjectSchemas(value)
    ])
  ) : schema.properties;
  const items = isSchemaRecord(schema.items) ? closeObjectSchemas(schema.items) : Array.isArray(schema.items) ? schema.items.map((item) => closeObjectSchemas(item)) : schema.items;
  return {
    ...schema,
    ...properties ? { properties } : {},
    ...items ? { items } : {},
    ...mapSchemaArray(schema, "anyOf"),
    ...mapSchemaArray(schema, "oneOf"),
    ...mapSchemaArray(schema, "allOf"),
    ...schema.type === "object" && isSchemaRecord(schema.properties) ? { additionalProperties: false } : {}
  };
}
function mapSchemaArray(schema, key) {
  const value = schema[key];
  return Array.isArray(value) ? { [key]: value.map((entry) => closeObjectSchemas(entry)) } : {};
}
function isSchemaRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/prefetch-manager.ts
import { createHash } from "node:crypto";

// src/provider-resolution.ts
function supportsTool2(provider, tool) {
  return provider.capabilities[tool] !== void 0;
}
function resolveSearchProvider(config, cwd, explicit) {
  return resolveProviderForTool(config, cwd, "search", explicit);
}
function getEffectiveSharedSettings(config) {
  return mergeExecutionSettings(createDefaultExecutionSettings(), config.settings) ?? createDefaultExecutionSettings();
}
function getEffectiveProviderConfig(config, providerId) {
  const defaults = PROVIDERS[providerId].config.createTemplate();
  const overrides = config.providers?.[providerId] ?? {};
  const providerSettings = mergeExecutionSettings(
    defaults.settings,
    overrides.settings
  );
  const resolved = {
    ...defaults,
    ...overrides,
    credentials: mergeNestedObjects(
      defaults.credentials,
      overrides.credentials
    ),
    options: mergeNestedObjects(defaults.options, overrides.options)
  };
  const effectiveSettings = mergeExecutionSettings(
    config.settings,
    providerSettings
  );
  if (effectiveSettings) {
    resolved.settings = effectiveSettings;
  } else {
    delete resolved.settings;
  }
  return resolved;
}
function mergeExecutionSettings(base2, overrides) {
  const merged = {
    requestTimeoutMs: overrides?.requestTimeoutMs ?? base2?.requestTimeoutMs,
    retryCount: overrides?.retryCount ?? base2?.retryCount,
    retryDelayMs: overrides?.retryDelayMs ?? base2?.retryDelayMs,
    researchTimeoutMs: overrides?.researchTimeoutMs ?? base2?.researchTimeoutMs
  };
  return Object.values(merged).some((value) => value !== void 0) ? merged : void 0;
}
function mergeNestedObjects(base2, overrides) {
  if (base2 === void 0) {
    return overrides;
  }
  if (overrides === void 0) {
    return base2;
  }
  if (!isPlainObject4(base2) || !isPlainObject4(overrides)) {
    return overrides;
  }
  const result = { ...base2 };
  for (const [key, value] of Object.entries(overrides)) {
    const baseValue = result[key];
    result[key] = isPlainObject4(baseValue) && isPlainObject4(value) ? mergeNestedObjects(baseValue, value) : value;
  }
  return result;
}
function isPlainObject4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function getMappedProviderIdForTool(config, tool) {
  return getMappedProviderForTool(config, tool);
}
function getProviderCapabilityStatus(config, cwd, providerId, tool) {
  const provider = PROVIDERS[providerId];
  return provider.getCapabilityStatus(
    getEffectiveProviderConfig(config, providerId),
    cwd,
    tool
  );
}
function isProviderCapabilityReady(status) {
  return status.state === "ready";
}
function getProviderSetupState(config, providerId) {
  if (providerId === "claude" || providerId === "codex") {
    return "builtin";
  }
  const providerConfig = config.providers?.[providerId];
  if (!providerConfig) {
    return "none";
  }
  if (providerId === "custom") {
    return Object.keys(providerConfig).length > 0 ? "configured" : "none";
  }
  if (providerId === "cloudflare") {
    return providerConfig.credentials !== void 0 || providerConfig.accountId !== void 0 ? "configured" : "none";
  }
  return providerConfig.credentials !== void 0 ? "configured" : "none";
}
function formatProviderCapabilityStatus(status, providerId, tool) {
  switch (status.state) {
    case "ready":
      return "Ready";
    case "missing_api_key":
      return "Missing API key";
    case "missing_executable":
      return providerId === "claude" ? "Missing Claude Code executable" : "Missing executable";
    case "missing_command":
      return tool ? `No command configured for ${tool}` : "No commands configured";
    case "invalid_config":
      return status.detail;
  }
}
function resolveProviderForTool(config, cwd, tool, explicit) {
  const providerId = explicit ?? getMappedProviderIdForTool(config, tool);
  if (!providerId) {
    throw new Error(
      `No provider is configured for '${tool}'. Run /web-providers to configure tool mappings.`
    );
  }
  const provider = PROVIDERS[providerId];
  if (!supportsTool2(provider, tool)) {
    throw new Error(`Provider '${providerId}' does not support '${tool}'.`);
  }
  const status = getProviderCapabilityStatus(config, cwd, providerId, tool);
  if (!isProviderCapabilityReady(status)) {
    const detail = formatProviderCapabilityStatus(status, providerId, tool);
    const errorDetail = detail.length > 0 ? `${detail.charAt(0).toLowerCase()}${detail.slice(1)}` : detail;
    throw new Error(
      `Provider '${providerId}' is not available: ${errorDetail}.`
    );
  }
  return provider;
}

// src/provider-runtime.ts
async function executeProviderRequest(provider, config, request, context) {
  return await executeProviderExecution(
    {
      capability: request.capability,
      providerLabel: provider.label,
      settings: config.settings,
      execute: (executionContext) => executeProviderCapability(
        provider,
        request.capability,
        providerInputFromRequest(request),
        {
          ...executionContext,
          config
        }
      )
    },
    context
  );
}
async function executeProviderExecution(execution, context) {
  if (execution.capability === "research") {
    const deadline = createResearchDeadlineSignal(
      context.signal,
      execution.providerLabel,
      execution.settings?.researchTimeoutMs
    );
    try {
      const researchContext = deadline ? { ...context, signal: deadline.signal } : context;
      return await withAbortSignal(
        execution.execute(researchContext),
        researchContext.signal
      );
    } catch (error) {
      throw new Error(
        formatProviderDiagnostic(
          execution.providerLabel,
          formatErrorMessage(error)
        )
      );
    } finally {
      deadline?.cleanup();
    }
  }
  const requestPolicy = resolveExecutionPolicy(execution.settings);
  try {
    return await runWithExecutionPolicy(
      `${execution.providerLabel} ${execution.capability} request`,
      execution.execute,
      requestPolicy,
      context
    );
  } catch (error) {
    throw new Error(
      formatProviderDiagnostic(
        execution.providerLabel,
        formatErrorMessage(error)
      )
    );
  }
}
function providerInputFromRequest(request) {
  switch (request.capability) {
    case "search":
      return {
        query: request.query,
        maxResults: request.maxResults,
        options: request.options
      };
    case "contents":
      return {
        urls: request.urls,
        options: request.options
      };
    case "answer":
      return {
        query: request.query,
        options: request.options
      };
    case "research":
      return {
        input: request.input,
        options: request.options
      };
  }
}
function resolveExecutionPolicy(defaults) {
  return {
    requestTimeoutMs: defaults?.requestTimeoutMs,
    retryCount: defaults?.retryCount ?? 0,
    retryDelayMs: defaults?.retryDelayMs ?? 2e3
  };
}
function createResearchDeadlineSignal(signal, providerLabel, timeoutMs) {
  if (timeoutMs === void 0) {
    return void 0;
  }
  const controller = new AbortController();
  if (signal?.aborted) {
    controller.abort(getAbortError2(signal));
  }
  const onAbort = () => {
    controller.abort(getAbortError2(signal));
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => {
    controller.abort(
      new Error(
        `${providerLabel} research exceeded ${formatDuration(timeoutMs)}.`
      )
    );
  }, timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  };
}
function getAbortError2(signal, message = "Operation aborted.") {
  const reason = signal?.reason;
  if (reason instanceof Error) {
    return reason;
  }
  if (typeof reason === "string" && reason.length > 0) {
    return new Error(reason);
  }
  return new Error(message);
}
async function withAbortSignal(promise, signal) {
  if (!signal) {
    return await promise;
  }
  if (signal.aborted) {
    throw getAbortError2(signal);
  }
  return await new Promise((resolve2, reject) => {
    const onAbort = () => {
      cleanup();
      reject(getAbortError2(signal));
    };
    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve2(value);
      },
      (error) => {
        cleanup();
        reject(error);
      }
    );
  });
}

// src/prefetch-manager.ts
var CONTENT_CACHE_VERSION = 2;
var DEFAULT_CONTENT_TTL_MS = 30 * 60 * 1e3;
var DEFAULT_PREFETCH_MAX_URLS = 3;
var MAX_PREFETCH_URLS = 5;
var contentCache = /* @__PURE__ */ new Map();
var inFlightContents = /* @__PURE__ */ new Map();
var contentStoreGeneration = 0;
async function cleanupContentStore() {
  cleanupExpiredEntries();
}
async function startContentsPrefetch({
  config,
  cwd,
  urls,
  options,
  onProgress
}) {
  const selectedUrls = selectPrefetchUrls(urls, options.maxUrls);
  if (selectedUrls.length === 0) {
    return void 0;
  }
  const provider = resolveContentsProvider(config, cwd, options.provider);
  if (!provider) {
    return void 0;
  }
  const generation = contentStoreGeneration;
  const ttlMs = clampTtlMs(options.ttlMs);
  void Promise.allSettled(
    selectedUrls.map(
      (url2) => ensureContentsStored({
        url: url2,
        providerId: provider.id,
        config,
        cwd,
        options: void 0,
        ttlMs,
        onProgress,
        generation
      })
    )
  );
  return {
    provider: provider.id,
    urlCount: selectedUrls.length
  };
}
async function resolveContentsFromStore({
  urls,
  providerId,
  config,
  cwd,
  options,
  signal,
  onProgress
}) {
  cleanupExpiredEntries();
  if (urls.length <= 1 || urls.some((url2) => hasReusableContents(url2, providerId, options))) {
    return await resolvePerUrlContents({
      urls,
      providerId,
      config,
      cwd,
      options,
      signal,
      onProgress
    });
  }
  return await fetchBatchContents({
    urls,
    providerId,
    config,
    cwd,
    options,
    signal,
    onProgress
  });
}
function mergeSearchContentsPrefetchOptions(defaults, overrides) {
  if (!defaults && !overrides) {
    return void 0;
  }
  return {
    provider: overrides?.provider !== void 0 ? overrides.provider : defaults?.provider,
    maxUrls: overrides?.maxUrls !== void 0 ? overrides.maxUrls : defaults?.maxUrls,
    ttlMs: overrides?.ttlMs !== void 0 ? overrides.ttlMs : defaults?.ttlMs
  };
}
function resetContentStore() {
  contentStoreGeneration += 1;
  contentCache.clear();
  inFlightContents.clear();
}
async function resolvePerUrlContents({
  urls,
  providerId,
  config,
  cwd,
  options,
  signal,
  onProgress
}) {
  const settled = await Promise.allSettled(
    urls.map(
      (url2) => ensureContentsStored({
        url: url2,
        providerId,
        config,
        cwd,
        options,
        signal,
        onProgress
      })
    )
  );
  const answers = [];
  const failures = [];
  let resolvedProvider;
  for (const [index, result] of settled.entries()) {
    if (result.status === "fulfilled") {
      resolvedProvider ??= result.value.provider;
      answers.push(result.value.item);
    } else {
      failures.push({
        url: urls[index] ?? "",
        error: formatUnknownError(result.reason)
      });
    }
  }
  if (answers.length === 0 && failures.length > 0) {
    throw new Error(
      failures.length === 1 ? failures[0]?.error ?? "web_contents failed." : `web_contents failed for all ${failures.length} URL(s): ${failures.map(
        (failure, index) => `${index + 1}. ${failure.url} \u2014 ${failure.error}`
      ).join("; ")}`
    );
  }
  return {
    provider: resolvedProvider ?? providerId,
    answers: orderContentsForRequest(
      [
        ...answers,
        ...failures.map((failure) => ({
          url: failure.url,
          error: failure.error
        }))
      ],
      urls
    )
  };
}
async function fetchBatchContents({
  urls,
  providerId,
  config,
  cwd,
  options,
  signal,
  onProgress,
  ttlMs = DEFAULT_CONTENT_TTL_MS,
  generation = contentStoreGeneration
}) {
  const normalizedUrls = normalizeBatchUrls(urls);
  if (normalizedUrls.length === 0) {
    throw new Error("At least one valid HTTP(S) URL is required.");
  }
  const response = await fetchContentsViaProvider({
    urls: normalizedUrls,
    providerId,
    config,
    cwd,
    options,
    signal,
    onProgress
  });
  const expiresAt = Date.now() + ttlMs;
  for (const answer of response.answers) {
    const canonicalUrl = canonicalizeUrl(answer.url);
    if (answer.error !== void 0 || answer.content === void 0 || !/^https?:\/\//i.test(canonicalUrl)) {
      continue;
    }
    setCachedContents(
      buildContentsCacheKey(canonicalUrl, response.provider, options),
      {
        provider: response.provider,
        item: toStoredContentItem(answer),
        expiresAt
      },
      generation
    );
  }
  return {
    provider: response.provider,
    answers: orderContentsForRequest(response.answers, urls)
  };
}
async function ensureContentsStored({
  url: url2,
  providerId,
  config,
  cwd,
  options,
  signal,
  onProgress,
  ttlMs = DEFAULT_CONTENT_TTL_MS,
  generation = contentStoreGeneration
}) {
  const canonicalUrl = canonicalizeUrl(url2);
  const key = buildContentsCacheKey(canonicalUrl, providerId, options);
  const cached = getCachedContents(key);
  if (cached) {
    return cached;
  }
  const inFlight = inFlightContents.get(key);
  if (inFlight) {
    return await inFlight.task;
  }
  let task;
  task = (async () => {
    try {
      const response = await fetchContentsViaProvider({
        urls: [canonicalUrl],
        providerId,
        config,
        cwd,
        options,
        signal,
        onProgress
      });
      const answer = findAnswerForUrl(response.answers, canonicalUrl) ?? {
        url: canonicalUrl,
        error: "No content returned for this URL."
      };
      const stored = {
        provider: response.provider,
        item: toStoredContentItem(answer),
        expiresAt: Date.now() + ttlMs
      };
      setCachedContents(key, stored, generation);
      return stored;
    } finally {
      const current = inFlightContents.get(key);
      if (current?.generation === generation && current.task === task) {
        inFlightContents.delete(key);
      }
    }
  })();
  inFlightContents.set(key, { generation, task });
  return await task;
}
async function fetchContentsViaProvider({
  urls,
  providerId,
  config,
  cwd,
  options,
  signal,
  onProgress
}) {
  const provider = PROVIDERS_BY_ID[providerId];
  const providerConfig = getEffectiveProviderConfig(config, providerId);
  onProgress?.(
    `Fetching contents via ${provider.label} for ${urls.length} URL(s)`
  );
  const result = await executeProviderRequest(
    provider,
    providerConfig,
    {
      capability: "contents",
      urls,
      options
    },
    {
      cwd,
      signal,
      onProgress
    }
  );
  if (!isContentsResponse(result)) {
    throw new Error(`${provider.label} contents returned an invalid result.`);
  }
  return result;
}
function cleanupExpiredEntries(now = Date.now()) {
  for (const [key, entry] of contentCache) {
    if (entry.expiresAt <= now) {
      contentCache.delete(key);
    }
  }
}
function hasReusableContents(url2, providerId, options) {
  const key = buildContentsCacheKey(canonicalizeUrl(url2), providerId, options);
  return getCachedContents(key) !== void 0 || inFlightContents.has(key);
}
function getCachedContents(key) {
  const cached = contentCache.get(key);
  if (!cached) {
    return void 0;
  }
  if (cached.expiresAt <= Date.now()) {
    contentCache.delete(key);
    return void 0;
  }
  return cached;
}
function setCachedContents(key, value, generation) {
  if (generation === contentStoreGeneration) {
    contentCache.set(key, value);
  }
}
function findAnswerForUrl(answers, url2) {
  return answers.find((answer) => canonicalizeUrl(answer.url) === url2);
}
function toStoredContentItem(answer) {
  return {
    url: answer.url,
    ...answer.content !== void 0 ? { content: answer.content } : {},
    ...answer.summary !== void 0 ? { summary: answer.summary } : {},
    ...answer.metadata !== void 0 ? { metadata: answer.metadata } : {},
    ...answer.error !== void 0 ? { error: answer.error } : {}
  };
}
function orderContentsForRequest(answers, urls) {
  const byUrl = /* @__PURE__ */ new Map();
  const extras = [];
  for (const answer of answers) {
    if (!answer.url) {
      extras.push(answer);
      continue;
    }
    const key = canonicalizeUrl(answer.url);
    const bucket = byUrl.get(key);
    if (bucket) {
      bucket.push(answer);
    } else {
      byUrl.set(key, [answer]);
    }
  }
  const ordered = [];
  for (const url2 of urls) {
    const bucket = byUrl.get(canonicalizeUrl(url2));
    const next = bucket?.shift();
    if (next) {
      ordered.push(next);
    }
  }
  for (const bucket of byUrl.values()) {
    ordered.push(...bucket);
  }
  ordered.push(...extras);
  return ordered.length > 0 ? ordered : answers;
}
function buildContentsCacheKey(url2, providerId, options) {
  return [
    "web-contents",
    `v${CONTENT_CACHE_VERSION}`,
    providerId,
    hashString(url2),
    hashOptions(options)
  ].join(":");
}
function hashOptions(options) {
  return hashString(stableStringify(options ?? {}));
}
function hashString(value) {
  return createHash("sha256").update(value).digest("hex");
}
function resolveContentsProvider(config, cwd, explicitProvider) {
  if (!explicitProvider) {
    return void 0;
  }
  const provider = PROVIDERS_BY_ID[explicitProvider];
  if (!supportsTool(explicitProvider, "contents")) {
    return void 0;
  }
  const status = getProviderCapabilityStatus(
    config,
    cwd,
    explicitProvider,
    "contents"
  );
  return isProviderCapabilityReady(status) ? provider : void 0;
}
function canonicalizeUrl(url2) {
  try {
    const parsed = new URL(url2);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url2.trim();
  }
}
function normalizeBatchUrls(urls) {
  return [...new Set(urls.map((url2) => canonicalizeUrl(url2)).filter(Boolean))].filter((url2) => /^https?:\/\//i.test(url2)).sort();
}
function selectPrefetchUrls(urls, maxUrls) {
  const limit = clampPrefetchUrlCount(maxUrls);
  const seen = /* @__PURE__ */ new Set();
  const selected = [];
  for (const url2 of urls) {
    const canonical = canonicalizeUrl(url2);
    if (!/^https?:\/\//i.test(canonical) || seen.has(canonical)) {
      continue;
    }
    selected.push(canonical);
    seen.add(canonical);
    if (selected.length >= limit) {
      break;
    }
  }
  return selected;
}
function clampPrefetchUrlCount(value) {
  if (value === void 0) {
    return DEFAULT_PREFETCH_MAX_URLS;
  }
  return Math.min(Math.max(Math.trunc(value), 1), MAX_PREFETCH_URLS);
}
function clampTtlMs(value) {
  if (value === void 0) {
    return DEFAULT_CONTENT_TTL_MS;
  }
  return Math.max(1e3, value);
}
function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  return `{${Object.keys(value).sort().map(
    (key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`
  ).join(",")}}`;
}
function formatUnknownError(error) {
  return error instanceof Error ? error.message : String(error);
}
function isJsonObject3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isProviderId(value) {
  return typeof value === "string" && PROVIDER_IDS.includes(value);
}
function isContentsResponse(value) {
  return isJsonObject3(value) && isProviderId(value.provider) && Array.isArray(value.answers) && value.answers.every((item) => isContentsAnswer(item));
}
function isContentsAnswer(value) {
  return isJsonObject3(value) && (value.url === void 0 || typeof value.url === "string") && (value.content === void 0 || typeof value.content === "string") && (value.error === void 0 || typeof value.error === "string") && (value.metadata === void 0 || isJsonObject3(value.metadata));
}

// src/provider-config-manifests.ts
var PROVIDER_SETTINGS = {
  brave: {
    settings: [
      credentialSetting({
        id: "credentials.search",
        name: "search",
        label: "Search API key",
        help: "Brave Search API key. You can use a literal value, an env var name like BRAVE_SEARCH_API_KEY, or !command."
      }),
      credentialSetting({
        id: "credentials.answers",
        name: "answers",
        label: "Answers API key",
        help: "Brave Answers API key. You can use a literal value, an env var name like BRAVE_ANSWERS_API_KEY, or !command."
      }),
      baseUrlSetting()
    ]
  },
  claude: {
    settings: [
      stringSetting({
        id: "model",
        label: "Model",
        help: "Optional Claude model override. Leave empty to use the local default.",
        getValue: (config) => getClaudeOptions(config)?.model,
        setValue: (config, value) => {
          assignOptionalString(ensureClaudeOptions(config), "model", value);
          cleanupEmpty(config, "options");
        }
      }),
      valuesSetting({
        id: "claudeEffort",
        label: "Effort",
        help: "How much effort Claude should use. 'default' uses the SDK default.",
        values: ["default", "low", "medium", "high", "max"],
        getValue: (config) => getClaudeOptions(config)?.effort ?? "default",
        setValue: (config, value) => {
          const options = ensureClaudeOptions(config);
          if (value === "default") {
            delete options.effort;
          } else {
            options.effort = value;
          }
          cleanupEmpty(config, "options");
        }
      }),
      stringSetting({
        id: "claudeMaxTurns",
        label: "Max turns",
        help: "Optional maximum number of Claude turns. Leave empty to use the SDK default.",
        getValue: (config) => getIntegerString(getClaudeOptions(config)?.maxTurns),
        setValue: (config, value) => {
          assignOptionalInteger(
            ensureClaudeOptions(config),
            "maxTurns",
            value,
            "Claude max turns must be a positive integer."
          );
          cleanupEmpty(config, "options");
        }
      }),
      stringSetting({
        id: "claudePathToExecutable",
        label: "Executable path",
        help: "Optional path to the Claude Code executable. Leave empty to use the bundled/default executable.",
        getValue: (config) => config?.pathToClaudeCodeExecutable,
        setValue: (config, value) => {
          assignOptionalString(
            config,
            "pathToClaudeCodeExecutable",
            value
          );
        }
      })
    ]
  },
  cloudflare: {
    settings: [
      credentialSetting({
        id: "credentials.api",
        label: "API token",
        help: "Cloudflare API token for Browser Rendering. The token needs the permission `Account | Browser Rendering | Edit`. You can use a literal value, an env var name like CLOUDFLARE_API_TOKEN, or !command."
      }),
      stringSetting({
        id: "accountId",
        label: "Account ID",
        help: "Cloudflare account ID for the same account the token is scoped to. You can use a literal value, an env var name like CLOUDFLARE_ACCOUNT_ID, or !command.",
        getValue: (config) => config?.accountId,
        setValue: (config, value) => {
          assignOptionalString(
            config,
            "accountId",
            value
          );
        }
      })
    ]
  },
  codex: {
    settings: [
      stringSetting({
        id: "model",
        label: "Model",
        help: "Optional Codex model override. Leave empty to use the local default.",
        getValue: (config) => getCodexOptions(config)?.model,
        setValue: (config, value) => {
          assignOptionalString(
            ensureCodexOptions(config),
            "model",
            value
          );
          cleanupEmpty(config, "options");
        }
      }),
      valuesSetting({
        id: "modelReasoningEffort",
        label: "Reasoning effort",
        help: "Reasoning depth for Codex. 'default' uses the SDK default.",
        values: ["default", "minimal", "low", "medium", "high", "xhigh"],
        getValue: (config) => getCodexOptions(config)?.modelReasoningEffort ?? "default",
        setValue: (config, value) => {
          const options = ensureCodexOptions(config);
          if (value === "default") {
            delete options.modelReasoningEffort;
          } else {
            options.modelReasoningEffort = value;
          }
          cleanupEmpty(config, "options");
        }
      }),
      valuesSetting({
        id: "webSearchMode",
        label: "Web search mode",
        help: "How Codex should source web results. 'default' currently behaves like 'live'.",
        values: ["default", "disabled", "cached", "live"],
        getValue: (config) => getCodexOptions(config)?.webSearchMode ?? "default",
        setValue: (config, value) => {
          const options = ensureCodexOptions(config);
          if (value === "default") {
            delete options.webSearchMode;
          } else {
            options.webSearchMode = value;
          }
          cleanupEmpty(config, "options");
        }
      }),
      valuesSetting({
        id: "networkAccessEnabled",
        label: "Network access",
        help: "Allow Codex network access during search runs. 'default' currently behaves like 'true'.",
        values: ["default", "true", "false"],
        getValue: (config) => getBooleanValue(getCodexOptions(config)?.networkAccessEnabled),
        setValue: (config, value) => {
          assignOptionalBoolean(
            ensureCodexOptions(config),
            "networkAccessEnabled",
            value
          );
          cleanupEmpty(config, "options");
        }
      }),
      valuesSetting({
        id: "webSearchEnabled",
        label: "Web search",
        help: "Enable Codex web search. 'default' currently behaves like 'true'.",
        values: ["default", "true", "false"],
        getValue: (config) => getBooleanValue(getCodexOptions(config)?.webSearchEnabled),
        setValue: (config, value) => {
          assignOptionalBoolean(
            ensureCodexOptions(config),
            "webSearchEnabled",
            value
          );
          cleanupEmpty(config, "options");
        }
      }),
      stringSetting({
        id: "additionalDirectories",
        label: "Additional dirs",
        help: "Optional comma-separated directories that Codex may read in addition to the current working directory.",
        getValue: (config) => getCodexOptions(config)?.additionalDirectories?.join(", "),
        setValue: (config, value) => {
          const options = ensureCodexOptions(config);
          const trimmed = value.trim();
          if (!trimmed) {
            delete options.additionalDirectories;
          } else {
            options.additionalDirectories = trimmed.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
          }
          cleanupEmpty(config, "options");
        }
      })
    ]
  },
  custom: {
    settings: [
      stringSetting({
        id: "customSearchArgv",
        label: "Search argv",
        help: `Optional JSON string array for the command to run for web_search, for example ["node","./scripts/codex-search.mjs"].`,
        getValue: (config) => getCustomOptions(config)?.search?.argv ? JSON.stringify(getCustomOptions(config)?.search?.argv) : void 0,
        setValue: (config, value) => {
          setCustomArgv(config, "search", value);
        }
      }),
      stringSetting({
        id: "customSearchCwd",
        label: "Search cwd",
        help: "Optional working directory for the web_search command. Relative paths resolve from the active project directory.",
        getValue: (config) => getCustomOptions(config)?.search?.cwd,
        setValue: (config, value) => {
          setCustomCwd(config, "search", value);
        }
      }),
      stringSetting({
        id: "customSearchEnv",
        label: "Search env",
        help: "Optional JSON object of string environment variables for the web_search command. Values can be literal strings, env var names, or !command.",
        getValue: (config) => formatCustomEnv(getCustomOptions(config)?.search?.env),
        setValue: (config, value) => {
          setCustomEnv(config, "search", value);
        }
      }),
      stringSetting({
        id: "customContentsArgv",
        label: "Contents argv",
        help: "Optional JSON string array for the command to run for web_contents.",
        getValue: (config) => getCustomOptions(config)?.contents?.argv ? JSON.stringify(getCustomOptions(config)?.contents?.argv) : void 0,
        setValue: (config, value) => {
          setCustomArgv(config, "contents", value);
        }
      }),
      stringSetting({
        id: "customContentsCwd",
        label: "Contents cwd",
        help: "Optional working directory for the web_contents command. Relative paths resolve from the active project directory.",
        getValue: (config) => getCustomOptions(config)?.contents?.cwd,
        setValue: (config, value) => {
          setCustomCwd(config, "contents", value);
        }
      }),
      stringSetting({
        id: "customContentsEnv",
        label: "Contents env",
        help: "Optional JSON object of string environment variables for the web_contents command. Values can be literal strings, env var names, or !command.",
        getValue: (config) => formatCustomEnv(getCustomOptions(config)?.contents?.env),
        setValue: (config, value) => {
          setCustomEnv(config, "contents", value);
        }
      }),
      stringSetting({
        id: "customAnswerArgv",
        label: "Answer argv",
        help: "Optional JSON string array for the command to run for web_answer.",
        getValue: (config) => getCustomOptions(config)?.answer?.argv ? JSON.stringify(getCustomOptions(config)?.answer?.argv) : void 0,
        setValue: (config, value) => {
          setCustomArgv(config, "answer", value);
        }
      }),
      stringSetting({
        id: "customAnswerCwd",
        label: "Answer cwd",
        help: "Optional working directory for the web_answer command. Relative paths resolve from the active project directory.",
        getValue: (config) => getCustomOptions(config)?.answer?.cwd,
        setValue: (config, value) => {
          setCustomCwd(config, "answer", value);
        }
      }),
      stringSetting({
        id: "customAnswerEnv",
        label: "Answer env",
        help: "Optional JSON object of string environment variables for the web_answer command. Values can be literal strings, env var names, or !command.",
        getValue: (config) => formatCustomEnv(getCustomOptions(config)?.answer?.env),
        setValue: (config, value) => {
          setCustomEnv(config, "answer", value);
        }
      }),
      stringSetting({
        id: "customResearchArgv",
        label: "Research argv",
        help: "Optional JSON string array for the command to run for web_research.",
        getValue: (config) => getCustomOptions(config)?.research?.argv ? JSON.stringify(getCustomOptions(config)?.research?.argv) : void 0,
        setValue: (config, value) => {
          setCustomArgv(config, "research", value);
        }
      }),
      stringSetting({
        id: "customResearchCwd",
        label: "Research cwd",
        help: "Optional working directory for the web_research command. Relative paths resolve from the active project directory.",
        getValue: (config) => getCustomOptions(config)?.research?.cwd,
        setValue: (config, value) => {
          setCustomCwd(config, "research", value);
        }
      }),
      stringSetting({
        id: "customResearchEnv",
        label: "Research env",
        help: "Optional JSON object of string environment variables for the web_research command. Values can be literal strings, env var names, or !command.",
        getValue: (config) => formatCustomEnv(getCustomOptions(config)?.research?.env),
        setValue: (config, value) => {
          setCustomEnv(config, "research", value);
        }
      })
    ]
  },
  exa: {
    settings: [
      credentialSetting(),
      baseUrlSetting(),
      valuesSetting({
        id: "exaSearchType",
        label: "Search type",
        help: "Exa search mode. 'default' uses the SDK default.",
        values: [
          "default",
          "keyword",
          "neural",
          "auto",
          "hybrid",
          "fast",
          "instant",
          "deep",
          "deep-reasoning",
          "deep-max"
        ],
        getValue: (config) => readString5(getExaSearchOptions(config)?.type) ?? "default",
        setValue: (config, value) => {
          const options = ensureExaSearchOptions(config);
          if (value === "default") {
            delete options.type;
          } else {
            options.type = value;
          }
          cleanupCapabilityOptions(config, ["search"]);
        }
      }),
      valuesSetting({
        id: "exaSearchTextContents",
        label: "Search text contents",
        help: "Whether Exa should include text contents in search results. 'default' uses the SDK default.",
        values: ["default", "true", "false"],
        getValue: (config) => {
          const contents = asJsonObject2(getExaSearchOptions(config)?.contents);
          return typeof contents?.text === "boolean" ? String(contents.text) : "default";
        },
        setValue: (config, value) => {
          const options = ensureExaSearchOptions(config);
          const contents = asJsonObject2(options.contents) ?? {};
          if (value === "default") {
            delete contents.text;
          } else {
            contents.text = value === "true";
          }
          if (Object.keys(contents).length === 0) {
            delete options.contents;
          } else {
            options.contents = contents;
          }
          cleanupCapabilityOptions(config, ["search"]);
        }
      })
    ]
  },
  firecrawl: {
    settings: [credentialSetting(), baseUrlSetting()]
  },
  gemini: {
    settings: [
      credentialSetting(),
      valuesSetting({
        id: "geminiApiVersion",
        label: "API version",
        help: "Gemini API version. 'default' uses the SDK default beta endpoints.",
        values: ["default", "v1alpha", "v1beta", "v1"],
        getValue: (config) => getGeminiOptions2(config)?.apiVersion ?? "default",
        setValue: (config, value) => {
          const options = ensureGeminiOptions(config);
          if (value === "default") {
            delete options.apiVersion;
          } else {
            options.apiVersion = value;
          }
          cleanupEmpty(config, "options");
        }
      }),
      stringSetting({
        id: "geminiSearchModel",
        label: "Search model",
        help: "Model used for Gemini search interactions.",
        getValue: (config) => getGeminiOptions2(config)?.searchModel,
        setValue: (config, value) => {
          assignOptionalString(
            ensureGeminiOptions(config),
            "searchModel",
            value
          );
          cleanupEmpty(config, "options");
        }
      }),
      stringSetting({
        id: "geminiAnswerModel",
        label: "Answer model",
        help: "Model used for grounded Gemini answers.",
        getValue: (config) => getGeminiOptions2(config)?.answerModel,
        setValue: (config, value) => {
          assignOptionalString(
            ensureGeminiOptions(config),
            "answerModel",
            value
          );
          cleanupEmpty(config, "options");
        }
      }),
      stringSetting({
        id: "geminiResearchAgent",
        label: "Research agent",
        help: "Agent used for Gemini deep research runs.",
        getValue: (config) => getGeminiOptions2(config)?.researchAgent,
        setValue: (config, value) => {
          assignOptionalString(
            ensureGeminiOptions(config),
            "researchAgent",
            value
          );
          cleanupEmpty(config, "options");
        }
      })
    ]
  },
  linkup: {
    settings: [credentialSetting(), baseUrlSetting()]
  },
  ollama: {
    settings: [credentialSetting(), baseUrlSetting()]
  },
  openai: {
    settings: [
      credentialSetting(),
      baseUrlSetting(),
      stringSetting({
        id: "openaiSearchModel",
        label: "Search model",
        help: "Model used for OpenAI web search runs.",
        getValue: (config) => getOpenAISearchOptions(config)?.model,
        setValue: (config, value) => {
          assignOptionalString(
            ensureOpenAISearchOptions(config),
            "model",
            value
          );
          cleanupCapabilityOptions(config, ["search", "answer", "research"]);
        }
      }),
      stringSetting({
        id: "openaiSearchInstructions",
        label: "Search instructions",
        help: "Optional default instructions for OpenAI web search runs.",
        getValue: (config) => getOpenAISearchOptions(config)?.instructions,
        setValue: (config, value) => {
          assignOptionalString(
            ensureOpenAISearchOptions(config),
            "instructions",
            value
          );
          cleanupCapabilityOptions(config, ["search", "answer", "research"]);
        }
      }),
      stringSetting({
        id: "openaiAnswerModel",
        label: "Answer model",
        help: "Model used for OpenAI grounded answers.",
        getValue: (config) => getOpenAIAnswerOptions(config)?.model,
        setValue: (config, value) => {
          assignOptionalString(
            ensureOpenAIAnswerOptions(config),
            "model",
            value
          );
          cleanupCapabilityOptions(config, ["search", "answer", "research"]);
        }
      }),
      stringSetting({
        id: "openaiAnswerInstructions",
        label: "Answer instructions",
        help: "Optional default instructions for OpenAI grounded answers.",
        getValue: (config) => getOpenAIAnswerOptions(config)?.instructions,
        setValue: (config, value) => {
          assignOptionalString(
            ensureOpenAIAnswerOptions(config),
            "instructions",
            value
          );
          cleanupCapabilityOptions(config, ["search", "answer", "research"]);
        }
      }),
      stringSetting({
        id: "openaiResearchModel",
        label: "Research model",
        help: "Model used for OpenAI deep research runs.",
        getValue: (config) => getOpenAIResearchOptions(config)?.model,
        setValue: (config, value) => {
          assignOptionalString(
            ensureOpenAIResearchOptions(config),
            "model",
            value
          );
          cleanupCapabilityOptions(config, ["search", "answer", "research"]);
        }
      }),
      stringSetting({
        id: "openaiResearchInstructions",
        label: "Research instructions",
        help: "Optional default instructions for OpenAI deep research runs.",
        getValue: (config) => getOpenAIResearchOptions(config)?.instructions,
        setValue: (config, value) => {
          assignOptionalString(
            ensureOpenAIResearchOptions(config),
            "instructions",
            value
          );
          cleanupCapabilityOptions(config, ["search", "answer", "research"]);
        }
      }),
      stringSetting({
        id: "openaiResearchMaxToolCalls",
        label: "Research max tool calls",
        help: "Optional default maximum number of built-in tool calls for OpenAI deep research runs.",
        getValue: (config) => getIntegerString(getOpenAIResearchOptions(config)?.max_tool_calls),
        setValue: (config, value) => {
          assignOptionalInteger(
            ensureOpenAIResearchOptions(config),
            "max_tool_calls",
            value,
            "OpenAI research max tool calls must be a positive integer."
          );
          cleanupCapabilityOptions(config, ["search", "answer", "research"]);
        }
      })
    ]
  },
  perplexity: {
    settings: [credentialSetting(), baseUrlSetting()]
  },
  parallel: {
    settings: [
      credentialSetting(),
      baseUrlSetting(),
      valuesSetting({
        id: "parallelSearchMode",
        label: "Search mode",
        help: "Parallel search mode. 'default' uses the SDK default.",
        values: ["default", "agentic", "one-shot"],
        getValue: (config) => readString5(getParallelOptions(config)?.search?.mode) ?? "default",
        setValue: (config, value) => {
          const options = ensureParallelOptions(config);
          options.search = asJsonObject2(options.search) ?? {};
          if (value === "default") {
            delete options.search.mode;
          } else {
            options.search.mode = value;
          }
          cleanupNestedObjects(config);
        }
      }),
      valuesSetting({
        id: "parallelExtractExcerpts",
        label: "Extract excerpts",
        help: "Include excerpts in Parallel extraction results. 'default' uses the SDK default.",
        values: ["default", "on", "off"],
        getValue: (config) => {
          const value = getParallelOptions(config)?.extract?.excerpts;
          return typeof value === "boolean" ? value ? "on" : "off" : "default";
        },
        setValue: (config, value) => {
          const options = ensureParallelOptions(config);
          options.extract = asJsonObject2(options.extract) ?? {};
          if (value === "default") {
            delete options.extract.excerpts;
          } else {
            options.extract.excerpts = value === "on";
          }
          cleanupNestedObjects(config);
        }
      }),
      valuesSetting({
        id: "parallelExtractFullContent",
        label: "Extract full content",
        help: "Include full page content in Parallel extraction results. 'default' uses the SDK default.",
        values: ["default", "on", "off"],
        getValue: (config) => {
          const value = getParallelOptions(config)?.extract?.full_content;
          return typeof value === "boolean" ? value ? "on" : "off" : "default";
        },
        setValue: (config, value) => {
          const options = ensureParallelOptions(config);
          options.extract = asJsonObject2(options.extract) ?? {};
          if (value === "default") {
            delete options.extract.full_content;
          } else {
            options.extract.full_content = value === "on";
          }
          cleanupNestedObjects(config);
        }
      })
    ]
  },
  serper: {
    settings: [credentialSetting(), baseUrlSetting()]
  },
  tavily: {
    settings: [credentialSetting(), baseUrlSetting()]
  },
  valyu: {
    settings: [
      credentialSetting(),
      baseUrlSetting(),
      valuesSetting({
        id: "valyuSearchType",
        label: "Search type",
        help: "Valyu search type. 'default' uses the SDK default.",
        values: ["default", "all", "web", "proprietary", "news"],
        getValue: (config) => readString5(getValyuCapabilityOptions(config, "search")?.searchType) ?? "default",
        setValue: (config, value) => {
          const options = ensureValyuCapabilityOptions(config, "search");
          if (value === "default") {
            delete options.searchType;
          } else {
            options.searchType = value;
          }
          cleanupCapabilityOptions(config, ["search", "answer", "research"]);
        }
      }),
      valuesSetting({
        id: "valyuSearchResponseLength",
        label: "Search response length",
        help: "Valyu search response length. 'default' uses the SDK default.",
        values: ["default", "short", "medium", "large", "max"],
        getValue: (config) => readString5(
          getValyuCapabilityOptions(config, "search")?.responseLength
        ) ?? "default",
        setValue: (config, value) => {
          setValyuResponseLength(config, "search", value);
        }
      }),
      valuesSetting({
        id: "valyuAnswerResponseLength",
        label: "Answer response length",
        help: "Valyu answer response length. 'default' uses the SDK default.",
        values: ["default", "short", "medium", "large", "max"],
        getValue: (config) => readString5(
          getValyuCapabilityOptions(config, "answer")?.responseLength
        ) ?? "default",
        setValue: (config, value) => {
          setValyuResponseLength(config, "answer", value);
        }
      }),
      valuesSetting({
        id: "valyuResearchResponseLength",
        label: "Research response length",
        help: "Valyu research response length. 'default' uses the SDK default.",
        values: ["default", "short", "medium", "large", "max"],
        getValue: (config) => readString5(
          getValyuCapabilityOptions(config, "research")?.responseLength
        ) ?? "default",
        setValue: (config, value) => {
          setValyuResponseLength(config, "research", value);
        }
      })
    ]
  }
};
var PROVIDER_CONFIG_MANIFESTS = deriveProviderConfigManifests();
function getProviderConfigManifest(providerId) {
  return PROVIDER_CONFIG_MANIFESTS[providerId];
}
function deriveProviderConfigManifests() {
  return Object.fromEntries(
    Object.keys(PROVIDERS).map((providerId) => [
      providerId,
      {
        settings: PROVIDER_SETTINGS[providerId]?.settings ?? []
      }
    ])
  );
}
function stringSetting(setting) {
  return {
    kind: "text",
    ...setting
  };
}
function valuesSetting(setting) {
  return {
    kind: "values",
    ...setting
  };
}
function credentialSetting(options = {}) {
  const name = options.name ?? "api";
  return stringSetting({
    id: options.id ?? `credentials.${name}`,
    label: options.label ?? "API key",
    help: options.help ?? "Provider credential. You can use a literal value, an env var name like EXA_API_KEY, or !command.",
    secret: true,
    getValue: (config) => config?.credentials?.[name],
    setValue: (config, value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        delete config.credentials?.[name];
      } else {
        config.credentials = { ...config.credentials ?? {}, [name]: trimmed };
      }
      cleanupEmpty(config, "credentials");
    }
  });
}
function baseUrlSetting() {
  return stringSetting({
    id: "baseUrl",
    label: "Base URL",
    help: "Optional API base URL override.",
    getValue: (config) => config?.baseUrl,
    setValue: (config, value) => {
      assignOptionalString(
        config,
        "baseUrl",
        value
      );
    }
  });
}
function assignOptionalString(target, key, value) {
  const record = target;
  const trimmed = value.trim();
  if (!trimmed) {
    delete record[key];
  } else {
    record[key] = trimmed;
  }
}
function assignOptionalInteger(target, key, value, errorMessage, options) {
  const record = target;
  const trimmed = value.trim();
  if (!trimmed) {
    delete record[key];
    return;
  }
  const parsed = Number(trimmed);
  const minimum = options?.allowZero ? 0 : 1;
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(errorMessage);
  }
  record[key] = parsed;
}
function assignOptionalBoolean(target, key, value) {
  if (value === "default") {
    delete target[key];
  } else {
    target[key] = value === "true";
  }
}
function getIntegerString(value) {
  return typeof value === "number" ? String(value) : void 0;
}
function getBooleanValue(value) {
  return typeof value === "boolean" ? String(value) : "default";
}
function readString5(value) {
  return typeof value === "string" ? value : void 0;
}
function asJsonObject2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function cleanupEmpty(config, key) {
  const value = asJsonObject2(config[key]);
  if (value && Object.keys(value).length === 0) {
    delete config[key];
  }
}
function cleanupNestedObjects(config) {
  const options = config.options;
  if (!options) {
    return;
  }
  if (options.search && Object.keys(options.search).length === 0) {
    delete options.search;
  }
  if (options.extract && Object.keys(options.extract).length === 0) {
    delete options.extract;
  }
  cleanupEmpty(config, "options");
}
function getClaudeOptions(config) {
  return config?.options;
}
function ensureClaudeOptions(config) {
  config.options = { ...config.options ?? {} };
  return config.options;
}
function getCodexOptions(config) {
  return config?.options;
}
function ensureCodexOptions(config) {
  config.options = { ...config.options ?? {} };
  return config.options;
}
function getGeminiOptions2(config) {
  return config?.options;
}
function ensureGeminiOptions(config) {
  config.options = { ...config.options ?? {} };
  return config.options;
}
function getCustomOptions(config) {
  return config?.options;
}
function ensureCustomOptions(config) {
  const options = getCustomOptions(config);
  config.options = {
    ...options?.search ? { search: { ...options.search } } : {},
    ...options?.contents ? { contents: { ...options.contents } } : {},
    ...options?.answer ? { answer: { ...options.answer } } : {},
    ...options?.research ? { research: { ...options.research } } : {}
  };
  return config.options;
}
function formatCustomEnv(env) {
  return env ? JSON.stringify(env) : void 0;
}
function setCustomArgv(config, capability, value) {
  const trimmed = value.trim();
  const options = ensureCustomOptions(config);
  if (!trimmed) {
    delete options[capability];
    cleanupCustomOptions(config);
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(
      `Custom ${capability} argv must be a JSON string array: ${error.message}`
    );
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some(
    (entry) => typeof entry !== "string" || entry.trim().length === 0
  )) {
    throw new Error(
      `Custom ${capability} argv must be a non-empty JSON string array.`
    );
  }
  options[capability] = {
    ...options[capability] ?? {},
    argv: parsed
  };
  cleanupCustomOptions(config);
}
function setCustomCwd(config, capability, value) {
  const options = ensureCustomOptions(config);
  const command = { ...options[capability] ?? {} };
  assignOptionalString(
    command,
    "cwd",
    value
  );
  options[capability] = command;
  cleanupCustomOptions(config);
}
function setCustomEnv(config, capability, value) {
  const trimmed = value.trim();
  const options = ensureCustomOptions(config);
  const command = { ...options[capability] ?? {} };
  if (!trimmed) {
    delete command.env;
  } else {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      throw new Error(
        `Custom ${capability} env must be a JSON object of strings: ${error.message}`
      );
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.values(parsed).some((entry) => typeof entry !== "string")) {
      throw new Error(
        `Custom ${capability} env must be a JSON object of strings.`
      );
    }
    command.env = parsed;
  }
  options[capability] = command;
  cleanupCustomOptions(config);
}
function cleanupCustomOptions(config) {
  const options = config.options;
  if (!options) {
    return;
  }
  for (const capability of [
    "search",
    "contents",
    "answer",
    "research"
  ]) {
    const entry = options[capability];
    if (!entry) {
      continue;
    }
    if (entry.argv === void 0 && entry.cwd === void 0 && (entry.env === void 0 || Object.keys(entry.env).length === 0)) {
      delete options[capability];
    }
  }
  cleanupEmpty(config, "options");
}
function getParallelOptions(config) {
  return config?.options;
}
function ensureParallelOptions(config) {
  const search = asJsonObject2(config.options?.search);
  const extract = asJsonObject2(config.options?.extract);
  config.options = {
    ...search ? { search } : {},
    ...extract ? { extract } : {}
  };
  return config.options;
}
function getExaSearchOptions(config) {
  return config?.options?.search;
}
function ensureExaSearchOptions(config) {
  config.options = {
    ...config.options ?? {},
    search: asJsonObject2(config.options?.search) ?? {}
  };
  return config.options.search;
}
function getOpenAISearchOptions(config) {
  return config?.options?.search;
}
function ensureOpenAISearchOptions(config) {
  config.options = {
    ...config.options ?? {},
    search: { ...config.options?.search ?? {} }
  };
  return config.options.search ?? (config.options.search = {});
}
function getOpenAIAnswerOptions(config) {
  return config?.options?.answer;
}
function ensureOpenAIAnswerOptions(config) {
  config.options = {
    ...config.options ?? {},
    answer: { ...config.options?.answer ?? {} }
  };
  return config.options.answer ?? (config.options.answer = {});
}
function getOpenAIResearchOptions(config) {
  return config?.options?.research;
}
function ensureOpenAIResearchOptions(config) {
  config.options = {
    ...config.options ?? {},
    research: { ...config.options?.research ?? {} }
  };
  return config.options.research ?? (config.options.research = {});
}
function getValyuCapabilityOptions(config, capability) {
  return config?.options?.[capability];
}
function ensureValyuCapabilityOptions(config, capability) {
  config.options = {
    ...config.options ?? {},
    [capability]: asJsonObject2(config.options?.[capability]) ?? {}
  };
  return config.options[capability];
}
function setValyuResponseLength(config, capability, value) {
  const options = ensureValyuCapabilityOptions(config, capability);
  if (value === "default") {
    delete options.responseLength;
  } else {
    options.responseLength = value;
  }
  cleanupCapabilityOptions(config, ["search", "answer", "research"]);
}
function cleanupCapabilityOptions(config, keys) {
  const options = asJsonObject2(config.options);
  if (!options) {
    return;
  }
  for (const key of keys) {
    const value = asJsonObject2(options[key]);
    if (value && Object.keys(value).length === 0) {
      delete options[key];
    }
  }
  cleanupEmpty(config, "options");
}

// src/index.ts
var DEFAULT_MAX_RESULTS = 5;
var MAX_ALLOWED_RESULTS = 20;
var MAX_SEARCH_QUERIES = 10;
var RESEARCH_HEARTBEAT_MS = 15e3;
var WEB_RESEARCH_RESULT_MESSAGE_TYPE = "web-research-result";
var WEB_RESEARCH_WIDGET_KEY = "web-research-jobs";
var RESEARCH_ARTIFACTS_DIR = join2(".pi", "artifacts", "research");
var pendingResearchTasks = /* @__PURE__ */ new Set();
var CAPABILITY_TOOL_NAMES = {
  search: "web_search",
  contents: "web_contents",
  answer: "web_answer",
  research: "web_research"
};
var MANAGED_TOOL_NAMES = Object.values(CAPABILITY_TOOL_NAMES);
function webProvidersExtension(pi) {
  const activeWebResearchRequests = /* @__PURE__ */ new Map();
  let latestWidgetContext;
  let webResearchWidgetTimer;
  const stopWebResearchWidgetTimer = () => {
    if (webResearchWidgetTimer) {
      clearInterval(webResearchWidgetTimer);
      webResearchWidgetTimer = void 0;
    }
  };
  const ensureWebResearchWidgetTimer = () => {
    if (webResearchWidgetTimer || activeWebResearchRequests.size === 0) {
      return;
    }
    webResearchWidgetTimer = setInterval(() => {
      updateWebResearchWidget();
    }, 1e3);
  };
  const updateWebResearchWidget = (ctx) => {
    const widgetContext = ctx ?? latestWidgetContext;
    if (!widgetContext) {
      return;
    }
    latestWidgetContext = widgetContext;
    if (!widgetContext.hasUI) {
      stopWebResearchWidgetTimer();
      return;
    }
    if (activeWebResearchRequests.size === 0) {
      stopWebResearchWidgetTimer();
      widgetContext.ui.setWidget(WEB_RESEARCH_WIDGET_KEY, void 0);
      return;
    }
    ensureWebResearchWidgetTimer();
    widgetContext.ui.setWidget(
      WEB_RESEARCH_WIDGET_KEY,
      buildWebResearchWidgetLines(
        [...activeWebResearchRequests.values()],
        widgetContext.ui.theme
      )
    );
  };
  if ("registerMessageRenderer" in pi) {
    pi.registerMessageRenderer(
      WEB_RESEARCH_RESULT_MESSAGE_TYPE,
      renderWebResearchResultMessage
    );
  }
  pi.registerCommand("web-providers", {
    description: "Configure web search providers",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("web-providers requires interactive mode", "error");
        return;
      }
      await runWebProvidersConfig(
        pi,
        { activeWebResearchRequests, updateWebResearchWidget },
        ctx
      );
    }
  });
  pi.on("session_start", async (_event, ctx) => {
    latestWidgetContext = ctx;
    resetContentStore();
    updateWebResearchWidget(ctx);
    await refreshManagedToolsOnStartup(
      pi,
      { activeWebResearchRequests, updateWebResearchWidget },
      ctx.cwd,
      { addAvailable: true }
    );
  });
  pi.on("before_agent_start", async (_event, ctx) => {
    latestWidgetContext = ctx;
    await cleanupContentStore();
    updateWebResearchWidget(ctx);
    await refreshManagedToolsOnStartup(
      pi,
      { activeWebResearchRequests, updateWebResearchWidget },
      ctx.cwd,
      { addAvailable: false }
    );
  });
  pi.on("session_shutdown", async () => {
    stopWebResearchWidgetTimer();
    latestWidgetContext?.ui.setWidget(WEB_RESEARCH_WIDGET_KEY, void 0);
  });
}
function registerManagedTools(pi, webResearchLifecycle, providerIdsByCapability = {}) {
  registerWebSearchTool(pi, providerIdsByCapability.search ?? []);
  registerWebContentsTool(pi, providerIdsByCapability.contents ?? []);
  registerWebAnswerTool(pi, providerIdsByCapability.answer ?? []);
  registerWebResearchTool(
    pi,
    webResearchLifecycle,
    providerIdsByCapability.research ?? []
  );
}
function registerWebSearchTool(pi, providerIds) {
  if (providerIds.length !== 1) return;
  const selectedProviderId = providerIds[0];
  const maxAllowedResults = getSearchMaxResultsLimit(selectedProviderId);
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description: `Find likely sources on the public web for up to ${MAX_SEARCH_QUERIES} queries in a single call and return titles, URLs, and snippets grouped by query. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)} when needed.`,
    promptGuidelines: buildPromptGuidelines("search", selectedProviderId, [
      "Batch related searches when grouped comparison matters; use separate sibling web_search calls when independent results should surface as soon as they are ready."
    ]),
    parameters: Type16.Object(
      {
        queries: Type16.Array(Type16.String({ minLength: 1 }), {
          minItems: 1,
          maxItems: MAX_SEARCH_QUERIES,
          description: `One or more search queries to run in one call (max ${MAX_SEARCH_QUERIES})`
        }),
        maxResults: Type16.Optional(
          Type16.Integer({
            minimum: 1,
            maximum: maxAllowedResults,
            description: `Maximum number of results to return (default: ${DEFAULT_MAX_RESULTS})`
          })
        ),
        ...optionalField(
          "options",
          buildStructuredOptionsSchema("search", selectedProviderId)
        )
      },
      { additionalProperties: false }
    ),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      return executeSearchTool({
        config: await loadConfig(),
        request: {
          queries: params.queries,
          maxResults: params.maxResults,
          options: params.options
        },
        context: {
          cwd: ctx.cwd,
          signal: signal ?? void 0,
          progress: createProgressEmitter(onUpdate)
        }
      });
    },
    renderCall(args, theme) {
      return renderCallHeader(
        args,
        theme
      );
    },
    renderResult(result, state, theme) {
      return renderSearchToolResult(
        result,
        state.expanded,
        state.isPartial,
        theme
      );
    }
  });
}
function registerWebContentsTool(pi, providerIds) {
  if (providerIds.length !== 1) return;
  const selectedProviderId = providerIds[0];
  pi.registerTool({
    name: "web_contents",
    label: "Web Contents",
    description: "Read and extract the main contents of one or more web pages. Batch related pages together, or use separate sibling calls when each page can be acted on independently.",
    parameters: Type16.Object(
      {
        urls: Type16.Array(Type16.String({ minLength: 1 }), {
          minItems: 1,
          description: "One or more URLs to extract"
        }),
        ...optionalField(
          "options",
          buildStructuredOptionsSchema("contents", selectedProviderId)
        )
      },
      { additionalProperties: false }
    ),
    promptGuidelines: buildPromptGuidelines("contents", selectedProviderId, []),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      return executeProviderTool({
        config: await loadConfig(),
        request: {
          capability: "contents",
          urls: params.urls,
          options: params.options
        },
        context: {
          cwd: ctx.cwd,
          signal: signal ?? void 0,
          progress: createProgressEmitter(onUpdate)
        }
      });
    },
    renderCall(args, theme) {
      return renderListCallHeader(
        "web_contents",
        Array.isArray(args.urls) ? args.urls ?? [] : [],
        theme
      );
    },
    renderResult(result, state, theme) {
      return renderProviderToolResult(
        result,
        state.expanded,
        state.isPartial,
        "web_contents failed",
        theme,
        { markdownWhenExpanded: true }
      );
    }
  });
}
function registerWebAnswerTool(pi, providerIds) {
  if (providerIds.length !== 1) return;
  const selectedProviderId = providerIds[0];
  pi.registerTool({
    name: "web_answer",
    label: "Web Answer",
    description: `Answer one or more simple factual questions using web-grounded evidence (up to ${MAX_SEARCH_QUERIES} per call). Prefer web_search plus web_contents when source selection matters, and web_research for multi-step investigations.`,
    parameters: Type16.Object(
      {
        queries: Type16.Array(Type16.String({ minLength: 1 }), {
          minItems: 1,
          maxItems: MAX_SEARCH_QUERIES,
          description: `One or more simple factual questions to answer in one call (max ${MAX_SEARCH_QUERIES})`
        }),
        ...optionalField(
          "options",
          buildStructuredOptionsSchema("answer", selectedProviderId)
        )
      },
      { additionalProperties: false }
    ),
    promptGuidelines: buildPromptGuidelines("answer", selectedProviderId, [
      "Use web_answer as a quick grounded-answer shortcut for simple factual questions, not as a replacement for inspecting sources or doing deeper research.",
      "Prefer web_search plus web_contents when source selection matters or primary sources need direct inspection; prefer web_research for open-ended, controversial, or multi-step investigations.",
      "Batch related questions when the answers belong together; use separate sibling web_answer calls when earlier independent answers can unblock the next step."
    ]),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      return executeAnswerTool({
        config: await loadConfig(),
        request: {
          queries: params.queries,
          options: params.options
        },
        context: {
          cwd: ctx.cwd,
          signal: signal ?? void 0,
          progress: createProgressEmitter(onUpdate)
        }
      });
    },
    renderCall(args, theme) {
      return renderQuestionCallHeader(
        {
          queries: Array.isArray(args.queries) ? args.queries ?? [] : []
        },
        theme
      );
    },
    renderResult(result, state, theme) {
      return renderProviderToolResult(
        result,
        state.expanded,
        state.isPartial,
        "web_answer failed",
        theme,
        { markdownWhenExpanded: true }
      );
    }
  });
}
function registerWebResearchTool(pi, webResearchLifecycle, providerIds) {
  if (providerIds.length !== 1) return;
  const selectedProviderId = providerIds[0];
  pi.registerTool({
    name: "web_research",
    label: "Web Research",
    description: "Start a long-running web research job. Returns immediately with a dispatch notice; the final report is saved to a file and posted later as a custom message.",
    parameters: Type16.Object(
      {
        input: Type16.String({ description: "Research brief or question" }),
        ...optionalField(
          "options",
          buildStructuredOptionsSchema("research", selectedProviderId)
        )
      },
      { additionalProperties: false }
    ),
    promptGuidelines: buildPromptGuidelines("research", selectedProviderId, [
      "Use this tool for deep investigations that can finish asynchronously.",
      "Pass only input unless the user explicitly requests provider options.",
      "Do not expect the final report in the same turn; tell the user that web research has started and wait for the completion message with the saved report path."
    ]),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      return dispatchWebResearch({
        pi,
        activeWebResearchRequests: webResearchLifecycle.activeWebResearchRequests,
        updateWebResearchWidget: webResearchLifecycle.updateWebResearchWidget,
        config: await loadConfig(),
        request: {
          input: params.input,
          options: params.options
        },
        context: ctx
      });
    },
    renderCall(args, theme) {
      return renderResearchCallHeader(
        {
          input: String(args.input ?? "")
        },
        theme
      );
    },
    renderResult(result, state, theme) {
      return renderWebResearchDispatchResult(result, state.expanded, theme);
    }
  });
}
async function runWebProvidersConfig(pi, webResearchLifecycle, ctx) {
  const config = await loadConfig();
  const activeProvider = getInitialProviderSelection(config);
  await ctx.ui.custom(
    (tui, theme, _keybindings, done) => new WebProvidersSettingsView(
      tui,
      theme,
      done,
      ctx,
      config,
      activeProvider
    )
  );
  await refreshManagedTools(pi, webResearchLifecycle, ctx.cwd, {
    addAvailable: true
  });
}
function formatStartupConfigError(error) {
  const detail = error instanceof Error ? error.message : String(error);
  return `web-providers config error: ${detail.replace(getConfigPath(), "~/.pi/agent/web-providers.json")}`;
}
function getAvailableProviderIdsForCapability(config, cwd, capability) {
  const providerId = getMappedProviderIdForTool(config, capability);
  if (!providerId) {
    return [];
  }
  try {
    resolveProviderForTool(config, cwd, capability);
    return [providerId];
  } catch {
    return [];
  }
}
function getProviderStatusForTool(config, cwd, providerId, capability) {
  return getProviderCapabilityStatus(config, cwd, providerId, capability);
}
function getAvailableManagedToolNames(config, cwd) {
  return Object.keys(CAPABILITY_TOOL_NAMES).filter(
    (capability) => getAvailableProviderIdsForCapability(config, cwd, capability).length > 0
  ).map((capability) => CAPABILITY_TOOL_NAMES[capability]);
}
function getSyncedActiveTools(config, cwd, activeToolNames, options) {
  const availableToolNames = new Set(getAvailableManagedToolNames(config, cwd));
  const nextActiveTools = new Set(activeToolNames);
  for (const toolName of MANAGED_TOOL_NAMES) {
    if (availableToolNames.has(toolName)) {
      if (options.addAvailable) {
        nextActiveTools.add(toolName);
      }
      continue;
    }
    nextActiveTools.delete(toolName);
  }
  return nextActiveTools;
}
async function refreshManagedTools(pi, webResearchLifecycle, cwd, options) {
  const config = await loadConfig();
  const nextActiveTools = getSyncedActiveTools(
    config,
    cwd,
    pi.getActiveTools(),
    options
  );
  registerManagedTools(pi, webResearchLifecycle, {
    search: getAvailableProviderIdsForCapability(config, cwd, "search"),
    contents: getAvailableProviderIdsForCapability(config, cwd, "contents"),
    answer: getAvailableProviderIdsForCapability(config, cwd, "answer"),
    research: getAvailableProviderIdsForCapability(config, cwd, "research")
  });
  await syncManagedToolAvailability(pi, nextActiveTools);
}
async function refreshManagedToolsOnStartup(pi, webResearchLifecycle, cwd, options) {
  try {
    await refreshManagedTools(pi, webResearchLifecycle, cwd, options);
  } catch (error) {
    const message = formatStartupConfigError(error);
    pi.sendMessage({
      customType: "web-providers-config-error",
      content: message,
      display: true
    });
    await syncManagedToolAvailability(
      pi,
      new Set(
        pi.getActiveTools().filter((toolName) => !MANAGED_TOOL_NAMES.includes(toolName))
      )
    );
  }
}
async function syncManagedToolAvailability(pi, nextActiveTools) {
  const activeTools = pi.getActiveTools();
  const changed = activeTools.length !== nextActiveTools.size || activeTools.some((toolName) => !nextActiveTools.has(toolName));
  if (changed) {
    pi.setActiveTools(Array.from(nextActiveTools));
  }
}
function getSearchMaxResultsLimit(providerId) {
  const capabilities = PROVIDERS_BY_ID[providerId].capabilities;
  return capabilities.search?.limits?.maxResults ?? MAX_ALLOWED_RESULTS;
}
function buildPromptGuidelines(capability, providerId, baseGuidelines) {
  return [
    ...baseGuidelines,
    ...getProviderCapabilityPromptGuidelines(capability, providerId)
  ];
}
function getProviderCapabilityPromptGuidelines(capability, providerId) {
  const capabilities = PROVIDERS_BY_ID[providerId].capabilities;
  return capabilities[capability]?.promptGuidelines ?? [];
}
function optionalField(name, schema) {
  return schema ? { [name]: schema } : {};
}
function buildStructuredOptionsSchema(capability, providerId) {
  const providerSchema = resolveProviderOptionsSchema(capability, providerId);
  const schema = buildToolOptionsSchema(capability, providerSchema);
  return schema ? Type16.Optional(schema) : void 0;
}
function resolveProviderOptionsSchema(capability, providerId) {
  if (!providerId) {
    return void 0;
  }
  const provider = PROVIDERS_BY_ID[providerId];
  return provider.capabilities[capability]?.options;
}
async function executeSearchTool({
  config,
  request,
  context
}) {
  return executeSearchToolInternal({
    config,
    ctx: { cwd: context.cwd },
    signal: context.signal,
    progress: context.progress,
    providerOptions: request.options,
    maxResults: request.maxResults,
    queries: request.queries
  });
}
async function executeSearchToolInternal({
  config,
  explicitProvider,
  ctx,
  signal,
  progress,
  providerOptions,
  maxResults,
  queries,
  executionOverrides
}) {
  await cleanupContentStore();
  const provider = resolveSearchProvider(config, ctx.cwd, explicitProvider);
  const providerConfig = getEffectiveProviderConfig(config, provider.id);
  const prefetchOptions = mergeSearchContentsPrefetchOptions(
    getSearchPrefetchDefaults(config),
    void 0
  );
  const searchQueries = resolveSearchQueries(queries);
  if (executionOverrides !== void 0 && executionOverrides.length !== searchQueries.length) {
    throw new Error(
      "executionOverrides length must match the number of search queries."
    );
  }
  const progressReporter = createToolProgressReporter(
    "search",
    provider.id,
    progress
  );
  const batchProgress = searchQueries.length > 1 ? createBatchCompletionReporter(
    "Searching",
    provider.label,
    searchQueries.length,
    progressReporter.report
  ) : void 0;
  const providerContext = {
    cwd: ctx.cwd,
    signal: signal ?? void 0
  };
  const clampedMaxResults = clampResults(
    maxResults,
    getSearchMaxResultsLimit(provider.id)
  );
  let outcomes;
  try {
    batchProgress?.start();
    const settled = await Promise.allSettled(
      searchQueries.map(
        (searchQuery, index) => executeSingleSearchQuery({
          provider,
          providerConfig,
          query: searchQuery,
          maxResults: clampedMaxResults,
          options: providerOptions,
          providerContext,
          onProgress: searchQueries.length > 1 ? void 0 : progressReporter.report,
          executionOverride: executionOverrides?.[index]
        }).then(
          (value) => {
            batchProgress?.markCompleted();
            return value;
          },
          (error) => {
            batchProgress?.markFailed();
            throw error;
          }
        )
      )
    );
    outcomes = settled.map(
      (result, index) => result.status === "fulfilled" ? { query: searchQueries[index] ?? "", response: result.value } : {
        query: searchQueries[index] ?? "",
        error: formatErrorMessage(result.reason)
      }
    );
  } finally {
    progressReporter.stop();
  }
  if (outcomes.every((outcome) => outcome.error !== void 0)) {
    throw buildSearchBatchError(outcomes);
  }
  const prefetch = prefetchOptions !== void 0 && executionOverrides === void 0 ? await startContentsPrefetch({
    config,
    cwd: ctx.cwd,
    urls: collectSearchResultUrls(outcomes),
    options: prefetchOptions
  }) : void 0;
  const rendered = await truncateAndSave(
    formatSearchResponses(outcomes, prefetch),
    "web-search"
  );
  return {
    content: [{ type: "text", text: rendered }],
    details: buildWebSearchDetails(provider.id, outcomes)
  };
}
async function executeRawProviderRequest({
  capability,
  config,
  explicitProvider,
  ctx,
  signal,
  options,
  maxResults,
  urls,
  query: query2,
  input
}) {
  if (capability === "search") {
    const provider2 = resolveSearchProvider(config, ctx.cwd, explicitProvider);
    const providerConfig2 = getEffectiveProviderConfig(config, provider2.id);
    return executeSingleSearchQuery({
      provider: provider2,
      providerConfig: providerConfig2,
      query: query2 ?? "",
      maxResults: clampResults(
        maxResults,
        getSearchMaxResultsLimit(provider2.id)
      ),
      options,
      providerContext: {
        cwd: ctx.cwd,
        signal: signal ?? void 0
      }
    });
  }
  const provider = resolveProviderForTool(
    config,
    ctx.cwd,
    capability,
    explicitProvider
  );
  const providerConfig = getEffectiveProviderConfig(config, provider.id);
  if (capability === "contents") {
    return executeProviderOperation({
      capability,
      config,
      provider,
      providerConfig,
      ctx,
      signal,
      options,
      urls
    });
  }
  if (capability === "answer") {
    return executeProviderOperation({
      capability,
      config,
      provider,
      providerConfig,
      ctx,
      signal,
      options,
      query: query2
    });
  }
  return executeProviderOperation({
    capability,
    config,
    provider,
    providerConfig,
    ctx,
    signal,
    options,
    input
  });
}
function buildSearchBatchError(outcomes) {
  const failed = outcomes.filter((outcome) => outcome.error !== void 0);
  if (failed.length === 1) {
    return new Error(failed[0]?.error ?? "web_search failed.");
  }
  const summary = failed.map(
    (outcome, index) => `${index + 1}. ${formatQuotedPreview(outcome.query, 40)} \u2014 ${outcome.error}`
  ).join("; ");
  return new Error(
    `All ${failed.length} web_search queries failed: ${summary}`
  );
}
async function executeSingleSearchQuery({
  provider,
  providerConfig,
  query: query2,
  maxResults,
  options,
  providerContext,
  onProgress,
  executionOverride
}) {
  const request = {
    capability: "search",
    query: query2,
    maxResults,
    options
  };
  onProgress?.(`Searching via ${provider.label}: ${query2}`);
  const result = executionOverride ? await executeProviderExecution(executionOverride, {
    ...providerContext,
    onProgress
  }) : await executeProviderRequest(provider, providerConfig, request, {
    ...providerContext,
    onProgress
  });
  if (!isSearchResponse(result)) {
    throw new Error(`${provider.label} search returned an invalid result.`);
  }
  return result;
}
async function executeAnswerTool({
  config,
  request,
  context
}) {
  return executeAnswerToolInternal({
    config,
    ctx: { cwd: context.cwd },
    signal: context.signal,
    progress: context.progress,
    providerOptions: request.options,
    queries: request.queries
  });
}
async function executeAnswerToolInternal({
  config,
  explicitProvider,
  ctx,
  signal,
  progress,
  providerOptions,
  queries,
  executionOverrides
}) {
  const provider = resolveProviderForTool(
    config,
    ctx.cwd,
    "answer",
    explicitProvider
  );
  const providerConfig = getEffectiveProviderConfig(config, provider.id);
  const answerQueries = resolveAnswerQueries(queries);
  if (executionOverrides !== void 0 && executionOverrides.length !== answerQueries.length) {
    throw new Error(
      "executionOverrides length must match the number of answer queries."
    );
  }
  const progressReporter = createToolProgressReporter(
    "answer",
    provider.id,
    progress
  );
  const batchProgress = answerQueries.length > 1 ? createBatchCompletionReporter(
    "Answering",
    provider.label,
    answerQueries.length,
    progressReporter.report
  ) : void 0;
  let outcomes;
  try {
    batchProgress?.start();
    const settled = await Promise.allSettled(
      answerQueries.map(
        (answerQuery, index) => executeProviderOperation({
          capability: "answer",
          config,
          provider,
          providerConfig,
          ctx,
          signal,
          options: providerOptions,
          query: answerQuery,
          onProgress: answerQueries.length > 1 ? void 0 : progressReporter.report,
          executionOverride: executionOverrides?.[index]
        }).then(
          (value) => {
            batchProgress?.markCompleted();
            return value;
          },
          (error) => {
            batchProgress?.markFailed();
            throw error;
          }
        )
      )
    );
    outcomes = settled.map(
      (result, index) => result.status === "fulfilled" ? { query: answerQueries[index] ?? "", response: result.value } : {
        query: answerQueries[index] ?? "",
        error: formatErrorMessage(result.reason)
      }
    );
  } finally {
    progressReporter.stop();
  }
  if (outcomes.every((outcome) => outcome.error !== void 0)) {
    throw buildAnswerBatchError(outcomes);
  }
  const text = await truncateAndSave(
    formatAnswerResponses(outcomes),
    "web-answer"
  );
  const details = buildWebAnswerDetails(provider.id, outcomes);
  return {
    content: [{ type: "text", text }],
    details
  };
}
function buildAnswerBatchError(outcomes) {
  const failed = outcomes.filter((outcome) => outcome.error !== void 0);
  if (failed.length === 1) {
    return new Error(failed[0]?.error ?? "web_answer failed.");
  }
  const summary = failed.map(
    (outcome, index) => `${index + 1}. ${formatQuotedPreview(outcome.query, 40)} \u2014 ${outcome.error}`
  ).join("; ");
  return new Error(
    `All ${failed.length} web_answer queries failed: ${summary}`
  );
}
function formatAnswerResponses(outcomes) {
  return outcomes.map(
    (outcome, index) => formatAnswerOutcomeSection(outcome, index, outcomes.length)
  ).join("\n\n");
}
function formatAnswerOutcomeSection(outcome, index, total) {
  const body = outcome.response ? outcome.response.text : `Answer failed: ${outcome.error ?? "Unknown error."}`;
  if (total === 1) {
    return body;
  }
  const heading = `## Question ${index + 1}: ${formatAnswerHeading(outcome.query)}`;
  return `${heading}

${body}`;
}
function buildWebAnswerDetails(provider, outcomes) {
  const successfulOutcomes = outcomes.filter(
    (outcome) => outcome.response !== void 0
  );
  return {
    tool: "web_answer",
    provider,
    itemCount: successfulOutcomes.length === 1 ? successfulOutcomes[0]?.response.itemCount : void 0,
    queryCount: outcomes.length,
    failedQueryCount: outcomes.filter((outcome) => outcome.error !== void 0).length
  };
}
async function executeProviderOperation({
  capability,
  config,
  provider,
  providerConfig,
  ctx,
  signal,
  options,
  urls,
  query: query2,
  input,
  onProgress,
  executionOverride
}) {
  const request = buildOperationRequest(capability, {
    urls,
    query: query2,
    input,
    options
  });
  if (capability === "contents" && executionOverride === void 0) {
    return await resolveContentsFromStore({
      urls: urls ?? [],
      providerId: provider.id,
      config,
      cwd: ctx.cwd,
      options,
      signal: signal ?? void 0,
      onProgress
    });
  }
  if (capability === "contents") {
    onProgress?.(
      `Fetching contents via ${provider.label} for ${(urls ?? []).length} URL(s)`
    );
  } else if (capability === "answer") {
    onProgress?.(`Answering via ${provider.label}`);
  } else if (capability === "research") {
    onProgress?.(`Researching via ${provider.label}`);
  }
  const result = executionOverride ? await executeProviderExecution(executionOverride, {
    cwd: ctx.cwd,
    signal: signal ?? void 0,
    onProgress
  }) : await executeProviderRequest(provider, providerConfig, request, {
    cwd: ctx.cwd,
    signal: signal ?? void 0,
    onProgress
  });
  if (isSearchResponse(result)) {
    throw new Error(
      `${provider.label} ${capability} returned an invalid result.`
    );
  }
  return result;
}
async function executeProviderTool({
  config,
  request,
  context
}) {
  return executeProviderToolInternal({
    capability: request.capability,
    config,
    ctx: { cwd: context.cwd },
    signal: context.signal,
    progress: context.progress,
    providerOptions: request.options,
    urls: request.urls,
    query: request.query,
    input: request.input
  });
}
async function executeProviderToolInternal({
  capability,
  config,
  explicitProvider,
  ctx,
  signal,
  progress,
  providerOptions,
  urls,
  query: query2,
  input,
  executionOverride,
  executionOverrides
}) {
  await cleanupContentStore();
  const provider = resolveProviderForTool(
    config,
    ctx.cwd,
    capability,
    explicitProvider
  );
  const providerConfig = getEffectiveProviderConfig(config, provider.id);
  const progressReporter = createToolProgressReporter(
    capability,
    provider.id,
    progress
  );
  let response;
  try {
    if (capability === "contents") {
      response = executionOverrides !== void 0 || executionOverride === void 0 && (urls?.length ?? 0) > 1 ? await executeBatchedContentsTool({
        config,
        provider,
        providerConfig,
        ctx,
        signal,
        options: providerOptions,
        urls: urls ?? [],
        progressReport: progressReporter.report,
        executionOverrides
      }) : await executeProviderOperation({
        capability,
        config,
        provider,
        providerConfig,
        ctx,
        signal,
        options: providerOptions,
        urls,
        onProgress: progressReporter.report,
        executionOverride
      });
    } else {
      response = await executeProviderOperation({
        capability,
        config,
        provider,
        providerConfig,
        ctx,
        signal,
        options: providerOptions,
        query: query2,
        input,
        onProgress: progressReporter.report,
        executionOverride
      });
    }
  } finally {
    progressReporter.stop();
  }
  const details = {
    tool: `web_${capability}`,
    provider: response.provider,
    itemCount: isContentsResponse2(response) ? response.answers.length : response.itemCount
  };
  const text = await truncateAndSave(
    isContentsResponse2(response) ? formatContentsResponse(response) : response.text,
    capability
  );
  return {
    content: [{ type: "text", text }],
    details
  };
}
async function dispatchWebResearch({
  pi,
  activeWebResearchRequests,
  updateWebResearchWidget,
  config,
  request,
  context
}) {
  return dispatchWebResearchInternal({
    pi,
    activeWebResearchRequests,
    updateWebResearchWidget,
    config,
    ctx: context,
    providerOptions: request.options,
    input: request.input
  });
}
async function dispatchWebResearchInternal({
  pi,
  activeWebResearchRequests,
  updateWebResearchWidget,
  config,
  explicitProvider,
  ctx,
  providerOptions,
  input,
  executionOverride
}) {
  await cleanupContentStore();
  const provider = resolveProviderForTool(
    config,
    ctx.cwd,
    "research",
    explicitProvider
  );
  const request = createWebResearchRequest(ctx.cwd, provider.id, input);
  const providerConfig = getEffectiveProviderConfig(config, provider.id);
  activeWebResearchRequests.set(request.id, request);
  updateWebResearchWidget(ctx);
  trackPendingResearchTask(
    runDispatchedWebResearch({
      pi,
      activeWebResearchRequests,
      updateWebResearchWidget,
      request,
      config,
      provider,
      providerConfig,
      ctx,
      options: providerOptions,
      executionOverride
    })
  );
  return {
    content: [
      {
        type: "text",
        text: `Started web research via ${provider.label}.`
      }
    ],
    details: request
  };
}
async function runDispatchedWebResearch({
  pi,
  activeWebResearchRequests,
  updateWebResearchWidget,
  request,
  config,
  provider,
  providerConfig,
  ctx,
  options,
  executionOverride
}) {
  let result;
  let reportText = "";
  try {
    const response = await executeProviderOperation({
      capability: "research",
      config,
      provider,
      providerConfig,
      ctx,
      signal: void 0,
      options,
      input: request.input,
      onProgress: (message) => {
        request.progress = summarizeWebResearchProgress(
          message,
          provider.label
        );
        updateWebResearchWidget();
      },
      executionOverride
    });
    const completedAt = (/* @__PURE__ */ new Date()).toISOString();
    result = {
      ...request,
      status: "completed",
      completedAt,
      elapsedMs: Math.max(
        0,
        Date.parse(completedAt) - Date.parse(request.startedAt)
      ),
      itemCount: response.itemCount
    };
    reportText = response.text;
  } catch (error) {
    const completedAt = (/* @__PURE__ */ new Date()).toISOString();
    result = {
      ...request,
      status: "failed",
      completedAt,
      elapsedMs: Math.max(
        0,
        Date.parse(completedAt) - Date.parse(request.startedAt)
      ),
      error: formatErrorMessage(error)
    };
  }
  try {
    await writeWebResearchArtifact(result, reportText);
    pi.sendMessage({
      customType: WEB_RESEARCH_RESULT_MESSAGE_TYPE,
      content: formatWebResearchResultMessage(result, reportText),
      display: true,
      details: result
    });
  } finally {
    activeWebResearchRequests.delete(request.id);
    updateWebResearchWidget();
  }
}
function createWebResearchRequest(cwd, provider, input) {
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  return {
    tool: "web_research",
    id: randomUUID(),
    provider,
    input,
    outputPath: buildWebResearchArtifactPath(cwd, input, startedAt),
    startedAt
  };
}
function buildWebResearchArtifactPath(cwd, input, startedAt) {
  const timestamp = startedAt.replaceAll(":", "-").replace(".", "-");
  const slug = slugifyWebResearchInput(input);
  return join2(cwd, RESEARCH_ARTIFACTS_DIR, `${timestamp}-${slug}.md`);
}
function slugifyWebResearchInput(input) {
  const slug = input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
  return slug.length > 0 ? slug : "research";
}
function buildWebResearchWidgetLines(requests, theme, now = Date.now()) {
  const lines = [theme.fg("accent", "Research jobs:")];
  for (const request of requests.slice().sort((left, right) => left.startedAt.localeCompare(right.startedAt)).slice(0, 3)) {
    const providerLabel = PROVIDERS_BY_ID[request.provider]?.label ?? request.provider;
    const elapsed = formatCompactElapsed(now - Date.parse(request.startedAt));
    const icon = getWebResearchWidgetIcon(request, now);
    lines.push(
      `${icon}${providerLabel} ${theme.fg("muted", `(${elapsed}): `)}${truncateInline(cleanSingleLine(request.input), 70)}`
    );
  }
  if (requests.length > 3) {
    lines.push(theme.fg("muted", `+${requests.length - 3} more`));
  }
  return lines;
}
function getWebResearchWidgetIcon(request, _now) {
  if (request.progress === "poll retrying after transient errors") {
    return "\u27F3 ";
  }
  if (request.progress === "queued") {
    return "\u25CC ";
  }
  if (request.progress === "starting") {
    return "\u25D4 ";
  }
  if (request.progress?.startsWith("started:")) {
    return "\u25D1 ";
  }
  return "\u25CF ";
}
function summarizeWebResearchProgress(message, providerLabel) {
  const startingMessage = `Starting research via ${providerLabel}`;
  if (message === startingMessage) {
    return "starting";
  }
  const startedPrefix = `${providerLabel} research started: `;
  if (message.startsWith(startedPrefix)) {
    return `started: ${message.slice(startedPrefix.length)}`;
  }
  const statusPrefix = `Research via ${providerLabel}: `;
  if (message.startsWith(statusPrefix)) {
    return message.slice(statusPrefix.length).replace(/\s+\([^)]* elapsed\)$/u, "").trim();
  }
  const retryPrefix = `${providerLabel} research poll is still retrying after transient errors`;
  if (message.startsWith(retryPrefix)) {
    return "poll retrying after transient errors";
  }
  return message.trim();
}
function formatCompactElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1e3));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m${seconds}s`;
  }
  return `${totalSeconds}s`;
}
function formatWebResearchResultMessage(result, reportText) {
  const text = reportText.trim();
  if (text.length > 0) {
    return `${text}
`;
  }
  if (result.error) {
    return `${result.error}
`;
  }
  return "";
}
async function writeWebResearchArtifact(result, reportText) {
  await mkdir2(dirname2(result.outputPath), { recursive: true });
  await writeFile2(
    result.outputPath,
    formatWebResearchArtifact(result, reportText),
    "utf-8"
  );
}
function formatWebResearchArtifact(result, reportText) {
  const providerLabel = PROVIDERS_BY_ID[result.provider]?.label ?? result.provider;
  const lines = [
    "# Web research report",
    "",
    "## Query",
    result.input,
    "",
    "## Provider",
    providerLabel,
    "",
    "## Status",
    result.status,
    "",
    "## Started",
    result.startedAt,
    "",
    "## Completed",
    result.completedAt,
    "",
    "## Elapsed",
    formatElapsed(result.elapsedMs)
  ];
  if (typeof result.itemCount === "number") {
    lines.push("", "## Items", String(result.itemCount));
  }
  if (result.error) {
    lines.push("", "## Error", result.error);
  }
  if (reportText) {
    lines.push("", "## Report", reportText);
  }
  return `${lines.join("\n")}
`;
}
function trackPendingResearchTask(task) {
  const tracked = task.catch(() => {
  }).finally(() => {
    pendingResearchTasks.delete(tracked);
  });
  pendingResearchTasks.add(tracked);
}
async function executeBatchedContentsTool({
  config,
  provider,
  providerConfig,
  ctx,
  signal,
  options,
  urls,
  progressReport,
  executionOverrides
}) {
  if (executionOverrides !== void 0 && executionOverrides.length !== urls.length) {
    throw new Error(
      "executionOverrides length must match the number of contents URLs."
    );
  }
  const batchProgress = createBatchCompletionReporter(
    "Fetching contents",
    provider.label,
    urls.length,
    progressReport
  );
  batchProgress.start();
  const settled = await Promise.allSettled(
    urls.map(
      (url2, index) => executeProviderOperation({
        capability: "contents",
        config,
        provider,
        providerConfig,
        ctx,
        signal,
        options,
        urls: [url2],
        onProgress: void 0,
        executionOverride: executionOverrides?.[index]
      }).then(
        (value) => {
          batchProgress.markCompleted();
          return value;
        },
        (error) => {
          batchProgress.markFailed();
          throw error;
        }
      )
    )
  );
  const successful = settled.map((result, index) => {
    if (result.status !== "fulfilled") {
      return void 0;
    }
    return {
      url: urls[index] ?? "",
      response: result.value
    };
  }).filter(
    (value) => value !== void 0
  );
  const failures = settled.map(
    (result, index) => result.status === "rejected" ? {
      url: urls[index] ?? "",
      error: formatErrorMessage(result.reason)
    } : void 0
  ).filter(
    (value) => value !== void 0
  );
  if (successful.length === 0 && failures.length > 0) {
    throw new Error(
      failures.length === 1 ? failures[0]?.error ?? "web_contents failed." : `web_contents failed for all ${failures.length} URL(s): ${failures.map(
        (failure, index) => `${index + 1}. ${failure.url} \u2014 ${failure.error}`
      ).join("; ")}`
    );
  }
  const answersByUrl = /* @__PURE__ */ new Map();
  for (const entry of successful) {
    answersByUrl.set(
      entry.url,
      entry.response.answers[0] ?? {
        url: entry.url,
        error: "No content returned for this URL."
      }
    );
  }
  for (const failure of failures) {
    answersByUrl.set(failure.url, {
      url: failure.url,
      error: failure.error
    });
  }
  return {
    provider: successful[0]?.response.provider ?? provider.id,
    answers: urls.map((url2) => {
      return answersByUrl.get(url2) ?? {
        url: url2,
        error: "No content returned for this URL."
      };
    })
  };
}
function buildOperationRequest(capability, args) {
  if (capability === "contents") {
    return {
      capability,
      urls: args.urls ?? [],
      options: args.options
    };
  }
  if (capability === "answer") {
    return {
      capability,
      query: args.query ?? "",
      options: args.options
    };
  }
  return {
    capability,
    input: args.input ?? "",
    options: args.options
  };
}
function isSearchResponse(value) {
  return "results" in value;
}
function isContentsResponse2(value) {
  return "answers" in value;
}
function formatContentsResponse(response) {
  return renderContentsAnswers(response.answers);
}
function createProgressEmitter(onUpdate) {
  if (!onUpdate) {
    return void 0;
  }
  return (message) => {
    onUpdate({
      content: [{ type: "text", text: message }],
      details: {}
    });
  };
}
function createToolProgressReporter(capability, providerId, progress) {
  if (!progress) {
    return { report: void 0, stop: () => {
    } };
  }
  const emit = (message) => progress(message);
  const startedAt = Date.now();
  let lastUpdateAt = startedAt;
  let timer;
  if (capability === "research") {
    timer = setInterval(() => {
      if (Date.now() - lastUpdateAt < RESEARCH_HEARTBEAT_MS) {
        return;
      }
      const providerLabel = PROVIDERS_BY_ID[providerId]?.label ?? providerId;
      const elapsed = formatElapsed(Date.now() - startedAt);
      emit(`Researching via ${providerLabel} (${elapsed} elapsed)`);
      lastUpdateAt = Date.now();
    }, RESEARCH_HEARTBEAT_MS);
  }
  return {
    report: (message) => {
      lastUpdateAt = Date.now();
      emit(message);
    },
    stop: () => {
      if (timer) {
        clearInterval(timer);
      }
    }
  };
}
function renderListCallHeader(toolName, items, theme, suffix, options = {}) {
  return {
    invalidate() {
    },
    render(width) {
      const normalizedItems = items.map((item) => cleanSingleLine(item)).filter((item) => item.length > 0);
      const toolTitle = theme.fg("toolTitle", theme.bold(toolName));
      const mutedSuffix = suffix ? theme.fg("muted", suffix) : "";
      if (!options.forceMultiline && normalizedItems.length === 1) {
        const singleItem = options.quoteSingleItem ? formatQuotedPreview(normalizedItems[0], 80) : truncateInline(normalizedItems[0], 120);
        const inline = `${toolTitle} ${theme.fg("accent", singleItem)}${mutedSuffix}`;
        const line = truncateToWidth(inline.trimEnd(), width);
        return [line + " ".repeat(Math.max(0, width - visibleWidth(line)))];
      }
      let header = toolTitle;
      if (mutedSuffix) {
        header += mutedSuffix;
      }
      const lines = [];
      const headerLine = truncateToWidth(header.trimEnd(), width);
      lines.push(
        headerLine + " ".repeat(Math.max(0, width - visibleWidth(headerLine)))
      );
      for (const item of normalizedItems) {
        const itemLines = options.forceMultiline ? wrapTextWithAnsi(
          theme.fg("accent", item),
          Math.max(1, width - 2)
        ).map((line) => `  ${line}`) : [
          truncateToWidth(
            `  ${theme.fg("accent", truncateInline(item, 120))}`,
            width
          )
        ];
        for (const itemLine of itemLines) {
          const line = truncateToWidth(itemLine, width);
          lines.push(
            line + " ".repeat(Math.max(0, width - visibleWidth(line)))
          );
        }
      }
      return lines;
    }
  };
}
function renderToolCallHeader(toolName, primary, details, theme) {
  return renderListCallHeader(
    toolName,
    primary.trim().length > 0 ? [primary] : [],
    theme,
    details.length > 0 ? ` ${details.join(" ")}` : void 0
  );
}
function renderQuestionCallHeader(params, theme) {
  return renderListCallHeader(
    "web_answer",
    getAnswerQueriesForDisplay(params.queries),
    theme,
    void 0,
    { quoteSingleItem: true }
  );
}
function renderResearchCallHeader(params, theme) {
  return renderListCallHeader("web_research", [params.input], theme);
}
function renderSearchToolResult(result, expanded, isPartial, theme) {
  const text = extractTextContent(result.content);
  const isError = Boolean(result.isError);
  if (isPartial) {
    return renderSimpleText(text ?? "Working\u2026", theme, "warning");
  }
  if (isError) {
    return renderBlockText(text ?? "web_search failed", theme, "error");
  }
  const details = result.details;
  if (!details || expanded) {
    return renderMarkdownBlock(text ?? "");
  }
  return renderCollapsedSearchSummary(details, text, theme);
}
function renderWebResearchDispatchResult(result, expanded, theme) {
  const text = extractTextContent(result.content) ?? "Started web research.";
  const details = isWebResearchRequest(result.details) ? result.details : void 0;
  if (expanded) {
    const expandedText = details ? [
      text,
      "",
      "## Research brief",
      "",
      details.input,
      "",
      "## Report path",
      "",
      `\`${details.outputPath}\``
    ].join("\n") : text;
    return renderMarkdownBlock(expandedText);
  }
  const summary = details ? `Started web research via ${PROVIDERS_BY_ID[details.provider]?.label ?? details.provider}` : text;
  let summaryText = theme.fg("success", summary);
  summaryText += theme.fg("muted", ` (${getExpandHint()})`);
  return new Text(summaryText, 0, 0);
}
function renderWebResearchResultMessage(message, { expanded }, theme) {
  const text = typeof message.content === "string" ? message.content : extractTextContent(message.content);
  const details = isWebResearchResult(message.details) ? message.details : void 0;
  const isSuccess = details?.status === "completed";
  const accent = isSuccess ? "success" : "error";
  const box = new Box(1, 1, (value) => theme.bg("customMessageBg", value));
  if (!expanded) {
    const lines = details ? buildWebResearchResultSummaryLines(details, theme) : [theme.fg(accent, "Web research update")];
    lines.push(theme.fg("muted", `(${getExpandHint()})`));
    box.addChild(new Text(lines.join("\n"), 0, 0));
    return box;
  }
  box.addChild(
    isSuccess ? renderMarkdownBlock(text ?? "") : renderBlockText(text ?? "", theme, "error")
  );
  return box;
}
function buildWebResearchResultSummaryLines(result, theme) {
  const providerLabel = PROVIDERS_BY_ID[result.provider]?.label ?? result.provider;
  const statusLine = result.status === "completed" ? `Web research completed via ${providerLabel}` : `Web research failed via ${providerLabel}`;
  const lines = [
    theme.fg(result.status === "completed" ? "success" : "error", statusLine)
  ];
  lines.push(
    theme.fg("muted", `\u25CB start: ${result.startedAt}`),
    theme.fg("muted", `\u25F4 duration: ${formatElapsed(result.elapsedMs)}`),
    theme.fg("muted", `\u21B3 file: ${result.outputPath}`)
  );
  if (result.error) {
    lines.push(theme.fg("muted", `\u2715 error: ${result.error}`));
  }
  return lines;
}
function isWebResearchRequest(details) {
  return typeof details === "object" && details !== null && "tool" in details && details.tool === "web_research" && "startedAt" in details && "outputPath" in details && !("status" in details);
}
function isWebResearchResult(details) {
  return typeof details === "object" && details !== null && "tool" in details && details.tool === "web_research" && "status" in details && "completedAt" in details;
}
function renderProviderToolResult(result, expanded, isPartial, failureText, theme, options = {}) {
  const text = extractTextContent(result.content);
  if (isPartial) {
    return renderSimpleText(text ?? "Working\u2026", theme, "warning");
  }
  if (result.isError) {
    return renderBlockText(text ?? failureText, theme, "error");
  }
  if (expanded) {
    return options.markdownWhenExpanded ? renderMarkdownBlock(text ?? "") : renderBlockText(text ?? "", theme, "toolOutput");
  }
  const details = result.details;
  const summary = renderCollapsedProviderToolSummary(details, text);
  let summaryText = theme.fg("success", summary);
  summaryText += theme.fg("muted", ` (${getExpandHint()})`);
  return new Text(summaryText, 0, 0);
}
function renderCollapsedProviderToolSummary(details, text) {
  if (details?.tool === "web_answer" && typeof details.queryCount === "number" && details.queryCount > 1) {
    const providerLabel = PROVIDERS_BY_ID[details.provider]?.label ?? details.provider;
    const failureSuffix = details.failedQueryCount && details.failedQueryCount > 0 ? `, ${details.failedQueryCount} failed` : "";
    return `${details.queryCount} questions via ${providerLabel}${failureSuffix}`;
  }
  const baseSummary = getCompactProviderToolSummary(details) ?? getFirstLine(text) ?? `${details?.tool ?? "tool"} output available`;
  if (!details?.provider) {
    return baseSummary;
  }
  return appendProviderSummary(baseSummary, details.provider);
}
function getCompactProviderToolSummary(details) {
  if (!details) {
    return void 0;
  }
  if (details.tool === "web_contents" && typeof details.itemCount === "number") {
    return `${details.itemCount} page${details.itemCount === 1 ? "" : "s"}`;
  }
  if (details.tool === "web_answer") {
    return "Answer";
  }
  if (details.tool === "web_research") {
    return "Research";
  }
  return void 0;
}
function getProviderSettings(providerId) {
  return getProviderConfigManifest(providerId).settings;
}
function buildManifestSettingsEntry(setting, providerConfig) {
  if (setting.kind === "values") {
    return {
      id: setting.id,
      label: setting.label,
      currentValue: setting.getValue(providerConfig),
      values: setting.values,
      description: setting.help,
      kind: "cycle"
    };
  }
  return {
    id: setting.id,
    label: setting.label,
    currentValue: summarizeStringValue(
      setting.getValue(providerConfig),
      setting.secret === true
    ),
    description: setting.help,
    kind: "text"
  };
}
function renderEntryList(width, theme, entries, selection) {
  const labelWidth = Math.min(
    24,
    Math.max(...entries.map((entry) => entry.label.length), 0)
  );
  return entries.map((entry, index) => {
    const selected = selection === index;
    const prefix = selected ? theme.fg("accent", "\u2192 ") : "  ";
    const paddedLabel = entry.label.padEnd(labelWidth, " ");
    const label = selected ? theme.fg("accent", paddedLabel) : paddedLabel;
    const value = selected ? theme.fg("accent", entry.currentValue) : theme.fg("muted", entry.currentValue);
    return truncateToWidth(`${prefix}${label}  ${value}`, width);
  });
}
function renderSelectedEntryDescription(width, theme, entry) {
  if (!entry) {
    return [];
  }
  return wrapTextWithAnsi(entry.description, Math.max(10, width - 2)).map(
    (line) => truncateToWidth(theme.fg("dim", line), width)
  );
}
function formatProviderCapabilityChecks(providerId, theme) {
  return ["search", "contents", "answer", "research"].map(
    (tool) => supportsTool2(PROVIDERS_BY_ID[providerId], tool) ? theme.fg("success", "\u2714") : " "
  ).join(" ");
}
function resolveProviderSelectionValue(providerIds, value) {
  return providerIds.find(
    (candidate) => PROVIDERS_BY_ID[candidate].label === value
  );
}
function getReadyCompatibleProvidersForTool(config, cwd, toolId) {
  return sortProviderIdsForSettings(
    getCompatibleProviders(toolId).filter(
      (providerId) => isProviderCapabilityReady(
        getProviderCapabilityStatus(config, cwd, providerId, toolId)
      )
    )
  );
}
function sortProviderIdsForSettings(providerIds) {
  const displayOrder = new Map(
    PROVIDER_LIST.map((provider, index) => [provider.id, index])
  );
  return [...providerIds].sort(
    (left, right) => (displayOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (displayOrder.get(right) ?? Number.MAX_SAFE_INTEGER)
  );
}
function getSearchSettings(config) {
  return config.settings?.search;
}
function getSearchPrefetchDefaults(config) {
  return getSearchSettings(config);
}
function getEffectiveSearchPrefetchDefaults(config) {
  const settings = getSearchSettings(config);
  return {
    provider: settings?.provider,
    maxUrls: settings?.maxUrls ?? DEFAULT_PREFETCH_MAX_URLS,
    ttlMs: settings?.ttlMs ?? DEFAULT_CONTENT_TTL_MS
  };
}
var SETTING_IDS = [
  "requestTimeoutMs",
  "retryCount",
  "retryDelayMs",
  "researchTimeoutMs"
];
var SETTING_META = {
  requestTimeoutMs: {
    label: "Request timeout (ms)",
    help: "Default maximum time to wait for a single provider request before failing that attempt. Applies to every provider unless overridden.",
    parse: (value) => parseOptionalPositiveIntegerInput(
      value,
      "Request timeout must be a positive integer."
    )
  },
  retryCount: {
    label: "Retry count",
    help: "Default number of times transient provider failures should be retried. Applies to every provider unless overridden.",
    parse: (value) => parseOptionalNonNegativeIntegerInput(
      value,
      "Retry count must be a non-negative integer."
    )
  },
  retryDelayMs: {
    label: "Retry delay (ms)",
    help: "Default initial delay before retrying failed requests. Later retries back off automatically. Applies to every provider unless overridden.",
    parse: (value) => parseOptionalPositiveIntegerInput(
      value,
      "Retry delay must be a positive integer."
    )
  },
  researchTimeoutMs: {
    label: "Research timeout (ms)",
    help: "Default maximum total time to allow long-running web research before aborting it. Applies to every provider unless overridden.",
    parse: (value) => parseOptionalPositiveIntegerInput(
      value,
      "Research timeout must be a positive integer."
    )
  }
};
function getSharedSettingValue(config, id) {
  return getEffectiveSharedSettings(config)[id];
}
function getSharedSettingDisplayValue(config, id) {
  return String(getSharedSettingValue(config, id));
}
function getSharedSettingRawValue(config, id) {
  const value = config.settings?.[id];
  return typeof value === "number" ? String(value) : "";
}
function ensureSettings(config) {
  config.settings = { ...config.settings ?? {} };
  return config.settings;
}
function cleanupSettings(config) {
  if (config.settings && Object.keys(config.settings).length === 0) {
    delete config.settings;
  }
}
function stripDuplicatePolicyOverrides(config) {
  for (const providerId of PROVIDER_IDS) {
    const providerConfig = config.providers?.[providerId];
    if (!providerConfig?.settings) {
      continue;
    }
    for (const key of SETTING_IDS) {
      if (providerConfig.settings[key] === config.settings?.[key]) {
        delete providerConfig.settings[key];
      }
    }
    if (Object.keys(providerConfig.settings).length === 0) {
      delete providerConfig.settings;
    }
  }
}
var WebProvidersSettingsView = class {
  constructor(tui, theme, done, ctx, initialConfig, initialProvider) {
    this.tui = tui;
    this.theme = theme;
    this.done = done;
    this.ctx = ctx;
    this.config = structuredClone(initialConfig);
    this.activeProvider = initialProvider;
    this.selection.provider = Math.max(
      0,
      PROVIDER_LIST.findIndex((provider) => provider.id === initialProvider)
    );
  }
  tui;
  theme;
  done;
  ctx;
  config;
  activeProvider;
  activeSection = "tools";
  selection = {
    provider: 0,
    tools: 0,
    settings: 0
  };
  submenu;
  render(width) {
    if (this.submenu) {
      return this.submenu.render(width);
    }
    const lines = [];
    const toolItems = this.buildToolSectionItems();
    lines.push(...this.renderSection(width, "Tools", "tools", toolItems));
    lines.push("");
    const providerItems = this.buildProviderSectionItems();
    lines.push(
      ...this.renderSection(width, "Providers", "provider", providerItems)
    );
    lines.push("");
    const settingsItems = this.buildSettingsSectionItems();
    lines.push(
      ...this.renderSection(width, "Settings", "settings", settingsItems)
    );
    const selected = this.getSelectedEntry();
    if (selected) {
      lines.push("");
      lines.push(
        ...renderSelectedEntryDescription(width, this.theme, selected)
      );
    }
    lines.push("");
    lines.push(
      truncateToWidth(
        this.theme.fg(
          "dim",
          "\u2191\u2193 move \xB7 Tab/Shift+Tab switch section \xB7 Enter edit/open \xB7 Esc close"
        ),
        width
      )
    );
    return lines;
  }
  invalidate() {
    this.submenu?.invalidate();
  }
  handleInput(data) {
    if (this.submenu) {
      this.submenu.handleInput?.(data);
      this.tui.requestRender();
      return;
    }
    const kb = getKeybindings();
    const entries = this.getActiveSectionEntries();
    if (kb.matches(data, "tui.select.up")) {
      if (entries.length > 0) {
        this.moveSelection(-1);
      }
    } else if (kb.matches(data, "tui.select.down")) {
      if (entries.length > 0) {
        this.moveSelection(1);
      }
    } else if (matchesKey(data, Key.tab)) {
      this.moveSection(1);
    } else if (matchesKey(data, Key.shift("tab"))) {
      this.moveSection(-1);
    } else if (kb.matches(data, "tui.select.confirm") || data === " ") {
      void this.activateCurrentEntry();
    } else if (kb.matches(data, "tui.select.cancel")) {
      this.done(void 0);
      return;
    }
    this.tui.requestRender();
  }
  buildProviderSectionItems() {
    return PROVIDER_LIST.map((provider) => {
      const setupState = getProviderSetupState(this.config, provider.id);
      const statusSummary = getProviderReadinessSummary(
        this.config,
        this.ctx.cwd,
        provider.id
      );
      return {
        id: `provider:${provider.id}`,
        label: provider.label,
        currentValue: `${formatProviderCapabilityChecks(provider.id, this.theme)}  ${this.theme.fg("muted", formatProviderSetupState(setupState))}`,
        description: provider.id === this.activeProvider ? `Press Enter to configure ${provider.label}'s provider-specific settings. ${statusSummary}` : `Move here and press Enter to configure ${provider.label}'s provider-specific settings. ${statusSummary}`,
        kind: "action",
        preserveValueStyle: true
      };
    });
  }
  buildToolSectionItems() {
    return Object.keys(CAPABILITY_TOOL_NAMES).map((toolId) => {
      const readyCompatibleProviders = getReadyCompatibleProvidersForTool(
        this.config,
        this.ctx.cwd,
        toolId
      );
      const mappedProviderId = getMappedProviderIdForTool(this.config, toolId);
      const currentValue = mappedProviderId && readyCompatibleProviders.includes(mappedProviderId) ? PROVIDERS_BY_ID[mappedProviderId].label : "off";
      const compatibleLabels = readyCompatibleProviders.map(
        (providerId) => PROVIDERS_BY_ID[providerId].label
      );
      return {
        id: `tool:${toolId}`,
        label: TOOL_INFO[toolId].label,
        currentValue,
        description: `Press Enter to configure web_${toolId}. ${TOOL_INFO[toolId].help} Route web_${toolId} to one compatible provider or turn it off.` + (compatibleLabels.length > 0 ? ` Ready compatible providers: ${compatibleLabels.join(", ")}.` : ""),
        kind: "action"
      };
    });
  }
  buildSettingsSectionItems() {
    return SETTING_IDS.map((id) => ({
      id: `settings:${id}`,
      label: SETTING_META[id].label,
      currentValue: getSharedSettingDisplayValue(this.config, id),
      description: SETTING_META[id].help,
      kind: "text"
    }));
  }
  getSectionEntries(section) {
    if (section === "provider") return this.buildProviderSectionItems();
    if (section === "settings") return this.buildSettingsSectionItems();
    return this.buildToolSectionItems();
  }
  getActiveSectionEntries() {
    return this.getSectionEntries(this.activeSection);
  }
  getSelectedEntry() {
    const entries = this.getActiveSectionEntries();
    return entries[this.selection[this.activeSection]];
  }
  moveSection(direction) {
    const sections = [
      "tools",
      "provider",
      "settings"
    ];
    const index = sections.indexOf(this.activeSection);
    for (let offset = 1; offset <= sections.length; offset++) {
      const next = sections[(index + offset * direction + sections.length) % sections.length];
      if (this.getSectionEntries(next).length > 0) {
        this.activeSection = next;
        this.syncActiveProviderToSelection();
        return;
      }
    }
  }
  moveSelection(direction) {
    const sections = [
      "tools",
      "provider",
      "settings"
    ];
    const currentEntries = this.getActiveSectionEntries();
    const currentIndex = this.selection[this.activeSection];
    if (direction === -1 && currentIndex > 0) {
      this.selection[this.activeSection] = currentIndex - 1;
      this.syncActiveProviderToSelection();
      return;
    }
    if (direction === 1 && currentIndex < currentEntries.length - 1) {
      this.selection[this.activeSection] = currentIndex + 1;
      this.syncActiveProviderToSelection();
      return;
    }
    const startSectionIndex = sections.indexOf(this.activeSection);
    for (let offset = 1; offset <= sections.length; offset++) {
      const nextSection = sections[(startSectionIndex + offset * direction + sections.length) % sections.length];
      const nextEntries = this.getSectionEntries(nextSection);
      if (nextEntries.length === 0) continue;
      this.activeSection = nextSection;
      this.selection[nextSection] = direction === 1 ? 0 : nextEntries.length - 1;
      this.syncActiveProviderToSelection();
      return;
    }
  }
  syncActiveProviderToSelection() {
    if (this.activeSection !== "provider") {
      return;
    }
    const provider = PROVIDER_LIST[this.selection.provider];
    if (!provider) {
      return;
    }
    this.activeProvider = provider.id;
  }
  renderSection(width, title, section, entries) {
    const labelWidth = Math.min(
      Math.max(...entries.map((entry) => entry.label.length), 0),
      Math.max(20, Math.floor(width * 0.45))
    );
    const lines = [
      truncateToWidth(
        this.activeSection === section ? this.theme.fg("accent", this.theme.bold(title)) : this.theme.bold(title),
        width
      )
    ];
    if (section === "provider") {
      lines.push(
        truncateToWidth(
          this.theme.fg(
            "dim",
            `  ${"Provider".padEnd(labelWidth, " ")}  S C A R  Status`
          ),
          width
        )
      );
    }
    for (const [index, entry] of entries.entries()) {
      const selected = this.activeSection === section && this.selection[section] === index;
      const prefix = selected ? this.theme.fg("accent", "\u2192 ") : "  ";
      const paddedLabel = entry.label.padEnd(labelWidth, " ");
      const label = selected ? this.theme.fg("accent", paddedLabel) : paddedLabel;
      if (entry.currentValue.trim().length === 0) {
        lines.push(truncateToWidth(`${prefix}${label}`, width));
        continue;
      }
      const value = entry.preserveValueStyle ? entry.currentValue : selected ? this.theme.fg("accent", entry.currentValue) : this.theme.fg("muted", entry.currentValue);
      lines.push(truncateToWidth(`${prefix}${label}  ${value}`, width));
    }
    if (section === "provider") {
      lines.push(
        truncateToWidth(
          this.theme.fg("dim", "  S=Search  C=Contents  A=Answer  R=Research"),
          width
        )
      );
    }
    return lines;
  }
  async activateCurrentEntry() {
    const entry = this.getSelectedEntry();
    if (!entry) return;
    if (entry.id.startsWith("settings:")) {
      const settingId = entry.id.slice("settings:".length);
      this.submenu = new TextValueSubmenu(
        this.tui,
        this.theme,
        entry.label,
        this.currentSharedSettingRawValue(settingId),
        entry.description,
        (selectedValue) => {
          this.submenu = void 0;
          if (selectedValue !== void 0) {
            void this.handleSharedSettingChange(settingId, selectedValue);
          }
          this.tui.requestRender();
        }
      );
      return;
    }
    if (entry.kind === "action" && entry.id.startsWith("tool:")) {
      const toolId = entry.id.slice("tool:".length);
      this.submenu = new ToolSettingsSubmenu(
        this.tui,
        this.theme,
        toolId,
        this.ctx.cwd,
        () => this.config,
        async (mutate) => {
          await this.persist(mutate);
        },
        () => {
          this.submenu = void 0;
          this.tui.requestRender();
        }
      );
      return;
    }
    if (entry.kind === "action" && entry.id.startsWith("provider:")) {
      const providerId = entry.id.slice("provider:".length);
      this.activeProvider = providerId;
      this.submenu = new ProviderSettingsSubmenu(
        this.tui,
        this.theme,
        providerId,
        () => this.currentProviderConfigFor(providerId),
        async (mutate) => {
          await this.persist((config) => {
            config.providers ??= {};
            const providerConfig = getEditableProviderConfig(
              providerId,
              config.providers?.[providerId]
            );
            mutate(providerConfig);
            config.providers[providerId] = providerConfig;
          });
        },
        () => {
          this.submenu = void 0;
          this.tui.requestRender();
        }
      );
      return;
    }
  }
  currentSharedSettingRawValue(id) {
    return getSharedSettingRawValue(this.config, id);
  }
  async handleSharedSettingChange(id, value) {
    await this.persist((config) => {
      const parsed = SETTING_META[id].parse(value);
      const settings = ensureSettings(config);
      if (parsed === void 0) {
        delete settings[id];
      } else {
        settings[id] = parsed;
      }
      cleanupSettings(config);
      stripDuplicatePolicyOverrides(config);
    });
  }
  currentProviderConfigFor(providerId) {
    return this.config.providers?.[providerId];
  }
  async persist(mutate) {
    const nextConfig = structuredClone(this.config);
    try {
      mutate(nextConfig);
      cleanupSettings(nextConfig);
      stripDuplicatePolicyOverrides(nextConfig);
      await writeConfigFile(nextConfig);
      if (didContentsCacheInputsChange(this.config, nextConfig)) {
        resetContentStore();
      }
      this.config = nextConfig;
      this.tui.requestRender();
    } catch (error) {
      this.ctx.ui.notify(error.message, "error");
    }
  }
};
var ToolSettingsSubmenu = class {
  constructor(tui, theme, toolId, cwd, getConfig, persist, done) {
    this.tui = tui;
    this.theme = theme;
    this.toolId = toolId;
    this.cwd = cwd;
    this.getConfig = getConfig;
    this.persist = persist;
    this.done = done;
  }
  tui;
  theme;
  toolId;
  cwd;
  getConfig;
  persist;
  done;
  selection = 0;
  submenu;
  render(width) {
    if (this.submenu) {
      return this.submenu.render(width);
    }
    const entries = this.getEntries();
    const lines = [
      truncateToWidth(
        this.theme.fg("accent", TOOL_INFO[this.toolId].label),
        width
      ),
      "",
      ...renderEntryList(width, this.theme, entries, this.selection)
    ];
    const selected = entries[this.selection];
    if (selected) {
      lines.push("");
      lines.push(
        ...renderSelectedEntryDescription(width, this.theme, selected)
      );
    }
    lines.push("");
    lines.push(
      truncateToWidth(
        this.theme.fg("dim", "\u2191\u2193 move \xB7 Enter edit/toggle \xB7 Esc back"),
        width
      )
    );
    return lines;
  }
  invalidate() {
    this.submenu?.invalidate();
  }
  handleInput(data) {
    if (this.submenu) {
      this.submenu.handleInput?.(data);
      this.tui.requestRender();
      return;
    }
    const kb = getKeybindings();
    const entries = this.getEntries();
    if (kb.matches(data, "tui.select.up")) {
      if (this.selection > 0) {
        this.selection -= 1;
      }
    } else if (kb.matches(data, "tui.select.down")) {
      if (this.selection < entries.length - 1) {
        this.selection += 1;
      }
    } else if (kb.matches(data, "tui.select.confirm") || data === " ") {
      void this.activateCurrentEntry();
    } else if (kb.matches(data, "tui.select.cancel")) {
      this.done();
      return;
    }
    this.tui.requestRender();
  }
  getEntries() {
    const config = this.getConfig();
    const mappedProviderId = getMappedProviderIdForTool(config, this.toolId);
    const readyProviderIds = getReadyCompatibleProvidersForTool(
      config,
      this.cwd,
      this.toolId
    );
    const providerValues = [
      "off",
      ...readyProviderIds.map(
        (providerId) => PROVIDERS_BY_ID[providerId].label
      )
    ];
    const currentProviderValue = mappedProviderId && readyProviderIds.includes(mappedProviderId) ? PROVIDERS_BY_ID[mappedProviderId].label : "off";
    const entries = [
      {
        id: "provider",
        label: "Provider",
        currentValue: currentProviderValue,
        description: `Route web_${this.toolId} to one compatible ready provider or turn it off.`,
        kind: "cycle",
        values: providerValues
      }
    ];
    if (this.toolId === "search") {
      const prefetch = getSearchPrefetchDefaults(config);
      const effectivePrefetch = getEffectiveSearchPrefetchDefaults(config);
      const prefetchProviderIds = getReadyCompatibleProvidersForTool(
        config,
        this.cwd,
        "contents"
      );
      const prefetchValues = [
        "off",
        ...prefetchProviderIds.map(
          (providerId) => PROVIDERS_BY_ID[providerId].label
        )
      ];
      const currentPrefetchProviderValue = prefetch?.provider && prefetchProviderIds.includes(prefetch.provider) ? PROVIDERS_BY_ID[prefetch.provider].label : "off";
      entries.push(
        {
          id: "prefetchProvider",
          label: "Prefetch",
          currentValue: currentPrefetchProviderValue,
          description: "Optionally start background web_contents extraction after search using a contents-capable provider. Off means no prefetch.",
          kind: "cycle",
          values: prefetchValues
        },
        {
          id: "prefetchMaxUrls",
          label: "Prefetch URLs",
          currentValue: String(effectivePrefetch.maxUrls),
          description: "Maximum number of search result URLs to prefetch. Leave blank to use the built-in default.",
          kind: "text"
        },
        {
          id: "prefetchTtlMs",
          label: "Prefetch TTL",
          currentValue: String(effectivePrefetch.ttlMs),
          description: "How long prefetched contents stay reusable in the local cache, in milliseconds. Leave blank to use the built-in default.",
          kind: "text"
        }
      );
    }
    return entries;
  }
  async activateCurrentEntry() {
    const entry = this.getEntries()[this.selection];
    if (!entry) {
      return;
    }
    if (entry.kind === "cycle" && entry.values && entry.values.length > 0) {
      const currentIndex = entry.values.indexOf(entry.currentValue);
      const nextValue = entry.values[(currentIndex + 1) % entry.values.length];
      await this.handleChange(entry.id, nextValue);
      return;
    }
    if (entry.kind === "text") {
      const currentValue = this.getEntryRawValue(entry.id);
      this.submenu = new TextValueSubmenu(
        this.tui,
        this.theme,
        entry.label,
        currentValue,
        entry.description,
        (selectedValue) => {
          this.submenu = void 0;
          if (selectedValue !== void 0) {
            void this.handleChange(entry.id, selectedValue);
          }
          this.tui.requestRender();
        }
      );
    }
  }
  getEntryRawValue(id) {
    const prefetch = getSearchPrefetchDefaults(this.getConfig());
    switch (id) {
      case "prefetchMaxUrls":
        return prefetch?.maxUrls !== void 0 ? String(prefetch.maxUrls) : "";
      case "prefetchTtlMs":
        return prefetch?.ttlMs !== void 0 ? String(prefetch.ttlMs) : "";
      default:
        return "";
    }
  }
  async handleChange(id, value) {
    await this.persist((config) => {
      switch (id) {
        case "provider":
          config.tools ??= {};
          if (value === "off") {
            delete config.tools?.[this.toolId];
          } else {
            config.tools ??= {};
            const providerId = resolveProviderSelectionValue(
              getReadyCompatibleProvidersForTool(config, this.cwd, this.toolId),
              value
            );
            if (!providerId) {
              throw new Error(`Unknown provider '${value}'.`);
            }
            config.tools[this.toolId] = providerId;
          }
          return;
        case "prefetchProvider": {
          const searchSettings = ensureSearchSettings(config);
          if (value === "off") {
            delete searchSettings.provider;
            return;
          }
          const providerId = resolveProviderSelectionValue(
            getReadyCompatibleProvidersForTool(config, this.cwd, "contents"),
            value
          );
          if (!providerId) {
            throw new Error(`Unknown provider '${value}'.`);
          }
          searchSettings.provider = providerId;
          return;
        }
        case "prefetchMaxUrls":
          ensureSearchSettings(config).maxUrls = parseOptionalPositiveIntegerInput(
            value,
            "Prefetch URLs must be a positive integer."
          );
          return;
        case "prefetchTtlMs":
          ensureSearchSettings(config).ttlMs = parseOptionalPositiveIntegerInput(
            value,
            "Prefetch TTL must be a positive integer."
          );
          return;
        default:
          throw new Error(`Unknown tool setting '${id}'.`);
      }
    });
  }
};
var ProviderSettingsSubmenu = class {
  constructor(tui, theme, providerId, getProviderConfig, persist, done) {
    this.tui = tui;
    this.theme = theme;
    this.providerId = providerId;
    this.getProviderConfig = getProviderConfig;
    this.persist = persist;
    this.done = done;
  }
  tui;
  theme;
  providerId;
  getProviderConfig;
  persist;
  done;
  selection = 0;
  submenu;
  render(width) {
    if (this.submenu) {
      return this.submenu.render(width);
    }
    const provider = PROVIDERS_BY_ID[this.providerId];
    const providerConfig = this.getProviderConfig();
    const entries = this.getEntries();
    const lines = [
      truncateToWidth(this.theme.fg("accent", provider.label), width),
      "",
      ...renderEntryList(width, this.theme, entries, this.selection)
    ];
    const selected = entries[this.selection];
    if (selected) {
      lines.push("");
      lines.push(
        ...renderSelectedEntryDescription(width, this.theme, selected)
      );
    }
    const status = getProviderReadinessSummaryForProviderConfig(
      this.providerId,
      providerConfig
    );
    lines.push("");
    lines.push(
      truncateToWidth(this.theme.fg("dim", `Status: ${status}`), width)
    );
    lines.push(
      truncateToWidth(
        this.theme.fg("dim", "\u2191\u2193 move \xB7 Enter edit/toggle \xB7 Esc back"),
        width
      )
    );
    return lines;
  }
  invalidate() {
    this.submenu?.invalidate();
  }
  handleInput(data) {
    if (this.submenu) {
      this.submenu.handleInput?.(data);
      this.tui.requestRender();
      return;
    }
    const kb = getKeybindings();
    const entries = this.getEntries();
    if (kb.matches(data, "tui.select.up")) {
      if (this.selection > 0) {
        this.selection -= 1;
      }
    } else if (kb.matches(data, "tui.select.down")) {
      if (this.selection < entries.length - 1) {
        this.selection += 1;
      }
    } else if (kb.matches(data, "tui.select.confirm") || data === " ") {
      void this.activateCurrentEntry();
    } else if (kb.matches(data, "tui.select.cancel")) {
      this.done();
      return;
    }
    this.tui.requestRender();
  }
  getEntries() {
    const providerConfig = this.getProviderConfig();
    return getProviderSettings(this.providerId).map(
      (setting) => buildManifestSettingsEntry(setting, providerConfig)
    );
  }
  async activateCurrentEntry() {
    const entry = this.getEntries()[this.selection];
    if (!entry) return;
    if (entry.kind === "cycle" && entry.values && entry.values.length > 0) {
      const currentIndex = entry.values.indexOf(entry.currentValue);
      const nextValue = entry.values[(currentIndex + 1) % entry.values.length];
      await this.handleChange(entry.id, nextValue);
      return;
    }
    if (entry.kind === "text") {
      const currentValue = this.getEntryRawValue(entry.id) ?? "";
      this.submenu = new TextValueSubmenu(
        this.tui,
        this.theme,
        entry.label,
        currentValue,
        entry.description,
        (selectedValue) => {
          this.submenu = void 0;
          if (selectedValue !== void 0) {
            void this.handleChange(entry.id, selectedValue);
          }
          this.tui.requestRender();
        }
      );
    }
  }
  getEntryRawValue(id) {
    const providerConfig = this.getProviderConfig();
    const setting = getProviderSettings(this.providerId).find(
      (candidate) => candidate.id === id
    );
    if (!setting || setting.kind !== "text") {
      return void 0;
    }
    return setting.getValue(providerConfig);
  }
  async handleChange(id, value) {
    await this.persist((providerConfig) => {
      const setting = getProviderSettings(this.providerId).find(
        (candidate) => candidate.id === id
      );
      if (!setting) {
        throw new Error(`Unknown setting '${id}'.`);
      }
      setting.setValue(providerConfig, value);
    });
  }
};
function ensureSearchSettings(config) {
  config.settings ??= {};
  config.settings.search ??= {};
  return config.settings.search;
}
function parseOptionalPositiveIntegerInput(value, errorMessage) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return void 0;
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(errorMessage);
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(errorMessage);
  }
  return parsed;
}
function parseOptionalNonNegativeIntegerInput(value, errorMessage) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return void 0;
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(errorMessage);
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(errorMessage);
  }
  return parsed;
}
var TextValueSubmenu = class {
  constructor(tui, theme, title, initialValue, help, done) {
    this.theme = theme;
    this.title = title;
    this.help = help;
    this.done = done;
    const editorTheme = {
      borderColor: (text) => this.theme.fg("accent", text),
      selectList: {
        selectedPrefix: (text) => this.theme.fg("accent", text),
        selectedText: (text) => this.theme.fg("accent", text),
        description: (text) => this.theme.fg("muted", text),
        scrollInfo: (text) => this.theme.fg("dim", text),
        noMatch: (text) => this.theme.fg("warning", text)
      }
    };
    this.editor = new Editor(tui, editorTheme);
    this.editor.setText(initialValue);
    this.editor.onSubmit = (text) => {
      this.done(text.trim());
    };
  }
  theme;
  title;
  help;
  done;
  editor;
  render(width) {
    return [
      truncateToWidth(this.theme.fg("accent", this.title), width),
      "",
      ...this.editor.render(width),
      "",
      truncateToWidth(this.theme.fg("dim", this.help), width),
      truncateToWidth(
        this.theme.fg(
          "dim",
          "Enter to save \xB7 Shift+Enter for newline \xB7 Esc to cancel"
        ),
        width
      )
    ];
  }
  invalidate() {
    this.editor.invalidate();
  }
  handleInput(data) {
    if (matchesKey(data, Key.escape)) {
      this.done(void 0);
      return;
    }
    this.editor.handleInput(data);
  }
};
function getEditableProviderConfig(_providerId, current) {
  return structuredClone(current ?? {});
}
function getInitialProviderSelection(config) {
  for (const capability of Object.keys(CAPABILITY_TOOL_NAMES)) {
    const providerId = getMappedProviderIdForTool(config, capability);
    if (providerId) {
      return providerId;
    }
  }
  return "codex";
}
function didContentsCacheInputsChange(previous, next) {
  return stableStringify2(getContentsCacheInputs(previous)) !== stableStringify2(getContentsCacheInputs(next));
}
function getContentsCacheInputs(config) {
  const providers = {};
  for (const provider of PROVIDER_LIST) {
    if (!supportsTool2(provider, "contents")) {
      continue;
    }
    providers[provider.id] = getEffectiveProviderConfig(config, provider.id);
  }
  return { providers };
}
function stableStringify2(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify2(item)).join(",")}]`;
  }
  return `{${Object.keys(value).sort().map(
    (key) => `${JSON.stringify(key)}:${stableStringify2(
      value[key]
    )}`
  ).join(",")}}`;
}
function formatProviderSetupState(state) {
  switch (state) {
    case "builtin":
      return "builtin";
    case "configured":
      return "configured";
    case "none":
      return "\u2014";
  }
}
function getProviderReadinessSummary(config, cwd, providerId) {
  const tools = getProviderTools(providerId);
  const statuses = tools.map(
    (tool) => getProviderCapabilityStatus(config, cwd, providerId, tool)
  );
  if (statuses.some((status) => status.state === "ready")) {
    return "Ready";
  }
  return formatProviderCapabilityStatus(statuses[0], providerId, tools[0]);
}
function getProviderReadinessSummaryForProviderConfig(providerId, providerConfig) {
  const status = PROVIDERS_BY_ID[providerId].getCapabilityStatus(
    providerConfig ?? PROVIDERS_BY_ID[providerId].config.createTemplate(),
    ""
  );
  return formatProviderCapabilityStatus(status, providerId);
}
function summarizeStringValue(value, secret) {
  if (!value) return "unset";
  if (secret) {
    if (value.startsWith("!")) return "!command";
    if (/^[A-Z][A-Z0-9_]*$/.test(value)) return `env:${value}`;
    return "literal";
  }
  return truncateInline(value, 40);
}
function clampResults(value, maximum = MAX_ALLOWED_RESULTS) {
  if (value === void 0) return Math.min(DEFAULT_MAX_RESULTS, maximum);
  return Math.min(Math.max(Math.trunc(value), 1), maximum);
}
function resolveSearchQueries(queries) {
  if (queries.length === 0) {
    throw new Error("queries must contain at least one item.");
  }
  return queries.map(
    (value, index) => normalizeSearchQuery(value, `queries[${index}]`)
  );
}
function resolveAnswerQueries(queries) {
  if (queries.length === 0) {
    throw new Error("queries must contain at least one item.");
  }
  return queries.map(
    (value, index) => normalizeSearchQuery(value, `queries[${index}]`)
  );
}
function normalizeSearchQuery(value, fieldName) {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return normalized;
}
function getSearchQueriesForDisplay(queries) {
  if (!Array.isArray(queries)) {
    return [];
  }
  return queries.map((value) => typeof value === "string" ? value.trim() : "").filter((value) => value.length > 0);
}
function getAnswerQueriesForDisplay(queries) {
  return getSearchQueriesForDisplay(queries);
}
function createBatchCompletionReporter(verb, providerLabel, total, report) {
  if (!report) {
    return {
      start: () => {
      },
      markCompleted: () => {
      },
      markFailed: () => {
      }
    };
  }
  let completedCount = 0;
  let failedCount = 0;
  const emit = () => {
    let message = `${verb} via ${providerLabel}: ${completedCount}/${total} completed`;
    if (failedCount > 0) {
      message += `, ${failedCount} failed`;
    }
    report(message);
  };
  return {
    start: emit,
    markCompleted: () => {
      completedCount += 1;
      emit();
    },
    markFailed: () => {
      failedCount += 1;
      emit();
    }
  };
}
function buildWebSearchDetails(provider, outcomes) {
  return {
    tool: "web_search",
    provider,
    queryCount: outcomes.length,
    failedQueryCount: outcomes.filter((outcome) => outcome.error !== void 0).length,
    resultCount: outcomes.reduce(
      (count, outcome) => count + (outcome.response?.results.length ?? 0),
      0
    )
  };
}
function extractTextContent(content) {
  if (!content || content.length === 0) {
    return void 0;
  }
  const text = content.filter((item) => item.type === "text" && typeof item.text === "string").map((item) => item.text?.trimEnd() ?? "").join("\n").trim();
  return text.length > 0 ? text : void 0;
}
function renderCallHeader(params, theme) {
  const maxResultsSuffix = params.maxResults !== void 0 && params.maxResults !== DEFAULT_MAX_RESULTS ? ` (max ${params.maxResults})` : void 0;
  return renderListCallHeader(
    "web_search",
    getSearchQueriesForDisplay(params.queries),
    theme,
    maxResultsSuffix,
    { quoteSingleItem: true }
  );
}
function renderMarkdownBlock(text) {
  if (!text) {
    return new Text("", 0, 0);
  }
  return new Markdown(`
${text}`, 0, 0, getMarkdownTheme());
}
function renderBlockText(text, theme, color) {
  if (!text) {
    return new Text("", 0, 0);
  }
  const rendered = text.split("\n").map((line) => theme.fg(color, line)).join("\n");
  return new Text(`
${rendered}`, 0, 0);
}
function renderSimpleText(text, theme, color) {
  return new Text(theme.fg(color, text), 0, 0);
}
function renderCollapsedSearchSummary(details, text, theme) {
  const queryCount = typeof details?.queryCount === "number" ? details.queryCount : inferSearchQueryCount(text);
  const resultCount = typeof details?.resultCount === "number" ? details.resultCount : inferSearchResultCount(text);
  const failedQueryCount = typeof details?.failedQueryCount === "number" ? details.failedQueryCount : inferSearchFailureCount(text);
  const providerLabel = typeof details?.provider === "string" ? PROVIDERS_BY_ID[details.provider]?.label ?? details.provider : void 0;
  let base2 = buildSearchSummaryText({
    queryCount,
    resultCount
  });
  if (providerLabel) {
    base2 = `${base2} via ${providerLabel}`;
  }
  if (failedQueryCount && failedQueryCount > 0) {
    base2 += `, ${failedQueryCount} failed`;
  }
  let summary = theme.fg("success", base2);
  summary += theme.fg("muted", ` (${getExpandHint()})`);
  return new Text(summary, 0, 0);
}
function buildSearchSummaryText({
  queryCount,
  resultCount
}) {
  const countSummary = typeof resultCount === "number" ? `${resultCount} result${resultCount === 1 ? "" : "s"}` : "Search output available";
  if (queryCount && queryCount > 1) {
    return `${queryCount} queries, ${countSummary}`;
  }
  return countSummary;
}
function inferSearchQueryCount(text) {
  if (!text) {
    return void 0;
  }
  const headingMatches = text.match(/^(?:##\s+)?Query\s+\d+:/gm);
  if (headingMatches && headingMatches.length > 0) {
    return headingMatches.length;
  }
  return void 0;
}
function inferSearchResultCount(text) {
  if (!text) {
    return void 0;
  }
  const resultMatches = text.match(/^\d+\.\s+/gm);
  return resultMatches?.length;
}
function inferSearchFailureCount(text) {
  if (!text) {
    return void 0;
  }
  const failureMatches = text.match(/^Search failed:/gm);
  return failureMatches?.length;
}
function appendProviderSummary(summary, provider) {
  const providerLabel = PROVIDERS_BY_ID[provider]?.label ?? provider;
  const providerSuffix = `via ${providerLabel}`;
  return summary.toLowerCase().includes(providerSuffix.toLowerCase()) ? summary : `${summary} ${providerSuffix}`;
}
function getFirstLine(text) {
  if (!text) {
    return void 0;
  }
  const firstLine = text.split("\n", 1)[0]?.trim();
  return firstLine && firstLine.length > 0 ? firstLine : void 0;
}
function getExpandHint() {
  try {
    const keys = getKeybindings().getKeys("app.tools.expand");
    if (keys.length > 0) {
      return `${keys.join("/")} to expand`;
    }
  } catch {
  }
  return "ctrl+o to expand";
}
function cleanSingleLine(text) {
  return text.replace(/\s+/g, " ").trim();
}
function formatQuotedPreview(text, maxLength = 80) {
  return `"${truncateInline(cleanSingleLine(text), maxLength)}"`;
}
function formatSearchResponses(outcomes, prefetch) {
  const body = outcomes.map(
    (outcome, index) => formatSearchOutcomeSection(outcome, index, outcomes.length)
  ).join("\n\n");
  if (!prefetch) {
    return body;
  }
  return `${body}

---

Background contents prefetch started via ${prefetch.provider} for ${prefetch.urlCount} URL(s).`;
}
function formatSearchOutcomeSection(outcome, index, total) {
  const body = outcome.response ? formatSearchResponseMarkdown(outcome.response) : `Search failed: ${outcome.error ?? "Unknown error."}`;
  if (total === 1) {
    return body;
  }
  const heading = `## Query ${index + 1}: ${formatSearchHeading(outcome.query)}`;
  return `${heading}

${body}`;
}
function formatSearchHeading(query2) {
  return `"${escapeMarkdownText(cleanSingleLine(query2))}"`;
}
function formatAnswerHeading(query2) {
  return `"${escapeMarkdownText(cleanSingleLine(query2))}"`;
}
function collectSearchResultUrls(outcomes) {
  return outcomes.flatMap(
    (outcome) => outcome.response?.results.map((result) => result.url) ?? []
  );
}
function formatSearchResponseMarkdown(response) {
  if (response.results.length === 0) {
    return "No results found.";
  }
  return response.results.map((result, index) => {
    const lines = [
      `${index + 1}. ${formatMarkdownLink(result.title, result.url)}`
    ];
    if (result.snippet) {
      lines.push(`   ${escapeMarkdownText(cleanSingleLine(result.snippet))}`);
    }
    return lines.join("\n");
  }).join("\n\n");
}
function formatMarkdownLink(label, url2) {
  return `[${escapeMarkdownLinkLabel(label)}](<${url2}>)`;
}
function escapeMarkdownLinkLabel(text) {
  return cleanSingleLine(text).replaceAll("\\", "\\\\").replaceAll("]", "\\]");
}
function escapeMarkdownText(text) {
  return text.replaceAll("\\", "\\\\").replaceAll("*", "\\*").replaceAll("_", "\\_").replaceAll("`", "\\`").replaceAll("#", "\\#").replaceAll("[", "\\[").replaceAll("]", "\\]");
}
async function truncateAndSave(text, prefix) {
  const truncation = truncateHead(text, {
    maxLines: DEFAULT_MAX_LINES,
    maxBytes: DEFAULT_MAX_BYTES
  });
  if (!truncation.truncated) return truncation.content;
  const dir = join2(tmpdir(), `pi-web-providers-${prefix}-${Date.now()}`);
  await mkdir2(dir, { recursive: true });
  const fullPath = join2(dir, "output.txt");
  await writeFile2(fullPath, text, "utf-8");
  return truncation.content + `

[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). Full output saved to: ${fullPath}]`;
}
function truncateInline(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}\u2026`;
}
var __test__ = {
  loadConfig,
  didContentsCacheInputsChange,
  dispatchWebResearch: ({
    pi,
    activeWebResearchRequests,
    updateWebResearchWidget,
    config,
    explicitProvider,
    ctx,
    options,
    input,
    executionOverride
  }) => dispatchWebResearchInternal({
    pi,
    activeWebResearchRequests,
    updateWebResearchWidget,
    config,
    explicitProvider,
    ctx,
    providerOptions: options,
    input,
    executionOverride
  }),
  executeAnswerTool: ({
    config,
    explicitProvider,
    ctx,
    signal,
    onUpdate,
    options,
    queries,
    executionOverrides
  }) => executeAnswerToolInternal({
    config,
    explicitProvider,
    ctx,
    signal,
    progress: createProgressEmitter(onUpdate),
    providerOptions: options,
    queries,
    executionOverrides
  }),
  executeRawProviderRequest,
  executeProviderTool: ({
    capability,
    config,
    explicitProvider,
    ctx,
    signal,
    onUpdate,
    options,
    urls,
    query: query2,
    input,
    executionOverride,
    executionOverrides
  }) => executeProviderToolInternal({
    capability,
    config,
    explicitProvider,
    ctx,
    signal,
    progress: createProgressEmitter(onUpdate),
    providerOptions: options,
    urls,
    query: query2,
    input,
    executionOverride,
    executionOverrides
  }),
  executeSearchTool: ({
    config,
    explicitProvider,
    ctx,
    signal,
    onUpdate,
    options,
    maxResults,
    queries,
    executionOverrides
  }) => executeSearchToolInternal({
    config,
    explicitProvider,
    ctx,
    signal,
    progress: createProgressEmitter(onUpdate),
    providerOptions: options,
    maxResults,
    queries,
    executionOverrides
  }),
  extractTextContent,
  formatWebResearchResultMessage,
  getAvailableManagedToolNames,
  getReadyCompatibleProvidersForTool,
  getEnabledCompatibleProvidersForTool: getReadyCompatibleProvidersForTool,
  buildStructuredOptionsSchema,
  getAvailableProviderIdsForCapability,
  getProviderStatusForTool,
  getSyncedActiveTools,
  renderCallHeader,
  renderQuestionCallHeader,
  renderResearchCallHeader,
  renderToolCallHeader,
  renderCollapsedSearchSummary,
  renderCollapsedProviderToolSummary,
  renderSearchToolResult,
  renderProviderToolResult,
  renderWebResearchDispatchResult,
  renderWebResearchResultMessage,
  waitForPendingResearchTasks: async () => {
    await Promise.all([...pendingResearchTasks]);
  },
  formatSearchResponses,
  formatAnswerResponses
};
export {
  __test__,
  webProvidersExtension as default
};
