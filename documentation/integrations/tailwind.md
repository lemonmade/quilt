# Using [Tailwind CSS](https://tailwindcss.com)

Tailwind CSS is a utility-first CSS framework. It lets you write class names in your HTML that maps to a consistent set of colors, spacing values, typography, and more.

When [building an application](TODO), Quilt automatically sets up [PostCSS](https://postcss.org) to run on CSS files in your project. Tailwind is built to [work well with PostCSS](https://tailwindcss.com/docs/installation/using-postcss), so setting Tailwind up to work in a Quilt project can be done in a few short steps.

1. Install Tailwind CSS in your workspace:

   ```sh
   pnpm add -W --save-dev tailwindcss
   ```

2. Add a Tailwind configuration file to your project. Tailwind currently only allows you to write configuration in CommonJS format. Because Quilt requires you to [use native ESModules for your local development environment](TODO), you must write your configuration in a `tailwind.config.**c**js` file:

   ```js
   // tailwind.config.cjs
   // @see https://tailwindcss.com/docs/configuration
   module.exports = {
     // Update this pattern to match where Tailwind-using files are in your repo!
     content: ['./app/**/*.tsx'],
     theme: {
       extend: {},
     },
     plugins: [],
   };
   ```

3. Configure PostCSS to load the Tailwind plugin. You can do this in any of the locations where [PostCSS searches for your configuration](https://www.npmjs.com/package/postcss-load-config). We recommend using the `postcss` key in your root `package.json` to avoid adding an extra configuration file to your project.

   ```json
   // package.json
   {
     "postcss": {
       "plugins": {
         "tailwind": {}
       }
     }
   }
   ```

4. Add a `.css` file to your project that imports Tailwind’s directives into your project. You can put these imports anywhere, but we recommend using a CSS file that applies global styles to your application. If you don’t have such a CSS file, we suggest creating an `App.css` that is imported by your main `App.tsx` file:

   ```css
   /* App.css */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

   ```tsx
   // App.tsx

   import './App.css';

   export default function App() {
     // Your app goes here!
   }
   ```

5. Start using Tailwind’s [many utility classes](https://tailwindcss.com/docs/utility-first) to style your application to your heart’s content! Your Tailwind styles will automatically be hot reloaded in development and [optimized in production](https://tailwindcss.com/docs/optimizing-for-production), so you’re free to concentrate on the fun part: building a beautiful website.
