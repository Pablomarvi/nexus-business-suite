const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
            this.available = true;
            console.log('✅ AI Service: Gemini connected');
        } else {
            this.available = false;
            console.log('⚠️  AI Service: No GEMINI_API_KEY found — using built-in templates');
        }
    }

    async generate(prompt) {
        if (!this.available) throw new Error('AI not configured. Set GEMINI_API_KEY in .env');
        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error('❌ AI API Error:', error.message);
            // Handle quota exceeded (429) specifically
            if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('Quota')) {
                console.log('⚠️  Quota exceeded. Using high-quality fallback logic...');
                return "__FALLBACK__";
            }
            throw error;
        }
    }

    // ─── EMAIL GENERATION ─────────────────────────────
    async generateEmail(context) {
        const prompt = `You are a professional email copywriter for Nexus Business Suite, an autonomous business automation platform. Write a personalized outreach email.

Context:
- Purpose: ${context.purpose || 'business outreach'}
- Industry: ${context.industry || 'technology'}
- Recipient type: ${context.recipientType || 'business professional'}
- Tone: ${context.tone || 'professional and friendly'}
- Key message: ${context.keyMessage || 'partnership opportunity'}

Requirements:
- Use {{name}} for recipient name, {{company}} for their company, {{region}} for their location
- Keep it concise (under 150 words)
- Include a clear call-to-action
- Do NOT include a subject line in the body

Return ONLY a JSON object with exactly this format (no markdown):
{"subject": "your subject line here with {{name}} or {{company}} if relevant", "body": "your HTML email body here using <p> tags"}`;

        try {
            const text = await this.generate(prompt);
            if (text === "__FALLBACK__") return this.getFallbackEmail(context);
            
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(clean);
        } catch {
            return this.getFallbackEmail(context);
        }
    }

    getFallbackEmail(context) {
        const purpose = context.purpose || 'outreach';
        return {
            subject: `Partnership Opportunity with {{company}}`,
            body: `<p>Dear {{name}},</p><p>I'm reaching out from the Nexus team regarding a potential ${purpose} between our organizations. We've been following your work in the ${context.industry || 'tech'} sector and believe there's a strong alignment.</p><p>Nexus Business Suite offers autonomous solutions that could specifically help {{company}} optimize its operations in ${context.region || 'your region'}.</p><p>Are you available for a brief 10-minute call next week to explore this further?</p><p>Best regards,<br>The Nexus Team</p>`
        };
    }

    // ─── SOCIAL POST GENERATION ─────────────────────────
    async generateSocialPost(context) {
        const prompt = `You are a social media content strategist. Create an engaging post.

Context:
- Platform: ${context.platform || 'LinkedIn'}
- Topic: ${context.topic || 'business growth'}
- Audience: ${context.audience || 'professionals and entrepreneurs'}
- Goal: ${context.goal || 'engagement and brand awareness'}
- Brand voice: ${context.brandVoice || 'Nexus Business Suite (innovative, confident, approachable, efficient)'}

Platform guidelines:
- LinkedIn: Professional, insightful, 100-200 words, use line breaks for readability
- Instagram: Visual, inspirational, use emojis, 50-100 words
- Twitter: Concise, punchy, under 280 characters

Return ONLY a JSON object with exactly this format (no markdown):
{"content": "your post content here", "hashtags": "#relevant #hashtags #here"}`;

        try {
            const text = await this.generate(prompt);
            if (text === "__FALLBACK__") return this.getFallbackSocial(context);
            
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(clean);
        } catch {
            return this.getFallbackSocial(context);
        }
    }

    getFallbackSocial(context) {
        return {
            content: `Excited to share how Nexus Business Suite is transforming ${context.topic || 'business automation'}! Efficiency is the new currency in the modern marketplace. #NexusSuite #Innovation #BusinessGrowth`,
            hashtags: "#automation #productivity #futureofwork"
        };
    }

    // ─── LEAD ANALYSIS ─────────────────────────
    async analyzeLeads(leads) {
        const summary = leads.slice(0, 30).map(l => 
            `${l.name} | ${l.email} | ${l.company} | ${l.region} | ${l.segment}`
        ).join('\n');

        const prompt = `You are a sales intelligence analyst. Analyze this lead database and provide actionable insights.

Lead Data:
${summary}

Provide analysis in ONLY a JSON object with this exact format (no markdown):
{
  "summary": "Brief overview of the lead database",
  "segmentBreakdown": "Analysis of corporate vs individual leads",
  "topRegions": "Which regions have the most leads and why they matter",
  "recommendations": ["action item 1", "action item 2", "action item 3", "action item 4"],
  "priorityLeads": "Which leads to contact first and why",
  "emailStrategy": "Suggested email approach for best conversion"
}`;

        try {
            const text = await this.generate(prompt);
            if (text === "__FALLBACK__") return this.getFallbackLeadAnalysis(leads);
            
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(clean);
        } catch {
            return this.getFallbackLeadAnalysis(leads);
        }
    }

    getFallbackLeadAnalysis(leads) {
        const corporate = leads.filter(l => l.segment === 'corporate').length;
        const individual = leads.length - corporate;
        return {
            summary: `Analyzed ${leads.length} leads in the current database.`,
            segmentBreakdown: `Current distribution: ${corporate} Corporate leads and ${individual} Individual leads.`,
            topRegions: "High concentration of leads detected in urban technology hubs.",
            recommendations: [
                "Prioritize corporate leads for high-value outreach",
                "Automate follow-ups for new individual signups",
                "Run a targeted campaign for the top performing region",
                "Verify email deliverability for older leads"
            ],
            priorityLeads: "Leads with complete company profiles and corporate email domains should be contacted first.",
            emailStrategy: "Use a personalized, value-driven approach focusing on ROI and efficiency gains."
        };
    }

    // ─── MARKET INSIGHTS ─────────────────────────
    async generateMarketInsights(stats) {
        const prompt = `You are a business strategist for Nexus Business Suite, specializing in the Tamil Nadu technology market. Based on these operational metrics, provide strategic recommendations.

Current Metrics:
- Total tasks created: ${stats.totalTasks}
- Tasks completed: ${stats.completedTasks}
- Events tracked: ${stats.totalEvents}
- Leads in database: ${stats.totalLeads}
- Emails sent: ${stats.emailsSent}
- Social posts created: ${stats.socialPosts}

Provide insights in ONLY a JSON object with this exact format (no markdown):
{
  "marketOverview": "Current state of TN tech ecosystem and opportunities",
  "productivityScore": "Assessment of task completion rate and efficiency (give a score out of 100)",
  "growthOpportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "threats": ["potential risk 1", "potential risk 2"],
  "strategyRecommendations": ["strategy 1", "strategy 2", "strategy 3", "strategy 4"],
  "weeklyActionPlan": ["monday action", "tuesday action", "wednesday action", "thursday action", "friday action"]
}`;

        try {
            const text = await this.generate(prompt);
            if (text === "__FALLBACK__") return this.getFallbackMarketInsights(stats);
            
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(clean);
        } catch {
            return this.getFallbackMarketInsights(stats);
        }
    }

    getFallbackMarketInsights(stats) {
        const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 75;
        return {
            marketOverview: "The Tamil Nadu tech ecosystem remains robust with significant growth in autonomous business solutions.",
            productivityScore: completionRate,
            growthOpportunities: ["Expansion into secondary tech cities", "Hyper-local marketing campaigns", "Partnerships with local incubators"],
            threats: ["Increasing competition in SaaS space", "Rising operational costs"],
            strategyRecommendations: ["Focus on task completion velocity", "Leverage scraped event data for direct outreach", "Optimize social media engagement frequency"],
            weeklyActionPlan: ["Review task backlog", "Launch lead outreach campaign", "Analyze event attendance", "Update social calendar", "Strategic team review"]
        };
    }
}

module.exports = AIService;
