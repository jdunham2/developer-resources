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

// Pull any changes from GitHub Master
git pull

// Pull any changes from Shopify
stpl

// Push Shopify production changes to GitHub Master
git add .
git commit -m 'production download'
```


## Development
Make your code changes in Shopify CLI Development Environment
`std`

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
```
