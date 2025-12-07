# Fantasy Premier League Data

A comprehensive data pipeline for Fantasy Premier League that enriches official FPL data with advanced analytics including expected goals (xG) and ELO ratings. The project fetches data from multiple sources, processes it into structured formats, and provides enhanced metrics for better team and player performance analysis.

## Data Sources

- **Official FPL data** directly from `https://fantasy.premierleague.com/api`
- **Expected Goals data** from FBRef
- **ELO ratings** directly from `https://www.versussportssimulator.com/PLS/rankings`

## Features

- **Expected Goals (xG)**: Shot quality and expected offensive output metrics
- **ELO Ratings**: Team strength ratings sourced from Versus Sports Simulator
- **Structured Data**: Clean, schema-validated datasets for analysis
- **Automated Pipeline**: Scripts for data collection, processing, and migration

## Data Collection

The `scripts/` directory contains automated scripts for:
- Fetching player, team, and fixture data from FPL
- Scraping xG data from FBRef
- Fetching ELO ratings from Versus Sports Simulator
- Data migration and processing

Output data schemas are defined in `scripts/type.ts` using Zod, providing clear structure and validation for all generated datasets.
