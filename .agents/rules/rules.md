---
trigger: always_on
---

# Project Rules: Nemo2 Web Transition (Finalized)

These rules govern all autonomous and guided development for the **Nemo2** web project. Every action taken by Antigravity must strictly adhere to these guidelines to ensure the project remains faithful to the original Android source, meets high-fidelity design standards, and follows the specified tech stack.

## 1. Core Source of Truth (Mandatory)
- **Primary Reference**: `E:/Web/Nemo_web/Android project/Nemo`
- **Zero Hallucination Policy**: Do not "guess" or "invent" business logic, SRS scheduling algorithms, or feature behaviors. If a feature exists in the Android version, it must be restored 1:1. If it does not exist, do not implement it unless explicitly requested.
- **Reference Checks**: Before implementing any core feature (Word Detail, Grammar List, Learning Logic), perform a deep-dive search into the Android project's `core` and `feature` modules.

## 2. Design System: UI/UX PRO MAX - Minimalist Flat
- **Design Standard**: Strictly follow `UI/UX PRO MAX`. The chosen visual style is **Minimalist Flat (极简扁平化)**.
- **Visual Tokens**:
    - **Palette**: Clean, high-contrast colors (#4F46E5 Indigo, #10B981 Emerald). Background: `#F9FAFB` (Off-white).
    - **Shapes**: Sharp or moderate rounding (8px-12px). Use 1px borders instead of shadows.
    - **Effects**: NO shadows, NO blurs, NO 3D effects. Use color blocking and whitespace for depth.
    - **Typography**: `Inter` or `Outfit` for a modern, geometric feel.
- **Micro-interactions**: Subtle opacity changes (0.8 on hover) and color shifts. Fast, snappy transitions (150ms).

## 3. Technical Stack & Architecture
- **Framework**: **Next.js 15+ (App Router)** with **TypeScript**.
- **Styling**: **Vanilla CSS (CSS Modules)** + CSS Variables. Use **Radix UI** for accessible primitives (Dialogs, Tabs, etc.).
- **Data Sync**: **TanStack Query** for Supabase synchronization.
- **Database**: **Supabase Nemo2** (ID: `fzzkxymwcambugbxfsvj`).
- **AI Integration**: Mandatory AI-driven features for pronunciation feedback and grammar explanation via Supabase Edge Functions.

## 4. Responsive & Layout Rules (Adaptive UI)
- **Mobile First**: Implement dedicated layouts for Mobile and Desktop. Do not use simple CSS scaling; if the screen is mobile, use a mobile-optimized layout (bottom navigation, large hit targets).
- **Hit Targets**: Minimum 44x44px for interactive elements.
- **Component Focused**: Build reusable `ClayComponent` primitives in `@/components/clay` before assembling pages.

## 5. Implementation Workflow
- **Rules Overridability**: These rules take precedence over general instructions.
- **No Placeholders**: Use `generate_image` for assets and ensure all examples use real language data from `dictionary_words`.
- **Verification**: All UI changes must be cross-verified against the Android screenshot/reference for functional parity.