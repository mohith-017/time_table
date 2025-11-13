// server/src/routes/auth.js

import express from 'express';
import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';
import User from '../models/User.js';
import { config } from '../config.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper function to create JWT and set the 'token' cookie.
 * This is the critical step for a successful login.
 */
function setAuthCookie(res, user) {
  // Create JWT payload with user ID and role
  const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: '1d' });
  
  const cookieOptions = {
    httpOnly: true,
    // NOTE: 'secure' MUST match your environment. In development (http://localhost:5173), config.cookieSecure is false.
    secure: config.cookieSecure, 
    sameSite: 'Lax',
    maxAge: 1000 * 60 * 60 * 24 * 1 // 1 day
  };

  res.cookie('token', token, cookieOptions);
}

/**
 * @route POST /api/auth/register (or /signup)
 * @desc Register a new user
 * @access Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, batch, section } = req.body;

    if (!name || !email || !password || !role) {
      throw createHttpError(400, 'Please provide name, email, password, and role.');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw createHttpError(400, 'User with that email already exists.');
    }

    const userFields = { name, email, password, role };

    if (role === 'STUDENT' && batch && section) {
      userFields.student = { batch, section };
    } else if (role === 'TEACHER') {
      userFields.teacher = { skills: [] }; // Initial empty teacher profile
    }

    const user = await User.create(userFields);
    
    // Log in the user immediately after registration
    setAuthCookie(res, user);
    
    // Respond with a clean user object (excluding password hash)
    res.status(201).json({ 
      user: user.toObject({ getters: true, virtuals: true, transform: (doc, ret) => { delete ret.password; return ret; } }),
      message: 'Registration successful' 
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/auth/login
 * @desc Authenticate user & set cookie
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createHttpError(400, 'Please enter email and password.');
    }

    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw createHttpError(401, 'Invalid credentials');
    }

    // 2. Compare password (uses the comparePassword method defined in your User.js model)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw createHttpError(401, 'Invalid credentials');
    }

    // 3. Set JWT in cookie for session management
    setAuthCookie(res, user);

    // 4. Respond with user info (exclude password hash)
    res.json({ 
      user: user.toObject({ getters: true, virtuals: true, transform: (doc, ret) => { delete ret.password; return ret; } })
    });

  } catch (error) {
    // Handle specific errors for login failure
    if (error.name === 'CastError' || error.name === 'ValidationError' || error.statusCode === 401) {
        return next(createHttpError(401, error.message || 'Invalid credentials'));
    }
    next(error);
  }
};

/**
 * @route GET /api/auth/me
 * @desc Get logged in user details
 * @access Private (requires the 'auth' middleware)
 */
const getMe = async (req, res, next) => {
    try {
        // req.user is set by the 'auth' middleware using the token cookie
        if (!req.user || !req.user.id) {
            throw createHttpError(401, 'Not authenticated');
        }

        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            throw createHttpError(404, 'User not found');
        }
        
        // Respond with user info
        res.json({ 
            user: user.toObject({ getters: true, virtuals: true })
        });
        
    } catch (error) {
        // If auth failed, the auth middleware already sent a 401. Catch other errors.
        next(error);
    }
};

/**
 * @route POST /api/auth/logout
 * @desc Clear cookie and log user out
 * @access Public
 */
const logout = (req, res) => {
  // Clear the cookie by setting an expired one
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // expire in 10 seconds
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};


// --- Routes definition ---

router.post('/register', register);
// Adding /signup alias as seen in AuthContext.jsx fallback logic
router.post('/signup', register); 
router.post('/login', login);
router.get('/me', auth, getMe);
router.post('/logout', logout); // Logout does not require auth middleware

export default router;