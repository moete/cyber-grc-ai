# Frontend Architecture Overview

The frontend architecture is built around the principles of component-based design, using React.js, and leverages TypeScript for static typing, which provides robustness and autocompletion capabilities. We aim to make our components as generic and reusable as possible to ensure consistency throughout the app and optimize our development process.

The primary directories are `Components`, `Contexts`, `Features`, `Utils`, and `Routes`.

## React Components

We use React Components to encapsulate parts of the user interface (UI). They make it possible to split the UI into independent, reusable pieces. Generic components, which are even more reusable, are stored in the `Elements` directory.

### Components Specifics

Here are some specific components used in the application:

- `Card`: Displays information about a solution, including name, description, user info, date, and an edit button.
- `CustomNotification`: A component that renders a custom notification based on its type, content, and name.
- `Breadcrumb`: A dynamic navigation element that updates based on the current URL, providing a "breadcrumb" trail for the user.
- `ContentLayout`: A wrapper component that provides a consistent layout for page content.
- `Notification`: A popup component for notifications.
- `ResourcesTable`: A table present in each solution that holds multiple `ResourcesWrapper` components.
- `ResourcesWrapper`: A wrapper that displays all products of a type in a solution.
- `SearchBarContent`: An Elastic Search bar.
- `Sidebar`: The sidebar component of the application.
- `Stepper`: Manages the different steps in the creation or editing side panel (for a solution or a Data & AI product).
- `TooltipWrapper`: A wrapper for a Tooltip component, generally triggered on hover over an information icon.
- `TooltipForm`: Contains a required title and description, along with an optional example value, default value, or options and their associated values.

### Elements

The `Elements` directory contains even more generic, reusable components:

- `Button`, `ConfirmationDialog`, `ContentPlaceHolder`, `DateDisplay`, `Dialog`, `Drawer`, `EnvChip`, `EnvTag`, `Icon`, `Link`, `MDPreview`, `Modals`, `ProviderDisplay`, `ProviderTag`, `ResourceGroupDisplayer`, `ResourceGroupsDisplayer`, `ResourceTag`, `Spinner`, `StatusDisplayer`, `TabButton`, `Table`, `UserDisplay`, and more.

These are components we use across multiple features and parts of our app, aiding in the creation of a consistent look and feel.

## Contexts

We use React Contexts for state management. Context provides a way to pass data through the component tree without having to pass props down manually at every level, leading to more readable and maintainable code.

## Features

The `Features` directory contains business logic and state management related to a specific feature of the application.

## Utils

The `Utils` directory holds utility functions and common helpers that are used across the application. This allows us to maintain cleaner code and avoid repetition.

## Routes

We use React Router for routing in our application. It enables us to render different components based on the current URL, making the application faster. We've implemented protected routes that require authentication, increasing the security of our application.
