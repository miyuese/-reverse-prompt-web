/**
 * 默认反推提示词规则
 *
 * 优先级（高 → 低）：
 * 1. 用户本次输入的修改要求（如继续对话时的补充指令）
 * 2. 当前选用的助手设计师的 systemPrompt + outputTemplate
 * 3. 本文件中的系统默认规则（DEFAULT_SYSTEM_PROMPT + DEFAULT_OUTPUT_TEMPLATE）
 */

/**
 * 系统默认：通用中文结构化反推 prompt 规则
 * 涵盖文生图常用的 8 个结构维度
 */
export const DEFAULT_SYSTEM_PROMPT = `
你是一个专业的文生图提示词工程师，擅长分析图片内容并将其转化为结构化的中文提示词。

分析图片时，请按以下 8 个维度逐一描述，每个维度单独成段，维度名称加粗：

1. **主体**：画面中的核心对象或人物，包括外貌、姿态、表情、服装等细节。
2. **构图**：主体在画面中的位置、视角（俯视/仰视/平视）、景别（特写/中景/全景/远景）。
3. **风格**：整体艺术风格，例如写实摄影、水彩插画、赛博朋克、古风工笔、极简主义等。
4. **光线**：光源类型（自然光/人工光/逆光/侧光）、光线质感（柔和/强烈/漫反射）、时段特征。
5. **色彩**：主色调、配色方案、饱和度与对比度特征，是否有明显的色彩倾向或滤镜感。
6. **材质与细节**：画面中物体的材质质感，如金属光泽、布料纹理、皮肤细腻程度等。
7. **镜头/视角**：如适用，描述镜头焦距感（广角/标准/长焦）、景深（浅景深/全焦）、镜头畸变。
8. **场景与背景**：背景环境的描述，包括地点、时间、天气、氛围等。

输出时只给出提示词内容，不要解释分析过程，不要重复用户的问题。
`.trim();

/**
 * 系统默认输出模板说明（用于指导模型的格式）
 */
export const DEFAULT_OUTPUT_TEMPLATE = `
请按照以下格式输出，每个维度单独成段：

**主体**：……
**构图**：……
**风格**：……
**光线**：……
**色彩**：……
**材质与细节**：……
**镜头/视角**：……
**场景与背景**：……
`.trim();

/**
 * 组装最终发送给模型的 system prompt
 *
 * @param assistant 可选，用户选择的助手设计师配置
 * @returns 最终 system prompt 字符串
 */
export function buildSystemPrompt(assistant?: {
  systemPrompt: string;
  outputTemplate: string;
} | null): string {
  if (assistant?.systemPrompt) {
    // 助手设计师覆盖默认规则
    const parts = [assistant.systemPrompt];
    if (assistant.outputTemplate) {
      parts.push(`\n\n请按以下格式输出：\n${assistant.outputTemplate}`);
    }
    return parts.join("");
  }
  // 使用系统默认规则
  return `${DEFAULT_SYSTEM_PROMPT}\n\n${DEFAULT_OUTPUT_TEMPLATE}`;
}

/**
 * 组装用于分析图片的用户消息内容
 * 图片以 base64 data URL 形式传入
 *
 * @param imageDataUrl base64 data URL，例如 data:image/jpeg;base64,...
 * @param userInstruction 可选，用户本次的补充修改要求（优先级最高）
 */
export function buildImageMessage(
  imageDataUrl: string,
  userInstruction?: string
): import("openai").OpenAI.Chat.ChatCompletionMessageParam {
  const textContent = userInstruction
    ? `请重新分析图片，并根据以下要求调整输出：${userInstruction}`
    : "请分析这张图片，按照要求输出结构化反推提示词。";

  return {
    role: "user",
    content: [
      { type: "text", text: textContent },
      { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
    ],
  };
}
