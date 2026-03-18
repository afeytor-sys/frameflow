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
  {
    slug: 'how-to-deliver-photos-to-clients-professionally',
    title: 'How to Deliver Photos to Clients Professionally (And Why It Matters More Than You Think)',
    excerpt: 'The way you deliver photos is part of your brand. Here\'s how top photographers create a delivery experience that gets referrals, repeat bookings, and 5-star reviews.',
    date: '2026-03-18',
    category: 'Business Tips',
    readTime: 7,
    tags: [
      'how to deliver photos to clients',
      'photo delivery for photographers',
      'client gallery delivery',
      'photography client experience',
      'online photo gallery',
      'photography business tips',
      'how to send photos to clients',
      'client portal for photographers',
      'photography workflow',
      'wedding photography delivery',
    ],
    content: `
<h2>The Delivery Moment Is Your Last Impression — Make It Count</h2>
<p>You spent hours shooting. Days editing. You poured your heart into every image. And then you send your client a Dropbox link.</p>
<p>That's the moment most photographers get wrong.</p>
<p>The delivery experience is the final chapter of your client's journey with you. It's the moment they see their photos for the first time. It's emotional, it's memorable — and it's an opportunity most photographers completely waste.</p>
<p>In this guide, we'll walk through exactly how to deliver photos professionally, what the best photographers do differently, and how to turn delivery into a referral engine.</p>

<h2>Why Photo Delivery Matters More Than You Think</h2>
<p>Think about the last time you received something in beautiful packaging versus a plain brown box. The product inside might be identical — but the experience is completely different. You feel valued. You feel like the person who sent it cared.</p>
<p>Photo delivery works the same way.</p>
<p>When a client receives their photos through a beautifully designed gallery with their name on it, a personal message from you, and a clean interface that works perfectly on their phone — they feel like they hired a premium photographer. They feel like the investment was worth it.</p>
<p>When they get a Dropbox link or a WeTransfer notification, they feel like they hired a freelancer.</p>
<p>The photos might be identical. The experience is not.</p>

<h2>The 5 Elements of a Professional Photo Delivery</h2>

<h3>1. A Branded Client Portal</h3>
<p>The best photographers don't just send a gallery link — they send their clients to a dedicated portal that includes everything related to their project. The gallery, yes, but also the contract, the timeline, the meeting point, and a personal message.</p>
<p>This does two things: it makes the client feel like they have a dedicated space just for them, and it positions you as a professional who has their entire workflow organized.</p>
<p>Tools like Fotonizer let you create a client portal for every project automatically. Your client gets one link that contains everything — and it looks like it was designed by a premium studio.</p>

<h3>2. A Personal Message</h3>
<p>Before your client sees their photos, they should see a message from you. Not a generic "your gallery is ready" notification — a personal note that acknowledges the specific shoot, expresses your excitement about the images, and sets the tone for the reveal.</p>
<p>Something like: <em>"I had such a wonderful time photographing your wedding day. I've been looking forward to sharing these with you — I hope they bring back every emotion from that day."</em></p>
<p>This takes 30 seconds to write and makes a lasting impression.</p>

<h3>3. A Beautiful Gallery Experience</h3>
<p>The gallery itself matters. Not just the photos — the interface your clients use to view them.</p>
<p>A great gallery experience means:</p>
<ul>
  <li><strong>Fast loading</strong> — clients shouldn't wait for images to appear</li>
  <li><strong>Mobile-first design</strong> — most clients will view their gallery on their phone first</li>
  <li><strong>Clean, distraction-free layout</strong> — the photos should be the hero, not the interface</li>
  <li><strong>Easy downloading</strong> — clients should be able to download individual photos or the full gallery with one click</li>
  <li><strong>Favorites selection</strong> — let clients mark their favorites so you know which images matter most to them</li>
</ul>

<h3>4. Clear Instructions</h3>
<p>Don't assume your clients know how to use your gallery. Include a brief note explaining how to download photos, how to mark favorites, and what to do if they have questions.</p>
<p>This reduces support emails and makes the experience feel polished and professional.</p>

<h3>5. A Follow-Up Plan</h3>
<p>Delivery isn't the end of the relationship — it's the beginning of the referral phase. After you deliver the gallery, follow up a few days later to ask how they're enjoying the photos. This is the perfect moment to ask for a review or a referral.</p>
<p>Clients who are still in the emotional high of seeing their photos for the first time are the most likely to leave a glowing review or recommend you to a friend.</p>

<h2>What NOT to Do When Delivering Photos</h2>

<h3>Don't Use Generic File Transfer Services</h3>
<p>WeTransfer, Dropbox, and Google Drive are great tools — but they're not designed for photo delivery. They look generic, they expire, and they don't give your clients a premium experience. More importantly, they don't reinforce your brand.</p>
<p>Every touchpoint with your client is a branding opportunity. A Dropbox link is a missed opportunity.</p>

<h3>Don't Deliver Without a Personal Touch</h3>
<p>An automated email that says "Your photos are ready — click here to download" is the bare minimum. It gets the job done, but it doesn't create a memorable experience. It doesn't make your client feel special. And it doesn't differentiate you from every other photographer they could have hired.</p>

<h3>Don't Make Downloading Complicated</h3>
<p>If your client has to create an account, install software, or navigate a confusing interface to download their photos, you've failed the delivery experience. Make it as simple as possible. One click to download. No friction.</p>

<h3>Don't Forget Mobile</h3>
<p>The majority of your clients will open their gallery notification on their phone. If your gallery doesn't look great on mobile, you're delivering a subpar experience to most of your clients. Test your delivery on mobile before you send it.</p>

<h2>The Referral Connection</h2>
<p>Here's something most photographers don't think about: the delivery experience directly impacts your referral rate.</p>
<p>When a client has a beautiful delivery experience, they share it. They screenshot the gallery and post it on Instagram. They tell their friends "you have to see how my photographer delivered my photos." They tag you. They recommend you.</p>
<p>When a client gets a Dropbox link, they download their photos and move on. No sharing. No referral. No word of mouth.</p>
<p>The delivery experience is free marketing — if you do it right.</p>

<h2>How to Set Up a Professional Delivery Workflow</h2>
<p>Here's a simple workflow you can implement immediately:</p>
<ol>
  <li><strong>Create a project</strong> in your studio management tool as soon as a booking is confirmed</li>
  <li><strong>Set up the client portal</strong> with the project details, timeline, and meeting point</li>
  <li><strong>Upload your edited photos</strong> to the gallery when they're ready</li>
  <li><strong>Write a personal message</strong> to your client before activating the gallery</li>
  <li><strong>Send the portal link</strong> with a personal email (not just an automated notification)</li>
  <li><strong>Follow up 3–5 days later</strong> to ask how they're enjoying the photos and request a review</li>
</ol>
<p>This entire workflow takes less than 15 minutes to set up per project — and it creates an experience your clients will remember and talk about.</p>

<h2>The Tools That Make This Easy</h2>
<p>You don't need to build this workflow from scratch. Tools like Fotonizer are designed specifically to make professional photo delivery easy:</p>
<ul>
  <li><strong>Automatic client portals</strong> — every project gets a dedicated portal with a custom link</li>
  <li><strong>Beautiful gallery templates</strong> — multiple design themes that match your brand aesthetic</li>
  <li><strong>Favorites selection</strong> — clients can mark their favorite photos directly in the gallery</li>
  <li><strong>Download controls</strong> — you decide whether clients can download individual photos, the full gallery, or nothing at all</li>
  <li><strong>Personal messages</strong> — add a custom message that appears before the gallery</li>
  <li><strong>Mobile-optimized</strong> — every gallery looks perfect on any device</li>
  <li><strong>Password protection</strong> — keep galleries private until you're ready to share</li>
</ul>

<h2>The Bottom Line</h2>
<p>The way you deliver photos is part of your brand. It's part of the experience you're selling. And it's one of the most overlooked opportunities in the photography business.</p>
<p>The photographers who get the most referrals, the best reviews, and the most repeat bookings aren't always the ones with the best photos. They're the ones who create the best experience — from the first inquiry to the final delivery.</p>
<p>Delivery is your last impression. Make it unforgettable.</p>
<p>Ready to upgrade your delivery experience? <a href="/signup">Start free with Fotonizer</a> — no credit card required.</p>
    `.trim(),
  },
]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(p => p.slug === slug)
}

export function getAllPosts(): BlogPost[] {
  return blogPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
