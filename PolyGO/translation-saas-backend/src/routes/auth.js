const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

// Enable CORS with more detailed logging
router.use((req, res, next) => {
  // Never log headers or bodies here: they contain passwords and auth tokens
  console.log('Incoming request:', { method: req.method, path: req.path });
  
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })(req, res, next);
});

// Initialize Supabase client with the correct URL and key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey
  });
  throw new Error('Missing Supabase configuration');
}

console.log('Supabase Configuration:', {
  url: supabaseUrl,
  keyLength: supabaseKey ? supabaseKey.length : 0,
  hasKey: !!supabaseKey
});

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    // Do not log the request body or headers: they contain the user's password and tokens
    console.log('Received signup request');

    const { email, password, full_name } = req.body;

    // Validate input
    if (!email || !password || !full_name) {
      console.log('Validation failed:', { email: !!email, password: !!password, full_name: !!full_name });
      return res.status(400).json({ message: 'All fields are required' });
    }

    console.log('Attempting to create user with Supabase...');
    
    // Create user with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        },
      },
    });

    console.log('Supabase signup response:', {
      hasData: !!data,
      error: signUpError,
      userData: data?.user ? {
        id: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata
      } : null
    });

    if (signUpError) {
      console.error('Signup error:', signUpError);
      return res.status(400).json({ 
        message: signUpError.message,
        code: signUpError.code || 'unknown'
      });
    }

    if (!data?.user) {
      console.error('No user data returned from Supabase');
      return res.status(400).json({ message: 'No user data returned' });
    }

    const response = {
      message: 'Account created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata.full_name,
      },
    };

    console.log('Sending success response:', response);

    // Return success response
    return res.status(201).json(response);
  } catch (error) {
    console.error('Server error during signup:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      type: error.name
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Sign in with Supabase Auth
    const { data: { user, session }, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return res.status(401).json({ message: signInError.message });
    }

    // Return success response with user data
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata.full_name,
      },
      session,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router; 