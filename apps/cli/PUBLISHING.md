# How to Publish this Package to NPM

This guide explains how to manually publish this CLI tool to the NPM registry.

## Prerequisites

1.  **NPM Account**: You need an account on [npmjs.com](https://www.npmjs.com/).
2.  **Login**: You must be logged in to npm in your terminal.

    ```bash
    npm login
    ```

## Preparation

1.  **Build the project**: Ensure the TypeScript code is compiled to JavaScript.

    ```bash
    npm run build
    ```
    *(Note: You need to add a "build" script to package.json: `"build": "tsc"`)

2.  **Update Version**: If you are updating an existing package, increment the version number in `package.json`.

    ```bash
    npm version patch # or minor, or major
    ```

## Publishing

1.  **Publish**: Run the publish command.

    ```bash
    npm publish --access public
    ```

## Verification

1.  **Check NPM**: Go to your profile on npmjs.com and check if the package is listed.
2.  **Test Install**: Try installing it globally on your machine.

    ```bash
    npm install -g git-ai-pilot
    ```

## Unpublishing (if needed)

If you made a mistake and want to remove it (within 72 hours):

```bash
npm unpublish git-ai-pilot --force
```
