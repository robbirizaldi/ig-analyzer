# Instagram Follow Analyzer

A clean, 100% client-side Instagram relationship analyzer. Discover who does not follow you back, your fans, mutual connections, and recently unfollowed accounts directly from your official Instagram JSON export.

## Features

- **100% Client-Side Privacy**: All processing runs locally in browser memory. No data is sent to external servers or databases.
- **Support for Multi-File Exports**: Handles multiple follower files (`followers_1.json`, `followers_2.json`, etc.).
- **Categories**:
  - **Not Following Back**: Accounts you follow who don't follow you back.
  - **Fans**: Accounts who follow you, but you don't follow back.
  - **Mutuals**: Accounts where both follow each other.
  - **Recently Unfollowed**: Extracted from `recently_unfollowed_profiles.json`.
  - **All Following & All Followers**.
- **Search & Sort**: Filter by username and sort alphabetically or by follow date.
- **Export to CSV**: Download results instantly as a formatted CSV spreadsheet.
- **Light & Dark Themes**: Clean, flat, soft aesthetic without gradients or external frameworks.
- **Zero Dependencies**: Pure vanilla JavaScript and CSS.

---

## How to Export Your Instagram Data

1. Open Instagram and go to **Profile &rarr; Menu (&#9776;) &rarr; Accounts Center**.
2. Open **Your information and permissions** &rarr; **Export your information**.
3. Choose **Create export**, select your Instagram account, and choose **Export to device**.
4. Set the format to **JSON** (Important: HTML format is not supported).
5. Once Meta finishes generating the export, download and extract the ZIP file.
6. In the extracted folder, find:
   - `followers_1.json`, `followers_2.json` (inside `connections/followers_and_following/`)
   - `following.json`
   - `recently_unfollowed_profiles.json` (optional)
7. Upload the files into this tool and click **Analyze Data**.

---

## Deployment to GitHub Pages

This tool is completely self-contained with relative asset paths. You can deploy it directly to GitHub Pages in 2 steps:

1. Create a new repository on GitHub (e.g. `instagram-follow-analyzer` or `ig-analyzer`).
2. Push the contents of this folder (`tools/ig-analyzer/`) to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
3. Go to **Settings &rarr; Pages** in your GitHub repository, set the source branch to `main` (root), and save.
   Your site will be live immediately without any CSS or path errors!

---

## License

MIT License &copy; 2026 Robbi Rizaldi.

