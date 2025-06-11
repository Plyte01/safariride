// tailwind.config.ts
import type { Config } from 'tailwindcss'
const { fontFamily } = require('tailwindcss/defaultTheme') // if you want to extend default fonts

const config = {
  
  // ... other shadcn config (darkMode, content, prefix, theme.container, theme.extend.colors etc.)
  theme: {
    container: { /* ... */ },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans], // Use Inter as the primary sans-serif
      },
      // ... other extensions (colors, keyframes, borderRadius etc.)
    },
  },
  plugins: [
    require('tailwindcss-animate'), // Often used with Shadcn/UI
    require('@tailwindcss/typography'), // For the `prose` classes
    // require('@tailwindcss/forms'), // If you want default form styling (optional)
  ],
} satisfies Config

export default config