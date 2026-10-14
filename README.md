# SEEK for Microsoft Teams

Interactive prototype of SEEK, a Microsoft Teams app for discovering and posting workplace events and moments. Built as a single self-contained HTML file using Fluent 2 (Teams) design tokens and Fluent UI System Icons.

**Live demo:** https://mar1e-fran.github.io/seek-teams-plugin/

## The flow
1. **Install** – SEEK is added from the Teams app store, so there is no new software to approve.
2. **Browse** – Today's pop-ups and events, each one click from the employee's calendar (list, week and month views).
3. **Create** – Anyone can post an event in four fields.
4. **Detect** – The SEEK bot spots an event in a chat and posts it for the team.

## Embed
```html
<iframe src="https://mar1e-fran.github.io/seek-teams-plugin/?embed=1&theme=dark" style="width:100%;aspect-ratio:4/3;border:0"></iframe>
```
- `?embed=1` transparent background, no outer padding
- `?theme=dark` styles the step bar for a dark page
- `?nav=0` hides the step bar
- `?step=1..4` opens on a specific step

## Team
Marie Cabibihan, Hir Israni, Steven Chen, Jiwan Park, Priyanshi Jain
