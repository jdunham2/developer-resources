# Guidelines for writing CSS code examples
The following guidelines cover how to write CSS code.

In addition the the rules in this file, we follow [MDN guidelines](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Writing_style_guide/Code_style_guide/CSS) (with exception of the [mobile first CSS](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Writing_style_guide/Code_style_guide/CSS#mobile-first_media_queries))

## Global Styles
Changes should not be made to `theme.css`.

All custom CSS should be added using one of the following options:
- Shared CSS can go in `assets/mm-custom-css.css` file
- Component specific CSS can go in either
  - A `<style>` tag in the component file (in this case add the comment `{% MM Added Styles %}`)
  - A component CSS override file. E.g. `assets/mm-slider.css`

## !important
!important is the last resort that is generally used only when you need to override something and there is no other way to do it. Using !important is a bad practice and you should avoid it wherever possible.

> [!WARNING]  
> Bad Example
```css example-bad
.bad-code {
  font-size: 4rem !important;
}
```
