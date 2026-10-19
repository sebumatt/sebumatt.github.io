# Sebastian Mathews, engineering portfolio

Interactive 3D portfolio: a geared pan-tilt inspection head whose camera eyes follow the cursor, with project cards in orbit. Click a card and the head flies to it, the project opens, and an interactive explainer runs.

For a Bluefors application, send `https://sebumatt.github.io/?for=bluefors`. That link swaps the centrepiece for a gold dilution-refrigerator cryostat.

Live: https://sebumatt.github.io

## Run locally

```bash
npm install
npm run dev
```

## Edit content

- Projects: `src/data/projects.js`
- Hide a project without deleting it: add its `id` to `HIDDEN_BY_DEFAULT` in the same file. Add `?all` to the URL to see hidden ones.
- Centrepieces: `src/scene/watcher.js` (default) and `src/scene/cryostat.js` (`?for=bluefors`). Add another by returning the same shape `{ root, body, parts, lookAt, update, restY, openScale }` and choosing it in `src/main.js`.
- Explainers: `src/explainers/<project-id>.js` (shared controls in `kit.js`)

Pushing to `main` builds and deploys through GitHub Actions.
