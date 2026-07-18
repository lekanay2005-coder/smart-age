name: 📦 Pull Request
description: Submit a change to SmartAge
title: "[<area>] <short summary>"
labels: []
body:
  - type: dropdown
    id: area
    attributes:
      label: Area
      options:
        - Contracts
        - Frontend
        - Backend
        - Docs / tooling
    validations:
      required: true
  - type: input
    id: issue
    attributes:
      label: Related issue
      description: e.g. "Closes FE-12" or "Closes C-3"
    validations:
      required: false
  - type: textarea
    id: changes
    attributes:
      label: What changed?
      description: Summary of the change and why.
    validations:
      required: true
  - type: checkboxes
    id: checks
    attributes:
      label: Checklist
      options:
        - label: "Branch is off `main` and scoped to one issue"
        - label: "`cargo test` passes (contracts)"
        - label: "`npm run typecheck && npm run lint && npm run build` passes (frontend)"
        - label: "Added/updated docs or tests where relevant"
        - label: "Did not remove the `ed25519-dalek` patch in contracts/Cargo.toml"
    validations:
      required: false
