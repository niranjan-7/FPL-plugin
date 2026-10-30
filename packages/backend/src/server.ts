import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { vaastavService } from './services/vaastav-historical.service.js';
import { fplService } from './services/fpl-live.service.js';
import { getClassicSquadAudit, getDraftWaiverAudit, getWildcardAudit, getChipRoadmap, getExpertIntelAudit, getCaptaincyEvAudit, getTransferHorizonAudit, getHorizonPlanAudit, getPriceChangeAudit } from './controllers/audit.controller.js';
import { evaluateMatchup, getFdrMatrix, getFdrLeaderboard, comparePlayers, getBogeyMatrix } from './controllers/matchup.controller.js';
import { rosterSyncService } from './services/roster-sync.service.js';
import { getAiBadges } from './controllers/badge.controller.js';
import { handleChat } from './controllers/chat.controller.js';

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize historical Vaastav database and warm live FPL cache
vaastavService.init();
fplService.getBootstrapStatic().catch((err) => console.warn('[Server] Bootstrap pre-warm warning:', err));

// Health / Status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    mode: config.nodeEnv,
    geminiConfigured: Boolean(config.geminiApiKey && config.geminiApiKey !== 'your_gemini_api_key_here'),
    timestamp: new Date().toISOString(),
  });
});

// Audit Endpoints
app.get('/api/audit/classic/:managerId', getClassicSquadAudit);
app.get('/api/audit/draft/:leagueId', getDraftWaiverAudit);
app.get('/api/audit/wildcard/:managerId', getWildcardAudit);
app.get('/api/audit/chips/:managerId', getChipRoadmap);
app.get('/api/audit/expert-intel', getExpertIntelAudit);
app.get('/api/audit/captaincy/:managerId', getCaptaincyEvAudit);
app.get('/api/audit/transfer-horizon/:managerId', getTransferHorizonAudit);
app.get('/api/audit/horizon-plan/:managerId', getHorizonPlanAudit);
app.get('/api/audit/price-changes/:managerId', getPriceChangeAudit);

// Matchup & Comparison Endpoints
app.get('/api/matchup/h2h', evaluateMatchup);
app.get('/api/matchup/fdr-matrix/:teamId', getFdrMatrix);
app.get('/api/matchup/fdr-leaderboard', getFdrLeaderboard);
app.get('/api/matchup/player-comparison', comparePlayers);
app.get('/api/matchup/bogey-matrix', getBogeyMatrix);

// Roster & Availability Endpoints
app.get('/api/fpl/teams', async (req, res) => {
  try {
    const teams = await rosterSyncService.getPremierLeagueClubs();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch PL teams' });
  }
});

app.get('/api/fpl/rosters/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const roster = await rosterSyncService.getClubRoster(teamId);
    if (!roster) return res.status(404).json({ error: 'Team roster not found' });
    res.json(roster);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

app.get('/api/fpl/availability', async (req, res) => {
  try {
    const availability = await rosterSyncService.getInjuredPlayers();
    res.json(availability);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Badge Overlay Endpoint
app.get('/api/badges', getAiBadges);

// Gemini Chat & Function Calling Endpoint
app.post('/api/chat', handleChat);

// Start server
const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(` ⚽ FPL AI Companion Backend`);
  console.log(` 🚀 Server listening on http://localhost:${config.port}`);
  console.log(` 🧠 Gemini 3.8 Flash Status: ${config.geminiApiKey ? 'CONNECTED' : 'LOCAL ENGINE MODE'}`);
  console.log(` 📊 Vaastav FPL Historical Database: READY`);
  console.log(`=======================================================`);
});

process.on('SIGTERM', () => {
  server.close(() => console.log('Server terminated cleanly'));
});
