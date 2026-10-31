# CoderHaveli Developer & Agent Guidelines

This document outlines the official design system, color palette conventions, component styling rules, and architectural guidelines for **CoderHaveli.Com**. All AI agents and developers working on this codebase must adhere strictly to these standards.

---

## 🎨 Dual-Theme Design System

CoderHaveli uses a signature dual-theme palette:
- **Light Theme**: Clean **White and Golden/Amber** palette with warm amber highlights, crisp typography, and refined amber borders.
- **Dark Theme**: Sleek **Charcoal/Obsidian and Indigo/Electric Violet** palette with deep dark backgrounds and vibrant indigo accents.

> [!IMPORTANT]
> **Core Theme Rule**:
> - In **Light Mode**, the primary accent is **Golden / Amber** (`amber-500`, `amber-600`, `amber-700`).
> - In **Dark Mode**, the primary accent is **Indigo / Violet** (`indigo-400`, `indigo-500`, `indigo-600`).
> - Do **NOT** use generic default blue (`blue-600`) as a primary button or link color.

---

## ☀️ 1. Light Theme Guidelines (White & Golden)

| Element | Tailwind Classes | Description |
| :--- | :--- | :--- |
| **Main Background** | `bg-white`, `bg-gray-50` | Clean, crisp, distraction-free surfaces |
| **Card / Surface** | `bg-white`, `bg-amber-50/40` | Subtle warm golden tint for highlighted panels |
| **Card Borders** | `border-gray-200`, `border-amber-200/80` | Delicate golden-tinted framing |
| **Primary Brand Text** | `text-amber-600`, `hover:text-amber-700` | Golden brand accents, logo, highlights |
| **Headings & Body** | `text-gray-900`, `text-gray-800`, `text-gray-700` | High-contrast readable typography |
| **Muted Text** | `text-gray-500`, `text-gray-600` | Subtitles, meta tags, and timestamps |
| **Primary CTA Button** | `bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20` | Signature golden action button |
| **Secondary Button** | `bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300` | Soft golden pill button |
| **Badge / Tag** | `bg-amber-100 text-amber-800 border border-amber-300` | Golden category tags and status pills |
| **Active Tabs & Links** | `border-amber-500 text-amber-600 font-bold` | Bottom border indicator with amber text |
| **Form Inputs** | `bg-white border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900` | Golden focus rings |
| **Slider Thumbs** | `[&::-webkit-slider-thumb]:bg-amber-500` | Golden scrubber thumbs on video seek bars |
| **Active List Items** | `bg-amber-100/70 border-amber-400 text-amber-950` | Highlighted active lecture in playlist |

---

## 🌙 2. Dark Theme Guidelines (Charcoal & Indigo)

| Element | Tailwind Classes | Description |
| :--- | :--- | :--- |
| **Main Background** | `dark:bg-gray-950`, `dark:bg-gray-900` | Deep obsidian & charcoal black background |
| **Card / Surface** | `dark:bg-gray-900`, `dark:bg-gray-800` | Dark surface containers |
| **Card Borders** | `dark:border-gray-800`, `dark:border-gray-700` | Subtle contrast boundary |
| **Primary Brand Text** | `dark:text-indigo-400`, `dark:hover:text-indigo-300` | Vibrant electric indigo text |
| **Headings & Body** | `dark:text-white`, `dark:text-gray-100`, `dark:text-gray-300` | Crisp white & light gray text |
| **Muted Text** | `dark:text-gray-400`, `dark:text-gray-500` | Secondary metadata and labels |
| **Primary CTA Button** | `dark:from-indigo-600 dark:to-indigo-700 dark:hover:from-indigo-500 dark:hover:to-indigo-600 text-white shadow-lg shadow-indigo-600/30` | Luminous indigo action button |
| **Secondary Button** | `dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-700` | Dark slate button |
| **Badge / Tag** | `dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-700/50` | Deep indigo pill badge |
| **Active Tabs & Links** | `dark:border-indigo-400 dark:text-indigo-400 font-bold` | Bottom border indicator with indigo text |
| **Form Inputs** | `dark:bg-gray-950 dark:border-gray-700 dark:text-white dark:focus:ring-indigo-500` | Dark inputs with indigo glow |
| **Slider Thumbs** | `dark:[&::-webkit-slider-thumb]:bg-indigo-500` | Indigo scrubber thumb on player |
| **Active List Items** | `dark:bg-indigo-600/20 dark:border-indigo-500/50 dark:text-white` | Active lecture in curriculum playlist |

---

## 🟢 3. Shared Semantic Colors

These semantic colors remain consistent across both light and dark themes:

- **Success / Completion**:
  - Light: `bg-emerald-100 text-emerald-800 border-emerald-300` | Icon: `text-emerald-600` | Button: `bg-emerald-600 hover:bg-emerald-700 text-white`
  - Dark: `dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700` | Icon: `dark:text-emerald-400`
- **Ratings & Reviews**:
  - Stars: `text-amber-400 fill-amber-400` or `text-amber-500 fill-current` (Always golden across all themes).
- **Video Cinema Container**:
  - Direct video player box: `bg-black` (Pure cinema black for maximum video visual fidelity).
- **Danger / Deletion**:
  - `text-rose-500 hover:text-rose-600` or `bg-rose-600 hover:bg-rose-700 text-white`.
