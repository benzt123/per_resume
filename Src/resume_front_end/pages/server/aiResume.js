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

module.exports = { generateResumeWithAI };