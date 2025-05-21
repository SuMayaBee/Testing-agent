# Code Structure

The Testing Agent Frontend follows a component-based architecture using React. This document outlines the codebase organization to help you understand and navigate the project structure.

## Directory Structure

```
testing-agent-frontend/
├── src/                   # Source code
│   ├── components/        # React components
│   │   ├── tasks/         # Task management components
│   │   │   ├── TasksList.jsx      # List of tasks
│   │   │   ├── CreateTask.jsx     # Task creation form
│   │   │   ├── EditTask.jsx       # Task editing form
│   │   │   └── TaskDetail.jsx     # Task details view
│   │   ├── metrics/      # Metrics management components
│   │   │   ├── MetricsList.jsx    # List of metrics
│   │   │   ├── CreateMetric.jsx   # Metric creation form
│   │   │   ├── EditMetric.jsx     # Metric editing form
│   │   │   └── MetricDetail.jsx   # Metric details view
│   │   ├── tests/        # Test management components
│   │   │   ├── TestsList.jsx      # List of tests with batch run functionality
│   │   │   ├── CreateTest.jsx     # Test creation form
│   │   │   ├── EditTest.jsx       # Test editing form
│   │   │   ├── TestDetail.jsx     # Test details view
│   │   │   ├── RunTest.jsx        # Test execution interface
│   │   │   └── CompareResults.jsx # Test comparison interface
│   │   ├── simulations/   # Simulation components
│   │   │   └── SimulationsPage.jsx # View and manage simulations, shows running tests
│   │   └── common/       # Shared components
│   │       ├── Navbar.jsx         # Navigation bar
│   │       ├── Sidebar.jsx        # Sidebar navigation
│   │       ├── Button.jsx         # Reusable button component
│   │       ├── Table.jsx          # Reusable table component
│   │       └── Loading.jsx        # Loading state component
│   ├── context/          # React context providers
│   │   ├── AppContext.jsx   # Application-wide state
│   │   └── AuthContext.jsx  # Authentication state
│   ├── lib/              # Utilities and libraries
│   │   ├── api/          # API client modules
│   │   │   ├── index.js         # API exports
│   │   │   ├── tasksAPI.js      # Task API functions
│   │   │   ├── metricsAPI.js    # Metrics API functions
│   │   │   ├── testsAPI.js      # Tests API functions
│   │   │   └── simulationsAPI.js # Simulations API functions
│   │   ├── utils/        # Utility functions
│   │   └── hooks/        # Custom React hooks
│   ├── App.jsx           # Main app component with routing
│   └── main.jsx          # Application entry point
├── public/               # Public assets
├── index.html            # HTML template
└── vite.config.js        # Vite configuration
```

## Key Components

### Component Layer (`src/components/`)

The components are organized by feature domain:

- **Task Components**: Manage creation, viewing, and editing of tasks
- **Metric Components**: Manage creation, viewing, and editing of metrics
- **Test Components**: Manage creation, viewing, editing, and execution of tests
- **Simulation Components**: View and manage test simulation results
- **Common Components**: Reusable UI elements shared across the application

Each feature domain typically includes:

- List view (displays all items)
- Detail view (displays a single item)
- Create form (for creating new items)
- Edit form (for modifying existing items)

### Context Layer (`src/context/`)

- **AppContext**: Provides application-wide state such as the selected organization
- **AuthContext**: Manages authentication state and user information

### API Layer (`src/lib/api/`)

Each API module contains functions for making HTTP requests to the backend:

- **tasksAPI**: Functions for CRUD operations on tasks
- **metricsAPI**: Functions for CRUD operations on metrics
- **testsAPI**: Functions for CRUD operations on tests and test execution
- **voiceAgentAPI**: Functions for test execution, transcripts and call management
  - **runTestCall**: Execute a single test
  - **runBatchTests**: Execute multiple tests in the background
  - **getQueueStatus**: Get status of test execution queue
  - **getTranscript**: Get transcript for a test
  - **getAllArchivedConversations**: Get all archived test conversations

### Utils and Hooks (`src/lib/`)

- **utils/**: General utility functions for formatting, validation, etc.
- **hooks/**: Custom React hooks for shared functionality

## Routing Structure

The application uses React Router for navigation with the following main routes:

- `/tasks`: Task management

  - `/tasks/create`: Create a new task
  - `/tasks/:taskId`: View task details
  - `/tasks/:taskId/edit`: Edit a task

- `/metrics`: Metric management

  - `/metrics/create`: Create a new metric
  - `/metrics/:metricId`: View metric details
  - `/metrics/:metricId/edit`: Edit a metric

- `/tests`: Test management

  - `/tests/create`: Create a new test
  - `/tests/:testId`: View test details
  - `/tests/:testId/edit`: Edit a test
  - `/tests/:testId/run`: Run a test
  - `/tests/:testId/compare`: Compare test results

- `/simulations`: View and analyze test simulation results
  - Shows both completed test results and currently running tests

## Data Flow

1. **User interaction**: User interacts with a component
2. **API call**: Component calls appropriate API function
3. **Backend communication**: API function makes HTTP request to backend
4. **State update**: Component updates local state with response data
5. **Render**: Component re-renders with updated data

## Test Execution and Evaluation Flow

### Single Test Execution

1. User selects a test to run from the TestDetail page
2. The RunTest component handles the test execution:
   - Displays the sequence of tasks to be executed
   - Shows a real-time transcript of the entire conversation
   - Tracks the progress of tasks within the flow
3. Once the test completes:
   - All metrics (both generic and task-specific) are evaluated based on the full transcript
   - The results are displayed with individual metric scores and an overall score
4. Users can save the results for later comparison

### Batch Test Execution

1. User selects multiple tests or clicks "Run All" from the TestsList page
2. The system queues all tests for execution in the background
3. Tests run one at a time on the server, even if the user closes their browser
4. The SimulationsPage shows running tests with "In progress" status
5. Once tests complete, they appear in the SimulationsPage with scores and results
6. Users can view detailed results for each completed test

### Result Comparison

The CompareResults component allows comparing multiple test runs:

- Overall scores and metrics are compared side by side
- Transcripts can be viewed to analyze differences in conversations

## Best Practices

- Components follow a functional approach with React hooks
- Context is used for global state management
- API calls are abstracted into dedicated modules
- Reusable components are kept in the common directory
- Each component has a single responsibility
