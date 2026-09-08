// =========================================================
// MON MÉDECIN - BACKEND SERVER
// =========================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');

// ===== التطبيق =====
const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5500',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// ===== Rate Limiting =====
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ===== Database Connection =====
let pool;

async function initDatabase() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'monmedecin',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // اختبار الاتصال
    const connection = await pool.getConnection();
    console.log('✅ Database connected');
    connection.release();
    
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// ===== Database Helpers =====

function generateId(prefix) {
  return prefix + '-' + Date.now() + '-' + uuidv4().slice(0, 8).toUpperCase();
}

function getRoleRoute(role) {
  const routes = {
    admin: '/admin/dashboard',
    doctor: '/doctor/dashboard',
    secretary: '/secretary/dashboard',
    patient: '/patient/home'
  };
  return routes[role] || '/login';
}

// ===== JWT Helpers =====

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '30d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch (error) {
    return null;
  }
}

// ===== Auth Middleware =====

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'توكن غير صالح' });
    }
    
    // جلب بيانات المستخدم من قاعدة البيانات
    const [rows] = await pool.query(
      'SELECT id, role, full_name, phone, email, active FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    req.user = rows[0];
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ success: false, message: 'خطأ في المصادقة' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'لا تملك صلاحية' });
    }
    next();
  };
}

// =========================================================
// API ROUTES
// =========================================================

// ----- المصادقة (Auth) -----

/**
 * POST /api/auth/login
 * تسجيل الدخول
 */
app.post('/api/auth/login', [
  body('identifier').notEmpty().withMessage('رقم الهاتف أو البريد الإلكتروني مطلوب'),
  body('password').notEmpty().withMessage('كلمة المرور مطلوبة')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    
    const { identifier, password } = req.body;
    
    // البحث عن المستخدم
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE phone = ? OR email = ?',
      [identifier, identifier]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    const user = rows[0];
    
    // التحقق من كلمة المرور
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
    }
    
    // التحقق من نشاط الحساب
    if (!user.active) {
      return res.status(403).json({ success: false, message: 'الحساب متوقف' });
    }
    
    // تحديث آخر تسجيل دخول
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );
    
    // جلب بيانات إضافية حسب الدور
    let extraData = {};
    if (user.role === 'doctor') {
      const [doctorRows] = await pool.query(
        'SELECT * FROM doctors WHERE user_id = ?',
        [user.id]
      );
      if (doctorRows.length > 0) {
        extraData = { ...extraData, ...doctorRows[0] };
      }
    } else if (user.role === 'secretary') {
      const [secretaryRows] = await pool.query(
        'SELECT * FROM secretaries WHERE user_id = ?',
        [user.id]
      );
      if (secretaryRows.length > 0) {
        extraData = { ...extraData, ...secretaryRows[0] };
      }
    }
    
    // إنشاء التوكن
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // إزالة كلمة المرور من الاستجابة
    delete user.password_hash;
    
    const userData = { ...user, ...extraData };
    
    res.json({
      success: true,
      token,
      refreshToken,
      user: userData,
      route: getRoleRoute(user.role)
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

/**
 * POST /api/auth/register
 * تسجيل مستخدم جديد
 */
app.post('/api/auth/register', [
  body('fullName').notEmpty().withMessage('الاسم الكامل مطلوب'),
  body('phone').notEmpty().withMessage('رقم الهاتف مطلوب'),
  body('password').isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  body('role').isIn(['admin', 'doctor', 'secretary', 'patient']).withMessage('دور غير صالح')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    
    const { fullName, phone, email, password, role, gender, birthDate, wilaya, commune, address, ...extraData } = req.body;
    
    // التحقق من عدم وجود مستخدم بنفس الهاتف أو البريد
    const [existing] = await pool.query(
      'SELECT * FROM users WHERE phone = ? OR (email IS NOT NULL AND email = ?)',
      [phone, email || '']
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'المستخدم موجود مسبقاً' });
    }
    
    // تشفير كلمة المرور
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = generateId('USR');
    
    // بدء المعاملة
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // إنشاء المستخدم
      await connection.query(
        `INSERT INTO users (id, role, full_name, phone, email, password_hash, gender, birth_date, wilaya, commune, address, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, role, fullName, phone, email || null, passwordHash, gender || null, birthDate || null, wilaya || null, commune || null, address || null, true]
      );
      
      // إذا كان الطبيب، إضافة بيانات إضافية
      if (role === 'doctor') {
        await connection.query(
          `INSERT INTO doctors (user_id, specialty, specialty_id, registration_number, experience_years, clinic, approved)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, extraData.specialty || null, extraData.specialtyId || null, extraData.registrationNumber || null, extraData.experienceYears || 0, extraData.clinic || null, extraData.approved || false]
        );
      }
      
      // إذا كان سكرتير، إضافة بيانات إضافية
      if (role === 'secretary') {
        await connection.query(
          `INSERT INTO secretaries (user_id, doctor_id, permissions)
           VALUES (?, ?, ?)`,
          [userId, extraData.doctor_id || null, JSON.stringify(extraData.permissions || { appointments: true, patients: true, schedule: true })]
        );
      }
      
      await connection.commit();
      
      // جلب المستخدم الجديد
      const [userRows] = await connection.query(
        'SELECT id, role, full_name, phone, email, active FROM users WHERE id = ?',
        [userId]
      );
      
      const user = userRows[0];
      
      // إنشاء التوكن
      const token = generateToken(user);
      
      res.status(201).json({
        success: true,
        token,
        user,
        message: 'تم إنشاء الحساب بنجاح'
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء إنشاء الحساب' });
  }
});

/**
 * POST /api/auth/logout
 * تسجيل الخروج
 */
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    // في حالة JWT، لا حاجة لحذف أي شيء من الخادم
    res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

/**
 * POST /api/auth/refresh
 * تجديد التوكن
 */
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token مطلوب' });
    }
    
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Refresh token غير صالح' });
    }
    
    const [rows] = await pool.query(
      'SELECT id, role, full_name, phone, email, active FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (rows.length === 0 || !rows[0].active) {
      return res.status(401).json({ success: false, message: 'المستخدم غير موجود أو متوقف' });
    }
    
    const user = rows[0];
    const token = generateToken(user);
    
    res.json({ success: true, token });
    
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ----- المستخدمون (Users) -----

/**
 * GET /api/users
 * قائمة المستخدمين
 */
app.get('/api/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, role, full_name, phone, email, gender, active, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

/**
 * GET /api/users/:id
 * بيانات مستخدم
 */
app.get('/api/users/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // التحقق من الصلاحية (المستخدم يمكنه رؤية بياناته فقط، والإداري يمكنه رؤية الكل)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ success: false, message: 'لا تملك صلاحية' });
    }
    
    const [rows] = await pool.query(
      'SELECT id, role, full_name, phone, email, gender, birth_date, wilaya, commune, address, active, created_at, last_login FROM users WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    let user = rows[0];
    
    // جلب بيانات إضافية حسب الدور
    if (user.role === 'doctor') {
      const [doctorRows] = await pool.query(
        'SELECT * FROM doctors WHERE user_id = ?',
        [id]
      );
      if (doctorRows.length > 0) {
        user = { ...user, ...doctorRows[0] };
      }
    } else if (user.role === 'secretary') {
      const [secretaryRows] = await pool.query(
        'SELECT * FROM secretaries WHERE user_id = ?',
        [id]
      );
      if (secretaryRows.length > 0) {
        user = { ...user, ...secretaryRows[0] };
      }
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

/**
 * PUT /api/users/:id
 * تحديث مستخدم
 */
app.put('/api/users/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, email, gender, birthDate, wilaya, commune, address, active } = req.body;
    
    // التحقق من الصلاحية
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ success: false, message: 'لا تملك صلاحية' });
    }
    
    // التحقق من وجود المستخدم
    const [existing] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    // تحديث البيانات
    await pool.query(
      `UPDATE users SET 
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        gender = COALESCE(?, gender),
        birth_date = COALESCE(?, birth_date),
        wilaya = COALESCE(?, wilaya),
        commune = COALESCE(?, commune),
        address = COALESCE(?, address),
        active = COALESCE(?, active),
        updated_at = NOW()
       WHERE id = ?`,
      [fullName, phone, email, gender, birthDate, wilaya, commune, address, active, id]
    );
    
    const [rows] = await pool.query(
      'SELECT id, role, full_name, phone, email, gender, active, created_at FROM users WHERE id = ?',
      [id]
    );
    
    res.json({ success: true, data: rows[0], message: 'تم تحديث البيانات' });
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

/**
 * DELETE /api/users/:id
 * حذف مستخدم
 */
app.delete('/api/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // لا يمكن حذف المستخدم الحالي
    if (req.user.id === id) {
      return res.status(400).json({ success: false, message: 'لا يمكن حذف حسابك الحالي' });
    }
    
    const [result] = await pool.query(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    res.json({ success: true, message: 'تم حذف المستخدم' });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// =========================================================
// بدء الخادم
// =========================================================

async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
}

// ===== معالج الأخطاء العام =====
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
});

// ===== تشغيل الخادم =====
startServer();

module.exports = app;