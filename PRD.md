# Blocklist Cloner

I want to build an application that can be hosted on vercel and allows users to clone an atproto moderation list to their own account. The application should provide a user-friendly interface for selecting the list to clone and the destination account. It should allow users to choose to clone the entire list, or to allowlist their follows or mutuals---e.g., not include these users in the list.

## Requirements

Users will pass lists in the format of a URL. `https://bsky.app/profile/offline.mountainherder.xyz/lists/3l7g3f6uyqo23`. These will need to be transformed to at-uris: `at://<did>/app.bsky.graph.list/3l7g3f6uyqo23`.


- Authentication using bluesky app passwords with the ability to migrate to oauth later.
- User friendly interface for selection the list to clone.
- User friendly interface select if the user should allowlist their follows or mutuals.
- Allow users to exclude members of a curate list by passing additional list URLs
- Use pnpm for package management
- Use TypeScript for development
- Hosted web application on vercel using Svelte or SolidJS for front end, with Tailwind CSS for styling.

Use your skills. Reference your typescript-atproto-init skill for understanding how to auth. Use context7 for documentation on atproto and other technologies.
