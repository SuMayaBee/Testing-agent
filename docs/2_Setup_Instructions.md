# Setup Instructions

## Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Testing Agent Backend running and accessible

## Environment Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd testing-agent-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a local environment file:
   ```bash
   cp .env.local.example .env.local
   ```

4. Update the `.env.local` file with your configuration:
   ```
   VITE_API_BASE_URL=http://localhost:8000  # URL to your backend API
   VITE_APP_TITLE=Testing Agent
   VITE_APP_VERSION=1.0.0
   VITE_DEFAULT_ORGANIZATION=your-default-org
   ```

## Configuration

The application uses environment variables for configuration. Important variables include:

- `VITE_API_BASE_URL`: URL of the Testing Agent Backend API
- `VITE_APP_TITLE`: Application title displayed in the browser
- `VITE_APP_VERSION`: Current version of the application
- `VITE_DEFAULT_ORGANIZATION`: Default organization to use if none selected

## Development Mode

To run the application in development mode:

```bash
npm run dev
```

The application will be available at [http://localhost:5173](http://localhost:5173) and will automatically reload when you make changes to the code.

## Building for Production

To build the application for production:

```bash
npm run build
```

This will create optimized files in the `dist` directory that can be deployed to a web server.

## Running Tests

```bash
npm run test
```

## Linting and Code Formatting

```bash
npm run lint
npm run format
```

## Folder Structure

The frontend application follows this structure:

```
testing-agent-frontend/
├── src/                  # Source code
│   ├── assets/           # Static assets (images, etc.)
│   ├── components/       # React components
│   │   ├── tasks/        # Task-related components
│   │   ├── metrics/      # Metrics-related components
│   │   ├── tests/        # Test-related components
│   │   └── common/       # Shared components
│   ├── context/          # React context providers
│   ├── lib/              # Utilities and libraries
│   │   └── api/          # API client
│   ├── pages/            # Page components
│   ├── App.jsx           # Main app component
│   └── main.jsx          # Application entry point
├── public/               # Public assets
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── postcss.config.js     # PostCSS configuration
``` 