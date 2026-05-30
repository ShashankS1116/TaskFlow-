const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

/**
 * POST /api/auth/signup
 */
async function signup(req, res, next) {
  try {
    const { email, password, name } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return sendError(res, 'Email already in use', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    return sendCreated(res, { user, accessToken, refreshToken }, 'Account created successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, 'Invalid email or password', 401);
    }

    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    const { password: _, ...userWithoutPassword } = user;

    return sendSuccess(res, {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendError(res, 'Refresh token required', 400);
    }

    const decoded = verifyToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return sendError(res, 'User not found', 401);
    }

    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = generateRefreshToken({ userId: user.id });

    return sendSuccess(res, { accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Refresh token expired, please login again', 401);
    }
    next(error);
  }
}

/**
 * GET /api/auth/me
 */
async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            ownedProjects: true,
            assignedTasks: true,
          },
        },
      },
    });

    return sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/auth/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return sendError(res, 'Current password is incorrect', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    return sendSuccess(res, {}, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}

module.exports = { signup, login, refresh, me, changePassword };
