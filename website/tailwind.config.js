/** @type {import('tailwindcss').Config} */
module.exports = {
  corePlugins: {
    preflight: false,
  },
  content: [
    "./blog/**/*.{ts,tsx,mdx,md}",
    "./docs/**/*.{ts,tsx,mdx,md}",
    "./shared/**/*.{ts,tsx,mdx,md}",
    "./src/components/**/*.{ts,tsx,mdx,md}",
    "./src/pages/**/*.{ts,tsx,mdx,md}",
    "./use-cases/**/*.{ts,tsx,mdx,md}",
  ],
  theme: {
    extend: {
      colors: {
        metared: "rgb(152, 28, 93)",
        metablue: "rgb(16, 29, 81)",
      },
    },
  },
  plugins: [require("@tailwindcss/container-queries")],
};
