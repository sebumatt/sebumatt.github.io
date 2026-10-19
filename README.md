# Sebastian Mathews, engineering portfolio

Interactive 3D portfolio: a procedural Bluefors-style dilution refrigerator with project cards in orbit. Click a card and the cryostat flies to it, the project opens, and an interactive explainer runs.

Live: https://sebumatt.github.io

## Run locally

```bash
npm install
npm run dev
```

## Edit content

- Projects: `src/data/projects.js`
- Hide a project without deleting it: add its `id` to `HIDDEN_BY_DEFAULT` in the same file. Add `?all` to the URL to see hidden ones.
- Explainers: `src/explainers/<project-id>.js` (shared controls in `kit.js`)

Pushing to `main` builds and deploys through GitHub Actions.
