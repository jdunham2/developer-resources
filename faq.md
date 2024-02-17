## FAQ's

Q: What is the trunk theme and trunk branch?

A: The trunk theme is the Shopify theme we are currently developing. The trunk branch changes based on if we are working off the live theme or redesigning a theme currently in development. We follow trunk based development, [see more here](https://www.freecodecamp.org/news/what-is-trunk-based-development/).


Scenario #1: We are updating the published theme:
- **Trunk theme (Shopify)**: published live theme on Shopify
- **Trunk branch (github)**: master
- Reason: The "master" branch of github should always align with the live/published theme of the store. We use git to version control the customer's old wite when we are building them a new one. This way, if we ever accidentally break something in live, we have a way to get their old code back.

Scenario #2: We are redesinging a site (with old theme still live/published)
- **Trunk theme (Shopify)**: the **MM Development Redesign** theme (development theme)
- **Trunk branch (github)**: mm-redesign
