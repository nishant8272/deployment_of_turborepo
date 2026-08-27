import React from 'react';
import Link from 'next/link';
import { ArrowRight, LayoutDashboard, Zap, Shield, Users } from 'lucide-react';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header animate-fade-in">
        <div className="logo-brand">
          <LayoutDashboard className="logo-icon" size={24} />
          Antigravity Trello
        </div>
        <div className="nav-links">
          <Link href="/login" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            Sign In
          </Link>
          <Link href="/register" className="btn-primary" style={{ padding: '0.6rem 1.2rem' }}>
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-glow"></div>
        <h1 className="hero-title animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
          Manage projects with <span className="gradient-text">gravity-defying ease.</span>
        </h1>
        <p className="hero-subtitle animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0 }}>
          A beautiful, real-time workspace for your teams. Sync instantly, organize intuitively, and get work done at the speed of thought.
        </p>
        
        <div className="hero-cta-group animate-fade-in" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <Link href="/register" className="btn-primary btn-large">
            Start for free <ArrowRight size={20} />
          </Link>
          <Link href="/login" className="btn-secondary btn-large">
            View Live Demo
          </Link>
        </div>

        {/* Floating Glassmorphism Dashboard Preview */}
        <div className="floating-dashboard animate-fade-in" style={{ animationDelay: '0.5s', opacity: 0 }}>
          <div className="mock-header">
            <div className="mock-circle red"></div>
            <div className="mock-circle yellow"></div>
            <div className="mock-circle green"></div>
            <div style={{ marginLeft: '1rem', height: '8px', width: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></div>
          </div>
          <div className="mock-body">
            <div className="mock-column">
              <div style={{ height: '14px', width: '60%', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}></div>
              <div className="mock-card"></div>
              <div className="mock-card" style={{ height: '80px' }}></div>
            </div>
            <div className="mock-column">
              <div style={{ height: '14px', width: '40%', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}></div>
              <div className="mock-card" style={{ height: '100px' }}></div>
            </div>
            <div className="mock-column">
              <div style={{ height: '14px', width: '70%', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}></div>
              <div className="mock-card"></div>
              <div className="mock-card"></div>
              <div className="mock-card"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="features-grid">
          <div className="feature-card animate-fade-in" style={{ animationDelay: '0.6s', opacity: 0 }}>
            <div className="feature-icon-wrapper">
              <Zap size={24} />
            </div>
            <h3 className="feature-title">Lightning Fast</h3>
            <p className="feature-desc">
              Built on Turborepo and Next.js App Router for instant page loads. Your workflow shouldn't be interrupted by loading spinners.
            </p>
          </div>
          
          <div className="feature-card animate-fade-in" style={{ animationDelay: '0.7s', opacity: 0 }}>
            <div className="feature-icon-wrapper">
              <Users size={24} />
            </div>
            <h3 className="feature-title">Real-time Collaboration</h3>
            <p className="feature-desc">
              Powered by secure WebSockets. See your team's changes instantly as they move cards and create lists in real-time.
            </p>
          </div>
          
          <div className="feature-card animate-fade-in" style={{ animationDelay: '0.8s', opacity: 0 }}>
            <div className="feature-icon-wrapper">
              <Shield size={24} />
            </div>
            <h3 className="feature-title">Enterprise Security</h3>
            <p className="feature-desc">
              Secure HTTP-Only JWT cookies, strict WebSocket handshakes, and robust Prisma backend validation to keep your data safe.
            </p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2026 Antigravity IDE Trello Clone. Built with Next.js, Prisma, and WebSockets.</p>
      </footer>
    </div>
  );
}
