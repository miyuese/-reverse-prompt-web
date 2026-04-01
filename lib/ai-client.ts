/**
 * OpenAI / OpenAI 兼容接口调用封装
 * 不依赖 openai SDK，直接用 fetch，保持轻量且兼容性强。
 */

export interface AiCallOptions {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  systemPrompt: string;
  userMessage: string;
  /** 图片 base64 数组（可选，用于视觉模型）*/
  imageBase64List?: string[];
}

export interface AiCallResult {
  success: true;
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AiCallError {
  success: false;
  error: string;
  status?: number;
}

export type AiCallResponse = AiCallResult | AiCallError;

/**
 * 调用 OpenAI / 兼容接口的 chat completions 端点。
 * 支持纯文本与图文混合（vision）两种模式。
 */
export async function callAi(options: AiCallOptions): Promise<AiCallResponse> {
  const { baseUrl, apiKey, modelName, systemPrompt, userMessage, imageBase64List } = options;

  // 构造 user message content
  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "auto" } };

  let userContent: string | ContentPart[];

  if (imageBase64List && imageBase64List.length > 0) {
    const parts: ContentPart[] = imageBase64List.map((b64) => ({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${b64}`,
        detail: "auto",
      },
    }));
    parts.push({ type: "text", text: userMessage });
    userContent = parts;
  } else {
    userContent = userMessage;
  }

  const body = {
    model: modelName,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  };

  const endpoint = baseUrl.replace(/\/$/, "") + "/chat/completions";

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      success: false,
      error: `网络请求失败：${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (!res.ok) {
    let detail = "";
    try {
      const json = await res.json();
      detail = json?.error?.message ?? JSON.stringify(json);
    } catch {
      detail = await res.text().catch(() => "");
    }
    return {
      success: false,
      error: `接口返回错误 HTTP ${res.status}：${detail}`,
      status: res.status,
    };
  }

  let json: Record<string, unknown>;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    return { success: false, error: "接口返回内容无法解析为 JSON" };
  }

  const choices = json.choices as Array<{ message?: { content?: string } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (!content) {
    return { success: false, error: "接口返回结构异常，无法提取 content 字段" };
  }

  return {
    success: true,
    content,
    model: (json.model as string) ?? modelName,
    usage: json.usage as AiCallResult["usage"],
  };
}
