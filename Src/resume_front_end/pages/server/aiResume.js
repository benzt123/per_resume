// server/aiResume.js
const axios = require('axios');

const DASHSCOPE_API_KEY = 'sk-3d53078d313946a69f5f7489bebeb9a7'; // 替换为真实 key
const MODEL = 'qwen3-max';

function buildResumePrompt(job, profile, experiences) {
	 if (profile.avatar && profile.avatar.startsWith('/uploads/')) {
	    profile.avatar = `http://localhost:3000${profile.avatar}`;
	  }
  const expList = experiences
    .map(e => `[${e.category}] ${e.summary} (置信度: ${e.confidence?.toFixed(2) || 'N/A'})`)
    .join('\n');

  return `
你是一位专业简历顾问，请为求职岗位"${job}"生成一份中文 Markdown 简历。

## 要求：
1. **必须包含以下章节**（顺序不可变）：
   - 基本信息
   - 专业技能（根据岗位推测 3-5 项核心技术栈）
   - 项目与经历（按子标题组织，如果没有相关经历则不填相应的标题）：
        • 实习经历
        • 科研项目
        • 学生工作
        • 荣誉奖励
   - 自我评价（≤50字，贴合岗位）

2. **基本信息格式（必须使用HTML表格）**：
\`\`\`html
## 基本信息
<style>
.resume-info {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
  color: #2b5c5c;
}
.resume-info td {
  padding: 6px 12px;
  vertical-align: top;
  text-align: left;
}
.resume-info .photo {
  width: 140px;
  text-align: right;
}
.resume-info img {
  width: 140px;
  height: 180px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #ddd;
}
</style>

<table class="resume-info">
  <tr>
    <td>
      <table>
        <tr>
          <td>姓名：${profile.name}</td>
          <td>学历：${profile.education || '未提供'}</td>
        </tr>
        <tr>
          <td>性别：${profile.gender || '未提供'}</td>
          <td>GPA：${profile.gpa || '未提供'}</td>
        </tr>
        <tr>
          <td>专业：${profile.major || '未提供'}</td>
          <td>电话：${profile.phone || '未提供'}</td>
        </tr>
        <tr>
          <td>学校：${profile.school || '未提供'}</td>
          <td>邮箱：${profile.email || '未提供'}</td>
        </tr>
        <tr>
          <td>毕业年份：${profile.graduation_year || '未提供'}</td>
          <td>政治面貌：${profile.political_status || '未提供'}</td>
        </tr>
        <tr>
          <td colspan="2">求职意向：${job}</td>
        </tr>
      </table>
    </td>
    <td class="photo">
      <img src="${profile.avatar || '/static/default-avatar.png'}" alt="个人照片" />
    </td>
  </tr>
</table>

\`\`\`

3. **其他格式规则**：
   - **总标题**：使用# 个人简历，并且居中显示
   - **章节标题**：使用## 标题格式
   - **专业技能**：使用"- "列表
   - **项目与经历**：使用"### "作为子标题，"- "作为经历描述
   - **自我评价**：不超过50字的一段话

4. **禁止**：
   - 使用Markdown表格语法（| | |）
   - 省略任何章节
   - 编造未提供信息
   - 输出解释性文字
   
5. **内容规则**
   - 仅使用提供的 profile 和 experience 数据
    - 按岗位相关性筛选经历（如前端岗优先实习/项目）
    - 每类最多 3 条，按置信度降序
    - 语言精炼，突出成果和技能

## 可用经历：
${expList || '暂无经历'}

## 请直接输出 Markdown 简历：
`;
}

async function generateResumeWithAI(job, profile, experiences) {
  const prompt = buildResumePrompt(job, profile, experiences);

  try {
    const resp = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: MODEL,
        input: { messages: [{ role: 'user', content: prompt }] },
        parameters: { result_format: 'message' }
      },
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 150000
      }
    );

    let content = resp.data.output.choices[0].message.content;
    content = content.replace(/^```(?:markdown)?\s*/i, '').replace(/```$/, '').trim();
    return content;
  } catch (err) {
    console.error('简历生成 AI 调用失败:', err.response?.data || err.message);
    throw new Error('AI 生成失败：' + (err.message || '未知错误'));
  }
}


function buildCapabilityAnalysisPrompt(job, experiences) {
  const expList = experiences
    .map(e => `[${e.category}] ${e.summary} (置信度: ${e.confidence?.toFixed(2) || 'N/A'})`)
    .join('\n');

  return `
你是一位专业的人力资源分析师或职业规划顾问。请分析求职者针对岗位 "${job}" 的经历，并生成一份能力图分析报告。

## 分析目标
1.  **识别能力缺口**：根据 "${job}" 这个岗位的要求，分析求职者当前经历中缺少哪些关键技能或经验。
2.  **评估经历匹配度**：评估现有经历与目标岗位的相关性。
3.  **提供改进建议**：针对识别出的能力缺口，给出具体、可操作的提升建议。

## 输入数据
以下是求职者提供的经历列表：
${expList || '求职者暂无任何经历。'}

## 输出要求
请严格按以下 JSON 格式输出分析结果，不要包含任何解释性文字或 Markdown 代码块标记。输出必须是有效的 JSON 格式。

{
  "job": "string, 分析的目标岗位",
  "summary": {
    "overallMatch": "string, 整体匹配度评价 (如：匹配度较高，具备核心技能；匹配度一般，存在部分缺口；匹配度较低，核心经验不足)",
    "strengths": ["string, 求职者的优势或与岗位匹配的经历"], // 可选
    "weaknesses": ["string, 求职者的主要短板或能力缺口"] // 可选
  },
  "capabilities": [
    {
      "name": "string, 能力名称 (如：沟通能力, 项目管理, 技术栈等)",
      "level": "string, 当前具备水平 (如：精通, 熟练, 了解, 缺失)",
      "relevance": "string, 与岗位的相关性 (如：高度相关, 相关, 一般, 不相关)",
      "evidence": ["string, 支持该水平判断的具体经历或技能点 (来自输入的经历列表)"], // 如果 level 为 '缺失'，此项为空数组
      "improvement": "string, 如何提升此项能力的具体建议" // 如果 level 为 '精通' 或 '熟练'，此项可选或为空
    }
  ],
  "suggestions": [
    {
      "type": "string, 建议类型 (如：技能提升, 项目补充, 实习建议, 证书考取)",
      "description": "string, 具体建议内容"
    }
  ]
}

## 注意事项
- 分析应基于实际经历列表，避免编造未提供的信息。
- 对于求职者完全没有涉及的领域，应标记为“缺失”。
- 建议应具体、可操作，最好能结合当前行业趋势或岗位需求。
- 语言应客观、专业、有建设性。
`;
}

/**
 * 调用 AI 生成能力图分析报告
 * @param {string} job - 目标岗位
 * @param {Array} experiences - 用户的经历数组
 * @returns {Promise<Object>} - 解析后的 JSON 分析结果
 */
async function analyzeCapabilitiesWithAI(job, experiences) {
  const prompt = buildCapabilityAnalysisPrompt(job, experiences);

  try {
    console.log(`[AI Analysis] 正在分析岗位 "${job}" 的能力图...`); // 调试日志
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', // 注意：URL 末尾多了一个空格，已修正
      {
        model: MODEL,
        input: { messages: [{ role: 'user', content: prompt }] },
        parameters: { result_format: 'message' }
      },
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 增加超时时间，分析可能更复杂
      }
    );

    let content = response.data.output.choices[0].message.content;
    console.log(`[AI Analysis] Raw AI Response: ${content}`); // 调试日志

    // 尝试移除可能的 Markdown 代码块标记
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/```$/s, '').trim();
    console.log(`[AI Analysis] Cleaned Content: ${content}`); // 调试日志

    // 解析 JSON
    let parsedResult;
    try {
        parsedResult = JSON.parse(content);
    } catch (jsonErr) {
        console.error('[AI Analysis] JSON 解析失败:', jsonErr.message);
        console.error('[AI Analysis] 问题内容:', content);
        throw new Error(`AI 返回的不是有效 JSON 格式: ${jsonErr.message}`);
    }

    console.log(`[AI Analysis] Parsed Result:`, parsedResult); // 调试日志
    return parsedResult;
  } catch (err) {
    console.error('[AI Analysis] 能力图分析 AI 调用失败:', err.response?.data || err.message);
    if (err.response) {
        console.error('[AI Analysis] HTTP Status:', err.response.status);
        console.error('[AI Analysis] Response Data:', err.response.data);
    }
    throw new Error(`AI 分析失败：${err.message || '未知错误'}`);
  }
}

// 导出新函数
module.exports = { generateResumeWithAI, analyzeCapabilitiesWithAI };