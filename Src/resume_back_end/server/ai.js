// server/ai.js
const axios = require('axios');

const DASHSCOPE_API_KEY = '替换为阿里云真实 key'; // 替换为真实 key
const MODEL = 'qwen3-max';

async function analyzeWithQwen(text) {
  const input = text.length > 8000 ? text.substring(0, 8000) : text;

const prompt = `
你是一个经历分类助手，请分析用户上传的文本内容，完成两项任务：

### 1. 分类（category）
从以下四个中选择最合适的类别：
请从以下四个类别中选择**最匹配的一项**：
- 学生工作：学生干部、助理、社团职务、组织活动、志愿服务、班级管理等；
- 科研项目：课程设计、科研课题、实验研究、论文发表、学术竞赛、算法建模等；
- 实习经历：企业/机构实习、兼职、岗位职责、技术开发、运营分析等；
- 荣誉奖励：奖学金、比赛奖项、荣誉称号、表彰证书等。

判断优先级规则（必须遵守）：
1. 若含“奖、荣誉、表彰、优秀、获评” → 优先归为 **荣誉奖励**
2. 若含“实习、公司、岗位、职责、部门、兼职” → 优先归为 **实习经历**
3. 若含“项目、开发、研究、数据分析、算法、模型、实验、课题” → 优先归为 **科研项目**
4. 若含“助理、部长、委员、组织、志愿、班长、支书” → 优先归为 **学生工作**
5. 若以上均不满足或内容无关（如小说、广告、代码片段等）→ 分类为 **无关信息**
 注意：不得自行创造新类别，必须严格四选一或“无关信息”。
### 2. 生成摘要（summary）
请在不虚构信息的前提下，对原文进行提炼，输出竞争力强的简历摘要
存在时间范围时需明确写出（如“2023.06-2023.09”），必须基于原文事实，不得编造时间、公司、职位、成果、数据等信息；

若原文为能力或经验总结，概括核心能力、专业技能或应用场景；

若原文为项目或实习经历，突出工作内容、使用工具、成果成效（如“提升效率30%”“模型精度提升0.5%”等）；

若原文为奖项或荣誉，提炼奖项等级、竞争性或获得原因；

若原文为学生工作，强调组织规模、职责分工、活动成果；

语言风格简洁、专业、结果导向；

控制在2-3句话内。

### 原文内容：
${text}

### 请以 JSON 格式返回，格式如下：
{
  "category": "实习经历",
  "summary": "3年互联网运营经验，主导用户增长项目，3个月内新增用户2.3万，擅长SQL和Python数据分析"
}
不要包含任何解释、前缀、Markdown、代码块；
确保 JSON 可被直接解析，字段名小写，字符串用双引号；
如果无法确定分类，请按优先级规则选择最接近的一项，不得返回 null。
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
  const validCategories = ['学生工作', '科研项目', '实习经历', '荣誉奖励','无关信息'];

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
