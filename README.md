[![GitHub release](https://img.shields.io/github/release/crazy-max/ghaction-docker-login.svg?style=flat-square)](https://github.com/crazy-max/ghaction-docker-login/releases/latest)
[![GitHub marketplace](https://img.shields.io/badge/marketplace-docker--login-blue?logo=github&style=flat-square)](https://github.com/marketplace/actions/docker-login)
[![CI workflow](https://img.shields.io/github/workflow/status/crazy-max/ghaction-docker-login/ci?label=ci&logo=github&style=flat-square)](https://github.com/crazy-max/ghaction-docker-login/actions?workflow=ci)
[![Become a sponsor](https://img.shields.io/badge/sponsor-crazy--max-181717.svg?logo=github&style=flat-square)](https://github.com/sponsors/crazy-max)
[![Paypal Donate](https://img.shields.io/badge/donate-paypal-00457c.svg?logo=paypal&style=flat-square)](https://www.paypal.me/crazyws)

## About

GitHub Action to login against a Docker registry

If you are interested, [check out](https://git.io/Je09Y) my other :octocat: GitHub Actions!

![GitHub Pages](.github/ghaction-docker-login.png)

___

* [Usage](#usage)
  * [DockerHub](#dockerhub)
  * [GitHub Package Registry](#github-package-registry)
  * [GitLab](#gitlab)
* [Customizing](#customizing)
  * [inputs](#inputs)
* [Limitation](#limitation)
* [How can I help?](#how-can-i-help)
* [License](#license)

## Usage

### DockerHub

```yaml
name: ci

on:
  push:
    branches: master
    tags:

jobs:
  login:
    runs-on: ubuntu-latest
    steps:
      -
        name: Checkout
        uses: actions/checkout@v2
      -
        name: Login to DockerHub
        uses: crazy-max/ghaction-docker-login@v1
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_PASSWORD }}
```

### GitHub Package Registry

```yaml
name: ci

on:
  push:
    branches: master
    tags:

jobs:
  login:
    runs-on: ubuntu-latest
    steps:
      -
        name: Checkout
        uses: actions/checkout@v2
      -
        name: Login to DockerHub
        uses: crazy-max/ghaction-docker-login@v1
        with:
          registry: docker.pkg.github.com
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN }}
```

### GitLab

```yaml
name: ci

on:
  push:
    branches: master
    tags:

jobs:
  login:
    runs-on: ubuntu-latest
    steps:
      -
        name: Checkout
        uses: actions/checkout@v2
      -
        name: Login to GitLab
        uses: crazy-max/ghaction-docker-login@v1
        with:
          registry: registry.gitlab.com
          username: ${{ secrets.GITLAB_USERNAME }}
          password: ${{ secrets.GITLAB_PASSWORD }}
```

## Customizing

### inputs

Following inputs can be used as `step.with` keys

| Name             | Type    | Default                     | Description                        |
|------------------|---------|-----------------------------|------------------------------------|
| `registry`       | String  |                             | Server address of Docker registry. If not set then will default to Docker Hub |
| `username`       | String  |                             | Username used to log against the Docker registry |
| `password`       | String  |                             | Password or personal access token used to log against the Docker registry |
| `logout`         | Bool    | `true`                      | Log out from the Docker registry at the end of a job |

## Limitation

This action is only available for Linux [virtual environments](https://help.github.com/en/articles/virtual-environments-for-github-actions#supported-virtual-environments-and-hardware-resources).

## How can I help?

All kinds of contributions are welcome :raised_hands:! The most basic way to show your support is to star :star2:
the project, or to raise issues :speech_balloon: You can also support this project by
[**becoming a sponsor on GitHub**](https://github.com/sponsors/crazy-max) :clap: or by making a
[Paypal donation](https://www.paypal.me/crazyws) to ensure this journey continues indefinitely! :rocket:

Thanks again for your support, it is much appreciated! :pray:

## License

MIT. See `LICENSE` for more details.
