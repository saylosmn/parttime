import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Mongoose populate()-ийн үр дүнг типлэхэд хааяа хэрэгтэй
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'android/**', 'public/sw.js', 'next-env.d.ts'] },
];

export default config;
