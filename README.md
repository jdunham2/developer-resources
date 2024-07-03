# Developer Resources

## Developer Computer Setup

### Install Shopify CLI
https://shopify.dev/docs/themes/tools/cli/install

### Install VSCode
https://code.visualstudio.com/Download

**Install VSCode extensions**
- Shopify Liquid - Shopify
- Trailing Spaces - Shardul Mahadik
- Code Spell Checker - Street Side Software
- Auto Rename Tag - Jun Han
- Auto Complete Tag - Jun Han
- Auto Close Tag - Jun Han
- Git Graph - mhutchie
- Prettier - Code formatter

// optional theme: One Monokai Theme - Joshua Azemoh

### Install Brew
https://brew.sh/

### Install Zsh + PowerLevel10k
https://dev.to/abdfnx/oh-my-zsh-powerlevel10k-cool-terminal-1no0

### Add ZSHRC Aliases for our ShopifyCLI commands
- Add [code from this file](https://github.com/jdunham2/developer-resources/blob/main/shopify-cli-aliases.bash) to bottom of ~/.zshrc

| Alias | Shopify cli equivilent | Description |
| ---| ---| --- |
| stpl | shopify theme pull --store... | pulls from shopify setting the store automatically based on your folder structure |
| std | shopify theme dev --sync-editor ... | opens dev store with preset options best for our DX |
| stph | shopify theme push --store... | pushes to shopify with preset options based on your folder structure |


### How-Tos
- [Developer Code Process](https://github.com/jdunham2/developer-resources/blob/main/how-to-shopify-theme-changes.md)
