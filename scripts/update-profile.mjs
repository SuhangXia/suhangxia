import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const owner = 'SuhangXia';
const colors = ['#4493f8', '#3fb9a0', '#ad8aff', '#d49a40', '#ea7c92', '#8b949e'];
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

export function summarize(repositories) {
  // Never include private repositories, even when a caller supplies a broader token.
  const publicRepos = repositories.filter(r => r.private === false && r.owner?.login?.toLowerCase() === owner.toLowerCase());
  const own = publicRepos.filter(r => !r.fork);
  const languages = new Map();
  for (const repo of own) {
    const language = repo.language || 'Not detected';
    languages.set(language, (languages.get(language) || 0) + 1);
  }
  return {
    publicRepositories: publicRepos.length,
    nonForkRepositories: own.length,
    forkedRepositories: publicRepos.length - own.length,
    stars: own.reduce((sum, r) => sum + r.stargazers_count, 0),
    forksReceived: own.reduce((sum, r) => sum + r.forks_count, 0),
    languages: [...languages].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  };
}

async function fetchRepositories() {
  const repositories = [];
  for (let page = 1; ; page++) {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'SuhangXia-profile', 'X-GitHub-Api-Version': '2022-11-28' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(`https://api.github.com/users/${owner}/repos?type=owner&per_page=100&page=${page}`, {
        headers, signal: AbortSignal.timeout(30000),
      });
      if (response.status < 500) break;
      await new Promise(done => setTimeout(done, 1000 * (attempt + 1)));
    }
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}; existing statistics were not changed.`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Unexpected repository response');
    for (const repo of batch) {
      if (!Number.isInteger(repo.stargazers_count) || !Number.isInteger(repo.forks_count)) throw new Error('Missing repository counts');
    }
    repositories.push(...batch);
    if (batch.length < 100) break;
  }
  if (!repositories.length) throw new Error('Empty API result; retaining previous statistics.');
  return repositories;
}

export function card(stats, kind, dark) {
  const c = dark
    ? { bg: '#0d1117', line: '#30363d', text: '#f0f6fc', muted: '#919baa', accent: '#79b8ff' }
    : { bg: '#ffffff', line: '#d1d9e0', text: '#1f2328', muted: '#59636e', accent: '#0969da' };
  const text = (x, y, value, size = 13, fill = c.text, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${escape(value)}</text>`;
  let body = text(24, 33, kind === 'overview' ? 'PUBLIC REPOSITORIES' : 'LANGUAGES IN MY REPOS', 11, c.muted, 'letter-spacing="1.5" font-weight="600"');
  if (kind === 'overview') {
    const metrics = [
      [24, 82, stats.nonForkRepositories, 'Non-fork repos'],
      [210, 82, stats.forkedRepositories, 'Forked repos'],
      [24, 166, stats.stars, 'Stars received'],
      [210, 166, stats.forksReceived, 'Forks received'],
    ];
    for (const [x, y, count, label] of metrics) body += text(x, y, count, 34, c.accent, 'font-weight="600"') + text(x, y + 23, label, 12, c.muted);
    body += `<path d="M24 124H366" stroke="${c.line}"/>`;
    body += text(24, 224, 'Stars and forks: non-fork repositories only.', 11, c.muted);
  } else {
    const detected = stats.languages.filter(([name]) => name !== 'Not detected');
    const missing = stats.languages.filter(([name]) => name === 'Not detected');
    const limit = 6 - missing.length;
    const visible = detected.length <= limit ? [...detected] : [
      ...detected.slice(0, limit - 1),
      ['Other', detected.slice(limit - 1).reduce((n, [, count]) => n + count, 0)],
    ];
    visible.push(...missing);
    let x = 24;
    visible.forEach(([, count], i) => {
      const width = stats.nonForkRepositories ? count / stats.nonForkRepositories * 342 : 0;
      body += `<rect x="${x}" y="54" width="${width}" height="8" fill="${colors[i]}"/>`;
      x += width;
    });
    visible.forEach(([language, count], i) => {
      const y = 86 + i * 21;
      body += `<circle cx="29" cy="${y - 4}" r="4" fill="${colors[i]}"/>`;
      body += text(42, y, language, 12) + text(366, y, `${count} ${count === 1 ? 'repo' : 'repos'}`, 12, c.muted, 'text-anchor="end"');
    });
    body += text(24, 224, 'By primary language, not code volume or skill.', 11, c.muted);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="244" viewBox="0 0 390 244" role="img" aria-labelledby="title"><title id="title">${kind === 'overview' ? 'Public GitHub repository statistics' : 'Primary language distribution'}</title><rect x=".5" y=".5" width="389" height="243" rx="10" fill="${c.bg}" stroke="${c.line}"/><g font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif">${body}</g></svg>\n`;
}

async function main() {
  const readmePath = resolve(root, 'README.md');
  const readme = await readFile(readmePath, 'utf8');
  const start = '<!-- STATS:START -->';
  const end = '<!-- STATS:END -->';
  if (readme.split(start).length !== 2 || readme.split(end).length !== 2 || readme.indexOf(start) > readme.indexOf(end)) throw new Error('Expected one ordered statistics marker pair');
  const stats = summarize(await fetchRepositories());
  const date = new Date().toISOString().slice(0, 10);
  const block = `${start}\n<details>\n<summary>Statistics &amp; methodology · updated ${date} UTC</summary>\n\n${stats.publicRepositories} public repositories: **${stats.nonForkRepositories} non-fork** and **${stats.forkedRepositories} forked**. Non-fork repositories have received **${stats.stars} stars** and **${stats.forksReceived} forks**.\n\nPrimary languages: ${stats.languages.map(([name, count]) => `${escape(name)} (${count})`).join(' · ')}. Each non-fork repository counts once, including archived repositories. Repositories without a detected language are shown separately. Language counts describe repository composition, not proficiency or authorship.\n\nSource: [GitHub REST API](https://api.github.com/users/${owner}/repos?type=owner). Public repositories only. [Refresh workflow](https://github.com/${owner}/suhangxia/actions/workflows/profile-stats.yml).\n\n</details>\n${end}`;
  // Fetching and validation finish before any output changes; errors preserve the last good snapshot.
  const output = resolve(root, 'assets/stats');
  await mkdir(output, { recursive: true });
  for (const kind of ['overview', 'languages']) {
    for (const theme of ['light', 'dark']) await writeFile(resolve(output, `${kind}-${theme}.svg`), card(stats, kind, theme === 'dark'));
  }
  await writeFile(resolve(output, 'snapshot.json'), JSON.stringify({ owner, updated: date, ...stats }, null, 2) + '\n');
  await writeFile(readmePath, readme.slice(0, readme.indexOf(start)) + block + readme.slice(readme.indexOf(end) + end.length));
  console.log(`Updated ${stats.publicRepositories} public repositories (${stats.nonForkRepositories} non-fork), ${date} UTC.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
