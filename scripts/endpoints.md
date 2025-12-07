### Player Summary Endpoint

Retrieves a full summary of a player's seasonal performance, future fixtures, and ownership data.

**URL**
```
https://fantasy.premierleague.com/api/element-summary/{EID}/
```

**Path Parameter**

| Parameter | Type   | Description                 |
|-----------|--------|-----------------------------|
| `EID`     | integer| The unique **Element ID** of the player. |

**Response Body**

The response is a JSON object containing three main keys:

*   `fixtures`: An array of objects detailing the player's upcoming fixtures.
*   `history`: An array of objects detailing the player's performance in each completed fixture of the current season.
*   `history_past`: An array of objects containing summary stats for the player's performance in previous seasons.

#### `history` Object Schema

The following table describes the attributes within each object of the `history` array.

| Attribute                       | Type   | Description                                                                                               |
|---------------------------------|--------|-----------------------------------------------------------------------------------------------------------|
| **Identifiers**                 |        |                                                                                                           |
| `element`                       | int    | The player's unique Element ID.                                                                            |
| `fixture`                       | int    | The unique ID for the fixture.                                                                             |
| `opponent_team`                 | int    | The unique ID for the opponent team.                                                                      |
| **Performance Summary**         |        |                                                                                                           |
| `total_points`                  | int    | Total FPL points scored by the player in this match.                                                       |
| `minutes`                       | int    | Minutes played by the player.                                                                             |
| `starts`                        | int    | `1` if the player started the match, `0` if they came on as a substitute.                                |
| **Attacking Stats**             |        |                                                                                                           |
| `goals_scored`                  | int    | Number of goals scored.                                                                                   |
| `assists`                       | int    | Number of assists awarded.                                                                                |
| `expected_goals`                | string | Statistical expectation of goals scored (xG).                                                              |
| `expected_assists`              | string | Statistical expectation of assists provided (xA).                                                         |
| `expected_goal_involvements`    | string | Combined expected goals and expected assists (xGI).                                                       |
| **Defensive & Goalkeeping Stats**|       |                                                                                                           |
| `clean_sheets`                  | int    | Clean sheets awarded.                                                                                     |
| `goals_conceded`                | int    | Goals conceded by the player's team while they were on the pitch.                                         |
| `saves`                         | int    | Number of saves made (primarily for goalkeepers).                                                         |
| `penalties_saved`               | int    | Number of penalties saved.                                                                                |
| `clearances_blocks_interceptions`| int   | Combined total of clearances, blocks, and interceptions.                                                  |
| `recoveries`                    | int    | Number of ball recoveries.                                                                                |
| `tackles`                       | int    | Number of successful tackles.                                                                             |
| `expected_goals_conceded`       | string | Statistical expectation of goals conceded while on the pitch.                                            |
| **Discipline & Other**          |        |                                                                                                           |
| `yellow_cards`                  | int    | Number of yellow cards received.                                                                          |
| `red_cards`                    | int    | Number of red cards received.                                                                              |
| `own_goals`                     | int    | Number of own goals scored.                                                                               |
| `penalties_missed`              | int    | Number of penalties missed.                                                                               |
| **FPL-Specific Metrics**        |        |                                                                                                           |
| `bonus`                         | int    | Bonus points awarded for the match, ranging from 0-3.                                                      |
| `bps`                           | int    | The player's score from the Bonus Points System (BPS), used to determine bonus points.                    |
| `influence`                     | string | A score assessing the player's impact on the match, offensively and defensively.            |
| `creativity`                    | string | A score assessing a player's ability to create goal-scoring opportunities.                  |
| `threat`                        | string | A score assessing a player's likelihood of scoring a goal.                                 |
| `ict_index`                     | string | Composite `Influence, Creativity, Threat` index (sum of the three).                                       |
| **Value & Ownership**           |        |                                                                                                           |
| `value`                         | int    | The player's current selling price in FPL (in tenths of a million, e.g., `73` = 7.3M).                    |
| `selected`                      | int    | The total number of FPL managers who have selected this player.                                           |
| `transfers_in`                  | int    | Number of teams that transferred the player in during the last gameweek.                                  |
| `transfers_out`                 | int    | Number of teams that transferred the player out during the last gameweek.                                 |
| `transfers_balance`             | int    | Net transfers in for the last gameweek (`transfers_in` - `transfers_out`).                                |



#### `history_past` Object Schema

The following table describes the attributes within each object of the `history_past` array, which provides a summary of a player's performance for past seasons they were in the FPL game.

| Attribute                       | Type   | Description                                                                                               |
|---------------------------------|--------|-----------------------------------------------------------------------------------------------------------|
| **Identifiers**                 |        |                                                                                                           |
| `season_name`                   | string| The name of the season (e.g., "2023/24").                                                                  |
| `element_code`                  | int    | A unique code for the player, which remains consistent across seasons.                                    |
| **Value & Summary**             |        |                                                                                                           |
| `start_cost`                    | int    | The player's price at the start of that season (in tenths of a million, e.g., `80` = 8.0M).               |
| `end_cost`                      | int    | The player's price at the end of that season (in tenths of a million).                                    |
| `total_points`                  | int    | Total FPL points scored by the player across the entire season.                                            |
| **Performance Stats (Season Totals)**|        |                                                                                                           |
| `minutes`                       | int    | Total minutes played by the player in the season.                                                         |
| `starts`                        | int    | Total number of matches the player started.                                                               |
| `goals_scored`                  | int    | Total number of goals scored.                                                                             |
| `assists`                       | int    | Total number of assists awarded.                                                                          |
| `clean_sheets`                  | int    | Total clean sheets awarded.                                                                               |
| `goals_conceded`                | int    | Total goals conceded by the player's team while they were on the pitch.                                  |
| `own_goals`                     | int    | Total number of own goals scored.                                                                         |
| `saves`                         | int    | Total number of saves made (primarily for goalkeepers).                                                  |
| **Expected Stats (Season Totals)**|   |                                                                                                           |
| `expected_goals`                | string| Seasonal total of the expected goals (xG) metric.                                                          |
| `expected_assists`              | string| Seasonal total of the expected assists (xA) metric.                                                       |
| `expected_goal_involvements`    | string| Seasonal total of the expected goal involvements (xGI) metric.                                            |
| `expected_goals_conceded`       | string| Seasonal total of the expected goals conceded (xGC) metric.                                               |
| **Discipline & Other Stats**    |        |                                                                                                           |
| `yellow_cards`                  | int    | Total number of yellow cards received.                                                                    |
| `red_cards`                     | int    | Total number of red cards received.                                                                      |
| `penalties_saved`               | int    | Total number of penalties saved.                                                                          |
| `penalties_missed`              | int    | Total number of penalties missed.                                                                         |
| `bonus`                         | int    | Total bonus points awarded across the season.                                                             |
| `bps`                           | int    | Total Bonus Points System (BPS) score across the season.                                                 |
| `influence`                     | string| Seasonal total of the Influence score.                                                                    |
| `creativity`                    | string| Seasonal total of the Creativity score.                                                                   |
| `threat`                        | string| Seasonal total of the Threat score.                                                                       |
| `ict_index`                     | string| Seasonal total of the ICT Index (sum of Influence, Creativity, and Threat).                               |
| `defensive_contribution`        | int    | A composite metric summarizing the player's defensive actions over the season.                            |
| `clearances_blocks_interceptions`| int   | Seasonal total of clearances, blocks, and interceptions.                                                 |
| `recoveries`                    | int    | Seasonal total of ball recoveries.                                                                        |
| `tackles`                       | int    | Seasonal total of successful tackles.                                                                     |
