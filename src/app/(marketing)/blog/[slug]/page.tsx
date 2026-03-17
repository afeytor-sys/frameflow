import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ArrowLeft, Clock, Tag, Camera } from 'lucide-react'
import { getPostBySlug, getAllPosts } from '@/lib/blog'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map(post => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  return {
    title: `${post.title} — Fotonizer Blog`,
    description: post.excerpt,
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) notFound()

  const allPosts = getAllPosts()
  const otherPosts = allPosts.filter(p => p.slug !== slug).slice(0, 2)

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
            <Link href="/blog" className="text-[13.5px] font-medium" style={{ color: 'var(--text-muted)' }}>← Blog</Link>
            <Link href="/signup" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13.5px] font-bold text-white" style={{ background: 'var(--accent)' }}>
              Start free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── ARTICLE ── */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
          <span>/</span>
          <Link href="/blog" style={{ color: 'var(--text-muted)' }}>Blog</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{post.category}</span>
        </div>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              {post.category}
            </span>
            <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              <Clock className="w-3 h-3" /> {post.readTime} min read
            </span>
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <h1 className="font-black mb-6" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            {post.title}
          </h1>

          <p className="text-[18px] leading-relaxed" style={{ color: 'var(--text-secondary)', borderLeft: '3px solid var(--accent)', paddingLeft: '1.25rem' }}>
            {post.excerpt}
          </p>
        </header>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-10 pb-10" style={{ borderBottom: '1px solid var(--border-color)' }}>
          {post.tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
              <Tag className="w-2.5 h-2.5" />{tag}
            </span>
          ))}
        </div>

        {/* Content */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
          style={{
            fontSize: '16.5px',
            lineHeight: '1.8',
            color: 'var(--text-secondary)',
          }}
        />

        {/* Author box */}
        <div className="mt-16 p-6 rounded-2xl flex items-start gap-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent-muted)' }}>
            <Camera className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="font-bold text-[14px] mb-1">The Fotonizer Team</p>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Built by photographers, for photographers. We share what we learn running our own studios so you can spend less time on admin and more time behind the lens.
            </p>
          </div>
        </div>

        {/* Back to blog */}
        <div className="mt-10">
          <Link href="/blog" className="inline-flex items-center gap-2 text-[14px] font-semibold"
            style={{ color: 'var(--accent)' }}>
            <ArrowLeft className="w-4 h-4" /> Back to all articles
          </Link>
        </div>
      </article>

      {/* ── MORE POSTS ── */}
      {otherPosts.length > 0 && (
        <section className="py-16" style={{ background: 'var(--bg-page-2)', borderTop: '1px solid var(--border-color)' }}>
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="font-black mb-8 text-center" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}>
              More from the blog
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {otherPosts.map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="glass-card p-6 group block" style={{ textDecoration: 'none' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                      {p.category}
                    </span>
                    <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="w-3 h-3" /> {p.readTime} min read
                    </span>
                  </div>
                  <h3 className="font-bold mb-2 group-hover:text-[var(--accent)] transition-colors"
                    style={{ fontSize: '1rem', letterSpacing: '-0.01em', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                    {p.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-black mb-4" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', letterSpacing: '-0.03em' }}>
            Ready to try Fotonizer?
          </h2>
          <p className="text-[16px] mb-8" style={{ color: 'var(--text-secondary)' }}>
            Start free. No credit card required. Everything you need to run your photography business in one place.
          </p>
          <Link href="/signup" className="btn-shimmer inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-bold text-white"
            style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(196,164,124,0.35)' }}>
            Start free today <ArrowRight className="w-4 h-4" />
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
