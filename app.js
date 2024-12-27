const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'cricketMatchDetails.db')
let db = null

// Initialize DB and Server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000/')
    })
  } catch (error) {
    console.error(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

// Convert database objects into the required response format
const convertPlayerDbObjectToResponseObject = dbObject => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  }
}

const convertMatchDbObjectToResponseObject = dbObject => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  }
}

const convertPlayerScoreDbObjectToResponseObject = dbObject => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  }
}

// API 1: Get all players
app.get('/players/', async (req, res) => {
  const getPlayersQuery = `
    SELECT * FROM player_details;
  `
  const players = await db.all(getPlayersQuery)
  res.send(players.map(convertPlayerDbObjectToResponseObject))
})

// API 2: Get specific player by playerId
app.get('/players/:playerId/', async (req, res) => {
  const {playerId} = req.params
  const getPlayerQuery = `
    SELECT * FROM player_details WHERE player_id = ?;
  `
  const player = await db.get(getPlayerQuery, playerId)
  res.send(convertPlayerDbObjectToResponseObject(player))
})

// API 3: Update player details by playerId
app.put('/players/:playerId/', async (req, res) => {
  const {playerId} = req.params
  const {playerName} = req.body
  const updatePlayerQuery = `
    UPDATE player_details
    SET player_name = ?
    WHERE player_id = ?;
  `
  await db.run(updatePlayerQuery, playerName, playerId)
  res.send('Player Details Updated')
})

// API 4: Get match details by matchId
app.get('/matches/:matchId/', async (req, res) => {
  const {matchId} = req.params
  const getMatchQuery = `
    SELECT * FROM match_details WHERE match_id = ?;
  `
  const match = await db.get(getMatchQuery, matchId)
  res.send(convertMatchDbObjectToResponseObject(match))
})

// API 5: Get all matches of a player
app.get('/players/:playerId/matches', async (req, res) => {
  const {playerId} = req.params
  const getPlayerMatchesQuery = `
    SELECT match_details.match_id, match_details.match, match_details.year
    FROM match_details
    INNER JOIN player_match_score ON match_details.match_id = player_match_score.match_id
    WHERE player_match_score.player_id = ?;
  `
  const matches = await db.all(getPlayerMatchesQuery, playerId)
  res.send(matches.map(convertMatchDbObjectToResponseObject))
})

// API 6: Get all players of a specific match
app.get('/matches/:matchId/players', async (req, res) => {
  const {matchId} = req.params
  const getMatchPlayersQuery = `
    SELECT player_details.player_id, player_details.player_name
    FROM player_details
    INNER JOIN player_match_score ON player_details.player_id = player_match_score.player_id
    WHERE player_match_score.match_id = ?;
  `
  const players = await db.all(getMatchPlayersQuery, matchId)
  res.send(players.map(convertPlayerDbObjectToResponseObject))
})

// API 7: Get player statistics by playerId
app.get('/players/:playerId/playerScores', async (request, response) => {
  const { playerId } = request.params;
  const getPlayerStatisticsQuery = `
    SELECT 
      player_details.player_id,
      player_details.player_name,
      SUM(player_match_score.score) AS total_score,
      SUM(player_match_score.fours) AS total_fours,
      SUM(player_match_score.sixes) AS total_sixes
    FROM player_match_score
    INNER JOIN player_details ON player_match_score.player_id = player_details.player_id
    WHERE player_details.player_id = ?;
  `;
  const stats = await db.get(getPlayerStatisticsQuery, [playerId]);
  response.send({
    playerId: stats.player_id,
    playerName: stats.player_name,
    totalScore: stats.total_score,
    totalFours: stats.total_fours,
    totalSixes: stats.total_sixes,
  });
});
module.exports = app
