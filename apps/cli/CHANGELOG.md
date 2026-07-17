# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- AI-based secret verification: after the regex secret scanner flags a possible
  secret (inline value or a sensitive filename like `.env`), it's now reviewed by
  the configured AI provider (Gemini, falling back to OpenAI) to judge whether
  it's a real credential or example/placeholder/test data. Findings the AI
  identifies as example/placeholder data are dropped, cutting down false
  positives on files like `.env.env` or `.env.example` that only contain sample
  values.
  - Fails safe: if no AI key is configured, or the AI call errors or returns an
    unparsable response, every finding is kept — behavior is unchanged from
    before this release.
