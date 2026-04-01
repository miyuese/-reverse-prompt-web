import { generateText, type ModelMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import OpenAI from "openai";

export interface ModelConfigParams {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

function mapAIError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("401") ||
    normalized.includes("incorrect api key") ||
    normalized.includes("invalid_api_key") ||
    normalized.includes("unauthorized") ||
    normalized.includes("authentication")
  ) {
    return "API Key 无效或鉴权失败，请检查模型配置中的 API Key 是否正确";
  }

  if (
    (normalized.includes("404") || normalized.includes("400")) &&
    (normalized.includes("model") || normalized.includes("not_found_error"))
  ) {
    return "模型配置异常或模型名称不存在，请检查 Model 名称是否填写正确";
  }

  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("etimedout") ||
    normalized.includes("request timeout") ||
    normalized.includes("deadline exceeded")
  ) {
    return "第三方接口请求超时，请稍后重试，或检查 Base URL 与目标平台是否可用";
  }

  if (
    normalized.includes("enotfound") ||
    normalized.includes("econnrefused") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("getaddrinfo")
  ) {
    return "Base URL 不可用或网络连接失败，请检查模型配置中的 Base URL 是否正确";
  }

  if (
    (normalized.includes("400") || normalized.includes("422")) &&
    (normalized.includes("image") || normalized.includes("vision") || normalized.includes("multimodal"))
  ) {
    return "当前模型或兼容平台不支持图片输入，请更换支持视觉能力的模型或兼容平台";
  }

  if (
    (normalized.includes("400") || normalized.includes("422")) &&
    (normalized.includes("invalid type") || normalized.includes("content") || normalized.includes("image_url"))
  ) {
    return "当前兼容平台不支持此图片消息格式，请确认是否支持 OpenAI 图片输入或 data URL 格式";
  }

  if ((normalized.includes("502") || normalized.includes("bad gateway")) && normalized.includes("image")) {
    return "当前兼容平台的 Responses 图片能力不可用：文本调用正常，但一旦传入图片即被上游网关拒绝，请更换支持图片输入的兼容平台或模型";
  }

  if (normalized.includes("403") && normalized.includes("blocked")) {
    return "当前请求被第三方平台拦截，请检查 API Key、模型权限、网络环境或平台风控策略";
  }

  return message;
}

/**
 * 基于模型配置创建 OpenAI 兼容客户端
 */
export function createAIClient(config: ModelConfigParams): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });
}

function createCompatibleProvider(config: ModelConfigParams) {
  return createOpenAICompatible({
    name: "customOpenAICompatible",
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });
}

/**
 * 发送单条文本消息，返回模型回复文本
 * 用于连通性测试和后续业务调用
 */
export async function chatCompletion(
  config: ModelConfigParams,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  try {
    const client = createAIClient(config);
    const response = await client.chat.completions.create({
      model: config.modelName,
      messages,
      max_tokens: 512,
    });
    const content = response.choices[0]?.message?.content ?? "";
    return { ok: true, content };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[chatCompletion]", msg);
    return { ok: false, error: mapAIError(msg) };
  }
}

/**
 * 使用 AI SDK 的 OpenAI-compatible provider 发送图片分析请求，
 * 尽量贴近 OpenCode 当前的 provider/attachment 路线。
 */
export async function analyzeImageWithResponses(
  config: ModelConfigParams,
  params: {
    systemPrompt: string;
    imageBytes: Uint8Array;
    mediaType: string;
    userInstruction?: string;
  }
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  try {
    const provider = createCompatibleProvider(config);
    const messages: ModelMessage[] = [
      {
        role: "system",
        content: params.systemPrompt,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: params.userInstruction
              ? `请重新分析图片，并根据以下要求调整输出：${params.userInstruction}`
              : "请分析这张图片，按照要求输出结构化反推提示词。",
          },
          {
            type: "image",
            image: params.imageBytes,
            mediaType: params.mediaType,
          },
        ],
      },
    ];

    const response = await generateText({
      model: provider(config.modelName),
      messages,
    });

    return { ok: true, content: response.text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analyzeImageWithResponses]", msg);
    return { ok: false, error: mapAIError(msg) };
  }
}

export async function generateTextWithResponses(
  config: ModelConfigParams,
  params: {
    systemPrompt: string;
    userPrompt: string;
  }
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  try {
    const provider = createCompatibleProvider(config);
    const messages: ModelMessage[] = [
      {
        role: "system",
        content: params.systemPrompt,
      },
      {
        role: "user",
        content: params.userPrompt,
      },
    ];

    const response = await generateText({
      model: provider(config.modelName),
      messages,
    });

    return { ok: true, content: response.text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generateTextWithResponses]", msg);
    return { ok: false, error: mapAIError(msg) };
  }
}
