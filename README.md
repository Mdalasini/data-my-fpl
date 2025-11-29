# Fantasy Premier League Data

A comprehensive data pipeline for Fantasy Premier League that enriches official FPL data with advanced analytics including expected goals (xG) and ELO ratings. The project fetches data from multiple sources, processes it into structured formats, and provides enhanced metrics for better team and player performance analysis.

## Data Sources

- **Official FPL data** via [vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League)
- **Expected Goals data** from FBRef
- **Team performance data** for ELO calculations

## Features

- **Expected Goals (xG)**: Shot quality and expected offensive output metrics
- **ELO Ratings**: Dynamic team strength ratings based on performance vs expectations
- **Structured Data**: Clean, schema-validated datasets for analysis
- **Automated Pipeline**: Scripts for data collection, processing, and migration

## Data Collection

The `scripts/` directory contains automated scripts for:
- Fetching player, team, and fixture data from FPL
- Scraping xG data from FBRef
- Calculating and updating ELO ratings
- Data migration and processing

Output data schemas are defined in the `schemas/` directory, providing clear structure for all generated datasets.
