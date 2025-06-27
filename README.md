# selvbetjening-web

Frontend for the self-service provided by team-kundetjenester.

The application uses React Router as a framework. Concepts such as loaders and actions are therefore used throughout the app. This eliminates the need for complex state management and other libraries for fetching data, and makes it possible to enable/disable Server-Side Rendering (SSR) as needed without requiring too many changes.

The application was initially created with SSR enabled. While this did bring some benefits - potentially faster first-time-to-paint, storing secrets on the server, and improved SEO - it was later disabled to bring down the complexity involved in hydrating the state between the server and client.

If it becomes necessary or desirable to enable SSR again in the future, it can easily be achieved by removing `ssr: false` from `react-router.config.ts` and use `loader` and `action` in addition to or instead of `clientLoader` and `clientAction`. Please refer to the React Router documentation for more details.

## Webserver

Caddy is used as webserver to serve the generated static build and to generate a dynamic config response. A dynamic config based on runtime parameters is necessary to support one build for different environments (dev, systest, prod, etc.). See `Caddyfile` for implementation details.

## Build and deploy

The Dockerfile in the repo is used to build and deploy the application.

The application can be started using e.g. Docker Compose:

```bash
docker compose up
```

Remember to create an .env file according to requirements listed below.

## Configuration

Create the file `public/config.json` to configure the app during development.

When deploying with Docker and using Caddy as webserver, the response for `/config.json` is created on-the-fly by Caddy, which uses environment variables to populate the fields.

#### Required variables

- `API_URL` - The URL to selvbetjening-api.
- `BASE_URL` - The application's base URL, e.g. `http://localhost:3000`
  for local development.
- `OIDC_CLIENT_ID`
- `OIDC_ISSUER_BASE_URL` - URL to Ansattporten, e.g. `https://ansattporten.dev`
  for Ansattporten in systest.

#### Optional variables

- `ENVIRONMENT` - The environment in which the application is running. Values that affect the default behaviour are:
  - `test`
  - `prod`
- `PORT` - Port for the Caddy server (default: `8080`)

#### Configuration files

As `.env` file:

```
BASE_URL=http://localhost:3000
API_URL=https://selvbetjening-api.apps.eid-systest.norwayeast.aroapp.io
OIDC_CLIENT_ID=c6a676aa-4d50-4a33-bb64-dc59e4d66a5b
OIDC_ISSUER_BASE_URL=https://ansattporten.dev
```

Or as `public/config.json`:

```json
{
    "apiUrl": "http://localhost:8000",
    "baseUrl": "http://localhost:3000",
    "issuerBaseUrl": "https://ansattporten.dev",
    "clientId": "<client-id>"
}
```

## Development

Install the required dependencies using `npm`:

```sh
npm install
```

## Development mode

Enables live reloading with React Refresh and React Router Hot Data Revalidation.

Start in development mode:
- `npm run dev`

### Build and run

Build:
- `npm run build`

Run the final build:
- `npm run start`

### OpenAPI clients

`openapi-fetch` and `openapi-typescript` is used to generate OpenAPI clients for the selvbetjening-api.

To update the clients, set `API_URL` to the URL of the selvbetjening-api backend service and run the generator:

```sh
# To generate types from latest selvbetjening-api in systest; replace as needed.
API_URL=https://selvbetjening-api.apps.eid-systest.norwayeast.aroapp.io/v3/api-docs.yaml
npx openapi-typescript $API_URL -o app/lib/api.d.ts
```

### Authentication

Any interaction with the application, except for loading the front page,
requires the user to be logged in through Ansattporten.


### Internationalization

The application supports multiple languages, with the default set to Norwegian Bokmål. Translations are stored in the `public/translations` directory.

Remember to sort the translation keys before committing. This can be done with the command `npm run sort-translations`.
