'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link as LinkIcon, 
  Share2, 
  ShoppingBag, 
  Wallet, 
  BarChart2, 
  Palette, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  Award, 
  TrendingUp, 
  MessageSquare,
  X 
} from 'lucide-react';
import './AffiliatePage.css';

export default function AffiliatePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [channel1, setChannel1] = useState('');
  const [channel2, setChannel2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenModal = (e) => {
    e.preventDefault();
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/affiliate/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          channelLink1: channel1,
          channelLink2: channel2 || null,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error('Server returned an invalid response. Please check your API route path.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application.');
      }

      alert("Application submitted successfully! We will review your channels and get back to you soon.");
      setIsModalOpen(false);
      setEmail('');
      setChannel1('');
      setChannel2('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="affiliate-page">
      
      {/* Asymmetric Hero Section */}
      <section className="affiliate-hero-section">
        <div className="hero-asymmetric-wrapper">
          
          <motion.div 
            className="hero-image-box"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <img src="/assets/shoe-8.jpg" alt="Step & Styl Affiliate" />
          </motion.div>

          <motion.div 
            className="hero-purple-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="hero-badge">Partner Program</span>
            <h1 className="hero-title">Earn With Step & Styl</h1>
            <p className="hero-subtitle">
              Your Official Guide to Earning with Pakistan's #1 Premium Footwear Store. Turn your audience into a steady income source.
            </p>
            
            <div className="hero-cta-row">
              <button onClick={handleOpenModal} className="btn-apply-now">Apply Now</button>
              <div className="commission-highlight">
                <span className="highlight-label">Up To</span>
                <span className="highlight-value">18% Commission</span>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Welcome Section (Solid Black Theme) */}
      <section className="affiliate-section welcome-section-black">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="section-tag-purple">Welcome to the Family</span>
            <h2 className="section-main-title-white">We Are Excited To Have You</h2>
            <p className="section-desc-light">
              This program is designed to help you earn easily by promoting high-quality footwear and accessories in Pakistan. Whether you are an influencer, content creator, fashion expert, or just someone who loves sharing good products — this affiliate program can help you turn your audience into a steady income source.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Section 01: Program Overview */}
      <section className="affiliate-section overview-section">
        <div className="container">
          <div className="section-header-left">
            <span className="section-number">SECTION 01</span>
            <h2>Program Overview</h2>
            <p>Our affiliate program allows you to earn commission for every verified sale you refer using your unique affiliate link or discount coupon.</p>
          </div>

          <div className="tiers-grid">
            <motion.div className="tier-card" whileHover={{ y: -4 }} transition={{ duration: 0.3 }}>
              <span className="tier-badge-top">Tier 01</span>
              <h3>Standard Affiliate</h3>
              <div className="tier-percent">10%</div>
              <p className="tier-target">For all new affiliates starting their journey with our catalog.</p>
            </motion.div>
            
            <motion.div className="tier-card-image" whileHover={{ y: -4 }} transition={{ duration: 0.3 }}>
              <img src="/assets/women-mustardshoes.jpeg" alt="Standard Affiliate" />
            </motion.div>

            <motion.div className="tier-card-image" whileHover={{ y: -4 }} transition={{ duration: 0.3 }}>
              <img src="/assets/affiliate.jpg" alt="Content Creators" />
            </motion.div>

            <motion.div className="tier-card featured" whileHover={{ y: -4 }} transition={{ duration: 0.3 }}>
              <span className="tier-badge-top" style={{ backgroundColor: '#9b4de0', color: '#FFFFFF' }}>Popular</span>
              <h3>Content Creators</h3>
              <div className="tier-percent">12–15%</div>
              <p className="tier-target">Influencers, fashion pages, and TikTok reviewers sharing high-engagement reels.</p>
            </motion.div>
          </div>

          <motion.div 
            className="quick-stats-row"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="stat-box">
              <span className="stat-label">Cookie Duration</span>
              <span className="stat-val">30 Days</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Payment Frequency</span>
              <span className="stat-val">Monthly</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Minimum Payout</span>
              <span className="stat-val">PKR 3,000</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 02: How You Earn */}
      <section className="affiliate-section steps-section dark-section">
        <div className="container">
          <div className="section-header-center">
            <span className="section-number">SECTION 02</span>
            <h2 className="section-title-white">How You Earn</h2>
          </div>

          <div className="steps-grid">
            {[
              { icon: <LinkIcon size={24} />, num: "01", title: "Link & Coupon", desc: "You will receive a unique affiliate link and a personal coupon code (e.g., BEAUTYBYASMA10)." },
              { icon: <Share2 size={24} />, num: "02", title: "Share", desc: "Promote your link or coupon on Instagram Stories, TikTok Reviews, YouTube, WhatsApp Broadcasts, and blogs." },
              { icon: <ShoppingBag size={24} />, num: "03", title: "Customer Buys", desc: "When someone purchases using your link or coupon, commission is instantly attributed to you." },
              { icon: <Wallet size={24} />, num: "04", title: "Monthly Payout", desc: "Earnings paid every month via JazzCash, Easypaisa, Bank Transfer, or Payoneer." }
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                className="step-card dark-card"
                whileHover={{ y: -8, backgroundColor: "#1A1A1A" }}
                transition={{ duration: 0.3 }}
              >
                <div className="step-icon">{step.icon}</div>
                <span className="step-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 03: What You Get */}
      <section className="affiliate-section benefits-section">
        <div className="container">
          <div className="section-header-left">
            <span className="section-number">SECTION 03</span>
            <h2>What You Get</h2>
          </div>

          <div className="benefits-grid">
            {[
              { icon: <BarChart2 size={28} />, title: "Personal Dashboard", desc: "Track clicks, sales, payouts, and coupon performance in real-time." },
              { icon: <Palette size={28} />, title: "Marketing Material Pack", desc: "Before/after pictures, product images, video clips, captions, hashtags, and promotional graphics." },
              { icon: <GraduationCap size={28} />, title: "Creator Guidance", desc: "Weekly tips on viral videos, posting schedules, and best-performing footwear content." }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                className="benefit-card"
                whileHover={{ y: -8, borderColor: "#9b4de0" }}
                transition={{ duration: 0.3 }}
              >
                <div className="benefit-icon-box">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 04: Content Guidelines */}
      <section className="affiliate-section content-guide-section dark-section">
        <div className="container">
          <div className="section-header-center">
            <span className="section-number">SECTION 04</span>
            <h2 className="section-title-white">Content Guidelines</h2>
            <p className="section-sub-light">Content That Converts</p>
          </div>

          <div className="converts-grid">
            {["Unboxing videos", "Before/After comparison", "Footwear styling clips", "\"Honest review\" videos", "15–30s TikTok-style reels", "WhatsApp broadcasts"].map((pill, idx) => (
              <motion.div 
                key={idx}
                className="convert-pill"
                whileHover={{ scale: 1.05, backgroundColor: "#9b4de0", color: "#FFFFFF" }}
                transition={{ duration: 0.2 }}
              >
                {pill}
              </motion.div>
            ))}
          </div>

          <motion.div 
            className="rules-box-wrapper"
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3>Good Content Rules</h3>
            <div className="rules-checks">
              {["Clean background", "Real result-oriented videos", "Clear demonstration", "Speak naturally", "Add subtitles", "Use recommended hashtags"].map((rule, idx) => (
                <span key={idx}><CheckCircle2 size={18} /> {rule}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 05: Program Rules */}
      <section className="affiliate-section rules-section">
        <div className="container">
          <div className="section-header-left">
            <span className="section-number">SECTION 05</span>
            <h2>Program Rules</h2>
            <p>These rules protect your earnings and maintain program quality.</p>
          </div>

          <div className="rules-split">
            <motion.div 
              className="rule-column not-allowed"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <h3><XCircle size={20} /> Not Allowed</h3>
              <ul>
                <li>Fake or self-orders</li>
                <li>Misleading claims</li>
                <li>Running paid Google ads on Step & Styl brand keywords</li>
                <li>Using copyrighted images not provided by us</li>
                <li>Abusive or false medical claims</li>
                <li>Creating multiple accounts or sharing private data</li>
              </ul>
            </motion.div>

            <motion.div 
              className="rule-column allowed"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <h3><CheckCircle2 size={20} /> Allowed</h3>
              <ul>
                <li>Posting on social media platforms</li>
                <li>Using WhatsApp broadcasts/lists</li>
                <li>Making honest review videos</li>
                <li>Creating tutorials and styling reels</li>
                <li>Adding your coupon to your stories</li>
                <li>Promoting through friends/family</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 06: Payout Policy */}
      <section className="affiliate-section payout-section">
        <div className="container">
          <div className="section-header-center">
            <span className="section-number">SECTION 06</span>
            <h2>Payout Policy</h2>
          </div>

          <div className="payout-grid">
            {[
              { title: "Payout Methods", desc: "Choose any convenient option:", tags: ["Bank Transfer", "JazzCash", "Easypaisa", "Payoneer"] },
              { title: "Payout Cycle", list: ["Payment issued on 10th of every month", "Minimum payout = PKR 3,000", "Refunded or cancelled orders reversed"] },
              { title: "Real-Time Reporting", list: ["Approved & pending earnings", "Completed payouts history", "Sale-by-sale breakdown"] }
            ].map((box, idx) => (
              <motion.div 
                key={idx}
                className="payout-card"
                whileHover={{ y: -5, borderColor: "#9b4de0" }}
                transition={{ duration: 0.3 }}
              >
                <h3>{box.title}</h3>
                {box.desc && <p>{box.desc}</p>}
                {box.tags && (
                  <div className="methods-tags">
                    {box.tags.map((tag, i) => <span key={i}>{tag}</span>)}
                  </div>
                )}
                {box.list && (
                  <ul className="check-list">
                    {box.list.map((li, i) => <li key={i}>{li}</li>)}
                  </ul>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 07: Support & Community */}
      <section className="affiliate-section support-section">
        <div className="container">
          <div className="section-header-left">
            <span className="section-number">SECTION 07</span>
            <h2>Support & Community</h2>
          </div>

          <div className="support-grid">
            <motion.div 
              className="support-card"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <h3>You Will Receive</h3>
              <ul>
                <li><MessageSquare size={16} /> 24/7 WhatsApp creator support</li>
                <li><TrendingUp size={16} /> Tips to maximize your earnings</li>
                <li><CheckCircle2 size={16} /> Updates on top-performing posts</li>
                <li><CheckCircle2 size={16} /> Fresh marketing material drops</li>
                <li><CheckCircle2 size={16} /> Exclusive product testing opportunities</li>
              </ul>
            </motion.div>

            <motion.div 
              className="support-card highlight-card" 
              id="apply"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <h3>We Also Run</h3>
              <div className="award-badge"><Award size={32} /></div>
              <h4>Monthly Leaderboards & Top Affiliate Award</h4>
              <p className="winner-perk">Winner Gets: <strong>A FREE pair of shoes or cash bonus!</strong></p>
              <button onClick={handleOpenModal} className="btn-apply-cta">Join Affiliate Program</button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 08: Tips To Win */}
      <section className="affiliate-section tips-section">
        <div className="container">
          <div className="section-header-center">
            <span className="section-number">SECTION 08</span>
            <h2>Tips To Win</h2>
          </div>

          <div className="tips-grid">
            {[
              "Show your face in videos → converts up to 200% more.",
              "Display your personal coupon code clearly in all stories.",
              "Post consistently (aim for 3–4 reels per week).",
              "Highlight real quality, comfort, and styling details.",
              "Promote heavy during peak periods: Weekends, Salary Days (1–5), and Mega Sales (11.11, Eid, Ramadan).",
              "Cross-post across Instagram, TikTok, WhatsApp, Facebook groups, and Snapchat."
            ].map((tip, idx) => (
              <motion.div 
                key={idx}
                className="tip-card"
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ duration: 0.25 }}
              >
                <span className="tip-num">0{idx + 1}</span>
                <p>{tip}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AFFILIATE APPLICATION POPUP MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="affiliate-modal-overlay" onClick={() => setIsModalOpen(false)}>
            <motion.div 
              className="affiliate-modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <button className="affiliate-modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>

              <h2>Step & Styl</h2>
              <h3>Apply for Affiliate</h3>

              {error && <div className="checkout-alert-error" style={{ color: 'red', marginBottom: '10px', fontSize: '14px' }}>{error}</div>}

              <form onSubmit={handleSubmitApplication} className="affiliate-form">
                <div className="form-group">
                  <label>Email Address *</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Channel Link 1 (Mandatory) *</label>
                  <span className="form-hint">Instagram, TikTok, YouTube, or other channel</span>
                  <input 
                    type="url" 
                    required 
                    placeholder="https://instagram.com/yourhandle" 
                    value={channel1}
                    onChange={(e) => setChannel1(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Channel Link 2 (Optional)</label>
                  <input 
                    type="url" 
                    placeholder="https://tiktok.com/@yourhandle" 
                    value={channel2}
                    onChange={(e) => setChannel2(e.target.value)}
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-submit-app" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </button>
                  <button type="button" className="btn-cancel-app" onClick={() => setIsModalOpen(false)}>Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}