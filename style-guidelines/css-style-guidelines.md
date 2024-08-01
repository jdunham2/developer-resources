# Guidelines for writing CSS code examples
The following guidelines cover how to write CSS code.

In addition the the rules in this file, we follow [MDN guidelines](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Writing_style_guide/Code_style_guide/CSS) (with exception of the [mobile first CSS](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Writing_style_guide/Code_style_guide/CSS#mobile-first_media_queries))

## Updating theme level CSS
❌ Changes should not be made to `theme.css`, or another other core theme css files (e.g. `card-product.css`). These are too easy to lose when theme updates happen, even if they are at the bottom of the file.

✅ All custom CSS should be added using one of the following options:
- Component specific CSS can go in
  - A `<style>` tag in the component file (in this case add the comment `{% MM Added Styles %}`)
  - A component CSS override file. E.g. `assets/mm-slider.css`
  - Prepend classes with `mm-` helps us track them
- Shared CSS (global) can go in `assets/mm-custom.css` file

## !important
!important is the last resort that is generally used only when you need to override something and there is no other way to do it. Using !important is a bad practice and you should avoid it wherever possible.

> Bad Example
```css example-bad
.component-code {
  font-size: 4rem !important;
}
```

Instead we use more specific css specifiers to target the element we want

> Good Example
```css example-bad
.grand-parent .parent .component-code {
  font-size: 4rem;
}
```
