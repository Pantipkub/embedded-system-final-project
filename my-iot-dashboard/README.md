This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Firebase RTDB Integration (Clothesline System)

- Status path: `/clothesline/status`
- Command path: `/clothesline/command` with property `motor` = `EXTEND` | `RETRACT` | `IDLE`

### Data Specification (Status)

The status object stored at `/clothesline/status`:

```
{
	"system_status": "Active",
	"temperature": 29.7,
	"humidity": 77,
	"water_level": 54,
	"clothesline_status": "Idle",
	"motor_status": "STOPPED",
	"led_indicator": "Connected",
	"timestamp": "2025-12-06T15:00:00Z"
}
```

### Mock Data

- Enable mock status publisher by setting `NEXT_PUBLIC_ENABLE_MOCK=true`.
- It will write a status object every ~3 seconds to `/clothesline/status`.

### Commands

- The dashboard sends commands by updating `/clothesline/command`:

```
{
	"motor": "EXTEND" | "RETRACT" | "IDLE",
	"updatedAt": <server timestamp>
}
```

Hardware must listen to `/clothesline/command/motor`, act on `EXTEND`/`RETRACT`, and then write back `IDLE` to prevent repeated actions.

## Dev Notes

- See `app/firebase.ts` for Firebase initialization, RTDB helpers, and mock publisher.
- The main UI in `app/page.tsx` shows realtime status and provides control buttons.

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
