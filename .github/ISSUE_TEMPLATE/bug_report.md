name: 🐛 Bug report
description: Report a problem with SplitLock (contract, frontend, or backend)
title: "[Bug] <short summary>"
labels: ["bug"]
body:
  - type: dropdown
    id: area
    attributes:
      label: Area
      description: Which part of the project is affected?
      options:
        - Contracts (Rust / Soroban)
        - Frontend (React / Vite)
        - Backend (indexer / API / scripts)
        - Docs / tooling
    validations:
      required: true
  - type: textarea
    id: what
    attributes:
      label: What happened?
      description: A clear and concise description of the bug.
    validations:
      required: true
  - type: textarea
    id: repro
    attributes:
      label: Steps to reproduce
      description: How can a maintainer reproduce the issue?
      placeholder: |
        1. Deploy contract with `./scripts/deploy.sh`
        2. Connect Freighter on futurenet
        3. Create payment with ...
    validations:
      required: false
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
    validations:
      required: false
  - type: textarea
    id: env
    attributes:
      label: Environment
      description: Network, OS, Node/Rust versions, wallet version.
    validations:
      required: false
