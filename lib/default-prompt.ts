/**
 * 默认反推提示词规则 (Quest 6.2)
 *
 * 覆盖优先级（高 → 低）：
 *   1. 用户本次对话的修改要求（最高优先）
 *   2. 用户选择的「助手设计师」的 systemPrompt + outputTemplate
 *   3. 本文件定义的系统默认规则（兜底）
 */

/**
 * 默认系统提示词
 * 用于通用中文结构化反推场景，当用户未选择任何助手设计师时使用。
 */
export const DEFAULT_SYSTEM_PROMPT = `你是一位专业的图像反推提示词生成助手。

你的任务是分析用户提供的图片，生成一段详细、结构清晰的中文文生图提示词（prompt），供 Stable Diffusion、Midjourney、FLUX 等文生图模型使用。

## 输出结构要求

请严格按照以下结构逐段输出，每段用标题标注：

1. **主体**：图片的核心对象或人物，包括外观特征、动作、表情、服装等细节。
2. **构图**：画面的布局方式，如居中、三分法、对角线、俯视、仰视等。
3. **风格**：整体艺术风格，如写实、插画、油画、赛博朋克、国风、极简等。
4. **光线**：光源类型与方向，如自然光、逆光、柔光、强对比侧光、霓虹灯光等。
5. **色彩**：主色调、配色关系、饱和度与冷暖倾向。
6. **材质**：主要物体的质感表现，如金属、皮肤、布料、玻璃、木材等。
7. **镜头/视角**：拍摄距离与视角，如特写、半身、全身、广角、长焦等。
8. **场景细节**：背景环境、氛围元素、时间或季节线索等补充描述。

## 输出要求

- 使用中文输出，语言精炼，每段 1～3 句。
- 不要添加任何解释性前缀，直接从「主体」开始输出。
- 不要输出英文 prompt，只输出中文结构化描述。
- 若某个维度在图中不明显，可简短说明无明显特征，不要强行编造。`;

/**
 * 默认输出格式模板说明
 * 助手设计师可用自己的 outputTemplate 覆盖此说明。
 */
export const DEFAULT_OUTPUT_TEMPLATE =
  "按主体 / 构图 / 风格 / 光线 / 色彩 / 材质 / 镜头视角 / 场景细节八个维度分段输出中文描述。";

/**
 * 根据助手设计师配置组装最终系统提示词。
 * 若未提供助手设计师，使用系统默认规则。
 *
 * @param assistant - 可选的助手设计师配置
 * @returns 最终用于 AI 调用的系统提示词字符串
 */
export function buildSystemPrompt(assistant?: {
  systemPrompt: string;
  outputTemplate: string;
}): string {
  if (assistant) {
    return [
      assistant.systemPrompt,
      "",
      "## 输出格式要求",
      assistant.outputTemplate,
    ].join("\n");
  }
  return [
    DEFAULT_SYSTEM_PROMPT,
    "",
    "## 输出格式要求",
    DEFAULT_OUTPUT_TEMPLATE,
  ].join("\n");
}