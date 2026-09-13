# Bidirectional HTML Email & Newsletter Engineering

## Overview

Designing responsive, bidirectional HTML emails is notoriously difficult due to legacy rendering engines (e.g. Microsoft Word engine in Outlook for Windows) and varying webmail stylesheet sanitizers.

This guide provides proven email layout patterns that render reliably across Apple Mail, Gmail, Outlook, and Yahoo Mail.

---

## 1. Top-Level Email Container

Always declare `dir="rtl"` on both the `<html>` element and the outer table container:

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" dir="rtl" lang="fa">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style type="text/css">
    body { margin: 0; padding: 0; direction: rtl; text-align: right; }
  </style>
</head>
<body dir="rtl">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" dir="rtl">
    <tr>
      <td align="right" dir="rtl">
        <!-- Email Body Content -->
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Table-Based Column Mirroring

In multi-column email layouts (e.g., logo on one side, navigation links on the other), desktop Outlook does not support CSS Flexbox or Grid. Setting `dir="rtl"` on the parent `<table>` naturally reverses the column display order:

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" dir="rtl">
  <tr>
    <!-- In RTL, this column renders on the right side -->
    <td width="50%" align="right" dir="rtl">
      <img src="logo.png" alt="لوگو" width="120" />
    </td>
    <!-- In RTL, this column renders on the left side -->
    <td width="50%" align="left" dir="rtl">
      <a href="https://example.com/profile">حساب کاربری</a>
    </td>
  </tr>
</table>
```

---

## 3. Email Subject Lines and Preheaders

Email clients display sender name and subject line side-by-side. If the subject starts with an English word or order number, the sender name can appear displaced.

Use Unicode **RLM** (`\u200F`) at the start of RTL email subjects:
```
Subject: ‏سفارش شما (#1042) با موفقیت ثبت شد
```
