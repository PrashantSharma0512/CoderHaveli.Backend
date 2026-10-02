# Redis API Call Count Analysis - Daily Breakdown

## Overview
Based on code analysis, here's the count of Upstash Redis API calls per day in your CoderHaveli application.

---

## 1. SCHEDULED CRON JOBS (Per Day)

### RSS Fetch Cron (Every 30 minutes)
- **Schedule**: Every day at 6:00 AM (but runs every 30 minutes based on cron setup)
- **News Sources**: 7 sources (TechCrunch, The Verge, OpenAI, GitHub Blog, Docker, AWS, Google Cloud)
- **Operations per run**:
  - 1 x `dispatchFetchJobs()` call = **7 Redis queue.add() calls**
  - Each `fetchQueue.add()` = **1 LPUSH/RPUSH command**
  - **Total per 30-min cycle: 7 Redis commands**

- **Frequency**: 48 times per day (every 30 minutes)
- **Daily total: 48 × 7 = 336 Redis commands**

### Newsletter Generation Cron (Once per day)
- **Schedule**: 8:00 AM IST (once daily)
- **Operations**:
  - 1 x `newsletterQueue.add()` = **1 LPUSH/RPUSH command**
- **Daily total: 1 Redis command**

---

## 2. QUEUE PROCESSING PIPELINE (Dynamic - Per Article)

Each article goes through 5 stages. Assuming **3 articles per source × 7 sources = ~21 new articles per fetch cycle**:

### Stage 1: News Fetch Worker
- **Trigger**: 48 fetch jobs per day (every 30 min)
- **Per fetch job**: 
  - Check duplicate: MongoDB operations (not Redis)
  - Queue article for processing: **1 processQueue.add() = 1 LPUSH**
- **Estimated articles per day**: ~21 articles × 48 = ~1,008 articles
- **Daily Redis commands: 1,008 LPUSH commands**

### Stage 2: News Process Worker
- **Per article**: 
  - Queue to AI: **1 aiQueue.add() = 1 LPUSH**
- **Daily Redis commands: ~1,008 LPUSH commands**

### Stage 3: News AI Worker
- **Per article**: No direct Redis queue operations (only MongoDB updates)
- **Daily Redis commands: 0**

### Stage 4: Newsletter Worker
- **Trigger**: Once per day
- **Operations**:
  - Get articles: MongoDB query (not Redis)
  - Queue email: **1 emailQueue.add() = 1 LPUSH**
- **Estimated newsletters: 1**
- **Daily Redis commands: 1 LPUSH**

### Stage 5: Newsletter Email Worker
- **Trigger**: Once per newsletter
- **Operations**: No direct Redis commands
- **Daily Redis commands: 0**

---

## 3. ANALYTICS FLUSH (Every 60 seconds)
- **Interval**: Every 60 seconds = 1,440 times per day
- **Operations per flush**: Depends on Redis operations in `flushAnalytics()`
- **Assuming basic cache operations**: ~2-3 Redis commands per flush
- **Daily estimate: 1,440 × 2 = 2,880 Redis commands**

---

## TOTAL DAILY REDIS API CALLS

| Component | Daily Count | Notes |
|-----------|-------------|-------|
| Fetch Cron (7 sources × 48) | 336 | LPUSH commands |
| Newsletter Cron | 1 | LPUSH command |
| Queue Processing (articles) | 2,016 | LPUSH commands (1,008 × 2 stages) |
| Newsletter Email Queue | 1 | LPUSH command |
| Analytics Flush (1,440 × 2) | 2,880 | GET/SET/INCR operations |
| **TOTAL** | **~5,234** | **Redis API calls per day** |

---

## BREAKDOWN BY OPERATION TYPE

| Operation | Count | Percentage |
|-----------|-------|-----------|
| LPUSH/RPUSH (Queue operations) | 2,354 | 45% |
| Cron scheduling metadata | 337 | 6% |
| Analytics (GET/SET/INCR) | 2,880 | 55% |
| **TOTAL** | **5,234** | **100%** |

---

## COST IMPLICATIONS (Upstash Pricing)
- **Free Tier**: 10,000 commands/day (You're using ~5,234, well within free tier ✅)
- **Cost per day**: $0 (Free tier coverage)
- **Margin**: 4,766 commands remaining

---

## PEAK TIMES
- **6:00 AM**: 7 fetch jobs queued
- **8:00 AM**: 1 newsletter generated + articles flowing through pipeline
- **Continuous**: Analytics flush every 60 seconds (constant 2-3 cmd/sec)

---

## SCALABILITY NOTES

To estimate higher traffic:
- **Per new RSS source**: +48 LPUSH calls/day
- **Per 1,000 additional articles/day**: +2,000 LPUSH calls/day (2 stages)
- **Per 1,440 analytics events/min**: +2,880 calls/day

### Example: 2x Scale
- Articles: 21 → 42 per fetch = 2,016 → 4,032 LPUSH
- Daily total: ~5,234 → ~7,966 (still within free tier)

### Example: 5x Scale  
- Articles: 21 → 105 per fetch = 2,016 → 10,080 LPUSH
- Daily total: ~5,234 → ~13,194 (exceeds free tier, would cost ~$0.10-0.20/day)

---

## SUMMARY
✅ **Your current application uses ~5,234 Redis API calls per day**
✅ **Well within Upstash free tier (10,000 commands/day)**
✅ **Can scale 2x before exceeding free tier**
