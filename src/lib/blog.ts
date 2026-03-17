export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  date: string
  category: string
  readTime: number
  tags: string[]
  content: string
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'fotonizer-vs-pixieset-honeybook-studio-ninja',
    title: 'Fotonizer vs Pixieset, HoneyBook & Studio Ninja: Why Built by a Photographer Makes All the Difference',
    excerpt: 'We compared the top photography business tools on the market. Here\'s why Fotonizer stands out — and why "built by a photographer" is more than just a tagline.',
    date: '2026-03-17',
    category: 'Comparisons',
    readTime: 8,
    tags: [
      'photography business software',
      'best CRM for photographers',
      'Pixieset alternative',
      'HoneyBook alternative',
      'Studio Ninja alternative',
      'photography studio management',
      'client portal for photographers',
      'photography workflow tools',
      'online gallery software',
      'photography contracts online',
    ],
    content: `
<h2>The Photography Software Landscape in 2026</h2>
<p>If you've been running a photography business for more than a year, you've probably tried at least two or three different tools to manage your workflow. Pixieset for galleries. HoneyBook or Studio Ninja for contracts and CRM. Maybe a separate invoicing tool. And a calendar app on top of that.</p>
<p>The result? You're paying for four subscriptions, switching between tabs all day, and spending more time managing software than actually photographing.</p>
<p>We built Fotonizer because we lived that exact problem. And we want to be transparent about how we compare to the tools you're probably already using.</p>

<h2>The Honest Comparison</h2>

<h3>Pixieset</h3>
<p>Pixieset is one of the most popular gallery delivery platforms for photographers — and for good reason. The galleries look beautiful, clients love them, and the interface is clean.</p>
<p><strong>Where it falls short:</strong> Pixieset is a gallery tool, not a studio management platform. You still need separate tools for contracts, invoicing, client communication, and booking management. Their CRM features feel bolted on rather than built in. And the pricing adds up quickly once you need more storage or advanced features.</p>
<p><strong>What Fotonizer does differently:</strong> Galleries are just one part of the picture. Every project in Fotonizer comes with a client portal that includes the gallery, contract, timeline, meeting point, moodboard, and direct messaging — all in one link you send to your client.</p>

<h3>HoneyBook</h3>
<p>HoneyBook is a powerful all-in-one platform popular with creative entrepreneurs. It handles contracts, invoices, proposals, and client communication well.</p>
<p><strong>Where it falls short:</strong> HoneyBook was built for creative businesses in general — not specifically for photographers. The interface can feel overwhelming, and features like gallery delivery are either missing or require third-party integrations. The mobile experience is functional but not optimized for photographers who are constantly on the go. Pricing starts at $19/month but quickly climbs to $39/month for the features most photographers actually need.</p>
<p><strong>What Fotonizer does differently:</strong> Every feature in Fotonizer was designed with photographers in mind. The mobile experience is first-class — not an afterthought. You can manage your entire studio from your phone between shoots.</p>

<h3>Studio Ninja</h3>
<p>Studio Ninja is a well-loved CRM built specifically for photographers, particularly popular in Australia and the UK. It handles bookings, contracts, invoices, and questionnaires cleanly.</p>
<p><strong>Where it falls short:</strong> Studio Ninja's design feels dated compared to modern tools. The client-facing experience — what your clients actually see — doesn't match the premium experience most photographers want to deliver. Gallery delivery is not included. And the platform hasn't evolved as quickly as the industry has.</p>
<p><strong>What Fotonizer does differently:</strong> The client portal your clients see is as carefully designed as the dashboard you use. First impressions matter. When a client opens their portal and sees a beautifully designed space with their gallery, contract, and timeline — that's a premium experience that builds trust and referrals.</p>

<h2>The Feature Breakdown</h2>

<div class="comparison-table">
  <table>
    <thead>
      <tr>
        <th>Feature</th>
        <th>Fotonizer</th>
        <th>Pixieset</th>
        <th>HoneyBook</th>
        <th>Studio Ninja</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Photo Galleries</td>
        <td>✅ Included</td>
        <td>✅ Core feature</td>
        <td>❌ Not included</td>
        <td>❌ Not included</td>
      </tr>
      <tr>
        <td>Digital Contracts</td>
        <td>✅ Included</td>
        <td>❌ Not included</td>
        <td>✅ Included</td>
        <td>✅ Included</td>
      </tr>
      <tr>
        <td>Client Portal</td>
        <td>✅ Full portal</td>
        <td>⚠️ Basic</td>
        <td>⚠️ Basic</td>
        <td>⚠️ Basic</td>
      </tr>
      <tr>
        <td>Invoicing</td>
        <td>✅ Included</td>
        <td>⚠️ Add-on</td>
        <td>✅ Included</td>
        <td>✅ Included</td>
      </tr>
      <tr>
        <td>Analytics & Revenue</td>
        <td>✅ Included</td>
        <td>❌ Not included</td>
        <td>⚠️ Basic</td>
        <td>⚠️ Basic</td>
      </tr>
      <tr>
        <td>Mobile-Optimized</td>
        <td>✅ First-class</td>
        <td>⚠️ Partial</td>
        <td>⚠️ Partial</td>
        <td>⚠️ Partial</td>
      </tr>
      <tr>
        <td>Questionnaires</td>
        <td>✅ Included</td>
        <td>❌ Not included</td>
        <td>✅ Included</td>
        <td>✅ Included</td>
      </tr>
      <tr>
        <td>Moodboard</td>
        <td>✅ Included</td>
        <td>❌ Not included</td>
        <td>❌ Not included</td>
        <td>❌ Not included</td>
      </tr>
      <tr>
        <td>Timeline Builder</td>
        <td>✅ Included</td>
        <td>❌ Not included</td>
        <td>❌ Not included</td>
        <td>❌ Not included</td>
      </tr>
      <tr>
        <td>Built for photographers</td>
        <td>✅ 100%</td>
        <td>✅ Yes</td>
        <td>❌ General</td>
        <td>✅ Yes</td>
      </tr>
    </tbody>
  </table>
</div>

<h2>The Real Difference: Built by a Photographer, Not a Software Company</h2>
<p>Here's something that doesn't show up in feature comparison tables: <strong>who built the tool and why.</strong></p>
<p>Most photography software is built by software companies who saw a market opportunity. They hire product managers, run focus groups, and build features based on data. That's not a bad thing — but it means the product is always one step removed from the actual experience of being a photographer.</p>
<p>Fotonizer was built by a photographer who was frustrated with the existing tools. Every feature exists because it solved a real problem we faced in our own studio. The client portal looks the way it does because we wanted our own clients to have that experience. The mobile interface is first-class because we were tired of trying to manage bookings from a phone between shoots.</p>
<p>This matters more than it sounds. When you use a tool built by someone who understands your workflow, you feel it in every interaction. Things are where you expect them to be. Features work the way you'd want them to work. And when something doesn't work right, you're talking to someone who actually cares — not a support ticket system.</p>

<h2>Community Over Corporation</h2>
<p>One of the things we're most proud of at Fotonizer is the community we're building. Our users aren't just customers — they're photographers who share feedback, suggest features, and help shape the direction of the product.</p>
<p>When you join Fotonizer, you're not just buying software. You're joining a community of photographers who are serious about running their business professionally. That means:</p>
<ul>
  <li><strong>Direct feedback loop</strong> — Your feature requests actually get heard and implemented</li>
  <li><strong>Photographer-to-photographer support</strong> — Tips, workflows, and advice from people who shoot for a living</li>
  <li><strong>Transparent roadmap</strong> — You know what's coming and why</li>
  <li><strong>Fair pricing</strong> — We're not trying to extract maximum revenue from you. We want to grow together.</li>
</ul>

<h2>The Design Difference</h2>
<p>We'll be honest: design is subjective. But we believe that the tools you use every day should be beautiful, not just functional.</p>
<p>Fotonizer was designed from the ground up with a modern aesthetic that matches the quality of work photographers produce. Dark mode and light mode. Clean typography. Thoughtful spacing. A client portal that looks like it was designed by a premium studio — because it was.</p>
<p>When your client opens their portal and sees a beautifully designed space, it reinforces the premium positioning of your brand. That's not a small thing. That's the difference between a client who refers you to their friends and one who just moves on.</p>

<h2>Pricing: What You Actually Pay</h2>
<p>Let's talk about money. Here's what a typical photographer pays when using separate tools:</p>
<ul>
  <li>Pixieset Pro: ~$20/month</li>
  <li>HoneyBook or Studio Ninja: ~$29–39/month</li>
  <li>Separate invoicing tool: ~$10/month</li>
  <li><strong>Total: $59–69/month</strong> for a fragmented experience</li>
</ul>
<p>Fotonizer's Pro plan covers everything — galleries, contracts, invoicing, client portal, analytics, questionnaires, moodboards, and timeline — for a fraction of that cost. And you start free, with no credit card required.</p>

<h2>Who Should Use Fotonizer?</h2>
<p>Fotonizer is the right choice if you:</p>
<ul>
  <li>Want everything in one place instead of juggling multiple subscriptions</li>
  <li>Care about the experience your clients have, not just the tools you use</li>
  <li>Shoot on the go and need a mobile-first platform</li>
  <li>Want to support a product built by photographers, not a VC-backed software company</li>
  <li>Are tired of paying for features you don't need while missing the ones you do</li>
</ul>

<h2>The Bottom Line</h2>
<p>Pixieset, HoneyBook, and Studio Ninja are all solid tools. We respect what they've built. But none of them were built by a photographer who shoots weddings on Saturday and manages client portals on Sunday.</p>
<p>Fotonizer was. And that makes all the difference.</p>
<p>If you're ready to simplify your workflow, impress your clients, and run your photography business like a pro — <a href="/signup">start free today</a>. No credit card required.</p>
    `.trim(),
  },
]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(p => p.slug === slug)
}

export function getAllPosts(): BlogPost[] {
  return blogPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
