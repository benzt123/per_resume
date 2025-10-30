// server/ai.js
const axios = require('axios');

const DASHSCOPE_API_KEY = 'sk-3d53078d313946a69f5f7489bebeb9a7'; // 替换为真实 key
const MODEL = 'qwen3-max';

async function analyzeWithQwen(text) {
  const input = text.length > 8000 ? text.substring(0, 8000) : text;

  const prompt = `
请严格分析文档内容，并返回一个 JSON 对象，格式如下：
{
  "category": "学生工作|科研项目|实习经历|荣誉奖励",
  "summary": "一句话总结该经历，必须符合以下模板：\\n- 学生工作：'X年X月 至 X年X月，在[学院/组织] [部门] 担任[职务]'\\n- 科研项目：'X年X月，参与[项目名称]，完成[成果]'\\n- 实习经历：'X年X月 至 X年X月，在[公司]担任[岗位]，负责[工作内容]'\\n- 荣誉奖励：'X年X月，获得[奖项名称]'",
  "confidence": 0.95 // 估算值，0~1之间
}

## 分类规则（必须遵守）：
1. 只能从以下四个类别中选择一个：学生工作、科研项目、实习经历、荣誉奖励。禁止使用其他任何类别。
2. summary 必须是一句话，且结构清晰，包含时间、主体和关键信息。
3. confidence 表示你对分类的置信度，根据信息完整度打分。

## 文档内容：
${input}
`;

  try {
    const resp = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: MODEL,
        input: {
          messages: [
            { role: 'user', content: prompt }
          ]
        },
        parameters: { result_format: 'message' }
      },
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const output = resp.data.output.choices[0].message.content;

    let parsed;
    try {
      const jsonStr = output.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      throw new Error('AI 返回的不是有效 JSON 格式: ' + output);
    }

    return validateAndFixResult(parsed);

  } catch (err) {
    console.error('AI 调用失败:', err.response?.data || err.message);
    throw new Error('AI 分析失败：' + (err.message || '未知错误'));
  }
}

// 校验并修正 AI 返回结果
function validateAndFixResult(result) {
  const validCategories = ['学生工作', '科研项目', '实习经历', '荣誉奖励'];

  if (!validCategories.includes(result.category)) {
    throw new Error(`非法分类 "${result.category}"，仅允许: ${validCategories.join('、')}`);
  }

  if (typeof result.summary !== 'string' || !result.summary.trim()) {
    throw new Error('summary 必须是非空字符串');
  }

  const conf = parseFloat(result.confidence);
  if (isNaN(conf) || conf < 0 || conf > 1) {
    result.confidence = 0.8;
  } else {
    result.confidence = conf;
  }

  return result;
}

module.exports = { analyzeWithQwen };