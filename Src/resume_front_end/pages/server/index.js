const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const pool = require('./db'); // 引入数据库连接池
const { extractText } = require('./extractor');
const { analyzeWithQwen } = require('./ai');



const app = express();
// CORS 配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

//统一静态文件服务
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 根据上传类型选择子目录
    let subDir = '';
    if (req.originalUrl.includes('/api/ai/classify')) {
      subDir = 'ai_files';
    } else if (req.originalUrl.includes('/api/upload/avatar')) {
      subDir = 'avatars';
    }
    
    const targetDir = path.join(uploadsDir, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    
    // 根据类型设置文件名前缀
    let prefix = 'file';
    if (req.originalUrl.includes('/api/upload/avatar')) {
      prefix = 'avatar';
    } else if (req.originalUrl.includes('/api/ai/classify')) {
      prefix = 'ai';
    }
    
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // 头像上传只允许图片
    if (req.originalUrl.includes('/api/upload/avatar')) {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('只允许上传图片文件'), false);
      }
    } else {
      cb(null, true); // 其他上传允许所有文件类型
    }
  }
});


// API 接口：AI 分析文件（兼容单条或多条）
app.post('/api/ai/classify', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
  }
    console.log('AI分析文件信息:', {
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size
  });
  let connection;
  try {
    const filePath = req.file.path;
    const text = await extractText(filePath, req.file.originalname);

    if (!text || text.length === 0) {
      return res.status(400).json({ error: '无法提取内容' });
    }

    // analyzeWithQwen 目前返回：{ category, summary, confidence }
    const result = await analyzeWithQwen(text);

    // 统一成数组，兼容未来可能返回 { experiences: [...] }
    const items = Array.isArray(result?.experiences) ? result.experiences : [result];

    // 过滤/清洗一遍
    const cleaned = items
      .filter(Boolean)
      .map(x => ({
        category: x.category,
        summary: x.summary,
        confidence: (typeof x.confidence === 'number' ? x.confidence : null)
      }))
      .filter(x => x.category && x.summary);

    if (cleaned.length === 0) {
      return res.status(400).json({ error: 'AI 未产出有效经历' });
    }

    // 这里当只有1条时，直接返回“单对象”
    // 多条时再返回 { experiences: [...] }
    res.json({
      success: true,
      message: `成功导入 ${cleaned.length} 条经历`,
      data: cleaned.length === 1 ? cleaned[0] : { experiences: cleaned }
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('AI 分析失败 (server):', err);
    res.status(500).json({ error: '处理失败', details: err.message });
  } finally {
    if (connection) connection.release();
  }
});


// 测试接口
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: '后端服务正常运行',
    timestamp: new Date().toISOString()
  });
});

// 头像上传接口
app.post('/api/upload/avatar', upload.single('avatar'), async (req, res) => {
  console.log('收到头像上传请求');
  
  try {
    if (!req.file) {
      console.log('没有收到文件');
      return res.status(400).json({ 
        success: false, 
        error: '未选择文件' 
      });
    }

    console.log('文件信息:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // 构建可访问的URL路径
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    console.log('头像上传成功，URL:', avatarUrl);

    res.json({
      success: true,
      message: '头像上传成功',
      url: avatarUrl,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('头像上传处理失败:', error);
    res.status(500).json({ 
      success: false,
      error: '上传失败: ' + error.message 
    });
  }
});

// 保存用户信息接口 - 根据新表结构修改
app.post('/api/profile/save', async (req, res) => {
  console.log('收到保存请求:', JSON.stringify(req.body, null, 2));
  
  const {
    avatar, name, gender, birthday, political_status,
    education, graduation_year, school, gpa,
    phone, email, address, intro
  } = req.body;

  // 验证必要字段
  if (!name || !phone) {
    console.log('验证失败: 缺少必要字段');
    return res.status(400).json({ 
      success: false,
      error: '姓名和手机号为必填项' 
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    console.log('数据库连接成功');
    
    await connection.beginTransaction();
    console.log('事务开始');

    // 处理数据格式
    const gpaValue = gpa ? parseFloat(gpa) : null;
    const gradYear = graduation_year ? parseInt(graduation_year) : null;

    // 查询是否存在记录（基于手机号）
    const [existing] = await connection.execute(
      'SELECT id, avatar FROM profile WHERE phone = ?',
      [phone]
    );

    if (existing.length > 0) {
      // 更新记录
      console.log('更新现有用户记录，用户ID:', existing[0].id);
      
      // 删除旧头像文件（如果头像有变更且旧头像存在）
      if (avatar && avatar !== existing[0].avatar && existing[0].avatar) {
        const oldAvatarPath = path.join(__dirname, '../public', existing[0].avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
          console.log('删除旧头像:', oldAvatarPath);
        }
      }

      await connection.execute(
        `UPDATE profile SET
          avatar = ?, name = ?, gender = ?, birthday = ?, political_status = ?,
          education = ?, graduation_year = ?, school = ?, gpa = ?,
          email = ?, address = ?, intro = ?, updated_at = CURRENT_TIMESTAMP
        WHERE phone = ?`,
        [
          avatar, name, gender, birthday || null, political_status,
          education, gradYear, school, gpaValue,
          email, address, intro, phone
        ]
      );
      
      console.log('用户信息更新成功');

    } else {
      // 插入新记录
      console.log('创建新用户记录');
      await connection.execute(
        `INSERT INTO profile
          (avatar, name, gender, birthday, political_status,
           education, graduation_year, school, gpa,
           phone, email, address, intro)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          avatar, name, gender, birthday || null, political_status,
          education, gradYear, school, gpaValue,
          phone, email, address, intro
        ]
      );
      
      console.log('新用户信息插入成功');
    }

    await connection.commit();
    console.log('事务提交成功');
    
    res.json({ 
      success: true, 
      message: '保存成功' 
    });

  } catch (err) {
    console.error('数据库操作失败:', err);
    console.error('错误堆栈:', err.stack);
    
    if (connection) {
      await connection.rollback();
      console.log('事务回滚');
    }
    
    // 处理唯一约束冲突
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ 
        success: false,
        error: '手机号已存在，请使用其他手机号' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: '保存失败，请重试: ' + err.message 
      });
    }
  } finally {
    if (connection) {
      connection.release();
      console.log('数据库连接释放');
    }
  }
});

// 获取用户信息接口 - 根据新表结构修改
app.get('/api/profile', async (req, res) => {
  console.log('收到获取用户信息请求');
  
  try {
    const [rows] = await pool.execute(`
      SELECT 
        id, avatar, name, gender, birthday, political_status,
        education, graduation_year, school, gpa,
        phone, email, address, intro, created_at, updated_at
      FROM profile 
      ORDER BY id DESC LIMIT 1
    `);

    console.log('查询到记录数:', rows.length);

    if (rows.length > 0) {
      const profile = rows[0];
      
      // 格式化日期
      if (profile.birthday) {
        profile.birthday = profile.birthday.toISOString().split('T')[0];
      }
      
      // 处理毕业年份（确保是数字）
      if (profile.graduation_year) {
        profile.graduation_year = profile.graduation_year.toString();
      }
      
      // 处理 GPA（确保是数字）
      if (profile.gpa) {
        profile.gpa = profile.gpa.toString();
      }
      
      // 构建完整的头像URL
      if (profile.avatar) {
        profile.avatar = `http://localhost:3000${profile.avatar}`;
      }
      
      // 处理空值，确保前端显示正常
      const fields = ['name', 'gender', 'political_status', 'education', 'school', 'phone', 'email', 'address', 'intro'];
      fields.forEach(field => {
        if (profile[field] === null) {
          profile[field] = '';
        }
      });
      
      console.log('返回用户信息:', {
        id: profile.id,
        name: profile.name,
        phone: profile.phone,
        hasAvatar: !!profile.avatar
      });
      
      res.json(profile);
    } else {
      console.log('无用户记录，返回空数据');
      res.json({
        avatar: null, 
        name: '', 
        gender: '', 
        birthday: '',
        political_status: '', 
        education: '', 
        graduation_year: null,
        school: '', 
        gpa: null, 
        phone: '', 
        email: '', 
        address: '', 
        intro: ''
      });
    }
  } catch (err) {
    console.error('查询用户信息失败:', err);
    console.error('错误堆栈:', err.stack);
    res.status(500).json({ 
      success: false,
      error: '查询失败: ' + err.message 
    });
  }
});

// 获取所有用户列表（调试用）
app.get('/api/profiles', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, name, phone, avatar, created_at 
      FROM profile 
      ORDER BY id DESC
    `);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (err) {
    console.error('查询用户列表失败:', err);
    res.status(500).json({ 
      success: false,
      error: '查询失败' 
    });
  }
});


// api/experiences/add  手动添加一条经历,add.vue板块
app.post('/api/experience/add', async (req, res) => {
  const { category, summary, confidence } = req.body;
  if (!category || !summary) {
    return res.status(400).json({ error: '分类和描述为必填项' });
  }

  try {
   await pool.execute(
         `INSERT INTO experience (category, summary, confidence)
          VALUES (?, ?, ?)`,
         [category, summary, (confidence === undefined || confidence === '' ? null : Number(confidence))]
       );
    res.json({ success: true, message: '经历添加成功' });
  } catch (err) {
    console.error('添加经历失败:', err);
    res.status(500).json({ error: '保存失败' });
  }
});
// 更新一条经历
app.put('/api/experience/update', async (req, res) => {
  const { id, category, summary, confidence } = req.body;
  if (!id) return res.status(400).json({ error: '缺少ID' });

  try {
    await pool.execute(
      `UPDATE experience 
       SET category = ?, summary = ?, confidence = ?, updated_time = NOW()
       WHERE id = ?`,
      [category, summary, (confidence === undefined || confidence === '' ? null : Number(confidence)), id]
    );
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    console.error('更新经历失败:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// 获取单条经历（用于编辑）
app.get('/api/experience/detail', async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: '缺少ID' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, category, summary, confidence, created_time, updated_time FROM experience WHERE id = ?',
      [id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error('查询失败:', err);
    res.status(500).json({ error: '查询失败' });
  }
});

// 获取所有经历,供主页面展示）
app.get('/api/experience/list', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, category, summary, confidence, created_time, updated_time FROM experience ORDER BY updated_time DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('获取经历列表失败:', err);
    res.status(500).json({ error: '查询失败' });
  }
});

// ===== 新增：一键生成简历 API =====
const { generateResumeWithAI } = require('./aiResume');

app.post('/api/generate-resume', async (req, res) => {
  const { job } = req.body;
  if (!job?.trim()) {
    return res.status(400).json({ error: '岗位名称不能为空' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // 1. 获取用户 profile（取最新一条）
    const [profileRows] = await connection.execute(
      'SELECT name, phone, email, school, education, graduation_year, gpa FROM profile ORDER BY id DESC LIMIT 1'
    );
    if (profileRows.length === 0) {
      return res.status(400).json({ error: '请先完善个人基本信息' });
    }
    const profile = profileRows[0];

    // 2. 获取高置信度经历
    const [expRows] = await connection.execute(
      'SELECT category, summary, confidence FROM experience WHERE confidence > 0.7 ORDER BY confidence DESC'
    );

    // 3. 调用 AI 生成完整简历
    const markdown = await generateResumeWithAI(job, profile, expRows);

    // 4. 返回结果
    res.json({
      id: `resume_${Date.now()}`,
      title: `${job}简历`,
      date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      markdown
    });

  } catch (err) {
    console.error('生成简历失败:', err);
    res.status(500).json({ error: err.message || '生成失败，请重试' });
  } finally {
    if (connection) connection.release();
  }
});
// ===== 新增结束 =====

// 删除一条经历
app.delete('/api/experience/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: '缺少ID' });
  }

  try {
    const [result] = await pool.execute(
      'DELETE FROM experience WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('删除经历失败:', err);
    res.status(500).json({ error: '删除失败' });
  }
});


// 调试中间件：打印所有请求
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 修复：正确的 404 处理（放在所有路由之后）
app.use((req, res) => {
  console.log(`接口不存在: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false,
    error: `接口不存在: ${req.method} ${req.originalUrl}` 
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error(' 服务器错误:', error);
  res.status(500).json({ 
    success: false,
    error: '服务器内部错误: ' + error.message 
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`AI 后端服务已启动：http://localhost:${PORT}`);
  console.log(`头像存储路径: ${path.join(__dirname, '../public/uploads/avatars')}`);
});