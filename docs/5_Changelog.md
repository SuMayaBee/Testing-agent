# Changelog

All notable changes to the Testing Agent Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Implemented batch test execution functionality (issue #43)
  - Added "Run All" button to run all tests at once
  - Added "Run Selected" button to run multiple selected tests
  - Tests continue running in the background even when the browser is closed
  - Added visual indicators in the Simulations page to show running tests
- Error tracking and reporting capabilities
- Improved user interface for mobile devices
- Advanced filtering options for test results

## [0.1.12] - 2023-06-25

### Changed

- Completely redesigned test execution and evaluation flow:
  - Modified RunTest component to handle tasks as a continuous conversation flow
  - Changed evaluation to occur once at the end based on the complete transcript
  - Updated the UI to show task sequence and combined transcript
- Improved test results comparison interface:
  - Added unified metrics comparison table
  - Added transcript comparison view
  - Better visualization of metric differences between runs
- Updated SimulationsPage to reflect the new approach to test execution
- Enhanced TestDetail page with a better overview of test flow and recent runs

### Fixed

- Fixed issue with metric evaluation timing
- Resolved UI inconsistencies in test execution progress display
- Fixed metric type identification and grouping

## [0.1.10] - 2023-06-15

### Added

- Implemented version comparison UI for test results
- Added visualization charts for comparative metrics
- Export functionality for comparison data

### Fixed

- Resolved UI inconsistencies in dark mode
- Fixed scrolling issues in tables with many rows

## [0.1.11] - 2023-05-10

### Changed

- Restructured the codebase for better maintainability
  - Organized components by feature domain
  - Improved folder structure
  - Enhanced code reusability

## [0.1.8] - 2023-04-20

### Added

- Created test management UI
  - Test creation interface with task and metric selection
  - Test detail view with execution history
  - Test editing capabilities
- Added test execution interface with real-time status updates
- Implemented test results dashboard

### Fixed

- Resolved issues with form submissions
- Fixed organization switching bugs

## [0.1.6] - 2023-03-01

### Added

- Created metrics management UI
  - Metrics listing view
  - Metric creation and editing forms
  - Support for both generic and task-specific metrics
- Performance scoring visualization
- Metric evaluation details view

## [0.1.5] - 2023-02-15

### Added

- Created task management UI
  - Task listing view with search and filter
  - Task creation form with validation
  - Task detail view with associated metrics
  - Task editing capabilities
- Implemented task organization by categories

## [0.1.3] - 2023-02-01

### Changed

- Updated navigation and layout
  - Improved sidebar navigation
  - Added breadcrumb navigation
  - Implemented responsive design for all screen sizes
  - Enhanced header with organization selector

## [0.1.2] - 2023-01-15

### Added

- Initial project setup with React and Vite
- Setup Firebase authentication
  - User login/logout functionality
  - Protected routes
  - Organization access control
- Basic API client implementation
- Routing with React Router
- Tailwind CSS integration for styling
- Context providers for global state management

## How to Update This Changelog

For each new release or significant change, please add a new section at the top of the Unreleased section with the following format:

```markdown
## [0.1.X] - YYYY-MM-DD

### Added

- New features

### Changed

- Changes to existing functionality

### Deprecated

- Features that will be removed in upcoming releases

### Removed

- Features that were removed

### Fixed

- Bug fixes

### Security

- Vulnerability fixes
```

Move the contents of "Unreleased" to the new version section when releasing.
