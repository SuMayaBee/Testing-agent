# Testing Agent Frontend - Project Overview

## Introduction

The Testing Agent Frontend is a React-based web application designed to provide a user interface for creating, managing, and executing tests for the Phoneline Agent. It interfaces with the Testing Agent Backend to store and retrieve data, enabling users to evaluate Phoneline Agent's performance through simulated customer calls.

## Core Concepts

### Tasks
Individual testing scenarios that form a complete conversation flow for the Phoneline Agent to handle, such as:
- Ordering a specific menu item
- Changing an order mid-conversation
- Attempting to order items not on the menu
- Validating proper address collection

Tasks are executed in sequence as part of a continuous conversation during a test.

### Metrics
Measurement criteria for evaluating the Phoneline Agent's performance:
- **Generic Metrics**: Applied to all tests (e.g., call completion rate, time to complete)
- **Task-specific Metrics**: Custom metrics for specific testing scenarios

Metrics are evaluated once at the end of the test based on the complete conversation flow.

### Tests
Collections of tasks bundled together with a system prompt and target phone numbers to call. Tests represent a complete conversation flow where tasks are executed sequentially in a single call.

### Simulations
The actual execution of a test against the Phoneline Agent at a specific phone number. A simulation produces a single transcript containing the entire conversation flow, which is then evaluated against all metrics.

### Transcripts
Recorded conversation data from simulations, which is evaluated using metrics. A transcript contains the complete conversation covering all tasks in the test flow.

### Comparisons
Performance comparisons between different Phoneline Agent versions or different test runs.

## System Architecture

The Testing Agent Frontend is built using:
- React.js for the user interface
- React Router for navigation
- Tailwind CSS for styling
- Context API for state management
- Axios for API communications

The application communicates with the Testing Agent Backend via RESTful APIs to manage tasks, metrics, tests, simulations, and analysis of results.

## Workflow

1. Users create and manage tasks with specific instructions
2. Users define metrics to evaluate agent performance
3. Users create tests by combining tasks and metrics in a sequence that forms a complete conversation flow
4. Users run simulations against target phone numbers
5. The system captures a full transcript of the conversation and evaluates performance using all defined metrics at once
6. Users can compare results across different agent versions or test runs 