# Archive Assistant Services

Archive Assistant Services is a Node.js application that manages the workflow of automatically archiving and distributing iOS applications using Fastlane. This application has the capability to manage users, control the distribution queue, and automatically create application versions. The core components of the project include Node.js, Express.js, and Fastlane. Node.js and Express.js are used for server-side operations and services, while Fastlane manages the automatic distribution of iOS applications. Express.js services are utilized to initiate Fastlane lanes and process them automatically when needed.

## Getting Started

To get started with this project, you can follow the steps below:

1.  Clone the project repository to your computer.
2.  Ensure that the `appfile` is configured according to your needs.
3.  Make sure that Fastlane is installed on your computer. If it's not installed, you can use the following command to install it:

```bash
brew install fastlane
```

4.  Install the required dependencies to work in the project directory using the following command:

```bash
npm install
```

Note: For a stable experience when using the project, it's recommended to install the `nodemon` library. `nodemon` automatically restarts the project when an error occurs. You can install `nodemon` with the following command:

```bash
npm install -g nodemon
```

To start the project:

```bash
nodemon app.js
```

The application runs on port `3000` by default.

3.  After confirming that the application is running, you can send HTTP POST requests to the application to initiate the distribution of your iOS application.

## Users

This application provides user authentication. You can use the following services for user management:

- `/login`: Send a request to log in a user.
- `/addUser`: Send a request to add a new user.
- `/deleteUser`: Send a request to delete a user.
- `/changePassword`: Send a request to change a user's password.

Ensure that passwords are hashed with SHA1 when adding users.

## Distribution Management

This application automatically manages the distribution queue and archiving. You can use the following services for distribution management:

- `/startDeployment`: Send a request to initiate a new distribution process.
- `/removeAllQueue`: Send a request to clear the entire distribution queue.
- `/removeWithId`: Send a request to remove a specific distribution process from the queue.
- `/moveToFirst`: Send a request to move a specific distribution process to the front of the queue.
- `/getQueue`: Send a request to retrieve the current distribution queue.

## Example Usage

Before you begin, edit your Fastlane configuration file and set the required environment variables for the application. Then, you can follow these steps:

1.  To create an application version, send a POST request to the `/startDeployment` service. In the request body, specify the following parameters:

- `appName`: Name of your application.
- `versionNumber`: Version number.
- `buildNumber`: Build number.
- `appBranch`: Branch where the application's source code is located.
- `appScheme`: Xcode scheme.
- `whatsNew`: Update notes.
- `email`: User email (optional).

2.  After creating the application version, you can check the results using the `/getQueue` service. You can also see the results when the distribution process is completed.

## Archive Assistant UI

You may want to explore the [Archive Assistant UI](https://github.com/leventozgur/Archive-Assistant-UI) project, which is a user interface (UI) application prepared for macOS. Archive Assistant UI provides a graphical interface that makes it easier to use this project.
