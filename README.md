# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## 🔐 Environment variables

Set these as `.env` locally, or as platform secrets (Vercel / Cloudflare dashboard) in production:

| Variable                     | Purpose                                                        |
| :--------------------------- | :------------------------------------------------------------- |
| `RESEND_API_KEY`             | Resend API key for the welcome email                           |
| `RESEND_FROM_EMAIL`          | Verified "from" address for Resend                             |
| `SUPABASE_URL`               | Supabase project URL                                           |
| `SUPABASE_ANON_KEY`          | Public/anon key — used by the public idea-submission endpoint  |
| `SUPABASE_SERVICE_ROLE_KEY`  | **Server-only** service role key — used by the admin panel to read/write ideas, settings, and submissions (bypasses RLS). Never expose to the browser. |
| `SESSION_SECRET`             | Random string used to sign the admin session cookie (HMAC). Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. |

## 🛠️ Admin panel

The admin panel lives at `/admin` and is protected by a signed cookie session.

- **Default login:** username `kingnit`, password `root` — change these in **Settings** after first login.
- **Emails:** view every idea/email submitted from the homepage form.
- **Ideas:** create, edit, and delete idea articles. Each published idea gets a public page at `/ideas/<slug>`.
- **Settings:** switch the site theme (`paper`, `dark`, `sepia`) and font (`garamond`, `caveat`, `mono`), and change the admin username/password.

Requires `SUPABASE_SERVICE_ROLE_KEY` and `SESSION_SECRET` to be set.

