# Profile design and maintenance

This repository renders at https://github.com/SuhangXia, not the separate GitHub Pages website.

## References consulted

- [Sayak Paul](https://github.com/sayakpaul/sayakpaul): concise research identity and a direct personal-site link.
- [LeRobot](https://github.com/huggingface/lerobot): real robot media, clear introductory copy and direct access to technical work.
- [PythonRobotics](https://github.com/AtsushiSakai/PythonRobotics): concrete robotics demonstrations organized by research topic.
- [GitHub Readme Stats](https://github.com/anuraghazra/github-readme-stats): statistics cards, light/dark presentation, and the documented limitations of the public hosted instance.
- [Metrics](https://github.com/lowlighter/metrics): scheduled generation of profile artifacts through Actions.

The implementation uses original text and the owner's workcell photograph, not copied third-party artwork. The photo is copied unchanged from `suhangxia-site-v2/src/assets/media/vtla-robot-workcell.jpg`. The earlier decorative header and research-loop SVGs are retained for history but no longer displayed. Research biography and project descriptions come from the owner's personal-site source; no publication status or experimental performance is inferred.

## Automatic statistics

`scripts/update-profile.mjs` uses Node 22 built-ins and the public GitHub REST API. It paginates through all owner repositories, filters private repositories explicitly, and separates non-fork repositories from forks. Received stars and forks are summed only over non-fork repositories. Language distribution counts the primary language per non-fork repository, not language bytes or expertise. Archived repositories are included; missing languages are labeled.

The script writes four SVG cards, a JSON snapshot, and only the marked statistics block in README. Cards are local assets with light/dark variants. There is no runtime third-party statistics service, extra package installation, or personal access token requirement.

Push these files to the default `main` branch to activate `.github/workflows/profile-stats.yml`. It runs on relevant pushes, manually from Actions, and daily at 06:23 UTC. It uses the built-in `GITHUB_TOKEN` with `contents: write`. If organization policy or branch protection blocks direct bot commits, inspect the failed run and configure a permitted update path. Do not add a private-repository token.

Run locally with `node scripts/update-profile.mjs`; the unauthenticated public API has a lower rate limit. API failures retain the last successful snapshot. GitHub can delay scheduled runs and disables schedules in public repositories after 60 days of inactivity; see [scheduled-workflow documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). The README exposes the snapshot date and a manual-refresh link.

The existing `profile-3d.yml` belongs to the previous setup and is unchanged. Its artifacts are not embedded in this design.
