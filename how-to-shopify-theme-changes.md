### HOW TO MAKE SHOPIFY THEME CHANGES

### First time working on a project:
- Ensure your github account has access to project repos
  - Request access and send us your github username
- Sign into your github account in terminal:
```
git config --global user.name "your_username"
git config --global user.email "your_email@domain.com"
```

- Clone the repo for the project you're working on in `~/code/mm/`

- Ensure running latest version of CLI
brew upgrade shopify-cli 

## Development
Make your code changes in Shopify CLI Development Environment
`std`

After your changes are done get the latest Shopify changes again
```
// stash your changes
git add .
git stash
// get the latest changes from github origin
git pull
// get your changes back
git stash pop

// IMPORTANT - CHECK YOUR CODE AGAIN!
// REVIEW every code change you've done change by change, NOT file by file
// DO NOT SIMPLY push your code.
// - [ ] Did you remove all code smells like unused commented out code, or console.logs for debugging?
// - [ ] Does your code follow company styleguides?
     - https://github.com/jdunham2/developer-resources/blob/main/style-guidelines/css-style-guidelines.md
     - https://github.com/jdunham2/developer-resources/blob/main/style-guidelines/javascript-style-guidleines.md

// Committing Code
// push your changes to git (see which branch to push to below)
git add .
// use conventional commit messages
git commit -m 'type(scope): description' -m '2nd description for body of commit'
git push

// THIS IS TO FIX A BUG WITH SHOPIFY
// ------------------------------------------------
// pull the code from shopify to see if something didn't sync correctly with github
stpl // on mac
shopify theme pull // on windows
// if there are differences where Shopify deleted json that was added by you, repush to the same theme with the following command
stph // on mac
shoipfy theme push
// ------------------------------------------------

// IMPORTANT - TEST your changes on the theme you pushed to in Shopify
// fix anything if its broken right away
```

## Which branch do I push my code to?
### Before Approval
Push to staging (or mm-redesign if we are redoing the site entirely).

### After Approval
Push to master (NOT needed for mm-redesign if we are redoing the site entirely).

- Live Shopify themes are always on the `master` branch.
- Staging themes are always on the `staging` branch
- New site builds that will replace an old site have their own development theme in Shopify (**BRAND [DEV] MM Development Redesign**)
  - Use **mm-redesign** branch in github instead of master (see more in the [FAQ](./faq.md)

## Which files should I overwrite on LIVE?
Remember, do not push to the live template until it has been approved. If you have to push something to live for approval, create a new temporary template on the live store and after approval override the template from live with the approved design. See steps below.

- **Create a new PLP/PDP/Article/etc template for redesigns.**
  - Once they have been QA'd and approved, merge the new template with the live one.
- Code should be pushed to the staging theme before asking for QA.
