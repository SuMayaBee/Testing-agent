# Batch Test Execution

## Overview

The batch test execution feature allows users to run multiple tests simultaneously, making it easier and more efficient to test phone agents at scale. Tests continue running in the background, even if the user closes their browser or navigates away from the page.

## Features

### Running Multiple Tests

There are two ways to execute multiple tests at once:

1. **Run Selected Tests**: Select specific tests using checkboxes and click the "Run Selected" button
2. **Run All Tests**: Run all tests in the current view by clicking the "Run All" button

### Background Execution

- Tests are queued on the server and processed one by one in the background
- Test execution continues even if the user closes their browser
- All test results are automatically archived and accessible in the Simulations page

### Real-time Status Tracking

- The Simulations page displays currently running tests with "In progress" status
- Completed tests automatically appear in the Simulations page with their scores

## How to Use

### Running Selected Tests

1. Navigate to the Tests page
2. Select the checkbox next to each test you want to run
3. Click the "Run Selected" button at the top of the page
4. Confirm the execution in the dialog box
5. A notification will appear confirming the tests have been queued

### Running All Tests

1. Navigate to the Tests page
2. Click the "Run All" button at the top of the page
3. Confirm the execution in the dialog box
4. A notification will appear confirming the tests have been queued

### Viewing Test Progress and Results

1. Navigate to the Simulations page
2. Currently running tests will appear with an "In progress" indicator
3. Once tests complete, they will show their scores and status
4. Click "View Details" to see the complete test results

## Implementation Details

### Frontend Components

- **TestsList.jsx**: Contains UI for selecting and running multiple tests
- **SimulationsPage.jsx**: Displays running tests and completed test results

### Backend Services

- Tests are executed via a queue system that processes tests sequentially
- Each test is executed independently with its own call session
- Results are saved automatically upon completion

### API Endpoints

- `POST /voice-agent/execute-batch`: Queue multiple tests for execution
- `GET /voice-agent/queue-status`: Get status of currently running tests

## Limitations

- Tests are executed one at a time to prevent overloading the telephony system
- Phone numbers must be configured for each test before batch execution
- Tests without phone numbers will be skipped during batch execution

## Troubleshooting

If tests are not appearing in the Simulations page after execution:

1. Check that the tests have valid phone numbers configured
2. Verify that the backend service is running properly
3. Check the browser console for any error messages

## Future Enhancements

Planned improvements to the batch execution feature:

1. Scheduling test runs for specific times
2. Priority queue for important tests
3. More detailed progress reporting
4. Email notifications when batch runs complete
