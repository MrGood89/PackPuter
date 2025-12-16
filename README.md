# PackPuter

A Telegram bot for batch converting GIFs/videos to Telegram-compliant stickers and generating AI-powered animated stickers.

## Features

- **Batch Convert**: Convert up to 10 GIFs/videos to Telegram-compliant WEBM VP9 stickers
- **Single Convert**: Convert individual files to stickers
- **AI Sticker Maker**: Generate animated stickers using Memeputer AI agent
- **AI Generate Pack**: Generate sticker packs (6, 12, or 24 stickers) with AI

## Quick Start

1. Copy environment files:
   ```bash
   cp bot/.env.example bot/.env
   cp worker/.env.example worker/.env
   ```

2. Fill in `bot/.env` with your Telegram bot token and bot username.

3. Build and run:
   ```bash
   docker-compose up --build
   ```

## Architecture

- **bot/**: Node.js + Telegraf bot service
- **worker/**: Python FastAPI worker service for conversion and rendering

## Telegram Compliance

All stickers meet Telegram requirements:
- WEBM VP9 format, no audio
- ≤ 3 seconds duration
- ≤ 30 fps
- 512px on one side (other ≤ 512)
- ≤ 256 KB file size
- Loopable

## Documentation

- [Setup Guide](SETUP.md) - Detailed setup instructions
- [VM Deployment Guide](VM_DEPLOYMENT.md) - Deploy on a virtual machine
- [Project Summary](PROJECT_SUMMARY.md) - Technical details

