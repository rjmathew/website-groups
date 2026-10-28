# Chrome Web Store listing: Website Groups

Copy each section into the matching field in the Developer Dashboard.

## Package tab

Upload `dist/website-groups-1.0.0.zip`.

## Store listing tab

**Name and summary.** These come from `manifest.json` automatically:

- Name: Website Groups
- Summary: Open or close a whole group of websites in one click. Make groups for your morning reading, work tools or distractions.

**Description:**

```
Website Groups lets you open or close a whole group of websites in one click.

Make a group for anything you do regularly: your morning reading, the tools you use at work, the news sites you check, or the sites that distract you. Then use the toolbar button to:

• Open: opens every site in the group in new tabs.
• Close: closes every open tab on those sites, including subdomains (closing "facebook.com" also closes "m.facebook.com").

Each group shows how many of its sites are open right now, so you can see at a glance what's open.

Website Groups is separate from Chrome's built-in tab groups (the coloured labels on your tab strip). It doesn't change them, and you can use both together.

FEATURES
• As many groups as you like, each with its own icon and colour
• Open and close counts for every group, with a progress bar
• Add sites as web addresses (bbc.com/news) or as keywords (any tab whose address contains "bible")
• Back up your groups to a file, and import them on another computer
• Groups sync between computers through your Chrome account
• Light and dark mode

PRIVACY
Website Groups doesn't collect, send or sell any data. Your groups are saved in Chrome's own storage and never leave your browser except through Chrome sync. It checks the addresses of your open tabs only to count and close the ones that match your groups.
```

**Category:** Productivity, then the closest subcategory (Tools, or Workflow and planning).

**Language:** English

**Graphic assets** (all in this `store` folder):

| Field | File |
|---|---|
| Store icon (128×128) | `../icons/icon128.png` |
| Screenshots (1280×800) | `screenshot-1.png` to `screenshot-4.png`, in that order |
| Small promo tile (440×280) | `promo-tile-440x280.png` |

You can leave the marquee promo tile empty.

**Additional fields:**

- Official URL: leave as None
- Homepage URL: `https://github.com/rjmathew/website-groups`
- Support URL: `https://github.com/rjmathew/website-groups/issues`
- Mature content: No

## Privacy tab

**Single purpose description:**

```
Website Groups lets users open or close a saved group of websites in one click.
```

**Permission justification for tabs:**

```
Used to read the addresses of open tabs so the extension can show how many sites in each group are open, and close the tabs that belong to a group when the user clicks Close. Tab addresses are only used inside the extension and are never stored or sent anywhere.
```

**Permission justification for storage:**

```
Used to save the user's groups (names, icons, colours and site lists) with chrome.storage.sync, so they're kept between sessions and sync across the user's computers.
```

**Are you using remote code?**

```
No, I am not using remote code.
```

(All scripts are in the package. Nothing is loaded from the internet.)

**Data usage:** don't tick any of the "What user data do you plan to collect" boxes. The extension reads tab addresses on the user's computer but never collects them, meaning it never sends them to you or anyone else.

Tick all three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** `https://rjmathew.github.io/website-groups/store/privacy-policy.html`

This address works once GitHub Pages is turned on for the repository: on GitHub, open **Settings → Pages**, set **Source** to **Deploy from a branch**, choose **main** and **/ (root)**, and click **Save**. The page appears a minute or two later.

## Distribution tab

- Payments: Free of charge
- Visibility: Public (or Unlisted if you'd like to try it with a few people first)
- Distribution: All regions

## Test instructions tab

```
No account or login is needed. Click the toolbar button to see the groups. Click Open on "Social media" to open x.com and facebook.com, then Close to close them again. Use + to create a group, and the backup button in the header to export or import groups.
```
