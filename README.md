This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Vista privada de Analytics / Benchmarking

Se agregó una vista aislada para operar el flujo de benchmarking del proyecto sin modificar la navegación principal.

- Ruta privada por enlace directo: `/lab/riff-benchmark-analytics-7f3k`
- No está enlazada desde `Header`, `Sidebar` ni `MobileNav`
- Requiere sesión activa del frontend
- Permite consultar:
  - estado del gateway de analytics
  - resumen general
  - métricas exportables
  - snapshots locales
  - configuración experimental
- Permite ejecutar acciones manuales:
  - workload de prueba
  - generación de snapshot
  - exportación a BigQuery
  - guardado temporal de access token OAuth

### Uso rápido

1. Inicia sesión en la app.
2. Abre manualmente la ruta privada en el navegador.
3. Si necesitas exportar a BigQuery, inicia el flujo OAuth desde la misma vista y pega el `access_token` temporal.

### Archivos principales

- `src/app/lab/riff-benchmark-analytics-7f3k/page.tsx`
- `src/app/components/analytics/BenchmarkDashboard.tsx`
- `src/app/hooks/useAnalyticsBenchmark.ts`
- `src/app/components/analytics/BenchmarkQueryPerformanceChart.tsx`
- `src/app/components/analytics/BenchmarkSnapshotTrendChart.tsx`
