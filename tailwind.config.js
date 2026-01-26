/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#fa5404',
        'brand-light': '#fff9f3',
        secondary: '#334155',
        accent: '#fa5404',
        'bran-orange': '#ff8811',
        'bran-orange-light': '#ff9922',
        'bran-orange-dark': '#ee7711',
        'bran-orange-darker': '#dd6600',
        'bran-orange-darkest': '#cc5500',
        'bran-orange-darkestest': '#bb4400',
        'bran-orange-darkestestest': '#aa3300',
        'bran-orange-darkestestestest': '#992200',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        'orange-200': '0 4px 14px 0 rgba(250, 84, 4, 0.25)',
      },
    },
  },
  plugins: [],
}
