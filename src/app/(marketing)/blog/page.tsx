import Link from 'next/link'
import { ArrowRight, Clock, Tag, Camera } from 'lucide-react'
import { getAllPosts } from '@/lib/blog'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog — Fotonizer | Photography Business Tips & Guides',
  description: 'Photography business tips, workflow guides, software comparisons and insights for professional photographers. Written by photographers, for photographers.',
  keywords: [
    'photography business tips',
    'photographer workflow',
    'photography studio management',
    'photography software comparison',
    'client portal for photographers',
    'photography business guide',
  ],
  openGraph: {
    title: 'Blog — Fotonizer | Photography Business Tips & Guides',
    description: 'Photography business tips, workflow guides, and software comparisons. Written by photographers, for photographers.',
    type: 'website',
  },
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div style={{ background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh' }}>

      {/* ── NAVBAR ── */}
      <nav style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M4 14V7.5L10 4L16 7.5V14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.5 14V10.5H12.5V14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Fotonizer</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[13.5px] font-medium" style={{ color: 'var(--text-muted)' }}>← Home</Link>
            <Link href="/signup" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13.5px] font-bold text-white" style={{ background: 'var(--accent)' }}>
              Start free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(196,164,124,0.10) 0%, transparent 70%)' }} />
        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-bold mb-6"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.2)' }}>
            <Camera className="w-3 h-3" /> Photography Business Blog
          </div>
          <h1 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Tips, guides & insights<br />
            <span className="text-gradient-gold">for photographers who mean business.</span>
          </h1>
          <p className="text-[17px] leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Written by photographers, for photographers. No fluff — just practical advice to help you run a better studio.
          </p>
        </div>
      </section>

      {/* ── POSTS GRID ── */}
      <section className="pb-24">
        <div className="max-w-5xl mx-auto px-6">
          {posts.length === 0 ? (
            <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
              <p className="text-[16px]">No posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {posts.map((post, i) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="glass-card p-7 group block"
                  style={{ textDecoration: 'none' }}
                >
                  {/* Category + Read time */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                      {post.category}
                    </span>
                    <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="w-3 h-3" /> {post.readTime} min read
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="font-black mb-3 group-hover:text-[var(--accent)] transition-colors"
                    style={{ fontSize: 'clamp(1.1rem, 2vw, 1.3rem)', letterSpacing: '-0.02em', lineHeight: 1.3, color: 'var(--text-primary)' }}>
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-[14px] leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
                    {post.excerpt}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {post.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                        <Tag className="w-2.5 h-2.5" />{tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1 text-[13px] font-semibold group-hover:gap-2 transition-all"
                      style={{ color: 'var(--accent)' }}>
                      Read article <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-black mb-4" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', letterSpacing: '-0.03em' }}>
            Ready to simplify your studio?
          </h2>
          <p className="text-[16px] mb-8" style={{ color: 'var(--text-secondary)' }}>
            Join photographers who manage their entire business with Fotonizer.
          </p>
          <Link href="/signup" className="btn-shimmer inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-bold text-white"
            style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(196,164,124,0.35)' }}>
            Start free — no credit card required <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <Camera className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            </div>
            <span className="font-bold text-[14px]" style={{ letterSpacing: '-0.02em' }}>Fotonizer</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <Link href="/blog" className="text-[13px]" style={{ color: 'var(--accent)' }}>Blog</Link>
            <Link href="/signup" className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Sign up</Link>
            <Link href="/login" className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Sign in</Link>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Fotonizer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
