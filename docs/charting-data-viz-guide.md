# Bidirectional Data Visualization & Charting Guide

## Introduction

Adapting charts, dashboards, and graphs for Right-to-Left (RTL) audiences involves more than flipping coordinates. Different visual conventions apply depending on whether the axis represents **categorical data** or **chronological time**.

---

## 1. The Time Axis: To Flip or Not To Flip?

### Convention A: Universal Time Progression (Left-to-Right)
In modern financial, scientific, and technical applications across the Arab world, Iran, and Israel, **chronological time axes (X-axis) frequently proceed from Left to Right** (earlier dates on left, future dates on right).

### Convention B: Flipped Time Progression (Right-to-Left)
In traditional print media and RTL-first consumer applications, time may flow from Right to Left (past on right, future on left).

> **Best Practice:** Default horizontal category bars to start from the right margin, but provide a user preference toggle for chronological time series.

---

## 2. Horizontal Bar Charts

Horizontal bar charts **must** mirror in RTL layouts:

```
LTR Layout:               RTL Layout:
[Label A] █████           █████ [Label A]
[Label B] ████████        ████████ [Label B]
```

In Recharts:
```tsx
<BarChart layout="vertical">
  <XAxis type="number" reversed={isRtl} />
  <YAxis type="category" dataKey="name" orientation={isRtl ? 'right' : 'left'} />
  <Bar dataKey="value" />
</BarChart>
```

---

## 3. Tooltips and Number Formatting

Mixed text in chart tooltips must be isolated to prevent numbers from drifting:

```tsx
import { BidiText } from '@bidilens/react';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip" dir="rtl">
      <p className="tooltip-label">
        <BidiText text={label} />
      </p>
      <p className="tooltip-value">
        مقدار: <bdi>{payload[0].value.toLocaleString('fa-IR')}</bdi> ریال
      </p>
    </div>
  );
}
```
