# OLL Chatbox — Improvement TODOs

## Code Quality
- [x] **1. Extract shared modules** — i18n, fieldMeta, fieldLabels, SWISS_CANTONS, parseSyllogism, resolveFieldMeta, formatComputedValue are duplicated between index.html and App.js. Extract to shared JS modules.
- [ ] **2. Deduplicate CSS** — `.msg.bot` and other rules are defined twice in App.css. Clean up duplicate declarations.
- [ ] **3. Extract inline styles** — index.html uses inline `<style>` blocks; move to a shared stylesheet.

## UX / Accessibility
- [ ] **4. Add field validation feedback** — Show inline error messages for invalid inputs (e.g. non-numeric in number fields, out-of-range values) instead of silent rejection.
- [ ] **5. Loading indicator during API calls** — Show a spinner or "thinking..." indicator while waiting for the backend response after form submission.
- [ ] **6. Keyboard navigation for forms** — Ensure Tab order is logical and Enter submits the form from any field.
- [ ] **7. ARIA labels and roles** — Add `aria-label`, `role="alert"` for errors, `aria-live` for dynamic content to improve screen reader support.
- [ ] **8. Improve language switcher feedback** — Currently the language switch is silent; consider showing a brief toast or visual cue confirming the change.

## Robustness
- [ ] **9. API error handling** — Display a user-friendly message when the backend is unreachable or returns an error, instead of failing silently or showing raw error text.
- [ ] **10. Input sanitization** — Validate and coerce inputs more defensively before sending to the API (e.g. trim whitespace, handle locale-specific decimal separators).
- [ ] **11. Retry / timeout logic** — Add a timeout for API calls and offer a retry button if the request fails.

## Responsive Design
- [ ] **12. Mobile layout for forms** — The table-based missing-fields form may not render well on narrow screens. Add responsive breakpoints.
- [ ] **13. Chat container sizing** — Fixed height on `.chat-view` may clip on small viewports or waste space on large ones. Consider dynamic sizing.
- [ ] **14. Mobile chat input** — Send button text may be cramped on narrow screens; consider an icon fallback.

## Security
- [ ] **15. Reduce innerHTML usage** — index.html's `addBotHtml()` injects raw HTML. While inputs are escaped via `escapeHtml()`, the pattern is fragile. Consider using DOM APIs or a template engine instead.
