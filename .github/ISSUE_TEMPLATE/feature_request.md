name: ✨ Feature request
description: Suggest a new capability for SmartAge
title: "[Feature] <short summary>"
labels: ["enhancement"]
body:
  - type: dropdown
    id: area
    attributes:
      label: Area
      options:
        - Contracts (Rust / Soroban)
        - Frontend (React / Vite)
        - Backend (indexer / API / scripts)
        - Docs / tooling
    validations:
      required: true
  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: What problem would this solve?
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposed solution
    validations:
      required: false
  - type: textarea
    id: extra
    attributes:
      label: Additional context
    validations:
      required: false
