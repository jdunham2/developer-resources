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


## PreSteps (before you make any changes to code): 
```
// SYNC Github with latest Shopify changes:

// Pull any changes from GitHub Trunk Branch
git pull

// Pull any changes from Shopify
stpl

// Push Shopify production changes to GitHub Trunk Branch
git add .
git commit -m 'production download'
```


## Development
Make your code changes in Shopify CLI Development Environment
`std`

Work off the "trunk" branch/theme
- Live Shopify themes are always on the `master` branch.
- New site builds that will replace an old site have their own development theme in Shopify (**MM Development Redesign**)
  - Use **mm-redesign** branch in github instead of master (see more in the FAQ)

After your changes are done get the latest Shopify changes again
```
// stash your changes
git add .
git stash
// get the latest changes to production
stpl
git status
// if changes run
git add .
git commit -m 'production download'
// get your changes back
git stash pop

// IMPORTANT - REVIEW every code change in the source control

// push your changes to the trunk theme
stph

// IMPORTANT - TEST your changes on the trunk theme
// fix anything if its broken once on trunk theme right away

// push your changes to git
git add .
// use conventional commit messages
git commit -m 'type(scope): description' -m '2nd description for body of commit'
git push
```
