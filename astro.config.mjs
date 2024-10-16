// @ts-check
import { defineConfig } from 'astro/config';
import deno from '@deno/astro-adapter';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: deno(),

  site: "https://img.chrsnv.ru",
  base: "/",
});