# Express Server-Sent Events

Express API using SSE (Server-Sent Events) on the backend, and React with Vite on the frontend.

## SSE Definition

https://en.wikipedia.org/wiki/Server-sent_events

https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

## Description

This project was created as SSE implementation example both in backend and frontend.
The backend sends json events randomly every 1/10 seconds with the actual date.
The frontend recieve the events and presents the values in a list of cards updated in real time.

## Objectives

- Create an API using Express.js with TypeScript to send SSE in random intervals using an http endpoint.
- Receive and display the events in real time in the frontend and show the connection status.

## Installation

To set up the project, follow these steps:

Clone the repository: git clone https://github.com/emisasal/express-server-sent-event
Navigate to the project directory: `cd express-server-sent-event`
Install dependencies in /backend and /frontend with `npm install`
Start the server with `npm run dev` in /backend, and the frontend with `npm run dev` in /frontend

## Technologies

- TypeScript

Backend:

- Node.js
- Express.js
  SSE (Server-Sent Events)

Frontend:

- React (Vite)
