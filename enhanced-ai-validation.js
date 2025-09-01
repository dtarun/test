const axios = require('axios');
const marketConfig = require('./market-data-config.js');

// Enhanced AI Validation Service with Real AI Integration
class EnhancedAIValidationService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    this.googleApiKey = process.env.GOOGLE_AI_KEY;
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  }

  async validateIdea(idea) {
    const results = {
      sources: [],
      desirability_score: 0,
      validity_score: 0,
      feasibility_score: 0,
      overall_score: 0,
      market_analysis: '',
      competitor_analysis: [],
      technical_feasibility: '',
      recommendations: []
    };

    try {
      console.log(`🤖 Starting AI validation for: ${idea.title}`);
      
      // 1. Web Search for Market Research (Simulated)
      const marketData = await this.searchMarketData(idea);
      results.sources.push(...marketData.sources);
      
      // 2. AI Analysis using OpenAI
      const aiAnalysis = await this.getAIAnalysis(idea, marketData);
      if (aiAnalysis.sources) {
        results.sources.push(...aiAnalysis.sources);
      }
      
      // 3. Calculate scores based on research
      results.desirability_score = this.calculateDesirabilityScore(marketData, aiAnalysis);
      results.validity_score = this.calculateValidityScore(marketData, aiAnalysis);
      results.feasibility_score = this.calculateFeasibilityScore(idea, aiAnalysis);
      results.overall_score = Math.round((results.desirability_score + results.validity_score + results.feasibility_score) / 3);
      
      // 4. Populate results from AI analysis
      results.market_analysis = aiAnalysis.market_analysis;
      results.competitor_analysis = aiAnalysis.competitor_analysis;
      results.technical_feasibility = aiAnalysis.technical_feasibility;
      results.recommendations = aiAnalysis.recommendations;
      
      console.log(`✅ Validation completed with overall score: ${results.overall_score}/100`);
      return results;
    } catch (error) {
      console.error('❌ AI Validation Error:', error);
      return this.getFallbackValidation(idea);
    }
  }

  async searchMarketData(idea) {
    console.log(`🔍 Simulating market data search for: ${idea.category}`);
    
    // In production, this would use a real search API
    const categoryData = marketConfig.categoryData[idea.category] || { size: 20, growth: 10 };
    
    return {
      market_size: `$${categoryData.size}B global market`,
      growth_rate: `${categoryData.growth}% CAGR`,
      competitors: this.generateCompetitors(idea.category),
      market_trends: this.generateMarketTrends(idea.category),
      sources: [
        { type: 'web_search', source: 'Simulated: Statista Market Research 2024', url: 'https://www.statista.com/market-insights/', ai_used: 'Mock Search API' },
        { type: 'web_search', source: 'Simulated: Grand View Research Industry Report', url: 'https://www.grandviewresearch.com/', ai_used: 'Mock Search API' }
      ]
    };
  }

  async getAIAnalysis(idea, marketData) {
    console.log(`🤖 Performing AI analysis for: ${idea.title}`);

    if (!this.openaiApiKey) {
      console.warn('⚠️ OpenAI API key not found. Using mock analysis.');
      return this.getMockAIAnalysis(idea, marketData);
    }

    // Truncate the description to save tokens on very long inputs.
    const truncatedDescription = idea.description.length > 1500 
      ? idea.description.substring(0, 1500) + '...' 
      : idea.description;

    const prompt = `
      Analyze the business idea below.

      **Idea Details:**
      - Title: ${idea.title}
      - Category: ${idea.category}
      - Description: ${truncatedDescription}

      **Market Data:**
      - Market Size: ${marketData.market_size}
      - Growth Rate: ${marketData.growth_rate}

      Respond in a JSON object. The value for "market" and "tech" must be a single string. The value for "competitors" and "recommendations" must be an array of strings.
      Use these exact keys: "market", "competitors", "tech", "recommendations".
    `;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.openaiModel,
          messages: [
            { role: 'system', content: 'You are an expert business analyst providing concise analysis in a structured JSON format.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }, // Enable JSON mode
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`,
          },
        }
      );

      console.log('✅ OpenAI API call successful. Parsing response...');
      const aiResponse = JSON.parse(response.data.choices[0].message.content);
      
      // Map the concise keys from the AI to the longer keys used in our application
      // Defensively handle cases where the AI might return an object instead of a string.
      const marketAnalysis = typeof aiResponse.market === 'string' ? aiResponse.market : JSON.stringify(aiResponse.market);
      const techFeasibility = typeof aiResponse.tech === 'string' ? aiResponse.tech : JSON.stringify(aiResponse.tech);
      const analysis = {
        market_analysis: marketAnalysis,
        competitor_analysis: aiResponse.competitors,
        technical_feasibility: techFeasibility,
        recommendations: aiResponse.recommendations
      };
      
      if (!analysis.market_analysis || !analysis.competitor_analysis || !analysis.technical_feasibility || !analysis.recommendations) {
        throw new Error('AI response is missing required fields.');
      }

      const modelUsed = JSON.parse(response.config.data).model;

      analysis.sources = [{
        type: 'ai_analysis',
        source: `OpenAI ${modelUsed}`,
        url: 'https://platform.openai.com/docs/models',
        ai_used: 'OpenAI'
      }];

      return analysis;

    } catch (error) {
      console.error('❌ OpenAI API call failed:', error.response ? error.response.data : error.message);
      console.log('Falling back to mock AI analysis.');
      return this.getMockAIAnalysis(idea, marketData);
    }
  }

  getMockAIAnalysis(idea, marketData) {
    // This mock now returns the full object structure expected by the rest of the app
    return {
      market_analysis: `(Mock) The market for ${idea.category} is estimated at ${marketData.market_size} and growing.`,
      competitor_analysis: marketData.competitors.slice(0, 3),
      technical_feasibility: `(Mock) Building this requires a standard web/mobile stack.`,
      recommendations: [
        `Focus on a niche user base to start.`,
        `Develop a strong unique selling proposition (USP).`,
        `Build a minimum viable product (MVP).`
      ],
      sources: [{ type: 'ai_analysis', source: 'Mock AI Service', url: null, ai_used: 'Mock' }],
    };
  }

  calculateDesirabilityScore(marketData, aiAnalysis) {
    let score = 60;
    if (parseInt(marketData.growth_rate) > 20) score += 15;
    // Defensively check if recommendations is an array before accessing .length
    if (Array.isArray(aiAnalysis.recommendations) && aiAnalysis.recommendations.length > 2) {
      score += 10;
    }
    return Math.min(100, score + Math.floor(Math.random() * 10));
  }

  calculateValidityScore(marketData, aiAnalysis) {
    let score = 55;
    if (parseInt(marketData.market_size.replace(/\$|B/g, '')) > 50) score += 20;
    // Defensively check if competitor_analysis is an array before accessing .length
    if (Array.isArray(aiAnalysis.competitor_analysis) && aiAnalysis.competitor_analysis.length < 4) {
      score += 10;
    }
    return Math.min(100, score + Math.floor(Math.random() * 10));
  }

  calculateFeasibilityScore(idea, aiAnalysis) {
    let score = 70;
    if (idea.category === 'blockchain' || idea.category === 'hardware') score -= 15;
    // Defensively check if technical_feasibility is a string before calling string methods.
    // The AI might return an array or object, which would cause a TypeError.
    if (typeof aiAnalysis.technical_feasibility === 'string' && aiAnalysis.technical_feasibility.toLowerCase().includes('standard')) {
      score += 10;
    }
    return Math.min(100, score + Math.floor(Math.random() * 5));
  }

  getFallbackValidation(idea) {
    return {
      sources: [{ type: 'fallback', source: 'System Fallback', url: null, ai_used: 'None' }],
      desirability_score: 45, validity_score: 40, feasibility_score: 50, overall_score: 45,
      market_analysis: 'Could not perform AI analysis due to an error. Market potential is undetermined.',
      competitor_analysis: ['Unknown due to analysis error.'],
      technical_feasibility: 'Could not perform AI analysis. Technical feasibility is undetermined.',
      recommendations: ['Resolve the AI service error to get a full validation.']
    };
  }

  generateCompetitors(category) {
    return marketConfig.competitors[category] || ['Generic Competitor A', 'Generic Competitor B'];
  }

  generateMarketTrends(category) {
    return marketConfig.marketTrends[category] || ['Increased digitalization', 'Data-driven decisions'];
  }
}

module.exports = EnhancedAIValidationService;
