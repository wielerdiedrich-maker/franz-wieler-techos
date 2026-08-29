# GitHub Pages Responsive Website Starter

This is a self-contained, static website starter built for **GitHub Pages**. It contains no server-side code, build step, private key, or environment variable. You can publish it directly from the repository root using the `main` branch.

## Directory layout

Create this exact structure in a new repository. The relative paths in `index.html` are already correct for GitHub Pages project sites (`https://USERNAME.github.io/REPOSITORY-NAME/`) and user sites (`https://USERNAME.github.io/`).

```text
your-repository/
├── .gitignore             # Prevents accidental local/editor files from being committed
├── .nojekyll              # Prevents GitHub Pages from processing the static files with Jekyll
├── index.html             # Required homepage entry point
├── styles.css             # All responsive visual styles
├── script.js              # Mobile menu, footer year, and demo form behavior
└── README.md              # Setup and deployment instructions
```

| File | Role | Notes |
|---|---|---|
| `index.html` | Website structure and content | The entry page GitHub Pages loads by default. |
| `styles.css` | Responsive design | Linked with `./styles.css`, which works from the repository root. |
| `script.js` | Small browser-only interactions | Linked with `./script.js` and loaded with `defer`. |
| `.nojekyll` | Static-site safeguard | Recommended when you want GitHub Pages to serve the files exactly as committed. |

> **Important:** GitHub Pages is public hosting. Do not commit passwords, API keys, `.env` files, customer data, or server-side code. GitHub Pages serves static files and does not run PHP, Python, Node.js, or database code. [1]

## Customize before publishing

Open `index.html` in an editor and replace the sample business text such as **Northline Studio**, `hello@example.com`, service descriptions, and page title. Keep the three existing relative links unchanged unless you deliberately move the CSS or JavaScript into folders.

If you add images later, create an `assets/images/` directory and use relative paths such as:

```html
<img src="./assets/images/hero.jpg" alt="Describe the image clearly" />
```

Avoid absolute links like `/assets/images/hero.jpg` for a project site, because a leading slash points to `https://USERNAME.github.io/assets/...` rather than `https://USERNAME.github.io/REPOSITORY-NAME/assets/...`.

## Publish from scratch with Git

### 1. Create an empty GitHub repository

On GitHub, choose **New repository**, select a name such as `my-business-site`, and choose **Public** if you use GitHub Free. For the cleanest command-line workflow below, do **not** initialize the repository with a README, `.gitignore`, or license; the starter already provides those files. GitHub Pages sites are publicly available even when a private repository can use Pages on the applicable plan. [1]

Copy the HTTPS repository URL from GitHub. It has this form:

```text
https://github.com/YOUR-USERNAME/my-business-site.git
```

### 2. Place the starter files in a local folder

Copy the downloaded starter files into a folder named after your repository. Then open a terminal in the **parent** directory and run the following commands, replacing the uppercase placeholders:

```bash
# Move to the parent folder that contains your website folder.
cd /path/to/your/projects

# Rename the downloaded folder if necessary, then enter it.
mv github-pages-starter my-business-site
cd my-business-site

# Confirm the expected files are present.
ls -la
```

### 3. Initialize Git, commit, and push

Run these commands from inside `my-business-site`. Configure Git with your own name and email first if you have not already done so.

```bash
# One-time Git identity setup (skip if already configured globally).
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Start a repository whose default branch is main.
git init -b main

# Review exactly what will be committed.
git status
git add .
git commit -m "Initial GitHub Pages website"

# Link the local folder to the empty GitHub repository you created.
git remote add origin https://github.com/YOUR-USERNAME/my-business-site.git

# Publish your first commit.
git push -u origin main
```

If GitHub asks you to authenticate, use the browser sign-in flow or a personal access token according to your Git credential manager. Do not place a token in the repository or in `script.js`.

## Enable GitHub Pages in repository settings

After the first push, configure GitHub Pages in the GitHub website:

1. Open `https://github.com/YOUR-USERNAME/my-business-site`.
2. Select **Settings** in the repository navigation. If it is hidden, open the **More** menu first.
3. In the left sidebar, open **Pages** under **Code, planning, and automation**.
4. In **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Select the **`main`** branch.
6. Select **`/(root)`** as the folder because `index.html` is in the repository root.
7. Click **Save**.
8. Wait for the deployment message, then select **Visit site** on the same Pages screen.

GitHub Pages accepts `index.html`, `index.md`, or `README.md` as an entry file; for this starter, `index.html` is the homepage. GitHub notes that a new deployment can take up to about 10 minutes after a push. [1] Branch publishing supports a branch root or its `/docs` folder; this starter intentionally uses the root for simplicity. [2]

Your normal project-site URL will be:

```text
https://YOUR-USERNAME.github.io/my-business-site/
```

To publish at `https://YOUR-USERNAME.github.io/` without the repository name, create a repository named exactly `YOUR-USERNAME.github.io` (all lowercase). [1]

## Update the live site later

Each update follows the same short sequence:

```bash
cd /path/to/your/projects/my-business-site

# Edit index.html, styles.css, and/or script.js in your editor.
git status
git add index.html styles.css script.js
git commit -m "Describe your update"
git push
```

GitHub Pages redeploys after a push to the selected publishing branch. If an update does not appear, open the repository’s **Actions** tab and the **Settings → Pages** page to see deployment status. [2]

## Optional: custom domain

You can configure a custom domain in **Settings → Pages → Custom domain**. Add the required DNS record at your domain provider first, then enter the domain in GitHub. Do not rely only on a committed `CNAME` file to configure the domain; GitHub’s current documentation specifies configuring the custom domain through repository settings or the API. [2]

## References

[1]: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site "GitHub Docs: Creating a GitHub Pages site"
[2]: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site "GitHub Docs: Configuring a publishing source for your GitHub Pages site"
