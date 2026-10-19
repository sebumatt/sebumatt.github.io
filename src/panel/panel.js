import { ORGS } from '../data/projects.js';
import { el } from '../explainers/kit.js';

const modules = import.meta.glob('../explainers/*.js');

export async function renderPanel(container, p) {
  const accent = ORGS[p.org]?.color ?? '#D8A657';
  const mount = el('div', { class: 'explainer-mount' }, el('p', { class: 'x-loading' }, 'Loading the explainer'));

  container.replaceChildren(
    el(
      'div',
      { class: 'p-head', style: { '--accent': accent } },
      el('p', { class: 'p-org' }, el('span', { class: 'p-swatch' }), `${p.org}, ${p.years}`),
      el('h2', { id: 'panel-title' }, p.title),
      el('ul', { class: 'p-tags', 'aria-label': 'Themes' }, p.tags.map((t) => el('li', {}, t)))
    ),
    el(
      'div',
      { class: 'p-story' },
      el('section', {}, el('h3', {}, 'The problem'), el('p', {}, p.problem)),
      el('section', {}, el('h3', {}, 'What I did'), el('ul', {}, p.did.map((d) => el('li', {}, d)))),
      el('section', { class: 'p-result' }, el('h3', {}, 'Result'), el('p', {}, p.result)),
      p.link ? el('p', {}, el('a', { href: p.link.href, target: '_blank', rel: 'noopener' }, p.link.label)) : null
    ),
    el(
      'section',
      { class: 'p-explainer', 'aria-label': 'Interactive explainer' },
      el('h3', {}, 'Try it yourself'),
      mount,
      el('p', { class: 'p-note' }, 'Illustrative numbers. Employer data and images are not shown.')
    )
  );

  const loader = modules[`../explainers/${p.id}.js`];
  if (!loader) {
    mount.replaceChildren();
    return () => {};
  }
  try {
    const mod = await loader();
    mount.replaceChildren();
    const cleanup = mod.default(mount);
    return typeof cleanup === 'function' ? cleanup : () => {};
  } catch (err) {
    console.error(err);
    mount.replaceChildren(el('p', { class: 'x-loading' }, 'The explainer did not load. Reload the page to try again.'));
    return () => {};
  }
}
