# SEEK for Microsoft Teams

Interactive prototype of SEEK, a Microsoft Teams app for discovering and posting workplace events and moments. Built as a single self-contained HTML file using Fluent 2 (Teams) design tokens and Fluent UI System Icons.

**Live demo:** https://mar1e-fran.github.io/seek-teams-plugin/

## The flow
1. **Install** – SEEK is added from the Teams app store, so there is no new software to approve.
2. **Browse** – Today's moments and events, each one click from the employee's calendar (list, week and month views).
3. **Create** – Anyone can post an event in four fields.
4. **Detect** – The SEEK bot spots an event in a chat and posts it for the team.

## Embed
```html
<iframe src="https://mar1e-fran.github.io/seek-teams-plugin/?embed=1" style="width:100%;aspect-ratio:16/10;border:0"></iframe>
```
- `?embed=1` hides the step bar and uses a transparent background
- `?step=1..4` opens on a specific step

## Team
Marie Cabibihan, Hir Israni, Steven Chen, Jiwan Park, Priyanshi Jain
