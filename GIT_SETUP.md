# Git Setup and GitHub Push Guide

This guide will help you set up Git and push PackPuter to GitHub.

## Step 1: Initialize Git Repository

### Navigate to project directory
```bash
cd C:\Projects\PackPuter
```

### Initialize Git (if not already done)
```bash
git init
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/MrGood89
2. Click "New repository" (or go to https://github.com/new)
3. Repository name: `PackPuter`
4. Description: "Telegram bot for batch converting GIFs/videos to stickers and generating AI-powered animated stickers"
5. Choose Public or Private
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click "Create repository"

## Step 3: Configure Git (First Time Only)

### Set your name and email
```bash
git config --global user.name "MrGood"
git config --global user.email "mrdjanov.media@gmail.com"
```

## Step 4: Add Remote Repository

### Add GitHub remote
```bash
git remote add origin https://github.com/MrGood89/PackPuter.git
```

### Verify remote
```bash
git remote -v
```

Should show:
```
origin  https://github.com/MrGood89/PackPuter.git (fetch)
origin  https://github.com/MrGood89/PackPuter.git (push)
```

## Step 5: Stage and Commit Files

### Check what files will be added
```bash
git status
```

### Add all files
```bash
git add .
```

### Commit files
```bash
git commit -m "Initial commit: PackPuter bot and worker services"
```

## Step 6: Push to GitHub

### Push to main branch
```bash
git branch -M main
git push -u origin main
```

If prompted for credentials:
- **Username**: Your GitHub username
- **Password**: Use a Personal Access Token (not your GitHub password)

### Create Personal Access Token (if needed)

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: `PackPuter Push`
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)
7. Use this token as your password when pushing

## Step 7: Verify Push

1. Go to https://github.com/MrGood89/PackPuter
2. You should see all your files
3. Check that `.env` files are NOT visible (they should be in `.gitignore`)

## Future Updates

### Making changes and pushing

```bash
# Check status
git status

# Add changed files
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push
```

### Pull latest changes (if working from multiple machines)

```bash
git pull
```

## Common Git Commands

### View commit history
```bash
git log
```

### View changes
```bash
git diff
```

### Create a new branch
```bash
git checkout -b feature-name
```

### Switch branches
```bash
git checkout main
```

### Merge branch
```bash
git checkout main
git merge feature-name
```

### Undo last commit (keep changes)
```bash
git reset --soft HEAD~1
```

### Undo last commit (discard changes)
```bash
git reset --hard HEAD~1
```

## Troubleshooting

### Authentication failed
- Use Personal Access Token instead of password
- Or set up SSH keys (see below)

### Push rejected
```bash
# Pull latest first
git pull origin main --rebase
# Then push again
git push
```

### Wrong remote URL
```bash
# Remove current remote
git remote remove origin
# Add correct remote
git remote add origin https://github.com/MrGood89/PackPuter.git
```

### Set up SSH keys (optional, more secure)

1. Generate SSH key:
```bash
ssh-keygen -t ed25519 -C "your.email@example.com"
```

2. Add to SSH agent:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

3. Copy public key:
```bash
cat ~/.ssh/id_ed25519.pub
```

4. Add to GitHub:
   - Go to https://github.com/settings/keys
   - Click "New SSH key"
   - Paste your public key
   - Click "Add SSH key"

5. Change remote to SSH:
```bash
git remote set-url origin git@github.com:MrGood89/PackPuter.git
```

## Important Notes

1. **Never commit `.env` files** - They contain secrets
2. **Check `.gitignore`** - Make sure sensitive files are excluded
3. **Use meaningful commit messages** - Describe what changed
4. **Push regularly** - Don't let changes accumulate

## File Structure in Git

Your repository should include:
- ✅ All source code files
- ✅ Docker configuration files
- ✅ README and documentation
- ✅ `.gitignore`
- ❌ `.env` files (excluded)
- ❌ `node_modules/` (excluded)
- ❌ `dist/` (excluded)
- ❌ `__pycache__/` (excluded)

## Next Steps After Push

1. Add repository description on GitHub
2. Add topics/tags: `telegram-bot`, `sticker`, `docker`, `typescript`, `python`
3. Consider adding a LICENSE file
4. Set up GitHub Actions for CI/CD (optional)
5. Enable branch protection (optional)

