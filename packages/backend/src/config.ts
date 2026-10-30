import dotenv from 'dotenv';
dotenv.config();

// Ensure Node's fetch can connect to public FPL endpoints without local macOS CA certificate issues
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  fplBaseUrl: 'https://fantasy.premierleague.com/api',
  draftBaseUrl: 'https://draft.premierleague.com/api',
  nodeEnv: process.env.NODE_ENV || 'development',
  cacheTtl: {
    bootstrap: 900, // 15 mins
    fixtures: 180, // 3 mins
    picks: 300, // 5 mins
    draft: 300, // 5 mins
    vaastav: 86400, // 24 hours
  },
};
