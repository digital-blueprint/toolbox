# DBP Overview App

[GitLab Repository](https://gitlab.tugraz.at/vpu-private/dbp-overview/dbp-overview-app)

This is an experimental app to display search results for a typesense instance running in GitLab's CI.
See [DBP Overview Feeder](https://gitlab.tugraz.at/vpu-private/dbp-overview/dbp-overview-feeder)

## Local development

```bash
# get the source
git clone git@gitlab.tugraz.at/vpu-private/dbp-overview/dbp-overview-app
cd dbp-overview-app
git submodule update --init

# install dependencies
yarn install

# constantly build dist/bundle.js and run a local web-server on port 8001 
yarn run watch

# same as watch, but with babel, terser, etc active -> very slow
yarn run watch-full

# run tests
yarn test

# build for deployment
yarn build
```

Jump to <https://localhost:8001> and you should get the search/result page.

Setup your local Typesense service instance as described in `README.md`
of [DBP Overview Feeder](https://gitlab.tugraz.at/vpu-private/dbp-overview/dbp-overview-feeder)

## Documentation

About search results, see:

- https://typesense.org/docs/guide/
- https://github.com/typesense/typesense-js
- https://github.com/typesense/typesense-instantsearch-adapter
- https://github.com/algolia/instantsearch.js
