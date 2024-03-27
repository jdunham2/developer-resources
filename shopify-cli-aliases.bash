# Aliases for Shopify CLI
# Relies on folder naming convention [shopify-store-name]-shopify

function std() {
  local current_store=${PWD##*/}
  # current _store e.g. = "store-name-shopify"
  # remove "-shopify" from the end
  current_store=${current_store%"-shopify"}
  export SHOPIFY_FLAG_STORE=$current_store

  # set current_store to all uppercase
  current_store=$(echo $current_store | tr '[:lower:]' '[:upper:]')

  echo "  Work on $current_store? (Y/n)"
  read answer

  if [[ $answer != "n" && $answer != "N" ]]
  then
    echo " Sync customizer changes? (Y/n)"
    read syncAnswer
    if [[ $syncAnswer != "n" && $syncAnswer != "N" ]]
    then
      shopify theme dev --poll --theme-editor-sync --open
    else
      shopify theme dev --poll --open
    fi
  fi
}

function stpl() {
  local current_store=${PWD##*/}
  # current _store e.g. = "store-name-shopify"
  # remove "-shopify" from the end
  current_store=${current_store%"-shopify"}
  export SHOPIFY_FLAG_STORE=$current_store

  # set current_store to all uppercase
  current_store=$(echo $current_store | tr '[:lower:]' '[:upper:]')

  echo "  Working on $current_store"
  echo

  shopify theme pull $1
}

function stph() {
  local current_store=${PWD##*/}
  # current _store e.g. = "store-name-shopify"
  # remove "-shopify" from the end
  current_store=${current_store%"-shopify"}
  export SHOPIFY_FLAG_STORE=$current_store

  # set current_store to all uppercase
  current_store=$(echo $current_store | tr '[:lower:]' '[:upper:]')

  echo "  Working on $current_store"
  echo

  shopify theme push
}
