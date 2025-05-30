# Development Guide - Avoiding Merge Conflicts

## Before Starting Work

1. **Always pull latest changes**
   ```bash
   git pull origin main
   ```

2. **Create a new branch for each feature**
   ```bash
   git checkout -b feature/your-feature-name
   ```
### Morning Routine
```bash
git checkout main
git pull origin main
git checkout your-feature-branch
git merge main  # Merge latest changes into your branch
```

### Before Committing
```bash
git add .
git commit -m "feat: describe your changes"
git pull origin main  # Check for new changes
git push origin your-feature-branch
```

### Creating Pull Requests
1. Go to GitHub repository
2. Create Pull Request from your branch to main
3. Request review from team lead
4. Wait for approval before merging

## Conflict Prevention Rules

### 1. Communicate File Changes
- Use team chat before modifying shared files
- Announce when working on CSS or context files

### 2. Small, Frequent Commits
- Commit changes every 30-60 minutes
- Push to your branch regularly

### 3. Coordinate CSS Changes
- Only one person modifies CSS variables at a time
- Create separate CSS files for new components

### 4. Use Feature Branches
- Never commit directly to main
- Create descriptive branch names: `feature/pos-module`, `fix/wizard-validation`

## Resolving Conflicts (When They Happen)

### If you get conflicts during pull:
```bash
git status  # See conflicted files
# Edit files to resolve conflicts (look for <<<<<<< ======= >>>>>>> markers)
git add .
git commit -m "resolve: merge conflicts"
git push origin your-branch
```

### VS Code Conflict Resolution
1. Open conflicted file
2. Click "Accept Current Change" or "Accept Incoming Change"
3. Or manually edit to combine both changes
4. Save file and commit

## Project Structure for Team Work

```
src/
├── components/
│   ├── layout/          # Developer D
│   └── modules/
│       ├── ShopWizard/
│       │   ├── ShopWizardStep1.tsx  # Developer A
│       │   ├── ShopWizardStep2.tsx  # Developer B
│       │   ├── ShopWizardStep3.tsx  # Developer C
│       │   └── styles/              # Coordinate changes
│       └── Dashboard/   # Developer E
├── context/             # Main developer only
└── App.tsx             # Main developer only
```

## Emergency: If Repository is Broken

```bash
git checkout main
git reset --hard origin/main  # DANGER: Loses local changes
git pull origin main
```

## Communication Channels
- Before modifying shared files, ask in team chat
- Daily standup: mention which files you're working on
- Use GitHub Issues for feature assignments
