/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "background": "#FDFBF7",
        "on-background": "#121212",
        "primary": "#C25E00",
        "primary-container": "#944600",
        "accent-emerald": "#2E403B",
        "surface": "#FDFBF7",
        "surface-container": "#F5F2ED",
        "surface-container-low": "#F9F7F2",
        "surface-container-high": "#F0EDE8",
        "on-surface": "#121212",
        "on-surface-variant": "#555555",
        "outline": "#897265",
        "outline-variant": "#E8E4DE"
      },
      borderRadius: {
        "DEFAULT": "4px",
        "lg": "8px",
        "xl": "16px",
        "full": "9999px"
      },
      fontFamily: {
        "mono": ["JetBrains Mono", "monospace"],
        "headline": ["JetBrains Mono", "monospace"],
        "body": ["JetBrains Mono", "monospace"],
        "label": ["JetBrains Mono", "monospace"]
      }
    }
  }
}
