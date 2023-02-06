# Explority Reverse Proxy

## Introduction

- The project creates a reverse proxy, using the CloudFront AWS service.

## Concepts

- Origin
    - The target destination for the user request.
- Behavior
    - The path matching and the corresponding origin to target.
- Cloud Function
    - Custom configuration, using JavaScript to change the request.
    - In this case, to add the `subdomain` query parameter.
