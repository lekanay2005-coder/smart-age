name: 🧩 Good first issue
description: Tag a newcomer-friendly task from the issue tracker files
title: "[Good first issue] <short summary>"
labels: ["good first issue"]
body:
  - type: dropdown
    id: issue_ref
    attributes:
      label: Source issue
      description: Which entry in the issue tracker does this map to?
      options:
        - front-end.md (FE-*)
        - back-end.md (BE-*)
        - contracts.md (C-*)
    validations:
      required: true
  - type: textarea
    id: details
    attributes:
      label: Task description
      description: Paste the issue text and note the file to touch + difficulty.
    validations:
      required: true
