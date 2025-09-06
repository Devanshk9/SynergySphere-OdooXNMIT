import React, { useState } from 'react'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Login attempt:', formData)
    // TODO: Add API call to backend for authentication
  }

  return (
    <div className="container">
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">Welcome Back</h2>
          <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#e3f2fd', opacity: 0.8 }}>
            Sign in to your SynergySphere account
          </p>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full-width">
              Sign In
            </button>
          </form>
          <div className="auth-footer">
            <p>Don't have an account? <a href="/register">Create one here</a></p>
            <p style={{ marginTop: '0.5rem' }}><a href="/forgot-password">Forgot your password?</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
