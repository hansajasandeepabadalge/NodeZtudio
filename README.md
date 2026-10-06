This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Shared settings and enums

Edit `src/common/settings.ts` to change application defaults. `SETTINGS` groups the
grid, camera, controls, renderer, editor, shortcuts, lighting, shadows, materials,
hover previews, bloom, persistence, and UI colors. For example, change
`SETTINGS.grid.size` to resize both the visible grid and the placement area.
Camera position and target are plain coordinate tuples; the engine creates its
own Three.js vectors from them.

`src/common/enums.ts` defines `ToolId`, `BlockId`, `TextureId`, `SidebarPanel`,
`ButtonVariant`, and `SaveStatus`. Tool, block, and texture values retain their
existing strings so saved scenes remain compatible. Keep persistence keys and
format versions stable unless implementing a save migration.

Defaults apply when creating a scene or starting a fresh editor session. A saved
local session restores the user's selected tool, colors, visibility, and lighting
over those defaults. These are source settings; rebuild/reload after editing them.
Existing exports from `utils/constants`, `dayNight`, and `localSession` remain
available for compatibility. New code should import settings from `common/settings`.

## Running locally

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
