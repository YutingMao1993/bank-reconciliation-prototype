# Layout Patterns

These are illustrative patterns for the three failures this skill addresses. Prefer the project's components and spacing tokens. The selectors and numbers below must be adapted to the interface.

## Shared panel header

Give peer headers the same markup and class instead of maintaining separate padding rules.

```html
<div class="panel-header">
  <h2>Panel Title</h2>
  <span class="panel-header-meta">Supporting Count</span>
</div>
```

```css
.panel-header {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 21px;
  border-bottom: 1px solid var(--border-color);
}
.panel-header h2 {
  min-width: 0;
  margin: 0;
  font-size: 16px;
  line-height: 1.25;
}
.panel-header-meta {
  flex-shrink: 0;
}
```

Long titles may need to wrap. If metadata also becomes long, allow the header layout to wrap or stack; do not preserve one line at the cost of clipping. Identical short headers can share a height naturally without a hardcoded height.

## Action group inside a narrow panel

This pattern places a primary action above two secondary actions and lets them wrap as space decreases. Use only where that hierarchy suits the task.

```css
.review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.review-actions > button {
  box-sizing: border-box;
  flex: 1 1 140px;
  min-width: 0;
  min-height: 44px;
  padding: 10px 14px;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.4;
}
.review-actions > .primary-action {
  flex-basis: 100%;
}
```

The flex basis is a wrapping preference, not a universal button width. Check the actual labels, language, panel width, and zoom. If a grid parent still overflows, inspect its tracks and child minimum sizes too.

## Consistent custom picker spacing

Apply this to an existing accessible picker, not as a substitute for its behavior.

```css
.account-picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 12px 14px;
  text-align: start;
}
.account-picker-value {
  min-width: 0;
  overflow-wrap: anywhere;
}
.account-picker-chevron {
  flex: none;
}
.account-picker-options.inline {
  position: static;
  margin-top: 6px;
  padding: 5px;
}
.account-picker-option {
  width: 100%;
  padding: 10px 12px;
  text-align: start;
  white-space: normal;
}
```

Inline options grow the card and move actions down. If a floating menu is required, use the existing overlay infrastructure and verify clipping, scrolling, and viewport edges. Preserve focus-visible styles.

## Measure the result

Adapt this read-only browser snippet to known header selectors. Run it after `document.fonts.ready` resolves.

```js
const measurements = [...document.querySelectorAll('.panel-header')].map(el => {
  const box = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const title = el.querySelector('h2');
  return {
    title: title?.textContent,
    height: box.height,
    padding: [style.paddingTop, style.paddingRight,
              style.paddingBottom, style.paddingLeft],
    titleOffset: title ? title.getBoundingClientRect().top - box.top : null
  };
});
```

Compare corresponding headers within roughly one CSS pixel when they are intended to be equal. For actions, compare each button's bounds with its containing panel and check `scrollWidth` against `clientWidth`. These measurements can detect overflow but do not prove a menu or focus ring is unobscured; inspect the rendered result too.
