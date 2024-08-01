# Guidelines for writing JavaScript code examples
The following guidelines cover writing JavaScript example code

We follow [MDN Javascript style guides](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Writing_style_guide/Code_style_guide/JavaScript)

## Updating theme level JS
❌ We ideally do not want to add logic to `theme.js`, or another other core theme js files (e.g. `card-product.js`). These are too easy to lose when theme updates happen, even if they are at the bottom of the file.

✅ JS should be added using one of the following options:
- Component specific JS can go in
  - A `<script>` tag in the component file (in this case add the comment `// MM Added Script`) as the first line of the script
  - A component JS override file. E.g. `assets/mm-slider.js`
- Shared JS (global) can go in `assets/mm-custom.js` file
- Sometimes we have to edit the theme.js file but we want to prioritize this order
  - Add a MM comment `// MM fix: why we need this code`
  - Add a custom event and 
    - Then we can respond to the event in our own component JS file
  - As a last resort if we cannot use a custom event listener, then we can inline the logic but we MUST use a comment explaining whats happening
