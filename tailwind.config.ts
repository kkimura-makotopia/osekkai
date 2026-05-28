import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ロゴのトーンに合わせたブランドカラー
        brand: {
          // ロゴの濃紺
          navy: '#0A2540',
          'navy-700': '#163A5F',
          'navy-800': '#0F2D4D',
          'navy-900': '#08203A',
          'navy-950': '#061A30',
          // ロゴの明るいスカイブルー
          sky: '#1E9CE6',
          'sky-400': '#3FB1F0',
          'sky-500': '#1E9CE6',
          'sky-600': '#0F87CC',
        },
      },
    },
  },
  plugins: [],
}
export default config
