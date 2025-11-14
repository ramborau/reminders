# BotPe Reminders App

A powerful, automated reminder system that enables users to create and manage monthly and yearly reminders with customizable webhook notifications.

## Features

- **Flexible Trigger System**: Create multiple triggers per component with precise timing (before/after/exact date)
- **Bulk Import**: Upload hundreds of records via CSV/XLS with smart column mapping
- **Webhook Integration**: Seamlessly integrate with any external system via webhooks
- **Complete Visibility**: Dashboard showing upcoming reminders and webhook execution history
- **Zero Limits**: Unlimited components and records per user

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, ShadCN UI
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or hosted)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd reminders
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL`: Your PostgreSQL connection string
- `BETTER_AUTH_SECRET`: A random 32+ character string for auth encryption
- `BETTER_AUTH_URL`: Your app URL (http://localhost:3000 for development)

4. Set up the database:
```bash
npm run db:generate
npm run db:push
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Schema

The app uses the following main models:

- **User**: User accounts with authentication
- **Component**: Collections of records (e.g., "EMI Reminders", "Birthdays")
- **Trigger**: Rules defining when webhooks should fire
- **Record**: Individual entries (clients, events, etc.)
- **WebhookLog**: Execution history of webhook calls

## Project Structure

```
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components (ShadCN)
│   │   └── features/    # Feature-specific components
│   ├── lib/             # Utility functions and configurations
│   └── types/           # TypeScript type definitions
├── prisma/
│   └── schema.prisma    # Database schema
└── public/              # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:migrate` - Create and run migrations

## Usage

### Creating a Component

1. Login to your account
2. Click "Create New Component"
3. Enter component details:
   - Name (e.g., "Home Loan EMI Reminders")
   - Occurrence Type (Monthly or Yearly)
   - Webhook URL
4. Add triggers (e.g., "3 days before at 9:00 AM")
5. Save the component

### Adding Records

**Manual Entry:**
1. Open a component
2. Click "Add Record"
3. Fill in Name, Mobile, EMI, and Date
4. Save

**Bulk Import:**
1. Open a component
2. Click "Import Records"
3. Upload CSV or Excel file
4. Map columns to required fields
5. Review and import

### Webhook Payload

When a trigger fires, a POST request is sent to your webhook URL:

```json
{
  "component": {
    "id": "comp_abc123",
    "name": "Home Loan EMI Reminders",
    "type": "monthly"
  },
  "record": {
    "id": "rec_xyz789",
    "name": "John Doe",
    "mobile": "919876543210",
    "emi": 35000,
    "date": "15"
  },
  "trigger": {
    "id": "trig_def456",
    "offset": 3,
    "direction": "before",
    "time": "09:00 AM"
  },
  "execution": {
    "triggered_at": "2025-11-12T09:00:00+05:30",
    "scheduled_for": "2025-11-15",
    "timezone": "Asia/Kolkata"
  }
}
```

## Deployment

This app is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

## License

Proprietary - BotPe

## Support

For issues or questions, please contact support@botpe.com
