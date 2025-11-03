// server/routes/resume.js
const express = require('express');
const db = require('./db');
const { generateResumeWithAI } = require('../ai');

const router = express.Router();

router.post('/generate-resume', async (req, res) => {
  const { job } = req.body;
  if (!job?.trim()) return res.status(400).json({ error: '岗位不能为空' });

  try {
    // 1. 获取 profile（取第一条，实际应关联用户）
    const [profiles] = await db.execute('SELECT * FROM profile LIMIT 1');
    if (profiles.length === 0) {
      return res.status(400).json({ error: '请先完善个人资料' });
    }

    // 2. 获取高置信度经历
    const [experiences] = await db.execute(
      'SELECT category, summary, confidence FROM experience WHERE confidence > 0.7 ORDER BY confidence DESC'
    );

    // 3. 调用 AI 生成
    const markdown = await generateResumeWithAI(job, profiles[0], experiences);

    // 4. 返回
    res.json({
      id: `resume_${Date.now()}`,
      title: `${job}简历`,
      date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      markdown
    });
  } catch (err) {
    console.error('生成失败:', err.message);
    res.status(500).json({ error: '生成失败，请重试' });
  }
});

module.exports = router;