# Testing Agent Frontend

A React-based frontend application for the Testing Agent platform, providing a user interface for managing testing scenarios, metrics, and simulations for the Phoneline Agent.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [API Integration](#api-integration)
- [Documentation](#documentation)
- [Contributing](#contributing)

## Overview

The Testing Agent Frontend provides a user-friendly interface for creating and managing tests for the Phoneline Agent. It allows users to define tasks, metrics, and test configurations, run simulations as continuous conversation flows, and analyze results.

## Features

- **Task Management**: Create, read, update, and delete testing tasks
- **Metrics Management**: Define and manage evaluation metrics for tasks
- **Test Configuration**: Combine tasks into cohesive conversation flows with metrics for evaluation
- **Test Execution**: Run tests as complete conversation flows against target phone numbers
- **Results Analysis**: View and compare test results with detailed metrics and transcript comparisons
- **Organization-based Data**: Organize data by organization

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- Testing Agent Backend running and accessible

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/testing-agent-frontend.git
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

### Configuration

The application uses environment variables for configuration:

- `VITE_API_BASE_URL`: URL of the Testing Agent Backend API
- `VITE_APP_TITLE`: Application title displayed in the browser
- `VITE_APP_VERSION`: Current version of the application
- `VITE_DEFAULT_ORGANIZATION`: Default organization to use if none selected

## Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. The application will be available at:
   ```
   http://localhost:5173
   ```

3. For production builds:
   ```bash
   npm run build
   ```

## Project Structure

```
testing-agent-frontend/
├── src/                  # Source code
│   ├── components/       # React components
│   │   ├── tasks/        # Task-related components
│   │   ├── metrics/      # Metrics-related components
│   │   ├── tests/        # Test-related components
│   │   ├── simulations/  # Simulation-related components
│   │   └── common/       # Shared components
│   ├── context/          # React context providers
│   ├── lib/              # Utilities and libraries
│   │   └── api/          # API client
│   ├── App.jsx           # Main app component
│   └── main.jsx          # Application entry point
├── docs/                 # Documentation
├── public/               # Public assets
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── postcss.config.js     # PostCSS configuration
```

## Technologies Used

- **React**: Frontend library for building user interfaces
- **React Router**: Navigation and routing
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API requests
- **Vite**: Build tool and development server
- **React Context**: State management
- **Heroicons**: Icon library

## API Integration

The frontend integrates with the Testing Agent Backend through a RESTful API client. The API client is organized into modules for different resource types:

- `tasksAPI`: Task management endpoints
- `metricsAPI`: Metrics management endpoints
- `testsAPI`: Test configuration and execution endpoints
- `simulationsAPI`: Simulation and results endpoints

## Test Execution Flow

The Testing Agent platform follows this approach for test execution:

1. **Test Configuration**: Tests are configured with a sequence of tasks that form a complete conversation flow
2. **Execution**: During execution, all tasks are run as part of one continuous conversation
3. **Transcript**: A single transcript is generated for the entire conversation
4. **Evaluation**: All metrics (both generic and task-specific) are evaluated once based on the complete transcript
5. **Results**: Scores are calculated for each metric and an overall score is determined
6. **Comparison**: Multiple test runs can be compared to analyze differences in performance

## Documentation

Detailed documentation is available in the `docs` directory:

- [Project Overview](docs/1_Project_Overview.md)
- [Setup Instructions](docs/2_Setup_Instructions.md)
- [Code Structure](docs/3_Code_Structure.md)
- [Common Issues](docs/4_Common_Issues.md)
- [Changelog](docs/5_Changelog.md)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request