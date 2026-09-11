# Styling Bidirectional Forms & Form Controls

## Overview

Forms in bidirectional web applications require careful attention. While the overall form layout mirrors to Right-to-Left, certain input fields (such as email addresses, URLs, and phone numbers) must remain Left-to-Right for natural data entry.

---

## 1. Input Fields by Content Type

| Field Type | Label Direction | Input `dir` | Text Alignment | Example |
|---|---|---|---|---|
| Full Name | RTL | `auto` or `rtl` | `start` | رضا احمدی |
| Email Address | RTL | **`ltr`** | **`left`** | user@example.com |
| Phone Number | RTL | **`ltr`** | **`left`** | +98 912 345 6789 |
| Website URL | RTL | **`ltr`** | **`left`** | https://example.com |
| Password | RTL | **`ltr`** | **`left`** | •••••••••• |
| Commentary/Notes | RTL | `auto` | `start` | توضیحات سفارش... |

---

## 2. Direction-Aware Input Styling

```html
<!-- Email input in an RTL Persian form -->
<div class="form-group" dir="rtl">
  <label for="email">آدرس ایمیل</label>
  <input
    id="email"
    type="email"
    dir="ltr"
    placeholder="name@domain.com"
    class="form-input"
  />
</div>
```

```css
.form-input {
  width: 100%;
  padding-inline-start: 1rem;
  padding-inline-end: 2.5rem; /* Space for trailing icon */
  text-align: start;
}

/* LTR input inside RTL context */
.form-input[dir="ltr"] {
  text-align: left;
}
```

---

## 3. Leading and Trailing Icons

Using CSS Logical Properties ensures icons anchor correctly regardless of context:

```css
.input-wrapper {
  position: relative;
}

.input-icon-start {
  position: absolute;
  inset-inline-start: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
}

.input-icon-end {
  position: absolute;
  inset-inline-end: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
}
```
