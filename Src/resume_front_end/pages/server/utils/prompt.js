// server/utils/prompt.js
function buildResumePrompt(job, profile, experiences) {
  const expList = experiences
    .map(e => `[${e.category}] ${e.summary} (置信度: ${e.confidence?.toFixed(2) || 'N/A'})`)
    .join('\n');

  return `
你是一位专业简历顾问，请为求职岗位“${job}”生成一份中文 Markdown 简历。

## 要求：
1. **必须包含以下章节**（顺序不可变）：
   - 个人信息（格式：姓名 | 手机 | 邮箱）
   - 求职意向（直接写岗位名称）
   - 教育背景（整合学校、学历、毕业年份、GPA）
   - 专业技能（根据岗位推测 3-5 项核心技术栈）
   - 项目与经历（按子标题组织）：
        • 实习经历
        • 科研项目
        • 学生工作
        • 荣誉奖励
   - 自我评价（≤50字，贴合岗位）

2. **内容规则**：
   - 仅使用提供的 profile 和 experience 数据
   - 按岗位相关性筛选经历（如前端岗优先实习/项目）
   - 每类最多 3 条，按置信度降序
   - 语言精炼，突出成果和技能

3. **禁止**：
   - 编造未提供信息
   - 使用表格/图片/复杂格式
   - 输出解释性文字

## 用户信息：
姓名：${profile.name}
手机：${profile.phone}
邮箱：${profile.email || '未提供'}
学校：${profile.school || '未提供'}
学历：${profile.education || '未提供'}
毕业年份：${profile.graduation_year || '未提供'}
GPA：${profile.gpa ? `${profile.gpa}/4.0` : '未提供'}

## 可用经历：
${expList || '暂无经历'}

## 请直接输出 Markdown 简历：
`;
}

module.exports = { buildResumePrompt };