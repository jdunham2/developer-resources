## FAQ's

Q: What is the trunk theme and trunk branch?

A: The trunk changes based on whether we are working off the live theme or redesigning the site using a development theme in Shopify. See the scenarios below. (Note - "TRUNK" comes from trunk based development [see more here](https://www.freecodecamp.org/news/what-is-trunk-based-development/)).


Scenario #1: We are updating the published theme:
- Trunk theme: **LIVE** - published theme (Shopify)
- Trunk branch: **master** (github)
- Reason: The "master" branch of github should always align with the live/published theme of the store. We use git to version control the customer's old site when we are building a new one. This way, if we ever accidentally break something in live, we have a way to get their old code back.

Scenario #2: We are redesigning a site (with old theme still live/published)
- Trunk theme: the **MM Development Redesign** (development theme in Shopify)
- Trunk branch: **mm-redesign** (github)
